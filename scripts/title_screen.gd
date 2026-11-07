extends Control

signal game_started()
signal leaderboard_requested()

@onready var char_cards_container = $Panel/VBox/CharCardsContainer
@onready var easy_btn = $Panel/VBox/DiffContainer/EasyButton
@onready var normal_btn = $Panel/VBox/DiffContainer/NormalButton
@onready var hard_btn = $Panel/VBox/DiffContainer/HardButton
@onready var start_button = $Panel/VBox/StartButton
@onready var leaderboard_button = $Panel/VBox/LeaderboardButton
@onready var diff_desc_label = $Panel/VBox/DiffDescLabel

var selected_char: String = "inky"
var selected_diff: String = "normal"
var intro_overlay: ColorRect
var intro_content: VBoxContainer
var intro_active: bool = false
var intro_seen_path: String = "user://archive_intro_seen.cfg"
var skills_button: Button
var skills_overlay: Control
var skills_content: VBoxContainer
var learning_level_selector: OptionButton

const DIFFICULTY_DESCRIPTIONS = {
	"easy": "Düşmanlar daha yavaş ve daha az dayanıklıdır. Başlangıç canı +40 HP.",
	"normal": "Dengeli dalga temposu ve toplanabilir can parşömenleri.",
	"hard": "Çevik, dayanıklı düşmanlar ve daha hızlı bir arena temposu."
}

func _ready():
	easy_btn.pressed.connect(func(): set_difficulty("easy"))
	normal_btn.pressed.connect(func(): set_difficulty("normal"))
	hard_btn.pressed.connect(func(): set_difficulty("hard"))
	start_button.pressed.connect(_on_start_pressed)
	leaderboard_button.pressed.connect(func(): leaderboard_requested.emit())
	_style_start_button()
	
	build_character_cards()
	_build_music_selector()
	_build_skills_button()
	_build_learning_level_selector()
	StatsManager.character_progress_changed.connect(_on_character_progress_changed)
	set_difficulty("normal")
	start_intro()

func _build_learning_level_selector() -> void:
	var vbox := get_node("Panel/VBox") as VBoxContainer
	var row := HBoxContainer.new()
	row.name = "LearningLevelRow"
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 12)
	var label := Label.new()
	label.text = "İNGİLİZCE BAŞLANGIÇ SEVİYESİ"
	label.add_theme_font_size_override("font_size", 13)
	label.add_theme_color_override("font_color", Color("#574733"))
	row.add_child(label)
	learning_level_selector = OptionButton.new()
	learning_level_selector.custom_minimum_size = Vector2(150, 38)
	for level in ["A1", "A2", "B1", "B2", "C1", "C2"]:
		learning_level_selector.add_item(level)
		if level == StatsManager.learning_level:
			learning_level_selector.select(learning_level_selector.item_count - 1)
	learning_level_selector.item_selected.connect(func(index: int): StatsManager.set_learning_level(learning_level_selector.get_item_text(index)))
	row.add_child(learning_level_selector)
	var section_index := vbox.get_node("SectionDiff").get_index()
	vbox.add_child(row)
	vbox.move_child(row, section_index)

func _build_skills_button() -> void:
	var vbox := get_node("Panel/VBox") as VBoxContainer
	skills_button = Button.new()
	skills_button.name = "SkillsButton"
	skills_button.text = "KARAKTER YETENEKLERİ  ·  L1"
	skills_button.custom_minimum_size = Vector2(0, 44)
	skills_button.focus_mode = Control.FOCUS_ALL
	skills_button.pressed.connect(open_skills_panel)
	_style_difficulty_button(skills_button, false)
	var start_index := vbox.get_children().find(start_button)
	vbox.add_child(skills_button)
	if start_index >= 0:
		vbox.move_child(skills_button, start_index)
	_refresh_skills_button()

