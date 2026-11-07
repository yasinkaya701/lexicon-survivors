extends CharacterBody2D
class_name Enemy

const HEALTH_SCROLL_SCENE: PackedScene = preload("res://scenes/health_scroll.tscn")
static var _active_enemies: Array[Node2D] = []
static var _active_enemy_count: int = 0

static func get_active_enemies() -> Array[Node2D]:
	return _active_enemies

static func get_active_enemy_count() -> int:
	return _active_enemy_count

@export var enemy_type: String = "Typo Slime"
@export var max_health: float = 25.0
@export var speed: float = 85.0
@export var damage_to_player: float = 8.0
@export var ink_reward: int = 1
@export var is_milestone_boss: bool = false
@export var boss_custom_name: String = ""
@export var boss_custom_sprite_path: String = ""
@export var boss_skill_id: String = "judgment"
@export var boss_custom_color: Color = Color("#d85c58")
@export var boss_health_override: float = 0.0
@export var boss_damage_override: float = 0.0
@export var boss_reward_override: int = 0

var health: float
var target_player: Node2D = null
var flash_timer: float = 0.0
var hit_squash_timer: float = 0.0
var attack_cooldown: float = 0.0
var knockback: Vector2 = Vector2.ZERO
var behavior_cooldown: float = 0.0
var telegraph_timer: float = 0.0
var charge_timer: float = 0.0
var recovery_timer: float = 0.0
var attack_direction: Vector2 = Vector2.RIGHT
var telegraph_target_position: Vector2 = Vector2.ZERO
var suppress_rewards: bool = false
var is_mistake_echo: bool = false
var mistake_echo_word: String = ""
var mistake_echo_fail_count: int = 1
var mistake_echo_archetype: String = "spectre"
var mistake_echo_attack: String = "chase"
var mistake_echo_visual_modifier: String = ""
var mistake_echo_attack_cooldown: float = 2.6
var mistake_echo_windup: float = 0.0
var mistake_echo_recovery: float = 0.0
var mistake_echo_charge_timer: float = 0.0
var mistake_word_frame: TextureRect = null
var stun_timer: float = 0.0
var slow_timer: float = 0.0
var slow_factor: float = 1.0
var base_sprite_scale: Vector2 = Vector2.ONE
var weapon_mark_timer: float = 0.0
var burn_timer: float = 0.0
var burn_tick_timer: float = 0.0
var burn_damage: float = 0.0
var burn_stacks: int = 0
var boss_phase: int = 1
var boss_skill_cooldown: float = 2.8
var boss_skill_interval: float = 6.8
var boss_telegraph_timer: float = 0.0
var boss_target_position: Vector2 = Vector2.ZERO
var boss_attack_angle: float = 0.0
var boss_sever_echo_timer: float = 0.0
var boss_sever_echo_angle: float = 0.0
var boss_sever_echo_armed: bool = false
var boss_hit_recoil_timer: float = 0.0
var boss_hit_recoil_direction: Vector2 = Vector2.ZERO
var base_sprite_position: Vector2 = Vector2.ZERO
var boss_charge_timer: float = 0.0
var boss_overtime: int = 0
var boss_phase_tint: Color = Color.WHITE

# Tactical Affixes & Boss Phases
var affix: String = "" # "", "shielded", "blinker", "commander", "volatile"
var blink_timer: float = 4.0
var commander_aura_timer: float = 1.0
var is_exploding: bool = false
var explode_timer: float = 0.0

var is_boss: bool = false
var is_enraged: bool = false
var laser_cooldown: float = 5.0
var laser_warning_timer: float = 0.0
var laser_active_timer: float = 0.0
var laser_target_pos: Vector2 = Vector2.ZERO

@onready var sprite = $Sprite2D
@onready var label = $Label
var ink_drop_scene = preload("res://scenes/ink_drop.tscn")

var typo_words = ["Teh", "Woudl", "Recieve", "Becaue", "Definately", "Seperate", "Tomorow", "Untill", "Beautifull", "Acommodate"]
var grammar_pairs = ["is/are", "have/has", "their/there", "your/you're", "its/it's", "to/too", "affect/effect", "less/fewer", "who/whom"]
var threat_seal: Texture2D = null

class HarpyBolt extends Area2D:
	var direction: Vector2 = Vector2.RIGHT
	var speed: float = 190.0
	var damage: float = 14.0
	var lifetime: float = 3.0
	var is_book: bool = false

	func _init(flight_direction: Vector2, hit_damage: float, book_projectile: bool = false):
		direction = flight_direction.normalized()
		damage = hit_damage
		is_book = book_projectile
		collision_layer = 8
		collision_mask = 1
		var shape_node = CollisionShape2D.new()
		var shape = CircleShape2D.new()
		shape.radius = 8.0
		shape_node.shape = shape
		add_child(shape_node)
		var bolt_sprite = Sprite2D.new()
		bolt_sprite.texture = load("res://assets/sprites/bullet_enemy_red.png")
		bolt_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		bolt_sprite.scale = Vector2(0.8, 0.8)
		bolt_sprite.visible = not is_book
		add_child(bolt_sprite)
		if is_book:
			queue_redraw()

	func _draw():
		if not is_book:
			return
		draw_rect(Rect2(-9.0, -7.0, 18.0, 14.0), Color("#9b5738"), true)
		draw_rect(Rect2(-9.0, -7.0, 18.0, 14.0), Color("#f0d49a"), false, 1.5)
		draw_line(Vector2(-1.0, -6.0), Vector2(-1.0, 6.0), Color("#f0d49a"), 1.2)
		draw_line(Vector2(2.0, -3.0), Vector2(7.0, -3.0), Color("#f0d49a"), 1.0)

	func _ready():
		add_to_group("enemy_projectiles")
		body_entered.connect(_on_body_entered)

	func _physics_process(delta: float):
		global_position += direction * speed * delta
		lifetime -= delta
		if lifetime <= 0.0:
			queue_free()

	func _on_body_entered(body: Node2D):
		if body.is_in_group("player") and body.has_method("take_damage"):
			body.take_damage(damage)
			queue_free()

class EnemyInkPuddle extends Area2D:
	var lifetime: float = 4.5
	var damage: float = 8.0
	var has_hit_player: bool = false

	func _init(hit_damage: float):
		damage = hit_damage
		collision_layer = 0
		collision_mask = 1
		var shape_node = CollisionShape2D.new()
		var shape = CircleShape2D.new()
		shape.radius = 30.0
		shape_node.shape = shape
		add_child(shape_node)

	func _ready():
		add_to_group("enemy_ink_puddles")
		body_entered.connect(_on_body_entered)

	func _physics_process(delta: float):
		lifetime -= delta
		queue_redraw()
		if lifetime <= 0.0:
			queue_free()

	func _draw():
		var alpha := clampf(lifetime / 4.5, 0.18, 0.58)
		draw_circle(Vector2.ZERO, 30.0, Color(0.24, 0.08, 0.38, alpha))
		draw_arc(Vector2.ZERO, 30.0, 0.0, TAU, 36, Color(0.56, 0.29, 0.82, minf(0.82, alpha + 0.2)), 2.0, true)

	func _on_body_entered(body: Node2D):
		if has_hit_player or not body.is_in_group("player") or body.is_dashing:
			return
		if body.has_method("take_damage"):
			body.take_damage(damage)
			has_hit_player = true

func _ready():
	add_to_group("enemies")
	_active_enemies.append(self)
	_active_enemy_count += 1
	if ResourceLoader.exists("res://assets/sprites/upgrade_v1/threat_seal.png"):
		threat_seal = load("res://assets/sprites/upgrade_v1/threat_seal.png")
	setup_type()
	if sprite:
		base_sprite_scale = sprite.scale
		base_sprite_position = sprite.position

func _exit_tree() -> void:
	if _active_enemies.has(self):
		_active_enemies.erase(self)
		_active_enemy_count = maxi(0, _active_enemy_count - 1)

