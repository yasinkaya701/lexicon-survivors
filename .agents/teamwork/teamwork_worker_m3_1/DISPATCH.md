# Dispatch: teamwork_worker_m3_1

**Role**: Milestone 3 Implementation Worker (Visual Assets, Web Audio Engine, VFX & Canvas Polish).
**Target Files & Ownership**:
- `public/assets/*.png` (26 visual game assets)
- `src/lib/sound.ts` (12 procedural Web Audio synthesizers + compressor peak limiting)
- `src/game/engine/AssetManager.ts` (Image preloader, pre-baked chroma-keying, hit-flash masks, fallback renderer)
- `src/game/vfx/FloatingTextManager.ts` (Pooled floating combat text for damage, crits, DODGE, heal)
- `src/game/vfx/VFXManager.ts` (Pooled particle engine, 7 particle archetypes, trauma screen shake, hit-stop, damage vignettes)
- `src/game/vfx/index.ts` (Barrel export)
- `src/components/GameCanvas.tsx` (Integration of sprites, audio triggers, VFX, floating text, and screen shake)

**Inputs & Explorer Handoff Reports**:
- Visual Asset Pipeline & Architecture: `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m3_1/handoff.md` and `proposed_AssetManager.ts`
- Procedural Audio Engine: `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m3_2/handoff.md` and `proposed_sound.ts`
- Canvas VFX & Polish: `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m3_3/handoff.md`, `proposed_FloatingTextManager.ts`, `proposed_VFXManager.ts`, and `proposed_GameCanvas_integration.md`
- Visual Prompts Catalog: `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_2/handoff.md` Lines 336-430
- User Request: `/Users/afurkanmac/Downloads/hackhaton/ORIGINAL_REQUEST.md`
- Project Plan: `/Users/afurkanmac/Downloads/hackhaton/PROJECT.md`

**Detailed Tasks**:
1. **Visual Assets in `public/assets/`**:
   Ensure all 26 visual assets exist in `public/assets/*.png`. You may use `generate_image` or create high-resolution crisp standalone image assets matching the 26 required names:
   - 4 Player Avatars: `player_potato_scholar.png`, `player_buept_student.png`, `player_engineer.png`, `player_tank_mutant.png`
   - 5 Enemies: `enemy_swarmer.png`, `enemy_rusher.png`, `enemy_tank.png`, `enemy_ranged_shooter.png`, `enemy_elite_boss.png`
   - 7 Weapons: `weapon_pistol.png`, `weapon_shotgun.png`, `weapon_smg.png`, `weapon_wand.png`, `weapon_knife.png`, `weapon_sword.png`, `weapon_wrench.png`
   - 5 Projectiles & VFX: `proj_bullet.png`, `proj_magic_orb.png`, `proj_enemy_spit.png`, `vfx_slash_arc.png`, `vfx_nova_ring.png`
   - 3 Pickups: `pickup_material_crystal.png`, `pickup_health_fruit.png`, `pickup_mystery_chest.png`
   - 2 Terrain: `arena_tile_floor.png`, `arena_border_wall.png`
2. **`src/lib/sound.ts`**:
   Deploy the 12 procedural synthesizers from `teamwork_explorer_m3_2/proposed_sound.ts` with `DynamicsCompressorNode` peak limiting, user gesture unlock on first pointerdown/keydown, volume control, mute toggle, and full backward compatibility.
3. **`src/game/engine/AssetManager.ts`**:
   Deploy `AssetManager.ts` from `teamwork_explorer_m3_1/proposed_AssetManager.ts` with pre-baked soft chroma-keying, pre-baked hit-flash white masks, bidirectional alias mapping, and procedural vector fallback.
4. **`src/game/vfx/`**:
   Deploy `FloatingTextManager.ts` and `VFXManager.ts` from `teamwork_explorer_m3_3/` with pre-allocated object pools, 7 particle types, trauma screen shake, hit-stop, and damage vignette.
5. **`src/components/GameCanvas.tsx`**:
   Wire `AssetManager`, `FloatingTextManager`, `VFXManager`, and `soundEngine` into the 60 FPS Canvas runner per `proposed_GameCanvas_integration.md`.
   - Render sprites for player, weapons, enemies, projectiles, pickups, floor/walls.
   - Render white silhouette on hit flash.
   - Apply trauma screen shake offset.
   - Render floating text with stroke outlines.
   - Emit particle bursts on hits, deaths, and pickups.
   - Trigger procedural audio on shooting, hits, hurts, deaths, dodges, and wave completion.
6. **Verification Requirements**:
   `export PATH="$HOME/.local/node/bin:$PATH"`
   - `npx tsc --noEmit` must pass with 0 errors.
   - `npm run lint` must pass cleanly.
   - `npm test` must pass all test suites.
   - `npm run build` must succeed with clean static prerendering.
7. **Deliverable**:
   Write `handoff.md` and notify orchestrator when done.
