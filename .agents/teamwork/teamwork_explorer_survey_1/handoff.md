# Codebase Survey & Legacy Boundaries Investigation Report

**Agent**: `teamwork_explorer_survey_1`  
**Milestone**: Survey & Architectural Boundary Discovery  
**Target Workspace**: `/Users/afurkanmac/Downloads/hackhaton`  
**Date**: 2026-11-03  

---

## 1. Observation

### 1.1 Project Structure & Root Configuration

The workspace root directory contains the following configuration files:
- `/Users/afurkanmac/Downloads/hackhaton/package.json`
- `/Users/afurkanmac/Downloads/hackhaton/next.config.mjs`
- `/Users/afurkanmac/Downloads/hackhaton/tailwind.config.ts`
- `/Users/afurkanmac/Downloads/hackhaton/tsconfig.json`
- `/Users/afurkanmac/Downloads/hackhaton/postcss.config.mjs`
- `/Users/afurkanmac/Downloads/hackhaton/start.sh`

#### Verbatim `package.json`:
```json
{
  "name": "kampus-royale-mezuna-kalma",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "canvas-confetti": "^1.9.3",
    "clsx": "^2.1.1",
    "framer-motion": "^11.15.0",
    "lucide-react": "^0.468.0",
    "next": "15.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/canvas-confetti": "^1.9.0",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2"
  }
}
```

#### Key Configuration Observations:
1. **Framework & Engine**: Next.js 15.1.6 with App Router (`src/app/`), React 19.0.0, TypeScript 5.7.2.
2. **Path Aliasing**: In `tsconfig.json`, `"@/*": ["./src/*"]` is defined and resolves cleanly to `src/`.
3. **Styling**: Tailwind CSS 3.4.17 configured with `content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"]`.
4. **Environment & Runtime**: Node v22.14.0 and npm 10.9.2 are present in portable environment (`~/.local/node/bin`).
5. **Git Status**: Workspace is NOT a git repository (`git status` outputs `fatal: not a git repository (or any of the parent directories): .git`).
6. **Testing Setup**: No test framework (`jest`, `vitest`, etc.) is installed or configured in `package.json`.
7. **Linting Setup**: Running `npm run lint` interactively prompts `? How would you like to configure ESLint?` because neither `.eslintrc.json` nor `eslint.config.mjs` exists in the root.

---

### 1.2 Existing Application & Mini-Game Prototype Inventory

The current codebase is titled `"Kampüs Royale: Mezuna Kalma!"`, an educational multi-game suite featuring 5 game modes, career simulation, telemetry stats, and a victory scene:

| File Path | Lines | Size (Bytes) | Role / Content |
|---|---|---|---|
| `src/app/page.tsx` | 465 | 16,824 | Main page coordinator: manages overarching student career state (netScore, mental, energy, money, rankLp), act (`yks` vs `buept`), mode switcher, and renders active scene. |
| `src/app/layout.tsx` | 23 | 659 | Root HTML layout with dark mode background `#060913`. |
| `src/app/globals.css` | 24 | 540 | Tailwind directives and custom `.stress-vignette` pulse animation. |
| `src/types/game.ts` | 84 | 1,856 | TypeScript types for CampaignAct, GameScene, QuestionCategory, TacticalQuestion, RoomUpgrades, UnitStats, MistakeEntry, TelemetryStats. |
| `src/components/JuryGodModeBar.tsx` | 175 | 6,826 | Sticky top navigation bar for jury evaluation; switches acts, triggers shield breaks, unlocks all room upgrades, and toggles SFX. |
| `src/components/RoomSimulator.tsx` | 639 | 25,318 | Mode 1: NSS/student life simulator. Interactive room canvas (desk, bed, kettle, heater, PC), weekly actions (study, chill, tutor), shop upgrades. |
| `src/components/BattleArena.tsx` | 815 | 30,434 | Mode 2: Clash Royale-style 1v1 lane defense game with animated units (knight, mage, golem, dragon), ECG pulse canvas, NSS kick meter, question answer lane attacks. |
| `src/components/SurvivorsArena.tsx` | 584 | 19,124 | Mode 3: Exam Survivors 2D HTML5 Canvas action roguelite. WASD/Mouse control, dash mechanics, bullet auto-firing, XP gems, bullet-time question level-up modal. |
| `src/components/KilyosDetective.tsx` | 386 | 15,423 | Mode 4: Papers, Please-style document verification desk. Inspects BUEPT/YKS clauses, UV light toggle, approve/reject stamps. |
| `src/components/SpikeDefuseSim.tsx` | 466 | 18,044 | Mode 5: Valorant-style bomb defusal puzzle with 3 modules: wire-cutting order, oscilloscope sine wave matching, keypad combination code. |
| `src/components/TelemetryModal.tsx` | 320 | 15,582 | Student performance dashboard: 5-axis SVG radar polygon, mistake review list, mock AI coach advice generator. |
| `src/components/VictoryScene.tsx` | 188 | 6,602 | Canvas victory screen illustrating Boğaziçi South Campus (Albert Long Hall clock tower, fireworks, campus dogs). |
| `src/data/questions.ts` | 236 | 8,758 | Curated question bank (YKS & BUEPT) + unit stats for BattleArena. |
| `src/lib/sound.ts` | 187 | 6,046 | Procedural Web Audio API sound synthesis engine (`soundEngine`). |