func _refresh_skills_button() -> void:
	if not is_instance_valid(skills_button):
		return
	var progress := StatsManager.get_character_progress(selected_char)
	skills_button.text = "KARAKTER YETENEKLERİ  ·  L%d  ·  %d PUAN" % [int(progress.get("level", 1)), int(progress.get("skill_points", 0))]

func _on_character_progress_changed(char_id: String) -> void:
	if char_id == selected_char:
		_refresh_skills_button()
		if is_instance_valid(skills_overlay) and skills_overlay.visible:
			_refresh_skill_panel()

func open_skills_panel() -> void:
	if not is_instance_valid(skills_overlay):
		_build_skills_panel()
	_refresh_skill_panel()
	skills_overlay.visible = true
	var close_button := skills_overlay.get_node_or_null("SkillsPanel/SkillsVBox/SkillsCloseButton") as Button
	if close_button:
		close_button.grab_focus()
	get_viewport().set_input_as_handled()

func close_skills_panel() -> void:
	if is_instance_valid(skills_overlay):
		skills_overlay.visible = false
		if is_instance_valid(skills_button):
			skills_button.grab_focus()

func _unhandled_key_input(event: InputEvent) -> void:
	if is_instance_valid(skills_overlay) and skills_overlay.visible and event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ESCAPE:
		close_skills_panel()
		get_viewport().set_input_as_handled()

func _build_skills_panel() -> void:
	skills_overlay = Control.new()
	skills_overlay.name = "CharacterSkillsOverlay"
	skills_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	skills_overlay.z_index = 50
	skills_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(skills_overlay)
	var shade := ColorRect.new()
	shade.color = Color(0.025, 0.04, 0.035, 0.94)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_STOP
	skills_overlay.add_child(shade)
	var panel := PanelContainer.new()
	panel.name = "SkillsPanel"
	panel.anchor_left = 0.04
	panel.anchor_top = 0.035
	panel.anchor_right = 0.96
	panel.anchor_bottom = 0.965
	panel.add_theme_stylebox_override("panel", _card_style(Color("#17211c"), Color("#b7a36b")))
	skills_overlay.add_child(panel)
	var outer := VBoxContainer.new()
	outer.name = "SkillsVBox"
	outer.add_theme_constant_override("separation", 10)
	panel.add_child(outer)
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 12)
	outer.add_child(header)
	var title := Label.new()
	title.text = "KAHRAMANIN YOLU"
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", Color("#f1e8d4"))
	header.add_child(title)
	var close_button := Button.new()
	close_button.name = "SkillsCloseButton"
	close_button.text = "KAPAT  ·  ESC"
	close_button.custom_minimum_size = Vector2(150, 42)
	close_button.focus_mode = Control.FOCUS_ALL
	close_button.pressed.connect(close_skills_panel)
	_style_difficulty_button(close_button, false)
	header.add_child(close_button)
	var status := Label.new()
	status.name = "SkillProgressStatus"
	status.add_theme_font_size_override("font_size", 15)
	status.add_theme_color_override("font_color", Color("#d8c28b"))
	outer.add_child(status)
	var hint := Label.new()
	hint.text = "Dalgaları oynayarak XP kazan. Seviye atladığında bir puan al; bir dalda ilerlemek için önceki beceriyi aç."
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hint.add_theme_font_size_override("font_size", 12)
	hint.add_theme_color_override("font_color", Color("#aeb9aa"))
	outer.add_child(hint)
	var scroll := ScrollContainer.new()
	scroll.name = "SkillScroll"
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	outer.add_child(scroll)
	skills_content = VBoxContainer.new()
	skills_content.add_theme_constant_override("separation", 10)
	skills_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(skills_content)
	var footer := Label.new()
	footer.text = "Klavye / kumanda: odaklanmak için TAB veya yön tuşları, seçmek için ENTER."
	footer.add_theme_font_size_override("font_size", 11)
	footer.add_theme_color_override("font_color", Color("#8d9c8e"))
	outer.add_child(footer)
	skills_overlay.visible = false

