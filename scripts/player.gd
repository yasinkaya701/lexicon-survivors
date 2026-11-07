extends CharacterBody2D

const ARENA_FRAME_SCRIPT := preload("res://scripts/arena_frame.gd")

signal gadget_cooldown_updated(time_left: float, total_time: float)

@onready var sprite = $Sprite2D
@onready var invuln_timer = $InvulnerabilityTimer
@onready var weapons_container = $Weapons
@onready var camera = $Camera2D

var weapon_scene: PackedScene = preload("res://scenes/weapon.tscn")

var is_invulnerable: bool = false
var inventory_input_blocked: bool = false
var blink_timer: float = 0.0
var character_base_color: Color = Color.WHITE

# Camera Screen Shake
var shake_timer: float = 0.0
var shake_intensity: float = 0.0

# Active Gadget
var is_dashing: bool = false
var dash_timer: float = 0.0
var dash_duration: float = 0.22
var dash_velocity: Vector2 = Vector2.ZERO
var gadget_cooldown: float = 4.0
var gadget_timer: float = 0.0
var _rmb_was_pressed: bool = false
var shield_health: float = 0.0
var shield_timer: float = 0.0
var shield_charges: int = 0
var dash_hit_ids: Dictionary = {}
var index_storm_timer: float = 0.0
var index_storm_elapsed: float = 0.0
var index_storm_hit_ids: Dictionary = {}
var ink_trail_timer: float = 0.0
var ink_trail_elapsed: float = 0.0
var decoy_timer: float = 0.0
var decoy_position: Vector2 = Vector2.ZERO
var last_gadget_direction: Vector2 = Vector2.RIGHT
var mnemonic_guard_timer: float = 0.0
var chrono_attack_boost_timer: float = 0.0
var chrono_previous_attack_speed: float = 1.0
var magnet_timer: float = 0.0
var redact_telegraph_timer: float = 0.0
var hero_anim_clock: float = 0.0
var attack_anim_timer: float = 0.0
var attack_anim_duration: float = 0.28
var attack_anim_windup: float = 0.08
var attack_anim_active: float = 0.08
var attack_anim_kind: String = "melee"
var ranged_recoil_timer: float = 0.0
var ranged_recoil_direction: Vector2 = Vector2.RIGHT
var ranged_recoil_distance: float = 0.0
const RANGED_RECOIL_DURATION := 0.14
var current_hero_frame: int = -1
var current_hero_animation: String = ""
var run_anim_phase: float = 0.0
var last_aim_direction: Vector2 = Vector2.RIGHT
var locomotion_pose_offset: Vector2 = Vector2.ZERO

const INKY_IDLE_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/inky_idle_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_idle_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_idle_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_idle_3.png")
]
const INKY_RUN_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/inky_run_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_run_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_run_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_run_v2_3.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_run_v2_4.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_run_v2_5.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_run_v2_6.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_run_v2_7.png")
]
const INKY_ATTACK_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/inky_attack_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_attack_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_attack_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_attack_v2_3.png")
]
const INKY_RANGED_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/inky_ranged_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_ranged_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_ranged_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/inky_ranged_v2_3.png")
]
const WORD_KNIGHT_IDLE_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_idle_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_idle_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_idle_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_idle_3.png")
]
const WORD_KNIGHT_RUN_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_run_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_run_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_run_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_run_v2_3.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_run_v2_4.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_run_v2_5.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_run_v2_6.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_run_v2_7.png")
]
const WORD_KNIGHT_ATTACK_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_attack_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_attack_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_attack_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_attack_v2_3.png")
]
const SHADOW_SCRIBE_IDLE_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_idle_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_idle_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_idle_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_idle_3.png")
]
const SHADOW_SCRIBE_RUN_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_run_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_run_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_run_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_run_v2_3.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_run_v2_4.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_run_v2_5.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_run_v2_6.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_run_v2_7.png")
]
const SHADOW_SCRIBE_ATTACK_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_attack_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_attack_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_attack_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_attack_v2_3.png")
]
const QUILLMASTER_IDLE_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_idle_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_idle_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_idle_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_idle_3.png")
]
const QUILLMASTER_RUN_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_run_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_run_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_run_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_run_v2_3.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_run_v2_4.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_run_v2_5.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_run_v2_6.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_run_v2_7.png")
]
const QUILLMASTER_ATTACK_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_attack_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_attack_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_attack_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_attack_v2_3.png")
]
const RUNE_SORCERESS_IDLE_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_idle_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_idle_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_idle_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_idle_3.png")
]
const RUNE_SORCERESS_RUN_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_run_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_run_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_run_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_run_v2_3.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_run_v2_4.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_run_v2_5.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_run_v2_6.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_run_v2_7.png")
]
const RUNE_SORCERESS_ATTACK_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_attack_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_attack_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_attack_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_attack_v2_3.png")
]
const ALCHEMIST_IDLE_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_idle_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_idle_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_idle_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_idle_3.png")
]
const ALCHEMIST_RUN_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_run_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_run_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_run_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_run_v2_3.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_run_v2_4.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_run_v2_5.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_run_v2_6.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_run_v2_7.png")
]
const ALCHEMIST_ATTACK_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_attack_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_attack_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_attack_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_attack_v2_3.png")
]
const WORD_KNIGHT_RANGED_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_ranged_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_ranged_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_ranged_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/word_knight_ranged_v2_3.png")
]
const SHADOW_SCRIBE_RANGED_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_ranged_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_ranged_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_ranged_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/shadow_scribe_ranged_v2_3.png")
]
const QUILLMASTER_RANGED_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_ranged_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_ranged_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_ranged_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/quillmaster_ranged_v2_3.png")
]
const RUNE_SORCERESS_RANGED_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_ranged_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_ranged_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_ranged_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/rune_sorceress_ranged_v2_3.png")
]
const ALCHEMIST_RANGED_FRAMES := [
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_ranged_v2_0.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_ranged_v2_1.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_ranged_v2_2.png"),
	preload("res://assets/sprites/upgrade_v1/animations/alchemist_ranged_v2_3.png")
]
const HERO_ANIMATIONS := {
	"inky": {"idle": INKY_IDLE_FRAMES, "run": INKY_RUN_FRAMES, "attack": INKY_ATTACK_FRAMES, "ranged": INKY_RANGED_FRAMES},
	"word_knight": {"idle": WORD_KNIGHT_IDLE_FRAMES, "run": WORD_KNIGHT_RUN_FRAMES, "attack": WORD_KNIGHT_ATTACK_FRAMES, "ranged": WORD_KNIGHT_RANGED_FRAMES},
	"shadow_lexicographer": {"idle": SHADOW_SCRIBE_IDLE_FRAMES, "run": SHADOW_SCRIBE_RUN_FRAMES, "attack": SHADOW_SCRIBE_ATTACK_FRAMES, "ranged": SHADOW_SCRIBE_RANGED_FRAMES},
	"quillmaster": {"idle": QUILLMASTER_IDLE_FRAMES, "run": QUILLMASTER_RUN_FRAMES, "attack": QUILLMASTER_ATTACK_FRAMES, "ranged": QUILLMASTER_RANGED_FRAMES},
	"rune_sorceress": {"idle": RUNE_SORCERESS_IDLE_FRAMES, "run": RUNE_SORCERESS_RUN_FRAMES, "attack": RUNE_SORCERESS_ATTACK_FRAMES, "ranged": RUNE_SORCERESS_RANGED_FRAMES},
	"lexicon_alchemist": {"idle": ALCHEMIST_IDLE_FRAMES, "run": ALCHEMIST_RUN_FRAMES, "attack": ALCHEMIST_ATTACK_FRAMES, "ranged": ALCHEMIST_RANGED_FRAMES}
}

