# Handoff Report: Educational Question Engine, Mid-Wave Question Charges (R3), and Automated Verification Suite (R4)

**Role**: teamwork_spec_miner (Specification Miner & System Architect)  
**Date**: 2026-11-04  
**Working Directory**: `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_spec_miner_survey2_3/`  
**Reference Request**: `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/ORIGINAL_REQUEST.md`

---

## 1. Observation

### 1.1 Codebase & Question Engine Inspection
- **Curated Question Bank (`src/data/questions.ts`)**:
  - Exactly 30 curated questions (24 `YKS_QUESTIONS` and 6 `BUEPT_QUESTIONS`).
  - Covers 5 curriculum disciplines with 6 questions each:
    1. `TYT Türkçe` (e.g. `yks-3`, `yks-8`, `yks-13`, `yks-18`, `yks-23`, `yks-28`)
    2. `TYT Matematik` / `AYT Sayısal` (e.g. `yks-1`, `yks-6`, `yks-11`, `yks-16`, `yks-21`, `yks-26`)
    3. `AYT Fen` / `TYT Fen` (e.g. `yks-2`, `yks-7`, `yks-12`, `yks-17`, `yks-22`, `yks-27`)
    4. `TYT Sosyal` (e.g. `yks-4`, `yks-9`, `yks-14`, `yks-19`, `yks-24`, `yks-29`)
    5. `BUEPT English` (Vocab, Reading, Logic, Grammar: `buept-1` to `buept-6`)
  - Two question types: `multiple_choice` (4 options, `correctIndex: 0..3`) and `evidence_hunt` (`passageTokens` array with `isClue: true`).
  - All questions include pedagogic mnemonic explanation prefixed with `💡 Boğaziçili Koç Taktiği` or `💡 BUEPT Kilyos Notu`.

- **Current Triggering and Frequency Limitations**:
  - **Inter-Wave Trigger**: `src/app/page.tsx:236` calls `setIsStudyModalOpen(true)` inside `handleWaveComplete`. Triggers exactly once between waves (at most 19 times in a full 20-wave run).
  - **In-Combat Trigger**: `src/components/GameCanvas.tsx:561-573` triggers `loop.setTacticalFreeze(true)` and `setIsTacticalFreeze(true)` only when `dropResult.collectedChests > 0`.
  - In `src/game/entities/DropManager.ts:98-113`, regular enemy crate drop probability is `calculateDropChance(0.005, luck)` (0.5% base chance). Swarmers have 0.5%, Rushers have 0.5%, Tanks have 2.0% (`DropManager.ts:99`), and only Elite Bosses (Waves 11 & 20) have guaranteed crate drops (`DropManager.ts:31`).
  - **Observed Frequency Bottleneck**: In early/mid waves without an Elite, a player can clear 30-60 enemies across 40 seconds with zero combat question triggers. Question density in the combat loop is currently near-zero unless an extremely rare 0.5% drop occurs.

- **Current Evaluation & Invariants**:
  - `src/game/education/GraceConsolation.ts:18-80` implements `evaluateAnswerWithGrace`:
    * Correct Answer: Calls `calculateSubjectBuff` with DDA difficulty multiplier ($1 + (diff-1) \times 0.5$) and streak bonus ($1 + \min(streak, 5) \times 0.1$), plus bonus materials ($15 + 5 \times diff + 2 \times streak$).
    * Incorrect Answer: Strict Invariant: $0$ HP loss and $0$ material penalty. Awards consolation prize ($+1$ luck, $+2\%$ speed, $+5$ materials; or Rescue Mode $+2$ luck, $+2\%$ speed, $+10$ materials if streak $\le -2$).
  - `src/game/education/BuffMatrix.ts:136-138` strictly enforces the Brotato 60% Dodge cap: `stats.dodgePercent = Math.min(60, stats.dodgePercent)`.
  - `src/game/education/FreezeManager.ts:26-46` sets `loopTarget.setTacticalFreeze(true)` and plays procedural sound `soundEngine.playTacticalFreeze()`.
  - `src/game/engine/GameLoop.ts:165-167` enforces `if (this.state === 'paused' || this.isTacticalFreezeActive) { dt = 0; }`.
  - `src/game/engine/Kinematics.ts:68` enforces `if (dt === 0) return;` guaranteeing zero kinematic drift.

