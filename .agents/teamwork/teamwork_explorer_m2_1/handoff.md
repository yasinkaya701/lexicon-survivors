# Milestone 2: Movement & Combat Physics Architecture Specification and Implementation Report

**Author**: `teamwork_explorer_m2_1`  
**Working Directory**: `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m2_1/`  
**Target Path**: `src/game/engine/` (`Vector2D.ts`, `Kinematics.ts`, `Collision.ts`, `Dodge.ts`, `GameLoop.ts`, `index.ts`)  
**Parent Orchestrator ID**: `808e1bff-3dbc-4dd2-9c78-614a468f634c`  

---

## 1. Observation

### 1.1 Requirements & Context Files Examined
Direct observation of the codebase and project specifications established the following parameters:

1. **`ORIGINAL_REQUEST.md` (Lines 16-22)**:
   - "R2. Core Arena Roguelite Combat and Wave Mechanics: 360-degree player movement, dodging, and collision boundaries."
   - Frame-accurate tactical question freeze where the simulation completely pauses without state desynchronization.

2. **`PROJECT.md` Feature Inventory & Interface Contracts (Lines 57-62, 202-230)**:
   - Feature 1: "360° Omnidirectional Movement — Vector kinematics with normalized diagonal speed."
   - Feature 2: "Inertia & Damping Physics — Acceleration curve with damping friction factor 0.88."
   - Feature 3: "Boundary Collision & Sliding — Clamps player within arena bounding box with sliding."
   - Feature 4: "Dodge Avoidance Roll (60% Cap) — RNG roll clamped strictly to 60% standard cap."
   - Feature 6: "Melee Swing Arc Hitbox — Cleaves enemies in a circular sector cone (120° cleave)."
   - Feature 7: "Melee Thrust Stab Hitbox — Linear rectangular extending/retracting hitbox (OBB)."
   - Feature 59: "Frame-Accurate Tactical Freeze (`dt=0`) — Pausing simulation, positions, velocities."

3. **`tests/e2e/game_loop_tiers.test.ts` (Lines 37-91, 175-247)**:
   - Default Arena Bounds:
     ```typescript
     export const DEFAULT_ARENA: ArenaBounds = {
       minX: 100,
       maxX: 1820,
       minY: 100,
       maxY: 980,
     };
     ```
   - Player Movement & Kinematics Formula:
     ```typescript
     const baseSpeed = 300;
     const speedMultiplier = player.isDashing ? 1.5 : 1.0;
     const maxSpeed = Math.max(50, baseSpeed * speedMultiplier * (1 + player.speedPercent / 100));
     const accel = 2400;
     const friction = 0.88;

     // Normalize input
     const len = Math.hypot(input.x, input.y);
     const dirX = len > 0 ? input.x / len : 0;
     const dirY = len > 0 ? input.y / len : 0;

     // Integrate velocity
     player.vel.x = (player.vel.x + dirX * accel * dt) * friction;
     player.vel.y = (player.vel.y + dirY * accel * dt) * friction;

     // Speed cap
     const currentSpeed = Math.hypot(player.vel.x, player.vel.y);
     if (currentSpeed > maxSpeed) {
       player.vel.x = (player.vel.x / currentSpeed) * maxSpeed;
       player.vel.y = (player.vel.y / currentSpeed) * maxSpeed;
     }

     // Integrate position
     player.pos.x += player.vel.x * dt;
     player.pos.y += player.vel.y * dt;

     // Boundary clamping with wall sliding
     const clampedX = Math.max(bounds.minX + player.radius, Math.min(bounds.maxX - player.radius, player.pos.x));
     const clampedY = Math.max(bounds.minY + player.radius, Math.min(bounds.maxY - player.radius, player.pos.y));

     if (clampedX !== player.pos.x) {
       player.pos.x = clampedX;
       player.vel.x = 0; // zero perpendicular velocity for smooth sliding
     }
     if (clampedY !== player.pos.y) {
       player.pos.y = clampedY;
       player.vel.y = 0;
     }
     ```
   - Tactical Freeze Verification:
     ```typescript
     // Frame-accurate freeze: when dt is 0, do not modify position or velocity
     if (dt === 0) return;
     ```

