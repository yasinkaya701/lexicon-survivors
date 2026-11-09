'use client';

import React, { useState } from 'react';
import { Crosshair, Sword } from 'lucide-react';
import type { ActiveWeaponInstance } from '@/types/brotato';

export interface WeaponInventoryBarProps {
  weapons: (ActiveWeaponInstance | null)[];
  onSlotClick?: (index: number) => void;
  className?: string;
}

const TIER_CONFIG: Record<
  number,
  {
    border: string;
    bg: string;
    text: string;
    badgeBg: string;
    glow: string;
    label: string;
  }
> = {
  1: {
    border: 'border-slate-500/70',
    bg: 'bg-slate-900/90',
    text: 'text-slate-300',
    badgeBg: 'bg-slate-800 text-slate-300 border-slate-600',
    glow: 'shadow-slate-500/10',
    label: 'T1',
  },
  2: {
    border: 'border-sky-500/80',
    bg: 'bg-sky-950/90',
    text: 'text-sky-300',
    badgeBg: 'bg-sky-900/80 text-sky-200 border-sky-400/50',
    glow: 'shadow-sky-500/20 shadow-md',
    label: 'T2',
  },
  3: {
    border: 'border-purple-500/80',
    bg: 'bg-purple-950/90',
    text: 'text-purple-300',
    badgeBg: 'bg-purple-900/80 text-purple-200 border-purple-400/50',
    glow: 'shadow-purple-500/25 shadow-lg',
    label: 'T3',
  },
  4: {
    border: 'border-amber-400/90',
    bg: 'bg-amber-950/90',
    text: 'text-amber-300',
    badgeBg: 'bg-amber-900/80 text-amber-200 border-amber-400/60',
    glow: 'shadow-amber-500/30 shadow-xl',
    label: 'T4',
  },
};

export const WeaponInventoryBar: React.FC<WeaponInventoryBarProps> = ({
  weapons,
  onSlotClick,
  className = '',
}) => {
  // Pad weapons array to always display 6 slots
  const slots: (ActiveWeaponInstance | null)[] = Array.from({ length: 6 }, (_, i) => weapons[i] ?? null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border border-indigo-500/30 bg-slate-950/90 p-2 shadow-2xl backdrop-blur-md ${className}`}
      data-testid="weapon-inventory-bar"
    >
      {slots.map((inst, index) => {
        const slotNumber = index + 1;

        if (!inst) {
          return (
            <div
              key={`empty_slot_${index}`}
              className="relative flex h-16 w-16 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-slate-600 transition hover:border-slate-700"
              title={`Boş Silah Yuvası #${slotNumber}`}
            >
              <span className="absolute top-1 left-1.5 font-mono text-[9px] font-extrabold text-slate-500">
                {slotNumber}
              </span>
              <Crosshair className="h-4 w-4 opacity-30" />
              <span className="mt-1 text-[8px] font-mono tracking-tighter text-slate-600">BOŞ</span>
            </div>
          );
        }

        const tier = inst.blueprint.tier || 1;
        const tierCfg = TIER_CONFIG[tier] || TIER_CONFIG[1];
        const cooldownPercent =
          inst.blueprint.baseCooldownMs > 0
            ? Math.min(100, Math.max(0, (inst.currentCooldownMs / inst.blueprint.baseCooldownMs) * 100))
            : 0;

        const spriteSrc = `/assets/${inst.blueprint.spriteName}.png`;
        const hasImgError = imgErrors[inst.id];

        return (
          <div
            key={inst.id}
            onClick={() => onSlotClick?.(index)}
            className={`relative flex h-16 w-16 flex-col items-center justify-between rounded-xl border p-1 text-center transition select-none overflow-hidden cursor-pointer ${tierCfg.border} ${tierCfg.bg} ${tierCfg.glow}`}
            title={`${inst.blueprint.name} (Tier ${tier}) — Hasar: ${inst.blueprint.baseDamage}`}
          >
            {/* Top row: Hotkey badge (Left) & Tier badge (Right) */}
            <div className="flex w-full items-center justify-between z-10 pointer-events-none">
              <span className="rounded bg-black/70 px-1 py-0.2 font-mono text-[9px] font-black text-slate-400 border border-slate-700/60">
                {slotNumber}
              </span>
              <span
                className={`rounded px-1 py-0.2 font-mono text-[8px] font-black uppercase border ${tierCfg.badgeBg}`}
              >
                {tierCfg.label}
              </span>
            </div>

            {/* Middle: Weapon Sprite Icon */}
            <div className="relative flex h-7 w-7 items-center justify-center z-10 pointer-events-none">
              {!hasImgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={spriteSrc}
                  alt={inst.blueprint.name}
                  onError={() => handleImageError(inst.id)}
                  className="h-full w-full object-contain filter drop-shadow"
                />
              ) : (
                <Sword className={`h-5 w-5 ${tierCfg.text}`} />
              )}
            </div>

            {/* Bottom: Truncated Weapon Name */}
            <span
              className={`w-full truncate text-[8px] font-black tracking-tight leading-none z-10 pointer-events-none ${tierCfg.text}`}
            >
              {inst.blueprint.name.split(' ')[0]}
            </span>

            {/* Cooldown Sweep Radial/Vertical Overlay */}
            {cooldownPercent > 0 && (
              <div
                className="absolute inset-0 bg-slate-950/75 pointer-events-none transition-all duration-75 flex items-center justify-center"
                style={{
                  clipPath: `inset(0 0 ${100 - cooldownPercent}% 0)`,
                }}
              >
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
