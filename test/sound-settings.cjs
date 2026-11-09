const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.codex/skills/develop-web-game/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8000', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.finishArchiveIntro?.(true));
    await page.locator('[data-open-book="settings"]').first().click();
    await page.locator('#errata-book .settings-rows').waitFor();
    assert.deepEqual(await page.evaluate(() => ({ sfx: sounds.sfxVolume, music: bgm.musicVolume })), { sfx: 1, music: 1 }, 'fresh installs start at the established full volume');

    const sfxMuted = page.locator('input[data-setting="sfx-muted"]');
    await sfxMuted.check();
    assert.equal(await page.evaluate(() => sounds.sfxMuted), true, 'SFX mute applies immediately');
    await page.locator('input[data-setting="sfx-volume"]').evaluate(input => {
      input.value = '0.4'; input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('input[data-setting="music-volume"]').evaluate(input => {
      input.value = '0.35'; input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.locator('select[data-setting="music-track"]').selectOption('action');
    const musicMuted = page.locator('input[data-setting="music-muted"]');
    await musicMuted.check();
    assert.equal(await page.evaluate(() => bgm.isMuted), true, 'music mute applies independently');
    await musicMuted.uncheck();
    assert.equal(await page.evaluate(() => bgm.isMuted), false);
    assert.deepEqual(await page.evaluate(() => ({
      sfx: sounds.sfxVolume,
      music: bgm.musicVolume,
      choice: bgm.musicChoice,
      persisted: [localStorage.getItem('lexicon_sfx_volume'), localStorage.getItem('lexicon_music_volume'), localStorage.getItem('lexicon_music_choice')]
    })), { sfx: 0.4, music: 0.35, choice: 'action', persisted: ['0.4', '0.35', 'action'] });

    const audioState = await page.evaluate(() => {
      const created = [];
      window.Audio = function FakeAudio(src = '') {
        this.src = src ? new URL(src, location.href).href : '';
        this.volume = 1; this.muted = false; this.loop = false; this.currentTime = 0;
        this.play = () => { created.push(this); return Promise.resolve(); };
      };
      sounds.assetVoices = [];
      const mutedAssetResult = sounds.playAsset('hit');
      const mutedDirectResult = sounds.playOneShot('assets/audio/weapons/weapon_quill_blaster_v1.wav');
      let synthSources = 0;
      sounds.ctx = { currentTime: 0, createOscillator() { synthSources += 1; throw new Error('muted tone should not be constructed'); } };
      sounds.playTone(440, 'sine', 0.1);
      sounds.ctx = null;
      const blockedCount = created.length;
      const mutedSynthCount = synthSources;
      bgm.setMusicChoice('action');
      const music = sounds.music;
      bgm.setMuted(false);
      const musicUnmutedWhileSfxMuted = music?.muted;
      bgm.setMuted(true);
      sounds.setSfxMuted(false);
      sounds.assetVoices = [];
      const sfxWhileMusicMuted = sounds.playAsset('hit');
      const sfxPlayCountWhileMusicMuted = created.length;
      sounds.setSfxMuted(true);
      return {
        mutedAssetResult, mutedDirectResult, blockedCount, mutedSynthCount,
        musicPath: music?.src || '', musicMuted: music?.muted, musicUnmutedWhileSfxMuted,
        musicVolume: music?.volume, sfxMuted: sounds.sfxMuted,
        sfxWhileMusicMuted, sfxPlayCountWhileMusicMuted
      };
    });
    assert.equal(audioState.mutedAssetResult, false);
    assert.equal(audioState.mutedDirectResult, false);
    assert.equal(audioState.blockedCount, 0, 'muted effects do not create or play audio sources');
    assert.equal(audioState.mutedSynthCount, 0, 'muted effects also block synthesized sources');
    assert.match(audioState.musicPath, /magical_library_action_b\.mp3$/);
    assert.equal(audioState.musicUnmutedWhileSfxMuted, false, 'muting effects leaves music enabled');
    assert.equal(audioState.musicMuted, true, 'the music control independently mutes the music element');
    assert.equal(audioState.musicVolume, 0.24 * 0.35);
    assert.equal(audioState.sfxMuted, true);
    assert.equal(audioState.sfxWhileMusicMuted, true, 'muting music leaves sound effects enabled');
    assert.equal(audioState.sfxPlayCountWhileMusicMuted, 1);

    await page.reload({ waitUntil: 'domcontentloaded' });
    const persisted = await page.evaluate(() => ({
      sfxMuted: sounds.sfxMuted,
      sfxVolume: sounds.sfxVolume,
      musicMuted: bgm.isMuted,
      musicVolume: bgm.musicVolume,
      musicChoice: bgm.musicChoice
    }));
    assert.deepEqual(persisted, { sfxMuted: true, sfxVolume: 0.4, musicMuted: true, musicVolume: 0.35, musicChoice: 'action' });
    assert.deepEqual(errors, []);
    console.log('sound settings passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
