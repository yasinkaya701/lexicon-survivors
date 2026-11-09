/**
 * DropManager.ts - Pure TypeScript Drop Generation, Magnetism & Vacuum Physics
 *
 * Implements:
 * 1. Material gems (gold + XP), consumable fruit (3 HP heal), loot crates.
 * 2. Magnetic pull physics within player.stats.pickupRange (base 120px).
 * 3. End-of-wave vacuum: high-speed acceleration (2000 px/s) pulling all drops.
 * 4. Harvesting economy bonus + 5% compound growth per wave.
 */

import type {
  PickupEntity,
  EnemyEntity,
  PlayerEntity,
} from '@/types/brotato';

export function calculateDropChance(baseChance: number, luck: number): number {
  const eff = baseChance * (1 + Math.max(-100, luck) / 100);
  return Math.min(1.0, Math.max(0, Math.round(eff * 10000) / 10000));
}

let dropIdCounter = 0;

export function generateDropsForEnemy(
  enemy: EnemyEntity,
  luck: number
): PickupEntity[] {
  const drops: PickupEntity[] = [];

  // Guaranteed loot crate for Elite Boss
  if (enemy.type === 'elite') {
    dropIdCounter++;
    drops.push({
      id: `drop_crate_${dropIdCounter}`,
      type: 'chest',
      x: enemy.x,
      y: enemy.y,
      vx: 0,
      vy: 0,
      value: 1,
      radius: 16,
      isMagnetized: false,
      spriteName: 'drop_chest',
    });

    // Elite drops large material cache
    dropIdCounter++;
    drops.push({
      id: `drop_mat_${dropIdCounter}`,
      type: 'material',
      x: enemy.x + (Math.random() - 0.5) * 20,
      y: enemy.y + (Math.random() - 0.5) * 20,
      vx: 0,
      vy: 0,
      value: 30,
      radius: 12,
      isMagnetized: false,
      spriteName: 'drop_material',
    });
    return drops;
  }

  // Standard enemy drops: 1 material gem guaranteed
  dropIdCounter++;
  const matValue = enemy.type === 'tank' ? 2 : 1;
  drops.push({
    id: `drop_mat_${dropIdCounter}`,
    type: 'material',
    x: enemy.x + (Math.random() - 0.5) * 10,
    y: enemy.y + (Math.random() - 0.5) * 10,
    vx: (Math.random() - 0.5) * 40,
    vy: (Math.random() - 0.5) * 40,
    value: matValue,
    radius: 8,
    isMagnetized: false,
    spriteName: 'drop_material',
  });

  // Roll consumable fruit (base 1%, luck scaled)
  const fruitChance = calculateDropChance(0.01, luck);
  if (Math.random() < fruitChance) {
    dropIdCounter++;
    drops.push({
      id: `drop_fruit_${dropIdCounter}`,
      type: 'fruit',
      x: enemy.x + (Math.random() - 0.5) * 16,
      y: enemy.y + (Math.random() - 0.5) * 16,
      vx: 0,
      vy: 0,
      value: 3, // 3 HP heal
      radius: 10,
      isMagnetized: false,
      spriteName: 'drop_fruit',
    });
  }

  // Roll rare regular loot crate (base 0.5%, luck scaled)
  const crateChance = calculateDropChance(0.005, luck);
  if (Math.random() < crateChance) {
    dropIdCounter++;
    drops.push({
      id: `drop_crate_${dropIdCounter}`,
      type: 'chest',
      x: enemy.x,
      y: enemy.y,
      vx: 0,
      vy: 0,
      value: 1,
      radius: 14,
      isMagnetized: false,
      spriteName: 'drop_chest',
    });
  }

  return drops;
}

export interface PickupCollectionResult {
  survivingPickups: PickupEntity[];
  collectedMaterials: number;
  collectedHealth: number;
  collectedChests: number;
}

export function updatePickups(
  pickups: PickupEntity[],
  player: PlayerEntity,
  isVacuumActive: boolean,
  dt: number
): PickupCollectionResult {
  const survivingPickups: PickupEntity[] = [];
  let collectedMaterials = 0;
  let collectedHealth = 0;
  let collectedChests = 0;

  if (dt <= 0) {
    return {
      survivingPickups: [...pickups],
      collectedMaterials: 0,
      collectedHealth: 0,
      collectedChests: 0,
    };
  }

  const pickupRadius = player.stats.pickupRange || 120;
  const collectionThreshold = player.radius + 12; // Radius contact

  for (const p of pickups) {
    const dx = player.x - p.x;
    const dy = player.y - p.y;
    const dist = Math.hypot(dx, dy) || 1;

    // Contact collection check
    if (dist <= collectionThreshold) {
      if (p.type === 'material') collectedMaterials += p.value;
      else if (p.type === 'fruit') collectedHealth += p.value;
      else if (p.type === 'chest') collectedChests += p.value;
      continue;
    }

    if (isVacuumActive) {
      // High-speed End-of-Wave Vacuum: 2000 px/s
      const vacuumSpeed = 2000;
      const step = vacuumSpeed * dt;

      if (step >= dist) {
        // Collect directly to prevent overshoot
        if (p.type === 'material') collectedMaterials += p.value;
        else if (p.type === 'fruit') collectedHealth += p.value;
        else if (p.type === 'chest') collectedChests += p.value;
        continue;
      }

      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
      p.isMagnetized = true;
      survivingPickups.push(p);
    } else if (dist <= pickupRadius || p.isMagnetized) {
      // Normal magnetic pull within pickupRange
      p.isMagnetized = true;
      const pullAccel = 1500;
      const maxPullSpeed = 800;

      p.vx += (dx / dist) * pullAccel * dt;
      p.vy += (dy / dist) * pullAccel * dt;

      const currentSpeed = Math.hypot(p.vx, p.vy);
      if (currentSpeed > maxPullSpeed) {
        p.vx = (p.vx / currentSpeed) * maxPullSpeed;
        p.vy = (p.vy / currentSpeed) * maxPullSpeed;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      survivingPickups.push(p);
    } else {
      // Resting pickup with friction decay on scatter impulse
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      survivingPickups.push(p);
    }
  }

  return {
    survivingPickups,
    collectedMaterials,
    collectedHealth,
    collectedChests,
  };
}

export function calculateHarvestingBonus(
  harvestingStat: number
): { materialsGained: number; nextHarvestingStat: number } {
  const materialsGained = Math.max(0, Math.floor(harvestingStat));
  const nextHarvestingStat = Math.ceil(harvestingStat * 1.05);
  return { materialsGained, nextHarvestingStat };
}
