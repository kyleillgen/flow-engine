# Arcade: build log

What it took to make this cartridge, so the next one is easier. Keep it as you go, not at the end.

## Art direction

**The cabinet.** You're standing at a late-night arcade cabinet with a really good monitor. The
glass has soft scanlines and a dark curved vignette (a CSS overlay, so it costs nothing per
frame). Everything bright glows like phosphor: sprites are baked with their bloom once and
stamped additively. The header is the cabinet's top: a black bezel with an amber dot-matrix
score (1UP and HI), and a row of warm marquee bulbs chases along the bottom edge. The attract
mode is a chrome pixel logo with a hard drop shadow, a blinking FREE PLAY (you can't lose, so
there are no coins), and the one-line hint.

**Palette.** Cabinet black `#07060d`, bezel plum `#1a1030`, phosphor cyan `#3df5ff`, hot pink
`#ff4f9a`, sun yellow `#ffd23d`, lime `#7dff5a`, ember orange `#ff8a3d`, violet `#9b6bff`,
cream `#fff4e0`. Tiers climb cyan, lime, pink, gold.

**Pixels with modern lighting.** Characters are real pixel art (strings in the code), baked
at a whole-number scale with: a soft bloom in their own colour, a top-left key light across the
whole sprite, and a rim highlight on every pixel that has sky above it. The type is a 5x7 pixel
font drawn in code for callouts and marquees, chrome-filled.

**Characters and signature moments.**

| Game | Genre | Who | Signature moment |
|---|---|---|---|
| Bonk | brick-breaker | **Pip**, a round spark with big eyes, rides between **Slab** (a hover-paddle with headlight eyes) and a wall of **Blocklings**, sleepy bricks who pop into confetti and cheer | Every eighth clean bonk Pip goes **Mega**: a fireball that tunnels a whole column with a screen kick |
| Lamp | maze chase | **Kip**, a firefly with a lantern tail, runs a dark maze; the **Murks**, shadow puffs with white eyes, tag along behind | A phrase lights the whole maze like a neon blueprint and the Murks squeak and scatter |
| Hop | lane crossing | **Peep**, a chunky chick in a tiny helmet, crosses a neon highway of grinning cars and buses | Every eighth lane is a sidewalk: the traffic lights all go green and fireworks pop over the city |
| Rocks | rock blaster | **Zip**, a tiny round ship with a bubble cockpit and a pilot; the **Grumps**, space rocks with eyebrows | A perfect blast breaks a Grump into a burst of pixel shards that turn into happy little gems |
| Claw | claw crane | The claw **Mitt**, and a pile of plushies: **Bun**, **Tako**, **Pom** and **Bao**, stitched faces, wiggling when the claw comes | A phrase is the jackpot: the chute lights up and a giant Bun waves from the top of the cabinet |

## Effort

| | |
|---|---|
| Started | 2026-10-28 11:27 |
| Finished | 2026-10-28 12:16 |
| Working time | about 0.8 hours (11:27 to 12:16), with screenshot and play runs going in the background while the next game was written |
| Games | 5: Bonk, Lamp, Hop, Rocks, Claw |
| `cart.mjs check` | `ok   arcade: Arcade, 5 games, 10 files, 241 KB of 512 KB` |
| `cart.mjs play` | `ok   games/bonk.html: draw 0.94 ms, 56 fps, heap 2 MB (headless)`<br>`ok   games/lamp.html: draw 0.75 ms, 60 fps, heap 3 MB (headless)`<br>`ok   games/hop.html: draw 1.77 ms, 59 fps, heap 3 MB (headless)`<br>`ok   games/rocks.html: draw 0.77 ms, 59 fps, heap 3 MB (headless)`<br>`ok   games/claw.html: draw 1.63 ms, 58 fps, heap 2 MB (headless)`<br>Headless numbers are a guide, not a measurement of a real machine. |

## Steps

