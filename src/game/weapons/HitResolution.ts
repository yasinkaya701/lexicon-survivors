/**
 * HitResolution.ts
 * Kinematic & Geometric Collision Resolution for Weapons
 *
 * Implements:
 * 1. Melee Swing Arc Hitbox (120-degree circular sector with circular radius tolerance)
 * 2. Melee Linear Thrust Hitbox (Oriented capsule segment)
 * 3. Ballistic Projectile Pipeline (Velocity, piercing deduplication, range despawn)
 * 4. Ricochet Bounce Mechanics (Redirects towards nearest unhit enemy)
 * 5. Knockback Impulse Physics with Mass Division
 */

import type { EnemyEntity, ProjectileEntity } from '@/types/brotato';
import type { IVector2D as Vector2D } from '@/game/engine/Vector2D';

export interface HitResult {
  enemyId: string;
  damage: number;
  isCrit: boolean;
  knockback: Vector2D;
}

/**
 * Normalizes an angle into [-PI, PI].
 */
export function normalizeAngle(rad: number): number {
  let angle = rad % (2 * Math.PI);
  if (angle > Math.PI) angle -= 2 * Math.PI;
  if (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * 1. Melee Swing Arc Collision Check
 *
 * Tests whether an enemy disc (ex, ey, r) intersects the circular sector
 * defined by player origin, facing angle, arc span angle, and reach range.
 */
export function checkMeleeSwingHit(
  origin: Vector2D,
  facingAngleRad: number,
  arcAngleDeg: number,
  effectiveRange: number,
  enemy: EnemyEntity
): boolean {
  if (enemy.hp <= 0 || enemy.state === 'dying' || enemy.state === 'spawning') return false;

  const dx = enemy.x - origin.x;
  const dy = enemy.y - origin.y;
  const dist = Math.hypot(dx, dy);

  // Beyond maximum reach + enemy radius
  if (dist > effectiveRange + enemy.radius) return false;

  // Point-blank touch (enemy center is closer than enemy radius)
  if (dist <= enemy.radius) return true;

  // Calculate angle to enemy center
  const targetAngle = Math.atan2(dy, dx);
  const angleDiff = Math.abs(normalizeAngle(targetAngle - facingAngleRad));

  const halfArcRad = ((arcAngleDeg * Math.PI) / 180) / 2;
  const angularRadius = Math.asin(Math.min(1.0, enemy.radius / dist));

  return angleDiff <= halfArcRad + angularRadius;
}

/**
 * 2. Melee Linear Thrust Collision Check
 *
 * Tests whether an enemy disc intersects a line segment extending from origin
 * along facingAngleRad for length `effectiveRange`, with lateral width `widthPx`.
 */
export function checkMeleeThrustHit(
  origin: Vector2D,
  facingAngleRad: number,
  effectiveRange: number,
  widthPx: number,
  enemy: EnemyEntity
): boolean {
  if (enemy.hp <= 0 || enemy.state === 'dying' || enemy.state === 'spawning') return false;

  const cos = Math.cos(facingAngleRad);
  const sin = Math.sin(facingAngleRad);
  const dx = enemy.x - origin.x;
  const dy = enemy.y - origin.y;

  // Project vector onto thrust segment
  const t = dx * cos + dy * sin;
  const clampedT = Math.max(0, Math.min(effectiveRange, t));

  // Closest point on segment
  const closestX = origin.x + clampedT * cos;
  const closestY = origin.y + clampedT * sin;

  const dist = Math.hypot(enemy.x - closestX, enemy.y - closestY);
  return dist <= widthPx / 2 + enemy.radius;
}

/**
 * 3. Knockback Impulse Vector Calculation
 *
 * Formula:
 *   I = u * (KnockbackForce / max(0.1, enemy.mass))
 *
 * When enemy is immune to knockback, returns (0, 0).
 */
export function calculateKnockbackImpulse(
  sourcePos: Vector2D,
  enemy: EnemyEntity,
  knockbackForce: number
): Vector2D {
  if (enemy.isImmuneToKnockback || knockbackForce <= 0) {
    return { x: 0, y: 0 };
  }

  const dx = enemy.x - sourcePos.x;
  const dy = enemy.y - sourcePos.y;
  const dist = Math.hypot(dx, dy);

  const dirX = dist > 0.0001 ? dx / dist : 1;
  const dirY = dist > 0.0001 ? dy / dist : 0;

  const effectiveMass = Math.max(0.1, enemy.mass);
  const impulseMagnitude = knockbackForce / effectiveMass;

  return {
    x: dirX * impulseMagnitude,
    y: dirY * impulseMagnitude,
  };
}

/**
 * 4. Projectile Pipeline & Ricochet Bounce Update
 */
export interface ProjectileUpdateResult {
  activeProjectiles: ProjectileEntity[];
  hits: HitResult[];
}

export function updateProjectiles(
  projectiles: ProjectileEntity[],
  dtSec: number,
  enemies: EnemyEntity[],
  bounceSearchRadius: number = 250
): ProjectileUpdateResult {
  const activeProjectiles: ProjectileEntity[] = [];
  const hits: HitResult[] = [];

  for (const proj of projectiles) {
    // Integrate position
    proj.x += proj.vx * dtSec;
    proj.y += proj.vy * dtSec;

    const frameDist = Math.hypot(proj.vx, proj.vy) * dtSec;
    proj.distanceTraveled += frameDist;
    proj.lifetimeMs += dtSec * 1000;

    // Check expiration
    if (proj.distanceTraveled >= proj.maxRange || proj.lifetimeMs >= proj.maxLifetimeMs) {
      continue; // Despawn
    }

    let despawnProjectile = false;

    // Check collisions against alive enemies
    for (const enemy of enemies) {
      if (enemy.hp <= 0 || enemy.state === 'dying' || enemy.state === 'spawning') continue;
      if (proj.hitEntityIds.includes(enemy.id)) continue; // Already hit by this projectile

      const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
      if (dist <= proj.radius + enemy.radius) {
        // HIT!
        proj.hitEntityIds.push(enemy.id);

        const kb = calculateKnockbackImpulse({ x: proj.x, y: proj.y }, enemy, proj.knockback);
        hits.push({
          enemyId: enemy.id,
          damage: proj.damage,
          isCrit: proj.isCrit,
          knockback: kb,
        });

        // Pierce check
        if (proj.remainingPierces > 0) {
          proj.remainingPierces--;
          // Continues flight
        } else if (proj.remainingBounces > 0) {
          // Ricochet bounce to closest adjacent alive enemy
          proj.remainingBounces--;
          let nearestCandidate: EnemyEntity | null = null;
          let nearestDist = bounceSearchRadius;

          for (const cand of enemies) {
            if (cand.id === enemy.id || cand.hp <= 0 || proj.hitEntityIds.includes(cand.id)) continue;
            const candDist = Math.hypot(cand.x - proj.x, cand.y - proj.y);
            if (candDist < nearestDist) {
              nearestDist = candDist;
              nearestCandidate = cand;
            }
          }

          if (nearestCandidate) {
            // Re-aim velocity towards next target
            const speed = Math.hypot(proj.vx, proj.vy);
            const bDx = nearestCandidate.x - proj.x;
            const bDy = nearestCandidate.y - proj.y;
            const bLen = Math.hypot(bDx, bDy);
            if (bLen > 0) {
              proj.vx = (bDx / bLen) * speed;
              proj.vy = (bDy / bLen) * speed;
            }
          } else {
            despawnProjectile = true;
            break;
          }
        } else {
          // No pierce or bounce left
          despawnProjectile = true;
          break;
        }
      }
    }

    if (!despawnProjectile) {
      activeProjectiles.push(proj);
    }
  }

  return { activeProjectiles, hits };
}
