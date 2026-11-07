extends Node2D

const ArenaMechanismScript = preload("res://scripts/arena_interactable.gd")

@onready var wave_manager = $WaveManager
@onready var hud = $HUD
@onready var shop_ui = $ShopLayer/ShopUI
@onready var game_over_layer = $GameOverLayer
@onready var game_over_panel = $GameOverLayer/GameOverPanel
@onready var game_over_title: Label = $GameOverLayer/GameOverPanel/Title
@onready var game_over_summary = $GameOverLayer/GameOverPanel/SummaryLabel
@onready var restart_button = $GameOverLayer/GameOverPanel/RestartButton
@onready var title_layer = $TitleLayer
@onready var title_screen = $TitleLayer/TitleScreen
@onready var player = $Player
@onready var arena_floor = $Floor
@onready var arena_frame = $ArenaFrame
@onready var audio_manager = $AudioManager
@onready var leaderboard_panel = $LeaderboardPanel
@onready var leaderboard_button: Button = $GameOverLayer/GameOverPanel/LeaderboardButton
@onready var center_rune = $DecorativeProps/CenterRune
@onready var floating_texts = $FloatingTexts

var _run_started_at_msec: int = 0
var _latest_run_result: Dictionary = {}
@onready var floor_rect = $Floor

var auto_run_countdown: float = -1.0
var current_biome_index: int = -1
var arena_mechanisms: Array = []

var biome_data = [
	{
		"name": "Büyük Akademi Kütüphanesi (Grand Academy Library)",
		"desc": "Kadim parşömenler ve ahşap salonlar arasında dil hatalarıyla yüzleş!",
		"texture": "res://assets/sprites/tile_library_parquet.png",
		"tint": Color(1.0, 0.96, 0.88),
		"rune": "res://assets/sprites/magical_rune_cyan.png"
	},
	{
		"name": "Zindan Taş Mahzeni (Dungeon Stone Crypt)",
		"desc": "Grammer canavarlarının gizlendiği soğuk taş zindanlar!",
		"texture": "res://assets/sprites/tile_dungeon_stone.png",
		"tint": Color(0.85, 0.95, 1.0),
		"rune": "res://assets/sprites/magical_rune_cyan.png"
	},
	{
		"name": "Astral Gözlemevi (Astral Observatory)",
		"desc": "Yıldızların ve kozmik kelimelerin parıldadığı göksel kule!",
		"texture": "res://assets/sprites/tile_astral_observatory.png",
		"tint": Color(0.92, 0.85, 1.0),
		"rune": "res://assets/sprites/magical_rune_astral.png"
	},
	{
		"name": "Karanlık Boşluk Mabedi (Void Sanctum)",
		"desc": "Overlord Ejderhası'nın hüküm sürdüğü nihai leksikon arenası!",
		"texture": "res://assets/sprites/tile_void_sanctum.png",
		"tint": Color(1.0, 0.85, 0.85),
		"rune": "res://assets/sprites/magical_rune_void.png"
	}
]

func _ready():
	process_mode = Node.PROCESS_MODE_PAUSABLE
	# The scene-specific frame contains its own coherent, non-repeating floor.
	arena_floor.hide()
	game_over_layer.hide()
	shop_ui.hide()
	_create_arena_mechanisms()

	wave_manager.wave_timer_updated.connect(_on_wave_timer_updated)
	wave_manager.wave_finished.connect(_on_wave_finished)
	wave_manager.wave_started.connect(_on_wave_started)
	hud.arena_interaction_requested.connect(interact_with_nearby_arena_mechanism)
	shop_ui.shop_closed.connect(_on_shop_closed)
	StatsManager.player_died.connect(_on_player_died)
	StatsManager.floating_text_requested.connect(_on_floating_text_requested)
	restart_button.pressed.connect(_on_restart_pressed)
	leaderboard_button.pressed.connect(_open_run_leaderboard)

	if title_screen:
		title_screen.game_started.connect(_on_title_game_started)
		title_screen.leaderboard_requested.connect(_open_title_leaderboard)
		get_tree().paused = true
		title_layer.show()
	else:
		start_game()