- **Existing HUD & UI State (`src/components/HUD.tsx`)**:
  - Currently displays: Top-left Player avatar & HP bar; Top-center Wave timer & progress indicator & Tactical Freeze badge; Top-right Materials count & Stat sheet toggle; Center Floating 17 RPG Stats sheet (toggleable); Bottom 6-Weapon inventory slots.
  - **Critical Observation**: There is currently NO question charge meter, NO mid-wave ability icon, and NO keyboard indicator (`[Q]`) on the HUD.

- **Baseline Speed & Combat Scaling Constants**:
  - `src/game/engine/Kinematics.ts:10`: `BASE_PLAYER_SPEED = 300` px/sec, `PLAYER_ACCELERATION = 2400`, `FRICTION_DAMPING = 0.88`.
  - `src/game/weapons/WeaponCatalog.ts:56-191`:
    * Pistol: `projectileSpeed: 650`, `baseDamage: 12`, `baseCooldownMs: 800`.
    * Shotgun: `projectileSpeed: 550`, `baseDamage: 4`, `baseCooldownMs: 1100`, `pelletCount: 4`.
    * SMG: `projectileSpeed: 700`, `baseDamage: 3`, `baseCooldownMs: 150`.
    * Magic Wand: `projectileSpeed: 500`, `baseDamage: 9`, `baseCooldownMs: 700`.
    * Knife: `baseDamage: 8`, `baseCooldownMs: 400`.
    * Sword: `baseDamage: 14`, `baseCooldownMs: 650`.
    * Wrench: `baseDamage: 10`, `baseCooldownMs: 550`.
  - `src/game/entities/EnemyEntities.ts:39-133`:
    * Swarmer: `baseHp: 3`, `hpPerWave: 2.0`, `baseDmg: 1`, `dmgPerWave: 0.6`, `baseSpeed: 160`.
    * Rusher: `baseHp: 2`, `hpPerWave: 1.2`, `baseDmg: 1`, `dmgPerWave: 0.6`, `baseSpeed: 260`.
    * Tank: `baseHp: 22`, `hpPerWave: 10.0`, `baseDmg: 3`, `dmgPerWave: 1.5`, `baseSpeed: 90`.
    * Ranged: `baseHp: 6`, `hpPerWave: 3.0`, `baseDmg: 2`, `dmgPerWave: 0.8`, `baseSpeed: 120`.
    * Elite: `baseHp: 350`, `hpPerWave: 160.0`, `baseDmg: 5`, `dmgPerWave: 2.5`, `baseSpeed: 130`.

- **Test Suite Status (`vitest run`)**:
  - Executing `export PATH="/Users/afurkanmac/.local/node/bin:$PATH"; npm test` runs 18 test files with 377 passing tests in 1.91s.
  - Executing `npm run build` completes cleanly with zero TypeScript or linting errors.

---

## 2. Logic Chain

1. **Premise 1 (R3 Requirement)**: The user requested an in-round question mechanic allowing players to activate a mid-wave question charge during combat, rewarding items upon success, and increasing overall educational question frequency.
2. **Premise 2 (State Safety & Combat Freezing)**: In Brotato-style bullet-hell games, pausing during high-intensity combat can cause collision desynchronization, missed projectile collisions, or massive delta-time jumps upon resume. The engine already contains a frame-accurate freeze mechanism in `GameLoop.ts` (`isTacticalFreezeActive` forces `dt = 0`), which has been verified in `Kinematics.ts` to preserve player velocity and position without drift.
3. **Premise 3 (Charge Earning & HUD Pacing)**: To ensure question charges feel earned and strategic rather than spammed or neglected, charges should follow a deterministic acquisition formula:
   - Wave Start: +1 charge (capacity 2).
   - Kill Threshold: +1 charge earned for every 30 enemy kills within the wave.
   - Elite Kill: +1 charge immediately.
   - HUD indicator with keybind `[Q]` and click trigger allows intuitive, accessible activation.
