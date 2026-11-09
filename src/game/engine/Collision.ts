/**
 * Collision Physics Module
 * Implements sliding rectangular arena boundary collision,
 * circle-circle entity collision & soft flocking separation,
 * circle-oriented-box (OBB) melee thrust hitboxes,
 * circular sector cone (120° cleave) melee swing hitboxes,
 * and continuous raycast collision detection for fast projectiles.
 */

import { Vector2D, type IVector2D } from './Vector2D';

export interface ArenaBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const DEFAULT_ARENA: ArenaBounds = {
  minX: 100,
  maxX: 1820,
  minY: 100,
  maxY: 980,
};

export interface BoundaryCollisionResult {
  pos: Vector2D;
  vel: Vector2D;
  collided: boolean;
  sides: {
    left: boolean;
    right: boolean;
    top: boolean;
    bottom: boolean;
  };
}

/**
 * Resolves sliding boundary collision against rectangular arena bounds.
 * Clamps position within [min + radius, max - radius] and zeroes the velocity
 * perpendicular to colliding boundaries, enabling smooth wall sliding.
 */
export function resolveBoundaryCollision(
  pos: IVector2D,
  vel: IVector2D,
  radius: number,
  bounds: ArenaBounds = DEFAULT_ARENA
): BoundaryCollisionResult {
  let px = pos.x;
  let py = pos.y;
  let vx = vel.x;
  let vy = vel.y;

  const leftLimit = bounds.minX + radius;
  const rightLimit = bounds.maxX - radius;
  const topLimit = bounds.minY + radius;
  const bottomLimit = bounds.maxY - radius;

  const sides = { left: false, right: false, top: false, bottom: false };
  let collided = false;

  if (px < leftLimit) {
    px = leftLimit;
    if (vx < 0) vx = 0;
    sides.left = true;
    collided = true;
  } else if (px > rightLimit) {
    px = rightLimit;
    if (vx > 0) vx = 0;
    sides.right = true;
    collided = true;
  }

  if (py < topLimit) {
    py = topLimit;
    if (vy < 0) vy = 0;
    sides.top = true;
    collided = true;
  } else if (py > bottomLimit) {
    py = bottomLimit;
    if (vy > 0) vy = 0;
    sides.bottom = true;
    collided = true;
  }

  return {
    pos: new Vector2D(px, py),
    vel: new Vector2D(vx, vy),
    collided,
    sides,
  };
}

// ----------------------------------------------------------------------------
// Circle-Circle Collision & Soft Push
// ----------------------------------------------------------------------------

export function checkCircleCircle(
  c1: IVector2D,
  r1: number,
  c2: IVector2D,
  r2: number
): boolean {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const distSq = dx * dx + dy * dy;
  const radSum = r1 + r2;
  return distSq < radSum * radSum;
}

export interface CircleManifold {
  colliding: boolean;
  penetration: number;
  normal: Vector2D; // from c1 to c2
}

export function getCircleCircleManifold(
  c1: IVector2D,
  r1: number,
  c2: IVector2D,
  r2: number
): CircleManifold | null {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const distSq = dx * dx + dy * dy;
  const radSum = r1 + r2;

  if (distSq >= radSum * radSum) return null;

  const dist = Math.sqrt(distSq);
  if (dist === 0) {
    return {
      colliding: true,
      penetration: radSum,
      normal: new Vector2D(1, 0),
    };
  }

  return {
    colliding: true,
    penetration: radSum - dist,
    normal: new Vector2D(dx / dist, dy / dist),
  };
}

/**
 * Soft flocking separation: separates overlapping circles smoothly by a push factor.
 */
export function resolveCircleSoftPush(
  pos1: IVector2D,
  r1: number,
  pos2: IVector2D,
  r2: number,
  pushFactor: number = 0.5
): { delta1: Vector2D; delta2: Vector2D } | null {
  const manifold = getCircleCircleManifold(pos1, r1, pos2, r2);
  if (!manifold) return null;

  const halfPush = (manifold.penetration * pushFactor) / 2;
  return {
    delta1: manifold.normal.scale(-halfPush),
    delta2: manifold.normal.scale(halfPush),
  };
}

// ----------------------------------------------------------------------------
// Circle vs Oriented Bounding Box (OBB) Melee Collision
// ----------------------------------------------------------------------------

export interface OrientedBox {
  centerX: number;
  centerY: number;
  halfLength: number; // along local X-axis (thrust extension)
  halfWidth: number; // along local Y-axis (blade thickness)
  rotationRad: number; // facing angle
}