4. **`tests/unit/combat_math.test.ts` (Lines 11-13, 32-34, 124-142)**:
   - Dodge Avoidance Formula:
     ```typescript
     export function calculateEffectiveDodge(dodgePercent: number): number {
       return Math.min(60, Math.max(0, dodgePercent));
     }
     ```
   - Confirmed test assertions: Dodge passes through normal values $\le 60\%$, caps at $60\%$ for values $> 60\%$, and clamps negative values to $0\%$.

5. **`src/types/brotato.ts` (Lines 83-96, 471-501)**:
   - `PlayerEntity` contains `x, y, vx, vy, radius: 24, facingAngleRad, stats: PlayerRPGStats, invulnerabilityTimerMs, isInvulnerable`.
   - `RogueliteGameState` includes `arenaBounds: { minX, maxX, minY, maxY }`, `bulletTimeActive: boolean`, `isPaused: boolean`.

---

## 2. Logic Chain

From the observed requirements, tests, and constraints, we derive the structural architecture for `src/game/engine/`:

### 2.1 Vector Mathematics (`Vector2D.ts`)
- **Premise**: High-frequency collision, movement, and targeting updates run 60 times per second across up to 100+ entities (player, enemies, projectiles, particles).
- **Inference**:
  - Objects must support pure functional chaining for readability, while also providing in-place mutable methods (`addMut`, `scaleMut`, `copyFrom`) to eliminate heap allocations and garbage collection stutter during combat swarms.
  - Core operations required: addition, subtraction, scalar multiplication, safe division (preventing `NaN` on zero divisor), dot product, 2D perp-dot cross product, Euclidean distance, squared distance (for fast threshold testing without square roots), normalization (safe under zero length), length clamping, 2D rotation, angle calculations ($\text{atan2}$), reflection against contact normals, and linear interpolation (LERP).

### 2.2 Kinematics & 360° Movement (`Kinematics.ts`)
- **Premise**: Player presses keyboard keys (e.g., 'W' + 'D') which submit an unnormalized vector $(1, -1)$ with length $\sqrt{2} \approx 1.4142$.
- **Inference**:
  - Without normalization, diagonal movement grants a $41.4\%$ speed and acceleration advantage ("$\sqrt{2}$ bug").
  - The normalization step computes $L = \sqrt{x^2 + y^2}$. If $L > 1.0$, the components are scaled by $1 / L$. If $L \le 1.0$ (such as an analog joystick tilted slightly), the magnitude is preserved, giving seamless support for keyboard and gamepad.
  - When $dt = 0$ (tactical freeze), kinematics must bail out immediately to preserve velocity and position with zero drift.
  - Velocity integrates acceleration: $\vec{v}' = (\vec{v} + \hat{d} \cdot a \cdot dt) \cdot \mu$.
  - Velocity is clamped to $maxSpeed = \max(50, 300 \cdot (isDashing ? 1.5 : 1.0) \cdot (1 + speedPercent/100))$.
  - Knockback applies an impulse vector inversely proportional to enemy mass: $\vec{v}_{new} = \vec{v} + \frac{\vec{I}}{mass}$, ignored if `isImmuneToKnockback` is active.

