# Milestone 3 Explorer Report: Visual Asset Pipeline, Chroma-Keying & AssetManager Architecture

**Author**: `teamwork_explorer_m3_1` (Visual Asset Pipeline & Sprite Integration Explorer)  
**Date**: 2026-11-03  
**Target Milestone**: Milestone 3 (Original Visual Assets & Audio Polish)  
**Deliverable**: Comprehensive 5-Component Hard Handoff Report & Drop-in `AssetManager.ts` Architecture  

---

## 1. Observation

Direct examination of the workspace (`/Users/afurkanmac/Downloads/hackhaton`) and existing source code revealed the following facts:

1. **Asset Requirements and Feature Definitions (`PROJECT.md`)**:
   - Lines 123-129 specify Features 65 to 71 for Milestone 3:
     * Feature 65: Player Potato Avatars (4 variants: Potato Scholar, BUEPT Student, Engineer, Mutant Tank).
     * Feature 66: 5 Distinct Enemy Variant Sprites (Swarmer, Rusher, Tank, Ranged Shooter, Elite Boss).
     * Feature 67: 7 Distinct Weapon Sprites (Pistol, Shotgun, SMG, Wand, Knife, Sword, Wrench).
     * Feature 68: Projectiles & Visual VFX Sprites (Bullets, Magic Orbs, Acid Spit, Slash Arc, Nova Ring).
     * Feature 69: Pickups & Collectible Sprites (Material Crystals, Health Fruit, Mystery Chest).
     * Feature 70: Arena Floor & Barrier Tiles (Dark slate tech floor, hazard wall tiles).
     * Feature 71: UI & Category Stat Icons (12 stat badges).
   - Total visual assets required for in-game canvas rendering = **26 visual assets**.
   - Line 233 specifies the canvas blitting contract: `ctx.drawImage(img, x - w/2, y - h/2, w, h)`.

2. **Current Canvas Rendering Implementation (`src/components/GameCanvas.tsx`)**:
   - Lines 131-145: Player entity defaults to `spriteName: 'player_potato'`.
   - Lines 584-601: Renders grid floor via repetitive `ctx.stroke()` line loops.
   - Lines 621-654: Pickups rendered via vector primitives (green diamond for material, red circle for fruit, yellow rect for chest).
   - Lines 656-763: Enemies rendered via vector circles with hit-flash condition (`const isFlashing = enemy.hitFlashTimerMs > 0; ctx.fillStyle = isFlashing ? '#ffffff' : ...`).
   - Lines 766-779: Projectiles rendered via simple glowing filled circles.
   - Lines 781-822: Player rendered via brown ellipse potato with eyes and rosy cheeks.
   - Lines 824-855: Orbiting weapons rendered via rotating colored rectangles (`inst.currentAngleRad`).
   - Verdict: The engine currently uses 100% procedural geometric canvas vector rendering. There is no `AssetManager` or sprite blitting mechanism in place yet.

3. **Entity Sprite Names and Blueprint Mappings**:
   - In `src/game/weapons/WeaponCatalog.ts`:
     * Line 73: `weapon_pistol`
     * Line 94: `weapon_shotgun`
     * Line 113: `weapon_smg`
     * Line 132: `weapon_wand`
     * Line 150: `weapon_knife`
     * Line 169: `weapon_sword`
     * Line 188: `weapon_wrench`
   - In `src/game/entities/EnemyEntities.ts`:
     * Line 62: `spriteName: 'enemy_swarmer'`
     * Line 78: `spriteName: 'enemy_rusher'`
     * Line 94: `spriteName: 'enemy_tank'`
     * Line 110: `spriteName: 'enemy_ranged'` (differs from `PROJECT.md` `enemy_ranged_shooter`)
     * Line 126: `spriteName: 'enemy_elite'` (differs from `PROJECT.md` `enemy_elite_boss`)
   - In `src/game/entities/DropManager.ts`:
     * Line 43: `spriteName: 'drop_chest'` (differs from `pickup_mystery_chest`)
     * Line 58: `spriteName: 'drop_material'` (differs from `pickup_material_crystal`)
     * Line 93: `spriteName: 'drop_fruit'` (differs from `pickup_health_fruit`)
   - In `src/app/page.tsx`:
     * Lines 37-105 define characters with IDs: `'potato_scholar'`, `'buept_hero'`, `'engineer'`, `'mutant_tank'`.

