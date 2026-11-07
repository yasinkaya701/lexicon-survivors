extends CanvasLayer

signal story_continued
signal arena_interaction_requested

@onready var hp_bar = $MarginContainer/VBox/TopRow/HealthBar
@onready var hp_label = $MarginContainer/VBox/TopRow/HealthBar/HPLabel
@onready var timer_label = $MarginContainer/VBox/TopRow/TimerLabel
@onready var ink_label = $MarginContainer/VBox/TopRow/InkStat/InkLabel
@onready var kill_label = $MarginContainer/VBox/TopRow/KillStat/KillLabel
@onready var char_diff_label = $MarginContainer/VBox/InfoRow/CharDiffLabel
@onready var weapons_label = $MarginContainer/VBox/InfoRow/WeaponsLabel

# Controls Row
@onready var speed_btn = $MarginContainer/VBox/ControlsRow/SpeedButton
@onready var auto_tur_btn = $MarginContainer/VBox/ControlsRow/AutoTurButton
@onready var auto_run_btn = $MarginContainer/VBox/ControlsRow/AutoRunButton
@onready var mistakes_btn = $MarginContainer/VBox/ControlsRow/MistakesButton

# Panels & Banners
@onready var gadget_status = $GadgetPanel/HBox/GadgetStatus
@onready var gadget_name = $GadgetPanel/HBox/GadgetName
@onready var gadget_glyph = $GadgetPanel/HBox/GadgetGlyph
@onready var banner = $SynergyBanner
@onready var banner_title = $SynergyBanner/Title
@onready var banner_desc = $SynergyBanner/Desc
@onready var chapter_card = $ChapterCard
@onready var chapter_kicker = $ChapterCard/Kicker
@onready var chapter_number = $ChapterCard/ChapterNumber
@onready var chapter_title = $ChapterCard/ChapterTitle
@onready var chapter_desc = $ChapterCard/ChapterDesc
@onready var chapter_accent = $ChapterCard/Accent
@onready var touch_controls: Control = $TouchControls
@onready var touch_stick: TouchStick = $TouchStick
@onready var gadget_touch_button: Button = $TouchControls/ActionRow/GadgetTouchButton
@onready var arena_interaction_button: Button = $ArenaInteractButton
@onready var inventory_overlay: Control = $InventoryOverlay
@onready var inventory_title: Label = $InventoryOverlay/InventoryPanel/InventoryLayout/InventoryHeader/InventoryTitle
@onready var inventory_items: VBoxContainer = $InventoryOverlay/InventoryPanel/InventoryLayout/InventoryScroll/InventoryItems
@onready var inventory_weapons_tab: Button = $InventoryOverlay/InventoryPanel/InventoryLayout/InventoryTabs/WeaponsTab
@onready var inventory_gadgets_tab: Button = $InventoryOverlay/InventoryPanel/InventoryLayout/InventoryTabs/GadgetsTab
@onready var inventory_close_button: Button = $InventoryOverlay/InventoryPanel/InventoryLayout/InventoryHeader/InventoryCloseButton
@onready var tactical_banner = $TacticalBanner
@onready var tactical_title = $TacticalBanner/Title
@onready var tactical_desc = $TacticalBanner/Desc
@onready var mistakes_modal = $MistakesModal
@onready var mistakes_list = $MistakesModal/Panel/Scroll/List
@onready var mistakes_close_btn = $MistakesModal/Panel/CloseBtn

var banner_timer: float = 0.0
var chapter_timer: float = 0.0
var tactical_timer: float = 0.0
var inventory_open: bool = false
var inventory_category: String = "weapons"
var _touch_ui_override: bool = false
var _has_touch_ui_override: bool = false
var _story_overlay: Control
var _story_title: Label
var _story_copy: Label
var _story_kicker: Label
var _story_location: Label
var _story_scene_image: TextureRect
var _story_scene_caption: Label
var _story_actor: TextureRect
var _story_speaker: Label
var _story_counter: Label
var _story_memory: Label
var _story_memory_icon: TextureRect
var _story_next_button: Button
var _story_skip_button: Button
var _story_data: Dictionary = {}
var _story_expansion: Dictionary = {}
var _story_active: bool = false
var _story_episode_index: int = -1
var _story_panel_index: int = 0
var _story_pending_wave: int = 0

