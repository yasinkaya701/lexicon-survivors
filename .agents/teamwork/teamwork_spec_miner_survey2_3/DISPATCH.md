## 2026-11-04T15:28:13Z
You are a teamwork_spec_miner tasked with surveying the educational question engine, designing the mid-wave question charge mechanic (R3), and designing the automated verification test plan (R4).

Working directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey2_3/
Original request: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md

Read ORIGINAL_REQUEST.md first.

Investigate thoroughly:
1. How educational questions are currently triggered, loaded, and scored in `src/data/questions.ts`, `src/game/questions/`, `src/components/StudyBuffModal.tsx`, and `src/components/TacticalFreezeModal.tsx`. How is question frequency controlled? How can we increase question frequency across the overall game loop?
2. Mid-wave question charge mechanic: How should question charges be earned, displayed on the HUD, and triggered during combat (e.g. keybind like 'Q' or space/button click)? When triggered, how should the game state be safely paused/frozen (`dt=0`) without desynchronizing combat, projectiles, or timers?
3. Item reward system: When the player correctly answers the mid-wave question charge, what bonus item rewards should be granted (e.g. tier-appropriate weapon, stat item, or arena drop chest) and how should it integrate into player inventory or arena drops?
4. Existing test suite in `tests/`: What tests currently exist (`tests/e2e/`, `tests/unit/`, `tests/adversarial/`)? What new unit and integration tests are required in `tests/` to rigorously verify:
   - mid-wave question charge activation and state preservation
   - correct answer item granting and inventory sync
   - boosted player speed and projectile speed parameters
   - rebalanced weapon damage and enemy HP formulas

Write your comprehensive handoff report to: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey2_3/handoff.md.
Also update /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey2_3/progress.md regularly.
Send a completion message back when done.
