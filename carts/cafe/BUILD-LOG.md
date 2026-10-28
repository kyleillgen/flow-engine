# Lo-fi Cafe: build log

What it took to make this cartridge, so the next one is easier. Keep it as you go, not at the end.

## Effort

| | |
|---|---|
| Started | 2026-10-28 11:27 |
| Finished | 2026-10-28 12:00 |
| Working time | about 0.6 hours (one session, wall clock) |
| Games | Pour, Rain, Paw |
| `cart.mjs check` | `ok   cafe: Lo-fi Cafe, 3 games, 9 files, 241 KB of 512 KB` |
| `cart.mjs play` | `ok   games/pour.html: draw 2.34 ms, 48 fps, heap 3 MB (headless)`<br>`ok   games/rain.html: draw 2.24 ms, 56 fps, heap 4 MB (headless)`<br>`ok   games/paw.html: draw 1.84 ms, 59 fps, heap 3 MB (headless)` |

`npm test`: all pass. `npm run smoke` (Edge): ok for all 15 games, including the three here.
The draw times are headless measurements at the pocket's 0.75x on this machine. They are a guide, not a measurement of real hardware. The film grain is a CSS layer, so its compositing cost does not appear in the canvas draw time at all.

## The games

- **Pour** (`games/pour.html`): cups slide along the counter at a steady pace, each reaching the milk pitcher on a whole beat. A tap tips the pitcher. Clean pours a heart, perfect pours a rosetta. A missed cup goes on as a plain black coffee. Steam curls off every cup. Biscuit sleeps on the windowsill, with rain on the glass and a hanging lamp. Fidget pours into the next cup wherever it is. The trick shot is a pitcher flourish, and a full charge pours "a little swan" of steam over every cup and wakes Biscuit.
- **Rain** (`games/rain.html`): the big café window at night. Raindrops run down the glass and reach the sill on a whole beat. A tap settles the drop into a bead of light on the sill and lights a lamp across the street. Biscuit sits on the sill and watches each drop: his eyes follow it, go wide as it lands, and turn to a happy squint on a catch. Fidget brings the next drop down at once. The trick shot is a finger drawing in the fog, and a full charge draws a heart.
- **Paw** (`games/paw.html`): a felt fish on a string swings back to Biscuit and reaches his paw on a whole beat. A tap is a swipe that bats it spinning. A perfect sometimes gets a "mrrp". A miss bops him gently on the nose, and he blinks. He wiggles before the fish arrives. Fidget pulls the fish to his paw on every press. The trick shot is a pounce, and a full charge is a flip ("zoomies").

All three follow the engine rules:
- Spawns happen in `onBeat` on whole beats, at least 2 apart (`max(n + lead, lastAt + 2)`).
- Positions are functions of `beatPos()`.
- `eng.tap()` runs on every press.
- Results go only through `hit` and `miss`.
- Autopilot plays every game.
- Fidget makes every press succeed, and the trick shots never score.

## Steps

- 11:27: read `docs/build-on-the-engine.md`, `carts/cart.mjs`, `carts/space/cart.json`, `games/skip.html`, `shell/space-shell.js` and `skins/neon/neon-skin.js`, plus the sibling note. (5 min)
- 11:30: `node carts/cart.mjs new cafe "Lo-fi Cafe"`. Wrote `skins/cafe/cafe-skin.js`, forked from the neon skin. It keeps the sprite, layer, glow, motes, rings and twinkle machinery. New in it: a warm low-saturation palette and HUD CSS, film grain as a CSS tile made once from a canvas, a sagging string of warm bulbs instead of neon dashes, chalky lower-case callouts, wood, a night window with city bokeh, rain, beads on the glass, steam and a lamp. (8 min)
- 11:31: forked `shell/space-shell.js` into `shell/cafe-shell.js` with a scripted rename (SpaceShell to CafeShell, NeonSkin to CafeSkin) and then edits. The edits are warm CSS (pause card, flow check, marquee fade-in instead of the neon flicker), lower-case labels, tier names, the keys card wording, and a first-visit default track. The API is unchanged. (3 min)
- 11:33: added Biscuit the cat to the skin (`CafeSkin.cat`, loaf or sitting pose, eyes, look, paw, tail), so all three games share one character. (4 min)
- 11:35: Pour written, then screenshotted at 400x760 and 1280x800 with puppeteer and Edge on port 4184. Fixes: lowered the pitcher. Fidget screenshots confirmed the latte art draws. (6 min)
- 11:41: Rain written and screenshotted. Fixes: bigger drops with a soft halo, half the street bokeh, and a shorter wet trail (the full-height trail read as lamp posts). (5 min)
- 11:45: Paw written and screenshotted three times. Fixes: the fish swung off screen, the fish hung below the paw, the arc dipped to the floor, and the plant moved. See "Bugs found". (6 min)
- 11:51: `cart.json` lists three games. `check`, `play`, `npm test` and `npm run smoke` all pass on the first run. (4 min)
- 11:56: wrote this log and committed. (4 min)

