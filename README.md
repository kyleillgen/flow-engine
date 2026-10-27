# flow-engine

A tiny engine for rhythm micro-games you play in the gaps: the 30 seconds to 3 minutes while code compiles or an AI assistant works. It's built to help you settle into a flow-like state and keep your head clear, not to grab your attention.

- **It finds your rhythm.** The engine listens to how you naturally tap, eases the music toward that tempo, and locks in. Every action plays a note in key.
- **You can't lose.** A miss steps your streak down a little; nothing ends the game.
- **Nothing gets harder over time.** Depth comes from music, colour and tiers, never from speed-ups.
- **It plays itself when you stop**, so you can look away and come back without penalty.
- **Fidget or Flow.** Flow is the game; Fidget turns it into a toy where every press works, mashing climbs, and holding then letting go fires a trick shot.

The design rests on a research brief ([docs/flow-engine-research.md](docs/flow-engine-research.md)) and a check of every change against it ([docs/flow-science-check.md](docs/flow-science-check.md)).

## The games

All four are one-button and pinball-themed. Press **F** to switch between Flow and Fidget, hold and let go for a trick shot.

| Game | What you do |
|---|---|
| **Flow** (`games/flow.html`) | The original, by Gemini. Tap a steady rhythm and the craft flies a ribbon through the pillars. Hold for a boost; a full charge loops the loop. |
| **Orbit** (`games/orbit.html`) | A steel ball circles a pop bumper. Fling it as it crosses the lit arrow and the next bumper up the table catches it. In Fidget, hold to wind up a sling. |
| **Flipper** (`games/flipper.html`) | One button, both flippers. Flip as the ball lands to send it ricocheting through the drop targets and bumpers. Hold to cradle, let go for the orbit shot. |
| **Ricochet** (`games/ricochet.html`) | A ball climbs a shaft between two rubber walls. Kick as it reaches a wall and it springs across, higher every time. Hold to grip, let go for a super jump. |

Also included: **Word Rain** (`games/word-rain.html`), a typing game, and **Drop Catch** (`games/template.html`), the smallest complete game to copy.

## Play

Serve the folder and open a game:

```bash
python -m http.server 4180
```

Then go to http://localhost:4180/games/flow.html. Everything is plain HTML and JavaScript with no build step, no dependencies and no network requests (the fonts ship in `skins/pinball/fonts`).

## Make a game

Copy `games/template.html`, then answer five questions: what appears on the beat, how it moves, what the player does, what counts, and how it looks. [docs/build-on-the-engine.md](docs/build-on-the-engine.md) explains the layers and the built-in rules, and has a **prompt kit**: paste it into any AI coding assistant with the template, add one sentence of idea, and you get a game that already has the music, tempo matching, scoring, Fidget mode, pause, keys and autopilot.

## Layout

```
engine/         flow-engine.js: tempo matching, lock and re-sync, the synth, pacing, the rules
shell/          flow-shell.js: header, input (tap, mash, hold), Flow and Fidget, scoring, modes
skins/pinball/  pinball-skin.js and its fonts: the look (more skins can sit beside it)
games/          the games, one HTML file each
pocket/         Flow Pocket, a small always-on-top desktop window for playing beside your work
docs/           how to build on it, the research, the science check, tuning
tests/          contract tests for the engine (npm test)
```

## Flow Pocket (Windows)

A light desktop window (Neutralino on the WebView2 built into Windows 11, about 160 MB in all versus several hundred for a browser) that sits on top of your editor, switches games with **1–4**, and can light up when Claude Code starts, finishes or needs you. See [pocket/README.md](pocket/README.md).

## Tests

```bash
npm test
```

The engine's controller is pure, so the tests drive it at a simulated 60 fps with scripted taps: tempo matching, folding half- and double-time tappers into the band, lock and re-sync limits, autopilot, misses and the pacer.

## License

MIT. The bundled fonts (Oswald, Inter) are under the SIL Open Font License 1.1.
