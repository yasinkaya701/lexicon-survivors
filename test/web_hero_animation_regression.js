(() => {
  window.runHeroAnimationRegression = () => {
    const player = {
      attack_anim_duration: 0.24,
      attack_anim_windup: 0.08,
      attack_anim_active: 0.04,
      attack_anim_timer: 0.24,
      run_phase: 0
    };
    const timers = [0.24, 0.19, 0.14, 0.04];
    const expected = [0, 1, 2, 3];
    const actual = timers.map(timer => {
      player.attack_anim_timer = timer;
      return getHeroAnimationFrame("ranged", player);
    });
    if (actual.some((frame, index) => frame !== expected[index])) {
      throw new Error(`Ranged attack frames must follow windup, impact, and recovery timing. Expected ${expected}; got ${actual}`);
    }
    const rendered = [
      getHeroRenderAction({ vx: 180, vy: 0, is_dashing: false, attack_anim_timer: 0.08, attack_anim_kind: "ranged" }),
      getHeroRenderAction({ vx: 0, vy: 0, is_dashing: false, attack_anim_timer: 0.08, attack_anim_kind: "ranged" }),
      getHeroRenderAction({ vx: 180, vy: 0, is_dashing: false, attack_anim_timer: 0.08, attack_anim_duration: 0.4, attack_anim_windup: 0.08, attack_anim_active: 0.12, attack_anim_kind: "melee" })
    ];
    if (rendered.join(",") !== "run,ranged,run") {
      throw new Error(`Locomotion should hold through ranged fire and melee recovery. Expected run,ranged,run; got ${rendered}`);
    }

    if (typeof getHeroRenderLayers !== "function") {
      throw new Error("Moving attacks need a run base pose and a separate upper-body action layer");
    }
    const movingRanged = getHeroRenderLayers({
      vx: 180, vy: 0, run_phase: 3.5, is_dashing: false, attack_anim_timer: 0.20,
      attack_anim_duration: 0.24, attack_anim_windup: 0.08,
      attack_anim_active: 0.04, attack_anim_kind: "ranged"
    });
    const movingMelee = getHeroRenderLayers({
      vx: 180, vy: 0, run_phase: 3.5, is_dashing: false, attack_anim_timer: 0.22,
      attack_anim_duration: 0.34, attack_anim_windup: 0.11,
      attack_anim_active: 0.10, attack_anim_kind: "melee"
    });
    const movingRecovery = getHeroRenderLayers({
      vx: 180, vy: 0, run_phase: 3.5, is_dashing: false, attack_anim_timer: 0.08,
      attack_anim_duration: 0.34, attack_anim_windup: 0.11,
      attack_anim_active: 0.10, attack_anim_kind: "melee"
    });
    const standingRanged = getHeroRenderLayers({
      vx: 0, vy: 0, is_dashing: false, attack_anim_timer: 0.20,
      attack_anim_duration: 0.24, attack_anim_windup: 0.08,
      attack_anim_active: 0.04, attack_anim_kind: "ranged"
    });
    const expectedLayers = [
      movingRanged.base, movingRanged.upperBody,
      movingMelee.base, movingMelee.upperBody,
      movingRecovery.base, movingRecovery.upperBody,
      standingRanged.base, standingRanged.upperBody
    ];
    if (expectedLayers.join(",") !== "run,,run,,run,,ranged,") {
      throw new Error(`Moving attacks must keep one clean run sprite; stationary attacks use their full action pose. Expected run,,run,,run,,ranged,; got ${expectedLayers}`);
    }
    const animationFrames = [movingRanged.baseFrame, movingRanged.upperBodyFrame,
      movingMelee.baseFrame, movingMelee.upperBodyFrame, movingRecovery.baseFrame, standingRanged.baseFrame];
    if (animationFrames.join(",") !== "3,,3,,3,0") {
      throw new Error(`Moving attacks must not stack a second full-body sprite over the gait. Expected 3,,3,,3,0; got ${animationFrames}`);
    }

    const heroAnimationKeys = {
      inky: "inky",
      quillmaster: "quillmaster",
      word_knight: "word_knight",
      rune_sorceress: "rune_sorceress",
      lexicon_alchemist: "alchemist",
      shadow_lexicographer: "shadow_scribe"
    };
    const requiredActions = ["run", "attack", "ranged"];
    const heroSpriteFrames = Object.entries(heroAnimationKeys).map(([character, key]) => {
      const missing = requiredActions.flatMap(action => [0, 1, 2, 3]
        .filter(frame => !images[`upgrade_v1/animations/${key}_${action}_v2_${frame}.png`]?.naturalWidth)
        .map(frame => `${action}:${frame}`));
      if (missing.length) throw new Error(`${character} is missing layered animation frames: ${missing.join(", ")}`);
      return character;
    });

    const oldInventoryState = state.is_inventory_open;
    state.is_inventory_open = false;
    const runPose = getLocomotionPoseOffset({ x: 0, y: 0, vx: 180, vy: 0, run_phase: 3.5, is_dashing: false, attack_anim_timer: 0 });
    const firePose = getLocomotionPoseOffset({ x: 0, y: 0, vx: 180, vy: 0, run_phase: 3.5, is_dashing: false, attack_anim_timer: 0.18, shot_recoil_timer: 0 });
    state.is_inventory_open = oldInventoryState;
    if (runPose.x !== firePose.x || runPose.y !== firePose.y) {
      throw new Error(`Ranged fire must not freeze locomotion bob. Expected ${JSON.stringify(runPose)}, got ${JSON.stringify(firePose)}`);
    }
    return { rangedPoseFrames: actual, blendedActions: rendered, movingRanged, movingMelee, movingRecovery, standingRanged, heroSpriteFrames };
  };
})();