## Bugs found

| Where | What happened | Fixed how |
|---|---|---|
| this cart (skin, `cat`) | The raised paw reached to the wrong side: `PI/2 + side*paw*1.9` with side -1 points right. | Changed it to `PI/2 - side*paw*1.9`. |
| this cart (Paw) | At the far end of its swing the fish went off the left edge, because the far angle was not mirrored about the pivot. | Pivot at the middle of the swing and `far = -near * 0.9`. |
| this cart (Paw) | The string ended at the paw, so the fish's body (it hangs below its knot) sat at floor level. | The string now ends at a knot above the paw, so the body hangs at the paw. |
| this cart (Paw) | The pendulum's lowest point dipped near the floor mid-swing. | The pivot is now off screen above (`y = -0.25 H`), so the arc is shallow. |
| this cart (Paw) | `L.win` was only set while baking the room layer. A resize to the same size would keep the cached layer and leave `L.win` undefined, which crashes the draw. | It is set in `layout`. |
| this cart (Rain) | Drops were lost among the bokeh and the decorative beads. | Bigger drops, a soft halo in the tier colour, and fewer and dimmer bokeh. |

No bugs were found in shared files.

## Not plug-and-play yet

1. **A new look means forking the whole shell.** `space-shell.js` hard-codes `window.NeonSkin` and carries its own neon CSS: the cyan and magenta rule, the flickering `nn-strike` marquee, and the flow-check card colours. So a cartridge that only wants a different skin still has to copy all 450 lines of shell. The forks will drift as the shell gets fixes. **Fix:** a skin argument (`mount({ skin: CafeSkin })` or `window.FlowSkin`), with the shell's few colours read from `Skin.colors` or CSS custom properties that the skin sets.
2. **A skin is mostly shared plumbing.** About 200 of the neon skin's lines are generic: `sprite`, `layer`, `draw`, `add`, `glow`, `mix`, `mixA`, `rgba`, `rng`, `blurred`, `motes`, `softRing` and `twinkle`. Every new skin has to copy them. **Fix:** a frozen `skins/base.js` that skins extend, so a skin is only palette, CSS and parts.
3. **No way to choose a game's music.** The engine reads the track and voice only from its saved prefs in localStorage. The cafe shell seeds `<key>.prefs` with "RAIN ON GLASS" and the Lo-fi Rhodes voice on first visit only, which works but is a workaround in a shell. **Fix:** `FlowEngine.create({ track: "RAIN ON GLASS", voice: "LO-FI RHODES" })` as defaults that saved prefs override. A cartridge-level `"music"` field in `cart.json` would let the pocket do the same.
4. **Games all live in one shared `games/` folder.** Parallel cartridges can collide on file names and on localStorage keys. This one uses `cafePour`, `cafeRain` and `cafePaw` to be safe. Also, `npm run smoke` runs every file in `games/`, so one cartridge's broken game fails everyone's smoke run. **Fix:** allow `carts/<id>/games/`, or a documented `<cartId>-` prefix rule.
5. **`cart.mjs new` writes the space shell and the neon skin into `files`.** That's right for a space cartridge, but every other theme has to edit it by hand. It's a small thing; a `--shell` or `--skin` flag would cover it.
6. **`cart.mjs play` measures only the canvas draw time.** CSS work such as this cartridge's animated grain layer (a `mix-blend-mode: overlay` tile stepping 8 times a second) is not counted. It is probably cheap, but nothing measures it. **Fix:** also report `performance.now()` frame gaps, or a Chrome trace's composite time.
7. **Music wishes for a real lo-fi feel.** I made no engine changes. What I'd want, in the engine's synth:
   - A **lower tempo floor.** `beatSec` clamps the bpm to 88–136, and lo-fi lives at 70–85. Allow 72 as a floor for a cartridge that asks for it.
   - **Softer drums:** a "lofi" kit with a short sine kick around 50 Hz, a brushed or noise snare with a slow attack, and quieter, darker hats, with **swing** on the 16ths (55–60%).
   - **Vinyl crackle:** a quiet bed of band-passed noise with sparse random pops, under everything, on a toggle.
   - **Tape wow:** a slow 0.3–0.6 Hz pitch LFO of a few cents on the pad and Rhodes.
   - **A low-pass on the master** (around 3–4 kHz, gentle Q) for the muffled, through-a-wall sound.
   - **Rain ambience:** pink-ish noise, low-passed, as an optional room tone. It would suit this cartridge's Rain game exactly.
   - **Softer action notes:** an option for the note on each tap to be a muted Rhodes or kalimba pluck with a short decay, in place of the brighter default.

