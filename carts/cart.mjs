#!/usr/bin/env node
// Cartridges: a themed pack of games for Flow Pocket (or any browser), in one small file.
//
//   node carts/cart.mjs new <id> "<Name>" [--shell <file>] [--skin <file>]
//                                           start a cartridge: cart.json, BUILD-LOG.md and a
//                                           working starter game in carts/<id>/games/
//   node carts/cart.mjs check [<id>]        the rules and the size budget (every cartridge if no id)
//   node carts/cart.mjs play <id>           plays each game headless and measures it against the budget
//   node carts/cart.mjs shots <id>          screenshots of each game (phone, desktop, top tier, pocket sizes) in dist/shots/<id>/
//   node carts/cart.mjs pack <id>           writes dist/<id>.cart (a zip, laid out like the repo)
//   node carts/cart.mjs unpack <file> <dir> unpacks a .cart (what the pocket's setup does)
//
// A cartridge is carts/<id>/cart.json:
//   { "id", "name", "version", "engine": 1, "blurb", "colors": [accent, accent2],
//     "files": [shell, skin, fonts... (paths from the repo root)],
//     "games": [{ "file": "carts/<id>/games/x.html", "label": "X", "hint": "one line" }] }
// A cartridge's own games live in carts/<id>/games/ (older ones in games/ still work), and each
// uses its own storage key (the `key` it mounts with), so cartridges never collide.
// The engine, the icon and every game come along automatically. Packed, it keeps the repo's
// layout, so the games' relative script paths work unchanged inside it.
//
// The budget (so a cartridge stays almost silent beside real work):
//   size  512 KB or less, everything included, unpacked. No images beyond the icon, no audio files,
//         nothing loaded from the network.
//   draw  4 ms or less of drawing a frame on average, measured headless at the pocket's 0.75x.
//         Headless numbers are a guide, not a measurement of your machine.
//   heap  48 MB or less of JavaScript heap while playing.
//   games 1 to 6 (the pocket's number keys).
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from "node:fs";
import { dirname, join, extname, normalize, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import zlib from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// idleCpu: percent of one core for a game's page and GPU work while it plays itself in the
// pocket's frame at the default 30 frames a second, measured headless. Every game measured 21-36
// when this was set. See docs/build-on-the-engine.md.
const BUDGET = { bytes: 512 * 1024, drawMs: 4, heapMB: 48, games: 6, idleCpu: 45 };
const ALWAYS = ["engine/flow-engine.js", "icon.png"];
const FORBIDDEN_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp3", ".ogg", ".wav", ".m4a", ".mp4", ".webm"];

const read = (id) => {
  const p = join(ROOT, "carts", id, "cart.json");
  if (!existsSync(p)) throw new Error(`no cartridge "${id}" (looked for carts/${id}/cart.json)`);
  return JSON.parse(readFileSync(p, "utf8"));
};
const filesOf = (cart) => [...new Set([...ALWAYS, ...(cart.files || []), ...cart.games.map((g) => g.file)])];
// The files a cartridge carries, for the pocket's setup
export const cartFiles = (id) => {
  const cart = read(id);
  return { cart, files: filesOf(cart) };
};
const kb = (n) => (n / 1024).toFixed(0) + " KB";

// ---- check ------------------------------------------------------------------------------------
function check(id) {
  const cart = read(id);
  const problems = [];
  if (cart.id !== id) problems.push(`cart.json id is "${cart.id}", folder is "${id}"`);
  for (const k of ["name", "version", "engine", "games"]) if (!cart[k]) problems.push(`cart.json has no "${k}"`);
  if (!Array.isArray(cart.games) || !cart.games.length || cart.games.length > BUDGET.games) problems.push(`needs 1 to ${BUDGET.games} games`);
  const files = filesOf(cart);
  let bytes = 0;
  for (const f of files) {
    const p = join(ROOT, f);
    if (!existsSync(p)) {
      problems.push(`missing file ${f}`);
      continue;
    }
    bytes += statSync(p).size;
    if (FORBIDDEN_EXT.includes(extname(f).toLowerCase()) && f !== "icon.png") problems.push(`${f}: no images or audio files (draw it in code)`);
  }
  for (const g of cart.games) {
    if (!g.label || !g.hint) problems.push(`${g.file}: give it a "label" and a "hint"`);
    if (!existsSync(join(ROOT, g.file))) continue;
    const html = readFileSync(join(ROOT, g.file), "utf8");
    // Every script the game loads must be in the cartridge
    for (const m of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) {
      const src = m[1];
      if (/^(https?:)?\/\//.test(src)) {
        problems.push(`${g.file}: loads ${src} from the network`);
        continue;
      }
      const resolved = normalize(join(dirname(g.file), src)).replace(/\\/g, "/");
      if (!files.includes(resolved)) problems.push(`${g.file}: loads ${resolved}, which isn't in the cartridge's "files"`);
    }
    // Nothing fetched at run time
    const code = html.replace(/<meta[^>]*>/g, "");
    if (/\bfetch\s*\(|XMLHttpRequest|\bimport\s*\(|new\s+WebSocket|https?:\/\/(?!www\.w3\.org)/.test(code)) problems.push(`${g.file}: reaches for the network (fetch, XHR, import(), WebSocket or an http URL)`);
    // Its storage key (scores, tempo, settings), which must be its own
    const key = (code.match(/\bkey:\s*["']([^"']+)["']/) || [])[1];
    if (key) keys.push({ key, file: g.file });
  }
  if (bytes > BUDGET.bytes) problems.push(`size ${kb(bytes)} is over the ${kb(BUDGET.bytes)} budget`);
  return { cart, files, bytes, problems, keys };
}
const keys = [];
// Two games (in any cartridges) mounting with the same key would share scores and settings
function sharedKeys() {
  const seen = new Map(), clashes = [];
  for (const { key, file } of keys) {
    const other = seen.get(key);
    if (other && other !== file) clashes.push(`storage key "${key}" is used by both ${other} and ${file}`);
    seen.set(key, file);
  }
  return [...new Set(clashes)];
}

function report(id) {
  const r = check(id);
  console.log(`${r.problems.length ? "FAIL" : "ok  "} ${id}: ${r.cart.name}, ${r.cart.games.length} games, ${r.files.length} files, ${kb(r.bytes)} of ${kb(BUDGET.bytes)}`);
  for (const p of r.problems) console.log("     " + p);
  return r.problems.length === 0;
}

// ---- pack / unpack: a plain zip, written and read with node's own zlib --------------------------
function zip(entries) {
  const locals = [], centrals = [];
  let off = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name), comp = zlib.deflateRawSync(e.data), crc = zlib.crc32(e.data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(8, 8);
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(comp.length, 18);
    h.writeUInt32LE(e.data.length, 22);
    h.writeUInt16LE(name.length, 26);
    locals.push(h, name, comp);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(8, 10);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(comp.length, 20);
    c.writeUInt32LE(e.data.length, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(off, 42);
    centrals.push(c, name);
    off += 30 + name.length + comp.length;
  }
  const cd = Buffer.concat(centrals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, end]);
}
export function unzip(buf) {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error("not a cartridge (no zip directory)");
  const n = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  const out = [];
  for (let i = 0; i < n; i++) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20), nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), loff = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    // A cartridge can only write inside its own folder
    if (isAbsolute(name) || normalize(name).startsWith("..") || name.includes("\\")) throw new Error(`refusing unsafe path in cartridge: ${name}`);
    const start = loff + 30 + buf.readUInt16LE(loff + 26) + buf.readUInt16LE(loff + 28);
    const data = buf.subarray(start, start + size);
    out.push({ name, data: method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data) });
    p += 46 + nlen + xlen + clen;
  }
  return out;
}
function pack(id) {
  if (!report(id)) throw new Error("fix the problems above before packing");
  const { files } = check(id);
  const entries = [{ name: "cart.json", data: readFileSync(join(ROOT, "carts", id, "cart.json")) }, ...files.map((f) => ({ name: f, data: readFileSync(join(ROOT, f)) }))];
  mkdirSync(join(ROOT, "dist"), { recursive: true });
  const out = join(ROOT, "dist", id + ".cart");
  const buf = zip(entries);
  writeFileSync(out, buf);
  console.log(`dist/${id}.cart: ${kb(buf.length)} packed`);
}
export function unpackTo(file, dir) {
  const entries = unzip(readFileSync(file));
  if (!entries.some((e) => e.name === "cart.json")) throw new Error("not a cartridge (no cart.json)");
  for (const e of entries) {
    const to = join(dir, e.name);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, e.data);
  }
  return JSON.parse(entries.find((e) => e.name === "cart.json").data.toString("utf8"));
}