func _process(delta: float):
	_refresh_arena_interaction()
	if center_rune:
		center_rune.rotation += delta * 0.35

	if auto_run_countdown > 0:
		auto_run_countdown -= delta
		if restart_button:
			restart_button.text = "Tekrar Dene ↺ (" + str(int(ceil(max(0.0, auto_run_countdown)))) + "s)"
		if auto_run_countdown <= 0:
			_on_restart_pressed()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_R:
		if interact_with_nearby_arena_mechanism():
			get_viewport().set_input_as_handled()

func _create_arena_mechanisms() -> void:
	var prop_root: Node2D = $DecorativeProps
	var definitions := [
		{"id": "ink_well", "name": "Mürekkep Kuyusu", "hint": "CANINI TAZELE", "position": Vector2(-420, -230), "color": Color("78d6c7")},
		{"id": "resonance_bell", "name": "Arşiv Çanı", "hint": "YAKINDAKİLERİ SAVUR", "position": Vector2(420, -230), "color": Color("e5c477")},
		{"id": "astral_astrolabe", "name": "Yıldız Astrolabı", "hint": "GADGET + KALKAN", "position": Vector2(0, 420), "color": Color("b9a2fa")}
	]
	for definition in definitions:
		var mechanism = ArenaMechanismScript.new()
		mechanism.mechanism_id = definition["id"]
		mechanism.display_name = definition["name"]
		mechanism.action_hint = definition["hint"]
		mechanism.accent = definition["color"]
		mechanism.position = definition["position"]
		mechanism.add_to_group("arena_interactables")
		prop_root.add_child(mechanism)
		arena_mechanisms.append(mechanism)

func _get_nearby_arena_mechanism() -> Node2D:
	if not wave_manager.is_wave_active or hud.inventory_open or title_layer.visible or shop_ui.visible:
		return null
	var nearest: Node2D = null
	var nearest_distance := 106.0
	for mechanism in arena_mechanisms:
		if not is_instance_valid(mechanism) or mechanism.used_this_wave:
			continue
		if mechanism.mechanism_id == "ink_well" and StatsManager.hp >= StatsManager.max_hp - 0.5:
			continue
		if mechanism.mechanism_id == "astral_astrolabe" and player.gadget_timer <= 0.0 and player.shield_charges >= 3:
			continue
		var distance: float = player.global_position.distance_to(mechanism.global_position)
		if distance <= nearest_distance:
			nearest = mechanism
			nearest_distance = distance
	return nearest

func _refresh_arena_interaction() -> void:
	var mechanism := _get_nearby_arena_mechanism()
	if mechanism:
		hud.set_arena_interaction_prompt(mechanism.display_name + "  ·  " + mechanism.action_hint)
	else:
		hud.set_arena_interaction_prompt("")

func interact_with_nearby_arena_mechanism() -> bool:
	var mechanism := _get_nearby_arena_mechanism()
	if not mechanism:
		return false
	match mechanism.mechanism_id:
		"ink_well":
			if StatsManager.hp >= StatsManager.max_hp:
				return false
			StatsManager.heal(StatsManager.max_hp * 0.18)
			if StatsManager.hp <= 0.0:
				return false
			audio_manager.play_effect("heal")
		"resonance_bell":
			var affected := 0
			for enemy in get_tree().get_nodes_in_group("enemies"):
				if not is_instance_valid(enemy) or enemy.global_position.distance_to(player.global_position) > 360.0:
					continue
				var push: Vector2 = (enemy.global_position - player.global_position).normalized()
				enemy.knockback = push * (100.0 if enemy.is_milestone_boss else 300.0)
				enemy.apply_stun(1.68 if enemy.is_milestone_boss else 1.15)
				affected += 1
			if affected == 0:
				return false
			StatsManager.trigger_screen_shake(0.12, 2.2)
			audio_manager.play_effect("resonance_bell")
		"astral_astrolabe":
			player.gadget_timer = 0.0
			player.shield_charges = mini(3, player.shield_charges + 1)
			player.shield_health = float(player.shield_charges)
			player.shield_timer = maxf(player.shield_timer, 9.0)
			player.emit_signal("gadget_cooldown_updated", 0.0, player.gadget_cooldown)
			StatsManager.add_floating_text(player.global_position + Vector2(0, -48), "GADGET + KALKAN", Color("c5adff"), 15)
	mechanism.mark_used()
	_refresh_arena_interaction()
	return true