- 11:27 Read the brief, `docs/build-on-the-engine.md`, `carts/cart.mjs`, `games/skip.html`, `shell/space-shell.js`, `skins/neon/neon-skin.js`, the sibling notes. (4 min)
- 11:30 `cart.mjs new arcade "Arcade"`, `npm install --no-save puppeteer-core`, art direction above. (3 min)
- 11:31 Forked the skin: `skins/arcade/arcade-skin.js`. Kept the neon skin's light-stamping parts (sprite, layer, glow, streak, softRing, twinkle) and added a 5x7 pixel font, pixel sprites baked with bloom, key light and rim light (`pix`), an amber dot-matrix score, a chrome marquee logo, cabinet side art and a phosphor mask, and the CRT glass as a CSS overlay. Only Oswald ships (no Inter), to save 47 KB. (8 min)
- 11:33 Forked the shell: `shell/arcade-shell.js` is `space-shell.js` with the skin swapped, the marquee replaced by the logo canvas and a blinking FREE PLAY, its own hi-score key, and recoloured CSS. Done with a scripted find-and-replace so the diff from the space shell stays small. (5 min, 2 of them on CRLF: see friction)
- 11:34 Bonk (brick-breaker). First screenshot already read as a cabinet; second pass made the Blocklings taller with bigger faces and shortened Pip's trail. (10 min)
- 11:39 Hop (lane crossing). Design call: Peep crosses from traffic island to traffic island, so he's never standing in a live lane, and every car's crossing time is fixed, so a gap is just the cars that are never there. (8 min)
- 11:45 Rocks (rock blaster). (6 min)
- 11:49 Claw (claw crane), the most characterful one: four plushies with three moods each, Mitt with LED eyes, a giant waving Bun for the jackpot. (8 min)
- 11:52 Lamp (maze chase). First screenshot was a lonely tube and the Murks had the dome-and-skirt silhouette of a famous ghost; redrew them as round puffballs with tufts and feet, and filled the maze with seeded bands of corridors and loops. (12 min)
- 11:57 `cart.json` filled in; `check` ok at 237 KB. First `cart.mjs play`: all five inside the budget headless (draw 1.0 to 2.6 ms). Art pass 1 started (see below).
- 12:02 `npm test` 29/29, `npm run smoke` 17/17 ok. Art pass 2 (see below).
- 12:05 Build log: bugs and friction written up.
- 12:08 Committed the first full version (b2db6c9).
- 12:13 Final `check` and `play` (lines above), logo panel confirmed in a fresh desktop shot.
- 12:14 Final `npm test` (29 pass, 0 fail) and `npm run smoke` (all 17 games ok, the five arcade games included) on the finished code, then committed.

## Art passes

**Pass 1 (11:59).** Reviewed phone (400x760) and desktop (1280x800) shots of all five.
- Hop: the coin sat in a busy lane long before its gap came, so a bus drove over it; the coin now shows only for the last 2.4 beats, the gap gets chevrons at its edges, and traffic is sparser (periods 1.5 to 2.5 beats).
- Claw: plushies were small in a big machine; one pixel size up, and a taller pile. Fixed the target brackets, which drew as stray bars.
- Rocks: Zip was tiny inside its ring; one pixel size up.
- Lamp: the maze fill and the new Murks (above).

**Pass 2 (12:02).** Phone, desktop and pocket-size (440x620, Fidget plus a full charge) shots of all five.
- Every game: callouts like TRIPLE LASER read faintly over busy scenes; the pixel lettering now has a dark outline and a hard drop shadow baked in.
- Every game: on desktop the attract logo sat over Bonk's bottom row of bricks and was hard to read; it's now printed on a backlit marquee panel.
- Hop: Peep overlapped the lane below (islands are taller now); the LANE 8 sign sat under Peep, so it moved left; every fifth road is a pink-tinted lane so the highway isn't one long repeat.
- Claw: the space under the floor on desktop was dead; it has a PLUSH PALACE nameplate now, and the chute is labelled PRIZE.
- Lamp: Kip and the lanterns were small in wide corridors; one size up.
- Checked and left alone: Rocks' Nova (16 rainbow bolts, the ring wave) and Bonk's triple laser both read well at pocket size.

## Bugs found

