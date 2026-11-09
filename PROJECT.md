# Project: Brotato Arena Roguelite Web Game

## Architecture
- **Framework & Runtime**: Next.js 15.1.6 (App Router), React 19, TypeScript 5.7.2, Tailwind CSS 3.4.17.
- **Game Engine**: Pure TypeScript headless game loop & state machine (`src/game/engine/`) decoupled from React rendering, running in an optimized HTML5 2D Canvas context at 60 FPS with requestAnimationFrame.
- **Audio Engine**: Zero-dependency Web Audio procedural sound synthesizer (`src/lib/sound.ts`), dynamically generating all combat, pickup, level-up, and UI audio without external audio network dependencies.
- **Asset Pipeline**: Original AI-generated visual assets in `public/assets/` rendered with crisp outlines and consistent 1:1 sprite scaling.
- **Educational Question Engine**: Curriculum-aligned YKS (TYT/AYT) and BUEPT question bank (`src/data/questions.ts`) providing inter-wave study buffs, frame-accurate tactical combat events (`dt=0`), and 5-axis accuracy telemetry.
- **Legacy Quarantine**: Full preservation of existing mini-game prototype in `src/legacy/`, accessible via dedicated route `/legacy`.

## Code Layout
```
/Users/afurkanmac/Downloads/hackhaton/
├── public/
│   └── assets/                     # Original AI-generated sprites (player, enemies, weapons, VFX)
├── src/
│   ├── app/
│   │   ├── page.tsx                # Primary Brotato Game entry point
│   │   ├── legacy/
│   │   │   └── page.tsx            # Legacy multi-game runner route
│   │   ├── layout.tsx              # Root HTML shell & dark background
│   │   └── globals.css             # Tailwind directives & game effects
│   ├── components/                 # React UI overlays & HUD components
│   │   ├── GameCanvas.tsx          # 60 FPS Canvas viewport
│   │   ├── HUD.tsx                 # Real-time health, XP, wave timer, weapons bar
│   │   ├── ShopModal.tsx           # 4-slot inter-wave shop, reroll, lock, stats sheet
│   │   ├── StudyBuffModal.tsx      # Inter-wave educational question & 3-card reward modal
│   │   ├── TacticalFreezeModal.tsx # In-run bullet-time mystery chest & elite event modal
│   │   ├── TelemetryModal.tsx      # Post-game 5-axis radar chart, accuracy, mistake review
│   │   └── WeaponInventoryBar.tsx  # Weapon slot HUD
│   ├── data/
│   │   └── questions.ts            # Expanded YKS and BUEPT curated question bank
│   ├── game/                       # Pure TypeScript Roguelite Engine
│   │   ├── engine/                 # Core loop, physics, delta-time ticker, input manager
│   │   ├── entities/               # Player, 5 enemy types, projectiles, drops, chests
│   │   ├── weapons/                # Weapon definitions, swing/thrust/bullet logic, targeting
│   │   ├── stats/                  # 17 RPG stats formulas (armor, regen, life steal, luck)
│   │   ├── waves/                  # Wave director, spawn tables, scaling curves, vacuum
│   │   ├── shop/                   # Shop generation, inflation, reroll, tier combining
│   │   └── questions/              # Question controller, freeze manager, telemetry tracker
│   ├── legacy/                     # Quarantined legacy prototype components
│   │   ├── components/             # BattleArena, RoomSimulator, SurvivorsArena, etc.
│   │   └── LegacyApp.tsx           # Legacy app coordinator
│   ├── lib/
│   │   └── sound.ts                # Extended 12-synth procedural Web Audio engine
│   └── types/
│       ├── brotato.ts              # Brotato RPG stats, weapons, enemies, waves, shop types
│       └── game.ts                 # Shared question and telemetry contracts
├── tests/                          # Automated unit and E2E integration test suites
│   ├── e2e/                        # Opaque-box requirement-driven tests (Tiers 1-4)
│   ├── unit/                       # Combat math, stat scaling, shop inflation unit tests
│   └── adversarial/                # Tier 5 white-box stress tests
└── .agents/teamwork/               # Orchestration & verification metadata
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | 360° Omnidirectional Movement | Vector kinematics with normalized diagonal speed | M2 | Survey 1 |
| 2 | Inertia & Damping Physics | Acceleration curve with damping friction factor 0.88 | M2 | Survey 1 |
| 3 | Boundary Collision & Sliding | Clamps player within arena bounding box with sliding | M2 | Survey 1 |
| 4 | Dodge Avoidance Roll (60% Cap) | RNG roll clamped strictly to 60% standard cap | M2 | Survey 1 |
| 5 | Simultaneous Multi-Weapon Array | Up to 6 simultaneous weapons with independent cooldowns | M2 | Survey 1 |
| 6 | Melee Swing Arc Hitbox | Cleaves enemies in a circular sector cone | M2 | Survey 1 |
| 7 | Melee Thrust Stab Hitbox | Linear rectangular extending/retracting hitbox | M2 | Survey 1 |
| 8 | Ranged Ballistics | Projectiles moving with speed, lifetime, and hit tests | M2 | Survey 1 |
| 9 | Attack Speed Cooldown Formula | $T = T_0 \times 100 / (100 + AS)$, capped at 12 hits/s | M2 | Survey 1 |
| 10 | Knockback Physics | Instantaneous impulse vector inversely scaled by mass | M2 | Survey 1 |
| 11 | Pierce Mechanics | Projectile penetrates $N$ enemies before despawning | M2 | Survey 1 |
| 12 | Bounce Mechanics | Ricochets to closest adjacent enemy within radius | M2 | Survey 1 |
| 13 | Auto-Target: Closest Enemy | Primary Brotato auto-aim algorithm | M2 | Survey 1 |
| 14 | Auto-Target: Lowest Health | Target enemy with minimum current HP in range | M2 | Survey 1 |
| 15 | Auto-Target: Highest Threat | Priority: Boss > Charger > Shooter > Rusher > Swarmer | M2 | Survey 1 |
| 16 | Manual Aim Override | Aim angle based on mouse/stick coordinates | M2 | Survey 1 |
| 17 | Armor Damage Reduction | $D_{\text{taken}} = D_{\text{raw}} \times 15 / (15 + \text{Armor})$ | M2 | Survey 1 |
| 18 | HP Regeneration Interval | Periodic 1 HP healing interval $\Delta t = 5 / (1 + (Regen-1)/2.25)$ | M2 | Survey 1 |
| 19 | Life Steal On-Hit (0.10s ICD) | Chance to heal 1 HP with 0.10s internal cooldown (10 HP/s cap) | M2 | Survey 1 |
| 20 | Melee vs Ranged Range Scaling | Ranged scales 100% with Range; Melee scales 50% | M2 | Survey 1 |
| 21 | Engineering Scaling | Boosts deployables without modifying primary weapon stats | M2 | Survey 1 |
| 22 | Luck Multiplier | Multiplies drop chances and higher rarity weights | M2 | Survey 1 |
| 23 | Harvesting Economy | End-of-wave currency bonus + 5% compound growth | M2 | Survey 1 |
| 24 | Basic Swarmer AI | Flocking direct pursuit horde enemy | M2 | Survey 1 |
| 25 | Fast Rusher AI | High speed erratic weaving flanker enemy | M2 | Survey 1 |
| 26 | Tank / Charger AI | Heavy golem with knockback-immune high-speed dash | M2 | Survey 1 |
| 27 | Ranged Shooter AI | Kiting artillery maintaining distance with laser telegraph | M2 | Survey 1 |
| 28 | Wave Elite / Boss AI | Miniboss with radial bullet patterns and guaranteed crate | M2 | Survey 1 |
| 29 | 20-Wave Escalation | Wave duration escalates from 20s to 60s, culminating in 90s boss | M2 | Survey 1 |
| 30 | Enemy Stat Scaling | Linear HP & Damage progression per wave | M2 | Survey 1 |
| 31 | Material Gems (Gold/XP) | Dual currency and character XP drops | M2 | Survey 1 |
| 32 | Magnetic Attraction | Sucks materials within pickup radius towards player | M2 | Survey 1 |
| 33 | End-of-Wave Vacuum | Vacuum acceleration pulling all materials into bag at wave end | M2 | Survey 1 |
| 34 | Consumable Fruit Drops | Restores 3 HP upon pickup; drop chance scaled by Luck | M2 | Survey 1 |
| 35 | Loot Crate Drops | Drops passive item or weapon; guaranteed on Elite kill | M2 | Survey 1 |
| 36 | 4-Slot Shop Generation | Generates 4 items/weapons with wave rarity weights | M2 | Survey 1 |
| 37 | Wave Price Inflation | $\text{Price} = \text{Base} + 1 + \lfloor \text{Base} \times 0.10 \times \text{Wave} \rfloor$ | M2 | Survey 1 |
| 38 | Escalating Reroll Cost | $\text{Base}(W) + k \times \text{Step}(W)$ resets per shop | M2 | Survey 1 |
| 39 | Item Slot Lock System | Freezes shop slots across rerolls and freezes inflation | M2 | Survey 1 |
| 40 | Weapon Tier Combining | Merges 2 identical tier weapons into 1 tier+1 weapon | M2 | Survey 1 |
| 41 | Legacy Code Archival to `src/legacy/` | Quarantines 8 legacy components and page.tsx to src/legacy/ | M1 | Survey Explorer |
| 42 | Preserving Legacy Route `/legacy` | Dedicated route allowing full jury access to previous modes | M1 | Survey Explorer |
| 43 | Preserving `src/data/questions.ts` | Maintains existing question bank and data contracts | M1 | Survey Explorer |
| 44 | Preserving `src/lib/sound.ts` | Maintains procedural sound engine infrastructure | M1 | Survey Explorer |
| 45 | Clean ESLint Config (`.eslintrc.json`) | Resolves interactive prompt to allow automated lint verification | M1 | Survey Explorer |
| 46 | Automated Test Runner Setup | Establishes Vitest test runner in package.json | M1 | Survey Explorer |
| 47 | Core Brotato Data Types (`brotato.ts`) | TypeScript schemas for 17 stats, weapons, enemies, shop | M1 | Survey Explorer |
| 48 | `TacticalQuestion` Data Model | Extended question contract with subject and difficulty | M4 | Survey 2 |
| 49 | Dual Question Types | Supports multiple-choice and evidence-hunt formats | M4 | Survey 2 |
| 50 | Campaign Act Bifurcation | Segregates YKS and BUEPT question pools | M4 | Survey 2 |
| 51 | YKS TYT/AYT Categories | Math, Physics, Chemistry, Biology, Turkish, Social | M4 | Survey 2 |
| 52 | BUEPT English Categories | Vocab, Reading, Logic, Grammar | M4 | Survey 2 |
| 53 | Inter-Wave Study Modal | Pedagogical question modal inside shop phase | M4 | Survey 2 |
| 54 | 3-Choice Curriculum Buff Reward | Player selects Subject Stat Boost, Materials, or Discount | M4 | Survey 2 |
| 55 | Subject-Themed Stat Buffs | Ties curriculum subjects directly to Brotato RPG stats | M4 | Survey 2 |
| 56 | Grace & Consolation Policy | Zero HP penalty on wrong answer + consolation prize | M4 | Survey 2 |
| 57 | Mystery Chest Arena Spawns | Spawns in combat arena offering tactical pause event | M4 | Survey 2 |
| 58 | Elite Challenge Event | Elite encounters trigger high-tier tactical question intercept | M4 | Survey 2 |
| 59 | Frame-Accurate Tactical Freeze (`dt=0`) | Frame-accurate freeze pausing simulation, positions, velocities | M4 | Survey 2 |
| 60 | Tactical Combat Rewards | Emergency 50% Heal, Nuke, Flow State Frenzy, Global Vacuum | M4 | Survey 2 |
| 61 | Combat Wrong Answer Grace | Brief 0.5s weapon misfire stagger; no instant player death | M4 | Survey 2 |
| 62 | Category Performance & Accuracy Tracker | Real-time tracking of attempts, correct count, accuracy % | M4 | Survey 2 |
| 63 | Shop & Summary HUD Display | Active accuracy pill in shop + 5-axis spider radar chart | M4 | Survey 2 |
| 64 | Mistake Notebook & Review | Logs failed questions with Boğaziçi Koç Taktiği mnemonics | M4 | Survey 2 |
| 65 | Player Potato Avatars (4) | Potato Scholar, BUEPT Student, Engineer, Mutant Tank | M3 | Survey 2 |
| 66 | 5 Distinct Enemy Variant Sprites | Swarmer, Rusher, Tank, Ranged Shooter, Elite Boss | M3 | Survey 2 |
| 67 | 7 Distinct Weapon Sprites | Pistol, Shotgun, SMG, Wand, Knife, Sword, Wrench | M3 | Survey 2 |
| 68 | Projectiles & Visual VFX Sprites | Bullets, Magic Orbs, Acid Spit, Slash Arc, Nova Ring | M3 | Survey 2 |
| 69 | Pickups & Collectible Sprites | Material Crystals, Health Fruit, Mystery Chest | M3 | Survey 2 |
| 70 | Arena Floor & Barrier Tiles | Seamless dark slate sci-fi floor and hazard wall tiles | M3 | Survey 2 |
| 71 | UI & Category Stat Icons | 12 RPG stat badges and curriculum category icons | M3 | Survey 2 |
| 72 | 12 Procedural Sound Synthesizers | Extended pure Web Audio synthesis methods in sound.ts | M3 | Survey 2 |
| 73 | Combat Sound Triggers | Audio triggers for firing, impacts, hurts, and deaths | M3 | Survey 2 |
| 74 | Tactical & Educational Audio | Audio triggers for bullet-time whoosh, fanfare, buzzer | M3 | Survey 2 |
| 75 | Opaque-Box E2E Test Suite (Tiers 1-4) | Comprehensive requirement-driven test suite | M5 | E2E Track |
| 76 | Adversarial Hardening (Tier 5) | White-box edge-case and boundary verification | M5 | E2E Track |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Legacy Archival & Clean-Room Foundation | Move legacy code to `src/legacy/`, preserve `/legacy`, add `.eslintrc.json`, add `vitest`, create `src/types/brotato.ts` | none | DONE |
| M2 | Core Arena Combat & Wave Roguelite Engine | 360 movement, 17 RPG stats, 4-6 multi-weapons, 5 enemies, 20 waves, drops/vacuum, 4-slot shop | M1 | DONE |
| M3 | Original Visual Assets & Audio Polish | Generate 26 visual assets via `generate_image`, extend 12-synth `sound.ts`, 60 FPS Canvas rendering, floating damage & particles | M1 | DONE |
| M4 | Educational Question & Buff System | YKS/BUEPT question bank expansion, inter-wave study modal, frame-accurate freeze, 4 tactical superpowers, accuracy telemetry & radar | M2, M3 | DONE |
| M5 | Final Milestone: E2E Verification & Adversarial Hardening | Phase 1: 100% Pass of Tiers 1-4 E2E Tests (`TEST_READY.md`). Phase 2: Adversarial Coverage Hardening (Tier 5). Production build (`npm run build`). | M1, M2, M3, M4 | DONE |

## Interface Contracts

### M1 ↔ M2, M3, M4: Data Types & Schemas (`src/types/brotato.ts`)
```typescript
export interface PlayerRPGStats {
  maxHp: number;
  currentHp: number;
  hpRegen: number;
  lifeSteal: number;
  damagePercent: number;
  meleeDamage: number;
  rangedDamage: number;
  elementalDamage: number;
  attackSpeed: number;
  critChancePercent: number;
  engineering: number;
  range: number;
  armor: number;
  dodgePercent: number;
  speedPercent: number;
  luck: number;
  harvesting: number;
  pickupRange: number;
}

