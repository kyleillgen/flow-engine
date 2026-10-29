# Build your own little game on the flow engine

You bring one idea: a thing that happens on the beat and one action the player repeats. The engine and shell bring everything that makes it feel good:

- The music settles into the player's own rhythm.
- Every action is a note in key.
- Nothing can be lost, and nothing gets harder over time.
- It plays itself when you stop, then winds the music down.

All of that comes with pause, settings, keyboard and touch input, and measurement on the device.

A whole game is one HTML file that loads three scripts and fills in a few functions. [`games/template.html`](../games/template.html) (Drop Catch) is the smallest complete example at about 100 lines; [`games/word-rain.html`](../games/word-rain.html) is a fuller one.

## The layers

| Layer | File | What it owns | You touch it? |
|---|---|---|---|
| **Engine** | `engine/flow-engine.js` | Rhythm and music: tempo matching, lock and re-sync, Flow's synth, notes on the grid, timing calibration, streak and tiers, assist, pacing, autopilot, wind-down, measurement | No |
| **Shell** | `shell/flow-shell.js` | Everything around a game: header, attract mode, pause and keys screens, standard keys, tap / mash / hold input, Flow and Fidget, scoring, table modes, intensity, canvas and frame loop, callouts, particles | No |
| **Skin** | `skins/pinball/pinball-skin.js` (+ `fonts/`) | The look: a 70s pinball machine drawn clean. Black backbox with a 7-segment score, insert-light meter, cream buttons with soft shadows, Oswald type, chaser bulbs, and shared playfield parts (`bumper`, `star`) | Only to make a new skin |
| **Game** | `games/your-game.html` | What appears, how it moves, what the player does, what counts, how it looks | Yes, only this |

## The built-in rules (you can't break them)

These hold in every game because the engine and shell enforce them, not because each game remembers to:

1. **You can't lose.** `api.miss()` steps the streak down by a quarter. Nothing ends the game.
2. **Autopilot never scores and never costs.** `score()` and `miss()` are ignored while it's on, and the two misses after taking control back are forgiven.
3. **The tempo never jumps.** It moves no more than 3% a bar while matching and 1.5% a bar when re-matching, and it holds still once locked and during autopilot.
4. **Nothing gets harder on its own.** The pacer only follows the player: their own handling speed, plus room when their clean rate drops. Difficulty changes only when the player picks an intensity (chill, normal, intense); within a session it never ramps.
5. **Help is invisible.** `api.eng.assist` should only widen margins on things not yet on screen. The template shows how.
6. **Every action is a note** in key, snapped to the 16th grid. During calibration the snapped note is held back so it can't bias timing.
7. **Stopping is free.** Settings, tempo and best score persist, and autopilot gives a soft landing.

## The five questions a game answers

| Question | Hook | Notes |
|---|---|---|
| What appears on the beat? | `onBeat(n, api)` | Spawn when `api.eng.paceBeats()` beats have passed. It lands, arrives or matters at `n + k` beats |
| How does it move? | `update(dt, api)` | Position = a function of `api.eng.beatPos()`, so motion rides the music and lands on beats |
| What does the player do? | `onAction(api, e)` (taps) or `onLetter(ch, api)` (typing) | Call `api.eng.tap({ height })` on every action. Height 0 is a high note and 1 a low one |
| What counts? | `api.score(1, "PERFECT" \| "CLEAN", handleSec)` / `api.miss()` | `handleSec` (how long the player took) feeds the pacer |
| How does it look? | `draw(ctx, api, t)` | The shell draws particles and callouts on top. Use `api.cached()` for gradients |

Plus `autopilot(dt, api)`: what the game does by itself when the player stops. The same function runs **attract mode**: until the first input, the game plays itself under a marquee of its `title` and `hint`, like a pinball table on show. There's no start card or rules screen. The first tap or key starts the sound and is also a move. Teach the rest in context with `api.hint(id, text)`, a tip shown once ever (after attract mode), when it becomes relevant (for example, after the first miss). Use `api.ring(x, y, color, size)` for perfect moments.

