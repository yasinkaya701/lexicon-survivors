/**
 * AssetManager.ts
 *
 * Comprehensive Visual Asset Pipeline & Sprite Integration Engine for Brotato Roguelite.
 * Features:
 * - Preloads all 26 original AI-generated visual assets from public/assets/
 * - Zero-latency pre-baked chroma-keying (removes solid black/dark AI backgrounds with soft-edge feathering)
 * - Pre-baked pure white silhouette hit-flash variants for 60 FPS GPU blitting without composite overhead
 * - Automatic alias resolution (e.g. 'drop_material' -> 'pickup_material_crystal', 'enemy_ranged' -> 'enemy_ranged_shooter')
 * - Centered (x, y) blitting with rotation angle theta, scaling, flipX/flipY, and alpha modulation
 * - Seamless pattern tiling for arena floor and hazard walls
 * - Stylized procedural vector fallback renderer for offline/loading states
 * - SSR-safe Next.js 15 & React 19 compatibility with custom React hook
 */

import { useState, useEffect } from 'react';

export type AssetCategory =
  | 'player'
  | 'enemy'
  | 'weapon'
  | 'projectile'
  | 'vfx'
  | 'pickup'
  | 'terrain';

export type ChromaKeyMode = 'black' | 'white' | 'color' | 'none';

export interface ChromaKeyConfig {
  mode: ChromaKeyMode;
  /**
   * For 'black': maximum RGB channel value considered 100% transparent.
   * Default: 16 (for near-black AI backgrounds).
   */
  lowThreshold?: number;
  /**
   * For 'black': RGB channel value above which pixel is 100% opaque.
   * Values between lowThreshold and highThreshold are smoothly anti-aliased.
   * Default: 38.
   */
  highThreshold?: number;
  /**
   * Target RGB color for custom chroma-key mode.
   */
  targetColor?: { r: number; g: number; b: number };
}

export interface AssetManifestEntry {
  key: string;
  src: string;
  category: AssetCategory;
  defaultWidth: number;
  defaultHeight: number;
  chromaKey: ChromaKeyConfig;
  generateHitFlashVariant: boolean;
  aliases?: string[];
}

export interface DrawSpriteOptions {
  width?: number;
  height?: number;
  rotationRad?: number;
  scale?: number;
  flipX?: boolean;
  flipY?: boolean;
  alpha?: number;
  hitFlash?: boolean;
}

export interface CachedAsset {
  key: string;
  canvas: HTMLCanvasElement;
  flashCanvas?: HTMLCanvasElement;
  sourceWidth: number;
  sourceHeight: number;
  defaultWidth: number;
  defaultHeight: number;
  category: AssetCategory;
  pattern?: CanvasPattern;
  isReady: boolean;
  isFallback: boolean;
}

// ============================================================================
// 1. THE 26 AUTHORITATIVE VISUAL ASSET DEFINITIONS
// ============================================================================

// ============================================================================
// 1. THE HERO & CANONICAL ASSET DEFINITIONS
// ============================================================================

export const HERO_ASSET_MANIFEST: AssetManifestEntry[] = [
  {
    key: 'hero_rune_sorceress',
    src: '/assets/hero_rune_sorceress.png',
    category: 'player',
    defaultWidth: 96,
    defaultHeight: 96,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: true,
    aliases: ['rune_sorceress', 'player_rune_sorceress', 'rune'],
  },
  {
    key: 'hero_lexicon_alchemist',
    src: '/assets/hero_lexicon_alchemist.png',
    category: 'player',
    defaultWidth: 96,
    defaultHeight: 96,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: true,
    aliases: ['lexicon_alchemist', 'player_lexicon_alchemist', 'alchemist'],
  },
  {
    key: 'hero_shadow_scribe',
    src: '/assets/hero_shadow_scribe.png',
    category: 'player',
    defaultWidth: 96,
    defaultHeight: 96,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: true,
    aliases: ['shadow_scribe', 'player_shadow_scribe', 'scribe'],
  },
];

// ============================================================================
// 2. THE 26 AUTHORITATIVE VISUAL ASSET DEFINITIONS
// ============================================================================

