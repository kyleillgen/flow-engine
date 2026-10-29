# Flow Pocket

A small always-on-top desktop window for playing the flow-engine games beside your editor while code builds or an AI assistant works, without running a browser.

It runs on [Neutralinojs](https://neutralino.js.org), which uses the WebView2 engine already built into Windows 11 instead of bundling a browser. It's one borderless window with no tabs or extensions. Games draw at 0.75× resolution and pause their audio while hidden, and the launcher passes WebView2 a few options: one renderer process, GPU work in the main process, no background networking. Games draw at full speed only while you play; when one is playing itself, paused or left alone for a few seconds it drops to 20 frames a second. Measured on the author's machine with a game playing itself, the whole app used about 29% of one CPU core and 139 MB of private memory (350 MB working set) across 6 processes. Nothing loads from the network: the games, engine and fonts all ship inside it.

## Set up (once)

```bash
node pocket/setup.mjs
```

This downloads the Neutralino runtime from its official GitHub release, pinned to v6.10.0 (only the Windows exe is kept, as `pocket/flow-pocket.exe`, plus the 18 KB `neutralino.js` client), then installs the cartridges into `pocket/resources/carts`: every one in `carts/`, plus any `.cart` file you've put in `~/.flow-pocket/carts/`. Nothing is installed system-wide. The exe is not code-signed, which is normal for Neutralino releases.

After changing a game or adding a cartridge, run `node pocket/setup.mjs --sync`. A running pocket notices and reloads itself within a couple of seconds.

## Run

Double-click **`pocket/Flow Pocket.cmd`** (or pin a shortcut to it on the taskbar).

- **The cartridge button** (first on the second row) switches to the next cartridge; the strip takes its colours. The game buttons switch games within it, or press **1–6**. Each cartridge remembers the last game you played. The last one you played is remembered. The window itself wears the neon skin.
- **F** switches between Flow and Fidget.
- **Side / Corner / Mini** docks the window: a full-height column on the right edge, the bottom-right corner, or a small square. Drag or resize it and the new spot is remembered for that dock.
- **Pin** keeps the window on top (on by default; it re-asserts itself if Windows drops it).
- **The lamp** shows what Claude Code is doing, once the hooks below are set up, with a timer while it works.

## Play along with Claude Code

Tell the pocket when Claude starts, finishes or needs you:

- **You send a prompt:** the lamp turns yellow and starts timing. If the window was minimised, it comes back without taking the keyboard.
- **Claude finishes:** the lamp blinks green, a chime plays and a "Claude is done" callout appears. The game goes to autopilot and the music winds down, so there's a natural place to switch back.
- **Claude needs you** (a permission prompt or a question): the same cue, in red.

Add these hooks to `~/.claude/settings.json`, merged into any `hooks` you already have (use the path to your own clone):

```json
{
  "hooks": {
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "node /path/to/flow-engine/pocket/signal.mjs start", "async": true, "timeout": 5 }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "node /path/to/flow-engine/pocket/signal.mjs done", "async": true, "timeout": 5 }] }],
    "Notification": [{ "hooks": [{ "type": "command", "command": "node /path/to/flow-engine/pocket/signal.mjs needs", "async": true, "timeout": 5 }] }]
  }
}
```

`signal.mjs` writes one line to `~/.flow-pocket/signal`, which the app reads every 1.5 s. The script swallows its own errors, so it can't slow down or break Claude Code. Any other tool can use the same file; for a build script, add `node pocket/signal.mjs done` at the end.

## Tuning from your own sessions

Each Flow-style session's numbers are logged to `~/.flow-pocket/sessions.log` (Fidget sessions aren't): steadiness, timing, misses, slowing after a miss, autopilot time and flow-check answers. Run:

```bash
node pocket/report.mjs --days 7
```

It summarises each game and flags anything out of range, naming the knob to adjust. The loop is described in [docs/tuning.md](../docs/tuning.md).

## Files

| File | What it is |
|---|---|
| `neutralino.config.json` | Window settings, a fixed local port (41823, below the ranges Windows reserves for Hyper-V and WSL) and the short list of native calls the app may use |
| `resources/index.html` | The launcher: game switcher, dock, pin, Claude lamp, and the game in a frame |
| `setup.mjs` | Downloads the runtime and installs the cartridges |
| `signal.mjs` | Writes the signal for Claude Code hooks or build scripts |
| `report.mjs` | The tuning report from `sessions.log` |
| `Flow Pocket.cmd` | Starts the app |
| `flow-pocket.exe`, `bin/`, `resources/{carts,js}/` | Downloaded or installed by setup; not in git |
