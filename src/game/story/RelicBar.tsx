'use client';

import React, { useState } from 'react';
import {
  Compass,
  Sparkles,
  BookOpen,
  Feather,
  FlaskConical,
  Eye,
  Award,
  ChevronUp,
} from 'lucide-react';
import { StoryRelic } from '@/data/storyQuests';

export interface RelicBarProps {
  relics: StoryRelic[];
  onOpenCodex?: () => void;
}

export const RelicBar: React.FC<RelicBarProps> = ({ relics, onOpenCodex }) => {
  const [hoveredRelic, setHoveredRelic] = useState<StoryRelic | null>(null);

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

  if (relics.length === 0) return null;

  return (
    <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-amber-500/30 backdrop-blur shadow-lg shadow-black/40">
      <div className="flex items-center gap-1.5 mr-1 text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400/90">
        <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
        <span>Yadigârlar:</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {relics.map((relic) => {
          const IconComp = getRelicIcon(relic.iconType);
          const isHovered = hoveredRelic?.id === relic.id;

          return (
            <div
              key={relic.id}
              className="relative group cursor-pointer"
              onMouseEnter={() => setHoveredRelic(relic)}
              onMouseLeave={() => setHoveredRelic(null)}
              onClick={() => onOpenCodex?.()}
            >
              <div
                className="w-7 h-7 rounded-lg border flex items-center justify-center transition-all duration-200 transform group-hover:scale-110 shadow-sm"
                style={{
                  borderColor: relic.color,
                  backgroundColor: `${relic.color}15`,
                  color: relic.color,
                  boxShadow: isHovered ? `0 0 10px ${relic.color}40` : undefined,
                }}
              >
                <IconComp className="w-3.5 h-3.5" />
              </div>

              {/* Hover Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 p-3 rounded-xl bg-[#0a0e18] border border-amber-500/50 shadow-2xl text-left pointer-events-none animate-fadeIn">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-white font-serif">
                      {relic.name}
                    </span>
                    <span className="text-[9px] font-mono text-amber-400">
                      Dalga {relic.wave}
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-200/90 leading-tight mb-1.5">
                    {relic.description}
                  </p>

                  <p className="text-[10px] text-slate-400 italic font-serif">
                    &ldquo;{relic.loreSnippet}&rdquo;
                  </p>

                  {relic.statBuffs && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(relic.statBuffs).map(([stat, val]) => (
                        <span
                          key={stat}
                          className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        >
                          +{val} {stat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
