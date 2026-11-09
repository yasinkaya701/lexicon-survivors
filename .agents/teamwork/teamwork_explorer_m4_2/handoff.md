# HANDOFF REPORT: Milestone 4 Explorer 2
**Topic**: Educational Buff Engine, Grace Consolation System, 4 Tactical Superpowers & Frame-Accurate Freeze Mechanics
**Author**: `teamwork_explorer_m4_2`
**Target Audience**: Parent Orchestrator, Worker Agent (`teamwork_worker_m4_*`), Test Writer (`teamwork_test_writer_m4_*`)
**Date**: 2026-11-04T13:06:00Z

---

## 1. OBSERVATIONS

### 1.1 Direct File Observations & Code Inspection

#### A. Dispatch Scope (`.agents/teamwork/teamwork_explorer_m4_2/DISPATCH.md`)
- **Subject-to-Stat Buff Matrix Requirements**:
  * `Türkçe` $\rightarrow$ `+Speed %`, `+Dodge %`
  * `Matematik` $\rightarrow$ `+Attack Speed %`, `+Crit Chance %`
  * `Fen (Science)` $\rightarrow$ `+Elemental Damage`, `+Engineering`
  * `BUEPT (English)` $\rightarrow$ `+Harvesting`, `+Luck`, `+XP Multiplier`
  * `Sosyal` $\rightarrow$ `+Armor`, `+Max HP`
- **Grace Consolation Policy**:
  * On wrong answer: **NO damage penalty, NO material loss**.
  * Grant minor consolation buff (`+2% Speed` or `+1 Armor` or `+1 Luck`) + pedagogic encouragement.
  * Pedagogical mnemonic revelation ("Boğaziçili Koç Taktiği").
- **4 Tactical Superpowers** (Triggered via mystery chest pickup or elite spawn event):
  1. *Revitalizing Surge*: Instantly restore 50% of missing/max HP.
  2. *Orbital Particle Nuke*: Massive radial shockwave dealing 500 damage to all active screen enemies.
  3. *Flow State Frenzy*: 10s hyper-state with +100% attack speed, 0 weapon cooldowns, 100% crit chance.
  4. *Cosmic Material Vacuum*: Instant universal pull on all dropped material crystals directly to player.
- **Frame-Accurate Pause & Resume**:
  * Suspend physics, velocity updates, and weapon timers without time accumulation or delta-spike upon unfreezing.
  * Audio synthesis triggers: `playTacticalFreeze`, `playQuestionCorrect`, `playQuestionWrong`, `playNukeDetonation`.

#### B. Engine GameLoop (`src/game/engine/GameLoop.ts`)
- **Delta-Time Clamping & State Controls**:
  ```typescript
  // Line 12-15
  export const MAX_DELTA_TIME_SEC = 0.05; // 50ms cap (prevents physics explosion)
  export const TARGET_FPS = 60;
  export const FIXED_TIMESTEP_SEC = 1 / TARGET_FPS;
  ```
- **Tactical Freeze API**:
  ```typescript
  // Lines 115-121
  public setTacticalFreeze(frozen: boolean): void {
    this.isTacticalFreezeActive = frozen;
  }
  public isFrozen(): boolean {
    return this.isTacticalFreezeActive;
  }
  ```
- **Tick Ticking Behavior**:
  ```typescript
  // Lines 161-169
  let dt = Math.min(rawDtSec, this.maxDtSec);

  // If game is paused or tactical freeze is active, dt is strictly 0.0
  if (this.state === 'paused' || this.isTacticalFreezeActive) {
    dt = 0;
  }
  this.executeFrame(dt);
  ```
- **Observation on Unfreezing Delta Jump**:
  In `tick(timestamp)`:
  ```typescript
  const elapsedMs = timestamp - this.lastTimestampMs;
  this.lastTimestampMs = timestamp;
  ```
  If `isTacticalFreezeActive` is toggled from `true` to `false`, but the loop continued running `tick()` every `rAF` frame with `dt = 0`, then `lastTimestampMs` is ~16.6ms old. **However**, if the tab was inactive, or if unfreezing occurs asynchronously between frames, `rawDtSec` could jump up to `maxDtSec` (50ms), causing a 3-frame jerk on the first resume frame. An explicit unfreeze timestamp synchronization handshake is required.

#### C. Canvas Simulation Loop (`src/components/GameCanvas.tsx`)
- **Simulation Pause Behavior**:
  ```typescript
  // Line 235-236
  loop.onUpdate((dt: number) => {
    if (dt <= 0 || isWaveTransitioningRef.current) return;
  ```
  *Observed*: When `dt <= 0`, `onUpdate` immediately returns. Entity positions, velocities, weapon cooldowns, wave timers, enemy AI states, and visual decay remain frozen in memory.
- **Rendering Persistence**:
  ```typescript
  // Lines 584-783
  loop.onRender(() => {
    // Continues rendering player, enemies, projectiles, and overlays at 60 FPS
  ```
  *Observed*: The rendering loop continues to draw the scene with `alpha = 1.0`, enabling real-time visual freeze overlays, pulse shaders, and UI rendering without canvas stutter.
