/**
 * WeaponCatalog.ts
 * Authoritative Catalog of all 7 Brotato Weapons across Tiers 1 to 4 (28 Blueprints).
 *
 * Ranged:
 * 1. Pistol (Projectile, Pierce 1, Ranged Damage Scaling)
 * 2. Shotgun (Spread Cone, Pellet Count, Ranged Damage Scaling)
 * 3. SMG (Rapid-fire Projectile, High AS, Ranged Damage Scaling)
 * 4. Magic Wand (Arcane Projectile, Ricochet Bounce, Elemental Damage Scaling)
 *
 * Melee:
 * 5. Knife (Linear Thrust, High Crit Chance, Melee Damage Scaling)
 * 6. Sword (120-degree Melee Swing Cleave, Melee Damage Scaling)
 * 7. Wrench (Melee Swing, High Knockback, Engineering Scaling)
 */

import type { WeaponBlueprint, WeaponTier, WeaponType, WeaponSubtype, WeaponScalingStat } from '@/types/brotato';

export const BASE_PRICES: Record<WeaponTier, number> = {
  1: 20,
  2: 42,
  3: 75,
  4: 120,
};

export const TIER_NAMES: Record<WeaponTier, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
};

export interface BaseWeaponDefinition {
  baseId: string;
  name: string;
  type: WeaponType;
  subtype: WeaponSubtype;
  scalingStat: WeaponScalingStat;
  scalingRatio: number;
  baseDamage: number;
  baseCooldownMs: number;
  baseRange: number;
  critChance: number;
  critMultiplier: number;
  knockback: number;
  pierce: number;
  bounce: number;
  projectileSpeed?: number;
  pelletCount?: number;
  spreadAngleDeg?: number;
  arcAngleDeg?: number;
  spriteName: string;
  description: string;
}

export const BASE_WEAPONS: Record<string, BaseWeaponDefinition> = {
  pistol: {
    baseId: 'pistol',
    name: 'Pistol',
    type: 'ranged',
    subtype: 'projectile',
    scalingStat: 'rangedDamage',
    scalingRatio: 1.0,
    baseDamage: 12,
    baseCooldownMs: 800,
    baseRange: 360,
    critChance: 0.12,
    critMultiplier: 2.0,
    knockback: 12,
    pierce: 1,
    bounce: 0,
    projectileSpeed: 800,
    spriteName: 'weapon_pistol',
    description: 'Reliable single-shot firearm with built-in pierce.',
  },
  shotgun: {
    baseId: 'shotgun',
    name: 'Shotgun',
    type: 'ranged',
    subtype: 'spread',
    scalingStat: 'rangedDamage',
    scalingRatio: 0.6,
    baseDamage: 5,
    baseCooldownMs: 850,
    baseRange: 300,
    critChance: 0.08,
    critMultiplier: 1.75,
    knockback: 20,
    pierce: 0,
    bounce: 0,
    projectileSpeed: 700,
    pelletCount: 4,
    spreadAngleDeg: 28,
    spriteName: 'weapon_shotgun',
    description: 'Fires a wide cone of pellets, devastating at close quarters.',
  },
  smg: {
    baseId: 'smg',
    name: 'SMG',
    type: 'ranged',
    subtype: 'projectile',
    scalingStat: 'rangedDamage',
    scalingRatio: 0.4,
    baseDamage: 3,
    baseCooldownMs: 130,
    baseRange: 280,
    critChance: 0.06,
    critMultiplier: 1.5,
    knockback: 3,
    pierce: 0,
    bounce: 0,
    projectileSpeed: 850,
    spriteName: 'weapon_smg',
    description: 'Rapid-fire submachine gun. Shreds through high attack speed.',
  },
  wand: {
    baseId: 'wand',
    name: 'Magic Wand',
    type: 'ranged',
    subtype: 'projectile',
    scalingStat: 'elementalDamage',
    scalingRatio: 1.0,
    baseDamage: 10,
    baseCooldownMs: 580,
    baseRange: 340,
    critChance: 0.08,
    critMultiplier: 1.75,
    knockback: 8,
    pierce: 0,
    bounce: 1,
    projectileSpeed: 650,
    spriteName: 'weapon_wand',
    description: 'Shoots arcane energy that ricochets between adjacent targets.',
  },
  knife: {
    baseId: 'knife',
    name: 'Knife',
    type: 'melee',
    subtype: 'thrust',
    scalingStat: 'meleeDamage',
    scalingRatio: 0.8,
    baseDamage: 8,
    baseCooldownMs: 340,
    baseRange: 125,
    critChance: 0.20,
    critMultiplier: 2.0,
    knockback: 5,
    pierce: 0,
    bounce: 0,
    spriteName: 'weapon_knife',
    description: 'Fast, precise thrust with high critical strike chance.',
  },
  sword: {
    baseId: 'sword',
    name: 'Sword',
    type: 'melee',
    subtype: 'swing',
    scalingStat: 'meleeDamage',
    scalingRatio: 1.0,
    baseDamage: 15,
    baseCooldownMs: 580,
    baseRange: 150,
    critChance: 0.10,
    critMultiplier: 1.75,
    knockback: 15,
    pierce: 0,
    bounce: 0,
    arcAngleDeg: 120,
    spriteName: 'weapon_sword',
    description: 'Broad sweeping blade hitting all enemies in a 120° arc.',
  },
  wrench: {
    baseId: 'wrench',
    name: 'Wrench',
    type: 'melee',
    subtype: 'swing',
    scalingStat: 'engineering',
    scalingRatio: 1.0,
    baseDamage: 12,
    baseCooldownMs: 500,
    baseRange: 135,
    critChance: 0.08,
    critMultiplier: 1.5,
    knockback: 14,
    pierce: 0,
    bounce: 0,
    arcAngleDeg: 95,
    spriteName: 'weapon_wrench',
    description: 'Blunt tool scaling with Engineering; strikes hard and knocks foes back.',
  },
};

