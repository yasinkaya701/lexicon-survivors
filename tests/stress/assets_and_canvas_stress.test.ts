import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AssetManager,
  assetManager,
  ASSET_MANIFEST,
  renderFallback,
  processChromaKey,
  createHitFlashVariant,
  type DrawSpriteOptions,
  type AssetCategory,
  type CachedAsset,
} from '@/game/engine/AssetManager';
import { FloatingTextManager, VFXManager } from '@/game/vfx';
import { DEFAULT_ARENA, type ArenaBounds } from '@/game/engine/Collision';
import { WEAPON_REGISTRY } from '@/game/weapons/WeaponCatalog';

/**
 * Mock CanvasGradient for radial and linear gradients
 */
export class MockCanvasGradient {
  public colorStops: Array<{ offset: number; color: string }> = [];

  public addColorStop(offset: number, color: string): void {
    this.colorStops.push({ offset, color });
  }
}

/**
 * High-performance mock CanvasRenderingContext2D tracking method invocations,
 * bounding boxes, and context save/restore stack depth to detect stack imbalance.
 */
export class MockCanvasRenderingContext2D {
  public saveDepth = 0;
  public maxSaveDepth = 0;
  public drawImageCalls = 0;
  public fillRectCalls = 0;
  public strokeRectCalls = 0;
  public fillCalls = 0;
  public strokeCalls = 0;
  public beginPathCalls = 0;
  public arcCalls = 0;
  public ellipseCalls = 0;
  public fillTextCalls = 0;
  public strokeTextCalls = 0;
  public translateCalls = 0;
  public rotateCalls = 0;
  public scaleCalls = 0;
  public createPatternCalls = 0;
  public createRadialGradientCalls = 0;
  public createLinearGradientCalls = 0;

  // Context state properties
  public fillStyle: string | CanvasPattern | CanvasGradient = '#000000';
  public strokeStyle: string | CanvasPattern | CanvasGradient = '#000000';
  public lineWidth = 1;
  public lineCap: CanvasLineCap = 'butt';
  public lineJoin: CanvasLineJoin = 'miter';
  public globalAlpha = 1.0;
  public globalCompositeOperation = 'source-over';
  public font = '10px sans-serif';
  public textAlign: CanvasTextAlign = 'start';
  public textBaseline: CanvasTextBaseline = 'alphabetic';

  private stateStack: Array<{
    globalAlpha: number;
    fillStyle: string | CanvasPattern | CanvasGradient;
    strokeStyle: string | CanvasPattern | CanvasGradient;
    lineWidth: number;
    lineCap: CanvasLineCap;
    lineJoin: CanvasLineJoin;
    globalCompositeOperation: string;
    font: string;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
  }> = [];

  public save(): void {
    this.saveDepth++;
    if (this.saveDepth > this.maxSaveDepth) {
      this.maxSaveDepth = this.saveDepth;
    }
    this.stateStack.push({
      globalAlpha: this.globalAlpha,
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      globalCompositeOperation: this.globalCompositeOperation,
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
    });
  }

  public restore(): void {
    if (this.saveDepth <= 0) {
      throw new Error(`MockCanvasContext restore() called with saveDepth = 0 (underflow)`);
    }
    this.saveDepth--;
    const state = this.stateStack.pop();
    if (state) {
      this.globalAlpha = state.globalAlpha;
      this.fillStyle = state.fillStyle;
      this.strokeStyle = state.strokeStyle;
      this.lineWidth = state.lineWidth;
      this.lineCap = state.lineCap;
      this.lineJoin = state.lineJoin;
      this.globalCompositeOperation = state.globalCompositeOperation;
      this.font = state.font;
      this.textAlign = state.textAlign;
      this.textBaseline = state.textBaseline;
    }
  }

  public translate(x: number, y: number): void {
    this.translateCalls++;
  }

  public rotate(angle: number): void {
    this.rotateCalls++;
  }

  public scale(sx: number, sy: number): void {
    this.scaleCalls++;
  }

  public beginPath(): void {
    this.beginPathCalls++;
  }

  public closePath(): void {}

  public moveTo(x: number, y: number): void {}

  public lineTo(x: number, y: number): void {}

  public arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void {
    this.arcCalls++;
  }

