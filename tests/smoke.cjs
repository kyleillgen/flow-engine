// Plays every game for a few seconds in a headless browser: it must load without errors, draw,
// keep animating, and survive presses (a held one too). Run with `npm run smoke`.
// Uses the full `puppeteer` package when installed (CI); otherwise `puppeteer-core` with the
// browser named in BROWSER, or Edge or Chrome where they usually live.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
let puppeteer, full = true;
try { puppeteer = require("puppeteer"); } catch { puppeteer = require("puppeteer-core"); full = false; }
const guess = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const executablePath = process.env.BROWSER || (full ? undefined : guess);
if (!full && !executablePath) {
  console.error("No browser found: set BROWSER to a Chrome or Edge executable, or npm install puppeteer");
  process.exit(1);
}

const ROOT = path.join(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".md": "text/markdown", ".png": "image/png", ".json": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ headless: true, executablePath, args: ["--mute-audio", "--no-sandbox"] });
  // Every game in games/ and in each cartridge's games/ folder. An argument narrows it: a
  // cartridge id (its cart.json games) or part of a file name, e.g. npm run smoke -- hunt
  const inDir = (d) => (fs.existsSync(path.join(ROOT, d)) ? fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith(".html")).map((f) => d + "/" + f) : []);
  let games = [...inDir("games"), ...fs.readdirSync(path.join(ROOT, "carts")).flatMap((c) => inDir(`carts/${c}/games`))];
  const only = process.argv[2];
  if (only) {
    const cart = path.join(ROOT, "carts", only, "cart.json");
    games = fs.existsSync(cart) ? JSON.parse(fs.readFileSync(cart, "utf8")).games.map((g) => g.file) : games.filter((g) => g.includes(only));
  }
  let failed = 0;
  for (const g of games) {
    const page = await browser.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    page.on("requestfailed", (r) => errs.push("failed to load " + r.url()));
    page.on("response", (r) => r.status() >= 400 && errs.push(`${r.status()} ${r.url()}`));
    await page.setViewport({ width: 400, height: 720 });
    await page.goto(`${base}/${g}`);
    await sleep(1200);
    const frame = () => page.evaluate(() => {
      const c = document.querySelector("canvas");
      if (!c) return null;
      return c.toDataURL().length + ":" + c.toDataURL().slice(-200);
    });
    const a = await frame();
    // Presses: taps, then a hold, then typing (for the typing game)
    for (let i = 0; i < 6; i++) { await page.keyboard.press("Space"); await sleep(250); }
    await page.keyboard.down("Space"); await sleep(700); await page.keyboard.up("Space");
    for (const k of "flowstate") { await page.keyboard.press(k); await sleep(60); }
    await sleep(800);
    const b = await frame();
    const problems = [...errs];
    if (!a) problems.push("no canvas");
    else if (a === b) problems.push("canvas stopped changing");
    console.log(`${problems.length ? "FAIL" : "ok  "} ${g}${problems.length ? "\n     " + problems.join("\n     ") : ""}`);
    if (problems.length) failed++;
    await page.close();
  }
  await browser.close();
  server.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