The shell also runs the reward loop and the variety for every game:
- **Score:** 100 a hit, doubled for perfect, times a combo multiplier (×1 to ×5; a miss steps it down one level, never back to ×1, and never takes a Jackpot away), scaled by intensity. `api.bonus(points)` awards extra, for example a star.
- **Replay score:** one per game and intensity. Beating it gives "REPLAY!" and the target creeps up 15% for future runs. If it keeps going unbeaten, it eases back down. There's also a high score per intensity.
- **Lifetime rank,** shared by all games, from Rookie to Legend. Each rank gives a new ball finish via `api.ballStops()`.
- **Intensity:** `api.intensity` and `api.pick({ chill, normal, intense })` let a game scale its own density and demands. The shell scales the pacer.
- **Flow or Fidget:** the player's choice (header chip or `\`). Fidget turns a game into a toy, and the rule is that the world bends to the player's hands rather than the hands fitting the world: in `onAction`, check `api.style === "fidget"` and make the press always succeed (Orbit puts the next bumper wherever the ball is heading, Word Rain types the right letter whatever key you hit). Three gestures should each feel different: a slow press, mashing (`api.rev`, 0 to 1), and holding then letting go (`api.held` while down, `onRelease(api, heldSec)` after). The rules are the engine's, so every shell gets the same Fidget (`eng.setStyle`, `eng.press`, `eng.release`, `eng.fidgetIdle`, `eng.rev`; see docs/flow-engine.md): it plays the sound for each gesture (a ringing note on press, climbing staccato when mashing, a soft clack on release) and lets autopilot fill in only after 4 s untouched. The shell shows it: the switch, and the meter as a pressing-speed gauge. Fidget still travels: the tiers (colours, music) climb with presses and slowly with time, and the game's own modes (`modes: [...]`) still pop in, though nothing scores or misses and there are no tips. Switching back to Flow is a handover: the tier reached settles one step every four bars unless the streak holds it, and the first three misses are forgiven.
- **Hold shots (in both styles):** a tap is the rhythm; a hold then release is a trick shot that's purely for fun, so it never scores or costs. `api.charge` (0 to 1) fills while held, so draw it (an arc closing round the ball is the house look, gold at full charge), and `onRelease(api, heldSec)` with `api.chargeOf(heldSec)` fires it. A full charge should do something extra. In Orbit (Fidget) it's a sling: the ball whips round and lets go when it faces up the table. In Flow // Resonance it's a boost along the way the craft is heading, looping the loop on a full charge. In Word Rain (hold Space) it's a gust that lifts the falling words.
- **Table modes:** a 20-second twist every 45–75 seconds of play. The built-ins are Double Score, Hurry-Up and Jackpot; list your own in `modes: [...]`, then read `api.mode` when spawning (Orbit's Star Lane, Word Rain's Golden Words). Optional: `setup`, `resize`, `start`, `onKey`, `onPhrase`, `tierNames`, `colors`, `engine` options.

## Cartridges, and the space shell's shortcuts

A cartridge is a themed pack of up to six games for Flow Pocket: `node carts/cart.mjs new <id> "<Name>"` writes `carts/<id>/cart.json`, a build log and a working starter game in `carts/<id>/games/`. Add `--skin <file>` and `--shell <file>` to start from another look. Then `check` (rules and size), `play` (drawing time, memory and CPU, headless), `shots` (phone, desktop, top-tier and pocket-size screenshots in `dist/shots/<id>/`) and `npm run smoke -- <id>`.

**The budget.** The pocket sits beside your work all day, so a cartridge has to stay quiet:

| | Limit | Checked by |
|---|---|---|
| Size | 512 KB unpacked, no images, audio or network | `check` |
| Drawing | 4 ms a frame | `play` |
| Memory | 48 MB of heap | `play` |
| CPU while it plays itself | 45% of one core for the page and GPU, at the pocket's size and 30 frames a second | `play` |

The engine and space shell do most of the work: 60 frames a second while you play, 30 while the game plays itself and 10 after ten minutes untouched, a governor that steps the rate down when frames get heavy or the machine is busy, sleeping between frames, and after a minute without input the music fades out and stops. Every game measured 21-36% headless when the limit was set. The usual way over the CPU limit is a CSS animation that never stops (it keeps the browser repainting at any frame rate) or drawing that runs outside the shell's frame loop.

