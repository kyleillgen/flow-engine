# Deep Sea: build log

What it took to make this cartridge, so the next one is easier. Kept as I went (times are EDT, 2026-10-28; the early ones were noted by hand and corrected against `date` at the first check).

## Effort

| | |
|---|---|
| Started | 2026-10-28 11:27 EDT |
| Finished | 2026-10-28 12:12 EDT |
| Working time | about 45 minutes (one session, no breaks) |
| Games | 4: Lure (`deep-lantern`), Chain (`deep-siphon`), Lamp (`deep-bathy`), Echo (`deep-glimmer`) |
| `cart.mjs check` | `ok   deepsea: Deep Sea, 4 games, 10 files, 276 KB of 512 KB` |
| `cart.mjs play` | `ok   games/deep-lantern.html: draw 1.33 ms, 54 fps, heap 3 MB (headless)`<br>`ok   games/deep-siphon.html: draw 1.66 ms, 58 fps, heap 3 MB (headless)`<br>`ok   games/deep-bathy.html: draw 1.64 ms, 59 fps, heap 3 MB (headless)`<br>`ok   games/deep-glimmer.html: draw 1.63 ms, 59 fps, heap 3 MB (headless)` |

The draw times are headless, at the pocket's 0.75x, and are a guide rather than a measurement of a real machine. An earlier run gave 1.8 to 2.1 ms, so they vary from run to run.

`npm test`: 29/29 pass. `npm run smoke` (Edge): all 16 games ok, including the four `deep-*`.

## The games

- **Lure** (`games/deep-lantern.html`): Moru, a round old anglerfish, holds out her lantern. Little ones (lanternfish, red shrimp, copepods, sea butterflies) swim in from the black, at first only a pair of eyes, and touch the lantern on the beat. Glow as one arrives and it lights up in its own colour and joins the ring circling the lantern. The twist is that every friend makes the light reach further into the abyss. Hold for a flare; a full charge is an abyss bloom.
- **Chain** (`games/deep-siphon.html`): Lio, a siphonophore, grows down into the dark one bell at a time. A spark runs down the stem to each new bud and reaches it on the beat. Tap and the bud blooms, then a wave of light runs back up the whole colony. The twist is that the view sinks with the tip, so the chain is a record of the run. Hold for a ripple of colour down its length; a full charge coils it into a spiral.
- **Lamp** (`games/deep-bathy.html`): Pebble, a little yellow submersible, hovers over a field of glowing hydrothermal vents with tube worms. Its headlamp sweeps a steady triangle, and each creature (dumbo octopus, gulper eel, sea pig, hatchetfish) sits where the beam will cross it on a beat. Snap for a camera flash and a photo in the log. The twist is that the timing cue is the beam's sweep, not something travelling toward you. Hold for a floodlight; a full charge shows a huge far eye opening.
- **Echo** (`games/deep-glimmer.html`): Sela, a squid covered in skin lights, answers calls. A far squid flashes a colour, and the ripple of it crosses the water to reach her on the beat. Flash back and a wave of that colour runs up her skin while her answer ripples back. The twist is that every six answers another squid joins the pod, so calls come from more directions. Hold to glimmer through every colour; a full charge makes the pod answer in chorus.

None of them reuses Tidelight: no jellyfish, no hoops, no rising swimmer. The palette is darker (near-black water, teal and deep-blue HUD, amber lure light), there is marine snow everywhere, and the vents glow orange.

## Steps

- 11:27 Read the brief, `docs/build-on-the-engine.md`, `carts/cart.mjs`, `carts/space/cart.json`, `games/skip.html`, the neon skin and space shell APIs, and the shared notes folder (graphics-nova-tidelight.md). About 4 min.
- 11:31 `cart.mjs new deepsea "Deep Sea"`, then `npm install --no-save puppeteer-core` in the background (29 s).
- 11:32 Forked the skin to `skins/deepsea/deepsea-skin.js` (DeepSeaSkin) and the shell to `shell/deepsea-shell.js` (DeepSeaShell), mostly with a colour-swap sed over the originals. Added `abyss()` (a baked water column with vent glow), `snow()` (marine snow) and `cone()` (a baked light cone for the headlamp) to the skin. Why fork: see the first item under "Not plug-and-play yet". About 3 min.
- 11:34 Wrote cart.json and named the games `games/deep-*.html`, because `games/` is shared by every cartridge being built in parallel.
- 11:35 Lure: written, screenshotted at 400x760 and 1280x800 with a scratch puppeteer script, then tuned (darker wash, friends behind Moru, phone layout). About 6 min.
- 11:41 Chain: written. The screenshot showed the bells reading as jellyfish, too close to Tidelight, so I hung them off the stem in alternating pairs with the lures trailing from the stem. About 4 min.
- 11:44 Lamp: written; one bug (below); screenshots good. About 3 min.
- 11:46 Echo: written. The far squids came out as big as Sela and everything was too dim, so I scaled the pod down and brightened the skin lights. About 2 min.
- 11:48 First `check`, `play` and `npm test`: all ok. 11:53 `npm run smoke`: all ok.
- 11:54 Tried to confirm that steady taps score, with a scratch script that taps every 500 ms for 35 s and reads the high score. Headless results swung from 0 to 11,900 for the reference game Skip, so this says nothing about hit rate. All four games use Skip's window logic unchanged (clean ±0.3 beat plus assist, perfect ±0.1). About 12 min, most of it waiting.
- 12:06 Polish: Chain's tip sits lower and its sleeping bells are a little more visible. Re-ran check, play, test and smoke: all ok.
- 12:10 Log and commit. A heredoc for this log broke on quoting in Git Bash, so I rewrote the log with the editor (2 min lost).

