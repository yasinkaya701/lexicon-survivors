extends SceneTree

const ARENA_FRAME_SCRIPT := preload("res://scripts/arena_frame.gd")

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	var stats_manager = root.get_node("StatsManager")
	var main_scene: PackedScene = load("res://scenes/main.tscn")
	var main = main_scene.instantiate()
	root.add_child(main)
	current_scene = main
	await process_frame
	paused = false
	main.start_game()
	var original_character: String = stats_manager.selected_character
	stats_manager.selected_character = "lexicon_alchemist"
	stats_manager.reset()
	var alchemist_ink_before: int = stats_manager.ink_count
	stats_manager.add_ink(10)
	var normal_ink_multiplier: float = stats_manager.difficulties.normal.ink_bonus_mult
	assert(stats_manager.ink_count == alchemist_ink_before + ceili(10.0 * normal_ink_multiplier * 1.15), "Alchemist's shared ink bonus must affect every collected reward")
	stats_manager.selected_character = "inky"
	stats_manager.reset()
	var inky_ink_before: int = stats_manager.ink_count
	stats_manager.add_ink(10)
	assert(stats_manager.ink_count == inky_ink_before + ceili(10.0 * normal_ink_multiplier), "The Alchemist passive must not leak into other characters")
	stats_manager.selected_character = original_character
	stats_manager.reset()
	stats_manager.attack_speed_mult = 2.0
	stats_manager.add_attack_speed(0.2)
	assert(is_equal_approx(stats_manager.attack_speed_mult, 2.135), "Attack speed should soften gains after the 2.1x threshold")
	stats_manager.add_attack_speed(20.0)
	assert(is_equal_approx(stats_manager.attack_speed_mult, 2.75), "Attack speed must never exceed its hard cap")
	stats_manager.armor = 0.4
	stats_manager.add_armor(0.2)
	assert(is_equal_approx(stats_manager.armor, 0.5025), "Armor should soften gains after the 45% threshold")
	stats_manager.add_armor(20.0)
	assert(is_equal_approx(stats_manager.armor, 0.65), "Armor must never exceed its hard cap")
	stats_manager.reset()
	assert(stats_manager.get_shop_price(10, "card") == 10, "Wave 1 cards should retain their base price")
	stats_manager.current_wave = 20
	assert(stats_manager.get_shop_price(10, "card") == 33, "Late-wave cards should use the shared progression price")
	assert(stats_manager.get_card_reroll_cost(1) > stats_manager.get_card_reroll_cost(0), "Repeated rerolls should become a deliberate currency sink")
	stats_manager.reset()

	# The native utility catalog must hydrate from the shared versioned source,
	# normalize old gadget keys, and keep purchases/cooldowns/slots bounded.
	var utility_data: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/data/utility_items.json"))
	assert(utility_data.get("version", 0) == 1, "Godot utility catalog must use the supported shared schema")
	assert(stats_manager.load_utility_items(), "Godot must load the shared gadget and relic catalog")
	var weapon_data: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/data/weapon_archetypes.json"))
	assert(weapon_data.get("version", 0) == 1, "Godot weapon balance must use the shared versioned schema")
	assert(stats_manager.load_weapon_economy(), "Godot must hydrate weapon shop values from shared data")
	for weapon_id in weapon_data.get("weapons", {}):
		var economy: Dictionary = weapon_data.weapons[weapon_id].get("economy", {})
		var catalog_entry: Dictionary = stats_manager.weapons_catalog[weapon_id]
		assert(int(catalog_entry.cost) == int(economy.cost), "%s cost must match the shared web economy" % weapon_id)
		assert(is_equal_approx(float(catalog_entry.damage), float(economy.damage)), "%s damage must match the shared web balance" % weapon_id)
		assert(is_equal_approx(float(catalog_entry.cooldown), float(economy.cooldown)), "%s cooldown must match the shared web balance" % weapon_id)
	var canonical_gadgets: Dictionary = utility_data.get("gadgets", {})
	var canonical_relics: Dictionary = utility_data.get("relics", {})
	assert(canonical_gadgets.size() == 8 and stats_manager.gadgets_catalog.size() == 8, "All eight canonical gadgets must load")
	assert(canonical_relics.size() == 10 and stats_manager.artifacts_catalog.size() == 10, "All stable and new relic IDs must load")
	for gadget_id in canonical_gadgets:
		var gadget: Dictionary = stats_manager.gadgets_catalog[gadget_id]
		assert(gadget.get("name", "") == canonical_gadgets[gadget_id].get("name", ""), "%s must use the shared Turkish display name" % gadget_id)
		assert(float(gadget.get("cooldown", 0.0)) > 0.0 and int(gadget.get("cost", -1)) >= 0, "%s must have a finite cooldown and nonnegative cost" % gadget_id)
		assert(ResourceLoader.exists("res://" + str(gadget.get("icon", ""))), "%s icon must exist for shop and inventory UI" % gadget_id)
	for relic_id in canonical_relics:
		var relic: Dictionary = stats_manager.artifacts_catalog[relic_id]
		assert(relic.get("name", "") == canonical_relics[relic_id].get("name", ""), "%s must use the shared Turkish relic name" % relic_id)
		assert(ResourceLoader.exists("res://" + str(relic.get("icon", ""))), "%s icon must exist for its shop card" % relic_id)
	for legacy_id in utility_data.get("gadget_aliases", {}):
		assert(stats_manager.normalize_gadget_id(legacy_id) == utility_data.gadget_aliases[legacy_id], "%s must normalize to its canonical gadget ID" % legacy_id)
	assert(stats_manager.active_gadget == "eraser_dash" and stats_manager.owned_gadgets.has("eraser_dash"), "Starting gadget state must be canonicalized")
	assert(stats_manager.select_gadget("dash") and stats_manager.active_gadget == "eraser_dash", "Legacy gadget IDs must still select the canonical owned gadget")
	stats_manager.ink_count = 200
	assert(stats_manager.buy_gadget("ink_bomb") and stats_manager.active_gadget == "ink_cataclysm", "Legacy gadget purchases must buy and equip their canonical item exactly once")
	var bought_ink: int = stats_manager.ink_count
	assert(not stats_manager.buy_gadget("ink_cataclysm") and stats_manager.ink_count == bought_ink, "Owned gadgets cannot be purchased or charged twice")
	assert(main.player.resolve_gadget_direction(Vector2.ZERO, Vector2.UP, Vector2.RIGHT) == Vector2.UP, "Touch-stick direction must drive directional gadgets when no keyboard input is present")
	assert(main.player.resolve_gadget_direction(Vector2.LEFT, Vector2.UP, Vector2.RIGHT) == Vector2.LEFT, "Keyboard direction must keep priority when both inputs are present")
	main.player.gadget_timer = 0.0
	main.player.activate_active_gadget(Vector2.RIGHT)
	assert(is_equal_approx(main.player.gadget_cooldown, 12.0) and main.player.gadget_timer > 0.0, "Canonical purchase must activate with its catalog cooldown")
	for gadget_id in canonical_gadgets:
		if not stats_manager.owned_gadgets.has(gadget_id):
			assert(stats_manager.buy_gadget(gadget_id), "%s must be buyable once at its catalog price" % gadget_id)
		assert(stats_manager.select_gadget(gadget_id), "%s must be selectable after purchase" % gadget_id)
		main.player.gadget_timer = 0.0
		main.player.activate_active_gadget(Vector2.RIGHT)
		assert(is_equal_approx(main.player.gadget_cooldown, float(canonical_gadgets[gadget_id].get("cooldown", 0.0))), "%s activation must start its authored cooldown" % gadget_id)
	main.player.is_dashing = false
	main.player.is_invulnerable = false
	main.player.invuln_timer.stop()
	assert(stats_manager.select_gadget("lexicon_aegis"), "Lexicon Aegis must remain selectable after its purchase")
	main.player.gadget_timer = 0.0
	main.player.activate_active_gadget(Vector2.RIGHT)
	var aegis_hp: float = stats_manager.hp
	main.player.take_damage(20.0)
	assert(stats_manager.hp == aegis_hp and main.player.shield_charges == 2, "Aegis must absorb a hit with one of its three charges")
	main.player.is_invulnerable = false
	main.player.invuln_timer.stop()
	main.player.take_damage(20.0)
	main.player.is_invulnerable = false
	main.player.invuln_timer.stop()
	main.player.take_damage(20.0)
	assert(stats_manager.hp == aegis_hp and main.player.shield_charges == 0 and main.player.shield_timer == 0.0, "The final Aegis charge must be consumed without damage")
	main.player.is_invulnerable = false
	main.player.invuln_timer.stop()
	main.player.take_damage(20.0)
	assert(stats_manager.hp < aegis_hp, "Aegis must stop absorbing after its final charge")
	main.player.is_dashing = false
	main.player.is_invulnerable = false
	main.player.invuln_timer.stop()
	main.player.ink_trail_elapsed = 0.0
	main.player.index_storm_timer = 0.0
	main.player.shield_timer = 0.0
	main.player.shield_charges = 0
	stats_manager.reset()
	stats_manager.ink_count = 500
	var hp_before_prism: float = stats_manager.max_hp
	assert(stats_manager.buy_artifact("marginalia_prism"), "Marginalia Prism must be purchasable")
	assert(not stats_manager.buy_artifact("marginalia_prism") and is_equal_approx(stats_manager.max_hp, hp_before_prism), "Relic effects must not reapply on duplicate purchase")
	var prism_enemy: Node2D = load("res://scenes/enemy.tscn").instantiate()
	main.add_child(prism_enemy)
	prism_enemy.health = 1000.0
	for _hit in range(4): stats_manager.relic_on_enemy_hit(prism_enemy)
	assert(prism_enemy.weapon_mark_timer > 0.0, "Marginalia Prism must mark a target after its consecutive hit threshold")
	var prism_marked_hp: float = prism_enemy.health
	stats_manager.relic_on_enemy_hit(prism_enemy)
	assert(prism_enemy.health < prism_marked_hp, "The next hit on a marked target must trigger a bounded echo strike")
	assert(stats_manager.buy_artifact("mnemonic_thread"), "Mnemonic Thread must be purchasable")
	var mnemonic_heal: float = stats_manager.consume_health_scroll(12.0)
	assert(is_equal_approx(mnemonic_heal, 26.0), "Mnemonic Thread must add its health-scroll bonus once per wave")
	assert(is_equal_approx(stats_manager.consume_health_scroll(12.0), 12.0) and main.player.mnemonic_guard_timer > 0.0, "The wave-limited scroll effect must not repeat and should grant a short guard")
	assert(stats_manager.buy_artifact("archivist_compass"), "Archivist Compass must be purchasable")
	prism_enemy.enemy_type = "Red Pen Boss"
	assert(is_equal_approx(stats_manager.get_relic_damage_multiplier(prism_enemy), 1.12), "Archivist Compass must apply its bounded elite damage bonus")
	assert(stats_manager.get_relic_target_priority(prism_enemy) > 100000.0, "Archivist Compass must prioritize elite and boss targets")
	prism_enemy.queue_free()
	assert(stats_manager.buy_artifact("slot_expansion") and stats_manager.max_weapon_slots == 5, "Slot Expansion must unlock the fifth weapon slot")
	assert(stats_manager.buy_artifact("slot_expansion") and stats_manager.max_weapon_slots == 6, "Slot Expansion can be bought twice to reach the web six-slot cap")
	var slot_ink: int = stats_manager.ink_count
	assert(not stats_manager.buy_artifact("slot_expansion") and stats_manager.max_weapon_slots == 6 and stats_manager.ink_count == slot_ink, "Slot Expansion must stop at six without spending more ink")
	stats_manager.equipped_weapons = ["quill_blaster", "syllable_shotgun", "lexicon_beam", "punctuation_bomb", "dictionary_blade", "crossword_crossbow"]
	assert(stats_manager.equip_weapon("hyphen_boomerang") == false, "Weapon equips must respect the expanded six-slot cap")
	stats_manager.reset()

	# Every weapon key must resolve to a validated gameplay signature, and Godot
	# must expose the same capped between-wave tier path as the web client.
	var archetype_weapon_scene: PackedScene = load("res://scenes/weapon.tscn")
	var expected_signatures := {
		"quill_blaster": "mark_echo", "syllable_shotgun": "pump_fan", "lexicon_beam": "charged_line",
		"punctuation_bomb": "fuse_mine", "dictionary_blade": "guard_sweep", "crossword_crossbow": "measured_pin",
		"hyphen_boomerang": "outbound_return", "ink_flamethrower": "burst_vent", "thesaurus_rocket": "lock_cluster",
		"quote_pistols": "two_tap_reload", "calligraphy_katana": "windup_crescent", "scroll_turret": "place_focus_turret",
		"rune_orb": "pulse_bounce", "grammar_sniper": "weakpoint_rail", "word_loom": "tether_zone"
	}
	for archetype_id in expected_signatures:
		var archetype_weapon: Node = archetype_weapon_scene.instantiate()
		archetype_weapon.weapon_id = archetype_id
		main.add_child(archetype_weapon)
		assert(archetype_weapon.has_method("get_weapon_archetype"), "Every weapon must expose its shared archetype record")
		var archetype: Dictionary = archetype_weapon.get_weapon_archetype(archetype_id)
		assert(archetype.get("signature", "") == expected_signatures[archetype_id], "%s must resolve its unique shared signature" % archetype_id)
		var authored_weapon_sprite: Sprite2D = archetype_weapon.get_node_or_null("Sprite2D")
		assert(authored_weapon_sprite and authored_weapon_sprite.texture, "%s must load its own weapon sprite" % archetype_id)
		assert(archetype.get("evolutions", {}).size() == 3, "%s must define three behavior evolutions" % archetype_id)
		assert(archetype_weapon.has_method("get_weapon_evolution_key"), "%s must expose its evolution key to web-parity callers" % archetype_id)
		for tier in range(2, 5):
			archetype_weapon.weapon_tier = tier
			var expected_evolution := String(archetype.evolutions.get(str(tier), ""))
			assert(not expected_evolution.is_empty(), "%s T%d must have an authored evolution" % [archetype_id, tier])
			assert(archetype_weapon.get_weapon_evolution_key() == expected_evolution and archetype_weapon.weapon_evolution_key == expected_evolution, "%s T%d must expose the shared weapon_evolution_key for web parity and observable tier behavior" % [archetype_id, tier])
		archetype_weapon.queue_free()
	var loom_enemy: Node2D = load("res://scenes/enemy.tscn").instantiate()
	main.add_child(loom_enemy)
	loom_enemy.enemy_type = "Typo Slime"
	loom_enemy.global_position = main.player.global_position + Vector2(70.0, 0.0)
	loom_enemy.setup_type()
	var loom_enemy_health := float(loom_enemy.health)
	var loom_field: Variant = Node2D.new()
	loom_field.set_script(load("res://scripts/word_loom_field.gd"))
	main.add_child(loom_field)
	loom_field.setup(loom_enemy.global_position, 108.0, 2.8, 0.35, 5.0, 0.46, 0.6, 3)
	loom_field._process(0.05)
	assert(loom_enemy.health < loom_enemy_health and loom_enemy.slow_timer > 0.0 and loom_enemy.slow_factor <= 0.46 and loom_enemy.weapon_mark_timer > 0.0, "Word Loom must damage, slow and mark enemies caught in its authored field")
	loom_enemy.queue_free()
	loom_field.queue_free()
	var loom_primary: Node2D = load("res://scenes/enemy.tscn").instantiate()
	var loom_linked: Node2D = load("res://scenes/enemy.tscn").instantiate()
	main.add_child(loom_primary)
	main.add_child(loom_linked)
	loom_primary.global_position = main.player.global_position + Vector2(80.0, 0.0)
	loom_linked.global_position = main.player.global_position + Vector2(145.0, 0.0)
	var loom_weapon: Variant = archetype_weapon_scene.instantiate()
	main.add_child(loom_weapon)
	loom_weapon.setup_weapon("word_loom")
	loom_weapon.weapon_tier = 4
	loom_weapon.target_enemy = loom_primary
	loom_weapon._place_word_loom_field()
	assert(main.get_tree().get_nodes_in_group("word_loom_fields").size() == 2, "Word Loom's final evolution must tether two nearby zones together")
	for field in main.get_tree().get_nodes_in_group("word_loom_fields"):
		field.queue_free()
	loom_primary.queue_free()
	loom_linked.queue_free()
	loom_weapon.queue_free()
	assert(stats_manager.has_method("get_weapon_tier") and stats_manager.has_method("get_weapon_tier_cost") and stats_manager.has_method("upgrade_weapon_tier"), "Godot must expose a bounded weapon tier upgrade API")
	stats_manager.equipped_weapons = ["quill_blaster"]
	stats_manager.weapon_tiers = {"quill_blaster": 1}
	stats_manager.ink_count = 1000
	var tier_1_ink: int = stats_manager.ink_count
	assert(stats_manager.upgrade_weapon_tier("quill_blaster"), "An owned weapon must be upgradeable between waves")
	assert(stats_manager.get_weapon_tier("quill_blaster") == 2 and stats_manager.ink_count < tier_1_ink, "A successful tier upgrade must spend ink and advance exactly one level")
	assert(stats_manager.get_weapon_tier_cost("quill_blaster") > 0, "Each tier evolution must have a positive shop cost")
	stats_manager.weapon_tiers["quill_blaster"] = 4
	var max_tier_ink: int = stats_manager.ink_count
	assert(not stats_manager.upgrade_weapon_tier("quill_blaster") and stats_manager.ink_count == max_tier_ink, "Tier four is capped and must not spend ink")
	stats_manager.weapon_tiers.erase("quill_blaster")
	stats_manager.ink_count = 0
	stats_manager.reset()

	# Runtime regressions for the three reviewed caps/state transitions.
	var boomerang_scene: PackedScene = load("res://scenes/projectile.tscn")
	var orbiting_boomerang: Area2D = boomerang_scene.instantiate()
	main.add_child(orbiting_boomerang)
	orbiting_boomerang.global_position = main.player.global_position + Vector2(-180.0, 0.0)
	orbiting_boomerang.setup(Vector2.RIGHT, 10.0, 1, 400.0, Color.WHITE, false, "ink", "outbound_return", 4)
	orbiting_boomerang.age = 0.84
	orbiting_boomerang._physics_process(0.02)
	assert(orbiting_boomerang.get("orbit_duration") != null and orbiting_boomerang.get("orbit_timer") > 0.0, "T4 boomerang must enter a bounded orbit phase when it returns")
	var orbit_position_before: Vector2 = orbiting_boomerang.global_position
	orbiting_boomerang._physics_process(0.20)
	assert(orbiting_boomerang.global_position.distance_to(main.player.global_position) < 70.0 and orbiting_boomerang.global_position.distance_to(orbit_position_before) > 10.0, "T4 boomerang must move around the player during its orbit phase")

	var weapon_scene: PackedScene = load("res://scenes/weapon.tscn")
	var guard_weapon: Node = weapon_scene.instantiate()
	guard_weapon.weapon_id = "dictionary_blade"
	main.add_child(guard_weapon)
	guard_weapon.setup_weapon("dictionary_blade")
	guard_weapon.global_position = main.player.global_position
	guard_weapon.set_process(false)
	guard_weapon.set_physics_process(false)
	var nearby_enemy_shot := Node2D.new()
	nearby_enemy_shot.add_to_group("enemy_projectiles")
	main.add_child(nearby_enemy_shot)
	nearby_enemy_shot.global_position = main.player.global_position + Vector2(52.0, 0.0)
	var distant_enemy_shot := Node2D.new()
	distant_enemy_shot.add_to_group("enemy_projectiles")
	main.add_child(distant_enemy_shot)
	distant_enemy_shot.global_position = main.player.global_position + Vector2(240.0, 0.0)
	guard_weapon.sweep_blade_attack()
	assert(nearby_enemy_shot.is_queued_for_deletion() and not distant_enemy_shot.is_queued_for_deletion(), "Guard sweep must clear incoming shots in range without erasing distant threats")
	nearby_enemy_shot.queue_free()
	distant_enemy_shot.queue_free()
	guard_weapon.queue_free()
	await process_frame
	# Isolate scripted cap checks from the player's autonomous weapon firing.
	for player_weapon in main.find_children("*", "Node", true, false):
		if player_weapon.get("weapon_id") != null:
			player_weapon.set_process(false)
			player_weapon.set_physics_process(false)
	for deployed_turret in get_nodes_in_group("scroll_turrets"):
		deployed_turret.queue_free()
	main.set_meta("deployed_scroll_turrets", [])
	await process_frame
	var turret_weapon: Node = weapon_scene.instantiate()
	main.add_child(turret_weapon)
	turret_weapon.setup_weapon("scroll_turret")
	turret_weapon.weapon_tier = 1
	turret_weapon.set_process(false)
	turret_weapon.set_physics_process(false)
	turret_weapon._place_scroll_turret(5.0)
	turret_weapon._place_scroll_turret(5.0)
	await process_frame
	var spawned_scroll_turret: Node2D = turret_weapon.active_turrets.back()
	var spawned_scroll_turret_sprite: Sprite2D = spawned_scroll_turret.get_node_or_null("Sprite2D")
	assert(spawned_scroll_turret_sprite and spawned_scroll_turret_sprite.texture and spawned_scroll_turret_sprite.texture.resource_path == "res://assets/sprites/weapons/scroll_turret.png", "Deployed scroll turrets must use the new unique weapon art")
	var active_turret_count := 0
	for deployed_turret in get_nodes_in_group("scroll_turrets"):
		if is_instance_valid(deployed_turret) and not deployed_turret.is_queued_for_deletion():
			active_turret_count += 1
	assert(active_turret_count == 1, "T1 turret cap must remain one across successive placements")
	turret_weapon.queue_free()
	await process_frame
	var replacement_turret_weapon: Node = weapon_scene.instantiate()
	main.add_child(replacement_turret_weapon)
	replacement_turret_weapon.setup_weapon("scroll_turret")
	replacement_turret_weapon.weapon_tier = 1
	replacement_turret_weapon.set_process(false)
	replacement_turret_weapon.set_physics_process(false)
	replacement_turret_weapon._place_scroll_turret(5.0)
	await process_frame
	active_turret_count = 0
	for deployed_turret in get_nodes_in_group("scroll_turrets"):
		if is_instance_valid(deployed_turret) and not deployed_turret.is_queued_for_deletion():
			active_turret_count += 1
	assert(active_turret_count == 1, "Scene-wide turret cap must survive weapon node rebuilds")
	replacement_turret_weapon.queue_free()

	var mine_weapon: Node = weapon_scene.instantiate()
	main.add_child(mine_weapon)
	mine_weapon.setup_weapon("punctuation_bomb")
	mine_weapon.set_process(false)
	mine_weapon.set_physics_process(false)
	for _mine_index in range(4):
		mine_weapon.drop_punctuation_mine()
	await process_frame
	var active_mine_count := 0
	for mine in get_nodes_in_group("punctuation_mines"):
		if is_instance_valid(mine) and not mine.is_queued_for_deletion():
			active_mine_count += 1
	assert(active_mine_count == 3, "Punctuation mine cap must evict the oldest mine when a fourth is placed")
	mine_weapon.queue_free()

	# Native mobile HUD exposes a touch override for deterministic headless checks.
	var hud = main.get_node("HUD")
	assert(hud.has_method("set_touch_ui_enabled_override"), "HUD must expose deterministic touch UI visibility for device and test use")
	assert(hud.has_method("set_inventory_open"), "HUD must expose an inventory open/close action")
	assert(hud.has_method("refresh_inventory"), "HUD must rebuild inventory from currently owned equipment")
	assert(hud.has_method("select_inventory_item"), "HUD must route gear selection through validated inventory actions")
	assert(hud.has_method("activate_gadget_touch"), "HUD must expose a touch action for the active gadget")
	hud.set_touch_ui_enabled_override(true)
	assert(hud.get_node("TouchControls").visible, "Touch actions must be visible when touchscreen input is enabled")
	assert(hud.get_node("TouchStick").visible, "Touch users must receive an on-screen movement stick")
	var touch_stick: Control = hud.get_node("TouchStick")
	await process_frame
	var stick_press := InputEventScreenTouch.new()
	stick_press.index = 77
	stick_press.position = touch_stick.size * 0.5 + Vector2(touch_stick.size.x * 0.35, 0.0)
	stick_press.pressed = true
	touch_stick._gui_input(stick_press)
	await process_frame
	assert(hud.get_touch_move_vector().x > 0.9, "A screen-touch press must drive the movement stick")
	var stick_drag := InputEventScreenDrag.new()
	stick_drag.index = 77
	stick_drag.position = touch_stick.size * 0.5 + Vector2(touch_stick.size.x * 0.40, 0.0)
	touch_stick._gui_input(stick_drag)
	await process_frame
	assert(hud.get_touch_move_vector().x > 0.9, "A screen-touch drag must keep driving movement")
	var stick_release := InputEventScreenTouch.new()
	stick_release.index = 77
	stick_release.position = stick_drag.position
	stick_release.pressed = false
	touch_stick._gui_input(stick_release)
	await process_frame
	assert(hud.get_touch_move_vector() == Vector2.ZERO, "Releasing the movement touch must immediately clear its vector")
	touch_stick._update_from_position(Vector2(touch_stick.size.x * 0.9, touch_stick.size.y * 0.5))
	assert(hud.get_touch_move_vector().x > 0.9 and absf(hud.get_touch_move_vector().y) < 0.01, "Dragging the touch stick must provide directional movement input")
	touch_stick.reset()
	for icon_button_path in ["TouchControls/ActionRow/GadgetTouchButton", "TouchControls/ActionRow/WeaponTouchButton", "TouchControls/ActionRow/InventoryTouchButton", "InventoryOverlay/InventoryPanel/InventoryLayout/InventoryTabs/WeaponsTab", "InventoryOverlay/InventoryPanel/InventoryLayout/InventoryTabs/GadgetsTab", "InventoryOverlay/InventoryPanel/InventoryLayout/InventoryHeader/InventoryCloseButton"]:
		assert(hud.get_node(icon_button_path).icon != null, "%s must use a non-emoji UI asset" % icon_button_path)
	var touch_controls: Control = hud.get_node("TouchControls")
	var gadget_button: Control = hud.get_node("TouchControls/ActionRow/GadgetTouchButton")
	main.player.gadget_timer = 0.0
	gadget_button.pressed.emit()
	assert(main.player.gadget_timer > 0.0, "The touch gadget button signal must activate the equipped gadget")
	var inventory_touch_button: Control = hud.get_node("TouchControls/ActionRow/InventoryTouchButton")
	inventory_touch_button.pressed.emit()
	assert(hud.inventory_open and paused, "The touch inventory button signal must open the inventory and pause the wave")
	var close_button: Control = hud.get_node("InventoryOverlay/InventoryPanel/InventoryLayout/InventoryHeader/InventoryCloseButton")
	close_button.pressed.emit()
	assert(not hud.inventory_open and not paused, "The touch close button signal must close inventory and resume the wave")
	var original_control_width: float = touch_controls.offset_right - touch_controls.offset_left
	var original_control_height: float = touch_controls.offset_bottom - touch_controls.offset_top
	hud._apply_touch_safe_area_insets(72.0, 38.0)
	assert(is_equal_approx(touch_controls.offset_right - touch_controls.offset_left, original_control_width), "Right safe-area inset must move the whole touch cluster without shrinking its width")
	assert(is_equal_approx(touch_controls.offset_bottom - touch_controls.offset_top, original_control_height), "Bottom safe-area inset must move the whole touch cluster without shrinking its height")
	assert(is_equal_approx(touch_controls.offset_left, -306.0 - 72.0) and is_equal_approx(touch_controls.offset_right, -24.0 - 72.0), "Right inset must translate both horizontal cluster edges equally")
	assert(is_equal_approx(touch_controls.offset_top, -88.0 - 38.0) and is_equal_approx(touch_controls.offset_bottom, -24.0 - 38.0), "Bottom inset must translate both vertical cluster edges equally")
	hud._apply_touch_safe_area_insets(72.0, 38.0, 24.0)
	assert(is_equal_approx(touch_stick.offset_left, 48.0) and is_equal_approx(touch_stick.offset_right, 204.0), "Left safe-area inset must move the movement stick clear of a device notch")
	assert(is_equal_approx(touch_stick.offset_top, -206.0) and is_equal_approx(touch_stick.offset_bottom, -62.0), "Bottom safe-area inset must keep the movement stick above the home indicator")
	hud._apply_touch_safe_area_insets(0.0, 0.0)
	var wave_manager = main.get_node("WaveManager")
	wave_manager.spawn_enemy()
	await process_frame
	wave_manager.spawn_timer = 0.01
	var wave_time_before_inventory: float = wave_manager.time_left
	var enemy_count_before_inventory: int = get_nodes_in_group("enemies").size()
	var paused_enemy: Node2D = get_nodes_in_group("enemies")[0]
	var paused_enemy_position: Vector2 = paused_enemy.global_position
	hud.set_inventory_open(true)
	assert(hud.inventory_open and hud.get_node("InventoryOverlay").visible, "Inventory must open from the touch action")
	assert(paused, "Inventory must pause wave and enemy simulation while open")
	assert(main.player.inventory_input_blocked, "Opening inventory must block movement input")
	await create_timer(0.2, true, false, true).timeout
	assert(is_equal_approx(wave_manager.time_left, wave_time_before_inventory), "Wave timer must remain frozen while inventory is open")
	assert(get_nodes_in_group("enemies").size() == enemy_count_before_inventory, "Enemy spawns must remain frozen while inventory is open")
	assert(paused_enemy.global_position.is_equal_approx(paused_enemy_position), "Enemy physics must remain frozen while inventory is open")
	assert(hud.select_inventory_item("gadget", "not_owned") == false, "An unowned gadget cannot be selected")
	hud.inventory_gadgets_tab.pressed.emit()
	assert(hud.inventory_category == "gadgets", "Gadget inventory tab switches to owned gadgets")
	hud.inventory_items.get_child(0).pressed.emit()
	assert(stats_manager.active_gadget == "eraser_dash", "The gadget inventory row selects owned equipment")
	assert(hud.gadget_touch_button.icon != null and hud.inventory_items.get_child_count() > 0, "Owned gadget inventory rows and the mobile action must show the selected sliced icon")
	assert(not hud.inventory_open and not main.player.inventory_input_blocked, "Selecting owned gear must close inventory and restore play input")
	assert(not paused, "Closing inventory resumes the current wave")
	var first_weapon: String = stats_manager.get_active_weapon_id()
	var second_weapon: String = ""
	for weapon_id in stats_manager.weapons_catalog:
		if weapon_id != first_weapon:
			second_weapon = weapon_id
			break
	assert(second_weapon != "", "At least two catalog weapons are available for loadout selection coverage")
	stats_manager.equip_weapon(second_weapon)
	hud.inventory_weapons_tab.pressed.emit()
	hud.set_inventory_open(true)
	var second_weapon_button: Button = null
	var expected_weapon_name: String = stats_manager.weapons_catalog[second_weapon]["name"].to_upper()
	for inventory_button in hud.inventory_items.get_children():
		if inventory_button is Button and inventory_button.text.ends_with(expected_weapon_name):
			second_weapon_button = inventory_button
	assert(second_weapon_button != null, "Owned weapons must appear as inventory touch targets")
	second_weapon_button.pressed.emit()
	assert(stats_manager.get_active_weapon_id() == second_weapon, "Loadout selection must update the active weapon")
	stats_manager.equipped_weapons = [first_weapon]
	stats_manager.active_weapon_index = 0
	main.player.sync_weapons()
	var gadget_activation_count := [0]
	stats_manager.gadget_activated.connect(func(_gadget_id: String): gadget_activation_count[0] += 1)
	main.player.gadget_timer = 0.0
	assert(hud.activate_gadget_touch(), "Touch action activates a ready gadget")
	assert(not hud.activate_gadget_touch(), "Touch action cannot activate the gadget while cooling down")
	assert(main.player.gadget_timer > 0.0 and gadget_activation_count[0] == 1, "Touch activation starts exactly one gadget cooldown")
	assert(hud.gadget_touch_button.icon != null, "Touch gadget action displays the selected gadget icon")
	assert(hud.gadget_touch_button.text == hud.gadget_status.text and hud.gadget_touch_button.disabled, "Touch gadget action displays its cooldown countdown and disables re-use")
	hud.update_gadget(0.0, main.player.gadget_cooldown)
	assert(hud.gadget_touch_button.text == "HAZIR" and not hud.gadget_touch_button.disabled, "Touch gadget action displays readiness when cooldown ends")
	var inventory_key := InputEventKey.new()
	inventory_key.keycode = KEY_I
	inventory_key.pressed = true
	Input.parse_input_event(inventory_key)
	await process_frame
	assert(hud.inventory_open, "I key opens native inventory for keyboard users")
	var inventory_key_release := InputEventKey.new()
	inventory_key_release.keycode = KEY_I
	inventory_key_release.pressed = false
	Input.parse_input_event(inventory_key_release)
	await process_frame
	Input.parse_input_event(inventory_key)
	await process_frame
	assert(not hud.inventory_open and not paused, "I key closes inventory and resumes the run")
	Input.parse_input_event(inventory_key_release)
	await process_frame
	Input.parse_input_event(inventory_key)
	await process_frame
	assert(hud.inventory_open and paused, "I key opens inventory through the input system")
	var escape_key := InputEventKey.new()
	escape_key.keycode = KEY_ESCAPE
	escape_key.pressed = true
	Input.parse_input_event(escape_key)
	await process_frame
	assert(not hud.inventory_open and not paused, "Escape input closes inventory while the game tree is paused")
	main.player.gadget_timer = 0.0
	main.player.start_eraser_dash(Vector2.RIGHT)
	assert(main.player.is_dashing and main.player.is_invulnerable, "Dash grants temporary invulnerability")
	hud.set_inventory_open(true)
	assert(not main.player.is_dashing and not main.player.is_invulnerable, "Opening inventory cancels dash and its invulnerability")
	hud.set_inventory_open(false)
	main.player.invuln_timer.start(0.55)
	main.player.is_invulnerable = true
	main.player.start_eraser_dash(Vector2.RIGHT)
	hud.set_inventory_open(true)
	assert(not main.player.is_dashing and main.player.is_invulnerable, "Cancelling dash preserves damage i-frames already in progress")
	hud.set_inventory_open(false)
	main.player.invuln_timer.stop()
	main.player.is_invulnerable = false

	wave_manager.max_active_enemies = 220
	for _i in range(90):
		wave_manager.spawn_enemy()
	await process_frame
	var active_enemies = get_nodes_in_group("enemies").size()
	assert(active_enemies == 32, "Wave 1 must keep a readable early-wave enemy cap")
	assert(wave_manager._get_wave_enemy_cap() == 32, "Wave 1 cap should be derived from shared balance data")
	for enemy in get_nodes_in_group("enemies"):
		enemy.queue_free()
	await process_frame
	stats_manager.current_wave = 12
	for _i in range(90):
		wave_manager.spawn_enemy()
	await process_frame
	active_enemies = get_nodes_in_group("enemies").size()
	assert(active_enemies == 54, "Wave 12 must allow a larger horde than wave 1")
	assert(wave_manager._get_wave_enemy_cap() == 54, "Wave 12 cap should continue scaling with the wave")

	var kills_before_cleanup = stats_manager.kill_count
	var ink_before_cleanup = stats_manager.ink_count
	wave_manager.end_wave()
	await process_frame
	assert(stats_manager.kill_count == kills_before_cleanup, "Wave cleanup must not grant kill credit")
	assert(stats_manager.ink_count == ink_before_cleanup, "Wave cleanup must not grant ink drops")
	assert(get_nodes_in_group("enemies").is_empty(), "Wave cleanup must remove all surviving enemies")

	# The gadget category must be visible and its purchase action must equip the selected item.
	var shop = main.shop_ui
	shop.open_shop()
	stats_manager.ink_count = 200
	shop._on_gadgets_tab_pressed()
	await process_frame
	assert(shop.cards_container.get_child_count() == stats_manager.gadgets_catalog.size(), "Gadget tab must render every available gadget")
	var ink_bomb_card: Control = null
	for card_panel in shop.cards_container.get_children():
		var card_icon: TextureRect = card_panel.get_child(0).get_child(0)
		var card_title: Label = card_panel.get_child(0).get_child(2)
		assert(card_icon.texture != null, "Gadget shop cards must display their sliced transparent icon")
		if card_title.text == stats_manager.gadgets_catalog["ink_cataclysm"]["name"]:
			ink_bomb_card = card_panel
	assert(ink_bomb_card != null, "Ink bomb must appear as a purchasable gadget card")
	var buy_gadget_button: Button = ink_bomb_card.get_child(0).get_child(6)
	buy_gadget_button.pressed.emit()
	assert(stats_manager.active_gadget == "ink_cataclysm", "Buying a gadget from the shop must equip its canonical ID")
	shop._on_artifacts_tab_pressed()
	await process_frame
	assert(shop.cards_container.get_child_count() == stats_manager.artifacts_catalog.size(), "Relic tab must render every stable and new relic")
	for relic_card in shop.cards_container.get_children():
		var relic_icon: TextureRect = relic_card.get_child(0).get_child(0)
		assert(relic_icon.texture != null, "Relic cards must display their sliced transparent icon")

	# A dash should damage each enemy once, even if overlap spans several physics frames.
	var player = main.player
	assert(player.has_method("request_attack_pose"), "Player must expose weapon-aware action pose requests")
	var walk_accel: Vector2 = player.approach_locomotion_velocity(Vector2.ZERO, Vector2.RIGHT * stats_manager.move_speed, 0.016)
	assert(walk_accel.length() > 0.0 and walk_accel.length() < stats_manager.move_speed, "Movement must accelerate into motion instead of snapping to full speed")
	var walk_top_speed: Vector2 = player.approach_locomotion_velocity(Vector2.RIGHT * stats_manager.move_speed, Vector2.RIGHT * stats_manager.move_speed, 0.016)
	assert(is_equal_approx(walk_top_speed.length(), stats_manager.move_speed), "Locomotion response must preserve the configured top speed")
	var walk_brake: Vector2 = player.approach_locomotion_velocity(walk_top_speed, Vector2.ZERO, 0.016)
	assert(walk_brake.length() > 0.0 and walk_brake.length() < walk_top_speed.length(), "Movement must brake smoothly after releasing input")
	assert(walk_top_speed.length() - walk_brake.length() > walk_accel.length(), "Braking should respond faster than the initial run-up")
	var walk_stopped: Vector2 = player.approach_locomotion_velocity(walk_top_speed, Vector2.ZERO, 0.10)
	assert(walk_stopped.is_zero_approx(), "A short deliberate brake should stop drift within a tenth of a second")
	var walk_reverse: Vector2 = player.approach_locomotion_velocity(walk_top_speed, Vector2.LEFT * stats_manager.move_speed, 0.016)
	assert(walk_reverse.length() <= stats_manager.move_speed and walk_reverse.x > 0.0, "A direction reversal must stay smooth without the old sluggish turn response")
	player.attack_anim_timer = 0.0
	player.run_anim_phase = 0.0
	player.velocity = Vector2.RIGHT * stats_manager.move_speed
	assert(player.has_method("get_hero_render_action"), "The hero must blend authored attack poses with its active locomotion")
	player._update_hero_animation()
	var running_animation_before_shots: String = player.current_hero_animation
	player.request_attack_pose("quill_blaster", "ranged", Vector2(100.0, 0.0))
	assert(player.has_method("get_shot_recoil_offset"), "Ranged attacks must expose their separate recoil response")
	assert(player.attack_anim_timer > 0.0 and player.attack_anim_duration <= 0.20, "Rapid shots must show a short release pose while preserving most of each run stride")
	assert(player.get_hero_render_action() == "run", "Ranged fire must preserve the run animation while the player is moving")
	player._update_hero_animation()
	assert(player.current_hero_animation == "run", "A moving shooter must keep the authored run cycle during repeated fire")
	if player.has_method("get_shot_recoil_offset"):
		assert(is_equal_approx(player.last_aim_direction.length(), 1.0), "Ranged target vectors must normalize before they drive hero pose and recoil")
		assert(player.get_shot_recoil_offset().x < 0.0 and player.get_shot_recoil_offset().length() <= 6.5, "A rightward rifle shot must kick the hero body backward within its weapon recoil limit")
	player._advance_run_phase(0.18)
	player.attack_anim_timer = 0.0
	player._update_hero_animation()
	assert(player.current_hero_animation == "run" and player.attack_anim_timer <= 0.0 and player.current_hero_animation == running_animation_before_shots, "The short ranged release pose must return to the run cycle")
	player.velocity = Vector2.LEFT * stats_manager.move_speed
	player._update_hero_animation()
	assert(not player.sprite.flip_h and player.sprite.rotation < 0.08 and player.sprite.rotation > -0.08, "Brief ranged recoil must turn the body toward its rightward target while preserving the run cycle")
	player.ranged_recoil_timer = 0.0
	player._update_hero_animation()
	assert(player.sprite.flip_h and player.current_hero_animation == "run", "After the recoil, a moving shooter should face their travel direction without dropping the run cycle")
	assert(player.current_hero_frame != 0, "Run phase must continue advancing during repeated ranged fire")
	assert(is_equal_approx(player.run_anim_phase, stats_manager.move_speed * 0.18 / 17.0), "Run-cycle phase must advance from actual distance traveled at velocity-scaled cadence")
	player.velocity = Vector2.ZERO
	player.request_attack_pose("quill_blaster", "ranged", Vector2.RIGHT)
	assert(player.get_hero_render_action() == "ranged", "A stationary shooter should still use a readable ready/release pose")
	player._update_hero_animation()
	assert(player.current_hero_animation == "ranged", "Stationary shots must retain the authored ranged animation")
	player.attack_anim_timer = 0.0
	player.velocity = Vector2.RIGHT * stats_manager.move_speed
	assert(player.has_method("get_run_frame_index"), "Every character must map onto one shared eight-phase stride cycle")
	assert(player.has_method("get_hero_run_frame_count"), "Every character must expose its authored run animation length")
	if player.has_method("get_run_frame_index"):
		assert(player.get_run_frame_index(4.0, 4) == 2 and player.get_run_frame_index(4.0, 8) == 4, "Four-frame and eight-frame heroes must stay at matching gait phases")
		assert(player.get_run_frame_index(8.0, 4) == 0 and player.get_run_frame_index(8.0, 8) == 0, "All hero run cycles must return to their first pose on the same footfall")
	for character_id in ["inky", "quillmaster", "word_knight", "rune_sorceress", "lexicon_alchemist", "shadow_lexicographer"]:
		assert(player.get_hero_run_frame_count(character_id) == 8, "%s must use a complete eight-frame authored run cycle" % character_id)
	player.run_anim_phase = 0.5
	player.attack_anim_timer = 0.0
	player._update_locomotion_pose()
	assert(player.locomotion_pose_offset.y < 0.0 and player.locomotion_pose_offset.y >= -2.0, "Running pose must add a small pixel-snapped lift at the footfall phase")
	assert(player.sprite.position == player.locomotion_pose_offset and player.weapons_container.position == player.locomotion_pose_offset, "Locomotion pose must carry the hero and held gear together")
	player.velocity = Vector2.ZERO
	player._physics_process(0.15)
	player._update_locomotion_pose()
	assert(player.get_shot_recoil_offset() == Vector2.ZERO, "A shot kick must recover after its short weapon-specific impulse")
	assert(player.locomotion_pose_offset == Vector2.ZERO and player.sprite.position == Vector2.ZERO and player.weapons_container.position == Vector2.ZERO, "Returning to idle after the recoil recovers must reset every locomotion pose offset")
	var visual_bounds: Rect2 = ARENA_FRAME_SCRIPT.PLAYER_VISUAL_CENTER_BOUNDS
	player.global_position = visual_bounds.position
	player.velocity = Vector2(-stats_manager.move_speed, -stats_manager.move_speed)
	player._update_locomotion_pose()
	var posed_player_position: Vector2 = player.global_position + player.locomotion_pose_offset
	assert(posed_player_position.x >= visual_bounds.position.x and posed_player_position.y >= visual_bounds.position.y, "Locomotion bob must not move the rendered hero beyond the top-left shelf visual bound")
	assert(visual_bounds.has_point(posed_player_position), "Locomotion lean and bob must stay inside visible shelf center bounds")
	player.velocity = Vector2.ZERO
	player.global_position = Vector2.ZERO
	player._update_locomotion_pose()
	player.velocity = Vector2.RIGHT * stats_manager.move_speed
	player.request_attack_pose("dictionary_blade", "melee", Vector2.RIGHT)
	assert(player.attack_anim_timer > 0.0, "Melee action events must play a readable hero attack response")
	player._update_hero_animation()
	assert(player.locomotion_pose_offset == Vector2.ZERO, "Attack pose must clear the running bob before the hero action")
	player.attack_anim_timer = 0.10
	player._update_hero_animation()
	assert(player.get_hero_render_action() == "run" and player.current_hero_animation == "run", "Melee recovery should keep the attack timer but restore the running stride")
	player.attack_anim_timer = 0.0
	player._update_hero_animation()
	assert(player.current_hero_animation == "run" and player.locomotion_pose_offset != Vector2.ZERO, "Locomotion and its stride pose must resume as soon as the melee response recovers")
	player.request_attack_pose("thesaurus_rocket", "heavy", Vector2.RIGHT, 4.0, {"windup": 0.20, "active": 0.10, "recovery": 0.50})
	assert(is_equal_approx(player.attack_anim_duration, 0.60), "Heavy hero action timing must use the weapon rhythm with a readable, bounded recovery")
	player.attack_anim_timer = 0.0
	player.request_attack_pose("punctuation_bomb", "cast", Vector2.UP)
	assert(player.attack_anim_timer > 0.0, "Cast action events must play a readable hero attack response")
	player._update_hero_animation()
	assert(player.sprite.rotation < -0.20, "Upward weapon use must turn the hero pose toward its aim")
	player.attack_anim_timer = 0.0
	player.request_attack_pose("punctuation_bomb", "cast", Vector2.DOWN)
	player._update_hero_animation()
	assert(player.sprite.rotation > 0.20, "Downward weapon use must turn the hero pose toward its aim")
	player.attack_anim_timer = 0.0
	player.request_attack_pose("thesaurus_rocket", "heavy", Vector2.LEFT)
	assert(player.attack_anim_timer > 0.0 and player.sprite.flip_h, "Heavy actions must play a distinct readable pose and face their aim")
	player.attack_anim_timer = 0.0
	player.velocity = Vector2.ZERO
	player._update_hero_animation()
	var category_weapon: Node = load("res://scenes/weapon.tscn").instantiate()
	category_weapon.weapon_id = "quill_blaster"
	main.add_child(category_weapon)
	assert(category_weapon._get_action_kind() == "ranged", "Quill Blaster automatic shots must route as ranged actions")
	category_weapon.weapon_id = "dictionary_blade"
	assert(category_weapon._get_action_kind() == "melee", "Dictionary Blade swings must route as melee actions")
	category_weapon.weapon_id = "punctuation_bomb"
	assert(category_weapon._get_action_kind() == "cast", "Punctuation Bomb drops must route as cast actions")
	category_weapon.weapon_id = "thesaurus_rocket"
	assert(category_weapon._get_action_kind() == "heavy", "Thesaurus Rocket shots must route as heavy actions")
	category_weapon.weapon_id = "word_loom"
	assert(category_weapon._get_action_kind() == "cast", "Word Loom zone placement must route as a cast action")
	var visual_json: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/data/weapon_visuals.json"))
	assert(visual_json.get("version", 0) == 1, "Shared visual metadata must have a supported version")
	var visual_weapons: Dictionary = visual_json.get("weapons", {})
	assert(visual_weapons.size() == stats_manager.weapons_catalog.size(), "Every catalog weapon must have one shared visual record")
	var expected_weapon_ids := ["quill_blaster", "syllable_shotgun", "lexicon_beam", "punctuation_bomb", "dictionary_blade", "crossword_crossbow", "hyphen_boomerang", "ink_flamethrower", "thesaurus_rocket", "quote_pistols", "calligraphy_katana", "scroll_turret", "rune_orb", "grammar_sniper", "word_loom"]
	assert(expected_weapon_ids.size() == 15 and stats_manager.weapons_catalog.size() == expected_weapon_ids.size(), "All fifteen weapon IDs must be represented by individual art assets")
	var unique_weapon_texture_paths: Dictionary = {}
	var unique_weapon_texture_hashes: Dictionary = {}
	for weapon_id in stats_manager.weapons_catalog:
		assert(visual_weapons.has(weapon_id), "%s must have shared visual data" % weapon_id)
		var visual_data: Dictionary = visual_weapons[weapon_id]
		assert(visual_data.get("role", "") != "", "%s must declare a visual role" % weapon_id)
		assert(float(visual_data.get("draw_size", 0.0)) >= 20.0 and float(visual_data.get("draw_size", 0.0)) <= 44.0, "%s must use a readable bounded draw size" % weapon_id)
		for anchor_name in ["grip", "muzzle"]:
			var anchor: Array = visual_data.get(anchor_name, [])
			assert(anchor.size() == 2 and anchor[0] >= 0.0 and anchor[0] <= 1.0 and anchor[1] >= 0.0 and anchor[1] <= 1.0, "%s %s anchor must be normalized" % [weapon_id, anchor_name])
		var authored_axis: Vector2 = Vector2(float(visual_data["muzzle"][0]) - float(visual_data["grip"][0]), float(visual_data["muzzle"][1]) - float(visual_data["grip"][1]))
		if authored_axis.length_squared() > 0.001:
			assert(absf(angle_difference(authored_axis.angle(), deg_to_rad(float(visual_data.get("art_angle_deg", 0.0))))) < deg_to_rad(5.0), "%s art angle must align its grip-to-muzzle vector" % weapon_id)
		assert(expected_weapon_ids.has(weapon_id), "%s must be one of the fifteen authored weapon IDs" % weapon_id)
		var weapon_texture_path := "res://assets/sprites/weapons/%s.png" % weapon_id
		assert(ResourceLoader.exists(weapon_texture_path), "%s must have an individual weapon texture" % weapon_id)
		var weapon_texture := load(weapon_texture_path) as Texture2D
		assert(weapon_texture != null, "%s weapon texture must load as a Texture2D" % weapon_id)
		assert(not unique_weapon_texture_paths.has(weapon_texture_path), "%s must not share a texture path with another weapon" % weapon_id)
		unique_weapon_texture_paths[weapon_texture_path] = weapon_id
		var texture_content_hash: int = hash(weapon_texture.get_image().get_data())
		assert(not unique_weapon_texture_hashes.has(texture_content_hash), "%s must have unique weapon art" % weapon_id)
		unique_weapon_texture_hashes[texture_content_hash] = weapon_id
		category_weapon.setup_weapon(weapon_id)
		assert(category_weapon.sprite.texture == weapon_texture, "%s weapon instance must load its own weapon-folder texture" % weapon_id)
	assert(unique_weapon_texture_paths.size() == 15 and unique_weapon_texture_hashes.size() == 15, "All fifteen weapon IDs must map to unique, existing textures")
	assert(category_weapon.has_method("get_muzzle_world_position"), "Weapon must expose the authored world-space muzzle socket")
	category_weapon.weapon_id = "quill_blaster"
	category_weapon.setup_weapon(category_weapon.weapon_id)
	category_weapon.global_position = Vector2(100.0, 200.0)
	category_weapon.rotation = -deg_to_rad(float(category_weapon.visual_data.art_angle_deg))
	var muzzle_position: Vector2 = category_weapon.get_muzzle_world_position()
	assert(muzzle_position.distance_to(category_weapon.global_position) > 8.0, "Projectile muzzle must be visibly offset from the weapon root")
	assert(muzzle_position.x > category_weapon.global_position.x and absf(muzzle_position.y - category_weapon.global_position.y) < 0.01, "Muzzle socket must transform the authored diagonal art axis to the right-facing aim")
	assert(category_weapon.get_muzzle_direction().dot(Vector2.RIGHT) > 0.99, "Projectile direction must follow the transformed muzzle art axis")
	assert(category_weapon.muzzle_flash.position.is_equal_approx(category_weapon.muzzle_local_position), "Muzzle flash and projectile must share the same authored socket")
	assert(category_weapon.muzzle_flash.global_transform.x.normalized().dot(category_weapon.get_muzzle_direction()) > 0.99, "Muzzle flash forward axis must align with the authored muzzle direction")
	category_weapon.spawn_one_projectile(Vector2.RIGHT, 5.0, 1, 500.0, Color.WHITE, false)
	var spawned_projectile: Area2D = main.get_child(main.get_child_count() - 1)
	assert(spawned_projectile.global_position.distance_to(muzzle_position) < 0.01, "A real projectile must start at the same world-space point as the weapon muzzle socket")
	spawned_projectile.queue_free()
	category_weapon.weapon_id = "rune_orb"
	category_weapon.setup_weapon(category_weapon.weapon_id)
	category_weapon.rotation = 0.0
	assert(category_weapon.get_muzzle_world_position().distance_to(category_weapon.global_position) < 0.01 and category_weapon.get_muzzle_direction().dot(Vector2.RIGHT) > 0.99, "Center-origin rune casts must retain target aim direction")
	assert(category_weapon.muzzle_flash.global_transform.x.normalized().dot(category_weapon.get_muzzle_direction()) > 0.99, "Center-origin muzzle flash forward axis must align with the authored art direction")
	category_weapon.weapon_id = "crossword_crossbow"
	category_weapon.setup_weapon(category_weapon.weapon_id)
	category_weapon.rotation = -deg_to_rad(float(category_weapon.visual_data.art_angle_deg))
	assert(category_weapon.get_muzzle_direction().dot(Vector2.RIGHT) > 0.99, "Upward crossbow art must rotate its authored arrow axis into target aim")
	category_weapon.weapon_id = "quote_pistols"
	category_weapon.setup_weapon(category_weapon.weapon_id)
	category_weapon.rotation = -deg_to_rad(float(category_weapon.visual_data.art_angle_deg))
	assert(category_weapon.get_muzzle_direction().dot(Vector2.RIGHT) > 0.99, "Dual pistols must align their authored muzzle vector to target aim")
	var feedback_projectile: Node = load("res://scenes/projectile.tscn").instantiate()
	feedback_projectile.setup(Vector2.RIGHT, 10.0, 1, 520.0, Color.WHITE, false, "piercing")
	assert(feedback_projectile.impact_profile == "piercing", "Projectile must carry its weapon hit profile to the target")
	feedback_projectile.queue_free()
	assert(visual_weapons["grammar_sniper"]["muzzle"][0] > visual_weapons["grammar_sniper"]["grip"][0], "Sniper shot must originate beyond its grip")
	assert(visual_weapons["thesaurus_rocket"]["muzzle"][1] < visual_weapons["thesaurus_rocket"]["grip"][1], "Rocket muzzle must use the source art's upward axis")
	assert(ResourceLoader.exists("res://assets/sprites/effects/combat_hit_0.png") and ResourceLoader.exists("res://assets/sprites/effects/combat_hit_7.png"), "Generated impact atlas frames must be available to Godot")
	var test_enemy_scene: PackedScene = load("res://scenes/enemy.tscn")
	var test_enemy: Node2D = test_enemy_scene.instantiate()
	main.add_child(test_enemy)
	test_enemy.global_position = category_weapon.global_position + Vector2(48.0, 0.0)
	test_enemy.health = 1000.0
	category_weapon.weapon_id = "dictionary_blade"
	category_weapon.setup_weapon(category_weapon.weapon_id)
	category_weapon.rotation = deg_to_rad(45.0)
	category_weapon.target_enemy = test_enemy
	category_weapon.melee_hit_ids.clear()
	category_weapon.is_melee_slashing = true
	category_weapon.melee_windup = 0.10
	category_weapon.melee_active_duration = 0.09
	category_weapon._on_melee_active_frame()
	var health_after_first_sweep: float = test_enemy.health
	category_weapon.sweep_blade_attack()
	assert(is_equal_approx(test_enemy.health, health_after_first_sweep), "A target may only take one hit during a single melee swing")
	assert(category_weapon.melee_hit_active_started >= category_weapon.melee_windup and category_weapon.melee_hit_active_started <= category_weapon.melee_windup + category_weapon.melee_active_duration, "Melee damage must occur during the active frame after its windup begins")
	assert(test_enemy.flash_timer > 0.0 and test_enemy.has_method("spawn_hit_effect"), "A melee hit must produce target flash and profile-specific hit confirmation")
	test_enemy.despawn_without_rewards()
	category_weapon.queue_free()
	var selected_character_before_animation_test: String = stats_manager.selected_character
	for character_id in ["inky", "quillmaster", "word_knight", "rune_sorceress", "lexicon_alchemist", "shadow_lexicographer"]:
		stats_manager.selected_character = character_id
		player.apply_character_appearance()
		player.attack_anim_timer = 0.0
		player._update_hero_animation()
		assert(player.sprite.texture.resource_path.contains("animations/"), "%s must load its generated idle/run/attack animation set" % character_id)
	stats_manager.selected_character = selected_character_before_animation_test
	player.apply_character_appearance()
	player._update_hero_animation()

	var dash_target = load("res://scenes/enemy.tscn").instantiate()
	dash_target.enemy_type = "Typo Slime"
	main.add_child(dash_target)
	await process_frame
	dash_target.set_physics_process(false)
	dash_target.global_position = player.global_position
	var hp_before_dash: float = dash_target.health
	player.start_eraser_dash(Vector2.RIGHT)
	player.erase_nearby_enemies()
	player.erase_nearby_enemies()
	assert(is_equal_approx(dash_target.health, hp_before_dash - 60.0 * stats_manager.damage_mult), "Dash contact may damage an enemy only once per dash using the shared catalog value")
	dash_target.queue_free()

	paused = false
	var harpy = load("res://scenes/enemy.tscn").instantiate()
	harpy.enemy_type = "Homophone Harpy"
	main.add_child(harpy)
	await process_frame
	var harpy_dir = Vector2.RIGHT
	var harpy_velocity = harpy._harpy_movement(0.016, harpy_dir, 300.0)
	assert(harpy.telegraph_timer > 0.0, "Harpy must telegraph before firing")
	assert(harpy_velocity == Vector2.ZERO, "Harpy should pause to telegraph its ranged shot")

	var reaper = load("res://scenes/enemy.tscn").instantiate()
	reaper.enemy_type = "Run-on Reaper"
	main.add_child(reaper)
	await process_frame
	reaper._reaper_movement(0.016, Vector2.RIGHT)
	assert(reaper.telegraph_timer > 0.0, "Reaper must telegraph before charging")

	var phantom = load("res://scenes/enemy.tscn").instantiate()
	phantom.enemy_type = "Punctuation Phantom"
	main.add_child(phantom)
	await process_frame
	var phantom_velocity = phantom._phantom_movement(Vector2.RIGHT, 120.0)
	assert(phantom.telegraph_timer > 0.0, "Punctuation Phantom must wind up before its blink strike")
	assert(phantom_velocity == Vector2.ZERO, "Punctuation Phantom should pause during its strike telegraph")

	# Shelf art defines the room contact rectangle; wall thickness and player
	# radius keep the character body just inside the visible inner edge.
	var right_wall: CollisionShape2D = main.get_node("ArenaWalls/RightWall")
	var left_wall: CollisionShape2D = main.get_node("ArenaWalls/LeftWall")
	var top_wall: CollisionShape2D = main.get_node("ArenaWalls/TopWall")
	var bottom_wall: CollisionShape2D = main.get_node("ArenaWalls/BottomWall")
	var shelf_edge: Vector2 = ARENA_FRAME_SCRIPT.INNER_SHELF_EDGE
	assert(is_equal_approx(right_wall.position.x - right_wall.shape.size.x / 2.0, shelf_edge.x), "Right collision face must align to the visible shelf's inner edge")
	assert(is_equal_approx(left_wall.position.x + left_wall.shape.size.x / 2.0, -shelf_edge.x), "Left collision face must align to the visible shelf's inner edge")
	assert(is_equal_approx(bottom_wall.position.y - bottom_wall.shape.size.y / 2.0, shelf_edge.y), "Bottom collision face must align to the visible shelf's inner edge")
	assert(is_equal_approx(top_wall.position.y + top_wall.shape.size.y / 2.0, -shelf_edge.y), "Top collision face must align to the visible shelf's inner edge")
	var player_radius: float = player.get_node("CollisionShape2D").shape.radius
	var player_shape_offset: Vector2 = player.get_node("CollisionShape2D").position
	var collider_center_bounds: Rect2 = ARENA_FRAME_SCRIPT.PLAYER_COLLIDER_CENTER_BOUNDS
	var visual_center_bounds: Rect2 = ARENA_FRAME_SCRIPT.PLAYER_VISUAL_CENTER_BOUNDS
	assert(player_radius == ARENA_FRAME_SCRIPT.PLAYER_COLLIDER_RADIUS and player_shape_offset == ARENA_FRAME_SCRIPT.PLAYER_COLLIDER_OFFSET, "Arena bounds must use the actual player collision shape")
	assert(collider_center_bounds.encloses(visual_center_bounds), "Visual bounds must stay inside the collision-safe room bounds")
	var measured_visual_half_extent := Vector2.ZERO
	for frame_file in DirAccess.get_files_at("res://assets/sprites/upgrade_v1/animations"):
		if not frame_file.ends_with(".png"):
			continue
		var is_live_animation := "_idle_" in frame_file or "_v2_" in frame_file
		if not is_live_animation:
			continue
		var frame_texture := load("res://assets/sprites/upgrade_v1/animations/" + frame_file) as Texture2D
		var frame_image := frame_texture.get_image()
		var frame_alpha_bounds := frame_image.get_used_rect()
		var frame_center := Vector2(frame_texture.get_size()) / 2.0
		var frame_extent := Vector2(
			maxf(absf(frame_alpha_bounds.position.x - frame_center.x), absf(frame_alpha_bounds.end.x - frame_center.x)) * player.sprite.scale.x,
			maxf(absf(frame_alpha_bounds.position.y - frame_center.y), absf(frame_alpha_bounds.end.y - frame_center.y)) * player.sprite.scale.y
		)
		measured_visual_half_extent = Vector2(maxf(measured_visual_half_extent.x, frame_extent.x), maxf(measured_visual_half_extent.y, frame_extent.y))
	assert(measured_visual_half_extent.x <= ARENA_FRAME_SCRIPT.PLAYER_MAX_VISUAL_HALF_EXTENT.x and measured_visual_half_extent.y <= ARENA_FRAME_SCRIPT.PLAYER_MAX_VISUAL_HALF_EXTENT.y, "Visual center margins must cover alpha extents of every character animation")
	assert(absf(measured_visual_half_extent.x - ARENA_FRAME_SCRIPT.PLAYER_MAX_VISUAL_HALF_EXTENT.x) <= 0.5 and absf(measured_visual_half_extent.y - ARENA_FRAME_SCRIPT.PLAYER_MAX_VISUAL_HALF_EXTENT.y) <= 0.5, "Visual center margins must end at the maximum rendered alpha edge without a wide gap")
	var max_center_x: float = visual_center_bounds.end.x
	var min_center_x: float = visual_center_bounds.position.x
	var max_center_y: float = visual_center_bounds.end.y
	var min_center_y: float = visual_center_bounds.position.y
	# Verify contact from each cardinal direction, then verify the diagonal corner.
	for enemy in [harpy, reaper, phantom]:
		enemy.queue_free()
	await process_frame
	paused = false
	shop.hide()
	wave_manager.is_wave_active = false
	for enemy in get_nodes_in_group("enemies"):
		enemy.queue_free()
	await process_frame
	player.set_physics_process(false)
	for direction in [Vector2.RIGHT, Vector2.LEFT, Vector2.DOWN, Vector2.UP]:
		player.global_position = Vector2.ZERO
		player.velocity = direction * 600.0
		for _i in range(140):
			await physics_frame
			player.move_and_slide()
			player._clamp_to_visible_shelf_edge()
		if direction == Vector2.RIGHT:
			assert(player.global_position.x > max_center_x - 35.0, "Player must approach the visible right shelf face")
			assert(player.global_position.x <= max_center_x + 0.5, "Player collider must not cross the right shelf face")
		elif direction == Vector2.LEFT:
			assert(player.global_position.x < -max_center_x + 35.0, "Player must approach the visible left shelf face")
			assert(player.global_position.x >= -max_center_x - 0.5, "Player collider must not cross the left shelf face")
		elif direction == Vector2.DOWN:
			assert(player.global_position.y > max_center_y - 35.0, "Player must approach the visible bottom shelf face")
			assert(player.global_position.y <= max_center_y + 0.5, "Player collider must not cross the bottom shelf face")
		else:
			assert(player.global_position.y < min_center_y + 35.0, "Player must approach the visible top shelf face")
			assert(player.global_position.y >= min_center_y - 0.5, "Player collider must not cross the top shelf face")
	player.global_position = Vector2(1090.0, 790.0)
	for _i in range(60):
		await physics_frame
		player.velocity = Vector2(600.0, 600.0)
		player.move_and_slide()
		player._clamp_to_visible_shelf_edge()
	print("Corner movement test stopped at ", player.global_position)
	assert(player.global_position.x > max_center_x - 35.0 and player.global_position.y > max_center_y - 35.0, "Overlapping wall corners must leave the visible arena corner reachable")
	assert(player.global_position.x <= max_center_x + 0.5 and player.global_position.y <= max_center_y + 0.5, "Player collider must not cross either shelf face at the corner")
	var corner_spawn: Vector2 = wave_manager.get_arena_spawn_position(player.global_position, 560.0, 0.0)
	assert(absf(corner_spawn.x) <= 1150.0 and absf(corner_spawn.y) <= 850.0, "Corner spawns must remain inside the visible arena instead of landing behind bookshelf art")
	assert(corner_spawn.distance_to(player.global_position) >= 560.0, "Corner spawns must preserve readable distance from the player")
	for corner_origin in [Vector2(-1204.0, -828.0), Vector2(1204.0, -828.0), Vector2(-1204.0, 828.0), Vector2(1204.0, 828.0)]:
		var safe_spawn: Vector2 = wave_manager.get_arena_spawn_position(corner_origin, 560.0, corner_origin.angle())
		assert(absf(safe_spawn.x) <= 1150.0 and absf(safe_spawn.y) <= 850.0 and safe_spawn.distance_to(corner_origin) >= 560.0, "All four shelf corners must produce in-room spawns with safe separation")
	wave_manager.spawn_enemy()
	var corner_spawned_enemies := get_nodes_in_group("enemies")
	assert(not corner_spawned_enemies.is_empty(), "Corner spawn probe must create an enemy")
	var corner_spawned_enemy: Node2D = corner_spawned_enemies.back()
	assert(absf(corner_spawned_enemy.global_position.x) <= 1150.0 and absf(corner_spawned_enemy.global_position.y) <= 850.0, "Actual Godot enemy spawning must use the bounded arena helper")
	corner_spawned_enemy.despawn_without_rewards()
	await process_frame
	player.global_position = Vector2(max_center_x - 55.0, 0.0)
	player.start_eraser_dash(Vector2.RIGHT)
	for _i in range(20):
		await physics_frame
		player._physics_process(0.016)
	assert(player.global_position.x <= max_center_x + 0.5, "Dash must stop at the shelf face instead of crossing the right boundary")

	print("Gameplay regression checks passed: wave-scaled cap, cleanup rewards, gadget shop, dash damage, corner access, enemy telegraphs")
	main.queue_free()
	await process_frame
	quit(0)
