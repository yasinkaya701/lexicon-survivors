extends Control

signal shop_closed()

@onready var cards_container = $Panel/ScrollArea/CardsContainer
@onready var ink_label = $Panel/TopBar/InkLabel
@onready var wave_label = $Panel/TopBar/WaveLabel
@onready var synergy_label = $Panel/SynergyLabel
@onready var reroll_button = $Panel/BottomBar/RerollButton
@onready var chapter_strip = $Panel/ChapterStrip
@onready var chapter_kicker = $Panel/ChapterStrip/ChapterKicker
@onready var chapter_title = $Panel/ChapterStrip/ChapterTitle
@onready var chapter_narration = $Panel/ChapterStrip/ChapterNarration
@onready var chapter_mark = $Panel/ChapterStrip/ChapterMark
@onready var next_wave_button = $Panel/BottomBar/NextWaveButton

# Tabs
@onready var cards_tab_btn = $Panel/CategoryBar/CardsTabButton
@onready var weapons_tab_btn = $Panel/CategoryBar/WeaponsTabButton
@onready var gadgets_tab_btn = $Panel/CategoryBar/GadgetsTabButton
@onready var artifacts_tab_btn = $Panel/CategoryBar/ArtifactsTabButton
@onready var mistakes_tab_btn = $Panel/CategoryBar/MistakesTabButton

# Quiz Modal
@onready var quiz_modal = $QuizModal
@onready var quiz_word_title = $QuizModal/Box/WordTitle
@onready var quiz_question = $QuizModal/Box/QuestionLabel
@onready var quiz_example = $QuizModal/Box/ExampleLabel
@onready var quiz_result_label = $QuizModal/Box/ResultLabel
@onready var options_container = $QuizModal/Box/OptionsContainer
@onready var quiz_continue_btn = $QuizModal/Box/ContinueButton

var current_tab: String = "cards" # "cards", "weapons", "gadgets", "artifacts", "mistakes"
var current_cards: Array = []
var active_quiz_card: Dictionary = {}
var active_card_index: int = -1
var displayed_option_indices: Array[int] = []
var rerolls_this_shop: int = 0

const SHOP_SERIF_FONT = preload("res://assets/fonts/ibm-plex/IBMPlexSerif-SemiBold.ttf")
const SHOP_MONO_FONT = preload("res://assets/fonts/ibm-plex/IBMPlexMono-Medium.ttf")

func make_shop_card_panel(accent: Color) -> PanelContainer:
	var panel = PanelContainer.new()
	panel.custom_minimum_size = Vector2(265, 340)
	var panel_style = StyleBoxFlat.new()
	panel_style.bg_color = Color(0.96, 0.94, 0.89, 1)
	panel_style.border_color = Color(0.75, 0.69, 0.58, 1)
	panel_style.border_width_left = 3
	panel_style.border_width_top = 1
	panel_style.border_width_right = 1
	panel_style.border_width_bottom = 1
	panel_style.corner_radius_top_left = 5
	panel_style.corner_radius_top_right = 5
	panel_style.corner_radius_bottom_right = 5
	panel_style.corner_radius_bottom_left = 5
	panel_style.content_margin_left = 13.0
	panel_style.content_margin_top = 12.0
	panel_style.content_margin_right = 13.0
	panel_style.content_margin_bottom = 12.0
	panel_style.border_color = accent
	panel.add_theme_stylebox_override("panel", panel_style)
	return panel

func make_shop_price_label(text: String) -> Label:
	var price = Label.new()
	price.text = text
	price.add_theme_font_override("font", SHOP_MONO_FONT)
	price.add_theme_font_size_override("font_size", 12)
	price.add_theme_color_override("font_color", Color(0.40, 0.17, 0.20, 1))
	return price

func style_shop_title(label: Label, font_size: int) -> void:
	label.add_theme_font_override("font", SHOP_SERIF_FONT)
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", Color(0.15, 0.17, 0.15, 1))