## Bugs found

| Where | What happened | Fixed how |
|---|---|---|
| this cart (Lamp) | `L.vents is not iterable` on load: `setup()` called `layout()` after `resize()` had already filled `L.vents`, and `layout()` replaces `L`. | Dropped `setup`. The shell calls `resize` at mount, which is enough. |
| this cart (Chain) | The file ended without `</script></body></html>`, a slip while writing it. The browser was forgiving, so nothing failed. | Added the closing tags. |
| shared files | None found. | |

## Not plug-and-play yet

- **The shell is welded to its skin.** `shell/space-shell.js` reads `window.NeonSkin` and repeats the neon colours in its own CSS (marquee rule, flow-check card, pause overlay). Recolouring the HUD meant forking the shell as well as the skin, about 24 KB of copied code for a palette change. A fix: let `mount({ skin })` take the skin object, and have the shell's CSS use CSS variables that the skin sets.
- **`games/` is a flat namespace shared by everyone.** Five cartridges built in parallel all write there, and nothing stops two of them shipping `games/lantern.html`. The smoke test also plays every file in it, so its run time grows with every cartridge. A fix: let a cartridge's games live in `carts/<id>/games/` (the cart tool already resolves script paths relative to the game), or prefix by cart id.
- **There's no way to see that timing works headless.** `play` reports frame cost but not whether on-beat presses register. Hit counts from a fixed-interval tapper vary wildly between runs, even for Skip. A fix: a `?test=1` hook that exposes `eng.beatPos()` and the game's next due beat, so a harness can press exactly on time and count `hit()` calls.
- Smaller: `api.chargeOf` and the charge arc are copied into every game (each game draws its own arc), and the "next waiting / closest in window" hit search is the same in all four. A shell helper (`api.drawCharge(x, y, r)`, `api.nearest(list, now)`) would remove about 30 lines a game.

## Migration to the shared space shell (2026-10-28, 15:11 to 15:27 EDT, about 16 minutes)

Moved off the forked shell onto `shell/space-shell.js` from neon-space (f64dee4).

- `git merge neon-space`: clean, no conflicts.
- All four games now load `shell/space-shell.js` and call `SpaceShell.mount({ skin: DeepSeaSkin, ... })`. The fork's only changes were the skin name and recoloured CSS, so `DeepSeaSkin` now carries a `theme` (bg `#01050c`, teal `c1`, deep-blue `c2`, abyss veil and panel) and the shell takes the colours from there. `shell/deepsea-shell.js` is deleted and `cart.json` lists `shell/space-shell.js` in its place. The skin stays forked, as it should.
- Each game's hand-rolled arrive-on-the-beat loop (`onBeat` pacing, the closest-in-window search in `onFire`, Fidget's "next one at once", `autopilot`, the miss sweep in `update`) is now `api.track({ spawn, note, hit, miss, empty, ... })`. What stayed in each game: what arrives, what a hit and a miss look like, and the tap with nothing in reach. The settings are unchanged: Lure, Lamp and Echo use `ahead: 4`; Chain uses `ahead: 3, gap: RUN`; all use perfect ±0.1. `keep` matches how long each game used to show a finished thing (Lure 3, Lamp 4, Echo 2.5).
- Chain keeps its own `nodes` list next to the tracker's list, because the colony is the whole run (70 bells) and the tracker drops finished things after `keep` beats. `spawn` pushes the new bud onto the chain and also hands it to the tracker.
- Points now pop where the hit happened (each `hit` sets `thing.x, thing.y`), which is new.
- Each game still draws its own charge arc, not `api.drawCharge`: Lure's arc is lure-amber at full charge where the house arc turns yellow, and the others sit on the game's own lamp or squid.
- Lines: 667 removed and 184 added, a net 483 fewer. That is 448 for the forked shell and a net 39 across the four games (217 removed, 178 added). The tracker config is about 25 lines a game, so the loop shrank less than the fork did.