export const ASSET_MANIFEST: AssetManifestEntry[] = [
  // --------------------------------------------------------------------------
  // A. Player Potato Avatars (4)
  // --------------------------------------------------------------------------
  {
    key: 'player_potato_scholar',
    src: '/assets/player_potato_scholar.png',
    category: 'player',
    defaultWidth: 96,
    defaultHeight: 96,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: true,
    aliases: ['player_potato', 'potato_scholar'],
  },
  {
    key: 'player_buept_student',
    src: '/assets/player_buept_student.png',
    category: 'player',
    defaultWidth: 96,
    defaultHeight: 96,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: true,
    aliases: ['buept_student', 'player_buept', 'buept_hero'],
  },
  {
    key: 'player_engineer',
    src: '/assets/player_engineer.png',
    category: 'player',
    defaultWidth: 96,
    defaultHeight: 96,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: true,
    aliases: ['engineer', 'player_potato_engineer'],
  },
  {
    key: 'player_tank_mutant',
    src: '/assets/player_tank_mutant.png',
    category: 'player',
    defaultWidth: 96,
    defaultHeight: 96,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: true,
    aliases: ['tank_mutant', 'mutant_tank', 'player_brawler'],
  },

  // --------------------------------------------------------------------------
  // B. Enemy Variants (5)
  // --------------------------------------------------------------------------
  {
    key: 'enemy_swarmer',
    src: '/assets/enemy_swarmer.png',
    category: 'enemy',
    defaultWidth: 32,
    defaultHeight: 32,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: true,
    aliases: ['swarmer', 'moth'],
  },
  {
    key: 'enemy_rusher',
    src: '/assets/enemy_rusher.png',
    category: 'enemy',
    defaultWidth: 40,
    defaultHeight: 40,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: true,
    aliases: ['rusher', 'hound'],
  },
  {
    key: 'enemy_tank',
    src: '/assets/enemy_tank.png',
    category: 'enemy',
    defaultWidth: 64,
    defaultHeight: 64,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: true,
    aliases: ['tank', 'golem'],
  },
  {
    key: 'enemy_ranged_shooter',
    src: '/assets/enemy_ranged_shooter.png',
    category: 'enemy',
    defaultWidth: 44,
    defaultHeight: 44,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: true,
    aliases: ['enemy_ranged', 'ranged', 'spitter'],
  },
  {
    key: 'enemy_elite_boss',
    src: '/assets/enemy_elite_boss.png',
    category: 'enemy',
    defaultWidth: 96,
    defaultHeight: 96,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: true,
    aliases: ['enemy_elite', 'elite', 'archon', 'boss'],
  },

  // --------------------------------------------------------------------------
  // C. Weapons (7)
  // --------------------------------------------------------------------------
  {
    key: 'weapon_pistol',
    src: '/assets/weapon_pistol.png',
    category: 'weapon',
    defaultWidth: 40,
    defaultHeight: 40,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['pistol'],
  },
  {
    key: 'weapon_shotgun',
    src: '/assets/weapon_shotgun.png',
    category: 'weapon',
    defaultWidth: 40,
    defaultHeight: 40,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['shotgun'],
  },
  {
    key: 'weapon_smg',
    src: '/assets/weapon_smg.png',
    category: 'weapon',
    defaultWidth: 40,
    defaultHeight: 40,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['smg'],
  },
  {
    key: 'weapon_wand',
    src: '/assets/weapon_wand.png',
    category: 'weapon',
    defaultWidth: 40,
    defaultHeight: 40,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['wand', 'magic_wand'],
  },
  {
    key: 'weapon_knife',
    src: '/assets/weapon_knife.png',
    category: 'weapon',
    defaultWidth: 40,
    defaultHeight: 40,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['knife', 'dagger'],
  },
  {
    key: 'weapon_sword',
    src: '/assets/weapon_sword.png',
    category: 'weapon',
    defaultWidth: 40,
    defaultHeight: 40,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['sword'],
  },
  {
    key: 'weapon_wrench',
    src: '/assets/weapon_wrench.png',
    category: 'weapon',
    defaultWidth: 40,
    defaultHeight: 40,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['wrench', 'pipe_wrench'],
  },

  // --------------------------------------------------------------------------
  // D. Projectiles & Visual VFX (5)
  // --------------------------------------------------------------------------
  {
    key: 'proj_bullet',
    src: '/assets/proj_bullet.png',
    category: 'projectile',
    defaultWidth: 16,
    defaultHeight: 16,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['bullet'],
  },
  {
    key: 'proj_magic_orb',
    src: '/assets/proj_magic_orb.png',
    category: 'projectile',
    defaultWidth: 20,
    defaultHeight: 20,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['magic_orb', 'orb'],
  },
  {
    key: 'proj_enemy_spit',
    src: '/assets/proj_enemy_spit.png',
    category: 'projectile',
    defaultWidth: 18,
    defaultHeight: 18,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['enemy_spit', 'spit', 'acid_bolt'],
  },
  {
    key: 'vfx_slash_arc',
    src: '/assets/vfx_slash_arc.png',
    category: 'vfx',
    defaultWidth: 64,
    defaultHeight: 64,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['slash_arc', 'melee_arc'],
  },
  {
    key: 'vfx_nova_ring',
    src: '/assets/vfx_nova_ring.png',
    category: 'vfx',
    defaultWidth: 140,
    defaultHeight: 140,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['nova_ring', 'nuke_shockwave'],
  },

  // --------------------------------------------------------------------------
  // E. Pickups & Collectibles (3)
  // --------------------------------------------------------------------------
  {
    key: 'pickup_material_crystal',
    src: '/assets/pickup_material_crystal.png',
    category: 'pickup',
    defaultWidth: 22,
    defaultHeight: 22,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['drop_material', 'material', 'gem'],
  },
  {
    key: 'pickup_health_fruit',
    src: '/assets/pickup_health_fruit.png',
    category: 'pickup',
    defaultWidth: 26,
    defaultHeight: 26,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['drop_fruit', 'fruit', 'apple'],
  },
  {
    key: 'pickup_mystery_chest',
    src: '/assets/pickup_mystery_chest.png',
    category: 'pickup',
    defaultWidth: 40,
    defaultHeight: 40,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['drop_chest', 'chest', 'mystery_chest'],
  },

  // --------------------------------------------------------------------------
  // F. Arena Terrain & Boundaries (2)
  // --------------------------------------------------------------------------
  {
    key: 'arena_tile_floor',
    src: '/assets/arena_tile_floor.png',
    category: 'terrain',
    defaultWidth: 128,
    defaultHeight: 128,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['floor', 'grid_floor'],
  },
  {
    key: 'arena_border_wall',
    src: '/assets/arena_border_wall.png',
    category: 'terrain',
    defaultWidth: 64,
    defaultHeight: 64,
    chromaKey: { mode: 'none' },
    generateHitFlashVariant: false,
    aliases: ['border_wall', 'hazard_wall'],
  },
];

