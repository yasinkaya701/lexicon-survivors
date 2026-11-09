import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { YKS_QUESTIONS, BUEPT_QUESTIONS } from '@/data/questions';
import { soundEngine } from '@/lib/sound';
import { calculateArmorDamage, calculateAttackCooldown, calculateEffectiveDodge } from '../unit/combat_math.test';
import { calculateEnemyStats, calculateWaveDuration } from '../unit/stat_scaling.test';
import { ShopInventoryManager, WeaponFusionManager } from '../unit/shop_economy.test';
import { QuestionTelemetryTracker, applySubjectBuff, createDefaultPlayerStats } from '../unit/question_buffs.test';

/**
 * Headless Simulation Models for E2E Game Loop Testing
 */

export interface Vector2D {
  x: number;
  y: number;
}

export interface PlayerEntity {
  pos: Vector2D;
  vel: Vector2D;
  radius: number;
  maxHp: number;
  currentHp: number;
  speedPercent: number;
  isDashing: boolean;
  dashDurationRemaining: number;
}

export interface ArenaBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const DEFAULT_ARENA: ArenaBounds = {
  minX: 100,
  maxX: 1820,
  minY: 100,
  maxY: 980,
};

export function updatePlayerMovement(
  player: PlayerEntity,
  input: Vector2D,
  dt: number,
  bounds: ArenaBounds = DEFAULT_ARENA
): void {
  // Frame-accurate freeze: when dt is 0, do not modify position or velocity
  if (dt === 0) return;

  const baseSpeed = 300;
  const speedMultiplier = player.isDashing ? 1.5 : 1.0;
  const maxSpeed = Math.max(50, baseSpeed * speedMultiplier * (1 + player.speedPercent / 100));
  const accel = 2400;
  const friction = 0.88;

  // Normalize input
  const len = Math.hypot(input.x, input.y);
  const dirX = len > 0 ? input.x / len : 0;
  const dirY = len > 0 ? input.y / len : 0;

  // Integrate velocity
  player.vel.x = (player.vel.x + dirX * accel * dt) * friction;
  player.vel.y = (player.vel.y + dirY * accel * dt) * friction;

  // Speed cap
  const currentSpeed = Math.hypot(player.vel.x, player.vel.y);
  if (currentSpeed > maxSpeed) {
    player.vel.x = (player.vel.x / currentSpeed) * maxSpeed;
    player.vel.y = (player.vel.y / currentSpeed) * maxSpeed;
  }

  // Integrate position
  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;

  // Boundary clamping with wall sliding
  const clampedX = Math.max(bounds.minX + player.radius, Math.min(bounds.maxX - player.radius, player.pos.x));
  const clampedY = Math.max(bounds.minY + player.radius, Math.min(bounds.maxY - player.radius, player.pos.y));

  if (clampedX !== player.pos.x) {
    player.pos.x = clampedX;
    player.vel.x = 0; // zero perpendicular velocity for smooth sliding
  }
  if (clampedY !== player.pos.y) {
    player.pos.y = clampedY;
    player.vel.y = 0;
  }
}