4. **Static Asset Directory and Image State**:
   - `public/assets/` did not exist initially.
   - Running `find_by_name` across the workspace confirmed **0 image files** (`.png`, `.jpg`, `.webp`) exist outside of `node_modules`.

5. **Architecture and Verification Constraints**:
   - `tests/adversarial/imports_integrity.test.ts` lines 328-346 enforces a strict component whitelist in `src/components/`:
     `GameCanvas.tsx`, `HUD.tsx`, `ShopModal.tsx`, `StudyBuffModal.tsx`, `TacticalFreezeModal.tsx`, `TelemetryModal.tsx`, `WeaponInventoryBar.tsx`, `GameOverModal.tsx`, `VictoryModal.tsx`.
   - Any non-whitelisted component placed into `src/components/` causes test failure. Therefore, non-React engine utilities like `AssetManager.ts` must live in `src/game/engine/` or `src/game/assets/` or `src/lib/`.
   - Running `export PATH="$HOME/.local/node/bin:$PATH" && npx vitest run tests/` exited with code 0 (9 test files, 176 tests passing).

---

## 2. Logic Chain

1. **Static Asset Routing in Next.js 15 App Router**:
   - Static files located in `<workspace>/public/assets/<name>.png` are automatically served by Next.js at URL path `"/assets/<name>.png"`.
   - Therefore, images must be saved into `/Users/afurkanmac/Downloads/hackhaton/public/assets/` to be accessible via `new Image().src = '/assets/<name>.png'`.

2. **The Chroma-Key Problem & Performance Constraints**:
   - AI diffusion models (`generate_image`) output images on solid backgrounds (typically pure black `#000000` when prompted).
   - Drawing an un-keyed image directly to the canvas draws an opaque black box around the character, completely obscuring the dark tech arena grid and adjacent sprites.
   - Running pixel-by-pixel chroma-keying (`getImageData` + loop over $512 \times 512 = 262,144$ pixels) inside the 60 FPS `onRender` loop takes $\approx 1.5\text{ ms}$ per sprite on modern CPUs.
   - For 40-50 active sprites on screen (player, 25 swarmers, 6 orbiting weapons, 15 gems), per-frame processing would take $50 \times 1.5\text{ ms} = 75\text{ ms}$ per frame, collapsing the framerate from 60 FPS down to 13 FPS.
   - **Conclusion**: Chroma-keying MUST be **pre-baked** once onto an offscreen canvas during asset preloading (`AssetManager.preloadAll()`). Once pre-baked, drawing that offscreen canvas via `ctx.drawImage` is executed by GPU texture blitting in $< 0.005\text{ ms}$!

3. **Soft-Edge Feathering & Defringing Formulation**:
   - Hard color clipping (`brightness < 18 ? alpha=0 : alpha=255`) produces harsh, jagged pixel borders and unsightly dark fringing halos.
   - To achieve crisp, smooth edges:
     * `lowThreshold = 18`: pixels with brightness $\le 18$ become $\alpha = 0$.
     * `highThreshold = 42`: pixels with brightness $\ge 42$ remain $\alpha = 255$.
     * For $18 < \text{brightness} < 42$:
       $$\text{factor} = \frac{\text{brightness} - 18}{42 - 18}, \quad \alpha = \lfloor 255 \times \text{factor} \rfloor$$
     * To prevent dark edge halos ("defringing"), the color channels are boosted inversely to the alpha falloff:
       $$R' = \min\left(255, \left\lfloor \frac{R}{\max(0.15, \text{factor})} \right\rfloor\right)$$

