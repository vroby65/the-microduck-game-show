# The Miniduck Game Show

**Eight worlds. No second place.**

A browser action platformer inspired by *The Killing Game Show* on the Amiga.
Guide a tiny duck robot through eight sprawling arenas, shoot hostile drones,
find the keys and escape before the rising acid catches you.

**[Play the game](https://vroby65.github.io/the-miniduck-game-show/)**

## Play locally

Download the repository and open `index.html` in Chrome or Firefox. No build,
server or runtime dependencies are required. All images and music are included,
so the downloaded game works offline.

Press **Enter** or click **Enter the arena** to start. Click **Play the theme**
to enjoy the animated title screen and its original Amiga music before playing.
Audio playback begins after this click or after starting a game.

## Controls

| Action | Keyboard |
| --- | --- |
| Move | Left/right arrows or A/D |
| Jump | Space or up arrow |
| Shoot | X or J; hold for continuous fire |
| Pause / resume | P |
| Retry arena / restart after game over | R |
| Start / retry / next arena | Enter |

Touch devices have on-screen movement, jump and fire buttons.
**Audio ON/OFF** controls both music and sound effects. **Back to title** is
available on pause and end-of-arena screens.

## The show

Explore eight individually designed routes through ramps, towers, valleys,
loops, floating islands and staggered galleries. Each arena is 4220–5000 world
units wide, spanning more than four screens.
Find the three keys on side routes marked by gold platforms, then return to the
main route. Each key opens the matching gate; all three are needed to unlock
the exit. The camera follows both axes, and the map shows your position,
remaining keys and the visible area.

You have three energy points per arena. Acid starts rising after eighteen
seconds. Falling into it costs one energy point and immediately restarts the
same arena with your remaining energy and its entry score. Keys, gates, enemies
and acid reset. Losing the last energy point causes game over. Losing focus
automatically pauses the game.
After a game over, restart from arena one with full energy and a score of zero.
The restart button, Enter and R all start a new campaign. During play or pause,
R retries the current arena with its entry score and remaining energy.
Score comes from keys, destroyed drones and an exit/time bonus.

The arenas have distinct routes and colors, with progressively faster acid.
From arena five onward, drones take two shots to destroy.

1. The Audition — diagonal ramps and sky bridges
2. Steel and Beak — three zigzag towers linked by bridges
3. The Foundry — ridges, valleys and an upper return route
4. Toxic Circuit — an outer loop and an inner switchback
5. Ghost Frequency — narrow floating islands with climbs and descents
6. Cryogenic Chamber — staggered galleries and unequal switchbacks
7. No Commercial Breaks — a long rollercoaster leading to upper terraces
8. The Grand Finale — crossing routes and a final climb

Miniduck has six walking poses and a dedicated six-pose jump animation:
takeoff, ascent, apex, descent, landing and recovery. The title screen features
an animated metallic logo, stars, a moving perspective floor and a walking robot.

The complete eight-arena campaign is included. There are no saved games,
wall climbing or attempt replays in this version.

## Music and artwork credits

- Original game inspiration: *The Killing Game Show*, Amiga, 1990.
- Original Amiga tracks: **Title Screen** (2:25) and **In-Game** (4:22), by **Ray Norrish**.
- OGG recordings: **IgoreshaZhu / Video Game Music Preservation Foundation**.
  [Soundtrack source](https://www.vgmpf.com/Wiki/index.php?title=The_Killing_Game_Show_(AMI)).
- Miniduck artwork: original graphics generated with the built-in ImageGen tool,
  using the [Pollen Robotics Microduck](https://pollen-robotics.com/microduck/) as
  a character reference.

The original tracks are stored locally in `assets/music/`. Music switches
between title and gameplay, loops, continues across arenas and resumes from
the same position after a pause.

Sources and hashes are recorded in `assets/music/provenienza.json`.
Walking artwork provenance is in `assets/provenienza.json`. The jump sheet,
generation prompt and provenance are in `assets/salto.png`,
`assets/salto-prompt.txt` and `assets/salto-provenienza.json`.

## Tests

Distinct route shapes, physics, combat, keys, acid and full traversal of all eight arenas, including
key detours and return routes:

```sh
node --test tests/game.test.cjs
```

Browser, audio and jump tests require Chrome at `/usr/bin/google-chrome`:

```sh
python3 -m venv .venv
.venv/bin/pip install playwright
.venv/bin/python tests/browser.py
.venv/bin/python tests/audio.py
.venv/bin/python tests/jump.py
```

Browser tests cover desktop, portrait and phone layouts, English menus,
controls, scrolling, all arena transitions and the final screen. Audio tests
cover decoding, looping, track switching, pause/resume and muting. Jump tests
check all six poses, return to walking and direction changes.
Generated screenshots in `tests/` are ignored by Git.

## GitHub Pages

GitHub Pages serves the root of the `main` branch. `.nojekyll` keeps the game
as a plain static site; no custom build workflow is needed. Push updates to
`main` to republish the game.
