/**
 * VFXManager.ts
 * High-Performance, Zero-Allocation Particle VFX, Screen Shake & Juice Engine
 *
 * Designed for 60 FPS HTML5 Canvas top-down roguelite combat:
 * - Pre-allocated fixed-capacity particle pool (Default: 512 particles).
 * - Fast O(1) swap-and-pop compaction (zero GC churn, zero array allocations).
 * - Comprehensive particle archetypes:
 *   * Hit sparks (velocity-stretched hot spark streaks with additive blending).
 *   * Blood / enemy splatters (color-themed radial and directional gore droplets).
 *   * Muzzle flashes (expanding 4-point star burst at weapon barrels).
 *   * Melee slash trails (slicing crescent arc streaks).
 *   * Pickup sparkle rings (expanding shockwave rings for gems, fruit, chests).
 *   * Dust puffs (ground friction clouds for dashes and stomps).
 *   * Death bursts (concussive multi-fragment radial explosions).
 * - Trauma-based screen shake engine (non-linear polynomial punch, harmonic jitter, rotation).
 * - Hit stop micro-freeze system (frame-accurate 1-3 frame impact weight).
 * - Full-screen hit flash & low-health heartbeat red vignette overlays.
 */

export type ParticleType =
  | 'hit_spark'
  | 'blood_splatter'
  | 'muzzle_flash'
  | 'slash_trail'
  | 'pickup_ring'
  | 'dust_puff'
  | 'death_burst';

export interface ParticleSlot {
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  drag: number; // velocity multiplier per second (e.g. 0.90)
  gravity: number; // px/s^2
  color: string;
  secondaryColor?: string;
  radius: number;
  endRadius: number;
  alpha: number;
  rotationRad: number;
  rotationSpeedRad: number;
  lifetimeMs: number;
  maxLifetimeMs: number;
  isAdditive: boolean;
}

export interface VFXUpdateResult {
  isSimulationFrozen: boolean;
}

export class VFXManager {
  // Particle Pool
  private readonly pool: ParticleSlot[];
  private readonly maxCapacity: number;
  private activeCount: number = 0;

  // Screen Shake (Trauma Model)
  private trauma: number = 0; // [0, 1]
  private readonly traumaDecayRate: number = 1.35; // units/sec
  private shakeTimeSec: number = 0;
  public shakeOffsetX: number = 0;
  public shakeOffsetY: number = 0;
  public shakeRotationRad: number = 0;
  private readonly maxShakeOffsetPx: number = 15;
  private readonly maxShakeRotationRad: number = 0.035; // ~2.0 degrees

  // Hit Stop (Simulation Micro-Freeze)
  private hitStopRemainingSec: number = 0;

  // Screen Flash & Vignette Overlays
  private damageVignetteAlpha: number = 0;
  private whiteFlashAlpha: number = 0;
  private timeSec: number = 0;

  /**
   * @param maxCapacity Maximum concurrent particles in pool (Default: 512).
   */
  constructor(maxCapacity: number = 512) {
    this.maxCapacity = maxCapacity;
    this.pool = new Array(maxCapacity);

    for (let i = 0; i < maxCapacity; i++) {
      this.pool[i] = {
        type: 'hit_spark',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        drag: 0.92,
        gravity: 0,
        color: '#ffffff',
        radius: 2,
        endRadius: 0,
        alpha: 1.0,
        rotationRad: 0,
        rotationSpeedRad: 0,
        lifetimeMs: 0,
        maxLifetimeMs: 300,
        isAdditive: false,
      };
    }
  }

  // ==========================================================================
  // Pool Allocation (Zero Allocations via Swap-and-Pop)
  // ==========================================================================

  private obtainSlot(): ParticleSlot | null {
    if (this.activeCount >= this.maxCapacity) {
      // Evict oldest particle at index 0 by rotating or overwriting
      return this.pool[0];
    }
    const slot = this.pool[this.activeCount];
    this.activeCount++;
    return slot;
  }

  // ==========================================================================
  // Particle Spawners
  // ==========================================================================

