# BRIEFING — 2026-11-04T15:27:00Z

## Mission
Overhaul the Brotato-style roguelite web game: revamp visual assets with high-res digital/vector illustration sprites, enlarge player character sprite, accelerate player movement and combat pacing, rebalance power curves and enemy scaling, modern sleek UI/HUD overhaul, and implement mid-wave question charges that reward items.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/orchestrator/
- Original parent: caller agent
- Original parent conversation ID: f7eb7cf9-37ff-4f7e-a804-3ba6520882cd

## 🔒 My Workflow
- **Pattern**: Project Pattern (Dual Track: Implementation + E2E Testing)
- **Scope document**: /Users/afurkanmac/Downloads/hackhaton/PROJECT.md
1. **Decompose**: Map full scope via Survey (3 explorers), create Feature Inventory & Milestones, interface contracts in PROJECT.md.
2. **Dispatch & Execute** (pick ONE):
   - **Direct (iteration loop)**: Orchestrator runs Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate cycle for milestones.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: at 16 spawns, write handoff.md, spawn successor
- **Work items**:
  1. Survey & Codebase Analysis [DONE]
  2. PROJECT.md creation & E2E Testing Track setup [DONE: TEST_READY.md published, 134/134 tests pass]
  3. Milestone 1: Legacy Code Archival & Clean-room foundation [DONE: Gate PASS]
  4. Milestone 2: Core Combat & Wave Roguelite Engine [DONE: Gate PASS]
  5. Milestone 3: Asset Generation & Visual/Audio Polish [DONE: Gate PASS]
  6. Milestone 4: Educational YKS/BUEPT Question & Buff System [DONE: Gate PASS]
  7. Final Milestone: E2E Test Suite (Tiers 1-4) & Adversarial Hardening (Tier 5) [DONE: Gate PASS]
  8. Overhaul Survey: Visuals, Speed/Balance, In-Round Questions [IN_PROGRESS]
  9. Overhaul M1: High-Res Digital/Vector Sprites, Enlarged Player & UI/HUD Revamp [PENDING]
  10. Overhaul M2: Player Speed, Pacing & Power Rebalance [PENDING]
  11. Overhaul M3: Question Frequency & Mid-Wave Question Charges [PENDING]
  12. Overhaul M4: Automated Verification Suite & Build Verification [PENDING]
- **Current phase**: Overhaul Milestone O2 (Game Speed, Movement & Power Rebalance)
- **Current focus**: Milestone O2 Implementation Worker active (`teamwork_worker_o2_1`)

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers.
- Use file-editing tools ONLY for metadata/state files (.md) in .agents/teamwork/
- Forensic Auditor reports INTEGRITY VIOLATION -> milestone FAILS UNCONDITIONALLY.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Node path: export PATH="$HOME/.local/node/bin:$PATH"
- Do all internal work in English.
- Plan with Opus, implementation with Argon/Worker; prioritize UI polish.

## Current Parent
- Conversation ID: 36cc6bcf-7d4b-4cce-8033-ba8de8073307
- Updated: 2026-11-04T15:27:00Z

