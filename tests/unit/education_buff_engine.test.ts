import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSubjectBuff,
  applySubjectBuffToStats,
  getSubjectBuffPreview,
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
    id: 'test_player',
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

describe('Milestone 4: Educational Question & Buff Engine Verification', () => {
  // --------------------------------------------------------------------------
  // 1. Curated Question Bank Structure & Taxonomy
  // --------------------------------------------------------------------------
  describe('Question Bank Architecture (30 Curated Questions)', () => {
    it('verifies 30 total questions across YKS (24) and BUEPT (6)', () => {
      assert.equal(ALL_QUESTIONS.length, 30);
      assert.equal(YKS_QUESTIONS.length, 24);
      assert.equal(BUEPT_QUESTIONS.length, 6);
    });

    it('verifies all 5 disciplines are represented with at least 6 questions each', () => {
      const disciplines = {
        turkce: ALL_QUESTIONS.filter((q) => q.category.toLowerCase().includes('türkçe')),
        matematik: ALL_QUESTIONS.filter(
          (q) => q.category.toLowerCase().includes('matematik') || q.category.toLowerCase().includes('sayısal')
        ),
        fen: ALL_QUESTIONS.filter((q) => q.category.toLowerCase().includes('fen')),
        sosyal: ALL_QUESTIONS.filter((q) => q.category.toLowerCase().includes('sosyal')),
        buept: ALL_QUESTIONS.filter((q) => q.act === 'buept'),
      };

      assert.equal(disciplines.turkce.length, 6, 'Türkçe discipline should have 6 questions');
      assert.equal(disciplines.matematik.length, 6, 'Matematik discipline should have 6 questions');
      assert.equal(disciplines.fen.length, 6, 'Fen discipline should have 6 questions');
      assert.equal(disciplines.sosyal.length, 6, 'Sosyal discipline should have 6 questions');
      assert.equal(disciplines.buept.length, 6, 'BUEPT discipline should have 6 questions');
    });

    it('verifies every question has valid difficulty, mnemonic, and prompt', () => {
      for (const q of ALL_QUESTIONS) {
        assert.ok(q.id.startsWith('yks-') || q.id.startsWith('buept-'));
        assert.ok(q.difficulty >= 1 && q.difficulty <= 3);
        assert.ok(q.prompt.length >= 10);
        assert.ok(q.mnemonic.includes('💡'));
        assert.ok(q.timeLimitSec >= 10);

        if (q.type === 'multiple_choice') {
          assert.ok(Array.isArray(q.options) && q.options.length === 4);
          assert.ok(typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3);
        } else if (q.type === 'evidence_hunt') {
          assert.ok(Array.isArray(q.passageTokens) && q.passageTokens.length > 0);
          assert.ok(q.passageTokens.some((tok) => tok.isClue === true));
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // 2. Subject-to-Stat Buff Matrix & 60% Dodge Clamping
  // --------------------------------------------------------------------------
  describe('Subject-to-Stat Buff Matrix & Clamping Rules', () => {
    it('verifies Türkçe buff provides Speed% and Dodge%', () => {
      const buff = calculateSubjectBuff('TYT Türkçe', 1, 0);
      assert.ok((buff.speedPercent ?? 0) >= 5);
      assert.ok((buff.dodgePercent ?? 0) >= 4);
    });

    it('verifies Matematik buff provides Attack Speed% and Crit Chance%', () => {
      const buff = calculateSubjectBuff('TYT Matematik', 1, 0);
      assert.ok((buff.attackSpeed ?? 0) >= 8);
      assert.ok((buff.critChancePercent ?? 0) >= 6);
    });

    it('verifies Fen Bilimleri buff provides Elemental Damage and Engineering', () => {
      const buff = calculateSubjectBuff('AYT Fen', 1, 0);
      assert.ok((buff.elementalDamage ?? 0) >= 3);
      assert.ok((buff.engineering ?? 0) >= 4);
    });

    it('verifies Sosyal Bilimler buff provides Armor and Max HP', () => {
      const buff = calculateSubjectBuff('TYT Sosyal', 1, 0);
      assert.ok((buff.armor ?? 0) >= 2);
      assert.ok((buff.maxHp ?? 0) >= 15);
    });

    it('verifies BUEPT English buff provides Harvesting and Luck', () => {
      const buff = calculateSubjectBuff('BUEPT Vocab', 1, 0);
      assert.ok((buff.harvesting ?? 0) >= 15);
      assert.ok((buff.luck ?? 0) >= 5);
    });

    it('scales buffs higher for Difficulty Tier 2 and Tier 3 (DDA Progression)', () => {
      const tier1 = calculateSubjectBuff('TYT Matematik', 1, 0);
      const tier2 = calculateSubjectBuff('TYT Matematik', 2, 0);
      const tier3 = calculateSubjectBuff('TYT Matematik', 3, 0);

      assert.ok((tier2.attackSpeed ?? 0) > (tier1.attackSpeed ?? 0));
      assert.ok((tier3.attackSpeed ?? 0) > (tier2.attackSpeed ?? 0));
    });

    it('scales buffs higher on active positive streaks', () => {
      const neutralBuff = calculateSubjectBuff('TYT Türkçe', 1, 0);
      const streakBuff = calculateSubjectBuff('TYT Türkçe', 1, 5);

      assert.ok((streakBuff.speedPercent ?? 0) >= (neutralBuff.speedPercent ?? 0));
    });

    it('STRICT INVARIANT: Dodge is hard-clamped at 60% standard Brotato maximum cap', () => {
      const stats = createMockPlayerStats({ dodgePercent: 55 });
      const turkceBuff = calculateSubjectBuff('TYT Türkçe', 3, 5); // Massive buff

      applySubjectBuffToStats(stats, turkceBuff);
      assert.equal(stats.dodgePercent, 60, 'Dodge MUST be clamped to 60% even with large buffs');

      // Further stacking still stays clamped at 60
      applySubjectBuffToStats(stats, { dodgePercent: 20 });
      assert.equal(stats.dodgePercent, 60, 'Dodge cannot exceed 60% cap');
    });

    it('verifies getSubjectBuffPreview returns non-empty description and valid preview stats', () => {
      const previewTurkce = getSubjectBuffPreview('TYT Türkçe');
      assert.equal(previewTurkce.subject, 'Türkçe');
      assert.ok(previewTurkce.description.length > 10);
      assert.equal(previewTurkce.description, SUBJECT_BUFF_REGISTRY.turkce.description);
      assert.equal(previewTurkce.statPreview.speedPercent, 5);

      const previewMat = getSubjectBuffPreview('AYT SAYISAL');
      assert.equal(previewMat.subject, 'Matematik');
      assert.ok(previewMat.description.length > 10);
      assert.equal(previewMat.description, SUBJECT_BUFF_REGISTRY.matematik.description);
      assert.equal(previewMat.statPreview.attackSpeed, 8);
    });

    it('safely handles ASCII normalized diacritics and NaN streak inputs in calculateSubjectBuff', () => {
      const asciiBuff = calculateSubjectBuff('AYT SAYISAL', 1, 0);
      assert.equal(asciiBuff.attackSpeed, 8);
      assert.equal(asciiBuff.critChancePercent, 6);

      const nanBuff = calculateSubjectBuff('TYT Türkçe', 1, Number.NaN);
      assert.equal(nanBuff.speedPercent, 5);
      assert.equal(nanBuff.dodgePercent, 4);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Grace & Consolation Policy
  // --------------------------------------------------------------------------
  describe('Grace & Consolation Policy on Wrong Answers', () => {
    const sampleQuestion: TacticalQuestion = YKS_QUESTIONS[0]; // correctIndex = 2

    it('evaluates correct answer: awards subject buffs, bonus materials, reveals mnemonic', () => {
      const stats = createMockPlayerStats();
      const outcome = evaluateAnswerWithGrace(sampleQuestion, 2, stats, 0);

      assert.equal(outcome.isCorrect, true);
      assert.ok(outcome.bonusMaterials >= 15);
      assert.equal(outcome.revealedMnemonic, sampleQuestion.mnemonic);
      assert.equal(outcome.mistakeEntry, undefined);
    });

    it('STRICT INVARIANT: Zero HP loss and zero material loss on incorrect answers', () => {
      const stats = createMockPlayerStats({ currentHp: 42 });
      const initialHp = stats.currentHp;

      const outcome = evaluateAnswerWithGrace(sampleQuestion, 0, stats, 0); // Wrong answer

      assert.equal(outcome.isCorrect, false);
      assert.equal(stats.currentHp, initialHp, 'Player currentHp MUST NOT be decreased');
      assert.ok(outcome.bonusMaterials >= 5, 'Consolation materials must be granted');
      assert.equal(outcome.awardedBuffs.luck, 1, 'Consolation +1 Luck granted');
      assert.equal(outcome.revealedMnemonic, sampleQuestion.mnemonic);
      assert.ok(outcome.mistakeEntry !== undefined);
      assert.equal(outcome.mistakeEntry?.question.id, sampleQuestion.id);
    });

    it('activates Rescue Mode on negative streak <= -2 with boosted consolation', () => {
      const stats = createMockPlayerStats();
      const outcome = evaluateAnswerWithGrace(sampleQuestion, 1, stats, -3); // Rescue Mode

      assert.equal(outcome.isCorrect, false);
      assert.equal(outcome.awardedBuffs.luck, 2, 'Rescue Mode awards +2 Luck');
      assert.equal(outcome.bonusMaterials, 10, 'Rescue Mode awards +10 Materials');
      assert.ok(outcome.pedagogicFeedback.includes('Kurtarma Modu'));
    });
  });

  // --------------------------------------------------------------------------
  // 4. Tactical Superpowers Execution Engine
  // --------------------------------------------------------------------------
  describe('4 Tactical Superpowers', () => {
    it('verifies catalog contains 4 distinct superpowers', () => {
      assert.equal(SUPERPOWER_CATALOG.length, 4);
      const ids = SUPERPOWER_CATALOG.map((s) => s.id);
      assert.ok(ids.includes('emergency_heal'));
      assert.ok(ids.includes('orbital_nuke'));
      assert.ok(ids.includes('flow_state_frenzy'));
      assert.ok(ids.includes('global_vacuum'));
    });

    it('executes Revitalizing Surge: restores 50% missing HP (min 30 HP, max maxHp)', () => {
      const player = createMockPlayerEntity({ maxHp: 100, currentHp: 20 });
      // Missing HP = 80 -> 50% is 40 -> New HP should be 60
      const healed = SuperpowerEngine.executeRevitalizingSurge(player);

      assert.equal(healed, 40);
      assert.equal(player.stats.currentHp, 60);
      assert.ok(player.invulnerabilityTimerMs >= 3000, 'Awards 3s invulnerability shield');
    });

    it('executes Revitalizing Surge floor: heals minimum 30 HP when missing HP is small', () => {
      const player = createMockPlayerEntity({ maxHp: 100, currentHp: 95 });
      // Missing HP = 5 -> floor 30 HP -> New HP should be 100 (capped at maxHp)
      const healed = SuperpowerEngine.executeRevitalizingSurge(player);

      assert.equal(healed, 30);
      assert.equal(player.stats.currentHp, 100);
    });

    it('executes Orbital Nuke: deals 500 flat damage across all enemies in arena', () => {
      const enemies: EnemyEntity[] = [
        {
          id: 'e1',
          type: 'swarmer',
          x: 100,
          y: 100,
          vx: 0,
          vy: 0,
          hp: 300,
          maxHp: 300,
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
        },
        {
          id: 'e2',
          type: 'tank',
          x: 200,
          y: 200,
          vx: 0,
          vy: 0,
          hp: 800,
          maxHp: 800,
          speed: 80,
          damage: 20,
          radius: 28,
          mass: 3,
          state: 'pursuing',
          stateTimerMs: 0,
          isImmuneToKnockback: false,
          attackCooldownMs: 0,
          facingAngleRad: 0,
          hitFlashTimerMs: 0,
        },
      ];

      const totalHit = SuperpowerEngine.executeOrbitalNuke(enemies);

      assert.equal(totalHit, 2);
      assert.equal(enemies[0].hp, -200, '300 - 500 = -200 (killed)');
      assert.equal(enemies[1].hp, 300, '800 - 500 = 300');
      assert.equal(enemies[0].hitFlashTimerMs, 200);
    });

    it('activates Flow State Frenzy: returns 10s duration', () => {
      const duration = SuperpowerEngine.activateFlowStateFrenzy(10);
      assert.equal(duration, 10);
    });

    it('executes Cosmic Material Vacuum: magnetizes all material drops and computes value', () => {
      const player = createMockPlayerEntity({}, { x: 500, y: 500 });
      const pickups: PickupEntity[] = [
        {
          id: 'p1',
          type: 'material',
          x: 100,
          y: 100,
          vx: 0,
          vy: 0,
          value: 10,
          isMagnetized: false,
          radius: 8,
          lifetimeMs: 10000,
        },
        {
          id: 'p2',
          type: 'material',
          x: 800,
          y: 800,
          vx: 0,
          vy: 0,
          value: 25,
          isMagnetized: false,
          radius: 8,
          lifetimeMs: 10000,
        },
      ];

      const totalVal = SuperpowerEngine.executeCosmicVacuum(pickups, player);

      assert.equal(totalVal, 35);
      assert.equal(pickups[0].isMagnetized, true);
      assert.equal(pickups[1].isMagnetized, true);
      assert.ok(pickups[0].vx !== 0 || pickups[0].vy !== 0, 'Velocity vector set toward player');
    });
  });

  // --------------------------------------------------------------------------
  // 5. Frame-Accurate Freeze Manager
  // --------------------------------------------------------------------------
  describe('FreezeManager Simulation Lifecycle', () => {
    it('engages and disengages tactical freeze with session metadata', () => {
      let isFrozenInTarget = false;
      const mockLoop = {
        setTacticalFreeze: (frozen: boolean) => {
          isFrozenInTarget = frozen;
        },
        isFrozen: () => isFrozenInTarget,
      };

      const manager = new FreezeManager(mockLoop);
      assert.equal(manager.isFrozen(), false);

      manager.triggerFreeze('mystery_chest', YKS_QUESTIONS[0]);
      assert.equal(isFrozenInTarget, true);
      assert.equal(manager.isFrozen(), true);
      assert.equal(manager.getSession()?.source, 'mystery_chest');

      manager.resumeCombat();
      assert.equal(isFrozenInTarget, false);
      assert.equal(manager.isFrozen(), false);
      assert.equal(manager.getSession(), null);
    });
  });

  // --------------------------------------------------------------------------
  // 6. 5-Axis Telemetry & Mistake Logging
  // --------------------------------------------------------------------------
  describe('TelemetryTracker & Mistake Review Engine', () => {
    it('tracks attempts, streaks, and calculates accuracy rates', () => {
      const tracker = new TelemetryTracker();

      const qMat = YKS_QUESTIONS.find((q) => q.category === 'TYT Matematik')!;
      const qTurk = YKS_QUESTIONS.find((q) => q.category === 'TYT Türkçe')!;

      // 1. Math attempt correct
      tracker.recordAttempt(qMat, 2, true, 2000, 1);
      assert.equal(tracker.getSessionStats().currentStreak, 1);
      assert.equal(tracker.getSessionStats().maxStreak, 1);
      assert.equal(tracker.get5AxisScores().matematik, 100);

      // 2. Turkish attempt wrong
      tracker.recordAttempt(qTurk, 0, false, 3000, 1);
      assert.equal(tracker.getSessionStats().currentStreak, 0, 'Wrong answer resets current streak');
      assert.equal(tracker.getSessionStats().maxStreak, 1, 'Max streak is preserved');
      assert.equal(tracker.get5AxisScores().turkce, 0);

      // 3. Overall accuracy
      assert.equal(tracker.getSessionStats().overallAccuracy, 50);

      // 4. Mistake log check
      const mistakes = tracker.getMistakeLog();
      assert.equal(mistakes.length, 1);
      assert.equal(mistakes[0].question.id, qTurk.id);
      assert.equal(mistakes[0].resolved, false);

      // 5. Re-solve mistake
      const resolved = tracker.resolveMistake(mistakes[0].id);
      assert.equal(resolved, true);
      assert.equal(tracker.getMistakeLog()[0].resolved, true);

      // 6. Current streak method & negative streak tracking
      assert.equal(tracker.getCurrentStreak(), 0);
      tracker.recordAttempt(qTurk, 0, false, 2000, 1);
      assert.equal(tracker.getCurrentStreak(), -1);
      tracker.recordAttempt(qTurk, 0, false, 2000, 1);
      assert.equal(tracker.getCurrentStreak(), -2);
    });
  });
});