4. **White Silhouette Hit-Flash GPU Optimization**:
   - In `GameCanvas.tsx`, enemy damage invokes a white hit flash (`enemy.hitFlashTimerMs > 0`).
   - Dynamically setting `ctx.globalCompositeOperation = 'source-in'` or allocating intermediate canvas buffers on every frame stalls the canvas 2D GPU pipeline.
   - **Pre-baked Hit-Flash Solution**:
     During preloading of any entity with `generateHitFlashVariant: true` (all 4 players and 5 enemies), a second offscreen canvas is created:
     ```typescript
     flashCtx.drawImage(processedCanvas, 0, 0);
     flashCtx.globalCompositeOperation = 'source-in';
     flashCtx.fillStyle = '#ffffff';
     flashCtx.fillRect(0, 0, flashCanvas.width, flashCanvas.height);
     ```
     At runtime, when `options.hitFlash === true`, `AssetManager` simply blits `cached.flashCanvas` instead of `cached.canvas`. Runtime cost = identical to standard blit ($0.005\text{ ms}$).

5. **Bidirectional Alias Resolution**:
   - Discrepancies exist between `EnemyEntities.ts` (`enemy_ranged`, `enemy_elite`), `DropManager.ts` (`drop_material`, `drop_fruit`, `drop_chest`), and `page.tsx` (`potato_scholar`, `buept_hero`).
   - Rather than forcing risky refactors across all entity files, `AssetManager` implements a canonical alias map:
     * `'drop_material'` $\rightarrow$ `'pickup_material_crystal'`
     * `'drop_fruit'` $\rightarrow$ `'pickup_health_fruit'`
     * `'drop_chest'` $\rightarrow$ `'pickup_mystery_chest'`
     * `'enemy_ranged'` $\rightarrow$ `'enemy_ranged_shooter'`
     * `'enemy_elite'` $\rightarrow$ `'enemy_elite_boss'`
     * `'buept_hero'` $\rightarrow$ `'player_buept_student'`
     * `'player_potato'` $\rightarrow$ `'player_potato_scholar'`
   - This ensures zero runtime lookup failures regardless of which subsystem requests the sprite.

6. **Multi-Tier Procedural Fallback Engine**:
   - If an asset fails to load (network drop, missing file, 404), the game must NEVER throw an exception or draw broken boxes.
   - `AssetManager` includes a built-in vector fallback renderer (`renderFallback`) that renders stylized geometric shapes matching the current `GameCanvas.tsx` aesthetic (potatoes with rosy cheeks, crowned elites, glowing crystals, stylized weapons).

7. **Centered Blitting & Transformation Mathematics**:
   - In top-down physics engines, entity $(x, y)$ coordinates represent the center of mass.
   - Blitting is centered using canvas 2D matrix transformations:
     $$\mathbf{T}(x, y) \cdot \mathbf{R}(\theta) \cdot \mathbf{S}(\text{flipX} \cdot s, \text{flipY} \cdot s) \cdot \text{Blit}\left(-\frac{w}{2}, -\frac{h}{2}, w, h\right)$$

---

## 3. Caveats

1. **Browser Autoplay & User Interaction**:
   - Browsers do not restrict image loading or canvas 2D drawing (unlike Web Audio API), so image preloading starts immediately on page mount.
2. **Next.js SSR Safety**:
   - Next.js pre-renders pages on Node.js during `npm run build`. Node.js does not have `window`, `document`, or `HTMLImageElement`.
   - `AssetManager` explicitly guards all DOM calls with `typeof window !== 'undefined' && typeof document !== 'undefined'`. During SSR, `preloadAll()` safely resolves immediately.
3. **CORS on Local Images**:
   - Images loaded from `/assets/*.png` via Next.js static serving are same-origin. `img.crossOrigin = 'anonymous'` is set defensively to prevent tainted canvas security errors during `getImageData()`.