func _on_wave_started(wave_number: int):
	for mechanism in arena_mechanisms:
		mechanism.reset_for_wave()
	_refresh_arena_interaction()
	update_biome(wave_number)
	if StatsManager.selected_character == "lexicon_alchemist":
		StatsManager.add_ink(10)
	var stage_index = 0 if wave_number < 26 else (1 if wave_number < 51 else (2 if wave_number < 76 else 3))
	arena_frame.set_stage(stage_index)
	if audio_manager and audio_manager.has_method("set_biome"):
		audio_manager.set_biome(stage_index, wave_number % 5 == 0)
	if wave_number in [1, 26, 51, 76] and hud.has_method("show_arena_transition"):
		hud.show_arena_transition(stage_index)

func update_biome(wave: int):
	var b_idx = 0
	if wave >= 76:
		b_idx = 3
	elif wave >= 51:
		b_idx = 2
	elif wave >= 26:
		b_idx = 1
	else:
		b_idx = 0

	if b_idx != current_biome_index:
		current_biome_index = b_idx
		var b = biome_data[b_idx]
		if floor_rect and ResourceLoader.exists(b["texture"]):
			floor_rect.texture = load(b["texture"])
			floor_rect.modulate = b["tint"]
		if center_rune and ResourceLoader.exists(b["rune"]):
			center_rune.texture = load(b["rune"])
		StatsManager.trigger_tactical_alert("BÖLGE GÜNCELLENDİ: " + b["name"], b["desc"])

func _on_floating_text_requested(pos: Vector2, text: String, color: Color, size: int):
	var lbl = Label.new()
	lbl.text = text
	lbl.global_position = pos + Vector2(-40, -10)
	lbl.modulate = color
	lbl.add_theme_font_size_override("font_size", size)
	lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	lbl.add_theme_constant_override("outline_size", 4)

	var parent_node = floating_texts if floating_texts else self
	parent_node.add_child(lbl)

	var tw = create_tween()
	tw.tween_property(lbl, "global_position:y", pos.y - 45.0, 0.7).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(lbl, "modulate:a", 0.0, 0.7).set_delay(0.2)
	tw.tween_callback(lbl.queue_free)

func _on_title_game_started():
	title_layer.hide()
	start_game()

func start_game():
	if is_inside_tree():
		get_tree().paused = false
	StatsManager.reset()
	_run_started_at_msec = Time.get_ticks_msec()
	_latest_run_result.clear()
	game_over_layer.hide()
	shop_ui.hide()
	auto_run_countdown = -1.0
	current_biome_index = -1
	if player:
		player.apply_character_appearance()
		player.sync_weapons()
	if hud and hud.has_method("update_info_row"):
		hud.update_info_row()
	wave_manager.start_wave()

func _on_wave_timer_updated(time_left: float):
	hud.update_timer(time_left, StatsManager.current_wave)

func _on_wave_finished():
	if is_inside_tree():
		get_tree().paused = true
	var wave_number := StatsManager.current_wave
	if wave_number % 5 == 0:
		if audio_manager and audio_manager.has_method("play_effect"):
			audio_manager.play_effect("chapter_transition")
		await hud.play_story_intermission(wave_number)
	if wave_number >= StatsManager.max_waves:
		_on_run_victory()
	else:
		shop_ui.open_shop()