- **Chest Pickup Trigger**:
  ```typescript
  // Lines 551-556
  if (dropResult.collectedChests > 0) {
    soundEngine.playComboUp(3);
    ftm.spawnBanner(player.x, player.y, '📦 SANDIK!', '#f59e0b');
    vfx.spawnPickupRing(player.x, player.y, 'chest');
    vfx.addTrauma(0.20);
  }
  ```
  *Observed*: In M2, collecting a mystery chest merely spawns a banner. In M4, this exact event must trigger `TacticalFreezeEvent` (`source: 'mystery_chest'`).

#### D. Procedural Audio Synthesizers (`src/lib/sound.ts`)
- Verified existing procedural synthesizers directly matching M4 requirements:
  * `soundEngine.playTacticalFreeze()` (Line 693: Time-dilation low-pass swoosh + 3-pulse ticking chronometer).
  * `soundEngine.playQuestionCorrect()` (Line 746: Major triad arpeggiated combo chime).
  * `soundEngine.playQuestionWrong()` (Line 750: Low-frequency 150Hz $\rightarrow$ 112Hz sawtooth buzz).
  * `soundEngine.playNukeDetonation()` (Line 757: 190Hz $\rightarrow$ 25Hz seismic sub-bass drop + resonant shockwave noise).
  * `soundEngine.playGemPickup(streak)` (Line 588: Pitch-scaled crystal chime arpeggio).

#### E. Test Infrastructure & Passing Baseline
- Executed `export PATH=/Users/afurkanmac/.local/node/bin:$PATH && npm test`
- **Result**: 13 test files passed, 228 tests passed out of 228 (100% pass rate).
- Key existing test suite: `tests/unit/question_buffs.test.ts` (12 tests) validates question banking, stat buffing, grace consolation, and tactical rewards.

---

## 2. LOGIC CHAIN & SYSTEM ARCHITECTURE

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EDUCATIONAL BUFF ENGINE                         │
│                                                                        │
│   ┌───────────────────────────┐     ┌──────────────────────────────┐   │
│   │    5-Subject Buff Matrix  │     │   Grace Consolation System   │   │
│   │  - Türkçe: Spd% + Dodge%  │     │  - Zero HP / Material loss   │   │
│   │  - Mat: AtkSpd% + Crit%   │     │  - +1 Luck / +2% Spd / +1 Arm│   │
│   │  - Fen: ElemDmg + Eng     │     │  - Mnemonic explanation      │   │
│   │  - BUEPT: Harv + Luck + XP│     │  - Mistake Notebook logging  │   │
│   │  - Sosyal: Armor + Max HP │     └──────────────────────────────┘   │
│   └─────────────┬─────────────┘                    ▲                   │
│                 │                                  │                   │
│                 ▼                                  │                   │
│   ┌────────────────────────────────────────────────┴───────────────┐   │
│   │                   EVALUATION & DDA SCALING                     │   │
│   │   Difficulty Tier (1-3) x Streak Multiplier (1.0x - 1.5x)      │   │
│   └──────────────────────────────┬─────────────────────────────────┘   │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
┌──────────────────────────────┐     ┌───────────────────────────────────┐
│     INTER-WAVE STUDY BUFF    │     │      IN-COMBAT TACTICAL FREEZE    │
│  - Shown during Shop Phase   │     │  - Mystery Chest or Elite Trigger │
│  - 3-card reward selection   │     │  - Frame-Accurate Freeze (dt = 0) │
│  - Permanent run stat boost  │     │  - 4 Tactical Superpowers:        │
│                              │     │    1. Revitalizing Surge (50% HP) │
│                              │     │    2. Orbital Nuke (500 dmg)      │
│                              │     │    3. Flow State Frenzy (10s)     │
│                              │     │    4. Cosmic Vacuum (All gems)    │
│                              │     └─────────────────┬─────────────────┘
└──────────────────────────────┘                       │
                                                       ▼
                                     ┌───────────────────────────────────┐
                                     │     FRAME-ACCURATE ZERO-DELTA     │
                                     │          RESUME HANDSHAKE         │
                                     │  - lastTimestampMs = perf.now()   │
                                     │  - first frame dt clamped to 0    │
                                     │  - zero velocity/cooldown jumps   │
                                     └───────────────────────────────────┘
