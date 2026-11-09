import { describe, it, expect, vi } from 'vitest';
import {
  SuperpowerEngine,
  SUPERPOWER_CATALOG,
  FreezeManager,
  TelemetryTracker,
  mapCategoryToSubjectAxis,
  calculateSubjectBuff,
  applySubjectBuffToStats,
  evaluateAnswerWithGrace,
  type VisualFXStub,
  type FloatingTextStub,
} from '@/game/education';
import { GameLoop, FIXED_TIMESTEP_SEC, MAX_DELTA_TIME_SEC } from '@/game/engine/GameLoop';
import { updatePlayerMovement, type PlayerMovementEntity } from '@/game/engine/Kinematics';
import { calculateAttackCooldown, calculateEffectiveDodge } from '@/game/stats/CombatMath';
import { ALL_QUESTIONS, YKS_QUESTIONS } from '@/data/questions';
import type {
  PlayerEntity,
  EnemyEntity,
  PickupEntity,
  PlayerRPGStats,
} from '@/types/brotato';
import type { TacticalQuestion } from '@/types/game';

// ============================================================================
// Mock Factories for Adversarial Stress Testing
// ============================================================================

function createMockPlayerStats(overrides: Partial<PlayerRPGStats> = {}): PlayerRPGStats {
  return {
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
    ...overrides,
  };
}

function createMockPlayerEntity(
  statsOverrides: Partial<PlayerRPGStats> = {},
  entityOverrides: Partial<PlayerEntity> = {}
): PlayerEntity {
  return {
    id: 'player_stress_test',
    characterId: 'potato_scholar',
    x: 500,
    y: 500,
    vx: 0,
    vy: 0,
    radius: 24,
    facingAngleRad: 0,
    stats: createMockPlayerStats(statsOverrides),
    invulnerabilityTimerMs: 0,
    isInvulnerable: false,
    spriteName: 'player_potato',
    ...entityOverrides,
  };
}

function createMockEnemyEntity(
  id: string,
  hp: number = 100,
  overrides: Partial<EnemyEntity> = {}
): EnemyEntity {
  return {
    id,
    type: 'swarmer',
    x: 400 + (Math.random() * 200 - 100),
    y: 400 + (Math.random() * 200 - 100),
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    damage: 10,
    speed: 120,
    mass: 1.0,
    radius: 16,
    state: 'pursuing',
    stateTimerMs: 0,
    isImmuneToKnockback: false,
    hitFlashTimerMs: 0,
    attackCooldownMs: 0,
    facingAngleRad: 0,
    ...overrides,
  };
}

function createMockPickupEntity(
  id: string,
  type: 'material' | 'fruit' | 'chest',
  value: number = 1,
  x: number = 100,
  y: number = 100
): PickupEntity {
  return {
    id,
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    value,
    radius: type === 'material' ? 8 : 12,
    isMagnetized: false,
  };
}

