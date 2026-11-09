# Milestone 1 Investigation & Refactoring Plan: Legacy Archival & Clean-Room Foundation

**Target Worker**: Implementation Worker (`teamwork_worker_m1_1` or Orchestrator)  
**Author**: Foundation Refactoring Explorer (`teamwork_explorer_m1_1`)  
**Working Directory**: `/Users/afurkanmac/Downloads/hackhaton/.agents/teamwork/teamwork_explorer_m1_1/`  
**Date**: 2026-11-03  

---

## 1. Observation

### 1.1 Existing Component Inventory & Imports
Direct inspection of `src/components/` reveals exactly 8 legacy components:
1. `src/components/BattleArena.tsx`
2. `src/components/JuryGodModeBar.tsx`
3. `src/components/KilyosDetective.tsx`
4. `src/components/RoomSimulator.tsx`
5. `src/components/SpikeDefuseSim.tsx`
6. `src/components/SurvivorsArena.tsx`
7. `src/components/TelemetryModal.tsx`
8. `src/components/VictoryScene.tsx`

Ripgrep analysis of all imports across these 8 files confirmed:
```json
{"File":"src/components/BattleArena.tsx","LineNumber":4,"LineContent":"import { CampaignAct, RoomUpgrades, TacticalQuestion, UnitStats } from '@/types/game';"}
{"File":"src/components/BattleArena.tsx","LineNumber":5,"LineContent":"import { BUEPT_QUESTIONS, UNIT_CATALOG, YKS_QUESTIONS } from '@/data/questions';"}
{"File":"src/components/BattleArena.tsx","LineNumber":6,"LineContent":"import { soundEngine } from '@/lib/sound';"}
{"File":"src/components/SurvivorsArena.tsx","LineNumber":4,"LineContent":"import { CampaignAct, TacticalQuestion } from '@/types/game';"}
{"File":"src/components/SurvivorsArena.tsx","LineNumber":5,"LineContent":"import { BUEPT_QUESTIONS, YKS_QUESTIONS } from '@/data/questions';"}
{"File":"src/components/SurvivorsArena.tsx","LineNumber":6,"LineContent":"import { soundEngine } from '@/lib/sound';"}
{"File":"src/components/RoomSimulator.tsx","LineNumber":4,"LineContent":"import { CampaignAct, RoomUpgrades } from '@/types/game';"}
{"File":"src/components/RoomSimulator.tsx","LineNumber":5,"LineContent":"import { soundEngine } from '@/lib/sound';"}
{"File":"src/components/TelemetryModal.tsx","LineNumber":4,"LineContent":"import { MistakeEntry, TelemetryStats } from '@/types/game';"}
{"File":"src/components/TelemetryModal.tsx","LineNumber":5,"LineContent":"import { soundEngine } from '@/lib/sound';"}
{"File":"src/components/KilyosDetective.tsx","LineNumber":4,"LineContent":"import { soundEngine } from '@/lib/sound';"}
{"File":"src/components/SpikeDefuseSim.tsx","LineNumber":4,"LineContent":"import { soundEngine } from '@/lib/sound';"}
{"File":"src/components/VictoryScene.tsx","LineNumber":4,"LineContent":"import { soundEngine } from '@/lib/sound';"}
{"File":"src/components/JuryGodModeBar.tsx","LineNumber":4,"LineContent":"import { CampaignAct, GameScene } from '@/types/game';"}
```

**Key Finding**: Not a single legacy component imports any peer component from `src/components/`. They only import third-party packages (`react`, `lucide-react`) and path-aliased modules:
- `@/types/game`
- `@/data/questions`
- `@/lib/sound`

### 1.2 `tsconfig.json` Path Aliases
Inspection of `/Users/afurkanmac/Downloads/hackhaton/tsconfig.json` (lines 21-23):
```json
"paths": {
  "@/*": ["./src/*"]
}
```
`@/*` is globally mapped to `./src/*`. Therefore, moving files from `src/components/` to `src/legacy/components/` will **not** alter the resolution of `@/types/game`, `@/data/questions`, or `@/lib/sound`.

