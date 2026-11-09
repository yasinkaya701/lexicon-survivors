'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Vector2D,
  updatePlayerMovement,
  DEFAULT_ARENA,
  type ArenaBounds,
  checkCircleCircle,
  resolveCircleSoftPush,
} from '@/game/engine';
import { GameLoop, type GameLoopMetrics } from '@/game/engine/GameLoop';
import { rollDodge, type DodgeVisualAlert } from '@/game/engine/Dodge';
import {
  calculateArmorDamage,
  calculateHpRegenInterval,
  LifeStealTracker,
} from '@/game/stats/CombatMath';
import { WeaponManager, type WeaponAttackEvent } from '@/game/weapons/WeaponManager';
import { updateProjectiles, type HitResult } from '@/game/weapons/HitResolution';
import { getWeaponBlueprint } from '@/game/weapons/WeaponCatalog';
import {
  createEnemy,
  updateEnemyAI,
  type ShockwaveEvent,
} from '@/game/entities/EnemyEntities';
import {
  generateDropsForEnemy,
  updatePickups,
} from '@/game/entities/DropManager';
import { WaveDirector } from '@/game/waves/WaveDirector';
import { soundEngine } from '@/lib/sound';
import { assetManager, useAssetLoader } from '@/game/engine/AssetManager';
import { FloatingTextManager, VFXManager } from '@/game/vfx';
import type {
  PlayerRPGStats,
  PlayerEntity,
  EnemyEntity,
  EnemyType,
  ProjectileEntity,
  PickupEntity,
  ActiveWeaponInstance,
  TargetingMode,
  TacticalRewardType,
} from '@/types/brotato';
import { TacticalQuestion } from '@/types/game';
import { ALL_QUESTIONS } from '@/data/questions';
import { TacticalFreezeModal } from './TacticalFreezeModal';
import { SuperpowerEngine } from '@/game/education/TacticalSuperpowers';
import { HUD } from './HUD';
import { PauseSettingsModal } from '@/game/settings';

import { StoryRelic } from '@/data/storyQuests';

export interface GameCanvasProps {
  initialWave?: number;
  initialMaterials?: number;
  characterId?: string;
  characterName: string;
  characterBadge: string;
  avatarSrc?: string;
  activeRelics?: StoryRelic[];
  milestoneTitle?: string;
  onOpenCodex?: () => void;
  baseStats: Partial<PlayerRPGStats>;
  startingWeaponId?: string;
  onWaveComplete: (wave: number, materials: number, currentStats: PlayerRPGStats, activeWeapons: ActiveWeaponInstance[]) => void;
  onGameOver: (finalWave: number, totalMaterials: number) => void;
  onReturnToMenu?: () => void;
  onRecordMistake?: (question: TacticalQuestion, selectedIndex: number) => void;
}

const ENEMY_VFX_COLORS: Record<EnemyType, string> = {
  swarmer: '#f97316',
  rusher: '#ec4899',
  tank: '#64748b',
  ranged: '#10b981',
  elite: '#a855f7',
};

const ENEMY_SPRITE_KEYS: Record<EnemyType, string> = {
  swarmer: 'enemy_swarmer',
  rusher: 'enemy_rusher',
  tank: 'enemy_tank',
  ranged: 'enemy_ranged_shooter',
  elite: 'enemy_elite_boss',
};

const DEFAULT_STATS: PlayerRPGStats = {
  maxHp: 100,
  currentHp: 100,
  hpRegen: 0,
  lifeSteal: 0,
  damagePercent: 0,
  meleeDamage: 0,
  rangedDamage: 0,
  elementalDamage: 0,
  attackSpeed: 0,
  critChancePercent: 5,
  engineering: 0,
  range: 0,
  armor: 0,
  dodgePercent: 0,
  speedPercent: 0,
  luck: 0,
  harvesting: 0,
  pickupRange: 120,
};