export type WeaponType = 'melee' | 'ranged';
export type WeaponSubtype = 'swing' | 'thrust' | 'projectile' | 'spread';
export type WeaponTier = 1 | 2 | 3 | 4;

export interface WeaponBlueprint {
  id: string;
  name: string;
  type: WeaponType;
  subtype: WeaponSubtype;
  tier: WeaponTier;
  baseDamage: number;
  scalingStat: 'meleeDamage' | 'rangedDamage' | 'engineering' | 'elementalDamage';
  scalingRatio: number;
  baseCooldownMs: number;
  baseRange: number;
  critChance: number;
  critMultiplier: number;
  knockback: number;
  pierce: number;
  bounce: number;
  projectileSpeed?: number;
  pelletCount?: number;
  spreadAngleDeg?: number;
  arcAngleDeg?: number;
  spriteName: string;
}

export type EnemyType = 'swarmer' | 'rusher' | 'tank' | 'ranged' | 'elite';
```

### M2 ↔ M4: Tactical Event & State Pause Contract
```typescript
export interface TacticalFreezeEvent {
  source: 'mystery_chest' | 'elite_defeat' | 'manual_intercept';
  chestPosition?: { x: number; y: number };
  question: TacticalQuestion;
}

export interface TacticalRewardSelection {
  type: 'emergency_heal' | 'orbital_nuke' | 'flow_state_frenzy' | 'global_vacuum';
  healPercent?: number; // 50%
  nukeDamage?: number;  // 180 dmg
  frenzyDurationSec?: number; // 6s
}

