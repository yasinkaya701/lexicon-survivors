import { describe, it, expect } from 'vitest';
import {
  ENEMY_ARCHETYPES,
  calculateEnemyStats,
  createEnemy,
  updateEnemyAI,
  type ArenaBounds,
} from '@/game/entities/EnemyEntities';
import {
  WaveDirector,
  calculateWaveDuration,
  calculateSpawnRate,
  generateWaveConfig,
} from '@/game/waves/WaveDirector';
import {
  generateDropsForEnemy,
  updatePickups,
  calculateDropChance,
  calculateHarvestingBonus,
} from '@/game/entities/DropManager';
import {
  ShopInventoryManager,
  WeaponFusionManager,
  calculateItemPrice,
  calculateRerollCost,
  BASE_PRICES,
  getTierWeights,
  rollTier,
} from '@/game/shop/ShopEngine';
import {
  WeaponManager,
} from '@/game/weapons/WeaponManager';
import {
  BASE_WEAPONS,
  WEAPON_REGISTRY,
  buildTierBlueprint,
  getWeaponBlueprint,
} from '@/game/weapons/WeaponCatalog';
import {
  calculateKnockbackImpulse,
  checkMeleeSwingHit,
  checkMeleeThrustHit,
} from '@/game/weapons/HitResolution';
import {
  applyKnockback,
  updatePlayerMovement,
} from '@/game/engine/Kinematics';
import type {
  PlayerEntity,
  EnemyEntity,
  PickupEntity,
  WeaponTier,
} from '@/types/brotato';

const TEST_ARENA: ArenaBounds = {
  minX: 100,
  maxX: 1820,
  minY: 100,
  maxY: 980,
};

function createMockPlayer(x = 960, y = 540): PlayerEntity {
  return {
    id: 'player_mock',
    characterId: 'potato_scholar',
    x,
    y,
    vx: 0,
    vy: 0,
    radius: 24,
    facingAngleRad: 0,
    stats: {
      maxHp: 100,
      currentHp: 100,
      hpRegen: 0,
      lifeSteal: 0,
      damagePercent: 0,
      meleeDamage: 0,
      rangedDamage: 0,
      elementalDamage: 0,
      attackSpeed: 0,
      critChancePercent: 5,
      engineering: 0,
      range: 0,
      armor: 0,
      dodgePercent: 0,
      speedPercent: 0,
      luck: 0,
      harvesting: 0,
      pickupRange: 120,
    },
    invulnerabilityTimerMs: 0,
    isInvulnerable: false,
    spriteName: 'player_potato',
  };
}

