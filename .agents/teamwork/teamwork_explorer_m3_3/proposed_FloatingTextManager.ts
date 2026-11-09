/**
 * FloatingTextManager.ts
 * High-Performance, Zero-Allocation Floating Combat Text Manager
 *
 * Designed for 60 FPS HTML5 Canvas top-down roguelite combat:
 * - Pre-allocated fixed-capacity object pool (zero GC allocations during combat).
 * - Priority-based recycling when capacity is exceeded.
 * - Distinct visual archetypes:
 *   * Regular damage (crisp white/amber, upward float, subtle drift).
 *   * Critical hits (large bold red/orange, elastic pop/overshoot scale bounce, vibration).
 *   * Player incoming damage (bold crimson, minus sign, heavy outline).
 *   * DODGE! (electric cyan/neon blue, buoyant upward leap with horizontal sway).
 *   * Healing & Life Steal (emerald green / hot pink, smooth buoyant rise).
 *   * Currency & Chest drops (gold sparkle text).
 * - High-DPI stroke outlining for maximum readability over dark grids or bright VFX.
 * - Cached font strings to prevent canvas font re-parsing overhead.
 */

export type FloatingTextType =
  | 'damage'
  | 'crit'
  | 'player_damage'
  | 'dodge'
  | 'heal'
  | 'lifesteal'
  | 'pickup'
  | 'banner';

export interface FloatingTextSlot {
  active: boolean;
  type: FloatingTextType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  color: string;
  strokeColor: string;
  fontSize: number;
  fontString: string;
  alpha: number;
  scale: number;
  lifetimeMs: number;
  maxLifetimeMs: number;
  priority: number; // Higher priority slots resist eviction when pool is saturated
  swayFrequency: number;
  swayAmplitude: number;
}

export class FloatingTextManager {
  private readonly pool: FloatingTextSlot[];
  private readonly maxCapacity: number;
  private readonly fontCache: Map<string, string> = new Map();

  /**
   * @param maxCapacity Maximum concurrent floating text slots (Default: 64).
   * Pre-allocates all slots in memory to eliminate heap churn.
   */
  constructor(maxCapacity: number = 64) {
    this.maxCapacity = maxCapacity;
    this.pool = new Array(maxCapacity);

    for (let i = 0; i < maxCapacity; i++) {
      this.pool[i] = {
        active: false,
        type: 'damage',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        text: '',
        color: '#ffffff',
        strokeColor: '#000000',
        fontSize: 16,
        fontString: '900 16px sans-serif',
        alpha: 1.0,
        scale: 1.0,
        lifetimeMs: 0,
        maxLifetimeMs: 700,
        priority: 1,
        swayFrequency: 0,
        swayAmplitude: 0,
      };
    }
  }

