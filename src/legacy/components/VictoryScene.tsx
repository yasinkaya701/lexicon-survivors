'use client';

import React, { useEffect, useRef } from 'react';
import { soundEngine } from '@/lib/sound';
import { Award, RotateCcw, Sparkles, Trophy, Home } from 'lucide-react';

interface VictorySceneProps {
  netScore: number;
  rankLp: number;
  mental: number;
  onRestart: () => void;
}

export const VictoryScene: React.FC<VictorySceneProps> = ({
  netScore,
  rankLp,
  mental,
  onRestart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    soundEngine.playVictoryFanfare();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const fireworks: { x: number; y: number; vx: number; vy: number; color: string; life: number }[] = [];

    const spawnFirework = () => {
      const cx = 120 + Math.random() * 680;
      const cy = 40 + Math.random() * 110;
      const colors = ['#38bdf8', '#f43f5e', '#fbbf24', '#34d399', '#a855f7'];
      const col = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 28; i++) {
        const ang = (Math.PI * 2 * i) / 28;
        const spd = 1 + Math.random() * 3.5;
        fireworks.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          color: col,
          life: 45 + Math.random() * 20,
        });
      }
    };

    spawnFirework();
    const fwTimer = setInterval(spawnFirework, 900);

    const render = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#090d1e');
      sky.addColorStop(0.65, '#1e1b4b');
      sky.addColorStop(0.651, '#064e3b');
      sky.addColorStop(1, '#022c22');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Iconic Boğaziçi South Campus (Albert Long Hall Clock Tower & Stone Facade)
      ctx.fillStyle = '#334155';
      ctx.fillRect(310, 95, 300, 105);
      // Clock Tower
      ctx.fillStyle = '#475569';
      ctx.fillRect(425, 42, 70, 158);
      // Roof spire
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(420, 42);
      ctx.lineTo(460, 14);
      ctx.lineTo(500, 42);
      ctx.closePath();
      ctx.fill();

      // Clock Face
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(460, 72, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Glowing Arched Windows
      ctx.fillStyle = '#fde047';
      for (let wx = 330; wx <= 570; wx += 45) {
        if (wx >= 425 && wx <= 480) continue;
        ctx.fillRect(wx, 125, 22, 38);
      }

      // Banner on Albert Long Hall
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(365, 112, 190, 26);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(365, 112, 190, 26);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('🎓 BOĞAZİÇİ GÜNEY KAMPÜS', 376, 129);

      // Celebrating Students on South Campus Lawn (Güney Çimler)
      const jump = Math.abs(Math.sin(time * 0.008)) * 14;
      ctx.font = '28px sans-serif';
      ctx.fillText('🧑‍🎓', 380, 235 - jump);
      ctx.fillText('👩‍🎓', 450, 238 - jump * 0.8);
      ctx.fillText('🐕', 520, 240); // Iconic Boğaziçi campus dog!

      // Fireworks
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const f = fireworks[i];
        f.x += f.vx;
        f.y += f.vy;
        f.vy += 0.04;
        f.life--;
        ctx.fillStyle = f.color;
        ctx.globalAlpha = Math.max(0, f.life / 55);
        ctx.beginPath();
        ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (f.life <= 0) fireworks.splice(i, 1);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      clearInterval(fwTimer);
    };
  }, []);

  return (
    <div className="bg-slate-900/95 border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl space-y-5 text-center max-w-4xl mx-auto">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-extrabold">
        <Trophy className="w-4 h-4" /> KARİYER ZAFERİ: MEZUNA KALMADIN & KİLYOS&apos;TAN KURTULDUN!
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
        🎉 Boğaziçi Üniversitesi Güney Kampüs&apos;e Hoş Geldin!
      </h1>
      <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto">
        Hem <strong>YKS (TYT/AYT)</strong> stres simülasyonunu hem de <strong>Kilyos Sarıtepe BUEPT</strong> akademik İngilizce sınavını taktiksel turlama, kanıt avcılığı ve soğukkanlı nabız yönetimiyle tamamladın!
      </p>

      <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-inner">
        <canvas
          ref={canvasRef}
          width={920}
          height={270}
          className="w-full h-[250px] block bg-slate-950"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="text-xs text-slate-400">Final Sınav & BUEPT Skoru</div>
          <div className="text-xl font-extrabold text-indigo-400 mt-1">{netScore.toFixed(1)} Net (A Kur)</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="text-xs text-slate-400">Kampüs Royale Lig Puanı</div>
          <div className="text-xl font-extrabold text-amber-400 mt-1">🏆 {rankLp} LP (Radyant)</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="text-xs text-slate-400">Korunan Akıl Sağlığı</div>
          <div className="text-xl font-extrabold text-emerald-400 mt-1">🧠 %{mental} Sağlam</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={onRestart}
          data-testid="legacy-return-to-main-menu"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition cursor-pointer"
        >
          <Home className="w-4 h-4" />
          Ana Menüye Dön
        </button>
      </div>
    </div>
  );
};
