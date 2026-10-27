// Plays every game for a few seconds in a headless browser: it must load without errors, draw,
// keep animating, and survive presses (a held one too). Run with `npm run smoke`.
// Uses the full `puppeteer` package when installed (CI); otherwise `puppeteer-core` with the
// browser named in BROWSER.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
let puppeteer;
try { puppeteer = require("puppeteer"); } catch { puppeteer = require("puppeteer-core"); }

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
  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.BROWSER || undefined, args: ["--mute-audio", "--no-sandbox"] });
  const games = fs.readdirSync(path.join(ROOT, "games")).filter((f) => f.endsWith(".html"));
  let failed = 0;
  for (const g of games) {
    const page = await browser.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    page.on("requestfailed", (r) => errs.push("failed to load " + r.url()));
    page.on("response", (r) => r.status() >= 400 && errs.push(`${r.status()} ${r.url()}`));
    await page.setViewport({ width: 400, height: 720 });
    await page.goto(`${base}/games/${g}`);
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
