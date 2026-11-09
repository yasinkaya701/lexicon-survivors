import type { TacticalQuestion, QuestionCategory } from '@/types/game';

export type SubjectAxis = 'turkce' | 'matematik' | 'fen' | 'sosyal' | 'buept';

export interface CategoryTelemetryMetric {
  axis: SubjectAxis;
  attempts: number;
  correct: number;
  wrong: number;
  skipped: number;
  streak: number;
  maxStreak: number;
  totalResponseTimeMs: number;
  avgResponseTimeMs: number;
  accuracyRate: number; // 0 to 100
}

export interface SessionTelemetryStats {
  totalAttempts: number;
  totalCorrect: number;
  totalWrong: number;
  totalSkipped: number;
  overallAccuracy: number;
  currentStreak: number;
  maxStreak: number;
  avgReactionTimeMs: number;
  studyBuffsClaimed: number;
  tacticalSuperpowersUsed: number;
}

export interface MistakeRecord {
  id: string;
  question: TacticalQuestion;
  userChoiceIndex: number;
  status: 'wrong' | 'timeout' | 'skipped';
  timestamp: number;
  wave: number;
  resolved: boolean;
}

export function mapCategoryToSubjectAxis(category: QuestionCategory | string): SubjectAxis {
  const cat = (category || '').toLowerCase();
  if (cat.includes('türkçe') || cat.includes('turkce') || cat.includes('türk') || cat.includes('turk')) return 'turkce';
  if (cat.includes('matematik') || cat.includes('sayısal') || cat.includes('mat')) return 'matematik';
  if (cat.includes('fen')) return 'fen';
  if (cat.includes('sosyal')) return 'sosyal';
  if (cat.includes('buept') || cat.includes('english')) return 'buept';
  return 'matematik';
}

export class TelemetryTracker {
  private categoryMetrics: Record<SubjectAxis, CategoryTelemetryMetric>;
  private mistakeLog: MistakeRecord[] = [];
  private sessionStats: SessionTelemetryStats = {
    totalAttempts: 0,
    totalCorrect: 0,
    totalWrong: 0,
    totalSkipped: 0,
    overallAccuracy: 0,
    currentStreak: 0,
    maxStreak: 0,
    avgReactionTimeMs: 0,
    studyBuffsClaimed: 0,
    tacticalSuperpowersUsed: 0,
  };

  constructor() {
    this.categoryMetrics = {
      turkce: this.createEmptyMetric('turkce'),
      matematik: this.createEmptyMetric('matematik'),
      fen: this.createEmptyMetric('fen'),
      sosyal: this.createEmptyMetric('sosyal'),
      buept: this.createEmptyMetric('buept'),
    };
  }

  private createEmptyMetric(axis: SubjectAxis): CategoryTelemetryMetric {
    return {
      axis,
      attempts: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
      streak: 0,
      maxStreak: 0,
      totalResponseTimeMs: 0,
      avgResponseTimeMs: 0,
      accuracyRate: 0,
    };
  }

