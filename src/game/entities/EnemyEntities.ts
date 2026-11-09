/**
 * EnemyEntities.ts - Pure TypeScript Canonical Enemy AI & Entity Architecture
 *
 * Implements the 5 Brotato Enemy Archetypes:
 * 1. Swarmer: Direct pursuit with soft flocking separation.
 * 2. Rusher: Sinusoidal flanker weaving at 280 px/s.
 * 3. Tank / Charger: Slow stalk -> 0.8s telegraph -> 1.2s high-speed dash (400 px/s) with knockback immunity.
 * 4. Ranged Shooter: Distance kiting (350-450px) with 0.5s laser telegraph and bullet fire (240 px/s).
 * 5. Wave Elite / Boss: Multi-phase radial bullet ring, ground slam shockwave, guaranteed loot crate drop.
 */

import type {
  EnemyType,
  EnemyEntity,
  PlayerEntity,
  ProjectileEntity,
  DropTableEntry,
} from '@/types/brotato';

export interface ArenaBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ShockwaveEvent {
  x: number;
  y: number;
  radius: number;
  damage: number;
}

export interface EnemyUpdateResult {
  spawnedProjectiles: ProjectileEntity[];
  shockwaves: ShockwaveEvent[];
}

export const ENEMY_ARCHETYPES: Record<
  EnemyType,
  {
    baseHp: number;
    hpPerWave: number;
    baseDmg: number;
    dmgPerWave: number;
    baseSpeed: number;
    mass: number;
    radius: number;
    spriteName: string;
    isImmuneToKnockback: boolean;
    dropTable: DropTableEntry[];
  }
> = {
  swarmer: {
    baseHp: 4.5,
    hpPerWave: 2.5,
    baseDmg: 1.0,
    dmgPerWave: 0.7,
    baseSpeed: 165,
    mass: 1.0,
    radius: 16,
    spriteName: 'enemy_swarmer',
    isImmuneToKnockback: false,
    dropTable: [
      { type: 'material', baseChance: 1.0, luckScalable: false, valueRange: [1, 1] },
      { type: 'fruit', baseChance: 0.01, luckScalable: true, valueRange: [3, 3] },
      { type: 'chest', baseChance: 0.005, luckScalable: true, valueRange: [1, 1] },
    ],
  },
  rusher: {
    baseHp: 3.5,
    hpPerWave: 1.8,
    baseDmg: 1.2,
    dmgPerWave: 0.7,
    baseSpeed: 260,
    mass: 0.8,
    radius: 14,
    spriteName: 'enemy_rusher',
    isImmuneToKnockback: false,
    dropTable: [
      { type: 'material', baseChance: 1.0, luckScalable: false, valueRange: [1, 1] },
      { type: 'fruit', baseChance: 0.012, luckScalable: true, valueRange: [3, 3] },
      { type: 'chest', baseChance: 0.005, luckScalable: true, valueRange: [1, 1] },
    ],
  },
  tank: {
    baseHp: 26.0,
    hpPerWave: 12.0,
    baseDmg: 3.5,
    dmgPerWave: 1.8,
    baseSpeed: 105,
    mass: 3.0,
    radius: 26,
    spriteName: 'enemy_tank',
    isImmuneToKnockback: false, // Becomes true during charging state
    dropTable: [
      { type: 'material', baseChance: 1.0, luckScalable: false, valueRange: [2, 3] },
      { type: 'fruit', baseChance: 0.02, luckScalable: true, valueRange: [3, 3] },
      { type: 'chest', baseChance: 0.02, luckScalable: true, valueRange: [1, 1] },
    ],
  },
  ranged: {
    baseHp: 8.0,
    hpPerWave: 3.5,
    baseDmg: 2.5,
    dmgPerWave: 1.0,
    baseSpeed: 135,
    mass: 1.2,
    radius: 18,
    spriteName: 'enemy_ranged',
    isImmuneToKnockback: false,
    dropTable: [
      { type: 'material', baseChance: 1.0, luckScalable: false, valueRange: [1, 2] },
      { type: 'fruit', baseChance: 0.015, luckScalable: true, valueRange: [3, 3] },
      { type: 'chest', baseChance: 0.01, luckScalable: true, valueRange: [1, 1] },
    ],
  },
  elite: {
    baseHp: 400.0,
    hpPerWave: 180.0,
    baseDmg: 6.0,
    dmgPerWave: 3.0,
    baseSpeed: 140,
    mass: 5.0,
    radius: 36,
    spriteName: 'enemy_elite',
    isImmuneToKnockback: true,
    dropTable: [
      { type: 'chest', baseChance: 1.0, luckScalable: false, valueRange: [1, 1] },
      { type: 'material', baseChance: 1.0, luckScalable: false, valueRange: [25, 35] },
    ],
  },
};

