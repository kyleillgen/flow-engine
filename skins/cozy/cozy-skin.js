// Cozy skin: a fork of skins/neon/neon-skin.js for the Cozy cartridge (carts/cozy), worn by
// shell/space-shell.js (mount({ skin: CozySkin })). The same drawing toolkit (sprites baked once with their glow, light stamped
// additively, baked skies, motes, sparkles, soft rings, rim-lit hills), retuned from a neon
// cockpit to a garden at night: dusk plum instead of deep blue, warm cream and lantern honey
// instead of cyan, a serif italic instead of a neon sign, round dot lights instead of tubes, a
// string of fairy lights along the bottom instead of a chase rail, and a shared face for the
// cart's characters.
//
// CozySkin.install(options), score(el, n, digits), lights(el, pct, color), bulbs(ctx, W, y, beatPos, flash),
// callout(ctx, text, x, y, color, size, alpha, age), layer, sprite, draw, add (draw as light),
// glow(ctx, x, y, r, color, a), streak(ctx, trail, r, color), mix, mixA, rgba, rng
// haloed, blurred, dreamSky, motes, twinkle, softRing, hills, stars (as in the neon skin)
// CozySkin.face(ctx, x, y, r, mood, look, cheek)  a character's face in units of r:
//                                                 mood "sleep" | "idle" | "o" | "happy" | "whee" | "blink"
// CozySkin.petal(g, len, wid)                     a petal path from the origin, pointing up (-y)
// CozySkin.ink                                    the faces' ink colour
// CozySkin.theme, CozySkin.words                  the shell's colours and type, and its keys card
// CozySkin.cue(ctx, api, x, y, beatsToGo, o)      the timing cue in the garden's look (gold on the beat)
// CozySkin.happenings(kinds, o)                   little things that happen now and then in the background
// CozySkin.shootingStar(ctx, x0, y0, dx, dy, u)   one, u 0..1 across
(() => {
  "use strict";
  if (window.CozySkin) return;

  const C = {
    black: "#140a24",
    ink: "#1c1030",
    cyan: "#ffd58a", // the neon skin's accent names, mapped to the garden's lights
    magenta: "#ff9fc0",
    violet: "#c8b4ff",
    lime: "#9cf0d0",
    cream: "#fff2e2",
    red: "#ff8fa8",
    orange: "#ffbf9e",
    yellow: "#ffd58a",
    segOn: "#fff2e2",
    segOff: "#3a2550"
  };
  const INK = "#3a1f3f";
  // The tiers drift through a garden night: blush, mint, lavender, honey
  const TIERS = ["#ffb3cf", "#9cf0d0", "#c8b4ff", "#ffd58a"];
  // The shell speaks in pinball colours (yellow for news, red for replay, cream for notes)
  const TONES = { "#ffc400": C.yellow, "#e8231f": C.red, "#f6e6c0": C.cream, "#ff7a00": C.orange, "#2f6bff": TIERS[0], "#1fbf55": TIERS[1], "#ff1f8a": TIERS[2] };
  const tone = (c) => TONES[String(c).toLowerCase()] || c;

  const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';
  const CSS = `
  .pb-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: linear-gradient(rgba(58,34,82,.84), rgba(36,20,56,.9)); border-radius: 18px; padding: 6px 7px 6px 12px; box-shadow: 0 0 0 1px rgba(255,213,138,.26), 0 0 18px rgba(255,159,192,.12), 0 10px 28px rgba(12,4,24,.45); }
  .pb-window { display: inline-flex; align-items: baseline; min-width: 4.2em; font: italic 400 21px/1 ${SERIF}; color: #fff2e2; letter-spacing: .02em; text-shadow: 0 0 10px rgba(255,213,138,.55); font-variant-numeric: tabular-nums; transition: transform .35s cubic-bezier(.34,1.56,.64,1), color .35s, text-shadow .35s; transform-origin: left center; }
  .pb-window.bump { transform: scale(1.08); color: #ffffff; text-shadow: 0 0 6px #fff, 0 0 16px ${C.yellow}; transition-duration: .05s; }
  .pb-best { font: 500 10px Inter, system-ui, sans-serif; letter-spacing: .06em; color: #f5c9da; opacity: .6; margin-left: 8px; }
  .pb-label { display: block; font: italic 400 13px/1.25 ${SERIF} !important; letter-spacing: .01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 0 10px currentColor; }
  .pb-lights { display: flex; gap: 5px; margin-top: 5px; align-items: center; }
  .pb-lights i { position: relative; width: 6px; height: 6px; flex: none; border-radius: 50%; background: #4a2f62; }
  .pb-lights i::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fff, var(--c, ${C.yellow}) 60%); box-shadow: 0 0 5px var(--c, ${C.yellow}), 0 0 11px var(--c, ${C.yellow}); opacity: 0; transform: scale(.6); transition: opacity .5s cubic-bezier(.2,.7,.3,1), transform .5s cubic-bezier(.34,1.56,.64,1); }
  .pb-lights i.on::after { opacity: 1; transform: none; transition-duration: .08s; }
  .pb-btn { white-space: nowrap; font: 500 11px/1 Inter, system-ui, sans-serif !important; letter-spacing: .04em; color: ${C.cream} !important; background: rgba(255,199,217,.08) !important; border: 0 !important; border-radius: 12px !important; box-shadow: 0 0 0 1px rgba(255,199,217,.4) inset; padding: 6px 10px !important; cursor: pointer; }
  .pb-btn { transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s ease, background-color .2s, color .2s; }
  .pb-btn:hover { background: rgba(255,199,217,.16) !important; box-shadow: 0 0 0 1px rgba(255,213,138,.7) inset, 0 0 14px rgba(255,159,192,.22); }
  .pb-btn:active { transform: scale(.96); transition-duration: .05s; }
  .pb-btn svg { width: 15px; height: 15px; color: currentColor; }
  .pb-icon { display: flex; align-items: center; padding: 5px 7px !important; }
  .pb-bar .pb-btn { color: rgba(255,242,226,.86) !important; background: rgba(255,255,255,.05) !important; box-shadow: 0 0 0 1px rgba(255,199,217,.2) inset; padding: 6px 9px !important; }
  .pb-bar .pb-btn:hover { background: rgba(255,199,217,.12) !important; box-shadow: 0 0 0 1px rgba(255,199,217,.45) inset, 0 0 12px rgba(255,159,192,.18); }
  .pb-bar .pb-btn.on { color: #2a1438 !important; background: ${C.yellow} !important; box-shadow: 0 0 0 1px #fff0cc inset, 0 0 14px rgba(255,213,138,.55); font-weight: 600 !important; }
  .pb-bar .pb-icon { padding: 5px 6px !important; }
  .pb-badge { display: inline-block; font: italic 400 11px/1 ${SERIF}; padding: 2px 5px; border-radius: 8px; background: rgba(255,199,217,.14); color: ${C.cream}; opacity: .85; vertical-align: 1px; }
  .pb-badge.ready { background: ${C.yellow}; color: #2a1438; opacity: 1; box-shadow: 0 0 10px rgba(255,213,138,.55); }
  @media (prefers-reduced-motion: reduce) { .pb-card, .pb-paused { animation: none !important; } }
  .pb-card { max-width: 24rem; width: 100%; background: linear-gradient(#3a2354, #251639); color: #f3e2ee; border: 0; border-radius: 22px; box-shadow: 0 0 0 1px rgba(255,213,138,.28), 0 0 30px rgba(255,159,192,.14), 0 24px 60px rgba(10,4,20,.55); padding: 22px 22px 18px; animation: cz-pop .5s cubic-bezier(.34,1.56,.64,1) both; }
  @keyframes cz-pop { from { opacity: 0; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: none; } }
  .pb-paused { animation: cz-drop .5s cubic-bezier(.34,1.56,.64,1) both; }
  @keyframes cz-drop { from { opacity: 0; transform: translateY(-14px) scale(.94); } to { opacity: 1; transform: none; } }
  /* A static vignette: one layer, never redrawn */
  .pb-vignette { position: fixed; inset: 0; z-index: 5; pointer-events: none; background: radial-gradient(ellipse at 50% 45%, transparent 60%, rgba(20,8,32,.45) 100%); }
  .pb-kicker { font: italic 400 15px ${SERIF}; color: ${C.yellow}; text-shadow: 0 0 10px rgba(255,213,138,.6); }
  .pb-title { margin: 6px 0 10px; font: italic 400 40px/1.05 ${SERIF}; letter-spacing: .01em; color: #fff6ec; text-shadow: 0 0 8px rgba(255,236,214,.8), 0 0 22px rgba(255,191,158,.6), 0 0 48px rgba(255,159,192,.5), 0 0 90px rgba(200,180,255,.45); }
  .pb-card .pb-title { color: #fff; }
  .pb-kbd { display: inline-block; min-width: 1.7em; padding: 0 .45em; background: rgba(255,199,217,.12); border: 0; border-radius: 6px; box-shadow: 0 0 0 1px rgba(255,199,217,.38) inset; color: ${C.cream}; font: normal 600 10px/1.7 Inter, system-ui, sans-serif; text-align: center; text-transform: none; }
  .pb-paused { font: italic 400 44px/1 ${SERIF}; color: #fff6ec; text-shadow: 0 0 8px rgba(255,236,214,.8), 0 0 26px rgba(255,159,192,.55), 0 0 60px rgba(200,180,255,.4); }
  .pb-sub { margin-top: 12px; font: 400 12px Inter, system-ui, sans-serif; letter-spacing: .04em; color: #f0c8d8; opacity: .85; }
  .pb-rows div { display: flex; justify-content: space-between; gap: 12px; margin: 7px 0; font: 400 12px Inter, system-ui, sans-serif; color: #f3e2ee; }
  .pb-note { margin-top: 10px; font: 400 12px/1.45 Inter, system-ui, sans-serif; color: #b9a0c4; }
  @media (max-width: 520px) { .pb-bar { gap: 7px; padding: 5px 6px 5px 10px; } .pb-window { font-size: 18px; min-width: 3.4em; } .pb-lights { gap: 3px; } .pb-lights i { width: 5px; height: 5px; } .pb-btn { padding: 5px 7px !important; } .pb-bar .pb-btn { padding: 5px 7px !important; font-size: 10px !important; } }
  @media (max-width: 360px) { .pb-window { font-size: 16px; } }
  .pb-hint { display: inline-block; max-width: calc(100vw - 32px); padding: 7px 14px; background: rgba(40,22,60,.8); color: ${C.cream}; border-radius: 999px; box-shadow: 0 0 0 1px rgba(255,213,138,.3) inset, 0 0 16px rgba(255,159,192,.14); font: italic 400 14px/1.3 ${SERIF}; letter-spacing: .01em; }
  .pb-hint .pb-kbd { background: rgba(255,199,217,.16); color: ${C.cream}; }
  /* What the theme can't say about the shell's own pieces, one step more specific than its rules
     (which load after this sheet): the title's size and slower fade-up (theme.strike names it), a
     string of lights for the rule, and the flow check's softer card with its buttons in Inter */
  .ss .ss-hint { bottom: 34px; }
  .ss .ss-marquee { transition: opacity .8s, transform .8s cubic-bezier(.34,1.56,.64,1); }
  .ss .ss-marquee.gone { opacity: 0; transform: translateY(-14px) scale(.97); }
  .ss .ss-marquee .pb-title { font-size: 50px; letter-spacing: .01em; margin: 0 0 12px; animation-duration: 1.6s; animation-timing-function: cubic-bezier(.2,.7,.3,1); }
  .ss .ss-rule { width: 64px; height: 6px; margin: -2px auto 14px; background: radial-gradient(circle, ${C.yellow} 0 2px, transparent 2.5px) 0 0 / 16px 6px repeat-x; box-shadow: none; filter: drop-shadow(0 0 4px ${C.yellow}) drop-shadow(0 0 10px ${C.magenta}); animation: cz-rise 1.6s .3s cubic-bezier(.2,.7,.3,1) both; }
  @keyframes cz-rise { from { opacity: 0; transform: translateY(10px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
  @media (prefers-reduced-motion: reduce) { .ss .ss-rule { animation: none; } }
  html .fe-check { bottom: 34px; border-radius: 18px; box-shadow: 0 0 0 1px rgba(255,213,138,.3), 0 0 26px rgba(255,159,192,.16), 0 16px 40px rgba(10,4,20,.55); }
  html .fe-check-title { font-size: 15px; font-style: italic; font-weight: 400; letter-spacing: normal; color: ${C.yellow}; }
  html .fe-check-scale button, html .fe-check-est { font-family: var(--ss-body); }
  html .fe-check-scale button { border-radius: 10px; }
  html .fe-check-scale button.on { background: #ffb3cf; color: #2a1438; box-shadow: 0 0 0 1px #ffe0ea inset, 0 0 12px rgba(255,159,192,.5); }
  html .fe-check-est { border-radius: 8px; }`;

  // The shell's colours and type: a serif title, higher, clear of the characters, that fades up
  const THEME = {
    bg: "#1c1030", text: C.cream, text2: "#f3e2ee", c1: C.yellow, c2: C.magenta, veil: "rgba(28,16,48,.78)", panel: "linear-gradient(#36214f, #24153a)", line: "rgba(255,213,138,.3)", glow: "rgba(255,159,192,.16)", dim: "#b9a0c4",
    head: SERIF, body: "Inter, system-ui, sans-serif", headCase: "none", headGlow: "none", marqueeTop: "18%", strike: "cz-rise"
  };
  // The keys card speaks of tapping and letting go, not firing
  const WORDS = { fire: "Tap", charge: "Hold and let go" };

  // Inter ships in skins/pinball/fonts (one copy for every skin); the titles use Georgia, a system font
  const here = document.currentScript && document.currentScript.src ? new URL("../pinball/fonts/", document.currentScript.src).href : "../pinball/fonts/";
  const FONTS = `
  @font-face { font-family: Inter; font-weight: 400 600; font-display: swap; src: url(${here}inter-latin.woff2) format("woff2"); }`;

  function install(options) {
    if (document.getElementById("cz-style")) return;
    const style = document.createElement("style");
    style.id = "cz-style";
    style.textContent = FONTS + CSS;
    document.head.appendChild(style);
    if (options && options.vignette === false) return;
    const vignette = document.createElement("div");
    vignette.className = "pb-vignette";
    (document.body || document.documentElement).appendChild(vignette);
  }

  // The score in a soft serif, bumping when it rises
  function score(el, n) {
    const str = String(Math.max(0, Math.floor(n)));
    if (el.dataset.pb === str) return;
    const rising = el.dataset.pb !== undefined && +str > +el.dataset.pb;
    el.dataset.pb = str;
    if (rising) {
      el.classList.add("bump");
      clearTimeout(el._bump);
      el._bump = setTimeout(() => el.classList.remove("bump"), 90);
    }
    el.textContent = (+str).toLocaleString();
  }

  // Ten little round lights for the flow meter
  function lights(el, pct, color) {
    if (!el.children.length) el.innerHTML = "<i></i>".repeat(10);
    color = tone(color);
    const lit = Math.round(Math.max(0, Math.min(100, pct)) / 10);
    const key = lit + color;
    if (el.dataset.pb === key) return;
    el.dataset.pb = key;
    [...el.children].forEach((b, i) => {
      b.style.setProperty("--c", color);
      b.classList.toggle("on", i < lit);
    });
  }

  // ---- Sprites and layers, baked at the canvas's device scale (as in the pinball skin) ----------
  const sprites = new Map();
  const layers = new Map();
  const TAU = Math.PI * 2;
  let bakeS = 1; // the scale of the sprite being baked, so glow radii stay the same on any screen
  function scaleOf(ctx) {
    if (ctx._pbW !== ctx.canvas.width) {
      ctx._pbW = ctx.canvas.width;
      ctx._pbA = ctx.getTransform().a;
    }
    return ctx._pbA;
  }
  const devScale = (ctx) => Math.max(1, Math.min(2, Math.ceil(scaleOf(ctx) * 2) / 2));
  function canvasOf(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  function sprite(ctx, key, w, h, ox, oy, paint) {
    const S = devScale(ctx);
    const k = key + "@" + S;
    let s = sprites.get(k);
    if (!s) {
      if (sprites.size > 320) sprites.clear();
      const c = canvasOf(w * S, h * S);
      const g = c.getContext("2d");
      g.scale(S, S);
      g.translate(ox, oy);
      bakeS = S;
      paint(g);
      s = { c, w, h, ox, oy };
      sprites.set(k, s);
    }
    return s;
  }
  const draw = (ctx, s, x, y, k = 1) => ctx.drawImage(s.c, x - s.ox * k, y - s.oy * k, s.w * k, s.h * k);
  // Stamped as light: adds to what's under it, the way a tube glows over a dark wall
  function add(ctx, s, x, y, k = 1, a = 1) {
    const op = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = a;
    draw(ctx, s, x, y, k);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = op;
  }
  function layer(ctx, key, W, H, paint) {
    const S = scaleOf(ctx);
    const k = key + "|" + W + "x" + H + "@" + S;
    let c = layers.get(k);
    if (!c) {
      if (layers.size >= 6) layers.delete(layers.keys().next().value);
      c = canvasOf(W * S, H * S);
      const g = c.getContext("2d", { alpha: false });
      g.scale(S, S);
      bakeS = S;
      paint(g);
      layers.set(k, c);
    }
    ctx.drawImage(c, 0, 0, W, H);
  }

  function rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c);
  function mix(a, b, t) {
    if (!isHex(a) || !isHex(b)) return a;
    const [r1, g1, b1] = rgb(a);
    const [r2, g2, b2] = rgb(b);
    return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
  }
  const rgba = (hex, a) => (isHex(hex) ? `rgba(${rgb(hex).join(",")},${a})` : hex);
  // mix() with an alpha, for gradients that fade without going grey
  function mixA(a, b, t, alpha) {
    const [r1, g1, b1] = rgb(a);
    const [r2, g2, b2] = rgb(b);
    return `rgba(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)},${alpha})`;
  }
  function radial(g, x, y, r0, r1, stops) {
    const gr = g.createRadialGradient(x, y, r0, x, y, r1);
    for (const [o, c] of stops) gr.addColorStop(o, c);
    return gr;
  }
  function disc(g, x, y, r, fill) {
    g.fillStyle = fill;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  // A small seeded random, so baked skies come out the same every time
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A neon tube in three passes: a wide soft glow, the tube's own colour, and a near-white core
  function haloed(g, color, paint) {
    g.save();
    g.shadowColor = color;
    g.globalAlpha = 0.75;
    g.shadowBlur = 16 * bakeS;
    paint(g, color, false);
    g.globalAlpha = 1;
    g.shadowBlur = 6 * bakeS;
    paint(g, color, false);
    g.shadowBlur = 0;
    paint(g, mix(color, "#ffffff", 0.65), true);
    g.restore();
  }

  // ---- The sky ----------------------------------------------------------------------------
  // The moving starfield: three depths drifting down past you. warp 0..1 speeds it up and
  // stretches each star into a streak, for the big moments.
  const field = [];
  {
    const r = rng(7);
    const cols = ["#bff6ff", "#ffc2ea", "#ffffff", "#fff1d6", "#d6c8ff"];
    for (let i = 0; i < 90; i++) field.push({ x: r(), y: r(), d: 0.15 + r() * 0.85, c: cols[Math.floor(r() * cols.length)], tw: r() * TAU });
  }
  let travel = 0;
  let lastStars = 0;
  function stars(ctx, W, H, warp = 0) {
    const now = performance.now();
    const dt = Math.min(0.1, (now - (lastStars || now)) / 1000);
    lastStars = now;
    travel += dt * (1 + warp * 14);
    ctx.globalCompositeOperation = "lighter";
    for (const s of field) {
      const v = 14 + 70 * s.d;
      const y = (((s.y * H + travel * v) % (H + 40)) + H + 40) % (H + 40) - 20;
      const x = s.x * W;
      ctx.globalAlpha = (0.2 + 0.55 * s.d) * (0.65 + 0.35 * Math.sin(travel * 1.7 + s.tw)); // a slow twinkle
      ctx.fillStyle = s.c;
      const len = warp * v * 0.9;
      if (len > 2) ctx.fillRect(x, y - len, s.d * 1.6, len);
      else ctx.fillRect(x, y, s.d * 1.8, s.d * 1.8);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  // ---- Shared parts ------------------------------------------------------------------------
  function glow(ctx, x, y, r, color, a = 1) {
    if (a <= 0.01) return;
    color = tone(color);
    const s = sprite(ctx, "glow" + color, 64, 64, 32, 32, (g) => disc(g, 0, 0, 32, radial(g, 0, 0, 0, 32, [[0, rgba(color, 0.6)], [0.3, rgba(color, 0.24)], [1, rgba(color, 0)]])));
    add(ctx, s, x, y, r / 32, a);
  }

  // Along the bottom: a string of fairy lights on a gently sagging wire, warm round bulbs that
  // twinkle in turn on the eighth notes (all lit while flash > 0)
  const BULBS = ["#ffd58a", "#ffb3cf", "#c8b4ff", "#9cf0d0", "#ffbf9e"];
  const filament = [];
  let lastBulbs = 0;
  const SPAN = 46; // pixels between the wire's hooks
  const sag = (x) => 4 * Math.sin(((x % SPAN) / SPAN) * Math.PI);
  function bulbs(ctx, W, y, beatPos, flash) {
    const step = Math.floor(beatPos * 2);
    const now = performance.now();
    const dt = Math.min(0.1, (now - (lastBulbs || now)) / 1000);
    lastBulbs = now;
    const decay = Math.pow(0.02, dt);
    const wire = sprite(ctx, "czwire" + W, W, 26, 0, 13, (g) => {
      const lin = g.createLinearGradient(0, -6, 0, 13);
      lin.addColorStop(0, "rgba(20,8,32,0)");
      lin.addColorStop(1, "rgba(20,8,32,0.75)");
      g.fillStyle = lin;
      g.fillRect(0, -6, W, 19);
      g.strokeStyle = "rgba(255,226,236,0.22)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, -6);
      for (let x = 2; x <= W; x += 2) g.lineTo(x, -6 + sag(x));
      g.stroke();
      for (let x = 23; x < W; x += 23) {
        g.fillStyle = "rgba(90,60,110,0.9)";
        g.beginPath();
        g.arc(x, -6 + sag(x) + 3, 2.6, 0, TAU);
        g.fill();
      }
    });
    draw(ctx, wire, 0, y);
    for (let i = 0, x = 23; x < W; i++, x += 23) {
      const on = flash > 0 || (i + step) % 4 === 0;
      filament[i] = on ? 1 : Math.max(0.28, (filament[i] || 0) * decay);
      const color = BULBS[i % BULBS.length];
      const lit = sprite(ctx, "czbulb" + color, 40, 40, 20, 20, (g) => {
        disc(g, 0, 0, 20, radial(g, 0, 0, 0, 20, [[0, rgba(color, 0.55)], [0.35, rgba(color, 0.2)], [1, rgba(color, 0)]]));
        disc(g, 0, 0, 3.2, mix(color, "#ffffff", 0.55));
      });
      add(ctx, lit, x, y - 6 + sag(x) + 3, 0.8, filament[i]);
    }
  }

  // Lettering in a soft serif italic, with a warm halo, popping in with a little overshoot
  const easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
  const fills = new Map();
  function callout(ctx, text, x, y, color, size = 22, alpha = 1, age) {
    color = tone(color);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (age !== undefined) {
      const k = 0.7 + 0.3 * easeOutBack(Math.min(1, age / 0.2));
      ctx.translate(x, y);
      ctx.scale(k, k);
      ctx.translate(-x, -y);
    }
    const px = Math.round(size * 1.15);
    ctx.font = `italic 400 ${px}px Georgia, "Iowan Old Style", "Times New Roman", serif`;
    ctx.textAlign = "center";
    const label = String(text);
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(color, 0.1);
    ctx.lineWidth = px * 0.7;
    ctx.strokeText(label, x, y);
    ctx.strokeStyle = rgba(color, 0.22);
    ctx.lineWidth = px * 0.32;
    ctx.strokeText(label, x, y);
    ctx.strokeStyle = rgba(color, 0.55);
    ctx.lineWidth = px * 0.1;
    ctx.strokeText(label, x, y);
    ctx.globalCompositeOperation = "source-over";
    let fill = fills.get(color);
    if (!fill) fills.set(color, (fill = mix(color, "#ffffff", 0.8)));
    ctx.fillStyle = fill;
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  // A light trail behind something fast: three nested additive strokes
  function streak(ctx, trail, r, color = C.cyan) {
    if (trail.length < 3) return;
    let len = 1;
    for (let d = 0; len < trail.length && d < r * 6; len++) d += Math.hypot(trail[len][0] - trail[len - 1][0], trail[len][1] - trail[len - 1][1]);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.strokeStyle = tone(color);
    for (const [n, w, a] of [[len, 1.8, 0.12], [Math.ceil(len * 0.75), 0.9, 0.3], [Math.ceil(len * 0.45), 0.35, 0.6]]) {
      ctx.globalAlpha = a;
      ctx.lineWidth = r * w;
      ctx.beginPath();
      ctx.moveTo(trail[0][0], trail[0][1]);
      for (let i = 1; i < n; i++) ctx.lineTo(trail[i][0], trail[i][1]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
  }

  // ---- Dreamy parts: soft skies, drifting motes, sparkles, rings and rim-lit hills ----------

  // Inside a sprite's paint: paint(g) with a soft glow of the given blur (in CSS pixels)
  function blurred(g, color, blur, paint) {
    g.save();
    g.shadowColor = color;
    g.shadowBlur = blur * bakeS;
    paint(g);
    g.restore();
  }

  // A baked sky for a mood: { top, mid, low, clouds: [colours], band, seed }. A gradient, big
  // soft clouds of colour, a faint milky band of dense stars across it, and still stars.
  function dreamSky(g, W, H, m) {
    const lin = g.createLinearGradient(0, 0, 0, H);
    lin.addColorStop(0, m.top);
    lin.addColorStop(0.55, m.mid);
    lin.addColorStop(1, m.low);
    g.fillStyle = lin;
    g.fillRect(0, 0, W, H);
    const r = rng(m.seed || 5);
    g.globalCompositeOperation = "lighter";
    const big = Math.max(W, H);
    m.clouds.forEach((c, i) => {
      const x = W * (0.05 + r() * 0.9), y = H * (0.05 + r() * 0.7), rad = big * (0.22 + r() * 0.28);
      g.save();
      g.translate(x, y);
      g.rotate((r() - 0.5) * 0.8);
      g.scale(1.4, 0.6);
      g.fillStyle = radial(g, 0, 0, 0, rad, [[0, rgba(c, 0.16)], [0.45, rgba(c, 0.07)], [1, rgba(c, 0)]]);
      g.fillRect(-rad, -rad, rad * 2, rad * 2);
      g.restore();
    });
    if (m.band) {
      // The milky band: a long soft streak with a thick sprinkle of tiny stars along it
      g.save();
      g.translate(W * 0.5, H * 0.32);
      g.rotate(-0.5);
      g.scale(1, 0.16);
      g.fillStyle = radial(g, 0, 0, 0, big * 0.75, [[0, rgba(m.band, 0.14)], [0.5, rgba(m.band, 0.05)], [1, rgba(m.band, 0)]]);
      g.fillRect(-big, -big, big * 2, big * 2);
      g.restore();
      const n = Math.round((W * H) / 900);
      g.fillStyle = "#ffffff";
      for (let i = 0; i < n; i++) {
        const u = (r() - 0.5) * big * 1.5, v = (r() + r() + r() - 1.5) * big * 0.09;
        const x = W * 0.5 + u * Math.cos(-0.5) - v * Math.sin(-0.5), y = H * 0.32 + u * Math.sin(-0.5) + v * Math.cos(-0.5);
        g.globalAlpha = 0.08 + r() * 0.3;
        g.fillRect(x, y, 0.8, 0.8);
      }
    }
    const s = rng(42);
    const n = Math.round((W * H) / 2600);
    const tints = ["#ffffff", "#ffe9f6", "#e3f9ff", "#fff3d9"];
    for (let i = 0; i < n; i++) {
      const x = s() * W, y = s() * H * 0.85, b = s(), size = 0.5 + b * b * 1.3;
      g.fillStyle = tints[i % 4];
      g.globalAlpha = 0.15 + b * 0.6;
      g.fillRect(x, y, size, size);
      if (b > 0.975) {
        g.globalAlpha = 0.45;
        g.fillStyle = radial(g, x, y, 0, 10, [[0, "rgba(255,240,250,0.55)"], [1, "rgba(255,240,250,0)"]]);
        g.fillRect(x - 10, y - 10, 20, 20);
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }

  // Soft light motes drifting through the scene, at several depths. Positions come from t (pass
  // the beat position or a clock) so they move with it; par shifts the near ones sideways for
  // parallax. opts: { n, size, rise, sway, par, alpha, seed }
  const moteFields = new Map();
  function motes(ctx, W, H, t, colors, o = {}) {
    const seed = o.seed || 3, n = o.n || 16;
    let f = moteFields.get(seed + "/" + n);
    if (!f) {
      const r = rng(seed);
      f = [];
      for (let i = 0; i < n; i++) f.push({ x: r(), y: r(), d: 0.2 + r() * 0.8, p: r() * TAU, c: i });
      moteFields.set(seed + "/" + n, f);
    }
    const size = o.size || 10, rise = o.rise === undefined ? 10 : o.rise, sway = o.sway || 14, par = o.par || 0, alpha = o.alpha || 0.5;
    for (const m of f) {
      const span = H + size * 4;
      const y = ((((m.y * span - t * rise * (0.4 + m.d)) % span) + span) % span) - size * 2;
      const x = m.x * W + Math.sin(t * 0.35 + m.p) * sway * m.d + par * m.d;
      const a = alpha * (0.35 + 0.65 * m.d) * (0.6 + 0.4 * Math.sin(t * 0.9 + m.p * 3));
      glow(ctx, x, y, size * (0.4 + m.d), colors[m.c % colors.length], a);
    }
  }

  // A four-point sparkle, stamped as light
  function twinkle(ctx, x, y, r, color, a = 1) {
    if (a <= 0.01) return;
    color = tone(color);
    const s = sprite(ctx, "twinkle" + color, 64, 64, 32, 32, (g) => {
      g.globalCompositeOperation = "lighter";
      disc(g, 0, 0, 14, radial(g, 0, 0, 0, 14, [[0, rgba(color, 0.55)], [1, rgba(color, 0)]]));
      const ray = (w, len) => {
        g.beginPath();
        g.moveTo(0, -len);
        g.quadraticCurveTo(w * 0.3, -w * 0.3, len, 0);
        g.quadraticCurveTo(w * 0.3, w * 0.3, 0, len);
        g.quadraticCurveTo(-w * 0.3, w * 0.3, -len, 0);
        g.quadraticCurveTo(-w * 0.3, -w * 0.3, 0, -len);
        g.fill();
      };
      g.fillStyle = rgba(color, 0.6);
      ray(6, 30);
      g.fillStyle = mix(color, "#ffffff", 0.8);
      ray(3, 18);
    });
    add(ctx, s, x, y, r / 32, a);
  }

  // A soft ring of light: a wide halo, the ring and a pale core
  function softRing(ctx, x, y, r, color, a = 1, w = 2) {
    if (a <= 0.01 || r <= 0) return;
    const op = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    for (const [k, al, c] of [[4, 0.1, color], [1.8, 0.28, color], [0.6, 0.85, mix(color, "#ffffff", 0.6)]]) {
      ctx.globalAlpha = a * al;
      ctx.strokeStyle = c;
      ctx.lineWidth = w * k;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = op;
  }

  // Rolling hills along a horizon, rim-lit: baked once 1.5 screens wide, slid for parallax.
  // shift is in pixels (about ±W/4 shows no edge); y is the foot of the hills.
  function hills(ctx, key, W, y, h, shift, fill, rim, seed = 1) {
    const w = Math.ceil(W * 1.5);
    const s = sprite(ctx, "hills" + key + w + "x" + Math.round(h) + rim, w, h + 24, 0, h + 12, (g) => {
      const r = rng(seed);
      const waves = [0, 1, 2].map((i) => ({ f: (1.5 + r() * 2.5 + i * 2) / w, p: r() * TAU, a: 0.5 / (i + 1) }));
      const ridge = (x) => -h * (0.55 + waves.reduce((sum, v) => sum + Math.sin(x * v.f * TAU + v.p) * v.a, 0) * 0.5);
      const path = () => {
        g.beginPath();
        g.moveTo(0, ridge(0));
        for (let x = 4; x <= w; x += 4) g.lineTo(x, ridge(x));
      };
      path();
      g.lineTo(w, 12);
      g.lineTo(0, 12);
      g.closePath();
      const lin = g.createLinearGradient(0, -h, 0, 12);
      lin.addColorStop(0, fill[0]);
      lin.addColorStop(1, fill[1]);
      g.fillStyle = lin;
      g.fill();
      haloed(g, rim, (g, c, core) => {
        path();
        g.strokeStyle = c;
        g.globalAlpha = core ? 0.8 : 0.45;
        g.lineWidth = core ? 0.8 : 1.6;
        g.stroke();
      });
    });
    draw(ctx, s, -W * 0.25 + Math.max(-W * 0.25, Math.min(W * 0.25, shift)), y);
  }

  // ---- Characters --------------------------------------------------------------------------

  // A face in units of r (r 10 is the face's own size): two eyes, a mouth and rosy cheeks.
  // mood: "sleep" (closed arcs), "idle" (round eyes with a shine), "blink", "o" (a little gasp),
  // "happy" (smiling arcs), "whee" (round eyes, open smile). look -1..1 turns the eyes.
  function face(ctx, x, y, r, mood, look = 0, cheek = "#ff8fb4") {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r / 10, r / 10);
    ctx.lineCap = "round";
    ctx.lineWidth = 1.1;
    ctx.fillStyle = cheek;
    ctx.globalAlpha = mood === "happy" || mood === "whee" ? 0.75 : 0.45;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 5.8 + look * 0.4, 2.8, 2, 1.2, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ctx.fillStyle = INK;
    for (const s of [-1, 1]) {
      const ex = s * 3.3 + look * 0.9;
      ctx.beginPath();
      if (mood === "sleep" || mood === "blink") {
        ctx.arc(ex, -0.4, 1.5, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      } else if (mood === "happy") {
        ctx.arc(ex, 0.9, 1.6, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      } else {
        const big = mood === "o" ? 1.25 : 1;
        ctx.ellipse(ex, 0, 1.35 * big, 1.75 * big, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex - 0.45, -0.65, 0.55, 0, TAU);
        ctx.fill();
        ctx.fillStyle = INK;
      }
    }
    ctx.beginPath();
    if (mood === "o") {
      ctx.ellipse(look * 0.5, 3.4, 0.8, 1, 0, 0, TAU);
      ctx.fill();
    } else if (mood === "whee") {
      ctx.arc(look * 0.5, 2.6, 1.5, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
    } else {
      // a small soft smile, a "w" when happy
      if (mood === "happy") {
        ctx.moveTo(look * 0.5 - 1.6, 2.4);
        ctx.quadraticCurveTo(look * 0.5 - 0.8, 3.6, look * 0.5, 2.6);
        ctx.quadraticCurveTo(look * 0.5 + 0.8, 3.6, look * 0.5 + 1.6, 2.4);
      } else ctx.arc(look * 0.5, 2.2, 1.2, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  // A petal from the origin pointing up: round at the tip, narrow at the base
  function petal(g, len, wid) {
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(wid, -len * 0.25, wid * 0.9, -len * 0.95, 0, -len);
    g.bezierCurveTo(-wid * 0.9, -len * 0.95, -wid, -len * 0.25, 0, 0);
    g.closePath();
  }

  // ---- Timing cue and background happenings ------------------------------------------------

  // The timing cue in the garden's look: a ring of little lights closing on (x, y) as a thing's
  // beat comes, d beats to go; inside the perfect window it turns gold and blooms. o.size is its
  // radius on the beat, o.flat squashes it onto a surface, o.color tints it before it turns gold.
  // Drawn only in Flow, once someone's playing or the autopilot is (as the shell's own cue).
  function cue(ctx, api, x, y, d, o = {}) {
    const perfect = o.perfect || 0.1;
    if (api.style === "fidget" || d > 1.6 || d < -perfect || (!api.started && !api.eng.auto)) return;
    const size = o.size || 16, flat = o.flat || 1, color = tone(o.color || C.cream);
    const gold = Math.abs(d) < perfect;
    const r = size * (1 + Math.max(0, d) * 1.5);
    const a = clamp01((1.6 - d) / 0.5);
    const op = ctx.globalCompositeOperation;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, flat);
    ctx.globalCompositeOperation = "lighter";
    const ring = gold ? [[9, 0.22, C.yellow], [3.2, 0.5, C.yellow], [1.4, 1, "#fff6dc"]] : [[5, 0.08, color], [1.4, 0.55, mix(color, "#ffffff", 0.4)]];
    for (const [w, al, c] of ring) {
      ctx.globalAlpha = a * al;
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalCompositeOperation = op;
    // the little lights round it, turning slowly; gold sparkles on the beat
    const n = 8, turn = d * 0.6;
    for (let i = 0; i < n; i++) {
      const t = turn + (i / n) * TAU, px = x + Math.cos(t) * r, py = y + Math.sin(t) * r * flat;
      if (gold) twinkle(ctx, px, py, 8, C.yellow, 1);
      else glow(ctx, px, py, 4, color, a * 0.7);
    }
    if (gold) glow(ctx, x, y, size * 2.2, C.yellow, 0.35);
  }
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // Background happenings: every so often (gap seconds, varied) one of kinds plays out, never the
  // same one twice running. A kind is { dur, layer, init() -> params, draw(ctx, u 0..1, p, t) };
  // the game calls update(dt) and draw(ctx, layer) wherever that layer belongs in its scene.
  function happenings(kinds, o = {}) {
    const gap = o.gap || [7, 15];
    let wait = o.first || 4 + Math.random() * 4, last = -1;
    const live = [];
    const start = (i) => {
      last = i;
      const k = kinds[i];
      live.push({ k, t: 0, p: k.init ? k.init() : {} });
    };
    return (happenings.last = {
      live,
      count: kinds.length,
      start, // start(i): that one now (for looking at them)
      update(dt) {
        for (let i = live.length - 1; i >= 0; i--) if ((live[i].t += dt) >= live[i].k.dur) live.splice(i, 1);
        if ((wait -= dt) > 0) return;
        wait = gap[0] + Math.random() * (gap[1] - gap[0]);
        let i = Math.floor(Math.random() * kinds.length);
        if (i === last && kinds.length > 1) i = (i + 1 + Math.floor(Math.random() * (kinds.length - 1))) % kinds.length;
        start(i);
      },
      draw(ctx, layer = 0) {
        for (const h of live) if ((h.k.layer || 0) === layer) h.k.draw(ctx, h.t / h.k.dur, h.p, h.t);
      }
    });
  }

  // A shooting star from (x0, y0) along (dx, dy) over u 0..1, with a soft tail
  function shootingStar(ctx, x0, y0, dx, dy, u, r = 3, color = C.cream) {
    if (u <= 0 || u >= 1) return;
    const trail = [];
    for (let j = 0; j < 10; j++) {
      const v = Math.max(0, u - j * 0.025);
      trail.push([x0 + dx * v, y0 + dy * v]);
    }
    const op = ctx.globalAlpha;
    ctx.globalAlpha = op * Math.sin(u * Math.PI);
    streak(ctx, trail, r, color);
    ctx.globalAlpha = op;
    twinkle(ctx, x0 + dx * u, y0 + dy * u, r * 3, color, Math.sin(u * Math.PI));
  }

  window.CozySkin = { install, cue, happenings, shootingStar, score, lights, bulbs, callout, streak, glow, layer, sprite, draw, add, mix, mixA, rgba, haloed, stars, tone, blurred, dreamSky, motes, twinkle, softRing, hills, rng, face, petal, ink: INK, colors: C, tiers: TIERS, theme: THEME, words: WORDS };
})();
