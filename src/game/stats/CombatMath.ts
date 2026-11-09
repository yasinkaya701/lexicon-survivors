/**
 * CombatMath.ts
 * Authoritative Brotato RPG Combat Math & Stat Scaling Engine
 *
 * Implements unified damage pipeline, hyperbolic armor reduction,
 * attack speed scaling, dodge clamping, HP regeneration intervals,
 * life steal ICD tracking, range scaling, harvesting compounding,
 * and luck drop probabilities.
 */

import type { PlayerRPGStats, WeaponBlueprint } from '@/types/brotato';

/**
 * 1. Unified Outgoing Weapon Damage Pipeline
 *
 * Formula:
 * 1. Scaled = BaseDamage + ScalingStatValue * ScalingRatio
 * 2. Modified = Scaled * (1 + DamagePercent / 100)
 * 3. Crit = isCrit ? Modified * CritMultiplier : Modified
 * 4. Floor = max(1, floor(Crit))
 */
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

/**
 * Rolls for critical strike based on effective critical chance percentage.
 */
export function rollCriticalStrike(critChancePercent: number, rng: () => number = Math.random): boolean {
  const clampedChance = Math.min(100, Math.max(0, critChancePercent));
  return rng() * 100 < clampedChance;
}

/**
 * 2. Hyperbolic Armor Damage Reduction / Amplification
 *
 * Positive Armor (>= 0):
 *   D_taken = max(1, floor(D_raw * (15 / (15 + Armor))))
 *
 * Negative Armor (< 0):
 *   D_taken = floor(D_raw * (1 + |Armor| / 15))
 */
export function calculateArmorDamage(rawDamage: number, armor: number): number {
  if (rawDamage <= 0) return 0;
  if (armor >= 0) {
    return Math.max(1, Math.floor(rawDamage * (15 / (15 + armor))));
  }
  return Math.max(1, Math.floor(rawDamage * (1 + Math.abs(armor) / 15)));
}

/**
 * 3. Attack Speed Cooldown Formula
 *
 * Formula:
 *   T = max(83.33, T0 * (100 / (100 + max(-90, AS))))
 *
 * Rate is capped at 12 hits/second (83.33ms).
 * Negative AS is clamped at -90% to prevent division by zero or negative cooldown.
 */
export function calculateAttackCooldown(baseCooldownMs: number, attackSpeedPercent: number): number {
  const effectiveAS = Math.max(-90, attackSpeedPercent);
  const cooldown = baseCooldownMs * (100 / (100 + effectiveAS));
  return Math.max(83.33, Math.round(cooldown * 100) / 100);
}

/**
 * 4. Dodge Avoidance Roll & Clamping
 *
 * Strictly clamped to [0%, 60%].
 */
export function calculateEffectiveDodge(dodgePercent: number): number {
  return Math.min(60, Math.max(0, dodgePercent));
}

export function rollDodge(dodgePercent: number, rng: () => number = Math.random): boolean {
  const effective = calculateEffectiveDodge(dodgePercent);
  return rng() * 100 < effective;
}

/**
 * 5. HP Regeneration Interval
 *
 * Formula:
 *   Interval (seconds) = 5.0 / (1.0 + (Regen - 1) / 2.25)
 *
 * When Regen <= 0, returns Infinity (regeneration is disabled).
 */
export function calculateHpRegenInterval(hpRegen: number): number {
  if (hpRegen <= 0) return Infinity;
  return 5.0 / (1.0 + (hpRegen - 1) / 2.25);
}

/**
 * 6. Life Steal On-Hit Tracker with 0.10s (100ms) Internal Cooldown
 *
 * Enforces a strict 10 HP/second cap, rejecting rapid hits within 100ms.
 */
export class LifeStealTracker {
  private lastTriggerMs: number = -Infinity;
  readonly icdMs: number = 100; // 0.10s ICD

  public attemptHeal(currentMs: number, roll: number, lifeStealPercent: number): boolean {
    if (roll >= lifeStealPercent) return false;
    if (currentMs - this.lastTriggerMs < this.icdMs) return false;
    this.lastTriggerMs = currentMs;
    return true;
  }

  public reset(): void {
    this.lastTriggerMs = -Infinity;
  }
}

/**
 * 7. Melee vs Ranged Weapon Range Scaling
 *
 * Ranged weapons scale 100% with Range stat.
 * Melee weapons scale 50% with Range stat.
 * Minimum weapon range is clamped to 25px.
 */
export function calculateEffectiveRange(baseRange: number, rangeStat: number, isRanged: boolean): number {
  const scaled = isRanged ? baseRange + rangeStat : baseRange + 0.5 * rangeStat;
  return Math.max(25, Math.floor(scaled));
}

/**
 * 8. Harvesting Compound Economy Growth
 *
 * Payout = currentHarvesting
 * Growth = ceil(currentHarvesting * 0.05)
 */
export function compoundHarvesting(currentHarvesting: number): { payout: number; newHarvesting: number } {
  if (currentHarvesting <= 0) {
    return { payout: 0, newHarvesting: 0 };
  }
  const payout = currentHarvesting;
  const growth = Math.ceil(currentHarvesting * 0.05);
  return {
    payout,
    newHarvesting: currentHarvesting + growth,
  };
}

/**
 * 9. Luck Drop Probability Scaling
 *
 * Scales base drop probability by (1 + Luck / 100).
 * Clamped to [0.0, 1.0].
 */
export function calculateDropChance(baseChance: number, luck: number): number {
  const eff = baseChance * (1 + Math.max(-100, luck) / 100);
  return Math.min(1.0, Math.max(0, Math.round(eff * 10000) / 10000));
}

/**
 * 10. Helper: Resolve scaling stat value from PlayerRPGStats
 */
export function getScalingStatValue(stats: PlayerRPGStats, statName: WeaponBlueprint['scalingStat']): number {
  switch (statName) {
    case 'meleeDamage':
      return stats.meleeDamage;
    case 'rangedDamage':
      return stats.rangedDamage;
    case 'elementalDamage':
      return stats.elementalDamage;
    case 'engineering':
      return stats.engineering;
    default:
      return 0;
  }
}
