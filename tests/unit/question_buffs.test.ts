import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { YKS_QUESTIONS, BUEPT_QUESTIONS } from '@/data/questions';
import { QuestionCategory, TacticalQuestion, MistakeEntry } from '@/types/game';

/**
 * Authoritative Question Buffs, Tactical Superpowers & Telemetry from PROJECT.md
 */

export interface PlayerStatsSheet {
  maxHp: number;
  currentHp: number;
  hpRegen: number;
  lifeSteal: number;
  damagePercent: number;
  attackSpeed: number;
  critChancePercent: number;
  range: number;
  armor: number;
  dodgePercent: number;
  speedPercent: number;
  luck: number;
  harvesting: number;
  pickupRange: number;
}

export function createDefaultPlayerStats(): PlayerStatsSheet {
  return {
    maxHp: 10,
    currentHp: 10,
    hpRegen: 0,
    lifeSteal: 0,
    damagePercent: 0,
    attackSpeed: 0,
    critChancePercent: 0,
    range: 0,
    armor: 0,
    dodgePercent: 0,
    speedPercent: 0,
    luck: 0,
    harvesting: 0,
    pickupRange: 120,
  };
}

export function applySubjectBuff(stats: PlayerStatsSheet, category: QuestionCategory): void {
  switch (category) {
    case 'TYT Matematik':
    case 'AYT Sayısal':
      stats.damagePercent += 8;
      stats.critChancePercent += 6;
      break;
    case 'TYT Fen':
      stats.speedPercent += 6;
      stats.hpRegen += 2;
      break;
    case 'TYT Türkçe':
      stats.dodgePercent = Math.min(60, stats.dodgePercent + 5);
      stats.pickupRange += 25;
      break;
    case 'BUEPT Vocab':
    case 'BUEPT Reading':
    case 'BUEPT Logic':
      stats.harvesting += 18;
      break;
    default:
      stats.luck += 3;
      break;
  }
}

export function applyConsolationReward(
  stats: PlayerStatsSheet,
  currentMaterials: number,
  question: TacticalQuestion,
  mistakeLog: MistakeEntry[]
): { materials: number; revealedMnemonic: string } {
  // Consolation: +1 Luck ("Hatalardan ders çıkarma"), +5 Materials, zero HP loss
  stats.luck += 1;
  const newMaterials = currentMaterials + 5;
  mistakeLog.push({
    question,
    status: 'wrong',
    timestamp: Date.now(),
    resolved: false,
  });
  return {
    materials: newMaterials,
    revealedMnemonic: question.mnemonic,
  };
}

export interface TacticalRewardResult {
  healedHp?: number;
  nukeDamage?: number;
  frenzyDurationSec?: number;
  globalVacuumTriggered?: boolean;
}

export function executeTacticalReward(
  choice: 'emergency_heal' | 'orbital_nuke' | 'flow_state_frenzy' | 'global_vacuum',
  stats: PlayerStatsSheet
): TacticalRewardResult {
  switch (choice) {
    case 'emergency_heal': {
      const missing = Math.max(0, stats.maxHp - stats.currentHp);
      const healAmount = Math.max(30, Math.floor(missing * 0.5));
      stats.currentHp = Math.min(stats.maxHp, stats.currentHp + healAmount);
      return { healedHp: healAmount };
    }
    case 'orbital_nuke':
      return { nukeDamage: 180 };
    case 'flow_state_frenzy':
      return { frenzyDurationSec: 6 };
    case 'global_vacuum':
      return { globalVacuumTriggered: true };
  }
}

export class QuestionTelemetryTracker {
  public attempts: number = 0;
  public correct: number = 0;
  public wrong: number = 0;
  public currentStreak: number = 0;
  public maxStreak: number = 0;
  public categoryStats: Partial<Record<QuestionCategory, { attempts: number; correct: number; wrong: number }>> = {};