func configure_mistake_echo(word: String, fail_count: int, word_card: Dictionary = {}) -> void:
	is_mistake_echo = true
	mistake_echo_word = word
	mistake_echo_fail_count = clampi(fail_count, 1, 5)
	if word_card.is_empty():
		word_card = WordDatabase.get_word_info(word)
	mistake_echo_archetype = str(word_card.get("enemy_archetype", "spectre"))
	mistake_echo_attack = str(word_card.get("enemy_attack", "chase"))
	mistake_echo_visual_modifier = str(word_card.get("enemy_visual_modifier", ""))
	if sprite:
		sprite.modulate = Color("#d8c8ee")
	queue_redraw()
	max_health *= 1.25 + mistake_echo_fail_count * 0.15
	health = max_health
	speed *= 1.0 + mistake_echo_fail_count * 0.05
	damage_to_player *= 1.0 + mistake_echo_fail_count * 0.12
	ink_reward = 0
	if label:
		label.text = mistake_echo_word
		label.offset_left = -68.0
		label.offset_top = -45.0
		label.offset_right = 68.0
		label.offset_bottom = -21.0
		label.add_theme_font_size_override("font_size", 11)
		label.add_theme_color_override("font_color", Color("#f2e7cf"))
		label.add_theme_color_override("font_outline_color", Color("#111714"))
		label.add_theme_constant_override("outline_size", 4)
		label.z_index = 2
		if not is_instance_valid(mistake_word_frame):
			mistake_word_frame = TextureRect.new()
			mistake_word_frame.name = "MistakeWordFrame"
			mistake_word_frame.texture = load("res://assets/sprites/upgrade_v1/word_echo/word_echo_title_frame.svg")
			mistake_word_frame.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			mistake_word_frame.stretch_mode = TextureRect.STRETCH_SCALE
			mistake_word_frame.position = Vector2(-78.0, -54.0)
			mistake_word_frame.size = Vector2(156.0, 47.0)
			mistake_word_frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
			mistake_word_frame.z_index = 1
			add_child(mistake_word_frame)
			move_child(mistake_word_frame, label.get_index())
	if sprite:
		sprite.modulate = Color("#dfbdf5")
		base_sprite_scale *= 1.20 + float(mistake_echo_fail_count) * 0.04
		sprite.scale = base_sprite_scale
	mistake_echo_attack_cooldown = 2.6 - float(mistake_echo_fail_count - 1) * 0.08
	queue_redraw()

func setup_type():
	var diff_data = StatsManager.difficulties.get(StatsManager.difficulty, StatsManager.difficulties["normal"])
	var spd_mult = diff_data.get("enemy_speed_mult", 1.0)
	var hp_mult = diff_data.get("enemy_hp_mult", 1.0)
	var dmg_mult = diff_data.get("enemy_damage_mult", 1.0)

	if enemy_type == "Typo Slime":
		max_health = (140.0 + (StatsManager.current_wave - 1) * 36.0) * hp_mult
		speed = (98.0 + (StatsManager.current_wave - 1) * 3.5) * spd_mult
		damage_to_player = 34.0 * dmg_mult
		ink_reward = 3
		if sprite:
			sprite.texture = load("res://assets/sprites/upgrade_v1/monster_typo_slime.png")
		if label:
			label.text = typo_words[randi() % typo_words.size()]
	elif enemy_type == "Grammar Goblin":
		max_health = (90.0 + (StatsManager.current_wave - 1) * 28.0) * hp_mult
		speed = (155.0 + (StatsManager.current_wave - 1) * 5.0) * spd_mult
		damage_to_player = 32.0 * dmg_mult
		ink_reward = 3
		if sprite:
			sprite.texture = load("res://assets/sprites/upgrade_v1/monster_grammar_goblin.png")
		if label:
			label.text = grammar_pairs[randi() % grammar_pairs.size()]
	elif enemy_type == "Typo Splinter":
		max_health = (50.0 + StatsManager.current_wave * 12.0) * hp_mult
		speed = (175.0 + StatsManager.current_wave * 5.0) * spd_mult
		damage_to_player = 22.0 * dmg_mult
		ink_reward = 1
		if sprite:
			sprite.texture = load("res://assets/sprites/upgrade_v1/monster_typo_splinter.png")
		if label:
			label.text = "Splinter"
	elif enemy_type == "Punctuation Phantom":
		max_health = (110.0 + (StatsManager.current_wave - 1) * 32.0) * hp_mult
		speed = (135.0 + (StatsManager.current_wave - 1) * 4.0) * spd_mult
		damage_to_player = 34.0 * dmg_mult
		ink_reward = 4
		if sprite:
			sprite.texture = load("res://assets/sprites/upgrade_v1/monster_punctuation_phantom.png")
		if label:
			label.text = "?"
	elif enemy_type == "Syntax Titan":
		max_health = (560.0 + (StatsManager.current_wave - 1) * 150.0) * hp_mult
		speed = (82.0 + (StatsManager.current_wave - 1) * 3.0) * spd_mult
		damage_to_player = 64.0 * dmg_mult
		ink_reward = 8
		if sprite:
			sprite.texture = load("res://assets/sprites/syntax_titan.png")
		if label:
			label.text = "SYNTAX TITAN"
	elif enemy_type == "Spelling Spectre":
		max_health = (140.0 + (StatsManager.current_wave - 1) * 36.0) * hp_mult
		speed = (145.0 + (StatsManager.current_wave - 1) * 4.0) * spd_mult
		damage_to_player = 42.0 * dmg_mult
		ink_reward = 5
		if sprite:
			sprite.texture = load("res://assets/sprites/upgrade_v1/monster_spelling_spectre.png")
		if label:
			label.text = "Spectre"
	elif enemy_type == "Red Pen Boss":
		max_health = (2400.0 + StatsManager.current_wave * 130.0) * hp_mult
		speed = 52.0 * spd_mult
		damage_to_player = (95.0 + StatsManager.current_wave * 1.8) * dmg_mult
		ink_reward = 60
		if sprite:
			sprite.texture = load("res://assets/sprites/upgrade_v1/monster_red_pen_boss.png")
		if label:
			label.text = "RED PEN BOSS"
	elif enemy_type == "Oxymoron Ogre":
		max_health = (680.0 + (StatsManager.current_wave - 1) * 160.0) * hp_mult
		speed = 92.0 * spd_mult
		damage_to_player = 68.0 * dmg_mult
		ink_reward = 10
		if sprite:
			sprite.texture = load("res://assets/sprites/oxymoron_ogre.png")
		if label:
			label.text = "OXYMORON OGRE"
	elif enemy_type == "Vocabulary Void":
		max_health = (400.0 + (StatsManager.current_wave - 1) * 100.0) * hp_mult
		speed = 82.0 * spd_mult
		damage_to_player = 52.0 * dmg_mult
		ink_reward = 8
		if sprite:
			sprite.texture = load("res://assets/sprites/vocabulary_void.png")
		if label:
			label.text = "VOCAB VOID"
	elif enemy_type == "Malapropism Mimic":
		max_health = (220.0 + (StatsManager.current_wave - 1) * 50.0) * hp_mult
		speed = 160.0 * spd_mult
		damage_to_player = 48.0 * dmg_mult
		ink_reward = 6
		if sprite:
			sprite.texture = load("res://assets/sprites/malapropism_mimic.png")
		if label:
			label.text = "MIMIC"
	elif enemy_type == "Homophone Harpy":
		max_health = (170.0 + (StatsManager.current_wave - 1) * 40.0) * hp_mult
		speed = 180.0 * spd_mult
		damage_to_player = 40.0 * dmg_mult
		ink_reward = 6
		if sprite:
			sprite.texture = load("res://assets/sprites/upgrade_v1/monster_homophone_harpy.png")
		if label:
			label.text = "HARPY"
	elif enemy_type == "Idiom Imp":
		max_health = (120.0 + (StatsManager.current_wave - 1) * 30.0) * hp_mult
		speed = 185.0 * spd_mult
		damage_to_player = 34.0 * dmg_mult
		ink_reward = 4
		if sprite:
			sprite.texture = load("res://assets/sprites/upgrade_v1/monster_idiom_imp.png")
		if label:
			label.text = "IDIOM IMP"
	elif enemy_type == "Tautology Twin":
		max_health = (160.0 + (StatsManager.current_wave - 1) * 35.0) * hp_mult
		speed = 140.0 * spd_mult
		damage_to_player = 32.0 * dmg_mult
		ink_reward = 5
		if sprite:
			sprite.texture = load("res://assets/sprites/upgrade_v1/monster_tautology_twin.png")
		if label:
			label.text = "TAUTOLOGY"
	elif enemy_type == "Run-on Reaper":
		max_health = (180.0 + (StatsManager.current_wave - 1) * 38.0) * hp_mult
		speed = 195.0 * spd_mult
		damage_to_player = 36.0 * dmg_mult
		ink_reward = 6
		if sprite:
			sprite.texture = load("res://assets/sprites/upgrade_v1/monster_run_on_reaper.png")
		if label:
			label.text = "RUN-ON"
	elif enemy_type == "Dangling Modifier":
		max_health = (130.0 + (StatsManager.current_wave - 1) * 30.0) * hp_mult
		speed = 165.0 * spd_mult
		damage_to_player = 28.0 * dmg_mult
		ink_reward = 5
		if sprite:
			sprite.texture = load("res://assets/sprites/upgrade_v1/monster_dangling_modifier.png")
		if label:
			label.text = "DANGLING"
	elif enemy_type == "Double Negative Drake":
		max_health = (340.0 + (StatsManager.current_wave - 1) * 80.0) * hp_mult
		speed = 110.0 * spd_mult
		damage_to_player = 42.0 * dmg_mult
		ink_reward = 8
		if sprite:
			sprite.texture = load("res://assets/sprites/upgrade_v1/monster_double_negative_drake.png")
		if label:
			label.text = "DOUBLE NEGATIVE"
	elif enemy_type == "Palindrome Phantom":
		max_health = (145.0 + (StatsManager.current_wave - 1) * 32.0) * hp_mult
		speed = 170.0 * spd_mult
		damage_to_player = 30.0 * dmg_mult
		ink_reward = 6
		if sprite:
			sprite.texture = load("res://assets/sprites/palindrome_phantom.png")
		if label:
			label.text = "RACECAR"
	elif enemy_type == "Lexicon Dragon Boss":
		var dragon_hp = 16500.0 if StatsManager.current_wave <= 50 else 38000.0
		max_health = dragon_hp * hp_mult
		speed = 58.0 * spd_mult
		damage_to_player = (145.0 if StatsManager.current_wave <= 50 else 220.0) * dmg_mult
		ink_reward = 120
		if sprite:
			sprite.texture = load("res://assets/sprites/upgrade_v1/monster_lexicon_dragon_boss.png")
		if label:
			label.text = "LEXICON DRAGON OVERLORD"

	if is_milestone_boss:
		if boss_health_override > 0.0:
			max_health = boss_health_override
		if boss_damage_override > 0.0:
			damage_to_player = boss_damage_override
		if boss_reward_override > 0:
			ink_reward = boss_reward_override
		if sprite and not boss_custom_sprite_path.is_empty():
			var custom_path := "res://assets/sprites/" + boss_custom_sprite_path
			if ResourceLoader.exists(custom_path):
				sprite.texture = load(custom_path)
				var target_size := 142.0 if StatsManager.current_wave < 100 else 164.0
				var texture_size: float = maxf(float(sprite.texture.get_width()), float(sprite.texture.get_height()))
				sprite.scale = Vector2.ONE * target_size / maxf(texture_size, 1.0)
				boss_phase_tint = boss_custom_color.lightened(0.42)
				sprite.modulate = boss_phase_tint
			if label and not boss_custom_name.is_empty():
				label.text = boss_custom_name
				label.position = Vector2(-105.0, -96.0)
				label.size = Vector2(210.0, 24.0)
				label.add_theme_font_size_override("font_size", 13)
				label.add_theme_color_override("font_color", boss_custom_color.lightened(0.34))
			var collision_shape := get_node_or_null("CollisionShape2D") as CollisionShape2D
			if collision_shape and collision_shape.shape is CircleShape2D:
				collision_shape.shape = collision_shape.shape.duplicate()
				(collision_shape.shape as CircleShape2D).radius = 37.0 if StatsManager.current_wave < 100 else 42.0
		boss_skill_interval = maxf(4.1, 6.8 - float(StatsManager.current_wave) * 0.017)
	ink_reward = boss_reward_override if is_milestone_boss and boss_reward_override > 0 else StatsManager.get_enemy_ink_reward(enemy_type, ink_reward)
	is_boss = enemy_type in ["Red Pen Boss", "Lexicon Dragon Boss"]
	health = max_health

	if affix != "" and label:
		match affix:
			"shielded":
				label.text = "🛡️ " + label.text
			"blinker":
				label.text = "⚡ " + label.text
			"commander":
				label.text = "🔮 " + label.text
			"volatile":
				label.text = "💣 " + label.text