const CHAPTERS = [
	{"title": "KARANLIK KÜTÜPHANE", "kicker": "BÖLÜM I  ·  DALGALAR 01–25", "narration": "Kayıp kelimeleri rafların arasından geri çağır.", "accent": "c5aa72"},
	{"title": "SÖZ DEHLİZİ", "kicker": "BÖLÜM II  ·  DALGALAR 26–50", "narration": "Taş kapı açılır; duvarlardaki yanlış kelimeler uyanır.", "accent": "99a99d"},
	{"title": "ASTRAL GÖZLEMEVİ", "kicker": "BÖLÜM III  ·  DALGALAR 51–75", "narration": "Dehlizin son kapısı açılır; yıldızlar yeni sözcükler dizer.", "accent": "9baad1"},
	{"title": "SON SAYFA", "kicker": "BÖLÜM IV  ·  DALGALAR 76–100", "narration": "Kitap kapanır; boşlukta son kelimeler uyanır.", "accent": "bd91b7"}
]

func _ready():
	add_to_group("hud")
	banner.hide()
	chapter_card.hide()
	inventory_overlay.hide()
	mistakes_modal.hide()
	tactical_banner.hide()
	touch_controls.visible = DisplayServer.is_touchscreen_available()
	touch_stick.visible = touch_controls.visible
	gadget_touch_button.pressed.connect(activate_gadget_touch)
	arena_interaction_button.pressed.connect(func(): arena_interaction_requested.emit())
	$TouchControls/ActionRow/WeaponTouchButton.pressed.connect(StatsManager.switch_next_weapon)
	$TouchControls/ActionRow/InventoryTouchButton.pressed.connect(toggle_inventory)
	speed_btn.icon = load("res://assets/ui/icons/speed.svg")
	mistakes_btn.icon = load("res://assets/ui/icons/corrections.svg")
	inventory_close_button.pressed.connect(func(): set_inventory_open(false))
	inventory_weapons_tab.pressed.connect(func(): _set_inventory_category("weapons"))
	inventory_gadgets_tab.pressed.connect(func(): _set_inventory_category("gadgets"))
	_apply_touch_safe_area()
	_load_story_arc()
	_build_story_intermission()
	StatsManager.hp_changed.connect(_on_hp_changed)
	StatsManager.ink_changed.connect(_on_ink_changed)
	StatsManager.kill_count_changed.connect(_on_kill_changed)
	StatsManager.synergy_activated.connect(_on_synergy_activated)
	StatsManager.weapon_equipped.connect(_on_weapon_equipped)
	StatsManager.weapon_switched.connect(_on_weapon_switched)
	StatsManager.character_selected.connect(_on_character_changed)
	StatsManager.difficulty_selected.connect(_on_difficulty_changed)
	StatsManager.gadget_switched.connect(_on_gadget_switched)
	StatsManager.game_speed_changed.connect(_on_game_speed_changed)
	StatsManager.auto_new_tur_changed.connect(_on_auto_new_tur_changed)
	StatsManager.auto_new_run_changed.connect(_on_auto_new_run_changed)
	StatsManager.tactical_alert_requested.connect(_on_tactical_alert_requested)
	StatsManager.mistakes_updated.connect(update_mistakes_button_text)

	speed_btn.pressed.connect(_on_speed_btn_pressed)
	auto_tur_btn.pressed.connect(_on_auto_tur_btn_pressed)
	auto_run_btn.pressed.connect(_on_auto_run_btn_pressed)
	mistakes_btn.pressed.connect(open_mistakes_modal)
	mistakes_close_btn.pressed.connect(func(): mistakes_modal.hide())
	_on_hp_changed(StatsManager.hp, StatsManager.max_hp)
	_on_ink_changed(StatsManager.ink_count)
	_on_kill_changed(StatsManager.kill_count)
	_on_gadget_switched(StatsManager.active_gadget)
	_on_game_speed_changed(StatsManager.game_speed)
	_on_auto_new_tur_changed(StatsManager.auto_new_tur)
	_on_auto_new_run_changed(StatsManager.auto_new_run)
	update_mistakes_button_text()
	update_info_row()

	# Connect player gadget cooldown if player exists
	var players = get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		var p = players[0]
		if p.has_signal("gadget_cooldown_updated"):
			p.gadget_cooldown_updated.connect(update_gadget)
		if p.gadget_timer > 0.0:
			update_gadget(p.gadget_timer, p.gadget_cooldown)

func set_touch_ui_enabled_override(enabled: bool) -> void:
	_has_touch_ui_override = true
	_touch_ui_override = enabled
	_sync_touch_controls()

func _sync_touch_controls() -> void:
	if is_node_ready():
		touch_controls.visible = _touch_ui_override if _has_touch_ui_override else DisplayServer.is_touchscreen_available()
		touch_stick.visible = touch_controls.visible
		if not touch_controls.visible:
			touch_stick.reset()

