# Cozy: build log

What it took to make this cartridge, so the next one is easier. Keep it as you go, not at the end.

## Art direction

**The world.** A moonlit garden at the bottom of the night: a tea table under paper lanterns, a pond with a willow, a cloud bakery on a hill, lanterns drifting up into a pink-violet sky. Same family as Space (glow baked into sprites, light stamped additively), but warmer and softer: dusk plum instead of deep blue, warm cream light instead of cyan, round soft shapes instead of tubes, a serif italic for titles instead of a neon sign. Everything breathes on the beat. No hearts, no emoji.

**Palette.**

| | |
|---|---|
| Night | plum `#1c1030`, dusk `#2e1b48`, mauve low sky `#5a3360` |
| Light | cream `#fff2e2`, lantern honey `#ffd58a`, peach `#ffbf9e` |
| Petals | rose `#ff9fc0`, blush `#ffc7d9`, lavender `#c8b4ff` |
| Water and leaf | mint `#9cf0d0`, sea-glass `#8fd8e8`, sage `#a8d8a0` |
| Ink (faces) | `#3a1f3f` |
| Tiers | blush `#ffb3cf`, mint `#9cf0d0`, lavender `#c8b4ff`, honey `#ffd58a` |

Type: Georgia italic for titles and callouts (a system font, so no bytes), Inter for small labels (shipped already).

**Characters** (all original):
- **Oolong**, a round sleepy teapot with a little leaf sprouting from the lid. Pours with a tilt and a sigh of steam.
- **Lumi**, a pale-pink glowing axolotl with six frilly gill fronds that light up in turn on the beat. Lives in the pond.
- **Mallow**, a cloud-sheep baker: a puff of a body, tiny nub horns, a piping bag.
- **Tibbet**, a fluffy moon moth with big soft feathery antennae and wings that glow lavender at the edges.
- **Wisp** (Tidelight, unchanged), the jellyfish she already loves.

**The games, and one signature moment each.**

| Game | What arrives on the beat | Tap when | Signature moment |
|---|---|---|---|
| **Steep** (tea garden) | Teacups slide along the table under Oolong's spout | the cup is under the spout | the tea leaves unfurl into a glowing blooming-tea flower, and the steam curls up into a spiral of light |
| **Ripple** (moonlit pond) | Dewdrops fall from the willow | a drop meets the water | its ripple rings light up and lock into a slowly turning mandala on the pond, and a glow-koi rises to circle Lumi |
| **Frost** (cloud bakery) | Marks come round a slowly spinning moon cake | a mark reaches Mallow's piping nozzle | a ring of eight rosettes lights the candles, and the whole cake lifts into the sky as a new moon |
| **Lull** (lantern sky) | Paper lanterns rise from the hill | a lantern reaches Tibbet | the lantern lights and joins a drifting river of lanterns; a phrase draws an aurora ribbon across the sky |
| **Tide** (Tidelight, as it is) | Hoops of light | the inner ring is gold | her favourite, kept exactly as it is |

## Effort

| | |
|---|---|
| Started | 2026-10-28 11:25 |
| Finished | 2026-10-28 12:24 |
| Working time | about 1 hour (one sitting, no breaks) |
| Games | Steep, Ripple, Frost, Lull (new, on the cozy shell and skin), and Tide (`games/tidelight.html`, unchanged) |
| `cart.mjs check` | `ok   cozy: Cozy, 5 games, 13 files, 409 KB of 512 KB` |
| `cart.mjs play` | `ok   games/cozy-steep.html: draw 0.92 ms, 55 fps, heap 3 MB (headless)`<br>`ok   games/cozy-ripple.html: draw 0.76 ms, 58 fps, heap 3 MB (headless)`<br>`ok   games/cozy-frost.html: draw 0.75 ms, 59 fps, heap 2 MB (headless)`<br>`ok   games/cozy-lull.html: draw 0.80 ms, 60 fps, heap 3 MB (headless)`<br>`ok   games/tidelight.html: draw 1.17 ms, 59 fps, heap 4 MB (headless)` |

Headless drawing times are a guide only. They moved a lot between runs on this machine (Steep read 1.76, 2.29 and 0.92 ms in three runs, the higher ones while other headless browsers were running), so treat them as "comfortably inside 4 ms", not as measurements.

## Steps

