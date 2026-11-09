'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound';
import type { MistakeRecord } from '@/game/education/TelemetryTracker';

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
      const cat = (m.question?.category || '').toLowerCase();
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
      const cat = (m.question?.category || '').toLowerCase();
      if (selectedFilter === 'turkce') return cat.includes('türkçe') || cat.includes('turkce');
      if (selectedFilter === 'matematik') return cat.includes('matematik') || cat.includes('sayısal');
      if (selectedFilter === 'fen') return cat.includes('fen');
      if (selectedFilter === 'sosyal') return cat.includes('sosyal');
      if (selectedFilter === 'buept') return cat.includes('buept');
      return true;
    });
  }, [mistakes, selectedFilter]);

  const resolvedCount = mistakes.filter((m) => m.resolved).length;
  const recoveryRate =
    mistakes.length > 0 ? Math.round((resolvedCount / mistakes.length) * 100) : 100;

  const handleReattempt = (mistake: MistakeRecord, chosenIndex: number) => {
    let isCorrect = false;
    if (mistake.question.type === 'multiple_choice') {
      isCorrect = chosenIndex === mistake.question.correctIndex;
    } else if (mistake.question.type === 'evidence_hunt' && mistake.question.passageTokens) {
      const token = mistake.question.passageTokens[chosenIndex];
      isCorrect = !!token && token.isClue === true;
    }

    if (isCorrect) {
      try {
        soundEngine.playQuestionCorrect();
        soundEngine.playCashRegister();
      } catch {
        // Audio fallback
      }
      onResolveMistake(mistake.id);
      setActiveReattemptId(null);
    } else {
      try {
        soundEngine.playQuestionWrong();
      } catch {
        // Audio fallback
      }
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
                        <CheckCircle2 className="w-3.5 h-3.5" /> İntikam Alındı (+Net)
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

                  <div className="text-xs font-bold text-slate-100">{record.question.prompt}</div>

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
                          : 'İlgili anahtar sözcük'}
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
                      {record.question.type === 'multiple_choice' && record.question.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {record.question.options.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              onClick={() => handleReattempt(record, oIdx)}
                              className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500 text-left text-xs text-slate-200 transition cursor-pointer"
                            >
                              <span className="font-mono text-indigo-400 mr-2">
                                [{['A', 'B', 'C', 'D'][oIdx]}]
                              </span>
                              <span>{opt}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {record.question.type === 'evidence_hunt' && record.question.passageTokens && (
                        <div className="flex flex-wrap gap-2">
                          {record.question.passageTokens.map((tok, tIdx) => (
                            <button
                              key={tIdx}
                              onClick={() => handleReattempt(record, tIdx)}
                              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500 text-xs text-slate-200 transition cursor-pointer"
                            >
                              {tok.text}
                            </button>
                          ))}
                        </div>
                      )}
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