  /**
   * Records a student question answer event.
   */
  public recordAttempt(
    question: TacticalQuestion,
    selectedIndex: number,
    isCorrect: boolean,
    responseTimeMs: number = 0,
    wave: number = 1
  ): void {
    const axis = mapCategoryToSubjectAxis(question.category);
    const cat = this.categoryMetrics[axis];

    this.sessionStats.totalAttempts++;
    cat.attempts++;
    cat.totalResponseTimeMs += responseTimeMs;
    cat.avgResponseTimeMs = Math.round(cat.totalResponseTimeMs / cat.attempts);

    if (isCorrect) {
      this.sessionStats.totalCorrect++;
      cat.correct++;
      cat.streak++;
      if (cat.streak > cat.maxStreak) cat.maxStreak = cat.streak;

      if (this.sessionStats.currentStreak < 0) {
        this.sessionStats.currentStreak = 1;
      } else {
        this.sessionStats.currentStreak++;
      }
      if (this.sessionStats.currentStreak > this.sessionStats.maxStreak) {
        this.sessionStats.maxStreak = this.sessionStats.currentStreak;
      }
    } else {
      this.sessionStats.totalWrong++;
      cat.wrong++;
      cat.streak = 0;
      if (this.sessionStats.currentStreak > 0) {
        this.sessionStats.currentStreak = 0;
      } else {
        this.sessionStats.currentStreak--;
      }

      // Log into Mistake Notebook
      this.mistakeLog.push({
        id: `mistake_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        question,
        userChoiceIndex: selectedIndex,
        status: selectedIndex < 0 ? 'timeout' : 'wrong',
        timestamp: Date.now(),
        wave,
        resolved: false,
      });
    }

    // Recompute accuracies
    cat.accuracyRate = Math.round((cat.correct / cat.attempts) * 100);
    this.sessionStats.overallAccuracy = Math.round(
      (this.sessionStats.totalCorrect / this.sessionStats.totalAttempts) * 100
    );

    // Running average reaction time
    const prevTotal = (this.sessionStats.totalAttempts - 1) * this.sessionStats.avgReactionTimeMs;
    this.sessionStats.avgReactionTimeMs = Math.round(
      (prevTotal + responseTimeMs) / this.sessionStats.totalAttempts
    );
  }

  /**
   * Resolves a failed mistake entry.
   */
  public resolveMistake(mistakeId: string): boolean {
    const item = this.mistakeLog.find((m) => m.id === mistakeId);
    if (item && !item.resolved) {
      item.resolved = true;
      return true;
    }
    return false;
  }

  public get5AxisScores(): Record<SubjectAxis, number> {
    return {
      turkce: this.categoryMetrics.turkce.attempts > 0 ? this.categoryMetrics.turkce.accuracyRate : 50,
      matematik: this.categoryMetrics.matematik.attempts > 0 ? this.categoryMetrics.matematik.accuracyRate : 50,
      fen: this.categoryMetrics.fen.attempts > 0 ? this.categoryMetrics.fen.accuracyRate : 50,
      sosyal: this.categoryMetrics.sosyal.attempts > 0 ? this.categoryMetrics.sosyal.accuracyRate : 50,
      buept: this.categoryMetrics.buept.attempts > 0 ? this.categoryMetrics.buept.accuracyRate : 50,
    };
  }

  public getAttemptCounts(): Record<SubjectAxis, number> {
    return {
      turkce: this.categoryMetrics.turkce.attempts,
      matematik: this.categoryMetrics.matematik.attempts,
      fen: this.categoryMetrics.fen.attempts,
      sosyal: this.categoryMetrics.sosyal.attempts,
      buept: this.categoryMetrics.buept.attempts,
    };
  }

  public getMistakeLog(): MistakeRecord[] {
    return [...this.mistakeLog];
  }

  public getSessionStats(): SessionTelemetryStats {
    return { ...this.sessionStats };
  }

  public getCurrentStreak(): number {
    return this.sessionStats.currentStreak;
  }

  public recordStudyBuffClaimed(): void {
    this.sessionStats.studyBuffsClaimed++;
  }

  public recordTacticalSuperpowerUsed(): void {
    this.sessionStats.tacticalSuperpowersUsed++;
  }

  public resetSession(): void {
    this.mistakeLog = [];
    this.sessionStats = {
      totalAttempts: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalSkipped: 0,
      overallAccuracy: 0,
      currentStreak: 0,
      maxStreak: 0,
      avgReactionTimeMs: 0,
      studyBuffsClaimed: 0,
      tacticalSuperpowersUsed: 0,
    };
    (Object.keys(this.categoryMetrics) as SubjectAxis[]).forEach((axis) => {
      this.categoryMetrics[axis] = this.createEmptyMetric(axis);
    });
  }
}
