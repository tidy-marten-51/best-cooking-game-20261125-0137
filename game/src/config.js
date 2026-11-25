// Ember & Sage Kitchen: the numbers behind the rush. One kitchen, one
// fixed-size canvas, one day of orders. Nothing here is read from the
// network and nothing is random at load: the day's orders come from a
// seeded shuffle, so the same seed always serves the same lunch rush.
export const FIELD = { width: 1280, height: 800 };
export const STEP = 1 / 60;
export const DEFAULT_SEED = 1;
export const BEST_KEY = 'ember-sage-kitchen-best';

export const DAY_SECONDS = 150;
export const MAX_ORDERS = 4;
export const START_HEARTS = 3;

// The chef walks the open floor; the counters are the walls of the room.
export const PLAYER = { radius: 24, speed: 265 };
export const INTERACT_RANGE = 78;

// How long each job takes at its station, in seconds.
export const CHOP_SECONDS = 1.4;
export const GRILL_SECONDS = 4.5;
export const BURN_SECONDS = 9.0;

// An order's clock: it starts long and shortens as the day wears on.
export function orderLifetime(elapsed) {
  return Math.max(34, 52 - elapsed * 0.09);
}

// Orders arrive faster as the day wears on.
export function spawnInterval(elapsed) {
  return Math.max(8.5, 15 - elapsed * 0.045);
}

// Ingredients: what it is, where it comes from, what it needs before it
// can go on a plate, and the colour it wears on the counter.
export const INGREDIENTS = {
  tomato: { name: 'Tomato', needs: 'chop', colour: '#e5484d', dark: '#a92c31' },
  lettuce: { name: 'Lettuce', needs: 'chop', colour: '#5fbf4a', dark: '#3c8a2e' },
  onion: { name: 'Onion', needs: 'chop', colour: '#b388eb', dark: '#7d5ba6' },
  cheese: { name: 'Cheese', needs: 'none', colour: '#f5c542', dark: '#c9931a' },
  bun: { name: 'Bun', needs: 'none', colour: '#e8b06a', dark: '#b57e3a' },
  patty: { name: 'Patty', needs: 'grill', colour: '#8a5a3b', dark: '#5d3a24' },
};

// The menu: each dish is a set of finished components, in no fixed order.
export const RECIPES = {
  salad: {
    name: 'Garden Salad',
    price: 100,
    needs: ['lettuce', 'tomato'],
    blurb: 'Crisp, bright, gone in a minute.',
  },
  burger: {
    name: 'Classic Burger',
    price: 160,
    needs: ['bun', 'patty', 'lettuce', 'tomato'],
    blurb: 'The house favourite. Grill the patty well.',
  },
  melt: {
    name: 'Cheesy Melt',
    price: 180,
    needs: ['bun', 'patty', 'cheese', 'onion'],
    blurb: 'Rich, gooey, worth the wait.',
  },
  stack: {
    name: 'Veggie Stack',
    price: 150,
    needs: ['bun', 'lettuce', 'tomato', 'onion', 'cheese'],
    blurb: 'Five layers high, no grill required.',
  },
};

export const RECIPE_IDS = ['salad', 'burger', 'melt', 'stack'];

// Where each thing lives in the kitchen. Stations are rectangles the chef
// walks around; the interaction point is the closest point on the rectangle.
export const STATIONS = {
  tomato: { kind: 'crate', item: 'tomato', x: 24, y: 132, w: 168, h: 96, label: 'TOMATO' },
  lettuce: { kind: 'crate', item: 'lettuce', x: 24, y: 252, w: 168, h: 96, label: 'LETTUCE' },
  onion: { kind: 'crate', item: 'onion', x: 24, y: 372, w: 168, h: 96, label: 'ONION' },
  cheese: { kind: 'crate', item: 'cheese', x: 24, y: 492, w: 168, h: 96, label: 'CHEESE' },
  bun: { kind: 'crate', item: 'bun', x: 24, y: 612, w: 168, h: 96, label: 'BUNS' },
  patty: { kind: 'crate', item: 'patty', x: 480, y: 668, w: 180, h: 96, label: 'PATTY FRIDGE' },
  plates: { kind: 'plates', x: 264, y: 668, w: 180, h: 96, label: 'PLATES' },
  chop: { kind: 'chop', x: 264, y: 168, w: 220, h: 116, label: 'CHOPPING BOARD' },
  grill: { kind: 'grill', x: 560, y: 168, w: 220, h: 116, label: 'GRILL' },
  plating: { kind: 'plating', x: 856, y: 168, w: 240, h: 116, label: 'PLATING' },
  serve: { kind: 'serve', x: 1144, y: 300, w: 112, h: 280, label: 'SERVE' },
  trash: { kind: 'trash', x: 1144, y: 648, w: 112, h: 116, label: 'TRASH' },
};

export const STATION_LIST = Object.entries(STATIONS).map(([id, station]) => ({ id, ...station }));

// The palette: warm wood, cream tile and copper, so the food reads first.
export const COLOURS = {
  floorA: '#c98f5f',
  floorB: '#bd8252',
  wall: '#7c4a2d',
  board: '#5d3a22',
  boardEdge: '#4a2c18',
  ticket: '#fff8e7',
  ticketEdge: '#d9c08a',
  cream: '#fdf6e3',
  ink: '#3a2417',
  red: '#e5484d',
  gold: '#f5c542',
  green: '#5fbf4a',
};
