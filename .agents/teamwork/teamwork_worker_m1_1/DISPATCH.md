# Dispatch: teamwork_worker_m1_1
Role: Foundation Implementation Worker
Mission: Implement Milestone 1: Archive legacy prototype to `src/legacy/`, establish `/legacy` juror route, implement new `src/app/page.tsx` Brotato main entry shell, configure `.eslintrc.json`, configure `vitest.config.mts` and `package.json`, and verify `npm run build` and `npm test` execute with 0 errors.
Original Request: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md
Project Index: /Users/afurkanmac/Downloads/hackhaton/PROJECT.md
Working Directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m1_1/
Explorer Handoffs:
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m1_1/handoff.md
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m1_2/handoff.md
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m1_1/handoff.md


## 2026-11-03T18:24:29Z
You are teamwork_worker_m1_1.
Your working directory is: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m1_1/
You MUST read /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.
Also read /Users/afurkanmac/Downloads/hackhaton/PROJECT.md and /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m1_1/DISPATCH.md.

Read the 3 Explorer handoff reports for exact code and instructions:
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m1_1/handoff.md
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m1_2/handoff.md
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m1_1/handoff.md

Node environment: export PATH="$HOME/.local/node/bin:$PATH"

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

WRITE OWNERSHIP:
You exclusively own and may create/modify:
- `src/legacy/` and `src/legacy/components/`
- `src/app/legacy/page.tsx`
- `src/app/page.tsx`
- `.eslintrc.json`
- `vitest.config.mts`
- `package.json`
- `src/types/brotato.ts` (verify presence; already created by spec miner)
DO NOT write to or modify `tests/` or `TEST_INFRA.md` (concurrently managed by test writer).
DO NOT touch `src/data/questions.ts` or `src/lib/sound.ts`.

MISSION (Milestone 1 Implementation):
1. Execute legacy quarantine:
   - Create `src/legacy/components/` and `src/app/legacy/`.
   - Move the 8 legacy components (`BattleArena.tsx`, `RoomSimulator.tsx`, `SurvivorsArena.tsx`, `KilyosDetective.tsx`, `SpikeDefuseSim.tsx`, `JuryGodModeBar.tsx`, `TelemetryModal.tsx`, `VictoryScene.tsx`) to `src/legacy/components/`.
   - Move old `src/app/page.tsx` to `src/legacy/LegacyApp.tsx` and update its component imports to `@/legacy/components/*`.
   - Create `src/app/legacy/page.tsx` with header notice and 1-click return button, rendering `LegacyApp`.
2. Implement new Brotato primary shell:
   - Create new `src/app/page.tsx` featuring character selection (4 potato scholars), 17 live RPG stats dashboard, weapon preview, act switching (`yks` vs `buept`), soundEngine audio triggers, and link to `/legacy`.
3. Tooling & Test setup:
   - Create `.eslintrc.json` extending `"next/core-web-vitals"`.
   - Install required devDependencies (`eslint@^9`, `eslint-config-next@15.1.6`, `vitest`) with `npm install --save-dev`.
   - Create `vitest.config.mts` with `@/*` path alias resolution.
   - Update `package.json` scripts to include `"test": "vitest run"`.
4. Run verification:
   - Execute `npm run lint` — verify it runs non-interactively with 0 errors.
   - Execute `npm run build` — verify static pages `/` and `/legacy` generate cleanly with 0 TypeScript/build errors.
   - Execute `npm test` — verify test runner executes cleanly.

OUTPUT:
Write your complete handoff report to:
`/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m1_1/handoff.md`
and update `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m1_1/progress.md`.
Document the exact verification commands and full outputs.
Send a completion message to parent when done.
