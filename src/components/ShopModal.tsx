'use client';

import React from 'react';
import {
  Lock,
  Unlock,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Combine,
  Store,
  Home,
} from 'lucide-react';
import type { ShopSlot, PlayerRPGStats, ActiveWeaponInstance } from '@/types/brotato';

export interface ShopModalProps {
  currentWave: number;
  materials: number;
  slots: (ShopSlot | null)[];
  lockedSlots: Set<number>;
  rerollCost: number;
  playerStats: PlayerRPGStats;
  weapons: (ActiveWeaponInstance | null)[];
  onPurchaseSlot: (slotIndex: number) => void;
  onToggleLockSlot: (slotIndex: number) => void;
  onReroll: () => void;
  onCombineWeapons?: (slotA: number, slotB: number) => void;
  onNextWave: () => void;
  onReturnToMenu?: () => void;
}

const TIER_BADGE_COLORS: Record<number, string> = {
  1: 'bg-slate-700/60 text-slate-200 border-slate-600',
  2: 'bg-sky-600/30 text-sky-300 border-sky-500/50',
  3: 'bg-purple-600/30 text-purple-300 border-purple-500/50',
  4: 'bg-amber-600/30 text-amber-300 border-amber-500/50',
};

export const ShopModal: React.FC<ShopModalProps> = ({
  currentWave,
  materials,
  slots,
  lockedSlots,
  rerollCost,
  playerStats,
  weapons,
  onPurchaseSlot,
  onToggleLockSlot,
  onReroll,
  onCombineWeapons,
  onNextWave,
  onReturnToMenu,
}) => {
  // Check if any two weapons can be combined
  const combinablePair: [number, number] | null = (() => {
    for (let i = 0; i < weapons.length; i++) {
      for (let j = i + 1; j < weapons.length; j++) {
        const w1 = weapons[i];
        const w2 = weapons[j];
        if (
          w1 &&
          w2 &&
          w1.blueprint.name === w2.blueprint.name &&
          w1.blueprint.tier === w2.blueprint.tier &&
          w1.blueprint.tier < 4
        ) {
          return [i, j];
        }
      }
    }
    return null;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 font-sans">
      <div className="w-full max-w-5xl rounded-3xl border border-indigo-500/30 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-purple-600 shadow-lg shadow-indigo-600/20">
              <Store className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">KAMPÜS DÜKKANI</h2>
                <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs font-black text-indigo-300 border border-indigo-500/30">
                  DALGA {currentWave} TAMAMLANDI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Silahlar ve stat geliştirmeleri satın al; sonraki dalgaya hazırlan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Materials Counter Badge */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 shadow-inner">
              <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Materyal</span>
                <span className="text-lg font-black text-amber-300 tabular-nums leading-none">{materials}</span>
              </div>
            </div>

            {/* Reroll Button */}
            <button
              onClick={onReroll}
              disabled={materials < rerollCost}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black transition ${
                materials >= rerollCost
                  ? 'border-indigo-500/40 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 cursor-pointer shadow-lg shadow-indigo-600/10'
                  : 'border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              <span className="flex items-center gap-1">
                Yenile ({rerollCost} <Sparkles className="h-3 w-3 text-amber-400 inline" />)
              </span>
            </button>
          </div>
        </div>

        {/* 4 Shop Slots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {slots.map((slot, index) => {
            if (!slot) {
              return (
                <div
                  key={`empty_${index}`}
                  className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-xs text-slate-600"
                >
                  Boş Yuva
                </div>
              );
            }

            const isLocked = lockedSlots.has(index);
            const canAfford = materials >= slot.cost && !slot.isPurchased;
            const badgeClass = TIER_BADGE_COLORS[slot.tier] || TIER_BADGE_COLORS[1];

            return (
              <div
                key={slot.itemId || `slot_${index}`}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition relative overflow-hidden ${
                  slot.isPurchased
                    ? 'border-slate-800/50 bg-slate-950/40 opacity-40'
                    : isLocked
                    ? 'border-indigo-500/60 bg-slate-900/90 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                {/* Slot Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${badgeClass}`}>
                      Tier {slot.tier}
                    </span>
                    <button
                      onClick={() => onToggleLockSlot(index)}
                      disabled={slot.isPurchased}
                      className={`p-1.5 rounded-lg border transition ${
                        isLocked
                          ? 'border-indigo-500/50 bg-indigo-600/30 text-indigo-300'
                          : 'border-slate-800 bg-slate-950/50 text-slate-500 hover:text-slate-300'
                      }`}
                      title={isLocked ? 'Kilidi Aç' : 'Yuvayı Kilitle'}
                    >
                      {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-white">{slot.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{slot.description}</p>
                  </div>

                  {/* Stat Modifiers Preview */}
                  {slot.statModifiers && (
                    <div className="space-y-0.5 pt-2 text-[11px]">
                      {Object.entries(slot.statModifiers).map(([stat, val]) => (
                        <div key={stat} className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span>+</span>
                          <span>{val}</span>
                          <span className="text-slate-400">{stat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Purchase Button */}
                <div className="pt-4 border-t border-slate-800/80 mt-4">
                  {slot.isPurchased ? (
                    <div className="w-full py-2 text-center text-xs font-bold text-slate-500 bg-slate-950/50 rounded-xl">
                      Satın Alındı
                    </div>
                  ) : (
                    <button
                      onClick={() => onPurchaseSlot(index)}
                      disabled={!canAfford}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 ${
                        canAfford
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span className="flex items-center gap-1">
                        {slot.cost} <Sparkles className="h-3 w-3 text-amber-300 inline" /> Satın Al
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Weapons Combine Bar (if combinable) */}
        {combinablePair && onCombineWeapons && (
          <div className="flex items-center justify-between rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5">
            <div className="flex items-center gap-2.5 text-xs text-amber-300 font-bold">
              <Combine className="h-4 w-4 text-amber-400 animate-bounce" />
              <span>
                Birleştirilebilir 2 Silah Bulundu:{' '}
                <strong className="text-white">
                  {weapons[combinablePair[0]]?.blueprint.name}
                </strong>
              </span>
            </div>
            <button
              onClick={() => onCombineWeapons(combinablePair[0], combinablePair[1])}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-black text-slate-950 transition shadow cursor-pointer"
            >
              Silahları Birleştir (Tier +1)
            </button>
          </div>
        )}

        {/* Footer Actions: Stats sheet and Next Wave launch */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>Can: <strong className="text-white">{playerStats.currentHp}/{playerStats.maxHp}</strong></span>
            <span>Zırh: <strong className="text-blue-400">+{playerStats.armor}</strong></span>
            <span>Hasar: <strong className="text-amber-400">%{playerStats.damagePercent}</strong></span>
            <span>Hız: <strong className="text-teal-400">%{playerStats.speedPercent}</strong></span>
            <span>Hasat: <strong className="text-lime-400">+{playerStats.harvesting}</strong></span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            {onReturnToMenu && (
              <button
                onClick={onReturnToMenu}
                data-testid="return-to-main-menu-shop"
                className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/30 text-rose-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="h-4 w-4 text-rose-400" />
                <span>Ana Menüye Dön</span>
              </button>
            )}

            <button
              onClick={onNextWave}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-black text-sm tracking-wide shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>SONRAKİ DALGAYA BAŞLA (DALGA {currentWave + 1})</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