func style_shop_description(label: Label) -> void:
	label.add_theme_color_override("font_color", Color(0.30, 0.36, 0.32, 1))

func style_shop_action(button: Button) -> void:
	button.add_theme_color_override("font_color", Color(0.96, 0.93, 0.86, 1))
	button.add_theme_color_override("font_disabled_color", Color(0.47, 0.44, 0.38, 1))
	button.add_theme_font_size_override("font_size", 14)
	var normal = StyleBoxFlat.new()
	normal.bg_color = Color(0.39, 0.15, 0.19, 1)
	normal.border_color = Color(0.62, 0.40, 0.31, 1)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(4)
	normal.content_margin_left = 9.0
	normal.content_margin_right = 9.0
	normal.content_margin_top = 7.0
	normal.content_margin_bottom = 7.0
	var hover = normal.duplicate() as StyleBoxFlat
	hover.bg_color = Color(0.48, 0.20, 0.24, 1)
	hover.border_color = Color(0.75, 0.60, 0.39, 1)
	var disabled = normal.duplicate() as StyleBoxFlat
	disabled.bg_color = Color(0.85, 0.82, 0.75, 1)
	disabled.border_color = Color(0.75, 0.69, 0.58, 1)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("disabled", disabled)
	button.custom_minimum_size.y = 44

func style_shop_tab(button: Button, active: bool) -> void:
	var normal = StyleBoxFlat.new()
	normal.bg_color = Color(0.38, 0.16, 0.19, 1) if active else Color(0.89, 0.86, 0.79, 1)
	normal.border_color = Color(0.65, 0.46, 0.34, 1) if active else Color(0.75, 0.69, 0.58, 1)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(4)
	normal.content_margin_left = 10.0
	normal.content_margin_right = 10.0
	normal.content_margin_top = 7.0
	normal.content_margin_bottom = 7.0
	var hover = normal.duplicate() as StyleBoxFlat
	if not active:
		hover.bg_color = Color(0.95, 0.93, 0.88, 1)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	var label_color = Color(0.96, 0.93, 0.86, 1) if active else Color(0.25, 0.28, 0.26, 1)
	button.add_theme_color_override("font_color", label_color)
	button.add_theme_color_override("font_hover_color", label_color)

var auto_tur_timer: float = 3.0
var auto_tur_paused: bool = false

func _ready():
	hide()
	quiz_modal.hide()
	cards_tab_btn.icon = load("res://assets/ui/icons/cards.svg")
	weapons_tab_btn.icon = load("res://assets/ui/icons/weapons.svg")
	gadgets_tab_btn.icon = load("res://assets/ui/icons/gadget.svg")
	artifacts_tab_btn.icon = load("res://assets/ui/icons/artifact.svg")
	mistakes_tab_btn.icon = load("res://assets/ui/icons/corrections.svg")
	reroll_button.icon = load("res://assets/ui/icons/reroll.svg")
	next_wave_button.icon = load("res://assets/ui/icons/next_wave.svg")
	StatsManager.ink_changed.connect(_on_ink_changed)
	StatsManager.synergy_activated.connect(_on_synergy_activated)
	StatsManager.mistakes_updated.connect(update_mistakes_tab_title)

func _process(delta: float):
	if not visible:
		return
	update_mistakes_tab_title()
	if StatsManager.auto_new_tur and not auto_tur_paused and not quiz_modal.visible and current_tab == "cards":
		auto_tur_timer -= delta
		if next_wave_button:
			next_wave_button.text = "Sonraki Dalga (" + str(int(ceil(max(0.0, auto_tur_timer)))) + "s)"
		if auto_tur_timer <= 0:
			_on_next_wave_button_pressed()
	else:
		if next_wave_button:
			next_wave_button.text = "Sonraki Dalgaya Başla"

func update_mistakes_tab_title():
	if mistakes_tab_btn:
		var count = StatsManager.mistake_words.size()
		mistakes_tab_btn.text = "Hata Defteri · " + str(count)

