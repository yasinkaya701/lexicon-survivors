extends Node2D

@onready var wave_manager = $WaveManager
@onready var hud = $HUD
@onready var shop_ui = $ShopLayer/ShopUI
@onready var game_over_layer = $GameOverLayer
@onready var game_over_panel = $GameOverLayer/GameOverPanel
@onready var game_over_summary = $GameOverLayer/GameOverPanel/SummaryLabel
@onready var restart_button = $GameOverLayer/GameOverPanel/RestartButton
@onready var main_menu_button = $GameOverLayer/GameOverPanel/MainMenuButton
@onready var title_layer = $TitleLayer
@onready var title_screen = $TitleLayer/TitleScreen
@onready var player = $Player
@onready var floor_rect = $Floor
@onready var center_rune = $DecorativeProps/CenterRune
@onready var floating_texts = $FloatingTexts

var auto_run_countdown: float = -1.0
var current_biome_index: int = -1

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
	process_mode = Node.PROCESS_MODE_ALWAYS
	game_over_layer.hide()
	shop_ui.hide()
	
	wave_manager.wave_timer_updated.connect(_on_wave_timer_updated)
	wave_manager.wave_finished.connect(_on_wave_finished)
	wave_manager.wave_started.connect(_on_wave_started)
	shop_ui.shop_closed.connect(_on_shop_closed)
	StatsManager.player_died.connect(_on_player_died)
	StatsManager.floating_text_requested.connect(_on_floating_text_requested)
	restart_button.pressed.connect(_on_restart_pressed)
	if main_menu_button:
		main_menu_button.pressed.connect(_on_main_menu_pressed)
	
	if title_screen:
		title_screen.game_started.connect(_on_title_game_started)
		get_tree().paused = true
		title_layer.show()
	else:
		start_game()

func _process(delta: float):
	if center_rune:
		center_rune.rotation += delta * 0.35
		
	if auto_run_countdown > 0:
		auto_run_countdown -= delta
		if restart_button:
			restart_button.text = "Tekrar Dene ↺ (" + str(int(ceil(max(0.0, auto_run_countdown)))) + "s)"
		if auto_run_countdown <= 0:
			_on_restart_pressed()

func _on_wave_started(wave_number: int):
	update_biome(wave_number)

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
	lbl.theme_override_font_sizes.font_size = size
	lbl.theme_override_colors.font_outline_color = Color(0, 0, 0, 0.9)
	lbl.theme_override_constants.outline_size = 4
	
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
	shop_ui.open_shop()

func _on_shop_closed():
	if is_inside_tree():
		get_tree().paused = false
	wave_manager.start_wave()

func _on_player_died():
	if is_inside_tree():
		get_tree().paused = true
	game_over_layer.show()
	
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
		
	var summary_text = "Öğrenilen Kelimeler (" + str(StatsManager.words_learned.size()) + "):\n"
	summary_text += words_list + "\n\n"
	summary_text += "Seçilen Karakter: " + StatsManager.characters.get(StatsManager.selected_character, {}).get("name", "Inky") + "\n"
	summary_text += "Zorluk: " + StatsManager.difficulties.get(StatsManager.difficulty, {}).get("name", "Orta") + "\n"
	summary_text += "Ulaşılan Dalga: " + str(StatsManager.current_wave) + "\n"
	summary_text += "Yok Edilen Dil Hataları: " + str(StatsManager.kill_count) + "\n"
	summary_text += "Kazanılan Mürekkep: " + str(StatsManager.ink_count)
	
	game_over_summary.text = summary_text

func _on_restart_pressed():
	get_tree().paused = false
	get_tree().reload_current_scene()

func _on_main_menu_pressed():
	auto_run_countdown = -1.0
	get_tree().paused = false
	StatsManager.reset()
	game_over_layer.hide()
	if title_screen:
		title_layer.show()
	else:
		get_tree().reload_current_scene()
