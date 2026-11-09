import type { PlayerRPGStats, StatModifiers } from '@/types/brotato';
import type { QuestionCategory } from '@/types/game';

export interface SubjectBuffDefinition {
  subject: string;
  categoryKeys: (QuestionCategory | string)[];
  primaryStat: keyof PlayerRPGStats;
  primaryValue: number;
  secondaryStat: keyof PlayerRPGStats;
  secondaryValue: number;
  tertiaryStat?: keyof PlayerRPGStats;
  tertiaryValue?: number;
  description: string;
}

export const SUBJECT_BUFF_REGISTRY: Record<string, SubjectBuffDefinition> = {
  turkce: {
    subject: 'Türkçe',
    categoryKeys: ['TYT Türkçe'],
    primaryStat: 'speedPercent',
    primaryValue: 5, // +5% Move Speed
    secondaryStat: 'dodgePercent',
    secondaryValue: 4, // +4% Dodge (capped at 60%)
    tertiaryStat: 'pickupRange',
    tertiaryValue: 25, // +25px Pickup Magnet
    description: 'Paragraf tarama çevikliği ve dikkat: Hız, Sıyrılma şansı ve Toplama Alanı kazandırır.',
  },
  matematik: {
    subject: 'Matematik',
    categoryKeys: ['TYT Matematik', 'AYT Sayısal', 'AYT Sayisal'],
    primaryStat: 'attackSpeed',
    primaryValue: 8, // +8% Attack Speed
    secondaryStat: 'critChancePercent',
    secondaryValue: 6, // +6% Crit Chance
    tertiaryStat: 'damagePercent',
    tertiaryValue: 5, // +5% Damage
    description: 'Hızlı işlem ve analitik hassasiyet: Saldırı Hızı, Kritik Şans ve Hasar kazandırır.',
  },
  fen: {
    subject: 'Fen Bilimleri',
    categoryKeys: ['AYT Fen', 'TYT Fen'],
    primaryStat: 'elementalDamage',
    primaryValue: 3, // +3 Elemental Damage
    secondaryStat: 'engineering',
    secondaryValue: 4, // +4 Engineering
    tertiaryStat: 'hpRegen',
    tertiaryValue: 2, // +2 HP Regen
    description: 'Deney ve devre teknolojisi: Element Hasarı, Mühendislik ve Can Yenilenmesi kazandırır.',
  },
  buept: {
    subject: 'BUEPT İngilizce',
    categoryKeys: ['BUEPT Vocab', 'BUEPT Reading', 'BUEPT Logic', 'BUEPT Grammar'],
    primaryStat: 'harvesting',
    primaryValue: 15, // +15 Harvesting
    secondaryStat: 'luck',
    secondaryValue: 5, // +5 Luck
    tertiaryStat: 'range',
    tertiaryValue: 20, // +20 Range
    description: 'Uluslararası vizyon ve akademik burs: Hasat, Şans ve Menzil kazandırır.',
  },
  sosyal: {
    subject: 'Sosyal Bilimler',
    categoryKeys: ['TYT Sosyal'],
    primaryStat: 'armor',
    primaryValue: 2, // +2 Armor
    secondaryStat: 'maxHp',
    secondaryValue: 15, // +15 Max HP
    tertiaryStat: 'luck',
    tertiaryValue: 3, // +3 Luck
    description: 'Tarihsel dayanıklılık ve felsefi metanet: Zırh, Maksimum Can ve Şans kazandırır.',
  },
};

/**
 * Calculates and applies scaled subject buffs with difficulty and streak multipliers.
 */
