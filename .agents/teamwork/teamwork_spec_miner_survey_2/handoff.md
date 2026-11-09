# Specification Report: Educational YKS/BUEPT Tactical Question-Buff System & Visual/Audio Asset Infrastructure

**Author**: `teamwork_spec_miner_survey_2` (Question Buff & Asset Spec Miner)  
**Date**: 2026-11-03  
**Status**: Comprehensive / Hard Handoff Deliverable  

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Question Schema | `TacticalQuestion` Data Model | Core schema holding ID, act, category, question type, difficulty rating, prompt, passage tokens, options, correct index, mnemonic, and time limit. | `TacticalQuestion` object | Validated question instance | Missing correctIndex or tokens throws schema validation error | `src/types/game.ts:26-38`, `src/data/questions.ts:50-235` |
| 2 | Question Schema | Dual Question Types | Supports both standard 4-option multiple choice (`multiple_choice`) and passage click evidence discovery (`evidence_hunt`). | `type: QuestionType`, options or passageTokens | Rendered interactive UI | If `passageTokens` lacks clue, fallback to index 0 | `src/types/game.ts:10`, `src/data/questions.ts:81-94` |
| 3 | Question Schema | Campaign Act Bifurcation | Segregates questions into YKS (`'yks'`) and Boğaziçi English Prep (`'buept'`) question decks. | `act: CampaignAct` | Filtered question deck | Unknown act defaults to 'yks' | `src/types/game.ts:1`, `src/data/questions.ts:50,136` |
| 4 | Question Curriculum | YKS TYT/AYT Subject Categories | Categorizes high-school exam questions across Mathematics, Science (Physics/Chemistry/Biology), and Turkish. | Category enum strings | Subject-specific routing and buff triggers | Fallback to 'TYT Matematik' | `src/types/game.ts:12-19` |
| 5 | Question Curriculum | BUEPT Academic English Categories | Categorizes university proficiency questions across Vocab, Reading, and Logic/Syntax. | Category enum strings | English skill buff triggers | Fallback to 'BUEPT Vocab' | `src/types/game.ts:17-19` |
| 6 | Inter-Wave Study | Inter-Wave Study Modal | Dedicated educational pause modal between combat waves inside the shop phase. | Active question, player wave context | Modal UI with 4 choice cards or passage tokens, and "Skip" button | If deck exhausted, reshuffle deck | `ORIGINAL_REQUEST.md:R4`, `src/components/SurvivorsArena.tsx:102` |
| 7 | Inter-Wave Study | 3-Choice Curriculum Buff Reward | On correct answer, player chooses 1 of 3 curriculum rewards: Subject-Themed Stat Boost, Instant Materials, or Shop Discount Coupon. | Correct answer event, subject category | Permanent stat delta, currency delta, or shop discount flag | Graceful clamp to stat caps | `ORIGINAL_REQUEST.md:R4` |
| 8 | Inter-Wave Study | Subject-Themed Stat Buffs | Ties curriculum subjects directly to Brotato RPG stats (Math -> Damage%, Biology -> HP Regen, Physics -> Speed, etc.). | Question category | Stat addition to player sheet | Rejects negative stat deltas | System Design & Stat Formulas |
| 9 | Inter-Wave Study | Grace & Consolation Policy | Answering incorrectly causes zero HP loss; grants consolation bonus (+1 Luck, +5 Materials) and displays Boğaziçi Koç Taktiği mnemonic. | Wrong answer event | Consolation rewards, mnemonic reveal, mistake entry | No punitive penalty; logs mistake | Educational Pedagogical Design |
| 10 | In-Run Tactical Events | Mystery Chest Arena Spawns | High-tech academic chests spawning at 50% wave duration or dropping guaranteed from Elite enemies. | Player collision with chest | Tactical event trigger, chest despawn | If combat ends while chest uncollected, auto-converts to materials | `ORIGINAL_REQUEST.md:R4`, `SurvivorsArena.tsx:412` |
| 11 | In-Run Tactical Events | Elite Challenge Event | Defeating an Elite enemy prompts a high-tier tactical question event. | Elite HP reaching 0 or elite challenge trigger | Immediate tactical freeze | If skipped, grants standard elite materials | `ORIGINAL_REQUEST.md:R4` |
| 12 | In-Run Tactical Events | Frame-Accurate Tactical Freeze | Full combat freeze pausing game simulation tick (dt=0), enemy movement, projectile vectors, and spawner intervals without state loss. | Pause command trigger | Frozen canvas state, lowpass audio filter, interactive overlay | Delta-time reset prevents physics explosion on unpause | `SurvivorsArena.tsx:103,186,281` |
| 13 | In-Run Tactical Events | Tactical Combat Rewards | Instant combat-altering rewards on correct tactical answer: Emergency 50% Heal, Boğaziçi Süpernova Nuke, Flow State Frenzy, or Global Vacuum. | Selected tactical reward | Immediate game state alteration (HP heal, area damage, frenzy buff, gem magnet) | Cooldown prevent spamming | System Design & Roguelite Mechanics |
| 14 | In-Run Tactical Events | Combat Wrong Answer Grace | Answering incorrectly during tactical freeze causes brief 0.5s weapon misfire stagger and grants minimal materials; no instant player death. | Wrong option click | Stagger float text, buzzer sound, unpause | Protects player from death spiral | System Design |
| 15 | Accuracy Tracker | Category Accuracy & Metrics | Real-time tracking of attempts, correct count, wrong count, streak, and accuracy percentage per category and overall. | Answer event (question ID, category, outcome, duration) | Updated `StudySessionTracker` state | Clamps accuracy between 0% and 100% | `src/types/game.ts:67-83` |
| 16 | Accuracy Tracker | Shop & Summary HUD Display | Displays active accuracy rate and streak in shop phase and comprehensive 5-axis spider chart in Game Over / Victory screen. | Session telemetry data | Radar chart SVG/Canvas, academic ranking title, mistake accordion | Handles zero attempts gracefully (default 0%) | `src/components/TelemetryModal.tsx:68-86` |
| 17 | Accuracy Tracker | Mistake Notebook & Review | Logs failed questions with timestamp and student choice for post-game remediation and revenge battles. | `MistakeEntry` array | Remediation modal with Boğaziçi Koç Taktiği mnemonics | Prevents duplicate unresolved entries | `src/types/game.ts:60-65` |
| 18 | Visual Infrastructure | Player Characters / Avatars | 4 distinct scholarly potato avatars (Potato Scholar, BUEPT Student, Engineer Potato, Mutant Tank Potato). | Avatar selection ID | Rendered sprite on canvas (56x56 px) | Missing sprite falls back to canvas procedural potato | `ORIGINAL_REQUEST.md:R3` |
| 19 | Visual Infrastructure | 5 Distinct Enemy Variants | 5 specialized enemy sprites: Basic Swarmer (Moth), Fast Rusher (Hound), Heavy Tank (Golem), Ranged Spitter (Eye Cultist), Elite Boss (Archon). | Enemy type enum | Rendered enemy sprites with hit flashes (32px to 96px) | Fallback to colored procedural circles | `ORIGINAL_REQUEST.md:R2,R3` |
| 20 | Visual Infrastructure | 7 Distinct Weapons | 4 ranged weapons (Pistol, Shotgun, SMG, Magic Wand) and 3 melee weapons (Knife, Sword, Wrench) with independent rotations and visuals. | Equipped weapon list & player aim angle | Rendered weapon sprites offset around player body | Unloaded texture falls back to vector geometry | `ORIGINAL_REQUEST.md:R2,R3` |
| 21 | Visual Infrastructure | Projectiles & Visual VFX | 5 projectile/VFX sprites (Plasma Bullet, Magic Orb, Acid Spit, Slash Arc, Nova Shockwave). | Active projectile list | Rendered particles & shockwaves | Out-of-bounds projectiles pruned cleanly | `SurvivorsArena.tsx:375-406` |
| 22 | Visual Infrastructure | Pickups & Collectibles | Visual sprites for Materials/Crystals, Health Fruits, and Mystery Chests. | Active pickup entities | Rendered items with floating animations | Magnet pull clamps distance to prevent overshoot | `SurvivorsArena.tsx:347-373` |
| 23 | Visual Infrastructure | Arena Floor & Boundaries | Seamless tileable dark slate tech floor texture with cyber grid lines and boundary barrier tiles. | Canvas dimensions (e.g. 1200x800) | Pattern-filled canvas background | Texture wrap clamp avoids seams | `SurvivorsArena.tsx:270-280` |
| 24 | Visual Infrastructure | UI & Category Stat Icons | 12 stat icons (HP, Damage, Speed, Armor, Luck, etc.) and curriculum category icons. | Stat sheet values | Rendered HUD & Shop badges | Fallback to Lucide React SVG icons | `src/components/SurvivorsArena.tsx:7` |
| 25 | Audio Engine | Procedural Sound Synthesis | Web Audio API oscillator/noise based sound engine (`ProceduralSoundEngine`) producing dynamic SFX without external audio asset downloads. | Method calls on `soundEngine` | Real-time synthesized audio waves | Suspended context automatically resumed on user gesture | `src/lib/sound.ts:9-19` |
| 26 | Audio Engine | Combat Sound Triggers | Specialized audio synthesizers for Pistol, Shotgun, SMG, Melee Swing, Magic Zap, Enemy Hurt, Enemy Death, Player Hurt, and Elite Spawn. | Combat collision and firing events | Synthesized sound playback | Polyphonic voices capped to prevent audio clipping | `src/lib/sound.ts:21-72` |
| 27 | Audio Engine | Tactical & Educational Audio | Specialized audio for Bullet-Time Whoosh, Correct Fanfare, Wrong Buzzer, Nuke Explosion, and Frenzy Siren. | Question and tactical trigger events | Synthesized multi-oscillator chords and ramps | Ducking audio prevents ear fatigue | `src/lib/sound.ts:38-55,92-107,127-144` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Question Deck Depletion | Player survives 20+ waves and answers all questions in deck | The system must not crash or return `undefined`. Deck is reshuffled, prioritizing questions previously answered incorrectly or skipped. |
| 2 | In-Run Tactical Freeze during Dash | Player hits a Mystery Chest while in mid-dash (speed = 95px/s) | Dash velocity and momentum are preserved in memory; tick timer is halted. Upon question completion, the dash resumes smoothly without teleporting through walls. |
| 3 | Multiple Rapid Projectiles on Pause | 50+ enemy bullets and player bullets in flight when question modal opens | All velocities (`vx`, `vy`) and lifespan timers are frozen. No projectile damage or collisions register while modal is open. |
| 4 | Evidence Hunt with No Clue Clicked | Player clicks neutral text token in an `evidence_hunt` question | Neutral tokens shake with a mild yellow warning ("Bu kelime zıtlık/kırılma taşımıyor, tekrar dene"); timer continues or remaining attempts decrement. |
| 5 | Stat Cap Clamping via Curriculum Buff | Player stacks +Turkish Dodge buffs exceeding 60% cap | Formula clamps final dodge value: `Math.min(0.60, currentDodge + buffValue)`. Excess dodge is displayed as capped in the stat sheet. |
| 6 | Inter-Wave Question Skip | Player clicks "Dersi As / Skip Question" in shop modal | Modal closes immediately; player proceeds to the weapon/item shop. No negative penalty or score loss is applied. Question returns to deck pool. |
| 7 | AudioContext Suspended by Browser Autoplay Policy | First game tick runs before player has clicked on the webpage | `getContext()` detects `ctx.state === 'suspended'` and calls `ctx.resume()` upon first mouse or keyboard interaction, preventing silent errors. |
| 8 | Rapid Material Pickup Audio Overload | Player uses Global Vacuum, collecting 40+ materials in 1 frame | Instead of launching 40 simultaneous audio nodes (which causes clipping distortion), the sound engine batches pickups into a pitch-escalating arpeggio with 0.04s throttle. |
| 9 | Elite Boss Spawns while Player HP < 10% | Wave timer hits elite threshold under critical health | Tactical Mystery Chest drops near player or elite challenge prompt activates, providing a viable lifeline opportunity (Emergency Heal or Nuke). |
| 10 | AI Image Generation Aspect Ratio & Padding | `generate_image` returns character with slight background border | Sprite renderer employs canvas chroma-keying (clearing `#000000` or `#ffffff` backgrounds) or strict centered bounding boxes to ensure clean transparent blitting. |

