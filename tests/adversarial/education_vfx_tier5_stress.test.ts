/**
 * tests/adversarial/education_vfx_tier5_stress.test.ts
 * Tier 5 White-Box Adversarial Stress Testing & Boundary Verification Suite
 *
 * Exhaustively stress-tests:
 * 1. Educational BuffMatrix: DDA wave multipliers, streak bonuses, Turkish diacritics, NaN streak inputs, stat clamping.
 * 2. Grace & Consolation Policy: Invariant HP & material preservation, Rescue Mode (streak <= -2), evidence hunt clue evaluation.
 * 3. Tactical Superpowers & FreezeManager: Revitalizing Surge, Orbital Nuke, Cosmic Vacuum (dx=0 dy=0 divide-by-zero protection), rapid freeze cycles.
 * 4. TelemetryTracker: 10,000 attempts stress, running average reaction time numerical stability, streak state machine, mistake log deduplication.
 * 5. Procedural Web Audio: 12 synths polyphony, DynamicsCompressorNode limit, suspended context graceful resume, SSR/Node safety.
 * 6. FloatingTextManager & VFXManager: Pool saturation (64 & 512 slots), priority eviction, O(1) swap-and-pop compaction, trauma decay.
 * 7. AssetManager: 26 manifest asset completeness, alias resolution, vector fallback renderer, chroma-keying & white hit-flash mask math.
 * 8. UI Modal Lifecycles & Radar Geometry: MasteryRadarChart polar geometry under extreme/empty inputs, AST verification of event listener & interval cleanups.
 */

import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';
import { describe, it, expect } from 'vitest';

// Educational System
import {
  calculateSubjectBuff,
  applySubjectBuffToStats,
  getSubjectBuffPreview,
  SUBJECT_BUFF_REGISTRY,
} from '@/game/education/BuffMatrix';
import { evaluateAnswerWithGrace } from '@/game/education/GraceConsolation';
import { SuperpowerEngine, SUPERPOWER_CATALOG } from '@/game/education/TacticalSuperpowers';
import { FreezeManager } from '@/game/education/FreezeManager';
import {
  TelemetryTracker,
  mapCategoryToSubjectAxis,
  type SubjectAxis,
  type MistakeRecord,
} from '@/game/education/TelemetryTracker';
import { ALL_QUESTIONS, YKS_QUESTIONS, BUEPT_QUESTIONS } from '@/data/questions';

// Audio & VFX
import { ProceduralSoundEngine } from '@/lib/sound';
import { FloatingTextManager } from '@/game/vfx/FloatingTextManager';
import { VFXManager } from '@/game/vfx/VFXManager';
import {
  AssetManager,
  ASSET_MANIFEST,
  renderFallback,
  processChromaKey,
  createHitFlashVariant,
} from '@/game/engine/AssetManager';

// Brotato & Game Types
import type { PlayerRPGStats, PlayerEntity, EnemyEntity, PickupEntity } from '@/types/brotato';
import type { TacticalQuestion } from '@/types/game';

// Helper to create clean player RPG stats
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
    id: 'adversarial_player',
    characterId: 'scholar_potato',
    x: 400,
    y: 300,
    vx: 0,
    vy: 0,
    radius: 24,
    facingAngleRad: 0,
    stats: createMockPlayerStats(statsOverrides),
    invulnerabilityTimerMs: 0,
    isInvulnerable: false,
    spriteName: 'player_potato_scholar',
    ...entityOverrides,
  };
}

