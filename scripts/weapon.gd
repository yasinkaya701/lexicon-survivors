extends Node2D


@export var projectile_scene: PackedScene = preload("res://scenes/projectile.tscn")
@export var punctuation_mine_scene: PackedScene = preload("res://scenes/punctuation_mine.tscn")
const WORD_LOOM_FIELD_SCRIPT: Script = preload("res://scripts/word_loom_field.gd")
@export var weapon_id: String = "quill_blaster"
@export var base_cooldown: float = 0.85
@export var detection_range: float = 550.0

var shoot_timer: float = 0.0
var target_enemy: Node2D = null
const TARGET_REACQUIRE_INTERVAL: float = 0.10
var target_reacquire_timer: float = 0.0
var is_melee_slashing: bool = false
var slash_angle: float = 0.0
var is_active_focus: bool = false
var muzzle_flash: Polygon2D
var slash_arc: Line2D
var shot_tween: Tween
var melee_tween: Tween
var sprite_rest_position: Vector2 = Vector2(10.0, 0.0)
var focus_scale: float = 0.72
var visual_data: Dictionary = {}
var visual_base_scale: Vector2 = Vector2.ONE
var muzzle_local_position: Vector2 = Vector2(22.0, 0.0)
var melee_hit_ids: Array[Node2D] = []
var melee_windup: float = 0.10
var melee_active_duration: float = 0.09
var melee_recovery: float = 0.15
var melee_hit_active_started: float = 0.0
var weapon_tier: int = 1:
	set(value):
		weapon_tier = clampi(value, 1, 4)
		_refresh_evolution_key()
var archetype_data: Dictionary = {}
var weapon_evolution_key: String = ""
var shot_sequence: int = 0
var beam_active_timer: float = 0.0
var beam_tick_timer: float = 0.0
var flame_burst_elapsed: float = 0.0
var flame_vent_timer: float = 0.0
var pistol_next_side: int = -1
var turret_shot_timer: float = 0.0
var active_turrets: Array[Node2D] = []

@onready var sprite = $Sprite2D

func _ready():
	setup_weapon(weapon_id)
	weapon_tier = StatsManager.get_weapon_tier(weapon_id)
	_create_combat_cues()
	process_mode = Node.PROCESS_MODE_PAUSABLE

func get_weapon_archetype(type_id: String) -> Dictionary:
	var archetype_file := FileAccess.open("res://assets/data/weapon_archetypes.json", FileAccess.READ)
	if archetype_file == null:
		push_error("Missing shared weapon archetype data")
		return {}
	var parsed: Variant = JSON.parse_string(archetype_file.get_as_text())
	if not parsed is Dictionary:
		push_error("Invalid shared weapon archetype data")
		return {}
	var record: Variant = parsed.get("weapons", {}).get(type_id, {})
	return record if record is Dictionary else {}

func _create_combat_cues():
	muzzle_flash = Polygon2D.new()
	muzzle_flash.name = "MuzzleFlash"
	muzzle_flash.position = muzzle_local_position
	muzzle_flash.polygon = PackedVector2Array([Vector2(-4, -3), Vector2(8, 0), Vector2(-4, 3), Vector2(-1, 0)])
	muzzle_flash.color = Color(1.0, 0.84, 0.49, 0.0)
	muzzle_flash.visible = false
	add_child(muzzle_flash)
	_refresh_muzzle_flash_transform()

	slash_arc = Line2D.new()
	slash_arc.name = "MeleeSlashCue"
	slash_arc.width = 4.0
	slash_arc.default_color = Color(0.91, 0.86, 0.68, 0.92)
	slash_arc.begin_cap_mode = Line2D.LINE_CAP_ROUND
	slash_arc.end_cap_mode = Line2D.LINE_CAP_ROUND
	slash_arc.joint_mode = Line2D.LINE_JOINT_ROUND
	slash_arc.visible = false
	var arc_points := PackedVector2Array()
	for point_index in range(13):
		var arc_angle := deg_to_rad(-52.0 + point_index * (104.0 / 12.0))
		arc_points.append(Vector2.RIGHT.rotated(arc_angle) * 39.0)
	slash_arc.points = arc_points
	add_child(slash_arc)

func set_active_focus(active: bool):
	is_active_focus = active
	if sprite:
		focus_scale = 1.05 if active else 0.68
		sprite.scale = visual_base_scale * focus_scale
		_refresh_muzzle_anchor()
		sprite.modulate = Color(1.12, 1.07, 0.91) if active else Color(0.74, 0.78, 0.73)

