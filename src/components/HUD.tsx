'use client';

import React, { useState } from 'react';
import { Shield, Zap, Sparkles, Heart, X, BatteryCharging, BookOpen } from 'lucide-react';
import type { PlayerRPGStats, ActiveWeaponInstance } from '@/types/brotato';
import { WeaponInventoryBar } from '@/components/WeaponInventoryBar';
import { RelicBar } from '@/game/story/RelicBar';
import { StoryRelic } from '@/data/storyQuests';

export interface HUDProps {
  currentHp: number;
  maxHp: number;
  materials: number;
  wave: number;
  waveTimeRemainingSec: number;
  waveDurationSec: number;
  weapons: (ActiveWeaponInstance | null)[];
  playerStats: PlayerRPGStats;
  characterName: string;
  characterBadge: string;
  avatarSrc?: string;
  activeRelics?: StoryRelic[];
  milestoneTitle?: string;
  onOpenCodex?: () => void;
  isTacticalFreeze?: boolean;
  showStats?: boolean;
  onToggleStats?: () => void;
  onPause?: () => void;
  // Requirement R3 Mid-Wave Question Charges
  questionCharges?: number;
  maxQuestionCharges?: number;
  onTriggerQuestion?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  currentHp,
  maxHp,
  materials,
  wave,
  waveTimeRemainingSec,
  waveDurationSec,
  weapons,
  playerStats,
  characterName,
  characterBadge,
  avatarSrc,
  activeRelics = [],
  milestoneTitle,
  onOpenCodex,
  isTacticalFreeze = false,
  showStats = false,
  onToggleStats,
  onPause,
  questionCharges = 2,
  maxQuestionCharges = 2,
  onTriggerQuestion,
}) => {
  const [avatarErr, setAvatarErr] = useState(false);
  const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
  const isCriticalHp = hpPercent <= 25;
  const timeSeconds = Math.ceil(waveTimeRemainingSec);
  const minutes = Math.floor(timeSeconds / 60);
  const seconds = timeSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const waveProgress = Math.max(0, Math.min(100, (1 - waveTimeRemainingSec / waveDurationSec) * 100));

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-4 font-sans select-none">
      {/* Top HUD Bar — Stitch Dungeon Aesthetic */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Modern Potato Hero Profile & Stitch XP / HP Bar */}
        <div className="flex flex-col gap-2">
          {/* Hero Profile & HP Card */}
          <div
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl border bg-slate-950/90 p-3 shadow-2xl backdrop-blur-md transition-all ${
              isCriticalHp
                ? 'border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse'
                : 'border-slate-800'
            }`}
          >
            {/* High-Resolution Hero Avatar Badge with Glowing Ring */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-indigo-600/30">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-950 overflow-hidden">
                {!avatarErr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc || '/assets/hero_rune_sorceress.png'}
                    alt={characterName}
                    onError={() => setAvatarErr(true)}
                    className="h-12 w-12 object-cover scale-105 drop-shadow rounded-xl"
                  />
                ) : (
                  <Heart className="h-6 w-6 text-amber-400" />
                )}
              </div>
              {/* Level / Hero Status Badge */}
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 shadow">
                <Shield className="h-2.5 w-2.5 text-slate-950" />
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white tracking-wide">{characterName}</span>
                <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-extrabold text-indigo-300 border border-indigo-500/40">
                  {characterBadge}
                </span>
              </div>

              {/* Segmented Cyberpunk HP Bar with Animated Danger Pulse */}
              <div className="w-52 sm:w-64">
                <div
                  className={`relative h-4 w-full overflow-hidden rounded-full border bg-slate-900 ${
                    isCriticalHp ? 'border-rose-500' : 'border-slate-800'
                  }`}
                >
                  {/* Glowing HP Fill */}
                  <div
                    className={`h-full transition-all duration-150 ${
                      isCriticalHp
                        ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                        : 'bg-gradient-to-r from-rose-600 via-amber-500 to-emerald-500'
                    }`}
                    style={{ width: `${hpPercent}%` }}
                  />

                  {/* Cyberpunk Segment Grid Ticks (10 segments) */}
                  <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-30">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="h-full w-[1px] bg-slate-950" />
                    ))}
                  </div>

                  {/* HP Value Label */}
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    {Math.max(0, Math.ceil(currentHp))} / {maxHp} HP
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Story Relics Bar */}
          {activeRelics && activeRelics.length > 0 && (
            <div className="pointer-events-auto">
              <RelicBar relics={activeRelics} onOpenCodex={onOpenCodex} />
            </div>
          )}

          {/* Stitch Reference XP Capsule Bar (Top-Left) */}
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-emerald-500/40 bg-slate-950/90 px-3 py-1 shadow-lg backdrop-blur-md w-fit">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/25 text-[9px] font-black text-emerald-300 border border-emerald-400/50">
              XP
            </div>
            <div className="h-2 w-36 sm:w-44 overflow-hidden rounded-full bg-slate-900 border border-emerald-950">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 shadow-[0_0_8px_rgba(16,185,129,0.7)] transition-all duration-200"
                style={{ width: `${Math.min(100, (materials % 30) * 3.33)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Wave Timer, Wave Progress, and Tactical Freeze Banner (Stitch Rounded Box) */}
        <div className="pointer-events-auto flex flex-col items-center">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-slate-950/95 px-6 py-2 shadow-2xl backdrop-blur-md">
            {/* Stitch Golden Wave Icon */}
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-400/40">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                WAVE: {wave} / 100
              </div>
              <div className="text-xl font-black tabular-nums text-white drop-shadow leading-none mt-0.5">
                {timeFormatted}
              </div>
              {milestoneTitle && (
                <div className="text-[9px] font-serif italic text-amber-200 mt-1 max-w-[180px] truncate">
                  {milestoneTitle}
                </div>
              )}
            </div>
          </div>

          {/* Wave Timer Progress Indicator */}
          <div className="mt-1 h-1.5 w-44 overflow-hidden rounded-full bg-slate-900 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-200"
              style={{ width: `${waveProgress}%` }}
            />
          </div>

          {isTacticalFreeze && (
            <div className="mt-1 flex items-center gap-1.5 rounded-full border border-sky-500/60 bg-sky-950/90 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-sky-300 animate-pulse shadow-lg shadow-sky-500/20">
              <Sparkles className="h-3 w-3 text-cyan-400" /> TAKTİKSEL DURAKLATMA (dt=0)
            </div>
          )}
        </div>

        {/* Right: Pause Button, Question Charge Meter, Materials & Stats Toggle */}
        <div className="pointer-events-auto flex items-center gap-3">
          {/* Requirement R3: In-Wave Question Charge Indicator */}
          <div
            onClick={onTriggerQuestion}
            className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 shadow-2xl backdrop-blur-md transition ${
              questionCharges > 0
                ? 'border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-950/80 cursor-pointer shadow-cyan-500/10'
                : 'border-slate-800 bg-slate-950/80 opacity-60'
            }`}
            title="Dalga İçi Soru Hakkı [Q] — Çöz ve Anında Eşya Ödülü Kazan!"
          >
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1">
                <BatteryCharging className={`h-3.5 w-3.5 ${questionCharges > 0 ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="text-[9px] font-black uppercase tracking-wider text-cyan-300">
                  SORU [Q]
                </span>
              </div>
              {/* Battery Charge Pips */}
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: maxQuestionCharges }).map((_, idx) => {
                  const isCharged = idx < questionCharges;
                  return (
                    <div
                      key={idx}
                      className={`h-2.5 w-4 rounded-sm border transition-all ${
                        isCharged
                          ? 'border-cyan-400 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                          : 'border-slate-800 bg-slate-900/80'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Glowing Materials Vector Crystal Badge */}
          <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/40 bg-slate-950/90 px-4 py-2.5 shadow-2xl backdrop-blur-md">
            {/* Vector Crystal Icon */}
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/40 shadow-inner">
              <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="text-[9px] font-black text-amber-400/90 uppercase tracking-widest">
                Materyal
              </div>
              <div className="text-base font-black text-amber-300 tabular-nums leading-none mt-0.5">
                {materials}
              </div>
            </div>
          </div>

          {/* Stitch Reference Pause Button (Top-Right) */}
          <button
            onClick={onPause || onToggleStats}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/90 text-slate-300 hover:text-white hover:border-slate-500 shadow-xl transition cursor-pointer"
            title="Duraklat &amp; Ayarlar [ESC]"
            data-testid="hud-pause-button"
          >
            <span className="font-mono font-black text-sm tracking-widest">||</span>
          </button>
        </div>
      </div>

      {/* Middle Floating Stats Sheet (if toggled) */}
      {showStats && (
        <div className="pointer-events-auto my-auto max-w-sm rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-400" /> 17 RPG Stat Tablosu
            </span>
            <button
              onClick={onToggleStats}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div>Maks Can: <strong className="text-rose-400">{playerStats.maxHp}</strong></div>
            <div>Can Yenileme: <strong className="text-rose-300">{playerStats.hpRegen}/s</strong></div>
            <div>Can Çalma: <strong className="text-rose-500">%{playerStats.lifeSteal}</strong></div>
            <div>Hasar %: <strong className="text-amber-400">%{playerStats.damagePercent}</strong></div>
            <div>Yakın Hasar: <strong className="text-orange-400">+{playerStats.meleeDamage}</strong></div>
            <div>Menzilli Hasar: <strong className="text-sky-400">+{playerStats.rangedDamage}</strong></div>
            <div>Element Hasarı: <strong className="text-purple-400">+{playerStats.elementalDamage}</strong></div>
            <div>Saldırı Hızı: <strong className="text-yellow-400">%{playerStats.attackSpeed}</strong></div>
            <div>Kritik Şans: <strong className="text-yellow-300">%{playerStats.critChancePercent}</strong></div>
            <div>Mühendislik: <strong className="text-emerald-400">{playerStats.engineering}</strong></div>
            <div>Menzil: <strong className="text-cyan-400">{playerStats.range}</strong></div>
            <div>Zırh: <strong className="text-blue-400">+{playerStats.armor}</strong></div>
            <div>Sıyrılma (Dodge): <strong className="text-indigo-400">%{playerStats.dodgePercent}</strong></div>
            <div>Hız %: <strong className="text-teal-400">%{playerStats.speedPercent}</strong></div>
            <div>Şans (Luck): <strong className="text-green-400">+{playerStats.luck}</strong></div>
            <div>Hasat: <strong className="text-lime-400">+{playerStats.harvesting}</strong></div>
            <div className="col-span-2 text-slate-400">
              Çekim Alanı: <strong className="text-amber-300">{playerStats.pickupRange} px</strong>
            </div>
          </div>
        </div>
      )}

      {/* Bottom HUD: Standalone 6-Slot Weapon Inventory Bar */}
      <div className="pointer-events-auto flex items-end justify-center">
        <WeaponInventoryBar weapons={weapons} />
      </div>
    </div>
  );
};
