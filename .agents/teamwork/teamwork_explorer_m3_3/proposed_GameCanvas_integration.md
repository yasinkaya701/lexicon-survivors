# Integration Guide: GameCanvas.tsx with FloatingTextManager & VFXManager

This document provides drop-in instructions for replacing the naive unpooled floating text and particle loops in `src/components/GameCanvas.tsx` with high-performance `FloatingTextManager` and `VFXManager`.

---

## 1. File Placement
Copy the two managers into the engine's VFX directory:
- `src/game/vfx/FloatingTextManager.ts`
- `src/game/vfx/VFXManager.ts`
- `src/game/vfx/index.ts`

```typescript
// src/game/vfx/index.ts
export * from './FloatingTextManager';
export * from './VFXManager';
```

---

## 2. Changes in `src/components/GameCanvas.tsx`

### 2.1 Imports
Add:
```typescript
import { FloatingTextManager, VFXManager } from '@/game/vfx';
```

Remove lines 55-79 (`interface FloatingText` and `interface Particle`).

### 2.2 Enemy Color Mapping Helper
```typescript
const ENEMY_VFX_COLORS: Record<EnemyType, string> = {
  swarmer: '#f97316',
  rusher: '#ec4899',
  tank: '#64748b',
  ranged: '#10b981',
  elite: '#a855f7',
};
```

### 2.3 Component State References
Replace:
```typescript
// Remove:
// const floatingTextsRef = useRef<FloatingText[]>([]);
// const particlesRef = useRef<Particle[]>([]);
// const addFloatingText = ...
// const addHitParticles = ...

// Add:
const floatingTextManagerRef = useRef<FloatingTextManager>(new FloatingTextManager(64));
const vfxManagerRef = useRef<VFXManager>(new VFXManager(512));
```

### 2.4 Simulation Update Loop (`loop.onUpdate`)
```typescript
loop.onUpdate((dt: number) => {
  if (dt <= 0 || isWaveTransitioningRef.current) return;

  const ftm = floatingTextManagerRef.current;
  const vfx = vfxManagerRef.current;

  // 1. Ticker VFX and check Hit-Stop
  const { isSimulationFrozen } = vfx.update(dt);
  ftm.update(dt);

  // If hit-stop micro freeze is active, freeze entity physics for visceral weight
  if (isSimulationFrozen) return;

  const player = playerRef.current;
  const move = playerMovementRef.current;
  const enemies = enemiesRef.current;
  const projectiles = projectilesRef.current;
  const pickups = pickupsRef.current;

  // ... [Kinematics & Player Movement]

  // HP Regen trigger:
  if (player.stats.hpRegen > 0 && player.stats.currentHp < player.stats.maxHp) {
    const interval = calculateHpRegenInterval(player.stats.hpRegen);
    regenTimerRef.current += dt;
    if (regenTimerRef.current >= interval) {
      regenTimerRef.current = 0;
      player.stats.currentHp = Math.min(player.stats.maxHp, player.stats.currentHp + 1);
      ftm.spawnHeal(player.x, player.y, 1, false);
    }
  }

  // Wave completion:
  if (waveRes.isWaveJustCompleted) {
    soundEngine.playOrbitalLaser();
    ftm.spawnBanner(player.x, player.y, 'DALGA TAMAMLANDI!', '#38bdf8');
    vfx.triggerWhiteFlash(0.35);
    vfx.addTrauma(0.25);
  }

  // Enemy Deaths:
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (enemy.hp <= 0) {
      const drops = generateDropsForEnemy(enemy, player.stats.luck);
      pickups.push(...drops);
      soundEngine.playHit();
      vfx.spawnDeathBurst(enemy.x, enemy.y, ENEMY_VFX_COLORS[enemy.type], enemy.type === 'elite');
      vfx.addTrauma(enemy.type === 'elite' ? 0.35 : 0.08);
      if (enemy.type === 'elite') {
        vfx.triggerHitStop(60);
      }
      enemies.splice(i, 1);
      continue;
    }

    // Player taking damage from enemy / shockwave:
    // When hit:
    const damageTaken = calculateArmorDamage(enemy.damage, player.stats.armor);
    player.stats.currentHp = Math.max(0, player.stats.currentHp - damageTaken);
    player.invulnerabilityTimerMs = 600;
    player.isInvulnerable = true;
    ftm.spawnPlayerDamage(player.x, player.y, damageTaken);
    vfx.triggerDamageVignette(0.65);
    vfx.addTrauma(0.30);
    soundEngine.playHit();

    // When dodging:
    ftm.spawnDodge(player.x, player.y);
    vfx.spawnDustPuff(player.x, player.y, 3);
    soundEngine.playHit();
  }

  // Multi-Weapon Firing:
  for (const atk of attackEvents) {
    soundEngine.playHit();

    if (atk.blueprint.type === 'ranged') {
      const muzzleX = player.x + Math.cos(atk.angleRad) * (player.radius + 16);
      const muzzleY = player.y + Math.sin(atk.angleRad) * (player.radius + 16);
      vfx.spawnMuzzleFlash(muzzleX, muzzleY, atk.angleRad);
    } else {
      vfx.spawnMeleeSlashArc(player.x, player.y, atk.angleRad, atk.blueprint.arcAngleDeg ?? 120, atk.blueprint.baseRange);
    }

    // Melee hits:
    if (atk.meleeHits) {
      for (const hit of atk.meleeHits) {
        const enemy = enemies.find((e) => e.id === hit.enemyId);
        if (enemy) {
          enemy.hp -= hit.damage;
          enemy.hitFlashTimerMs = 120;
          enemy.vx += hit.knockback.x;
          enemy.vy += hit.knockback.y;

          ftm.spawnDamage(enemy.x, enemy.y, hit.damage, hit.isCrit);
          vfx.spawnHitSparks(enemy.x, enemy.y, atk.angleRad, hit.isCrit, 6);
          vfx.spawnBloodSplatter(enemy.x, enemy.y, ENEMY_VFX_COLORS[enemy.type], hit.isCrit ? 10 : 5);
          if (hit.isCrit) {
            vfx.addTrauma(0.12);
            vfx.triggerHitStop(35);
          }

          // Life steal:
          if (player.stats.lifeSteal > 0 && player.stats.currentHp < player.stats.maxHp) {
            const roll = Math.random() * 100;
            if (lifeStealTrackerRef.current.attemptHeal(Date.now(), roll, player.stats.lifeSteal)) {
              player.stats.currentHp = Math.min(player.stats.maxHp, player.stats.currentHp + 1);
              ftm.spawnHeal(player.x, player.y, 1, true);
            }
          }
        }
      }
    }
  }

  // Projectile Hits:
  for (const hit of projResult.hits) {
    const enemy = enemies.find((e) => e.id === hit.enemyId);
    if (enemy) {
      enemy.hp -= hit.damage;
      enemy.hitFlashTimerMs = 120;
      enemy.vx += hit.knockback.x;
      enemy.vy += hit.knockback.y;

      const impactAngle = Math.atan2(hit.knockback.y, hit.knockback.x);
      ftm.spawnDamage(enemy.x, enemy.y, hit.damage, hit.isCrit);
      vfx.spawnHitSparks(enemy.x, enemy.y, impactAngle, hit.isCrit, 5);
      vfx.spawnBloodSplatter(enemy.x, enemy.y, ENEMY_VFX_COLORS[enemy.type], hit.isCrit ? 8 : 4);
      if (hit.isCrit) {
        vfx.addTrauma(0.10);
        vfx.triggerHitStop(25);
      }
      // Life steal ...
    }
  }

  // Drop Pickups:
  if (dropResult.collectedMaterials > 0) {
    materialsCountRef.current += dropResult.collectedMaterials;
    soundEngine.playComboUp(1);
    ftm.spawnPickup(player.x, player.y, `+${dropResult.collectedMaterials} 💎`, '#fbbf24');
    vfx.spawnPickupRing(player.x, player.y, 'material');
  }
  if (dropResult.collectedHealth > 0) {
    player.stats.currentHp = Math.min(player.stats.maxHp, player.stats.currentHp + dropResult.collectedHealth);
    soundEngine.playComboUp(2);
    ftm.spawnHeal(player.x, player.y, dropResult.collectedHealth, false);
    vfx.spawnPickupRing(player.x, player.y, 'fruit');
  }
  if (dropResult.collectedChests > 0) {
    soundEngine.playComboUp(3);
    ftm.spawnBanner(player.x, player.y, '📦 SANDIK!', '#f59e0b');
    vfx.spawnPickupRing(player.x, player.y, 'chest');
    vfx.addTrauma(0.20);
  }
});
```