func set_mount_pose(slot_index: int, active: bool, facing_left: bool) -> void:
	# Shared visual records define each weapon's authored hand and holster mount.
	var side := -1.0 if facing_left else 1.0
	var mount: Array = visual_data.get("mount_active", [8.0, 2.0])
	if active:
		position = Vector2(float(mount[0]) * side, float(mount[1]))
	else:
		var holster_row := slot_index if slot_index < StatsManager.active_weapon_index else slot_index - 1
		mount = visual_data.get("mount_holstered", [5.0, 9.0])
		position = Vector2(float(mount[0]) * side, float(mount[1]) + float(maxi(holster_row, 0)) * 5.0)
		var facing_angle := PI if facing_left else 0.0
		rotation = facing_angle - deg_to_rad(float(visual_data.get("art_angle_deg", 0.0)))

func _load_visual_record(type_id: String) -> Dictionary:
	var file := FileAccess.open("res://assets/data/weapon_visuals.json", FileAccess.READ)
	if file == null:
		push_error("Missing shared weapon visual metadata")
		return {}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary:
		push_error("Invalid shared weapon visual metadata")
		return {}
	return parsed.get("weapons", {}).get(type_id, {})

func _refresh_muzzle_anchor() -> void:
	if not sprite or not sprite.texture:
		return
	var texture_size: Vector2 = sprite.texture.get_size()
	var grip: Array = visual_data.get("grip", [0.25, 0.5])
	var muzzle: Array = visual_data.get("muzzle", [0.9, 0.5])
	visual_base_scale = Vector2.ONE * (float(visual_data.get("draw_size", 34.0)) / maxf(texture_size.x, texture_size.y))
	sprite.position = Vector2.ZERO
	sprite.offset = Vector2((0.5 - float(grip[0])) * texture_size.x, (0.5 - float(grip[1])) * texture_size.y)
	sprite.scale = visual_base_scale * focus_scale
	muzzle_local_position = Vector2((float(muzzle[0]) - float(grip[0])) * texture_size.x * sprite.scale.x, (float(muzzle[1]) - float(grip[1])) * texture_size.y * sprite.scale.y)
	sprite_rest_position = Vector2.ZERO
	if is_instance_valid(muzzle_flash):
		_refresh_muzzle_flash_transform()

func _refresh_muzzle_flash_transform() -> void:
	if not is_instance_valid(muzzle_flash):
		return
	muzzle_flash.position = muzzle_local_position
	var local_forward := muzzle_local_position.normalized() if muzzle_local_position.length_squared() > 0.01 else Vector2.RIGHT.rotated(deg_to_rad(float(visual_data.get("art_angle_deg", 0.0))))
	muzzle_flash.rotation = local_forward.angle()

func _load_weapon_texture(type_id: String) -> Texture2D:
	var weapon_texture_path := "res://assets/sprites/weapons/%s.png" % type_id
	if ResourceLoader.exists(weapon_texture_path):
		var weapon_texture := load(weapon_texture_path) as Texture2D
		if weapon_texture:
			return weapon_texture
	# Keep older project copies playable while the sliced atlas assets are being added.
	var legacy_texture_path := "res://assets/sprites/%s.png" % type_id
	if ResourceLoader.exists(legacy_texture_path):
		return load(legacy_texture_path) as Texture2D
	return null

func get_muzzle_world_position() -> Vector2:
	return global_position + muzzle_local_position.rotated(rotation)

func get_muzzle_direction() -> Vector2:
	if muzzle_local_position.length_squared() <= 0.01:
		return Vector2.RIGHT.rotated(rotation + deg_to_rad(float(visual_data.get("art_angle_deg", 0.0)))).normalized()
	return muzzle_local_position.rotated(rotation).normalized()

