import type { PlayerRPGStats, StatModifiers } from '@/types/brotato';
import type { TacticalQuestion, MistakeEntry } from '@/types/game';
import { calculateSubjectBuff } from './BuffMatrix';

export interface EvaluationOutcome {
  isCorrect: boolean;
  awardedBuffs: StatModifiers;
  bonusMaterials: number;
  revealedMnemonic: string;
  pedagogicFeedback: string;
  mistakeEntry?: MistakeEntry;
}

/**
 * Evaluates a player's answer under the Grace & Consolation Policy.
 * Invariant: ZERO health damage and ZERO material penalty on incorrect answers.
 */
export function evaluateAnswerWithGrace(
  question: TacticalQuestion,
  selectedOptionIndex: number,
  currentStats: PlayerRPGStats,
  currentStreak: number = 0
): EvaluationOutcome {
  // Support both multiple_choice (correctIndex check) and evidence_hunt (token isClue check)
  let isCorrect = false;
  if (question.type === 'multiple_choice') {
    isCorrect = selectedOptionIndex === question.correctIndex;
  } else if (question.type === 'evidence_hunt' && question.passageTokens) {
    const token = question.passageTokens[selectedOptionIndex];
    isCorrect = !!token && token.isClue === true;
  }

  if (isCorrect) {
    const difficulty = question.difficulty || 1;
    const buffs = calculateSubjectBuff(question.category, difficulty, Math.max(0, currentStreak));
    const bonusMaterials = 15 + difficulty * 5 + Math.min(Math.max(0, currentStreak), 5) * 2;

    return {
      isCorrect: true,
      awardedBuffs: buffs,
      bonusMaterials,
      revealedMnemonic: question.mnemonic,
      pedagogicFeedback: `Tebrikler! ${question.category} sorusunu başarıyla çözdün!`,
    };
  }

  // --- WRONG ANSWER: Grace Consolation Policy ---
  // Invariant 1: stats.currentHp is NOT decremented (strictly preserved).
  // Invariant 2: Materials are NOT deducted.
  // Invariant 3: Consolation award is granted.

  const isRescueMode = currentStreak <= -2;
  const consolationLuck = isRescueMode ? 2 : 1;
  const consolationMaterials = isRescueMode ? 10 : 5;

  const consolationBuffs: StatModifiers = {
    luck: consolationLuck,
    speedPercent: 2, // Slight sprint evasion
  };

  const mistake: MistakeEntry = {
    question: { ...question },
    status: selectedOptionIndex < 0 ? 'skipped' : 'wrong',
    timestamp: Date.now(),
    resolved: false,
  };

  const pedagogicFeedback = isRescueMode
    ? 'Moralini bozma! Kurtarma Modu devrede: +2 Şans ve +10 Materyal telafi desteği kazandın. Koç taktiğini incele!'
    : 'Canın sağ olsun! Can ve altın kaybı yok. +1 Şans ve +5 Materyal telafisiyle güçlendin. Koç taktiğini incele!';

  return {
    isCorrect: false,
    awardedBuffs: consolationBuffs,
    bonusMaterials: consolationMaterials,
    revealedMnemonic: question.mnemonic,
    pedagogicFeedback,
    mistakeEntry: mistake,
  };
}