func _refresh_skill_panel() -> void:
	if not is_instance_valid(skills_content):
		return
	for child in skills_content.get_children():
		child.queue_free()
	var progress := StatsManager.get_character_progress(selected_char)
	var required := StatsManager.get_xp_required_for_next_level(int(progress.get("level", 1)))
	var xp_text := "TAVAN" if int(progress.get("level", 1)) >= int(StatsManager.skill_tree_catalog.get("max_character_level", 18)) else "%d / %d XP" % [int(progress.get("xp", 0)), required]
	var status := skills_overlay.get_node_or_null("SkillsPanel/SkillsVBox/SkillProgressStatus")
	if status is Label:
		status.text = "%s  ·  SEVİYE %d  ·  %s  ·  HARCANMAMIŞ PUAN: %d" % [StatsManager.characters.get(selected_char, {}).get("name", selected_char), int(progress.get("level", 1)), xp_text, int(progress.get("skill_points", 0))]
	var char_tree: Dictionary = StatsManager.skill_tree_catalog.get("characters", {}).get(selected_char, {})
	var unlocked: Array = progress.get("unlocked_skills", [])
	for branch in char_tree.get("branches", []):
		var branch_panel := PanelContainer.new()
		branch_panel.add_theme_stylebox_override("panel", _card_style(Color("#202a24"), Color("#605d46")))
		skills_content.add_child(branch_panel)
		var branch_box := VBoxContainer.new()
		branch_box.add_theme_constant_override("separation", 7)
		branch_panel.add_child(branch_box)
		var branch_title := Label.new()
		branch_title.text = str(branch.get("name_tr", "Yetenek Dalı"))
		branch_title.add_theme_font_size_override("font_size", 16)
		branch_title.add_theme_color_override("font_color", Color("#e7d39b"))
		branch_box.add_child(branch_title)
		var branch_desc := Label.new()
		branch_desc.text = str(branch.get("description_tr", ""))
		branch_desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		branch_desc.add_theme_font_size_override("font_size", 11)
		branch_desc.add_theme_color_override("font_color", Color("#b8c0b1"))
		branch_box.add_child(branch_desc)
		for node in branch.get("nodes", []):
			var node_id := str(node.get("id", ""))
			var learned := unlocked.has(node_id)
			var eligible := StatsManager.can_unlock_character_skill(selected_char, node_id)
			var node_box := HBoxContainer.new()
			node_box.add_theme_constant_override("separation", 9)
			branch_box.add_child(node_box)
			var detail := VBoxContainer.new()
			detail.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			detail.add_theme_constant_override("separation", 2)
			node_box.add_child(detail)
			var node_title := Label.new()
			node_title.text = ("✓  " if learned else "◇  ") + str(node.get("name_tr", node_id))
			node_title.add_theme_font_size_override("font_size", 12)
			node_title.add_theme_color_override("font_color", Color("#c9d8bc") if learned else Color("#eee9dc"))
			detail.add_child(node_title)
			var effects_line := _skill_effect_summary(node.get("effects", {}))
			var req_line := "Seviye %d  ·  %d puan" % [int(node.get("required_level", 1)), int(node.get("point_cost", 1))]
			var prereqs: Array = node.get("prerequisites", [])
			if not prereqs.is_empty():
				req_line += "  ·  Önce: " + _skill_prerequisite_names(char_tree, prereqs)
			var node_desc := Label.new()
			node_desc.text = "%s\n%s\n%s" % [str(node.get("description_tr", "")), effects_line, req_line]
			node_desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			node_desc.add_theme_font_size_override("font_size", 10)
			node_desc.add_theme_color_override("font_color", Color("#aab5a8"))
			detail.add_child(node_desc)
			var unlock_button := Button.new()
			unlock_button.custom_minimum_size = Vector2(116, 48)
			unlock_button.focus_mode = Control.FOCUS_ALL
			if learned:
				unlock_button.text = "AÇILDI"
				unlock_button.disabled = true
			elif eligible:
				unlock_button.text = "ÖĞREN\nENTER"
			else:
				unlock_button.text = "KİLİTLİ\nLv.%d" % int(node.get("required_level", 1))
				unlock_button.disabled = true
			_style_difficulty_button(unlock_button, eligible)
			var captured_char := selected_char
			var captured_node := node_id
			unlock_button.pressed.connect(func():
				if StatsManager.unlock_character_skill(captured_char, captured_node):
					_refresh_skill_panel()
			)
			node_box.add_child(unlock_button)

