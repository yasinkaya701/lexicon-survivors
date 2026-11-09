'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CampaignAct, RoomUpgrades } from '@/types/game';
import { soundEngine } from '@/lib/sound';
import { Swords, BookOpen, Coffee, Monitor, Flame, Armchair, Tablet, BrainCircuit, Sparkles } from 'lucide-react';

interface RoomSimulatorProps {
  act: CampaignAct;
  week: number;
  netScore: number;
  mental: number;
  energy: number;
  money: number;
  rankLp: number;
  upgrades: RoomUpgrades;
  mistakeCount: number;
  onAction: (action: 'study' | 'chill' | 'tutor' | 'drill') => void;
  onBuyUpgrade: (key: keyof RoomUpgrades, cost: number) => void;
  onStartBattle: (forceShield?: boolean) => void;
  onOpenTelemetry: () => void;
  onSwitchAct: (act: CampaignAct) => void;
}

interface FloatPopup {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export const RoomSimulator: React.FC<RoomSimulatorProps> = ({
  act,
  week,
  netScore,
  mental,
  energy,
  money,
  rankLp,
  upgrades,
  mistakeCount,
  onAction,
  onBuyUpgrade,
  onStartBattle,
  onOpenTelemetry,
  onSwitchAct,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const popupsRef = useRef<FloatPopup[]>([]);
  const [statusLog, setStatusLog] = useState<string>(
    act === 'yks'
      ? '🏠 YKS Maratonu: Odanı geliştir, akıl sağlığını koru ve Türkiye Geneli Deneme Boss\'unu devirerek Boğaziçi\'ni kazan!'
      : '🌧️ Kilyos Sarıtepe Yurdu: Dışarıda Karadeniz fırtınası var! Akademik kelimeleri kuşan ve BUEPT Boss\'unu yenerek Güney Kampüs\'e geç!'
  );

  useEffect(() => {
    setStatusLog(
      act === 'yks'
        ? '🏠 1. Perde (YKS Ev Odası): Netlerini 105+ seviyesine çıkar ve ÖSYM Boss Savaşı\'nı kazanarak Boğaziçi Üniversitesi\'ne yerleş!'
        : '🌧️ 2. Perde (Boğaziçi Kilyos Yurdu): Kilyos rüzgarına karşı diren! BUEPT Akademik İngilizce Boss\'unu devirip Güney Kampüs\'e geçiş yap!'
    );
    soundEngine.setKilyosStormAmbient(act === 'buept');
    return () => {
      soundEngine.setKilyosStormAmbient(false);
    };
  }, [act]);

  const addPopup = (text: string, color: string) => {
    popupsRef.current.push({
      id: Date.now() + Math.random(),
      x: 240 + (Math.random() * 140 - 70),
      y: 155,
      text,
      color,
      life: 55,
    });
  };

  const handleCareerAction = (type: 'study' | 'chill' | 'tutor' | 'drill') => {
    if (type === 'study') {
      soundEngine.playComboUp(2);
      const mult = upgrades.rgbSetup ? 1.5 : 1;
      addPopup(`+${(5 * mult).toFixed(1)} NET!`, '#818cf8');
      addPopup('-14 MENTAL', '#fb7185');
      setStatusLog('📚 Gece kütüphanede/masada sabahlandı! Netlerin yükseldi ama uykusuzluktan akıl sağlığın biraz yıprandı.');
    } else if (type === 'chill') {
      soundEngine.playCashRegister();
      addPopup('+24 MENTAL', '#34d399');
      addPopup('+25 ENERJİ', '#fbbf24');
      setStatusLog(
        act === 'yks'
          ? '🎸 Arkadaşlarla sahilde çay & müzik molası verdin. Akıl sağlığın ve enerjin tazelendi!'
          : '☕ Kilyos kantininde sıcak kahve ve dost muhabbeti! Fırtınaya karşı moralin yerine geldi.'
      );
    } else if (type === 'tutor') {
      soundEngine.playCashRegister();
      addPopup('+₺450 BURS/DERS', '#38bdf8');
      addPopup('+2.5 NET', '#a855f7');
      setStatusLog('💸 Derece öğrencisi taktikleriyle soru çözümü yaptın: Hem bütçen hem netin arttı!');
    }
    onAction(type);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const rainDrops = Array.from({ length: 48 }, () => ({
      x: 45 + Math.random() * 195,
      y: 30 + Math.random() * 125,
      speed: 3.5 + Math.random() * 3,
      len: 8 + Math.random() * 7,
    }));

    const stars = Array.from({ length: 24 }, () => ({
      x: 50 + Math.random() * 185,
      y: 35 + Math.random() * 80,
      r: 1 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    }));

    const render = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;

      // Room Wall & Floor Gradient
      const wallGrad = ctx.createLinearGradient(0, 0, 0, h);
      if (act === 'yks') {
        wallGrad.addColorStop(0, '#0f172a');
        wallGrad.addColorStop(0.72, '#1e1b4b');
        wallGrad.addColorStop(0.721, '#111827');
        wallGrad.addColorStop(1, '#090d16');
      } else {
        // Kilyos Dorm colder stormy tone
        wallGrad.addColorStop(0, '#081420');
        wallGrad.addColorStop(0.72, '#0f293a');
        wallGrad.addColorStop(0.721, '#111827');
        wallGrad.addColorStop(1, '#060a10');
      }
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, w, h);

      // Periodic lightning flash in Kilyos Act 2
      const isLightning = act === 'buept' && (Math.floor(time / 120) % 45 === 0);

      // Window Frame (Left Side)
      ctx.save();
      ctx.beginPath();
      ctx.rect(45, 28, 200, 130);
      ctx.clip();

      // Sky inside window
      ctx.fillStyle = isLightning ? '#cbd5e1' : act === 'yks' ? '#090d1e' : '#06121c';
      ctx.fillRect(45, 28, 200, 130);

      if (act === 'yks') {
        // Stars & Moon over Bosphorus
        stars.forEach((s) => {
          const alpha = 0.4 + 0.6 * Math.sin(time * 0.004 + s.phase);
          ctx.fillStyle = `rgba(254, 240, 138, ${alpha})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        });
        // Crescent Moon
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(210, 58, 15, 0, Math.PI * 2);
        ctx.fill();

        // Bosphorus Bridge Silhouette
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(50, 135);
        ctx.quadraticCurveTo(145, 95, 240, 135);
        ctx.stroke();
        // Bridge Towers
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(92, 96, 5, 55);
        ctx.fillRect(192, 96, 5, 55);
        ctx.fillStyle = 'rgba(14, 165, 233, 0.25)';
        ctx.fillRect(45, 138, 200, 22);
      } else {
        // Kilyos Black Sea Waves & Slanted Rain Storm
        ctx.fillStyle = '#0c4a6e';
        ctx.fillRect(45, 132, 200, 28);
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)';
        ctx.lineWidth = 1.5;
        rainDrops.forEach((d) => {
          d.y += d.speed;
          d.x -= d.speed * 0.35;
          if (d.y > 158) {
            d.y = 28;
            d.x = 55 + Math.random() * 195;
          }
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - 4, d.y + d.len);
          ctx.stroke();
        });
      }
      ctx.restore();

      // Window Border & Sill
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 5;
      ctx.strokeRect(45, 28, 200, 130);
      ctx.beginPath();
      ctx.moveTo(145, 28);
      ctx.lineTo(145, 158);
      ctx.stroke();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(38, 156, 214, 10);
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(act === 'yks' ? '🌉 Boğaziçi Köprüsü Manzarası' : '🌩️ Kilyos Sarıtepe Fırtınası', 56, 150);

      // Kilyos Heater Upgrade (Under window)
      if (upgrades.kilyosHeater) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(65, 178, 150, 48);
        for (let gx = 75; gx < 205; gx += 16) {
          ctx.fillStyle = '#f97316';
          ctx.fillRect(gx, 184, 8, 36);
        }
        ctx.fillStyle = '#fdba74';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('🔥 KİLYOS RADYATÖR AKTİF', 74, 238);
      }

      // Motivational Poster & Sticky Notes (Right Wall)
      ctx.fillStyle = act === 'yks' ? '#312e81' : '#064e3b';
      ctx.fillRect(465, 32, 185, 76);
      ctx.strokeStyle = act === 'yks' ? '#818cf8' : '#34d399';
      ctx.lineWidth = 2;
      ctx.strokeRect(465, 32, 185, 76);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(act === 'yks' ? '🎯 HEDEF: BOĞAZİÇİ' : '🎓 HEDEF: GÜNEY KAMPÜS', 478, 56);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(act === 'yks' ? 'Mezuna Kalmak Yok! Bas Gaza!' : 'BUEPT Vocab: Mitigate / Albeit', 478, 78);
      ctx.fillText(`Mevcut Seviye: ${netScore.toFixed(1)} Net`, 478, 96);

      // Sticky Notes on wall
      const notes = [
        { x: 395, y: 40, color: '#fef08a', label: 'TURLA!' },
        { x: 395, y: 80, color: '#f472b6', label: 'BUEPT' },
      ];
      notes.forEach((n) => {
        ctx.fillStyle = n.color;
        ctx.fillRect(n.x, n.y, 52, 32);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(n.label, n.x + 6, n.y + 20);
      });

      // Ergonomic Gaming Chair Upgrade (Behind Student)
      if (upgrades.ergonomicChair) {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.roundRect(245, 138, 62, 115, 14);
        ctx.fill();
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Desk Surface & Legs
      ctx.fillStyle = '#475569';
      ctx.fillRect(215, 228, 410, 18);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(235, 246, 20, 85);
      ctx.fillRect(585, 246, 20, 85);

      // Monitor Setup (Standard vs Dual RGB Setup)
      if (upgrades.rgbSetup) {
        const hue = (time * 0.08) % 360;
        ctx.save();
        ctx.shadowColor = `hsl(${hue}, 90%, 60%)`;
        ctx.shadowBlur = 22;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(320, 152, 95, 62);
        ctx.fillRect(425, 152, 95, 62);
        ctx.strokeStyle = `hsl(${hue}, 90%, 60%)`;
        ctx.lineWidth = 3;
        ctx.strokeRect(320, 152, 95, 62);
        ctx.strokeRect(425, 152, 95, 62);
        ctx.restore();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('⚡ 1.5x NET', 336, 182);
        ctx.fillStyle = '#f472b6';
        ctx.fillText('🧠 AI ANALİZ', 436, 182);
        // Monitor stands
        ctx.fillStyle = '#64748b';
        ctx.fillRect(360, 214, 16, 14);
        ctx.fillRect(465, 214, 16, 14);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(365, 158, 105, 58);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(365, 158, 105, 58);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(act === 'yks' ? 'YKS Kampı' : 'BUEPT Prep', 385, 190);
        ctx.fillStyle = '#475569';
        ctx.fillRect(410, 216, 16, 12);
      }

      // AI Tablet Upgrade on Desk
      if (upgrades.aiTablet) {
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(530, 194, 42, 32);
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.strokeRect(530, 194, 42, 32);
        ctx.fillStyle = '#e9d5ff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('AI 50/50', 532, 214);
      }

      // Espresso Machine Upgrade on Desk
      if (upgrades.espressoMachine) {
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(580, 174, 38, 54);
        ctx.fillStyle = '#fde047';
        ctx.font = '18px sans-serif';
        ctx.fillText('☕', 588, 208);
        const steamShift = Math.sin(time * 0.008) * 6;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(599 + steamShift, 162, 5, 0, Math.PI * 2);
        ctx.arc(595 - steamShift, 148, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Student Avatar at Desk
      const bob = Math.sin(time * 0.006) * 3.5;
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      ctx.arc(276, 192 + bob, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e0e7ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.font = '26px sans-serif';
      const faceEmoji = mental > 65 ? '😎' : mental > 35 ? '🧑‍💻' : '😵‍💫';
      ctx.fillText(faceEmoji, 260, 201 + bob);

      // Speech Bubble above Student
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(218, 106 + bob, 130, 32, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px sans-serif';
      const statusMood =
        mental < 35
          ? 'Akıl sağlığım eriyor!'
          : act === 'yks'
          ? 'Hedef İlk 1000!'
          : 'Kilyos çok soğuk!';
      ctx.fillText(statusMood, 228, 126 + bob);

      // Render Floating Popups
      for (let i = popupsRef.current.length - 1; i >= 0; i--) {
        const p = popupsRef.current[i];
        p.y -= 0.85;
        p.life--;
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
        if (p.life <= 0) {
          popupsRef.current.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [act, mental, netScore, upgrades]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left 7 Cols: Interactive 60 FPS Room Canvas & Campaign Switcher */}
      <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                {act === 'yks' ? '1. PERDE: YKS MARATONU' : '2. PERDE: BOĞAZİÇİ KİLYOS SÜRGÜNÜ'}
              </span>
              <span className="text-xs text-slate-400 font-semibold">Hafta {week} / 36</span>
            </div>
            <h2 className="text-lg font-extrabold text-white mt-1">
              {act === 'yks'
                ? '🏠 Öğrenci Çalışma Odası (Mezuna Kalma! Simülasyonu)'
                : '🌧️ Boğaziçi Sarıtepe (Kilyos) Yurt Odası — BUEPT Hazırlık'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSwitchAct('yks')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                act === 'yks'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              YKS Modu
            </button>
            <button
              onClick={() => onSwitchAct('buept')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                act === 'buept'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              BUEPT (Kilyos) Modu
            </button>
          </div>
        </div>

        <div className="relative rounded-xl overflow-hidden border border-slate-700/80 shadow-inner">
          <canvas
            ref={canvasRef}
            width={680}
            height={330}
            className="w-full h-[310px] sm:h-[340px] block bg-slate-950"
          />
          <div className="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md border border-slate-700/70 rounded-xl p-2.5 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-200 font-medium">{statusLog}</p>
            <button
              onClick={onOpenTelemetry}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 hover:bg-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <BrainCircuit className="w-4 h-4" />
              AI Koç ({mistakeCount} İntikam)
            </button>
          </div>
        </div>
      </div>

      {/* Right 5 Cols: Weekly Actions, Boss Launch & Equipment Upgrades */}
      <div className="lg:col-span-5 flex flex-col justify-between gap-4">
        {/* Boss Battle Call to Action */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-rose-950 border-2 border-indigo-500/60 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
              ⚔️ KAMPÜS ROYALE ARENA
            </span>
            <span className="text-xs font-bold text-amber-300">🏆 {rankLp} LP</span>
          </div>
          <h3 className="text-base font-extrabold text-white">
            {act === 'yks'
              ? 'Türkiye Geneli ÖSYM Deneme Boss Savaşına Gir!'
              : 'Kilyos BUEPT Proficiency Boss Savaşına Gir!'}
          </h3>
          <p className="text-xs text-slate-300">
            1v1 gerçek zamanlı kule savunma ve sınav kokpiti: Hızlı kombo yap, <strong>Turlama Tekniği</strong> ile nabzını koru ve Boss kalkanını <strong>Kanıt Avcısı</strong> ile parçala!
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onStartBattle(false)}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition"
            >
              <Swords className="w-4 h-4" />
              SAVAŞA BAŞLA (1v1)
            </button>
            <button
              onClick={() => onStartBattle(true)}
              className="py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Sparkles className="w-4 h-4" />
              Kalkan Kırma Modu
            </button>
          </div>
        </div>

        {/* Weekly Decisions ("Mezuna Kalma!" Loop) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
            📅 Haftalık Öğrenci Kararları (Simülasyon Döngüsü)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleCareerAction('study')}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:border-indigo-500 text-left transition"
            >
              <BookOpen className="w-4 h-4 text-indigo-400 mb-1" />
              <div className="text-xs font-bold text-white">Gece Sabahla</div>
              <div className="text-xs text-emerald-400 font-semibold">
                +{upgrades.rgbSetup ? '7.5' : '5.0'} Net
              </div>
              <div className="text-xs text-rose-400">-14 Mental</div>
            </button>

            <button
              onClick={() => handleCareerAction('chill')}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:border-emerald-500 text-left transition"
            >
              <Coffee className="w-4 h-4 text-emerald-400 mb-1" />
              <div className="text-xs font-bold text-white">Çimlerde Takıl</div>
              <div className="text-xs text-emerald-400 font-semibold">+24 Mental</div>
              <div className="text-xs text-amber-400">+25 Enerji</div>
            </button>

            <button
              onClick={() => handleCareerAction('tutor')}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:border-cyan-500 text-left transition"
            >
              <Sparkles className="w-4 h-4 text-cyan-400 mb-1" />
              <div className="text-xs font-bold text-white">Soru Kampı</div>
              <div className="text-xs text-cyan-400 font-semibold">+₺450 Burs</div>
              <div className="text-xs text-indigo-400">+2.5 Net</div>
            </button>
          </div>
        </div>

        {/* Room Tycoon Upgrades */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
              🛒 Oda & Ekipman Mağazası (Görsel Odaya Eklenir!)
            </span>
            <span className="text-xs font-extrabold text-cyan-400">Bütçe: ₺{money}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={upgrades.rgbSetup}
              onClick={() => onBuyUpgrade('rgbSetup', 600)}
              className={`p-2.5 rounded-xl border text-left transition ${
                upgrades.rgbSetup
                  ? 'border-emerald-500/40 bg-emerald-950/20 opacity-75'
                  : 'border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <Monitor className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-purple-300">
                  {upgrades.rgbSetup ? '✓ KURULDU' : '₺600'}
                </span>
              </div>
              <div className="text-xs font-bold text-white mt-1">Çift Ekran RGB Setup</div>
              <div className="text-xs text-slate-400">1.5x Net & Savaş Hasarı</div>
            </button>

            <button
              disabled={upgrades.espressoMachine}
              onClick={() => onBuyUpgrade('espressoMachine', 400)}
              className={`p-2.5 rounded-xl border text-left transition ${
                upgrades.espressoMachine
                  ? 'border-emerald-500/40 bg-emerald-950/20 opacity-75'
                  : 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <Coffee className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">
                  {upgrades.espressoMachine ? '✓ KURULDU' : '₺400'}
                </span>
              </div>
              <div className="text-xs font-bold text-white mt-1">Espresso Makinesi</div>
              <div className="text-xs text-slate-400">Başlangıç İksiri +3 Mana</div>
            </button>

            <button
              disabled={upgrades.kilyosHeater}
              onClick={() => onBuyUpgrade('kilyosHeater', 450)}
              className={`p-2.5 rounded-xl border text-left transition ${
                upgrades.kilyosHeater
                  ? 'border-emerald-500/40 bg-emerald-950/20 opacity-75'
                  : 'border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-orange-300">
                  {upgrades.kilyosHeater ? '✓ KURULDU' : '₺450'}
                </span>
              </div>
              <div className="text-xs font-bold text-white mt-1">Kilyos Radyatörü</div>
              <div className="text-xs text-slate-400">Fırtınada Mental Koruma</div>
            </button>

            <button
              disabled={upgrades.ergonomicChair && upgrades.aiTablet}
              onClick={() => {
                if (!upgrades.ergonomicChair) onBuyUpgrade('ergonomicChair', 500);
                else onBuyUpgrade('aiTablet', 500);
              }}
              className={`p-2.5 rounded-xl border text-left transition ${
                upgrades.ergonomicChair && upgrades.aiTablet
                  ? 'border-emerald-500/40 bg-emerald-950/20 opacity-75'
                  : 'border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20'
              }`}
            >
              <div className="flex items-center justify-between">
                {upgrades.ergonomicChair ? (
                  <Tablet className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Armchair className="w-4 h-4 text-cyan-400" />
                )}
                <span className="text-xs font-bold text-cyan-300">
                  {upgrades.ergonomicChair && upgrades.aiTablet ? '✓ KURULDU' : '₺500'}
                </span>
              </div>
              <div className="text-xs font-bold text-white mt-1">
                {upgrades.ergonomicChair ? 'Boğaziçi AI Tablet' : 'Oyuncu Koltuğu'}
              </div>
              <div className="text-xs text-slate-400">
                {upgrades.ergonomicChair ? 'Ücretsiz 50/50 Şık Eleme' : 'Sınav Stresini (BPM) Azaltır'}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
