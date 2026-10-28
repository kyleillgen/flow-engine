# Working on flow-engine

`main` is the live site, https://kyleillgen.github.io/flow-engine/, and it only moves by a pull request that passes CI. Work on a branch and open a pull request to `main`.

Before opening one:

1. Keep the change small: touch the lines the fix needs, not the whole game. Tune a number before redesigning a mechanic.
2. Run `npm test` and `npm run smoke` (CI runs both too). For a cartridge, also `npm run cart check` and `npm run cart play <id>`.
3. Play it, and check it against the design rules in [docs/flow-science-check.md](docs/flow-science-check.md): never end the game, never get harder over time, keep things landing on the beat.

Feel can't be tested automatically, so the last check is always someone playing it.