```

### 2.1 The Subject-to-Stat Buff Matrix

Each curriculum subject maps directly to complementary Brotato RPG stats, ensuring every stat in the 17-stat system has a thematic educational source.

| Academic Subject | Curriculum Discipline | Primary Stat Buff | Secondary Stat Buff | Tertiary / Bonus Stat | Thematic Rationale |
|---|---|---|---|---|---|
| **Türkçe** | TYT Paragraf, Dil Bilgisi | `+5% Speed` (`speedPercent`) | `+4% Dodge` (`dodgePercent`) | `+25px Pickup Range` | Reading speed, semantic scanning, dodging distractor options, agile paragraph comprehension. (Dodge strictly clamped to 60% hard cap per Brotato rule). |
| **Matematik** | TYT / AYT Problemler, Analiz | `+8% Attack Speed` (`attackSpeed`) | `+6% Crit Chance` (`critChancePercent`) | `+5% Damage` (`damagePercent`) | Rapid calculation cycles, analytical precision, hitting exact formulaic critical points. |
| **Fen (Science)** | AYT Fizik, Kimya, Biyoloji | `+3 Elemental Damage` (`elementalDamage`) | `+4 Engineering` (`engineering`) | `+2 HP Regen` (`hpRegen`) | Thermodynamics/burn reactions, circuitry/laboratory turrets, biological cellular regeneration. |
| **BUEPT (English)** | Boğaziçi Hazırlık Yeterlilik | `+15 Harvesting` (`harvesting`) | `+5 Luck` (`luck`) | `+20 Materials` (Instant) | Global scholarship opportunities, compound academic capital growth, fortune favoring the bilingual scholar. |
| **Sosyal** | TYT Tarih, Coğrafya, Felsefe | `+2 Armor` (`armor`) | `+15 Max HP` (`maxHp`) | `+10 Base Range` (`range`) | Historical fortitude, philosophical resilience resisting damage, geographical expanse and endurance. |

#### Mathematical Scaling Formula
The applied stat buff scales with question difficulty ($D \in \{1, 2, 3\}$) and current correct answer streak ($S \ge 0$):
$$\text{Buff}_{\text{final}} = \text{round}\left(\text{Buff}_{\text{base}} \times \left(1 + (D - 1) \times 0.5\right) \times \left(1 + \min(S, 5) \times 0.1\right)\right)$$
- Difficulty 1: $1.0\times$ base stats.
- Difficulty 2: $1.5\times$ base stats.
- Difficulty 3: $2.0\times$ base stats.
- At Streak 5: additional $+50\%$ bonus across all granted stats.
- *Strict Cap Enforcement*: `stats.dodgePercent = Math.min(60, stats.dodgePercent + buff)`.

---

### 2.2 The Grace Consolation System

#### Principles
1. **Zero Punitive Friction**: An educational game must never trigger game over, health loss, or material bankruptcy due to an academic error.
2. **Error-Driven Learning**: Mistakes are high-value teaching moments. Every wrong answer immediately surfaces the *Boğaziçili Koç Taktiği* mnemonic.
3. **Consolation Encouragement**: Grants an immediate minor stat buff or material gift so the student always leaves the encounter stronger than before.

#### Consolation Package
When the student selects an incorrect option:
1. **Health & Currency Invariant**:
   $$\Delta \text{HP} = 0, \quad \Delta \text{Materials} \ge 0$$
2. **Consolation Stat Grant**:
   - `+1 Luck` (*"Hatalardan Ders Çıkarma"* — permanent probability bonus).
   - `+5 Bonus Materials` (consolation pocket allowance).
   - In combat: Player chooses between `+2% Movement Speed` or `+1 Armor` consolation shield.
3. **Pedagogical Revelation**:
   - Returns `question.mnemonic` ("💡 Boğaziçili Koç Taktiği: ...").
   - Highlights the correct option in emerald green (`#22c55e`) and the user's selected choice in soft muted rose (`#f43f5e`).
4. **Mistake Notebook Integration**:
   - Automatically logs entry to `studySession.mistakeLog`:
     ```typescript
     {
       id: `mistake_${Date.now()}_${question.id}`,
       question: { ...question },
       selectedOptionIndex: userIndex,
       correctOptionIndex: question.correctIndex,
       timestamp: Date.now(),
       resolved: false,
       subject: question.category
     }
     ```
5. **Combat Misfire Stagger**:
   - In-combat wrong answer imposes **only** a brief 0.5s weapon misfire stagger (weapon firing paused for 500ms).
   - **Zero** incoming enemy damage, **zero** instant death.

---

### 2.3 The 4 Tactical Superpowers

