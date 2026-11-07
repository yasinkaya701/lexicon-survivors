extends Node


signal hp_changed(current_hp: float, max_hp: float)
signal ink_changed(current_ink: int)
signal wave_changed(current_wave: int)
signal kill_count_changed(total_kills: int)
signal player_died()
signal synergy_activated(synergy_name: String, description: String)
signal weapon_equipped(weapon_id: String)
signal weapon_switched(weapon_id: String, weapon_index: int)
signal weapon_tier_upgraded(weapon_id: String, tier: int)
signal artifact_purchased(artifact_id: String)
signal character_selected(char_id: String)
signal difficulty_selected(diff_id: String)
signal game_speed_changed(speed: float)
signal auto_new_tur_changed(enabled: bool)
signal auto_new_run_changed(enabled: bool)
signal floating_text_requested(pos: Vector2, text: String, color: Color, size: int)
signal screen_shake_requested(duration: float, intensity: float)
signal tactical_alert_requested(title: String, desc: String)
signal mistakes_updated()
signal character_progress_changed(char_id: String)

# Configuration & Choices
var selected_character: String = "inky"
var difficulty: String = "normal"
var learning_level: String = "A1"
var learning_answers: Array = []
const LEARNING_PROFILE_PATH := "user://learning_profile.cfg"

# Core player stats
var max_hp: float = 100.0
var hp: float = 100.0
var move_speed: float = 230.0
var damage_mult: float = 1.0
var attack_speed_mult: float = 1.0
var pickup_radius: float = 140.0
var projectile_count: int = 1
var pierce_count: int = 1
var armor: float = 0.0 # Damage reduction percentage (0.0 - 0.65)
var crit_chance: float = 0.05
var ink_mult: float = 1.0
var game_economy: Dictionary = {}
const DEFAULT_STAT_LIMITS := {"attack_speed_mult": 2.75, "attack_speed_soft_cap": 2.1, "armor": 0.65, "armor_soft_cap": 0.45}
var gadget_cooldown_base: float = 4.0
var gadget_cooldown_mult: float = 1.0
var max_weapon_slots: int = 4
var slot_expansion_count: int = 0
var utility_gadget_aliases: Dictionary = {}
var marginalia_hit_state: Dictionary = {}
var mnemonic_used_wave: int = -1

# Game progress
var current_wave: int = 1
var max_waves: int = 100
var ink_count: int = 0
var kill_count: int = 0
var words_learned: Array = []
var active_synergies: Dictionary = {}
const SKILL_TREE_PATH := "res://assets/data/character_skill_trees.json"
const CHARACTER_PROGRESS_PATH := "user://character_progress.cfg"
var skill_tree_catalog: Dictionary = {}
var character_progress: Dictionary = {}

# Equipment & Inventory
var equipped_weapons: Array = ["quill_blaster"]
var active_weapon_index: int = 0
var weapon_tiers: Dictionary = {"quill_blaster": 1}
var artifacts_owned: Array = []

# Game Speed, Automation & Mobile Controls
var game_speed: float = 1.0
var game_speed_options: Array = [1.0, 1.5, 2.0, 3.0, 0.5]
var auto_new_tur: bool = true
var auto_new_run: bool = true
var mistake_words: Array = []
var touch_input_direction: Vector2 = Vector2.ZERO
var touch_controls_enabled: bool = false

# Character definitions
var characters: Dictionary = {
	"inky": {
		"id": "inky",
		"name": "Inky",
		"title": "Mürekkep Kâtibi",
		"desc": "Standart dengeli nitelikler. Güvenilir ve çok yönlü kelime koruyucusu.",
		"hp": 125.0,
		"move_speed": 235.0,
		"damage_mult": 1.05,
		"attack_speed_mult": 1.05,
		"armor": 0.10,
		"crit_chance": 0.10,
		"starting_weapon": "quill_blaster",
		"starting_gadget": "dash",
		"passive": "Mürekkep Ustası: Mürekkep toplama menzili ve öğrenme dengesi tam.",
		"color": Color(0.9, 0.95, 1.0)
	},
	"quillmaster": {
		"id": "quillmaster",
		"name": "Quillmaster",
		"title": "Zaman Kalemşörü",
		"desc": "+%35 Saldırı Hızı, +%20 Hasar ve +30 Hız! Seri kritik vuruşlar.",
		"hp": 95.0,
		"move_speed": 265.0,
		"damage_mult": 1.25,
		"attack_speed_mult": 1.35,
		"armor": 0.0,
		"crit_chance": 0.20,
		"starting_weapon": "syllable_shotgun",
		"starting_gadget": "time_stop",
		"passive": "Seri Kalem: Başlangıçtan itibaren Hece Pompalısı ve yüksek atış hızı.",
		"color": Color(1.0, 0.88, 0.4)
	},
	"word_knight": {
		"id": "word_knight",
		"name": "Word Knight",
		"title": "Sözlük Şövalyesi",
		"desc": "+55 Maksimum Can (180 HP), +%30 Hasar Direnci (Zırh), sağlam savunma kalkanı.",
		"hp": 180.0,
		"move_speed": 210.0,
		"damage_mult": 1.15,
		"attack_speed_mult": 0.95,
		"armor": 0.30,
		"crit_chance": 0.08,
		"starting_weapon": "dictionary_blade",
		"starting_gadget": "shield",
		"passive": "Sözlük Zırhı: Düşman darbelerine karşı dayanıklı ve yakın dövüş kalkanı.",
		"color": Color(0.45, 0.9, 0.65)
	},
	"rune_sorceress": {
		"id": "rune_sorceress",
		"name": "Rune Sorceress",
		"title": "Rün Büyücüsü",
		"desc": "Büyülü rünlerle geniş alan hasarı, +%30 Hasar Çarpanı ve Rün Küresi.",
		"hp": 105.0,
		"move_speed": 245.0,
		"damage_mult": 1.30,
		"attack_speed_mult": 1.10,
		"armor": 0.05,
		"crit_chance": 0.15,
		"starting_weapon": "rune_orb",
		"starting_gadget": "ink_bomb",
		"passive": "Rün İnfilakı: Düşmanları alt ettiğinde sıçrayan rün patlamaları.",
		"color": Color(0.75, 0.5, 0.98)
	},
	"lexicon_alchemist": {
		"id": "lexicon_alchemist",
		"name": "Alchemist",
		"title": "Arşiv Simyacısı",
		"desc": "+%15 Mürekkep Çarpanı, Gramer Mıknatısı ve Mürekkep Alevi.",
		"hp": 115.0,
		"move_speed": 240.0,
		"damage_mult": 1.10,
		"attack_speed_mult": 1.20,
		"armor": 0.12,
		"crit_chance": 0.12,
		"starting_weapon": "ink_flamethrower",
		"starting_gadget": "magnet",
		"passive": "Simya Özütü: Her dalga başında +10 Mürekkep, iksirler +%50 etkili.",
		"color": Color(0.2, 0.83, 0.6)
	},
	"shadow_lexicographer": {
		"id": "shadow_lexicographer",
		"name": "Shadow Scribe",
		"title": "Gölge Hattatı",
		"desc": "290 Hız, +%35 Kritik Vuruş Şansı ve Hattat Katanası ile seri kesişler.",
		"hp": 90.0,
		"move_speed": 290.0,
		"damage_mult": 1.45,
		"attack_speed_mult": 1.25,
		"armor": 0.0,
		"crit_chance": 0.35,
		"starting_weapon": "calligraphy_katana",
		"starting_gadget": "dash",
		"passive": "Kritik İnfaz: Kritik vuruşlar %250 hasar verir ve düşmanı yavaşlatır.",
		"color": Color(0.96, 0.25, 0.37)
	}
}

