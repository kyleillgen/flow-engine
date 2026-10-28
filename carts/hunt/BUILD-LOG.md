# Hunt: build log

What it took to make this cartridge, so the next one is easier. Keep it as you go, not at the end.

## Effort

| | |
|---|---|
| Started | 2026-10-28 11:26 (EDT) |
| Finished | 2026-10-28 12:04 (EDT) |
| Working time | About 40 minutes (wall clock, one session, no waiting on anyone) |
| Games | Leap (deer), Flush (meadow birds and clays), Hoot (moonlit owl), Range (lodge gallery booth) |
| `cart.mjs check` | `ok   hunt: Hunt, 4 games, 10 files, 287 KB of 512 KB` |
| `cart.mjs play` | `ok   games/leap.html: draw 1.97 ms, 43 fps, heap 3 MB (headless)`<br>`ok   games/flush.html: draw 1.28 ms, 58 fps, heap 3 MB (headless)`<br>`ok   games/hoot.html: draw 1.28 ms, 59 fps, heap 3 MB (headless)`<br>`ok   games/range.html: draw 1.70 ms, 58 fps, heap 4 MB (headless)` |

Headless numbers are a guide, not a measurement on real hardware. Leap's fps varied from 43 to 51 between runs, with drawing at 1.6 to 2.0 ms each time.

## Steps

One line each, with the time: what you did and how long it took. Times come from the clock and file timestamps.

- 11:26 Read the brief, `docs/build-on-the-engine.md`, `carts/space/cart.json`, `carts/cart.mjs`, `games/skip.html`, the space shell's API and the neon skin's exports, and the sibling note in the shared notes folder. About 3 min.
- 11:29 `node carts/cart.mjs new hunt "Hunt"`: scaffolded `carts/hunt/cart.json` and this log.
- 11:29 Forked `shell/space-shell.js` to `shell/hunt-shell.js` and `skins/neon/neon-skin.js` to `skins/hunt/hunt-skin.js`. Why: the space shell hard-codes `window.NeonSkin`, and its CSS, like the skin's, is neon cyan and magenta on violet. The hunt look is lantern amber and hunter orange on dark wood. The retint was a sed over about 40 colour literals, plus new tier colours (honey, sage, ember, moonlight) and a renamed hi-score key. About 2 min.
- 11:30 Added the woods parts to the hunt skin: `duskSky` (a baked sky with a sun or moon, thin clouds and stars), `pines` (a wrapping band of baked fir silhouettes for parallax), `trunk` (a baked trunk with a rim of sky light) and `reticle` (the sights, baked with their glow and stamped additively). About 2 min.
- 11:32 **Leap**, built on Skip's structure. Then a screenshot pass: pines denser and in two bands, and grass tufts baked into the backdrop. About 3 min.
- 11:36 **Flush**. Then a screenshot pass: removed a light band at the grass line and added a middle grass row. About 6 min.
- 11:40 **Hoot**. A burst of screenshots confirmed the peek, the tag and the flight across the moon. About 3 min.
- 11:45 **Range**. About 4 min.
- 11:47 `check` and `play` both pass. `npm install --no-save puppeteer-core` (Edge). `npm test` passed 29 of 29, and `npm run smoke` was ok for all 16 games.
- 11:52 Fixed a bug found while reading the code (see below): the sights could jump. Applied the same fix to all four games with one script. `check`, `play`, `npm test` and `smoke` all re-run and pass. Took screenshots of all four at 400x760 and 1280x800 and looked at them.
- 12:02 Finished this log and committed.

## Bugs found

| Where | What happened | Fixed how |
|---|---|---|
| this cart (all four games) | The sights glided from the "previous" target, found by searching the live list. Targets are pruned when they leave the screen, so if the previous one was pruned during a glide, the starting point changed and the sights jumped. | Each game keeps `prevSpot`, the point and beat where the sights last settled. It's set when a target is tagged or missed, never by searching the list. |
| this cart (Flush) | The grass bands showed a hard light stripe where a baked grass sprite ended above the darker backdrop. | The backdrop gradient now ends on the grass's dark colour. Back rows no longer paint a base band. |
| shared files | None found. | |

## Not plug-and-play yet

