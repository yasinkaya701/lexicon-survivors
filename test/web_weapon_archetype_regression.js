/* Node contract checks and browser-injected deterministic signature checks. */
(() => {
  const assert = (condition, message) => {
    if (!condition) throw new Error(`Web weapon archetype regression: ${message}`);
  };
  const ids = [
    "quill_blaster", "syllable_shotgun", "lexicon_beam", "punctuation_bomb",
    "dictionary_blade", "crossword_crossbow", "hyphen_boomerang", "ink_flamethrower",
    "thesaurus_rocket", "quote_pistols", "calligraphy_katana", "scroll_turret",
    "rune_orb", "grammar_sniper", "word_loom"
  ];
  const expectedEvolutions = {
    quill_blaster: ["longer_mark", "marked_echo", "paired_echo"],
    syllable_shotgun: ["denser_fan", "center_cluster", "close_punctuation_blast"],
    lexicon_beam: ["longer_sweep", "wide_sweep", "split_final_target"],
    punctuation_bomb: ["larger_mine", "linked_mines", "kill_punctuation_field"],
    dictionary_blade: ["orbiting_blade", "timed_parry", "ring_counter"],
    crossword_crossbow: ["piercing_bolt", "impact_split", "grid_volley"],
    hyphen_boomerang: ["longer_path", "marked_return", "orbiting_hyphens"],
    ink_flamethrower: ["wide_cone", "hotter_burn", "igniting_sweep"],
    thesaurus_rocket: ["larger_blast", "synonym_cluster", "word_field"],
    quote_pistols: ["faster_pair", "punctuation_third", "marked_crit_ricochet"],
    calligraphy_katana: ["cross_cut", "long_ink_crescent", "marked_finisher"],
    scroll_turret: ["longer_uptime", "linked_second_turret", "synchronized_focus"],
    rune_orb: ["more_bounces", "final_pulse", "rune_trap"],
    grammar_sniper: ["armor_break", "kill_through", "weakpoint_chain"],
    word_loom: ["wide_margin", "marked_footnotes", "linked_margins"]
  };

  if (typeof window === "undefined") {
    const fs = require("node:fs");
    const path = require("node:path");
    const root = path.join(__dirname, "..");
    const source = fs.readFileSync(path.join(root, "build/web/game.js"), "utf8");
    const native = JSON.parse(fs.readFileSync(path.join(root, "assets/data/weapon_archetypes.json"), "utf8"));
    const web = JSON.parse(fs.readFileSync(path.join(root, "build/web/assets/data/weapon_archetypes.json"), "utf8"));
    const visuals = JSON.parse(fs.readFileSync(path.join(root, "assets/data/weapon_visuals.json"), "utf8"));
    assert(JSON.stringify(native) === JSON.stringify(web), "Godot/web archetype data must match exactly");
    assert(native.version === 1 && Object.keys(native.weapons).length === ids.length, "schema must cover all 15 stable weapon IDs");
    assert(ids.every(id => native.weapons[id]), "no existing weapon/save key can be dropped");
    const signatures = ids.map(id => native.weapons[id].signature);
    assert(new Set(signatures).size === ids.length, "all weapon signatures must be distinct");
    ids.forEach(id => {
      const row = native.weapons[id];
      assert(row.role && row.hit_profile && row.economy && row.rhythm && row.limits && row.evolutions, `${id} needs a full archetype and economy contract`);
      assert(fs.existsSync(path.join(root, visuals.weapons[id].sprite)), `${id} must have its own weapon art`);
      const image = fs.readFileSync(path.join(root, visuals.weapons[id].sprite));
      assert(image.readUInt32BE(16) === 320 && image.readUInt32BE(20) === 320, `${id} art must use the shared 320px master size`);
      assert(Number.isInteger(row.economy.cost) && row.economy.cost >= 0 && Number.isFinite(row.economy.damage) && row.economy.damage > 0 && Number.isFinite(row.economy.cooldown) && row.economy.cooldown > 0, `${id} needs valid shared shop values`);
      [2, 3, 4].forEach((tier, index) => assert(row.evolutions[tier] === expectedEvolutions[id][index], `${id} tier ${tier} evolution key must match the cross-runtime contract`));
      ["windup", "active", "recovery"].forEach(phase => assert(Number.isFinite(row.rhythm[phase]) && row.rhythm[phase] >= 0, `${id} has invalid ${phase} rhythm`));
    });
    const catalogStart = source.indexOf("const WEAPONS_CATALOG = {");
    const catalogEnd = source.indexOf("\n};", catalogStart);
    const catalog = source.slice(catalogStart, catalogEnd);
    ids.forEach(id => {
      const entry = catalog.match(new RegExp(`^  ${id}: \\{[\\s\\S]*?cost: (\\d+), cooldown: ([\\d.]+), damage: ([\\d.]+)`, "m"));
      assert(entry, `${id} must have a web fallback balance record`);
      const shared = native.weapons[id].economy;
      assert(Number(entry[1]) === shared.cost && Number(entry[2]) === shared.cooldown && Number(entry[3]) === shared.damage, `${id} web fallback must match shared balance data`);
    });
    assert(source.includes("window.weaponArchetypeTestApi ="), "browser deterministic test seam must be exposed");
    assert(source.includes("getHeroRunFrameIndex"), "web heroes must use a shared stride phase across sprite frame counts");
    assert(source.includes("function getHeroRunFrameCount"), "web animation should select the authored full run cycle for each character");
    assert(source.includes("p.run_phase += dashSpd * dt / 17"), "web dash movement should keep the stride animation clock advancing");
    for (const key of ["inky", "quillmaster", "word_knight", "rune_sorceress", "alchemist", "shadow_scribe"]) {
      for (let frame = 0; frame < 8; frame++) {
        const asset = path.join(root, `build/web/assets/sprites/upgrade_v1/animations/${key}_run_v2_${frame}.png`);
        assert(fs.existsSync(asset), `${key} run animation needs all eight v2 gait frames`);
        const image = fs.readFileSync(asset);
        assert(image.readUInt32BE(16) === 64 && image.readUInt32BE(20) === 64, `${key} run frame ${frame} must use the shared 64px canvas`);
      }
      for (const kind of ["ranged", "attack"]) for (let frame = 0; frame < 4; frame++) {
        const asset = path.join(root, `build/web/assets/sprites/upgrade_v1/animations/${key}_${kind}_v2_${frame}.png`);
        assert(fs.existsSync(asset), `${key} ${kind} animation needs four authored v2 frames`);
      }
    }
    assert(source.includes("getShotRecoilOffset"), "web ranged fire must add an aim-relative body recoil layer");
    assert(source.includes("function loadWeaponArchetypes"), "archetype schema must be loaded before a run");
    assert(source.includes("function resolveWeaponSignature"), "weapon behavior must route through archetype signature logic");
    assert(source.includes("function getHeroActionDirection"), "hero orientation should momentarily follow the active weapon aim");
    assert(/function requestAttackPose\(weaponId, actionKind, aim\)[\s\S]*?getWeaponArchetype\(weaponId\)[\s\S]*?rhythm/.test(source), "weapon action poses should follow the shared per-weapon rhythm data");
    assert(native.weapons.dictionary_blade.limits.parry_radius >= 100 && native.weapons.dictionary_blade.limits.parry_window > 0, "guard blade must define a readable projectile-parry radius and active frame");
    assert(native.weapons.crossword_crossbow.economy.damage < native.weapons.grammar_sniper.economy.damage
      && native.weapons.grammar_sniper.economy.cooldown > native.weapons.crossword_crossbow.economy.cooldown, "grid crossbow and weakpoint rail must occupy distinct damage/cadence roles");
    console.log("Web weapon archetype schema contract passed.");
    return;
  }

  window.runWebWeaponArchetypeRegression = () => {
    const api = window.weaponArchetypeTestApi;
    assert(api, "web archetype test API is ready");
    assert(api.snapshot().status === "ready", "archetypes should load before a run");
    assert(Math.abs(api.inkMultiplier("lexicon_alchemist", "normal")
      / api.inkMultiplier("inky", "normal") - 1.4) < 1e-8, "Alchemist's 40% ink passive must apply only to that character");
    assert(api.runFrameIndex(4, 4) === 2 && api.runFrameIndex(4, 8) === 4, "four-frame and eight-frame heroes must match at the same gait phase");
    assert(api.runFrameIndex(8, 4) === 0 && api.runFrameIndex(8, 8) === 0, "all web run cycles must loop on the same footfall");
    ["inky", "quillmaster", "word_knight", "rune_sorceress", "lexicon_alchemist", "shadow_lexicographer"].forEach(id =>
      assert(api.runFrameCount(id) === 8, `${id} must animate with a complete eight-frame stride`));
    const dashDirection = api.heroActionDirection({ is_dashing: true, dash_dir: { x: 0, y: -1 }, attack_anim_timer: 0.2,
      shot_recoil_timer: 0.2, last_aim: { x: 1, y: 0 }, vx: 0, vy: 0 });
    assert(dashDirection.x === 0 && dashDirection.y === -1, "a dash pose must face the actual dash direction");
    const rangedPose = api.rangedPoseContract("grammar_sniper", { x: 100, y: 0 });
    assert(rangedPose.attackTimer >= 0.29 && rangedPose.attackFrame === 0 && rangedPose.recoil.x < -2, "heavy ranged fire must show a deliberate brace/release pose with visible backward body recoil");
    assert(rangedPose.bodyDirection.x === 1 && rangedPose.facingLeft === false, "ranged recoil should briefly align body facing with the weapon aim while preserving the locomotion animation");
    assert(Math.hypot(rangedPose.recoil.x, rangedPose.recoil.y) <= 6.5, "large target vectors must be normalized before body recoil is applied");
    ids.forEach(id => {
      assert(api.getSignature(id), `${id} signature should resolve`);
      [2, 3, 4].forEach((tier, index) => assert(api.getEvolution(id, tier) === expectedEvolutions[id][index], `${id} tier ${tier} evolution key should match Godot`));
    });

    const beam = api.beamPhase("lexicon_beam");
    assert(beam(0.02) === "windup" && beam(0.24) === "active" && beam(0.70) === "recovery", "beam has readable charge, active sweep and recovery phases");
    const fan = api.shotgunFan("syllable_shotgun", 5);
    assert(fan.length === 5 && Math.abs(fan[0] + fan.at(-1)) < 1e-8 && Math.abs(fan[2]) < 1e-8, "shotgun fan is symmetric around aim");
    assert(Math.max(...fan.map(Math.abs)) <= api.getSignatureData("syllable_shotgun").limits.spread_radians, "shotgun spread respects its authored cone");
    assert(api.minePhase("punctuation_bomb", 0.5) === "fuse" && api.minePhase("punctuation_bomb", 1.1) === "active" && api.minePhase("punctuation_bomb", 5) === "expired", "mine has a readable fuse and finite hazard");
    const mineRuntime = api.mineRuntimeContract();
    assert(mineRuntime.detonated && Math.abs(mineRuntime.hazardRemaining - 2.5) < 1e-8, "base mine keeps the shared 2.5 second hazard after real detonation update");
    const katanaDamage = api.katanaSharedHitContract();
    assert(katanaDamage.hits === 1, "katana swing and its projectile share one per-swing target hit");
    const guard = api.guardParryContract();
    assert(guard.nearbyCleared && guard.farPreserved && guard.counterShot, "guard blade clears only nearby enemy shots and returns a tier-three counter");

    const passHits = api.simulateBoomerangPasses(["a", "a", "b"]);
    assert(passHits.outbound.join(",") === "a,b" && passHits.returning.join(",") === "a,b", "boomerang can hit once on each pass, without same-pass duplicates");
    assert(api.clampBurnStacks("ink_flamethrower", 9) === 2, "flame stack count obeys the shared cap");
    const pistol = { alt_side: false };
    const sides = [0, 1, 2, 3].map(() => api.nextPistolSide(pistol));
    assert(sides[0] !== sides[1] && sides[1] !== sides[2] && sides[2] !== sides[3], "dual pistols alternate hand/recoil sides");
    assert(!api.canPlaceTurret("scroll_turret", 2), "base turret cap is enforced");
    const chain = api.pickRuneChainTargets({ x: 0, y: 0 }, ["a", "a", "b", "c", "d"], 3);
    assert(chain.length === 3 && new Set(chain).size === 3, "Rune Orb chains to a bounded set of unique targets");
    const crowdedTargets = [
      { id: "closest-hit", x: 1, y: 0, hp: 10, dead: false },
      { id: "already-hit", x: 2, y: 0, hp: 10, dead: false },
      { id: "next-free", x: 3, y: 0, hp: 10, dead: false }
    ];
    const nextFree = api.selectWeaponTarget({ id: "quill_blaster" }, crowdedTargets, { x: 0, y: 0 }, crowdedTargets[0], new Set([crowdedTargets[1]]));
    assert(nextFree === crowdedTargets[2], "secondary hits skip prior targets without allocating a filtered enemy roster");
    const loom = api.wordLoomRuntimeContract();
    assert(loom.fieldCount === 2 && loom.hp < 50 && loom.slowFactor <= 0.46 && loom.linkedCount === 2, "Word Loom must slow caught enemies and link a second zone at its final evolution");
    assert(api.getMeleePhase("dictionary_blade", 0.11) === "active" && api.getMeleePhase("calligraphy_katana", 0.02) === "windup", "defensive blade and directional katana have distinct active timings");
    assert(api.sniperDamage("grammar_sniper", 100, true) > api.sniperDamage("grammar_sniper", 100, false), "sniper weakpoint profile rewards elite/boss target priority");
    assert(api.signsTurretAndRuneConsistently(), "scroll turret deploys a capped focused turret and Rune Orb bounces in the web client");
    return { weapons: ids.length, signatures: new Set(ids.map(api.getSignature)).size, beam, fan, boomerang: passHits, guard, sides, chain };
  };
})();