# Difficulty definitions
var difficulties: Dictionary = {
	"easy": {
		"id": "easy",
		"name": "A1–A2",
		"desc": "Düşmanlar yavaş (%-25), canları az (%-35). Başlangıç canı +40 HP. Rahat öğrenme ortamı.",
		"enemy_speed_mult": 0.75,
		"enemy_hp_mult": 0.65,
		"enemy_damage_mult": 0.60,
		"player_hp_bonus": 40.0,
		"ink_bonus_mult": 1.05
	},
	"normal": {
		"id": "normal",
		"name": "B1",
		"desc": "Dengeli arcade roguelite. Akıcı dalga temposu, toplanabilir can parşömenleri.",
		"enemy_speed_mult": 0.90,
		"enemy_hp_mult": 0.85,
		"enemy_damage_mult": 0.80,
		"player_hp_bonus": 15.0,
		"ink_bonus_mult": 1.0
	},
	"hard": {
		"id": "hard",
		"name": "B2–C1",
		"desc": "Akademik arena! Çevik düşmanlar, yüksek canlar (%+15), sınav tuzakları.",
		"enemy_speed_mult": 1.08,
		"enemy_hp_mult": 1.15,
		"enemy_damage_mult": 1.15,
		"player_hp_bonus": 0.0,
		"ink_bonus_mult": 1.10
	}
}

# Weapons Catalog
var weapons_catalog: Dictionary = {
	"quill_blaster": {
		"id": "quill_blaster",
		"name": "İğne Ucu Kalem",
		"desc": "Uzun işaret hedefi sabitler; gelişince yankı iğnesi iki yakındaki rakibe sıçrar.",
		"cost": 12,
		"cooldown": 0.8,
		"damage": 22.0
	},
	"syllable_shotgun": {
		"id": "syllable_shotgun",
		"name": "Hece Saçması",
		"desc": "Altı saçmayı dar bir yelpazede toplar; yakındaki hedefleri sendeletir.",
		"cost": 16,
		"cooldown": 1.2,
		"damage": 16.0
	},
	"lexicon_beam": {
		"id": "lexicon_beam",
		"name": "Prizma Işını",
		"desc": "Kısa şarjdan sonra geniş satır ışınıyla düşman hattını süpürür.",
		"cost": 20,
		"cooldown": 0.55,
		"damage": 18.0
	},
	"punctuation_bomb": {
		"id": "punctuation_bomb",
		"name": "Ünlem Mayını",
		"desc": "Kısa fitilli mayın geniş alanda patlar ve zeminde mürekkep tehlikesi bırakır.",
		"cost": 17,
		"cooldown": 1.35,
		"damage": 38.0
	},
	"dictionary_blade": {
		"id": "dictionary_blade",
		"name": "Sözlük Muhafızı",
		"desc": "Geniş savunma yayı mermileri savuşturur; zamanlı savuşturma karşı vuruş açar.",
		"cost": 18,
		"cooldown": 0.75,
		"damage": 38.0
	},
	"crossword_crossbow": {
		"id": "crossword_crossbow",
		"name": "Bulmaca Balistası",
		"desc": "Delen ağır ok hedefi daha uzun sabitler; gelişince çarpma noktasında ızgara parçaları saçar.",
		"cost": 22,
		"cooldown": 0.95,
		"damage": 34.0
	},
	"hyphen_boomerang": {
		"id": "hyphen_boomerang",
		"name": "Tire Yörüngesi",
		"desc": "Uzun kavisle çıkar, dönüş yolunda yeniden vurur ve gelişince kısa süre yörüngede kalır.",
		"cost": 20,
		"cooldown": 1.10,
		"damage": 28.0
	},
	"ink_flamethrower": {
		"id": "ink_flamethrower",
		"name": "Mürekkep Ocağı",
		"desc": "Geniş alev yelpazesiyle yakar; soğuma arasında yanık etkisi sürer.",
		"cost": 24,
		"cooldown": 0.12,
		"damage": 9.5
	},
	"thesaurus_rocket": {
		"id": "thesaurus_rocket",
		"name": "Eşanlamlı Harcı",
		"desc": "Hedefe daha sıkı kilitlenen roket, geniş küme patlamasıyla çevresini geri savurur.",
		"cost": 26,
		"cooldown": 1.60,
		"damage": 70.0
	},
	"quote_pistols": {
		"id": "quote_pistols",
		"name": "Tırnak Salvosu",
		"desc": "İki tabanca seri dönüşümlü salvo atar; gelişince üçüncü atış ve işaretli sekme eklenir.",
		"cost": 22,
		"cooldown": 0.28,
		"damage": 17.0
	},
	"calligraphy_katana": {
		"id": "calligraphy_katana",
		"name": "Kalem Hilali",
		"desc": "Geniş hazırlıkla ileri hilal keser; gelişince işaretli hedefe son vuruş uygular.",
		"cost": 25,
		"cooldown": 0.65,
		"damage": 42.0
	},
	"scroll_turret": {
		"id": "scroll_turret",
		"name": "Raf Bekçisi",
		"desc": "On dört saniye kalan tomar tareti, seri atışlarını tek hedefe odaklar.",
		"cost": 28,
		"cooldown": 2.2,
		"damage": 26.0
	},
	"rune_orb": {
		"id": "rune_orb",
		"name": "Atıf Küresi",
		"desc": "Rün dört hedefe kadar sıçrar; son sıçrama küçük bir patlama bırakır.",
		"cost": 24,
		"cooldown": 1.1,
		"damage": 36.0
	},
	"grammar_sniper": {
		"id": "grammar_sniper",
		"name": "Zayıf Nokta Rayı",
		"desc": "Zırh delen atış liderleri iki kat cezalandırır; gelişince üç hedefe kadar zincirlenir.",
		"cost": 30,
		"cooldown": 1.9,
		"damage": 95.0
	},
	"word_loom": {
		"id": "word_loom",
		"name": "Dipnot Tezgâhı",
		"desc": "Hedef noktaya mürekkep ipliği kurar; alandaki düşmanları yavaşlatıp aralıklarla yaralar.",
		"cost": 25,
		"cooldown": 2.1,
		"damage": 20.0
	}
}

