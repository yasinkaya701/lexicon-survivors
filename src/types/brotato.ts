/**
 * Brotato Arena Roguelite Game Schema & Type Definitions
 *
 * Authoritative schema specifications for:
 * - 17 Player RPG stats and modifiers
 * - Weapons system (melee/ranged, tiers 1-4, scaling, active instances)
 * - Enemy system (5 canonical archetypes, AI states, blueprints, entities)
 * - Projectiles, visual particles, floating combat text, and area explosions
 * - Drops, economy, magnetic vacuum, and loot crates
 * - Wave progression curves, spawn tables, and wave director state
 * - 4-slot shop, reroll cost escalation, price inflation, and tier combining
 * - Educational YKS / BUEPT tactical question buffs and frame-accurate freeze
 * - Top-level RogueliteGameState machine
 */

import type { TacticalQuestion, QuestionCategory, MistakeEntry } from './game';

// ============================================================================
// 1. PLAYER RPG STATS (17 STAT SYSTEM)
// ============================================================================

/**
 * Complete 17-Stat RPG sheet for the Brotato roguelite engine.
 * Every stat directly modulates combat formulas, kinematics, or economy.
 */
export interface PlayerRPGStats {
  /** Maximum health pool (Base: 10, minimum: 1) */
  maxHp: number;
  /** Current health (Clamped: [0, maxHp]) */
  currentHp: number;
  /** HP Regeneration speed modifier (Base: 0; formula: interval = 5.0 / (1.0 + (regen - 1) / 2.25) seconds) */
  hpRegen: number;
  /** Percentage chance to heal 1 HP on hit (Base: 0; subject to strict 0.10s ICD, max 10 HP/s) */
  lifeSteal: number;
  /** Global percentage modifier to all outgoing weapon damage (Base: 0) */
  damagePercent: number;
  /** Flat damage added to melee weapons before percentage multiplier (Base: 0) */
  meleeDamage: number;
  /** Flat damage added to ranged weapons before percentage multiplier (Base: 0) */
  rangedDamage: number;
  /** Flat damage added to elemental weapons/burn ticks (Base: 0) */
  elementalDamage: number;
  /** Percentage attack speed reduction modifier (Base: 0; cooldown = baseCooldown * 100 / (100 + attackSpeed)) */
  attackSpeed: number;
  /** Percentage chance to inflict critical strike (Base: 0) */
  critChancePercent: number;
  /** Stat scaling deployables, turrets, and mechanical structures (Base: 0) */
  engineering: number;
  /** Reach/firing range extension (Ranged: 100% scaling; Melee: 50% scaling; Min range: 25px) */
  range: number;
  /** Damage reduction stat (Multiplier = 15 / (15 + armor) for armor >= 0; Amplified if < 0) */
  armor: number;
  /** Percentage chance to completely negate incoming hit (Base: 0; hard-capped strictly at 60%) */
  dodgePercent: number;
  /** Movement speed percentage modifier (Base: 0; base move speed = 300 px/s) */
  speedPercent: number;
  /** Scales probability of rare shop tiers, fruit drops, and loot crates (Base: 0) */
  luck: number;
  /** End-of-wave currency bonus + 5% compound growth per wave (Base: 0) */
  harvesting: number;
  /** Magnetic attraction radius in pixels for collecting material gems (Base: 120px) */
  pickupRange: number;
}

export type StatKey = keyof PlayerRPGStats;
export type StatModifiers = Partial<PlayerRPGStats>;

export interface StatMetadata {
  key: StatKey;
  label: string;
  shortLabel: string;
  iconName: string;
  description: string;
  baseValue: number;
  hardCap?: number;
  isPercentage?: boolean;
}

// ============================================================================
// 2. PLAYER ENTITY
// ============================================================================

export interface PlayerEntity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number; // Default: 24px
  facingAngleRad: number;
  stats: PlayerRPGStats;
  invulnerabilityTimerMs: number;
  isInvulnerable: boolean;
  spriteName: string;
  characterId: string;
}

// ============================================================================
// 3. WEAPON SCHEMAS & ACTIVE INVENTORY
// ============================================================================

export type WeaponType = 'melee' | 'ranged';
export type WeaponSubtype = 'swing' | 'thrust' | 'projectile' | 'spread';
export type WeaponTier = 1 | 2 | 3 | 4; // 1: Common (White), 2: Uncommon (Blue), 3: Rare (Purple), 4: Legendary (Red)
export type WeaponScalingStat = 'meleeDamage' | 'rangedDamage' | 'engineering' | 'elementalDamage';

export interface WeaponScaling {
  stat: WeaponScalingStat;
  ratio: number; // e.g. 1.0 = 100%, 0.8 = 80%
}