---

## 1. Observation

Direct examination of `/Users/afurkanmac/Downloads/hackhaton` revealed the following codebase structure and implementations:

1. **Question Data Source (`src/data/questions.ts`)**:
   - Lines 3-48 define `UNIT_CATALOG` (`knight`, `mage`, `golem`, `dragon`).
   - Lines 50-134 define `YKS_QUESTIONS` (6 items):
     * `yks-1`: `TYT Matematik`, `multiple_choice`, difficulty 1, timeLimit 20s. Mnemonic: `"💡 Boğaziçili Koç Taktiği: Toplamı terim sayısına böl..."`.
     * `yks-2`: `TYT Fen`, `multiple_choice`, difficulty 2, prompt on `F_net = 0` (Inertia).
     * `yks-3`: `TYT Türkçe`, `evidence_hunt`, difficulty 3, passageTokens with `text: 'oysaki', isClue: true`.
     * `yks-4`: `AYT Sayısal`, `multiple_choice`, difficulty 2, prompt on polynomial derivative local extrema.
     * `yks-5`: `TYT Fen`, `evidence_hunt`, difficulty 3, passageTokens with `text: 'her zaman', isClue: true`.
     * `yks-6`: `TYT Matematik`, `multiple_choice`, difficulty 2, 40-question net score problem.
   - Lines 136-235 define `BUEPT_QUESTIONS` (6 items):
     * `buept-1`: `BUEPT Vocab`, `multiple_choice`, difficulty 2, prompt: `"mitigate"`.
     * `buept-2`: `BUEPT Reading`, `evidence_hunt`, difficulty 3, passageTokens with `text: 'albeit', isClue: true`.
     * `buept-3`: `BUEPT Vocab`, `multiple_choice`, difficulty 2, prompt: `"ubiquitous"`.
     * `buept-4`: `BUEPT Logic`, `multiple_choice`, difficulty 2, prompt: `"Notwithstanding"`.
     * `buept-5`: `BUEPT Reading`, `evidence_hunt`, difficulty 3, passageTokens with `text: 'corroborate', isClue: true`.
     * `buept-6`: `BUEPT Vocab`, `multiple_choice`, difficulty 3, prompt: `"paradoxical"`.

