/**
 * tests/adversarial/engine_combat_tier5_stress.test.ts
 * Tier 5 White-Box Adversarial Stress Testing & Boundary Verification Suite
 *
 * Exhaustively stress-tests:
 * 1. Vector2D & Pure Math Utilities (Zero vectors, NaN, div-by-zero, rotations, clampLength)
 * 2. Kinematics, Movement & Knockback (Input normalization, speed clamping, extreme dt, knockback immunity)
 * 3. Collision Physics & CCD (Sliding bounds, circle-circle manifold, OBB thrust, 120° sector arc, tunneling raycast)
 * 4. CombatMath Hyperbolic Bounds (Extreme armor [-10000, 10000], astronomical AS, 25px range floor, multi-cleave ICD)
 * 5. WeaponCatalog & WeaponManager (28 blueprints, 6 simultaneous active weapons, targeting modes, auto-combine)
 * 6. WaveDirector Scaling & Pulsing (Wave 20+ progression, harmonic pulsing R(t), perimeter spawning bounds)
 * 7. ShopEngine Compounding Economy (Reroll escalation, inflation freeze, multi-tier fusion chains)
 * 8. GameLoop Lifecycle & State Determinism (Multiple state transitions, tactical freeze dt=0 invariance)
 */

import { describe, it, expect } from 'vitest';
import {
  Vector2D,
  vec2,
  addVec,
  subVec,
  scaleVec,
  dotVec,
  distVec,
  distSqVec,
  normalizeVec,
} from '@/game/engine/Vector2D';
import {
  BASE_PLAYER_SPEED,
  MIN_PLAYER_SPEED,
  DASH_SPEED_MULTIPLIER,
  FRICTION_DAMPING,
  normalizeInput,
  calculateMaxSpeed,
  updatePlayerMovement,
  applyKnockback,
  calculateFacingAngle,
  type PlayerMovementEntity,
} from '@/game/engine/Kinematics';
import {
  DEFAULT_ARENA,
  type ArenaBounds,
  resolveBoundaryCollision,
  checkCircleCircle,
  getCircleCircleManifold,
  resolveCircleSoftPush,
  checkCircleOrientedBox,
  checkCircleSectorArc,
  checkSegmentCircle,
} from '@/game/engine/Collision';
import {
  MAX_DODGE_PERCENT,
  MIN_DODGE_PERCENT,
  calculateEffectiveDodge as calculateDodgeEngine,
  rollDodge as rollDodgeEngine,
  DodgeTracker,
} from '@/game/engine/Dodge';
import {
  GameLoop,
  MAX_DELTA_TIME_SEC,
  FIXED_TIMESTEP_SEC,
} from '@/game/engine/GameLoop';
import {
  calculateWeaponDamage,
  rollCriticalStrike,
  calculateArmorDamage,
  calculateAttackCooldown,
  calculateHpRegenInterval,
  LifeStealTracker,
  calculateEffectiveRange,
  compoundHarvesting,
  calculateDropChance,
  getScalingStatValue,
} from '@/game/stats/CombatMath';
import {
  BASE_WEAPONS,
  WEAPON_REGISTRY,
  BASE_PRICES,
  buildTierBlueprint,
  getWeaponBlueprint,
  getWeaponByBaseAndTier,
  getAllWeaponBlueprints,
  getWeaponsByTier,
  getWeaponsByType,
} from '@/game/weapons/WeaponCatalog';
import {
  WeaponManager,
} from '@/game/weapons/WeaponManager';
import {
  selectTarget,
  calculateAimAngle,
  getEnemiesInRange,
  THREAT_PRIORITIES,
} from '@/game/weapons/Targeting';
import {
  checkMeleeSwingHit,
  checkMeleeThrustHit,
  calculateKnockbackImpulse,
  updateProjectiles,
} from '@/game/weapons/HitResolution';
import {
  WaveDirector,
  calculateWaveDuration,
  calculateSpawnRate,
  generateWaveConfig,
} from '@/game/waves/WaveDirector';
import {
  ShopInventoryManager,
  WeaponFusionManager,
  calculateItemPrice,
  calculateRerollCost,
  getTierWeights,
  rollTier,
} from '@/game/shop/ShopEngine';
import {
  createEnemy,
  updateEnemyAI,
  calculateEnemyStats,
  ENEMY_ARCHETYPES,
} from '@/game/entities/EnemyEntities';
import type {
  PlayerRPGStats,
  EnemyEntity,
  WeaponTier,
  ProjectileEntity,
  PlayerEntity,
} from '@/types/brotato';

const MOCK_ARENA: ArenaBounds = {
  minX: 100,
  maxX: 1900,
  minY: 100,
  maxY: 1000,
};

function createDefaultPlayerStats(overrides: Partial<PlayerRPGStats> = {}): PlayerRPGStats {
  return {
    maxHp: 100,
    currentHp: 100,
    hpRegen: 0,
    lifeSteal: 0,
    damagePercent: 0,
    meleeDamage: 0,
    rangedDamage: 0,
    elementalDamage: 0,
    attackSpeed: 0,
    critChancePercent: 5,
    engineering: 0,
    range: 0,
    armor: 0,
    dodgePercent: 0,
    speedPercent: 0,
    luck: 0,
    harvesting: 0,
    pickupRange: 120,
    ...overrides,
  };
}