# Artifacts Catalog
var artifacts_catalog: Dictionary = {
	"magnifying_glass": {
		"id": "magnifying_glass",
		"name": "Büyüteç (Magnifying Glass)",
		"desc": "+%15 Kritik Şans & +%20 Mermi Hasarı",
		"cost": 14,
		"stats": {"crit_chance": 0.15, "damage": 0.20}
	},
	"golden_inkpot": {
		"id": "golden_inkpot",
		"name": "Altın Mürekkep Hokkası (Golden Inkpot)",
		"desc": "Düşmanlardan +%50 daha fazla mürekkep düşer.",
		"cost": 15,
		"stats": {"ink_mult": 0.50}
	},
	"scholar_boots": {
		"id": "scholar_boots",
		"name": "Bilgin Çizmeleri (Scholar Boots)",
		"desc": "+40 Hareket Hızı",
		"cost": 12,
		"stats": {"move_speed": 40.0}
	},
	"grammar_guide": {
		"id": "grammar_guide",
		"name": "Dilbilgisi Kılavuzu (Grammar Guide)",
		"desc": "+20 Maksimum Can & +%15 Hasar Direnci (Zırh)",
		"cost": 14,
		"stats": {"max_hp": 20.0, "armor": 0.15}
	},
	"quantum_eraser": {
		"id": "quantum_eraser",
		"name": "Kuantum Silgi (Quantum Eraser)",
		"desc": "Silgi Atılımı (Gadget) bekleme süresini %35 azaltır.",
		"cost": 12,
		"stats": {"gadget_cooldown_mult": -0.35}
	},
	"diligence_coffee": {
		"id": "diligence_coffee",
		"name": "Çalışkanlık Kahvesi (Coffee of Diligence)",
		"desc": "+%25 Saldırı Hızı",
		"cost": 13,
		"stats": {"attack_speed": 0.25}
	}
}

# Gadgets Catalog
var gadgets_catalog: Dictionary = {
	"dash": {
		"id": "dash",
		"name": "Silgi Atılımı (Eraser Dash)",
		"desc": "Anlık ileri atılma, 0.4s hasar görmezlik ve temas edilen düşmanlara 50 silgi hasarı.",
		"cooldown": 4.0,
		"cost": 0
	},
	"ink_bomb": {
		"id": "ink_bomb",
		"name": "Mürekkep Kıyameti (Ink Cataclysm)",
		"desc": "Tüm ekrandaki düşmanlara 120 patlama hasarı verir ve 3 saniye körleştirir.",
		"cooldown": 12.0,
		"cost": 25
	},
	"time_stop": {
		"id": "time_stop",
		"name": "Kronos Virgülü (Chrono Comma)",
		"desc": "Zamanı 3.5 saniye boyunca %80 yavaşlatır.",
		"cooldown": 14.0,
		"cost": 28
	},
	"shield": {
		"id": "shield",
		"name": "Leksikon Kalkanı (Lexicon Aegis)",
		"desc": "5 saniye boyunca toplam 100 hasarı emen koruma alanı.",
		"cooldown": 10.0,
		"cost": 22
	},
	"magnet": {
		"id": "magnet",
		"name": "Gramer Mıknatısı (Grammar Magnet)",
		"desc": "Haritadaki mürekkep damlalarını ve toplanabilir rünleri kendine çeker.",
		"cooldown": 8.0,
		"cost": 18
	}
}
var active_gadget: String = "eraser_dash"
var owned_gadgets: Array = ["eraser_dash"]

func _ready() -> void:
	load_weapon_economy()
	load_utility_items()
	load_game_economy()
	load_character_skill_trees()
	load_character_progress()
	load_learning_profile()

func load_learning_profile() -> void:
	var config := ConfigFile.new()
	if config.load(LEARNING_PROFILE_PATH) != OK:
		return
	var saved := str(config.get_value("learning", "level", "A1"))
	if saved in ["A1", "A2", "B1", "B2", "C1", "C2"]:
		learning_level = saved

func set_learning_level(level: String) -> void:
	if level not in ["A1", "A2", "B1", "B2", "C1", "C2"]:
		return
	learning_level = level
	var config := ConfigFile.new()
	config.set_value("learning", "level", level)
	config.save(LEARNING_PROFILE_PATH)

func record_learning_answer(is_correct: bool) -> String:
	learning_answers.append(is_correct)
	if learning_answers.size() < 10:
		return ""
	var correct_count := 0
	for answer in learning_answers:
		if bool(answer):
			correct_count += 1
	learning_answers.clear()
	var levels := ["A1", "A2", "B1", "B2", "C1", "C2"]
	var old_index := levels.find(learning_level)
	var next_index := old_index
	if correct_count >= 8:
		next_index = mini(levels.size() - 1, old_index + 1)
	elif correct_count < 5:
		next_index = maxi(0, old_index - 1)
	if next_index != old_index:
		set_learning_level(levels[next_index])
		return "Son 10 soruda %d doğru · Yeni kelime düzeyi: %s." % [correct_count, learning_level]
	return "Son 10 soruda %d doğru · %s düzeyinde devam." % [correct_count, learning_level]

