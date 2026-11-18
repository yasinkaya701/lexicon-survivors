/* Grimoire sprite runtime.
 *
 * Reads assets/art/grimoire/atlas.json (built by tools/art/build_web_art.py),
 * loads horizontal animation strips on demand and slices them into per-frame
 * canvases, so callers can keep using ctx.drawImage(frame, x, y, w, h).
 *
 * It also decides which action a hero, enemy or boss is showing from the
 * plain combat state (speed, attack phase, hit flash, invulnerability), and
 * keeps short-lived boss death bodies after the combat object is gone.
 * Nothing here changes combat state.
 */
(() => {
  const ATLAS_URL = "assets/art/grimoire/atlas.json";
  const BOSS_SCALE = 2.1; // draw size / collision size for boss sheets
  let atlas = null;
  const strips = new Map(); // id -> { frames: HTMLCanvasElement[] | null, fps, count }
  let repaintQueued = false;

  function repaint() {
    if (repaintQueued) return;
    repaintQueued = true;
    requestAnimationFrame(() => {
      repaintQueued = false;
      if (typeof window.render === "function") window.render(0);
    });
  }

  if (window.GRIMOIRE_ATLAS?.assets) atlas = window.GRIMOIRE_ATLAS.assets;
  const ready = atlas ? Promise.resolve(atlas) : fetch(ATLAS_URL, { cache: "no-store" })
    .then(r => { if (!r.ok) throw Error("atlas"); return r.json(); })
    .then(data => { atlas = data.assets || {}; repaint(); return atlas; })
    .catch(() => { atlas = {}; return atlas; });

  function has(id) { return !!atlas?.[id]; }
  function url(id) { return atlas?.[id]?.src || null; }

  /** Frames of an animation strip, or null while it loads / when absent. */
  function strip(id) {
    if (!atlas) return null;
    let entry = strips.get(id);
    if (!entry) {
      const record = atlas[id];
      if (!record || !record.frames) { strips.set(id, { frames: null, missing: true }); return null; }
      entry = { frames: null, fps: record.fps || 8, count: record.frames };
      strips.set(id, entry);
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        const [cw, ch] = record.cell;
        entry.frames = Array.from({ length: record.frames }, (_, i) => {
          const canvas = document.createElement("canvas");
          canvas.width = cw; canvas.height = ch;
          canvas.getContext("2d").drawImage(image, i * cw, 0, cw, ch, 0, 0, cw, ch);
          return canvas;
        });
        repaint();
      };
      image.src = record.src;
    }
    return entry.frames;
  }

  /** Single (non-strip) image from the atlas. */
  const singles = new Map();
  function image(id) {
    if (!atlas?.[id]) return null;
    let img = singles.get(id);
    if (!img) { img = new Image(); img.decoding = "async"; img.onload = repaint; img.src = atlas[id].src; singles.set(id, img); }
    return img.complete && img.naturalWidth ? img : null;
  }

  function loopFrame(id, time, offset = 0) {
    const frames = strip(id);
    if (!frames) return null;
    const fps = strips.get(id).fps;
    const reduced = window.ErrataArena?.flags?.reducedMotion;
    const index = reduced ? 0 : Math.floor(time * fps / 1000 + offset);
    return frames[((index % frames.length) + frames.length) % frames.length];
  }

  /** Frame of a one-shot animation that started at `startedAt` (ms); holds the last frame. */
  function onceFrame(id, startedAt, time) {
    const frames = strip(id);
    if (!frames) return null;
    const index = Math.floor((time - startedAt) * strips.get(id).fps / 1000);
    return frames[Math.max(0, Math.min(frames.length - 1, index))];
  }

  function onceDuration(id) {
    const entry = strips.get(id);
    const record = atlas?.[id];
    if (!record?.frames) return 0;
    return record.frames * 1000 / (entry?.fps || record.fps || 8);
  }

  // ---------------------------------------------------------------- heroes
  const HERO_KEYS = {
    inky: "inky", quillmaster: "quillmaster", word_knight: "word_knight",
    rune_sorceress: "rune_sorceress", lexicon_alchemist: "alchemist", alchemist: "alchemist",
    shadow_lexicographer: "shadow_scribe", shadow_scribe: "shadow_scribe"
  };
  const heroClock = { action: null, since: 0 };

  /**
   * Hero frame for the current action. `action` and `frame` come from the
   * combat code (idle/run/attack/ranged with a combat-synced frame index);
   * `player` lets dash and hurt override them.
   */
  const lastHeroFrame = new Map();
  function heroFrame(key, action, frame = 0, player = null) {
    const hero = HERO_KEYS[key];
    if (!hero || !atlas) return null;
    const result = heroFrameNow(key, hero, action, frame, player);
    // While a strip is still loading, keep showing the last painted frame
    // instead of letting the caller drop to the old (pre-redesign) sprites.
    if (result) lastHeroFrame.set(hero, result);
    return result || lastHeroFrame.get(hero) || null;
  }
  function heroFrameNow(key, hero, action, frame, player) {
    const now = performance.now();
    let kind = action === "ranged" || action === "attack" || action === "run" ? action : "idle";
    if (player?.is_dashing) kind = "dash";
    else if (player && player.invuln_timer > 0.5) kind = "hurt";
    if (player && kind !== heroClock.action) { heroClock.action = kind; heroClock.since = now; }
    const id = `hero_${hero}_${kind}`;
    if (!has(id)) return null;
    const frames = strip(id);
    if (!frames) return null;
    if (kind === "attack" || kind === "ranged") {
      // The combat code counts 4 attack frames in sync with the hit window.
      return frames[Math.min(frames.length - 1, Math.floor((frame / 4) * frames.length))];
    }
    if (kind === "dash" || kind === "hurt") return onceFrame(id, heroClock.since, now);
    if (kind === "run" && player) {
      const phase = ((player.run_phase || 0) % 8 + 8) % 8;
      return frames[Math.floor(phase / 8 * frames.length) % frames.length];
    }
    return loopFrame(id, now);
  }

  function heroImage(key, kind) {
    const hero = HERO_KEYS[key];
    return hero ? image(`hero_${hero}_${kind}`) : null;
  }

  // --------------------------------------------------------------- enemies
  // Regular enemies keyed by their legacy sprite file name.
  const ENEMY_ALIASES = {
    red_pen_boss: "boss_red_inspector", boss_red_inquisitor: "boss_red_inspector",
    lexicon_dragon_boss: "boss_lexicon_dragon", boss_lexicon_dragon: "boss_lexicon_dragon",
    boss_void_curator: "boss_wordless_mouth", boss_syntax_titan: "enemy_syntax_titan"
  };
  // Milestone bosses keyed by their display name (several share an old sprite).
  const BOSS_BY_NAME = {
    "judgment warden": "red_inspector", "the unfinished titan": "unfinished_giant",
    "the contradiction": "contradiction", "twin-voice harpy": "two_voiced_harpy",
    "the lexicon dragon": "lexicon_dragon", "the run-on reaper": "restless_reaper",
    "the borrowed face": "borrowed_face", "the wordless maw": "wordless_mouth",
    "the last full stop": "final_stop", "the no-no drake": "double_negation",
    "the reversing shade": "reversed_reflection", "the repeating pair": "repeating_twin",
    "the hanging sentence": "dangling_clause", "the pale proofreader": "pale_corrector",
    "the literal flame": "literal_flame", "the redactor": "red_redactor",
    "the split-truth ogre": "twofold_truth", "the false neris": "false_neris",
    "the unwritten": "unwritten", "omega, last word": "omega_blank_page"
  };

  // Milestone bosses in roster order (wave 5, 10, ... 100).
  const BOSS_ORDER = ["red_inspector", "unfinished_giant", "contradiction", "two_voiced_harpy",
    "lexicon_dragon", "restless_reaper", "borrowed_face", "wordless_mouth", "final_stop",
    "double_negation", "reversed_reflection", "repeating_twin", "dangling_clause", "pale_corrector",
    "literal_flame", "red_redactor", "twofold_truth", "false_neris", "unwritten", "omega_blank_page"];
  function bossKeyForWave(wave) {
    const index = Math.floor((Number(wave) || 0) / 5) - 1;
    return index >= 0 ? BOSS_ORDER[Math.min(19, index)] : null;
  }
  function bossArt(wave, part = "portrait") {
    const key = bossKeyForWave(wave);
    return key ? src(`boss_${key}_${part}`) : null;
  }
  function heroArt(characterId, part = "portrait") {
    const hero = HERO_KEYS[characterId];
    return hero ? src(`hero_${hero}_${part}`) : null;
  }
  // Painted story panel for one beat of a hero's episode (see docs: 73 key panels).
  const WINGS = ["reading_hall", "word_corridor", "observatory", "last_page"];
  function storyPanel(characterId, episode, beatIndex, speakerId = "") {
    const hero = HERO_KEYS[characterId];
    const wave = Number(episode?.wave) || 0;
    if (!hero || !wave) return null;
    const beats = episode.beats?.length || 5;
    let id = null;
    if (wave >= 100) {
      id = ["story_boss_omega_blank_page", `story_${hero}_final_1`, `story_${hero}_final_2`, "story_end_2", "story_end_4"][Math.min(4, beatIndex)];
    } else if (wave === 5 && beatIndex < 3 && !String(speakerId).startsWith("boss_")) {
      id = `story_open_${beatIndex + 1}`;
    } else if (String(speakerId).startsWith("boss_")) {
      id = `story_boss_${bossKeyForWave(wave)}`;
    } else if (episode.boss_reward?.type === "relic" && beatIndex === beats - 1) {
      id = `story_${hero}_relic_${Math.round(wave / 25)}`;
    } else if (speakerId === "neris") {
      id = "story_open_3";
    } else {
      const wing = WINGS[Math.min(3, Math.floor((wave - 1) / 25))];
      id = `story_wing_${wing}_${(beatIndex % 2) + 1}`;
    }
    return src(id);
  }

  function npcFace(npc, mood = "neutral") { return src(`npc_${npc}_face_${mood}`) || src(`npc_${npc}_face_neutral`); }

  function baseOf(enemy) {
    if (enemy.__grimoireBase !== undefined) return enemy.__grimoireBase;
    let base = null;
    if (enemy.is_boss && enemy.label) {
      const boss = BOSS_BY_NAME[String(enemy.label).toLowerCase()];
      if (boss && has(`boss_${boss}_idle`)) base = `boss_${boss}`;
    }
    if (!base) {
      const file = String(enemy.sprite || "").split("/").at(-1).replace(/\.[^.]+$/, "").replace(/^monster_/, "");
      const alias = ENEMY_ALIASES[file];
      if (alias && (has(`${alias}_move`) || has(`${alias}_idle`))) base = alias;
      else if (has(`enemy_${file}_move`)) base = `enemy_${file}`;
    }
    // Cached on the combat object: a non-enumerable, purely visual tag.
    Object.defineProperty(enemy, "__grimoireBase", { value: base, writable: true, enumerable: false });
    return base;
  }

  const enemyClocks = new WeakMap();

  /**
   * Frame for an enemy or boss. Bosses: idle/move, attack on wind-up and
   * release, a one-shot `phase` sheet when their phase changes. Regular
   * enemies: move, attack, and a short hurt flinch on heavy hits.
   */
  function enemyFrame(sprite, time = performance.now(), phase = 0, enemy = null) {
    if (!enemy) return legacyEnemyFrame(sprite, time, phase);
    const base = baseOf(enemy);
    if (!base) return legacyEnemyFrame(sprite, time, phase);
    let clock = enemyClocks.get(enemy);
    if (!clock) { clock = { action: null, since: time, bossPhase: enemy.boss_phase || 1, phaseUntil: 0 }; enemyClocks.set(enemy, clock); }
    const boss = base.startsWith("boss_");
    const speed = Math.hypot(enemy.vx || 0, enemy.vy || 0);
    let kind = boss ? (speed > 12 ? "move" : "idle") : "move";
    if (boss && (enemy.boss_phase || 1) !== clock.bossPhase) {
      clock.bossPhase = enemy.boss_phase || 1;
      clock.phaseUntil = time + onceDuration(`${base}_phase`);
    }
    if (boss && time < clock.phaseUntil && has(`${base}_phase`)) kind = "phase";
    else if (enemy.attack_anim_phase === "windup" || enemy.attack_anim_phase === "release") kind = boss && enemy.boss_phase >= 2 && has(`${base}_special`) ? "special" : "attack";
    else if (!boss && (enemy.hit_flash_timer || 0) > 0.1 && has(`${base}_hurt`)) kind = "hurt";
    if (!has(`${base}_${kind}`)) kind = has(`${base}_move`) ? "move" : "idle";
    if (kind !== clock.action) { clock.action = kind; clock.since = time; }
    const id = `${base}_${kind}`;
    const out = (kind === "attack" || kind === "special" || kind === "phase" || kind === "hurt") ? onceFrame(id, clock.since, time) : loopFrame(id, time, phase);
    if (out) clock.last = out;
    return out || clock.last || null; // never fall back to the old sprite mid-load
  }

  // ----------------------------------------------------- boss death bodies
  const bodies = [];
  function recordDeath(enemy) {
    if (!enemy?.is_boss) return; // regular enemy deaths are not shipped yet
    const base = baseOf(enemy);
    if (!base || !has(`${base}_death`)) return;
    strip(`${base}_death`);
    bodies.push({ id: `${base}_death`, x: enemy.x, y: enemy.y, size: enemy.size || 66, flip: !!enemy.facing_left, start: performance.now() });
    if (bodies.length > 6) bodies.shift();
  }

  function drawBodies(context) {
    if (!bodies.length) return;
    const now = performance.now();
    for (let i = bodies.length - 1; i >= 0; i--) {
      const body = bodies[i];
      const play = onceDuration(body.id);
      const age = now - body.start;
      if (age > play + 1600) { bodies.splice(i, 1); continue; }
      const frame = onceFrame(body.id, body.start, now);
      if (!frame) continue;
      const size = body.size * BOSS_SCALE;
      context.save();
      context.globalAlpha = age > play ? Math.max(0, 1 - (age - play) / 1600) : 1;
      context.translate(body.x, body.y);
      if (body.flip) context.scale(-1, 1);
      context.imageSmoothingEnabled = true;
      context.drawImage(frame, -size / 2, -size / 2, size, size);
      context.restore();
    }
  }

  // ---------------------------------------------------------------- pickups
  const PICKUPS = { ink: "pickup_ink_small", health: "pickup_health" };
  function pickupFrame(kind, time, offset) {
    const id = PICKUPS[kind];
    return id && has(id) ? loopFrame(id, time, offset) : null;
  }

  // ------------------------------------------------------- one-shot effects
  // World-space strips played once at a point (impacts, level-up, boss
  // arrival...). Purely visual, capped, and skipped under reduced effects.
  const effects = [];
  const FX_CAP = 48;
  const lastFx = new Map();
  function fx(id, x, y, options = {}) {
    if (!has(id) || window.ErrataArena?.flags?.lowEffects) return;
    if (options.throttle) {
      const now = performance.now();
      if (now - (lastFx.get(id) || 0) < options.throttle) return;
      lastFx.set(id, now);
    }
    strip(id);
    if (effects.length >= FX_CAP) effects.shift();
    effects.push({ id, x, y, size: options.size || 96, rotation: options.rotation || 0,
      follow: options.follow || null, alpha: options.alpha ?? 1, start: performance.now(),
      blend: options.blend || null, under: !!options.under });
  }

  function drawEffects(context, under = false) {
    if (!effects.length) return;
    const now = performance.now();
    const reduced = window.ErrataArena?.flags?.reducedMotion;
    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i];
      if (effect.under !== under) continue;
      const duration = onceDuration(effect.id) || 400;
      if (now - effect.start > duration) { effects.splice(i, 1); continue; }
      const frame = reduced ? strip(effect.id)?.[Math.floor((strip(effect.id)?.length || 1) / 2)] : onceFrame(effect.id, effect.start, now);
      if (!frame) continue;
      const x = effect.follow ? effect.follow.x : effect.x;
      const y = effect.follow ? effect.follow.y : effect.y;
      context.save();
      context.globalAlpha = effect.alpha;
      if (effect.blend) context.globalCompositeOperation = effect.blend;
      context.translate(x, y);
      if (effect.rotation) context.rotate(effect.rotation);
      context.imageSmoothingEnabled = true;
      context.drawImage(frame, -effect.size / 2, -effect.size / 2, effect.size, effect.size);
      context.restore();
    }
  }

  // --------------------------------------------------------- weapons
  // Held-weapon calibration for the painted sheets: grip (pivot in the hand)
  // and muzzle (where shots leave), as fractions of the square image.
  const HELD = {"quill_blaster":{"base":{"grip":[0.55,0.55],"muzzle":[0.91,0.84]},"evo":{"grip":[0.2,0.62],"muzzle":[0.86,0.38]}},"syllable_shotgun":{"base":{"grip":[0.3,0.55],"muzzle":[0.8,0.62]},"evo":{"grip":[0.15,0.62],"muzzle":[0.93,0.4]}},"lexicon_beam":{"base":{"grip":[0.44,0.08],"muzzle":[0.62,0.8]},"evo":{"grip":[0.15,0.65],"muzzle":[0.87,0.42]}},"punctuation_bomb":{"base":{"grip":[0.5,0.1],"muzzle":[0.48,0.88]},"evo":{"grip":[0.2,0.65],"muzzle":[0.79,0.46]}},"dictionary_blade":{"base":{"grip":[0.12,0.49],"muzzle":[0.91,0.55]},"evo":{"grip":[0.08,0.57],"muzzle":[0.93,0.55]}},"crossword_crossbow":{"base":{"grip":[0.1,0.65],"muzzle":[0.95,0.19]},"evo":{"grip":[0.08,0.6],"muzzle":[0.9,0.41]}},"hyphen_boomerang":{"base":{"grip":[0.09,0.54],"muzzle":[0.85,0.47]},"evo":{"grip":[0.14,0.48],"muzzle":[0.87,0.47]}},"ink_flamethrower":{"base":{"grip":[0.3,0.6],"muzzle":[0.77,0.42]},"evo":{"grip":[0.25,0.55],"muzzle":[0.86,0.5]}},"thesaurus_rocket":{"base":{"grip":[0.5,0.85],"muzzle":[0.5,0.08]},"evo":{"grip":[0.15,0.53],"muzzle":[0.93,0.55]}},"quote_pistols":{"base":{"grip":[0.2,0.62],"muzzle":[0.8,0.5]},"evo":{"grip":[0.3,0.6],"muzzle":[0.78,0.42]}},"calligraphy_katana":{"base":{"grip":[0.05,0.57],"muzzle":[0.92,0.4]},"evo":{"grip":[0.25,0.86],"muzzle":[0.8,0.35]}},"scroll_turret":{"base":{"grip":[0.3,0.75],"muzzle":[0.9,0.34]},"evo":{"grip":[0.45,0.8],"muzzle":[0.62,0.25]}},"rune_orb":{"base":{"grip":[0.5,0.05],"muzzle":[0.5,0.75]},"evo":{"grip":[0.5,0.1],"muzzle":[0.5,0.8]}},"grammar_sniper":{"base":{"grip":[0.15,0.55],"muzzle":[0.94,0.59]},"evo":{"grip":[0.2,0.42],"muzzle":[0.78,0.08]}},"word_loom":{"base":{"grip":[0.15,0.6],"muzzle":[0.9,0.47]},"evo":{"grip":[0.3,0.75],"muzzle":[0.7,0.25]}}};
  /**
   * Visual row for a held painted weapon, or null. Same shape as a
   * weapon_visuals.json row so the existing muzzle/angle math applies.
   */
  function heldVisual(weapon, tier, base) {
    const calibration = HELD[weapon];
    if (!calibration || !base) return null;
    const evolved = (tier || 1) >= EVOLVED_TIER && calibration.evo && has(`weapon_${weapon}_evo_held`);
    const { grip, muzzle } = evolved ? calibration.evo : calibration.base;
    const id = evolved ? `weapon_${weapon}_evo_held` : `weapon_${weapon}_held`;
    if (!has(id)) return null;
    const angle = Math.atan2(muzzle[1] - grip[1], muzzle[0] - grip[0]) * 180 / Math.PI;
    return { ...base, grip, muzzle, art_angle_deg: angle, draw_size: base.draw_size, painted_id: id };
  }
  const EVOLVED_TIER = 4;
  function weaponId(id, tier, part) {
    const evolved = (tier || 1) >= EVOLVED_TIER && has(`weapon_${id}_evo_${part}`);
    return evolved ? `weapon_${id}_evo_${part}` : `weapon_${id}_${part}`;
  }
  function projectileFrame(weapon, tier, time, offset = 0) {
    const id = weaponId(weapon, tier, "projectile");
    return has(id) ? loopFrame(id, time, offset) : null;
  }
  function weaponImpact(weapon, x, y, rotation, size = 64) {
    fx(`weapon_${weapon}_impact`, x, y, { rotation, size });
  }
  // Enemy bullet shapes → painted bullet strips.
  const ENEMY_SHOTS = { orb: "orb", shard: "shard", ink: "blot", return: "dot", book: "feather", ember: "ember" };
  function enemyShotFrame(shape, time, offset = 0) {
    const id = `enemy_projectile_${ENEMY_SHOTS[shape] || "orb"}`;
    return has(id) ? loopFrame(id, time, offset) : null;
  }

  // ------------------------------------------------------------ icons (sync)
  // Resolves the legacy sprite paths used by UI markup to the painted set.
  // Uses window.GRIMOIRE_ATLAS (atlas.js) so markup built at boot is correct.
  function syncRecord(id) { return (atlas || window.GRIMOIRE_ATLAS?.assets || {})[id]; }
  function src(id) { return syncRecord(id)?.src || null; }
  function weaponIcon(id, tier = 1) {
    const evolved = (tier || 1) >= EVOLVED_TIER ? src(`weapon_${id}_evo_icon`) : null;
    return evolved || src(`weapon_${id}_icon`);
  }
  function legacyIcon(path) {
    const clean = String(path || "").replace(/^assets\/sprites\//, "").replace(/\?.*$/, "");
    let match = clean.match(/^weapons\/([a-z_]+)\.png$/);
    if (match) return weaponIcon(match[1]);
    match = clean.match(/^gadgets\/([a-z_]+)\.png$/);
    if (match) return src(`gadget_${match[1]}_icon`);
    match = clean.match(/^relics\/([a-z_]+)\.png$/);
    if (match) return src(`relic_${match[1]}`);
    return null;
  }
  /** Painted URL for a legacy sprite path, or the original path. */
  function iconUrl(path) {
    const resolved = legacyIcon(path);
    if (resolved) return resolved;
    const value = String(path || "");
    return value.startsWith("assets/") ? value : `assets/sprites/${value}`;
  }

  // ---------------------------------------------------- screen vignettes
  // Painted edge vignettes: a red-ink flash on hits and a cracked-page edge
  // while health is low. DOM only changes when the state changes.
  let hurtLayer = null, lowLayer = null, lowOn = false;
  function vignettes() {
    if (hurtLayer || !document.body) return !!hurtLayer;
    const make = (cls, id) => { const el = document.createElement("div"); el.className = `grimoire-vignette ${cls}`; el.setAttribute("aria-hidden", "true");
      const url = src(id); if (url) el.style.backgroundImage = `url("${url}")`; document.body.append(el); return el; };
    hurtLayer = make("is-hurt", "damage_flash_overlay");
    lowLayer = make("is-low", "low_health_overlay");
    return true;
  }
  function hurtFlash() {
    if (!vignettes() || window.ErrataArena?.flags?.reducedMotion) return;
    hurtLayer.classList.remove("on"); void hurtLayer.offsetWidth; hurtLayer.classList.add("on");
  }
  function syncLowHealth(fraction, active) {
    const on = !!active && fraction > 0 && fraction < 0.3;
    if (on === lowOn) return;
    lowOn = on;
    if (vignettes()) lowLayer.classList.toggle("on", on);
  }

  // True when the painted set covers this hero / enemy, so callers can skip the
  // pre-redesign sprite instead of flashing it while a strip decodes.
  function expectsHero(key) { const hero = HERO_KEYS[key]; return !!(hero && has(`hero_${hero}_idle`)); }
  function expectsEnemy(enemy) { return !!(enemy && atlas && baseOf(enemy)); }

  // ------------------------------------------------------------ preloading
  // Strips are decoded on first use, which let the old sprites show for a few
  // frames. warm() decodes them ahead of time, a few per idle slice.
  const warmed = new Set();
  function warm(match) {
    if (!atlas) { ready.then(() => warm(match)); return; }
    const queue = Object.keys(atlas).filter(id => atlas[id]?.frames && match.test(id) && !warmed.has(id));
    queue.forEach(id => warmed.add(id));
    const pump = () => {
      queue.splice(0, 4).forEach(id => strip(id));
      if (queue.length) (window.requestIdleCallback || (cb => setTimeout(cb, 40)))(pump);
    };
    pump();
  }
  /** Everything the arena draws every wave, plus this hero's own sheets. */
  function warmCombat(heroKey) {
    const hero = HERO_KEYS[heroKey];
    if (hero) warm(new RegExp(`^hero_${hero}_(idle|run|attack|ranged|dash|hurt)$`));
    warm(/^(enemy_|pickup_|fx_|gadget_|enemy_projectile_|affix_)/);
    warm(/^weapon_.*_(projectile|impact)$/);
  }
  function warmBoss(wave) {
    const key = bossKeyForWave(wave);
    if (key) warm(new RegExp(`^boss_${key}_(idle|move|attack|special|phase|death)$`));
  }

  // ---------------------------------------------------- legacy (arena-v3)
  let legacyEnemyFrame = () => null;
  function setLegacyEnemyFrame(fn) { legacyEnemyFrame = fn; }

  window.GrimoireSprites = Object.freeze({
    BOSS_SCALE, ready, has, url, strip, image, loopFrame, onceFrame, onceDuration,
    warm, warmCombat, warmBoss, expectsHero, expectsEnemy, heroFrame, heroImage, enemyFrame, recordDeath, drawBodies, pickupFrame, setLegacyEnemyFrame,
    fx, drawEffects, hurtFlash, syncLowHealth, heldVisual, bossKeyForWave, bossArt, heroArt, npcFace, storyPanel, projectileFrame, weaponImpact, weaponId, enemyShotFrame, src, weaponIcon, iconUrl
  });
})();