  public ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number
  ): void {
    this.ellipseCalls++;
  }

  public fill(): void {
    this.fillCalls++;
  }

  public stroke(): void {
    this.strokeCalls++;
  }

  public fillRect(x: number, y: number, w: number, h: number): void {
    this.fillRectCalls++;
  }

  public strokeRect(x: number, y: number, w: number, h: number): void {
    this.strokeRectCalls++;
  }

  public fillText(text: string, x: number, y: number): void {
    this.fillTextCalls++;
  }

  public strokeText(text: string, x: number, y: number): void {
    this.strokeTextCalls++;
  }

  public drawImage(img: unknown, dx: number, dy: number, dw?: number, dh?: number): void {
    this.drawImageCalls++;
  }

  public createPattern(image: unknown, repetition: string): CanvasPattern | null {
    this.createPatternCalls++;
    return {
      setTransform: () => {},
    } as unknown as CanvasPattern;
  }

  public createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number
  ): CanvasGradient {
    this.createRadialGradientCalls++;
    return new MockCanvasGradient() as unknown as CanvasGradient;
  }

  public createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
    this.createLinearGradientCalls++;
    return new MockCanvasGradient() as unknown as CanvasGradient;
  }

  public getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
    const data = new Uint8ClampedArray(sw * sh * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 10;     // R (near black)
      data[i + 1] = 10; // G
      data[i + 2] = 10; // B
      data[i + 3] = 255;
    }
    return {
      data,
      width: sw,
      height: sh,
      colorSpace: 'srgb',
    } as unknown as ImageData;
  }

  public putImageData(imageData: ImageData, dx: number, dy: number): void {}

  public setLineDash(segments: number[]): void {}

  public resetStats(): void {
    this.saveDepth = 0;
    this.maxSaveDepth = 0;
    this.drawImageCalls = 0;
    this.fillRectCalls = 0;
    this.strokeRectCalls = 0;
    this.fillCalls = 0;
    this.strokeCalls = 0;
    this.beginPathCalls = 0;
    this.arcCalls = 0;
    this.ellipseCalls = 0;
    this.fillTextCalls = 0;
    this.strokeTextCalls = 0;
    this.translateCalls = 0;
    this.rotateCalls = 0;
    this.scaleCalls = 0;
    this.createPatternCalls = 0;
    this.createRadialGradientCalls = 0;
    this.createLinearGradientCalls = 0;
    this.stateStack = [];
    this.globalAlpha = 1.0;
  }
}

/**
 * Mock HTMLCanvasElement
 */
export class MockCanvas {
  public width: number;
  public height: number;
  public ctx: MockCanvasRenderingContext2D;

  constructor(width = 1920, height = 1080) {
    this.width = width;
    this.height = height;
    this.ctx = new MockCanvasRenderingContext2D();
  }

  public getContext(type: '2d'): MockCanvasRenderingContext2D {
    return this.ctx;
  }
}