Results after the migration:

| | |
|---|---|
| `cart.mjs check` | `ok   deepsea: Deep Sea, 4 games, 10 files, 284 KB of 512 KB` (276 before; the shared shell is bigger than the old fork) |
| `cart.mjs play` | lantern 0.51 ms, siphon 0.77 ms, bathy 0.54 ms, glimmer 0.62 ms a frame, heap 2 to 3 MB (headless; the new `play` measures differently, so these aren't comparable with the 1.3 to 1.7 ms above) |
| `cart.mjs shots` | 16 shots in `dist/shots/deepsea/`. They match the earlier scratch shots, and the HUD, marquee rule and flow card take the teal and blue theme. |
| On-beat check (new, via `?test=1`) | A scratch harness pressed on each thing's `at` for 25 s, headless. Lure got 20 hits, Chain 22, Lamp 21 and Echo 21, with 0 misses in all four. This is the timing check that wasn't possible before. |
| `npm test` | 30/30 pass |
| `npm run smoke -- deepsea` | all 4 ok (Edge, with `BROWSER` set) |

Not plug-and-play:

- **`shots`' tier-4 view doesn't stay at tier 4.** `?tier=4` sets the tier, then `shots` taps at a fixed interval, misses most beats, and the tier drops back. Three of my four phone-tier4 shots show tier 3 (Lure's has no friends at all), so they don't show the warm tier-4 water. For reviewing art, the preview tier should hold, or `shots` should press on the beat with `?test=1`.
- **`npm run smoke` needs `BROWSER` set** on a machine without a bundled Chrome. The bare `puppeteer-core` launch throws "An executablePath or channel must be specified". A fallback to Edge or Chrome on the usual paths, or a clearer error, would help.
- **Tracker states are fixed names** (`wait`, `hit`, `missed`), so each game's draw code had to rename its own states (`lit`, `snap`, `gone`, `sleep`). It's small, but it's a find-and-replace in every game.

## Second pass (2026-10-28, 17:09 to 17:23 EDT, about 14 minutes)

Moved the workarounds onto what neon-space added in b6519c2. The merge was clean.

- **Charge arcs:** all four were the house arc drawn by hand (same widths, alphas and tier colour), so each is now one `api.drawCharge(x, y, r, undefined, full)` line. The full-charge colour is Lure's lure-amber, Lamp's hull yellow, and amber for Chain and Echo. They look the same as before.
- **Fidget readiness:** Lamp's creatures and Chain's buds are visible as soon as they spawn, but Lure's swimmer stays out of sight for half a beat (it sets off 3.5 beats before arriving, and spawns 4 ahead) and Echo's call for a beat (the far squid flashes 3 beats ahead). So Lure has `ready: now >= at - TRAVEL` and Echo has `ready: now >= at - CALL`. Fidget no longer takes something you can't see yet; a press with nothing ready runs `empty()` as before.
- **`fidget` flag:** Lure ("its arrival is now") and Lamp (the lamp swings round) now use `hit`'s `fidget` flag instead of checking `api.style`. This matches the original exactly: Fidget presses do it, autopilot doesn't.
- **`miss(thing, counted)`:** the miss hints show only when the miss counted, as they did before the first migration.
- **Keys card:** each game sets `words` for its action: Glow / Flare, Bloom / Ripple, Snap / Floodlight, Flash / Glimmer. The default "plays itself" text suits the deep, so it's kept.
- **Kept as it is:** Chain's own `nodes` list. A `keep` function could hold the colony in the tracker's list, but the seed bell (made at layout, before the tracker exists) would have to be pushed into the tracker's list by hand, and `onPhrase` and `spawn` would read the tracker's internals. Two lists are clearer.
- **States:** these stay `hit` and `missed`. Renaming them back is allowed now but would change nothing.
- **Lines:** 77 removed and 25 added in the games, a net 52 fewer (mostly the arcs).

| | |
|---|---|
| `check` | `ok   deepsea: Deep Sea, 4 games, 10 files, 285 KB of 512 KB` |
| `play` | lantern 1.30 ms, siphon 1.61, bathy 1.30, glimmer 1.82 a frame, heap 2 to 3 MB (headless) |
| `shots` | the `-phone-tier4` shots now hold tier 4 under autopilot: amber meter and warm water in all four, Lure with friends round the lantern |
| On-beat harness (`?test=1`, 25 s, headless) | Lure 19 hits, Chain 22, Lamp 22, Echo 22, with 0 misses in all four |
| `npm test` | 30/30 pass |
| `npm run smoke -- deepsea` | all 4 ok (Edge found without `BROWSER`) |

Still not plug-and-play: nothing blocking. One small thing: `drawCharge`'s `color` is the 4th argument, so a game that only wants its own full-charge colour passes `undefined` first. An options object, or `full` first, would read better.

## Third pass (playtest) (2026-10-28, 18:49 to 19:20 EDT, about 30 minutes)

This acts on the user's notes from playing in the real Flow Pocket app, after merging neon-space 1f2e6ba (clean). In that shell a hold only charges in Fidget and misses during a hold don't count. Every game's `onRelease` already returns when `chargeOf` is 0, so Flare, Ripple, Floodlight and Glimmer are Fidget-only with no change.

- **Gold perfect cue, in every game.**
  - Lure: `cueAt` is the lantern, where the little one touches.
  - Chain: `cueAt` is the bud. `draw` keeps each bud's place this frame.
  - Echo: `cueAt` is Sela, where the call's light reaches her.
  - Each game's old hand-drawn closing ring is gone, so there's one cue, not two.
  - Lamp keeps its viewfinder as its own cue (`cue: false`). The viewfinder now turns gold and thicker, with a gold glow, in the perfect window (and not in Fidget).
- **Lure: Moru swims forward.**
  - The world slides left past her at a speed set by width, as a function of the beat position. The layers, from far to near: a far rock ridge (0.12×), wonders (0.35×), a nearer ridge with a lantern-lit rim (0.35×), marine snow on a current (its depth sets its speed), and out-of-focus flecks rushing past in front (2.2×).
  - Her tail is now its own sprite, hinged at the body, and sweeps once a beat. A pectoral fin flutters.
  - The camera stays zoomed in. Her minimum size is lower, so she fits the 300×240 pocket-mini.
- **Chain: changing surroundings.** Every 18 bells the colony sinks into a new place, crossfading over 4 bells:
  - open water, with slanting shafts of the last daylight;
  - the canyon, rock walls on both sides with crinoids waving;
  - a coral garden, with glowing fans;
  - the trench, with chimneys, orange glow and embers.
  - The walls scroll at 0.7× the colony's speed, so they sit a little further off. The life on them breathes on the beat.
  - The place's name fades in as you enter it, and the corner reads "45 bells · coral garden".
- **Lamp: art tweaks.**
  - Black smoke rolls up from each chimney.
  - Seven sea pens along the floor brighten as the beam sweeps over them.
  - Photos are little prints with a pale border and a red pin, set at alternating slants. They're sized by the shorter side and only as many as fit, so the strip doesn't crowd the pocket sizes.
- **Echo: reads clearly.**
  - While a call is on its way, a dotted line of sight joins the caller to Sela. It is lit behind the light and faint ahead of it, so you can see the light coming and where it will land.
  - The caller pings a ring as it flashes, so you can see who called.
  - The gold cue closes on Sela.
- **Background life (new skin part `DeepSeaSkin.wonders`).** Now and then something slow happens far off, a different thing each time, 10 to 26 beats apart, each lasting 6 to 22 beats:
  - a leviathan seen only by the plankton lights along its back;
  - a school of lanternfish twinkling as it turns;
  - an oarfish ribbon with a red crest;
  - an alarm cloud of blue sparks;
  - a pair of big eyes that open, look about, blink and go;
  - a seep of rising bubbles (Lamp).

  Each game picks its own set and a height band away from the action. They are drawn behind everything at low alpha, and they move with the beat position. The skin also gained `noise()` and `ridge()` for the scenery.

Lines: 487 added and 42 removed. Most of it is new scenery, not rework.

| | |
|---|---|
| `check` | `ok   deepsea: Deep Sea, 4 games, 10 files, 307 KB of 512 KB` |
| `play` | lantern 1.55 ms, siphon 1.73, bathy 2.04, glimmer 2.07 a frame, heap 3 to 4 MB (headless, early in a run: a wonder or a deep zone may or may not be on screen) |
| `shots` | 24 shots, including `-pocket` (372×330) and `-pocket-mini` (300×240). All four `-phone-tier4` shots hold tier 4. I looked at every pocket and pocket-mini shot. |
| On-beat harness (`?test=1`, 25 s, headless) | Lure 22 hits, Chain 22, Lamp 21, Echo 22, with 0 misses in all four |
| `npm test` | 30/30 pass |
| `npm run smoke -- deepsea` | all 4 ok |

Not plug-and-play:

- **The shell's cue only follows each tracker's next thing, at a position the game must compute.** Chain's buds have no fixed place (the stem sways), so `draw` writes `n.cx, n.cy` each frame for `cueAt` to read. It works because the shell draws the cue after `draw`. A note in the header that the cue is drawn after `draw` would make that safe to rely on.
- **No helper for timing a pass over a still screen.** The wonders schedule themselves from `onBeat`. That's fine, but every cart will want "something now and then", so a shell- or engine-level ambient scheduler might be worth sharing.
