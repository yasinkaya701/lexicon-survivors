/**
 * WaveDirector.ts - Pure TypeScript Wave Progression, Harmonic Pulsing & Vacuum Engine
 *
 * Implements:
 * 1. 20-wave curve (20s to 60s, culminating in 90s boss).
 * 2. Harmonic sinusoidal spawn pulsing formula: R(t) = R0 * (1 + 0.20W) * (1 + 0.5sin(2pi*t/15)).
 * 3. Linear enemy HP & Damage wave scaling.
 * 4. End-of-wave vacuum: magnetic acceleration pulling remaining materials.
 */

import type {
  EnemyType,
  WaveConfig,
  SpawnRule,
  WaveDirectorState,
} from '@/types/brotato';
import { type ArenaBounds } from '../entities/EnemyEntities';

export function calculateWaveDuration(wave: number): number {
  if (wave >= 20) return 90;
  if (wave >= 9) return 60;
  return 20 + (wave - 1) * 5;
}

export function calculateSpawnRate(
  baseRate: number,
  wave: number,
  timeSec: number
): number {
  const waveScaling = 1 + wave * 0.2;
  const pulseFactor = 1 + 0.5 * Math.sin((2 * Math.PI * timeSec) / 15);
  return Math.round(baseRate * waveScaling * pulseFactor * 100) / 100;
}

export function generateWaveConfig(wave: number): WaveConfig {
  const durationSec = calculateWaveDuration(wave);
  const isBossWave = wave <= 20 ? wave === 11 || wave === 20 : wave % 5 === 0;

  // Rules progression across 100 waves
  let spawnRules: SpawnRule[];
  if (wave === 1) {
    spawnRules = [{ enemyType: 'swarmer', weight: 1.0, clusterSize: 3 }];
  } else if (wave <= 3) {
    spawnRules = [
      { enemyType: 'swarmer', weight: 0.75, clusterSize: 3 },
      { enemyType: 'rusher', weight: 0.25, clusterSize: 1 },
    ];
  } else if (wave <= 5) {
    spawnRules = [
      { enemyType: 'swarmer', weight: 0.55, clusterSize: 4 },
      { enemyType: 'rusher', weight: 0.25, clusterSize: 2 },
      { enemyType: 'tank', weight: 0.2, clusterSize: 1 },
    ];
  } else if (wave <= 10) {
    spawnRules = [
      { enemyType: 'swarmer', weight: 0.45, clusterSize: 4 },
      { enemyType: 'rusher', weight: 0.25, clusterSize: 2 },
      { enemyType: 'tank', weight: 0.15, clusterSize: 1 },
      { enemyType: 'ranged', weight: 0.15, clusterSize: 1 },
    ];
  } else if (wave === 11) {
    spawnRules = [
      { enemyType: 'swarmer', weight: 0.4, clusterSize: 4 },
      { enemyType: 'rusher', weight: 0.25, clusterSize: 2 },
      { enemyType: 'tank', weight: 0.15, clusterSize: 1 },
      { enemyType: 'ranged', weight: 0.15, clusterSize: 1 },
      { enemyType: 'elite', weight: 0.05, clusterSize: 1 },
    ];
  } else if (wave < 20) {
    spawnRules = [
      { enemyType: 'swarmer', weight: 0.35, clusterSize: 5 },
      { enemyType: 'rusher', weight: 0.3, clusterSize: 2 },
      { enemyType: 'tank', weight: 0.2, clusterSize: 1 },
      { enemyType: 'ranged', weight: 0.15, clusterSize: 2 },
    ];
  } else {
    // Waves 20 - 100: Grand Archival Siege
    spawnRules = [
      { enemyType: 'swarmer', weight: 0.35, clusterSize: 5 },
      { enemyType: 'rusher', weight: 0.3, clusterSize: 3 },
      { enemyType: 'tank', weight: 0.2, clusterSize: 2 },
      { enemyType: 'ranged', weight: 0.15, clusterSize: 2 },
    ];
  }

  const maxConcurrentEnemies = Math.min(85, 20 + Math.min(wave, 30) * 2);

  return {
    waveNumber: wave,
    durationSec,
    spawnIntervalMs: 1000,
    maxConcurrentEnemies,
    spawnRules,
    isBossWave,
    bossType: isBossWave ? 'elite' : undefined,
  };
}

export class WaveDirector {
  public state: WaveDirectorState;
  public config: WaveConfig;
  public arenaBounds: ArenaBounds;
  public elapsedTimeSec = 0;
  public spawnTimerMs = 0;
  public baseSpawnRate = 1.8;

  constructor(arenaBounds: ArenaBounds) {
    this.arenaBounds = arenaBounds;
    this.config = generateWaveConfig(1);
    this.state = {
      currentWave: 1,
      waveTimeRemainingSec: 20,
      waveDurationSec: 20,
      isWaveActive: false,
      isWaveCompleted: false,
      enemiesSpawnedThisWave: 0,
      totalWaves: 20,
      spawnTimerMs: 0,
      activeEnemyCount: 0,
      isVacuumActive: false,
    };
  }

