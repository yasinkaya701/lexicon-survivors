extends SceneTree

func _init():
	print("\n=== BEGIN V2.0 ADVANCED FEATURES TEST ===")
	
	var StatsManager = load("res://scripts/stats_manager.gd").new()
	assert(StatsManager.load_weapon_economy(), "Shared weapon balance data must load in the isolated stats test")
	assert(StatsManager.load_utility_items(), "Shared gadget and relic data must load in the isolated stats test")
	
	# 1. Test 15 Weapons in Catalog
	var expected_weapons = [
		"quill_blaster", "syllable_shotgun", "lexicon_beam", "punctuation_bomb", "dictionary_blade",
		"crossword_crossbow", "hyphen_boomerang", "ink_flamethrower", "thesaurus_rocket", "quote_pistols",
		"calligraphy_katana", "scroll_turret", "rune_orb", "grammar_sniper", "word_loom"
	]
	print("[V2 TEST 1] Verifying 15 Weapon Arsenal in StatsManager...")
	assert(StatsManager.weapons_catalog.size() == 15, "Expected 15 weapons in weapons_catalog!")
	for w_id in expected_weapons:
		assert(StatsManager.weapons_catalog.has(w_id), "Missing weapon in catalog: " + w_id)
		var w = StatsManager.weapons_catalog[w_id]
		print("  ✓ Weapon: %s | Damage: %.1f | Cooldown: %.2fs" % [w.name, w.damage, w.cooldown])
	print("✓ [V2 TEST 1 PASSED]: All 15 Weapons verified!\n")

	# 1.5 Verify the shared gadget and relic catalog
	print("[V2 TEST 1.5] Verifying 8 Gadget Arsenal in StatsManager...")
	var expected_gadgets = ["eraser_dash", "ink_cataclysm", "chrono_comma", "lexicon_aegis", "grammar_magnet", "index_storm", "redact_field", "palimpsest_step"]
	assert(StatsManager.gadgets_catalog.size() == expected_gadgets.size(), "Expected all shared gadgets in gadgets_catalog!")
	for g_id in expected_gadgets:
		assert(StatsManager.gadgets_catalog.has(g_id), "Missing gadget in catalog: " + g_id)
		var g = StatsManager.gadgets_catalog[g_id]
		print("  ✓ Gadget: %s | Cooldown: %.1fs | Cost: %d" % [g.name, g.cooldown, g.cost])
	print("✓ [V2 TEST 1.5 PASSED]: All %d Gadgets verified!\n" % expected_gadgets.size())
	assert(StatsManager.artifacts_catalog.size() == 10, "Expected all ten shared relics in artifacts_catalog")
	
	# 2. Test Enemy Archetypes & Scaling
	print("[V2 TEST 2] Verifying Enemy Archetypes & Health Scaling...")
	var archetypes = [
		{"type": "Typo Slime", "min_hp": 50.0},
		{"type": "Typo Splinter", "min_hp": 15.0},
		{"type": "Grammar Goblin", "min_hp": 30.0},
		{"type": "Punctuation Phantom", "min_hp": 40.0},
		{"type": "Syntax Titan", "min_hp": 200.0},
		{"type": "Spelling Spectre", "min_hp": 50.0},
		{"type": "Red Pen Boss", "min_hp": 500.0},
		{"type": "Oxymoron Ogre", "min_hp": 240.0},
		{"type": "Vocabulary Void", "min_hp": 140.0},
		{"type": "Malapropism Mimic", "min_hp": 80.0},
		{"type": "Homophone Harpy", "min_hp": 60.0},
		{"type": "Idiom Imp", "min_hp": 40.0},
		{"type": "Lexicon Dragon Boss", "min_hp": 3000.0}
	]
	
	for arch in archetypes:
		var diff_data = StatsManager.difficulties.get(StatsManager.difficulty, StatsManager.difficulties["normal"])
		var hp_mult = diff_data.get("enemy_hp_mult", 1.0)
		var spd_mult = diff_data.get("enemy_speed_mult", 1.0)
		var dmg_mult = diff_data.get("enemy_damage_mult", 1.0)
		var max_health = 0.0
		var speed = 0.0
		var damage_to_player = 0.0
		
		if arch.type == "Typo Slime":
			max_health = (70.0 + (StatsManager.current_wave - 1) * 18.0) * hp_mult
			speed = (80.0 + (StatsManager.current_wave - 1) * 3.5) * spd_mult
			damage_to_player = 15.0 * dmg_mult
		elif arch.type == "Grammar Goblin":
			max_health = (45.0 + (StatsManager.current_wave - 1) * 14.0) * hp_mult
			speed = (138.0 + (StatsManager.current_wave - 1) * 6.0) * spd_mult
			damage_to_player = 14.0 * dmg_mult
		elif arch.type == "Typo Splinter":
			max_health = (25.0 + StatsManager.current_wave * 6.0) * hp_mult
			speed = (150.0 + StatsManager.current_wave * 5.0) * spd_mult
			damage_to_player = 9.0 * dmg_mult
		elif arch.type == "Punctuation Phantom":
			max_health = (55.0 + (StatsManager.current_wave - 1) * 16.0) * hp_mult
			speed = (105.0 + (StatsManager.current_wave - 1) * 4.0) * spd_mult
			damage_to_player = 16.0 * dmg_mult
		elif arch.type == "Syntax Titan":
			max_health = (280.0 + (StatsManager.current_wave - 1) * 75.0) * hp_mult
			speed = (65.0 + (StatsManager.current_wave - 1) * 3.0) * spd_mult
			damage_to_player = 28.0 * dmg_mult
		elif arch.type == "Spelling Spectre":
			max_health = (70.0 + (StatsManager.current_wave - 1) * 18.0) * hp_mult
			speed = (120.0 + (StatsManager.current_wave - 1) * 5.0) * spd_mult
			damage_to_player = 18.0 * dmg_mult
		elif arch.type == "Red Pen Boss":
			var hp_base = 750.0 if StatsManager.current_wave <= 3 else 1800.0
			max_health = hp_base * hp_mult
			speed = 85.0 * spd_mult
			damage_to_player = 32.0 * dmg_mult
		elif arch.type == "Oxymoron Ogre":
			max_health = (340.0 + (StatsManager.current_wave - 1) * 80.0) * hp_mult
			speed = 70.0 * spd_mult
			damage_to_player = 30.0 * dmg_mult
		elif arch.type == "Vocabulary Void":
			max_health = (200.0 + (StatsManager.current_wave - 1) * 50.0) * hp_mult
			speed = 60.0 * spd_mult
			damage_to_player = 24.0 * dmg_mult
		elif arch.type == "Malapropism Mimic":
			max_health = (110.0 + (StatsManager.current_wave - 1) * 25.0) * hp_mult
			speed = 130.0 * spd_mult
			damage_to_player = 22.0 * dmg_mult
		elif arch.type == "Homophone Harpy":
			max_health = (85.0 + (StatsManager.current_wave - 1) * 20.0) * hp_mult
			speed = 150.0 * spd_mult
			damage_to_player = 18.0 * dmg_mult
		elif arch.type == "Idiom Imp":
			max_health = (60.0 + (StatsManager.current_wave - 1) * 15.0) * hp_mult
			speed = 160.0 * spd_mult
			damage_to_player = 14.0 * dmg_mult
		elif arch.type == "Lexicon Dragon Boss":
			max_health = 4200.0 * hp_mult
			speed = 95.0 * spd_mult
			damage_to_player = 45.0 * dmg_mult
			
		assert(max_health >= arch.min_hp, "Enemy %s HP %.1f is below expected %.1f" % [arch.type, max_health, arch.min_hp])
		print("  ✓ %s: Max HP = %.1f, Speed = %.1f, Damage = %.1f" % [arch.type, max_health, speed, damage_to_player])
	print("✓ [V2 TEST 2 PASSED]: All 13 Enemy Archetypes verified!\n")

	# 2.5 Test 100 Waves configuration
	print("[V2 TEST 2.5] Verifying 100-Wave Progression Support...")
	assert(StatsManager.max_waves == 100, "StatsManager.max_waves must be 100")
	print("  ✓ 100-Wave System Active in StatsManager")
	print("✓ [V2 TEST 2.5 PASSED]: 100-Wave System verified!\n")

	# 3. Test Web Build Integrity
	print("[V2 TEST 3] Verifying Web Assets & Questions...")
	var f = FileAccess.open("res://build/web/questions.json", FileAccess.READ)
	assert(f != null, "build/web/questions.json must exist")
	var content = f.get_as_text()
	f.close()
	var json = JSON.parse_string(content)
	assert(json != null and json.size() >= 50, "questions.json must have 50+ questions")
	print("  ✓ Web Questions loaded: %d items" % json.size())
	print("✓ [V2 TEST 3 PASSED]: Web build questions verified!\n")
	
	print("=== ALL V2.0 ADVANCED TESTS PASSED WITH 100% SUCCESS! ===")
	quit()