func _ready():
	add_to_group("player")
	StatsManager.hp_changed.connect(_on_hp_changed)
	StatsManager.weapon_equipped.connect(_on_weapon_equipped)
	StatsManager.weapon_switched.connect(_on_weapon_switched)
	StatsManager.character_selected.connect(_on_character_changed)
	StatsManager.gadget_switched.connect(_on_gadget_changed)
	StatsManager.screen_shake_requested.connect(_on_screen_shake_requested)

	apply_character_appearance()
	sync_weapons()

func _on_screen_shake_requested(duration: float, intensity: float):
	shake_timer = duration
	shake_intensity = intensity

func apply_character_appearance():
	var char_id = StatsManager.selected_character
	current_hero_frame = -1
	current_hero_animation = ""
	var sprite_names = {
		"inky": "hero_inky.png",
		"quillmaster": "hero_quillmaster.png",
		"word_knight": "hero_word_knight.png",
		"rune_sorceress": "hero_rune_sorceress.png",
		"lexicon_alchemist": "hero_alchemist.png",
		"shadow_lexicographer": "hero_shadow_scribe.png"
	}
	var sprite_path = "res://assets/sprites/upgrade_v1/" + sprite_names.get(char_id, "hero_inky.png")
	var loaded_sprite = load(sprite_path) as Texture2D
	if loaded_sprite:
		sprite.texture = loaded_sprite
	var character_data = StatsManager.characters.get(char_id, StatsManager.characters["inky"])
	character_base_color = character_data.get("color", Color.WHITE)
	sprite.modulate = character_base_color
	sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST

func sync_weapons():
	if not weapons_container:
		return

	# Clear existing weapons
	for child in weapons_container.get_children():
		weapons_container.remove_child(child)
		child.queue_free()

	var weaps = StatsManager.equipped_weapons
	var count = weaps.size()
	var active_idx = StatsManager.active_weapon_index
	for i in range(count):
		var w_id = weaps[i]
		var w_inst = weapon_scene.instantiate()
		w_inst.weapon_id = w_id
		w_inst.weapon_tier = StatsManager.get_weapon_tier(w_id)

		var is_active = (i == active_idx)
		weapons_container.add_child(w_inst)
		if w_inst.has_method("setup_weapon"):
			w_inst.setup_weapon(w_id)
		if w_inst.has_method("set_active_focus"):
			w_inst.set_active_focus(is_active)
		if w_inst.has_method("set_mount_pose"):
			w_inst.set_mount_pose(i, is_active, sprite.flip_h)

func update_weapon_mounts():
	# Keep the selected weapon at the hero's forward hand. Remaining auto-fire
	# weapons sit in a compact, fixed holster stack instead of circling the hero.
	var active_idx = StatsManager.active_weapon_index
	for i in range(weapons_container.get_child_count()):
		var weapon = weapons_container.get_child(i)
		if weapon.has_method("set_mount_pose"):
			weapon.set_mount_pose(i, i == active_idx, sprite.flip_h)