Anything in the engine, a shell, a skin, the cart tool or the docs that made this harder than it should be, and what would fix it. Shared files weren't changed; it's all written here.

- **The space shell is welded to the neon skin.** `space-shell.js` reads `window.NeonSkin` and carries its own neon CSS (marquee rule, pause overlay, flow-check card), so a new look means forking both files (about 65 KB, a quarter of this cart) even though the behaviour is unchanged. Fix: let `mount()` take `skin:` (default `NeonSkin`), and move the shell's colour literals into CSS variables that the skin sets.
- **"The sights glide to the target" is per-game code.** All four games carry near-identical `sights()`, charge-arc, pop and spark code (about 60 lines each). A small shared helper would remove that duplication and the jump bug above in one place: `api.track(things, spotOf)` returning `{ x, y, lock, next }`, with the shell owning the "last settled" state.
- **No score pop on a hit.** `api.hit()` updates the HUD only, so every game draws its own "+100" / "+200" callout at the target. The shell could do this, given an optional `(x, y)` on `hit()`.
- **No way to test a tier's look without playing to it.** Checking the tier 2 to 4 skies meant trusting the data. A `?tier=3` debug parameter in the shell, or `api.eng` exposing a test hook, would let `play` screenshot every tier.
- **The `play` tool's fps is noisy headless** (43 to 51 for the same build). Only the drawing time is checked against the budget, which is right, but the output reads as if fps were a measurement.

## Migration

Moved off the forked shell and onto the shared `shell/space-shell.js` from neon-space (f64dee4), with no shared files changed.

| | |
|---|---|
| Started | 2026-10-28 15:11 (EDT) |
| Finished | 2026-10-28 15:21 (EDT) |
| Working time | About 10 minutes |
| Lines | 718 removed and 192 added: `shell/hunt-shell.js` (446 lines) deleted, and the four games net 83 lines shorter |
| `cart.mjs check` | `ok   hunt: Hunt, 4 games, 10 files, 295 KB of 512 KB` |
| `cart.mjs play` | `ok   games/leap.html: draw 0.85 ms a frame, heap 3 MB (headless; frame rate 49, not judged)`<br>`ok   games/flush.html: draw 0.65 ms a frame, heap 3 MB (headless; frame rate 56, not judged)`<br>`ok   games/hoot.html: draw 0.49 ms a frame, heap 3 MB (headless; frame rate 59, not judged)`<br>`ok   games/range.html: draw 0.54 ms a frame, heap 4 MB (headless; frame rate 59, not judged)` |

- 15:11 `git merge neon-space`, which went through with no conflicts.
- 15:13 One script (kept outside the repo) ported all four games:
  - `SpaceShell.mount({ skin: HuntSkin })`.
  - `onBeat` became `spawn()` for `api.track`.
  - The tracker now does the judging, scoring, misses and autopilot. The game's `onFire` keeps only its own Fidget branch.
  - `tag()` sets `x`/`y` so that `api.hit` pops the points there.
  - The charge arc is `api.drawCharge`.
  - The hunt skin now carries a `theme`, so the HUD, pause card and flow check stay amber on dark wood.
- 15:16 Checks:
  - `check`, `play` and `shots` all pass. The new phone shots looked the same as the old ones, and the `-phone-tier4` shots showed each game's top-tier sky for the first time.
  - `npm test` passed 30 of 30, and `npm run smoke -- hunt` was ok.
  - A headless playtest through `?test=1`: six on-time taps scored 1200 in each game, a pause produced misses, and there were no page errors.

Not plug-and-play:
- **Fidget stays in each game.** The tracker's Fidget tags the next waiting thing at once, even one still four beats away and hidden: an owl behind its trunk, or a deer that hasn't come into view yet. Hunt's twist is that one springs up right in the sights, so `onFire` still handles Fidget itself and pushes the new thing into `track.list`. A `fidget(now)` hook on `track()` would cover this.
- **The tracker's state names had to be overwritten.** The games keep their own `"tag"`/`"gone"` states and their own off-screen pruning. To make that work they pass `keep: Infinity` and reassign `track.list` in `update()`. This works because the tracker only checks `state === "wait"`, but nothing documents it.
- **The points pop needs the thing's `x`, `y`.** Hoot's owls used `y` for their perch height, so that field became `perch`. For Range, the "ahead" distance depends on the screen width, so `update()` sets `track.o.ahead`, which reaches into the tracker's options.
- **Lost from the fork:**
  - The keys card says autopilot "flies itself", where the fork said "plays itself".
  - The hi-score key went from `<game>.hunt.hi` to `<game>.space.hi`, so a player's earlier hunt high score no longer shows.
  - The charge arc now uses the tier's colour, not the orange of the sights.
  - The skin interface has no option for any of these.