func load_character_skill_trees() -> bool:
	var file := FileAccess.open(SKILL_TREE_PATH, FileAccess.READ)
	if file == null:
		push_error("Missing character skill tree data: %s" % SKILL_TREE_PATH)
		return false
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary or int(parsed.get("schema_version", 0)) != 1 or not parsed.get("characters", {}) is Dictionary:
		push_error("Invalid character skill tree data")
		return false
	skill_tree_catalog = parsed
	return true

func load_character_progress() -> void:
	var config := ConfigFile.new()
	if config.load(CHARACTER_PROGRESS_PATH) == OK:
		var saved: Variant = config.get_value("progress", "characters", {})
		if saved is Dictionary:
			character_progress = saved
	for char_id in characters:
		var record: Variant = character_progress.get(char_id, {})
		if not record is Dictionary:
			record = {}
		character_progress[char_id] = {
			"xp": maxi(0, int(record.get("xp", 0))),
			"level": clampi(int(record.get("level", 1)), 1, _max_character_level()),
			"skill_points": maxi(0, int(record.get("skill_points", 0))),
			"unlocked_skills": record.get("unlocked_skills", []) if record.get("unlocked_skills", []) is Array else []
		}

func save_character_progress() -> void:
	var config := ConfigFile.new()
	config.set_value("progress", "characters", character_progress)
	var error := config.save(CHARACTER_PROGRESS_PATH)
	if error != OK:
		push_error("Could not save character progression (%s)" % error)

func _max_character_level() -> int:
	return maxi(1, int(skill_tree_catalog.get("max_character_level", 18)))

func get_character_progress(char_id: String) -> Dictionary:
	if not character_progress.has(char_id):
		character_progress[char_id] = {"xp": 0, "level": 1, "skill_points": 0, "unlocked_skills": []}
	return character_progress[char_id]

func get_xp_required_for_next_level(level: int) -> int:
	# A 100-wave run typically earns several thousand XP; the curve rewards a
	# focused run without granting every capstone in a single ordinary clear.
	return 140 + maxi(1, level) * 48

func add_character_xp(amount: int) -> void:
	if amount <= 0:
		return
	var progress := get_character_progress(selected_character)
	if int(progress["level"]) >= _max_character_level():
		return
	progress["xp"] = int(progress["xp"]) + amount
	var level := int(progress["level"])
	while level < _max_character_level() and int(progress["xp"]) >= get_xp_required_for_next_level(level):
		progress["xp"] = int(progress["xp"]) - get_xp_required_for_next_level(level)
		level += 1
		progress["skill_points"] = int(progress["skill_points"]) + int(skill_tree_catalog.get("skill_points_per_level", 1))
	progress["level"] = level
	character_progress[selected_character] = progress
	save_character_progress()
	character_progress_changed.emit(selected_character)

func _find_skill_node(char_id: String, node_id: String) -> Dictionary:
	var character_tree: Dictionary = skill_tree_catalog.get("characters", {}).get(char_id, {})
	for branch in character_tree.get("branches", []):
		for node in branch.get("nodes", []):
			if str(node.get("id", "")) == node_id:
				return node
	return {}

func can_unlock_character_skill(char_id: String, node_id: String) -> bool:
	var node := _find_skill_node(char_id, node_id)
	if node.is_empty():
		return false
	var progress := get_character_progress(char_id)
	var unlocked: Array = progress.get("unlocked_skills", [])
	if unlocked.has(node_id) or int(progress.get("level", 1)) < int(node.get("required_level", 1)) or int(progress.get("skill_points", 0)) < int(node.get("point_cost", 1)):
		return false
	for prerequisite in node.get("prerequisites", []):
		if not unlocked.has(prerequisite):
			return false
	return true

func unlock_character_skill(char_id: String, node_id: String) -> bool:
	if not can_unlock_character_skill(char_id, node_id):
		return false
	var node := _find_skill_node(char_id, node_id)
	var progress := get_character_progress(char_id)
	progress["skill_points"] = int(progress["skill_points"]) - int(node.get("point_cost", 1))
	var unlocked: Array = progress.get("unlocked_skills", []).duplicate()
	unlocked.append(node_id)
	progress["unlocked_skills"] = unlocked
	character_progress[char_id] = progress
	save_character_progress()
	character_progress_changed.emit(char_id)
	return true

func _apply_character_skill_effects(char_id: String) -> void:
	var progress := get_character_progress(char_id)
	var unlocked: Array = progress.get("unlocked_skills", [])
	var character_tree: Dictionary = skill_tree_catalog.get("characters", {}).get(char_id, {})
	for branch in character_tree.get("branches", []):
		for node in branch.get("nodes", []):
			if not unlocked.has(node.get("id", "")):
				continue
			var effects: Dictionary = node.get("effects", {})
			for effect_key in effects:
				var value := float(effects[effect_key])
				match effect_key:
					"damage": damage_mult += value
					"attack_speed": add_attack_speed(value)
					"armor": add_armor(value)
					"move_speed": move_speed += value
					"max_hp":
						max_hp += value
						hp += value
					"crit_chance": crit_chance = clampf(crit_chance + value, 0.0, 0.8)
					"projectile_count": projectile_count = mini(projectile_count + int(value), 6)
					"pierce": pierce_count = mini(pierce_count + int(value), 16)
					"pickup_radius": pickup_radius += value

func load_game_economy() -> bool:
	var file := FileAccess.open("res://assets/data/game_economy.json", FileAccess.READ)
	if file == null:
		push_error("Missing shared game economy data")
		return false
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary or int(parsed.get("version", 0)) != 1:
		push_error("Invalid shared game economy data")
		return false
	var rewards: Variant = parsed.get("enemy_ink_rewards", {})
	if not rewards is Dictionary or rewards.size() != 18:
		push_error("Shared game economy must define all 18 enemy rewards")
		return false
	var boss_reward: Variant = parsed.get("boss_wave_reward", {})
	if not boss_reward is Dictionary or float(boss_reward.get("base", -1.0)) < 0.0 or float(boss_reward.get("per_wave", -1.0)) < 0.0:
		push_error("Shared game economy must define a valid boss wave reward")
		return false
	for enemy_type in rewards:
		if int(rewards[enemy_type]) <= 0:
			push_error("Enemy %s has an invalid ink reward" % enemy_type)
			return false
	game_economy = parsed
	var shared_multipliers: Dictionary = parsed.get("difficulty_ink_multiplier", {})
	for diff_id in difficulties:
		if shared_multipliers.has(diff_id):
			difficulties[diff_id]["ink_bonus_mult"] = float(shared_multipliers[diff_id])
	return true

