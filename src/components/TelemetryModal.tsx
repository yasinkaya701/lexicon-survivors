'use client';

import React from 'react';
import { BarChart3, X, BookOpen } from 'lucide-react';
import { MasteryRadarChart, type SubjectMasteryData, type SubjectAttemptCounts } from './MasteryRadarChart';
import type { MistakeRecord } from '@/game/education/TelemetryTracker';

export interface TelemetryModalProps {
  isOpen: boolean;
  scores: SubjectMasteryData;
  counts?: SubjectAttemptCounts;
  mistakes?: MistakeRecord[];
  onClose: () => void;
  onOpenMistakes?: () => void;
}

export const TelemetryModal: React.FC<TelemetryModalProps> = ({
  isOpen,
  scores,
  counts = {},
  mistakes = [],
  onClose,
  onOpenMistakes,
}) => {
  if (!isOpen) return null;

  const totalMistakes = mistakes.length;
  const resolvedMistakes = mistakes.filter((m) => m.resolved).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150 font-sans">
      <div className="max-w-xl w-full rounded-3xl border border-indigo-500/30 bg-slate-900/90 p-6 space-y-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-500/40 shadow-inner">
              <BarChart3 className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">5-EKSENLİ YETENEK & TELEMETRİ RADARI</h3>
              <p className="text-[11px] text-slate-400">
                ÖSYM YKS ve Boğaziçi BUEPT Alan Başarı Dağılımı
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            <span>Kapat</span>
          </button>
        </div>

        <div className="flex justify-center py-2">
          <MasteryRadarChart scores={scores} counts={counts} size={300} />
        </div>

        {totalMistakes > 0 && (
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-200">Kayıtlı Yanlışlar: </span>
              <span className="text-rose-400 font-bold">{totalMistakes} soru</span>
              <span className="text-slate-400"> ({resolvedMistakes} intikam alındı)</span>
            </div>
            {onOpenMistakes && (
              <button
                onClick={onOpenMistakes}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 border border-indigo-500/50 hover:bg-indigo-600/40 text-indigo-300 font-bold transition cursor-pointer shadow-sm"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Defteri Aç</span>
              </button>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
        >
          Kapat
        </button>
      </div>
    </div>
  );
};
