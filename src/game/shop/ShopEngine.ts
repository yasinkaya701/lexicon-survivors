/**
 * ShopEngine.ts - Pure TypeScript Shop Generation, Price Inflation, Reroll & Fusion Engine
 *
 * Implements:
 * 1. 4-slot shop generation with wave tier probabilities and Luck scaling.
 * 2. Wave price inflation formula: Base + 1 + floor(Base * 0.10 * Wave).
 * 3. Escalating reroll cost: Base(W) + k * Step(W), resets per shop.
 * 4. Slot lock persistence across rerolls with inflation freeze.
 * 5. Weapon tier combining: merging two identical tier weapons into Tier +1.
 * 6. Auto-combine when purchasing weapon into full 6-slot inventory.
 */

import type {
  ShopSlot,
  WeaponTier,
  WeaponBlueprint,
  PlayerRPGStats,
} from '@/types/brotato';

export const BASE_PRICES: Record<WeaponTier, number> = {
  1: 20,
  2: 42,
  3: 75,
  4: 120,
};

export function calculateItemPrice(basePrice: number, wave: number): number {
  return basePrice + 1 + Math.floor(basePrice * 0.1 * wave);
}

export function calculateRerollCost(rerollCount: number, wave: number): number {
  const baseReroll = Math.max(1, Math.floor(wave * 0.75));
  const rerollStep = 1 + Math.floor(wave * 0.25);
  return baseReroll + rerollCount * rerollStep;
}

export function getTierWeights(
  wave: number,
  luck: number
): Record<WeaponTier, number> {
  let baseWeights: Record<WeaponTier, number>;

  if (wave <= 2) {
    baseWeights = { 1: 100, 2: 0, 3: 0, 4: 0 };
  } else if (wave <= 4) {
    baseWeights = { 1: 80, 2: 20, 3: 0, 4: 0 };
  } else if (wave <= 8) {
    baseWeights = { 1: 55, 2: 35, 3: 10, 4: 0 };
  } else if (wave <= 12) {
    baseWeights = { 1: 35, 2: 40, 3: 20, 4: 5 };
  } else if (wave <= 16) {
    baseWeights = { 1: 25, 2: 35, 3: 30, 4: 10 };
  } else {
    baseWeights = { 1: 15, 2: 30, 3: 40, 4: 15 };
  }

  // Luck scaling modulates higher tier probabilities
  const luckNorm = Math.max(-100, luck) / 100;
  return {
    1: baseWeights[1],
    2: Math.max(0, baseWeights[2] * (1 + luckNorm * 0.5)),
    3: Math.max(0, baseWeights[3] * (1 + luckNorm * 1.0)),
    4: Math.max(0, baseWeights[4] * (1 + luckNorm * 1.5)),
  };
}

export function rollTier(weights: Record<WeaponTier, number>): WeaponTier {
  const total = weights[1] + weights[2] + weights[3] + weights[4];
  if (total <= 0) return 1;

  let roll = Math.random() * total;
  for (const tier of [1, 2, 3, 4] as WeaponTier[]) {
    if (roll <= weights[tier]) return tier;
    roll -= weights[tier];
  }
  return 1;
}

export interface PlayerWeaponInstance {
  id: string;
  name: string;
  tier: WeaponTier;
  baseDamage: number;
  baseCooldownMs: number;
  critChance: number;
  knockback: number;
}

export class WeaponFusionManager {
  public weapons: PlayerWeaponInstance[] = [];
  public readonly maxSlots = 6;

  public addWeapon(weapon: PlayerWeaponInstance): { success: boolean; merged: boolean } {
    // If inventory full, check for auto-combine with duplicate tier
    if (this.weapons.length >= this.maxSlots) {
      const matchIndex = this.weapons.findIndex(
        (w) => w.id === weapon.id && w.tier === weapon.tier && w.tier < 4
      );
      if (matchIndex !== -1) {
        this.upgradeWeapon(matchIndex);
        return { success: true, merged: true };
      }
      return { success: false, merged: false };
    }

    this.weapons.push({ ...weapon });
    return { success: true, merged: false };
  }

  public upgradeWeapon(index: number): boolean {
    const w = this.weapons[index];
    if (!w || w.tier >= 4) return false;

    w.tier = (w.tier + 1) as WeaponTier;
    w.baseDamage = Math.round(w.baseDamage * 1.35 * 10) / 10;
    w.baseCooldownMs = Math.round(w.baseCooldownMs * 0.9 * 10) / 10;
    w.critChance = Math.round((w.critChance + 0.05) * 100) / 100;
    w.knockback = Math.round(w.knockback * 1.15 * 10) / 10;
    return true;
  }