  public recordAnswer(category: QuestionCategory, isCorrect: boolean): void {
    this.attempts++;
    if (!this.categoryStats[category]) {
      this.categoryStats[category] = { attempts: 0, correct: 0, wrong: 0 };
    }
    const cat = this.categoryStats[category]!;
    cat.attempts++;

    if (isCorrect) {
      this.correct++;
      cat.correct++;
      this.currentStreak++;
      if (this.currentStreak > this.maxStreak) {
        this.maxStreak = this.currentStreak;
      }
    } else {
      this.wrong++;
      cat.wrong++;
      this.currentStreak = 0;
    }
  }

  public getAccuracyRate(category?: QuestionCategory): number {
    if (category) {
      const cat = this.categoryStats[category];
      if (!cat || cat.attempts === 0) return 0;
      return Math.round((cat.correct / cat.attempts) * 100);
    }
    if (this.attempts === 0) return 0;
    return Math.round((this.correct / this.attempts) * 100);
  }
}

describe('Question Buffs & Educational Telemetry Verification', () => {
  describe('Question Bank Schema Conformance', () => {
    it('verifies YKS question bank exports valid TacticalQuestion objects', () => {
      assert.ok(YKS_QUESTIONS.length >= 6);
      for (const q of YKS_QUESTIONS) {
        assert.equal(q.act, 'yks');
        assert.ok(q.id.startsWith('yks-'));
        assert.ok(q.prompt.length > 5);
        assert.ok(q.mnemonic.includes('💡') || q.mnemonic.length > 5);
        assert.ok(q.difficulty >= 1 && q.difficulty <= 3);

        if (q.type === 'multiple_choice') {
          assert.ok(Array.isArray(q.options));
          assert.equal(q.options!.length, 4);
          assert.ok(typeof q.correctIndex === 'number');
          assert.ok(q.correctIndex! >= 0 && q.correctIndex! <= 3);
        } else if (q.type === 'evidence_hunt') {
          assert.ok(Array.isArray(q.passageTokens));
          assert.ok(q.passageTokens!.some((token) => token.isClue === true));
        }
      }
    });

    it('verifies BUEPT question bank exports valid Academic English questions', () => {
      assert.ok(BUEPT_QUESTIONS.length >= 6);
      for (const q of BUEPT_QUESTIONS) {
        assert.equal(q.act, 'buept');
        assert.ok(q.id.startsWith('buept-'));
        assert.ok(q.prompt.length > 3);
        assert.ok(q.mnemonic.length > 5);

        if (q.type === 'multiple_choice') {
          assert.ok(Array.isArray(q.options));
          assert.equal(q.options!.length, 4);
          assert.ok(typeof q.correctIndex === 'number');
        } else if (q.type === 'evidence_hunt') {
          assert.ok(Array.isArray(q.passageTokens));
          assert.ok(q.passageTokens!.some((token) => token.isClue === true));
        }
      }
    });
  });

  describe('Subject-Themed Stat Buffs Mapping', () => {
    it('applies TYT/AYT Matematik buff: boosts Damage% and Crit%', () => {
      const stats = createDefaultPlayerStats();
      applySubjectBuff(stats, 'TYT Matematik');
      assert.equal(stats.damagePercent, 8);
      assert.equal(stats.critChancePercent, 6);
    });

    it('applies TYT Fen buff: boosts Speed% and HP Regen', () => {
      const stats = createDefaultPlayerStats();
      applySubjectBuff(stats, 'TYT Fen');
      assert.equal(stats.speedPercent, 6);
      assert.equal(stats.hpRegen, 2);
    });

    it('applies TYT Türkçe buff: boosts Dodge% (clamped at 60%) and Pickup Magnet', () => {
      const stats = createDefaultPlayerStats();
      applySubjectBuff(stats, 'TYT Türkçe');
      assert.equal(stats.dodgePercent, 5);
      assert.equal(stats.pickupRange, 145);

      // Stacking up to and exceeding 60% cap
      stats.dodgePercent = 58;
      applySubjectBuff(stats, 'TYT Türkçe');
      assert.equal(stats.dodgePercent, 60); // Clamped at 60
    });

    it('applies BUEPT English buff: boosts Academic Scholarship Harvesting', () => {
      const stats = createDefaultPlayerStats();
      applySubjectBuff(stats, 'BUEPT Vocab');
      assert.equal(stats.harvesting, 18);
    });
  });

  describe('Grace & Consolation Policy on Wrong Answers', () => {
    it('grants +1 Luck, +5 Materials, preserves HP, reveals mnemonic, and logs mistake', () => {
      const stats = createDefaultPlayerStats();
      stats.currentHp = 8;
      const initialHp = stats.currentHp;
      const mistakeLog: MistakeEntry[] = [];
      const testQ = YKS_QUESTIONS[0];

      const res = applyConsolationReward(stats, 10, testQ, mistakeLog);

      // Zero HP penalty
      assert.equal(stats.currentHp, initialHp);
      // Consolation bonus
      assert.equal(stats.luck, 1);
      assert.equal(res.materials, 15);
      // Mnemonic revealed
      assert.equal(res.revealedMnemonic, testQ.mnemonic);
      // Mistake notebook logged
      assert.equal(mistakeLog.length, 1);
      assert.equal(mistakeLog[0].question.id, testQ.id);
      assert.equal(mistakeLog[0].status, 'wrong');
      assert.equal(mistakeLog[0].resolved, false);
    });
  });

  describe('Tactical Combat Superpower Rewards', () => {
    it('executes Emergency 50% Heal', () => {
      const stats = createDefaultPlayerStats();
      stats.maxHp = 100;
      stats.currentHp = 20; // 80 missing -> 50% is 40 -> new HP is 60

      const res = executeTacticalReward('emergency_heal', stats);
      assert.equal(res.healedHp, 40);
      assert.equal(stats.currentHp, 60);
    });

    it('executes Boğaziçi Süpernova Tactical Nuke', () => {
      const stats = createDefaultPlayerStats();
      const res = executeTacticalReward('orbital_nuke', stats);
      assert.equal(res.nukeDamage, 180);
    });

    it('executes Flow State Frenzy (6s invulnerability overdrive)', () => {
      const stats = createDefaultPlayerStats();
      const res = executeTacticalReward('flow_state_frenzy', stats);
      assert.equal(res.frenzyDurationSec, 6);
    });

    it('executes Global Cosmic Vacuum', () => {
      const stats = createDefaultPlayerStats();
      const res = executeTacticalReward('global_vacuum', stats);
      assert.equal(res.globalVacuumTriggered, true);
    });
  });

  describe('Accuracy Telemetry & Streaks', () => {
    it('tracks streaks, category accuracy, and overall accuracy', () => {
      const tracker = new QuestionTelemetryTracker();
      assert.equal(tracker.getAccuracyRate(), 0); // Graceful zero attempts

      // Answer 1: Math correct
      tracker.recordAnswer('TYT Matematik', true);
      assert.equal(tracker.currentStreak, 1);
      assert.equal(tracker.maxStreak, 1);
      assert.equal(tracker.getAccuracyRate('TYT Matematik'), 100);

      // Answer 2: Math correct
      tracker.recordAnswer('TYT Matematik', true);
      assert.equal(tracker.currentStreak, 2);
      assert.equal(tracker.maxStreak, 2);

      // Answer 3: Fen wrong
      tracker.recordAnswer('TYT Fen', false);
      assert.equal(tracker.currentStreak, 0); // Streak broken
      assert.equal(tracker.maxStreak, 2); // Max preserved
      assert.equal(tracker.getAccuracyRate('TYT Fen'), 0);

      // Overall: 2 correct out of 3 = 67%
      assert.equal(tracker.getAccuracyRate(), 67);
      assert.equal(tracker.getAccuracyRate('TYT Matematik'), 100);
    });
  });
});
