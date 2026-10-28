# flow-engine

Rhythm micro-games for the gaps: the minute while code builds or an AI assistant works. The music settles into your own tempo, you can't lose, nothing speeds up, and it plays itself when you look away. **[Play in your browser](https://kyleillgen.github.io/flow-engine/)**

## Play it

**Flow Pocket** is a tiny always-on-top window for Windows that plays games from cartridges and lights up when your assistant finishes. Setup is in [pocket/README.md](pocket/README.md).

To set it up from Claude Code or Codex CLI, paste this:

```text
Set up Flow Pocket from github.com/kyleillgen/flow-engine: clone it, follow pocket/README.md,
add the hooks for this assistant, and launch it.
```

## Build on it

| Layer | What it is |
|---|---|
| `engine/` | Tempo matching, music, streak and tiers, pacing, autopilot, Flow and Fidget. One file, no dependencies. |
| `shell/` | The body around a game: HUD, input, scoring, pause and keys. `space-shell.js` is the one to start from. |
| `skins/` | The look. |
| `games/` | One HTML file per game. The header comment of each says how it plays. |
| `carts/` | Cartridges: themed packs of up to six games, 512 KB at most. `npm run cart` lists the commands. |
| `pocket/` | The desktop window. |

To make a game, copy `games/template.html` and answer five questions. [docs/build-on-the-engine.md](docs/build-on-the-engine.md) has the rules and a prompt to paste into any AI assistant.

## Why it works

The design follows research on flow and attention: [docs/flow-engine-research.md](docs/flow-engine-research.md), checked change by change in [docs/flow-science-check.md](docs/flow-science-check.md).

## Checks

- `npm test`: the engine's tests.
- `npm run smoke`: every game in a headless browser.
- `npm run cart check` and `npm run cart play <id>`: a cartridge's rules and its size, drawing time and memory.

MIT. The bundled fonts (Oswald, Inter) are under the SIL Open Font License 1.1.
