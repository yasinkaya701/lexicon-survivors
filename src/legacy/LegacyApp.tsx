'use client';

import React, { useState } from 'react';
import {
  CampaignAct,
  GameScene,
  MistakeEntry,
  RoomUpgrades,
  TacticalQuestion,
  TelemetryStats,
} from '@/types/game';
import { BUEPT_QUESTIONS, YKS_QUESTIONS } from '@/data/questions';
import { soundEngine } from '@/lib/sound';
import { JuryGodModeBar } from '@/legacy/components/JuryGodModeBar';
import { RoomSimulator } from '@/legacy/components/RoomSimulator';
import { BattleArena } from '@/legacy/components/BattleArena';
import { SurvivorsArena } from '@/legacy/components/SurvivorsArena';
import { KilyosDetective } from '@/legacy/components/KilyosDetective';
import { SpikeDefuseSim } from '@/legacy/components/SpikeDefuseSim';
import { TelemetryModal } from '@/legacy/components/TelemetryModal';
import { VictoryScene } from '@/legacy/components/VictoryScene';
import {
  Brain,
  Coffee,
  Coins,
  FileSearch,
  Flame,
  Home,
  ShieldCheck,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';

export default function LegacyApp() {
  const [act, setAct] = useState<CampaignAct>('yks');
  const [scene, setScene] = useState<GameScene>('room');
  const [forceShieldStart, setForceShieldStart] = useState<boolean>(false);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);

  // Career & Room Stats
  const [week, setWeek] = useState<number>(12);
  const [netScore, setNetScore] = useState<number>(86.5);
  const [mental, setMental] = useState<number>(80);
  const [energy, setEnergy] = useState<number>(75);
  const [money, setMoney] = useState<number>(1450);
  const [rankLp, setRankLp] = useState<number>(1480);

  const [upgrades, setUpgrades] = useState<RoomUpgrades>({
    rgbSetup: false,
    espressoMachine: false,
    kilyosHeater: false,
    ergonomicChair: false,
    aiTablet: false,
  });

  const [mistakes, setMistakes] = useState<MistakeEntry[]>([
    {
      question: BUEPT_QUESTIONS[0],
      status: 'wrong',
      timestamp: Date.now() - 120000,
      resolved: false,
    },
    {
      question: YKS_QUESTIONS[1],
      status: 'skipped',
      timestamp: Date.now() - 60000,
      resolved: false,
    },
  ]);

  const [telemetry, setTelemetry] = useState<TelemetryStats>({
    totalAnswered: 14,
    correctCount: 11,
    wrongCount: 2,
    turlaCount: 4,
    shieldBreaks: 3,
    maxCombo: 5,
    avgReactionMs: 3800,
    peakBpm: 114,
    skills: {
      speed: 82,
      turlama: 78,
      stressControl: 74,
      yksMastery: 85,
      bueptMastery: 79,
    },
  });

  const handleSelectActScene = (
    targetAct: CampaignAct,
    targetScene: GameScene,
    forceShield = false
  ) => {
    setAct(targetAct);
    setForceShieldStart(forceShield);
    setScene(targetScene);
  };

  const handleUnlockAllUpgrades = () => {
    soundEngine.playVictoryFanfare();
    setMoney(10000);
    setMental(100);
    setEnergy(100);
    setNetScore(112.5);
    setRankLp(2150);
    setUpgrades({
      rgbSetup: true,
      espressoMachine: true,
      kilyosHeater: true,
      ergonomicChair: true,
      aiTablet: true,
    });
  };

  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    soundEngine.enabled = next;
    if (!next) soundEngine.setKilyosStormAmbient(false);
  };

  const handleCareerAction = (action: 'study' | 'chill' | 'tutor' | 'drill') => {
    setWeek((w) => Math.min(36, w + 1));
    if (action === 'study') {
      const mult = upgrades.rgbSetup ? 1.5 : 1;
      setNetScore((n) => Math.min(120, +(n + 5 * mult).toFixed(1)));
      setMental((m) => Math.max(15, m - (upgrades.kilyosHeater ? 8 : 14)));
      setEnergy((e) => Math.max(15, e - 18));
    } else if (action === 'chill') {
      setMental((m) => Math.min(100, m + 24));
      setEnergy((e) => Math.min(100, e + 25));
    } else if (action === 'tutor') {
      setMoney((c) => c + 450);
      setNetScore((n) => Math.min(120, +(n + 2.5).toFixed(1)));
    }
  };

  const handleBuyUpgrade = (key: keyof RoomUpgrades, cost: number) => {
    if (money < cost) {
      soundEngine.playWrongBuzz();
      return;
    }
    soundEngine.playCashRegister();
    setMoney((m) => m - cost);
    setUpgrades((prev) => ({ ...prev, [key]: true }));
  };

  const handleRecordMistake = (q: TacticalQuestion, status: 'wrong' | 'skipped') => {
    setMistakes((prev) => {
      if (prev.some((item) => item.question.id === q.id)) return prev;
      return [{ question: q, status, timestamp: Date.now(), resolved: false }, ...prev];
    });
  };

  const handleResolveMistake = (id: string) => {
    setMistakes((prev) =>
      prev.map((m) => (m.question.id === id ? { ...m, resolved: true } : m))
    );
    setNetScore((n) => Math.min(120, +(n + 3.5).toFixed(1)));
    setRankLp((lp) => lp + 35);
    setTelemetry((t) => ({
      ...t,
      skills: {
        ...t.skills,
        yksMastery: Math.min(100, t.skills.yksMastery + 4),
        bueptMastery: Math.min(100, t.skills.bueptMastery + 4),
      },
    }));
  };

  const handleScoreGain = (netDelta: number, lpDelta: number) => {
    setNetScore((n) => Math.min(120, +(n + netDelta).toFixed(1)));
    setRankLp((lp) => lp + lpDelta);
    setMoney((m) => m + 250);
  };

  const handleBattleEnd = (
    won: boolean,
    delta: {
      answered: number;
      correct: number;
      wrong: number;
      turla: number;
      shieldBreaks: number;
      maxCombo: number;
      peakBpm: number;
    }
  ) => {
    setTelemetry((prev) => ({
      totalAnswered: prev.totalAnswered + delta.answered,
      correctCount: prev.correctCount + delta.correct,
      wrongCount: prev.wrongCount + delta.wrong,
      turlaCount: prev.turlaCount + delta.turla,
      shieldBreaks: prev.shieldBreaks + delta.shieldBreaks,
      maxCombo: Math.max(prev.maxCombo, delta.maxCombo),
      avgReactionMs: 3400,
      peakBpm: Math.max(prev.peakBpm, Math.round(delta.peakBpm)),
      skills: {
        speed: Math.min(100, prev.skills.speed + (won ? 5 : 2)),
        turlama: Math.min(100, prev.skills.turlama + delta.turla * 4),
        stressControl: Math.min(100, prev.skills.stressControl + (delta.peakBpm < 120 ? 5 : 1)),
        yksMastery: Math.min(100, prev.skills.yksMastery + (act === 'yks' && won ? 6 : 2)),
        bueptMastery: Math.min(100, prev.skills.bueptMastery + (act === 'buept' && won ? 6 : 2)),
      },
    }));

    if (won) {
      setMoney((m) => m + 550);
      setRankLp((lp) => lp + 65);
      setNetScore((n) => Math.min(120, +(n + 6.5).toFixed(1)));
      if (act === 'yks') {
        setAct('buept');
        setScene('telemetry');
      } else {
        setScene('victory');
      }
    } else {
      setMental((m) => Math.max(15, m - 15));
      setScene('telemetry');
    }
  };

  const unresolvedMistakes = mistakes.filter((m) => !m.resolved).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#060913]">
      {/* Persistent Jury God Mode & 5-Game Switcher Bar */}
      <JuryGodModeBar
        act={act}
        scene={scene}
        sfxEnabled={sfxEnabled}
        onSelectActScene={handleSelectActScene}
        onUnlockAllUpgrades={handleUnlockAllUpgrades}
        onToggleSfx={handleToggleSfx}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 space-y-4">
        {/* Global Student Telemetry Status Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-semibold">NET / SEVİYE</div>
              <div className="text-sm font-extrabold text-indigo-400">{netScore.toFixed(1)} Net</div>
            </div>
            <Flame className="w-5 h-5 text-indigo-400" />
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-semibold">AKIL SAĞLIĞI</div>
              <div className="text-sm font-extrabold text-emerald-400">%{mental} Mental</div>
            </div>
            <Brain className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-semibold">ENERJİ & KAFEİN</div>
              <div className="text-sm font-extrabold text-amber-400">%{energy} Enerji</div>
            </div>
            <Coffee className="w-5 h-5 text-amber-400" />
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-semibold">ÖĞRENCİ BÜTÇESİ</div>
              <div className="text-sm font-extrabold text-cyan-400">₺{money}</div>
            </div>
            <Coins className="w-5 h-5 text-cyan-400" />
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-semibold">ARENA LİGİ (ELO)</div>
              <div className="text-sm font-extrabold text-pink-400">
                {rankLp >= 1800 ? 'Boğaziçi Elmas' : 'Derece Tayfa'} ({rankLp})
              </div>
            </div>
            <Trophy className="w-5 h-5 text-pink-400" />
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-semibold">AKTİF MÜFREDAT</div>
              <div className="text-sm font-extrabold text-sky-400">
                {act === 'yks' ? '1. Perde: YKS' : '2. Perde: BUEPT'}
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-sky-400" />
          </div>
        </div>

        {/* 5-Game Mode Quick Selector Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <button
            onClick={() => setScene('room')}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
              scene === 'room'
                ? 'bg-indigo-600/25 border-indigo-400 text-white shadow-lg shadow-indigo-600/15'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-indigo-500/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-300">MOD 1 • KARİYER SİM</span>
              <Home className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xs sm:text-sm font-extrabold mt-1">🏠 Mezuna Kalma!</div>
            <div className="text-xs text-slate-400">NSS & Oda Geliştirme Simülasyonu</div>
          </button>

          <button
            onClick={() => {
              setForceShieldStart(false);
              setScene('battle');
            }}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
              scene === 'battle'
                ? 'bg-rose-600/25 border-rose-400 text-white shadow-lg shadow-rose-600/15'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-rose-500/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-rose-300">MOD 2 • 1V1 ARENA</span>
              <Swords className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xs sm:text-sm font-extrabold mt-1">⚔️ Kampüs Royale</div>
            <div className="text-xs text-slate-400">Clash Royale Kule & Turlama Savaşı</div>
          </button>

          <button
            onClick={() => setScene('survivors')}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
              scene === 'survivors'
                ? 'bg-pink-600/25 border-pink-400 text-white shadow-lg shadow-pink-600/15'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-pink-500/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-pink-300">MOD 3 • ROGUELITE</span>
              <Zap className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-xs sm:text-sm font-extrabold mt-1">⚡ Exam Survivors</div>
            <div className="text-xs text-slate-400">WASD Aksiyon & Bullet-Time Evrim</div>
          </button>

          <button
            onClick={() => setScene('detective')}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
              scene === 'detective'
                ? 'bg-amber-600/25 border-amber-400 text-white shadow-lg shadow-amber-600/15'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-amber-500/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-300">MOD 4 • DEDEKTİF</span>
              <FileSearch className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xs sm:text-sm font-extrabold mt-1">🕵️ Project Kilyos</div>
            <div className="text-xs text-slate-400">Papers, Please Belge & Kanıt Masası</div>
          </button>

          <button
            onClick={() => setScene('defuse')}
            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
              scene === 'defuse'
                ? 'bg-red-600/25 border-red-400 text-white shadow-lg shadow-red-600/15'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-red-500/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-red-300">MOD 5 • CLUTCH İMHA</span>
              <Flame className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-xs sm:text-sm font-extrabold mt-1">💣 Spike Defuse</div>
            <div className="text-xs text-slate-400">Valorant Kablo & Osiloskop İmhası</div>
          </button>
        </div>

        {/* Active Game Scene Renderer */}
        {scene === 'room' && (
          <RoomSimulator
            act={act}
            week={week}
            netScore={netScore}
            mental={mental}
            energy={energy}
            money={money}
            rankLp={rankLp}
            upgrades={upgrades}
            mistakeCount={unresolvedMistakes}
            onAction={handleCareerAction}
            onBuyUpgrade={handleBuyUpgrade}
            onStartBattle={(forceShield = false) => {
              setForceShieldStart(forceShield);
              setScene('battle');
            }}
            onOpenTelemetry={() => setScene('telemetry')}
            onSwitchAct={(nextAct) => setAct(nextAct)}
          />
        )}

        {scene === 'battle' && (
          <BattleArena
            act={act}
            upgrades={upgrades}
            forceShieldStart={forceShieldStart}
            onBattleEnd={handleBattleEnd}
            onRecordMistake={handleRecordMistake}
            onBackToRoom={() => setScene('room')}
          />
        )}

        {scene === 'survivors' && (
          <SurvivorsArena
            act={act}
            onScoreGain={handleScoreGain}
            onRecordMistake={handleRecordMistake}
            onBackToRoom={() => setScene('room')}
          />
        )}

        {scene === 'detective' && (
          <KilyosDetective
            onScoreGain={handleScoreGain}
            onBackToRoom={() => setScene('room')}
          />
        )}

        {scene === 'defuse' && (
          <SpikeDefuseSim
            onScoreGain={handleScoreGain}
            onBackToRoom={() => setScene('room')}
          />
        )}

        {scene === 'telemetry' && (
          <TelemetryModal
            stats={telemetry}
            mistakes={mistakes}
            onResolveMistake={handleResolveMistake}
            onBackToRoom={() => setScene('room')}
            onStartRevengeBattle={() => {
              setForceShieldStart(false);
              setScene('battle');
            }}
          />
        )}

        {scene === 'victory' && (
          <VictoryScene
            netScore={netScore}
            rankLp={rankLp}
            mental={mental}
            onRestart={() => {
              setAct('yks');
              setScene('room');
            }}
          />
        )}
      </main>
    </div>
  );
}
