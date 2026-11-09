# BRIEFING — 2026-11-03T18:47:45Z

## Mission
Design the pure TypeScript modules and specifications for `src/game/entities/` (enemies & drops), `src/game/waves/`, and `src/game/shop/` for Milestone 2.

## 🔒 My Identity
- Archetype: teamwork_spec_miner
- Roles: Enemy AI, Waves & Shop Spec Miner
- Working directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_2/
- Original parent: 808e1bff-3dbc-4dd2-9c78-614a468f634c
- Milestone: Milestone 2 (Enemies, Waves, Drops & Shop Architecture)

## 🔒 Key Constraints
- Output must be written to /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_2/handoff.md and progress.md.
- Send completion message to parent (808e1bff-3dbc-4dd2-9c78-614a468f634c) when done.
- .agents/teamwork/ must contain only metadata (no source/test code files directly in workspace except handoff.md, BRIEFING.md, progress.md, DISPATCH.md).
- Follow strict Brotato mechanics: 5 enemy archetypes, 20-wave curve, harmonic pulsing, linear enemy stat scaling, end-of-wave vacuum, drops (gems, fruit, crates), 4-slot shop, price inflation, escalating reroll, slot locks, weapon tier combining.

## Current Parent
- Conversation ID: 808e1bff-3dbc-4dd2-9c78-614a468f634c
- Updated: not yet

## Task Summary
- **What to build**: Specification report and implementation-ready TypeScript code for EnemyEntities, WaveDirector, DropManager, and ShopEngine.
- **Success criteria**: Comprehensive discovery and edge-case tables, exact math formulas, clean typed TypeScript implementations/interfaces, ready for drop-in or direct worker execution.
- **Interface contracts**: src/types/brotato.ts and PROJECT.md
- **Code layout**: src/game/entities/, src/game/waves/, src/game/shop/

## Key Decisions Made
- Mined authoritative requirements and formulas from PROJECT.md, tests/unit/stat_scaling.test.ts, tests/unit/shop_economy.test.ts, and tests/e2e/game_loop_tiers.test.ts.
- Designed 5 canonical enemy archetypes (Swarmer soft flocking, Rusher sinusoidal weaving at 260 px/s, Tank telegraphed 360 px/s dash with knockback immunity, Ranged Shooter 350-450px kiting with 0.5s laser telegraph, Elite Boss radial 12-bullet nova and 140px slam).
- Designed WaveDirector with exact 20-wave escalation curve, 15s harmonic pulsing formula, perimeter spawn placement, and vacuum trigger.
- Designed DropManager with dual gems, fruit, crates, Luck probability scaling, pickupRange magnetic physics (1500 px/s^2), and 2000 px/s vacuum acceleration.
- Designed ShopEngine with 4-slot generation, base prices, wave inflation, escalating reroll cost with per-wave reset, slot lock with inflation freeze, and weapon fusion with auto-combine on full inventory.
- Produced exhaustive 22-feature discovery table, 12-entry edge case table, 5-component handoff report, and implementation-ready code modules in handoff.md.

## Artifact Index
- DISPATCH.md — Dispatch instructions and mission details
- BRIEFING.md — Working memory and situational awareness
- progress.md — Liveness heartbeat and milestone tracking
- handoff.md — Complete 5-component report with discovered features, edge cases, and 4 implementation-ready code specifications