## Key Decisions Made
- Milestone 1 GATE PASSED: All 8 legacy components quarantined to `src/legacy/components/`, `/legacy` route verified, new Brotato hub at `/`, `.eslintrc.json` clean, Vitest running 134 tests, Next.js build clean.
- Milestone 2 GATE PASSED: Full Brotato combat engine, 17 RPG stats, 5 enemy types, 20 waves, 4-slot shop, 60 FPS HTML5 canvas verified (Reviewers APPROVE, Challengers APPROVE, Forensic Auditor CLEAN).
- Milestone 3 Exploration Complete: 3 Explorers mapped visual asset loading, procedural Web Audio engine, and canvas VFX/polish.
- Dispatched `teamwork_worker_m3_1` to implement the 26 visual assets in `public/assets/`, extend `src/lib/sound.ts` with 12 synthesizers, deploy `AssetManager.ts`, `FloatingTextManager.ts`, `VFXManager.ts`, and integrate into `src/components/GameCanvas.tsx`.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| teamwork_explorer_m3_1 | teamwork_explorer | Visual Asset Pipeline & Sprite Blitting | completed | 8d1a36b0-01ae-4cf3-b99f-39fcd8153dac |
| teamwork_explorer_m3_2 | teamwork_explorer | Procedural Web Audio Engine | completed | 3505b78e-c6e3-4c81-8a12-e3568f4b2854 |
| teamwork_explorer_m3_3 | teamwork_explorer | Canvas VFX, Floating Text & Polish | completed | df6f236e-abff-4277-a2f3-fd7677ad3c1d |
| teamwork_worker_m3_1 | teamwork_worker | Visuals, Audio & VFX Implementation | failed | 93c96457-4c24-4610-af83-f8c545c8c6e2 |
| teamwork_worker_m3_2 | teamwork_worker | Canvas Integration & Verification | completed | 620bd063-eb24-4293-bc38-dfba9e4656ca |
| teamwork_reviewer_m3_1 | teamwork_reviewer | Visual Pipeline Review | completed | ce7a6ca6-66c0-4d33-8ffa-f2a86c87e7c2 |
| teamwork_reviewer_m3_2 | teamwork_reviewer | Audio & VFX Review | completed | ebfa38aa-efda-4fbf-8560-3fe334f15ede |
| teamwork_challenger_m3_1 | teamwork_challenger | Asset & Canvas Stress | completed | d1f0bed4-9d4f-4563-8360-c5726bd27e91 |
| teamwork_challenger_m3_2 | teamwork_challenger | Audio & VFX Stress | completed | de8904fc-f4fb-4d27-9314-eb6e6dfaffe3 |
| teamwork_auditor_m3_1 | teamwork_auditor | Forensic Integrity Audit | completed | 0c1ee29f-256b-408a-8ac8-c5d804914491 |
| teamwork_spec_miner_m4_1 | teamwork_spec_miner | Question Bank & Curriculum Spec | completed | e2f61f31-3825-465f-8a70-4ed68883034f |
| teamwork_explorer_m4_2 | teamwork_explorer | Buff Engine & Superpowers Explorer | completed | aabd1679-b5ed-4093-9e9b-613fb72bb200 |
| teamwork_explorer_m4_3 | teamwork_explorer | Educational UI & Telemetry Explorer | completed | ec5dadb9-82ba-4d4c-8abe-717664d7394d |
| teamwork_worker_m4_1 | teamwork_worker | Educational System Implementation | completed | e25fd22b-7ad1-4275-969a-65a6d3317339 |
| teamwork_reviewer_m4_1 | teamwork_reviewer | Educational Logic Review | completed | 19b84a4f-1282-4354-814f-5305cc4f4e1a |
| teamwork_reviewer_m4_2 | teamwork_reviewer | Educational UI Review | completed | 4b050f47-786a-4a42-8cbf-7abd4f0d4efe |
| teamwork_challenger_m4_1 | teamwork_challenger | Buff Engine Stress Challenge | completed | 5cc4a388-f378-4ff8-ac16-68c8d528e19c |
| teamwork_challenger_m4_2 | teamwork_challenger | Superpowers & Freeze Challenge | completed | 2ba37f27-1fc9-4393-a412-31d15490b138 |
| teamwork_auditor_m4_1 | teamwork_auditor | Educational Forensic Audit | completed | b00bb21b-6492-4898-8bc7-9daf3510d10b |
| teamwork_worker_m4_2 | teamwork_worker | Educational System Remediation | completed | 742b0ce5-fb46-458e-80cb-28c527987661 |
| teamwork_reviewer_m4_3 | teamwork_reviewer | Remediation Verification Review | completed | dba7dd4a-607c-4770-8d19-09ca142fd46e |
| teamwork_challenger_m5_1 | teamwork_challenger | Core Combat Tier 5 Hardening | completed | f023e147-4621-4d4d-923b-334712ddcbea |
| teamwork_challenger_m5_2 | teamwork_challenger | Education VFX Tier 5 Hardening | completed | b693cbd8-99a0-4dc3-a863-f7fa23d843fc |
| teamwork_reviewer_m5_1 | teamwork_reviewer | Final Integration Review | completed | 8f349a88-6602-4147-84b3-ae0cedaf1ceb |
| teamwork_explorer_survey2_1 | teamwork_explorer | Visual Asset & UI Polish Survey | completed | e8680ac1-3423-4475-a889-e8dcd9832093 |
| teamwork_spec_miner_survey2_2 | teamwork_spec_miner | Speed, Physics & Balance Survey | completed | 2a98c7f0-e550-4e50-abba-8ee1db493d94 |
| teamwork_spec_miner_survey2_3 | teamwork_spec_miner | In-Round Questions & Test Plan Survey | completed | 948952c9-47df-42cc-be03-7ed746dae223 |
| teamwork_worker_o1_1 | teamwork_worker | Milestone O1 Visuals & UI Polish | completed | fa6d350b-898d-49ac-bdc4-6e527899901e |
| teamwork_reviewer_o1_1 | teamwork_reviewer | Visual & UI Review 1 | completed | e73f5e8f-7e80-47c0-b6ea-3e5f9e45a7ba |
| teamwork_reviewer_o1_2 | teamwork_reviewer | UI & Modal Review 2 | completed | 8c1956cd-38e8-4edf-acee-490d353314a8 |
| teamwork_challenger_o1_1 | teamwork_challenger | Canvas & Asset Stress Challenge | completed | 09dbdcf6-e3d4-4de4-95fb-1c3cce0c2166 |
| teamwork_challenger_o1_2 | teamwork_challenger | UI & Component Stress Challenge | completed | 02c62b45-b58e-414f-ac95-afa4227a0028 |
| teamwork_auditor_o1_1 | teamwork_auditor | Forensic Integrity Audit O1 | completed | cb6556c3-5330-4e64-8fdf-d993148e3104 |
| teamwork_worker_o2_1 | teamwork_worker | Milestone O2 Speed & Power Rebalance | in-progress | 771aab69-58cc-48cb-b7b7-931027bfbd59 |

