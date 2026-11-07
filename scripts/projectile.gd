extends Area2D

@export var speed: float = 520.0
var direction: Vector2 = Vector2.RIGHT
var damage: float = 15.0
var pierce: int = 1
var lifetime: float = 2.5
var hit_enemies: Array = []
var is_critical: bool = false
var impact_profile: String = "ink"
var archetype_signature: String = ""
var weapon_tier: int = 1
var age: float = 0.0
var returning: bool = false
var has_returned: bool = false
var orbit_duration: float = 1.4
var orbit_timer: float = 0.0
var orbit_angle: float = 0.0
var orbit_radius: float = 48.0
var bounce_hits: int = 0
var bounce_limit: int = 3
var homing_target: Node2D = null
var archetype_limits: Dictionary = {}

func _ready():
	body_entered.connect(_on_body_entered)

func setup(dir: Vector2, dmg: float, prc: int, custom_speed: float = 520.0, tint: Color = Color.WHITE, crit: bool = false, impact: String = "ink", signature: String = "", tier: int = 1, limits: Dictionary = {}):
	direction = dir.normalized()
	rotation = direction.angle()
	damage = dmg
	pierce = prc
	speed = custom_speed
	is_critical = crit
	impact_profile = impact
	archetype_signature = signature
	weapon_tier = clampi(tier, 1, 4)
	archetype_limits = limits.duplicate(true)
	bounce_limit = maxi(1, int(archetype_limits.get("bounce_targets", 3)) + (1 if weapon_tier >= 2 else 0))
	if archetype_signature == "outbound_return":
		lifetime = 4.2
	if archetype_signature == "pulse_bounce":
		lifetime = 4.0
	if archetype_signature == "lock_cluster":
		lifetime = 3.8
	if archetype_signature == "charged_line" and weapon_tier >= 3:
		scale = Vector2(1.0, 1.45 if weapon_tier < 4 else 1.7)
	
	if crit:
		modulate = Color(2.4, 2.2, 0.4) # Glowing golden crit
		scale = Vector2(1.35, 1.35)
	elif tint != Color.WHITE:
		modulate = tint

func _physics_process(delta: float):
	age += delta
	var position_updated_by_orbit := false
	if archetype_signature == "outbound_return":
		var return_after := float(archetype_limits.get("return_seconds", 0.60)) + (0.25 if weapon_tier >= 2 else 0.0)
		var player := get_tree().get_first_node_in_group("player") as Node2D
		if not returning and age >= return_after:
			returning = true
			has_returned = true
			hit_enemies.clear()
			if weapon_tier >= 4:
				orbit_timer = float(archetype_limits.get("orbit_seconds", orbit_duration))
				orbit_angle = (global_position - player.global_position).angle() if is_instance_valid(player) else 0.0
		if returning and is_instance_valid(player):
			if orbit_timer > 0.0:
				orbit_timer = maxf(0.0, orbit_timer - delta)
				orbit_angle = wrapf(orbit_angle + TAU * delta / orbit_duration, -PI, PI)
				var radial := Vector2.RIGHT.rotated(orbit_angle)
				global_position = player.global_position + radial * orbit_radius
				direction = radial.orthogonal().normalized()
				rotation = direction.angle()
				position_updated_by_orbit = true
			else:
				var to_player := player.global_position - global_position
				if to_player.length() <= 22.0:
					queue_free()
					return
				direction = to_player.normalized()
				rotation = direction.angle()
				speed = maxf(speed, 520.0) * 1.25
	elif archetype_signature == "lock_cluster":
		if not is_instance_valid(homing_target) or homing_target.is_queued_for_deletion():
			homing_target = _find_nearest_unhit_enemy()
		if is_instance_valid(homing_target):
			var desired := (homing_target.global_position - global_position).normalized()
			var turn_rate := float(archetype_limits.get("homing_strength", 0.55))
			direction = direction.lerp(desired, clampf(turn_rate * delta, 0.0, 0.24)).normalized()
			rotation = direction.angle()
	elif archetype_signature == "pulse_bounce" and is_instance_valid(homing_target):
		var desired := (homing_target.global_position - global_position).normalized()
		direction = direction.lerp(desired, clampf(3.2 * delta, 0.0, 0.55)).normalized()
		rotation = direction.angle()
	if not position_updated_by_orbit:
		position += direction * speed * delta
	lifetime -= delta
	if lifetime <= 0:
		queue_free()

