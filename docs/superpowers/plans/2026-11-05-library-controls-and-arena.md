# Library Controls and Arena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make keyboard, web-touch, and Godot-touch play usable while matching movement collision to the visible library shelves.

**Architecture:** Keep movement simulation in the existing web `game.js` and Godot `Player` character. Add a native Godot touch HUD and loadout panel that call existing StatsManager/player APIs; keep the web touch controls and fix safe-area placement. Use fixed world coordinates for the library frame and shared named bounds in both runtimes.

**Tech Stack:** Godot 4.x GDScript/TSCN, HTML/CSS/JavaScript Canvas, existing Playwright and Godot headless harnesses.

**Spec:** `docs/superpowers/specs/2026-11-05-library-exploration-mobile-leaderboard-design.md`

## Global Constraints

- Do not turn the game into survival-until-full-screen-cap play; waves remain discrete and the player retains the current choice to advance.
- Do not add decorative invisible walls or create a fake open map beyond the actual shelf line.
- This is a 2D pixel-art game; use layered sprite poses, weapon sprites, particles, and UI motion rather than introducing 3D assets.
- The existing Pages deployment is static. A persistent global board requires a server endpoint and a connected Cloudflare account. Do not put API tokens in the browser or commit them.
- Godot's Web export template is not installed. The current public HTML/JS build remains the deployable browser client; native Godot parity is developed and verified separately until an export template is available.

## Review Focus

- Phone safe-area insets and short landscape viewports: buttons stay inside the visible viewport and have at least 48 logical pixels of touch target. Verify in the web mobile-control Playwright flow and Godot HUD scene.
- Inventory opened during active combat: it pauses/blocks gameplay input intentionally, remains closable by touch, and re-syncs control visibility after closing. Verify open → close → movement/gadget actions.
- Gadget activation with no movement input: dash uses the player's facing direction and respects cooldown. Verify both touch and keyboard actions.
- Diagonal travel and dash at arena corners: the player never crosses shelf art or sticks before its inside face. Verify with bounds/collision regression.
- Starting wave/shop/game-over overlays: the touch cluster cannot intercept buttons belonging to an open modal. Verify overlay hit targets after each mode transition.

---

### Task 1: Stabilize Web Touch Controls

**Files:**
- Modify: `build/web/index.html` mobile/safe-area CSS for `#mobile-touch-controls`, `#joystick-zone`, `#touch-action-buttons`, and `.touch-circle-btn`
- Modify: `build/web/game.js:syncMobileControlsVisibility`, inventory close/sync handlers only if the check shows a missing state transition
- Test: `test/gameplay_regression_test.gd` is not applicable; use browser interaction described below

**Interfaces:**
- Consumes: existing `toggleInventoryModal()`, `activateActiveGadget()`, and `syncMobileControlsVisibility()`
- Produces: touch controls positioned with `env(safe-area-inset-*)`, no smaller than 48 CSS px, without covering modal actions

- [ ] **Step 1: Reproduce the mobile flow at 390×844 with touch enabled**

Start a run; tap inventory, close it, then tap gadget. Record modal state and gadget cooldown before/after; assert the gadget button is inside the viewport safe-area rectangle.

- [ ] **Step 2: Adjust safe-area offsets and modal visibility behavior**

Use CSS `calc(... + env(safe-area-inset-bottom, 0px))` / right inset. Preserve controls hidden while title, shop, quiz, inventory, quick-menu, or game-over overlays own input.

- [ ] **Step 3: Repeat the touch flow and inspect requests/errors**

Run the same Playwright interaction. Expected: inventory opens and closes, gadget cooldown changes from ready to its active countdown, control targets remain reachable, and there are no page errors or failed asset requests.

### Task 2: Add Native Godot Touch Actions and Loadout

**Files:**
- Modify: `scenes/hud.tscn` touch-action buttons and inventory panel nodes
- Modify: `scripts/hud.gd` touch visibility, inventory list, selected-state, and open/close behavior
- Modify: `scripts/player.gd` expose a callable gadget activation path and keyboard inventory action without duplicating cooldown logic
- Test: `test/gameplay_regression_test.gd`