func _draw_tactical_affix_overlay():
	if affix == "shielded":
		draw_arc(Vector2.ZERO, 22.0, -PI/2.5, PI/2.5, 16, Color(0.2, 0.8, 1.0, 0.85), 3.0)
	elif affix == "commander":
		draw_circle(Vector2.ZERO, 40.0, Color(0.8, 0.3, 1.0, 0.12))
		draw_arc(Vector2.ZERO, 40.0, 0, TAU, 24, Color(0.9, 0.4, 1.0, 0.7), 2.0)
	elif is_exploding:
		var pulse = 0.5 + sin(explode_timer * 22.0) * 0.45
		draw_circle(Vector2.ZERO, 55.0, Color(1.0, 0.2, 0.2, pulse))

	if is_enraged and laser_warning_timer > 0:
		var target_local = to_local(laser_target_pos)
		draw_line(Vector2.ZERO, target_local, Color(1.0, 0.2, 0.2, 0.65), 2.0)
	elif is_enraged and laser_active_timer > 0:
		var target_local = to_local(laser_target_pos)
		draw_line(Vector2.ZERO, target_local, Color(1.0, 0.85, 0.3, 0.95), 12.0)

func _physics_process(delta: float):
	queue_redraw()
	_update_readable_motion()
	hit_squash_timer = maxf(0.0, hit_squash_timer - delta)
	boss_hit_recoil_timer = maxf(0.0, boss_hit_recoil_timer - delta)
	if boss_sever_echo_armed:
		boss_sever_echo_timer = maxf(0.0, boss_sever_echo_timer - delta)
		if boss_sever_echo_timer == 0.0:
			boss_sever_echo_armed = false
			if stun_timer <= 0.0 and is_milestone_boss:
				_fire_sever_volley(boss_sever_echo_angle, 0.48 if boss_phase > 1 else 0.40)
	weapon_mark_timer = maxf(0.0, weapon_mark_timer - delta)
	if burn_timer > 0.0:
		burn_timer = maxf(0.0, burn_timer - delta)
		burn_tick_timer -= delta
		if burn_tick_timer <= 0.0 and burn_timer > 0.0:
			burn_tick_timer = 0.42
			take_damage(burn_damage * float(maxi(1, burn_stacks)), Vector2.ZERO, "heavy", false)
		if burn_timer <= 0.0:
			burn_stacks = 0
			burn_damage = 0.0
	if stun_timer > 0.0:
		stun_timer = maxf(0.0, stun_timer - delta)
		velocity = Vector2.ZERO
		move_and_slide()
		return
	if slow_timer > 0.0:
		slow_timer = maxf(0.0, slow_timer - delta)
		if slow_timer == 0.0:
			slow_factor = 1.0
	if flash_timer > 0:
		flash_timer -= delta
		if flash_timer <= 0:
			modulate = boss_phase_tint if is_milestone_boss else (Color(2.8, 0.4, 0.4) if is_enraged else Color.WHITE)
	if is_exploding:
		explode_timer -= delta
		velocity = Vector2.ZERO
		modulate = Color(2.5, 0.4, 0.4) if int(explode_timer * 12.0) % 2 == 0 else Color.WHITE
		if explode_timer <= 0.0:
			detonate_volatile_bomb()
		return

	if attack_cooldown > 0:
		attack_cooldown -= delta
	if behavior_cooldown > 0:
		behavior_cooldown -= delta
	if recovery_timer > 0.0:
		recovery_timer = maxf(0.0, recovery_timer - delta)

	# Affix: Blinker teleport
	if affix == "blinker" and target_player and is_instance_valid(target_player):
		blink_timer -= delta
		if blink_timer <= 0:
			blink_timer = 4.2
			var blink_ang = randf() * TAU
			global_position = target_player.global_position + Vector2(cos(blink_ang), sin(blink_ang)) * randf_range(110.0, 150.0)
			StatsManager.add_floating_text(global_position + Vector2(0, -20), "⚡ SIÇRAMA!", Color(1.0, 0.9, 0.2), 16)

	# Affix: Commander buffing aura
	if affix == "commander":
		commander_aura_timer -= delta
		if commander_aura_timer <= 0:
			commander_aura_timer = 1.0
			var enemies = get_tree().get_nodes_in_group("enemies")
			for e in enemies:
				if is_instance_valid(e) and e != self and global_position.distance_to(e.global_position) <= 180.0:
					if "speed" in e and not e.is_boss:
						e.speed = min(e.speed * 1.35, 260.0)

	# Boss Enraged Laser Attack Cycle
	if is_enraged and target_player and is_instance_valid(target_player):
		if laser_warning_timer > 0:
			laser_warning_timer -= delta
			if laser_warning_timer <= 0:
				laser_active_timer = 0.4
				StatsManager.trigger_screen_shake(0.35, 10.0)
				# The warning line locks to its original target, so dodging remains possible.
				var to_player = target_player.global_position - global_position
				var to_target = laser_target_pos - global_position
				var target_length := to_target.length()
				var along_beam := to_player.dot(to_target.normalized())
				var cross_track := absf(to_target.normalized().cross(to_player))
				if target_length <= 800.0 and along_beam > 0.0 and along_beam <= target_length and cross_track <= 26.0:
					if target_player.has_method("take_damage"):
						target_player.take_damage(damage_to_player * 1.5)
		elif laser_active_timer > 0:
			laser_active_timer -= delta
		else:
			laser_cooldown -= delta
			if laser_cooldown <= 0:
				laser_cooldown = 5.5
				laser_warning_timer = 1.0
				laser_target_pos = target_player.global_position
			StatsManager.add_floating_text(global_position + Vector2(0, -40), "LAZER KİLİTLENDİ", Color(1.0, 0.2, 0.2), 22)

	# Find player
	if not target_player or not is_instance_valid(target_player):
		if is_inside_tree():
			var players = get_tree().get_nodes_in_group("player")
			if players.size() > 0:
				target_player = players[0]

	if target_player and is_instance_valid(target_player):
		var dir = (target_player.global_position - global_position).normalized()
		var distance_to_player = global_position.distance_to(target_player.global_position)
		var desired_velocity = dir * speed

		# Flip sprite based on direction
		if sprite and dir.x != 0:
			sprite.flip_h = dir.x < 0

		if is_milestone_boss:
			desired_velocity = _milestone_boss_movement(delta, dir, distance_to_player)
		elif is_mistake_echo:
			desired_velocity = _mistake_echo_movement(delta, dir, distance_to_player)
		elif enemy_type == "Homophone Harpy":
			desired_velocity = _harpy_movement(delta, dir, distance_to_player)
		elif enemy_type == "Run-on Reaper":
			desired_velocity = _reaper_movement(delta, dir)
		elif enemy_type == "Idiom Imp":
			desired_velocity = _imp_movement(dir)
		elif enemy_type == "Oxymoron Ogre":
			desired_velocity = _ogre_movement(dir, distance_to_player)
		elif enemy_type == "Punctuation Phantom":
			desired_velocity = _phantom_movement(dir, distance_to_player)
		desired_velocity *= slow_factor

		velocity = desired_velocity + knockback
		knockback = knockback.move_toward(Vector2.ZERO, 600.0 * delta)
		move_and_slide()

		# Check contact with player
		for i in get_slide_collision_count():
			var collision = get_slide_collision(i)
			var collider = collision.get_collider()
			if collider and collider.is_in_group("player") and attack_cooldown <= 0:
				if collider.has_method("take_damage"):
					collider.take_damage(damage_to_player)
					attack_cooldown = 0.55
		if telegraph_timer > 0.0:
			telegraph_timer = maxf(0.0, telegraph_timer - delta)
			if telegraph_timer == 0.0:
				if enemy_type == "Homophone Harpy":
					fire_harpy_bolt()
					behavior_cooldown = 2.75
				elif enemy_type == "Run-on Reaper":
					charge_timer = 0.42
					behavior_cooldown = 3.0
				elif enemy_type == "Idiom Imp":
					_spawn_ink_puddle(telegraph_target_position)
					behavior_cooldown = 3.5
				elif enemy_type == "Oxymoron Ogre":
					_pulse_ogre_shock()
					behavior_cooldown = 3.0
					recovery_timer = 0.78
				elif enemy_type == "Punctuation Phantom":
					charge_timer = 0.24
					behavior_cooldown = 2.8
			queue_redraw()
		if charge_timer > 0.0:
			charge_timer = maxf(0.0, charge_timer - delta)
			if charge_timer == 0.0:
				behavior_cooldown = 3.0 if enemy_type == "Run-on Reaper" else 2.8
				recovery_timer = 0.72 if enemy_type == "Run-on Reaper" else 0.0
		if enemy_type in ["Idiom Imp", "Oxymoron Ogre"] and telegraph_timer > 0.0:
			queue_redraw()

