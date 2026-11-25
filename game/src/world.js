// Ember & Sage Kitchen: the world. One chef, a row of stations, a board
// of orders and a day that ends whether the food is ready or not. Every
// rule lives here; rendering only paints what this file says is true.
import {
  BURN_SECONDS,
  CHOP_SECONDS,
  DAY_SECONDS,
  FIELD,
  GRILL_SECONDS,
  INGREDIENTS,
  INTERACT_RANGE,
  MAX_ORDERS,
  PLAYER,
  RECIPES,
  RECIPE_IDS,
  START_HEARTS,
  STATIONS,
  STATION_LIST,
  orderLifetime,
  spawnInterval,
} from './config.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_PLACE = 2;
export const EVENT_CHOP_DONE = 4;
export const EVENT_GRILL_DONE = 8;
export const EVENT_BURNT = 16;
export const EVENT_SERVE_GOOD = 32;
export const EVENT_SERVE_BAD = 64;
export const EVENT_EXPIRED = 128;
export const EVENT_TRASH = 256;
export const EVENT_DAY_OVER = 512;

export const STATUS_PLAYING = 'playing';
export const STATUS_OVER = 'over';

/** True when the plate's finished components are exactly the recipe's. */
export function plateMatches(recipeId, items) {
  const needs = [...RECIPES[recipeId].needs].sort();
  const has = [...items].sort();
  if (needs.length !== has.length) return false;
  for (let index = 0; index < needs.length; index += 1) {
    if (needs[index] !== has[index]) return false;
  }
  return true;
}

/** The closest point on a station rectangle to the chef, and how far it is. */
function nearestPoint(station, x, y) {
  const cx = Math.max(station.x, Math.min(x, station.x + station.w));
  const cy = Math.max(station.y, Math.min(y, station.y + station.h));
  return { x: cx, y: cy, distance: Math.hypot(x - cx, y - cy) };
}

/** The station the chef can reach right now, or null. */
export function nearestStation(state) {
  let best = null;
  let bestDistance = Infinity;
  for (let index = 0; index < STATION_LIST.length; index += 1) {
    const station = STATION_LIST[index];
    const point = nearestPoint(station, state.player.x, state.player.y);
    if (point.distance < bestDistance) {
      bestDistance = point.distance;
      best = { ...station, point, distance: point.distance };
    }
  }
  return bestDistance <= INTERACT_RANGE ? best : null;
}

function createPlayer() {
  return { x: FIELD.width / 2, y: 520, carrying: null, facing: 1, moving: false, walkPhase: 0 };
}

function spawnOrder(state) {
  const recipe = state.random.pick(RECIPE_IDS);
  const lifetime = orderLifetime(state.elapsed);
  state.orders.push({ id: state.nextOrderId, recipe, timeLeft: lifetime, lifetime });
  state.nextOrderId += 1;
}