| Where | What happened | Fixed how |
|---|---|---|
| this cart (Bonk) | Pip's target was chosen when the tap was judged, up to 0.45 beat after the flight had begun, so Pip would jump sideways mid-air | The target is chosen the moment Pip lands; the tap only decides whether the brick breaks |
| this cart (Hop) | The coin sat in its lane from the moment the gap was scheduled, so for a few beats cars drove straight over it | The coin shows only for the last 2.4 beats, when the gap is on screen |
| this cart (Hop) | Peep (10 px tall at k+1) was taller than his traffic island and overlapped the lane below | Islands are 10 px tall instead of 7 |
| this cart (Hop) | Lane speeds are in pixels and were cached, so a resize kept the old speeds | Clear the lane cache in `resize` |
| this cart (Lamp) | A local `sx` shadowed the screen-x helper inside `onBeat` (harmless, but a trap) | Renamed |
| this cart (Lamp) | The first Murks had the dome-and-wavy-skirt silhouette of a famous maze ghost | Redrawn as round puffballs with tufts and feet |
| this cart (Claw) | The target brackets drew as stray bars (sign mix-up) | Rewritten as four plain corner brackets |
| shared files | None found. The engine, `space-shell.js` (as forked) and the cart tool behaved as documented. | |

## Not plug-and-play yet


1. **A new look means forking the whole shell.** `space-shell.js` hard-codes `window.NeonSkin`, its marquee markup (a neon text title and rule) and its colours in CSS, so the cabinet look needed a 440-line copy to change about 20 lines. Fix: let `mount` take `skin` and a `marquee(el, title)` hook, and read HUD colours from CSS variables the skin sets.
2. **Shared files are CRLF in a Windows checkout** (`core.autocrlf true`), so a scripted find-and-replace on the forked shell matched nothing until the `\r`s were stripped. Fix: a `.gitattributes` with `* text=auto eol=lf`.
3. **`cart.mjs new` assumes the space look.** It writes the space shell, neon skin and both fonts into `files`, and there's no starter game for a cartridge, so the real starting point is reading `skip.html` and copying its structure. Fix: `new <id> --shell <file> --skin <file>`, and a `games/cart-template.html` with the schedule, judge, autopilot and miss boilerplate filled in.
4. **The same 40 lines in every game.** Schedule on the beat at `max(n + 4, last + 2)`, find the nearest waiting thing within its window, judge perfect or clean, autopilot resolves at its beat, update turns late ones into misses. All five games here (and the space ones) repeat it. Fix: a small `api.track()` helper in the shell that owns the list and calls `onHit` / `onMiss`.
5. **No screenshots from the tool.** Reviewing art at phone and desktop width needed a hand-written puppeteer script with its own server. Fix: `cart.mjs shots <id>` writing phone, pocket and desktop PNGs of attract and play.
6. **`npm run smoke` can't target one cartridge.** It plays all 17 games (about a minute and a half) every time. Fix: an optional filter argument.
7. **`S.mix` returns `rgb()`**, but `glow` and `rgba` need hex, so a mixed colour passed to a glow comes out as a solid disc instead of a soft falloff (rgba() hands non-hex colours back unchanged). The arcade skin adds `mixHex`.

## Migration

Moved off the forked shell onto the shared `shell/space-shell.js` and engine from neon-space
(f64dee4), which added the skin option, the theme and `api.track()` asked for in friction items 1
and 4 above.

| | |
|---|---|
| When | 2026-10-28 15:11 to 15:30, about 20 minutes |
| Merge | `git merge neon-space`: clean, no conflicts |
| Lines | 699 removed, 243 added (net -456): the 443-line `shell/arcade-shell.js` is gone; the five games went from 2,259 to 2,227 lines; the skin grew 19 |
| `cart.mjs check` | `ok   arcade: Arcade, 5 games, 10 files, 251 KB of 512 KB` (was 241 KB; the shared shell is bigger than the fork) |
| `cart.mjs play` | `ok   games/bonk.html: draw 0.36 ms a frame, heap 3 MB (headless; frame rate 55, not judged)`<br>`ok   games/lamp.html: draw 0.22 ms a frame, heap 3 MB (headless; frame rate 58, not judged)`<br>`ok   games/hop.html: draw 0.43 ms a frame, heap 3 MB (headless; frame rate 57, not judged)`<br>`ok   games/rocks.html: draw 0.26 ms a frame, heap 3 MB (headless; frame rate 60, not judged)`<br>`ok   games/claw.html: draw 0.29 ms a frame, heap 3 MB (headless; frame rate 57, not judged)`<br>Headless numbers are a guide, not a measurement of a real machine. |
| `npm test` | 30 pass, 0 fail |
| `npm run smoke -- arcade` | all five ok (with `BROWSER` set to Edge) |
| Shots | `cart.mjs shots arcade`: phone, phone-tier4, desktop and attract match the old ones; the one visible change is the shell's "+100" pop at each hit, in the cabinet's pixel callout |

