'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Zap,
  Swords,
  Brain,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronRight,
  Sparkles,
  BookOpen,
  Magnet,
  RotateCcw,
  Scroll,
  Home,
  Trophy,
  Sliders,
} from 'lucide-react';
import { soundEngine } from '@/lib/sound';
import { PlayerRPGStats, ActiveWeaponInstance, ShopSlot } from '@/types/brotato';
import { TacticalQuestion } from '@/types/game';
import { ALL_QUESTIONS } from '@/data/questions';
import { AudioSettingsModal } from '@/game/settings';
import {
  CharacterQuestId,
  StoryMilestone,
  StoryRelic,
  getStoryMilestone,
  isMilestoneWave,
} from '@/data/storyQuests';
import { relicEngine } from '@/game/relics/RelicEngine';
import { GameCanvas } from '@/components/GameCanvas';
import { ShopModal } from '@/components/ShopModal';
import { StudyBuffModal, type StudyReward } from '@/components/StudyBuffModal';
import { MistakeNotebookModal } from '@/components/MistakeNotebookModal';
import { MasteryRadarChart } from '@/components/MasteryRadarChart';
import { StoryMilestoneModal } from '@/game/story/StoryMilestoneModal';
import { StoryCodexModal } from '@/game/story/StoryCodexModal';
import { TelemetryTracker } from '@/game/education/TelemetryTracker';
import { ShopInventoryManager, calculateRerollCost } from '@/game/shop/ShopEngine';

interface CharacterOption {
  id: string;
  questId?: CharacterQuestId;
  name: string;
  title: string;
  badge: string;
  color: string;
  avatarSrc: string;
  description: string;
  startingWeapon: string;
  startingWeaponId: string;
  baseStats: Partial<PlayerRPGStats>;
}