func _harpy_movement(delta: float, dir: Vector2, distance_to_player: float) -> Vector2:
	if telegraph_timer > 0.0:
		return Vector2.ZERO
	if behavior_cooldown <= 0.0 and distance_to_player <= 440.0:
		attack_direction = dir
		telegraph_timer = 0.88
		behavior_cooldown = 2.75
		queue_redraw()
		return Vector2.ZERO
	# Harpies orbit at a readable firing distance instead of joining the melee pile.
	if distance_to_player < 205.0:
		return -dir * speed * 0.7
	if distance_to_player > 350.0:
		return dir * speed * 0.65
	return Vector2(-dir.y, dir.x) * speed * 0.42

func _reaper_movement(_delta: float, dir: Vector2) -> Vector2:
	if charge_timer > 0.0:
		return attack_direction * 500.0
	if telegraph_timer > 0.0 or recovery_timer > 0.0:
		return Vector2.ZERO
	if behavior_cooldown <= 0.0:
		attack_direction = dir
		telegraph_timer = 0.78
		queue_redraw()
		return Vector2.ZERO
	return dir * speed

func _imp_movement(dir: Vector2) -> Vector2:
	if telegraph_timer > 0.0:
		return Vector2.ZERO
	if behavior_cooldown <= 0.0 and target_player and global_position.distance_to(target_player.global_position) <= 360.0:
		telegraph_target_position = target_player.global_position
		telegraph_timer = 0.9
		behavior_cooldown = 4.4
		queue_redraw()
	return dir * speed

func _ogre_movement(dir: Vector2, distance_to_player: float) -> Vector2:
	if telegraph_timer > 0.0 or recovery_timer > 0.0:
		return Vector2.ZERO
	if behavior_cooldown <= 0.0 and distance_to_player <= 170.0:
		telegraph_timer = 0.84
		behavior_cooldown = 3.8
		queue_redraw()
		return Vector2.ZERO
	return dir * speed

func _spawn_ink_puddle(puddle_position: Vector2) -> void:
	if not is_inside_tree():
		return
	var puddles := get_tree().get_nodes_in_group("enemy_ink_puddles")
	while puddles.size() >= 4:
		var oldest = puddles.pop_front()
		if is_instance_valid(oldest):
			oldest.queue_free()
	var puddle := EnemyInkPuddle.new(damage_to_player * 0.25)
	get_tree().current_scene.add_child(puddle)
	puddle.global_position = puddle_position

func _pulse_ogre_shock() -> void:
	if not target_player or not is_instance_valid(target_player):
		return
	var distance := global_position.distance_to(target_player.global_position)
	if distance <= 118.0 and target_player.has_method("take_damage"):
		target_player.take_damage(damage_to_player * 0.75)

func _phantom_movement(dir: Vector2, distance_to_player: float) -> Vector2:
	if charge_timer > 0.0:
		return attack_direction * speed * 3.2
	if telegraph_timer > 0.0:
		return Vector2.ZERO
	if behavior_cooldown <= 0.0 and distance_to_player <= 300.0:
		attack_direction = dir
		telegraph_timer = 0.52
		queue_redraw()
		return Vector2.ZERO
	return dir * speed * 0.82

func _milestone_boss_movement(delta: float, dir: Vector2, distance_to_player: float) -> Vector2:
	if health <= max_health * 0.66 and boss_phase == 1:
		boss_phase = 2
		boss_skill_interval = maxf(3.9, boss_skill_interval * 0.82)
		speed *= 1.08
		boss_phase_tint = boss_custom_color.lightened(0.22)
		modulate = boss_phase_tint
		queue_redraw()
	elif health <= max_health * 0.32 and boss_phase == 2:
		boss_phase = 3
		boss_skill_interval = maxf(3.2, boss_skill_interval * 0.78)
		speed *= 1.12
		boss_phase_tint = boss_custom_color.lightened(0.42)
		modulate = boss_phase_tint
		queue_redraw()
	if boss_charge_timer > 0.0:
		boss_charge_timer = maxf(0.0, boss_charge_timer - delta)
		if boss_charge_timer == 0.0:
			recovery_timer = 0.7
		return Vector2(cos(boss_attack_angle), sin(boss_attack_angle)) * speed * (3.2 if boss_phase == 3 else 2.8)
	if recovery_timer > 0.0:
		return Vector2.ZERO
	if boss_telegraph_timer > 0.0:
		boss_telegraph_timer = maxf(0.0, boss_telegraph_timer - delta)
		queue_redraw()
		if boss_telegraph_timer == 0.0:
			_perform_boss_skill()
		return Vector2.ZERO
	boss_skill_cooldown = maxf(0.0, boss_skill_cooldown - delta)
	if boss_skill_cooldown <= 0.0:
		boss_attack_angle = dir.angle()
		boss_target_position = target_player.global_position + target_player.velocity * 0.28
		boss_telegraph_timer = _boss_telegraph_duration()
		boss_skill_cooldown = boss_skill_interval
		if label:
			label.text = _boss_skill_label()
		queue_redraw()
		return Vector2.ZERO
	# Heavy bosses close in deliberately; ranged archetypes circle at a readable distance.
	if boss_skill_id in ["fan", "crossfire", "shards"]:
		if distance_to_player < 250.0:
			return -dir * speed * 0.6
		if distance_to_player > 400.0:
			return dir * speed * 0.65
		return Vector2(-dir.y, dir.x) * speed * 0.38
	return dir * speed * (0.78 if boss_phase == 1 else 0.9)