**Interfaces:**
- Consumes: `StatsManager.owned_gadgets`, `StatsManager.equipped_weapons`, `StatsManager.select_gadget()`, weapon-cycle/index methods, and player `activate_active_gadget(input_dir)`
- Produces: `HUD.set_inventory_open(open: bool)`, `HUD.refresh_inventory()`, and a touch action that invokes player gadget activation with current/facing direction

- [ ] **Step 1: Add regression assertions for inventory selection and gadget activation**

Assert the inventory can be opened, selecting an owned weapon/gadget updates StatsManager, an unowned item cannot be selected, and gadget touch activation starts its cooldown once.

- [ ] **Step 2: Run the focused Godot regression to confirm assertions fail on current behavior**

Run: `godot --headless --path . -s test/gameplay_regression_test.gd`

Expected: failure for absent Godot inventory/touch action.

- [ ] **Step 3: Implement touch UI and shared action calls**

Only show the touch cluster when `DisplayServer.is_touchscreen_available()` (plus a test override). Anchor it above bottom/right safe-area margins. Include gadget cooldown/icon, cycle weapon, inventory open, and a visible close action. Populate owned gear from StatsManager; route selection through its existing methods.

- [ ] **Step 4: Run Godot gameplay and scene checks**

Run the regression script and `godot --headless --path . test/scene_instantiation_test.tscn`.

Expected: all existing checks plus touch/loadout assertions pass; no missing node/resource errors.

### Task 3: Align the Room Edge to the Bookshelf Art

**Files:**
- Modify: `scripts/arena_frame.gd`
- Modify: `scenes/main.tscn` wall collider placement/size
- Modify: `build/web/game.js` `updatePlayer()` bounds and arena draw coordinates
- Test: `test/gameplay_regression_test.gd`

**Interfaces:**
- Produces: a named common target rectangle derived from the inner shelf edge (texture measurement target about x ±1245, y ±870, adjusted by player collider radius)

- [ ] **Step 1: Add edge-distance regression assertions**

Measure collision contact from the sprite/collider center against the desired shelf edge; assert the player can reach that edge from all four cardinal directions and cannot cross it during a dash.

- [ ] **Step 2: Run the focused regression and capture the current early-stop failure**

Run: `godot --headless --path . -s test/gameplay_regression_test.gd`

Expected: horizontal reach assertion fails against the current x ±1200 wall.

- [ ] **Step 3: Anchor one frame in world space and place visible edge colliders**

Remove the 4400×3300 duplicate from `arena_frame.gd`. Use the same 2800×2100 world origin in web and Godot. Position collision at the measured inner shelf face, leaving collider-radius clearance; draw the frame as a fixed world object in the web renderer instead of centering it on player coordinates.

- [ ] **Step 4: Run corner, dash, and browser reach checks**

Run Godot regression, then move a browser player to all four corners. Expected: player body reaches the shelf pixels, stops without clipping, and no unused strips of floor or empty map are exposed.

### Task 4: Full Cross-Platform Input and Boundary Pass

**Files:**
- Modify: `test/gameplay_regression_test.gd`
- Verify: `build/web/index.html`, `build/web/game.js`, `scenes/main.tscn`, `scenes/hud.tscn`

- [ ] **Step 1: Run all relevant Godot suites**

Run: `godot --headless --path . -s test/gameplay_regression_test.gd` and `godot --headless --path . test/headless_runtime_test.tscn`.

Expected: touch, open/close inventory, gadget cooldown, corner, and wave progression checks pass.

- [ ] **Step 2: Run a 390×844 browser touch session**

Verify movement, safe-area reach, inventory open/close, gadget activation, and continued input after modal closure. Keep wave advancement turn-based.

- [ ] **Step 3: Check the working tree for accidental generated output**

Run: `git status --short`.

Expected: only intentional source/assets/spec changes are staged for the caller's next commit.
