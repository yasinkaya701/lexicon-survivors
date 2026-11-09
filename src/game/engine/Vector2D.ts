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