func setup_weapon(type_id: String):
	weapon_id = type_id
	var weapon_data = StatsManager.weapons_catalog.get(weapon_id, {})
	visual_data = _load_visual_record(weapon_id)
	archetype_data = get_weapon_archetype(weapon_id)
	weapon_tier = StatsManager.get_weapon_tier(weapon_id) if StatsManager.has_method("get_weapon_tier") else 1
	_refresh_evolution_key()
	base_cooldown = float(weapon_data.get("cooldown", base_cooldown))
	if not sprite:
		sprite = get_node_or_null("Sprite2D")
		
	match weapon_id:
		"quill_blaster":
			detection_range = 550.0
		"syllable_shotgun":
			detection_range = 440.0
		"lexicon_beam":
			detection_range = 620.0
		"punctuation_bomb":
			detection_range = 450.0
		"dictionary_blade":
			detection_range = 140.0
		"crossword_crossbow":
			detection_range = 600.0
		"hyphen_boomerang":
			detection_range = 520.0
		"ink_flamethrower":
			detection_range = 380.0
		"thesaurus_rocket":
			detection_range = 640.0
		"quote_pistols":
			detection_range = 560.0
		"calligraphy_katana":
			detection_range = 210.0
		"scroll_turret":
			detection_range = 580.0
		"rune_orb":
			detection_range = 560.0
		"grammar_sniper":
			detection_range = 750.0
		"word_loom":
			detection_range = 610.0
	if sprite:
		var weapon_texture := _load_weapon_texture(weapon_id)
		if weapon_texture:
			sprite.texture = weapon_texture
		focus_scale = 1.05 if is_active_focus else 0.68
		_refresh_muzzle_anchor()
		rotation = -deg_to_rad(float(visual_data.get("art_angle_deg", 0.0)))
		var weapon_is_in_hero_pose := (StatsManager.selected_character == "inky" and weapon_id == "quill_blaster") \
			or (StatsManager.selected_character == "quillmaster" and weapon_id == "syllable_shotgun") \
			or (StatsManager.selected_character == "word_knight" and weapon_id == "dictionary_blade") \
			or (StatsManager.selected_character == "rune_sorceress" and weapon_id == "rune_orb") \
			or (StatsManager.selected_character == "shadow_lexicographer" and weapon_id == "calligraphy_katana")
		sprite.visible = not weapon_is_in_hero_pose
	if archetype_data.is_empty():
		push_error("Weapon %s has no shared archetype record" % weapon_id)

func _tier_damage_multiplier() -> float:
	return [1.0, 1.35, 1.80, 2.50][clampi(weapon_tier, 1, 4) - 1]

func _tier_cooldown_multiplier() -> float:
	return [1.0, 0.85, 0.75, 0.65][clampi(weapon_tier, 1, 4) - 1]

func _evolution_key() -> String:
	return weapon_evolution_key

func _refresh_evolution_key() -> void:
	if weapon_tier <= 1 or archetype_data.is_empty():
		weapon_evolution_key = ""
		return
	weapon_evolution_key = String(archetype_data.get("evolutions", {}).get(str(weapon_tier), ""))

func get_weapon_evolution_key() -> String:
	return _evolution_key()

func _process(delta: float):
	shoot_timer -= delta
	var attack_due := shoot_timer <= 0.0 and (weapon_id != "ink_flamethrower" or flame_vent_timer <= 0.0)
	var beam_tick_due := beam_active_timer > 0.0 and beam_tick_timer <= delta
	_update_target_cache(delta, attack_due or beam_tick_due)
	if beam_active_timer > 0.0:
		beam_active_timer = maxf(0.0, beam_active_timer - delta)
		beam_tick_timer -= delta
		if beam_tick_timer <= 0.0 and target_enemy and is_instance_valid(target_enemy):
			beam_tick_timer = float(archetype_data.get("limits", {}).get("tick_seconds", 0.10))
			var beam_dir := get_muzzle_direction()
			spawn_one_projectile(beam_dir, _base_attack_damage() * 0.22, 12 + StatsManager.pierce_count, 1180.0, Color(0.2, 0.95, 1.0), false, "charged_line")
		if beam_active_timer <= 0.0:
			_play_shot_cue()
	if weapon_id == "ink_flamethrower":
		if flame_vent_timer > 0.0:
			flame_vent_timer = maxf(0.0, flame_vent_timer - delta)
			return
		if shoot_timer <= 0.0:
			var interval := maxf(StatsManager.get_stat_limit("weapon_min_cooldown_seconds"), 0.12 / maxf(0.1, StatsManager.attack_speed_mult * _tier_cooldown_multiplier()))
			shoot_timer = interval
			flame_burst_elapsed += interval
			shoot()
			if flame_burst_elapsed >= float(archetype_data.get("rhythm", {}).get("active", 0.72)):
				flame_burst_elapsed = 0.0
				flame_vent_timer = float(archetype_data.get("rhythm", {}).get("recovery", 0.48)) / maxf(0.75, StatsManager.attack_speed_mult)
		return
	if target_enemy and is_instance_valid(target_enemy) and not is_melee_slashing:
		var target_angle = (target_enemy.global_position - global_position).angle() - deg_to_rad(float(visual_data.get("art_angle_deg", 0.0)))
		rotation = lerp_angle(rotation, target_angle, delta * 14.0)
	elif is_active_focus and not is_melee_slashing:
		var player_node := get_tree().get_first_node_in_group("player")
		if is_instance_valid(player_node) and player_node.get("last_aim_direction") is Vector2:
			var facing_angle: float = player_node.last_aim_direction.angle() - deg_to_rad(float(visual_data.get("art_angle_deg", 0.0)))
			rotation = lerp_angle(rotation, facing_angle, delta * 9.0)
	
	var effective_attack_speed = max(0.1, StatsManager.attack_speed_mult)
	if is_active_focus:
		effective_attack_speed *= 1.25 # Quick-Draw bonus for switched active weapon
		
	var effective_cooldown = max(StatsManager.get_stat_limit("weapon_min_cooldown_seconds"), base_cooldown * _tier_cooldown_multiplier() / effective_attack_speed)
	if shoot_timer <= 0:
		shoot_timer = effective_cooldown
		shoot()
	if weapon_id == "scroll_turret":
		_process_deployed_turrets(delta)

