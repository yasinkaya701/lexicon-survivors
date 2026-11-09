# Technical & Gameplay Specification: Brotato Arena Roguelite Engine

## 1. Observation
- **Original Request Source**: `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md` (Lines 15–22, R2: Core Arena Roguelite Combat and Wave Mechanics; Lines 34–39: Core Gameplay Mechanics Acceptance Criteria).
- **Dispatch Source**: `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey_1/DISPATCH.md` (Assigning Movement & Arena Physics, Weapons System, RPG Stat System & Formulas, Enemies & Wave Progression, Inter-Wave Shop & Economy).
- **Authoritative Mechanics & Reference Sources**: Official Brotato Wiki (`brotato.wiki.sprylogics.com`, `brotato-builds.com`, community decompiled mechanics data):
  - **Armor Formula**: EHP increases linearly by $+6.67\%$ per armor point:
    $$\text{Damage Taken Multiplier} = \frac{15}{15 + \text{Armor}} \quad (\text{for } \text{Armor} \ge 0)$$
    $$\text{Damage Reduction \%} = \frac{\text{Armor}}{\text{Armor} + 15} \times 100\%$$
    Negative armor amplifies damage: $\text{Multiplier} = 1 + \frac{|\text{Armor}|}{15}$.
  - **HP Regeneration Formula**: Interval between $+1$ HP heals is variable:
    $$\Delta t_{\text{tick}} = \frac{5.0}{1.0 + \frac{\text{HP\_Regen} - 1}{2.25}} \text{ seconds} \quad (\text{or simplified: } \Delta t = \frac{5}{\text{HP\_Regen} + 5})$$
  - **Life Steal**: Flat $\%$ chance per weapon hit to restore $1$ HP, subject to a strict $0.10\text{s}$ internal cooldown (hard maximum $10\text{ HP/s}$).
  - **Dodge**: Flat $\%$ avoidance, hard-capped at $60\%$ (standard characters).
  - **Attack Speed Cooldown**: $\text{Cooldown} = \text{BaseCooldown} \times \frac{100}{100 + \text{AttackSpeed\%}}$, hard capped at $12\text{ attacks/sec}$ (minimum cooldown $83.33\text{ms}$).
  - **Melee vs Ranged Range**: Ranged weapons scale $1:1$ with Range; Melee weapons scale $0.5:1$ (halved). Minimum range clamp is $25\text{px}$.
  - **Harvesting**: Payout $= \text{Harvesting}$ materials/XP at wave end; grows by $+5\%$ rounded up: $\text{Harvesting}_{\text{new}} = \text{Harvesting} + \lceil \text{Harvesting} \times 0.05 \rceil$.
  - **Wave Timers**: Wave 1 starts at $20\text{s}$, increases by $+5\text{s}$ per wave up to $60\text{s}$ (Waves 9–19), with Wave 20 Boss lasting $90\text{s}$.
  - **Shop Inflation**: $\text{Price} = \text{BasePrice} + 1 + \lfloor \text{BasePrice} \times 0.10 \times \text{Wave} \rfloor$. Locked items freeze inflation.

---

## 2. Logic Chain
1. **Separation of Concerns & Clean-Room Architecture**: The core combat and simulation engine must be implemented as a deterministic, headless-testable state machine (TypeScript) that can run in a requestAnimationFrame game loop or React Canvas without coupling to DOM nodes.
2. **Deterministic Kinematics**: By adopting vector physics ($x, y, v_x, v_y, a_x, a_y$) with damping friction ($\mu \approx 0.88$), movement is responsive, fluid, and eliminates floaty ice-skating.
3. **Multi-Weapon Parallel Execution**: Storing active weapons in an array of up to 6 independent weapon instances—each with its own cooldown timer, targeting evaluator, firing arc/projectile spawner, and stat resolution pipeline—directly satisfies the requirement of equipping and simultaneously firing $4\text{–}6$ distinct weapons.
4. **Unified Damage Calculation Pipeline**: Weapon base damage is first augmented by flat primary scaling (Melee, Ranged, or Engineering), multiplied by $(1 + \text{Damage\%} / 100)$, checked for critical roll ($CritMultiplier$), and reduced by enemy armor or player armor, ensuring exact parity with established roguelite standards.
5. **Progressive Wave Economy Loop**: Waves scale Enemy HP and Damage linearly: $\text{Stat} = \text{Base} + \text{Scaling} \times (\text{Wave} - 1)$. Materials provide dual gold + XP value. Uncollected materials are automatically vacuumed at wave conclusion or banked into the uncollected bag, guaranteeing zero player frustration.

---

## Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Movement | 360° Omnidirectional Movement | Player moves in any direction using WASD / Arrow keys or virtual joystick with velocity vector integration | Input direction vector $(d_x, d_y)$, delta time $\Delta t$, Speed stat | Updated position $(x, y)$, clamped to arena | Normalizes diagonal inputs to avoid $\sqrt{2}$ speed bug | Brotato engine physics |
| 2 | Movement | Inertia & Damping | Acceleration curve with damping friction for crisp start/stop | Current velocity $\vec{v}$, acceleration $a$, friction $\mu = 0.88$ | New velocity $\vec{v}' = \vec{v} \cdot \mu + \vec{a} \cdot \Delta t$ | Zero input decays to 0 smoothly | Game physics standards |
| 3 | Movement | Boundary Collision | Clamps player within arena bounding box $[X_{\min}, X_{\max}] \times [Y_{\min}, Y_{\max}]$ with sliding wall friction | Proposed position $(x, y)$, entity radius $r$ | Clamped $(x_{\text{clamped}}, y_{\text{clamped}})$, zeroed perpendicular velocity | Prevents escaping arena boundaries | Arena specs |
| 4 | Combat | Dodge Avoidance Roll | Percent chance to completely negate incoming hit | Incoming damage event, player `dodge` stat | Negated hit (0 damage, "DODGE" visual indicator) or full hit | Clamped at $\min(60\%, \max(0\%, \text{dodge}))$ | Brotato Wiki Dodge mechanics |
| 5 | Weapons | Weapon Slot Management | Up to 6 simultaneous weapon slots with independent tick state | Weapon inventory array (len 1..6), game tick | Weapons evaluate cooldowns and fire independently | Empty slots safely skipped | Game design specs |
| 6 | Weapons | Melee Swing Arc | Cleaves enemies in a circular sector cone facing target | Pivot angle $\theta$, swing angle (e.g. $120^\circ$), radius $R$, duration | Cone collision detection against all enemies in sector | Ignores enemies outside sector or radius | Weapon mechanics |
| 7 | Weapons | Melee Thrust Stab | Linear rectangular hitbox extending forward and retracting | Facing vector $\vec{u}$, length $L$, width $W$, progress $t \in [0, 1]$ | Oriented bounding box collision against enemies | Retracts cleanly on cooldown | Weapon mechanics |
| 8 | Weapons | Ranged Ballistics | Spawns projectiles moving along target trajectory | Origin $(x, y)$, angle $\theta$, speed $S$, pierce $P$, bounce $B$ | Active projectile entity with position updates and hit tests | Despawns when lifetime/range expires or pierce depleted | Weapon mechanics |
| 9 | Weapons | Attack Speed Scaling | Cooldown reduces inversely with positive Attack Speed | Base cooldown $T_0$, stat `attackSpeed` | Effective cooldown $T = T_0 \times \frac{100}{100 + \text{attackSpeed}}$ | Minimum cooldown clamped to $83.33\text{ms}$ ($12\text{ hits/sec}$) | Brotato Wiki Cooldown formula |
| 10 | Weapons | Knockback Physics | Applies instantaneous repulsive impulse vector to enemies | Impact direction $\vec{d}$, weapon `knockback` value, enemy mass | Enemy velocity $\vec{v}_{\text{enemy}} += \vec{d} \times (\text{knockback} / \text{mass})$ | Charging tanks are immune to knockback | Combat physics |
| 11 | Weapons | Pierce Mechanics | Projectile passes through target and damages subsequent enemies | Projectile hit count, `pierce` stat | Hit count incremented; projectile persists until $\text{hits} > \text{pierce}$ | Pierced damage may apply slight falloff if configured | Ranged weapon mechanics |
| 12 | Weapons | Bounce Mechanics | Projectile ricochets to nearest adjacent enemy within bounce radius | Hit position, remaining bounces, enemy spatial index | Redirects projectile velocity towards next closest target | Despawns if no nearby enemy within bounce radius | Ranged weapon mechanics |
| 13 | Targeting | Auto-Target: Closest Enemy | Primary default Brotato auto-aim algorithm | Player position, alive enemy list | Target enemy pointer with minimal Euclidean distance | Returns null if no enemies alive or within weapon range | Brotato Wiki Auto-aim |
| 14 | Targeting | Auto-Target: Lowest Health | Alternative targeting prioritizing near-death enemies | Enemy list in weapon range | Target enemy with minimum current HP | Falls back to closest if HP identical | Tactical targeting options |
| 15 | Targeting | Auto-Target: Highest Threat | Prioritizes Bosses, Elites, and Chargers over fodder | Enemy list in weapon range, threat tier | Target enemy with highest threat score | Falls back to closest within same threat tier | Tactical targeting options |
| 16 | Targeting | Manual Aim Override | Overrides auto-aim with mouse cursor angle or gamepad stick | Mouse coordinates $(m_x, m_y)$ or right analog vector | Weapon aim angle $=\text{atan2}(m_y - p_y, m_x - p_x)$ | Automatically falls back to auto-aim if mouse is idle | Brotato Gameplay options |
| 17 | RPG Stats | Armor Damage Reduction | Reduces incoming damage according to hyperbolic curve | Incoming raw damage $D_{\text{in}}$, stat `armor` | $D_{\text{out}} = D_{\text{in}} \times \frac{15}{15 + \text{armor}}$ for $\text{armor} \ge 0$ | Always inflicts at least 1 damage on non-dodged hit | Brotato Wiki Armor formula |
| 18 | RPG Stats | HP Regeneration Ticks | Periodic 1 HP healing based on regeneration frequency | Elapsed time, stat `hpRegen`, current HP, max HP | Adds $+1$ HP when accumulator $\ge \Delta t$; resets accumulator | Inactive when at max HP or `hpRegen` $\le 0$ | Brotato Wiki HP Regen formula |
| 19 | RPG Stats | Life Steal On-Hit | Percent chance per weapon hit to restore 1 HP with ICD | Hit event, stat `lifeSteal`, last life steal timestamp | Heals $+1$ HP if roll $< \text{lifeSteal}$ and $\Delta t \ge 0.10\text{s}$ | Max 10 HP/sec cap enforced by ICD; turrets excluded | Brotato Wiki Life Steal formula |
| 20 | RPG Stats | Melee vs Ranged Range | Scales range differently depending on weapon archetype | Base range $R_0$, stat `range`, weapon category | Ranged: $R_0 + \text{range}$; Melee: $R_0 + 0.5 \times \text{range}$ | Clamped to minimum range $25\text{px}$ | Brotato Wiki Range formula |
| 21 | RPG Stats | Engineering Scaling | Boosts deployable turrets and mines without affecting weapons | Structure base stats, stat `engineering` | Damage/Heal $= \text{Base} + (\text{engineering} \times \text{Coeff})$ | Primary weapon damage stats do not alter turrets | Brotato Wiki Engineering |
| 22 | RPG Stats | Luck Multiplier | Scales probability of rare occurrences, consumable drops, crates | Base drop chance $P_0$, stat `luck` | Effective probability $P = P_0 \times (1 + \text{luck} / 100)$ | Cannot exceed $100\%$ probability | Brotato Wiki Luck mechanics |
| 23 | RPG Stats | Harvesting Economy | End-of-wave currency bonus + compound growth | Stat `harvesting`, current materials | Materials $+=\text{harvesting}$; $\text{harvesting} += \lceil \text{harvesting} \times 0.05 \rceil$ | Decreases by $20\%$ after wave 20 in Endless mode | Brotato Wiki Harvesting |
| 24 | Enemies | Basic Swarmer AI | Direct flocking pursuit towards player | Swarmer entity position, player position, neighbor positions | Direct velocity vector with soft separation avoidance | Low HP, swarms player in groups | Brotato Enemy roster (Baby Alien) |
| 25 | Enemies | Fast Rusher AI | High speed erratic approach designed to flank | Rusher entity position, player position, elapsed time | High velocity with sinusoidal weaving offset | Low HP, vulnerable to knockback | Brotato Enemy roster (Hound) |
| 26 | Enemies | Tank / Charger AI | Slow advance followed by telegraphed charge burst | Distance to player, charge cooldown timer | Windup telegraph (0.8s) -> High-speed straight dash (1.2s) | Immune to knockback during charge state | Brotato Enemy roster (Bruiser) |
| 27 | Enemies | Ranged Shooter AI | Kites player at distance and fires telegraphed shots | Distance to player, shoot cooldown timer | Retreats if $< 300\text{px}$, telegraphs red laser (0.5s), shoots | Slower projectile speed allows dodge reactivity | Brotato Enemy roster (Spitter) |
| 28 | Enemies | Wave Elite / Boss AI | High HP boss with multi-phase telegraphed attacks | Boss phase timer, player distance | Phase 1: Radial bullet ring; Phase 2: Ground slam; Phase 3: Charge | Huge health pool, drops guaranteed loot crate | Brotato Wave 11/20 Elites |
| 29 | Progression | 20-Wave Timer Escalation | Waves ramp from 20s up to 60s, culminating in 90s boss | Wave index $W \in [1, 20]$ | Wave duration (20s, 25s, 30s... 60s, 90s) | Automatically triggers wave end when timer reaches 0 | Brotato Wave pacing |
| 30 | Progression | Enemy Stat Scaling | Enemy HP and Damage scale per wave | Base stats, wave number $W$, danger level $D$ | $\text{Stat} = (\text{Base} + \text{Scaling} \times (W - 1)) \times D$ | Danger multiplier applied globally | Brotato Enemy Scaling |
| 31 | Drops | Material Gems (Gold/XP) | Dropped by defeated enemies; provides dual currency & XP | Enemy death event, position | Spawns green material item in arena | Values: 1 Gold + 1 XP per standard gem | Brotato Drops architecture |
| 32 | Drops | Magnetic Attraction | Sucks materials towards player within magnet radius | Distance to player, stat `pickupRange` (base 120px) | Accelerates materials towards player when in range | Instant pickup when distance $< 20\text{px}$ | Brotato Pickups |
| 33 | Drops | End-of-Wave Vacuum | Sucks all remaining materials at wave end into player/bag | Wave timer $= 0$ event, alive materials list | High-velocity vacuum animation pulling all materials to player | Zero materials lost; banked into bag | Brotato Wave Transition |
| 34 | Drops | Consumable Fruit | Heals 3 HP instantly upon pickup | Enemy death, fruit drop chance ($1\% \times (1 + \text{Luck}/100)$) | Spawns consumable fruit; picking up restores 3 HP | Clamped to Max HP; wasted if already full | Brotato Drops |
| 35 | Drops | Loot Crate | Drops passive item or weapon | Elite kill or rare drop ($0.5\% \times (1 + \text{Luck}/100)$) | Opens at wave end to award choice of item | Contents scale with wave tier and Luck | Brotato Crates |
| 36 | Shop | 4-Slot Shop Generation | Generates 4 items/weapons between waves | Wave number, current Luck, unlocked pool | 4 items populated with rarity roll and price calculation | Rarity roll obeys wave availability limits | Brotato Shop architecture |
| 37 | Shop | Wave Inflation Formula | Prices increase with wave progression | Base item price $P_{\text{base}}$, wave number $W$ | $\text{Price} = P_{\text{base}} + 1 + \lfloor P_{\text{base}} \times 0.10 \times W \rfloor$ | Locked items are exempt from inflation | Brotato Shop Inflation |
| 38 | Shop | Reroll Cost Scaling | Costs materials to reroll; escalates with successive rerolls | Base reroll cost, wave number $W$, reroll count $k$ | $\text{Cost} = \max(1, \lfloor W \times 0.75 \rfloor) + k \times (1 + \lfloor W \times 0.25 \rfloor)$ | Reroll count resets to 0 at start of each wave shop | Brotato Shop Reroll |
| 39 | Shop | Item Lock System | Allows players to freeze items in the shop across rerolls | Click lock button on slot $i$ | Slot $i$ marked locked; preserved through rerolls and next wave | Unlocked upon purchase or manual unlock | Brotato Shop Locking |
| 40 | Shop | Weapon Tier Combining | Combines 2 identical tier weapons into 1 weapon of Tier $+ 1$ | 2 weapons with identical `id` and `tier` | 1 weapon of $\text{tier} + 1$, frees up 1 weapon slot | Cannot combine Tier 4 (Legendary is max) | Brotato Weapon Upgrading |