func _mistake_echo_movement(delta: float, dir: Vector2, distance_to_player: float) -> Vector2:
	if mistake_echo_windup > 0.0:
		mistake_echo_windup = maxf(0.0, mistake_echo_windup - delta)
		if mistake_echo_windup == 0.0:
			_perform_mistake_echo_attack(dir)
			mistake_echo_recovery = 0.36
		queue_redraw()
		return dir * speed * 0.24
	if mistake_echo_recovery > 0.0:
		mistake_echo_recovery = maxf(0.0, mistake_echo_recovery - delta)
		return -dir * speed * 0.18
	if mistake_echo_charge_timer > 0.0:
		mistake_echo_charge_timer = maxf(0.0, mistake_echo_charge_timer - delta)
		return dir * speed * 2.45
	mistake_echo_attack_cooldown = maxf(0.0, mistake_echo_attack_cooldown - delta)
	if mistake_echo_attack != "chase" and mistake_echo_attack_cooldown <= 0.0 and distance_to_player < 460.0:
		mistake_echo_attack_cooldown = 2.55 - float(mistake_echo_fail_count - 1) * 0.08
		mistake_echo_windup = 0.68 - float(mistake_echo_fail_count - 1) * 0.025
		attack_direction = dir
		queue_redraw()
		return dir * speed * 0.24
	return dir * speed

func _perform_mistake_echo_attack(dir: Vector2) -> void:
	match mistake_echo_attack:
		"book_volley":
			for offset in [-0.22, 0.0, 0.22]:
				var bolt := HarpyBolt.new(dir.rotated(offset), damage_to_player * 0.34, true)
				get_tree().current_scene.add_child(bolt)
				bolt.global_position = global_position + dir * 22.0
		"surround":
			for index in range(8):
				var angle := float(index) * TAU / 8.0
				var bolt := HarpyBolt.new(Vector2.RIGHT.rotated(angle), damage_to_player * 0.22)
				get_tree().current_scene.add_child(bolt)
				bolt.global_position = global_position
		"fan":
			for index in range(5):
				var offset := (float(index) - 2.0) * 0.16
				var bolt := HarpyBolt.new(dir.rotated(offset), damage_to_player * 0.26)
				get_tree().current_scene.add_child(bolt)
				bolt.global_position = global_position
		"snare":
			var puddle := EnemyInkPuddle.new(damage_to_player * 0.24)
			get_tree().current_scene.add_child(puddle)
			puddle.global_position = target_player.global_position
		"charge", "line":
			mistake_echo_charge_timer = 0.32

func _boss_telegraph_duration() -> float:
	# Phase three is faster, but still leaves a clear reaction window for a dash.
	return 0.96 if boss_phase == 1 else (0.84 if boss_phase == 2 else 0.74)

func _boss_skill_label() -> String:
	var labels := {"judgment":"YARGI ÇİZGİSİ", "quake":"TAŞ HALKASI", "nova":"MÜHÜR PATLAMASI", "fan":"KIRIK TÜYLER", "orbit":"YAZI ÇEMBERİ", "charge":"HÜKÜM ATILIMI", "mirror":"AYNA KIRILMASI", "gravity":"BOŞLUK ÇEKİMİ", "crossfire":"ÇAPRAZ BASKI", "rift":"YARIK SIÇRAMASI", "return":"GERİ DÖNEN İZ", "echo":"YANKI SALVOSU", "snare":"MÜREKKEP TUZAĞI", "shards":"SÖZCÜK KIRINTILARI", "embers":"KOR İŞARETLERİ", "sever":"KESİK SATIR", "split":"İKİYE AYRILAN CÜMLE", "eclipse":"TUTULMA MÜHRÜ", "void_bloom":"BOŞLUK ÇİÇEĞİ", "finale":"SON SATIR"}
	return str(labels.get(boss_skill_id, "BOSS SALDIRISI"))

func _perform_boss_skill() -> void:
	if not is_instance_valid(target_player):
		return
	attack_direction = Vector2(cos(boss_attack_angle), sin(boss_attack_angle))
	var count := 5 if boss_phase == 1 else (7 if boss_phase == 2 else 9)
	match boss_skill_id:
		"judgment", "charge":
			if boss_skill_id == "charge":
				boss_charge_timer = 0.54
			else:
				_fire_boss_fan(3 if boss_phase == 1 else count, 0.28 if boss_phase == 1 else 0.44)
		"quake", "nova", "orbit", "gravity", "snare", "embers":
			var center := global_position if boss_skill_id in ["quake", "orbit"] else boss_target_position
			var radius := 138.0 if boss_skill_id == "nova" else (210.0 if boss_skill_id in ["quake", "gravity"] else 170.0)
			if center.distance_to(target_player.global_position) <= radius and not target_player.is_dashing:
				var phase_damage := 0.48 if boss_phase == 1 else (0.54 if boss_phase == 2 else 0.68)
				target_player.take_damage(damage_to_player * phase_damage)
				if boss_skill_id == "gravity" and target_player.has_method("apply_slow"):
					target_player.apply_slow(0.9, 0.56)
			if boss_skill_id == "snare":
				_spawn_ink_puddle(center)
			elif boss_skill_id == "embers":
				_spawn_ink_puddle(center + Vector2(96.0, 0.0).rotated(boss_attack_angle))
				_spawn_ink_puddle(center + Vector2(-96.0, 0.0).rotated(boss_attack_angle))
			elif boss_skill_id == "orbit":
				_fire_boss_ring(8 if boss_phase == 1 else 12, 0.34)
			elif boss_skill_id == "gravity":
				for bolt_index in range(4 if boss_phase == 1 else 6):
					_fire_boss_bolt(boss_attack_angle + float(bolt_index) * TAU / float(4 if boss_phase == 1 else 6), 0.32)
		"eclipse", "void_bloom":
			var center := boss_target_position if boss_skill_id == "eclipse" else global_position
			var radius := 188.0 if boss_phase == 1 else 224.0
			if center.distance_to(target_player.global_position) <= radius and not target_player.is_dashing:
				var phase_damage := 0.52 if boss_phase == 1 else (0.58 if boss_phase == 2 else 0.72)
				target_player.take_damage(damage_to_player * phase_damage)
			_fire_boss_ring(10 if boss_phase == 1 else 14, 0.30)
			if boss_skill_id == "void_bloom":
				_spawn_ink_puddle(center + Vector2(104.0, 0.0).rotated(boss_attack_angle))
				_spawn_ink_puddle(center + Vector2(-104.0, 0.0).rotated(boss_attack_angle))
		"fan", "shards":
			_fire_boss_fan(count, 0.92 if boss_skill_id == "fan" else 0.62)
		"sever":
			_fire_sever_volley(boss_attack_angle, 0.48 if boss_phase > 1 else 0.40)
			if boss_phase >= 3:
				boss_sever_echo_angle = boss_attack_angle + 0.12
				boss_sever_echo_timer = 0.34
				boss_sever_echo_armed = true
		"split":
			_fire_boss_fan(3 if boss_phase == 1 else 5, 0.38)
			var opposite_angle := boss_attack_angle + PI
			for offset in [-0.2, 0.0, 0.2]:
				_fire_boss_bolt(opposite_angle + offset, 0.32)
		"mirror", "echo", "return":
			_fire_boss_fan(3 if boss_skill_id == "mirror" else count, 0.5)
			if boss_skill_id == "return":
				_fire_boss_bolt(boss_attack_angle + PI, 0.4)
			elif boss_skill_id == "echo" and boss_phase > 1:
				_fire_boss_fan(3, 0.28)
		"crossfire", "finale":
			_fire_boss_bolt(boss_attack_angle + PI * 0.25, 0.45)
			_fire_boss_bolt(boss_attack_angle - PI * 0.25, 0.45)
			if boss_skill_id == "finale":
				_fire_boss_ring(12 if boss_phase < 3 else 18, 0.4)
		"rift":
			var offset := Vector2(155.0, 0.0).rotated(boss_attack_angle + PI)
			global_position = target_player.global_position + offset
			global_position.x = clampf(global_position.x, -1140.0, 1140.0)
			global_position.y = clampf(global_position.y, -840.0, 840.0)
			_fire_boss_fan(5 if boss_phase == 1 else 7, 0.58)
	if label and not boss_custom_name.is_empty():
		label.text = boss_custom_name
	if boss_skill_id != "charge":
		recovery_timer = 0.5 if boss_phase == 1 else 0.35
	queue_redraw()

func _fire_boss_bolt(angle: float, damage_factor: float) -> void:
	var direction := Vector2(cos(angle), sin(angle))
	_fire_boss_bolt_from(angle, damage_factor, global_position + direction * 28.0)

func _fire_boss_bolt_from(angle: float, damage_factor: float, origin: Vector2) -> void:
	if not is_inside_tree():
		return
	var bolt = HarpyBolt.new(Vector2(cos(angle), sin(angle)), damage_to_player * damage_factor)
	bolt.speed = 240.0 + float(boss_phase) * 36.0
	get_tree().current_scene.add_child(bolt)
	bolt.global_position = origin

