// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays
// the real rules forward from a fresh seeded world, steered by a small
// pilot that walks the kitchen the way a player does — crate to board to
// grill to plating counter to the serving window — so every frame is what
// a real game looks like, and the same seed always gives the same frame.
import { GRILL_SECONDS, INGREDIENTS, RECIPES, STEP } from './config.js';
import { STATUS_OVER, STATUS_PLAYING } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const END_LIMIT_SECONDS = 400;

/**
 * Where the chef stands to use each station: just outside the counter on
 * the open-floor side. The left crates sit at x = 216, the closest the
 * chef can stand to them without the chopping board (which starts at
 * x = 264) becoming the nearer station when E is pressed.
 */
const APPROACH = {
  tomato: { x: 216, y: 180 },
  lettuce: { x: 216, y: 300 },
  onion: { x: 216, y: 420 },
  cheese: { x: 216, y: 540 },
  bun: { x: 216, y: 660 },
  patty: { x: 570, y: 618 },
  plates: { x: 354, y: 618 },
  chop: { x: 374, y: 334 },
  grill: { x: 670, y: 334 },
  plating: { x: 976, y: 334 },
  serve: { x: 1094, y: 440 },
  trash: { x: 1094, y: 706 },
};

const LANE_Y = 480;

/** Walk one axis toward a point, one fixed step at a time. */
function walkAxis(world, axis, target, maxSteps) {
  for (let index = 0; index < maxSteps; index += 1) {
    const player = world.state.player;
    const value = axis === 'x' ? player.x : player.y;
    const distance = target - value;
    if (Math.abs(distance) <= 4) return true;
    const move = axis === 'x' ? { x: Math.sign(distance), y: 0 } : { x: 0, y: Math.sign(distance) };
    world.step(STEP, move, false);
    if (world.state.status !== STATUS_PLAYING) return false;
  }
  return false;
}

/**
 * Walk to a point. First steer straight at it — the chef slides along
 * counters, so a direct line usually works — and if the way is blocked
 * (no progress for a while), fall back to the middle lane: out to
 * y = 480, across to the target's x, then in to the target's y. Every
 * lane leg is axis-aligned, so the pilot slides along counters instead of
 * wedging into their corners.
 */
function goTo(world, target) {
  const directLimit = 700;
  let bestDistance = Infinity;
  let stale = 0;
  for (let index = 0; index < directLimit; index += 1) {
    const player = world.state.player;
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 5) return true;
    if (distance < bestDistance - 0.5) {
      bestDistance = distance;
      stale = 0;
    } else {
      stale += 1;
      if (stale > 40) break;
    }
    world.step(STEP, { x: dx / distance, y: dy / distance }, false);
    if (world.state.status !== STATUS_PLAYING) return false;
  }
  if (!walkAxis(world, 'y', LANE_Y, 900)) return false;
  if (!walkAxis(world, 'x', target.x, 1200)) return false;
  if (!walkAxis(world, 'y', target.y, 900)) return false;
  return true;
}

/** One press of E at the station in reach. */
function use(world) {
  world.step(STEP, { x: 0, y: 0 }, true);
  return world.state.status === STATUS_PLAYING;
}

/** Step in place until `ready` is true, or the wait runs out. */
function waitFor(world, ready, maxSeconds) {
  const limit = Math.floor(maxSeconds / STEP);
  for (let index = 0; index < limit; index += 1) {
    if (ready(world.state)) return true;
    world.step(STEP, { x: 0, y: 0 }, false);
    if (world.state.status !== STATUS_PLAYING) return false;
  }
  return ready(world.state);
}

/** Fetch one finished component and add it to the plate on the counter. */
function addComponent(world, kind) {
  const needs = INGREDIENTS[kind].needs;
  if (needs === 'grill') {
    if (!goTo(world, APPROACH.patty) || !use(world)) return false;
    if (!goTo(world, APPROACH.grill) || !use(world)) return false;
    if (!waitFor(world, (state) => state.grill.some((slot) => slot.kind && slot.seconds >= GRILL_SECONDS), 8)) return false;
    if (!goTo(world, APPROACH.grill) || !use(world)) return false;
  } else if (needs === 'chop') {
    if (!goTo(world, APPROACH[kind]) || !use(world)) return false;
    if (!goTo(world, APPROACH.chop) || !use(world)) return false;
    if (!waitFor(world, (state) => state.chop.done, 5)) return false;
    if (!goTo(world, APPROACH.chop) || !use(world)) return false;
  } else if (!goTo(world, APPROACH[kind]) || !use(world)) {
    return false;
  }
  if (!goTo(world, APPROACH.plating) || !use(world)) return false;
  return true;
}