  public manualCombine(indexA: number, indexB: number): boolean {
    if (indexA === indexB) return false;
    const a = this.weapons[indexA];
    const b = this.weapons[indexB];
    if (!a || !b) return false;
    if (a.id !== b.id || a.tier !== b.tier || a.tier >= 4) return false;

    this.upgradeWeapon(indexA);
    this.weapons.splice(indexB, 1);
    return true;
  }
}

export interface ShopItemDefinition {
  id: string;
  name: string;
  type: 'weapon' | 'passive_item' | 'stat_upgrade';
  tier: WeaponTier;
  description: string;
  iconName: string;
  statModifiers?: Partial<PlayerRPGStats>;
  weaponBlueprint?: WeaponBlueprint;
}

export class ShopInventoryManager {
  public slots: (ShopSlot | null)[] = [null, null, null, null];
  public lockedSlots: Set<number> = new Set();
  public rerollCount = 0;
  public currentWave = 1;

  constructor(wave = 1, luck = 0) {
    this.currentWave = wave;
    this.populateAllSlots(luck);
  }

  public populateAllSlots(luck = 0): void {
    for (let i = 0; i < 4; i++) {
      if (!this.lockedSlots.has(i) || this.slots[i] === null) {
        this.slots[i] = this.generateSlot(i, this.currentWave, luck);
      }
    }
  }

  public generateSlot(slotIndex: number, wave: number, luck: number): ShopSlot {
    const weights = getTierWeights(wave, luck);
    const tier = rollTier(weights);
    const basePrice = BASE_PRICES[tier];
    const cost = calculateItemPrice(basePrice, wave);

    return {
      slotIndex,
      itemType: slotIndex % 2 === 0 ? 'weapon' : 'stat_upgrade',
      itemId: `item_t${tier}_s${slotIndex}`,
      name: `Tier ${tier} Item`,
      description: `Increases combat prowess (Tier ${tier})`,
      tier,
      cost,
      originalCost: cost,
      isLocked: false,
      isPurchased: false,
      iconName: `item_tier_${tier}`,
      statModifiers: {
        damagePercent: tier * 3,
        maxHp: tier * 2,
      },
    };
  }

  public lockSlot(index: number): void {
    if (index < 0 || index >= 4 || !this.slots[index]) return;
    this.lockedSlots.add(index);
    this.slots[index]!.isLocked = true;
  }

  public unlockSlot(index: number): void {
    if (index < 0 || index >= 4 || !this.slots[index]) return;
    this.lockedSlots.delete(index);
    this.slots[index]!.isLocked = false;
    // Re-evaluate to current wave inflation
    const base = BASE_PRICES[this.slots[index]!.tier];
    this.slots[index]!.cost = calculateItemPrice(base, this.currentWave);
  }

  public reroll(luck = 0): boolean {
    this.rerollCount++;
    for (let i = 0; i < 4; i++) {
      if (!this.lockedSlots.has(i)) {
        this.slots[i] = this.generateSlot(i, this.currentWave, luck);
      }
    }
    return true;
  }

  public advanceWave(newWave: number, luck = 0): void {
    this.currentWave = newWave;
    this.rerollCount = 0; // Resets reroll cost per wave

    for (let i = 0; i < 4; i++) {
      if (this.lockedSlots.has(i) && this.slots[i] !== null) {
        // Locked item freezes inflation price at wave it was locked!
      } else {
        this.slots[i] = this.generateSlot(i, this.currentWave, luck);
      }
    }
  }

  public purchaseSlot(
    slotIndex: number,
    playerMaterials: number
  ): { success: boolean; slot?: ShopSlot; remainingMaterials: number } {
    const slot = this.slots[slotIndex];
    if (!slot || slot.isPurchased || playerMaterials < slot.cost) {
      return { success: false, remainingMaterials: playerMaterials };
    }

    slot.isPurchased = true;
    if (this.lockedSlots.has(slotIndex)) {
      this.lockedSlots.delete(slotIndex);
      slot.isLocked = false;
    }

    return {
      success: true,
      slot,
      remainingMaterials: playerMaterials - slot.cost,
    };
  }
}