func open_shop():
	show()
	rerolls_this_shop = 0
	quiz_modal.hide()
	current_tab = "cards"
	highlight_tab_buttons()
	auto_tur_timer = 3.0
	auto_tur_paused = not StatsManager.auto_new_tur
	update_top_bar()
	update_chapter_header()
	update_synergy_display()
	update_mistakes_tab_title()
	refresh_cards()

func update_chapter_header():
	var chapters = [
		{"title": "KARANLIK KÜTÜPHANE", "narration": "Kayıp kelimeleri rafların arasından geri çağır.", "accent": Color("c5aa72")},
		{"title": "SÖZ DEHLİZİ", "narration": "Taş kapı açılır; duvarlardaki yanlış kelimeler uyanır.", "accent": Color("99a99d")},
		{"title": "ASTRAL GÖZLEMEVİ", "narration": "Dehlizin son kapısı açılır; yıldızlar yeni sözcükler dizer.", "accent": Color("9baad1")},
		{"title": "SON SAYFA", "narration": "Kitap kapanır; boşlukta son kelimeler uyanır.", "accent": Color("bd91b7")}
	]
	var wave = StatsManager.current_wave
	var index = 0 if wave < 26 else (1 if wave < 51 else (2 if wave < 76 else 3))
	var chapter = chapters[index]
	chapter_kicker.text = "DALGA ARASI  ·  %02d TAMAMLANDI" % wave
	chapter_title.text = chapter["title"]
	chapter_narration.text = chapter["narration"]
	chapter_mark.modulate = chapter["accent"]
	var strip_style = chapter_strip.get_theme_stylebox("panel") as StyleBoxFlat
	if strip_style:
		strip_style.border_color = chapter["accent"]

func update_top_bar():
	ink_label.text = "MÜREKKEP  " + str(StatsManager.ink_count)
	wave_label.text = "DALGA " + str(StatsManager.current_wave) + " · TAMAM"

func update_synergy_display():
	if StatsManager.active_synergies.is_empty():
		synergy_label.text = "Aktif Sinerji: Yok (Aynı kelime türünden 3 kart toplayarak sinerji açabilirsin!)"
		synergy_label.add_theme_color_override("font_color", Color(0.34, 0.35, 0.31, 1))
	else:
		var syn_text = "Aktif Sinerjiler: "
		for s in StatsManager.active_synergies.keys():
			syn_text += "[" + s + "] "
		synergy_label.text = syn_text
		synergy_label.add_theme_color_override("font_color", Color(0.39, 0.22, 0.15, 1))

func refresh_cards():
	var cards: Array = WordDatabase.get_random_cards(StatsManager.current_wave, StatsManager.difficulty, 4)
	current_cards.clear()
	for card in cards:
		var priced: Dictionary = card.duplicate(true)
		priced["shop_cost"] = StatsManager.get_shop_price(int(priced.get("cost", 0)), "card")
		current_cards.append(priced)
	reroll_button.text = "YENİLE · %d" % StatsManager.get_card_reroll_cost(rerolls_this_shop)
	render_current_view()

func _on_cards_tab_pressed():
	current_tab = "cards"
	reroll_button.visible = true
	auto_tur_paused = false
	highlight_tab_buttons()
	render_current_view()

func _on_weapons_tab_pressed():
	current_tab = "weapons"
	reroll_button.visible = false
	auto_tur_paused = true
	highlight_tab_buttons()
	render_current_view()

func _on_artifacts_tab_pressed():
	current_tab = "artifacts"
	reroll_button.visible = false
	auto_tur_paused = true
	highlight_tab_buttons()
	render_current_view()

func _on_mistakes_tab_pressed():
	current_tab = "mistakes"
	reroll_button.visible = false
	auto_tur_paused = true
	highlight_tab_buttons()
	render_current_view()

func _on_gadgets_tab_pressed():
	current_tab = "gadgets"
	reroll_button.visible = false
	highlight_tab_buttons()
	render_current_view()