## Second pass

This pass moves the migration's workarounds onto the new tracker and shell options from neon-space (b6519c2), with no shared files changed.

| | |
|---|---|
| Started | 2026-10-28 17:09 (EDT) |
| Finished | 2026-10-28 17:22 (EDT) |
| Working time | About 13 minutes |
| Lines | 113 removed and 89 added in the four games (net 24 fewer) |
| `cart.mjs check` | `ok   hunt: Hunt, 4 games, 10 files, 296 KB of 512 KB` |
| `cart.mjs play` | `ok   games/leap.html: draw 1.14 ms a frame, heap 3 MB (headless; frame rate 54, not judged)`<br>`ok   games/flush.html: draw 1.45 ms a frame, heap 3 MB (headless; frame rate 57, not judged)`<br>`ok   games/hoot.html: draw 1.27 ms a frame, heap 3 MB (headless; frame rate 59, not judged)`<br>`ok   games/range.html: draw 1.50 ms a frame, heap 3 MB (headless; frame rate 58, not judged)` |

- **Merge:** `git merge neon-space` had no conflicts.
- **Fidget now goes through the tracker.**
  - `ready: (m, now) => |m.at - now| < 1` (1.2 for Leap) picks a nearby thing, as the game's own branch did.
  - With nothing nearby, `empty()` calls `springUp()`, which still makes one spring up in the sights and tags it unscored.
  - `onFire` is now just `() => track.fire()`.
- **Points pop:** `tag()` returns `{ x, y }`, and `hit()` passes it on for the points pop, so the games no longer write `m.x`/`m.y`.
- **Misses:** `miss(m, counted)` shows the hint only when the miss counted.
- **Pruning:** the games' off-screen pruning moved from `update()` into `keep(m, now)`.
- **Range's distance ahead:** set with `ahead: () => …`, so `update()` no longer writes to `track.o`.
- **Charge arc:** `api.drawCharge(…, SIGHT, GOLD)` puts it back in the sights' orange and gold.
- **Unchanged:**
  - Hoot keeps the `perch` field.
  - The default keys-card wording ("plays itself") now suits the games, so the skin has no `words`.
  - The theme's new type keys default to the fork's Oswald and Inter.
- **Checks:**
  - `check`, `play` and `shots` all pass; the `-phone-tier4` shots now run under autopilot and look right.
  - `npm test` passed 30 of 30, and `npm run smoke -- hunt` was ok.
  - Headless playtest (`?test=1`): on-time taps scored, a pause produced misses, and after switching to Fidget with F, every press tagged something without scoring.

Still not plug-and-play:
- **Fidget's tap note changed slightly.** The tracker plays Fidget presses at `note(thing)`, or 0.5 when nothing is in reach. The games used to choose their own heights (for example 0.3 for an empty press), so a Fidget press now sounds a little different. Because `empty()` can't return a thing, a game can't say what the note should be when it creates one itself.
- **A spring-up thing goes around the tracker.** `springUp()` pushes the new thing into `track.list` and tags it directly, so the tracker never sees it as a hit. An `empty()` that returns a new thing for the tracker to resolve would make this a supported path.
- **`play`'s draw times vary with machine load.** They came out at 1.1 to 1.5 ms this run, against 0.5 to 0.85 ms on the migration run, and the drawing code is the same. All are well inside the 4 ms budget.

## Third pass (playtest)

Playtest feedback: "Hunt is 10/10 … We can't shoot owls though, find another animal." This pass also merges neon-space (1f2e6ba) and adds things happening in the background. No shared files were changed.

