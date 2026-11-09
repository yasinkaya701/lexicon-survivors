import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Authoritative Combat Math Formulas from PROJECT.md and Official Brotato Mechanics:
 * - Armor:
 *     Positive: D_taken = max(1, floor(D_raw * (15 / (15 + armor))))
 *     Negative: D_taken = floor(D_raw * (1 + |armor| / 15))
 * - Attack Speed Cooldown:
 *     T = max(83.33, T0 * (100 / (100 + max(-90, attackSpeed))))
 * - Dodge Avoidance:
 *     effectiveDodge = min(60, max(0, dodgePercent))
 * - Life Steal ICD:
 *     0.10s (100ms) interval between trigger events (max 10 heals/s)
 * - Harvesting Compounding:
 *     harvesting_next = harvesting + ceil(harvesting * 0.05)
 */

export function calculateArmorDamage(rawDamage: number, armor: number): number {
  if (armor >= 0) {
    return Math.max(1, Math.floor(rawDamage * (15 / (15 + armor))));
  }
  return Math.floor(rawDamage * (1 + Math.abs(armor) / 15));
}

export function calculateAttackCooldown(baseCooldownMs: number, attackSpeedPercent: number): number {
  const effectiveAS = Math.max(-90, attackSpeedPercent);
  const cooldown = baseCooldownMs * (100 / (100 + effectiveAS));
  return Math.max(83.33, Math.round(cooldown * 100) / 100);
}

export function calculateEffectiveDodge(dodgePercent: number): number {
  return Math.min(60, Math.max(0, dodgePercent));
}

export class LifeStealTracker {
  private lastTriggerMs: number = -Infinity;
  readonly icdMs: number = 100; // 0.10s ICD

  public attemptHeal(currentMs: number, roll: number, lifeStealPercent: number): boolean {
    if (roll >= lifeStealPercent) return false;
    if (currentMs - this.lastTriggerMs < this.icdMs) return false;
    this.lastTriggerMs = currentMs;
    return true;
  }
}

export function compoundHarvesting(currentHarvesting: number): { payout: number; newHarvesting: number } {
  const payout = currentHarvesting;
  const growth = Math.ceil(currentHarvesting * 0.05);
  return {
    payout,
    newHarvesting: currentHarvesting + growth,
  };
}

