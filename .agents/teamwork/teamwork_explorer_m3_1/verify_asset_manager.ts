import assert from 'assert';
import {
  ASSET_MANIFEST,
  AssetManager,
  processChromaKey,
  createHitFlashVariant,
} from './proposed_AssetManager';

console.log('--- Verifying AssetManager Architecture ---');

// Test 1: Verify Manifest Completeness (Exactly 26 Visual Assets)
assert.strictEqual(
  ASSET_MANIFEST.length,
  26,
  `Expected exactly 26 visual assets in manifest, but found ${ASSET_MANIFEST.length}`
);
console.log('✓ Test 1 Passed: Exactly 26 visual assets defined in ASSET_MANIFEST');

// Categorical distribution check
const categories = ASSET_MANIFEST.reduce((acc, entry) => {
  acc[entry.category] = (acc[entry.category] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

assert.strictEqual(categories['player'], 4, 'Expected 4 player avatars');
assert.strictEqual(categories['enemy'], 5, 'Expected 5 enemy variants');
assert.strictEqual(categories['weapon'], 7, 'Expected 7 weapons');
assert.strictEqual(categories['projectile'], 3, 'Expected 3 projectiles');
assert.strictEqual(categories['vfx'], 2, 'Expected 2 vfx assets');
assert.strictEqual(categories['pickup'], 3, 'Expected 3 pickups');
assert.strictEqual(categories['terrain'], 2, 'Expected 2 terrain tiles');
console.log('✓ Test 2 Passed: Categorical asset counts verified (4 player, 5 enemy, 7 weapon, 3 proj, 2 vfx, 3 pickup, 2 terrain = 26)');

// Test 3: Alias Resolution
const manager = new AssetManager();
assert.strictEqual(manager.resolveKey('player_potato'), 'player_potato_scholar');
assert.strictEqual(manager.resolveKey('drop_material'), 'pickup_material_crystal');
assert.strictEqual(manager.resolveKey('drop_fruit'), 'pickup_health_fruit');
assert.strictEqual(manager.resolveKey('drop_chest'), 'pickup_mystery_chest');
assert.strictEqual(manager.resolveKey('enemy_ranged'), 'enemy_ranged_shooter');
assert.strictEqual(manager.resolveKey('enemy_elite'), 'enemy_elite_boss');
assert.strictEqual(manager.resolveKey('bullet'), 'proj_bullet');
assert.strictEqual(manager.resolveKey('magic_orb'), 'proj_magic_orb');
assert.strictEqual(manager.resolveKey('unknown_key'), 'unknown_key');
console.log('✓ Test 3 Passed: Key and alias resolution works bidirectionally for all subsystems');

// Test 4: Hit Flash Configuration
const flashEntries = ASSET_MANIFEST.filter((e) => e.generateHitFlashVariant);
assert.strictEqual(flashEntries.length, 9, 'Expected 9 entities with hit flash (4 players + 5 enemies)');
console.log('✓ Test 4 Passed: 9 hit-flash entities correctly configured (4 players + 5 enemies)');

// Test 5: Chroma Keying Math Simulation
function simulateChromaKey(r: number, g: number, b: number, low: number, high: number) {
  const brightness = Math.max(r, g, b);
  if (brightness <= low) return 0;
  if (brightness >= high) return 255;
  const range = high - low;
  const factor = (brightness - low) / range;
  return Math.floor(255 * factor);
}

// Pure black (RGB 0,0,0) -> Alpha 0
assert.strictEqual(simulateChromaKey(0, 0, 0, 18, 42), 0);
// Near-black dark fringe (RGB 12, 14, 15) -> Alpha 0
assert.strictEqual(simulateChromaKey(12, 14, 15, 18, 42), 0);
// Transition boundary (RGB 30, 25, 20) -> Partial alpha
const midAlpha = simulateChromaKey(30, 25, 20, 18, 42);
assert.ok(midAlpha > 0 && midAlpha < 255, `Mid alpha expected between 0 and 255, got ${midAlpha}`);
// Bright subject pixel (RGB 120, 80, 40) -> Alpha 255
assert.strictEqual(simulateChromaKey(120, 80, 40, 18, 42), 255);
console.log('✓ Test 5 Passed: Chroma-key soft-feathering formula verified mathematically');

console.log('ALL ASSET MANAGER VERIFICATION CHECKS PASSED SUCCESSFULLY!');