// ---- a headless browser over a local server, for play and shots --------------------------------
async function browse() {
  const require = createRequire(import.meta.url);
  let puppeteer, full = true;
  try {
    puppeteer = require("puppeteer");
  } catch {
    full = false;
    try {
      puppeteer = require("puppeteer-core");
    } catch {
      throw new Error("this needs puppeteer: npm install --no-save puppeteer-core (and a Chrome or Edge), or puppeteer");
    }
  }
  const guess = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".png": "image/png", ".json": "application/json" };
  const server = createServer((req, res) => {
    const file = join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.BROWSER || (full ? undefined : guess), args: ["--mute-audio", "--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
  return { browser, base, close: async () => (await browser.close(), server.close()) };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function tapFor(page, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await page.keyboard.press("Space");
    await sleep(480);
  }
}

// ---- play: each game headless, as the pocket runs it ------------------------------------------
async function play(id) {
  const { cart } = check(id);
  const { browser, base, close } = await browse();
  let ok = true;
  for (const g of cart.games) {
    const page = await browser.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
    page.on("response", (r) => r.status() >= 400 && errs.push(`${r.status()} ${r.url().replace(base, "")}`));
    page.on("request", (r) => !r.url().startsWith(base) && !r.url().startsWith("data:") && errs.push("network request to " + r.url()));
    // Stand in for the pocket, so the game reports its frame rate and drawing time
    await page.evaluateOnNewDocument(() => {
      window.__fps = [];
      const fake = { postMessage: (m) => m && m.type === "flow:fps" && window.__fps.push(m) };
      try {
        Object.defineProperty(window, "parent", { get: () => fake });
      } catch (e) {}
    });
    await page.setViewport({ width: 400, height: 760, deviceScaleFactor: 1 });
    await page.goto(`${base}/${g.file}?pocket=1`);
    await sleep(2500);
    await tapFor(page, 9000);
    await page.keyboard.down("Space");
    await sleep(1300);
    await page.keyboard.up("Space");
    await page.keyboard.press("f");
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Space");
      await sleep(100);
    }
    await sleep(2500);
    const fps = await page.evaluate(() => window.__fps);
    const heap = (await page.metrics()).JSHeapUsedSize / 1048576;
    const draw = fps.length ? fps.reduce((s, f) => s + f.workMs, 0) / fps.length : NaN;
    const rate = fps.length ? fps.reduce((s, f) => s + f.fps, 0) / fps.length : NaN;
    const problems = [...new Set(errs)];
    if (!fps.length) problems.push("no frame reports (does it load the shell and call SpaceShell.mount / FlowShell.mount?)");
    if (draw > BUDGET.drawMs) problems.push(`drawing ${draw.toFixed(2)} ms a frame, over ${BUDGET.drawMs} ms`);
    if (heap > BUDGET.heapMB) problems.push(`heap ${heap.toFixed(0)} MB, over ${BUDGET.heapMB} MB`);
    await page.close();
    const cpu = await idleCpu(browser, `${base}/${g.file}?pocket=1`);
    if (cpu > BUDGET.idleCpu) problems.push(`CPU ${cpu.toFixed(0)}% of a core while it plays itself, over ${BUDGET.idleCpu}%`);
    // Drawing time, heap and idle CPU are judged; a headless frame rate swings from run to run
    console.log(`${problems.length ? "FAIL" : "ok  "} ${g.file}: draw ${draw.toFixed(2)} ms a frame, heap ${heap.toFixed(0)} MB, CPU ${cpu.toFixed(0)}% of a core untouched (headless; frame rate ${rate.toFixed(0)}, not judged)`);
    for (const p of problems) console.log("     " + p);
    if (problems.length) ok = false;
  }
  await close();
  return ok;
}

// The game's CPU, as a percent of one core, while it plays itself at the pocket's size: start
// it, hand it to autopilot, let it settle, then read the page's and the GPU's CPU time over 6 s.
// The browser's own processes are left out (they have busy moments of their own, like indexing),
// and the best of two readings is kept.
async function idleCpu(browser, url) {
  const cdp = await browser.target().createCDPSession();
  const total = async () => (await cdp.send("SystemInfo.getProcessInfo")).processInfo.filter((p) => p.type === "renderer" || p.type === "GPU").reduce((s, p) => s + p.cpuTime, 0);
  const page = await browser.newPage();
  await page.setViewport({ width: 372, height: 330, deviceScaleFactor: 1 });
  await page.goto(url);
  await sleep(1500);
  await page.keyboard.press("Space");
  await page.keyboard.press("Enter");
  await sleep(2500);
  const readings = [];
  for (let i = 0; i < 2; i++) {
    const a = await total(), t0 = Date.now();
    await sleep(6000);
    readings.push(((await total()) - a) / ((Date.now() - t0) / 1000) * 100);
  }
  await page.close();
  await cdp.detach();
  return Math.min(...readings);
}

// ---- shots: what each game looks like, for reviewing art ---------------------------------------
async function shots(id) {
  const { cart } = check(id);
  const out = join(ROOT, "dist", "shots", id);
  mkdirSync(out, { recursive: true });
  const { browser, base, close } = await browse();
  const views = [
    { name: "phone", w: 400, h: 760, query: "" },
    { name: "phone-tier4", w: 400, h: 760, query: "?tier=4" },
    { name: "desktop", w: 1280, h: 800, query: "" },
    // The pocket's game frame: short and narrow (Corner dock), and the Mini square
    { name: "pocket", w: 372, h: 330, query: "?pocket=1" },
    { name: "pocket-mini", w: 300, h: 240, query: "?pocket=1" }
  ];
  for (const g of cart.games) {
    const name = g.file.split("/").pop().replace(".html", "");
    for (const v of views) {
      const page = await browser.newPage();
      await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 1 });
      await page.goto(`${base}/${g.file}${v.query}`);
      await sleep(1800);
      if (v.name === "phone") await page.screenshot({ path: join(out, `${name}-attract.png`) });
      if (v.name === "phone-tier4") {
        // Mashing off the beat would miss things and drop the tier, so start, then autopilot
        await page.keyboard.press("Space");
        await sleep(300);
        await page.keyboard.press("Enter");
        await sleep(5000);
      } else await tapFor(page, 5000);
      await page.screenshot({ path: join(out, `${name}-${v.name}.png`) });
      await page.close();
    }
    console.log(`${g.file}: ${views.length + 1} shots`);
  }
  await close();
  console.log(`dist/shots/${id}/`);
}