func highlight_tab_buttons():
	style_shop_tab(cards_tab_btn, current_tab == "cards")
	style_shop_tab(weapons_tab_btn, current_tab == "weapons")
	style_shop_tab(gadgets_tab_btn, current_tab == "gadgets")
	style_shop_tab(artifacts_tab_btn, current_tab == "artifacts")
	style_shop_tab(mistakes_tab_btn, current_tab == "mistakes")

func render_current_view():
	for child in cards_container.get_children():
		child.queue_free()

	match current_tab:
		"cards":
			render_cards()
		"weapons":
			render_weapons()
		"gadgets":
			render_gadgets()
		"artifacts":
			render_artifacts()
		"mistakes":
			render_mistakes()

func render_gadgets():
	for gadget_id in StatsManager.gadgets_catalog:
		var gadget: Dictionary = StatsManager.gadgets_catalog[gadget_id]
		var card_panel = make_shop_card_panel(Color(0.24, 0.42, 0.35, 1))
		var vbox = VBoxContainer.new()
		vbox.add_theme_constant_override("separation", 10)
		card_panel.add_child(vbox)
		var icon := TextureRect.new()
		icon.custom_minimum_size = Vector2(58, 58)
		icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		icon.texture = load("res://" + str(gadget.get("icon", "assets/sprites/gadgets/eraser_dash.png"))) as Texture2D
		icon.tooltip_text = str(gadget.get("name", gadget_id))
		vbox.add_child(icon)

		var tag = Label.new()
		tag.text = "AKTİF GEREÇ  ·  " + str(snappedf(float(gadget.get("cooldown", 0.0)), 0.1)) + "s BEKLEME"
		tag.add_theme_font_override("font", SHOP_MONO_FONT)
		tag.add_theme_font_size_override("font_size", 10)
		tag.add_theme_color_override("font_color", Color(0.32, 0.42, 0.36, 1))
		vbox.add_child(tag)

		var title = Label.new()
		title.text = str(gadget.get("name", gadget_id))
		style_shop_title(title, 18)
		title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(title)

		var desc = Label.new()
		desc.text = str(gadget.get("description", gadget.get("desc", "")))
		desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		style_shop_description(desc)
		vbox.add_child(desc)

		var spacer = Control.new()
		spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
		vbox.add_child(spacer)

		var owned: bool = gadget_id in StatsManager.owned_gadgets
		var cost := StatsManager.get_shop_price(int(gadget.get("cost", 0)), "equipment" )
		vbox.add_child(make_shop_price_label("KUŞANILDI" if StatsManager.active_gadget == gadget_id else ("SAHİP" if owned else str(cost) + "  ·  MÜREKKEP")))

		var buy_btn = Button.new()
		buy_btn.custom_minimum_size = Vector2(0, 44)
		style_shop_action(buy_btn)
		if StatsManager.active_gadget == gadget_id:
			buy_btn.text = "AKTİF GEREÇ"
			buy_btn.disabled = true
		elif owned:
			buy_btn.text = "KUŞAN"
			buy_btn.pressed.connect(func():
				StatsManager.select_gadget(gadget_id)
				update_top_bar()
				render_current_view()
			)
		elif StatsManager.ink_count < cost:
			buy_btn.text = "MÜREKKEP YETERSİZ"
			buy_btn.disabled = true
		else:
			buy_btn.text = "SATIN AL · " + str(cost)
			buy_btn.pressed.connect(func():
				if StatsManager.buy_gadget(gadget_id):
					update_top_bar()
					render_current_view()
			)
		vbox.add_child(buy_btn)
		cards_container.add_child(card_panel)