2. **Game Type Contracts (`src/types/game.ts`)**:
   - `CampaignAct = 'yks' | 'buept'` (line 1).
   - `QuestionType = 'multiple_choice' | 'evidence_hunt'` (line 10).
   - `QuestionCategory = 'TYT Matematik' | 'TYT Fen' | 'TYT Türkçe' | 'AYT Sayısal' | 'BUEPT Vocab' | 'BUEPT Reading' | 'BUEPT Logic'` (lines 12-19).
   - `TacticalQuestion` has 11 properties (lines 26-38).
   - `TelemetryStats` tracks totals, accuracy counts, reaction ms, bpm, and skills (lines 67-83).

3. **Audio Architecture (`src/lib/sound.ts`)**:
   - Uses Web Audio API without external file dependencies (`ProceduralSoundEngine`, line 3).
   - Contains synthesis methods: `playHit()` (sawtooth 240->55Hz), `playComboUp()` (triangle chords), `playOrbitalLaser()` (sawtooth 980->90Hz), `playShieldBreak()` (multi-sine), `playWrongBuzz()` (sawtooth 150->112Hz), `playCashRegister()` (sine triad), `playVictoryFanfare()` (C5, E5, G5, C6 arpeggio), and `setKilyosStormAmbient()` (bandpass white noise loop).

4. **Prototype Interaction Analysis (`src/components/SurvivorsArena.tsx`)**:
   - Canvas size: 920x380 px.
   - Movement: WASD + mouse lerp + Space dash with cooldown (lines 108-124, 281-297).
   - Auto-fire weapon: Fires nearest mob every 380ms (lines 214-245).
   - Bullet-time level up modal triggered at `xp >= 100` (lines 367-370).
   - On correct answer: `soundEngine.playOrbitalLaser()`, weapon tier incremented, `onScoreGain(4.0, 45)`, nova shockwave dealing 12 damage to all mobs (lines 133-145).
   - On wrong answer: `soundEngine.playWrongBuzz()`, `onRecordMistake(currentQ, 'wrong')`, screen shake, float text `"SİLAH TUTUKLUK YAPTI!"` (lines 146-157).