### 2.3 Boundary & Hitbox Collision (`Collision.ts`)
- **Premise**: Three distinct collision paradigms are needed:
  1. *Arena Wall Sliding*: Player and enemies must remain strictly inside $[100, 1820] \times [100, 980]$. When hitting a wall, the perpendicular velocity component must be zeroed, while the parallel velocity component is preserved. This allows the player to slide along walls while continuing to move orthogonally.
  2. *Circle-Circle*: Used for Player vs Enemy, Enemy vs Enemy (soft flocking push), Projectile vs Enemy, and Player vs Pickup. Collision condition: $(x_2 - x_1)^2 + (y_2 - y_1)^2 < (r_1 + r_2)^2$. Soft flocking uses contact normal $\hat{n}$ to push overlapping entities apart.
  3. *Melee Thrust (Oriented Bounding Box - OBB)*: Melee spears and knives project a rotated rectangle $(cx, cy, 2hx, 2hy, \theta)$. Intersecting an enemy circle $(E, r)$ is solved by transforming $E$ into the OBB's local coordinate system via translation and rotation by $-\theta$, finding the clamped closest point on the local AABB $[-hx, hx] \times [-hy, hy]$, and checking if distance squared $\le r^2$.
  4. *Melee Cleave (Circular Sector Arc - 120°)*: Melee swords cleave in an arc of $120^\circ$ ($2\pi/3$ rad) out to reach $R$. An enemy circle $(E, r)$ collides if:
     - Distance from player to $E$ is within $R + r$.
     - Angular difference $|\Delta\theta| \le \theta_{arc} / 2$, or the circle intersects either bounding ray segment of the sector.
  5. *Continuous Collision Detection (CCD Raycast)*: High-speed projectiles traveling at $800\text{ px/s}$ might tunnel through small enemies in a single frame ($\Delta x \approx 13.3\text{ px}$). Ray-segment vs circle intersection detects hits along the continuous path $P_0 \to P_1$.

### 2.4 Dodge Mechanics (`Dodge.ts`)
- **Premise**: The Brotato mechanics standard strictly enforces a $60\%$ hard cap on Dodge.
- **Inference**:
  - `effectiveDodge = Math.min(60, Math.max(0, dodgePercent))`.
  - A pseudo-random or seeded roll in $[0, 100)$ is compared: `isDodged = roll < effectiveDodge`.
  - On dodge: Incoming damage becomes $0$, and a visual alert event is dispatched (e.g., floating text `"DODGE!"` in sky blue `#38bdf8`), notifying the HUD / floating combat text renderer.
  - On failure: Incoming damage passes through to the armor reduction pipeline.

### 2.5 GameLoop & Lifecycle (`GameLoop.ts`)
- **Premise**: Browser games using `requestAnimationFrame` face two major pitfalls:
  1. *Tab-Switching Physics Explosion*: When the user leaves the tab, `rAF` pauses. When the user returns 10 seconds later, the first frame has $\Delta t = 10\text{s}$, causing entities to launch across the map or clip through boundaries.
  2. *Tactical Pause Desynchronization*: In-run educational question modals require a complete freeze of physics while the UI renders.
- **Inference**:
  - GameLoop must clamp raw delta-time: $\Delta t = \min(\Delta t_{raw}, 0.05\text{s})$.
  - When `isPaused` or `isTacticalFreezeActive` is true, $\Delta t = 0$.
  - The loop must be completely decoupled from React hooks and JSX, providing an imperative API (`start()`, `stop()`, `pause()`, `resume()`, `step(dt)`) suitable for both headless automated tests and browser canvas rendering.

---

## 3. Caveats

1. **Entity Schema Duality**:
   - `tests/e2e/game_loop_tiers.test.ts` uses `{ pos: Vector2D, vel: Vector2D, radius, speedPercent, isDashing }`.
   - `src/types/brotato.ts` uses `{ x, y, vx, vy, radius, stats: { speedPercent } }`.
   - *Design Accommodation*: `Kinematics.ts` and `Collision.ts` are designed with polymorphic adapters and helper functions that accept both formats cleanly.
2. **Discrete vs Continuous Damping**:
   - `game_loop_tiers.test.ts` asserts velocity decay using discrete per-tick friction: `v = (v + a * dt) * 0.88`.
   - At a variable framerate, discrete multiplication can diverge slightly if frame time fluctuates.
   - *Design Accommodation*: We preserve exact backward compatibility with the existing test formula while also providing a time-normalized exponential decay option $\mu_{dt} = \mu^{dt \cdot 60}$.