func _apply_touch_safe_area() -> void:
	var screen := DisplayServer.window_get_current_screen()
	var screen_size := DisplayServer.screen_get_size(screen)
	if screen_size.x <= 0 or screen_size.y <= 0:
		return
	var safe_rect := DisplayServer.get_display_safe_area()
	var viewport_size := get_viewport().get_visible_rect().size
	var left_inset := maxf(0.0, float(safe_rect.position.x)) * viewport_size.x / float(screen_size.x)
	var right_inset := maxf(0.0, float(screen_size.x - safe_rect.end.x)) * viewport_size.x / float(screen_size.x)
	var bottom_inset := maxf(0.0, float(screen_size.y - safe_rect.end.y)) * viewport_size.y / float(screen_size.y)
	_apply_touch_safe_area_insets(right_inset, bottom_inset, left_inset)

func _apply_touch_safe_area_insets(right_inset: float, bottom_inset: float, left_inset: float = 0.0) -> void:
	touch_controls.offset_left = -306.0 - right_inset
	touch_controls.offset_right = -24.0 - right_inset
	touch_controls.offset_top = -88.0 - bottom_inset
	touch_controls.offset_bottom = -24.0 - bottom_inset
	touch_stick.offset_left = 24.0 + left_inset
	touch_stick.offset_right = 180.0 + left_inset
	touch_stick.offset_top = -168.0 - bottom_inset
	touch_stick.offset_bottom = -24.0 - bottom_inset

func _build_story_intermission() -> void:
	_story_overlay = Control.new()
	_story_overlay.name = "StoryIntermission"
	_story_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_story_overlay.process_mode = Node.PROCESS_MODE_ALWAYS
	_story_overlay.z_index = 180
	_story_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	_story_overlay.hide()
	add_child(_story_overlay)
	var shade := ColorRect.new()
	shade.color = Color(0.025, 0.04, 0.033, 0.94)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_STOP
	_story_overlay.add_child(shade)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.offset_left = 20
	center.offset_right = -20
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_story_overlay.add_child(center)
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(minf(900.0, get_viewport().get_visible_rect().size.x - 48.0), minf(640.0, get_viewport().get_visible_rect().size.y - 48.0))
	panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#1d2520")
	style.border_color = Color("#a78d5c")
	style.set_border_width_all(1)
	style.set_content_margin_all(16)
	panel.add_theme_stylebox_override("panel", style)
	center.add_child(panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 13)
	panel.add_child(column)
	_story_kicker = Label.new()
	_story_kicker.add_theme_color_override("font_color", Color("#c5aa72"))
	_story_kicker.add_theme_font_size_override("font_size", 12)
	column.add_child(_story_kicker)
	_story_location = Label.new()
	_story_location.add_theme_color_override("font_color", Color("#a9b6aa"))
	_story_location.add_theme_font_size_override("font_size", 11)
	column.add_child(_story_location)
	_story_title = Label.new()
	_story_title.add_theme_color_override("font_color", Color("#f0ede3"))
	_story_title.add_theme_font_size_override("font_size", 23)
	_story_title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(_story_title)
	var scene := Control.new()
	var story_viewport := get_viewport().get_visible_rect().size
	scene.custom_minimum_size = Vector2(minf(600, story_viewport.x - 80), minf(360, story_viewport.y * 0.46))
	scene.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_child(scene)
	_story_scene_image = TextureRect.new()
	_story_scene_image.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_story_scene_image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_story_scene_image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	_story_scene_image.mouse_filter = Control.MOUSE_FILTER_IGNORE
	scene.add_child(_story_scene_image)
	var scene_shade := ColorRect.new()
	scene_shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	scene_shade.color = Color(0.02, 0.03, 0.025, 0.20)
	scene_shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	scene.add_child(scene_shade)
	_story_scene_caption = Label.new()
	_story_scene_caption.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	_story_scene_caption.position = Vector2(12, 10)
	_story_scene_caption.size = Vector2(440, 58)
	_story_scene_caption.add_theme_color_override("font_color", Color("#eee8d7"))
	_story_scene_caption.add_theme_font_size_override("font_size", 12)
	_story_scene_caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_story_scene_caption.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.85))
	_story_scene_caption.add_theme_constant_override("shadow_offset_x", 1)
	_story_scene_caption.add_theme_constant_override("shadow_offset_y", 1)
	_story_scene_caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	scene.add_child(_story_scene_caption)
	_story_actor = TextureRect.new()
	_story_actor.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	_story_actor.offset_left = -208
	_story_actor.offset_top = -244
	_story_actor.offset_right = -12
	_story_actor.offset_bottom = -6
	_story_actor.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_story_actor.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_story_actor.mouse_filter = Control.MOUSE_FILTER_IGNORE
	scene.add_child(_story_actor)
	var dialogue := PanelContainer.new()
	dialogue.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	dialogue.offset_left = 12
	dialogue.offset_right = -12
	dialogue.offset_top = -116
	dialogue.offset_bottom = -12
	var dialogue_style := StyleBoxFlat.new()
	dialogue_style.bg_color = Color(0.055, 0.08, 0.065, 0.95)
	dialogue_style.border_color = Color("#c8b278")
	dialogue_style.set_border_width_all(1)
	dialogue_style.set_content_margin_all(12)
	dialogue.add_theme_stylebox_override("panel", dialogue_style)
	scene.add_child(dialogue)
	var dialogue_column := VBoxContainer.new()
	dialogue_column.add_theme_constant_override("separation", 4)
	dialogue.add_child(dialogue_column)
	_story_speaker = Label.new()
	_story_speaker.add_theme_color_override("font_color", Color("#d8c895"))
	_story_speaker.add_theme_font_size_override("font_size", 11)
	dialogue_column.add_child(_story_speaker)
	_story_copy = Label.new()
	_story_copy.add_theme_color_override("font_color", Color("#c7cec5"))
	_story_copy.add_theme_font_size_override("font_size", 16)
	_story_copy.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_story_copy.custom_minimum_size.y = 48
	dialogue_column.add_child(_story_copy)
	var memory_row := HBoxContainer.new()
	memory_row.add_theme_constant_override("separation", 10)
	column.add_child(memory_row)
	_story_memory_icon = TextureRect.new()
	_story_memory_icon.custom_minimum_size = Vector2(40, 40)
	_story_memory_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_story_memory_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	memory_row.add_child(_story_memory_icon)
	_story_memory = Label.new()
	_story_memory.add_theme_color_override("font_color", Color("#e3c98c"))
	_story_memory.add_theme_font_size_override("font_size", 12)
	_story_memory.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_story_memory.hide()
	_story_memory.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	memory_row.add_child(_story_memory)
	memory_row.hide()
	var controls: BoxContainer
	if story_viewport.x < 720:
		controls = VBoxContainer.new()
		controls.add_theme_constant_override("separation", 6)
	else:
		controls = HBoxContainer.new()
	controls.add_theme_constant_override("separation", 10)
	controls.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_child(controls)
	_story_next_button = Button.new()
	_story_next_button.text = "ENTER · SONRAKİ KARE"
	_story_next_button.custom_minimum_size = Vector2(minf(220, story_viewport.x - 96), 42)
	_story_next_button.pressed.connect(_advance_story_panel)
	controls.add_child(_story_next_button)
	_story_skip_button = Button.new()
	_story_skip_button.text = "HİKÂYEYİ ATLA"
	_story_skip_button.custom_minimum_size = Vector2(150, 42)
	_story_skip_button.pressed.connect(_finish_story_intermission)
	controls.add_child(_story_skip_button)
	_story_counter = Label.new()
	_story_counter.add_theme_color_override("font_color", Color("#c7cec5"))
	_story_counter.add_theme_font_size_override("font_size", 12)
	controls.add_child(_story_counter)