4. **Premise 4 (Item Reward Delivery)**: Upon answering correctly, the player should receive an immediate choice of 3 tactical items:
   - Tier-appropriate Weapon (or auto-fusion if inventory of 6 weapons is full).
   - Curriculum Subject RPG Stat Boost (scaled by difficulty and streak, adhering to the 60% dodge cap).
   - Battlefield Superpower / Loot Chest Drop (Orbital Nuke, Revitalizing Surge, Cosmic Vacuum).
5. **Premise 5 (Speed & Rebalance Verification in R4)**: To satisfy R2 and R4, tests must prove:
   - Player base speed is boosted (from 300 to $\ge 360$ px/s, a $20\%+$ increase).
   - Projectile speeds are boosted across the catalog (Pistol 650 $\to$ 800+, Shotgun 550 $\to$ 700+, SMG 700 $\to$ 850+, Wand 500 $\to$ 650+).
   - Weapon damage and enemy HP formulas scale smoothly without breaking game progression or stalling time-to-kill.
   - All tests in `tests/` pass with zero regressions.

---

## 3. Features Discovered & Architectural Specifications

### Features Discovered Table
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Education | 30 Curated Question Bank | 24 YKS + 6 BUEPT questions covering 5 core disciplines | Question ID, Discipline, Difficulty | `TacticalQuestion` object with prompt, options/tokens, mnemonic | Safe fallback to default question if ID missing | `src/data/questions.ts` |
| 2 | Education | Dual Question Formats | `multiple_choice` (4 options) and `evidence_hunt` (clickable clue token) | Option Index / Token Index | Correctness boolean | Incorrect index flags wrong answer; never crashes | `src/types/game.ts` |
| 3 | Education | Subject Buff Matrix | Maps Turkish/Math/Science/Social/English to specific Brotato RPG stats | Subject Category, Difficulty (1-3), Streak | `StatModifiers` object | Default to Turkish category if unknown | `src/game/education/BuffMatrix.ts` |
| 4 | Education | Grace & Consolation Policy | Zero HP damage and zero material loss on incorrect answers | Question, selected index, player stats, streak | Consolation buffs, moral message, mistake logged | Preserves current HP strictly; clamps negative streaks | `src/game/education/GraceConsolation.ts` |
| 5 | Education | 5-Axis Telemetry & Mistake Notebook | Real-time accuracy metrics and mistake logging across 5 curriculum axes | Attempt result, response time ms, wave number | Updated accuracy percentages, radar chart data | Handles NaN reaction times and empty logs cleanly | `src/game/education/TelemetryTracker.ts` |
| 6 | Engine | Frame-Accurate Tactical Freeze | Sets simulation `dt = 0` while rendering continues at 60 FPS | `loop.setTacticalFreeze(true)` | Simulation time halted, velocities and positions locked | Delta-time clamped to max 0.05s on resume | `src/game/engine/GameLoop.ts` |
| 7 | Combat | 4 Tactical Superpowers | In-combat powers: Revitalizing Surge, Orbital Nuke, Flow State Frenzy, Cosmic Vacuum | Power ID, Player/Enemy/Pickup arrays | Health restored, enemies damaged, pickups magnetized | Safe fallbacks if entity arrays empty | `src/game/education/TacticalSuperpowers.ts` |
| 8 | R3 Design | Mid-Wave Question Charge State | Tracks available question charges (cap 2), kill thresholds, and cooldowns | Wave start, enemy kill events | Charge count increment, UI update event | Clamped at max capacity (2); ignores triggers when 0 | Proposed R3 Specification |
| 9 | R3 Design | Mid-Wave Keybind & HUD Trigger | Keybind `'Q'` or HUD battery click triggers question freeze mid-combat | KeyboardEvent `'q'`, HUD mouse click | Activates tactical freeze and question modal | Rejects input if charge=0, paused, or wave inactive | Proposed R3 Specification |
| 10 | R3 Design | 3-Card Mid-Wave Item Choice | Correct answer grants weapon drop/equip, subject stat buff, or superpower | Chosen card index (0, 1, or 2) | Instant inventory sync or drop spawn | Auto-fuses duplicate weapons if slots are full | Proposed R3 Specification |
| 11 | R3 Design | Post-Unfreeze Invulnerability Grace | Grants 1.5s invulnerability shield upon unfreeze to prevent cheap hits | Modal close / resume event | `player.invulnerabilityTimerMs = 1500` | Timer ticks down at standard rate; never negative | Proposed R3 Specification |
| 12 | R2 / R4 | Boosted Kinematics Parameters | Boosted base movement speed ($\ge 360$ px/s) and projectile velocities | Movement input, projectile spawn | Faster entity positions, shorter traversal time | Bounded by max speed and arena collision clamps | Proposed R2/R4 Specification |
| 13 | R2 / R4 | Rebalanced Scaling Curves | Rebalanced weapon base damage and enemy HP progression per wave | Wave number, weapon tier | Balanced DPS and time-to-kill across all 20 waves | Prevents negative damage and zero/infinite HP | Proposed R2/R4 Specification |

