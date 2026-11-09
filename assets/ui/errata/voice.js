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
  function chooseVoice(lang) {
    const candidates = getVoices(lang);
    if (!candidates.length) return null;
    const match = v => String(v.lang || '').toLowerCase() === String(lang).toLowerCase();
    const selected = candidates.find(v => v.voiceURI === settings.voiceURI);
    if (selected && match(selected)) return selected;
    const natural = /natural|neural|enhanced|premium|google|siri|microsoft/i;
    return candidates.slice().sort((a, b) => {
      const score = v => (match(v) ? 10 : 0) + (natural.test(v.name || '') ? 2 : 0) + (v.default ? 1 : 0) + (v.localService === true ? .25 : 0);
      return score(b) - score(a);
    })[0] || null;
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
  function cancel() {
    generation++; clearTimeout(pauseTimer); pauseTimer = 0;
    try { synth?.cancel?.(); } catch (_) {}
    return true;
  }
  function speak(text, options) {
    const opts = options || {};
    const content = String(text || '').trim();
    if (!content || !synth || !Utterance || !settings.enabled || settings.muted || settings.volume <= 0) return false;
    if (opts.interrupt !== false) cancel();
    const run = generation;
    const role = opts.role || 'narrative';
    const lang = langFor(role, opts.lang);
    const parts = chunks(content);
    if (!parts.length) return false;
    const profile = role === 'boss' ? { rate: .9, pitch: .92 } : role === 'quiz' || role === 'word' ? { rate: .84, pitch: 1 } : { rate: .94, pitch: 1 };
    let index = 0;
    const next = () => {
      if (run !== generation || index >= parts.length) return;
      const utterance = new Utterance(parts[index++]);
      utterance.lang = lang; utterance.voice = chooseVoice(lang);
      utterance.rate = profile.rate; utterance.pitch = profile.pitch;
      utterance.volume = clamp(settings.volume, 0, 1);
      utterance.onend = () => {
        if (run !== generation) return;
        if (index < parts.length) {
          const prior = parts[index - 1];
          const delay = /[.!?。！？…]$/.test(prior) ? 260 : /[,;:]$/.test(prior) ? 150 : 90;
          pauseTimer = setTimeout(next, delay);
        }
      };
      utterance.onerror = () => { if (run === generation && index < parts.length) next(); };
      try { synth.speak(utterance); } catch (_) { cancel(); }
    };
    next();
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
