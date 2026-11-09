import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FloatingTextManager, VFXManager } from '@/game/vfx';
import { assetManager, ASSET_MANIFEST } from '@/game/engine/AssetManager';

describe('FloatingTextManager & VFXManager Object Pool Suite', () => {
  it('instantiates FloatingTextManager with pre-allocated slots and handles spawning', () => {
    const ftm = new FloatingTextManager(64);
    assert.ok(ftm);

    // Spawning distinct combat archetypes
    ftm.spawnDamage(100, 200, 45, false);
    ftm.spawnCrit(110, 210, 120);
    ftm.spawnPlayerDamage(200, 300, 15);
    ftm.spawnDodge(200, 300);
    ftm.spawnHeal(200, 300, 25, false);
    ftm.spawnHeal(200, 300, 5, true);
    ftm.spawnPickup(150, 250, '+5 💎', '#fbbf24');
    ftm.spawnBanner(500, 400, 'DALGA TAMAMLANDI!', '#38bdf8');

    // Ticking updates lifetime
    ftm.update(0.016);
    ftm.update(0.5);

    // Clear resets all slots
    ftm.clear();
  });

  it('handles saturated capacity and priority recycling in FloatingTextManager', () => {
    const ftm = new FloatingTextManager(16);

    // Fill pool to capacity
    for (let i = 0; i < 20; i++) {
      ftm.spawnDamage(i * 10, i * 10, i + 1, false);
    }

    // High priority spawn should survive or evict lower priority
    ftm.spawnBanner(100, 100, 'PRIORITY BANNER', '#ffffff');
    ftm.update(0.016);
    ftm.clear();
  });

  it('instantiates VFXManager and exercises particle archetypes, hit-stop, and trauma', () => {
    const vfx = new VFXManager(512);
    assert.ok(vfx);

    // Particle archetypes
    vfx.spawnHitSparks(100, 100, 0, false, 6);
    vfx.spawnBloodSplatter(100, 100, '#f43f5e', 8);
    vfx.spawnMuzzleFlash(150, 150, Math.PI / 4);
    vfx.spawnMeleeSlashArc(120, 120, 0, 120, 150);
    vfx.spawnPickupRing(200, 200, 'material');
    vfx.spawnDustPuff(180, 180, 4);
    vfx.spawnDeathBurst(300, 300, '#a855f7', true);

    // Screen shake trauma
    vfx.addTrauma(0.5);
    assert.ok(vfx.shakeOffsetX !== undefined);
    assert.ok(vfx.shakeOffsetY !== undefined);

    // Hit-stop freeze frame
    vfx.triggerHitStop(50);
    const res = vfx.update(0.016);
    assert.equal(res.isSimulationFrozen, true);

    // Flash and vignette triggers
    vfx.triggerDamageVignette(0.7);
    vfx.triggerWhiteFlash(0.4);

    vfx.update(0.1);
    vfx.clear();
  });

  it('AssetManager authoritative alias resolution and manifest verification', () => {
    assert.equal(ASSET_MANIFEST.length, 26, 'Authoritative manifest must define 26 visual assets');

    // Alias checks
    assert.equal(assetManager.resolveKey('player_potato'), 'player_potato_scholar');
    assert.equal(assetManager.resolveKey('potato_scholar'), 'player_potato_scholar');
    assert.equal(assetManager.resolveKey('buept_student'), 'player_buept_student');
    assert.equal(assetManager.resolveKey('swarmer'), 'enemy_swarmer');
    assert.equal(assetManager.resolveKey('rusher'), 'enemy_rusher');
    assert.equal(assetManager.resolveKey('tank'), 'enemy_tank');
    assert.equal(assetManager.resolveKey('enemy_ranged'), 'enemy_ranged_shooter');
    assert.equal(assetManager.resolveKey('enemy_elite'), 'enemy_elite_boss');
    assert.equal(assetManager.resolveKey('drop_material'), 'pickup_material_crystal');
    assert.equal(assetManager.resolveKey('drop_fruit'), 'pickup_health_fruit');
    assert.equal(assetManager.resolveKey('drop_chest'), 'pickup_mystery_chest');
    assert.equal(assetManager.resolveKey('floor'), 'arena_tile_floor');
    assert.equal(assetManager.resolveKey('border_wall'), 'arena_border_wall');

    // Get manifest entry
    const entry = assetManager.getManifestEntry('enemy_elite');
    assert.ok(entry);
    assert.equal(entry.key, 'enemy_elite_boss');
  });
});