func _update_target_cache(delta: float, force_refresh: bool = false) -> void:
	target_reacquire_timer = maxf(0.0, target_reacquire_timer - delta)
	if target_enemy != null and not _is_cached_target_in_range():
		target_enemy = null
		force_refresh = true
	if force_refresh or target_reacquire_timer <= 0.0:
		find_nearest_enemy()

func _is_cached_target_in_range() -> bool:
	if not is_instance_valid(target_enemy) or not target_enemy.is_in_group("enemies"):
		return false
	var offset := target_enemy.global_position - global_position
	if offset.length_squared() >= detection_range * detection_range:
		return false
	var target_health: Variant = target_enemy.get("health")
	if (target_health is float or target_health is int) and float(target_health) <= 0.0:
		return false
	return true

func find_nearest_enemy():
	if not is_inside_tree():
		return
	var enemies = get_tree().get_nodes_in_group("enemies")
	var closest: Node2D = null
	var min_dist_squared: float = detection_range * detection_range
	var best_priority := -INF
	for e in enemies:
		if is_instance_valid(e) and e is Node2D:
			var enemy_health: Variant = e.get("health")
			if (enemy_health is float or enemy_health is int) and float(enemy_health) <= 0.0:
				continue
			var offset: Vector2 = e.global_position - global_position
			var distance_squared := offset.length_squared()
			if distance_squared >= detection_range * detection_range:
				continue
			if weapon_id == "grammar_sniper" or StatsManager.has_artifact("archivist_compass"):
				var priority := StatsManager.get_relic_target_priority(e)
				if weapon_id == "grammar_sniper":
					priority += 100000.0 if e.get("enemy_type") in ["Red Pen Boss", "Lexicon Dragon Boss"] else 0.0
				if priority > best_priority:
					best_priority = priority
					closest = e
			else:
				if distance_squared < min_dist_squared:
					min_dist_squared = distance_squared
					closest = e
				
	target_enemy = closest
	target_reacquire_timer = TARGET_REACQUIRE_INTERVAL