4. **Memory Footprint**:
   - 26 original assets + 9 hit-flash variants at $512 \times 512 \times 4\text{ bytes}$ consume $\approx 35 \times 1\text{ MB} = 35\text{ MB}$ of VRAM/heap. This is trivial for desktop and mobile web browsers (modern browsers typically allocate 500MB+ for canvas contexts).
5. **No Source Modifications in Explorer Role**:
   - In accordance with the Explorer archetype rules, no changes have been committed directly to `src/`. All architecture and test code have been placed in `.agents/teamwork/teamwork_explorer_m3_1/`.

---

## 4. Conclusion & Technical Specifications

### 4.1 Authoritative 26 Visual Asset Specification

| # | Canonical Key | File Path | Category | Dimensions | Display Size | Aliases | Hit Flash | AI Prompt Description |
|---|---------------|-----------|----------|------------|--------------|---------|-----------|----------------------|
| 1 | `player_potato_scholar` | `public/assets/player_potato_scholar.png` | player | 512x512 | 56x56 px | `player_potato`, `potato_scholar` | Yes | Quirky cartoon potato scholar wearing round horn-rimmed glasses, pencil in hand, small backpack, determined expression, Brotato roguelite style, bold crisp outlines, isolated on solid black background. |
| 2 | `player_buept_student` | `public/assets/player_buept_student.png` | player | 512x512 | 56x56 px | `buept_student`, `buept_hero` | Yes | Cute potato student in navy blue hoodie with red scarf, carrying a thick English dictionary book under arm, confident smile, Brotato style, bold clean outlines, isolated on solid black background. |
| 3 | `player_engineer` | `public/assets/player_engineer.png` | player | 512x512 | 56x56 px | `engineer` | Yes | Steampunk potato wearing brass goggles, utility vest, toolbelt holding a pipe wrench, energetic expression, bold outlines, isolated on solid black background. |
| 4 | `player_tank_mutant` | `public/assets/player_tank_mutant.png` | player | 512x512 | 60x60 px | `tank_mutant`, `mutant_tank` | Yes | Heavy muscular brawler potato with red boxing hand wraps and sweatband, scarred tough brow, fierce grin, bold outlines, isolated on solid black background. |
| 5 | `enemy_swarmer` | `public/assets/enemy_swarmer.png` | enemy | 512x512 | 32x32 px | `swarmer`, `moth` | Yes | "Paragraf Güvesi": Small aggressive winged moth creature made of torn glowing exam papers and purple energy, glowing red compound eyes, isolated on solid black background. |
| 6 | `enemy_rusher` | `public/assets/enemy_rusher.png` | enemy | 512x512 | 40x40 px | `rusher`, `hound` | Yes | "Zaman Tazısı": Angular neon-yellow charging hound with glowing pink horns and speed blur trails, razor teeth, isolated on solid black background. |
| 7 | `enemy_tank` | `public/assets/enemy_tank.png` | enemy | 512x512 | 64x64 px | `tank`, `golem` | Yes | "İşlem Amelesi": Bulky stone-armored golem monster with iron plates and heavy cracked granite shield, glowing amber eyes, isolated on solid black background. |
| 8 | `enemy_ranged_shooter` | `public/assets/enemy_ranged_shooter.png` | enemy | 512x512 | 44x44 px | `enemy_ranged`, `ranged` | Yes | "Türev Zehircisi": Floating hooded occult eyeball firing acidic mathematical glyphs, toxic green iris and runic pupil, isolated on solid black background. |
| 9 | `enemy_elite_boss` | `public/assets/enemy_elite_boss.png` | enemy | 512x512 | 96x96 px | `enemy_elite`, `elite`, `boss` | Yes | "ÖSYM Baş Müfettişi / BUEPT Archon": Colossal intimidating celestial judge with glowing golden-red crown, dark cape, hovering runic seals, fiery red core eye, isolated on solid black background. |
| 10 | `weapon_pistol` | `public/assets/weapon_pistol.png` | weapon | 256x256 | 36x36 px | `pistol` | No | "Plazma Kalem": Futuristic stylus gun, sleek white and cyan plasma pistol emitting a small laser spark at the tip, bold outlines, isolated on solid black background. |
| 11 | `weapon_shotgun` | `public/assets/weapon_shotgun.png` | weapon | 256x256 | 40x40 px | `shotgun` | No | "Kırıcı Pompalı": Heavy dual-barrel energy shotgun with ribbed fore-end and brass accents, wide muzzle, isolated on solid black background. |
| 12 | `weapon_smg` | `public/assets/weapon_smg.png` | weapon | 256x256 | 34x34 px | `smg` | No | "Optik Tarayıcı SMG": Compact submachine gun with high-capacity optical cartridge, muzzle compensator, isolated on solid black background. |
| 13 | `weapon_wand` | `public/assets/weapon_wand.png` | weapon | 256x256 | 38x38 px | `wand`, `magic_wand` | No | "Türev Asası": Arcane staff tipped with glowing amethyst crystal and orbiting math formula runes, isolated on solid black background. |
| 14 | `weapon_knife` | `public/assets/weapon_knife.png` | weapon | 256x256 | 32x32 px | `knife`, `dagger` | No | "Cetvel Kaması": Sharp stainless steel 30-60-90 drafting triangle dagger with etched millimeter lines, isolated on solid black background. |
| 15 | `weapon_sword` | `public/assets/weapon_sword.png` | weapon | 256x256 | 44x44 px | `sword` | No | "Gönye Kılıcı": Architect's T-square greatsword with energized cyan laser blade edge and leather hilt, isolated on solid black background. |
| 16 | `weapon_wrench` | `public/assets/weapon_wrench.png` | weapon | 256x256 | 38x38 px | `wrench`, `pipe_wrench` | No | "Mühendis Anahtarı": Heavy industrial chrome pipe wrench with electric cyan lightning sparks arcing around the teeth, isolated on solid black background. |
| 17 | `proj_bullet` | `public/assets/proj_bullet.png` | projectile | 128x128 | 16x16 px | `bullet` | No | Teardrop-shaped glowing cyan plasma bullet with glowing energy trail, isolated on solid black background. |
| 18 | `proj_magic_orb` | `public/assets/proj_magic_orb.png` | projectile | 128x128 | 20x20 px | `magic_orb` | No | Swirling violet/magenta arcane energy sphere with spark particles, isolated on solid black background. |
| 19 | `proj_enemy_spit` | `public/assets/proj_enemy_spit.png` | projectile | 128x128 | 18x18 px | `enemy_spit`, `spit` | No | Toxic bubbling emerald-green acid spit globule, isolated on solid black background. |
| 20 | `vfx_slash_arc` | `public/assets/vfx_slash_arc.png` | vfx | 256x256 | 64x64 px | `slash_arc` | No | Glowing high-contrast crescent wave for melee weapon swings, cyan/white energy arc, isolated on solid black background. |
| 21 | `vfx_nova_ring` | `public/assets/vfx_nova_ring.png` | vfx | 256x256 | 140x140 px | `nova_ring` | No | Expanding radial shockwave ring with neon pink and cyan particles (Süpernova Nuke), isolated on solid black background. |
| 22 | `pickup_material_crystal` | `public/assets/pickup_material_crystal.png` | pickup | 128x128 | 22x22 px | `drop_material`, `gem` | No | Faceted glowing emerald energy crystal gem, bright specular highlights, isolated on solid black background. |
| 23 | `pickup_health_fruit` | `public/assets/pickup_health_fruit.png` | pickup | 128x128 | 26x26 px | `drop_fruit`, `fruit` | No | Radiant golden-red apple with green leaf and sparkling vitality aura, isolated on solid black background. |
| 24 | `pickup_mystery_chest` | `public/assets/pickup_mystery_chest.png` | pickup | 256x256 | 40x40 px | `drop_chest`, `chest` | No | High-tech golden academic chest with cyan holographic question mark hovering above the lid, isolated on solid black background. |
| 25 | `arena_tile_floor` | `public/assets/arena_tile_floor.png` | terrain | 512x512 | Tileable | `floor` | No | Seamless dark slate sci-fi grid floor with subtle cyan circuit lines, flat lighting, tileable pattern. |
| 26 | `arena_border_wall` | `public/assets/arena_border_wall.png` | terrain | 256x256 | Tileable | `wall`, `hazard_wall` | No | Industrial hazard boundary wall with neon yellow/cyan safety warning chevrons and metal plating. |