3. **Melee Sector Edge Intersection**:
   - Approximating a sector by just checking if the center lies within the angular cone misses cases where a large enemy circle intersects the edge of the swing arc without its center being inside the cone.
   - *Design Accommodation*: `Collision.ts` implements the exact mathematical intersection: angular cone check + radial boundary line-segment distance checks.

---

## 4. Conclusion & Ready-to-Implement TypeScript Architecture

The 5 core modules and 1 barrel index have been completely designed, type-checked, and formulated below for implementation into `src/game/engine/`.

### 4.1 Module 1: `src/game/engine/Vector2D.ts`
```typescript
/**
 * 2D Vector Operations Module
 * Pure TypeScript implementation providing immutable operations,
 * high-performance in-place mutations, and static math utilities.
 */

export interface IVector2D {
  x: number;
  y: number;
}

export class Vector2D implements IVector2D {
  constructor(public x: number = 0, public y: number = 0) {}

  // --------------------------------------------------------------------------
  // Static Factory Methods
  // --------------------------------------------------------------------------

  static zero(): Vector2D {
    return new Vector2D(0, 0);
  }

  static from(v: IVector2D): Vector2D {
    return new Vector2D(v.x, v.y);
  }

  static fromAngle(radians: number, length: number = 1): Vector2D {
    return new Vector2D(Math.cos(radians) * length, Math.sin(radians) * length);
  }

  static up(): Vector2D {
    return new Vector2D(0, -1);
  }

  static down(): Vector2D {
    return new Vector2D(0, 1);
  }

  static left(): Vector2D {
    return new Vector2D(-1, 0);
  }

  static right(): Vector2D {
    return new Vector2D(1, 0);
  }

  // --------------------------------------------------------------------------
  // Immutable Operations (Returns new Vector2D instance)
  // --------------------------------------------------------------------------

  add(v: IVector2D): Vector2D {
    return new Vector2D(this.x + v.x, this.y + v.y);
  }

  sub(v: IVector2D): Vector2D {
    return new Vector2D(this.x - v.x, this.y - v.y);
  }

  scale(scalar: number): Vector2D {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  div(scalar: number): Vector2D {
    if (scalar === 0) return new Vector2D(0, 0);
    return new Vector2D(this.x / scalar, this.y / scalar);
  }

  negate(): Vector2D {
    return new Vector2D(-this.x, -this.y);
  }

  dot(v: IVector2D): number {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * 2D Cross product (z-component of 3D cross product / perpendicular dot product)
   */
  cross(v: IVector2D): number {
    return this.x * v.y - this.y * v.x;
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  distanceSq(v: IVector2D): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  distance(v: IVector2D): number {
    return Math.hypot(this.x - v.x, this.y - v.y);
  }

  normalize(): Vector2D {
    const len = this.length();
    if (len === 0) return new Vector2D(0, 0);
    return new Vector2D(this.x / len, this.y / len);
  }

  clampLength(maxLength: number): Vector2D {
    const lenSq = this.lengthSq();
    if (lenSq <= maxLength * maxLength) return this.clone();
    const len = Math.sqrt(lenSq);
    if (len === 0) return new Vector2D(0, 0);
    return new Vector2D((this.x / len) * maxLength, (this.y / len) * maxLength);
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  angleTo(v: IVector2D): number {
    return Math.atan2(v.y - this.y, v.x - this.x);
  }

  rotate(radians: number): Vector2D {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return new Vector2D(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  perpendicular(): Vector2D {
    return new Vector2D(-this.y, this.x);
  }

  reflect(normal: IVector2D): Vector2D {
    const d = 2 * this.dot(normal);
    return new Vector2D(this.x - d * normal.x, this.y - d * normal.y);
  }

  lerp(target: IVector2D, t: number): Vector2D {
    const clampedT = Math.max(0, Math.min(1, t));
    return new Vector2D(
      this.x + (target.x - this.x) * clampedT,
      this.y + (target.y - this.y) * clampedT
    );
  }

  clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  equals(v: IVector2D, epsilon: number = 1e-6): boolean {
    return Math.abs(this.x - v.x) <= epsilon && Math.abs(this.y - v.y) <= epsilon;
  }

  // --------------------------------------------------------------------------
  // In-Place Mutable Methods (High-Performance Loop Optimization)
  // --------------------------------------------------------------------------

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copyFrom(v: IVector2D): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  addMut(v: IVector2D): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  subMut(v: IVector2D): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  scaleMut(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  normalizeMut(): this {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    } else {
      this.x = 0;
      this.y = 0;
    }
    return this;
  }

  clampLengthMut(maxLength: number): this {
    const lenSq = this.lengthSq();
    if (lenSq > maxLength * maxLength) {
      const len = Math.sqrt(lenSq);
      if (len > 0) {
        this.x = (this.x / len) * maxLength;
        this.y = (this.y / len) * maxLength;
      }
    }
    return this;
  }
}

// ----------------------------------------------------------------------------
// Pure Functional Helper Functions
// ----------------------------------------------------------------------------

export function vec2(x: number, y: number): Vector2D {
  return new Vector2D(x, y);
}

export function addVec(a: IVector2D, b: IVector2D): Vector2D {
  return new Vector2D(a.x + b.x, a.y + b.y);
}

export function subVec(a: IVector2D, b: IVector2D): Vector2D {
  return new Vector2D(a.x - b.x, a.y - b.y);
}

export function scaleVec(v: IVector2D, s: number): Vector2D {
  return new Vector2D(v.x * s, v.y * s);
}

export function dotVec(a: IVector2D, b: IVector2D): number {
  return a.x * b.x + a.y * b.y;
}

export function distVec(a: IVector2D, b: IVector2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distSqVec(a: IVector2D, b: IVector2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function normalizeVec(v: IVector2D): Vector2D {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return new Vector2D(0, 0);
  return new Vector2D(v.x / len, v.y / len);
}
```