func _fire_sever_volley(angle: float, damage_factor: float) -> void:
	# Two parallel ink cuts leave a deliberate player-width margin between them.
	# The final phase repeats with a slight angle change, so standing still in the
	# gap is safe for the first cut but requires another read for the echo.
	var direction := Vector2(cos(angle), sin(angle))
	var margin_axis := direction.orthogonal()
	for side in [-1.0, 1.0]:
		var offset: Vector2 = margin_axis * float(side) * 56.0
		_fire_boss_bolt_from(angle, damage_factor, global_position + offset + direction * 28.0)

func _fire_boss_fan(count: int, spread: float) -> void:
	for index in range(count):
		var t := 0.0 if count <= 1 else float(index) / float(count - 1)
		var phase_damage := 0.34 if boss_phase == 1 else (0.41 if boss_phase == 2 else 0.49)
		_fire_boss_bolt(boss_attack_angle - spread * 0.5 + spread * t, phase_damage)

func _fire_boss_ring(count: int, damage_factor: float) -> void:
	for index in range(count):
		_fire_boss_bolt(float(index) * TAU / float(count), damage_factor)

func enrage_boss(overtime_level: int) -> void:
	boss_overtime = overtime_level
	speed *= 1.08
	damage_to_player *= 1.06
	boss_skill_interval = maxf(2.7, boss_skill_interval * 0.88)
	if sprite:
		boss_phase_tint = boss_custom_color.lightened(minf(0.72, 0.22 + 0.16 * float(overtime_level)))
		sprite.modulate = boss_phase_tint
	queue_redraw()

func _update_readable_motion() -> void:
	if not sprite:
		return
	var phase := float(Time.get_ticks_msec()) * 0.012
	var motion := Vector2.ONE
	if is_milestone_boss:
		var breath := sin(phase * (1.2 if boss_phase < 3 else 1.8))
		motion = Vector2(1.0 + breath * 0.035, 1.0 - breath * 0.026)
		if boss_telegraph_timer > 0.0:
			var windup := clampf(1.0 - boss_telegraph_timer, 0.0, 1.0)
			motion *= Vector2(1.0 + windup * 0.18, 1.0 - windup * 0.15)
		elif boss_charge_timer > 0.0:
			motion *= Vector2(1.22, 0.78)
			var charge_dir := Vector2(cos(boss_attack_angle), sin(boss_attack_angle))
			sprite.position = base_sprite_position - charge_dir * 5.0
			sprite.rotation = boss_attack_angle * 0.08
		elif recovery_timer > 0.0:
			var follow_through := clampf(recovery_timer / 0.5, 0.0, 1.0)
			motion *= Vector2(1.0 - follow_through * 0.15, 1.0 + follow_through * 0.12)
			sprite.position = base_sprite_position
			sprite.rotation = sin(phase * 0.55) * 0.022 + boss_attack_angle * 0.035 * follow_through
		elif boss_phase == 3:
			motion *= 1.0 + 0.035 * absf(breath)
			sprite.position = base_sprite_position
			sprite.rotation = sin(phase * 0.55) * 0.022
		else:
			sprite.position = base_sprite_position
			sprite.rotation = sin(phase * 0.55) * 0.022
		if boss_hit_recoil_timer > 0.0:
			var hit_recoil := clampf(boss_hit_recoil_timer / 0.22, 0.0, 1.0)
			motion *= Vector2(1.0 + 0.24 * hit_recoil, 1.0 - 0.20 * hit_recoil)
			sprite.position = base_sprite_position + boss_hit_recoil_direction * 10.0 * hit_recoil
			sprite.rotation += boss_hit_recoil_direction.x * 0.09 * hit_recoil
	else:
		match enemy_type:
			"Homophone Harpy":
				motion = Vector2(1.0 + sin(phase * 1.7) * 0.09, 1.0 - sin(phase * 1.7) * 0.09)
				if telegraph_timer > 0.0:
					motion = Vector2(1.24, 0.76)
			"Run-on Reaper":
				if telegraph_timer > 0.0:
					motion = Vector2(1.18, 0.68)
				elif charge_timer > 0.0:
					motion = Vector2(1.38, 0.76)
				elif recovery_timer > 0.0:
					motion = Vector2(0.78, 1.2)
			"Idiom Imp":
				if telegraph_timer > 0.0:
					motion = Vector2(0.84, 1.16)
			"Oxymoron Ogre":
				if telegraph_timer > 0.0:
					motion = Vector2(1.2, 0.82)
				elif recovery_timer > 0.0:
					motion = Vector2(0.82, 1.18)
			"Punctuation Phantom":
				motion = Vector2.ONE * (1.0 + sin(phase) * 0.035)
				if telegraph_timer > 0.0:
					motion = Vector2(0.72, 1.18)
				elif charge_timer > 0.0:
					motion = Vector2(1.3, 0.82)
	if hit_squash_timer > 0.0:
		var squash := clampf(hit_squash_timer / 0.11, 0.0, 1.0)
		motion *= Vector2(1.0 + 0.13 * squash, 1.0 - 0.10 * squash)
	sprite.scale = base_sprite_scale * motion

func fire_harpy_bolt():
	if not is_inside_tree():
		return
	var bolt = HarpyBolt.new(attack_direction, damage_to_player * 0.55)
	get_tree().current_scene.add_child(bolt)
	bolt.global_position = global_position + attack_direction * 24.0

func _draw_mistake_echo_semantic() -> void:
	var colors := {
		"book": Color("#b36a3f"), "mount": Color("#bd7a42"), "beast": Color("#ba5e48"), "avian": Color("#6ea6d8"), "insect": Color("#77bb55"), "tide": Color("#3aaec2"), "scale": Color("#67a88e"), "swarm": Color("#c799e8"), "ember": Color("#f2733e"), "frost": Color("#8ed5f2"), "storm": Color("#788df0"), "thorn": Color("#70ad54"), "stone": Color("#9a8f7a"), "shadow": Color("#7762a8"), "radiant": Color("#f4cb59"), "clockwork": Color("#c49d51"), "cosmic": Color("#9471d5"), "sonic": Color("#50c3b5"), "sound": Color("#55b8be"), "mind": Color("#d17bd3"), "scribe": Color("#dfc183"), "ward": Color("#75c5a3"), "vital": Color("#e7798c"), "venom": Color("#8fb33a"), "emotion": Color("#e77b74"), "gear": Color("#9ca2ae"), "gilded": Color("#efc64c"), "feast": Color("#df9c4a"), "swift": Color("#64d6c7"), "colossus": Color("#aa7b68"), "imp": Color("#ce718d"), "mirror": Color("#87a9df"), "piercer": Color("#d1d5dc"), "magnet": Color("#cb6c74"), "mimic": Color("#a574d0"), "spectre": Color("#c5a4e8"), "human": Color("#e0ad82"), "social": Color("#de87a1"), "speech": Color("#e7d56a"), "travel": Color("#72c6bd"), "home": Color("#d99163"), "city": Color("#87a3b9"), "commerce": Color("#e0b74f"), "conflict": Color("#d65f54"), "craft": Color("#bf9765"), "knowledge": Color("#84c7eb"), "beauty": Color("#ec92c6"), "weather": Color("#8cadd6"), "nature": Color("#77b878"), "shape": Color("#a48ce0"), "measure": Color("#83b1ca"), "change": Color("#d18ee1"), "status": Color("#dbcb68"), "texture": Color("#be9d83"), "time": Color("#d1aa64"), "linker": Color("#78b9a9"), "action": Color("#eb835b"), "aura": Color("#b88ce3"), "relic": Color("#bfa56e"), "body": Color("#dc777c"), "food": Color("#b5be50"), "furniture": Color("#ab815d"), "tool": Color("#a1a8b4"), "sport": Color("#73bf6d"), "transport": Color("#6eabd6"), "clothing": Color("#d382b1"), "medical": Color("#f18b80"), "education": Color("#74b8df"), "art": Color("#d57bb0"), "communication": Color("#6cc6bd"), "container": Color("#cb9b60"), "fantasy": Color("#a97de0"), "law": Color("#c4b36c"), "celebration": Color("#ed9f52"), "obstacle": Color("#a98f7c"), "treasure": Color("#e1c347"), "role": Color("#72b8a5"), "abstract": Color("#a394d1")
	}
	var glyphs := {
		"book":"BK", "mount":"MT", "beast":"BW", "avian":"AV", "insect":"IN", "tide":"TD", "scale":"SC", "swarm":"SW", "ember":"EM", "frost":"FR", "storm":"ST", "thorn":"TH", "stone":"SN", "shadow":"SH", "radiant":"RA", "clockwork":"CW", "cosmic":"CO", "sonic":"SO", "sound":"SD", "mind":"MI", "scribe":"SR", "ward":"WD", "vital":"VI", "venom":"VN", "emotion":"EE", "gear":"GE", "gilded":"GI", "feast":"FE", "swift":"SF", "colossus":"CL", "imp":"IP", "mirror":"MR", "piercer":"PI", "magnet":"MG", "mimic":"MC", "spectre":"SP", "human":"HU", "social":"SO", "speech":"SC", "travel":"TR", "home":"HO", "city":"CT", "commerce":"CM", "conflict":"CF", "craft":"CR", "knowledge":"KN", "beauty":"BE", "weather":"WE", "nature":"NA", "shape":"SH", "measure":"ME", "change":"CH", "status":"SA", "texture":"TX", "time":"TI", "linker":"LK", "action":"AC", "aura":"AU", "relic":"RE", "body":"BD", "food":"FD", "furniture":"FU", "tool":"TL", "sport":"SP", "transport":"TP", "clothing":"CL", "medical":"MD", "education":"ED", "art":"AR", "communication":"CO", "container":"CN", "fantasy":"FA", "law":"LW", "celebration":"CE", "obstacle":"OB", "treasure":"TR", "role":"RO", "abstract":"AB"
	}
	var tint: Color = colors.get(mistake_echo_archetype, Color("#bfa56e"))
	var mark: String = glyphs.get(mistake_echo_archetype, "RE")
	var center := Vector2(0.0, -24.0)
	draw_circle(center, 13.0, tint)
	draw_arc(center, 13.0, 0.0, TAU, 24, Color("#fff0c4"), 2.0, true)
	draw_string(ThemeDB.fallback_font, center + Vector2(-9.0, 4.0), mark, HORIZONTAL_ALIGNMENT_CENTER, 18.0, 8, Color("#17232c"))
	match mistake_echo_archetype:
		"book", "education", "art", "communication":
			draw_rect(Rect2(-18.0, -46.0, 36.0, 22.0), Color("#9b5738"), true)
			draw_rect(Rect2(-18.0, -46.0, 36.0, 22.0), Color("#fff0c4"), false, 1.5)
			draw_line(Vector2(0.0, -45.0), Vector2(0.0, -25.0), Color("#fff0c4"), 1.2)
		"ward", "law", "status", "medical":
			draw_colored_polygon(PackedVector2Array([Vector2(0,-47),Vector2(15,-39),Vector2(12,-28),Vector2(0,-22),Vector2(-12,-28),Vector2(-15,-39)]), tint.lightened(0.25))
		"radiant", "ember", "beauty", "aura", "treasure":
			for i in range(8):
				var angle := TAU * float(i) / 8.0
				draw_line(center + Vector2(cos(angle), sin(angle)) * 15.0, center + Vector2(cos(angle), sin(angle)) * 21.0, tint.lightened(0.4), 2.0)
		"clockwork", "gear", "tool", "furniture", "transport":
			draw_arc(center, 17.0, 0.0, TAU, 24, tint.lightened(0.3), 2.0, true)
		"piercer", "conflict", "obstacle", "stone":
			draw_colored_polygon(PackedVector2Array([Vector2(0,-47),Vector2(10,-36),Vector2(0,-25),Vector2(-10,-36)]), tint.lightened(0.3))
		"mount", "beast", "human", "body", "role":
			draw_colored_polygon(PackedVector2Array([Vector2(-11,-41),Vector2(-17,-52),Vector2(-5,-45),Vector2(11,-41),Vector2(17,-52),Vector2(5,-45)]), tint.lightened(0.25))
		_:
			draw_arc(center, 17.0, 0.0, TAU, 24, tint.lightened(0.25), 2.0, true)

