# Comprehensive Survey Report: Visual Asset Pipeline, Canvas Rendering, Player Prominence, and UI/HUD Overhaul (R1)

**Working Directory**: `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_survey2_1/`  
**Target Milestone**: R1 (Visual Asset Overhaul and UI Polish)  
**Parent Conversation ID**: `4eef8933-c68f-4d51-b121-5388876d97ee`  

---

## 1. Observation

### 1.1 Existing Sprite Assets in `public/assets/`
Using macOS image property inspection (`sips -g hasAlpha -g pixelWidth -g pixelHeight public/assets/*.png`) and `file public/assets/*`, the exact specifications of all 26 authoritative sprite files were recorded:

| Asset Key | File Path | Resolution | Color Channels | Alpha Channel (`hasAlpha`) |
|---|---|---|---|---|
| `player_potato_scholar` | `public/assets/player_potato_scholar.png` | 1024 x 1024 | 8-bit RGB | **no** |
| `player_buept_student` | `public/assets/player_buept_student.png` | 1024 x 1024 | 8-bit RGB | **no** |
| `player_engineer` | `public/assets/player_engineer.png` | 1024 x 1024 | 8-bit RGB | **no** |
| `player_tank_mutant` | `public/assets/player_tank_mutant.png` | 1024 x 1024 | 8-bit RGB | **no** |
| `enemy_swarmer` | `public/assets/enemy_swarmer.png` | 1024 x 1024 | 8-bit RGB | **no** |
| `enemy_rusher` | `public/assets/enemy_rusher.png` | 1024 x 1024 | 8-bit RGB | **no** |
| `enemy_tank` | `public/assets/enemy_tank.png` | 1024 x 1024 | 8-bit RGB | **no** |
| `enemy_ranged_shooter` | `public/assets/enemy_ranged_shooter.png` | 1024 x 1024 | 8-bit RGB | **no** |
| `enemy_elite_boss` | `public/assets/enemy_elite_boss.png` | 1024 x 1024 | 8-bit RGB | **no** |
| `weapon_pistol` | `public/assets/weapon_pistol.png` | 1024 x 1024 | 8-bit RGB | **no** |
| `weapon_shotgun` | `public/assets/weapon_shotgun.png` | 1024 x 1024 | 8-bit RGB | **no** |
| `weapon_smg` | `public/assets/weapon_smg.png` | 1024 x 1024 | 8-bit RGB | **no** |
| `weapon_knife` | `public/assets/weapon_knife.png` | 1024 x 1024 | 8-bit RGB | **no** |
| `weapon_sword` | `public/assets/weapon_sword.png` | 512 x 512 | 8-bit RGB | **no** |
| `weapon_wand` | `public/assets/weapon_wand.png` | 512 x 512 | 8-bit RGB | **no** |
| `weapon_wrench` | `public/assets/weapon_wrench.png` | 512 x 512 | 8-bit RGB | **no** |
| `proj_bullet` | `public/assets/proj_bullet.png` | 256 x 256 | 8-bit RGB | **no** |
| `proj_enemy_spit` | `public/assets/proj_enemy_spit.png` | 256 x 256 | 8-bit RGB | **no** |
| `proj_magic_orb` | `public/assets/proj_magic_orb.png` | 256 x 256 | 8-bit RGB | **no** |
| `vfx_nova_ring` | `public/assets/vfx_nova_ring.png` | 512 x 512 | 8-bit RGB | **no** |
| `vfx_slash_arc` | `public/assets/vfx_slash_arc.png` | 512 x 512 | 8-bit RGB | **no** |
| `pickup_material_crystal`| `public/assets/pickup_material_crystal.png` | 256 x 256 | 8-bit RGB | **no** |
| `pickup_health_fruit` | `public/assets/pickup_health_fruit.png` | 256 x 256 | 8-bit RGB | **no** |
| `pickup_mystery_chest` | `public/assets/pickup_mystery_chest.png` | 512 x 512 | 8-bit RGB | **no** |
| `arena_tile_floor` | `public/assets/arena_tile_floor.png` | 512 x 512 | 8-bit RGB | **no** |
| `arena_border_wall` | `public/assets/arena_border_wall.png` | 256 x 256 | 8-bit RGB | **no** |

*Direct Observation*: Every single image in `public/assets/` is a solid RGB image with **no native alpha channel**.