  /**
   * Spawns high-speed directional hit sparks upon projectile or melee contact.
   */
  public spawnHitSparks(
    x: number,
    y: number,
    impactAngleRad: number,
    isCrit: boolean = false,
    count: number = 6
  ): void {
    const finalCount = isCrit ? count * 2 : count;
    const baseColor = isCrit ? '#fbbf24' : '#fef08a';
    const secColor = isCrit ? '#f97316' : '#facc15';

    for (let i = 0; i < finalCount; i++) {
      const slot = this.obtainSlot();
      if (!slot) break;

      // Cone spread centered around the deflection angle (opposite or normal)
      const spread = (Math.PI / 3) * (Math.random() - 0.5);
      const angle = impactAngleRad + Math.PI + spread;
      const speed = (isCrit ? 220 : 140) + Math.random() * (isCrit ? 260 : 180);

      slot.type = 'hit_spark';
      slot.x = x;
      slot.y = y;
      slot.vx = Math.cos(angle) * speed;
      slot.vy = Math.sin(angle) * speed;
      slot.drag = 0.88; // rapid braking
      slot.gravity = 80;
      slot.color = Math.random() > 0.4 ? baseColor : secColor;
      slot.secondaryColor = '#ffffff';
      slot.radius = isCrit ? 3.5 : 2.5;
      slot.endRadius = 0.5;
      slot.alpha = 1.0;
      slot.rotationRad = angle;
      slot.rotationSpeedRad = 0;
      slot.lifetimeMs = 0;
      slot.maxLifetimeMs = 200 + Math.random() * 150;
      slot.isAdditive = true;
    }
  }

  /**
   * Spawns color-themed enemy blood / tissue splatters.
   */
  public spawnBloodSplatter(
    x: number,
    y: number,
    enemyColor: string,
    count: number = 7
  ): void {
    for (let i = 0; i < count; i++) {
      const slot = this.obtainSlot();
      if (!slot) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;

      slot.type = 'blood_splatter';
      slot.x = x;
      slot.y = y;
      slot.vx = Math.cos(angle) * speed;
      slot.vy = Math.sin(angle) * speed;
      slot.drag = 0.93;
      slot.gravity = 140; // falls to ground
      slot.color = enemyColor;
      slot.radius = 2.5 + Math.random() * 2.5;
      slot.endRadius = 1.0;
      slot.alpha = 1.0;
      slot.rotationRad = 0;
      slot.rotationSpeedRad = (Math.random() - 0.5) * 8;
      slot.lifetimeMs = 0;
      slot.maxLifetimeMs = 350 + Math.random() * 250;
      slot.isAdditive = false;
    }
  }

  /**
   * Spawns expanding muzzle flash burst at ranged weapon barrel coordinates.
   */
  public spawnMuzzleFlash(x: number, y: number, angleRad: number): void {
    const slot = this.obtainSlot();
    if (!slot) return;

    slot.type = 'muzzle_flash';
    slot.x = x;
    slot.y = y;
    slot.vx = Math.cos(angleRad) * 40;
    slot.vy = Math.sin(angleRad) * 40;
    slot.drag = 0.90;
    slot.gravity = 0;
    slot.color = '#fef08a';
    slot.secondaryColor = '#ffffff';
    slot.radius = 12;
    slot.endRadius = 22;
    slot.alpha = 1.0;
    slot.rotationRad = angleRad;
    slot.rotationSpeedRad = 0;
    slot.lifetimeMs = 0;
    slot.maxLifetimeMs = 60; // Ultra snappy 60ms flash
    slot.isAdditive = true;
  }

  /**
   * Spawns slicing crescent arc streak particles for melee swings or thrusts.
   */
  public spawnMeleeSlashArc(
    originX: number,
    originY: number,
    facingAngleRad: number,
    arcAngleDeg: number,
    reachPx: number
  ): void {
    const steps = 6;
    const halfArcRad = ((arcAngleDeg * Math.PI) / 180) / 2;

    for (let i = 0; i < steps; i++) {
      const slot = this.obtainSlot();
      if (!slot) break;

      const t = i / (steps - 1);
      const angle = facingAngleRad - halfArcRad + t * (halfArcRad * 2);
      const dist = reachPx * (0.7 + Math.random() * 0.3);

      slot.type = 'slash_trail';
      slot.x = originX + Math.cos(angle) * dist;
      slot.y = originY + Math.sin(angle) * dist;
      slot.vx = Math.cos(angle) * 70;
      slot.vy = Math.sin(angle) * 70;
      slot.drag = 0.85;
      slot.gravity = 0;
      slot.color = '#38bdf8'; // Electric blue slash
      slot.secondaryColor = '#ffffff';
      slot.radius = 3 + Math.random() * 2;
      slot.endRadius = 0.5;
      slot.alpha = 1.0;
      slot.rotationRad = angle;
      slot.rotationSpeedRad = 0;
      slot.lifetimeMs = 0;
      slot.maxLifetimeMs = 120 + Math.random() * 60;
      slot.isAdditive = true;
    }
  }