// Global Roguelite State Machine hook:
export interface RogueliteGameState {
  wave: number;
  waveTimer: number;
  isPaused: boolean;
  bulletTimeActive: boolean;
  player: PlayerEntity;
  weapons: ActiveWeaponInstance[];
  enemies: EnemyEntity[];
  projectiles: ProjectileEntity[];
  pickups: PickupEntity[];
  materials: number;
  xp: number;
  studySession: StudySessionTracker;
}
```

### M3 ↔ M2, M4: Audio & Visual Asset Integration Contract
- `public/assets/*.png`: Sprites blitted centered via `ctx.drawImage(img, x - w/2, y - h/2, w, h)`.
- `src/lib/sound.ts`:
  * `soundEngine.playPistolShot()`
  * `soundEngine.playShotgunBlast()`
  * `soundEngine.playSmgShot()`
  * `soundEngine.playMeleeSwing()`
  * `soundEngine.playEnemyHurt()`
  * `soundEngine.playEnemyDeath()`
  * `soundEngine.playPlayerHurt()`
  * `soundEngine.playPickupMaterial(streak)`
  * `soundEngine.playTacticalFreeze()`
  * `soundEngine.playQuestionCorrect()`
  * `soundEngine.playQuestionWrong()`
  * `soundEngine.playNukeDetonation()`


---

# Overhaul: High-Resolution Visuals, Pacing/Power Rebalance & In-Round Question Charges

## Overhaul Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 77 | True 32-bit RGBA Digital/Vector Asset Overhaul | 26 sprites in 512x512 RGBA with native transparency, mode: 'none' chroma-key, zero CPU clipping holes or noise | O1 | Survey 2.1 |
| 78 | Player Character Prominence & Scaling | Visual multiplier 3.6 = ~100.8px, AssetManager avatar 96x96, ambient drop shadow, hero energy aura, aim guide chevron | O1 | Survey 2.1 |
| 79 | Weapon Orbit & Visual Scaling | Orbit radius 56px, weapon sprite scale 38x38px, tier-colored energy trails | O1 | Survey 2.1 |
| 80 | Modern UI & HUD Visual Revamp | Elimination of emojis, modern cyberpunk typography, segmented health bar, high-contrast badges | O1 | Survey 2.1 |
| 81 | Standalone WeaponInventoryBar.tsx | 6-slot visual weapon bar, tier rarity borders, hotkey labels, smooth cooldown sweeps | O1 | Survey 2.1 |
| 82 | Boosted Player Movement Kinematics | BASE_PLAYER_SPEED = 360 px/s, PLAYER_ACCELERATION = 3200 px/s², dash 540 px/s, agile steering | O2 | Survey 2.2 |
| 83 | Projectile Velocity Boost | Pistol 800, Shotgun 700, SMG 850, Wand 650, Enemy 240, Nova 190 px/s | O2 | Survey 2.2 |
| 84 | Weapon Cadence & DPS Rebalance | All 7 weapons aligned to 23.8-28.2 Tier 1 base DPS; Shotgun 850ms/5dmg, Wand 580ms/10dmg, Pistol 650ms/14dmg, Knife 340ms/8dmg, Sword 580ms/15dmg, Wrench 500ms/12dmg | O2 | Survey 2.2 |
| 85 | Enemy Health & Speed Progression Rebalance | Swarmer 4.5 HP +2.5/wave, Rusher 3.5 HP @ 280 px/s, Tank 26 HP @ 400 px/s charge, Ranged 8 HP, Elite 400 HP | O2 | Survey 2.2 |
| 86 | Streamlined Wave Cadence & Spawn Dynamics | 14.5 minute run duration curve, base spawn rate R0 = 2.0, max enemies 85 | O2 | Survey 2.2 |
| 87 | In-Round Question Charge State & HUD Meter | Capacity 2; +1 at wave start, +1 per 30 kills, +1 on Elite defeat; HUD battery pips & kill progress | O3 | Survey 2.3 |
| 88 | In-Round Question Trigger Mechanism | [Q] keybind in InputManager + HUD clickable meter trigger | O3 | Survey 2.3 |
| 89 | Frame-Accurate Combat Freeze & Desync Prevention | dt=0 zero-drift kinematics, projectiles, enemy AI, wave timer, timestamp refresh, 1.5s post-unfreeze shield | O3 | Survey 2.3 |
| 90 | In-Round Educational Question Intercept | Curriculum-aligned question modal with countdown, evidence hunt, and grace policy | O3 | Survey 2.3 |
| 91 | 3-Card Tactical Item Choice Reward | Tier-appropriate weapon with auto-fusing if inventory is full, curriculum stat booster, or superpower/chest materials | O3 | Survey 2.3 |
| 92 | Increased Overall Question Frequency | Higher question availability via in-round charges, wave midpoint checks, and crate spawns | O3 | Survey 2.3 |
| 93 | Automated Mid-Wave Charge & Reward Unit Tests | tests/unit/midwave_charge_and_rewards.test.ts | O4 | Survey 2.3 |
| 94 | Automated Speed & Power Rebalance Unit Tests | tests/unit/speed_and_power_rebalance.test.ts | O4 | Survey 2.3 |
| 95 | Full Test Suite, TypeScript & Production Build Verification | Zero TS/lint errors, clean npm run build, forensic audit CLEAN | O4 | Survey 2.3 |

## Overhaul Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| O1 | Visual Asset Overhaul & UI Polish | High-res 32-bit RGBA digital/vector sprites, enlarged player sprite, standalone WeaponInventoryBar.tsx, emoji-free modern HUD and modals | none | DONE |
| O2 | Game Speed, Movement & Power Rebalance | 360 px/s player speed, 3200 px/s² accel, boosted projectile speeds, weapon DPS balance, enemy HP/speed curves, 14.5m wave curve, test fixtures sync | none | PLANNED |
| O3 | Question Frequency & Mid-Wave Question Charges | Question charges capacity 2, [Q] keybind/HUD trigger, dt=0 freeze/desync prevention, 3-card tactical item reward with inventory auto-fuse | O1, O2 | PLANNED |
| O4 | Automated Verification Suite & Build Verification | Automated tests in tests/unit/, full test suite pass (377+ tests), clean Next.js build, forensic integrity audit | O1, O2, O3 | PLANNED |