func render_cards():
	for i in range(current_cards.size()):
		var card = current_cards[i]
		var card_panel = make_shop_card_panel(Color(0.52, 0.20, 0.25, 1))

		var vbox = VBoxContainer.new()
		vbox.add_theme_constant_override("separation", 8)
		card_panel.add_child(vbox)

		# Type & Level header
		var tag_label = Label.new()
		var q_type = card.get("question_type", "meaning").capitalize()
		tag_label.text = card["type"] + "  ·  " + card["level"] + "  ·  " + q_type
		tag_label.add_theme_font_override("font", SHOP_MONO_FONT)
		tag_label.add_theme_font_size_override("font_size", 10)
		tag_label.add_theme_color_override("font_color", Color(0.46, 0.41, 0.34, 1))
		vbox.add_child(tag_label)

		# Word Title
		var title_label = Label.new()
		title_label.text = card["word"]
		style_shop_title(title_label, 22)
		vbox.add_child(title_label)

		# Description
		var desc_label = Label.new()
		desc_label.text = card["description"]
		desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		style_shop_description(desc_label)
		vbox.add_child(desc_label)

		# Example sentence
		var ex_label = Label.new()
		ex_label.text = '"' + card.get("example", "") + '"'
		ex_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		ex_label.add_theme_color_override("font_color", Color(0.45, 0.43, 0.38, 1))
		ex_label.add_theme_font_size_override("font_size", 12)
		vbox.add_child(ex_label)

		var spacer = Control.new()
		spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
		vbox.add_child(spacer)
		var cost: int = int(card.get("shop_cost", card["cost"]))
		vbox.add_child(make_shop_price_label(str(cost) + "  ·  MÜREKKEP"))

		# Buy / Quiz Button
		var buy_btn = Button.new()
		buy_btn.text = "Sınavı başlat"
		buy_btn.custom_minimum_size = Vector2(0, 42)
		style_shop_action(buy_btn)

		if StatsManager.ink_count < cost:
			buy_btn.disabled = true
			buy_btn.text = "Yetersiz Mürekkep (" + str(cost) + ")"
		else:
			var idx = i
			buy_btn.pressed.connect(func(): start_card_quiz(card, idx))

		vbox.add_child(buy_btn)
		cards_container.add_child(card_panel)

func render_weapons():
	var keys = StatsManager.weapons_catalog.keys()
	for k in keys:
		var w = StatsManager.weapons_catalog[k]
		var card_panel = make_shop_card_panel(Color(0.56, 0.37, 0.21, 1))

		var vbox = VBoxContainer.new()
		vbox.add_theme_constant_override("separation", 10)
		card_panel.add_child(vbox)

		var tag = Label.new()
		tag.text = "SİLAH  ·  TEÇHİZAT"
		tag.add_theme_font_override("font", SHOP_MONO_FONT)
		tag.add_theme_font_size_override("font_size", 10)
		tag.add_theme_color_override("font_color", Color(0.46, 0.41, 0.34, 1))
		vbox.add_child(tag)

		var title = Label.new()
		title.text = w["name"]
		style_shop_title(title, 19)
		title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(title)

		var desc = Label.new()
		desc.text = w["desc"]
		desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		style_shop_description(desc)
		vbox.add_child(desc)

		var stats_lbl = Label.new()
		stats_lbl.text = "Taban Hasar: " + str(w["damage"]) + "\nAtış Hızı: " + str(w["cooldown"]) + "s"
		stats_lbl.add_theme_font_override("font", SHOP_MONO_FONT)
		stats_lbl.add_theme_font_size_override("font_size", 11)
		stats_lbl.add_theme_color_override("font_color", Color(0.40, 0.34, 0.27, 1))
		vbox.add_child(stats_lbl)

		var spacer = Control.new()
		spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
		vbox.add_child(spacer)
		var owned_for_price = StatsManager.has_weapon(w["id"])
		var weapon_tier: int = StatsManager.get_weapon_tier(w["id"]) if owned_for_price else 0
		var upgrade_cost: int = StatsManager.get_weapon_tier_cost(w["id"]) if owned_for_price else 0
		var weapon_cost := StatsManager.get_shop_price(int(w["cost"]), "equipment")
		vbox.add_child(make_shop_price_label(("T%d / EFSANEVİ" % weapon_tier) if (owned_for_price and weapon_tier >= 4) else (("T%d → T%d  ·  %d MÜREKKEP" % [weapon_tier, weapon_tier + 1, upgrade_cost]) if owned_for_price else str(weapon_cost) + "  ·  MÜREKKEP")))

		var buy_btn = Button.new()
		buy_btn.custom_minimum_size = Vector2(0, 44)
		style_shop_action(buy_btn)
		var is_owned = StatsManager.has_weapon(w["id"])
		var w_id = w["id"]

		if is_owned:
			if weapon_tier >= 4:
				buy_btn.text = "EFSANEVİ · T4"
				buy_btn.disabled = true
				buy_btn.modulate = Color(1.3, 1.2, 0.4)
			elif StatsManager.ink_count < upgrade_cost:
				buy_btn.text = "MÜREKKEP YETERSİZ"
				buy_btn.disabled = true
			else:
				buy_btn.text = "YÜKSELT · T%d → T%d" % [weapon_tier, weapon_tier + 1]
				buy_btn.pressed.connect(func():
					if StatsManager.upgrade_weapon_tier(w_id):
						render_current_view()
						update_top_bar()
				)
		else:
			var cost = StatsManager.get_shop_price(int(w["cost"]), "equipment")
			buy_btn.text = "Kuşan"
			if StatsManager.equipped_weapons.size() >= StatsManager.max_weapon_slots:
				buy_btn.disabled = true
				buy_btn.text = "SİLAH YUVASI DOLU"
			elif StatsManager.ink_count < cost:
				buy_btn.disabled = true
				buy_btn.text = "Mürekkep yetersiz"
			else:
				buy_btn.pressed.connect(func():
					if StatsManager.spend_ink(cost):
						StatsManager.equip_weapon(w_id)
						render_current_view()
						update_top_bar()
				)
		vbox.add_child(buy_btn)
		cards_container.add_child(card_panel)

