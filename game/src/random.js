// A small seeded random source (mulberry32) so a day's orders, and every
// staged screenshot, are the same for the same seed. The game never reads
// Math.random during play: a replayed day is a replayed day.
export function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  return {
    next() {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(max) {
      return Math.floor(this.next() * max);
    },
    pick(list) {
      return list[this.int(list.length)];
    },
  };
}