func _unhandled_input(event: InputEvent):
	if event is InputEventKey and event.is_pressed() and not event.is_echo():
		match event.keycode:
			KEY_I, KEY_TAB:
				var hud := get_tree().get_first_node_in_group("hud")
				if hud and hud.has_method("toggle_inventory"):
					hud.toggle_inventory()
					get_viewport().set_input_as_handled()
				return
			KEY_ESCAPE:
				if inventory_input_blocked:
					var hud := get_tree().get_first_node_in_group("hud")
					if hud and hud.has_method("set_inventory_open"):
						hud.set_inventory_open(false)
					get_viewport().set_input_as_handled()
				return
			KEY_Q:
				StatsManager.switch_prev_weapon()
			KEY_E:
				StatsManager.switch_next_weapon()
			KEY_1:
				StatsManager.select_weapon_index(0)
			KEY_2:
				StatsManager.select_weapon_index(1)
			KEY_3:
				StatsManager.select_weapon_index(2)
			KEY_4:
				StatsManager.select_weapon_index(3)
			KEY_5:
				StatsManager.select_weapon_index(4)
	elif event is InputEventMouseButton and event.is_pressed():
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			StatsManager.switch_prev_weapon()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			StatsManager.switch_next_weapon()

func _on_weapon_equipped(_w_id: String):
	sync_weapons()

func _on_weapon_switched(_w_id: String, _w_idx: int):
	sync_weapons()

func _on_character_changed(_char_id: String):
	apply_character_appearance()
	sync_weapons()

func _physics_process(delta: float):
	hero_anim_clock += delta
	attack_anim_timer = maxf(0.0, attack_anim_timer - delta)
	ranged_recoil_timer = maxf(0.0, ranged_recoil_timer - delta)
	_advance_run_phase(delta)
	# Camera Screen Shake
	if shake_timer > 0 and camera:
		shake_timer -= delta
		camera.offset = Vector2(randf_range(-shake_intensity, shake_intensity), randf_range(-shake_intensity, shake_intensity))
		if shake_timer <= 0:
			camera.offset = Vector2.ZERO
	# Gadget Cooldown
	if gadget_timer > 0:
		gadget_timer -= delta
		emit_signal("gadget_cooldown_updated", max(0.0, gadget_timer), gadget_cooldown)
	if shield_timer > 0.0:
		shield_timer = maxf(0.0, shield_timer - delta)
		if shield_timer == 0.0:
			shield_health = 0.0
			shield_charges = 0
			queue_redraw()
	if index_storm_timer > 0.0:
		index_storm_timer = maxf(0.0, index_storm_timer - delta)
		index_storm_elapsed += delta
		if index_storm_elapsed >= 0.42:
			index_storm_elapsed = 0.0
			strike_with_index_card()
	if ink_trail_elapsed > 0.0:
		ink_trail_elapsed = maxf(0.0, ink_trail_elapsed - delta)
		ink_trail_timer += delta
		if ink_trail_timer >= 0.20:
			ink_trail_timer = 0.0
			strike_ink_trail()
	if decoy_timer > 0.0:
		decoy_timer = maxf(0.0, decoy_timer - delta)
	if mnemonic_guard_timer > 0.0:
		mnemonic_guard_timer = maxf(0.0, mnemonic_guard_timer - delta)
	if chrono_attack_boost_timer > 0.0:
		chrono_attack_boost_timer = maxf(0.0, chrono_attack_boost_timer - delta)
		if chrono_attack_boost_timer == 0.0:
			StatsManager.attack_speed_mult = chrono_previous_attack_speed
	if magnet_timer > 0.0:
		magnet_timer = maxf(0.0, magnet_timer - delta)
		pull_nearby_pickups()
	if redact_telegraph_timer > 0.0:
		redact_telegraph_timer = maxf(0.0, redact_telegraph_timer - delta)
	if inventory_input_blocked:
		is_dashing = false
		velocity = Vector2.ZERO
		move_and_slide()
		_update_hero_animation()
		return

	# Dash execution
	if is_dashing:
		dash_timer -= delta
		velocity = dash_velocity
		move_and_slide()
		_clamp_to_visible_shelf_edge()

		# Erase / damage slimes in contact while dashing
		erase_nearby_enemies()

		if dash_timer <= 0:
			is_dashing = false
			if invuln_timer.time_left <= 0.0:
				is_invulnerable = false
		_update_hero_animation()
		return

	var input_vector: Vector2 = Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if input_vector.length_squared() < 0.01:
		var hud := get_tree().get_first_node_in_group("hud")
		if hud and hud.has_method("get_touch_move_vector"):
			input_vector = hud.get_touch_move_vector()
	if input_vector.length_squared() < 0.01 and StatsManager.touch_input_direction.length_squared() > 0.01:
		input_vector = StatsManager.touch_input_direction
	var target_velocity = input_vector * StatsManager.move_speed
	velocity = approach_locomotion_velocity(velocity, target_velocity, delta)
	move_and_slide()
	_clamp_to_visible_shelf_edge()

	if input_vector.x != 0:
		sprite.flip_h = input_vector.x < 0
	if input_vector.length_squared() > 0.01:
		last_aim_direction = input_vector.normalized()
	update_weapon_mounts()

	# Check Gadget Activation (Space / Right Mouse / Action)
	var rmb_now = Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT)
	var rmb_just_pressed = rmb_now and not _rmb_was_pressed
	_rmb_was_pressed = rmb_now

	var wants_gadget = Input.is_action_just_pressed("dash") or rmb_just_pressed or Input.is_key_pressed(KEY_SPACE)
	if wants_gadget and gadget_timer <= 0:
		activate_active_gadget(input_vector)

	# Handle i-frames blink
	if is_invulnerable:
		blink_timer += delta * 18.0
		var a = 0.35 if int(blink_timer) % 2 == 0 else 1.0
		sprite.modulate = Color(character_base_color.r, character_base_color.g, character_base_color.b, a)
	else:
		sprite.modulate = character_base_color
	_update_hero_animation()

