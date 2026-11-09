'use client';

import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from '@/lib/sound';
import { ArrowLeft, CheckCircle2, Flame, RotateCcw, Scissors, ShieldAlert, Zap } from 'lucide-react';

interface SpikeDefuseSimProps {
  onScoreGain: (netDelta: number, lpDelta: number) => void;
  onBackToRoom: () => void;
}

export const SpikeDefuseSim: React.FC<SpikeDefuseSimProps> = ({
  onScoreGain,
  onBackToRoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(45.0);
  const [mod1Done, setMod1Done] = useState<boolean>(false);
  const [mod2Done, setMod2Done] = useState<boolean>(false);
  const [mod3Done, setMod3Done] = useState<boolean>(false);
  const [cutWires, setCutWires] = useState<number[]>([]);
  const [freqVal, setFreqVal] = useState<number>(5);
  const [statusMsg, setStatusMsg] = useState<string>(
    '💣 SPIKE KURULDU! 3 Akademik Güvenlik Modülünü süre bitmeden devre dışı bırak ve CLUTCH at!'
  );

  const allDefused = mod1Done && mod2Done && mod3Done;
  const exploded = timeLeft <= 0 && !allDefused;

  const sparkRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; life: number }[]>([]);

  const spawnSparks = (x: number, y: number, color: string) => {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1.5 + Math.random() * 4.5;
      sparkRef.current.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        color,
        life: 25 + Math.random() * 15,
      });
    }
  };

  // Countdown Timer
  useEffect(() => {
    if (allDefused || exploded) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          soundEngine.playWrongBuzz();
          return 0;
        }
        return +(prev - 0.1).toFixed(1);
      });
    }, 100);
    return () => clearInterval(t);
  }, [allDefused, exploded]);

  // Trigger Victory Fanfare when all 3 modules defused
  useEffect(() => {
    if (allDefused) {
      soundEngine.playVictoryFanfare();
      onScoreGain(6.0, 75);
      setStatusMsg('🏆 CLUTCH DEFUSE BAŞARILI! Spike imha edildi! (+6.0 Net & +75 LP Kazandın!)');
    }
  }, [allDefused, onScoreGain]);

  // 60 FPS Spike Reactor & Oscilloscope Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = (time: number) => {
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Left Side: Valorant-Style Rotating Spike Core Reactor
      const cx = 135;
      const cy = 110;
      const pulse = allDefused
        ? 0.4
        : 0.6 + 0.4 * Math.sin(time * (timeLeft < 12 ? 0.025 : 0.01));

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * (allDefused ? 0.002 : 0.008));
      ctx.strokeStyle = allDefused ? '#34d399' : exploded ? '#ef4444' : '#f43f5e';
      ctx.lineWidth = 3;
      ctx.strokeRect(-42, -42, 84, 84);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = allDefused ? '#38bdf8' : '#fbbf24';
      ctx.strokeRect(-36, -36, 72, 72);
      ctx.restore();

      // Core Glow
      ctx.fillStyle = allDefused
        ? 'rgba(52, 211, 153, 0.85)'
        : `rgba(244, 63, 94, ${pulse})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(allDefused ? '✓ DEFUSED' : '💣 SPIKE CORE', cx - 36, cy + 68);

      // Right Side: Live Oscilloscope Wave (Target vs Current Frequency)
      const ox = 250;
      const oy = 30;
      const ow = 240;
      const oh = 155;
      ctx.fillStyle = '#04070d';
      ctx.fillRect(ox, oy, ow, oh);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(ox, oy, ow, oh);

      // Target Wave (Green Ghost Sine at freq = 2)
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < ow; x++) {
        const y = oy + oh / 2 + Math.sin(x * 0.04 * 2 + time * 0.006) * 38;
        if (x === 0) ctx.moveTo(ox + x, y);
        else ctx.lineTo(ox + x, y);
      }
      ctx.stroke();

      // Player Tuned Wave
      ctx.strokeStyle = freqVal === 2 ? '#34d399' : '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x < ow; x++) {
        const y = oy + oh / 2 + Math.sin(x * 0.04 * freqVal + time * 0.006) * 38;
        if (x === 0) ctx.moveTo(ox + x, y);
        else ctx.lineTo(ox + x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`OSİLOSKOP: Seçili Frekans x = ${freqVal} (Hedef: Yeşil Dalga)`, ox + 10, oy + 18);

      // Render Sparks
      for (let i = sparkRef.current.length - 1; i >= 0; i--) {
        const sp = sparkRef.current[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life--;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        if (sp.life <= 0) sparkRef.current.splice(i, 1);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [allDefused, exploded, freqVal, timeLeft]);

  const handleCutWire = (idx: number, isCorrect: boolean) => {
    if (cutWires.includes(idx) || mod1Done) return;
    setCutWires((prev) => [...prev, idx]);
    spawnSparks(135, 110, isCorrect ? '#34d399' : '#f43f5e');

    if (isCorrect) {
      soundEngine.playShieldBreak();
      setMod1Done(true);
      setStatusMsg('✅ MODÜL 1 DEVRE DIŞI! "Ubiquitous = Omnipresent" mavi fiber kablosu başarıyla kesildi!');
    } else {
      soundEngine.playWrongBuzz();
      setTimeLeft((t) => Math.max(0, +(t - 6.0).toFixed(1)));
      setStatusMsg('⚠️ YANLIŞ KABLO! Kısa devre nedeniyle süreden -6.0 saniye kaybedildi!');
    }
  };

  const handleLockFreq = () => {
    if (freqVal === 2) {
      soundEngine.playShieldBreak();
      spawnSparks(360, 110, '#34d399');
      setMod2Done(true);
      setStatusMsg('✅ MODÜL 2 KİLİTLENDİ! f\'(x) = 3x² - 12 = 0 denkleminin pozitif kökü x = 2 ile dalga eşleşti!');
    } else {
      soundEngine.playWrongBuzz();
      setTimeLeft((t) => Math.max(0, +(t - 4.0).toFixed(1)));
      setStatusMsg('❌ FREKANS UYUMSUZ! 3x² - 12 = 0 denkleminin pozitif kökünü bul ve sürgüyü o sayıya getir!');
    }
  };

  const handleFinalCode = (isCorrect: boolean) => {
    if (isCorrect) {
      soundEngine.playShieldBreak();
      spawnSparks(250, 110, '#fbbf24');
      setMod3Done(true);
    } else {
      soundEngine.playWrongBuzz();
      setTimeLeft((t) => Math.max(0, +(t - 5.0).toFixed(1)));
      setStatusMsg('❌ YANLIŞ ŞİFRE! Süreden -5.0 saniye eksildi!');
    }
  };

  const resetSpike = () => {
    setTimeLeft(45.0);
    setMod1Done(false);
    setMod2Done(false);
    setMod3Done(false);
    setCutWires([]);
    setFreqVal(5);
    setStatusMsg('💣 Yeni Spike Kuruldu! 3 modülü çözerek imha et!');
  };

  const wires = [
    { color: 'bg-rose-600 border-rose-400', label: 'KIRMIZI KABLO: Ephemeral (Kısa ömürlü)', ok: false },
    { color: 'bg-sky-600 border-sky-400', label: 'MAVİ KABLO: Omnipresent (Her yerde bulunan)', ok: true },
    { color: 'bg-amber-500 border-amber-300', label: 'SARI KABLO: Obsolete (Modası geçmiş)', ok: false },
    { color: 'bg-purple-600 border-purple-400', label: 'MOR KABLO: Redundant (Gereksiz tekrar)', ok: false },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToRoom}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Odaya Dön
          </button>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              Mod 5: Spike Defuse — Valorant Tarzı Yüksek Gerilimli Sınav İmha Kokpiti
            </h2>
            <p className="text-xs text-slate-400">
              Saniyeler geri sayarken 3 güvenlik modülünü YKS & BUEPT şifreleriyle devre dışı bırak ve <strong>CLUTCH DEFUSE</strong> yap!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-1.5 rounded-xl font-mono text-base font-black border ${
              allDefused
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : timeLeft < 15
                ? 'bg-rose-600 text-white border-rose-300 animate-pulse'
                : 'bg-slate-950 border-rose-500/50 text-rose-400'
            }`}
          >
            ⏱️ {timeLeft.toFixed(1)}s
          </div>
          <button
            onClick={resetSpike}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Sıfırla
          </button>
        </div>
      </div>

      {/* Top Reactor & Oscilloscope Visual Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-900/95 border border-slate-800 rounded-2xl p-4">
        <div className="lg:col-span-6 rounded-xl overflow-hidden border border-slate-700">
          <canvas
            ref={canvasRef}
            width={520}
            height={215}
            className="w-full h-[210px] block bg-slate-950"
          />
        </div>

        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                 mod1Done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Modül 1: {mod1Done ? '✓ ÇÖZÜLDÜ' : 'BEKLİYOR'}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                mod2Done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Modül 2: {mod2Done ? '✓ ÇÖZÜLDÜ' : 'BEKLİYOR'}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                mod3Done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Modül 3: {mod3Done ? '✓ ÇÖZÜLDÜ' : 'BEKLİYOR'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-bold text-slate-100">
            {statusMsg}
          </div>

          <button
            onClick={() => {
              setMod1Done(true);
              setMod2Done(true);
              setMod3Done(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold transition"
          >
            ⚡ Hızlı İmha (Jüri Demo Testi)
          </button>
        </div>
      </div>

      {/* 3 Interactive Defusal Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* MODULE 1: Fiber Wire Cutting */}
        <div
          className={`rounded-2xl p-4 border-2 space-y-3 transition ${
            mod1Done
              ? 'bg-emerald-950/20 border-emerald-500/50'
              : 'bg-slate-900/95 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-sky-400 uppercase flex items-center gap-1">
              <Scissors className="w-4 h-4" /> MODÜL 1: FİBER KABLO KESİCİ
            </span>
            {mod1Done && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <p className="text-xs text-slate-300 font-medium">
            <strong>BUEPT Şifresi:</strong> <em>&quot;Ubiquitous&quot;</em> kelimesinin eş anlamlısını taşıyan kabloyu kes!
          </p>
          <div className="space-y-2">
            {wires.map((w, idx) => {
              const isCut = cutWires.includes(idx);
              return (
                <button
                  key={idx}
                  disabled={isCut || mod1Done}
                  onClick={() => handleCutWire(idx, w.ok)}
                  className={`w-full py-2.5 px-3 rounded-xl border-2 text-xs font-extrabold text-white flex items-center justify-between transition ${
                    isCut
                      ? 'opacity-30 line-through bg-slate-950 border-slate-800'
                      : `${w.color} hover:opacity-90 shadow`
                  }`}
                >
                  <span>{w.label}</span>
                  <span>✂️ KES</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MODULE 2: Oscilloscope Derivative Tuner */}
        <div
          className={`rounded-2xl p-4 border-2 space-y-3 flex flex-col justify-between transition ${
            mod2Done
              ? 'bg-emerald-950/20 border-emerald-500/50'
              : 'bg-slate-900/95 border-slate-800'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-400 uppercase flex items-center gap-1">
                <Zap className="w-4 h-4" /> MODÜL 2: OSİLOSKOP FREKANS AYARI
              </span>
              {mod2Done && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="text-xs text-slate-300 font-medium">
              <strong>AYT Türev Şifresi:</strong> <code className="text-amber-300">f(x) = x³ - 12x</code> fonksiyonunun pozitif yerel ekstremum apsisini (<code className="text-amber-300">f&apos;(x) = 3x² - 12 = 0</code>) bul ve frekans sürgüsünü o değere kilitle!
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-400">Frekans Sürgüsü (x):</span>
              <span className="text-cyan-400 text-sm font-black">x = {freqVal} kHz</span>
            </div>
            <input
              type="range"
              min={1}
              max={6}
              step={1}
              disabled={mod2Done}
              value={freqVal}
              onChange={(e) => setFreqVal(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 font-mono">
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
            </div>
          </div>

          <button
            disabled={mod2Done}
            onClick={handleLockFreq}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs transition"
          >
            ⚡ FREKANSI KİLİTLE (DALGAYI EŞLEŞTİR)
          </button>
        </div>

        {/* MODULE 3: Final Cryptographic Keypad */}
        <div
          className={`rounded-2xl p-4 border-2 space-y-3 flex flex-col justify-between transition ${
            mod3Done
              ? 'bg-emerald-950/20 border-emerald-500/50'
              : 'bg-slate-900/95 border-slate-800'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-pink-400 uppercase flex items-center gap-1">
                <ShieldAlert className="w-4 h-4" /> MODÜL 3: KRİPTOGRAFİK SON KİLİT
              </span>
              {mod3Done && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="text-xs text-slate-300 font-medium">
              <strong>Son İmha Anahtarı:</strong> TYT Fizik&apos;te bir devrede direnç sabitken gerilim (V) 2 katına çıkarsa akım şiddeti (I = V/R) ne olur?
            </p>
          </div>

          <div className="space-y-2">
            <button
              disabled={mod3Done}
              onClick={() => handleFinalCode(false)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-pink-500 text-xs font-bold text-left text-white transition"
            >
              A) Yarıya düşer (I / 2)
            </button>
            <button
              disabled={mod3Done}
              onClick={() => handleFinalCode(true)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-400 text-xs font-bold text-left text-white transition"
            >
              B) 2 katına çıkar (2I — Ohm Yasası)
            </button>
            <button
              disabled={mod3Done}
              onClick={() => handleFinalCode(false)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-pink-500 text-xs font-bold text-left text-white transition"
            >
              C) Değişmez (Sabit kalır)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
