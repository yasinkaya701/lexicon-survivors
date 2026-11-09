'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Home,
  Sliders,
  Shield,
  Activity,
  Crosshair,
  Volume2,
  X,
} from 'lucide-react';
import { AudioSettingsControl } from './AudioSettingsControl';
import type { PlayerRPGStats, TargetingMode } from '@/types/brotato';

export interface PauseSettingsModalProps {
  isOpen: boolean;
  onResume: () => void;
  onReturnToMainMenu: () => void;
  currentWave: number;
  materials: number;
  playerStats?: PlayerRPGStats;
  targetingMode?: TargetingMode;
  onChangeTargetingMode?: (mode: TargetingMode) => void;
  isScreenShakeEnabled?: boolean;
  onToggleScreenShake?: () => void;
  isDamageNumbersEnabled?: boolean;
  onToggleDamageNumbers?: () => void;
}

export const PauseSettingsModal: React.FC<PauseSettingsModalProps> = ({
  isOpen,
  onResume,
  onReturnToMainMenu,
  currentWave,
  materials,
  playerStats,
  targetingMode = 'closest',
  onChangeTargetingMode,
  isScreenShakeEnabled = true,
  onToggleScreenShake,
  isDamageNumbersEnabled = true,
  onToggleDamageNumbers,
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'gameplay' | 'stats'>('audio');
  const [isConfirmingAbandon, setIsConfirmingAbandon] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setIsConfirmingAbandon(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'escape' || key === 'p') {
        e.stopImmediatePropagation();
        e.preventDefault();
        if (isConfirmingAbandon) {
          setIsConfirmingAbandon(false);
        } else {
          onResume();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onResume, isConfirmingAbandon]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
      data-testid="pause-settings-modal"
    >
      <div className="max-w-xl w-full rounded-3xl border border-slate-700 bg-slate-950 p-6 space-y-5 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 font-mono font-bold text-sm">
              ||
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-wide">
                OYUN DURAKLATILDI
              </h2>
              <p className="text-[11px] text-slate-400">
                Dalga {currentWave} &bull; {materials} Materyal
              </p>
            </div>
          </div>
          <button
            onClick={onResume}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition cursor-pointer"
            title="Kapat &amp; Devam Et [ESC]"
            data-testid="pause-modal-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'audio'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Ses Ayarlari</span>
          </button>
          <button
            onClick={() => setActiveTab('gameplay')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'gameplay'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Oyun &amp; Kontroller</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Stat Tablosu</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <AudioSettingsControl />
            </div>
          )}

          {activeTab === 'gameplay' && (
            <div className="space-y-4 text-xs">
              {/* Targeting Mode */}
              <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                    Otomatik Hedefleme Onceligi
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">
                    {targetingMode}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'closest', label: 'En Yakin' },
                      { id: 'lowest_health', label: 'En Az Can' },
                      { id: 'highest_threat', label: 'En Yuksek Tehdit' },
                    ] as { id: TargetingMode; label: string }[]
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => onChangeTargetingMode?.(mode.id)}
                      className={`py-2 px-2 rounded-lg text-center font-bold text-[11px] border transition cursor-pointer ${
                        targetingMode === mode.id
                          ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Screen Shake & Damage Numbers */}
              <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Ekran Titremesi (Trauma Shake)</span>
                    <span className="text-[10px] text-slate-400">Patlama ve kritik darbelerde sarsinti</span>
                  </div>
                  <button
                    onClick={onToggleScreenShake}
                    className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition cursor-pointer ${
                      isScreenShakeEnabled
                        ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    {isScreenShakeEnabled ? 'Acik' : 'Kapali'}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="font-bold text-white block">Ucan Hasar Sayilari (Floating Text)</span>
                    <span className="text-[10px] text-slate-400">Dusman uzerinde hasar ve kritik vuruslar</span>
                  </div>
                  <button
                    onClick={onToggleDamageNumbers}
                    className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition cursor-pointer ${
                      isDamageNumbersEnabled
                        ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    {isDamageNumbersEnabled ? 'Acik' : 'Kapali'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && playerStats && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  Aktif RPG Nitelikleri
                </span>
                <span className="text-[11px] font-mono text-slate-500">17 Stat Tablosu</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Can:</span>
                  <strong className="text-rose-400">
                    {Math.round(playerStats.currentHp)} / {playerStats.maxHp} HP
                  </strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Can Yenileme:</span>
                  <strong className="text-rose-300">{playerStats.hpRegen}/sn</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Can Calma:</span>
                  <strong className="text-rose-500">%{playerStats.lifeSteal}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Hasar %:</span>
                  <strong className="text-amber-400">%{playerStats.damagePercent}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Yakin Hasar:</span>
                  <strong className="text-orange-400">+{playerStats.meleeDamage}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Menzilli Hasar:</span>
                  <strong className="text-sky-400">+{playerStats.rangedDamage}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Element Hasari:</span>
                  <strong className="text-purple-400">+{playerStats.elementalDamage}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Saldiri Hizi:</span>
                  <strong className="text-yellow-400">%{playerStats.attackSpeed}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Kritik Sans:</span>
                  <strong className="text-yellow-300">%{playerStats.critChancePercent}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Muhendislik:</span>
                  <strong className="text-emerald-400">{playerStats.engineering}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Zirh:</span>
                  <strong className="text-blue-400">+{playerStats.armor}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Siyrilma:</span>
                  <strong className="text-indigo-400">%{playerStats.dodgePercent}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Hareket Hizi:</span>
                  <strong className="text-teal-400">%{playerStats.speedPercent}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Sans:</span>
                  <strong className="text-green-400">+{playerStats.luck}</strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Hasat:</span>
                  <strong className="text-lime-400">+{playerStats.harvesting}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={onResume}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            data-testid="pause-resume-button"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Oyuna Devam Et [ESC]</span>
          </button>

          <button
            onClick={() => setIsConfirmingAbandon(true)}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/30 text-rose-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
            data-testid="pause-return-to-main-menu"
          >
            <Home className="w-4 h-4 text-rose-400" />
            <span>Ana Menüye Dön</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Abandoning Run */}
      {isConfirmingAbandon && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-100"
          data-testid="pause-confirm-dialog"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsConfirmingAbandon(false);
            }
          }}
        >
          <div className="max-w-md w-full rounded-2xl border border-rose-500/50 bg-slate-950 p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/40 mx-auto flex items-center justify-center text-rose-400">
              <Home className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-white tracking-wide" data-testid="pause-confirm-title">
                ANA MENÜYE DÖNÜŞ ONAYI
              </h3>
              <p className="text-xs text-slate-300" data-testid="pause-confirm-message">
                Mevcut koşuyu sonlandırıp ana menüye dönmek istediğinize emin misiniz?
              </p>
              <p className="text-[11px] text-rose-400 font-medium">
                Kaydedilmemiş koşu ilerlemeniz ve toplanan materyaller silinecektir.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingAbandon(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs transition cursor-pointer"
                data-testid="pause-confirm-cancel-button"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingAbandon(false);
                  onReturnToMainMenu();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer shadow-lg shadow-rose-600/30"
                data-testid="pause-confirm-accept-button"
              >
                Ana Menüye Dön
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