### 1.3 `src/app/page.tsx` Analysis
Inspection of `/Users/afurkanmac/Downloads/hackhaton/src/app/page.tsx` (lines 14-21):
```typescript
import { JuryGodModeBar } from '@/components/JuryGodModeBar';
import { RoomSimulator } from '@/components/RoomSimulator';
import { BattleArena } from '@/components/BattleArena';
import { SurvivorsArena } from '@/components/SurvivorsArena';
import { KilyosDetective } from '@/components/KilyosDetective';
import { SpikeDefuseSim } from '@/components/SpikeDefuseSim';
import { TelemetryModal } from '@/components/TelemetryModal';
import { VictoryScene } from '@/components/VictoryScene';
```
And line 35:
```typescript
export default function HomePage() {
```
Global grep for `components/` across the whole codebase confirmed that `src/app/page.tsx` is the **only** file that imports from `components/`.

### 1.4 Production Build & Lint State
1. Command `export PATH="$HOME/.local/node/bin:$PATH" && npm run build` successfully compiles in 6s:
   ```
   ✓ Compiled successfully
   ✓ Linting and checking validity of types
   ✓ Collecting page data
   ✓ Generating static pages (4/4)
   Route (app)                              Size     First Load JS
   ┌ ○ /                                    34.1 kB         139 kB
   └ ○ /_not-found                          979 B           106 kB
   ```
