/**
 * WeaponManager.ts
 * Manages up to 6 Simultaneous Active Weapons with Independent Cooldowns
 *
 * Implements:
 * - Simultaneous multi-weapon ticking
 * - Attack speed cooldown scaling with 83.33ms rate cap
 * - Auto-targeting and manual firing cycle
 * - Attack event emission for projectiles, melee swings, and thrusts
 * - Weapon combining and inventory slot management
 */

import type {
  ActiveWeaponInstance,
  EnemyEntity,
  PlayerRPGStats,
  ProjectileEntity,
  TargetingMode,
  WeaponBlueprint,
  WeaponTier,
} from '@/types/brotato';
import { calculateAttackCooldown, calculateEffectiveRange, calculateWeaponDamage, getScalingStatValue, rollCriticalStrike } from '../stats/CombatMath';
import { selectTarget, calculateAimAngle } from './Targeting';
import { checkMeleeSwingHit, checkMeleeThrustHit, calculateKnockbackImpulse, type HitResult } from './HitResolution';
import { buildTierBlueprint, BASE_WEAPONS } from './WeaponCatalog';

export interface WeaponAttackEvent {
  slotIndex: number;
  blueprint: WeaponBlueprint;
  angleRad: number;
  projectilesToSpawn?: ProjectileEntity[];
  meleeHits?: HitResult[];
}

export class WeaponManager {
  public weapons: (ActiveWeaponInstance | null)[] = [null, null, null, null, null, null];
  readonly maxSlots: number = 6;
  private projectileIdCounter: number = 0;

  /**
   * Add a weapon to the inventory.
   * If inventory is full (6/6), attempts to auto-combine with an identical duplicate tier weapon.
   */
  public addWeapon(blueprint: WeaponBlueprint): { success: boolean; slotIndex?: number; merged?: boolean } {
    // First check if an open slot is available
    const openSlot = this.weapons.findIndex((w) => w === null);
    if (openSlot !== -1) {
      const instance: ActiveWeaponInstance = {
        id: `active_${blueprint.id}_${Date.now()}_${openSlot}`,
        blueprint: { ...blueprint },
        slotIndex: openSlot,
        currentCooldownMs: 0, // ready to fire
        targetEnemyId: null,
        currentAngleRad: 0,
        state: 'ready',
        attackProgress: 0,
      };
      this.weapons[openSlot] = instance;
      return { success: true, slotIndex: openSlot, merged: false };
    }

    // If full (6/6), look for duplicate tier weapon to merge
    const matchIndex = this.weapons.findIndex(
      (w) => w !== null && w.blueprint.id === blueprint.id && w.blueprint.tier === blueprint.tier && w.blueprint.tier < 4
    );

    if (matchIndex !== -1) {
      const merged = this.upgradeWeaponSlot(matchIndex);
      return { success: merged, slotIndex: matchIndex, merged: true };
    }

    return { success: false, merged: false };
  }

  /**
   * Remove weapon at specific slot.
   */
  public removeWeapon(slotIndex: number): ActiveWeaponInstance | null {
    if (slotIndex < 0 || slotIndex >= this.maxSlots) return null;
    const removed = this.weapons[slotIndex];
    this.weapons[slotIndex] = null;
    return removed;
  }

  /**
   * Upgrades weapon at specified slot to next tier.
   */
  public upgradeWeaponSlot(slotIndex: number): boolean {
    const inst = this.weapons[slotIndex];
    if (!inst || inst.blueprint.tier >= 4) return false;

    const baseKey = inst.blueprint.id.split('_')[0];
    const baseDef = BASE_WEAPONS[baseKey];
    if (!baseDef) return false;

    const nextTier = (inst.blueprint.tier + 1) as WeaponTier;
    inst.blueprint = buildTierBlueprint(baseDef, nextTier);
    return true;
  }

  /**
   * Manual combination of two identical tier weapons in inventory.
   */
  public combineWeapons(slotA: number, slotB: number): boolean {
    if (slotA === slotB) return false;
    const wA = this.weapons[slotA];
    const wB = this.weapons[slotB];
    if (!wA || !wB) return false;
    if (wA.blueprint.name !== wB.blueprint.name || wA.blueprint.tier !== wB.blueprint.tier || wA.blueprint.tier >= 4) {
      return false;
    }

    const upgraded = this.upgradeWeaponSlot(slotA);
    if (upgraded) {
      this.removeWeapon(slotB);
      return true;
    }
    return false;
  }