5. **Build Environment & Execution**:
   - Command `export PATH="$HOME/.local/node/bin:$PATH" && node -v && npm -v` exited with code 0 (Node v22.14.0, npm 10.9.2).
   - Command `export PATH="$HOME/.local/node/bin:$PATH" && npm run build` exited with code 0 (production Next.js build clean).
   - Current assets: zero `.png` images found in project; images need to be generated or synthesized.

---

## 2. Logic Chain

1. **Pedagogical Gameplay Synthesis**:
   - In Brotato, pacing alternates between intense real-time wave survival (20-60s) and contemplative strategy in the shop.
   - Presenting an educational question directly inside combat without pausing risks frustrating the player due to high cognitive load (dodging swarms while reading academic text).
   - Therefore, the educational integration must operate on two distinct, balanced planes:
     * **Inter-Wave Study Phase**: In the peaceful inter-wave window, questions offer strategic, permanent RPG build upgrades (curriculum study buffs).
     * **In-Run Tactical Events**: In combat, events (mystery chests / elite challenges) invoke a **Frame-Accurate Tactical Freeze** ("Bullet-Time / Focus Mode"), converting high-stress exam anxiety into an empowering tactical superpower (nuke, emergency heal, invincibility).

2. **Curriculum Buff Alignment with Brotato Stats**:
   - To make YKS/BUEPT study intrinsically motivating, each academic subject must logically map to a distinct combat stat:
     * *Mathematics (TYT/AYT)* -> Calculation precision & destructive power -> **Damage % & Crit Chance**.
     * *Physics (TYT/AYT Fen)* -> Kinematics & velocity -> **Movement Speed & Range**.
     * *Chemistry (TYT/AYT Fen)* -> Reaction rates & kinetics -> **Attack Speed & Knockback**.
     * *Biology (TYT/AYT Fen)* -> Organic vitality & cellular repair -> **HP Regeneration & Max HP**.
     * *Turkish (TYT Türkçe)* -> Agility, nuance, and reflex -> **Dodge Chance & Pickup Magnet Range**.
     * *History (TYT/AYT Sosyal)* -> Fortification & resilience -> **Armor & Knockback Resistance**.
     * *Geography (TYT/AYT Sosyal)* -> Resource exploration & map knowledge -> **Harvesting & Material Drop Value**.
     * *Philosophy (TYT/AYT Sosyal)* -> Luck & existential insight -> **Luck & Life Steal**.
     * *BUEPT English (Vocab/Reading/Logic)* -> Academic scholarship & university prestige -> **Harvesting (Scholarship Gold) & Shop Discounts**.

3. **Zero-Frustration Penalty Philosophy**:
   - Punishing students with death or gold loss when they answer incorrectly breeds exam anxiety and resentment.
   - Instead, incorrect answers grant **grace and consolation**:
     * Revealing the memorable **Boğaziçi Koç Taktiği** mnemonic for immediate learning.
     * Granting a small consolation reward (+1 Luck: "Hatalardan ders çıkarma tecrübesi" + 5 Materials).
     * Logging the question into the **Mistake Notebook** for review and revenge battles.

4. **Visual Asset System Cohesion**:
   - Brotato's visual language relies on expressive, quirky potato characters, distinct geometric silhouette enemies, and glowing, high-contrast weapons against dark arena floors.
   - Using a consistent 1:1 aspect ratio with bold dark outlines and vibrant neon accents ensures that AI-generated assets will blend seamlessly when drawn to an HTML5 Canvas.

5. **Procedural Web Audio Engine Scalability**:
   - External MP3/WAV files can cause network lag, loading pop-ins, and asset licensing issues.
   - Synthesizing all sounds procedurally via the Web Audio API guarantees zero network latency, instant startup, dynamic pitch scaling (e.g. arpeggiating consecutive material pickups), and low-pass filter manipulation during tactical pause.

---

## 3. Caveats

1. **Expanded Question Bank Coverage**: While `src/data/questions.ts` currently contains 12 high-yield questions (6 YKS, 6 BUEPT), a full 20-wave run requires an expanded question pool (at least 25-30 questions) across all specified subjects (History, Geography, Philosophy, Chemistry, Biology) so questions do not repeat excessively in a single playthrough.
2. **AI Image Background Transparency**: The `generate_image` tool outputs JPEG/PNG images that may contain a solid black or dark background. In canvas rendering, either clean canvas pixel chroma-keying (clearing RGB < 15,15,15) or SVG mask containers should be used if the image background is not natively transparent.
3. **Web Audio Browser Interaction Requirement**: Browsers block audio playback until the first user interaction (`pointerdown` or `keydown`). The game architecture must maintain a global gesture listener that resumes `AudioContext` on first touch.

---

## 4. Conclusion & Technical Specifications

### 4.1 Subsystem 1: Educational YKS / BUEPT Tactical Question-Buff System

#### A. Question Schema & Category Expansion

Extend `src/types/game.ts` with comprehensive category definitions:

```typescript
export type CampaignAct = 'yks' | 'buept';

export type QuestionType = 'multiple_choice' | 'evidence_hunt';

export type QuestionCategory =
  // YKS Subjects
  | 'TYT Matematik'
  | 'AYT Matematik'
  | 'TYT Türkçe'
  | 'TYT Fizik'
  | 'TYT Kimya'
  | 'TYT Biyoloji'
  | 'TYT Tarih'
  | 'TYT Coğrafya'
  | 'TYT Felsefe'
  // BUEPT Subjects
  | 'BUEPT Vocab'
  | 'BUEPT Reading'
  | 'BUEPT Logic'
  | 'BUEPT Grammar';

export interface PassageToken {
  text: string;
  isClue?: boolean;
}

export interface TacticalQuestion {
  id: string;
  act: CampaignAct;
  category: QuestionCategory;
  type: QuestionType;
  difficulty: 1 | 2 | 3; // 1 = Easy (TYT), 2 = Medium (AYT/BUEPT), 3 = Boss/Advanced
  prompt: string;
  passageTokens?: PassageToken[]; // For evidence_hunt
  options?: string[];             // 4 options for multiple_choice
  correctIndex?: number;          // 0..3
  mnemonic: string;               // Boğaziçili Koç Taktiği / Kilyos Notu
  timeLimitSec: number;
}
```

#### B. Inter-Wave Study Phase Design

```
+-------------------------------------------------------------+
|               📚 BOĞAZİÇİ KÜTÜPHANE ETÜDÜ (Wave End)        |
+-------------------------------------------------------------+
|  Kategori: [TYT Matematik]             Soru Zorluğu: ⭐⭐   |
|                                                             |
|  "Ardışık 5 tek tam sayının toplamı 85 olduğuna göre,       |
|   bu sayıların en büyüğü kaçtır?"                           |
|                                                             |
|  [ A: 17 ]      [ B: 19 ]      [ C: 21 (Doğru) ]   [ D: 23 ]|
+-------------------------------------------------------------+
|   [Dersi As / Mağazaya Geç (No Penalty)]                    |
+-------------------------------------------------------------+
```

1. **Flow & Lifecycle**:
   - Triggered automatically when Wave Timer expires and remaining materials are vacuumed into player balance.
   - Modal renders over darkened arena before entering shop or embedded at the top of the Inter-Wave Shop.
   - Player can answer the question or click **"Dersi As / Pas Geç"** (instantly opens shop without penalty).

2. **Reward Structure (Choice of 3 on Correct Answer)**:
   When answered correctly, player is presented with 3 buff cards to choose 1:
   - **Card 1: Subject Stat Master**: Permanent stat bonus mapped directly to subject:
     * *TYT/AYT Matematik*: `+8% Hasar (Damage)` OR `+6% Kritik İhtimali (Crit Chance)`
     * *TYT Fizik*: `+6% Hareket Hızı (Speed)` OR `+15 Menzil (Range)`
     * *TYT Kimya*: `+10% Saldırı Hızı (Attack Speed)` OR `+3 Geri İtme (Knockback)`
     * *TYT Biyoloji*: `+2 Can Yenileme/sn (HP Regen)` OR `+10 Maksimum Can (Max HP)`
     * *TYT Türkçe*: `+5% Kaçınma (Dodge, max 60%)` OR `+25 Mıknatıs Menzili (Pickup Magnet)`
     * *TYT Tarih*: `+3 Zırh (Armor)` OR `+15% Darbe Direnci`
     * *TYT Coğrafya*: `+12 Hasat (Harvesting)` OR `+10% Kristal Değeri`
     * *TYT Felsefe*: `+6 Şans (Luck)` OR `+4% Can Çalma (Life Steal)`
     * *BUEPT (Vocab/Reading/Grammar)*: `+18 Hasat (Akademik Burs)` OR `+10% Tecrübe Çarpanı`
   - **Card 2: Hızlı Burs Fonu (Instant Materials)**:
     * Grants immediate materials: `Amount = 20 + (WaveNumber * 4)`
   - **Card 3: Öğrenci İndirim Kuponu (Shop Discount / Free Reroll)**:
     * Grants 1x `ShopDiscountCoupon`: 25% price reduction on all 4 shop slots in the current wave OR 2 free rerolls.

3. **Wrong Answer / Grace Policy**:
   - Zero HP loss, zero currency penalty.
   - **Consolation Prize**: `+1 Luck` ("Hatalardan ders çıkarma tecrübesi") + `5 Materials`.
   - **Mnemonic Reveal**: Displays the educational high-yield hint (e.g. `💡 Boğaziçili Koç Taktiği: Toplamı terim sayısına böl: 85/5=17 (Ortanca), en büyük 17+4=21!`).
   - Logged to student's `MistakeEntry[]` notebook for post-game review.

#### C. In-Run Tactical Events & Frame-Accurate Freeze

1. **Trigger Conditions**:
   - **Mystery Chest (Akademik Kapsül)**:
     * Spawns on the battlefield at `waveDuration * 0.5` (e.g. at 30s in a 60s wave).
     * Guaranteed drop when a Wave Elite / Miniboss is slain.
     * Player walks into 28px radius of the chest to trigger.
   - **Elite Overdrive Challenge**:
     * When an Elite enemy enters combat or reaches 50% HP, an on-screen prompt allows pressing `[SPACE]` to trigger a tactical intercept.

2. **Frame-Accurate Tactical Freeze ("Bullet-Time / Focus Mode")**:
   - Game Loop State: `gameState.paused = true; gameState.bulletTimeActive = true;`.
   - Delta time `dt = 0`:
     * Player movement, keyboard input handling, velocity vectors frozen.
     * All projectiles, mob movements, cooldown timers, particle lifetimes frozen.
   - Audio Focus:
     * BGM / ambient sound ducked with a 250Hz low-pass biquad filter.
     * Plays `playQuestionModalOpen()` whoosh sound.
   - Visual Focus:
     * 75% dark vignette overlay with animated neon cyan/pink border.
     * Tactical HUD displays question prompt with 12s focus timer.