// ---- new --------------------------------------------------------------------------------------
function scaffold(id, name, opts) {
  if (!/^[a-z][a-z0-9-]*$/.test(id || "")) throw new Error("id: lower case letters, digits and dashes");
  const dir = join(ROOT, "carts", id);
  if (existsSync(join(dir, "cart.json"))) throw new Error(`carts/${id} already exists`);
  const shell = opts.shell || "shell/space-shell.js", skin = opts.skin || "skins/neon/neon-skin.js";
  for (const f of [shell, skin]) if (!existsSync(join(ROOT, f))) throw new Error(`no such file: ${f}`);
  // The skin's global name, from `window.X = {` in its file
  const skinVar = (readFileSync(join(ROOT, skin), "utf8").match(/window\.(\w+)\s*=\s*\{/) || [])[1] || "NeonSkin";
  mkdirSync(join(dir, "games"), { recursive: true });
  const fonts = ["skins/pinball/fonts/oswald-latin.woff2", "skins/pinball/fonts/inter-latin.woff2"];
  const game = `carts/${id}/games/${id}.html`;
  const key = id.replace(/-(\w)/g, (_, c) => c.toUpperCase()) + "Starter";
  const cart = { id, name: name || id, version: "0.1.0", engine: 1, blurb: "One line about the theme.", colors: ["#00f0ff", "#ff2bd6"], files: [shell, skin, ...fonts], games: [{ file: game, label: name || id, hint: "Tap as each orb reaches the line" }] };
  writeFileSync(join(dir, "cart.json"), JSON.stringify(cart, null, 2) + "\n");
  writeFileSync(join(dir, "BUILD-LOG.md"), readFileSync(join(ROOT, "carts", "BUILD-LOG.template.md"), "utf8").replace(/<Name>/g, cart.name));
  const starter = readFileSync(join(ROOT, "carts", "starter.html"), "utf8").replace(/__TITLE__/g, cart.name).replace(/__KEY__/g, key).replace(/__SKIN__/g, skin).replace(/__SHELL__/g, shell).replace(/__SKINVAR__/g, skinVar);
  writeFileSync(join(ROOT, game), starter);
  console.log(`carts/${id}/: cart.json, BUILD-LOG.md and a starter game (${game}).\nTry it: node carts/cart.mjs play ${id}`);
}

const args = process.argv.slice(2);
const flag = (n) => {
  const i = args.indexOf("--" + n);
  return i >= 0 ? args.splice(i, 2)[1] : null;
};
const opts = { shell: flag("shell"), skin: flag("skin") };
const [cmd, a, b] = args;
const all = () => readdirSync(join(ROOT, "carts"), { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(ROOT, "carts", d.name, "cart.json"))).map((d) => d.name);
if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  try {
    if (cmd === "check") {
      let ok = (a ? [a] : all()).map(report).every(Boolean);
      for (const c of sharedKeys()) {
        console.log("FAIL " + c);
        ok = false;
      }
      process.exit(ok ? 0 : 1);
    } else if (cmd === "play") process.exit((await play(a)) ? 0 : 1);
    else if (cmd === "shots") await shots(a);
    else if (cmd === "pack") pack(a);
    else if (cmd === "unpack") console.log("unpacked", unpackTo(a, b).name, "to", b);
    else if (cmd === "new") scaffold(a, b, opts);
    else console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 13).join("\n"));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