func render_artifacts():
	var keys = StatsManager.artifacts_catalog.keys()
	for k in keys:
		var art = StatsManager.artifacts_catalog[k]
		var card_panel = make_shop_card_panel(Color(0.52, 0.20, 0.25, 1))

		var vbox = VBoxContainer.new()
		vbox.add_theme_constant_override("separation", 10)
		card_panel.add_child(vbox)
		var icon := TextureRect.new()
		icon.custom_minimum_size = Vector2(58, 58)
		icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		icon.texture = load("res://" + str(art.get("icon", "assets/sprites/relics/magnifying_glass.png"))) as Texture2D
		icon.tooltip_text = str(art.get("name", k))
		vbox.add_child(icon)

		var tag = Label.new()
		tag.text = "PASİF ESER  ·  GEREÇ"
		tag.add_theme_font_override("font", SHOP_MONO_FONT)
		tag.add_theme_font_size_override("font_size", 10)
		tag.add_theme_color_override("font_color", Color(0.46, 0.41, 0.34, 1))
		vbox.add_child(tag)

		var title = Label.new()
		title.text = art["name"]
		style_shop_title(title, 18)
		title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(title)

		var desc = Label.new()
		desc.text = str(art.get("description", art.get("desc", "")))
		desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		style_shop_description(desc)
		vbox.add_child(desc)

		var spacer = Control.new()
		spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
		vbox.add_child(spacer)
		var art_id: String = str(art["id"])
		var is_owned := StatsManager.has_artifact(art_id)
		if art_id == "slot_expansion":
			is_owned = StatsManager.max_weapon_slots >= 6
			var slot_cost := StatsManager.get_shop_price(int(art["cost"]), "equipment")
			vbox.add_child(make_shop_price_label("YUVA %d / 6  ·  %d MÜREKKEP" % [StatsManager.max_weapon_slots, slot_cost]))
		else:
			var art_cost := StatsManager.get_shop_price(int(art["cost"]), "equipment")
			vbox.add_child(make_shop_price_label("SAHİP" if is_owned else str(art_cost) + "  ·  MÜREKKEP"))

		var buy_btn = Button.new()
		buy_btn.custom_minimum_size = Vector2(0, 44)
		style_shop_action(buy_btn)

		if is_owned:
			buy_btn.text = "TÜM YUVALAR AÇIK" if art_id == "slot_expansion" else "SATIN ALINDI"
			buy_btn.disabled = true
		else:
			var cost = StatsManager.get_shop_price(int(art["cost"]), "equipment")
			buy_btn.text = "Satın al"
			if StatsManager.ink_count < cost:
				buy_btn.disabled = true
				buy_btn.text = "Mürekkep yetersiz"
			else:
				var a_id = art["id"]
				buy_btn.pressed.connect(func():
					if StatsManager.buy_artifact(a_id):
						render_current_view()
						update_top_bar()
				)
		vbox.add_child(buy_btn)
		cards_container.add_child(card_panel)

