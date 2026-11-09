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
    await page.waitForFunction(() => CHARACTER_SKILL_TREES?.characters?.inky?.branches?.length === 3);
    await page.evaluate(() => {
      state.selected_char = 'inky';
      state.is_wave_active = false;
      state.character_progress.inky = { xp: 0, level: 2, skill_points: 1, unlocked_nodes: [] };
      document.querySelector('#title-screen').style.display = 'none';
      document.querySelector('#shop-screen').style.display = 'flex';
      currentShopTab = 'skills';
      renderShopView();
    });

    assert.equal(await page.locator('.skill-tree-branch').count(), 3, 'three skill branches render as columns');
    for (const branch of await page.locator('.skill-tree-branch').all()) {
      assert.equal(await branch.locator('.skill-node-button').count(), 3, 'each branch shows its three connected levels');
    }
    assert.equal(await page.locator('.skill-tree-profile > img').getAttribute('src'), 'assets/ui/errata/portraits/inky-selection.webp');
    assert.equal(await page.locator('.skill-tree-profile [role=progressbar]').count(), 1);
    assert.equal(await page.locator('.skill-node-button[data-state="available"]').count(), 3);
    assert.ok(await page.locator('.skill-tree-branches').evaluate(branches => branches.getBoundingClientRect().width > 700), 'tree spans the shop workspace');
    assert.equal(await page.locator('.skill-tree-branches').evaluate(branches => getComputedStyle(branches, '::before').content !== 'none'), true, 'branch roots have a visible connecting line');
    assert.ok(await page.locator('.skill-node-button img').first().evaluate(image => parseFloat(getComputedStyle(image).width) >= 44 && getComputedStyle(image).borderRadius === '50%'), 'node art uses framed medallions');
    assert.equal(await page.locator('.skill-node-copy small, .skill-node-copy em, .skill-status').evaluateAll(elements => elements.every(element => parseFloat(getComputedStyle(element).fontSize) >= 12)), true, 'node labels remain at least 12px');
    await page.locator('.skill-node-button[data-node-id="wax_seal"]').focus();
    const detailText = await page.locator('#skill-detail-panel').innerText();
    assert.match(detailText, /Mühürlü Manşet|Kolluğundaki balmumu mührü/);

    const armorBefore = await page.evaluate(() => state.armor);
    await page.locator('.skill-node-button[data-node-id="wax_seal"]').click();
    await page.waitForFunction(() => state.character_progress.inky.unlocked_nodes.includes('wax_seal'));
    assert.equal(await page.locator('.skill-node-button[data-node-id="wax_seal"]').getAttribute('data-state'), 'learned');
    assert.equal(await page.locator('.skill-node-button[data-node-id="bound_ledger"]').getAttribute('aria-disabled'), 'true');
    assert.equal(await page.evaluate(() => state.character_progress.inky.skill_points), 0);
    assert.ok((await page.evaluate(() => state.armor)) > armorBefore);

    await page.setViewportSize({ width: 390, height: 844 });
    const dimensions = await page.evaluate(() => {
      const branches = document.querySelector('.skill-tree-branches');
      const buttons = [...document.querySelectorAll('.skill-node-button')];
      return { scrollWidth: branches.scrollWidth, clientWidth: branches.clientWidth, minButtonHeight: Math.min(...buttons.map(button => button.getBoundingClientRect().height)) };
    });
    assert.ok(dimensions.scrollWidth > dimensions.clientWidth, 'mobile tree keeps three branches available through horizontal scroll');
    assert.ok(dimensions.minButtonHeight >= 44, 'skill controls remain touch sized');
    const artSources = await page.locator('.skill-node-button img').evaluateAll(images => images.map(image => image.getAttribute('src')));
    assert.ok(artSources.some(source => source.startsWith('assets/sprites/weapons/')), 'weapon-focused skills use the selected hero’s actual starting weapon art');
    assert.ok(artSources.some(source => source.startsWith('assets/sprites/relics/')), 'defense and critical skills use matching relic art');
    assert.equal(await page.locator('.skill-node-button img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true, 'all node art resolves');
    assert.ok(await page.locator('#tab-skills-btn img').count());
    assert.ok(await page.locator('#tab-premium-btn img').count());
    assert.deepEqual(errors, []);
    console.log('skill tree passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