  /**
   * Spawns an expanding circular sparkle shockwave ring upon collecting pickups.
   */
  public spawnPickupRing(
    x: number,
    y: number,
    pickupType: 'material' | 'fruit' | 'chest'
  ): void {
    const slot = this.obtainSlot();
    if (!slot) return;

    let ringColor = '#10b981'; // emerald for gems
    let maxRadius = 32;

    if (pickupType === 'fruit') {
      ringColor = '#ef4444'; // red for fruit
      maxRadius = 36;
    } else if (pickupType === 'chest') {
      ringColor = '#f59e0b'; // golden for chest
      maxRadius = 50;
    }

    slot.type = 'pickup_ring';
    slot.x = x;
    slot.y = y;
    slot.vx = 0;
    slot.vy = 0;
    slot.drag = 1.0;
    slot.gravity = 0;
    slot.color = ringColor;
    slot.radius = 4;
    slot.endRadius = maxRadius;
    slot.alpha = 1.0;
    slot.rotationRad = 0;
    slot.rotationSpeedRad = 0;
    slot.lifetimeMs = 0;
    slot.maxLifetimeMs = 280;
    slot.isAdditive = true;
  }

  /**
   * Spawns ground dust puff clouds during player dash or tank charger stomps.
   */
  public spawnDustPuff(x: number, y: number, count: number = 4): void {
    for (let i = 0; i < count; i++) {
      const slot = this.obtainSlot();
      if (!slot) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 50;

      slot.type = 'dust_puff';
      slot.x = x + (Math.random() - 0.5) * 12;
      slot.y = y + (Math.random() - 0.5) * 12;
      slot.vx = Math.cos(angle) * speed;
      slot.vy = Math.sin(angle) * speed;
      slot.drag = 0.88;
      slot.gravity = -10; // gently drifts up
      slot.color = '#64748b'; // Slate smoke
      slot.radius = 4;
      slot.endRadius = 14 + Math.random() * 6;
      slot.alpha = 0.6;
      slot.rotationRad = Math.random() * Math.PI * 2;
      slot.rotationSpeedRad = (Math.random() - 0.5) * 3;
      slot.lifetimeMs = 0;
      slot.maxLifetimeMs = 400 + Math.random() * 200;
      slot.isAdditive = false;
    }
  }

  /**
   * Concussive multi-fragment explosion upon enemy death.
   */
  public spawnDeathBurst(
    x: number,
    y: number,
    enemyColor: string,
    isElite: boolean = false
  ): void {
    const sparkCount = isElite ? 24 : 12;
    const splatterCount = isElite ? 16 : 8;

    // 1. Core fiery/electric sparks
    for (let i = 0; i < sparkCount; i++) {
      const slot = this.obtainSlot();
      if (!slot) break;

      const angle = (i * 2 * Math.PI) / sparkCount + (Math.random() - 0.5) * 0.4;
      const speed = 120 + Math.random() * (isElite ? 280 : 180);

      slot.type = 'death_burst';
      slot.x = x;
      slot.y = y;
      slot.vx = Math.cos(angle) * speed;
      slot.vy = Math.sin(angle) * speed;
      slot.drag = 0.91;
      slot.gravity = 60;
      slot.color = isElite ? '#a855f7' : '#f59e0b';
      slot.secondaryColor = '#ffffff';
      slot.radius = isElite ? 4 : 2.5;
      slot.endRadius = 0.5;
      slot.alpha = 1.0;
      slot.rotationRad = angle;
      slot.rotationSpeedRad = 0;
      slot.lifetimeMs = 0;
      slot.maxLifetimeMs = 300 + Math.random() * 200;
      slot.isAdditive = true;
    }

    // 2. Heavy blood/debris chunks
    this.spawnBloodSplatter(x, y, enemyColor, splatterCount);

    // 3. Smoke ring
    this.spawnDustPuff(x, y, isElite ? 8 : 4);
  }