func _load_story_arc() -> void:
	var file := FileAccess.open("res://assets/data/story_arc.json", FileAccess.READ)
	if file == null:
		push_error("Story arc data is missing: res://assets/data/story_arc.json")
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary or int(parsed.get("version", 0)) != 2 or int(parsed.get("panel_count", 0)) != 5:
		push_error("Story arc data has an unsupported version or panel count")
		return
	var profiles: Dictionary = parsed.get("characters", {})
	if profiles.size() != 6:
		push_error("Story arc data needs six distinct character tracks")
		return
	for char_id in profiles:
		if profiles[char_id].get("episodes", []).size() != 20:
			push_error("Story arc has missing episodes for %s" % char_id)
			return
	_story_data = parsed
	var expansion_file := FileAccess.open("res://assets/data/story_expansion.json", FileAccess.READ)
	if expansion_file != null:
		var expansion_data: Variant = JSON.parse_string(expansion_file.get_as_text())
		if expansion_data is Dictionary and int(expansion_data.get("version", 0)) == 1 and expansion_data.get("boss_encounters", []) is Array and expansion_data.boss_encounters.size() == 20:
			_story_expansion = expansion_data
		else:
			push_error("Boss story data is invalid: res://assets/data/story_expansion.json")
	else:
		push_error("Boss story data is missing: res://assets/data/story_expansion.json")