## Succession Status
- Succession required: no
- Spawn count: 58 / 128
- Pending subagents: 771aab69-58cc-48cb-b7b7-931027bfbd59
- Predecessor: none
- Successor: none

## Active Timers
- Heartbeat cron: 4eef8933-c68f-4d51-b121-5388876d97ee/task-22
- Safety timer: 4eef8933-c68f-4d51-b121-5388876d97ee/task-196
- On succession: kill all timers before spawning successor
- On context truncation: handle timers as step 4 of the State Recovery section of your prompt says

## Artifact Index
- /Users/afurkanmac/Downloads/hackhaton/PROJECT.md — Global project plan, 76 features, milestones & contracts
- /Users/afurkanmac/Downloads/hackhaton/TEST_INFRA.md — E2E Test Infrastructure & 76-feature test mapping
- /Users/afurkanmac/Downloads/hackhaton/TEST_READY.md — E2E Test Suite verification (134/134 tests passing)
- /Users/afurkanmac/Downloads/hackhaton/src/types/brotato.ts — Core Brotato Roguelite TypeScript schemas
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/orchestrator/GATE_STATUS.md — Gate tracking per milestone iteration
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m2_1/handoff.md — Movement, Kinematics, Collision, Dodge, GameLoop specs
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_1/handoff.md — Weapons, CombatMath, Targeting, HitResolution specs
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_2/handoff.md — EnemyEntities, WaveDirector, DropManager, ShopEngine specs