### 1.2 Asset Loading & Processing Pipeline in `src/game/engine/AssetManager.ts`
Inspection of `src/game/engine/AssetManager.ts` reveals:
1. `ASSET_MANIFEST` (lines 88-372) declares 26 entries with keys, file sources, categories, default dimensions, and `chromaKey: { mode: 'black', lowThreshold: 18, highThreshold: 42 }` (except terrain which has `{ mode: 'none' }`).
2. `processChromaKey` (lines 384-454):
   ```typescript
   export function processChromaKey(img: HTMLImageElement, config: ChromaKeyConfig): HTMLCanvasElement {
     // ...
     const low = config.lowThreshold ?? 18;
     const high = config.highThreshold ?? 42;
     const range = Math.max(1, high - low);
     if (config.mode === 'black') {
       for (let i = 0; i < len; i += 4) {
         const r = data[i];
         const g = data[i + 1];
         const b = data[i + 2];
         const brightness = Math.max(r, g, b);
         if (brightness <= low) {
           data[i + 3] = 0; // Completely transparent
         } else if (brightness < high) {
           const factor = (brightness - low) / range;
           data[i + 3] = Math.floor(data[i + 3] * factor);
           const safeFactor = Math.max(0.15, factor);
           data[i] = Math.min(255, Math.floor(r / safeFactor));
           data[i + 1] = Math.min(255, Math.floor(g / safeFactor));
           data[i + 2] = Math.min(255, Math.floor(b / safeFactor));
         }
       }
       ctx.putImageData(imageData, 0, 0);
     }
   }
   ```
3. `createHitFlashVariant` (lines 460-477):
   ```typescript
   export function createHitFlashVariant(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
     const flashCanvas = document.createElement('canvas');
     flashCanvas.width = sourceCanvas.width;
     flashCanvas.height = sourceCanvas.height;
     const ctx = flashCanvas.getContext('2d');
     if (!ctx) return sourceCanvas;
     ctx.drawImage(sourceCanvas, 0, 0);
     ctx.globalCompositeOperation = 'source-in';
     ctx.fillStyle = '#ffffff';
     ctx.fillRect(0, 0, flashCanvas.width, flashCanvas.height);
     return flashCanvas;
   }
   ```
4. `renderFallback` (lines 483-721): Contains high-fidelity procedural 2D canvas drawing routines for player, enemies, weapons, projectiles, and pickups.

### 1.3 Player Drawing and Canvas Dimensions in `src/components/GameCanvas.tsx`
Direct inspection of `src/components/GameCanvas.tsx`:
1. **Canvas Resolution & Arena Bounds** (lines 876-880, and `src/game/engine/Collision.ts` lines 19-24):
   - `<canvas width={1920} height={1080} className="h-full w-full object-contain" />`
   - Arena bounds: `minX: 100`, `maxX: 1820` (width = 1720px), `minY: 100`, `maxY: 980` (height = 880px).
2. **Player Entity State** (lines 144-166):
   - `playerRef.current.radius = 24` (hitbox diameter = 48px).
   - `playerMovementRef.current.radius = 24`.
3. **Player Drawing Code** (lines 758-775):
   ```typescript
   const playerAlpha = player.isInvulnerable
     ? 0.5 + 0.5 * Math.sin(Date.now() * 0.03)
     : 1.0;

   assetManager.drawSprite(
     ctx,
     player.characterId || player.spriteName || 'player_potato_scholar',
     player.x,
     player.y,
     {
       width: player.radius * 2.6,   // 24 * 2.6 = 62.4 px
       height: player.radius * 2.6,  // 62.4 px
       rotationRad: player.facingAngleRad,
       alpha: playerAlpha,
       hitFlash: player.isInvulnerable && Math.floor(Date.now() / 80) % 2 === 0,
     }
   );
   ```
4. **Orbiting Weapons** (lines 777-793):
   ```typescript
   const orbitAngle = (i * 2 * Math.PI) / Math.max(1, weaponCount) + Date.now() * 0.001;
   const orbitDist = player.radius + 16; // 24 + 16 = 40 px
   const wx = player.x + Math.cos(orbitAngle) * orbitDist;
   const wy = player.y + Math.sin(orbitAngle) * orbitDist;

   assetManager.drawSprite(ctx, inst.blueprint.spriteName, wx, wy, {
     width: 28,
     height: 28,
     rotationRad: inst.currentAngleRad,
   });
   ```
