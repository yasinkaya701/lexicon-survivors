# Combat Animation and Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep hero locomotion readable during automatic fire, give weapons distinct action feedback, and make shop math agree between Godot and web.

**Architecture:** Separate hero locomotion from weapon action events; keep the current 14 weapon identities but make every role readable through its behavior, timing, and weapon-specific response. Store shared balance fields in one JSON asset consumed by GDScript and the web client.

**Tech Stack:** Godot 4.x GDScript, JavaScript Canvas, JSON, existing gameplay regression tests.

**Spec:** `docs/superpowers/specs/2026-11-05-library-exploration-mobile-leaderboard-design.md`

**Execution order:** Task 1 locomotion/action rules → Task 4 weapon mounts and hit feel → Task 5 signature weapon archetypes/evolutions → Task 8 audio integration → Tasks 6–7 gadget/relic and enemy mechanics → Tasks 2–3 shared balance and run-level validation. This order lets balance be tuned against the final combat systems.

## Global Constraints

- Do not turn the game into survival-until-full-screen-cap play; waves remain discrete and the player retains the current choice to advance.
- Use one versioned JSON balance source for weapon price, damage, cadence, and relevant utility.
- Run ink resets between runs; keep any long-term unlocks cosmetic or sidegrade based.
- This is a 2D pixel-art game; use layered sprite poses, weapon sprites, particles, and UI motion rather than introducing 3D assets.

## Review Focus

- Fast attack speed with multiple equipped weapons: attack feedback cannot suppress the run animation continuously. Pin with an automatic-fire locomotion regression.
- Locomotion should carry a little momentum through direction changes, settle smoothly after input release, and pace the existing foot cycle from actual travel speed. Preserve average move speed and all shelf collision limits.
- No enemies in range: facing and movement continue without a forced attack pose. Pin in both runtime tests.
- Melee weapon starts/stops mid-swing: resolve damage only once at the attack's hit frame, with recovery before the next swing. Pin existing weapon hit regression.
- Price just below/above available ink: purchase succeeds/fails atomically and leaves the correct balance. Pin shop affordability tests.
- Web build cannot fetch the balance asset: use a bundled safe fallback or block start with a clear retry message; do not start a half-configured run. Pin fetch failure behavior.

---

### Task 1: Define Action Events and Animation State Rules

**Files:**
- Modify: `scripts/player.gd` animation timers and `play_attack_animation()`
- Modify: `scripts/weapon.gd` firing and melee action events
- Modify: `build/web/game.js` `updatePlayer()`, `shootWeapon()`, and player rendering
- Test: `test/gameplay_regression_test.gd`

**Interfaces:**
- Produces: `request_attack_pose(weapon_id: String, action_kind: String, aim: Vector2)` in Godot; web equivalent `requestAttackPose(weaponId, actionKind, aim)`
- `action_kind` is one of `ranged`, `melee`, `cast`, `heavy`; locomotion state remains independently selected from velocity
- Locomotion response keeps current top speed, but uses deliberate acceleration, gentle braking, and velocity-scaled run cadence. Attacks do not reset foot-cycle phase; facing follows the last meaningful aim or movement direction.

- [ ] **Step 1: Add tests proving idle/run state is not replaced by every ranged projectile**

Assert continuous movement remains `run` across several ranged shots; assert the run phase advances during fire; assert velocity eases from rest and settles on release without changing top speed; assert melee/cast events request their action pose; assert movement resumes after the action recovery window.

- [ ] **Step 2: Run the focused regression and observe the per-shot interruption**

Run: `godot --headless --path . -s test/gameplay_regression_test.gd`

Expected: new locomotion assertion fails while current 0.28s timer is restarted by every weapon.

- [ ] **Step 3: Implement action request routing**

Remove unconditional hero attack-timer writes from the shared projectile function. Pass weapon ID/action kind/aim from each weapon action; only an active attack event can trigger a brief hero response. Preserve weapon recoil, projectile cadence, and one-hit melee timing.

- [ ] **Step 4: Verify continuous movement and discrete attacks in both runtimes**

Run the Godot regression and browser animation check. Expected: running hero cycles continuously; a melee swing or cast shows its full start/hit/recovery sequence; ranged fire produces weapon recoil/flash without foot-cycle stutter.

