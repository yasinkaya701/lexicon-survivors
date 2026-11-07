extends Node

func _ready():
	print("--- Headless Full Runtime Test Starting ---")
	assert(StatsManager != null, "Autoload StatsManager must be present")
	assert(WordDatabase != null, "Autoload WordDatabase must be present")
	
	print("1. Testing Character selection & reset...")
	StatsManager.select_character("quillmaster")
	StatsManager.set_difficulty("hard")
	StatsManager.reset()
	assert(StatsManager.selected_character == "quillmaster")
	assert(StatsManager.difficulty == "hard")
	assert(StatsManager.max_hp == 95.0)
	
	print("2. Instantiating scenes/main.tscn...")
	var main_res = load("res://scenes/main.tscn")
	var main = main_res.instantiate()
	add_child(main)
	
	print("3. Testing start_game() in main...")
	main.start_game()
	
	print("4. Testing wave timer update & enemy spawn...")
	var wm = main.get_node("WaveManager")
	wm.spawn_enemy()
	var enemies = get_tree().get_nodes_in_group("enemies")
	print("  -> Enemies in arena:", enemies.size())
	assert(enemies.size() > 0, "At least 1 enemy should be spawned")
	
	print("5. Testing Player take_damage & Eraser Dash...")
	var player = main.get_node("Player")
	var base_tint = player.character_base_color
	player.start_eraser_dash(Vector2.RIGHT)
	assert(player.is_dashing == true, "Player should be dashing")
	assert(player.is_invulnerable == true, "Player should be invulnerable while dashing")
	
	print("6. Testing Weapon Switching on Player...")
	StatsManager.equip_weapon("punctuation_bomb")
	player.sync_weapons()
	var initial_w = StatsManager.get_active_weapon_id()
	StatsManager.switch_next_weapon()
	player.sync_weapons()
	assert(StatsManager.get_active_weapon_id() != initial_w, "Active weapon should have switched")
	assert(player.weapons_container.get_child_count() == StatsManager.equipped_weapons.size(), "Weapons count on player must match equipped_weapons")
	
	print("--- Headless Full Runtime Test Completed Successfully! ---")
	get_tree().quit(0)
