# Dispatch: teamwork_worker_m3_2 (Milestone 3 Replacement Worker)

**Role**: Milestone 3 Final Integration Worker (Canvas Integration & Verification).
**Context**:
`teamwork_worker_m3_1` completed:
1. All 26 visual assets in `public/assets/*.png` exist and are ready. (DO NOT call `generate_image`).
2. `src/lib/sound.ts` is implemented with all 12 procedural sound synthesizers and DynamicsCompressor peak limiting.
3. `src/game/engine/AssetManager.ts` is implemented with pre-baked chroma-keying, hit-flash masks, and fallback renderer.
4. `src/game/vfx/FloatingTextManager.ts`, `VFXManager.ts`, and `index.ts` are implemented with object pooling, particle archetypes, and trauma screen shake.

**Remaining Task**:
1. Integrate `AssetManager`, `FloatingTextManager`, `VFXManager`, and `soundEngine` into `src/components/GameCanvas.tsx`.
   - Follow the exact drop-in integration plan in `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m3_3/proposed_GameCanvas_integration.md`.
   - Use `assetManager.drawSprite(ctx, ...)` for player, enemies, weapons, projectiles, and pickups.
   - Use `assetManager.drawFloorPattern(...)` or tile pattern for arena floor.
   - Apply trauma screen shake offset `ctx.translate(shakeX, shakeY)` during rendering.
   - Replace unpooled text and particles with `vfxManager` and `floatingTextManager`.
   - Fire procedural sound triggers (`playPistolShot`, `playShotgunShot`, `playEnemyDeath`, `playDodge`, `playGemPickup`, etc.).
2. Run verifications:
   `export PATH="$HOME/.local/node/bin:$PATH"`
   - `npx tsc --noEmit` must pass with 0 errors.
   - `npm run lint` must pass cleanly.
   - `npm test` must pass all test suites.
   - `npm run build` must succeed with clean static prerendering.
3. Write `handoff.md` and report completion.

## 2026-11-04T07:47:11Z
Message from parent orchestrator:
Tasks:
1. Integrate AssetManager, FloatingTextManager, VFXManager, and soundEngine into src/components/GameCanvas.tsx following proposed_GameCanvas_integration.md.
2. Verify with:
   export PATH="$HOME/.local/node/bin:$PATH" && npx tsc --noEmit && npm run lint && npm test && npm run build
3. Write handoff.md in your working directory and notify the orchestrator with send_message when done.
