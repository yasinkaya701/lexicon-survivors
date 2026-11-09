# BRIEFING — 2026-11-03T18:07:00Z

## Mission
Mine, extract, and formalize the complete technical and gameplay specification for a Brotato-style top-down arena roguelite web game based on public mechanics, wikis, and reference data.

## 🔒 My Identity
- Archetype: specification_miner
- Roles: Brotato Mechanics Spec Miner
- Working directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_1/
- Original parent: 808e1bff-3dbc-4dd2-9c78-614a468f634c
- Milestone: Survey & Specification Mining

## 🔒 Key Constraints
- Read-only regarding project implementation code: do NOT implement game features, only mine and formalize specifications.
- Prioritize authoritative public mechanics, wikis, and reference data for Brotato.
- Deliver exact mathematical formulas, state models, design constants, edge cases, and verification methods.
- Write handoff report to handoff.md and maintain progress.md.

## Current Parent
- Conversation ID: 808e1bff-3dbc-4dd2-9c78-614a468f634c
- Updated: 2026-11-03T18:07:00Z

## Task Summary
- **What to build**: Comprehensive technical & gameplay specification for Brotato-style arena roguelite mechanics (Movement & Arena Physics, Weapons System, RPG Stat System & Formulas, Enemies & Wave Progression, Inter-Wave Shop & Economy).
- **Success criteria**: Hand-off specification covering all 5 core subsystems with exact formulas, state definitions, tables, edge cases, and testable invariants. Complete handoff.md delivered.
- **Interface contracts**: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md
- **Code layout**: .agents/teamwork/teamwork_spec_miner_survey_1/

## Key Decisions Made
- Structured specification with formal mathematical equations, TypeScript type models / signatures, and exact constants so implementation agents can directly convert them into pure engine logic.
- Formalized 40 distinct features in tabular format with input/output contracts, error behaviors, and discovery sources.
- Formalized 15 rigorous edge cases covering boundary conditions (Armor asymptotes, Dodge 60% cap, Life Steal 0.10s ICD, Attack Speed 12 hits/s cap, Harvesting ceiling compound, Charger knockback immunity).
- Provided pure test verification suite in Jest/Vitest for independent validation.

## Artifact Index
- DISPATCH.md — Task assignment and incoming messages
- BRIEFING.md — Persistent situational awareness
- progress.md — Real-time progress and heartbeat
- handoff.md — Final comprehensive specification report
