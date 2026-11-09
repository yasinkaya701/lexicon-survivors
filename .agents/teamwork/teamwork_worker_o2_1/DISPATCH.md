## 2026-11-04T16:20:53Z
You are teamwork_worker tasked with implementing Milestone O2: Game Speed, Pacing, and Power Rebalance.

Working directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_worker_o2_1/
Original request: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md
Survey Handoff Report: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey2_2/handoff.md
PROJECT document: /Users/afurkanmac/Downloads/hackhaton/PROJECT.md

Read ORIGINAL_REQUEST.md, PROJECT.md, and the Survey Handoff Report before starting.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Exclusively owned files for Milestone O2:
- `src/game/engine/Kinematics.ts`
- `src/game/weapons/WeaponCatalog.ts`
- `src/game/entities/EnemyEntities.ts`
- `src/game/waves/WaveDirector.ts`
- `tests/adversarial/engine_combat_tier5_stress.test.ts`
- `tests/unit/stat_scaling.test.ts`
- `tests/adversarial/m2_challenger_stress.test.ts`

Implementation Requirements (per teamwork_spec_miner_survey2_2/handoff.md):
1. Player Kinematics & Speed (`src/game/engine/Kinematics.ts`):
   - Increase `BASE_PLAYER_SPEED` from 300 to **360 px/s** (+20%).
   - Increase `PLAYER_ACCELERATION` from 2400 to **3200 px/s²** (+33%).
   - Keep `FRICTION_DAMPING = 0.88`, `DASH_SPEED_MULTIPLIER = 1.5` (dash achieves 540 px/s).
2. Weapon Balance & Projectile Velocities (`src/game/weapons/WeaponCatalog.ts`):
   - **Pistol**: `baseDamage: 14`, `baseCooldownMs: 650`, `baseRange: 360`, `projectileSpeed: 800`, `critChance: 0.12`, `critMultiplier: 2.0`, `knockback: 12`.
   - **Shotgun**: `baseDamage: 5`, `baseCooldownMs: 850`, `baseRange: 300`, `projectileSpeed: 700`, `critChance: 0.08`, `critMultiplier: 1.75`, `knockback: 20`, `pelletCount: 4`, `spreadAngleDeg: 28`.
   - **SMG**: `baseDamage: 3`, `baseCooldownMs: 130`, `baseRange: 280`, `projectileSpeed: 850`, `critChance: 0.06`, `critMultiplier: 1.5`, `knockback: 3`.
   - **Magic Wand**: `baseDamage: 10`, `baseCooldownMs: 580`, `baseRange: 340`, `projectileSpeed: 650`, `critChance: 0.08`, `critMultiplier: 1.75`, `knockback: 8`, `bounce: 1`.
   - **Knife**: `baseDamage: 8`, `baseCooldownMs: 340`, `baseRange: 125`, `critChance: 0.20`, `critMultiplier: 2.0`, `knockback: 5`.
   - **Sword**: `baseDamage: 15`, `baseCooldownMs: 580`, `baseRange: 150`, `critChance: 0.10`, `critMultiplier: 1.75`, `knockback: 15`, `arcAngleDeg: 120`.
   - **Wrench**: `baseDamage: 12`, `baseCooldownMs: 500`, `baseRange: 135`, `critChance: 0.08`, `critMultiplier: 1.5`, `knockback: 14`, `arcAngleDeg: 95`.
   - Ensure the tier escalation formulas automatically scale all 28 weapon blueprints accurately.
3. Enemy Archetypes & Scaling Curves (`src/game/entities/EnemyEntities.ts`):
   - **Swarmer**: `baseHp: 4.5`, `hpPerWave: 2.5`, `baseDmg: 1.0`, `dmgPerWave: 0.7`, `baseSpeed: 165 px/s`.
   - **Rusher**: `baseHp: 3.5`, `hpPerWave: 1.8`, `baseDmg: 1.2`, `dmgPerWave: 0.7`, `baseSpeed: 280 px/s`.
   - **Tank / Charger**: `baseHp: 26.0`, `hpPerWave: 12.0`, `baseDmg: 3.5`, `dmgPerWave: 1.8`, `baseSpeed: 105 px/s`, dash speed: `400 px/s`.
   - **Ranged Shooter**: `baseHp: 8.0`, `hpPerWave: 3.5`, `baseDmg: 2.5`, `dmgPerWave: 1.0`, `baseSpeed: 135 px/s`, bullet speed: `240 px/s`.
   - **Wave Elite / Boss**: `baseHp: 400.0`, `hpPerWave: 180.0`, `baseDmg: 6.0`, `dmgPerWave: 3.0`, `baseSpeed: 140 px/s`, nova bullet speed: `190 px/s`, slam radius: `150 px`.
4. Wave Director Streamlining (`src/game/waves/WaveDirector.ts`):
   - Wave duration curve: Waves 1-6 unchanged (20, 25, 30, 35, 40, 45); Wave 7: 45s; Wave 8: 50s; Waves 9: 50s; Wave 10: 55s; Wave 11: 60s; Waves 12-13: 50s; Waves 14-16: 55s; Waves 17-19: 60s; Wave 20: 75s (total run ~14.5 minutes).
   - Harmonic spawn rate base $R_0 = 2.0$ (up from 1.8), max concurrent enemies: `min(85, 22 + wave * 3.2)`.
5. Downstream Test Fixtures Synchronization:
   - In `tests/adversarial/engine_combat_tier5_stress.test.ts:321`, update expected player speed: `calculateMaxSpeed(BASE_PLAYER_SPEED, 0, false) === 360` (and dash to 540).
   - In `tests/unit/stat_scaling.test.ts`, update local copies of enemy archetypes or import `ENEMY_ARCHETYPES` so test assertions match the rebalanced curves.
   - In `tests/adversarial/m2_challenger_stress.test.ts`, ensure tests reference blueprint bases or updated formulas.