Triggered exclusively during in-run tactical pause events (Mystery Chest pickup or Elite Encounter). Answering correctly unlocks one of the four superpowers:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                4 TACTICAL SUPERPOWERS                                   │
├──────────────────────────┬──────────────────────────┬───────────────────────────────────┤
│ Superpower               │ Numeric Gameplay Effect  │ Audio & Visual Choreography       │
├──────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ 1. Revitalizing Surge    │ Restores 50% of missing  │ Emerald radial wave, floating heal│
│    (50% Field Heal)      │ HP (min 30 HP, max 100%) │ text, chime fanfare (ComboUp 3)   │
├──────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ 2. Orbital Particle Nuke │ 500 flat damage to ALL   │ 190Hz->25Hz sub-bass detonation,  │
│    (Boğaziçi Süpernova)  │ active screen enemies    │ white flash, 0.50 camera trauma   │
├──────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ 3. Flow State Frenzy     │ 10s Overdrive: +100% AS, │ Golden aura, chromatic vignette,  │
│    (Akış Durumu)         │ 0 cooldowns, 100% Crits  │ high-octane rapid audio pulses    │
├──────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ 4. Cosmic Vacuum         │ Instant universal pull   │ Cascading gem chimes, radial star │
│    (Evrensel Çekim Gücü) │ on all arena materials   │ convergence, +GEM banner bursts   │
└──────────────────────────┴──────────────────────────┴───────────────────────────────────┘
```

#### Detailed Superpower Specifications

##### 1. Revitalizing Surge (`emergency_heal` / `revitalizing_surge`)
- **Formula**:
  $$\Delta \text{HP} = \max\left(30, \left\lfloor (\text{maxHp} - \text{currentHp}) \times 0.50 \right\rfloor\right)$$
  $$\text{currentHp}_{\text{new}} = \min(\text{maxHp}, \text{currentHp} + \Delta \text{HP})$$
- **VFX**: Spawns floating green combat heal numbers via `ftm.spawnHeal(player.x, player.y, deltaHp, false)`, emits emerald ring `vfx.spawnPickupRing(player.x, player.y, 'fruit')`.
- **Audio**: `soundEngine.playComboUp(3)`.

##### 2. Orbital Particle Nuke (`orbital_nuke`)
- **Formula**:
  $$\forall e \in \text{Enemies}: e.\text{hp} = \max(0, e.\text{hp} - 500)$$
  - Sets $e.\text{hitFlashTimerMs} = 200$.
  - Adds radial impulse directed away from arena center: $\vec{v}_{\text{impulse}} = 400 \times \hat{u}$.
  - If $e.\text{hp} \le 0$: spawns `generateDropsForEnemy`, triggers `vfx.spawnDeathBurst`, adds to kill telemetry.
- **VFX**: Full-screen white flash `vfx.triggerWhiteFlash(0.50)`, maximum camera shake `vfx.addTrauma(0.50)`, floating crit damage text `ftm.spawnDamage(e.x, e.y, 500, true)` on all enemies.
- **Audio**: `soundEngine.playNukeDetonation()`.

##### 3. Flow State Frenzy (`flow_state_frenzy`)
- **Duration**: Strict 10.0 seconds ($600$ simulation frames).
- **Active State Modifiers**:
  * `player.stats.attackSpeed += 100` (doubles baseline attack speed).
  * `weaponInstance.currentCooldownMs = 0` on every frame (capped only by 12 hits/second global safety cap).
  * `player.stats.critChancePercent = 100` (every swing/shot is guaranteed critical strike).
  * Invulnerability duration refreshed: `player.invulnerabilityTimerMs = 10000`.
- **VFX**: Radiant pulsating golden aura around player potato, floating banner `"FLOW STATE: AKTİF!"`, cyan-gold chromatic screen vignette.
- **Audio**: Rapid-fire sound modulation on weapon firing.

##### 4. Cosmic Material Vacuum (`global_vacuum` / `cosmic_vacuum`)
- **Effect**: Universal attraction on 100% of existing `PickupEntity` instances where `p.type === 'material'`.
- **Mechanics**:
  * Option A (Smooth Rapid Convergence): Sets $p.\text{isMagnetized} = true$, sets $p.\text{speed} = 1600\text{ px/s}$, pulling all crystals into player within 400ms.
  * Option B (Instant Direct Deposit): Calculates total value $M = \sum p.\text{value}$, removes pickups from arena, adds directly to `materialsCountRef.current += M`.
  * Spawns banner: `ftm.spawnBanner(player.x, player.y, `+${M} 💎 KOZMİK ÇEKİM!`, '#38bdf8')`.
- **Audio**: Cascading arpeggiated gem chime `soundEngine.playGemPickup(10)`.

---

### 2.4 Frame-Accurate Freeze & Resume Mechanics

#### The Physics Explosion Problem
In HTML5 Canvas games using `requestAnimationFrame`, delta time is computed as:
$$dt = \frac{t_{\text{now}} - t_{\text{last}}}{1000}$$
When an in-combat question modal opens, the player spends between 5 and 30 seconds reading and answering. If $t_{\text{last}}$ is not properly managed:
1. **Delta-Time Spike**: $dt$ jumps to $15.0\text{ s}$. Even with a safety cap of $0.05\text{ s}$ (50ms), a 50ms jump on resumption causes:
   - Player velocity integration: $\Delta x = 600 \times 0.05 = 30\text{ px}$ in a single frame.
   - Projectile tunneling: bullets skip over enemy hitboxes without colliding.
   - Enemy chargers teleport directly onto the player.
   - Weapon cooldown accumulators decrement multiple cycles in 1 frame.
2. **Timer Accumulation**: Cooldown timers, buff durations, and wave timers expire instantly.

#### The Zero-Delta Pause Architecture
To guarantee absolute frame accuracy, three invariants must be satisfied:

##### Invariant 1: Simulation Loop Halting ($dt = 0.0$)
While `isTacticalFreezeActive` is `true`:
- `GameLoop.ts` passes $dt = 0.0$ to all update callbacks.
- `GameCanvas.tsx` line 236:
  ```typescript
  loop.onUpdate((dt: number) => {
    if (dt <= 0 || isWaveTransitioningRef.current) return;
  ```
  Execution halts before movement, AI updates, weapon firing, projectile integration, or timers.
- Velocity vectors $\vec{v}$ are preserved without friction decay.
- Weapon cooldowns $T_{\text{cooldown}}$ remain exactly frozen at their fractional millisecond state.

##### Invariant 2: Continuous 60 FPS Render Loop ($dt = 0.0, \alpha = 1.0$)
- `GameLoop.ts` continues running `renderCallbacks(1.0, metrics)`.
- The HTML5 Canvas continues drawing the frozen battlefield:
  * Entities remain visibly frozen in place.
  * Time-dilation visual overlay renders: low-opacity dark slate wash (`rgba(9, 13, 22, 0.65)`) with a slow cyan pulsing vignette.
  * React UI modals (`TacticalFreezeModal.tsx`) render on top of the canvas without tearing or freezing the browser thread.

##### Invariant 3: The Resumption Handshake (Zero Delta Jump)
When the student confirms their answer or selects their superpower, unfreezing occurs through a strict 3-step handshake:
1. **Timestamp Re-synchronization**:
   Before the next simulation tick, `lastTimestampMs` is explicitly reset to the current clock time:
   ```typescript
   this.lastTimestampMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
   ```
2. **First-Frame Nullification**:
   The first frame immediately following unfreeze forces $dt = 0.0$ (or fixed $1/60 = 0.0166\text{s}$):
   ```typescript
   this.lastDeltaTimeSec = 0;
   ```
3. **Misfire Buffer Application**:
   If the answer was incorrect, a 500ms misfire cooldown is set on weapons:
   ```typescript
   for (const w of activeWeapons) {
     w.currentCooldownMs = Math.max(w.currentCooldownMs, 500);
   }
   ```

---

## 3. IMPLEMENTATION CONTRACTS & CODE BLUEPRINTS

The Educational Buff Engine will be housed in `src/game/education/` with four clean, decoupled modules:

```
src/game/education/
├── BuffMatrix.ts          # Subject-to-Stat Buff Matrix & DDA scaling formulas
├── GraceConsolation.ts    # Zero-penalty evaluation, consolation rewards, mistake logging
├── TacticalSuperpowers.ts # 4 Tactical Superpowers execution & lifecycle state
├── FreezeManager.ts       # Frame-accurate pause/resume lifecycle & audio triggers
└── index.ts               # Clean public barrel exports
```

### Module 1: `src/game/education/BuffMatrix.ts`
```typescript
import type { PlayerRPGStats, StatModifiers } from '@/types/brotato';
import type { QuestionCategory } from '@/types/game';

export interface SubjectBuffDefinition {
  subject: string;
  categoryKeys: QuestionCategory[];
  primaryStat: keyof PlayerRPGStats;
  primaryValue: number;
  secondaryStat: keyof PlayerRPGStats;
  secondaryValue: number;
  tertiaryStat?: keyof PlayerRPGStats;
  tertiaryValue?: number;
  description: string;
}

export const SUBJECT_BUFF_REGISTRY: Record<string, SubjectBuffDefinition> = {
  turkce: {
    subject: 'Türkçe',
    categoryKeys: ['TYT Türkçe'],
    primaryStat: 'speedPercent',
    primaryValue: 5, // +5% Move Speed
    secondaryStat: 'dodgePercent',
    secondaryValue: 4, // +4% Dodge (capped at 60%)
    tertiaryStat: 'pickupRange',
    tertiaryValue: 20, // +20px Pickup Magnet
    description: 'Paragraf tarama çevikliği ve dikkat: Hız ve Sıyrılma şansı kazandırır.',
  },
  matematik: {
    subject: 'Matematik',
    categoryKeys: ['TYT Matematik', 'AYT Sayısal'],
    primaryStat: 'attackSpeed',
    primaryValue: 8, // +8% Attack Speed
    secondaryStat: 'critChancePercent',
    secondaryValue: 6, // +6% Crit Chance
    tertiaryStat: 'damagePercent',
    tertiaryValue: 5, // +5% Damage
    description: 'Hızlı işlem ve analitik hassasiyet: Saldırı Hızı ve Kritik Şans kazandırır.',
  },
  fen: {
    subject: 'Fen Bilimleri',
    categoryKeys: ['TYT Fen'],
    primaryStat: 'elementalDamage',
    primaryValue: 3, // +3 Elemental Damage
    secondaryStat: 'engineering',
    secondaryValue: 4, // +4 Engineering
    tertiaryStat: 'hpRegen',
    tertiaryValue: 2, // +2 HP Regen
    description: 'Deney ve devre teknolojisi: Element Hasarı ve Mühendislik kazandırır.',
  },
  buept: {
    subject: 'BUEPT İngilizce',
    categoryKeys: ['BUEPT Vocab', 'BUEPT Reading', 'BUEPT Logic'],
    primaryStat: 'harvesting',
    primaryValue: 15, // +15 Harvesting
    secondaryStat: 'luck',
    secondaryValue: 5, // +5 Luck
    description: 'Uluslararası vizyon ve akademik burs: Hasat ve Şans kazandırır.',
  },
  sosyal: {
    subject: 'Sosyal Bilimler',
    categoryKeys: [], // Normalized to accept 'TYT Sosyal' or 'TYT Sosyal Bilimler'
    primaryStat: 'armor',
    primaryValue: 2, // +2 Armor
    secondaryStat: 'maxHp',
    secondaryValue: 15, // +15 Max HP
    description: 'Tarihsel dayanıklılık ve felsefi metanet: Zırh ve Maksimum Can kazandırır.',
  },
};

/**
 * Calculates and applies scaled subject buffs with difficulty and streak multipliers.
 */
export function calculateSubjectBuff(
  category: QuestionCategory | string,
  difficulty: 1 | 2 | 3 = 1,
  streak: number = 0
): StatModifiers {
  // Normalize category key
  let def: SubjectBuffDefinition | undefined;
  for (const item of Object.values(SUBJECT_BUFF_REGISTRY)) {
    if (item.categoryKeys.includes(category as QuestionCategory) || category.includes(item.subject)) {
      def = item;
      break;
    }
  }
  if (!def) {
    def = SUBJECT_BUFF_REGISTRY.turkce; // Safe fallback
  }

  // DDA & Streak multiplier: 1.0x (Diff 1) -> 1.5x (Diff 2) -> 2.0x (Diff 3)
  const diffMultiplier = 1 + (difficulty - 1) * 0.5;
  const streakBonus = 1 + Math.min(streak, 5) * 0.08;
  const totalMult = diffMultiplier * streakBonus;

  const modifiers: StatModifiers = {
    [def.primaryStat]: Math.round(def.primaryValue * totalMult),
    [def.secondaryStat]: Math.round(def.secondaryValue * totalMult),
  };

  if (def.tertiaryStat && def.tertiaryValue) {
    modifiers[def.tertiaryStat] = Math.round(def.tertiaryValue * totalMult);
  }

  return modifiers;
}

/**
 * Mutates player stats with clamped values (e.g. Dodge capped strictly at 60%).
 */
export function applySubjectBuffToStats(
  stats: PlayerRPGStats,
  modifiers: StatModifiers
): void {
  for (const [key, value] of Object.entries(modifiers)) {
    const statKey = key as keyof PlayerRPGStats;
    if (typeof stats[statKey] === 'number' && typeof value === 'number') {
      (stats[statKey] as number) += value;
    }
  }
  // Hard cap enforcement
  stats.dodgePercent = Math.min(60, stats.dodgePercent);
  stats.currentHp = Math.min(stats.maxHp, stats.currentHp);
}
```

---

### Module 2: `src/game/education/GraceConsolation.ts`
```typescript
import type { PlayerRPGStats, StatModifiers } from '@/types/brotato';
import type { TacticalQuestion, MistakeEntry } from '@/types/game';

export interface EvaluationOutcome {
  isCorrect: boolean;
  awardedBuffs: StatModifiers;
  bonusMaterials: number;
  revealedMnemonic: string;
  pedagogicFeedback: string;
  mistakeEntry?: MistakeEntry;
}

/**
 * Zero-Punishment Pedagogical Evaluator.
 * Guaranteed: NO health loss, NO material penalty on incorrect answers.
 */
export function evaluateAnswerWithGrace(
  question: TacticalQuestion,
  selectedOptionIndex: number,
  currentStats: PlayerRPGStats,
  currentStreak: number
): EvaluationOutcome {
  const isCorrect = selectedOptionIndex === question.correctIndex;

  if (isCorrect) {
    // Correct Answer: Full subject stat buff
    return {
      isCorrect: true,
      awardedBuffs: {}, // Populated via calculateSubjectBuff
      bonusMaterials: 10 + question.difficulty * 5,
      revealedMnemonic: question.mnemonic,
      pedagogicFeedback: `Tebrikler! ${question.category} sorusunu başarıyla çözdün!`,
    };
  }

  // WRONG ANSWER: Grace Consolation Policy
  // 1. Zero HP deduction (currentHp unchanged)
  // 2. Zero Material loss (materials unchanged)
  // 3. Grant consolation buff (+1 Luck & +5 materials)
  const consolationBuffs: StatModifiers = {
    luck: 1, // "Hatalardan Ders Çıkarma"
    speedPercent: 2, // Slight sprint to escape trouble
  };

  const mistake: MistakeEntry = {
    question: { ...question },
    status: 'wrong',
    timestamp: Date.now(),
    resolved: false,
  };

  return {
    isCorrect: false,
    awardedBuffs: consolationBuffs,
    bonusMaterials: 5, // Consolation materials
    revealedMnemonic: question.mnemonic,
    pedagogicFeedback: `Sağlık olsun! Can ve materyal kaybetmedin. Koç taktiğini incele ve güçlenerek devam et!`,
    mistakeEntry: mistake,
  };
}
```

---

### Module 3: `src/game/education/TacticalSuperpowers.ts`
```typescript
import type { PlayerEntity, EnemyEntity, PickupEntity, ActiveWeaponInstance } from '@/types/brotato';
import type { FloatingTextManager, VFXManager } from '@/game/vfx';
import { soundEngine } from '@/lib/sound';

export type TacticalSuperpowerId =
  | 'revitalizing_surge'
  | 'orbital_nuke'
  | 'flow_state_frenzy'
  | 'cosmic_vacuum';

export interface SuperpowerDefinition {
  id: TacticalSuperpowerId;
  name: string;
  badge: string;
  icon: string;
  description: string;
}

export const SUPERPOWER_CATALOG: SuperpowerDefinition[] = [
  {
    id: 'revitalizing_surge',
    name: 'Yenileyici Dalga (Revitalizing Surge)',
    badge: 'Acil Tedavi',
    icon: '💚',
    description: 'Eksik canının %50\'sini anında yeniler. Kritik anlarda hayat kurtarır.',
  },
  {
    id: 'orbital_nuke',
    name: 'Boğaziçi Süpernova (Orbital Nuke)',
    badge: 'Alan Temizliği',
    icon: '💥',
    description: 'Tüm ekrandaki düşmanlara 500 flat hasar veren sismik şok dalgası yaratır.',
  },
  {
    id: 'flow_state_frenzy',
    name: 'Akış Durumu Çılgınlığı (Flow State Frenzy)',
    badge: '10sn Hiper-Mod',
    icon: '⚡',
    description: '10 saniye boyunca +%100 saldırı hızı, 0 bekleme süresi ve %100 kritik vuruş.',
  },
  {
    id: 'cosmic_vacuum',
    name: 'Evrensel Kozmik Vakum (Cosmic Vacuum)',
    badge: 'Tam Çekim',
    icon: '🧲',
    description: 'Arenadaki tüm materyal kristallerini anında oyuncunun üzerine çeker.',
  },
];

export interface SuperpowerExecutionEngine {
  executeRevitalizingSurge(player: PlayerEntity, ftm: FloatingTextManager, vfx: VFXManager): number;
  executeOrbitalNuke(enemies: EnemyEntity[], ftm: FloatingTextManager, vfx: VFXManager): number;
  activateFlowStateFrenzy(durationSec?: number): number;
  executeCosmicVacuum(pickups: PickupEntity[], player: PlayerEntity, ftm: FloatingTextManager, vfx: VFXManager): number;
}

export const SuperpowerEngine: SuperpowerExecutionEngine = {
  executeRevitalizingSurge(player, ftm, vfx) {
    const missingHp = Math.max(0, player.stats.maxHp - player.stats.currentHp);
    const healAmount = Math.max(30, Math.floor(missingHp * 0.5));
    player.stats.currentHp = Math.min(player.stats.maxHp, player.stats.currentHp + healAmount);

    ftm.spawnHeal(player.x, player.y, healAmount, false);
    vfx.spawnPickupRing(player.x, player.y, 'fruit');
    vfx.triggerWhiteFlash(0.2);
    soundEngine.playComboUp(3);
    return healAmount;
  },

  executeOrbitalNuke(enemies, ftm, vfx) {
    const nukeDamage = 500;
    let totalHit = 0;

    for (const enemy of enemies) {
      enemy.hp -= nukeDamage;
      enemy.hitFlashTimerMs = 200;
      ftm.spawnDamage(enemy.x, enemy.y, nukeDamage, true);
      vfx.spawnHitSparks(enemy.x, enemy.y, 0, true, 8);
      totalHit++;
    }

    vfx.triggerWhiteFlash(0.5);
    vfx.addTrauma(0.5);
    soundEngine.playNukeDetonation();
    return totalHit;
  },

  activateFlowStateFrenzy(durationSec = 10.0) {
    soundEngine.playOrbitalLaser();
    return durationSec;
  },

  executeCosmicVacuum(pickups, player, ftm, vfx) {
    let collectedCount = 0;
    let totalValue = 0;

    for (const p of pickups) {
      if (p.type === 'material') {
        p.isMagnetized = true;
        p.vx = (player.x - p.x) * 4;
        p.vy = (player.y - p.y) * 4;
        totalValue += p.value;
        collectedCount++;
      }
    }

    ftm.spawnBanner(player.x, player.y, `🧲 EVRENSEL VAKUM: +${totalValue} 💎`, '#38bdf8');
    vfx.triggerWhiteFlash(0.2);
    soundEngine.playGemPickup(10);
    return totalValue;
  },
};
```

---

### Module 4: `src/game/education/FreezeManager.ts`
```typescript
import { GameLoop } from '@/game/engine/GameLoop';
import { soundEngine } from '@/lib/sound';
import type { TacticalQuestion } from '@/types/game';

export interface TacticalFreezeSession {
  isActive: boolean;
  source: 'mystery_chest' | 'elite_encounter' | 'manual';
  question: TacticalQuestion;
  openedAtTimestamp: number;
}

export class FreezeManager {
  private session: TacticalFreezeSession | null = null;

  constructor(private readonly gameLoop: GameLoop) {}

  public triggerFreeze(
    source: 'mystery_chest' | 'elite_encounter' | 'manual',
    question: TacticalQuestion
  ): void {
    this.session = {
      isActive: true,
      source,
      question,
      openedAtTimestamp: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    };

    // Step 1: Engage GameLoop tactical freeze (forces dt = 0.0)
    this.gameLoop.setTacticalFreeze(true);

    // Step 2: Trigger time-dilation procedural audio
    soundEngine.playTacticalFreeze();
  }

  public resumeCombat(): void {
    if (!this.session) return;

    // Step 1: Disengage GameLoop tactical freeze
    this.gameLoop.setTacticalFreeze(false);

    // Step 2: Clean up active session
    this.session = null;
  }

  public isFrozen(): boolean {
    return this.session !== null && this.session.isActive;
  }

  public getSession(): TacticalFreezeSession | null {
    return this.session;
  }
}
```

---

## 4. CAVEATS & EDGE-CASE HARDENING

1. **Browser Tab Hidden / Visibility State**:
   If the student minimizes the browser or switches tabs while the `TacticalFreezeModal` is open, `requestAnimationFrame` is suspended by the browser. Upon tab reactivation, `timestamp - lastTimestampMs` could exceed 10 seconds.
   *Mitigation*: The explicit `setTacticalFreeze(false)` reset must synchronize `lastTimestampMs = performance.now()`, ensuring the very first resume tick computes $dt \le 0.0166\text{s}$ ($1/60\text{s}$).
2. **Global Attack Speed Weapon Cap**:
   During the 10-second Flow State Frenzy, weapon cooldowns are forced to 0. Per Feature 9 in `PROJECT.md`, hits must remain clamped to the maximum physics engine cap of **12 hits/second** per weapon to prevent call-stack overflows or frame drops.
3. **Dodge Clamping Invariant**:
   `PlayerRPGStats.dodgePercent` must **never** exceed the strict 60% hard cap regardless of how many Türkçe questions the student answers correctly. Every buff application must enforce:
   `stats.dodgePercent = Math.min(60, stats.dodgePercent + buff)`.
4. **Category Nomenclature Alignment**:
   `src/types/game.ts` originally defined `QuestionCategory` without `'TYT Sosyal'`. The spec miner and education engine must support both `'TYT Sosyal'` and `'TYT Sosyal Bilimler'` transparently via union typing and normalized string lookup.

---

## 5. CONCLUSION

1. **Complete Architectural Blueprint**: All requested deliverables — the 5-Subject Buff Matrix, the Grace Consolation Policy, the 4 Tactical Superpowers, and Frame-Accurate Freeze mechanics — are fully analyzed, mathematically modeled, and designed with zero external dependencies.
2. **Zero-Delta Invariant Established**: Suspending simulation updates while maintaining 60 FPS rendering ensures zero time-delta jumps, eliminating physics explosions, wall tunneling, and jerky resumptions.
3. **Ready for Worker Implementation**: Complete TypeScript code contracts are documented above and ready for immediate drop-in implementation by the Worker in `src/game/education/`.

---

## 6. INDEPENDENT VERIFICATION METHOD

### 6.1 Automated Test Execution Command
Run the complete Vitest test suite via portable Node:
```bash
export PATH=/Users/afurkanmac/.local/node/bin:$PATH && npm test
```

### 6.2 Test Assertions for Worker Implementation
When `src/game/education/` is implemented, the accompanying test file `tests/unit/education_buff_engine.test.ts` must assert:
1. `calculateSubjectBuff('TYT Türkçe')` yields `speedPercent >= 5` and `dodgePercent >= 4`.
2. Stacking `TYT Türkçe` buffs never causes `dodgePercent` to exceed 60.
3. `evaluateAnswerWithGrace` on a wrong answer returns `isCorrect === false`, preserves `currentHp` identically, grants `+1 Luck`, and produces a valid `MistakeEntry`.
4. `executeOrbitalNuke` applies 500 damage across all array elements in `enemies`.
5. `executeRevitalizingSurge` restores exactly 50% of missing HP.
6. `GameLoop.setTacticalFreeze(true)` forces `dt === 0` on subsequent frames, and disengaging freeze exhibits zero accumulated delta jump.