### Edge Cases Discovered & Mitigation Matrix
| # | Feature | Input / Condition | Observed / Required Behavior |
|---|---------|-------------------|-----------------------------|
| 1 | Tactical Freeze (`dt = 0`) | Player dashing when question triggers | Player velocity and position remain frozen with 0 drift. Dash resumes normally after unfreeze. |
| 2 | Tactical Freeze (`dt = 0`) | 10+ projectiles in mid-air | Projectiles freeze mid-flight; remaining pierces, bounces, and lifetimes remain immutable. |
| 3 | Resume from Freeze | Modal stays open for 60 seconds | Timestamp gap does NOT cause physics explosion; `dt` is clamped to $\le 0.05$s, and `lastTimestampMs` is refreshed. |
| 4 | Mid-Wave Charge Input | Player presses 'Q' with 0 charges | Input rejected silently or with audio negative chirp (`soundEngine.playHit()`); combat continues unpaused. |
| 5 | Mid-Wave Charge Input | Player presses 'Q' during wave completion transition | Input ignored; transition to Shop/Inter-wave study modal takes precedence. |
| 6 | Mid-Wave Item Reward | Weapon awarded when player has 6 full weapon slots | If player holds an identical weapon, automatically merges to Tier+1. If no match, converts to +50 materials & +5% damage. |
| 7 | Stat Buff Reward | Turkish buff awarded when Dodge is already 58% | Dodge increases by only 2% to clamp strictly at the 60% hard cap. |
| 8 | Wrong Answer in Mid-Wave | Player selects incorrect answer or timer expires | Zero HP loss; zero material loss; 0.5s weapon misfire stagger; 2.0s invulnerability shield granted; combat resumes safely. |
| 9 | Rapid Keybind Mashing | Player spams 'Q' multiple times within 100ms | Input debounced with a 2.0s internal cooldown timer (`cooldownRemainingMs`); only 1 charge consumed. |
| 10 | Next.js Component Whitelist | Adding new component file to `src/components/` | `tests/adversarial/imports_integrity.test.ts:328` has a strict whitelist; new UI must be integrated into `HUD.tsx` or whitelisted. |

---

## 4. Architectural Design Specifications for R3 & R4

### 4.1 Mid-Wave Question Charge Mechanic (R3 Specification)

#### A. State Machine Interface
Add to `src/types/brotato.ts`:
```typescript
export interface QuestionChargeState {
  currentCharges: number;          // Available charges: 0, 1, or 2 (capacity 2)
  maxCharges: number;              // Base 2
  killsSinceLastCharge: number;    // Progress towards next kill milestone (0 to 30)
  killThreshold: number;           // 30 enemy kills per charge
  cooldownRemainingMs: number;     // 2000ms safety lockout post-unfreeze
  totalChargesUsedThisRun: number;
}
```

#### B. Charge Acquisition Rules
1. **Wave Initialization**: At the start of each wave, if `currentCharges < maxCharges`, increment `currentCharges += 1`.
2. **Kill Threshold Progression**: Each enemy defeated increments `killsSinceLastCharge += 1`. When `killsSinceLastCharge >= 30`:
   - If `currentCharges < maxCharges`: `currentCharges += 1`, `killsSinceLastCharge = 0`, play audio cue `soundEngine.playComboUp(2)`.
   - If `currentCharges === maxCharges`: `killsSinceLastCharge = 30` (capped).
3. **Elite Defeat**: Killing an Elite enemy immediately awards $+1$ charge (up to `maxCharges`).

