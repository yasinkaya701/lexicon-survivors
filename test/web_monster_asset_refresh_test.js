const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const game = fs.readFileSync(path.join(root, 'build/web/game.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'build/web/index.html'), 'utf8');
const monsters = [
  'typo_slime', 'typo_splinter', 'grammar_goblin', 'punctuation_phantom', 'spelling_spectre',
  'homophone_harpy', 'idiom_imp', 'tautology_twin', 'dangling_modifier', 'double_negative_drake',
  'run_on_reaper', 'syntax_titan', 'malapropism_mimic', 'palindrome_phantom', 'red_pen_boss',
  'lexicon_dragon_boss', 'oxymoron_ogre', 'vocabulary_void'
];

for (const id of monsters) {
  const rel = `assets/sprites/upgrade_v1/monster_${id}.png`;
  const sourcePath = path.join(root, rel);
  const webPath = path.join(root, 'build/web', rel);
  assert.ok(fs.existsSync(sourcePath), `missing refreshed source sprite ${id}`);
  assert.ok(fs.existsSync(webPath), `missing refreshed web sprite ${id}`);
  const bytes = fs.readFileSync(sourcePath);
  assert.equal(bytes.readUInt32BE(16), 64, `${id} width is 64px`);
  assert.equal(bytes.readUInt32BE(20), 64, `${id} height is 64px`);
  assert.equal(bytes[25], 6, `${id} preserves transparent RGBA pixels`);
  assert.deepEqual(fs.readFileSync(webPath), bytes, `${id} source and web exports match`);
  assert.ok(game.includes(`"upgrade_v1/monster_${id}.png": "${id}.png"`), `${id} has a generated alias mapping`);
}

assert.match(game, /const ENEMY_SPRITE_VERSION = "monster-refresh-[^"]+";/, 'enemy art URLs use a cache-busting version');
assert.match(html, /game\.js\?v=[^"&]+/, 'the game script itself bypasses previously cached alias logic');
assert.match(game, /const assetsToLoad = spriteList\.filter\(name => !aliasTargets\.has\(name\) && !legacyWalkAndSwingFrame\.test\(name\)\);/, 'legacy aliases and obsolete walk/swing sprites are excluded from image loading');
console.log(`Monster refresh passed: ${monsters.length} transparent sprites, aliases, mirrors, and cache refresh verified.`);
