const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'assets/data/audio_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert.equal(manifest.version, 1, 'audio manifest version is explicit');
assert.deepEqual(manifest, JSON.parse(fs.readFileSync(path.join(root, 'build/web/assets/data/audio_manifest.json'), 'utf8')), 'Godot and web audio manifests must match');

const requiredWeapons = [
  'quill_blaster', 'syllable_shotgun', 'lexicon_beam', 'punctuation_bomb',
  'dictionary_blade', 'crossword_crossbow', 'hyphen_boomerang',
  'ink_flamethrower', 'thesaurus_rocket', 'quote_pistols',
  'calligraphy_katana', 'scroll_turret', 'rune_orb', 'grammar_sniper'
];
assert.deepEqual(Object.keys(manifest.weapons).sort(), requiredWeapons.sort(), 'every stable weapon ID has a sound mapping');

function eachPath(value, callback) {
  if (typeof value === 'string') callback(value);
  else if (Array.isArray(value)) value.forEach(item => eachPath(item, callback));
  else if (value && typeof value === 'object') Object.values(value).forEach(item => eachPath(item, callback));
}

for (const section of ['music', 'ambience', 'weapons', 'gadgets', 'gameplay', 'ui']) {
  assert.ok(manifest[section] && Object.keys(manifest[section]).length > 0, `${section} map is populated`);
  eachPath(manifest[section], assetPath => {
    const absolute = path.join(root, assetPath);
    assert.ok(fs.existsSync(absolute), `missing audio asset: ${assetPath}`);
    const bytes = fs.readFileSync(absolute);
    assert.ok(bytes.length > 128, `audio asset is empty or truncated: ${assetPath}`);
    if (assetPath.endsWith('.wav')) {
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `expected PCM WAV container: ${assetPath}`);
      assert.equal(bytes.toString('ascii', 8, 12), 'WAVE', `expected WAVE signature: ${assetPath}`);
    }
  });
}

assert.ok(manifest.music.main.endsWith('.mp3'), 'main theme extension reflects its actual MP3 content');
const mainBytes = fs.readFileSync(path.join(root, manifest.music.main));
assert.equal(mainBytes.toString('ascii', 0, 3), 'ID3', 'main theme is recognized as MP3 rather than mislabeled WAV');

console.log(`Audio manifest passed: ${requiredWeapons.length} weapons and ${Object.values(manifest).length} manifest sections checked.`);