func shoot():
	if weapon_id in ["dictionary_blade", "calligraphy_katana"]:
		start_melee_swing()
		return
	elif weapon_id == "punctuation_bomb":
		_notify_player_attack("cast")
		_play_shot_cue()
		drop_punctuation_mine()
		return
	elif weapon_id == "word_loom":
		_notify_player_attack("cast")
		_play_shot_cue()
		_place_word_loom_field()
		return
		
	if (not target_enemy or not is_instance_valid(target_enemy)) and weapon_id not in ["scroll_turret"]:
		return
	if not projectile_scene:
		return
	_notify_player_attack(_get_action_kind())
	_play_shot_cue()
		
	var is_crit = randf() < StatsManager.crit_chance
	var base_dmg = _base_attack_damage(is_crit)
	var prc = StatsManager.pierce_count
	var base_dir = get_muzzle_direction()
	shot_sequence += 1
	
	match weapon_id:
		"quill_blaster":
			var count = StatsManager.projectile_count + (1 if weapon_tier >= 4 else 0)
			if count == 1:
				spawn_one_projectile(base_dir, base_dmg, prc, 540.0, Color.WHITE, is_crit)
			else:
				var spread_angle = deg_to_rad(14.0 if weapon_tier < 3 else 10.0)
				var start_angle = -((count - 1) * spread_angle) / 2.0
				for i in range(count):
					var current_dir = base_dir.rotated(start_angle + i * spread_angle)
					spawn_one_projectile(current_dir, base_dmg, prc, 540.0, Color.WHITE, is_crit)
					
		"syllable_shotgun":
			var shotgun_limits: Dictionary = archetype_data.get("limits", {})
			var pellets = int(shotgun_limits.get("pellets", 5)) + (1 if weapon_tier >= 2 else 0) + (StatsManager.projectile_count - 1) * 2
			var pellet_dmg = base_dmg * 0.82
			var spread_angle = float(shotgun_limits.get("spread_radians", 0.42))
			if weapon_tier >= 3:
				spread_angle *= 0.74
			for i in range(pellets):
				var offset_ang: float = (randf() - 0.5) * spread_angle
				if weapon_tier >= 3 and i == pellets / 2:
					offset_ang = 0.0
				var pellet_dir = base_dir.rotated(offset_ang)
				var spd = randf_range(460.0, 600.0)
				spawn_one_projectile(pellet_dir, pellet_dmg, 1, spd, Color(1.0, 0.75, 0.3), is_crit, "pellet_stagger")
				
		"lexicon_beam":
			beam_active_timer = float(archetype_data.get("rhythm", {}).get("active", 0.46)) + (0.18 if weapon_tier >= 2 else 0.0)
			beam_tick_timer = 0.0
		"crossword_crossbow":
			var crossbow_pierce := 1 if weapon_tier < 2 else int(archetype_data.get("limits", {}).get("pierce_base", 1)) + weapon_tier
			spawn_one_projectile(base_dir, base_dmg, crossbow_pierce, 620.0, Color(0.85, 0.75, 0.2), is_crit)
		"hyphen_boomerang":
			spawn_one_projectile(base_dir, base_dmg, 1, 520.0, Color(1.0, 0.45, 0.2), is_crit)
		"ink_flamethrower":
			# Short flame pulses widen into a three-lane ignition sweep at the final evolution.
			var cone_width := float(archetype_data.get("limits", {}).get("cone_radians", 0.48)) * (1.3 if weapon_tier >= 2 else 1.0)
			var spread = (randf() - 0.5) * cone_width
			spawn_one_projectile(base_dir.rotated(spread), base_dmg, 3, 380.0, Color(1.0, 0.35, 0.1), is_crit, "burn_cone")
			if get_weapon_evolution_key() == "igniting_sweep":
				spawn_one_projectile(base_dir.rotated(-cone_width * 0.48), base_dmg * 0.42, 2, 350.0, Color(1.0, 0.52, 0.18), false, "burn_cone")
				spawn_one_projectile(base_dir.rotated(cone_width * 0.48), base_dmg * 0.42, 2, 350.0, Color(1.0, 0.52, 0.18), false, "burn_cone")
		"thesaurus_rocket":
			spawn_one_projectile(base_dir, base_dmg, 1, 360.0, Color(0.7, 0.3, 0.8), is_crit, "lock_cluster")
		"quote_pistols":
			var side_offset = float(pistol_next_side * 8)
			pistol_next_side *= -1
			var perp = Vector2(-base_dir.y, base_dir.x) * side_offset
			var p = projectile_scene.instantiate()
			get_tree().current_scene.add_child(p)
			p.global_position = get_muzzle_world_position() + perp
			p.setup(base_dir, base_dmg, prc, 640.0, Color(1.0, 0.9, 0.3), is_crit, String(visual_data.get("impact", "gold")), "two_tap_reload", weapon_tier, archetype_data.get("limits", {}))
			if weapon_tier >= 3 and shot_sequence % 3 == 0:
				spawn_one_projectile(base_dir, base_dmg * 0.5, 1, 520.0, Color(1.0, 0.82, 0.35), false, "punctuation_third")
		"calligraphy_katana":
			start_melee_swing()
		"scroll_turret":
			_place_scroll_turret(base_dmg)
		"rune_orb":
			spawn_one_projectile(base_dir, base_dmg * 0.84, 1, 420.0, Color(0.3, 0.85, 1.0), is_crit, "pulse_bounce")
		"grammar_sniper":
			spawn_one_projectile(base_dir, base_dmg * 1.35, 999, 1250.0, Color(1.0, 0.2, 0.4), is_crit, "weakpoint_rail")

func drop_punctuation_mine():
	if not is_inside_tree() or not punctuation_mine_scene:
		return
	var is_crit = randf() < StatsManager.crit_chance
	var mine_dmg := _base_attack_damage(is_crit)
	var drop_offset = Vector2.RIGHT.rotated(randf() * TAU) * randf_range(20.0, 50.0)
	if target_enemy and is_instance_valid(target_enemy):
		var to_enemy = (target_enemy.global_position - global_position).normalized()
		drop_offset = to_enemy * randf_range(30.0, 65.0)
	var mine = punctuation_mine_scene.instantiate()
	# Persisting mines share one cap across weapon rebuilds.
	var mines := get_tree().get_nodes_in_group("punctuation_mines")
	mines = mines.filter(func(existing): return is_instance_valid(existing) and not existing.is_queued_for_deletion())
	while mines.size() >= 3:
		var oldest_mine = mines.pop_front()
		if is_instance_valid(oldest_mine):
			oldest_mine.queue_free()
	var mine_radius := float(archetype_data.get("limits", {}).get("blast_radius", 125.0)) * (1.18 if weapon_tier >= 2 else 1.0)
	var mine_fuse := float(archetype_data.get("limits", {}).get("fuse_seconds", 1.05))
	var mine_hazard := float(archetype_data.get("limits", {}).get("hazard_seconds", 2.2))
	mine.setup(global_position + drop_offset, mine_dmg, mine_radius, mine_fuse, mine_hazard, weapon_tier)
	get_tree().current_scene.add_child(mine)
	mine.add_to_group("punctuation_mines")

