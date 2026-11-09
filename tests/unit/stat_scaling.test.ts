import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Authoritative Stat Scaling & Enemy Wave Formulas from PROJECT.md
 */

export type EnemyType = 'swarmer' | 'rusher' | 'tank' | 'ranged' | 'elite';

export interface EnemyBaseConfig {
  type: EnemyType;
  baseHp: number;
  hpPerWave: number;
  baseDmg: number;
  dmgPerWave: number;
  baseSpeed: number;
}

export const ENEMY_ARCHETYPES: Record<EnemyType, EnemyBaseConfig> = {
  swarmer: { type: 'swarmer', baseHp: 3, hpPerWave: 2.0, baseDmg: 1, dmgPerWave: 0.6, baseSpeed: 160 },
  rusher: { type: 'rusher', baseHp: 2, hpPerWave: 1.2, baseDmg: 1, dmgPerWave: 0.6, baseSpeed: 260 },
  tank: { type: 'tank', baseHp: 22, hpPerWave: 10.0, baseDmg: 3, dmgPerWave: 1.5, baseSpeed: 90 },
  ranged: { type: 'ranged', baseHp: 6, hpPerWave: 3.0, baseDmg: 2, dmgPerWave: 0.8, baseSpeed: 120 },
  elite: { type: 'elite', baseHp: 350, hpPerWave: 160.0, baseDmg: 5, dmgPerWave: 2.5, baseSpeed: 130 },
};

export function calculateEnemyStats(type: EnemyType, wave: number, dangerMultiplier = 1.0): { hp: number; dmg: number; speed: number } {
  const config = ENEMY_ARCHETYPES[type];
  const waveOffset = Math.max(0, wave - 1);
  const hp = (config.baseHp + config.hpPerWave * waveOffset) * dangerMultiplier;
  const dmg = (config.baseDmg + config.dmgPerWave * waveOffset) * dangerMultiplier;
  return {
    hp: Math.round(hp * 10) / 10,
    dmg: Math.round(dmg * 10) / 10,
    speed: config.baseSpeed,
  };
}

export function calculateWaveDuration(wave: number): number {
  if (wave >= 20) return 90;
  if (wave >= 9) return 60;
  return 20 + (wave - 1) * 5;
}

export function calculateSpawnRate(baseRate: number, wave: number, timeSec: number): number {
  const waveScaling = 1 + wave * 0.20;
  const pulseFactor = 1 + 0.5 * Math.sin((2 * Math.PI * timeSec) / 15);
  return Math.round(baseRate * waveScaling * pulseFactor * 100) / 100;
}

export function calculateWeaponDamage(
  baseDamage: number,
  scalingStatValue: number,
  scalingRatio: number,
  damagePercent: number,
  isCrit: boolean,
  critMultiplier: number
): number {
  const scaled = baseDamage + scalingStatValue * scalingRatio;
  const modified = scaled * (1 + damagePercent / 100);
  const finalDamage = isCrit ? modified * critMultiplier : modified;
  return Math.max(1, Math.floor(finalDamage));
}

export function calculateEffectiveRange(baseRange: number, rangeStat: number, isRanged: boolean): number {
  const scaledRange = isRanged ? baseRange + rangeStat : baseRange + 0.5 * rangeStat;
  return Math.max(25, Math.floor(scaledRange));
}

export function calculateDropChance(baseChance: number, luck: number): number {
  const eff = baseChance * (1 + Math.max(-100, luck) / 100);
  return Math.min(1.0, Math.max(0, Math.round(eff * 10000) / 10000));
}

