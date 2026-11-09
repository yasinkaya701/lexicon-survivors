# BRIEFING — 2026-11-03T21:46:30Z

## Mission
Probe and document authoritative specifications for Milestone 2 (Weapons & Combat Systems Architecture) including WeaponCatalog, WeaponManager, CombatMath, Targeting, and HitResolution.

## 🔒 My Identity
- Archetype: specification miner
- Roles: external domain expert, specification miner
- Working directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_1
- Original parent: 808e1bff-3dbc-4dd2-9c78-614a468f634c
- Milestone: M2 - Weapons & Combat Systems Architecture

## 🔒 Key Constraints
- Authoritative specification source: PROJECT.md, brotato.ts, ORIGINAL_REQUEST.md, tests/unit/combat_math.test.ts, tests/unit/stat_scaling.test.ts, tests/e2e/game_loop_tiers.test.ts
- Do NOT implement directly in src/ as specification miner; output complete specification report and implementation-ready TypeScript code in handoff.md
- All internal communication, code, and comments in English
- Node environment: export PATH="$HOME/.local/node/bin:$PATH"

## Current Parent
- Conversation ID: 808e1bff-3dbc-4dd2-9c78-614a468f634c
- Updated: 2026-11-03T21:40:21Z

## Task Summary
- **What to build**: Specification report and implementation-ready TypeScript modules for `WeaponCatalog.ts`, `WeaponManager.ts`, `CombatMath.ts`, `Targeting.ts`, and `HitResolution.ts`.
- **Success criteria**: Exact mathematical alignment with unit/e2e tests, all 7 weapons across 4 tiers with proper stat progression, 100% type compatibility with `src/types/brotato.ts`.
- **Interface contracts**: `PROJECT.md`, `src/types/brotato.ts`, `src/types/game.ts`
- **Code layout**: `src/game/weapons/`, `src/game/stats/`

## Key Decisions Made
- Aligned formulas strictly with verified unit tests: Armor hyperbolic formula `15 / (15 + armor)`, attack cooldown `T0 * 100 / (100 + AS)` with 83.33ms cap and -90% floor, dodge 60% cap, Life Steal 100ms ICD, harvesting +5% ceil.
- Cataloged all 7 canonical weapons across Tiers 1-4 (28 blueprints total) adhering to the 1.35x damage, 0.90x cooldown, +5% crit, 1.15x knockback upgrade rules.
- Hit resolution designed with circular arc angular tolerance including target radius compensation, oriented segment capsule thrust, ballistic projectile piercing with ID deduplication, and ricochet bouncing.
- WeaponManager manages 6 simultaneous slots with independent ticking, firing animation progress, auto-combining duplicate weapons at full inventory, and auto/manual targeting modes.

## Artifact Index
- `handoff.md` — Complete specification report and implementation-ready modules
- `progress.md` — Liveness heartbeat and progress log
- `DISPATCH.md` — Incoming dispatch messages