func _on_body_entered(body: Node2D):
	if body.is_in_group("enemies") and not body in hit_enemies:
		hit_enemies.append(body)
		if body.has_method("take_damage"):
			var impact_damage := damage
			if archetype_signature == "weakpoint_rail" and body.get("enemy_type") in ["Red Pen Boss", "Lexicon Dragon Boss"]:
				impact_damage *= float(archetype_limits.get("elite_bonus", 1.0))
			if archetype_signature == "weakpoint_rail" and weapon_tier >= 3 and hit_enemies.size() > 1:
				impact_damage *= 1.18
			body.take_damage(impact_damage, direction, impact_profile, is_critical)
		_apply_signature_hit(body)
		if is_critical and StatsManager.selected_character == "shadow_lexicographer" and body.has_method("apply_slow"):
			body.apply_slow(1.25, 0.6)
		if archetype_signature == "pulse_bounce":
			bounce_hits += 1
			if bounce_hits >= bounce_limit:
				if weapon_tier >= 3:
					_spawn_rune_final_pulse(body.global_position)
				queue_free()
				return
			homing_target = _find_nearest_unhit_enemy()
			if is_instance_valid(homing_target):
				global_position = body.global_position
				direction = (homing_target.global_position - global_position).normalized()
				pierce = 1
				return
			queue_free()
			return
		pierce -= 1
		if pierce <= 0:
			queue_free()

func _apply_signature_hit(body: Node2D) -> void:
	match archetype_signature:
		"mark_echo":
			var was_marked := bool(body.get("weapon_mark_timer")) if body.get("weapon_mark_timer") != null else false
			if body.has_method("apply_weapon_mark"):
				body.apply_weapon_mark(float(archetype_limits.get("mark_seconds", 2.2)) * (1.22 if weapon_tier >= 2 else 1.0))
			if was_marked and weapon_tier >= 3:
				_spawn_echo_projectile(body)
				if weapon_tier >= 4:
					_spawn_echo_projectile(body, 0.38)
		"pellet_stagger":
			if global_position.distance_to(body.global_position) <= 112.0 and body.has_method("apply_stun"):
				body.apply_stun(0.08 if weapon_tier < 4 else 0.16)
		"measured_pin":
			if body.has_method("apply_stun"):
				body.apply_stun(float(archetype_limits.get("pin_seconds", 0.24)) + (0.04 if weapon_tier >= 2 else 0.0))
			if weapon_tier >= 3:
				_spawn_crossword_shards(body.global_position, 8 if weapon_tier >= 4 else 4)
		"outbound_return":
			if returning and weapon_tier >= 3 and body.has_method("apply_weapon_mark"):
				body.apply_weapon_mark(2.0)
		"burn_cone":
			if body.has_method("apply_burn"):
				body.apply_burn(damage * 0.12, float(archetype_limits.get("burn_seconds", 1.1)), 2 if weapon_tier >= 3 else 1)
		"lock_cluster":
			_spawn_rocket_splash(body.global_position, body)
			if weapon_tier >= 3:
				_spawn_rocket_clusters(body.global_position)
		"two_tap_reload":
			if weapon_tier >= 4 and body.has_method("apply_weapon_mark"):
				body.apply_weapon_mark(2.4)
				if is_critical:
					_spawn_echo_projectile(body, 0.35)
		"charged_line":
			if weapon_tier >= 3:
				_spawn_beam_split(body.global_position)
		"pulse_bounce":
			pass
		"weakpoint_rail":
			var is_boss: bool = body.get("enemy_type") in ["Red Pen Boss", "Lexicon Dragon Boss"]
			if weapon_tier >= 2 and is_boss and body.has_method("apply_stun"):
				body.apply_stun(0.20)
			if weapon_tier >= 4 and is_boss:
				_spawn_sniper_chain(body)

func _spawn_echo_projectile(marked_enemy: Node2D, damage_factor: float = 0.32) -> void:
	var nearest: Node2D = null
	var distance := 230.0
	for enemy in Enemy.get_active_enemies():
		if enemy == marked_enemy or not is_instance_valid(enemy):
			continue
		var candidate_distance := global_position.distance_to(enemy.global_position)
		if candidate_distance < distance:
			distance = candidate_distance
			nearest = enemy
	if not is_instance_valid(nearest):
		return
	var echo = load("res://scenes/projectile.tscn").instantiate()
	get_tree().current_scene.add_child(echo)
	echo.global_position = global_position
	echo.setup((nearest.global_position - global_position).normalized(), damage * damage_factor, 1, 640.0, Color(0.8, 0.94, 1.0), false, "piercing", "echo_shard", 1)