2. Command `npm run lint` hangs on an interactive prompt because `.eslintrc.json` is missing:
   ```
   ? How would you like to configure ESLint? https://nextjs.org/docs/app/api-reference/config/eslint
   ❯ Strict (recommended)
   ```
   Adding `.eslintrc.json` (PROJECT.md Feature #45) is essential for automated build & CI verification.

---

## 2. Logic Chain

1. **Clean Legacy Quarantine**: Moving the 8 legacy components to `src/legacy/components/` frees up `src/components/` completely for the incoming Brotato HUD, Shop, Study Buff, and Canvas components in M2.
2. **Zero Internal Drift in Legacy Components**: Because the 8 components use `@/*` alias imports rather than relative imports, moving them into `src/legacy/components/` requires **zero line edits** within any of the 8 component files.
3. **App Coordinator Transformation**: Renaming `src/app/page.tsx` to `src/legacy/LegacyApp.tsx` and updating its 8 component imports from `@/components/...` to `@/legacy/components/...` cleanly wraps the entire 5-mode prototype in a single self-contained coordinator component (`LegacyApp`).
4. **Juror Accessibility Route (`/legacy`)**: Creating `src/app/legacy/page.tsx` that renders `LegacyApp` with a top archive banner ensures 100% preservation of the hackathon prototype. Jurors can test all 5 previous modes anytime by navigating to `/legacy`, with an immediate button to jump back to `/`.
5. **New Brotato Main Shell (`/`)**: Replacing `src/app/page.tsx` with the new Brotato roguelite interface provides:
   - 4-character avatar selection (Potato Scholar, BUEPT Student, Engineer, Mutant Tank)
   - Act 1 (YKS) vs Act 2 (BUEPT) selector
   - Live 17 RPG Stats dashboard responding to character selection
   - 6-slot Weapon loadout inventory preview
   - Procedural sound triggers via `soundEngine`
   - High-visibility banner linking to `/legacy`
   - CTA button ready to mount the M2 HTML5 Canvas engine

---

## 3. Caveats

- **No Caveats on Import Safety**: Exhaustively verified via ripgrep; no relative path breakages exist.
- **Node Environment**: When running shell commands, always prefix with `export PATH="$HOME/.local/node/bin:$PATH"`.
- **ESLint Dependencies**: Next.js requires `eslint` and `eslint-config-next` to execute `next lint` non-interactively when `.eslintrc.json` is present.

---

## 4. Conclusion & Concrete Implementation Instructions

### Step 1: Directory Setup & File Moves
Run the following directory preparation and move commands:
```bash
# 1. Create legacy directories
mkdir -p src/legacy/components
mkdir -p src/app/legacy

# 2. Move 8 legacy components
mv src/components/BattleArena.tsx src/legacy/components/BattleArena.tsx
mv src/components/JuryGodModeBar.tsx src/legacy/components/JuryGodModeBar.tsx
mv src/components/KilyosDetective.tsx src/legacy/components/KilyosDetective.tsx
mv src/components/RoomSimulator.tsx src/legacy/components/RoomSimulator.tsx
mv src/components/SpikeDefuseSim.tsx src/legacy/components/SpikeDefuseSim.tsx
mv src/components/SurvivorsArena.tsx src/legacy/components/SurvivorsArena.tsx
mv src/components/TelemetryModal.tsx src/legacy/components/TelemetryModal.tsx
mv src/components/VictoryScene.tsx src/legacy/components/VictoryScene.tsx

# 3. Move old page.tsx to LegacyApp.tsx
mv src/app/page.tsx src/legacy/LegacyApp.tsx
```

---

### Step 2: Update `src/legacy/LegacyApp.tsx`
In `src/legacy/LegacyApp.tsx`:
1. Change imports (lines 14-21) to:
```typescript
import { JuryGodModeBar } from '@/legacy/components/JuryGodModeBar';
import { RoomSimulator } from '@/legacy/components/RoomSimulator';
import { BattleArena } from '@/legacy/components/BattleArena';
import { SurvivorsArena } from '@/legacy/components/SurvivorsArena';
import { KilyosDetective } from '@/legacy/components/KilyosDetective';
import { SpikeDefuseSim } from '@/legacy/components/SpikeDefuseSim';
import { TelemetryModal } from '@/legacy/components/TelemetryModal';
import { VictoryScene } from '@/legacy/components/VictoryScene';
```
2. Change line 35 component signature:
```typescript
export default function LegacyApp() {
```

---

### Step 3: Create `src/app/legacy/page.tsx`
Write the dedicated jury route at `/legacy`:
```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';
import LegacyApp from '@/legacy/LegacyApp';

export default function LegacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#060913]">
      {/* Top Banner: Juror Notice & Navigation to New Brotato Roguelite */}
      <header className="bg-slate-950/95 border-b border-indigo-900/50 px-4 py-2.5 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Legacy Prototype Archive
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              5 Hackathon Game Modes (Mezuna Kalma, Kampüs Royale, Exam Survivors, Project Kilyos, Spike Defuse)
            </span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm shadow-indigo-600/30"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Brotato Roguelite</span>
          </Link>
        </div>
      </header>

      {/* Embedded Legacy Coordinator */}
      <div className="flex-1">
        <LegacyApp />
      </div>
    </div>
  );
}
```

---

### Step 4: Create New `src/app/page.tsx` (Brotato Main Shell)
Write the clean-room Brotato Roguelite primary entry point:
```tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Zap,
  Swords,
  Brain,
  Trophy,
  Flame,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronRight,
  Heart,
  Crosshair,
  Sparkles,
  ShoppingBag,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound';
import { PlayerRPGStats } from '@/types/brotato';

interface CharacterOption {
  id: string;
  name: string;
  title: string;
  badge: string;
  color: string;
  description: string;
  startingWeapon: string;
  baseStats: Partial<PlayerRPGStats>;
}

const CHARACTERS: CharacterOption[] = [
  {
    id: 'potato_scholar',
    name: 'Patates Mezun',
    title: 'Dengeli TYT/AYT Adayı',
    badge: 'Dengeli',
    color: 'from-amber-500 to-yellow-600',
    description: 'Tüm istatistikleri dengeli. Hasat ve XP kazanımı %15 daha yüksek.',
    startingWeapon: 'Tükenmez Kalem (Pistol)',
    baseStats: {
      maxHp: 100,
      damagePercent: 0,
      speedPercent: 0,
      harvesting: 15,
      luck: 10,
    },
  },
  {
    id: 'buept_hero',
    name: 'Hazırlık Kurdu',
    title: 'BUEPT Hız ve Çeviklik Uzmanı',
    badge: 'Çevik',
    color: 'from-sky-500 to-indigo-600',
    description: 'Yüksek hareket hızı ve %20 taban sıyrılma (Dodge) şansı.',
    startingWeapon: 'Grammar Asası (Magic Wand)',
    baseStats: {
      maxHp: 85,
      dodgePercent: 20,
      speedPercent: 15,
      attackSpeed: 10,
    },
  },
  {
    id: 'engineer',
    name: 'Mühendislik Dahisi',
    title: 'Otomasyon ve Taret Efendisi',
    badge: 'Mühendislik',
    color: 'from-emerald-500 to-teal-600',
    description: 'Yüksek Mühendislik statüsü ile taretler kurar ve savunur.',
    startingWeapon: 'İngiliz Anahtarı (Wrench)',
    baseStats: {
      maxHp: 90,
      engineering: 12,
      armor: 3,
      meleeDamage: 4,
    },
  },
  {
    id: 'mutant_tank',
    name: 'Kilyos Tankı',
    title: 'Fırtınaya Karşı Yıkılmaz',
    badge: 'Tank',
    color: 'from-rose-500 to-red-600',
    description: 'Yüksek can ve zırh; ancak fırtına rüzgarı nedeniyle yavaş hareket eder.',
    startingWeapon: 'Cetvel Kılıç (Sword)',
    baseStats: {
      maxHp: 140,
      armor: 6,
      hpRegen: 3,
      speedPercent: -10,
    },
  },
];

export default function BrotatoMainPage() {
  const [selectedCharId, setSelectedCharId] = useState<string>('potato_scholar');
  const [activeAct, setActiveAct] = useState<'yks' | 'buept'>('yks');
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);

  const selectedChar = CHARACTERS.find((c) => c.id === selectedCharId) || CHARACTERS[0];

  const toggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    soundEngine.enabled = next;
    if (next) soundEngine.playHit();
  };

  const handleSelectChar = (id: string) => {
    setSelectedCharId(id);
    if (sfxEnabled) soundEngine.playComboUp(2);
  };

  const handleStartRun = () => {
    if (sfxEnabled) soundEngine.playOrbitalLaser();
    alert('Brotato 60 FPS HTML5 Canvas Arena motoru (Milestone 2) bir sonraki adımda bağlanacak!');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100">
      {/* Top Header & Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/20">
              🥔
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">
                  BROTATO: KAMPÜS ROGUELITE
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  YKS & BUEPT EDITION
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Top-Down Arena Shooter & Eğitsel Soru-Buff Sistemi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleSfx}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
              title={sfxEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
            >
              {sfxEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Direct Link to Archived Legacy Prototype for Jury */}
            <Link
              href="/legacy"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Jüri Arşivi (5 Eski Mod)</span>
              <ExternalLink className="w-3 h-3 text-amber-400/70" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Roguelite Hub Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Act Selector & Koç Taktiği Announcement Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-indigo-800/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Aktif Müfredat Arenası
                </span>
              </div>
              <div className="text-lg font-black text-white">
                {activeAct === 'yks' ? '1. Perde: YKS Sayısal & Eşit Ağırlık' : '2. Perde: BUEPT İngilizce Yeterlilik'}
              </div>
              <p className="text-xs text-slate-400">
                Dalgalar arası dükkanda doğru cevaplanan sorular doğrudan Roguelite stat buffı ve indirim kazandırır.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setActiveAct('yks');
                  if (sfxEnabled) soundEngine.playHit();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeAct === 'yks'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                YKS (TYT/AYT)
              </button>
              <button
                onClick={() => {
                  setActiveAct('buept');
                  if (sfxEnabled) soundEngine.playHit();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeAct === 'buept'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                BUEPT (Prep)
              </button>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Boğaziçili Koç Taktiği
              </span>
              <span className="text-[10px] text-slate-500 font-mono">#GÜNLÜK-İPUCU</span>
            </div>
            <p className="text-xs text-slate-300 italic my-2">
              &quot;Dalga aralarında Matematik sorusu çözmek Hasat (Harvesting) çarpanını %10 artırır; boss dalgalarında ekonomi patlaması yaşarsın!&quot;
            </p>
            <div className="text-[11px] text-indigo-400 font-semibold text-right">
              — Boğaziçi Bilgisayar &apos;24
            </div>
          </div>
        </div>

        {/* Character Selection Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-400" />
              Karakterini Seç (4 Patates Kahramanı)
            </h2>
            <span className="text-xs text-slate-400">Seçilen Karakter: <strong className="text-white">{selectedChar.name}</strong></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {CHARACTERS.map((char) => {
              const isSelected = char.id === selectedCharId;
              return (
                <button
                  key={char.id}
                  onClick={() => handleSelectChar(char.id)}
                  className={`p-4 rounded-xl border text-left transition relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/40 shadow-xl shadow-indigo-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase bg-gradient-to-r ${char.color} text-white`}>
                        {char.badge}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{char.startingWeapon.split(' ')[0]}</span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white">{char.name}</h3>
                      <p className="text-[11px] text-indigo-300 font-medium">{char.title}</p>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{char.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Başlangıç:</span>
                    <span className="font-semibold text-slate-200">{char.startingWeapon}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 17 RPG Stats & Weapon Inventory Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 17 RPG Stats Panel */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                17 RPG Stat Tablosu (Brotato Formülü)
              </h3>
              <span className="text-xs text-slate-500 font-mono">Brotato Core Engine v2.0</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Maks Can (HP)</div>
                <div className="text-sm font-black text-rose-400">{selectedChar.baseStats.maxHp ?? 100}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Can Yenileme (Regen)</div>
                <div className="text-sm font-black text-rose-300">{selectedChar.baseStats.hpRegen ?? 0}/sn</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Can Çalma (Life Steal)</div>
                <div className="text-sm font-black text-rose-500">%{selectedChar.baseStats.lifeSteal ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Hasar % (Damage)</div>
                <div className="text-sm font-black text-amber-400">%{selectedChar.baseStats.damagePercent ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Yakın Dövüş Hasarı</div>
                <div className="text-sm font-black text-orange-400">{selectedChar.baseStats.meleeDamage ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Menzilli Hasar</div>
                <div className="text-sm font-black text-sky-400">{selectedChar.baseStats.rangedDamage ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Element Hasarı</div>
                <div className="text-sm font-black text-purple-400">{selectedChar.baseStats.elementalDamage ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Saldırı Hızı (Atk Spd)</div>
                <div className="text-sm font-black text-yellow-400">%{selectedChar.baseStats.attackSpeed ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Kritik Şans</div>
                <div className="text-sm font-black text-yellow-300">%{selectedChar.baseStats.critChancePercent ?? 5}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Mühendislik</div>
                <div className="text-sm font-black text-emerald-400">{selectedChar.baseStats.engineering ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Menzil (Range)</div>
                <div className="text-sm font-black text-cyan-400">{selectedChar.baseStats.range ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Zırh (Armor)</div>
                <div className="text-sm font-black text-blue-400">+{selectedChar.baseStats.armor ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Sıyrılma (Dodge)</div>
                <div className="text-sm font-black text-indigo-400">%{selectedChar.baseStats.dodgePercent ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Hız % (Movement)</div>
                <div className="text-sm font-black text-teal-400">%{selectedChar.baseStats.speedPercent ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Şans (Luck)</div>
                <div className="text-sm font-black text-green-400">{selectedChar.baseStats.luck ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">Hasat (Harvesting)</div>
                <div className="text-sm font-black text-lime-400">{selectedChar.baseStats.harvesting ?? 0}</div>
              </div>
            </div>
          </div>

          {/* Weapons Array & Combat Launch */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Swords className="w-4 h-4 text-rose-400" />
                  Silah Yuvaları (6 Eşzamanlı)
                </h3>
                <span className="text-xs text-slate-400 font-mono">1/6 Dolu</span>
              </div>

              {/* 6 Weapon Slot HUD */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-indigo-950/50 border border-indigo-500/50 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
                  <span className="text-lg">🗡️</span>
                  <span className="text-[10px] font-bold text-white mt-1 truncate w-full">
                    {selectedChar.startingWeapon.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-indigo-300">Tier I</span>
                </div>
                {[2, 3, 4, 5, 6].map((slot) => (
                  <div
                    key={slot}
                    className="bg-slate-950/50 border border-dashed border-slate-800 rounded-xl p-2.5 flex flex-col items-center justify-center text-slate-600"
                  >
                    <span className="text-xs font-mono">#{slot}</span>
                    <span className="text-[9px] mt-1">Kilitli</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1 text-slate-400">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span>Düşman Türleri (5 Tip):</span>
                  <span className="text-rose-400">Swarmer, Rusher, Tank, Shooter, Elite</span>
                </div>
                <p className="text-[11px]">
                  360° serbest hareket, otomatik hedefleme ve mermi fiziği ile 20 dalga hayatta kal.
                </p>
              </div>
            </div>

            {/* CTA Launch Button */}
            <div className="pt-2">
              <button
                onClick={handleStartRun}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-black text-sm tracking-wide shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Zap className="w-4 h-4 text-yellow-300 group-hover:scale-125 transition-transform" />
                <span>ARENAYA BAŞLA (DALGA 1)</span>
                <ChevronRight className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        Brotato Engine &bull; Pure TypeScript Decoupled 60 FPS HTML5 Canvas &bull; Procedural Web Audio &bull; YKS / BUEPT Tactical System
      </footer>
    </div>
  );
}
```

---

### Step 5: Create `src/types/brotato.ts`
Establish the core Brotato data contracts (PROJECT.md lines 148-198, Feature #47):
```typescript
import { TacticalQuestion } from '@/types/game';

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

export interface ActiveWeaponInstance {
  blueprint: WeaponBlueprint;
  cooldownRemainingMs: number;
  currentAimAngle: number;
  tier: WeaponTier;
}

export type EnemyType = 'swarmer' | 'rusher' | 'tank' | 'ranged' | 'elite';

export interface EnemyBlueprint {
  type: EnemyType;
  name: string;
  baseHp: number;
  baseDamage: number;
  baseSpeed: number;
  size: number;
  xpDrop: number;
  goldDrop: number;
  spriteName: string;
}

export interface TacticalFreezeEvent {
  source: 'mystery_chest' | 'elite_defeat' | 'manual_intercept';
  chestPosition?: { x: number; y: number };
  question: TacticalQuestion;
}

export interface TacticalRewardSelection {
  type: 'emergency_heal' | 'orbital_nuke' | 'flow_state_frenzy' | 'global_vacuum';
  healPercent?: number;
  nukeDamage?: number;
  frenzyDurationSec?: number;
}

export interface ShopItem {
  id: string;
  type: 'weapon' | 'stat_upgrade' | 'passive_item';
  name: string;
  description: string;
  cost: number;
  tier: WeaponTier;
  locked: boolean;
  weaponBlueprint?: WeaponBlueprint;
  statBoost?: Partial<PlayerRPGStats>;
}
```

---

### Step 6: Create `.eslintrc.json` (Feature #45)
Create `/Users/afurkanmac/Downloads/hackhaton/.eslintrc.json`:
```json
{
  "extends": "next/core-web-vitals"
}
```
And ensure dev dependencies `eslint` and `eslint-config-next` are added or lint runs non-interactively.

---

## 5. Verification Method

To independently verify the implementation, execute the following commands in the project directory:

1. **Verify Production Build with App Router Routes**:
   ```bash
   export PATH="$HOME/.local/node/bin:$PATH" && npm run build
   ```
   **Expected Outcome**: Build succeeds with code 0. Output table must list both routes:
   - `○ /` (New Brotato Roguelite Main Page)
   - `○ /legacy` (Legacy 5-Mode Prototype Page)

2. **Verify Non-Interactive Linting**:
   ```bash
   export PATH="$HOME/.local/node/bin:$PATH" && npm run lint
   ```
   **Expected Outcome**: Executes and completes without hanging on user prompt.

3. **Verify File Separation**:
   - `src/legacy/LegacyApp.tsx` exists and references `@/legacy/components/*`.
   - `src/legacy/components/` contains all 8 legacy components.
   - `src/types/brotato.ts` exists and exports `PlayerRPGStats`, `WeaponBlueprint`, etc.
   - `src/app/legacy/page.tsx` exists and renders `LegacyApp`.
   - `src/app/page.tsx` exists and renders the clean Brotato hub shell with link to `/legacy`.

4. **Invalidation Conditions**:
   - Any missing component import in `LegacyApp.tsx`.
   - Any broken alias resolution to `@/types/game`, `@/data/questions`, or `@/lib/sound`.
   - Any failure of Next.js static page generation for `/` or `/legacy`.
