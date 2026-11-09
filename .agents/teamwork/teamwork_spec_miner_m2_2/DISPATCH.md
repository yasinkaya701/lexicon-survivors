# Dispatch: teamwork_spec_miner_m2_2
Role: Enemy AI, Waves & Shop Spec Miner
Mission: Design the implementation architecture for `src/game/entities/` (enemies & drops), `src/game/waves/`, and `src/game/shop/`:
1. 5 canonical enemy AI archetypes: Swarmer (flocking pursuit), Rusher (sinusoidal weave), Tank/Charger (telegraphed dash + knockback immunity), Ranged Shooter (kiting + laser telegraph), Wave Elite Boss (multi-phase attacks + guaranteed crate).
2. 20-wave director with harmonic spawn pulsing, danger level scaling, and end-of-wave vacuum.
3. Material gems, consumable fruits, and loot crates with magnetic pull physics.
4. 4-slot inter-wave shop: wave inflation, escalating reroll costs, slot locks, and weapon tier combining.
Original Request: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md
Project Index: /Users/afurkanmac/Downloads/hackhaton/PROJECT.md
Working Directory: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_2/

## 2026-11-03T18:40:29Z
You are teamwork_spec_miner_m2_2.
Your working directory is: /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_2/
You MUST read /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.
Also read /Users/afurkanmac/Downloads/hackhaton/PROJECT.md and /Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_2/DISPATCH.md.
Also review /Users/afurkanmac/Downloads/hackhaton/src/types/brotato.ts.

Node environment: export PATH="$HOME/.local/node/bin:$PATH"

MISSION (Milestone 2 - Enemies, Waves, Drops & Shop Architecture):
Design the pure TypeScript modules for `src/game/entities/`, `src/game/waves/`, and `src/game/shop/`:
1. `EnemyEntities.ts`:
   - 5 canonical enemy AI archetypes:
     * Swarmer: Direct pursuit with soft flocking separation.
     * Rusher: Sinusoidal flanker weaving at 260 px/s.
     * Tank / Charger: Slow stalk -> 0.8s telegraph -> 1.2s high-speed dash (360 px/s) with knockback immunity.
     * Ranged Shooter: Distance kiting (350-450px) with 0.5s laser telegraph and slow bullet fire.
     * Wave Elite / Boss: Multi-phase radial bullet ring, ground slam shockwave, guaranteed loot crate drop.
2. `WaveDirector.ts`:
   - 20-wave curve (20s to 60s, culminating in 90s boss).
   - Harmonic spawn pulsing formula.
   - Linear enemy HP & Damage wave scaling.
   - End-of-wave vacuum: magnetic acceleration ($2000\text{ px/s}$) pulling all remaining materials to player or uncollected bag.
3. `DropManager.ts`:
   - Material gems (gold + XP), consumable fruit (3 HP heal), loot crates.
   - Magnetic pull physics within `pickupRange` (base 120px).
4. `ShopEngine.ts`:
   - 4-slot shop generation with wave tier probabilities and Luck scaling.
   - Wave price inflation formula: $\text{Base} + 1 + \lfloor \text{Base} \times 0.10 \times \text{Wave} \rfloor$.
   - Escalating reroll cost: $\text{Base}(W) + k \times \text{Step}(W)$, resets per shop.
   - Slot lock persistence across rerolls with inflation freeze.
   - Weapon tier combining: merging two identical tier weapons into Tier $+1$.

OUTPUT:
Write your specification report and implementation-ready TypeScript code to:
`/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_2/handoff.md`
and update `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_m2_2/progress.md`.
Send a completion message to parent when done.