describe('Stat Scaling Specification Verification', () => {
  describe('Enemy Wave Progression Scaling', () => {
    it('scales Swarmer stats across waves 1, 5, 10, 20', () => {
      // Wave 1: 3 HP, 1 Dmg
      const w1 = calculateEnemyStats('swarmer', 1);
      assert.equal(w1.hp, 3);
      assert.equal(w1.dmg, 1);
      assert.equal(w1.speed, 160);

      // Wave 5: 3 + 2.0 * 4 = 11 HP, 1 + 0.6 * 4 = 3.4 Dmg
      const w5 = calculateEnemyStats('swarmer', 5);
      assert.equal(w5.hp, 11);
      assert.equal(w5.dmg, 3.4);

      // Wave 10: 3 + 2.0 * 9 = 21 HP, 1 + 0.6 * 9 = 6.4 Dmg
      const w10 = calculateEnemyStats('swarmer', 10);
      assert.equal(w10.hp, 21);
      assert.equal(w10.dmg, 6.4);

      // Wave 20: 3 + 2.0 * 19 = 41 HP, 1 + 0.6 * 19 = 12.4 Dmg
      const w20 = calculateEnemyStats('swarmer', 20);
      assert.equal(w20.hp, 41);
      assert.equal(w20.dmg, 12.4);
    });

    it('scales Heavy Tank / Charger stats across waves', () => {
      // Wave 1: 22 HP, 3 Dmg
      const w1 = calculateEnemyStats('tank', 1);
      assert.equal(w1.hp, 22);
      assert.equal(w1.dmg, 3);
      assert.equal(w1.speed, 90);

      // Wave 10: 22 + 10 * 9 = 112 HP, 3 + 1.5 * 9 = 16.5 Dmg
      const w10 = calculateEnemyStats('tank', 10);
      assert.equal(w10.hp, 112);
      assert.equal(w10.dmg, 16.5);
    });

    it('scales Elite Boss health and damage pools', () => {
      // Wave 11 Elite: 350 + 160 * 10 = 1950 HP, 5 + 2.5 * 10 = 30 Dmg
      const w11 = calculateEnemyStats('elite', 11);
      assert.equal(w11.hp, 1950);
      assert.equal(w11.dmg, 30);

      // Wave 20 Final Boss: 350 + 160 * 19 = 3390 HP, 5 + 2.5 * 19 = 52.5 Dmg
      const w20 = calculateEnemyStats('elite', 20);
      assert.equal(w20.hp, 3390);
      assert.equal(w20.dmg, 52.5);
    });
  });

  describe('Wave Pacing & Spawn Dynamics', () => {
    it('verifies 20-wave duration escalation table', () => {
      assert.equal(calculateWaveDuration(1), 20);
      assert.equal(calculateWaveDuration(2), 25);
      assert.equal(calculateWaveDuration(3), 30);
      assert.equal(calculateWaveDuration(8), 55);
      assert.equal(calculateWaveDuration(9), 60);
      assert.equal(calculateWaveDuration(15), 60);
      assert.equal(calculateWaveDuration(19), 60);
      assert.equal(calculateWaveDuration(20), 90);
    });

    it('modulates spawn rates with rhythmic 15-second cycles', () => {
      // At t = 0 (sin(0) = 0), pulse factor = 1.0
      // BaseRate 2.0 at Wave 5: 2.0 * (1 + 5 * 0.20) * 1.0 = 2.0 * 2.0 = 4.0
      const rateT0 = calculateSpawnRate(2.0, 5, 0);
      assert.equal(rateT0, 4.0);

      // At peak of pulse (t = 15/4 = 3.75s, sin(pi/2) = 1), pulse factor = 1.5
      // 4.0 * 1.5 = 6.0
      const ratePeak = calculateSpawnRate(2.0, 5, 3.75);
      assert.equal(ratePeak, 6.0);

      // At trough of pulse (t = 45/4 = 11.25s, sin(3pi/2) = -1), pulse factor = 0.5
      // 4.0 * 0.5 = 2.0
      const rateTrough = calculateSpawnRate(2.0, 5, 11.25);
      assert.equal(rateTrough, 2.0);
    });
  });

  describe('Weapon Damage & Range Scaling Resolution', () => {
    it('resolves flat stat scaling and percent damage modifications', () => {
      // Base 10, MeleeDamage +5, Scaling 1.0 -> 15. DamagePercent +20% -> 18
      const dmg = calculateWeaponDamage(10, 5, 1.0, 20, false, 1.5);
      assert.equal(dmg, 18);
    });

    it('resolves critical hit multiplier', () => {
      // Base 10, +5 stat, +20% dmg -> 18. Crit 2.0x -> 36
      const dmgCrit = calculateWeaponDamage(10, 5, 1.0, 20, true, 2.0);
      assert.equal(dmgCrit, 36);
    });

    it('enforces 1 damage floor on heavily penalised attacks', () => {
      const dmg = calculateWeaponDamage(2, -10, 1.0, -80, false, 1.5);
      assert.equal(dmg, 1);
    });

    it('scales range 100% for ranged weapons and 50% for melee weapons', () => {
      // Ranged Pistol: Base 300, Range +60 -> 360
      assert.equal(calculateEffectiveRange(300, 60, true), 360);

      // Melee Sword: Base 120, Range +60 -> 120 + 30 = 150
      assert.equal(calculateEffectiveRange(120, 60, false), 150);
    });

    it('strictly clamps minimum weapon range to 25px even under severe negative range', () => {
      assert.equal(calculateEffectiveRange(50, -100, false), 25);
      assert.equal(calculateEffectiveRange(100, -200, true), 25);
    });
  });

  describe('Luck Drop Probability Scaling', () => {
    it('multiplies base drop chance by Luck factor', () => {
      // Fruit drop: Base 0.01 (1%). Luck +50% -> 0.01 * 1.5 = 0.015 (1.5%)
      assert.equal(calculateDropChance(0.01, 50), 0.015);

      // Crate drop: Base 0.005 (0.5%). Luck +100% -> 0.005 * 2.0 = 0.01 (1.0%)
      assert.equal(calculateDropChance(0.005, 100), 0.01);
    });

    it('caps drop probability at 100%', () => {
      assert.equal(calculateDropChance(0.8, 100), 1.0);
    });

    it('clamps negative luck from causing negative drop probabilities', () => {
      assert.equal(calculateDropChance(0.01, -150), 0);
    });
  });
});