5. **Enemy Sizing in `GameCanvas.tsx`** (lines 707-715):
   - `enemy.radius * 2.4`:
     - Swarmer: `16 * 2.4 = 38.4 px`
     - Rusher: `20 * 2.4 = 48.0 px`
     - Ranged: `22 * 2.4 = 52.8 px`
     - Tank: `32 * 2.4 = 76.8 px` (Notice: Tank enemy is 76.8px vs Player 62.4px!)
     - Elite Boss: `48 * 2.4 = 115.2 px`
6. **Visual Ground Decal & Aim Indicator**:
   - Zero ground drop shadow or hero illumination aura is drawn under `player.x, player.y`.
   - Zero aim direction chevron or laser guideline is rendered.

### 1.4 User Interface and HUD Structure
1. `src/components/HUD.tsx` (232 lines):
   - Top-left player card uses emoji `🥔` (line 59).
   - Top-right materials pill uses emoji `💎` (line 115).
   - Bottom weapon inventory bar is hardcoded inline inside `HUD.tsx` (lines 172-228), using emojis `⚔️`, `🗡️`, `💥`, `🔫` (lines 194-201).
   - Cooldown indicator is a basic vertical translucent block.
   - Lacks an in-wave question charge button or charge meter.
2. `src/components/ShopModal.tsx` (258 lines):
   - Header uses emoji `🛒` (line 80) and `💎` (line 98).
   - 4-slot grid displays textual descriptions and stat modifiers without visual weapon sprite icons.
3. `src/components/StudyBuffModal.tsx` (596 lines):
   - Subject options use emojis `📐`, `📖`, `⚡`, `🏛️`, `🎓` (lines 58, 70, 82, 94, 106).
   - Includes full 20s countdown, multiple choice / evidence hunt logic, and 3-card reward selection.
4. `src/components/TacticalFreezeModal.tsx` (384 lines):
   - Implements frame-accurate `dt=0` combat pause, 15s timer, 4 tactical superpowers cards.
5. `src/components/TelemetryModal.tsx` (82 lines) & `MasteryRadarChart.tsx` (172 lines):
   - Displays 5-axis SVG polygonal spider radar chart.
6. `src/components/WeaponInventoryBar.tsx`:
   - File does NOT currently exist in `src/components/`, despite being listed in `PROJECT.md` (line 30) and `tests/adversarial/imports_integrity.test.ts` (line 337).

### 1.5 Automated Test Suite & Integrity Baseline
Executed command:
`export PATH="$HOME/.local/node/bin:$PATH" && npm test && npx tsc --noEmit && npm run lint`
- **Result**: Exit code 0.
- **Vitest**: 18 test files, 377 passed (0 failed) in 1.98s.
- **TypeScript**: 0 type errors.
- **ESLint**: 0 warnings, 0 errors.

---

## 2. Logic Chain

### 2.1 Why Textures Are Corrupted and Visually Noisy
1. *Observation 1.1* proves that all 26 existing PNG files are 24-bit RGB files without alpha transparency.
2. *Observation 1.2* proves that `AssetManager.ts` runs CPU chroma-keying with `lowThreshold: 18` and `highThreshold: 42`.
3. Because the AI images were generated with dark or near-black backgrounds, any internal dark pigment on the characters (eyes, pupils, glasses, dark suits, black weapon barrels, metal outlines) has RGB channel values below 42.
4. Consequently, `processChromaKey` sets `alpha = 0` or semi-transparent for those interior pixels. This creates the "swiss cheese" effect, where characters have hollow eyes and transparent holes in their bodies and weapons.
5. Furthermore, anti-aliased transitions between the AI character and the black background produce dark border halos that feather into jagged fringe artifacts.
6. When downscaled from 1024x1024 to 32px-64px on the canvas without mipmapping, high-frequency AI generation noise scintillates, creating shimmering, grainy visual artifacts during gameplay.

### 2.2 Why the Player Character Lacks Prominence and Visibility
1. *Observation 1.3* shows the canvas resolution is 1920x1080 and the arena bounds are 1720x880.
2. The player is drawn with dimensions `player.radius * 2.6 = 62.4px`.
3. 62.4px represents only **3.25%** of horizontal canvas resolution and occupies only **0.187%** of screen area.
4. In contrast, regular enemy tanks are drawn at `76.8px` (23% larger than the player) and bosses are drawn at `115.2px`.
5. *Observation 1.3* confirms there is no ground drop shadow, hero energy aura, or orientation reticle drawn around the player.
6. Against the dark arena tiles and swarms of 30-50 colorful enemies and projectiles, the tiny 62.4px potato character completely disappears, making evasion and combat tracking visually frustrating.