func get_stat_limit(key: String) -> float:
	var limits: Dictionary = game_economy.get("stat_limits", {})
	return float(limits.get(key, DEFAULT_STAT_LIMITS.get(key, 1.0)))

func add_attack_speed(value: float) -> void:
	var cap := get_stat_limit("attack_speed_mult")
	var soft := minf(cap, get_stat_limit("attack_speed_soft_cap"))
	var current := clampf(attack_speed_mult, 0.0, cap)
	var direct := clampf(value, 0.0, maxf(0.0, soft - current))
	attack_speed_mult = minf(cap, current + direct + maxf(0.0, value - direct) * 0.35)

func add_armor(value: float) -> void:
	var cap := get_stat_limit("armor")
	var soft := minf(cap, get_stat_limit("armor_soft_cap"))
	var current := clampf(armor, 0.0, cap)
	var direct := clampf(value, 0.0, maxf(0.0, soft - current))
	armor = minf(cap, current + direct + maxf(0.0, value - direct) * 0.35)

func get_shop_price(base_cost: int, category: String = "equipment") -> int:
	var rates: Dictionary = game_economy.get("shop_pricing", {})
	var wave_rate := float(rates.get(category + "_wave_rate", 0.1))
	return maxi(0, ceili(float(base_cost) * (1.0 + wave_rate * float(maxi(0, current_wave - 1)))))

func get_card_reroll_cost(rerolls_this_shop: int) -> int:
	var rates: Dictionary = game_economy.get("shop_pricing", {})
	var wave_rate := float(rates.get("reroll_wave_rate", 0.15))
	var repeat_rate := float(rates.get("repeat_reroll_rate", 0.65))
	return ceili(5.0 * (1.0 + wave_rate * float(maxi(0, current_wave - 1))) * (1.0 + repeat_rate * float(maxi(0, rerolls_this_shop))))

func get_enemy_ink_reward(enemy_type: String, fallback: int = 1) -> int:
	var rewards: Dictionary = game_economy.get("enemy_ink_rewards", {})
	return int(rewards.get(enemy_type, fallback))

func get_boss_wave_reward(wave: int) -> int:
	var reward: Dictionary = game_economy.get("boss_wave_reward", {})
	return roundi(float(reward.get("base", 55.0)) + float(reward.get("per_wave", 1.0)) * float(wave))

func load_weapon_economy() -> bool:
	var file := FileAccess.open("res://assets/data/weapon_archetypes.json", FileAccess.READ)
	if file == null:
		push_error("Missing shared weapon balance data")
		return false
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary or int(parsed.get("version", 0)) != 1:
		push_error("Invalid shared weapon balance data")
		return false
	var shared_weapons: Dictionary = parsed.get("weapons", {})
	for weapon_id in weapons_catalog:
		var economy: Variant = shared_weapons.get(weapon_id, {}).get("economy", {})
		if not economy is Dictionary or economy.is_empty():
			push_error("Weapon %s has no shared balance record" % weapon_id)
			return false
		weapons_catalog[weapon_id]["cost"] = int(economy.get("cost", weapons_catalog[weapon_id].get("cost", 0)))
		weapons_catalog[weapon_id]["cooldown"] = float(economy.get("cooldown", weapons_catalog[weapon_id].get("cooldown", 0.8)))
		weapons_catalog[weapon_id]["damage"] = float(economy.get("damage", weapons_catalog[weapon_id].get("damage", 10.0)))
	return true

func load_utility_items() -> bool:
	var file := FileAccess.open("res://assets/data/utility_items.json", FileAccess.READ)
	if file == null:
		return false
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary or int(parsed.get("version", 0)) != 1:
		return false
	var gadgets: Dictionary = parsed.get("gadgets", {})
	var relics: Dictionary = parsed.get("relics", {})
	if gadgets.is_empty() or relics.is_empty():
		return false
	utility_gadget_aliases = parsed.get("gadget_aliases", {}).duplicate(true)
	gadgets_catalog.clear()
	for gadget_id in gadgets:
		var item: Dictionary = gadgets[gadget_id].duplicate(true)
		item["id"] = str(gadget_id)
		item["desc"] = str(item.get("description", ""))
		gadgets_catalog[str(gadget_id)] = item
	artifacts_catalog.clear()
	for relic_id in relics:
		var item: Dictionary = relics[relic_id].duplicate(true)
		item["id"] = str(relic_id)
		item["desc"] = str(item.get("description", ""))
		artifacts_catalog[str(relic_id)] = item
	_normalize_gadget_state()
	return true

func normalize_gadget_id(gadget_id: String) -> String:
	var normalized := gadget_id
	var hops := 0
	while utility_gadget_aliases.has(normalized) and hops < 8:
		normalized = str(utility_gadget_aliases[normalized])
		hops += 1
	return normalized

func _normalize_gadget_state() -> void:
	var normalized_owned: Array = []
	for raw_id in owned_gadgets:
		var normalized_id := normalize_gadget_id(str(raw_id))
		if gadgets_catalog.has(normalized_id) and not normalized_owned.has(normalized_id):
			normalized_owned.append(normalized_id)
	owned_gadgets = normalized_owned
	active_gadget = normalize_gadget_id(active_gadget)
	if not owned_gadgets.has(active_gadget):
		active_gadget = str(owned_gadgets[0]) if not owned_gadgets.is_empty() else "eraser_dash"

signal gadget_activated(gadget_id: String)
signal gadget_switched(gadget_id: String)

func select_gadget(gadget_id: String) -> bool:
	gadget_id = normalize_gadget_id(gadget_id)
	if gadget_id in owned_gadgets and gadgets_catalog.has(gadget_id):
		active_gadget = gadget_id
		emit_signal("gadget_switched", gadget_id)
		return true
	return false

func buy_gadget(gadget_id: String) -> bool:
	gadget_id = normalize_gadget_id(gadget_id)
	if not gadgets_catalog.has(gadget_id) or gadget_id in owned_gadgets:
		return false
	var cost = get_shop_price(int(gadgets_catalog[gadget_id]["cost"]), "equipment")
	if spend_ink(cost):
		owned_gadgets.append(gadget_id)
		active_gadget = gadget_id
		emit_signal("gadget_switched", gadget_id)
		return true
	return false