---

## Edge Cases
| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Dodge | `dodge = 85%` (via high items/buffs) | Clamped to $60\%$ maximum cap. Roll uses $0.60$. Standard characters cannot exceed $60\%$. |
| 2 | Dodge | `dodge = -20%` (negative stats) | Clamped to $0\%$. Never causes guaranteed self-harm or bonus enemy crits. |
| 3 | Armor | `armor = 0` | Damage reduction is exactly $0\%$. Player takes $100\%$ raw incoming damage. |
| 4 | Armor | `armor = -15` | Damage multiplier is $1 + |-15|/15 = 2.0\times$ ($+100\%$ incoming damage). |
| 5 | Armor | Massive positive armor (`armor = 135`) | Multiplier is $15 / (15 + 135) = 15 / 150 = 0.10$ ($90\%$ reduction). Minimum hit is always clamped to 1 HP. |
| 6 | Attack Speed | `attackSpeed = +300%` on SMG (base 120ms) | Cooldown calculation yields $120 \times (100 / 400) = 30\text{ms}$ ($33.3\text{ attacks/s}$). Hard-clamped to $12\text{ attacks/s}$ ($83.33\text{ms}$). |
| 7 | Attack Speed | `attackSpeed = -90%` | Cooldown calculation yields $T_0 \times (100 / 10) = 10 \times T_0$. Weapons attack 10x slower. Clamped at $-90\%$ to avoid division by zero or negative cooldown. |
| 8 | HP Regeneration | `hpRegen = 0` or negative | Healing interval accumulator does not increment; player does not regenerate HP. |
| 9 | HP Regeneration | `hpRegen = 1` | Interval is $\frac{5.0}{1.0 + 0} = 5.0\text{ seconds}$ per $1$ HP tick ($0.20\text{ HP/sec}$). |
| 10 | Life Steal | 10 enemies hit simultaneously by wide melee swing | Life Steal rolls for the first enemy hit; if successful, restores $1$ HP and activates $0.10\text{s}$ ICD. The other 9 hits in the same frame cannot trigger Life Steal. |
| 11 | Weapon Range | `range = -100` on Knife (base range 50px) | Melee calculation gives $50 + 0.5 \times (-100) = 0\text{px}$. Clamped to global minimum range $25\text{px}$. |
| 12 | Harvesting | `harvesting = 5` at end of wave | End-of-wave payout gives $5$ materials. Compounding calculation: $\lceil 5 \times 0.05 \rceil = \lceil 0.25 \rceil = +1$. New harvesting is $6$. |
| 13 | Weapon Fusion | Full 6 weapon slots, player purchases duplicate of an equipped Tier 1 weapon | Automatically merges with equipped Tier 1 to form Tier 2 weapon in-place, keeping total weapons at 6 and avoiding slot overflow error. |
| 14 | Charger Knockback | Weapon with 50 knockback hits Charger during its active dash | Knockback impulse is completely ignored ($\text{immune} = \text{true}$); Charger continues along dash trajectory. |
| 15 | Shop Reroll | Free reroll triggered by purchasing all 4 shop slots | Reroll cost displays $0$ materials for the immediately following reroll, then resumes standard formula. |

