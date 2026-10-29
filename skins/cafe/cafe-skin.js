// Cafe skin: a lo-fi café at night, for the space shell (SpaceShell.mount({ skin: CafeSkin })). Forked from
// skins/neon/neon-skin.js: the sprite and layer baking, glow, motes and rings are the neon skin's;
// the palette, the HUD and the parts are new. Warm and low in saturation: a lamp-lit counter, rain
// on the window, steam off the cups, and a soft film grain over everything.
//
// The HUD classes keep the pinball skin's names (pb-bar, pb-window, pb-btn...) so the shell's
// markup reads the same as the other shells. Light is still stamped additively ("lighter") from
// sprites baked once; shadowBlur runs only while baking. The grain is a CSS layer made once from a
// canvas, so it costs the canvas nothing per frame.
//
// CafeSkin.install(options), score(el, n, digits), lights(el, pct, color), bulbs(ctx, W, y, beatPos, flash),
// callout(ctx, text, x, y, color, size, alpha, age), layer, sprite, draw, add, glow(ctx, x, y, r, color, a),
// mix, mixA, rgba, rng, blurred, motes, softRing, twinkle
// For the shell: CafeSkin.theme (its colours and type), words (the keys card) and
// marquee(el, title, hint) (a calm fade-in title and a soft rule in place of the neon flicker).
// Cafe parts:
// CafeSkin.wood(g, x, y, w, h, seed)          bake: a plank of warm wood with grain
// CafeSkin.nightWindow(g, x, y, w, h, seed)    bake: the street at night through glass, city bokeh
// CafeSkin.rain(ctx, x, y, w, h, t, a)          rain falling past the window (clipped to it)
// CafeSkin.beads(ctx, x, y, w, h, t, n)         drops creeping down the glass
// CafeSkin.steam(ctx, x, y, size, t, a)         steam curling up from a cup
// CafeSkin.lamp(ctx, x, y, r, a)                a warm pool of lamplight
// CafeSkin.cat(ctx, x, y, size, o)              Biscuit, the café cat: loaf or sitting, eyes, look, paw, tail
// CafeSkin.cue(ctx, x, y, r, left, perfect, color, squash, w)   the timing ring, gold on the perfect beat
// CafeSkin.street()                             people, cars and weather going by outside (see there)
// CafeSkin.moth(ctx, x, y, r, t, a)             a moth looping round a lamp
(() => {
  "use strict";
  if (window.CafeSkin) return;

  const C = {
    black: "#140e10",
    ink: "#1f1619",
    wood: "#5a3d2c",
    woodDark: "#2e1f19",
    amber: "#f2b56b",
    rose: "#d9a093",
    sage: "#a3b596",
    rain: "#8fa3b5",
    coffee: "#5b3a2a",
    crema: "#c99b6d",
    milk: "#f3e7d3",
    // The pinball names, so the shell's and games' colour words still mean something here
    cream: "#f3e6cf",
    red: "#e0806e",
    orange: "#e9a15c",
    yellow: "#f2c77a",
    magenta: "#d9a093",
    cyan: "#a9c3cf"
  };
  // The tiers drift through the evening: lamp amber, dusty rose, sage, honey
  const TIERS = ["#f2b56b", "#d9a093", "#a3b596", "#e8cf8f"];
  const TONES = { "#ffc400": C.yellow, "#e8231f": C.red, "#f6e6c0": C.cream, "#ff7a00": C.orange, "#2f6bff": TIERS[0], "#1fbf55": TIERS[2], "#ff1f8a": TIERS[1], "#ffd23a": C.yellow, "#ff2bd6": C.rose, "#00f0ff": C.cyan };
  const tone = (c) => TONES[String(c).toLowerCase()] || c;

  const CSS = `
  .pb-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: rgba(28,20,21,.82); border-radius: 14px; padding: 6px 7px 6px 10px; box-shadow: 0 0 0 1px rgba(242,181,107,.16) inset, 0 8px 24px rgba(0,0,0,.35); backdrop-filter: blur(2px); }
  .pb-window { display: inline-flex; align-items: center; background: #1a1213; border-radius: 8px; padding: 3px 8px; box-shadow: 0 0 0 1px rgba(243,230,207,.08) inset; font: 500 16px/1.2 Oswald, Impact, sans-serif; letter-spacing: .08em; color: ${C.cream}; font-variant-numeric: tabular-nums; transition: color .35s, transform .35s cubic-bezier(.34,1.56,.64,1); }
  .pb-window.bump { color: #fff6e6; transform: scale(1.05); transition-duration: .05s; }
  .pb-best { font: 400 10px Inter, system-ui, sans-serif; letter-spacing: .04em; color: #c9b39a; opacity: .7; margin-left: 8px; }
  .pb-label { display: block; font: 500 11px/1.2 Inter, system-ui, sans-serif !important; letter-spacing: .03em; text-transform: lowercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pb-lights { display: flex; gap: 4px; margin-top: 5px; }
  .pb-lights i { position: relative; flex: 1; max-width: 7px; height: 7px; border-radius: 50%; background: #34262a; }
  .pb-lights i::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(#fff4e0, var(--c, ${C.amber}) 70%); box-shadow: 0 0 6px var(--c, ${C.amber}); opacity: 0; transition: opacity .6s cubic-bezier(.2,.7,.3,1); }
  .pb-lights i.on::after { opacity: 1; transition: opacity .1s linear; }
  .pb-btn { white-space: nowrap; font: 500 11px/1 Inter, system-ui, sans-serif !important; letter-spacing: .03em; text-transform: lowercase; color: ${C.cream} !important; background: rgba(243,230,207,.08) !important; border: 0 !important; border-radius: 999px !important; box-shadow: 0 0 0 1px rgba(243,230,207,.18) inset; padding: 6px 10px !important; cursor: pointer; }
  .pb-btn { transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s ease, background-color .2s, color .2s; }
  .pb-btn:hover { background: rgba(243,230,207,.14) !important; }
  .pb-btn:active { transform: scale(.96); transition-duration: .05s; }
  .pb-btn svg { width: 15px; height: 15px; color: currentColor; }
  .pb-icon { display: flex; align-items: center; padding: 5px 7px !important; }
  .pb-bar .pb-btn { color: rgba(243,230,207,.85) !important; background: rgba(255,255,255,.04) !important; padding: 6px 9px !important; }
  .pb-bar .pb-btn.on { color: ${C.black} !important; background: ${C.amber} !important; box-shadow: 0 0 12px rgba(242,181,107,.45); font-weight: 600 !important; }
  .pb-bar .pb-icon { padding: 5px 6px !important; }
  .pb-badge { display: inline-block; font: 600 10px/1 Inter, system-ui, sans-serif; padding: 2px 5px; border-radius: 999px; background: rgba(243,230,207,.1); color: ${C.cream}; opacity: .8; vertical-align: 1px; }
  .pb-badge.ready { background: ${C.amber}; color: ${C.black}; opacity: 1; }
  @media (prefers-reduced-motion: reduce) { .pb-card, .pb-paused, .cf-grain { animation: none !important; } }
  .pb-card { max-width: 24rem; width: 100%; background: #241a1b; color: #e6d6bf; border: 0; border-radius: 18px; box-shadow: 0 0 0 1px rgba(242,181,107,.18) inset, 0 24px 60px rgba(0,0,0,.5); padding: 22px 22px 18px; animation: cf-pop .5s cubic-bezier(.34,1.4,.64,1) both; }
  @keyframes cf-pop { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
  .pb-paused { animation: cf-drop .5s cubic-bezier(.34,1.4,.64,1) both; }
  @keyframes cf-drop { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
  .pb-vignette { position: fixed; inset: 0; z-index: 5; pointer-events: none; background: radial-gradient(ellipse at 50% 42%, transparent 55%, rgba(12,8,9,.55) 100%); }
  .cf-grain { position: fixed; inset: -64px; z-index: 6; pointer-events: none; opacity: .09; mix-blend-mode: overlay; }
  @keyframes cf-grain { 0% { transform: translate(0,0); } 25% { transform: translate(-23px,17px); } 50% { transform: translate(31px,-9px); } 75% { transform: translate(-11px,-29px); } 100% { transform: translate(0,0); } }
  .pb-kicker { font: 600 11px Inter, system-ui, sans-serif; letter-spacing: .2em; text-transform: lowercase; color: ${C.amber}; }
  .pb-title { margin: 6px 0 10px; font: 400 40px/1 Oswald, Impact, sans-serif; letter-spacing: .2em; text-transform: lowercase; color: #fbefdc; text-shadow: 0 0 14px rgba(242,181,107,.55), 0 0 40px rgba(242,181,107,.25); }
  .pb-card .pb-title { color: #fbefdc; }
  .pb-kbd { display: inline-block; min-width: 1.7em; padding: 0 .45em; background: rgba(243,230,207,.1); border: 0; border-radius: 6px; box-shadow: 0 0 0 1px rgba(243,230,207,.2) inset; color: ${C.cream}; font: 500 10px/1.7 Inter, system-ui, sans-serif; text-align: center; text-transform: none; }
  .pb-paused { font: 400 40px/1 Oswald, Impact, sans-serif; letter-spacing: .2em; text-transform: lowercase; color: #fbefdc; text-shadow: 0 0 16px rgba(242,181,107,.5); }
  .pb-sub { margin-top: 10px; font: 400 12px Inter, system-ui, sans-serif; letter-spacing: .03em; text-transform: lowercase; color: #c9b39a; }
  .pb-rows div { display: flex; justify-content: space-between; gap: 12px; margin: 7px 0; font: 400 12px Inter, system-ui, sans-serif; text-transform: lowercase; color: #e6d6bf; }
  .pb-note { margin-top: 10px; font: 400 12px/1.45 Inter, system-ui, sans-serif; color: #a8957f; }
  @media (max-width: 520px) { .pb-bar { gap: 7px; padding: 5px 6px 5px 8px; } .pb-window { font-size: 14px; padding: 2px 6px; } .pb-lights { gap: 3px; } .pb-bar .pb-btn { padding: 5px 7px !important; font-size: 10px !important; } }
  .pb-hint { display: inline-block; max-width: calc(100vw - 32px); padding: 7px 14px; background: rgba(28,20,21,.85); color: ${C.cream}; border-radius: 999px; box-shadow: 0 0 0 1px rgba(242,181,107,.2) inset; font: 400 12px/1.3 Inter, system-ui, sans-serif; letter-spacing: .02em; text-transform: lowercase; }
  /* The shell's own pieces the theme can't say: a slow warm title, a soft rule, a pill-shaped flow check */
  .cf-title { margin: 0 0 14px; font: 400 44px/1 Oswald, Impact, sans-serif; letter-spacing: .2em; text-transform: lowercase; color: #fbefdc; text-shadow: 0 0 14px rgba(242,181,107,.55), 0 0 40px rgba(242,181,107,.25); animation: cf-warm 2.4s ease-out both; }
  .cf-rule { width: 72px; height: 2px; margin: -4px auto 14px; border-radius: 1px; background: linear-gradient(90deg, rgba(242,181,107,0), #f2b56b, rgba(242,181,107,0)); }
  @keyframes cf-warm { 0% { opacity: 0; filter: blur(4px); } 100% { opacity: 1; filter: none; } }
  @media (prefers-reduced-motion: reduce) { .cf-title { animation: none; } }
  .fe-check .fe-check-title { letter-spacing: .12em; }
  .fe-check .fe-check-scale button { border-radius: 999px; }
  .fe-check .fe-check-scale button.on { box-shadow: none; }`;

  // The fonts are the pinball skin's (Oswald and Inter ship in skins/pinball/fonts): one copy
  const here = document.currentScript && document.currentScript.src ? new URL("../pinball/fonts/", document.currentScript.src).href : "../pinball/fonts/";
  const FONTS = `
  @font-face { font-family: Oswald; font-weight: 400 700; font-display: swap; src: url(${here}oswald-latin.woff2) format("woff2"); }
  @font-face { font-family: Inter; font-weight: 400 600; font-display: swap; src: url(${here}inter-latin.woff2) format("woff2"); }`;

  // Film grain: one tile of noise, made once and laid over the page by CSS
  function grainTile() {
    const c = canvasOf(160, 160);
    const g = c.getContext("2d");
    const img = g.createImageData(160, 160);
    const r = rng(11);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (r() + r() - 1) * 110;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function install(options) {
    if (document.getElementById("cf-style")) return;
    const style = document.createElement("style");
    style.id = "cf-style";
    style.textContent = FONTS + CSS;
    document.head.appendChild(style);
    const body = document.body || document.documentElement;
    if (!options || options.vignette !== false) {
      const vignette = document.createElement("div");
      vignette.className = "pb-vignette";
      body.appendChild(vignette);
    }
    if (!options || options.grain !== false) {
      const grain = document.createElement("div");
      grain.className = "cf-grain";
      grain.style.backgroundImage = `url(${grainTile()})`;
      body.appendChild(grain);
    }
  }

  // The score: plain numerals on a little dark slate
  function score(el, n, digits = 4) {
    const str = Math.max(0, Math.floor(n)).toLocaleString("en-US");
    if (el.dataset.pb === str) return;
    const rising = el.dataset.pb !== undefined;
    el.dataset.pb = str;
    el.style.minWidth = digits * 0.62 + "em";
    el.textContent = str;
    if (rising) {
      el.classList.add("bump");
      clearTimeout(el._bump);
      el._bump = setTimeout(() => el.classList.remove("bump"), 90);
    }
  }

  // Ten little lamps for the flow meter
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

  // ---- Sprites and layers, baked at the canvas's device scale (as in the neon skin) ------------
  const sprites = new Map();
  const layers = new Map();
  const TAU = Math.PI * 2;
  let bakeS = 1;
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
  function blurred(g, color, blur, paint) {
    g.save();
    g.shadowColor = color;
    g.shadowBlur = blur * bakeS;
    paint(g);
    g.restore();
  }

  // ---- Shared parts ------------------------------------------------------------------------
  function glow(ctx, x, y, r, color, a = 1) {
    if (a <= 0.01) return;
    color = tone(color);
    const s = sprite(ctx, "glow" + color, 64, 64, 32, 32, (g) => disc(g, 0, 0, 32, radial(g, 0, 0, 0, 32, [[0, rgba(color, 0.55)], [0.35, rgba(color, 0.2)], [1, rgba(color, 0)]])));
    add(ctx, s, x, y, r / 32, a);
  }

  // Along the bottom: a string of warm bulbs on a sagging wire, a soft glow chasing on the eighths
  // (all lit while flash > 0)
  const filament = [];
  let lastBulbs = 0;
  function bulbs(ctx, W, y, beatPos, flash) {
    const step = Math.floor(beatPos * 2);
    const now = performance.now();
    const dt = Math.min(0.1, (now - (lastBulbs || now)) / 1000);
    lastBulbs = now;
    const decay = Math.pow(0.08, dt);
    const span = 56;
    const sag = (x) => 5 * Math.sin(((x % span) / span) * Math.PI);
    const wire = sprite(ctx, "cfwire" + W, W, 14, 0, 4, (g) => {
      g.strokeStyle = "rgba(20,13,12,0.9)";
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(0, 0);
      for (let x = 2; x <= W; x += 2) g.lineTo(x, sag(x));
      g.stroke();
      for (let x = span / 2; x < W; x += span / 2) {
        g.fillStyle = "#3a2b24";
        g.fillRect(x - 1.5, sag(x) - 1, 3, 3);
      }
    });
    draw(ctx, wire, 0, y);
    for (let i = 0, x = span / 2; x < W; i++, x += span / 2) {
      const on = flash > 0 || (i + step) % 4 === 0;
      filament[i] = on ? 1 : Math.max(0.35, (filament[i] || 0.35) * decay);
      const by = y + sag(x) + 4;
      const c = i % 3 === 1 ? C.rose : C.amber;
      glow(ctx, x, by, 9 + 7 * filament[i], c, 0.35 + 0.5 * filament[i]);
      ctx.fillStyle = mix(c, "#fff6e4", 0.4 + 0.4 * filament[i]);
      ctx.globalAlpha = 0.6 + 0.4 * filament[i];
      ctx.fillRect(x - 1.5, by - 1.5, 3, 3.5);
      ctx.globalAlpha = 1;
    }
  }

  // Lettering like chalk lit by the lamp: lower case, a soft dark edge and a faint warm glow,
  // popping in with a little overshoot
  const easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
  const fills = new Map();
  function callout(ctx, text, x, y, color, size = 22, alpha = 1, age) {
    color = tone(color);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (age !== undefined) {
      const k = 0.8 + 0.2 * easeOutBack(Math.min(1, age / 0.25));
      ctx.translate(x, y);
      ctx.scale(k, k);
      ctx.translate(-x, -y);
    }
    const px = Math.round(size * 0.95);
    ctx.font = `600 ${px}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    if ("letterSpacing" in ctx) ctx.letterSpacing = Math.round(px * 0.04) + "px";
    const label = String(text).toLowerCase();
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(20,13,14,0.55)";
    ctx.lineWidth = px * 0.3;
    ctx.strokeText(label, x, y);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(color, 0.18);
    ctx.lineWidth = px * 0.5;
    ctx.strokeText(label, x, y);
    ctx.globalCompositeOperation = "source-over";
    let fill = fills.get(color);
    if (!fill) fills.set(color, (fill = mix(color, "#fff8ec", 0.45)));
    ctx.fillStyle = fill;
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  // Soft light motes drifting through the scene (dust in the lamplight). opts: { n, size, rise, sway, par, alpha, seed }
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
      disc(g, 0, 0, 14, radial(g, 0, 0, 0, 14, [[0, rgba(color, 0.5)], [1, rgba(color, 0)]]));
      const ray = (w, len) => {
        g.beginPath();
        g.moveTo(0, -len);
        g.quadraticCurveTo(w * 0.3, -w * 0.3, len, 0);
        g.quadraticCurveTo(w * 0.3, w * 0.3, 0, len);
        g.quadraticCurveTo(-w * 0.3, w * 0.3, -len, 0);
        g.quadraticCurveTo(-w * 0.3, -w * 0.3, 0, -len);
        g.fill();
      };
      g.fillStyle = rgba(color, 0.5);
      ray(6, 26);
      g.fillStyle = mix(color, "#ffffff", 0.75);
      ray(3, 15);
    });
    add(ctx, s, x, y, r / 32, a);
  }

  // A soft ring of light
  function softRing(ctx, x, y, r, color, a = 1, w = 2) {
    if (a <= 0.01 || r <= 0) return;
    const op = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "lighter";
    for (const [k, al, c] of [[3.5, 0.08, color], [1.6, 0.22, color], [0.6, 0.7, mix(color, "#ffffff", 0.5)]]) {
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

  // ---- Cafe parts --------------------------------------------------------------------------
  // A plank of wood, for baking: a warm gradient and fine grain lines
  function wood(g, x, y, w, h, seed = 3, base = C.wood) {
    const lin = g.createLinearGradient(0, y, 0, y + h);
    lin.addColorStop(0, mix(base, "#f2c38a", 0.18));
    lin.addColorStop(0.15, base);
    lin.addColorStop(1, mix(base, "#120b09", 0.55));
    g.fillStyle = lin;
    g.fillRect(x, y, w, h);
    const r = rng(seed);
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    for (let i = 0; i < h / 3; i++) {
      const gy = y + r() * h, amp = 1 + r() * 2.5, f = 0.004 + r() * 0.01, p = r() * TAU;
      g.strokeStyle = r() < 0.5 ? "rgba(20,10,6,0.18)" : "rgba(255,220,170,0.06)";
      g.lineWidth = 0.6 + r();
      g.beginPath();
      for (let gx = x; gx <= x + w; gx += 8) g[gx === x ? "moveTo" : "lineTo"](gx, gy + Math.sin(gx * f * TAU + p) * amp);
      g.stroke();
    }
    g.fillStyle = "rgba(255,226,180,0.12)";
    g.fillRect(x, y, w, 1);
    g.restore();
  }

  // The street at night through the glass: blue-grey dark, out-of-focus lights of shops and cars,
  // a wet glow along the bottom. For baking into a layer.
  function nightWindow(g, x, y, w, h, seed = 5) {
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    const lin = g.createLinearGradient(0, y, 0, y + h);
    lin.addColorStop(0, "#151a24");
    lin.addColorStop(0.6, "#1f2330");
    lin.addColorStop(1, "#2c2630");
    g.fillStyle = lin;
    g.fillRect(x, y, w, h);
    const r = rng(seed);
    // far buildings, barely there
    g.fillStyle = "rgba(10,12,18,0.55)";
    for (let bx = x - 10; bx < x + w; ) {
      const bw = 30 + r() * 60, bh = h * (0.25 + r() * 0.45);
      g.fillRect(bx, y + h - bh, bw, bh);
      bx += bw + 4 + r() * 10;
    }
    // bokeh: soft discs of warm and cool light
    const cols = ["#f2b56b", "#e9a15c", "#d9a093", "#8fa3b5", "#a3b596", "#f3e6cf"];
    g.globalCompositeOperation = "lighter";
    const n = Math.round((w * h) / 5200) + 6;
    for (let i = 0; i < n; i++) {
      const bx = x + r() * w, by = y + h * (0.3 + r() * 0.65), br = 4 + r() * r() * 22;
      const c = cols[Math.floor(r() * cols.length)];
      g.fillStyle = radial(g, bx, by, 0, br, [[0, rgba(c, 0.26)], [0.7, rgba(c, 0.15)], [1, rgba(c, 0)]]);
      g.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    g.fillStyle = radial(g, x + w * 0.5, y + h * 1.1, 0, w * 0.8, [[0, "rgba(242,181,107,0.18)"], [1, "rgba(242,181,107,0)"]]);
    g.fillRect(x, y, w, h);
    g.globalCompositeOperation = "source-over";
    // the glass: a faint cold sheen across it
    const sheen = g.createLinearGradient(x, y, x + w, y + h);
    sheen.addColorStop(0, "rgba(200,220,240,0.06)");
    sheen.addColorStop(0.5, "rgba(200,220,240,0)");
    sheen.addColorStop(1, "rgba(200,220,240,0.04)");
    g.fillStyle = sheen;
    g.fillRect(x, y, w, h);
    g.restore();
  }

  // Rain falling past the window: thin streaks at three depths, clipped to the glass
  const drops = [];
  {
    const r = rng(23);
    for (let i = 0; i < 70; i++) drops.push({ x: r(), y: r(), d: 0.3 + r() * 0.7 });
  }
  function rain(ctx, x, y, w, h, t, a = 1) {
    ctx.fillStyle = C.rain;
    for (const d of drops) {
      const len = 8 + 16 * d.d, v = 260 + 380 * d.d;
      const span = h + len;
      const dy = (((d.y * span + t * v) % span) + span) % span - len;
      const top = Math.max(0, dy), bottom = Math.min(h, dy + len);
      if (bottom <= top) continue;
      ctx.globalAlpha = a * (0.1 + 0.22 * d.d);
      ctx.fillRect(x + d.x * w - (dy / h) * 6, y + top, 0.6 + 0.6 * d.d, bottom - top);
    }
    ctx.globalAlpha = 1;
  }

  // Drops on the glass, creeping down in little slips. Baked once, moved by t.
  const beadField = [];
  {
    const r = rng(41);
    for (let i = 0; i < 40; i++) beadField.push({ x: r(), y: r(), s: 0.5 + r(), p: 2 + r() * 4, o: r() });
  }
  function beads(ctx, x, y, w, h, t, n = 18) {
    const bead = sprite(ctx, "cfbead", 16, 22, 8, 11, (g) => {
      g.fillStyle = "rgba(10,12,20,0.35)";
      g.beginPath();
      g.ellipse(0, 1, 3.6, 4.6, 0, 0, TAU);
      g.fill();
      g.fillStyle = "rgba(220,230,240,0.35)";
      g.beginPath();
      g.ellipse(0, 0, 3, 4, 0, 0, TAU);
      g.fill();
      g.fillStyle = "rgba(255,248,236,0.75)";
      g.beginPath();
      g.arc(-1, -1.6, 1, 0, TAU);
      g.fill();
    });
    for (let i = 0; i < Math.min(n, beadField.length); i++) {
      const b = beadField[i];
      const slips = Math.floor(t / b.p + b.o);
      const glide = Math.min(1, ((t / b.p + b.o) % 1) * 6);
      const by = (((b.y * h + (slips + glide) * 14 * b.s) % h) + h) % h;
      draw(ctx, bead, x + b.x * w, y + by, b.s);
    }
  }

  // Steam curling up from a cup: puffs rising along a slow wave, fading as they go
  function steam(ctx, x, y, size, t, a = 1) {
    if (a <= 0.01) return;
    for (let i = 0; i < 6; i++) {
      const k = (t * 0.32 + i / 6) % 1;
      const wave = Math.sin(t * 1.4 + k * 5 + i) * size * 0.28 * (0.3 + k);
      const px = x + wave, py = y - k * size * 2.2;
      glow(ctx, px, py, size * (0.35 + k * 0.6), "#f3e7d3", a * 0.5 * Math.sin(k * Math.PI) * (1 - k * 0.4));
    }
  }

  // A warm pool of lamplight
  function lamp(ctx, x, y, r, a = 1) {
    glow(ctx, x, y, r, C.amber, a * 0.55);
    glow(ctx, x, y, r * 0.45, "#ffe2b0", a * 0.35);
  }

  // Biscuit, the café cat: a soft ginger tabby. Drawn live (a dozen small paths), origin at the
  // middle of where it sits, size about its height in loaf pose.
  //   o: { pose: "loaf" | "sit", eyes: "closed" | "open" | "wide" | "happy", look (-1..1), paw (0..1, the
  //        paw on side `side` raised), side (-1 left, 1 right), tail (a phase), breath (a phase), ear (0..1 twitch) }
  const FUR = "#cf9a6c", STRIPE = "#9f6b47", CHEST = "#efdcc2", INK = "#2b1b17", NOSE = "#d98a86";
  function ear(ctx, x, y, u, dir, twitch) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(dir * (0.35 + twitch * 0.35));
    ctx.fillStyle = FUR;
    ctx.beginPath();
    ctx.moveTo(-1.5 * u, 0.6 * u);
    ctx.quadraticCurveTo(-0.6 * u, -2.6 * u, 0.2 * u, -2.9 * u);
    ctx.quadraticCurveTo(1 * u, -1.6 * u, 1.6 * u, 0.6 * u);
    ctx.fill();
    ctx.fillStyle = NOSE;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(-0.7 * u, 0.2 * u);
    ctx.quadraticCurveTo(-0.2 * u, -1.6 * u, 0.2 * u, -1.9 * u);
    ctx.quadraticCurveTo(0.6 * u, -1 * u, 0.8 * u, 0.2 * u);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  function catHead(ctx, x, y, u, o) {
    const r = 3.4 * u;
    ear(ctx, x - 2 * u, y - 2.2 * u, u, -1, o.ear || 0);
    ear(ctx, x + 2 * u, y - 2.2 * u, u, 1, 0);
    ctx.fillStyle = FUR;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.08, r * 0.92, 0, 0, TAU);
    ctx.fill();
    // stripes on the forehead
    ctx.strokeStyle = STRIPE;
    ctx.lineCap = "round";
    ctx.lineWidth = 0.55 * u;
    ctx.beginPath();
    for (const dx of [-1, 0, 1]) {
      ctx.moveTo(x + dx * 0.9 * u, y - r * 0.88);
      ctx.lineTo(x + dx * 0.75 * u, y - r * 0.88 + (dx ? 1 : 1.5) * u);
    }
    ctx.stroke();
    // muzzle
    ctx.fillStyle = CHEST;
    ctx.beginPath();
    ctx.ellipse(x, y + 1.3 * u, 1.9 * u, 1.3 * u, 0, 0, TAU);
    ctx.fill();
    const lx = (o.look || 0) * 0.5 * u;
    ctx.strokeStyle = ctx.fillStyle = INK;
    ctx.lineWidth = 0.42 * u;
    for (const s of [-1, 1]) {
      const ex = x + s * 1.5 * u + lx, ey = y - 0.2 * u;
      ctx.beginPath();
      if (o.eyes === "closed") {
        ctx.arc(ex, ey - 0.3 * u, 0.8 * u, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
      } else if (o.eyes === "happy") {
        ctx.arc(ex, ey + 0.5 * u, 0.8 * u, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
      } else {
        const big = o.eyes === "wide" ? 1.25 : 1;
        ctx.fillStyle = "#c9d68a";
        ctx.ellipse(ex, ey, 0.8 * u * big, 0.9 * u * big, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.ellipse(ex + lx * 0.3, ey, 0.32 * u * big * (o.eyes === "wide" ? 1.5 : 1), 0.78 * u * big, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#fff8ec";
        ctx.beginPath();
        ctx.arc(ex - 0.25 * u, ey - 0.35 * u, 0.2 * u, 0, TAU);
        ctx.fill();
        ctx.fillStyle = INK;
      }
    }
    ctx.fillStyle = NOSE;
    ctx.beginPath();
    ctx.moveTo(x - 0.45 * u + lx * 0.4, y + 0.55 * u);
    ctx.lineTo(x + 0.45 * u + lx * 0.4, y + 0.55 * u);
    ctx.lineTo(x + lx * 0.4, y + 1.05 * u);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.3 * u;
    ctx.beginPath();
    ctx.moveTo(x - 0.8 * u + lx * 0.4, y + 1.4 * u);
    ctx.quadraticCurveTo(x - 0.4 * u + lx * 0.4, y + 1.8 * u, x + lx * 0.4, y + 1.1 * u);
    ctx.quadraticCurveTo(x + 0.4 * u + lx * 0.4, y + 1.8 * u, x + 0.8 * u + lx * 0.4, y + 1.4 * u);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#f6ead8";
    ctx.lineWidth = 0.18 * u;
    ctx.beginPath();
    for (const s of [-1, 1])
      for (const k of [-0.4, 0.15]) {
        ctx.moveTo(x + s * 1.6 * u, y + (1.2 + k) * u);
        ctx.lineTo(x + s * 4.6 * u, y + (0.9 + k * 2.2) * u);
      }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function cat(ctx, x, y, size, o = {}) {
    const u = size / 10;
    const breath = 1 + 0.025 * Math.sin(o.breath || 0);
    ctx.save();
    ctx.lineCap = "round";
    // a soft shadow under the cat
    ctx.fillStyle = "rgba(10,6,6,0.3)";
    ctx.beginPath();
    ctx.ellipse(x, y, (o.pose === "sit" ? 6 : 8.5) * u, 1.1 * u, 0, 0, TAU);
    ctx.fill();
    if (o.pose === "sit") {
      // tail, curling up behind on the far side
      const tw = Math.sin(o.tail || 0);
      ctx.strokeStyle = FUR;
      ctx.lineWidth = 1.5 * u;
      ctx.beginPath();
      ctx.moveTo(x + 3 * u, y - 1 * u);
      ctx.bezierCurveTo(x + 8 * u, y - 1 * u, x + (7 + tw) * u, y - 7 * u, x + (6 + tw * 2) * u, y - 9 * u);
      ctx.stroke();
      ctx.fillStyle = FUR;
      ctx.beginPath();
      ctx.ellipse(x, y - 4.6 * u, 4.6 * u, 4.9 * u * breath, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = CHEST;
      ctx.beginPath();
      ctx.ellipse(x, y - 5 * u, 2.3 * u, 3.4 * u * breath, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = STRIPE;
      ctx.lineWidth = 0.6 * u;
      ctx.beginPath();
      for (const s of [-1, 1]) {
        ctx.moveTo(x + s * 4.3 * u, y - 6 * u);
        ctx.quadraticCurveTo(x + s * 3.4 * u, y - 5.2 * u, x + s * 3.6 * u, y - 4.2 * u);
        ctx.moveTo(x + s * 4.5 * u, y - 3.6 * u);
        ctx.quadraticCurveTo(x + s * 3.6 * u, y - 2.8 * u, x + s * 3.8 * u, y - 1.8 * u);
      }
      ctx.stroke();
      // front legs; the paw on `side` lifts and reaches out
      const side = o.side || -1, paw = Math.max(0, Math.min(1, o.paw || 0));
      ctx.strokeStyle = FUR;
      ctx.lineWidth = 1.7 * u;
      for (const s of [-1, 1]) {
        const sx = x + s * 1.6 * u, sy = y - 4.5 * u;
        let px = x + s * 1.7 * u, py = y - 0.4 * u;
        if (s === side && paw > 0) {
          const a = Math.PI / 2 - side * paw * 1.9;
          px = sx + Math.cos(a) * 4.6 * u;
          py = sy + Math.sin(a) * 4.6 * u;
        }
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.fillStyle = CHEST;
        ctx.beginPath();
        ctx.ellipse(px, py, 1 * u, 0.75 * u, 0, 0, TAU);
        ctx.fill();
      }
      catHead(ctx, x + (o.look || 0) * 0.6 * u, y - 10.6 * u, u, o);
    } else {
      // a loaf: body, tail wrapped round the front, head resting at the front
      ctx.fillStyle = FUR;
      ctx.beginPath();
      ctx.ellipse(x + 1 * u, y - 3.2 * u * breath, 7 * u, 3.4 * u * breath, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = STRIPE;
      ctx.lineWidth = 0.7 * u;
      ctx.beginPath();
      for (const dx of [0, 2.2, 4.4]) {
        ctx.moveTo(x + dx * u, y - 6.3 * u * breath);
        ctx.quadraticCurveTo(x + (dx + 1) * u, y - 4.8 * u, x + (dx + 0.6) * u, y - 3.6 * u);
      }
      ctx.stroke();
      const tw = Math.sin(o.tail || 0) * 0.6;
      ctx.strokeStyle = FUR;
      ctx.lineWidth = 1.5 * u;
      ctx.beginPath();
      ctx.moveTo(x + 7.4 * u, y - 1.6 * u);
      ctx.quadraticCurveTo(x + 6 * u, y + 0.4 * u, x + (1 + tw) * u, y + 0.2 * u);
      ctx.stroke();
      ctx.fillStyle = CHEST;
      ctx.beginPath();
      ctx.ellipse(x - 4.2 * u, y - 0.5 * u, 1.3 * u, 0.7 * u, 0, 0, TAU);
      ctx.ellipse(x - 1.8 * u, y - 0.4 * u, 1.3 * u, 0.7 * u, 0, 0, TAU);
      ctx.fill();
      catHead(ctx, x - 4.6 * u, y - 4.4 * u, u * 0.9, o);
    }
    ctx.restore();
  }

  // ---- Life in the background -------------------------------------------------------------------
  // The timing cue: a soft ring closing on (x, y) as a thing's beat comes (left: beats to go),
  // squashed into the scene's perspective. Inside the perfect window it turns gold and fuller.
  const GOLD = "#ffd36b";
  function cue(ctx, x, y, r, left, perfect, color, squash = 1, w = 2) {
    const gold = Math.abs(left) < perfect;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, squash);
    if (gold) {
      glow(ctx, 0, 0, r * 1.8, GOLD, 0.5);
      softRing(ctx, 0, 0, r * 1.2, GOLD, 1, w * 1.8); // a little bloom, so even a small ring reads
    } else softRing(ctx, 0, 0, r, color, Math.min(1, (2 - left) / 0.6) * 0.9, w);
    ctx.restore();
  }

  // What goes by outside, now and then and never on a beat: people under umbrellas (some in hoods,
  // some in pairs, one now and then with a dog), a car's lights sweeping past, the rain easing off
  // and coming on harder, and once in a long while a far-off flash. Each game makes its own:
  //   const life = CafeSkin.street();  life.update(dt);  life.draw(ctx, x, y, w, h, scale)
  //   life.rain   the rain's strength now (0.45 .. 1.5), for rain() and beads()
  //   life.watch() where something is passing (0 .. 1 across the window), or null: for a cat's eyes
  //   life.flash  a far-off flash (1 .. 0), for anything in the room that should catch it
  const COATS = ["#3a2a2e", "#2c3038", "#3b3326", "#2f2a35", "#33302c"];
  const BRELLAS = ["#7a4b3a", "#4f6670", "#8a7342", "#5d4660", "#6b4f45", null];
  function street() {
    const R = Math.random, pick = (a) => a[Math.floor(R() * a.length)];
    const s = { t: 0, people: [], cars: [], flash: 0, rain: 1, to: 1, wait: { walk: 2 + R() * 4, car: 7 + R() * 8, sky: 14 + R() * 12, bolt: 45 + R() * 45 } };
    s.update = (dt) => {
      s.t += dt;
      const w = s.wait;
      for (const k in w) w[k] -= dt;
      if (w.walk <= 0) {
        w.walk = 6 + R() * 10;
        const dir = R() < 0.5 ? 1 : -1, v = (0.045 + R() * 0.04) * dir, n = R() < 0.22 ? 2 : 1;
        for (let i = 0; i < n; i++) s.people.push({ u: (dir > 0 ? -0.08 : 1.08) - dir * i * 0.06, v, k: i && R() < 0.5 ? 0.66 : 0.88 + R() * 0.18, coat: pick(COATS), brella: pick(BRELLAS), dog: !i && R() < 0.18, ph: R() * 6 });
      }
      if (w.car <= 0) {
        w.car = 9 + R() * 14;
        const dir = R() < 0.5 ? 1 : -1;
        s.cars.push({ u: dir > 0 ? -0.3 : 1.3, v: (0.3 + R() * 0.2) * dir, coat: pick(COATS) });
      }
      if (w.sky <= 0) {
        w.sky = 15 + R() * 20;
        s.to = 0.45 + R() * 1.05;
      }
      if (w.bolt <= 0) {
        w.bolt = 50 + R() * 60;
        if (s.rain > 1) s.flash = 1;
      }
      s.rain += (s.to - s.rain) * Math.min(1, dt * 0.08);
      s.flash = Math.max(0, s.flash - dt * 1.6);
      for (const p of s.people) p.u += p.v * dt;
      for (const c of s.cars) c.u += c.v * dt;
      s.people = s.people.filter((p) => p.u > -0.3 && p.u < 1.3);
      s.cars = s.cars.filter((c) => c.u > -0.5 && c.u < 1.5);
    };
    s.watch = () => {
      for (const p of s.cars.concat(s.people)) if (p.u > 0.05 && p.u < 0.95) return p.u;
      return null;
    };
    s.draw = (ctx, x, y, w, h, scale = 0.25) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      const gy = y + h * 0.97, ph = h * scale;
      for (const c of s.cars) {
        const cx = x + c.u * w, len = ph * 1.5, dir = Math.sign(c.v), front = cx + dir * len * 0.5;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = c.coat;
        ctx.beginPath();
        ctx.roundRect(cx - len / 2, gy - ph * 0.42, len, ph * 0.3, ph * 0.08);
        ctx.roundRect(cx - len * 0.28, gy - ph * 0.6, len * 0.5, ph * 0.22, ph * 0.08);
        ctx.fill();
        ctx.globalAlpha = 1;
        glow(ctx, front + dir * ph * 0.7, gy - ph * 0.12, ph * 1.4, "#ffe2b0", 0.35);
        glow(ctx, front, gy - ph * 0.3, ph * 0.35, "#fff1d0", 0.9);
        glow(ctx, cx - dir * len * 0.5, gy - ph * 0.3, ph * 0.22, "#e0806e", 0.7);
      }
      for (const p of s.people) {
        const px = x + p.u * w, k = ph * p.k, step = Math.sin(s.t * 9 + p.ph);
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = p.coat;
        ctx.fillRect(px - k * 0.06 + step * k * 0.05, gy - k * 0.32, k * 0.05, k * 0.32);
        ctx.fillRect(px + k * 0.01 - step * k * 0.05, gy - k * 0.32, k * 0.05, k * 0.32);
        ctx.beginPath();
        ctx.roundRect(px - k * 0.12, gy - k * 0.82, k * 0.24, k * 0.54, k * 0.08);
        ctx.arc(px, gy - k * 0.9, k * 0.085, 0, TAU);
        ctx.fill();
        if (p.dog) {
          const dir = Math.sign(p.v), dx = px + dir * k * 0.45;
          ctx.beginPath();
          ctx.ellipse(dx, gy - k * 0.14, k * 0.13, k * 0.06, 0, 0, TAU);
          ctx.arc(dx + dir * k * 0.13, gy - k * 0.2, k * 0.05, 0, TAU);
          ctx.fill();
          ctx.fillRect(dx - k * 0.1 + step * k * 0.02, gy - k * 0.12, k * 0.025, k * 0.12);
          ctx.fillRect(dx + k * 0.07 - step * k * 0.02, gy - k * 0.12, k * 0.025, k * 0.12);
        }
        if (p.brella) {
          // the umbrella, its rim caught by the street lamps
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = p.brella;
          ctx.beginPath();
          ctx.ellipse(px, gy - k * 1.0, k * 0.34, k * 0.17, 0, Math.PI, TAU);
          ctx.fill();
          ctx.strokeStyle = mix(p.brella, "#ffd9a0", 0.45);
          ctx.lineWidth = Math.max(1, k * 0.025);
          ctx.beginPath();
          ctx.ellipse(px, gy - k * 1.0, k * 0.34, k * 0.17, 0, Math.PI * 1.05, Math.PI * 1.6);
          ctx.stroke();
          ctx.strokeStyle = p.coat;
          ctx.beginPath();
          ctx.moveTo(px, gy - k * 1.0);
          ctx.lineTo(px, gy - k * 0.72);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      if (s.flash > 0) {
        // a far-off flash: twice, the second softer
        const f = s.flash > 0.7 ? (s.flash - 0.7) / 0.3 : s.flash < 0.5 ? s.flash * 0.6 : 0;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = f * 0.22;
        ctx.fillStyle = "#cfd8f0";
        ctx.fillRect(x, y, w, h);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };
    return s;
  }

  // A moth that finds a lamp now and then: a pale fleck looping round it, on its own clock.
  // a fades it in and out; the games decide when one comes.
  function moth(ctx, x, y, r, t, a = 1) {
    if (a <= 0.01) return;
    const mx = x + Math.cos(t * 2.1) * r + Math.sin(t * 5.3) * r * 0.35;
    const my = y + Math.sin(t * 2.9) * r * 0.55 + Math.cos(t * 7.1) * r * 0.2;
    glow(ctx, mx, my, 9, "#ffe2b0", a * 0.6);
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = "#f3e6cf";
    ctx.fillRect(mx - 1.5, my - 1 + Math.sin(t * 40), 3, 2);
    ctx.globalAlpha = 1;
  }

  // The shell's colours (its CSS variables): dark roast, cream, lamp amber, no glow to speak of
  const theme = {
    bg: C.black, text: "#f3e6cf", text2: "#e6d6bf", c1: C.amber, c2: C.amber, veil: "rgba(20,14,16,.78)", panel: "#241a1b", line: "rgba(242,181,107,.2)", glow: "rgba(242,181,107,.08)", dim: "#a8957f",
    head: "Inter, system-ui, sans-serif", headCase: "lowercase", headGlow: "none"
  };
  // The keys card in café words: a tap and a trick, not fire and a charge shot
  const words = { fire: "Tap", charge: "Trick (just for fun)" };

  // The attract marquee: the title fades in warm instead of flickering on like a sign
  function marquee(el, title, hint) {
    el.innerHTML = `<div class="cf-title">${title}</div><div class="cf-rule"></div><span class="pb-hint">${hint || "tap on the beat"}</span>`;
  }

  window.CafeSkin = { install, theme, words, marquee, cue, street, moth, score, lights, bulbs, callout, glow, layer, sprite, draw, add, mix, mixA, rgba, rng, blurred, motes, twinkle, softRing, wood, nightWindow, rain, beads, steam, lamp, cat, tone, colors: C, tiers: TIERS };
})();