  public startWave(waveNumber: number): { bossSpawn?: { type: EnemyType; x: number; y: number } } {
    this.config = generateWaveConfig(waveNumber);
    this.elapsedTimeSec = 0;
    this.spawnTimerMs = 0;

    this.state.currentWave = waveNumber;
    this.state.waveDurationSec = this.config.durationSec;
    this.state.waveTimeRemainingSec = this.config.durationSec;
    this.state.isWaveActive = true;
    this.state.isWaveCompleted = false;
    this.state.isVacuumActive = false;
    this.state.enemiesSpawnedThisWave = 0;

    let bossSpawn: { type: EnemyType; x: number; y: number } | undefined;
    if (this.config.isBossWave) {
      bossSpawn = {
        type: 'elite',
        x: (this.arenaBounds.minX + this.arenaBounds.maxX) / 2,
        y: this.arenaBounds.minY + 120,
      };
      this.state.enemiesSpawnedThisWave++;
    }

    return { bossSpawn };
  }

  public update(
    dt: number,
    activeEnemyCount: number,
    playerPos: { x: number; y: number }
  ): {
    enemiesToSpawn: Array<{ type: EnemyType; x: number; y: number }>;
    isWaveJustCompleted: boolean;
  } {
    const result = {
      enemiesToSpawn: [] as Array<{ type: EnemyType; x: number; y: number }>,
      isWaveJustCompleted: false,
    };

    if (dt <= 0 || !this.state.isWaveActive) return result;

    this.elapsedTimeSec += dt;
    this.state.waveTimeRemainingSec = Math.max(0, this.state.waveTimeRemainingSec - dt);
    this.state.activeEnemyCount = activeEnemyCount;

    // Check wave completion
    if (this.state.waveTimeRemainingSec <= 0) {
      this.state.isWaveActive = false;
      this.state.isWaveCompleted = true;
      this.state.isVacuumActive = true;
      result.isWaveJustCompleted = true;
      return result;
    }

    // Spawn ticker modulated by harmonic wave
    const currentRate = calculateSpawnRate(
      this.baseSpawnRate,
      this.state.currentWave,
      this.elapsedTimeSec
    );
    const intervalMs = Math.max(250, 1000 / currentRate);

    this.spawnTimerMs += dt * 1000;
    if (
      this.spawnTimerMs >= intervalMs &&
      activeEnemyCount < this.config.maxConcurrentEnemies
    ) {
      this.spawnTimerMs = 0;
      const rule = this.selectSpawnRule();
      if (rule) {
        const count = rule.clusterSize || 1;
        for (let i = 0; i < count; i++) {
          if (activeEnemyCount + result.enemiesToSpawn.length >= this.config.maxConcurrentEnemies) {
            break;
          }
          const spawnCoord = this.generatePerimeterSpawnLocation(playerPos);
          result.enemiesToSpawn.push({
            type: rule.enemyType,
            x: spawnCoord.x,
            y: spawnCoord.y,
          });
          this.state.enemiesSpawnedThisWave++;
        }
      }
    }

    return result;
  }

  private selectSpawnRule(): SpawnRule | null {
    const rules = this.config.spawnRules;
    if (rules.length === 0) return null;

    const totalWeight = rules.reduce((sum, r) => sum + r.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const rule of rules) {
      if (roll <= rule.weight) return rule;
      roll -= rule.weight;
    }
    return rules[rules.length - 1];
  }

  public generatePerimeterSpawnLocation(playerPos: { x: number; y: number }): { x: number; y: number } {
    const pad = 40;
    const minDistance = 350;

    for (let attempts = 0; attempts < 10; attempts++) {
      // Pick random side: 0=top, 1=right, 2=bottom, 3=left
      const side = Math.floor(Math.random() * 4);
      let x = 0;
      let y = 0;

      if (side === 0) {
        x = this.arenaBounds.minX + pad + Math.random() * (this.arenaBounds.maxX - this.arenaBounds.minX - pad * 2);
        y = this.arenaBounds.minY + pad;
      } else if (side === 1) {
        x = this.arenaBounds.maxX - pad;
        y = this.arenaBounds.minY + pad + Math.random() * (this.arenaBounds.maxY - this.arenaBounds.minY - pad * 2);
      } else if (side === 2) {
        x = this.arenaBounds.minX + pad + Math.random() * (this.arenaBounds.maxX - this.arenaBounds.minX - pad * 2);
        y = this.arenaBounds.maxY - pad;
      } else {
        x = this.arenaBounds.minX + pad;
        y = this.arenaBounds.minY + pad + Math.random() * (this.arenaBounds.maxY - this.arenaBounds.minY - pad * 2);
      }

      const dist = Math.hypot(x - playerPos.x, y - playerPos.y);
      if (dist >= minDistance) {
        return { x, y };
      }
    }

    // Fallback safe perimeter point
    return {
      x: this.arenaBounds.minX + pad,
      y: this.arenaBounds.minY + pad,
    };
  }
}
