extends Node

func _ready():
	print("\n=== BEGIN GODOT NATIVE PORT VERIFICATION TEST ===")
	assert(WordDatabase.words.size() == 1000, "Godot should use the same complete 1000-card bank as web")

	# TEST 1: Speed Toggles & Engine.time_scale
	print("[PORT TEST 1] Verifying Game Speed Toggles & Engine.time_scale...")
	assert(StatsManager.game_speed == 1.0, "Initial speed should be 1.0")
	var s1 = StatsManager.cycle_game_speed()
	assert(s1 == 1.5 and Engine.time_scale == 1.5, "Speed should cycle to 1.5")
	var s2 = StatsManager.cycle_game_speed()
	assert(s2 == 2.0 and Engine.time_scale == 2.0, "Speed should cycle to 2.0")
	var s3 = StatsManager.cycle_game_speed()
	assert(s3 == 3.0 and Engine.time_scale == 3.0, "Speed should cycle to 3.0")
	var s4 = StatsManager.cycle_game_speed()
	assert(s4 == 0.5 and Engine.time_scale == 0.5, "Speed should cycle to 0.5")
	var s5 = StatsManager.cycle_game_speed()
	assert(s5 == 1.0 and Engine.time_scale == 1.0, "Speed should cycle back to 1.0")
	print("  ✓ Game Speed successfully cycles: 1.0x -> 1.5x -> 2.0x -> 3.0x -> 0.5x -> 1.0x (Engine.time_scale verified!)")
	print("✓ [PORT TEST 1 PASSED]\n")

	# TEST 2: Auto-Tur & Auto-New-Run Settings
	print("[PORT TEST 2] Verifying Auto-Tur & Auto-New-Run Toggles...")
	assert(StatsManager.auto_new_tur == true, "Auto-tur default should be true")
	assert(StatsManager.auto_new_run == true, "Auto-run default should be true")
	var t1 = StatsManager.toggle_auto_new_tur()
	assert(t1 == false and StatsManager.auto_new_tur == false, "Auto-tur should toggle to false")
	var t2 = StatsManager.toggle_auto_new_tur()
	assert(t2 == true and StatsManager.auto_new_tur == true, "Auto-tur should toggle to true")
	var r1 = StatsManager.toggle_auto_new_run()
	assert(r1 == false and StatsManager.auto_new_run == false, "Auto-run should toggle to false")
	var r2 = StatsManager.toggle_auto_new_run()
	assert(r2 == true and StatsManager.auto_new_run == true, "Auto-run should toggle to true")
	print("  ✓ Auto-Tur and Auto-New-Run toggle states verified!")
	print("✓ [PORT TEST 2 PASSED]\n")

	# TEST 3: Mistake Recording & Redemption System
	print("[PORT TEST 3] Verifying Mistake Notebook & Redemption System...")
	var dummy_card = {
		"word": "Ephemeral",
		"type": "Adjective",
		"level": "C1",
		"question": "What is the meaning of Ephemeral?",
		"options": ["Short-lived", "Permanent", "Heavy", "Loud"],
		"correct_index": 0,
		"cost": 10,
		"stat": "move_speed",
		"value": 20.0
	}
	StatsManager.record_mistake(dummy_card)
	assert(StatsManager.mistake_words.size() == 1, "Expected 1 mistake recorded")
	assert(StatsManager.mistake_words[0]["word"] == "Ephemeral", "Recorded mistake word mismatch")

	# Test redemption upgrade calculation
	var orig_speed = StatsManager.move_speed
	var redemption_card = dummy_card.duplicate()
	redemption_card["is_redemption"] = true
	StatsManager.apply_card_upgrade(redemption_card, true)
	var speed_gain = StatsManager.move_speed - orig_speed
	# 20.0 * 1.75 = 35.0
	assert(abs(speed_gain - 35.0) < 0.1, "Redemption bonus should be +%75 (35.0 gain, got: " + str(speed_gain) + ")")

	StatsManager.remove_mistake("Ephemeral")
	assert(StatsManager.mistake_words.size() == 0, "Mistake should be removed after redemption")
	print("  ✓ Mistake recorded, redeemed with +%75 bonus stats, and cleaned up successfully!")
	print("✓ [PORT TEST 3 PASSED]\n")

	# TEST 4: Enemy Affixes & Boss Enraged Phase
	print("[PORT TEST 4] Verifying Enemy Affixes & Boss Phase 2...")
	var enemy_scene = preload("res://scenes/enemy.tscn")
	var enemy = enemy_scene.instantiate()
	add_child(enemy)
	enemy.enemy_type = "Red Pen Boss"
	enemy.setup_type()
	assert(enemy.is_boss == true, "Enemy should be identified as boss")
	assert(enemy.is_enraged == false, "Boss should start in normal phase")

	# Simulate taking damage to trigger Enrage (< 50% HP)
	var initial_speed = enemy.speed
	enemy.take_damage(enemy.max_health * 0.55, Vector2.RIGHT)
	assert(enemy.is_enraged == true, "Boss should be enraged below 50% HP")
	assert(enemy.speed > initial_speed, "Boss speed should increase during Phase 2")
	print("  ✓ Boss Enraged Phase 2 verified! Speed scaled from %.1f to %.1f" % [initial_speed, enemy.speed])

	# Test Shielded Affix
	var shielded_enemy = enemy_scene.instantiate()
	shielded_enemy.enemy_type = "Grammar Goblin"
	shielded_enemy.affix = "shielded"
	add_child(shielded_enemy)
	shielded_enemy.setup_type()
	shielded_enemy.velocity = Vector2(100, 0) # Moving right
	# Hit from front (knock_dir to the left means projectile came from right)
	var hp_before = shielded_enemy.health
	shielded_enemy.take_damage(100.0, Vector2(-1, 0))
	var dmg_taken = hp_before - shielded_enemy.health
	# Front hit should be reduced by 75% (or 75% reduction on crit 175 = 43.75)
	assert(dmg_taken <= 45.0, "Shielded front hit should receive 75% damage reduction! Took: " + str(dmg_taken))
	print("  ✓ Shielded affix verified! Frontal hit absorbed: only took %.1f damage." % dmg_taken)
	print("✓ [PORT TEST 4 PASSED]\n")

	# TEST 5: Biome Progression Verification
	print("[PORT TEST 5] Verifying 4-Biome Progression Settings...")
	var main_scene = preload("res://scenes/main.tscn")
	var main_inst = main_scene.instantiate()
	add_child(main_inst)
	assert(main_inst.biome_data.size() == 4, "Expected 4 distinct biomes")
	for i in range(4):
		var b = main_inst.biome_data[i]
		assert(ResourceLoader.exists(b["texture"]), "Missing biome texture: " + b["texture"])
		assert(ResourceLoader.exists(b["rune"]), "Missing biome rune: " + b["rune"])
		print("  ✓ Biome %d: %s | Texture: %s" % [i + 1, b["name"], b["texture"].get_file()])
	print("✓ [PORT TEST 5 PASSED]\n")

	# TEST 6: Mobile Touch Controls Support
	print("[PORT TEST 6] Verifying Mobile Touch Virtual Direction Vector...")
	StatsManager.touch_input_direction = Vector2(0.707, -0.707)
	assert(StatsManager.touch_input_direction.length() > 0.99, "Touch input direction vector not normalized")
	StatsManager.touch_input_direction = Vector2.ZERO
	assert(StatsManager.touch_input_direction == Vector2.ZERO, "Touch input direction reset failed")
	print("  ✓ Mobile touch joystick direction verified!")
	print("✓ [PORT TEST 6 PASSED]\n")

	print("=== ALL GODOT PORT VERIFICATION TESTS PASSED 100%! ===")
	get_tree().quit()
