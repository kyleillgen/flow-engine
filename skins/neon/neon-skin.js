// Neon skin: deep space and light tubes, the look of the space shell (shell/space-shell.js).
// The HUD classes keep the pinball skin's names (pb-bar, pb-window, pb-btn...) so the markup
// reads the same in both shells. On the canvas: a baked nebula, a parallax starfield that
// stretches into warp, and a perspective floor that rolls one line per beat.
//
// Neon is light added to darkness, so everything bright is stamped additively ("lighter") from
// sprites baked once with their glow. shadowBlur runs only while baking, never per frame.
//
// NeonSkin.install(options), score(el, n, digits), lights(el, pct, color), bulbs(ctx, W, y, beatPos, flash),
// callout(ctx, text, x, y, color, size, alpha, age), layer, sprite, draw, add (draw as light),
// glow(ctx, x, y, r, color, a), streak(ctx, trail, r, color), playfield(g, W, H, tier), mix, rgba
// Space parts:
// NeonSkin.haloed(g, color, paint)          inside a sprite's paint: paint(g, color, core) runs as
//                                           wide glow, tube and hot core (core true: draw thinner)
// NeonSkin.stars(ctx, W, H, warp)           the moving starfield; warp 0..1 stretches it into streaks
// NeonSkin.grid(ctx, W, H, top, beatPos, color)  the perspective floor from y = top down
// NeonSkin.tone(color)                      a pinball colour's neon counterpart
(() => {
  "use strict";
  if (window.NeonSkin) return;

  const C = {
    black: "#05030f",
    ink: "#0b0724",
    cyan: "#00f0ff",
    magenta: "#ff2bd6",
    violet: "#8a5cff",
    lime: "#39ff88",
    // The pinball names, so the shell's and games' colour words still mean something here
    cream: "#eafcff",
    red: "#ff2b6a",
    orange: "#ff8a2b",
    yellow: "#ffd23a",
    segOn: "#5ff7ff",
    segOff: "#0c1830"
  };
  // Softer than the tubes: the tiers drift through a dreamy sky (ice, mint, rose, honey)
  const TIERS = ["#7fe9ff", "#8dffc4", "#ff8fd8", "#ffc46b"];
  // The shell speaks in pinball colours (yellow for news, red for replay, cream for notes)
  const TONES = { "#ffc400": C.yellow, "#e8231f": C.red, "#f6e6c0": C.cream, "#ff7a00": C.orange, "#2f6bff": TIERS[0], "#1fbf55": TIERS[1], "#ff1f8a": TIERS[2] };
  const tone = (c) => TONES[String(c).toLowerCase()] || c;

  const CSS = `
  .pb-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: linear-gradient(rgba(18,11,46,.88), rgba(6,4,20,.92)); border-radius: 12px; padding: 6px 7px 6px 8px; box-shadow: 0 0 0 1px rgba(0,240,255,.38), 0 0 14px rgba(0,240,255,.18), 0 0 34px rgba(255,43,214,.12), 0 10px 28px rgba(0,0,0,.5); }
  .pb-window { display: inline-flex; align-items: center; background: #020108; border-radius: 6px; padding: 4px 6px; line-height: 0; box-shadow: 0 0 0 1px rgba(0,240,255,.2) inset, 0 1px 3px rgba(0,0,0,.8) inset; }
  .pb-window svg { filter: drop-shadow(0 0 2px rgba(0,240,255,.9)) drop-shadow(0 0 6px rgba(0,240,255,.4)); transition: filter .35s ease-out, transform .35s cubic-bezier(.34,1.56,.64,1); }
  .pb-window.bump svg { filter: drop-shadow(0 0 2px #fff) drop-shadow(0 0 9px ${C.cyan}); transform: scale(1.06); transition-duration: .04s; }
  .pb-best { font: 500 10px Oswald, Impact, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #8fefff; opacity: .55; margin-left: 8px; }
  .pb-label { display: block; font: 500 11px/1.15 Oswald, Impact, sans-serif !important; letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 0 8px currentColor; }
  .pb-lights { display: flex; gap: 4px; margin-top: 5px; }
  .pb-lights i { position: relative; flex: 1; max-width: 11px; height: 4px; border-radius: 2px; background: #140e33; }
  .pb-lights i::after { content: ""; position: absolute; inset: 0; border-radius: 2px; background: linear-gradient(#fff, var(--c, ${C.cyan}) 70%); box-shadow: 0 0 5px var(--c, ${C.cyan}), 0 0 11px var(--c, ${C.cyan}); opacity: 0; transition: opacity .45s cubic-bezier(.2,.7,.3,1); }
  .pb-lights i.on::after { opacity: 1; transition: opacity .06s linear; }
  .pb-btn { white-space: nowrap; font: 600 11px/1 Oswald, Impact, sans-serif !important; letter-spacing: .12em; text-transform: uppercase; color: ${C.cream} !important; background: rgba(0,240,255,.08) !important; border: 0 !important; border-radius: 8px !important; box-shadow: 0 0 0 1px rgba(0,240,255,.5) inset, 0 0 10px rgba(0,240,255,.15); padding: 6px 9px !important; cursor: pointer; }
  .pb-btn { transition: transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s ease, background-color .2s, color .2s; }
  .pb-btn:hover { background: rgba(0,240,255,.16) !important; box-shadow: 0 0 0 1px rgba(0,240,255,.8) inset, 0 0 16px rgba(0,240,255,.3); }
  .pb-btn:active { transform: scale(.97); transition-duration: .05s; }
  .pb-btn svg { width: 15px; height: 15px; color: currentColor; }
  .pb-icon { display: flex; align-items: center; padding: 5px 7px !important; }
  .pb-bar .pb-btn { color: rgba(234,252,255,.86) !important; background: rgba(255,255,255,.035) !important; box-shadow: 0 0 0 1px rgba(0,240,255,.24) inset; font-weight: 500 !important; padding: 6px 8px !important; }
  .pb-bar .pb-btn:hover { background: rgba(0,240,255,.1) !important; box-shadow: 0 0 0 1px rgba(0,240,255,.5) inset, 0 0 12px rgba(0,240,255,.2); }
  .pb-bar .pb-btn.on { color: ${C.black} !important; background: ${C.magenta} !important; box-shadow: 0 0 0 1px #ff9bec inset, 0 0 14px rgba(255,43,214,.6); font-weight: 600 !important; }
  .pb-bar .pb-icon { padding: 5px 6px !important; }
  .pb-badge { display: inline-block; font: 600 9px/1 Oswald, Impact, sans-serif; letter-spacing: .1em; text-transform: uppercase; padding: 2px 4px; border-radius: 4px; background: rgba(0,240,255,.12); color: ${C.cream}; opacity: .8; vertical-align: 1px; }
  .pb-badge.ready { background: ${C.yellow}; color: ${C.black}; opacity: 1; box-shadow: 0 0 10px rgba(255,210,58,.6); }
  @media (prefers-reduced-motion: reduce) { .pb-card, .pb-paused { animation: none !important; } }
  .pb-card { max-width: 24rem; width: 100%; background: linear-gradient(#140b34, #07051a); color: #cfe9ff; border: 0; border-radius: 16px; box-shadow: 0 0 0 1px rgba(0,240,255,.42), 0 0 24px rgba(0,240,255,.18), 0 0 60px rgba(255,43,214,.14), 0 24px 60px rgba(0,0,0,.6); padding: 22px 22px 18px; animation: nn-pop .45s cubic-bezier(.34,1.56,.64,1) both; }
  @keyframes nn-pop { from { opacity: 0; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: none; } }
  .pb-paused { animation: nn-drop .45s cubic-bezier(.34,1.56,.64,1) both; }
  @keyframes nn-drop { from { opacity: 0; transform: translateY(-14px) scale(.94); } to { opacity: 1; transform: none; } }
  /* A static vignette: one layer, never redrawn */
  .pb-vignette { position: fixed; inset: 0; z-index: 5; pointer-events: none; background: radial-gradient(ellipse at 50% 45%, transparent 58%, rgba(2,1,8,.5) 100%); }
  .pb-kicker { font: 600 11px Oswald, Impact, sans-serif; letter-spacing: .3em; text-transform: uppercase; color: ${C.magenta}; text-shadow: 0 0 8px ${C.magenta}; }
  .pb-title { margin: 6px 0 10px; font: 600 38px/1 Oswald, Impact, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: #f4feff; text-shadow: 0 0 3px #fff, 0 0 10px ${C.cyan}, 0 0 22px ${C.cyan}, 0 0 44px ${C.magenta}, 0 0 80px ${C.magenta}; }
  .pb-card .pb-title { color: #fff; }
  .pb-kbd { display: inline-block; min-width: 1.7em; padding: 0 .4em; background: rgba(0,240,255,.1); border: 0; border-radius: 5px; box-shadow: 0 0 0 1px rgba(0,240,255,.4) inset; color: ${C.cream}; font: 600 10px/1.6 Oswald, Impact, sans-serif; letter-spacing: .04em; text-align: center; text-transform: none; }
  .pb-paused { font: 600 40px/1 Oswald, Impact, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #f4feff; text-shadow: 0 0 3px #fff, 0 0 12px ${C.cyan}, 0 0 30px ${C.magenta}; }
  .pb-sub { margin-top: 10px; font: 500 12px Oswald, Impact, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: #9fdcff; opacity: .8; }
  .pb-rows div { display: flex; justify-content: space-between; gap: 12px; margin: 7px 0; font: 500 12px Oswald, Impact, sans-serif; letter-spacing: .06em; text-transform: uppercase; color: #cfe9ff; }
  .pb-note { margin-top: 10px; font: 400 12px/1.45 Inter, system-ui, sans-serif; color: #8aa4c8; }
  @media (max-width: 520px) { .pb-bar { gap: 7px; padding: 5px 6px; } .pb-window { padding: 3px 5px; } .pb-window svg { width: auto; height: 17px; } .pb-lights { gap: 2px; } .pb-btn { padding: 5px 7px !important; } .pb-bar .pb-btn { padding: 5px 6px !important; font-size: 10px !important; } }
  @media (max-width: 360px) { .pb-label { letter-spacing: .03em; } .pb-window svg { height: 15px; } }
  .pb-hint { display: inline-block; max-width: calc(100vw - 32px); padding: 6px 12px; background: rgba(6,4,20,.82); color: ${C.cream}; border-radius: 999px; box-shadow: 0 0 0 1px rgba(0,240,255,.38) inset, 0 0 14px rgba(0,240,255,.15); font: 500 11px/1.3 Oswald, Impact, sans-serif; letter-spacing: .1em; text-transform: uppercase; }
  .pb-hint .pb-kbd { background: rgba(0,240,255,.14); color: ${C.cream}; }`;

  // The fonts are the pinball skin's (Oswald and Inter ship in skins/pinball/fonts): one copy
  const here = document.currentScript && document.currentScript.src ? new URL("../pinball/fonts/", document.currentScript.src).href : "../pinball/fonts/";
  const FONTS = `
  @font-face { font-family: Oswald; font-weight: 400 700; font-display: swap; src: url(${here}oswald-latin.woff2) format("woff2"); }
  @font-face { font-family: Inter; font-weight: 400 600; font-display: swap; src: url(${here}inter-latin.woff2) format("woff2"); }`;

  function install(options) {
    if (document.getElementById("nn-style")) return;
    const style = document.createElement("style");
    style.id = "nn-style";
    style.textContent = FONTS + CSS;
    document.head.appendChild(style);
    if (options && options.vignette === false) return;
    const vignette = document.createElement("div");
    vignette.className = "pb-vignette";
    (document.body || document.documentElement).appendChild(vignette);
  }

  // 7-segment digits, as on a vacuum-fluorescent display: lit segments glow cyan (the glow is a
  // CSS filter on the whole number, so it costs nothing until the number changes)
  const SEGS = { a: [2, 0, 8, 2], b: [10, 2, 2, 8], c: [10, 12, 2, 8], d: [2, 20, 8, 2], e: [0, 12, 2, 8], f: [0, 2, 2, 8], g: [2, 10, 8, 2] };
  const DIGITS = ["abcdef", "bc", "abged", "abgcd", "fgbc", "afgcd", "afgedc", "abc", "abcdefg", "abcdfg"];
  function digitSvg(ch, x) {
    const on = ch === " " ? "" : DIGITS[+ch];
    return Object.entries(SEGS)
      .map(([k, [sx, sy, w, h]]) => `<rect x="${x + sx}" y="${sy}" width="${w}" height="${h}" rx="1" fill="${on.includes(k) ? C.segOn : C.segOff}"/>`)
      .join("");
  }
  function score(el, n, digits = 4) {
    const str = String(Math.max(0, Math.floor(n))).slice(-digits).padStart(digits, " ");
    if (el.dataset.pb === str) return;
    const rising = el.dataset.pb !== undefined && +str > +el.dataset.pb;
    el.dataset.pb = str;
    if (rising) {
      el.classList.add("bump");
      clearTimeout(el._bump);
      el._bump = setTimeout(() => el.classList.remove("bump"), 90);
    }
    const w = digits * 15;
    el.innerHTML = `<svg width="${w * 1.05}" height="22" viewBox="0 0 ${w} 22" aria-label="${n}"><g transform="skewX(-8) translate(3 0)">${[...str].map((ch, i) => digitSvg(ch, i * 15)).join("")}</g></svg>`;
  }

  // Ten light bars for the flow meter
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
  const hex2 = (v) => Math.round(v).toString(16).padStart(2, "0");
  // A mix of two colours, as hex, so it can go straight into glow(), rgba() or mix() again
  function mix(a, b, t) {
    if (!isHex(a) || !isHex(b)) return a;
    const [r1, g1, b1] = rgb(a);
    const [r2, g2, b2] = rgb(b);
    return "#" + hex2(r1 + (r2 - r1) * t) + hex2(g1 + (g2 - g1) * t) + hex2(b1 + (b2 - b1) * t);
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

  // ---- The sky -----------------------------------------------------------------------------
  // Deep space tinted by tier: a dark gradient, a few nebula clouds of light, and still stars
  // (the brightest with a four-point glint). Baked once per tier and size through layer().
  function playfield(g, W, H, tier = 1) {
    const hue = TIERS[(tier - 1) % 4];
    const lin = g.createLinearGradient(0, 0, 0, H);
    lin.addColorStop(0, "#03020b");
    lin.addColorStop(0.55, mix("#0a0626", hue, 0.06));
    lin.addColorStop(1, mix("#150a3a", hue, 0.14));
    g.fillStyle = lin;
    g.fillRect(0, 0, W, H);
    const r = rng(1979 + tier * 31);
    g.globalCompositeOperation = "lighter";
    const clouds = [hue, C.violet, C.magenta, hue];
    for (let i = 0; i < 5; i++) {
      const x = W * (0.1 + r() * 0.8), y = H * (0.08 + r() * 0.6), rad = Math.max(W, H) * (0.25 + r() * 0.3);
      const c = clouds[i % clouds.length];
      g.fillStyle = radial(g, x, y, 0, rad, [[0, rgba(c, 0.13)], [0.5, rgba(c, 0.05)], [1, rgba(c, 0)]]);
      g.fillRect(0, 0, W, H);
    }
    const s = rng(42);
    const n = Math.round((W * H) / 2400);
    for (let i = 0; i < n; i++) {
      const x = s() * W, y = s() * H, b = s(), size = 0.5 + b * b * 1.4;
      g.fillStyle = b > 0.85 ? mix(C.cyan, "#ffffff", 0.7) : b > 0.7 ? mix(C.magenta, "#ffffff", 0.75) : "#ffffff";
      g.globalAlpha = 0.18 + b * 0.7;
      g.fillRect(x, y, size, size);
      if (b > 0.97) {
        g.globalAlpha = 0.5;
        g.fillStyle = radial(g, x, y, 0, 9, [[0, "rgba(200,250,255,0.6)"], [1, "rgba(200,250,255,0)"]]);
        g.fillRect(x - 9, y - 9, 18, 18);
        g.fillStyle = "rgba(220,250,255,0.7)";
        g.fillRect(x - 7, y + 0.2, 14, 0.6);
        g.fillRect(x + 0.2, y - 7, 0.6, 14);
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.save();
    g.translate(W / 2, H * 0.45);
    g.scale(1, H / W);
    g.fillStyle = radial(g, 0, 0, W * 0.35, W * 0.85, [[0, "rgba(2,1,8,0)"], [1, "rgba(2,1,8,0.55)"]]);
    g.fillRect(-W, -W, W * 2, W * 2);
    g.restore();
  }

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

  // The floor: a dark plane from the horizon down, with a perspective grid of light whose
  // cross lines roll toward you, one per beat, and a bright horizon line
  // soft (0..1) turns the lines down and lets a warm mist lie over the far half, for dreamy scenes
  function grid(ctx, W, H, top, beatPos, color = C.magenta, soft = 0) {
    const h = H - top;
    if (h < 8) return;
    const floor = sprite(ctx, "floor" + W + "x" + Math.round(h) + color + soft, W, h + 30, 0, 30, (g) => {
      const lin = g.createLinearGradient(0, 0, 0, h);
      lin.addColorStop(0, mix("#07041a", color, 0.1 * soft));
      lin.addColorStop(1, mix("#0d0628", color, 0.12 + 0.06 * soft));
      g.fillStyle = lin;
      g.fillRect(0, 0, W, h);
      // Haze rising off the horizon
      const haze = g.createLinearGradient(0, -30, 0, 26 + h * 0.3 * soft);
      haze.addColorStop(0, rgba(color, 0));
      haze.addColorStop(0.5, rgba(color, 0.32 - 0.08 * soft));
      haze.addColorStop(1, rgba(color, 0));
      g.fillStyle = haze;
      g.fillRect(0, -30, W, 56 + h * 0.3 * soft);
      g.fillStyle = mix(color, "#ffffff", 0.6);
      g.globalAlpha = 1 - 0.4 * soft;
      g.fillRect(0, -0.75, W, 1.5);
      g.globalAlpha = 1;
    });
    draw(ctx, floor, 0, top);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = color;
    if (soft) {
      // Fade the lines in from the mist: the far ones barely there, the near ones gentle
      ctx.beginPath();
      ctx.rect(0, top, W, h);
      ctx.clip();
    }
    const dim = 1 - 0.45 * soft;
    // Cross lines at depths z = 1..9, one more arriving from the horizon each beat
    const far = 9;
    const frac = beatPos - Math.floor(beatPos);
    for (let i = 0; i < far; i++) {
      const z = i + 1 - frac;
      if (z <= 0.35) continue;
      const f = (1 / z - 1 / far) / (1 / 0.35 - 1 / far);
      const y = top + h * f;
      const a = Math.min(1, 0.12 + f * 1.1) * dim * (soft ? Math.min(1, f * 2.2) : 1);
      ctx.globalAlpha = a * 0.22;
      ctx.lineWidth = 2 + 5 * f;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      ctx.globalAlpha = a * 0.85;
      ctx.lineWidth = 0.6 + 1.2 * f;
      ctx.stroke();
    }
    // Rails converging on a point above the horizon
    const vx = W / 2, vy = top - h * 0.6;
    const k = (top - vy) / (H - vy);
    for (const [w, a] of [[4, 0.16], [1.1, 0.6]]) {
      ctx.globalAlpha = a * dim;
      ctx.lineWidth = w;
      ctx.beginPath();
      for (let i = -8; i <= 8; i++) {
        const xb = W / 2 + i * W * 0.16;
        ctx.moveTo(vx + (xb - vx) * k, top);
        ctx.lineTo(xb, H);
      }
      ctx.stroke();
    }
    if (soft) {
      // The mist over the far floor, baked once
      const mist = sprite(ctx, "mist" + W + "x" + Math.round(h) + color, W, h, 0, 0, (g) => {
        const lin = g.createLinearGradient(0, 0, 0, h * 0.6);
        lin.addColorStop(0, mixA("#140c34", color, 0.3, 0.8));
        lin.addColorStop(0.08, mixA("#140c34", color, 0.18, 0.6));
        lin.addColorStop(1, mixA("#140c34", color, 0.1, 0));
        g.fillStyle = lin;
        g.fillRect(0, 0, W, h * 0.6);
      });
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = soft;
      draw(ctx, mist, 0, top);
    }
    ctx.restore();
  }

  // ---- Shared parts ------------------------------------------------------------------------
  function glow(ctx, x, y, r, color, a = 1) {
    if (a <= 0.01) return;
    color = tone(color);
    const s = sprite(ctx, "glow" + color, 64, 64, 32, 32, (g) => disc(g, 0, 0, 32, radial(g, 0, 0, 0, 32, [[0, rgba(color, 0.6)], [0.3, rgba(color, 0.24)], [1, rgba(color, 0)]])));
    add(ctx, s, x, y, r / 32, a);
  }

  // Along the bottom: a dark rail with a thin line of light, and dashes that chase on the
  // eighth notes (all lit while flash > 0)
  const DASH = ["#7fe9ff", "#ff8fd8", "#b69cff"];
  const filament = [];
  let lastBulbs = 0;
  function bulbs(ctx, W, y, beatPos, flash) {
    const step = Math.floor(beatPos * 2);
    const now = performance.now();
    const dt = Math.min(0.1, (now - (lastBulbs || now)) / 1000);
    lastBulbs = now;
    const decay = Math.pow(0.01, dt);
    const row = sprite(ctx, "nnrow" + W, W, 18, 0, 9, (g) => {
      const lin = g.createLinearGradient(0, -9, 0, 9);
      lin.addColorStop(0, "#0a0620");
      lin.addColorStop(1, "#020108");
      g.fillStyle = lin;
      g.fillRect(0, -9, W, 18);
      g.fillStyle = rgba(C.cyan, 0.35);
      g.fillRect(0, -9, W, 1);
      g.fillStyle = "rgba(255,255,255,0.05)";
      for (let x = 11; x < W; x += 22) g.fillRect(x - 5, -1, 10, 2);
    });
    draw(ctx, row, 0, y);
    for (let i = 0, x = 11; x < W; i++, x += 22) {
      const on = flash > 0 || (i + step) % 3 === 0;
      filament[i] = on ? 1 : (filament[i] || 0) * decay;
      if (filament[i] < 0.03) continue;
      const color = DASH[Math.floor(i / 3) % 3];
      const lit = sprite(ctx, "dash" + color, 40, 24, 20, 12, (g) =>
        haloed(g, color, (g, c, core) => {
          g.fillStyle = c;
          g.fillRect(core ? -4 : -5, core ? -0.6 : -1.2, core ? 8 : 10, core ? 1.2 : 2.4);
        })
      );
      add(ctx, lit, x, y, 1, filament[i]);
    }
  }

  // Lettering lit like a sign: a wide halo, a tube stroke and a bright fill, popping in with a
  // little overshoot
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
    const px = Math.round(size * 0.9);
    ctx.font = `600 ${px}px Oswald, Impact, sans-serif`;
    ctx.textAlign = "center";
    if ("letterSpacing" in ctx) ctx.letterSpacing = Math.round(px * 0.1) + "px";
    const label = String(text).toUpperCase();
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(color, 0.14);
    ctx.lineWidth = px * 0.75;
    ctx.strokeText(label, x, y);
    ctx.strokeStyle = rgba(color, 0.3);
    ctx.lineWidth = px * 0.38;
    ctx.strokeText(label, x, y);
    ctx.strokeStyle = rgba(color, 0.9);
    ctx.lineWidth = px * 0.12;
    ctx.strokeText(label, x, y);
    ctx.globalCompositeOperation = "source-over";
    let fill = fills.get(color);
    if (!fill) fills.set(color, (fill = mix(color, "#ffffff", 0.75)));
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

  window.NeonSkin = { install, score, lights, bulbs, callout, streak, glow, layer, sprite, draw, add, playfield, mix, mixA, rgba, haloed, stars, grid, tone, blurred, dreamSky, motes, twinkle, softRing, hills, rng, colors: C, tiers: TIERS,
    words: { auto: "Stop for a few seconds and it flies itself, without scoring. Any input takes over again." } };
})();
