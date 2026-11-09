import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Authoritative Shop Economy, Inflation, Rerolls, Locking & Fusion Formulas from PROJECT.md
 */

export type WeaponTier = 1 | 2 | 3 | 4;

export const BASE_PRICES: Record<WeaponTier, number> = {
  1: 20,
  2: 42,
  3: 75,
  4: 120,
};

export function calculateItemPrice(basePrice: number, wave: number): number {
  return basePrice + 1 + Math.floor(basePrice * 0.10 * wave);
}

export function calculateRerollCost(rerollCount: number, wave: number): number {
  const baseReroll = Math.max(1, Math.floor(wave * 0.75));
  const rerollStep = 1 + Math.floor(wave * 0.25);
  return baseReroll + rerollCount * rerollStep;
}

export interface ShopSlotItem {
  id: string;
  name: string;
  tier: WeaponTier;
  basePrice: number;
  lockedAtWave: number | null;
  price: number;
}

export class ShopInventoryManager {
  public slots: (ShopSlotItem | null)[] = [null, null, null, null];
  public lockedSlots: Set<number> = new Set();
  public rerollCount: number = 0;
  public currentWave: number = 1;

  constructor(wave: number) {
    this.currentWave = wave;
    this.populateAllSlots();
  }

  public populateAllSlots(): void {
    for (let i = 0; i < 4; i++) {
      if (!this.lockedSlots.has(i) || this.slots[i] === null) {
        this.slots[i] = this.generateItem(i, this.currentWave);
      }
    }
  }

  public generateItem(slotIndex: number, wave: number): ShopSlotItem {
    const tier: WeaponTier = wave <= 3 ? 1 : 2;
    const base = BASE_PRICES[tier];
    return {
      id: `weapon_tier_${tier}_slot_${slotIndex}`,
      name: `Weapon Tier ${tier}`,
      tier,
      basePrice: base,
      lockedAtWave: null,
      price: calculateItemPrice(base, wave),
    };
  }

  public lockSlot(index: number): void {
    this.lockedSlots.add(index);
    if (this.slots[index] && this.slots[index]!.lockedAtWave === null) {
      this.slots[index]!.lockedAtWave = this.currentWave;
    }
  }

  public unlockSlot(index: number): void {
    this.lockedSlots.delete(index);
    if (this.slots[index]) {
      this.slots[index]!.lockedAtWave = null;
      // Re-evaluate price to current wave inflation
      this.slots[index]!.price = calculateItemPrice(this.slots[index]!.basePrice, this.currentWave);
    }
  }

  public reroll(): boolean {
    this.rerollCount++;
    for (let i = 0; i < 4; i++) {
      if (!this.lockedSlots.has(i)) {
        this.slots[i] = this.generateItem(i, this.currentWave);
      }
    }
    return true;
  }

  public advanceWave(newWave: number): void {
    this.currentWave = newWave;
    this.rerollCount = 0; // resets per wave
    for (let i = 0; i < 4; i++) {
      if (this.lockedSlots.has(i) && this.slots[i] !== null) {
        // Locked items freeze price at the wave they were locked
        // Price does NOT inflate
      } else {
        this.slots[i] = this.generateItem(i, this.currentWave);
      }
    }
  }
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
  readonly maxSlots: number = 6;