func approach_locomotion_velocity(current: Vector2, target: Vector2, delta: float) -> Vector2:
	var current_speed := current.length()
	var target_speed := target.length()
	var acceleration := 2400.0 if target_speed < 0.001 else 1450.0
	if target_speed >= 0.001 and current_speed > 0.001 and current.dot(target) < -0.15 * current_speed * target_speed:
		acceleration = 1900.0
	return current.move_toward(target, acceleration * delta)

func _advance_run_phase(delta: float) -> void:
	if velocity.length() > 24.0:
		run_anim_phase += velocity.length() * delta / 17.0

func get_run_frame_index(phase: float, frame_count: int) -> int:
	if frame_count <= 0:
		return 0
	return posmod(int(floor(phase * float(frame_count) / 8.0)), frame_count)

func get_hero_run_frame_count(character_id: String = "") -> int:
	var resolved_id := character_id if not character_id.is_empty() else StatsManager.selected_character
	var animation_set: Dictionary = HERO_ANIMATIONS.get(resolved_id, HERO_ANIMATIONS["inky"])
	return (animation_set.get("run", []) as Array).size()

func request_attack_pose(weapon_id: String, action_kind: String, aim: Vector2, recoil_px: float = 3.5, rhythm: Dictionary = {}) -> void:
	if aim.length_squared() > 0.01:
		last_aim_direction = aim.normalized()
		if action_kind != "ranged" or velocity.length() <= 30.0:
			if absf(last_aim_direction.x) > 0.05:
				sprite.flip_h = last_aim_direction.x < 0.0
	if action_kind == "ranged":
		attack_anim_kind = "ranged"
		ranged_recoil_direction = last_aim_direction
		ranged_recoil_distance = clampf(recoil_px * 0.72, 2.0, 6.5)
		ranged_recoil_timer = RANGED_RECOIL_DURATION
		# Ranged hits use a short weapon-ready → release → settle pose. Heavy
		# weapons get a longer brace, while rapid fire preserves the locomotion loop.
		var ranged_pose_duration := 0.20
		if weapon_id in ["crossword_crossbow", "grammar_sniper", "thesaurus_rocket"]:
			ranged_pose_duration = 0.30
		elif weapon_id in ["syllable_shotgun", "lexicon_beam", "rune_orb"]:
			ranged_pose_duration = 0.24
		attack_anim_windup = ranged_pose_duration * 0.36
		attack_anim_active = ranged_pose_duration * 0.18
		attack_anim_duration = ranged_pose_duration
		attack_anim_timer = ranged_pose_duration
		return
	if action_kind not in ["melee", "cast", "heavy"]:
		return
	attack_anim_kind = action_kind
	attack_anim_windup = maxf(0.0, float(rhythm.get("windup", 0.08)))
	attack_anim_active = maxf(0.0, float(rhythm.get("active", 0.08)))
	var recovery_cap := 0.30 if action_kind == "heavy" else 0.18 if action_kind == "melee" else 0.22
	var recovery := minf(maxf(0.0, float(rhythm.get("recovery", 0.12))), recovery_cap)
	attack_anim_duration = maxf(0.16, attack_anim_windup + attack_anim_active + recovery)
	attack_anim_timer = attack_anim_duration

func get_shot_recoil_offset() -> Vector2:
	if ranged_recoil_timer <= 0.0 or ranged_recoil_distance <= 0.0:
		return Vector2.ZERO
	var recovery := clampf(ranged_recoil_timer / RANGED_RECOIL_DURATION, 0.0, 1.0)
	return (-ranged_recoil_direction * ranged_recoil_distance * pow(recovery, 1.65)).round()

func get_hero_render_action() -> String:
	var moving := is_dashing or velocity.length() > 30.0
	if is_dashing:
		return "run"
	if attack_anim_timer <= 0.0:
		return "run" if moving else "idle"
	if attack_anim_kind == "ranged":
		return "run" if moving else "ranged"
	var elapsed := maxf(0.0, attack_anim_duration - attack_anim_timer)
	var contact_end := maxf(0.0, attack_anim_windup) + maxf(0.0, attack_anim_active)
	if elapsed < contact_end:
		return "attack"
	return "run" if moving else "attack"

func play_attack_animation() -> void:
	request_attack_pose("", "melee", last_aim_direction)

func set_inventory_input_blocked(blocked: bool) -> void:
	inventory_input_blocked = blocked
	if blocked:
		cancel_active_dash()
		velocity = Vector2.ZERO

