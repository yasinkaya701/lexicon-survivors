extends Node

func _ready():
	print("Instantiating main.tscn in headless test...")
	var scene = load("res://scenes/main.tscn")
	assert(scene != null, "main.tscn should load")
	var main_node = scene.instantiate()
	add_child(main_node)
	print("main_node instantiated successfully!")
	assert(main_node.has_node("Player"), "Player should exist")
	assert(main_node.has_node("WaveManager"), "WaveManager should exist")
	assert(main_node.has_node("HUD"), "HUD should exist")
	assert(main_node.has_node("ShopLayer/ShopUI"), "ShopUI should exist")
	assert(main_node.has_node("TitleLayer/TitleScreen"), "TitleScreen should exist")
	var title_screen = main_node.get_node("TitleLayer/TitleScreen")
	assert(title_screen.has_method("start_intro"), "TitleScreen should provide the first-visit intro")
	assert(title_screen.has_method("skip_intro"), "TitleScreen intro should be skippable")
	assert(title_screen.has_signal("leaderboard_requested"), "Title screen must expose its leaderboard entry action")
	assert(title_screen.get_node_or_null("Panel/VBox/LeaderboardButton") != null, "Title screen must show an image-led leaderboard entry")
	var music_choice: OptionButton = title_screen.find_child("MusicChoice", true, false)
	assert(music_choice != null and music_choice.item_count == 5, "Title screen must offer automatic, library, action, urgent and boss music choices")
	assert(main_node.has_node("LeaderboardPanel"), "Native game must include its shared leaderboard panel")
	assert(main_node.get_node("LeaderboardPanel").has_method("open_board"), "Leaderboard panel must be usable from title and game-over UI")
	assert(main_node.has_node("GameOverLayer/GameOverPanel/LeaderboardButton"), "Final run screen must provide a leaderboard action")
	await _test_story_intermission(main_node)
	await _test_leaderboard_offline(main_node)
	await _test_intro_paths()
	print("All scene components verified! Quitting cleanly.")

func _test_story_intermission(main_node: Node) -> void:
	var hud: Node = main_node.get_node("HUD")
	var previous_character: String = StatsManager.selected_character
	StatsManager.selected_character = "inky"
	hud.play_story_intermission(5)
	await get_tree().process_frame
	var overlay: Control = hud.get_node("StoryIntermission")
	assert(overlay.visible, "Every fifth-wave story scene must take focus over the game")
	assert(hud._story_title.text == "Ters Akan Fiş", "Wave 5 must begin the selected character's authored story")
	assert(hud._story_speaker.text == "Kırmızı Müfettiş", "Wave 5 comic must open with the defeated boss's testimony")
	assert(hud._story_copy.text == "O kırmızı çizgiyi itirazı susturmak için çektim. Yangının emrini ben yazmadım; ama soruyu da ben kestim.", "Wave 5 must show the authored boss confession")
	assert(hud._story_actor.texture.resource_path.ends_with("/boss_red_inquisitor.png"), "Wave 5 boss testimony must show the matching portrait")
	assert(hud._story_scene_image.texture.resource_path.ends_with("/panels_600/inky/wave_005_panel_01.webp"), "Wave 5 must load its unique Inky scene art")
	hud._advance_story_panel()
	await get_tree().process_frame
	assert(overlay.visible and hud._story_panel_index == 1, "Enter must advance one comic panel at a time")
	for _panel in range(4):
		hud._advance_story_panel()
		await get_tree().process_frame
	assert(not overlay.visible, "Acknowledging the story scene must close its intermission overlay")
	StatsManager.selected_character = previous_character

func _test_leaderboard_offline(main_node: Node) -> void:
	var client: Node = get_tree().root.get_node("LeaderboardClient")
	var configured_api: String = str(ProjectSettings.get_setting("leaderboard/api_base_url", ""))
	assert(configured_api.begins_with("https://") and configured_api.contains("workers.dev"), "Native builds must point to the live global leaderboard Worker")
	var old_url: String = str(client.api_url)
	client.api_url = ""
	var submission_id := str(client.create_submission_id())
	var uuid_regex := RegEx.new()
	uuid_regex.compile("^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
	assert(uuid_regex.search(submission_id) != null, "Native submissions must use a stable valid UUID for idempotent retries")
	assert(client._sanitize_alias("Ink <script> runner").length() <= 20, "Native display names must be sanitized and bounded")
	assert(client._sanitize_alias("İpek Şirin") == "İpek Şirin", "Native alias sanitation must preserve Turkish Latin characters")
	var loaded: Array = []
	var fetch_callback := func(entries: Array, error: String) -> void: loaded.append({"entries": entries, "error": error})
	client.leaderboard_loaded.connect(fetch_callback)
	client.fetch_top("hard")
	assert(loaded.size() == 1 and loaded[0].entries.is_empty() and not loaded[0].error.is_empty(), "Empty Worker URL must produce an offline state without a request")
	var submitted: Array = []
	var submit_callback := func(accepted: bool, rank: int, error: String) -> void: submitted.append({"accepted": accepted, "rank": rank, "error": error})
	client.submission_finished.connect(submit_callback)
	client.submit_run({"alias": "Ink Runner", "wavesCleared": 2, "kills": 4, "elapsedMs": 1000, "characterId": "inky", "difficultyId": "hard"})
	assert(submitted.size() == 1 and not submitted[0].accepted and not submitted[0].error.is_empty(), "Offline score submission must fail visibly and leave UI responsive")
	var panel: Node = main_node.get_node("LeaderboardPanel")
	panel.open_board()
	await get_tree().process_frame
	assert(panel.overlay.visible and panel.status_label.text.contains("Yerel"), "Leaderboard panel must open with an offline local-board status")
	var close_button: Button = panel.find_child("CloseButton", true, false)
	assert(close_button != null, "Leaderboard panel must expose a visible close action")
	close_button.emit_signal("pressed")
	assert(not panel.overlay.visible, "Leaderboard panel close action must work while the game is paused")
	client.leaderboard_loaded.disconnect(fetch_callback)
	client.submission_finished.disconnect(submit_callback)
	client.api_url = old_url

func _test_intro_paths() -> void:
	var test_config_path = "user://archive_intro_test.cfg"
	var absolute_path = ProjectSettings.globalize_path(test_config_path)
	if FileAccess.file_exists(test_config_path):
		DirAccess.remove_absolute(absolute_path)

	var title_scene = load("res://scenes/title_screen.tscn")
	var first_visit = title_scene.instantiate()
	first_visit.intro_seen_path = test_config_path
	add_child(first_visit)
	assert(first_visit.intro_active, "A first visit should start the archive intro")
	first_visit.skip_intro()
	assert(not first_visit.intro_active, "Space/tap skip should finish the intro")
	await get_tree().process_frame
	assert(FileAccess.file_exists(test_config_path), "Finishing the intro should save the seen state")

	var returning_visit = title_scene.instantiate()
	returning_visit.intro_seen_path = test_config_path
	add_child(returning_visit)
	assert(not returning_visit.intro_active, "A returning visit should bypass the intro")
	returning_visit.queue_free()
	first_visit.queue_free()
	await get_tree().process_frame
	DirAccess.remove_absolute(absolute_path)
	get_tree().quit(0)
