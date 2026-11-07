extends CanvasLayer

var overlay: Control
var panel: PanelContainer
var status_label: Label
var alias_input: LineEdit
var difficulty_select: OptionButton
var global_rows: VBoxContainer
var local_best_label: Label
var submit_button: Button
var _run_result: Dictionary = {}

func _ready() -> void:
	layer = 30
	process_mode = Node.PROCESS_MODE_ALWAYS
	_build_ui()
	get_viewport().size_changed.connect(_apply_responsive_layout)
	_apply_responsive_layout()
	LeaderboardClient.leaderboard_loaded.connect(_on_leaderboard_loaded)
	LeaderboardClient.submission_finished.connect(_on_submission_finished)

func _build_ui() -> void:
	overlay = Control.new()
	overlay.name = "LeaderboardOverlay"
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.visible = false
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(overlay)
	var dim := ColorRect.new()
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dim.color = Color(0.025, 0.035, 0.03, 0.88)
	dim.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.add_child(dim)
	panel = PanelContainer.new()
	panel.name = "LeaderboardPanel"
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	panel.offset_left = -355.0
	panel.offset_top = -305.0
	panel.offset_right = 355.0
	panel.offset_bottom = 305.0
	panel.custom_minimum_size = Vector2(520, 500)
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color("#f2eddf")
	panel_style.border_color = Color("#907a54")
	panel_style.set_border_width_all(2)
	panel_style.set_corner_radius_all(5)
	panel_style.content_margin_left = 18
	panel_style.content_margin_right = 18
	panel_style.content_margin_top = 14
	panel_style.content_margin_bottom = 14
	panel.add_theme_stylebox_override("panel", panel_style)
	overlay.add_child(panel)
	var layout := VBoxContainer.new()
	layout.add_theme_constant_override("separation", 8)
	panel.add_child(layout)

	var header := HBoxContainer.new()
	layout.add_child(header)
	var heading := Label.new()
	heading.text = "SIRALAMA  ·  ARŞİV KAYITLARI"
	heading.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	heading.add_theme_font_size_override("font_size", 21)
	heading.add_theme_color_override("font_color", Color("#342d23"))
	header.add_child(heading)
	var close_button := Button.new()
	close_button.name = "CloseButton"
	close_button.text = "Kapat"
	close_button.pressed.connect(close_board)
	header.add_child(close_button)
	var rule := ColorRect.new()
	rule.custom_minimum_size.y = 2
	rule.color = Color("#907a54")
	layout.add_child(rule)

	var local_header := Label.new()
	local_header.text = "BU CİHAZDAKİ EN İYİ KOŞU"
	local_header.add_theme_font_size_override("font_size", 11)
	local_header.add_theme_color_override("font_color", Color("#765d39"))
	layout.add_child(local_header)
	local_best_label = Label.new()
	local_best_label.text = "Henüz yerel skor kaydı yok."
	local_best_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	layout.add_child(local_best_label)

	var tools := HBoxContainer.new()
	tools.add_theme_constant_override("separation", 8)
	layout.add_child(tools)
	var difficulty_label := Label.new()
	difficulty_label.text = "Zorluk"
	tools.add_child(difficulty_label)
	difficulty_select = OptionButton.new()
	difficulty_select.name = "DifficultyFilter"
	difficulty_select.add_item("Rahat · A1–A2")
	difficulty_select.set_item_metadata(0, "easy")
	difficulty_select.add_item("Normal · B1")
	difficulty_select.set_item_metadata(1, "normal")
	difficulty_select.add_item("Zor · B2–C1")
	difficulty_select.set_item_metadata(2, "hard")
	difficulty_select.select(1)
	difficulty_select.item_selected.connect(_on_difficulty_selected)
	tools.add_child(difficulty_select)
	var refresh := Button.new()
	refresh.text = "Yenile"
	refresh.pressed.connect(_fetch_selected_difficulty)
	tools.add_child(refresh)

	status_label = Label.new()
	status_label.name = "LeaderboardStatus"
	status_label.text = "Küresel tablo yükleniyor…"
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status_label.add_theme_color_override("font_color", Color("#665e50"))
	layout.add_child(status_label)
	var global_title := Label.new()
	global_title.text = "KÜRESEL İLK 20"
	global_title.add_theme_font_size_override("font_size", 11)
	global_title.add_theme_color_override("font_color", Color("#765d39"))
	layout.add_child(global_title)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(0, 205)
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	layout.add_child(scroll)
	global_rows = VBoxContainer.new()
	global_rows.name = "GlobalRows"
	global_rows.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	global_rows.add_theme_constant_override("separation", 3)
	scroll.add_child(global_rows)

	var submit_row := HBoxContainer.new()
	submit_row.add_theme_constant_override("separation", 8)
	layout.add_child(submit_row)
	alias_input = LineEdit.new()
	alias_input.name = "AliasInput"
	alias_input.placeholder_text = "Görünen ad · en fazla 20 karakter"
	alias_input.max_length = 40
	alias_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	alias_input.text = LeaderboardClient.get_saved_alias()
	submit_row.add_child(alias_input)
	submit_button = Button.new()
	submit_button.name = "SubmitButton"
	submit_button.text = "Koşuyu gönder"
	submit_button.disabled = true
	submit_button.pressed.connect(_submit_run)
	submit_row.add_child(submit_button)
	var integrity := Label.new()
	integrity.text = "Skorlar istemci tarafından bildirilir; çevrimdışı kişisel kayıt yalnızca bu cihazda saklanır."
	integrity.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	integrity.add_theme_font_size_override("font_size", 10)
	integrity.add_theme_color_override("font_color", Color("#746b5e"))
	layout.add_child(integrity)

