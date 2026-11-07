extends Node2D

var radius: float = 108.0
var lifetime: float = 2.8
var tick_seconds: float = 0.35
var tick_timer: float = 0.0
var damage_per_tick: float = 4.8
var slow_factor: float = 0.46
var slow_seconds: float = 0.6
var tier: int = 1
var pulse: float = 0.0

func setup(origin: Vector2, field_radius: float, duration: float, tick: float, damage: float, slow: float, slow_duration: float, weapon_tier: int) -> void:
	global_position = origin
	radius = field_radius
	lifetime = duration
	tick_seconds = maxf(0.08, tick)
	damage_per_tick = damage
	slow_factor = clampf(slow, 0.15, 0.9)
	slow_seconds = maxf(0.1, slow_duration)
	tier = clampi(weapon_tier, 1, 4)
	tick_timer = 0.05

func _process(delta: float) -> void:
	lifetime -= delta
	pulse += delta * 5.0
	tick_timer -= delta
	queue_redraw()
	if tick_timer <= 0.0:
		tick_timer = tick_seconds
		for enemy in Enemy.get_active_enemies():
			if not is_instance_valid(enemy) or enemy.is_queued_for_deletion() or global_position.distance_to(enemy.global_position) > radius:
				continue
			if enemy.has_method("take_damage"):
				enemy.take_damage(damage_per_tick, (enemy.global_position - global_position).normalized(), "rune", false)
			if enemy.has_method("apply_slow"):
				enemy.apply_slow(slow_seconds, slow_factor)
			if tier >= 3 and enemy.has_method("apply_weapon_mark"):
				enemy.apply_weapon_mark(1.8)
	if lifetime <= 0.0:
		queue_free()

func _draw() -> void:
	var alpha := clampf(lifetime / 2.8, 0.18, 0.76)
	var edge := Color(0.58, 0.42, 0.9, alpha)
	var fill := Color(0.38, 0.25, 0.72, alpha * 0.12)
	draw_circle(Vector2.ZERO, radius, fill)
	draw_arc(Vector2.ZERO, radius * (0.93 + absf(sin(pulse)) * 0.035), 0.0, TAU, 48, edge, 2.5, true)
	var player := get_tree().get_first_node_in_group("player") as Node2D
	if is_instance_valid(player):
		draw_line(Vector2.ZERO, player.global_position - global_position, Color(0.48, 0.8, 0.9, alpha * 0.72), 2.0, true)
