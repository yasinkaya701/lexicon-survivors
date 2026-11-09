'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CampaignAct, RoomUpgrades, TacticalQuestion, UnitStats } from '@/types/game';
import { BUEPT_QUESTIONS, UNIT_CATALOG, YKS_QUESTIONS } from '@/data/questions';
import { soundEngine } from '@/lib/sound';
import { Flame, RotateCcw, Scissors, ShieldAlert, Sparkles, Wind, ArrowLeft } from 'lucide-react';

interface BattleArenaProps {
  act: CampaignAct;
  upgrades: RoomUpgrades;
  forceShieldStart?: boolean;
  onBattleEnd: (won: boolean, statsDelta: {
    answered: number;
    correct: number;
    wrong: number;
    turla: number;
    shieldBreaks: number;
    maxCombo: number;
    peakBpm: number;
  }) => void;
  onRecordMistake: (q: TacticalQuestion, status: 'wrong' | 'skipped') => void;
  onBackToRoom: () => void;
}

interface ActiveUnit {
  side: 'player' | 'enemy';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  dmg: number;
  speed: number;
  radius: number;
  color: string;
  icon: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  big?: boolean;
}

export const BattleArena: React.FC<BattleArenaProps> = ({
  act,
  upgrades,
  forceShieldStart = false,
  onBattleEnd,
  onRecordMistake,
  onBackToRoom,
}) => {
  const arenaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ecgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const deckBase = act === 'yks' ? YKS_QUESTIONS : BUEPT_QUESTIONS;
  const initialIndex = forceShieldStart
    ? Math.max(0, deckBase.findIndex((q) => q.type === 'evidence_hunt'))
    : 0;

  const [qQueue, setQQueue] = useState<TacticalQuestion[]>(() => {
    const copy = [...deckBase];
    if (initialIndex > 0) {
      const [shieldQ] = copy.splice(initialIndex, 1);
      copy.unshift(shieldQ);
    }
    return copy;
  });

  const [mana, setMana] = useState<number>(upgrades.espressoMachine ? 8 : 5);
  const [combo, setCombo] = useState<number>(0);
  const [bpm, setBpm] = useState<number>(74);
  const [riskMode, setRiskMode] = useState<boolean>(false);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [free5050Used, setFree5050Used] = useState<boolean>(false);
  const [nssLockedMult, setNssLockedMult] = useState<number | null>(null);
  const [coachBanner, setCoachBanner] = useState<string | null>(null);

  // Mutable simulation ref for 60 FPS Canvas loop
  const simRef = useRef({
    playerHP: 1000,
    enemyHP: 1000,
    shake: 0,
    laserTimer: 0,
    shieldShatterTimer: 0,
    nssCursor: 50,
    nssDir: 1.7,
    units: [] as ActiveUnit[],
    particles: [] as Particle[],
    floatTexts: [] as FloatText[],
    stats: {
      answered: 0,
      correct: 0,
      wrong: 0,
      turla: 0,
      shieldBreaks: 0,
      maxCombo: 0,
      peakBpm: 74,
    },
    ended: false,
  });

  const currentQuestion = qQueue[0] || deckBase[0];
  const isBossShieldActive = currentQuestion.type === 'evidence_hunt';

  // Reset per-question states when question changes
  useEffect(() => {
    setHiddenOptions([]);
    setNssLockedMult(null);
  }, [currentQuestion.id]);

  // Spawn initial clash units & periodic enemy waves
  useEffect(() => {
    spawnUnitInternal('player', UNIT_CATALOG[0]);
    spawnUnitInternal('enemy', UNIT_CATALOG[0]);

    const waveInterval = setInterval(() => {
      if (simRef.current.ended) return;
      const enemyPool = [UNIT_CATALOG[0], UNIT_CATALOG[1], UNIT_CATALOG[0]];
      const pick = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      spawnUnitInternal('enemy', pick);
    }, 4200);

    return () => clearInterval(waveInterval);
  }, []);

  const spawnParticles = (x: number, y: number, color: string, count = 16) => {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.2 + Math.random() * 4.8;
      simRef.current.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color,
        life: 22 + Math.random() * 16,
      });
    }
  };

  const addFloatText = (x: number, y: number, text: string, color: string, big = false) => {
    simRef.current.floatTexts.push({ x, y, text, color, life: 52, big });
  };

  const spawnUnitInternal = (side: 'player' | 'enemy', unit: UnitStats) => {
    const isPlayer = side === 'player';
    const dmgBoost = isPlayer && upgrades.rgbSetup ? 1.35 : 1;
    simRef.current.units.push({
      side,
      x: isPlayer ? 125 : 795,
      y: 135 + (Math.random() * 54 - 27),
      hp: unit.hp,
      maxHp: unit.hp,
      dmg: unit.dmg * dmgBoost,
      speed: unit.speed,
      radius: unit.id === 'golem' || unit.id === 'dragon' ? 18 : 13,
      color: isPlayer ? unit.color : '#f43f5e',
      icon: unit.icon,
    });
  };

  const handleManualSpawn = (unit: UnitStats) => {
    if (mana < unit.cost) {
      soundEngine.playWrongBuzz();
      addFloatText(240, 210, '⚡ İksir Yetersiz! Soru Çöz!', '#fbbf24');
      return;
    }
    setMana((m) => m - unit.cost);
    soundEngine.playHit();
    spawnUnitInternal('player', unit);
  };

  const advanceQuestion = () => {
    setQQueue((prev) => {
      if (prev.length <= 1) {
        return [...deckBase];
      }
      return prev.slice(1);
    });
  };

  const handleAnswer = (isCorrect: boolean, isShieldEvidence = false) => {
    const s = simRef.current;
    s.stats.answered++;
    const mult = (riskMode ? 2 : 1) * (nssLockedMult || 1);

    if (isCorrect) {
      s.stats.correct++;
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      if (nextCombo > s.stats.maxCombo) s.stats.maxCombo = nextCombo;

      const manaGain = 3 * (riskMode ? 2 : 1);
      setMana((m) => Math.min(10, m + manaGain));
      setBpm((b) => Math.max(68, b - 6));
      setCoachBanner(currentQuestion.mnemonic);

      if (isShieldEvidence) {
        s.stats.shieldBreaks++;
        soundEngine.playShieldBreak();
        s.shieldShatterTimer = 30;
        s.shake = 16;
        const shieldDmg = 260 * mult;
        s.enemyHP = Math.max(0, s.enemyHP - shieldDmg);
        spawnParticles(805, 145, '#38bdf8', 36);
        addFloatText(730, 85, `🛡️ KALKAN KIRILDI! -${shieldDmg}`, '#38bdf8', true);
        spawnUnitInternal('player', UNIT_CATALOG[2]);
      } else if (nextCombo >= 3) {
        soundEngine.playOrbitalLaser();
        s.laserTimer = 28;
        s.shake = 14;
        const laserDmg = 210 * mult;
        s.enemyHP = Math.max(0, s.enemyHP - laserDmg);
        spawnParticles(805, 145, '#ec4899', 32);
        addFloatText(710, 90, `🐉 ${nextCombo}x KOMBO ULTİ! -${laserDmg}`, '#ec4899', true);
        spawnUnitInternal('player', UNIT_CATALOG[3]); // Free Boğaziçi Dragon!
      } else {
        soundEngine.playComboUp(nextCombo);
        addFloatText(450, 130, `✓ DOĞRU! +${manaGain} İKSİR (${nextCombo}x)`, '#34d399');
        spawnUnitInternal('player', UNIT_CATALOG[1]);
      }
    } else {
      s.stats.wrong++;
      soundEngine.playWrongBuzz();
      setCombo(0);
      const stressPenalty = upgrades.ergonomicChair ? 12 : 22;
      const nextBpm = Math.min(160, bpm + stressPenalty * (riskMode ? 1.5 : 1));
      setBpm(nextBpm);
      if (nextBpm > s.stats.peakBpm) s.stats.peakBpm = nextBpm;

      s.shake = 10;
      onRecordMistake(currentQuestion, 'wrong');
      setCoachBanner(`❌ Hata Defterine Eklendi! ${currentQuestion.mnemonic}`);
      addFloatText(440, 140, '❌ DİKKAT HATASI! BOSS SALDIRIYOR!', '#fb7185');
      spawnUnitInternal('enemy', UNIT_CATALOG[2]);
    }

    setRiskMode(false);
    advanceQuestion();
  };

  // Turlama Tekniği (Strategic Skip)
  const handleTurlaSkip = () => {
    soundEngine.playHit();
    simRef.current.stats.turla++;
    onRecordMistake(currentQuestion, 'skipped');
    setBpm((b) => Math.max(68, b - 12));
    addFloatText(430, 125, '🔄 TURLANDI! NABIZ KORUNDU & MUHAFIZ ÇAĞRILDI!', '#38bdf8');
    spawnUnitInternal('player', UNIT_CATALOG[0]);
    setQQueue((prev) => {
      if (prev.length <= 1) return prev;
      const [first, ...rest] = prev;
      return [...rest, first];
    });
  };

  // 50/50 Elimination
  const handle5050 = () => {
    if (!currentQuestion.options || hiddenOptions.length > 0) return;
    const isFree = upgrades.aiTablet && !free5050Used;
    if (!isFree && mana < 2) {
      soundEngine.playWrongBuzz();
      addFloatText(350, 180, '✂️ 50/50 İçin 2 İksir Gerekli!', '#fbbf24');
      return;
    }
    if (isFree) setFree5050Used(true);
    else setMana((m) => m - 2);

    soundEngine.playComboUp(1);
    const wrongIndices = currentQuestion.options
      .map((_, idx) => idx)
      .filter((idx) => idx !== currentQuestion.correctIndex);
    setHiddenOptions(wrongIndices.slice(0, 2));
    addFloatText(450, 150, '✂️ 2 YANLIŞ ŞIK ELENDİ!', '#a855f7');
  };

  // Breathe to lower BPM
  const handleBreathe = () => {
    soundEngine.playComboUp(1);
    setBpm((b) => Math.max(68, b - 24));
    addFloatText(220, 120, '🫁 DERİN NEFES: STRES AZALDI (-24 BPM)', '#34d399');
  };

  // Lock NSS Focus Bar on Evidence Hunt
  const handleLockNssBar = () => {
    const pos = simRef.current.nssCursor;
    const sweet = pos >= 36 && pos <= 64;
    if (sweet) {
      soundEngine.playComboUp(3);
      setNssLockedMult(2);
      addFloatText(450, 110, '🎯 MÜKEMMEL ODAK! 2X KALKAN HASARI AKTİF!', '#34d399');
    } else {
      soundEngine.playHit();
      setNssLockedMult(1);
      addFloatText(450, 110, '⚡ ODAK KİLİTLENDİ (1X HASAR)', '#fbbf24');
    }
  };

  const sendEmote = (emoji: string) => {
    soundEngine.playComboUp(1);
    addFloatText(115, 75, emoji, '#ffffff', true);
  };

  // Main 60 FPS Battle & ECG Canvas Loop
  useEffect(() => {
    const canvas = arenaCanvasRef.current;
    const ecgCanvas = ecgCanvasRef.current;
    if (!canvas || !ecgCanvas) return;
    const ctx = canvas.getContext('2d');
    const ecgCtx = ecgCanvas.getContext('2d');
    if (!ctx || !ecgCtx) return;

    let animId: number;
    let ecgX = 0;

    const render = (time: number) => {
      const s = simRef.current;

      // 1. Update NSS Focus Bar cursor if not locked
      if (isBossShieldActive && nssLockedMult === null) {
        s.nssCursor += s.nssDir;
        if (s.nssCursor >= 95 || s.nssCursor <= 5) s.nssDir *= -1;
        const cursorEl = document.getElementById('nss-focus-cursor');
        if (cursorEl) cursorEl.style.left = `${s.nssCursor}%`;
      }

      // 2. Render Live ECG Waveform Monitor
      ecgCtx.fillStyle = 'rgba(9, 13, 22, 0.16)';
      ecgCtx.fillRect(0, 0, ecgCanvas.width, ecgCanvas.height);
      ecgX = (ecgX + (bpm / 42)) % ecgCanvas.width;
      const beatCycle = (time * (bpm / 60000) * Math.PI * 2) % (Math.PI * 2);
      let spike = 0;
      if (beatCycle > 2.8 && beatCycle < 3.1) spike = -13;
      else if (beatCycle >= 3.1 && beatCycle < 3.3) spike = 11;

      ecgCtx.fillStyle = bpm > 115 ? '#f43f5e' : bpm > 92 ? '#fbbf24' : '#34d399';
      ecgCtx.beginPath();
      ecgCtx.arc(ecgX, 18 + spike, 2.2, 0, Math.PI * 2);
      ecgCtx.fill();

      // 3. Render Main 1v1 Battle Arena
      ctx.save();
      if (s.shake > 0) {
        ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
        s.shake *= 0.86;
        if (s.shake < 0.5) s.shake = 0;
      }

      const bgGrad = ctx.createLinearGradient(0, 0, 920, 0);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.5, act === 'yks' ? '#1e1b4b' : '#0c4a6e');
      bgGrad.addColorStop(1, '#2a0815');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 920, 270);

      // Tactical Grid Lines
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let gx = 0; gx < 920; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, 270);
        ctx.stroke();
      }

      // Bosphorus / Kilyos River Channel & Bridge
      ctx.fillStyle = 'rgba(14, 165, 233, 0.22)';
      ctx.fillRect(442, 0, 36, 270);
      ctx.fillStyle = '#334155';
      ctx.fillRect(430, 95, 60, 82);
      ctx.strokeStyle = '#64748b';
      ctx.strokeRect(430, 95, 60, 82);

      // Left Tower (Player Mind Fortress)
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(52, 85, 58, 105, 8);
      ctx.fill();
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#e0f2fe';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('🏰 ZİHİN KALESİ', 38, 60);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(38, 66, 88, 9);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(38, 66, 88 * (s.playerHP / 1000), 9);

      // Right Tower (ÖSYM / BUEPT Boss Fortress)
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.roundRect(810, 85, 58, 105, 8);
      ctx.fill();
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffe4e6';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(act === 'yks' ? '👹 ÖSYM BOSS' : '👹 BUEPT BOSS', 795, 60);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(792, 66, 88, 9);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(792, 66, 88 * (s.enemyHP / 1000), 9);

      // Boss Shield Visual Barrier when Evidence Hunt question is active
      if (isBossShieldActive) {
        const pulse = 0.55 + 0.35 * Math.sin(time * 0.008);
        ctx.save();
        ctx.strokeStyle = `rgba(56, 189, 248, ${pulse})`;
        ctx.fillStyle = `rgba(56, 189, 248, ${pulse * 0.22})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(838, 138, 68, Math.PI * 0.5, Math.PI * 1.5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('🛡️ KANIT KALKANI AKTİF', 755, 212);
        ctx.restore();
      }

      // Orbital Laser Ulti Beam
      if (s.laserTimer > 0) {
        s.laserTimer--;
        ctx.save();
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = s.laserTimer * 1.4;
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.moveTo(838, 0);
        ctx.lineTo(838, 175);
        ctx.stroke();
        ctx.restore();
      }

      // Update & Draw Units
      for (let i = s.units.length - 1; i >= 0; i--) {
        const u = s.units[i];
        let blocked = false;

        for (let j = 0; j < s.units.length; j++) {
          const other = s.units[j];
          if (u.side !== other.side) {
            const dist = Math.hypot(u.x - other.x, u.y - other.y);
            if (dist < u.radius + other.radius + 7) {
              blocked = true;
              other.hp -= u.dmg;
              if (Math.random() < 0.15) {
                spawnParticles((u.x + other.x) / 2, (u.y + other.y) / 2, u.color, 2);
              }
            }
          }
        }

        if (u.side === 'player' && u.x >= 792) {
          blocked = true;
          const mult = isBossShieldActive ? 0.25 : 0.85;
          s.enemyHP = Math.max(0, s.enemyHP - u.dmg * mult);
          if (Math.random() < 0.2) spawnParticles(808, u.y, '#38bdf8', 3);
        } else if (u.side === 'enemy' && u.x <= 122) {
          blocked = true;
          s.playerHP = Math.max(0, s.playerHP - u.dmg * 0.55);
          if (Math.random() < 0.2) spawnParticles(112, u.y, '#f43f5e', 3);
        }

        if (!blocked) {
          u.x += (u.side === 'player' ? 1 : -1) * u.speed;
        }

        ctx.beginPath();
        ctx.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
        ctx.fillStyle = u.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.font = '14px sans-serif';
        ctx.fillText(u.icon, u.x - 8, u.y + 5);

        // Mini HP bar
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(u.x - 14, u.y - u.radius - 7, 28, 4);
        ctx.fillStyle = u.side === 'player' ? '#4ade80' : '#fb7185';
        ctx.fillRect(u.x - 14, u.y - u.radius - 7, 28 * Math.max(0, u.hp / u.maxHp), 4);

        if (u.hp <= 0) {
          spawnParticles(u.x, u.y, u.color, 12);
          s.units.splice(i, 1);
        }
      }

      // Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // Floating texts
      for (let i = s.floatTexts.length - 1; i >= 0; i--) {
        const ft = s.floatTexts[i];
        ft.y -= 0.75;
        ft.life--;
        ctx.font = ft.big ? 'bold 22px sans-serif' : 'bold 13px sans-serif';
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, Math.max(20, Math.min(680, ft.x - 80)), ft.y);
        if (ft.life <= 0) s.floatTexts.splice(i, 1);
      }

      ctx.restore();

      // Check Win/Loss condition
      if (!s.ended && (s.enemyHP <= 0 || s.playerHP <= 0)) {
        s.ended = true;
        const won = s.enemyHP <= 0;
        if (won) soundEngine.playVictoryFanfare();
        else soundEngine.playWrongBuzz();
        setTimeout(() => {
          onBattleEnd(won, s.stats);
        }, 900);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [act, bpm, isBossShieldActive, nssLockedMult, onBattleEnd]);

  return (
    <div className={`space-y-3 rounded-2xl p-1 transition ${bpm > 118 ? 'stress-vignette' : ''}`}>
      {/* Top Biometric & Match Telemetry Bar */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToRoom}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Odaya Dön
          </button>
          <div>
            <span className="text-xs font-extrabold text-indigo-400 uppercase">
              {act === 'yks' ? '⚔️ 1. PERDE: ÖSYM DENEME BOSS SAVAŞI' : '⚔️ 2. PERDE: KİLYOS BUEPT BOSS SAVAŞI'}
            </span>
            <div className="text-xs text-slate-400">
              3x Kombo = <strong className="text-pink-400">Orbital Lazer & Boğaziçi Ejderi</strong> • Zor soruda <strong className="text-cyan-400">TURLA</strong>!
            </div>
          </div>
        </div>

        {/* Live ECG Heartbeat Monitor & Combo Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <canvas ref={ecgCanvasRef} width={90} height={34} className="rounded bg-slate-950" />
            <div>
              <div className="text-xs text-slate-400 font-semibold">NABIZ (STRES)</div>
              <div
                className={`text-sm font-extrabold ${
                  bpm > 118 ? 'text-rose-400 animate-pulse' : bpm > 95 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                ❤️ {Math.round(bpm)} BPM
              </div>
            </div>
          </div>

          <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-extrabold text-xs">
            🔥 KOMBO: {combo}x
          </div>

          <button
            onClick={() => {
              simRef.current.enemyHP = 0;
            }}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition"
            title="Jüri Hızlı Zafer Testi"
          >
            ⚡ Boss&apos;u Tekle (Demo)
          </button>
        </div>
      </div>

      {/* 60 FPS Canvas Battleground */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
        <canvas
          ref={arenaCanvasRef}
          width={920}
          height={270}
          className="w-full h-[250px] sm:h-[270px] block bg-slate-950"
        />
        {/* Emote Bar */}
        <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
          {['😎', '😭', '🔥', '🧠'].map((emo) => (
            <button
              key={emo}
              onClick={() => sendEmote(emo)}
              className="px-2 py-1 rounded-lg bg-slate-950/75 border border-slate-700 text-sm hover:scale-110 transition"
              title="Savaş Emote Gönder"
            >
              {emo}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Split Cockpit: Left Unit Deck (4 cols) + Right Tactical Question Engine (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Unit Summon Deck & Mana Bar */}
        <div className="lg:col-span-4 bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-extrabold text-cyan-300">⚡ BİLGİ İKSİRİ (MANA)</span>
              <span className="text-xs font-extrabold text-white">{mana} / 10</span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 transition-all duration-300"
                style={{ width: `${(mana / 10) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {UNIT_CATALOG.map((u) => (
              <button
                key={u.id}
                onClick={() => handleManualSpawn(u)}
                className="p-2 rounded-xl border border-slate-800 bg-slate-950 hover:border-indigo-500 text-left transition flex items-center gap-2"
              >
                <span className="text-xl">{u.icon}</span>
                <div>
                  <div className="text-xs font-bold text-white leading-tight">{u.name}</div>
                  <div className="text-xs text-cyan-400 font-semibold">{u.cost} İksir</div>
                </div>
              </button>
            ))}
          </div>

          {coachBanner && (
            <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-xs text-indigo-200">
              {coachBanner}
            </div>
          )}
        </div>

        {/* Right: Tactical Question Cockpit (Combo + Turlama + Shield Breaker) */}
        <div className="lg:col-span-8 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
          {/* Tactical Exam Action Buttons (Turla, 50/50, 2x Risk, Breathe) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-pink-500/20 text-pink-300 border border-pink-500/40">
                {currentQuestion.category}
              </span>
              {isBossShieldActive && (
                <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> KANIT AVCISI (KALKAN KIRICI)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={handleTurlaSkip}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1 transition"
                title="Soruyu Turla: Komboyu bozmaz, nabzı düşürür ve sona bırakır"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                TURLA (Sonraya Bırak)
              </button>

              {!isBossShieldActive && (
                <button
                  onClick={handle5050}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1 transition"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  50/50 Ele ({upgrades.aiTablet && !free5050Used ? 'ÜCRETSİZ' : '-2 İksir'})
                </button>
              )}

              <button
                onClick={() => setRiskMode((r) => !r)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition ${
                  riskMode
                    ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                2X RİSK {riskMode ? 'AKTİF!' : 'MODU'}
              </button>

              <button
                onClick={handleBreathe}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1 transition"
              >
                <Wind className="w-3.5 h-3.5" />
                Nefes Al (-BPM)
              </button>
            </div>
          </div>

          {/* Question Body: Multiple Choice vs. Evidence Hunt Shield Breaker */}
          <div className="space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
              {currentQuestion.prompt}
            </h3>

            {isBossShieldActive && currentQuestion.passageTokens ? (
              <div className="space-y-3">
                {/* NSS Focus Sweet-Spot Timing Bar */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">
                      1. Adım (Opsiyonel 2x Çarpan): Odak Barını Yeşil Bölgede Kilitle!
                    </span>
                    <span className="font-bold text-emerald-400">
                      {nssLockedMult ? `${nssLockedMult}X KİLİTLENDİ` : 'Hareket Ediyor...'}
                    </span>
                  </div>
                  <div className="relative w-full h-5 bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                    <div
                      className="absolute top-0 bottom-0 bg-emerald-500/35 border-x-2 border-emerald-400"
                      style={{ left: '36%', width: '28%' }}
                    />
                    <div
                      id="nss-focus-cursor"
                      className="absolute top-0 bottom-0 w-3 bg-white rounded shadow"
                      style={{ left: '50%' }}
                    />
                  </div>
                  {nssLockedMult === null && (
                    <button
                      onClick={handleLockNssBar}
                      className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition"
                    >
                      ⚡ ODAK BARINI KİLİTLE (2X KALKAN HASARI İÇİN YEŞİLDE BAS!)
                    </button>
                  )}
                </div>

                {/* Clickable Passage Tokens */}
                <div className="p-3.5 rounded-xl bg-slate-950 border-2 border-cyan-500/50 space-y-2">
                  <div className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    2. Adım: Metindeki Kanıt / Kırılma İfadesinin Üzerine Doğrudan Tıkla ve Kalkanı Parçala!
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {currentQuestion.passageTokens.map((tok, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(Boolean(tok.isClue), true)}
                        className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-indigo-600/40 border border-slate-700 hover:border-cyan-400 text-xs sm:text-sm font-semibold text-slate-100 transition"
                      >
                        {tok.text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentQuestion.options?.map((opt, idx) => {
                  const isHidden = hiddenOptions.includes(idx);
                  return (
                    <button
                      key={idx}
                      disabled={isHidden}
                      onClick={() => handleAnswer(idx === currentQuestion.correctIndex, false)}
                      className={`p-3 rounded-xl border text-left text-xs sm:text-sm font-bold transition flex items-center justify-between ${
                        isHidden
                          ? 'opacity-25 pointer-events-none border-slate-800 bg-slate-950 line-through'
                          : 'border-slate-700 bg-slate-950 hover:border-indigo-400 hover:bg-indigo-950/40 text-white'
                      }`}
                    >
                      <span>{opt}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-400">
                        {String.fromCharCode(65 + idx)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