func cancel_active_dash() -> void:
	if not is_dashing:
		return
	is_dashing = false
	dash_timer = 0.0
	dash_velocity = Vector2.ZERO
	if invuln_timer.time_left <= 0.0:
		is_invulnerable = false
		blink_timer = 0.0
		sprite.modulate = character_base_color

func get_gadget_direction() -> Vector2:
	var keyboard_direction := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	var touch_direction := Vector2.ZERO
	var hud := get_tree().get_first_node_in_group("hud")
	if hud and hud.has_method("get_touch_move_vector"):
		touch_direction = hud.get_touch_move_vector()
	var fallback := Vector2.LEFT if sprite.flip_h else Vector2.RIGHT
	return resolve_gadget_direction(keyboard_direction, touch_direction, fallback)

func resolve_gadget_direction(keyboard_direction: Vector2, touch_direction: Vector2, fallback: Vector2) -> Vector2:
	var direction := keyboard_direction if keyboard_direction.length_squared() > 0.01 else touch_direction
	if direction.length_squared() <= 0.01:
		direction = fallback
	return direction.normalized() if direction.length_squared() > 0.01 else Vector2.RIGHT

func _clamp_to_visible_shelf_edge() -> void:
	var previous_position := global_position
	var visual_bounds: Rect2 = ARENA_FRAME_SCRIPT.PLAYER_VISUAL_CENTER_BOUNDS
	global_position = global_position.clamp(visual_bounds.position, visual_bounds.end)
	if not is_equal_approx(global_position.x, previous_position.x):
		velocity.x = 0.0
	if not is_equal_approx(global_position.y, previous_position.y):
		velocity.y = 0.0

func _update_hero_animation() -> void:
	_update_locomotion_pose()
	var animation_name := get_hero_render_action()
	if ranged_recoil_timer > 0.0 and last_aim_direction.length_squared() > 0.01:
		if absf(last_aim_direction.x) > 0.05:
			sprite.flip_h = last_aim_direction.x < 0.0
	elif animation_name == "run" and absf(velocity.x) > 20.0:
		sprite.flip_h = velocity.x < 0.0
	elif animation_name == "attack" and attack_anim_timer > 0.0 and absf(last_aim_direction.x) > 0.05:
		sprite.flip_h = last_aim_direction.x < 0.0
	var body_direction := last_aim_direction if animation_name == "attack" or ranged_recoil_timer > 0.0 else (velocity.normalized() if velocity.length() > 30.0 else last_aim_direction)
	# The authored sprites face sideways; a small vertical torso turn keeps up/down
	# movement and aimed attacks from looking like a lateral strafe.
	sprite.rotation = clampf(body_direction.y * 0.38, -0.38, 0.38)
	var animation_set: Dictionary = HERO_ANIMATIONS.get(StatsManager.selected_character, {})
	if animation_set.is_empty():
		return
	if animation_name == "ranged" and not animation_set.has("ranged"):
		animation_name = "attack"
	var frames: Array = animation_set.get(animation_name, animation_set.get("attack", []))
	var frame_index: int
	if animation_name in ["attack", "ranged"]:
		var attack_elapsed := maxf(0.0, attack_anim_duration - attack_anim_timer)
		var active_end := attack_anim_windup + attack_anim_active
		if attack_anim_windup > 0.0 and attack_elapsed < attack_anim_windup:
			frame_index = 0 if attack_elapsed < attack_anim_windup * 0.55 else 1
		elif attack_elapsed < active_end:
			frame_index = 2
		else:
			frame_index = 3
	else:
		frame_index = get_run_frame_index(run_anim_phase, frames.size()) if animation_name == "run" else int(hero_anim_clock / 0.24) % frames.size()
	if frame_index != current_hero_frame or animation_name != current_hero_animation:
		current_hero_frame = frame_index
		current_hero_animation = animation_name
		sprite.texture = frames[frame_index]

func _update_locomotion_pose() -> void:
	if not is_instance_valid(sprite) or not is_instance_valid(weapons_container):
		return
	var speed := velocity.length()
	var candidate := Vector2.ZERO
	if not is_dashing and get_hero_render_action() == "run" and speed > 30.0:
		# Two footfalls per complete eight-frame Inky stride; the old period-2 bob
		# peaked four times per gait and read as a twitch at native pixel scale.
		var bob := roundf(2.0 * absf(sin(run_anim_phase * PI / 4.0)))
		var lean_x := 1.0 if velocity.x > 20.0 else (-1.0 if velocity.x < -20.0 else 0.0)
		candidate = Vector2(lean_x, -bob)
	candidate += get_shot_recoil_offset()
	var visual_bounds: Rect2 = ARENA_FRAME_SCRIPT.PLAYER_VISUAL_CENTER_BOUNDS
	var minimum_pose_offset := visual_bounds.position - global_position
	var maximum_pose_offset := visual_bounds.end - global_position
	locomotion_pose_offset = candidate.clamp(minimum_pose_offset, maximum_pose_offset)
	sprite.position = locomotion_pose_offset
	weapons_container.position = locomotion_pose_offset

