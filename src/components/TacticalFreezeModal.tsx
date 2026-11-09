'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart,
  Bomb,
  Flame,
  Magnet,
  AlertTriangle,
  Clock,
  ArrowRight,
  Sparkles,
  Package,
  Crown,
  Lightbulb,
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
  source: 'mystery_chest' | 'elite_challenge' | 'elite_defeat' | 'manual_intercept';
  question: TacticalQuestion;
  onSelectSuperpower: (rewardType: TacticalRewardType) => void;
  onWrongAnswer?: () => void;
  onClose: () => void;
}

export const SUPERPOWER_CARDS: TacticalSuperpowerOption[] = [
  {
    type: 'emergency_heal',
    title: 'Yenileyici Dalga (Revitalizing Surge)',
    badge: 'Hayatta Kalma',
    description: "Maksimum canının %50'sini anında doldurur (min 30 HP) ve 3 saniye hasar almazlık kalkanı verir.",
    icon: <Heart className="w-6 h-6 text-rose-400" />,
    bgGradient: 'from-rose-950/40 via-slate-900 to-slate-950',
    borderColor: 'border-rose-500/50 hover:border-rose-400',
    accentColor: 'text-rose-400',
  },
  {
    type: 'orbital_nuke',
    title: 'Yörüngesel Parçacık Bombası (Orbital Nuke)',
    badge: 'Kitle İmha',
    description: 'Ekrandaki tüm düşmanlara 500 saf enerji hasarı vurarak arenadaki tüm tehditleri temizler.',
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
  onWrongAnswer,
  onClose,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(15);

  useEffect(() => {
    if (!isOpen) return;
    try {
      soundEngine.playTacticalFreeze();
    } catch {
      // Audio fallback
    }
    setIsAnswered(false);
    setSelectedOption(null);
    setCountdown(question.timeLimitSec || 15);
  }, [isOpen, question]);

  const handleOptionClick = useCallback(
    (idx: number) => {
      if (isAnswered) return;
      setIsAnswered(true);
      setSelectedOption(idx);

      let correct = false;
      if (question.type === 'multiple_choice') {
        correct = idx === question.correctIndex;
      } else if (question.type === 'evidence_hunt' && question.passageTokens) {
        const token = question.passageTokens[idx];
        correct = !!token && token.isClue === true;
      }

      setIsCorrect(correct);

      if (correct) {
        try {
          soundEngine.playQuestionCorrect();
          soundEngine.playComboUp(3);
        } catch {
          // Audio fallback
        }
      } else {
        try {
          soundEngine.playQuestionWrong();
        } catch {
          // Audio fallback
        }
        if (onWrongAnswer) {
          onWrongAnswer();
        }
      }
    },
    [isAnswered, question, onWrongAnswer]
  );

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

      if (index >= 0) {
        if (question.type === 'multiple_choice' && question.options && index < question.options.length) {
          handleOptionClick(index);
        } else if (question.type === 'evidence_hunt' && question.passageTokens && index < question.passageTokens.length) {
          handleOptionClick(index);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAnswered, question, handleOptionClick]);

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
  }, [isOpen, isAnswered, countdown, handleOptionClick]);

  const handleSuperpowerPick = (powerType: TacticalRewardType) => {
    try {
      if (powerType === 'orbital_nuke') {
        soundEngine.playNukeDetonation();
      } else {
        soundEngine.playComboUp(3);
      }
    } catch {
      // Audio fallback
    }
    onSelectSuperpower(powerType);
    onClose();
  };

  const handleGraceResume = () => {
    try {
      soundEngine.playPlayerHurt();
    } catch {
      // Audio fallback
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 font-sans select-none animate-in fade-in duration-150">
      {/* Pulsing Cyan / Violet Tactical Vignette */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_140px_rgba(56,189,248,0.35)] animate-pulse" />

      <div className="relative w-full max-w-4xl rounded-3xl border border-indigo-500/30 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Tactical Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-sky-500/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 text-2xl border border-sky-400/40 text-sky-300 animate-pulse">
              {source === 'mystery_chest' ? (
                <Package className="h-6 w-6 text-sky-400" />
              ) : (
                <Crown className="h-6 w-6 text-amber-400" />
              )}
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
            <Clock
              className={`w-4 h-4 ${
                countdown <= 5 ? 'text-rose-400 animate-spin' : 'text-sky-400'
              }`}
            />
            <span
              className={`text-sm font-black tabular-nums ${
                countdown <= 5 ? 'text-rose-400' : 'text-white'
              }`}
            >
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

            {/* Multiple Choice Options */}
            {question.type === 'multiple_choice' && question.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {question.options.map((opt, idx) => {
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
            )}

            {/* Evidence Hunt Tokens */}
            {question.type === 'evidence_hunt' && question.passageTokens && (
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-sky-400 block">
                  İlgili anahtar kelimeye tıklayarak kalkanı kır:
                </span>
                <div className="flex flex-wrap gap-2 text-sm">
                  {question.passageTokens.map((tok, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleOptionClick(idx)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:border-sky-400 hover:bg-sky-900/60 text-slate-200 hover:text-white font-medium text-xs transition cursor-pointer"
                    >
                      {tok.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-900/80 ${card.accentColor} border border-slate-800`}
                      >
                        {card.badge}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-white group-hover:text-sky-300 transition-colors">
                      {card.title}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{card.description}</p>
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
              <span className="font-black text-indigo-300 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                Boğaziçili Koç Taktiği Notu:
              </span>
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
