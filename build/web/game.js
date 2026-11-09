// Lexicon Survivors: The Word Guardian - Web Engine v4.0
// Hardcore Roguelite, 100 Waves, Weapon Slots & Multi-Gadget System

const ARENA_LAYOUT = Object.freeze({
  width: 2800,
  height: 2100,
  innerShelfX: 1245,
  innerShelfY: 870,
  playerColliderRadius: 15,
  playerColliderOffsetY: 3,
  playerVisualHalfWidth: 44,
  playerVisualHalfHeight: 44,
});
const PLAYER_CENTER_LIMIT_X = ARENA_LAYOUT.innerShelfX - ARENA_LAYOUT.playerVisualHalfWidth;
const PLAYER_CENTER_MIN_Y = -ARENA_LAYOUT.innerShelfY + ARENA_LAYOUT.playerVisualHalfHeight;
const PLAYER_CENTER_MAX_Y = ARENA_LAYOUT.innerShelfY - ARENA_LAYOUT.playerVisualHalfHeight;

let WEAPON_VISUALS = {};
let WEAPON_ARCHETYPES = {};
let weaponVisualsStatus = "loading";
let weaponVisualsError = "";
let weaponVisualsPromise = null;
let weaponVisualStatusNode = null;
const MELEE_TIMINGS = Object.freeze({
  dictionary_blade: Object.freeze({ windup: 0.10, active: 0.09, recovery: 0.15 }),
  calligraphy_katana: Object.freeze({ windup: 0.11, active: 0.10, recovery: 0.15 })
});
const HIT_SPRITE_PROFILE = Object.freeze({
  ink: 0, gold: 0, slash: 1, shield: 2, critical: 3,
  heavy: 4, rune: 5, piercing: 6, blunt: 7
});

function getWeaponVisual(weaponId) {
  return WEAPON_VISUALS[weaponId] || null;
}

function getWeaponArchetype(weaponId) {
  return WEAPON_ARCHETYPES[weaponId] || null;
}

function getWeaponSignature(weaponId) {
  return getWeaponArchetype(weaponId)?.signature || null;
}

function getWeaponEvolution(weaponId, tier) {
  const row = getWeaponArchetype(weaponId);
  return row && tier > 1 ? row.evolutions?.[tier] || null : null;
}

function getWeaponRhythmPhase(weaponId, elapsed) {
  const rhythm = getWeaponArchetype(weaponId)?.rhythm;
  if (!rhythm) return "idle";
  if (elapsed < rhythm.windup) return "windup";
  if (elapsed < rhythm.windup + rhythm.active) return "active";
  if (elapsed < rhythm.windup + rhythm.active + rhythm.recovery) return "recovery";
  return "idle";
}

function getWeaponMeleePhase(weaponId, elapsed) {
  const rhythm = getWeaponArchetype(weaponId)?.rhythm;
  if (!rhythm) return "idle";
  if (elapsed < rhythm.windup) return "windup";
  if (elapsed < rhythm.windup + rhythm.active) return "active";
  if (elapsed < rhythm.windup + rhythm.active + rhythm.recovery) return "recovery";
  return "idle";
}

function getShotgunFanAngles(weaponId, pelletCount, tier = 1) {
  const spread = getWeaponArchetype(weaponId)?.limits?.spread_radians || 0;
  const tierSpread = tier >= 3 ? spread * 0.74 : spread;
  if (pelletCount <= 1) return [0];
  return Array.from({ length: pelletCount }, (_, index) => -tierSpread + (tierSpread * 2 * index) / (pelletCount - 1));
}

function getMinePhase(weaponId, elapsed) {
  const limits = getWeaponArchetype(weaponId)?.limits;
  if (!limits) return "expired";
  if (elapsed < limits.fuse_seconds) return "fuse";
  if (elapsed < limits.fuse_seconds + limits.hazard_seconds) return "active";
  return "expired";
}

function simulateBoomerangPasses(enemyIds) {
  const uniqueIds = [...new Set(enemyIds)];
  return { outbound: uniqueIds, returning: uniqueIds.slice() };
}

function clampBurnStacks(weaponId, stackCount, tier = 1) {
  const cap = (getWeaponArchetype(weaponId)?.limits?.burn_stack_cap || 1) + (tier >= 3 ? 1 : 0);
  return Math.max(0, Math.min(cap, Math.floor(stackCount)));
}

function getNextPistolSide(weapon) {
  weapon.alt_side = !weapon.alt_side;
  return weapon.alt_side ? 1 : -1;
}

function canPlaceTurret(weaponId, currentCount, tier = 1) {
  const cap = getWeaponArchetype(weaponId)?.limits?.turret_cap || 0;
  return currentCount < cap + (tier >= 3 ? 1 : 0);
}

function pickRuneChainTargets(origin, targets, maxTargets = 3) {
  const rows = targets.filter(target => target && !target.dead && !target.hit).map((target, index) => ({ target, index,
    distance: typeof target === "string" ? index : Math.hypot((target.x || 0) - origin.x, (target.y || 0) - origin.y) }))
    .sort((a, b) => a.distance - b.distance);
  const selected = [];
  const seen = new Set();
  for (const row of rows) {
    const key = typeof row.target === "string" ? row.target : (row.target.id ?? row.target);
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(row.target);
    if (selected.length >= maxTargets) break;
  }
  return selected;
}

function getSniperDamage(weaponId, baseDamage, isElite) {
  const bonus = getWeaponArchetype(weaponId)?.limits?.elite_bonus || 1;
  return baseDamage * (isElite ? bonus : 1);
}

function resolveWeaponSignature(weapon, context = {}) {
  const row = getWeaponArchetype(weapon?.id);
  if (!row) return null;
  weapon.signature = row.signature;
  weapon.role = row.role;
  weapon.evolution = getWeaponEvolution(weapon.id, weapon.tier || 1);
  if (context.target) weapon.last_target_id = context.target.id ?? null;
  return row;
}

function getMeleeTiming(weaponId) {
  const timing = getWeaponArchetype(weaponId)?.rhythm || MELEE_TIMINGS[weaponId] || MELEE_TIMINGS.dictionary_blade;
  return {
    ...timing,
    total: timing.windup + timing.active + timing.recovery,
    arcPeakTime: timing.windup + timing.active * 0.5
  };
}

function getWeaponMuzzleWorld(weaponId, origin, aimAngle, sizeScale = 1) {
  const visual = getWeaponVisual(weaponId);
  if (!visual) return { x: origin.x, y: origin.y };
  const renderAngle = getWeaponRenderAngle(weaponId, aimAngle);
  const size = visual.draw_size * sizeScale;
  const localX = (visual.muzzle[0] - visual.grip[0]) * size;
  const localY = (visual.muzzle[1] - visual.grip[1]) * size;
  const cos = Math.cos(renderAngle);
  const sin = Math.sin(renderAngle);
  return { x: origin.x + localX * cos - localY * sin, y: origin.y + localX * sin + localY * cos };
}

function getWeaponFlashLocalAngle(weaponId) {
  return (getWeaponVisual(weaponId)?.art_angle_deg || 0) * Math.PI / 180;
}

function getWeaponRenderAngle(weaponId, aimAngle, swingRotation = 0) {
  return aimAngle - getWeaponFlashLocalAngle(weaponId) + swingRotation;
}

function getHorizontalFacing(aimAngle, fallbackLeft = false) {
  const horizontal = Math.cos(aimAngle);
  return Math.abs(horizontal) > 0.05 ? horizontal < 0 : fallbackLeft;
}

function getHeroActionDirection(player) {
  if (player.is_dashing && player.dash_dir) return player.dash_dir;
  if (player.attack_anim_timer > 0 || player.shot_recoil_timer > 0) {
    const aim = player.last_aim || { x: 1, y: 0 };
    const length = Math.hypot(aim.x, aim.y) || 1;
    return { x: aim.x / length, y: aim.y / length };
  }
  const speed = Math.hypot(player.vx, player.vy);
  return speed > 30 ? { x: player.vx / speed, y: player.vy / speed } : (player.last_aim || { x: 1, y: 0 });
}

function getAttackAnimationFrame(player) {
  const elapsed = Math.max(0, player.attack_anim_duration - player.attack_anim_timer);
  const windup = Math.max(0, player.attack_anim_windup || 0);
  const activeEnd = windup + Math.max(0, player.attack_anim_active || 0);
  if (windup > 0 && elapsed < windup) return elapsed < windup * 0.55 ? 0 : 1;
  if (elapsed < activeEnd) return 2;
  return 3;
}

// Zero-allocation array compaction helper for 60fps mobile execution
function fastCompact(arr, predicate) {
  let writeIdx = 0;
  const len = arr.length;
  for (let i = 0; i < len; i++) {
    const item = arr[i];
    if (predicate(item)) {
      if (writeIdx !== i) {
        arr[writeIdx] = item;
      }
      writeIdx++;
    }
  }
  arr.length = writeIdx;
  return arr;
}

function selectWeaponTarget(weapon, enemies = state.enemies, origin = state.player, excludePredicate = null) {
  // Keep the shipped 60fps targeting path: one pass and squared distances.
  const favorElites = weapon?.id === "grammar_sniper" || state.artifacts_owned.includes("archivist_compass");
  let nearest = null, bestDistSq = Infinity, bestIsElite = false;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (!enemy || enemy.dead || enemy.hp <= 0) continue;
    if (excludePredicate && excludePredicate(enemy)) continue;
    const elite = favorElites && (enemy.is_boss || enemy.is_elite || /boss/i.test(enemy.type || ""));
    if (bestIsElite && !elite) continue;
    const dx = enemy.x - origin.x, dy = enemy.y - origin.y;
    const distanceSq = dx * dx + dy * dy;
    if ((elite && !bestIsElite) || distanceSq < bestDistSq) {
      nearest = enemy;
      bestDistSq = distanceSq;
      bestIsElite = !!elite;
    }
  }
  return nearest;
}

function advanceWeaponChannels(weapon, dt) {
  if (weapon.id === "lexicon_beam" && weapon.beam_ticks_pending > 0) {
    weapon.beam_tick_timer -= dt;
    if (weapon.beam_tick_timer <= 0) {
      const p = state.player;
      const muzzle = weaponMuzzleWorld(weapon);
      const limits = getWeaponArchetype(weapon.id)?.limits || {};
      const delay = Math.max(0, weapon.beam_charge_remaining || 0);
      spawnProjectile({
        type: "beam", x: muzzle.x, y: muzzle.y,
        dx: Math.cos(weapon.rotation), dy: Math.sin(weapon.rotation),
        dmg: weapon.beam_tick_damage, pierce: state.pierce_count + 8 + (weapon.tier_data.pierce || 0),
        spd: 960, color: "#5ce1e6", size: weapon.tier >= 3 ? 28 : 24,
        delay, weapon_id: weapon.id, impact_profile: "piercing", crit: !!weapon.beam_crit
      });
      weapon.beam_ticks_pending--;
      weapon.beam_tick_timer = limits.tick_seconds || 0.10;
      weapon.beam_charge_remaining = Math.max(0, delay - weapon.beam_tick_timer);
      if (weapon.beam_ticks_pending === 0 && weapon.tier >= 4) {
        const target = selectWeaponTarget(weapon);
        if (target && !target.dead) spawnProjectile({ type: "beam_split", x: target.x, y: target.y,
          dx: Math.cos(weapon.rotation + 0.48), dy: Math.sin(weapon.rotation + 0.48), dmg: weapon.beam_tick_damage * 2,
          pierce: 2, spd: 850, size: 18, lifetime: 0.7, weapon_id: weapon.id, impact_profile: "piercing", tier: weapon.tier });
        weapon.beam_split_pending = false;
      }
    }
  }

  if (weapon.id === "ink_flamethrower") {
    if (weapon.flame_phase === "vent") {
      weapon.flame_phase_timer = Math.max(0, weapon.flame_phase_timer - dt);
      if (weapon.flame_phase_timer === 0) {
        weapon.flame_phase = "burst";
        weapon.flame_burst_elapsed = 0;
        weapon.burst_shots = 0;
      }
    } else {
      weapon.flame_burst_elapsed = (weapon.flame_burst_elapsed || 0) + dt;
      if (weapon.flame_burst_elapsed >= 0.72) {
        weapon.flame_phase = "vent";
        weapon.flame_phase_timer = getWeaponArchetype(weapon.id)?.rhythm.recovery || 0.48;
      }
    }
  }

  if (weapon.id === "quote_pistols" && weapon.pistol_queue?.length) {
    weapon.pistol_queue_timer = Math.max(0, (weapon.pistol_queue_timer || 0) - dt);
    if (weapon.pistol_queue_timer === 0) {
      const shot = weapon.pistol_queue.shift();
      spawnProjectile({ ...shot, weapon_id: weapon.id, impact_profile: "gold" });
      weapon.pistol_queue_timer = getWeaponArchetype(weapon.id)?.limits?.shot_gap || 0.10;
    }
  }

  if (weapon.id === "dictionary_blade") {
    weapon.parry_window = Math.max(0, (weapon.parry_window || 0) - dt);
    if (weapon.tier >= 2) {
      weapon.orbit_timer = (weapon.orbit_timer || 0) - dt;
      if (weapon.orbit_timer <= 0) {
        weapon.orbit_timer = 2.4;
        const angle = Math.random() * Math.PI * 2;
        spawnProjectile({ type: "blade_orbit", x: state.player.x + Math.cos(angle) * 42, y: state.player.y + Math.sin(angle) * 42,
          dx: Math.cos(angle + Math.PI / 2), dy: Math.sin(angle + Math.PI / 2), dmg: weapon.data.damage * 0.3,
          pierce: 1, spd: 180, size: 20, lifetime: 1.2, weapon_id: weapon.id, impact_profile: "gold" });
      }
    }
  }
}

function getWeaponRootWorld(weapon, weaponIndex = state.weapons.indexOf(weapon)) {
  const p = state.player;
  const visual = getWeaponVisual(weapon.id);
  const active = weaponIndex === state.active_weapon_index;
  const mount = active ? visual?.mount_active : visual?.mount_holstered;
  const facingLeft = active ? getHorizontalFacing(weapon.rotation, p.facing_left) : p.facing_left;
  const facing = facingLeft ? -1 : 1;
  const pose = getLocomotionPoseOffset(p);
  const holsterRow = weaponIndex < state.active_weapon_index ? weaponIndex : weaponIndex - 1;
  const x = (mount?.[0] ?? (active ? 8 : 5)) * facing;
  const y = (mount?.[1] ?? (active ? 2 : 9)) + (!active ? Math.max(0, holsterRow) * 5 : 0);
  const recoil = (weapon.recoil || 0) * (visual?.recoil_px || 3.5);
  const root = { x: p.x + pose.x + x - Math.cos(weapon.rotation) * recoil, y: p.y + pose.y + y - Math.sin(weapon.rotation) * recoil };
  return { ...root, active, sizeScale: 1.0, visual };
}

function weaponMuzzleWorld(weapon, weaponIndex = state.weapons.indexOf(weapon)) {
  const root = getWeaponRootWorld(weapon, weaponIndex);
  return getWeaponMuzzleWorld(weapon.id, root, weapon.rotation, root.sizeScale);
}

function ensureWeaponVisualStatus() {
  if (weaponVisualStatusNode) return weaponVisualStatusNode;
  const panel = document.querySelector("#title-screen .dialog-panel");
  if (!panel) return null;
  const node = document.createElement("div");
  node.id = "weapon-visual-status";
  node.setAttribute("role", "status");
  node.setAttribute("aria-live", "polite");
  Object.assign(node.style, {
    display: "none", margin: "2px auto", padding: "8px 12px", maxWidth: "460px",
    border: "1px solid #8b6b2e", background: "#f7edda", color: "#402c18",
    font: "600 12px 'IBM Plex Sans', sans-serif", textAlign: "center"
  });
  panel.appendChild(node);
  weaponVisualStatusNode = node;
  return node;
}

function setWeaponVisualStatus(message, isError = false) {
  const node = ensureWeaponVisualStatus();
  if (!node) return;
  if (typeof node.replaceChildren === "function") node.replaceChildren(); else node.innerHTML = "";
  node.style.display = message ? "block" : "none";
  node.style.borderColor = isError ? "#9c4038" : "#8b6b2e";
  node.style.color = isError ? "#7a2621" : "#402c18";
  const label = document.createElement("span");
  label.textContent = message;
  node.appendChild(label);
  if (isError) {
    const retry = document.createElement("button");
    retry.id = "weapon-visual-retry";
    retry.type = "button";
    retry.textContent = "Tekrar dene";
    Object.assign(retry.style, {
      display: "block", margin: "6px auto 0", padding: "5px 11px", border: "1px solid #6f512b",
      borderRadius: "3px", background: "#e2c88e", color: "#2b1c10", font: "700 12px 'IBM Plex Sans', sans-serif"
    });
    retry.onclick = () => { ensureWeaponVisuals(true); };
    node.appendChild(retry);
  }
}

function validateWeaponVisualData(data) {
  if (!data || data.version !== 1 || !data.weapons || typeof data.weapons !== "object") throw new Error("Görsel verisi biçimi geçersiz.");
  const expected = Object.keys(WEAPONS_CATALOG);
  for (const id of expected) {
    const visual = data.weapons[id];
    if (!visual || !Number.isFinite(visual.draw_size) || visual.draw_size < 20 || visual.draw_size > 48) throw new Error(`${id} için çizim boyutu eksik.`);
    if (!Number.isFinite(visual.art_angle_deg) || ![visual.grip, visual.muzzle].every(anchor => Array.isArray(anchor) && anchor.length === 2 && anchor.every(n => Number.isFinite(n) && n >= 0 && n <= 1))) throw new Error(`${id} için tutuş/namlu noktası geçersiz.`);
    if (!Array.isArray(visual.mount_active) || visual.mount_active.length !== 2 || !Array.isArray(visual.mount_holstered) || visual.mount_holstered.length !== 2) throw new Error(`${id} için taşıma konumu eksik.`);
    const axisX = visual.muzzle[0] - visual.grip[0];
    const axisY = visual.muzzle[1] - visual.grip[1];
    if (Math.hypot(axisX, axisY) > 0.05) {
      const anchorAngle = Math.atan2(axisY, axisX) * 180 / Math.PI;
      const angleDelta = ((anchorAngle - visual.art_angle_deg + 540) % 360) - 180;
      if (Math.abs(angleDelta) > 12) throw new Error(`${id} için namlu yönü çizim açısıyla uyuşmuyor.`);
    }
  }
  return data.weapons;
}

function validateWeaponArchetypeData(data) {
  if (!data || data.version !== 1 || !data.weapons || typeof data.weapons !== "object") throw new Error("Arketip verisi biçimi geçersiz.");
  const expected = Object.keys(WEAPONS_CATALOG);
  const signatures = new Set();
  for (const id of expected) {
    const row = data.weapons[id];
    if (!row || !row.role || !row.signature || !row.hit_profile || !row.economy || !row.rhythm || !row.limits || !row.evolutions) throw new Error(`${id} için arketip eksik.`);
    if (!Number.isInteger(row.economy.cost) || row.economy.cost < 0 || !Number.isFinite(row.economy.cooldown) || row.economy.cooldown <= 0 || !Number.isFinite(row.economy.damage) || row.economy.damage <= 0) throw new Error(`${id} için denge verisi geçersiz.`);
    if (signatures.has(row.signature)) throw new Error(`${id} imzası başka bir silahla çakışıyor.`);
    signatures.add(row.signature);
    for (const phase of ["windup", "active", "recovery"]) {
      if (!Number.isFinite(row.rhythm[phase]) || row.rhythm[phase] < 0) throw new Error(`${id} için ${phase} ritmi geçersiz.`);
    }
    for (const tier of [2, 3, 4]) {
      if (typeof row.evolutions[tier] !== "string" || !row.evolutions[tier]) throw new Error(`${id} için ${tier}. seviye evrimi eksik.`);
    }
  }
  return data.weapons;
}

async function loadWeaponArchetypes() {
  const response = await fetch("assets/data/weapon_archetypes.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return validateWeaponArchetypeData(await response.json());
}

async function loadWeaponVisuals() {
  weaponVisualsStatus = "loading";
  weaponVisualsError = "";
  setWeaponVisualStatus("Silah yerleşim verileri hazırlanıyor…");
  try {
    const [visualResponse, archetypes] = await Promise.all([
      fetch("assets/data/weapon_visuals.json", { cache: "no-store" }),
      loadWeaponArchetypes()
    ]);
    if (!visualResponse.ok) throw new Error(`HTTP ${visualResponse.status}`);
    const visualData = await visualResponse.json();
    WEAPON_VISUALS = validateWeaponVisualData(visualData);
    WEAPON_ARCHETYPES = archetypes;
    for (const [id, archetype] of Object.entries(archetypes)) {
      Object.assign(WEAPONS_CATALOG[id], archetype.economy);
    }
    weaponVisualsStatus = "ready";
    setWeaponVisualStatus("");
    return true;
  } catch (error) {
    weaponVisualsStatus = "error";
    weaponVisualsError = String(error?.message || error);
    setWeaponVisualStatus("Silah verileri yüklenemedi. Yeniden denemeden tura başlayamazsın.", true);
    return false;
  }
}

function ensureWeaponVisuals(retry = false) {
  if (weaponVisualsStatus === "ready" && !retry) return Promise.resolve(true);
  if (!weaponVisualsPromise || retry || weaponVisualsStatus === "error") {
    weaponVisualsPromise = loadWeaponVisuals();
  }
  return weaponVisualsPromise;
}

function applyHitFeedback(target, direction, impactProfile = "ink", isCritical = false, isHeavy = false, knockForce = 180) {
  if (!target || target.dead) return false;
  const length = Math.hypot(direction?.x || 0, direction?.y || 0);
  const dir = length > 0.001 ? { x: direction.x / length, y: direction.y / length } : { x: 1, y: 0 };
  target.hit_flash_timer = Math.max(target.hit_flash_timer || 0, isHeavy || isCritical ? 0.14 : 0.085);
  target.last_hit_profile = impactProfile;
  if (knockForce > 0) {
    target.vx = dir.x * knockForce;
    target.vy = dir.y * knockForce;
  }
  const isMobileDev = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 1080;
  const effectCap = isMobileDev ? 32 : 80;
  if (state.hit_effects.length >= effectCap) {
    state.hit_effects.splice(0, state.hit_effects.length - effectCap + 1);
  }
  const profile = isCritical ? "critical" : (HIT_SPRITE_PROFILE[impactProfile] === undefined ? "blunt" : impactProfile);
  state.hit_effects.push({
    x: target.x, y: target.y, dx: dir.x, dy: dir.y,
    frame: HIT_SPRITE_PROFILE[profile] ?? 7,
    size: isHeavy || isCritical ? 48 : 32,
    lifetime: isHeavy || isCritical ? 0.19 : 0.13,
    max_lifetime: isHeavy || isCritical ? 0.19 : 0.13,
    heavy: !!isHeavy, critical: !!isCritical
  });
  if ((isHeavy || isCritical) && state.hit_feedback_shake_cooldown <= 0) {
    state.hit_feedback_shake_cooldown = 0.16;
    triggerScreenShake(0.055, isCritical ? 1.4 : 0.9);
  }
  return true;
}

function applyUtilityRelicHit(target, baseDamage) {
  let damage = baseDamage;
  if (state.artifacts_owned.includes("archivist_compass") && (target.is_boss || target.is_elite || /boss/i.test(target.type || ""))) {
    damage *= 1 + (ARTIFACTS_CATALOG.archivist_compass.values?.elite_damage_factor || 0.12);
  }
  if (state.artifacts_owned.includes("marginalia_prism")) {
    const now = performance.now() / 1000;
    target.marginalia_hits = now - (target.marginalia_last_hit || now) > 1.0 ? 0 : (target.marginalia_hits || 0);
    target.marginalia_last_hit = now;
    if ((target.marginalia_mark_until || 0) > now) {
      const echo = Math.min(40, (target.max_hp || 100) * (ARTIFACTS_CATALOG.marginalia_prism.values?.echo_damage_factor || 0.32) * 0.08);
      target.hp -= echo;
      target.marginalia_mark_until = 0;
      target.marginalia_hits = 0;
      addFloatingText(target.x, target.y - 23, `${Math.round(echo)} YANKI`, "#b6a6ff", 11);
    } else {
      target.marginalia_hits++;
      if (target.marginalia_hits >= (ARTIFACTS_CATALOG.marginalia_prism.values?.hits_to_mark || 4)) {
        target.marginalia_hits = 0;
        target.marginalia_mark_until = now + (ARTIFACTS_CATALOG.marginalia_prism.values?.mark_seconds || 2);
        state.particles.push({ x: target.x, y: target.y, radius: 7, max_radius: 27, alpha: 0.85, color: "rgba(182, 166, 255, " });
      }
    }
  }
  return damage;
}

function updateHitEffects(dt) {
  for (let i = 0; i < state.hit_effects.length; i++) {
    state.hit_effects[i].lifetime -= dt;
  }
  fastCompact(state.hit_effects, effect => effect.lifetime > 0);
  state.hit_feedback_shake_cooldown = Math.max(0, state.hit_feedback_shake_cooldown - dt);
}

function clampPlayerToArena(player) {
  player.x = Math.max(-PLAYER_CENTER_LIMIT_X, Math.min(PLAYER_CENTER_LIMIT_X, player.x));
  player.y = Math.max(PLAYER_CENTER_MIN_Y, Math.min(PLAYER_CENTER_MAX_Y, player.y));
}

function getLocomotionBob(runPhase) {
  const stridePhase = ((runPhase % 8) + 8) % 8;
  return Math.round(2 * Math.abs(Math.sin(stridePhase * Math.PI / 4)));
}

function getHeroRunFrameIndex(runPhase, frameCount) {
  const count = Math.max(1, Math.floor(frameCount));
  const stridePhase = ((runPhase % 8) + 8) % 8;
  return Math.floor(stridePhase * count / 8) % count;
}

const HERO_RUN_FRAME_COUNTS = Object.freeze({
  inky: 8, quillmaster: 8, word_knight: 8, rune_sorceress: 8,
  lexicon_alchemist: 8, shadow_lexicographer: 8
});
function getHeroRunFrameCount(characterId) {
  return HERO_RUN_FRAME_COUNTS[characterId] || HERO_RUN_FRAME_COUNTS.inky;
}

function getShotRecoilOffset(player) {
  const timer = Number(player?.shot_recoil_timer || 0);
  const pixels = Number(player?.shot_recoil_pixels || 0);
  if (timer <= 0 || pixels <= 0) return { x: 0, y: 0 };
  const direction = player.shot_recoil_direction || { x: 0, y: 0 };
  const recovery = Math.max(0, Math.min(1, timer / Math.max(0.01, Number(player.shot_recoil_duration || 0.14))));
  const falloff = Math.pow(recovery, 1.65);
  return {
    x: Math.round(-direction.x * pixels * falloff),
    y: Math.round(-direction.y * pixels * falloff)
  };
}

function getLocomotionPoseOffset(player) {
  const speed = Math.hypot(player.vx, player.vy);
  let x = 0;
  let y = 0;
  if (!player.is_dashing && !state.is_inventory_open && player.attack_anim_timer <= 0 && speed > 30) {
    const bob = getLocomotionBob(player.run_phase);
    x = player.vx > 20 ? 1 : player.vx < -20 ? -1 : 0;
    y = -bob;
  }
  const recoil = getShotRecoilOffset(player);
  x += recoil.x;
  y += recoil.y;
  const minX = -PLAYER_CENTER_LIMIT_X - player.x;
  const maxX = PLAYER_CENTER_LIMIT_X - player.x;
  const minY = PLAYER_CENTER_MIN_Y - player.y;
  const maxY = PLAYER_CENTER_MAX_Y - player.y;
  return { x: Math.max(minX, Math.min(maxX, x)), y: Math.max(minY, Math.min(maxY, y)) };
}

// =========================================
// 1. WEB AUDIO SYNTHESIZER
// =========================================
class SoundManager {
  constructor() {
    this.ctx = null;
    this.assetVoices = [];
    this.music = null;
    this.assetPaths = {
      quill_blaster: "weapon_quill_blaster_v1", syllable_shotgun: "weapon_syllable_shotgun_v1",
      lexicon_beam: "weapon_lexicon_beam_v1", punctuation_bomb: "weapon_punctuation_mine_drop",
      dictionary_blade: "weapon_dictionary_blade_v1", crossword_crossbow: "weapon_crossword_crossbow_v1",
      hyphen_boomerang: "weapon_hyphen_boomerang", ink_flamethrower: "weapon_ink_flamethrower",
      thesaurus_rocket: "weapon_thesaurus_rocket_launch", quote_pistols: "weapon_quote_pistols_v1",
      calligraphy_katana: "weapon_calligraphy_katana_v1", scroll_turret: "weapon_scroll_turret_deploy",
      rune_orb: "weapon_rune_orb", grammar_sniper: "weapon_grammar_sniper", word_loom: "weapon_rune_orb",
      hit: "enemy_hit_light", death: "enemy_defeat", pickup: "ink_pickup", wave: "wave_start",
      gadget: "gadget_eraser_dash", mine: "weapon_punctuation_mine_detonation", rocket: "weapon_thesaurus_rocket_impact"
    };

    // Granular Audio Channels (0.0 to 1.0)
    this.masterVolume = 1.0;
    this.masterMuted = false;
    this.sfxVolume = 1.0;
    this.sfxMuted = false;
    this.bgmVolume = 1.0;
    this.bgmMuted = false;
    this.menuVolume = 1.0;
    this.menuMuted = false;

    // Dialogue Voice Channel
    this.activeDialogueVoice = null;
    this.dialoguePausedByMenu = false;

    this.loadAudioSettings();
  }

  loadAudioSettings() {
    try {
      const saved = localStorage.getItem("lexicon_granular_audio") || localStorage.getItem("lexicon_survivors_audio_settings");
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p.masterVolume === "number") this.masterVolume = p.masterVolume;
        if (typeof p.masterMuted === "boolean") this.masterMuted = p.masterMuted;
        if (typeof p.sfxVolume === "number") this.sfxVolume = p.sfxVolume;
        if (typeof p.sfxMuted === "boolean") this.sfxMuted = p.sfxMuted;
        const bgmVal = typeof p.inGameMusicVolume === "number" ? p.inGameMusicVolume : p.bgmVolume;
        if (typeof bgmVal === "number") this.bgmVolume = bgmVal;
        if (typeof p.bgmMuted === "boolean") this.bgmMuted = p.bgmMuted;
        const menuVal = typeof p.mainMenuMusicVolume === "number" ? p.mainMenuMusicVolume : p.menuVolume;
        if (typeof menuVal === "number") this.menuVolume = menuVal;
        if (typeof p.menuMuted === "boolean") this.menuMuted = p.menuMuted;
      } else {
        const savedBgm = localStorage.getItem("inGameMusicVolume");
        if (savedBgm !== null) this.bgmVolume = parseFloat(savedBgm);
        const savedMenu = localStorage.getItem("mainMenuMusicVolume");
        if (savedMenu !== null) this.menuVolume = parseFloat(savedMenu);
      }
    } catch (_) {}
  }

  get inGameMusicVolume() {
    return this.bgmVolume;
  }
  set inGameMusicVolume(v) {
    this.bgmVolume = v;
    this.saveAudioSettings();
  }

  get mainMenuMusicVolume() {
    return this.menuVolume;
  }
  set mainMenuMusicVolume(v) {
    this.menuVolume = v;
    this.saveAudioSettings();
  }

  saveAudioSettings() {
    try {
      const data = {
        masterVolume: this.masterVolume,
        masterMuted: this.masterMuted,
        sfxVolume: this.sfxVolume,
        sfxMuted: this.sfxMuted,
        bgmVolume: this.bgmVolume,
        bgmMuted: this.bgmMuted,
        menuVolume: this.menuVolume,
        menuMuted: this.menuMuted,
        inGameMusicVolume: this.bgmVolume,
        mainMenuMusicVolume: this.menuVolume,
      };
      localStorage.setItem("lexicon_granular_audio", JSON.stringify(data));
      localStorage.setItem("lexicon_survivors_audio_settings", JSON.stringify(data));
      localStorage.setItem("mainMenuMusicVolume", String(this.menuVolume));
      localStorage.setItem("inGameMusicVolume", String(this.bgmVolume));
    } catch (_) {}
    this.applyMusicVolume();
    this.updateDialogueVolume();
  }

  applyMusicVolume() {
    if (this.music) {
      const eff = (this.masterMuted || this.bgmMuted) ? 0 : Math.max(0, Math.min(1, this.masterVolume * this.bgmVolume * 0.24));
      this.music.volume = eff;
      this.music.muted = (this.masterMuted || this.bgmMuted);
    }
  }

  getEffectiveSfxVolume(baseVolume = 0.72) {
    if (this.masterMuted || this.sfxMuted) return 0;
    return Math.max(0, Math.min(1, baseVolume * this.masterVolume * this.sfxVolume));
  }

  getEffectiveBgmGain(baseGain = 0.24) {
    if (this.masterMuted || this.bgmMuted) return 0;
    return Math.max(0, Math.min(1, baseGain * this.masterVolume * this.bgmVolume));
  }

  getEffectiveMenuVolume(baseVolume = 0.42) {
    if (this.masterMuted || this.menuMuted) return 0;
    return Math.max(0, Math.min(1, baseVolume * this.masterVolume * this.menuVolume));
  }

  getPooledAudio(src) {
    if (!this.audioPools) this.audioPools = {};
    if (!this.audioPools[src]) {
      this.audioPools[src] = { pool: [], index: 0, maxSize: 3 };
    }
    const entry = this.audioPools[src];
    if (entry.pool.length < entry.maxSize) {
      const audio = new Audio(src);
      entry.pool.push(audio);
      return audio;
    }
    const audio = entry.pool[entry.index];
    entry.index = (entry.index + 1) % entry.pool.length;
    return audio;
  }

  playAsset(key, volume = 0.72) {
    const asset = this.assetPaths[key];
    if (!asset) return false;
    const eff = this.getEffectiveSfxVolume(volume);
    if (eff <= 0) return true;

    // Rate-limiting throttle to prevent audio decoder exhaustion and mobile stutter
    if (!this.lastSoundTime) this.lastSoundTime = {};
    const minIntervals = { hit: 48, pickup: 40, death: 45, select: 35, mine: 80, rocket: 80 };
    const now = performance.now();
    const interval = minIntervals[key];
    if (interval && now - (this.lastSoundTime[key] || 0) < interval) {
      return true;
    }
    this.lastSoundTime[key] = now;

    try {
      const subfolder = key === "gadget" ? "abilities" : (key === "hit" || key === "death" || key === "pickup" || key === "wave" ? "gameplay" : "weapons");
      const voice = this.getPooledAudio(`assets/audio/${subfolder}/${asset}.wav`);
      voice.volume = eff;
      voice.currentTime = 0;
      voice.play().catch(() => {});
      return true;
    } catch (_) { return false; }
  }

  startMusic() {
    if (!this.music) {
      this.music = new Audio("assets/audio/music/main_theme.mp3");
      this.music.loop = true;
    }
    this.applyMusicVolume();
    this.music.play().catch(() => {});
  }

  stopMusic() {
    if (this.music) {
      try {
        this.music.pause();
        this.music.currentTime = 0;
      } catch (_) {}
    }
  }

  setMusicSource(path) {
    if (!this.music) {
      this.music = new Audio();
      this.music.loop = true;
    }
    if (!this.music.src || !this.music.src.endsWith(path)) {
      this.music.src = path;
      this.music.loop = true;
      this.applyMusicVolume();
      this.music.play().catch(() => {});
    } else {
      this.applyMusicVolume();
    }
  }

  setMusicMuted(muted) {
    this.bgmMuted = muted;
    this.saveAudioSettings();
  }

  playDialogueVoice(audioPath) {
    this.stopDialogueVoice();
    if (!audioPath || typeof audioPath !== "string") return;
    if (this.masterMuted || this.sfxMuted) return;
    const eff = this.getEffectiveSfxVolume(1.0);
    if (eff <= 0) return;

    try {
      if (typeof Audio === "undefined") return;
      const audio = new Audio(audioPath);
      audio.preload = "auto";
      audio.volume = eff;
      audio.muted = (this.masterMuted || this.sfxMuted);
      this.activeDialogueVoice = audio;
      this.dialoguePausedByMenu = false;

      const playPromise = audio.play();
      if (playPromise !== undefined && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          // Gracefully absorb browser autoplay rejections or aborts
        });
      }

      audio.onended = () => {
        if (this.activeDialogueVoice === audio) {
          this.activeDialogueVoice = null;
          this.dialoguePausedByMenu = false;
        }
      };

      audio.onerror = () => {
        if (this.activeDialogueVoice === audio) {
          this.activeDialogueVoice = null;
          this.dialoguePausedByMenu = false;
        }
      };
    } catch (_) {
      this.activeDialogueVoice = null;
      this.dialoguePausedByMenu = false;
    }
  }

  stopDialogueVoice() {
    if (this.activeDialogueVoice) {
      try {
        this.activeDialogueVoice.onended = null;
        this.activeDialogueVoice.onerror = null;
        this.activeDialogueVoice.pause();
        this.activeDialogueVoice.currentTime = 0;
      } catch (_) {}
      this.activeDialogueVoice = null;
    }
    this.dialoguePausedByMenu = false;
  }

  pauseDialogueVoice() {
    if (this.activeDialogueVoice && !this.activeDialogueVoice.paused) {
      try {
        this.activeDialogueVoice.pause();
        this.dialoguePausedByMenu = true;
      } catch (_) {}
    }
  }

  resumeDialogueVoice() {
    if (this.activeDialogueVoice && this.dialoguePausedByMenu) {
      this.dialoguePausedByMenu = false;
      if (this.masterMuted || this.sfxMuted) return;
      const eff = this.getEffectiveSfxVolume(1.0);
      if (eff <= 0) return;
      try {
        this.activeDialogueVoice.volume = eff;
        this.activeDialogueVoice.muted = (this.masterMuted || this.sfxMuted);
        const playPromise = this.activeDialogueVoice.play();
        if (playPromise !== undefined && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      } catch (_) {}
    }
  }

  updateDialogueVolume() {
    if (this.activeDialogueVoice) {
      try {
        const eff = this.getEffectiveSfxVolume(1.0);
        this.activeDialogueVoice.volume = eff;
        this.activeDialogueVoice.muted = (this.masterMuted || this.sfxMuted);
      } catch (_) {}
    }
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, gainVal = 0.15) {
    if (!this.ctx) return;
    const effGain = this.getEffectiveSfxVolume(gainVal);
    if (effGain <= 0) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(effGain, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }
  shoot(weaponType = "quill_blaster") {
    if (this.playAsset(weaponType, 0.58)) return;
    this.init();
    switch (weaponType) {
      case "syllable_shotgun":
        this.playTone(170, "sawtooth", 0.13, 0.22);
        break;
      case "lexicon_beam":
        this.playTone(560, "sine", 0.09, 0.14);
        break;
      case "punctuation_bomb":
        this.playTone(150, "triangle", 0.18, 0.22);
        break;
      case "dictionary_blade":
      case "calligraphy_katana":
        this.playTone(310, "triangle", 0.14, 0.20);
        break;
      case "crossword_crossbow":
      case "grammar_sniper":
        this.playTone(490, "sawtooth", 0.11, 0.22);
        break;
      case "hyphen_boomerang":
        this.playTone(340, "sine", 0.20, 0.16);
        break;
      case "ink_flamethrower":
        this.playTone(110 + Math.random() * 40, "square", 0.05, 0.08);
        break;
      case "thesaurus_rocket":
        this.playTone(95, "sawtooth", 0.25, 0.25);
        break;
      case "quote_pistols":
        this.playTone(440, "triangle", 0.08, 0.22);
        break;
      case "scroll_turret":
        this.playTone(380, "sine", 0.12, 0.15);
        break;
      case "rune_orb":
      case "word_loom":
        this.playTone(620, "sine", 0.16, 0.24);
        break;
      default:
        this.playTone(320, "triangle", 0.10, 0.18);
        break;
    }
  }
  rocketBlast() {
    if (this.playAsset("rocket", 0.78)) return;
    this.init();
    this.playTone(70, "sawtooth", 0.35, 0.35);
  }
  gadget(id = "eraser_dash") {
    const gadgetFiles = { eraser_dash: "gadget_eraser_dash", ink_cataclysm: "gadget_ink_cataclysm", chrono_comma: "gadget_chrono_comma", lexicon_aegis: "gadget_lexicon_aegis", grammar_magnet: "gadget_grammar_magnet" };
    const gadgetAsset = gadgetFiles[id];
    if (gadgetAsset) {
      const eff = this.getEffectiveSfxVolume(0.8);
      if (eff > 0) {
        try {
          const voice = this.getPooledAudio(`assets/audio/abilities/${gadgetAsset}.wav`);
          voice.volume = eff;
          voice.currentTime = 0;
          voice.play().catch(() => {});
          return;
        } catch (_) {}
      }
    }
    this.init();
    this.playTone(520, "sine", 0.18, 0.25);
    setTimeout(() => this.playTone(780, "triangle", 0.22, 0.25), 80);
  }
  hit() {
    if (this.playAsset("hit", 0.34)) return;
    this.init();
    this.playTone(110, "square", 0.08, 0.15);
  }
  enemyDeath() {
    if (this.playAsset("death", 0.56)) return;
    this.init();
    this.playTone(90, "sawtooth", 0.15, 0.16);
  }
  bossRoar() {
    this.init();
    this.playTone(55, "sawtooth", 0.7, 0.45);
    setTimeout(() => this.playTone(85, "square", 0.5, 0.35), 180);
  }
  pickup() {
    if (this.playAsset("pickup", 0.5)) return;
    this.init();
    this.playTone(720, "sine", 0.07, 0.1);
  }
  quizSuccess() {
    this.init();
    this.playTone(523.25, "sine", 0.15, 0.2);
    setTimeout(() => this.playTone(659.25, "sine", 0.2, 0.2), 120);
    setTimeout(() => this.playTone(783.99, "sine", 0.35, 0.25), 240);
  }
  quizFail() {
    this.init();
    this.playTone(190, "sawtooth", 0.2, 0.2);
    setTimeout(() => this.playTone(140, "sawtooth", 0.35, 0.25), 180);
  }
  enemyShoot() {
    this.init();
    this.playTone(280, "sawtooth", 0.08, 0.14);
  }
  detonateMine() {
    if (this.playAsset("mine", 0.72)) return;
    this.init();
    this.playTone(130, "triangle", 0.22, 0.25);
  }
}
const sounds = new SoundManager();
document.addEventListener("click", (event) => {
  const control = event.target.closest("button,[role=tab]");
  if (!control || control.disabled) return;
  const file = control.classList.contains("shop-buy") ? "purchase" : control.id?.startsWith("tab-") ? "tab" : "select";
  const eff = sounds.getEffectiveMenuVolume(0.42);
  if (eff <= 0) return;
  try {
    const voice = sounds.getPooledAudio(`assets/audio/ui/ui_${file}.wav`);
    voice.volume = eff;
    voice.currentTime = 0;
    voice.play().catch(() => {});
  } catch (_) {}
}, true);

// =========================================
// 1.5 PROCEDURAL MEDIEVAL BGM SYNTHESIZER
// =========================================
class MedievalBGM {
  constructor(soundManager) {
    this.sm = soundManager;
    this.isPlaying = false;
    this.isMuted = false;
    this.volume = 0.24;
    this.mode = "peaceful"; // "peaceful" | "battle" | "boss"
    this.musicChoice = localStorage.getItem("lexicon_music_choice") || "auto";
    this.biome = -1;
    this.step = 0;
    this.timerId = null;

    this.notes = {
      D2: 73.42, F2: 87.31, G2: 98.00, A2: 110.00, Bb2: 116.54, C3: 130.81,
      D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, Bb3: 233.08, C4: 261.63,
      D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, C5: 523.25
    };

    this.harpPatterns = {
      peaceful: [
        "D3", "F3", "A3", "D4", "F3", "A3", "D4", "A3",
        "D3", "F3", "A3", "F4", "D4", "A3", "F3", "A3",
        "Bb2", "D3", "F3", "Bb3", "D4", "F3", "Bb3", "D4",
        "Bb2", "F3", "Bb3", "D4", "F4", "D4", "Bb3", "F3",
        "C3", "E3", "G3", "C4", "E4", "G3", "C4", "E4",
        "C3", "G3", "C4", "E4", "G4", "E4", "C4", "G3",
        "A2", "C3", "E3", "A3", "C4", "E3", "A3", "C4",
        "A2", "E3", "A3", "C4", "E4", "C4", "A3", "E3"
      ],
      battle: [
        "D3", "A3", "D4", "F4", "D4", "A3", "D4", "A3",
        "D3", "A3", "F4", "A4", "F4", "D4", "A3", "D4",
        "Bb2", "F3", "Bb3", "D4", "F4", "D4", "Bb3", "D4",
        "Bb2", "F3", "D4", "F4", "D4", "Bb3", "F3", "Bb3",
        "C3", "G3", "C4", "E4", "G4", "E4", "C4", "E4",
        "C3", "G3", "E4", "G4", "E4", "C4", "G3", "C4",
        "A2", "E3", "A3", "C4", "E4", "C4", "A3", "E3",
        "A2", "E3", "G3", "A3", "C4", "E4", "A4", "E4"
      ],
      boss: [
        "D2", "D3", "F3", "D3", "A3", "D3", "F3", "D3",
        "D2", "D3", "G2", "D3", "A3", "D3", "C4", "A3",
        "Bb2", "Bb3", "D4", "Bb3", "F4", "Bb3", "D4", "Bb3",
        "A2", "A3", "C4", "A3", "E4", "A3", "G4", "E4"
      ]
    };

    this.bassNotes = {
      peaceful: ["D2", "Bb2", "C3", "A2"],
      battle: ["D2", "Bb2", "C3", "A2"],
      boss: ["D2", "D2", "Bb2", "A2"]
    };
  }

  start() {
    if (this.isPlaying) return;
    this.sm.init();
    if (!this.sm.ctx) return;
    this.isPlaying = true;
    this.step = 0;
    this.sm.startMusic();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.sm && typeof this.sm.stopMusic === "function") {
      this.sm.stopMusic();
    }
  }

  setMode(newMode) {
    if (this.harpPatterns[newMode]) {
      this.mode = newMode;
      this.syncMusicChoice();
    }
  }

  setMusicChoice(choice) {
    this.musicChoice = ["auto", "library", "last_stand"].includes(choice) ? choice : "auto";
    localStorage.setItem("lexicon_music_choice", this.musicChoice);
    this.syncMusicChoice();
  }

  syncMusicChoice() {
    const path = this.musicChoice === "last_stand" || (this.musicChoice === "auto" && this.mode === "boss")
      ? "assets/audio/music/boss_theme_dark_last_stand.wav"
      : "assets/audio/music/main_theme.mp3";
    this.sm.setMusicSource(path);
  }

  setBiomeForWave(wave) {
    const nextBiome = wave >= 76 ? 3 : wave >= 51 ? 2 : wave >= 26 ? 1 : 0;
    if (nextBiome === this.biome) return;
    this.biome = nextBiome;
    if (this.isPlaying && !this.isMuted) this.playChapterChime();
  }

  playChapterChime() {
    const ctx = this.sm.ctx;
    if (!ctx || this.isMuted) return;
    const roots = [293.66, 261.63, 349.23, 233.08];
    const root = roots[this.biome] || roots[0];
    [1, 1.25, 1.5].forEach((ratio, index) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + index * 0.11;
        osc.type = "sine";
        osc.frequency.setValueAtTime(root * ratio, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.035 * this.volume, start + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 1.18);
      } catch (e) {}
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    window.gameMusicMuted = this.isMuted;
    this.sm.setMusicMuted(this.isMuted);
    return !this.isMuted;
  }

  tick() {
    if (!this.isPlaying) return;
    const ctx = this.sm.ctx;
    if (!ctx) return;

    const pattern = this.harpPatterns[this.mode] || this.harpPatterns.peaceful;
    const totalSteps = pattern.length;
    const currentNoteName = pattern[this.step % totalSteps];
    const bpm = this.mode === "boss" ? 140 : (this.mode === "battle" ? 122 : 94);
    const stepDuration = 60 / bpm / 4;
    const semitones = [0, -2, 5, -3][this.biome] || 0;
    const transpose = Math.pow(2, semitones / 12);

    const effBgm = this.sm.getEffectiveBgmGain(this.volume);
    if (!this.isMuted && effBgm > 0) {
      const now = ctx.currentTime;
      if (currentNoteName && this.notes[currentNoteName]) {
        this.playPluckedString(this.notes[currentNoteName] * transpose, now, stepDuration * 2.5, 0.08 * effBgm);
      }

      if (this.step % 16 === 0) {
        const barIdx = Math.floor((this.step % totalSteps) / 16);
        const bList = this.bassNotes[this.mode] || this.bassNotes.peaceful;
        const bNote = bList[barIdx % bList.length];
        if (bNote && this.notes[bNote]) {
          this.playBassDrone(this.notes[bNote] * transpose, now, stepDuration * 15, 0.12 * effBgm);
        }
        if (this.step % 64 === 0) {
          this.playAmbientBed([110, 98, 130.81, 87.31][this.biome], now, stepDuration * 60, 0.025 * effBgm);
        }
      }

      if (this.mode !== "peaceful") {
        const stepInBar = this.step % 16;
        if (stepInBar === 0 || stepInBar === 8) {
          this.playDrumKick(now, 0.13 * effBgm);
        }
        if (stepInBar === 4 || stepInBar === 12) {
          this.playPercTick(now, 0.06 * effBgm);
        }
        if (this.mode === "boss" && (stepInBar === 6 || stepInBar === 14)) {
          this.playPercTick(now, 0.08 * effBgm);
        }
      }
    }

    this.step++;
    this.timerId = setTimeout(() => this.tick(), stepDuration * 1000);
  }

  playPluckedString(freq, time, dur, gainVal) {
    try {
      const ctx = this.sm.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(gainVal, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + dur);
    } catch(e) {}
  }

  playBassDrone(freq, time, dur, gainVal) {
    try {
      const ctx = this.sm.ctx;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(260, time);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(gainVal, time + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + dur);
    } catch(e) {}
  }

  playAmbientBed(freq, time, dur, gainVal) {
    try {
      const ctx = this.sm.ctx;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(420, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(gainVal, time + 1.2);
      gain.gain.setValueAtTime(gainVal, Math.max(time + 1.2, time + dur - 1.4));
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + dur);
    } catch (e) {}
  }

  playDrumKick(time, gainVal) {
    try {
      const ctx = this.sm.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(115, time);
      osc.frequency.exponentialRampToValueAtTime(36, time + 0.12);

      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.14);
    } catch(e) {}
  }

  playPercTick(time, gainVal) {
    try {
      const ctx = this.sm.ctx;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(800 + Math.random() * 200, time);

      filter.type = "highpass";
      filter.frequency.setValueAtTime(1200, time);

      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.05);
    } catch(e) {}
  }
}

const bgm = new MedievalBGM(sounds);

// =========================================
// 2. CHARACTERS & DIFFICULTIES (BALANCED)
// =========================================
const CHARACTERS = {
  inky: {
    id: "inky",
    name: "Inky",
    title: "Dengeli Bilgin (The Balanced Scholar)",
    desc: "Kütüphanenin kadim koruyucusu. Dengeli nitelikler ve kararlı mürekkep akışı.",
    hp: 125,
    speed: 235,
    damage_mult: 1.05,
    attack_speed_mult: 1.05,
    armor: 0.10,
    crit_chance: 0.10,
    starting_weapon: "quill_blaster",
    starting_gadget: "eraser_dash",
    passive: "Mürekkep Ustası: Dengeli öğrenme ve her alanda tam yetkinlik.",
    sprite: "upgrade_v1/hero_inky.png",
    color: "#ffffff"
  },
  quillmaster: {
    id: "quillmaster",
    name: "Quillmaster",
    title: "Hızlı Kalemşör (Glass Cannon)",
    desc: "+%35 Saldırı Hızı, +%20 Hasar ve +30 Hareket Hızı! Seri kritik vuruşlar.",
    hp: 95,
    speed: 265,
    damage_mult: 1.25,
    attack_speed_mult: 1.35,
    armor: 0.0,
    crit_chance: 0.20,
    starting_weapon: "syllable_shotgun",
    starting_gadget: "chrono_comma",
    passive: "Zaman Bükücü: Chrono Comma ile başlar, yüksek seri atış.",
    sprite: "upgrade_v1/hero_quillmaster.png",
    color: "#fff176"
  },
  word_knight: {
    id: "word_knight",
    name: "Word Knight",
    title: "Sözcük Şövalyesi (The Citadel Tank)",
    desc: "+55 Maksimum Can (180 HP), +%30 Hasar Direnci (Zırh), sağlam savunma kalkanı.",
    hp: 180,
    speed: 210,
    damage_mult: 1.15,
    attack_speed_mult: 0.95,
    armor: 0.30,
    crit_chance: 0.08,
    starting_weapon: "dictionary_blade",
    starting_gadget: "lexicon_aegis",
    passive: "Sözlük Kalkanı: Aegis Kalkanı ile başlar, ağır darbe soğurma.",
    sprite: "upgrade_v1/hero_word_knight.png",
    color: "#81c784"
  },
  rune_sorceress: {
    id: "rune_sorceress",
    name: "Rune Sorceress",
    title: "Kadim Rün Büyücüsü (Mystic Archmage)",
    desc: "Büyülü rünlerle geniş alan hasarı, +%30 Hasar ve Rün Küresi ile başlar.",
    hp: 105,
    speed: 245,
    damage_mult: 1.30,
    attack_speed_mult: 1.10,
    armor: 0.05,
    crit_chance: 0.15,
    starting_weapon: "rune_orb",
    starting_gadget: "ink_cataclysm",
    passive: "Rün İnfilakı: Düşmanları alt ettiğinde sıçrayan rün patlamaları.",
    sprite: "upgrade_v1/hero_rune_sorceress.png",
    color: "#c084fc"
  },
  lexicon_alchemist: {
    id: "lexicon_alchemist",
    name: "Alchemist",
    title: "Sözlük Simyacısı (Resource Alchemist)",
    desc: "+%40 Mürekkep Kazanımı, Gramer Mıknatısı ve Mürekkep Alevi ile başlar.",
    hp: 115,
    speed: 240,
    damage_mult: 1.10,
    attack_speed_mult: 1.20,
    armor: 0.12,
    crit_chance: 0.12,
    starting_weapon: "ink_flamethrower",
    starting_gadget: "grammar_magnet",
    passive: "Simya Özütü: Her dalga başında +10 Mürekkep, can iksirleri +%50 etkili.",
    sprite: "upgrade_v1/hero_alchemist.png",
    color: "#34d399"
  },
  shadow_lexicographer: {
    id: "shadow_lexicographer",
    name: "Shadow Scribe",
    title: "Gölge Hattatı (Critical Assassin)",
    desc: "290 Hız, +%35 Kritik Vuruş Şansı ve Hattat Katanası ile seri ölümcül kesişler.",
    hp: 90,
    speed: 290,
    damage_mult: 1.45,
    attack_speed_mult: 1.25,
    armor: 0.0,
    crit_chance: 0.35,
    starting_weapon: "calligraphy_katana",
    starting_gadget: "eraser_dash",
    passive: "Kritik İnfaz: Kritik vuruşlar %250 hasar verir ve düşmanı yavaşlatır.",
    sprite: "upgrade_v1/hero_shadow_scribe.png",
    color: "#f43f5e"
  }
};

const DIFFICULTIES = {
  easy: {
    id: "easy",
    name: "A1–A2",
    desc: "Düşmanlar yavaş (%-25), canları az (%-35). Başlangıç canı +40 HP. Rahat öğrenme ortamı.",
    enemy_speed_mult: 0.75,
    enemy_hp_mult: 0.65,
    enemy_damage_mult: 0.60,
    player_hp_bonus: 40,
    ink_bonus_mult: 1.40
  },
  normal: {
    id: "normal",
    name: "B1",
    desc: "Dengeli arcade deneyimi! Pürüzsüz dalga geçişleri, toplanabilir can parşömenleri ve ödüllendirici sorular.",
    enemy_speed_mult: 0.90,
    enemy_hp_mult: 0.85,
    enemy_damage_mult: 0.80,
    player_hp_bonus: 15,
    ink_bonus_mult: 1.20
  },
  hard: {
    id: "hard",
    name: "B2–C1",
    desc: "Akademik arena! Düşmanlar çevik, canları daha yüksek (%+15), yoğun düşman akını ve sınav tuzakları.",
    enemy_speed_mult: 1.08,
    enemy_hp_mult: 1.15,
    enemy_damage_mult: 1.15,
    player_hp_bonus: 0,
    ink_bonus_mult: 1.35
  }
};

// =========================================
// 3. 15 WEAPONS CATALOG & TIERS
// =========================================
const WEAPONS_CATALOG = {
  quill_blaster: {
    id: "quill_blaster",
    name: "İğne Ucu Kalem",
    desc: "Uzun işaret hedefi sabitler; gelişince yankı iğnesi iki yakındaki rakibe sıçrar.",
    cost: 12, cooldown: 0.50, damage: 24.0, sprite: "weapons/quill_blaster.png"
  },
  syllable_shotgun: {
    id: "syllable_shotgun",
    name: "Hece Saçması",
    desc: "Altı saçmayı dar bir yelpazede toplar; yakındaki hedefleri sendeletir.",
    cost: 16, cooldown: 0.92, damage: 17.0, sprite: "weapons/syllable_shotgun.png"
  },
  lexicon_beam: {
    id: "lexicon_beam",
    name: "Prizma Işını",
    desc: "Kısa şarjdan sonra geniş satır ışınıyla düşman hattını süpürür.",
    cost: 19, cooldown: 0.46, damage: 23.0, sprite: "weapons/lexicon_beam.png"
  },
  punctuation_bomb: {
    id: "punctuation_bomb",
    name: "Ünlem Mayını",
    desc: "Kısa fitilli mayın geniş alanda patlar ve zeminde mürekkep tehlikesi bırakır.",
    cost: 17, cooldown: 1.18, damage: 60.0, sprite: "weapons/punctuation_bomb.png"
  },
  dictionary_blade: {
    id: "dictionary_blade",
    name: "Sözlük Muhafızı",
    desc: "Geniş savunma yayı mermileri savuşturur; zamanlı savuşturma karşı vuruş açar.",
    cost: 18, cooldown: 0.68, damage: 34.0, sprite: "weapons/dictionary_blade.png"
  },
  crossword_crossbow: {
    id: "crossword_crossbow",
    name: "Bulmaca Balistası",
    desc: "Delen ağır ok hedefi daha uzun sabitler; gelişince çarpma noktasında ızgara parçaları saçar.",
    cost: 21, cooldown: 0.88, damage: 34.0, sprite: "weapons/crossword_crossbow.png"
  },
  hyphen_boomerang: {
    id: "hyphen_boomerang",
    name: "Tire Yörüngesi",
    desc: "Uzun kavisle çıkar, dönüş yolunda yeniden vurur ve gelişince kısa süre yörüngede kalır.",
    cost: 20, cooldown: 1.12, damage: 28.0, sprite: "weapons/hyphen_boomerang.png"
  },
  ink_flamethrower: {
    id: "ink_flamethrower",
    name: "Mürekkep Ocağı",
    desc: "Geniş alev yelpazesiyle yakar; soğuma arasında yanık etkisi sürer.",
    cost: 24, cooldown: 0.13, damage: 9.5, sprite: "weapons/ink_flamethrower.png"
  },
  thesaurus_rocket: {
    id: "thesaurus_rocket",
    name: "Eşanlamlı Harcı",
    desc: "Hedefe daha sıkı kilitlenen roket, geniş küme patlamasıyla çevresini geri savurur.",
    cost: 27, cooldown: 1.70, damage: 74.0, sprite: "weapons/thesaurus_rocket.png"
  },
  quote_pistols: {
    id: "quote_pistols",
    name: "Tırnak Salvosu",
    desc: "İki tabanca seri dönüşümlü salvo atar; gelişince üçüncü atış ve işaretli sekme eklenir.",
    cost: 23, cooldown: 0.28, damage: 14.5, sprite: "weapons/quote_pistols.png"
  },
  // 4 New Weapons
  calligraphy_katana: {
    id: "calligraphy_katana",
    name: "Kalem Hilali",
    desc: "Geniş hazırlıkla ileri hilal keser; gelişince işaretli hedefe son vuruş uygular.",
    cost: 26, cooldown: 0.72, damage: 40.0, sprite: "weapons/calligraphy_katana.png"
  },
  scroll_turret: {
    id: "scroll_turret",
    name: "Raf Bekçisi",
    desc: "On dört saniye kalan tomar tareti, seri atışlarını tek hedefe odaklar.",
    cost: 28, cooldown: 2.40, damage: 22.0, sprite: "weapons/scroll_turret.png"
  },
  rune_orb: {
    id: "rune_orb",
    name: "Atıf Küresi",
    desc: "Rün dört hedefe kadar sıçrar; son sıçrama küçük bir patlama bırakır.",
    cost: 24, cooldown: 0.90, damage: 23.0, sprite: "weapons/rune_orb.png"
  },
  grammar_sniper: {
    id: "grammar_sniper",
    name: "Zayıf Nokta Rayı",
    desc: "Zırh delen atış liderleri iki kat cezalandırır; gelişince üç hedefe kadar zincirlenir.",
    cost: 30, cooldown: 1.70, damage: 90.0, sprite: "weapons/grammar_sniper.png"
  },
  word_loom: {
    id: "word_loom",
    name: "Dipnot Tezgâhı",
    desc: "Hedef noktaya mürekkep ipliği kurar; alandaki düşmanları yavaşlatıp aralıklarla yaralar.",
    cost: 25, cooldown: 2.10, damage: 20.0, sprite: "weapons/word_loom.png"
  }
};

const TIER_MULTIPLIERS = {
  1: { name: "Standart", damage: 1.0, cooldown: 1.0, badge: "tier-1", stars: "★" },
  2: { name: "Nadir", damage: 1.35, cooldown: 0.85, badge: "tier-2", stars: "★★" },
  3: { name: "Epik", damage: 1.80, cooldown: 0.75, badge: "tier-3", stars: "★★★", pierce: 1 },
  4: { name: "Efsanevi", damage: 2.50, cooldown: 0.65, badge: "tier-4", stars: "★★★★", projectile: 1, crit: 0.15 }
};

// =========================================
// 4. GADGETS CATALOG (shared utility_items.json identifiers)
// =========================================
let GADGETS_CATALOG = {
  eraser_dash: {
    id: "eraser_dash",
    name: "Kenar Atılımı", desc: "Düşmanların içinden sıyrılır; geride kısa süre kalan keskin bir mürekkep izi bırakır.",
    cooldown: 5.0, icon: "assets/sprites/gadgets/eraser_dash.png", cost: 0,
    mechanic: "dash_ink_trail", values: { invulnerability: 0.35, damage: 60, trail_seconds: 1.4, trail_radius: 30 }
  },
  ink_cataclysm: {
    id: "ink_cataclysm",
    name: "Son Nokta", desc: "Ekrandaki düşman mermilerini siler; yakın düşmanları sarsıp geri iter.",
    cooldown: 12, icon: "assets/sprites/gadgets/ink_cataclysm.png", cost: 22,
    mechanic: "clear_and_stun", values: { radius: 420, damage: 95, stun_seconds: 1.3, knockback: 220 }
  },
  chrono_comma: {
    id: "chrono_comma",
    name: "Zaman Virgülü", desc: "Düşmanları ve mermilerini yavaşlatır; oyuncunun atış ritmi hızlanır.",
    cooldown: 14, icon: "assets/sprites/gadgets/chrono_comma.png", cost: 24,
    mechanic: "enemy_time_dilation", values: { duration: 3.5, enemy_speed_factor: 0.25, projectile_speed_factor: 0.25, player_attack_speed_factor: 1.2 }
  },
  lexicon_aegis: {
    id: "lexicon_aegis",
    name: "Fihrist Kalkanı", desc: "Üç darbeyi emer; son yük açıldığında yakın düşmanlara karşılık verir.",
    cooldown: 11, icon: "assets/sprites/gadgets/lexicon_aegis.png", cost: 20,
    mechanic: "charged_reflect_shield", values: { duration: 5, charges: 3, counter_damage: 32, counter_radius: 90 }
  },
  grammar_magnet: {
    id: "grammar_magnet",
    name: "Arşiv Çekimi", desc: "Mürekkep damlalarını ve can parşömenlerini kendine toplar.",
    cooldown: 9, icon: "assets/sprites/gadgets/grammar_magnet.png", cost: 16,
    mechanic: "pull_all_pickups", values: { duration: 2.6, radius: 1200, pull_speed: 520 }
  },
  index_storm: {
    id: "index_storm", name: "Fiş Fırtınası", desc: "Dönen fişler yakındaki farklı hedeflere sırayla saplanır.",
    cooldown: 13, cost: 24, icon: "assets/sprites/gadgets/index_storm.png", mechanic: "orbit_cards",
    values: { duration: 2.8, cards: 3, damage: 26, target_cap: 3 }
  },
  redact_field: {
    id: "redact_field", name: "Sansür Dalgası", desc: "Öndeki düşmanların atış ve hücum hazırlığını keser, onları yavaşlatır.",
    cooldown: 14, cost: 26, icon: "assets/sprites/gadgets/redact_field.png", mechanic: "interrupt_cone",
    values: { duration: 1.8, range: 260, half_angle: 0.72, slow_factor: 0.45 }
  },
  palimpsest_step: {
    id: "palimpsest_step", name: "Palimpsest Adımı", desc: "Kısa bir sıçrayış yapıp saldırıları üzerine çeken bir suret bırakır.",
    cooldown: 12, cost: 21, icon: "assets/sprites/gadgets/palimpsest_step.png", mechanic: "blink_decoy",
    values: { blink_distance: 130, decoy_seconds: 1.5, decoy_hp: 1 }
  }
};

let ARTIFACTS_CATALOG = {
  magnifying_glass: {
    id: "magnifying_glass", name: "Kenar Düzeltisi Merceği", desc: "Kritik şans ve genel hasar artar.", cost: 14,
    icon: "assets/sprites/relics/magnifying_glass.png", stats: { crit_chance: 0.10, damage: 0.12 }
  },
  golden_inkpot: {
    id: "golden_inkpot", name: "Altın Mürekkep Kalbi", desc: "Düşmanlardan daha çok mürekkep kazanırsın.", cost: 16,
    icon: "assets/sprites/relics/golden_inkpot.png", stats: { ink_mult: 0.35 }
  },
  scholar_boots: {
    id: "scholar_boots", name: "Dipnot Çizmeleri", desc: "Hareket hızı artar.", cost: 13,
    icon: "assets/sprites/relics/scholar_boots.png", stats: { move_speed: 30 }
  },
  grammar_guide: {
    id: "grammar_guide", name: "Kırmızı Çizgi El Kitabı", desc: "Azami can ve zırh artar.", cost: 15,
    icon: "assets/sprites/relics/grammar_guide.png", stats: { max_hp: 18, armor: 0.10 }
  },
  slot_expansion: {
    id: "slot_expansion", name: "Arşiv Rafı", desc: "Bir ek silah yuvası açar.", cost: 25,
    icon: "assets/sprites/relics/archivist_compass.png", stats: { max_weapon_slots: 1 }
  },
  diligence_coffee: {
    id: "diligence_coffee", name: "Gece Hattatının Kahvesi", desc: "Silahların atış aralığını kısaltır.", cost: 14,
    icon: "assets/sprites/relics/diligence_coffee.png", stats: { attack_speed: 0.18 }
  },
  quantum_eraser: {
    id: "quantum_eraser", name: "Palimpsest Silgisi", desc: "Aktif gadget bekleme süresini azaltır.", cost: 14,
    icon: "assets/sprites/relics/quantum_eraser.png", stats: { gadget_cooldown_mult: -0.18 }
  },
  marginalia_prism: {
    id: "marginalia_prism", name: "Kenar Notu Prizması", desc: "Art arda isabetler hedefi işaretler; sonraki vuruş yankılanır.", cost: 20,
    icon: "assets/sprites/relics/marginalia_prism.png", mechanic: "mark_and_echo", values: { hits_to_mark: 4, mark_seconds: 2, echo_damage_factor: 0.32 }
  },
  mnemonic_thread: {
    id: "mnemonic_thread", name: "Hafıza İpliği", desc: "Dalga başına ilk can parşömeni iyileştirir ve kısa koruma sağlar.", cost: 19,
    icon: "assets/sprites/relics/mnemonic_thread.png", mechanic: "health_scroll_guard", values: { heal_bonus: 14, shield_seconds: 0.65, once_per_wave: true }
  },
  archivist_compass: {
    id: "archivist_compass", name: "Arşivcinin Pusulası", desc: "Elitleri önceliklendirir; onlara karşı hasar bonusu verir.", cost: 22,
    icon: "assets/sprites/relics/archivist_compass.png", mechanic: "elite_focus", values: { elite_damage_factor: 0.12, target_priority: true }
  }
};

// Canonical IDs remain stable; older local saves are normalized at load time.
const GADGET_ALIASES = { dash: "eraser_dash", ink_bomb: "ink_cataclysm", time_stop: "chrono_comma", shield: "lexicon_aegis", magnet: "grammar_magnet" };
function normalizeGadgetId(id) { return GADGET_ALIASES[id] || (GADGETS_CATALOG[id] ? id : "eraser_dash"); }
const utilityCatalogReady = fetch("assets/data/utility_items.json").then(response => {
  if (!response.ok) throw new Error(`Utility catalog HTTP ${response.status}`);
  return response.json();
}).then(data => {
  for (const [id, item] of Object.entries(data.gadgets || {})) {
    GADGETS_CATALOG[id] = { ...GADGETS_CATALOG[id], ...item, desc: item.description, icon: item.icon };
  }
  for (const [id, item] of Object.entries(data.relics || {})) {
    ARTIFACTS_CATALOG[id] = { ...ARTIFACTS_CATALOG[id], ...item, desc: item.description, icon: item.icon };
  }
  Object.assign(GADGET_ALIASES, data.gadget_aliases || {});
  return true;
}).catch(error => { console.warn("Shared utility catalog unavailable; built-in catalog retained", error); return false; });

let GAME_ECONOMY = null;
async function loadGameEconomy() {
  const response = await fetch("assets/data/game_economy.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Game economy HTTP ${response.status}`);
  const data = await response.json();
  const rewards = data?.enemy_ink_rewards;
  if (data.version !== 1 || !Number.isInteger(data.starting_ink) || data.starting_ink < 0
    || !rewards || Object.keys(rewards).length !== 18
    || Object.entries(rewards).some(([name, amount]) => !name || !Number.isInteger(amount) || amount <= 0)) {
    throw new Error("Shared game economy data is invalid");
  }
  GAME_ECONOMY = data;
  return true;
}
const gameEconomyReady = loadGameEconomy().catch(error => { console.error("Shared game economy unavailable", error); return false; });
function getEnemyInkReward(enemyType, fallback = 1) {
  return GAME_ECONOMY?.enemy_ink_rewards?.[enemyType] ?? fallback;
}

let STORY_ARC_DATA = null;
const storyArcReady = fetch("assets/data/story_arc.json", { cache: "no-store" }).then(response => {
  if (!response.ok) throw new Error(`Story arc HTTP ${response.status}`);
  return response.json();
}).then(data => {
  if (data.version !== 2 || data.panel_count !== 5 || data.episodes?.length !== 20
    || Object.keys(data.characters || {}).length !== 6 || data.relic_catalog?.length !== 18) throw new Error("Story arc data is incomplete");
  for (const [id, arc] of Object.entries(data.characters)) {
    if (!CHARACTERS[id] || arc.episodes?.length !== data.episodes.length
      || arc.episodes.some((episode, index) => episode.wave !== data.episodes[index].wave || episode.beats?.length !== data.panel_count)) {
      throw new Error(`Missing character story: ${id}`);
    }
  }
  for (const episode of data.episodes) {
    if (episode.wave % 5 !== 0 || !episode.backdrop || !episode.music) {
      throw new Error(`Invalid story episode at wave ${episode.wave}`);
    }
  }
  STORY_ARC_DATA = data;
  for (const relic of data.relic_catalog) {
    ARTIFACTS_CATALOG[relic.id] = { ...relic, desc: relic.description, cost: 99999, story_only: true };
  }
  return true;
}).catch(error => { console.error("Shared story arc unavailable", error); return false; });
storyArcReady.then(ready => { if (ready && document.getElementById("title-screen")?.style.display !== "none") initTitleScreen(); });

// =========================================
// 5. GAME STATE
// =========================================
function readStoredBoolean(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch (error) {
    return fallback;
  }
}

const state = {
  selected_char: "inky",
  difficulty: "normal",
  max_hp: 110,
  hp: 110,
  move_speed: 230,
  damage_mult: 1.0,
  attack_speed_mult: 1.0,
  armor: 0.05,
  crit_chance: 0.08,
  pickup_radius: 150,
  projectile_count: 1,
  pierce_count: 1,
  ink_mult: 1.0,

  // Weapon Slots & Inventory
  max_weapon_slots: 4,
  equipped_weapons: [], // [{ id: "quill_blaster", tier: 1 }]
  reserve_weapons: [],  // [{ id: "...", tier: 1 }]
  active_weapon_index: 0,

  // Active Gadget
  active_gadget_id: "eraser_dash",
  owned_gadgets: ["eraser_dash"],
  inventory_category: "weapons",
  gadget_timer: 0,
  chrono_timer: 0,
  shield_charges: 0,
  shield_timer: 0,
  shield_counter_damage: 32,
  shield_counter_radius: 90,
  gadget_cooldown_mult: 1,
  magnet_timer: 0,
  gadget_cards: [],
  gadget_trails: [],
  gadget_decoys: [],
  mnemonic_used_this_wave: false,

  // Game Speed, Auto New Tur (Wave) & Auto New Run
  game_speed: 1.0,
  auto_new_tur: readStoredBoolean("lexicon_auto_new_tur", false),
  auto_new_run: readStoredBoolean("lexicon_auto_new_run", false),

  // 100-Wave Progression
  current_wave: 1,
  max_waves: 100,
  wave_duration: 25.0,
  wave_time_left: 25.0,
  is_wave_active: false,
  is_inventory_open: false,
  milestone_boss_delay: 0,
  ink_count: 15,
  kill_count: 0,
  words_learned: [],
  active_synergies: {},
  artifacts_owned: [],
  run_started_at: 0,
  run_submission_id: "",
  latest_run_result: null,
  run_result_recorded: false,
  asked_question_ids: [],
  mistake_words: [],
  touch_dir: { x: 0, y: 0 },

  // Dynamic entities
  player: {
    x: 0, y: 0, vx: 0, vy: 0,
    facing_left: false,
    invuln_timer: 0,
    is_dashing: false,
    dash_timer: 0,
    dash_dir: { x: 1, y: 0 },
    dash_hit_ids: new Set(),
    attack_anim_timer: 0,
    attack_anim_duration: 0.28,
    attack_anim_windup: 0.08,
    attack_anim_active: 0.08,
    attack_anim_kind: "melee",
    shot_recoil_timer: 0,
    shot_recoil_duration: 0.14,
    shot_recoil_direction: { x: 1, y: 0 },
    shot_recoil_pixels: 0,
    run_phase: 0,
    slow_timer: 0
  },
  weapons: [],
  projectiles: [],
  punctuation_mines: [],
  turrets: [],
  weapon_fields: [],
  enemies: [],
  enemy_projectiles: [],
  ink_drops: [],
  health_drops: [],
  ink_puddles: [],
  particles: [],
  hit_effects: [],
  hit_feedback_shake_cooldown: 0,
  ambient_motes: [],
  telegraphs: [],
  boss_lasers: [],
  active_boss: null,
  floating_texts: [],
  screen_shake: 0,
  shake_intensity: 0,

  rune_rotation: 0,
  questions: []
};

// Haptic feedback & Game feel helpers
let lastHapticTimestamp = 0;
function triggerHaptic(type = "light") {
  if (window.gameSettings && window.gameSettings.hapticsEnabled === false) return;
  const now = performance.now();
  // Strictly throttle haptic feedback (minimum 180ms) to prevent Android VibratorService IPC thread freezes
  if (now - lastHapticTimestamp < 180) return;
  lastHapticTimestamp = now;
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      if (type === "light") navigator.vibrate(10);
      else if (type === "medium") navigator.vibrate(20);
      else if (type === "heavy") navigator.vibrate([30, 20, 30]);
      else if (type === "success") navigator.vibrate([15, 30, 25]);
      else if (type === "fail") navigator.vibrate([40, 30, 40]);
    } catch (e) {}
  }
}

function triggerScreenShake(duration = 0.16, intensity = 6.0) {
  if (!window.gameSettings || !window.gameSettings.screenShake || state.screen_shake_disabled) {
    state.screen_shake = 0;
    state.shake_intensity = 0;
    return;
  }
  state.screen_shake = Math.max(state.screen_shake, duration);
  state.shake_intensity = Math.max(state.shake_intensity, intensity);
}

function addFloatingText(x, y, text, color = "#ffffff", size = 13) {
  if (window.gameSettings && window.gameSettings.damageNumbers === false) return;
  if (!state.floating_texts) state.floating_texts = [];
  const maxTexts = ('ontouchstart' in window || window.innerWidth <= 1080) ? 20 : 40;
  if (state.floating_texts.length >= maxTexts) {
    state.floating_texts.splice(0, state.floating_texts.length - maxTexts + 1);
  }
  state.floating_texts.push({
    x, y,
    text,
    color,
    size,
    vy: -48,
    lifetime: 0.65,
    max_lifetime: 0.65
  });
}

// Load persistent mistake notebook from localStorage
try {
  const savedMistakes = localStorage.getItem("lexicon_mistakes");
  if (savedMistakes) {
    state.mistake_words = JSON.parse(savedMistakes);
  }
} catch (e) {
  console.warn("Could not load saved mistakes", e);
}

// Ambient motes
for (let i = 0; i < 45; i++) {
  state.ambient_motes.push({
    x: (Math.random() - 0.5) * 2300,
    y: (Math.random() - 0.5) * 1700,
    radius: 1.0 + Math.random() * 2.5,
    alpha: 0.2 + Math.random() * 0.55,
    speed: 15 + Math.random() * 25,
    angle: Math.random() * Math.PI * 2
  });
}

// =========================================
// 6. ASSET LOADER
// =========================================
const images = {};
const spriteList = [
  "upgrade_v1/hero_inky.png", "upgrade_v1/hero_quillmaster.png",
  "upgrade_v1/hero_word_knight.png", "upgrade_v1/hero_rune_sorceress.png",
  "upgrade_v1/hero_alchemist.png", "upgrade_v1/hero_shadow_scribe.png",
  "upgrade_v1/animations/inky_idle_0.png", "upgrade_v1/animations/inky_idle_1.png", "upgrade_v1/animations/inky_idle_2.png", "upgrade_v1/animations/inky_idle_3.png", "upgrade_v1/animations/inky_run_0.png", "upgrade_v1/animations/inky_run_1.png", "upgrade_v1/animations/inky_run_2.png", "upgrade_v1/animations/inky_run_3.png", "upgrade_v1/animations/inky_run_4.png", "upgrade_v1/animations/inky_run_5.png", "upgrade_v1/animations/inky_run_6.png", "upgrade_v1/animations/inky_run_7.png", "upgrade_v1/animations/inky_attack_0.png", "upgrade_v1/animations/inky_attack_1.png", "upgrade_v1/animations/inky_attack_2.png", "upgrade_v1/animations/inky_attack_3.png",
  "upgrade_v1/animations/word_knight_idle_0.png", "upgrade_v1/animations/word_knight_idle_1.png", "upgrade_v1/animations/word_knight_idle_2.png", "upgrade_v1/animations/word_knight_idle_3.png", "upgrade_v1/animations/word_knight_run_0.png", "upgrade_v1/animations/word_knight_run_1.png", "upgrade_v1/animations/word_knight_run_2.png", "upgrade_v1/animations/word_knight_run_3.png", "upgrade_v1/animations/word_knight_run_4.png", "upgrade_v1/animations/word_knight_run_5.png", "upgrade_v1/animations/word_knight_run_6.png", "upgrade_v1/animations/word_knight_run_7.png", "upgrade_v1/animations/word_knight_attack_0.png", "upgrade_v1/animations/word_knight_attack_1.png", "upgrade_v1/animations/word_knight_attack_2.png", "upgrade_v1/animations/word_knight_attack_3.png", "upgrade_v1/animations/shadow_scribe_idle_0.png", "upgrade_v1/animations/shadow_scribe_idle_1.png", "upgrade_v1/animations/shadow_scribe_idle_2.png", "upgrade_v1/animations/shadow_scribe_idle_3.png", "upgrade_v1/animations/shadow_scribe_run_0.png", "upgrade_v1/animations/shadow_scribe_run_1.png", "upgrade_v1/animations/shadow_scribe_run_2.png", "upgrade_v1/animations/shadow_scribe_run_3.png", "upgrade_v1/animations/shadow_scribe_run_4.png", "upgrade_v1/animations/shadow_scribe_run_5.png", "upgrade_v1/animations/shadow_scribe_run_6.png", "upgrade_v1/animations/shadow_scribe_run_7.png", "upgrade_v1/animations/shadow_scribe_attack_0.png", "upgrade_v1/animations/shadow_scribe_attack_1.png", "upgrade_v1/animations/shadow_scribe_attack_2.png", "upgrade_v1/animations/shadow_scribe_attack_3.png",
  "upgrade_v1/animations/quillmaster_idle_0.png", "upgrade_v1/animations/quillmaster_idle_1.png", "upgrade_v1/animations/quillmaster_idle_2.png", "upgrade_v1/animations/quillmaster_idle_3.png", "upgrade_v1/animations/quillmaster_run_0.png", "upgrade_v1/animations/quillmaster_run_1.png", "upgrade_v1/animations/quillmaster_run_2.png", "upgrade_v1/animations/quillmaster_run_3.png", "upgrade_v1/animations/quillmaster_run_4.png", "upgrade_v1/animations/quillmaster_run_5.png", "upgrade_v1/animations/quillmaster_run_6.png", "upgrade_v1/animations/quillmaster_run_7.png", "upgrade_v1/animations/quillmaster_attack_0.png", "upgrade_v1/animations/quillmaster_attack_1.png", "upgrade_v1/animations/quillmaster_attack_2.png", "upgrade_v1/animations/quillmaster_attack_3.png",
  "upgrade_v1/animations/rune_sorceress_idle_0.png", "upgrade_v1/animations/rune_sorceress_idle_1.png", "upgrade_v1/animations/rune_sorceress_idle_2.png", "upgrade_v1/animations/rune_sorceress_idle_3.png", "upgrade_v1/animations/rune_sorceress_run_0.png", "upgrade_v1/animations/rune_sorceress_run_1.png", "upgrade_v1/animations/rune_sorceress_run_2.png", "upgrade_v1/animations/rune_sorceress_run_3.png", "upgrade_v1/animations/rune_sorceress_run_4.png", "upgrade_v1/animations/rune_sorceress_run_5.png", "upgrade_v1/animations/rune_sorceress_run_6.png", "upgrade_v1/animations/rune_sorceress_run_7.png", "upgrade_v1/animations/rune_sorceress_attack_0.png", "upgrade_v1/animations/rune_sorceress_attack_1.png", "upgrade_v1/animations/rune_sorceress_attack_2.png", "upgrade_v1/animations/rune_sorceress_attack_3.png",
  "upgrade_v1/animations/alchemist_idle_0.png", "upgrade_v1/animations/alchemist_idle_1.png", "upgrade_v1/animations/alchemist_idle_2.png", "upgrade_v1/animations/alchemist_idle_3.png", "upgrade_v1/animations/alchemist_run_0.png", "upgrade_v1/animations/alchemist_run_1.png", "upgrade_v1/animations/alchemist_run_2.png", "upgrade_v1/animations/alchemist_run_3.png", "upgrade_v1/animations/alchemist_run_4.png", "upgrade_v1/animations/alchemist_run_5.png", "upgrade_v1/animations/alchemist_run_6.png", "upgrade_v1/animations/alchemist_run_7.png", "upgrade_v1/animations/alchemist_attack_0.png", "upgrade_v1/animations/alchemist_attack_1.png", "upgrade_v1/animations/alchemist_attack_2.png", "upgrade_v1/animations/alchemist_attack_3.png",
  "upgrade_v1/monster_grammar_goblin.png", "upgrade_v1/monster_typo_slime.png",
  "upgrade_v1/monster_punctuation_phantom.png", "upgrade_v1/monster_spelling_spectre.png",
  "upgrade_v1/monster_typo_splinter.png", "upgrade_v1/monster_homophone_harpy.png",
  "upgrade_v1/monster_idiom_imp.png", "upgrade_v1/monster_tautology_twin.png",
  "upgrade_v1/monster_dangling_modifier.png", "upgrade_v1/monster_double_negative_drake.png",
  "upgrade_v1/monster_run_on_reaper.png",
  "upgrade_v1/monster_syntax_titan.png", "upgrade_v1/monster_malapropism_mimic.png",
  "upgrade_v1/monster_palindrome_phantom.png", "upgrade_v1/monster_oxymoron_ogre.png",
  "upgrade_v1/monster_vocabulary_void.png",
  "upgrade_v1/monster_lexicon_dragon_boss.png", "upgrade_v1/monster_red_pen_boss.png",
  "upgrade_v2/boss_red_inquisitor.png", "upgrade_v2/boss_lexicon_dragon.png",
  "upgrade_v2/boss_void_curator.png", "upgrade_v2/boss_syntax_titan.png",
  "upgrade_v1/threat_seal.png",
  "player.png", "player_quillmaster.png", "player_knight.png",
  "player_sorceress.png", "player_alchemist.png", "player_assassin.png",
  // Weapons
  "quill_blaster.png", "syllable_shotgun.png", "lexicon_beam.png",
  "punctuation_bomb.png", "punctuation_mine.png", "dictionary_blade.png",
  "crossword_crossbow.png", "hyphen_boomerang.png", "ink_flamethrower.png",
  "thesaurus_rocket.png", "quote_pistols.png", "calligraphy_katana.png",
  "scroll_turret.png", "rune_orb.png", "grammar_sniper.png",
  // Gadgets
  "eraser_icon.png", "gadget_ink_bomb.png", "gadget_time_stop.png",
  "gadget_shield.png", "gadget_magnet.png",
  // Bullets & Drops
  "bullet_bolt.png", "bullet_boomerang.png", "bullet_rocket.png",
  "bullet_flame.png", "bullet_enemy_red.png", "ink_bullet.png", "ink_drop.png",
  "effects/combat_hit_0.png", "effects/combat_hit_1.png", "effects/combat_hit_2.png", "effects/combat_hit_3.png",
  "effects/combat_hit_4.png", "effects/combat_hit_5.png", "effects/combat_hit_6.png", "effects/combat_hit_7.png",
  // Enemies
  "typo_slime.png", "typo_splinter.png", "grammar_goblin.png",
  "punctuation_phantom.png", "syntax_titan.png", "spelling_spectre.png",
  "red_pen_boss.png", "oxymoron_ogre.png", "vocabulary_void.png",
  "malapropism_mimic.png", "homophone_harpy.png", "idiom_imp.png",
  "lexicon_dragon_boss.png", "elite_crown.png",
  "tautology_twin.png", "run_on_reaper.png", "dangling_modifier.png",
  "double_negative_drake.png", "palindrome_phantom.png",
  // Environment & UI
  "upgrade_v1/arena_dungeon.png", "upgrade_v1/arena_observatory.png", "upgrade_v1/arena_void.png",
  "upgrade_v1/arena_frame_library.png", "upgrade_v1/arena_frame_dungeon.png",
  "upgrade_v1/arena_frame_observatory.png", "upgrade_v1/arena_frame_void.png",
  "tile_floor.png", "tile_library_parquet.png", "magical_rune_circle.png",
  "tile_dungeon_stone.png", "magical_rune_cyan.png",
  "tile_astral_observatory.png", "magical_rune_astral.png",
  "tile_void_sanctum.png", "magical_rune_void.png",
  "brazier_pedestal.png", "illuminated_lectern.png", "touch_weapon_icon.png",
  "bookshelf_wall.png", "wax_seal.png"
];
const GENERATED_HERO_ANIMATION_KEYS = ["inky", "quillmaster", "word_knight", "rune_sorceress", "alchemist", "shadow_scribe"];
spriteList.push(...GENERATED_HERO_ANIMATION_KEYS.flatMap(key => [
  ...Array.from({ length: 8 }, (_, frame) => `upgrade_v1/animations/${key}_run_v2_${frame}.png`),
  ...Array.from({ length: 4 }, (_, frame) => `upgrade_v1/animations/${key}_ranged_v2_${frame}.png`),
  ...Array.from({ length: 4 }, (_, frame) => `upgrade_v1/animations/${key}_attack_v2_${frame}.png`)
]));
spriteList.push(...Object.values(WEAPONS_CATALOG).map(weapon => weapon.sprite));
const ENEMY_SPRITE_VERSION = "monster-refresh-20261106-2";
const LEGACY_ENEMY_SPRITES = new Set([
  "typo_slime.png", "typo_splinter.png", "grammar_goblin.png", "punctuation_phantom.png",
  "syntax_titan.png", "spelling_spectre.png", "red_pen_boss.png", "oxymoron_ogre.png",
  "vocabulary_void.png", "malapropism_mimic.png", "homophone_harpy.png", "idiom_imp.png",
  "lexicon_dragon_boss.png", "tautology_twin.png", "run_on_reaper.png", "dangling_modifier.png",
  "double_negative_drake.png", "palindrome_phantom.png"
]);

function loadAssets(callback) {
  let loaded = 0;
  const generatedEnemyAliases = {
    "upgrade_v1/monster_grammar_goblin.png": "grammar_goblin.png",
    "upgrade_v1/monster_typo_slime.png": "typo_slime.png",
    "upgrade_v1/monster_punctuation_phantom.png": "punctuation_phantom.png",
    "upgrade_v1/monster_spelling_spectre.png": "spelling_spectre.png",
    "upgrade_v1/monster_typo_splinter.png": "typo_splinter.png",
    "upgrade_v1/monster_homophone_harpy.png": "homophone_harpy.png",
    "upgrade_v1/monster_idiom_imp.png": "idiom_imp.png",
    "upgrade_v1/monster_tautology_twin.png": "tautology_twin.png",
    "upgrade_v1/monster_dangling_modifier.png": "dangling_modifier.png",
    "upgrade_v1/monster_double_negative_drake.png": "double_negative_drake.png",
    "upgrade_v1/monster_run_on_reaper.png": "run_on_reaper.png",
    "upgrade_v1/monster_syntax_titan.png": "syntax_titan.png",
    "upgrade_v1/monster_malapropism_mimic.png": "malapropism_mimic.png",
    "upgrade_v1/monster_palindrome_phantom.png": "palindrome_phantom.png",
    "upgrade_v1/monster_oxymoron_ogre.png": "oxymoron_ogre.png",
    "upgrade_v1/monster_vocabulary_void.png": "vocabulary_void.png",
    "upgrade_v1/monster_lexicon_dragon_boss.png": "lexicon_dragon_boss.png",
    "upgrade_v1/monster_red_pen_boss.png": "red_pen_boss.png"
  };
  const aliasTargets = new Set(Object.values(generatedEnemyAliases));
  const assetsToLoad = spriteList.filter(name => !aliasTargets.has(name));
  assetsToLoad.forEach(name => {
    const img = new Image();
    const url = new URL("assets/sprites/" + name, window.location.href);
    if (name.includes("upgrade_v1/monster_") || LEGACY_ENEMY_SPRITES.has(name)) {
      url.searchParams.set("v", ENEMY_SPRITE_VERSION);
    }
    img.src = url.href;
    img.onload = () => {
      loaded++;
      images[name] = img;
      if (generatedEnemyAliases[name]) images[generatedEnemyAliases[name]] = img;
      if (loaded === assetsToLoad.length) callback();
    };
    img.onerror = () => {
      loaded++;
      console.warn("Could not load sprite:", name);
      if (loaded === assetsToLoad.length) callback();
    };
  });
}

// Load Questions JSON
fetch("questions.json")
  .then(res => res.json())
  .then(data => {
    state.questions = data;
    console.log("Loaded questions:", state.questions.length);
  })
  .catch(err => console.error("Failed loading questions.json:", err));

// =========================================
// 7. CONTROLS, INVENTORY & FULLSCREEN
// =========================================
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
let lastTime = performance.now();

// Adaptive Responsive Canvas Viewport for Zero-Void Mobile Experience
function resizeGameCanvas() {
  const container = document.getElementById("game-container");
  if (!container || !canvas) return;
  const isMobile = window.innerWidth <= 1080 || ('ontouchstart' in window);

  if (isMobile) {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    const isPortrait = h > w;

    if (isPortrait) {
      canvas.width = 720;
      canvas.height = Math.round(720 * (h / Math.max(1, w)));
    } else {
      canvas.height = 720;
      canvas.width = Math.round(720 * (w / Math.max(1, h)));
    }
  } else {
    canvas.width = 1280;
    canvas.height = 720;
  }
}
window.addEventListener("resize", resizeGameCanvas);
window.addEventListener("orientationchange", () => setTimeout(resizeGameCanvas, 150));
resizeGameCanvas();

// Fullscreen
document.getElementById("fullscreen-btn").onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
};

const touchToggleBtn = document.getElementById("touch-toggle-btn");
if (touchToggleBtn) {
  touchToggleBtn.onclick = () => {
    const controls = document.getElementById("mobile-touch-controls");
    if (controls) {
      const isVisible = window.getComputedStyle(controls).display !== "none";
      controls.style.display = isVisible ? "none" : "block";
    }
  };
}

const musicBtn = document.getElementById("music-btn");
function toggleMusic() {
  sounds.init();
  if (!bgm.isPlaying) {
    bgm.isMuted = false;
    bgm.start();
    return true;
  }
  return bgm.toggleMute();
}

function setMusicChoice(choice) {
  bgm.setMusicChoice(choice);
  for (const id of ["title-music-select", "mobile-music-select"]) {
    const select = document.getElementById(id);
    if (select) select.value = bgm.musicChoice;
  }
}
for (const id of ["title-music-select", "mobile-music-select"]) {
  const select = document.getElementById(id);
  if (select) {
    select.value = bgm.musicChoice;
    select.addEventListener("change", () => setMusicChoice(select.value));
  }
}

if (musicBtn) {
  musicBtn.onclick = (e) => {
    e.stopPropagation();
    const isUnmuted = toggleMusic();
    musicBtn.textContent = isUnmuted ? "MÜZİK" : "MÜZİK KAPALI";
    updateMobileQuickMenuUI();
  };
}

// =========================================
// SPEED & AUTO NEW RUN CONTROLS
// =========================================
const SPEED_STEPS = [0.5, 1.0, 1.5, 2.0, 3.0];

function setGameSpeed(speed) {
  state.game_speed = speed;
  const speedText = speed.toFixed(1) + "x";

  const speedBtn = document.getElementById("speed-btn");
  if (speedBtn) speedBtn.textContent = `HIZ ${speedText}`;
  const titleSpeedBtn = document.getElementById("title-speed-btn");
  if (titleSpeedBtn) titleSpeedBtn.innerHTML = `<img class="ui-icon" src="assets/ui/icons/speed.svg" alt="">Hız: ${speedText}`;

  const toast = document.getElementById("speed-toast");
  if (toast) {
    toast.textContent = `OYUN HIZI: ${speedText}`;
    toast.style.display = "block";
    toast.style.opacity = "1";
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.display = "none";
    }, 1100);
  }
}

function cycleGameSpeed() {
  const cur = state.game_speed || 1.0;
  const idx = SPEED_STEPS.indexOf(cur);
  const nextIdx = (idx === -1 || idx === SPEED_STEPS.length - 1) ? 0 : idx + 1;
  setGameSpeed(SPEED_STEPS[nextIdx]);
}

function adjustGameSpeed(direction) {
  const cur = state.game_speed || 1.0;
  let idx = SPEED_STEPS.indexOf(cur);
  if (idx === -1) idx = 1;
  const nextIdx = Math.max(0, Math.min(SPEED_STEPS.length - 1, idx + direction));
  setGameSpeed(SPEED_STEPS[nextIdx]);
}

function toggleAutoNewTur() {
  state.auto_new_tur = !state.auto_new_tur;
  try {
    localStorage.setItem("lexicon_auto_new_tur", state.auto_new_tur ? "true" : "false");
  } catch(e){}
  updateAutoTurUI();
  const shopScreen = document.getElementById("shop-screen");
  if (shopScreen && shopScreen.style.display !== "none") {
    if (state.auto_new_tur) startShopAutoWaveCountdown(4);
    else clearShopAutoWaveTimer();
  }
}

function updateAutoTurUI() {
  const isAuto = !!state.auto_new_tur;
  const btn = document.getElementById("auto-tur-btn");
  if (btn) {
    btn.textContent = isAuto ? "OTO TUR: AÇIK" : "OTO TUR: KAPALI";
    btn.style.color = isAuto ? "#587767" : "#7c7668";
    btn.style.borderColor = isAuto ? "#718a79" : "#827965";
  }
  const titleBtn = document.getElementById("title-auto-tur-btn");
  if (titleBtn) {
    titleBtn.textContent = isAuto ? "Otomatik Tur: AÇIK" : "Otomatik Tur: KAPALI";
    titleBtn.style.color = isAuto ? "#587767" : "#7c7668";
  }
  const shopBtn = document.getElementById("shop-auto-tur-btn");
  if (shopBtn) {
    shopBtn.textContent = isAuto ? "Oto Tur: AÇIK" : "Oto Tur: KAPALI";
    shopBtn.style.color = isAuto ? "#587767" : "#7c7668";
  }
}

let shopAutoWaveTimer = null;
let shopAutoWaveEndTime = 0;

function startShopAutoWaveCountdown(seconds) {
  if (!state.auto_new_tur) return;
  const container = document.getElementById("shop-auto-wave-container");
  const label = document.getElementById("shop-auto-wave-label");
  const bar = document.getElementById("shop-auto-wave-bar");
  const nextWaveText = document.getElementById("shop-next-wave-text");
  if (!container || !label || !bar) return;

  container.style.display = "block";
  shopAutoWaveEndTime = Date.now() + seconds * 1000;

  if (shopAutoWaveTimer) clearInterval(shopAutoWaveTimer);
  shopAutoWaveTimer = setInterval(() => {
    const leftMs = shopAutoWaveEndTime - Date.now();
    const leftSec = Math.max(0, Math.ceil(leftMs / 1000));
    label.textContent = `Otomatik sonraki tur: ${leftSec}s`;
    if (nextWaveText) {
      nextWaveText.textContent = `SONRAKİ DALGA · ${leftSec}s`;
    }
    const pct = Math.max(0, Math.min(100, (leftMs / (seconds * 1000)) * 100));
    bar.style.width = pct + "%";

    if (leftMs <= 0) {
      clearShopAutoWaveTimer();
      advanceNextWave();
    }
  }, 100);
}

function clearShopAutoWaveTimer() {
  if (shopAutoWaveTimer) {
    clearInterval(shopAutoWaveTimer);
    shopAutoWaveTimer = null;
  }
  const container = document.getElementById("shop-auto-wave-container");
  if (container) container.style.display = "none";
  const nextWaveText = document.getElementById("shop-next-wave-text");
  if (nextWaveText) {
    nextWaveText.textContent = "SONRAKİ DALGA";
  }
}

function advanceNextWave() {
  const shopScreen = document.getElementById("shop-screen");
  if (state.is_wave_active || !shopScreen || shopScreen.style.display === "none" || state.current_wave >= state.max_waves) return;
  clearShopAutoWaveTimer();
  shopScreen.style.display = "none";
  state.current_wave++;
  startWave();
  syncMobileControlsVisibility();
}

function toggleAutoNewRun() {
  state.auto_new_run = !state.auto_new_run;
  try {
    localStorage.setItem("lexicon_auto_new_run", state.auto_new_run ? "true" : "false");
  } catch(e){}
  updateAutoRunUI();
}

function updateAutoRunUI() {
  const isAuto = !!state.auto_new_run;
  const btn = document.getElementById("auto-run-btn");
  if (btn) {
    btn.textContent = isAuto ? "OTO RUN: AÇIK" : "OTO RUN: KAPALI";
    btn.style.color = isAuto ? "#587767" : "#7c7668";
    btn.style.borderColor = isAuto ? "#718a79" : "#827965";
  }
  const titleBtn = document.getElementById("title-auto-run-btn");
  if (titleBtn) {
    titleBtn.textContent = isAuto ? "Otomatik Yeni Run: AÇIK" : "Otomatik Yeni Run: KAPALI";
    titleBtn.style.color = isAuto ? "#587767" : "#7c7668";
  }
  const goBtn = document.getElementById("gameover-auto-run-toggle");
  if (goBtn) {
    goBtn.textContent = isAuto ? "Oto Run: AÇIK" : "Oto Run: KAPALI";
    goBtn.style.color = isAuto ? "#587767" : "#7c7668";
  }
}

let autoRunTimer = null;
let autoRunEndTime = 0;

function startAutoRunCountdown(seconds) {
  if (!state.auto_new_run) return;
  const container = document.getElementById("auto-run-countdown-container");
  const text = document.getElementById("auto-run-countdown-text");
  const bar = document.getElementById("auto-run-countdown-bar");
  if (!container || !text || !bar) return;

  container.style.display = "block";
  autoRunEndTime = Date.now() + seconds * 1000;

  if (autoRunTimer) clearInterval(autoRunTimer);
  autoRunTimer = setInterval(() => {
    const leftMs = autoRunEndTime - Date.now();
    const leftSec = Math.max(0, Math.ceil(leftMs / 1000));
    text.textContent = `Otomatik yeni run: ${leftSec}s`;
    const pct = Math.max(0, Math.min(100, (leftMs / (seconds * 1000)) * 100));
    bar.style.width = pct + "%";

    if (leftMs <= 0) {
      clearAutoRunCountdown();
      instantStartRun();
    }
  }, 100);
}

function clearAutoRunCountdown() {
  if (autoRunTimer) {
    clearInterval(autoRunTimer);
    autoRunTimer = null;
  }
  const container = document.getElementById("auto-run-countdown-container");
  if (container) container.style.display = "none";
}

function instantStartRun() {
  clearAutoRunCountdown();
  document.getElementById("game-over-screen").style.display = "none";
  document.getElementById("title-screen").style.display = "none";
  sounds.init();
  bgm.start();
  bgm.setMode("battle");
  startGame();
  syncMobileControlsVisibility();
}

const speedBtn = document.getElementById("speed-btn");
if (speedBtn) {
  speedBtn.onclick = (e) => {
    e.stopPropagation();
    cycleGameSpeed();
  };
}

const autoTurBtn = document.getElementById("auto-tur-btn");
if (autoTurBtn) {
  autoTurBtn.onclick = (e) => {
    e.stopPropagation();
    toggleAutoNewTur();
  };
}

const autoRunBtn = document.getElementById("auto-run-btn");
if (autoRunBtn) {
  autoRunBtn.onclick = (e) => {
    e.stopPropagation();
    toggleAutoNewRun();
  };
}

const titleSpeedBtn = document.getElementById("title-speed-btn");
if (titleSpeedBtn) {
  titleSpeedBtn.onclick = (e) => {
    e.stopPropagation();
    cycleGameSpeed();
  };
}

const titleAutoTurBtn = document.getElementById("title-auto-tur-btn");
if (titleAutoTurBtn) {
  titleAutoTurBtn.onclick = (e) => {
    e.stopPropagation();
    toggleAutoNewTur();
  };
}

const titleAutoRunBtn = document.getElementById("title-auto-run-btn");
if (titleAutoRunBtn) {
  titleAutoRunBtn.onclick = (e) => {
    e.stopPropagation();
    toggleAutoNewRun();
  };
}

const instantRestartBtn = document.getElementById("instant-restart-btn");
if (instantRestartBtn) {
  instantRestartBtn.onclick = (e) => {
    e.stopPropagation();
    instantStartRun();
  };
}

const gameoverAutoRunToggle = document.getElementById("gameover-auto-run-toggle");
if (gameoverAutoRunToggle) {
  gameoverAutoRunToggle.onclick = (e) => {
    e.stopPropagation();
    toggleAutoNewRun();
    if (state.auto_new_run) {
      startAutoRunCountdown(3);
    } else {
      clearAutoRunCountdown();
    }
  };
}

const cancelAutoRunBtn = document.getElementById("cancel-auto-run-btn");
if (cancelAutoRunBtn) {
  cancelAutoRunBtn.onclick = (e) => {
    e.stopPropagation();
    clearAutoRunCountdown();
  };
}

const shopAutoTurBtn = document.getElementById("shop-auto-tur-btn");
if (shopAutoTurBtn) {
  shopAutoTurBtn.onclick = (e) => {
    e.stopPropagation();
    toggleAutoNewTur();
  };
}

const shopCancelAutoBtn = document.getElementById("shop-auto-wave-cancel-btn");
if (shopCancelAutoBtn) {
  shopCancelAutoBtn.onclick = (e) => {
    e.stopPropagation();
    clearShopAutoWaveTimer();
  };
}

// Inventory modal toggle
document.getElementById("inventory-btn").onclick = () => toggleInventoryModal();
document.getElementById("close-inventory-btn").onclick = () => toggleInventoryModal(false);
document.getElementById("gadget-panel").onclick = () => activateActiveGadget();

// Mobile Quick Menu & Weapon Cycle
function cycleActiveWeapon(dir = 1) {
  if (state.weapons.length <= 1) return;
  state.active_weapon_index = (state.active_weapon_index + dir + state.weapons.length) % state.weapons.length;
  sounds.playTone(420, "sine", 0.07, 0.16);
  updateHUD();
}

function toggleMobileQuickMenu(forcedState) {
  const modal = document.getElementById("mobile-quick-menu");
  if (!modal) return;
  const isCurrentlyOpen = modal.style.display !== "none" && modal.style.display !== "";
  const show = forcedState !== undefined ? forcedState : !isCurrentlyOpen;
  modal.style.display = show ? "flex" : "none";
  syncMobileControlsVisibility();
  if (show) {
    updateMobileQuickMenuUI();
  }
}

function updateMobileQuickMenuUI() {
  const speedOpts = document.querySelectorAll(".mobile-speed-opt");
  speedOpts.forEach(btn => {
    const spd = parseFloat(btn.dataset.speed);
    if (Math.abs(spd - (state.game_speed || 1.0)) < 0.01) {
      btn.classList.add("btn-seal");
    } else {
      btn.classList.remove("btn-seal");
    }
  });

  const autoTurBtn = document.getElementById("mobile-toggle-autowave-btn");
  if (autoTurBtn) {
    autoTurBtn.textContent = state.auto_new_tur ? "Otomatik Tur: AÇIK" : "Otomatik Tur: KAPALI";
    if (state.auto_new_tur) autoTurBtn.classList.add("btn-emerald");
    else autoTurBtn.classList.remove("btn-emerald");
  }

  const autoRunBtn = document.getElementById("mobile-toggle-autorun-btn");
  if (autoRunBtn) {
    autoRunBtn.textContent = state.auto_new_run ? "Otomatik Run: AÇIK" : "Otomatik Run: KAPALI";
    if (state.auto_new_run) autoRunBtn.classList.add("btn-emerald");
    else autoRunBtn.classList.remove("btn-emerald");
  }

  const musicBtn = document.getElementById("mobile-toggle-music-btn");
  if (musicBtn) {
    musicBtn.textContent = bgm.isMuted ? "Müzik: KAPALI" : "Müzik: AÇIK";
  }

  const joyBtn = document.getElementById("mobile-toggle-joy-btn");
  if (joyBtn) {
    const active = state.show_touch_controls !== false;
    joyBtn.textContent = active ? "Sanal joystick: açık" : "Sanal joystick: kapalı";
  }
}

const mobileMenuBtn = document.getElementById("mobile-menu-btn");
if (mobileMenuBtn) {
  mobileMenuBtn.onclick = (e) => {
    e.stopPropagation();
    toggleMobileQuickMenu();
  };
}

const closeMobileMenuBtn = document.getElementById("close-mobile-menu-btn");
if (closeMobileMenuBtn) {
  closeMobileMenuBtn.onclick = (e) => {
    e.stopPropagation();
    toggleMobileQuickMenu(false);
  };
}

const mobileAutoTurBtn = document.getElementById("mobile-toggle-autowave-btn");
if (mobileAutoTurBtn) {
  mobileAutoTurBtn.onclick = (e) => {
    e.stopPropagation();
    toggleAutoNewTur();
    updateMobileQuickMenuUI();
  };
}

const mobileAutoRunBtn = document.getElementById("mobile-toggle-autorun-btn");
if (mobileAutoRunBtn) {
  mobileAutoRunBtn.onclick = (e) => {
    e.stopPropagation();
    toggleAutoNewRun();
    updateMobileQuickMenuUI();
  };
}

const mobileMusicBtn = document.getElementById("mobile-toggle-music-btn");
if (mobileMusicBtn) {
  mobileMusicBtn.onclick = (e) => {
    e.stopPropagation();
    toggleMusic();
    updateMobileQuickMenuUI();
  };
}

const mobileOpenInvBtn = document.getElementById("mobile-open-inv-btn");
if (mobileOpenInvBtn) {
  mobileOpenInvBtn.onclick = (e) => {
    e.stopPropagation();
    toggleMobileQuickMenu(false);
    toggleInventoryModal(true);
  };
}

const mobileOpenMistakesBtn = document.getElementById("mobile-open-mistakes-btn");
if (mobileOpenMistakesBtn) {
  mobileOpenMistakesBtn.onclick = (e) => {
    e.stopPropagation();
    toggleMobileQuickMenu(false);
    toggleMistakesModal(true);
  };
}

const mobileToggleJoyBtn = document.getElementById("mobile-toggle-joy-btn");
if (mobileToggleJoyBtn) {
  mobileToggleJoyBtn.onclick = (e) => {
    e.stopPropagation();
    state.show_touch_controls = (state.show_touch_controls === false);
    syncMobileControlsVisibility();
    updateMobileQuickMenuUI();
  };
}

const mobileToggleFsBtn = document.getElementById("mobile-toggle-fs-btn");
if (mobileToggleFsBtn) {
  mobileToggleFsBtn.onclick = (e) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };
}

document.querySelectorAll(".mobile-speed-opt").forEach(btn => {
  btn.onclick = (e) => {
    e.stopPropagation();
    setGameSpeed(parseFloat(btn.dataset.speed));
    updateMobileQuickMenuUI();
  };
});

function triggerTacticalAlert(title, desc, tone = "threat") {
  const banner = document.getElementById("tactical-alert-banner");
  const titleEl = document.getElementById("tactical-alert-title");
  const descEl = document.getElementById("tactical-alert-desc");
  if (!banner || !titleEl || !descEl) return;
  const isBiome = tone === "biome";
  banner.style.borderColor = isBiome ? "#7b8978" : "#a75d50";
  titleEl.style.color = isBiome ? "#c9cfb3" : "#e2a79c";
  titleEl.textContent = title;
  descEl.textContent = desc;
  banner.style.display = "block";
  banner.style.opacity = "1";
  if (state.alert_timeout) clearTimeout(state.alert_timeout);
  state.alert_timeout = setTimeout(() => {
    banner.style.opacity = "0";
    setTimeout(() => { banner.style.display = "none"; }, 400);
  }, 4200);
}

const chapterTransitions = [
  {
    title: "KARANLIK KÜTÜPHANE",
    kicker: "BÖLÜM I · DALGALAR 01–25",
    narration: "Kayıp kelimeleri rafların arasından geri çağır.",
    accent: "#c5aa72",
    numeral: "I"
  },
  {
    title: "SÖZ DEHLİZİ",
    kicker: "BÖLÜM II · DALGALAR 26–50",
    narration: "Taş kapı açılır; duvarlardaki yanlış kelimeler uyanır.",
    accent: "#99a99d",
    numeral: "II"
  },
  {
    title: "ASTRAL GÖZLEMEVİ",
    kicker: "BÖLÜM III · DALGALAR 51–75",
    narration: "Dehlizin son kapısı açılır; yıldızlar yeni sözcükler dizer.",
    accent: "#9baad1",
    numeral: "III"
  },
  {
    title: "SON SAYFA",
    kicker: "BÖLÜM IV · DALGALAR 76–100",
    narration: "Kitap kapanır; boşlukta son kelimeler uyanır.",
    accent: "#bd91b7",
    numeral: "IV"
  }
];

let chapterCardTimeout = null;

function showChapterCard(stageIndex) {
  const chapter = chapterTransitions[Math.max(0, Math.min(chapterTransitions.length - 1, stageIndex))];
  const card = document.getElementById("chapter-transition-card");
  if (!card) return;
  card.style.setProperty("--chapter-accent", chapter.accent);
  document.getElementById("chapter-transition-kicker").textContent = chapter.kicker;
  document.getElementById("chapter-transition-number").textContent = chapter.numeral;
  document.getElementById("chapter-transition-title").textContent = chapter.title;
  document.getElementById("chapter-transition-narration").textContent = chapter.narration;
  card.hidden = false;
  card.classList.remove("is-leaving");
  if (chapterCardTimeout) clearTimeout(chapterCardTimeout);
  chapterCardTimeout = setTimeout(() => {
    card.classList.add("is-leaving");
    setTimeout(() => { card.hidden = true; }, 350);
  }, 5600);
}

function getChapterForWave(wave) {
  return chapterTransitions[wave >= 76 ? 3 : wave >= 51 ? 2 : wave >= 26 ? 1 : 0];
}

function toggleInventoryModal(forcedState) {
  const modal = document.getElementById("inventory-modal");
  const shouldOpen = forcedState !== undefined ? forcedState : modal.style.display !== "flex";
  if (shouldOpen && !state.is_wave_active) return;
  state.is_inventory_open = shouldOpen;
  modal.style.display = shouldOpen ? "flex" : "none";
  if (shouldOpen) {
    if (state.player) {
      state.player.vx = 0;
      state.player.vy = 0;
      state.player.attack_anim_timer = 0;
    }
    renderInventoryView();
  }
  syncMobileControlsVisibility();
}

document.getElementById("inventory-weapons-tab")?.addEventListener("click", () => {
  state.inventory_category = "weapons";
  renderInventoryView();
});
document.getElementById("inventory-gadgets-tab")?.addEventListener("click", () => {
  state.inventory_category = "gadgets";
  renderInventoryView();
});

// Scribe's Mistake Notebook (Hata Defteri & Pekiştirme)
const mistakesBtn = document.getElementById("mistakes-btn");
if (mistakesBtn) mistakesBtn.onclick = () => toggleMistakesModal();
const closeMistakesBtn = document.getElementById("close-mistakes-btn");
if (closeMistakesBtn) closeMistakesBtn.onclick = () => toggleMistakesModal(false);
const clearMistakesBtn = document.getElementById("clear-mistakes-btn");
if (clearMistakesBtn) clearMistakesBtn.onclick = () => clearMistakes();

function toggleMistakesModal(forcedState) {
  const modal = document.getElementById("mistakes-modal");
  if (!modal) return;
  const isVisible = forcedState !== undefined ? !forcedState : (modal.style.display === "flex");
  const willOpen = !isVisible;
  modal.style.display = willOpen ? "flex" : "none";
  state.is_mistakes_open = willOpen;
  if (willOpen) {
    if (state.player) {
      state.player.vx = 0;
      state.player.vy = 0;
      state.player.attack_anim_timer = 0;
    }
    renderMistakesList();
  }
  syncMobileControlsVisibility();
}

function renderMistakesList() {
  const listEl = document.getElementById("mistakes-list");
  const summaryEl = document.getElementById("mistakes-summary-text");
  if (!listEl || !summaryEl) return;
  listEl.innerHTML = "";

  if (!state.mistake_words || state.mistake_words.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 25px; font-family: 'IBM Plex Sans', serif; color: #1b4d2e;">
        <strong style="font-size: 16px; font-family: 'IBM Plex Serif', serif;">Hata defteri temiz</strong>
        <p style="font-size: 13px; color: #634325; margin-top: 4px;">Henüz bilinemeyen bir kelime yok. Sınavlarda harika bir başarı gösteriyorsun!</p>
      </div>
    `;
    summaryEl.textContent = "Kayıtlı pekiştirilecek hata bulunmuyor.";
    return;
  }

  summaryEl.textContent = `Toplam ${state.mistake_words.length} kelime pekiştirilmeyi bekliyor (Sonraki turlarda önünüze çıkacaktır)`;

  state.mistake_words.forEach(m => {
    const card = document.createElement("div");
    card.className = "mistake-card";
    card.innerHTML = `
      <div class="mistake-card-top">
        <span class="mistake-word">${m.word} <span style="font-size: 11px; color: #7a481d;">[${m.type} • ${m.level}]</span></span>
        <span class="mistake-badge">Hata: ${m.fail_count || 1} Kez (Dalga ${m.last_failed_wave || 1})</span>
      </div>
      <div class="mistake-desc"><strong>Soru:</strong> ${m.question}</div>
      <div class="mistake-desc" style="color: #1b4d2e;"><strong>Doğru Yanıt:</strong> <em>"${m.correct_answer}"</em></div>
      ${m.example ? `<div class="mistake-ex">Örnek: "${m.example}"</div>` : ''}
    `;
    listEl.appendChild(card);
  });
}

function clearMistakes() {
  if (confirm("Kâtip Hata Defterindeki tüm kelimeler sıfırlansın mı?")) {
    state.mistake_words = [];
    try { localStorage.removeItem("lexicon_mistakes"); } catch(e){}
    renderMistakesList();
    updateHUD();
  }
}

const keys = {};
window.addEventListener("keydown", e => {
  const storyOverlay = document.getElementById("story-intermission");
  if (storyOverlay && !storyOverlay.hidden) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (["Enter", " ", "ArrowRight"].includes(e.key)) closeStoryIntermission();
    else if (e.key === "Escape") skipStoryIntermission();
    return;
  }
  keys[e.key.toLowerCase()] = true;
  if (e.code === "Space" || e.key === "Shift") {
    activateActiveGadget();
    e.preventDefault();
  }
  if (e.key.toLowerCase() === "i") {
    if (state.is_wave_active || state.is_inventory_open) toggleInventoryModal();
  }
  if (e.key.toLowerCase() === "m") {
    toggleMistakesModal();
  }
  if (e.key.toLowerCase() === "q") {
    switchPrevWeapon();
  } else if (e.key.toLowerCase() === "e") {
    switchNextWeapon();
  } else if (e.key >= "1" && e.key <= "6") {
    selectWeaponIndex(parseInt(e.key) - 1);
  } else if (e.key === "[" || e.key === "-") {
    adjustGameSpeed(-1);
  } else if (e.key === "]" || e.key === "+" || e.key === "=") {
    adjustGameSpeed(1);
  } else if (e.key === "0") {
    setGameSpeed(1.0);
  }
});
window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});
window.addEventListener("contextmenu", e => {
  e.preventDefault();
  activateActiveGadget();
});
window.addEventListener("wheel", e => {
  if (e.deltaY > 0) switchNextWeapon();
  else if (e.deltaY < 0) switchPrevWeapon();
}, { passive: true });

function switchNextWeapon() {
  if (state.equipped_weapons.length <= 1) return;
  state.active_weapon_index = (state.active_weapon_index + 1) % state.equipped_weapons.length;
  sounds.playTone(480, "sine", 0.08, 0.15);
  syncWeapons();
  updateHUD();
}

function switchPrevWeapon() {
  if (state.equipped_weapons.length <= 1) return;
  state.active_weapon_index = (state.active_weapon_index - 1 + state.equipped_weapons.length) % state.equipped_weapons.length;
  sounds.playTone(440, "sine", 0.08, 0.15);
  syncWeapons();
  updateHUD();
}

function selectWeaponIndex(idx) {
  if (idx >= 0 && idx < state.equipped_weapons.length) {
    state.active_weapon_index = idx;
    sounds.playTone(460, "sine", 0.08, 0.15);
    syncWeapons();
    updateHUD();
  }
}

// =========================================
// 7.5 MOBILE VIRTUAL JOYSTICK & TOUCH CONTROLS
// =========================================
let touchControlsInitialized = false;
function initTouchControls() {
  if (touchControlsInitialized) return;
  touchControlsInitialized = true;
  const joystickZone = document.getElementById("joystick-zone");
  const joystickBase = document.getElementById("joystick-base");
  const joystickKnob = document.getElementById("joystick-knob");
  const touchSurface = document.getElementById("touch-joystick-surface");
  const touchWeaponBtn = document.getElementById("touch-weapon-btn");
  const touchGadgetBtn = document.getElementById("touch-gadget-btn");
  const touchInvBtn = document.getElementById("touch-inv-btn");
  const touchMistakesBtn = document.getElementById("touch-mistakes-btn");

  if (touchWeaponBtn) {
    const cycleWeapon = (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerHaptic("light");
      cycleActiveWeapon(1);
    };
    touchWeaponBtn.onclick = cycleWeapon;
  }

  if (touchGadgetBtn) {
    const fireGadget = (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerHaptic("medium");
      activateActiveGadget();
    };
    touchGadgetBtn.onclick = fireGadget;
  }

  if (touchInvBtn) {
    const openInv = (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerHaptic("light");
      toggleInventoryModal();
    };
    touchInvBtn.onclick = openInv;
  }

  if (touchMistakesBtn) {
    const openMistakes = (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerHaptic("light");
      toggleMistakesModal();
    };
    touchMistakesBtn.onclick = openMistakes;
  }

  if (!joystickZone || !joystickBase || !joystickKnob) return;

  let activeTouchId = null;
  let centerX = 0;
  let centerY = 0;
  const maxRadius = 45;
  let pendingKnobX = 0;
  let pendingKnobY = 0;
  let knobDirty = false;

  function flushJoystickKnob() {
    if (knobDirty && joystickKnob) {
      joystickKnob.style.transform = `translate3d(${pendingKnobX}px, ${pendingKnobY}px, 0)`;
      knobDirty = false;
    }
  }
  window.flushJoystickKnob = flushJoystickKnob;

  function updateJoystickPosition(clientX, clientY) {
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist < 8) {
      state.touch_dir = { x: 0, y: 0 };
      pendingKnobX = 0;
      pendingKnobY = 0;
      knobDirty = true;
      return;
    }

    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, maxRadius);
    pendingKnobX = Math.cos(angle) * clampedDist;
    pendingKnobY = Math.sin(angle) * clampedDist;
    knobDirty = true;

    // A confident flick (>14px) delivers 100% full directional speed immediately,
    // eliminating any floaty, sluggish feeling on mobile and matching PC WASD velocity!
    const speedFactor = dist >= 16 ? 1.0 : (dist - 8) / 8;
    state.touch_dir = {
      x: Math.cos(angle) * speedFactor,
      y: Math.sin(angle) * speedFactor
    };
  }

  function resetJoystick() {
    activeTouchId = null;
    state.touch_dir = { x: 0, y: 0 };
    pendingKnobX = 0;
    pendingKnobY = 0;
    knobDirty = true;
    flushJoystickKnob();
    joystickZone.style.opacity = "0.8";
  }

  const startFloatingAt = (clientX, clientY, identifier) => {
    if (activeTouchId !== null) return;
    activeTouchId = identifier;

    // Dynamically anchor joystick base directly to thumb position
    const container = document.getElementById("game-container") || document.body;
    const cRect = container.getBoundingClientRect();
    const relX = clientX - cRect.left;
    const relY = clientY - cRect.top;

    joystickZone.style.left = (relX - 60) + "px";
    joystickZone.style.top = (relY - 60) + "px";
    joystickZone.style.bottom = "auto";
    joystickZone.style.opacity = "1";

    centerX = clientX;
    centerY = clientY;
    updateJoystickPosition(clientX, clientY);
  };

  const supportsPointerEvents = "PointerEvent" in window;
  if (touchSurface) {
    if (supportsPointerEvents) touchSurface.addEventListener("pointerdown", (e) => {
      startFloatingAt(e.clientX, e.clientY, e.pointerId);
      try { touchSurface.setPointerCapture(e.pointerId); } catch(err){}
      e.preventDefault();
    });
    else touchSurface.addEventListener("touchstart", (e) => {
      const touch = e.changedTouches[0];
      startFloatingAt(touch.clientX, touch.clientY, touch.identifier);
      e.preventDefault();
    }, { passive: false });
  }

  const onJoystickPointerDown = (e) => {
    if (activeTouchId !== null) return;
    startFloatingAt(e.clientX, e.clientY, e.pointerId);
    try { joystickZone.setPointerCapture(e.pointerId); } catch(err){}
    e.preventDefault();
  };
  const onJoystickTouchStart = (e) => {
    if (activeTouchId !== null || !e.changedTouches.length) return;
    const touch = e.changedTouches[0];
    startFloatingAt(touch.clientX, touch.clientY, touch.identifier);
    e.preventDefault();
  };
  if (supportsPointerEvents) joystickZone.addEventListener("pointerdown", onJoystickPointerDown);
  else joystickZone.addEventListener("touchstart", onJoystickTouchStart, { passive: false });

  const onPointerMove = (e) => {
    if (activeTouchId === e.pointerId) {
      updateJoystickPosition(e.clientX, e.clientY);
      e.preventDefault();
    }
  };
  const onTouchMove = (e) => {
    if (activeTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchId) {
        updateJoystickPosition(touch.clientX, touch.clientY);
        e.preventDefault();
        break;
      }
    }
  };
  if (supportsPointerEvents) window.addEventListener("pointermove", onPointerMove);
  else window.addEventListener("touchmove", onTouchMove, { passive: false });

  const endPointer = (e) => {
    if (activeTouchId === e.pointerId) {
      resetJoystick();
    }
  };
  if (supportsPointerEvents) {
    window.addEventListener("pointerup", endPointer);
    window.addEventListener("pointercancel", endPointer);
  }

  const endTouch = (e) => {
    if (activeTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId) {
        resetJoystick();
        break;
      }
    }
  };
  if (!supportsPointerEvents) {
    window.addEventListener("touchend", endTouch);
    window.addEventListener("touchcancel", endTouch);
  }
}

// =========================================
// 7.8 MOBILE CONTROLS VISIBILITY SYNC
// =========================================
function syncMobileControlsVisibility() {
  const controls = document.getElementById("mobile-touch-controls");
  if (!controls) return;
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 1080;
  const isOverlayOpen =
    (document.getElementById("title-screen") && document.getElementById("title-screen").style.display !== "none") ||
    (document.getElementById("shop-screen") && document.getElementById("shop-screen").style.display !== "none") ||
    (document.getElementById("game-over-screen") && document.getElementById("game-over-screen").style.display !== "none") ||
    (document.getElementById("quiz-modal") && document.getElementById("quiz-modal").style.display === "flex") ||
    (document.getElementById("inventory-modal") && document.getElementById("inventory-modal").style.display === "flex") ||
    (document.getElementById("mistakes-modal") && document.getElementById("mistakes-modal").style.display === "flex") ||
    (document.getElementById("mobile-quick-menu") && document.getElementById("mobile-quick-menu").style.display !== "none");

  if (state.is_wave_active && !isOverlayOpen && isTouch && state.show_touch_controls !== false) {
    controls.style.display = "block";
  } else {
    controls.style.display = "none";
  }
}

// =========================================
// 8. TITLE & START GAME (6 CHARACTERS)
// =========================================
function initTitleScreen() {
  syncMobileControlsVisibility();
  const charGrid = document.getElementById("char-selection-grid");
  charGrid.innerHTML = "";
  ["inky", "quillmaster", "word_knight", "rune_sorceress", "lexicon_alchemist", "shadow_lexicographer"].forEach(cid => {
    const c = CHARACTERS[cid];
    const storyMotive = STORY_ARC_DATA?.characters?.[cid]?.motive || "";
    const card = document.createElement("div");
    card.className = "choice-card" + (cid === state.selected_char ? " selected" : "");
    card.setAttribute("role", "button");
    card.setAttribute("aria-pressed", String(cid === state.selected_char));
    card.setAttribute("aria-label", `${c.name} karakterini seç`);
    card.tabIndex = 0;
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="assets/sprites/${c.sprite}" style="width: 26px; height: 26px; image-rendering: pixelated;" alt="${c.name}">
          <div>
            <h3 style="margin: 0; font-size: 13.5px;">${c.name}</h3>
            <div class="subtitle" style="margin: 0; font-size: 10px;">${c.title}</div>
          </div>
        </div>
        <div class="stats-text" style="font-size: 9.5px; text-align: right; line-height: 1.25;">
          ${c.hp} HP | ${c.damage_mult}× hasar<br>${c.speed} hız ${c.armor > 0 ? '| %' + Math.round(c.armor*100) + ' zırh' : ''}
        </div>
      </div>
      <div class="desc" style="font-size: 10.5px; margin: 3px 0 2px 0;">${c.desc}</div>
      <div class="story-motive" style="font-size:10px;margin:3px 0;color:#765d39;font-style:italic;">Kişisel arayış · ${storyMotive}</div>
      <div class="passive" style="font-size: 9.5px; padding-top: 2px;">${c.passive}</div>
    `;

    const pickChar = (e) => {
      if (e) e.stopPropagation();
      state.selected_char = cid;
      sounds.init();
      sounds.playTone(480, "sine", 0.08, 0.15);
      initTitleScreen();
    };
    card.onclick = pickChar;
    card.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pickChar(e);
      }
    };
    charGrid.appendChild(card);
  });

  const diffContainer = document.getElementById("diff-selection-container");
  diffContainer.innerHTML = "";
  ["easy", "normal", "hard"].forEach(did => {
    const d = DIFFICULTIES[did];
    const btn = document.createElement("button");
    btn.className = "btn" + (did === state.difficulty ? " btn-seal" : "");
    btn.textContent = d.name;
    const pickDiff = (e) => {
      if (e) e.stopPropagation();
      state.difficulty = did;
      sounds.init();
      sounds.playTone(420, "sine", 0.08, 0.15);
      initTitleScreen();
    };
    btn.onclick = pickDiff;
    diffContainer.appendChild(btn);
  });

  document.getElementById("diff-desc").textContent = DIFFICULTIES[state.difficulty].desc;
  updateAutoTurUI();
  updateAutoRunUI();
  setGameSpeed(state.game_speed || 1.0);
}

const onStartGame = async (e) => {
  if (e) e.stopPropagation();
  if (state.is_wave_active) return;
  if (weaponVisualsStatus !== "ready" && !(await ensureWeaponVisuals())) return;
  await utilityCatalogReady;
  if (!(await gameEconomyReady)) return;
  if (!(await storyArcReady)) return;
  sounds.init();
  bgm.start();
  bgm.setMode("battle");
  document.getElementById("title-screen").style.display = "none";
  startGame();
};
document.getElementById("start-game-btn").onclick = onStartGame;

function getCharacterInkMultiplier(characterId, difficultyId) {
  const difficultyData = DIFFICULTIES[difficultyId] || DIFFICULTIES.normal;
  return difficultyData.ink_bonus_mult * (characterId === "lexicon_alchemist" ? 1.4 : 1.0);
}

function resetStats() {
  state.is_inventory_open = false;
  state.milestone_boss_delay = 0;
  const c = CHARACTERS[state.selected_char];
  const d = DIFFICULTIES[state.difficulty];

  state.max_hp = c.hp + d.player_hp_bonus;
  state.hp = state.max_hp;
  state.move_speed = c.speed;
  state.damage_mult = c.damage_mult;
  state.attack_speed_mult = c.attack_speed_mult;
  state.armor = c.armor;
  state.crit_chance = c.crit_chance;
  state.pickup_radius = 150;
  state.projectile_count = 1;
  state.pierce_count = 1;
  state.ink_mult = getCharacterInkMultiplier(state.selected_char, state.difficulty);

  state.max_weapon_slots = 4;
  state.equipped_weapons = [{ id: c.starting_weapon, tier: 1 }];
  state.reserve_weapons = [];
  state.active_weapon_index = 0;

  state.active_gadget_id = normalizeGadgetId(c.starting_gadget || "eraser_dash");
  state.owned_gadgets = [state.active_gadget_id];
  state.inventory_category = "weapons";
  state.gadget_timer = 0;
  state.chrono_timer = 0;
  state.shield_charges = 0;
  state.shield_timer = 0;
  state.magnet_timer = 0;
  state.gadget_cards = [];
  state.gadget_trails = [];
  state.gadget_decoys = [];
  state.mnemonic_used_this_wave = false;
  state.gadget_cooldown_mult = 1;

  state.current_wave = 1;
  state.ink_count = GAME_ECONOMY?.starting_ink ?? 0;
  state.kill_count = 0;
  state.words_learned = [];
  state.active_synergies = {};
  state.artifacts_owned = [];
  state.run_started_at = Date.now();
  state.run_submission_id = createSubmissionId();
  state.latest_run_result = null;
  state.run_result_recorded = false;

  state.player.x = 0;
  state.player.y = 0;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.invuln_timer = 0;
  state.player.is_dashing = false;
  state.player.dash_timer = 0;
  state.player.dash_hit_ids = new Set();
  state.player.attack_anim_timer = 0;
  state.player.attack_anim_duration = 0.28;
  state.player.attack_anim_windup = 0.08;
  state.player.attack_anim_active = 0.08;
  state.player.attack_anim_kind = "melee";
  state.player.shot_recoil_timer = 0;
  state.player.shot_recoil_pixels = 0;
  state.player.run_phase = 0;
  state.player.slow_timer = 0;

  state.enemies = [];
  state.enemy_projectiles = [];
  state.projectiles = [];
  state.punctuation_mines = [];
  state.turrets = [];
  state.weapon_fields = [];
  state.ink_drops = [];
  state.health_drops = [];
  state.ink_puddles = [];
  state.particles = [];
  state.hit_effects = [];
  state.hit_feedback_shake_cooldown = 0;
  state.active_boss = null;

  document.getElementById("boss-hp-container").style.display = "none";

  syncWeapons();
  updateHUD();
}

function syncWeapons() {
  state.weapons = [];
  state.equipped_weapons.forEach((item, i) => {
    const wData = WEAPONS_CATALOG[item.id] || WEAPONS_CATALOG["quill_blaster"];
    const tierBonus = TIER_MULTIPLIERS[item.tier] || TIER_MULTIPLIERS[1];
    const weapon = {
      id: item.id,
      data: wData,
      tier: item.tier,
      tier_data: tierBonus,
      archetype: getWeaponArchetype(item.id),
      evolution: getWeaponEvolution(item.id, item.tier),
      shoot_timer: 0.1 * i,
      rotation: 0,
      recoil: 0,
      flash_timer: 0,
      swing_timer: 0,
      swing_hit: false,
      is_active: (i === state.active_weapon_index),
      alt_side: false,
      beam_ticks_pending: 0,
      beam_tick_timer: 0,
      flame_phase: "burst",
      flame_phase_timer: 0,
      burst_shots: 0
    };
    resolveWeaponSignature(weapon);
    state.weapons.push(weapon);
  });
}

function startGame() {
  resetStats();
  startWave();
}

function startWave() {
  state.wave_duration = Math.min(42.0, 22.0 + (state.current_wave - 1) * 0.25);
  state.wave_time_left = state.wave_duration;
  state.is_wave_active = true;
  state.mnemonic_used_this_wave = false;
  state.milestone_boss_delay = state.current_wave % 5 === 0 ? 1.8 : 0;
  if (state.selected_char === "lexicon_alchemist") state.ink_count += 10;
  document.getElementById("shop-screen").style.display = "none";
  updateHUD();
  syncMobileControlsVisibility();
  bgm.start();
  bgm.setMode(state.current_wave % 5 === 0 ? "boss" : "battle");
  bgm.setBiomeForWave(state.current_wave);
  sounds.playAsset("wave", 0.58);

  // Tactical Alert Announcements on Key Waves
  const w = state.current_wave;
  if (w === 1 || w === 26 || w === 51 || w === 76) {
    showChapterCard(w >= 76 ? 3 : w >= 51 ? 2 : w >= 26 ? 1 : 0);
  } else if (w === 10) {
    triggerTacticalAlert("RED PEN INQUISITOR", "Elebaşının etrafında dönün ve kırmızı mermilerden sakının!");
  } else if (w === 15) {
    triggerTacticalAlert("KALKANLI MUHAFIZLAR", "Ön zırhları %75 hasar emer. Arkadan vurun veya bomba kullanın.");
  } else if (w === 25) {
    triggerTacticalAlert("IŞINLANAN SUİKASTÇİLER", "Kırmızı zemin işaretlerine dikkat edin; belirdiklerinde Silgi Atılımı yapın.");
  } else if (w === 35) {
    triggerTacticalAlert("AURA LİDERLERİ", "Yakındaki canavarları %35 hızlandırırlar. Önce liderleri hedefleyin.");
  } else if (w === 50) {
    triggerTacticalAlert("LEKSİKON EJDERHASI", "Lazer çizgilerinden kaçının; mermi fırtınasında atılımı zamanlayın.");
  } else if (w === 65) {
    triggerTacticalAlert("PATLAYICI GOLEMLER", "Ölüm patlamalarını düşman sürülerine karşı kullanın.");
  } else if (w === 75) {
    triggerTacticalAlert("ASTROLABE MERKEZİ", "Kozmik çekim ve spiral mermilere karşı hareketli kalın.");
  } else if (w === 85) {
    triggerTacticalAlert("ŞAMPİYONLAR ORDUSU", "Kalkanlılar ve Aura liderleri birlikte. Silahınızı duruma göre değiştirin.");
  } else if (w === 100) {
    triggerTacticalAlert("OMEGA EJDERHA", "Son kuşatma başladı. Cephaneliğinizi ve gereçlerinizi kullanın.");
  }

}

function endWave() {
  if (!state.is_wave_active) return;
  state.is_wave_active = false;
  state.milestone_boss_delay = 0;
  // Enemies still alive when the timer expires were not defeated by the player.
  // Clear them without awarding kill credit, drops, or rewards.
  state.enemies = [];
  state.enemy_projectiles = [];
  state.active_boss = null;
  document.getElementById("boss-hp-container").style.display = "none";
  syncMobileControlsVisibility();
  bgm.setMode("peaceful");

  if (state.current_wave % 5 === 0) {
    // 5, 10, 15, 20, 25... Her 5 dalgada bir hikaye ve çizgi roman animasyonu kesintisiz gösterilir!
    showStoryIntermission(state.current_wave);
  } else if (state.current_wave >= state.max_waves) {
    victoryScreen();
  } else if (window.gameSettings && window.gameSettings.skipWaveEndScreen) {
    // Kullanıcı dalga sonu dükkanını atlamak istediğinde: doğrudan sonraki dalgaya kesintisiz geçiş
    const nextWaveNum = state.current_wave + 1;
    triggerTacticalAlert("KESİNTİSİZ GEÇİŞ", `Dalga ${nextWaveNum} Başlıyor...`);
    setTimeout(() => {
      if (!state.is_wave_active && !window.isGamePaused && !state.is_inventory_open) {
        startWave();
      }
    }, 450);
  } else {
    openShop();
  }
}

let storyWavePending = 0;
let storyEpisodeIndex = -1;
let storyPanelIndex = 0;
const storySpeakerNames = { caption: "SAHNE", narrator: "SAHNE", hero: "KÂŞİF", neris: "NERİS", whisper: "BOŞ SAYFA", mother_echo: "LALE'NİN YANKISI", lio_echo: "LIO'NUN YANKISI", shadow_double: "GÖLGE", blank_page: "BOŞ SAYFA" };
function renderStoryPanel() {
  if (!STORY_ARC_DATA || storyEpisodeIndex < 0) return;
  const characterArc = STORY_ARC_DATA.characters[state.selected_char];
  const episode = characterArc.episodes[storyEpisodeIndex];
  const beat = episode.beats[storyPanelIndex];
  const speakerId = beat[0];
  const speaker = document.getElementById("story-speaker");
  const portrait = document.getElementById("story-speaker-portrait");
  const sceneImage = document.getElementById("story-scene-image");
  const dialogue = document.querySelector(".story-dialogue-frame");
  const heroSpeakerIds = new Set([state.selected_char, "hero", "rune_sorceress", "lexicon_alchemist", "shadow_lexicographer"]);
  const bossRosterEntry = MILESTONE_BOSS_ROSTER?.[storyEpisodeIndex];
  const isBossVoice = speakerId.startsWith("boss_");
  const portraitPaths = {
    hero: `assets/sprites/${CHARACTERS[state.selected_char].sprite}`,
    neris: "assets/sprites/story/neris_portrait.png",
    whisper: "assets/sprites/upgrade_v2/boss_void_curator.png",
    narrator: "",
    mother_echo: "",
    lio_echo: "",
    shadow_double: `assets/sprites/${CHARACTERS[state.selected_char].sprite}`
  };
  document.getElementById("story-kicker").textContent = `ARŞİV ARASI · DALGA ${String(episode.wave).padStart(2, "0")} · ${String(storyEpisodeIndex + 1).padStart(2, "0")} / 20`;
  document.getElementById("story-title").textContent = episode.title;
  document.getElementById("story-location").textContent = episode.location;
  document.getElementById("story-copy").textContent = beat[1];
  document.getElementById("story-scene-caption").textContent = episode.scene;
  document.getElementById("story-counter").textContent = `${storyPanelIndex + 1} / ${STORY_ARC_DATA.panel_count}`;
  sceneImage.src = `assets/sprites/story/${episode.backdrop}`;
  sceneImage.alt = `${episode.scene} · ${episode.location}`;
  const chosenBossSprite = isBossVoice && bossRosterEntry ? bossRosterEntry[1] : "";
  const speakerPath = heroSpeakerIds.has(speakerId) ? portraitPaths.hero
    : (chosenBossSprite || portraitPaths[speakerId] || "");
  const speakerName = heroSpeakerIds.has(speakerId) ? CHARACTERS[state.selected_char].name
    : speakerId === "narrator" ? "SAHNE"
      : isBossVoice && bossRosterEntry ? bossRosterEntry[2] : storySpeakerNames[speakerId] || speakerId.replaceAll("_", " ").toLocaleUpperCase("tr-TR");
  speaker.textContent = speakerName;
  portrait.hidden = !speakerPath;
  if (speakerPath) {
    portrait.dataset.kind = isBossVoice ? "boss" : speakerId;
    portrait.src = `assets/sprites/${speakerPath}`;
    portrait.alt = speakerName;
  }
  const memory = document.getElementById("story-boss-memory");
  const memoryItem = episode.boss_reward;
  const showMemory = storyPanelIndex === STORY_ARC_DATA.panel_count - 1 && !!memoryItem;
  memory.hidden = !showMemory;
  if (showMemory) {
    document.getElementById("story-memory-icon").src = memoryItem.icon || "assets/sprites/story/memory_clue.svg";
    const memoryLabel = memoryItem.type === "relic" ? "YADİGÂR" : memoryItem.type === "ending" ? "SON KARAR" : "BOSS ANI";
    document.getElementById("story-memory-title").textContent = `${memoryLabel} · ${memoryItem.name}`;
    document.getElementById("story-memory-copy").textContent = memoryItem.description;
  }
  dialogue.classList.remove("story-dialogue-frame");
  void dialogue.offsetWidth;
  dialogue.classList.add("story-dialogue-frame");
  const next = document.getElementById("story-next");
  next.textContent = storyPanelIndex === STORY_ARC_DATA.panel_count - 1
    ? (episode.wave >= state.max_waves ? "ENTER · SON SAYFAYI AÇ" : "ENTER · DÜKKÂNA GEÇ")
    : "ENTER · SONRAKİ KARE";

  // Trigger dialogue voice audio playback for current beat
  try {
    const epWaveStr = String(episode.wave).padStart(3, "0");
    const beatNum = storyPanelIndex + 1;
    const audioFile = "voice_" + state.selected_char + "_w" + epWaveStr + "_b" + beatNum + "_" + speakerId + ".mp3";
    sounds.playDialogueVoice("assets/audio/dialogue/" + state.selected_char + "/" + audioFile);
  } catch (_) {}
}

function showStoryIntermission(wave) {
  if (!STORY_ARC_DATA) return openShop();
  storyEpisodeIndex = STORY_ARC_DATA.episodes.findIndex(episode => episode.wave === wave);
  if (storyEpisodeIndex < 0) return openShop();
  storyWavePending = wave;
  storyPanelIndex = 0;
  document.getElementById("story-intermission").hidden = false;
  document.getElementById("story-skip").hidden = false;
  bgm.stop();
  renderStoryPanel();
}
function closeStoryIntermission() {
  if (storyPanelIndex < STORY_ARC_DATA.panel_count - 1) {
    storyPanelIndex += 1;
    renderStoryPanel();
    return;
  }
  finishStoryIntermission();
}
function skipStoryIntermission() {
  if (typeof sounds !== "undefined" && typeof sounds.stopDialogueVoice === "function") {
    sounds.stopDialogueVoice();
  }
  finishStoryIntermission();
}
function finishStoryIntermission() {
  if (typeof sounds !== "undefined" && typeof sounds.stopDialogueVoice === "function") {
    sounds.stopDialogueVoice();
  }
  grantStoryIntermissionReward();
  document.getElementById("story-intermission").hidden = true;
  if (storyWavePending >= state.max_waves) victoryScreen();
  else if (storyWavePending) openShop();
  storyWavePending = 0;
  storyEpisodeIndex = -1;
  storyPanelIndex = 0;
}
function grantStoryIntermissionReward() {
  if (!STORY_ARC_DATA || storyEpisodeIndex < 0 || storyWavePending <= 0) return;
  const episode = STORY_ARC_DATA.characters[state.selected_char]?.episodes?.[storyEpisodeIndex];
  const reward = episode?.boss_reward;
  if (!reward) return;
  if (reward.type === "relic" && reward.id && !state.artifacts_owned.includes(reward.id)) {
    state.artifacts_owned.push(reward.id);
    applyArtifact(reward);
    state.story_relics_found = [...(state.story_relics_found || []), reward.id];
  }
  const codexKey = "lexicon_story_codex_v1";
  let codex = [];
  try { codex = JSON.parse(localStorage.getItem(codexKey) || "[]"); } catch (_) { codex = []; }
  const recordId = `${state.selected_char}:${storyWavePending}`;
  if (!codex.some(record => record.id === recordId)) {
    codex.push({ id: recordId, character_id: state.selected_char, wave: storyWavePending, title: reward.name, text: reward.description, kind: reward.type });
    localStorage.setItem(codexKey, JSON.stringify(codex));
  }
  updateHUD();
}
document.getElementById("story-next")?.addEventListener("click", closeStoryIntermission);
document.getElementById("story-skip")?.addEventListener("click", skipStoryIntermission);

// =========================================
// 9. GADGET ACTIVATION LOGIC (5 GADGETS)
// =========================================
function activateActiveGadget() {
  if (state.gadget_timer > 0 || !state.is_wave_active) return;
  const gid = normalizeGadgetId(state.active_gadget_id);
  const gData = GADGETS_CATALOG[gid] || GADGETS_CATALOG["eraser_dash"];
  state.active_gadget_id = gid;
  state.gadget_timer = Math.max(1.5, gData.cooldown * state.gadget_cooldown_mult);
  sounds.gadget(gid);

  const p = state.player;

  if (gid === "eraser_dash") {
    let dx = 0, dy = 0;
    if (state.touch_dir && (state.touch_dir.x !== 0 || state.touch_dir.y !== 0)) {
      dx = state.touch_dir.x;
      dy = state.touch_dir.y;
    } else {
      if (keys["w"] || keys["arrowup"]) dy -= 1;
      if (keys["s"] || keys["arrowdown"]) dy += 1;
      if (keys["a"] || keys["arrowleft"]) dx -= 1;
      if (keys["d"] || keys["arrowright"]) dx += 1;
    }
    if (dx === 0 && dy === 0) dx = p.facing_left ? -1 : 1;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;

    p.is_dashing = true;
    p.dash_timer = 0.22;
    p.dash_dir = { x: dx, y: dy };
    p.dash_hit_ids = new Set();
    p.invuln_timer = gData.values?.invulnerability || 0.35;
    state.gadget_trails.push({ x: p.x, y: p.y, dx, dy, timer: gData.values?.trail_seconds || 1.4, tick: 0 });
    triggerHaptic("medium");
    triggerScreenShake(0.12, 3.5);

    const eraseDmg = (gData.values?.damage || 60) * state.damage_mult;
    state.enemies.forEach(e => {
      if (!p.dash_hit_ids.has(e) && Math.hypot(e.x - p.x, e.y - p.y) < 75) {
        p.dash_hit_ids.add(e);
        e.hp -= eraseDmg;
        e.vx = dx * 360; e.vy = dy * 360;
        addFloatingText(e.x, e.y - 12, `${Math.round(eraseDmg)}`, "#55efc4", 15);
      }
    });
  } else if (gid === "ink_cataclysm") {
    // Screen-wide ink bomb: delete all enemy projectiles, stun & deal AoE damage
    state.enemy_projectiles = [];
    state.particles.push({
      x: p.x, y: p.y, radius: 20, max_radius: gData.values?.radius || 420,
      alpha: 1.0, color: "rgba(147, 51, 234, "
    });
    state.enemies.forEach(e => {
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      if (dist < (gData.values?.radius || 420)) {
        e.hp -= (gData.values?.damage || 95) * state.damage_mult;
        const knock = (gData.values?.knockback || 220) / Math.max(1, dist);
        e.vx = (e.x - p.x) * knock; e.vy = (e.y - p.y) * knock;
        e.stun_timer = Math.max(e.stun_timer || 0, gData.values?.stun_seconds || 1.3);
      }
    });
  } else if (gid === "chrono_comma") {
    state.chrono_timer = gData.values?.duration || 3.5;
    state.particles.push({
      x: p.x, y: p.y, radius: 10, max_radius: 280,
      alpha: 0.9, color: "rgba(56, 189, 248, "
    });
  } else if (gid === "lexicon_aegis") {
    state.shield_charges = gData.values?.charges || 3;
    state.shield_timer = gData.values?.duration || 5;
    state.shield_counter_damage = gData.values?.counter_damage || 32;
    state.shield_counter_radius = gData.values?.counter_radius || 90;
    state.particles.push({
      x: p.x, y: p.y, radius: 10, max_radius: 80,
      alpha: 1.0, color: "rgba(56, 189, 248, "
    });
  } else if (gid === "grammar_magnet") {
    state.magnet_timer = gData.values?.duration || 2.6;
    state.particles.push({
      x: p.x, y: p.y, radius: 10, max_radius: 200,
      alpha: 1.0, color: "rgba(250, 204, 21, "
    });
  } else if (gid === "index_storm") {
    const count = gData.values?.cards || 3;
    state.gadget_cards = Array.from({ length: count }, (_, index) => ({
      angle: Math.PI * 2 * index / count, timer: gData.values?.duration || 2.8,
      tick: 0.12 * index, hitTargets: new Set(), damage: (gData.values?.damage || 26) * state.damage_mult
    }));
  } else if (gid === "redact_field") {
    const aim = Math.atan2(p.last_aim?.y || 0, p.last_aim?.x || (p.facing_left ? -1 : 1));
    const range = gData.values?.range || 260, halfAngle = gData.values?.half_angle || 0.72;
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      const dx = enemy.x - p.x, dy = enemy.y - p.y, distance = Math.hypot(dx, dy);
      if (distance > range || Math.cos(Math.atan2(dy, dx) - aim) < Math.cos(halfAngle)) continue;
      enemy.stun_timer = Math.max(enemy.stun_timer || 0, gData.values?.duration || 1.8);
      enemy.telegraph_timer = 0;
      enemy.slow_timer = Math.max(enemy.slow_timer || 0, gData.values?.duration || 1.8);
      enemy.slow_factor = gData.values?.slow_factor || 0.45;
    }
    state.particles.push({ x: p.x, y: p.y, radius: 25, max_radius: range, alpha: 0.7, color: "rgba(207, 80, 105, " });
  } else if (gid === "palimpsest_step") {
    const angle = Math.atan2(p.last_aim?.y || 0, p.last_aim?.x || (p.facing_left ? -1 : 1));
    const oldX = p.x, oldY = p.y, distance = gData.values?.blink_distance || 130;
    p.x += Math.cos(angle) * distance; p.y += Math.sin(angle) * distance;
    clampPlayerToArena(p);
    state.gadget_decoys.push({ x: oldX, y: oldY, timer: gData.values?.decoy_seconds || 1.5, hp: 1 });
    p.invuln_timer = Math.max(p.invuln_timer, 0.35);
  }
}

function updateGadgetEffects(dt) {
  if (state.shield_timer > 0) {
    state.shield_timer = Math.max(0, state.shield_timer - dt);
    if (state.shield_timer === 0) state.shield_charges = 0;
  }
  state.magnet_timer = Math.max(0, state.magnet_timer - dt);
  for (let i = 0; i < state.gadget_trails.length; i++) {
    const trail = state.gadget_trails[i];
    trail.timer -= dt;
    trail.tick -= dt;
    trail.x += trail.dx * 24 * dt;
    trail.y += trail.dy * 24 * dt;
    if (trail.tick <= 0 && trail.timer > 0) {
      trail.tick = 0.32;
      const x = trail.x + trail.dx * 48, y = trail.y + trail.dy * 48;
      for (const enemy of state.enemies) {
        if (!enemy.dead && Math.hypot(enemy.x - x, enemy.y - y) < 48) {
          const damage = 18 * state.damage_mult;
          enemy.hp -= damage;
          applyHitFeedback(enemy, { x: trail.dx, y: trail.dy }, "slash", false, false, 45);
          addFloatingText(enemy.x, enemy.y - 10, `${Math.round(damage)}`, "#7bf0d1", 12);
        }
      }
    }
  }
  fastCompact(state.gadget_trails, trail => trail.timer > 0);

  for (let i = 0; i < state.gadget_cards.length; i++) {
    const card = state.gadget_cards[i];
    card.timer -= dt; card.tick -= dt; card.angle += dt * 4.6;
    if (card.tick <= 0 && card.hitTargets.size < (GADGETS_CATALOG.index_storm.values?.target_cap || 3)) {
      card.tick = 0.62;
      const target = selectWeaponTarget({ id: "quill_blaster" }, state.enemies, state.player, enemy => card.hitTargets.has(enemy));
      if (target) {
        card.hitTargets.add(target);
        target.hp -= card.damage;
        const angle = Math.atan2(target.y - state.player.y, target.x - state.player.x);
        applyHitFeedback(target, { x: Math.cos(angle), y: Math.sin(angle) }, "piercing", false, false, 95);
        addFloatingText(target.x, target.y - 12, `${Math.round(card.damage)}`, "#e8d27d", 13);
      }
    }
  }
  fastCompact(state.gadget_cards, card => card.timer > 0);

  for (let i = 0; i < state.gadget_decoys.length; i++) {
    state.gadget_decoys[i].timer -= dt;
  }
  fastCompact(state.gadget_decoys, decoy => decoy.timer > 0);
}

// =========================================
// 10. SIMULTANEOUS WEAPONS FIRING & PLAYER LOGIC
// =========================================
function requestAttackPose(weaponId, actionKind, aim) {
  const p = state.player;
  if (aim && Math.hypot(aim.x, aim.y) > 0.01) {
    const aimLength = Math.hypot(aim.x, aim.y);
    p.last_aim = { x: aim.x / aimLength, y: aim.y / aimLength };
    p.facing_left = getHorizontalFacing(Math.atan2(aim.y, aim.x), p.facing_left);
  }
  if (actionKind === "ranged") {
    p.attack_anim_kind = "ranged";
    const visual = getWeaponVisual(weaponId);
    p.shot_recoil_direction = p.last_aim || { x: 1, y: 0 };
    p.shot_recoil_pixels = Math.max(2, Math.min(6.5, (visual?.recoil_px || 3.5) * 0.72));
    p.shot_recoil_duration = 0.14;
    p.shot_recoil_timer = p.shot_recoil_duration;
	// Show a brief ready/release/settle pose on impact; heavy weapons visibly brace longer.
	const poseDuration = ["crossword_crossbow", "grammar_sniper", "thesaurus_rocket"].includes(weaponId) ? 0.30
	  : ["syllable_shotgun", "lexicon_beam", "rune_orb"].includes(weaponId) ? 0.24 : 0.20;
	p.attack_anim_windup = poseDuration * 0.36;
	p.attack_anim_active = poseDuration * 0.18;
	p.attack_anim_duration = poseDuration;
	p.attack_anim_timer = poseDuration;
    return;
  }
  if (!["melee", "cast", "heavy"].includes(actionKind)) return;
  p.attack_anim_kind = actionKind;
  const rhythm = getWeaponArchetype(weaponId)?.rhythm || MELEE_TIMINGS[weaponId] || {};
  p.attack_anim_windup = Math.max(0, Number(rhythm.windup) || 0);
  p.attack_anim_active = Math.max(0, Number(rhythm.active) || 0.08);
  const recoveryCap = actionKind === "heavy" ? 0.30 : actionKind === "melee" ? 0.18 : 0.22;
  p.attack_anim_duration = Math.max(0.16, p.attack_anim_windup + p.attack_anim_active + Math.min(Math.max(0, Number(rhythm.recovery) || 0.12), recoveryCap));
  p.attack_anim_timer = p.attack_anim_duration;
}

function updatePlayer(dt) {
  const p = state.player;

  if (state.gadget_timer > 0) state.gadget_timer -= dt;
  if (state.chrono_timer > 0) state.chrono_timer -= dt;
  if (p.invuln_timer > 0) p.invuln_timer -= dt;
  if (p.slow_timer > 0) p.slow_timer -= dt;
  if (p.attack_anim_timer > 0) p.attack_anim_timer = Math.max(0, p.attack_anim_timer - dt);
  if (p.shot_recoil_timer > 0) p.shot_recoil_timer = Math.max(0, p.shot_recoil_timer - dt);

  const effectiveSpeed = p.slow_timer > 0 ? state.move_speed * 0.72 : state.move_speed;

  if (p.is_dashing) {
    p.dash_timer -= dt;
    const dashSpd = effectiveSpeed * 3.0 + 280;
    p.x += p.dash_dir.x * dashSpd * dt;
    p.y += p.dash_dir.y * dashSpd * dt;
    p.run_phase += dashSpd * dt / 17;

    const eraseDmg = 65.0 * state.damage_mult;
    state.enemies.forEach(e => {
      if (!p.dash_hit_ids.has(e) && Math.hypot(e.x - p.x, e.y - p.y) < 65) {
        p.dash_hit_ids.add(e);
        e.hp -= eraseDmg;
        e.vx = p.dash_dir.x * 320;
        e.vy = p.dash_dir.y * 320;
        addFloatingText(e.x, e.y - 12, `${Math.round(eraseDmg)}`, "#55efc4", 15);
      }
    });
    if (p.dash_timer <= 0) p.is_dashing = false;
  } else {
    let dx = 0, dy = 0;
    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;

    // Mobile Virtual Touch Joystick integration
    if (state.touch_dir && (state.touch_dir.x !== 0 || state.touch_dir.y !== 0)) {
      dx = state.touch_dir.x;
      dy = state.touch_dir.y;
    } else if (dx !== 0 && dy !== 0) {
      dx *= 0.7071; dy *= 0.7071;
    }

    const desiredVx = dx * effectiveSpeed;
    const desiredVy = dy * effectiveSpeed;
    const response = dx !== 0 || dy !== 0 ? 1050 : 900;
    const deltaVx = desiredVx - p.vx;
    const deltaVy = desiredVy - p.vy;
    const maxDelta = response * dt;
    const deltaLength = Math.hypot(deltaVx, deltaVy);
    const scale = deltaLength > maxDelta && deltaLength > 0 ? maxDelta / deltaLength : 1;
    p.vx += deltaVx * scale;
    p.vy += deltaVy * scale;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > effectiveSpeed && effectiveSpeed > 0) {
      p.vx = p.vx / speed * effectiveSpeed;
      p.vy = p.vy / speed * effectiveSpeed;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (speed > 24) p.run_phase += speed * dt / 17;

    if (dx !== 0) p.facing_left = dx < 0;
    if (dx !== 0 || dy !== 0) p.last_aim = { x: dx, y: dy };
  }

  clampPlayerToArena(p);

  // Ink drops
  state.ink_drops.forEach(drop => {
    const dist = Math.hypot(drop.x - p.x, drop.y - p.y);
    const pullRadius = state.magnet_timer > 0 ? (GADGETS_CATALOG.grammar_magnet.values?.radius || 1200) : state.pickup_radius;
    if (dist < pullRadius) {
      const pull = (state.magnet_timer > 0 ? (GADGETS_CATALOG.grammar_magnet.values?.pull_speed || 520) : (380 + (state.pickup_radius - dist) * 2.5)) * dt;
      drop.x += ((p.x - drop.x) / dist) * pull;
      drop.y += ((p.y - drop.y) / dist) * pull;
      if (dist < 24) {
        drop.collected = true;
        sounds.pickup();
        const earned = Math.ceil(drop.value * state.ink_mult);
        state.ink_count += earned;
        addFloatingText(p.x + (Math.random() - 0.5) * 20, p.y - 20, `+${earned}`, "#a9c6b6", 12);
      }
    }
  });
  fastCompact(state.ink_drops, d => !d.collected);

  // Health Drops / Şifa Parşömeni (+18 HP)
  state.health_drops.forEach(drop => {
    const dist = Math.hypot(drop.x - p.x, drop.y - p.y);
    const pullRadius = state.magnet_timer > 0 ? (GADGETS_CATALOG.grammar_magnet.values?.radius || 1200) : state.pickup_radius;
    if (dist < pullRadius) {
      const pull = (state.magnet_timer > 0 ? (GADGETS_CATALOG.grammar_magnet.values?.pull_speed || 520) : (380 + (state.pickup_radius - dist) * 2.5)) * dt;
      drop.x += ((p.x - drop.x) / dist) * pull;
      drop.y += ((p.y - drop.y) / dist) * pull;
      if (dist < 26) {
        drop.collected = true;
        sounds.pickup();
        const threadActive = state.artifacts_owned.includes("mnemonic_thread") && !state.mnemonic_used_this_wave;
        const threadValues = ARTIFACTS_CATALOG.mnemonic_thread.values || {};
        const healing = Math.round((drop.value + (threadActive ? (threadValues.heal_bonus || 14) : 0)) * (state.selected_char === "lexicon_alchemist" ? 1.5 : 1.0));
        state.hp = Math.min(state.max_hp, state.hp + healing);
        if (threadActive) {
          state.mnemonic_used_this_wave = true;
          state.shield_charges = Math.max(state.shield_charges, 1);
          state.shield_timer = Math.max(state.shield_timer, threadValues.shield_seconds || 0.65);
        }
        addFloatingText(p.x, p.y - 25, `+${healing} HP`, "#4ade80", 14);
        triggerHaptic("light");
        state.particles.push({
          x: p.x, y: p.y, radius: 10, max_radius: 50,
          alpha: 1.0, color: "rgba(34, 197, 94, "
        });
      }
    }
  });
  fastCompact(state.health_drops, d => !d.collected);

  // Floating Combat Damage Numbers update
  if (state.floating_texts && state.floating_texts.length) {
    for (let i = 0; i < state.floating_texts.length; i++) {
      const ft = state.floating_texts[i];
      ft.y += ft.vy * dt;
      ft.lifetime -= dt;
    }
    fastCompact(state.floating_texts, ft => ft.lifetime > 0);
  }

  // Screen shake decay
  if (state.screen_shake > 0) {
    state.screen_shake -= dt;
    if (state.screen_shake <= 0) state.shake_intensity = 0;
  }

  // Ink puddles slow
  state.ink_puddles.forEach(puddle => {
    puddle.lifetime -= dt;
    if (Math.hypot(puddle.x - p.x, puddle.y - p.y) < puddle.radius) {
      p.slow_timer = 1.0;
    }
  });
  fastCompact(state.ink_puddles, puddle => puddle.lifetime > 0);

  // ALL SLOTTED WEAPONS FIRE SIMULTANEOUSLY (Brotato Mechanic!)
  state.weapons.forEach((w, idx) => {
    resolveWeaponSignature(w);
    advanceWeaponChannels(w, dt);
    w.shoot_timer -= dt;
    w.recoil = Math.max(0, (w.recoil || 0) - dt * 8.5);
    w.flash_timer = Math.max(0, (w.flash_timer || 0) - dt);
    if (w.swing_timer > 0) {
      const previousElapsed = w.swing_elapsed || 0;
      w.swing_elapsed = previousElapsed + dt;
      const swingTiming = getMeleeTiming(w.id);
      w.swing_timer = Math.max(0, w.swing_timer - dt);
      if (!w.swing_hit && previousElapsed < swingTiming.arcPeakTime && w.swing_elapsed >= swingTiming.arcPeakTime) {
        w.swing_hit = true;
        resolveMeleeWeaponHit(w);
      }
    }

    const nearest = selectWeaponTarget(w, state.enemies, p);
    const minDist = nearest ? Math.hypot(nearest.x - p.x, nearest.y - p.y) : Infinity;

    if (nearest) {
      w.rotation = Math.atan2(nearest.y - p.y, nearest.x - p.x);
    }

    let effectiveAtkSpd = Math.max(0.1, state.attack_speed_mult);
    if (state.chrono_timer > 0) effectiveAtkSpd *= GADGETS_CATALOG.chrono_comma.values?.player_attack_speed_factor || 1.2;
    if (idx === state.active_weapon_index) effectiveAtkSpd *= 1.25;

    const tierCdMult = w.tier_data.cooldown || 1.0;
    const effectiveCd = Math.max(0.06, (w.data.cooldown * tierCdMult) / effectiveAtkSpd);

    if (w.shoot_timer <= 0 && !(w.id === "ink_flamethrower" && w.flame_phase === "vent")
      && !(w.id === "lexicon_beam" && w.beam_ticks_pending > 0)) {
      w.shoot_timer = effectiveCd;

      if (w.id === "dictionary_blade") {
        if (minDist > (getWeaponArchetype(w.id)?.limits?.radius || 132) + 18) return;
        sounds.shoot("dictionary_blade");
        w.recoil = 0.8;
        w.flash_timer = 0.055;
        w.swing_timer = getMeleeTiming(w.id).total;
        w.swing_elapsed = 0;
        w.parry_window = 0;
        w.swing_hit = false;
        w.hitTargets = new Set();
        requestAttackPose(w.id, "melee", { x: Math.cos(w.rotation), y: Math.sin(w.rotation) });
      } else if (w.id === "calligraphy_katana") {
        if (minDist > (getWeaponArchetype(w.id)?.limits?.range || 178) + 40) return;
        sounds.shoot("calligraphy_katana");
        w.recoil = 0.8;
        w.flash_timer = 0.055;
        const slashDmg = w.data.damage * (w.tier_data.damage || 1.0) * state.damage_mult;
        w.swing_timer = getMeleeTiming(w.id).total;
        w.swing_elapsed = 0;
        w.swing_hit = false;
        w.hitTargets = new Set();
        requestAttackPose(w.id, "melee", { x: Math.cos(w.rotation), y: Math.sin(w.rotation) });
        // Crescent ink wave projectile forward
        if (nearest) {
          const dirX = Math.cos(w.rotation); const dirY = Math.sin(w.rotation);
          const muzzle = weaponMuzzleWorld(w, idx);
          spawnProjectile({
            type: "katana_wave", x: muzzle.x, y: muzzle.y, dx: dirX, dy: dirY,
            dmg: slashDmg * 0.8, pierce: 3, spd: 540, color: "#38bdf8", size: 28,
            weapon_id: w.id, impact_profile: getWeaponVisual(w.id)?.impact || "slash",
            tier: w.tier, sharedHitTargets: w.hitTargets
          });
          if (w.tier >= 2) {
            const crossAngle = w.tier >= 3 ? 0.23 : 0.14;
            spawnProjectile({ type: "katana_wave", x: muzzle.x, y: muzzle.y,
              dx: Math.cos(w.rotation + crossAngle), dy: Math.sin(w.rotation + crossAngle),
              dmg: slashDmg * 0.42, pierce: 2, spd: 520, color: "#a5f3fc", size: 22,
              weapon_id: w.id, impact_profile: "slash", tier: w.tier, sharedHitTargets: w.hitTargets });
          }
        }
      } else if (w.id === "scroll_turret") {
        // Place a focused, capped turret near the player.
        if (canPlaceTurret(w.id, state.turrets.length, w.tier)) {
          requestAttackPose(w.id, "cast", { x: Math.cos(w.rotation), y: Math.sin(w.rotation) });
          const turretLimit = getWeaponArchetype(w.id)?.limits || {};
          state.turrets.push({
            x: p.x + (Math.random() - 0.5) * 60,
            y: p.y + (Math.random() - 0.5) * 60,
            lifetime: (turretLimit.turret_seconds || 12.0) * (w.tier >= 2 ? 1.18 : 1),
            shoot_timer: 0.35,
            fire_seconds: turretLimit.fire_seconds || 0.82,
            damage: w.data.damage * (w.tier_data.damage || 1.0),
            synchronized_focus: w.tier >= 4
          });
        }
      } else if (w.id === "word_loom") {
        placeWordLoomField(w, nearest);
      } else if (w.id === "punctuation_bomb") {
        dropPunctuationMine(w, nearest, idx);
      } else if (nearest) {
        shootWeapon(w, nearest, idx);
      }
    }
  });

  updateTurrets(dt);
  updateWeaponFields(dt);

  updatePunctuationMines(dt);
  updateProjectiles(dt);
  updateHitEffects(dt);
}

function updateTurrets(dt) {
  const synchronizedTarget = state.turrets.some(turret => turret.synchronized_focus)
    ? selectWeaponTarget({ id: "scroll_turret" }, state.enemies, state.player) : null;
  state.turrets.forEach(turret => {
    turret.lifetime -= dt;
    turret.shoot_timer -= dt;
    if (turret.shoot_timer > 0) return;
    turret.shoot_timer = turret.fire_seconds || getWeaponArchetype("scroll_turret")?.limits?.fire_seconds || 0.82;
    let target = synchronizedTarget;
    let minDistance = target ? Math.hypot(target.x - turret.x, target.y - turret.y) : 500;
    if (!target) {
      state.enemies.forEach(enemy => {
        const distance = Math.hypot(enemy.x - turret.x, enemy.y - turret.y);
        if (!enemy.dead && distance < minDistance) { minDistance = distance; target = enemy; }
      });
    }
    if (!target || minDistance <= 0.001) return;
    sounds.shoot("scroll_turret");
    const dirX = (target.x - turret.x) / minDistance;
    const dirY = (target.y - turret.y) / minDistance;
    spawnProjectile({
      type: "turret_bolt", x: turret.x, y: turret.y, dx: dirX, dy: dirY,
      dmg: turret.damage * state.damage_mult, pierce: 1, spd: 620, color: "#00e5ff", size: 16,
      weapon_id: "scroll_turret", impact_profile: "gold"
    });
  });
  fastCompact(state.turrets, turret => turret.lifetime > 0);
}

function updateWeaponFields(dt) {
  state.weapon_fields.forEach(field => {
    field.lifetime -= dt;
    field.tick_timer -= dt;
    if (field.tick_timer > 0) return;
    field.tick_timer = field.tick_seconds || 0.5;
    const radiusSq = field.radius * field.radius;
    state.enemies.forEach(enemy => {
      const dx = enemy.x - field.x, dy = enemy.y - field.y;
      if (!enemy.dead && dx * dx + dy * dy <= radiusSq) {
        enemy.hp -= field.damage;
        applyHitFeedback(enemy, { x: enemy.x - field.x, y: enemy.y - field.y }, field.impact || "heavy", false, true, 80);
        if (field.weapon_id === "word_loom") {
          enemy.slow_timer = Math.max(enemy.slow_timer || 0, field.slow_seconds || 0.6);
          enemy.slow_factor = Math.min(enemy.slow_factor || 1, field.slow_factor || 0.46);
          if (field.mark_targets && field.tier >= 3) enemy.quill_mark_timer = Math.max(enemy.quill_mark_timer || 0, 1.8);
        }
      }
    });
  });
  fastCompact(state.weapon_fields, field => field.lifetime > 0);
}

function placeWordLoomField(weapon, target) {
  if (!target) return;
  const limits = getWeaponArchetype(weapon.id)?.limits || {};
  const cap = limits.field_cap || 3;
  const current = state.weapon_fields.filter(field => field.weapon_id === "word_loom");
  const reservedSlots = weapon.tier >= 4 ? 2 : 1;
  while (current.length > cap - reservedSlots) {
    const oldest = current.shift();
    state.weapon_fields = state.weapon_fields.filter(field => field !== oldest);
  }
  state.weapon_fields.push({
    x: target.x, y: target.y,
    radius: (limits.radius || 108) * (weapon.tier >= 2 ? 1.2 : 1) * (weapon.tier >= 4 ? 1.25 : 1),
    lifetime: limits.lifetime || 2.8, tick_timer: 0, tick_seconds: limits.tick_seconds || 0.35,
    damage: weapon.data.damage * (weapon.tier_data.damage || 1) * state.damage_mult * 0.24,
    impact: "rune", weapon_id: "word_loom", slow_factor: limits.slow_factor || 0.46,
    slow_seconds: limits.slow_seconds || 0.6, mark_targets: weapon.tier >= 3, tier: weapon.tier
  });
  if (weapon.tier >= 4 && state.weapon_fields.filter(field => field.weapon_id === "word_loom").length < cap) {
    const linked = state.enemies.filter(enemy => enemy !== target && !enemy.dead)
      .map(enemy => ({ enemy, distance: Math.hypot(enemy.x - target.x, enemy.y - target.y) }))
      .filter(row => row.distance <= 260).sort((a, b) => a.distance - b.distance)[0]?.enemy;
    if (linked) {
      const primary = state.weapon_fields[state.weapon_fields.length - 1];
      state.weapon_fields.push({ ...primary, x: linked.x, y: linked.y, radius: primary.radius * 0.82,
        damage: primary.damage * 0.75, tick_timer: 0.05 });
    }
  }
  sounds.shoot("rune_orb");
  requestAttackPose(weapon.id, "cast", { x: target.x - state.player.x, y: target.y - state.player.y });
}

function dropPunctuationMine(w, target, weaponIndex = state.weapons.indexOf(w)) {
  sounds.shoot("punctuation_bomb");
  w.recoil = 0.75;
  w.flash_timer = 0.05;
  requestAttackPose(w.id, "cast", target ? { x: target.x - state.player.x, y: target.y - state.player.y } : { x: 1, y: 0 });
  const p = state.player;
  const muzzle = weaponMuzzleWorld(w, weaponIndex);
  let offX = (Math.random() - 0.5) * 60;
  let offY = (Math.random() - 0.5) * 60;
  if (target) {
    const ang = Math.atan2(target.y - p.y, target.x - p.x);
    offX = Math.cos(ang) * 50;
    offY = Math.sin(ang) * 50;
  }
  const isCrit = Math.random() < state.crit_chance;
  const limits = getWeaponArchetype(w.id)?.limits || {};
  const mineCap = limits.mine_cap || 3;
  if (state.punctuation_mines.length >= mineCap) state.punctuation_mines.shift();
  const mine = {
    x: muzzle.x + offX, y: muzzle.y + offY,
    damage: w.data.damage * (w.tier_data.damage || 1.0) * state.damage_mult * (isCrit ? 2.0 : 1.0),
    blast_radius: (limits.blast_radius || 125) * (w.tier >= 2 ? 1.18 : 1),
    fuse_seconds: Math.max(0.55, (limits.fuse_seconds || 1.05) - (w.tier >= 2 ? 0.18 : 0)),
    fuse_elapsed: 0,
    hazard_seconds: limits.hazard_seconds || 2.2,
    lifetime: 8.0, pulse: 0, pulse_duration: 0.13,
    tier: w.tier, impact_profile: getWeaponVisual(w.id)?.impact || "heavy"
  };
  state.punctuation_mines.push(mine);
  if (w.tier >= 3 && state.punctuation_mines.length < mineCap) {
    state.punctuation_mines.push({ ...mine, x: mine.x - offY * 0.7, y: mine.y + offX * 0.7,
      fuse_elapsed: 0, pulse: 0, damage: mine.damage * 0.65 });
  }
}

function updatePunctuationMines(dt) {
  state.punctuation_mines.forEach(mine => {
    mine.pulse += dt * 5;
    if (mine.detonated) {
      mine.hazard_seconds -= dt;
      return;
    }
    mine.fuse_elapsed += dt;
    let proximityTrigger = false;
    if (mine.fuse_elapsed >= 0.35) {
      for (const e of state.enemies) {
        if (!e.dead && Math.hypot(e.x - mine.x, e.y - mine.y) < 36) { proximityTrigger = true; break; }
      }
    }
    const trigger = proximityTrigger || mine.fuse_elapsed >= mine.fuse_seconds;
    if (trigger && !mine.detonated) {
      mine.detonated = true;
      sounds.detonateMine();
      state.particles.push({
        x: mine.x, y: mine.y, radius: 12, max_radius: mine.blast_radius,
        alpha: 1.0, color: "rgba(255, 120, 20, "
      });
      state.enemies.forEach(e => {
        const d = Math.hypot(e.x - mine.x, e.y - mine.y);
        if (d <= mine.blast_radius) {
          const falloff = 1.0 - (d / mine.blast_radius) * 0.35;
          e.hp -= mine.damage * falloff;
          const ang = Math.atan2(e.y - mine.y, e.x - mine.x);
          applyHitFeedback(e, { x: Math.cos(ang), y: Math.sin(ang) }, mine.impact_profile || "heavy", false, true, 320);
        }
      });
      if (mine.tier >= 4) addWeaponField({
        x: mine.x, y: mine.y, radius: mine.blast_radius * 0.65,
        lifetime: 2.4, tick_timer: 0, tick_seconds: 0.6,
        damage: mine.damage * 0.22, impact: "heavy"
      });
    }
  });
  fastCompact(state.punctuation_mines, m => !m.detonated || m.hazard_seconds > 0);
}

function weaponPistolFireNow(weapon) {
  const shot = weapon.pistol_queue?.shift();
  if (shot) spawnProjectile({ ...shot, weapon_id: weapon.id, impact_profile: "gold" });
}

// =========================================
// 11. PROJECTILES & AREA WEAPONS
// =========================================
function shootWeapon(w, target, weaponIndex = state.weapons.indexOf(w)) {
  const visual = getWeaponVisual(w.id);
  const recoilScale = (visual?.recoil_px || 3.5) / 4.8;
  w.recoil = recoilScale;
  w.flash_timer = 0.065;
  const actionKind = ["thesaurus_rocket", "grammar_sniper", "crossword_crossbow"].includes(w.id) ? "heavy"
    : ["rune_orb", "scroll_turret"].includes(w.id) ? "cast"
    : w.id === "calligraphy_katana" ? "melee" : "ranged";
  requestAttackPose(w.id, actionKind, { x: target.x - state.player.x, y: target.y - state.player.y });
  const p = state.player;
  const isCrit = Math.random() < (state.crit_chance + (w.tier_data.crit || 0));
  const critMult = isCrit ? 2.0 : 1.0;
  const tierDmg = w.tier_data.damage || 1.0;
  const baseDmg = w.data.damage * tierDmg * state.damage_mult * critMult;
  const extraPrc = w.tier_data.pierce || 0;
  const extraProj = w.tier_data.projectile || 0;
  const dirX = Math.cos(w.rotation);
  const dirY = Math.sin(w.rotation);
  const muzzle = weaponMuzzleWorld(w, weaponIndex);
  const impactProfile = visual?.impact || "ink";
  const spawnShot = (projectile) => spawnProjectile({
    ...projectile, weapon_id: w.id, impact_profile: impactProfile, tier: w.tier,
    evolution: w.evolution || getWeaponEvolution(w.id, w.tier)
  });

  sounds.shoot(w.id);

  switch (w.id) {
    case "quill_blaster": {
      const count = state.projectile_count + extraProj;
      if (count === 1) {
        spawnShot({
          type: "quill", x: muzzle.x, y: muzzle.y, dx: dirX, dy: dirY,
          dmg: baseDmg, pierce: state.pierce_count + extraPrc, spd: 590,
          color: "#fff8e7", crit: isCrit, sprite: "ink_bullet.png", size: 18
        });
      } else {
        const spread = 0.22;
        const start = -((count - 1) * spread) / 2;
        for (let i = 0; i < count; i++) {
          const ang = w.rotation + start + i * spread;
          spawnShot({
            type: "quill", x: muzzle.x, y: muzzle.y, dx: Math.cos(ang), dy: Math.sin(ang),
            dmg: baseDmg, pierce: state.pierce_count + extraPrc, spd: 590,
            color: "#fff8e7", crit: isCrit, sprite: "ink_bullet.png", size: 18
          });
        }
      }
      break;
    }
    case "syllable_shotgun": {
      const archetype = getWeaponArchetype(w.id);
      const pellets = (archetype?.limits?.pellets || 5) + (state.projectile_count - 1 + extraProj) * 2 + (w.tier >= 2 ? 2 : 0);
      const fan = getShotgunFanAngles(w.id, pellets, w.tier);
      for (let i = 0; i < pellets; i++) {
        const spread = fan[i];
        const spd = 480 + Math.random() * 150;
        spawnShot({
          type: "pellet", x: muzzle.x, y: muzzle.y, dx: Math.cos(w.rotation + spread), dy: Math.sin(w.rotation + spread),
          dmg: baseDmg * (w.tier >= 3 && Math.abs(spread) < 0.08 ? 1.15 : 0.85), pierce: 1 + extraPrc, spd: spd,
          color: "#ffa726", crit: isCrit, sprite: "bullet_flame.png", size: 16
        });
      }
      if (w.tier >= 4 && Math.hypot(target.x - p.x, target.y - p.y) <= (archetype?.limits?.stagger_range || 112)) {
        spawnShot({ type: "punctuation_bomb", x: target.x, y: target.y, dx: 0, dy: 0,
          dmg: baseDmg * 0.65, pierce: 1, spd: 0, size: 38, lifetime: 0.12, color: "#ffc857", crit: isCrit });
      }
      break;
    }
    case "lexicon_beam": {
      const rhythm = getWeaponArchetype(w.id).rhythm;
      const limits = getWeaponArchetype(w.id).limits;
      const active = rhythm.active + (w.tier >= 2 ? 0.18 : 0);
      const ticks = Math.max(1, Math.floor(active / limits.tick_seconds));
      w.beam_ticks_pending = ticks;
      w.beam_tick_timer = rhythm.windup;
      w.beam_charge_remaining = rhythm.windup;
      w.beam_tick_damage = baseDmg * 1.1 / ticks;
      w.beam_crit = isCrit;
      w.beam_split_pending = false;
      break;
    }
    case "crossword_crossbow": {
      spawnShot({
        type: "crossword_bolt", x: muzzle.x, y: muzzle.y, dx: dirX, dy: dirY,
        dmg: baseDmg, pierce: (w.tier >= 2 ? 3 : 1) + extraPrc, spd: 630,
        color: "#d4af37", crit: isCrit, sprite: "bullet_bolt.png", size: 24, tier: w.tier
      });
      break;
    }
    case "hyphen_boomerang": {
      spawnShot({
        type: "boomerang", x: muzzle.x, y: muzzle.y, dx: dirX, dy: dirY,
        dmg: baseDmg, pierce: 999, spd: 530,
        color: "#ff7043", crit: isCrit, sprite: "bullet_boomerang.png", size: 24,
        origin_x: muzzle.x, origin_y: muzzle.y, time_alive: 0, tier: w.tier
      });
      break;
    }
    case "ink_flamethrower": {
      const spread = (Math.random() - 0.5) * (getWeaponArchetype(w.id)?.limits?.cone_radians || 0.48) * (w.tier >= 2 ? 1.4 : 1);
      spawnShot({
        type: "flame", x: muzzle.x, y: muzzle.y,
        dx: Math.cos(w.rotation + spread), dy: Math.sin(w.rotation + spread),
        dmg: baseDmg, pierce: 3 + extraPrc, spd: 370 + Math.random() * 80,
        color: "#ff5722", crit: isCrit, sprite: "bullet_flame.png", size: 18, lifetime: 0.65, tier: w.tier
      });
      break;
    }
    case "thesaurus_rocket": {
      const limits = getWeaponArchetype(w.id)?.limits || {};
      spawnShot({
        type: "rocket", x: muzzle.x, y: muzzle.y, dx: dirX, dy: dirY,
        dmg: baseDmg, pierce: 1, spd: 430,
        color: "#ab47bc", crit: isCrit, sprite: "bullet_rocket.png", size: 26,
        target, homing_strength: limits.homing_strength || 0.55, tier: w.tier
      });
      break;
    }
    case "quote_pistols": {
      const burstCount = w.tier >= 3 ? 3 : 2;
      w.pistol_queue = [];
      for (let i = 0; i < burstCount; i++) {
        const side = getNextPistolSide(w) * 12;
        w.pistol_queue.push({ type: "quote", x: muzzle.x - dirY * side, y: muzzle.y + dirX * side, dx: dirX, dy: dirY,
          dmg: baseDmg * (w.tier >= 3 ? 0.35 : 0.525), pierce: state.pierce_count + extraPrc, spd: 650,
          color: "#ffd54f", crit: isCrit, sprite: "bullet_bolt.png", size: 16, tier: w.tier });
      }
      weaponPistolFireNow(w);
      w.pistol_queue_timer = getWeaponArchetype(w.id)?.limits?.shot_gap || 0.10;
      break;
    }
    case "rune_orb": {
      spawnShot({
        type: "bouncing_orb", x: muzzle.x, y: muzzle.y, dx: dirX, dy: dirY,
        dmg: baseDmg, pierce: 4 + extraPrc, spd: 510,
        color: "#f472b6", crit: isCrit, sprite: "rune_orb.png", size: 20, tier: w.tier
      });
      break;
    }
    case "grammar_sniper": {
      spawnShot({
        type: "rail_slug", x: muzzle.x, y: muzzle.y, dx: dirX, dy: dirY,
        dmg: baseDmg * 1.35, pierce: w.tier >= 3 ? 999 : 12 + extraPrc, spd: 1100,
        color: "#00f0ff", crit: isCrit, size: 28, tier: w.tier
      });
      break;
    }
  }
}

function resolveMeleeWeaponHit(w, enemies = state.enemies) {
  const p = state.player;
  const limits = getWeaponArchetype(w.id)?.limits || {};
  let deflectedShots = 0;
  if (w.id === "dictionary_blade") {
    w.parry_window = limits.parry_window || 0.14;
    const guardRadius = limits.parry_radius || limits.radius || 132;
    state.enemy_projectiles.forEach(ep => {
      if (!ep.dead && Math.hypot(ep.x - p.x, ep.y - p.y) <= guardRadius) {
        ep.dead = true;
        deflectedShots++;
      }
    });
    if (deflectedShots) state.particles.push({ x: p.x, y: p.y, radius: 16, alpha: 0.9, color: "rgba(235, 202, 125, " });
    if (deflectedShots && w.tier >= 3) {
      const target = selectWeaponTarget(w, enemies, p);
      if (target) {
        const angle = Math.atan2(target.y - p.y, target.x - p.x);
        spawnProjectile({ type: "guard_counter", x: p.x, y: p.y, dx: Math.cos(angle), dy: Math.sin(angle),
          dmg: w.data.damage * (w.tier_data.damage || 1) * state.damage_mult * 0.65,
          pierce: 1, spd: 760, size: 16, lifetime: 1.3, weapon_id: w.id, impact_profile: "gold", tier: w.tier });
      }
    }
  }
  const range = w.id === "calligraphy_katana" ? (limits.range || 178) : (limits.radius || 132);
  const force = w.id === "calligraphy_katana" ? 300 : 260;
  const damage = w.data.damage * (w.tier_data.damage || 1.0) * state.damage_mult;
  const forwardX = Math.cos(w.rotation);
  const forwardY = Math.sin(w.rotation);
  if (!w.hitTargets) w.hitTargets = new Set();
  let hitCount = 0;
  enemies.forEach(e => {
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const distance = Math.hypot(dx, dy);
    const arc = limits.arc_radians || 1.15;
    const facingDot = (dx / distance) * forwardX + (dy / distance) * forwardY;
    const outsideArc = w.id === "calligraphy_katana" && facingDot < (w.tier >= 4 ? -0.1 : Math.cos(arc / 2));
    if (e.dead || w.hitTargets.has(e) || distance > range || distance < 0.001 || outsideArc) return;
    w.hitTargets.add(e);
    const marked = (e.quill_mark_timer || 0) > 0;
    const multiplier = w.id === "calligraphy_katana" && w.tier >= 4 && marked ? 1.6 : 1;
    const hitDamage = applyUtilityRelicHit(e, damage * multiplier);
    e.hp -= hitDamage;
    const direction = { x: dx / distance, y: dy / distance };
    applyHitFeedback(e, direction, getWeaponVisual(w.id)?.impact || "slash", false, false, force);
    if (w.id === "dictionary_blade" && ((w.parry_window || 0) > 0 || w.tier >= 4)) e.stun_timer = Math.max(e.stun_timer || 0, w.tier >= 4 ? 0.35 : 0.28);
    addFloatingText(e.x, e.y - 14, `${Math.round(hitDamage)}`, "#fff1cf", 12);
    hitCount++;
  });
  return hitCount;
}

function spawnProjectile(proj) {
  if (state.projectiles.length >= 600) state.projectiles.shift();
  state.projectiles.push(Object.assign({
    lifetime: 2.2, hitEnemies: new Set(),
    hitEnemiesByPass: { outbound: new Set(), returning: new Set() },
    pass: "outbound", delay: 0
  }, proj));
}

function addWeaponField(field) {
  if (state.weapon_fields.length >= 8) state.weapon_fields.shift();
  state.weapon_fields.push(field);
}

function applyWeaponHitSignature(projectile, enemy, effectiveDamage) {
  const weapon = state.weapons.find(item => item.id === projectile.weapon_id);
  const tier = weapon?.tier || projectile.tier || 1;
  if (projectile.weapon_id === "quill_blaster" && !projectile.echo_shot) {
    const row = getWeaponArchetype("quill_blaster");
    const markDuration = (row?.limits?.mark_seconds || 2.2) * (tier >= 2 ? 1.5 : 1);
    enemy.quill_mark_timer = Math.max(enemy.quill_mark_timer || 0, markDuration);
    enemy.quill_mark_hits = (enemy.quill_mark_hits || 0) + 1;
    if (tier >= 3 && enemy.quill_mark_hits >= 2 && (enemy.quill_echo_cooldown || 0) <= 0) {
      enemy.quill_echo_cooldown = 2.2;
      const next = selectWeaponTarget({ id: "quill_blaster" }, state.enemies, enemy, target => target === enemy || projectile.hitEnemies.has(target));
      if (next) {
        const echoCount = tier >= 4 ? Math.max(1, row?.limits?.echo_targets || 1) : 1;
        const followups = echoCount > 1 ? selectWeaponTarget({ id: "quill_blaster" }, state.enemies, enemy, target => target === enemy || target === next || projectile.hitEnemies.has(target)) : null;
        if (next) {
          const angle = Math.atan2(next.y - enemy.y, next.x - enemy.x);
          spawnProjectile({ type: "quill_echo", x: enemy.x, y: enemy.y,
            dx: Math.cos(angle), dy: Math.sin(angle), dmg: effectiveDamage * (tier >= 4 ? 0.30 : 0.42),
            pierce: 1, spd: 620, color: "#d8eefc", size: 14, weapon_id: "quill_blaster",
            impact_profile: "piercing", echo_shot: true, tier });
        }
        if (followups) {
          const angle = Math.atan2(followups.y - enemy.y, followups.x - enemy.x);
          spawnProjectile({ type: "quill_echo", x: enemy.x, y: enemy.y,
            dx: Math.cos(angle), dy: Math.sin(angle), dmg: effectiveDamage * (tier >= 4 ? 0.30 : 0.42),
            pierce: 1, spd: 620, color: "#d8eefc", size: 14, weapon_id: "quill_blaster",
            impact_profile: "piercing", echo_shot: true, tier });
        }
      }
    }
  }
  if (projectile.weapon_id === "ink_flamethrower") {
    const limit = getWeaponArchetype("ink_flamethrower")?.limits?.burn_stack_cap || 2;
    enemy.burn_stacks = clampBurnStacks("ink_flamethrower", (enemy.burn_stacks || 0) + 1, tier);
    enemy.burn_timer = Math.max(enemy.burn_timer || 0, (getWeaponArchetype("ink_flamethrower")?.limits?.burn_seconds || 1.1) * (tier >= 2 ? 1.25 : 1));
    enemy.burn_tick_timer = Math.min(enemy.burn_tick_timer || 0.35, 0.35);
    enemy.burn_damage = projectile.dmg * (tier >= 3 ? 0.19 : 0.15) * enemy.burn_stacks;
    if (tier >= 4) enemy.burn_ignition_pending = true;
  }
  if (projectile.weapon_id === "syllable_shotgun") {
    const limits = getWeaponArchetype("syllable_shotgun")?.limits || {};
    if (Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y) <= (limits.stagger_range || 112)) {
      enemy.stun_timer = Math.max(enemy.stun_timer || 0, tier >= 4 ? 0.28 : 0.14);
    }
  }
  if (projectile.weapon_id === "quote_pistols" && tier >= 4 && !projectile.ricochet_shot) {
    const next = selectWeaponTarget({ id: "quote_pistols" }, state.enemies, enemy, target => target === enemy || projectile.hitEnemies.has(target));
    if (next) {
      const angle = Math.atan2(next.y - enemy.y, next.x - enemy.x);
      spawnProjectile({ type: "quote_ricochet", x: enemy.x, y: enemy.y,
        dx: Math.cos(angle), dy: Math.sin(angle), dmg: effectiveDamage * 0.25,
        pierce: 1, spd: 700, color: "#ffe082", size: 12, weapon_id: "quote_pistols",
        impact_profile: "gold", ricochet_shot: true, tier });
    }
  }
}

// ============================================================================
// HIGH-PERFORMANCE ZERO-ALLOCATION SPATIAL HASH GRID (Mobile 60fps Optimization)
// ============================================================================
const SPATIAL_CELL = 160;
const SPATIAL_COLS = 16;
const SPATIAL_ROWS = 12;
const SPATIAL_OFFSET_X = 1280;
const SPATIAL_OFFSET_Y = 960;
const spatialBuckets = Array.from({ length: 256 }, () => []);

function rebuildSpatialGrid(enemies) {
  for (let i = 0; i < 256; i++) spatialBuckets[i].length = 0;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (!enemy || enemy.dead || enemy.hp <= 0) continue;
    const col = Math.floor((enemy.x + SPATIAL_OFFSET_X) / SPATIAL_CELL);
    const row = Math.floor((enemy.y + SPATIAL_OFFSET_Y) / SPATIAL_CELL);
    if (col >= 0 && col < SPATIAL_COLS && row >= 0 && row < SPATIAL_ROWS) {
      spatialBuckets[(row << 4) | col].push(i);
    }
  }
}

function forEachNearbyEnemy(x, y, radius, enemies, callback) {
  const minCol = Math.max(0, Math.floor((x - radius + SPATIAL_OFFSET_X) / SPATIAL_CELL));
  const maxCol = Math.min(SPATIAL_COLS - 1, Math.floor((x + radius + SPATIAL_OFFSET_X) / SPATIAL_CELL));
  const minRow = Math.max(0, Math.floor((y - radius + SPATIAL_OFFSET_Y) / SPATIAL_CELL));
  const maxRow = Math.min(SPATIAL_ROWS - 1, Math.floor((y + radius + SPATIAL_OFFSET_Y) / SPATIAL_CELL));
  const radSq = radius * radius;
  for (let r = minRow; r <= maxRow; r++) {
    const rowOffset = r << 4;
    for (let c = minCol; c <= maxCol; c++) {
      const bucket = spatialBuckets[rowOffset | c];
      for (let i = 0; i < bucket.length; i++) {
        const enemy = enemies[bucket[i]];
        if (enemy && !enemy.dead && enemy.hp > 0) {
          const dx = enemy.x - x;
          const dy = enemy.y - y;
          if (dx * dx + dy * dy <= radSq) {
            if (callback(enemy, bucket[i]) === false) return;
          }
        }
      }
    }
  }
}

const nearbyCandidateIndices = [];
function getNearbyEnemyIndices(grid, x, y, projectileHalfSize) {
  nearbyCandidateIndices.length = 0;
  const radius = projectileHalfSize + 34;
  forEachNearbyEnemy(x, y, radius, state.enemies, (enemy, index) => {
    nearbyCandidateIndices.push(index);
  });
  return nearbyCandidateIndices;
}

function updateProjectiles(dt) {
  const p = state.player;
  rebuildSpatialGrid(state.enemies);
  const spatialGrid = true;

  state.projectiles.forEach(pr => {
    if ((pr.delay || 0) > 0) {
      pr.delay = Math.max(0, pr.delay - dt);
      return;
    }
    const skipCollisionThisFrame = !!pr.just_chained;
    pr.just_chained = false;
    pr.lifetime -= dt;

    if (pr.type === "blade_orbit") {
      pr.orbit_angle = (pr.orbit_angle || 0) + dt * 5;
      pr.x = p.x + Math.cos(pr.orbit_angle) * 48;
      pr.y = p.y + Math.sin(pr.orbit_angle) * 48;
    } else if (pr.type === "boomerang_orbit") {
      pr.orbit_time -= dt;
      pr.orbit_angle = (pr.orbit_angle || 0) + dt * 4.2;
      pr.x = p.x + Math.cos(pr.orbit_angle) * 46;
      pr.y = p.y + Math.sin(pr.orbit_angle) * 46;
      if (pr.orbit_time <= 0) pr.pierce = 0;
    } else if (pr.type === "rocket" && pr.target && !pr.target.dead) {
      const desiredAngle = Math.atan2(pr.target.y - pr.y, pr.target.x - pr.x);
      const currentAngle = Math.atan2(pr.dy, pr.dx);
      const difference = Math.atan2(Math.sin(desiredAngle - currentAngle), Math.cos(desiredAngle - currentAngle));
      const nextAngle = currentAngle + Math.max(-pr.homing_strength * dt, Math.min(pr.homing_strength * dt, difference));
      pr.dx = Math.cos(nextAngle); pr.dy = Math.sin(nextAngle);
      pr.x += pr.dx * pr.spd * dt; pr.y += pr.dy * pr.spd * dt;
    } else if (pr.type === "boomerang" || pr.type === "boomerang_orbit") {
      pr.time_alive = (pr.time_alive || 0) + dt;
      const returnAt = (getWeaponArchetype("hyphen_boomerang")?.limits?.return_seconds || 0.6) * (pr.tier >= 2 ? 1.25 : 1);
      if (pr.time_alive < returnAt) {
        pr.x += pr.dx * pr.spd * dt; pr.y += pr.dy * pr.spd * dt;
      } else {
        if (pr.pass !== "returning") {
          pr.pass = "returning";
          pr.hitEnemiesByPass.returning = new Set();
        }
        const dist = Math.hypot(p.x - pr.x, p.y - pr.y);
        if (dist > 10) {
          pr.dx = (p.x - pr.x) / dist; pr.dy = (p.y - pr.y) / dist;
          pr.x += pr.dx * (pr.spd * 1.3) * dt; pr.y += pr.dy * (pr.spd * 1.3) * dt;
        }
        if (dist < 30 && pr.time_alive > 0.8) {
          if (pr.tier >= 4 && pr.type !== "boomerang_orbit") {
            pr.type = "boomerang_orbit";
            pr.orbit_time = getWeaponArchetype("hyphen_boomerang")?.limits?.orbit_seconds || 1.4;
            pr.orbit_angle = 0;
            pr.pass = "orbit";
            pr.hitEnemiesByPass.orbit = new Set();
          } else if (pr.type !== "boomerang_orbit") pr.pierce = 0;
        }
      }
    } else {
      pr.x += pr.dx * pr.spd * dt;
      pr.y += pr.dy * pr.spd * dt;
    }

    // Rune chains can move a projectile during collision iteration; keep their original full scan.
    const useGrid = spatialGrid && pr.weapon_id !== "rune_orb";
    const collisionCandidates = useGrid
      ? getNearbyEnemyIndices(spatialGrid, pr.x, pr.y, (pr.size || 18) / 2)
      : state.enemies;
    for (let ci = 0; ci < collisionCandidates.length; ci++) {
      const candidate = collisionCandidates[ci];
      const e = useGrid ? state.enemies[candidate] : candidate;
      if (skipCollisionThisFrame || (pr.chain_target && e !== pr.chain_target)) continue;
      if (pr.sharedHitTargets?.has(e)) continue;
      const passSet = (pr.type === "boomerang" || pr.type === "boomerang_orbit")
        ? (pr.hitEnemiesByPass[pr.pass] || (pr.hitEnemiesByPass[pr.pass] = new Set())) : pr.hitEnemies;
      if (pr.pierce > 0 && !passSet.has(e)) {
        const hitDist = (pr.size || 18) / 2 + (e.size || 34) / 2;
        if (Math.hypot(e.x - pr.x, e.y - pr.y) < hitDist) {
          passSet.add(e);
          pr.hitEnemies.add(e);
          if (pr.sharedHitTargets) pr.sharedHitTargets.add(e);
          let effectiveDmg = pr.dmg;
          if (pr.weapon_id === "grammar_sniper" && (e.is_elite || e.is_boss)) effectiveDmg = getSniperDamage("grammar_sniper", effectiveDmg, true);
          if ((e.armor_break_timer || 0) > 0) effectiveDmg *= 1.12;
          if ((pr.weapon_id === "calligraphy_katana" || pr.weapon_id === "quill_blaster") && (e.quill_mark_timer || 0) > 0) effectiveDmg *= 1.12;
          if (pr.weapon_id === "hyphen_boomerang" && pr.pass === "returning" && (e.hyphen_mark_timer || 0) > 0) effectiveDmg *= 1.18;
          let shieldDeflect = false;

          // Tactical Shielded Affix Check
          if (e.affix === "shielded") {
            const facingLeft = e.facing_left;
            const isFrontHit = facingLeft ? (pr.dx > 0) : (pr.dx < 0);
            if (isFrontHit && pr.type !== "rocket" && pr.type !== "punctuation_bomb") {
              effectiveDmg *= 0.25; // 75% absorbed by frontal shield!
              shieldDeflect = true;
              sounds.playTone(650, "triangle", 0.05, 0.14);
              state.particles.push({
                x: pr.x, y: pr.y, radius: 4, max_radius: 18, alpha: 0.85,
                color: "rgba(255, 215, 0, "
              });
            }
          }

          effectiveDmg = applyUtilityRelicHit(e, effectiveDmg);
          e.hp -= effectiveDmg;
          if (pr.weapon_id === "grammar_sniper" && pr.tier >= 2) e.armor_break_timer = Math.max(e.armor_break_timer || 0, 2.4);
          if (pr.weapon_id === "crossword_crossbow") e.stun_timer = Math.max(e.stun_timer || 0, getWeaponArchetype(pr.weapon_id)?.limits?.pin_seconds || 0.24);
          if (pr.weapon_id === "hyphen_boomerang" && pr.tier >= 3) e.hyphen_mark_timer = Math.max(e.hyphen_mark_timer || 0, 2.0);
          applyHitFeedback(e, { x: pr.dx, y: pr.dy }, shieldDeflect ? "shield" : (pr.impact_profile || (pr.type === "rocket" ? "heavy" : "ink")), !shieldDeflect && !!pr.crit, !shieldDeflect && pr.type === "rocket", 180);
          if (!shieldDeflect) applyWeaponHitSignature(pr, e, effectiveDmg);
          addFloatingText(e.x + (Math.random() - 0.5) * 16, e.y - 14, pr.crit ? `CRIT ${Math.round(effectiveDmg)}!` : `${Math.round(effectiveDmg)}`, pr.crit ? "#ffd700" : "#ffffff", pr.crit ? 16 : 13);
          // Removed crit haptic vibration to eliminate Android OS thread hitching
          if (pr.crit && state.selected_char === "shadow_lexicographer") {
            e.slow_timer = 1.2;
            e.slow_factor = 0.58;
          }
          if (pr.weapon_id === "rune_orb" && !shieldDeflect) {
            pr.chain_hits = (pr.chain_hits || 0) + 1;
            const maxTargets = (getWeaponArchetype("rune_orb")?.limits?.bounce_targets || 3) + (pr.tier >= 2 ? 1 : 0);
            const next = pr.chain_hits < maxTargets
              ? pickRuneChainTargets({ x: e.x, y: e.y }, state.enemies.filter(target => target !== e && !pr.hitEnemies.has(target)), 1)[0]
              : null;
            if (next) {
              const angle = Math.atan2(next.y - e.y, next.x - e.x);
              pr.dx = Math.cos(angle); pr.dy = Math.sin(angle);
              pr.x = e.x + pr.dx * ((e.size || 30) * 0.55 + 2);
              pr.y = e.y + pr.dy * ((e.size || 30) * 0.55 + 2);
              pr.chain_target = next;
              pr.just_chained = true;
              pr.dmg *= 0.76;
              if (pr.tier >= 3 && pr.chain_hits + 1 >= maxTargets) {
                state.particles.push({ x: next.x, y: next.y, radius: 8, max_radius: 42, alpha: 0.9, color: "rgba(244, 114, 182, " });
              }
              break;
            }
            pr.pierce = 0;
            if (pr.tier >= 4) addWeaponField({ x: e.x, y: e.y, radius: 58, lifetime: 1.5, tick_timer: 0, tick_seconds: 0.5, damage: pr.dmg * 0.18, impact: "rune" });
          } else pr.pierce--;

          if (pr.type === "crossword_bolt" && pr.tier >= 3 && !pr.split) {
            pr.split = true;
            const directions = pr.tier >= 4
              ? [0, Math.PI / 4, Math.PI / 2, Math.PI * 0.75, Math.PI, -Math.PI * 0.75, -Math.PI / 2, -Math.PI / 4]
              : [0, Math.PI / 2, Math.PI, -Math.PI / 2];
            directions.forEach(a => {
              spawnProjectile({
                type: "splinter_bolt", x: pr.x, y: pr.y,
                dx: Math.cos(a), dy: Math.sin(a), dmg: pr.dmg * (pr.tier >= 4 ? 0.32 : 0.55),
                pierce: 1, spd: 460, color: "#ffd700", size: 14, lifetime: 0.8,
                weapon_id: "crossword_crossbow", impact_profile: "piercing", tier: pr.tier, split: true
              });
            });
          }

          if (pr.type === "rocket" || pr.type === "rocket_cluster" || pr.type === "punctuation_bomb") {
            if (pr.type !== "punctuation_bomb") sounds.rocketBlast();
            const limits = getWeaponArchetype(pr.weapon_id)?.limits || {};
            const blastRadius = (pr.type === "punctuation_bomb" ? 78 : (limits.blast_radius || 140)) * (pr.tier >= 2 ? 1.18 : 1);
            state.particles.push({
              x: pr.x, y: pr.y, radius: 15, max_radius: blastRadius,
              alpha: 1.0, color: "rgba(171, 71, 188, "
            });
            forEachNearbyEnemy(pr.x, pr.y, blastRadius, state.enemies, target => {
              target.hp -= pr.dmg * 0.75;
              const ang = Math.atan2(target.y - pr.y, target.x - pr.x);
              applyHitFeedback(target, { x: Math.cos(ang), y: Math.sin(ang) }, "heavy", !!pr.crit, true, 320);
            });
            if ((pr.type === "rocket" || pr.type === "rocket_cluster") && pr.tier >= 3 && !pr.cluster_child) {
              const clusterCount = pr.tier >= 4 ? 4 : (getWeaponArchetype("thesaurus_rocket")?.limits?.cluster_rockets || 3);
              for (let i = 0; i < clusterCount; i++) {
                const angle = (Math.PI * 2 * i) / clusterCount;
                spawnProjectile({ type: "rocket_cluster", x: pr.x, y: pr.y, dx: Math.cos(angle), dy: Math.sin(angle),
                  dmg: pr.dmg * 0.22, pierce: 1, spd: 360, color: "#c084fc", size: 14, lifetime: 0.7,
                  weapon_id: "thesaurus_rocket", impact_profile: "heavy", tier: pr.tier, target: pr.target,
                  homing_strength: 0.35, cluster_child: true });
              }
            }
            if (pr.tier >= 4) addWeaponField({ x: pr.x, y: pr.y, radius: 72, lifetime: 2.0, tick_timer: 0, tick_seconds: 0.5, damage: pr.dmg * 0.16, impact: "heavy" });
          }
          if (pr.weapon_id === "grammar_sniper" && pr.tier >= 4 && e.hp <= 0
            && (pr.sniper_chain_count || 0) < (getWeaponArchetype("grammar_sniper")?.limits?.continuation_targets || 2)) {
            const next = selectWeaponTarget({ id: "grammar_sniper" }, state.enemies, e, target => target === e || target.dead || pr.hitEnemies.has(target));
            if (next) {
              const angle = Math.atan2(next.y - e.y, next.x - e.x);
              spawnProjectile({ type: "weakpoint_chain", x: e.x, y: e.y, dx: Math.cos(angle), dy: Math.sin(angle),
                dmg: pr.dmg * 0.52, pierce: 1, spd: 1180, size: 16, lifetime: 0.8,
                weapon_id: pr.weapon_id, impact_profile: "critical", tier: pr.tier,
                sniper_chain_count: (pr.sniper_chain_count || 0) + 1 });
            }
          }
          if (pr.pierce <= 0 && pr.type !== "boomerang" && pr.type !== "boomerang_orbit") {
            break;
          }
        }
      }
    }
  });

  fastCompact(state.projectiles, p => p.lifetime > 0 && p.pierce > 0);
}

// =========================================
// 12. HARDCORE 100-WAVE HORDE SYSTEM
// =========================================
const MAX_ALIVE_ENEMIES = 220;

function getWaveEnemyCap(wave = state.current_wave) {
  const isMobileDev = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 1080;
  const maxCap = isMobileDev ? 80 : MAX_ALIVE_ENEMIES;
  const baseCap = isMobileDev ? 36 : 48;
  const perWave = isMobileDev ? 1 : 2;
  return Math.min(maxCap, baseCap + Math.max(0, wave - 1) * perWave);
}

function addAliveEnemy(enemy) {
  if (!enemy || enemy.dead) return false;
  // Keep radial spawns and boss formations inside the playable bounds.
  enemy.x = Math.max(-1150, Math.min(1150, enemy.x));
  enemy.y = Math.max(-850, Math.min(850, enemy.y));
  let aliveCount = 0;
  for (let i = 0; i < state.enemies.length; i++) {
    if (!state.enemies[i].dead) aliveCount++;
  }
  if (aliveCount < getWaveEnemyCap()) {
    state.enemies.push(enemy);
    return true;
  }

  const isBoss = enemy.is_boss || enemy.type === "Red Pen Boss" || enemy.type === "Lexicon Dragon Boss";
  if (!isBoss) return false;

  // Keep a milestone boss visible even if the regular horde reached its cap.
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const current = state.enemies[i];
    const currentIsBoss = current.is_boss || current.type === "Red Pen Boss" || current.type === "Lexicon Dragon Boss";
    if (!current.dead && !currentIsBoss) {
      state.enemies.splice(i, 1);
      state.enemies.push(enemy);
      return true;
    }
  }
  return false;
}

function getArenaSpawnPosition(origin, minDistance = 560, preferredAngle = null) {
  const clampPoint = (x, y) => ({
    x: Math.max(-1150, Math.min(1150, x)),
    y: Math.max(-850, Math.min(850, y))
  });
  const firstAngle = preferredAngle ?? Math.random() * Math.PI * 2;
  for (let attempt = 0; attempt < 16; attempt++) {
    const angle = firstAngle + attempt * (Math.PI * 2 / 16);
    const point = clampPoint(origin.x + Math.cos(angle) * 700, origin.y + Math.sin(angle) * 700);
    if (Math.hypot(point.x - origin.x, point.y - origin.y) >= minDistance) return point;
  }

  const perimeter = [];
  for (let x = -1050; x <= 1050; x += 175) perimeter.push({x, y:-820}, {x, y:820});
  for (let y = -750; y <= 750; y += 150) perimeter.push({x:-1120, y}, {x:1120, y});
  const safePoints = perimeter.filter(point => Math.hypot(point.x - origin.x, point.y - origin.y) >= minDistance);
  if (safePoints.length) return safePoints[Math.floor(Math.random() * safePoints.length)];
  return clampPoint(0, 0);
}

let spawnTimer = 0.3;
const typoWords = ["Teh", "Woudl", "Recieve", "Becaue", "Definately", "Seperate", "Tomorow", "Untill", "Beautifull", "Acommodate"];
const grammarPairs = ["is/are", "have/has", "their/there", "your/you're", "its/it's", "to/too", "affect/effect"];
const phantomPunct = ["?", ";", "!", ":", "—", "..."];
const tautologyWords = ["free gift", "past history", "close proximity", "repeat again", "sum total", "safe haven", "final outcome"];
const palindromeWords = ["RACECAR", "MADAM", "ROTATOR", "KAYAK", "LEVEL", "DEIFIED", "NOON", "REVIVER"];
const danglingPhrases = ["Walking slowly...", "Hoping for rain...", "Having arrived...", "Running fast..."];
const doubleNegPhrases = ["not impossible", "never not", "scarcely none", "hardly unready", "can't no"];
const runOnSentences = ["neverending runon sentence with no pauses", "the sun shone and the wind blew and we kept walking", "words words words chained endlessly without fullstops"];

function getWaveHpMult(wave) {
  if (wave <= 25) {
    return 1.0 + (wave - 1) * 0.10;
  } else if (wave <= 50) {
    return 3.5 + (wave - 25) * 0.22 + Math.pow((wave - 25) / 12.0, 1.8);
  } else if (wave <= 75) {
    return 9.8 + (wave - 50) * 0.42 + Math.pow((wave - 50) / 9.0, 2.0);
  } else {
    return 22.5 + (wave - 75) * 0.75 + Math.pow((wave - 75) / 7.0, 2.2);
  }
}
function getWaveSpeedMult(wave) {
  if (wave <= 25) {
    return 1.0 + (wave - 1) * 0.006;
  } else if (wave <= 50) {
    return 1.15 + (wave - 25) * 0.012;
  } else if (wave <= 75) {
    return 1.45 + (wave - 50) * 0.010;
  } else {
    return 1.70 + Math.min(0.35, (wave - 75) * 0.012);
  }
}
function getWaveDamageMult(wave) {
  if (wave <= 25) {
    return 1.0 + (wave - 1) * 0.02;
  } else if (wave <= 50) {
    return 1.5 + (wave - 25) * 0.04;
  } else if (wave <= 75) {
    return 2.5 + (wave - 50) * 0.055;
  } else {
    return 3.9 + (wave - 75) * 0.07;
  }
}

function updateBossHealthBar() {
  const bar = document.getElementById("boss-hp-container");
  if (!bar) return;
  const aliveBosses = state.enemies.filter(e => (e.is_boss || e.type === "Red Pen Boss" || e.type === "Lexicon Dragon Boss") && !e.dead);
  if (aliveBosses.length === 0) {
    bar.style.display = "none";
    state.active_boss = null;
    return;
  }

  bar.style.display = "flex";
  let totalHp = 0;
  let totalMax = 0;
  aliveBosses.forEach(b => {
    totalHp += Math.max(0, b.hp);
    totalMax += b.max_hp;
  });
  const pct = totalMax > 0 ? (totalHp / totalMax) * 100 : 0;
  const fill = document.getElementById("boss-hp-fill");
  if (fill) fill.style.width = Math.max(0, Math.min(100, pct)) + "%";

  const title = document.getElementById("boss-hp-title");
  if (title) {
    if (aliveBosses.length === 1) {
      const bossName = aliveBosses[0].label || (aliveBosses[0].type === "Lexicon Dragon Boss" ? "LEKSİKON EJDERHASI" : aliveBosses[0].type.toLocaleUpperCase("tr-TR"));
      title.textContent = `${bossName} · %${Math.ceil(pct)}`;
    } else {
      title.textContent = `ELEBAŞLARI ORDUSU · ${aliveBosses.length} · %${Math.ceil(pct)}`;
    }
  }
}

function fireBossProjectile(boss, angle, speed = 260, damageFactor = 0.55, shape = "orb") {
  const before = state.enemy_projectiles.length;
  spawnEnemyProjectile(boss.x, boss.y, Math.cos(angle), Math.sin(angle), boss.damage * damageFactor, speed);
  const projectile = state.enemy_projectiles[before];
  if (projectile) {
    projectile.color = boss.boss_color || "#df625d";
    projectile.shape = shape;
    projectile.radius = shape === "shard" ? 9 : 12;
  }
}

function resolveBossArea(boss, x, y, radius, damageFactor = 0.82, slow = false) {
  state.particles.push({ x, y, radius: 14, max_radius: radius, alpha: 0.95, color: "rgba(225, 94, 86, " });
  const distance = Math.hypot(state.player.x - x, state.player.y - y);
  if (distance <= radius && state.player.invuln_timer <= 0 && !state.player.is_dashing) {
    takePlayerDamage(boss.damage * damageFactor);
    state.player.invuln_timer = 0.7;
    if (slow) { state.player.slow_timer = 1.15; state.player.slow_factor = 0.62; }
  }
}

function updateMilestoneBossSkill(boss, dt, dirX, dirY, chronoMult) {
  if (boss.hp <= boss.max_hp * 0.68 && boss.boss_phase < 2) {
    boss.boss_phase = 2;
    boss.boss_skill_interval *= 0.82;
    boss.speed *= 1.08;
    sounds.bossRoar();
    triggerScreenShake(0.32, 9);
  } else if (boss.hp <= boss.max_hp * 0.32 && boss.boss_phase < 3) {
    boss.boss_phase = 3;
    boss.enraged = true;
    boss.boss_skill_interval *= 0.76;
    boss.speed *= 1.10;
    sounds.bossRoar();
    triggerScreenShake(0.42, 12);
  }
  boss.boss_skill_cooldown = Math.max(0, (boss.boss_skill_cooldown || 0) - dt);
  if (boss.boss_skill_cooldown > 0) return;
  const phase = boss.boss_phase || 1;
  const duration = phase === 3 ? 0.72 : 0.9;
  const baseDamage = phase === 3 ? 0.60 : 0.48;
  const targetX = state.player.x + state.player.vx * 0.38;
  const targetY = state.player.y + state.player.vy * 0.38;
  const angle = Math.atan2(targetY - boss.y, targetX - boss.x);
  const telegraphLine = (angleArg = angle, length = 1250) => ({
    is_laser: true, x1: boss.x, y1: boss.y,
    x2: boss.x + Math.cos(angleArg) * length, y2: boss.y + Math.sin(angleArg) * length,
    timer: duration, max_timer: duration, color: boss.boss_color,
    action: () => {}
  });
  const groundMark = (x, y, radius, action, kind = "boss") => ({
    x, y, radius, timer: duration, max_timer: duration, is_boss_area: true, kind,
    color: boss.boss_color, action
  });
  boss.boss_skill_cooldown = Math.max(3.2, boss.boss_skill_interval || 6.5);
  const fireFan = (count, spread = 0.68, factor = baseDamage) => {
    for (let index = 0; index < count; index++) {
      const shotAngle = angle - spread / 2 + spread * index / Math.max(1, count - 1);
      fireBossProjectile(boss, shotAngle, 285 + phase * 28, factor, "shard");
    }
    sounds.enemyShoot();
  };
  switch (boss.boss_skill) {
    case "judgment":
    case "charge": {
      const telegraph = telegraphLine(angle, 950);
      telegraph.action = () => {
        if (boss.dead) return;
        if (boss.boss_skill === "charge") {
          boss.vx = Math.cos(angle) * (430 + phase * 80) * chronoMult;
          boss.vy = Math.sin(angle) * (430 + phase * 80) * chronoMult;
          boss.charge_damage = boss.damage * 0.55;
          boss.charge_timer = 0.58;
        } else {
          fireFan(phase === 3 ? 7 : 5, phase === 3 ? 0.5 : 0.36, baseDamage);
        }
      };
      state.telegraphs.push(telegraph);
      break;
    }
    case "quake":
    case "nova":
    case "orbit": {
      const radius = boss.boss_skill === "orbit" ? 145 : (boss.boss_skill === "nova" ? 115 : 205);
      const markX = boss.x, markY = boss.y;
      state.telegraphs.push(groundMark(boss.x, boss.y, radius, () => {
        if (boss.dead) return;
        resolveBossArea(boss, markX, markY, radius, baseDamage, boss.boss_skill === "nova");
        if (boss.boss_skill === "orbit") {
          const count = phase === 3 ? 16 : 10;
          for (let index = 0; index < count; index++) fireBossProjectile(boss, index * Math.PI * 2 / count, 205 + phase * 24, 0.38, "orb");
        }
        sounds.detonateMine();
      }, boss.boss_skill));
      break;
    }
    case "fan":
    case "crossfire":
    case "shards":
    case "finale": {
      const ray = telegraphLine(angle, 820);
      ray.action = () => {
        if (boss.dead) return;
        fireFan(boss.boss_skill === "finale" && phase === 3 ? 9 : boss.boss_skill === "shards" ? 6 : 5,
          boss.boss_skill === "crossfire" ? 0.9 : 0.66, baseDamage);
        if (boss.boss_skill === "crossfire" || boss.boss_skill === "finale") {
          const crossAngle = angle + Math.PI / 2;
          for (let index = -1; index <= 1; index++) {
            const a = crossAngle + index * 0.16;
            fireBossProjectile(boss, a, 315, baseDamage * 0.78, "shard");
          }
        }
      };
      state.telegraphs.push(ray);
      break;
    }
    case "mirror":
    case "return":
    case "echo": {
      state.telegraphs.push(groundMark(boss.x, boss.y, 128, () => {
        if (boss.dead) return;
        const count = boss.boss_skill === "echo" ? 10 : 8;
        for (let index = 0; index < count; index++) {
          const a = index * Math.PI * 2 / count + (boss.boss_skill === "return" ? Math.PI / 8 : 0);
          fireBossProjectile(boss, a, 220 + phase * 24, 0.42, "ink");
        }
        sounds.enemyShoot();
      }, boss.boss_skill));
      break;
    }
    case "gravity":
    case "snare":
    case "rift":
    case "embers": {
      const radius = boss.boss_skill === "gravity" ? 150 : 92;
      const x = boss.boss_skill === "rift" ? boss.x - dirX * 105 : targetX;
      const y = boss.boss_skill === "rift" ? boss.y - dirY * 105 : targetY;
      state.telegraphs.push(groundMark(x, y, radius, () => {
        if (boss.dead) return;
        if (boss.boss_skill === "rift") {
          const oldX = boss.x, oldY = boss.y;
          boss.x = Math.max(-1100, Math.min(1100, x));
          boss.y = Math.max(-800, Math.min(800, y));
          state.particles.push({ x: oldX, y: oldY, radius: 14, max_radius: 70, alpha: 0.8, color: "rgba(151, 117, 226, " });
        } else if (boss.boss_skill === "gravity") {
          const pullX = x - state.player.x, pullY = y - state.player.y;
          const pullDist = Math.hypot(pullX, pullY);
          if (pullDist <= radius && pullDist > 0) {
            state.player.x += pullX / pullDist * Math.min(42, radius - pullDist + 18);
            state.player.y += pullY / pullDist * Math.min(42, radius - pullDist + 18);
            clampPlayerToArena(state.player);
          }
          resolveBossArea(boss, x, y, radius, baseDamage * 0.8, true);
        } else {
          resolveBossArea(boss, x, y, radius, baseDamage, boss.boss_skill !== "embers");
          if (boss.boss_skill === "embers") fireFan(3, 0.95, 0.28);
        }
      }, boss.boss_skill));
      break;
    }
    default:
      state.telegraphs.push(groundMark(targetX, targetY, 105, () => resolveBossArea(boss, targetX, targetY, 105, baseDamage), "boss"));
  }
}

function updateEnemies(dt) {
  if (!state.is_wave_active) return;

  state.wave_time_left -= dt;
  if (state.wave_time_left <= 0) {
    const milestoneBoss = state.current_wave % 5 === 0
      ? state.enemies.find(enemy => enemy.is_boss && !enemy.dead)
      : null;
    if (milestoneBoss) {
      // Boss waves are won by defeating the boss, never by running out the clock.
      // Overtime is a clear escalation beat rather than a silent boss despawn.
      state.wave_time_left = 18;
      if (!milestoneBoss.enraged) {
        milestoneBoss.enraged = true;
        milestoneBoss.speed *= 1.12;
        milestoneBoss.boss_skill_interval = Math.max(3.0, (milestoneBoss.boss_skill_interval || 6.5) * 0.78);
        triggerTacticalAlert("BOSS ÖFKELENDİ", "Artık her saldırı aralığı kısaldı. Telegraphta güvenli alanı bulun.");
        sounds.bossRoar();
      }
    } else {
      endWave();
      return;
    }
  }

  // Update Active Tactical Telegraphs (Warning circles, bombs, lasers)
  if (state.telegraphs) {
    state.telegraphs.forEach(tg => {
      tg.timer -= dt;
      if (tg.timer <= 0 && !tg.executed) {
        tg.executed = true;
        if (tg.action) tg.action();
      }
    });
    fastCompact(state.telegraphs, tg => tg.timer > 0);
  }

  // Milestone bosses use the same simulation clock as waves so inventory pauses hold the reveal.
  if (state.milestone_boss_delay > 0) {
    state.milestone_boss_delay = Math.max(0, state.milestone_boss_delay - dt);
    if (state.milestone_boss_delay === 0) spawnMilestoneBoss(state.current_wave);
  }

  // Every fifth wave is a clean duel: its boss is the only enemy in the arena.
  // Other waves retain the existing survivor horde and pacing.
  if (state.current_wave % 5 !== 0) {
    spawnTimer -= dt;
    const diffFactor = state.difficulty === "easy" ? 1.15 : (state.difficulty === "hard" ? 0.75 : 1.0);
    const interval = Math.max(0.12, (0.60 - state.current_wave * 0.04) * diffFactor);
    if (spawnTimer <= 0) {
      spawnTimer = interval;
      const batchCount = state.current_wave >= 25 ? 3 : (state.current_wave >= 8 ? 2 : 1);
      let livingCount = 0;
      for (let i = 0; i < state.enemies.length; i++) {
        if (!state.enemies[i].dead) livingCount++;
      }
      const enemyCap = getWaveEnemyCap();
      for (let s = 0; s < batchCount; s++) {
        if (livingCount < enemyCap) {
          spawnEnemy();
          livingCount++;
        }
      }
    }
  }

  const p = state.player;
  const chronoMult = state.chrono_timer > 0 ? 0.15 : 1.0;

  // Commander Aura buff reset & calculation (O(N) with spatial hash broadphase)
  state.enemies.forEach(e => { e.is_buffed = false; });
  state.enemies.forEach(e => {
    if (e.affix === "commander" && !e.dead) {
      forEachNearbyEnemy(e.x, e.y, 160, state.enemies, other => {
        if (other !== e) other.is_buffed = true;
      });
    }
  });

  state.enemies.forEach(e => {
    e.charge_timer = Math.max(0, (e.charge_timer || 0) - dt);
    if (e.charge_timer === 0) e.charge_damage = 0;
    e.hit_flash_timer = Math.max(0, (e.hit_flash_timer || 0) - dt);
    e.armor_break_timer = Math.max(0, (e.armor_break_timer || 0) - dt);
    e.quill_mark_timer = Math.max(0, (e.quill_mark_timer || 0) - dt);
    e.hyphen_mark_timer = Math.max(0, (e.hyphen_mark_timer || 0) - dt);
    e.quill_echo_cooldown = Math.max(0, (e.quill_echo_cooldown || 0) - dt);
    e.vx *= Math.pow(0.06, dt);
    e.vy *= Math.pow(0.06, dt);
    if ((e.burn_timer || 0) > 0) {
      e.burn_timer = Math.max(0, e.burn_timer - dt);
      e.burn_tick_timer = (e.burn_tick_timer || 0.35) - dt;
      if (e.burn_tick_timer <= 0) {
        e.burn_tick_timer = 0.35;
        const burnDamage = Math.max(0, e.burn_damage || 0);
        e.hp -= burnDamage;
        if (burnDamage > 0) applyHitFeedback(e, { x: e.vx, y: e.vy }, "heavy", false, false, 0);
      }
      if (e.burn_timer === 0) {
        if (e.burn_ignition_pending) {
          const radius = 76;
          if (state.particles.length < 35) state.particles.push({ x: e.x, y: e.y, radius: 8, max_radius: radius, alpha: 0.9, color: "rgba(255, 104, 48, " });
          forEachNearbyEnemy(e.x, e.y, radius, state.enemies, other => {
            if (other !== e && !other.dead) {
              other.hp -= (e.burn_damage || 0) * 0.55;
              applyHitFeedback(other, { x: other.x - e.x, y: other.y - e.y }, "heavy", false, false, 60);
            }
          });
        }
        e.burn_stacks = 0;
        e.burn_ignition_pending = false;
      }
    }
    if ((e.stun_timer || 0) > 0) {
      e.stun_timer = Math.max(0, e.stun_timer - dt);
      e.x += e.vx * dt; e.y += e.vy * dt;
      return;
    }
    if ((e.slow_timer || 0) > 0) {
      e.slow_timer = Math.max(0, e.slow_timer - dt);
      if (e.slow_timer === 0) e.slow_factor = 1;
    }

    const playerDist = Math.hypot(p.x - e.x, p.y - e.y);
    let aiTarget = p;
    let dist = playerDist;
    (state.gadget_decoys || []).forEach(decoy => {
      if (!decoy || decoy.timer <= 0 || decoy.hp <= 0) return;
      const decoyDist = Math.hypot(decoy.x - e.x, decoy.y - e.y);
      if (decoyDist < dist) {
        aiTarget = decoy;
        dist = decoyDist;
      }
    });
    const dirX = dist > 0.1 ? (aiTarget.x - e.x) / dist : 0;
    const dirY = dist > 0.1 ? (aiTarget.y - e.y) / dist : 0;
    e.facing_left = dirX < 0;

    if (e.is_boss && state.current_wave % 5 === 0) updateMilestoneBossSkill(e, dt, dirX, dirY, chronoMult);

    let spd = e.speed * chronoMult * (e.slow_timer > 0 ? (e.slow_factor || 0.58) : 1.0);
    if (e.is_buffed) spd *= 1.35; // Commander aura buff!

    // Tactical Blinker Teleport
    if (e.affix === "blinker" && !e.dead) {
      e.blink_timer = (e.blink_timer || 3.8) - dt;
      if (e.blink_timer <= 0 && dist < 450) {
        e.blink_timer = 4.2;
        const targetX = p.x - dirX * 50;
        const targetY = p.y - dirY * 50;
        state.telegraphs.push({
          x: targetX, y: targetY, radius: 28, timer: 0.65, max_timer: 0.65,
          action: () => {
            if (e.dead) return;
            e.x = targetX; e.y = targetY;
            sounds.playTone(320, "sine", 0.10, 0.18);
            state.particles.push({
              x: targetX, y: targetY, radius: 8, max_radius: 35, alpha: 0.9,
              color: "rgba(239, 68, 68, "
            });
          }
        });
      }
    }

    switch (e.type) {
      case "Grammar Goblin": {
        e.dash_cooldown = (e.dash_cooldown || 3.0) - dt;
        if (e.dash_cooldown <= 0 && dist < 300) {
          e.dash_cooldown = 3.6;
          e.vx = dirX * 240 * chronoMult;
          e.vy = dirY * 240 * chronoMult;
        }
        e.x += (dirX * spd + e.vx) * dt;
        e.y += (dirY * spd + e.vy) * dt;
        break;
      }
      case "Punctuation Phantom": {
        e.shoot_cooldown = (e.shoot_cooldown || 2.4) - dt;
        if (dist < 200) {
          e.x -= dirX * spd * 0.6 * dt; e.y -= dirY * spd * 0.6 * dt;
        } else if (dist > 270) {
          e.x += dirX * spd * dt; e.y += dirY * spd * dt;
        }
        e.x += e.vx * dt; e.y += e.vy * dt;

        if (e.shoot_cooldown <= 0) {
          e.shoot_cooldown = 2.4;
          sounds.enemyShoot();
          spawnEnemyProjectile(e.x, e.y, dirX, dirY, e.damage * 0.85, 240 * chronoMult);
        }
        break;
      }
      case "Idiom Imp": {
        e.behavior_phase ||= "approach";
        if (e.behavior_phase === "windup") {
          e.behavior_timer = Math.max(0, e.behavior_timer - dt);
          if (e.behavior_timer === 0) {
            const activePuddles = state.ink_puddles.filter(puddle => puddle.enemy_hazard);
            if (activePuddles.length >= 4) state.ink_puddles.splice(state.ink_puddles.indexOf(activePuddles[0]), 1);
            state.ink_puddles.push({ x: e.puddle_target_x, y: e.puddle_target_y, radius: 30, lifetime: 4.5, enemy_hazard: true });
            e.behavior_phase = "recovery";
            e.behavior_timer = 0.5;
            e.puddle_cooldown = 3.8;
          }
        } else if (e.behavior_phase === "recovery") {
          e.behavior_timer = Math.max(0, e.behavior_timer - dt);
          if (e.behavior_timer === 0) e.behavior_phase = "approach";
        } else {
          e.puddle_cooldown = (e.puddle_cooldown ?? 1.2) - dt;
          if (e.puddle_cooldown <= 0 && dist <= 380) {
            e.puddle_target_x = aiTarget.x;
            e.puddle_target_y = aiTarget.y;
            e.behavior_phase = "windup";
            e.behavior_timer = 0.9;
          } else {
            e.x += (dirX * spd + e.vx) * dt;
            e.y += (dirY * spd + e.vy) * dt;
          }
        }
        break;
      }
      case "Homophone Harpy": {
        e.behavior_phase ||= "approach";
        if (e.behavior_phase === "windup") {
          e.behavior_timer = Math.max(0, e.behavior_timer - dt);
          if (e.behavior_timer === 0) {
            spawnEnemyProjectile(e.x + e.attack_dx * 22, e.y + e.attack_dy * 22,
              e.attack_dx, e.attack_dy, e.damage * 0.55, 175 * chronoMult);
            sounds.enemyShoot();
            e.behavior_phase = "recovery";
            e.behavior_timer = 0.48;
            e.dive_cooldown = 2.7;
          }
        } else if (e.behavior_phase === "recovery") {
          e.behavior_timer = Math.max(0, e.behavior_timer - dt);
          if (e.behavior_timer === 0) e.behavior_phase = "approach";
        } else {
          e.dive_cooldown = (e.dive_cooldown ?? 1.0) - dt;
          if (e.dive_cooldown <= 0 && dist < 440) {
            e.attack_dx = dirX;
            e.attack_dy = dirY;
            e.behavior_phase = "windup";
            e.behavior_timer = 0.88;
          } else if (dist < 205) {
            e.x -= dirX * spd * 0.7 * dt; e.y -= dirY * spd * 0.7 * dt;
          } else if (dist > 350) {
            e.x += dirX * spd * 0.65 * dt; e.y += dirY * spd * 0.65 * dt;
          } else {
            e.x += -dirY * spd * 0.42 * dt; e.y += dirX * spd * 0.42 * dt;
          }
        }
        break;
      }
      case "Vocabulary Void": {
        if (dist < 340) {
          const pull = (1.0 - dist / 340) * 32 * dt;
          p.x += -dirX * pull; p.y += -dirY * pull;
        }
        e.x += (dirX * spd + e.vx) * dt;
        e.y += (dirY * spd + e.vy) * dt;
        break;
      }
      case "Oxymoron Ogre": {
        e.behavior_phase ||= "approach";
        if (e.behavior_phase === "windup") {
          e.behavior_timer = Math.max(0, e.behavior_timer - dt);
          if (e.behavior_timer === 0) {
            sounds.detonateMine();
            state.particles.push({ x: e.x, y: e.y, radius: 12, max_radius: 118, alpha: 0.95, color: "rgba(249, 115, 22, " });
            const playerDistToPulse = Math.hypot(p.x - e.x, p.y - e.y);
            if (playerDistToPulse <= 118 && p.invuln_timer <= 0 && !p.is_dashing) {
              takePlayerDamage(e.damage * 0.75);
              p.invuln_timer = 0.70;
            }
            e.behavior_phase = "recovery";
            e.behavior_timer = 0.78;
            e.slam_cooldown = 3.0;
          }
        } else if (e.behavior_phase === "recovery") {
          e.behavior_timer = Math.max(0, e.behavior_timer - dt);
          if (e.behavior_timer === 0) e.behavior_phase = "approach";
        } else {
          e.slam_cooldown = (e.slam_cooldown ?? 1.0) - dt;
          if (e.slam_cooldown <= 0 && dist <= 170) {
            e.behavior_phase = "windup";
            e.behavior_timer = 0.84;
          } else {
            e.x += (dirX * spd + e.vx) * dt;
            e.y += (dirY * spd + e.vy) * dt;
          }
        }
        break;
      }
      case "Tautology Twin": {
        e.twin_wiggle = (e.twin_wiggle || 0) + dt * 4;
        const perpX = -dirY; const perpY = dirX;
        const sideOffset = Math.sin(e.twin_wiggle) * 45;
        e.x += (dirX * spd + perpX * sideOffset + e.vx) * dt;
        e.y += (dirY * spd + perpY * sideOffset + e.vy) * dt;
        break;
      }
      case "Run-on Reaper": {
        e.behavior_phase ||= "approach";
        if (e.behavior_phase === "windup") {
          e.behavior_timer = Math.max(0, e.behavior_timer - dt);
          if (e.behavior_timer === 0) { e.behavior_phase = "charge"; e.behavior_timer = 0.42; }
        } else if (e.behavior_phase === "charge") {
          e.x += e.attack_dx * 500 * chronoMult * dt;
          e.y += e.attack_dy * 500 * chronoMult * dt;
          e.behavior_timer = Math.max(0, e.behavior_timer - dt);
          if (e.behavior_timer === 0) { e.behavior_phase = "recovery"; e.behavior_timer = 0.72; e.charge_cooldown = 3.0; }
        } else if (e.behavior_phase === "recovery") {
          e.behavior_timer = Math.max(0, e.behavior_timer - dt);
          if (e.behavior_timer === 0) e.behavior_phase = "approach";
        } else {
          e.charge_cooldown = (e.charge_cooldown ?? 1.0) - dt;
          if (e.charge_cooldown <= 0 && dist <= 380) {
            e.attack_dx = dirX;
            e.attack_dy = dirY;
            e.behavior_phase = "windup";
            e.behavior_timer = 0.78;
          } else {
            e.x += (dirX * spd * 1.15 + e.vx) * dt;
            e.y += (dirY * spd * 1.15 + e.vy) * dt;
          }
        }
        break;
      }
      case "Dangling Modifier": {
        e.swoop_phase = (e.swoop_phase || Math.random() * Math.PI) + dt * 3.5;
        const lateralSpd = Math.cos(e.swoop_phase) * 120;
        e.x += (dirX * spd + (-dirY * lateralSpd) + e.vx) * dt;
        e.y += (dirY * spd + (dirX * lateralSpd) + e.vy) * dt;
        break;
      }
      case "Double Negative Drake": {
        e.spark_timer = (e.spark_timer || 3.0) - dt;
        if (e.spark_timer <= 0 && dist < 360) {
          e.spark_timer = 3.8;
          spawnEnemyProjectile(e.x, e.y, dirX, dirY, e.damage * 0.7, 220 * chronoMult);
        }
        e.x += (dirX * spd * 0.9 + e.vx) * dt;
        e.y += (dirY * spd * 0.9 + e.vy) * dt;
        break;
      }
      case "Palindrome Phantom": {
        e.flip_timer = (e.flip_timer || 2.4) - dt;
        if (e.flip_timer <= 0) {
          e.flip_timer = 2.4;
          e.vx = -dirX * 220 * chronoMult;
          e.vy = -dirY * 220 * chronoMult;
        }
        e.x += (dirX * spd + e.vx) * dt;
        e.y += (dirY * spd + e.vy) * dt;
        break;
      }
      case "Red Pen Boss":
      case "Lexicon Dragon Boss": {
        e.x += (dirX * spd + e.vx) * dt;
        e.y += (dirY * spd + e.vy) * dt;
        break;
      }
      default: {
        e.x += (dirX * spd + e.vx) * dt;
        e.y += (dirY * spd + e.vy) * dt;
        break;
      }
    }

    e.x = Math.max(-1150, Math.min(1150, e.x));
    e.y = Math.max(-850, Math.min(850, e.y));

    // Contact damage with generous 0.70s i-frame & pushback spacing
    const contactDist = (e.size || 34) / 2 + 15;
    if (playerDist < contactDist && p.invuln_timer <= 0 && !p.is_dashing) {
      sounds.hit();
      takePlayerDamage(e.damage + (e.charge_timer > 0 ? (e.charge_damage || 0) : 0));
      p.invuln_timer = 0.70;
      // Push enemy back gently so player can escape the clump
      e.vx = -dirX * 220;
      e.vy = -dirY * 220;
    }
  });

  updateBossHealthBar();

  // Enemy projectiles
  state.enemy_projectiles.forEach(ep => {
    ep.x += ep.dx * ep.spd * dt;
    ep.y += ep.dy * ep.spd * dt;
    ep.lifetime -= dt;

    const pDist = Math.hypot(p.x - ep.x, p.y - ep.y);
    if (pDist < 20 && p.invuln_timer <= 0 && !p.is_dashing) {
      ep.dead = true;
      sounds.hit();
      takePlayerDamage(ep.damage);
      p.invuln_timer = 0.70;
    }
  });
  fastCompact(state.enemy_projectiles, ep => ep.lifetime > 0 && !ep.dead);

  // Dead enemies & splitting & health drops & volatile bomb
  const newEnemies = [];
  let milestoneBossDefeated = false;
  state.enemies.forEach(e => {
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      sounds.enemyDeath();
      state.kill_count++;
      const isBoss = e.is_boss || e.type === "Red Pen Boss" || e.type === "Lexicon Dragon Boss";
      const inkReward = e.is_boss
        ? (e.ink_reward || Math.round(32 + state.current_wave * 1.4))
        : getEnemyInkReward(e.type, e.ink_reward || 1);
      // A boss earns one concentrated seal; regular enemies use the shared balance table.
      spawnInkDrop(e.x, e.y, inkReward);

      if (state.selected_char === "rune_sorceress") {
        if (state.particles.length < 35) state.particles.push({x:e.x,y:e.y,radius:12,max_radius:128,alpha:0.95,color:"rgba(166, 119, 255, "});
        forEachNearbyEnemy(e.x, e.y, 118, state.enemies, other => {
          if (other !== e && !other.dead) {
            other.hp -= 34 * state.damage_mult;
            const burstDist = Math.hypot(other.x - e.x, other.y - e.y);
            const knock = burstDist > 0.001 ? 220 / burstDist : 0;
            other.vx += (other.x - e.x) * knock;
            other.vy += (other.y - e.y) * knock;
          }
        });
      }

      // Tactical Volatile Death Bomb
      if (e.affix === "volatile") {
        const exX = e.x; const exY = e.y;
        state.telegraphs.push({
          x: exX, y: exY, radius: 125, timer: 1.1, max_timer: 1.1, is_bomb: true,
          action: () => {
            sounds.rocketBlast();
            triggerScreenShake(0.24, 7.5);
            state.particles.push({
              x: exX, y: exY, radius: 15, max_radius: 130, alpha: 1.0,
              color: "rgba(249, 115, 22, "
            });
            forEachNearbyEnemy(exX, exY, 125, state.enemies, other => {
              other.hp -= 140;
              addFloatingText(other.x, other.y - 12, "140", "#f97316", 15);
              const a = Math.atan2(other.y - exY, other.x - exX);
              other.vx = Math.cos(a) * 320; other.vy = Math.sin(a) * 320;
            });
            if (Math.hypot(p.x - exX, p.y - exY) < 125 && p.invuln_timer <= 0 && !p.is_dashing) {
              takePlayerDamage(28);
            }
          }
        });
      }

      // 15% Chance to drop Healing Parchment (+18 HP)
      if (Math.random() < 0.15) {
        state.health_drops.push({ x: e.x, y: e.y, value: 18, collected: false });
      }

      if (e.type === "Typo Slime") {
        for (let i = 0; i < 2; i++) {
          const offAng = Math.random() * Math.PI * 2;
          newEnemies.push({
            type: "Typo Splinter",
            x: e.x + Math.cos(offAng) * 20, y: e.y + Math.sin(offAng) * 20,
            vx: Math.cos(offAng) * 140, vy: Math.sin(offAng) * 140,
            hp: 36 * getWaveHpMult(state.current_wave), max_hp: 36 * getWaveHpMult(state.current_wave),
            speed: 175 * getWaveSpeedMult(state.current_wave), damage: 18 * getWaveDamageMult(state.current_wave),
            ink_reward: 1, label: "Splinter", sprite: "typo_splinter.png", size: 22, facing_left: false
          });
        }
      }

      if (isBoss) {
        if (e.is_boss && state.current_wave % 5 === 0) milestoneBossDefeated = true;
        // Guaranteed Boss Elixir (+50 HP)
        state.health_drops.push({ x: e.x, y: e.y, value: 50, collected: false });
        // One concentrated seal replaces the old 18-drop pinata. The duel
        // should pay out, while the story relic remains a deliberate milestone.
        updateBossHealthBar();
      }
    }
  });

  fastCompact(state.enemies, e => !e.dead);
  newEnemies.forEach(addAliveEnemy);
  if (milestoneBossDefeated && state.is_wave_active) endWave();
}

function spawnEnemy() {
  const p = state.player;
  const spawnPoint = getArenaSpawnPosition(p, 560);
  const x = spawnPoint.x;
  const y = spawnPoint.y;

  const d = DIFFICULTIES[state.difficulty];
  const wave = state.current_wave;
  const hpM = getWaveHpMult(wave) * d.enemy_hp_mult;
  const spdM = getWaveSpeedMult(wave) * d.enemy_speed_mult;
  const dmgM = getWaveDamageMult(wave) * d.enemy_damage_mult;

  const roll = Math.random();

  // 13 Diverse Linguistic Enemies
  if (wave >= 30 && roll < 0.10) {
    addAliveEnemy({
      type: "Oxymoron Ogre", x, y, vx: 0, vy: 0,
      hp: 640 * hpM, max_hp: 640 * hpM, speed: 92 * spdM, damage: 58 * dmgM,
      ink_reward: 12, label: "OXYMORON OGRE", sprite: "oxymoron_ogre.png", size: 58,
      is_elite: wave > 40, facing_left: false
    });
  } else if (wave >= 25 && roll < 0.18) {
    addAliveEnemy({
      type: "Double Negative Drake", x, y, vx: 0, vy: 0,
      hp: 340 * hpM, max_hp: 340 * hpM, speed: 110 * spdM, damage: 42 * dmgM,
      ink_reward: 10, label: doubleNegPhrases[Math.floor(Math.random() * doubleNegPhrases.length)],
      sprite: "double_negative_drake.png", size: 52, is_elite: wave > 45, facing_left: false
    });
  } else if (wave >= 25 && roll < 0.26) {
    addAliveEnemy({
      type: "Vocabulary Void", x, y, vx: 0, vy: 0,
      hp: 360 * hpM, max_hp: 360 * hpM, speed: 82 * spdM, damage: 44 * dmgM,
      ink_reward: 10, label: "VOCAB VOID", sprite: "vocabulary_void.png", size: 50,
      is_elite: wave > 50, facing_left: false
    });
  } else if (wave >= 20 && roll < 0.35) {
    addAliveEnemy({
      type: "Palindrome Phantom", x, y, vx: 0, vy: 0,
      hp: 145 * hpM, max_hp: 145 * hpM, speed: 170 * spdM, damage: 30 * dmgM,
      ink_reward: 8, label: palindromeWords[Math.floor(Math.random() * palindromeWords.length)],
      sprite: "palindrome_phantom.png", size: 44, facing_left: false
    });
  } else if (wave >= 20 && roll < 0.44) {
    addAliveEnemy({
      type: "Homophone Harpy", x, y, vx: 0, vy: 0,
      hp: 150 * hpM, max_hp: 150 * hpM, speed: 180 * spdM, damage: 34 * dmgM,
      ink_reward: 7, label: "HARPY", sprite: "homophone_harpy.png", size: 46, facing_left: false
    });
  } else if (wave >= 15 && roll < 0.52) {
    addAliveEnemy({
      type: "Dangling Modifier", x, y, vx: 0, vy: 0,
      hp: 130 * hpM, max_hp: 130 * hpM, speed: 165 * spdM, damage: 26 * dmgM,
      ink_reward: 6, label: danglingPhrases[Math.floor(Math.random() * danglingPhrases.length)],
      sprite: "dangling_modifier.png", size: 44, facing_left: false
    });
  } else if (wave >= 15 && roll < 0.60) {
    addAliveEnemy({
      type: "Malapropism Mimic", x, y, vx: 0, vy: 0,
      hp: 210 * hpM, max_hp: 210 * hpM, speed: 160 * spdM, damage: 38 * dmgM,
      ink_reward: 7, label: "MIMIC", sprite: "malapropism_mimic.png", size: 42, facing_left: false
    });
  } else if (wave >= 10 && roll < 0.68) {
    addAliveEnemy({
      type: "Run-on Reaper", x, y, vx: 0, vy: 0,
      hp: 180 * hpM, max_hp: 180 * hpM, speed: 195 * spdM, damage: 36 * dmgM,
      ink_reward: 7, label: "RUN-ON REAPER", sprite: "run_on_reaper.png", size: 46,
      facing_left: false
    });
  } else if (wave >= 10 && roll < 0.76) {
    addAliveEnemy({
      type: "Idiom Imp", x, y, vx: 0, vy: 0,
      hp: 110 * hpM, max_hp: 110 * hpM, speed: 185 * spdM, damage: 30 * dmgM,
      ink_reward: 5, label: "IDIOM IMP", sprite: "idiom_imp.png", size: 36, facing_left: false
    });
  } else if (wave >= 5 && roll < 0.83) {
    addAliveEnemy({
      type: "Tautology Twin", x, y, vx: 0, vy: 0,
      hp: 160 * hpM, max_hp: 160 * hpM, speed: 140 * spdM, damage: 32 * dmgM,
      ink_reward: 6, label: tautologyWords[Math.floor(Math.random() * tautologyWords.length)],
      sprite: "tautology_twin.png", size: 44, facing_left: false
    });
  } else if (wave >= 5 && roll < 0.90) {
    addAliveEnemy({
      type: "Punctuation Phantom", x, y, vx: 0, vy: 0,
      hp: 120 * hpM, max_hp: 120 * hpM, speed: 135 * spdM, damage: 28 * dmgM,
      ink_reward: 5, label: phantomPunct[Math.floor(Math.random() * phantomPunct.length)],
      sprite: "punctuation_phantom.png", size: 42, shoot_cooldown: 2.0 + Math.random() * 0.8, facing_left: false
    });
  } else if (roll < 0.95) {
    addAliveEnemy({
      type: "Grammar Goblin", x, y, vx: 0, vy: 0,
      hp: 76 * hpM, max_hp: 76 * hpM, speed: 155 * spdM, damage: 14 * dmgM,
      ink_reward: 4, label: grammarPairs[Math.floor(Math.random() * grammarPairs.length)],
      sprite: "grammar_goblin.png", size: 34, dash_cooldown: 2.5 + Math.random() * 1.0, facing_left: false
    });
  } else {
    addAliveEnemy({
      type: "Typo Slime", x, y, vx: 0, vy: 0,
      hp: 96 * hpM, max_hp: 96 * hpM, speed: 98 * spdM, damage: 18 * dmgM,
      ink_reward: 4, label: typoWords[Math.floor(Math.random() * typoWords.length)],
      sprite: "typo_slime.png", size: 36, facing_left: false
    });
  }

  // Tactical Elite Affixes in higher waves (Wave 15+)
  const newEnemy = state.enemies[state.enemies.length - 1];
  if (newEnemy && !newEnemy.is_boss && wave >= 15) {
    const affixChance = Math.min(0.50, 0.12 + (wave - 15) * 0.008);
    if (Math.random() < affixChance) {
      const affixes = ["shielded", "blinker", "commander", "volatile"];
      newEnemy.affix = affixes[Math.floor(Math.random() * affixes.length)];
      newEnemy.is_elite = true;
      newEnemy.max_hp *= 1.30;
      newEnemy.hp = newEnemy.max_hp;
      if (newEnemy.affix === "shielded") {
        newEnemy.label = "KALKANLI " + newEnemy.label;
      } else if (newEnemy.affix === "blinker") {
        newEnemy.label = "HIZLI " + newEnemy.label;
        newEnemy.blink_timer = 3.0 + Math.random() * 1.5;
      } else if (newEnemy.affix === "commander") {
        newEnemy.label = "AURA " + newEnemy.label;
      } else if (newEnemy.affix === "volatile") {
        newEnemy.label = "PATLAYICI " + newEnemy.label;
      }
    }
  }
}

const MILESTONE_BOSS_ROSTER = [
  ["Red Pen Boss", "upgrade_v2/boss_red_inquisitor.png", "Judgment Warden", "#e45c54", "judgment"],
  ["Syntax Titan", "upgrade_v2/boss_syntax_titan.png", "The Unfinished Titan", "#e2a74b", "quake"],
  ["Oxymoron Ogre", "upgrade_v1/monster_oxymoron_ogre.png", "The Contradiction", "#f47b45", "nova"],
  ["Homophone Harpy", "upgrade_v1/monster_homophone_harpy.png", "Twin-Voice Harpy", "#9b8ae7", "fan"],
  ["Lexicon Dragon Boss", "upgrade_v2/boss_lexicon_dragon.png", "The Lexicon Dragon", "#d34b68", "orbit"],
  ["Run-on Reaper", "upgrade_v1/monster_run_on_reaper.png", "The Run-on Reaper", "#c64a42", "charge"],
  ["Malapropism Mimic", "upgrade_v1/monster_malapropism_mimic.png", "The Borrowed Face", "#a879d4", "mirror"],
  ["Vocabulary Void", "upgrade_v2/boss_void_curator.png", "The Wordless Maw", "#6b64d9", "gravity"],
  ["Punctuation Phantom", "upgrade_v1/monster_punctuation_phantom.png", "The Last Full Stop", "#70a8cf", "crossfire"],
  ["Double Negative Drake", "upgrade_v1/monster_double_negative_drake.png", "The No-No Drake", "#7e9b52", "rift"],
  ["Palindrome Phantom", "upgrade_v1/monster_palindrome_phantom.png", "The Reversing Shade", "#bd78cb", "return"],
  ["Tautology Twin", "upgrade_v1/monster_tautology_twin.png", "The Repeating Pair", "#d07d54", "echo"],
  ["Dangling Modifier", "upgrade_v1/monster_dangling_modifier.png", "The Hanging Sentence", "#5faaa2", "snare"],
  ["Spelling Spectre", "upgrade_v1/monster_spelling_spectre.png", "The Pale Proofreader", "#91a9c4", "shards"],
  ["Idiom Imp", "upgrade_v1/monster_idiom_imp.png", "The Literal Flame", "#dc7450", "embers"],
  ["Red Pen Boss", "upgrade_v2/boss_red_inquisitor.png", "The Redactor", "#d94841", "judgment"],
  ["Oxymoron Ogre", "upgrade_v1/monster_oxymoron_ogre.png", "The Split-Truth Ogre", "#f18b43", "quake"],
  ["Malapropism Mimic", "upgrade_v1/monster_malapropism_mimic.png", "The False Neris", "#8b65c4", "mirror"],
  ["Vocabulary Void", "upgrade_v2/boss_void_curator.png", "The Unwritten", "#5441b8", "gravity"],
  ["Lexicon Dragon Boss", "upgrade_v2/boss_lexicon_dragon.png", "Omega, Last Word", "#df3d65", "finale"]
];
const BOSS_TELEGRAPH_GUIDANCE = {
  judgment: "Kırmızı çizgi yönünü gösterir; çizgiden çapraz kaçış yap.", quake: "Yayılan halka yere çarpmadan önce dışarı çık.",
  nova: "Parlayan işaret takip eder; hareket etmeyi sürdür.", fan: "Yelpaze atışları geniş bir açı kaplar; yaklaşıp arkasına geç.",
  orbit: "Dairesel mermi halkasında açıklık bul.", charge: "Şerit yönünü kilitler; son anda yandan sıyrıl.",
  mirror: "Mühür kapandığında çevresine yayılır; mesafe aç.", gravity: "Mor alan hareketini çeker ve yavaşlatır.",
  crossfire: "Çapraz çizgilerde iki saldırı koridoru da tehlikeli.", rift: "Işınlanma mührü güvenli konumunu değiştirir.",
  return: "Geri dönen mürekkep halkasıyla arana mesafe koy.", echo: "Yankı halkaları boşluklu biçimde yayılır.",
  snare: "Zemindeki mühür kısa süreliğine hareketini keser.", shards: "Kristal parçalar açılı bir yay çizer.",
  embers: "Köz işaretlerinden çık; küçük ama hızlı darbeler gelir.", finale: "Son evrede yatay ve dikey saldırı şeritleri üst üste biner."
};
const BOSS_SPRITE_FALLBACKS = Object.freeze({
  "upgrade_v2/boss_red_inquisitor.png": "upgrade_v1/monster_red_pen_boss.png",
  "upgrade_v2/boss_lexicon_dragon.png": "upgrade_v1/monster_lexicon_dragon_boss.png",
  "upgrade_v2/boss_void_curator.png": "upgrade_v1/monster_vocabulary_void.png",
  "upgrade_v2/boss_syntax_titan.png": "upgrade_v1/monster_syntax_titan.png"
});

function spawnMilestoneBoss(wave) {
  const player = state.player;
  const difficulty = DIFFICULTIES[state.difficulty];
  const [type, sprite, name, color, skill] = MILESTONE_BOSS_ROSTER[Math.min(19, Math.floor(wave / 5) - 1)];
  const waveScale = getWaveHpMult(wave);
  const hp = (900 + wave * 80) * Math.pow(waveScale, 0.45) * difficulty.enemy_hp_mult;
  const angle = Math.random() * Math.PI * 2;
  const point = getArenaSpawnPosition(player, 560, angle);
  const boss = {
    type, sprite, x: point.x, y: point.y, vx: 0, vy: 0,
    hp, max_hp: hp, speed: (54 + Math.min(28, wave * 0.16)) * difficulty.enemy_speed_mult,
    damage: (26 + wave * 1.15) * difficulty.enemy_damage_mult,
    ink_reward: Math.round(32 + wave * 1.4), label: name.toUpperCase(),
    size: wave >= 100 ? 108 : (68 + Math.min(20, wave * 0.16)),
    is_elite: true, is_boss: true, boss_color: color, boss_skill: skill,
    boss_skill_cooldown: 4.2, boss_skill_interval: Math.max(4.3, 7.2 - wave * 0.018),
    boss_phase: 1, boss_phase_action: false, facing_left: Math.cos(angle) > 0
  };
  sounds.bossRoar();
  addAliveEnemy(boss);
  triggerTacticalAlert(name.toLocaleUpperCase("tr-TR"), BOSS_TELEGRAPH_GUIDANCE[skill] || "İşaretlere bak, saldırıdan önce güvenli alanı bul.");
  updateBossHealthBar();
}

function spawnEnemyProjectile(x, y, dx, dy, dmg, spd) {
  state.enemy_projectiles.push({
    x, y, dx, dy, damage: dmg, spd: spd, lifetime: 3.2, dead: false, color: null, shape: "orb", radius: 8
  });
}

function spawnInkDrop(x, y, value) {
  const isMobileDev = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 1080;
  // On mobile where enemy density is capped to prevent CPU throttling, scale ink drops by 1.25x
  const finalVal = isMobileDev ? Math.ceil(value * 1.25) : value;
  const maxDrops = isMobileDev ? 60 : 120;
  if (state.ink_drops.length >= maxDrops) {
    state.ink_drops.splice(0, state.ink_drops.length - maxDrops + 1);
  }
  state.ink_drops.push({ x, y, value: finalVal, collected: false });
}

function takePlayerDamage(amount) {
  if (state.shield_charges > 0) {
    const finalCharge = state.shield_charges === 1;
    state.shield_charges--;
    sounds.hit();
    if (finalCharge) {
      // The final charge becomes a readable counter pulse.
      state.enemies.forEach(e => {
        if (Math.hypot(e.x - state.player.x, e.y - state.player.y) < state.shield_counter_radius) {
          e.hp -= state.shield_counter_damage * state.damage_mult;
        const a = Math.atan2(e.y - state.player.y, e.x - state.player.x);
          e.vx = Math.cos(a) * 220; e.vy = Math.sin(a) * 220;
          applyHitFeedback(e, { x: Math.cos(a), y: Math.sin(a) }, "shield", false, true, 220);
        }
      });
    }
    return;
  }

  const reduction = Math.min(0.85, Math.max(0, state.armor));
  const finalDmg = Math.max(1, amount * (1.0 - reduction));
  state.hp = Math.max(0, state.hp - finalDmg);
  triggerHaptic("heavy");
  triggerScreenShake(0.18, 6.0);
  addFloatingText(state.player.x, state.player.y - 30, `-${Math.round(finalDmg)}`, "#ef4444", 16);
  updateHUD();

  if (state.hp <= 0) gameOver();
}

function gameOver() {
  finalizeRunResult(false);
  triggerHaptic("fail");
  state.is_wave_active = false;
  bgm.setMode("peaceful");
  syncMobileControlsVisibility();
  const modal = document.getElementById("game-over-screen");
  const title = document.getElementById("game-over-title");
  const kicker = document.getElementById("game-over-kicker");
  const summary = document.getElementById("game-over-summary");
  const wordsList = state.words_learned.length ? state.words_learned.join(", ") : "Henüz kelime mühürlenemedi.";

  modal.dataset.result = "defeat";
  kicker.textContent = "RUN SONUCU  ·  KAYIT KAPANDI";
  title.textContent = "KİTAP KAPANDI";

  summary.textContent = `Mühürlenen kelimeler (${state.words_learned.length})\n${wordsList}\n\n` +
    `Kâtip: ${CHARACTERS[state.selected_char].name}\n` +
    `Seviye: ${DIFFICULTIES[state.difficulty].name}\n` +
    `Ulaşılan dalga: ${state.current_wave} / 100\n` +
    `Yok edilen düşman: ${state.kill_count}\n` +
    `Toplanan mürekkep: ${state.ink_count}`;

  updateAutoRunUI();
  modal.style.display = "flex";

  if (state.auto_new_run) {
    startAutoRunCountdown(3);
  } else {
    clearAutoRunCountdown();
  }
}

function victoryScreen() {
  finalizeRunResult(true);
  state.is_wave_active = false;
  bgm.setMode("peaceful");
  syncMobileControlsVisibility();
  const modal = document.getElementById("game-over-screen");
  const title = document.getElementById("game-over-title");
  const kicker = document.getElementById("game-over-kicker");
  const summary = document.getElementById("game-over-summary");
  const wordsList = state.words_learned.length ? state.words_learned.join(", ") : "Tüm sözlükler kurtarıldı!";

  modal.dataset.result = "victory";
  kicker.textContent = "RUN SONUCU  ·  KAYIT TAMAMLANDI";
  title.textContent = "SÖZLÜK KURTARILDI";

  summary.textContent = `Yüz dalga tamamlandı. Son kayıt alındı.\n\n` +
    `Kurtarılan kelimeler (${state.words_learned.length})\n${wordsList}\n\n` +
    `Kâtip: ${CHARACTERS[state.selected_char].name}\n` +
    `Seviye: ${DIFFICULTIES[state.difficulty].name}\n` +
    `Yok edilen düşman: ${state.kill_count}\n` +
    `Toplanan mürekkep: ${state.ink_count}`;

  modal.style.display = "flex";
}

// Global scores are opt-in. Without a configured Worker the same UI uses a local board.
const leaderboardMeta = document.querySelector('meta[name="leaderboard-api"]');
const leaderboardApiBase = (window.LEADERBOARD_API_URL || leaderboardMeta?.content || "").trim();
const leaderboardApiUrl = leaderboardApiBase
  ? new URL(leaderboardApiBase.endsWith("/api/leaderboard") ? leaderboardApiBase : "/api/leaderboard", leaderboardApiBase).toString()
  : "";
const leaderboardNode = id => document.getElementById(id);

function createSubmissionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
    const random = Math.random() * 16 | 0;
    return (char === "x" ? random : (random & 3 | 8)).toString(16);
  });
}

function finalizeRunResult(victory) {
  if (state.run_result_recorded && state.latest_run_result) return state.latest_run_result;
  const cleared = victory ? 100 : Math.max(0, state.current_wave - 1);
  state.latest_run_result = {
    submissionId: state.run_submission_id || createSubmissionId(), alias: "",
    wavesCleared: cleared, kills: Math.max(0, Math.floor(state.kill_count || 0)),
    elapsedMs: Math.max(1000, Date.now() - (state.run_started_at || Date.now())),
    characterId: state.selected_char, difficultyId: state.difficulty
  };
  state.run_result_recorded = true;
  return state.latest_run_result;
}

function readLocalLeaderboard(difficulty) {
  try {
    const rows = JSON.parse(localStorage.getItem(`lexicon_leaderboard_${difficulty}`) || "[]");
    return Array.isArray(rows) ? rows.slice(0, 20) : [];
  } catch (_) { return []; }
}

function saveLocalLeaderboard(row) {
  const rows = [...readLocalLeaderboard(row.difficultyId).filter(existing => existing.submissionId !== row.submissionId), row]
    .sort((a, b) => b.wavesCleared - a.wavesCleared || b.kills - a.kills || a.elapsedMs - b.elapsedMs)
    .slice(0, 20);
  try { localStorage.setItem(`lexicon_leaderboard_${row.difficultyId}`, JSON.stringify(rows)); } catch (_) {}
  return rows;
}

function renderLeaderboard(rows) {
  const list = leaderboardNode("leaderboard-entries");
  if (!list) return;
  if (typeof list.replaceChildren === "function") list.replaceChildren(); else list.innerHTML = "";
  if (!rows.length) {
    const empty = document.createElement("li"); empty.textContent = "Henüz kayıt yok."; list.appendChild(empty); return;
  }
  rows.forEach((row, index) => {
    const item = document.createElement("li");
    item.textContent = `${row.rank || index + 1}. ${row.alias}  ·  ${row.wavesCleared} dalga  ·  ${row.kills} düşman  ·  ${(row.elapsedMs / 60000).toFixed(1)} dk`;
    item.style.cssText = "padding:7px 9px;border:1px solid rgba(123,94,54,.25);background:rgba(255,250,239,.68);font-size:12px;color:#41372d";
    list.appendChild(item);
  });
}

async function refreshLeaderboard() {
  const difficulty = leaderboardNode("leaderboard-difficulty")?.value || state.difficulty;
  const status = leaderboardNode("leaderboard-status");
  renderLeaderboard(readLocalLeaderboard(difficulty));
  if (!leaderboardApiUrl) {
    if (status) status.textContent = "Yerel cihaz tablosu · Küresel sıralama henüz yapılandırılmadı.";
    return;
  }
  if (status) status.textContent = "Küresel tablo yükleniyor…";
  try {
    const response = await fetch(`${leaderboardApiUrl}?difficulty=${encodeURIComponent(difficulty)}&limit=20`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    renderLeaderboard(Array.isArray(data.entries) ? data.entries : []);
    if (status) status.textContent = "Küresel sıralama · en iyi 20 koşu";
  } catch (_) {
    if (status) status.textContent = "Küresel tabloya ulaşılamadı; bu cihazdaki kayıtlar gösteriliyor.";
  }
}

function openLeaderboard() {
  const overlay = leaderboardNode("leaderboard-overlay");
  if (!overlay) return;
  overlay.hidden = false; overlay.style.display = "flex";
  const alias = leaderboardNode("leaderboard-alias");
  try { if (alias && !alias.value) alias.value = localStorage.getItem("lexicon_leaderboard_alias") || ""; } catch (_) {}
  const selector = leaderboardNode("leaderboard-difficulty");
  if (selector) {
    selector.value = state.latest_run_result?.difficultyId || state.difficulty;
    selector.disabled = false;
  }
  refreshLeaderboard();
  alias?.focus({ preventScroll: true });
}

function closeLeaderboard() {
  const overlay = leaderboardNode("leaderboard-overlay");
  if (overlay) { overlay.hidden = true; overlay.style.display = "none"; }
}

leaderboardNode("title-leaderboard-btn")?.addEventListener("click", openLeaderboard);
leaderboardNode("gameover-leaderboard-btn")?.addEventListener("click", openLeaderboard);
leaderboardNode("leaderboard-close-btn")?.addEventListener("click", closeLeaderboard);
leaderboardNode("leaderboard-refresh-btn")?.addEventListener("click", refreshLeaderboard);
leaderboardNode("leaderboard-difficulty")?.addEventListener("change", refreshLeaderboard);
leaderboardNode("leaderboard-overlay")?.addEventListener("click", event => {
  if (event.target?.id === "leaderboard-overlay") closeLeaderboard();
});
leaderboardNode("leaderboard-submit-form")?.addEventListener("submit", async event => {
  event.preventDefault();
  const aliasInput = leaderboardNode("leaderboard-alias");
  const alias = aliasInput?.value.trim().replace(/\s+/g, " ").slice(0, 20) || "";
  const status = leaderboardNode("leaderboard-status");
  if (!alias) { if (status) status.textContent = "Görünen adını yaz."; aliasInput?.focus(); return; }
  try { localStorage.setItem("lexicon_leaderboard_alias", alias); } catch (_) {}
  const result = state.latest_run_result;
  if (!result) { if (status) status.textContent = "Önce bir koşuyu tamamla; sonra skorunu gönderebilirsin."; return; }
  const row = { ...result, alias };
  saveLocalLeaderboard(row);
  if (!leaderboardApiUrl) {
    await refreshLeaderboard();
    if (status) status.textContent = "Skor bu cihazda saklandı. Küresel tablo henüz yapılandırılmadı.";
    return;
  }
  const button = leaderboardNode("leaderboard-submit-btn");
  if (button) button.disabled = true;
  if (status) status.textContent = "Skor gönderiliyor…";
  try {
    const response = await fetch(leaderboardApiUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(row) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    await refreshLeaderboard();
    if (status) status.textContent = `Skor kaydedildi · küresel sıra #${data.rank || "—"}`;
  } catch (error) {
    if (status) status.textContent = `Gönderilemedi (${String(error?.message || "bağlantı")}); skor bu cihazda saklandı.`;
    renderLeaderboard(readLocalLeaderboard(row.difficultyId));
  } finally { if (button) button.disabled = false; }
});

const onRestart = () => {
  clearAutoRunCountdown();
  document.getElementById("game-over-screen").style.display = "none";
  document.getElementById("title-screen").style.display = "flex";
  initTitleScreen();
  syncMobileControlsVisibility();
};
document.getElementById("restart-game-btn").onclick = onRestart;

// =========================================
// 13. SCRIPTORIUM BAZAAR, GADGETS & INVENTORY
// =========================================
let currentShopTab = "cards";
let shopCards = [];

function openShop() {
  document.getElementById("shop-screen").style.display = "flex";
  syncMobileControlsVisibility();
  currentShopTab = "cards";
  highlightShopTabs();
  refreshShopCards();
  renderShopView();
  updateShopTopBar();
  updateShopChapterHeader();
  updateAutoTurUI();

  if (state.auto_new_tur) {
    startShopAutoWaveCountdown(4);
  } else {
    clearShopAutoWaveTimer();
  }
}

function updateShopTopBar() {
  document.getElementById("shop-ink-display").textContent = "MÜREKKEP  " + state.ink_count;
  const synKeys = Object.keys(state.active_synergies);
  if (synKeys.length === 0) {
    document.getElementById("shop-synergy-text").textContent = "Aktif Sinerji: Yok (Aynı türden 3 kelime tomârı toplayarak antik sinerji kilidini aç!)";
  } else {
    document.getElementById("shop-synergy-text").textContent = "Aktif sinerjiler: " + synKeys.map(k => `[${k}]`).join(" ");
  }
}

function updateShopChapterHeader() {
  const chapter = getChapterForWave(state.current_wave);
  const title = document.getElementById("shop-chapter-title");
  const narration = document.getElementById("shop-chapter-narration");
  const kicker = document.getElementById("shop-chapter-kicker");
  const strip = document.getElementById("shop-chapter-strip");
  if (!title || !narration || !kicker || !strip) return;
  title.textContent = chapter.title;
  narration.textContent = chapter.narration;
  kicker.textContent = `DALGA ARASI  ·  ${String(state.current_wave).padStart(2, "0")} TAMAMLANDI`;
  strip.style.setProperty("--chapter-accent", chapter.accent);
}

function refreshShopCards() {
  let targetLevels = ["A1", "A2"];
  if (state.difficulty === "easy") {
    if (state.current_wave > 20) targetLevels = ["A1", "A2", "B1"];
    else if (state.current_wave > 10) targetLevels = ["A1", "A2"];
    else targetLevels = ["A1", "A2"];
  } else if (state.difficulty === "hard") {
    if (state.current_wave > 40) targetLevels = ["B2", "C1"];
    else if (state.current_wave > 15) targetLevels = ["B1", "B2", "C1"];
    else targetLevels = ["A2", "B1", "B2"];
  } else { // normal
    if (state.current_wave > 45) targetLevels = ["B2", "C1"];
    else if (state.current_wave > 25) targetLevels = ["B1", "B2"];
    else if (state.current_wave > 10) targetLevels = ["A2", "B1"];
    else targetLevels = ["A1", "A2"];
  }

  // Filter out questions already asked in this run (no duplicates!)
  let availablePool = state.questions.filter(q => {
    return targetLevels.includes(q.level) && !state.asked_question_ids.includes(q.id);
  });

  // Recycle if pool runs low
  if (availablePool.length < 4) {
    state.asked_question_ids = [];
    availablePool = state.questions.filter(q => targetLevels.includes(q.level));
  }
  if (availablePool.length < 4) availablePool = state.questions.slice();

  availablePool.sort(() => Math.random() - 0.5);

  const selected = [];

  // Spaced Repetition (Leitner System): If player has mistakes in notebook, prioritize 1 redemption card!
  if (state.mistake_words && state.mistake_words.length > 0) {
    const mistakeItem = state.mistake_words[Math.floor(Math.random() * state.mistake_words.length)];
    const matchingQ = state.questions.find(q => q.word === mistakeItem.word);
    if (matchingQ) {
      selected.push(Object.assign({}, matchingQ, { is_review_redemption: true }));
    }
  }

  // Fill up to 4 cards
  for (let q of availablePool) {
    if (selected.length >= 4) break;
    if (!selected.some(s => s.word === q.word)) {
      selected.push(q);
    }
  }

  shopCards = selected;
}

function highlightShopTabs() {
  ["cards", "weapons", "gadgets", "artifacts"].forEach((tab) => {
    const button = document.getElementById(`tab-${tab}-btn`);
    const selected = currentShopTab === tab;
    button.className = "tab-btn" + (selected ? " active" : "");
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  document.getElementById("shop-reroll-btn").style.display = currentShopTab === "cards" ? "inline-flex" : "none";
}

document.getElementById("tab-cards-btn").onclick = () => { clearShopAutoWaveTimer(); currentShopTab = "cards"; highlightShopTabs(); renderShopView(); };
document.getElementById("tab-weapons-btn").onclick = () => { clearShopAutoWaveTimer(); currentShopTab = "weapons"; highlightShopTabs(); renderShopView(); };
document.getElementById("tab-gadgets-btn").onclick = () => { clearShopAutoWaveTimer(); currentShopTab = "gadgets"; highlightShopTabs(); renderShopView(); };
document.getElementById("tab-artifacts-btn").onclick = () => { clearShopAutoWaveTimer(); currentShopTab = "artifacts"; highlightShopTabs(); renderShopView(); };
const shopTabIds = ["cards", "weapons", "gadgets", "artifacts"];
shopTabIds.forEach((tab, index) => {
  document.getElementById(`tab-${tab}-btn`).onkeydown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const target = event.key === "Home" ? 0 : event.key === "End" ? shopTabIds.length - 1
      : (index + (event.key === "ArrowRight" ? 1 : -1) + shopTabIds.length) % shopTabIds.length;
    const nextButton = document.getElementById(`tab-${shopTabIds[target]}-btn`);
    nextButton.focus();
    nextButton.click();
  };
});

document.getElementById("shop-reroll-btn").onclick = () => {
  clearShopAutoWaveTimer();
  if (state.ink_count >= 5) {
    state.ink_count -= 5;
    refreshShopCards();
    renderShopView();
    updateShopTopBar();
    updateHUD();
  }
};

document.getElementById("shop-next-wave-btn").onclick = advanceNextWave;

function renderShopView() {
  const grid = document.getElementById("shop-items-grid");
  grid.innerHTML = "";

  if (currentShopTab === "cards") {
    shopCards.forEach((c, idx) => {
      const isRedemption = !!c.is_review_redemption;
      const card = document.createElement("div");
      card.className = "choice-card shop-card";
      if (isRedemption) {
        card.classList.add("shop-redemption");
      }
      card.innerHTML = `
        <div class="shop-meta">
          <span>${c.type} · ${c.level}</span>
          ${isRedemption ? '<span class="shop-review-mark">Pekiştirme</span>' : '<span>Kelime kartı</span>'}
        </div>
        <h3 class="shop-title">${c.word}</h3>
        <div class="shop-description">${c.description}</div>
        <div class="shop-example">“${c.example || ''}”</div>
        <div class="shop-buy-row">
          <span class="shop-price">${c.cost} <img class="ui-icon" src="assets/ui/icons/ink.svg" alt=""> mürekkep</span>
          <button class="btn shop-buy" id="card-buy-${idx}" ${state.ink_count < c.cost ? "disabled" : ""}>${state.ink_count < c.cost ? "Mürekkep yetersiz" : "Sınavı başlat"}</button>
        </div>
      `;
      const buyBtn = card.querySelector(`#card-buy-${idx}`);
      const handleBuy = (e) => {
        if (e) {
          e.stopPropagation();
          if (e.cancelable) e.preventDefault();
        }
        triggerHaptic("light");
        openQuiz(c, idx);
      };
      if (buyBtn) {
        buyBtn.onclick = handleBuy;
      }
      card.onclick = (e) => {
        if (e.target !== buyBtn && state.ink_count >= c.cost) {
          handleBuy(e);
        }
      };
      grid.appendChild(card);
    });
  } else if (currentShopTab === "weapons") {
    Object.keys(WEAPONS_CATALOG).forEach(wId => {
      const w = WEAPONS_CATALOG[wId];
      const card = document.createElement("div");
      card.className = "choice-card shop-card";
      card.innerHTML = `
        <div class="shop-meta"><span>Silah</span><span>Teçhizat</span></div>
        <div style="display: flex; align-items: center; gap: 8px; margin: 2px 0;">
          <img src="assets/sprites/${w.sprite}" style="width: 32px; height: 32px; object-fit: contain;" alt="${w.name}">
          <h3 class="shop-title" style="min-width:0; overflow-wrap:anywhere;">${w.name}</h3>
        </div>
        <div class="shop-description">${w.desc}</div>
        <div class="shop-data">
          Hasar: ${w.damage} | Atış: ${w.cooldown}s
        </div>
        <div class="shop-buy-row"><span class="shop-price">${w.cost} <img class="ui-icon" src="assets/ui/icons/ink.svg" alt=""></span><button class="btn shop-buy" id="weap-buy-${wId}" ${state.ink_count < w.cost ? "disabled" : ""}>${state.ink_count < w.cost ? "Mürekkep yetersiz" : "Satın al"}</button></div>
      `;
      card.querySelector(`#weap-buy-${wId}`).onclick = () => {
        if (state.ink_count >= w.cost) {
          state.ink_count -= w.cost;
          if (state.equipped_weapons.length < state.max_weapon_slots) {
            state.equipped_weapons.push({ id: wId, tier: 1 });
          } else {
            state.reserve_weapons.push({ id: wId, tier: 1 });
          }
          syncWeapons();
          renderShopView();
          updateShopTopBar();
          updateHUD();
        }
      };
      grid.appendChild(card);
    });
  } else if (currentShopTab === "gadgets") {
    Object.keys(GADGETS_CATALOG).forEach(gId => {
      const g = GADGETS_CATALOG[gId];
      const isAct = state.active_gadget_id === gId;
      const isOwned = state.owned_gadgets.includes(gId);
      const card = document.createElement("div");
      card.className = "choice-card shop-card";
      card.innerHTML = `
        <div class="shop-meta"><span>Gereç</span><span>Aktif donanım</span></div>
        <div style="display: flex; align-items: center; gap: 8px; margin: 2px 0;">
          <img src="${g.icon}" style="width: 38px; height: 38px; object-fit: contain; flex: 0 0 auto;" alt="">
          <h3 class="shop-title">${g.name}</h3>
        </div>
        <div class="shop-description">${g.desc}</div>
        <div class="shop-data">
          Bekleme Süresi: ${Math.max(1.5, g.cooldown * state.gadget_cooldown_mult).toFixed(1)} sn
        </div>
        <div class="shop-buy-row"><span class="shop-price">${isAct ? 'Kuşanıldı' : isOwned ? 'Sahip' : (g.cost > 0 ? `${g.cost} mürekkep` : 'Ücretsiz')}</span><button class="btn shop-buy" id="gad-buy-${gId}" ${isAct || (!isOwned && state.ink_count < g.cost) ? 'disabled' : ''}>${isAct ? 'Kuşanıldı' : isOwned ? 'Kuşan' : (state.ink_count < g.cost ? 'Mürekkep yetersiz' : 'Satın al · kuşan')}</button></div>
      `;
      if (!isAct) {
        card.querySelector(`#gad-buy-${gId}`).onclick = () => {
          if (isOwned) {
            state.active_gadget_id = gId;
            renderShopView();
            updateShopTopBar();
            updateHUD();
          } else if (state.ink_count >= g.cost) {
            state.ink_count -= g.cost;
            state.owned_gadgets.push(gId);
            state.active_gadget_id = gId;
            renderShopView();
            updateShopTopBar();
            updateHUD();
          }
        };
      }
      grid.appendChild(card);
    });
  } else if (currentShopTab === "artifacts") {
    Object.keys(ARTIFACTS_CATALOG).forEach(aId => {
      const a = ARTIFACTS_CATALOG[aId];
      const isOwned = state.artifacts_owned.includes(aId);
      if (a.story_only && !isOwned) return;
      const card = document.createElement("div");
      card.className = "choice-card shop-card";
      card.innerHTML = `
        <div class="shop-meta"><span>Yadigâr</span><span>Pasif eser</span></div>
        <div style="display:flex;align-items:center;gap:9px;min-width:0;margin:2px 0;">
          <img src="${a.icon || "assets/sprites/relics/magnifying_glass.png"}" width="38" height="38" style="object-fit:contain;flex:0 0 auto;" alt="">
          <h3 class="shop-title" style="min-width:0;overflow-wrap:anywhere;">${a.name}</h3>
        </div>
        <div class="shop-description">${a.desc}</div>
        <div class="shop-buy-row"><span class="shop-price">${isOwned ? 'Sahip' : `${a.cost} mürekkep <img class="ui-icon" src="assets/ui/icons/ink.svg" alt="">`}</span><button class="btn shop-buy" id="art-buy-${aId}" ${isOwned || state.ink_count < a.cost || (aId === "slot_expansion" && state.max_weapon_slots >= 6) ? "disabled" : ""}>${isOwned ? 'Alındı' : (aId === "slot_expansion" && state.max_weapon_slots >= 6 ? 'Yuvalar dolu' : (state.ink_count < a.cost ? 'Mürekkep yetersiz' : 'Satın al'))}</button></div>
      `;
      if (!isOwned) {
        card.querySelector(`#art-buy-${aId}`).onclick = () => {
          if (aId === "slot_expansion" && state.max_weapon_slots >= 6) return;
          if (state.ink_count >= a.cost) {
            state.ink_count -= a.cost;
            state.artifacts_owned.push(aId);
            applyArtifact(a);
            renderShopView();
            updateShopTopBar();
            updateHUD();
          }
        };
      }
      grid.appendChild(card);
    });
  }
}

function applyArtifact(art) {
  Object.keys(art.stats || {}).forEach(k => {
    const val = art.stats[k];
    if (k === "max_hp") { state.max_hp += val; state.hp += val; }
    else if (k === "move_speed") state.move_speed += val;
    else if (k === "damage") state.damage_mult += val;
    else if (k === "attack_speed") state.attack_speed_mult += val;
    else if (k === "armor") state.armor = Math.min(0.85, state.armor + val);
    else if (k === "crit_chance") state.crit_chance = Math.min(1.0, state.crit_chance + val);
    else if (k === "ink_mult") state.ink_mult += val;
    else if (k === "gadget_cooldown_mult") state.gadget_cooldown_mult = Math.max(0.65, state.gadget_cooldown_mult + val);
    else if (k === "max_weapon_slots") state.max_weapon_slots = Math.min(6, state.max_weapon_slots + val);
  });
}

function openQuiz(card, cardIndex) {
  // Ensure quick menu is closed
  toggleMobileQuickMenu(false);

  const modal = document.getElementById("quiz-modal");
  modal.style.display = "flex";
  modal.classList.remove("hidden");
  syncMobileControlsVisibility();

  document.getElementById("quiz-word-title").textContent = `${card.word} [${card.type} • ${card.level}]`;
  document.getElementById("quiz-question-text").textContent = card.question;
  document.getElementById("quiz-example-text").textContent = `Örnek Metin: "${card.example || ''}"`;

  const resText = document.getElementById("quiz-result-text");
  resText.textContent = "";

  const continueBtn = document.getElementById("quiz-continue-btn");
  continueBtn.style.display = "none";

  const optsContainer = document.getElementById("quiz-options-container");
  optsContainer.innerHTML = "";

  let answered = false;
  const shuffledOptions = card.options.map((text, originalIndex) => ({ text, originalIndex }));
  for (let i = shuffledOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
  }

  shuffledOptions.forEach((item, idx) => {
    const btn = document.createElement("button");
    btn.className = "quiz-opt-btn";
    btn.setAttribute("type", "button");
    btn.textContent = `${['A', 'B', 'C', 'D'][idx] || (idx + 1)}) ${item.text}`;

    const handleAnswer = (e) => {
      if (answered) return;
      if (e) {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
      }
      answered = true;

      btn.classList.add("active-press");
      optsContainer.querySelectorAll(".quiz-opt-btn").forEach(b => {
        b.disabled = true;
        b.style.pointerEvents = "none";
      });

      const isCorrect = item.originalIndex === card.correct_index;

      if (card.id && !state.asked_question_ids.includes(card.id)) {
        state.asked_question_ids.push(card.id);
      }

      if (isCorrect) {
        btn.style.setProperty("background", "#e6f4ea", "important");
        btn.style.setProperty("border-color", "#2e7d32", "important");
        btn.style.setProperty("color", "#1b4d2e", "important");
        sounds.quizSuccess();
        triggerHaptic("success");
        addFloatingText(state.player.x, state.player.y - 30, "KÂTİP MÜHRÜ · +%50", "#587767", 15);

        const discCost = Math.ceil(card.cost * 0.5);
        state.ink_count -= discCost;

        // Check if this was a mistake redemption from the notebook
        const mIdx = state.mistake_words.findIndex(m => m.word === card.word);
        if (mIdx !== -1) {
          state.mistake_words.splice(mIdx, 1);
          try { localStorage.setItem("lexicon_mistakes", JSON.stringify(state.mistake_words)); } catch(e){}
          state.hp = Math.min(state.max_hp, state.hp + 35);
          resText.textContent = `PEKİŞTİRME TAMAMLANDI · HATA DEFTERİNDEN SİLİNDİ\n%50 indirim, +%75 nitelik ve +35 HP yenilendi.\nÖdenen: ${discCost} mürekkep`;
          resText.style.color = "#1b4d2e";
          resText.style.background = "rgba(46, 125, 50, 0.22)";
          applyCardUpgrade(card, true, 1.75);
        } else {
          state.hp = Math.min(state.max_hp, state.hp + 25);
          resText.textContent = `DOĞRU CEVAP · KÂTİP MÜHRÜ KAZANILDI\n%50 indirim, +%50 nitelik ve +25 HP yenilendi.\nÖdenen: ${discCost} mürekkep`;
          resText.style.color = "#1b4d2e";
          resText.style.background = "rgba(46, 125, 50, 0.15)";
          applyCardUpgrade(card, true, 1.5);
        }
      } else {
        btn.style.setProperty("background", "#fce8e6", "important");
        btn.style.setProperty("border-color", "#c5221f", "important");
        btn.style.setProperty("color", "#8b0000", "important");

        // Highlight correct option in green
        const allBtns = optsContainer.querySelectorAll(".quiz-opt-btn");
        const correctDisplayIndex = shuffledOptions.findIndex(option => option.originalIndex === card.correct_index);
        if (allBtns[correctDisplayIndex]) {
          allBtns[correctDisplayIndex].style.setProperty("background", "#e6f4ea", "important");
          allBtns[correctDisplayIndex].style.setProperty("border-color", "#2e7d32", "important");
          allBtns[correctDisplayIndex].style.setProperty("color", "#1b4d2e", "important");
        }

        sounds.quizFail();
        triggerHaptic("fail");
        addFloatingText(state.player.x, state.player.y - 30, "YANLIŞ CEVAP", "#c5221f", 15);

        state.ink_count -= card.cost;
        resText.textContent = `YANLIŞ CEVAP! Doğru Seçenek: "${card.options[card.correct_index]}"\nKelime Kâtip Hata Defterine eklendi (sonraki turlarda pekiştirilecek)!\nÖdenen: ${card.cost} Mürekkep`;
        resText.style.color = "#8b0000";
        resText.style.background = "rgba(139, 0, 0, 0.12)";
        applyCardUpgrade(card, false, 1.0);

        // Record into persistent mistake notebook
        const existing = state.mistake_words.find(m => m.word === card.word);
        if (existing) {
          existing.fail_count = (existing.fail_count || 1) + 1;
          existing.last_failed_wave = state.current_wave;
        } else {
          state.mistake_words.push({
            id: card.id,
            word: card.word,
            type: card.type,
            level: card.level,
            question: card.question,
            correct_answer: card.options[card.correct_index],
            example: card.example || "",
            fail_count: 1,
            last_failed_wave: state.current_wave
          });
        }
        try { localStorage.setItem("lexicon_mistakes", JSON.stringify(state.mistake_words)); } catch(e){}
      }

      shopCards.splice(cardIndex, 1);
      continueBtn.style.display = "inline-flex";
      updateHUD();
    };

    btn.onclick = handleAnswer;
    optsContainer.appendChild(btn);
  });

  const handleContinue = (e) => {
    if (e) {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    }
    triggerHaptic("light");
    modal.style.display = "none";
    modal.classList.add("hidden");
    renderShopView();
    updateShopTopBar();
    updateHUD();
    syncMobileControlsVisibility();
  };

  continueBtn.onclick = handleContinue;
}

function applyCardUpgrade(card, quizBonus, customMultiplier) {
  state.words_learned.push(card.word);
  const mult = customMultiplier || (quizBonus ? 1.5 : 1.0);
  const val = (card.value || 0) * mult;

  switch (card.stat) {
    case "max_hp": state.max_hp += val; state.hp += val; break;
    case "heal": state.hp = Math.min(state.max_hp, state.hp + val); break;
    case "move_speed": state.move_speed += val; break;
    case "damage": state.damage_mult += val; break;
    case "attack_speed": state.attack_speed_mult += val; break;
    case "pickup_radius": state.pickup_radius += val; break;
    case "pierce": state.pierce_count += Math.round(val); break;
    case "projectile_count": state.projectile_count += Math.round(val); break;
    case "armor": state.armor = Math.min(0.85, state.armor + val); break;
    case "crit_chance": state.crit_chance = Math.min(1.0, state.crit_chance + val); break;
  }
  checkSynergies();
}

function checkSynergies() {
  const counts = {};
  state.words_learned.forEach(wName => {
    const q = state.questions.find(x => x.word === wName);
    if (q) counts[q.type] = (counts[q.type] || 0) + 1;
  });

  if ((counts["Adjective"] || 0) >= 3 && !state.active_synergies["Swift Linguist"]) {
    state.active_synergies["Swift Linguist"] = true;
    state.move_speed += 40.0;
    triggerSynergyBanner("Swift Linguist", "+40 Hareket Hızı (3 Sıfat)");
  }
  if ((counts["Verb"] || 0) >= 3 && !state.active_synergies["Action Master"]) {
    state.active_synergies["Action Master"] = true;
    state.damage_mult += 0.28;
    triggerSynergyBanner("Action Master", "+%28 Hasar Gücü (3 Fiil)");
  }
  if ((counts["Prefix"] || 0) >= 2 && !state.active_synergies["Prefix Overdrive"]) {
    state.active_synergies["Prefix Overdrive"] = true;
    state.pierce_count += 2;
    triggerSynergyBanner("Prefix Overdrive", "+2 Delici Atış (2 Ön Ek)");
  }
  if ((counts["Grammar"] || 0) >= 3 && !state.active_synergies["Syntax Guardian"]) {
    state.active_synergies["Syntax Guardian"] = true;
    state.armor = Math.min(0.85, state.armor + 0.18);
    triggerSynergyBanner("Syntax Guardian", "+%18 Zırh (3 Dilbilgisi)");
  }
}

function triggerSynergyBanner(name, desc) {
  const banner = document.getElementById("synergy-banner");
  document.getElementById("syn-title").textContent = `YENİ SİNERJİ · ${name}`;
  document.getElementById("syn-desc").textContent = desc;
  banner.style.display = "block";
  setTimeout(() => { banner.style.display = "none"; }, 4500);
}

// =========================================
// 14. INVENTORY MODAL & COMBINE VIEW
// =========================================
function renderInventoryView() {
  const weaponsPanel = document.getElementById("inventory-weapons-panel");
  const gadgetsPanel = document.getElementById("inventory-gadgets-panel");
  const weaponsTab = document.getElementById("inventory-weapons-tab");
  const gadgetsTab = document.getElementById("inventory-gadgets-tab");
  const showingGadgets = state.inventory_category === "gadgets";
  weaponsPanel.style.display = showingGadgets ? "none" : "block";
  gadgetsPanel.style.display = showingGadgets ? "block" : "none";
  weaponsTab.classList.toggle("active", !showingGadgets);
  gadgetsTab.classList.toggle("active", showingGadgets);
  weaponsTab.setAttribute("aria-selected", String(!showingGadgets));
  gadgetsTab.setAttribute("aria-selected", String(showingGadgets));
  if (showingGadgets) {
    const gadgetList = document.getElementById("inv-gadgets-list");
    if (typeof gadgetList.replaceChildren === "function") gadgetList.replaceChildren(); else gadgetList.innerHTML = "";
    for (const gadgetId of state.owned_gadgets) {
      const gadget = GADGETS_CATALOG[gadgetId];
      if (!gadget) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "inventory-gadget-card";
      button.setAttribute("role", "button");
      button.setAttribute("aria-pressed", String(state.active_gadget_id === gadgetId));
      const icon = document.createElement("img");
      icon.src = gadget.icon || "assets/sprites/gadgets/eraser_dash.png";
      icon.alt = "";
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = `${state.active_gadget_id === gadgetId ? "KUŞANILDI · " : ""}${gadget.name}`;
      const description = document.createElement("small");
      description.textContent = gadget.desc || gadget.description || "Aktif gereç";
      copy.append(name, description);
      button.append(icon, copy);
      button.addEventListener("click", () => {
        state.active_gadget_id = gadgetId;
        updateHUD();
        toggleInventoryModal(false);
      });
      gadgetList.appendChild(button);
    }
    if (!gadgetList.children.length) {
      const empty = document.createElement("p");
      empty.className = "inventory-gadget-note";
      empty.textContent = "Henüz gereç yok. Dalgalar arasındaki dükkândan bir gereç kuşan.";
      gadgetList.appendChild(empty);
    }
    return;
  }
  const activeContainer = document.getElementById("inv-active-slots");
  const reserveContainer = document.getElementById("inv-reserve-slots");
  activeContainer.innerHTML = "";
  reserveContainer.innerHTML = "";

  // Active Slots (up to max_weapon_slots)
  for (let i = 0; i < state.max_weapon_slots; i++) {
    const item = state.equipped_weapons[i];
    const box = document.createElement("div");
    box.className = "slot-box" + (i === state.active_weapon_index ? " active-weapon" : "");
    if (item) {
      const w = WEAPONS_CATALOG[item.id];
      const t = TIER_MULTIPLIERS[item.tier];
      box.innerHTML = `
        <span class="tier-badge ${t.badge}">${t.stars} ${t.name}</span>
        <img src="assets/sprites/${w.sprite}" style="width: 32px; height: 32px;" alt="${w.name}">
        <span style="font-size: 11px; font-weight: bold; color: #2b170c;">${w.name.split(" ")[0]}</span>
        <button class="btn" style="font-size: 10px; padding: 2px 6px;" id="inv-unequip-${i}">Çantaya Al</button>
      `;
      box.querySelector(`#inv-unequip-${i}`).onclick = () => {
        if (state.equipped_weapons.length > 1) {
          state.reserve_weapons.push(item);
          state.equipped_weapons.splice(i, 1);
          state.active_weapon_index = 0;
          syncWeapons();
          renderInventoryView();
          updateHUD();
        }
      };
    } else {
      box.innerHTML = `<span style="font-size: 11px; color: #78350f;">[BOŞ YUVA ${i + 1}]</span>`;
    }
    activeContainer.appendChild(box);
  }

  // Reserve Backpack
  state.reserve_weapons.forEach((item, idx) => {
    const w = WEAPONS_CATALOG[item.id];
    const t = TIER_MULTIPLIERS[item.tier];
    const box = document.createElement("div");
    box.className = "slot-box";
    box.innerHTML = `
      <span class="tier-badge ${t.badge}">${t.stars} ${t.name}</span>
      <img src="assets/sprites/${w.sprite}" style="width: 28px; height: 28px;" alt="${w.name}">
      <span style="font-size: 10.5px; font-weight: bold; color: #2b170c;">${w.name.split(" ")[0]}</span>
      <button class="btn btn-emerald" style="font-size: 10px; padding: 2px 6px;" id="inv-equip-${idx}">Kuşan</button>
    `;
    box.querySelector(`#inv-equip-${idx}`).onclick = () => {
      if (state.equipped_weapons.length < state.max_weapon_slots) {
        state.equipped_weapons.push(item);
        state.reserve_weapons.splice(idx, 1);
      } else {
        // Swap with active weapon
        const temp = state.equipped_weapons[state.active_weapon_index];
        state.equipped_weapons[state.active_weapon_index] = item;
        state.reserve_weapons[idx] = temp;
      }
      syncWeapons();
      renderInventoryView();
      updateHUD();
    };
    reserveContainer.appendChild(box);
  });

  // Check Combinable weapons
  const allWeapons = state.equipped_weapons.concat(state.reserve_weapons);
  let canCombine = null;
  for (let i = 0; i < allWeapons.length; i++) {
    for (let j = i + 1; j < allWeapons.length; j++) {
      if (allWeapons[i].id === allWeapons[j].id && allWeapons[i].tier === allWeapons[j].tier && allWeapons[i].tier < 4) {
        canCombine = { id: allWeapons[i].id, tier: allWeapons[i].tier };
        break;
      }
    }
    if (canCombine) break;
  }

  const combineBtn = document.getElementById("inv-combine-btn");
  if (canCombine) {
    combineBtn.style.display = "inline-flex";
    combineBtn.textContent = `[${WEAPONS_CATALOG[canCombine.id].name.split(" ")[0]}] BİRLEŞTİR → ${TIER_MULTIPLIERS[canCombine.tier + 1].name}`;
    combineBtn.onclick = () => {
      // Find and merge
      let foundFirst = false;
      let targetTier = canCombine.tier;
      // Search active
      for (let i = state.equipped_weapons.length - 1; i >= 0; i--) {
        if (state.equipped_weapons[i].id === canCombine.id && state.equipped_weapons[i].tier === targetTier) {
          if (!foundFirst) {
            state.equipped_weapons[i].tier++;
            foundFirst = true;
          } else {
            state.equipped_weapons.splice(i, 1);
            break;
          }
        }
      }
      if (!foundFirst) {
        for (let i = state.reserve_weapons.length - 1; i >= 0; i--) {
          if (state.reserve_weapons[i].id === canCombine.id && state.reserve_weapons[i].tier === targetTier) {
            if (!foundFirst) {
              state.reserve_weapons[i].tier++;
              foundFirst = true;
            } else {
              state.reserve_weapons.splice(i, 1);
              break;
            }
          }
        }
      } else {
        // Also remove second if in reserve
        for (let i = state.reserve_weapons.length - 1; i >= 0; i--) {
          if (state.reserve_weapons[i].id === canCombine.id && state.reserve_weapons[i].tier === targetTier) {
            state.reserve_weapons.splice(i, 1);
            break;
          }
        }
      }
      sounds.quizSuccess();
      syncWeapons();
      renderInventoryView();
      updateHUD();
    };
  } else {
    combineBtn.style.display = "none";
  }

  // Summary stats
  document.getElementById("inv-stats-summary").textContent =
    `Can: ${Math.round(state.hp)}/${Math.round(state.max_hp)} | Hasar: ${state.damage_mult.toFixed(2)}x | ` +
    `Atış Hızı: ${state.attack_speed_mult.toFixed(2)}x | Zırh: %${Math.round(state.armor * 100)} | ` +
    `Kritik: %${Math.round(state.crit_chance * 100)} | Hız: ${Math.round(state.move_speed)} | Yuvalar: ${state.equipped_weapons.length}/${state.max_weapon_slots}`;
}

// =========================================
// 15. HUD UPDATE
// =========================================
let hudElements = null;
function getHUDElements() {
  if (!hudElements) {
    hudElements = {
      hpFill: document.getElementById("hp-fill"),
      hpText: document.getElementById("hp-text"),
      timerBadge: document.getElementById("timer-badge"),
      inkValue: document.getElementById("ink-value"),
      killValue: document.getElementById("kill-value"),
      charDiffInfo: document.getElementById("char-diff-info"),
      weaponsInfo: document.getElementById("weapons-info"),
      gadgetPanelIcon: document.getElementById("gadget-panel-icon"),
      gadgetPanelName: document.getElementById("gadget-panel-name"),
      gadgetStatus: document.getElementById("gadget-status")
    };
  }
  return hudElements;
}

function setHUDText(id, text) {
  const hud = getHUDElements();
  const node = hud[id] || document.getElementById(id);
  const value = String(text);
  if (node && node.textContent !== value) node.textContent = value;
}

let lastHUDThrottleTime = 0;
function updateHUD(force = false) {
  const hud = getHUDElements();
  if (!hud.hpFill) return;

  const hpPct = Math.max(0, (state.hp / state.max_hp) * 100);
  const hpWidth = `${hpPct}%`;
  if (hud.hpFill.style.width !== hpWidth) hud.hpFill.style.width = hpWidth;
  if (hud.hpText) {
    const hpStr = `${Math.round(state.hp)} / ${Math.round(state.max_hp)} HP`;
    if (hud.hpText.textContent !== hpStr) hud.hpText.textContent = hpStr;
  }

  // Throttle secondary text updates to ~10Hz (100ms) to eliminate mobile DOM layout thrashing
  const now = performance.now();
  if (!force && now - lastHUDThrottleTime < 100) return;
  lastHUDThrottleTime = now;

  const biomeName = state.current_wave < 26 ? "KÜTÜPHANE" : state.current_wave < 51 ? "DEHLİZ" : state.current_wave < 76 ? "GÖZLEMEVİ" : "SON SAYFA";
  const compactHud = window.innerWidth <= 700;
  const timerStr = compactHud
    ? `TUR ${state.current_wave} / 100 · ${Math.ceil(state.wave_time_left)}s`
    : `${biomeName} · ${state.current_wave} / 100 · ${Math.ceil(state.wave_time_left)}s`;
  if (hud.timerBadge && hud.timerBadge.textContent !== timerStr) hud.timerBadge.textContent = timerStr;

  const inkStr = String(state.ink_count);
  if (hud.inkValue && hud.inkValue.textContent !== inkStr) hud.inkValue.textContent = inkStr;

  const killStr = String(state.kill_count);
  if (hud.killValue && hud.killValue.textContent !== killStr) hud.killValue.textContent = killStr;

  const c = CHARACTERS[state.selected_char];
  const d = DIFFICULTIES[state.difficulty];
  if (c && d && hud.charDiffInfo) {
    const cdStr = `${c.name} · ${d.name}`;
    if (hud.charDiffInfo.textContent !== cdStr) hud.charDiffInfo.textContent = cdStr;
  }

  // Slotted weapons preview
  const weaponsEl = hud.weaponsInfo;
  if (weaponsEl) {
    const weaponRenderKey = state.equipped_weapons.map((item, idx) => `${item.id}:${item.tier}:${idx === state.active_weapon_index ? 1 : 0}`).join("|");
    if (weaponsEl.dataset.renderKey !== weaponRenderKey) {
      weaponsEl.dataset.renderKey = weaponRenderKey;
      weaponsEl.innerHTML = "";
      state.equipped_weapons.forEach((item, idx) => {
        const isAct = (idx === state.active_weapon_index);
        const w = WEAPONS_CATALOG[item.id] || { name: item.id };
        const t = TIER_MULTIPLIERS[item.tier] || TIER_MULTIPLIERS[1];
        const badge = document.createElement("span");
        badge.style.cursor = "pointer";
        badge.style.padding = "2px 6px";
        badge.style.borderRadius = "3px";
        badge.style.marginRight = "4px";
        badge.style.display = "inline-flex";
        badge.style.alignItems = "center";
        badge.style.gap = "3px";
        badge.style.pointerEvents = "auto";
        badge.style.fontFamily = "'IBM Plex Sans', sans-serif";
        badge.style.fontSize = "11px";

        if (isAct) {
          badge.style.background = "#263d39";
          badge.style.border = "1px solid #70988d";
          badge.style.color = "#f1ead7";
          badge.style.fontWeight = "bold";
          badge.textContent = `${idx + 1} · ${w.name.split(" ")[0]} ${t.stars}`;
        } else {
          badge.style.background = "rgba(25, 31, 29, 0.82)";
          badge.style.border = "1px solid rgba(213, 204, 183, 0.25)";
          badge.style.color = "#d7cfbc";
          badge.textContent = `${idx + 1} · ${w.name.split(" ")[0]}`;
        }
        badge.onclick = (ev) => {
          ev.stopPropagation();
          selectWeaponIndex(idx);
        };
        weaponsEl.appendChild(badge);
      });
    }
  }

  // Gadget badge
  const gData = GADGETS_CATALOG[state.active_gadget_id] || GADGETS_CATALOG["eraser_dash"];
  if (gData) {
    const gadgetIcon = gData.icon || gData.sprite || "assets/sprites/gadgets/eraser_dash.png";
    const gadgetIconNode = hud.gadgetPanelIcon;
    if (gadgetIconNode) {
      const nextGadgetIcon = gadgetIcon.startsWith("assets/") ? gadgetIcon : `assets/sprites/${gadgetIcon}`;
      if (gadgetIconNode.getAttribute("src") !== nextGadgetIcon) gadgetIconNode.src = nextGadgetIcon;
    }
    const gpNameStr = `${gData.name.split(" ")[0]} [SPACE]:`;
    if (hud.gadgetPanelName && hud.gadgetPanelName.textContent !== gpNameStr) hud.gadgetPanelName.textContent = gpNameStr;
    const gStatus = hud.gadgetStatus;
    if (gStatus) {
      if (state.gadget_timer <= 0.05) {
        if (gStatus.textContent !== "HAZIR") gStatus.textContent = "HAZIR";
        gStatus.style.color = "#a9bda9";
      } else {
        const cooldownText = state.gadget_timer.toFixed(1) + "s";
        if (gStatus.textContent !== cooldownText) gStatus.textContent = cooldownText;
        gStatus.style.color = "#c89a87";
      }
    }
  }
}

// =========================================
// 16. RENDERING
// =========================================
let cachedLightGrad = null;
let cachedLightW = 0;
let cachedLightH = 0;
function getCachedLightGrad(cContext, w, h) {
  if (cachedLightGrad && cachedLightW === w && cachedLightH === h) {
    return cachedLightGrad;
  }
  cachedLightW = w;
  cachedLightH = h;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.max(w, h) * 0.55;
  cachedLightGrad = cContext.createRadialGradient(cx, cy, 140, cx, cy, maxR);
  cachedLightGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
  cachedLightGrad.addColorStop(0.65, "rgba(8, 4, 3, 0.20)");
  cachedLightGrad.addColorStop(1, "rgba(4, 2, 2, 0.72)");
  return cachedLightGrad;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const p = state.player;

  ctx.save();

  // Screen shake impact (strictly 0 when disabled to eliminate camera jitter)
  let shakeX = 0, shakeY = 0;
  if (window.gameSettings && window.gameSettings.screenShake && state.screen_shake > 0) {
    shakeX = (Math.random() - 0.5) * Math.min(8, state.shake_intensity);
    shakeY = (Math.random() - 0.5) * Math.min(8, state.shake_intensity);
  }
  ctx.translate(cx + shakeX, cy + shakeY);

  // Dynamic Camera Zoom: On mobile/tablets, zoom in so action is big, punchy and clear!
  const isTouchOrSmall = window.innerWidth <= 1080 || ('ontouchstart' in window);
  const zoom = isTouchOrSmall ? (window.innerWidth < 650 ? 1.38 : 1.20) : 1.0;
  if (zoom !== 1.0) {
    ctx.scale(zoom, zoom);
  }
  ctx.translate(-p.x, -p.y);

  // Viewport Culling Bounds (Skips off-screen entities to maximize mobile 60fps)
  const halfViewW = (canvas.width / zoom) * 0.5 + 130;
  const halfViewH = (canvas.height / zoom) * 0.5 + 130;
  const camX = p.x;
  const camY = p.y;
  const isEntityVisible = (ex, ey, margin = 40) => {
    return Math.abs(ex - camX) <= halfViewW + margin && Math.abs(ey - camY) <= halfViewH + margin;
  };
  const allowShadows = (!isTouchOrSmall) && (window.gameSettings?.visualQuality === "high");

  // 4 Dynamic Biomes based on progression across 100 Waves
  let frameSprite = "upgrade_v1/arena_frame_library.png";
  let runeSprite = "magical_rune_circle.png";
  let propSprite = "illuminated_lectern.png";
  let brazierFlameColor = "rgba(255, 180, 50, ";
  let ambientMoteColor = "rgba(255, 215, 0, ";

  if (state.current_wave >= 76) {
    // Biome 4: The Omega Void Sanctum (Waves 76-100)
    frameSprite = "upgrade_v1/arena_frame_void.png";
    runeSprite = "magical_rune_void.png";
    propSprite = "brazier_pedestal.png";
    brazierFlameColor = "rgba(239, 68, 68, ";
    ambientMoteColor = "rgba(248, 113, 113, ";
  } else if (state.current_wave >= 51) {
    // Biome 3: Astral Observatory of Cosmic Etymology (Waves 51-75)
    frameSprite = "upgrade_v1/arena_frame_observatory.png";
    runeSprite = "magical_rune_astral.png";
    propSprite = "brazier_pedestal.png";
    brazierFlameColor = "rgba(168, 85, 247, ";
    ambientMoteColor = "rgba(192, 132, 252, ";
  } else if (state.current_wave >= 26) {
    // Biome 2: Forbidden Catacombs of Forgotten Words (Waves 26-50)
    frameSprite = "upgrade_v1/arena_frame_dungeon.png";
    runeSprite = "magical_rune_cyan.png";
    propSprite = "brazier_pedestal.png";
    brazierFlameColor = "rgba(34, 211, 238, ";
    ambientMoteColor = "rgba(103, 232, 249, ";
  }

  // One full arena illustration keeps the playable surface coherent and avoids
  // a high-contrast repeating tile beneath the characters.
  ctx.fillStyle = "#0a0e0c";
  ctx.fillRect(-ARENA_LAYOUT.width / 2, -ARENA_LAYOUT.height / 2, ARENA_LAYOUT.width, ARENA_LAYOUT.height);
  const frameImg = images[frameSprite];
  if (frameImg) {
    // The library is one fixed room in world space; its frame no longer follows
    // the camera, and sprite extents stay inside the visible shelf line.
    ctx.drawImage(frameImg, -ARENA_LAYOUT.width / 2, -ARENA_LAYOUT.height / 2, ARENA_LAYOUT.width, ARENA_LAYOUT.height);
  }

  // Central Double-Rotating Magical Rune Circle
  state.rune_rotation += 0.003;
  const runeImg = images[runeSprite] || images["magical_rune_circle.png"];
  if (runeImg) {
    ctx.save();
    ctx.translate(0, 0);
    ctx.rotate(state.rune_rotation);
    ctx.globalAlpha = 0.30 + Math.sin(state.rune_rotation * 4) * 0.05;
    ctx.drawImage(runeImg, -210, -210, 420, 420);
    ctx.restore();

    // Inner counter-rotating magical glyph core
    ctx.save();
    ctx.translate(0, 0);
    ctx.rotate(-state.rune_rotation * 1.5);
    ctx.globalAlpha = 0.18;
    ctx.drawImage(runeImg, -110, -110, 220, 220);
    ctx.restore();
  }

  // Four Corner Environmental Props with Animated Flames & Floor Light Halos
  const now = performance.now();
  const cornerProps = [[-900, -650], [900, -650], [-900, 650], [900, 650]];
  cornerProps.forEach(([bx, by], idx) => {
    if (!isEntityVisible(bx, by, 110)) return;
    // Floor ambient radial glow - on high quality use gradient, on medium/low use soft arc
    if (allowShadows) {
      const bGlow = ctx.createRadialGradient(bx, by - 12, 10, bx, by - 12, 96);
      bGlow.addColorStop(0, brazierFlameColor + "0.20)");
      bGlow.addColorStop(1, brazierFlameColor + "0)");
      ctx.fillStyle = bGlow;
    } else {
      ctx.fillStyle = brazierFlameColor + "0.10)";
    }
    ctx.beginPath();
    ctx.arc(bx, by - 12, 85, 0, Math.PI * 2);
    ctx.fill();

    // Prop Sprite (Lectern or Brazier Pedestal)
    const pImg = images[propSprite] || images["brazier_pedestal.png"] || images["illuminated_lectern.png"];
    if (pImg) {
      ctx.drawImage(pImg, bx - 26, by - 26, 52, 52);
    }

    // Dancing flame particles
    for (let f = 0; f < 2; f++) {
      const fAngle = now * 0.005 + idx * 1.5 + f * 2.1;
      const fOffset = Math.sin(fAngle) * 4;
      const fRadius = 4.5 + Math.sin(fAngle * 2) * 2;
      ctx.fillStyle = brazierFlameColor + (0.75 + Math.sin(fAngle) * 0.25) + ")";
      ctx.beginPath();
      ctx.arc(bx + fOffset, by - 20 - f * 4, fRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Active Tactical Telegraphs (Warning Circles & Red Line Laser Guides)
  if (state.telegraphs) {
    state.telegraphs.forEach(tg => {
      if (tg.is_laser) {
        ctx.save();
        const pProg = Math.max(0, tg.timer / (tg.max_timer || 0.75));
        ctx.strokeStyle = tg.color || `rgba(255, 40, 40, ${0.45 + (1 - pProg) * 0.5})`;
        ctx.globalAlpha = 0.4 + (1 - pProg) * 0.55;
        ctx.lineWidth = 3.5 + (1 - pProg) * 3;
        ctx.setLineDash([14, 8]);
        ctx.beginPath();
        ctx.moveTo(tg.x1, tg.y1);
        ctx.lineTo(tg.x2, tg.y2);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(tg.x, tg.y);
        const pProg = Math.max(0, tg.timer / (tg.max_timer || 1.0));
        if (tg.is_boss_area) {
          const bossColor = tg.color || "#e45c54";
          const glow = 0.16 + (1 - pProg) * 0.34;
          ctx.globalAlpha = 1;
          ctx.fillStyle = bossColor + Math.round(glow * 255).toString(16).padStart(2, "0");
          ctx.beginPath(); ctx.arc(0, 0, tg.radius * (1 - pProg * 0.35), 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = bossColor; ctx.lineWidth = 2.5 + (1 - pProg) * 2;
          ctx.setLineDash(tg.kind === "rift" || tg.kind === "mirror" ? [5, 6] : []);
          ctx.beginPath(); ctx.arc(0, 0, tg.radius, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          for (let mark = 0; mark < 8; mark++) {
            const a = mark * Math.PI / 4 + performance.now() * 0.0003;
            const inner = tg.radius * 0.82, outer = tg.radius * 0.96;
            ctx.beginPath(); ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
            ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer); ctx.stroke();
          }
          ctx.restore();
          return;
        }
        const seal = images["upgrade_v1/threat_seal.png"];
        if (seal) {
          const sealSize = Math.min(88, Math.max(36, (tg.radius || 42) * 1.05));
          ctx.globalAlpha = 0.16 + (1 - pProg) * 0.36;
          ctx.drawImage(seal, -sealSize / 2, -sealSize / 2, sealSize, sealSize);
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = tg.is_bomb ? "rgba(249, 115, 22, 0.9)" : "rgba(239, 68, 68, 0.9)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, tg.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = tg.is_bomb ? `rgba(249, 115, 22, ${0.2 + (1 - pProg) * 0.35})` : `rgba(239, 68, 68, ${0.2 + (1 - pProg) * 0.35})`;
        ctx.beginPath();
        ctx.arc(0, 0, tg.radius * (1 - pProg), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  // Motes (Göz dinlendirici düşük modda gizlenir)
  if (!window.gameSettings || window.gameSettings.visualQuality !== "low") {
    ctx.fillStyle = ambientMoteColor + "0.35)";
    for (let mi = 0; mi < state.ambient_motes.length; mi++) {
      const m = state.ambient_motes[mi];
      m.x += Math.cos(m.angle) * m.speed * 0.016;
      m.y += Math.sin(m.angle) * m.speed * 0.016;
      if (m.x < -1150) m.x = 1150;
      if (m.x > 1150) m.x = -1150;
      if (m.y < -850) m.y = 850;
      if (m.y > 850) m.y = -850;
      if (!isEntityVisible(m.x, m.y, 10)) continue;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Ink puddles
  state.ink_puddles.forEach(puddle => {
    ctx.save();
    ctx.fillStyle = "rgba(20, 10, 40, 0.65)";
    ctx.strokeStyle = "#7c3aed";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(puddle.x, puddle.y, puddle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  // Turrets (with viewport culling)
  state.turrets.forEach(t => {
    if (!isEntityVisible(t.x, t.y, 44)) return;
    ctx.save();
    ctx.translate(t.x, t.y);
    const spr = images["scroll_turret.png"];
    if (spr) ctx.drawImage(spr, -22, -22, 44, 44);
    ctx.restore();
  });

  // Ink drops (with viewport culling)
  state.ink_drops.forEach(drop => {
    if (!isEntityVisible(drop.x, drop.y, 24)) return;
    if (images["ink_drop.png"]) {
      ctx.drawImage(images["ink_drop.png"], drop.x - 10, drop.y - 10, 20, 20);
    } else {
      ctx.fillStyle = "#5ce1e6";
      ctx.beginPath(); ctx.arc(drop.x, drop.y, 6, 0, Math.PI * 2); ctx.fill();
    }
  });

  // Health drops (Şifa Parşömeni) (with viewport culling)
  state.health_drops.forEach(drop => {
    if (!isEntityVisible(drop.x, drop.y, 28)) return;
    ctx.save();
    ctx.translate(drop.x, drop.y);
    const pulse = 1.0 + Math.sin(Date.now() * 0.007) * 0.18;
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgba(34, 197, 94, 0.35)";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✚", 0, 0.5);
    ctx.restore();
  });

  // Mines (with viewport culling)
  state.punctuation_mines.forEach(mine => {
    if (!isEntityVisible(mine.x, mine.y, 36)) return;
    ctx.save();
    ctx.translate(mine.x, mine.y);
    const s = 1.0 + Math.sin(mine.pulse) * 0.16;
    ctx.scale(s, s);
    const mSpr = images["punctuation_mine.png"];
    if (mSpr) ctx.drawImage(mSpr, -16, -16, 32, 32);
    if (!mine.detonated) {
      const fuseLeft = Math.max(0, mine.fuse_seconds - mine.fuse_elapsed);
      ctx.strokeStyle = fuseLeft < 0.35 ? "#ff6848" : "#e3bf67";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 20 + (1 - Math.min(1, fuseLeft / mine.fuse_seconds)) * 5, -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * (1 - fuseLeft / mine.fuse_seconds)); ctx.stroke();
    }
    ctx.restore();
  });

  state.weapon_fields.forEach(field => {
    ctx.save();
    const rune = field.impact === "rune";
    const tether = field.weapon_id === "word_loom";
    ctx.strokeStyle = tether ? "rgba(123,205,220,0.88)" : rune ? "rgba(244,114,182,0.8)" : "rgba(255,151,76,0.7)";
    ctx.fillStyle = tether ? "rgba(112,93,172,0.13)" : rune ? "rgba(244,114,182,0.10)" : "rgba(255,151,76,0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (tether) {
      ctx.setLineDash([5, 7]); ctx.globalAlpha = 0.62;
      ctx.beginPath(); ctx.moveTo(state.player.x, state.player.y); ctx.lineTo(field.x, field.y); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    ctx.restore();
  });

  // Shockwaves (Düşük görsel modda gözü yormamak için kapatılır)
  if (!window.gameSettings || window.gameSettings.visualQuality !== "low") {
    ctx.lineWidth = 3;
    for (let pi = 0; pi < state.particles.length; pi++) {
      const pt = state.particles[pi];
      pt.radius += 5.5;
      pt.alpha -= 0.05;
      if (pt.alpha > 0 && isEntityVisible(pt.x, pt.y, pt.radius + 10)) {
        ctx.strokeStyle = pt.color + Math.max(0, pt.alpha) + ")";
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2); ctx.stroke();
      }
    }
    fastCompact(state.particles, pt => pt.alpha > 0);
    if (state.particles.length > 35) state.particles.splice(0, state.particles.length - 35);
  } else {
    state.particles.length = 0;
  }

  // Enemy Projectiles (with viewport culling & mobile shadow optimization)
  state.enemy_projectiles.forEach(ep => {
    if (!isEntityVisible(ep.x, ep.y, 28)) return;
    ctx.save();
    ctx.translate(ep.x, ep.y);
    if (ep.color) {
      const r = ep.radius || 10;
      if (allowShadows) {
        ctx.shadowColor = ep.color;
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = ep.color;
      ctx.strokeStyle = "rgba(255,244,220,.9)"; ctx.lineWidth = 1.3;
      ctx.beginPath();
      if (ep.shape === "shard") {
        ctx.moveTo(0, -r * 1.5); ctx.lineTo(r * 0.7, 0); ctx.lineTo(0, r * 1.5); ctx.lineTo(-r * 0.7, 0); ctx.closePath();
      } else if (ep.shape === "ink") {
        ctx.ellipse(0, 0, r * 1.25, r * 0.7, Math.atan2(ep.dy, ep.dx), 0, Math.PI * 2);
      } else ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else {
      const spr = images["bullet_enemy_red.png"];
      if (spr) ctx.drawImage(spr, -10, -10, 20, 20);
      else { ctx.fillStyle = "#ff1744"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  });

  // Labels are reserved for nearby elites and bosses to keep crowds readable.
  const enemyLabelBoxes = [];

  // Enemies (with viewport culling)
  state.enemies.forEach(e => {
    if (!isEntityVisible(e.x, e.y, (e.size || 40) + 40)) return;
    if (e.behavior_phase === "windup" && (e.type === "Homophone Harpy" || e.type === "Run-on Reaper")) {
      const length = e.type === "Homophone Harpy" ? 340 : 280;
      const color = e.type === "Homophone Harpy" ? "rgba(255, 191, 71, 0.9)" : "rgba(248, 72, 76, 0.9)";
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 7]);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + e.attack_dx * length, e.y + e.attack_dy * length);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    if (e.type === "Idiom Imp" && e.behavior_phase === "windup") {
      const pulse = 1 + Math.sin(performance.now() * 0.018) * 0.08;
      ctx.save();
      ctx.fillStyle = "rgba(124, 58, 237, 0.14)";
      ctx.strokeStyle = "rgba(192, 132, 252, 0.95)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.puddle_target_x, e.puddle_target_y, 30 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    if (e.type === "Oxymoron Ogre" && e.behavior_phase === "windup") {
      const progress = 1 - e.behavior_timer / 0.84;
      ctx.save();
      ctx.strokeStyle = "rgba(251, 146, 60, 0.92)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 24 + 94 * progress, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(253, 224, 71, 0.48)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 118, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if ((e.type === "Run-on Reaper" || e.type === "Oxymoron Ogre") && e.behavior_phase === "recovery") {
      ctx.save();
      ctx.strokeStyle = "rgba(74, 222, 128, 0.78)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, (e.size || 40) * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Commander Aura Ring
    if (e.affix === "commander") {
      ctx.save();
      const ringAlpha = 0.25 + Math.sin(performance.now() * 0.006) * 0.15;
      ctx.strokeStyle = `rgba(234, 179, 8, ${ringAlpha + 0.35})`;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(e.x, e.y, 160, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(e.x, e.y);

    if (e.is_boss) {
      const pulse = 1 + Math.sin(performance.now() * (e.boss_phase === 3 ? 0.009 : 0.005) + (e.boss_phase || 1)) * 0.035;
      const radius = (e.size || 66) * 0.9 * pulse;
      ctx.save();
      ctx.globalAlpha = e.boss_phase === 3 ? 0.72 : 0.45;
      ctx.strokeStyle = e.boss_color || "#d95858";
      if (allowShadows) {
        ctx.shadowColor = e.boss_color || "#d95858";
        ctx.shadowBlur = e.boss_phase === 3 ? 22 : 12;
      }
      ctx.lineWidth = e.boss_phase === 3 ? 3.5 : 2.3;
      ctx.setLineDash([Math.max(8, radius * 0.25), Math.max(6, radius * 0.14)]);
      ctx.beginPath(); ctx.arc(0, 0, radius, performance.now() * -0.00042, Math.PI * 2 + performance.now() * -0.00042); ctx.stroke();
      ctx.setLineDash([]);
      for (let seal = 0; seal < 3; seal++) {
        const a = performance.now() * (seal % 2 ? 0.0011 : -0.0014) + seal * Math.PI * 2 / 3;
        const sx = Math.cos(a) * radius, sy = Math.sin(a) * radius;
        ctx.fillStyle = "#f2dfb0"; ctx.beginPath(); ctx.arc(sx, sy, e.boss_phase === 3 ? 4.5 : 3.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // Enraged Boss Aura
    if (e.enraged) {
      if (allowShadows) {
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 22;
      }
      ctx.fillStyle = "rgba(239, 68, 68, 0.28)";
      ctx.beginPath();
      ctx.arc(0, 0, (e.size || 60) * 0.75, 0, Math.PI * 2);
      ctx.fill();
      if (allowShadows) ctx.shadowBlur = 0;
    }

    if (e.facing_left) ctx.scale(-1, 1);

    const spr = images[e.sprite] || images[BOSS_SPRITE_FALLBACKS[e.sprite]] || images[e.type === "Red Pen Boss" ? "red_pen_boss.png" : e.type === "Lexicon Dragon Boss" ? "lexicon_dragon_boss.png" : ""];
    const sz = e.size || 36;
    const spriteSize = sz * 1.55;
    if (spr) {
      if (e.hit_flash_timer > 0) {
        // Düşük modda sert parlama yerine yumuşak %88 saydamlık, diğer modlarda %68
        ctx.globalAlpha = (window.gameSettings && window.gameSettings.visualQuality === "low") ? 0.88 : 0.68;
        ctx.drawImage(spr, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
        ctx.globalAlpha = 1.0;
      } else {
        ctx.drawImage(spr, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
      }
    }

    if (e.is_elite && images["elite_crown.png"]) {
      ctx.drawImage(images["elite_crown.png"], -10, -sz / 2 - 16, 20, 20);
    }

    // Shielded Frontal Arc Barrier
    if (e.affix === "shielded") {
      ctx.save();
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 3.5;
      if (allowShadows) {
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      ctx.arc(0, 0, sz * 0.68, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    if (e.max_hp > 150) {
      const barW = e.size || 40;
      const pct = Math.max(0, e.hp / e.max_hp);
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(e.x - barW / 2, e.y - (e.size / 2) - 10, barW, 4);
      ctx.fillStyle = e.enraged ? "#dc2626" : "#ff5252";
      ctx.fillRect(e.x - barW / 2, e.y - (e.size / 2) - 10, barW * pct, 4);
    }

    if ((e.is_boss || e.is_elite) && Math.hypot(e.x - state.player.x, e.y - state.player.y) < 520 && enemyLabelBoxes.length < 5) {
      const label = e.is_boss
        ? (e.type === "Lexicon Dragon Boss" ? "LEKSİKON EJDERHASI" : "KIRMIZI KALEM")
        : (e.label || "ELİT DÜŞMAN");
      ctx.font = "500 9px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      const labelWidth = Math.min(156, ctx.measureText(label).width);
      const labelY = e.y - (e.size / 2) - 14;
      const box = { left: e.x - labelWidth / 2 - 5, right: e.x + labelWidth / 2 + 5, top: labelY - 10, bottom: labelY + 4 };
      const overlapsLabel = enemyLabelBoxes.some(other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top);
      if (!overlapsLabel) {
        ctx.lineJoin = "round";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(15, 21, 18, 0.92)";
        ctx.strokeText(label, e.x, labelY, 156);
        ctx.fillStyle = e.is_boss ? "#e7dfcd" : "#d6ddd2";
        ctx.fillText(label, e.x, labelY, 156);
        enemyLabelBoxes.push(box);
      }
    }
  });

  // Projectiles (with viewport culling & shadowBlur optimization)
  state.projectiles.forEach(pr => {
    if (!isEntityVisible(pr.x, pr.y, 24)) return;
    ctx.save();
    ctx.translate(pr.x, pr.y);
    ctx.rotate(Math.atan2(pr.dy, pr.dx));

    const prSpr = pr.sprite ? images[pr.sprite] : null;
    if (prSpr && !pr.crit) {
      const sz = pr.size || 18;
      ctx.drawImage(prSpr, -sz / 2, -sz / 2, sz, sz);
    } else {
      ctx.fillStyle = pr.crit ? "#ffd700" : pr.color;
      if (allowShadows) {
        ctx.shadowColor = pr.color;
        ctx.shadowBlur = pr.crit ? 12 : 5;
      }
      ctx.fillRect(-8, -3, 16, 6);
    }
    ctx.restore();
  });

  // Weapon-aware hit confirmations. The eight generated pixel sprites stay short-lived and capped.
  state.hit_effects.forEach(effect => {
    const sprite = images[`effects/combat_hit_${effect.frame}.png`];
    if (!sprite) return;
    const progress = 1 - effect.lifetime / effect.max_lifetime;
    const scale = 0.72 + progress * (effect.heavy || effect.critical ? 0.5 : 0.36);
    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.rotate(Math.atan2(effect.dy, effect.dx));
    ctx.globalAlpha = Math.min(1, effect.lifetime / Math.min(0.07, effect.max_lifetime * 0.55));
    const size = effect.size * scale;
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  });

  // Player
  state.gadget_trails.forEach(trail => {
    const alpha = Math.min(0.55, trail.timer / 2);
    ctx.strokeStyle = `rgba(97, 230, 203, ${alpha})`;
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(trail.x - trail.dx * 33, trail.y - trail.dy * 33); ctx.lineTo(trail.x + trail.dx * 33, trail.y + trail.dy * 33); ctx.stroke();
  });
  state.gadget_cards.forEach(card => {
    const x = p.x + Math.cos(card.angle) * 43, y = p.y + Math.sin(card.angle) * 43;
    ctx.save(); ctx.translate(x, y); ctx.rotate(card.angle + Math.PI / 2);
    ctx.fillStyle = "#e9d79b"; ctx.strokeStyle = "#344255"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-7, -11, 14, 22, 3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#9a7043"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(3, -5); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.stroke(); ctx.restore();
  });
  state.gadget_decoys.forEach(decoy => {
    const sprite = images[CHARACTERS[state.selected_char]?.sprite];
    ctx.save(); ctx.globalAlpha = Math.min(0.65, decoy.timer / 1.5); ctx.globalCompositeOperation = "screen";
    if (sprite) ctx.drawImage(sprite, decoy.x - 24, decoy.y - 28, 48, 56);
    else { ctx.strokeStyle = "#8de6df"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(decoy.x, decoy.y, 22, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  });
  ctx.save();
  const playerPoseOffset = getLocomotionPoseOffset(p);
  ctx.translate(p.x + playerPoseOffset.x, p.y + playerPoseOffset.y);
  if (p.invuln_timer > 0 && Math.floor(performance.now() / 60) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }
  if (p.is_dashing && allowShadows) {
    ctx.shadowColor = "#55efc4"; ctx.shadowBlur = 25;
  }
  if (state.shield_charges > 0) {
    ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.stroke();
  }
  const aimDirection = getHeroActionDirection(p);
  const renderFacingLeft = p.is_dashing || p.shot_recoil_timer > 0
    ? getHorizontalFacing(Math.atan2(aimDirection.y, aimDirection.x), p.facing_left)
    : p.facing_left;
  if (renderFacingLeft) ctx.scale(-1, 1);

  const cData = CHARACTERS[state.selected_char];
  const isMoving = p.is_dashing || Math.hypot(p.vx, p.vy) > 30;
  const action = p.attack_anim_timer > 0
    ? (p.attack_anim_kind === "ranged" ? "ranged" : "attack")
    : isMoving ? "run" : "idle";
  const bodyDirection = aimDirection;
  const bodyTilt = Math.max(-0.38, Math.min(0.38, (bodyDirection?.y || 0) * 0.38));
  ctx.rotate(bodyTilt);
  const frame = action === "attack"
    ? getAttackAnimationFrame(p)
    : action === "run" ? getHeroRunFrameIndex(p.run_phase, getHeroRunFrameCount(state.selected_char)) : Math.floor(performance.now() / 240) % 4;
  const animationKey = state.selected_char === "inky" ? "inky"
    : state.selected_char === "quillmaster" ? "quillmaster"
    : state.selected_char === "word_knight" ? "word_knight"
    : state.selected_char === "rune_sorceress" ? "rune_sorceress"
    : state.selected_char === "lexicon_alchemist" ? "alchemist"
    : state.selected_char === "shadow_lexicographer" ? "shadow_scribe" : null;
  const actionAsset = action === "run" || action === "ranged" || action === "attack"
    ? `${animationKey}_${action}_v2_${frame}.png`
    : `${animationKey}_${action}_${frame}.png`;
  const actionSprite = animationKey
    ? images[`upgrade_v1/animations/${actionAsset}`]
    : null;
  const pSpr = actionSprite || images[cData.sprite] || images["player.png"];
  if (pSpr) ctx.drawImage(pSpr, -44, -44, 88, 88);
  ctx.restore();

  // Floating Slotted Weapons Arsenal
  state.weapons.forEach((w, idx) => {
    const root = getWeaponRootWorld(w, idx);
    const visual = root.visual || getWeaponVisual(w.id);
    if (!visual) return;
    const drawSize = visual.draw_size;
    const artAngle = visual.art_angle_deg * Math.PI / 180;
    const timing = MELEE_TIMINGS[w.id] ? getMeleeTiming(w.id) : null;
    let swingRotation = 0;
    if (timing && w.swing_timer > 0) {
      const elapsed = w.swing_elapsed || 0;
      if (elapsed < timing.windup) swingRotation = -0.28 * (elapsed / timing.windup);
      else if (elapsed < timing.windup + timing.active) {
        const phase = (elapsed - timing.windup) / timing.active;
        swingRotation = -0.36 + phase * 0.72;
      } else {
        const phase = Math.min(1, (elapsed - timing.windup - timing.active) / timing.recovery);
        swingRotation = 0.36 * (1 - phase);
      }
    }
    ctx.save();
    const isAct = (idx === state.active_weapon_index);
    ctx.translate(root.x, root.y);
    ctx.rotate(getWeaponRenderAngle(w.id, w.rotation, swingRotation));
    ctx.imageSmoothingEnabled = false;

    const wSpr = images[w.data.sprite];
    const weaponInHeroFrame = (state.selected_char === "inky" && w.id === "quill_blaster")
      || (state.selected_char === "quillmaster" && w.id === "syllable_shotgun")
      || (state.selected_char === "word_knight" && w.id === "dictionary_blade")
      || (state.selected_char === "rune_sorceress" && w.id === "rune_orb")
      || (state.selected_char === "shadow_lexicographer" && w.id === "calligraphy_katana");
    if (wSpr && !weaponInHeroFrame) {
      if (isAct && allowShadows) {
        ctx.shadowColor = "rgba(190, 156, 99, 0.45)";
        ctx.shadowBlur = 5;
      }
      ctx.drawImage(wSpr, -visual.grip[0] * drawSize, -visual.grip[1] * drawSize, drawSize, drawSize);
      ctx.shadowBlur = 0;
    }
    if (w.flash_timer > 0) {
      const muzzleX = (visual.muzzle[0] - visual.grip[0]) * drawSize;
      const muzzleY = (visual.muzzle[1] - visual.grip[1]) * drawSize;
      const flashAlpha = Math.min(0.9, w.flash_timer * 16) * (isAct ? 1 : 0.72);
      ctx.fillStyle = `rgba(255, 235, 169, ${flashAlpha})`;
      if (allowShadows) {
        ctx.shadowColor = "#ffd77a";
        ctx.shadowBlur = 7 + w.flash_timer * 55;
      }
      ctx.beginPath();
      ctx.ellipse(muzzleX, muzzleY, 2.5 + w.flash_timer * 30, 1.8 + w.flash_timer * 13, getWeaponFlashLocalAngle(w.id), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (timing && w.swing_timer > 0) {
      const elapsed = w.swing_elapsed || 0;
      const activeProgress = Math.max(0, Math.min(1, (elapsed - timing.windup) / timing.active));
      const inWindup = elapsed < timing.windup;
      const inRecovery = elapsed > timing.windup + timing.active;
      const recoveryProgress = inRecovery ? Math.min(1, (elapsed - timing.windup - timing.active) / timing.recovery) : 0;
      const alpha = inWindup ? 0.2 + (elapsed / timing.windup) * 0.25
        : inRecovery ? Math.max(0, 0.88 * (1 - recoveryProgress)) : 0.68 + Math.sin(activeProgress * Math.PI) * 0.25;
      const sweepOffset = -0.92 + activeProgress * 1.84;
      ctx.rotate(artAngle);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = w.id === "calligraphy_katana" ? "#bfeeff" : "#ffe5a6";
      if (allowShadows) {
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 4;
      }
      ctx.lineWidth = w.id === "calligraphy_katana" ? 4 : 3;
      ctx.beginPath();
      ctx.arc(5, 0, w.id === "calligraphy_katana" ? 52 : 45, sweepOffset - 1.0, sweepOffset + 0.62);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  });

  // Floating Combat Damage Numbers & Pickup Text
  if (state.floating_texts && state.floating_texts.length) {
    for (let fti = 0; fti < state.floating_texts.length; fti++) {
      const ft = state.floating_texts[fti];
      const prog = Math.max(0, ft.lifetime / ft.max_lifetime);
      ctx.save();
      ctx.font = `bold ${ft.size || 13}px 'IBM Plex Serif', serif`;
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = Math.min(1.0, prog * 1.6);
      ctx.textAlign = "center";
      if (allowShadows) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx.shadowBlur = 4;
      } else {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
        ctx.lineWidth = 2.5;
        ctx.strokeText(ft.text, ft.x, ft.y);
      }
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  ctx.restore();

  // Dynamic Atmospheric Player Radial Lighting & Dark Academia Vignette
  if (!window.gameSettings || window.gameSettings.visualQuality !== "low") {
    const lightGrad = getCachedLightGrad(ctx, canvas.width, canvas.height);
    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// =========================================
// 17. MAIN GAME LOOP
// =========================================
function gameLoop(now) {
  if (typeof window.flushJoystickKnob === "function") window.flushJoystickKnob();
  if (window.isGamePaused || state.is_inventory_open || state.is_mistakes_open) {
    lastTime = now;
    requestAnimationFrame(gameLoop);
    return;
  }
  const rawDt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  const dt = rawDt * (state.game_speed || 1.0);

  updateGame(dt);
  render();
  requestAnimationFrame(gameLoop);
}

window.weaponVisualTestApi = Object.freeze({
  snapshot: () => ({
    visualStatus: weaponVisualsStatus,
    visualError: weaponVisualsError,
    visuals: WEAPON_VISUALS,
    archetypes: WEAPON_ARCHETYPES,
    effectCount: state.hit_effects.length,
    hitEffectCap: 80,
    hitSpritesReady: Array.from({ length: 8 }, (_, frame) => images[`effects/combat_hit_${frame}.png`]).every(image => image?.complete && image.naturalWidth > 0)
  }),
  getWeaponMuzzleWorld,
  flashAxisWorld: (weaponId, aimAngle) => getWeaponRenderAngle(weaponId, aimAngle) + getWeaponFlashLocalAngle(weaponId),
  horizontalFacing: getHorizontalFacing,
  locomotionBobAt: getLocomotionBob,
  locomotionPose: getLocomotionPoseOffset,
  applyHitFeedback,
  meleeTiming: getMeleeTiming,
  simulateMeleeHit: (weaponId, enemies, aimAngle = 0, hitTargets = new Set()) => {
    const p = state.player;
    const previous = { x: p.x, y: p.y };
    p.x = 0; p.y = 0;
    const weapon = {
      id: weaponId, rotation: aimAngle, data: WEAPONS_CATALOG[weaponId],
      tier_data: TIER_MULTIPLIERS[1], hitTargets
    };
    const count = resolveMeleeWeaponHit(weapon, enemies);
    p.x = previous.x; p.y = previous.y;
    return count;
  },
  fireTestShot: (weaponId, aimAngle = 0) => {
    const p = state.player;
    const old = {
      weapons: state.weapons, active: state.active_weapon_index, projectiles: state.projectiles,
      player: { x: p.x, y: p.y, vx: p.vx, vy: p.vy, attack: p.attack_anim_timer, duration: p.attack_anim_duration, facing: p.facing_left },
      shoot: sounds.shoot
    };
    const weapon = {
      id: weaponId, data: WEAPONS_CATALOG[weaponId], tier_data: TIER_MULTIPLIERS[1],
      rotation: aimAngle, recoil: 0, flash_timer: 0, alt_side: false
    };
    state.weapons = [weapon]; state.active_weapon_index = 0; state.projectiles = [];
    p.x = 100; p.y = 200; p.vx = 0; p.vy = 0;
    sounds.shoot = () => {};
    try {
      shootWeapon(weapon, { x: p.x + Math.cos(aimAngle) * 100, y: p.y + Math.sin(aimAngle) * 100 }, 0);
      const projectile = state.projectiles[0];
      const expected = weaponMuzzleWorld(weapon, 0);
      return { projectile: { x: projectile?.x, y: projectile?.y }, expected, projectileCount: state.projectiles.length };
    } finally {
      state.weapons = old.weapons; state.active_weapon_index = old.active; state.projectiles = old.projectiles;
      p.x = old.player.x; p.y = old.player.y; p.vx = old.player.vx; p.vy = old.player.vy;
      p.attack_anim_timer = old.player.attack; p.attack_anim_duration = old.player.duration; p.facing_left = old.player.facing;
      sounds.shoot = old.shoot;
    }
  }
});

function runMineHazardRuntimeContract() {
  const old = { player: state.player, mines: state.punctuation_mines, enemies: state.enemies,
    particles: state.particles, fields: state.weapon_fields, shoot: sounds.shoot, detonate: sounds.detonateMine };
  try {
    state.player = { x: 0, y: 0, vx: 0, vy: 0, run_phase: 0, is_dashing: false,
      attack_anim_timer: 0, facing_left: false, last_aim: { x: 1, y: 0 } };
    state.punctuation_mines = []; state.enemies = []; state.particles = []; state.weapon_fields = [];
    sounds.shoot = () => {}; sounds.detonateMine = () => {};
    const weapon = { id: "punctuation_bomb", rotation: 0, tier: 1, tier_data: { damage: 1 },
      data: WEAPONS_CATALOG.punctuation_bomb, recoil: 0, flash_timer: 0 };
    dropPunctuationMine(weapon, null, 0);
    const mine = state.punctuation_mines[0];
    mine.fuse_elapsed = mine.fuse_seconds;
    updatePunctuationMines(0);
    return { detonated: mine.detonated, hazardRemaining: mine.hazard_seconds };
  } finally {
    state.player = old.player; state.punctuation_mines = old.mines; state.enemies = old.enemies;
    state.particles = old.particles; state.weapon_fields = old.fields;
    sounds.shoot = old.shoot; sounds.detonateMine = old.detonate;
  }
}

function runWordLoomRuntimeContract() {
  const old = { player: state.player, enemies: state.enemies, fields: state.weapon_fields,
    weapons: state.weapons, effects: state.hit_effects, shoot: sounds.shoot, damage: state.damage_mult,
    shake: state.screen_shake, shakeIntensity: state.shake_intensity, shakeCooldown: state.hit_feedback_shake_cooldown };
  try {
    state.player = { ...state.player, x: 0, y: 0, vx: 0, vy: 0, last_aim: { x: 1, y: 0 }, attack_anim_timer: 0 };
    state.weapon_fields = []; state.hit_effects = []; state.enemies = [];
    sounds.shoot = () => {};
    const enemy = { x: 70, y: 0, hp: 50, max_hp: 50, size: 32, dead: false, vx: 0, vy: 0, slow_timer: 0, slow_factor: 1 };
    state.enemies.push(enemy);
    const weapon = { id: "word_loom", tier: 1, tier_data: { damage: 1 }, data: WEAPONS_CATALOG.word_loom, rotation: 0 };
    placeWordLoomField(weapon, enemy);
    updateWeaponFields(0.05);
    const linkedEnemy = { x: 150, y: 0, hp: 50, max_hp: 50, size: 32, dead: false, vx: 0, vy: 0, slow_timer: 0, slow_factor: 1 };
    state.enemies.push(linkedEnemy); state.weapon_fields = []; weapon.tier = 4;
    placeWordLoomField(weapon, enemy);
    return { fieldCount: state.weapon_fields.filter(field => field.weapon_id === "word_loom").length,
      hp: enemy.hp, slowFactor: enemy.slow_factor,
      linkedCount: state.weapon_fields.filter(field => field.weapon_id === "word_loom").length };
  } finally {
    state.player = old.player; state.enemies = old.enemies; state.weapon_fields = old.fields;
    state.weapons = old.weapons; state.hit_effects = old.effects; sounds.shoot = old.shoot; state.damage_mult = old.damage;
    state.screen_shake = old.shake; state.shake_intensity = old.shakeIntensity; state.hit_feedback_shake_cooldown = old.shakeCooldown;
  }
}

function runKatanaSharedHitContract() {
  const old = { player: state.player, enemies: state.enemies, weapons: state.weapons, projectiles: state.projectiles,
    effects: state.hit_effects, texts: state.floating_texts };
  try {
    state.player = { x: 0, y: 0, vx: 0, vy: 0, run_phase: 0, is_dashing: false,
      attack_anim_timer: 0, facing_left: false };
    const enemy = { id: "katana-regression-target", x: 100, y: 0, hp: 200, size: 34, dead: false };
    const weapon = { id: "calligraphy_katana", rotation: 0, tier: 1,
      tier_data: { damage: 1 }, data: WEAPONS_CATALOG.calligraphy_katana, hitTargets: new Set() };
    state.enemies = [enemy]; state.weapons = [weapon]; state.projectiles = [];
    state.hit_effects = []; state.floating_texts = [];
    const damagePerHit = weapon.data.damage;
    resolveMeleeWeaponHit(weapon);
    spawnProjectile({ type: "katana_wave", x: enemy.x, y: enemy.y, dx: 1, dy: 0, dmg: damagePerHit,
      pierce: 1, spd: 0, size: 28, lifetime: 0.5, weapon_id: weapon.id, sharedHitTargets: weapon.hitTargets });
    updateProjectiles(1 / 60);
    return { hits: Math.round((200 - enemy.hp) / damagePerHit) };
  } finally {
    state.player = old.player; state.enemies = old.enemies; state.weapons = old.weapons; state.projectiles = old.projectiles;
    state.hit_effects = old.effects; state.floating_texts = old.texts;
  }
}

function runGuardParryRuntimeContract() {
  const old = { player: state.player, enemies: state.enemies, weapons: state.weapons,
    projectiles: state.projectiles, enemyProjectiles: state.enemy_projectiles,
    effects: state.hit_effects, texts: state.floating_texts };
  try {
    state.player = { x: 0, y: 0, vx: 0, vy: 0, run_phase: 0, is_dashing: false,
      attack_anim_timer: 0, facing_left: false };
    const enemy = { id: "guard-counter-target", x: 86, y: 12, hp: 200, size: 34, dead: false };
    const near = { x: 42, y: 20, dx: -1, dy: 0, spd: 160, damage: 1, lifetime: 2, dead: false };
    const far = { x: 260, y: 0, dx: -1, dy: 0, spd: 160, damage: 1, lifetime: 2, dead: false };
    const weapon = { id: "dictionary_blade", rotation: 0, tier: 3, tier_data: TIER_MULTIPLIERS[3],
      data: WEAPONS_CATALOG.dictionary_blade, hitTargets: new Set() };
    state.enemies = [enemy]; state.weapons = [weapon]; state.projectiles = [];
    state.enemy_projectiles = [near, far]; state.hit_effects = []; state.floating_texts = [];
    resolveMeleeWeaponHit(weapon);
    return { nearbyCleared: near.dead, farPreserved: !far.dead,
      counterShot: state.projectiles.some(projectile => projectile.type === "guard_counter") };
  } finally {
    state.player = old.player; state.enemies = old.enemies; state.weapons = old.weapons;
    state.projectiles = old.projectiles; state.enemy_projectiles = old.enemyProjectiles;
    state.hit_effects = old.effects; state.floating_texts = old.texts;
  }
}

window.weaponArchetypeTestApi = Object.freeze({
  snapshot: () => ({ status: weaponVisualsStatus, error: weaponVisualsError, archetypes: WEAPON_ARCHETYPES }),
  inkMultiplier: getCharacterInkMultiplier,
  getSignature: getWeaponSignature,
  getSignatureData: getWeaponArchetype,
  getEvolution: getWeaponEvolution,
  beamPhase: weaponId => elapsed => getWeaponRhythmPhase(weaponId, elapsed),
  shotgunFan: getShotgunFanAngles,
  minePhase: getMinePhase,
  simulateBoomerangPasses,
  clampBurnStacks,
  nextPistolSide: getNextPistolSide,
  canPlaceTurret,
  pickRuneChainTargets,
  runFrameIndex: getHeroRunFrameIndex,
  runFrameCount: getHeroRunFrameCount,
  heroActionDirection: getHeroActionDirection,
  rangedPoseContract: (weaponId, aim) => {
    const p = state.player;
    const old = { ...p };
    p.x = 0; p.y = 0; p.vx = 180; p.vy = 0; p.run_phase = 2; p.is_dashing = false; p.attack_anim_timer = 0;
    const before = getLocomotionPoseOffset(p);
    requestAttackPose(weaponId, "ranged", aim);
    const direction = getHeroActionDirection(p);
    const result = { attackTimer: p.attack_anim_timer, attackFrame: getAttackAnimationFrame(p), recoil: getShotRecoilOffset(p), before, after: getLocomotionPoseOffset(p),
      bodyDirection: direction, facingLeft: getHorizontalFacing(Math.atan2(direction.y, direction.x), p.facing_left) };
    Object.assign(p, old);
    return result;
  },
  getMeleePhase: getWeaponMeleePhase,
  sniperDamage: getSniperDamage,
  mineRuntimeContract: runMineHazardRuntimeContract,
  wordLoomRuntimeContract: runWordLoomRuntimeContract,
  katanaSharedHitContract: runKatanaSharedHitContract,
  guardParryContract: runGuardParryRuntimeContract,
  signsTurretAndRuneConsistently: () => getWeaponSignature("scroll_turret") === "place_focus_turret"
    && getWeaponSignature("rune_orb") === "pulse_bounce"
    && typeof updateTurrets === "function"
    && typeof updateProjectiles === "function"
});

function updateGame(dt) {
  if (window.isGamePaused || state.is_inventory_open || state.is_mistakes_open) {
    return;
  }
  if (state.is_wave_active) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateGadgetEffects(dt);
    updateHUD();
  }
}

window.render_game_to_text = () => JSON.stringify({
  coordinate_system: "arena origin at center; +x right, +y down",
  weapon_visuals: { status: weaponVisualsStatus, error: weaponVisualsError, effect_count: state.hit_effects.length },
  mode: state.hp <= 0 ? "gameover" : state.is_wave_active ? "wave" : (getComputedStyle(document.getElementById("shop-screen")).display !== "none" ? "shop" : "title"),
  wave: state.current_wave,
  wave_time_left: Number(state.wave_time_left.toFixed(1)),
  milestone_boss_delay: Number(state.milestone_boss_delay.toFixed(1)),
  weapon_fields: state.weapon_fields.map(field => ({ weapon_id: field.weapon_id || "", x: Math.round(field.x), y: Math.round(field.y), radius: Math.round(field.radius), lifetime: Number(field.lifetime.toFixed(1)) })),
  inventory_open: state.is_inventory_open,
  character: state.selected_char,
  player: {
    x: Math.round(state.player.x), y: Math.round(state.player.y),
    vx: Math.round(state.player.vx), vy: Math.round(state.player.vy),
    hp: Math.round(state.hp), max_hp: Math.round(state.max_hp),
    animation: state.player.attack_anim_timer > 0 ? (state.player.attack_anim_kind === "ranged" ? "ranged" : "attack") : Math.hypot(state.player.vx, state.player.vy) > 20 ? "run" : "idle",
    animation_phase: Number((state.player.run_phase % 8).toFixed(2)),
    body_tilt: Number(Math.max(-0.38, Math.min(0.38, ((state.player.attack_anim_timer > 0 ? state.player.last_aim?.y : state.player.vy) || 0) * 0.38)).toFixed(3)),
    locomotion_pose_offset: getLocomotionPoseOffset(state.player),
    body_recoil: getShotRecoilOffset(state.player),
    action_recovery: Number(state.player.attack_anim_timer.toFixed(2)),
    dashing: state.player.is_dashing, gadget_cooldown: Number(state.gadget_timer.toFixed(1))
  },
  enemies: state.enemies.filter(e => !e.dead).slice(0, 24).map(e => ({
    type: e.type, x: Math.round(e.x), y: Math.round(e.y), hp: Math.round(e.hp),
    speed: Number(e.speed.toFixed(1)), slow_timer: Number((e.slow_timer || 0).toFixed(1)),
    slow_factor: Number((e.slow_factor || 1).toFixed(2)), boss: !!e.is_boss
  })),
  weapons: state.weapons.map((weapon, index) => ({
    id: weapon.id, aim: Number(weapon.rotation.toFixed(3)),
    root: getWeaponRootWorld(weapon, index), muzzle: weaponMuzzleWorld(weapon, index),
    swing_elapsed: Number((weapon.swing_elapsed || 0).toFixed(3)), swing_timer: Number((weapon.swing_timer || 0).toFixed(3))
  })),
  alive_count: state.enemies.reduce((n, e) => n + (e.dead ? 0 : 1), 0),
  alive_cap: getWaveEnemyCap(),
  ink: state.ink_count, kills: state.kill_count
});

window.advanceTime = (ms) => {
  const stepCount = Math.max(1, Math.round(ms / (1000 / 60)));
  const dt = 1 / 60 * (state.game_speed || 1.0);
  for (let i = 0; i < stepCount; i++) updateGame(dt);
  render();
};

// Immediate initial sync for instant interactivity on mobile & iPad
initTitleScreen();
initTouchControls();
ensureWeaponVisuals();

loadAssets(() => {
  initTitleScreen();
  initTouchControls();
  requestAnimationFrame(gameLoop);
});

// =========================================
// 18. PAUSE, GRANULAR AUDIO & SETTINGS ENGINE
// =========================================
window.isGamePaused = false;

window.gameSettings = {
  visualQuality: "medium",       // "low" (Göz Dinlendirici) | "medium" | "high"
  skipWaveEndScreen: false,      // true: kesintisiz dalga geçişi; false: dükkanı aç
  screenShake: false,            // Varsayılan KAPALI: kamerada sıfır titreme!
  damageNumbers: true,           // true | false
  autoAim: "nearest",            // "nearest" | "lowest_hp" | "boss_priority"
  hapticsEnabled: true           // true | false
};

function loadGameSettings() {
  try {
    const isMobileDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 1080;
    if (isMobileDevice) {
      window.gameSettings.visualQuality = "low"; // Mobilde göz dinlendirici mod varsayılan!
    }
    const saved = localStorage.getItem("lexicon_game_settings");
    if (saved) {
      const p = JSON.parse(saved);
      if (typeof p.visualQuality === "string") window.gameSettings.visualQuality = p.visualQuality;
      if (typeof p.skipWaveEndScreen === "boolean") window.gameSettings.skipWaveEndScreen = p.skipWaveEndScreen;
      if (typeof p.screenShake === "boolean") window.gameSettings.screenShake = p.screenShake;
      if (typeof p.damageNumbers === "boolean") window.gameSettings.damageNumbers = p.damageNumbers;
      if (typeof p.autoAim === "string") window.gameSettings.autoAim = p.autoAim;
      if (typeof p.hapticsEnabled === "boolean") window.gameSettings.hapticsEnabled = p.hapticsEnabled;
    }
  } catch (_) {}
}

function saveGameSettings() {
  try {
    localStorage.setItem("lexicon_game_settings", JSON.stringify(window.gameSettings));
  } catch (_) {}
}

function syncGameSettingsUI() {
  const visualSelect = document.getElementById("setting-visual-effects-select");
  if (visualSelect) visualSelect.value = window.gameSettings.visualQuality || "medium";

  const skipWaveToggle = document.getElementById("setting-skip-wave-shop-toggle");
  if (skipWaveToggle) skipWaveToggle.checked = !!window.gameSettings.skipWaveEndScreen;

  const shakeToggle = document.getElementById("setting-screenshake-toggle");
  if (shakeToggle) shakeToggle.checked = !!window.gameSettings.screenShake;

  const dmgNumbersToggle = document.getElementById("setting-damagenumbers-toggle");
  if (dmgNumbersToggle) dmgNumbersToggle.checked = !!window.gameSettings.damageNumbers;

  const hapticsToggle = document.getElementById("setting-haptics-toggle");
  if (hapticsToggle) hapticsToggle.checked = window.gameSettings.hapticsEnabled !== false;

  const autoAimSelect = document.getElementById("setting-autoaim-select");
  if (autoAimSelect) autoAimSelect.value = window.gameSettings.autoAim || "nearest";
}

loadGameSettings();

function toggleGamePause(forceState) {
  const titleScreen = document.getElementById("title-screen");
  const gameOverScreen = document.getElementById("game-over-screen");
  const isTitleOpen = titleScreen && titleScreen.style.display !== "none";
  const isGameOverOpen = gameOverScreen && gameOverScreen.style.display !== "none";
  if (isTitleOpen || isGameOverOpen) return;

  if (typeof forceState === "boolean") {
    window.isGamePaused = forceState;
  } else {
    window.isGamePaused = !window.isGamePaused;
  }

  const pauseModal = document.getElementById("pause-modal");
  if (pauseModal) {
    pauseModal.style.display = window.isGamePaused ? "flex" : "none";
  }
  if (window.isGamePaused) {
    if (typeof sounds !== "undefined" && typeof sounds.pauseDialogueVoice === "function") {
      sounds.pauseDialogueVoice();
    }
    const titleEl = document.getElementById("pause-modal-title");
    if (titleEl) titleEl.textContent = "KÜTÜPHANE BEKLEMEDE";
    const resumeBtn = document.getElementById("resume-game-btn");
    if (resumeBtn) resumeBtn.style.display = "";
    const returnBtn = document.getElementById("pause-return-to-menu-btn");
    if (returnBtn) returnBtn.style.display = "";

    if (state.player) {
      state.player.vx = 0;
      state.player.vy = 0;
      state.player.attack_anim_timer = 0;
    }
    syncAudioSettingsUI();
    syncGameSettingsUI();
  } else {
    if (typeof sounds !== "undefined" && typeof sounds.resumeDialogueVoice === "function") {
      sounds.resumeDialogueVoice();
    }
  }
}

function returnToMainMenuFromPause() {
  window.isGamePaused = false;
  const confirmModal = document.getElementById("pause-confirm-modal");
  if (confirmModal) confirmModal.style.display = "none";
  const pauseModal = document.getElementById("pause-modal");
  if (pauseModal) pauseModal.style.display = "none";
  const shopScreen = document.getElementById("shop-screen");
  if (shopScreen) shopScreen.style.display = "none";
  const gameOverScreen = document.getElementById("game-over-screen");
  if (gameOverScreen) gameOverScreen.style.display = "none";
  const quizModal = document.getElementById("quiz-modal");
  if (quizModal) quizModal.style.display = "none";

  // Stop active combat music, timers, and alert banners
  bgm.stop();
  if (typeof sounds !== "undefined" && typeof sounds.stopMusic === "function") {
    sounds.stopMusic();
  }
  if (typeof sounds !== "undefined" && typeof sounds.stopDialogueVoice === "function") {
    sounds.stopDialogueVoice();
  }
  const storyIntermission = document.getElementById("story-intermission");
  if (storyIntermission) storyIntermission.hidden = true;
  storyWavePending = 0;
  storyEpisodeIndex = -1;
  storyPanelIndex = 0;
  clearShopAutoWaveTimer();
  clearAutoRunCountdown();
  state.is_wave_active = false;
  if (state.alert_timeout) {
    clearTimeout(state.alert_timeout);
    state.alert_timeout = null;
  }
  const alertBanner = document.getElementById("tactical-alert-banner");
  if (alertBanner) alertBanner.style.display = "none";

  if (chapterCardTimeout) {
    clearTimeout(chapterCardTimeout);
    chapterCardTimeout = null;
  }
  const chapterCard = document.getElementById("chapter-transition-card");
  if (chapterCard) chapterCard.hidden = true;

  // Fully reset stats, player coordinates, and entity arrays so next run starts clean
  state.pickups = [];
  state.floating_texts = [];
  resetStats();

  // Show title screen cleanly
  document.getElementById("title-screen").style.display = "flex";
  initTitleScreen();
  syncMobileControlsVisibility();
}

function openSettingsModalFromTitle() {
  const pauseModal = document.getElementById("pause-modal");
  if (!pauseModal) return;
  const titleEl = document.getElementById("pause-modal-title");
  if (titleEl) titleEl.textContent = "SES VE OYUN AYARLARI";
  const resumeBtn = document.getElementById("resume-game-btn");
  if (resumeBtn) resumeBtn.style.display = "none";
  const returnBtn = document.getElementById("pause-return-to-menu-btn");
  if (returnBtn) returnBtn.style.display = "none";
  pauseModal.style.display = "flex";
  syncAudioSettingsUI();
  syncGameSettingsUI();
}

function closeSettingsModalToTitle() {
  const pauseModal = document.getElementById("pause-modal");
  if (pauseModal) pauseModal.style.display = "none";
  const resumeBtn = document.getElementById("resume-game-btn");
  if (resumeBtn) resumeBtn.style.display = "";
  const returnBtn = document.getElementById("pause-return-to-menu-btn");
  if (returnBtn) returnBtn.style.display = "";
}

function syncAudioSettingsUI() {
  // Master
  const masterSlider = document.getElementById("master-vol-slider");
  const masterLabel = document.getElementById("master-vol-label");
  const masterBtn = document.getElementById("master-mute-toggle");
  if (masterSlider) masterSlider.value = Math.round(sounds.masterVolume * 100);
  if (masterLabel) masterLabel.textContent = `${Math.round(sounds.masterVolume * 100)}%`;
  if (masterBtn) {
    masterBtn.textContent = sounds.masterMuted ? "Sessiz" : "Açık";
    masterBtn.className = sounds.masterMuted ? "btn btn-crimson" : "btn btn-emerald";
  }

  // SFX
  const sfxSlider = document.getElementById("sfx-vol-slider");
  const sfxLabel = document.getElementById("sfx-vol-label");
  const sfxBtn = document.getElementById("sfx-mute-toggle");
  if (sfxSlider) sfxSlider.value = Math.round(sounds.sfxVolume * 100);
  if (sfxLabel) sfxLabel.textContent = `${Math.round(sounds.sfxVolume * 100)}%`;
  if (sfxBtn) {
    sfxBtn.textContent = sounds.sfxMuted ? "Sessiz" : "Açık";
    sfxBtn.className = sounds.sfxMuted ? "btn btn-crimson" : "btn btn-emerald";
  }

  // BGM
  const bgmSlider = document.getElementById("bgm-vol-slider");
  const bgmLabel = document.getElementById("bgm-vol-label");
  const bgmBtn = document.getElementById("bgm-mute-toggle");
  if (bgmSlider) bgmSlider.value = Math.round(sounds.bgmVolume * 100);
  if (bgmLabel) bgmLabel.textContent = `${Math.round(sounds.bgmVolume * 100)}%`;
  if (bgmBtn) {
    bgmBtn.textContent = sounds.bgmMuted ? "Sessiz" : "Açık";
    bgmBtn.className = sounds.bgmMuted ? "btn btn-crimson" : "btn btn-emerald";
  }

  // Menu Music
  const menuSlider = document.getElementById("menu-vol-slider");
  const menuLabel = document.getElementById("menu-vol-label");
  const menuBtn = document.getElementById("menu-mute-toggle");
  if (menuSlider) menuSlider.value = Math.round(sounds.menuVolume * 100);
  if (menuLabel) menuLabel.textContent = `${Math.round(sounds.menuVolume * 100)}%`;
  if (menuBtn) {
    menuBtn.textContent = sounds.menuMuted ? "Sessiz" : "Açık";
    menuBtn.className = sounds.menuMuted ? "btn btn-crimson" : "btn btn-emerald";
  }

  // All mute button
  const allMuteBtn = document.getElementById("audio-mute-all-btn");
  if (allMuteBtn) {
    const isAllMuted = sounds.masterMuted;
    allMuteBtn.textContent = isAllMuted ? "Tümünü Aç" : "Tümünü Sustur";
  }
}

// Hook all UI buttons and sliders on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
  // Pause button on HUD
  const pauseBtn = document.getElementById("pause-btn");
  if (pauseBtn) {
    pauseBtn.onclick = (e) => {
      e.stopPropagation();
      toggleGamePause();
    };
  }

  // Resume button
  const resumeBtn = document.getElementById("resume-game-btn");
  if (resumeBtn) {
    resumeBtn.onclick = () => toggleGamePause(false);
  }

  // Return to main menu from pause (gated by confirmation modal)
  const pauseReturnBtn = document.getElementById("pause-return-to-menu-btn");
  if (pauseReturnBtn) {
    pauseReturnBtn.onclick = () => {
      const confirmModal = document.getElementById("pause-confirm-modal");
      if (confirmModal) {
        confirmModal.style.display = "flex";
      } else {
        returnToMainMenuFromPause();
      }
    };
  }

  const confirmCancelBtn = document.getElementById("pause-confirm-cancel-btn");
  if (confirmCancelBtn) {
    confirmCancelBtn.onclick = () => {
      const confirmModal = document.getElementById("pause-confirm-modal");
      if (confirmModal) confirmModal.style.display = "none";
    };
  }

  const confirmAcceptBtn = document.getElementById("pause-confirm-accept-btn");
  if (confirmAcceptBtn) {
    confirmAcceptBtn.onclick = () => {
      const confirmModal = document.getElementById("pause-confirm-modal");
      if (confirmModal) confirmModal.style.display = "none";
      returnToMainMenuFromPause();
    };
  }

  // Bottom close button
  const pauseCloseBtn = document.getElementById("pause-close-bottom-btn");
  if (pauseCloseBtn) {
    pauseCloseBtn.onclick = () => {
      const titleScreen = document.getElementById("title-screen");
      if (titleScreen && titleScreen.style.display !== "none") {
        closeSettingsModalToTitle();
      } else {
        toggleGamePause(false);
      }
    };
  }

  // Title Audio Settings button
  const titleAudioBtn = document.getElementById("title-audio-settings-btn");
  if (titleAudioBtn) {
    titleAudioBtn.onclick = openSettingsModalFromTitle;
  }

  // Master Volume Controls
  const masterSlider = document.getElementById("master-vol-slider");
  if (masterSlider) {
    masterSlider.oninput = (e) => {
      sounds.masterVolume = parseFloat(e.target.value) / 100;
      sounds.saveAudioSettings();
      syncAudioSettingsUI();
    };
  }
  const masterMute = document.getElementById("master-mute-toggle");
  if (masterMute) {
    masterMute.onclick = () => {
      sounds.masterMuted = !sounds.masterMuted;
      sounds.saveAudioSettings();
      syncAudioSettingsUI();
    };
  }

  // SFX Controls
  const sfxSlider = document.getElementById("sfx-vol-slider");
  if (sfxSlider) {
    sfxSlider.oninput = (e) => {
      sounds.sfxVolume = parseFloat(e.target.value) / 100;
      sounds.saveAudioSettings();
      syncAudioSettingsUI();
    };
  }
  const sfxMute = document.getElementById("sfx-mute-toggle");
  if (sfxMute) {
    sfxMute.onclick = () => {
      sounds.sfxMuted = !sounds.sfxMuted;
      sounds.saveAudioSettings();
      syncAudioSettingsUI();
    };
  }

  // BGM Controls
  const bgmSlider = document.getElementById("bgm-vol-slider");
  if (bgmSlider) {
    bgmSlider.oninput = (e) => {
      sounds.bgmVolume = parseFloat(e.target.value) / 100;
      sounds.saveAudioSettings();
      syncAudioSettingsUI();
    };
  }
  const bgmMute = document.getElementById("bgm-mute-toggle");
  if (bgmMute) {
    bgmMute.onclick = () => {
      sounds.bgmMuted = !sounds.bgmMuted;
      sounds.saveAudioSettings();
      syncAudioSettingsUI();
    };
  }

  // Menu Controls
  const menuSlider = document.getElementById("menu-vol-slider");
  if (menuSlider) {
    menuSlider.oninput = (e) => {
      sounds.menuVolume = parseFloat(e.target.value) / 100;
      sounds.saveAudioSettings();
      syncAudioSettingsUI();
    };
  }
  const menuMute = document.getElementById("menu-mute-toggle");
  if (menuMute) {
    menuMute.onclick = () => {
      sounds.menuMuted = !sounds.menuMuted;
      sounds.saveAudioSettings();
      syncAudioSettingsUI();
    };
  }

  // Mute All Button
  const muteAllBtn = document.getElementById("audio-mute-all-btn");
  if (muteAllBtn) {
    muteAllBtn.onclick = () => {
      sounds.masterMuted = !sounds.masterMuted;
      sounds.saveAudioSettings();
      syncAudioSettingsUI();
    };
  }

  // Gameplay & Visual Settings Listeners with LocalStorage Persistence
  syncGameSettingsUI();

  const visualSelect = document.getElementById("setting-visual-effects-select");
  if (visualSelect) {
    visualSelect.onchange = (e) => {
      window.gameSettings.visualQuality = e.target.value;
      saveGameSettings();
    };
  }

  const skipWaveToggle = document.getElementById("setting-skip-wave-shop-toggle");
  if (skipWaveToggle) {
    skipWaveToggle.onchange = (e) => {
      window.gameSettings.skipWaveEndScreen = e.target.checked;
      saveGameSettings();
    };
  }

  const shakeToggle = document.getElementById("setting-screenshake-toggle");
  if (shakeToggle) {
    shakeToggle.onchange = (e) => {
      window.gameSettings.screenShake = e.target.checked;
      state.screen_shake_disabled = !e.target.checked;
      saveGameSettings();
    };
  }

  const dmgNumbersToggle = document.getElementById("setting-damagenumbers-toggle");
  if (dmgNumbersToggle) {
    dmgNumbersToggle.onchange = (e) => {
      window.gameSettings.damageNumbers = e.target.checked;
      saveGameSettings();
    };
  }

  const hapticsToggle = document.getElementById("setting-haptics-toggle");
  if (hapticsToggle) {
    hapticsToggle.onchange = (e) => {
      window.gameSettings.hapticsEnabled = e.target.checked;
      saveGameSettings();
    };
  }

  const autoAimSelect = document.getElementById("setting-autoaim-select");
  if (autoAimSelect) {
    autoAimSelect.onchange = (e) => {
      window.gameSettings.autoAim = e.target.value;
      state.auto_aim_priority = e.target.value;
      saveGameSettings();
    };
  }
});

// Keydown listener for Escape and P
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" || e.key.toLowerCase() === "p") {
    const confirmModal = document.getElementById("pause-confirm-modal");
    if (confirmModal && confirmModal.style.display !== "none") {
      e.preventDefault();
      confirmModal.style.display = "none";
      return;
    }
    const titleScreen = document.getElementById("title-screen");
    const isTitleOpen = titleScreen && titleScreen.style.display !== "none";
    const pauseModal = document.getElementById("pause-modal");
    if (isTitleOpen) {
      if (pauseModal && pauseModal.style.display !== "none") {
        closeSettingsModalToTitle();
      }
      return;
    }
    const gameOverScreen = document.getElementById("game-over-screen");
    const isGameOverOpen = gameOverScreen && gameOverScreen.style.display !== "none";
    if (!isGameOverOpen) {
      e.preventDefault();
      toggleGamePause();
    }
  }
});