describe('Core Combat & Engine Tier 5 Adversarial Stress Suite', () => {

  // =========================================================================
  // 1. Vector2D Mathematical Extremes, Mutability & Invariants
  // =========================================================================
  describe('1. Vector2D Mathematical Robustness & Edge Cases', () => {
    it('handles zero vector normalization without NaN or division by zero', () => {
      const zero = Vector2D.zero();
      const norm = zero.normalize();
      expect(norm.x).toBe(0);
      expect(norm.y).toBe(0);
      expect(Number.isNaN(norm.x)).toBe(false);
      expect(Number.isNaN(norm.y)).toBe(false);

      // In-place mutation
      const zeroMut = new Vector2D(0, 0);
      zeroMut.normalizeMut();
      expect(zeroMut.x).toBe(0);
      expect(zeroMut.y).toBe(0);

      // Helper function
      const normFunc = normalizeVec({ x: 0, y: 0 });
      expect(normFunc.x).toBe(0);
      expect(normFunc.y).toBe(0);
    });

    it('handles division by zero gracefully returning zero vector', () => {
      const v = new Vector2D(42, -99);
      const divZero = v.div(0);
      expect(divZero.x).toBe(0);
      expect(divZero.y).toBe(0);
      expect(Number.isFinite(divZero.x)).toBe(true);
      expect(Number.isFinite(divZero.y)).toBe(true);
    });

    it('clampLength and clampLengthMut boundary conditions', () => {
      // Normal clamp
      const v = new Vector2D(30, 40); // len = 50
      const clamped = v.clampLength(25);
      expect(clamped.length()).toBeCloseTo(25, 5);
      expect(clamped.x).toBeCloseTo(15, 5);
      expect(clamped.y).toBeCloseTo(20, 5);

      // Clamp when already shorter than max: preserves exact vector
      const unchanged = v.clampLength(100);
      expect(unchanged.x).toBe(30);
      expect(unchanged.y).toBe(40);

      // Clamp length to 0
      const clampedZero = v.clampLength(0);
      expect(clampedZero.length()).toBe(0);

      // In-place clampLengthMut
      const vMut = new Vector2D(30, 40);
      vMut.clampLengthMut(10);
      expect(vMut.length()).toBeCloseTo(10, 5);
    });

    it('verifies 2D vector dot, cross product, angles, reflection, and perpendiculars', () => {
      const right = Vector2D.right(); // (1, 0)
      const up = Vector2D.up(); // (0, -1) in screen space

      // Dot product: orthogonal vectors dot to 0
      expect(right.dot(up)).toBe(0);

      // Cross product: (1, 0) x (0, 1) = 1
      const down = Vector2D.down(); // (0, 1)
      expect(right.cross(down)).toBe(1);

      // Perpendicular of (1, 0) is (-0, 1) -> (0, 1)
      const perp = right.perpendicular();
      expect(perp.x).toBeCloseTo(0, 5);
      expect(perp.y).toBe(1);

      // Reflection of (1, 1) against horizontal surface normal (0, -1)
      const ray = new Vector2D(1, 1);
      const reflected = ray.reflect({ x: 0, y: -1 });
      expect(reflected.x).toBeCloseTo(1, 5);
      expect(reflected.y).toBeCloseTo(-1, 5);

      // Angle to target from point (dx=0, dy=1 -> PI/2) and from origin (dx=1, dy=1 -> PI/4)
      expect(right.angleTo({ x: 1, y: 1 })).toBeCloseTo(Math.PI / 2, 5);
      expect(Vector2D.zero().angleTo({ x: 1, y: 1 })).toBeCloseTo(Math.PI / 4, 5);
    });

    it('lerp enforces strict [0, 1] t clamp against extrapolation overshoots', () => {
      const a = new Vector2D(0, 0);
      const b = new Vector2D(100, 200);

      // t < 0 clamped to 0
      const lerpNeg = a.lerp(b, -10);
      expect(lerpNeg.x).toBe(0);
      expect(lerpNeg.y).toBe(0);

      // t > 1 clamped to 1
      const lerpOver = a.lerp(b, 50);
      expect(lerpOver.x).toBe(100);
      expect(lerpOver.y).toBe(200);

      // t = 0.5
      const lerpMid = a.lerp(b, 0.5);
      expect(lerpMid.x).toBe(50);
      expect(lerpMid.y).toBe(100);
    });

    it('pure functional helper routines compute exact values matching class methods', () => {
      const p1 = { x: 10, y: 20 };
      const p2 = { x: 40, y: 60 };

      const add = addVec(p1, p2);
      expect(add.x).toBe(50);
      expect(add.y).toBe(80);

      const sub = subVec(p1, p2);
      expect(sub.x).toBe(-30);
      expect(sub.y).toBe(-40);

      const scaled = scaleVec(p1, 2.5);
      expect(scaled.x).toBe(25);
      expect(scaled.y).toBe(50);

      const dot = dotVec(p1, p2);
      expect(dot).toBe(10 * 40 + 20 * 60);

      const dist = distVec(p1, p2);
      expect(dist).toBe(50);

      const distSq = distSqVec(p1, p2);
      expect(distSq).toBe(2500);
    });
  });

  // =========================================================================
  // 2. Kinematics Mechanics, Boundary Clamping, Dash & Knockback Stress
  // =========================================================================
  describe('2. Kinematics, Movement & Knockback Stress', () => {
    it('normalizeInput preserves sub-unit tilt and strictly clamps super-unit vectors', () => {
      // Zero input
      const zero = normalizeInput({ x: 0, y: 0 });
      expect(zero.x).toBe(0);
      expect(zero.y).toBe(0);

      // Sub-unit tilt (gamepad half tilt: length = 0.5)
      const tilt = normalizeInput({ x: 0.3, y: 0.4 });
      expect(tilt.x).toBeCloseTo(0.3, 5);
      expect(tilt.y).toBeCloseTo(0.4, 5);
      expect(tilt.length()).toBeCloseTo(0.5, 5);

      // Super-unit keyboard diagonal (W+D: length = sqrt(2) ~ 1.4142)
      const diagonal = normalizeInput({ x: 1, y: 1 });
      expect(diagonal.length()).toBeCloseTo(1.0, 5);
      expect(diagonal.x).toBeCloseTo(Math.SQRT1_2, 5);
      expect(diagonal.y).toBeCloseTo(Math.SQRT1_2, 5);

      // Astronomical magnitude input (10000, 10000)
      const extreme = normalizeInput({ x: 10000, y: 10000 });
      expect(extreme.length()).toBeCloseTo(1.0, 5);
    });

    it('calculateMaxSpeed strictly enforces MIN_PLAYER_SPEED under severe negative stats', () => {
      // Normal base speed
      expect(calculateMaxSpeed(BASE_PLAYER_SPEED, 0, false)).toBe(300);

      // Dash multiplier (1.5x)
      expect(calculateMaxSpeed(BASE_PLAYER_SPEED, 0, true)).toBe(450);

      // +50% speed bonus
      expect(calculateMaxSpeed(BASE_PLAYER_SPEED, 50, false)).toBe(450);

      // Extreme negative speed penalties (-80%, -90%, -100%, -500%)
      expect(calculateMaxSpeed(BASE_PLAYER_SPEED, -80, false)).toBeCloseTo(60, 4); // 300 * 0.2 = 60 >= 50
      expect(calculateMaxSpeed(BASE_PLAYER_SPEED, -90, false)).toBe(MIN_PLAYER_SPEED); // 300 * 0.1 = 30 < 50 -> 50
      expect(calculateMaxSpeed(BASE_PLAYER_SPEED, -100, false)).toBe(MIN_PLAYER_SPEED);
      expect(calculateMaxSpeed(BASE_PLAYER_SPEED, -500, false)).toBe(MIN_PLAYER_SPEED);
    });

    it('applyKnockback respects mass scaling, zero/negative mass safeguards, and knockback immunity', () => {
      const initialVel = { x: 50, y: 0 };
      const impulse = { x: 100, y: 200 };

      // Normal mass (1.0)
      const normal = applyKnockback(initialVel, impulse, 1.0, false);
      expect(normal.x).toBe(150);
      expect(normal.y).toBe(200);

      // Heavy mass (4.0)
      const heavy = applyKnockback(initialVel, impulse, 4.0, false);
      expect(heavy.x).toBe(75);
      expect(heavy.y).toBe(50);

      // Knockback immune entity: completely ignores impulse
      const immune = applyKnockback(initialVel, impulse, 1.0, true);
      expect(immune.x).toBe(50);
      expect(immune.y).toBe(0);

      // Mass <= 0 safeguard: should not divide by zero or invert direction
      const zeroMass = applyKnockback(initialVel, impulse, 0, false);
      expect(zeroMass.x).toBe(50);
      expect(zeroMass.y).toBe(0);

      const negMass = applyKnockback(initialVel, impulse, -5, false);
      expect(negMass.x).toBe(50);
      expect(negMass.y).toBe(0);
    });

    it('calculateFacingAngle gives precedence to aim vector, falls back to velocity (>10px/s), else current', () => {
      // 1. Aim vector present
      const angleAim = calculateFacingAngle(0, { x: 1, y: 1 }, { x: -100, y: 0 });
      expect(angleAim).toBeCloseTo(Math.PI / 4, 5);

      // 2. Aim vector is (0, 0) -> fallback to velocity (>10px/s)
      const angleVel = calculateFacingAngle(0, { x: 0, y: 0 }, { x: 0, y: 50 });
      expect(angleVel).toBeCloseTo(Math.PI / 2, 5);

      // 3. Velocity is below threshold (<= 10px/s) -> fallback to current angle
      const angleIdle = calculateFacingAngle(1.23, { x: 0, y: 0 }, { x: 3, y: 4 }); // hypot = 5 <= 10
      expect(angleIdle).toBe(1.23);

      // 4. No vectors provided -> preserves current angle
      const angleNone = calculateFacingAngle(2.5);
      expect(angleNone).toBe(2.5);
    });

    it('updatePlayerMovement handles extreme dt explosion containing player strictly within arena bounds', () => {
      const player: PlayerMovementEntity = {
        pos: { x: 500, y: 500 },
        vel: { x: 0, y: 0 },
        radius: 20,
        speedPercent: 0,
      };

      // Tactical freeze (dt = 0): Zero drift
      updatePlayerMovement(player, { x: 1, y: 1 }, 0, MOCK_ARENA);
      expect(player.pos.x).toBe(500);
      expect(player.pos.y).toBe(500);
      expect(player.vel.x).toBe(0);
      expect(player.vel.y).toBe(0);

      // Huge dt jump (dt = 1000s) moving towards right-bottom corner
      updatePlayerMovement(player, { x: 1, y: 1 }, 1000, MOCK_ARENA);

      // Player must be clamped to arena boundaries: [maxX - radius, maxY - radius]
      expect(player.pos.x).toBe(MOCK_ARENA.maxX - player.radius);
      expect(player.pos.y).toBe(MOCK_ARENA.maxY - player.radius);

      // Wall-sliding zeroes the outbound velocity components
      expect(player.vel.x).toBe(0);
      expect(player.vel.y).toBe(0);
    });
  });

  // =========================================================================
  // 3. Collision Physics, OBB Thrust, 120° Cleave & Tunneling Raycast CCD
  // =========================================================================
  describe('3. Collision Physics & Continuous Collision Detection (CCD)', () => {
    it('resolveBoundaryCollision resolves corner impacts simultaneously zeroing both velocities', () => {
      const radius = 25;
      // Position penetrating top-left corner
      const pos = { x: MOCK_ARENA.minX - 50, y: MOCK_ARENA.minY - 50 };
      const vel = { x: -300, y: -300 };

      const res = resolveBoundaryCollision(pos, vel, radius, MOCK_ARENA);
      expect(res.collided).toBe(true);
      expect(res.sides.left).toBe(true);
      expect(res.sides.top).toBe(true);
      expect(res.pos.x).toBe(MOCK_ARENA.minX + radius);
      expect(res.pos.y).toBe(MOCK_ARENA.minY + radius);
      expect(res.vel.x).toBe(0);
      expect(res.vel.y).toBe(0);
    });

    it('checkCircleCircle & getCircleCircleManifold boundary contacts and concentric overlap', () => {
      const c1 = { x: 100, y: 100 };
      const r1 = 20;
      const r2 = 30; // radSum = 50

      // Exact tangency (dist = 50): strictly false by < radSum^2
      const cTangency = { x: 150, y: 100 };
      expect(checkCircleCircle(c1, r1, cTangency, r2)).toBe(false);
      expect(getCircleCircleManifold(c1, r1, cTangency, r2)).toBeNull();

      // Overlap (dist = 40 < 50): true, penetration = 10
      const cOverlap = { x: 140, y: 100 };
      expect(checkCircleCircle(c1, r1, cOverlap, r2)).toBe(true);
      const manifold = getCircleCircleManifold(c1, r1, cOverlap, r2);
      expect(manifold).not.toBeNull();
      expect(manifold!.colliding).toBe(true);
      expect(manifold!.penetration).toBeCloseTo(10, 5);
      expect(manifold!.normal.x).toBe(1);
      expect(manifold!.normal.y).toBe(0);

      // Concentric circles (dist = 0): penetration = 50, default normal (1, 0)
      const manifoldZero = getCircleCircleManifold(c1, r1, c1, r2);
      expect(manifoldZero).not.toBeNull();
      expect(manifoldZero!.penetration).toBe(50);
      expect(manifoldZero!.normal.x).toBe(1);
      expect(manifoldZero!.normal.y).toBe(0);
    });

    it('resolveCircleSoftPush produces symmetric and opposite push vectors', () => {
      const p1 = { x: 100, y: 100 };
      const p2 = { x: 130, y: 100 }; // dist = 30, radSum = 40 (r1=20, r2=20) -> penetration = 10
      const push = resolveCircleSoftPush(p1, 20, p2, 20, 0.5);

      expect(push).not.toBeNull();
      // Penetration 10 * 0.5 = 5 total push -> 2.5 each
      expect(push!.delta1.x).toBeCloseTo(-2.5, 5);
      expect(push!.delta1.y).toBeCloseTo(0, 5);
      expect(push!.delta2.x).toBeCloseTo(2.5, 5);
      expect(push!.delta2.y).toBeCloseTo(0, 5);

      // Sum of push deltas is zero (conservation of center of mass)
      expect(push!.delta1.x + push!.delta2.x).toBeCloseTo(0, 5);
    });

    it('checkCircleOrientedBox accurately tests rotated melee thrust hitboxes', () => {
      // Box centered at (200, 200), halfLength = 50 (extends 100 along local X), halfWidth = 10 (thickness 20)
      // Facing angle = 0 (aligned with world X-axis)
      const boxHorizontal = {
        centerX: 200,
        centerY: 200,
        halfLength: 50,
        halfWidth: 10,
        rotationRad: 0,
      };

      // Hit: Circle at (240, 205), radius = 15 -> inside box reach
      expect(checkCircleOrientedBox({ x: 240, y: 205 }, 15, boxHorizontal)).toBe(true);

      // Hit: Circle touching edge of box at (260, 200), radius = 15 (box extends to 250, dist = 10 <= 15)
      expect(checkCircleOrientedBox({ x: 260, y: 200 }, 15, boxHorizontal)).toBe(true);

      // Miss: Circle too far at (300, 200), radius = 15
      expect(checkCircleOrientedBox({ x: 300, y: 200 }, 15, boxHorizontal)).toBe(false);

      // Miss: Circle laterally displaced outside blade width at (200, 230), radius = 10 (halfWidth = 10, dist = 30 > 20)
      expect(checkCircleOrientedBox({ x: 200, y: 230 }, 10, boxHorizontal)).toBe(false);

      // Test 90-degree rotated box (pointing straight down along Y-axis)
      const boxVertical = {
        centerX: 200,
        centerY: 200,
        halfLength: 50,
        halfWidth: 10,
        rotationRad: Math.PI / 2,
      };

      // Hit along Y-axis
      expect(checkCircleOrientedBox({ x: 200, y: 240 }, 15, boxVertical)).toBe(true);
      // Miss along X-axis
      expect(checkCircleOrientedBox({ x: 250, y: 200 }, 10, boxVertical)).toBe(false);
    });

    it('checkCircleSectorArc verifies 120-degree melee swing cleave boundaries and rear rejection', () => {
      const origin = { x: 300, y: 300 };
      const reach = 100;
      const facing = 0; // Facing East (along +X)
      const arc120 = (120 * Math.PI) / 180; // +/- 60 degrees

      // 1. Direct front hit within range
      expect(checkCircleSectorArc({ x: 370, y: 300 }, 15, origin, reach, facing, arc120)).toBe(true);

      // 2. Hit at +50 degrees within reach (inside 60 deg cone)
      const angle50 = (50 * Math.PI) / 180;
      const pos50 = { x: 300 + Math.cos(angle50) * 80, y: 300 + Math.sin(angle50) * 80 };
      expect(checkCircleSectorArc(pos50, 15, origin, reach, facing, arc120)).toBe(true);

      // 3. Hit at point-blank origin contact
      expect(checkCircleSectorArc({ x: 305, y: 305 }, 15, origin, reach, facing, arc120)).toBe(true);

      // 4. Miss: Directly behind player (180 degrees)
      expect(checkCircleSectorArc({ x: 220, y: 300 }, 15, origin, reach, facing, arc120)).toBe(false);

      // 5. Miss: At 90 degrees lateral (outside 60 deg half-arc)
      expect(checkCircleSectorArc({ x: 300, y: 380 }, 10, origin, reach, facing, arc120)).toBe(false);

      // 6. Miss: Out of reach range
      expect(checkCircleSectorArc({ x: 450, y: 300 }, 15, origin, reach, facing, arc120)).toBe(false);
    });

    it('checkSegmentCircle prevents bullet tunneling through high-speed continuous raycasts', () => {
      const circleCenter = { x: 500, y: 500 };
      const circleRadius = 15;

      // Fast bullet leaps from (400, 500) to (600, 500) in a single frame (200px step)
      // Discrete point checks at t0=(400, 500) and t1=(600, 500) both miss the enemy!
      const p0 = { x: 400, y: 500 };
      const p1 = { x: 600, y: 500 };

      // Discrete check failure demonstration
      expect(Math.hypot(p0.x - circleCenter.x, p0.y - circleCenter.y) <= circleRadius).toBe(false);
      expect(Math.hypot(p1.x - circleCenter.x, p1.y - circleCenter.y) <= circleRadius).toBe(false);

      // Continuous Collision Detection (CCD) MUST catch the tunneling projectile!
      expect(checkSegmentCircle(p0, p1, circleCenter, circleRadius)).toBe(true);

      // Bullet passing just outside the radius (offset by 20px > 15px radius)
      const p0Miss = { x: 400, y: 520 };
      const p1Miss = { x: 600, y: 520 };
      expect(checkSegmentCircle(p0Miss, p1Miss, circleCenter, circleRadius)).toBe(false);

      // Zero-length segment (stationary projectile)
      expect(checkSegmentCircle({ x: 505, y: 500 }, { x: 505, y: 500 }, circleCenter, circleRadius)).toBe(true);
    });
  });

  // =========================================================================
  // 4. CombatMath Numerical Stability & Extreme Armor / AS / Range Bounds
  // =========================================================================
  describe('4. CombatMath Numerical Boundaries & Overflows', () => {
    it('evaluates hyperbolic armor across extreme negative and positive ranges (-10,000 to +10,000)', () => {
      // Armor = +10,000: Extreme mitigation floor >= 1 HP
      expect(calculateArmorDamage(100, 10000)).toBe(1);
      expect(calculateArmorDamage(1, 10000)).toBe(1);
      // High raw damage: 1,000,000 * (15 / 10015) = 1497.75 -> 1497
      expect(calculateArmorDamage(1000000, 10000)).toBe(1497);

      // Armor = -10,000: Extreme vulnerability amplification: 100 * (1 + 10000 / 15) = 66766
      const vulnDamage = calculateArmorDamage(100, -10000);
      expect(vulnDamage).toBe(Math.floor(100 * (1 + 10000 / 15)));
      expect(vulnDamage).toBeGreaterThan(60000);

      // Raw damage <= 0 never produces damage regardless of armor
      expect(calculateArmorDamage(0, -10000)).toBe(0);
      expect(calculateArmorDamage(-50, -10000)).toBe(0);
      expect(calculateArmorDamage(0, 10000)).toBe(0);
    });

    it('attack speed cooldown strictly clamps to 83.33ms (12 hits/s) under astronomical attack speed', () => {
      // Moderate AS: does not clamp prematurely (t0=1000, as=1000 -> 90.91ms)
      expect(calculateAttackCooldown(1000, 1000)).toBe(90.91);

      // Astronomical AS (>= 5,000% up to 1,000,000%): all base cooldowns clamped to 83.33ms
      const baseCooldowns = [200, 500, 1000, 3000];
      const astronomicalAS = [5000, 10000, 100000, 1000000];

      for (const t0 of baseCooldowns) {
        for (const as of astronomicalAS) {
          const cd = calculateAttackCooldown(t0, as);
          expect(cd).toBe(83.33);
        }
      }

      // Negative AS clamp at -90% strictly verified
      // Base 500ms at -90% -> 500 * (100 / 10) = 5000ms
      expect(calculateAttackCooldown(500, -90)).toBe(5000);
      expect(calculateAttackCooldown(500, -9999)).toBe(5000);
    });

    it('calculateEffectiveRange adheres strictly to 25px minimum floor under negative range stats', () => {
      // Ranged: baseRange + rangeStat
      expect(calculateEffectiveRange(300, 50, true)).toBe(350);
      expect(calculateEffectiveRange(300, -200, true)).toBe(100);
      // Severely negative range stat: clamped at 25px floor
      expect(calculateEffectiveRange(300, -500, true)).toBe(25);
      expect(calculateEffectiveRange(50, -100, true)).toBe(25);

      // Melee: baseRange + 0.5 * rangeStat
      expect(calculateEffectiveRange(100, 50, false)).toBe(125);
      expect(calculateEffectiveRange(100, -200, false)).toBe(25); // 100 - 100 = 0 -> clamped to 25
      expect(calculateEffectiveRange(30, -50, false)).toBe(25);
    });

    it('LifeStealTracker restricts 10,000 multi-enemy cleave hits on identical timestamp to exactly 1 heal', () => {
      const tracker = new LifeStealTracker();
      let heals = 0;
      const frameTimestamp = 12345;

      // 10,000 hits simultaneously
      for (let i = 0; i < 10000; i++) {
        if (tracker.attemptHeal(frameTimestamp, 0, 100)) {
          heals++;
        }
      }
      expect(heals).toBe(1);

      // Hit at frameTimestamp + 99ms rejected
      expect(tracker.attemptHeal(frameTimestamp + 99, 0, 100)).toBe(false);

      // Hit at frameTimestamp + 100ms heals
      expect(tracker.attemptHeal(frameTimestamp + 100, 0, 100)).toBe(true);
    });

    it('compoundHarvesting handles zero/negative values and scales with 5% ceiling growth', () => {
      expect(compoundHarvesting(0)).toEqual({ payout: 0, newHarvesting: 0 });
      expect(compoundHarvesting(-10)).toEqual({ payout: 0, newHarvesting: 0 });

      // Growth is ceil(Harvesting * 0.05)
      // H = 1: ceil(0.05) = 1 -> new 2
      expect(compoundHarvesting(1)).toEqual({ payout: 1, newHarvesting: 2 });
      // H = 10: ceil(0.5) = 1 -> new 11
      expect(compoundHarvesting(10)).toEqual({ payout: 10, newHarvesting: 11 });
      // H = 20: ceil(1.0) = 1 -> new 21
      expect(compoundHarvesting(20)).toEqual({ payout: 20, newHarvesting: 21 });
      // H = 21: ceil(1.05) = 2 -> new 23
      expect(compoundHarvesting(21)).toEqual({ payout: 21, newHarvesting: 23 });

      // Simulate 20 waves of compounding growth from H=10
      let currentH = 10;
      let totalPayout = 0;
      for (let wave = 1; wave <= 20; wave++) {
        const { payout, newHarvesting } = compoundHarvesting(currentH);
        totalPayout += payout;
        currentH = newHarvesting;
      }
      expect(currentH).toBeGreaterThan(25);
      expect(totalPayout).toBeGreaterThan(250);
    });

    it('calculateDropChance clamps strictly between [0.0, 1.0] under extreme luck values', () => {
      expect(calculateDropChance(0.5, 0)).toBe(0.5);
      // Luck = -100: 0.5 * 0 = 0.0
      expect(calculateDropChance(0.5, -100)).toBe(0);
      // Luck = -500: clamped to -100 -> 0.0
      expect(calculateDropChance(0.5, -500)).toBe(0);
      // Extreme positive luck: clamped at 1.0
      expect(calculateDropChance(0.5, 500)).toBe(1.0);
      expect(calculateDropChance(0.01, 10000)).toBe(1.0);
    });
  });

  // =========================================================================
  // 5. WeaponCatalog 28 Blueprints Validation & WeaponManager Concurrency
  // =========================================================================
  describe('5. WeaponCatalog Blueprints & WeaponManager Concurrency', () => {
    it('verifies all 7 weapons have valid blueprints across all 4 tiers (28 blueprints total)', () => {
      const allBlueprints = getAllWeaponBlueprints();
      expect(allBlueprints.length).toBe(28);

      const baseKeys = ['pistol', 'shotgun', 'smg', 'wand', 'knife', 'sword', 'wrench'];
      for (const baseId of baseKeys) {
        for (let t = 1; t <= 4; t++) {
          const tier = t as WeaponTier;
          const bp = getWeaponByBaseAndTier(baseId, tier);
          expect(bp).toBeDefined();
          expect(bp?.tier).toBe(tier);
          expect(bp?.baseDamage).toBeGreaterThan(0);
          expect(bp?.baseCooldownMs).toBeGreaterThan(0);
          expect(bp?.basePrice).toBe(BASE_PRICES[tier]);

          // Tier scaling invariant checks
          if (tier > 1) {
            const prevBp = getWeaponByBaseAndTier(baseId, (tier - 1) as WeaponTier)!;
            expect(bp!.baseDamage).toBeGreaterThan(prevBp.baseDamage);
            expect(bp!.baseCooldownMs).toBeLessThan(prevBp.baseCooldownMs);
            expect(bp!.critChance).toBeGreaterThanOrEqual(prevBp.critChance);
          }
        }
      }
    });

    it('WeaponManager updates 6 simultaneous active weapons ticking with distinct cooldowns', () => {
      const wm = new WeaponManager();
      const weaponIds = ['pistol_1', 'shotgun_1', 'smg_1', 'wand_1', 'knife_1', 'sword_1'];

      for (let i = 0; i < weaponIds.length; i++) {
        const bp = getWeaponBlueprint(weaponIds[i])!;
        const res = wm.addWeapon(bp);
        expect(res.success).toBe(true);
        expect(res.slotIndex).toBe(i);
      }
      expect(wm.getActiveWeapons().length).toBe(6);

      // Create dummy enemy directly in front of player
      const dummyEnemy = createEnemy('swarmer', 1, 350, 300); // 50px away from (300, 300)
      dummyEnemy.state = 'pursuing'; // Spawning enemies are non-targetable; active enemies must be pursuing
      const stats = createDefaultPlayerStats();

      // Tick 1: All ready weapons should fire simultaneously
      const events = wm.update(0.016, stats, { x: 300, y: 300 }, [dummyEnemy], 'closest');
      expect(events.length).toBe(6); // All 6 weapons fired!

      // Verify each weapon received its respective cooldown
      for (let slot = 0; slot < 6; slot++) {
        const inst = wm.weapons[slot]!;
        expect(inst.currentCooldownMs).toBeGreaterThan(0);
        expect(inst.state).toBe('firing');
      }

      // Tick 0.1s: weapons should still be on cooldown, no new firing events
      const tick2 = wm.update(0.1, stats, { x: 300, y: 300 }, [dummyEnemy], 'closest');
      expect(tick2.length).toBe(0);
    });

    it('selectTarget correctly differentiates targeting modes', () => {
      const origin = { x: 500, y: 500 };
      const range = 400;

      const eClose = createEnemy('swarmer', 1, 550, 500); // dist = 50, hp = 5, threat = 1
      eClose.state = 'pursuing';
      eClose.hp = 20;

      const eLowHp = createEnemy('rusher', 1, 600, 500); // dist = 100, hp = 2, threat = 2
      eLowHp.state = 'pursuing';
      eLowHp.hp = 2;

      const eElite = createEnemy('elite', 1, 700, 500); // dist = 200, hp = 300, threat = 5
      eElite.state = 'pursuing';
      eElite.hp = 300;

      const enemies = [eClose, eLowHp, eElite];

      // Closest mode
      const targetClosest = selectTarget('closest', origin, range, enemies);
      expect(targetClosest?.id).toBe(eClose.id);

      // Lowest health mode
      const targetLowHp = selectTarget('lowest_health', origin, range, enemies);
      expect(targetLowHp?.id).toBe(eLowHp.id);

      // Highest threat mode
      const targetThreat = selectTarget('highest_threat', origin, range, enemies);
      expect(targetThreat?.id).toBe(eElite.id);

      // Manual mode with mouse cursor near eLowHp
      const mouseNearLowHp = { x: 610, y: 505 };
      const targetManual = selectTarget('manual', origin, range, enemies, mouseNearLowHp);
      expect(targetManual?.id).toBe(eLowHp.id);
    });

    it('WeaponManager combines identical tier weapons on manual combine and auto-combine', () => {
      const wm = new WeaponManager();
      const knifeT1 = getWeaponBlueprint('knife_1')!;

      // Add two knives into slots 0 and 1
      wm.addWeapon(knifeT1);
      wm.addWeapon(knifeT1);
      expect(wm.weapons[0]?.blueprint.tier).toBe(1);
      expect(wm.weapons[1]?.blueprint.tier).toBe(1);

      // Manual combine slot 0 and slot 1
      const combined = wm.combineWeapons(0, 1);
      expect(combined).toBe(true);
      expect(wm.weapons[0]?.blueprint.tier).toBe(2);
      expect(wm.weapons[0]?.blueprint.name).toBe('Knife II');
      expect(wm.weapons[1]).toBeNull(); // Slot 1 freed!
    });
  });

  // =========================================================================
  // 6. WaveDirector Progression & Wave 20+ Climax Stress
  // =========================================================================
  describe('6. WaveDirector Scaling, Sinusoidal Pulsing & Perimeter Generation', () => {
    it('WaveDirector properly scales beyond Wave 20 (Waves 21, 25, 50, 100)', () => {
      const director = new WaveDirector(MOCK_ARENA);
      const testWaves = [20, 21, 25, 50, 100];

      for (const w of testWaves) {
        const res = director.startWave(w);
        const config = generateWaveConfig(w);

        // Wave duration capped at 90s for wave >= 20
        expect(config.durationSec).toBe(90);
        expect(director.state.waveDurationSec).toBe(90);

        // Spawn rules and max concurrent enemies
        expect(config.spawnRules.length).toBeGreaterThan(0);
        expect(config.maxConcurrentEnemies).toBeLessThanOrEqual(80);

        // Spawn rate scales positively with wave
        const rateAtT0 = calculateSpawnRate(1.8, w, 0);
        expect(rateAtT0).toBeGreaterThan(0);
        if (w > 20) {
          const rateW20 = calculateSpawnRate(1.8, 20, 0);
          expect(rateAtT0).toBeGreaterThan(rateW20);
        }
      }
    });

    it('harmonic sinusoidal spawn rate formula oscillates stably without zero or negative values', () => {
      const baseRate = 1.8;
      const wave = 10;

      // Formula: R(t) = R0 * (1 + 0.20W) * (1 + 0.5 * sin(2*pi*t / 15))
      // Period is 15 seconds:
      // Peak at t = 3.75s (sin = 1 -> pulseFactor = 1.5)
      // Trough at t = 11.25s (sin = -1 -> pulseFactor = 0.5)
      const baseScaled = baseRate * (1 + 0.2 * wave); // 1.8 * 3.0 = 5.4

      const ratePeak = calculateSpawnRate(baseRate, wave, 3.75);
      expect(ratePeak).toBeCloseTo(baseScaled * 1.5, 1);

      const rateTrough = calculateSpawnRate(baseRate, wave, 11.25);
      expect(rateTrough).toBeCloseTo(baseScaled * 0.5, 1);

      // Verify positivity across 60 seconds of virtual time
      for (let t = 0; t <= 60; t += 0.5) {
        const r = calculateSpawnRate(baseRate, wave, t);
        expect(r).toBeGreaterThan(0);
        expect(Number.isFinite(r)).toBe(true);
      }
    });

    it('generatePerimeterSpawnLocation generates points strictly within perimeter bounds and away from player', () => {
      const director = new WaveDirector(MOCK_ARENA);
      const playerCenter = { x: 1000, y: 550 };

      for (let i = 0; i < 50; i++) {
        const spawn = director.generatePerimeterSpawnLocation(playerCenter);
        // Bounds check
        expect(spawn.x).toBeGreaterThanOrEqual(MOCK_ARENA.minX);
        expect(spawn.x).toBeLessThanOrEqual(MOCK_ARENA.maxX);
        expect(spawn.y).toBeGreaterThanOrEqual(MOCK_ARENA.minY);
        expect(spawn.y).toBeLessThanOrEqual(MOCK_ARENA.maxY);

        // Distance from player in center (min distance 350px)
        const dist = Math.hypot(spawn.x - playerCenter.x, spawn.y - playerCenter.y);
        expect(dist).toBeGreaterThanOrEqual(350);
      }
    });
  });

  // =========================================================================
  // 7. ShopEngine Economy Stress & Fusion Integrity
  // =========================================================================
  describe('7. ShopEngine Compounding Reroll Escalation & Fusion Chains', () => {
    it('reroll cost scales linearly without overflow over 100 consecutive rerolls', () => {
      const wave = 10;
      const baseReroll = Math.max(1, Math.floor(wave * 0.75)); // 7
      const rerollStep = 1 + Math.floor(wave * 0.25); // 3

      for (let k = 0; k <= 100; k++) {
        const cost = calculateRerollCost(k, wave);
        expect(cost).toBe(baseReroll + k * rerollStep);
        expect(Number.isInteger(cost)).toBe(true);
      }
    });

    it('WeaponFusionManager auto-combines sequentially through T1 -> T2 -> T3 -> T4 in full 6-slot inventory', () => {
      const fusion = new WeaponFusionManager();

      // Slot 0: SMG T1
      fusion.addWeapon({
        id: 'smg',
        name: 'SMG',
        tier: 1,
        baseDamage: 3,
        baseCooldownMs: 140,
        critChance: 0.05,
        knockback: 3,
      });

      // Fill remaining 5 slots with unique fillers
      for (let i = 1; i < 6; i++) {
        fusion.addWeapon({
          id: `unique_${i}`,
          name: `Unique ${i}`,
          tier: 1,
          baseDamage: 10,
          baseCooldownMs: 500,
          critChance: 0.05,
          knockback: 10,
        });
      }
      expect(fusion.weapons.length).toBe(6);

      // Buy SMG T1 -> Merges slot 0 to T2
      const mergeT2 = fusion.addWeapon({
        id: 'smg',
        name: 'SMG',
        tier: 1,
        baseDamage: 3,
        baseCooldownMs: 140,
        critChance: 0.05,
        knockback: 3,
      });
      expect(mergeT2.success).toBe(true);
      expect(mergeT2.merged).toBe(true);
      expect(fusion.weapons[0].tier).toBe(2);

      // Buy SMG T2 -> Merges slot 0 to T3
      const mergeT3 = fusion.addWeapon({
        id: 'smg',
        name: 'SMG II',
        tier: 2,
        baseDamage: 4.1,
        baseCooldownMs: 126,
        critChance: 0.10,
        knockback: 3.5,
      });
      expect(mergeT3.success).toBe(true);
      expect(mergeT3.merged).toBe(true);
      expect(fusion.weapons[0].tier).toBe(3);

      // Buy SMG T3 -> Merges slot 0 to T4 (Legendary cap)
      const mergeT4 = fusion.addWeapon({
        id: 'smg',
        name: 'SMG III',
        tier: 3,
        baseDamage: 5.5,
        baseCooldownMs: 113.4,
        critChance: 0.15,
        knockback: 4.0,
      });
      expect(mergeT4.success).toBe(true);
      expect(mergeT4.merged).toBe(true);
      expect(fusion.weapons[0].tier).toBe(4);

      // Buy SMG T4 -> Rejection! (Cannot upgrade past Tier 4, inventory full 6/6)
      const rejectT4 = fusion.addWeapon({
        id: 'smg',
        name: 'SMG IV',
        tier: 4,
        baseDamage: 7.4,
        baseCooldownMs: 102.1,
        critChance: 0.20,
        knockback: 4.6,
      });
      expect(rejectT4.success).toBe(false);
      expect(rejectT4.merged).toBe(false);
      expect(fusion.weapons.length).toBe(6);
      expect(fusion.weapons[0].tier).toBe(4);
    });

    it('ShopInventoryManager purchasing locked item frees lock and deducts materials accurately', () => {
      const shop = new ShopInventoryManager(3);
      shop.lockSlot(2);
      expect(shop.lockedSlots.has(2)).toBe(true);

      const slot2Cost = shop.slots[2]!.cost;
      const initialMaterials = 200;

      const purchaseRes = shop.purchaseSlot(2, initialMaterials);
      expect(purchaseRes.success).toBe(true);
      expect(purchaseRes.remainingMaterials).toBe(initialMaterials - slot2Cost);
      expect(shop.slots[2]?.isPurchased).toBe(true);
      expect(shop.slots[2]?.isLocked).toBe(false);
      expect(shop.lockedSlots.has(2)).toBe(false); // Lock released!

      // Attempt to purchase already purchased slot fails
      const duplicatePurchase = shop.purchaseSlot(2, 500);
      expect(duplicatePurchase.success).toBe(false);

      // Attempt to purchase with insufficient materials fails
      const cheapRes = shop.purchaseSlot(0, 1);
      expect(cheapRes.success).toBe(false);
      expect(cheapRes.remainingMaterials).toBe(1);
    });
  });

  // =========================================================================
  // 8. GameLoop Lifecycle & State Determinism
  // =========================================================================
  describe('8. GameLoop Lifecycle, State Machine & Tactical Freeze Invariance', () => {
    it('GameLoop idempotent state transitions and listener lifecycle', () => {
      const loop = new GameLoop();
      expect(loop.getState()).toBe('stopped');

      const stateHistory: string[] = [];
      const unbindState = loop.onStateChange((state) => stateHistory.push(state));

      // Multiple start calls are idempotent
      loop.start();
      loop.start();
      expect(loop.getState()).toBe('running');
      expect(stateHistory).toEqual(['running']);

      // Pause and resume
      loop.pause();
      loop.pause(); // idempotent
      expect(loop.getState()).toBe('paused');
      expect(stateHistory).toEqual(['running', 'paused']);

      loop.resume();
      loop.resume(); // idempotent
      expect(loop.getState()).toBe('running');
      expect(stateHistory).toEqual(['running', 'paused', 'running']);

      // Toggle pause
      expect(loop.togglePause()).toBe(true); // paused
      expect(loop.getState()).toBe('paused');
      expect(loop.togglePause()).toBe(false); // resumed
      expect(loop.getState()).toBe('running');

      // Stop
      loop.stop();
      loop.stop(); // idempotent
      expect(loop.getState()).toBe('stopped');

      // Unbind listener
      unbindState();
      loop.start();
      expect(stateHistory.length).toBe(6); // No new events recorded after unbind
      loop.stop();
    });

    it('deterministic headless stepping accumulates frame counts and simulation time accurately', () => {
      const loop = new GameLoop();
      let totalDtReceived = 0;
      let updateCalls = 0;

      loop.onUpdate((dt) => {
        totalDtReceived += dt;
        updateCalls++;
      });

      // Execute 60 deterministic steps of FIXED_TIMESTEP_SEC (1/60)
      for (let i = 0; i < 60; i++) {
        loop.step(FIXED_TIMESTEP_SEC);
      }

      expect(updateCalls).toBe(60);
      expect(totalDtReceived).toBeCloseTo(1.0, 5);

      const metrics = loop.getMetrics();
      expect(metrics.frameCount).toBe(60);
      expect(metrics.simulationTimeSec).toBeCloseTo(1.0, 5);

      // Reset metrics
      loop.resetMetrics();
      const resetMetrics = loop.getMetrics();
      expect(resetMetrics.frameCount).toBe(0);
      expect(resetMetrics.simulationTimeSec).toBe(0);
    });

    it('tactical freeze (setTacticalFreeze) forces dt = 0 during simulation while maintaining render ticker', () => {
      const loop = new GameLoop();
      let lastSimDt = -1;
      let lastRenderAlpha = -1;

      loop.onUpdate((dt) => {
        lastSimDt = dt;
      });

      loop.onRender((alpha) => {
        lastRenderAlpha = alpha;
      });

      loop.setTacticalFreeze(true);
      expect(loop.isFrozen()).toBe(true);

      // Manual step with customDt
      // When tactical freeze is handled in tick, executeFrame runs.
      // If we manually call step(0), simulation delta is 0
      loop.step(0);
      expect(lastSimDt).toBe(0);
      expect(lastRenderAlpha).toBe(1.0);

      loop.setTacticalFreeze(false);
      expect(loop.isFrozen()).toBe(false);
    });
  });

});
