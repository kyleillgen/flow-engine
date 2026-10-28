// Arcade skin: a late-night arcade cabinet with a really good monitor, the look the Arcade cartridge's
// games pass to the space shell (mount({ skin: ArcadeSkin, marquee: ArcadeSkin.attract })). The
// HUD classes keep the pinball and neon skins' names (pb-bar, pb-window, pb-btn...) so the
// markup reads the same in every shell. Forked from the neon skin
// (skins/neon) for the Arcade cartridge: the light-stamping parts are the same; the type, the
// score and the sprites are pixels.
//
// Phosphor is light added to darkness, so everything bright is stamped additively ("lighter")
// from sprites baked once with their glow. shadowBlur runs only while baking, never per frame.
// The scanlines and the curved glass are a CSS overlay, so they cost no canvas time at all.
//
// ArcadeSkin.install(options), score(el, n, digits), lights(el, pct, color), bulbs(ctx, W, y, beatPos, flash),
// callout(ctx, text, x, y, color, size, alpha, age), layer, sprite, draw, add, glow, streak, mix, mixA,
// rgba, haloed, blurred, twinkle, softRing, rng, tone, colors, tiers
// Arcade parts:
// ArcadeSkin.pix(ctx, key, rows, pal, k, o)   a pixel sprite from strings (one char a pixel, "." is
//                                             empty, pal maps chars to #rrggbb), baked k CSS px a
//                                             pixel with bloom, a key light and rim light.
//                                             o: { glow: color | false, bloom: px, light: 0..1 }
// ArcadeSkin.text(ctx, str, x, y, px, color, o)  pixel-font lettering, baked; o: { align, chrome, alpha }
// ArcadeSkin.textWidth(str, px)
// ArcadeSkin.marquee(canvas, title, cssWidth)  the attract logo: chrome pixel letters, hard shadow
// ArcadeSkin.attract(el, title, hint)  fills the shell's attract marquee (pass as mount's marquee):
//                                      the logo, a blinking FREE PLAY and the hint, resized with the window
// ArcadeSkin.theme, words               the space shell's colours (HUD, pause, flow check) and keys-card wording for the cabinet
// ArcadeSkin.shards(list, x, y, n, colors, speed)  push pixel shards; drawShards(ctx, list, dt)
// ArcadeSkin.happenings(kinds)          background life: every 7 to 15 s one of kinds ({ dur, draw(ctx, e, u, ...) })
//                                      plays, picked at random, never the same one twice running.
//                                      Returns { update(dt), draw(ctx, ...args) }
(() => {
  "use strict";
  if (window.ArcadeSkin) return;

  const C = {
    black: "#07060d",
    ink: "#120b22",
    bezel: "#1a1030",
    cyan: "#3df5ff",
    pink: "#ff4f9a",
    magenta: "#ff4f9a",
    violet: "#9b6bff",
    lime: "#7dff5a",
    amber: "#ffb43d",
    // The pinball names, so the shell's colour words still mean something here
    cream: "#fff4e0",
    red: "#ff4f6a",
    orange: "#ff8a3d",
    yellow: "#ffd23d",
    segOn: "#ffb43d",
    segOff: "#2a1608"
  };
  const TIERS = ["#3df5ff", "#7dff5a", "#ff5ec4", "#ffd23d"];
  const TONES = { "#ffc400": C.yellow, "#e8231f": C.red, "#f6e6c0": C.cream, "#ff7a00": C.orange, "#2f6bff": TIERS[0], "#1fbf55": TIERS[1], "#ff1f8a": TIERS[2] };
  const tone = (c) => TONES[String(c).toLowerCase()] || c;

  const CSS = `
  .pb-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: linear-gradient(#1d1233, #0c0717 60%, #07040f); border-radius: 10px; padding: 6px 7px 6px 8px; box-shadow: 0 0 0 1px #3a2560, 0 0 0 3px #0a0612, 0 2px 0 3px #2a1a46, 0 10px 24px rgba(0,0,0,.6); }
  .pb-window { display: inline-flex; align-items: center; gap: 6px; background: #0a0503; border-radius: 5px; padding: 4px 6px; line-height: 0; box-shadow: 0 0 0 1px rgba(255,180,61,.22) inset, 0 1px 4px rgba(0,0,0,.9) inset; }
  .pb-window svg { filter: drop-shadow(0 0 2px rgba(255,180,61,.9)) drop-shadow(0 0 6px rgba(255,120,40,.45)); transition: filter .35s ease-out, transform .35s cubic-bezier(.34,1.56,.64,1); }
  .pb-window.bump svg { filter: drop-shadow(0 0 2px #fff) drop-shadow(0 0 9px ${C.amber}); transform: scale(1.05); transition-duration: .04s; }
  .pb-up { font: 600 9px/1 Oswald, Impact, sans-serif; letter-spacing: .1em; color: ${C.pink}; text-shadow: 0 0 6px ${C.pink}; animation: ac-blink 1.1s steps(1) infinite; }
  .pb-best { font: 500 10px Oswald, Impact, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: ${C.amber}; opacity: .65; margin-left: 8px; }
  .pb-label { display: block; font: 500 11px/1.15 Oswald, Impact, sans-serif !important; letter-spacing: .12em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 0 8px currentColor; }
  .pb-lights { display: flex; gap: 3px; margin-top: 5px; }
  .pb-lights i { position: relative; flex: 1; max-width: 10px; height: 5px; border-radius: 1px; background: #1c1030; }
  .pb-lights i::after { content: ""; position: absolute; inset: 0; border-radius: 1px; background: linear-gradient(#fff, var(--c, ${C.cyan}) 60%); box-shadow: 0 0 5px var(--c, ${C.cyan}), 0 0 11px var(--c, ${C.cyan}); opacity: 0; transition: opacity .45s cubic-bezier(.2,.8,.2,1); }
  .pb-lights i.on::after { opacity: 1; transition: opacity .06s linear; }
  .pb-btn { white-space: nowrap; font: 600 11px/1 Oswald, Impact, sans-serif !important; letter-spacing: .12em; text-transform: uppercase; color: ${C.cream} !important; background: #241640 !important; border: 0 !important; border-radius: 7px !important; padding: 7px 10px !important; cursor: pointer; box-shadow: 0 2px 0 #0b0616, 0 0 0 1px #4a3175 inset; }
  .pb-btn { transition: transform .12s cubic-bezier(.34,1.56,.64,1), box-shadow .18s ease, background-color .2s, color .2s; }
  .pb-btn:hover { background: #2f1d52 !important; }
  .pb-btn:active { transform: translateY(2px); box-shadow: 0 0 0 #0b0616, 0 0 0 1px #4a3175 inset; transition-duration: .04s; }
  .pb-btn svg { width: 15px; height: 15px; color: currentColor; }
  .pb-icon { display: flex; align-items: center; padding: 5px 7px !important; }
  .pb-bar .pb-btn { color: rgba(255,244,224,.86) !important; font-weight: 500 !important; padding: 6px 8px !important; }
  .pb-bar .pb-btn.on { color: ${C.black} !important; background: ${C.pink} !important; box-shadow: 0 2px 0 #7a1b48, 0 0 14px rgba(255,79,154,.55); font-weight: 600 !important; }
  .pb-bar .pb-icon { padding: 5px 6px !important; }
  .pb-badge { display: inline-block; font: 600 9px/1 Oswald, Impact, sans-serif; letter-spacing: .1em; text-transform: uppercase; padding: 2px 4px; border-radius: 3px; background: rgba(255,210,61,.12); color: ${C.cream}; opacity: .8; vertical-align: 1px; }
  .pb-badge.ready { background: ${C.yellow}; color: ${C.black}; opacity: 1; box-shadow: 0 0 10px rgba(255,210,61,.6); }
  @keyframes ac-blink { 0% { opacity: 1; } 50% { opacity: .15; } }
  /* The attract marquee: the chrome logo canvas and a blinking FREE PLAY (you can't lose, so no coins) */
  .ac-logo { display: block; margin: 0 auto 6px; animation: nn-strike 1.4s linear both; }
  .ac-free { margin: 0 0 14px; font: 600 13px Oswald, Impact, sans-serif; letter-spacing: .4em; text-indent: .4em; text-transform: uppercase; color: #ffd23d; text-shadow: 0 0 6px #ffd23d, 0 0 16px #ff8a3d; animation: ac-blink 1.2s steps(1) infinite; }
  @media (prefers-reduced-motion: reduce) { .ac-logo, .ac-free { animation: none; } }
  @media (prefers-reduced-motion: reduce) { .pb-card, .pb-paused, .pb-up { animation: none !important; } }
  .pb-card { max-width: 24rem; width: 100%; background: linear-gradient(#1d1233, #0c0717); color: #f3e6d6; border: 0; border-radius: 12px; box-shadow: 0 0 0 1px #4a3175, 0 0 0 4px #0a0612, 0 0 30px rgba(155,107,255,.18), 0 24px 60px rgba(0,0,0,.7); padding: 18px 20px; animation: nn-pop .35s cubic-bezier(.34,1.56,.64,1) both; }
  @keyframes nn-pop { from { opacity: 0; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: none; } }
  .pb-paused { animation: nn-drop .45s cubic-bezier(.34,1.56,.64,1) both; }
  @keyframes nn-drop { from { opacity: 0; transform: translateY(-14px) scale(.94); } to { opacity: 1; transform: none; } }
  /* The monitor glass: scanlines, a curved vignette and a faint reflection. One static layer. */
  .ac-crt { position: fixed; inset: 0; z-index: 5; pointer-events: none;
    background:
      linear-gradient(165deg, rgba(255,255,255,.045), rgba(255,255,255,0) 28%),
      repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) 2px, rgba(0,0,0,.2) 2px, rgba(0,0,0,.2) 3px),
      radial-gradient(ellipse 120% 100% at 50% 48%, rgba(0,0,0,0) 62%, rgba(2,1,6,.55) 100%);
    box-shadow: inset 0 0 70px rgba(0,0,0,.65), inset 0 0 0 1px rgba(255,255,255,.03); }
  .pb-kicker { font: 600 11px Oswald, Impact, sans-serif; letter-spacing: .3em; text-transform: uppercase; color: ${C.pink}; text-shadow: 0 0 8px ${C.pink}; }
  .pb-title { margin: 6px 0 10px; font: 600 38px/1 Oswald, Impact, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: #fff8ec; text-shadow: 0 0 3px #fff, 0 0 12px ${C.cyan}, 0 0 30px ${C.pink}; }
  .pb-kbd { display: inline-block; min-width: 1.7em; padding: 0 .4em; background: #241640; border: 0; border-radius: 4px; box-shadow: 0 2px 0 #0b0616, 0 0 0 1px #4a3175 inset; color: ${C.cream}; font: 600 10px/1.6 Oswald, Impact, sans-serif; letter-spacing: .08em; text-align: center; text-transform: uppercase; }
  .pb-paused { font: 600 40px/1 Oswald, Impact, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: #fff8ec; text-shadow: 0 0 3px #fff, 0 0 12px ${C.yellow}, 0 0 30px ${C.pink}; }
  .pb-sub { margin-top: 10px; font: 500 12px Oswald, Impact, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: ${C.amber}; opacity: .85; }
  .pb-rows div { display: flex; justify-content: space-between; gap: 12px; margin: 7px 0; font: 500 12px Oswald, Impact, sans-serif; letter-spacing: .06em; text-transform: uppercase; color: #f3e6d6; }
  .pb-note { margin-top: 10px; font: 400 12px/1.45 system-ui, sans-serif; color: #a690c4; }
  @media (max-width: 520px) { .pb-bar { gap: 7px; padding: 5px 6px; } .pb-window { padding: 3px 5px; gap: 4px; } .pb-window svg { width: auto; height: 15px; } .pb-lights { gap: 2px; } .pb-btn { padding: 5px 7px !important; } .pb-bar .pb-btn { padding: 5px 6px !important; } }
  @media (max-width: 360px) { .pb-label { letter-spacing: .03em; } .pb-window svg { height: 13px; } .pb-up { display: none; } }
  .pb-hint { display: inline-block; max-width: calc(100vw - 32px); padding: 6px 12px; background: rgba(12,7,23,.88); color: ${C.cream}; border-radius: 6px; box-shadow: 0 0 0 1px #4a3175 inset, 0 0 14px rgba(155,107,255,.18); font: 500 11px/1.3 Oswald, Impact, sans-serif; letter-spacing: .12em; text-transform: uppercase; }
  .pb-hint .pb-kbd { background: #2f1d52; color: ${C.cream}; }`;

  // Oswald ships with the pinball skin (skins/pinball/fonts): one copy, for the HUD
  const here = document.currentScript && document.currentScript.src ? new URL("../pinball/fonts/", document.currentScript.src).href : "../pinball/fonts/";
  const FONTS = `@font-face { font-family: Oswald; font-weight: 400 700; font-display: swap; src: url(${here}oswald-latin.woff2) format("woff2"); }`;

  function install(options) {
    if (document.getElementById("ac-style")) return;
    const style = document.createElement("style");
    style.id = "ac-style";
    style.textContent = FONTS + CSS;
    document.head.appendChild(style);
    if (options && options.crt === false) return;
    const crt = document.createElement("div");
    crt.className = "ac-crt";
    (document.body || document.documentElement).appendChild(crt);
  }

  // ---- The 5x7 pixel font -----------------------------------------------------------------
  // Seven rows a glyph, five bits a row (16 is the left column)
  const GLYPHS = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
    E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14],
    4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
    8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
    "!": [4, 4, 4, 4, 4, 0, 4], "?": [14, 17, 1, 2, 4, 0, 4], ".": [0, 0, 0, 0, 0, 12, 12], ",": [0, 0, 0, 0, 12, 4, 8],
    ":": [0, 12, 12, 0, 12, 12, 0], "-": [0, 0, 0, 31, 0, 0, 0], "+": [0, 4, 4, 31, 4, 4, 0], "×": [0, 17, 10, 4, 10, 17, 0],
    "'": [4, 4, 8, 0, 0, 0, 0], "/": [1, 1, 2, 4, 8, 16, 16], "·": [0, 0, 0, 4, 0, 0, 0], "&": [12, 18, 20, 8, 21, 18, 13], " ": [0, 0, 0, 0, 0, 0, 0]
  };
  const glyph = (ch) => GLYPHS[ch] || GLYPHS[ch.toUpperCase()] || GLYPHS[" "];
  // Six columns a letter (five and a gap), less the last gap
  const textWidth = (str, px) => Math.max(0, String(str).length * 6 - 1) * px;
  // Lit cells of a string, in pixel units from the top left
  function cells(str) {
    const out = [];
    [...String(str).toUpperCase()].forEach((ch, i) => {
      const rows = glyph(ch);
      for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (rows[y] & (16 >> x)) out.push([i * 6 + x, y]);
    });
    return out;
  }

  // 7-row dot-matrix digits for the score, as on an old amber LED panel
  function score(el, n, digits = 4) {
    const str = String(Math.max(0, Math.floor(n))).slice(-digits).padStart(digits, "0");
    if (el.dataset.pb === str) return;
    const rising = el.dataset.pb !== undefined && +str > +el.dataset.pb;
    el.dataset.pb = str;
    if (rising) {
      el.classList.add("bump");
      clearTimeout(el._bump);
      el._bump = setTimeout(() => el.classList.remove("bump"), 90);
    }
    // Leading zeros glow faintly, the way an unlit LED still shows
    const lead = str.length - String(Math.max(0, Math.floor(n))).slice(-digits).length;
    let dots = "";
    [...str].forEach((ch, i) => {
      const rows = glyph(ch);
      for (let y = 0; y < 7; y++)
        for (let x = 0; x < 5; x++) {
          const on = rows[y] & (16 >> x) && i >= lead;
          dots += `<rect x="${i * 6 + x}" y="${y}" width=".82" height=".82" rx=".2" fill="${on ? C.segOn : C.segOff}"/>`;
        }
    });
    const w = digits * 6 - 1;
    el.innerHTML = `<span class="pb-up">1UP</span><svg width="${w * 2.6}" height="18.2" viewBox="0 0 ${w} 7" aria-label="${n}">${dots}</svg>`;
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

  // ---- Sprites and layers, baked at the canvas's device scale -----------------------------
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
      if (sprites.size > 420) sprites.clear();
      const c = canvasOf(w * S, h * S);
      const g = c.getContext("2d");
      g.scale(S, S);
      g.translate(ox, oy);
      bakeS = S;
      paint(g, S);
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
  // mix() as hex, for colours that go on into glow() or rgba()
  function mixHex(a, b, t) {
    const [r1, g1, b1] = rgb(a);
    const [r2, g2, b2] = rgb(b);
    const h = (v) => Math.round(v).toString(16).padStart(2, "0");
    return "#" + h(r1 + (r2 - r1) * t) + h(g1 + (g2 - g1) * t) + h(b1 + (b2 - b1) * t);
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
  function blurred(g, color, blur, paint) {
    g.save();
    g.shadowColor = color;
    g.shadowBlur = blur * bakeS;
    paint(g);
    g.restore();
  }

  // ---- Pixel sprites with modern lighting -------------------------------------------------
  // rows: strings, one char a pixel ("." or " " empty); pal: { char: "#rrggbb" }. k: CSS px a
  // pixel. Baked once: the pixels, a bloom in the glow colour, a key light from the top left
  // over the whole figure, and a rim of light on every pixel's top edge that has nothing above.
  function pix(ctx, key, rows, pal, k, o = {}) {
    const h = rows.length, w = rows[0].length;
    const bloom = o.bloom === undefined ? 8 : o.bloom;
    const pad = Math.ceil(bloom * 1.6) + 2;
    const W = w * k, H = h * k;
    return sprite(ctx, "px" + key + "/" + k, W + pad * 2, H + pad * 2, W / 2 + pad, H / 2 + pad, (g, S) => {
      const flat = canvasOf(W * S, H * S);
      const f = flat.getContext("2d");
      f.scale(S, S);
      const on = (x, y) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== "." && rows[y][x] !== " ";
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (!on(x, y)) continue;
          f.fillStyle = pal[rows[y][x]] || "#ff00ff";
          f.fillRect(x * k, y * k, k + 0.02, k + 0.02);
        }
      // Key light: brighter top left, deeper bottom right, only over the pixels
      const light = o.light === undefined ? 1 : o.light;
      if (light) {
        f.globalCompositeOperation = "source-atop";
        const lin = f.createLinearGradient(0, 0, W * 0.7, H);
        lin.addColorStop(0, `rgba(255,255,255,${0.22 * light})`);
        lin.addColorStop(0.5, "rgba(255,255,255,0)");
        lin.addColorStop(1, `rgba(10,0,30,${0.38 * light})`);
        f.fillStyle = lin;
        f.fillRect(0, 0, W, H);
        // Rim light along the top edges, and a soft shade under the bottom ones
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            if (!on(x, y)) continue;
            if (!on(x, y - 1)) {
              f.fillStyle = `rgba(255,255,255,${0.42 * light})`;
              f.fillRect(x * k, y * k, k, Math.max(0.6, k * 0.28));
            }
            if (!on(x, y + 1)) {
              f.fillStyle = `rgba(0,0,0,${0.25 * light})`;
              f.fillRect(x * k, y * k + k * 0.7, k, k * 0.3);
            }
          }
        f.globalCompositeOperation = "source-over";
      }
      g.translate(-W / 2, -H / 2);
      if (o.glow !== false && bloom > 0) {
        g.save();
        g.shadowColor = o.glow || pal[Object.keys(pal)[0]];
        g.shadowBlur = bloom * S;
        g.globalAlpha = 0.85;
        g.drawImage(flat, 0, 0, W, H);
        g.restore();
      }
      g.drawImage(flat, 0, 0, W, H);
    });
  }

  // Pixel lettering, baked: a soft glow, then the cells filled top to bottom (chrome: cream,
  // the colour, and a deeper band, like a stamped logo)
  function textSprite(ctx, str, px, color, chrome) {
    const w = textWidth(str, px), h = 7 * px, pad = Math.ceil(px * 2.5) + 4;
    return sprite(ctx, "tx" + str + "/" + px + color + (chrome ? "c" : ""), w + pad * 2, h + pad * 2, pad, pad + h / 2, (g) => {
      const list = cells(str);
      const paint = (g) => {
        for (const [x, y] of list) g.fillRect(x * px, y * px - h / 2, px + 0.02, px + 0.02);
      };
      // A dark outline and a hard drop shadow, so it reads over anything
      g.fillStyle = "rgba(4,2,10,0.9)";
      for (const [dx, dy] of [[-0.4, 0], [0.4, 0], [0, -0.4], [0, 0.4], [0.7, 0.8]]) {
        g.save();
        g.translate(px * dx, px * dy);
        paint(g);
        g.restore();
      }
      g.save();
      g.shadowColor = color;
      g.shadowBlur = px * 2.2 * bakeS;
      g.fillStyle = rgba(color, 0.9);
      paint(g);
      g.restore();
      if (chrome) {
        const lin = g.createLinearGradient(0, -h / 2, 0, h / 2);
        lin.addColorStop(0, "#ffffff");
        lin.addColorStop(0.42, mix(color, "#ffffff", 0.55));
        lin.addColorStop(0.5, color);
        lin.addColorStop(1, mix(color, "#200838", 0.45));
        g.fillStyle = lin;
      } else g.fillStyle = mix(color, "#ffffff", 0.55);
      paint(g);
    });
  }
  function text(ctx, str, x, y, px, color, o = {}) {
    color = tone(color);
    const s = textSprite(ctx, String(str).toUpperCase(), Math.max(1, Math.round(px * 2) / 2), color, o.chrome !== false);
    const w = textWidth(str, px);
    const ax = o.align === "left" ? 0 : o.align === "right" ? w : w / 2;
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    draw(ctx, s, x - ax, y);
    ctx.globalAlpha = 1;
  }

  // The attract logo, drawn once into its own canvas: chrome letters with a hard purple shadow
  // and a cyan underglow, the way a cabinet's marquee title is screen-printed
  function marquee(canvas, title, cssWidth) {
    const str = String(title).toUpperCase();
    const px = Math.max(3, Math.min(9, Math.floor(cssWidth / (str.length * 6 + 3))));
    const w = textWidth(str, px) + px * 8, h = 7 * px + px * 7;
    const S = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = w * S;
    canvas.height = h * S;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const g = canvas.getContext("2d");
    g.scale(S, S);
    // The backlit panel the title is printed on, so it reads over a busy screen
    const panel = new Path2D();
    panel.roundRect ? panel.roundRect(1, 1, w - 2, h - 2, px * 1.5) : panel.rect(1, 1, w - 2, h - 2);
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "rgba(29,18,51,0.92)");
    bg.addColorStop(1, "rgba(7,4,15,0.92)");
    g.fillStyle = bg;
    g.fill(panel);
    g.strokeStyle = "#4a3175";
    g.lineWidth = 1.5;
    g.stroke(panel);
    g.translate(px * 2, px * 1.4);
    const list = cells(str);
    const at = (dx, dy, fill, inset = 0) => {
      g.fillStyle = fill;
      for (const [x, y] of list) g.fillRect(px * 2 + x * px + dx + inset, px * 1.5 + y * px + dy + inset, px - inset * 2 + 0.02, px - inset * 2 + 0.02);
    };
    // The hard shadow, stepped like an extrusion
    for (let i = px * 1.4; i > 0; i -= Math.max(1, px / 3)) at(i, i, i > px * 0.6 ? "#2a0d46" : "#5a1a78");
    g.save();
    g.shadowColor = C.pink;
    g.shadowBlur = px * 3 * S;
    at(0, 0, C.pink);
    g.restore();
    const lin = g.createLinearGradient(0, px * 1.5, 0, px * 8.5);
    lin.addColorStop(0, "#ffffff");
    lin.addColorStop(0.38, "#bff9ff");
    lin.addColorStop(0.5, C.cyan);
    lin.addColorStop(0.52, "#2a74c8");
    lin.addColorStop(0.75, C.pink);
    lin.addColorStop(1, "#ffd23d");
    at(0, 0, lin);
    // A glint on each pixel's top left, so it reads as stamped metal
    at(0, 0, "rgba(255,255,255,0.35)", px * 0.32);
  }

  // The shell's attract marquee, filled in: the logo is redrawn to fit when the window changes
  function attract(el, title, hint) {
    el.innerHTML = `<canvas class="ac-logo" data-logo aria-label="${title}"></canvas><div class="ac-free">Free play</div><span class="pb-hint">${hint || "Tap or Space on the beat"}</span>`;
    const fit = () => marquee(el.querySelector("[data-logo]"), title, Math.min(window.innerWidth - 40, 480));
    fit();
    window.addEventListener("resize", fit);
  }

  // The space shell's own colours (its HUD, pause card and flow check), as the cabinet's
  const theme = { bg: C.black, text: C.cream, text2: "#e9dcf6", c1: C.violet, c2: C.pink, veil: "rgba(7,6,13,.8)", panel: "linear-gradient(#1d1233, #0c0717)", line: "rgba(155,107,255,.42)", glow: "rgba(155,107,255,.18)", dim: "#a690c4", body: "system-ui, sans-serif", headGlow: "0 0 8px var(--ss-c2)" };
  // The keys card in cabinet words
  const words = { fire: "Button", charge: "Power shot", auto: "Leave it alone a few seconds and the cabinet runs its demo, without scoring. Any input takes over again." };

  // ---- Light ------------------------------------------------------------------------------
  function glow(ctx, x, y, r, color, a = 1) {
    if (a <= 0.01) return;
    color = tone(color);
    const s = sprite(ctx, "glow" + color, 64, 64, 32, 32, (g) => disc(g, 0, 0, 32, radial(g, 0, 0, 0, 32, [[0, rgba(color, 0.6)], [0.3, rgba(color, 0.24)], [1, rgba(color, 0)]])));
    add(ctx, s, x, y, r / 32, a);
  }

  // Along the bottom: the cabinet's lamp rail, round warm bulbs chasing on the eighth notes
  const BULBS = ["#ffd23d", "#ff4f9a", "#3df5ff"];
  const filament = [];
  let lastBulbs = 0;
  function bulbs(ctx, W, y, beatPos, flash) {
    const step = Math.floor(beatPos * 2);
    const now = performance.now();
    const dt = Math.min(0.1, (now - (lastBulbs || now)) / 1000);
    lastBulbs = now;
    const decay = Math.pow(0.01, dt);
    const row = sprite(ctx, "acrow" + W, W, 18, 0, 9, (g) => {
      const lin = g.createLinearGradient(0, -9, 0, 9);
      lin.addColorStop(0, "#1d1233");
      lin.addColorStop(1, "#07040f");
      g.fillStyle = lin;
      g.fillRect(0, -9, W, 18);
      g.fillStyle = "#3a2560";
      g.fillRect(0, -9, W, 1);
      for (let x = 11; x < W; x += 22) disc(g, x, 0, 3.2, "#2a1a3a");
    });
    draw(ctx, row, 0, y);
    for (let i = 0, x = 11; x < W; i++, x += 22) {
      const on = flash > 0 || (i + step) % 3 === 0;
      filament[i] = on ? 1 : (filament[i] || 0) * decay;
      if (filament[i] < 0.03) continue;
      const color = BULBS[i % 3];
      const lit = sprite(ctx, "bulb" + color, 30, 30, 15, 15, (g) => {
        disc(g, 0, 0, 13, radial(g, 0, 0, 0, 13, [[0, rgba(color, 0.5)], [1, rgba(color, 0)]]));
        disc(g, 0, 0, 3.2, mix(color, "#ffffff", 0.55));
        disc(g, -0.9, -0.9, 1.1, "#ffffff");
      });
      add(ctx, lit, x, y, 1, filament[i]);
    }
  }

  // Callouts in the pixel font, popping in with a little overshoot
  const easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
  function callout(ctx, label, x, y, color, size = 22, alpha = 1, age) {
    color = tone(color);
    const str = String(label).toUpperCase();
    const W = ctx.canvas.width / scaleOf(ctx);
    // About size px tall, but always fits the screen
    const px = Math.max(1.5, Math.min(Math.round(size / 5), Math.floor(((W - 24) / Math.max(1, textWidth(str, 1))) * 2) / 2));
    ctx.save();
    ctx.globalAlpha = alpha;
    if (age !== undefined) {
      const k = 0.7 + 0.3 * easeOutBack(Math.min(1, age / 0.2));
      ctx.translate(x, y);
      ctx.scale(k, k);
      ctx.translate(-x, -y);
    }
    const s = textSprite(ctx, str, px, color, true);
    draw(ctx, s, x - textWidth(str, px) / 2, y - px * 3);
    ctx.restore();
  }

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

  // A four-point sparkle, stamped as light
  function twinkle(ctx, x, y, r, color, a = 1) {
    if (a <= 0.01) return;
    color = tone(color);
    const s = sprite(ctx, "twinkle" + color, 64, 64, 32, 32, (g) => {
      g.globalCompositeOperation = "lighter";
      disc(g, 0, 0, 14, radial(g, 0, 0, 0, 14, [[0, rgba(color, 0.55)], [1, rgba(color, 0)]]));
      g.fillStyle = rgba(color, 0.6);
      g.fillRect(-30, -2, 60, 4);
      g.fillRect(-2, -30, 4, 60);
      g.fillStyle = mix(color, "#ffffff", 0.8);
      g.fillRect(-16, -1, 32, 2);
      g.fillRect(-1, -16, 2, 32);
    });
    add(ctx, s, x, y, r / 32, a);
  }

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

  // Pixel shards: little squares of light that fly, spin a little and fade
  function shards(list, x, y, n, colors, speed = 160, up = 40) {
    for (let i = 0; i < n && list.length < 260; i++) {
      const a = Math.random() * TAU, v = speed * (0.4 + Math.random() * 0.8), life = 0.5 + Math.random() * 0.6;
      list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, life, max: life, c: colors[i % colors.length], s: 2 + Math.random() * 3 });
    }
  }
  function drawShards(ctx, list, dt, gravity = 260) {
    const drag = Math.pow(0.3, dt);
    ctx.globalCompositeOperation = "lighter";
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.vx *= drag;
      p.vy = p.vy * drag + gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if ((p.life -= dt) <= 0) {
        list.splice(i, 1);
        continue;
      }
      const a = p.life / p.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.c;
      const s = p.s * (0.5 + a * 0.5);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }


  // ---- The monitor and the cabinet sides --------------------------------------------------
  // The play area: the whole width on a phone or the pocket; on a wide screen a portrait monitor
  // in the middle, with the cabinet's side art either side
  function field(W, H) {
    const top = 58, bottom = H - 20;
    const w = W <= 620 ? W : Math.min(W, Math.max(380, Math.round((bottom - top) * 0.8)));
    return { x: Math.round((W - w) / 2), y: top, w, h: bottom - top, top, bottom, wide: w < W };
  }
  // Baked into a game's background layer: outside the monitor, black laminate with the
  // cabinet's bold diagonal stripes in the game's colours, and a chrome trim round the monitor
  function sides(g, W, H, F, colors) {
    if (!F.wide) return;
    const r = rng(77);
    for (const [x0, x1, dir] of [[0, F.x, 1], [F.x + F.w, W, -1]]) {
      const w = x1 - x0;
      if (w < 4) continue;
      g.save();
      g.beginPath();
      g.rect(x0, 0, w, H);
      g.clip();
      const lin = g.createLinearGradient(x0, 0, x1, 0);
      lin.addColorStop(0, dir > 0 ? "#05030a" : "#120a20");
      lin.addColorStop(1, dir > 0 ? "#120a20" : "#05030a");
      g.fillStyle = lin;
      g.fillRect(x0, 0, w, H);
      // Stripes sweeping up toward the monitor, the cabinet's side art
      const band = Math.max(18, Math.min(42, w * 0.08));
      colors.forEach((c, i) => {
        g.save();
        g.translate(dir > 0 ? x1 : x0, H * 0.78 - i * band * 1.5);
        g.rotate(dir > 0 ? -0.5 : 0.5);
        g.fillStyle = rgba(c, 0.85);
        g.shadowColor = c;
        g.shadowBlur = 18 * bakeS;
        g.fillRect(-W, 0, W * 2, band);
        g.restore();
      });
      // Faint pinstripe dots, like a print on laminate
      g.fillStyle = "rgba(255,255,255,0.035)";
      for (let i = 0; i < (w * H) / 900; i++) g.fillRect(x0 + r() * w, r() * H, 1.5, 1.5);
      g.restore();
    }
    // Chrome T-molding round the monitor
    for (const x of [F.x, F.x + F.w]) {
      const lin = g.createLinearGradient(x - 4, 0, x + 4, 0);
      lin.addColorStop(0, "#2a2238");
      lin.addColorStop(0.5, "#c9c0dc");
      lin.addColorStop(1, "#2a2238");
      g.fillStyle = lin;
      g.fillRect(x - 3, 0, 6, H);
    }
  }
  // The phosphor mask: a faint grid of dots over a baked background, inside the monitor
  function mask(g, F, color, a = 0.05) {
    g.fillStyle = rgba(color, a);
    for (let y = F.y; y < F.bottom; y += 4) for (let x = F.x + ((y / 4) % 2) * 2; x < F.x + F.w; x += 4) g.fillRect(x, y, 1, 1);
  }

  // Something small going on in the background now and then, so a long session has variety. Each
  // kind is { dur: seconds, draw(ctx, e, u, ...args) } with u running 0..1; e.seed is random per
  // play (e.side is -1 or 1) for where and which way. Draw it behind the play, faint.
  function happenings(kinds) {
    const live = [];
    let wait = 3 + Math.random() * 4, last = -1;
    return {
      update(dt) {
        for (let i = live.length - 1; i >= 0; i--) if ((live[i].t += dt) >= kinds[live[i].kind].dur) live.splice(i, 1);
        if ((wait -= dt) > 0) return;
        let k = Math.floor(Math.random() * kinds.length);
        if (k === last && kinds.length > 1) k = (k + 1) % kinds.length;
        last = k;
        live.push({ kind: k, t: 0, seed: Math.random(), side: Math.random() < 0.5 ? -1 : 1 });
        wait = 7 + Math.random() * 8;
      },
      draw(ctx, ...args) {
        for (const e of live) {
          ctx.save();
          kinds[e.kind].draw(ctx, e, e.t / kinds[e.kind].dur, ...args);
          ctx.restore();
        }
      }
    };
  }

  window.ArcadeSkin = { install, score, lights, bulbs, callout, streak, glow, layer, sprite, draw, add, mix, mixA, mixHex, rgba, haloed, blurred, twinkle, softRing, rng, tone, pix, text, textWidth, marquee, attract, shards, drawShards, radial, disc, field, sides, mask, happenings, colors: C, tiers: TIERS, theme, words };
})();
