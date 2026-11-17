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

  const ready = fetch(ATLAS_URL)
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
  function heroFrame(key, action, frame = 0, player = null) {
    const hero = HERO_KEYS[key];
    if (!hero || !atlas) return null;
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
    if (kind === "attack" || kind === "special" || kind === "phase" || kind === "hurt") return onceFrame(id, clock.since, time);
    return loopFrame(id, time, phase);
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

  // ---------------------------------------------------- legacy (arena-v3)
  let legacyEnemyFrame = () => null;
  function setLegacyEnemyFrame(fn) { legacyEnemyFrame = fn; }

  window.GrimoireSprites = Object.freeze({
    BOSS_SCALE, ready, has, url, strip, image, loopFrame, onceFrame, onceDuration,
    heroFrame, heroImage, enemyFrame, recordDeath, drawBodies, pickupFrame, setLegacyEnemyFrame
  });
})();