- 11:25 Read the brief, `docs/build-on-the-engine.md`, `games/skip.html`, the neon skin, the space shell, the cart tool and the sibling notes (10 min).
- 11:29 `cart.mjs new cozy "Cozy"`, wrote the art direction above.
- 11:31 Forked `shell/space-shell.js` to `shell/cozy-shell.js` (the skin it reads, its own CSS, words) and `skins/neon/neon-skin.js` to `skins/cozy/cozy-skin.js` (palette, serif HUD and callouts, round meter lights, fairy-light rail, a shared `face()` and `petal()`, dropped the neon `playfield` and `grid`) (8 min).
- 11:39 Steep: first build, screenshots, then a rework: the garden silhouette baked into the sky instead of `S.hills` (which read as two wiggly lines), a scalloped tablecloth and a lawn of glowing flowers to fill the dead space under the table, bigger sizes (desktop was tiny), the bloom redrawn as a side-on lotus (it read as a white blob), the steam as a lit ribbon (the glow beads were invisible) (15 min). `play`: 1.76 ms headless.
- 11:46 Ripple: first build; then autopilot also adds mandala rings (it showed nothing in attract mode), a softer moon path (it looked like a ladder), stars in the water, two koi from the start (10 min).
- 11:52 Frost: first build; then reworked: the nozzle moved to the back of the cake so Mallow pipes from behind it (the bag crossed the whole cake), a darker frosting so the marks read, beads with a dark rim, the cloud bank without outlines (it showed "scales"), both crescents fixed (12 min).
- 12:00 Lull: first build; the aurora redrawn as hanging curtains (it read as grey pipes), lit lanterns drift slower so a river builds, lanterns meet her antennae tips instead of covering her body (9 min).
- 12:07 Full cart with Tidelight as it is: `check` 404 KB, `play` all ok. Checkpoint commit.
- 12:08 Art pass 1. Screenshots of every game at 400x760 and 1280x800, a Fidget mash per game, and each game at tiers 2 to 4 (the tier screenshots score through the engine from the test script, since a short Fidget mash doesn't climb a tier). Fixed: Ripple's koi bigger and brighter with a swishing tail, plus lotus candles drifting across the empty lower pond; Frost's cake centred on desktop (it was offset for an old layout), a mobile of sugar stars over the bakery so it reads as a place, a striped bag, "A new moon" only in Flow (in Fidget it popped every eight presses); Lull's cue ring softened, a warm mist on the village, the near hill and village moved to a front layer so lanterns rise from behind the rooftops (they were drawn over the hill), a winding path of lights down the hill. Also two logic slips: Steep's Fidget could pour into a cup still off-screen, and Frost's popped rosettes drew as a missed mark (10 min).
- 12:18 Checkpoint commit. Art pass 2: the attract marquee, pause card and keys card. The marquee title sat on top of Oolong, Mallow and Tibbet, so it moved from 33% to 18% of the height in the cozy shell; Frost's marks and Ripple's drops made a little bigger (4 min).
- 12:20 `check`, `play`, `npm test` (29/29) and `npm run smoke` (16/16, Edge) all pass.
- 12:22 Build log, final commit.

## Bugs found

| Where | What happened | Fixed how |
|---|---|---|
| this cart (Frost) | Both crescents (sky moon, sugar moon) drew as rings: `arc` + reversed `arc` + `fill("evenodd")` with no `moveTo` between them joins the two circles and fills the outside sliver | A `crescent()` helper that cuts the bite on its own little canvas with `destination-out` |
| this cart (Steep) | Fireflies over the lawn appeared at the top of the screen: `S.motes` always spans 0..H | `ctx.translate` to the lawn before calling it |
| this cart (Ripple) | In attract mode and autopilot the mandala (the game's signature) never appeared, because only scored hits added rings | Every landed drop adds a ring; eight make a koi |

## Not plug-and-play yet

- **A shell is welded to its skin.** `space-shell.js` reads `window.NeonSkin` by name, so a new look means forking the whole 24 KB shell to change one line plus its CSS. A `mount({ skin })` option (or `window.FlowSkin`) would let a cart ship only a skin.
- **Keeping one game as it is costs about 80 KB.** Tidelight loads `neon-skin.js`, `space-shell.js` and Oswald, so the cart carries two shells and two skins, and Tide's HUD looks neon among four cozy games. Fine within the budget (404 KB), but it can't match the cart's look without a fork.
- **The skin's helpers assume a full screen.** `motes()` always spans 0..H (no y offset), and `streak()` caps a trail at six radii long, so it can't draw a long ribbon such as steam. Small options (`y0`, `maxLen`) would cover both.
- **The assigned port was taken.** Something was already listening on 4182 (a python directory listing of another folder), so the screenshot script uses an ephemeral port, as `cart.mjs play` does.
- **`cart.mjs new` scaffolds the neon files** into `files`, so a cart with its own skin has to rewrite the list by hand. Minor.
- **No way to look at the higher tiers on purpose.** Each game has four moods, one per tier, but reaching tier 4 takes a long run of real hits, and autopilot never scores. Reviewing them meant wrapping `FlowEngine.create` from the screenshot script to reach the engine and call `score`. A documented test switch (say `?tier=3`, like the existing `?phase=frozen`) would make art review plug-and-play.

## Shared files

Nothing shared was edited. The cozy shell and skin were forks (`shell/cozy-shell.js`, `skins/cozy/cozy-skin.js`), for the reason in the first point above. The shell fork is gone since the migration below. No bugs found in the engine, the shells, the skins or the cart tool.

## Migration to the shared space shell

On 2026-10-28, 15:11 to 15:25 (about 15 minutes), I merged `neon-space` (f64dee4, which added `mount({ skin, theme })`, `api.track`, `?tier=` and `?test=1`). The merge was clean. Then I moved the cart off its forked shell.

| | |
|---|---|
| Removed | `shell/cozy-shell.js` (442 lines, 24 KB) and its line in `cart.json` |
| Games | all four now load `shell/space-shell.js` with `mount({ skin: CozySkin })` |
| Lines | 131 added, 565 removed (net −434). Steep and Ripple account for 115 out and 88 in |
| Skin | +35 lines: a `theme` (the shell's colours), CSS that restyles the shell's marquee, hint and flow check, and `words()` |
| `check` | `ok   cozy: Cozy, 5 games, 12 files, 394 KB of 512 KB` (was 409 KB) |
| `play` | `ok   games/cozy-steep.html: draw 1.44 ms a frame, heap 3 MB (headless; frame rate 48, not judged)`<br>`ok   games/cozy-ripple.html: draw 1.11 ms a frame, heap 3 MB (headless; frame rate 58, not judged)`<br>`ok   games/cozy-frost.html: draw 0.67 ms a frame, heap 2 MB (headless; frame rate 58, not judged)`<br>`ok   games/cozy-lull.html: draw 0.98 ms a frame, heap 3 MB (headless; frame rate 55, not judged)`<br>`ok   games/tidelight.html: draw 1.93 ms a frame, heap 3 MB (headless; frame rate 55, not judged)` |
| Tests | `npm test` 30/30, `npm run smoke -- cozy` 5/5 (Edge, `BROWSER=` set) |

What changed in the games:

- **Steep and Ripple are on `api.track`.** Their spawn, judge, miss and autopilot code went into `spawn`/`hit`/`miss`/`empty` callbacks. Two things needed care:
  - Steep's Fidget must not pour into a cup that hasn't reached the table yet. The tracker's `next()` is simply the next cup, so `onFire` checks first and only sighs steam until the cup is on screen.
  - Ripple's miss dims a mandala ring only when the miss counts. The tracker's `miss` callback doesn't get `api.miss()`'s result, so the game checks `started` and Fidget itself.
- **One visible change:** the shell now pops points where a cup or drop was tapped. Steep sets the cup's `x, y` in `hit` so the pop lands there. Frost and Lull have no pops.
- **Frost and Lull keep their own loops.** In both, Fidget plays differently from the tracker's:
  - Frost pipes a rosette at the nozzle and melts the soonest mark. Its rosettes also have to stay on the cake until it lifts, and the tracker drops a finished thing after `keep` beats.
  - Lull lights the nearest lantern on screen, missed ones included. Its lit lanterns stay in the river until they float off the top, and Tibbet's flight path reads the same list.
  - Fitting either to the tracker would have changed how it plays.

Not plug-and-play:

- **The shell's own markup still has neon words and layout.**
  - The theme recolours it, but the marquee position, its strike animation, Oswald in the flow check, and the keys card ("Fire", "Charge shot", "it flies itself") are fixed.
  - The cozy skin restyles them with CSS one step more specific than the shell's, since the skin's sheet loads first. `CozySkin.words()`, called from each game's `setup`, rewrites the three phrases.
  - A `words` option and a marquee `top` (or one CSS variable) in the shell would make both unnecessary.
- **The high score key moved.** The shell saves under `<key>.space.hi`; the fork used `<key>.cozy.hi`. The cart isn't released, so nothing real is lost, but a cart with players would reset their best.
- **The tracker can't keep a thing until it's off screen.** `keep` is a fixed number of beats, and there's no "keep while" callback. That's why Lull, whose lanterns become a river, and Frost, whose rosettes stay until the cake lifts, can't use it.
- **`cart.mjs shots`' "phone-tier4" shows tier 3.**
  - `tapFor` presses Space every 480 ms, off the beat, so things go by untapped. Each miss cuts the streak by a quarter (40 → 30), which is tier 3.
  - Every game's tier-4 shot is affected, Tidelight's included. I reviewed true tier 4 with `?tier=4` plus autopilot instead.
  - `shots` could press Enter (autopilot) after the first tap instead of mashing.
- **`npm run smoke` needs `BROWSER=`** pointing at Edge on this machine. puppeteer-core has no default browser.

## Second pass: onto the shell's new options

On 2026-10-28, 17:09 to 17:25 (about 15 minutes), I merged `neon-space` (b6519c2). The merge was clean. Then I swapped each workaround for the option the shell now has.

| | |
|---|---|
| Lines | 108 added, 143 removed (net −35): skin −7, Steep −7, Ripple −1, Frost −11, Lull −9 |
| `check` | `ok   cozy: Cozy, 5 games, 12 files, 395 KB of 512 KB` |
| `play` | `ok   games/cozy-steep.html: draw 1.79 ms a frame, heap 3 MB (headless; frame rate 52, not judged)`<br>`ok   games/cozy-ripple.html: draw 1.70 ms a frame, heap 4 MB (headless; frame rate 56, not judged)`<br>`ok   games/cozy-frost.html: draw 1.51 ms a frame, heap 3 MB (headless; frame rate 58, not judged)`<br>`ok   games/cozy-lull.html: draw 1.35 ms a frame, heap 2 MB (headless; frame rate 59, not judged)`<br>`ok   games/tidelight.html: draw 2.16 ms a frame, heap 3 MB (headless; frame rate 57, not judged)` |
| Tests | `npm test` 30/30, `npm run smoke -- cozy` 5/5 (Edge found by itself) |

The headless draw times are higher than in the first pass, Tidelight's included, though its code didn't change. A first run read 2–3 ms across the board while about 50 other browser processes were running on the machine. Treat them as "inside 4 ms", as before.

What moved:

- **Skin:**
  - `CozySkin.words()`, which rewrote the keys card's DOM, is now `words: { fire, charge }`. The shell's default `auto` text already says "plays itself".
  - The serif headings, the marquee's 18% top, its fade-up entrance, and the flow check's fonts, case and glow are now theme keys: `head`, `body`, `headCase`, `headGlow`, `marqueeTop`, `strike: "cz-rise"`.
- **Steep:** the "is the cup on the table yet" check moved from `onFire` to `ready()`. The points pop is now `hit`'s return value.
- **Ripple:** the miss's "did it count" guess is now `miss`'s `counted`.
- **Frost:** now on `api.track`.
  - `keep` holds a rosette until the cake lifts, and a missed or popped one for 1.5 beats.
  - `miss` renames the state to "fade".
  - Its own spawn, judge, miss and autopilot code is gone.
  - Fidget stays in `onFire` with `ready: false`, because it pipes at the nozzle whatever is there and melts the soonest mark. `ready()` can only pick which mark is hit, not put a rosette somewhere else.
- **Lull:** now on `api.track`.
  - `keep` holds a lantern while it's in the sky, and the last one passed while Tibbet waits by it. Her flight path reads that one, which the old front-of-list trimming did.
  - `hit` returns `{}`, so there's still no points pop.
  - Fidget stays in `onFire` with `ready: false`, because it lights the nearest unlit lantern in view, missed (pale) ones included. The tracker only offers things still waiting.

I reviewed it with true tier-4 shots (`-phone-tier4` now really is tier 4), the attract, keys and pause cards against the earlier ones (identical), and an on-beat Flow run plus a Fidget mash in each game through `?test=1`. All four score on the beat now, Frost and Lull included.

Still not plug-and-play:

- **The theme can't set the title's size, letter-spacing or entrance timing.** `strike` names the animation, but the shell fixes it at 1.4 s linear, and the cozy fade-up is 1.6 s eased. The rule under the title (a string of lights here), the marquee's exit, and the flow check's radius, shadow and selected-button colours aren't theme keys either. About 15 lines of CSS remain for these.
- **Fidget that isn't "hit the next thing".** Frost (a rosette at the nozzle) and Lull (the nearest unlit lantern, missed ones included) keep their own Fidget, about 15 lines each. A `fidget(now)` callback that returns the thing to take, from any state, would cover Lull. Frost would also need to make a new thing.
- **Small sound differences from the tracker's fixed note heights.** An empty Flow tap now plays at 0.85 instead of 0.8. A Fidget press in Steep before a cup reaches the table plays 0.5 instead of the cup's note. You can't hear the difference in play, but the music isn't bit-identical to the old version.

## Third pass (playtest)

Merged neon-space (1f2e6ba): in Flow a hold no longer charges and nothing passed while it's held
counts as a miss; every tracker gets a gold perfect cue; `shots` adds the pocket's frames.

- **Holds in Flow.** Every game's `onRelease` already returned at zero charge, so in Flow a hold
  does nothing; the steam ring, sprinkles, bubble and wing gust (and their full-charge breezes,
  stars and wishes) are Fidget's now.
- **Gold cue.** Each game sets `cue: false` and draws `CozySkin.cue` instead: a ring of little
  lights closing on the spot where the tap matters, tinted the thing's colour, that turns gold
  (a gold ring, gold sparkles and a soft gold glow) inside the perfect window. Steep: on the cup
  under the spout. Ripple: on the next drop's spot on the water (flattened; later drops keep a
  faint ring). Frost: at the nozzle. Lull: between Tibbet's antennae, where the lantern will be.
  It follows the shell's rules (Flow only, once someone's playing or on autopilot).
- **Pocket frames.** Every layout scales down on short screens (`H < 520`: k = H / 420, at least
  0.55), so Oolong, Mallow and Tibbet sit under the bar in Corner and Mini; Ripple's willow tips
  come up to match, Frost's cake sits a little lower.
- **Background happenings.** `CozySkin.happenings(kinds)` plays one of a game's little scenes
  every 7 to 15 seconds, never the same one twice running, kept to the sky and the edges:
  - Steep: a shooting star, a moth visiting a lantern, a kite with a face, a light running along
    the lanterns, a sleepy snail with a glowing shell crossing the lawn, a firefly spiral.
  - Ripple: a shooting star, a dragonfly darting along the bank, a fish leaping at the pond's
    edge, a paper boat with a lantern and a sleeping sailor, a firefly spiral by the reeds.
  - Frost: a shooting star, a striped balloon with a sleeping passenger, three cloud birds, a cloud
    bunny peeking over the bank, a sugar star spinning on its thread, a flurry of sugar snow.
  - Lull: a shooting star, a night train along the far hill, a cloud across the moon, a soft
    far-off firework, a little moth friend waving as it flies by. Plus, always, far-off lanterns
    drifting up from the village.
- **Steep, more charm per tap.** The cups are characters now: asleep as they slide in, awake and
  looking up at Oolong as they near the spout, beaming once filled (a big open smile for a
  perfect), and a missed one gasps and dozes off. A pour makes the cup hop with a squash as it
  lands (higher for a perfect), splashes tea droplets that leap and fall back, and the flower
  blooms faster (0.8 beat instead of 1.4).
- **Frost's art.** The cake is smaller and taller, with soft shading, a satin ribbon, sugar pearls
  along the base, a shell-piped border and piped rings on top, on a porcelain stand with a lace
  edge, a stem and a foot; a soft halo of rays turns behind it; rosettes are bigger. Mallow has
  floppy ears, and her piping bag is a pale bag with the next rosette's frosting showing through,
  a ribbon tie and a silver nozzle.
- **Lull's hint and art.** The hint now says exactly when: "Tap when a lantern rises between
  Tibbet's glowing antennae" (and after a miss, "...when the ring turns gold"). Her antennae are
  longer and the lantern's beat is centred between their tips. A big soft moon, bigger lanterns,
  bigger houses with chimneys and lit roof edges, a brighter aurora.

Checks: `check` 431 KB of 512 KB; `play` all ok (2.35 to 2.94 ms a frame headless); `npm test`
30/30; `npm run smoke -- cozy` 5/5; `shots` reviewed at pocket, pocket-mini and phone-tier4. The gold
cue was caught on its beat in each game with an on-beat Flow run, and each happening was started
by hand and looked at on a phone.