  /**
   * Primary frame update loop.
   * Ticks down individual cooldowns, checks targeting, and fires attack events.
   */
  public update(
    dtSec: number,
    playerStats: PlayerRPGStats,
    playerPos: { x: number; y: number },
    enemies: EnemyEntity[],
    targetingMode: TargetingMode = 'closest',
    mousePos?: { x: number; y: number }
  ): WeaponAttackEvent[] {
    const dtMs = dtSec * 1000;
    const events: WeaponAttackEvent[] = [];

    for (let slot = 0; slot < this.maxSlots; slot++) {
      const inst = this.weapons[slot];
      if (!inst) continue;

      const bp = inst.blueprint;
      const effectiveCooldown = calculateAttackCooldown(bp.baseCooldownMs, playerStats.attackSpeed);
      const isRanged = bp.type === 'ranged';
      const effectiveRange = calculateEffectiveRange(bp.baseRange, playerStats.range, isRanged);

      // Advance firing animation progress
      if (inst.state === 'firing') {
        const animDurationMs = Math.min(180, effectiveCooldown * 0.4);
        inst.attackProgress += dtMs / animDurationMs;
        if (inst.attackProgress >= 1.0) {
          inst.attackProgress = 0;
          inst.state = 'cooldown';
        }
      }

      // Tick cooldown
      if (inst.currentCooldownMs > 0) {
        inst.currentCooldownMs -= dtMs;
        if (inst.currentCooldownMs <= 0) {
          inst.currentCooldownMs = 0;
          if (inst.state !== 'firing') {
            inst.state = 'ready';
          }
        }
      }

      // If weapon is ready, attempt to acquire target and fire
      if (inst.state === 'ready') {
        const target = selectTarget(targetingMode, playerPos, effectiveRange, enemies, mousePos);
        let fireAngle: number | null = null;

        if (target) {
          fireAngle = calculateAimAngle(playerPos, { x: target.x, y: target.y });
          inst.targetEnemyId = target.id;
        } else if (targetingMode === 'manual' && mousePos) {
          fireAngle = calculateAimAngle(playerPos, mousePos);
          inst.targetEnemyId = null;
        }

        if (fireAngle !== null) {
          inst.currentAngleRad = fireAngle;
          inst.currentCooldownMs = effectiveCooldown;
          inst.state = 'firing';
          inst.attackProgress = 0;

          // Generate Attack Event
          const attackEvent = this.fireWeapon(inst, playerPos, fireAngle, effectiveRange, playerStats, enemies);
          events.push(attackEvent);
        }
      }
    }

    return events;
  }

  /**
   * Dispatches weapon attack: creates projectiles or resolves immediate melee hits.
   */
  private fireWeapon(
    inst: ActiveWeaponInstance,
    playerPos: { x: number; y: number },
    angleRad: number,
    effectiveRange: number,
    stats: PlayerRPGStats,
    enemies: EnemyEntity[]
  ): WeaponAttackEvent {
    const bp = inst.blueprint;
    const statVal = getScalingStatValue(stats, bp.scalingStat);
    const critChance = bp.critChance * 100 + stats.critChancePercent;
    const isCrit = rollCriticalStrike(critChance);
    const damage = calculateWeaponDamage(bp.baseDamage, statVal, bp.scalingRatio, stats.damagePercent, isCrit, bp.critMultiplier);

    const event: WeaponAttackEvent = {
      slotIndex: inst.slotIndex,
      blueprint: bp,
      angleRad,
    };

    if (bp.type === 'ranged') {
      const projectiles: ProjectileEntity[] = [];
      const speed = bp.projectileSpeed ?? 600;
      const count = bp.pelletCount ?? 1;
      const spreadDeg = bp.spreadAngleDeg ?? 0;

      for (let p = 0; p < count; p++) {
        let pelletAngle = angleRad;
        if (count > 1 && spreadDeg > 0) {
          const spreadRad = (spreadDeg * Math.PI) / 180;
          const step = spreadRad / (count - 1);
          pelletAngle = angleRad - spreadRad / 2 + p * step;
        }

        this.projectileIdCounter++;
        projectiles.push({
          id: `proj_${inst.id}_${this.projectileIdCounter}`,
          source: 'player',
          weaponId: inst.id,
          x: playerPos.x,
          y: playerPos.y,
          vx: Math.cos(pelletAngle) * speed,
          vy: Math.sin(pelletAngle) * speed,
          damage,
          isCrit,
          knockback: bp.knockback,
          remainingPierces: bp.pierce,
          remainingBounces: bp.bounce,
          hitEntityIds: [],
          maxRange: effectiveRange,
          distanceTraveled: 0,
          lifetimeMs: 0,
          maxLifetimeMs: (effectiveRange / speed) * 1200,
          radius: bp.subtype === 'spread' ? 4 : 6,
          spriteName: bp.spriteName,
        });
      }
      event.projectilesToSpawn = projectiles;
    } else {
      // Melee attack: Resolve hits immediately
      const meleeHits: HitResult[] = [];
      for (const enemy of enemies) {
        if (enemy.hp <= 0) continue;

        let isHit = false;
        if (bp.subtype === 'swing') {
          const arcDeg = bp.arcAngleDeg ?? 120;
          isHit = checkMeleeSwingHit(playerPos, angleRad, arcDeg, effectiveRange, enemy);
        } else {
          // Thrust
          const width = 28;
          isHit = checkMeleeThrustHit(playerPos, angleRad, effectiveRange, width, enemy);
        }

        if (isHit) {
          const kb = calculateKnockbackImpulse(playerPos, enemy, bp.knockback);
          meleeHits.push({
            enemyId: enemy.id,
            damage,
            isCrit,
            knockback: kb,
          });
        }
      }
      event.meleeHits = meleeHits;
    }

    return event;
  }

  /**
   * Get all active (non-null) weapon instances.
   */
  public getActiveWeapons(): ActiveWeaponInstance[] {
    return this.weapons.filter((w): w is ActiveWeaponInstance => w !== null);
  }
}