## Migration to the shared space shell (2026-10-28, 15:11 to 15:25)

The cartridge now runs on `shell/space-shell.js` and the engine from `neon-space` (f64dee4), merged in with no conflicts. `shell/cafe-shell.js` is deleted, and `cart.json` lists the space shell. The skin stays, and each game passes it in with `mount({ skin: CafeSkin, marquee: CafeSkin.marquee })`.

| | |
|---|---|
| Working time | about 15 minutes |
| Lines | 630 removed, 152 added (the 452-line shell fork is gone; the games are about 50 lines shorter each, net) |
| `cart.mjs check` | `ok   cafe: Lo-fi Cafe, 3 games, 9 files, 255 KB of 512 KB` (up from 241 KB: the shared shell is bigger than the fork was) |
| `cart.mjs play` | `ok   games/pour.html: draw 1.23 ms a frame, heap 3 MB (headless; frame rate 50, not judged)`<br>`ok   games/rain.html: draw 0.81 ms a frame, heap 3 MB (headless; frame rate 58, not judged)`<br>`ok   games/paw.html: draw 0.57 ms a frame, heap 4 MB (headless; frame rate 60, not judged)` |
| `cart.mjs shots` | 12 shots in `dist/shots/cafe/`. Compared by eye with the pre-migration shots: same scenes, same art, plus the shell's new "+100/+200" pop-ups at the cup, drop or paw. |
| `npm test`, `npm run smoke -- cafe` | 30 pass; ok for all three games (smoke run with `BROWSER` set to Edge) |

The draw times are lower than before, but they are headless and the new `play` measures differently ("frame rate not judged"), so read them as "still well inside 4 ms", not as a speed-up.

