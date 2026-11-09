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
        ttfFonts: resources.filter(url => /\.ttf(?:\?|$)/i.test(url)),
        woff2Fonts: resources.filter(url => /\.woff2(?:\?|$)/i.test(url)),
        titleCoverRequests: resources.filter(url => url.includes('/assets/ui/errata/title-scene-v6.webp')).length
      };
    });
    assert.equal(startup.libraryRequests, 1, 'the default room art should be loaded once during startup');
    assert.deepEqual(startup.eagerLegacyFrames, [], 'large fallback arena PNGs must stay lazy on the normal path');
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

    console.log(`Loading: current room once, zero eager legacy room frames, WOFF2 only, title cover reused; fallback loaded (${startup.resources.length} startup resources).`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
