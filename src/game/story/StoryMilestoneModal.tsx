'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass,
  Sparkles,
  BookOpen,
  Feather,
  FlaskConical,
  Eye,
  Scroll,
  Shield,
  Zap,
  Award,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { StoryMilestone, StoryRelic, CharacterQuestId } from '@/data/storyQuests';
import { soundEngine } from '@/lib/sound';

export interface StoryMilestoneModalProps {
  milestone: StoryMilestone;
  questId: CharacterQuestId;
  heroName: string;
  onClaimAndContinue: (relic?: StoryRelic) => void;
}

const resolveDialogueAudioPath = (
  questId: CharacterQuestId,
  wave: number,
  beatIndex: number,
  speakerName?: string
): string => {
  const campaign = questId === 'shadow_scribe' ? 'shadow_lexicographer' : questId;
  const waveStr = String(wave).padStart(3, '0');

  let speakerSlug = 'hero';
  if (speakerName) {
    const s = speakerName.toLowerCase();
    if (s.includes('neris')) speakerSlug = 'neris';
    else if (s.includes('whisper') || s.includes('boş')) speakerSlug = 'whisper';
    else if (s.includes('boss') || s.includes('muhafız')) speakerSlug = `boss_${campaign}_boss`;
  }
  return `assets/audio/dialogue/${campaign}/voice_${campaign}_w${waveStr}_b${beatIndex}_${speakerSlug}.mp3`;
};