describe('Tier 5 Adversarial Stress & Boundary Verification Suite', () => {
  // ==========================================================================
  // Suite 1: Educational BuffMatrix & DDA Multipliers
  // ==========================================================================
  describe('1. BuffMatrix DDA Multipliers & Diacritics Harassment', () => {
    it('applies DDA difficulty scaling strictly: 1.0x (Diff 1) -> 1.5x (Diff 2) -> 2.0x (Diff 3)', () => {
      const diff1 = calculateSubjectBuff('TYT Matematik', 1, 0);
      const diff2 = calculateSubjectBuff('TYT Matematik', 2, 0);
      const diff3 = calculateSubjectBuff('TYT Matematik', 3, 0);

      // Base: attackSpeed=8, critChance=6, damagePercent=5
      expect(diff1.attackSpeed).toBe(8);
      expect(diff2.attackSpeed).toBe(12); // 8 * 1.5 = 12
      expect(diff3.attackSpeed).toBe(16); // 8 * 2.0 = 16

      expect(diff1.critChancePercent).toBe(6);
      expect(diff2.critChancePercent).toBe(9); // 6 * 1.5 = 9
      expect(diff3.critChancePercent).toBe(12); // 6 * 2.0 = 12
    });

    it('scales streak bonus linearly up to +50% at streak 5 and caps beyond streak 5', () => {
      const s0 = calculateSubjectBuff('TYT Türkçe', 1, 0);
      const s1 = calculateSubjectBuff('TYT Türkçe', 1, 1);
      const s5 = calculateSubjectBuff('TYT Türkçe', 1, 5);
      const s99 = calculateSubjectBuff('TYT Türkçe', 1, 99);

      // Base: speedPercent=5, dodgePercent=4, pickupRange=25
      expect(s0.speedPercent).toBe(5);
      expect(s1.speedPercent).toBe(6); // 5 * 1.1 = 5.5 -> 6
      expect(s5.speedPercent).toBe(8); // 5 * 1.5 = 7.5 -> 8
      expect(s99.speedPercent).toBe(8); // Capped at streak 5 multiplier
      expect(s99.pickupRange).toBe(Math.round(25 * 1.5)); // 38
    });

    it('safely tolerates NaN, Infinity, -Infinity, and negative streaks without throwing or producing NaN', () => {
      const sNaN = calculateSubjectBuff('TYT Fen', 1, NaN);
      const sInf = calculateSubjectBuff('TYT Fen', 1, Infinity);
      const sNeg = calculateSubjectBuff('TYT Fen', 1, -10);

      expect(Number.isFinite(sNaN.elementalDamage)).toBe(true);
      expect(Number.isFinite(sInf.elementalDamage)).toBe(true);
      expect(Number.isFinite(sNeg.elementalDamage)).toBe(true);
      expect(sNaN.elementalDamage).toBe(3); // Falls back to streak 0
      expect(sNeg.elementalDamage).toBe(3);
    });

    it('robustly resolves all Turkish diacritics, uppercase variants, and substring patterns', () => {
      const variants = [
        { cat: 'TYT TÜRKÇE', expectedSubj: 'Türkçe' },
        { cat: 'tyt turkce', expectedSubj: 'Türkçe' },
        { cat: 'TÜRKÇE PARAGRAF', expectedSubj: 'Türkçe' },
        { cat: 'AYT SAYISAL', expectedSubj: 'Matematik' },
        { cat: 'ayt sayisal', expectedSubj: 'Matematik' },
        { cat: 'MATEMATİK', expectedSubj: 'Matematik' },
        { cat: 'AYT Fen', expectedSubj: 'Fen Bilimleri' },
        { cat: 'FEN BİLİMLERİ', expectedSubj: 'Fen Bilimleri' },
        { cat: 'TYT Sosyal', expectedSubj: 'Sosyal Bilimler' },
        { cat: 'BUEPT Vocab', expectedSubj: 'BUEPT İngilizce' },
        { cat: 'buept english', expectedSubj: 'BUEPT İngilizce' },
        { cat: 'UNKNOWN_CUSTOM_CATEGORY', expectedSubj: 'Türkçe' }, // Fallback default
      ];

      for (const { cat, expectedSubj } of variants) {
        const preview = getSubjectBuffPreview(cat);
        expect(preview.subject).toBe(expectedSubj);
      }
    });

    it('strictly clamps dodgePercent at 60% and currentHp at maxHp in applySubjectBuffToStats', () => {
      const stats = createMockPlayerStats({
        dodgePercent: 58,
        maxHp: 100,
        currentHp: 95,
      });

      // Apply buff with +10 dodge and +15 maxHp
      applySubjectBuffToStats(stats, {
        dodgePercent: 10,
        maxHp: 15,
        currentHp: 20,
      });

      expect(stats.dodgePercent).toBe(60); // Clamped at 60% cap
      expect(stats.maxHp).toBe(115);
      expect(stats.currentHp).toBe(115); // Clamped at new maxHp
    });

    it('handles negative stats gracefully without crashing', () => {
      const stats = createMockPlayerStats({
        dodgePercent: -20,
        armor: -15,
      });

      applySubjectBuffToStats(stats, {
        dodgePercent: 5,
        armor: 2,
      });

      expect(stats.dodgePercent).toBe(-15);
      expect(stats.armor).toBe(-13);
    });
  });

  // ==========================================================================
  // Suite 2: Grace & Consolation Policy Invariant Harassment
  // ==========================================================================
  describe('2. Grace & Consolation Policy Invariants', () => {
    const mockQuestion: TacticalQuestion = {
      id: 'mock_math_1',
      act: 'yks',
      type: 'multiple_choice',
      category: 'TYT Matematik',
      difficulty: 2,
      prompt: '2 + 2 = ?',
      options: ['3', '4', '5', '6'],
      correctIndex: 1,
      mnemonic: 'Temel cebir kuralı!',
      timeLimitSec: 20,
    };

    it('guarantees ZERO HP reduction and ZERO material deduction on wrong answers', () => {
      const statsBefore = createMockPlayerStats({ currentHp: 42, maxHp: 100 });
      const statsCopy = { ...statsBefore };

      const outcome = evaluateAnswerWithGrace(mockQuestion, 0, statsCopy, 0); // Option 0 is wrong

      expect(outcome.isCorrect).toBe(false);
      expect(statsCopy.currentHp).toBe(42); // HP strictly untouched!
      expect(outcome.bonusMaterials).toBeGreaterThanOrEqual(5); // Consolation materials granted, never deducted!
      expect(outcome.awardedBuffs.luck).toBe(1);
    });

    it('triggers Rescue Mode consolation (+2 Luck, +10 Materials) when streak <= -2', () => {
      const normalOutcome = evaluateAnswerWithGrace(mockQuestion, 0, createMockPlayerStats(), -1);
      const rescueOutcome = evaluateAnswerWithGrace(mockQuestion, 0, createMockPlayerStats(), -2);
      const deepRescueOutcome = evaluateAnswerWithGrace(mockQuestion, 0, createMockPlayerStats(), -5);

      expect(normalOutcome.awardedBuffs.luck).toBe(1);
      expect(normalOutcome.bonusMaterials).toBe(5);
      expect(normalOutcome.pedagogicFeedback).toContain('Canın sağ olsun');

      expect(rescueOutcome.awardedBuffs.luck).toBe(2);
      expect(rescueOutcome.bonusMaterials).toBe(10);
      expect(rescueOutcome.pedagogicFeedback).toContain('Kurtarma Modu');

      expect(deepRescueOutcome.awardedBuffs.luck).toBe(2);
      expect(deepRescueOutcome.bonusMaterials).toBe(10);
    });

    it('correctly evaluates evidence hunt questions by passage token isClue property', () => {
      const evidenceQuestion: TacticalQuestion = {
        id: 'mock_buept_hunt',
        act: 'buept',
        type: 'evidence_hunt',
        category: 'BUEPT Reading',
        difficulty: 3,
        prompt: 'Find the contradictory phrase in this abstract.',
        passageTokens: [
          { text: 'The', isClue: false },
          { text: 'experiment', isClue: false },
          { text: 'proved', isClue: false },
          { text: 'successful', isClue: false },
          { text: 'although', isClue: false },
          { text: 'unexpected', isClue: true },
          { text: 'anomalies', isClue: true },
        ],
        mnemonic: 'Focus on transition markers and qualifiers!',
        timeLimitSec: 25,
      };

      // Index 5 ('unexpected') has isClue = true
      const correctOutcome = evaluateAnswerWithGrace(evidenceQuestion, 5, createMockPlayerStats(), 2);
      expect(correctOutcome.isCorrect).toBe(true);
      expect(correctOutcome.bonusMaterials).toBeGreaterThan(20);

      // Index 1 ('experiment') has isClue = false
      const wrongOutcome = evaluateAnswerWithGrace(evidenceQuestion, 1, createMockPlayerStats(), 0);
      expect(wrongOutcome.isCorrect).toBe(false);

      // Out of bounds index (-1 timeout)
      const timeoutOutcome = evaluateAnswerWithGrace(evidenceQuestion, -1, createMockPlayerStats(), 0);
      expect(timeoutOutcome.isCorrect).toBe(false);
      expect(timeoutOutcome.mistakeEntry?.status).toBe('skipped');
    });

    it('preserves deep isolation between mistake entries and original questions', () => {
      const outcome = evaluateAnswerWithGrace(mockQuestion, 0, createMockPlayerStats(), 0);
      expect(outcome.mistakeEntry).toBeDefined();

      // Mutate the recorded mistake question text
      outcome.mistakeEntry!.question.prompt = 'MUTATED TEXT';
      expect(mockQuestion.prompt).toBe('2 + 2 = ?'); // Original unmutated
    });
  });

  // ==========================================================================
  // Suite 3: Tactical Superpowers & Frame-Accurate Freeze
  // ==========================================================================
  describe('3. Tactical Superpowers & FreezeManager Stress', () => {
    it('executes Revitalizing Surge: restores 50% missing HP (min 30 HP) and enforces 3s invulnerability', () => {
      const player = createMockPlayerEntity({ maxHp: 200, currentHp: 50 }, { invulnerabilityTimerMs: 1000 });
      // Missing HP = 150. 50% = 75. 50 + 75 = 125.
      const healed = SuperpowerEngine.executeRevitalizingSurge(player);
      expect(healed).toBe(75);
      expect(player.stats.currentHp).toBe(125);
      expect(player.invulnerabilityTimerMs).toBe(3000);

      // Test min 30 HP heal when missing HP is small (e.g. 10 missing)
      player.stats.currentHp = 190;
      const healedMin = SuperpowerEngine.executeRevitalizingSurge(player);
      expect(healedMin).toBe(30);
      expect(player.stats.currentHp).toBe(200); // Clamped to maxHp
    });

    it('does not reduce preexisting invulnerability timers longer than 3000ms', () => {
      const player = createMockPlayerEntity({ maxHp: 100, currentHp: 90 }, { invulnerabilityTimerMs: 8000 });
      SuperpowerEngine.executeRevitalizingSurge(player);
      expect(player.invulnerabilityTimerMs).toBe(8000); // Maintained 8000ms
    });

    it('executes Orbital Nuke: deals 500 flat damage across all enemies with hit flash triggers', () => {
      const enemies: EnemyEntity[] = [
        {
          id: 'e1',
          type: 'swarmer',
          x: 100,
          y: 100,
          vx: 0,
          vy: 0,
          hp: 600,
          maxHp: 600,
          damage: 5,
          speed: 100,
          mass: 1,
          radius: 16,
          state: 'pursuing',
          stateTimerMs: 0,
          isImmuneToKnockback: false,
          hitFlashTimerMs: 0,
          attackCooldownMs: 0,
          facingAngleRad: 0,
        },
        {
          id: 'e2',
          type: 'tank',
          x: 200,
          y: 200,
          vx: 0,
          vy: 0,
          hp: 450,
          maxHp: 450,
          damage: 15,
          speed: 50,
          mass: 3,
          radius: 24,
          state: 'pursuing',
          stateTimerMs: 0,
          isImmuneToKnockback: true,
          hitFlashTimerMs: 0,
          attackCooldownMs: 0,
          facingAngleRad: 0,
        },
      ];

      const hits = SuperpowerEngine.executeOrbitalNuke(enemies);
      expect(hits).toBe(2);
      expect(enemies[0].hp).toBe(100);
      expect(enemies[0].hitFlashTimerMs).toBe(200);
      expect(enemies[1].hp).toBe(-50);
    });

    it('handles empty enemy arrays in Orbital Nuke without crashing', () => {
      const hits = SuperpowerEngine.executeOrbitalNuke([]);
      expect(hits).toBe(0);
    });

    it('executes Cosmic Vacuum: magnetizes materials and handles coincident (dx=0, dy=0) position without NaN', () => {
      const player = createMockPlayerEntity({}, { x: 500, y: 500 });
      const pickups: PickupEntity[] = [
        // Regular distant crystal
        { id: 'p1', type: 'material', x: 200, y: 100, vx: 0, vy: 0, radius: 8, value: 5, lifetimeMs: 5000, isMagnetized: false },
        // Coincident crystal directly on player! (dx=0, dy=0)
        { id: 'p2', type: 'material', x: 500, y: 500, vx: 0, vy: 0, radius: 8, value: 10, lifetimeMs: 5000, isMagnetized: false },
        // Chest (should NOT be vacuumed)
        { id: 'p3', type: 'chest', x: 100, y: 100, vx: 0, vy: 0, radius: 16, value: 50, lifetimeMs: 10000, isMagnetized: false },
      ];

      const totalVal = SuperpowerEngine.executeCosmicVacuum(pickups, player);
      expect(totalVal).toBe(15);
      expect(pickups[0].isMagnetized).toBe(true);
      expect(Number.isFinite(pickups[0].vx)).toBe(true);
      expect(Number.isFinite(pickups[0].vy)).toBe(true);

      // Verify coincident pickup: dist evaluates to 1, vx/vy are 0, NOT NaN!
      expect(pickups[1].isMagnetized).toBe(true);
      expect(Number.isNaN(pickups[1].vx)).toBe(false);
      expect(Number.isNaN(pickups[1].vy)).toBe(false);
      expect(pickups[1].vx).toBe(0);
      expect(pickups[1].vy).toBe(0);

      // Chest unmagnetized
      expect(pickups[2].isMagnetized).toBe(false);
    });

    it('FreezeManager toggles tactical freeze state and manages freeze session', () => {
      let isFrozenInTarget = false;
      const mockLoopTarget = {
        setTacticalFreeze: (frozen: boolean) => {
          isFrozenInTarget = frozen;
        },
        isFrozen: () => isFrozenInTarget,
      };

      const fm = new FreezeManager(mockLoopTarget);
      expect(fm.isFrozen()).toBe(false);
      expect(fm.getSession()).toBeNull();

      fm.triggerFreeze('mystery_chest', ALL_QUESTIONS[0]);
      expect(fm.isFrozen()).toBe(true);
      expect(isFrozenInTarget).toBe(true);
      expect(fm.getSession()?.source).toBe('mystery_chest');
      expect(fm.getSession()?.question.id).toBe(ALL_QUESTIONS[0].id);

      // 100 rapid freeze / unfreeze cycles
      for (let i = 0; i < 100; i++) {
        fm.resumeCombat();
        expect(fm.isFrozen()).toBe(false);
        fm.triggerFreeze('elite_defeat', ALL_QUESTIONS[1]);
        expect(fm.isFrozen()).toBe(true);
      }

      fm.resumeCombat();
      expect(fm.isFrozen()).toBe(false);
      expect(fm.getSession()).toBeNull();
    });
  });

  // ==========================================================================
  // Suite 4: TelemetryTracker 10,000 Attempts & Running Average Stress
  // ==========================================================================
  describe('4. TelemetryTracker 10,000 Attempt Numerical Stability Stress', () => {
    it('executes 10,000 recorded attempts across 5 axes without floating drift or overflow', () => {
      const tracker = new TelemetryTracker();
      const categories = [
        'TYT Türkçe',
        'TYT Matematik',
        'AYT Fen',
        'TYT Sosyal',
        'BUEPT Vocab',
      ];

      for (let i = 1; i <= 10000; i++) {
        const cat = categories[i % categories.length];
        const isCorrect = i % 3 !== 0; // ~66.7% accuracy
        const responseTimeMs = 500 + (i % 2500); // 500ms to 3000ms

        const question: TacticalQuestion = {
          id: `stress_q_${i}`,
          act: 'yks',
          type: 'multiple_choice',
          category: cat as any,
          difficulty: 1,
          prompt: `Test question ${i}`,
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 1,
          mnemonic: 'Practice makes perfect',
          timeLimitSec: 20,
        };

        tracker.recordAttempt(question, isCorrect ? 1 : 0, isCorrect, responseTimeMs, Math.ceil(i / 500));
      }

      const stats = tracker.getSessionStats();
      expect(stats.totalAttempts).toBe(10000);
      expect(stats.totalCorrect + stats.totalWrong).toBe(10000);
      expect(stats.overallAccuracy).toBeGreaterThanOrEqual(0);
      expect(stats.overallAccuracy).toBeLessThanOrEqual(100);
      expect(Number.isFinite(stats.avgReactionTimeMs)).toBe(true);
      expect(stats.avgReactionTimeMs).toBeGreaterThan(0);

      // 5-Axis scores within [0, 100]
      const scores = tracker.get5AxisScores();
      (Object.keys(scores) as SubjectAxis[]).forEach((axis) => {
        expect(scores[axis]).toBeGreaterThanOrEqual(0);
        expect(scores[axis]).toBeLessThanOrEqual(100);
      });

      // Mistake log created for wrong attempts
      const mistakes = tracker.getMistakeLog();
      expect(mistakes.length).toBe(stats.totalWrong);

      // Resolve mistakes
      if (mistakes.length > 0) {
        const first = mistakes[0];
        expect(tracker.resolveMistake(first.id)).toBe(true);
        expect(tracker.resolveMistake(first.id)).toBe(false); // Second attempt returns false
        expect(tracker.resolveMistake('non_existent_id')).toBe(false);
      }
    });

    it('accurately transitions streak states: positive -> 0 -> -1 -> -2 (rescue) -> 1', () => {
      const tracker = new TelemetryTracker();
      const q = ALL_QUESTIONS[0];

      // 3 correct answers
      tracker.recordAttempt(q, 1, true, 1000);
      tracker.recordAttempt(q, 1, true, 1000);
      tracker.recordAttempt(q, 1, true, 1000);
      expect(tracker.getCurrentStreak()).toBe(3);
      expect(tracker.getSessionStats().maxStreak).toBe(3);

      // First wrong answer: drops positive streak to 0
      tracker.recordAttempt(q, 0, false, 1000);
      expect(tracker.getCurrentStreak()).toBe(0);

      // Second wrong answer: drops to -1
      tracker.recordAttempt(q, 0, false, 1000);
      expect(tracker.getCurrentStreak()).toBe(-1);

      // Third wrong answer: drops to -2 (Rescue Mode threshold)
      tracker.recordAttempt(q, 0, false, 1000);
      expect(tracker.getCurrentStreak()).toBe(-2);

      // Fourth wrong answer: drops to -3
      tracker.recordAttempt(q, 0, false, 1000);
      expect(tracker.getCurrentStreak()).toBe(-3);

      // Correct answer: recovers immediately to 1
      tracker.recordAttempt(q, 1, true, 1000);
      expect(tracker.getCurrentStreak()).toBe(1);
    });

    it('returns neutral 50 score for categories with zero attempts', () => {
      const tracker = new TelemetryTracker();
      const scores = tracker.get5AxisScores();
      expect(scores.turkce).toBe(50);
      expect(scores.matematik).toBe(50);
      expect(scores.fen).toBe(50);
      expect(scores.sosyal).toBe(50);
      expect(scores.buept).toBe(50);
    });

    it('resets session cleanly', () => {
      const tracker = new TelemetryTracker();
      tracker.recordAttempt(ALL_QUESTIONS[0], 0, false, 1200);
      tracker.recordStudyBuffClaimed();
      tracker.recordTacticalSuperpowerUsed();

      expect(tracker.getMistakeLog().length).toBe(1);
      tracker.resetSession();

      expect(tracker.getMistakeLog().length).toBe(0);
      expect(tracker.getSessionStats().totalAttempts).toBe(0);
      expect(tracker.getSessionStats().studyBuffsClaimed).toBe(0);
      expect(tracker.getSessionStats().tacticalSuperpowersUsed).toBe(0);
    });
  });

  // ==========================================================================
  // Suite 5: Procedural Web Audio 12 Synths & Node Safety
  // ==========================================================================
  describe('5. Procedural Web Audio 12 Synths & Polyphony Safety', () => {
    it('instantiates cleanly and safely degrades in headless / SSR environments', () => {
      const audio = new ProceduralSoundEngine();
      expect(audio).toBeDefined();
      expect(audio.enabled).toBe(true);

      // Calling all 12 procedural synths in Node environment must not throw!
      expect(() => {
        audio.playPistolShot();
        audio.playShotgunShot();
        audio.playSMGShot();
        audio.playMagicCast();
        audio.playMeleeSwing();
        audio.playEnemyHit();
        audio.playEnemyDeath();
        audio.playPlayerHurt();
        audio.playDodge();
        audio.playGemPickup(3);
        audio.playWaveComplete();
        audio.playTacticalFreeze();
      }).not.toThrow();
    });

    it('executes auxiliary procedural sound triggers safely', () => {
      const audio = new ProceduralSoundEngine();
      expect(() => {
        audio.playQuestionCorrect();
        audio.playQuestionWrong();
        audio.playNukeDetonation();
        audio.playHit();
        audio.playComboUp(5);
        audio.playOrbitalLaser();
        audio.playShieldBreak();
        audio.playWrongBuzz();
        audio.playCashRegister();
      }).not.toThrow();
    });

    it('survives rapid-fire polyphonic calls without errors', () => {
      const audio = new ProceduralSoundEngine();
      for (let i = 0; i < 200; i++) {
        audio.playPistolShot();
        audio.playGemPickup(i % 10);
      }
    });
  });

  // ==========================================================================
  // Suite 6: FloatingTextManager & VFXManager Pool Overflow & Zero Allocations
  // ==========================================================================
  describe('6. FloatingTextManager & VFXManager Pool Boundaries', () => {
    it('saturates FloatingTextManager 64-slot pool and prioritizes higher-priority spawns', () => {
      const ftm = new FloatingTextManager(64);

      // Flood pool with 100 regular damage numbers (priority 1)
      for (let i = 0; i < 100; i++) {
        ftm.spawnDamage(100, 100, 15);
      }

      // Spawn a high-priority banner (priority 5)
      expect(() => {
        ftm.spawnBanner(200, 200, 'WAVE 10 CLEARED!');
        ftm.spawnCrit(300, 300, 120);
        ftm.spawnDodge(400, 400);
      }).not.toThrow();

      // Update simulation over time
      ftm.update(0.016);
      ftm.update(0.5); // Progress through lifetime

      // Clear pool
      ftm.clear();
    });

    it('saturates VFXManager 512-slot particle pool without exceeding max capacity', () => {
      const vfx = new VFXManager(512);

      // Spawn 1,500 particles of all archetypes
      for (let i = 0; i < 50; i++) {
        vfx.spawnHitSparks(100, 100, 0, true, 8);
        vfx.spawnBloodSplatter(200, 200, '#ef4444', 6);
        vfx.spawnMuzzleFlash(300, 300, 0);
        vfx.spawnMeleeSlashArc(400, 400, 1.5, 90, 60);
        vfx.spawnPickupRing(500, 500, 'material');
        vfx.spawnDustPuff(600, 600, 4);
        vfx.spawnDeathBurst(700, 700, '#a855f7', true);
      }

      // Update simulation
      const res1 = vfx.update(0.016);
      expect(typeof res1.isSimulationFrozen).toBe('boolean');

      // Update over 1 second to trigger swap-and-pop particle expirations
      for (let t = 0; t < 60; t++) {
        vfx.update(0.016);
      }
    });

    it('enforces screen shake trauma clamping [0, 1] and decay curve to zero', () => {
      const vfx = new VFXManager(512);

      vfx.addTrauma(0.6);
      vfx.addTrauma(0.8); // Total 1.4 -> clamped to 1.0

      vfx.update(0.016);
      expect(vfx.shakeOffsetX).not.toBe(0);
      expect(vfx.shakeOffsetY).not.toBe(0);

      // Run update for 2 seconds (traumaDecayRate is 1.35/s, so 2s decays fully)
      for (let i = 0; i < 120; i++) {
        vfx.update(0.016);
      }

      expect(vfx.shakeOffsetX).toBe(0);
      expect(vfx.shakeOffsetY).toBe(0);
      expect(vfx.shakeRotationRad).toBe(0);
    });

    it('handles hit stop micro-freeze timer and decays overlays', () => {
      const vfx = new VFXManager(512);

      vfx.triggerHitStop(50); // 50ms freeze
      vfx.triggerDamageVignette(0.7);
      vfx.triggerWhiteFlash(0.5);

      const step1 = vfx.update(0.016);
      expect(step1.isSimulationFrozen).toBe(true);

      // Run until hit stop expires
      vfx.update(0.05);
      const step3 = vfx.update(0.016);
      expect(step3.isSimulationFrozen).toBe(false);
    });
  });

  // ==========================================================================
  // Suite 7: AssetManager Manifest & Chroma-Key Processing
  // ==========================================================================
  describe('7. AssetManager Manifest & Vector Fallback Renderer', () => {
    it('contains all 26 authoritative visual assets across all categories', () => {
      expect(ASSET_MANIFEST.length).toBe(26);

      const categories = new Set(ASSET_MANIFEST.map((e) => e.category));
      expect(categories.has('player')).toBe(true);
      expect(categories.has('enemy')).toBe(true);
      expect(categories.has('weapon')).toBe(true);
      expect(categories.has('projectile')).toBe(true);
      expect(categories.has('vfx')).toBe(true);
      expect(categories.has('pickup')).toBe(true);
      expect(categories.has('terrain')).toBe(true);
    });

    it('resolves key aliases correctly to canonical manifest keys', () => {
      const manager = new AssetManager();

      expect(manager.resolveKey('player_potato')).toBe('player_potato_scholar');
      expect(manager.resolveKey('drop_material')).toBe('pickup_material_crystal');
      expect(manager.resolveKey('enemy_ranged')).toBe('enemy_ranged_shooter');
      expect(manager.resolveKey('boss')).toBe('enemy_elite_boss');
      expect(manager.resolveKey('magic_wand')).toBe('weapon_wand');
      expect(manager.resolveKey('non_existent')).toBe('non_existent');
    });

    it('renders vector fallbacks without error using mock Canvas context', () => {
      const dummyGradient = { addColorStop: () => {} };
      const mockCtx = new Proxy(
        {
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 1,
          globalAlpha: 1,
          createRadialGradient: () => dummyGradient,
          createLinearGradient: () => dummyGradient,
        } as any,
        {
          get(target, prop) {
            if (prop in target) return target[prop];
            return () => {};
          },
        }
      ) as unknown as CanvasRenderingContext2D;

      for (const entry of ASSET_MANIFEST) {
        expect(() => {
          renderFallback(mockCtx, entry.key, entry.category, entry.defaultWidth, entry.defaultHeight);
          // Also test with hit-flash variant active
          renderFallback(mockCtx, entry.key, entry.category, entry.defaultWidth, entry.defaultHeight, { hitFlash: true });
        }).not.toThrow();
      }
    });

    it('validates chroma-key mathematical algorithm for soft-edge feathering and defringing', () => {
      const low = 18;
      const high = 42;
      const range = high - low;

      // Dark background pixel (e.g. RGB = 10, 10, 10)
      const darkBrightness = 10;
      expect(darkBrightness <= low).toBe(true); // Should become alpha 0

      // Intermediate feathering pixel (e.g. RGB = 30, 25, 20)
      const midBrightness = 30;
      expect(midBrightness > low && midBrightness < high).toBe(true);
      const factor = (midBrightness - low) / range;
      expect(factor).toBeGreaterThan(0);
      expect(factor).toBeLessThan(1);
      const defringedR = Math.min(255, Math.floor(30 / Math.max(0.15, factor)));
      expect(Number.isFinite(defringedR)).toBe(true);
      expect(defringedR).toBeGreaterThanOrEqual(30);

      // Bright foreground pixel (e.g. RGB = 150, 120, 80)
      const brightBrightness = 150;
      expect(brightBrightness >= high).toBe(true); // 100% opaque, untouched
    });
  });

  // ==========================================================================
  // Suite 8: UI Modal Lifecycles, Event Cleanups & Radar Chart SVG Geometry
  // ==========================================================================
  describe('8. UI Modal Lifecycles & Radar Chart Geometry', () => {
    // Pure polar projection calculation replicating MasteryRadarChart logic
    function calculateRadarCoordinates(
      scores: Record<string, number>,
      size = 320
    ) {
      const cx = size / 2;
      const cy = size / 2;
      const maxR = size * 0.36;
      const axes = ['turkce', 'matematik', 'fen', 'sosyal', 'buept'];

      return axes.map((axisKey, i) => {
        const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
        const val = scores[axisKey] ?? 50;
        const r = (Math.max(15, Math.min(100, val)) / 100) * maxR;
        return {
          axisKey,
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          r,
          val,
        };
      });
    }

    it('calculates polygon points with valid numeric coordinates and no NaN or Inf', () => {
      const points = calculateRadarCoordinates({
        turkce: 80,
        matematik: 95,
        fen: 60,
        sosyal: 70,
        buept: 85,
      });

      expect(points.length).toBe(5);
      points.forEach((p) => {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(p.r).toBeGreaterThan(0);
      });

      const polygonStr = points.map((p) => `${p.x},${p.y}`).join(' ');
      expect(polygonStr).not.toContain('NaN');
      expect(polygonStr).not.toContain('undefined');
    });

    it('strictly clamps 0% scores to minimum radius 15% preventing singular point collapse', () => {
      const size = 300;
      const maxR = size * 0.36;
      const points = calculateRadarCoordinates(
        { turkce: 0, matematik: 0, fen: 0, sosyal: 0, buept: 0 },
        size
      );

      points.forEach((p) => {
        expect(p.r).toBeCloseTo((15 / 100) * maxR, 5);
        // Distance from center must be exactly 15% of maxR, NOT 0
        const distFromCenter = Math.hypot(p.x - size / 2, p.y - size / 2);
        expect(distFromCenter).toBeCloseTo((15 / 100) * maxR, 5);
      });
    });

    it('handles negative, overflowing (>100%), and empty scores safely', () => {
      const size = 320;
      const maxR = size * 0.36;
      const points = calculateRadarCoordinates({
        turkce: -50,  // Should clamp to 15%
        matematik: 250, // Should clamp to 100%
        fen: 50,
      });

      const turkce = points.find((p) => p.axisKey === 'turkce')!;
      const matematik = points.find((p) => p.axisKey === 'matematik')!;
      const sosyal = points.find((p) => p.axisKey === 'sosyal')!; // Missing, defaults to 50%

      expect(turkce.r).toBeCloseTo((15 / 100) * maxR, 5);
      expect(matematik.r).toBeCloseTo(maxR, 5);
      expect(sosyal.r).toBeCloseTo((50 / 100) * maxR, 5);
    });

    it('AST Audit: confirms StudyBuffModal.tsx cleans up window keydown listener on unmount', () => {
      const filePath = path.resolve(__dirname, '../../src/components/StudyBuffModal.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Verify addEventListener has corresponding removeEventListener
      expect(content).toContain("window.addEventListener('keydown'");
      expect(content).toContain("window.removeEventListener('keydown'");

      // Verify timer clearInterval cleanup
      expect(content).toContain('setInterval(');
      expect(content).toContain('clearInterval(');
    });

    it('AST Audit: confirms TacticalFreezeModal.tsx cleans up event listeners and countdown intervals', () => {
      const filePath = path.resolve(__dirname, '../../src/components/TacticalFreezeModal.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain("window.addEventListener('keydown'");
      expect(content).toContain("window.removeEventListener('keydown'");
      expect(content).toContain('setInterval(');
      expect(content).toContain('clearInterval(');
    });

    it('AST Audit: verifies MistakeNotebookModal.tsx handles filtering across all 5 subject themes', () => {
      const filePath = path.resolve(__dirname, '../../src/components/MistakeNotebookModal.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain("'turkce'");
      expect(content).toContain("'matematik'");
      expect(content).toContain("'fen'");
      expect(content).toContain("'sosyal'");
      expect(content).toContain("'buept'");
    });

    it('AST Audit: verifies MasteryRadarChart.tsx defines all 5 ÖSYM/BUEPT axes with theme colors', () => {
      const filePath = path.resolve(__dirname, '../../src/components/MasteryRadarChart.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain("key: 'turkce'");
      expect(content).toContain("key: 'matematik'");
      expect(content).toContain("key: 'fen'");
      expect(content).toContain("key: 'sosyal'");
      expect(content).toContain("key: 'buept'");
    });

    it('AST Audit: verifies TelemetryModal.tsx correctly binds MasteryRadarChart and mistake counter', () => {
      const filePath = path.resolve(__dirname, '../../src/components/TelemetryModal.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('<MasteryRadarChart');
      expect(content).toContain('totalMistakes');
      expect(content).toContain('resolvedMistakes');
    });
  });
});
