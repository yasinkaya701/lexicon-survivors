/**
 * RelicEngine.ts
 *
 * Runtime Relic Management & Combat Passive Processor for the "Boş Sayfa" Roguelite.
 * Aggregates stat bonuses from collected story relics and calculates special combat behaviors.
 */

import { PlayerRPGStats } from '@/types/brotato';
import { StoryRelic } from '@/data/storyQuests';

export class RelicEngine {
  private activeRelics: Map<string, StoryRelic> = new Map();

  /**
   * Clears all collected relics (e.g. on new run).
   */
  public reset(): void {
    this.activeRelics.clear();
  }

  /**
   * Adds a newly earned story relic to the player's loadout.
   */
  public addRelic(relic: StoryRelic): void {
    if (!this.activeRelics.has(relic.id)) {
      this.activeRelics.set(relic.id, relic);
    }
  }

  /**
   * Retrieves all currently active story relics in order of acquisition.
   */
  public getActiveRelics(): StoryRelic[] {
    return Array.from(this.activeRelics.values());
  }

  /**
   * Checks if a specific combat effect key is currently active.
   */
  public hasEffect(effectKey: string): boolean {
    for (const relic of this.activeRelics.values()) {
      if (relic.combatEffectKey === effectKey) {
        return true;
      }
    }
    return false;
  }

  /**
   * Aggregates all flat stat modifiers from active relics.
   */
  public getCombinedStatBuffs(): Partial<PlayerRPGStats> {
    const combined: Partial<PlayerRPGStats> = {};

    for (const relic of this.activeRelics.values()) {
      if (!relic.statBuffs) continue;
      for (const [key, val] of Object.entries(relic.statBuffs)) {
        const statKey = key as keyof PlayerRPGStats;
        if (typeof val === 'number') {
          const current = (combined[statKey] as number) || 0;
          (combined[statKey] as number) = current + val;
        }
      }
    }

    return combined;
  }

  /**
   * Multiplier applied to enemy projectile speeds (Parallax Astrolabe slow).
   */
  public getEnemyProjectileSpeedMultiplier(): number {
    return this.hasEffect('parallax_bullet_slow') ? 0.7 : 1.0;
  }

  /**
   * Bonus chain bounces for projectile attacks (Yıldız Astarı).
   */
  public getExtraChainBounces(): number {
    return this.hasEffect('star_lining_chain_bounce') ? 2 : 0;
  }

  /**
   * Range multiplier for chaining attacks (Lale’nin Yıldız Camı).
   */
  public getChainRangeMultiplier(): number {
    return this.hasEffect('star_glass_chain_range') ? 1.5 : 1.0;
  }

  /**
   * Global material multiplier on boss defeat (Kör Damla / Neris'in Damıtma Kabı).
   */
  public getBossDropMultiplier(): number {
    let mult = 1.0;
    if (this.hasEffect('blind_drop_ink')) mult += 0.35;
    if (this.hasEffect('neris_alembic_harvest_boost')) mult += 0.4;
    return mult;
  }

  /**
   * Cooldown multiplier for abilities and tactical freezes (Ortak Silgi Mührü).
   */
  public getCooldownMultiplier(): number {
    return this.hasEffect('joint_eraser_cooldown') ? 0.75 : 1.0;
  }

  /**
   * Health threshold under which non-boss enemies are executed (İz Bırakan Divit).
   */
  public getExecuteThreshold(): number {
    return this.hasEffect('open_registry_execute') ? 0.2 : 0.0;
  }

  /**
   * Vacuum range boost on boss defeat (Açık Hafıza Şişesi).
   */
  public isGlobalVacuumActive(): boolean {
    return this.hasEffect('open_vial_vacuum');
  }
}

// Global Singleton for easy integration with game loop & UI
export const relicEngine = new RelicEngine();
