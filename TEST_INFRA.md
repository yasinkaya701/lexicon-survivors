# TEST_INFRA.md — Brotato Roguelite Arena Test Infrastructure

## Overview & Architecture
This document specifies the opaque-box and unit test harness architecture for the **Brotato Arena Roguelite Web Game** with YKS/BUEPT Tactical Question-Buff Mechanics.

### Test Runner Configuration
- **Runtime**: Node.js v22.14.0 Native Test Runner with TypeScript Type Stripping (`node --experimental-strip-types --test`).
- **Runner Command**: `npm test` or `node --experimental-strip-types --test tests/unit/*.test.ts tests/e2e/*.test.ts`
- **Environment**: Zero external test runner dependencies, native ES Module execution, sub-100ms execution latency.
- **Assertion Framework**: `node:assert/strict` and `node:test` suite abstractions (`describe`, `it`, `test`).

### Directory Layout
```
tests/
├── unit/
│   ├── combat_math.test.ts       # Armor reduction, attack speed cooldown, dodge cap, life steal ICD, harvesting
│   ├── stat_scaling.test.ts      # Enemy wave scaling, spawn rates, weapon scaling, damage multipliers
│   ├── shop_economy.test.ts      # Base prices, wave price inflation, reroll cost escalation, slot lock, weapon fusion
│   └── question_buffs.test.ts    # Subject-to-stat buff application, consolation rewards, tactical combat superpowers, accuracy tracking
├── e2e/
│   └── game_loop_tiers.test.ts   # Tier 1 (Features), Tier 2 (Boundaries), Tier 3 (Cross-combinations), Tier 4 (Full multi-wave run)
└── adversarial/                  # Tier 5 stress, extreme numerical limits, and fault injection tests
```

---

## 76 Feature Test Mapping Inventory

