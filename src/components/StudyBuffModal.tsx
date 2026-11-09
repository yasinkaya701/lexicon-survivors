'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Sparkles,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Brain,
  ArrowRight,
  Calculator,
  Landmark,
  GraduationCap,
  Dices,
  ShoppingBag,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound';
import type { TacticalQuestion, QuestionCategory } from '@/types/game';
import type { PlayerRPGStats, StatModifiers } from '@/types/brotato';
import { calculateSubjectBuff } from '@/game/education/BuffMatrix';

export type SubjectTheme = 'turkce' | 'matematik' | 'fen' | 'sosyal' | 'buept';

export const renderSubjectIcon = (id: SubjectTheme) => {
  switch (id) {
    case 'matematik':
      return <Calculator className="h-5 w-5 text-amber-400" />;
    case 'turkce':
      return <BookOpen className="h-5 w-5 text-sky-400" />;
    case 'fen':
      return <Zap className="h-5 w-5 text-emerald-400" />;
    case 'sosyal':
      return <Landmark className="h-5 w-5 text-rose-400" />;
    case 'buept':
      return <GraduationCap className="h-5 w-5 text-purple-400" />;
    default:
      return <Brain className="h-5 w-5 text-indigo-400" />;
  }
};

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
  statPreview: StatModifiers;
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
  currentStreak?: number;
  onApplyReward: (reward: StudyReward) => void;
  onRecordMistake?: (question: TacticalQuestion, selectedIndex: number) => void;
  onClose: () => void;
}

export const SUBJECT_OPTIONS: CurriculumSubjectOption[] = [
  {
    id: 'matematik',
    title: 'TYT Matematik',
    category: 'TYT Matematik',
    icon: 'matematik',
    badge: 'Sayısal Muhakeme',
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    bgGradient: 'from-amber-950/40 via-slate-900 to-slate-950',
    buffDescription: '+%8 Saldırı Hızı & +%6 Kritik Şans',
    statPreview: { attackSpeed: 8, critChancePercent: 6, damagePercent: 5 },
  },
  {
    id: 'turkce',
    title: 'TYT Türkçe',
    category: 'TYT Türkçe',
    icon: 'turkce',
    badge: 'Anlam & Paragraf',
    accentColor: 'text-sky-400',
    borderColor: 'border-sky-500/50 hover:border-sky-400',
    bgGradient: 'from-sky-950/40 via-slate-900 to-slate-950',
    buffDescription: '+%5 Hareket Hızı & +%4 Sıyrılma (Max %60)',
    statPreview: { speedPercent: 5, dodgePercent: 4, pickupRange: 25 },
  },
  {
    id: 'fen',
    title: 'AYT Fen Bilimleri',
    category: 'AYT Fen',
    icon: 'fen',
    badge: 'Mekanik & Enerji',
    accentColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/50 hover:border-emerald-400',
    bgGradient: 'from-emerald-950/40 via-slate-900 to-slate-950',
    buffDescription: '+3 Element Hasarı & +4 Mühendislik',
    statPreview: { elementalDamage: 3, engineering: 4, hpRegen: 2 },
  },
  {
    id: 'sosyal',
    title: 'TYT Sosyal Bilimler',
    category: 'TYT Sosyal',
    icon: 'sosyal',
    badge: 'Tarih & Felsefe',
    accentColor: 'text-rose-400',
    borderColor: 'border-rose-500/50 hover:border-rose-400',
    bgGradient: 'from-rose-950/40 via-slate-900 to-slate-950',
    buffDescription: '+2 Zırh & +15 Maksimum Can',
    statPreview: { armor: 2, maxHp: 15, luck: 3 },
  },
  {
    id: 'buept',
    title: 'BUEPT Academic English',
    category: 'BUEPT Vocab',
    icon: 'buept',
    badge: 'Hazırlık Kurdu',
    accentColor: 'text-purple-400',
    borderColor: 'border-purple-500/50 hover:border-purple-400',
    bgGradient: 'from-purple-950/40 via-slate-900 to-slate-950',
    buffDescription: '+15 Hasat (Harvesting) & +5 Şans (Luck)',
    statPreview: { harvesting: 15, luck: 5, range: 20 },
  },
];