Total legacy component and page logic: **4,042 lines of code across 10 component/page files**.

---

### 1.3 Deep Dive: `src/data/questions.ts`

The file exports three data structures:
1. `UNIT_CATALOG: UnitStats[]` (4 entries):
   - `knight` ("Kilyos Muhafızı", cost: 2, hp: 150, dmg: 1.5, speed: 1.45)
   - `mage` ("Türev Büyücüsü", cost: 4, hp: 95, dmg: 2.7, speed: 1.15)
   - `golem` ("BUEPT Golemi", cost: 6, hp: 320, dmg: 3.6, speed: 0.78)
   - `dragon` ("Güney Kampüs Ejderi", cost: 8, hp: 240, dmg: 4.8, speed: 1.75)
   *(Note: This is specific to the legacy Clash Royale mini-game)*

2. `YKS_QUESTIONS: TacticalQuestion[]` (6 entries):
   - `yks-1`: Category `TYT Matematik`, type `multiple_choice`, difficulty `1`, timeLimit `20s`. (Arithmetic progression). Correct index: 2.
   - `yks-2`: Category `TYT Fen`, type `multiple_choice`, difficulty `2`, timeLimit `18s`. (Net force = 0 / Inertia). Correct index: 1.
   - `yks-3`: Category `TYT Türkçe`, type `evidence_hunt`, difficulty `3`, timeLimit `25s`. (Contrast transition "oysaki"). Clue index inside passageTokens.
   - `yks-4`: Category `AYT Sayısal`, type `multiple_choice`, difficulty `2`, timeLimit `20s`. (Derivative extremum sum). Correct index: 1.
   - `yks-5`: Category `TYT Fen`, type `evidence_hunt`, difficulty `3`, timeLimit `22s`. (Absolute keyword trap "her zaman").
   - `yks-6`: Category `TYT Matematik`, type `multiple_choice`, difficulty `2`, timeLimit `22s`. (4-wrong-1-correct net score calc). Correct index: 2.

3. `BUEPT_QUESTIONS: TacticalQuestion[]` (6 entries):
   - `buept-1`: Category `BUEPT Vocab`, type `multiple_choice`, difficulty `2`, timeLimit `18s`. ("mitigate"). Correct index: 0.
   - `buept-2`: Category `BUEPT Reading`, type `evidence_hunt`, difficulty `3`, timeLimit `25s`. ("albeit" contrast concession).
   - `buept-3`: Category `BUEPT Vocab`, type `multiple_choice`, difficulty `2`, timeLimit `18s`. ("ubiquitous"). Correct index: 1.
   - `buept-4`: Category `BUEPT Logic`, type `multiple_choice`, difficulty `2`, timeLimit `18s`. ("Notwithstanding"). Correct index: 0.
   - `buept-5`: Category `BUEPT Reading`, type `evidence_hunt`, difficulty `3`, timeLimit `24s`. ("corroborate"). Clue token.
   - `buept-6`: Category `BUEPT Vocab`, type `multiple_choice`, difficulty `3`, timeLimit `20s`. ("paradoxical"). Correct index: 0.

