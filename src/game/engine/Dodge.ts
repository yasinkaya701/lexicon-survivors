/**
 * Dodge Avoidance System Module
 * Implements strict 60% dodge avoidance cap, RNG roll mechanics,
 * 0 damage response on success, and visual alert event creation.
 */

import { type IVector2D } from './Vector2D';

export const MAX_DODGE_PERCENT = 60; // strictly clamped 60% cap
export const MIN_DODGE_PERCENT = 0; // negative dodge clamped to 0%

export interface DodgeVisualAlert {
  type: 'dodge';
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  timestamp: number;
  durationMs: number;
}

export interface DodgeRollResult {
  isDodged: boolean;
  effectiveDodgePercent: number;
  rollValue: number;
  finalDamage: number;
  rawDamage: number;
  visualAlert?: DodgeVisualAlert;
}

/**
 * Calculates effective dodge percentage clamped strictly to [0%, 60%].
 * Matches tests/unit/combat_math.test.ts:32-34 and tests/e2e/game_loop_tiers.test.ts:195-201.
 */
export function calculateEffectiveDodge(dodgePercent: number): number {
  return Math.min(MAX_DODGE_PERCENT, Math.max(MIN_DODGE_PERCENT, dodgePercent));
}

/**
 * Rolls dodge avoidance against an incoming attack.
 * If successful:
 * - isDodged = true
 * - finalDamage = 0
 * - Generates visual alert event with 'DODGE!' text
 * If failed:
 * - isDodged = false
 * - finalDamage = rawDamage (which then proceeds to armor mitigation)
 */
export function rollDodge(
  rawDamage: number,
  dodgePercent: number,
  position?: IVector2D,
  rng: () => number = Math.random
): DodgeRollResult {
  const effectiveDodge = calculateEffectiveDodge(dodgePercent);
  const rollValue = rng() * 100;
  const isDodged = rollValue < effectiveDodge;

  let visualAlert: DodgeVisualAlert | undefined;
  if (isDodged && position) {
    visualAlert = {
      type: 'dodge',
      text: 'DODGE!',
      x: position.x,
      y: position.y - 32, // Float above entity head
      color: '#38bdf8', // Bright sky blue
      fontSize: 18,
      timestamp: Date.now(),
      durationMs: 700,
    };
  }

  return {
    isDodged,
    effectiveDodgePercent: effectiveDodge,
    rollValue,
    finalDamage: isDodged ? 0 : rawDamage,
    rawDamage,
    visualAlert,
  };
}

/**
 * Tracks dodge telemetry and success statistics over the course of a run.
 */
export class DodgeTracker {
  public totalIncomingHits: number = 0;
  public totalDodgedHits: number = 0;

  public registerRoll(result: DodgeRollResult): void {
    this.totalIncomingHits++;
    if (result.isDodged) {
      this.totalDodgedHits++;
    }
  }

  public getRealizedDodgeRate(): number {
    if (this.totalIncomingHits === 0) return 0;
    return (this.totalDodgedHits / this.totalIncomingHits) * 100;
  }

  public reset(): void {
    this.totalIncomingHits = 0;
    this.totalDodgedHits = 0;
  }
}