// ============================================================================
// 2. CHROMA-KEYING & FLASH MASK PROCESSING PIPELINE
// ============================================================================

/**
 * Pre-processes an HTMLImageElement through an offscreen canvas:
 * 1. Draws image to matching resolution canvas.
 * 2. Applies soft-edge feathered chroma-keying to remove solid black/dark backgrounds.
 * 3. Applies defringing to prevent dark halos.
 */
export function processChromaKey(
  img: HTMLImageElement,
  config: ChromaKeyConfig
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width || 512;
  canvas.height = img.naturalHeight || img.height || 512;
  const ctx = canvas.getContext('2d');

  if (!ctx) return canvas;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (config.mode === 'none') {
    return canvas;
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const len = data.length;

  const low = config.lowThreshold ?? 18;
  const high = config.highThreshold ?? 42;
  const range = Math.max(1, high - low);

  if (config.mode === 'black') {
    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Max color channel determines background brightness
      const brightness = Math.max(r, g, b);

      if (brightness <= low) {
        data[i + 3] = 0; // Completely transparent
      } else if (brightness < high) {
        // Smooth soft-edge transition (feathering)
        const factor = (brightness - low) / range;
        data[i + 3] = Math.floor(data[i + 3] * factor);

        // Defringe: scale color back up to avoid dark edge halo
        const safeFactor = Math.max(0.15, factor);
        data[i] = Math.min(255, Math.floor(r / safeFactor));
        data[i + 1] = Math.min(255, Math.floor(g / safeFactor));
        data[i + 2] = Math.min(255, Math.floor(b / safeFactor));
      }
    }
    ctx.putImageData(imageData, 0, 0);
  } else if (config.mode === 'white') {
    const whiteLow = config.lowThreshold ?? 220;
    const whiteHigh = config.highThreshold ?? 248;
    const whiteRange = Math.max(1, whiteHigh - whiteLow);

    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const minVal = Math.min(r, g, b);

      if (minVal >= whiteHigh) {
        data[i + 3] = 0;
      } else if (minVal > whiteLow) {
        const factor = 1.0 - (minVal - whiteLow) / whiteRange;
        data[i + 3] = Math.floor(data[i + 3] * factor);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas;
}

/**
 * Creates a pre-baked pure white silhouette version of a sprite.
 * Uses native GPU source-in compositing to preserve exact alpha/anti-aliasing.
 */
export function createHitFlashVariant(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const flashCanvas = document.createElement('canvas');
  flashCanvas.width = sourceCanvas.width;
  flashCanvas.height = sourceCanvas.height;
  const ctx = flashCanvas.getContext('2d');

  if (!ctx) return sourceCanvas;

  // Draw source sprite
  ctx.drawImage(sourceCanvas, 0, 0);

  // Overlay pure white with source-in composite mode
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, flashCanvas.width, flashCanvas.height);

  return flashCanvas;
}

// ============================================================================
// 3. HIGH-FIDELITY PROCEDURAL VECTOR FALLBACK RENDERER
// ============================================================================

export function renderFallback(
  ctx: CanvasRenderingContext2D,
  key: string,
  category: AssetCategory,
  width: number,
  height: number,
  options?: DrawSpriteOptions
): void {
  const radius = Math.min(width, height) / 2;
  const isFlashing = options?.hitFlash ?? false;

  ctx.save();

  // A1. RUNE SORCERESS FALLBACK
  if (key.includes('rune')) {
    ctx.fillStyle = isFlashing ? '#ffffff' : '#0369a1';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Astral Star Glyph in Center
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    for (let r = 0; r < 4; r++) {
      const a = (r * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * 0.2, Math.sin(a) * radius * 0.2);
      ctx.lineTo(Math.cos(a) * radius * 0.75, Math.sin(a) * radius * 0.75);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // A2. LEXICON ALCHEMIST FALLBACK
  if (key.includes('alchemist')) {
    ctx.fillStyle = isFlashing ? '#ffffff' : '#b45309';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing Flask Center
    ctx.fillStyle = '#14b8a6';
    ctx.beginPath();
    ctx.arc(0, radius * 0.2, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // A3. SHADOW SCRIBE FALLBACK
  if (key.includes('scribe')) {
    ctx.fillStyle = isFlashing ? '#ffffff' : '#581c87';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Golden Calligraphy Quill Nib
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.7);
    ctx.lineTo(radius * 0.3, radius * 0.4);
    ctx.lineTo(0, radius * 0.15);
    ctx.lineTo(-radius * 0.3, radius * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  // A. PLAYER POTATO FALLBACK
  if (category === 'player' || key.startsWith('player')) {
    // Potato Body
    ctx.fillStyle = isFlashing ? '#ffffff' : '#d97706';
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.9, radius * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rosy Cheeks
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(-radius * 0.45, radius * 0.2, radius * 0.16, 0, Math.PI * 2);
    ctx.arc(radius * 0.45, radius * 0.2, radius * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-radius * 0.3, -radius * 0.15, radius * 0.14, 0, Math.PI * 2);
    ctx.arc(radius * 0.3, -radius * 0.15, radius * 0.14, 0, Math.PI * 2);
    ctx.fill();

    // Highlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-radius * 0.35, -radius * 0.2, radius * 0.05, 0, Math.PI * 2);
    ctx.arc(radius * 0.25, -radius * 0.2, radius * 0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return;
  }

  // B. ENEMY VARIANTS FALLBACK
  if (category === 'enemy' || key.startsWith('enemy')) {
    if (key.includes('swarmer')) {
      ctx.fillStyle = isFlashing ? '#ffffff' : '#f97316';
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Moth mini-wings
      ctx.fillStyle = 'rgba(251, 146, 60, 0.7)';
      ctx.beginPath();
      ctx.ellipse(-radius * 0.7, -radius * 0.3, radius * 0.5, radius * 0.25, -0.4, 0, Math.PI * 2);
      ctx.ellipse(radius * 0.7, -radius * 0.3, radius * 0.5, radius * 0.25, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (key.includes('rusher')) {
      ctx.fillStyle = isFlashing ? '#ffffff' : '#ec4899';
      ctx.strokeStyle = '#db2777';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Speed horns
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(-radius * 0.4, -radius * 0.7);
      ctx.lineTo(0, -radius * 1.2);
      ctx.lineTo(radius * 0.4, -radius * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (key.includes('tank')) {
      ctx.fillStyle = isFlashing ? '#ffffff' : '#64748b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Granite Shield Plate
      ctx.fillStyle = '#475569';
      ctx.fillRect(-radius * 0.5, -radius * 0.5, radius, radius);
    } else if (key.includes('ranged')) {
      ctx.fillStyle = isFlashing ? '#ffffff' : '#10b981';
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eye pupil
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (key.includes('elite')) {
      ctx.fillStyle = isFlashing ? '#ffffff' : '#8b5cf6';
      ctx.strokeStyle = '#6d28d9';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Golden Crown
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-radius * 0.6, -radius * 0.8);
      ctx.lineTo(-radius * 0.3, -radius * 1.25);
      ctx.lineTo(0, -radius * 0.9);
      ctx.lineTo(radius * 0.3, -radius * 1.25);
      ctx.lineTo(radius * 0.6, -radius * 0.8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // C. WEAPONS FALLBACK
  if (category === 'weapon' || key.startsWith('weapon')) {
    if (key.includes('pistol') || key.includes('smg') || key.includes('shotgun')) {
      // Gun Barrel & Grip
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.fillRect(0, -width * 0.12, width * 0.5, width * 0.24);
      ctx.strokeRect(0, -width * 0.12, width * 0.5, width * 0.24);

      // Grip
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width * 0.15, width * 0.3);

      // Cyan spark
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(width * 0.52, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (key.includes('wand')) {
      // Magic Staff
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-width * 0.05, -height * 0.45, width * 0.1, height * 0.9);

      // Purple Orb Tip
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(0, -height * 0.45, width * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Melee Blade / Wrench
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.fillRect(0, -height * 0.1, width * 0.55, height * 0.2);
      ctx.strokeRect(0, -height * 0.1, width * 0.55, height * 0.2);
    }
    ctx.restore();
    return;
  }

  // D. PICKUPS FALLBACK
  if (category === 'pickup' || key.startsWith('pickup') || key.startsWith('drop')) {
    if (key.includes('material') || key.includes('crystal')) {
      // Emerald Diamond
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -radius);
      ctx.lineTo(radius, 0);
      ctx.lineTo(0, radius);
      ctx.lineTo(-radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (key.includes('fruit') || key.includes('apple')) {
      // Red Apple
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
      ctx.fill();
      // Green Leaf
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(radius * 0.2, -radius * 0.8, radius * 0.3, radius * 0.15, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (key.includes('chest')) {
      // Golden Chest
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.fillRect(-radius, -radius * 0.8, radius * 2, radius * 1.6);
      ctx.strokeRect(-radius, -radius * 0.8, radius * 2, radius * 1.6);
      // '?'
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(radius)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 0);
    }
    ctx.restore();
    return;
  }

  // E. PROJECTILES & VFX FALLBACK
  if (category === 'projectile' || category === 'vfx') {
    ctx.fillStyle = key.includes('bullet')
      ? '#38bdf8'
      : key.includes('magic')
      ? '#c084fc'
      : key.includes('spit')
      ? '#4ade80'
      : '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Generic fallback shape
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

// ============================================================================
// 4. CORE ASSET MANAGER CLASS
// ============================================================================

export class AssetManager {
  private cache = new Map<string, CachedAsset>();
  private aliasMap = new Map<string, string>();
  private isPreloaded = false;
  private isPreloading = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.registerAliases();
  }

  /**
   * Registers primary keys and bidirectional aliases.
   */
  private registerAliases(): void {
    const combined = [...ASSET_MANIFEST, ...HERO_ASSET_MANIFEST];
    for (const entry of combined) {
      this.aliasMap.set(entry.key, entry.key);
      if (entry.aliases) {
        for (const alias of entry.aliases) {
          this.aliasMap.set(alias, entry.key);
        }
      }
    }
  }

  /**
   * Resolves an asset key or alias to its canonical primary key.
   */
  public resolveKey(key: string): string {
    return this.aliasMap.get(key) || key;
  }

  /**
   * Finds the manifest definition for a given key or alias.
   */
  public getManifestEntry(key: string): AssetManifestEntry | undefined {
    const canonical = this.resolveKey(key);
    return [...ASSET_MANIFEST, ...HERO_ASSET_MANIFEST].find((e) => e.key === canonical);
  }

  /**
   * Loads and processes a single asset entry.
   * If the image file is missing or fails (404), seamlessly registers a fallback canvas.
   */
  public async loadAsset(entry: AssetManifestEntry): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    return new Promise<boolean>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const processedCanvas = processChromaKey(img, entry.chromaKey);
          let flashCanvas: HTMLCanvasElement | undefined;

          if (entry.generateHitFlashVariant) {
            flashCanvas = createHitFlashVariant(processedCanvas);
          }

          const cached: CachedAsset = {
            key: entry.key,
            canvas: processedCanvas,
            flashCanvas,
            sourceWidth: processedCanvas.width,
            sourceHeight: processedCanvas.height,
            defaultWidth: entry.defaultWidth,
            defaultHeight: entry.defaultHeight,
            category: entry.category,
            isReady: true,
            isFallback: false,
          };

          this.cache.set(entry.key, cached);
          resolve(true);
        } catch {
          this.registerProceduralFallback(entry);
          resolve(false);
        }
      };

      img.onerror = () => {
        // Missing or unloaded image: fallback registered gracefully
        this.registerProceduralFallback(entry);
        resolve(false);
      };

      img.src = entry.src;
    });
  }

  /**
   * Creates a cached offscreen procedural fallback canvas for a manifest entry.
   */
  private registerProceduralFallback(entry: AssetManifestEntry): void {
    if (typeof document === 'undefined') return;

    const w = entry.defaultWidth || 64;
    const h = entry.defaultHeight || 64;
    const canvas = document.createElement('canvas');
    canvas.width = w * 2; // 2x resolution for clean canvas rendering
    canvas.height = h * 2;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.translate(w, h);
      renderFallback(ctx, entry.key, entry.category, w, h);
    }

    let flashCanvas: HTMLCanvasElement | undefined;
    if (entry.generateHitFlashVariant) {
      flashCanvas = createHitFlashVariant(canvas);
    }

    const cached: CachedAsset = {
      key: entry.key,
      canvas,
      flashCanvas,
      sourceWidth: canvas.width,
      sourceHeight: canvas.height,
      defaultWidth: entry.defaultWidth,
      defaultHeight: entry.defaultHeight,
      category: entry.category,
      isReady: true,
      isFallback: true,
    };

    this.cache.set(entry.key, cached);
  }

  /**
   * Preloads all 26 visual assets concurrently.
   * Safe to call multiple times; returns shared promise.
   */
  public async preloadAll(
    onProgress?: (loaded: number, total: number, key: string) => void
  ): Promise<void> {
    if (this.isPreloaded) return;
    if (this.loadPromise) return this.loadPromise;

    if (typeof window === 'undefined') {
      return Promise.resolve();
    }

    this.isPreloading = true;
    let loadedCount = 0;
    const allEntries = [...ASSET_MANIFEST, ...HERO_ASSET_MANIFEST];
    const totalCount = allEntries.length;

    this.loadPromise = (async () => {
      const promises = allEntries.map(async (entry) => {
        await this.loadAsset(entry);
        loadedCount++;
        if (onProgress) {
          onProgress(loadedCount, totalCount, entry.key);
        }
      });

      await Promise.all(promises);
      this.isPreloaded = true;
      this.isPreloading = false;
    })();

    return this.loadPromise;
  }

  /**
   * Checks if an asset is cached and ready to blit.
   */
  public isReady(key: string): boolean {
    const canonical = this.resolveKey(key);
    return this.cache.has(canonical);
  }

  /**
   * Retrieves a cached asset by canonical key or alias.
   */
  public get(key: string): CachedAsset | undefined {
    const canonical = this.resolveKey(key);
    return this.cache.get(canonical);
  }

  /**
   * Blits a sprite centered at (x, y) with optional rotation, scale, flip, and hit-flash.
   * If the asset is still loading or missing, renders a procedural vector fallback.
   */
  public drawSprite(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number,
    options?: DrawSpriteOptions
  ): void {
    const canonical = this.resolveKey(key);
    const cached = this.cache.get(canonical);
    const manifest = this.getManifestEntry(canonical);

    const w = options?.width ?? cached?.defaultWidth ?? manifest?.defaultWidth ?? 48;
    const h = options?.height ?? cached?.defaultHeight ?? manifest?.defaultHeight ?? 48;
    const scale = options?.scale ?? 1.0;
    const flipX = options?.flipX ?? false;
    const flipY = options?.flipY ?? false;
    const rotation = options?.rotationRad ?? 0;
    const alpha = options?.alpha ?? 1.0;
    const hitFlash = options?.hitFlash ?? false;

    ctx.save();
    ctx.translate(x, y);

    if (rotation !== 0) {
      ctx.rotate(rotation);
    }

    if (scale !== 1.0 || flipX || flipY) {
      ctx.scale(flipX ? -scale : scale, flipY ? -scale : scale);
    }

    if (alpha !== 1.0) {
      ctx.globalAlpha *= alpha;
    }

    if (cached && cached.isReady) {
      const imgToDraw = hitFlash && cached.flashCanvas ? cached.flashCanvas : cached.canvas;
      ctx.drawImage(imgToDraw, -w / 2, -h / 2, w, h);
    } else {
      // Fallback procedural render
      const category = manifest?.category ?? 'player';
      renderFallback(ctx, canonical, category, w, h, options);
    }

    ctx.restore();
  }

  /**
   * Renders a seamless repeating tiled texture (e.g. arena floor or hazard walls).
   */
  public drawTiled(
    ctx: CanvasRenderingContext2D,
    key: string,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): void {
    const canonical = this.resolveKey(key);
    const cached = this.cache.get(canonical);
    const width = maxX - minX;
    const height = maxY - minY;

    if (cached && cached.isReady) {
      if (!cached.pattern) {
        cached.pattern = ctx.createPattern(cached.canvas, 'repeat') || undefined;
      }
      if (cached.pattern) {
        ctx.save();
        ctx.fillStyle = cached.pattern;
        ctx.fillRect(minX, minY, width, height);
        ctx.restore();
        return;
      }
    }

    // Fallback Grid Rendering
    ctx.save();
    ctx.fillStyle = '#090d16';
    ctx.fillRect(minX, minY, width, height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 64;
    for (let gx = minX; gx <= maxX; gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, minY);
      ctx.lineTo(gx, maxY);
      ctx.stroke();
    }
    for (let gy = minY; gy <= maxY; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(minX, gy);
      ctx.lineTo(maxX, gy);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Clears internal cache and pattern references.
   */
  public clearCache(): void {
    this.cache.clear();
    this.isPreloaded = false;
    this.isPreloading = false;
    this.loadPromise = null;
  }
}

// Global Singleton Instance
export const assetManager = new AssetManager();

// ============================================================================
// 5. REACT HOOK INTEGRATION
// ============================================================================

export interface UseAssetLoaderResult {
  isLoaded: boolean;
  isPreloading: boolean;
  progress: number; // 0.0 to 1.0
  loadedCount: number;
  totalCount: number;
  error: string | null;
  manager: AssetManager;
}

/**
 * React 19 / Next.js client hook for tracking asset preloading.
 * Safe for client-side execution; no-ops during SSR.
 */
export function useAssetLoader(autoPreload = true): UseAssetLoaderResult {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoPreload || typeof window === 'undefined') return;

    setIsPreloading(true);
    assetManager
      .preloadAll((loaded, total) => {
        setLoadedCount(loaded);
        setProgress(loaded / Math.max(1, total));
      })
      .then(() => {
        setIsLoaded(true);
        setIsPreloading(false);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to preload visual assets');
        setIsPreloading(false);
      });
  }, [autoPreload]);

  return {
    isLoaded,
    isPreloading,
    progress,
    loadedCount,
    totalCount: ASSET_MANIFEST.length,
    error,
    manager: assetManager,
  };
}