func trigger_current_gadget(input_dir: Vector2 = Vector2.ZERO):
	if gadget_timer > 0:
		return

	var gid = StatsManager.active_gadget
	var base_cd = StatsManager.gadgets_catalog.get(gid, {}).get("cooldown", 4.0)
	gadget_cooldown = max(1.5, base_cd * StatsManager.gadget_cooldown_mult)
	gadget_timer = gadget_cooldown
	emit_signal("gadget_cooldown_updated", gadget_timer, gadget_cooldown)

	match gid:
		"dash":
			start_eraser_dash(input_dir)
		"ink_bomb":
			activate_ink_bomb()
		"time_stop":
			activate_chrono_comma()
		"shield":
			activate_lexicon_aegis()
		"magnet":
			activate_grammar_magnet()
		_:
			start_eraser_dash(input_dir)

func activate_ink_bomb():
	StatsManager.trigger_screen_shake(0.35, 12.0)
	StatsManager.add_floating_text(global_position + Vector2(0, -35), "💥 MÜREKKEP KIYAMETİ!", Color(0.2, 0.9, 1.0), 22)
	var enemies = get_tree().get_nodes_in_group("enemies")
	var bomb_dmg = 120.0 * StatsManager.damage_mult
	for e in enemies:
		if is_instance_valid(e) and global_position.distance_to(e.global_position) <= 220.0:
			var knock = (e.global_position - global_position).normalized() * 450.0
			if e.has_method("take_damage"):
				e.take_damage(bomb_dmg, knock)

func activate_chrono_comma():
	StatsManager.trigger_screen_shake(0.2, 6.0)
	StatsManager.add_floating_text(global_position + Vector2(0, -35), "⏸️ KRONOS VİRGÜLÜ (ZAMAN YAVAŞLADI)", Color(0.4, 0.7, 1.0), 22)
	var enemies = get_tree().get_nodes_in_group("enemies")
	for e in enemies:
		if is_instance_valid(e) and "speed" in e:
			var orig_spd = e.speed
			e.speed = max(15.0, orig_spd * 0.2)
			var tw = create_tween()
			tw.tween_interval(3.5)
			tw.tween_callback(func():
				if is_instance_valid(e):
					e.speed = orig_spd
			)

func activate_lexicon_aegis():
	StatsManager.trigger_screen_shake(0.2, 5.0)
	StatsManager.add_floating_text(global_position + Vector2(0, -35), "🛡️ LEKSİKON KALKANI (4s DOKUNULMAZ)", Color(0.3, 1.0, 0.5), 22)
	StatsManager.heal(20.0)
	is_invulnerable = true
	invuln_timer.start(4.0)

func activate_grammar_magnet():
	StatsManager.trigger_screen_shake(0.15, 4.0)
	StatsManager.add_floating_text(global_position + Vector2(0, -35), "🧲 GRAMER MIKNATISI!", Color(1.0, 0.85, 0.3), 22)
	var drops = get_tree().get_nodes_in_group("ink_drops")
	for d in drops:
		if is_instance_valid(d):
			var tw = create_tween()
			tw.tween_property(d, "global_position", global_position, 0.3).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

func start_eraser_dash(input_dir: Vector2):
	var gadget_data: Dictionary = StatsManager.gadgets_catalog.get("eraser_dash", {})
	var values: Dictionary = gadget_data.get("values", {})
	gadget_cooldown = maxf(1.5, float(gadget_data.get("cooldown", StatsManager.gadget_cooldown_base)) * StatsManager.gadget_cooldown_mult)
	gadget_timer = gadget_cooldown
	emit_signal("gadget_cooldown_updated", gadget_timer, gadget_cooldown)

	var dir = input_dir
	if dir == Vector2.ZERO:
		dir = Vector2.LEFT if sprite.flip_h else Vector2.RIGHT
	dir = dir.normalized()

	is_dashing = true
	dash_hit_ids.clear()
	is_invulnerable = true
	dash_duration = float(values.get("invulnerability", 0.35))
	dash_timer = dash_duration
	dash_velocity = dir * (StatsManager.move_speed * 2.8 + 260.0)
	ink_trail_elapsed = float(values.get("trail_seconds", 1.4))
	ink_trail_timer = 0.0

	# Screen flash / particle impulse
	sprite.modulate = Color(2.0, 2.0, 2.5)
	var tween = create_tween()
	tween.tween_property(sprite, "modulate", character_base_color, dash_duration)

