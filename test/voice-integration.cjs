const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.codex/skills/develop-web-game/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const pageErrors = [];
    const paidRequests = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
      if (/api\.openai\.com|api\.elevenlabs\.io|speech\.microsoft\.com|texttospeech\.googleapis\.com|polly\.[^/]+\.amazonaws\.com/i.test(request.url())) paidRequests.push(request.url());
    });
    // Install the controlled speech implementation before any page scripts run.
    await page.addInitScript(() => {
      window.__speechHarness = { spoken: [], cancels: 0, listeners: {} };
      window.SpeechSynthesisUtterance = class {
        constructor(text) { this.text = text; }
      };
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        getVoices() { return [
          { name: 'English Natural Test', lang: 'en-US', voiceURI: 'test-en', localService: true },
          { name: 'Türkçe Natural Test', lang: 'tr-TR', voiceURI: 'test-tr', localService: true }
        ]; },
        addEventListener(name, fn) { window.__speechHarness.listeners[name] = fn; },
        speak(utterance) { window.__speechHarness.spoken.push(utterance); },
        cancel() { window.__speechHarness.cancels++; window.__speechHarness.spoken.length = 0; },
        pause() {}, resume() {}
      } });
    });
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof ErrataVoice !== 'undefined' && typeof speakGameText === 'function');

    await page.evaluate(() => {
      speakGameText('The archive remembers.', { lang: 'en-US', role: 'boss' });
    });
    let utterance = await page.evaluate(() => {
      const item = window.__speechHarness.spoken[0];
      return item && { text: item.text, lang: item.lang, voice: item.voice?.voiceURI, rate: item.rate, pitch: item.pitch };
    });
    assert.deepEqual(utterance, { text: 'The archive remembers.', lang: 'en-US', voice: 'test-en', rate: 0.9, pitch: 0.92 }, 'boss wrapper routes through the English restrained profile');

    await page.evaluate(() => replayGameSpeech());
    assert.equal(await page.evaluate(() => window.__speechHarness.spoken[0]?.text), 'The archive remembers.', 'replay uses the same TTS adapter');
    const cancelCount = await page.evaluate(() => window.__speechHarness.cancels);
    await page.evaluate(() => stopGameSpeech());
    assert.ok(await page.evaluate(() => window.__speechHarness.cancels) > cancelCount, 'game stop wrapper cancels browser synthesis');

    await page.evaluate(() => speakGameText('Merhaba, arşiv.', { lang: 'tr-TR', role: 'narrator' }));
    utterance = await page.evaluate(() => {
      const item = window.__speechHarness.spoken[0];
      return item && { text: item.text, lang: item.lang, voice: item.voice?.voiceURI };
    });
    assert.deepEqual(utterance, { text: 'Merhaba, arşiv.', lang: 'tr-TR', voice: 'test-tr' }, 'story wrapper selects Turkish narration');

    await page.evaluate(() => speakGameText('archive', { lang: 'en-US', role: 'word' }));
    assert.equal(await page.evaluate(() => window.__speechHarness.spoken[0]?.rate), 0.84, 'quiz word wrapper uses the clear pronunciation profile');
    await page.evaluate(() => { ErrataVoice.set({ muted: false, volume: 0.8 }); });

    await page.evaluate(() => window.finishArchiveIntro?.(true));
    await page.locator('[data-open-book="settings"]').first().click();
    await page.locator('[data-setting="voice-muted"]').waitFor();
    const voiceSelect = page.locator('[data-setting="voice-choice"]');
    assert.ok(await voiceSelect.locator('option').count() >= 2, 'voice selector lists the controlled local Turkish and English voices');
    await voiceSelect.selectOption('test-tr');
    assert.equal(await page.evaluate(() => ErrataVoice.voiceChoice), 'test-tr', 'voice selector persists selection through adapter');

    await page.evaluate(() => speakGameText('Still speaking.', { role: 'boss', lang: 'en-US' }));
    const beforeZero = await page.evaluate(() => window.__speechHarness.cancels);
    await page.locator('[data-setting="voice-volume"]').evaluate(input => {
      input.value = '0'; input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.ok(await page.evaluate(() => window.__speechHarness.cancels) > beforeZero, 'zero voice volume silences current speech immediately');
    assert.equal(await page.evaluate(() => ErrataVoice.volume), 0);

    const settings = await page.evaluate(() => ({
      muted: document.querySelector('[data-setting="voice-muted"]')?.checked,
      volume: localStorage.getItem('lexicon_voice_settings_v1'),
      scripts: [...document.scripts].map(script => script.src).filter(Boolean),
      inline: [...document.scripts].filter(script => !script.src).map(script => script.textContent).join('\n')
    }));
    assert.equal(settings.muted, false);
    assert.match(settings.volume || '', /"volume":0/);
    assert.doesNotMatch(settings.scripts.join('\n') + settings.inline, /api\.openai\.com|api\.elevenlabs\.io|speech\.microsoft\.com|texttospeech\.googleapis\.com|polly\.[^/]+\.amazonaws\.com|\b(?:OPENAI|ELEVENLABS|AZURE_SPEECH)_API_KEY\b/i, 'no paid speech endpoint or key configuration is present');
    assert.deepEqual(paidRequests, [], 'no request reaches a paid speech provider');
    assert.deepEqual(pageErrors, [], `page has no runtime errors: ${pageErrors.join('; ')}`);
    console.log('Voice browser integration passed: wrappers, language/role mapping, replay/stop, settings controls, immediate zero-volume silence, persistence and no paid speech endpoint.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