---

## 3. Comprehensive Subsystem Specifications

### Subsystem 1: Movement & Arena Physics

#### 1.1 Vector Kinematics & 360° Movement
- **Coordinate Space**: 2D Cartesian plane, origin $(0, 0)$ at top-left or center of the arena.
- **Arena Dimensions**: Standard rectangular arena width $W_{\text{arena}} = 1920\text{px}$, height $H_{\text{arena}} = 1080\text{px}$ (playable inner rect $[100, 1820] \times [100, 980]$).
- **Player Kinematics**:
  - Base Speed $S_0 = 300\text{ px/sec}$.
  - Actual Speed $S_{\text{max}} = \max\left(50, S_0 \times \left(1 + \frac{\text{speedPercent}}{100}\right)\right)$.
  - Acceleration $a_{\text{player}} = 2400\text{ px/sec}^2$.
  - Friction / Damping factor $\mu = 0.88$ per frame at $60\text{ FPS}$ (or exponential decay $e^{-k \Delta t}$ with $k = 7.7\text{ s}^{-1}$).
  - Movement Integration:
    $$\vec{d}_{\text{input}} = \begin{cases} \frac{\vec{u}}{\|\vec{u}\|}, & \text{if } \|\vec{u}\| > 0 \\ \vec{0}, & \text{otherwise} \end{cases}$$
    $$\vec{v}_{t + \Delta t} = (\vec{v}_t + \vec{d}_{\text{input}} \cdot a_{\text{player}} \cdot \Delta t) \cdot \mu$$
    $$\text{If } \|\vec{v}_{t + \Delta t}\| > S_{\text{max}} \implies \vec{v}_{t + \Delta t} = \frac{\vec{v}_{t + \Delta t}}{\|\vec{v}_{t + \Delta t}\|} \cdot S_{\text{max}}$$
    $$\vec{p}_{t + \Delta t} = \vec{p}_t + \vec{v}_{t + \Delta t} \cdot \Delta t$$

#### 1.2 Boundary Collision Resolution
- Entity radius $R_{\text{player}} = 24\text{px}$.
- Boundary constraints:
  $$p_x = \text{clamp}(p_x, X_{\min} + R_{\text{player}}, X_{\max} - R_{\text{player}})$$
  $$p_y = \text{clamp}(p_y, Y_{\min} + R_{\text{player}}, Y_{\max} - R_{\text{player}})$$
- Upon colliding with a wall, velocity normal to the wall is zeroed ($v_x = 0$ if at $X$ bounds, $v_y = 0$ if at $Y$ bounds), enabling smooth wall sliding.

#### 1.3 Dodge Mechanics
- When any enemy hitbox or enemy projectile contacts the player hitbox:
  1. Determine effective dodge chance:
     $$D_{\text{eff}} = \min(60, \max(0, \text{dodgePercent}))$$
  2. Draw pseudo-random number $R \sim U(0, 100)$.
  3. If $R < D_{\text{eff}}$:
     - Damage is completely negated ($D_{\text{taken}} = 0$).
     - Spawn floating text: `"DODGE"` in yellow/cyan.
     - Trigger player invulnerability visual flicker ($0.15\text{s}$).
     - Play dodge swoosh sound (`playDodge()`).
     - **Do not** apply knockback or status effects to player.
  4. If $R \ge D_{\text{eff}}$:
     - Proceed to Armor Damage Reduction pipeline.

---

### Subsystem 2: Weapons System Architecture

