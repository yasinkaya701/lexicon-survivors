'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Music, Sliders, Bell } from 'lucide-react';
import { soundEngine } from '@/lib/sound';

export const AudioSettingsControl: React.FC = () => {
  const [masterVol, setMasterVol] = useState<number>(Math.round(soundEngine.masterVolume * 100));
  const [masterMuted, setMasterMuted] = useState<boolean>(soundEngine.isMuted);

  const [sfxVol, setSfxVol] = useState<number>(Math.round(soundEngine.sfxVolume * 100));
  const [sfxMuted, setSfxMuted] = useState<boolean>(soundEngine.sfxMuted);

  const [bgmVol, setBgmVol] = useState<number>(Math.round(soundEngine.bgmVolume * 100));
  const [bgmMuted, setBgmMuted] = useState<boolean>(soundEngine.bgmMuted);

  const [menuVol, setMenuVol] = useState<number>(Math.round(soundEngine.menuVolume * 100));
  const [menuMuted, setMenuMuted] = useState<boolean>(soundEngine.menuMuted);

  useEffect(() => {
    const unsub = soundEngine.subscribe((settings) => {
      setMasterVol(Math.round(settings.masterVolume * 100));
      setMasterMuted(settings.isMuted);
      setSfxVol(Math.round(settings.sfxVolume * 100));
      setSfxMuted(settings.sfxMuted);
      setBgmVol(Math.round(settings.bgmVolume * 100));
      setBgmMuted(settings.bgmMuted);
      setMenuVol(Math.round(settings.menuVolume * 100));
      setMenuMuted(settings.menuMuted);
    });
    return unsub;
  }, []);

  const handleMasterVolChange = (val: number) => {
    setMasterVol(val);
    soundEngine.setMasterVolume(val / 100);
  };

  const handleToggleMasterMute = () => {
    const next = !masterMuted;
    setMasterMuted(next);
    soundEngine.setMuted(next);
    if (!next) {
      soundEngine.enabled = true;
      soundEngine.playMenuClick();
    }
  };

  const handleSfxVolChange = (val: number) => {
    setSfxVol(val);
    soundEngine.setSfxVolume(val / 100);
  };

  const handleToggleSfxMute = () => {
    const next = !sfxMuted;
    setSfxMuted(next);
    soundEngine.setSfxMuted(next);
    if (!next) soundEngine.playHit();
  };

  const handleBgmVolChange = (val: number) => {
    setBgmVol(val);
    soundEngine.setBgmVolume(val / 100);
  };

  const handleToggleBgmMute = () => {
    const next = !bgmMuted;
    setBgmMuted(next);
    soundEngine.setBgmMuted(next);
    if (!next) soundEngine.playBgmPreview();
  };

  const handleMenuVolChange = (val: number) => {
    setMenuVol(val);
    soundEngine.setMenuVolume(val / 100);
  };

  const handleToggleMenuMute = () => {
    const next = !menuMuted;
    setMenuMuted(next);
    soundEngine.setMenuMuted(next);
    if (!next) soundEngine.playMenuClick();
  };

  const handleQuickMuteAll = () => {
    const allMuted = masterMuted && sfxMuted && bgmMuted && menuMuted;
    const target = !allMuted;
    setMasterMuted(target);
    setSfxMuted(target);
    setBgmMuted(target);
    setMenuMuted(target);
    soundEngine.setMuted(target);
    soundEngine.setSfxMuted(target);
    soundEngine.setBgmMuted(target);
    soundEngine.setMenuMuted(target);
    if (!target) {
      soundEngine.enabled = true;
      soundEngine.playMenuClick();
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          Kanal Bazli Ses Ayarlari
        </span>
        <button
          onClick={handleQuickMuteAll}
          className="text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
        >
          {masterMuted && sfxMuted && bgmMuted && menuMuted ? 'Tum Sesleri Ac' : 'Tumunu Sustur'}
        </button>
      </div>

      {/* 1. Master Channel */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            Ana Ses (Master)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {masterMuted ? 'Susturuldu' : `%${masterVol}`}
            </span>
            <button
              onClick={handleToggleMasterMute}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                masterMuted
                  ? 'bg-rose-950/50 border-rose-800 text-rose-400'
                  : 'bg-indigo-950/50 border-indigo-700 text-indigo-300'
              }`}
              title={masterMuted ? 'Ana Sesi Ac' : 'Ana Sesi Kapat'}
              data-testid="mute-toggle-master"
            >
              {masterMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={masterVol}
          disabled={masterMuted}
          onChange={(e) => handleMasterVolChange(Number(e.target.value))}
          className="w-full accent-indigo-500 cursor-pointer disabled:opacity-40"
          data-testid="volume-slider-master"
        />
      </div>

      {/* 2. SFX Channel */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            Ses Efektleri (SFX)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => soundEngine.playPistolShot()}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
            >
              Test Et
            </button>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {sfxMuted ? 'Susturuldu' : `%${sfxVol}`}
            </span>
            <button
              onClick={handleToggleSfxMute}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                sfxMuted
                  ? 'bg-rose-950/50 border-rose-800 text-rose-400'
                  : 'bg-amber-950/50 border-amber-700 text-amber-300'
              }`}
              title={sfxMuted ? 'SFX Ac' : 'SFX Kapat'}
              data-testid="mute-toggle-sfx"
            >
              {sfxMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={sfxVol}
          disabled={sfxMuted || masterMuted}
          onChange={(e) => handleSfxVolChange(Number(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer disabled:opacity-40"
          data-testid="volume-slider-sfx"
        />
      </div>

      {/* 3. In-Game Music (BGM) */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-emerald-400" />
            Oyun Ici Muzik (BGM)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => soundEngine.playBgmPreview()}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
            >
              Test Et
            </button>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {bgmMuted ? 'Susturuldu' : `%${bgmVol}`}
            </span>
            <button
              onClick={handleToggleBgmMute}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                bgmMuted
                  ? 'bg-rose-950/50 border-rose-800 text-rose-400'
                  : 'bg-emerald-950/50 border-emerald-700 text-emerald-300'
              }`}
              title={bgmMuted ? 'BGM Ac' : 'BGM Kapat'}
              data-testid="mute-toggle-bgm"
            >
              {bgmMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={bgmVol}
          disabled={bgmMuted || masterMuted}
          onChange={(e) => handleBgmVolChange(Number(e.target.value))}
          className="w-full accent-emerald-500 cursor-pointer disabled:opacity-40"
          data-testid="volume-slider-bgm"
        />
      </div>

      {/* 4. Main Menu & UI Sounds */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            Ana Menu &amp; Arayuz Sesi
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => soundEngine.playMenuClick()}
              className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
            >
              Test Et
            </button>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {menuMuted ? 'Susturuldu' : `%${menuVol}`}
            </span>
            <button
              onClick={handleToggleMenuMute}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                menuMuted
                  ? 'bg-rose-950/50 border-rose-800 text-rose-400'
                  : 'bg-sky-950/50 border-sky-700 text-sky-300'
              }`}
              title={menuMuted ? 'Menu Sesi Ac' : 'Menu Sesi Kapat'}
              data-testid="mute-toggle-menu"
            >
              {menuMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={menuVol}
          disabled={menuMuted || masterMuted}
          onChange={(e) => handleMenuVolChange(Number(e.target.value))}
          className="w-full accent-sky-500 cursor-pointer disabled:opacity-40"
          data-testid="volume-slider-menu"
        />
      </div>
    </div>
  );
};
