const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(require('node:os').homedir(), '.codex/skills/develop-web-game/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.addInitScript(() => localStorage.setItem('lexicon-survivors-archive-intro-seen-v1', '1'));
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8000');
    await page.waitForFunction(() => typeof spawnEnemy === 'function' && GAME_ECONOMY);
    const actual = await page.evaluate(async () => {
      await gameEconomyReady;
      const results = {};
      for (const difficulty of ['easy', 'normal', 'hard']) {
        state.difficulty = difficulty;
        state.current_wave = 1;
        state.enemies = [];
        state.is_wave_active = true;
        state.is_inventory_open = false;
        const random = Math.random;
        Math.random = () => 0.99; // wave 1 reliably selects the baseline Typo Slime
        try { spawnEnemy(); } finally { Math.random = random; }
        const enemy = state.enemies[0];
        results[difficulty] = {
          type: enemy.type,
          hp: enemy.hp,
          max_hp: enemy.max_hp,
          speed: enemy.speed,
          damage: enemy.damage,
          configured: { ...GAME_ECONOMY.combat_pressure?.[difficulty] }
        };
      }
      const savedPressure = GAME_ECONOMY.combat_pressure;
      GAME_ECONOMY.combat_pressure = undefined;
      state.difficulty = 'normal'; state.current_wave = 1; state.enemies = [];
      const random = Math.random; Math.random = () => 0.99;
      try { spawnEnemy(); } finally { Math.random = random; }
      const missingDataFallback = { hp: state.enemies[0].hp, speed: state.enemies[0].speed, damage: state.enemies[0].damage };
      GAME_ECONOMY.combat_pressure = savedPressure;
      const intervals = {};
      for (const difficulty of ['easy', 'normal', 'hard']) {
        state.difficulty = difficulty; state.current_wave = 1; state.enemies = []; spawnTimer = 0.01;
        const random = Math.random; Math.random = () => 0.99;
        try { updateEnemies(0.02); } finally { Math.random = random; }
        intervals[difficulty] = spawnTimer;
      }
      const bossDifficulty = 'normal'; state.difficulty = bossDifficulty;
      spawnMilestoneBoss(5);
      const boss = state.active_boss;
      return { results, missingDataFallback, intervals, boss: { hp: boss.hp, max_hp: boss.max_hp, speed: boss.speed, damage: boss.damage } };
    });
    const expected = {
      easy: { hp: 1, damage: 1, speed: 1, spawn_interval: 1 },
      normal: { hp: 1.15, damage: 1.10, speed: 1.04, spawn_interval: 0.90 },
      hard: { hp: 1.20, damage: 1.15, speed: 1.06, spawn_interval: 0.88 }
    };
    for (const difficulty of Object.keys(expected)) {
      const result = actual.results[difficulty], factors = expected[difficulty];
      assert.deepEqual(result.configured, factors, `${difficulty}: shared pressure config`);
      assert.equal(result.type, 'Typo Slime');
      assert.ok(Math.abs(result.hp / (96 * ({ easy: .65, normal: .85, hard: 1.15 })[difficulty]) - factors.hp) < 1e-9, `${difficulty}: HP pressure exactly once`);
      assert.ok(Math.abs(result.max_hp / (96 * ({ easy: .65, normal: .85, hard: 1.15 })[difficulty]) - factors.hp) < 1e-9, `${difficulty}: max HP pressure exactly once`);
      assert.ok(Math.abs(result.speed / (98 * ({ easy: .75, normal: .90, hard: 1.08 })[difficulty]) - factors.speed) < 1e-9, `${difficulty}: speed pressure exactly once`);
      assert.ok(Math.abs(result.damage / (18 * ({ easy: .60, normal: .80, hard: 1.15 })[difficulty]) - factors.damage) < 1e-9, `${difficulty}: damage pressure exactly once`);
      const priorSpawnFactor = { easy: 1.15, normal: 1, hard: .92 }[difficulty];
      assert.ok(Math.abs(actual.intervals[difficulty] / (.56 * priorSpawnFactor) - factors.spawn_interval) < 1e-9, `${difficulty}: spawn interval pressure applied once`);
    }
    assert.deepEqual(actual.missingDataFallback, { hp: 81.6, speed: 88.2, damage: 14.4 }, 'missing pressure data falls back to ×1');
    const wave5 = 1.0 + 4 * .10;
    const baseBossHp = (900 + 5 * 80) * Math.pow(wave5, .45) * .85 * 1.7;
    assert.ok(Math.abs(actual.boss.max_hp / baseBossHp - 5) < 1e-9, 'normal enemy pressure does not change the established 5× boss HP');
    assert.ok(Math.abs(actual.boss.damage / ((29 + 5 * 1.25) * .80) - 3) < 1e-9, 'normal enemy pressure does not change the established 3× boss damage');
    console.log('Combat pressure data and ratios passed for ordinary enemies; missing-data fallback and boss balance remained unchanged.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