#### C. HUD Integration (`src/components/HUD.tsx`)
Render a dedicated Charge Bar in the Top-Center or Bottom-Left:
- Icon: `🧠` or `⚡` with badge `[Q] SORU HAKKI`.
- Visual Pips: 2 segments. Active charges glow with pulsing cyan border (`shadow-[0_0_12px_rgba(56,189,248,0.6)]`).
- Kill Counter: Subtitle `Kills: {killsSinceLastCharge}/30`.
- Interactive: Clicking the element triggers the charge if `currentCharges > 0`.
- Tooltip/Hint: `[Q] Tuşuna Bas veya Tıkla - Taktiksel Soru & Eşya Kazan`.

#### D. Combat Freeze Execution Lifecycle
1. User presses `'q'` or clicks HUD button.
2. Check preconditions:
   ```typescript
   if (chargeState.currentCharges <= 0 || isTacticalFreeze || !isWaveActive || chargeState.cooldownRemainingMs > 0) {
     return;
   }
   ```
3. Consume charge: `chargeState.currentCharges -= 1; chargeState.cooldownRemainingMs = 2000;`.
4. Freeze simulation:
   ```typescript
   gameLoopRef.current?.setTacticalFreeze(true);
   setIsTacticalFreeze(true);
   setFreezeSource('midwave_charge');
   const randomQuestion = ALL_QUESTIONS[Math.floor(Math.random() * ALL_QUESTIONS.length)];
   setActiveTacticalQuestion(randomQuestion);
   soundEngine.playTacticalFreeze();
   ```
5. Modal display: `TacticalFreezeModal` renders with source `'midwave_charge'`.

---

### 4.2 Item Reward System Architecture

#### A. 3-Choice Reward Model
Upon answering correctly, present 3 distinct cards:
```typescript
export interface MidWaveItemRewardChoice {
  type: 'weapon' | 'stat_booster' | 'battlefield_chest';
  title: string;
  description: string;
  weaponBlueprint?: WeaponBlueprint;
  statModifiers?: Partial<PlayerRPGStats>;
  chestDropTier?: number;
}
```

1. **Card 1 (Weapon Reward)**:
   - Wave 1–4: Tier 1 Weapon Blueprint (e.g. Pistol, Sword, Shotgun, Wand).
   - Wave 5–9: Tier 2 Weapon Blueprint.
   - Wave 10–15: Tier 3 Weapon Blueprint.
   - Wave 16–20: Tier 4 Weapon Blueprint.
   - **Equip / Merge Logic**:
     * Open Slot (< 6 weapons): Directly appends to `weapons` array via `WeaponManager`.
     * Full Slots (6 weapons): Scans for duplicate matching weapon and automatically executes `combineWeapon(slotA, slotB)` to upgrade it into Tier $+1$. If no match exists, grants $+50$ materials and $+5\%$ damage bonus.
2. **Card 2 (Curriculum Stat Booster)**:
   - Based on question category (e.g. TYT Matematik $\to$ $+10\%$ Attack Speed, $+8\%$ Crit Chance; TYT Türkçe $\to$ $+6\%$ Speed, $+5\%$ Dodge up to 60%).
   - Instantly mutates `player.stats`.
3. **Card 3 (Battlefield Chest / Superpower)**:
   - Spawns an instant Golden Chest drop or executes an instant Superpower (Orbital Nuke, Revitalizing Surge, Cosmic Vacuum) $+35$ materials.

#### B. Safe Resume & Invariant Guarantees
When reward is chosen:
```typescript
gameLoopRef.current?.setTacticalFreeze(false);
setIsTacticalFreeze(false);
setActiveTacticalQuestion(null);
player.invulnerabilityTimerMs = Math.max(player.invulnerabilityTimerMs, 1500); // 1.5s Invulnerability Shield
soundEngine.playComboUp(3);
ftm.spawnBanner(player.x, player.y, '📦 EŞYA KAZANILDI!', '#38bdf8');
```

---

### 4.3 Speed, Pacing, and Power Rebalance Specifications (R2)

To fulfill R2:
1. **Player Movement Baseline**:
   - `BASE_PLAYER_SPEED`: Boost from baseline `300` px/sec to `360` px/sec (exact $20\%$ boost).
   - `PLAYER_ACCELERATION`: Increase from `2400` to `2800` px/sec$^2$ for snappier direction changes.
   - `DASH_SPEED_MULTIPLIER`: Maintain `1.5` (dash speed = $540$ px/sec).
