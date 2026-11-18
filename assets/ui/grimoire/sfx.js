/* Grimoire sound layer.
 *
 * Adds the cues the new systems were missing (hover ticks, page turns, chest,
 * seal break, achievements, wave start/end, level up, boss echo) on top of the
 * SoundManager in game.js. Everything here is synthesised through the same
 * AudioContext, so it needs no files, respects the SFX mute/volume setting and
 * stays silent until the browser has allowed audio. The quiz cues now play the
 * recorded quiz_correct / quiz_incorrect files instead of bare sine beeps.
 */
(function () {
  "use strict";
  if (typeof sounds === "undefined") return;
  const sm = sounds;
  const rand = (a, b) => a + Math.random() * (b - a);

  function ready() {
    if (sm.sfxMuted || sm.sfxVolume <= 0) return null;
    try { if (!sm.ctx || sm.ctx.state === "suspended") sm.init(); } catch (_) { return null; }
    return sm.ctx && sm.ctx.state === "running" ? sm.ctx : null;
  }

  let noiseBuf = null;
  function noise(ctx) {
    if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  // One enveloped oscillator note. `glide` slides the pitch to a second value.
  function note(ctx, { f, to, type = "sine", at = 0, dur = 0.2, vol = 0.16, attack = 0.004 }) {
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const v = vol * sm.sfxVolume;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  // Filtered noise burst: paper, scrapes, cracks, whooshes.
  function burst(ctx, { at = 0, dur = 0.2, vol = 0.14, kind = "bandpass", f = 1800, to, q = 0.9 }) {
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource(), filt = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise(ctx);
    filt.type = kind; filt.Q.value = q;
    filt.frequency.setValueAtTime(f, t);
    if (to) filt.frequency.exponentialRampToValueAtTime(to, t + dur);
    const v = vol * sm.sfxVolume;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + Math.min(0.02, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(ctx.destination);
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }

  const bell = (ctx, f, at = 0, vol = 0.12, dur = 1.1) => {
    note(ctx, { f, at, dur, vol });
    note(ctx, { f: f * 2.01, at, dur: dur * 0.6, vol: vol * 0.45 });
    note(ctx, { f: f * 2.76, at, dur: dur * 0.35, vol: vol * 0.25 });
  };

  const cues = {
    hover(ctx) { note(ctx, { f: rand(1500, 1700), type: "triangle", dur: 0.035, vol: 0.022 }); },
    page(ctx) {
      burst(ctx, { dur: 0.17, vol: 0.12, f: 900, to: 4200, q: 0.6 });
      burst(ctx, { at: 0.07, dur: 0.12, vol: 0.06, f: 3200, to: 1200, q: 0.7 });
    },
    wax(ctx) {
      note(ctx, { f: 190, to: 90, type: "sine", dur: 0.16, vol: 0.2 });
      burst(ctx, { dur: 0.08, vol: 0.07, f: 600, kind: "lowpass" });
      bell(ctx, 1046, 0.06, 0.06, 0.5);
    },
    sealGold(ctx) {
      burst(ctx, { dur: 0.09, vol: 0.2, f: 2600, kind: "highpass" });
      note(ctx, { f: 110, to: 55, type: "sine", dur: 0.34, vol: 0.34 });
      [880, 1175, 1568].forEach((f, i) => bell(ctx, f, 0.05 + i * 0.07, 0.1, 0.9));
    },
    sealBronze(ctx) {
      burst(ctx, { dur: 0.09, vol: 0.16, f: 2000, kind: "highpass" });
      note(ctx, { f: 120, to: 60, dur: 0.3, vol: 0.3 });
      bell(ctx, 698, 0.05, 0.09, 0.7);
    },
    sealMiss(ctx) {
      burst(ctx, { dur: 0.22, vol: 0.2, f: 3200, to: 300, kind: "lowpass", q: 0.4 });
      note(ctx, { f: 150, to: 45, type: "sawtooth", dur: 0.4, vol: 0.2 });
    },
    chestOpen(ctx) {
      note(ctx, { f: 70, to: 62, type: "sawtooth", dur: 0.5, vol: 0.12 });
      burst(ctx, { dur: 0.5, vol: 0.09, f: 500, to: 1400, q: 5 });
      note(ctx, { f: 90, to: 45, dur: 0.25, vol: 0.3, at: 0.5 });
      [784, 988, 1175, 1568].forEach((f, i) => bell(ctx, f, 0.62 + i * 0.09, 0.09, 1.0));
    },
    relic(ctx) { [659, 988, 1319].forEach((f, i) => bell(ctx, f, i * 0.08, 0.09, 0.9)); },
    achievement(ctx) {
      bell(ctx, 523, 0, 0.12, 1.4);
      bell(ctx, 784, 0.12, 0.11, 1.4);
      bell(ctx, 1046, 0.24, 0.1, 1.6);
    },
    threat(ctx) {
      note(ctx, { f: 62, to: 48, type: "sawtooth", dur: 0.7, vol: 0.2 });
      note(ctx, { f: 93, to: 70, type: "square", dur: 0.5, vol: 0.07, at: 0.1 });
      burst(ctx, { dur: 0.6, vol: 0.06, f: 200, to: 90, kind: "lowpass" });
    },
    revive(ctx) {
      note(ctx, { f: 55, type: "sine", dur: 0.9, vol: 0.3 });
      [330, 440, 659].forEach((f, i) => note(ctx, { f, at: 0.25 + i * 0.12, dur: 0.7, vol: 0.12, type: "triangle" }));
      bell(ctx, 880, 0.6, 0.1, 1.5);
    },
    route(ctx) { burst(ctx, { dur: 0.3, vol: 0.08, f: 300, to: 1600, q: 1.2 }); bell(ctx, 587, 0.1, 0.07, 0.8); },
    waveStart(ctx) {
      note(ctx, { f: 82, to: 55, type: "sawtooth", dur: 0.55, vol: 0.2 });
      note(ctx, { f: 164, to: 110, type: "triangle", dur: 0.5, vol: 0.1, at: 0.02 });
      burst(ctx, { dur: 0.45, vol: 0.07, f: 400, to: 2400, q: 0.5 });
    },
    waveEnd(ctx) { [392, 523, 659, 784].forEach((f, i) => bell(ctx, f, i * 0.1, 0.09, 0.9)); },
    levelUp(ctx) {
      [523, 659, 784, 1046].forEach((f, i) => note(ctx, { f, type: "triangle", at: i * 0.07, dur: 0.25, vol: 0.13 }));
      bell(ctx, 1568, 0.3, 0.08, 1.1);
    },
    denied(ctx) { note(ctx, { f: 170, to: 120, type: "square", dur: 0.12, vol: 0.09 }); note(ctx, { f: 150, to: 100, type: "square", dur: 0.14, vol: 0.09, at: 0.09 }); },
    bossEcho(ctx) {
      note(ctx, { f: 58, to: 40, type: "sawtooth", dur: 1.0, vol: 0.24 });
      bell(ctx, 233, 0.05, 0.12, 1.8);
      burst(ctx, { dur: 0.9, vol: 0.07, f: 160, to: 800, kind: "lowpass", q: 2 });
    },
    victory(ctx) { [523, 659, 784, 1046, 1318].forEach((f, i) => bell(ctx, f, i * 0.13, 0.1, 1.8)); },
    defeat(ctx) {
      [392, 349, 311, 262].forEach((f, i) => note(ctx, { f, type: "triangle", at: i * 0.22, dur: 0.6, vol: 0.14 }));
      note(ctx, { f: 65, to: 45, type: "sine", dur: 1.4, vol: 0.28, at: 0.5 });
    },
  };

  function play(name) {
    const ctx = ready();
    if (!ctx || !cues[name]) return false;
    try { cues[name](ctx); return true; } catch (_) { return false; }
  }

  // Quiz: recorded files first, synth as fallback.
  const origSuccess = sm.quizSuccess.bind(sm), origFail = sm.quizFail.bind(sm);
  sm.quizSuccess = function () { if (!sm.playOneShot("assets/audio/ui/quiz_correct.wav", 0.62)) origSuccess(); };
  sm.quizFail = function () { if (!sm.playOneShot("assets/audio/ui/quiz_incorrect.wav", 0.6)) origFail(); };

  // Seal break: the game plays one tone per grade; replace it with the full cue.
  const origTone = sm.playTone.bind(sm);
  sm.playTone = function (freq, type, dur, gain) {
    if (dur === 0.2 && gain === 0.2) {
      if (freq === 880 && play("sealGold")) return;
      if (freq === 660 && type === "triangle" && play("sealBronze")) return;
      if (freq === 180 && type === "sawtooth" && play("sealMiss")) return;
    }
    if (freq === 660 && type === "triangle" && dur === 0.16 && gain === 0.16 && play("levelUp")) return;
    return origTone(freq, type, dur, gain);
  };

  // Hover ticks on real controls (not touch, throttled).
  let lastHover = 0, lastEl = null;
  document.addEventListener("pointerover", event => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    const el = event.target.closest?.("button,[role=tab],.hub-door,.hub-npc");
    if (!el || el === lastEl || el.disabled) return;
    const now = performance.now();
    if (now - lastHover < 70) return;
    lastEl = el; lastHover = now;
    play("hover");
  }, true);
  document.addEventListener("pointerout", () => { lastEl = null; }, true);

  // Denied clicks on disabled shop buttons.
  document.addEventListener("click", event => {
    const el = event.target.closest?.("button");
    if (el && (el.disabled || el.getAttribute("aria-disabled") === "true")) play("denied");
    if (event.target.closest?.(".gc-chest")) play("chestOpen");
  }, true);

  // Hub / story / stage screens turning over.
  document.addEventListener("grimoire:mode", () => play("page"));
  function watch(selector, name) {
    const seen = new WeakSet();
    new MutationObserver(records => {
      for (const r of records) for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        const el = n.matches?.(selector) ? n : n.querySelector?.(selector);
        if (el && !seen.has(el)) { seen.add(el); play(name); }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  watch(".grimoire-chest", "relic");
  watch(".seal-break", "page");
  watch(".meta-toast--ach", "achievement");
  watch(".meta-toast--threat", "threat");
  watch(".meta-toast--revive", "revive");
  watch(".meta-toast--route", "route");

  // Hooks into the meta layer and the wave loop.
  function wrapMeta() {
    const meta = window.GrimoireMeta;
    if (!meta || meta.__sfx) return !!meta;
    meta.__sfx = true;
    const runEnd = meta.onRunEnd;
    if (typeof runEnd === "function") meta.onRunEnd = function (victory) { play(victory ? "victory" : "defeat"); return runEnd.apply(this, arguments); };
    for (const [hook, cue] of [["onWaveStart", "waveStart"], ["onWaveEnd", "waveEnd"]]) {
      const fn = meta[hook];
      if (typeof fn === "function") meta[hook] = function () { play(cue); return fn.apply(this, arguments); };
    }
    return true;
  }
  if (!wrapMeta()) window.addEventListener("load", wrapMeta);

  // Wax gain: watch the counter for increases.
  let lastWax = null;
  setInterval(() => {
    const w = window.GrimoireMeta?.wax;
    if (typeof w !== "number") return;
    if (lastWax !== null && w > lastWax) play("wax");
    lastWax = w;
  }, 400);

  window.GrimoireSfx = { play, cues: Object.keys(cues) };
})();
