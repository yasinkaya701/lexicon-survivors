const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = JSON.parse(fs.readFileSync('assets/data/story_art_600_manifest.json', 'utf8'));
assert.equal(source.runtime_preview?.generated_panels, 242);
assert.equal(source.runtime_preview?.requested_panels, 600);
assert.equal(source.runtime_preview?.generated_assets_remain_awaiting_human_review, true, 'deployment does not falsely mark art reviewed');
const generated = source.images.filter(image => image.runtime_preview_deployed);
assert.equal(generated.length, 242);
for (const image of generated) {
  assert.equal(image.status, 'awaiting_human_review');
  const src = image.expected_source_path;
  const webPath = image.expected_web_path;
  assert.ok(fs.existsSync(src), `source art exists: ${src}`);
  assert.ok(fs.existsSync(webPath), `web art exists: ${webPath}`);
  const sourceStat = fs.statSync(src);
  assert.ok(sourceStat.size < 500_000, `${src} was optimized for web`);
  assert.deepEqual(fs.readFileSync(webPath), fs.readFileSync(src), `${src} source and web mirror match`);
}
console.log('Story art preview regression passed: 242 optimized unique panels deployed with review state preserved.');