On the space shell (`shell/space-shell.js`):
- **`api.track({ spawn, hit, miss, note })`** runs the whole arrive-on-the-beat loop: spawning at the pacer's rate, judging, scoring, misses, autopilot and Fidget. `onFire: () => things.fire()` is all a tap needs. The starter game shows it in about 80 lines. For games that need more:
  - `ready(thing, now)` says when Fidget may take a thing (so it never grabs one still hidden or off screen); `ready: false` leaves Fidget presses to your `onFire`.
  - `hit` gets `{ perfect, ghost, fidget }` and may return `{ x, y }` for the points pop; `miss(thing, counted)` says whether the miss cost the streak.
  - `keep(thing, now)` keeps finished things in the list while it returns true (a lantern until it floats off screen); a number keeps them that many beats.
  - `ahead` can be a function, read at each spawn, for a lead that depends on screen width.
  - After a hit or miss, `state` is yours to rename; the tracker only reads `"wait"`.
- **`mount({ skin, theme, words, marquee })`** takes any skin object. `theme` sets the HUD, pause card and flow check's colours and type through CSS variables (`head` and `body` fonts, `headCase`, `headGlow`, `marqueeTop`, `strike`); `words` sets the keys card's `fire`, `charge` and `auto` wording. Both can live on the skin, so a new look doesn't need a copy of the shell.
- **`api.hit(quality, handleSec, x, y)`** pops the points at (x, y); **`api.drawCharge(x, y, r, color, full)`** draws the hold's charge arc, in your colours if you pass them.
- `?tier=4` previews a tier; `shots` holds it with autopilot. `npm run smoke` finds Edge or Chrome by itself, or set `BROWSER`.
- The engine's `track`, `voice`, `minBpm`, `lofi` and `rain` options set a game's music (see docs/flow-engine.md).

## Prompt kit

Paste this into Claude or any AI assistant (the site's **Make your own game** button copies the same thing). It gets the files, asks what game you want, and builds it with you:

```text
Help me make a small rhythm game on Flow Engine: https://github.com/kyleillgen/flow-engine

1. Get the files first.
   - If you can run commands, clone the repo and work in it.
   - If you can only browse, read these three:
     https://raw.githubusercontent.com/kyleillgen/flow-engine/main/docs/build-on-the-engine.md (the rules)
     https://raw.githubusercontent.com/kyleillgen/flow-engine/main/carts/starter.html (the starting point)
     https://raw.githubusercontent.com/kyleillgen/flow-engine/main/games/bloom.html (a finished game)
   Read the rules before anything else.

2. Before writing any code, ask me what game I want, one question at a time:
   - What arrives on the beat, and what do I do as it arrives?
   - What's the world and the mood (space, a cafe, the deep sea, something else)?
   - Is there a character I should meet?
   If I'm not sure, offer three short ideas to pick from.

3. Build it as one HTML file on the space shell, keeping the engine's promises:
   - things arrive on whole beats, at least two apart, and move only with the beat;
   - nothing gets harder over time, and I can't lose;
   - it plays itself calmly when I stop (autopilot);
   - in Fidget (the F key) every press lands.
   Don't edit engine/, shell/ or skins/. Keep it light: it runs beside real work.

4. Let me play it.
   - If you can run commands: start a cartridge with npm run cart new <id> "<Name>", make its
     starter game into mine, run npm run cart check and npm run smoke -- <id>, then serve the
     repo with python -m http.server 4180 and give me the link
     (http://localhost:4180/carts/<id>/games/<id>.html).
   - Otherwise: give me the whole file, and tell me to save it in carts/<id>/games/ in a
     downloaded copy of the repo and open it the same way.
```

## Choosing engine options

| Kind of action | `engine` options |
|---|---|
| A tap a beat (Flow, Drop Catch) | defaults |
| Typing (Word Rain) | `perBeat: [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4], minMs: 60, maxMs: 900, stableTol: 2.5, idleSec: 4, phaseFollow: false` |
| Slow, deliberate moves (one every two beats) | `perBeat: [0.25, 0.5, 1]` |
| Something that needs thinking time | raise `idleSec` so autopilot doesn't cut in while the player is thinking |

## Checking a new game

1. Run `npm test` (or `node --test tests/`). All tests should pass; the engine itself didn't change.
2. Open the game from a local server (for example `python -m http.server 4180` in the repo), then:
   - Play steadily for 20 seconds: the label should reach "In sync".
   - Stop for a few seconds: autopilot takes over and the streak doesn't move.
   - Press Esc to pause and resume.
   - Check a phone-width window: the header fits.
3. Optional: `flowTelemetry()` in the console shows the session's measurements.
