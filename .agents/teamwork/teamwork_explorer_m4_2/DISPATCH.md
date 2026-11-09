# DISPATCH — Milestone 4 Explorer 2

## Mission
Analyze and specify Educational Buff Mapping, 4 Tactical Superpowers & Frame-Accurate Freeze Mechanics.

## Scope of Investigation
- Design the Educational Buff Engine (`src/game/education/`):
  * Subject-to-Stat Buff Matrix:
    - Türkçe -> +Speed %, +Dodge %
    - Matematik -> +Attack Speed %, +Crit Chance %
    - Fen (Science) -> +Elemental Damage, +Engineering
    - BUEPT (English) -> +Harvesting, +Luck, +XP Multiplier
    - Sosyal -> +Armor, +Max HP
  * Grace Consolation System:
    - On wrong answer: NO damage penalty, NO material loss.
    - Grant minor consolation buff (+2% Speed or +1 Armor) + pedagogic encouragement.
  * In-Combat Tactical Freeze Superpowers (triggered via mystery chest pickup or elite spawn event):
    1. Revitalizing Surge: Instantly restore 50% of missing/max HP.
    2. Orbital Particle Nuke: Massive radial shockwave dealing 500 damage to all active screen enemies.
    3. Flow State Frenzy: 10s hyper-state with +100% attack speed, 0 weapon cooldowns, 100% crit chance.
    4. Cosmic Material Vacuum: Instant universal pull on all dropped material crystals directly to player.
- Frame-Accurate Pause & Resume:
  * How `GameLoop` and `GameCanvas` suspend physics, velocity updates, and weapon timers without time accumulation or delta-spike upon unfreezing.
  * Integration with audio triggers (`playTacticalFreeze`, `playQuestionCorrect`, `playQuestionWrong`, `playNukeDetonation`).

## Mandatory References
- `/Users/afurkanmac/Downloads/hackhaton/ORIGINAL_REQUEST.md`
- `/Users/afurkanmac/Downloads/hackhaton/PROJECT.md`
- `/Users/afurkanmac/Downloads/hackhaton/src/game/engine/GameLoop.ts`
- `/Users/afurkanmac/Downloads/hackhaton/src/components/GameCanvas.tsx`
- `/Users/afurkanmac/Downloads/hackhaton/src/lib/sound.ts`

## Output Requirements
- Write your analysis and implementation contracts to `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m4_2/handoff.md`.
