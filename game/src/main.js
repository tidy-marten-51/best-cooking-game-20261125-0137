// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The kitchen moves between four screens:
// title, play, paused and day over.
//
// ?seed=N fixes the day's orders. ?shot=start|play|serve|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, DEFAULT_SEED, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import {
  EVENT_BURNT,
  EVENT_CHOP_DONE,
  EVENT_DAY_OVER,
  EVENT_EXPIRED,
  EVENT_GRILL_DONE,
  EVENT_PICKUP,
  EVENT_PLACE,
  EVENT_SERVE_BAD,
  EVENT_SERVE_GOOD,
  EVENT_TRASH,
  STATUS_OVER,
} from './world.js';
import {
  ACTION_CONFIRM,
  ACTION_INTERACT,
  ACTION_MUTE,
  ACTION_PAUSE,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
/** How close the chef must get to a clicked point before stopping. */
const CLICK_ARRIVE = 18;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : DEFAULT_SEED;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseFloat(window.localStorage.getItem(BEST_KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(scene.screen, world.state, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, renderer.toField);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startDay() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Take orders, chop, grill and plate, and serve before the ticket runs out.');
  }

  function endDay() {
    screen = SCREEN_OVER;
    audio.win();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Day over. Score ${world.state.score}, ${world.state.served} dishes served.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      audio.ensure();
      audio.click();
      startDay();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function playSounds(events) {
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_PLACE) audio.place();
    if (events & EVENT_CHOP_DONE) audio.chop();
    if (events & EVENT_GRILL_DONE) audio.grillDone();
    if (events & EVENT_BURNT) audio.bad();
    if (events & EVENT_SERVE_GOOD) audio.serve();
    if (events & EVENT_SERVE_BAD) audio.bad();
    if (events & EVENT_EXPIRED) audio.expired();
    if (events & EVENT_TRASH) audio.place();
    if (events & EVENT_DAY_OVER) endDay();
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The kitchen idles behind the title while the first orders land.
      world.step(STEP, { x: 0, y: 0 }, false);
      return;
    }
    const actions = input.takeActions();
    const click = input.takeClick();
    if (click) audio.ensure();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    const player = world.state.player;
    const target = input.clickTarget();
    let move = input.move();
    let interact = Boolean(actions & ACTION_INTERACT);
    if (move.click && target) {
      // Click-to-walk: steer toward the point, and use the station in
      // reach when the chef arrives.
      const dx = target.x - player.x;
      const dy = target.y - player.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= CLICK_ARRIVE) {
        input.clearClickTarget();
        interact = true;
        move = { x: 0, y: 0 };
      } else {
        move = { x: dx / distance, y: dy / distance };
      }
    }
    if (click) audio.click();
    const events = world.step(STEP, move, interact);
    const grillOn = world.state.grill.some((slot) => slot.kind);
    if (grillOn) audio.sizzle(STEP);
    playSounds(events);
    if (world.state.status === STATUS_OVER && screen === SCREEN_PLAY) endDay();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (screen === SCREEN_PAUSED) {
      handleActions();
      accumulator = 0;
    } else if (screen === SCREEN_TITLE) {
      handleActions();
      while (accumulator >= STEP && screen === SCREEN_TITLE) {
        step();
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    }
    renderer.draw(screen, world.state, best);
  }

  // Leaving the tab pauses a running game rather than letting the orders run out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Ember and Sage Kitchen. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