func activate_active_gadget(input_dir: Vector2) -> void:
	var gadget_id: String = StatsManager.normalize_gadget_id(StatsManager.active_gadget)
	if gadget_id == "eraser_dash":
		start_eraser_dash(input_dir)
		StatsManager.gadget_activated.emit(gadget_id)
		return
	var gadget_data: Dictionary = StatsManager.gadgets_catalog.get(gadget_id, {})
	if gadget_data.is_empty():
		return
	gadget_cooldown = maxf(1.5, float(gadget_data.get("cooldown", 8.0)) * StatsManager.gadget_cooldown_mult)
	gadget_timer = gadget_cooldown
	emit_signal("gadget_cooldown_updated", gadget_timer, gadget_cooldown)
	StatsManager.gadget_activated.emit(gadget_id)
	var values: Dictionary = gadget_data.get("values", {})
	match gadget_id:
		"ink_cataclysm":
			for projectile in get_tree().get_nodes_in_group("enemy_projectiles"):
				if is_instance_valid(projectile): projectile.queue_free()
			for enemy in get_tree().get_nodes_in_group("enemies"):
				if is_instance_valid(enemy) and global_position.distance_to(enemy.global_position) <= float(values.get("radius", 420.0)):
					var knock = (enemy.global_position - global_position).normalized() * float(values.get("knockback", 220.0))
					enemy.take_damage(float(values.get("damage", 95.0)) * StatsManager.damage_mult, knock)
					if enemy.has_method("apply_stun"):
						enemy.apply_stun(float(values.get("stun_seconds", 1.3)))
		"chrono_comma":
			chrono_attack_boost_timer = float(values.get("duration", 3.5))
			chrono_previous_attack_speed = StatsManager.attack_speed_mult
			StatsManager.attack_speed_mult *= float(values.get("player_attack_speed_factor", 1.2))
			for enemy in get_tree().get_nodes_in_group("enemies"):
				if is_instance_valid(enemy) and enemy.has_method("apply_slow"):
					enemy.apply_slow(float(values.get("duration", 3.5)), float(values.get("enemy_speed_factor", 0.25)))
			for projectile in get_tree().get_nodes_in_group("enemy_projectiles"):
				if is_instance_valid(projectile) and projectile.has_method("apply_slow"):
					projectile.apply_slow(float(values.get("duration", 3.5)), float(values.get("projectile_speed_factor", 0.25)))
		"lexicon_aegis":
			shield_charges = int(values.get("charges", 3))
			shield_health = float(shield_charges)
			shield_timer = float(values.get("duration", 5.0))
			queue_redraw()
		"grammar_magnet":
			magnet_timer = float(values.get("duration", 2.6))
			pull_nearby_pickups()
			for rune in get_tree().get_nodes_in_group("runes"):
				if is_instance_valid(rune) and rune.has_method("attract_to"):
					rune.attract_to(self)
		"index_storm":
			index_storm_timer = float(values.get("duration", 2.8))
			index_storm_elapsed = 0.0
			index_storm_hit_ids.clear()
		"redact_field":
			var forward := input_dir.normalized() if input_dir.length_squared() > 0.01 else get_gadget_direction()
			last_gadget_direction = forward
			redact_telegraph_timer = 0.35
			for enemy in get_tree().get_nodes_in_group("enemies"):
				if not is_instance_valid(enemy): continue
				var offset: Vector2 = enemy.global_position - global_position
				if offset.length() > float(values.get("range", 260.0)) or absf(forward.angle_to(offset.normalized())) > float(values.get("half_angle", 0.72)): continue
				if enemy.has_method("apply_stun"): enemy.apply_stun(0.35)
				if enemy.has_method("apply_slow"): enemy.apply_slow(float(values.get("duration", 1.8)), float(values.get("slow_factor", 0.45)))
		"palimpsest_step":
			var direction := input_dir.normalized() if input_dir.length_squared() > 0.01 else get_gadget_direction()
			last_gadget_direction = direction
			decoy_position = global_position
			decoy_timer = float(values.get("decoy_seconds", 1.5))
			global_position += direction * float(values.get("blink_distance", 130.0))
			_clamp_to_visible_shelf_edge()
			is_invulnerable = true
			invuln_timer.start(0.35)
			queue_redraw()

func _on_gadget_changed(_gadget_id: String) -> void:
	var canonical_id := StatsManager.normalize_gadget_id(StatsManager.active_gadget)
	var gadget_data: Dictionary = StatsManager.gadgets_catalog.get(canonical_id, {})
	gadget_cooldown = float(gadget_data.get("cooldown", 4.0)) * StatsManager.gadget_cooldown_mult
	emit_signal("gadget_cooldown_updated", maxf(gadget_timer, 0.0), gadget_cooldown)

func _draw() -> void:
	if shield_timer > 0.0:
		var strength := clampf(float(shield_charges) / 3.0, 0.25, 1.0)
		draw_arc(Vector2.ZERO, 40.0, 0.0, TAU, 48, Color(0.58, 0.82, 0.84, 0.38 + strength * 0.48), 2.6, true)
	if decoy_timer > 0.0:
		var local_decoy := decoy_position - global_position
		draw_circle(local_decoy, 15.0, Color(0.54, 0.84, 0.86, 0.34))
	if index_storm_timer > 0.0:
		for card_index in range(3):
			var angle := index_storm_elapsed * 5.0 + TAU * float(card_index) / 3.0
			var card_center := Vector2.from_angle(angle) * 46.0
			draw_set_transform(card_center, angle, Vector2.ONE)
			draw_rect(Rect2(-5.0, -8.0, 10.0, 16.0), Color(0.87, 0.80, 0.57, 0.92), true)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	if ink_trail_elapsed > 0.0 and dash_velocity.length_squared() > 0.01:
		var trail_direction := dash_velocity.normalized()
		draw_line(-trail_direction * 18.0, -trail_direction * 48.0, Color(0.12, 0.34, 0.35, 0.7), 4.0, true)
	if redact_telegraph_timer > 0.0:
		draw_line(Vector2.ZERO, last_gadget_direction * 112.0, Color(0.86, 0.34, 0.30, 0.66), 3.0, true)

