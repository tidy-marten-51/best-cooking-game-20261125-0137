# Ember & Sage Kitchen — Rush Hour Cooking

A timed order-rush cooking game. You are the only chef in a small
neighbourhood kitchen: orders land on the board with a countdown, and you
walk the room to fetch, chop, grill and plate each dish, then serve it at
the window before its ticket runs out. Fast serves build a combo and earn
tips; a walked-out order costs a heart. Three hearts lost, or the 150-second
day ending, closes the kitchen.

## How to play

- **WASD / arrow keys** — walk the chef. Clicking a spot walks there too.
- **E / Space / click on arrival** — use the station in reach: take an
  ingredient, put it on the chopping board or grill, pick up the finished
  food, add it to the plate on the plating counter, serve the plate.
- **P / Esc** — pause. **M** — mute. **Enter** — start a day / play again.

The menu: Garden Salad, Classic Burger, Cheesy Melt and Veggie Stack.
Vegetables must be chopped, patties grilled (don't leave them on — they
burn), buns and cheese go straight on the plate. A plate only serves when
it holds exactly what its ticket asks for.

## How to run

No build step and no network: serve `game/` with any static server and open
`index.html` in desktop Chrome.

```sh
node serve.ts   # then open http://localhost:8080
```

Sounds are synthesized with WebAudio; all art is drawn on canvas.
Screenshots under `screenshots/` are real renders of the game, staged with
`?shot=start|play|serve|end` (see `shots.json`).

## Layout

- `main.ts` — the entry program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json`.
- `game/src/config.js` — the kitchen: recipes, stations, timings, palette.
- `game/src/world.js` — the rules: orders, chopping, grilling, plating, scoring.
- `game/src/render.js` — all canvas drawing: kitchen, food, chef, HUD.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — synthesized WebAudio sounds.
- `game/src/shots.js` — the staged screenshot scenes and their pilot.
- `game/src/main.js` — boot and the fixed-step game loop.
- `vendor/makefun-game.ts` — the make.fun dossier library, unchanged from the kit.

MIT licensed.
