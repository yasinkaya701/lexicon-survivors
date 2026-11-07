/* Browser-injected and Node source-contract checks for web combat visuals. */
(() => {
  const assert = (condition, message) => {
    if (!condition) throw new Error(`Web combat visual regression: ${message}`);
  };

  if (typeof window === "undefined") {
    const fs = require("node:fs");
    const path = require("node:path");
    const root = path.join(__dirname, "..");
    const source = fs.readFileSync(path.join(root, "build/web/game.js"), "utf8");
    const visualData = JSON.parse(fs.readFileSync(path.join(root, "assets/data/weapon_visuals.json"), "utf8"));
    const webVisualData = JSON.parse(fs.readFileSync(path.join(root, "build/web/assets/data/weapon_visuals.json"), "utf8"));
    assert(JSON.stringify(visualData) === JSON.stringify(webVisualData), "Godot and web must read byte-equivalent visual data");
    assert(Object.keys(visualData.weapons).length === 15, "shared visual data should preserve all 15 weapon identities");
    Object.entries(visualData.weapons).forEach(([id, visual]) => {
      const dx = visual.muzzle[0] - visual.grip[0];
      const dy = visual.muzzle[1] - visual.grip[1];
      if (Math.hypot(dx, dy) > 0.05) {
        const axis = Math.atan2(dy, dx) * 180 / Math.PI;
        const delta = ((axis - visual.art_angle_deg + 540) % 360) - 180;
        assert(Math.abs(delta) <= 12, `${id} muzzle anchor should agree with its authored sprite axis`);
      }
    });
    for (let frame = 0; frame < 8; frame++) {
      const asset = path.join(root, `build/web/assets/sprites/effects/combat_hit_${frame}.png`);
      assert(fs.existsSync(asset), `generated impact sprite ${frame} should be bundled for web`);
    }
    assert(source.includes("window.weaponVisualTestApi ="), "game should expose the browser-only combat regression seam");
    assert(source.includes("function getWeaponMuzzleWorld"), "projectiles and flashes should share a muzzle socket helper");
    assert(source.includes("function getWeaponFlashLocalAngle"), "muzzle flash ellipse should align to the authored weapon axis");
    assert(source.includes("function getHorizontalFacing"), "near-vertical aim should preserve horizontal facing");
    assert(source.includes("function applyHitFeedback"), "projectile, melee and AoE hits should share target feedback");
    assert(source.includes("function loadWeaponVisuals"), "visual metadata should load through a retryable loader");
    assert(source.includes("weapon-visual-retry"), "metadata load failures should offer an in-menu retry action");
    assert(/function resetStats\(\)[\s\S]*?state\.player\.attack_anim_duration = 0\.28;[\s\S]*?state\.player\.run_phase = 0;/.test(source), "a restarted run should reset the attack pose duration and full-stride phase");
    console.log("Web combat visual source contract passed.");
    return;
  }

  window.runWebHitFeedbackRegression = () => {
    const api = window.weaponVisualTestApi;
    assert(api && typeof api.snapshot === "function", "browser combat regression API should be ready");
    const snapshot = api.snapshot();
    assert(snapshot.visualStatus === "ready", `visual metadata should be ready, got ${snapshot.visualStatus}`);
    assert(snapshot.hitSpritesReady, "the generated hit effect atlas frames should all be loaded");
    const visuals = snapshot.visuals;
    const expectedIds = [
      "quill_blaster", "syllable_shotgun", "lexicon_beam", "punctuation_bomb",
      "dictionary_blade", "crossword_crossbow", "hyphen_boomerang", "ink_flamethrower",
      "thesaurus_rocket", "quote_pistols", "calligraphy_katana", "scroll_turret",
      "rune_orb", "grammar_sniper", "word_loom"
    ];
    assert(Object.keys(visuals).length === expectedIds.length, "visual metadata should cover all weapon identities");
    expectedIds.forEach((id) => {
      const visual = visuals[id];
      assert(visual, `${id} visual metadata is missing`);
      assert(Number.isFinite(visual.draw_size) && visual.draw_size >= 20 && visual.draw_size <= 48, `${id} draw size is outside the visible range`);
      [visual.grip, visual.muzzle].forEach((anchor) => {
        assert(Array.isArray(anchor) && anchor.length === 2 && anchor.every((n) => n >= 0 && n <= 1), `${id} has an invalid normalized anchor`);
      });
    });

    const center = { x: 100, y: 200 };
    const muzzle = api.getWeaponMuzzleWorld("grammar_sniper", center, 0);
    assert(muzzle.x > center.x + 12 && Math.abs(muzzle.y - center.y) < 8, "right-aimed sniper muzzle should sit beyond the hero body");
    const fired = api.fireTestShot("grammar_sniper", 0);
    assert(Math.abs(fired.projectile.x - fired.expected.x) < 0.01 && Math.abs(fired.projectile.y - fired.expected.y) < 0.01, "the projectile should spawn at the exact same socket as the muzzle transform");
    const diagonal = api.getWeaponMuzzleWorld("syllable_shotgun", center, Math.PI / 2);
    assert(diagonal.y > center.y + 12 && Math.abs(diagonal.x - center.x) < 12, "art-axis correction should keep the shotgun muzzle aligned when aiming down");
    const flashAngle = api.flashAxisWorld("grammar_sniper", Math.PI * 0.72);
    assert(Math.abs(Math.atan2(Math.sin(flashAngle - Math.PI * 0.72), Math.cos(flashAngle - Math.PI * 0.72))) < 1e-8, "diagonal muzzle flash long axis should align with projectile direction");
    assert(api.horizontalFacing(Math.PI / 2, true) === true && api.horizontalFacing(Math.PI / 2, false) === false, "vertical aim should retain the prior left or right facing");
    assert(api.horizontalFacing(Math.PI, false) === true && api.horizontalFacing(0, true) === false, "clear horizontal aim should update facing normally");
    const castOrigin = api.getWeaponMuzzleWorld("rune_orb", center, Math.PI / 2);
    assert(Math.abs(castOrigin.x - center.x) < 4 && Math.abs(castOrigin.y - center.y) < 4, "centered orb casting should retain its palm origin");

    const bobSamples = Array.from({ length: 8 }, (_, phase) => api.locomotionBobAt(phase));
    assert(bobSamples.filter(bob => bob === 2).length === 2, "footfall bob should pulse twice across Inky's full eight-frame stride");
    const runningPose = api.locomotionPose({ x: 0, y: 0, vx: 100, vy: 0, run_phase: 2, attack_anim_timer: 0, is_dashing: false });
    const attackPose = api.locomotionPose({ x: 0, y: 0, vx: 100, vy: 0, run_phase: 2, attack_anim_timer: 0.1, is_dashing: false });
    assert(runningPose.y === -2 && attackPose.x === 0 && attackPose.y === 0, "body lean and footfall bob should settle to neutral on an attack pose");

    const before = api.snapshot().effectCount;
    const target = { x: 0, y: 0, hp: 100, vx: 0, vy: 0 };
    api.applyHitFeedback(target, { x: -1, y: 0 }, "ink", false, false);
    assert(target.hit_flash_timer > 0, "ordinary hits should briefly flash the target");
    assert(target.vx < 0, "hit response should follow the impact direction");
    assert(api.snapshot().effectCount === before + 1, "a hit should create one bounded impact sprite");
    api.applyHitFeedback(target, { x: 1, y: 0 }, "heavy", true, false);
    assert(target.vx > 0 && target.hit_flash_timer > 0, "heavy feedback should still use the supplied knock direction");
    assert(api.snapshot().effectCount <= before + 2, "combat feedback should not fan one hit into an unbounded effect burst");

    const melee = api.meleeTiming("dictionary_blade");
    assert(melee.windup > 0 && melee.active > 0 && melee.recovery > 0, "melee should define separate windup, active and recovery phases");
    assert(melee.arcPeakTime >= melee.windup && melee.arcPeakTime <= melee.windup + melee.active, "blade arc peak should coincide with the damage-active window");
    const hitTarget = { x: 80, y: 0, hp: 100, vx: 0, vy: 0 };
    const hitCount = api.simulateMeleeHit("dictionary_blade", [hitTarget], 0);
    assert(hitCount === 1 && hitTarget.hp < 100, "an active blade frame should hit its target once");
    assert(api.simulateMeleeHit("dictionary_blade", [hitTarget], 0, new Set([hitTarget])) === 0, "the same swing should not hit one target twice");

    return { weaponCount: expectedIds.length, muzzle: { sniper: muzzle, shotgunDown: diagonal }, flashAxis: flashAngle, facingAtVerticalAim: { left: api.horizontalFacing(Math.PI / 2, true), right: api.horizontalFacing(Math.PI / 2, false) }, projectileOriginParity: fired, impactSprites: api.snapshot().effectCount - before, melee };
  };
})();
