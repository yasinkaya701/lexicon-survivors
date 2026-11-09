export type CampaignAct = 'yks' | 'buept';
export type GameScene =
  | 'room'
  | 'battle'
  | 'survivors'
  | 'detective'
  | 'defuse'
  | 'telemetry'
  | 'victory';
export type QuestionType = 'multiple_choice' | 'evidence_hunt';

export type QuestionCategory =
  | 'TYT Matematik'
  | 'TYT Fen'
  | 'TYT Türkçe'
  | 'TYT Sosyal'
  | 'AYT Fen'
  | 'AYT Sayısal'
  | 'BUEPT Vocab'
  | 'BUEPT Reading'
  | 'BUEPT Logic'
  | 'BUEPT Grammar';

export interface PassageToken {
  text: string;
  isClue?: boolean;
}

export interface TacticalQuestion {
  id: string;
  act: CampaignAct;
  category: QuestionCategory;
  subtopic?: string;
  type: QuestionType;
  difficulty: 1 | 2 | 3;
  prompt: string;
  passageTokens?: PassageToken[];
  options?: string[];
  correctIndex?: number;
  mnemonic: string;
  timeLimitSec: number;
}

export interface RoomUpgrades {
  rgbSetup: boolean;        // 1.5x Net multiplier & dual RGB monitor visual
  espressoMachine: boolean; // +25 Max Energy & animated steam visual
  kilyosHeater: boolean;    // Shields Mental Health during Kilyos storm
  ergonomicChair: boolean;  // Reduces BPM stress spikes during Boss fights
  aiTablet: boolean;        // Grants 1 free 50/50 elimination per battle
}

export interface UnitStats {
  id: 'knight' | 'mage' | 'golem' | 'dragon';
  name: string;
  icon: string;
  cost: number;
  hp: number;
  dmg: number;
  speed: number;
  color: string;
  desc: string;
}

export interface MistakeEntry {
  question: TacticalQuestion;
  status: 'wrong' | 'skipped';
  timestamp: number;
  resolved: boolean;
}

export interface TelemetryStats {
  totalAnswered: number;
  correctCount: number;
  wrongCount: number;
  turlaCount: number;
  shieldBreaks: number;
  maxCombo: number;
  avgReactionMs: number;
  peakBpm: number;
  skills: {
    speed: number;
    turlama: number;
    stressControl: number;
    yksMastery: number;
    bueptMastery: number;
  };
}
