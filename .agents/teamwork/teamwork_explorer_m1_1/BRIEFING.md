# BRIEFING — 2026-11-03T18:21:00Z

## Mission
Investigate and design the exact refactoring plan for moving legacy code to src/legacy/ and establishing src/app/legacy/page.tsx, verifying import integrity and designing the new src/app/page.tsx shell.

## 🔒 My Identity
- Archetype: explorer
- Roles: Foundation Refactoring Explorer
- Working directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m1_1/
- Original parent: 808e1bff-3dbc-4dd2-9c78-614a468f634c
- Milestone: Milestone 1 - Legacy Archival Refactoring Plan

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly
- Write only to /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m1_1/
- Produce concrete, step-by-step handoff for the worker

## Current Parent
- Conversation ID: 808e1bff-3dbc-4dd2-9c78-614a468f634c
- Updated: 2026-11-03T18:21:00Z

## Investigation State
- **Explored paths**: `src/app/page.tsx`, `src/components/*` (all 8 files), `src/types/game.ts`, `src/data/questions.ts`, `src/lib/sound.ts`, `tsconfig.json`, `package.json`.
- **Key findings**:
  1. All 8 legacy components exclusively use `@/` alias imports (`@/types/game`, `@/data/questions`, `@/lib/sound`) and none import each other. Moving them to `src/legacy/components/` requires zero edits to those 8 files.
  2. `src/app/page.tsx` is the sole importer of `src/components/*`. When moved to `src/legacy/LegacyApp.tsx`, only its 8 component imports need `@/legacy/components/` and its default export renamed to `LegacyApp`.
  3. `src/app/legacy/page.tsx` wraps `LegacyApp` with a top navigation bar allowing jurors 100% full access to all 5 legacy modes with 1-click return to `/`.
  4. `src/app/page.tsx` designed as an interactive Brotato Roguelite shell with 4 character options, 17 live RPG stats, 6 weapon slots, audio toggles, and direct legacy link.
  5. Missing `.eslintrc.json` causes `next lint` to hang interactively; documented clean fix.
- **Unexplored areas**: Milestone 1 exploration fully completed.

## Key Decisions Made
- Formulated complete, step-by-step implementation guide in `handoff.md`.
- Included exact file contents for `LegacyApp.tsx`, `src/app/legacy/page.tsx`, `src/app/page.tsx`, `src/types/brotato.ts`, and `.eslintrc.json`.

## Artifact Index
- `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m1_1/handoff.md` — Complete worker implementation specifications
- `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m1_1/progress.md` — Liveness heartbeat and milestone progress
