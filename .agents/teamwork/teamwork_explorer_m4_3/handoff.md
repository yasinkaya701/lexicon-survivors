# Handoff Report — Milestone 4: Educational UI Modals, Mistake Notebook & 5-Axis Mastery Radar Chart

**Agent**: `teamwork_explorer_m4_3`  
**Date**: 2026-11-04  
**Target Milestone**: Milestone 4 (Educational Question & Buff System)  
**Status**: COMPLETE (Architecture Specification & Blueprints Ready for Worker Implementation)

---

## 1. Observation

Direct observations and evidence gathered from the codebase:

### 1.1 Existing Game Types & Educational Schemas (`src/types/brotato.ts` & `src/types/game.ts`)
- In `src/types/brotato.ts` (lines 386–451):
  ```typescript
  export interface TacticalFreezeEvent {
    source: 'mystery_chest' | 'elite_defeat' | 'manual_intercept';
    chestPosition?: { x: number; y: number };
    enemyId?: string;
    question: TacticalQuestion;
  }

  export type TacticalRewardType =
    | 'emergency_heal'
    | 'orbital_nuke'
    | 'flow_state_frenzy'
    | 'global_vacuum';

  export interface TacticalRewardOption {
    type: TacticalRewardType;
    title: string;
    description: string;
    icon: string;
    healPercent?: number; // e.g. 50%
    nukeDamage?: number; // e.g. 180 dmg
    frenzyDurationSec?: number; // e.g. 6s
  }

  export type StudyRewardType = 'subject_stat' | 'instant_materials' | 'shop_discount';

  export interface StudyRewardChoice {
    type: StudyRewardType;
    title: string;
    description: string;
    category?: QuestionCategory;
    statModifiers?: Partial<PlayerRPGStats>;
    materialsBonus?: number;
    discountPercent?: number;
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
    byCategory: Partial<Record<QuestionCategory, CategoryMetric>>;
    mistakeLog: MistakeEntry[];
  }
  ```
- In `src/types/game.ts` (lines 26–38, 60–65):
  ```typescript
  export interface TacticalQuestion {
    id: string;
    act: CampaignAct;
    category: QuestionCategory;
    type: QuestionType;
    difficulty: 1 | 2 | 3;
    prompt: string;
    passageTokens?: PassageToken[];
    options?: string[];
    correctIndex?: number;
    mnemonic: string;
    timeLimitSec: number;
  }

  export interface MistakeEntry {
    question: TacticalQuestion;
    status: 'wrong' | 'skipped';
    timestamp: number;
    resolved: boolean;
  }
  ```

### 1.2 Frame-Accurate Freeze Infrastructure (`src/game/engine/GameLoop.ts`)
- In `src/game/engine/GameLoop.ts` (lines 115–121, 161–169):
  ```typescript
  public setTacticalFreeze(frozen: boolean): void {
    this.isTacticalFreezeActive = frozen;
  }

  public isFrozen(): boolean {
    return this.isTacticalFreezeActive;
  }
  ```
  And inside `tick(timestamp: number)`:
  ```typescript
  // CLAMPING: Clamp delta time to maxDtSec (0.05s) to eliminate tab-switch physics explosions!
  let dt = Math.min(rawDtSec, this.maxDtSec);

  // If game is paused or tactical freeze is active, dt is strictly 0.0
  if (this.state === 'paused' || this.isTacticalFreezeActive) {
    dt = 0;
  }
  this.executeFrame(dt);
  ```
  **Direct Observation**: `GameLoop` already supports zero-delta execution (`dt = 0`), which completely halts physics, velocity integration, and weapon cooldown timers while keeping canvas rendering active.