func _skill_prerequisite_names(char_tree: Dictionary, prerequisites: Array) -> String:
	var labels: Array[String] = []
	for branch in char_tree.get("branches", []):
		for node in branch.get("nodes", []):
			if prerequisites.has(node.get("id", "")):
				labels.append(str(node.get("name_tr", node.get("id", ""))))
	return ", ".join(labels)

func _skill_effect_summary(effects: Dictionary) -> String:
	var labels: Array[String] = []
	for key in effects:
		var value := float(effects[key])
		match str(key):
			"damage": labels.append("+%d%% hasar" % roundi(value * 100.0))
			"attack_speed": labels.append("+%d%% saldırı hızı" % roundi(value * 100.0))
			"armor": labels.append("+%d%% zırh" % roundi(value * 100.0))
			"move_speed": labels.append("+%d hareket hızı" % roundi(value))
			"max_hp": labels.append("+%d maksimum can" % roundi(value))
			"crit_chance": labels.append("+%d%% kritik şansı" % roundi(value * 100.0))
			"projectile_count": labels.append("+%d mermi" % roundi(value))
			"pierce": labels.append("+%d delme" % roundi(value))
			"pickup_radius": labels.append("+%d toplama menzili" % roundi(value))
	return " · ".join(labels)

func _build_music_selector() -> void:
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 10)
	var label := Label.new()
	label.text = "MÜZİK"
	label.add_theme_color_override("font_color", Color("#725a3a"))
	label.add_theme_font_size_override("font_size", 12)
	row.add_child(label)
	var picker := OptionButton.new()
	picker.name = "MusicChoice"
	picker.custom_minimum_size = Vector2(250, 36)
	picker.add_item("Otomatik · dalgaya göre", 0)
	picker.add_item("Karanlık Kütüphane", 1)
	picker.add_item("Mürekkep Takibi", 2)
	picker.add_item("Rafların Uyanışı", 3)
	picker.add_item("Son Nöbet · Boss", 4)
	var audio_manager := get_tree().root.find_child("AudioManager", true, false)
	var saved_choice := "auto"
	if audio_manager:
		saved_choice = str(audio_manager.music_choice)
	picker.select({"auto": 0, "library": 1, "action": 2, "urgent": 3, "last_stand": 4}.get(saved_choice, 0))
	picker.item_selected.connect(func(index: int):
		var manager := get_tree().root.find_child("AudioManager", true, false)
		if manager:
			manager.set_music_choice(["auto", "library", "action", "urgent", "last_stand"][index])
	)
	row.add_child(picker)
	var vbox := get_node("Panel/VBox") as VBoxContainer
	vbox.add_child(row)
	vbox.move_child(row, 2)

func _input(event: InputEvent) -> void:
	if not intro_active:
		return
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode in [KEY_SPACE, KEY_ENTER, KEY_KP_ENTER, KEY_ESCAPE]:
			skip_intro()
			get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton and event.pressed:
		skip_intro()
		get_viewport().set_input_as_handled()
	elif event is InputEventScreenTouch and event.pressed:
		skip_intro()
		get_viewport().set_input_as_handled()

func _is_reduced_motion() -> bool:
	return bool(ProjectSettings.get_setting("accessibility/reduced_motion", false)) or OS.get_environment("REDUCED_MOTION") == "1"

