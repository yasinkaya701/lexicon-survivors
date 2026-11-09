/**
 * Kinematics & Movement Module
 * Handles 360-degree player movement, diagonal input normalization,
 * acceleration/friction integration, knockback physics, and facing angles.
 */

import { Vector2D, type IVector2D } from './Vector2D';
import { DEFAULT_ARENA, type ArenaBounds, resolveBoundaryCollision } from './Collision';

export const BASE_PLAYER_SPEED = 300; // px/sec baseline
export const PLAYER_ACCELERATION = 3200; // px/sec^2 (responsive crisp acceleration)
export const FRICTION_DAMPING = 0.88; // discrete friction per frame (60Hz)
export const MIN_PLAYER_SPEED = 50; // minimum capped speed floor
export const DASH_SPEED_MULTIPLIER = 1.5; // dash movement speed multiplier

export interface PlayerMovementEntity {
  pos: IVector2D;
  vel: IVector2D;
  radius: number;
  speedPercent: number;
  isDashing?: boolean;
  dashDurationRemaining?: number;
}

/**
 * Normalizes user input vector to prevent the sqrt(2) diagonal movement bug.
 * If input length exceeds 1.0 (e.g. keyboard W+D where length = 1.414),
 * it clamps the vector strictly to length 1.0.
 * If input length is <= 1.0 (e.g. analog gamepad tilt), magnitude is preserved.
 */
export function normalizeInput(input: IVector2D): Vector2D {
  const len = Math.hypot(input.x, input.y);
  if (len === 0) return new Vector2D(0, 0);
  if (len > 1.0) {
    return new Vector2D(input.x / len, input.y / len);
  }
  return new Vector2D(input.x, input.y);
}

/**
 * Calculates maximum player movement speed modulated by stats and dash state.
 */
export function calculateMaxSpeed(
  baseSpeed: number = BASE_PLAYER_SPEED,
  speedPercent: number = 0,
  isDashing: boolean = false
): number {
  const multiplier = isDashing ? DASH_SPEED_MULTIPLIER : 1.0;
  return Math.max(MIN_PLAYER_SPEED, baseSpeed * multiplier * (1 + speedPercent / 100));
}

/**
 * Updates player movement matching exact test specifications from game_loop_tiers.test.ts:
 * 1. Checks dt === 0 (tactical freeze) and exits with zero state drift.
 * 2. Normalizes input vector.
 * 3. Integrates acceleration and damping friction (0.88).
 * 4. Clamps velocity to max speed.
 * 5. Integrates position.
 * 6. Applies sliding arena boundary collision.
 */
export function updatePlayerMovement(
  player: PlayerMovementEntity,
  input: IVector2D,
  dt: number,
  bounds: ArenaBounds = DEFAULT_ARENA
): void {
  // Frame-accurate freeze: when dt is 0, do not modify position or velocity
  if (dt === 0) return;

  const maxSpeed = calculateMaxSpeed(
    BASE_PLAYER_SPEED,
    player.speedPercent,
    !!player.isDashing
  );

  const accel = PLAYER_ACCELERATION;
  const friction = FRICTION_DAMPING;

  // 1. Normalize diagonal input
  const normalizedInput = normalizeInput(input);
  const dirX = normalizedInput.x;
  const dirY = normalizedInput.y;

  // 2. Integrate velocity
  player.vel.x = (player.vel.x + dirX * accel * dt) * friction;
  player.vel.y = (player.vel.y + dirY * accel * dt) * friction;

  // 3. Speed cap
  const currentSpeed = Math.hypot(player.vel.x, player.vel.y);
  if (currentSpeed > maxSpeed) {
    player.vel.x = (player.vel.x / currentSpeed) * maxSpeed;
    player.vel.y = (player.vel.y / currentSpeed) * maxSpeed;
  }

  // 4. Integrate position
  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;

  // 5. Sliding boundary clamping
  const collision = resolveBoundaryCollision(player.pos, player.vel, player.radius, bounds);
  player.pos.x = collision.pos.x;
  player.pos.y = collision.pos.y;
  player.vel.x = collision.vel.x;
  player.vel.y = collision.vel.y;
}

/**
 * Applies knockback impulse to an entity velocity vector inversely scaled by mass.
 * Entities with isImmuneToKnockback ignore the impulse completely.
 */
export function applyKnockback(
  vel: IVector2D,
  impulse: IVector2D,
  mass: number = 1.0,
  isImmune: boolean = false
): Vector2D {
  if (isImmune || mass <= 0) {
    return new Vector2D(vel.x, vel.y);
  }
  return new Vector2D(vel.x + impulse.x / mass, vel.y + impulse.y / mass);
}

/**
 * Calculates entity facing angle in radians.
 * Prefers explicit aim direction if provided; falls back to movement velocity if active.
 */
export function calculateFacingAngle(
  currentAngleRad: number,
  aimVector?: IVector2D,
  velocityVector?: IVector2D
): number {
  if (aimVector && (aimVector.x !== 0 || aimVector.y !== 0)) {
    return Math.atan2(aimVector.y, aimVector.x);
  }
  if (velocityVector && Math.hypot(velocityVector.x, velocityVector.y) > 10) {
    return Math.atan2(velocityVector.y, velocityVector.x);
  }
  return currentAngleRad;
}