export function createWorld(random) {
  const world = {
    random,
    state: null,
    reset() {
      world.state = {
        random: world.random,
        player: createPlayer(),
        chop: { kind: null, progress: 0, done: false },
        grill: [
          { kind: null, seconds: 0, announced: false },
          { kind: null, seconds: 0, announced: false },
        ],
        plateOnCounter: null,
        orders: [],
        nextOrderId: 1,
        elapsed: 0,
        dayLeft: DAY_SECONDS,
        score: 0,
        served: 0,
        combo: 0,
        bestCombo: 0,
        hearts: START_HEARTS,
        tips: 0,
        status: STATUS_PLAYING,
        spawnTimer: 0,
        toasts: [],
        particles: [],
        anim: 0,
      };
      spawnOrder(world.state);
      world.state.spawnTimer = spawnInterval(0);
    },
    step(dt, move, interact) {
      const state = world.state;
      if (state.status !== STATUS_PLAYING) return EVENT_NONE;
      let events = EVENT_NONE;
      state.anim += dt;

      // --- the chef walks, sliding around the counters ---
      const player = state.player;
      const length = Math.hypot(move.x, move.y);
      if (length > 0.01) {
        const dx = (move.x / length) * PLAYER.speed * dt;
        const dy = (move.y / length) * PLAYER.speed * dt;
        player.facing = move.x < -0.1 ? -1 : move.x > 0.1 ? 1 : player.facing;
        player.moving = true;
        player.walkPhase += dt * 11;
        movePlayer(state, dx, 0);
        movePlayer(state, 0, dy);
      } else {
        player.moving = false;
      }

      // --- the chopping board works on its own once food is on it ---
      if (state.chop.kind) {
        state.chop.progress += dt;
        if (state.chop.progress >= CHOP_SECONDS && !state.chop.done) {
          state.chop.done = true;
          events |= EVENT_CHOP_DONE;
          addToast(state, `${INGREDIENTS[state.chop.kind].name} chopped!`, '#5fbf4a');
        }
      }

      // --- the grill cooks, and burns what it is left holding ---
      for (let index = 0; index < state.grill.length; index += 1) {
        const slot = state.grill[index];
        if (!slot.kind) continue;
        const wasCooked = slot.seconds >= GRILL_SECONDS;
        slot.seconds += dt;
        if (!wasCooked && slot.seconds >= GRILL_SECONDS) {
          events |= EVENT_GRILL_DONE;
          addToast(state, 'Patty grilled!', '#f5c542');
        }
        if (slot.seconds >= BURN_SECONDS && !slot.announced) {
          slot.announced = true;
          events |= EVENT_BURNT;
          addToast(state, 'A patty burned!', '#e5484d');
        }
      }

      // --- the orders arrive, and their clocks run out ---
      state.elapsed += dt;
      state.dayLeft -= dt;
      if (state.dayLeft <= 0) {
        state.dayLeft = 0;
        state.status = STATUS_OVER;
        return events | EVENT_DAY_OVER;
      }
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0 && state.orders.length < MAX_ORDERS) {
        spawnOrder(state);
        state.spawnTimer = spawnInterval(state.elapsed);
      }
      for (let index = state.orders.length - 1; index >= 0; index -= 1) {
        const order = state.orders[index];
        order.timeLeft -= dt;
        if (order.timeLeft <= 0) {
          state.orders.splice(index, 1);
          state.hearts -= 1;
          state.combo = 0;
          events |= EVENT_EXPIRED;
          addToast(state, `A ${RECIPES[order.recipe].name} order walked out!`, '#e5484d');
          if (state.hearts <= 0) {
            state.status = STATUS_OVER;
            return events | EVENT_DAY_OVER;
          }
        }
      }

      // --- toasts fade, sparks fly and die ---
      for (let index = state.toasts.length - 1; index >= 0; index -= 1) {
        state.toasts[index].ttl -= dt;
        if (state.toasts[index].ttl <= 0) state.toasts.splice(index, 1);
      }
      for (let index = state.particles.length - 1; index >= 0; index -= 1) {
        const particle = state.particles[index];
        particle.ttl -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 260 * dt;
        if (particle.ttl <= 0) state.particles.splice(index, 1);
      }

      if (interact) events |= interactWith(state);
      return events;
    },
  };
  world.reset();
  return world;
}

/** Move the chef one axis, stopping at the room's edge and the counters. */
function movePlayer(state, dx, dy) {
  const player = state.player;
  const nextX = player.x + dx;
  const nextY = player.y + dy;
  const minX = 8 + PLAYER.radius;
  const maxX = FIELD.width - 8 - PLAYER.radius;
  const minY = 116 + PLAYER.radius;
  const maxY = FIELD.height - 8 - PLAYER.radius;
  const clampedX = Math.max(minX, Math.min(maxX, nextX));
  const clampedY = Math.max(minY, Math.min(maxY, nextY));
  for (let index = 0; index < STATION_LIST.length; index += 1) {
    const station = STATION_LIST[index];
    if (
      clampedX + PLAYER.radius > station.x &&
      clampedX - PLAYER.radius < station.x + station.w &&
      clampedY + PLAYER.radius > station.y &&
      clampedY - PLAYER.radius < station.y + station.h
    ) {
      return;
    }
  }
  player.x = clampedX;
  player.y = clampedY;
}

function addToast(state, text, colour) {
  state.toasts.push({ text, colour, ttl: 2.4 });
  if (state.toasts.length > 4) state.toasts.shift();
}

function burst(state, x, y, colour, count) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const speed = 60 + (index % 3) * 40;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      ttl: 0.7 + (index % 4) * 0.1,
      colour,
      size: 4 + (index % 3) * 2,
    });
  }
}