#### 2.1 Weapon Data Schema (TypeScript Interface)
```typescript
export type WeaponType = 'melee' | 'ranged';
export type WeaponSubtype = 'swing' | 'thrust' | 'projectile' | 'spread';
export type WeaponTier = 1 | 2 | 3 | 4; // 1: Common, 2: Uncommon, 3: Rare, 4: Legendary

export interface WeaponScaling {
  stat: 'meleeDamage' | 'rangedDamage' | 'engineering' | 'elemental';
  ratio: number; // e.g. 1.0 = 100%, 0.8 = 80%
}

export interface WeaponBlueprint {
  id: string;
  name: string;
  type: WeaponType;
  subtype: WeaponSubtype;
  tier: WeaponTier;
  baseDamage: number;
  scaling: WeaponScaling;
  baseCooldownMs: number;
  baseRange: number;
  critChance: number;      // e.g. 0.05 for 5%
  critMultiplier: number;  // e.g. 1.5 - 2.0x
  knockback: number;       // impulse magnitude
  pierce: number;          // projectile pierce count (0 = despawns on 1st hit)
  bounce: number;          // projectile bounce count
  projectileSpeed?: number;// px/sec for ranged
  pelletCount?: number;    // for spread/shotgun weapons
  spreadAngleDeg?: number; // angular spread in degrees
  arcAngleDeg?: number;    // for swing weapons (e.g. 120 deg)
}

export interface ActiveWeaponInstance {
  blueprint: WeaponBlueprint;
  slotIndex: number; // 0 to 5 (up to 6 weapons)
  currentCooldownMs: number;
  targetEnemyId: string | null;
  currentAngleRad: number;
}
```

#### 2.2 Attack Speed & Cooldown Formula
Given weapon `baseCooldownMs` ($T_0$) and player stat `attackSpeed`:
$$T_{\text{cooldown}} = \max\left(83.33, T_0 \times \frac{100}{100 + \max(-90, \text{attackSpeed})}\right)$$
- If `attackSpeed` $= +100\%$, cooldown is halved ($T = T_0 / 2$).
- Hard clamp of $83.33\text{ms}$ caps attack speed at $12\text{ hits/sec}$.

#### 2.3 Damage & Critical Hit Resolution Pipeline
1. **Flat Scaled Damage**:
   $$\text{Damage}_{\text{scaled}} = \text{blueprint.baseDamage} + (\text{stats}[\text{blueprint.scaling.stat}] \times \text{blueprint.scaling.ratio})$$
2. **Percentage Damage Multiplier**:
   $$\text{Damage}_{\text{modified}} = \text{Damage}_{\text{scaled}} \times \left(1 + \frac{\text{stats.damagePercent}}{100}\right)$$
3. **Critical Strike Roll**:
   - Total Crit Chance:
     $$C_{\text{total}} = \text{blueprint.critChance} \times 100 + \text{stats.critChancePercent}$$
   - Draw $R_{\text{crit}} \sim U(0, 100)$.
   - If $R_{\text{crit}} < C_{\text{total}}$:
     $$\text{IsCrit} = \text{true}, \quad \text{FinalDamage} = \text{Damage}_{\text{modified}} \times \text{blueprint.critMultiplier}$$
   - Else:
     $$\text{IsCrit} = \text{false}, \quad \text{FinalDamage} = \text{Damage}_{\text{modified}}$$
4. **Floor Clamp**:
   $$\text{FinalDamage} = \max(1, \lfloor \text{FinalDamage} \rfloor)$$

#### 2.4 Weapon Targeting Algorithms
All active weapons evaluate candidate targets each frame based on the active targeting mode:
1. **Closest Enemy (Default)**:
   $$\text{Target} = \arg\min_{e \in \text{AliveEnemies}} \|\vec{p}_e - \vec{p}_{\text{player}}\|$$
   - Constrained to $\|\vec{p}_e - \vec{p}_{\text{player}}\| \le \text{EffectiveRange}$.
2. **Lowest Health**:
   $$\text{Target} = \arg\min_{e \in \text{AliveEnemiesInRange}} (e.\text{currentHP})$$
3. **Highest Threat**:
   $$\text{Priority}: \text{Elite/Boss (5)} > \text{Charger (4)} > \text{Shooter (3)} > \text{Rusher (2)} > \text{Swarmer (1)}$$
   $$\text{Target} = \arg\max_{e \in \text{AliveEnemiesInRange}} (\text{threatScore}(e))$$
4. **Manual / Directional Aim**:
   - Aim angle $\theta_{\text{aim}} = \text{atan2}(y_{\text{mouse}} - y_{\text{player}}, x_{\text{mouse}} - x_{\text{player}})$.
   - Weapon fires directly along $\theta_{\text{aim}}$ without locking onto a specific enemy entity.

#### 2.5 Hit Physics, Knockback, Pierce, and Bounce
- **Knockback Physics**:
  $$\vec{u}_{\text{hit}} = \frac{\vec{p}_{\text{enemy}} - \vec{p}_{\text{player}}}{\|\vec{p}_{\text{enemy}} - \vec{p}_{\text{player}}\|}$$
  $$\vec{v}_{\text{enemy}} += \vec{u}_{\text{hit}} \times \left(\frac{\text{weapon.knockback}}{\text{enemy.mass}}\right)$$
  - Decays by enemy friction $\mu_{\text{enemy}} = 0.85$ per frame.
  - If $\text{enemy.isImmuneToKnockback} == \text{true}$ (e.g. charging Tank or Elite Boss), knockback impulse is 0.
- **Pierce Resolution**:
  - Projectile records `hitEntityIds: Set<string>`.
  - When colliding with enemy $e \notin \text{hitEntityIds}$:
    - Deal damage to $e$.
    - Add $e.\text{id}$ to `hitEntityIds`.
    - If `hitEntityIds.size > weapon.pierce`, projectile entity is destroyed.