### Task 2: Create One Shared Weapon Balance File

**Files:**
- Create: `assets/data/weapon_balance.json`
- Create: `build/web/assets/data/weapon_balance.json`
- Modify: `scripts/stats_manager.gd`
- Modify: `build/web/game.js` bootstrap and weapon catalog initialization
- Test: `test/gameplay_regression_test.gd` and a balance parity check in `test/`

**Interfaces:**
- JSON top-level keys: `version`, `run_start_ink`, and `weapons`
- Each weapon entry contains `cost`, `damage`, `cooldown`, and `role`; runtime-specific display text and sprite references remain in existing catalogs
- Godot loads via `StatsManager.load_weapon_balance()`; web awaits `loadWeaponBalance()` before a new run can start

- [ ] **Step 1: Capture a parity test for every shared weapon ID and run-start currency**

Compare the 14 Godot/web weapon IDs, `cost`, `damage`, `cooldown`, and start ink. Also assert each `role` is a non-empty entry from the documented role set.

- [ ] **Step 2: Run the parity check to identify existing divergence**

Run: `godot --headless --path . -s test/gameplay_regression_test.gd` and `node test/weapon_balance_parity_test.js`.

Expected: fail on Quill Blaster values and initial ink before the canonical file is applied.

- [ ] **Step 3: Add canonical balance records and load them in both runtimes**

Use web's current 15 starting ink as the initial parity target. Preserve all 14 existing weapon IDs. Merge only shared gameplay fields into runtime catalogs. The web loader must expose a ready Promise and defer `onStartGame()` until resolved; a fetch failure keeps the title interactive and presents a retryable status.

- [ ] **Step 4: Tune price/output relationships using current run income**

For each role, compute expected damage per second or utility per cooldown and compare with cost and wave ink income. Keep melee close-range premium tied to safety/uptime; do not allow one low-cost weapon to dominate other choices. Record final ratios in the regression's expected bounds.

- [ ] **Step 5: Verify JSON loading and all shop affordability boundaries**

Run the Godot regression, parity check, `node --check build/web/game.js`, and browser shop purchase flow. Expected: identical shared weapon values in both clients, correct 15 starting ink, and purchases update balance exactly once.

### Task 3: Validate Weapon Identity and Balance Across a Run

**Files:**
- Modify: `test/gameplay_regression_test.gd`
- Create: `test/weapon_balance_parity_test.js`
- Verify: `scripts/weapon.gd`, `build/web/game.js`

- [ ] **Step 1: Assert role-specific weapon behavior for the existing 14 weapons**

Check representative projectile, spread, beam, explosive, melee, orbit/deployable, and utility roles produce their expected attack event and visual feedback.

- [ ] **Step 2: Exercise a complete wave-shop-wave purchase chain**

Verify a player can earn, compare, buy, equip, and use at least one ranged and one melee choice; starting currency and wave income stay identical in both runtimes.

- [ ] **Step 3: Run all gameplay regression and static checks**

Run: `godot --headless --path . -s test/gameplay_regression_test.gd`, `node test/weapon_balance_parity_test.js`, and `node --check build/web/game.js`.

Expected: all 14 IDs resolve, all balance invariants pass, attacks retain distinct roles, and the wave shop remains turn based.

---

### Task 4: Upgrade Weapon Mounts, Muzzle Origins, and Hit Feedback

**Priority:** execute before the shared balance work. The weapon audit found that web shots often start at the player's center and that mount size/placement and melee timing diverge between runtimes.

**Files:**
- Create: `assets/data/weapon_visuals.json` and `build/web/assets/data/weapon_visuals.json`
- Create: eight compact impact frames from `assets/sprites/effects/combat_hits_4x2.png` and web mirror
- Modify: `scripts/weapon.gd`, `scripts/player.gd`, `scripts/projectile.gd`, `scripts/enemy.gd`
- Modify: `build/web/game.js`
- Test: `test/weapon_visual_parity_test.js`, `test/gameplay_regression_test.gd`, and `test/web_hit_feedback_regression.js`