export const StoryMilestoneModal: React.FC<StoryMilestoneModalProps> = ({
  milestone,
  questId,
  heroName,
  onClaimAndContinue,
}) => {
  const [activeDialogueIndex, setActiveDialogueIndex] = useState(0);

  useEffect(() => {
    soundEngine.playComboUp(3);
  }, []);

  // Trigger dialogue voice playback whenever active beat changes and clean up on unmount
  useEffect(() => {
    soundEngine.stopDialogueVoice();

    const audioPath = resolveDialogueAudioPath(
      questId,
      milestone.wave,
      activeDialogueIndex + 1,
      milestone.dialogues[activeDialogueIndex]?.speaker
    );
    soundEngine.playDialogueVoice(audioPath);

    return () => {
      soundEngine.stopDialogueVoice();
    };
  }, [activeDialogueIndex, milestone.wave, questId, milestone.dialogues]);

  const getSpeakerBadge = (speaker: string) => {
    switch (speaker) {
      case 'Rune':
        return {
          label: 'Rune Sorceress',
          color: 'from-sky-500 to-indigo-600',
          border: 'border-sky-400',
          textColor: 'text-sky-300',
          icon: Compass,
        };
      case 'Alchemist':
        return {
          label: 'Lexicon Alchemist',
          color: 'from-amber-500 to-orange-600',
          border: 'border-amber-400',
          textColor: 'text-amber-300',
          icon: FlaskConical,
        };
      case 'Shadow':
        return {
          label: 'Shadow Scribe',
          color: 'from-purple-500 to-violet-600',
          border: 'border-purple-400',
          textColor: 'text-purple-300',
          icon: Feather,
        };
      case 'Neris':
        return {
          label: 'Neris (Baş Kütüphaneci)',
          color: 'from-amber-600 to-yellow-700',
          border: 'border-yellow-400',
          textColor: 'text-yellow-200',
          icon: BookOpen,
        };
      case 'Lale':
        return {
          label: 'Lale (Gözlemevi Haritacısı)',
          color: 'from-cyan-400 to-blue-600',
          border: 'border-cyan-300',
          textColor: 'text-cyan-200',
          icon: Sparkles,
        };
      case 'Boss':
        return {
          label: 'Boş Sayfa Muhafızı',
          color: 'from-rose-600 to-red-800',
          border: 'border-rose-500',
          textColor: 'text-rose-300',
          icon: Flame,
        };
      default:
        return {
          label: speaker,
          color: 'from-slate-600 to-slate-800',
          border: 'border-slate-400',
          textColor: 'text-slate-300',
          icon: Scroll,
        };
    }
  };

  const getRelicIcon = (iconType: string) => {
    switch (iconType) {
      case 'compass':
        return Compass;
      case 'starlight':
        return Sparkles;
      case 'vial':
      case 'drop':
      case 'catalyst':
        return FlaskConical;
      case 'quill':
        return Feather;
      case 'lens':
      case 'mirror':
        return Eye;
      case 'seal':
        return Award;
      default:
        return BookOpen;
    }
  };

  const isFinalWave = milestone.wave === 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Illuminated Parchment Container */}
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0c101c] via-[#080b14] to-[#04060b] border-2 border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Subtle Decorative Golden Border Filigree Corners */}
        <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-400/70 pointer-events-none" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-400/70 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-400/70 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-400/70 pointer-events-none" />

        {/* Header Bar */}
        <div className="px-6 py-5 border-b border-amber-500/20 bg-amber-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-700/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Scroll className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400/80 font-bold">
                  YOLCULUK GÜNLÜĞÜ · DALGA {milestone.wave}
                </span>
                {isFinalWave && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    BÜYÜK SONUÇ
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-amber-100 tracking-tight font-serif">
                {milestone.title}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono text-slate-400">
              Bölüm {milestone.wave / 5} / 20
            </span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Premise / Atmosphere Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 text-xs italic leading-relaxed flex items-start gap-3">
            <BookOpen className="w-4 h-4 text-amber-400/70 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200 mb-0.5">{milestone.subtitle}</p>
              <p className="text-slate-400">{milestone.premise}</p>
            </div>
          </div>

          {/* Dialogues Sequence */}
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 font-mono">
              Tanıklıklar &amp; Diyalog
            </div>

            {milestone.dialogues.map((dlg, idx) => {
              const speakerInfo = getSpeakerBadge(dlg.speaker);
              const IconComp = speakerInfo.icon;

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all duration-300 ${
                    idx === activeDialogueIndex
                      ? 'bg-slate-900/90 border-amber-500/50 shadow-md shadow-black/40'
                      : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900/50'
                  }`}
                  onClick={() => setActiveDialogueIndex(idx)}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className={`w-5 h-5 rounded-md bg-gradient-to-br ${speakerInfo.color} flex items-center justify-center text-white text-[10px]`}
                    >
                      <IconComp className="w-3 h-3" />
                    </div>
                    <span className={`text-xs font-bold ${speakerInfo.textColor}`}>
                      {speakerInfo.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-100 font-serif italic pl-7 leading-relaxed">
                    “{dlg.text}”
                  </p>
                </div>
              );
            })}
          </div>

          {/* Relic Reward Display (if available) */}
          {milestone.relic && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/30 via-slate-900/60 to-slate-950 border border-amber-500/40 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> KAZANILAN HİKÂYE YADİGÂRI
                  </span>
                </div>
                <span className="text-[10px] font-mono text-amber-300/70 border border-amber-500/30 px-2 py-0.5 rounded">
                  Özel Pasif
                </span>
              </div>

              <div className="flex items-start gap-4">
                {(() => {
                  const RelicIcon = getRelicIcon(milestone.relic.iconType);
                  return (
                    <div
                      className="w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 shadow-lg"
                      style={{
                        borderColor: milestone.relic.color,
                        backgroundColor: `${milestone.relic.color}15`,
                        color: milestone.relic.color,
                      }}
                    >
                      <RelicIcon className="w-6 h-6" />
                    </div>
                  );
                })()}

                <div className="flex-1">
                  <h4 className="text-base font-black text-white font-serif mb-1">
                    {milestone.relic.name}
                  </h4>
                  <p className="text-xs text-amber-200/90 leading-relaxed mb-2">
                    {milestone.relic.description}
                  </p>
                  <p className="text-[11px] text-slate-400 italic">
                    &ldquo;{milestone.relic.loreSnippet}&rdquo;
                  </p>

                  {/* Stat Tag Badges */}
                  {milestone.relic.statBuffs && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {Object.entries(milestone.relic.statBuffs).map(([key, val]) => (
                        <span
                          key={key}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold"
                        >
                          +{val} {key}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Climax Resolution Box (Wave 100) */}
          {isFinalWave && milestone.climaxResolution && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-900/40 via-purple-900/40 to-slate-900 border border-amber-400 text-center space-y-2">
              <Sparkles className="w-6 h-6 text-amber-300 mx-auto animate-spin" />
              <h3 className="text-base font-black text-amber-200 font-serif">
                Kişisel Arayışın Nihai Kararı
              </h3>
              <p className="text-xs text-slate-200 font-serif italic leading-relaxed max-w-lg mx-auto">
                {milestone.climaxResolution}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-amber-500/20 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            {isFinalWave ? 'Zafer ve Tamamlanış' : 'Kayıt günlüğe mühürlendi.'}
          </span>

          <button
            onClick={() => {
              soundEngine.stopDialogueVoice();
              soundEngine.playComboUp(3);
              onClaimAndContinue(milestone.relic);
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all transform active:scale-95"
          >
            <span>{isFinalWave ? 'Yolculuğu Tamamla' : 'Yola Devam Et & Kuşan'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