/** Fetch one finished component and hold it, without plating it. */
function fetchComponent(world, kind) {
  const needs = INGREDIENTS[kind].needs;
  if (needs === 'grill') {
    if (!goTo(world, APPROACH.patty) || !use(world)) return false;
    if (!goTo(world, APPROACH.grill) || !use(world)) return false;
    if (!waitFor(world, (state) => state.grill.some((slot) => slot.kind && slot.seconds >= GRILL_SECONDS), 8)) return false;
    if (!goTo(world, APPROACH.grill) || !use(world)) return false;
  } else if (needs === 'chop') {
    if (!goTo(world, APPROACH[kind]) || !use(world)) return false;
    if (!goTo(world, APPROACH.chop) || !use(world)) return false;
    if (!waitFor(world, (state) => state.chop.done, 5)) return false;
    if (!goTo(world, APPROACH.chop) || !use(world)) return false;
  } else if (!goTo(world, APPROACH[kind]) || !use(world)) {
    return false;
  }
  return true;
}

/**
 * Cook one order from the board: take a plate, put it on the plating
 * counter, build the dish on it, carry it to the window and serve it.
 * `stopAfter` caps how many components are plated, for the mid-assembly
 * shot; `holdNext` then fetches the next component and holds it.
 */
function cookOrder(world, order, stopAfter, holdNext) {
  const state = world.state;
  // A plate left over from a dish whose order walked out is dead weight:
  // toss it before starting the next dish.
  if (state.player.carrying && state.player.carrying.kind === 'plate' && state.player.carrying.items.length > 0) {
    if (!goTo(world, APPROACH.trash) || !use(world)) return false;
  }
  const needs = RECIPES[order.recipe].needs;
  if (!goTo(world, APPROACH.plates) || !use(world)) return false;
  if (!goTo(world, APPROACH.plating) || !use(world)) return false;
  const plated = stopAfter === undefined ? needs.length : stopAfter;
  for (let index = 0; index < plated; index += 1) {
    if (!addComponent(world, needs[index])) return false;
  }
  if (holdNext && plated < needs.length) {
    if (!fetchComponent(world, needs[plated])) return false;
    goTo(world, { x: 976, y: 420 });
    return true;
  }
  if (!goTo(world, APPROACH.plating) || !use(world)) return false;
  // If the order walked out while the dish was cooking, the plate is
  // worthless: toss it instead of serving a dish nobody wants.
  const stillWanted = world.state.orders.some((open) => open.id === order.id);
  if (!stillWanted) {
    if (!goTo(world, APPROACH.trash) || !use(world)) return false;
    return true;
  }
  if (!goTo(world, APPROACH.serve) || !use(world)) return false;
  return true;
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other
 * name is start) and return the screen to draw over it and the best
 * score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    // Title: the kitchen idles behind the menu for a few seconds while
    // the first orders land on the board.
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { x: 0, y: 0 }, false);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Mid-assembly: half the first dish is plated, and the chef is
    // carrying the next finished component to the plating counter.
    const order = world.state.orders[0];
    const needs = RECIPES[order.recipe].needs;
    const half = Math.max(1, Math.floor(needs.length / 2));
    cookOrder(world, order, half, true);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'serve') {
    // Ready to serve: the dish is finished and the chef is holding the
    // full plate at the serving window, its ticket still on the board.
    const order = world.state.orders[0];
    const needs = RECIPES[order.recipe].needs;
    if (!goTo(world, APPROACH.plates) || !use(world)) return { screen: SCREEN_PLAY, best: 0 };
    if (!goTo(world, APPROACH.plating) || !use(world)) return { screen: SCREEN_PLAY, best: 0 };
    for (let index = 0; index < needs.length; index += 1) {
      if (!addComponent(world, needs[index])) return { screen: SCREEN_PLAY, best: 0 };
    }
    if (!goTo(world, APPROACH.plating) || !use(world)) return { screen: SCREEN_PLAY, best: 0 };
    goTo(world, APPROACH.serve);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // end: the pilot cooks order after order until the day runs out, then
  // the results screen shows what the rush was worth. It takes the order
  // with the most slack — its clock minus the rough time to cook it — and
  // waits for a fresh one when every ticket is too close to walking out
  // to be worth cooking.
  const limit = Math.floor(END_LIMIT_SECONDS / STEP);
  for (let index = 0; index < limit; index += 1) {
    const state = world.state;
    if (state.status !== STATUS_PLAYING) break;
    let order = null;
    let bestSlack = -Infinity;
    for (let candidateIndex = 0; candidateIndex < state.orders.length; candidateIndex += 1) {
      const candidate = state.orders[candidateIndex];
      const needs = RECIPES[candidate.recipe].needs;
      const cookTime = needs.length * 7 + (needs.includes('patty') ? 6 : 0);
      const slack = candidate.timeLeft - cookTime;
      if (slack > bestSlack) {
        bestSlack = slack;
        order = candidate;
      }
    }
    if (!order || bestSlack < 0) {
      world.step(STEP, { x: 0, y: 0 }, false);
      continue;
    }
    if (!cookOrder(world, order)) break;
  }
  for (let index = 0; index < Math.floor(60 / STEP); index += 1) {
    if (world.state.status === STATUS_OVER) break;
    world.step(STEP, { x: 0, y: 0 }, false);
  }
  const state = world.state;
  return { screen: state.status === STATUS_OVER ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
}