  public addWeapon(weapon: PlayerWeaponInstance): { success: boolean; merged: boolean } {
    // If full (6/6), look for duplicate tier match to auto-combine
    if (this.weapons.length >= this.maxSlots) {
      const matchIndex = this.weapons.findIndex((w) => w.id === weapon.id && w.tier === weapon.tier && w.tier < 4);
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
    if (w.tier >= 4) return false;

    w.tier = (w.tier + 1) as WeaponTier;
    w.baseDamage = Math.round(w.baseDamage * 1.35 * 10) / 10;
    w.baseCooldownMs = Math.round(w.baseCooldownMs * 0.90 * 10) / 10;
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

describe('Shop Economy Specification Verification', () => {
  describe('Wave Price Inflation Formula', () => {
    it('calculates Tier 1 base price inflation across waves 1, 10, 20', () => {
      // Base: 20
      // Wave 1: 20 + 1 + floor(20 * 0.10 * 1) = 20 + 1 + 2 = 23
      assert.equal(calculateItemPrice(20, 1), 23);

      // Wave 5: 20 + 1 + floor(20 * 0.10 * 5) = 20 + 1 + 10 = 31
      assert.equal(calculateItemPrice(20, 5), 31);

      // Wave 10: 20 + 1 + floor(20 * 0.10 * 10) = 20 + 1 + 20 = 41
      assert.equal(calculateItemPrice(20, 10), 41);

      // Wave 20: 20 + 1 + floor(20 * 0.10 * 20) = 20 + 1 + 40 = 61
      assert.equal(calculateItemPrice(20, 20), 61);
    });

    it('calculates higher tier base price inflation accurately', () => {
      // Tier 2 (Base 42): Wave 5 -> 42 + 1 + floor(42 * 0.5) = 42 + 1 + 21 = 64
      assert.equal(calculateItemPrice(42, 5), 64);

      // Tier 4 (Base 120): Wave 10 -> 120 + 1 + floor(120 * 1.0) = 120 + 1 + 120 = 241
      assert.equal(calculateItemPrice(120, 10), 241);
    });
  });

  describe('Escalating Reroll Cost Scaling', () => {
    it('calculates reroll costs for Wave 5 escalating linearly', () => {
      // Wave 5:
      // BaseReroll = max(1, floor(5 * 0.75)) = floor(3.75) = 3
      // RerollStep = 1 + floor(5 * 0.25) = 1 + floor(1.25) = 2
      // k=0 -> 3 + 0*2 = 3
      assert.equal(calculateRerollCost(0, 5), 3);
      // k=1 -> 3 + 1*2 = 5
      assert.equal(calculateRerollCost(1, 5), 5);
      // k=2 -> 3 + 2*2 = 7
      assert.equal(calculateRerollCost(2, 5), 7);
      // k=5 -> 3 + 5*2 = 13
      assert.equal(calculateRerollCost(5, 5), 13);
    });

    it('calculates Wave 1 reroll cost progression starting at 1', () => {
      // Wave 1:
      // BaseReroll = max(1, floor(0.75)) = 1
      // RerollStep = 1 + floor(0.25) = 1
      assert.equal(calculateRerollCost(0, 1), 1);
      assert.equal(calculateRerollCost(1, 1), 2);
      assert.equal(calculateRerollCost(2, 1), 3);
    });
  });

  describe('Slot Lock Persistence & Inflation Immunity', () => {
    it('preserves locked slot content and price across rerolls and waves', () => {
      const shop = new ShopInventoryManager(1);
      const originalSlot0 = { ...shop.slots[0]! };

      // Lock slot 0 at wave 1
      shop.lockSlot(0);
      assert.equal(shop.lockedSlots.has(0), true);
      assert.equal(shop.slots[0]!.price, 23); // Wave 1 price

      // Reroll shop: slot 0 MUST remain unchanged while others reroll
      shop.reroll();
      assert.equal(shop.slots[0]!.id, originalSlot0.id);
      assert.equal(shop.slots[0]!.price, 23);

      // Advance to wave 5: slot 0 MUST still retain Wave 1 price (frozen inflation)
      shop.advanceWave(5);
      assert.equal(shop.slots[0]!.id, originalSlot0.id);
      assert.equal(shop.slots[0]!.price, 23); // Inflation frozen at 23, NOT 31

      // Unlocked slot 1 inflates to wave 5
      assert.equal(shop.slots[1]!.price, calculateItemPrice(shop.slots[1]!.basePrice, 5));
    });

    it('resets reroll counter upon advancing wave', () => {
      const shop = new ShopInventoryManager(1);
      shop.reroll();
      shop.reroll();
      assert.equal(shop.rerollCount, 2);

      shop.advanceWave(2);
      assert.equal(shop.rerollCount, 0);
    });
  });

  describe('Weapon Tier Combining & Fusion Logic', () => {
    const makePistol = (tier: WeaponTier): PlayerWeaponInstance => ({
      id: 'pistol',
      name: `Plasma Pistol T${tier}`,
      tier,
      baseDamage: 10,
      baseCooldownMs: 500,
      critChance: 0.05,
      knockback: 10,
    });

    it('merges 2 identical tier weapons into 1 tier+1 weapon', () => {
      const fusion = new WeaponFusionManager();
      fusion.addWeapon(makePistol(1));
      fusion.addWeapon(makePistol(1));
      assert.equal(fusion.weapons.length, 2);

      const success = fusion.manualCombine(0, 1);
      assert.equal(success, true);
      assert.equal(fusion.weapons.length, 1);
      assert.equal(fusion.weapons[0].tier, 2);
      // Stat boosts: dmg +35% (13.5), cooldown -10% (450ms), crit +5% (0.10), knockback +15% (11.5)
      assert.equal(fusion.weapons[0].baseDamage, 13.5);
      assert.equal(fusion.weapons[0].baseCooldownMs, 450);
      assert.equal(fusion.weapons[0].critChance, 0.10);
      assert.equal(fusion.weapons[0].knockback, 11.5);
    });

    it('rejects merging differing tiers or different weapon types', () => {
      const fusion = new WeaponFusionManager();
      fusion.addWeapon(makePistol(1));
      fusion.addWeapon(makePistol(2));
      assert.equal(fusion.manualCombine(0, 1), false);
    });

    it('rejects combining Tier 4 (Legendary is max)', () => {
      const fusion = new WeaponFusionManager();
      fusion.addWeapon(makePistol(4));
      fusion.addWeapon(makePistol(4));
      assert.equal(fusion.manualCombine(0, 1), false);
    });

    it('automatically fuses matching weapon when 6-slot inventory is full', () => {
      const fusion = new WeaponFusionManager();
      // Fill 6 slots with Tier 1 weapons
      fusion.addWeapon(makePistol(1));
      for (let i = 1; i < 6; i++) {
        fusion.addWeapon({
          id: `other_weapon_${i}`,
          name: `Weapon ${i}`,
          tier: 1,
          baseDamage: 5,
          baseCooldownMs: 400,
          critChance: 0.05,
          knockback: 5,
        });
      }
      assert.equal(fusion.weapons.length, 6);

      // Buying 7th weapon that matches pistol T1 triggers auto-combine
      const res = fusion.addWeapon(makePistol(1));
      assert.equal(res.success, true);
      assert.equal(res.merged, true);
      assert.equal(fusion.weapons.length, 6);
      assert.equal(fusion.weapons[0].tier, 2); // Pistol upgraded in-place to Tier 2
    });
  });
});
