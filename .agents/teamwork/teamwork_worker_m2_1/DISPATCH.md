## 2026-11-03T18:50:03Z
You are teamwork_worker_m2_1.
Your working directory is: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m2_1/
You MUST read /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.
Also read /Users/afurkanmac/Downloads/hackhaton/PROJECT.md and /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m2_1/DISPATCH.md.

Read the 3 Milestone 2 Explorer handoff reports for the exact drop-in TypeScript code:
1. /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m2_1/handoff.md (`src/game/engine/`)
2. /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_1/handoff.md (`src/game/weapons/`, `src/game/stats/`)
3. /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_2/handoff.md (`src/game/entities/`, `src/game/waves/`, `src/game/shop/`)

Node environment: export PATH="$HOME/.local/node/bin:$PATH"

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

WRITE OWNERSHIP:
You exclusively own and may create/modify:
- `src/game/` (all subdirectories: `engine/`, `weapons/`, `stats/`, `entities/`, `waves/`, `shop/`)
- `src/components/GameCanvas.tsx`
- `src/components/HUD.tsx`
- `src/components/ShopModal.tsx`
- `src/app/page.tsx` (to mount the live Canvas and Shop upon clicking "ARENAYA BAŞLA")
DO NOT write to `src/legacy/` or `src/app/legacy/`.
DO NOT modify `tests/` or `TEST_INFRA.md`.

MISSION (Milestone 2 Implementation):
1. Build `src/game/engine/`:
   - `Vector2D.ts`, `Kinematics.ts`, `Collision.ts`, `Dodge.ts`, `GameLoop.ts`, `index.ts`.
2. Build `src/game/weapons/` & `src/game/stats/`:
   - `CombatMath.ts`, `WeaponCatalog.ts`, `WeaponManager.ts`, `Targeting.ts`, `HitResolution.ts`.
3. Build `src/game/entities/`, `src/game/waves/`, `src/game/shop/`:
   - `EnemyEntities.ts`, `WaveDirector.ts`, `DropManager.ts`, `ShopEngine.ts`.
4. Create `src/components/GameCanvas.tsx` & React Roguelite UI:
   - Mount 60 FPS HTML5 Canvas running the headless engine.
   - Render player potato, 4-6 weapons firing simultaneously, 5 distinct enemy types with hitboxes, projectiles, and magnetic drops.
   - Wire WASD 360-degree controls, dodge mechanics, and boundary collisions.
   - Integrate inter-wave shop modal (`ShopModal.tsx`) when wave completes (4 slots, reroll, locks, item combining).
   - Wire into `src/app/page.tsx` so clicking "ARENAYA BAŞLA" starts the game run.
5. Run full verification:
   - `npm run lint` (0 errors, 0 warnings).
   - `npx tsc --noEmit` (0 type errors).
   - `npm test` (all tests pass 100%).
   - `npm run build` (production build succeeds cleanly).

OUTPUT:
Write your complete handoff report to:
`/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m2_1/handoff.md`
and update `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m2_1/progress.md`.
Document the exact verification commands and full outputs.
Send a completion message to parent when done.