func select_character(char_id: String):
	if characters.has(char_id):
		selected_character = char_id
		emit_signal("character_selected", char_id)

func set_difficulty(diff_id: String):
	if difficulties.has(diff_id):
		difficulty = diff_id
		emit_signal("difficulty_selected", diff_id)

func reset():
	learning_answers.clear()
	if game_economy.is_empty():
		load_game_economy()
	var char_data = characters.get(selected_character, characters["inky"])
	var diff_data = difficulties.get(difficulty, difficulties["normal"])

	max_hp = char_data["hp"] + diff_data.get("player_hp_bonus", 0.0)
	hp = max_hp
	move_speed = char_data["move_speed"]
	damage_mult = char_data["damage_mult"]
	attack_speed_mult = char_data["attack_speed_mult"]
	armor = char_data["armor"]
	crit_chance = char_data["crit_chance"]
	pickup_radius = 140.0
	projectile_count = 1
	pierce_count = 1
	_apply_character_skill_effects(selected_character)

	ink_mult = float(diff_data.get("ink_bonus_mult", 1.0))
	if selected_character == "lexicon_alchemist":
		ink_mult *= float(game_economy.get("difficulty_ink_multiplier", {}).get("alchemist_character", 1.15))
	gadget_cooldown_base = 4.0
	gadget_cooldown_mult = 1.0
	if is_inside_tree():
		var player := get_tree().get_first_node_in_group("player")
		if player and player.has_method("reset_temporary_gadget_effects"):
			player.reset_temporary_gadget_effects()

	current_wave = 1
	ink_count = int(game_economy.get("starting_ink", 0))
	kill_count = 0
	words_learned.clear()
	active_synergies.clear()

	equipped_weapons.clear()
	equipped_weapons.append(char_data["starting_weapon"])
	active_weapon_index = 0
	weapon_tiers.clear()
	weapon_tiers[char_data["starting_weapon"]] = 1
	artifacts_owned.clear()
	max_weapon_slots = 4
	slot_expansion_count = 0
	marginalia_hit_state.clear()
	mnemonic_used_wave = -1
	var starting_gadget := normalize_gadget_id(str(char_data.get("starting_gadget", "eraser_dash")))
	owned_gadgets = ["eraser_dash"]
	if starting_gadget != "eraser_dash":
		owned_gadgets.append(starting_gadget)
	active_gadget = starting_gadget
	emit_signal("gadget_switched", active_gadget)

	emit_signal("hp_changed", hp, max_hp)
	emit_signal("ink_changed", ink_count)
	emit_signal("wave_changed", current_wave)
	emit_signal("kill_count_changed", kill_count)

func add_ink(amount: int):
	var effective_amount = int(ceil(amount * ink_mult))
	ink_count += effective_amount
	emit_signal("ink_changed", ink_count)

func spend_ink(amount: int) -> bool:
	if ink_count >= amount:
		ink_count -= amount
		emit_signal("ink_changed", ink_count)
		return true
	return false

func register_kill():
	kill_count += 1
	emit_signal("kill_count_changed", kill_count)
	# Every kill advances the selected hero. Boss waves grant a measured bonus.
	var earned_xp := 2 + int(floor(float(maxi(0, current_wave - 1)) / 40.0))
	if current_wave > 1 and current_wave % 5 == 0:
		earned_xp += 12 + int(current_wave / 10)
	add_character_xp(earned_xp)

func heal(amount: float):
	if amount <= 0:
		return
	if selected_character == "lexicon_alchemist":
		amount *= 1.5
	var old_hp = hp
	hp = min(max_hp, hp + amount)
	emit_signal("hp_changed", hp, max_hp)
	var healed_val = hp - old_hp
	if healed_val > 0 and is_inside_tree():
		var players = get_tree().get_nodes_in_group("player")
		if players.size() > 0:
			add_floating_text(players[0].global_position + Vector2(0, -25), "+" + str(int(healed_val)) + " HP", Color(0.25, 1.0, 0.4), 18)

func take_damage(amount: float):
	var reduction = clampf(armor, 0.0, get_stat_limit("armor"))
	var final_dmg = max(1.0, amount * (1.0 - reduction))
	hp = max(0.0, hp - final_dmg)
	emit_signal("hp_changed", hp, max_hp)
	trigger_screen_shake(0.22, 6.0)
	if is_inside_tree():
		var players = get_tree().get_nodes_in_group("player")
		if players.size() > 0:
			add_floating_text(players[0].global_position + Vector2(0, -25), "-" + str(int(final_dmg)), Color(1.0, 0.3, 0.3), 19)
	if hp <= 0.0:
		emit_signal("player_died")

func set_game_speed(spd: float):
	game_speed = spd
	Engine.time_scale = spd
	emit_signal("game_speed_changed", spd)

func cycle_game_speed() -> float:
	var idx = game_speed_options.find(game_speed)
	if idx == -1:
		idx = 0
	var next_idx = (idx + 1) % game_speed_options.size()
	var new_spd = game_speed_options[next_idx]
	set_game_speed(new_spd)
	return new_spd

func toggle_auto_new_tur() -> bool:
	auto_new_tur = not auto_new_tur
	emit_signal("auto_new_tur_changed", auto_new_tur)
	return auto_new_tur

func toggle_auto_new_run() -> bool:
	auto_new_run = not auto_new_run
	emit_signal("auto_new_run_changed", auto_new_run)
	return auto_new_run

func add_floating_text(pos: Vector2, text: String, color: Color = Color.WHITE, size: int = 18):
	emit_signal("floating_text_requested", pos, text, color, size)

func trigger_screen_shake(duration: float = 0.25, intensity: float = 8.0):
	emit_signal("screen_shake_requested", duration, intensity)

func trigger_tactical_alert(title: String, desc: String):
	emit_signal("tactical_alert_requested", title, desc)

func record_mistake(card: Dictionary):
	var w = card.get("word", "")
	if w.is_empty():
		return
	for m in mistake_words:
		if m.get("word", "") == w:
			m["fail_count"] = int(m.get("fail_count", 1)) + 1
			m["last_failed_wave"] = current_wave
			emit_signal("mistakes_updated")
			return
	var recorded := card.duplicate(true)
	recorded["fail_count"] = 1
	recorded["last_failed_wave"] = current_wave
	mistake_words.append(recorded)
	emit_signal("mistakes_updated")

