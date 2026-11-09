# Dispatch to teamwork_spec_miner_survey_1
Role: Brotato Mechanics Spec Miner
Mission: Document full technical specification and mathematical formulas for Brotato-style arena roguelite combat, movement, weapons, stats, enemies, wave progression, drops, and inter-wave shop mechanics.
Original Request: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md
Working Directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_1/

## 2026-11-03T18:02:07Z
You are teamwork_spec_miner_survey_1.
Your working directory is: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_1/
You MUST read /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md before starting.
Also read /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_1/DISPATCH.md.

Node environment: export PATH="$HOME/.local/node/bin:$PATH"

MISSION:
Mine, extract, and formalize the complete technical and gameplay specification for a Brotato-style top-down arena roguelite web game based on public mechanics, wikis, and reference data.
Provide precise mathematical formulas, state models, and design constants for:
1. Movement & Arena Physics:
   - 360-degree player movement, speed formulas, boundary collisions, inertia/damping, dodge mechanics and cap (typically 60%).
2. Weapons System:
   - Minimum 4 weapon slots (up to 6).
   - Melee vs Ranged weapon architecture: swing arcs, thrusts, projectiles, bullet trajectories, range calculations.
   - Weapon stats: base damage, cooldown / attack speed scaling formula, range, knockback force & physics, crit chance, crit multiplier, pierce/bounce.
   - Weapon targeting algorithms: closest enemy, lowest health, highest threat, manual/directional aim option.
3. RPG Stat System & Formulas:
   - Full stat sheet: Max HP, HP Regeneration (regen frequency formula: e.g. delay = 5 / (regen + 5) sec), Life Steal (% chance on hit to restore 1 HP, capped at 10 HP/sec), Damage % (additive/multiplicative scaling), Attack Speed %, Crit Chance %, Engineering (structures/turrets/landmines), Range (melee vs ranged scaling), Armor (damage reduction formula: Reduction = Armor / (Armor + 15)), Dodge % (max 60%), Speed % (base move speed modifier), Luck (pickup drop chance, item rarity weight), Harvesting (end of wave economy growth).
4. Enemies & Wave Progression:
   - 5 distinct enemy types:
     * Basic Swarmer (low HP, flocking / direct pursuit)
     * Fast Rusher (high speed, lower HP, rapid approach)
     * Tank / Charger (high HP, charge windup, unknockbackable during charge)
     * Ranged Shooter (maintains distance, shoots telegraphing projectiles)
     * Wave Elite (miniboss / elite with telegraphed special attack patterns, large health pool, unique drop)
   - Wave timing and pacing: wave duration (e.g. 20-60s scaling), spawn rate scaling, enemy stat scaling curve per wave (Wave 1 to 20).
   - Drops: materials (currency/XP, magnetic pull range, auto-vacuum at wave end), consumable health fruits/crates (drop chances affected by Luck).
5. Inter-Wave Shop & Economy:
   - Inter-wave shop flow: transition from arena, pickup consolidation, shop generation (4 item/weapon slots).
   - Pricing formulas, inflation per wave, reroll cost formula (base cost + N * increment), lock item mechanics (persisting slots across rerolls).
   - Weapon upgrading / combining tiers (Tier 1 Common -> Tier 2 Uncommon -> Tier 3 Rare -> Tier 4 Legendary).

OUTPUT:
Write your full specification report to:
`/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_1/handoff.md`
and update `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_1/progress.md`.
Send a completion message to parent when done.
