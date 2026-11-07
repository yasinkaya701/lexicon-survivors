const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const data = JSON.parse(fs.readFileSync('assets/data/story_arc.json', 'utf8'));
const webData = JSON.parse(fs.readFileSync('build/web/assets/data/story_arc.json', 'utf8'));
const webGame = fs.readFileSync('build/web/game.js', 'utf8');
assert.deepEqual(webData, data, 'Godot and web use the same story payload');
assert.match(webGame, /const resolvePortraitPath = path => path\.startsWith\("assets\/sprites\/"\) \? path : `assets\/sprites\/\$\{path\}`/,
  'story portrait paths must accept both root-relative and sprite-relative entries without duplicating assets/sprites');
assert.match(webGame, /portrait\.src = resolvePortraitPath\(speakerPath\)/, 'comic speaker portraits must use the shared sprite path resolver');
assert.equal(data.version, 2);
assert.equal(data.panel_count, 5);
assert.equal(Object.keys(data.characters).length, 6);
assert.equal(data.episodes.length, 20);
const signatures = new Map();
const backdropPaths = new Set();
const backdropHashes = new Set();
for (const [characterId, character] of Object.entries(data.characters)) {
  assert.equal(character.episodes.length, 20, `${characterId} has 20 scenes`);
  const signature = character.episodes.map(episode => `${episode.title}|${episode.scene}|${episode.beats.map(beat => beat[1]).join('|')}`).join('\n');
  signatures.set(characterId, signature);
  for (let index = 0; index < 20; index++) {
    const episode = character.episodes[index];
    assert.equal(episode.wave, data.episodes[index].wave, `${characterId} scene matches the milestone wave`);
    assert.equal(episode.beats.length, 5, `${characterId} wave ${episode.wave} has five comic panels`);
    assert.equal(episode.panel_art.length, 5, `${characterId} wave ${episode.wave} resolves art for every comic panel`);
    for (const panelPath of episode.panel_art) {
      const sourcePanel = path.join('assets/sprites/story', panelPath);
      const webPanel = path.join('build/web/assets/sprites/story', panelPath);
      assert.ok(fs.existsSync(sourcePanel), `${characterId} wave ${episode.wave} panel art exists: ${panelPath}`);
      assert.ok(fs.existsSync(webPanel), `${characterId} wave ${episode.wave} web art exists: ${panelPath}`);
      assert.deepEqual(fs.readFileSync(webPanel), fs.readFileSync(sourcePanel), `${panelPath} source/web art must match`);
    }
    assert.ok(episode.scene && episode.location && episode.title, `${characterId} wave ${episode.wave} has scene art direction`);
    assert.equal(episode.backdrop, `scenes/${characterId}/episode_${String(index + 1).padStart(2, '0')}.png`, `${characterId} wave ${episode.wave} points at its own authored scene`);
    assert.ok(!backdropPaths.has(episode.backdrop), `${characterId} wave ${episode.wave} must not reuse another scene path`);
    backdropPaths.add(episode.backdrop);
    const sourcePath = path.join('assets/sprites/story', episode.backdrop);
    const webPath = path.join('build/web/assets/sprites/story', episode.backdrop);
    assert.ok(fs.existsSync(sourcePath), `${characterId} wave ${episode.wave} source art exists`);
    assert.ok(fs.existsSync(webPath), `${characterId} wave ${episode.wave} web art exists`);
    const sourceBytes = fs.readFileSync(sourcePath);
    assert.deepEqual(fs.readFileSync(webPath), sourceBytes, `${characterId} wave ${episode.wave} source and web art match`);
    const hash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
    assert.ok(!backdropHashes.has(hash), `${characterId} wave ${episode.wave} art must be visually unique at the pixel level`);
    backdropHashes.add(hash);
  }
}
for (const [leftId, left] of signatures) for (const [rightId, right] of signatures) {
  if (leftId < rightId) assert.notEqual(left, right, `${leftId} and ${rightId} have distinct story tracks`);
}
assert.equal(data.relic_catalog.length, 18, 'six characters each have three run-only milestone relics');
assert.equal(backdropPaths.size, 120, 'all six character tracks use 120 unique story scene assets');
assert.equal(backdropHashes.size, 120, 'all 120 character story scene assets contain unique image data');
for (const character of Object.values(data.characters)) {
  for (const wave of [25, 50, 75]) {
    const relic = character.episodes.find(episode => episode.wave === wave).boss_reward;
    assert.equal(relic?.type, 'relic');
    assert.ok(relic.id && relic.icon && Object.keys(relic.stats || {}).length, 'each milestone relic has an effect and icon');
  }
  const ending = character.episodes.find(episode => episode.wave === 100).boss_reward;
  assert.equal(ending?.type, 'ending');
}
console.log('Story regressions passed (6 unique 20-scene arcs, five-panel input, boss clues, and 18 run-only relics).');