#### Question Features:
- Rich Turkish coaching heuristics in `mnemonic` property (`💡 Boğaziçili Koç Taktiği...` / `💡 BUEPT Kilyos Notu...`).
- Two interaction types supported:
  - `multiple_choice`: 4 options with single `correctIndex`.
  - `evidence_hunt`: Array of `PassageToken` where one token has `isClue: true`.
- Difficulty levels scale from 1 (fundamental) to 3 (complex trick/boss shield).

---

### 1.4 Deep Dive: `src/lib/sound.ts`

`src/lib/sound.ts` exports `soundEngine`, an instance of `ProceduralSoundEngine`:
- **Architecture**: 100% procedural Web Audio API, requiring zero audio asset files or external network requests.
- **Context Lifecycle**: Lazy instantiation (`AudioContext` or `webkitAudioContext` on first call), automatically resumes if context is suspended by browser autoplay policy.
- **Enabled State**: Toggleable boolean `soundEngine.enabled`.
- **Existing Synthesizer Methods**:
  1. `playHit()`: Sawtooth sweep (240Hz -> 55Hz, 130ms) for punchy impact / damage.
  2. `playComboUp(streak)`: 3-tone arpeggio using triangle wave based on `330 + min(streak, 6)*55` Hz with harmonic multiples (1.25x, 1.5x).
  3. `playOrbitalLaser()`: High-to-low sawtooth laser pitch drop (980Hz -> 90Hz, 380ms).
  4. `playShieldBreak()`: 4-tone ascending high sine chime (880, 1174, 1567, 2093 Hz, 250ms).
  5. `playWrongBuzz()`: 2-step downward sawtooth buzzer (150Hz -> 112Hz, 300ms).
  6. `playCashRegister()`: 3 ringing coin chime sines (D5, A5, D6, 200ms).
  7. `playVictoryFanfare()`: 4 ascending major chords (C5, E5, G5, C6, 350ms).
  8. `setKilyosStormAmbient(active)`: Continuous looping procedural white noise buffer passed through a bandpass filter (650Hz, Q=0.7) for rain/wind ambience.

---

### 1.5 Build & Runtime Verification

Executed with `export PATH="$HOME/.local/node/bin:$PATH"`:
- Command: `npm run build`
- Result: **Exit Code 0**
  - Next.js 15.1.6 compiled successfully.
  - Linting and type validity check passed cleanly.
  - Static pages generated: `/` (34.1 kB, 139 kB First Load JS) and `/_not-found`.
  - Zero TypeScript compilation errors.
  - Zero build warnings or broken imports.

---

## 2. Logic Chain

1. **Premise 1 (Requirement R1 from ORIGINAL_REQUEST.md)**: "Archive the existing mini-game prototype into a dedicated legacy directory (`src/legacy/`), while preserving and reusing shared assets including the question bank (`src/data/questions.ts`) and the procedural sound engine (`src/lib/sound.ts`). Reimplement all Brotato-style game mechanics from scratch cleanly."
2. **Premise 2 (File Coupling Analysis)**:
   - `src/app/page.tsx` directly imports and wires `BattleArena`, `RoomSimulator`, `SurvivorsArena`, `KilyosDetective`, `SpikeDefuseSim`, `JuryGodModeBar`, `TelemetryModal`, and `VictoryScene`.
   - None of the 8 components above are imported by `src/data/questions.ts` or `src/lib/sound.ts`.
   - `src/types/game.ts` contains types used both by the legacy game (`UnitStats`, `RoomUpgrades`) and shared types needed by questions (`TacticalQuestion`, `CampaignAct`, `QuestionCategory`, `PassageToken`).
3. **Premise 3 (Clean Architecture for Brotato Arena Game)**:
   - To make the Brotato arena roguelite the primary application running at `/`, `src/app/page.tsx` must be replaced with the new Brotato game loop.
   - Moving the existing `page.tsx` and the 8 prototype components to `src/legacy/` cleanly preserves them. A dedicated legacy route (e.g., `src/app/legacy/page.tsx` or a legacy launcher inside `src/legacy/`) allows jury verification of previous work without polluting the new Brotato codebase.
   - `src/data/questions.ts` and `src/lib/sound.ts` should remain in their canonical paths (`src/data/` and `src/lib/`) so both new Brotato and legacy modes can consume them seamlessly.