| # | Feature Name | Category | Target Milestone | Test Suite Location | Tier | Verification Type |
|---|--------------|----------|------------------|---------------------|------|-------------------|
| 1 | 360° Omnidirectional Movement | Kinematics | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Vector integration, normalized diagonal velocity |
| 2 | Inertia & Damping Physics | Kinematics | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Damping factor 0.88 decay curve |
| 3 | Boundary Collision & Sliding | Arena | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 2 | Coordinate clamping & orthogonal velocity zeroing |
| 4 | Dodge Avoidance Roll (60% Cap) | Combat | M2 | `tests/unit/combat_math.test.ts` | Tier 1 & 2 | Hard 60% clamp, RNG avoidance resolution |
| 5 | Simultaneous Multi-Weapon Array | Weapons | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Up to 6 simultaneous weapons firing independently |
| 6 | Melee Swing Arc Hitbox | Combat | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Circular sector cone hit detection |
| 7 | Melee Thrust Stab Hitbox | Combat | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Linear rectangular reach extension & retraction |
| 8 | Ranged Ballistics | Combat | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Projectile trajectory, lifetime, and impact |
| 9 | Attack Speed Cooldown Formula | Combat Math | M2 | `tests/unit/combat_math.test.ts` | Tier 1 & 2 | T = T0 * 100 / (100 + AS), 12 hits/s cap (83.33ms) |
| 10 | Knockback Physics | Physics | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Impulse vector scaled inversely by enemy mass |
| 11 | Pierce Mechanics | Combat | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Projectile persists across N enemy penetrations |
| 12 | Bounce Mechanics | Combat | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Closest target ricochet within 300px radius |
| 13 | Auto-Target: Closest Enemy | Targeting | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Minimum Euclidean distance targeting |
| 14 | Auto-Target: Lowest Health | Targeting | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Minimum current HP enemy selection |
| 15 | Auto-Target: Highest Threat | Targeting | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Boss > Charger > Shooter > Rusher > Swarmer |
| 16 | Manual Aim Override | Targeting | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Mouse coordinate angle calculation atan2(dy, dx) |
| 17 | Armor Damage Reduction | Combat Math | M2 | `tests/unit/combat_math.test.ts` | Tier 1 & 2 | Hyperbolic curve D * 15 / (15 + Armor), negative armor amp |
| 18 | HP Regeneration Interval | Combat Math | M2 | `tests/unit/combat_math.test.ts` | Tier 1 & 2 | Variable interval dt = 5 / (1 + (Regen - 1) / 2.25) |
| 19 | Life Steal On-Hit (0.10s ICD) | Combat Math | M2 | `tests/unit/combat_math.test.ts` | Tier 1 & 2 | 0.10s ICD enforcement, max 10 HP/s throughput |
| 20 | Melee vs Ranged Range Scaling | Scaling | M2 | `tests/unit/stat_scaling.test.ts` | Tier 1 & 2 | Ranged 1:1, Melee 0.5:1, min range clamp 25px |
| 21 | Engineering Scaling | Scaling | M2 | `tests/unit/stat_scaling.test.ts` | Tier 1 | Primary stat isolation, deployable base boost |
| 22 | Luck Multiplier | Drop Math | M2 | `tests/unit/stat_scaling.test.ts` | Tier 1 & 2 | P = P0 * (1 + Luck / 100), bounded probability |
| 23 | Harvesting Economy | Economy | M2 | `tests/unit/combat_math.test.ts` | Tier 1 & 2 | Wave payout + ceil(harvesting * 0.05) compound growth |
| 24 | Basic Swarmer AI | Enemies | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Horde direct pursuit with separation |
| 25 | Fast Rusher AI | Enemies | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Sinusoidal weaving approach with high velocity |
| 26 | Tank / Charger AI | Enemies | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 & 3 | Telegraphed dash with knockback immunity |
| 27 | Ranged Shooter AI | Enemies | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Distance kiting with laser telegraph & projectile firing |
| 28 | Wave Elite / Boss AI | Enemies | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 & 4 | Multi-phase boss mechanics & guaranteed loot crate |
| 29 | 20-Wave Escalation | Progression | M2 | `tests/unit/stat_scaling.test.ts` | Tier 1 & 4 | Ramp 20s to 60s, culminating in 90s boss wave |
| 30 | Enemy Stat Scaling | Progression | M2 | `tests/unit/stat_scaling.test.ts` | Tier 1 & 2 | Linear wave scaling Base + Scaling * (Wave - 1) |
| 31 | Material Gems (Gold/XP) | Pickups | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Dual currency & XP increment on pickup |
| 32 | Magnetic Attraction | Pickups | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Radius acceleration within pickupRange |
| 33 | End-of-Wave Vacuum | Pickups | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 & 4 | Global high-speed pull and uncollected bag deposit |
| 34 | Consumable Fruit Drops | Pickups | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Instant 3 HP heal, clamped to Max HP |
| 35 | Loot Crate Drops | Pickups | M2 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Item award trigger, guaranteed from Elites |
| 36 | 4-Slot Shop Generation | Shop | M2 | `tests/unit/shop_economy.test.ts` | Tier 1 | 4-item population with rarity distribution |
| 37 | Wave Price Inflation | Shop | M2 | `tests/unit/shop_economy.test.ts` | Tier 1 & 2 | Base + 1 + floor(Base * 0.10 * Wave) |
| 38 | Escalating Reroll Cost | Shop | M2 | `tests/unit/shop_economy.test.ts` | Tier 1 & 2 | Base(W) + k * Step(W), resets per wave |
| 39 | Item Slot Lock System | Shop | M2 | `tests/unit/shop_economy.test.ts` | Tier 1 & 3 | Frozen slot persistence across rerolls and inflation freeze |
| 40 | Weapon Tier Combining | Shop | M2 | `tests/unit/shop_economy.test.ts` | Tier 1 & 3 | 2 duplicate Tier N weapons merge into Tier N+1 |
| 41 | Legacy Code Archival to `src/legacy/` | Architecture | M1 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | File presence and integrity in `src/legacy/` |
| 42 | Preserving Legacy Route `/legacy` | Architecture | M1 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Route existence and legacy app export |
| 43 | Preserving `src/data/questions.ts` | Data | M1 | `tests/unit/question_buffs.test.ts` | Tier 1 | Question bank exports and schema conformance |
| 44 | Preserving `src/lib/sound.ts` | Audio | M1 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Sound engine instance and synthesis methods |
| 45 | Clean ESLint Config (`.eslintrc.json`) | Tooling | M1 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Non-interactive lint execution |
| 46 | Automated Test Runner Setup | Tooling | M1 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Test runner command returns exit code 0 |
| 47 | Core Brotato Data Types (`brotato.ts`) | Schema | M1 | `tests/unit/combat_math.test.ts` | Tier 1 | Type contract compliance |
| 48 | `TacticalQuestion` Data Model | Schema | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 | Field validations (id, prompt, options/tokens, mnemonic) |
| 49 | Dual Question Types | Questions | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 | multiple_choice and evidence_hunt behavior |
| 50 | Campaign Act Bifurcation | Questions | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 | 'yks' and 'buept' pool filtering |
| 51 | YKS TYT/AYT Categories | Questions | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 | Math, Physics, Chemistry, Biology, Turkish, Social |
| 52 | BUEPT English Categories | Questions | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 | Vocab, Reading, Logic, Grammar categories |
| 53 | Inter-Wave Study Modal | Education | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 | Question presentation during shop phase |
| 54 | 3-Choice Curriculum Buff Reward | Education | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 | Stat boost, materials, or discount choice |
| 55 | Subject-Themed Stat Buffs | Education | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 & 3 | Math -> Dmg, Bio -> Regen, Turkish -> Dodge, etc. |
| 56 | Grace & Consolation Policy | Education | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 & 2 | 0 HP loss on wrong answer + consolation reward |
| 57 | Mystery Chest Arena Spawns | Tactical | M4 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 & 3 | Battlefield chest spawn & collision trigger |
| 58 | Elite Challenge Event | Tactical | M4 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 & 3 | Elite intercept event trigger |
| 59 | Frame-Accurate Tactical Freeze (`dt=0`) | Tactical | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 & 3 | Zero-delta simulation pause without vector corruption |
| 60 | Tactical Combat Rewards | Tactical | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 & 3 | Emergency Heal, Nuke, Frenzy, Global Vacuum |
| 61 | Combat Wrong Answer Grace | Tactical | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 & 2 | 0.5s misfire stagger without instant death |
| 62 | Category Performance & Accuracy Tracker | Telemetry | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 & 2 | Attempt counts, correct %, streaks per category |
| 63 | Shop & Summary HUD Display | Telemetry | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 | Live accuracy pill & 5-axis spider radar data |
| 64 | Mistake Notebook & Review | Telemetry | M4 | `tests/unit/question_buffs.test.ts` | Tier 1 | Failed question logging with mnemonics |
| 65 | Player Potato Avatars (4) | Visuals | M3 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Scholar, BUEPT, Engineer, Tank avatar assets |
| 66 | 5 Distinct Enemy Variant Sprites | Visuals | M3 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Swarmer, Rusher, Tank, Shooter, Elite Boss assets |
| 67 | 7 Distinct Weapon Sprites | Visuals | M3 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Pistol, Shotgun, SMG, Wand, Knife, Sword, Wrench |
| 68 | Projectiles & Visual VFX Sprites | Visuals | M3 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Bullets, Magic Orb, Acid, Slash Arc, Nova Ring |
| 69 | Pickups & Collectible Sprites | Visuals | M3 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Material Crystal, Health Fruit, Mystery Chest |
| 70 | Arena Floor & Barrier Tiles | Visuals | M3 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Dark slate grid floor and hazard wall tiles |
| 71 | UI & Category Stat Icons | Visuals | M3 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | 12 RPG stat badges and category icons |
| 72 | 12 Procedural Sound Synthesizers | Audio | M3 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Synthesizer methods present and callable |
| 73 | Combat Sound Triggers | Audio | M3 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Firing, impacts, hurts, and death audio triggers |
| 74 | Tactical & Educational Audio | Audio | M3 | `tests/e2e/game_loop_tiers.test.ts` | Tier 1 | Freeze whoosh, fanfare, buzzer, nuke sound |
| 75 | Opaque-Box E2E Test Suite (Tiers 1-4) | Quality | M5 | `tests/e2e/game_loop_tiers.test.ts` | Tiers 1-4 | End-to-end multi-wave simulation & validation |
| 76 | Adversarial Hardening (Tier 5) | Quality | M5 | `tests/adversarial/` | Tier 5 | Stress boundaries & numerical limits |