export const GameCanvas: React.FC<GameCanvasProps> = ({
  initialWave = 1,
  initialMaterials = 0,
  characterId = 'potato_scholar',
  characterName,
  characterBadge,
  avatarSrc,
  activeRelics = [],
  milestoneTitle,
  onOpenCodex,
  baseStats,
  startingWeaponId = 'pistol_1',
  onWaveComplete,
  onGameOver,
  onReturnToMenu,
  onRecordMistake,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Preload and cache visual sprites
  useAssetLoader(true);

  // Synchronized React State for HUD
  const [hudHp, setHudHp] = useState<number>(baseStats.maxHp ?? 100);
  const [hudMaxHp, setHudMaxHp] = useState<number>(baseStats.maxHp ?? 100);
  const [hudMaterials, setHudMaterials] = useState<number>(initialMaterials);
  const [hudWave, setHudWave] = useState<number>(initialWave);
  const [hudTimeRemaining, setHudTimeRemaining] = useState<number>(20);
  const [hudWaveDuration, setHudWaveDuration] = useState<number>(20);
  const [hudWeapons, setHudWeapons] = useState<(ActiveWeaponInstance | null)[]>([null, null, null, null, null, null]);
  const [showStatsSheet, setShowStatsSheet] = useState<boolean>(false);
  const [isTacticalFreeze, setIsTacticalFreeze] = useState<boolean>(false);
  const isTacticalFreezeRef = useRef<boolean>(false);
  isTacticalFreezeRef.current = isTacticalFreeze;
  const [activeTacticalQuestion, setActiveTacticalQuestion] = useState<TacticalQuestion | null>(null);
  const [freezeSource, setFreezeSource] = useState<'mystery_chest' | 'elite_challenge'>('mystery_chest');
  const [questionCharges, setQuestionCharges] = useState<number>(2);
  const questionChargesRef = useRef<number>(2);
  const frenzyTimerRemainingRef = useRef<number>(0);

  // Mid-run Pause & Granular Settings State
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  isPausedRef.current = isPaused;
  const [targetingModeState, setTargetingModeState] = useState<TargetingMode>('closest');
  const [isScreenShakeEnabled, setIsScreenShakeEnabled] = useState<boolean>(true);
  const isScreenShakeEnabledRef = useRef<boolean>(true);
  isScreenShakeEnabledRef.current = isScreenShakeEnabled;
  const [isDamageNumbersEnabled, setIsDamageNumbersEnabled] = useState<boolean>(true);
  const isDamageNumbersEnabledRef = useRef<boolean>(true);
  isDamageNumbersEnabledRef.current = isDamageNumbersEnabled;

  // Engine References
  const gameLoopRef = useRef<GameLoop | null>(null);
  const weaponManagerRef = useRef<WeaponManager>(new WeaponManager());
  const waveDirectorRef = useRef<WaveDirector>(new WaveDirector(DEFAULT_ARENA));
  const lifeStealTrackerRef = useRef<LifeStealTracker>(new LifeStealTracker());

  // High-performance object pooled visual managers
  const floatingTextManagerRef = useRef<FloatingTextManager>(new FloatingTextManager(64));
  const vfxManagerRef = useRef<VFXManager>(new VFXManager(512));

  // Game Simulation State
  const playerRef = useRef<PlayerEntity>({
    id: 'player_main',
    characterId: characterId || 'potato_scholar',
    x: 960,
    y: 540,
    vx: 0,
    vy: 0,
    radius: 28,
    facingAngleRad: 0,
    stats: { ...DEFAULT_STATS, ...baseStats },
    invulnerabilityTimerMs: 0,
    isInvulnerable: false,
    spriteName: 'player_potato',
  });

  const playerMovementRef = useRef({
    pos: { x: 960, y: 540 },
    vel: { x: 0, y: 0 },
    radius: 28,
    speedPercent: baseStats.speedPercent ?? 0,
    isDashing: false,
    dashDurationRemaining: 0,
  });

  const enemiesRef = useRef<EnemyEntity[]>([]);
  const projectilesRef = useRef<ProjectileEntity[]>([]);
  const pickupsRef = useRef<PickupEntity[]>([]);
  const shockwavesRef = useRef<ShockwaveEvent[]>([]);

  const materialsCountRef = useRef<number>(initialMaterials);
  const currentWaveRef = useRef<number>(initialWave);
  const targetingModeRef = useRef<TargetingMode>('closest');
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 960, y: 540 });
  const keysPressedRef = useRef<Record<string, boolean>>({});

  // Regeneration Accumulator
  const regenTimerRef = useRef<number>(0);
  const isWaveTransitioningRef = useRef<boolean>(false);
  const waveCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Requirement R3: Mid-wave Question Charge Trigger
  const handleTriggerInWaveQuestion = () => {
    if (
      questionChargesRef.current <= 0 ||
      isTacticalFreezeRef.current ||
      isPausedRef.current ||
      gameLoopRef.current?.getState() !== 'running'
    ) {
      return;
    }
    questionChargesRef.current -= 1;
    setQuestionCharges(questionChargesRef.current);
    soundEngine.playComboUp(2);
    floatingTextManagerRef.current.spawnBanner(
      playerRef.current.x,
      playerRef.current.y,
      'SORU HAKKI KULLANILDI!',
      '#38bdf8'
    );
    vfxManagerRef.current.spawnPickupRing(playerRef.current.x, playerRef.current.y, 'chest');
    const randomQuestion = ALL_QUESTIONS[Math.floor(Math.random() * ALL_QUESTIONS.length)];
    gameLoopRef.current.setTacticalFreeze(true);
    setIsTacticalFreeze(true);
    setActiveTacticalQuestion(randomQuestion);
    setFreezeSource('mystery_chest');
  };
  const triggerQuestionRef = useRef(handleTriggerInWaveQuestion);
  triggerQuestionRef.current = handleTriggerInWaveQuestion;

  // Mid-run Pause Handlers
  const handlePause = () => {
    if (
      isPausedRef.current ||
      isTacticalFreezeRef.current ||
      isWaveTransitioningRef.current ||
      gameLoopRef.current?.getState() !== 'running'
    ) {
      return;
    }
    isPausedRef.current = true;
    gameLoopRef.current?.pause();
    setIsPaused(true);
    keysPressedRef.current = {};
    soundEngine.playMenuClick();
    soundEngine.stopCombatBgm();
  };

  const handleResume = () => {
    if (!isPausedRef.current) return;
    isPausedRef.current = false;
    if (gameLoopRef.current?.getState() === 'paused') {
      gameLoopRef.current?.resume();
    }
    setIsPaused(false);
    keysPressedRef.current = {};
    soundEngine.playMenuClick();
    soundEngine.startCombatBgm();
  };

  const handleReturnToMainMenuFromPause = () => {
    soundEngine.playMenuClick();
    soundEngine.stopCombatBgm();
    if (waveCompleteTimeoutRef.current) {
      clearTimeout(waveCompleteTimeoutRef.current);
      waveCompleteTimeoutRef.current = null;
    }
    gameLoopRef.current?.stop();
    isPausedRef.current = false;
    setIsPaused(false);
    onReturnToMenu?.();
  };

  const pauseHandlersRef = useRef({ handlePause, handleResume });
  pauseHandlersRef.current = { handlePause, handleResume };

  // Initialize Game on Mount
  useEffect(() => {
    const ftm = floatingTextManagerRef.current;
    const vfx = vfxManagerRef.current;

    // Start in-game combat music
    soundEngine.startCombatBgm();

    // 1. Initialize Player Weapons
    const wm = weaponManagerRef.current;
    const starterBp = getWeaponBlueprint(startingWeaponId);
    if (starterBp) {
      wm.addWeapon(starterBp);
    }

    // 2. Start Wave 1
    const wd = waveDirectorRef.current;
    const { bossSpawn } = wd.startWave(currentWaveRef.current);
    if (bossSpawn) {
      enemiesRef.current.push(createEnemy(bossSpawn.type, currentWaveRef.current, bossSpawn.x, bossSpawn.y));
    }

    setHudWave(currentWaveRef.current);
    setHudWaveDuration(wd.state.waveDurationSec);
    setHudTimeRemaining(wd.state.waveTimeRemainingSec);
    setHudWeapons([...wm.weapons]);

    // 3. Setup Input Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Mid-wave pause toggle [Escape] or [P]
      if (key === 'escape' || key === 'p') {
        if (!isTacticalFreezeRef.current) {
          if (isPausedRef.current) {
            pauseHandlersRef.current.handleResume();
          } else {
            pauseHandlersRef.current.handlePause();
          }
        }
        return;
      }

      // Ignore game inputs while paused or in tactical freeze
      if (isPausedRef.current || isTacticalFreezeRef.current) {
        return;
      }

      keysPressedRef.current[key] = true;

      // In-wave question charge trigger [Q]
      if (key === 'q') {
        triggerQuestionRef.current();
      }

      // Dash trigger
      if ((e.code === 'Space' || e.shiftKey) && !playerMovementRef.current.isDashing) {
        playerMovementRef.current.isDashing = true;
        playerMovementRef.current.dashDurationRemaining = 0.25; // 250ms dash burst
        vfx.spawnDustPuff(playerRef.current.x, playerRef.current.y, 4);
        soundEngine.playComboUp(1);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mousePosRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    // 4. Setup 60 FPS Headless GameLoop
    const loop = new GameLoop();
    gameLoopRef.current = loop;

    loop.onUpdate((dt: number) => {
      if (dt <= 0 || isWaveTransitioningRef.current) return;

      const ftm = floatingTextManagerRef.current;
      const vfx = vfxManagerRef.current;

      // 1. Ticker VFX and check Hit-Stop micro-freeze
      const { isSimulationFrozen } = vfx.update(dt);
      ftm.update(dt);

      // If hit-stop micro freeze is active, freeze entity physics for visceral impact weight
      if (isSimulationFrozen) return;

      const player = playerRef.current;
      const move = playerMovementRef.current;
      const enemies = enemiesRef.current;
      const projectiles = projectilesRef.current;
      const pickups = pickupsRef.current;

      // ----------------------------------------------------------------------
      // A. Player Movement & Input Integration
      // ----------------------------------------------------------------------
      let inputX = 0;
      let inputY = 0;
      const keys = keysPressedRef.current;

      if (keys['w'] || keys['arrowup']) inputY -= 1;
      if (keys['s'] || keys['arrowdown']) inputY += 1;
      if (keys['a'] || keys['arrowleft']) inputX -= 1;
      if (keys['d'] || keys['arrowright']) inputX += 1;

      // Dash timer
      if (move.isDashing) {
        move.dashDurationRemaining -= dt;
        if (move.dashDurationRemaining <= 0) {
          move.isDashing = false;
        }
      }

      move.speedPercent = player.stats.speedPercent;
      updatePlayerMovement(move, { x: inputX, y: inputY }, dt, DEFAULT_ARENA);

      // Sync player coordinates
      player.x = move.pos.x;
      player.y = move.pos.y;
      player.vx = move.vel.x;
      player.vy = move.vel.y;

      // Player facing angle towards mouse or motion
      const dxMouse = mousePosRef.current.x - player.x;
      const dyMouse = mousePosRef.current.y - player.y;
      player.facingAngleRad = Math.atan2(dyMouse, dxMouse);

      // Invulnerability decay
      if (player.invulnerabilityTimerMs > 0) {
        player.invulnerabilityTimerMs -= dt * 1000;
        player.isInvulnerable = player.invulnerabilityTimerMs > 0;
      }

      // ----------------------------------------------------------------------
      // B. HP Regeneration Loop
      // ----------------------------------------------------------------------
      if (player.stats.hpRegen > 0 && player.stats.currentHp < player.stats.maxHp) {
        const interval = calculateHpRegenInterval(player.stats.hpRegen);
        regenTimerRef.current += dt;
        if (regenTimerRef.current >= interval) {
          regenTimerRef.current = 0;
          player.stats.currentHp = Math.min(player.stats.maxHp, player.stats.currentHp + 1);
          ftm.spawnHeal(player.x, player.y, 1, false);
        }
      }

      // ----------------------------------------------------------------------
      // C. Wave Director Ticker & Enemy Spawning
      // ----------------------------------------------------------------------
      const waveRes = wd.update(dt, enemies.length, { x: player.x, y: player.y });

      for (const spawn of waveRes.enemiesToSpawn) {
        enemies.push(createEnemy(spawn.type, currentWaveRef.current, spawn.x, spawn.y));
      }

      // Check wave completion & Vacuum Trigger
      if (waveRes.isWaveJustCompleted) {
        soundEngine.playWaveComplete();
        soundEngine.playOrbitalLaser();
        ftm.spawnBanner(player.x, player.y, 'DALGA TAMAMLANDI!', '#38bdf8');
        vfx.triggerWhiteFlash(0.35);
        vfx.addTrauma(0.25);
        // Recharge tactical question charge on wave completion
        questionChargesRef.current = Math.min(3, questionChargesRef.current + 1);
        setQuestionCharges(questionChargesRef.current);
      }

      // ----------------------------------------------------------------------
      // D. Enemy AI & Behaviors
      // ----------------------------------------------------------------------
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.hp <= 0) {
          // Enemy Death Event: Spawn Drops
          const drops = generateDropsForEnemy(enemy, player.stats.luck);
          pickups.push(...drops);
          soundEngine.playEnemyDeath();
          vfx.spawnDeathBurst(enemy.x, enemy.y, ENEMY_VFX_COLORS[enemy.type], enemy.type === 'elite');
          vfx.addTrauma(enemy.type === 'elite' ? 0.35 : 0.08);
          if (enemy.type === 'elite') {
            vfx.triggerHitStop(60);
            // Defeating an elite awards an immediate question charge
            questionChargesRef.current = Math.min(3, questionChargesRef.current + 1);
            setQuestionCharges(questionChargesRef.current);
            ftm.spawnBanner(player.x, player.y - 30, '+1 SORU HAKKI KAZANILDI!', '#22d3ee');
          }
          enemies.splice(i, 1);
          continue;
        }

        const enemyUpdate = updateEnemyAI(enemy, player, enemies, dt, DEFAULT_ARENA);

        // Spawn enemy projectiles
        if (enemyUpdate.spawnedProjectiles.length > 0) {
          projectiles.push(...enemyUpdate.spawnedProjectiles);
          soundEngine.playHit();
        }

        // Handle ground shockwaves
        for (const sw of enemyUpdate.shockwaves) {
          shockwavesRef.current.push(sw);
          vfx.addTrauma(0.12);
          const distToPlayer = Math.hypot(player.x - sw.x, player.y - sw.y);
          if (distToPlayer <= sw.radius && !player.isInvulnerable) {
            // Player takes shockwave damage
            const dodgeRoll = rollDodge(sw.damage, player.stats.dodgePercent, { x: player.x, y: player.y });
            if (dodgeRoll.isDodged) {
              ftm.spawnDodge(player.x, player.y);
              vfx.spawnDustPuff(player.x, player.y, 3);
              soundEngine.playDodge();
            } else {
              const damageTaken = calculateArmorDamage(sw.damage, player.stats.armor);
              player.stats.currentHp = Math.max(0, player.stats.currentHp - damageTaken);
              player.invulnerabilityTimerMs = 500;
              player.isInvulnerable = true;
              if (isDamageNumbersEnabledRef.current) {
                ftm.spawnPlayerDamage(player.x, player.y, damageTaken);
              }
              vfx.triggerDamageVignette(0.65);
              vfx.addTrauma(0.25);
              soundEngine.playPlayerHurt();
            }
          }
        }

        // Soft flocking push separation with neighbor enemies
        for (let j = i - 1; j >= 0; j--) {
          const other = enemies[j];
          resolveCircleSoftPush(
            { x: enemy.x, y: enemy.y },
            enemy.radius,
            { x: other.x, y: other.y },
            other.radius,
            0.5
          );
        }

        // Enemy vs Player Contact Collision
        if (checkCircleCircle({ x: enemy.x, y: enemy.y }, enemy.radius, { x: player.x, y: player.y }, player.radius)) {
          if (!player.isInvulnerable && enemy.damage > 0) {
            const dodgeRoll = rollDodge(enemy.damage, player.stats.dodgePercent, { x: player.x, y: player.y });
            if (dodgeRoll.isDodged) {
              ftm.spawnDodge(player.x, player.y);
              vfx.spawnDustPuff(player.x, player.y, 3);
              soundEngine.playDodge();
            } else {
              const damageTaken = calculateArmorDamage(enemy.damage, player.stats.armor);
              player.stats.currentHp = Math.max(0, player.stats.currentHp - damageTaken);
              player.invulnerabilityTimerMs = 600;
              player.isInvulnerable = true;
              if (isDamageNumbersEnabledRef.current) {
                ftm.spawnPlayerDamage(player.x, player.y, damageTaken);
              }
              vfx.triggerDamageVignette(0.65);
              vfx.addTrauma(0.30);
              soundEngine.playPlayerHurt();

              if (player.stats.currentHp <= 0) {
                // Game Over
                soundEngine.stopCombatBgm();
                onGameOver(currentWaveRef.current, materialsCountRef.current);
                loop.stop();
                return;
              }
            }
          }
        }
      }

      // ----------------------------------------------------------------------
      // E. Simultaneous Multi-Weapon Array Ticking & Firing
      // ----------------------------------------------------------------------
      const attackEvents = wm.update(
        dt,
        player.stats,
        { x: player.x, y: player.y },
        enemies,
        targetingModeRef.current,
        mousePosRef.current
      );

      for (const atk of attackEvents) {
        // Procedural Audio per weapon archetype
        if (atk.blueprint.id.startsWith('pistol')) {
          soundEngine.playPistolShot();
        } else if (atk.blueprint.id.startsWith('shotgun')) {
          soundEngine.playShotgunShot();
        } else if (atk.blueprint.id.startsWith('smg')) {
          soundEngine.playSMGShot();
        } else if (atk.blueprint.id.startsWith('wand')) {
          soundEngine.playMagicCast();
        } else if (atk.blueprint.type === 'melee') {
          soundEngine.playMeleeSwing();
        } else {
          soundEngine.playHit();
        }

        // Muzzle Flash & Melee Slash VFX
        if (atk.blueprint.type === 'ranged') {
          const muzzleX = player.x + Math.cos(atk.angleRad) * (player.radius + 16);
          const muzzleY = player.y + Math.sin(atk.angleRad) * (player.radius + 16);
          vfx.spawnMuzzleFlash(muzzleX, muzzleY, atk.angleRad);
        } else {
          vfx.spawnMeleeSlashArc(
            player.x,
            player.y,
            atk.angleRad,
            atk.blueprint.arcAngleDeg ?? 120,
            atk.blueprint.baseRange
          );
        }

        // Projectiles Spawned
        if (atk.projectilesToSpawn) {
          projectiles.push(...atk.projectilesToSpawn);
        }

        // Immediate Melee Hits
        if (atk.meleeHits) {
          for (const hit of atk.meleeHits) {
            const enemy = enemies.find((e) => e.id === hit.enemyId);
            if (enemy) {
              enemy.hp -= hit.damage;
              enemy.hitFlashTimerMs = 120;
              enemy.vx += hit.knockback.x;
              enemy.vy += hit.knockback.y;

              soundEngine.playEnemyHit();
              if (isDamageNumbersEnabledRef.current) {
                ftm.spawnDamage(enemy.x, enemy.y, hit.damage, hit.isCrit);
              }
              vfx.spawnHitSparks(enemy.x, enemy.y, atk.angleRad, hit.isCrit, 6);
              vfx.spawnBloodSplatter(enemy.x, enemy.y, ENEMY_VFX_COLORS[enemy.type], hit.isCrit ? 10 : 5);
              if (hit.isCrit) {
                vfx.addTrauma(0.12);
                vfx.triggerHitStop(35);
              }

              // Life Steal Check (100ms ICD)
              if (player.stats.lifeSteal > 0 && player.stats.currentHp < player.stats.maxHp) {
                const roll = Math.random() * 100;
                if (lifeStealTrackerRef.current.attemptHeal(Date.now(), roll, player.stats.lifeSteal)) {
                  player.stats.currentHp = Math.min(player.stats.maxHp, player.stats.currentHp + 1);
                  ftm.spawnHeal(player.x, player.y, 1, true);
                }
              }
            }
          }
        }
      }

      // ----------------------------------------------------------------------
      // F. Ballistic Projectile Pipeline & Ricochet Bounces
      // ----------------------------------------------------------------------
      const projResult = updateProjectiles(projectiles, dt, enemies);
      projectilesRef.current = projResult.activeProjectiles;

      for (const hit of projResult.hits) {
        const enemy = enemies.find((e) => e.id === hit.enemyId);
        if (enemy) {
          enemy.hp -= hit.damage;
          enemy.hitFlashTimerMs = 120;
          enemy.vx += hit.knockback.x;
          enemy.vy += hit.knockback.y;

          soundEngine.playEnemyHit();
          const impactAngle = Math.atan2(hit.knockback.y, hit.knockback.x);
          if (isDamageNumbersEnabledRef.current) {
            ftm.spawnDamage(enemy.x, enemy.y, hit.damage, hit.isCrit);
          }
          vfx.spawnHitSparks(enemy.x, enemy.y, impactAngle, hit.isCrit, 5);
          vfx.spawnBloodSplatter(enemy.x, enemy.y, ENEMY_VFX_COLORS[enemy.type], hit.isCrit ? 8 : 4);
          if (hit.isCrit) {
            vfx.addTrauma(0.10);
            vfx.triggerHitStop(25);
          }

          // Life Steal
          if (player.stats.lifeSteal > 0 && player.stats.currentHp < player.stats.maxHp) {
            const roll = Math.random() * 100;
            if (lifeStealTrackerRef.current.attemptHeal(Date.now(), roll, player.stats.lifeSteal)) {
              player.stats.currentHp = Math.min(player.stats.maxHp, player.stats.currentHp + 1);
              ftm.spawnHeal(player.x, player.y, 1, true);
            }
          }
        }
      }

      // ----------------------------------------------------------------------
      // G. Drop Magnetism & End-of-Wave Vacuum
      // ----------------------------------------------------------------------
      const dropResult = updatePickups(pickups, player, wd.state.isVacuumActive, dt);
      pickupsRef.current = dropResult.survivingPickups;

      if (dropResult.collectedMaterials > 0) {
        materialsCountRef.current += dropResult.collectedMaterials;
        soundEngine.playGemPickup();
        ftm.spawnPickup(player.x, player.y, `+${dropResult.collectedMaterials} MATERYAL`, '#fbbf24');
        vfx.spawnPickupRing(player.x, player.y, 'material');
      }
      if (dropResult.collectedHealth > 0) {
        player.stats.currentHp = Math.min(player.stats.maxHp, player.stats.currentHp + dropResult.collectedHealth);
        soundEngine.playComboUp(2);
        ftm.spawnHeal(player.x, player.y, dropResult.collectedHealth, false);
        vfx.spawnPickupRing(player.x, player.y, 'fruit');
      }
      if (dropResult.collectedChests > 0) {
        soundEngine.playComboUp(3);
        ftm.spawnBanner(player.x, player.y, 'GİZEMLİ SANDIK!', '#f59e0b');
        vfx.spawnPickupRing(player.x, player.y, 'chest');
        vfx.addTrauma(0.20);

        // Trigger in-combat frame-accurate tactical freeze
        const randomQuestion = ALL_QUESTIONS[Math.floor(Math.random() * ALL_QUESTIONS.length)];
        loop.setTacticalFreeze(true);
        setIsTacticalFreeze(true);
        setActiveTacticalQuestion(randomQuestion);
        setFreezeSource('mystery_chest');
      }

      // Flow State Frenzy Overdrive ticking
      if (frenzyTimerRemainingRef.current > 0) {
        frenzyTimerRemainingRef.current = Math.max(0, frenzyTimerRemainingRef.current - dt);
        player.stats.attackSpeed = (baseStats.attackSpeed ?? 0) + 100;
        player.stats.critChancePercent = 100;
        player.invulnerabilityTimerMs = Math.max(player.invulnerabilityTimerMs, 1000);
        for (const w of wm.getActiveWeapons()) {
          w.currentCooldownMs = 0;
        }
      }

      // Check if wave finished and all vacuum pickups are collected
      if (wd.state.isWaveCompleted && pickupsRef.current.length === 0 && !isWaveTransitioningRef.current) {
        isWaveTransitioningRef.current = true;
        soundEngine.stopCombatBgm();
        waveCompleteTimeoutRef.current = setTimeout(() => {
          onWaveComplete(
            currentWaveRef.current,
            materialsCountRef.current,
            { ...player.stats },
            wm.getActiveWeapons()
          );
        }, 600);
      }

      // ----------------------------------------------------------------------
      // H. Synchronize HUD Reactive State
      // ----------------------------------------------------------------------
      setHudHp(player.stats.currentHp);
      setHudMaxHp(player.stats.maxHp);
      setHudMaterials(materialsCountRef.current);
      setHudTimeRemaining(wd.state.waveTimeRemainingSec);
      setHudWeapons([...wm.weapons]);
    });

    // ------------------------------------------------------------------------
    // 5. 60 FPS HTML5 Canvas Renderer
    // ------------------------------------------------------------------------
    loop.onRender(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // High-resolution digital vector asset smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const player = playerRef.current;
      const enemies = enemiesRef.current;
      const projectiles = projectilesRef.current;
      const pickups = pickupsRef.current;
      const wm = weaponManagerRef.current;
      const ftm = floatingTextManagerRef.current;
      const vfx = vfxManagerRef.current;

      // Clear Canvas Background (Dark Sci-Fi Slate)
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ----------------------------------------------------------------------
      // WORLD SPACE RENDERING (With Camera Screen Shake)
      // ----------------------------------------------------------------------
      ctx.save();
      if (isScreenShakeEnabledRef.current) {
        vfx.applyCameraShake(ctx);
      }

      // 1. Arena Grid Floor & Boundaries with AI-generated assets
      assetManager.drawTiled(
        ctx,
        'arena_tile_floor',
        DEFAULT_ARENA.minX,
        DEFAULT_ARENA.minY,
        DEFAULT_ARENA.maxX,
        DEFAULT_ARENA.maxY
      );

      // Stitch Emerald Arcane Boundary Glow
      ctx.save();
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 5;
      ctx.strokeRect(
        DEFAULT_ARENA.minX,
        DEFAULT_ARENA.minY,
        DEFAULT_ARENA.maxX - DEFAULT_ARENA.minX,
        DEFAULT_ARENA.maxY - DEFAULT_ARENA.minY
      );
      ctx.restore();

      // Stitch Emerald Crystal Formations at 4 Corners & Perimeter
      const crystalPositions = [
        { x: DEFAULT_ARENA.minX + 32, y: DEFAULT_ARENA.minY + 32 },
        { x: DEFAULT_ARENA.maxX - 32, y: DEFAULT_ARENA.minY + 32 },
        { x: DEFAULT_ARENA.minX + 32, y: DEFAULT_ARENA.maxY - 32 },
        { x: DEFAULT_ARENA.maxX - 32, y: DEFAULT_ARENA.maxY - 32 },
        { x: (DEFAULT_ARENA.minX + DEFAULT_ARENA.maxX) / 2, y: DEFAULT_ARENA.minY + 20 },
        { x: (DEFAULT_ARENA.minX + DEFAULT_ARENA.maxX) / 2, y: DEFAULT_ARENA.maxY - 20 },
        { x: DEFAULT_ARENA.minX + 20, y: (DEFAULT_ARENA.minY + DEFAULT_ARENA.maxY) / 2 },
        { x: DEFAULT_ARENA.maxX - 20, y: (DEFAULT_ARENA.minY + DEFAULT_ARENA.maxY) / 2 },
      ];
      for (const cp of crystalPositions) {
        assetManager.drawSprite(ctx, 'arena_border_wall', cp.x, cp.y, {
          width: 56,
          height: 56,
        });
      }

      // Hazard Warning Corner Chevrons
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(DEFAULT_ARENA.minX - 6, DEFAULT_ARENA.minY - 6, 12, 12);
      ctx.fillRect(DEFAULT_ARENA.maxX - 6, DEFAULT_ARENA.minY - 6, 12, 12);
      ctx.fillRect(DEFAULT_ARENA.minX - 6, DEFAULT_ARENA.maxY - 6, 12, 12);
      ctx.fillRect(DEFAULT_ARENA.maxX - 6, DEFAULT_ARENA.maxY - 6, 12, 12);

      // 2. Render Pickups
      for (const p of pickups) {
        let spriteKey = 'pickup_material_crystal';
        if (p.type === 'fruit') spriteKey = 'pickup_health_fruit';
        else if (p.type === 'chest') spriteKey = 'pickup_mystery_chest';

        assetManager.drawSprite(ctx, spriteKey, p.x, p.y, {
          width: p.radius * 2.4,
          height: p.radius * 2.4,
        });
      }

      // 3. Render Enemies
      for (const enemy of enemies) {
        const isFlashing = enemy.hitFlashTimerMs > 0;

        // Tank Charge Telegraph Line
        if (enemy.type === 'tank' && enemy.state === 'telegraphing' && enemy.targetPosition) {
          ctx.save();
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(enemy.x, enemy.y);
          ctx.lineTo(enemy.targetPosition.x, enemy.targetPosition.y);
          ctx.stroke();
          ctx.restore();
        }

        // Ranged Laser Telegraph Line
        if (enemy.type === 'ranged' && enemy.state === 'telegraphing') {
          ctx.save();
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(enemy.x, enemy.y);
          ctx.lineTo(
            enemy.x + Math.cos(enemy.facingAngleRad) * 400,
            enemy.y + Math.sin(enemy.facingAngleRad) * 400
          );
          ctx.stroke();
          ctx.restore();
        }

        // Draw Enemy Sprite
        const spriteKey = ENEMY_SPRITE_KEYS[enemy.type] || 'enemy_swarmer';
        assetManager.drawSprite(ctx, spriteKey, enemy.x, enemy.y, {
          width: enemy.radius * 2.4,
          height: enemy.radius * 2.4,
          rotationRad: enemy.facingAngleRad,
          hitFlash: isFlashing,
        });

        // Elite Boss Crown Indicator
        if (enemy.type === 'elite') {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(enemy.x - 16, enemy.y - enemy.radius - 2);
          ctx.lineTo(enemy.x - 8, enemy.y - enemy.radius - 14);
          ctx.lineTo(enemy.x, enemy.y - enemy.radius - 6);
          ctx.lineTo(enemy.x + 8, enemy.y - enemy.radius - 14);
          ctx.lineTo(enemy.x + 16, enemy.y - enemy.radius - 2);
          ctx.closePath();
          ctx.fill();
        }

        // Health Bar above Damaged Enemy
        if (enemy.hp < enemy.maxHp) {
          const barW = enemy.radius * 2;
          const barH = 4;
          const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 10, barW, barH);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 10, barW * hpRatio, barH);
        }
      }

      // 4. Render Projectiles
      for (const proj of projectiles) {
        const projKey =
          proj.spriteName ||
          (proj.source === 'enemy'
            ? 'proj_enemy_spit'
            : proj.weaponId?.startsWith('wand')
            ? 'proj_magic_orb'
            : 'proj_bullet');
        const rot = Math.atan2(proj.vy, proj.vx);
        assetManager.drawSprite(ctx, projKey, proj.x, proj.y, {
          width: proj.radius * 3.0,
          height: proj.radius * 3.0,
          rotationRad: rot,
        });
      }

      // 5. Render Player Potato & Hero Visual Prominence
      // A. Ambient Ground Drop Shadow beneath player
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(
        player.x,
        player.y + player.radius * 0.75,
        player.radius * 1.35,
        player.radius * 0.55,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      // B. Subtle Cyan/Indigo Pulsing Hero Energy Aura Circle
      const pulseTime = Date.now() * 0.003;
      const pulseRadius = player.radius * 1.35 + Math.sin(pulseTime) * 3;
      const auraAlpha = 0.28 + 0.12 * Math.sin(pulseTime);
      ctx.save();
      ctx.strokeStyle = `rgba(56, 189, 248, ${auraAlpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y + player.radius * 0.2, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();

      const auraGrad = ctx.createRadialGradient(
        player.x,
        player.y + player.radius * 0.2,
        player.radius * 0.3,
        player.x,
        player.y + player.radius * 0.2,
        pulseRadius
      );
      auraGrad.addColorStop(0, 'rgba(99, 102, 241, 0.18)');
      auraGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(player.x, player.y + player.radius * 0.2, pulseRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // C. Sleek Aim Guide Chevron pointing towards player.facingAngleRad
      const aimDist = player.radius * 2.2;
      const aimAngle = player.facingAngleRad;
      const ax = player.x + Math.cos(aimAngle) * aimDist;
      const ay = player.y + Math.sin(aimAngle) * aimDist;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(aimAngle);
      ctx.strokeStyle = '#38bdf8';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(7, 0);
      ctx.lineTo(-10, 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // D. Ground Runic Circle Evolution (Wave >= 5)
      const currentWaveNum = currentWaveRef.current;
      if (currentWaveNum >= 5) {
        ctx.save();
        const runeRot = Date.now() * 0.0012;
        ctx.translate(player.x, player.y + player.radius * 0.3);
        ctx.rotate(runeRot);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6, 3, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, player.radius * 1.7, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glowing star glyph
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        for (let r = 0; r < 4; r++) {
          const a = (r * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * player.radius * 0.8, Math.sin(a) * player.radius * 0.8);
          ctx.lineTo(Math.cos(a) * player.radius * 1.5, Math.sin(a) * player.radius * 1.5);
          ctx.stroke();
        }
        ctx.restore();
      }

      // E. Large Commanding Player Visual Sprite (player.radius * 3.6 = ~100.8px)
      const playerAlpha = player.isInvulnerable
        ? 0.5 + 0.5 * Math.sin(Date.now() * 0.03)
        : 1.0;

      assetManager.drawSprite(
        ctx,
        player.characterId || player.spriteName || 'player_potato_scholar',
        player.x,
        player.y,
        {
          width: player.radius * 3.6,
          height: player.radius * 3.6,
          rotationRad: player.facingAngleRad,
          alpha: playerAlpha,
          hitFlash: player.isInvulnerable && Math.floor(Date.now() / 80) % 2 === 0,
        }
      );

      // F. Character Visual Evolution Accessories:
      // Level 2 (Wave >= 3): Warrior Headband with Emerald Gem (Stitch Reference)
      if (currentWaveNum >= 3) {
        ctx.save();
        ctx.translate(player.x, player.y - player.radius * 0.75);
        // Leather warrior band
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-player.radius * 0.85, -4, player.radius * 1.7, 8);
        // Glowing emerald crystal gem center
        ctx.fillStyle = '#10b981';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Level 3 (Wave >= 8): Armored Golden Shoulder Pauldrons
      if (currentWaveNum >= 8) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        // Left pauldron
        ctx.beginPath();
        ctx.arc(-player.radius * 1.25, -player.radius * 0.1, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Right pauldron
        ctx.beginPath();
        ctx.arc(player.radius * 1.25, -player.radius * 0.1, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Level 4 (Wave >= 12): Ascended Champion Golden Halo & Radiance
      if (currentWaveNum >= 12) {
        ctx.save();
        ctx.translate(player.x, player.y - player.radius * 1.35);
        ctx.strokeStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // G. Radiant Invulnerability Shield Outline
      if (player.isInvulnerable) {
        ctx.save();
        const shieldPulse = 2.5 + Math.sin(Date.now() * 0.02) * 1.5;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = shieldPulse;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius * 1.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // H. Render Orbiting / Equipped Weapons with Tier Scaling and Energy Auras
      const activeWeapons = wm.getActiveWeapons();
      const weaponCount = activeWeapons.length;

      const TIER_TRAIL_COLORS: Record<number, string> = {
        1: 'rgba(148, 163, 184, 0.45)', // Tier 1 Gray
        2: 'rgba(56, 189, 248, 0.65)',  // Tier 2 Blue/Cyan
        3: 'rgba(192, 132, 252, 0.75)', // Tier 3 Purple
        4: 'rgba(251, 191, 36, 0.85)',  // Tier 4 Gold
      };

      for (let i = 0; i < weaponCount; i++) {
        const inst = activeWeapons[i];
        const tier = inst.blueprint.tier || 1;
        const orbitAngle = (i * 2 * Math.PI) / Math.max(1, weaponCount) + Date.now() * 0.001;
        // Dynamic orbit radius expands with tier
        const orbitDist = player.radius + 26 + (tier - 1) * 4;
        const wx = player.x + Math.cos(orbitAngle) * orbitDist;
        const wy = player.y + Math.sin(orbitAngle) * orbitDist;

        // Weapon tier energy trails
        const trailColor = TIER_TRAIL_COLORS[tier] || TIER_TRAIL_COLORS[1];
        ctx.save();
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = 2 + tier;
        ctx.beginPath();
        ctx.arc(player.x, player.y, orbitDist, orbitAngle - 0.35, orbitAngle, false);
        ctx.stroke();

        // Tier >= 2 Glowing Aura Ring
        if (tier >= 2) {
          ctx.strokeStyle = trailColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(wx, wy, 20 + tier * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        // Equipment Tier Size Evolution: Tier 1 (38px) up to Tier 4 (56px)
        const weaponRenderSize = 38 + (tier - 1) * 6;
        assetManager.drawSprite(ctx, inst.blueprint.spriteName, wx, wy, {
          width: weaponRenderSize,
          height: weaponRenderSize,
          rotationRad: inst.currentAngleRad,
        });
      }

      // 6. Particle VFX (Sparks, Splatters, Muzzle Flashes, Dust, Rings)
      vfx.render(ctx);

      // 7. Floating Combat Text (Crits, Damage, Dodges, Heals)
      ftm.render(ctx);

      // Restore World Space Shake
      ctx.restore();

      // ----------------------------------------------------------------------
      // SCREEN SPACE RENDERING (Fixed Viewport Overlays)
      // ----------------------------------------------------------------------
      const hpRatio =
        player.stats.maxHp > 0 ? player.stats.currentHp / player.stats.maxHp : 1;

      vfx.renderScreenOverlays(ctx, canvas.width, canvas.height, hpRatio);
    });

    loop.start();

    // Cleanup on Unmount
    return () => {
      soundEngine.stopCombatBgm();
      if (waveCompleteTimeoutRef.current) {
        clearTimeout(waveCompleteTimeoutRef.current);
        waveCompleteTimeoutRef.current = null;
      }
      loop.stop();
      ftm.clear();
      vfx.clear();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [startingWeaponId, baseStats, onWaveComplete, onGameOver, characterId]);

  const handleSelectSuperpower = (rewardType: TacticalRewardType) => {
    if (rewardType === 'emergency_heal') {
      SuperpowerEngine.executeRevitalizingSurge(
        playerRef.current,
        floatingTextManagerRef.current,
        vfxManagerRef.current
      );
    } else if (rewardType === 'orbital_nuke') {
      SuperpowerEngine.executeOrbitalNuke(
        enemiesRef.current,
        floatingTextManagerRef.current,
        vfxManagerRef.current
      );
    } else if (rewardType === 'flow_state_frenzy') {
      frenzyTimerRemainingRef.current = 10;
      SuperpowerEngine.activateFlowStateFrenzy(10);
    } else if (rewardType === 'global_vacuum') {
      const bonusVal = SuperpowerEngine.executeCosmicVacuum(
        pickupsRef.current,
        playerRef.current,
        floatingTextManagerRef.current,
        vfxManagerRef.current
      );
      materialsCountRef.current += bonusVal;
    }

    gameLoopRef.current?.setTacticalFreeze(false);
    setIsTacticalFreeze(false);
    setActiveTacticalQuestion(null);
  };

  const handleTacticalWrongAnswer = () => {
    for (const w of weaponManagerRef.current.getActiveWeapons()) {
      w.currentCooldownMs = Math.max(w.currentCooldownMs, 500);
    }
    playerRef.current.invulnerabilityTimerMs = 2000;
    if (activeTacticalQuestion && onRecordMistake) {
      onRecordMistake(activeTacticalQuestion, -1);
    }
  };

  const handleCloseTacticalFreeze = () => {
    gameLoopRef.current?.setTacticalFreeze(false);
    setIsTacticalFreeze(false);
    setActiveTacticalQuestion(null);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {/* 60 FPS HTML5 2D Canvas */}
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="h-full w-full object-contain"
      />

      {/* Real-time Roguelite HUD Overlay */}
      <HUD
        currentHp={hudHp}
        maxHp={hudMaxHp}
        materials={hudMaterials}
        wave={hudWave}
        waveTimeRemainingSec={hudTimeRemaining}
        waveDurationSec={hudWaveDuration}
        weapons={hudWeapons}
        playerStats={playerRef.current.stats}
        characterName={characterName}
        characterBadge={characterBadge}
        avatarSrc={avatarSrc}
        activeRelics={activeRelics}
        milestoneTitle={milestoneTitle}
        onOpenCodex={onOpenCodex}
        isTacticalFreeze={isTacticalFreeze}
        showStats={showStatsSheet}
        onToggleStats={() => setShowStatsSheet((prev) => !prev)}
        onPause={handlePause}
        questionCharges={questionCharges}
        maxQuestionCharges={2}
        onTriggerQuestion={handleTriggerInWaveQuestion}
      />

      {/* Mid-run Pause & Settings Modal Overlay */}
      <PauseSettingsModal
        isOpen={isPaused}
        onResume={handleResume}
        onReturnToMainMenu={handleReturnToMainMenuFromPause}
        currentWave={hudWave}
        materials={hudMaterials}
        playerStats={playerRef.current.stats}
        targetingMode={targetingModeState}
        onChangeTargetingMode={(mode) => {
          targetingModeRef.current = mode;
          setTargetingModeState(mode);
        }}
        isScreenShakeEnabled={isScreenShakeEnabled}
        onToggleScreenShake={() => {
          setIsScreenShakeEnabled((prev) => {
            const next = !prev;
            isScreenShakeEnabledRef.current = next;
            return next;
          });
        }}
        isDamageNumbersEnabled={isDamageNumbersEnabled}
        onToggleDamageNumbers={() => {
          setIsDamageNumbersEnabled((prev) => {
            const next = !prev;
            isDamageNumbersEnabledRef.current = next;
            return next;
          });
        }}
      />

      {/* In-Combat Tactical Freeze Modal Overlay */}
      {isTacticalFreeze && activeTacticalQuestion && (
        <TacticalFreezeModal
          isOpen={isTacticalFreeze}
          source={freezeSource}
          question={activeTacticalQuestion}
          onSelectSuperpower={handleSelectSuperpower}
          onWrongAnswer={handleTacticalWrongAnswer}
          onClose={handleCloseTacticalFreeze}
        />
      )}
    </div>
  );
};