func _draw():
	if is_mistake_echo:
		_draw_mistake_echo_semantic()
	_draw_tactical_affix_overlay()
	if is_milestone_boss:
		_draw_milestone_boss()
		return
	if telegraph_timer <= 0.0 and recovery_timer <= 0.0:
		return
	var is_harpy = enemy_type == "Homophone Harpy"
	var is_phantom = enemy_type == "Punctuation Phantom"
	if enemy_type == "Idiom Imp" and telegraph_timer > 0.0:
		var puddle_center := telegraph_target_position - global_position
		var pulse := 1.0 + 0.08 * sin(Time.get_ticks_msec() * 0.022)
		draw_circle(puddle_center, 31.0 * pulse, Color(0.48, 0.12, 0.7, 0.1))
		draw_arc(puddle_center, 31.0 * pulse, 0.0, TAU, 36, Color(0.72, 0.35, 0.94, 0.84), 3.0, true)
		return
	if enemy_type == "Oxymoron Ogre" and telegraph_timer > 0.0:
		var progress := 1.0 - telegraph_timer / 0.84
		var shock_radius := lerpf(24.0, 118.0, progress)
		draw_arc(Vector2.ZERO, shock_radius, 0.0, TAU, 48, Color(1.0, 0.38, 0.08, 0.82), 4.0, true)
		draw_arc(Vector2.ZERO, 118.0, 0.0, TAU, 48, Color(1.0, 0.72, 0.22, 0.44), 1.5, true)
		return
	if enemy_type == "Run-on Reaper" and recovery_timer > 0.0:
		draw_arc(Vector2.ZERO, 29.0, 0.0, TAU, 32, Color(0.36, 0.95, 0.54, 0.8), 2.5, true)
		return
	if telegraph_timer <= 0.0:
		return
	var line_length = 300.0 if is_harpy else (185.0 if is_phantom else 230.0)
	var tint = Color(0.96, 0.28, 0.24, 0.5 + 0.35 * absf(sin(Time.get_ticks_msec() * 0.018)))
	if is_harpy:
		tint = Color(0.95, 0.58, 0.20, tint.a)
	var endpoint = attack_direction * line_length
	if is_phantom:
		draw_arc(endpoint, 36.0, 0.0, TAU, 32, tint, 3.0, true)
		draw_arc(endpoint, 22.0, 0.0, TAU, 32, tint.lightened(0.25), 1.5, true)
	else:
		draw_line(Vector2.ZERO, endpoint, tint, 3.0, true)
		draw_arc(endpoint, 13.0, 0.0, TAU, 24, tint, 2.0, true)
	if threat_seal:
		draw_texture_rect(threat_seal, Rect2(endpoint - Vector2(18.0, 18.0), Vector2(36.0, 36.0)), false, tint)

func _draw_milestone_boss() -> void:
	var bar_width := 142.0 if StatsManager.current_wave < 100 else 168.0
	var bar_rect := Rect2(Vector2(-bar_width * 0.5, -75.0), Vector2(bar_width, 8.0))
	draw_rect(bar_rect, Color(0.055, 0.06, 0.055, 0.95), true)
	var health_ratio := clampf(health / maxf(max_health, 1.0), 0.0, 1.0)
	draw_rect(Rect2(bar_rect.position, Vector2(bar_width * health_ratio, bar_rect.size.y)), boss_custom_color, true)
	draw_rect(bar_rect, Color(0.91, 0.84, 0.65, 0.92), false, 1.4)
	draw_line(Vector2(-bar_width * 0.5, -61.0), Vector2(bar_width * 0.5, -61.0), Color(boss_custom_color, 0.32), 1.0)
	if boss_telegraph_timer <= 0.0:
		if boss_sever_echo_armed:
			_draw_sever_lanes(boss_sever_echo_angle, 0.42, 2.0)
		return
	var pulse := 1.0 + 0.07 * sin(Time.get_ticks_msec() * 0.024)
	var mark := boss_target_position - global_position
	var color := Color(boss_custom_color, 0.62 + 0.24 * absf(sin(Time.get_ticks_msec() * 0.019)))
	if boss_skill_id in ["quake", "orbit"]:
		mark = Vector2.ZERO
	if boss_skill_id == "void_bloom":
		mark = Vector2.ZERO
	if boss_skill_id in ["nova", "quake", "orbit", "gravity", "snare", "embers", "eclipse", "void_bloom"]:
		var radius := 188.0 if boss_skill_id == "eclipse" else (224.0 if boss_skill_id == "void_bloom" else (138.0 if boss_skill_id == "nova" else (210.0 if boss_skill_id in ["quake", "gravity"] else 170.0)))
		draw_circle(mark, radius * pulse, Color(boss_custom_color, 0.10))
		draw_arc(mark, radius * pulse, 0.0, TAU, 52, color, 4.0, true)
		draw_arc(mark, radius * 0.82, 0.0, TAU, 52, Color(boss_custom_color, 0.4), 1.4, true)
	elif boss_skill_id == "rift":
		draw_arc(mark, 36.0 * pulse, 0.0, TAU, 36, color, 4.0, true)
	elif boss_skill_id == "sever":
		_draw_sever_lanes(boss_attack_angle, 0.82, 4.0)
		if boss_sever_echo_armed:
			_draw_sever_lanes(boss_sever_echo_angle, 0.38, 2.0)
	else:
		var angle_offset := 0.0
		if boss_skill_id == "crossfire": angle_offset = PI * 0.25
		var direction := Vector2(cos(boss_attack_angle + angle_offset), sin(boss_attack_angle + angle_offset))
		draw_line(Vector2.ZERO, direction * 1050.0, color, 5.0, true)
		draw_arc(direction * 1050.0, 18.0, 0.0, TAU, 24, Color.WHITE, 2.0, true)
		if boss_skill_id in ["crossfire", "finale", "split"]:
			var cross := Vector2(cos(boss_attack_angle - PI * 0.25), sin(boss_attack_angle - PI * 0.25))
			draw_line(Vector2.ZERO, cross * 1050.0, Color(boss_custom_color, 0.35), 3.0, true)