func _render_story_panel() -> void:
	if _story_episode_index < 0 or _story_data.is_empty():
		return
	var char_id := StatsManager.selected_character
	var character: Dictionary = _story_data.get("characters", {}).get(char_id, {})
	var episodes: Array = character.get("episodes", [])
	if _story_episode_index >= episodes.size():
		return
	var episode: Dictionary = episodes[_story_episode_index]
	var beats: Array = episode.get("beats", [])
	if _story_panel_index >= beats.size():
		return
	var beat: Array = beats[_story_panel_index]
	var speaker_id := str(beat[0])
	var dialogue_text := str(beat[1])
	var boss_encounter := _get_story_boss(_story_pending_wave)
	if _story_panel_index == 0 and not boss_encounter.is_empty():
		speaker_id = str(boss_encounter.get("id", "boss_testimony"))
		dialogue_text = str(boss_encounter.get("dialogue", dialogue_text))
	var actor_path := _get_story_actor_path(speaker_id, char_id)
	_story_actor.texture = load(actor_path) if not actor_path.is_empty() else null
	_story_actor.visible = _story_actor.texture != null
	_story_kicker.text = "BOSS ARASI  ·  DALGA %02d  ·  %02d / 20" % [_story_pending_wave, _story_episode_index + 1]
	_story_location.text = str(episode.get("location", "Arşiv"))
	_story_title.text = str(episode.get("title", "Kayıp kayıt"))
	_story_scene_caption.text = str(episode.get("scene", ""))
	_story_speaker.text = _get_story_speaker_name(speaker_id, char_id)
	_story_copy.text = dialogue_text
	_story_counter.text = "%d / 5" % [_story_panel_index + 1]
	var panel_art: Array = episode.get("panel_art", [])
	var panel_path := str(panel_art[_story_panel_index]) if _story_panel_index < panel_art.size() else str(episode.get("backdrop", "story_library.png"))
	_story_scene_image.texture = load("res://assets/sprites/story/" + panel_path)
	var reward: Dictionary = episode.get("boss_reward", {}) if episode.get("boss_reward", null) is Dictionary else {}
	var show_reward := _story_panel_index == 4 and not reward.is_empty()
	(_story_memory.get_parent() as HBoxContainer).visible = show_reward
	if show_reward:
		var icon_path := str(reward.get("icon", "res://assets/sprites/story/memory_clue.svg"))
		if not icon_path.begins_with("res://"):
			icon_path = "res://" + icon_path
		_story_memory_icon.texture = load(icon_path)
		_story_memory.text = ("YADİGÂR" if reward.get("type") == "relic" else "BOSS ANI") + " · " + str(reward.get("name", "")) + "\n" + str(reward.get("description", ""))
	_story_next_button.text = "ENTER · %s" % ("SONU AÇ" if _story_pending_wave >= StatsManager.max_waves and _story_panel_index == 4 else ("DÜKKÂNA GEÇ" if _story_panel_index == 4 else "SONRAKİ KARE"))
func _get_story_speaker_name(speaker_id: String, char_id: String) -> String:
	if speaker_id in [char_id, "hero", "rune_sorceress", "lexicon_alchemist", "shadow_lexicographer", "quillmaster", "word_knight"]:
		return str(StatsManager.characters.get(char_id, {}).get("name", "Kâşif"))
	var names := {"caption": "SAHNE", "narrator": "SAHNE", "neris": "NERİS", "whisper": "BOŞ SAYFA", "blank_page": "BOŞ SAYFA", "mother_echo": "LALE'NİN YANKISI", "lio_echo": "LIO'NUN YANKISI", "shadow_double": "GÖLGE"}
	var wave_boss := _get_story_boss(_story_pending_wave)
	if str(wave_boss.get("id", "")) == speaker_id:
		return str(wave_boss.get("title", "BOSS"))
	for boss in _story_expansion.get("boss_encounters", []):
		if str(boss.get("id", "")) == speaker_id:
			return str(boss.get("title", "BOSS"))
	return str(names.get(speaker_id, speaker_id.replace("_", " ").to_upper()))

func _get_story_actor_path(speaker_id: String, char_id: String) -> String:
	var hero_sprites := {"inky":"hero_inky.png", "quillmaster":"hero_quillmaster.png", "word_knight":"hero_word_knight.png", "rune_sorceress":"hero_rune_sorceress.png", "lexicon_alchemist":"hero_alchemist.png", "shadow_lexicographer":"hero_shadow_scribe.png"}
	if speaker_id in [char_id, "hero"]:
		return "res://assets/sprites/upgrade_v1/" + str(hero_sprites.get(char_id, "hero_inky.png"))
	if speaker_id == "neris":
		return "res://assets/sprites/story/neris_portrait.png"
	if speaker_id.begins_with("boss_"):
		for boss in _story_expansion.get("boss_encounters", []):
			if str(boss.get("id", "")) == speaker_id:
				var portrait := str(boss.get("portrait_sprite", ""))
				if not portrait.is_empty():
					return "res://assets/sprites/" + portrait
		return "res://assets/sprites/upgrade_v2/boss_void_curator.png"
	if speaker_id in ["whisper", "blank_page"]:
		return "res://assets/sprites/upgrade_v2/boss_void_curator.png"
	if speaker_id == "shadow_double":
		return "res://assets/sprites/upgrade_v1/hero_shadow_scribe.png"
	return ""