export function calculateEnemyStats(
  type: EnemyType,
  wave: number,
  dangerMultiplier = 1.0
): { hp: number; dmg: number; speed: number } {
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

let enemyIdCounter = 0;

export function createEnemy(
  type: EnemyType,
  wave: number,
  x: number,
  y: number,
  dangerMultiplier = 1.0
): EnemyEntity {
  const archetype = ENEMY_ARCHETYPES[type];
  const stats = calculateEnemyStats(type, wave, dangerMultiplier);
  enemyIdCounter++;

  return {
    id: `enemy_${type}_${enemyIdCounter}`,
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: stats.hp,
    maxHp: stats.hp,
    damage: stats.dmg,
    speed: stats.speed,
    mass: archetype.mass,
    radius: archetype.radius,
    state: 'spawning',
    stateTimerMs: 400, // Brief spawn fade-in
    isImmuneToKnockback: archetype.isImmuneToKnockback,
    hitFlashTimerMs: 0,
    attackCooldownMs: type === 'tank' ? 2000 : type === 'ranged' ? 2500 : 0,
    facingAngleRad: 0,
    customData: {
      oscillationTimer: Math.random() * 1000,
      phase: 1,
      novaTimerMs: 3000,
      slamTimerMs: 6000,
    },
  };
}

export function updateEnemyAI(
  enemy: EnemyEntity,
  player: PlayerEntity,
  allEnemies: EnemyEntity[],
  dt: number,
  arenaBounds: ArenaBounds
): EnemyUpdateResult {
  const result: EnemyUpdateResult = {
    spawnedProjectiles: [],
    shockwaves: [],
  };

  if (dt <= 0 || enemy.hp <= 0) return result;

  // Handle hit flash decay
  if (enemy.hitFlashTimerMs > 0) {
    enemy.hitFlashTimerMs = Math.max(0, enemy.hitFlashTimerMs - dt * 1000);
  }

  // Handle spawning transition
  if (enemy.state === 'spawning') {
    enemy.stateTimerMs -= dt * 1000;
    if (enemy.stateTimerMs <= 0) {
      enemy.state = 'pursuing';
      enemy.stateTimerMs = 0;
    }
    return result;
  }

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const dirX = dx / dist;
  const dirY = dy / dist;
  enemy.facingAngleRad = Math.atan2(dy, dx);

  switch (enemy.type) {
    case 'swarmer': {
      // Direct pursuit with soft flocking separation
      let sepX = 0;
      let sepY = 0;
      const sepRadius = 36;

      for (const other of allEnemies) {
        if (other.id === enemy.id) continue;
        const ox = enemy.x - other.x;
        const oy = enemy.y - other.y;
        const oDistSq = ox * ox + oy * oy;
        if (oDistSq > 0 && oDistSq < sepRadius * sepRadius) {
          const oDist = Math.sqrt(oDistSq);
          sepX += (ox / oDist) * (1 - oDist / sepRadius);
          sepY += (oy / oDist) * (1 - oDist / sepRadius);
        }
      }

      const desiredX = dirX + sepX * 0.75;
      const desiredY = dirY + sepY * 0.75;
      const dLen = Math.hypot(desiredX, desiredY) || 1;

      enemy.vx = (desiredX / dLen) * enemy.speed;
      enemy.vy = (desiredY / dLen) * enemy.speed;
      break;
    }

    case 'rusher': {
      // Sinusoidal flanker weaving at 260 px/s
      const custom = enemy.customData as { oscillationTimer: number };
      custom.oscillationTimer += dt * 1000;

      if (dist < 60) {
        // Direct sprint when close
        enemy.vx = dirX * enemy.speed;
        enemy.vy = dirY * enemy.speed;
      } else {
        const perpX = -dirY;
        const perpY = dirX;
        const lateralAmp = 120;
        const wave = Math.sin((custom.oscillationTimer * 0.005));
        const lateralX = perpX * lateralAmp * wave;
        const lateralY = perpY * lateralAmp * wave;

        const combinedX = dirX * 220 + lateralX;
        const combinedY = dirY * 220 + lateralY;
        const cLen = Math.hypot(combinedX, combinedY) || 1;

        enemy.vx = (combinedX / cLen) * enemy.speed;
        enemy.vy = (combinedY / cLen) * enemy.speed;
      }
      break;
    }

    case 'tank': {
      // Tank / Charger: Slow stalk (90 px/s) -> 0.8s telegraph -> 1.2s dash (360 px/s)
      if (enemy.state === 'pursuing') {
        enemy.vx = dirX * enemy.speed;
        enemy.vy = dirY * enemy.speed;
        enemy.isImmuneToKnockback = false;

        if (enemy.attackCooldownMs > 0) {
          enemy.attackCooldownMs -= dt * 1000;
        } else if (dist <= 350) {
          // Trigger telegraph
          enemy.state = 'telegraphing';
          enemy.stateTimerMs = 800; // 0.8s
          enemy.targetPosition = { x: player.x, y: player.y };
          enemy.vx = 0;
          enemy.vy = 0;
        }
      } else if (enemy.state === 'telegraphing') {
        enemy.vx = 0;
        enemy.vy = 0;
        enemy.stateTimerMs -= dt * 1000;

        if (enemy.stateTimerMs <= 0) {
          // Launch charge
          enemy.state = 'charging';
          enemy.stateTimerMs = 1200; // 1.2s dash
          enemy.isImmuneToKnockback = true;

          const target = enemy.targetPosition || { x: player.x, y: player.y };
          const cDx = target.x - enemy.x;
          const cDy = target.y - enemy.y;
          const cDist = Math.hypot(cDx, cDy) || 1;
          const chargeSpeed = 360;

          enemy.vx = (cDx / cDist) * chargeSpeed;
          enemy.vy = (cDy / cDist) * chargeSpeed;
        }
      } else if (enemy.state === 'charging') {
        enemy.stateTimerMs -= dt * 1000;

        // Wall collision check during charge
        const atWall =
          enemy.x <= arenaBounds.minX + enemy.radius ||
          enemy.x >= arenaBounds.maxX - enemy.radius ||
          enemy.y <= arenaBounds.minY + enemy.radius ||
          enemy.y >= arenaBounds.maxY - enemy.radius;

        if (enemy.stateTimerMs <= 0 || atWall) {
          enemy.state = 'pursuing';
          enemy.isImmuneToKnockback = false;
          enemy.attackCooldownMs = 2500;
          enemy.vx = 0;
          enemy.vy = 0;
        }
      }
      break;
    }

    case 'ranged': {
      // Ranged Shooter: Distance kiting (350-450px) with 0.5s laser telegraph
      if (enemy.attackCooldownMs > 0) {
        enemy.attackCooldownMs -= dt * 1000;
      }

      if (enemy.state === 'telegraphing') {
        enemy.vx = 0;
        enemy.vy = 0;
        enemy.stateTimerMs -= dt * 1000;

        if (enemy.stateTimerMs <= 0) {
          // Fire bullet
          const bulletSpeed = 240;
          const proj: ProjectileEntity = {
            id: `proj_enemy_${Date.now()}_${Math.random()}`,
            source: 'enemy',
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(enemy.facingAngleRad) * bulletSpeed,
            vy: Math.sin(enemy.facingAngleRad) * bulletSpeed,
            damage: enemy.damage,
            isCrit: false,
            knockback: 5,
            remainingPierces: 0,
            remainingBounces: 0,
            hitEntityIds: [],
            maxRange: 600,
            distanceTraveled: 0,
            lifetimeMs: 0,
            maxLifetimeMs: 3500,
            radius: 6,
            color: '#ef4444',
          };
          result.spawnedProjectiles.push(proj);

          enemy.state = 'pursuing';
          enemy.attackCooldownMs = 2500;
        }
      } else {
        // Kiting positioning
        if (dist < 350) {
          // Retreat
          enemy.state = 'retreating';
          enemy.vx = -dirX * enemy.speed;
          enemy.vy = -dirY * enemy.speed;
        } else if (dist > 450) {
          // Approach
          enemy.state = 'pursuing';
          enemy.vx = dirX * enemy.speed;
          enemy.vy = dirY * enemy.speed;
        } else {
          // Sweet spot: strafe
          enemy.state = 'pursuing';
          enemy.vx = -dirY * (enemy.speed * 0.5);
          enemy.vy = dirX * (enemy.speed * 0.5);
        }

        // Trigger shot telegraph
        if (enemy.attackCooldownMs <= 0 && dist <= 500) {
          enemy.state = 'telegraphing';
          enemy.stateTimerMs = 500; // 0.5s telegraph
          enemy.vx = 0;
          enemy.vy = 0;
        }
      }
      break;
    }

    case 'elite': {
      // Wave Elite / Boss: Multi-phase radial bullet ring & ground slam shockwave
      const custom = enemy.customData as {
        novaTimerMs: number;
        slamTimerMs: number;
        phase: number;
      };

      const isEnraged = enemy.hp < enemy.maxHp * 0.5;
      const speedMult = isEnraged ? 1.2 : 1.0;
      const cooldownMult = isEnraged ? 0.75 : 1.0;

      // Pursuit movement
      enemy.vx = dirX * enemy.speed * speedMult;
      enemy.vy = dirY * enemy.speed * speedMult;

      // Attack 1: Radial Bullet Nova
      custom.novaTimerMs -= dt * 1000;
      if (custom.novaTimerMs <= 0) {
        custom.novaTimerMs = 3000 * cooldownMult;
        const bulletCount = 12;
        const bulletSpeed = 190;

        for (let i = 0; i < bulletCount; i++) {
          const angle = (i * 2 * Math.PI) / bulletCount;
          const proj: ProjectileEntity = {
            id: `proj_boss_${Date.now()}_${i}`,
            source: 'enemy',
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * bulletSpeed,
            vy: Math.sin(angle) * bulletSpeed,
            damage: enemy.damage,
            isCrit: false,
            knockback: 10,
            remainingPierces: 0,
            remainingBounces: 0,
            hitEntityIds: [],
            maxRange: 800,
            distanceTraveled: 0,
            lifetimeMs: 0,
            maxLifetimeMs: 4500,
            radius: 8,
            color: '#dc2626',
          };
          result.spawnedProjectiles.push(proj);
        }
      }

      // Attack 2: Ground Slam Shockwave
      custom.slamTimerMs -= dt * 1000;
      if (custom.slamTimerMs <= 0) {
        custom.slamTimerMs = 6000 * cooldownMult;
        result.shockwaves.push({
          x: enemy.x,
          y: enemy.y,
          radius: 140,
          damage: enemy.damage * 1.5,
        });
      }
      break;
    }
  }

  // Integrate movement & clamp boundary
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;

  enemy.x = Math.max(
    arenaBounds.minX + enemy.radius,
    Math.min(arenaBounds.maxX - enemy.radius, enemy.x)
  );
  enemy.y = Math.max(
    arenaBounds.minY + enemy.radius,
    Math.min(arenaBounds.maxY - enemy.radius, enemy.y)
  );

  return result;
}