func _draw_sever_lanes(angle: float, alpha: float, width: float) -> void:
	var direction := Vector2(cos(angle), sin(angle))
	var margin_axis := direction.orthogonal()
	var endpoint := direction * 1050.0
	for side in [-1.0, 1.0]:
		var offset: Vector2 = margin_axis * float(side) * 56.0
		draw_line(offset, endpoint + offset, Color(boss_custom_color.r, boss_custom_color.g, boss_custom_color.b, alpha), width, true)
	# The center track uses separated dashes so players can read it as the safe margin.
	for segment in range(12):
		if segment % 2 == 0:
			var start := direction * (float(segment) * 76.0)
			var finish := direction * (float(segment) * 76.0 + 34.0)
			draw_line(start, finish, Color(0.93, 0.82, 0.56, alpha * 0.58), 1.5, true)

func take_damage(amount: float, knock_dir: Vector2, impact_profile: String = "ink", is_critical: bool = false):
	if is_exploding:
		return
	amount *= StatsManager.get_relic_damage_multiplier(self)
	if affix == "shielded" and velocity.length_squared() > 0.01 and (-knock_dir.normalized()).dot(velocity.normalized()) > 0.0:
		amount *= 0.25
	if is_milestone_boss and recovery_timer > 0.0:
		amount *= 1.25
	StatsManager.relic_on_enemy_hit(self)
	health -= amount
	if is_milestone_boss:
		boss_hit_recoil_timer = 0.22 if is_critical else 0.16
		boss_hit_recoil_direction = -knock_dir.normalized() if knock_dir.length_squared() > 0.001 else Vector2.UP
		queue_redraw()
	if is_inside_tree() and get_tree().current_scene:
		var audio = get_tree().current_scene.get_node_or_null("AudioManager")
		if audio and audio.has_method("play_effect"):
			audio.play_effect("hit")
	flash_timer = 0.11 if is_critical else 0.09
	hit_squash_timer = (0.20 if is_critical else 0.14) if is_milestone_boss else (0.11 if is_critical else 0.075)
	modulate = Color(2.5, 2.5, 2.5) if is_critical else Color(1.9, 1.9, 1.9)
	var push_strength := 0.0 if is_milestone_boss else (205.0 if is_critical else 150.0)
	knockback = knock_dir.normalized() * push_strength
	spawn_hit_effect("critical" if is_critical else impact_profile, knock_dir, is_critical)

	if is_boss and not is_enraged and health < max_health * 0.5:
		trigger_boss_enrage()

	if health <= 0:
		if affix == "volatile" and not is_exploding:
			start_volatile_explosion()
		else:
			die()

func trigger_boss_enrage() -> void:
	if is_enraged:
		return
	is_enraged = true
	speed *= 1.25
	damage_to_player *= 1.25
	modulate = Color(2.8, 0.4, 0.4)
	StatsManager.trigger_screen_shake(0.45, 12.0)
	StatsManager.trigger_tactical_alert("BOSS PHASE 2: KIZGINLIK", "Hız ve hasar arttı. Lazer saldırısının uyarı çizgisini takip et.")
	StatsManager.add_floating_text(global_position + Vector2(0, -45), "ENRAGED PHASE 2", Color(1.0, 0.2, 0.2), 26)
	queue_redraw()

func start_volatile_explosion() -> void:
	is_exploding = true
	explode_timer = 1.1
	StatsManager.add_floating_text(global_position + Vector2(0, -25), "PATLAMA GERİ SAYIMI", Color(1.0, 0.3, 0.2), 18)
	queue_redraw()

func detonate_volatile_bomb() -> void:
	StatsManager.trigger_screen_shake(0.3, 9.0)
	var players := get_tree().get_nodes_in_group("player")
	if not players.is_empty():
		var player = players[0]
		if is_instance_valid(player) and global_position.distance_to(player.global_position) <= 140.0 and player.has_method("take_damage"):
			player.take_damage(damage_to_player * 1.2)
	die()

func spawn_hit_effect(impact_profile: String, knock_dir: Vector2, is_critical: bool = false) -> void:
	if not is_inside_tree():
		return
	var impact_index := int({"ink": 0, "gold": 0, "slash": 1, "shield": 2, "critical": 3, "heavy": 4, "rune": 5, "piercing": 6, "blunt": 7}.get(impact_profile, 0))
	var effect_sprite := Sprite2D.new()
	effect_sprite.name = "CombatHitEffect"
	effect_sprite.add_to_group("combat_hit_fx")
	effect_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	effect_sprite.texture = load("res://assets/sprites/effects/combat_hit_%d.png" % impact_index)
	effect_sprite.z_index = 18
	effect_sprite.global_position = global_position
	effect_sprite.rotation = knock_dir.angle()
	var size := 46.0 if is_critical else (40.0 if impact_profile == "heavy" else 30.0)
	effect_sprite.scale = Vector2.ONE * (size / 64.0 * 0.68)
	get_tree().current_scene.add_child(effect_sprite)
	effect_sprite.global_position = global_position
	var existing_effects := get_tree().get_nodes_in_group("combat_hit_fx")
	while existing_effects.size() > 40:
		var oldest = existing_effects.pop_front()
		if is_instance_valid(oldest) and oldest != effect_sprite:
			oldest.queue_free()
	var tween := effect_sprite.create_tween()
	tween.set_parallel(true)
	tween.tween_property(effect_sprite, "scale", Vector2.ONE * (size / 64.0), 0.12).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(effect_sprite, "modulate:a", 0.0, 0.12)
	tween.chain().tween_callback(effect_sprite.queue_free)

func apply_stun(duration: float) -> void:
	if is_milestone_boss:
		duration *= 0.25
	stun_timer = maxf(stun_timer, duration)
	telegraph_timer = 0.0
	charge_timer = 0.0
	queue_redraw()

func apply_slow(duration: float, factor: float = 0.35) -> void:
	slow_timer = maxf(slow_timer, duration)
	slow_factor = minf(slow_factor, clampf(factor, 0.05, 1.0))

func apply_weapon_mark(duration: float) -> void:
	weapon_mark_timer = maxf(weapon_mark_timer, maxf(0.2, duration))
	queue_redraw()

func apply_burn(damage_per_tick: float, duration: float, stack_cap: int = 1) -> void:
	var next_stack := mini(maxi(stack_cap, 1), burn_stacks + 1)
	var previous_damage := burn_damage * float(burn_stacks)
	burn_stacks = next_stack
	burn_damage = minf(maxf(damage_per_tick, burn_damage), damage_per_tick * float(maxi(stack_cap, 1)))
	burn_timer = maxf(burn_timer, duration)
	if burn_timer > 0.0 and burn_tick_timer <= 0.0:
		burn_tick_timer = 0.2
	# Keep total tick output bounded when several flame hits land in one burst.
	if previous_damage > 0.0:
		burn_damage = minf(burn_damage, previous_damage / float(burn_stacks) + damage_per_tick * 0.5)

func die():
	if is_queued_for_deletion():
		return
	if is_inside_tree() and get_tree().current_scene:
		var audio = get_tree().current_scene.get_node_or_null("AudioManager")
		if audio and audio.has_method("play_effect"):
			audio.play_effect("death")
	if not suppress_rewards:
		StatsManager.register_kill()
		if randf() < 0.035:
			var scrolls := get_tree().get_nodes_in_group("health_scrolls")
			while scrolls.size() >= 2:
				var oldest = scrolls.pop_front()
				if is_instance_valid(oldest):
					oldest.queue_free()
			var health_scroll: Area2D = HEALTH_SCROLL_SCENE.instantiate()
			health_scroll.global_position = global_position
			get_tree().current_scene.call_deferred("add_child", health_scroll)
		if StatsManager.selected_character == "rune_sorceress":
			for nearby in Enemy.get_active_enemies():
				if nearby != self and is_instance_valid(nearby) and global_position.distance_to(nearby.global_position) <= 118.0:
					var burst_direction = (nearby.global_position - global_position).normalized()
					nearby.take_damage(34.0 * StatsManager.damage_mult, burst_direction * 220.0)
		# Spawn ink drop
		if ink_drop_scene:
			var drop = ink_drop_scene.instantiate()
			drop.global_position = global_position
			drop.ink_value = ink_reward
			get_tree().current_scene.call_deferred("add_child", drop)

	queue_free()

func despawn_without_rewards():
	suppress_rewards = true
	queue_free()