func _build_intro_overlay() -> void:
	intro_overlay = ColorRect.new()
	intro_overlay.name = "ArchiveIntro"
	intro_overlay.color = Color("#09100c")
	intro_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	intro_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	intro_overlay.z_index = 20
	add_child(intro_overlay)

	var backdrop = TextureRect.new()
	backdrop.name = "ArchiveBackdrop"
	backdrop.texture = load("res://assets/sprites/upgrade_v1/arena_frame_library.png")
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	backdrop.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	backdrop.modulate = Color(0.42, 0.46, 0.4, 0.22)
	backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	intro_overlay.add_child(backdrop)

	var center = CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	intro_overlay.add_child(center)

	intro_content = VBoxContainer.new()
	intro_content.alignment = BoxContainer.ALIGNMENT_CENTER
	intro_content.add_theme_constant_override("separation", 12)
	intro_content.custom_minimum_size = Vector2(320, 0)
	intro_content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	center.add_child(intro_content)

	var mark = TextureRect.new()
	mark.texture = load("res://assets/ui/icons/book.svg")
	mark.custom_minimum_size = Vector2(68, 68)
	mark.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	mark.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	mark.modulate = Color("#d4af75")
	mark.mouse_filter = Control.MOUSE_FILTER_IGNORE
	intro_content.add_child(mark)

	var hero = TextureRect.new()
	hero.texture = load(_character_sprite_path(selected_char))
	hero.custom_minimum_size = Vector2(48, 48)
	hero.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	hero.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	hero.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	hero.mouse_filter = Control.MOUSE_FILTER_IGNORE
	intro_content.add_child(hero)

	var kicker = Label.new()
	kicker.text = "ARŞİV AÇILIYOR"
	kicker.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	kicker.add_theme_color_override("font_color", Color("#cbb980"))
	kicker.add_theme_font_size_override("font_size", 12)
	intro_content.add_child(kicker)

	var title = Label.new()
	title.text = "LEXICON SURVIVORS"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_color_override("font_color", Color("#f2e8d2"))
	title.add_theme_font_size_override("font_size", 28)
	intro_content.add_child(title)

	var subtitle = Label.new()
	subtitle.text = "Kayıp kelimeleri rafların arasından geri çağır."
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	subtitle.add_theme_color_override("font_color", Color("#c0c1ae"))
	subtitle.add_theme_font_size_override("font_size", 14)
	intro_content.add_child(subtitle)

	var skip_button = Button.new()
	skip_button.text = "GEÇ · SPACE"
	skip_button.custom_minimum_size = Vector2(190, 44)
	skip_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	skip_button.pressed.connect(skip_intro)
	intro_content.add_child(skip_button)

func start_intro() -> void:
	if intro_active:
		return
	var config = ConfigFile.new()
	if config.load(intro_seen_path) == OK and config.get_value("intro", "seen", false):
		return
	_build_intro_overlay()
	intro_active = true
	var reduced_motion = _is_reduced_motion()
	var backdrop = intro_overlay.get_node("ArchiveBackdrop") as TextureRect
	intro_overlay.modulate.a = 0.0 if reduced_motion else 1.0
	if reduced_motion:
		var fade_in = create_tween().set_parallel(true)
		fade_in.tween_property(intro_overlay, "modulate:a", 1.0, 0.25)
		fade_in.tween_property(backdrop, "modulate:a", 0.45, 0.25)
	else:
		intro_content.position.y = 14.0
		intro_content.modulate.a = 0.0
		var reveal = create_tween().set_parallel(true)
		reveal.tween_property(intro_content, "position:y", 0.0, 1.5).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		reveal.tween_property(intro_content, "modulate:a", 1.0, 0.65)
		reveal.tween_property(backdrop, "modulate:a", 0.7, 1.25).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	get_tree().create_timer(0.4 if reduced_motion else 1.65).timeout.connect(finish_intro)

