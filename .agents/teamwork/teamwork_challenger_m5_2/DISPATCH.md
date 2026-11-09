# Task Assignment — teamwork_challenger_m5_2 (Final Milestone Phase 2: Educational, Audio, VFX & UI Tier 5 Adversarial Coverage Hardening)

## Objective
As an adversarial white-box challenger, perform coverage audit and stress testing on the Educational System, Telemetry, FreezeManager, Web Audio synthesizers, Canvas VFX managers, AssetManager, and UI Modal lifecycle integrations.
Search for untested branches, edge cases, memory leaks, unmount cleanup anomalies, and race conditions.

## Target Areas to Inspect
1. `src/game/education/`:
   - `BuffMatrix.ts`: DDA wave multipliers, streak bonuses, Turkish diacritics, NaN streak inputs.
   - `GraceConsolation.ts`: Zero HP loss, zero material loss on wrong answers, Rescue Mode (`streak <= -2`), evidence hunt format.
   - `TacticalSuperpowers.ts`: Revitalizing Surge, Orbital Nuke, Flow State Frenzy, Cosmic Vacuum.
   - `FreezeManager.ts`: zero delta time, rapid pause/unpause, timestamp resynchronization.
   - `TelemetryTracker.ts`: 10,000 attempts stress, running average reaction time, mistake notebook deduplication, category accuracies [0, 100].
2. `src/lib/sound.ts` & `src/game/vfx/`:
   - 12 procedural Web Audio synths (polyphony limits, suspended audio context graceful degrade, DynamicsCompressorNode limit).
   - `FloatingTextManager.ts`: 64-slot pool overflow, zero-allocation ring buffer, O(1) compaction.
   - `VFXManager.ts`: 512-slot pool overflow, particle life cycles, screen shake trauma decay.
   - `AssetManager.ts`: image loading failure fallbacks, offscreen canvas chroma-keying cache, white hit-flash mask generation.
3. UI Integration & Unmount Lifecycles:
   - `StudyBuffModal.tsx`, `TacticalFreezeModal.tsx`, `MistakeNotebookModal.tsx`, `MasteryRadarChart.tsx`, `TelemetryModal.tsx`.
   - Event listener cleanup on unmount (`window.removeEventListener`), interval timer clearance (`clearInterval`).
   - SVG polygon polar coordinates in `MasteryRadarChart.tsx` under extreme/empty accuracy stats.

## Deliverables
1. Author or expand white-box adversarial test cases in `tests/adversarial/` (e.g. `tests/adversarial/education_vfx_tier5_stress.test.ts`).
2. Run the full verification command:
   `export PATH="$HOME/.local/node/bin:$PATH" && npx tsc --noEmit && npm run lint && npm test && npm run build`
   Ensure all tests pass with zero errors.
3. Write your handoff report to `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_challenger_m5_2/handoff.md` with:
   - Coverage gaps identified and addressed
   - Test suites authored
   - Verification command results
   - Explicit verdict: `APPROVE` (if no remaining gaps or flaws) or `GAPS_FOUND` (if worker fix needed)