func _get_story_boss(wave: int) -> Dictionary:
	for boss in _story_expansion.get("boss_encounters", []):
		if int(boss.get("wave", -1)) == wave:
			return boss
	return {}

func _advance_story_panel() -> void:
	if not _story_active:
		return
	if _story_panel_index >= 4:
		_finish_story_intermission()
		return
	_story_panel_index += 1
	_render_story_panel()
	_story_overlay.modulate.a = 0.0
	var reveal := create_tween()
	reveal.tween_property(_story_overlay, "modulate:a", 1.0, 0.18)

func _finish_story_intermission() -> void:
	if not _story_active:
		return
	var episodes: Array = _story_data.get("characters", {}).get(StatsManager.selected_character, {}).get("episodes", [])
	if _story_episode_index >= 0 and _story_episode_index < episodes.size():
		var episode: Dictionary = episodes[_story_episode_index]
		var reward: Variant = episode.get("boss_reward", null)
		if reward is Dictionary and reward.get("type") == "relic":
			StatsManager.grant_story_relic(reward)
	_story_active = false
	_story_overlay.hide()
	story_continued.emit()

func _input(event: InputEvent) -> void:
	if _story_active and event is InputEventKey and event.pressed and not event.echo:
		if event.keycode in [KEY_ENTER, KEY_KP_ENTER, KEY_SPACE, KEY_RIGHT]:
			_advance_story_panel()
		elif event.keycode == KEY_ESCAPE:
			_finish_story_intermission()
		get_viewport().set_input_as_handled()
		return
	if event is InputEventKey and event.pressed and not event.echo and inventory_open:
		if event.keycode in [KEY_ESCAPE, KEY_I, KEY_TAB]:
			set_inventory_open(false)
			get_viewport().set_input_as_handled()

func play_story_intermission(wave: int) -> void:
	if _story_data.is_empty():
		_load_story_arc()
	if _story_data.is_empty():
		return
	_story_pending_wave = wave
	_story_episode_index = clampi(wave / 5 - 1, 0, 19)
	_story_panel_index = 0
	_story_active = true
	_render_story_panel()
	_story_overlay.show()
	_story_overlay.modulate.a = 0.0
	_story_overlay.scale = Vector2(0.985, 0.985)
	var reveal := create_tween().set_parallel(true)
	reveal.tween_property(_story_overlay, "modulate:a", 1.0, 0.35)
	reveal.tween_property(_story_overlay, "scale", Vector2.ONE, 0.45).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	while _story_active:
		await story_continued

func get_touch_move_vector() -> Vector2:
	return touch_stick.vector if touch_stick.visible else Vector2.ZERO

func set_arena_interaction_prompt(label: String) -> void:
	var should_show := not label.is_empty() and not inventory_open and not _story_active
	if arena_interaction_button.visible != should_show:
		arena_interaction_button.visible = should_show
	if should_show:
		var button_text := "R  ·  " + label
		if arena_interaction_button.text != button_text:
			arena_interaction_button.text = button_text

func toggle_inventory() -> void:
	set_inventory_open(not inventory_open)

func set_inventory_open(open: bool) -> void:
	if open and get_tree().paused and not inventory_open:
		return
	inventory_open = open
	inventory_overlay.visible = open
	if open:
		touch_stick.reset()
		refresh_inventory()
	var player := get_tree().get_first_node_in_group("player")
	if player and player.has_method("set_inventory_input_blocked"):
		player.set_inventory_input_blocked(open)
	get_tree().paused = open
	if is_inside_tree():
		get_viewport().set_input_as_handled()

func _set_inventory_category(category: String) -> void:
	inventory_category = category
	refresh_inventory()

