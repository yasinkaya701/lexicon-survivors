const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.codex/skills/develop-web-game/node_modules/playwright'));
const GAME_URL = process.env.GAME_URL || 'http://127.0.0.1:8000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(GAME_URL, { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const room = window.ErrataArena?.room(1);
      return room?.complete && room.naturalWidth > 0;
    });

    const startup = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource').map(entry => entry.name);
      return {
        resources,
        libraryRequests: resources.filter(url => url.includes('/assets/ui/errata/world/library.webp')).length,
        eagerLegacyFrames: resources.filter(url => /arena_frame_(library|dungeon|observatory|void)\.png(?:\?|$)/.test(url)),
        legacyHeroFrames: resources.filter(url=>/upgrade_v1\/animations\//.test(url)),
        ttfFonts: resources.filter(url => /\.ttf(?:\?|$)/i.test(url)),
        woff2Fonts: resources.filter(url => /\.woff2(?:\?|$)/i.test(url)),
        titleCoverRequests: resources.filter(url => url.includes('/assets/ui/errata/title-scene-v6.webp')).length
      };
    });
    assert.equal(startup.libraryRequests, 1, 'the default room art should be loaded once during startup');
    assert.deepEqual(startup.eagerLegacyFrames, [], 'large fallback arena PNGs must stay lazy on the normal path');
    assert.deepEqual(startup.legacyHeroFrames, [], 'selected painted hero/fallback frames replace eager legacy PNG animation downloads');
    assert.deepEqual(startup.ttfFonts, [], 'font requests should use WOFF2');
    assert.ok(startup.woff2Fonts.length > 0, 'the page should load WOFF2 font assets');
    assert.equal(startup.titleCoverRequests, 1, 'the title cover preload should be reused by the landing view');

    const fallbackPage = await browser.newPage();
    const fallbackRequests = [];
    fallbackPage.on('request', request => {
      if (request.url().includes('/assets/sprites/upgrade_v1/arena_frame_library.png')) fallbackRequests.push(request.url());
    });
    const fallbackResponse = fallbackPage.waitForResponse(response =>
      response.url().includes('/assets/sprites/upgrade_v1/arena_frame_library.png')
    );
    await fallbackPage.route('**/assets/ui/errata/world/library.webp', route => route.abort());
    await fallbackPage.goto(GAME_URL, { waitUntil: 'load' });
    const loadedFallback = await fallbackResponse;
    assert.equal(fallbackRequests.length, 1, 'failed new room art should request the legacy arena fallback once');
    assert.equal(loadedFallback.status(), 200, 'the requested legacy arena fallback should load successfully');

    const firstWave = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await firstWave.addInitScript(() => localStorage.setItem('lexicon-survivors-archive-intro-seen-v1', '1'));
    let releaseSprite;
    const heldSprite = new Promise(resolve => { releaseSprite = resolve; });
    let requestedSprite = false;
    await firstWave.route('**/assets/sprites/tile_void_sanctum.png*', async route => {
      requestedSprite = true;
      await heldSprite;
      await route.continue();
    });
    try {
      await firstWave.goto(GAME_URL, { waitUntil: 'domcontentloaded' });
      await firstWave.locator('#errata-begin').click();
      await firstWave.locator('#errata-character [data-title-step="preparation"]').click();
      await firstWave.locator('#start-game-btn').click();
      await firstWave.waitForFunction(() => state.is_wave_active && state.current_wave === 1);
      assert.ok(requestedSprite, 'the unrelated biome sprite is still held back');
      const initial = await firstWave.evaluate(() => ({ x: state.player.x, time: state.wave_time_left }));
      await firstWave.keyboard.down('d');
      await firstWave.waitForFunction(({ x, time }) => state.player.x > x + 20 && state.wave_time_left < time - 0.2,
        initial, { timeout: 2000 });
      await firstWave.keyboard.up('d');
    } finally {
      releaseSprite();
      await firstWave.unrouteAll({ behavior: 'wait' });
      await firstWave.close();
    }

    console.log(`Loading: room fallback works and wave one runs during other biome downloads (${startup.resources.length} startup resources).`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