What moved where:
- **Music:** the shell's first-visit prefs hack is gone. Every game passes `engine: { track: "RAIN ON GLASS", voice: "LO-FI RHODES", lofi: true, minBpm: 72, startBpm: 80 }`, and Rain also passes `rain: true`.
- **The loop:** all three games use `api.track()` instead of their own `onBeat`, `onFire`, `autopilot` and miss loops. Each game's `setup` says what arrives (`spawn`), how it reacts (`hit`, `miss`, `empty`) and the note height (`note`). Game rules are unchanged: whole beats, at least 2 apart, `paceBeats`, a ±0.3-beat window widened by assist, perfect within ±0.1, and Fidget hits the next thing.
- **The look:** the skin now carries `theme` (the shell's colour variables), `marquee()` (the calm fade-in title and soft rule, in place of the neon flicker) and `relabel()`. It also has a few CSS lines that give the flow check Inter lower-case type.

### Not plug-and-play in the migration

1. **The tracker's `ahead` is fixed when the tracker is made, but Pour's lead depends on the screen width.** A wider counter needs cups to set out sooner. Pour sets `track.o.ahead` in `resize`, which reaches into the tracker's internals. **Fix:** let `ahead` be a function, or give the tracker a `set()`.
2. **The keys card can't be themed.** The card says "Fire", "Charge shot" and "it flies itself", which suit a café badly. `CafeSkin.relabel()` rewrites the text after mount, so it breaks if the markup changes. **Fix:** `mount({ keys: { fire, charge } })` or words on the skin.
3. **The theme covers colours, not type.** The flow check's title is still the shell's Oswald, upper case and glowing. The skin overrides it with higher-specificity CSS. **Fix:** font variables in the theme, such as `--ss-head`.
4. **"Ghost" means both autopilot and Fidget.** In Rain and Paw a Fidget press should get Biscuit's full reaction, but an autopilot hit shouldn't, so each `hit` checks `api.style` itself. **Fix:** pass `{ ghost, fidget }` to `hit`.
5. **The points pop-up reads `thing.x` and `thing.y`.** Cups move, Rain's `x` is a lane, and the fish swings, so each `hit` sets `x` and `y` before the tracker pops the points. That works, but only because `hit` runs before `api.hit`. **Fix:** document that order, or let `hit` return the point.
6. **`keep` is in beats, but Rain's fade is in seconds.** Rain's draw loop skips faded drops itself. This is minor.
7. **High scores live under a new key.** The fork stored them as `<key>.cafe.hi`, and the shell uses `<key>.space.hi`. Old scores don't carry over. Nothing has shipped, so this is fine.

### Listen-check (by reading the synth; nobody has heard it)

These come from reading `engine/flow-engine.js`, not from listening.
- **Swing:** each second 16th lands 0.16 of a 16th late. That is about 58% swing, inside the 55–60% asked for.
- **Kick:** a sine falling from 78 to 48 Hz over 0.22 s.
- **Snare:** a brushed snare on 2 and 4, made of band-passed noise at 1.7 kHz with a 14 ms attack, at level 0.07.
- **Hats and filter:** the hats are darker (3.1 kHz) and at 45% level. The master has a 3.4 kHz low-pass with a Q of 0.5.
- **Wow and lead:** tape wow is a 0.45 Hz sine of ±7 cents on the pad and the lead. Each tap's note is a sine with a 0.5 s decay, plus a short triangle "tine" at three times the pitch. All of these look right for lo-fi.
- **The tempo floor:** `minBpm: 72` sets the controller's floor to 72 and the synth's to 64, which leaves room for the wind-down.
- **Two things to listen for:**
  - **A thump every 3 s in the rain.** The rain bed is 3 s of brown noise on a loop, and the seam isn't matched, because brown noise doesn't end where it starts. That may come through the 1.3 kHz low-pass as a soft thump every 3 s.
  - **Crackle that repeats every 3 s.** The crackle bed has 18 pops in the same 3 s loop, so the same pattern of about 6 pops a second repeats every 3 s, out of step with the tempo. It may read as a loop rather than as vinyl. Longer beds, or pops scheduled at random times, would fix both.

### Shared files

No edits. One inconsistency for the owner: `npm run smoke` launches `puppeteer-core` without a browser path unless `BROWSER` is set, so it fails out of the box. `cart.mjs play` and `shots` find Edge or Chrome on their own.

## Second pass: onto the shell's new options (2026-10-28, 17:09 to 17:18)

This pass merges `neon-space` (b6519c2, no conflicts) and replaces the migration's workarounds with the options the shell now has. The games play and look the same as before.

| | |
|---|---|
| Working time | about 10 minutes |
| Lines | 82 removed, 29 added |
| `cart.mjs check` | `ok   cafe: Lo-fi Cafe, 3 games, 9 files, 253 KB of 512 KB` |
| `cart.mjs play` | `ok   games/pour.html: draw 1.69 ms a frame, heap 4 MB (headless; frame rate 52, not judged)`<br>`ok   games/rain.html: draw 1.73 ms a frame, heap 3 MB (headless; frame rate 58, not judged)`<br>`ok   games/paw.html: draw 1.56 ms a frame, heap 4 MB (headless; frame rate 59, not judged)` |
| `cart.mjs shots` | The `-phone-tier4` shots (now held at tier 4 on autopilot) show the same scenes and art as before. |
| `npm test`, `npm run smoke -- cafe` | 30 pass; ok for all three games (smoke found Edge by itself) |

What changed:
- **Pour:** `ahead: () => L.lead` replaces setting `track.o.ahead` in `resize`. `hit` returns the cup's `{ x, y }` instead of setting them on the cup.
- **Rain:** `keep: (d) => d.t < 1.2` replaces the draw loop's skip of faded drops. `hit` uses the `fidget` flag and returns `{ x, y }`, and the drop no longer carries a `y` just for the pop-up.
- **Paw:** `hit` uses the `fidget` flag and returns the paw's position. The spawned fish no longer carries `x` and `y`.
- **Skin:** `CafeSkin.words` replaces `relabel()`, which rewrote the keys card's text. The theme's `head`, `headCase` and `headGlow` (Inter, lower case, no glow) replace the font overrides on the flow check.
- **The hold's charge arc:** all three games had drawn it by hand (about 15 lines each). They now call `api.drawCharge(x, y, r, null, "#ffe2b0")`. The shell's two strokes are a hair wider and brighter (8 and 2.2 px, against 7 and 2), which is too small to see.

### Still not plug-and-play

1. **The marquee stays as `CafeSkin.marquee()`.** `strike` could name the skin's `cf-warm` keyframes, but the shell runs the title animation for 1.4 s linear with 0.14em spacing, and the café's title fades in over 2.4 s ease-out with 0.2em spacing. The shell's rule is also a c1-to-c2 bar with a neon glow; the café's fades out at both ends and has no glow. Neither the timing nor the rule's shape is a theme key. **Fix:** a `strikeTime` (or a whole `strike` shorthand), and a `rule` gradient or `ruleGlow` key.
2. **The flow check still needs three lines of skin CSS.** They give pill-shaped scale buttons, no glow on the chosen button, and 0.12em title spacing. The theme sets type and colour but not shape. **Fix:** `radius`, `onGlow` and `headSpacing` keys, or accept the shell's shapes.
3. **Only `hit` gets the `fidget` flag; `note()` and `empty()` don't.** Paw's `note` (in Fidget the note follows the fish's height) and the `empty` handlers in all three games still check `api.style`. That works fine, but passing `{ fidget }` to `note` and `empty` as well would make it consistent.

## Third pass (playtest) (2026-10-28, 18:49 to 19:05)

This pass merges `neon-space` (1f2e6ba, no conflicts) and applies the playtest notes that cover every cartridge.

| | |
|---|---|
| Working time | about 15 minutes |
| Lines | 217 added, 29 removed (the street-life module is most of the additions) |
| `cart.mjs check` | `ok   cafe: Lo-fi Cafe, 3 games, 9 files, 265 KB of 512 KB` |
| `cart.mjs play` | `ok   games/pour.html: draw 1.98 ms a frame, heap 3 MB (headless; frame rate 51, not judged)`<br>`ok   games/rain.html: draw 1.68 ms a frame, heap 3 MB (headless; frame rate 59, not judged)`<br>`ok   games/paw.html: draw 1.58 ms a frame, heap 3 MB (headless; frame rate 59, not judged)` |
| `cart.mjs shots` | 18 shots, including `-pocket` (372x330) and `-pocket-mini` (300x240). The pocket frames read well. The only cramped thing was the first tier name, which was cut off ("finding your rhy…"), so tier 1 is now "Warming up". |
| `npm test`, `npm run smoke -- cafe` | 30 pass; ok for all three games |

What changed:
- **Holds in Flow:** every `onRelease` already returned when `chargeOf` was 0. Now that a hold never charges in Flow, the flourish, the fog heart and the pounce happen only in Fidget. No code change was needed.
- **Gold perfect cue:** all three games pass `cue: false` to the tracker and keep their own rings, because those are squashed into each scene's perspective (flat on the counter and the sill, round at the paw). The rings now go through a new `CafeSkin.cue()`, which draws them the old way while the thing approaches. Inside the perfect window they turn gold (`#ffd36b`), get thicker, bloom 20% wider and gain a glow. Only the next thing gets a cue, and there is none in Fidget, the same as the shell's. I checked by freezing each game 0.07 beats before an arrival (a scratch puppeteer script, headless): the gold reads clearly at the cup, the sill and the paw. The cafe's amber tier colour is close to the shell's `Skin.colors.yellow`, so the shell's own cue would have barely changed colour. That was one more reason to draw our own.
- **Background life:** `CafeSkin.street()` runs on its own clock and never on a beat, and each game makes one.
  - **People:** they cross the street every 6–16 s. Each has an umbrella in one of five muted colours, its rim caught by the street light, or else a hood. Sometimes two walk together, and now and then one has a dog.
  - **Cars:** one sweeps past every 9–23 s, headlights first and tail lights behind.
  - **Weather:** the rain eases off and comes on harder (strength 0.45–1.5, a new target every 15–35 s), and it drives the falling rain and the number of beads on the glass. When the rain is heavy, a far-off flash comes once every minute or two, twice, the second softer.
  - **Moths:** `CafeSkin.moth()` sends a moth to loop round Pour's hanging lamp and Paw's floor lamp for 9 s every 25–50 s.
  - **Biscuit:**
    - In Pour he flicks an ear or opens an eye in his sleep, glances at whatever is passing, and wakes briefly at a flash.
    - In Rain he watches the street when no drop is near, flicks his ears, and blinks.
    - In Paw he looks to the window while the fish is far out, and flicks his ears.
  - **Out of the way:** street life is dim and stays in the windows. In Rain it stays above the drops' landing lane.

### Not plug-and-play

1. **The shell's cue can't take the scene's perspective.** `api.cue` draws a round ring, but here the cue lies flat on the counter and the sill. A `squash` argument (or `cueAt` returning `{ x, y, squash }`) would have let all three games use the shell's cue. As it is, the skin carries its own `cue()`.
2. **The shell's gold is `Skin.colors.yellow`, which is close to this skin's tier-1 amber.** The perfect cue needs a gold that stands out from every tier colour. A `theme.perfect` (or `Skin.colors.perfect`) would let a warm skin choose one.
3. **Long labels still cut off in pocket-mini.** "autopilot · tap to take over" is cut off in the HUD at 300 px wide. That is the shell's wording, so I left it.