const CHARACTERS: CharacterOption[] = [
  {
    id: 'rune_sorceress',
    questId: 'rune_sorceress',
    name: 'Rune Sorceress',
    title: 'Gözlemevi Haritacısı Lale’nin Kızı',
    badge: 'Lale’nin Haritası',
    color: 'from-sky-500 via-indigo-600 to-slate-900',
    avatarSrc: '/assets/hero_rune_sorceress.png',
    description:
      'Gözlemevi haritacısı olan annesi Lale’nin kayboluşunu çözmek. Rün Küreleri düşmanlar arasında seker; kritik vuruşlar göksel şok dalgaları saçar.',
    startingWeapon: 'Astral Usturlap (Runic Sphere)',
    startingWeaponId: 'wand_1',
    baseStats: {
      maxHp: 90,
      damagePercent: 8,
      range: 50,
      attackSpeed: 12,
      dodgePercent: 10,
      pickupRange: 130,
    },
  },
  {
    id: 'lexicon_alchemist',
    questId: 'lexicon_alchemist',
    name: 'Lexicon Alchemist',
    title: 'Unutulan Köyün Bellek Simyacısı',
    badge: 'Paylaşılmış Hatıra',
    color: 'from-amber-500 via-teal-600 to-stone-900',
    avatarSrc: '/assets/hero_lexicon_alchemist.png',
    description:
      'Unutulan köyün anılarını geri getirecek formülü tamamlamak. Yüksek Hasat ve şans; boss öldüğünde ekstra mürekkep ve anı özleri saçar.',
    startingWeapon: 'Hafıza İmbiki (Memory Alembic)',
    startingWeaponId: 'pistol_1',
    baseStats: {
      maxHp: 105,
      harvesting: 25,
      luck: 15,
      damagePercent: 5,
      pickupRange: 140,
      hpRegen: 2,
    },
  },
  {
    id: 'shadow_scribe',
    questId: 'shadow_scribe',
    name: 'Shadow Scribe',
    title: 'Neris’in Eski Çırağı & Kâtip',
    badge: 'Silgiyi Tutan El',
    color: 'from-purple-600 via-yellow-600 to-zinc-900',
    avatarSrc: '/assets/hero_shadow_scribe.png',
    description:
      'İlk büyük silintinin sorumluluğunu üstlenmek. Yüksek kritik ve sıyrılma şansı; atılım izi arkasında düşmanları yavaşlatan silgi tozu bırakır.',
    startingWeapon: 'Palimpsest Diviti (Calligraphy Quill)',
    startingWeaponId: 'knife_1',
    baseStats: {
      maxHp: 85,
      speedPercent: 12,
      critChancePercent: 15,
      dodgePercent: 15,
      attackSpeed: 10,
      meleeDamage: 5,
    },
  },
  {
    id: 'potato_scholar',
    name: 'Patates Mezun',
    title: 'Dengeli TYT/AYT & Kampüs Adayı',
    badge: 'Akademik Çırak',
    color: 'from-amber-600 to-yellow-600',
    avatarSrc: '/assets/player_potato_scholar.png',
    description: 'Tüm istatistikleri dengeli. Hasat ve XP kazanımı %15 daha yüksek.',
    startingWeapon: 'Tükenmez Kalem (Pistol)',
    startingWeaponId: 'pistol_1',
    baseStats: {
      maxHp: 100,
      damagePercent: 0,
      speedPercent: 0,
      harvesting: 15,
      luck: 10,
      pickupRange: 120,
    },
  },
  {
    id: 'buept_hero',
    name: 'Hazırlık Kurdu',
    title: 'BUEPT Hız ve Çeviklik Uzmanı',
    badge: 'Çevik',
    color: 'from-sky-500 to-indigo-600',
    avatarSrc: '/assets/player_buept_student.png',
    description: 'Yüksek hareket hızı ve %20 taban sıyrılma (Dodge) şansı.',
    startingWeapon: 'Grammar Asası (Magic Wand)',
    startingWeaponId: 'wand_1',
    baseStats: {
      maxHp: 85,
      dodgePercent: 20,
      speedPercent: 15,
      attackSpeed: 10,
      pickupRange: 120,
    },
  },
  {
    id: 'engineer',
    name: 'Mühendislik Dahisi',
    title: 'Otomasyon ve Taret Efendisi',
    badge: 'Mühendislik',
    color: 'from-emerald-500 to-teal-600',
    avatarSrc: '/assets/player_engineer.png',
    description: 'Yüksek Mühendislik statüsü ile taretler kurar ve savunur.',
    startingWeapon: 'İngiliz Anahtarı (Wrench)',
    startingWeaponId: 'wrench_1',
    baseStats: {
      maxHp: 90,
      engineering: 12,
      armor: 3,
      meleeDamage: 4,
      pickupRange: 140,
    },
  },
  {
    id: 'mutant_tank',
    name: 'Kilyos Tankı',
    title: 'Fırtınaya Karşı Yıkılmaz',
    badge: 'Tank',
    color: 'from-rose-500 to-red-600',
    avatarSrc: '/assets/player_tank_mutant.png',
    description: 'Yüksek can ve zırh; ancak fırtına rüzgarı nedeniyle yavaş hareket eder.',
    startingWeapon: 'Cetvel Kılıç (Sword)',
    startingWeaponId: 'sword_1',
    baseStats: {
      maxHp: 140,
      armor: 6,
      hpRegen: 3,
      speedPercent: -10,
      pickupRange: 120,
    },
  },
];

type GameScreen = 'hub' | 'arena' | 'shop' | 'gameover' | 'victory';