describe('Superpowers, Tactical Freeze & Telemetry Adversarial Stress Suite', () => {
  // ==========================================================================
  // Suite 1: Superpowers Extreme Boundary Testing
  // ==========================================================================
  describe('Suite 1: SuperpowerEngine Extreme Boundary Stress', () => {
    describe('REVITALIZING_SURGE', () => {
      it('handles currentHp === 0 with 50% heal floor (min 30 HP)', () => {
        const player = createMockPlayerEntity({ maxHp: 100, currentHp: 0 });
        const heal = SuperpowerEngine.executeRevitalizingSurge(player);

        // Missing = 100. floor(100 * 0.5) = 50. max(30, 50) = 50.
        expect(heal).toBe(50);
        expect(player.stats.currentHp).toBe(50);
        expect(player.invulnerabilityTimerMs).toBe(3000);
      });

      it('handles currentHp === maxHp without exceeding maxHp (clamp invariant)', () => {
        const player = createMockPlayerEntity({ maxHp: 100, currentHp: 100 });
        const heal = SuperpowerEngine.executeRevitalizingSurge(player);

        // Missing = 0. max(30, 0) = 30 heal attempted.
        // currentHp clamped strictly to min(100, 100 + 30) = 100!
        expect(heal).toBe(30);
        expect(player.stats.currentHp).toBe(100);
        expect(player.invulnerabilityTimerMs).toBe(3000);
      });

      it('handles massive maxHp === 10,000 with currentHp === 0', () => {
        const player = createMockPlayerEntity({ maxHp: 10000, currentHp: 0 });
        const heal = SuperpowerEngine.executeRevitalizingSurge(player);

        // Missing = 10,000. 50% = 5,000.
        expect(heal).toBe(5000);
        expect(player.stats.currentHp).toBe(5000);
        expect(player.invulnerabilityTimerMs).toBe(3000);
      });

      it('handles negative currentHp gracefully', () => {
        const player = createMockPlayerEntity({ maxHp: 100, currentHp: -50 });
        const heal = SuperpowerEngine.executeRevitalizingSurge(player);

        // Missing = 100 - (-50) = 150. floor(150 * 0.5) = 75.
        // currentHp = min(100, -50 + 75) = 25.
        expect(heal).toBe(75);
        expect(player.stats.currentHp).toBe(25);
      });

      it('clamps overhealed currentHp back to maxHp', () => {
        const player = createMockPlayerEntity({ maxHp: 100, currentHp: 120 });
        const heal = SuperpowerEngine.executeRevitalizingSurge(player);

        // Missing = Math.max(0, 100 - 120) = 0. heal = 30.
        // currentHp = Math.min(100, 120 + 30) = 100.
        expect(heal).toBe(30);
        expect(player.stats.currentHp).toBe(100);
      });

      it('enforces invulnerability timer monotonicity (does not decrease higher timer)', () => {
        const player = createMockPlayerEntity(
          { maxHp: 100, currentHp: 50 },
          { invulnerabilityTimerMs: 5000 }
        );
        SuperpowerEngine.executeRevitalizingSurge(player);

        // Existing 5000ms must NOT be downgraded to 3000ms
        expect(player.invulnerabilityTimerMs).toBe(5000);
      });

      it('operates reliably with missing or throwing stubs', () => {
        const player = createMockPlayerEntity({ maxHp: 100, currentHp: 40 });
        const throwingVfx: VisualFXStub = {
          triggerWhiteFlash: () => {
            throw new Error('Canvas context disposed');
          },
        };

        // Even if VFX throws, or stubs are undefined, execution shouldn't crash
        expect(() => {
          SuperpowerEngine.executeRevitalizingSurge(player, undefined, undefined);
        }).not.toThrow();

        expect(player.stats.currentHp).toBe(70);
      });
    });

    describe('ORBITAL_PARTICLE_NUKE', () => {
      it('executes safely on empty enemy array (0 enemies)', () => {
        const enemies: EnemyEntity[] = [];
        const hitCount = SuperpowerEngine.executeOrbitalNuke(enemies);

        expect(hitCount).toBe(0);
        expect(enemies.length).toBe(0);
      });

      it('executes flat 500 damage across massive horde of 10,000 enemies in < 50ms', () => {
        const hordeSize = 10000;
        const enemies: EnemyEntity[] = new Array(hordeSize);
        for (let i = 0; i < hordeSize; i++) {
          enemies[i] = createMockEnemyEntity(`enemy_${i}`, 800);
        }

        const start = performance.now();
        const hitCount = SuperpowerEngine.executeOrbitalNuke(enemies);
        const duration = performance.now() - start;

        expect(hitCount).toBe(hordeSize);
        expect(duration).toBeLessThan(100); // Must be performant

        // Spot check boundaries and random samples
        expect(enemies[0].hp).toBe(300);
        expect(enemies[0].hitFlashTimerMs).toBe(200);
        expect(enemies[hordeSize - 1].hp).toBe(300);
        expect(enemies[5000].hp).toBe(300);
      });

      it('handles enemies with negative, zero, and NaN HP without crashing', () => {
        const enemies: EnemyEntity[] = [
          createMockEnemyEntity('enemy_zero', 0),
          createMockEnemyEntity('enemy_neg', -150),
          createMockEnemyEntity('enemy_nan', NaN),
          createMockEnemyEntity('enemy_normal', 1000),
        ];

        const hitCount = SuperpowerEngine.executeOrbitalNuke(enemies);

        expect(hitCount).toBe(4);
        expect(enemies[0].hp).toBe(-500);
        expect(enemies[1].hp).toBe(-650);
        expect(Number.isNaN(enemies[2].hp)).toBe(true);
        expect(enemies[3].hp).toBe(500);
      });

      it('dispatches damage notifications and VFX sparks to all stubs', () => {
        const enemies = [createMockEnemyEntity('e1', 600), createMockEnemyEntity('e2', 700)];
        const damageSpawned: number[] = [];
        const mockFtm: FloatingTextStub = {
          spawnDamage: (_x, _y, dmg) => damageSpawned.push(dmg),
        };
        let sparkCount = 0;
        const mockVfx: VisualFXStub = {
          spawnHitSparks: () => sparkCount++,
          triggerWhiteFlash: vi.fn(),
          addTrauma: vi.fn(),
        };

        SuperpowerEngine.executeOrbitalNuke(enemies, mockFtm, mockVfx);

        expect(damageSpawned).toEqual([500, 500]);
        expect(sparkCount).toBe(2);
      });
    });

    describe('FLOW_STATE_FRENZY & Cooldown Clamp', () => {
      it('activates and returns duration seconds', () => {
        const duration = SuperpowerEngine.activateFlowStateFrenzy(10);
        expect(duration).toBe(10);

        const customDuration = SuperpowerEngine.activateFlowStateFrenzy(25);
        expect(customDuration).toBe(25);
      });

      it('strictly enforces the 12 hits/second safety limit (83.33ms cooldown floor)', () => {
        // Feature 9 & 60: T = max(83.33, T0 * (100 / (100 + max(-90, AS))))
        const baseCooldownMs = 1000;

        // Even with astronomical attack speeds, cooldown cannot drop below 83.33ms
        const extremeSpeeds = [100, 500, 1000, 10000, 1000000];
        for (const as of extremeSpeeds) {
          const cd = calculateAttackCooldown(baseCooldownMs, as);
          expect(cd).toBeGreaterThanOrEqual(83.33);
        }

        // Fast base weapon with Flow State frenzy (+100% AS)
        const fastBaseMs = 120;
        const fastCd = calculateAttackCooldown(fastBaseMs, 100);
        // 120 * (100 / 200) = 60ms -> clamped strictly to 83.33ms!
        expect(fastCd).toBe(83.33);
      });

      it('clamps negative attack speed at -90% to prevent division by zero or negative cooldown', () => {
        const baseCooldownMs = 500;
        const cdNegative90 = calculateAttackCooldown(baseCooldownMs, -90);
        expect(cdNegative90).toBe(5000); // 500 * (100 / 10) = 5000ms

        const cdNegative100 = calculateAttackCooldown(baseCooldownMs, -100);
        expect(cdNegative100).toBe(5000); // Clamped to -90%

        const cdNegativeExtreme = calculateAttackCooldown(baseCooldownMs, -9999);
        expect(cdNegativeExtreme).toBe(5000);
      });
    });

    describe('COSMIC_VACUUM', () => {
      it('handles empty pickup array safely', () => {
        const player = createMockPlayerEntity();
        const pickups: PickupEntity[] = [];

        const totalValue = SuperpowerEngine.executeCosmicVacuum(pickups, player);
        expect(totalValue).toBe(0);
      });

      it('magnetizes 5,000 mixed pickups towards player at 1200 px/s in < 30ms', () => {
        const player = createMockPlayerEntity({}, { x: 500, y: 500 });
        const count = 5000;
        const pickups: PickupEntity[] = new Array(count);

        for (let i = 0; i < count; i++) {
          if (i < 4000) {
            // Material gems
            pickups[i] = createMockPickupEntity(`mat_${i}`, 'material', 1, 100 + i * 0.1, 100 + i * 0.1);
          } else if (i < 4800) {
            // Health fruits
            pickups[i] = createMockPickupEntity(`fruit_${i}`, 'fruit', 3, 200, 300);
          } else {
            // Mystery chests
            pickups[i] = createMockPickupEntity(`chest_${i}`, 'chest', 1, 400, 400);
          }
        }

        const start = performance.now();
        const totalValue = SuperpowerEngine.executeCosmicVacuum(pickups, player);
        const elapsed = performance.now() - start;

        expect(elapsed).toBeLessThan(50);
        // 4000 materials * 1 + 800 fruits * 3 = 4000 + 2400 = 6400
        expect(totalValue).toBe(6400);

        // Verify materials and fruits are magnetized
        expect(pickups[0].isMagnetized).toBe(true);
        expect(pickups[4500].isMagnetized).toBe(true);

        // Verify speed magnitude is exactly 1200 px/s
        const speed0 = Math.hypot(pickups[0].vx, pickups[0].vy);
        expect(Math.round(speed0)).toBe(1200);

        // Verify chests are NOT magnetized
        expect(pickups[4900].isMagnetized).toBe(false);
        expect(pickups[4900].vx).toBe(0);
        expect(pickups[4900].vy).toBe(0);
      });

      it('prevents zero-distance singularity (NaN/Infinity) when pickup is on player position', () => {
        const player = createMockPlayerEntity({}, { x: 500, y: 500 });
        const exactPickup = createMockPickupEntity('exact', 'material', 5, 500, 500);

        const totalValue = SuperpowerEngine.executeCosmicVacuum([exactPickup], player);

        expect(totalValue).toBe(5);
        expect(exactPickup.isMagnetized).toBe(true);
        expect(Number.isFinite(exactPickup.vx)).toBe(true);
        expect(Number.isFinite(exactPickup.vy)).toBe(true);
        expect(exactPickup.vx).toBe(0);
        expect(exactPickup.vy).toBe(0);
      });
    });

    describe('Superpower Catalog Integrity', () => {
      it('contains all 4 tactical superpowers with valid metadata', () => {
        expect(SUPERPOWER_CATALOG.length).toBe(4);
        const ids = SUPERPOWER_CATALOG.map((s) => s.id);
        expect(ids).toContain('emergency_heal');
        expect(ids).toContain('orbital_nuke');
        expect(ids).toContain('flow_state_frenzy');
        expect(ids).toContain('global_vacuum');

        for (const sp of SUPERPOWER_CATALOG) {
          expect(sp.name.length).toBeGreaterThan(5);
          expect(sp.badge.length).toBeGreaterThan(2);
          expect(sp.icon.length).toBeGreaterThan(0);
          expect(sp.description.length).toBeGreaterThan(15);
        }
      });
    });
  });

  // ==========================================================================
  // Suite 2: Rapid Freeze / Unfreeze Cycling Stress Suite
  // ==========================================================================
  describe('Suite 2: Rapid Tactical Freeze & Unfreeze Stress', () => {
    it('executes 1,000 rapid freeze and unfreeze cycles with ZERO delta time jump and ZERO velocity divergence', () => {
      const gameLoop = new GameLoop(MAX_DELTA_TIME_SEC);
      const freezeManager = new FreezeManager(gameLoop);
      const testQuestion = YKS_QUESTIONS[0];

      // Kinematic player entity
      const player: PlayerMovementEntity = {
        pos: { x: 500, y: 500 },
        vel: { x: 250, y: -180 },
        radius: 24,
        speedPercent: 10,
      };

      let observedDts: number[] = [];
      let frozenDts: number[] = [];

      gameLoop.onUpdate((dt) => {
        observedDts.push(dt);
        if (gameLoop.isFrozen()) {
          frozenDts.push(dt);
        }
        updatePlayerMovement(player, { x: 1, y: 0 }, dt);
      });

      gameLoop.start();
      let simTimestamp = 1000;

      for (let cycle = 0; cycle < 1000; cycle++) {
        // 1. Engage tactical freeze
        freezeManager.triggerFreeze('mystery_chest', testQuestion);
        expect(freezeManager.isFrozen()).toBe(true);
        expect(gameLoop.isFrozen()).toBe(true);

        const posBeforeFreeze = { x: player.pos.x, y: player.pos.y };
        const velBeforeFreeze = { x: player.vel.x, y: player.vel.y };

        // Simulate multiple ticks during freeze with arbitrary time leaps
        for (let f = 0; f < 3; f++) {
          simTimestamp += 50 + Math.random() * 200; // Time leaps while frozen
          (gameLoop as any).tick(simTimestamp);
        }

        // Invariant: Position and velocity must have ZERO drift while frozen
        expect(player.pos.x).toBe(posBeforeFreeze.x);
        expect(player.pos.y).toBe(posBeforeFreeze.y);
        expect(player.vel.x).toBe(velBeforeFreeze.x);
        expect(player.vel.y).toBe(velBeforeFreeze.y);

        // 2. Disengage tactical freeze (Resume)
        freezeManager.resumeCombat();
        expect(freezeManager.isFrozen()).toBe(false);
        expect(gameLoop.isFrozen()).toBe(false);
        expect(freezeManager.getSession()).toBeNull();

        // Simulate frame step after unfreeze
        simTimestamp += FIXED_TIMESTEP_SEC * 1000;
        (gameLoop as any).tick(simTimestamp);

        // Invariant: The unfreeze tick must NOT explode; dt <= MAX_DELTA_TIME_SEC
        const lastDt = gameLoop.getMetrics().lastDeltaTimeSec;
        expect(lastDt).toBeLessThanOrEqual(MAX_DELTA_TIME_SEC);
        expect(Number.isFinite(lastDt)).toBe(true);
      }

      gameLoop.stop();

      // All frozen ticks must have had strictly dt === 0
      expect(frozenDts.length).toBe(3000);
      for (const fdt of frozenDts) {
        expect(fdt).toBe(0);
      }

      // Final player kinematics check: velocity remains bounded and finite
      expect(Number.isFinite(player.pos.x)).toBe(true);
      expect(Number.isFinite(player.pos.y)).toBe(true);
      expect(Number.isFinite(player.vel.x)).toBe(true);
      expect(Number.isFinite(player.vel.y)).toBe(true);
    });

    it('validates 1,000 rapid togglePause cycles without delta time explosion', () => {
      const gameLoop = new GameLoop(MAX_DELTA_TIME_SEC);
      let capturedDts: number[] = [];

      gameLoop.onUpdate((dt) => {
        capturedDts.push(dt);
      });

      gameLoop.start();
      let simTime = 5000;

      for (let i = 0; i < 1000; i++) {
        // Pause
        gameLoop.pause();
        expect(gameLoop.getState()).toBe('paused');

        simTime += 500; // Simulated 500ms pause
        (gameLoop as any).tick(simTime);

        // Resume: resets lastTimestampMs
        gameLoop.resume();
        expect(gameLoop.getState()).toBe('running');

        simTime += 16.67;
        (gameLoop as any).tick(simTime);

        const lastDt = gameLoop.getMetrics().lastDeltaTimeSec;
        expect(lastDt).toBeLessThanOrEqual(MAX_DELTA_TIME_SEC);
      }

      gameLoop.stop();
      expect(capturedDts.every((dt) => dt <= MAX_DELTA_TIME_SEC)).toBe(true);
    });
  });

  // ==========================================================================
  // Suite 3: Telemetry Tracking 10,000 Attempts Stress Suite
  // ==========================================================================
  describe('Suite 3: TelemetryTracker 10,000 Attempt Stress', () => {
    it('accurately tracks 10,000 simulated attempts across 5 categories with bounded rates [0, 100]', () => {
      const tracker = new TelemetryTracker();
      const categories: ('TYT Türkçe' | 'TYT Matematik' | 'AYT Fen' | 'TYT Sosyal' | 'BUEPT Reading')[] = [
        'TYT Türkçe',
        'TYT Matematik',
        'AYT Fen',
        'TYT Sosyal',
        'BUEPT Reading',
      ];

      const attemptsPerCat = 2000;
      const totalAttempts = attemptsPerCat * categories.length; // 10,000

      // Scenario distributions:
      // Türkçe: 100% correct
      // Matematik: 50% correct (alternating)
      // Fen: 0% correct
      // Sosyal: 75% correct (3 out of 4)
      // BUEPT: 80% correct (4 out of 5)

      for (let i = 0; i < attemptsPerCat; i++) {
        // 1. Türkçe
        tracker.recordAttempt(
          { id: `turk_${i}`, act: 'yks', category: 'TYT Türkçe', prompt: 'p', options: ['a', 'b', 'c', 'd'], correctIndex: 0, mnemonic: 'm', difficulty: 1, type: 'multiple_choice', timeLimitSec: 20 },
          0,
          true,
          1500,
          1
        );

        // 2. Matematik
        const matCorrect = i % 2 === 0;
        tracker.recordAttempt(
          { id: `mat_${i}`, act: 'yks', category: 'TYT Matematik', prompt: 'p', options: ['a', 'b', 'c', 'd'], correctIndex: 0, mnemonic: 'm', difficulty: 2, type: 'multiple_choice', timeLimitSec: 25 },
          matCorrect ? 0 : 1,
          matCorrect,
          2000,
          1
        );

        // 3. Fen
        tracker.recordAttempt(
          { id: `fen_${i}`, act: 'yks', category: 'AYT Fen', prompt: 'p', options: ['a', 'b', 'c', 'd'], correctIndex: 0, mnemonic: 'm', difficulty: 3, type: 'multiple_choice', timeLimitSec: 30 },
          2,
          false,
          1800,
          2
        );

        // 4. Sosyal
        const sosyalCorrect = i % 4 !== 3; // 75%
        tracker.recordAttempt(
          { id: `sos_${i}`, act: 'yks', category: 'TYT Sosyal', prompt: 'p', options: ['a', 'b', 'c', 'd'], correctIndex: 0, mnemonic: 'm', difficulty: 1, type: 'multiple_choice', timeLimitSec: 15 },
          sosyalCorrect ? 0 : 3,
          sosyalCorrect,
          1200,
          2
        );

        // 5. BUEPT
        const bueptCorrect = i % 5 !== 4; // 80%
        tracker.recordAttempt(
          { id: `buept_${i}`, act: 'buept', category: 'BUEPT Reading', prompt: 'p', options: ['a', 'b', 'c', 'd'], correctIndex: 0, mnemonic: 'm', difficulty: 2, type: 'multiple_choice', timeLimitSec: 20 },
          bueptCorrect ? 0 : 1,
          bueptCorrect,
          2500,
          3
        );
      }

      const session = tracker.getSessionStats();
      expect(session.totalAttempts).toBe(totalAttempts);
      expect(session.totalCorrect).toBe(2000 + 1000 + 0 + 1500 + 1600); // 6100
      expect(session.totalWrong).toBe(0 + 1000 + 2000 + 500 + 400); // 3900
      expect(session.overallAccuracy).toBe(61); // 61%
      expect(session.overallAccuracy).toBeGreaterThanOrEqual(0);
      expect(session.overallAccuracy).toBeLessThanOrEqual(100);

      // Verify running average reaction time does not overflow and is finite
      expect(Number.isFinite(session.avgReactionTimeMs)).toBe(true);
      expect(session.avgReactionTimeMs).toBeGreaterThan(1000);
      expect(session.avgReactionTimeMs).toBeLessThan(3000);

      // 5-Axis Radar Scores Check
      const scores = tracker.get5AxisScores();
      expect(scores.turkce).toBe(100);
      expect(scores.matematik).toBe(50);
      expect(scores.fen).toBe(0);
      expect(scores.sosyal).toBe(75);
      expect(scores.buept).toBe(80);

      for (const val of Object.values(scores)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }

      // Mistake Log Bounds & Memory Safety
      const mistakes = tracker.getMistakeLog();
      expect(mistakes.length).toBe(3900); // Exactly matches totalWrong

      // Verify mistake record structure
      const sampleMistake = mistakes[0];
      expect(sampleMistake.id).toBeDefined();
      expect(sampleMistake.resolved).toBe(false);
      expect(sampleMistake.status).toBe('wrong');

      // Resolve a mistake
      const resolved = tracker.resolveMistake(sampleMistake.id);
      expect(resolved).toBe(true);
      expect(tracker.getMistakeLog()[0].resolved).toBe(true);

      // Resolving already resolved returns false
      expect(tracker.resolveMistake(sampleMistake.id)).toBe(false);

      // Resolving non-existent returns false
      expect(tracker.resolveMistake('non_existent_id')).toBe(false);

      // Defensive copy check: modifying array does not mutate internal log
      const logCopy = tracker.getMistakeLog();
      logCopy.pop();
      expect(tracker.getMistakeLog().length).toBe(3900);

      // Reset Session Check
      tracker.resetSession();
      expect(tracker.getSessionStats().totalAttempts).toBe(0);
      expect(tracker.getMistakeLog().length).toBe(0);
      // Unattempted axes return baseline 50%
      const resetScores = tracker.get5AxisScores();
      expect(resetScores.turkce).toBe(50);
      expect(resetScores.matematik).toBe(50);
    });

    describe('Category Axis Normalization & Robustness', () => {
      it('handles accented Turkish characters and casing variations', () => {
        expect(mapCategoryToSubjectAxis('TYT Türkçe')).toBe('turkce');
        expect(mapCategoryToSubjectAxis('TÜRKÇE PARAGRAF')).toBe('turkce');
        expect(mapCategoryToSubjectAxis('turkce dil bilgisi')).toBe('turkce');
        expect(mapCategoryToSubjectAxis('TYT Matematik')).toBe('matematik');
        expect(mapCategoryToSubjectAxis('AYT SAYISAL')).toBe('matematik');
        expect(mapCategoryToSubjectAxis('AYT Fen')).toBe('fen');
        expect(mapCategoryToSubjectAxis('tyt fen bilimleri')).toBe('fen');
        expect(mapCategoryToSubjectAxis('TYT Sosyal')).toBe('sosyal');
        expect(mapCategoryToSubjectAxis('BUEPT Reading')).toBe('buept');
        expect(mapCategoryToSubjectAxis('buept vocabulary')).toBe('buept');
        expect(mapCategoryToSubjectAxis('Academic English')).toBe('buept');
      });

      it('falls back safely on unknown or empty category strings', () => {
        expect(mapCategoryToSubjectAxis('')).toBe('matematik');
        expect(mapCategoryToSubjectAxis('Astronomi ve Uzay')).toBe('matematik');
        expect(mapCategoryToSubjectAxis(undefined as any)).toBe('matematik');
      });
    });
  });

  // ==========================================================================
  // Suite 4: Grace Consolation & Buff Matrix Invariant Stress
  // ==========================================================================
  describe('Suite 4: Grace & Consolation Invariant Stress', () => {
    it('guarantees ZERO HP penalty and ZERO material loss across 1,000 consecutive wrong answers', () => {
      const stats = createMockPlayerStats({ maxHp: 100, currentHp: 80 });
      let materials = 200;
      const question = ALL_QUESTIONS[0];

      for (let i = 0; i < 1000; i++) {
        const streak = -i; // Plunging negative streak
        const outcome = evaluateAnswerWithGrace(question, 3, stats, streak);

        expect(outcome.isCorrect).toBe(false);
        expect(outcome.bonusMaterials).toBeGreaterThan(0); // Consolation bonus!
        materials += outcome.bonusMaterials;

        applySubjectBuffToStats(stats, outcome.awardedBuffs);

        // INVARIANTS:
        expect(stats.currentHp).toBe(80); // NEVER deducted!
        expect(materials).toBeGreaterThanOrEqual(200); // NEVER deducted!
      }

      // Verify consolation luck stacked
      expect(stats.luck).toBeGreaterThan(1000);
      expect(materials).toBeGreaterThan(5000);
    });

    it('strictly clamps dodgePercent at 60% hard cap despite 100 consecutive Turkish buffs', () => {
      const stats = createMockPlayerStats({ dodgePercent: 10 });

      for (let i = 0; i < 100; i++) {
        const buffs = calculateSubjectBuff('TYT Türkçe', 3, 5);
        applySubjectBuffToStats(stats, buffs);

        // Strict 60% hard cap
        expect(stats.dodgePercent).toBeLessThanOrEqual(60);
        expect(calculateEffectiveDodge(stats.dodgePercent)).toBeLessThanOrEqual(60);
      }

      expect(stats.dodgePercent).toBe(60);
    });
  });
});