### 2.3 Why the UI and HUD Need Structural Modularization and Modernization
1. *Observation 1.4* reveals that `HUD.tsx`, `ShopModal.tsx`, and `StudyBuffModal.tsx` rely extensively on system emojis (`🥔`, `💎`, `🛒`, `⚔️`, `🗡️`, `💥`, `🔫`, `📐`, `📖`, `⚡`, `🏛️`, `🎓`). Emojis render inconsistently across operating systems and clash severely with a modern cyberpunk/academic roguelite aesthetic.
2. *Observation 1.4* confirms that `WeaponInventoryBar.tsx` is missing as a standalone component, despite being permitted and expected by `imports_integrity.test.ts` and `PROJECT.md`.
3. Extracting `WeaponInventoryBar.tsx` allows the HUD to display crisp vector weapon sprites, dynamic tier rarity glows (Common, Uncommon, Rare, Legendary), slot hotkeys (`1`-`6`), and smooth cooldown sweeps.
4. Requirement R3 (Mid-Wave Question Charges) requires an in-game trigger and visual charge indicator on the HUD, which is currently missing.

---

## 3. Caveats

1. **Read-Only Investigation**: In compliance with the Teamwork Explorer identity and constraints, no production files or source code in `src/` or `public/` were modified during this survey.
2. **Hitbox Balance Preservation**: While visual sprite dimensions must be significantly scaled up to ~100px, the physical collision hitbox (`player.radius`) must not be scaled up excessively (recommended: 26px to 28px) so that tight bullet dodging and hitbox feel remain balanced and enjoyable without colliding unfairly with projectiles.
3. **Test Compatibility Guarantee**: Existing tests (`tests/stress/assets_and_canvas_stress.test.ts`) assert that `ASSET_MANIFEST.length === 26`, and verify all 26 canonical keys and aliases. Any asset upgrade must preserve the exact canonical keys, aliases, and category mappings.
4. **Offline / Fallback Resilience**: Any changes to `AssetManager.ts` must maintain the procedural vector fallback renderer (`renderFallback`) so that SSR and headless unit tests continue passing with zero dependencies on network or DOM image loading.

---

## 4. Conclusion & Actionable Overhaul Plan

### 4.1 Asset Pipeline Upgrade Plan (Eliminating Visual Noise & Corruption)
1. **Target Asset Format**:
   - Upgrade all 26 assets in `public/assets/` to **32-bit RGBA PNGs** with **native alpha transparency** (`hasAlpha: yes`).
   - Resolution: 512 x 512 px (crisp high-resolution digital vector illustration style, fast preloading, zero VRAM bloat).
   - Style Guide: Modern, cohesive digital vector art inspired by Brotato / Hades UI. Thick dark outlines (3-4px at canvas scale), flat/cel-shaded color fills, radiant vector highlights, zero grainy photo-texture noise.
2. **`AssetManager.ts` Chroma-Key Bypass**:
   - For all 24 entity/weapon/pickup assets with clean native alpha channels, set `chromaKey: { mode: 'none' }` in `ASSET_MANIFEST`.
   - When `mode === 'none'`, `processChromaKey` immediately returns the canvas without running CPU per-pixel thresholding. This completely eliminates the swiss-cheese effect and preserves 100% of internal dark features (eyes, glasses, ink lines, metal gun grips).
3. **Canvas Interpolation Quality**:
   - In `GameCanvas.tsx`, set:
     ```typescript
     ctx.imageSmoothingEnabled = true;
     ctx.imageSmoothingQuality = 'high';
     ```
     This ensures smooth, anti-aliased scaling from 512px assets down to 32-100px render sizes.

### 4.2 Player Scaling & Canvas Prominence Plan
1. **Dimensions**:
   - **Physics Hitbox**: Adjust `player.radius` from `24` to `28` (diameter 56px).
   - **Visual Sprite Scale Multiplier**: In `GameCanvas.tsx`, change `player.radius * 2.6` to `player.radius * 3.6` (rendering width & height = **100.8px**).
   - In `AssetManager.ts`, update player avatar default dimensions from `56x56` to **`96x96`**.
   - Result: Player visual area increases by **2.6x**, making the character clearly visible and commanding on the arena canvas.
2. **Ground Drop Shadow & Hero Energy Aura**:
   - Beneath the player at `(player.x, player.y + player.radius * 0.75)`, render a soft elliptical ambient drop shadow:
     ```typescript
     ctx.save();
     ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
     ctx.beginPath();
     ctx.ellipse(player.x, player.y + player.radius * 0.75, player.radius * 1.25, player.radius * 0.5, 0, 0, Math.PI * 2);
     ctx.fill();
     ctx.restore();
     ```
   - Render a glowing hero aura circle (subtle cyan/indigo pulse) around the player base to immediately distinguish the hero during chaotic 50-enemy swarms.