func skip_intro() -> void:
	finish_intro()

func finish_intro() -> void:
	if not intro_active:
		return
	intro_active = false
	var config = ConfigFile.new()
	config.set_value("intro", "seen", true)
	config.save(intro_seen_path)
	var fade = create_tween()
	fade.tween_property(intro_overlay, "modulate:a", 0.0, 0.2 if _is_reduced_motion() else 0.28)
	fade.finished.connect(func():
		if is_instance_valid(intro_overlay):
			intro_overlay.queue_free()
	)

func build_character_cards():
	for child in char_cards_container.get_children():
		child.queue_free()
		
	var chars = StatsManager.characters
	var character_ids = ["inky", "quillmaster", "word_knight", "rune_sorceress", "lexicon_alchemist", "shadow_lexicographer"]
	for c_id in character_ids:
		var c_data = chars[c_id]
		var card_btn = Button.new()
		card_btn.custom_minimum_size = Vector2(350, 166)
		card_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		card_btn.focus_mode = Control.FOCUS_ALL
		card_btn.add_theme_stylebox_override("normal", _card_style(Color("#202825"), Color("#435048")))
		card_btn.add_theme_stylebox_override("hover", _card_style(Color("#28332e"), Color("#8f8058")))
		card_btn.add_theme_stylebox_override("pressed", _card_style(Color("#303b34"), Color("#b7a36b")))
		card_btn.add_theme_stylebox_override("focus", _card_style(Color("#202825"), Color("#b7a36b")))
		
		var vbox = VBoxContainer.new()
		vbox.anchors_preset = Control.PRESET_FULL_RECT
		vbox.offset_left = 11
		vbox.offset_top = 8
		vbox.offset_right = -11
		vbox.offset_bottom = -8
		vbox.add_theme_constant_override("separation", 4)
		vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
		card_btn.add_child(vbox)
		var head = HBoxContainer.new()
		head.add_theme_constant_override("separation", 10)
		head.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vbox.add_child(head)
		var portrait = TextureRect.new()
		portrait.custom_minimum_size = Vector2(42, 42)
		portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		portrait.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
		portrait.texture = load(_character_sprite_path(c_id))
		head.add_child(portrait)
		var identity = VBoxContainer.new()
		identity.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		identity.add_theme_constant_override("separation", 0)
		identity.mouse_filter = Control.MOUSE_FILTER_IGNORE
		head.add_child(identity)
		var name_lbl = Label.new()
		name_lbl.text = c_data["name"]
		name_lbl.add_theme_font_size_override("font_size", 16)
		name_lbl.add_theme_color_override("font_color", Color("#eee9dc"))
		name_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		identity.add_child(name_lbl)
		var title_lbl = Label.new()
		title_lbl.text = c_data["title"].split(" (")[0]
		title_lbl.add_theme_font_size_override("font_size", 10)
		title_lbl.add_theme_color_override("font_color", Color("#aaa995"))
		title_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		identity.add_child(title_lbl)
		
		var stats_lbl = Label.new()
		stats_lbl.text = "%d HP     %d HIZ     %.2f× HASAR" % [int(c_data["hp"]), int(c_data["move_speed"]), float(c_data["damage_mult"])]
		stats_lbl.add_theme_font_size_override("font_size", 10)
		stats_lbl.add_theme_color_override("font_color", Color("#c2ad76"))
		stats_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vbox.add_child(stats_lbl)
		
		var desc_lbl = Label.new()
		desc_lbl.text = c_data["desc"]
		desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		desc_lbl.modulate = Color("#d0cec3")
		desc_lbl.add_theme_font_size_override("font_size", 11)
		desc_lbl.size_flags_vertical = Control.SIZE_EXPAND_FILL
		desc_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vbox.add_child(desc_lbl)
		
		var pass_lbl = Label.new()
		pass_lbl.text = c_data["passive"]
		pass_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		pass_lbl.modulate = Color("#9ca99a")
		pass_lbl.add_theme_font_size_override("font_size", 10)
		pass_lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vbox.add_child(pass_lbl)
		
		var cur_id = c_id
		card_btn.pressed.connect(func(): select_character(cur_id))
		char_cards_container.add_child(card_btn)
		
	update_character_selection_ui()