func remove_mistake(word: String):
	for i in range(mistake_words.size() - 1, -1, -1):
		if mistake_words[i].get("word", "") == word:
			mistake_words.remove_at(i)
	emit_signal("mistakes_updated")

func clear_mistakes():
	mistake_words.clear()
	emit_signal("mistakes_updated")

func equip_weapon(weapon_id: String) -> bool:
	if not weapons_catalog.has(weapon_id):
		return false
	if not equipped_weapons.has(weapon_id):
		if equipped_weapons.size() >= max_weapon_slots:
			return false
		equipped_weapons.append(weapon_id)
		weapon_tiers[weapon_id] = 1
		emit_signal("weapon_equipped", weapon_id)
		return true
	return false

func get_weapon_tier(weapon_id: String) -> int:
	return clampi(int(weapon_tiers.get(weapon_id, 1)), 1, 4)

func get_weapon_tier_cost(weapon_id: String) -> int:
	if not weapons_catalog.has(weapon_id) or not has_weapon(weapon_id):
		return 0
	var tier := get_weapon_tier(weapon_id)
	if tier >= 4:
		return 0
	# Buying the next duplicate tier in the web recipe costs 2^(tier-1) copies;
	# charge that same copy-equivalent amount directly in the native between-wave shop.
	var base_cost := int(weapons_catalog[weapon_id].get("cost", 0)) * (1 << (tier - 1))
	return get_shop_price(base_cost, "upgrade")

func upgrade_weapon_tier(weapon_id: String) -> bool:
	var upgrade_cost := get_weapon_tier_cost(weapon_id)
	if upgrade_cost <= 0 or ink_count < upgrade_cost:
		return false
	if not spend_ink(upgrade_cost):
		return false
	var new_tier := get_weapon_tier(weapon_id) + 1
	weapon_tiers[weapon_id] = new_tier
	emit_signal("weapon_tier_upgraded", weapon_id, new_tier)
	emit_signal("weapon_equipped", weapon_id)
	return true

func has_weapon(weapon_id: String) -> bool:
	return equipped_weapons.has(weapon_id)

func get_active_weapon_id() -> String:
	if active_weapon_index >= 0 and active_weapon_index < equipped_weapons.size():
		return equipped_weapons[active_weapon_index]
	return equipped_weapons[0] if equipped_weapons.size() > 0 else "quill_blaster"

func switch_next_weapon():
	if equipped_weapons.size() <= 1:
		return
	active_weapon_index = (active_weapon_index + 1) % equipped_weapons.size()
	emit_signal("weapon_switched", get_active_weapon_id(), active_weapon_index)

func switch_prev_weapon():
	if equipped_weapons.size() <= 1:
		return
	active_weapon_index = (active_weapon_index - 1 + equipped_weapons.size()) % equipped_weapons.size()
	emit_signal("weapon_switched", get_active_weapon_id(), active_weapon_index)

func select_weapon_index(idx: int):
	if idx >= 0 and idx < equipped_weapons.size():
		active_weapon_index = idx
		emit_signal("weapon_switched", get_active_weapon_id(), active_weapon_index)

func buy_artifact(art_id: String) -> bool:
	if not artifacts_catalog.has(art_id):
		return false
	var is_slot_expansion := art_id == "slot_expansion"
	if is_slot_expansion and max_weapon_slots >= 6:
		return false
	if not is_slot_expansion and artifacts_owned.has(art_id):
		return false

	var art = artifacts_catalog[art_id]
	if spend_ink(get_shop_price(int(art["cost"]), "equipment")):
		if is_slot_expansion:
			slot_expansion_count += 1
		else:
			artifacts_owned.append(art_id)
		var stats = art.get("stats", {})
		for s in stats.keys():
			var val = stats[s]
			match s:
				"max_hp":
					max_hp += val
					hp += val
					emit_signal("hp_changed", hp, max_hp)
				"move_speed":
					move_speed += val
				"damage":
					damage_mult += val
				"attack_speed":
					add_attack_speed(float(val))
				"armor":
					add_armor(float(val))
				"crit_chance":
					crit_chance = clamp(crit_chance + val, 0.0, 1.0)
				"ink_mult":
					ink_mult += val
				"gadget_cooldown_mult":
					gadget_cooldown_mult = max(0.25, gadget_cooldown_mult + val)
				"max_weapon_slots":
					max_weapon_slots = mini(6, max_weapon_slots + int(val))
		emit_signal("artifact_purchased", art_id)
		return true
	return false

func grant_story_relic(relic: Dictionary) -> bool:
	var relic_id := str(relic.get("id", ""))
	if relic_id.is_empty() or artifacts_owned.has(relic_id):
		return false
	var granted := relic.duplicate(true)
	granted["cost"] = 0
	granted["desc"] = str(granted.get("description", ""))
	artifacts_catalog[relic_id] = granted
	artifacts_owned.append(relic_id)
	var stats: Dictionary = granted.get("stats", {})
	for stat_name in stats:
		var value: float = float(stats[stat_name])
		match str(stat_name):
			"max_hp":
				max_hp += value
				hp += value
				emit_signal("hp_changed", hp, max_hp)
			"move_speed": move_speed += value
			"damage": damage_mult += value
			"attack_speed": add_attack_speed(value)
			"armor": add_armor(value)
			"crit_chance": crit_chance = clamp(crit_chance + value, 0.0, 1.0)
			"ink_mult": ink_mult += value
			"gadget_cooldown_mult": gadget_cooldown_mult = maxf(0.25, gadget_cooldown_mult + value)
	emit_signal("artifact_purchased", relic_id)
	return true

func has_artifact(art_id: String) -> bool:
	return slot_expansion_count > 0 if art_id == "slot_expansion" else artifacts_owned.has(art_id)

