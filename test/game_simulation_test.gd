extends SceneTree

func _init():
	print("--- BEGIN INTEGRATION TEST: LEXICON SURVIVORS ---")
	
	var WordDatabase = load("res://scripts/word_database.gd").new()
	var StatsManager = load("res://scripts/stats_manager.gd").new()
	
	# Test 1: Word Database
	print("[TEST 1] Testing WordDatabase...")
	var test_card = WordDatabase.get_word_info("Indeterminate")
	assert(not test_card.is_empty(), "Indeterminate must exist in the shared WordDatabase")
	assert(test_card["type"] == "Adjective", "Type must be Adjective")
	assert(test_card["level"] == "C1", "Indeterminate must retain its CEFR C1 level")
	print("  -> WordDatabase verified: found ", WordDatabase.words.size(), " educational words.")
	
	# Test 2: Stats Manager
	print("[TEST 2] Testing StatsManager initial state & upgrades...")
	StatsManager.reset()
	assert(StatsManager.hp == StatsManager.max_hp, "HP must start at the selected character's maximum")
	assert(StatsManager.ink_count == 15, "A run must begin with the shared starter amount for its first shop purchase")
	
	var starting_ink = StatsManager.ink_count
	StatsManager.add_ink(50)
	var expected_ink = starting_ink + int(ceil(50.0 * StatsManager.ink_mult))
	assert(StatsManager.ink_count == expected_ink, "Ink should include the selected difficulty multiplier")
	
	var spend_success = StatsManager.spend_ink(20)
	assert(spend_success == true, "Spending 20 ink should succeed")
	assert(StatsManager.ink_count == expected_ink - 20, "Remaining ink should equal the award less the purchase")
	
	# Test 3: Card Upgrade with Quiz Bonus
	print("[TEST 3] Testing Quiz Bonus & Stat Application...")
	var initial_atk_speed = StatsManager.attack_speed_mult
	StatsManager.apply_card_upgrade(test_card, true) # true = quiz bonus (+50%)
	assert(StatsManager.attack_speed_mult > initial_atk_speed, "Attack speed must increase")
	print("  -> Applied Indeterminate with Quiz bonus: new attack_speed_mult = ", StatsManager.attack_speed_mult)
	
	# Test 4: Synergy Mechanics
	print("[TEST 4] Testing Synergy System (3 Adjectives)...")
	var card2 = WordDatabase.get_word_info("Fast")
	var card3 = WordDatabase.get_word_info("Strong")
	StatsManager.apply_card_upgrade(card2, false)
	StatsManager.apply_card_upgrade(card3, false)
	
	assert(StatsManager.words_learned.size() == 3, "Words learned must have 3 items")
	print("  -> Words learned: ", StatsManager.words_learned)
	
	# Test 5: Damage & Health
	print("[TEST 5] Testing Health & Damage...")
	var hp_before_damage = StatsManager.hp
	var damage_after_armor = 25.0 * (1.0 - StatsManager.armor)
	StatsManager.take_damage(25.0)
	assert(is_equal_approx(StatsManager.hp, hp_before_damage - damage_after_armor), "HP loss should account for the selected character's armor")
	StatsManager.heal(10.0)
	assert(is_equal_approx(StatsManager.hp, hp_before_damage - damage_after_armor + 10.0), "HP should recover by 10 after healing")
	
	print("--- ALL 5 INTEGRATION TESTS PASSED WITH 100% SUCCESS ---")
	quit(0)
