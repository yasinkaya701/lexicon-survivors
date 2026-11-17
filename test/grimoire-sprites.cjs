// Grimoire sprite runtime: the generated art set is what the real renderer draws.
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.codex/skills/develop-web-game/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8000');
    await page.waitForFunction(() => typeof window.render_game_to_text === 'function' && window.GrimoireSprites);
    const result = await page.evaluate(async () => {
      const G = window.GrimoireSprites;
      await G.ready;
      const waitFrames = async id => { for (let i = 0; i < 300 && !G.strip(id); i++) await new Promise(r => setTimeout(r, 16)); return G.strip(id); };
      const canvas = document.getElementById('game-canvas');
      const ctx = canvas.getContext('2d');
      const original = ctx.drawImage;
      const draws = [];
      ctx.drawImage = function (image, ...args) { draws.push({ image, args }); return original.call(this, image, ...args); };
      const out = { heroes: {}, bosses: {}, enemies: {} };
      try {
        // Heroes: every combat action resolves to its own sheet, drawn at the 96 px footprint.
        const heroes = { inky: 'inky', quillmaster: 'quillmaster', word_knight: 'word_knight', rune_sorceress: 'rune_sorceress', lexicon_alchemist: 'alchemist', shadow_lexicographer: 'shadow_scribe' };
        state.enemies = []; state.projectiles = []; state.gadget_decoys = []; state.is_inventory_open = true; state.is_wave_active = false;
        for (const [id, key] of Object.entries(heroes)) {
          const row = {};
          for (const action of ['idle', 'run', 'attack', 'ranged', 'dash', 'hurt']) row[action] = !!(await waitFrames(`hero_${key}_${action}`));
          state.selected_char = id;
          const p = state.player; Object.assign(p, { x: 0, y: 0, vx: 0, vy: 0, is_dashing: true, dash_dir: { x: 1, y: 0 }, invuln_timer: 0 });
          draws.length = 0; render(0);
          const dashFrames = new Set(G.strip(`hero_${key}_dash`));
          row.dashDrawn = draws.some(d => dashFrames.has(d.image) && d.args[2] === 96 && d.args[3] === 96);
          Object.assign(p, { is_dashing: false, invuln_timer: 0.69 });
          draws.length = 0; render(0);
          const hurtFrames = new Set(G.strip(`hero_${key}_hurt`));
          row.hurtDrawn = draws.some(d => hurtFrames.has(d.image));
          p.invuln_timer = 0; p.is_dashing = false;
          out.heroes[id] = row;
        }
        // Milestone bosses: each of the 20 names maps to its own boss sheet.
        sounds.bossRoar = () => {}; speakBossVoiceLine = () => {};
        const seen = new Set();
        for (let wave = 5; wave <= 100; wave += 5) {
          state.enemies = []; state.enemy_projectiles = []; state.mistake_words = []; state.current_wave = wave;
          spawnMilestoneBoss(wave);
          const boss = state.active_boss;
          Object.assign(boss, { x: state.player.x + 80, y: state.player.y, vx: 0, vy: 0 });
          const frame = G.enemyFrame(boss.sprite, performance.now(), 0, boss);
          const base = boss.__grimoireBase;
          seen.add(base);
          out.bosses[boss.label] = { base, hasDeath: !!G.strip(`${base}_death`) || G.has(`${base}_death`), frame: !!frame || G.has(`${base}_idle`) };
        }
        out.distinctBosses = seen.size;
        // A defeated boss leaves a death body that the renderer draws after the boss object is gone.
        const boss = state.active_boss;
        const deathFrames = await waitFrames(`${boss.__grimoireBase}_death`);
        G.recordDeath(boss);
        state.enemies = [];
        draws.length = 0; render(0);
        out.bossBodyDrawn = draws.some(d => deathFrames.includes(d.image));
        // Regular enemies resolve to their painted sheets; a non-boss death leaves no body.
        for (const sprite of ['upgrade_v1/monster_grammar_goblin.png', 'typo_slime.png', 'upgrade_v1/monster_oxymoron_ogre.png']) {
          const enemy = { sprite, x: 0, y: 0, vx: 20, vy: 0, size: 36 };
          G.enemyFrame(sprite, performance.now(), 0, enemy);
          out.enemies[sprite] = enemy.__grimoireBase;
          G.recordDeath(enemy);
        }
        // Reduced motion freezes looping animation on its first frame.
        window.ErrataArena.flags.reducedMotion = true;
        const idle = await waitFrames('hero_inky_idle');
        out.reducedFrozen = G.loopFrame('hero_inky_idle', 12345) === idle[0] && G.loopFrame('hero_inky_idle', 98765) === idle[0];
        window.ErrataArena.flags.reducedMotion = false;
      } finally { ctx.drawImage = original; }
      return out;
    });

    for (const [id, row] of Object.entries(result.heroes)) {
      for (const action of ['idle', 'run', 'attack', 'ranged', 'dash', 'hurt']) assert.ok(row[action], `${id}: ${action} sheet loads`);
      assert.ok(row.dashDrawn, `${id}: dashing draws the dash sheet at 96 px`);
      assert.ok(row.hurtDrawn, `${id}: a fresh hit draws the hurt sheet`);
    }
    assert.equal(result.distinctBosses, 20, 'all 20 milestone bosses have their own sheet');
    for (const [label, row] of Object.entries(result.bosses)) {
      assert.ok(row.base?.startsWith('boss_'), `${label}: mapped to a boss sheet`);
      assert.ok(row.hasDeath, `${label}: has a death sheet`);
    }
    assert.ok(result.bossBodyDrawn, 'a defeated boss leaves a drawn death body');
    assert.equal(result.enemies['upgrade_v1/monster_grammar_goblin.png'], 'enemy_grammar_goblin');
    assert.equal(result.enemies['typo_slime.png'], 'enemy_typo_slime');
    assert.equal(result.enemies['upgrade_v1/monster_oxymoron_ogre.png'], 'enemy_oxymoron_ogre');
    assert.ok(result.reducedFrozen, 'reduced motion holds the first frame');
    console.log('Grimoire sprites: 6 heroes × 6 actions, 20 distinct milestone bosses with death bodies, regular enemy sheets and reduced motion passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