**What moved where.**
- Every game mounts `SpaceShell` with `skin: ArcadeSkin` and `marquee: ArcadeSkin.attract`.
- The skin now carries `theme` (cabinet black, cream, violet and pink for the HUD, pause card and
  flow check), `attract(el, title, hint)` (the chrome logo, blinking FREE PLAY and hint, redrawn on
  resize) and the logo CSS that used to live in the forked shell.
- All five games use `api.track()` for spawning, judging, scoring, misses and autopilot. Checked
  headless with a tapper that fires on each thing's beat via `?test=1`: every on-time tap hit and
  scored in all five, no errors, and Fidget mashing ran clean.

**Not plug-and-play.**
1. **The tracker pops points at `thing.x, thing.y`, in pixels.** Lamp kept its corners in maze
   cells under `x`/`y`, so they moved to `cx`/`cy`. Hop's gaps and Claw's stops had no position
   at all, so each sets `x`/`y` when it resolves. Worth one line in the header: "x, y are where
   the points pop, in CSS pixels".
2. **The tracker's Fidget takes the next thing at once.** That's wrong for three of the five: Hop
   would walk Peep into traffic before the gap arrives, Claw would grab at a slot Mitt isn't over
   yet, and Rocks would blast a Grump still off screen. Those three handle Fidget presses in
   `onFire` themselves and call `api.eng.tap()` directly, so the tracker only does on-time play.
   An option like `fidget: false` (or a `fidget(thing)` hook) would make this explicit.
3. **`miss(thing)` can't tell whether the miss counted.** The old code showed the "how to play"
   hint only when `api.miss()` returned true. With the tracker, things left alone in Fidget still
   reach `miss`, so each game checks `api.style` itself. Passing the result through (for example
   `miss(thing, counted)`) would remove the guess.
4. **Path games need their own history.** Bonk, Lamp and Claw draw a route through past landings.
   The tracker drops things `keep` beats after their beat, so Bonk and Claw pass `keep: 32`, and
   Lamp keeps its own `nodes` list (which `spawn` appends to) so the drawn route never jumps.
5. **The hi-score key changed** from `<game>.arcade.hi` to `<game>.space.hi`. Nobody has played the
   branch yet, so nothing was migrated. A `hiKey` option would let a cartridge keep its own.
6. **`npm run smoke` doesn't find a browser by itself**, unlike `cart.mjs play`, which tries Edge
   and Chrome. On this machine it needs `BROWSER=".../msedge.exe"`.

Still forked: nothing in the shell. The skin is the cartridge's own, as intended.

## Second pass

Moved the migration's workarounds onto what neon-space b6519c2 added to the shared shell.

| | |
|---|---|
| When | 2026-10-28 17:09 to 17:24, about 15 minutes |
| Merge | `git merge neon-space`: clean, no conflicts |
| Lines | 75 removed, 71 added (net -4). Hop, Claw and Rocks lost their own Fidget branches in `onFire`, but most of that code moved into `ready` and `empty` rather than disappearing |
| `cart.mjs check` | `ok   arcade: Arcade, 5 games, 10 files, 254 KB of 512 KB` |
| `cart.mjs play` | `ok   games/bonk.html: draw 1.54 ms a frame, heap 2 MB (headless; frame rate 50, not judged)`<br>`ok   games/lamp.html: draw 1.03 ms a frame, heap 3 MB (headless; frame rate 59, not judged)`<br>`ok   games/hop.html: draw 2.09 ms a frame, heap 3 MB (headless; frame rate 58, not judged)`<br>`ok   games/rocks.html: draw 1.27 ms a frame, heap 3 MB (headless; frame rate 58, not judged)`<br>`ok   games/claw.html: draw 1.50 ms a frame, heap 2 MB (headless; frame rate 58, not judged)`<br>Higher than the first migration's run with no drawing changes, so it's machine load. Headless numbers are a guide, not a measurement of a real machine. |
| `npm test` | 30 pass, 0 fail |
| `npm run smoke -- arcade` | all five ok, with no `BROWSER` needed now |
| Shots | `-phone-tier4` now really shows tier 4 (gold): it matches the look |