export default function BrotatoMainPage() {
  const [gameScreen, setGameScreen] = useState<GameScreen>('hub');
  const [selectedCharId, setSelectedCharId] = useState<string>('rune_sorceress');
  const [activeAct, setActiveAct] = useState<'yks' | 'buept'>('yks');
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Clean Default RPG Schema to prevent cross-run residual stat bleed
  const DEFAULT_INITIAL_STATS: PlayerRPGStats = {
    maxHp: 100,
    currentHp: 100,
    hpRegen: 0,
    lifeSteal: 0,
    damagePercent: 0,
    meleeDamage: 0,
    rangedDamage: 0,
    elementalDamage: 0,
    attackSpeed: 0,
    critChancePercent: 5,
    engineering: 0,
    range: 0,
    armor: 0,
    dodgePercent: 0,
    speedPercent: 0,
    luck: 0,
    harvesting: 0,
    pickupRange: 120,
  };

  // Active Run State
  const [currentWave, setCurrentWave] = useState<number>(1);
  const [runMaterials, setRunMaterials] = useState<number>(0);
  const [runStats, setRunStats] = useState<PlayerRPGStats>(DEFAULT_INITIAL_STATS);
  const [activeWeapons, setActiveWeapons] = useState<(ActiveWeaponInstance | null)[]>([null, null, null, null, null, null]);

  // Narrative Story Milestone & Relic State
  const [activeRelics, setActiveRelics] = useState<StoryRelic[]>([]);
  const [currentMilestone, setCurrentMilestone] = useState<StoryMilestone | null>(null);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState<boolean>(false);
  const [isCodexOpen, setIsCodexOpen] = useState<boolean>(false);

  // Educational Telemetry & Modals State
  const telemetryRef = useRef<TelemetryTracker>(new TelemetryTracker());
  const [isStudyModalOpen, setIsStudyModalOpen] = useState<boolean>(false);
  const [isMistakeNotebookOpen, setIsMistakeNotebookOpen] = useState<boolean>(false);
  const [isRadarModalOpen, setIsRadarModalOpen] = useState<boolean>(false);

  // Shop State
  const shopManagerRef = useRef<ShopInventoryManager | null>(null);
  const [shopSlots, setShopSlots] = useState<(ShopSlot | null)[]>([null, null, null, null]);
  const [lockedShopSlots, setLockedShopSlots] = useState<Set<number>>(new Set());
  const [rerollCost, setRerollCost] = useState<number>(1);

  const selectedChar = CHARACTERS.find((c) => c.id === selectedCharId) || CHARACTERS[0];

  useEffect(() => {
    const unsub = soundEngine.subscribe((settings) => {
      setSfxEnabled(!settings.isMuted && soundEngine.enabled);
    });
    return unsub;
  }, []);

  const toggleSfx = () => {
    const isCurrentlyMuted = soundEngine.isMuted || !soundEngine.enabled || !sfxEnabled;
    const nextMuted = !isCurrentlyMuted;
    soundEngine.setMuted(nextMuted);
    soundEngine.enabled = !nextMuted;
    setSfxEnabled(!nextMuted);
    if (!nextMuted) soundEngine.playHit();
  };

  const handleSelectChar = (id: string) => {
    setSelectedCharId(id);
    if (sfxEnabled && soundEngine.enabled && !soundEngine.isMuted) soundEngine.playComboUp(2);
  };

  const handleStartRun = () => {
    if (sfxEnabled && soundEngine.enabled && !soundEngine.isMuted) soundEngine.playOrbitalLaser();
    shopManagerRef.current = null;
    relicEngine.reset();
    setActiveRelics([]);
    setCurrentWave(1);
    setRunMaterials(0);
    setRunStats({
      ...DEFAULT_INITIAL_STATS,
      ...selectedChar.baseStats,
      currentHp: selectedChar.baseStats.maxHp ?? 100,
      maxHp: selectedChar.baseStats.maxHp ?? 100,
    });
    setActiveWeapons([null, null, null, null, null, null]);
    setShopSlots([null, null, null, null]);
    setLockedShopSlots(new Set());
    setRerollCost(1);
    setCurrentMilestone(null);
    setIsMilestoneModalOpen(false);
    setIsStudyModalOpen(false);
    setGameScreen('arena');
  };

  const handleApplyStudyReward = (reward: StudyReward) => {
    if (reward.statModifiers) {
      setRunStats((prev) => {
        const next = { ...prev };
        for (const [key, val] of Object.entries(reward.statModifiers!)) {
          const statKey = key as keyof PlayerRPGStats;
          if (typeof next[statKey] === 'number' && typeof val === 'number') {
            (next[statKey] as number) += val;
          }
        }
        next.dodgePercent = Math.min(60, next.dodgePercent);
        next.currentHp = Math.min(next.maxHp, next.currentHp);
        return next;
      });
    }
    if (reward.materialsBonus) {
      setRunMaterials((prev) => prev + reward.materialsBonus!);
    }
    telemetryRef.current.recordStudyBuffClaimed();
    setIsStudyModalOpen(false);
  };

  const handleRecordMistake = (question: TacticalQuestion, selectedIndex: number) => {
    telemetryRef.current.recordAttempt(question, selectedIndex, false, 0, currentWave);
  };

  const handleWaveComplete = (
    completedWave: number,
    finalMaterials: number,
    currentStats: PlayerRPGStats,
    weapons: ActiveWeaponInstance[]
  ) => {
    setRunMaterials(finalMaterials);
    setRunStats(currentStats);
    setActiveWeapons(weapons);

    // Initialize or advance shop for next wave
    if (!shopManagerRef.current) {
      shopManagerRef.current = new ShopInventoryManager(completedWave, currentStats.luck);
    } else {
      shopManagerRef.current.advanceWave(completedWave, currentStats.luck);
    }

    const sm = shopManagerRef.current;
    setShopSlots([...sm.slots]);
    setLockedShopSlots(new Set(sm.lockedSlots));
    setRerollCost(calculateRerollCost(sm.rerollCount, completedWave));

    // Standard run victory upon completing 20 waves
    if (completedWave >= 20) {
      soundEngine.playVictoryFanfare();
      setGameScreen('victory');
      return;
    }

    // Check for story milestone event (Waves 5, 10, ..., 100)
    if (isMilestoneWave(completedWave) && selectedChar.questId) {
      const milestone = getStoryMilestone(selectedChar.questId, completedWave);
      if (milestone) {
        setCurrentMilestone(milestone);
        setIsMilestoneModalOpen(true);
        return;
      }
    }

    // Inter-wave study modal!
    setIsStudyModalOpen(true);
    setGameScreen('shop');
  };

  const handleMilestoneClaim = (relic?: StoryRelic) => {
    if (relic) {
      relicEngine.addRelic(relic);
      setActiveRelics(relicEngine.getActiveRelics());
      if (relic.statBuffs) {
        setRunStats((prev) => {
          const next = { ...prev };
          for (const [key, val] of Object.entries(relic.statBuffs!)) {
            const statKey = key as keyof PlayerRPGStats;
            if (typeof next[statKey] === 'number') {
              (next[statKey] as number) += val;
            }
          }
          return next;
        });
      }
    }
    setIsMilestoneModalOpen(false);
    setCurrentMilestone(null);
    if (currentWave >= 100) {
      soundEngine.playVictoryFanfare();
      setGameScreen('victory');
    } else {
      setIsStudyModalOpen(true);
      setGameScreen('shop');
    }
  };

  const handlePurchaseSlot = (slotIndex: number) => {
    const sm = shopManagerRef.current;
    if (!sm) return;

    const res = sm.purchaseSlot(slotIndex, runMaterials);
    if (res.success && res.slot) {
      setRunMaterials(res.remainingMaterials);
      setShopSlots([...sm.slots]);
      setLockedShopSlots(new Set(sm.lockedSlots));
      soundEngine.playComboUp(1);

      // Apply stat modifiers if any
      if (res.slot.statModifiers) {
        setRunStats((prev) => {
          const next = { ...prev };
          for (const [key, val] of Object.entries(res.slot!.statModifiers!)) {
            const statKey = key as keyof PlayerRPGStats;
            if (typeof next[statKey] === 'number') {
              next[statKey] = (next[statKey] as number) + val;
            }
          }
          return next;
        });
      }
    }
  };

  const handleToggleLockSlot = (slotIndex: number) => {
    const sm = shopManagerRef.current;
    if (!sm) return;

    if (sm.lockedSlots.has(slotIndex)) {
      sm.unlockSlot(slotIndex);
    } else {
      sm.lockSlot(slotIndex);
    }
    setLockedShopSlots(new Set(sm.lockedSlots));
    setShopSlots([...sm.slots]);
    soundEngine.playHit();
  };

  const handleRerollShop = () => {
    const sm = shopManagerRef.current;
    if (!sm || runMaterials < rerollCost) return;

    setRunMaterials((prev) => prev - rerollCost);
    sm.reroll(runStats.luck);
    setShopSlots([...sm.slots]);
    setRerollCost(calculateRerollCost(sm.rerollCount, currentWave));
    soundEngine.playComboUp(2);
  };

  const handleNextWaveFromShop = () => {
    soundEngine.playOrbitalLaser();
    setCurrentWave((prev) => prev + 1);
    setGameScreen('arena');
  };

  const handleGameOver = (finalWave: number, totalMaterials: number) => {
    soundEngine.playHit();
    setGameScreen('gameover');
  };

  const handleReturnToHub = () => {
    soundEngine.stopCombatBgm();
    soundEngine.playMenuClick();
    setGameScreen('hub');
    shopManagerRef.current = null;
    relicEngine.reset();
    setActiveRelics([]);
    setCurrentWave(1);
    setRunMaterials(0);
    setRunStats({
      ...DEFAULT_INITIAL_STATS,
      ...selectedChar.baseStats,
      currentHp: selectedChar.baseStats.maxHp ?? 100,
      maxHp: selectedChar.baseStats.maxHp ?? 100,
    });
    setActiveWeapons([null, null, null, null, null, null]);
    setShopSlots([null, null, null, null]);
    setLockedShopSlots(new Set());
    setRerollCost(1);
    setCurrentMilestone(null);
    setIsMilestoneModalOpen(false);
    setIsStudyModalOpen(false);
    setIsSettingsModalOpen(false);
    setIsMistakeNotebookOpen(false);
    setIsRadarModalOpen(false);
  };

  // Render Active Arena
  if (gameScreen === 'arena') {
    return (
      <GameCanvas
        initialWave={currentWave}
        initialMaterials={runMaterials}
        characterId={selectedChar.id}
        characterName={selectedChar.name}
        characterBadge={selectedChar.badge}
        avatarSrc={selectedChar.avatarSrc}
        activeRelics={activeRelics}
        milestoneTitle={
          selectedChar.questId
            ? getStoryMilestone(selectedChar.questId, currentWave)?.title
            : undefined
        }
        onOpenCodex={() => setIsCodexOpen(true)}
        baseStats={runStats}
        startingWeaponId={selectedChar.startingWeaponId}
        onWaveComplete={handleWaveComplete}
        onGameOver={handleGameOver}
        onReturnToMenu={handleReturnToHub}
        onRecordMistake={handleRecordMistake}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100 font-sans">
      {/* Top Header & Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/20">
              🥔
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">
                  BROTATO: KAMPÜS ROGUELITE
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  YKS &amp; BUEPT EDITION
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Top-Down Arena Shooter &amp; Eğitsel Soru-Buff Sistemi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Boğaziçi Yanlış Defteri Button */}
            <button
              onClick={() => {
                setIsMistakeNotebookOpen(true);
                if (sfxEnabled) soundEngine.playHit();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold transition cursor-pointer"
            >
              <span>📓 Yanlış Defteri</span>
            </button>

            {/* 5-Eksenli Yetenek Radarı Button */}
            <button
              onClick={() => {
                setIsRadarModalOpen(true);
                if (sfxEnabled) soundEngine.playHit();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 text-sky-300 text-xs font-bold transition cursor-pointer"
            >
              <span>📊 Yetenek Radarı</span>
            </button>

            {/* Yolculuk Günlüğü & 100 Dalga Kodeksi */}
            {selectedChar.questId && (
              <button
                onClick={() => {
                  setIsCodexOpen(true);
                  if (sfxEnabled) soundEngine.playHit();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition cursor-pointer"
              >
                <Scroll className="w-3.5 h-3.5 text-amber-400" />
                <span>📜 Yolculuk Günlüğü</span>
              </button>
            )}

            {/* Audio Settings Granular Modal Button */}
            <button
              onClick={() => {
                setIsSettingsModalOpen(true);
                soundEngine.playMenuClick();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold transition cursor-pointer"
              title="Ses ve Müzik Ayarları"
              data-testid="hub-audio-settings-button"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ses Ayarları</span>
            </button>

            <button
              onClick={toggleSfx}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition cursor-pointer"
              title={sfxEnabled && soundEngine.enabled && !soundEngine.isMuted ? 'Tüm Sesleri Sustur' : 'Sesi Aç'}
              data-testid="hub-sound-toggle-button"
            >
              {sfxEnabled && soundEngine.enabled && !soundEngine.isMuted ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Direct Link to Archived Legacy Prototype for Jury */}
            <Link
              href="/legacy"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Jüri Arşivi (5 Eski Mod)</span>
              <ExternalLink className="w-3 h-3 text-amber-400/70" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Roguelite Hub Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Act Selector & Koç Taktiği Announcement Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-indigo-800/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Aktif Müfredat Arenası
                </span>
              </div>
              <div className="text-lg font-black text-white">
                {activeAct === 'yks' ? '1. Perde: YKS Sayısal & Eşit Ağırlık' : '2. Perde: BUEPT İngilizce Yeterlilik'}
              </div>
              <p className="text-xs text-slate-400">
                Dalgalar arası dükkanda doğru cevaplanan sorular doğrudan Roguelite stat buffı ve indirim kazandırır.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setActiveAct('yks');
                  if (sfxEnabled) soundEngine.playHit();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeAct === 'yks'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                YKS (TYT/AYT)
              </button>
              <button
                onClick={() => {
                  setActiveAct('buept');
                  if (sfxEnabled) soundEngine.playHit();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeAct === 'buept'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                BUEPT (Prep)
              </button>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Boğaziçili Koç Taktiği
              </span>
              <span className="text-[10px] text-slate-500 font-mono">#GÜNLÜK-İPUCU</span>
            </div>
            <p className="text-xs text-slate-300 italic my-2">
              &quot;Dalga aralarında Matematik sorusu çözmek Hasat (Harvesting) çarpanını %10 artırır; boss dalgalarında ekonomi patlaması yaşarsın!&quot;
            </p>
            <div className="text-[11px] text-indigo-400 font-semibold text-right">
              — Boğaziçi Bilgisayar &apos;24
            </div>
          </div>
        </div>

        {/* Character Selection Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-400" />
              Karakterini Seç (4 Patates Kahramanı)
            </h2>
            <span className="text-xs text-slate-400">
              Seçilen Karakter: <strong className="text-white">{selectedChar.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {CHARACTERS.map((char) => {
              const isSelected = char.id === selectedCharId;
              return (
                <button
                  key={char.id}
                  onClick={() => handleSelectChar(char.id)}
                  className={`p-4 rounded-xl border text-left transition relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/40 shadow-xl shadow-indigo-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase bg-gradient-to-r ${char.color} text-white`}
                      >
                        {char.badge}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {char.startingWeapon.split(' ')[0]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-950 border border-slate-800 p-1 flex items-center justify-center overflow-hidden shadow-inner">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={char.avatarSrc}
                          alt={char.name}
                          className="h-full w-full object-contain drop-shadow"
                        />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-white">{char.name}</h3>
                        <p className="text-[11px] text-indigo-300 font-medium">{char.title}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{char.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Başlangıç:</span>
                    <span className="font-semibold text-slate-200">{char.startingWeapon}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 17 RPG Stats & Weapon Inventory Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 17 RPG Stats Panel */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                17 RPG Stat Tablosu (Brotato Formülü)
              </h3>
              <span className="text-xs text-slate-500 font-mono">Brotato Core Engine v2.0</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">1. Maks Can (HP)</div>
                <div className="text-sm font-black text-rose-400">{selectedChar.baseStats.maxHp ?? 100}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">2. Can Yenileme (Regen)</div>
                <div className="text-sm font-black text-rose-300">{selectedChar.baseStats.hpRegen ?? 0}/sn</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">3. Can Çalma (Life Steal)</div>
                <div className="text-sm font-black text-rose-500">%{selectedChar.baseStats.lifeSteal ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">4. Hasar % (Damage)</div>
                <div className="text-sm font-black text-amber-400">%{selectedChar.baseStats.damagePercent ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">5. Yakın Dövüş Hasarı</div>
                <div className="text-sm font-black text-orange-400">+{selectedChar.baseStats.meleeDamage ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">6. Menzilli Hasar</div>
                <div className="text-sm font-black text-sky-400">+{selectedChar.baseStats.rangedDamage ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">7. Element Hasarı</div>
                <div className="text-sm font-black text-purple-400">+{selectedChar.baseStats.elementalDamage ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">8. Saldırı Hızı (Atk Spd)</div>
                <div className="text-sm font-black text-yellow-400">%{selectedChar.baseStats.attackSpeed ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">9. Kritik Şans</div>
                <div className="text-sm font-black text-yellow-300">%{selectedChar.baseStats.critChancePercent ?? 5}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">10. Mühendislik</div>
                <div className="text-sm font-black text-emerald-400">{selectedChar.baseStats.engineering ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">11. Menzil (Range)</div>
                <div className="text-sm font-black text-cyan-400">{selectedChar.baseStats.range ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">12. Zırh (Armor)</div>
                <div className="text-sm font-black text-blue-400">+{selectedChar.baseStats.armor ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">13. Sıyrılma (Dodge)</div>
                <div className="text-sm font-black text-indigo-400">%{selectedChar.baseStats.dodgePercent ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">14. Hız % (Movement)</div>
                <div className="text-sm font-black text-teal-400">%{selectedChar.baseStats.speedPercent ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">15. Şans (Luck)</div>
                <div className="text-sm font-black text-green-400">+{selectedChar.baseStats.luck ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-slate-400 text-[11px]">16. Hasat (Harvesting)</div>
                <div className="text-sm font-black text-lime-400">+{selectedChar.baseStats.harvesting ?? 0}</div>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 col-span-2 sm:col-span-3 md:col-span-4">
                <div className="flex items-center justify-between">
                  <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                    <Magnet className="w-3.5 h-3.5 text-amber-400" />
                    <span>17. Çekim Alanı (Pickup Range)</span>
                  </div>
                  <div className="text-sm font-black text-amber-400">
                    {selectedChar.baseStats.pickupRange ?? 120} px
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weapons Array & Combat Launch */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Swords className="w-4 h-4 text-rose-400" />
                  Silah Yuvaları (6 Eşzamanlı)
                </h3>
                <span className="text-xs text-slate-400 font-mono">1/6 Dolu</span>
              </div>

              {/* 6 Weapon Slot HUD */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-indigo-950/50 border border-indigo-500/50 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
                  <span className="text-lg">🗡️</span>
                  <span className="text-[10px] font-bold text-white mt-1 truncate w-full">
                    {selectedChar.startingWeapon.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-indigo-300">Tier I</span>
                </div>
                {[2, 3, 4, 5, 6].map((slot) => (
                  <div
                    key={slot}
                    className="bg-slate-950/50 border border-dashed border-slate-800 rounded-xl p-2.5 flex flex-col items-center justify-center text-slate-600"
                  >
                    <span className="text-xs font-mono">#{slot}</span>
                    <span className="text-[9px] mt-1">Kilitli</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1 text-slate-400">
                <div className="flex items-center justify-between text-slate-300 font-semibold">
                  <span>Düşman Türleri (5 Tip):</span>
                  <span className="text-rose-400">Swarmer, Rusher, Tank, Shooter, Elite</span>
                </div>
                <p className="text-[11px]">
                  360° serbest hareket, otomatik hedefleme ve mermi fiziği ile 20 dalga hayatta kal.
                </p>
              </div>
            </div>

            {/* CTA Launch Button */}
            <div className="pt-2">
              <button
                onClick={handleStartRun}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-black text-sm tracking-wide shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Zap className="w-4 h-4 text-yellow-300 group-hover:scale-125 transition-transform" />
                <span>ARENAYA BAŞLA (DALGA 1)</span>
                <ChevronRight className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>
        </div>

        {/* 5-Axis Mastery Radar Chart & Educational Telemetry Card */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  5-EKSENLİ MÜFREDAT YETENEK RADARI
                </h3>
                <p className="text-[11px] text-slate-400">
                  Türkçe, Matematik, Fen, Sosyal ve BUEPT Akademik İngilizce Başarı Dağılımı
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsMistakeNotebookOpen(true);
                if (sfxEnabled) soundEngine.playHit();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>📓 Yanlış Defterini Aç</span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-around gap-6 pt-2">
            <MasteryRadarChart
              scores={telemetryRef.current.get5AxisScores()}
              counts={telemetryRef.current.getAttemptCounts()}
              size={290}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-bold">Toplam Çözülen</span>
                <span className="text-base font-black text-indigo-400">
                  {telemetryRef.current.getSessionStats().totalAttempts}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-bold">Genel İsabet %</span>
                <span className="text-base font-black text-emerald-400">
                  %{telemetryRef.current.getSessionStats().overallAccuracy}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-bold">En Yüksek Seri</span>
                <span className="text-base font-black text-amber-400">
                  {telemetryRef.current.getSessionStats().maxStreak} 🔥
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center col-span-2 sm:col-span-3">
                <span className="text-[10px] text-slate-400 block font-bold">Alınan Etüt Buffları</span>
                <span className="text-sm font-black text-sky-400">
                  {telemetryRef.current.getSessionStats().studyBuffsClaimed} Kalıcı RPG Buffı
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Inter-Wave Shop Modal */}
      {gameScreen === 'shop' && (
        <ShopModal
          currentWave={currentWave}
          materials={runMaterials}
          slots={shopSlots}
          lockedSlots={lockedShopSlots}
          rerollCost={rerollCost}
          playerStats={runStats}
          weapons={activeWeapons}
          onPurchaseSlot={handlePurchaseSlot}
          onToggleLockSlot={handleToggleLockSlot}
          onReroll={handleRerollShop}
          onNextWave={handleNextWaveFromShop}
          onReturnToMenu={handleReturnToHub}
        />
      )}

      {/* Inter-Wave Educational Study Modal */}
      {isStudyModalOpen && (
        <StudyBuffModal
          isOpen={isStudyModalOpen}
          currentWave={currentWave}
          availableQuestions={ALL_QUESTIONS}
          currentStreak={telemetryRef.current?.getCurrentStreak() ?? 0}
          onApplyReward={handleApplyStudyReward}
          onRecordMistake={handleRecordMistake}
          onClose={() => setIsStudyModalOpen(false)}
        />
      )}

      {/* Mistake Notebook Modal */}
      <MistakeNotebookModal
        isOpen={isMistakeNotebookOpen}
        mistakes={telemetryRef.current.getMistakeLog()}
        onResolveMistake={(mistakeId) => {
          telemetryRef.current.resolveMistake(mistakeId);
          setRunMaterials((prev) => prev + 5);
        }}
        onClose={() => setIsMistakeNotebookOpen(false)}
      />

      {/* 5-Axis Radar Modal (Standalone popup) */}
      {isRadarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="max-w-lg w-full rounded-3xl border border-sky-500/40 bg-slate-950 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <h3 className="text-base font-black text-white">5-EKSENLİ YETENEK RADARI</h3>
              </div>
              <button
                onClick={() => setIsRadarModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-850 hover:bg-slate-800"
              >
                ✕ Kapat
              </button>
            </div>
            <div className="flex justify-center py-2">
              <MasteryRadarChart
                scores={telemetryRef.current.get5AxisScores()}
                counts={telemetryRef.current.getAttemptCounts()}
                size={300}
              />
            </div>
            <button
              onClick={() => setIsRadarModalOpen(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Story Milestone Modal */}
      {isMilestoneModalOpen && currentMilestone && selectedChar.questId && (
        <StoryMilestoneModal
          milestone={currentMilestone}
          questId={selectedChar.questId}
          heroName={selectedChar.name}
          onClaimAndContinue={handleMilestoneClaim}
        />
      )}

      {/* Story Codex Modal */}
      {isCodexOpen && selectedChar.questId && (
        <StoryCodexModal
          questId={selectedChar.questId}
          currentWave={currentWave}
          isOpen={isCodexOpen}
          onClose={() => setIsCodexOpen(false)}
        />
      )}

      {/* Game Over Modal */}
      {gameScreen === 'gameover' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
          data-testid="gameover-modal"
        >
          <div className="max-w-md w-full rounded-3xl border border-rose-500/40 bg-slate-950 p-6 text-center space-y-5 shadow-2xl">
            <div className="text-4xl">💀</div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-rose-500">MEZUNA KALDIN!</h2>
              <p className="text-xs text-slate-400">
                Dalga {currentWave} seviyesinde yenildin. Toplanan Materyal: {runMaterials} 💎
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsMistakeNotebookOpen(true)}
                className="w-full py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📓 Yanlış Defterini İncele</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleStartRun}
                  data-testid="restart-gameover"
                  className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Yeniden Başla</span>
                </button>

                <button
                  onClick={handleReturnToHub}
                  data-testid="return-to-main-menu-gameover"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>Ana Menüye Dön</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {gameScreen === 'victory' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
          data-testid="victory-modal"
        >
          <div className="max-w-md w-full rounded-3xl border border-amber-500/50 bg-slate-950 p-6 text-center space-y-5 shadow-2xl">
            <div className="text-4xl text-amber-400 flex items-center justify-center">
              <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-amber-400">KAMPÜS ZAFERİ!</h2>
              <p className="text-xs text-slate-300">
                Tüm dalgaları başarıyla tamamladın ve Güney Kampüs&apos;e adım attın!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Ulaşılan Dalga</span>
                <span className="text-sm font-black text-indigo-400">{currentWave} (Zafer)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Kazanılan Materyal</span>
                <span className="text-sm font-black text-amber-400">{runMaterials} 💎</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Kalan Can</span>
                <span className="text-sm font-black text-rose-400">
                  {Math.round(runStats.currentHp)} / {runStats.maxHp}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-semibold">Kahraman</span>
                <span className="text-sm font-black text-emerald-400 truncate block">
                  {selectedChar.name}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <div className="flex gap-2">
                <button
                  onClick={() => setIsMistakeNotebookOpen(true)}
                  className="flex-1 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Yanlış Defteri</span>
                </button>
                <button
                  onClick={() => setIsRadarModalOpen(true)}
                  className="flex-1 py-2 rounded-xl bg-sky-600/20 border border-sky-500/40 hover:bg-sky-600/30 text-sky-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Yetenek Radarı</span>
                </button>
              </div>

              <button
                onClick={handleReturnToHub}
                data-testid="return-to-main-menu-victory"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Home className="h-4 w-4" />
                <span>Ana Menüye Dön</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        Brotato Engine &bull; Pure TypeScript Decoupled 60 FPS HTML5 Canvas &bull; Procedural Web Audio &bull; YKS / BUEPT Tactical System
      </footer>
    </div>
  );
}