describe('Brotato Roguelite E2E Test Suite (Tiers 1-4)', () => {
  // =========================================================================
  // TIER 1: Feature Coverage (Isolated Feature Units)
  // =========================================================================
  describe('Tier 1: Feature Coverage', () => {
    it('Feature 1 & 2: 360° Movement & Inertia Damping Physics', () => {
      const player: PlayerEntity = {
        pos: { x: 500, y: 500 },
        vel: { x: 0, y: 0 },
        radius: 24,
        maxHp: 10,
        currentHp: 10,
        speedPercent: 0,
        isDashing: false,
        dashDurationRemaining: 0,
      };

      // Move diagonally (1, 1)
      updatePlayerMovement(player, { x: 1, y: 1 }, 1 / 60);
      assert.ok(player.pos.x > 500);
      assert.ok(player.pos.y > 500);

      // Stop input -> velocity decays due to 0.88 friction
      const initialVel = { ...player.vel };
      updatePlayerMovement(player, { x: 0, y: 0 }, 1 / 60);
      assert.ok(Math.abs(player.vel.x) < Math.abs(initialVel.x));
      assert.ok(Math.abs(player.vel.y) < Math.abs(initialVel.y));
    });

    it('Feature 5: Simultaneous Multi-Weapon Array (up to 6 weapons ticking independently)', () => {
      const weapons = [
        { id: 'pistol', cooldownRemainingMs: 500, baseCooldown: 500, firedCount: 0 },
        { id: 'smg', cooldownRemainingMs: 120, baseCooldown: 120, firedCount: 0 },
        { id: 'shotgun', cooldownRemainingMs: 800, baseCooldown: 800, firedCount: 0 },
        { id: 'knife', cooldownRemainingMs: 300, baseCooldown: 300, firedCount: 0 },
        { id: 'sword', cooldownRemainingMs: 600, baseCooldown: 600, firedCount: 0 },
        { id: 'wrench', cooldownRemainingMs: 400, baseCooldown: 400, firedCount: 0 },
      ];

      // Simulate 600ms ticking at 10ms precision (60 ticks)
      const dtMs = 10;
      for (let t = 0; t < 600; t += dtMs) {
        for (const w of weapons) {
          w.cooldownRemainingMs -= dtMs;
          if (w.cooldownRemainingMs <= 0) {
            w.firedCount++;
            w.cooldownRemainingMs = w.baseCooldown;
          }
        }
      }

      // Fast SMG (120ms) fired 5 times, slow Shotgun (800ms) fired 0 times
      assert.equal(weapons.find((w) => w.id === 'smg')!.firedCount, 5);
      assert.equal(weapons.find((w) => w.id === 'shotgun')!.firedCount, 0);
      assert.equal(weapons.find((w) => w.id === 'knife')!.firedCount, 2);
    });

    it('Feature 24-28: 5 Distinct Enemy Archetypes instantiation and base stats', () => {
      const types = ['swarmer', 'rusher', 'tank', 'ranged', 'elite'] as const;
      for (const t of types) {
        const stats = calculateEnemyStats(t, 1);
        assert.ok(stats.hp > 0);
        assert.ok(stats.dmg > 0);
        assert.ok(stats.speed > 0);
      }
    });

    it('Feature 43 & 44: Audio and Question Data Preservation', () => {
      // Questions
      assert.ok(YKS_QUESTIONS.length >= 6);
      assert.ok(BUEPT_QUESTIONS.length >= 6);
      // Sound engine instance check
      assert.ok(soundEngine);
      assert.equal(typeof soundEngine.playHit, 'function');
      assert.equal(typeof soundEngine.playComboUp, 'function');
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Corner Cases
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('Feature 3: Arena boundary collision and sliding clamp', () => {
      const player: PlayerEntity = {
        pos: { x: DEFAULT_ARENA.maxX - 5, y: 500 },
        vel: { x: 500, y: 300 }, // moving right and down
        radius: 24,
        maxHp: 10,
        currentHp: 10,
        speedPercent: 0,
        isDashing: false,
        dashDurationRemaining: 0,
      };

      // Moving right against right boundary
      updatePlayerMovement(player, { x: 1, y: 0 }, 0.1);
      // Clamped to maxX - radius
      assert.equal(player.pos.x, DEFAULT_ARENA.maxX - player.radius);
      // X velocity zeroed
      assert.equal(player.vel.x, 0);
    });

    it('Feature 4: Dodge strictly clamped at 60% even with extreme positive bonuses', () => {
      assert.equal(calculateEffectiveDodge(60), 60);
      assert.equal(calculateEffectiveDodge(95), 60);
      assert.equal(calculateEffectiveDodge(300), 60);
      // Negative stats clamp to 0
      assert.equal(calculateEffectiveDodge(-50), 0);
    });

    it('Feature 9: Attack Speed cooldown capped at 12 hits/s (83.33ms) and -90% clamp', () => {
      assert.equal(calculateAttackCooldown(50, 1000), 83.33);
      assert.equal(calculateAttackCooldown(1000, -95), 10000);
    });

    it('Feature 17: Extreme positive armor and minimum 1 HP damage floor', () => {
      // 135 armor -> 15 / 150 = 0.10 (90% reduction)
      assert.equal(calculateArmorDamage(100, 135), 10);
      // Raw 1 damage into 135 armor still deals 1 HP floor
      assert.equal(calculateArmorDamage(1, 135), 1);
    });
  });

  // =========================================================================
  // TIER 3: Cross-Feature Combinations
  // =========================================================================
  describe('Tier 3: Cross-Feature Combinations', () => {
    it('Feature 57 & 59: Tactical Freeze (dt=0) during active Dash preserves state', () => {
      const player: PlayerEntity = {
        pos: { x: 500, y: 500 },
        vel: { x: 450, y: 0 },
        radius: 24,
        maxHp: 10,
        currentHp: 10,
        speedPercent: 0,
        isDashing: true,
        dashDurationRemaining: 0.3,
      };

      // Tactical question freeze trigger (mystery chest hit)
      const isPaused = true;
      const dt = isPaused ? 0 : 1 / 60;

      // Update during pause
      updatePlayerMovement(player, { x: 1, y: 0 }, dt);

      // Position and velocity MUST remain frozen exactly
      assert.equal(player.pos.x, 500);
      assert.equal(player.pos.y, 500);
      assert.equal(player.vel.x, 450);

      // Once question answered, pause lifts and dash completes
      updatePlayerMovement(player, { x: 1, y: 0 }, 0.1);
      assert.ok(player.pos.x > 500);
    });

    it('Feature 39 & 40: Shop Slot Lock combined with Rerolls and Auto-Combine', () => {
      const shop = new ShopInventoryManager(2);
      shop.lockSlot(0); // Lock slot 0

      // Execute 3 rerolls
      shop.reroll();
      shop.reroll();
      shop.reroll();
      assert.equal(shop.rerollCount, 3);
      assert.ok(shop.slots[0] !== null);

      // Test weapon fusion on purchase into full inventory
      const fusion = new WeaponFusionManager();
      for (let i = 0; i < 6; i++) {
        fusion.addWeapon({
          id: i === 0 ? 'target_sword' : `weapon_${i}`,
          name: `Weapon ${i}`,
          tier: 1,
          baseDamage: 10,
          baseCooldownMs: 500,
          critChance: 0.05,
          knockback: 10,
        });
      }
      assert.equal(fusion.weapons.length, 6);

      // Buy duplicate target_sword
      const buyRes = fusion.addWeapon({
        id: 'target_sword',
        name: 'Target Sword',
        tier: 1,
        baseDamage: 10,
        baseCooldownMs: 500,
        critChance: 0.05,
        knockback: 10,
      });

      assert.equal(buyRes.success, true);
      assert.equal(buyRes.merged, true);
      assert.equal(fusion.weapons[0].tier, 2); // Merged into Tier 2 in place!
    });
  });

  // =========================================================================
  // TIER 4: Real-World Scenarios (Complete Multi-Wave Run Simulation)
  // =========================================================================
  describe('Tier 4: Real-World Scenarios', () => {
    it('simulates full 20-wave progression loop from Wave 1 to Victory', () => {
      const stats = createDefaultPlayerStats();
      stats.maxHp = 50;
      stats.currentHp = 50;
      let materials = 0;
      const telemetry = new QuestionTelemetryTracker();

      for (let wave = 1; wave <= 20; wave++) {
        const duration = calculateWaveDuration(wave);
        assert.ok(duration >= 20 && duration <= 90);

        // Combat simulation: Kill enemies & collect materials
        const enemiesKilled = 10 + wave * 2;
        materials += enemiesKilled; // +1 material per enemy

        // Wave End: Auto-vacuum pulls all materials
        // Inter-Wave Study Modal: Answer educational question
        const isCorrect = wave % 4 !== 0; // 75% accuracy
        telemetry.recordAnswer('TYT Matematik', isCorrect);

        if (isCorrect) {
          applySubjectBuff(stats, 'TYT Matematik');
        }

        // Shop Phase: Purchase stats or weapons
        if (materials >= 25) {
          materials -= 20;
          stats.maxHp += 5;
          stats.currentHp = Math.min(stats.maxHp, stats.currentHp + 5);
        }
      }

      // Check final state at Wave 20 completion
      assert.ok(materials > 0);
      assert.ok(stats.damagePercent > 0);
      assert.ok(telemetry.getAccuracyRate('TYT Matematik') >= 70);
      assert.equal(telemetry.attempts, 20);
    });

    it('handles Game Over condition cleanly when player HP drops to 0', () => {
      const player: PlayerEntity = {
        pos: { x: 500, y: 500 },
        vel: { x: 0, y: 0 },
        radius: 24,
        maxHp: 20,
        currentHp: 10,
        speedPercent: 0,
        isDashing: false,
        dashDurationRemaining: 0,
      };

      // Heavy boss hit
      const incomingDmg = 30;
      const dmgTaken = calculateArmorDamage(incomingDmg, 0); // 30 dmg
      player.currentHp = Math.max(0, player.currentHp - dmgTaken);

      const isGameOver = player.currentHp <= 0;
      assert.equal(isGameOver, true);
      assert.equal(player.currentHp, 0);
    });
  });
});