/**
 * Tests collision between a circle (e.g. enemy) and an oriented rectangular box
 * (e.g. melee thrust stab hitbox extending from player).
 */
export function checkCircleOrientedBox(
  circleCenter: IVector2D,
  circleRadius: number,
  box: OrientedBox
): boolean {
  // 1. Translate circle center to box center
  const relX = circleCenter.x - box.centerX;
  const relY = circleCenter.y - box.centerY;

  // 2. Rotate by -rotationRad into box local coordinate space
  const cos = Math.cos(-box.rotationRad);
  const sin = Math.sin(-box.rotationRad);
  const localX = relX * cos - relY * sin;
  const localY = relX * sin + relY * cos;

  // 3. Find closest point on local AABB [-halfLength, halfLength] x [-halfWidth, halfWidth]
  const closestX = Math.max(-box.halfLength, Math.min(box.halfLength, localX));
  const closestY = Math.max(-box.halfWidth, Math.min(box.halfWidth, localY));

  // 4. Calculate distance squared between local circle and closest point
  const diffX = localX - closestX;
  const diffY = localY - closestY;
  const distSq = diffX * diffX + diffY * diffY;

  return distSq <= circleRadius * circleRadius;
}

// ----------------------------------------------------------------------------
// Circle vs Sector Arc Cone (Melee Swing Arc - 120° Cleave)
// ----------------------------------------------------------------------------

/**
 * Normalizes angle into [-PI, PI] range.
 */
function normalizeAngleRad(angle: number): number {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Distance squared from point P to line segment AB.
 */
function distSqPointToSegment(p: IVector2D, a: IVector2D, b: IVector2D): number {
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const apX = p.x - a.x;
  const apY = p.y - a.y;
  const abLenSq = abX * abX + abY * abY;

  if (abLenSq === 0) return apX * apX + apY * apY;

  const t = Math.max(0, Math.min(1, (apX * abX + apY * abY) / abLenSq));
  const projX = a.x + t * abX;
  const projY = a.y + t * abY;
  const dx = p.x - projX;
  const dy = p.y - projY;
  return dx * dx + dy * dy;
}

/**
 * Tests collision between an enemy circle and a circular swing sector cone
 * (e.g. 120-degree melee sword swing).
 */
export function checkCircleSectorArc(
  circleCenter: IVector2D,
  circleRadius: number,
  origin: IVector2D,
  reachRadius: number,
  facingAngleRad: number,
  arcAngleRad: number = (120 * Math.PI) / 180 // Default 120°
): boolean {
  const dist = Math.hypot(circleCenter.x - origin.x, circleCenter.y - origin.y);

  // 1. If center is further than reach + radius, out of range
  if (dist > reachRadius + circleRadius) return false;

  // 2. If origin is inside circle, immediate hit
  if (dist <= circleRadius) return true;

  // 3. Angular test: angle from origin to circle center
  const angleToTarget = Math.atan2(circleCenter.y - origin.y, circleCenter.x - origin.x);
  const diffAngle = Math.abs(normalizeAngleRad(angleToTarget - facingAngleRad));

  // If inside angular cone and within reach
  if (diffAngle <= arcAngleRad / 2 && dist <= reachRadius + circleRadius) {
    return true;
  }

  // 4. Edge check: circle may clip the left or right radial segment of the sector
  const halfArc = arcAngleRad / 2;
  const leftEdgeEnd = {
    x: origin.x + Math.cos(facingAngleRad - halfArc) * reachRadius,
    y: origin.y + Math.sin(facingAngleRad - halfArc) * reachRadius,
  };
  const rightEdgeEnd = {
    x: origin.x + Math.cos(facingAngleRad + halfArc) * reachRadius,
    y: origin.y + Math.sin(facingAngleRad + halfArc) * reachRadius,
  };

  const rSq = circleRadius * circleRadius;
  if (distSqPointToSegment(circleCenter, origin, leftEdgeEnd) <= rSq) return true;
  if (distSqPointToSegment(circleCenter, origin, rightEdgeEnd) <= rSq) return true;

  return false;
}

// ----------------------------------------------------------------------------
// Continuous Collision Detection (Ray Segment vs Circle)
// ----------------------------------------------------------------------------

/**
 * Continuous collision detection between a fast projectile segment (p0 -> p1)
 * and an enemy circle to prevent tunneling.
 */
export function checkSegmentCircle(
  p0: IVector2D,
  p1: IVector2D,
  circleCenter: IVector2D,
  circleRadius: number
): boolean {
  return distSqPointToSegment(circleCenter, p0, p1) <= circleRadius * circleRadius;
}
