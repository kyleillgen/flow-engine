# Working on flow-engine

There are two copies of the site:

| | Branch | Link |
|---|---|---|
| **Live** | `main` | https://kyleillgen.github.io/flow-engine/ |
| **Try** | `next` | https://kyleillgen.github.io/flow-engine/next/ |

Work in progress goes to `next`, which deploys to the Try link (marked "Try build" on every page). Once it plays better, `next` is merged into `main` and goes live. If it doesn't, `next` is reset to `main` and the live site never sees it.

`main` is protected: it only moves by a pull request from `next` (or a fix branch) that passes CI.

Before anything goes to the Try link:

1. Keep the change small: touch the lines the fix needs, not the whole game. Tune a number before redesigning a mechanic.
2. Run `npm test` and `npm run smoke` (CI runs both too).
3. Play it, side by side with the live version, and check it against the design rules in [docs/flow-science-check.md](docs/flow-science-check.md): never end the game, never get harder over time, keep things landing on the beat.

Feel can't be tested automatically, so the last check is always someone playing the Try link.