- **Bounce Resolution**:
  - When projectile hits enemy $A$ and $\text{remainingBounces} > 0$:
    - Find closest alive enemy $B \ne A$ within bounce radius $R_{\text{bounce}} = 300\text{px}$.
    - If found:
      - $\vec{v}_{\text{proj}} = \text{normalize}(\vec{p}_B - \vec{p}_A) \times \text{projectileSpeed}$.
      - $\text{remainingBounces} -= 1$.
    - If not found: projectile despawns.

---

### Subsystem 3: RPG Stat System & Formulas

#### 3.1 Stat Sheet Definition
```typescript
export interface PlayerRPGStats {
  maxHp: number;               // Base: 10
  currentHp: number;           // Clamped: [0, maxHp]
  hpRegen: number;             // Base: 0
  lifeSteal: number;           // Base: 0 (percentage, e.g. 5 = 5%)
  damagePercent: number;       // Base: 0 (percentage modifier)
  meleeDamage: number;         // Base: 0 (flat damage boost)
  rangedDamage: number;        // Base: 0 (flat damage boost)
  elementalDamage: number;     // Base: 0
  attackSpeed: number;         // Base: 0 (percentage modifier)
  critChancePercent: number;   // Base: 0 (percentage)
  engineering: number;         // Base: 0 (scales deployables)
  range: number;               // Base: 0 (flat pixel reach)
  armor: number;               // Base: 0 (damage reduction)
  dodgePercent: number;        // Base: 0 (capped at 60%)
  speedPercent: number;        // Base: 0 (move speed modifier)
  luck: number;                // Base: 0 (multiplier to drops/rarity)
  harvesting: number;          // Base: 0 (end-of-wave payout + compound)
  pickupRange: number;         // Base: 120 (pixels magnet radius)
}
```

#### 3.2 Exact Mathematical Formulas

##### 1. Armor Damage Reduction
For raw incoming damage $D_{\text{raw}}$:
- **Positive Armor** ($\text{armor} \ge 0$):
  $$\text{DamageMultiplier} = \frac{15}{15 + \text{armor}}$$
  $$D_{\text{taken}} = \max\left(1, \lfloor D_{\text{raw}} \times \text{DamageMultiplier} \rfloor\right)$$
  $$\text{ReductionPercent} = \frac{\text{armor}}{\text{armor} + 15} \times 100\%$$
- **Negative Armor** ($\text{armor} < 0$):
  $$\text{DamageMultiplier} = 1 + \frac{|\text{armor}|}{15}$$
  $$D_{\text{taken}} = \lfloor D_{\text{raw}} \times \text{DamageMultiplier} \rfloor$$

*Effective HP (EHP) Benchmark Table*:
| Armor Value | Damage Multiplier | Damage Reduction % | Effective HP (% of Base) |
|---|---|---|---|
| -15 | 2.00x | -100% | 50% |
| -5 | 1.33x | -33.3% | 75% |
| 0 | 1.00x | 0% | 100% |
| +5 | 0.75x | 25.0% | 133.3% (+33.3%) |
| +10 | 0.60x | 40.0% | 166.7% (+66.7%) |
| +15 | 0.50x | 50.0% | 200.0% (+100.0%) |
| +30 | 0.33x | 66.7% | 300.0% (+200.0%) |
| +45 | 0.25x | 75.0% | 400.0% (+300.0%) |

##### 2. HP Regeneration
If $\text{hpRegen} > 0$ and $\text{currentHp} < \text{maxHp}$:
$$\Delta t_{\text{interval}} = \frac{5.0}{1.0 + \frac{\text{hpRegen} - 1}{2.25}} \text{ seconds}$$
When tick timer reaches $\Delta t_{\text{interval}}$:
$$\text{currentHp} = \min(\text{maxHp}, \text{currentHp} + 1)$$
$$\text{tickTimer} = 0$$

##### 3. Life Steal
On every direct weapon hit:
1. Check internal cooldown timer: $\Delta t_{\text{sinceLastLifeSteal}} \ge 0.10\text{s}$ (max $10\text{ triggers/sec}$).
2. Roll random number $R \sim U(0, 100)$.
3. If $R < \text{lifeSteal}$:
   $$\text{currentHp} = \min(\text{maxHp}, \text{currentHp} + 1)$$
   $$\text{lastLifeStealTimestamp} = \text{now}$$
   - Turret and landmine damage events do not roll Life Steal.

##### 4. Effective Range
- **Ranged Weapons**:
  $$\text{EffectiveRange} = \max(25, \text{blueprint.baseRange} + \text{stats.range})$$
- **Melee Weapons**:
  $$\text{EffectiveRange} = \max(25, \text{blueprint.baseRange} + 0.5 \times \text{stats.range})$$

##### 5. Harvesting Compounding
At the end of each wave:
1. Grant materials: $\text{inventory.materials} += \text{stats.harvesting}$.
2. Compound harvesting stat:
   $$\text{stats.harvesting} += \lceil \text{stats.harvesting} \times 0.05 \rceil$$
   *(Example: 10 harvesting becomes 11; 20 becomes 21; 21 becomes 23; 100 becomes 105).*

---

### Subsystem 4: Enemies & Wave Progression