| | |
|---|---|
| Started | 2026-10-28 18:49 (EDT) |
| Finished | 2026-10-28 19:12 (EDT) |
| Working time | About 23 minutes |
| Lines | 503 added and 127 removed (mostly the turkey sprite, the background critters and each game's events) |
| `cart.mjs check` | `ok   hunt: Hunt, 4 games, 10 files, 315 KB of 512 KB` |
| `cart.mjs play` | `ok   games/leap.html: draw 1.39 ms a frame, heap 3 MB (headless; frame rate 52, not judged)`<br>`ok   games/flush.html: draw 1.29 ms a frame, heap 3 MB (headless; frame rate 57, not judged)`<br>`ok   games/roost.html: draw 1.42 ms a frame, heap 2 MB (headless; frame rate 59, not judged)`<br>`ok   games/range.html: draw 1.73 ms a frame, heap 4 MB (headless; frame rate 59, not judged)` |

- **Hoot is now Roost** (`games/roost.html`, key `roost`).
  - The animal is an original wild turkey up on its roost in the old oaks, drawn facing us:
    - A bronze body with breast scallops and a little beard.
    - A pale-blue head with a red wattle and snood.
    - Three plumages: bronze, sandy and dusky.
  - The two glinting eyes before it pops out became the red wattle bobbing at the trunk's edge.
  - A tagged turkey blinks happy and fans its tail. Then it flaps off across the moon with barred wings and a "gobble".
  - The trick shot is now a gobble call.
  - The cart.json label, hint and blurb are updated.
  - A first screenshot pass showed the bronze too dark against the trunks, so the plumages are lighter.
- **Things now happen in the background.**
  - Two new skin helpers:
    - `S.ambience(events)` shows one event at a time, every 4 to 9 s, never the same one twice running. Each showing gets a random direction and position.
    - `S.critter(...)` draws flat silhouettes: bird, bat, fox, rabbit, deer, heron, squirrel, cat and moth.
  - What each game has:
    - **Leap:** a fox under the far trees, a few birds, a rabbit, early bats, a shooting star.
    - **Flush:** a heron high up, two deer at the meadow's edge, a fox, swallows skimming the grass, a shooting star.
    - **Roost:** bats across the moon, a cloud drifting over it, a shooting star, a deer in the far woods, a fox and a squirrel on the ground.
    - **Range:** a moth at the bulbs, the lodge cat strolling along the counter, a balloon floating up at the side, and the bulbs giving a little chase on their own.
  - None of it is a target, and nothing crosses where the sights go.
- **Timing cue.** Each game passes `cue: false`, because it already draws its own closing ring at the sights. That ring, and the sights themselves, turn gold on the perfect beat, in the hunt style.
- **Charge shots in Flow.** Every `onRelease` already starts with `if (c <= 0) return`, so with no charge outside Fidget a release in Flow does nothing.
- **Pocket frames.**
  - Range was cramped in the 300x240 frame: the top rail's targets ran into the bell and bulbs.
  - Short frames (under 480 px tall) now get a shallower awning, smaller targets and lower rails. The phone layout is unchanged.
  - The other three games fit as they were.
- **Checks:**
  - `check` and `play` pass.
  - `shots` pass, including `-pocket`, `-pocket-mini` and `-phone-tier4`, all looked at.
  - `npm test` passed 30 of 30, and `npm run smoke -- hunt` was ok.
  - Headless playtest: on-time taps scored 1200 in each game, and Fidget presses tagged without scoring.
  - Each game also ran for 40 s at phone and pocket-mini sizes with no page or console errors.

Not plug-and-play:
- **`shots` can't show the background events.** They're random and a few seconds apart, so a screenshot rarely catches one. To review the critters I drew them all on a scratch page. A `?ambient=<n>` switch, or a skin-level hook the shots tool could call, would make them reviewable.
- **The shell's timing cue doesn't suit games with sights.** It assumes a ring around the thing itself, but in these games the tap matters where the sights settle. Here `cueAt` would have to return the sights' destination, and the ring would then double up with the reticle. `cue: false` plus the game's own ring is right for this cart. A "style" option for the shell's ring (thin, or attached to a given point) would let more games use the shared one.
- **The old `hoot` file and key are gone.** Players lose their old Hoot high score, and the pocket shelf now shows Roost.