func relic_on_enemy_hit(enemy: Node) -> void:
	if not has_artifact("marginalia_prism") or not is_instance_valid(enemy):
		return
	var instance_id := enemy.get_instance_id()
	var values: Dictionary = artifacts_catalog["marginalia_prism"].get("values", {})
	var hit_state: Dictionary = marginalia_hit_state.get(instance_id, {"hits": 0, "marked_until": 0.0})
	var now_seconds := Time.get_ticks_msec() / 1000.0
	if now_seconds - float(hit_state.get("last_hit", now_seconds)) > 1.0:
		hit_state["hits"] = 0
	hit_state["last_hit"] = now_seconds
	if float(hit_state.get("marked_until", 0.0)) > now_seconds:
		var target_max_health := float(enemy.get("max_health")) if enemy.get("max_health") != null else 100.0
		var echo_damage := minf(32.0, target_max_health * float(values.get("echo_damage_factor", 0.32)) * 0.08)
		hit_state["hits"] = 0
		hit_state["marked_until"] = 0.0
		marginalia_hit_state[instance_id] = hit_state
		if enemy.has_method("take_damage"):
			enemy.take_damage(echo_damage, Vector2.ZERO, "rune", false)
		return
	else:
		hit_state["hits"] = int(hit_state.get("hits", 0)) + 1
		if int(hit_state["hits"]) >= int(values.get("hits_to_mark", 4)):
			hit_state["hits"] = 0
			hit_state["marked_until"] = now_seconds + float(values.get("mark_seconds", 2.0))
			if enemy.has_method("apply_weapon_mark"):
				enemy.apply_weapon_mark(float(values.get("mark_seconds", 2.0)))
	if marginalia_hit_state.size() > 64:
		marginalia_hit_state.erase(marginalia_hit_state.keys()[0])
	marginalia_hit_state[instance_id] = hit_state

func consume_health_scroll(base_heal: float) -> float:
	var amount := base_heal
	if has_artifact("mnemonic_thread") and mnemonic_used_wave != current_wave:
		var values: Dictionary = artifacts_catalog["mnemonic_thread"].get("values", {})
		amount += float(values.get("heal_bonus", 14))
		mnemonic_used_wave = current_wave
		if is_inside_tree():
			var player := get_tree().get_first_node_in_group("player")
			if player and player.has_method("grant_mnemonic_guard"):
				player.grant_mnemonic_guard(float(values.get("shield_seconds", 0.65)))
		return amount
	return amount

func get_relic_damage_multiplier(enemy: Node) -> float:
	if not has_artifact("archivist_compass") or not is_instance_valid(enemy):
		return 1.0
	var enemy_type := str(enemy.get("enemy_type"))
	if enemy_type.ends_with("Boss") or enemy_type in ["Lexicon Dragon Boss", "Red Pen Boss"]:
		return 1.0 + float(artifacts_catalog["archivist_compass"].get("values", {}).get("elite_damage_factor", 0.12))
	return 1.0

func get_relic_target_priority(enemy: Node) -> float:
	if not is_instance_valid(enemy):
		return -INF
	var priority := float(enemy.get("health")) if enemy.get("health") != null else 0.0
	if has_artifact("archivist_compass"):
		var enemy_type := str(enemy.get("enemy_type"))
		if enemy_type.ends_with("Boss") or enemy_type in ["Lexicon Dragon Boss", "Red Pen Boss"]:
			priority += 100000.0
	return priority

func apply_card_upgrade(card_data: Dictionary, quiz_bonus: bool = false):
	if card_data.has("word"):
		words_learned.append(card_data["word"])
	var is_redemption = card_data.get("is_redemption", false)
	var multiplier = (1.75 if is_redemption else 1.5) if quiz_bonus else 1.0

	var stat_name = card_data.get("stat", "")
	var val = card_data.get("value", 0.0) * multiplier

	match stat_name:
		"max_hp":
			max_hp += val
			hp += val
			emit_signal("hp_changed", hp, max_hp)
		"heal":
			heal(val)
		"move_speed":
			move_speed += val
		"damage":
			damage_mult += val
		"attack_speed":
			add_attack_speed(float(val))
		"pickup_radius":
			pickup_radius += val
		"pierce":
			pierce_count += int(val)
		"projectile_count":
			projectile_count += int(val)
		"armor":
			add_armor(float(val))
		"crit_chance":
			crit_chance = clamp(crit_chance + val, 0.0, 1.0)

	check_synergies()

var _word_db_instance = null

func get_word_db():
	if not _word_db_instance:
		if is_inside_tree() and get_tree().root.has_node("WordDatabase"):
			_word_db_instance = get_tree().root.get_node("WordDatabase")
		else:
			_word_db_instance = load("res://scripts/word_database.gd").new()
	return _word_db_instance

func check_synergies():
	var db = get_word_db()
	var type_counts = {}
	for word_name in words_learned:
		var info = db.get_word_info(word_name)
		if not info.is_empty():
			var t = info.get("type", "General")
			type_counts[t] = type_counts.get(t, 0) + 1

	# 3 Adjectives = Swift Linguist (+35 move speed)
	if type_counts.get("Adjective", 0) >= 3 and not active_synergies.has("Swift Linguist"):
		active_synergies["Swift Linguist"] = true
		move_speed += 35.0
		emit_signal("synergy_activated", "Swift Linguist", "+35 Hareket Hızı (3 Sıfat Kombosu)")

	# 3 Verbs = Action Master (+25% Damage)
	if type_counts.get("Verb", 0) >= 3 and not active_synergies.has("Action Master"):
		active_synergies["Action Master"] = true
		damage_mult += 0.25
		emit_signal("synergy_activated", "Action Master", "+%25 Hasar Gücü (3 Fiil Kombosu)")

	# 2 Prefixes = Prefix Overdrive (+1 Pierce)
	if type_counts.get("Prefix", 0) >= 2 and not active_synergies.has("Prefix Overdrive"):
		active_synergies["Prefix Overdrive"] = true
		pierce_count += 1
		emit_signal("synergy_activated", "Prefix Overdrive", "+1 Delici Atış (2 Ön Ek Kombosu)")

	# 3 Grammars = Syntax Guardian (+%15 Armor)
	var grammar_count = type_counts.get("Grammar", 0) + type_counts.get("Grammar Pattern", 0) + type_counts.get("Conjunction", 0) + type_counts.get("Preposition", 0)
	if grammar_count >= 3 and not active_synergies.has("Syntax Guardian"):
		active_synergies["Syntax Guardian"] = true
		add_armor(0.15)
		emit_signal("synergy_activated", "Syntax Guardian", "+%15 Zırh & Hasar Direnci (3 Dilbilgisi Kombosu)")

	# 2 Collocations = Word Weaver (+%20 Attack Speed)
	if type_counts.get("Collocation", 0) >= 2 and not active_synergies.has("Word Weaver"):
		active_synergies["Word Weaver"] = true
		add_attack_speed(0.20)
		emit_signal("synergy_activated", "Word Weaver", "+%20 Saldırı Hızı (2 Kalıp İfade Kombosu)")