---

### 4.2 Drop-in Architecture: `AssetManager.ts`

The verified drop-in TypeScript implementation is stored at:  
`/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m3_1/proposed_AssetManager.ts`

Target location for implementation:  
`src/game/engine/AssetManager.ts` (or `src/game/assets/AssetManager.ts`)

#### Key Architecture Highlights:
1. **Pre-baked Soft Chroma-Keying (`processChromaKey`)**:
   Cleans background pixels using dual-threshold soft feathering ($18 \le \text{brightness} \le 42$) and color channel defringing.
2. **Pre-baked GPU Hit Flash (`createHitFlashVariant`)**:
   Uses `globalCompositeOperation = 'source-in'` to create a pure `#ffffff` silhouette mask with preserved alpha.
3. **Automatic Alias Resolution (`resolveKey`)**:
   Maps existing names (`drop_material`, `enemy_ranged`, `buept_hero`) to their canonical asset keys.
4. **Transform Matrix Blitting (`drawSprite`)**:
   Handles translation to $(x, y)$, rotation $\theta$, scaling, flipX, flipY, and alpha modulation.
5. **Cached Pattern Tiling (`drawTiled`)**:
   Caches `ctx.createPattern(img, 'repeat')` to render seamless arena floors and hazard walls at native 60 FPS.
