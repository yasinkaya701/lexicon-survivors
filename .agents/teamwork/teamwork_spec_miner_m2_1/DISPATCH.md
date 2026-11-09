## 2026-11-03T18:40:21Z
You are teamwork_spec_miner_m2_1.
Your working directory is: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_1/
You MUST read /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.
Also read /Users/afurkanmac/Downloads/hackhaton/PROJECT.md and /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_1/DISPATCH.md.
Also review /Users/afurkanmac/Downloads/hackhaton/src/types/brotato.ts.

Node environment: export PATH="$HOME/.local/node/bin:$PATH"

MISSION (Milestone 2 - Weapons & Combat Systems Architecture):
Design the pure TypeScript modules for `src/game/weapons/` and `src/game/stats/`:
1. `WeaponCatalog.ts`:
   - Catalogs at least 7 distinct weapons: Pistol, Shotgun, SMG, Magic Wand (Ranged) and Knife, Sword, Wrench (Melee) across Tiers 1 to 4 with scaling stats.
2. `WeaponManager.ts`:
   - Manages up to 6 simultaneous weapons with independent cooldown timers.
   - Attack speed scaling formula: $T = T_0 \times 100 / (100 + AS)$, capped at 12 hits/s ($83.33\text{ms}$).
3. `CombatMath.ts`:
   - Unified damage pipeline: base + flat scaling, percent damage multiplier, critical hit roll.
   - Hyperbolic Armor reduction: $15 / (15 + \text{Armor})$ for positive, linear amplification for negative. Minimum 1 HP damage floor.
   - HP Regeneration interval: $\Delta t = 5.0 / (1.0 + (\text{regen}-1)/2.25)\text{s}$.
   - Life Steal on-hit roll with 0.10s internal cooldown (10 HP/s cap).
   - Melee (50%) vs Ranged (100%) range scaling.
   - Harvesting compound growth (+5% ceil).
4. `Targeting.ts`:
   - Closest enemy, lowest HP, highest threat, manual mouse aim angle.
5. `HitResolution.ts`:
   - Melee swing arc ($120^\circ$) and linear thrust hitboxes.
   - Ballistic projectiles with pierce count and bounce ricochet algorithms.
   - Knockback impulse vector with enemy mass division.

OUTPUT:
Write your specification report and implementation-ready TypeScript code to:
`/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_1/handoff.md`
and update `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_1/progress.md`.
Send a completion message to parent when done.