3. **Tactical Combat Rewards (Instant Combat Superpowers on Correct Answer)**:
   Player immediately selects 1 of 4 game-changing tactical effects:
   - **1. Acil Sağlık Dopingi (Emergency Medical Serum)**:
     * Instantly restores `50% of Missing HP` (or minimum 30 HP).
   - **2. Boğaziçi Süpernova (Tactical Orbital Nuke)**:
     * Fires a massive radial shockwave (`radius = 350px`) centered on player dealing `180 Flat Damage`. Disintegrates Swarmers and pushes Tanks back by 150px.
   - **3. Odaklanma Akışı (Flow State / Frenzy Overdrive)**:
     * 6 seconds of **Invulnerability** + `+50% Attack Speed` + `+30% Movement Speed`.
   - **4. Kozmik Vakum (Global Material Vacuum)**:
     * Instantly pulls all materials, gems, and health fruits across the entire arena directly into the player's pocket.

4. **Combat Wrong Answer Behavior**:
   - Brief 0.5s weapon misfire stagger (weapons pause firing for 0.5s after unpause) + small screen rumble (`shake = 8`).
   - Chest opens with minor basic reward (5 materials).
   - Plays `playWrongBuzz()`. Combat unpauses safely without damaging the player directly.

#### D. Category Performance & Accuracy Tracker

1. **Tracking Data Structures**:

```typescript
export interface CategoryMetric {
  category: QuestionCategory;
  attempts: number;
  correct: number;
  wrong: number;
  skipped: number;
  streak: number;
  bestStreak: number;
  totalResponseTimeMs: number;
  avgResponseTimeMs: number;
  accuracyRate: number; // 0.0 to 1.0 (or 0% to 100%)
}

export interface StudySessionTracker {
  overall: {
    totalAttempted: number;
    totalCorrect: number;
    totalWrong: number;
    totalSkipped: number;
    accuracyPercent: number;
    maxStreak: number;
    currentStreak: number;
    avgReactionMs: number;
  };
  byCategory: Record<QuestionCategory, CategoryMetric>;
  mistakeLog: MistakeEntry[];
}
```

2. **Integration Points**:
   - **Inter-Wave Shop Header**: Mini status pill showing `Doğruluk: %85 • Kombo: 4x 🔥 • Öneri: TYT Fen çalış`.
   - **Pause Menu (ESC)**: Quick summary of questions solved during the current run.
   - **Game Over & Victory Screen**:
     * **5-Axis Radar Chart**: `[Matematik, Fen/Bilim, Türkçe/Okuma, BUEPT/Yabancı Dil, Hız & Refleks]`.
     * **Academic Placement Evaluation**:
       - 90%+ Accuracy + Wave 20 Complete: *"Boğaziçi Üniversitesi Türkiye 1.si — Derece Öğrencisi"*
       - 75%-89% Accuracy: *"Boğaziçi Mühendislik / İİBF Asil Kayıt"*
       - 60%-74% Accuracy: *"Boğaziçi Kilyos Hazırlık — BUEPT Adayı"*
       - <60% Accuracy: *"Mezuna Kalma Kararı — Seneye Daha Güçlü!"*
     * **Mistake Review Accordion**: Interactive list of all failed questions with full question text, player's incorrect pick, correct answer, and Boğaziçi Koç Taktiği mnemonic.

---

### 4.2 Subsystem 2: Visual and Audio Infrastructure Specification

#### A. Comprehensive Visual Asset Inventory

| # | Asset File Name | Category | Dimensions | Display Size | Description |
|---|-----------------|----------|------------|--------------|-------------|
| 1 | `player_potato_scholar.png` | Player | 512x512 | 56x56 px | Scholarly potato wearing round glasses, holding a pencil, backpack, determined look. |
| 2 | `player_buept_student.png` | Player | 512x512 | 56x56 px | Boğaziçi prep student potato in navy Boğaziçi hoodie with an Oxford English dictionary. |
| 3 | `player_engineer.png` | Player | 512x512 | 56x56 px | Nerd potato wearing steampunk goggles, tool vest, utility belt holding a wrench. |
| 4 | `player_tank_mutant.png` | Player | 512x512 | 56x56 px | Muscular brawler potato with red boxing hand wraps and sweatband. |
| 5 | `enemy_swarmer.png` | Enemy | 512x512 | 32x32 px | "Paragraf Güvesi": Small, fast winged moth creature with exam paper wings, purple/rose. |
| 6 | `enemy_rusher.png` | Enemy | 512x512 | 40x40 px | "Zaman Tazısı": Angular, neon-yellow charging beast with glowing horns and speed trail. |
| 7 | `enemy_tank.png` | Enemy | 512x512 | 64x64 px | "İşlem Amelesi": Bulky stone-armored golem with granite shield and heavy fists. |
| 8 | `enemy_ranged_shooter.png` | Enemy | 512x512 | 44x44 px | "Türev Zehircisi": Floating hooded occult eyeball firing acidic mathematical glyphs. |
| 9 | `enemy_elite_boss.png` | Enemy | 512x512 | 96x96 px | "ÖSYM Baş Müfettişi / BUEPT Archon": Colossal crowned boss with red flaming sigils. |
| 10 | `weapon_pistol.png` | Weapon | 256x256 | 36x36 px | "Plazma Kalem": Sci-fi stylus gun with glowing cyan energy emitter. |
| 11 | `weapon_shotgun.png` | Weapon | 256x256 | 38x38 px | "Kırıcı Pompalı": Heavy dual-barrel shotgun firing spreads of energy pellets. |
| 12 | `weapon_smg.png` | Weapon | 256x256 | 34x34 px | "Optik Tarayıcı SMG": Compact submachine gun firing rapid-fire needle bursts. |
| 13 | `weapon_wand.png` | Weapon | 256x256 | 38x38 px | "Türev Asası": Arcane staff tipped with glowing amethyst crystal and floating math runes. |
| 14 | `weapon_knife.png` | Weapon | 256x256 | 32x32 px | "Cetvel Kaması": Sharp stainless steel drafting triangle dagger. |
| 15 | `weapon_sword.png` | Weapon | 256x256 | 42x42 px | "Gönye Kılıcı": Broad T-square architect's greatsword with cyan laser blade edge. |
| 16 | `weapon_wrench.png` | Weapon | 256x256 | 36x36 px | "Mühendis Anahtarı": Heavy industrial chrome pipe wrench with sparking electrical arcs. |
| 17 | `proj_bullet.png` | Projectile | 128x128 | 12x12 px | Elongated teardrop cyan plasma bolt with glowing aura. |
| 18 | `proj_magic_orb.png` | Projectile | 128x128 | 16x16 px | Swirling violet/magenta arcane energy sphere with spark particles. |
| 19 | `proj_enemy_spit.png` | Projectile | 128x128 | 14x14 px | Toxic bubbling green acid globule. |
| 20 | `vfx_slash_arc.png` | VFX | 256x256 | 48x48 px | Glowing high-contrast crescent wave for melee weapon swings. |
| 21 | `vfx_nova_ring.png` | VFX | 256x256 | 120x120 px | Expanding radial neon pink/cyan shockwave ring. |
| 22 | `pickup_material_crystal.png` | Pickup | 128x128 | 20x20 px | Faceted glowing emerald energy crystal (currency & XP). |
| 23 | `pickup_health_fruit.png` | Pickup | 128x128 | 24x24 px | Radiant golden Boğaziçi citrus apple with leaf. |
| 24 | `pickup_mystery_chest.png` | Pickup | 256x256 | 36x36 px | High-tech golden academic chest with holographic glowing question mark. |
| 25 | `arena_tile_floor.png` | Terrain | 512x512 | Tileable | Seamless dark slate sci-fi grid floor with subtle circuit lines. |
| 26 | `arena_border_wall.png` | Terrain | 256x256 | Tileable | Industrial reinforced hazard wall with neon cyan edge lighting. |

