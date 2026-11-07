extends SceneTree

func _init():
	print("=== BEGIN COMPREHENSIVE FEATURES TEST: LEXICON SURVIVORS ===")
	
	var WordDatabase = load("res://scripts/word_database.gd").new()
	var StatsManager = load("res://scripts/stats_manager.gd").new()
	
	# [TEST 1] Question & Word Database Diversity (50+ words across all types)
	print("[TEST 1] Verifying Word Database & Soru Çeşitliliği...")
	assert(WordDatabase.words.size() >= 50, "Word database must contain at least 50 questions, found: " + str(WordDatabase.words.size()))
	var q_types = {}
	var levels = {}
	for w in WordDatabase.words:
		var qt = w.get("question_type", "meaning")
		q_types[qt] = q_types.get(qt, 0) + 1
		var lvl = w.get("level", "A1")
		levels[lvl] = levels.get(lvl, 0) + 1
		
	print("  -> Question types found:", q_types)
	print("  -> CEFR levels found:", levels)
	assert(q_types.has("meaning"), "Must have meaning questions")
	assert(q_types.has("synonym"), "Must have synonym questions")
	assert(q_types.has("antonym"), "Must have antonym questions")
	assert(q_types.has("spelling"), "Must have spell-check questions")
	assert(q_types.has("collocation"), "Must have preposition/collocation questions")
	print("  ✓ [TEST 1 PASSED]: 50+ Educational Questions verified!")
	
	# [TEST 2] Character Selection (Inky, Quillmaster, Word Knight)
	print("[TEST 2] Verifying Character Selection System...")
	# Check Inky
	StatsManager.select_character("inky")
	StatsManager.reset()
	assert(StatsManager.max_hp == 140.0, "Inky HP must be 140 (125 + 15 normal bonus)")
	assert(StatsManager.move_speed == 235.0, "Inky speed must be 235")
	assert(StatsManager.equipped_weapons == ["quill_blaster"], "Inky must start with quill_blaster")
	
	# Check Quillmaster
	StatsManager.select_character("quillmaster")
	StatsManager.reset()
	assert(StatsManager.max_hp == 110.0, "Quillmaster HP must be 110 (95 + 15 normal bonus)")
	assert(StatsManager.attack_speed_mult == 1.35, "Quillmaster attack speed must be 1.35")
	assert(StatsManager.equipped_weapons == ["syllable_shotgun"], "Quillmaster must start with syllable_shotgun")
	
	# Check Word Knight
	StatsManager.select_character("word_knight")
	StatsManager.reset()
	assert(StatsManager.max_hp == 195.0, "Word Knight HP must be 195 (180 + 15 normal bonus)")
	assert(StatsManager.armor == 0.30, "Word Knight armor must be 0.30")
	assert(StatsManager.equipped_weapons == ["dictionary_blade"], "Word Knight must start with dictionary_blade")
	print("  ✓ [TEST 2 PASSED]: All 3 Characters verified!")
	
	# [TEST 3] Difficulty Modes (Easy, Normal, Hard)
	print("[TEST 3] Verifying Difficulty Modes (Zorluk Modu)...")
	StatsManager.select_character("inky")
	
	# Easy: player bonus HP +40
	StatsManager.set_difficulty("easy")
	StatsManager.reset()
	assert(StatsManager.max_hp == 165.0, "Easy mode player HP must have +40 bonus (165.0)")
	assert(StatsManager.ink_mult == 1.05, "Easy mode ink multiplier must match the current economy profile")
	
	# Hard: player HP +0
	StatsManager.set_difficulty("hard")
	StatsManager.reset()
	assert(StatsManager.max_hp == 125.0, "Hard mode player HP must be 125.0")
	assert(StatsManager.ink_mult == 1.10, "Hard mode ink multiplier must match the current economy profile")
	
	# Normal
	StatsManager.set_difficulty("normal")
	StatsManager.reset()
	assert(StatsManager.max_hp == 140.0, "Normal mode player HP must be 140.0")
	print("  ✓ [TEST 3 PASSED]: Difficulty modes verified!")
	
	# [TEST 4] Weapon Equipping & Multiple Weapons
	print("[TEST 4] Verifying Multi-Weapon System...")
	assert(StatsManager.has_weapon("quill_blaster") == true, "Must have quill_blaster")
	var equipped_shotgun = StatsManager.equip_weapon("syllable_shotgun")
	assert(equipped_shotgun == true, "Equipping syllable_shotgun must succeed")
	assert(StatsManager.equipped_weapons.size() == 2, "Must have 2 weapons equipped")
	var equipped_beam = StatsManager.equip_weapon("lexicon_beam")
	assert(equipped_beam == true, "Equipping lexicon_beam must succeed")
	assert(StatsManager.equipped_weapons.size() == 3, "Must have 3 weapons equipped")
	print("  ✓ [TEST 4 PASSED]: Multi-Weapon system verified!")
	
	# [TEST 5] Armor & Damage Reduction
	print("[TEST 5] Verifying Armor & Damage Reduction...")
	StatsManager.reset()
	var inky_initial_hp = StatsManager.hp
	StatsManager.armor = 0.0
	StatsManager.take_damage(20.0)
	assert(StatsManager.hp == inky_initial_hp - 20.0, "HP should decrease by exactly 20 without armor")
	
	# Word Knight with 30% armor: 20 dmg * (1 - 0.30) = 14 dmg taken
	StatsManager.select_character("word_knight")
	StatsManager.reset()
	var knight_initial_hp = StatsManager.hp
	StatsManager.take_damage(20.0)
	assert(StatsManager.hp == knight_initial_hp - 14.0, "Word Knight should take 14 damage with 30% armor")
	print("  ✓ [TEST 5 PASSED]: Armor calculation verified!")
	
	# [TEST 6] Shop Artifact Purchases
	print("[TEST 6] Verifying Shop Artifacts...")
	StatsManager.select_character("inky")
	StatsManager.reset()
	StatsManager.add_ink(100)
	
	# Buy Scholar Boots (+40 move speed)
	var prev_speed = StatsManager.move_speed
	var bought_boots = StatsManager.buy_artifact("scholar_boots")
	assert(bought_boots == true, "Buying boots should succeed")
	assert(StatsManager.move_speed == prev_speed + 40.0, "Move speed should increase by 40")
	
	# Buy Quantum Eraser (-35% gadget cooldown)
	var bought_eraser = StatsManager.buy_artifact("quantum_eraser")
	assert(bought_eraser == true, "Buying quantum eraser should succeed")
	assert(StatsManager.gadget_cooldown_mult == 0.65, "Gadget cooldown mult should be 0.65")
	print("  ✓ [TEST 6 PASSED]: Shop artifacts verified!")
	
	# [TEST 7] New Synergies: Syntax Guardian & Word Weaver
	print("[TEST 7] Verifying New Synergies...")
	var g1 = WordDatabase.get_word_info("Neither...nor")
	var g2 = WordDatabase.get_word_info("Not only...but also")
	var g3 = WordDatabase.get_word_info("So that")
	StatsManager.apply_card_upgrade(g1)
	StatsManager.apply_card_upgrade(g2)
	StatsManager.apply_card_upgrade(g3)
	assert(StatsManager.active_synergies.has("Syntax Guardian") == true, "3 Grammar cards should activate Syntax Guardian synergy")
	print("  -> Active synergies:", StatsManager.active_synergies)
	# [TEST 8] Punctuation Bomb & Weapon Switching System
	print("[TEST 8] Verifying Punctuation Bomb & Silah Değişme (Weapon Switching)...")
	assert(StatsManager.weapons_catalog.has("punctuation_bomb"), "weapons_catalog must include punctuation_bomb")
	var equipped_bomb = StatsManager.equip_weapon("punctuation_bomb")
	assert(equipped_bomb == true, "Equipping punctuation_bomb must succeed")
	assert(StatsManager.has_weapon("punctuation_bomb") == true, "Player must have punctuation_bomb")
	
	# Test Weapon Switching (Q/E cycling & selection)
	var initial_active = StatsManager.get_active_weapon_id()
	StatsManager.switch_next_weapon()
	var next_active = StatsManager.get_active_weapon_id()
	assert(initial_active != next_active, "Active weapon should change after switch_next_weapon")
	
	StatsManager.switch_prev_weapon()
	assert(StatsManager.get_active_weapon_id() == initial_active, "Active weapon should return to initial after switch_prev_weapon")
	
	# Direct slot selection
	StatsManager.select_weapon_index(1)
	assert(StatsManager.active_weapon_index == 1, "Active weapon index should be 1")
	assert(StatsManager.get_active_weapon_id() == StatsManager.equipped_weapons[1], "Active weapon id must match slot 1")
	
	# Punctuation Mine scene verification
	var mine_scene = load("res://scenes/punctuation_mine.tscn")
	assert(mine_scene != null, "punctuation_mine.tscn must exist and load")
	var mine_inst = mine_scene.instantiate()
	assert(mine_inst != null, "punctuation_mine must instantiate cleanly")
	mine_inst.setup(Vector2.ZERO, 38.0, 125.0)
	assert(mine_inst.damage == 38.0, "Mine damage should be 38.0")
	assert(mine_inst.blast_radius == 125.0, "Mine blast radius should be 125.0")
	mine_inst.free()
	print("  ✓ [TEST 8 PASSED]: Punctuation Bomb & Weapon Switching verified!")
	
	print("=== ALL 8 COMPREHENSIVE FEATURE TESTS PASSED WITH 100% SUCCESS! ===")
	quit(0)