func _apply_responsive_layout() -> void:
	if not is_instance_valid(panel):
		return
	var viewport := get_viewport().get_visible_rect().size
	if viewport.x < 760.0:
		panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		panel.offset_left = 12.0
		panel.offset_top = 18.0
		panel.offset_right = -12.0
		panel.offset_bottom = -18.0
	else:
		panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
		panel.offset_left = -355.0
		panel.offset_top = -305.0
		panel.offset_right = 355.0
		panel.offset_bottom = 305.0

func open_board(run_result: Dictionary = {}) -> void:
	_run_result = run_result.duplicate(true)
	if not _run_result.is_empty():
		submit_button.disabled = false
		var run_difficulty := str(_run_result.get("difficultyId", "normal"))
		for index in difficulty_select.item_count:
			if str(difficulty_select.get_item_metadata(index)) == run_difficulty:
				difficulty_select.select(index)
				break
	else:
		submit_button.disabled = true
	overlay.show()
	alias_input.text = LeaderboardClient.get_saved_alias() if alias_input.text.is_empty() else alias_input.text
	_update_local_best()
	_fetch_selected_difficulty()
	alias_input.grab_focus()

func close_board() -> void:
	overlay.hide()

func _fetch_selected_difficulty() -> void:
	status_label.text = "Küresel tablo yükleniyor…"
	LeaderboardClient.fetch_top(_selected_difficulty())

func _on_difficulty_selected(_index: int) -> void:
	_update_local_best()
	_fetch_selected_difficulty()

func _selected_difficulty() -> String:
	return str(difficulty_select.get_item_metadata(difficulty_select.selected))

func _update_local_best() -> void:
	var records := LeaderboardClient.get_local_records(_selected_difficulty())
	if records.is_empty():
		local_best_label.text = "Henüz yerel skor kaydı yok."
		return
	var best: Dictionary = records[0]
	local_best_label.text = "%s  ·  %d dalga  ·  %d düşman  ·  %.1f dk" % [
		str(best.get("alias", "Oyuncu")), int(best.get("wavesCleared", 0)),
		int(best.get("kills", 0)), float(best.get("elapsedMs", 0)) / 60000.0
	]

func _on_leaderboard_loaded(entries: Array, error: String) -> void:
	for child in global_rows.get_children():
		child.queue_free()
	if entries.is_empty():
		_add_global_row("Henüz küresel skor yok.")
	else:
		for entry in entries.slice(0, 20):
			if not entry is Dictionary:
				continue
			var character_id := str(entry.get("characterId", "inky"))
			var character_name := str(StatsManager.characters.get(character_id, {}).get("name", character_id))
			_add_global_row("#%d  %s  ·  %d dalga  ·  %d düşman  ·  %.1f dk  ·  %s" % [
				int(entry.get("rank", global_rows.get_child_count() + 1)),
				str(entry.get("alias", "Oyuncu")), int(entry.get("wavesCleared", 0)),
				int(entry.get("kills", 0)), float(entry.get("elapsedMs", 0)) / 60000.0,
				character_name
			])
	status_label.text = error if not error.is_empty() else "Küresel tablo güncel."
	_update_local_best()

func _add_global_row(text_value: String) -> void:
	var row := Label.new()
	row.text = text_value
	row.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	row.add_theme_font_size_override("font_size", 12)
	row.add_theme_color_override("font_color", Color("#3c372d"))
	global_rows.add_child(row)

func _submit_run() -> void:
	if _run_result.is_empty():
		return
	var alias := LeaderboardClient.save_alias(alias_input.text)
	if alias.is_empty():
		status_label.text = "Latin harfleri ve rakamlar içeren bir ad gir."
		return
	var submission := _run_result.duplicate(true)
	submission["alias"] = alias
	LeaderboardClient.save_local_result(submission, alias)
	_update_local_best()
	status_label.text = "Skor gönderiliyor…"
	LeaderboardClient.submit_run(submission)

func _on_submission_finished(accepted: bool, rank: int, error: String) -> void:
	if accepted:
		status_label.text = "Skor kaydedildi · küresel sıra #%d" % rank if rank > 0 else "Skor küresel tabloya kaydedildi."
	else:
		status_label.text = error if not error.is_empty() else "Skor yerel cihazda saklandı."
