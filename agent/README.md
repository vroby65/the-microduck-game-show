# Agent guide

An offline HTML/Canvas game without a framework, runtime packages or a build.
Read `README.md` for controls, rules, credits and current limitations.

## Structure and runtime

- `index.html` and `style.css`: English interface, HUD, overlays, animated logo and touch controls.
- `engine.js`: eight level definitions and a DOM-independent engine. Each arena has an authored waypoint path
  and three explicit key detours. Grid columns are 130 units apart and rows
  are 105 units apart; main segments are filled with reachable platforms
  at most two columns and one row apart. Narrow islands use 150-unit shelves. Geometry includes `route`, `branches` and `platforms`.
  Platforms are sorted by height so landing selects the first crossed surface.
  The same API is exported through CommonJS in Node and `window.Microduck` in the browser.
- `game.js`: loads six walking images and `assets/salto.png`, handles input,
  audio and campaign progression, advances physics at 1/120 s and draws with Canvas.
  `cameraX` and `camera` are camera coordinates. The viewport is 900×540;
  `game.width` and `game.height` delimit the world. The map uses both world dimensions.
  `drawTitle` animates the stage before gameplay. `jumpFrame` selects a pose from
  vertical velocity, air time and landing recovery. The jump sheet has six 512×512
  cells in a 3×2 grid. Walking and the title use the original walking images.
- `assets/`: original images and provenance. Do not modify the external source
  projects these images were copied from.
- `assets/music/`: original Amiga title/gameplay OGG recordings with provenance.
  `syncMusic` handles looping, track changes, pause, mute and the initial user
  interaction needed for playback. Do not restart gameplay music between arenas.
- `tests/game.test.cjs`: physics, combat, keys/gates, acid, pause and traversal
  of every arena including side routes and returns. Traversal isolates geometry
  by removing enemies; combat is tested separately. The traversal driver walks
  off overlapping upper shelves before returning to a lower target. A shape
  regression test rejects routes differing only in length or mirroring.
- `tests/browser.py`: Chrome/Playwright checks English menus, controls, horizontal
  scrolling, all arena transitions, ending, retries and three viewport sizes.
- `tests/audio.py`: local audio decoding and the lifecycle of both tracks in Chrome.
- `tests/jump.py`: pose order, return to walking and jump screenshots.

World y increases downward. Platforms can be crossed from below; landing compares
previous feet height with the platform height. States are `playing`, `paused`,
`respawn`, `dead` and `won`; only `playing` advances physics. `player.airTime` and
`player.landTime` are animation timers and must not change trajectories or collisions.
Jumping resets both. Landing triggers 0.18 s of visual recovery; jumping again is
already allowed during recovery. All three side-route keys must be reachable
before their matching gates and are required to exit. Acid starts rising after
18 s. Acid costs one energy point and sets `respawn` while energy remains;
`frame` immediately restarts the same arena with its entry score and remaining
energy. This resets keys, enemies, acid and cameras. At zero energy acid sets
`dead`. Acid is checked before combat to avoid double damage on the same fall.
A new arena restores energy. Game over restarts the campaign at arena one
with zero score, full energy and no keys via the button, Enter or R. During play
or pause, R retries the current arena with its entry score and remaining energy.

## Verification and maintenance

Open `index.html` in Chrome or Firefox for a manual check.
Run `node --test tests/game.test.cjs` after changes to physics or levels, and
`node --check game.js` after browser code changes.
For visual checks, create `.venv`, install `playwright`, then run:

```sh
.venv/bin/python tests/browser.py
.venv/bin/python tests/audio.py
.venv/bin/python tests/jump.py
```

Chrome must be available at `/usr/bin/google-chrome`. Inspect generated screenshots,
including the 390 px layout. Verify touch controls on a device or in a touch-enabled
browser context. Generated `tests/*.png` and local Python environments are ignored by Git.

Level changes must preserve access to all three keys and the exit using real physics.
Campaign changes must preserve all eight transitions, the final screen and retries.
Keep this guide and `README.md` synchronized with structure, controls, invariants,
verification commands and publishing changes.

## Publishing

The public repository is `vroby65/the-microduck-game-show` on GitHub. GitHub Pages
serves the root of `main`; `.nojekyll` selects plain static hosting. No custom
build workflow or runtime dependencies are needed. After an authorized publish,
verify the Pages build and the deployed game, including image and music requests.
