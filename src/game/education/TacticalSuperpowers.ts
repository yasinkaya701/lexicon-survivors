import type {
  PlayerEntity,
  EnemyEntity,
  PickupEntity,
  TacticalRewardType,
} from '@/types/brotato';
import type { FloatingTextManager, VFXManager } from '@/game/vfx';
import { soundEngine } from '@/lib/sound';

export type TacticalSuperpowerId =
  | 'emergency_heal'
  | 'orbital_nuke'
  | 'flow_state_frenzy'
  | 'global_vacuum'
  | 'revitalizing_surge'
  | 'cosmic_vacuum';

export interface SuperpowerDefinition {
  id: TacticalRewardType;
  aliasId?: string;
  name: string;
  badge: string;
  icon: string;
  description: string;
}

export const SUPERPOWER_CATALOG: SuperpowerDefinition[] = [
  {
    id: 'emergency_heal',
    aliasId: 'revitalizing_surge',
    name: 'Yenileyici Dalga (Revitalizing Surge)',
    badge: 'Acil Tedavi',
    icon: '💚',
    description: "Eksik canının %50'sini anında yeniler (min 30 HP) ve 3 saniyelik hasar almazlık kalkanı verir.",
  },
  {
    id: 'orbital_nuke',
    name: 'Boğaziçi Süpernova (Orbital Nuke)',
    badge: 'Alan Temizliği',
    icon: '💥',
    description: 'Tüm ekrandaki düşmanlara 500 flat hasar veren sismik parçacık şok dalgası yaratır.',
  },
  {
    id: 'flow_state_frenzy',
    name: 'Akış Durumu Çılgınlığı (Flow State Frenzy)',
    badge: '10sn Hiper-Mod',
    icon: '⚡',
    description: '10 saniye boyunca +%100 saldırı hızı, 0 bekleme süresi ve %100 kritik vuruş çılgınlığı!',
  },
  {
    id: 'global_vacuum',
    aliasId: 'cosmic_vacuum',
    name: 'Evrensel Kozmik Vakum (Cosmic Vacuum)',
    badge: 'Tam Çekim',
    icon: '🧲',
    description: 'Arenanın neresinde olursa olsun tüm materyal, kristal ve meyveleri anında çantana çeker.',
  },
];

export interface VisualFXStub {
  spawnPickupRing?: (x: number, y: number, pickupType: 'material' | 'fruit' | 'chest') => void;
  triggerWhiteFlash?: (alpha: number) => void;
  addTrauma?: (trauma: number) => void;
  spawnHitSparks?: (x: number, y: number, angle: number, isCrit: boolean, count?: number) => void;
}

export interface FloatingTextStub {
  spawnHeal?: (x: number, y: number, amount: number, isCrit?: boolean) => void;
  spawnDamage?: (x: number, y: number, damage: number, isCrit?: boolean) => void;
  spawnBanner?: (x: number, y: number, text: string, color?: string) => void;
}

export const SuperpowerEngine = {
  /**
   * Executes Revitalizing Surge: Restores 50% of missing HP (min 30 HP) + 3s invulnerability.
   */
  executeRevitalizingSurge(
    player: PlayerEntity,
    ftm?: FloatingTextManager | FloatingTextStub,
    vfx?: VFXManager | VisualFXStub
  ): number {
    const missingHp = Math.max(0, player.stats.maxHp - player.stats.currentHp);
    const healAmount = Math.max(30, Math.floor(missingHp * 0.5));
    player.stats.currentHp = Math.min(player.stats.maxHp, player.stats.currentHp + healAmount);
    player.invulnerabilityTimerMs = Math.max(player.invulnerabilityTimerMs, 3000);

    if (ftm?.spawnHeal) {
      ftm.spawnHeal(player.x, player.y, healAmount, true);
    }
    if (vfx?.spawnPickupRing) {
      vfx.spawnPickupRing(player.x, player.y, 'fruit');
    }
    if (vfx?.triggerWhiteFlash) {
      vfx.triggerWhiteFlash(0.25);
    }

    try {
      soundEngine.playComboUp(3);
    } catch {
      // Audio fallback
    }

    return healAmount;
  },

  /**
   * Executes Orbital Particle Nuke: 500 flat damage across all active enemies.
   */
  executeOrbitalNuke(
    enemies: EnemyEntity[],
    ftm?: FloatingTextManager | FloatingTextStub,
    vfx?: VFXManager | VisualFXStub
  ): number {
    const nukeDamage = 500;
    let totalHit = 0;

    for (const enemy of enemies) {
      enemy.hp -= nukeDamage;
      enemy.hitFlashTimerMs = 200;
      totalHit++;

      if (ftm?.spawnDamage) {
        ftm.spawnDamage(enemy.x, enemy.y, nukeDamage, true);
      }
      if (vfx?.spawnHitSparks) {
        vfx.spawnHitSparks(enemy.x, enemy.y, 0, true, 6);
      }
    }

    if (vfx?.triggerWhiteFlash) {
      vfx.triggerWhiteFlash(0.5);
    }
    if (vfx?.addTrauma) {
      vfx.addTrauma(0.5);
    }

    try {
      soundEngine.playNukeDetonation();
    } catch {
      // Audio fallback
    }

    return totalHit;
  },

  /**
   * Activates Flow State Frenzy for the given duration in seconds (default 10s).
   */
  activateFlowStateFrenzy(durationSec: number = 10.0): number {
    try {
      soundEngine.playOrbitalLaser();
    } catch {
      // Audio fallback
    }
    return durationSec;
  },

  /**
   * Executes Cosmic Material Vacuum: Attracts all material drops to player.
   */
  executeCosmicVacuum(
    pickups: PickupEntity[],
    player: PlayerEntity,
    ftm?: FloatingTextManager | FloatingTextStub,
    vfx?: VFXManager | VisualFXStub
  ): number {
    let totalValue = 0;
    let count = 0;

    for (const p of pickups) {
      if (p.type === 'material' || p.type === 'fruit') {
        p.isMagnetized = true;
        const dx = player.x - p.x;
        const dy = player.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        p.vx = (dx / dist) * 1200;
        p.vy = (dy / dist) * 1200;
        totalValue += p.value;
        count++;
      }
    }

    if (ftm?.spawnBanner) {
      ftm.spawnBanner(player.x, player.y, `🧲 KOZMİK VAKUM: +${totalValue} 💎`, '#38bdf8');
    }
    if (vfx?.triggerWhiteFlash) {
      vfx.triggerWhiteFlash(0.2);
    }

    try {
      soundEngine.playGemPickup(10);
    } catch {
      // Audio fallback
    }

    return totalValue;
  },
};