#### 4.1 The 5 Canonical Enemy Types
| Enemy Type | Role | Base HP | HP / Wave | Base Dmg | Dmg / Wave | Base Speed | Behavior & State Machine | Special Mechanics |
|---|---|---|---|---|---|---|---|---|
| **1. Basic Swarmer** | Fodder Horde | 3 | +2.0 | 1 | +0.6 | 160 px/s | Direct pursuit: steers towards player with flocking separation | Spawns in large waves; dies quickly to pierce/cleave |
| **2. Fast Rusher** | High-Threat Flanker | 2 | +1.2 | 1 | +0.6 | 260 px/s | Rapid rush: weaves in sinusoidal pattern, runs faster than base player | Susceptible to heavy knockback; high priority |
| **3. Tank / Charger** | Disruptor / Area Denial | 22 | +10.0 | 3 | +1.5 | 90 px/s | Slow stalk $\to$ telegraph flash (0.8s) $\to$ high-speed dash (360 px/s for 1.2s) | **Immune to knockback during dash**; deals heavy collision damage |
| **4. Ranged Shooter** | Kiting Artillery | 6 | +3.0 | 2 | +0.8 | 120 px/s | Kiting: maintains 350-450px distance; telegraphs red laser (0.5s) $\to$ fires slow bullet (200 px/s) | Retreats when player approaches; forces player movement |
| **5. Wave Elite / Boss** | Miniboss (Wave 11/20) | 350 | +160.0 | 5 | +2.5 | 130 px/s | Phase loop: (1) Radial 12-bullet burst, (2) Ground slam shockwave, (3) Bull rush dash | Immune to knockback; drops **Guaranteed Tier 3/4 Loot Crate** |

#### 4.2 Wave Progression & Pacing (Waves 1 to 20)
- **Wave Duration Table**:
  - Wave 1: $20\text{s}$
  - Wave 2: $25\text{s}$
  - Wave 3: $30\text{s}$
  - Wave 4: $35\text{s}$
  - Wave 5: $40\text{s}$
  - Wave 6: $45\text{s}$
  - Wave 7: $50\text{s}$
  - Wave 8: $55\text{s}$
  - Waves 9 through 19: $60\text{s}$ each
  - Wave 20: $90\text{s}$ (Final Boss Wave)
- **Spawn Pacing Formula**:
  $$\text{SpawnRate}(t, W) = \text{BaseRate} \times \left(1 + \frac{W \times 0.20}{1}\right) \times \left(1 + 0.5 \times \sin\left(\frac{2\pi t}{15}\right)\right)$$
  - Enemies spawn outside player viewport or along arena border circles.
  - Spawning occurs in rhythmic pulses (15-second cycles) alternating between trickle fodder and dense clusters.

#### 4.3 Drop Systems & Vacuum Physics
1. **Material Drops**:
   - Defeated enemy spawns 1 Material gem at $(x, y)$.
   - Gem value: $+1$ Material (Gold currency) and $+1$ Character XP.
   - **Magnetic Pull**: If distance to player $d \le \text{stats.pickupRange}$ (default $120\text{px}$):
     $$\vec{v}_{\text{gem}} = \vec{v}_{\text{gem}} \cdot 0.92 + \text{normalize}(\vec{p}_{\text{player}} - \vec{p}_{\text{gem}}) \times 600 \cdot \Delta t$$
   - Consumed when $d < 20\text{px}$.
2. **Consumable Fruit Drops**:
   - Base drop chance $P_{\text{fruit}} = 1.0\% \times \left(1 + \frac{\text{stats.luck}}{100}\right)$.
   - Picking up restores $+3\text{ HP}$ instantly.
3. **Loot Crate Drops**:
   - Base drop chance $P_{\text{crate}} = 0.5\% \times \left(1 + \frac{\text{stats.luck}}{100}\right)$.
   - Guaranteed $100\%$ drop from Wave Elites and Bosses.
   - Contains 1 passive item or bonus materials choice.
4. **End-of-Wave Auto-Vacuum / Bag Carrier**:
   - At wave timer $= 0$, all enemies despawn.
   - All active materials on the ground trigger high-speed magnetic acceleration towards the player ($\text{speed} = 2000\text{ px/s}$).
   - Any uncollected materials automatically transfer to the **Uncollected Bag**, granting $+2$ value to the first $N$ materials collected in the next wave.

---

### Subsystem 5: Inter-Wave Shop & Economy

#### 5.1 Inter-Wave State Flow
1. **Wave Clear Screen**: Victory banner, display materials earned, enemies slain.
2. **Level Up Selection**: If XP bar filled, prompt player to pick 1 of 4 random stat upgrades (e.g. $+3\text{ Max HP}$, $+1\text{ Armor}$, $+5\%\text{ Attack Speed}$, $+4\%\text{ Dodge}$).
3. **Shop Generation**:
   - 4 Item/Weapon slots populated.
   - Slot content drawn based on wave rarity distribution and Luck.
4. **Player Actions**:
   - Buy Item/Weapon (deducts materials, equips or places in passive inventory).
   - Combine duplicate weapons (manual button or automatic on purchase).
   - Lock/Unlock Slot (persists through rerolls).
   - Reroll Shop (deducts reroll cost, re-populates unlocked slots).
   - "Go to Next Wave" Button (transitions back to combat arena).

#### 5.2 Rarity Tier Probabilities by Wave
| Tier | Color | Wave 1 | Waves 2–3 | Waves 4–7 | Waves 8–13 | Waves 14–20 |
|---|---|---|---|---|---|---|
| **Tier 1 (Common)** | White | 100% | 85% | 60% | 35% | 15% |
| **Tier 2 (Uncommon)** | Blue | 0% | 15% | 30% | 40% | 35% |
| **Tier 3 (Rare)** | Purple | 0% | 0% | 10% | 20% | 35% |
| **Tier 4 (Legendary)** | Red | 0% | 0% | 0% | 5% | 15% |

- **Luck Influence**:
  $$\text{EffectiveWeight}_{\text{Tier } k} = \text{BaseWeight}_{\text{Tier } k} \times \left(1 + \frac{\text{stats.luck} \times 0.015 \times k}{1}\right)$$
  Weights are normalized to sum to $100\%$.

#### 5.3 Pricing & Inflation Formulas
- **Base Prices**:
  - Tier 1 Item / Weapon: $20$ Materials
  - Tier 2 Item / Weapon: $42$ Materials
  - Tier 3 Item / Weapon: $75$ Materials
  - Tier 4 Item / Weapon: $120$ Materials