/** Is this carried item finished and ready to go on a plate? */
function isFinished(item) {
  if (!item || item.kind === 'plate') return false;
  const needs = INGREDIENTS[item.kind].needs;
  if (needs === 'chop') return item.state === 'chopped';
  if (needs === 'grill') return item.state === 'cooked';
  return item.state === 'raw';
}

/** What one press of E (or one click) does at the station in reach. */
function interactWith(state) {
  const station = nearestStation(state);
  if (!station) return EVENT_NONE;
  const player = state.player;
  const carrying = player.carrying;

  if (station.kind === 'crate') {
    if (carrying) return EVENT_NONE;
    player.carrying = { kind: station.item, state: 'raw' };
    return EVENT_PICKUP;
  }
  if (station.kind === 'plates') {
    if (carrying) return EVENT_NONE;
    player.carrying = { kind: 'plate', items: [] };
    return EVENT_PICKUP;
  }
  if (station.kind === 'trash') {
    if (!carrying) return EVENT_NONE;
    player.carrying = null;
    addToast(state, 'Tossed.', '#c9a37e');
    return EVENT_TRASH;
  }
  if (station.kind === 'chop') {
    if (!state.chop.kind && carrying && carrying.kind !== 'plate' && INGREDIENTS[carrying.kind].needs === 'chop' && carrying.state === 'raw') {
      state.chop = { kind: carrying.kind, progress: 0, done: false };
      player.carrying = null;
      return EVENT_PLACE;
    }
    if (state.chop.kind && state.chop.done && !carrying) {
      player.carrying = { kind: state.chop.kind, state: 'chopped' };
      state.chop = { kind: null, progress: 0, done: false };
      return EVENT_PICKUP;
    }
    return EVENT_NONE;
  }
  if (station.kind === 'grill') {
    if (carrying && carrying.kind === 'patty' && carrying.state === 'raw') {
      const slot = state.grill.find((s) => !s.kind);
      if (!slot) return EVENT_NONE;
      slot.kind = 'patty';
      slot.seconds = 0;
      slot.announced = false;
      player.carrying = null;
      return EVENT_PLACE;
    }
    if (!carrying) {
      const slot = state.grill.find((s) => s.kind && s.seconds >= GRILL_SECONDS);
      if (!slot) return EVENT_NONE;
      player.carrying = { kind: 'patty', state: slot.seconds >= BURN_SECONDS ? 'burnt' : 'cooked' };
      slot.kind = null;
      slot.seconds = 0;
      slot.announced = false;
      return EVENT_PICKUP;
    }
    return EVENT_NONE;
  }
  if (station.kind === 'plating') {
    if (carrying && carrying.kind === 'plate' && !state.plateOnCounter) {
      state.plateOnCounter = carrying;
      player.carrying = null;
      return EVENT_PLACE;
    }
    if (carrying && carrying.kind !== 'plate' && state.plateOnCounter && isFinished(carrying)) {
      state.plateOnCounter.items.push(carrying.kind);
      player.carrying = null;
      return EVENT_PLACE;
    }
    if (!carrying && state.plateOnCounter) {
      player.carrying = state.plateOnCounter;
      state.plateOnCounter = null;
      return EVENT_PICKUP;
    }
    return EVENT_NONE;
  }
  if (station.kind === 'serve') {
    if (!carrying || carrying.kind !== 'plate') return EVENT_NONE;
    const orderIndex = state.orders.findIndex((order) => plateMatches(order.recipe, carrying.items));
    if (orderIndex === -1) {
      state.combo = 0;
      addToast(state, 'No order wants that dish!', '#e5484d');
      return EVENT_SERVE_BAD;
    }
    const order = state.orders[orderIndex];
    state.orders.splice(orderIndex, 1);
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const timeBonus = Math.round(50 * Math.max(0, order.timeLeft / order.lifetime));
    const multiplier = 1 + 0.25 * (state.combo - 1);
    const points = Math.round((RECIPES[order.recipe].price + timeBonus) * multiplier);
    state.score += points;
    state.tips += Math.round(timeBonus * multiplier);
    state.served += 1;
    player.carrying = null;
    burst(state, station.x + 20, station.y + station.h / 2, '#f5c542', 14);
    addToast(state, `Served ${RECIPES[order.recipe].name}! +${points}`, '#5fbf4a');
    return EVENT_SERVE_GOOD;
  }
  return EVENT_NONE;
}