**What changed.**
- **Fidget goes through the tracker in all five games.** `ready()` says when Fidget may take a thing:
  - Hop: the gap is within its window.
  - Claw: Mitt is over the slot.
  - Rocks: the Grump is on screen.

  A Fidget press with nothing ready goes to `empty()`, which keeps each game's old per-press effect:
  - Hop: a flap, and the next coin taken early.
  - Claw: Mitt drops on the spot.
  - Rocks: a long cyan bolt.
- **The how-to-play hints use `miss`'s `counted`** instead of checking `api.style`.
- **Points pop where `hit` returns `{ x, y }`.** Lamp, Hop, Claw and Rocks no longer write `x`/`y` onto the thing. Bonk's landings carry their own position from spawn.
- **`keep` is a function** in Bonk, Claw and Rocks: keep a finished thing while it's still the last one reached, which the flight, carriage and aim start from. Rocks also keeps missed Grumps for their 4-second drift.
- **The skin carries `words`** (Button, Power shot, the cabinet "runs its demo") and a `system-ui` body font, since the cartridge ships no Inter.

**One play change.** In Fidget, Hop's Peep now also crosses at once when you press inside the gap's window, instead of always waiting for the gap's beat. It's always safe, because the traffic is clear for 1.3 beats either side.

**Still not plug-and-play.**
1. **The autopilot label is cut off on a phone.** At 400 px wide, "Autopilot · tap to take over" doesn't fit beside the arcade score and is clipped. It's the shared shell's text, so it isn't changed here. A shorter label, or one a skin can set through `words`, would fix it.
2. **`api.drawCharge` is a ring**, while these games draw their charge as a pixel bar under the character, so they keep their own.
3. **`empty()` runs for both a normal miss-tap and a Fidget press with nothing ready.** Three games branch on `api.style` inside it. `empty({ fidget })` would match `hit`.
4. **A Fidget press with nothing ready taps at note height 0.5.** The games used a random height there before, so it's now a fixed note.

## Third pass (playtest)

The user's notes after playing the cartridge in the real Flow Pocket app, on top of neon-space 1f2e6ba (Flow holds never charge or miss, the shell's gold timing cue, pocket-size shots).

| | |
|---|---|
| When | 2026-10-28 18:49 to 19:20, about 30 minutes |
| Merge | `git merge neon-space` (1f2e6ba): fast-forward, no conflicts |
| Lines | 192 removed, 509 added across the five games, the skin and `cart.json`. Most of it is new: Lamp's reveal, Hop's crosswalk and landing pad, and four background events a game |
| `cart.mjs check` | `ok   arcade: Arcade, 5 games, 10 files, 269 KB of 512 KB` |
| `cart.mjs play` | `ok   games/bonk.html: draw 1.49 ms a frame, heap 3 MB (headless; frame rate 53, not judged)`<br>`ok   games/lamp.html: draw 0.94 ms a frame, heap 3 MB (headless; frame rate 57, not judged)`<br>`ok   games/hop.html: draw 2.68 ms a frame, heap 3 MB (headless; frame rate 59, not judged)` (2.97 on a first run)<br>`ok   games/rocks.html: draw 1.18 ms a frame, heap 3 MB (headless; frame rate 59, not judged)`<br>`ok   games/claw.html: draw 1.44 ms a frame, heap 3 MB (headless; frame rate 57, not judged)`<br>Hop went up from about 2.1 ms because its lanes now carry a car every beat; it's still inside the 4 ms budget. |
| `npm test` | 30 pass, 0 fail |
| `npm run smoke -- arcade` | all five ok |
| Playtest | Headless on-time tapper (`?test=1`): every tap hit and scored in all five (10 to 12 each, no misses); Fidget mashing ran with no errors. Frame sequences across a tap at 372x330 for each game to check the cue and the reveal |
| Shots | `-pocket`, `-pocket-mini` and `-phone-tier4` looked at for all five |

