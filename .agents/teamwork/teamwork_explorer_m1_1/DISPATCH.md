# Dispatch: teamwork_explorer_m1_1
Role: Foundation Refactoring Explorer
Mission: Analyze the exact file moves, imports, and component rewiring needed to move all 8 legacy components and page.tsx to src/legacy/ and establish src/app/legacy/page.tsx without breaking any existing imports.
Original Request: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md
Project Index: /Users/afurkanmac/Downloads/hackhaton/PROJECT.md
Working Directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m1_1/
## 2026-11-03T18:12:55Z
You are teamwork_explorer_m1_1.
Your working directory is: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m1_1/
You MUST read /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.
Also read /Users/afurkanmac/Downloads/hackhaton/PROJECT.md and /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m1_1/DISPATCH.md.

Node environment: export PATH="$HOME/.local/node/bin:$PATH"

MISSION (Milestone 1 - Legacy Archival Refactoring Plan):
Investigate and design the exact refactoring plan for moving legacy code to `src/legacy/`:
1. Detail exact file moves:
   - `src/app/page.tsx` -> `src/legacy/LegacyApp.tsx`
   - `src/components/BattleArena.tsx` -> `src/legacy/components/BattleArena.tsx`
   - `src/components/RoomSimulator.tsx` -> `src/legacy/components/RoomSimulator.tsx`
   - `src/components/SurvivorsArena.tsx` -> `src/legacy/components/SurvivorsArena.tsx`
   - `src/components/KilyosDetective.tsx` -> `src/legacy/components/KilyosDetective.tsx`
   - `src/components/SpikeDefuseSim.tsx` -> `src/legacy/components/SpikeDefuseSim.tsx`
   - `src/components/JuryGodModeBar.tsx` -> `src/legacy/components/JuryGodModeBar.tsx`
   - `src/components/TelemetryModal.tsx` -> `src/legacy/components/TelemetryModal.tsx`
   - `src/components/VictoryScene.tsx` -> `src/legacy/components/VictoryScene.tsx`
2. Detail the new route `src/app/legacy/page.tsx` so the legacy prototype remains 100% accessible to jurors.
3. Check all internal imports in legacy components: verify how `@/types/game`, `@/data/questions`, and `@/lib/sound` are imported and verify that moving to `src/legacy/components/` will not break any import resolutions.
4. Detail the placeholder for the new `src/app/page.tsx` (the new Brotato main page) and what UI shells/navigation it should contain.

OUTPUT:
Write your investigation report and concrete implementation instructions for the worker to:
`/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m1_1/handoff.md`
and update `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m1_1/progress.md`.
Send a completion message to parent when done.
## 2026-11-03T18:17:47Z
**Context**: Server restart recovery
**Content**: The server has restarted. Please resume your exploration immediately from your current progress in progress.md. Complete your analysis of file moves to src/legacy/, legacy route at src/app/legacy/page.tsx, and new src/app/page.tsx shell. Write your handoff.md and send a completion message when done.
**Action**: Resume execution and deliver handoff.md.