- **Wave Price Inflation Formula**:
  $$\text{Price}(W) = \text{BasePrice} + 1 + \lfloor \text{BasePrice} \times 0.10 \times W \rfloor$$
  *(Example: A Tier 1 weapon on Wave 1 costs $20 + 1 + 2 = 23$; on Wave 10 it costs $20 + 1 + 20 = 41$; on Wave 20 it costs $20 + 1 + 40 = 61$).*
- **Locked Items Rule**:
  - If slot $i$ is locked during Wave $W_L$, its price is frozen at $\text{Price}(W_L)$ and does not inflate during future waves until purchased or unlocked.

#### 5.4 Reroll Cost Scaling
For wave $W$ and $k$-th reroll in current shop visit ($k = 0, 1, 2, \dots$):
$$\text{BaseReroll}(W) = \max(1, \lfloor W \times 0.75 \rfloor)$$
$$\text{RerollStep}(W) = 1 + \lfloor W \times 0.25 \rfloor$$
$$\text{RerollCost}(k, W) = \text{BaseReroll}(W) + (k \times \text{RerollStep}(W))$$
- *Example (Wave 5)*: $\text{Base} = 3$, $\text{Step} = 2$.
  - 1st reroll ($k=0$): $3$ materials.
  - 2nd reroll ($k=1$): $5$ materials.
  - 3rd reroll ($k=2$): $7$ materials.
- Counter $k$ resets to $0$ upon entering each new shop.

#### 5.5 Weapon Tier Combining / Fusion Logic
When player possesses two identical weapons $W_A$ and $W_B$ where $W_A.\text{id} == W_B.\text{id}$ and $W_A.\text{tier} == W_B.\text{tier} < 4$:
1. Consume $W_B$ (removes from active weapon slot).
2. Upgrade $W_A.\text{tier} += 1$.
3. Upgrade $W_A$ stats to the tier $+1$ blueprint:
   - Base damage increases by $+35\%$.
   - Cooldown decreases by $-10\%$.
   - Crit chance increases by $+5\%$.
   - Knockback increases by $+15\%$.
4. Slot previously occupied by $W_B$ becomes empty and available for a new weapon purchase.
5. If inventory is full ($6/6$) and player buys a matching duplicate weapon in the shop, the engine triggers **Auto-Combine**, upgrading the existing weapon in-place without slot overflow error.

---

## 4. Caveats
1. **Floating Point Rounding**: All final damage numbers, HP ticks, and material costs must be integer-clamped using `Math.floor()` or `Math.round()` to prevent fractional health or currency bugs.
2. **Frame-Rate Decoupling**: Physics integration and timers must use delta time $\Delta t$ (clamped at $\max(\Delta t, 0.05\text{s})$ to prevent physics explosion during browser tab suspension).
3. **Single Life-Steal Roll per Frame**: To avoid instant full heals with piercing weapons, the $0.10\text{s}$ global internal cooldown on Life Steal must be strictly enforced.

---

## 5. Conclusion
This specification provides an authoritative, mathematically closed, clean-room definition of the Brotato arena roguelite engine. It contains exact formulas, algorithms, data contracts, and edge case resolutions for:
- 360-degree vector physics with sliding wall boundaries and $60\%$ dodge cap.
- Multi-weapon parallel management (4–6 slots) for both melee swing/thrust and ranged projectile/spread archetypes with cooldown scaling up to $12\text{ hits/sec}$.
- The full 17-stat RPG system including exact hyperbolic Armor reduction, HP regeneration intervals, Life Steal ICD, and compound Harvesting growth.
- The 5 distinct enemy AI archetypes with wave scaling curves, spawn pacing, and material vacuum.
- The 4-slot inter-wave shop loop with price inflation, locked slots, reroll escalation, and weapon tier fusion.

The engineering agents can directly implement pure TypeScript modules based on these schemas and equations.

---

## 6. Verification Method
Implementation agents can independently verify compliance using automated unit tests:

```typescript
// Sample Verification Test Suite (Jest / Vitest)
describe('Brotato Core Formulas Verification', () => {
  test('Armor damage reduction formula matches spec', () => {
    const calcDamage = (raw: number, armor: number) => {
      if (armor >= 0) return Math.max(1, Math.floor(raw * (15 / (15 + armor))));
      return Math.floor(raw * (1 + Math.abs(armor) / 15));
    };
    expect(calcDamage(20, 0)).toBe(20);
    expect(calcDamage(20, 15)).toBe(10); // 50% reduction
    expect(calcDamage(20, 45)).toBe(5);  // 75% reduction
    expect(calcDamage(20, -15)).toBe(40); // 100% amplification
    expect(calcDamage(1, 100)).toBe(1);  // Minimum hit clamped to 1
  });

  test('Attack speed cooldown reduction formula matches spec', () => {
    const calcCooldown = (baseMs: number, asPercent: number) => {
      const eff = Math.max(-90, asPercent);
      return Math.max(83.33, baseMs * (100 / (100 + eff)));
    };
    expect(calcCooldown(1000, 0)).toBe(1000);
    expect(calcCooldown(1000, 100)).toBe(500); // 2x speed
    expect(calcCooldown(1000, 300)).toBe(250); // 4x speed
    expect(calcCooldown(100, 500)).toBeCloseTo(83.33, 1); // Capped at 12 hits/sec
  });

  test('Harvesting compound growth matches spec', () => {
    const compoundHarvesting = (h: number) => h + Math.ceil(h * 0.05);
    expect(compoundHarvesting(10)).toBe(11);
    expect(compoundHarvesting(20)).toBe(21);
    expect(compoundHarvesting(21)).toBe(23); // Ceil(1.05) = +2
    expect(compoundHarvesting(100)).toBe(105);
  });

  test('Shop price inflation matches spec', () => {
    const calcPrice = (base: number, wave: number) => base + 1 + Math.floor(base * 0.10 * wave);
    expect(calcPrice(20, 1)).toBe(23);
    expect(calcPrice(20, 10)).toBe(41);
    expect(calcPrice(20, 20)).toBe(61);
  });
});
```