**By game.**
- **Bonk** ("doesn't work in the pocket", "clean up the glow").
  - The wall now gets the room left after Slab and Pip's flight: the biggest pixel that still fits four rows (three in the mini frame), at most five. Slab sits a fixed margin above the bulbs. In the pocket the wall is four rows of smaller Blocklings with clear air below.
  - Glow: brick bloom 6 to 3, Pip's bloom 10 to 4 and his halo about a third smaller and dimmer, Slab's bloom 10 to 4, the thruster and headlight glows smaller and fainter.
  - The landing brackets are gone; the shell's cue closes on the spot where Pip touches down (`cueAt`), gold on the perfect beat.
- **Lamp** ("makes no sense", "what is chasing it?").
  - The two Murks that tagged along behind Kip are gone.
  - Now the maze is dark and each lantern is the light for the way on: tap as Kip reaches it and it lights, and a spark runs down the next corridor to the next lantern, lighting it up. Only legs from lit lanterns are bright. Miss and the lantern stays dark: the next corridor only shows dimly once Kip is already on it. A perfect lantern gets moths.
  - Cells are sized from the height too, so a whole leg ahead fits above Kip in the pocket. The cue closes on the lantern.
  - Hint: "Tap as Kip reaches a lantern to light the way" (also in `cart.json`).
  - Fixed on the way: `corner()` pushed each node onto the route twice.
- **Hop** ("no timing, I can't figure out when to jump").
  - Every car now crosses Peep's path on a whole beat (each beat, or each other beat), over a painted crosswalk, so the traffic itself keeps time and the gap is the missing car, arriving at the crosswalk on its beat.
  - The gap's light window has bright edges, so you can see it meet the crosswalk.
  - The cue closes on the coin at the crosswalk, and four corner marks on the island beyond show where Peep lands, brightening as the beat comes.
  - Pixel size from the height too, so the mini frame still shows the lane ahead.
- **Rocks** ("great; clean up the art").
  - Planet smaller, darker and tucked into the corner; fewer stars and pebbles, pebbles fainter.
  - Blooms and halos down on Zip, the Grumps and the gems; the underglow lights smaller.
  - The ring marker is gone; the cue closes where each Grump will touch the ring.
- **Claw** ("same height issue").
  - The pixel size comes from the height as well as the width. In short frames the top lights, the prize counter and the rail move up, the front panel shrinks and the back pile is half as tall, so Mitt has a real drop.
  - The corner brackets are gone; the cue closes on the wiggling plushie, sized to it. The drop beam turns gold on the perfect window instead of 0.15 beat.
- **Background life (all five).** `ArcadeSkin.happenings(kinds)` plays one of a game's small background events every 7 to 15 s, at random, never the same twice running, all faint and behind the play:
  - Bonk: a comet, a far firework, a blimp with a sign, the wall tubes flickering pink.
  - Lamp: a glow-worm blinking down a dead end, a draught of light along the walls, a moth wandering through, a faint echo of the blueprint.
  - Hop: a flock of birds, a searchlight sweep, a blinking drone, a cat strolling along the island edge.
  - Rocks: a shooting star, a satellite, a space jelly drifting up, the planet's rim catching the light.
  - Claw: a plushie peeking up from the pile, a glint across the glass, the top lights chasing back, a sleepy bubble.
- **Holds in Flow.** Every game's `onRelease` starts with `if (c <= 0) return`, and `chargeOf` is now 0 in Flow, so a long press in Flow does nothing extra.

**Still not plug-and-play.**
1. **`cueSize` is read once.** `track()` copies its options, so a cue sized from the layout (Claw's, from the pixel size) is stale after a resize. Claw writes `stops.o.cueSize` in its layout. A `cueSize` that may be a function, like `ahead`, would fix it.
2. **The shell's cue is drawn after `draw()`**, so it sits over the game's own sprites. In Hop the ring round the coin overlaps Peep's helmet for the last half beat. It reads fine, but a game can't put it under a sprite without `cue: false` and drawing it itself.
3. Still open from the second pass: the clipped autopilot label, the charge ring vs the pixel bar, `empty()` without a `fidget` flag, and Fidget's fixed 0.5 note.