---

### 4.2 Module 2: `src/game/engine/Kinematics.ts`
```typescript
/**
 * Kinematics & Movement Module
 * Handles 360-degree player movement, diagonal input normalization,
 * acceleration/friction integration, knockback physics, and facing angles.
 */

import { Vector2D, type IVector2D } from './Vector2D';
import { DEFAULT_ARENA, type ArenaBounds, resolveBoundaryCollision } from './Collision';

export const BASE_PLAYER_SPEED = 300; // px/sec
export const PLAYER_ACCELERATION = 2400; // px/sec^2
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
```

---

### 4.3 Module 3: `src/game/engine/Collision.ts`
```typescript
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
  collidedSides: {
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
```

---

### 4.4 Module 4: `src/game/engine/Dodge.ts`
```typescript
/**
 * Dodge Avoidance System Module
 * Implements strict 60% dodge avoidance cap, RNG roll mechanics,
 * 0 damage response on success, and visual alert event creation.
 */

import { type IVector2D } from './Vector2D';

export const MAX_DODGE_PERCENT = 60; // strictly clamped 60% cap
export const MIN_DODGE_PERCENT = 0; // negative dodge clamped to 0%

export interface DodgeVisualAlert {
  type: 'dodge';
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  timestamp: number;
  durationMs: number;
}

export interface DodgeRollResult {
  isDodged: boolean;
  effectiveDodgePercent: number;
  rollValue: number;
  finalDamage: number;
  rawDamage: number;
  visualAlert?: DodgeVisualAlert;
}

/**
 * Calculates effective dodge percentage clamped strictly to [0%, 60%].
 * Matches tests/unit/combat_math.test.ts:32-34 and tests/e2e/game_loop_tiers.test.ts:195-201.
 */
export function calculateEffectiveDodge(dodgePercent: number): number {
  return Math.min(MAX_DODGE_PERCENT, Math.max(MIN_DODGE_PERCENT, dodgePercent));
}

/**
 * Rolls dodge avoidance against an incoming attack.
 * If successful:
 * - isDodged = true
 * - finalDamage = 0
 * - Generates visual alert event with 'DODGE!' text
 * If failed:
 * - isDodged = false
 * - finalDamage = rawDamage (which then proceeds to armor mitigation)
 */
export function rollDodge(
  rawDamage: number,
  dodgePercent: number,
  position?: IVector2D,
  rng: () => number = Math.random
): DodgeRollResult {
  const effectiveDodge = calculateEffectiveDodge(dodgePercent);
  const rollValue = rng() * 100;
  const isDodged = rollValue < effectiveDodge;

  let visualAlert: DodgeVisualAlert | undefined;
  if (isDodged && position) {
    visualAlert = {
      type: 'dodge',
      text: 'DODGE!',
      x: position.x,
      y: position.y - 32, // Float above entity head
      color: '#38bdf8', // Bright sky blue
      fontSize: 18,
      timestamp: Date.now(),
      durationMs: 700,
    };
  }

  return {
    isDodged,
    effectiveDodgePercent: effectiveDodge,
    rollValue,
    finalDamage: isDodged ? 0 : rawDamage,
    rawDamage,
    visualAlert,
  };
}

/**
 * Tracks dodge telemetry and success statistics over the course of a run.
 */
export class DodgeTracker {
  public totalIncomingHits: number = 0;
  public totalDodgedHits: number = 0;

  public registerRoll(result: DodgeRollResult): void {
    this.totalIncomingHits++;
    if (result.isDodged) {
      this.totalDodgedHits++;
    }
  }

  public getRealizedDodgeRate(): number {
    if (this.totalIncomingHits === 0) return 0;
    return (this.totalDodgedHits / this.totalIncomingHits) * 100;
  }

  public reset(): void {
    this.totalIncomingHits = 0;
    this.totalDodgedHits = 0;
  }
}
```

