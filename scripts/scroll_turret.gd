extends Node2D

const PROJECTILE_SCENE: PackedScene = preload("res://scenes/projectile.tscn")

var damage: float = 10.0
var tier: int = 1
var lifetime: float = 12.0
var fire_interval: float = 0.82
var fire_timer: float = 0.18
var target: Node2D = null
var facing: Vector2 = Vector2.RIGHT
var pulse: float = 0.0

func setup(new_damage: float, new_tier: int, duration: float, cadence: float) -> void:
	damage = new_damage
	tier = clampi(new_tier, 1, 4)
	lifetime = duration
	fire_interval = cadence

func _ready() -> void:
	add_to_group("scroll_turrets")
	var turret_sprite := Sprite2D.new()
	var weapon_texture_path := "res://assets/sprites/weapons/scroll_turret.png"
	if not ResourceLoader.exists(weapon_texture_path):
		weapon_texture_path = "res://assets/sprites/scroll_turret.png"
	turret_sprite.texture = load(weapon_texture_path)
	turret_sprite.name = "Sprite2D"
	turret_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	turret_sprite.scale = Vector2(0.68, 0.68)
	turret_sprite.z_index = -1
	add_child(turret_sprite)

func _process(delta: float) -> void:
	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()
		return
	pulse += delta * 5.0
	queue_redraw()
	if not is_instance_valid(target) or target.is_queued_for_deletion():
		target = _find_target()
	if not is_instance_valid(target):
		return
	var to_target := target.global_position - global_position
	if to_target.length_squared() > 0.01:
		facing = to_target.normalized()
		rotation = facing.angle() + PI * 0.5
	fire_timer -= delta
	if fire_timer <= 0.0:
		fire_timer = fire_interval
		var projectile = PROJECTILE_SCENE.instantiate()
		get_tree().current_scene.add_child(projectile)
		projectile.global_position = global_position + facing * 20.0
		projectile.setup(facing, damage, 1 + (1 if tier >= 4 else 0), 500.0, Color(0.95, 0.85, 0.45), false, "gold", "turret_focus", tier)

func _find_target() -> Node2D:
	var closest: Node2D = null
	var min_distance := 520.0
	for enemy in Enemy.get_active_enemies():
		if not is_instance_valid(enemy):
			continue
		var distance := global_position.distance_to(enemy.global_position)
		if distance < min_distance:
			min_distance = distance
			closest = enemy
	return closest

func _draw() -> void:
	var alpha := 0.18 + absf(sin(pulse)) * 0.14
	draw_arc(Vector2.ZERO, 20.0 + absf(sin(pulse)) * 3.0, 0.0, TAU, 24, Color(0.86, 0.73, 0.43, alpha), 1.5)