3. **Aim Directional Guide**:
   - Render a sleek holographic directional indicator or chevron arc in front of the player pointing toward `player.facingAngleRad`.
4. **Equipped Weapon Orbit Expansion**:
   - Increase `orbitDist` from `player.radius + 16` (40px) to **`player.radius + 28`** (~56px).
   - Increase orbiting weapon sprite render dimensions from `28x28` to **`38x38`** or **`40x40`**.
   - Add tier-colored energy trails for active weapons.
5. **Invulnerability Energy Bubble**:
   - When `player.isInvulnerable` is true, render a radiant hexagonal or circular energy shield outline (`ctx.strokeStyle = '#38bdf8'`, pulsing `lineWidth`) instead of a simple opacity flicker.

### 4.3 UI & HUD Redesign Plan
1. **Dedicated `WeaponInventoryBar.tsx` Component**:
   - Create `src/components/WeaponInventoryBar.tsx` accepting `weapons: (ActiveWeaponInstance | null)[]`.
   - Render 6 weapon slots with:
     - High-contrast tier borders (Tier 1: Slate/Silver, Tier 2: Neon Cyan, Tier 3: Radiant Amethyst, Tier 4: Solar Gold).
     - Crisp vector weapon sprite icon drawn from `AssetManager.ts` (falling back to vector icon, NOT emoji).
     - Vertical radial cooldown sweep shader.
     - Slot hotkey badges (`1` to `6`).
2. **Modernization of `HUD.tsx`**:
   - Replace emoji `🥔` with a stylized high-res hero avatar portrait badge with glowing rarity ring.
   - Replace emoji `💎` with a vector crystal icon (`Sparkles` / faceted gem vector).
   - Re-engineer the HP bar with a segmented cyberpunk health gauge, numeric readout, and optional shield cap indicator.
   - Add the **In-Wave Question Charge Indicator & Hotkey Trigger** (e.g. `[SPACE]` or `[Q]` charge button for R3).
3. **Polishing `ShopModal.tsx` & `StudyBuffModal.tsx`**:
   - Add visual sprite previews for shop items and weapons (using `AssetManager` sprites).
   - Implement responsive scrollable card containers with sticky footer CTAs to prevent viewport clipping.
   - Upgrade typography with high-contrast font weights, clean stat delta badges (`+8% AS`, `+2 Armor`), and frosted glassmorphic card backgrounds (`bg-slate-950/85 backdrop-blur-xl border-slate-800`).

---

## 5. Verification Method

### 5.1 Verification Commands
To verify the implementation once applied by the worker:

1. **Automated Test Suite**:
   ```bash
   export PATH="$HOME/.local/node/bin:$PATH" && npm test
   ```
   *Expected outcome*: All 18 test suites and 377+ tests pass with zero failures.

2. **TypeScript Static Analysis**:
   ```bash
   export PATH="$HOME/.local/node/bin:$PATH" && npx tsc --noEmit
   ```
   *Expected outcome*: 0 TypeScript errors.

3. **ESLint Static Code Quality**:
   ```bash
   export PATH="$HOME/.local/node/bin:$PATH" && npm run lint
   ```
   *Expected outcome*: `✔ No ESLint warnings or errors`.

4. **Production Build**:
   ```bash
   export PATH="$HOME/.local/node/bin:$PATH" && npm run build
   ```
   *Expected outcome*: Clean static production build with zero errors.

5. **Asset Image Property Verification**:
   ```bash
   sips -g hasAlpha -g pixelWidth -g pixelHeight public/assets/*.png
   ```
   *Expected outcome*: All entity/weapon/pickup PNG files verify with `hasAlpha: yes` and resolution >= 512x512.

### 5.2 Invalidation Conditions
This survey and plan would be invalidated if:
1. `ASSET_MANIFEST` canonical keys or aliases are altered in a way that breaks existing tests in `tests/stress/assets_and_canvas_stress.test.ts`.
2. Increasing player sprite visual dimensions modifies physics clamping outside the `DEFAULT_ARENA` bounds (`tests/e2e/game_loop_tiers.test.ts`).
3. Non-standard external asset dependencies or heavy web fonts are introduced that fail SSR rendering in Next.js 15.