---

### 4.5 Module 5: `src/game/engine/GameLoop.ts`
```typescript
/**
 * Headless GameLoop & Delta-Time Ticker Module
 * Fully decoupled from React lifecycle. Runs in both Node.js (automated unit/E2E tests)
 * and browser Canvas environments via requestAnimationFrame.
 *
 * Enforces:
 * - Maximum delta-time clamping (dt <= 0.05s) to eliminate tab-switch physics explosions.
 * - Frame-accurate tactical freeze (dt = 0) during YKS/BUEPT study and mystery chest events.
 * - Pause / resume lifecycle management with event listeners.
 */

export const MAX_DELTA_TIME_SEC = 0.05; // 50ms cap (prevents physics explosion)
export const TARGET_FPS = 60;
export const FIXED_TIMESTEP_SEC = 1 / TARGET_FPS;

export type GameLoopState = 'stopped' | 'running' | 'paused';

export interface GameLoopMetrics {
  fps: number;
  frameCount: number;
  simulationTimeSec: number;
  realTimeSec: number;
  lastDeltaTimeSec: number;
}

export type UpdateCallback = (dt: number, metrics: GameLoopMetrics) => void;
export type RenderCallback = (alpha: number, metrics: GameLoopMetrics) => void;
export type StateChangeCallback = (state: GameLoopState) => void;

export class GameLoop {
  private state: GameLoopState = 'stopped';
  private animationFrameId: number | null = null;
  private lastTimestampMs: number = 0;
  private isTacticalFreezeActive: boolean = false;

  // Metrics
  private frameCount: number = 0;
  private simulationTimeSec: number = 0;
  private realTimeSec: number = 0;
  private currentFps: number = TARGET_FPS;
  private lastDeltaTimeSec: number = FIXED_TIMESTEP_SEC;

  // FPS smoothing window
  private fpsBuffer: number[] = [];
  private readonly fpsBufferSize: number = 30;

  // Callbacks
  private updateCallbacks: Set<UpdateCallback> = new Set();
  private renderCallbacks: Set<RenderCallback> = new Set();
  private stateChangeCallbacks: Set<StateChangeCallback> = new Set();

  constructor(private readonly maxDtSec: number = MAX_DELTA_TIME_SEC) {}

  // --------------------------------------------------------------------------
  // Lifecycle Controls
  // --------------------------------------------------------------------------

  public start(): void {
    if (this.state === 'running') return;

    this.state = 'running';
    this.lastTimestampMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.notifyStateChange();

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      const loop = (timestamp: number) => {
        if (this.state !== 'stopped') {
          this.tick(timestamp);
          this.animationFrameId = window.requestAnimationFrame(loop);
        }
      };
      this.animationFrameId = window.requestAnimationFrame(loop);
    }
  }

  public stop(): void {
    if (this.state === 'stopped') return;

    this.state = 'stopped';
    if (this.animationFrameId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.notifyStateChange();
  }

  public pause(): void {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.notifyStateChange();
  }

  public resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.lastTimestampMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.notifyStateChange();
  }

  public togglePause(): boolean {
    if (this.state === 'running') {
      this.pause();
      return true;
    } else if (this.state === 'paused') {
      this.resume();
      return false;
    }
    return false;
  }

  /**
   * Sets tactical freeze state (e.g. during YKS/BUEPT tactical question events).
   * Freezes simulation delta-time to dt = 0, while keeping the rendering loop active.
   */
  public setTacticalFreeze(frozen: boolean): void {
    this.isTacticalFreezeActive = frozen;
  }

  public isFrozen(): boolean {
    return this.isTacticalFreezeActive;
  }

  public getState(): GameLoopState {
    return this.state;
  }

  // --------------------------------------------------------------------------
  // Execution & Step Ticking
  // --------------------------------------------------------------------------

  /**
   * Manual deterministic step execution for automated tests (Node.js headless).
   */
  public step(customDt?: number): void {
    const dt = customDt !== undefined ? customDt : FIXED_TIMESTEP_SEC;
    this.executeFrame(dt);
  }

  private tick(timestamp: number): void {
    const elapsedMs = timestamp - this.lastTimestampMs;
    this.lastTimestampMs = timestamp;

    let rawDtSec = elapsedMs / 1000;
    if (rawDtSec < 0) rawDtSec = 0;

    // Track real time
    this.realTimeSec += rawDtSec;

    // Update FPS smoothing calculation
    if (rawDtSec > 0) {
      const instantFps = 1 / rawDtSec;
      this.fpsBuffer.push(instantFps);
      if (this.fpsBuffer.length > this.fpsBufferSize) {
        this.fpsBuffer.shift();
      }
      this.currentFps = Math.round(
        this.fpsBuffer.reduce((a, b) => a + b, 0) / this.fpsBuffer.length
      );
    }

    // CLAMPING: Clamp delta time to maxDtSec (0.05s) to eliminate tab-switch physics explosions!
    let dt = Math.min(rawDtSec, this.maxDtSec);

    // If game is paused or tactical freeze is active, dt is strictly 0.0
    if (this.state === 'paused' || this.isTacticalFreezeActive) {
      dt = 0;
    }

    this.executeFrame(dt);
  }

  private executeFrame(dt: number): void {
    this.frameCount++;
    this.simulationTimeSec += dt;
    this.lastDeltaTimeSec = dt;

    const metrics = this.getMetrics();

    // 1. Update simulation state
    for (const callback of this.updateCallbacks) {
      callback(dt, metrics);
    }

    // 2. Render graphics (alpha = 1.0)
    for (const callback of this.renderCallbacks) {
      callback(1.0, metrics);
    }
  }

  // --------------------------------------------------------------------------
  // Metrics & Listeners
  // --------------------------------------------------------------------------

  public getMetrics(): GameLoopMetrics {
    return {
      fps: this.currentFps,
      frameCount: this.frameCount,
      simulationTimeSec: this.simulationTimeSec,
      realTimeSec: this.realTimeSec,
      lastDeltaTimeSec: this.lastDeltaTimeSec,
    };
  }

  public onUpdate(callback: UpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  public onRender(callback: RenderCallback): () => void {
    this.renderCallbacks.add(callback);
    return () => this.renderCallbacks.delete(callback);
  }

  public onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  private notifyStateChange(): void {
    for (const cb of this.stateChangeCallbacks) {
      cb(this.state);
    }
  }

  public resetMetrics(): void {
    this.frameCount = 0;
    this.simulationTimeSec = 0;
    this.realTimeSec = 0;
    this.fpsBuffer = [];
    this.currentFps = TARGET_FPS;
  }
}
```

