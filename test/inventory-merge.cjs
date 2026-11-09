const assert = require('node:assert/strict');
const { chromium } = require('/Users/yasinkaya/.codex/skills/develop-web-game/node_modules/playwright');

const baseUrl = process.env.GAME_URL || 'http://127.0.0.1:8000';
const storageKey = 'lexicon_weapon_merge_hint_seen_v1';

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('lexicon-survivors-archive-intro-seen-v1', '1'));
    await page.goto(baseUrl);
    await page.click('#errata-begin');
    await page.click('#errata-character [data-title-step=preparation]');
    await page.click('#start-game-btn');
    await page.waitForFunction(() => JSON.parse(render_game_to_text()).mode === 'wave');

    // A valid pair may cross equipped and reserve; retain the equipped copy's custom data.
    await page.evaluate(() => {
      state.is_wave_active = true;
      state.is_inventory_open = true;
      state.inventory_category = 'weapons';
      state.max_weapon_slots = 4;
      const active = { id: 'syllable_shotgun', tier: 1, custom: 'keep-active' };
      const target = { id: 'quill_blaster', tier: 1, custom: 'keep-upgrade-target' };
      const source = { id: 'quill_blaster', tier: 1, custom: 'consume-this' };
      const other = { id: 'dictionary_blade', tier: 1, custom: 'keep-reserve' };
      state.equipped_weapons = [active, target];
      state.reserve_weapons = [source, other];
      state.active_weapon_index = 0;
      document.getElementById('inventory-modal').style.display = 'flex';
      syncWeapons();
      updateHUD();
      renderInventoryView();
    });
    assert.equal(await page.locator('.inv-merge-pick').count(), 2);
    await page.locator('.inv-merge-pick').nth(0).click();
    await page.locator('.inv-merge-pick').nth(1).click();
    assert.equal(await page.locator('#inv-manual-combine-btn').isDisabled(), false);
    assert.match(await page.locator('#inv-merge-status').innerText(), /2\/2/);
    await page.locator('#inv-manual-combine-btn').click();
    const merged = await page.evaluate(() => ({
      activeIndex: state.active_weapon_index,
      active: state.equipped_weapons[0],
      upgraded: state.equipped_weapons[1],
      reserve: state.reserve_weapons,
      sharedTier: state.weapons.find(item => item.id === 'quill_blaster')?.tier,
    }));
    assert.equal(merged.activeIndex, 0);
    assert.equal(merged.active.custom, 'keep-active');
    assert.equal(merged.upgraded.tier, 2);
    assert.equal(merged.upgraded.custom, 'keep-upgrade-target');
    assert.deepEqual(merged.reserve.map(item => [item.id, item.custom]), [['dictionary_blade', 'keep-reserve']]);
    assert.equal(merged.sharedTier, 2);

    // Mismatched selection must remain inert and must not lose either item.
    await page.evaluate(() => {
      state.equipped_weapons = [
        { id: 'quill_blaster', tier: 1 }, { id: 'quill_blaster', tier: 1 },
        { id: 'dictionary_blade', tier: 1 }, { id: 'dictionary_blade', tier: 1 },
      ];
      state.reserve_weapons = [];
      state.active_weapon_index = 0;
      syncWeapons();
      renderInventoryView();
    });
    const beforeInvalid = await page.evaluate(() => JSON.stringify({
      equipped: state.equipped_weapons,
      reserve: state.reserve_weapons,
    }));
    await page.locator('.inv-merge-pick').nth(0).click();
    await page.locator('.inv-merge-pick').nth(2).click();
    assert.equal(await page.locator('#inv-manual-combine-btn').isDisabled(), true);
    assert.match(await page.locator('#inv-merge-status').innerText(), /aynı silah ve seviyede/);
    assert.equal(await page.evaluate(() => JSON.stringify({
      equipped: state.equipped_weapons,
      reserve: state.reserve_weapons,
    })), beforeInvalid);

    // The maximum-tier gate hides selectors and both merge actions.
    await page.evaluate(() => {
      state.equipped_weapons = [{ id: 'quill_blaster', tier: 4 }, { id: 'quill_blaster', tier: 4 }];
      state.reserve_weapons = [];
      state.active_weapon_index = 0;
      syncWeapons();
      renderInventoryView();
    });
    assert.equal(await page.locator('.inv-merge-pick').count(), 0);
    assert.equal(await page.locator('#inv-manual-combine-btn').isDisabled(), true);
    assert.equal(await page.locator('#inv-combine-btn').evaluate(element => getComputedStyle(element).display), 'none');

    // If the active upgraded copy shifts slots, its identity stays selected.
    await page.evaluate(() => {
      state.equipped_weapons = [
        { id: 'quill_blaster', tier: 1, custom: 'remove' },
        { id: 'dictionary_blade', tier: 1, custom: 'stay-active' },
        { id: 'quill_blaster', tier: 1, custom: 'active-upgrade' },
      ];
      state.reserve_weapons = [];
      state.active_weapon_index = 2;
      syncWeapons();
      renderInventoryView();
    });
    await page.locator('.inv-merge-pick').nth(0).click();
    await page.locator('.inv-merge-pick').nth(1).click();
    await page.locator('#inv-manual-combine-btn').click();
    const preservedActive = await page.evaluate(() => ({
      index: state.active_weapon_index,
      item: state.equipped_weapons[state.active_weapon_index],
    }));
    assert.equal(preservedActive.index, 1);
    assert.equal(preservedActive.item.custom, 'active-upgrade');
    assert.equal(preservedActive.item.tier, 2);

    // First purchase surfaces the hint; subsequent purchases and a reload do not.
    await page.evaluate(key => {
      localStorage.removeItem(key);
      state.is_inventory_open = false;
      document.getElementById('inventory-modal').style.display = 'none';
      state.is_wave_active = false;
      state.ink_count = 9999;
      openShop();
      currentShopTab = 'weapons';
      highlightShopTabs();
      renderShopView();
    }, storageKey);
    await page.locator('#shop-items-grid .shop-buy:not([disabled])').first().click();
    assert.equal(await page.locator('.weapon-merge-hint').count(), 1);
    assert.match(await page.locator('.weapon-merge-hint').innerText(), /aynı seviyedeki iki kopyasını Envanterde birleştirerek geliştirebilirsin/);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), '1');
    await page.locator('#shop-items-grid .shop-buy:not([disabled])').first().click();
    assert.equal(await page.locator('.weapon-merge-hint').count(), 0);
    await page.reload();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), '1');
    assert.deepEqual(pageErrors, []);
    console.log('Inventory merge: valid pair, invalid pair, max tier, active index, and one-time hint passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