export function calculateSubjectBuff(
  category: QuestionCategory | string,
  difficulty: 1 | 2 | 3 = 1,
  streak: number = 0
): StatModifiers {
  let def: SubjectBuffDefinition | undefined;
  const catLower = (category || '').toLowerCase();

  for (const item of Object.values(SUBJECT_BUFF_REGISTRY)) {
    if (
      item.categoryKeys.some((ck) => ck.toLowerCase() === catLower) ||
      catLower.includes(item.subject.toLowerCase())
    ) {
      def = item;
      break;
    }
  }

  if (!def) {
    if (catLower.includes('türk') || catLower.includes('turk')) def = SUBJECT_BUFF_REGISTRY.turkce;
    else if (catLower.includes('mat') || catLower.includes('sayısal') || catLower.includes('sayisal')) def = SUBJECT_BUFF_REGISTRY.matematik;
    else if (catLower.includes('fen')) def = SUBJECT_BUFF_REGISTRY.fen;
    else if (catLower.includes('sosyal')) def = SUBJECT_BUFF_REGISTRY.sosyal;
    else if (catLower.includes('buept') || catLower.includes('english')) def = SUBJECT_BUFF_REGISTRY.buept;
    else def = SUBJECT_BUFF_REGISTRY.turkce; // Safe fallback
  }

  // DDA & Streak multiplier: 1.0x (Diff 1) -> 1.5x (Diff 2) -> 2.0x (Diff 3)
  const diffMultiplier = 1 + (difficulty - 1) * 0.5;
  const safeStreak = Number.isFinite(streak) ? streak : 0;
  const streakBonus = 1 + Math.min(Math.max(0, safeStreak), 5) * 0.1;
  const totalMult = diffMultiplier * streakBonus;

  const modifiers: StatModifiers = {
    [def.primaryStat]: Math.round(def.primaryValue * totalMult),
    [def.secondaryStat]: Math.round(def.secondaryValue * totalMult),
  };

  if (def.tertiaryStat && def.tertiaryValue) {
    modifiers[def.tertiaryStat] = Math.round(def.tertiaryValue * totalMult);
  }

  return modifiers;
}

/**
 * Mutates player stats with clamped values (e.g. Dodge capped strictly at 60%).
 */
export function applySubjectBuffToStats(
  stats: PlayerRPGStats,
  modifiers: StatModifiers
): void {
  for (const [key, value] of Object.entries(modifiers)) {
    const statKey = key as keyof PlayerRPGStats;
    if (typeof stats[statKey] === 'number' && typeof value === 'number') {
      (stats[statKey] as number) += value;
    }
  }

  // Hard cap enforcement per Brotato rules
  stats.dodgePercent = Math.min(60, stats.dodgePercent);
  stats.currentHp = Math.min(stats.maxHp, stats.currentHp);
}

/**
 * Returns user-facing preview information for a subject.
 */
export function getSubjectBuffPreview(
  category: QuestionCategory | string,
  waveDifficulty: 1 | 2 | 3 = 1,
  streak: number = 0
): {
  subject: string;
  description: string;
  statPreview: StatModifiers;
} {
  const buff = calculateSubjectBuff(category, waveDifficulty, streak);
  const catLower = (category || '').toLowerCase();
  let matched = SUBJECT_BUFF_REGISTRY.turkce;

  for (const item of Object.values(SUBJECT_BUFF_REGISTRY)) {
    if (
      item.categoryKeys.some((ck) => ck.toLowerCase() === catLower) ||
      catLower.includes(item.subject.toLowerCase())
    ) {
      matched = item;
      break;
    }
  }

  if (matched === SUBJECT_BUFF_REGISTRY.turkce && !catLower.includes('türk') && !catLower.includes('turk')) {
    if (catLower.includes('mat') || catLower.includes('sayısal') || catLower.includes('sayisal')) matched = SUBJECT_BUFF_REGISTRY.matematik;
    else if (catLower.includes('fen')) matched = SUBJECT_BUFF_REGISTRY.fen;
    else if (catLower.includes('sosyal')) matched = SUBJECT_BUFF_REGISTRY.sosyal;
    else if (catLower.includes('buept') || catLower.includes('english')) matched = SUBJECT_BUFF_REGISTRY.buept;
  }

  return {
    subject: matched.subject,
    description: matched.description,
    statPreview: buff,
  };
}