func _place_word_loom_field() -> void:
	if not is_instance_valid(target_enemy):
		return
	var limits: Dictionary = archetype_data.get("limits", {})
	var deployed := get_tree().get_nodes_in_group("word_loom_fields").filter(func(field): return is_instance_valid(field) and not field.is_queued_for_deletion())
	var cap := int(limits.get("field_cap", 3))
	var required_slots := 2 if weapon_tier >= 4 else 1
	while deployed.size() > cap - required_slots:
		var oldest: Node2D = deployed.pop_front()
		if is_instance_valid(oldest):
			oldest.queue_free()
	var field: Variant = Node2D.new()
	field.set_script(WORD_LOOM_FIELD_SCRIPT)
	get_tree().current_scene.add_child(field)
	var tier_scale := 1.2 if weapon_tier >= 2 else 1.0
	if weapon_tier >= 4:
		tier_scale *= 1.25
	field.setup(target_enemy.global_position, float(limits.get("radius", 108.0)) * tier_scale,
		float(limits.get("lifetime", 2.8)), float(limits.get("tick_seconds", 0.35)),
		_base_attack_damage() * 0.24, float(limits.get("slow_factor", 0.46)),
		float(limits.get("slow_seconds", 0.6)), weapon_tier)
	field.add_to_group("word_loom_fields")
	if weapon_tier >= 4:
		var linked_target: Node2D = null
		var linked_distance := 260.0
		for enemy in get_tree().get_nodes_in_group("enemies"):
			if enemy == target_enemy or not is_instance_valid(enemy):
				continue
			var distance := target_enemy.global_position.distance_to(enemy.global_position)
			if distance < linked_distance:
				linked_distance = distance
				linked_target = enemy
		if is_instance_valid(linked_target):
			var linked_field: Variant = Node2D.new()
			linked_field.set_script(WORD_LOOM_FIELD_SCRIPT)
			get_tree().current_scene.add_child(linked_field)
			linked_field.setup(linked_target.global_position, float(limits.get("radius", 108.0)) * tier_scale * 0.82,
				float(limits.get("lifetime", 2.8)), float(limits.get("tick_seconds", 0.35)),
				_base_attack_damage() * 0.18, float(limits.get("slow_factor", 0.46)),
				float(limits.get("slow_seconds", 0.6)), weapon_tier)
			linked_field.add_to_group("word_loom_fields")

func sweep_blade_attack():
	if not is_inside_tree():
		return
	var is_crit = randf() < StatsManager.crit_chance
	var melee_dmg = _base_attack_damage(is_crit) * (1.25 if weapon_id == "calligraphy_katana" else 1.0)
	var deflected_count := 0
	if weapon_id == "dictionary_blade":
		# The guard only catches shots during the visible active frame of the swing.
		var guard_radius := float(archetype_data.get("limits", {}).get("parry_radius", 132.0))
		for projectile in get_tree().get_nodes_in_group("enemy_projectiles"):
			if is_instance_valid(projectile) and global_position.distance_to(projectile.global_position) <= guard_radius:
				projectile.queue_free()
				deflected_count += 1
		if deflected_count > 0 and weapon_tier >= 3:
			var counter_target: Node2D = null
			var nearest_distance := guard_radius * 2.5
			for enemy in get_tree().get_nodes_in_group("enemies"):
				if is_instance_valid(enemy):
					var distance := global_position.distance_to(enemy.global_position)
					if distance < nearest_distance:
						nearest_distance = distance
						counter_target = enemy
			if counter_target:
				var counter_direction := (counter_target.global_position - global_position).normalized()
				spawn_one_projectile(counter_direction, _base_attack_damage() * 0.65, 1, 760.0, Color(0.95, 0.8, 0.42), false, "guard_counter")
	
	# The blade only lands in its forward arc during the active frames of the swing.
	var enemies = get_tree().get_nodes_in_group("enemies")
	var forward = get_muzzle_direction()
	var radius := float(archetype_data.get("limits", {}).get("radius", 132.0)) if weapon_id == "dictionary_blade" else float(archetype_data.get("limits", {}).get("range", 178.0))
	if weapon_id == "dictionary_blade" and weapon_tier >= 2:
		radius *= 1.18
	if weapon_id == "calligraphy_katana" and weapon_tier >= 3:
		radius *= 1.12
	for e in enemies:
		if is_instance_valid(e) and not e in melee_hit_ids and global_position.distance_to(e.global_position) <= radius:
			var knock_dir = (e.global_position - global_position).normalized()
			if knock_dir == Vector2.ZERO:
				knock_dir = Vector2.RIGHT
			var is_guard_sweep := weapon_id == "dictionary_blade"
			var is_cross_cut := weapon_id == "calligraphy_katana" and get_weapon_evolution_key() == "cross_cut"
			var cone_limit := -0.1 if weapon_tier >= 4 else (-0.18 if is_cross_cut else 0.34)
			if not is_guard_sweep and knock_dir.dot(forward) < cone_limit:
				continue
			if e.has_method("take_damage"):
				melee_hit_ids.append(e)
				var slash_profile := "slash" if weapon_id == "calligraphy_katana" else "gold"
				var marked_finisher := weapon_id == "calligraphy_katana" and weapon_tier >= 4 and float(e.get("weapon_mark_timer")) > 0.0
				e.take_damage(melee_dmg * (1.45 if marked_finisher else 1.0), knock_dir, slash_profile, is_crit)
				if e.has_method("apply_stun"):
					e.apply_stun(0.14 if weapon_tier >= 3 else 0.08)
				if is_crit and StatsManager.selected_character == "shadow_lexicographer" and e.has_method("apply_slow"):
					e.apply_slow(1.25, 0.6)