  /**
   * Helper to retrieve or cache standard font descriptor strings.
   */
  private getCachedFont(size: number, isHeavy: boolean = true): string {
    const key = `${isHeavy ? '900' : 'bold'}_${size}`;
    let cached = this.fontCache.get(key);
    if (!cached) {
      cached = `${isHeavy ? '900' : 'bold'} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      this.fontCache.set(key, cached);
    }
    return cached;
  }

  /**
   * Finds an inactive slot or evicts the lowest-priority, oldest active slot.
   */
  private acquireSlot(priority: number): FloatingTextSlot {
    let oldestIndex = -1;
    let oldestLifetimeRatio = -1;
    let lowestPriority = Infinity;

    for (let i = 0; i < this.maxCapacity; i++) {
      const slot = this.pool[i];
      if (!slot.active) {
        return slot;
      }

      // Priority and age comparison for eviction
      if (slot.priority < lowestPriority) {
        lowestPriority = slot.priority;
        oldestIndex = i;
        oldestLifetimeRatio = slot.lifetimeMs / slot.maxLifetimeMs;
      } else if (slot.priority === lowestPriority) {
        const ratio = slot.lifetimeMs / slot.maxLifetimeMs;
        if (ratio > oldestLifetimeRatio) {
          oldestLifetimeRatio = ratio;
          oldestIndex = i;
        }
      }
    }

    // If pool is full, reuse slot if incoming priority is >= lowest priority slot
    if (oldestIndex !== -1 && priority >= lowestPriority) {
      return this.pool[oldestIndex];
    }

    // Fallback: overwrite first slot if saturated with high priority
    return this.pool[0];
  }

  // ==========================================================================
  // High-Level Spawn Methods
  // ==========================================================================

  /**
   * Regular weapon damage dealt to enemies.
   */
  public spawnDamage(x: number, y: number, damage: number, isCrit: boolean = false): void {
    if (isCrit) {
      this.spawnCrit(x, y, damage);
      return;
    }

    const slot = this.acquireSlot(1);
    slot.active = true;
    slot.type = 'damage';
    slot.text = `${Math.round(damage)}`;
    // Small random scatter to prevent overlapping numbers clumping
    slot.x = x + (Math.random() - 0.5) * 20;
    slot.y = y - 10 + (Math.random() - 0.5) * 10;
    slot.vx = (Math.random() - 0.5) * 35;
    slot.vy = -65 - Math.random() * 25;
    slot.color = '#ffffff';
    slot.strokeColor = '#0f172a';
    slot.fontSize = 15;
    slot.fontString = this.getCachedFont(15, false);
    slot.alpha = 1.0;
    slot.scale = 1.0;
    slot.lifetimeMs = 0;
    slot.maxLifetimeMs = 650;
    slot.priority = 1;
    slot.swayFrequency = 0;
    slot.swayAmplitude = 0;
  }

  /**
   * Critical strike damage: large, bold, elastic overshoot bounce, high priority.
   */
  public spawnCrit(x: number, y: number, damage: number): void {
    const slot = this.acquireSlot(3);
    slot.active = true;
    slot.type = 'crit';
    slot.text = `${Math.round(damage)}!`;
    slot.x = x + (Math.random() - 0.5) * 16;
    slot.y = y - 24;
    slot.vx = (Math.random() - 0.5) * 40;
    slot.vy = -85;
    slot.color = '#fbbf24'; // Vibrant golden amber
    slot.strokeColor = '#7c2d12'; // Crimson-brown outline
    slot.fontSize = 24;
    slot.fontString = this.getCachedFont(24, true);
    slot.alpha = 1.0;
    slot.scale = 0.5; // Starts small and pops up
    slot.lifetimeMs = 0;
    slot.maxLifetimeMs = 900;
    slot.priority = 3;
    slot.swayFrequency = 8;
    slot.swayAmplitude = 2;
  }

  /**
   * Damage taken by the player.
   */
  public spawnPlayerDamage(x: number, y: number, damage: number): void {
    const slot = this.acquireSlot(4);
    slot.active = true;
    slot.type = 'player_damage';
    slot.text = `-${Math.round(damage)}`;
    slot.x = x + (Math.random() - 0.5) * 14;
    slot.y = y - 35;
    slot.vx = (Math.random() - 0.5) * 30;
    slot.vy = -75;
    slot.color = '#ef4444'; // Bright warning red
    slot.strokeColor = '#450a0a';
    slot.fontSize = 20;
    slot.fontString = this.getCachedFont(20, true);
    slot.alpha = 1.0;
    slot.scale = 1.2;
    slot.lifetimeMs = 0;
    slot.maxLifetimeMs = 850;
    slot.priority = 4;
    slot.swayFrequency = 0;
    slot.swayAmplitude = 0;
  }

  /**
   * DODGE! notification for successful evasion roll.
   */
  public spawnDodge(x: number, y: number): void {
    const slot = this.acquireSlot(4);
    slot.active = true;
    slot.type = 'dodge';
    slot.text = 'DODGE!';
    slot.x = x;
    slot.y = y - 36;
    slot.vx = 0;
    slot.vy = -95;
    slot.color = '#38bdf8'; // Electric neon cyan
    slot.strokeColor = '#0c4a6e';
    slot.fontSize = 19;
    slot.fontString = this.getCachedFont(19, true);
    slot.alpha = 1.0;
    slot.scale = 1.3;
    slot.lifetimeMs = 0;
    slot.maxLifetimeMs = 850;
    slot.priority = 4;
    slot.swayFrequency = 12;
    slot.swayAmplitude = 6;
  }

  /**
   * Health restoration (Regeneration, Fruit pickup, Life Steal).
   */
  public spawnHeal(x: number, y: number, amount: number, isLifeSteal: boolean = false): void {
    const slot = this.acquireSlot(2);
    slot.active = true;
    slot.type = isLifeSteal ? 'lifesteal' : 'heal';
    slot.text = `+${amount}${isLifeSteal ? ' ❤️' : ' HP'}`;
    slot.x = x + (Math.random() - 0.5) * 16;
    slot.y = y - 30;
    slot.vx = (Math.random() - 0.5) * 15;
    slot.vy = -55;
    slot.color = isLifeSteal ? '#ec4899' : '#10b981'; // Magenta vs Emerald
    slot.strokeColor = isLifeSteal ? '#500724' : '#064e3b';
    slot.fontSize = 15;
    slot.fontString = this.getCachedFont(15, true);
    slot.alpha = 1.0;
    slot.scale = 1.0;
    slot.lifetimeMs = 0;
    slot.maxLifetimeMs = 750;
    slot.priority = 2;
    slot.swayFrequency = 0;
    slot.swayAmplitude = 0;
  }

  /**
   * Collectible material gems or mystery chest feedback.
   */
  public spawnPickup(x: number, y: number, text: string, color: string = '#fbbf24'): void {
    const slot = this.acquireSlot(2);
    slot.active = true;
    slot.type = 'pickup';
    slot.text = text;
    slot.x = x;
    slot.y = y - 25;
    slot.vx = 0;
    slot.vy = -50;
    slot.color = color;
    slot.strokeColor = '#1e1b4b';
    slot.fontSize = 14;
    slot.fontString = this.getCachedFont(14, true);
    slot.alpha = 1.0;
    slot.scale = 1.0;
    slot.lifetimeMs = 0;
    slot.maxLifetimeMs = 700;
    slot.priority = 2;
    slot.swayFrequency = 0;
    slot.swayAmplitude = 0;
  }

  /**
   * Milestone banner text (e.g. Wave Complete).
   */
  public spawnBanner(x: number, y: number, text: string, color: string = '#38bdf8'): void {
    const slot = this.acquireSlot(5);
    slot.active = true;
    slot.type = 'banner';
    slot.text = text;
    slot.x = x;
    slot.y = y - 60;
    slot.vx = 0;
    slot.vy = -35;
    slot.color = color;
    slot.strokeColor = '#082f49';
    slot.fontSize = 26;
    slot.fontString = this.getCachedFont(26, true);
    slot.alpha = 1.0;
    slot.scale = 1.2;
    slot.lifetimeMs = 0;
    slot.maxLifetimeMs = 1200;
    slot.priority = 5;
    slot.swayFrequency = 0;
    slot.swayAmplitude = 0;
  }

  // ==========================================================================
  // Simulation Update (Zero Allocations)
  // ==========================================================================

  public update(dtSec: number): void {
    const dtMs = dtSec * 1000;

    for (let i = 0; i < this.maxCapacity; i++) {
      const slot = this.pool[i];
      if (!slot.active) continue;

      slot.lifetimeMs += dtMs;
      if (slot.lifetimeMs >= slot.maxLifetimeMs) {
        slot.active = false;
        continue;
      }

      // Kinematics integration
      slot.x += slot.vx * dtSec;
      slot.y += slot.vy * dtSec;
      slot.vy *= 0.97; // Light aerodynamic drag on rise

      // Sway motion (for dodge or crits)
      if (slot.swayAmplitude > 0) {
        slot.x += Math.sin((slot.lifetimeMs / 1000) * slot.swayFrequency) * slot.swayAmplitude * dtSec * 10;
      }

      const progress = slot.lifetimeMs / slot.maxLifetimeMs;

      // Alpha fade out (sustained opacity for first 60%, then smooth fade)
      if (progress > 0.6) {
        slot.alpha = Math.max(0, 1 - (progress - 0.6) / 0.4);
      } else {
        slot.alpha = 1.0;
      }

      // Elastic pop animation for critical strikes
      if (slot.type === 'crit') {
        const popTime = Math.min(1.0, slot.lifetimeMs / 180);
        if (popTime < 1.0) {
          // Overshoot scale up to 1.55x, then settle
          slot.scale = 0.6 + Math.sin(popTime * Math.PI) * 0.95;
        } else {
          slot.scale = 1.0;
        }
      } else if (slot.type === 'dodge' || slot.type === 'banner') {
        const popTime = Math.min(1.0, slot.lifetimeMs / 150);
        slot.scale = 1.0 + Math.sin(popTime * Math.PI) * 0.3;
      }
    }
  }

  // ==========================================================================
  // Canvas Rendering (Batched Outline + Fill)
  // ==========================================================================

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < this.maxCapacity; i++) {
      const slot = this.pool[i];
      if (!slot.active || slot.alpha <= 0.01) continue;

      ctx.save();
      ctx.globalAlpha = slot.alpha;
      ctx.font = slot.fontString;

      // Transform for scale bounce / rotation
      ctx.translate(slot.x, slot.y);
      if (slot.scale !== 1.0) {
        ctx.scale(slot.scale, slot.scale);
      }

      // 1. High-contrast stroke outline
      ctx.strokeStyle = slot.strokeColor;
      ctx.lineWidth = slot.fontSize >= 20 ? 4 : 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(slot.text, 0, 0);

      // 2. Colored text fill
      ctx.fillStyle = slot.color;
      ctx.fillText(slot.text, 0, 0);

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Resets all active text slots (e.g. on wave restart or game over).
   */
  public clear(): void {
    for (let i = 0; i < this.maxCapacity; i++) {
      this.pool[i].active = false;
    }
  }
}
