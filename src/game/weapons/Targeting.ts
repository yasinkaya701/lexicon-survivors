/**
 * Targeting.ts
 * Breadth of Brotato Targeting Algorithms
 *
 * Implements:
 * 1. Closest Enemy (default auto-aim)
 * 2. Lowest Health Enemy (finisher focus)
 * 3. Highest Threat Enemy (boss / high-danger priority)
 * 4. Manual Mouse Aim (cursor reticle angle)
 */

import type { EnemyEntity, TargetingMode, EnemyType } from '@/types/brotato';
import type { IVector2D as Vector2D } from '@/game/engine/Vector2D';

export const THREAT_PRIORITIES: Record<EnemyType, number> = {
  elite: 5,   // Wave Elite / Miniboss
  tank: 4,    // Charging golem / heavy bruiser
  ranged: 3,  // Kiting sniper / spit artillery
  rusher: 2,  // Fast flanker
  swarmer: 1, // Basic horde fodder
};

export function getThreatScore(type: EnemyType): number {
  return THREAT_PRIORITIES[type] ?? 0;
}

export function calculateDistance(a: Vector2D, b: Vector2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function calculateAimAngle(from: Vector2D, to: Vector2D): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function isTargetInRange(origin: Vector2D, target: EnemyEntity, effectiveRange: number): boolean {
  const dist = calculateDistance(origin, { x: target.x, y: target.y });
  return dist <= effectiveRange + target.radius;
}

/**
 * Filter enemies alive and within weapon reach.
 */
export function getEnemiesInRange(
  origin: Vector2D,
  effectiveRange: number,
  enemies: EnemyEntity[]
): { enemy: EnemyEntity; dist: number }[] {
  const result: { enemy: EnemyEntity; dist: number }[] = [];
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || enemy.state === 'dying' || enemy.state === 'spawning') continue;
    const dist = calculateDistance(origin, { x: enemy.x, y: enemy.y });
    if (dist <= effectiveRange + enemy.radius) {
      result.push({ enemy, dist });
    }
  }
  return result;
}

/**
 * Selects best enemy target according to current targeting mode.
 */
export function selectTarget(
  mode: TargetingMode,
  origin: Vector2D,
  effectiveRange: number,
  enemies: EnemyEntity[],
  mousePos?: Vector2D
): EnemyEntity | null {
  const candidates = getEnemiesInRange(origin, effectiveRange, enemies);
  if (candidates.length === 0) return null;

  switch (mode) {
    case 'closest': {
      let best = candidates[0];
      for (let i = 1; i < candidates.length; i++) {
        if (candidates[i].dist < best.dist) {
          best = candidates[i];
        }
      }
      return best.enemy;
    }

    case 'lowest_health': {
      let best = candidates[0];
      for (let i = 1; i < candidates.length; i++) {
        const cur = candidates[i];
        if (cur.enemy.hp < best.enemy.hp) {
          best = cur;
        } else if (cur.enemy.hp === best.enemy.hp && cur.dist < best.dist) {
          best = cur; // tie-breaker: closest
        }
      }
      return best.enemy;
    }

    case 'highest_threat': {
      let best = candidates[0];
      let bestScore = getThreatScore(best.enemy.type);
      for (let i = 1; i < candidates.length; i++) {
        const cur = candidates[i];
        const score = getThreatScore(cur.enemy.type);
        if (score > bestScore) {
          best = cur;
          bestScore = score;
        } else if (score === bestScore && cur.dist < best.dist) {
          best = cur; // tie-breaker: closest
        }
      }
      return best.enemy;
    }

    case 'manual': {
      if (!mousePos) return candidates[0].enemy;
      // In manual mode, prioritize the candidate closest to the mouse cursor
      let best = candidates[0];
      let bestMouseDist = calculateDistance(mousePos, { x: best.enemy.x, y: best.enemy.y });
      for (let i = 1; i < candidates.length; i++) {
        const cur = candidates[i];
        const mouseDist = calculateDistance(mousePos, { x: cur.enemy.x, y: cur.enemy.y });
        if (mouseDist < bestMouseDist) {
          best = cur;
          bestMouseDist = mouseDist;
        }
      }
      return best.enemy;
    }

    default:
      return candidates[0].enemy;
  }
}