2. **Weapon Projectile Velocity Boost**:
   - Pistol: `650` px/sec $\to$ `820` px/sec ($+26\%$).
   - Shotgun: `550` px/sec $\to$ `720` px/sec ($+31\%$).
   - SMG: `700` px/sec $\to$ `900` px/sec ($+28\%$).
   - Magic Wand: `500` px/sec $\to$ `680` px/sec ($+36\%$).
3. **Weapon Damage & Enemy HP Rebalance**:
   - Rebalance weapon base damage to eliminate early wave drag:
     * Pistol: base damage $12 \to 15$
     * Shotgun: base damage $4 \to 5$ per pellet ($4 \times 5 = 20$ total)
     * SMG: base damage $3 \to 4$
     * Knife: base damage $8 \to 10$
     * Sword: base damage $14 \to 18$
     * Wrench: base damage $10 \to 12$
   - Enemy HP Curves: Ensure smooth progression so higher weapon DPS matches enemy density without bullet-sponges:
     * Swarmer: base HP $3$, $+1.8$/wave (Wave 1: 3, Wave 10: 19.2, Wave 20: 37.2)
     * Rusher: base HP $2$, $+1.0$/wave (Wave 1: 2, Wave 10: 11, Wave 20: 21)
     * Tank: base HP $22$, $+8.0$/wave (Wave 1: 22, Wave 10: 94, Wave 20: 174)
     * Ranged: base HP $6$, $+2.5$/wave (Wave 1: 6, Wave 10: 28.5, Wave 20: 53.5)
     * Elite: base HP $350$, $+120.0$/wave (Wave 11: 1550, Wave 20: 2630)

---

## 5. Automated Verification Plan (R4 Specification)

We specify two new automated test suites in `tests/`:

### 5.1 Test Suite 1: `tests/unit/midwave_charge_and_rewards.test.ts`
1. **Charge Acquisition & Capacity Suite**:
   - `it('initializes wave with 1 charge up to capacity 2')`: Verifies `currentCharges` starts at 1, increments on new wave, caps at 2.
   - `it('accumulates kills and awards charge at 30 kills')`: Simulates 30 kills, asserts charge increments from 1 to 2.
   - `it('caps kill counter when at max charges')`: Verifies kills don't overflow beyond threshold when charges are full.
   - `it('rejects activation when currentCharges === 0')`: Asserts activation attempt with 0 charges returns false and does not freeze game.
2. **Combat State Freeze & Zero-Drift Suite**:
   - `it('freezes player kinematics with zero velocity or position drift during charge activation')`: Updates kinematics at `dt = 0`, checks coordinates identical.
   - `it('freezes active projectiles in mid-air during charge activation')`: Simulates 10 projectiles, ticks `dt = 0`, checks position and remaining lifetime unchanged.
   - `it('freezes enemy AI states, attack cooldowns, and telegraph timers')`: Verifies enemy state timers do not advance while frozen.
   - `it('freezes wave director timer during charge activation')`: Verifies wave time remaining remains static.
   - `it('guarantees zero-delta jump and clamps dt <= 0.05s on resume')`: Simulates 15-second modal duration, asserts first post-resume tick is clean and bounded.
   - `it('awards 1.5s invulnerability shield upon unfreeze')`: Asserts `player.invulnerabilityTimerMs >= 1500`.
3. **Item Reward & Inventory Synchronization Suite**:
   - `it('grants tier-appropriate weapon into empty slot on correct answer')`: Player with 1 weapon receives 2nd weapon; weapons array length becomes 2.
   - `it('fuses duplicate weapons into Tier+1 when inventory is full (6 weapons)')`: Player with 6 weapons receives matching duplicate; slot merges in-place to Tier 2.
   - `it('applies curriculum stat booster respecting 60% dodge cap')`: Turkish buff applied to 58% dodge player; results in exactly 60%.
   - `it('executes grace consolation on wrong answer with zero HP loss and zero gold penalty')`: Verifies HP unchanged, gold unchanged, consolation prize awarded.

