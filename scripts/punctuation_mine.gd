extends Area2D

@export var damage: float = 35.0
@export var blast_radius: float = 125.0
@export var lifetime: float = 8.0

var has_detonated: bool = false
var pulse_time: float = 0.0
var fuse_timer: float = 1.05
var hazard_timer: float = 2.2
var hazard_tick: float = 0.0
var weapon_tier: int = 1

@onready var sprite = $Sprite2D
@onready var collision_shape = $CollisionShape2D

func _ready():
	add_to_group("punctuation_mines")
	body_entered.connect(_on_body_entered)

func setup(pos: Vector2, dmg: float, radius: float = 125.0, fuse: float = 1.05, hazard: float = 2.2, tier: int = 1):
	global_position = pos
	damage = dmg
	blast_radius = radius
	fuse_timer = maxf(0.12, fuse)
	hazard_timer = hazard
	weapon_tier = clampi(tier, 1, 4)

func _process(delta: float):
	if has_detonated:
		hazard_timer -= delta
		hazard_tick -= delta
		if weapon_tier >= 4 and hazard_tick <= 0.0 and hazard_timer > 0.0:
			hazard_tick = 0.7
			_apply_ink_field_pulse()
		if hazard_timer <= 0.0:
			queue_free()
		return
		
	pulse_time += delta * 5.0
	if sprite:
		var s = 1.0 + sin(pulse_time) * 0.15
		sprite.scale = Vector2(s, s)
		
	fuse_timer -= delta
	if fuse_timer <= 0.0:
		detonate()

func _on_body_entered(body: Node2D):
	if has_detonated:
		return
	if body.is_in_group("enemies") and fuse_timer <= 0.0:
		detonate()

func detonate():
	if has_detonated:
		return
	has_detonated = true
	if collision_shape:
		collision_shape.set_deferred("disabled", true)
	
	# Blast shockwave visual
	spawn_shockwave()
	
	# Deal AOE damage to all enemies in blast radius
	if is_inside_tree():
		var enemies = get_tree().get_nodes_in_group("enemies")
		for e in enemies:
			if is_instance_valid(e):
				var dist = global_position.distance_to(e.global_position)
				if dist <= blast_radius:
					var falloff = 1.0 - (dist / blast_radius) * 0.35
					var final_dmg = max(10.0, damage * falloff)
					var knock = (e.global_position - global_position).normalized()
					if knock == Vector2.ZERO:
						knock = Vector2.RIGHT
					if e.has_method("take_damage"):
						e.take_damage(final_dmg, knock * 220.0, "heavy", false)
					if e.has_method("apply_stun"):
						e.apply_stun(0.10 if weapon_tier < 4 else 0.16)
	if weapon_tier >= 3:
		for other_mine in get_tree().get_nodes_in_group("punctuation_mines"):
			if other_mine != self and is_instance_valid(other_mine) and not other_mine.has_detonated and global_position.distance_to(other_mine.global_position) <= 180.0:
				other_mine.fuse_timer = minf(other_mine.fuse_timer, 0.12)
	if hazard_timer <= 0.0:
		queue_free()

func _apply_ink_field_pulse() -> void:
	for enemy in get_tree().get_nodes_in_group("enemies"):
		if not is_instance_valid(enemy) or global_position.distance_to(enemy.global_position) > blast_radius * 0.78:
			continue
		if enemy.has_method("take_damage"):
			enemy.take_damage(damage * 0.08, (enemy.global_position - global_position).normalized(), "rune", false)
		if enemy.has_method("apply_slow"):
			enemy.apply_slow(0.8, 0.78)

func spawn_shockwave():
	if not is_inside_tree() or not get_tree().current_scene:
		return
	# Visual effect node
	var shock = ShockwaveEffect.new()
	shock.global_position = global_position
	shock.max_radius = blast_radius
	get_tree().current_scene.add_child(shock)

# Inline shockwave drawer class
class ShockwaveEffect extends Node2D:
	var current_radius: float = 10.0
	var max_radius: float = 125.0
	var alpha: float = 1.0
	
	func _ready():
		set_process(true)
		
	func _process(delta: float):
		current_radius += delta * 450.0
		alpha -= delta * 3.5
		queue_redraw()
		if alpha <= 0.0 or current_radius >= max_radius:
			queue_free()
			
	func _draw():
		var col = Color(1.0, 0.5, 0.15, clamp(alpha, 0.0, 1.0))
		var fill_col = Color(1.0, 0.85, 0.3, clamp(alpha * 0.35, 0.0, 0.35))
		draw_circle(Vector2.ZERO, current_radius, fill_col)
		draw_arc(Vector2.ZERO, current_radius, 0, TAU, 32, col, 3.0)