**Interfaces:**
- Per weapon ID, shared visual data defines role, draw size, normalized grip anchor, normalized muzzle anchor, and recoil travel. Both clients derive mount, image pivot, flash, and projectile start from the same record.
- Hit feedback uses one event shape with damage type, impact position, and normalized knock direction. It emits a bounded, readable effect and target response; critical/heavy hits receive the strongest accent, ordinary rapid fire stays quiet.
- Melee uses matching windup/active/recovery windows in both runtimes; the visible blade arc reaches its peak on the active damage frame and each target can be hit once per swing.

- [ ] **Step 1: Add failing parity and combat-event regressions**

Assert all 14 IDs have a valid mount role, finite normalized anchors and a bounded draw size/recoil; assert projectile origin equals the world-space muzzle socket; assert melee windup/active/recovery timing and one hit per target; assert ordinary, heavy, critical and shield impacts route to the correct bounded effect. Keep damage numbers and wave schedule unchanged.

- [ ] **Step 2: Confirm the regressions fail on center-origin shots and mismatched swing timing**

Run the Godot gameplay regression plus the new Node checks. Expected: new muzzle, parity, and impact assertions fail before implementation.

- [ ] **Step 3: Load shared visual metadata and attach each weapon at its grip**

Use the same record to position and size each sprite in Godot/web, keep holstered weapons grouped cleanly, derive the muzzle socket from image-space anchors, and start each projectile and flash at that socket. Preserve character baked weapon poses so no weapon is double rendered. Keep facing-left rotations attached to the weapon's local +X axis.

- [ ] **Step 4: Add weapon-aware impact and synchronize melee active frames**

Use the generated impact atlas for compact hit sparks/slashes/shield deflections and heavy/critical accents. Web gains the same concise target flash/knock response already present in Godot; neither runtime shakes the screen on every shot. Align blade arc peak, target damage, and confirmation flourish on the active frame. Cap transient effects under high enemy counts.

- [ ] **Step 5: Tune footfall bob to the full run cycle and verify in-motion behavior**

Sync the 1–2 px locomotion bob to actual footfall poses in Inky's eight-frame stride instead of repeating twice per stride. Confirm it resets on idle, action, and dash, stays within measured shelf visual bounds, and remains sharp at web scale.

- [ ] **Step 6: Verify parity, bounded effects, corner reachability, and wave progression**

Run Godot gameplay/runtime regressions, `node test/weapon_visual_parity_test.js`, `node test/web_hit_feedback_regression.js`, `node --check build/web/game.js`, and a live browser check of muzzle origins and melee hits. Expected: weapon identity/scale/placement, shot origin, swing timing, feedback intensity, visible shelf corners, and discrete wave flow agree in both runtimes.

---

### Task 5: Redesign the 14 Weapon Archetypes and Their Upgrade Evolutions

**Priority:** follow Task 4. The user's latest direction explicitly expands the work from presentation to weapon types and hit behavior. Keep existing IDs as stable save/shop keys while changing their gameplay signatures.

**Files:**
- Create: `assets/data/weapon_archetypes.json` and `build/web/assets/data/weapon_archetypes.json`
- Modify: `scripts/stats_manager.gd`, `scripts/weapon.gd`, `scripts/projectile.gd`, `scripts/punctuation_mine.gd`, `scripts/enemy.gd`
- Modify: `build/web/game.js`
- Test: `test/weapon_archetype_parity_test.js`, `test/gameplay_regression_test.gd`, and `test/web_weapon_archetype_regression.js`

**Shared behavior matrix:**

