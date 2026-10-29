#!/usr/bin/env node
// Builds the one-download Flow Pocket for Windows: dist/Flow-Pocket-windows.zip, a folder that
// runs as soon as it's unzipped, with no Node, git or install step.
//   node pocket/package.mjs
//
// It holds the Neutralino runtime, the launcher, every cartridge in carts/ (not the ones dropped
// into ~/.flow-pocket/carts/), and signal.mjs for the Claude Code lamp. The release workflow runs
// this on a version tag and attaches the zip to the GitHub release.
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { fetchRuntime, syncCarts } from "./setup.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, "..", "dist");
const NAME = "Flow Pocket";
const OUT = join(DIST, NAME);
const ZIP = join(DIST, "Flow-Pocket-windows.zip");

const README = `Flow Pocket
===========

Rhythm micro-games in a small always-on-top window, for the minute while code builds or an
AI assistant works. You can't lose, nothing speeds up, and it plays itself when you look away.

Start it: double-click "Flow Pocket.cmd".

The first time, Windows may say "Windows protected your PC" because the app isn't code-signed.
Click "More info", then "Run anyway".

Keys: Space or click to play. F switches between Flow and Fidget (every press lands).
\` cycles chill, normal and intense. 1-6 pick a game.

Light up when Claude Code finishes (needs Node, which Claude Code already uses): add hooks that
run  node "<this folder>\\signal.mjs" start | done | needs.  The full setup is at
https://github.com/kyleillgen/flow-engine/blob/main/pocket/README.md

Everything runs offline. Settings and scores live in %USERPROFILE%\\.flow-pocket.
`;

await fetchRuntime();
syncCarts({ dropped: false });

rmSync(DIST, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const f of ["flow-pocket.exe", "neutralino.config.json", "Flow Pocket.cmd", "signal.mjs"]) copyFileSync(join(HERE, f), join(OUT, f));
for (const d of ["js", "carts"]) cpSync(join(HERE, "resources", d), join(OUT, "resources", d), { recursive: true });
for (const f of ["index.html", "icon.png"]) copyFileSync(join(HERE, "resources", f), join(OUT, "resources", f));
writeFileSync(join(OUT, "README.txt"), README.replace(/\n/g, "\r\n"));

// Windows' own tar (bsdtar) writes a zip when the name ends in .zip
const winTar = join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe");
execFileSync(existsSync(winTar) ? winTar : "tar", ["-a", "-c", "-f", ZIP, "-C", DIST, NAME]);
console.log(`${ZIP} (${(statSync(ZIP).size / 1e6).toFixed(1)} MB)`);