func erase_nearby_enemies():
	var enemies = get_tree().get_nodes_in_group("enemies")
	var erase_dmg := float(StatsManager.gadgets_catalog.get("eraser_dash", {}).get("values", {}).get("damage", 60.0)) * StatsManager.damage_mult
	for e in enemies:
		var enemy_id := e.get_instance_id() if is_instance_valid(e) else 0
		if is_instance_valid(e) and not dash_hit_ids.has(enemy_id) and global_position.distance_to(e.global_position) <= 48.0:
			var knock = (e.global_position - global_position).normalized() * 300.0
			if e.has_method("take_damage"):
				dash_hit_ids[enemy_id] = true
				e.take_damage(erase_dmg, knock)
				StatsManager.add_floating_text(e.global_position + Vector2(0, -20), str(int(erase_dmg)), Color(0.3, 1.0, 0.4), 18)

func take_damage(amount: float):
	if is_invulnerable or is_dashing:
		return
	if mnemonic_guard_timer > 0.0:
		mnemonic_guard_timer = 0.0
		is_invulnerable = true
		invuln_timer.start(0.45)
		return

	var remaining_damage := amount
	if shield_timer > 0.0 and shield_charges > 0:
		remaining_damage = 0.0
		shield_charges -= 1
		shield_health = float(shield_charges)
		is_invulnerable = true
		invuln_timer.start(0.55)
		queue_redraw()
		if shield_charges <= 0:
			shield_timer = 0.0
			var aegis_values: Dictionary = StatsManager.gadgets_catalog.get("lexicon_aegis", {}).get("values", {})
			var counter_radius := float(aegis_values.get("counter_radius", 90.0))
			for enemy in get_tree().get_nodes_in_group("enemies"):
				if is_instance_valid(enemy) and global_position.distance_to(enemy.global_position) <= counter_radius:
					var knock: Vector2 = (enemy.global_position - global_position).normalized() * 120.0
					enemy.take_damage(float(aegis_values.get("counter_damage", 32.0)) * StatsManager.damage_mult, knock)
	if remaining_damage > 0.0:
		StatsManager.take_damage(remaining_damage)
	else:
		return
	is_invulnerable = true
	invuln_timer.start(0.55)

func grant_mnemonic_guard(duration: float) -> void:
	mnemonic_guard_timer = maxf(mnemonic_guard_timer, duration)

func reset_temporary_gadget_effects() -> void:
	is_dashing = false
	dash_timer = 0.0
	dash_velocity = Vector2.ZERO
	shield_health = 0.0
	shield_timer = 0.0
	shield_charges = 0
	index_storm_timer = 0.0
	index_storm_elapsed = 0.0
	index_storm_hit_ids.clear()
	ink_trail_elapsed = 0.0
	ink_trail_timer = 0.0
	decoy_timer = 0.0
	magnet_timer = 0.0
	redact_telegraph_timer = 0.0
	mnemonic_guard_timer = 0.0
	chrono_attack_boost_timer = 0.0
	is_invulnerable = false
	invuln_timer.stop()
	queue_redraw()

func strike_with_index_card() -> void:
	var values: Dictionary = StatsManager.gadgets_catalog.get("index_storm", {}).get("values", {})
	var cap := int(values.get("target_cap", 3))
	if index_storm_hit_ids.size() >= cap:
		return
	var nearest: Node2D = null
	var nearest_distance := INF
	for candidate in get_tree().get_nodes_in_group("enemies"):
		if not is_instance_valid(candidate) or index_storm_hit_ids.has(candidate.get_instance_id()): continue
		var distance := global_position.distance_to(candidate.global_position)
		if distance < nearest_distance and distance <= 190.0:
			nearest = candidate
			nearest_distance = distance
	if nearest:
		index_storm_hit_ids[nearest.get_instance_id()] = true
		nearest.take_damage(float(values.get("damage", 26.0)) * StatsManager.damage_mult, (nearest.global_position - global_position).normalized() * 80.0)

func pull_nearby_pickups() -> void:
	var values: Dictionary = StatsManager.gadgets_catalog.get("grammar_magnet", {}).get("values", {})
	var radius := float(values.get("radius", 1200.0))
	for drop in get_tree().get_nodes_in_group("ink_drops"):
		if is_instance_valid(drop) and global_position.distance_to(drop.global_position) <= radius:
			drop.target = self
			drop.is_attracted = true
	for rune in get_tree().get_nodes_in_group("runes"):
		if is_instance_valid(rune) and global_position.distance_to(rune.global_position) <= radius and rune.has_method("attract_to"):
			rune.attract_to(self)

func strike_ink_trail() -> void:
	var values: Dictionary = StatsManager.gadgets_catalog.get("eraser_dash", {}).get("values", {})
	for enemy in get_tree().get_nodes_in_group("enemies"):
		if is_instance_valid(enemy) and not dash_hit_ids.has(enemy.get_instance_id()) and enemy.global_position.distance_to(global_position - dash_velocity.normalized() * 24.0) <= float(values.get("trail_radius", 30.0)):
			dash_hit_ids[enemy.get_instance_id()] = true
			enemy.take_damage(float(values.get("damage", 60.0)) * StatsManager.damage_mult, Vector2.ZERO)

func _on_invulnerability_timer_timeout():
	if not is_dashing:
		is_invulnerable = false
		sprite.modulate = character_base_color

func _on_hp_changed(curr: float, _max_h: float):
	if curr <= 0:
		set_physics_process(false)