func _card_style(fill_color: Color, border_color: Color) -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = fill_color
	style.border_color = border_color
	style.set_border_width_all(1)
	style.set_corner_radius_all(5)
	style.content_margin_left = 8
	style.content_margin_right = 8
	style.content_margin_top = 6
	style.content_margin_bottom = 6
	return style

func _difficulty_style(fill_color: Color, border_color: Color) -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = fill_color
	style.border_color = border_color
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 7
	style.content_margin_bottom = 7
	return style

func _style_start_button():
	start_button.add_theme_color_override("font_color", Color("#f2ead9"))
	start_button.add_theme_font_size_override("font_size", 18)
	start_button.add_theme_stylebox_override("normal", _difficulty_style(Color("#642b32"), Color("#9a6c52")))
	start_button.add_theme_stylebox_override("hover", _difficulty_style(Color("#783840"), Color("#b18d63")))
	start_button.add_theme_stylebox_override("pressed", _difficulty_style(Color("#51232a"), Color("#b18d63")))

func _style_difficulty_button(button: Button, active: bool) -> void:
	var fill = Color("#642b32") if active else Color("#e5dece")
	var border = Color("#9a6c52") if active else Color("#c4b89f")
	var text_color = Color("#f2ead9") if active else Color("#303630")
	button.add_theme_color_override("font_color", text_color)
	button.add_theme_color_override("font_hover_color", text_color)
	button.add_theme_stylebox_override("normal", _difficulty_style(fill, border))
	button.add_theme_stylebox_override("hover", _difficulty_style(Color("#74363e") if active else Color("#f0eadc"), border))
	button.add_theme_stylebox_override("pressed", _difficulty_style(Color("#52252c") if active else Color("#ddd4c2"), border))

func _character_sprite_path(char_id: String) -> String:
	var sprite_names = {
		"inky": "hero_inky.png",
		"quillmaster": "hero_quillmaster.png",
		"word_knight": "hero_word_knight.png",
		"rune_sorceress": "hero_rune_sorceress.png",
		"lexicon_alchemist": "hero_alchemist.png",
		"shadow_lexicographer": "hero_shadow_scribe.png"
	}
	return "res://assets/sprites/upgrade_v1/" + sprite_names.get(char_id, "hero_inky.png")

func select_character(char_id: String):
	selected_char = char_id
	StatsManager.select_character(char_id)
	update_character_selection_ui()
	_refresh_skills_button()

func update_character_selection_ui():
	var children = char_cards_container.get_children()
	var char_keys = ["inky", "quillmaster", "word_knight", "rune_sorceress", "lexicon_alchemist", "shadow_lexicographer"]
	for i in range(min(children.size(), char_keys.size())):
		var btn = children[i] as Button
		if char_keys[i] == selected_char:
			btn.add_theme_stylebox_override("normal", _card_style(Color("#303a33"), Color("#c2ad76")))
		else:
			btn.add_theme_stylebox_override("normal", _card_style(Color("#202825"), Color("#435048")))

func set_difficulty(diff_id: String):
	selected_diff = diff_id
	StatsManager.set_difficulty(diff_id)
	
	_style_difficulty_button(easy_btn, diff_id == "easy")
	_style_difficulty_button(normal_btn, diff_id == "normal")
	_style_difficulty_button(hard_btn, diff_id == "hard")
	
	diff_desc_label.text = DIFFICULTY_DESCRIPTIONS.get(diff_id, DIFFICULTY_DESCRIPTIONS["normal"])

func _on_start_pressed():
	hide()
	emit_signal("game_started")