/**
 * Computes Tier-scaled blueprint from Tier 1 base definition.
 * Scaling multipliers (from tests/unit/shop_economy.test.ts:142-145):
 * - Damage: * 1.35 per tier step
 * - Cooldown: * 0.90 per tier step
 * - Crit Chance: + 0.05 per tier step
 * - Knockback: * 1.15 per tier step
 */
export function buildTierBlueprint(base: BaseWeaponDefinition, tier: WeaponTier): WeaponBlueprint {
  const steps = tier - 1;
  const dmgMultiplier = Math.pow(1.35, steps);
  const cdMultiplier = Math.pow(0.90, steps);
  const kbMultiplier = Math.pow(1.15, steps);

  const baseDamage = Math.round(base.baseDamage * dmgMultiplier * 10) / 10;
  const baseCooldownMs = Math.round(base.baseCooldownMs * cdMultiplier * 10) / 10;
  const critChance = Math.round((base.critChance + 0.05 * steps) * 100) / 100;
  const knockback = Math.round(base.knockback * kbMultiplier * 10) / 10;

  // Extra tier bonuses for specific archetypes
  let pierce = base.pierce;
  let bounce = base.bounce;
  let pelletCount = base.pelletCount;
  let baseRange = base.baseRange;
  let critMultiplier = base.critMultiplier;

  if (tier >= 3) {
    if (base.baseId === 'pistol') pierce = 2;
    if (base.baseId === 'wand') bounce = 2;
  }
  if (tier === 4) {
    if (base.baseId === 'smg') pierce = 1;
    if (base.baseId === 'wand') pierce = 1;
    critMultiplier += 0.25;
  }
  if (pelletCount !== undefined) {
    pelletCount += steps; // +1 pellet per tier for shotgun
  }
  if (base.type === 'melee') {
    baseRange += steps * 5; // slight reach expansion on higher melee tiers
  }

  return {
    id: `${base.baseId}_${tier}`,
    name: `${base.name} ${TIER_NAMES[tier]}`,
    type: base.type,
    subtype: base.subtype,
    tier,
    baseDamage,
    scalingStat: base.scalingStat,
    scalingRatio: base.scalingRatio,
    baseCooldownMs,
    baseRange,
    critChance,
    critMultiplier,
    knockback,
    pierce,
    bounce,
    projectileSpeed: base.projectileSpeed ? base.projectileSpeed + steps * 30 : undefined,
    pelletCount,
    spreadAngleDeg: base.spreadAngleDeg ? base.spreadAngleDeg + steps * 2 : undefined,
    arcAngleDeg: base.arcAngleDeg ? base.arcAngleDeg + (tier >= 3 ? 5 : 0) : undefined,
    spriteName: base.spriteName,
    description: base.description,
    basePrice: BASE_PRICES[tier],
  };
}

/** Precomputed 28 Weapon Blueprints Registry */
export const WEAPON_REGISTRY: Record<string, WeaponBlueprint> = {};

// Initialize registry
for (const baseId in BASE_WEAPONS) {
  const base = BASE_WEAPONS[baseId];
  for (let t = 1; t <= 4; t++) {
    const tier = t as WeaponTier;
    const bp = buildTierBlueprint(base, tier);
    WEAPON_REGISTRY[bp.id] = bp;
  }
}

/** Query helpers */
export function getWeaponBlueprint(id: string): WeaponBlueprint | undefined {
  return WEAPON_REGISTRY[id];
}

export function getWeaponByBaseAndTier(baseId: string, tier: WeaponTier): WeaponBlueprint | undefined {
  return WEAPON_REGISTRY[`${baseId}_${tier}`];
}

export function getAllWeaponBlueprints(): WeaponBlueprint[] {
  return Object.values(WEAPON_REGISTRY);
}

export function getWeaponsByTier(tier: WeaponTier): WeaponBlueprint[] {
  return Object.values(WEAPON_REGISTRY).filter((w) => w.tier === tier);
}

export function getWeaponsByType(type: WeaponType): WeaponBlueprint[] {
  return Object.values(WEAPON_REGISTRY).filter((w) => w.type === type);
}