  // ==========================================================================
  // Screen Shake (Trauma Model)
  // ==========================================================================

  /**
   * Adds trauma [0, 1] to the screen shake engine.
   * Total trauma is clamped to 1.0.
   */
  public addTrauma(amount: number): void {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  /**
   * Triggers a hit stop simulation freeze for a specified duration in milliseconds.
   * e.g. 35ms on crit, 65ms on elite death.
   */
  public triggerHitStop(durationMs: number): void {
    this.hitStopRemainingSec = Math.max(this.hitStopRemainingSec, durationMs / 1000);
  }

  /**
   * Triggers a red screen perimeter vignette when player takes damage.
   */
  public triggerDamageVignette(intensity: number = 0.6): void {
    this.damageVignetteAlpha = Math.min(1.0, Math.max(this.damageVignetteAlpha, intensity));
  }

  /**
   * Triggers a full-screen white flash overlay (wave complete, elite nuke).
   */
  public triggerWhiteFlash(intensity: number = 0.4): void {
    this.whiteFlashAlpha = Math.min(1.0, Math.max(this.whiteFlashAlpha, intensity));
  }

  // ==========================================================================
  // Update Loop (Zero Allocations)
  // ==========================================================================

  public update(dtSec: number): VFXUpdateResult {
    this.timeSec += dtSec;

    // 1. Process Hit Stop (Simulation Micro-Freeze)
    let isSimulationFrozen = false;
    if (this.hitStopRemainingSec > 0) {
      this.hitStopRemainingSec -= dtSec;
      isSimulationFrozen = true;
      // During hit stop, entities are frozen, but particles and screen shake continue to jitter
    }

    // 2. Screen Shake Calculation (Trauma-based non-linear punch)
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - this.traumaDecayRate * dtSec);
      this.shakeTimeSec += dtSec;

      // Polynomial punch curve: shake = trauma^2.2
      const shake = Math.pow(this.trauma, 2.2);

      // Multi-harmonic golden ratio pseudo-noise
      const t = this.shakeTimeSec;
      this.shakeOffsetX = this.maxShakeOffsetPx * shake * Math.sin(t * 47.1 + 1.2);
      this.shakeOffsetY = this.maxShakeOffsetPx * shake * Math.cos(t * 53.7 + 2.4);
      this.shakeRotationRad = this.maxShakeRotationRad * shake * Math.sin(t * 39.3 + 0.8);
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      this.shakeRotationRad = 0;
    }

    // 3. Screen Overlay Decays
    if (this.damageVignetteAlpha > 0) {
      this.damageVignetteAlpha = Math.max(0, this.damageVignetteAlpha - 2.2 * dtSec);
    }
    if (this.whiteFlashAlpha > 0) {
      this.whiteFlashAlpha = Math.max(0, this.whiteFlashAlpha - 2.8 * dtSec);
    }

    // 4. Particle Simulation (Swap-and-Pop compaction)
    const dtMs = dtSec * 1000;
    let i = 0;
    while (i < this.activeCount) {
      const p = this.pool[i];
      p.lifetimeMs += dtMs;

      if (p.lifetimeMs >= p.maxLifetimeMs) {
        // Expired: swap with last active element in O(1)
        if (i < this.activeCount - 1) {
          const last = this.pool[this.activeCount - 1];
          p.type = last.type;
          p.x = last.x;
          p.y = last.y;
          p.vx = last.vx;
          p.vy = last.vy;
          p.drag = last.drag;
          p.gravity = last.gravity;
          p.color = last.color;
          p.secondaryColor = last.secondaryColor;
          p.radius = last.radius;
          p.endRadius = last.endRadius;
          p.alpha = last.alpha;
          p.rotationRad = last.rotationRad;
          p.rotationSpeedRad = last.rotationSpeedRad;
          p.lifetimeMs = last.lifetimeMs;
          p.maxLifetimeMs = last.maxLifetimeMs;
          p.isAdditive = last.isAdditive;
        }
        this.activeCount--;
        // Don't increment i; evaluate newly swapped slot at index i
        continue;
      }

      // Kinematics integration
      p.vx *= Math.pow(p.drag, dtSec * 60);
      p.vy *= Math.pow(p.drag, dtSec * 60);
      p.vy += p.gravity * dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.rotationRad += p.rotationSpeedRad * dtSec;

      const progress = p.lifetimeMs / p.maxLifetimeMs;

      // Alpha and radius interpolation
      p.alpha = Math.max(0, 1 - progress);
      p.radius = p.radius + (p.endRadius - p.radius) * progress;

      i++;
    }