func start_melee_swing():
	if not is_inside_tree() or is_melee_slashing:
		return
	var rhythm: Dictionary = archetype_data.get("rhythm", {})
	melee_windup = float(rhythm.get("windup", 0.10))
	melee_active_duration = float(rhythm.get("active", 0.09))
	melee_recovery = float(rhythm.get("recovery", 0.15)) / maxf(0.75, StatsManager.attack_speed_mult * _tier_cooldown_multiplier())
	is_melee_slashing = true
	melee_hit_ids.clear()
	melee_hit_active_started = 0.0
	_notify_player_attack("melee")
	if melee_tween and melee_tween.is_running():
		melee_tween.kill()
	slash_arc.visible = true
	slash_arc.modulate = Color.WHITE
	slash_arc.rotation = -0.82
	sprite.position = sprite_rest_position
	sprite.rotation = -0.95
	slash_arc.width = 2.0
	melee_tween = create_tween()
	melee_tween.tween_property(sprite, "position", sprite_rest_position - Vector2(6.0, 2.0), melee_windup).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	melee_tween.tween_property(sprite, "rotation", 0.95, melee_active_duration * 0.5).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	melee_tween.parallel().tween_property(slash_arc, "rotation", 0.82, melee_active_duration * 0.5).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	melee_tween.parallel().tween_property(slash_arc, "width", 5.0, melee_active_duration * 0.5)
	melee_tween.tween_callback(_on_melee_active_frame)
	melee_tween.tween_interval(melee_active_duration * 0.5)
	melee_tween.parallel().tween_property(slash_arc, "modulate:a", 0.0, melee_active_duration * 0.5)
	melee_tween.parallel().tween_property(sprite, "position", sprite_rest_position + Vector2(4.0, 1.0), melee_active_duration * 0.5)
	melee_tween.tween_property(sprite, "position", sprite_rest_position, melee_recovery).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	melee_tween.parallel().tween_property(sprite, "rotation", 0.0, melee_recovery).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	melee_tween.tween_callback(_finish_melee_swing)
	melee_tween.tween_callback(func(): is_melee_slashing = false)

func _on_melee_active_frame() -> void:
	melee_hit_active_started = melee_windup + melee_active_duration * 0.5
	sweep_blade_attack()

func _finish_melee_swing() -> void:
	if is_instance_valid(slash_arc):
		slash_arc.visible = false
		slash_arc.width = 4.0
		slash_arc.modulate = Color.WHITE