| Existing key | New signature rhythm | Distinct hit behavior | Upgrade evolution |
|---|---|---|---|
| `quill_blaster` | Precision tap | Consecutive hits mark; marked target passes an echo shot | Longer mark, then one marked-target ricochet |
| `syllable_shotgun` | Pump then cone burst | Wide fan with close-range stagger | Tighter center cluster, then close-range punctuation blast |
| `lexicon_beam` | Brief charge, sustained sweep | Thin line ticks through a row | Longer sweep, then split at final target |
| `punctuation_bomb` | Place, visible fuse | Delayed area blast and short-lived floor hazard | Linked mines, then kill-triggered punctuation chain |
| `dictionary_blade` | Defensive recurring sweep | Radial cleave interrupts close attackers | Extra orbiting blade, then timed parry counter |
| `crossword_crossbow` | Heavy measured bolt | Narrow pin/stagger, then split shards | Pierce, then perpendicular grid volley |
| `hyphen_boomerang` | Outbound/return beat | Each pass can hit once | Mark-seeking return, then short orbit loop |
| `ink_flamethrower` | Short burst, vent pause | Close cone and stacking burn | Wider cone, then igniting sweep |
| `thesaurus_rocket` | Lock-on tell and heavy launch | Homing cluster blast with knockback | Split rockets, then leave a brief word field |
| `quote_pistols` | Alternating two-shot burst | Two precise lanes; successive hits can ricochet | Third punctuation shot, then marked-target ricochet |
| `calligraphy_katana` | Wind-up, directional cut, recovery | Forward ink crescent and stagger | Cross-cut follow-up, then marked-target finisher |
| `scroll_turret` | Place-and-hold support | Fixed autonomous focus fire, capped placements | Longer uptime, then linked second turret |
| `rune_orb` | Slow cast with clear pulse | Bounces across unique targets, final pulse bursts | More bounces, then short-lived rune trap |
| `grammar_sniper` | Telegraph and rare shot | Narrow armor-piercing elite damage | Armor break, then weak-point continuation |

- [ ] **Step 1: Pin every existing mismatch and signature contract**

Add parity assertions for attack pattern, target rule, hit profile, cooldown rhythm, and tier-evolution key across all 14 IDs. Add deterministic behavior tests for representative signatures, including placement, return/chain paths, one-hit tracking, cap/expiry, and distinct evolution effects.

- [ ] **Step 2: Capture failing red checks before rework**

Run Godot gameplay regression and the new Node behavior test. Expected: Godot/web mismatches are demonstrated for scroll turret, rune orb, katana, cooldown/tier effects, and missing shared signature records.

- [ ] **Step 3: Add the shared ID-keyed archetype schema**

Define role, targeting rule, rhythm, hit profile, bounded signature mechanic parameters, and tier-evolution keys in versioned JSON. Keep existing save keys and map any legacy display aliases. Do not change starting currency, damage budgets, shop phase, wave schedule, or enemy cap in this task.

- [ ] **Step 4: Implement distinct signatures in both runtimes**

Make weapon events and hit feedback use the shared behavior record. Align existing identities where they diverge (especially Scroll Turret, Rune Orb, and Calligraphy Katana). Add per-weapon cooldown rhythm, targeting, impact pattern, and level-evolution effects. Cap active mines, turrets, projectiles, burn stacks, and chained targets to preserve readability at high enemy counts.

- [ ] **Step 5: Verify all signatures in a turn-based run**

Run Godot and web behavior/parity tests, then play through wave → shop upgrade → next wave. Confirm each weapon reads differently at base level and changes behavior at its upgrade milestones; discrete wave progression, corner access, mobile loadout controls, and purchase/reward values remain correct.

---

### Task 6: Rework Gadgets and Relics; Add New Choices

**Files:**
- Create: `assets/data/utility_items.json` and `build/web/assets/data/utility_items.json`
- Modify: `scripts/stats_manager.gd`, `scripts/player.gd`, `scripts/hud.gd`, `build/web/game.js`, `build/web/index.html`
- Add icons from `assets/sprites/gadgets/` and `assets/sprites/relics/` with mirrored web copies
- Test: `test/utility_item_parity_test.js`, `test/gameplay_regression_test.gd`, and browser shop/mobile control flow

- [ ] **Step 1: Pin existing gadget/relic ID and value drift**

Compare all names, descriptions, prices, cooldowns, stat values and icons across runtimes. Add tests for buying, selecting, activating, inventory persistence, cooldown reset, and compact shop-card text/icon layout.

- [ ] **Step 2: Design a shared utility item catalog**

Update Turkish display names/descriptions and values around actual wave/shop income; retain current IDs or aliases for owned state. Add three new active gadgets (`index_storm`, `redact_field`, `palimpsest_step`) and three new passive relics (`marginalia_prism`, `mnemonic_thread`, `archivist_compass`) with generated icon assets and one clear mechanic each. Bring web's `slot_expansion` relic into Godot. Keep legacy gadget keys as load aliases and normalize them to shared canonical IDs. Avoid stat-only additions; each new item must create a gameplay decision or weapon/enemy interaction.