describe('M2 Challenger Empirical Stress Tests', () => {
  // =========================================================================
  // 1. Enemy AI Archetypes & State Machines
  // =========================================================================
  describe('1. Enemy Archetype AI State Transitions & Physics', () => {
    it('Tank/Charger: telegraph (0.8s) -> charging (1.2s dash at 360 px/s with knockback immunity)', () => {
      const player = createMockPlayer(500, 500);
      // Position tank within telegraph trigger radius (300px away, dist <= 350)
      const tank = createEnemy('tank', 1, 500, 200);

      // Fast-forward initial spawn delay (400ms)
      updateEnemyAI(tank, player, [tank], 0.45, TEST_ARENA);
      expect(tank.state).toBe('pursuing');

      // Zero attack cooldown so it can immediately trigger telegraph
      tank.attackCooldownMs = 0;
      updateEnemyAI(tank, player, [tank], 0.05, TEST_ARENA);

      // Should now be telegraphing for 800ms
      expect(tank.state).toBe('telegraphing');
      expect(tank.stateTimerMs).toBeLessThanOrEqual(800);
      expect(tank.vx).toBe(0);
      expect(tank.vy).toBe(0);
      expect(tank.isImmuneToKnockback).toBe(false);

      // Tick 700ms: still telegraphing
      updateEnemyAI(tank, player, [tank], 0.70, TEST_ARENA);
      expect(tank.state).toBe('telegraphing');
      expect(tank.isImmuneToKnockback).toBe(false);

      // Tick remaining 150ms: enters charging state
      updateEnemyAI(tank, player, [tank], 0.15, TEST_ARENA);
      expect(tank.state).toBe('charging');
      expect(tank.stateTimerMs).toBeLessThanOrEqual(1200);
      expect(tank.isImmuneToKnockback).toBe(true);

      // Verify charge speed: hypot(vx, vy) should equal 360 px/s
      const chargeSpeed = Math.hypot(tank.vx, tank.vy);
      expect(Math.round(chargeSpeed)).toBe(360);

      // Verify Knockback Immunity during dash:
      // A. calculateKnockbackImpulse returns (0, 0)
      const impulse = calculateKnockbackImpulse({ x: player.x, y: player.y }, tank, 50);
      expect(impulse).toEqual({ x: 0, y: 0 });

      // B. applyKnockback ignores impulse completely
      const newVel = applyKnockback({ x: tank.vx, y: tank.vy }, { x: 100, y: 100 }, tank.mass, tank.isImmuneToKnockback);
      expect(newVel.x).toBe(tank.vx);
      expect(newVel.y).toBe(tank.vy);

      // Advance dash past 1.2s: returns to pursuing and knockback immunity lifts
      updateEnemyAI(tank, player, [tank], 1.25, TEST_ARENA);
      expect(tank.state).toBe('pursuing');
      expect(tank.isImmuneToKnockback).toBe(false);
      expect(tank.attackCooldownMs).toBe(2500);
    });

    it('Rusher: moves at 260 px/s with sinusoidal weaving trajectory', () => {
      const player = createMockPlayer(500, 500);
      // Spawn rusher far away (> 60px) at (500, 100)
      const rusher = createEnemy('rusher', 1, 500, 100);

      // Clear spawning state
      updateEnemyAI(rusher, player, [rusher], 0.45, TEST_ARENA);
      expect(rusher.state).toBe('pursuing');
      expect(rusher.speed).toBe(260);

      // Track lateral velocities over multiple time steps
      const lateralVelocities: number[] = [];
      let dt = 0.05; // 50ms ticks
      for (let i = 0; i < 40; i++) {
        updateEnemyAI(rusher, player, [rusher], dt, TEST_ARENA);
        const speed = Math.hypot(rusher.vx, rusher.vy);
        expect(Math.round(speed)).toBe(260); // Speed remains strictly 260 px/s
        lateralVelocities.push(rusher.vx); // Since player is at x=500, y=500 and rusher is at x=500, y<500, x is lateral
      }

      // Sinusoidal trajectory should have both positive and negative lateral velocities
      const hasPositive = lateralVelocities.some((v) => v > 10);
      const hasNegative = lateralVelocities.some((v) => v < -10);
      expect(hasPositive).toBe(true);
      expect(hasNegative).toBe(true);
    });

    it('Wave Elite: emits 12 radial bullets and ground slam shockwave, enrages under 50% HP', () => {
      const player = createMockPlayer(500, 500);
      const elite = createEnemy('elite', 11, 500, 200);

      // Clear spawn
      updateEnemyAI(elite, player, [elite], 0.45, TEST_ARENA);
      expect(elite.isImmuneToKnockback).toBe(true); // Elite is always knockback immune

      // Force radial nova trigger by ticking 3.1s
      const resNova = updateEnemyAI(elite, player, [elite], 3.1, TEST_ARENA);
      expect(resNova.spawnedProjectiles.length).toBe(12);

      // Verify bullets are evenly spaced in a radial 360 circle
      const angles = resNova.spawnedProjectiles.map((p) => Math.atan2(p.vy, p.vx));
      for (let i = 0; i < 12; i++) {
        const expectedAngle = (i * 2 * Math.PI) / 12;
        // Projectile angles should match
        const diff = Math.abs(angles[i] - (expectedAngle > Math.PI ? expectedAngle - 2 * Math.PI : expectedAngle));
        expect(diff).toBeLessThan(0.01);
      }

      // Force ground slam shockwave trigger by ticking 3.0s more (total > 6.0s)
      const resSlam = updateEnemyAI(elite, player, [elite], 3.0, TEST_ARENA);
      expect(resSlam.shockwaves.length).toBe(1);
      expect(resSlam.shockwaves[0].radius).toBe(140);
      expect(resSlam.shockwaves[0].damage).toBe(elite.damage * 1.5);

      // Enrage test: Damage elite below 50% HP
      elite.hp = elite.maxHp * 0.4;
      const initialSpeed = elite.speed;
      updateEnemyAI(elite, player, [elite], 0.1, TEST_ARENA);
      const enrageSpeed = Math.hypot(elite.vx, elite.vy);
      // Speed multiplier is 1.2x
      expect(Math.round(enrageSpeed)).toBe(Math.round(initialSpeed * 1.2));
    });

    it('Swarmer and Ranged archetypes exhibit distinct swarm and kiting behaviors', () => {
      const player = createMockPlayer(500, 500);

      // Swarmer flocking separation
      const s1 = createEnemy('swarmer', 1, 500, 400);
      const s2 = createEnemy('swarmer', 1, 502, 400); // Very close swarmer
      updateEnemyAI(s1, player, [s1, s2], 0.45, TEST_ARENA);
      updateEnemyAI(s2, player, [s1, s2], 0.45, TEST_ARENA);
      // Soft push should push them horizontally away from each other
      updateEnemyAI(s1, player, [s1, s2], 0.05, TEST_ARENA);
      updateEnemyAI(s2, player, [s1, s2], 0.05, TEST_ARENA);
      expect(s1.vx).toBeLessThan(0);
      expect(s2.vx).toBeGreaterThan(0);

      // Ranged Shooter kiting: when closer than 350px, retreats
      const shooter = createEnemy('ranged', 1, 500, 300); // 200px away (dist < 350)
      updateEnemyAI(shooter, player, [shooter], 0.45, TEST_ARENA);
      updateEnemyAI(shooter, player, [shooter], 0.05, TEST_ARENA);
      expect(shooter.state).toBe('retreating');
      expect(shooter.vy).toBeLessThan(0); // Moves away from player (upward)
    });
  });

  // =========================================================================
  // 2. Wave Progression, Escalation & End-of-Wave Vacuum Physics
  // =========================================================================
  describe('2. Wave Progression & End-of-Wave Vacuum Acceleration', () => {
    it('WaveDirector scales across all waves 1 to 20 with proper boss waves', () => {
      const director = new WaveDirector(TEST_ARENA);

      for (let w = 1; w <= 20; w++) {
        const result = director.startWave(w);
        const expectedDuration = calculateWaveDuration(w);
        expect(director.state.currentWave).toBe(w);
        expect(director.state.waveDurationSec).toBe(expectedDuration);
        expect(director.state.waveTimeRemainingSec).toBe(expectedDuration);
        expect(director.state.isWaveActive).toBe(true);

        if (w === 11 || w === 20) {
          expect(director.config.isBossWave).toBe(true);
          expect(result.bossSpawn).toBeDefined();
          expect(result.bossSpawn?.type).toBe('elite');
        } else {
          expect(director.config.isBossWave).toBe(false);
          expect(result.bossSpawn).toBeUndefined();
        }
      }
    });

    it('WaveDirector triggers vacuum when wave timer expires (time <= 0)', () => {
      const director = new WaveDirector(TEST_ARENA);
      director.startWave(1); // 20s
      const playerPos = { x: 960, y: 540 };

      // Tick 19.9s: wave still active
      const tick1 = director.update(19.9, 5, playerPos);
      expect(director.state.isWaveActive).toBe(true);
      expect(director.state.isVacuumActive).toBe(false);
      expect(tick1.isWaveJustCompleted).toBe(false);

      // Tick 0.2s: wave completes, vacuum activates!
      const tick2 = director.update(0.2, 5, playerPos);
      expect(director.state.isWaveActive).toBe(false);
      expect(director.state.isWaveCompleted).toBe(true);
      expect(director.state.isVacuumActive).toBe(true);
      expect(tick2.isWaveJustCompleted).toBe(true);
    });

    it('Vacuum physics (2000 px/s): sweeps scattered drops across arena without overshoot', () => {
      const player = createMockPlayer(960, 540);

      // Create drops at various distances: 50px, 300px, 800px, 1200px
      const drops: PickupEntity[] = [
        {
          id: 'drop_1',
          type: 'material',
          x: 960,
          y: 490, // dist = 50
          vx: 0,
          vy: 0,
          value: 1,
          radius: 8,
          isMagnetized: false,
          spriteName: 'drop_mat',
        },
        {
          id: 'drop_2',
          type: 'material',
          x: 960,
          y: 240, // dist = 300
          vx: 0,
          vy: 0,
          value: 2,
          radius: 8,
          isMagnetized: false,
          spriteName: 'drop_mat',
        },
        {
          id: 'drop_3',
          type: 'fruit',
          x: 160,
          y: 540, // dist = 800
          vx: 0,
          vy: 0,
          value: 3,
          radius: 10,
          isMagnetized: false,
          spriteName: 'drop_fruit',
        },
        {
          id: 'drop_4',
          type: 'chest',
          x: 150,
          y: 150, // dist = sqrt((960-150)^2 + (540-150)^2) = ~900px
          vx: 0,
          vy: 0,
          value: 1,
          radius: 14,
          isMagnetized: false,
          spriteName: 'drop_chest',
        },
      ];

      // Simulate vacuum frames (dt = 1/60s = 0.01667s -> step = 33.33px per frame)
      let activePickups = [...drops];
      let totalMaterials = 0;
      let totalHealth = 0;
      let totalChests = 0;

      // 60 frames = 1 second of vacuum (2000 px total travel distance)
      for (let frame = 0; frame < 60; frame++) {
        const result = updatePickups(activePickups, player, true, 1 / 60);
        activePickups = result.survivingPickups;
        totalMaterials += result.collectedMaterials;
        totalHealth += result.collectedHealth;
        totalChests += result.collectedChests;
        if (activePickups.length === 0) break;
      }

      // ALL drops must be swept into player bag within 1 second!
      expect(activePickups.length).toBe(0);
      expect(totalMaterials).toBe(3); // 1 + 2
      expect(totalHealth).toBe(3);
      expect(totalChests).toBe(1);
    });
  });

  // =========================================================================
  // 3. Shop Economy, Price Inflation & Slot Lock Persistence
  // =========================================================================
  describe('3. Shop Economy, Price Inflation & Slot Locking', () => {
    it('verifies exact price inflation formula across all 4 tiers for waves 1 to 20', () => {
      // Formula: Price = Base + 1 + floor(Base * 0.10 * Wave)
      for (let tier = 1; tier <= 4; tier++) {
        const base = BASE_PRICES[tier as WeaponTier];
        for (let wave = 1; wave <= 20; wave++) {
          const expected = base + 1 + Math.floor(base * 0.10 * wave);
          const calculated = calculateItemPrice(base, wave);
          expect(calculated).toBe(expected);
        }
      }
    });

    it('verifies escalating reroll cost formula across waves 1 to 20 and resets on advance', () => {
      for (let wave = 1; wave <= 20; wave++) {
        const baseReroll = Math.max(1, Math.floor(wave * 0.75));
        const rerollStep = 1 + Math.floor(wave * 0.25);

        for (let k = 0; k <= 5; k++) {
          const expected = baseReroll + k * rerollStep;
          expect(calculateRerollCost(k, wave)).toBe(expected);
        }
      }

      // ShopInventoryManager reroll count reset test
      const shop = new ShopInventoryManager(1);
      shop.reroll();
      shop.reroll();
      expect(shop.rerollCount).toBe(2);

      shop.advanceWave(2);
      expect(shop.rerollCount).toBe(0);
      expect(shop.currentWave).toBe(2);
    });

    it('slot lock preserves item and freezes inflation price across rerolls and waves', () => {
      const shop = new ShopInventoryManager(1);
      // Lock slot 0
      shop.lockSlot(0);
      expect(shop.lockedSlots.has(0)).toBe(true);
      expect(shop.slots[0]?.isLocked).toBe(true);

      const lockedItemCopy = { ...shop.slots[0]! };

      // Reroll 3 times: locked slot must remain intact
      shop.reroll();
      shop.reroll();
      shop.reroll();
      expect(shop.slots[0]?.itemId).toBe(lockedItemCopy.itemId);
      expect(shop.slots[0]?.cost).toBe(lockedItemCopy.cost);

      // Advance wave from 1 to 5: locked slot cost remains frozen!
      shop.advanceWave(5);
      expect(shop.slots[0]?.itemId).toBe(lockedItemCopy.itemId);
      expect(shop.slots[0]?.cost).toBe(lockedItemCopy.cost);

      // Unlocked slot 1 should have wave 5 inflation
      const unlockedBase = BASE_PRICES[shop.slots[1]!.tier];
      expect(shop.slots[1]?.cost).toBe(calculateItemPrice(unlockedBase, 5));

      // Unlock slot 0: updates price to current wave inflation
      shop.unlockSlot(0);
      expect(shop.slots[0]?.isLocked).toBe(false);
      expect(shop.lockedSlots.has(0)).toBe(false);
      expect(shop.slots[0]?.cost).toBe(calculateItemPrice(BASE_PRICES[lockedItemCopy.tier], 5));
    });
  });

  // =========================================================================
  // 4. Weapon Tier Fusion & Auto-Combine on 6/6 Inventory
  // =========================================================================
  describe('4. Weapon Tier Fusion & Auto-Combine Mechanics', () => {
    it('WeaponFusionManager: fuses 2 identical Tier 1 weapons into 1 Tier 2 weapon (1.35x dmg, 0.90x cd)', () => {
      const fusion = new WeaponFusionManager();
      const pistolT1 = {
        id: 'pistol',
        name: 'Pistol',
        tier: 1 as WeaponTier,
        baseDamage: 12,
        baseCooldownMs: 800,
        critChance: 0.10,
        knockback: 12,
      };

      fusion.addWeapon(pistolT1);
      fusion.addWeapon(pistolT1);
      expect(fusion.weapons.length).toBe(2);

      const combined = fusion.manualCombine(0, 1);
      expect(combined).toBe(true);
      expect(fusion.weapons.length).toBe(1);

      const t2 = fusion.weapons[0];
      expect(t2.tier).toBe(2);
      // 12 * 1.35 = 16.2
      expect(t2.baseDamage).toBe(16.2);
      // 800 * 0.90 = 720
      expect(t2.baseCooldownMs).toBe(720);
      // 0.10 + 0.05 = 0.15
      expect(t2.critChance).toBe(0.15);
      // 12 * 1.15 = 13.8
      expect(t2.knockback).toBe(13.8);
    });

    it('WeaponFusionManager: auto-combines duplicate tier weapon when 6/6 slots are full', () => {
      const fusion = new WeaponFusionManager();

      // Add weapon A (Pistol T1) at slot 0
      fusion.addWeapon({
        id: 'pistol',
        name: 'Pistol',
        tier: 1,
        baseDamage: 12,
        baseCooldownMs: 800,
        critChance: 0.10,
        knockback: 12,
      });

      // Fill remaining 5 slots with other weapons
      for (let i = 1; i < 6; i++) {
        fusion.addWeapon({
          id: `weapon_${i}`,
          name: `Weapon ${i}`,
          tier: 1,
          baseDamage: 10,
          baseCooldownMs: 500,
          critChance: 0.05,
          knockback: 10,
        });
      }
      expect(fusion.weapons.length).toBe(6);

      // Attempt to add duplicate Pistol T1 into full 6-slot inventory
      const res = fusion.addWeapon({
        id: 'pistol',
        name: 'Pistol',
        tier: 1,
        baseDamage: 12,
        baseCooldownMs: 800,
        critChance: 0.10,
        knockback: 12,
      });

      expect(res.success).toBe(true);
      expect(res.merged).toBe(true);
      expect(fusion.weapons.length).toBe(6); // Total slots remains 6!
      expect(fusion.weapons[0].tier).toBe(2); // In-place upgrade to Tier 2!
      expect(fusion.weapons[0].baseDamage).toBe(16.2);
    });

    it('WeaponFusionManager: rejects merging invalid cases (different ID, different tier, or Tier 4)', () => {
      const fusion = new WeaponFusionManager();
      fusion.addWeapon({
        id: 'pistol',
        name: 'Pistol',
        tier: 1,
        baseDamage: 12,
        baseCooldownMs: 800,
        critChance: 0.10,
        knockback: 12,
      });
      fusion.addWeapon({
        id: 'shotgun',
        name: 'Shotgun',
        tier: 1,
        baseDamage: 10,
        baseCooldownMs: 1000,
        critChance: 0.05,
        knockback: 15,
      });

      // Differing weapon IDs
      expect(fusion.manualCombine(0, 1)).toBe(false);

      // Differing tiers with same ID (e.g. Pistol T1 vs Pistol T2)
      const fusionDiffTiers = new WeaponFusionManager();
      fusionDiffTiers.addWeapon({
        id: 'pistol',
        name: 'Pistol',
        tier: 1,
        baseDamage: 12,
        baseCooldownMs: 800,
        critChance: 0.10,
        knockback: 12,
      });
      fusionDiffTiers.addWeapon({
        id: 'pistol',
        name: 'Pistol II',
        tier: 2,
        baseDamage: 16.2,
        baseCooldownMs: 720,
        critChance: 0.15,
        knockback: 13.8,
      });
      expect(fusionDiffTiers.manualCombine(0, 1)).toBe(false);

      // When 6/6 full and adding weapon with same ID but different tier -> must fail and NOT merge
      const fusionFullMismatch = new WeaponFusionManager();
      for (let i = 0; i < 6; i++) {
        fusionFullMismatch.addWeapon({
          id: i === 0 ? 'pistol' : `weapon_${i}`,
          name: i === 0 ? 'Pistol II' : `Weapon ${i}`,
          tier: i === 0 ? 2 : 1, // Pistol is Tier 2
          baseDamage: 10,
          baseCooldownMs: 500,
          critChance: 0.05,
          knockback: 10,
        });
      }
      expect(fusionFullMismatch.weapons.length).toBe(6);
      // Try to add Pistol Tier 1 (mismatch with Pistol Tier 2)
      const resMismatch = fusionFullMismatch.addWeapon({
        id: 'pistol',
        name: 'Pistol',
        tier: 1,
        baseDamage: 12,
        baseCooldownMs: 800,
        critChance: 0.10,
        knockback: 12,
      });
      expect(resMismatch.success).toBe(false);
      expect(resMismatch.merged).toBe(false);

      // Tier 4 cap check
      const fusionT4 = new WeaponFusionManager();
      fusionT4.addWeapon({
        id: 'pistol',
        name: 'Pistol IV',
        tier: 4,
        baseDamage: 29.5,
        baseCooldownMs: 583.2,
        critChance: 0.25,
        knockback: 18.2,
      });
      fusionT4.addWeapon({
        id: 'pistol',
        name: 'Pistol IV',
        tier: 4,
        baseDamage: 29.5,
        baseCooldownMs: 583.2,
        critChance: 0.25,
        knockback: 18.2,
      });
      expect(fusionT4.manualCombine(0, 1)).toBe(false);
    });

    it('WeaponManager: live active array supports multi-slot auto-combine and blueprint scaling', () => {
      const wm = new WeaponManager();
      const pistolT1 = getWeaponBlueprint('pistol_1')!;
      expect(pistolT1).toBeDefined();

      // Add pistol to slot 0
      const r1 = wm.addWeapon(pistolT1);
      expect(r1.success).toBe(true);
      expect(r1.slotIndex).toBe(0);
      expect(r1.merged).toBe(false);

      // Fill remaining 5 slots
      const weaponTypes = ['shotgun_1', 'smg_1', 'wand_1', 'knife_1', 'sword_1'];
      for (const wid of weaponTypes) {
        const bp = getWeaponBlueprint(wid)!;
        expect(bp).toBeDefined();
        wm.addWeapon(bp);
      }
      expect(wm.getActiveWeapons().length).toBe(6);

      // Add duplicate pistol_1 when 6/6 full -> should merge and upgrade slot 0 to Tier 2
      const rMerge = wm.addWeapon(pistolT1);
      expect(rMerge.success).toBe(true);
      expect(rMerge.merged).toBe(true);
      expect(rMerge.slotIndex).toBe(0);
      expect(wm.weapons[0]?.blueprint.tier).toBe(2);
      expect(wm.weapons[0]?.blueprint.name).toBe('Pistol II');
      // Scaled stats
      expect(wm.weapons[0]?.blueprint.baseDamage).toBe(Math.round(12 * 1.35 * 10) / 10);
      expect(wm.weapons[0]?.blueprint.baseCooldownMs).toBe(Math.round(800 * 0.90 * 10) / 10);
    });
  });

  // =========================================================================
  // 5. Adversarial Extreme Stress & Boundary Harassment
  // =========================================================================
  describe('5. Extreme Boundary Harassment & Stress Verification', () => {
    it('Tank wall impact during charge immediately halts and resets to pursuing', () => {
      const player = createMockPlayer(500, 500);
      // Place tank right against left arena wall (minX + radius + 1)
      const tank = createEnemy('tank', 1, TEST_ARENA.minX + 30, 500);
      tank.state = 'charging';
      tank.stateTimerMs = 1000;
      tank.isImmuneToKnockback = true;
      tank.vx = -360; // Charging towards wall
      tank.vy = 0;

      // Frame 1: Moves towards wall and gets clamped at boundary (126px)
      updateEnemyAI(tank, player, [tank], 0.05, TEST_ARENA);
      // Frame 2: Evaluates atWall at clamped boundary and resets to pursuing
      updateEnemyAI(tank, player, [tank], 0.05, TEST_ARENA);
      expect(tank.state).toBe('pursuing');
      expect(tank.isImmuneToKnockback).toBe(false);
      expect(tank.vx).toBe(0);
      expect(tank.attackCooldownMs).toBe(2500);
    });

    it('Tactical Freeze (dt=0) preserves enemy AI state timers with zero drift', () => {
      const player = createMockPlayer(500, 500);
      const tank = createEnemy('tank', 1, 500, 200);
      tank.state = 'telegraphing';
      tank.stateTimerMs = 600;

      // Multiple dt=0 ticks
      for (let i = 0; i < 10; i++) {
        updateEnemyAI(tank, player, [tank], 0, TEST_ARENA);
      }

      expect(tank.state).toBe('telegraphing');
      expect(tank.stateTimerMs).toBe(600);
    });

    it('500-Pickup Vacuum Swarm: vacuum cleanly digests high density drops without NaN or loss', () => {
      const player = createMockPlayer(960, 540);
      const drops: PickupEntity[] = [];

      for (let i = 0; i < 500; i++) {
        const randAngle = Math.random() * Math.PI * 2;
        const randDist = 50 + Math.random() * 800;
        drops.push({
          id: `drop_stress_${i}`,
          type: i % 10 === 0 ? 'fruit' : i % 50 === 0 ? 'chest' : 'material',
          x: player.x + Math.cos(randAngle) * randDist,
          y: player.y + Math.sin(randAngle) * randDist,
          vx: 0,
          vy: 0,
          value: 1,
          radius: 8,
          isMagnetized: false,
          spriteName: 'drop_mat',
        });
      }

      let active = [...drops];
      let collected = 0;

      // 90 frames of vacuum (1.5 seconds)
      for (let frame = 0; frame < 90; frame++) {
        const res = updatePickups(active, player, true, 1 / 60);
        active = res.survivingPickups;
        collected += res.collectedMaterials + res.collectedHealth + res.collectedChests;
        if (active.length === 0) break;
      }

      expect(active.length).toBe(0);
      expect(collected).toBe(500);
    });

    it('Slot lock-unlock-relock cycle preserves price freeze integrity', () => {
      const shop = new ShopInventoryManager(1);
      const initialCost = shop.slots[0]!.cost;

      // Lock at wave 1
      shop.lockSlot(0);
      // Advance to wave 3
      shop.advanceWave(3);
      expect(shop.slots[0]!.cost).toBe(initialCost); // Still wave 1 price

      // Unlock at wave 3 -> price inflates to wave 3
      shop.unlockSlot(0);
      const wave3Cost = calculateItemPrice(BASE_PRICES[shop.slots[0]!.tier], 3);
      expect(shop.slots[0]!.cost).toBe(wave3Cost);

      // Re-lock at wave 3
      shop.lockSlot(0);
      // Advance to wave 6
      shop.advanceWave(6);
      expect(shop.slots[0]!.cost).toBe(wave3Cost); // Still wave 3 price
    });
  });

});
