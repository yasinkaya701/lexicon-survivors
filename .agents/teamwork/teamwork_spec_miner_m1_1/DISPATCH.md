# Dispatch: teamwork_spec_miner_m1_1
Role: TypeScript Schema & Type Contract Spec Miner
Mission: Synthesize and formalize the complete `src/types/brotato.ts` type definition file, specifying all 17 RPG player stats, weapon blueprints, enemy blueprints, wave configs, shop slot models, and tactical question buff interfaces.
Original Request: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md
Project Index: /Users/afurkanmac/Downloads/hackhaton/PROJECT.md
Working Directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m1_1/

## 2026-11-03T18:13:12Z
You are teamwork_spec_miner_m1_1.
Your working directory is: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m1_1/
You MUST read /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.
Also read /Users/afurkanmac/Downloads/hackhaton/PROJECT.md and /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m1_1/DISPATCH.md.

Node environment: export PATH="$HOME/.local/node/bin:$PATH"

MISSION (Milestone 1 - TypeScript Schema Specification for `src/types/brotato.ts`):
1. Review all interfaces specified in `PROJECT.md` and the survey handoffs.
2. Produce the complete, compilable TypeScript source code for `/Users/afurkanmac/Downloads/hackhaton/src/types/brotato.ts`.
   The file must include:
   - `PlayerRPGStats` (all 17 RPG stats: maxHp, currentHp, hpRegen, lifeSteal, damagePercent, meleeDamage, rangedDamage, elementalDamage, attackSpeed, critChancePercent, engineering, range, armor, dodgePercent, speedPercent, luck, harvesting, pickupRange).
   - Weapon schemas: `WeaponType`, `WeaponSubtype`, `WeaponTier`, `WeaponScalingStat`, `WeaponBlueprint`, `ActiveWeaponInstance`.
   - Enemy schemas: `EnemyType`, `EnemyState`, `EnemyBlueprint`, `EnemyEntity`.
   - Projectile & Particle schemas: `ProjectileEntity`, `FloatingTextParticle`, `ExplosionEntity`.
   - Pickup & Drop schemas: `PickupType`, `PickupEntity`, `DropTableEntry`.
   - Wave & Progression schemas: `WaveConfig`, `SpawnRule`, `WaveDirectorState`.
   - Shop & Economy schemas: `ShopSlot`, `ShopRarityWeights`, `ShopState`, `UpgradeChoice`.
   - Tactical Question Buff schemas: `TacticalFreezeEvent`, `TacticalRewardType`, `TacticalRewardOption`, `StudyRewardChoice`.
   - Game State interface: `RogueliteGameState`.
3. Verify that all types are cleanly exported and have zero syntax or typecheck errors.

OUTPUT:
Write your full specification report including the exact TypeScript code to:
`/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m1_1/handoff.md`
and update `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m1_1/progress.md`.
Send a completion message to parent when done.

## 2026-11-03T18:17:54Z
Context: Server restart recovery
Content: The server has restarted. Please resume your specification work immediately from your current progress in progress.md. Draft the complete, compilable TypeScript source code for src/types/brotato.ts with all 17 stats and schemas. Write your handoff.md and send a completion message when done.
Action: Resume execution and deliver handoff.md.