- [ ] **Step 3: Implement new mechanics and loadout/UI states in both clients**

Use one versioned JSON source. New gadgets work with touch/keyboard controls and show a readable cooldown state; relics update their description/effect when acquired. Ensure names wrap cleanly, no emoji placeholders, no hidden mobile controls, and purchases apply once.

- [ ] **Step 4: Verify every item and its values across runtimes**

Run parity checks, gameplay regression, shop and mobile browser flows. Confirm an active gadget can be selected/fired on mobile, relic values agree, and the wave/shop sequence remains intact.

---

### Task 7: Add Readable Enemy Behaviors and Counterplay

**Files:**
- Modify: `scripts/enemy.gd`, `scripts/main.gd`, and enemy spawning/catalog data
- Modify: `build/web/game.js`
- Add: `test/enemy_mechanics_parity_test.js` and Godot gameplay regression coverage

- [ ] **Step 1: Map current enemy identities, telegraphs, and existing special movement**

Identify which variants already have unique motion/telegraph states so new mechanics do not duplicate them. Define three distinct readable roles with an explicit tell, a response the player can make, recovery, and a capped effect.

- [ ] **Step 2: Add deterministic tests for each tell and counterplay window**

Assert state transitions, telegraph timing, damage/slow/stagger outcomes, cooldowns, and web/Godot behavior parity. Include a mobile-friendly reaction window and ensure inventory pause freezes every timer.

- [ ] **Step 3: Implement behaviors and staged wave introduction**

Unify four audited behaviors across both runtimes: Homophone Harpy lane telegraph + shot, Run-on Reaper locked-line charge + recovery, Idiom Imp warned ink puddle, and Oxymoron Ogre warned close-range shock ring. Add distinct pixel silhouettes/animation for new Imp/Ogre forms. Introduce them progressively after early waves. Do not change total enemy cap, wave order, boss schedule, or corner-safe arena bounds.

- [ ] **Step 4: Play-test counters and crowded-wave readability**

Verify each behavior can be countered by movement, target choice, or an available gadget; effects stay readable under the existing enemy cap and all new timers pause/resume with inventory.

---

### Task 8: Integrate the Supplied Music and Sound Effects

**Files:**
- Use: `assets/data/audio_manifest.json` and web mirror (already authored)
- Use: `assets/audio/` and mirrored web assets (selected main theme, boss track, four biome ambiences, weapon/gadget/gameplay/UI cues)
- Modify: `scripts/audio_manager.gd`, `scripts/weapon.gd`, `scripts/projectile.gd`, `scripts/punctuation_mine.gd`, `scripts/main.gd`, `build/web/game.js`, `build/web/index.html`
- Test: `test/audio_asset_manifest_test.js`, Godot headless/resource test, and local browser audio smoke check

- [ ] **Step 1: Verify the provided asset types and manifest mapping**

Check all paths exist and are readable; the supplied `biome_dark_library_theme.wav` contains MP3 data, so its project copy must use `.mp3`. Confirm PCM WAV SFX format and duration, then test manifest parity.

- [ ] **Step 2: Add asynchronous, user-gesture-safe music/effect playback**

Load main music on the start gesture; load stage ambience/loops as needed; use the dark boss track on boss waves; crossfade scene/biome changes. Decode web audio buffers lazily, preserve a procedural fallback on load failure, and do not block entering a wave.

- [ ] **Step 3: Route weapon tier variants and gameplay/UI events to supplied cues**

Map each weapon ID to its generated cue/variant and choose variant from T1–T4. Route rocket/mine/turret launch-vs-impact separately, hit light/heavy/critical, enemy/player defeat, pickups, wave/chapter changes, gadgets, shop purchase/reroll/tab, pause and quiz outcomes. Add an interval/concurrency cap for rapid automatic fire; expose separate music/SFX volume and mute controls.

- [ ] **Step 4: Verify the browser and Godot sound paths**

Run manifest validation, Godot resource loading, `node --check`, and live browser smoke checks after first user gesture. Confirm no autoplay rejection or missing-request errors, rapid fire does not flood the mixer, and mute/volume state works. Report any music loop/crossfade limitation.
