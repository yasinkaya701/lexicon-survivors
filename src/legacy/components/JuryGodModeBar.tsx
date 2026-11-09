'use client';

import React from 'react';
import { CampaignAct, GameScene } from '@/types/game';
import {
  Sparkles,
  Swords,
  ShieldAlert,
  BarChart3,
  Trophy,
  Home,
  CloudRain,
  Volume2,
  VolumeX,
  Zap,
  FileSearch,
  Flame,
} from 'lucide-react';

interface JuryGodModeBarProps {
  act: CampaignAct;
  scene: GameScene;
  sfxEnabled: boolean;
  onSelectActScene: (act: CampaignAct, scene: GameScene, forceShieldEvent?: boolean) => void;
  onUnlockAllUpgrades: () => void;
  onToggleSfx: () => void;
}

export const JuryGodModeBar: React.FC<JuryGodModeBarProps> = ({
  act,
  scene,
  sfxEnabled,
  onSelectActScene,
  onUnlockAllUpgrades,
  onToggleSfx,
}) => {
  return (
    <div className="w-full bg-slate-950/95 backdrop-blur-md border-b border-indigo-500/30 px-4 py-2 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-sm flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> 5 OYUN MODU & JÜRİ GOD MODE
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onSelectActScene('yks', 'room')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
              act === 'yks' && scene === 'room'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-indigo-500/50'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            1. Mezuna Kalma (YKS Oda)
          </button>

          <button
            onClick={() => onSelectActScene('buept', 'room')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
              act === 'buept' && scene === 'room'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-indigo-500/50'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5 text-sky-400" />
            Kilyos Yurt (Fırtına)
          </button>

          <button
            onClick={() => onSelectActScene(act, 'battle', false)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
              scene === 'battle'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-rose-500/50'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            2. Kampüs Royale (1v1)
          </button>

          <button
            onClick={() => onSelectActScene('buept', 'battle', true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Kalkan Kırma
          </button>

          <button
            onClick={() => onSelectActScene(act, 'survivors')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
              scene === 'survivors'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-500/30'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-pink-500/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-pink-400" />
            3. Exam Survivors (WASD)
          </button>

          <button
            onClick={() => onSelectActScene('buept', 'detective')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
              scene === 'detective'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-amber-500/50'
            }`}
          >
            <FileSearch className="w-3.5 h-3.5 text-amber-400" />
            4. Project Kilyos (Dedektif)
          </button>

          <button
            onClick={() => onSelectActScene(act, 'defuse')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
              scene === 'defuse'
                ? 'bg-red-600 text-white shadow-md shadow-red-500/30'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-red-500/50'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            5. Spike Defuse (İmha)
          </button>

          <button
            onClick={() => onSelectActScene(act, 'telemetry')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
              scene === 'telemetry'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-emerald-500/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            AI Koç
          </button>

          <button
            onClick={onUnlockAllUpgrades}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition"
            title="Tüm Oda Ekipmanlarını ve ₺10.000 Bütçeyi Aç"
          >
            ⚡ Max Oda
          </button>

          <button
            onClick={() => onSelectActScene('buept', 'victory')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
              scene === 'victory'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-amber-300 border border-amber-500/40 hover:bg-amber-500/20'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Zafer
          </button>

          <button
            onClick={onToggleSfx}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
            title="Ses Efektlerini Aç/Kapat"
          >
            {sfxEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
