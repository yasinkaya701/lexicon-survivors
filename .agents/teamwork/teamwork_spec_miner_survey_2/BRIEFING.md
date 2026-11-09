# BRIEFING — 2026-11-03T18:07:30Z

## Mission
Mine, discover, and specify the Educational YKS/BUEPT Tactical Question-Buff System and Visual/Audio Asset Infrastructure for the Brotato-style roguelite game.

## 🔒 My Identity
- Archetype: Specification Miner
- Roles: Teamwork specialist, Question Buff & Asset Spec Miner
- Working directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_2
- Original parent: 808e1bff-3dbc-4dd2-9c78-614a468f634c
- Milestone: Survey & Specification Phase

## 🔒 Key Constraints
- Do NOT implement anything — read-only specification miner.
- Must read ORIGINAL_REQUEST.md and DISPATCH.md.
- Follow 5-component handoff report protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method).
- Table format for Features Discovered and Edge Cases.
- Output to handoff.md and update progress.md.
- Send completion message to parent when done.

## Current Parent
- Conversation ID: 808e1bff-3dbc-4dd2-9c78-614a468f634c
- Updated: 2026-11-03T18:07:30Z

## Task Summary
- **What to build**: Full specification for Educational YKS/BUEPT Question-Buff System (inter-wave study phase, in-run tactical events, category accuracy tracking) and Visual/Audio Asset Infrastructure (inventory, specs, image generation prompts, Web Audio sound engine).
- **Success criteria**: Comprehensive, actionable specification report in handoff.md with complete schema mappings, sound synthesis triggers, and image prompts.
- **Interface contracts**: src/data/questions.ts, src/lib/sound.ts, src/types/game.ts.
- **Code layout**: src/ directory for game logic, .agents/teamwork/ for agent metadata.

## Key Decisions Made
- Confirmed existing questions: 6 YKS, 6 BUEPT with multiple_choice and evidence_hunt modes. Expanded categories to cover TYT/AYT Math, Turkish, Physics, Chemistry, Biology, History, Geography, Philosophy and BUEPT Vocab, Reading, Logic, Grammar.
- Designed Inter-Wave Study Phase with a 3-choice curriculum buff reward (stat boost, gold/materials, discount voucher) and zero HP penalty on wrong answer with a consolation reward (+1 Luck, +5 Materials).
- Designed In-Run Tactical Events with clean tick-frozen pause, audio lowpass filtering, and 4 tactical rewards (Heal, Nuke, Flow State Frenzy, Vacuum).
- Specified 25+ visual asset inventory with 1:1 aspect ratio, cartoonish Brotato aesthetic, and formulated concrete prompts for `generate_image`.
- Specified 12 procedural sound synthesis triggers in Web Audio API expanding `src/lib/sound.ts`.

## Artifact Index
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_2/DISPATCH.md — Dispatch log
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_2/BRIEFING.md — Persistent context
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_2/progress.md — Progress tracker
- /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_2/handoff.md — Final deliverable report