### 1.3 Procedural Audio Synthesis Triggers (`src/lib/sound.ts`)
- In `src/lib/sound.ts`, 12 procedural Web Audio synthesizers are fully implemented:
  - `playTacticalFreeze()` (line 693): Filter sweep downward with stereo detuned oscillators for bullet-time temporal dilation.
  - `playQuestionCorrect()` (line 746): 3-note ascending major triad fanfare (C5 -> E5 -> G5).
  - `playQuestionWrong()` (line 750): Low dissonant buzz (F#2 -> F2).
  - `playNukeDetonation()` (line 757): Heavy subsonic explosion with white-noise resonance.
  - `playGemPickup(streak)` (line 588) & `playComboUp(streak)` (line 823): Ascending pentatonic chime.
  - `playCashRegister()` (line 898): Metallic bell transaction chime.

### 1.4 Mystery Chest Drop Collection (`src/components/GameCanvas.tsx` lines 551–556)
- In `GameCanvas.tsx`:
  ```typescript
  if (dropResult.collectedChests > 0) {
    soundEngine.playComboUp(3);
    ftm.spawnBanner(player.x, player.y, '📦 SANDIK!', '#f59e0b');
    vfx.spawnPickupRing(player.x, player.y, 'chest');
    vfx.addTrauma(0.20);
  }
  ```
  **Direct Observation**: Chest drops currently trigger a floating banner and particle ring, but do not yet trigger `setTacticalFreeze(true)` or open `TacticalFreezeModal`.

### 1.5 Legacy Radar & Mistake Reference (`src/legacy/components/TelemetryModal.tsx`)
- In `src/legacy/components/TelemetryModal.tsx` (lines 68–87):
  Polar-to-cartesian mapping for a 5-axis radar polygon:
  ```typescript
  const axes = [
    { label: 'Hız & Refleks', val: stats.skills.speed },
    { label: 'Turlama Taktiği', val: stats.skills.turlama },
    { label: 'Stres Kontrolü', val: stats.skills.stressControl },
    { label: 'YKS Muhakeme', val: stats.skills.yksMastery },
    { label: 'BUEPT Akademik', val: stats.skills.bueptMastery },
  ];
  const cx = 130; const cy = 130; const maxR = 85;
  const points = axes.map((ax, i) => {
    const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    const r = (Math.max(25, Math.min(100, ax.val)) / 100) * maxR;
    return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
  }).join(' ');
  ```

### 1.6 Automated Test Baseline
- Command: `export PATH="$HOME/.local/node/bin:$PATH" && npm run test`
- Result: **13/13 test files passed, 228/228 tests passing**.
- `tests/unit/question_buffs.test.ts` directly asserts subject stat buff mappings, consolation policy, superpower rewards (`emergency_heal`, `orbital_nuke`, `flow_state_frenzy`, `global_vacuum`), and question accuracy tracking.

---

## 2. Logic Chain

From the observations above:
1. **Observation 1.1 & 1.6**: The data models (`TacticalQuestion`, `StudyRewardChoice`, `TacticalRewardOption`, `CategoryMetric`, `MistakeEntry`) and game mechanics are defined and validated by unit tests.
2. **Observation 1.2 & 1.4**: `GameLoop.setTacticalFreeze` enables frame-accurate pause with `dt = 0`. Connecting mystery chest collection in `GameCanvas.tsx` to `setTacticalFreeze(true)` allows the combat simulation to suspend seamlessly while rendering the `TacticalFreezeModal` overlay.
3. **Observation 1.3**: All necessary procedural audio cues (`playTacticalFreeze`, `playQuestionCorrect`, `playQuestionWrong`, `playNukeDetonation`) exist in `src/lib/sound.ts` and can be bound directly to UI lifecycle events.
4. **Observation 1.5**: The 5-axis polygon math can be elevated into a standalone, reusable, high-fidelity SVG component `MasteryRadarChart.tsx` featuring normalized 0-100% radial scaling, interactive hover tooltips, and curriculum category colors across **Türkçe, Matematik, Fen, Sosyal, BUEPT**.
5. **Architectural Need**: We need 5 concrete blueprints:
   - `StudyBuffModal.tsx` for inter-wave study & 3-card reward selection.
   - `TacticalFreezeModal.tsx` for in-run combat pauses & 4 superpower activations.
   - `MistakeNotebookModal.tsx` for persistent review, subject filtering, and "Boğaziçi Koç Taktiği" pedagogical explanations.
   - `MasteryRadarChart.tsx` for responsive 5-axis SVG visualization.
   - `TelemetryTracker.ts` for real-time tracking contracts, mistake logging, and 5-axis metric generation.

---

## 3. Component Blueprints & Technical Specifications

### 3.1 Component 1: `StudyBuffModal.tsx`
**Location**: `src/components/StudyBuffModal.tsx`  
**Purpose**: Displays during the inter-wave shop transition (or can be toggled inside `ShopModal`). Presents the student with curriculum subject options, 4 multiple-choice answers with keyboard shortcuts (A,B,C,D / 1,2,3,4), countdown timer, immediate feedback, and a 3-choice reward selection upon correct answer (or zero-penalty consolation on wrong answer).

#### Component Architecture & State Machine:
```
[Phase: Subject Select] ──(Select Subject / Random)──> [Phase: Answering Question]
                                                              │
                    ┌─────────────────────────────────────────┴─────────────────────────────────────────┐
                    ▼ (Correct)                                                                         ▼ (Wrong)
         [Phase: Reward Select]                                                              [Phase: Consolation Review]
   - Card 1: Subject Stat Boost                                                        - Zero HP / Material Penalty
   - Card 2: Campus Scholarship (Materials)                                             - Consolation Buff (+2% Speed / +5💎)
   - Card 3: 20% Shop Discount Voucher                                                 - "Boğaziçili Koç Taktiği" Mnemonic
                    │                                                                                   │
                    └───────────────────────────────────┬───────────────────────────────────────────────┘
                                                        ▼
                                            [Apply & Close to Shop]
```

#### Detailed TypeScript Specification & Contract:
```tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  Sparkles,
  Zap,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Coins,
  TrendingUp,
  Brain,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound';
import type { TacticalQuestion, QuestionCategory } from '@/types/game';
import type { PlayerRPGStats } from '@/types/brotato';

export type SubjectTheme = 'turkce' | 'matematik' | 'fen' | 'sosyal' | 'buept';

export interface CurriculumSubjectOption {
  id: SubjectTheme;
  title: string;
  category: QuestionCategory;
  icon: string;
  badge: string;
  accentColor: string;
  borderColor: string;
  bgGradient: string;
  buffDescription: string;
  statPreview: Partial<PlayerRPGStats>;
}

export interface StudyReward {
  type: 'subject_stat' | 'scholarship_materials' | 'shop_discount';
  title: string;
  description: string;
  statModifiers?: Partial<PlayerRPGStats>;
  materialsBonus?: number;
  discountPercent?: number;
}

export interface StudyBuffModalProps {
  isOpen: boolean;
  currentWave: number;
  availableQuestions: TacticalQuestion[];
  onApplyReward: (reward: StudyReward) => void;
  onRecordMistake: (question: TacticalQuestion, selectedIndex: number) => void;
  onClose: () => void;
}

export const SUBJECT_OPTIONS: CurriculumSubjectOption[] = [
  {
    id: 'matematik',
    title: 'TYT Matematik',
    category: 'TYT Matematik',
    icon: '📐',
    badge: 'Sayısal Odak',
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    bgGradient: 'from-amber-950/40 via-slate-900 to-slate-950',
    buffDescription: '+%10 Saldırı Hızı & +%6 Kritik Şans',
    statPreview: { attackSpeed: 10, critChancePercent: 6 },
  },
  {
    id: 'turkce',
    title: 'TYT Türkçe',
    category: 'TYT Türkçe',
    icon: '📖',
    badge: 'Anlam & Hız',
    accentColor: 'text-sky-400',
    borderColor: 'border-sky-500/50 hover:border-sky-400',
    bgGradient: 'from-sky-950/40 via-slate-900 to-slate-950',
    buffDescription: '+%8 Hareket Hızı & +%5 Sıyrılma (Dodge)',
    statPreview: { speedPercent: 8, dodgePercent: 5 },
  },
  {
    id: 'fen',
    title: 'AYT Fen Bilimleri',
    category: 'TYT Fen',
    icon: '⚡',
    badge: 'Mekanik & Enerji',
    accentColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/50 hover:border-emerald-400',
    bgGradient: 'from-emerald-950/40 via-slate-900 to-slate-950',
    buffDescription: '+4 Element Hasarı & +6 Mühendislik',
    statPreview: { elementalDamage: 4, engineering: 6 },
  },
  {
    id: 'buept',
    title: 'BUEPT English',
    category: 'BUEPT Vocab',
    icon: '🎓',
    badge: 'Hazırlık Kurdu',
    accentColor: 'text-purple-400',
    borderColor: 'border-purple-500/50 hover:border-purple-400',
    bgGradient: 'from-purple-950/40 via-slate-900 to-slate-950',
    buffDescription: '+20 Hasat (Harvesting) & +5 Şans (Luck)',
    statPreview: { harvesting: 20, luck: 5 },
  },
];

export const StudyBuffModal: React.FC<StudyBuffModalProps> = ({
  isOpen,
  currentWave,
  availableQuestions,
  onApplyReward,
  onRecordMistake,
  onClose,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<CurriculumSubjectOption | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<TacticalQuestion | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(20);
  const [selectedReward, setSelectedReward] = useState<StudyReward | null>(null);

  // Initialize question when subject is picked
  const handleSelectSubject = (subject: CurriculumSubjectOption) => {
    setSelectedSubject(subject);
    soundEngine.playComboUp(1);

    // Pick question matching subject category or fallback
    const matching = availableQuestions.filter(
      (q) => q.category.toLowerCase().includes(subject.id) || q.category === subject.category
    );
    const question = matching.length > 0
      ? matching[Math.floor(Math.random() * matching.length)]
      : availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

    setCurrentQuestion(question);
    setTimeRemaining(question.timeLimitSec || 20);
    setIsAnswered(false);
    setSelectedOptionIndex(null);
  };

  // Keyboard Navigation: A/B/C/D or 1/2/3/4
  useEffect(() => {
    if (!isOpen || !currentQuestion || isAnswered) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      let index = -1;
      if (key === 'a' || key === '1') index = 0;
      else if (key === 'b' || key === '2') index = 1;
      else if (key === 'c' || key === '3') index = 2;
      else if (key === 'd' || key === '4') index = 3;

      if (index >= 0 && currentQuestion.options && index < currentQuestion.options.length) {
        handleAnswer(index);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentQuestion, isAnswered]);

  // Timer Countdown
  useEffect(() => {
    if (!isOpen || !currentQuestion || isAnswered || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAnswer(-1); // Timeout treated as wrong
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, currentQuestion, isAnswered, timeRemaining]);

  const handleAnswer = (index: number) => {
    if (isAnswered || !currentQuestion) return;
    setIsAnswered(true);
    setSelectedOptionIndex(index);

    const correct = index === currentQuestion.correctIndex;
    setIsCorrect(correct);

    if (correct) {
      soundEngine.playQuestionCorrect();
      soundEngine.playComboUp(2);
    } else {
      soundEngine.playQuestionWrong();
      onRecordMistake(currentQuestion, index);
    }
  };

  // 3-Choice Reward Options upon correct answer
  const rewardChoices: StudyReward[] = useMemo(() => {
    if (!selectedSubject) return [];
    return [
      {
        type: 'subject_stat',
        title: `${selectedSubject.title} Uzmanlık Buffı`,
        description: selectedSubject.buffDescription,
        statModifiers: selectedSubject.statPreview,
      },
      {
        type: 'scholarship_materials',
        title: 'Boğaziçi Akademik Başarı Bursu',
        description: '+35 💎 Materyal anında envantere aktarılır.',
        materialsBonus: 35,
      },
      {
        type: 'shop_discount',
        title: 'Kampüs Kırtasiye İndirim Kuponu',
        description: 'Bu dalga dükkandaki tüm silah ve eşyalarda %20 indirim.',
        discountPercent: 20,
      },
    ];
  }, [selectedSubject]);

  // Consolation Reward upon wrong answer
  const consolationReward: StudyReward = {
    type: 'subject_stat',
    title: 'Moral Telafi Güçlendirmesi',
    description: 'Hatalardan öğrenmek en büyük erdemdir: +%2 Hız & +5 💎 Materyal.',
    statModifiers: { speedPercent: 2 },
    materialsBonus: 5,
  };

  const handleConfirmReward = () => {
    const reward = isCorrect ? (selectedReward || rewardChoices[0]) : consolationReward;
    onApplyReward(reward);
    soundEngine.playCashRegister();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl border border-indigo-500/40 bg-slate-950 p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Step 1: Subject Selection */}
        {!selectedSubject && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 inline-flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" /> DALGALAR ARASI ETÜT ODASI
              </span>
              <h2 className="text-2xl font-black text-white">Çalışmak İstediğin Alanı Seç</h2>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                Doğru cevaplayacağın soru doğrudan kahramanının RPG statlarını güçlendirir ve kampüs bursu kazandırır.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SUBJECT_OPTIONS.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleSelectSubject(sub)}
                  className={`p-4 rounded-2xl border text-left transition relative overflow-hidden bg-gradient-to-br ${sub.bgGradient} ${sub.borderColor} group cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{sub.icon}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-900/80 text-slate-300 border border-slate-700">
                      {sub.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-indigo-300 transition-colors">
                    {sub.title}
                  </h3>
                  <p className="text-xs text-emerald-400 font-semibold mt-1">
                    {sub.buffDescription}
                  </p>
                </button>
              ))}
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => handleSelectSubject(SUBJECT_OPTIONS[Math.floor(Math.random() * SUBJECT_OPTIONS.length)])}
                className="px-6 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-bold text-slate-300 hover:text-white transition"
              >
                🎲 Şansıma Güveniyorum (Rastgele Soru)
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Question & Options Display */}
        {selectedSubject && currentQuestion && !isAnswered && (
          <div className="space-y-5">
            {/* Question Header & Timer */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedSubject.icon}</span>
                <div>
                  <h3 className="text-sm font-black text-white">{selectedSubject.title}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Tier {currentQuestion.difficulty} • {currentQuestion.category}
                  </span>
                </div>
              </div>

              {/* Timer Bar */}
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${timeRemaining <= 5 ? 'text-rose-400 animate-spin' : 'text-amber-400'}`} />
                <span className={`text-sm font-black tabular-nums ${timeRemaining <= 5 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {timeRemaining}s
                </span>
              </div>
            </div>

            {/* Prompt */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-sm font-bold text-slate-100 leading-relaxed">
              {currentQuestion.prompt}
            </div>

            {/* 4 Clickable / Keyboard Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuestion.options?.map((opt, idx) => {
                const letter = ['A', 'B', 'C', 'D'][idx];
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500 hover:bg-indigo-950/40 text-left transition flex items-center gap-3 group cursor-pointer"
                  >
                    <span className="w-7 h-7 rounded-lg bg-slate-800 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white flex items-center justify-center font-black text-xs transition">
                      {letter}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white flex-1">
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-center text-[11px] text-slate-500">
              Klavyeden <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">A</kbd>,{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">B</kbd>,{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">C</kbd>,{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">D</kbd> veya{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">1-4</kbd> tuşlarına basarak hızlıca cevaplayabilirsin.
            </div>
          </div>
        )}

        {/* Step 3: Immediate Feedback & Reward Selection (Correct) */}
        {isAnswered && isCorrect && (
          <div className="space-y-5 animate-in zoom-in-95 duration-200">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-black text-emerald-400">TEBRİKLER! DOĞRU CEVAP!</h3>
                <p className="text-xs text-slate-300">
                  Boğaziçi standartlarında mükemmel bir çözüm. Aşağıdaki 3 ödülden birini seç:
                </p>
              </div>
            </div>

            {/* Mnemonic Coach Note */}
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-1">
              <span className="font-black text-indigo-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Boğaziçili Koç Taktiği:
              </span>
              <p className="text-slate-300 italic">{currentQuestion?.mnemonic}</p>
            </div>

            {/* 3 Reward Choice Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {rewardChoices.map((choice, idx) => {
                const isSelected = selectedReward?.type === choice.type || (!selectedReward && idx === 0);
                return (
                  <button
                    key={choice.type}
                    onClick={() => {
                      setSelectedReward(choice);
                      soundEngine.playComboUp(1);
                    }}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/30 ring-2 ring-emerald-500/50'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="text-xl">
                        {choice.type === 'subject_stat' ? '⚡' : choice.type === 'scholarship_materials' ? '💎' : '🏷️'}
                      </div>
                      <h4 className="text-xs font-black text-white">{choice.title}</h4>
                      <p className="text-[11px] text-slate-400">{choice.description}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-bold text-emerald-400">
                      {isSelected ? '✓ Seçildi' : 'Seçmek İçin Tıkla'}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleConfirmReward}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <span>ÖDÜLÜ ENJEKTE ET VE DÜKKANA DÖN</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: Wrong Answer Grace & Consolation */}
        {isAnswered && !isCorrect && (
          <div className="space-y-5 animate-in zoom-in-95 duration-200">
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/50 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <XCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-black text-amber-400">CANIN SAĞ OLSUN! CEZA YOK.</h3>
                <p className="text-xs text-slate-300">
                  Sıfır can kaybı ve sıfır altın cezası. Soru Yanlış Defterine kaydedildi.
                </p>
              </div>
            </div>

            {/* Answer Contrast */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300">
                <span className="block font-bold mb-1">❌ Senin Seçimin:</span>
                <span>
                  {selectedOptionIndex !== null && selectedOptionIndex >= 0 && currentQuestion?.options
                    ? currentQuestion.options[selectedOptionIndex]
                    : 'Süre Doldu'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300">
                <span className="block font-bold mb-1">✅ Doğru Cevap:</span>
                <span>
                  {currentQuestion?.correctIndex !== undefined && currentQuestion.options
                    ? currentQuestion.options[currentQuestion.correctIndex]
                    : ''}
                </span>
              </div>
            </div>

            {/* Pedagogical Explanation */}
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-1.5 text-xs">
              <span className="font-black text-indigo-300 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-400" /> Boğaziçili Koç Taktiği Çözümü:
              </span>
              <p className="text-slate-200 leading-relaxed">{currentQuestion?.mnemonic}</p>
            </div>

            {/* Consolation Banner */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Moral Telafi Bonusu:</span>
              <span className="font-black text-amber-400">+{consolationReward.statModifiers?.speedPercent}% Hız & +{consolationReward.materialsBonus} 💎 Materyal</span>
            </div>

            <button
              onClick={handleConfirmReward}
              className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>TELAFİ ÖDÜLÜNÜ AL VE DÜKKANA DÖN</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### 3.2 Component 2: `TacticalFreezeModal.tsx`
**Location**: `src/components/TacticalFreezeModal.tsx`  
**Purpose**: Full-screen tactical overlay for in-combat tactical freeze event. Triggers when the player collects a mystery chest or defeats an elite boss. Suspends physics (`dt = 0`) via `GameLoop.setTacticalFreeze(true)` and grants 4 selectable Tactical Superpowers upon correct answer.

#### 4 Tactical Superpowers:
1. **Revitalizing Surge (Yenilenme Dalgası)**:
   - Restores 50% Max HP immediately + 3s Invulnerability Shield.
2. **Orbital Particle Nuke (Yörüngesel Parçacık Bombası)**:
   - Deals 500 damage to all active enemies on screen + white flash + screen shake.
   - Audio trigger: `soundEngine.playNukeDetonation()`.
3. **Flow State Frenzy (Akış Modu Çılgınlığı)**:
   - 10-second hyper-state: +100% attack speed, 0 weapon cooldowns, 100% critical strike chance.
4. **Cosmic Material Vacuum (Kozmik Materyal Çekimi)**:
   - Universal pull accelerating all material crystals, fruit, and crates anywhere on the map to 3000 px/s directly to the player.

#### Detailed TypeScript Specification & Contract:
```tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Heart,
  Bomb,
  Zap,
  Magnet,
  Shield,
  Sparkles,
  AlertTriangle,
  Clock,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound';
import type { TacticalQuestion } from '@/types/game';
import type { TacticalRewardType } from '@/types/brotato';

export interface TacticalSuperpowerOption {
  type: TacticalRewardType;
  title: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  bgGradient: string;
  borderColor: string;
  accentColor: string;
}

export interface TacticalFreezeModalProps {
  isOpen: boolean;
  source: 'mystery_chest' | 'elite_challenge';
  question: TacticalQuestion;
  onSelectSuperpower: (rewardType: TacticalRewardType) => void;
  onClose: () => void;
}

export const SUPERPOWER_CARDS: TacticalSuperpowerOption[] = [
  {
    type: 'emergency_heal',
    title: 'Yenilenme Dalgası (Revitalizing Surge)',
    badge: 'Hayatta Kalma',
    description: 'Maksimum canının %50\'sini anında doldurur ve 3 saniye hasar almazlık kalkanı verir.',
    icon: <Heart className="w-6 h-6 text-rose-400" />,
    bgGradient: 'from-rose-950/40 via-slate-900 to-slate-950',
    borderColor: 'border-rose-500/50 hover:border-rose-400',
    accentColor: 'text-rose-400',
  },
  {
    type: 'orbital_nuke',
    title: 'Yörüngesel Parçacık Bombası (Orbital Nuke)',
    badge: 'Kitle İmha',
    description: 'Ekrandaki tüm düşmanlara 500 saf enerji hasarı vurarak arenayı tamamen temizler.',
    icon: <Bomb className="w-6 h-6 text-amber-400" />,
    bgGradient: 'from-amber-950/40 via-slate-900 to-slate-950',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    accentColor: 'text-amber-400',
  },
  {
    type: 'flow_state_frenzy',
    title: 'Akış Modu Çılgınlığı (Flow State Frenzy)',
    badge: 'Aşırı Yükleme',
    description: '10 saniye boyunca silah bekleme süreleri sıfırlanır, +%100 saldırı hızı ve %100 kritik vuruş!',
    icon: <Flame className="w-6 h-6 text-purple-400" />,
    bgGradient: 'from-purple-950/40 via-slate-900 to-slate-950',
    borderColor: 'border-purple-500/50 hover:border-purple-400',
    accentColor: 'text-purple-400',
  },
  {
    type: 'global_vacuum',
    title: 'Kozmik Materyal Çekimi (Cosmic Vacuum)',
    badge: 'Ekonomi Patlaması',
    description: 'Arenanın neresinde olursa olsun tüm materyal, kristal ve meyveleri anında çantana çeker.',
    icon: <Magnet className="w-6 h-6 text-sky-400" />,
    bgGradient: 'from-sky-950/40 via-slate-900 to-slate-950',
    borderColor: 'border-sky-500/50 hover:border-sky-400',
    accentColor: 'text-sky-400',
  },
];

export const TacticalFreezeModal: React.FC<TacticalFreezeModalProps> = ({
  isOpen,
  source,
  question,
  onSelectSuperpower,
  onClose,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(15);

  useEffect(() => {
    if (!isOpen) return;
    soundEngine.playTacticalFreeze();
    setIsAnswered(false);
    setSelectedOption(null);
    setCountdown(15);
  }, [isOpen]);

  // Keyboard Shortcuts (A/B/C/D or 1/2/3/4)
  useEffect(() => {
    if (!isOpen || isAnswered) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      let index = -1;
      if (key === 'a' || key === '1') index = 0;
      else if (key === 'b' || key === '2') index = 1;
      else if (key === 'c' || key === '3') index = 2;
      else if (key === 'd' || key === '4') index = 3;

      if (index >= 0 && question.options && index < question.options.length) {
        handleOptionClick(index);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAnswered, question]);

  // Countdown Ticker
  useEffect(() => {
    if (!isOpen || isAnswered || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleOptionClick(-1); // Timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isAnswered, countdown]);

  const handleOptionClick = (idx: number) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(idx);

    const correct = idx === question.correctIndex;
    setIsCorrect(correct);

    if (correct) {
      soundEngine.playQuestionCorrect();
      soundEngine.playComboUp(3);
    } else {
      soundEngine.playQuestionWrong();
    }
  };

  const handleSuperpowerPick = (powerType: TacticalRewardType) => {
    if (powerType === 'orbital_nuke') {
      soundEngine.playNukeDetonation();
    } else {
      soundEngine.playComboUp(3);
    }
    onSelectSuperpower(powerType);
    onClose();
  };

  const handleGraceResume = () => {
    soundEngine.playHit();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 font-sans select-none animate-in fade-in duration-150">
      {/* Pulsing Cyan / Violet Tactical Vignette */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_140px_rgba(56,189,248,0.35)] animate-pulse" />

      <div className="relative w-full max-w-4xl rounded-3xl border border-sky-500/50 bg-slate-950/95 p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Tactical Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-sky-500/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 text-2xl border border-sky-400/40 text-sky-300 animate-pulse">
              {source === 'mystery_chest' ? '📦' : '👑'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-sky-300 border border-sky-500/40">
                  dt = 0.00s (Zaman Durduruldu)
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {source === 'mystery_chest' ? 'GİZEMLİ SANDIK TETİKLENDİ' : 'ELİT MEYDAN OKUMA'}
                </span>
              </div>
              <h2 className="text-lg font-black text-white tracking-tight mt-0.5">
                TAKTİKSEL MUHAKEME & SÜPER GÜÇ KİLİDİ
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className={`w-4 h-4 ${countdown <= 5 ? 'text-rose-400 animate-spin' : 'text-sky-400'}`} />
            <span className={`text-sm font-black tabular-nums ${countdown <= 5 ? 'text-rose-400' : 'text-white'}`}>
              {countdown}s
            </span>
          </div>
        </div>

        {/* Question Prompt Stage */}
        {!isAnswered && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-sm font-bold text-slate-100 leading-relaxed">
              <span className="text-xs text-indigo-400 font-mono block mb-1">
                [{question.category} • Seviye {question.difficulty}]
              </span>
              {question.prompt}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {question.options?.map((opt, idx) => {
                const letter = ['A', 'B', 'C', 'D'][idx];
                return (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(idx)}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-sky-500 hover:bg-sky-950/40 text-left transition flex items-center gap-3.5 group cursor-pointer"
                  >
                    <span className="w-8 h-8 rounded-xl bg-slate-800 group-hover:bg-sky-600 text-slate-300 group-hover:text-white flex items-center justify-center font-black text-xs transition">
                      {letter}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white flex-1">
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Correct Answer: 4 Superpower Selection Cards */}
        {isAnswered && isCorrect && (
          <div className="space-y-5 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> KRİTİK BAŞARI! SÜPER GÜÇ AKTİF
              </span>
              <h3 className="text-xl font-black text-white">Savaş Alanını Değiştirecek Bir Güç Seç</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SUPERPOWER_CARDS.map((card) => (
                <button
                  key={card.type}
                  onClick={() => handleSuperpowerPick(card.type)}
                  className={`p-4 rounded-2xl border text-left transition relative overflow-hidden bg-gradient-to-br ${card.bgGradient} ${card.borderColor} flex flex-col justify-between group cursor-pointer shadow-lg`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                        {card.icon}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-900/80 ${card.accentColor} border border-slate-800`}>
                        {card.badge}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-white group-hover:text-sky-300 transition-colors">
                      {card.title}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-sky-400">
                    <span>Etkinleştir</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Wrong Answer: Grace Misfire & Pedagogical Consolation */}
        {isAnswered && !isCorrect && (
          <div className="space-y-4 animate-in zoom-in-95 duration-200">
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/50 flex items-center gap-3.5">
              <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-black text-amber-300">
                  SİLAH MEKANİZMASI KISA SÜRELİ AKSADI (0.5s Misfire)
                </h3>
                <p className="text-xs text-slate-300">
                  Can kaybı yaşanmadı! Düşman saldırılarına karşı 2 saniyelik dokunulmazlık kalkanı açıldı.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-1">
              <span className="font-black text-indigo-300">💡 Boğaziçili Koç Taktiği Notu:</span>
              <p className="text-slate-300 italic">{question.mnemonic}</p>
            </div>

            <button
              onClick={handleGraceResume}
              className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>KALKANI AL VE SAVAŞA GERİ DÖN</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### 3.3 Component 3: `MistakeNotebookModal.tsx`
**Location**: `src/components/MistakeNotebookModal.tsx`  
**Purpose**: Interactive Mistake Notebook ("Boğaziçi Yanlış Defteri / İntikam Notları"). Accessible from Victory/Game Over, Pause menu, and inter-wave Shop. Enables students to filter by subject, inspect their wrong choices vs. correct answers, read in-depth pedagogical explanations ("Boğaziçi Koç Taktiği"), and re-solve questions to clear mistakes and earn bonus Net / score.

#### Detailed TypeScript Specification & Contract:
```tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Filter,
  RotateCcw,
  Sparkles,
  Trophy,
  ArrowRight,
  Search,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound';
import type { TacticalQuestion, QuestionCategory } from '@/types/game';

export interface MistakeRecord {
  id: string;
  question: TacticalQuestion;
  userChoiceIndex: number;
  status: 'wrong' | 'timeout' | 'skipped';
  timestamp: number;
  wave: number;
  resolved: boolean;
}

export interface MistakeNotebookModalProps {
  isOpen: boolean;
  mistakes: MistakeRecord[];
  onResolveMistake: (mistakeId: string) => void;
  onClose: () => void;
}

export type SubjectFilter = 'all' | 'turkce' | 'matematik' | 'fen' | 'sosyal' | 'buept';

export const MistakeNotebookModal: React.FC<MistakeNotebookModalProps> = ({
  isOpen,
  mistakes,
  onResolveMistake,
  onClose,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<SubjectFilter>('all');
  const [activeReattemptId, setActiveReattemptId] = useState<string | null>(null);

  // Subject Counts
  const filterCounts = useMemo(() => {
    const counts = { all: mistakes.length, turkce: 0, matematik: 0, fen: 0, sosyal: 0, buept: 0 };
    for (const m of mistakes) {
      const cat = m.question.category.toLowerCase();
      if (cat.includes('türkçe') || cat.includes('turkce')) counts.turkce++;
      else if (cat.includes('matematik') || cat.includes('sayısal')) counts.matematik++;
      else if (cat.includes('fen')) counts.fen++;
      else if (cat.includes('sosyal')) counts.sosyal++;
      else if (cat.includes('buept')) counts.buept++;
    }
    return counts;
  }, [mistakes]);

  // Filtered List
  const filteredMistakes = useMemo(() => {
    if (selectedFilter === 'all') return mistakes;
    return mistakes.filter((m) => {
      const cat = m.question.category.toLowerCase();
      if (selectedFilter === 'turkce') return cat.includes('türkçe') || cat.includes('turkce');
      if (selectedFilter === 'matematik') return cat.includes('matematik') || cat.includes('sayısal');
      if (selectedFilter === 'fen') return cat.includes('fen');
      if (selectedFilter === 'sosyal') return cat.includes('sosyal');
      if (selectedFilter === 'buept') return cat.includes('buept');
      return true;
    });
  }, [mistakes, selectedFilter]);

  const resolvedCount = mistakes.filter((m) => m.resolved).length;
  const recoveryRate = mistakes.length > 0 ? Math.round((resolvedCount / mistakes.length) * 100) : 100;

  const handleReattempt = (mistake: MistakeRecord, chosenIndex: number) => {
    if (chosenIndex === mistake.question.correctIndex) {
      soundEngine.playQuestionCorrect();
      soundEngine.playCashRegister();
      onResolveMistake(mistake.id);
      setActiveReattemptId(null);
    } else {
      soundEngine.playQuestionWrong();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header & KPI Summary */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-2xl border border-indigo-500/30">
              📓
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                BOĞAZİÇİ YANLIŞ DEFTERİ & İNTİKAM LİSTESİ
              </h2>
              <p className="text-xs text-slate-400">
                Kaçırılan soruların mantığı, koç taktikleri ve intikam çözümleri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">Toplam Hata</span>
              <span className="text-sm font-black text-rose-400">{mistakes.length}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">İntikam Alınan</span>
              <span className="text-sm font-black text-emerald-400">{resolvedCount}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block font-bold">Kazanım Oranı</span>
              <span className="text-sm font-black text-indigo-400">%{recoveryRate}</span>
            </div>
          </div>
        </div>

        {/* Subject Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: 'all', label: `Tümü (${filterCounts.all})` },
              { key: 'matematik', label: `Matematik (${filterCounts.matematik})` },
              { key: 'turkce', label: `Türkçe (${filterCounts.turkce})` },
              { key: 'fen', label: `Fen (${filterCounts.fen})` },
              { key: 'sosyal', label: `Sosyal (${filterCounts.sosyal})` },
              { key: 'buept', label: `BUEPT (${filterCounts.buept})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedFilter === tab.key
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mistakes List */}
        <div className="space-y-3">
          {filteredMistakes.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 space-y-2">
              <span className="text-3xl">🎉</span>
              <h3 className="text-sm font-bold text-slate-300">Harika Performans!</h3>
              <p className="text-xs text-slate-500">
                Bu kategoride kaydedilmiş herhangi bir hata bulunamadı.
              </p>
            </div>
          ) : (
            filteredMistakes.map((record) => {
              const isReattempting = activeReattemptId === record.id;
              return (
                <div
                  key={record.id}
                  className={`p-4 rounded-2xl border transition space-y-3 ${
                    record.resolved
                      ? 'border-emerald-500/30 bg-emerald-950/10 opacity-70'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {record.question.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Dalga {record.wave} • Zorluk Tier {record.question.difficulty}
                      </span>
                    </div>

                    {record.resolved ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> İntikam Alındı (+3.5 Net)
                      </span>
                    ) : (
                      <button
                        onClick={() => setActiveReattemptId(isReattempting ? null : record.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{isReattempting ? 'Kapat' : 'Şimdi Çöz & İntikam Al'}</span>
                      </button>
                    )}
                  </div>

                  <div className="text-xs font-bold text-slate-100">
                    {record.question.prompt}
                  </div>

                  {/* Contrast Choices */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300">
                      <span className="font-bold">❌ Senin Yanıtın: </span>
                      <span>
                        {record.userChoiceIndex >= 0 && record.question.options
                          ? record.question.options[record.userChoiceIndex]
                          : 'Süre Aşımı / Boş'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
                      <span className="font-bold">✅ Doğru Yanıt: </span>
                      <span>
                        {record.question.correctIndex !== undefined && record.question.options
                          ? record.question.options[record.question.correctIndex]
                          : ''}
                      </span>
                    </div>
                  </div>

                  {/* Koç Taktiği Explanation */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                    <span className="text-amber-400 font-bold flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> Boğaziçili Koç Taktiği:
                    </span>
                    <p className="text-slate-300 italic">{record.question.mnemonic}</p>
                  </div>

                  {/* Interactive Reattempt Box */}
                  {isReattempting && (
                    <div className="pt-2 border-t border-slate-800 space-y-2 animate-in fade-in">
                      <span className="text-[11px] font-bold text-indigo-300 block">
                        Şimdi Doğru Şıkkı İşaretle:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {record.question.options?.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            onClick={() => handleReattempt(record, oIdx)}
                            className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500 text-left text-xs text-slate-200 transition cursor-pointer"
                          >
                            <span className="font-mono text-indigo-400 mr-2">[{['A','B','C','D'][oIdx]}]</span>
                            <span>{opt}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### 3.4 Component 4: `MasteryRadarChart.tsx`
**Location**: `src/components/MasteryRadarChart.tsx`  
**Purpose**: 5-Axis polygonal visual radar chart (Türkçe, Matematik, Fen, Sosyal, BUEPT). Clean SVG with mathematical polar coordinate mapping, concentric web rings, glowing polygon, vertex marker nodes, and hover tooltips showing subject accuracy %, attempted count, and mastery tier.

#### Mathematical Geometry & Polar-to-Cartesian Mapping:
For 5 axes ($N=5$), the vertex angles starting from $12$ o'clock ($-\frac{\pi}{2}$) are:
$$\theta_i = \frac{2\pi \cdot i}{5} - \frac{\pi}{2}, \quad i \in \{0, 1, 2, 3, 4\}$$

- **Axis 0 (Türkçe)**: $\theta_0 = -90^\circ$ (Top vertex, $12$ o'clock)
- **Axis 1 (Matematik)**: $\theta_1 = -18^\circ$ (Top-Right vertex)
- **Axis 2 (Fen)**: $\theta_2 = 54^\circ$ (Bottom-Right vertex)
- **Axis 3 (Sosyal)**: $\theta_3 = 126^\circ$ (Bottom-Left vertex)
- **Axis 4 (BUEPT)**: $\theta_4 = 198^\circ$ (Top-Left vertex)

Given center $(cx, cy)$ and maximum radius $R$:
$$\text{Point}(r, \theta) = \left(cx + r \cdot \cos\theta, \; cy + r \cdot \sin\theta\right)$$
For web ring at scale $s \in \{0.25, 0.50, 0.75, 1.00\}$: $r = R \cdot s$.  
For player data point with score $v_i \in [0, 100]$:
$$r_i = \frac{\max(15, \min(100, v_i))}{100} \cdot R$$

#### Detailed TypeScript Specification & Contract:
```tsx
'use client';

import React, { useState } from 'react';

export interface SubjectMasteryData {
  turkce: number;    // 0 to 100%
  matematik: number; // 0 to 100%
  fen: number;       // 0 to 100%
  sosyal: number;    // 0 to 100%
  buept: number;     // 0 to 100%
}

export interface SubjectAttemptCounts {
  turkce?: number;
  matematik?: number;
  fen?: number;
  sosyal?: number;
  buept?: number;
}

export interface MasteryRadarChartProps {
  scores: SubjectMasteryData;
  counts?: SubjectAttemptCounts;
  size?: number; // Default: 320
  className?: string;
}

interface AxisConfig {
  key: keyof SubjectMasteryData;
  label: string;
  icon: string;
  color: string;
  badge: string;
}

const RADAR_AXES: AxisConfig[] = [
  { key: 'turkce', label: 'Türkçe', icon: '📖', color: '#38bdf8', badge: 'Anlam & Paragraf' },
  { key: 'matematik', label: 'Matematik', icon: '📐', color: '#f59e0b', badge: 'Sayısal Muhakeme' },
  { key: 'fen', label: 'Fen Bilimleri', icon: '⚡', color: '#10b981', badge: 'Fizik / Kimya / Biyo' },
  { key: 'sosyal', label: 'Sosyal Bilimler', icon: '🏛️', color: '#f43f5e', badge: 'Tarih / Coğrafya' },
  { key: 'buept', label: 'BUEPT English', icon: '🎓', color: '#a855f7', badge: 'Akademik İngilizce' },
];

export const MasteryRadarChart: React.FC<MasteryRadarChartProps> = ({
  scores,
  counts = {},
  size = 320,
  className = '',
}) => {
  const [hoveredAxis, setHoveredAxis] = useState<AxisConfig | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;

  // Compute 5-axis polygon points
  const points = RADAR_AXES.map((axis, i) => {
    const angle = (Math.PI * 2 * i) / RADAR_AXES.length - Math.PI / 2;
    const val = scores[axis.key] ?? 50;
    const r = (Math.max(15, Math.min(100, val)) / 100) * maxR;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      val,
      axis,
    };
  });

  const polygonString = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <radialGradient id="radarRadial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.15" />
          </radialGradient>
          <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Web Rings at 25%, 50%, 75%, 100% */}
        {[0.25, 0.5, 0.75, 1.0].map((scale) => {
          const ringPoints = RADAR_AXES.map((_, i) => {
            const angle = (Math.PI * 2 * i) / RADAR_AXES.length - Math.PI / 2;
            const r = maxR * scale;
            return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
          }).join(' ');

          return (
            <polygon
              key={scale}
              points={ringPoints}
              fill="none"
              stroke="rgba(148, 163, 184, 0.18)"
              strokeWidth={scale === 1.0 ? '1.5' : '1'}
              strokeDasharray={scale === 1.0 ? undefined : '3 3'}
            />
          );
        })}

        {/* Axis Spokes & Labels */}
        {RADAR_AXES.map((axis, i) => {
          const angle = (Math.PI * 2 * i) / RADAR_AXES.length - Math.PI / 2;
          const x2 = cx + Math.cos(angle) * maxR;
          const y2 = cy + Math.sin(angle) * maxR;
          const labelDist = maxR + 28;
          const lx = cx + Math.cos(angle) * labelDist;
          const ly = cy + Math.sin(angle) * labelDist;
          const score = scores[axis.key] ?? 50;

          return (
            <g key={axis.key} className="transition-opacity">
              {/* Spoke Line */}
              <line
                x1={cx}
                y1={cy}
                x2={x2}
                y2={y2}
                stroke="rgba(148, 163, 184, 0.25)"
                strokeWidth="1"
              />

              {/* Text Label */}
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[11px] font-black tracking-tight"
                fill={axis.color}
                cursor="pointer"
                onMouseEnter={() => setHoveredAxis(axis)}
                onMouseLeave={() => setHoveredAxis(null)}
              >
                {axis.icon} {axis.label} ({score}%)
              </text>
            </g>
          );
        })}

        {/* Player Data Polygon */}
        <polygon
          points={polygonString}
          fill="url(#radarRadial)"
          stroke="#818cf8"
          strokeWidth="2.5"
          filter="url(#radarGlow)"
          className="transition-all duration-300"
        />

        {/* Vertex Markers */}
        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={hoveredAxis?.key === p.axis.key ? '6' : '4'}
            fill={p.axis.color}
            stroke="#0f172a"
            strokeWidth="2"
            cursor="pointer"
            className="transition-all duration-200"
            onMouseEnter={() => setHoveredAxis(p.axis)}
            onMouseLeave={() => setHoveredAxis(null)}
          />
        ))}
      </svg>

      {/* Interactive Tooltip Card */}
      {hoveredAxis && (
        <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-slate-700 shadow-xl text-center space-y-0.5 text-xs animate-in fade-in duration-150">
          <div className="font-black text-white flex items-center justify-center gap-1">
            <span>{hoveredAxis.icon}</span>
            <span>{hoveredAxis.label}</span>
            <span className="text-slate-400">({scores[hoveredAxis.key]}%)</span>
          </div>
          <div className="text-[10px] text-indigo-300 font-semibold">{hoveredAxis.badge}</div>
          <div className="text-[10px] text-slate-400">
            {counts[hoveredAxis.key] !== undefined ? `Çözülen: ${counts[hoveredAxis.key]} Soru` : 'Kayıtlı Sınav Verisi'}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

### 3.5 Component 5: `TelemetryTracker.ts` Data Contracts
**Location**: `src/game/education/TelemetryTracker.ts`  
**Purpose**: Pure TypeScript telemetry tracking engine. Tracks attempts, correct count, accuracy rate, average response times, subject breakdowns across the 5 curriculum axes, and logs mistake history.

#### Detailed TypeScript Specification & Contract:
```typescript
/**
 * TelemetryTracker.ts - Educational Telemetry, 5-Axis Subject Tracking & Mistake Logger
 * Decoupled pure TypeScript implementation suitable for headless test runners and UI binding.
 */

import type { TacticalQuestion, QuestionCategory } from '@/types/game';
import type { MistakeRecord } from '@/components/MistakeNotebookModal';

export type SubjectAxis = 'turkce' | 'matematik' | 'fen' | 'sosyal' | 'buept';

export interface CategoryTelemetryMetric {
  axis: SubjectAxis;
  attempts: number;
  correct: number;
  wrong: number;
  skipped: number;
  streak: number;
  maxStreak: number;
  totalResponseTimeMs: number;
  avgResponseTimeMs: number;
  accuracyRate: number; // 0 to 100
}

export interface SessionTelemetryStats {
  totalAttempts: number;
  totalCorrect: number;
  totalWrong: number;
  totalSkipped: number;
  overallAccuracy: number;
  currentStreak: number;
  maxStreak: number;
  avgReactionTimeMs: number;
  studyBuffsClaimed: number;
  tacticalSuperpowersUsed: number;
}

export function mapCategoryToSubjectAxis(category: QuestionCategory | string): SubjectAxis {
  const cat = category.toLowerCase();
  if (cat.includes('türkçe') || cat.includes('turkce')) return 'turkce';
  if (cat.includes('matematik') || cat.includes('sayısal')) return 'matematik';
  if (cat.includes('fen')) return 'fen';
  if (cat.includes('sosyal')) return 'sosyal';
  if (cat.includes('buept')) return 'buept';
  return 'matematik';
}

export class TelemetryTracker {
  private categoryMetrics: Record<SubjectAxis, CategoryTelemetryMetric>;
  private mistakeLog: MistakeRecord[] = [];
  private sessionStats: SessionTelemetryStats = {
    totalAttempts: 0,
    totalCorrect: 0,
    totalWrong: 0,
    totalSkipped: 0,
    overallAccuracy: 0,
    currentStreak: 0,
    maxStreak: 0,
    avgReactionTimeMs: 0,
    studyBuffsClaimed: 0,
    tacticalSuperpowersUsed: 0,
  };

  constructor() {
    this.categoryMetrics = {
      turkce: this.createEmptyMetric('turkce'),
      matematik: this.createEmptyMetric('matematik'),
      fen: this.createEmptyMetric('fen'),
      sosyal: this.createEmptyMetric('sosyal'),
      buept: this.createEmptyMetric('buept'),
    };
  }

  private createEmptyMetric(axis: SubjectAxis): CategoryTelemetryMetric {
    return {
      axis,
      attempts: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
      streak: 0,
      maxStreak: 0,
      totalResponseTimeMs: 0,
      avgResponseTimeMs: 0,
      accuracyRate: 0,
    };
  }

  /**
   * Records a student question answer event.
   */
  public recordAttempt(
    question: TacticalQuestion,
    selectedIndex: number,
    isCorrect: boolean,
    responseTimeMs: number = 0,
    wave: number = 1
  ): void {
    const axis = mapCategoryToSubjectAxis(question.category);
    const cat = this.categoryMetrics[axis];

    this.sessionStats.totalAttempts++;
    cat.attempts++;
    cat.totalResponseTimeMs += responseTimeMs;
    cat.avgResponseTimeMs = Math.round(cat.totalResponseTimeMs / cat.attempts);

    if (isCorrect) {
      this.sessionStats.totalCorrect++;
      cat.correct++;
      cat.streak++;
      if (cat.streak > cat.maxStreak) cat.maxStreak = cat.streak;

      this.sessionStats.currentStreak++;
      if (this.sessionStats.currentStreak > this.sessionStats.maxStreak) {
        this.sessionStats.maxStreak = this.sessionStats.currentStreak;
      }
    } else {
      this.sessionStats.totalWrong++;
      cat.wrong++;
      cat.streak = 0;
      this.sessionStats.currentStreak = 0;

      // Log into Mistake Notebook
      this.mistakeLog.push({
        id: `mistake_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        question,
        userChoiceIndex: selectedIndex,
        status: selectedIndex < 0 ? 'timeout' : 'wrong',
        timestamp: Date.now(),
        wave,
        resolved: false,
      });
    }

    // Recompute accuracies
    cat.accuracyRate = Math.round((cat.correct / cat.attempts) * 100);
    this.sessionStats.overallAccuracy = Math.round(
      (this.sessionStats.totalCorrect / this.sessionStats.totalAttempts) * 100
    );

    // Running average reaction time
    const prevTotal = (this.sessionStats.totalAttempts - 1) * this.sessionStats.avgReactionTimeMs;
    this.sessionStats.avgReactionTimeMs = Math.round((prevTotal + responseTimeMs) / this.sessionStats.totalAttempts);
  }

  /**
   * Resolves a failed mistake entry.
   */
  public resolveMistake(mistakeId: string): boolean {
    const item = this.mistakeLog.find((m) => m.id === mistakeId);
    if (item && !item.resolved) {
      item.resolved = true;
      return true;
    }
    return false;
  }

  public get5AxisScores(): Record<SubjectAxis, number> {
    return {
      turkce: this.categoryMetrics.turkce.attempts > 0 ? this.categoryMetrics.turkce.accuracyRate : 50,
      matematik: this.categoryMetrics.matematik.attempts > 0 ? this.categoryMetrics.matematik.accuracyRate : 50,
      fen: this.categoryMetrics.fen.attempts > 0 ? this.categoryMetrics.fen.accuracyRate : 50,
      sosyal: this.categoryMetrics.sosyal.attempts > 0 ? this.categoryMetrics.sosyal.accuracyRate : 50,
      buept: this.categoryMetrics.buept.attempts > 0 ? this.categoryMetrics.buept.accuracyRate : 50,
    };
  }

  public getAttemptCounts(): Record<SubjectAxis, number> {
    return {
      turkce: this.categoryMetrics.turkce.attempts,
      matematik: this.categoryMetrics.matematik.attempts,
      fen: this.categoryMetrics.fen.attempts,
      sosyal: this.categoryMetrics.sosyal.attempts,
      buept: this.categoryMetrics.buept.attempts,
    };
  }

  public getMistakeLog(): MistakeRecord[] {
    return [...this.mistakeLog];
  }

  public getSessionStats(): SessionTelemetryStats {
    return { ...this.sessionStats };
  }

  public recordStudyBuffClaimed(): void {
    this.sessionStats.studyBuffsClaimed++;
  }

  public recordTacticalSuperpowerUsed(): void {
    this.sessionStats.tacticalSuperpowersUsed++;
  }

  public resetSession(): void {
    this.mistakeLog = [];
    this.sessionStats = {
      totalAttempts: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalSkipped: 0,
      overallAccuracy: 0,
      currentStreak: 0,
      maxStreak: 0,
      avgReactionTimeMs: 0,
      studyBuffsClaimed: 0,
      tacticalSuperpowersUsed: 0,
    };
    (Object.keys(this.categoryMetrics) as SubjectAxis[]).forEach((axis) => {
      this.categoryMetrics[axis] = this.createEmptyMetric(axis);
    });
  }
}
```

---

## 4. Integration Blueprint for `page.tsx` & `GameCanvas.tsx`

### 4.1 In `src/app/page.tsx`:
1. **State Hooks Added**:
   ```typescript
   const telemetryRef = useRef<TelemetryTracker>(new TelemetryTracker());
   const [isStudyModalOpen, setIsStudyModalOpen] = useState<boolean>(false);
   const [isMistakeNotebookOpen, setIsMistakeNotebookOpen] = useState<boolean>(false);
   ```
2. **Inter-Wave Study Sequence**:
   - In `handleWaveComplete`:
     ```typescript
     // Open StudyBuffModal between wave end and shop, or allow entering shop with study banner
     setIsStudyModalOpen(true);
     ```
   - When reward is selected via `handleApplyStudyReward(reward)`:
     ```typescript
     if (reward.statModifiers) {
       setRunStats(prev => ({ ...prev, ...reward.statModifiers }));
     }
     if (reward.materialsBonus) {
       setRunMaterials(prev => prev + reward.materialsBonus);
     }
     telemetryRef.current.recordStudyBuffClaimed();
     ```
3. **Hub Navigation**:
   - Add "📓 Yanlış Defteri" and "📊 5-Eksenli Yetenek Radarı" button in top nav header.
   - Embed `MasteryRadarChart` on the Hub main view alongside the 17 RPG stats.

### 4.2 In `src/components/GameCanvas.tsx`:
1. **Tactical Freeze Trigger on Chest Collection**:
   ```typescript
   if (dropResult.collectedChests > 0) {
     gameLoopRef.current?.setTacticalFreeze(true);
     setIsTacticalFreeze(true);
     setTacticalFreezeEvent({
       source: 'mystery_chest',
       question: pickRandomTacticalQuestion(),
     });
   }
   ```
2. **Superpower Execution on Selection**:
   ```typescript
   const handleSuperpowerExecute = (powerType: TacticalRewardType) => {
     if (powerType === 'emergency_heal') {
       const missing = player.stats.maxHp - player.stats.currentHp;
       const heal = Math.max(30, Math.floor(missing * 0.5));
       player.stats.currentHp = Math.min(player.stats.maxHp, player.stats.currentHp + heal);
       player.invulnerabilityTimerMs = 3000;
       ftm.spawnHeal(player.x, player.y, heal, true);
     } else if (powerType === 'orbital_nuke') {
       for (const enemy of enemiesRef.current) {
         enemy.hp -= 500;
         enemy.hitFlashTimerMs = 200;
       }
       vfx.triggerWhiteFlash(0.5);
       vfx.addTrauma(0.5);
     } else if (powerType === 'flow_state_frenzy') {
       frenzyTimerRef.current = 10; // 10s frenzy overdrive
     } else if (powerType === 'global_vacuum') {
       // Set vacuum on all pickups instantly
       for (const p of pickupsRef.current) {
         p.isMagnetized = true;
       }
     }

     // Unfreeze game loop
     gameLoopRef.current?.setTacticalFreeze(false);
     setIsTacticalFreeze(false);
   };
   ```

---

## 5. Caveats

1. **Passage Token Rendering**: Evidence hunt questions (`type: 'evidence_hunt'`) from legacy code use clickable inline word tokens (`passageTokens`). The primary UI blueprint focuses on standard 4-choice multiple-choice (`multiple_choice`) which represents the vast majority of YKS/BUEPT questions. Evidence hunt questions can be rendered as an interactive inline token list when `type === 'evidence_hunt'`.
2. **Audio Autoplay Unlocking**: `soundEngine` relies on user gesture unlocking. Since modal option clicks and key presses represent explicit user gestures, audio initialization is guaranteed.
3. **No Direct Source Changes Rule**: As an explorer in a read-only investigation role, no code files under `src/` were directly modified. All blueprints, specifications, and data schemas are documented here in `handoff.md` ready for the worker agent to apply.

---

## 6. Conclusion

The specification and architecture for Milestone 4 Educational UI Modals, Mistake Notebook, and 5-Axis Subject Mastery Radar Chart is complete:
1. `StudyBuffModal.tsx`: Fully specified with 3 subject cards, question prompt, 4 clickable/keyboard options, timer, immediate feedback, 3-choice curriculum rewards, and zero-penalty consolation.
2. `TacticalFreezeModal.tsx`: Fully specified with pulsing cyan/violet vignette, frame-accurate freeze (`dt = 0`), and 4 in-combat superpowers.
3. `MistakeNotebookModal.tsx`: Fully specified with subject tabs, student vs. correct answer contrast, "Boğaziçili Koç Taktiği" pedagogical solutions, and interactive re-solve intikam feature.
4. `MasteryRadarChart.tsx`: Fully specified with clean 5-axis polar-to-cartesian SVG geometry, concentric web rings, gradient polygon, and hover tooltips.
5. `TelemetryTracker.ts`: Pure TypeScript data contracts for attempts, streak tracking, accuracy %, mistake logging, and 5-axis metric generation.

---

## 7. Verification Method

To independently verify the implementation once applied by the Worker:

1. **Automated Unit & Integration Tests**:
   ```bash
   export PATH="$HOME/.local/node/bin:$PATH" && npm run test
   ```
   *Verify that all 228 tests in `tests/` continue to pass without regressions, including `tests/unit/question_buffs.test.ts`.*

2. **TypeScript & Lint Verification**:
   ```bash
   export PATH="$HOME/.local/node/bin:$PATH" && npm run build
   ```
   *Verify zero TypeScript compiler diagnostics and zero lint errors during Next.js production build.*

3. **Visual & Interactive Inspection**:
   - Check `StudyBuffModal`: Confirm keyboard navigation (`A`/`B`/`C`/`D` or `1`/`2`/`3`/`4`) and reward application.
   - Check `TacticalFreezeModal`: Confirm mystery chest pickup pauses simulation at `dt = 0`, applies superpower, and resumes smoothly.
   - Check `MasteryRadarChart`: Confirm SVG polygon renders 5 distinct spokes (Türkçe, Matematik, Fen, Sosyal, BUEPT) with correct 0-100% radial coordinates.
   - Check `MistakeNotebookModal`: Confirm failed questions appear, filter by subject, and allow re-solving.