#### B. Asset Formatting & Visual Style Guidelines
- **Art Style**: Vibrant, cartoonish 2D roguelite sprite aesthetic (Brotato / Enter the Gungeon inspiration).
- **Outlines**: Bold, crisp 2-3px dark contour lines for instantaneous readability against dark backgrounds.
- **Color Palette**:
  * Arena Void / Floor: Deep slate `#070b14` and `#0f172a`.
  * Player Highlights: Cyan `#38bdf8`, Sky Blue `#0ea5e9`, White `#f8fafc`.
  * Enemies: Crimson `#e11d48`, Amber `#f59e0b`, Toxic Violet `#a855f7`, Elite Red `#ef4444`.
  * Currency / Health: Emerald `#10b981`, Golden Amber `#fbbf24`.
  * UI Accent: Neon Indigo `#6366f1` and Hot Pink `#ec4899`.
- **Aspect Ratio**: Always `1:1` square.
- **Canvas Rendering**: Sprites are rendered at centered offsets `ctx.drawImage(img, x - width/2, y - height/2, width, height)`.

#### C. Concrete AI Image Generation Prompts (`generate_image`)

Below are ready-to-run prompt templates formatted for the `generate_image` tool:

1. **Player Potato Scholar**:
   - `ImageName`: `"player_potato_scholar"`
   - `AspectRatio`: `"1:1"`
   - `Prompt`: `"2D video game character sprite of an adorable quirky cartoon potato scholar, wearing thick round horn-rimmed eyeglasses, holding a glowing yellow pencil and carrying a small backpack, determined expression, Brotato style roguelite art, bold crisp dark outlines, vibrant cel-shaded colors, isolated on pure solid black background, top-down perspective"`

2. **Player BUEPT Prep Student**:
   - `ImageName`: `"player_buept_student"`
   - `AspectRatio`: `"1:1"`
   - `Prompt`: `"2D video game character sprite of a cute cartoon potato student wearing a navy blue collegiate hoodie with a red scarf, carrying a thick English dictionary book under arm, confident smile, Brotato style roguelite aesthetic, bold clean dark outlines, vibrant cel shading, isolated on pure solid black background, top-down game asset"`

3. **Enemy Swarmer (Moth)**:
   - `ImageName`: `"enemy_swarmer"`
   - `AspectRatio`: `"1:1"`
   - `Prompt`: `"2D video game enemy sprite of a tiny aggressive alien insect moth made of torn glowing exam papers and purple energy, glowing red compound eyes, sharp antennae, Brotato roguelite game art style, bold crisp black outlines, vibrant flat cartoon shading, isolated on solid black background"`

4. **Enemy Heavy Tank (Golem)**:
   - `ImageName`: `"enemy_tank"`
   - `AspectRatio`: `"1:1"`
   - `Prompt`: `"2D video game enemy sprite of a hulking heavy stone golem monster with iron armor plates and a massive cracked stone shield, glowing amber eyes, bulky silhouette, Brotato roguelite style, bold thick black outlines, vibrant cartoon colors, isolated on solid black background"`

5. **Enemy Elite Boss (Archon)**:
   - `ImageName`: `"enemy_elite_boss"`
   - `AspectRatio`: `"1:1"`
   - `Prompt`: `"2D video game boss monster sprite of a colossal intimidating exam proctor archon with glowing red crown, floating geometric runic seals, massive dark cape and fiery red core eye, imposing menacing silhouette, Brotato boss art style, bold clean black contours, high contrast vibrant colors, isolated on solid black background"`

