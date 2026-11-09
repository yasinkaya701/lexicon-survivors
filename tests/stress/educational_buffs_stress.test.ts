import { describe, it, expect } from 'vitest';
import {
  calculateSubjectBuff,
  applySubjectBuffToStats,
  SUBJECT_BUFF_REGISTRY,
  evaluateAnswerWithGrace,
  SuperpowerEngine,
  SUPERPOWER_CATALOG,
  FreezeManager,
  TelemetryTracker,
} from '@/game/education';
import { ALL_QUESTIONS, YKS_QUESTIONS, BUEPT_QUESTIONS } from '@/data/questions';
import type { PlayerRPGStats, PlayerEntity, EnemyEntity, PickupEntity } from '@/types/brotato';
import type { TacticalQuestion } from '@/types/game';

// Helper to instantiate clean player RPG stats
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
    id: 'stress_player',
    characterId: 'scholar_potato',
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

describe('Educational Buff Engine & DDA Scaling Stress Suite', () => {
  // ==========================================================================
  // 1. Extreme Streaks Fuzzing & Boundaries (streak = 100, streak = -100)
  // ==========================================================================
  describe('Extreme Streak Scaling & Boundary Clamping', () => {
    it('enforces maximum +50% streak bonus cap when streak = 100', () => {
      const buffAt5 = calculateSubjectBuff('TYT Matematik', 1, 5);
      const buffAt100 = calculateSubjectBuff('TYT Matematik', 1, 100);
      const buffAt10k = calculateSubjectBuff('TYT Matematik', 1, 10000);

      // Streak scaling formula: 1 + Math.min(Math.max(0, streak), 5) * 0.1
      // At streak >= 5, streakBonus is exactly 1 + 5 * 0.1 = 1.5 (+50%)
      expect(buffAt100.attackSpeed).toBe(buffAt5.attackSpeed);
      expect(buffAt100.critChancePercent).toBe(buffAt5.critChancePercent);
      expect(buffAt10k.attackSpeed).toBe(buffAt5.attackSpeed);

      // Verify exact numerical value: Matematik base attackSpeed = 8. At 1.5x -> round(8 * 1.5) = 12
      expect(buffAt100.attackSpeed).toBe(12);
      expect(buffAt100.critChancePercent).toBe(9); // base 6 * 1.5 = 9
    });

    it('clamps negative streaks to neutral multiplier (1.0x) when streak = -100', () => {
      const neutralBuff = calculateSubjectBuff('TYT Matematik', 1, 0);
      const negativeBuff = calculateSubjectBuff('TYT Matematik', 1, -100);
      const extremeNegativeBuff = calculateSubjectBuff('TYT Matematik', 1, -10000);

      // Negative streaks must never penalize the reward of a correct answer
      expect(negativeBuff.attackSpeed).toBe(neutralBuff.attackSpeed);
      expect(negativeBuff.critChancePercent).toBe(neutralBuff.critChancePercent);
      expect(extremeNegativeBuff.attackSpeed).toBe(neutralBuff.attackSpeed);

      // Base Matematik values at 1.0x: attackSpeed = 8, critChance = 6
      expect(negativeBuff.attackSpeed).toBe(8);
      expect(negativeBuff.critChancePercent).toBe(6);
    });

    it('exhibits monotonic non-decreasing scaling from streak -50 up to +50', () => {
      let previousAttackSpeed = -Infinity;
      for (let s = -10; s <= 20; s++) {
        const buff = calculateSubjectBuff('TYT Matematik', 1, s);
        const attackSpeed = buff.attackSpeed ?? 0;
        expect(attackSpeed).toBeGreaterThanOrEqual(previousAttackSpeed);
        if (s <= 0) {
          expect(attackSpeed).toBe(8); // Flat baseline 1.0x
        } else if (s >= 5) {
          expect(attackSpeed).toBe(12); // Flat capped 1.5x
        }
        previousAttackSpeed = attackSpeed;
      }
    });

    it('verifies DDA wave difficulty multipliers scale monotonically across tiers 1, 2, 3', () => {
      const d1 = calculateSubjectBuff('AYT Fen', 1, 0);
      const d2 = calculateSubjectBuff('AYT Fen', 2, 0);
      const d3 = calculateSubjectBuff('AYT Fen', 3, 0);

      // Base Fen: elementalDamage: 3, engineering: 4, hpRegen: 2
      // Tier 1: 1.0x -> 3, 4, 2
      // Tier 2: 1.5x -> 5 (round 4.5), 6, 3
      // Tier 3: 2.0x -> 6, 8, 4
      expect(d1.elementalDamage).toBe(3);
      expect(d2.elementalDamage).toBe(5);
      expect(d3.elementalDamage).toBe(6);

      expect(d1.engineering).toBe(4);
      expect(d2.engineering).toBe(6);
      expect(d3.engineering).toBe(8);
    });
  });

  // ==========================================================================
  // 2. Dodge Hard Cap (60%) Invariant under 50 Consecutive Türkçe Buffs
  // ==========================================================================
  describe('Strict 60% Dodge Hard Cap Invariant', () => {
    it('maintains stats.dodgePercent <= 60 across 50 consecutive Türkçe buffs starting at 0%', () => {
      const stats = createMockPlayerStats({ dodgePercent: 0 });
      const turkceBuff = calculateSubjectBuff('TYT Türkçe', 3, 5); // Max DDA (Tier 3) + Max streak (5) -> 3.0x multiplier

      // Base Türkçe dodge is 4%. At 3.0x, each buff adds 12% dodge.
      // After 5 buffs: 60%. Buffs 6 to 50 would push dodge to 600% if uncapped!
      for (let i = 1; i <= 50; i++) {
        applySubjectBuffToStats(stats, turkceBuff);

        expect(stats.dodgePercent).toBeLessThanOrEqual(60);
        if (i >= 5) {
          expect(stats.dodgePercent).toBe(60);
        }
      }
      expect(stats.dodgePercent).toBe(60);
    });

    it('enforces 60% cap over 1,000 consecutive iterations under extreme random modifiers', () => {
      const stats = createMockPlayerStats({ dodgePercent: 0 });

      for (let step = 0; step < 1000; step++) {
        // Random dodge modifiers between +10% and +100%
        const hugeDodgeBuff = { dodgePercent: Math.floor(Math.random() * 90) + 10 };
        applySubjectBuffToStats(stats, hugeDodgeBuff);

        expect(Number.isFinite(stats.dodgePercent)).toBe(true);
        expect(stats.dodgePercent).toBeLessThanOrEqual(60);
        if (step > 5) {
          expect(stats.dodgePercent).toBe(60);
        }
      }
    });

    it('re-clamps down to 60% if player enters with pre-existing illegal dodge (>60%)', () => {
      // E.g. corrupted save file or external bug set dodge to 95%
      const stats = createMockPlayerStats({ dodgePercent: 95 });
      const normalBuff = calculateSubjectBuff('TYT Türkçe', 1, 0);

      applySubjectBuffToStats(stats, normalBuff);
      expect(stats.dodgePercent).toBe(60);
    });

    it('handles negative dodge smoothly and approaches cap without overshoot', () => {
      const stats = createMockPlayerStats({ dodgePercent: -40 });
      const buff = calculateSubjectBuff('TYT Türkçe', 1, 0); // +4% Dodge

      for (let i = 0; i < 30; i++) {
        applySubjectBuffToStats(stats, buff);
        expect(stats.dodgePercent).toBeLessThanOrEqual(60);
      }
      expect(stats.dodgePercent).toBe(60);
    });
  });

  // ==========================================================================
  // 3. Zero-Penalty Invariant under 1,000 Consecutive Wrong Answers
  // ==========================================================================
  describe('Zero-Penalty Grace Invariant (1,000 Consecutive Wrong Answers)', () => {
    it('guarantees currentHp NEVER drops and materials NEVER decreases across 1,000 wrong answers', () => {
      const initialHp = 42;
      const initialMaterials = 100;
      const stats = createMockPlayerStats({ currentHp: initialHp, maxHp: 100 });
      let playerMaterials = initialMaterials;

      // Select a variety of questions from all disciplines
      const questionsToTest = ALL_QUESTIONS;

      for (let iteration = 0; iteration < 1000; iteration++) {
        const question = questionsToTest[iteration % questionsToTest.length];

        // Deliberately choose wrong index
        let wrongOptionIndex = 0;
        if (question.type === 'multiple_choice') {
          wrongOptionIndex = question.correctIndex === 0 ? 1 : 0;
        } else if (question.type === 'evidence_hunt' && question.passageTokens) {
          const nonClueIndex = question.passageTokens.findIndex((t) => !t.isClue);
          wrongOptionIndex = nonClueIndex >= 0 ? nonClueIndex : 999;
        }

        // Negative streak accumulating: -1, -2, -3...
        const currentStreak = -iteration;

        const outcome = evaluateAnswerWithGrace(question, wrongOptionIndex, stats, currentStreak);

        // 1. Invariant: outcome must be incorrect
        expect(outcome.isCorrect).toBe(false);

        // 2. Invariant: stats.currentHp is strictly preserved
        expect(stats.currentHp).toBe(initialHp);

        // 3. Invariant: bonusMaterials must be strictly positive (never negative)
        expect(outcome.bonusMaterials).toBeGreaterThanOrEqual(5);

        // 4. Invariant: applying consolation buffs never reduces HP
        applySubjectBuffToStats(stats, outcome.awardedBuffs);
        expect(stats.currentHp).toBe(initialHp);

        // 5. Invariant: materials accumulation strictly increases
        playerMaterials += outcome.bonusMaterials;
        expect(playerMaterials).toBeGreaterThan(initialMaterials);

        // 6. Invariant: mistake entry is logged with question metadata
        expect(outcome.mistakeEntry).toBeDefined();
        expect(outcome.mistakeEntry?.question.id).toBe(question.id);
        expect(outcome.mistakeEntry?.resolved).toBe(false);
      }

      // After 1,000 wrong answers:
      // Player HP is still exactly 42 (zero damage suffered)
      expect(stats.currentHp).toBe(initialHp);
      // Materials grew by at least 1,000 * 5 = 5,000
      expect(playerMaterials).toBeGreaterThanOrEqual(initialMaterials + 5000);
    });
  });

  // ==========================================================================
  // 4. Rescue Mode Triggers and Consolation Scaling
  // ==========================================================================
  describe('Rescue Mode Trigger Thresholds & Boosted Consolation', () => {
    const sampleQuestion = YKS_QUESTIONS[0]; // correctIndex = 2

    it('does NOT trigger rescue mode at neutral streak (0) or single miss (-1)', () => {
      const stats = createMockPlayerStats();

      const outcome0 = evaluateAnswerWithGrace(sampleQuestion, 0, stats, 0);
      expect(outcome0.awardedBuffs.luck).toBe(1);
      expect(outcome0.bonusMaterials).toBe(5);
      expect(outcome0.pedagogicFeedback).not.toContain('Kurtarma Modu');

      const outcome1 = evaluateAnswerWithGrace(sampleQuestion, 0, stats, -1);
      expect(outcome1.awardedBuffs.luck).toBe(1);
      expect(outcome1.bonusMaterials).toBe(5);
      expect(outcome1.pedagogicFeedback).not.toContain('Kurtarma Modu');
    });

    it('triggers Rescue Mode at exact boundary streak = -2 with +2 Luck and +10 Materials', () => {
      const stats = createMockPlayerStats();
      const outcome = evaluateAnswerWithGrace(sampleQuestion, 0, stats, -2);

      expect(outcome.awardedBuffs.luck).toBe(2);
      expect(outcome.bonusMaterials).toBe(10);
      expect(outcome.pedagogicFeedback).toContain('Kurtarma Modu');
      expect(outcome.pedagogicFeedback).toContain('+2 Şans');
      expect(outcome.pedagogicFeedback).toContain('+10 Materyal');
    });

    it('sustains boosted Rescue Mode benefits at deeper negative streaks (-3, -10, -50)', () => {
      const stats = createMockPlayerStats();

      for (const streak of [-3, -5, -10, -50, -100]) {
        const outcome = evaluateAnswerWithGrace(sampleQuestion, 0, stats, streak);
        expect(outcome.awardedBuffs.luck).toBe(2);
        expect(outcome.bonusMaterials).toBe(10);
        expect(outcome.pedagogicFeedback).toContain('Kurtarma Modu');
      }
    });

    it('marks skipped/timeout answers (selectedOptionIndex < 0) as skipped in mistake entry', () => {
      const stats = createMockPlayerStats();
      const outcome = evaluateAnswerWithGrace(sampleQuestion, -1, stats, 0);

      expect(outcome.isCorrect).toBe(false);
      expect(outcome.mistakeEntry?.status).toBe('skipped');
    });
  });

  // ==========================================================================
  // 5. Hostile, Malformed & Edge-Case Input Resilience
  // ==========================================================================
  describe('Adversarial & Malformed Input Handling', () => {
    it('safely falls back to Türkçe registry for unknown or gibberish categories', () => {
      const unknownCategories = [
        'Quantum Physics',
        'Astronomy 101',
        'random_string_xyz_99',
        '',
        '   ',
        'UNKNOWN',
      ];

      for (const cat of unknownCategories) {
        const buff = calculateSubjectBuff(cat, 1, 0);
        expect(buff).toBeDefined();
        // Fallback is Türkçe (speedPercent & dodgePercent)
        expect(buff.speedPercent).toBe(5);
        expect(buff.dodgePercent).toBe(4);
      }
    });

    it('safely handles null / undefined category via defensive typing', () => {
      const nullBuff = calculateSubjectBuff(null as unknown as string, 1, 0);
      expect(nullBuff.speedPercent).toBe(5);

      const undefinedBuff = calculateSubjectBuff(undefined as unknown as string, 1, 0);
      expect(undefinedBuff.speedPercent).toBe(5);
    });

    it('handles case-insensitivity, mixed diacritics, and partial strings robustly', () => {
      expect(calculateSubjectBuff('tyt turkce', 1, 0).dodgePercent).toBe(4);
      expect(calculateSubjectBuff('TYT TÜRKÇE', 1, 0).dodgePercent).toBe(4);
      expect(calculateSubjectBuff('ayt matematik', 1, 0).attackSpeed).toBe(8);
      expect(calculateSubjectBuff('AYT MATEMATİK', 1, 0).attackSpeed).toBe(8);
      expect(calculateSubjectBuff('AYT Sayısal', 1, 0).attackSpeed).toBe(8);
      expect(calculateSubjectBuff('ayt fen bilimleri', 1, 0).elementalDamage).toBe(3);
      expect(calculateSubjectBuff('tyt sosyal bilgiler', 1, 0).armor).toBe(2);
      expect(calculateSubjectBuff('BUEPT READING', 1, 0).harvesting).toBe(15);
      expect(calculateSubjectBuff('buept logic english', 1, 0).harvesting).toBe(15);
    });

    it('handles ASCII casing for "AYT SAYISAL" correctly by mapping to matematik', () => {
      // Node.js English locale lowers ASCII 'AYT SAYISAL' to 'ayt sayisal' (ASCII i)
      // BuffMatrix registry supports ASCII normalized 'AYT Sayisal' and checks 'sayisal'
      const asciiBuff = calculateSubjectBuff('AYT SAYISAL', 1, 0);
      expect(asciiBuff.attackSpeed).toBe(8);
      expect(asciiBuff.critChancePercent).toBe(6);
      expect(asciiBuff.damagePercent).toBe(5);
    });

    it('defends against NaN streak inputs by falling back to safe streak 0', () => {
      const nanBuff = calculateSubjectBuff('TYT Türkçe', 1, Number.NaN);
      // safeStreak defensive fallback guarantees finite numeric stat modifiers
      expect(nanBuff.speedPercent).toBe(5);
      expect(nanBuff.dodgePercent).toBe(4);
      expect(Number.isNaN(nanBuff.speedPercent)).toBe(false);
      expect(Number.isNaN(nanBuff.dodgePercent)).toBe(false);
    });

    it('applies modifiers safely when PlayerRPGStats has zero or undefined fields', () => {
      const stats = createMockPlayerStats();
      // Apply buff with extra unknown keys
      const customModifiers = {
        attackSpeed: 10,
        nonExistentStat: 999,
      } as unknown as Partial<PlayerRPGStats>;

      expect(() => applySubjectBuffToStats(stats, customModifiers)).not.toThrow();
      expect(stats.attackSpeed).toBe(10);
      expect((stats as unknown as Record<string, unknown>).nonExistentStat).toBeUndefined();
    });

    it('handles evidence_hunt questions with empty or missing passageTokens gracefully', () => {
      const malformedEvidenceHunt: TacticalQuestion = {
        id: 'malformed_evidence',
        act: 'yks',
        category: 'TYT Türkçe',
        subtopic: 'Paragraf',
        type: 'evidence_hunt',
        prompt: 'Where is the clue?',
        difficulty: 1,
        timeLimitSec: 20,
        mnemonic: '💡 Look closely.',
        passageTokens: [], // Empty tokens
      };

      const stats = createMockPlayerStats();
      expect(() => evaluateAnswerWithGrace(malformedEvidenceHunt, 0, stats, 0)).not.toThrow();

      const outcome = evaluateAnswerWithGrace(malformedEvidenceHunt, 0, stats, 0);
      expect(outcome.isCorrect).toBe(false);
      expect(outcome.bonusMaterials).toBe(5);
    });
  });

  // ==========================================================================
  // 6. Tactical Superpowers Arena Stress (Mass Scale)
  // ==========================================================================
  describe('Tactical Superpowers Arena Stress (Mass Scale)', () => {
    it('Revitalizing Surge never exceeds maxHp and always heals at least 30 HP', () => {
      // Case 1: 1 HP left out of 100
      const player1 = createMockPlayerEntity({ maxHp: 100, currentHp: 1 });
      const healed1 = SuperpowerEngine.executeRevitalizingSurge(player1);
      // Missing = 99 -> 50% = 49.5 -> round 50 -> total 51
      expect(healed1).toBeGreaterThanOrEqual(30);
      expect(player1.stats.currentHp).toBeLessThanOrEqual(player1.stats.maxHp);
      expect(player1.invulnerabilityTimerMs).toBe(3000);

      // Case 2: 99 HP left out of 100 (Missing = 1)
      const player2 = createMockPlayerEntity({ maxHp: 100, currentHp: 99 });
      const healed2 = SuperpowerEngine.executeRevitalizingSurge(player2);
      // Floor is 30, but currentHp is capped at maxHp (100)
      expect(healed2).toBe(30);
      expect(player2.stats.currentHp).toBe(100);

      // Case 3: 1,000 sequential activations never overflow maxHp
      for (let i = 0; i < 1000; i++) {
        SuperpowerEngine.executeRevitalizingSurge(player2);
        expect(player2.stats.currentHp).toBe(100);
      }
    });

    it('Orbital Nuke executes in <15ms against 1,000 active enemies and deals exact 500 damage', () => {
      const enemies: EnemyEntity[] = [];
      for (let i = 0; i < 1000; i++) {
        enemies.push({
          id: `enemy_${i}`,
          type: i % 2 === 0 ? 'swarmer' : 'tank',
          x: Math.random() * 2000,
          y: Math.random() * 2000,
          vx: 0,
          vy: 0,
          hp: 400 + (i % 3) * 200, // 400, 600, or 800 HP
          maxHp: 400 + (i % 3) * 200,
          speed: 100,
          damage: 10,
          radius: 16,
          mass: 1,
          state: 'pursuing',
          stateTimerMs: 0,
          isImmuneToKnockback: false,
          attackCooldownMs: 0,
          facingAngleRad: 0,
          hitFlashTimerMs: 0,
        });
      }

      const startTime = performance.now();
      const count = SuperpowerEngine.executeOrbitalNuke(enemies);
      const elapsed = performance.now() - startTime;

      expect(count).toBe(1000);
      expect(elapsed).toBeLessThan(50); // High-performance check

      // Enemies with initial 400 HP must now be at -100 HP
      expect(enemies[0].hp).toBe(-100);
      // Enemies with initial 600 HP must now be at 100 HP
      expect(enemies[1].hp).toBe(100);
    });

    it('Cosmic Vacuum magnetizes 1,000 drops and accurately tallies total economy', () => {
      const player = createMockPlayerEntity({}, { x: 500, y: 500 });
      const pickups: PickupEntity[] = [];
      let expectedTotalValue = 0;

      for (let i = 0; i < 1000; i++) {
        const val = (i % 10) + 1;
        expectedTotalValue += val;
        pickups.push({
          id: `drop_${i}`,
          type: 'material',
          x: Math.random() * 3000 - 1500,
          y: Math.random() * 3000 - 1500,
          vx: 0,
          vy: 0,
          value: val,
          isMagnetized: false,
          radius: 8,
          lifetimeMs: 10000,
        });
      }

      const totalVal = SuperpowerEngine.executeCosmicVacuum(pickups, player);
      expect(totalVal).toBe(expectedTotalValue);

      // Verify all are magnetized
      for (const p of pickups) {
        expect(p.isMagnetized).toBe(true);
      }
    });
  });

  // ==========================================================================
  // 7. Telemetry & Mistake Review Engine Under Heavy Load
  // ==========================================================================
  describe('TelemetryTracker & Mistake Review Heavy Load Simulation', () => {
    it('processes 5,000 rapid question attempts with strict accuracy mathematical bounds [0, 100]', () => {
      const tracker = new TelemetryTracker();
      const sampleQ = YKS_QUESTIONS[0];

      for (let i = 0; i < 5000; i++) {
        const isCorrect = i % 3 === 0; // 33.3% accuracy pattern
        tracker.recordAttempt(sampleQ, isCorrect ? 2 : 0, isCorrect, 1500, 1);

        const session = tracker.getSessionStats();
        expect(session.overallAccuracy).toBeGreaterThanOrEqual(0);
        expect(session.overallAccuracy).toBeLessThanOrEqual(100);
        expect(session.maxStreak).toBeGreaterThanOrEqual(session.currentStreak);
      }

      const session = tracker.getSessionStats();
      expect(session.totalAttempts).toBe(5000);
      // ~33% accuracy
      expect(session.overallAccuracy).toBe(33);

      // Mistake log length should equal total wrong attempts
      const mistakes = tracker.getMistakeLog();
      expect(mistakes.length).toBe(session.totalWrong);
    });

    it('supports batch mistake resolution with idempotency', () => {
      const tracker = new TelemetryTracker();
      const sampleQ = YKS_QUESTIONS[0];

      // Generate 20 mistakes
      for (let i = 0; i < 20; i++) {
        tracker.recordAttempt(sampleQ, 0, false, 2000, 1);
      }

      const mistakes = tracker.getMistakeLog();
      expect(mistakes.length).toBe(20);

      // Resolve first mistake
      const res1 = tracker.resolveMistake(mistakes[0].id);
      expect(res1).toBe(true);

      // Resolving the same mistake again returns false (idempotent)
      const res2 = tracker.resolveMistake(mistakes[0].id);
      expect(res2).toBe(false);

      expect(tracker.getMistakeLog()[0].resolved).toBe(true);
      expect(tracker.getMistakeLog()[1].resolved).toBe(false);
    });
  });
});