4. **Premise 4 (Brotato Mechanics Gap Analysis)**:
   - Although `src/components/SurvivorsArena.tsx` implemented a prototype 2D Canvas action arena, it lacks full Brotato mechanics:
     - No 360-degree multi-weapon system (it currently only fires 1 weapon spread from player position).
     - No simultaneous weapon inventory with independent cooldowns, targeting, and distinct melee/ranged stats (damage, attack speed, range, knockback, crit).
     - No multi-wave progressive scaling with 5 distinct enemy variants (swarmer, rusher, tank/charger, ranged shooter, wave elite).
     - No comprehensive RPG stat sheet (Max HP, HP Regen, Life Steal, Damage %, Attack Speed, Crit Chance, Engineering, Range, Armor, Dodge, Speed, Luck, Harvesting).
     - No inter-wave shop with item purchases, reroll, lock mechanics, and study buff integration.
   - Rebuilding the arena roguelite cleanly from scratch using modular architecture (`src/game/engine/`, `src/game/entities/`, `src/game/weapons/`, `src/game/waves/`, `src/game/stats/`, `src/game/shop/`) is required to satisfy R2 and R4.

---

## 3. Legacy Boundaries & Migration Map

### 3.1 Files to be Archived to `src/legacy/`

| Current Location | Proposed Legacy Location | Rationale |
|---|---|---|
| `src/app/page.tsx` | `src/legacy/LegacyApp.tsx` (and `src/app/legacy/page.tsx` if accessible via route) | Primary legacy state controller. |
| `src/components/BattleArena.tsx` | `src/legacy/components/BattleArena.tsx` | Mode 2 Clash Royale lane game. |
| `src/components/RoomSimulator.tsx` | `src/legacy/components/RoomSimulator.tsx` | Mode 1 student life simulation. |
| `src/components/SurvivorsArena.tsx` | `src/legacy/components/SurvivorsArena.tsx` | Mode 3 early survivors prototype. |
| `src/components/KilyosDetective.tsx` | `src/legacy/components/KilyosDetective.tsx` | Mode 4 Papers, Please inspection game. |
| `src/components/SpikeDefuseSim.tsx` | `src/legacy/components/SpikeDefuseSim.tsx` | Mode 5 Valorant defuse puzzle. |
| `src/components/JuryGodModeBar.tsx` | `src/legacy/components/JuryGodModeBar.tsx` | Legacy mode navigation & cheats. |
| `src/components/TelemetryModal.tsx` | `src/legacy/components/TelemetryModal.tsx` | Legacy radar & mistake modal. |
| `src/components/VictoryScene.tsx` | `src/legacy/components/VictoryScene.tsx` | Legacy South Campus victory scene. |

### 3.2 Shared Infrastructure to Preserve in `src/`

| File Path | Status | Reusable Capability |
|---|---|---|
| `src/data/questions.ts` | **PRESERVE & REUSE** | Question bank with 12 TYT/AYT/BUEPT questions, mnemonics, multiple-choice & evidence-hunt modes. Can be expanded with Brotato buff mappings. |
| `src/lib/sound.ts` | **PRESERVE & EXTEND** | Procedural Web Audio API engine. Extend with Brotato weapon fire, melee swoosh, pickup chimes, shop bells, and enemy death bursts. |
| `src/types/game.ts` | **PRESERVE & EXTEND** | Core types `TacticalQuestion`, `CampaignAct`, `QuestionCategory`, `PassageToken`. Add new interfaces for Brotato stats, weapons, enemies, waves, and shop items. |
| `src/app/layout.tsx` | **PRESERVE** | Dark background `#060913`, metadata, and App Router root shell. |
| `src/app/globals.css` | **PRESERVE & EXTEND** | Tailwind CSS directives, CRT / scanline / arena effects, and vignette styling. |

---

## 4. Caveats