### 2.5 Render Pipeline (`loop.onRender`)
```typescript
loop.onRender(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const ftm = floatingTextManagerRef.current;
  const vfx = vfxManagerRef.current;

  // Clear Canvas Background
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ------------------------------------------------------------------------
  // WORLD SPACE RENDERING (With Screen Shake)
  // ------------------------------------------------------------------------
  ctx.save();
  vfx.applyCameraShake(ctx);

  // 1. Arena Grid & Hazard Borders
  // ...
  // 2. Pickups
  // ...
  // 3. Enemies
  // ...
  // 4. Projectiles
  // ...
  // 5. Player Potato & Orbiting Weapons
  // ...

  // 6. Particle VFX (Sparks, Splatters, Muzzle Flashes, Dust, Rings)
  vfx.render(ctx);

  // 7. Floating Combat Text (Crits, Damage, Dodges, Heals)
  ftm.render(ctx);

  // Restore from Camera Shake
  ctx.restore();

  // ------------------------------------------------------------------------
  // SCREEN SPACE RENDERING (Fixed Viewport Overlays)
  // ------------------------------------------------------------------------
  const hpRatio = playerRef.current.stats.maxHp > 0
    ? playerRef.current.stats.currentHp / playerRef.current.stats.maxHp
    : 1;

  vfx.renderScreenOverlays(ctx, canvas.width, canvas.height, hpRatio);
});
```

---

## 3. Performance Benefits
1. **Zero Garbage Collection Stutter**:
   - `FloatingTextManager` pre-allocates 64 slots.
   - `VFXManager` pre-allocates 512 slots with $O(1)$ swap-and-pop compaction.
   - Eliminates thousands of object and array allocations per minute.
2. **Batched State Changes**:
   - `VFXManager.render()` partitions drawing into two passes (`source-over` and `lighter`), minimizing expensive canvas context pipeline switches.
3. **Visceral Impact Juice**:
   - Non-linear camera trauma with rotational tilt makes combat feel impactful and tactile.
   - Elastic overshoot scale bounce on critical strikes makes big hits visually satisfying.
   - Hit stop freeze frames deliver high-impact weight on critical kills.