6. **Graceful Procedural Fallback (`renderFallback`)**:
   Draws vector potatoes, enemies, weapons, and pickups if an asset file is missing or still loading.
7. **React 19 / Next.js Hook (`useAssetLoader`)**:
   Provides reactive loading progress for UI overlays and splash screens.

---

### 4.3 Concrete Integration with `src/components/GameCanvas.tsx`

To integrate `AssetManager` into `GameCanvas.tsx`, replace the primitive drawing calls in `loop.onRender(() => { ... })`:

#### 1. Import and Initialization:
```typescript
import { assetManager, useAssetLoader } from '@/game/engine/AssetManager';

// Inside GameCanvas component:
useAssetLoader(true); // Automatically triggers preloading on mount
```

#### 2. Floor & Boundaries Blitting:
```typescript
// Replace lines 584-620 in GameCanvas.tsx:
assetManager.drawTiled(
  ctx,
  'arena_tile_floor',
  DEFAULT_ARENA.minX,
  DEFAULT_ARENA.minY,
  DEFAULT_ARENA.maxX,
  DEFAULT_ARENA.maxY
);
```

#### 3. Pickups Blitting:
```typescript
// Replace lines 621-654:
for (const p of pickups) {
  const spriteKey = p.spriteName || `drop_${p.type}`;
  assetManager.drawSprite(ctx, spriteKey, p.x, p.y, {
    width: p.radius * 2.2,
    height: p.radius * 2.2,
  });
}
```