export const StudyBuffModal: React.FC<StudyBuffModalProps> = ({
  isOpen,
  currentWave,
  availableQuestions,
  currentStreak = 0,
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

  // Reset state whenever modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedSubject(null);
      setCurrentQuestion(null);
      setSelectedOptionIndex(null);
      setIsAnswered(false);
      setIsCorrect(false);
      setSelectedReward(null);
    }
  }, [isOpen]);

  // Pick question when subject is chosen
  const handleSelectSubject = (subject: CurriculumSubjectOption) => {
    setSelectedSubject(subject);
    try {
      soundEngine.playComboUp(1);
    } catch {
      // Audio fallback
    }

    const matching = availableQuestions.filter((q) => {
      const cat = q.category.toLowerCase();
      if (subject.id === 'matematik') return cat.includes('matematik') || cat.includes('sayısal');
      if (subject.id === 'turkce') return cat.includes('türkçe') || cat.includes('turkce');
      if (subject.id === 'fen') return cat.includes('fen');
      if (subject.id === 'sosyal') return cat.includes('sosyal');
      if (subject.id === 'buept') return cat.includes('buept');
      return false;
    });

    const pool = matching.length > 0 ? matching : availableQuestions;
    const question = pool[Math.floor(Math.random() * pool.length)];

    setCurrentQuestion(question);
    setTimeRemaining(question.timeLimitSec || 20);
    setIsAnswered(false);
    setSelectedOptionIndex(null);
  };

  const handleAnswer = useCallback(
    (index: number) => {
      if (isAnswered || !currentQuestion) return;
      setIsAnswered(true);
      setSelectedOptionIndex(index);

      let correct = false;
      if (currentQuestion.type === 'multiple_choice') {
        correct = index === currentQuestion.correctIndex;
      } else if (currentQuestion.type === 'evidence_hunt' && currentQuestion.passageTokens) {
        const token = currentQuestion.passageTokens[index];
        correct = !!token && token.isClue === true;
      }

      setIsCorrect(correct);

      if (correct) {
        try {
          soundEngine.playQuestionCorrect();
          soundEngine.playComboUp(2);
        } catch {
          // Audio fallback
        }
      } else {
        try {
          soundEngine.playQuestionWrong();
        } catch {
          // Audio fallback
        }
        if (onRecordMistake) {
          onRecordMistake(currentQuestion, index);
        }
      }
    },
    [isAnswered, currentQuestion, onRecordMistake]
  );

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

      if (index >= 0) {
        if (currentQuestion.type === 'multiple_choice' && currentQuestion.options && index < currentQuestion.options.length) {
          handleAnswer(index);
        } else if (currentQuestion.type === 'evidence_hunt' && currentQuestion.passageTokens && index < currentQuestion.passageTokens.length) {
          handleAnswer(index);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentQuestion, isAnswered, handleAnswer]);

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
  }, [isOpen, currentQuestion, isAnswered, timeRemaining, handleAnswer]);

  // 3-Choice Reward Options upon correct answer
  const rewardChoices: StudyReward[] = useMemo(() => {
    if (!selectedSubject || !currentQuestion) return [];
    const calculatedBuffs = calculateSubjectBuff(
      currentQuestion.category,
      currentQuestion.difficulty || 1,
      currentStreak ?? 0
    );

    return [
      {
        type: 'subject_stat',
        title: `${selectedSubject.title} Uzmanlık Güçlendirmesi`,
        description: selectedSubject.buffDescription,
        statModifiers: calculatedBuffs,
      },
      {
        type: 'scholarship_materials',
        title: 'Boğaziçi Akademik Başarı Bursu',
        description: '+35 Materyal anında envantere aktarılır.',
        materialsBonus: 35,
      },
      {
        type: 'shop_discount',
        title: 'Kampüs Kırtasiye İndirim Kuponu',
        description: 'Bu dalga dükkandaki tüm silah ve eşyalarda %20 indirim kuponu.',
        discountPercent: 20,
      },
    ];
  }, [selectedSubject, currentQuestion, currentStreak]);

  // Consolation Reward upon wrong answer
  const isRescueMode = (currentStreak ?? 0) <= -2;
  const consolationReward: StudyReward = isRescueMode
    ? {
        type: 'subject_stat',
        title: 'Kurtarma Modu: Moral Telafi Güçlendirmesi',
        description: 'Zorlu anlarda dayanıklılık: +%2 Hız, +2 Şans & +10 Materyal.',
        statModifiers: { speedPercent: 2, luck: 2 },
        materialsBonus: 10,
      }
    : {
        type: 'subject_stat',
        title: 'Moral Telafi Güçlendirmesi',
        description: 'Hatalardan öğrenmek en büyük erdemdir: +%2 Hız & +5 Materyal.',
        statModifiers: { speedPercent: 2, luck: 1 },
        materialsBonus: 5,
      };

  const handleConfirmReward = () => {
    const reward = isCorrect ? (selectedReward || rewardChoices[0]) : consolationReward;
    onApplyReward(reward);
    try {
      soundEngine.playCashRegister();
    } catch {
      // Audio fallback
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl border border-indigo-500/30 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Step 1: Subject Selection */}
        {!selectedSubject && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 inline-flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" /> DALGALAR ARASI ETÜT ODASI (DALGA {currentWave})
              </span>
              <h2 className="text-2xl font-black text-white">Çalışmak İstediğin Alanı Seç</h2>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                Doğru cevaplayacağın YKS/BUEPT sorusu doğrudan kahramanının RPG statlarını güçlendirir ve kampüs bursu kazandırır.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {SUBJECT_OPTIONS.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleSelectSubject(sub)}
                  className={`p-4 rounded-2xl border text-left transition relative overflow-hidden bg-gradient-to-br ${sub.bgGradient} ${sub.borderColor} group cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950/60 border border-slate-700/60 shadow-inner">
                      {renderSubjectIcon(sub.id)}
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-900/80 text-slate-300 border border-slate-700">
                      {sub.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors">
                    {sub.title}
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                    {sub.buffDescription}
                  </p>
                </button>
              ))}
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() =>
                  handleSelectSubject(
                    SUBJECT_OPTIONS[Math.floor(Math.random() * SUBJECT_OPTIONS.length)]
                  )
                }
                className="px-6 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center gap-2 mx-auto"
              >
                <Dices className="h-4 w-4 text-indigo-400" />
                <span>Şansıma Güveniyorum (Rastgele Soru)</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Question & Options Display */}
        {selectedSubject && currentQuestion && !isAnswered && (
          <div className="space-y-5">
            {/* Question Header & Timer */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950/60 border border-slate-700/60 shadow-inner">
                  {renderSubjectIcon(selectedSubject.id)}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{selectedSubject.title}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Tier {currentQuestion.difficulty} • {currentQuestion.category}
                  </span>
                </div>
              </div>

              {/* Timer Bar */}
              <div className="flex items-center gap-2">
                <Clock
                  className={`w-4 h-4 ${
                    timeRemaining <= 5 ? 'text-rose-400 animate-spin' : 'text-amber-400'
                  }`}
                />
                <span
                  className={`text-sm font-black tabular-nums ${
                    timeRemaining <= 5 ? 'text-rose-400' : 'text-slate-200'
                  }`}
                >
                  {timeRemaining}s
                </span>
              </div>
            </div>

            {/* Prompt */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-sm font-bold text-slate-100 leading-relaxed">
              {currentQuestion.prompt}
            </div>

            {/* Multiple Choice Options */}
            {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options.map((opt, idx) => {
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
            )}

            {/* Evidence Hunt Tokens */}
            {currentQuestion.type === 'evidence_hunt' && currentQuestion.passageTokens && (
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-sky-400 block">
                  İlgili anahtar kelimeye tıklayarak kalkanı kır:
                </span>
                <div className="flex flex-wrap gap-2 text-sm">
                  {currentQuestion.passageTokens.map((tok, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:border-indigo-400 hover:bg-indigo-900/60 text-slate-200 hover:text-white font-medium text-xs transition cursor-pointer"
                    >
                      {tok.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
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
                const isSelected =
                  selectedReward?.type === choice.type || (!selectedReward && idx === 0);
                return (
                  <button
                    key={choice.type}
                    onClick={() => {
                      setSelectedReward(choice);
                      try {
                        soundEngine.playComboUp(1);
                      } catch {
                        // Audio fallback
                      }
                    }}
                    className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/30 ring-2 ring-emerald-500/50'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30">
                        {choice.type === 'subject_stat' ? (
                          <Zap className="h-4 w-4 text-amber-400" />
                        ) : choice.type === 'scholarship_materials' ? (
                          <Sparkles className="h-4 w-4 text-cyan-400" />
                        ) : (
                          <ShoppingBag className="h-4 w-4 text-emerald-400" />
                        )}
                      </div>
                      <h4 className="text-xs font-black text-white">{choice.title}</h4>
                      <p className="text-[11px] text-slate-400">{choice.description}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-bold text-emerald-400">
                      {isSelected ? 'Seçildi' : 'Seçmek İçin Tıkla'}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleConfirmReward}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <span>ÖDÜLÜ ENJEKTE ET VE DÜKKANA GEÇ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: Wrong Answer Grace & Consolation */}
        {isAnswered && !isCorrect && (
          <div className="space-y-5 animate-in zoom-in-95 duration-200">
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/50 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
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
                <span className="flex items-center gap-1.5 font-bold mb-1">
                  <XCircle className="h-3.5 w-3.5 text-rose-400" />
                  Senin Seçimin:
                </span>
                <span>
                  {selectedOptionIndex !== null &&
                  selectedOptionIndex >= 0 &&
                  currentQuestion?.options
                    ? currentQuestion.options[selectedOptionIndex]
                    : 'Süre Doldu'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300">
                <span className="flex items-center gap-1.5 font-bold mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Doğru Cevap:
                </span>
                <span>
                  {currentQuestion?.correctIndex !== undefined && currentQuestion.options
                    ? currentQuestion.options[currentQuestion.correctIndex]
                    : 'İlgili anahtar ifade'}
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
              <span className="text-slate-400">
                {isRescueMode ? 'Kurtarma Modu Telafi Bonusu:' : 'Moral Telafi Bonusu:'}
              </span>
              <span className="font-black text-amber-400">
                +{consolationReward.statModifiers?.speedPercent}% Hız & +{consolationReward.statModifiers?.luck} Şans & +
                {consolationReward.materialsBonus} Materyal
              </span>
            </div>

            <button
              onClick={handleConfirmReward}
              className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>TELAFİ ÖDÜLÜNÜ AL VE DÜKKANA GEÇ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