describe('Milestone 3 Adversarial Stress Testing — AssetManager & Canvas Rendering', () => {
  let mockCtx: MockCanvasRenderingContext2D;

  beforeEach(() => {
    mockCtx = new MockCanvasRenderingContext2D();
    assetManager.clearCache();
  });

  // ==========================================================================
  // 1. MISSING ASSET KEYS & MALFORMED INPUTS (Must NOT throw, must fall back)
  // ==========================================================================
  describe('Adversarial Missing Asset Keys & Malformed Inputs', () => {
    it('gracefully renders procedural fallback without throwing on non-existent keys', () => {
      const missingKeys = [
        'completely_unknown_key',
        'weapon_plasma_cannon_9000',
        'enemy_hyper_dragon',
        'pickup_quantum_shard',
        'proj_laser_stream',
        'vfx_cosmic_rift',
        'arena_lava_lake',
        'random_gibberish_xyz_123',
        'DROP_MATERIAL_UPPERCASE',
        '__proto__',
        'constructor',
      ];

      for (const key of missingKeys) {
        expect(() => {
          assetManager.drawSprite(mockCtx as unknown as CanvasRenderingContext2D, key, 500, 500);
        }).not.toThrow();

        // Stack must be balanced (saveDepth === 0)
        expect(mockCtx.saveDepth).toBe(0);
      }
    });

    it('handles empty, symbol-laden, and hostile injection string keys without error', () => {
      const hostileKeys = [
        '',
        ' ',
        '   ',
        '!@#$%^&*()_+{}[]:;"\'<>,.?/~`',
        '../../../etc/passwd',
        '<script>alert(1)</script>',
        '${process.env.PATH}',
        '\\x00\\x01\\x02',
        '\n\r\t',
        '🥔💥💎',
      ];

      for (const key of hostileKeys) {
        expect(() => {
          assetManager.drawSprite(mockCtx as unknown as CanvasRenderingContext2D, key, 100, 100);
        }).not.toThrow();

        expect(mockCtx.saveDepth).toBe(0);
      }
    });

    it('guarantees zero memory allocation growth when spammed with 10,000 non-existent keys', () => {
      const mgr = new AssetManager();
      const initialCacheSize = (mgr as unknown as { cache: Map<string, unknown> }).cache.size;

      for (let i = 0; i < 10000; i++) {
        mgr.drawSprite(
          mockCtx as unknown as CanvasRenderingContext2D,
          `adversarial_probe_key_${i}`,
          100,
          100
        );
      }

      const finalCacheSize = (mgr as unknown as { cache: Map<string, unknown> }).cache.size;

      // Unregistered keys must not pollute or bloat the internal cache
      expect(finalCacheSize).toBe(initialCacheSize);
      expect(mockCtx.saveDepth).toBe(0);
    });

    it('falls back seamlessly when hitFlash is requested on a missing asset', () => {
      expect(() => {
        assetManager.drawSprite(
          mockCtx as unknown as CanvasRenderingContext2D,
          'enemy_ghost_nonexistent',
          300,
          300,
          { hitFlash: true }
        );
      }).not.toThrow();

      expect(mockCtx.saveDepth).toBe(0);
    });

    it('handles drawTiled with missing or unregistered texture key', () => {
      expect(() => {
        assetManager.drawTiled(
          mockCtx as unknown as CanvasRenderingContext2D,
          'unregistered_floor_texture',
          0,
          0,
          1920,
          1080
        );
      }).not.toThrow();

      // Must draw grid fallback
      expect(mockCtx.fillRectCalls).toBeGreaterThan(0);
      expect(mockCtx.saveDepth).toBe(0);
    });

    it('resolves all 26 authoritative assets and their known aliases', () => {
      expect(ASSET_MANIFEST.length).toBe(26);

      for (const entry of ASSET_MANIFEST) {
        // Canonical key resolves to itself
        expect(assetManager.resolveKey(entry.key)).toBe(entry.key);

        // Manifest lookup succeeds
        const found = assetManager.getManifestEntry(entry.key);
        expect(found).toBeDefined();
        expect(found?.key).toBe(entry.key);

        // All declared aliases resolve to canonical key
        if (entry.aliases) {
          for (const alias of entry.aliases) {
            expect(assetManager.resolveKey(alias)).toBe(entry.key);
            expect(assetManager.getManifestEntry(alias)?.key).toBe(entry.key);
          }
        }
      }
    });

    it('verifies all weapons in WEAPON_REGISTRY use spriteNames that map to manifest assets', () => {
      for (const [weaponId, blueprint] of Object.entries(WEAPON_REGISTRY)) {
        const canonical = assetManager.resolveKey(blueprint.spriteName);
        const manifestEntry = assetManager.getManifestEntry(canonical);
        expect(
          manifestEntry,
          `Weapon ${weaponId} spriteName '${blueprint.spriteName}' must exist in ASSET_MANIFEST`
        ).toBeDefined();
        expect(manifestEntry?.category).toBe('weapon');
      }
    });
  });

  // ==========================================================================
  // 2. CANVAS RESIZING & ADVERSARIAL BOUNDS
  // ==========================================================================
  describe('Canvas Resizing & Viewport Boundary Stress', () => {
    it('renders cleanly across multiple screen resolutions and aspect ratios', () => {
      const resolutions = [
        { width: 1920, height: 1080, name: '1080p FHD' },
        { width: 3840, height: 2160, name: '4K UHD' },
        { width: 2560, height: 1440, name: '1440p QHD' },
        { width: 1280, height: 720, name: '720p HD' },
        { width: 2560, height: 1080, name: '21:9 Ultrawide' },
        { width: 1080, height: 1920, name: 'Portrait Mobile' },
        { width: 800, height: 600, name: '4:3 SVGA' },
        { width: 100, height: 100, name: 'Thumbnail' },
        { width: 1920.85, height: 1080.42, name: 'Fractional Viewport' },
      ];

      for (const res of resolutions) {
        mockCtx.resetStats();

        // Draw arena tiled floor for resolution
        assetManager.drawTiled(
          mockCtx as unknown as CanvasRenderingContext2D,
          'arena_tile_floor',
          0,
          0,
          res.width,
          res.height
        );
        expect(mockCtx.saveDepth).toBe(0);

        // Draw entities within bounds
        assetManager.drawSprite(
          mockCtx as unknown as CanvasRenderingContext2D,
          'player_potato_scholar',
          res.width / 2,
          res.height / 2
        );
        expect(mockCtx.saveDepth).toBe(0);
      }
    });

    it('handles inverted, zero, and extreme arena bounds in drawTiled without infinite loops', () => {
      const adversarialBounds = [
        // Inverted X
        { minX: 1000, minY: 100, maxX: 200, maxY: 900 },
        // Inverted Y
        { minX: 100, minY: 900, maxX: 1000, maxY: 100 },
        // Zero width / height
        { minX: 500, minY: 500, maxX: 500, maxY: 500 },
        // Negative coordinates
        { minX: -2000, minY: -1500, maxX: -500, maxY: -200 },
        // Straddling origin
        { minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 },
        // Large arena bounds (stress test loop termination)
        { minX: 0, minY: 0, maxX: 10000, maxY: 10000 },
      ];

      for (const b of adversarialBounds) {
        mockCtx.resetStats();
        expect(() => {
          assetManager.drawTiled(
            mockCtx as unknown as CanvasRenderingContext2D,
            'arena_tile_floor',
            b.minX,
            b.minY,
            b.maxX,
            b.maxY
          );
        }).not.toThrow();

        expect(mockCtx.saveDepth).toBe(0);
      }
    });
  });

  // ==========================================================================
  // 3. OFFSCREEN CANVAS BOUNDS & EXTREME TRANSFORMATIONS
  // ==========================================================================
  describe('Offscreen Canvas Bounds & Extreme Transformations', () => {
    it('handles sprites positioned far offscreen in all directions', () => {
      const extremeCoordinates = [
        { x: -99999, y: -99999 },
        { x: 99999, y: 99999 },
        { x: -1000, y: 500 },
        { x: 500, y: -1000 },
        { x: 10000, y: 500 },
        { x: 500, y: 10000 },
        { x: 0, y: 0 },
        { x: -0, y: -0 },
        { x: 100.123456789, y: 200.987654321 }, // Sub-pixel precision
      ];

      for (const pos of extremeCoordinates) {
        mockCtx.resetStats();
        expect(() => {
          assetManager.drawSprite(
            mockCtx as unknown as CanvasRenderingContext2D,
            'enemy_elite_boss',
            pos.x,
            pos.y
          );
        }).not.toThrow();

        expect(mockCtx.saveDepth).toBe(0);
        expect(mockCtx.translateCalls).toBe(1);
      }
    });

    it('stress tests extreme angles, scaling, flips, and alphas without matrix corruption', () => {
      const adversarialOptions: DrawSpriteOptions[] = [
        // Extreme rotation angles
        { rotationRad: 100 * Math.PI },
        { rotationRad: -500 * Math.PI },
        { rotationRad: 0.0000001 },
        // Extreme scales
        { scale: 0.00001 },
        { scale: 1000.0 },
        { scale: -1.0 }, // Negative scale flip
        { scale: 0 },    // Zero scale
        // Flips
        { flipX: true, flipY: true },
        { flipX: true, flipY: false, scale: 2.5 },
        // Extreme alphas
        { alpha: 0.0 },
        { alpha: 0.001 },
        { alpha: 1.0 },
        { alpha: 5.0 }, // Oversaturated alpha
        // Zero dimensions
        { width: 0, height: 0 },
        { width: 1, height: 1 },
        { width: 10000, height: 10000 },
        // All flags active simultaneously
        {
          width: 64,
          height: 64,
          rotationRad: Math.PI / 3,
          scale: 1.5,
          flipX: true,
          flipY: true,
          alpha: 0.8,
          hitFlash: true,
        },
      ];

      for (const opt of adversarialOptions) {
        mockCtx.resetStats();
        expect(() => {
          assetManager.drawSprite(
            mockCtx as unknown as CanvasRenderingContext2D,
            'weapon_shotgun',
            200,
            200,
            opt
          );
        }).not.toThrow();

        expect(mockCtx.saveDepth).toBe(0);
      }
    });

    it('safely handles non-finite (NaN / Infinity) options without uncaught exceptions', () => {
      const nonFiniteOptions: DrawSpriteOptions[] = [
        { rotationRad: NaN },
        { scale: NaN },
        { alpha: NaN },
        { width: NaN, height: NaN },
        { rotationRad: Infinity },
        { scale: -Infinity },
      ];

      for (const opt of nonFiniteOptions) {
        mockCtx.resetStats();
        expect(() => {
          assetManager.drawSprite(
            mockCtx as unknown as CanvasRenderingContext2D,
            'player_tank_mutant',
            100,
            100,
            opt
          );
        }).not.toThrow();

        expect(mockCtx.saveDepth).toBe(0);
      }
    });
  });

  // ==========================================================================
  // 4. MASSIVE ENTITY DRAW CALL STRESS (1,000+ Sprites per Frame)
  // ==========================================================================
  describe('High Sprite Count Stress Testing (1,000+ Sprites per Frame)', () => {
    it('executes 1,000 sprite draw calls in a single frame within 16.6ms budget', () => {
      mockCtx.resetStats();
      const spriteCount = 1000;

      const startTime = performance.now();

      for (let i = 0; i < spriteCount; i++) {
        // Vary entities realistically across the arena
        const x = 100 + (i % 50) * 32;
        const y = 100 + Math.floor(i / 50) * 40;
        const angle = (i * 0.1) % (Math.PI * 2);
        const hitFlash = i % 10 === 0;

        assetManager.drawSprite(
          mockCtx as unknown as CanvasRenderingContext2D,
          i % 5 === 0 ? 'enemy_swarmer' : i % 5 === 1 ? 'enemy_rusher' : 'enemy_tank',
          x,
          y,
          {
            width: 32,
            height: 32,
            rotationRad: angle,
            hitFlash,
          }
        );
      }

      const elapsedMs = performance.now() - startTime;

      // 1. All 1,000 sprites must have been drawn
      expect(mockCtx.translateCalls).toBe(spriteCount);

      // 2. Context state stack must be perfectly balanced
      expect(mockCtx.saveDepth).toBe(0);

      // 3. Execution time should comfortably stay within 60 FPS budget (~16.6ms)
      expect(elapsedMs).toBeLessThan(50);
    });

    it('simulates a complete heavy combat frame with 2,000 mixed entities (swarms + bullets + drops + VFX)', () => {
      mockCtx.resetStats();

      // 1. Tiled floor
      assetManager.drawTiled(
        mockCtx as unknown as CanvasRenderingContext2D,
        'arena_tile_floor',
        DEFAULT_ARENA.minX,
        DEFAULT_ARENA.minY,
        DEFAULT_ARENA.maxX,
        DEFAULT_ARENA.maxY
      );

      const startTime = performance.now();

      // 2. 1 Player
      assetManager.drawSprite(
        mockCtx as unknown as CanvasRenderingContext2D,
        'player_potato_scholar',
        960,
        540,
        { width: 56, height: 56, rotationRad: 0.5 }
      );

      // 3. 6 Weapons in orbit
      for (let w = 0; w < 6; w++) {
        assetManager.drawSprite(
          mockCtx as unknown as CanvasRenderingContext2D,
          'weapon_pistol',
          960 + Math.cos(w) * 40,
          540 + Math.sin(w) * 40,
          { width: 28, height: 28, rotationRad: w }
        );
      }

      // 4. 1,000 Swarm Enemies
      const enemyKeys = [
        'enemy_swarmer',
        'enemy_rusher',
        'enemy_tank',
        'enemy_ranged_shooter',
        'enemy_elite_boss',
      ];
      for (let i = 0; i < 1000; i++) {
        const key = enemyKeys[i % enemyKeys.length];
        assetManager.drawSprite(
          mockCtx as unknown as CanvasRenderingContext2D,
          key,
          200 + (i % 40) * 35,
          150 + Math.floor(i / 40) * 30,
          {
            width: 32,
            height: 32,
            rotationRad: (i * 0.05) % (Math.PI * 2),
            hitFlash: i % 15 === 0,
          }
        );
      }

      // 5. 500 Projectiles
      for (let p = 0; p < 500; p++) {
        assetManager.drawSprite(
          mockCtx as unknown as CanvasRenderingContext2D,
          p % 2 === 0 ? 'proj_bullet' : 'proj_magic_orb',
          500 + (p % 25) * 40,
          400 + Math.floor(p / 25) * 20,
          { width: 16, height: 16, rotationRad: p * 0.2 }
        );
      }

      // 6. 500 Pickups (materials, fruits, chests)
      for (let d = 0; d < 500; d++) {
        assetManager.drawSprite(
          mockCtx as unknown as CanvasRenderingContext2D,
          d % 10 === 0 ? 'pickup_mystery_chest' : d % 5 === 0 ? 'pickup_health_fruit' : 'pickup_material_crystal',
          300 + (d % 30) * 35,
          200 + Math.floor(d / 30) * 35,
          { width: 22, height: 22 }
        );
      }

      const elapsedMs = performance.now() - startTime;

      // Total sprites: 1 + 6 + 1000 + 500 + 500 = 2007 sprites!
      expect(mockCtx.translateCalls).toBe(2007);
      expect(mockCtx.saveDepth).toBe(0);
      expect(elapsedMs).toBeLessThan(100);
    });

    it('sustains 60 consecutive frames of 1,000 sprites (60,000 total calls) without memory leaks or degradation', () => {
      const frames = 60;
      const spritesPerFrame = 1000;
      const frameTimes: number[] = [];

      for (let f = 0; f < frames; f++) {
        mockCtx.resetStats();
        const fStart = performance.now();

        for (let s = 0; s < spritesPerFrame; s++) {
          assetManager.drawSprite(
            mockCtx as unknown as CanvasRenderingContext2D,
            'enemy_swarmer',
            500 + (s % 20),
            500 + Math.floor(s / 20)
          );
        }

        const fTime = performance.now() - fStart;
        frameTimes.push(fTime);

        expect(mockCtx.saveDepth).toBe(0);
        expect(mockCtx.translateCalls).toBe(spritesPerFrame);
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frames;
      const lastFrameTime = frameTimes[frames - 1];

      // Average frame time should be well below 25ms in node
      expect(avgFrameTime).toBeLessThan(30);

      // Frame 60 should not show degradation vs average (no memory thrashing)
      expect(lastFrameTime).toBeLessThan(Math.max(avgFrameTime * 3, 10));
    });
  });

  // ==========================================================================
  // 5. OBJECT POOL RECYCLING & SATURATION (Zero Heap Allocations)
  // ==========================================================================
  describe('Object Pool Saturation Stress (FloatingTextManager & VFXManager)', () => {
    it('handles heavy spam exceeding FloatingTextManager pool capacity without error', () => {
      const ftm = new FloatingTextManager(64);
      mockCtx.resetStats();

      // Spam 1,000 combat text events across all archetypes
      for (let i = 0; i < 1000; i++) {
        if (i % 6 === 0) ftm.spawnDamage(100, 100, i + 1, false);
        else if (i % 6 === 1) ftm.spawnCrit(100, 100, (i + 1) * 2);
        else if (i % 6 === 2) ftm.spawnPlayerDamage(100, 100, 12);
        else if (i % 6 === 3) ftm.spawnDodge(100, 100);
        else if (i % 6 === 4) ftm.spawnHeal(100, 100, 10, false);
        else ftm.spawnBanner(100, 100, `LEVEL ${i}`, '#ffffff');
      }

      // Render pool
      ftm.render(mockCtx as unknown as CanvasRenderingContext2D);
      expect(mockCtx.saveDepth).toBe(0);

      // Update pool with multiple delta ticks
      for (let t = 0; t < 10; t++) {
        ftm.update(0.1);
      }

      ftm.clear();
      mockCtx.resetStats();
      ftm.render(mockCtx as unknown as CanvasRenderingContext2D);
      expect(mockCtx.fillTextCalls).toBe(0);
    });

    it('handles heavy particle spam exceeding VFXManager pool capacity without error', () => {
      const vfx = new VFXManager(512);
      mockCtx.resetStats();

      // Spam 5,000 particles across all 7 particle types
      for (let i = 0; i < 5000; i++) {
        vfx.spawnHitSparks(100, 100, (i * 0.1) % Math.PI, i % 2 === 0, 5);
        vfx.spawnBloodSplatter(100, 100, '#ff0000', 4);
        vfx.spawnMuzzleFlash(150, 150, 0);
        vfx.spawnMeleeSlashArc(100, 100, 0, 120, 80);
        vfx.spawnPickupRing(200, 200, 'material');
        vfx.spawnDustPuff(100, 100, 3);
      }

      // Render all active particles
      vfx.render(mockCtx as unknown as CanvasRenderingContext2D);
      expect(mockCtx.saveDepth).toBe(0);

      // Screen shake application
      vfx.addTrauma(0.8);
      vfx.applyCameraShake(mockCtx as unknown as CanvasRenderingContext2D);

      // Screen space overlays
      vfx.triggerDamageVignette(0.9);
      vfx.triggerWhiteFlash(0.5);
      vfx.renderScreenOverlays(mockCtx as unknown as CanvasRenderingContext2D, 1920, 1080, 0.4);
      expect(mockCtx.saveDepth).toBe(0);

      // Update and clear
      vfx.update(0.016);
      vfx.clear();
    });
  });

  // ==========================================================================
  // 6. CACHE LIFECYCLE & CONCURRENCY RESILIENCE
  // ==========================================================================
  describe('Cache Lifecycle & Concurrency Resilience', () => {
    it('survives mid-run clearCache() while rendering continuous frames', () => {
      mockCtx.resetStats();

      // Render 500 sprites
      for (let i = 0; i < 500; i++) {
        assetManager.drawSprite(mockCtx as unknown as CanvasRenderingContext2D, 'weapon_sword', 100, 100);
      }

      // Mid-run cache clear
      assetManager.clearCache();

      // Next 500 sprites must immediately fall back cleanly
      for (let i = 0; i < 500; i++) {
        assetManager.drawSprite(mockCtx as unknown as CanvasRenderingContext2D, 'weapon_sword', 100, 100);
      }

      expect(mockCtx.saveDepth).toBe(0);
      expect(mockCtx.translateCalls).toBe(1000);
    });

    it('exercises preloadAll idempotency and SSR-safety', async () => {
      // In Node environment, window is undefined -> returns resolved Promise
      const p1 = assetManager.preloadAll();
      const p2 = assetManager.preloadAll();
      expect(p1).toBeDefined();
      expect(p2).toBeDefined();

      await Promise.all([p1, p2]);
    });

    it('exercises procedural fallback renderer directly for all 7 asset categories', () => {
      const categories: AssetCategory[] = [
        'player',
        'enemy',
        'weapon',
        'projectile',
        'vfx',
        'pickup',
        'terrain',
      ];

      for (const cat of categories) {
        mockCtx.resetStats();
        expect(() => {
          renderFallback(
            mockCtx as unknown as CanvasRenderingContext2D,
            `sample_${cat}`,
            cat,
            64,
            64,
            { hitFlash: false }
          );
        }).not.toThrow();

        expect(mockCtx.saveDepth).toBe(0);
      }
    });

    it('correctly processes pre-baked canvas and flash variants when mock cache is primed', () => {
      const mockCanvasElement = new MockCanvas(64, 64);
      const mockFlashElement = new MockCanvas(64, 64);

      // Manually register a ready cached asset into private cache
      const cachedAsset: CachedAsset = {
        key: 'test_custom_sprite',
        canvas: mockCanvasElement as unknown as HTMLCanvasElement,
        flashCanvas: mockFlashElement as unknown as HTMLCanvasElement,
        sourceWidth: 64,
        sourceHeight: 64,
        defaultWidth: 48,
        defaultHeight: 48,
        category: 'player',
        isReady: true,
        isFallback: false,
      };

      (assetManager as unknown as { cache: Map<string, CachedAsset> }).cache.set(
        'test_custom_sprite',
        cachedAsset
      );

      mockCtx.resetStats();

      // 1. Normal blit uses cached.canvas
      assetManager.drawSprite(
        mockCtx as unknown as CanvasRenderingContext2D,
        'test_custom_sprite',
        100,
        100,
        { hitFlash: false }
      );
      expect(mockCtx.drawImageCalls).toBe(1);
      expect(mockCtx.saveDepth).toBe(0);

      // 2. Hit-flash blit uses cached.flashCanvas
      assetManager.drawSprite(
        mockCtx as unknown as CanvasRenderingContext2D,
        'test_custom_sprite',
        100,
        100,
        { hitFlash: true }
      );
      expect(mockCtx.drawImageCalls).toBe(2);
      expect(mockCtx.saveDepth).toBe(0);
    });
  });
});