func render_mistakes():
	if StatsManager.mistake_words.is_empty():
		var empty_lbl = Label.new()
		empty_lbl.text = "🎉 Tebrikler! Hata defteriniz boş.\nHiçbir soruda yanlış yapmadınız veya tüm hatalarınızı telafi ettiniz!"
		empty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		empty_lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		empty_lbl.custom_minimum_size = Vector2(600, 200)
		empty_lbl.modulate = Color(0.4, 1.0, 0.6)
		cards_container.add_child(empty_lbl)
		return

	for i in range(StatsManager.mistake_words.size()):
		var card = StatsManager.mistake_words[i]
		var card_panel = PanelContainer.new()
		card_panel.custom_minimum_size = Vector2(265, 340)

		var vbox = VBoxContainer.new()
		vbox.theme_override_constants.separation = 8

		var title_lbl = Label.new()
		title_lbl.text = "⚠️ " + card.get("word", "") + "\n[" + card.get("level", "A1") + " • " + card.get("type", "Kelime") + "]"
		title_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		title_lbl.modulate = Color(1.0, 0.5, 0.5)
		vbox.add_child(title_lbl)

		var q_lbl = Label.new()
		q_lbl.text = card.get("question", "")
		q_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		q_lbl.modulate = Color(0.9, 0.9, 0.9)
		vbox.add_child(q_lbl)

		var correct_opt = ""
		var opts = card.get("options", [])
		var c_idx = card.get("correct_index", 0)
		if c_idx >= 0 and c_idx < opts.size():
			correct_opt = opts[c_idx]

		var ans_lbl = Label.new()
		ans_lbl.text = "Doğru Yanıt: " + correct_opt
		ans_lbl.modulate = Color(0.3, 1.0, 0.4)
		vbox.add_child(ans_lbl)

		var ex_lbl = Label.new()
		ex_lbl.text = 'Örnek: "' + card.get("example", "") + '"'
		ex_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		ex_lbl.modulate = Color(0.7, 0.7, 0.7)
		vbox.add_child(ex_lbl)

		var tag = Label.new()
		tag.text = "★ Sonraki turlarda %50 indirimli ve +%75 güçlü Telafi Kartı olarak gelecektir."
		tag.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		tag.modulate = Color(1.0, 0.85, 0.3)
		vbox.add_child(tag)

		card_panel.add_child(vbox)
		cards_container.add_child(card_panel)

func start_card_quiz(card: Dictionary, index: int):
	active_quiz_card = card
	active_card_index = index
	auto_tur_paused = true

	quiz_modal.show()
	quiz_result_label.text = ""
	quiz_continue_btn.hide()

	var q_type = card.get("question_type", "meaning").capitalize()
	quiz_word_title.text = card["word"] + " [" + card["type"] + " • " + q_type + "] · HEDEF " + StatsManager.learning_level
	quiz_question.text = card["question"]
	quiz_example.text = 'Örnek: "' + card.get("example", "") + '"\n' + str(card.get("buff_name", "Kelime Buff’ı")) + " · " + str(card.get("description", "")) + "\n" + str(card.get("buff_meaning_link", "Bu buff kelimenin anlam temasından gelir.")) + "\nUYARI: Yanlış bıraktığın kelimeler boss turunda anlamlarına uygun düşman olarak geri döner."

	for child in options_container.get_children():
		child.queue_free()

	var opts = card["options"]
	displayed_option_indices.clear()
	for i in range(opts.size()):
		displayed_option_indices.append(i)
	displayed_option_indices.shuffle()
	var option_labels = ["A", "B", "C", "D"]
	for i in range(displayed_option_indices.size()):
		var original_index = displayed_option_indices[i]
		var btn = Button.new()
		var option_label = option_labels[i] if i < option_labels.size() else str(i + 1)
		btn.text = option_label + ") " + str(opts[original_index])
		btn.custom_minimum_size = Vector2(0, 44)
		var display_index = i
		btn.pressed.connect(func(): answer_quiz(display_index))
		options_container.add_child(btn)

