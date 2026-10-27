# Working on flow-engine

Every change goes through a pull request; `main` only moves by merging one.

1. Branch from `main` (`git switch -c flipper-fall`).
2. Keep the change small: touch the lines the fix needs, not the whole game.
3. Push and open a pull request. Two things happen on their own:
   - **CI** runs the engine tests and plays every game headless for a few seconds (`npm test`, `npm run smoke`).
   - **A preview** of the whole site goes up at `https://kyleillgen.github.io/flow-engine/pr-preview/pr-<number>/`, linked in a comment on the PR, so the change can be played before it's merged.
4. Play the preview. Merge if it's better, close the PR if it isn't; either way `main` stays good. The preview is removed when the PR closes.

The live site is `https://kyleillgen.github.io/flow-engine/`, rebuilt from `main` on every merge.

Before opening a PR, check the change against the design rules in [docs/flow-science-check.md](docs/flow-science-check.md): never end the game, never get harder over time, keep things landing on the beat.