export interface WeaponBlueprint {
  id: string;
  name: string;
  type: WeaponType;
  subtype: WeaponSubtype;
  tier: WeaponTier;
  baseDamage: number;
  scalingStat: WeaponScalingStat;
  scalingRatio: number; // Multiplier applied to scalingStat
  baseCooldownMs: number;
  baseRange: number; // px
  critChance: number; // 0.05 for 5%
  critMultiplier: number; // e.g. 1.5 - 2.0x
  knockback: number; // Impulse magnitude
  pierce: number; // Projectile pierce count (0 = despawns on first hit)
  bounce: number; // Projectile bounce count
  projectileSpeed?: number; // px/sec for ranged projectile/spread
  pelletCount?: number; // for shotgun / spread weapons
  spreadAngleDeg?: number; // angular cone for spread weapons
  arcAngleDeg?: number; // angular cleave for melee swing weapons (e.g. 120 deg)
  spriteName: string;
  description?: string;
  basePrice?: number;
}

export type WeaponState = 'ready' | 'firing' | 'cooldown';

export interface ActiveWeaponInstance {
  id: string;
  blueprint: WeaponBlueprint;
  slotIndex: number; // 0 to 5 (up to 6 weapons)
  currentCooldownMs: number;
  targetEnemyId: string | null;
  currentAngleRad: number;
  state: WeaponState;
  attackProgress: number; // 0.0 to 1.0 during swing/thrust animation
}

export type TargetingMode = 'closest' | 'lowest_health' | 'highest_threat' | 'manual';

// ============================================================================
// 4. ENEMY SCHEMAS & ENTITIES
// ============================================================================

export type EnemyType = 'swarmer' | 'rusher' | 'tank' | 'ranged' | 'elite';

export type EnemyState =
  | 'spawning'
  | 'pursuing'
  | 'charging'
  | 'telegraphing'
  | 'shooting'
  | 'retreating'
  | 'stunned'
  | 'dying';

export interface EnemyBlueprint {
  type: EnemyType;
  name: string;
  baseHp: number;
  hpScalingPerWave: number;
  baseDamage: number;
  damageScalingPerWave: number;
  baseSpeed: number; // px/sec
  mass: number; // Resistance to knockback (mass 1.0 = normal, 3.0 = heavy)
  radius: number; // Hitbox radius in px
  isImmuneToKnockback: boolean;
  behavior: string;
  spriteName: string;
  dropTable: DropTableEntry[];
  shootCooldownMs?: number;
  telegraphDurationMs?: number;
}

export interface EnemyEntity {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  mass: number;
  radius: number;
  state: EnemyState;
  stateTimerMs: number;
  isImmuneToKnockback: boolean;
  hitFlashTimerMs: number;
  targetPosition?: { x: number; y: number };
  attackCooldownMs: number;
  facingAngleRad: number;
  customData?: Record<string, unknown>;
}

// ============================================================================
// 5. PROJECTILES, PARTICLES & EXPLOSIONS
// ============================================================================

export interface ProjectileEntity {
  id: string;
  source: 'player' | 'enemy';
  weaponId?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  isCrit: boolean;
  knockback: number;
  remainingPierces: number;
  remainingBounces: number;
  hitEntityIds: string[];
  maxRange: number;
  distanceTraveled: number;
  lifetimeMs: number;
  maxLifetimeMs: number;
  radius: number;
  spriteName?: string;
  color?: string;
}

export interface FloatingTextParticle {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  lifetimeMs: number;
  maxLifetimeMs: number;
  vy: number;
  vx?: number;
  opacity: number;
}

export interface ExplosionEntity {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  damage: number;
  durationMs: number;
  elapsedMs: number;
  color: string;
  hitEntityIds: string[];
}

// ============================================================================
// 6. PICKUPS, DROPS & MAGNETIC VACUUM
// ============================================================================

export type PickupType = 'material' | 'fruit' | 'chest';

export interface PickupEntity {
  id: string;
  type: PickupType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number; // Gold/XP amount for material (1), HP for fruit (3), tier for chest
  radius: number;
  isMagnetized: boolean;
  spriteName?: string;
  lifetimeMs?: number;
}

export interface DropTableEntry {
  type: PickupType;
  baseChance: number; // 0.0 to 1.0 (e.g. 1.0 for material, 0.01 for fruit)
  luckScalable: boolean;
  valueRange: [number, number];
}

// ============================================================================
// 7. WAVE PACING & DIRECTOR PROGRESSION
// ============================================================================

export interface SpawnRule {
  enemyType: EnemyType;
  weight: number; // Relative probability of spawning
  minWaveTimeSec?: number; // Only spawn after this wave time
  maxWaveTimeSec?: number; // Stop spawning after this wave time
  clusterSize?: number; // e.g. 3-5 swarmers simultaneously
}

export interface WaveConfig {
  waveNumber: number; // 1 to 20
  durationSec: number; // 20s to 60s, culminating in 90s boss wave
  spawnIntervalMs: number; // Pulse timing
  maxConcurrentEnemies: number;
  spawnRules: SpawnRule[];
  isBossWave: boolean;
  bossType?: EnemyType;
}

