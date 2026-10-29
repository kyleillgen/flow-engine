#!/usr/bin/env node
// One-time setup for Flow Pocket on Windows, and a re-sync after the games change.
//   node pocket/setup.mjs          download the runtime (if missing) and install the cartridges
//   node pocket/setup.mjs --sync   only install the cartridges
//
// Downloads, from the official Neutralinojs GitHub releases, pinned to v6.10.0:
//   neutralinojs-v6.10.0.zip (8.1 MB; only neutralino-win_x64.exe is extracted)
//   neutralino.js (18 KB, the client library)
// Nothing else is fetched, and nothing is installed system-wide: the app uses the WebView2
// runtime that ships with Windows 11.
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { cartFiles, unpackTo } from "../carts/cart.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const VERSION = "6.10.0";
// The runtime treats the folder its exe sits in as the app folder (v6 has no --path flag),
// so the exe lives here beside neutralino.config.json; the zip is kept in bin/
const BIN = join(HERE, "bin");
const EXE = join(HERE, "flow-pocket.exe");
const RES = join(HERE, "resources");

// The pocket plays cartridges. Each one is installed into resources/carts/<id>/ in the repo's
// layout, so its games' relative script paths work unchanged: every cartridge in carts/, then any
// .cart file dropped into ~/.flow-pocket/carts/ (a dropped one with the same id wins). The
// launcher reads the list from resources/carts/index.js.
const ROOT = join(HERE, "..");
const FIRST = "space"; // the cartridge the shelf starts with
export function syncCarts({ dropped: withDropped = true } = {}) {
  const out = join(RES, "carts");
  rmSync(out, { recursive: true, force: true });
  // Copies from before cartridges, no longer used
  for (const d of ["engine", "shell", "skins", "games"]) rmSync(join(RES, d), { recursive: true, force: true });
  const carts = new Map();
  for (const id of readdirSync(join(ROOT, "carts"))) {
    if (!existsSync(join(ROOT, "carts", id, "cart.json"))) continue;
    const { cart, files } = cartFiles(id);
    for (const f of files) {
      mkdirSync(dirname(join(out, id, f)), { recursive: true });
      copyFileSync(join(ROOT, f), join(out, id, f));
    }
    carts.set(cart.id, cart);
  }
  const dropped = join(homedir(), ".flow-pocket", "carts");
  if (withDropped && existsSync(dropped)) {
    for (const f of readdirSync(dropped).filter((f) => f.endsWith(".cart"))) {
      try {
        const tmp = join(out, ".unpack");
        const cart = unpackTo(join(dropped, f), tmp);
        if (!/^[a-z][a-z0-9-]*$/.test(cart.id || "")) throw new Error("bad id");
        rmSync(join(out, cart.id), { recursive: true, force: true });
        renameSync(tmp, join(out, cart.id));
        carts.set(cart.id, cart);
      } catch (e) {
        console.log(`skipped ${f}: ${e.message}`);
      }
    }
  }
  const list = [...carts.values()].sort((a, b) => (a.id === FIRST ? -1 : b.id === FIRST ? 1 : a.name.localeCompare(b.name)));
  const index = list.map(({ id, name, blurb, colors, games }) => ({ id, name, blurb, colors, games }));
  writeFileSync(join(out, "index.js"), "window.POCKET_CARTS = " + JSON.stringify(index, null, 1) + ";\n");
  console.log(`cartridges installed into pocket/resources/carts: ${list.map((c) => c.name).join(", ")}`);
  // Tell a running pocket to reload itself, so updated games show without restarting it
  try {
    const dir = join(homedir(), ".flow-pocket");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "reload"), String(Date.now()));
    console.log("a running Flow Pocket will reload within a couple of seconds");
  } catch (e) {}
}

async function download(url, to) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(to, buf);
  console.log(`${url}\n  -> ${to} (${(buf.length / 1e6).toFixed(2)} MB, sha256 ${createHash("sha256").update(buf).digest("hex")})`);
}

// The runtime and its client library, downloaded once
export async function fetchRuntime() {
  mkdirSync(BIN, { recursive: true });
  if (!existsSync(EXE)) {
    const zip = join(BIN, `neutralinojs-v${VERSION}.zip`);
    if (!existsSync(zip)) {
      await download(`https://github.com/neutralinojs/neutralinojs/releases/download/v${VERSION}/neutralinojs-v${VERSION}.zip`, zip);
    }
    // Windows' own tar (bsdtar, Windows 10+) reads zips; a Git Bash tar on PATH would
    // mistake "D:" for a remote host, so call the system one by full path
    const winTar = join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe");
    execFileSync(existsSync(winTar) ? winTar : "tar", ["-xf", zip, "-C", BIN, "neutralino-win_x64.exe"]);
    renameSync(join(BIN, "neutralino-win_x64.exe"), EXE);
    rmSync(zip);
    console.log("extracted flow-pocket.exe");
  }
  mkdirSync(join(RES, "js"), { recursive: true });
  const client = join(RES, "js", "neutralino.js");
  if (!existsSync(client)) {
    await download(`https://github.com/neutralinojs/neutralino.js/releases/download/v${VERSION}/neutralino.js`, client);
  }
}

// Run directly (package.mjs imports it instead)
if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase()) {
  (process.argv.includes("--sync") ? Promise.resolve() : fetchRuntime())
    .then(() => syncCarts())
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