func answer_quiz(selected_index: int):
	for child in options_container.get_children():
		if child is Button:
			child.disabled = true

	if selected_index < 0 or selected_index >= displayed_option_indices.size():
		return
	var is_correct = (displayed_option_indices[selected_index] == active_quiz_card["correct_index"])
	var learning_feedback := StatsManager.record_learning_answer(is_correct)
	var base_cost = int(active_quiz_card.get("shop_cost", active_quiz_card["cost"]))
	var is_redemption = active_quiz_card.get("is_redemption", false)

	if is_correct:
		var discount_cost = int(ceil(base_cost * 0.5))
		if is_redemption:
			StatsManager.remove_mistake(active_quiz_card.get("word", ""))
			quiz_result_label.text = "TELAFİ BAŞARILI\nHata Defteri temizlendi.\n%50 indirim ve +%50 güç kazandın.\nÖdenen: " + str(discount_cost) + " mürekkep"
		else:
			quiz_result_label.text = "Doğru cevap\n%50 indirim ve +%50 güç kazandın.\nÖdenen: " + str(discount_cost) + " mürekkep"
		quiz_result_label.modulate = Color(0.2, 1.0, 0.4)

		StatsManager.spend_ink(discount_cost)
		StatsManager.apply_card_upgrade(active_quiz_card, true)
		quiz_result_label.text += "\nANLAM HAFIZASI: " + str(active_quiz_card.get("meaning_tr", active_quiz_card["options"][active_quiz_card["correct_index"]]))
	else:
		StatsManager.record_mistake(active_quiz_card)
		quiz_result_label.text = "YANLIŞ CEVAP. Doğru seçenek: " + active_quiz_card["options"][active_quiz_card["correct_index"]] + "\nHata Defterine eklendi; telafi kartı olarak geri dönebilir.\nKart normal fiyattan alındı: " + str(base_cost) + " Mürekkep"
		quiz_result_label.modulate = Color(1.0, 0.3, 0.3)

		StatsManager.spend_ink(base_cost)
		StatsManager.apply_card_upgrade(active_quiz_card, false)
		quiz_result_label.text += "\nANLAM HAFIZASI: " + str(active_quiz_card.get("meaning_tr", active_quiz_card["options"][active_quiz_card["correct_index"]]))

	if not learning_feedback.is_empty():
		quiz_result_label.text += "\n" + learning_feedback

	if active_card_index >= 0 and active_card_index < current_cards.size():
		current_cards.remove_at(active_card_index)

	quiz_continue_btn.show()

func _on_continue_button_pressed():
	quiz_modal.hide()
	auto_tur_timer = 3.0
	auto_tur_paused = not StatsManager.auto_new_tur
	update_top_bar()
	update_synergy_display()
	render_current_view()

func _on_reroll_button_pressed():
	var cost := StatsManager.get_card_reroll_cost(rerolls_this_shop)
	if StatsManager.spend_ink(cost):
		rerolls_this_shop += 1
		refresh_cards()
		update_top_bar()

func _on_next_wave_button_pressed():
	hide()
	StatsManager.current_wave += 1
	emit_signal("shop_closed")

func _on_ink_changed(_new_ink: int):
	update_top_bar()

func _on_synergy_activated(_syn_name: String, _syn_desc: String):
	update_synergy_display()
