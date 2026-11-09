const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Utterance {
  constructor(text) { this.text = text; }
}
const store = new Map();
const queued = [];
const listeners = {};
const synth = {
  voices: [
    { name: 'English Default', lang: 'en-US', voiceURI: 'en-us', default: true, localService: true },
    { name: 'English Natural', lang: 'en-US', voiceURI: 'en-natural', localService: true },
    { name: 'Türkçe Natural', lang: 'tr-TR', voiceURI: 'tr-natural', localService: true }
  ],
  getVoices() { return this.voices; },
  addEventListener(name, fn) { listeners[name] = fn; },
  speak(utterance) { queued.push(utterance); },
  cancel() { queued.length = 0; }
};
const context = {
  window: null,
  SpeechSynthesisUtterance: Utterance,
  speechSynthesis: synth,
  localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) },
  setTimeout: fn => { context.pending = fn; return 1; },
  clearTimeout: () => { context.pending = null; }
};
context.window = context;
vm.runInNewContext(fs.readFileSync('assets/ui/errata/voice.js', 'utf8'), context);
const voice = context.ErrataVoice;

assert.equal(voice.speak('Hello, archive.', { role: 'boss' }), true);
assert.equal(queued.length, 1);
assert.equal(queued[0].lang, 'en-US');
assert.equal(queued[0].voice.voiceURI, 'en-natural');
assert.ok(queued[0].rate < 1 && queued[0].pitch < 1);
queued[0].onend();
assert.equal(voice.speak('Merhaba, arşiv.', { role: 'story' }), true);
assert.equal(queued[0].lang, 'tr-TR');
assert.equal(queued[0].voice.voiceURI, 'tr-natural');

voice.set({ voiceURI: 'en-us', volume: 0.35 });
assert.equal(voice.speak('clear', { role: 'quiz', lang: 'en-GB' }), true);
assert.equal(queued[0].voice.voiceURI, 'en-natural'); // selected voice is incompatible; locale fallback wins
assert.equal(queued[0].volume, 0.35);
assert.equal(queued[0].rate, 0.84);
const activeBeforeSilence = queued[0];
voice.set({ volume: 0 });
assert.equal(queued.length, 0, 'setting voice volume to zero immediately cancels active speech');
activeBeforeSilence.onend();
assert.equal(context.pending, null, 'zero volume invalidates active phrase callbacks');
voice.set({ volume: 0.35 });

const longText = 'First sentence. Second sentence, with a pause; and a long continuation that should be divided into separate phrases for the browser speech queue.';
assert.equal(voice.speak(longText, { role: 'narrative' }), true);
assert.equal(queued.length, 1);
const first = queued[0];
assert.match(first.text, /First sentence\./);
first.onend();
assert.equal(typeof context.pending, 'function');
const advance = context.pending; context.pending = null; advance();
assert.equal(queued.length, 2);
assert.match(queued[1].text, /Second sentence/);

const beforeCancel = queued[1];
voice.cancel();
beforeCancel.onend();
assert.equal(context.pending, null, 'cancelled utterance must not schedule stale phrases');
assert.equal(voice.speak('muted', { role: 'boss' }), true);
voice.set({ muted: true });
assert.equal(voice.speak('must not sound', { role: 'boss' }), false);
assert.equal(queued.length, 0, 'muting cancels active speech');
assert.equal(JSON.parse(store.get('lexicon_voice_settings_v1')).muted, true);
assert.equal(JSON.parse(store.get('lexicon_voice_settings_v1')).volume, 0.35);

const rebooted = { ...context, window: null };
rebooted.window = rebooted;
vm.runInNewContext(fs.readFileSync('assets/ui/errata/voice.js', 'utf8'), rebooted);
assert.equal(rebooted.ErrataVoice.getSettings().muted, true);
assert.equal(rebooted.ErrataVoice.volume, 0.35);
console.log('Voice harness passed: voice selection, language fallback, pacing, phrase queue, cancel, mute, volume and persistence.');