    return { isSimulationFrozen };
  }

  // ==========================================================================
  // Canvas Rendering (Batched Composite Passes)
  // ==========================================================================

  /**
   * Applies camera shake transform to world canvas context.
   * Call right after ctx.save() before rendering arena world.
   */
  public applyCameraShake(ctx: CanvasRenderingContext2D): void {
    if (this.trauma > 0.001) {
      ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
      ctx.rotate(this.shakeRotationRad);
    }
  }

  /**
   * Renders all active particles with batched globalCompositeOperation passes.
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (this.activeCount === 0) return;

    ctx.save();

    // Pass 1: Standard Alpha Blended Particles ('source-over')
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < this.activeCount; i++) {
      const p = this.pool[i];
      if (p.isAdditive || p.alpha <= 0.01) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'pickup_ring') {
        // Expanding ring
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.8, 3 * p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Droplets / smoke discs
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Pass 2: Additive Glow Particles ('lighter')
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.activeCount; i++) {
      const p = this.pool[i];
      if (!p.isAdditive || p.alpha <= 0.01) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.type === 'hit_spark' || p.type === 'death_burst') {
        // Velocity-aligned stretched spark streaks
        const speed = Math.hypot(p.vx, p.vy);
        const streakLength = Math.min(24, Math.max(4, speed * 0.04));
        const tailX = p.x - (p.vx / (speed || 1)) * streakLength;
        const tailY = p.y - (p.vy / (speed || 1)) * streakLength;

        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.radius;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Hot glowing center
        ctx.fillStyle = p.secondaryColor || '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'muzzle_flash') {
        // 4-point expanding flash diamond
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotationRad);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(p.radius * 1.5, 0);
        ctx.lineTo(0, p.radius * 0.5);
        ctx.lineTo(-p.radius * 0.8, 0);
        ctx.lineTo(0, -p.radius * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'pickup_ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.8, 3.5 * p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  // ==========================================================================
  // Full-Screen Overlays (Vignette & Flashes)
  // ==========================================================================

  /**
   * Renders screen-space overlays (damage vignette, critical low-HP heartbeat, white flash).
   * Call after ctx.restore() from camera shake so overlays remain fixed to viewport!
   */
  public renderScreenOverlays(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    playerHpPercent: number
  ): void {
    // 1. White Full-Screen Flash
    if (this.whiteFlashAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.whiteFlashAlpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 2. Damage Red Vignette or Critical Low-Health Heartbeat
    let effectiveVignetteAlpha = this.damageVignetteAlpha;

    // Heartbeat pulse when HP < 25%
    if (playerHpPercent <= 0.25) {
      const pulse = 0.2 + 0.15 * Math.sin(this.timeSec * 7);
      effectiveVignetteAlpha = Math.max(effectiveVignetteAlpha, pulse);
    }

    if (effectiveVignetteAlpha > 0.01) {
      ctx.save();
      const cx = width / 2;
      const cy = height / 2;
      const outerRadius = Math.hypot(cx, cy);
      const innerRadius = outerRadius * 0.45;

      const grad = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      grad.addColorStop(0.7, `rgba(220, 38, 38, ${effectiveVignetteAlpha * 0.4})`);
      grad.addColorStop(1, `rgba(185, 28, 28, ${effectiveVignetteAlpha * 0.85})`);

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  /**
   * Resets all particles, trauma, and overlays.
   */
  public clear(): void {
    this.activeCount = 0;
    this.trauma = 0;
    this.hitStopRemainingSec = 0;
    this.damageVignetteAlpha = 0;
    this.whiteFlashAlpha = 0;
  }
}