func _spawn_beam_split(origin: Vector2) -> void:
	var neighbors: Array[Node2D] = []
	for enemy in Enemy.get_active_enemies():
		if not is_instance_valid(enemy) or enemy in hit_enemies:
			continue
		if origin.distance_to(enemy.global_position) <= 120.0:
			neighbors.append(enemy)
			if neighbors.size() >= 2:
				break
	for enemy in neighbors:
		var split = load("res://scenes/projectile.tscn").instantiate()
		get_tree().current_scene.add_child(split)
		split.global_position = origin
		split.setup((enemy.global_position - origin).normalized(), damage * 0.24, 1, 900.0, Color(0.4, 0.95, 1.0), false, "piercing", "split_shard", 1)

func _spawn_rocket_clusters(origin: Vector2) -> void:
	for shard_index in range(3):
		var shard = load("res://scenes/projectile.tscn").instantiate()
		get_tree().current_scene.add_child(shard)
		shard.global_position = origin
		var direction_angle := TAU * float(shard_index) / 3.0
		shard.setup(Vector2.RIGHT.rotated(direction_angle), damage * 0.22, 1, 420.0, Color(0.76, 0.44, 0.85), false, "heavy", "cluster_shard", 1)

func _spawn_rune_final_pulse(origin: Vector2) -> void:
	var radius := 82.0 if weapon_tier < 4 else 120.0
	for enemy in Enemy.get_active_enemies():
		if not is_instance_valid(enemy) or origin.distance_to(enemy.global_position) > radius:
			continue
		if enemy.has_method("take_damage"):
			enemy.take_damage(damage * (0.24 if weapon_tier < 4 else 0.36), (enemy.global_position - origin).normalized(), "rune", false)
		if weapon_tier >= 4 and enemy.has_method("apply_slow"):
			enemy.apply_slow(1.0, 0.72)

func _spawn_sniper_chain(direct_target: Node2D) -> void:
	var candidates: Array[Node2D] = []
	for enemy in Enemy.get_active_enemies():
		if enemy == direct_target or not is_instance_valid(enemy) or enemy in hit_enemies:
			continue
		if direct_target.global_position.distance_to(enemy.global_position) <= 180.0:
			candidates.append(enemy)
			if candidates.size() >= int(archetype_limits.get("continuation_targets", 2)):
				break
	for enemy in candidates:
		if enemy.has_method("take_damage"):
			enemy.take_damage(damage * 0.38, (enemy.global_position - direct_target.global_position).normalized(), "piercing", false)

func _spawn_crossword_shards(origin: Vector2, shard_count: int) -> void:
	var shard_damage := damage * (0.28 if weapon_tier < 4 else 0.38)
	for shard_index in range(shard_count):
		var shard = load("res://scenes/projectile.tscn").instantiate()
		get_tree().current_scene.add_child(shard)
		shard.global_position = origin
		shard.setup(Vector2.RIGHT.rotated(TAU * float(shard_index) / float(shard_count)), shard_damage, 1, 430.0, Color(1.0, 0.86, 0.48), false, "piercing", "split_shard", 1)

func _spawn_rocket_splash(origin: Vector2, direct_target: Node2D) -> void:
	var splash_radius := 140.0 * (1.16 if weapon_tier >= 2 else 1.0)
	for enemy in Enemy.get_active_enemies():
		if enemy == direct_target or not is_instance_valid(enemy):
			continue
		var distance := origin.distance_to(enemy.global_position)
		if distance <= splash_radius:
			var knock: Vector2 = (enemy.global_position - origin).normalized()
			enemy.take_damage(damage * (0.34 if weapon_tier < 3 else 0.42), knock, "heavy", is_critical)
			if weapon_tier >= 4 and enemy.has_method("apply_slow"):
				enemy.apply_slow(1.0, 0.72)

func _find_nearest_unhit_enemy() -> Node2D:
	var closest: Node2D = null
	var min_distance := 480.0
	for enemy in Enemy.get_active_enemies():
		if not is_instance_valid(enemy) or enemy in hit_enemies:
			continue
		var distance := global_position.distance_to(enemy.global_position)
		if distance < min_distance:
			min_distance = distance
			closest = enemy
	return closest