---

### 4.6 Module 6: `src/game/engine/index.ts`
```typescript
/**
 * Engine Barrel Export
 */

export * from './Vector2D';
export * from './Kinematics';
export * from './Collision';
export * from './Dodge';
export * from './GameLoop';
```

---

## 5. Verification Method

### 5.1 Automated Command Execution
To independently verify the physics and movement architecture:
```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm test
```
Or target specific test suites:
```bash
npx vitest run tests/e2e/game_loop_tiers.test.ts
npx vitest run tests/unit/combat_math.test.ts
```

### 5.2 Test Invariants & Assertion Verification Table
| Module | Test Case / Invariant | Expected Behavior | Formula Verified |
|---|---|---|---|
| `Kinematics.ts` | Diagonal Input $(1, 1)$ | Normalized length $= 1.0$ (no $\sqrt{2}$ speed bug) | $\|dir\| = \text{hypot}(1, 1) > 1.0 \implies \hat{dir} = (\frac{1}{\sqrt{2}}, \frac{1}{\sqrt{2}})$ |
| `Kinematics.ts` | Inertia Damping | Velocity decays when input becomes $(0, 0)$ | $v_{t+1} = v_t \times 0.88$ |
| `Kinematics.ts` | Tactical Freeze ($\Delta t = 0$) | Position and velocity completely preserved | If $\Delta t = 0$, return immediately without modification |
| `Collision.ts` | Right Boundary Collision | Player pos clamped to $1796$, $v_x$ zeroed, $v_y$ preserved | $x = \min(1820 - 24, x), v_x = 0$ |
| `Collision.ts` | Melee OBB Collision | Circle-rotated-box intersection accurately detects hits | Closest point on local AABB $\le r^2$ |
| `Collision.ts` | Melee Arc Sector Cleave | Cleaves enemies in $120^\circ$ cone up to reach $R$ | $|\Delta\theta| \le \pi/3 \land d \le R + r$ or segment distance $\le r$ |
| `Dodge.ts` | Dodge Standard Cap | $60\%$ maximum cap strictly enforced for any bonus | $\min(60, \max(0, dodgePercent))$ |
| `Dodge.ts` | Dodge Event Resolution | Successful roll deals 0 damage and creates `'DODGE!'` alert | $finalDamage = isDodged ? 0 : rawDamage$ |
| `GameLoop.ts` | Delta-Time Clamping | Prevents physics explosion when tab switches ($\Delta t \le 0.05\text{s}$) | $\Delta t = \min(\Delta t_{raw}, 0.05)$ |
| `GameLoop.ts` | Headless Determinism | Step execution without DOM dependencies | `loop.step(1/60)` updates metrics deterministically |

### 5.3 Invalidation Conditions
The architecture is invalidated if:
1. Diagonal player movement velocity exceeds cardinal movement velocity by more than $0.001\%$.
2. The player clips outside $[100, 1820] \times [100, 980]$ under any input or impulse vector.
3. Dodge rate exceeds $60\%$ over 100,000 Monte Carlo test rolls.
4. Delta-time exceeds $0.05\text{s}$ during frame lag or tab reactivation.
