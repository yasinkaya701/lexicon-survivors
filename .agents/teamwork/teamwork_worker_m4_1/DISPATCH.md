# DISPATCH — Milestone 4 Implementation Worker

## Mission
Implement the Educational YKS/BUEPT Tactical Question-Buff System, 4 Superpowers, UI Modals, Mistake Notebook, and 5-Axis Mastery Radar Chart.

## Mandatory References (Read First!)
- `/Users/afurkanmac/Downloads/hackhaton/ORIGINAL_REQUEST.md`
- `/Users/afurkanmac/Downloads/hackhaton/PROJECT.md`
- `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m4_1/handoff.md` (Full 30-question bank, DDA algorithms, telemetry formulas)
- `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m4_2/handoff.md` (Buff matrix, grace consolation, 4 superpowers, zero-delta freeze)
- `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m4_3/handoff.md` (StudyBuffModal, TacticalFreezeModal, MistakeNotebookModal, MasteryRadarChart, TelemetryTracker blueprints)

## Files to Implement & Update
1. `src/types/game.ts`: Add `'TYT Sosyal' | 'AYT Fen'` to `QuestionCategory` (keep existing categories for compatibility).
2. `src/data/questions.ts`: Implement all 30 curated questions (preserving existing 12 questions `yks-1` to `yks-6` and `buept-1` to `buept-6`, adding 18 new questions).
3. `src/game/education/`:
   - `BuffMatrix.ts`: Subject-to-Stat Buff Matrix with DDA difficulty and streak scaling; Dodge clamped to 60%.
   - `GraceConsolation.ts`: Zero HP penalty, zero material loss, +1 Luck, +5 Materials, mnemonic revelation.
   - `TacticalSuperpowers.ts`: 4 superpowers (Revitalizing Surge, Orbital Nuke 500 dmg, Flow State Frenzy 10s, Cosmic Vacuum).
   - `FreezeManager.ts`: Frame-accurate simulation freeze (`dt = 0`), audio triggers, timestamp resync on resume.
   - `TelemetryTracker.ts`: 5-axis telemetry metrics, streak tracking, and mistake logging.
   - `index.ts`: Public barrel exports.
4. `src/components/`:
   - `StudyBuffModal.tsx`: Inter-wave study modal (3 subject cards, 4 clickable/keyboard options, timer, 3-choice curriculum reward, consolation).
   - `TacticalFreezeModal.tsx`: Full-screen in-combat tactical freeze overlay (`dt = 0`), 4 superpower cards.
   - `MistakeNotebookModal.tsx`: 5-subject filterable mistake review with answer comparison, "Boğaziçili Koç Taktiği" explanations, re-solve practice.
   - `MasteryRadarChart.tsx`: 5-axis SVG polygonal spider chart (Türkçe, Matematik, Fen, Sosyal, BUEPT) with polar-to-cartesian geometry and hover tooltips.
5. Integration:
   - `src/components/GameCanvas.tsx`: Connect mystery chest drop collection to `FreezeManager.triggerFreeze` / `TacticalFreezeModal`, and execute chosen superpower.
   - `src/app/page.tsx`: Connect inter-wave `StudyBuffModal`, add "📓 Yanlış Defteri" and "📊 Yetenek Radarı" buttons/modals.
6. Test Suite:
   - Add `tests/unit/education_buff_engine.test.ts` testing buff calculation, Dodge 60% cap, grace evaluation, and superpower execution.

## Verification Command
`export PATH="$HOME/.local/node/bin:$PATH" && npx tsc --noEmit && npm run lint && npm test && npm run build`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