### 5.2 Test Suite 2: `tests/unit/speed_and_power_rebalance.test.ts`
1. **Kinematics & Speed Boost Verification Suite**:
   - `it('verifies BASE_PLAYER_SPEED is boosted >= 360 px/s (>= 20% over 300 baseline)')`: Asserts `BASE_PLAYER_SPEED >= 360`.
   - `it('verifies projectile velocities across all 4 ranged weapons exceed baselines')`:
     * Pistol $\ge 800$ px/s (baseline 650)
     * Shotgun $\ge 700$ px/s (baseline 550)
     * SMG $\ge 850$ px/s (baseline 700)
     * Wand $\ge 650$ px/s (baseline 500)
   - `it('verifies arena traversal time is measurably reduced')`: Kinematic simulation of 1000px straight run completes in $< 2.8$ seconds.
2. **Combat Scaling & TTK Balance Suite**:
   - `it('verifies rebalanced weapon damage progression across tiers 1-4')`: Tests DPS monotonicity across tiers for all 7 weapons.
   - `it('verifies enemy HP progression curves across waves 1 to 20 prevent bullet sponges')`: Asserts Swarmer HP at wave 20 $\le 45$, Tank HP $\le 200$.
   - `it('verifies time-to-kill (TTK) remains engaging and balanced against rebalanced weapons')`: Calculates shots-to-kill on Wave 1 and Wave 10.

---

## 6. Caveats

1. **Test File Internal Duplications**:
   - Notice that `tests/unit/stat_scaling.test.ts` and `tests/e2e/game_loop_tiers.test.ts` contain local re-declarations of `calculateEnemyStats` and `updatePlayerMovement`.
   - When builder agents implement boosted speed (`BASE_PLAYER_SPEED = 360`) and rebalanced stats, they must ensure both `src/game/` and any test mock fixtures are synchronized so that existing tests continue to pass without false positives.
2. **Component Whitelist in `imports_integrity.test.ts`**:
   - `tests/adversarial/imports_integrity.test.ts:328` maintains a strict component name whitelist.
   - Builder agents should implement mid-wave charge HUD elements directly within `src/components/HUD.tsx` and modal extensions inside `src/components/TacticalFreezeModal.tsx`, avoiding creating arbitrary unlisted component files.

---

## 7. Conclusion

- The educational question engine is thoroughly surveyed: it has 30 curated questions across 5 disciplines with robust Grace & Consolation and Telemetry systems, but its combat frequency is currently bottlenecked by rare 0.5% crate drops.
- The Mid-Wave Question Charge Mechanic (R3) provides an ideal, highly satisfying solution: 2-charge capacity, earned at wave start (+1) and per 30 enemy kills (+1), activated on-demand via `'Q'` or HUD click, safely freezing combat at `dt = 0` with zero state drift, and granting 1.5s post-unfreeze invulnerability.
- The Item Reward System offers a structured 3-choice reward matrix: Tier-appropriate weapon (auto-fusing on full 6-slot inventory), permanent subject stat boost (with 60% dodge cap enforcement), or battlefield superpower / golden chest.
- The Speed and Power Rebalance (R2) targets a $20\%+$ player speed increase ($\ge 360$ px/s) and $25\%-35\%$ projectile speed increase, coupled with rebalanced weapon damage and enemy HP curves.
- The Automated Verification Plan (R4) details exact test specifications for `midwave_charge_and_rewards.test.ts` and `speed_and_power_rebalance.test.ts`, fully verifying state preservation, inventory sync, speed parameters, and combat math.

---

## 8. Verification Method

To independently verify these findings and execute the full test suite:
```bash
# 1. Ensure Node.js v22 binary is in PATH
export PATH="/Users/afurkanmac/.local/node/bin:$PATH"

# 2. Run existing Vitest test suite (all 18 test files, 377 tests must pass)
npm test

# 3. Verify clean production build and static prerendering
npm run build
```
Files to inspect:
- `src/data/questions.ts`
- `src/game/education/`
- `src/components/HUD.tsx`
- `src/components/TacticalFreezeModal.tsx`
- `src/game/engine/GameLoop.ts`
- `src/game/engine/Kinematics.ts`
- `tests/unit/education_buff_engine.test.ts`
- `tests/stress/superpowers_and_freeze_stress.test.ts`