1. **ESLint Interactive Prompt**: Running `npm run lint` without an explicit ESLint config file (`.eslintrc.json`) causes Next.js to wait for user terminal input. An `.eslintrc.json` (extending `"next/core-web-vitals"`) should be created to enable automated CI/test linting.
2. **Missing Test Runner**: `package.json` currently lacks `vitest` or `jest`. To fulfill Acceptance Criteria ("Automated unit or integration test suite passes, verifying weapon damage calculations, stat scaling formulas, wave transition logic, and question scoring/buff application"), a lightweight test setup (e.g. `vitest` or Node native test runner with `tsx`) will need to be configured.
3. **No Existing Image Assets in `public/`**: The workspace has no `public/` folder. All assets in the legacy game are rendered via canvas vector primitives and Unicode emoji glyphs. Creating original AI-generated visual assets for characters, weapons, enemies, items, and terrain will require generating or providing sprite assets in `public/assets/` or modular procedural sprite renderers.

---

## 5. Conclusion

1. **Current System Status**: The repository is a healthy, cleanly compiling Next.js 15.1.6 project running on React 19 and Tailwind 3.4.17 with zero build or TypeScript errors.
2. **Clear Legacy Partition**: The 5-mode prototype ("Kampüs Royale: Mezuna Kalma!") comprising 8 component files and `src/app/page.tsx` (~4,042 LOC) is completely decoupled from the shared question bank (`src/data/questions.ts`) and audio engine (`src/lib/sound.ts`). Moving these 9 files to `src/legacy/` cleanly frees up `src/app/page.tsx` and `src/components/` for the new Brotato-style roguelite.
3. **Sound & Question Readiness**: `src/lib/sound.ts` and `src/data/questions.ts` are ready for immediate reuse and extension for Brotato combat, shop study buff phases, and in-run tactical question events.
4. **Actionable Implementation Roadmap for Team**:
   - Step 1: Move legacy components and legacy `page.tsx` into `src/legacy/` and preserve route `/legacy`.
   - Step 2: Establish Brotato types (`src/types/brotato.ts`), weapon catalogs, enemy specs, and stat scaling mathematics.
   - Step 3: Implement clean-room 60 FPS Canvas Roguelite Engine (player 360 movement, 4+ simultaneous multi-weapons, wave director, 5+ enemy types, drops).
   - Step 4: Implement Educational Question-Buff System (inter-wave study shop + tactical chest/elite pauses).
   - Step 5: Extend procedural sound synthesizer for Brotato actions and integrate visual assets.

---

## 6. Verification Method

To independently verify the observations and conclusions in this report:

1. **Verify Project Compilation & Type Check**:
   ```bash
   export PATH="$HOME/.local/node/bin:$PATH"
   npm run build
   ```
   *Expected outcome*: Output displays `✓ Compiled successfully`, `✓ Linting and checking validity of types`, `✓ Generating static pages (4/4)`, exit code 0.

2. **Verify Component & File Structure**:
   ```bash
   ls -la /Users/afurkanmac/Downloads/hackhaton/src/components
   ls -la /Users/afurkanmac/Downloads/hackhaton/src/data
   ls -la /Users/afurkanmac/Downloads/hackhaton/src/lib
   ```
   *Expected outcome*: Confirms presence of all 8 legacy components, `src/data/questions.ts`, and `src/lib/sound.ts`.

3. **Verify Question Data Exports**:
   Inspect `/Users/afurkanmac/Downloads/hackhaton/src/data/questions.ts` to confirm `UNIT_CATALOG` (4 items), `YKS_QUESTIONS` (6 items), and `BUEPT_QUESTIONS` (6 items).

4. **Verify Sound Engine Functions**:
   Inspect `/Users/afurkanmac/Downloads/hackhaton/src/lib/sound.ts` to confirm pure Web Audio implementation of `playHit`, `playComboUp`, `playOrbitalLaser`, `playShieldBreak`, `playWrongBuzz`, `playCashRegister`, `playVictoryFanfare`, and `setKilyosStormAmbient`.

5. **Invalidation Conditions**:
   - If any legacy component cannot compile when moved to `src/legacy/` due to hardcoded absolute path assumptions. (Checked: all imports use `@/types/game`, `@/data/questions`, `@/lib/sound`).
   - If `src/data/questions.ts` or `src/lib/sound.ts` had external file dependencies. (Checked: both are completely self-contained with zero binary/external dependencies).
