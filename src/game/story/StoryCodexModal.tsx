'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Compass,
  Sparkles,
  FlaskConical,
  Feather,
  Award,
  Scroll,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import {
  ALL_CHARACTER_QUESTS,
  CharacterQuestId,
  StoryMilestone,
} from '@/data/storyQuests';

export interface StoryCodexModalProps {
  questId: CharacterQuestId;
  currentWave: number;
  isOpen: boolean;
  onClose: () => void;
}

export const StoryCodexModal: React.FC<StoryCodexModalProps> = ({
  questId,
  currentWave,
  isOpen,
  onClose,
}) => {
  const quest = ALL_CHARACTER_QUESTS[questId];
  const [selectedMilestoneWave, setSelectedMilestoneWave] = useState<number>(5);

  if (!isOpen || !quest) return null;

  const selectedMilestone =
    quest.milestones.find((m) => m.wave === selectedMilestoneWave) ||
    quest.milestones[0];
  const isUnlocked = currentWave >= selectedMilestone.wave;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-[#0e1424] via-[#090d18] to-[#05070d] border-2 border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-amber-500/20 bg-amber-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  KÜTÜPHANE KAYITLARI &amp; YADİGÂR KODEKSİ
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {quest.questSubtitle}
                </span>
              </div>
              <h2 className="text-lg font-black text-white font-serif tracking-tight">
                {quest.heroName} — 100 Dalgalık Anlatı Günlüğü
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Book Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[480px]">
          {/* Left Column: Chapters & Timeline (5 cols) */}
          <div className="md:col-span-5 border-r border-slate-800 bg-slate-950/60 p-4 overflow-y-auto space-y-2 custom-scrollbar">
            <div className="text-[11px] font-mono uppercase text-slate-400 font-bold tracking-wider mb-2">
              Dönüm Noktaları (Her 5 Dalga)
            </div>

            {quest.milestones.map((m) => {
              const unlocked = currentWave >= m.wave;
              const isSelected = m.wave === selectedMilestoneWave;

              return (
                <div
                  key={m.wave}
                  onClick={() => setSelectedMilestoneWave(m.wave)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-500/60 text-white shadow-md'
                      : unlocked
                      ? 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                      : 'bg-slate-950/30 border-slate-900 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-[11px] font-mono font-bold w-14 shrink-0 text-amber-400/90">
                      Dalga {m.wave}
                    </span>
                    <span className="text-xs font-serif truncate font-medium">
                      {unlocked ? m.title : '??? Mühürlü'}
                    </span>
                  </div>

                  <div className="shrink-0">
                    {unlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Milestone Details, Lore & Relic (7 cols) */}
          <div className="md:col-span-7 p-6 overflow-y-auto space-y-5 bg-gradient-to-br from-[#0c101c] to-[#060810] custom-scrollbar">
            {isUnlocked ? (
              <>
                <div className="border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold">
                    <span>DALGA {selectedMilestone.wave} DÖNÜM NOKTASI</span>
                  </div>
                  <h3 className="text-2xl font-black text-white font-serif mt-1">
                    {selectedMilestone.title}
                  </h3>
                  <p className="text-xs text-amber-200/80 italic mt-0.5">
                    {selectedMilestone.subtitle}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed italic">
                  {selectedMilestone.premise}
                </div>

                {/* Dialogues */}
                <div className="space-y-2.5">
                  <div className="text-[11px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                    Anlatı &amp; Diyalog
                  </div>
                  {selectedMilestone.dialogues.map((dlg, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80"
                    >
                      <span className="text-xs font-bold text-amber-400 block mb-0.5">
                        {dlg.speaker}:
                      </span>
                      <p className="text-sm text-slate-200 font-serif italic">
                        “{dlg.text}”
                      </p>
                    </div>
                  ))}
                </div>

                {/* Relic Card */}
                {selectedMilestone.relic && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/20 to-slate-900 border border-amber-500/30">
                    <div className="text-[10px] font-mono uppercase text-amber-400 font-bold mb-1">
                      KAZANILAN YADİGÂR
                    </div>
                    <h4 className="text-base font-bold text-white font-serif mb-1">
                      {selectedMilestone.relic.name}
                    </h4>
                    <p className="text-xs text-amber-200/90 mb-2">
                      {selectedMilestone.relic.description}
                    </p>
                    <p className="text-[11px] text-slate-400 italic">
                      &ldquo;{selectedMilestone.relic.loreSnippet}&rdquo;
                    </p>
                  </div>
                )}

                {/* Climax (if wave 100) */}
                {selectedMilestone.climaxResolution && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 to-amber-950/40 border border-amber-400/50 text-center">
                    <span className="text-xs font-mono uppercase text-amber-300 font-bold block mb-1">
                      KİŞİSEL SONUÇ (DALGA 100)
                    </span>
                    <p className="text-sm font-serif italic text-slate-200">
                      {selectedMilestone.climaxResolution}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
                <Lock className="w-12 h-12 text-slate-700" />
                <h4 className="text-base font-bold text-slate-400 font-serif">
                  Kayıt Mühürlü
                </h4>
                <p className="text-xs max-w-xs leading-relaxed text-slate-500">
                  Bu anlatı kaydını açmak için Dalga {selectedMilestone.wave} boss
                  karşılaşmasını tamamlamalısınız.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>
            Tamamlanan Dalgalar: {Math.min(currentWave, 100)} / 100
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