func _play_shot_cue() -> void:
	if is_inside_tree() and get_tree().current_scene:
		var audio = get_tree().current_scene.get_node_or_null("AudioManager")
		if audio and audio.has_method("play_effect"):
			audio.play_effect(weapon_id)
	if not is_instance_valid(sprite):
		return
	if shot_tween and shot_tween.is_running():
		shot_tween.kill()
	sprite.position = sprite_rest_position
	sprite.rotation = 0.0
	var recoil_distance := float(visual_data.get("recoil_px", 3.5))
	var recoil_angle := -0.09
	match weapon_id:
		"syllable_shotgun":
			recoil_distance = 6.0
			recoil_angle = -0.13
		"thesaurus_rocket", "grammar_sniper":
			recoil_distance = 7.0
			recoil_angle = -0.16
		"quote_pistols", "ink_flamethrower":
			recoil_distance = 2.2
			recoil_angle = -0.05
	shot_tween = create_tween()
	var recoil_vector := -muzzle_local_position.normalized() * recoil_distance
	shot_tween.tween_property(sprite, "position", sprite_rest_position + recoil_vector, 0.045).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	shot_tween.parallel().tween_property(sprite, "rotation", recoil_angle, 0.045)
	shot_tween.tween_property(sprite, "position", sprite_rest_position, 0.10).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	shot_tween.parallel().tween_property(sprite, "rotation", 0.0, 0.10)
	var flash_color := Color(1.0, 0.84, 0.49, 0.95)
	match weapon_id:
		"lexicon_beam", "rune_orb":
			flash_color = Color(0.38, 0.88, 1.0, 0.95)
		"ink_flamethrower", "hyphen_boomerang":
			flash_color = Color(1.0, 0.43, 0.19, 0.95)
		"thesaurus_rocket":
			flash_color = Color(0.82, 0.49, 1.0, 0.95)
		"grammar_sniper":
			flash_color = Color(1.0, 0.30, 0.48, 0.95)
	if is_instance_valid(muzzle_flash):
		muzzle_flash.visible = true
		muzzle_flash.modulate = flash_color
		var flash_tween := create_tween()
		flash_tween.tween_property(muzzle_flash, "modulate:a", 0.0, 0.07)
		flash_tween.tween_callback(func(): muzzle_flash.visible = false)

func _get_action_kind() -> String:
	if weapon_id in ["dictionary_blade", "calligraphy_katana"]:
		return "melee"
	if weapon_id in ["punctuation_bomb", "rune_orb", "scroll_turret", "word_loom"]:
		return "cast"
	if weapon_id in ["thesaurus_rocket", "grammar_sniper", "crossword_crossbow"]:
		return "heavy"
	return "ranged"

func _notify_player_attack(action_kind: String) -> void:
	var player = get_tree().get_first_node_in_group("player")
	if not is_instance_valid(player):
		return
	var aim := Vector2.RIGHT.rotated(rotation)
	if is_instance_valid(target_enemy):
		aim = target_enemy.global_position - player.global_position
	if player.has_method("request_attack_pose"):
		player.request_attack_pose(weapon_id, action_kind, aim, float(visual_data.get("recoil_px", 3.5)), archetype_data.get("rhythm", {}))

func spawn_one_projectile(dir: Vector2, dmg: float, prc: int, spd: float, tint: Color, crit: bool, signature_override: String = ""):
	var p = projectile_scene.instantiate()
	get_tree().current_scene.add_child(p)
	p.global_position = get_muzzle_world_position()
	var signature := signature_override if not signature_override.is_empty() else String(archetype_data.get("signature", ""))
	p.setup(dir, dmg, prc, spd, tint, crit, String(visual_data.get("impact", "ink")), signature, weapon_tier, archetype_data.get("limits", {}))

func _base_attack_damage(critical: bool = false) -> float:
	var weapon_data: Dictionary = StatsManager.weapons_catalog.get(weapon_id, {})
	var crit_multiplier := 2.0 if critical else 1.0
	return float(weapon_data.get("damage", 20.0)) * StatsManager.damage_mult * _tier_damage_multiplier() * crit_multiplier

func _place_scroll_turret(turret_damage: float) -> void:
	var turret_script: Script = load("res://scripts/scroll_turret.gd")
	if turret_script == null or not get_tree().current_scene:
		return
	var scene: Node = get_tree().current_scene
	var deployed_scene_turrets: Array = scene.get_meta("deployed_scroll_turrets", [])
	deployed_scene_turrets = deployed_scene_turrets.filter(func(turret): return is_instance_valid(turret) and not turret.is_queued_for_deletion())
	var turret_cap := 2 if weapon_tier >= 3 else 1
	while deployed_scene_turrets.size() >= turret_cap:
		var oldest: Node2D = deployed_scene_turrets.pop_front()
		if is_instance_valid(oldest):
			oldest.queue_free()
	var turret := Node2D.new()
	turret.set_script(turret_script)
	turret.add_to_group("scroll_turrets")
	turret.global_position = get_muzzle_world_position()
	get_tree().current_scene.add_child(turret)
	turret.add_to_group("scroll_turrets")
	turret.setup(turret_damage, weapon_tier, float(archetype_data.get("limits", {}).get("turret_seconds", 12.0)) + (4.0 if weapon_tier >= 2 else 0.0), float(archetype_data.get("limits", {}).get("fire_seconds", 0.82)))
	active_turrets.append(turret)
	deployed_scene_turrets.append(turret)
	scene.set_meta("deployed_scroll_turrets", deployed_scene_turrets)

func _process_deployed_turrets(_delta: float) -> void:
	active_turrets = active_turrets.filter(func(turret): return is_instance_valid(turret) and not turret.is_queued_for_deletion())
