# Task Assignment — teamwork_challenger_m5_1 (Final Milestone Phase 2: Core Combat & Engine Tier 5 Adversarial Coverage Hardening)

## Objective
As an adversarial white-box challenger, perform coverage audit and stress testing on the Core Game Engine, Kinematics, Collision, CombatMath, WeaponCatalog, EnemyEntities, WaveDirector, and ShopEngine.
Search for untested branches, edge cases, numeric overflow/underflow, race conditions, and boundary exploits.

## Target Areas to Inspect
1. `src/game/engine/`:
   - `Vector2D.ts`: zero vectors, NaN vectors, normalization of zero vector.
   - `Kinematics.ts`: extreme damping factors, negative speed, huge dt jumps vs clamped dt.
   - `Collision.ts`: circle-circle tunneling, bounding box edge cases.
   - `Dodge.ts`: dodge roll determinism, cap adherence.
   - `GameLoop.ts`: multiple start/stop calls, tactical freeze transitions, FPS measurement anomalies.
2. `src/game/stats/CombatMath.ts`:
   - Life steal 100ms ICD under multi-target cleaves.
   - Armor scaling at extreme negative/positive armor values.
   - Attack cooldown minimum clamp (83.33ms = 12 hits/s) under astronomical attack speed (+1,000,000%).
   - Range scaling minimum floor (25px).
3. `src/game/weapons/WeaponCatalog.ts`:
   - 6 weapons ticking simultaneously with overlapping targets.
4. `src/game/waves/WaveDirector.ts` & `src/game/shop/ShopEngine.ts`:
   - Wave scaling progression to Wave 20+.
   - Shop price inflation, locking, rerolling cost compounding, full-inventory auto-combine fusions.

## Deliverables
1. Author or expand white-box adversarial test cases in `tests/adversarial/` (e.g. `tests/adversarial/engine_combat_tier5_stress.test.ts`).
2. Run the full verification command:
   `export PATH="$HOME/.local/node/bin:$PATH" && npx tsc --noEmit && npm run lint && npm test && npm run build`
   Ensure all tests pass with zero errors.
3. Write your handoff report to `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_challenger_m5_1/handoff.md` with:
   - Coverage gaps identified and addressed
   - Test suites authored
   - Verification command results
   - Explicit verdict: `APPROVE` (if no remaining gaps or flaws) or `GAPS_FOUND` (if worker fix needed)
