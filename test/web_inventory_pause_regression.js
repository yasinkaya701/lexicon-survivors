(() => {
  const assert = (condition, message) => {
    if (!condition) throw new Error(`Inventory pause regression: ${message}`);
  };
  const readGame = () => JSON.parse(window.render_game_to_text());
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  window.runInventoryPauseRegression = async ({ waitMs = 1600 } = {}) => {
    const initial = readGame();
    assert(initial.mode === "wave", `expected active wave, received ${initial.mode}`);
    if (window.innerWidth <= 700) {
      const menuButton = document.getElementById("mobile-menu-btn");
      const menuBounds = menuButton?.getBoundingClientRect();
      assert(menuBounds && menuBounds.width > 0 && menuBounds.left >= 0 && menuBounds.right <= window.innerWidth,
        `mobile menu button must fit inside viewport (right=${menuBounds?.right}, width=${window.innerWidth})`);
      assert(/^TUR\s+\d+\s*\/\s*100\s*·\s*\d+s$/.test(document.getElementById("timer-badge")?.textContent || ""),
        "mobile HUD must keep the round count and remaining seconds in its compact timer");
      const orientationHint = document.getElementById("orientation-hint");
      if (window.innerHeight > window.innerWidth) {
        assert(getComputedStyle(orientationHint).display !== "none", "portrait mode should offer the optional landscape hint");
        orientationHint.click();
        assert(orientationHint.hidden && getComputedStyle(orientationHint).display === "none",
          "the landscape hint close action must hide it on touch screens");
      }
    }

    document.getElementById("touch-gadget-btn").click();
    const gadgetUsed = readGame();
    assert(gadgetUsed.player.gadget_cooldown > 0, "gadget activation should start its cooldown");

    document.getElementById("touch-inv-btn").click();
    assert(document.getElementById("inventory-modal").style.display === "flex", "inventory should open");
    assert(state.is_inventory_open === true, "inventory state should be true while its modal is open");
    state.owned_gadgets.push("ink_cataclysm");
    document.getElementById("inventory-gadgets-tab").click();
    assert(document.getElementById("inventory-gadgets-panel").style.display === "block", "inventory gadget tab should show owned gadgets");
    const cataclysmCard = document.querySelector('#inv-gadgets-list .inventory-gadget-card[aria-pressed="false"]');
    assert(cataclysmCard, "a purchased gadget should appear as a selectable inventory row");
    cataclysmCard.click();
    assert(state.active_gadget_id === "ink_cataclysm", "selecting an owned gadget should equip it from inventory");
    assert(document.getElementById("inventory-modal").style.display === "none", "equipping a gadget should close inventory");
    state.active_gadget_id = "eraser_dash";
    updateHUD();
    document.getElementById("touch-inv-btn").click();
    assert(document.getElementById("inventory-modal").style.display === "flex", "inventory should reopen after changing gadget");
    document.getElementById("inventory-weapons-tab").click();
    const paused = readGame();
    await wait(waitMs);
    const stillPaused = readGame();

    assert(Math.abs(stillPaused.wave_time_left - paused.wave_time_left) < 0.05, "wave timer advanced while inventory was open");
    assert(stillPaused.player.hp === paused.player.hp, "player HP changed while inventory was open");
    assert(stillPaused.player.x === paused.player.x && stillPaused.player.y === paused.player.y, "player moved while inventory was open");
    assert(stillPaused.player.gadget_cooldown === paused.player.gadget_cooldown, "gadget cooldown advanced while inventory was open");
    assert(JSON.stringify(stillPaused.enemies) === JSON.stringify(paused.enemies), "enemy state changed while inventory was open");

    document.getElementById("close-inventory-btn").click();
    assert(document.getElementById("inventory-modal").style.display === "none", "inventory should close");
    assert(state.is_inventory_open === false, "inventory state should clear when its modal closes");
    assert(getComputedStyle(document.getElementById("mobile-touch-controls")).display === "block", "mobile controls should return after close");
    // The test's first gadget activation is an Eraser Dash. Inventory pauses
    // that 220 ms dash in place, so let its remaining duration finish before
    // measuring joystick travel in isolation.
    await new Promise((resolve, reject) => {
      const started = performance.now();
      const poll = () => {
        if (state.player.is_dashing === false) return resolve();
        if (performance.now() - started > 1500) return reject(new Error("Inventory pause regression: the resumed gadget dash did not finish"));
        setTimeout(poll, 25);
      };
      poll();
    });
    const beforeJoystick = readGame();

    const joystickZone = document.getElementById("joystick-zone");
    const rect = joystickZone.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    joystickZone.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, pointerId: 712, pointerType: "touch", isPrimary: true,
      clientX: startX, clientY: startY
    }));
    window.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, pointerId: 712, pointerType: "touch", isPrimary: true,
      clientX: startX + 36, clientY: startY
    }));
    await wait(320);
    window.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, pointerId: 712, pointerType: "touch", isPrimary: true,
      clientX: startX + 36, clientY: startY
    }));
    const moved = readGame();
    assert(moved.player.x > beforeJoystick.player.x + 10, "joystick movement did not resume after closing inventory");
    const joystickAfter = joystickZone.getBoundingClientRect();
    assert(Math.abs(joystickAfter.left - rect.left) < 0.5 && Math.abs(joystickAfter.top - rect.top) < 0.5,
      "the joystick must stay fixed after touch input instead of relocating under the thumb");

    await new Promise((resolve, reject) => {
      const started = performance.now();
      const poll = () => {
        if (document.getElementById("gadget-status").textContent === "HAZIR") return resolve();
        if (performance.now() - started > 8000) return reject(new Error("Inventory pause regression: gadget cooldown did not resume after close"));
        setTimeout(poll, 50);
      };
      poll();
    });
    await wait(150);
    document.getElementById("touch-gadget-btn").click();
    const gadgetResumed = readGame();
    assert(gadgetResumed.player.gadget_cooldown > 0, "gadget could not be activated after cooldown resumed");

    state.active_gadget_id = "ink_cataclysm";
    state.gadget_timer = 0;
    let cataclysmTarget = state.enemies.find((enemy) => !enemy.dead);
    if (!cataclysmTarget) {
      spawnEnemy();
      cataclysmTarget = state.enemies.find((enemy) => !enemy.dead);
    }
    assert(cataclysmTarget, "test needs a living enemy for Ink Cataclysm");
    cataclysmTarget.x = state.player.x + 100;
    cataclysmTarget.y = state.player.y;
    cataclysmTarget.hp = 5000;
    cataclysmTarget.max_hp = 5000;
    cataclysmTarget.vx = 0;
    cataclysmTarget.vy = 0;
    const cataclysmBaseSpeed = cataclysmTarget.speed;
    document.getElementById("touch-gadget-btn").click();
    assert(cataclysmTarget.stun_timer > 1.2, "Ink Cataclysm should apply its timed stun");
    assert(cataclysmTarget.hp < cataclysmTarget.max_hp, "Ink Cataclysm should deal its authored area damage");
    assert(cataclysmTarget.speed === cataclysmBaseSpeed, "Ink Cataclysm should not mutate base enemy speed");
    document.getElementById("touch-inv-btn").click();
    const cataclysmPausedTimer = cataclysmTarget.stun_timer;
    await wait(1800);
    assert(cataclysmTarget.stun_timer === cataclysmPausedTimer, "Ink Cataclysm stun expired while inventory was open");
    document.getElementById("close-inventory-btn").click();
    window.advanceTime(2600);
    assert(cataclysmTarget.stun_timer <= 0.05, "Ink Cataclysm stun did not expire after simulation resumed");
    assert(cataclysmTarget.speed === cataclysmBaseSpeed, "enemy base speed changed during Cataclysm recovery");

    state.current_wave = 5;
    state.enemies = [];
    startWave();
    assert(state.milestone_boss_delay > 1.7, "wave 5 should schedule its milestone boss");
    document.getElementById("touch-inv-btn").click();
    const bossDelayAtPause = state.milestone_boss_delay;
    await wait(1900);
    assert(state.milestone_boss_delay === bossDelayAtPause, "milestone boss countdown advanced while inventory was open");
    assert(!state.enemies.some((enemy) => enemy.is_boss), "milestone boss spawned while inventory was open");
    document.getElementById("close-inventory-btn").click();
    window.advanceTime(2000);
    assert(state.enemies.some((enemy) => enemy.is_boss), "milestone boss did not spawn when its simulation countdown resumed");
    const milestoneBossSpawnedAfterResume = state.enemies.some((enemy) => enemy.is_boss);

    state.boss_defeated = true;
    state.boss_mistake_queue = [];
    state.enemies = state.enemies.filter(enemy => !enemy.is_mistake_echo);
    endWave();
    await wait(50);
    assert(document.getElementById("story-intermission").hidden === false, "every fifth cleared wave should enter the story intermission");
    assert(document.getElementById("shop-screen").style.display === "none", "shop should wait until the story intermission is acknowledged");
    for (let panel = 1; panel < STORY_ARC_DATA.panel_count; panel += 1) {
      document.getElementById("story-next").click();
      assert(document.getElementById("story-intermission").hidden === false, "comic must remain open until its final panel");
    }
    assert(/DÜKKÂNA GEÇ/.test(document.getElementById("story-next").textContent), "final panel should offer the shop transition");
    document.getElementById("story-next").click();
    assert(document.getElementById("story-intermission").hidden === true, "final comic step should close the intermission");
    assert(document.getElementById("shop-screen").style.display !== "none", "acknowledging the story intermission should enter the between-wave shop");
    const inventoryModal = document.getElementById("inventory-modal");
    toggleInventoryModal(true);
    assert(inventoryModal.style.display === "none", "forced open toggle opened inventory over the shop");
    document.getElementById("inventory-btn").click();
    assert(inventoryModal.style.display === "none", "HUD inventory button opened inventory over the shop");
    document.getElementById("touch-inv-btn").click();
    assert(inventoryModal.style.display === "none", "touch inventory button opened inventory over the shop");
    document.getElementById("mobile-open-inv-btn").click();
    assert(inventoryModal.style.display === "none", "mobile quick-menu forced-open route opened inventory over the shop");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "i", bubbles: true }));
    assert(inventoryModal.style.display === "none", "I shortcut opened inventory over the shop");
    assert(state.is_inventory_open === false, "inventory state opened while the wave was inactive");

    inventoryModal.style.display = "flex";
    state.is_inventory_open = true;
    toggleInventoryModal(false);
    assert(inventoryModal.style.display === "none" && state.is_inventory_open === false, "forced close failed while wave was inactive");

    return {
      frozen: {
        waveTime: paused.wave_time_left,
        hp: paused.player.hp,
        player: { x: paused.player.x, y: paused.player.y },
        gadgetCooldown: paused.player.gadget_cooldown,
        enemyCount: paused.enemies.length
      },
      resumed: {
        player: { x: moved.player.x, y: moved.player.y },
        gadgetCooldown: gadgetResumed.player.gadget_cooldown
      },
      cataclysm: { pausedTimer: cataclysmPausedTimer, restoredSpeed: cataclysmTarget.speed },
      milestoneBoss: { frozenDelay: bossDelayAtPause, spawnedAfterResume: milestoneBossSpawnedAfterResume },
      shopInventoryBlocked: document.getElementById("inventory-modal").style.display === "none"
    };
  };
})();