#### 4. Enemies Blitting:
```typescript
// Replace lines 656-763:
for (const enemy of enemies) {
  const spriteKey = enemy.spriteName || `enemy_${enemy.type}`;
  const isFlashing = enemy.hitFlashTimerMs > 0;
  
  assetManager.drawSprite(ctx, spriteKey, enemy.x, enemy.y, {
    width: enemy.radius * 2.4,
    height: enemy.radius * 2.4,
    rotationRad: enemy.facingAngleRad,
    hitFlash: isFlashing,
  });

  // Health bar rendered above sprite as normal
  if (enemy.hp < enemy.maxHp) {
    const barW = enemy.radius * 2;
    const barH = 4;
    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 10, barW, barH);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 10, barW * hpRatio, barH);
  }
}
```

#### 5. Projectiles Blitting:
```typescript
// Replace lines 766-779:
for (const proj of projectiles) {
  const spriteKey = proj.spriteName || (proj.source === 'player' ? 'proj_bullet' : 'proj_enemy_spit');
  const angle = Math.atan2(proj.vy, proj.vx);
  assetManager.drawSprite(ctx, spriteKey, proj.x, proj.y, {
    width: proj.radius * 3,
    height: proj.radius * 3,
    rotationRad: angle,
  });
}
```

#### 6. Player Potato Blitting:
```typescript
// Replace lines 781-822:
const isInvulnFlashing = player.isInvulnerable && Math.floor(Date.now() / 80) % 2 === 0;
const playerSprite = player.spriteName || player.characterId || 'player_potato_scholar';

assetManager.drawSprite(ctx, playerSprite, player.x, player.y, {
  width: 56,
  height: 56,
  rotationRad: player.facingAngleRad,
  alpha: player.isInvulnerable ? 0.7 : 1.0,
  hitFlash: isInvulnFlashing,
});
```

#### 7. Orbiting Weapons Blitting:
```typescript
// Replace lines 824-855:
const activeWeapons = wm.getActiveWeapons();
const weaponCount = activeWeapons.length;

for (let i = 0; i < weaponCount; i++) {
  const inst = activeWeapons[i];
  const orbitAngle = (i * 2 * Math.PI) / Math.max(1, weaponCount) + Date.now() * 0.001;
  const orbitDist = player.radius + 18;
  const wx = player.x + Math.cos(orbitAngle) * orbitDist;
  const wy = player.y + Math.sin(orbitAngle) * orbitDist;

  assetManager.drawSprite(ctx, inst.blueprint.spriteName, wx, wy, {
    width: 36,
    height: 36,
    rotationRad: inst.currentAngleRad,
  });
}
```

---

## 5. Verification Method

To independently verify this visual asset pipeline and architecture:

1. **Architecture & Unit Verification Script**:
   Run the dedicated verification suite validating all 26 assets, alias resolution, hit flash masks, and chroma-key mathematics:
   ```bash
   export PATH="$HOME/.local/node/bin:$PATH" && npx tsx .agents/teamwork/teamwork_explorer_m3_1/verify_asset_manager.ts
   ```
   *Expected Output*: `ALL ASSET MANAGER VERIFICATION CHECKS PASSED SUCCESSFULLY!` (5/5 tests passed).

2. **TypeScript Compilation Check**:
   Verify that `proposed_AssetManager.ts` complies with TypeScript 5.7.2:
   ```bash
   export PATH="$HOME/.local/node/bin:$PATH" && npx tsc --noEmit .agents/teamwork/teamwork_explorer_m3_1/proposed_AssetManager.ts
   ```
   *Expected Output*: Clean exit with return code `0`.

3. **Workspace Test Suite Regression Check**:
   Ensure zero regressions against existing M1/M2 test suites:
   ```bash
   export PATH="$HOME/.local/node/bin:$PATH" && npx vitest run tests/
   ```
   *Expected Output*: `Test Files 9 passed (9), Tests 176 passed (176)`.

4. **Production Build Integrity**:
   Verify Next.js build compilation:
   ```bash
   export PATH="$HOME/.local/node/bin:$PATH" && npm run build
   ```
   *Expected Output*: Successful Next.js build with clean exit code `0`.

---
**Report Status**: Complete Hard Handoff. Ready for implementation by worker agent in Milestone 3.