describe('Combat Math Specification Verification', () => {
  describe('Armor Damage Reduction Formula', () => {
    it('applies 0% reduction when armor is 0', () => {
      assert.equal(calculateArmorDamage(20, 0), 20);
      assert.equal(calculateArmorDamage(100, 0), 100);
    });

    it('applies exactly 25% reduction with 5 armor (multiplier 0.75x)', () => {
      // 15 / (15 + 5) = 15/20 = 0.75
      assert.equal(calculateArmorDamage(20, 5), 15);
      assert.equal(calculateArmorDamage(100, 5), 75);
    });

    it('applies exactly 50% reduction with 15 armor (multiplier 0.50x)', () => {
      // 15 / (15 + 15) = 0.50
      assert.equal(calculateArmorDamage(20, 15), 10);
      assert.equal(calculateArmorDamage(50, 15), 25);
    });

    it('applies 75% reduction with 45 armor (multiplier 0.25x)', () => {
      // 15 / (15 + 45) = 15/60 = 0.25
      assert.equal(calculateArmorDamage(20, 45), 5);
      assert.equal(calculateArmorDamage(80, 45), 20);
    });

    it('amplifies damage symmetrically when armor is negative', () => {
      // -15 armor -> 1 + 15/15 = 2.0x
      assert.equal(calculateArmorDamage(20, -15), 40);
      // -5 armor -> 1 + 5/15 = 1.333x -> floor(30 * 1.333) = 40
      assert.equal(calculateArmorDamage(30, -5), 40);
    });

    it('enforces a minimum damage floor of 1 for non-dodged hits under high armor', () => {
      assert.equal(calculateArmorDamage(1, 1000), 1);
      assert.equal(calculateArmorDamage(2, 500), 1);
    });
  });

  describe('Attack Speed Cooldown Formula', () => {
    it('returns base cooldown when attack speed is 0%', () => {
      assert.equal(calculateAttackCooldown(1000, 0), 1000);
      assert.equal(calculateAttackCooldown(500, 0), 500);
    });

    it('halves cooldown when attack speed is +100%', () => {
      assert.equal(calculateAttackCooldown(1000, 100), 500);
      assert.equal(calculateAttackCooldown(400, 100), 200);
    });

    it('reduces cooldown by 4x when attack speed is +300%', () => {
      assert.equal(calculateAttackCooldown(1000, 300), 250);
    });

    it('clamps to 12 hits/sec (83.33ms) under extreme attack speed', () => {
      assert.equal(calculateAttackCooldown(100, 500), 83.33);
      assert.equal(calculateAttackCooldown(50, 1000), 83.33);
    });

    it('clamps negative attack speed at -90% to avoid division by zero or negative values', () => {
      // Base 1000ms at -90% -> 1000 * (100 / 10) = 10000ms
      assert.equal(calculateAttackCooldown(1000, -90), 10000);
      // Below -90% clamps to -90%
      assert.equal(calculateAttackCooldown(1000, -99), 10000);
      assert.equal(calculateAttackCooldown(1000, -200), 10000);
    });
  });

  describe('Dodge Avoidance Roll & Cap', () => {
    it('passes through normal dodge values below the 60% cap', () => {
      assert.equal(calculateEffectiveDodge(0), 0);
      assert.equal(calculateEffectiveDodge(15), 15);
      assert.equal(calculateEffectiveDodge(45), 45);
      assert.equal(calculateEffectiveDodge(60), 60);
    });

    it('strictly clamps dodge values exceeding 60%', () => {
      assert.equal(calculateEffectiveDodge(61), 60);
      assert.equal(calculateEffectiveDodge(85), 60);
      assert.equal(calculateEffectiveDodge(150), 60);
    });

    it('strictly clamps negative dodge values to 0%', () => {
      assert.equal(calculateEffectiveDodge(-1), 0);
      assert.equal(calculateEffectiveDodge(-20), 0);
    });
  });

  describe('Life Steal On-Hit & 0.10s ICD', () => {
    it('triggers healing when roll is below life steal percent and off cooldown', () => {
      const tracker = new LifeStealTracker();
      const healed = tracker.attemptHeal(1000, 4, 10); // roll 4 < 10%
      assert.equal(healed, true);
    });

    it('rejects healing when roll fails', () => {
      const tracker = new LifeStealTracker();
      const healed = tracker.attemptHeal(1000, 15, 10); // roll 15 >= 10%
      assert.equal(healed, false);
    });

    it('strictly enforces 0.10s (100ms) internal cooldown during rapid hits', () => {
      const tracker = new LifeStealTracker();
      // First hit at 1000ms heals
      assert.equal(tracker.attemptHeal(1000, 1, 100), true);

      // Hit at 1050ms (within 100ms ICD) MUST be rejected even with 100% life steal
      assert.equal(tracker.attemptHeal(1050, 1, 100), false);

      // Hit at 1099ms MUST still be rejected
      assert.equal(tracker.attemptHeal(1099, 1, 100), false);

      // Hit at 1100ms (exactly 100ms after last heal) is allowed
      assert.equal(tracker.attemptHeal(1100, 1, 100), true);
    });

    it('prevents multi-cleave burst from granting more than 1 HP in the same frame', () => {
      const tracker = new LifeStealTracker();
      let totalHeals = 0;
      // 10 enemies hit simultaneously in frame at t = 2000ms
      for (let i = 0; i < 10; i++) {
        if (tracker.attemptHeal(2000, 1, 100)) {
          totalHeals++;
        }
      }
      assert.equal(totalHeals, 1);
    });
  });

  describe('Harvesting Compound Growth Economy', () => {
    it('calculates wave payout and 5% ceiling compounding', () => {
      // 10 -> payout 10, growth ceil(0.5) = 1 -> new 11
      const res10 = compoundHarvesting(10);
      assert.equal(res10.payout, 10);
      assert.equal(res10.newHarvesting, 11);

      // 20 -> growth ceil(1.0) = 1 -> new 21
      const res20 = compoundHarvesting(20);
      assert.equal(res20.payout, 20);
      assert.equal(res20.newHarvesting, 21);

      // 21 -> growth ceil(1.05) = 2 -> new 23
      const res21 = compoundHarvesting(21);
      assert.equal(res21.payout, 21);
      assert.equal(res21.newHarvesting, 23);

      // 100 -> growth ceil(5.0) = 5 -> new 105
      const res100 = compoundHarvesting(100);
      assert.equal(res100.payout, 100);
      assert.equal(res100.newHarvesting, 105);
    });

    it('handles 0 harvesting gracefully', () => {
      const res0 = compoundHarvesting(0);
      assert.equal(res0.payout, 0);
      assert.equal(res0.newHarvesting, 0);
    });
  });
});