func _on_run_victory() -> void:
	if is_inside_tree():
		get_tree().paused = true
	shop_ui.hide()
	game_over_title.text = "ARŞİVİN YENİ SONU"
	var elapsed := maxi(1000, Time.get_ticks_msec() - _run_started_at_msec)
	_latest_run_result = {
		"submissionId": LeaderboardClient.create_submission_id(),
		"alias": LeaderboardClient.get_saved_alias(),
		"wavesCleared": StatsManager.max_waves,
		"kills": StatsManager.kill_count,
		"elapsedMs": elapsed,
		"characterId": StatsManager.selected_character,
		"difficultyId": StatsManager.difficulty
	}
	var alias := str(_latest_run_result.get("alias", "Oyuncu"))
	LeaderboardClient.save_local_result(_latest_run_result, alias if not alias.is_empty() else "Oyuncu")
	game_over_summary.text = "100 DALGA TAMAMLANDI\n\n" + str(StatsManager.characters.get(StatsManager.selected_character, {}).get("name", "Kâşif")) + " kendi sonunu seçti.\n" + str(StatsManager.kill_count) + " boss ve yaratık yenildi."
	game_over_layer.show()

func _on_shop_closed():
	if is_inside_tree():
		get_tree().paused = false
	wave_manager.start_wave()

func _on_player_died():
	if game_over_layer.visible:
		return
	game_over_title.text = "KİTAP KAPANDI"
	if is_inside_tree():
		get_tree().paused = true
	game_over_layer.show()
	_latest_run_result = {
		"submissionId": LeaderboardClient.create_submission_id(),
		"alias": LeaderboardClient.get_saved_alias(),
		"wavesCleared": maxi(0, StatsManager.current_wave - 1),
		"kills": maxi(0, StatsManager.kill_count),
		"elapsedMs": maxi(1000, Time.get_ticks_msec() - _run_started_at_msec),
		"characterId": StatsManager.selected_character,
		"difficultyId": StatsManager.difficulty
	}
	LeaderboardClient.save_local_result(_latest_run_result, str(_latest_run_result.get("alias", "Oyuncu")) if not str(_latest_run_result.get("alias", "")).is_empty() else "Oyuncu")

	if StatsManager.auto_new_run:
		auto_run_countdown = 5.0
	else:
		auto_run_countdown = -1.0
		if restart_button:
			restart_button.text = "Tekrar Dene ↺"

	var words_list = ""
	if StatsManager.words_learned.is_empty():
		words_list = "Henüz kelime öğrenilemedi."
	else:
		words_list = ", ".join(StatsManager.words_learned)

	var summary_text = "ÖĞRENİLEN KELİMELER  ·  " + str(StatsManager.words_learned.size()) + "\n"
	summary_text += words_list + "\n\n"
	summary_text += "KARAKTER  ·  " + StatsManager.characters.get(StatsManager.selected_character, {}).get("name", "Inky") + "\n"
	var difficulty_labels = {"easy": "A1–A2", "normal": "B1", "hard": "B2–C1"}
	summary_text += "SEVİYE  ·  " + difficulty_labels.get(StatsManager.difficulty, "B1") + "\n"
	summary_text += "ULAŞILAN DALGA  ·  " + str(StatsManager.current_wave) + "\n"
	summary_text += "YOK EDİLEN DÜŞMAN  ·  " + str(StatsManager.kill_count) + "\n"
	summary_text += "KAZANILAN MÜREKKEP  ·  " + str(StatsManager.ink_count)

	game_over_summary.text = summary_text

func _open_title_leaderboard() -> void:
	leaderboard_panel.open_board()

func _open_run_leaderboard() -> void:
	leaderboard_panel.open_board(_latest_run_result)

func _on_restart_pressed():
	get_tree().paused = false
	get_tree().reload_current_scene()
