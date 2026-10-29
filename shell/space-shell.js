// Space shell: the body for neon space games on the flow engine. A second shell beside
// flow-shell.js (the pinball one), built only on what engine/flow-engine.js exposes. It owns the
// cockpit HUD, one fire button (tap, or hold and let go), Flow and Fidget, the standard keys,
// pause, the attract marquee, points and the frame loop. Table modes and ranks belong to the
// pinball shell and aren't here. Fidget's rules are the engine's (eng.style); this shell shows
// the switch, lights the meter with eng.rev, and passes presses on. A game makes every press
// work by checking api.style in onFire.
//
//   SpaceShell.mount({
//     key: "myGame", title: "My Game", hint: "The one thing to do",
//     skin: MySkin,                    the look (default window.NeonSkin); see "A skin" below
//     theme: { bg, text, c1, c2, ... } the shell's own colours and type (default skin.theme), as CSS
//                                      variables; see THEME below for every key
//     words: { fire, charge, auto }    the keys card's wording (default skin.words)
//     marquee(el, title, hint),        optional: fill the attract marquee yourself
//     engine: { ... },                 FlowEngine.create options
//     tierNames: [...4],
//     setup(api), resize(api)
//     onBeat(n, api)                   spawn on the beat (api.eng.paceBeats() says how often)
//     onFire(api)                      the button went down (call api.eng.tap() in here)
//     onRelease(api, heldSec)          it came up; api.chargeOf(heldSec) is the charge let go
//                                      (Fidget only: in Flow a hold never charges, and things
//                                      that go by while it's held don't count as misses)
//     update(dt, api), autopilot(dt, api), draw(ctx, api, t)
//   });
//
// api: eng, ctx, W, H, reduced, started, tier, color(), style, rev, points, charge, chargeOf(held),
//      hit(quality, handleSec, x, y), miss(), bonus(n, label, x, y), callout(text, x, y, color, scale),
//      ring(x, y, color, size), hint(id, html), track({...}), drawCharge(x, y, r, color, full),
//      cue(x, y, beatsToGo, perfect, size)   the timing ring, gold on the perfect beat
//
// api.track() runs the usual "something arrives on a beat, tap as it does" loop for you, so a
// game only says what arrives and how it looks:
//   const targets = api.track({
//     spawn(at, n) { return { x, y } },    a new thing, arriving on beat `at` (null to skip one)
//     note(thing) { return 0.4 },          the tap's note height, 0 high .. 1 low (optional)
//     hit(thing, { perfect, ghost, fidget }) {},   it was tapped. ghost: unscored (autopilot or
//                                          Fidget); fidget: a Fidget press. May return { x, y }
//     miss(thing, counted) {},             it went by; counted: it cost the streak (not in Fidget)
//     empty() {},                          a tap with nothing in reach (optional)
//     ready(thing, now) { return true },   Fidget takes the next ready thing (default: the next
//                                          one, even if it is still beats away); false: Fidget
//                                          presses are left to the game's onFire
//     keep: 6,                             beats a finished thing stays in list, or
//                                          keep(thing, now) { return true } to keep it while true
//     cueAt(thing) { return { x, y } },    where the timing cue closes (default thing.x, thing.y;
//                                          none if neither); cueSize: 1; cue: false to draw your own
//                                          with api.cue(x, y, beatsToGo, perfect, size)
//     ahead: 4, gap: 2, window: 0.3, perfect: 0.1   beats; the defaults shown. ahead may also be
//                                          a function, read at each spawn (e.g. by screen width)
//   });
//   onFire: () => targets.fire()            and targets.list / targets.next() for drawing
// Each thing gets `at`, `window` and `state` ("wait", "hit" or "missed"). Once it isn't "wait"
// the state is the game's to rename; the tracker only reads "wait". The points pop at the
// thing's x, y in CSS pixels; hit() runs first, so it can set them or return them. The tracker
// spawns, judges, scores, misses and plays autopilot by itself.
//
// A skin is an object with install(), score(el, n, digits), lights(el, pct, color),
// callout(ctx, text, x, y, color, size, alpha, age), bulbs(ctx, W, y, beatPos, flash),
// tiers [4 colours], colors { yellow, cream, magenta }, and optionally theme and words (as above).
// ?test=1 puts { eng, api, trackers } on window.flowTest for a test harness; ?tier=3 previews a tier.
// Load after flow-engine.js and the skin.
(() => {
  "use strict";
  if (window.SpaceShell) return;

  // The shell's colours are CSS variables, so a skin or game can recolour it without a fork
  // and type: head/body are font stacks, headCase the headings' text-transform, headGlow their
  // text-shadow, marqueeTop where the attract title sits, strike its entrance ("none" for still)
  const THEME = {
    bg: "#05030f", text: "#eafcff", text2: "#cfe9ff", c1: "#00f0ff", c2: "#ff2bd6", veil: "rgba(5,3,15,.8)", panel: "linear-gradient(#140b34, #07051a)", line: "rgba(0,240,255,.42)", glow: "rgba(0,240,255,.18)", dim: "#7d8fbf",
    head: "Oswald, Impact, sans-serif", body: "Inter, system-ui, sans-serif", headCase: "uppercase", headGlow: "0 0 8px var(--ss-c2)", marqueeTop: "34%", strike: "nn-strike"
  };
  const WORDS = { fire: "Fire", charge: "Charge shot", auto: "Stop for a few seconds and it plays itself, without scoring. Any input takes over again." };

  const CSS = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: var(--ss-bg); color: var(--ss-text); font-family: var(--ss-body); }
  #ss-canvas { position: fixed; inset: 0; display: block; width: 100%; height: 100%; touch-action: none; }
  .ss button { font: inherit; }
  .ss-head { position: fixed; top: 0; left: 0; right: 0; z-index: 20; padding: 8px; max-width: 42rem; margin: 0 auto; pointer-events: none; }
  .ss-score { display: flex; align-items: center; flex: none; }
  .ss-state { flex: 1; min-width: 0; max-width: 220px; }
  .ss-labelrow { display: flex; align-items: center; gap: 5px; min-width: 0; }
  .ss-labelrow .pb-label { min-width: 0; }
  .ss-mult:not(.ready) { display: none; }
  .ss-controls { display: flex; gap: 5px; pointer-events: auto; }
  @media (max-width: 520px) { .pb-best { display: none; } }
  @media (max-width: 400px) { .ss-intensity { padding-left: 6px; padding-right: 6px; } }
  /* Narrow screens (the site's station, the pocket's Mini dock): the extra buttons go so pause and
     mute stay on screen; intensity and the track are still in the pause card and on their keys */
  @media (max-width: 360px) { .ss-intensity, .ss-controls [data-track] { display: none; } }
  @media (max-width: 240px) { .ss-controls [data-style] { display: none; } }
  .ss-over { position: fixed; inset: 0; z-index: 30; display: none; align-items: center; justify-content: center; padding: 16px; background: var(--ss-veil); }
  .ss-over.show { display: flex; }
  .ss-hint { position: fixed; bottom: 30px; left: 0; right: 0; z-index: 10; text-align: center; pointer-events: none; transition: opacity .7s; }
  .ss-marquee { position: fixed; left: 0; right: 0; top: var(--ss-marqueeTop); z-index: 15; text-align: center; pointer-events: none; transition: opacity .6s, transform .6s cubic-bezier(.34,1.56,.64,1); }
  .ss-marquee.gone { opacity: 0; transform: translateY(-12px) scale(.96); }
  .ss-marquee .pb-title { font-size: 44px; letter-spacing: .14em; margin: 0 0 14px; animation: var(--ss-strike) 1.4s linear both; }
  .ss-rule { width: 72px; height: 2px; margin: -4px auto 14px; background: linear-gradient(90deg, var(--ss-c1), var(--ss-c2)); box-shadow: 0 0 8px var(--ss-c2), 0 0 16px var(--ss-c1); }
  @keyframes nn-strike { 0% { opacity: .08; } 7% { opacity: 1; } 10% { opacity: .15; } 15% { opacity: .9; } 18% { opacity: .3; } 26% { opacity: 1; } 100% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .ss-marquee .pb-title { animation: none; } }
  /* The engine's occasional flow check, in the cockpit's look */
  .fe-check { position: fixed; left: 50%; bottom: 30px; transform: translateX(-50%); width: min(340px, calc(100vw - 32px)); z-index: 50; padding: 12px 14px; border-radius: 14px; background: var(--ss-panel); color: var(--ss-text2); font: 400 12px/1.4 var(--ss-body); box-shadow: 0 0 0 1px var(--ss-line), 0 0 22px var(--ss-glow), 0 16px 40px rgba(0,0,0,.6); }
  .fe-check-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .fe-check-title { font: 600 11px var(--ss-head); letter-spacing: .24em; text-transform: var(--ss-headCase); color: var(--ss-c2); text-shadow: var(--ss-headGlow); }
  .fe-check-close { background: none; border: 0; color: rgba(160,220,255,.6); font-size: 14px; cursor: pointer; }
  .fe-check-close:hover { color: var(--ss-text); }
  .fe-check-note { color: var(--ss-dim); }
  .fe-check-scale { display: flex; gap: 4px; margin: 6px 0 10px; }
  .fe-check-scale button { flex: 1; padding: 6px 0; border: 0; border-radius: 7px; background: rgba(255,255,255,.035); box-shadow: 0 0 0 1px var(--ss-line) inset; color: var(--ss-text); font: 500 12px var(--ss-head); cursor: pointer; }
  .fe-check-scale button:hover { background: var(--ss-glow); }
  .fe-check-scale button.on { background: var(--ss-c2); color: var(--ss-bg); box-shadow: 0 0 12px var(--ss-c2); font-weight: 600; }
  .fe-check-est { width: 60px; margin-left: 4px; padding: 3px 6px; border: 0; border-radius: 6px; background: var(--ss-bg); box-shadow: 0 0 0 1px var(--ss-line) inset; color: var(--ss-text); font: 500 12px var(--ss-head); }`;
  const kbd = (k) => `<span class="pb-kbd">${k}</span>`;
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
  const ICON_TRACK = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 17.5a2.5 2.5 0 11-2-2.45V5.2l11-2.2v11.5a2.5 2.5 0 11-2-2.45V6.4l-7 1.4z"/></svg>';
  const ICON_SOUND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5.6 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.6l4.7-4.7c.6-.6 1.7-.2 1.7.7v14c0 .9-1.1 1.3-1.7.7z"/><path data-waves d="M15.5 8.5a5 5 0 010 7M18.4 5.6a9 9 0 010 12.8"/><path data-cross d="M17 10l4 4m0-4l-4 4" style="display:none"/></svg>';

  function mount(g) {
    const tierNames = g.tierNames || ["Finding your rhythm", "Warp", "Hyperspace", "Supernova"];
    const Skin = g.skin || window.NeonSkin;
    if (!Skin) throw new Error("space-shell.js needs a skin: load neon-skin.js first, or pass mount({ skin })");
    Skin.install();
    const theme = Object.assign({}, THEME, Skin.theme, g.theme);
    for (const k in theme) document.documentElement.style.setProperty("--ss-" + k, theme[k]);
    const words = Object.assign({}, WORDS, Skin.words, g.words);
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    const root = document.createElement("div");
    root.className = "ss";
    root.innerHTML = `
      <canvas id="ss-canvas"></canvas>
      <header class="ss-head"><div class="pb-bar">
        <div class="ss-score"><span class="pb-window" data-score></span><span class="pb-best">hi <b data-hi>0</b></span></div>
        <div class="ss-state"><div class="ss-labelrow"><span class="pb-label" data-label></span><span class="pb-badge ss-mult" data-mult></span></div><div class="pb-lights" data-lights></div></div>
        <div class="ss-controls">
          <button class="pb-btn" data-style title="Flow or fidget (F)"></button>
          <button class="pb-btn ss-intensity" data-intensity title="Chill, normal or intense (\`)"></button>
          <button class="pb-btn pb-icon" data-track title="Switch track (Tab)" aria-label="Switch track">${ICON_TRACK}</button>
          <button class="pb-btn pb-icon" data-pause title="Pause (Esc)" aria-label="Pause">${ICON_PAUSE}</button>
          <button class="pb-btn pb-icon" data-mute title="Mute (0)" aria-label="Mute">${ICON_SOUND}</button>
        </div></div></header>
      <div class="ss-hint" data-hint style="opacity:0"><span class="pb-hint" data-hinttext></span></div>
      <div class="ss-marquee" data-marquee><div class="pb-title">${g.title}</div><div class="ss-rule"></div><span class="pb-hint">${g.hint || "Tap or Space on the beat"}</span></div>
      <div class="ss-over" data-pausecard><div style="text-align:center">
        <div class="pb-paused">Paused</div>
        <div class="pb-sub">Tap or ${kbd("Esc")} to resume</div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap"><button class="pb-btn" data-pintensity></button><button class="pb-btn" data-ptrack></button><button class="pb-btn" data-pvoice></button></div></div></div>
      <div class="ss-over" data-keyscard><div class="pb-card" style="max-width:20rem">
        <div class="pb-kicker">Keys</div>
        <div class="pb-rows">
          <div><span>${words.fire}</span>${kbd("Space")}</div>
          <div><span>${words.charge} (fidget)</span><span>hold ${kbd("Space")}</span></div>
          <div><span>Flow / fidget</span>${kbd("F")}</div>
          <div><span>Pause</span>${kbd("Esc")}</div>
          <div><span>Autopilot</span>${kbd("Enter")}</div>
          <div><span>Chill / normal / intense</span>${kbd("`")}</div>
          <div><span>Track / voice</span><span>${kbd("Tab")} ${kbd("Shift+Tab")}</span></div>
          <div><span>Volume / mute</span><span>${kbd("-")} ${kbd("=")} ${kbd("0")}</span></div>
          <div><span>Audio offset</span><span>${kbd("[")} ${kbd("]")}</span></div>
          <div><span>Switch game (pocket)</span>${kbd("1")}&ndash;${kbd("9")}</div>
        </div>
        <div class="pb-note">${words.auto}</div>
      </div></div>`;
    document.body.appendChild(root);
    const q = (sel) => root.querySelector(sel);
    if (g.marquee) {
      q("[data-marquee]").innerHTML = "";
      g.marquee(q("[data-marquee]"), g.title, g.hint);
    }

    const eng = FlowEngine.create(Object.assign({ key: g.key }, g.engine || {}));
    window.flowTelemetry = () => eng.history();
    const canvas = q("#ss-canvas");
    const ctx = canvas.getContext("2d", { alpha: false });
    const reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    const pocket = /[?&]pocket=1/.test(location.search) || !!window.NL_OS;
    const store = (k, v) => {
      try {
        if (v === undefined) return localStorage.getItem(k);
        localStorage.setItem(k, String(v));
      } catch (e) {}
      return null;
    };

    let W = 0, H = 0, started = false, downAt = 0, flash = 0;
    let points = 0, combo = 0, mult = 1, clean = 0, hintTimer = 0;
    // ---- Intensity: chosen, never imposed. Chill gives every arrival more room, intense less;
    // within a session nothing ramps on its own. Each has its own high score.
    const INTENSITIES = ["chill", "normal", "intense"];
    const POINT_SCALE = { chill: 0.75, normal: 1, intense: 1.5 };
    let intensity = INTENSITIES.includes(store(g.key + ".intensity")) ? store(g.key + ".intensity") : "normal";
    const hiKey = () => g.key + ".space.hi" + (intensity === "normal" ? "" : "." + intensity);
    let hi = parseInt(store(hiKey()) || "0", 10) || 0;
    const callouts = [], rings = [];
    const HOLD_SEC = 0.45; // longer than an ordinary press, even a thumb on a space bar

    const api = {
      eng,
      ctx,
      reduced,
      get W() { return W; },
      get H() { return H; },
      get started() { return started; },
      get tier() { return eng.tier; },
      color: () => Skin.tiers[eng.tier - 1],
      get style() { return eng.style; }, // "flow" or "fidget"
      get rev() { return eng.rev; }, // Fidget: 0 calm .. 1 mashing flat out
      get points() { return points; },
      get intensity() { return intensity; }, // "chill", "normal" or "intense"
      // Pick a value by intensity: api.pick({ chill: 5, normal: 4, intense: 3 })
      pick: (o) => (o[intensity] !== undefined ? o[intensity] : o.normal),
      // The hold's charge is Fidget's: in Flow a hold is just a press, so it never charges
      chargeOf: (held) => (eng.style === "fidget" ? Math.max(0, Math.min(1, (held - HOLD_SEC) / 0.7)) : 0),
      get charge() { return downAt ? api.chargeOf((performance.now() - downAt) / 1000) : 0; },
      // A hit: points with a combo multiplier, the engine's streak and pacer, a tier callout.
      // Ignored before the first input and during autopilot (the engine enforces the latter).
      // Pass x, y and the points pop up there.
      hit(quality = "CLEAN", handleSec, x, y) {
        if (!started || eng.auto || eng.style === "fidget") return false;
        const tierUp = eng.score(1, quality, handleSec);
        combo++;
        const m = Math.min(4, 1 + Math.floor(combo / 8));
        if (m > mult) api.callout(m + "×", W / 2, H * 0.42, Skin.colors.yellow, 1.1);
        mult = m;
        const got = addPoints(100 * (quality === "PERFECT" ? 2 : 1));
        if (x !== undefined) api.callout("+" + got, x, y - 18, quality === "PERFECT" ? Skin.colors.yellow : Skin.colors.cream, 0.7);
        if (tierUp) {
          api.callout(tierNames[eng.tier - 1], W / 2, H * 0.3, api.color(), 1.2);
          flash = 1.2;
        }
        // A phrase of eight clean hits chimes, like the engine's own celebration
        if (++clean % 8 === 0) {
          eng.chime();
          flash = Math.max(flash, 0.8);
          if (g.onPhrase) g.onPhrase(api);
        }
        hud();
        return true;
      },
      // A miss steps the multiplier down one level; the engine steps its streak down a quarter
      // A thing that goes by while the button is held down doesn't count: holding is never a mistake
      miss() {
        if (!started || eng.style === "fidget") return false;
        if (downAt && performance.now() - downAt > HOLD_SEC * 1000) return false;
        const counted = eng.clip();
        if (counted) {
          combo = Math.max(0, combo - 8);
          mult = Math.min(4, 1 + Math.floor(combo / 8));
          clean = 0;
        }
        hud();
        return counted;
      },
      bonus(n, label, x, y) {
        if (!started || eng.auto) return;
        if (eng.style !== "fidget") addPoints(n); // Fidget: the moment, not the points
        if (label) api.callout(label, x === undefined ? W / 2 : x, y === undefined ? H * 0.38 : y, Skin.colors.yellow, 1.1);
      },
      callout(text, x, y, color = Skin.colors.cream, scale = 1) {
        callouts.push({ text, x, y, vy: -0.55, a: 1, color, scale });
      },
      ring(x, y, color, size = 44) {
        if (rings.length < 12) rings.push({ x, y, color, size, t: 0 });
      },
      // A tip shown once ever, in context
      hint(id, html) {
        if (!started || eng.style === "fidget") return;
        if (store(g.key + ".hint." + id)) return;
        store(g.key + ".hint." + id, 1);
        q("[data-hinttext]").innerHTML = html;
        q("[data-hint]").style.opacity = "1";
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => (q("[data-hint]").style.opacity = "0"), 4500);
      },
      // The arrive-on-the-beat loop (see the header). The shell drives it from its own beat,
      // update and autopilot; the game calls fire() from onFire.
      track(o) {
        const t = { list: [], o: Object.assign({ ahead: 4, gap: 2, window: 0.3, perfect: 0.1, keep: 6 }, o), since: 99, last: -99 };
        t.next = () => t.list.find((x) => x.state === "wait") || null;
        t.beat = (n) => {
          if (++t.since < Math.max(t.o.gap, eng.paceBeats())) return;
          const ahead = typeof t.o.ahead === "function" ? t.o.ahead() : t.o.ahead;
          const at = Math.max(n + Math.round(ahead), t.last + t.o.gap);
          const thing = t.o.spawn(at, n);
          if (!thing) return;
          t.since = 0;
          t.last = at;
          Object.assign(thing, { at, window: t.o.window + 0.15 * eng.assist, state: "wait" });
          t.list.push(thing);
        };
        const note = (x) => (x && t.o.note ? t.o.note(x) : 0.5);
        const resolve = (x, perfect, ghost, fidget) => {
          x.state = "hit";
          x.hitAt = eng.beatPos();
          return t.o.hit(x, { perfect, ghost, fidget }) || x;
        };
        t.fire = () => {
          const now = eng.beatPos();
          if (eng.style === "fidget") {
            if (t.o.ready === false) return null; // the game's onFire handles Fidget
            const x = t.list.find((y) => y.state === "wait" && (!t.o.ready || t.o.ready(y, now))) || null;
            if (x) resolve(x, false, true, true);
            else if (t.o.empty) t.o.empty();
            eng.tap({ height: x ? note(x) : 0.5 });
            return x;
          }
          let x = null;
          for (const y of t.list) if (y.state === "wait" && Math.abs(now - y.at) < y.window && (!x || Math.abs(now - y.at) < Math.abs(now - x.at))) x = y;
          eng.tap({ height: x ? note(x) : 0.85 });
          if (!x) {
            if (t.o.empty) t.o.empty();
            return null;
          }
          const perfect = Math.abs(now - x.at) < t.o.perfect;
          const at = resolve(x, perfect, false, false);
          api.hit(perfect ? "PERFECT" : "CLEAN", eng.beatSec * 1.5, at.x, at.y);
          return x;
        };
        t.update = () => {
          const now = eng.beatPos();
          for (const x of t.list) {
            if (x.state === "wait" && now > x.at + x.window) {
              x.state = "missed";
              const counted = api.miss();
              if (t.o.miss) t.o.miss(x, counted);
            }
          }
          // Keep finished things a few beats for their animations (or while keep() says), then let them go
          const keep = t.o.keep;
          t.list = t.list.filter((x) => x.state === "wait" || (typeof keep === "function" ? keep(x, now) : now - x.at < keep));
        };
        t.auto = () => {
          const now = eng.beatPos();
          for (const x of t.list) if (x.state === "wait" && now >= x.at) resolve(x, false, true, false);
        };
        trackers.push(t);
        return t;
      },
      // The timing cue: a ring closing on (x, y) as a thing's beat comes, gold inside the perfect
      // window. d is beats to go (thing.at - now). The tracker draws it for you (see cue/cueAt).
      cue(x, y, d, perfect = 0.1, size = 1) {
        if (d > 1.5 || d < -perfect || !started && !eng.auto) return;
        const gold = Math.abs(d) < perfect;
        const r = (12 + Math.max(0, d) * 26) * size;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = gold ? Skin.colors.yellow : api.color();
        for (const [w, a] of gold ? [[10, 0.25], [3, 1]] : [[6, 0.1], [1.5, 0.55 * (1 - d / 1.5) + 0.15]]) {
          ctx.globalAlpha = a;
          ctx.lineWidth = w * size;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      },
      // The hold's charge as the house arc: a ring closing round (x, y) in the tier's colour (or
      // color), gold when full (or full)
      drawCharge(x, y, r, color, full) {
        const c = started ? api.charge : 0;
        if (c <= 0) return;
        color = c >= 1 ? full || Skin.colors.yellow : color || api.color();
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = color;
        ctx.lineCap = "round";
        for (const [w, a] of [[8, 0.18], [2.2, 0.95]]) {
          ctx.globalAlpha = a;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + c * Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    };
    const trackers = [];
    if (new URLSearchParams(location.search).get("test") === "1") window.flowTest = { eng, api, trackers };

    function addPoints(n) {
      const got = Math.round(n * mult * POINT_SCALE[intensity]);
      points += got;
      if (points > hi) {
        hi = points;
        store(hiKey(), hi);
      }
      return got;
    }

    function hud() {
      Skin.score(q("[data-score]"), points, 6);
      q("[data-hi]").textContent = hi.toLocaleString();
      q("[data-mult]").innerHTML = mult + "&times;";
      q("[data-mult]").classList.toggle("ready", mult > 1);
      const fidget = eng.style === "fidget";
      q("[data-style]").textContent = eng.style;
      q("[data-style]").classList.toggle("on", fidget);
      Skin.lights(q("[data-lights]"), fidget ? eng.rev * 100 : eng.flowIndex * 100, fidget && eng.rev > 0.6 ? Skin.colors.yellow : api.color());
      let [label, c] = [eng.tier === 1 ? (eng.locked ? "In sync" : tierNames[0]) : tierNames[eng.tier - 1], api.color()];
      if (fidget && started) [label, c] = ["Press · mash · hold", Skin.colors.yellow];
      if (eng.paused) [label, c] = ["Paused", Skin.colors.cream];
      else if (eng.auto && started) [label, c] = ["Autopilot · tap to take over", Skin.colors.yellow];
      q("[data-label]").textContent = label;
      q("[data-label]").style.color = c;
      q("[data-track]").title = `${eng.trackName} (Tab for the next track)`;
      q("[data-ptrack]").textContent = eng.trackName;
      q("[data-intensity]").textContent = q("[data-pintensity]").textContent = intensity;
      q("[data-pvoice]").textContent = eng.voiceName;
      q("[data-waves]").style.display = eng.muted ? "none" : "";
      q("[data-cross]").style.display = eng.muted ? "" : "none";
    }
    setInterval(() => !eng.paused && hud(), 250);
    // In Fidget the meter is a rev counter, so it moves faster than the rest of the HUD
    setInterval(() => eng.style === "fidget" && !eng.paused && Skin.lights(q("[data-lights]"), eng.rev * 100, eng.rev > 0.6 ? Skin.colors.yellow : api.color()), 60);

    // ---- Engine events --------------------------------------------------------------------
    eng.on("beat", (n) => {
      if (eng.paused || !W) return;
      for (const t of trackers) t.beat(n);
      if (g.onBeat) g.onBeat(n, api);
    });
    eng.on("lock", () => api.callout("In sync", W / 2, H * 0.3, Skin.colors.yellow, 1.05));
    eng.on("auto", () => {
      hud();
      report();
    });
    eng.on("manual", hud);
    eng.on("pause", hud);
    // Fidget climbing a tier (Flow's tier-ups come back from hit())
    eng.on("tier", (t) => {
      api.callout(tierNames[t - 1], W / 2, H * 0.3, Skin.tiers[t - 1], 1.2);
      api.ring(W / 2, H * 0.45, Skin.tiers[t - 1], Math.min(W, H) * 0.45);
      flash = 1.2;
      eng.chime();
    });
    eng.on("signal", (label) => {
      lastInput = performance.now(); // the music comes back for the cue; let it play a while
      api.callout(label, W / 2, H * 0.3, Skin.colors.yellow, 1.1);
      flash = 1.6;
      hud();
    });

    // A host page (the pocket) logs session numbers for tuning
    function report() {
      if (!started || window.parent === window || eng.style === "fidget") return;
      window.parent.postMessage({ type: "flow:session", session: Object.assign(eng.telemetry(), { points, high: hi }) }, "*");
    }
    setInterval(() => started && !eng.auto && !eng.paused && report(), 20000);
    window.addEventListener("pagehide", report);

    // ---- Input ----------------------------------------------------------------------------
    function start() {
      if (started) return;
      started = true;
      eng.start();
      q("[data-marquee]").classList.add("gone");
      hud();
    }
    function setPaused(on) {
      if (!started) return;
      eng.pause(on);
      q("[data-pausecard]").classList.toggle("show", on);
      hud();
    }
    function fire() {
      downAt = lastInput = performance.now();
      eng.rest(false);
      wake();
      if (!started) start();
      if (eng.paused) return setPaused(false);
      // Fidget: the press is a note at once; slow ones get a wide ring of light
      if (eng.press() && eng.rev < 0.35 && g.fidgetPoint) {
        const at = g.fidgetPoint(api);
        api.ring(at.x, at.y, api.color(), 70 - 40 * eng.rev);
      }
      if (g.onFire) g.onFire(api);
    }
    function release() {
      if (!downAt) return;
      const held = (performance.now() - downAt) / 1000;
      downAt = 0;
      eng.release(held);
      if (started && !eng.paused && g.onRelease) g.onRelease(api, held);
    }
    const basePace = Object.assign({}, eng.pacer.o);
    function applyIntensity() {
      eng.pacer.o.slack = basePace.slack * { chill: 1.35, normal: 1, intense: 0.85 }[intensity];
      eng.pacer.o.minBeats = Math.max(1, basePace.minBeats + { chill: 1, normal: 0, intense: -1 }[intensity]);
      eng.pacer.o.startBeats = Math.max(eng.pacer.o.minBeats, basePace.startBeats + { chill: 1, normal: 0, intense: -1 }[intensity]);
    }
    applyIntensity();
    function cycleIntensity() {
      intensity = INTENSITIES[(INTENSITIES.indexOf(intensity) + 1) % INTENSITIES.length];
      store(g.key + ".intensity", intensity);
      applyIntensity();
      hi = parseInt(store(hiKey()) || "0", 10) || 0;
      points = 0;
      combo = 0;
      mult = 1;
      api.callout(intensity, W / 2, 130, Skin.colors.yellow, 1);
      hud();
    }
    function toggleStyle() {
      const style = eng.toggleStyle();
      api.callout(style, W / 2, 130, Skin.colors.yellow, 1);
      api.ring(W / 2, H * 0.5, style === "fidget" ? Skin.colors.yellow : api.color(), Math.min(W, H) * 0.5);
      hud();
    }
    const note = (text, color) => api.callout(text, W / 2, 130, color || Skin.colors.cream, 0.95);
    const press = (sel, fn) =>
      q(sel).addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        e.preventDefault();
        fn();
        hud();
      });
    press("[data-style]", toggleStyle);
    press("[data-pause]", () => setPaused(!eng.paused));
    press("[data-mute]", () => eng.toggleMute());
    press("[data-track]", () => note(eng.cycleTrack().toLowerCase(), Skin.colors.yellow));
    press("[data-ptrack]", () => eng.cycleTrack());
    press("[data-intensity]", cycleIntensity);
    press("[data-pintensity]", cycleIntensity);
    press("[data-pvoice]", () => eng.cycleVoice());
    q("[data-pausecard]").addEventListener("pointerdown", () => setPaused(false));
    q("[data-keyscard]").addEventListener("pointerdown", () => q("[data-keyscard]").classList.remove("show"));
    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      fire();
    });
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);

    function onKeyDown(e) {
      lastInput = performance.now();
      eng.rest(false);
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const keys = q("[data-keyscard]");
      if (keys.classList.contains("show") && e.key !== "?") {
        keys.classList.remove("show");
        if (e.key === "Escape") return;
      }
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (!e.repeat) fire();
        return;
      }
      if (e.repeat) return;
      if (e.key === "Escape") setPaused(!eng.paused);
      else if (e.key === "Enter" && started) eng.setAuto(!eng.auto);
      else if (e.key === "Tab") {
        e.preventDefault();
        note((e.shiftKey ? eng.cycleVoice() : eng.cycleTrack()).toLowerCase(), e.shiftKey ? Skin.colors.magenta : Skin.colors.yellow);
      } else if (e.key === "-") note(`Volume ${Math.round(eng.changeVolume(-0.1) * 100)}%`);
      else if (e.key === "=" || e.key === "+") note(`Volume ${Math.round(eng.changeVolume(0.1) * 100)}%`);
      else if (e.key === "0") eng.toggleMute();
      else if (e.key === "[" || e.key === "]") {
        const ms = eng.adjustOffset(e.key === "[" ? -10 : 10);
        note(`Audio offset ${ms > 0 ? "+" : ""}${ms} ms`);
      } else if (e.key === "?") keys.classList.toggle("show");
      else if (e.key === "`") cycleIntensity();
      else if (e.key === "f" || e.key === "F" || e.key === "\\") toggleStyle();
      else if (/^[1-9]$/.test(e.key) && window.parent !== window) window.parent.postMessage({ type: "flow:game", n: +e.key }, "*");
      else return;
      hud();
    }
    function onKeyUp(e) {
      if (e.code === "Space" || e.code === "ArrowUp") release();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    // The pocket passes on keys pressed while its strip has the keyboard
    window.addEventListener("message", (m) => {
      const d = m.data;
      if (!d || d.type !== "flow:key" || typeof d.code !== "string") return;
      const e = { key: String(d.key || ""), code: d.code, repeat: !!d.repeat, shiftKey: !!d.shiftKey, ctrlKey: false, metaKey: false, altKey: false, preventDefault() {} };
      (d.down ? onKeyDown : onKeyUp)(e);
    });

    // ---- Canvas and frame loop: a steady 60 a second on a deadline, at 0.75x in the pocket ---
    function resize() {
      const vv = window.visualViewport;
      W = window.innerWidth;
      H = vv ? Math.round(vv.height) : window.innerHeight;
      const dpr = pocket ? 0.75 : Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (g.resize) g.resize(api);
    }
    // Frame rates come from the engine (eng.frames, see createFrames): 60 while someone plays,
    // 30 while the game plays itself (attract, autopilot, pause, or no input for 6 s), 10 after
    // ten minutes untouched, and its governor steps them down when the frames get heavy or the
    // machine is busy. Tap timing comes from input events and the audio clock, so the rate only
    // changes smoothness. No input for a minute: the music rests (fades out and stops) until the
    // next press. ?fps=N fixes the rate and ?rest=S the music's rest delay, for measuring.
    const FIXED_FPS = +new URLSearchParams(location.search).get("fps") || 0;
    const REST_MS = (+new URLSearchParams(location.search).get("rest") || 60) * 1000;
    let lastInput = performance.now();
    const playing = () => started && !eng.auto && !eng.paused && (downAt || performance.now() - lastInput < 6000);
    const frameState = () => (playing() ? "play" : performance.now() - lastInput > eng.frames.o.restSec * 1000 ? "rest" : "auto");
    const frameRate = () => FIXED_FPS || eng.frames.want(frameState());
    const frameMs = () => 1000 / frameRate();
    let due = 0, last = performance.now(), chase = 0;
    let fpsFrames = 0, fpsWork = 0, fpsSince = performance.now();
    // Between frames the page sleeps on a timer rather than asking for every vsync, so a slow
    // frame rate really is cheap (each requested vsync costs the browser work even when nothing
    // is drawn). A press wakes it at once.
    let sleeper = 0;
    function nextFrame() {
      const wait = due - performance.now() - 6;
      if (wait > 4) sleeper = setTimeout(() => ((sleeper = 0), requestAnimationFrame(frame)), wait);
      else requestAnimationFrame(frame);
    }
    function wake() {
      if (!sleeper) return;
      clearTimeout(sleeper);
      sleeper = 0;
      due = 0;
      requestAnimationFrame(frame);
    }
    function frame(now) {
      if (now < due - 1) return requestAnimationFrame(frame);
      due = Math.max(due + frameMs(), now);
      const frameStart = performance.now();
      const gap = (now - last) / 1000;
      const dt = Math.min(0.12, Math.max(0.001, gap));
      if (started && !downAt) eng.rest(performance.now() - lastInput > REST_MS);
      last = now;
      eng.update(dt);
      if (!eng.paused) {
        // Attract mode, autopilot, or Fidget left alone for 4 s: the game plays itself
        if (!started || eng.auto || eng.fidgetIdle(!!downAt)) {
          for (const t of trackers) t.auto();
          if (g.autopilot) g.autopilot(dt, api);
        }
        for (const t of trackers) t.update();
        if (g.update) g.update(dt, api);
        flash = Math.max(0, flash - dt);
        chase += (dt / eng.beatSec) * 2 * (1 + (eng.style === "fidget" ? eng.rev * 3 : 0)); // the rail chases faster as you rev
        for (let i = rings.length - 1; i >= 0; i--) if ((rings[i].t += dt / 0.45) >= 1) rings.splice(i, 1);
        for (let i = callouts.length - 1; i >= 0; i--) {
          const c = callouts[i];
          c.y += c.vy * dt * 60;
          c.vy *= Math.pow(0.97, dt * 60);
          if ((c.a -= dt * 0.7) <= 0) callouts.splice(i, 1);
        }
        ctx.globalAlpha = 1;
        const workStart = performance.now();
        if (g.draw) g.draw(ctx, api, now / 1000);
        // Each tracker's next thing gets the timing cue, gold on the perfect beat (not in Fidget,
        // which has no timing)
        if (eng.style !== "fidget") {
          const beat = eng.beatPos();
          for (const t of trackers) {
            if (t.o.cue === false) continue;
            const x = t.next();
            if (!x) continue;
            const at = t.o.cueAt ? t.o.cueAt(x) : x;
            if (at && at.x !== undefined) api.cue(at.x, at.y, x.at - beat, t.o.perfect, t.o.cueSize || 1);
          }
        }
        ctx.globalCompositeOperation = "lighter";
        for (const r of rings) {
          const e = 1 - Math.pow(1 - r.t, 3);
          ctx.globalAlpha = 1 - r.t;
          ctx.strokeStyle = r.color;
          ctx.lineWidth = 4 * (1 - r.t) + 1;
          ctx.beginPath();
          ctx.arc(r.x, r.y, 8 + r.size * e, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        for (const c of callouts) Skin.callout(ctx, c.text, c.x, c.y, c.color, 20 * c.scale, Math.max(0, Math.min(1, (1 - c.a) * 8, c.a)), 1 - c.a);
        Skin.bulbs(ctx, W, H - 9, chase / 2, flash > 0 && Math.floor(flash * 10) % 2 === 0 ? 1 : 0);
        fpsFrames++;
        fpsWork += performance.now() - workStart;
        if (!FIXED_FPS) eng.frames.record(performance.now() - frameStart, gap, frameRate());
        if (now - fpsSince > 2000) {
          if (window.parent !== window) window.parent.postMessage({ type: "flow:fps", fps: Math.round((fpsFrames * 1000) / (now - fpsSince)), workMs: +(fpsWork / fpsFrames).toFixed(2), canvas: canvas.width + "x" + canvas.height }, "*");
          fpsFrames = fpsWork = 0;
          fpsSince = now;
        }
      }
      nextFrame();
    }

    window.addEventListener("resize", resize);
    if (window.visualViewport) visualViewport.addEventListener("resize", resize);
    resize();
    if (g.setup) g.setup(api);
    hud();
    requestAnimationFrame(frame);
    return api;
  }

  window.SpaceShell = { mount };
})();