6. **Weapon Plasma Pen Pistol**:
   - `ImageName`: `"weapon_pistol"`
   - `AspectRatio`: `"1:1"`
   - `Prompt`: `"2D game weapon icon of a futuristic sci-fi stylus gun, sleek white and cyan plasma pistol emitting a small laser spark at the tip, Brotato item art style, clean bold outlines, vibrant colors, isolated on solid black background, centered"`

7. **Weapon Heavy Pipe Wrench**:
   - `ImageName`: `"weapon_wrench"`
   - `AspectRatio`: `"1:1"`
   - `Prompt`: `"2D game weapon icon of a heavy industrial steel pipe wrench with electric cyan lightning sparks arcing around the teeth, chunky comic roguelite style, bold black outlines, vibrant colors, isolated on solid black background, centered"`

8. **Pickup Mystery Chest**:
   - `ImageName`: `"pickup_mystery_chest"`
   - `AspectRatio`: `"1:1"`
   - `Prompt`: `"2D video game item sprite of a high-tech golden academic loot chest, glowing cyan holographic question mark hovering above the lock, futuristic container with bevels, Brotato pickup style, bold crisp outlines, vibrant gold and cyan colors, isolated on solid black background"`

9. **Pickup Emerald Material Crystal**:
   - `ImageName`: `"pickup_material_crystal"`
   - `AspectRatio`: `"1:1"`
   - `Prompt`: `"2D game collectible item sprite of a glowing multifaceted emerald green sci-fi crystal gem, bright sparkling highlights, Brotato XP material drop style, bold outlines, vibrant green, isolated on solid black background"`

10. **Arena Floor Tile**:
    - `ImageName`: `"arena_tile_floor"`
    - `AspectRatio`: `"1:1"`
    - `Prompt`: `"Seamless texture tile of a dark slate high-tech arena floor, subtle glowing cyan circuit lines and geometric grid pattern, clean minimal top-down sci-fi roguelite floor, flat lighting, tileable texture"`

---

#### D. Procedural Web Audio Engine Specification (`src/lib/sound.ts`)

Expand `ProceduralSoundEngine` to provide 12 dedicated, zero-latency procedural sound synthesizers:

```typescript
// Architectural specification for src/lib/sound.ts

export class ProceduralSoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // 1. Pistol / Stylus Laser Fire
  public playPistolShot() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.08);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // 2. Shotgun Blast (Punchy low punch + noise burst)
  public playShotgunBlast() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Sub-bass thump
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.22);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // 3. SMG Rapid Fire (Snappy short pop)
  public playSmgShot() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = 1100 + (Math.random() - 0.5) * 120;
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.045);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.045);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  // 4. Melee Weapon Swoosh (Bandpass noise sweep)
  public playMeleeSwing() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(440, t + 0.06);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.14);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  // 5. Enemy Hit Squish
  public playEnemyHurt() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.07);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  // 6. Enemy Death Pop
  public playEnemyDeath() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.16);
    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  // 7. Player Hurt / Damage Thud
  public playPlayerHurt() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.25);
    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  // 8. Crystalline Material Pickup (Pitch escalates with streak)
  public playPickupMaterial(consecutive = 0) {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const baseFreq = 1320 + Math.min(10, consecutive) * 60; // E6 and upwards
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.002, t + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // 9. Bullet-Time Freeze Whoosh (Question Modal Open)
  public playQuestionModalOpen() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.28);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  // 10. Educational Question Correct Fanfare (Triumphant Academic Chord)
  public playQuestionCorrectFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    // C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz) arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);
      gain.gain.setValueAtTime(0.22, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.005, t + idx * 0.07 + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.32);
    });
  }

  // 11. Wrong Answer Buzzer (Dissonant Tritone)
  public playWrongBuzz() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    [146.83, 207.65].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  // 12. Boğaziçi Süpernova Tactical Nuke Blast
  public playNukeExplosion() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    // Sub-rumble
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.8);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.8);
  }
}

export const soundEngine = new ProceduralSoundEngine();
```

---

## 5. Verification Method

To independently verify this specification and its compatibility with the workspace:

1. **Schema and Code Contract Verification**:
   - Inspect `/Users/afurkanmac/Downloads/hackhaton/src/data/questions.ts` to confirm `YKS_QUESTIONS` and `BUEPT_QUESTIONS` field names (`prompt`, `options`, `correctIndex`, `passageTokens`, `mnemonic`, `timeLimitSec`).
   - Inspect `/Users/afurkanmac/Downloads/hackhaton/src/types/game.ts` to confirm existing category strings and telemetry structure.

2. **Build and Compilation Test**:
   - Run the production build command:
     ```bash
     export PATH="$HOME/.local/node/bin:$PATH" && npm run build
     ```
   - Must complete with exit code 0 and zero TypeScript or lint errors.

3. **Audio Synthesis Sanity Verification**:
   - Verify that all Web Audio API nodes (`OscillatorNode`, `GainNode`, `AudioContext`) adhere to standard W3C Web Audio specifications and work without loading remote files.

4. **Image Generation Testability**:
   - In subsequent implementation turns, test any prompt using `generate_image` tool with `AspectRatio: "1:1"` and verify clean output file in designated asset directory.

5. **Invalidation Conditions**:
   - This specification would be invalidated if:
     * Question categories are removed or changed incompatibly with `src/data/questions.ts`.
     * The game loop pauses destructively by resetting projectile coordinates or player velocity.
     * Punitive penalties are introduced that kill players on wrong educational answers.
