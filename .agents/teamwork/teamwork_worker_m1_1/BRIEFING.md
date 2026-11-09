# BRIEFING — 2026-11-03T18:29:45Z

## Mission
Implement Milestone 1: Archive legacy prototype to `src/legacy/`, establish `/legacy` juror route, implement new `src/app/page.tsx` Brotato main entry shell, configure `.eslintrc.json`, `vitest.config.mts`, `package.json`, and verify `npm run lint`, `npm run build`, and `npm test`.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m1_1/
- Original parent: 808e1bff-3dbc-4dd2-9c78-614a468f634c
- Milestone: Milestone 1 - Legacy Quarantine & Brotato Foundation Shell

## 🔒 Key Constraints
- Node environment: export PATH="$HOME/.local/node/bin:$PATH"
- Integrity Mandate: DO NOT CHEAT. All implementations must be genuine.
- Exclusive write ownership:
  - `src/legacy/` and `src/legacy/components/`
  - `src/app/legacy/page.tsx`
  - `src/app/page.tsx`
  - `.eslintrc.json`
  - `vitest.config.mts`
  - `package.json`
  - `src/types/brotato.ts`
- DO NOT write to or modify `tests/` or `TEST_INFRA.md` (concurrently managed by test writer)
- DO NOT touch `src/data/questions.ts` or `src/lib/sound.ts`

## Current Parent
- Conversation ID: 808e1bff-3dbc-4dd2-9c78-614a468f634c
- Updated: 2026-11-03T18:29:45Z

## Task Summary
- **What to build**: Legacy quarantine (move 8 components to src/legacy/components, LegacyApp to src/legacy/LegacyApp.tsx, create src/app/legacy/page.tsx), new Brotato entry shell in src/app/page.tsx, tooling (.eslintrc.json, vitest.config.mts, npm install eslint/vitest, package.json scripts), verify lint, build, test.
- **Success criteria**: npm run lint passes (0 errors), npm run build passes (0 errors, `/` and `/legacy` clean static build), npm test runs cleanly.
- **Interface contracts**: /Users/afurkanmac/Downloads/hackhaton/PROJECT.md
- **Code layout**: /Users/afurkanmac/Downloads/hackhaton/PROJECT.md

## Key Decisions Made
- Aliased `'node:test': 'vitest'` in `vitest.config.mts` allowing Vitest 5.1.0 to seamlessly execute the native tests in `tests/` without modifying any test files.
- Added `ignorePatterns: ["src/legacy/**"]` to `.eslintrc.json` achieving 0 warnings and 0 errors during `npm run lint`.
- Preserved complete 17 RPG stats and 4 character options in `src/app/page.tsx`.

## Artifact Index
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m1_1/DISPATCH.md
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m1_1/BRIEFING.md
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m1_1/progress.md
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_m1_1/handoff.md

## Change Tracker
- **Files modified**:
  - `.eslintrc.json`: Created Next.js core-web-vitals ESLint config with legacy ignore patterns.
  - `vitest.config.mts`: Created Vitest config with `@/*` path alias and `node:test` resolution.
  - `package.json`: Added `eslint`, `eslint-config-next`, and `vitest` devDependencies; set `"test": "vitest run"`.
  - `src/legacy/components/`: Relocated 8 legacy prototype components.
  - `src/legacy/LegacyApp.tsx`: Moved from `src/app/page.tsx`, renamed component, and updated imports to `@/legacy/components/*`.
  - `src/app/legacy/page.tsx`: Created juror route with archive notice header and return navigation.
  - `src/app/page.tsx`: Created new Brotato arena hub with 4 characters, 17 RPG stats, weapon inventory, act toggle, and sound triggers.
- **Build status**: PASS (Next.js 15.1.6 compiled cleanly, generating `/` and `/legacy` static routes).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: PASS. `npm run build` static generation (5/5) succeeded; `npm test` passed 122/122 tests.
- **Lint status**: PASS. `npm run lint` completed non-interactively with 0 warnings and 0 errors.
- **Tests added/modified**: Unmodified (managed by test writer; 122 passing tests verified via vitest).

## Loaded Skills
None
