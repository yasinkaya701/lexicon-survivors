const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/yasinkaya/.codex/skills/develop-web-game/node_modules/playwright');
const url = process.env.GAME_URL || 'http://127.0.0.1:8000';
async function start(page) {
  await page.addInitScript(() => localStorage.setItem('lexicon-survivors-archive-intro-seen-v1', '1'));
  await page.goto(url);
  await page.click('#errata-begin');
  await page.click('#errata-character [data-title-step=preparation]');
  await page.click('#start-game-btn');
  await page.waitForFunction(() => state.is_wave_active);
  await page.evaluate(() => {
    state.is_inventory_open = false;
    state.enemies = [];
    document.getElementById('chapter-transition-card').hidden = true;
    document.getElementById('chapter-transition-card').style.display = 'none';
  });
}
(async () => {
  const browser = await chromium.launch();
  try {
    const keyboard = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await start(keyboard);
    const keyBefore = await keyboard.evaluate(() => state.player.x);
    await keyboard.keyboard.down('d');
    await keyboard.keyboard.down('Space');
    await keyboard.waitForTimeout(220);
    const keyAfter = await keyboard.evaluate(() => ({ x: state.player.x, cooldown: state.gadget_timer }));
    assert.ok(keyAfter.x > keyBefore, 'keyboard movement continues while Space activates gadget');
    assert.ok(keyAfter.cooldown > 4.5 && keyAfter.cooldown <= 5, 'Space starts the normal gadget cooldown');
    await keyboard.screenshot({ path: '/tmp/lexicon-keyboard-gadget-green.png' });
    await keyboard.keyboard.up('Space');
    await keyboard.keyboard.up('d');
    await keyboard.evaluate(() => { state.gadget_timer = 0; state.is_inventory_open = true; });
    await keyboard.keyboard.down('Space');
    await keyboard.keyboard.up('Space');
    assert.equal(await keyboard.evaluate(() => state.gadget_timer), 0, 'pause/inventory gate still blocks keyboard gadget activation');
    await keyboard.close();

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const cdp = await mobile.context().newCDPSession(mobile);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
    await start(mobile);
    await mobile.evaluate(() => {
      window.__gadgetActivations = 0;
      sounds.gadget = () => { window.__gadgetActivations++; };
    });
    const points = await mobile.evaluate(() => {
      const center = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
      return { joystick: center('#joystick-zone'), gadget: center('#touch-gadget-btn'), inventory: center('#touch-inv-btn'), mistakes: center('#touch-mistakes-btn') };
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...points.joystick, id: 100 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: points.joystick.x + 28, y: points.joystick.y, id: 100 }] });
    await mobile.waitForTimeout(120);
    const before = await mobile.evaluate(() => ({ x: state.player.x, dir: { ...state.touch_dir }, cooldown: state.gadget_timer }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points.joystick.x + 28, y: points.joystick.y, id: 100 }, { ...points.gadget, id: 200 }] });
    await mobile.waitForTimeout(160);
    const after = await mobile.evaluate(() => ({ x: state.player.x, dir: { ...state.touch_dir }, cooldown: state.gadget_timer, activations: window.__gadgetActivations }));
    assert.ok(after.x > before.x, 'joystick movement continues while gadget finger is held');
    assert.equal(after.dir.x, 1, 'joystick direction remains active with the second touch');
    assert.ok(after.cooldown > 4.5 && after.cooldown <= 5, 'second touch starts the normal gadget cooldown immediately');
    assert.equal(after.activations, 1, 'touch pointer activates the gadget once');
    await mobile.evaluate(() => document.getElementById('touch-gadget-btn').click());
    assert.equal(await mobile.evaluate(() => window.__gadgetActivations), 1, 'compatibility click does not activate a second time');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ ...points.gadget, id: 200 }] });
    await mobile.evaluate(() => { state.gadget_timer = 0; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points.joystick.x + 28, y: points.joystick.y, id: 100 }, { ...points.gadget, id: 201 }] });
    assert.equal(await mobile.evaluate(() => window.__gadgetActivations), 2, 'next physical press works after the prior gesture');
    await mobile.waitForTimeout(900);
    await mobile.evaluate(() => { state.gadget_timer = 0; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ ...points.gadget, id: 201 }] });
    await mobile.evaluate(() => document.getElementById('touch-gadget-btn').click());
    assert.equal(await mobile.evaluate(() => window.__gadgetActivations), 2, 'long hold consumes its release click even after cooldown resets');
    const beforeInventory = await mobile.evaluate(() => state.player.x);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points.joystick.x + 28, y: points.joystick.y, id: 100 }, { ...points.inventory, id: 300 }] });
    await mobile.waitForFunction(() => state.is_inventory_open && getComputedStyle(document.getElementById('inventory-modal')).display === 'flex');
    const pausedAtInventory = await mobile.evaluate(() => state.player.x);
    await mobile.waitForTimeout(100);
    assert.ok(pausedAtInventory > beforeInventory, 'joystick movement continues up to the inventory tap');
    assert.equal(await mobile.evaluate(() => state.player.x), pausedAtInventory, 'inventory modal pauses the active run');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ ...points.inventory, id: 300 }] });
    await mobile.evaluate(() => document.getElementById('touch-inv-btn').click());
    assert.equal(await mobile.evaluate(() => state.is_inventory_open), true, 'release compatibility click does not immediately close inventory');
    await mobile.click('#close-inventory-btn');
    await mobile.waitForFunction(() => !state.is_inventory_open);
    await mobile.waitForTimeout(100);
    const afterInventoryClose = await mobile.evaluate(() => state.player.x);
    assert.ok(afterInventoryClose > pausedAtInventory, 'closing inventory resumes movement with the joystick still held');

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: points.joystick.x + 28, y: points.joystick.y, id: 100 }, { ...points.mistakes, id: 400 }] });
    await mobile.waitForFunction(() => getComputedStyle(document.getElementById('mistakes-modal')).display === 'flex');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ ...points.mistakes, id: 400 }] });
    await mobile.evaluate(() => document.getElementById('touch-mistakes-btn').click());
    assert.equal(await mobile.evaluate(() => getComputedStyle(document.getElementById('mistakes-modal')).display), 'flex', 'release compatibility click does not immediately close notebook');
    await mobile.click('#close-mistakes-btn');
    await mobile.waitForFunction(() => getComputedStyle(document.getElementById('mistakes-modal')).display !== 'flex');
    await mobile.waitForTimeout(100);
    assert.ok(await mobile.evaluate(x => state.player.x > x, afterInventoryClose), 'closing notebook returns to the live run');
    await mobile.screenshot({ path: '/tmp/lexicon-mobile-gadget-green.png' });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: points.joystick.x + 28, y: points.joystick.y, id: 100 }] });
    console.log(JSON.stringify({ keyboard: { before: keyBefore, ...keyAfter }, mobile: { before, after }, screenshots: ['/tmp/lexicon-keyboard-gadget-green.png', '/tmp/lexicon-mobile-gadget-green.png'] }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
