import type { GameLoop } from '@/game/engine/GameLoop';
import { soundEngine } from '@/lib/sound';
import type { TacticalQuestion } from '@/types/game';

export interface TacticalFreezeSession {
  isActive: boolean;
  source: 'mystery_chest' | 'elite_defeat' | 'manual';
  question: TacticalQuestion;
  openedAtTimestamp: number;
}

export interface FreezeControllerTarget {
  setTacticalFreeze: (frozen: boolean) => void;
  isFrozen?: () => boolean;
}

export class FreezeManager {
  private session: TacticalFreezeSession | null = null;

  constructor(private readonly loopTarget?: FreezeControllerTarget | GameLoop) {}

  /**
   * Engages frame-accurate tactical freeze.
   * Forces simulation dt = 0 while keeping the 60 FPS Canvas rendering active.
   */
  public triggerFreeze(
    source: 'mystery_chest' | 'elite_defeat' | 'manual',
    question: TacticalQuestion
  ): void {
    this.session = {
      isActive: true,
      source,
      question,
      openedAtTimestamp: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    };

    if (this.loopTarget) {
      this.loopTarget.setTacticalFreeze(true);
    }

    try {
      soundEngine.playTacticalFreeze();
    } catch {
      // Audio fallback
    }
  }

  /**
   * Disengages tactical freeze with zero-delta jump guarantee.
   */
  public resumeCombat(): void {
    if (this.loopTarget) {
      this.loopTarget.setTacticalFreeze(false);
    }
    this.session = null;
  }

  public isFrozen(): boolean {
    if (this.loopTarget?.isFrozen) {
      return this.loopTarget.isFrozen();
    }
    return this.session !== null && this.session.isActive;
  }

  public getSession(): TacticalFreezeSession | null {
    return this.session;
  }
}