func refresh_inventory() -> void:
	if not is_node_ready():
		return
	for child in inventory_items.get_children():
		inventory_items.remove_child(child)
		child.queue_free()
	var ids: Array = StatsManager.equipped_weapons if inventory_category == "weapons" else StatsManager.owned_gadgets
	var catalog: Dictionary = StatsManager.weapons_catalog if inventory_category == "weapons" else StatsManager.gadgets_catalog
	inventory_title.text = "SİLAH YÜKÜ" if inventory_category == "weapons" else "GEREÇ ÇANTASI"
	for raw_id in ids:
		var item_id := str(raw_id)
		var item_kind := "weapon" if inventory_category == "weapons" else "gadget"
		var item_data: Dictionary = catalog.get(item_id, {})
		var selected := StatsManager.get_active_weapon_id() == item_id if inventory_category == "weapons" else StatsManager.active_gadget == item_id
		var item_name := str(item_data.get("name", item_id.replace("_", " ")))
		var button := Button.new()
		button.custom_minimum_size = Vector2(0, 54)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.text = ("SEÇİLİ  ·  " if selected else "") + item_name.to_upper()
		if item_kind == "gadget" and not str(item_data.get("icon", "")).is_empty():
			button.icon = load("res://" + str(item_data["icon"])) as Texture2D
			button.icon_alignment = HORIZONTAL_ALIGNMENT_LEFT
			button.expand_icon = true
		button.add_theme_font_size_override("font_size", 16)
		button.pressed.connect(func(): select_inventory_item(item_kind, item_id))
		inventory_items.add_child(button)
	if inventory_items.get_child_count() == 0:
		var empty_label := Label.new()
		empty_label.text = "Bu bölümde sahip olunan eşya yok."
		empty_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		inventory_items.add_child(empty_label)
	inventory_weapons_tab.disabled = inventory_category == "weapons"
	inventory_gadgets_tab.disabled = inventory_category == "gadgets"

func select_inventory_item(kind: String, item_id: String) -> bool:
	var selected := false
	if kind == "weapon":
		var index := StatsManager.equipped_weapons.find(item_id)
		if index >= 0:
			StatsManager.select_weapon_index(index)
			selected = true
	elif kind == "gadget":
		selected = StatsManager.select_gadget(item_id)
	if selected:
		refresh_inventory()
		set_inventory_open(false)
	return selected

func activate_gadget_touch() -> bool:
	var player := get_tree().get_first_node_in_group("player")
	if not player or not player.has_method("activate_active_gadget") or player.gadget_timer > 0.0:
		return false
	player.activate_active_gadget(player.get_gadget_direction())
	return true

func _process(delta: float):
	if chapter_timer > 0:
		chapter_timer -= delta
		if chapter_timer <= 0:
			chapter_card.hide()
	if banner_timer > 0:
		banner_timer -= delta
		if banner_timer <= 0:
			banner.hide()

	if tactical_timer > 0:
		tactical_timer -= delta
		if tactical_timer <= 0:
			tactical_banner.hide()

func _on_speed_btn_pressed():
	StatsManager.cycle_game_speed()

func _on_auto_tur_btn_pressed():
	StatsManager.toggle_auto_new_tur()

func _on_auto_run_btn_pressed():
	StatsManager.toggle_auto_new_run()

func _on_game_speed_changed(spd: float):
	if speed_btn:
		speed_btn.text = "Hız · " + str(spd) + "×"

func _on_auto_new_tur_changed(enabled: bool):
	if auto_tur_btn:
		auto_tur_btn.text = "Oto-Tur · " + ("Açık" if enabled else "Kapalı")
		auto_tur_btn.modulate = Color(0.4, 1.0, 0.5) if enabled else Color(0.8, 0.8, 0.8)

func _on_auto_new_run_changed(enabled: bool):
	if auto_run_btn:
		auto_run_btn.text = "Oto-Run · " + ("Açık" if enabled else "Kapalı")
		auto_run_btn.modulate = Color(0.4, 1.0, 0.5) if enabled else Color(0.8, 0.8, 0.8)

func update_mistakes_button_text():
	if mistakes_btn:
		var count = StatsManager.mistake_words.size()
		mistakes_btn.text = "Hatalar · " + str(count)

func open_mistakes_modal():
	mistakes_modal.show()
	for child in mistakes_list.get_children():
		child.queue_free()

	if StatsManager.mistake_words.is_empty():
		var empty_lbl = Label.new()
		empty_lbl.text = "Tebrikler! Hata defteriniz temiz.\nHiçbir yanlış cevap bulunmuyor."
		empty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		empty_lbl.modulate = Color(0.4, 1.0, 0.5)
		mistakes_list.add_child(empty_lbl)
		return

	for card in StatsManager.mistake_words:
		var card_box = PanelContainer.new()
		var vb = VBoxContainer.new()
		vb.theme_override_constants.separation = 4

		var w_lbl = Label.new()
		w_lbl.text = "⚠️ " + card.get("word", "") + " [" + card.get("level", "A1") + "]"
		w_lbl.modulate = Color(1.0, 0.5, 0.4)
		vb.add_child(w_lbl)

		var q_lbl = Label.new()
		q_lbl.text = card.get("question", "")
		vb.add_child(q_lbl)

		var opts = card.get("options", [])
		var c_idx = card.get("correct_index", 0)
		var c_opt = opts[c_idx] if c_idx >= 0 and c_idx < opts.size() else ""
		var a_lbl = Label.new()
		a_lbl.text = "Doğru Cevap: " + c_opt
		a_lbl.modulate = Color(0.3, 1.0, 0.4)
		vb.add_child(a_lbl)

		card_box.add_child(vb)
		mistakes_list.add_child(card_box)