---

## 4-Tier Test Suite Structure

### Tier 1: Feature Coverage (Isolated Feature Units)
Verifies each individual formula and feature in strict isolation:
- Armor reduction hyperbolic response.
- Attack speed cooldown curve.
- Dodge roll calculation.
- Life steal internal cooldown.
- Wave price inflation and reroll scaling.
- Question validation and subject-to-stat buff mapping.

### Tier 2: Boundary & Corner Cases
Verifies extreme inputs, zero/negative states, and caps:
- Negative armor damage amplification.
- Extreme positive armor diminishing returns (minimum 1 HP damage floor).
- Dodge chance exceeding 60% clamped strictly to 60%.
- Negative attack speed clamped at -90% to prevent divide-by-zero or negative cooldowns.
- Zero and negative HP regen preventing unintended healing.
- Empty question deck safe reshuffling.

### Tier 3: Cross-Feature Combinations
Verifies multi-system interplay:
- Weapon fusion inside a full 6-slot inventory (auto-merging without slot overflow).
- Tactical combat pause during active player dash preserving velocity without physics explosion.
- Rapid multi-enemy cleave triggering single life steal ICD roll.
- Subject-themed buffs stacking with shop upgrades under stat caps.
- Slot locking preserving discounted or uninflated item prices across shop rerolls.

### Tier 4: Real-World Scenarios (Full Game Loop)
Verifies multi-wave progression end-to-end:
- Wave 1 to Wave 2 transition: Combat timer -> surviving drop vacuum -> Level-up -> Inter-wave study buff -> Shop purchase -> Wave 2 launch.
- Victory condition: Surviving through Wave 20 and defeating the Wave 20 Boss.
- Game Over condition: Player HP reaching 0 triggering clean game over telemetry without uncaught runtime exceptions.
