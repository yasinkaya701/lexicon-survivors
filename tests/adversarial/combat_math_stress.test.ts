import { describe, it, expect } from 'vitest';
import {
  calculateArmorDamage,
  calculateAttackCooldown,
  calculateEffectiveDodge as calculateEffectiveDodgeMath,
  rollDodge as rollDodgeMath,
  LifeStealTracker,
  calculateWeaponDamage,
  calculateHpRegenInterval,
} from '@/game/stats/CombatMath';
import {
  calculateEffectiveDodge as calculateEffectiveDodgeEngine,
  rollDodge as rollDodgeEngine,
  DodgeTracker,
} from '@/game/engine/Dodge';

describe('Milestone 2 Empirical Combat Mathematics Stress & Boundary Tests', () => {
  // =========================================================================
  // 1. Armor Reduction Curve & Edge Cases
  // =========================================================================
  describe('1. Armor Reduction Curve & Edge Cases', () => {
    it('Armor = 0: raw damage passes through completely unmitigated', () => {
      expect(calculateArmorDamage(0, 0)).toBe(0);
      expect(calculateArmorDamage(1, 0)).toBe(1);
      expect(calculateArmorDamage(15, 0)).toBe(15);
      expect(calculateArmorDamage(100, 0)).toBe(100);
      expect(calculateArmorDamage(99999, 0)).toBe(99999);
    });

    it('Armor = 15: exactly 50% damage reduction (15 / (15 + 15) = 0.50x)', () => {
      // D_taken = floor(raw * 0.50)
      expect(calculateArmorDamage(20, 15)).toBe(10);
      expect(calculateArmorDamage(50, 15)).toBe(25);
      expect(calculateArmorDamage(100, 15)).toBe(50);
      expect(calculateArmorDamage(101, 15)).toBe(50); // floor(50.5)
      expect(calculateArmorDamage(1, 15)).toBe(1); // floor is 0 -> clamped to 1 HP floor
    });

    it('Armor = 1000: extreme high armor enforces minimum damage floor of >= 1 HP', () => {
      // 15 / (15 + 1000) = 15 / 1015 = 0.014778... (98.52% reduction)
      expect(calculateArmorDamage(1, 1000)).toBeGreaterThanOrEqual(1);
      expect(calculateArmorDamage(1, 1000)).toBe(1);
      expect(calculateArmorDamage(10, 1000)).toBe(1);
      expect(calculateArmorDamage(67, 1000)).toBe(1); // 67 * 15 / 1015 = 0.990 -> floor 0 -> clamped to 1
      expect(calculateArmorDamage(68, 1000)).toBe(1); // 68 * 15 / 1015 = 1.0049 -> 1
      expect(calculateArmorDamage(100, 1000)).toBe(1); // 100 * 15 / 1015 = 1.477 -> 1
      expect(calculateArmorDamage(1000, 1000)).toBe(14); // 1000 * 15 / 1015 = 14.778 -> 14
      expect(calculateArmorDamage(50000, 1000)).toBe(Math.floor(50000 * (15 / 1015)));
    });

    it('Armor = -15: amplifies raw damage symmetrically (1 + |-15|/15 = 2.0x)', () => {
      expect(calculateArmorDamage(1, -15)).toBe(2);
      expect(calculateArmorDamage(10, -15)).toBe(20);
      expect(calculateArmorDamage(20, -15)).toBe(40);
      expect(calculateArmorDamage(100, -15)).toBe(200);
    });

    it('Negative armor edge cases: severe vulnerability scaling and zero raw damage handling', () => {
      // Armor = -30: 1 + 30/15 = 3.0x
      expect(calculateArmorDamage(25, -30)).toBe(75);
      // Armor = -150: 1 + 150/15 = 11.0x
      expect(calculateArmorDamage(10, -150)).toBe(110);

      // Raw damage <= 0 never deals damage, even with negative armor
      expect(calculateArmorDamage(0, -15)).toBe(0);
      expect(calculateArmorDamage(-5, -15)).toBe(0);
      expect(calculateArmorDamage(0, 1000)).toBe(0);
    });

    it('Monotonicity stress test: damage taken decreases monotonically as armor increases', () => {
      const rawDamage = 500;
      let prevDamage = calculateArmorDamage(rawDamage, -100);

      for (let armor = -99; armor <= 1000; armor += 5) {
        const currentDamage = calculateArmorDamage(rawDamage, armor);
        expect(currentDamage).toBeLessThanOrEqual(prevDamage);
        expect(currentDamage).toBeGreaterThanOrEqual(1);
        prevDamage = currentDamage;
      }
    });

    it('Random fuzz testing across 10,000 arbitrary damage and armor values', () => {
      for (let i = 0; i < 10000; i++) {
        const raw = Math.floor(Math.random() * 1000);
        const armor = Math.floor(Math.random() * 2000) - 500; // [-500, 1500]
        const dmg = calculateArmorDamage(raw, armor);

        if (raw <= 0) {
          expect(dmg).toBe(0);
        } else {
          expect(dmg).toBeGreaterThanOrEqual(1);
          if (armor >= 0) {
            expect(dmg).toBeLessThanOrEqual(raw);
          } else {
            expect(dmg).toBeGreaterThanOrEqual(raw);
          }
        }
      }
    });
  });

  // =========================================================================
  // 2. Attack Speed Cooldown Formula & Clamping Limits
  // =========================================================================
  describe('2. Attack Speed Cooldown Formula & Clamping Limits', () => {
    it('Attack Speed = 0%: returns exact base cooldown T0', () => {
      expect(calculateAttackCooldown(1000, 0)).toBe(1000);
      expect(calculateAttackCooldown(600, 0)).toBe(600);
      expect(calculateAttackCooldown(250, 0)).toBe(250);
    });

    it('Attack Speed = 100%: halves attack cooldown (T0 / 2)', () => {
      expect(calculateAttackCooldown(1000, 100)).toBe(500);
      expect(calculateAttackCooldown(400, 100)).toBe(200);
      expect(calculateAttackCooldown(250, 100)).toBe(125);
    });

    it('Attack Speed = 10,000%: strictly clamped at 12 hits/s (83.33ms)', () => {
      // 1000 * (100 / 10100) = 9.90ms -> clamped to 83.33ms
      expect(calculateAttackCooldown(1000, 10000)).toBe(83.33);
      expect(calculateAttackCooldown(500, 10000)).toBe(83.33);
      expect(calculateAttackCooldown(100, 10000)).toBe(83.33);
    });

    it('Cooldown rate limit: attack rate never exceeds 12 hits/second for any positive attack speed', () => {
      const baseCooldowns = [50, 100, 200, 500, 1000, 2500];
      const attackSpeeds = [0, 25, 50, 100, 200, 500, 1000, 5000, 10000, 100000];

      for (const t0 of baseCooldowns) {
        for (const as of attackSpeeds) {
          const cd = calculateAttackCooldown(t0, as);
          expect(cd).toBeGreaterThanOrEqual(83.33);
          const hitsPerSecond = 1000 / cd;
          expect(hitsPerSecond).toBeLessThanOrEqual(12.01); // 1000 / 83.33 = 12.00048...
        }
      }
    });

    it('Negative Attack Speed clamping: clamped to -90% to avoid division by zero or negative cooldowns', () => {
      // Base 1000ms at -90% -> 1000 * (100 / 10) = 10,000ms
      expect(calculateAttackCooldown(1000, -90)).toBe(10000);
      // Below -90% remains clamped to 10,000ms
      expect(calculateAttackCooldown(1000, -95)).toBe(10000);
      expect(calculateAttackCooldown(1000, -100)).toBe(10000);
      expect(calculateAttackCooldown(1000, -500)).toBe(10000);
      expect(calculateAttackCooldown(1000, -10000)).toBe(10000);
    });

    it('Fuzz testing across 10,000 arbitrary base cooldowns and attack speeds', () => {
      for (let i = 0; i < 10000; i++) {
        const base = Math.random() * 5000 + 10; // [10, 5010]
        const as = Math.random() * 20000 - 1000; // [-1000, 19000]
        const cd = calculateAttackCooldown(base, as);

        expect(cd).toBeGreaterThanOrEqual(83.33);
        expect(Number.isFinite(cd)).toBe(true);
        expect(Number.isNaN(cd)).toBe(false);
      }
    });
  });

  // =========================================================================
  // 3. Dodge Clamping & Statistical Probability
  // =========================================================================
  describe('3. Dodge Clamping & Statistical Probability', () => {
    it('Dodge = 90%: effective dodge strictly clamped to 60%', () => {
      expect(calculateEffectiveDodgeMath(90)).toBe(60);
      expect(calculateEffectiveDodgeEngine(90)).toBe(60);

      // Extreme positive bonus clamping
      expect(calculateEffectiveDodgeMath(100)).toBe(60);
      expect(calculateEffectiveDodgeMath(500)).toBe(60);
      expect(calculateEffectiveDodgeEngine(1000)).toBe(60);
    });

    it('Dodge = -20%: negative dodge strictly clamped to 0%', () => {
      expect(calculateEffectiveDodgeMath(-20)).toBe(0);
      expect(calculateEffectiveDodgeEngine(-20)).toBe(0);

      // Extreme negative dodge clamping
      expect(calculateEffectiveDodgeMath(-1)).toBe(0);
      expect(calculateEffectiveDodgeMath(-100)).toBe(0);
      expect(calculateEffectiveDodgeEngine(-500)).toBe(0);
    });

    it('Dodge avoidance roll mechanics: 0 damage on dodge success, raw damage on dodge failure', () => {
      // Deterministic RNG: always rolls 30
      const roll30 = () => 0.3; // 30% roll
      const dodged = rollDodgeEngine(50, 40, { x: 100, y: 100 }, roll30);
      expect(dodged.isDodged).toBe(true);
      expect(dodged.finalDamage).toBe(0);
      expect(dodged.visualAlert?.text).toBe('DODGE!');

      // Deterministic RNG: always rolls 70
      const roll70 = () => 0.7; // 70% roll
      const failed = rollDodgeEngine(50, 40, { x: 100, y: 100 }, roll70);
      expect(failed.isDodged).toBe(false);
      expect(failed.finalDamage).toBe(50);
      expect(failed.visualAlert).toBeUndefined();
    });

    it('Empirical Monte Carlo roll verification over 100,000 trials', () => {
      // A. Test with 90% dodge (clamped to 60%)
      const trials = 100000;
      let dodgesAt90 = 0;
      for (let i = 0; i < trials; i++) {
        if (rollDodgeMath(90)) {
          dodgesAt90++;
        }
      }
      const rateAt90 = (dodgesAt90 / trials) * 100;
      // 4 sigma range for N=100k, p=0.6: 60% +- 0.62%
      expect(rateAt90).toBeGreaterThanOrEqual(59.0);
      expect(rateAt90).toBeLessThanOrEqual(61.0);

      // B. Test with -20% dodge (clamped to 0%)
      let dodgesAtNeg20 = 0;
      for (let i = 0; i < trials; i++) {
        if (rollDodgeMath(-20)) {
          dodgesAtNeg20++;
        }
      }
      expect(dodgesAtNeg20).toBe(0);

      // C. DodgeTracker test with engine rolls
      const tracker = new DodgeTracker();
      for (let i = 0; i < 1000; i++) {
        const res = rollDodgeEngine(20, 90);
        tracker.registerRoll(res);
      }
      expect(tracker.totalIncomingHits).toBe(1000);
      expect(tracker.getRealizedDodgeRate()).toBeGreaterThanOrEqual(55);
      expect(tracker.getRealizedDodgeRate()).toBeLessThanOrEqual(65);
    });
  });

  // =========================================================================
  // 4. Life Steal 0.10s (100ms) Internal Cooldown on Rapid Hits
  // =========================================================================
  describe('4. Life Steal 0.10s (100ms) Internal Cooldown on Rapid Consecutive Hits', () => {
    it('Rapid multi-hits within 0.05s (50ms) trigger at most 1 heal event per 0.10s (100ms)', () => {
      const tracker = new LifeStealTracker();
      const lifeStealPercent = 100; // 100% chance for test determinism
      const roll = 0; // guaranteed roll < 100%

      // Hit 1 at t = 0ms -> Heals
      expect(tracker.attemptHeal(0, roll, lifeStealPercent)).toBe(true);

      // Hit 2 at t = 50ms (0.05s later) -> REJECTED (ICD active)
      expect(tracker.attemptHeal(50, roll, lifeStealPercent)).toBe(false);

      // Hit 3 at t = 90ms (0.09s later) -> REJECTED (ICD active)
      expect(tracker.attemptHeal(90, roll, lifeStealPercent)).toBe(false);

      // Hit 4 at t = 99ms -> REJECTED (ICD active)
      expect(tracker.attemptHeal(99, roll, lifeStealPercent)).toBe(false);

      // Hit 5 at t = 100ms (exactly 0.10s / 100ms later) -> HEALS
      expect(tracker.attemptHeal(100, roll, lifeStealPercent)).toBe(true);

      // Hit 6 at t = 150ms (0.05s later) -> REJECTED
      expect(tracker.attemptHeal(150, roll, lifeStealPercent)).toBe(false);

      // Hit 7 at t = 200ms (0.10s after Hit 5) -> HEALS
      expect(tracker.attemptHeal(200, roll, lifeStealPercent)).toBe(true);
    });

    it('Stress test: 200 consecutive hits spaced by 10ms (2.0s duration) yields exactly 20 heals (10 heals/s cap)', () => {
      const tracker = new LifeStealTracker();
      let totalHeals = 0;
      const healTimestamps: number[] = [];

      for (let t = 0; t < 2000; t += 10) {
        if (tracker.attemptHeal(t, 0, 100)) {
          totalHeals++;
          healTimestamps.push(t);
        }
      }

      // In 2000ms at 100ms intervals (t = 0, 100, 200, ..., 1900):
      // There are exactly 20 intervals: 0, 100, 200, ..., 1900
      expect(totalHeals).toBe(20);

      // Verify that every heal interval is at least 100ms apart
      for (let i = 1; i < healTimestamps.length; i++) {
        const interval = healTimestamps[i] - healTimestamps[i - 1];
        expect(interval).toBeGreaterThanOrEqual(100);
      }
    });

    it('Simultaneous frame multi-hit cleave: 100 simultaneous hits in a single frame trigger at most 1 heal', () => {
      const tracker = new LifeStealTracker();
      let simultaneousHeals = 0;
      const frameTimestamp = 5000;

      for (let i = 0; i < 100; i++) {
        if (tracker.attemptHeal(frameTimestamp, 0, 100)) {
          simultaneousHeals++;
        }
      }

      expect(simultaneousHeals).toBe(1);
    });

    it('Failed RNG roll does not contaminate or reset the ICD window', () => {
      const tracker = new LifeStealTracker();
      const lifeStealPercent = 20;

      // t = 1000: Roll 50 (fails: 50 >= 20) -> should NOT trigger ICD
      expect(tracker.attemptHeal(1000, 50, lifeStealPercent)).toBe(false);

      // t = 1010 (10ms later): Roll 5 (succeeds: 5 < 20) -> MUST HEAL because previous roll was not a heal!
      expect(tracker.attemptHeal(1010, 5, lifeStealPercent)).toBe(true);

      // t = 1020: Roll 5 (succeeds: 5 < 20) -> REJECTED because ICD is active from t = 1010
      expect(tracker.attemptHeal(1020, 5, lifeStealPercent)).toBe(false);

      // t = 1110 (100ms after 1010): Roll 5 -> HEALS
      expect(tracker.attemptHeal(1110, 5, lifeStealPercent)).toBe(true);
    });

    it('Tracker reset clears ICD state completely', () => {
      const tracker = new LifeStealTracker();
      expect(tracker.attemptHeal(1000, 0, 100)).toBe(true);
      expect(tracker.attemptHeal(1050, 0, 100)).toBe(false);

      tracker.reset();
      expect(tracker.attemptHeal(1050, 0, 100)).toBe(true);
    });
  });

  // =========================================================================
  // 5. Weapon Damage Pipeline & HP Regen Interval Edge Cases
  // =========================================================================
  describe('5. Weapon Damage Pipeline & HP Regen Interval Edge Cases', () => {
    it('Weapon damage pipeline enforces 1 damage floor regardless of negative damage stats', () => {
      // baseDamage 10, scaling -50, dmgPercent -99% -> floor is still 1
      expect(calculateWeaponDamage(10, -50, 1, -99, false, 1.5)).toBe(1);
      expect(calculateWeaponDamage(0, 0, 1, -90, false, 1.5)).toBe(1);
    });

    it('HP Regen interval returns Infinity when regen <= 0', () => {
      expect(calculateHpRegenInterval(0)).toBe(Infinity);
      expect(calculateHpRegenInterval(-5)).toBe(Infinity);
      // Regen = 1: 5.0 / (1 + 0/2.25) = 5.0 seconds
      expect(calculateHpRegenInterval(1)).toBe(5.0);
      // Regen = 10: 5.0 / (1 + 9/2.25) = 5.0 / (1 + 4) = 1.0 second
      expect(calculateHpRegenInterval(10)).toBe(1.0);
    });
  });
});
