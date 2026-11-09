'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CampaignAct, TacticalQuestion } from '@/types/game';
import { BUEPT_QUESTIONS, YKS_QUESTIONS } from '@/data/questions';
import { soundEngine } from '@/lib/sound';
import { ArrowLeft, Flame, Shield, Sparkles, Zap } from 'lucide-react';

interface SurvivorsArenaProps {
  act: CampaignAct;
  onScoreGain: (netDelta: number, lpDelta: number) => void;
  onRecordMistake: (q: TacticalQuestion, status: 'wrong' | 'skipped') => void;
  onBackToRoom: () => void;
}

interface Mob {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  label: string;
  color: string;
  isBoss?: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  dmg: number;
  enemy?: boolean;
}

interface Gem {
  x: number;
  y: number;
  val: number;
}

interface NovaRing {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
}

interface FloatDmg {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export const SurvivorsArena: React.FC<SurvivorsArenaProps> = ({
  act,
  onScoreGain,
  onRecordMistake,
  onBackToRoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const deck = act === 'yks' ? YKS_QUESTIONS : BUEPT_QUESTIONS;

  const [level, setLevel] = useState<number>(1);
  const [weaponTier, setWeaponTier] = useState<number>(1);
  const [kills, setKills] = useState<number>(0);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [bulletTimeOpen, setBulletTimeOpen] = useState<boolean>(false);
  const [qIndex, setQIndex] = useState<number>(0);

  const stateRef = useRef({
    px: 460,
    py: 190,
    targetX: 460,
    targetY: 190,
    dashCooldown: 0,
    dashTrail: [] as { x: number; y: number; alpha: number }[],
    xp: 25,
    paused: false,
    shake: 0,
    weaponTier: 1,
    mobs: [] as Mob[],
    bullets: [] as Bullet[],
    gems: [] as Gem[],
    novas: [] as NovaRing[],
    floats: [] as FloatDmg[],
    keys: {} as Record<string, boolean>,
  });

  useEffect(() => {
    stateRef.current.weaponTier = weaponTier;
  }, [weaponTier]);

  const currentQ = deck.filter((q) => q.type === 'multiple_choice')[qIndex % 4] || deck[0];

  const openEvolutionGate = () => {
    stateRef.current.paused = true;
    soundEngine.playComboUp(3);
    setBulletTimeOpen(true);
  };

  const triggerDash = () => {
    const s = stateRef.current;
    if (s.dashCooldown > 0) return;
    soundEngine.playHit();
    s.dashCooldown = 45;
    const ang = Math.atan2(s.targetY - s.py, s.targetX - s.px);
    for (let i = 1; i <= 5; i++) {
      s.dashTrail.push({
        x: s.px + Math.cos(ang) * (i * 16),
        y: s.py + Math.sin(ang) * (i * 16),
        alpha: 0.8,
      });
    }
    s.px = Math.max(30, Math.min(890, s.px + Math.cos(ang) * 95));
    s.py = Math.max(30, Math.min(350, s.py + Math.sin(ang) * 95));
    s.novas.push({ x: s.px, y: s.py, r: 8, maxR: 85, color: '#38bdf8' });
  };

  const handleCardPick = (idx: number) => {
    const isCorrect = idx === currentQ.correctIndex;
    const s = stateRef.current;
    setBulletTimeOpen(false);
    s.paused = false;
    setQIndex((prev) => prev + 1);

    if (isCorrect) {
      soundEngine.playOrbitalLaser();
      const nextTier = Math.min(4, weaponTier + 1);
      setWeaponTier(nextTier);
      setLevel((l) => l + 1);
      onScoreGain(4.0, 45);
      s.shake = 16;
      s.novas.push({ x: s.px, y: s.py, r: 15, maxR: 460, color: '#ec4899' });
      // Damage/Wipe mobs on screen
      s.mobs.forEach((m) => {
        m.hp -= 12;
        s.floats.push({ x: m.x, y: m.y, text: '⚡ NOVA -120!', color: '#f472b6', life: 40 });
      });
    } else {
      soundEngine.playWrongBuzz();
      onRecordMistake(currentQ, 'wrong');
      s.shake = 10;
      s.floats.push({
        x: s.px,
        y: s.py - 20,
        text: '❌ SİLAH TUTUKLUK YAPTI! DODGE AT!',
        color: '#fb7185',
        life: 50,
      });
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = true;
      if (e.code === 'Space' && !stateRef.current.paused) {
        e.preventDefault();
        triggerDash();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Periodic Mob Spawner & Auto-Fire Loop
  useEffect(() => {
    const labelsYks = ['Paragraf Tuzağı', 'İşlem Hatası', 'Uykusuzluk', 'Stres Dalga', 'Zaman Kaybı'];
    const labelsBuept = ['False Friend', 'Kilyos Fırtınası', 'Uzun Reading', 'Kelime Unutuşu', 'Listening Hızı'];

    const timer = setInterval(() => {
      const s = stateRef.current;
      if (s.paused) return;

      // Spawn normal mobs
      if (s.mobs.length < 20) {
        const labels = act === 'yks' ? labelsYks : labelsBuept;
        const side = Math.floor(Math.random() * 4);
        let x = 20;
        let y = 20;
        if (side === 0) { x = 15; y = Math.random() * 360; }
        else if (side === 1) { x = 905; y = Math.random() * 360; }
        else if (side === 2) { x = Math.random() * 900; y = 15; }
        else { x = Math.random() * 900; y = 365; }

        const isBoss = Math.random() < 0.12 && !s.mobs.some((m) => m.isBoss);
        s.mobs.push({
          id: Date.now() + Math.random(),
          x,
          y,
          hp: isBoss ? 18 : 3,
          maxHp: isBoss ? 18 : 3,
          speed: isBoss ? 0.68 : 1.15 + Math.random() * 0.45,
          radius: isBoss ? 24 : 13,
          label: isBoss ? (act === 'yks' ? '👹 ÖSYM BOSS' : '👹 BUEPT BOSS') : labels[Math.floor(Math.random() * labels.length)],
          color: isBoss ? '#f59e0b' : '#e11d48',
          isBoss,
        });
      }

      // Auto-fire weapon toward nearest mob
      if (s.mobs.length > 0) {
        let nearest = s.mobs[0];
        let minDist = 99999;
        s.mobs.forEach((m) => {
          const d = Math.hypot(m.x - s.px, m.y - s.py);
          if (d < minDist) {
            minDist = d;
            nearest = m;
          }
        });

        const baseAng = Math.atan2(nearest.y - s.py, nearest.x - s.px);
        const spreads =
          s.weaponTier === 1
            ? [0]
            : s.weaponTier === 2
            ? [-0.18, 0, 0.18]
            : [-0.32, -0.15, 0, 0.15, 0.32];

        spreads.forEach((sp) => {
          s.bullets.push({
            x: s.px,
            y: s.py,
            vx: Math.cos(baseAng + sp) * 7.8,
            vy: Math.sin(baseAng + sp) * 7.8,
            color: s.weaponTier >= 3 ? '#ec4899' : '#38bdf8',
            dmg: s.weaponTier >= 4 ? 2.5 : 1.4,
          });
        });
      }
    }, 380);

    return () => clearInterval(timer);
  }, [act]);

  // 60 FPS Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = (time: number) => {
      const s = stateRef.current;
      ctx.save();

      if (s.shake > 0) {
        ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
        s.shake *= 0.85;
        if (s.shake < 0.5) s.shake = 0;
      }

      // Arena Cyber Background
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, 920, 380);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
      for (let x = 0; x < 920; x += 44) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 380); ctx.stroke();
      }
      for (let y = 0; y < 380; y += 44) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(920, y); ctx.stroke();
      }

      if (!s.paused) {
        if (s.dashCooldown > 0) s.dashCooldown--;

        let keyMoved = false;
        const spd = 3.8;
        if (s.keys['w'] || s.keys['arrowup']) { s.py -= spd; keyMoved = true; }
        if (s.keys['s'] || s.keys['arrowdown']) { s.py += spd; keyMoved = true; }
        if (s.keys['a'] || s.keys['arrowleft']) { s.px -= spd; keyMoved = true; }
        if (s.keys['d'] || s.keys['arrowright']) { s.px += spd; keyMoved = true; }

        if (!keyMoved) {
          s.px += (s.targetX - s.px) * 0.085;
          s.py += (s.targetY - s.py) * 0.085;
        }
        s.px = Math.max(24, Math.min(896, s.px));
        s.py = Math.max(32, Math.min(356, s.py));
      }

      // Dash Afterimage Trail
      for (let i = s.dashTrail.length - 1; i >= 0; i--) {
        const dt = s.dashTrail[i];
        dt.alpha -= 0.05;
        ctx.fillStyle = `rgba(56, 189, 248, ${Math.max(0, dt.alpha)})`;
        ctx.beginPath();
        ctx.arc(dt.x, dt.y, 13, 0, Math.PI * 2);
        ctx.fill();
        if (dt.alpha <= 0) s.dashTrail.splice(i, 1);
      }

      // Orbiting Derivative Blades (Unlocked at Weapon Tier >= 2)
      const bladeCount = s.weaponTier >= 3 ? 3 : s.weaponTier >= 2 ? 2 : 1;
      const orbitR = 46;
      for (let b = 0; b < bladeCount; b++) {
        const ang = time * 0.005 + (Math.PI * 2 * b) / bladeCount;
        const bx = s.px + Math.cos(ang) * orbitR;
        const by = s.py + Math.sin(ang) * orbitR;
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f3e8ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Check blade hit on mobs
        if (!s.paused) {
          s.mobs.forEach((m) => {
            if (Math.hypot(m.x - bx, m.y - by) < m.radius + 9) {
              m.hp -= 0.18;
            }
          });
        }
      }

      // Nova Shockwave Rings
      for (let i = s.novas.length - 1; i >= 0; i--) {
        const n = s.novas[i];
        n.r += 15;
        ctx.strokeStyle = n.color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.stroke();
        if (n.r >= n.maxR) s.novas.splice(i, 1);
      }

      // XP Gems (Magnetized toward player)
      for (let i = s.gems.length - 1; i >= 0; i--) {
        const g = s.gems[i];
        const dist = Math.hypot(s.px - g.x, s.py - g.y);
        if (!s.paused && dist < 130) {
          g.x += ((s.px - g.x) / dist) * 5.2;
          g.y += ((s.py - g.y) / dist) * 5.2;
        }
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(g.x, g.y, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (!s.paused && dist < 24) {
          s.gems.splice(i, 1);
          soundEngine.playHit();
          s.xp += g.val;
          if (s.xp >= 100) {
            s.xp = 0;
            openEvolutionGate();
          }
        }
      }

      // Bullets
      for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i];
        if (!s.paused) {
          b.x += b.vx;
          b.y += b.vy;
        }
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        if (b.x < 0 || b.x > 920 || b.y < 0 || b.y > 380) {
          s.bullets.splice(i, 1);
          continue;
        }

        for (let j = s.mobs.length - 1; j >= 0; j--) {
          const m = s.mobs[j];
          if (Math.hypot(b.x - m.x, b.y - m.y) < m.radius + 5) {
            m.hp -= b.dmg;
            s.floats.push({
              x: m.x + (Math.random() * 14 - 7),
              y: m.y - 10,
              text: `-${Math.round(b.dmg * 10)}`,
              color: '#38bdf8',
              life: 18,
            });
            s.bullets.splice(i, 1);
            break;
          }
        }
      }