func _on_tactical_alert_requested(title: String, desc: String):
	tactical_banner.show()
	tactical_title.text = title
	tactical_desc.text = desc
	tactical_timer = 4.0

func update_timer(time_left: float, wave_num: int):
	var biome_name = "KÜTÜPHANE" if wave_num < 26 else ("DEHLİZ" if wave_num < 51 else ("GÖZLEMEVİ" if wave_num < 76 else "SON SAYFA"))
	timer_label.text = biome_name + " · " + str(wave_num) + " / 100 · " + str(int(ceil(time_left))) + "s"

func show_arena_transition(stage_index: int):
	var chapter = CHAPTERS[clampi(stage_index, 0, CHAPTERS.size() - 1)]
	chapter_kicker.text = chapter["kicker"]
	chapter_number.text = ["I", "II", "III", "IV"][clampi(stage_index, 0, 3)]
	chapter_title.text = chapter["title"]
	chapter_desc.text = chapter["narration"]
	chapter_accent.color = Color(chapter["accent"])
	chapter_card.show()
	chapter_timer = 5.5

func update_info_row():
	var char_data = StatsManager.characters.get(StatsManager.selected_character, {"name": "Inky"})
	var difficulty_labels = {"easy": "A1–A2", "normal": "B1", "hard": "B2–C1"}
	char_diff_label.text = char_data["name"] + " · " + difficulty_labels.get(StatsManager.difficulty, "B1")

	var weap_names = []
	for i in range(StatsManager.equipped_weapons.size()):
		var w_id = StatsManager.equipped_weapons[i]
		var w_name = w_id
		if StatsManager.weapons_catalog.has(w_id):
			w_name = StatsManager.weapons_catalog[w_id]["name"].split(" ")[0]
		if i == StatsManager.active_weapon_index:
			weap_names.append(str(i + 1) + " · " + w_name)
		else:
			weap_names.append(str(i + 1) + ": " + w_name)
	weapons_label.text = "SİLAHLAR  " + "  /  ".join(weap_names) + "   Q/E"

func update_gadget(time_left: float, _total_time: float):
	if not gadget_status:
		return
	if time_left <= 0.05:
		gadget_status.text = "HAZIR"
		gadget_touch_button.text = "HAZIR"
		gadget_touch_button.disabled = false
		gadget_status.modulate = Color(0.77, 0.68, 0.49)
	else:
		var countdown := str(snapped(time_left, 0.1)) + "s"
		gadget_status.text = countdown
		gadget_touch_button.text = countdown
		gadget_touch_button.disabled = true
		gadget_status.modulate = Color(0.72, 0.72, 0.66)

func _on_gadget_switched(gadget_id: String) -> void:
	var canonical_id := StatsManager.normalize_gadget_id(gadget_id)
	var data: Dictionary = StatsManager.gadgets_catalog.get(canonical_id, {})
	var label := str(data.get("name", "GEREÇ")) + " · SPACE"
	gadget_name.text = label
	var texture_path := "res://" + str(data.get("icon", "assets/sprites/gadgets/eraser_dash.png"))
	gadget_glyph.texture = load(texture_path) as Texture2D
	gadget_touch_button.icon = gadget_glyph.texture
	gadget_touch_button.tooltip_text = label + " · dokun ve kullan"
	update_gadget(0.0, 0.0)
	refresh_inventory()

func _on_hp_changed(curr: float, max_h: float):
	hp_bar.max_value = max_h
	hp_bar.value = curr
	hp_label.text = str(int(curr)) + " / " + str(int(max_h)) + " HP"

func _on_ink_changed(val: int):
	ink_label.text = str(val)

func _on_kill_changed(val: int):
	kill_label.text = str(val)

func _on_weapon_equipped(_w_id: String):
	update_info_row()
	refresh_inventory()

func _on_weapon_switched(_w_id: String, _w_idx: int):
	update_info_row()
	refresh_inventory()

func _on_character_changed(_char_id: String):
	update_info_row()

func _on_difficulty_changed(_diff_id: String):
	update_info_row()

func _on_synergy_activated(syn_name: String, syn_desc: String):
	banner.show()
	banner_title.text = "YENİ SİNERJİ · " + syn_name
	banner_desc.text = syn_desc
	banner_timer = 4.0