export interface WaveDirectorState {
  currentWave: number;
  waveTimeRemainingSec: number;
  waveDurationSec: number;
  isWaveActive: boolean;
  isWaveCompleted: boolean;
  enemiesSpawnedThisWave: number;
  totalWaves: number;
  spawnTimerMs: number;
  activeEnemyCount: number;
  isVacuumActive: boolean;
}

// ============================================================================
// 8. INTER-WAVE SHOP, ECONOMY & COMBINING
// ============================================================================

export type ShopItemType = 'weapon' | 'passive_item' | 'stat_upgrade';

export interface ShopSlot {
  slotIndex: number; // 0 to 3 (4 slots)
  itemType: ShopItemType;
  itemId: string;
  name: string;
  description: string;
  tier: WeaponTier;
  cost: number;
  originalCost: number;
  isLocked: boolean;
  isPurchased: boolean;
  iconName: string;
  statModifiers?: Partial<PlayerRPGStats>;
  weaponBlueprint?: WeaponBlueprint;
}

export interface ShopRarityWeights {
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
}

export interface ShopState {
  slots: ShopSlot[];
  rerollCount: number;
  currentRerollCost: number;
  isDiscountActive: boolean;
  discountMultiplier: number;
}

export interface UpgradeChoice {
  id: string;
  title: string;
  description: string;
  tier: WeaponTier;
  statModifiers: Partial<PlayerRPGStats>;
  icon: string;
}

export interface PassiveItemBlueprint {
  id: string;
  name: string;
  tier: WeaponTier;
  description: string;
  statModifiers: Partial<PlayerRPGStats>;
  iconName: string;
  basePrice: number;
  maxStack?: number;
}

// ============================================================================
// 9. EDUCATIONAL TACTICAL QUESTION BUFF SCHEMAS
// ============================================================================

export interface TacticalFreezeEvent {
  source: 'mystery_chest' | 'elite_defeat' | 'manual_intercept';
  chestPosition?: { x: number; y: number };
  enemyId?: string;
  question: TacticalQuestion;
}

export type TacticalRewardType =
  | 'emergency_heal'
  | 'orbital_nuke'
  | 'flow_state_frenzy'
  | 'global_vacuum';

export interface TacticalRewardOption {
  type: TacticalRewardType;
  title: string;
  description: string;
  icon: string;
  healPercent?: number; // e.g. 50%
  nukeDamage?: number; // e.g. 180 dmg
  frenzyDurationSec?: number; // e.g. 6s
}

export type StudyRewardType = 'subject_stat' | 'instant_materials' | 'shop_discount';

export interface StudyRewardChoice {
  type: StudyRewardType;
  title: string;
  description: string;
  category?: QuestionCategory;
  statModifiers?: Partial<PlayerRPGStats>;
  materialsBonus?: number;
  discountPercent?: number;
}

// ============================================================================
// 10. STUDY TELEMETRY & CATEGORY METRICS
// ============================================================================

export interface CategoryMetric {
  category: QuestionCategory;
  attempts: number;
  correct: number;
  wrong: number;
  skipped: number;
  streak: number;
  bestStreak: number;
  totalResponseTimeMs: number;
  avgResponseTimeMs: number;
  accuracyRate: number; // 0.0 to 1.0
}

export interface StudySessionTracker {
  overall: {
    totalAttempted: number;
    totalCorrect: number;
    totalWrong: number;
    totalSkipped: number;
    accuracyPercent: number;
    maxStreak: number;
    currentStreak: number;
    avgReactionMs: number;
  };
  byCategory: Partial<Record<QuestionCategory, CategoryMetric>>;
  mistakeLog: MistakeEntry[];
}

// ============================================================================
// 11. CHARACTER BLUEPRINT
// ============================================================================

export interface CharacterBlueprint {
  id: string;
  name: string;
  title: string;
  description: string;
  spriteName: string;
  baseStats: Partial<PlayerRPGStats>;
  startingWeapons: string[]; // Weapon blueprint IDs
}

// ============================================================================
// 12. GLOBAL ROGUELITE GAME STATE MACHINE
// ============================================================================

export interface RogueliteGameState {
  wave: number;
  waveTimer: number;
  isPaused: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  bulletTimeActive: boolean;
  player: PlayerEntity;
  weapons: ActiveWeaponInstance[];
  enemies: EnemyEntity[];
  projectiles: ProjectileEntity[];
  particles: FloatingTextParticle[];
  explosions: ExplosionEntity[];
  pickups: PickupEntity[];
  materials: number;
  xp: number;
  currentLevel: number;
  xpToNextLevel: number;
  totalKills: number;
  activeTacticalEvent: TacticalFreezeEvent | null;
  shopState: ShopState;
  studySession: StudySessionTracker;
  waveDirector: WaveDirectorState;
  arenaBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}