      // Mobs
      for (let i = s.mobs.length - 1; i >= 0; i--) {
        const m = s.mobs[i];
        if (m.hp <= 0) {
          s.gems.push({ x: m.x, y: m.y, val: m.isBoss ? 55 : 22 });
          setKills((k) => k + 1);
          s.mobs.splice(i, 1);
          continue;
        }

        if (!s.paused) {
          const ang = Math.atan2(s.py - m.y, s.px - m.x);
          m.x += Math.cos(ang) * m.speed;
          m.y += Math.sin(ang) * m.speed;

          if (Math.hypot(s.px - m.x, s.py - m.y) < m.radius + 15) {
            setPlayerHp((hp) => Math.max(10, hp - 0.15));
          }
        }

        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = m.isBoss ? '#fef08a' : '#fecdd3';
        ctx.lineWidth = m.isBoss ? 3 : 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = m.isBoss ? 'bold 12px sans-serif' : '11px sans-serif';
        ctx.fillText(m.label, m.x - 26, m.y - m.radius - 6);
      }

      // Player Hero
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.arc(s.px, s.py, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.font = '16px sans-serif';
      ctx.fillText('⚡', s.px - 8, s.py + 6);

      // Floating Damage Numbers
      for (let i = s.floats.length - 1; i >= 0; i--) {
        const fl = s.floats[i];
        fl.y -= 0.8;
        fl.life--;
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = fl.color;
        ctx.fillText(fl.text, fl.x, fl.y);
        if (fl.life <= 0) s.floats.splice(i, 1);
      }

      // Top XP Progress Bar inside Canvas
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(20, 10, 880, 10);
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(20, 10, 880 * (s.xp / 100), 10);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`XP EVRİM BARI (%${Math.min(100, Math.round(s.xp))})`, 410, 19);

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    stateRef.current.targetX = (e.clientX - rect.left) * (920 / rect.width);
    stateRef.current.targetY = (e.clientY - rect.top) * (380 / rect.height);
  };

  const weaponNames = [
    'Sv.1 Tekli Plazma Kalemi',
    'Sv.2 Üçlü Türev Lazeri + 2x Kalkan',
    'Sv.3 BUEPT Beşli Fırtına + 3x Kalkan',
    'Sv.4 MAX Boğaziçi Süpernova Silahı',
  ];

  return (
    <div className="space-y-3">
      {/* Header Controls */}
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
              <Zap className="w-4 h-4 text-pink-400" />
              Mod 3: Exam Survivors — Brawl & Vampire Survivors Aksiyon Arenası
            </h2>
            <p className="text-xs text-slate-400">
              Mouse veya <kbd className="px-1.5 py-0.5 bg-slate-800 text-white rounded">WASD</kbd> ile hareket et •{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-800 text-white rounded">SPACE</kbd> ile Dash at • Yeşil XP kürelerini toplayıp Bullet-Time Evrim Kapısını aç!
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-extrabold">
            🔫 {weaponNames[weaponTier - 1]}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-extrabold">
            💀 Leş: {kills} • Sv.{level}
          </span>
          <button
            onClick={triggerDash}
            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-extrabold transition"
          >
            💨 Dash At (Space)
          </button>
          <button
            onClick={openEvolutionGate}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-extrabold flex items-center gap-1 shadow-lg transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            ⚡ Bullet-Time Evrim Kapısını Aç
          </button>
        </div>
      </div>

      {/* 60 FPS Action Canvas + Bullet-Time Modal Overlay */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={920}
          height={380}
          onMouseMove={handleMouseMove}
          className="w-full h-[350px] sm:h-[380px] block bg-slate-950 cursor-crosshair"
        />

        {bulletTimeOpen && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="px-3.5 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-extrabold mb-2 flex items-center gap-1.5">
              <Flame className="w-4 h-4" /> BULLET-TIME LEVEL UP: DOĞRU KARTI SEÇ & SİLAHINI EVRİMLEŞTİR!
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-white max-w-2xl mb-4">
              {currentQ.prompt}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full max-w-4xl">
              {currentQ.options?.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCardPick(idx)}
                  className="p-4 rounded-2xl border-2 border-indigo-500/50 bg-slate-900 hover:border-pink-500 hover:scale-105 transition text-left flex flex-col justify-between space-y-2 shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-xs font-extrabold">
                      KART {String.fromCharCode(65 + idx)}
                    </span>
                    <Shield className="w-4 h-4 text-pink-400" />
                  </div>
                  <div className="text-sm font-bold text-white">{opt}</div>
                  <div className="text-xs text-emerald-400 font-semibold">
                    Doğruysa: Silah Evrimi + Süpernova Patlaması!
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
