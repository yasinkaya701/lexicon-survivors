(function (root) {
  'use strict';
  const KEY = 'lexicon_voice_settings_v1';
  const defaults = { enabled: true, muted: false, volume: 0.78, voiceURI: '' };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  let settings = { ...defaults };
  try {
    const saved = JSON.parse(root.localStorage?.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') settings = {
      enabled: typeof saved.enabled === 'boolean' ? saved.enabled : defaults.enabled,
      muted: typeof saved.muted === 'boolean' ? saved.muted : defaults.muted,
      volume: Number.isFinite(Number(saved.volume)) ? clamp(Number(saved.volume), 0, 1) : defaults.volume,
      voiceURI: typeof saved.voiceURI === 'string' ? saved.voiceURI : ''
    };
  } catch (_) {}
  const synth = root.speechSynthesis || null;
  const Utterance = root.SpeechSynthesisUtterance || null;
  let voices = [];
  let generation = 0;
  let pauseTimer = 0;
  function refreshVoices() { try { voices = synth?.getVoices?.() || []; } catch (_) { voices = []; } return voices.slice(); }
  refreshVoices();
  if (synth?.addEventListener) synth.addEventListener('voiceschanged', refreshVoices);
  else if (synth) synth.onvoiceschanged = refreshVoices;
  function persist() { try { root.localStorage?.setItem(KEY, JSON.stringify(settings)); } catch (_) {} }
  function langFor(role, lang) {
    if (lang) return String(lang);
    return role === 'story' || role === 'narrative' || role === 'character' ? 'tr-TR' : 'en-US';
  }
  function getVoices(lang) {
    refreshVoices();
    const requested = String(lang || '').toLowerCase();
    const base = requested.split('-')[0];
    return voices.filter(v => !lang || String(v.lang || '').toLowerCase().startsWith(base));
  }
  const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|kathy|ralph|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley/i;
  const QUALITY = /premium|enhanced|neural|natural|siri|online|google|microsoft/i;
  const PREFERRED = { tr: /yelda|ozge|emel|tolga|filiz/i, en: /samantha|ava|serena|daniel|karen|moira|google us|aria|jenny|guy/i };
  const DEEP = /daniel|alex|aaron|arthur|guy|fred|google uk english male|david|mark/i;
  function chooseVoice(lang, role) {
    const candidates = getVoices(lang).filter(v => !NOVELTY.test(v.name || ''));
    if (!candidates.length) return getVoices(lang)[0] || null;
    const match = v => String(v.lang || '').toLowerCase() === String(lang).toLowerCase();
    const selected = candidates.find(v => v.voiceURI === settings.voiceURI);
    if (selected && match(selected)) return selected;
    const base = String(lang).toLowerCase().split('-')[0];
    return candidates.slice().sort((a, b) => {
      const score = v => (match(v) ? 10 : 0) + (QUALITY.test(v.name || '') ? 4 : 0) + (PREFERRED[base]?.test(v.name || '') ? 3 : 0)
        + (role === 'boss' && DEEP.test(v.name || '') ? 5 : 0) + (v.default ? 1 : 0) + (v.localService === true ? .25 : 0);
      return score(b) - score(a);
    })[0] || null;
  }
  function tidy(text) {
    return String(text).replace(/[*_`#>]+/g, '').replace(/\s*[·•|]\s*/g, ', ').replace(/\(([^)]*)\)/g, ', $1,')
      .replace(/\s*[—–]\s*/g, ', ').replace(/\.{3,}/g, '…').replace(/\s+/g, ' ').trim();
  }
  // Music ducking while a line is spoken, so narration stays readable over the score.
  let ducked = 0;
  function duck(on) {
    try {
      const sm = typeof sounds !== 'undefined' ? sounds : null;
      if (!sm?.music) return;
      if (on) { ducked++; sm.music.volume = 0.24 * (sm.musicVolume ?? 1) * 0.35; }
      else if (--ducked <= 0) { ducked = 0; sm.music.volume = 0.24 * (sm.musicVolume ?? 1); }
    } catch (_) {}
  }
  function chunks(text) {
    const sentences = String(text).match(/[^.!?。！？…]+(?:[.!?。！？…]+|$)/gu) || [String(text)];
    const out = [];
    for (const sentence of sentences) {
      const s = sentence.trim(); if (!s) continue;
      if (s.length <= 190) { out.push(s); continue; }
      const phrases = s.match(/.{1,150}(?:,|;|:|—|–|\s|$)/gu) || [s];
      let pending = '';
      for (const part of phrases) {
        const next = (pending + ' ' + part.trim()).trim();
        if (pending && next.length > 170) { out.push(pending); pending = part.trim(); }
        else pending = next;
      }
      if (pending) out.push(pending);
    }
    return out;
  }
  // ---- Pre-rendered neural clips (scripts/build_voice.py) -------------------------------
  // Story, chapter and boss lines ship as mp3 files keyed by profile + hash of the text. A
  // missing manifest, missing line or a blocked player falls back to the browser voice.
  const VOICE_DIR = 'assets/audio/voice/';
  let manifest = null, clipAudio = null, hallNode = null;
  const canFetch = !!root.location && /^https?:$/.test(root.location.protocol);
  if (canFetch && root.fetch) {
    root.fetch(VOICE_DIR + 'manifest.json').then(r => r.ok ? r.json() : null).then(m => { manifest = m; }).catch(() => {});
  }
  function fnv(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
  function profileFor(role, lang, speaker, character) {
    const m = manifest; if (!m) return '';
    const heroOf = id => 'hero_' + (m.profiles['hero_' + id] ? id : 'inky');
    if (speaker === 'hero') return heroOf(character);
    if (speaker && m.heroes.includes(speaker)) return heroOf(speaker);
    if (speaker && m.speakers[speaker]) return m.speakers[speaker];
    if (speaker) for (const [prefix, name] of m.prefixes) if (speaker.startsWith(prefix)) return name;
    if (role === 'boss') return String(lang).startsWith('en') ? 'boss_en' : 'boss';
    return role === 'narrative' || role === 'story' || role === 'narrator' ? 'narrator' : '';
  }
  function clipFor(text, role, lang, speaker, character) {
    const profile = profileFor(role, lang, speaker, character);
    const file = profile && manifest.lines[profile + '-' + fnv(text)];
    return file ? { url: VOICE_DIR + file, effect: manifest.profiles[profile]?.effect || '' } : null;
  }
  function impulse(ctx) {
    const len = Math.floor(ctx.sampleRate * 1.6), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    return buf;
  }
  function stopClip() {
    if (!clipAudio) return;
    const a = clipAudio; clipAudio = null;
    try { a.onended = a.onerror = null; a.pause(); a.removeAttribute('src'); a.load(); } catch (_) {}
  }
  function playClip(clip, run, fallback) {
    stopClip();
    const audio = new Audio(clip.url);
    audio.volume = clamp(settings.volume, 0, 1);
    clipAudio = audio;
    try {
      const sm = typeof sounds !== 'undefined' ? sounds : null;
      if (clip.effect === 'hall' && sm?.ctx && sm.ctx.state === 'running' && canFetch) {
        const ctx = sm.ctx, src = ctx.createMediaElementSource(audio), wet = ctx.createGain(), dry = ctx.createGain();
        if (!hallNode) { hallNode = ctx.createConvolver(); hallNode.buffer = impulse(ctx); hallNode.connect(ctx.destination); }
        audio.volume = 1; dry.gain.value = clamp(settings.volume, 0, 1); wet.gain.value = clamp(settings.volume, 0, 1) * 0.55;
        src.connect(dry); dry.connect(ctx.destination); src.connect(wet); wet.connect(hallNode);
      }
    } catch (_) {}
    audio.onended = () => { if (clipAudio === audio) { clipAudio = null; duck(false); } };
    audio.onerror = () => { if (clipAudio === audio) { clipAudio = null; duck(false); if (run === generation) fallback(); } };
    duck(true);
    const started = audio.play();
    if (started && started.catch) started.catch(() => { if (clipAudio === audio) { clipAudio = null; duck(false); if (run === generation) fallback(); } });
    return true;
  }
  function cancel() {
    stopClip();
    if (ducked) { ducked = 1; duck(false); }
    generation++; clearTimeout(pauseTimer); pauseTimer = 0;
    try { synth?.cancel?.(); } catch (_) {}
    return true;
  }
  function speak(text, options) {
    const opts = options || {};
    const content = tidy(text || '');
    if (!content || !synth || !Utterance || !settings.enabled || settings.muted || settings.volume <= 0) return false;
    if (opts.interrupt !== false) cancel();
    const run = generation;
    const role = opts.role || 'narrative';
    const lang = langFor(role, opts.lang);
    const parts = chunks(content);
    if (!parts.length) return false;
    const clip = opts.noClip ? null : clipFor(content, role, lang, opts.speaker, opts.character);
    if (clip) return playClip(clip, run, () => speak(text, { ...opts, speaker: '__none__', interrupt: false, noClip: true }));
    const profile = role === 'boss' ? { rate: .82, pitch: .62 } : role === 'quiz' || role === 'word' ? { rate: .84, pitch: 1 } : { rate: .94, pitch: 1 };
    let index = 0;
    const next = () => {
      if (run !== generation || index >= parts.length) return;
      const utterance = new Utterance(parts[index++]);
      utterance.lang = lang; utterance.voice = chooseVoice(lang, role);
      utterance.rate = profile.rate; utterance.pitch = profile.pitch;
      utterance.volume = clamp(settings.volume, 0, 1);
      if (index === 1) { duck(true); }
      utterance.onend = () => {
        if (run !== generation) { return; }
        if (index >= parts.length) duck(false);
        if (index < parts.length) {
          const prior = parts[index - 1];
          const delay = /[.!?。！？…]$/.test(prior) ? 260 : /[,;:]$/.test(prior) ? 150 : 90;
          pauseTimer = setTimeout(next, delay);
        }
      };
      utterance.onerror = () => { if (run !== generation) return; if (index < parts.length) next(); else duck(false); };
      try { synth.speak(utterance); } catch (_) { cancel(); }
    };
    if (!voices.length && synth.addEventListener) {
      // Voices load lazily in Chrome/Safari: wait briefly rather than speak with the wrong default.
      let started = false;
      const go = () => { if (started || run !== generation) return; started = true; refreshVoices(); next(); };
      synth.addEventListener('voiceschanged', go, { once: true }); setTimeout(go, 900);
    } else next();
    return true;
  }
  function set(patch) {
    if (!patch || typeof patch !== 'object') return getSettings();
    if (typeof patch.enabled === 'boolean') settings.enabled = patch.enabled;
    if (typeof patch.muted === 'boolean') settings.muted = patch.muted;
    if (patch.volume !== undefined && Number.isFinite(Number(patch.volume))) settings.volume = clamp(Number(patch.volume), 0, 1);
    if (typeof patch.voiceURI === 'string') settings.voiceURI = patch.voiceURI;
    persist();
    if (!settings.enabled || settings.muted || settings.volume <= 0) cancel();
    return getSettings();
  }
  function getSettings() { return { ...settings }; }
  const api = {
    speak, cancel, set, getSettings,
    get muted() { return settings.muted || !settings.enabled; },
    set muted(value) { set({ muted: Boolean(value) }); },
    get volume() { return settings.volume; },
    set volume(value) { set({ volume: value }); },
    get voices() { refreshVoices(); return voices.map(v => ({ voiceURI: v.voiceURI, name: v.name, lang: v.lang, default: !!v.default })); },
    get voiceChoice() { return settings.voiceURI; },
    set voiceChoice(value) { set({ voiceURI: String(value || '') }); },
    settings: { enabled: 'enabled', muted: 'muted', volume: 'volume', voiceURI: 'voiceURI' }
  };
  root.ErrataVoice = api;
})(typeof window !== 'undefined' ? window : globalThis);
