extends Area2D

@export var ink_value: int = 1
var is_attracted: bool = false
var target: Node2D = null
var current_speed: float = 80.0
var max_speed: float = 650.0

func _ready():
	add_to_group("ink_drops")
	var players = get_tree().get_nodes_in_group("player")
	if not players.is_empty():
		target = players[0]
	body_entered.connect(_on_body_entered)

func _physics_process(delta: float):
	if not is_attracted:
		if not is_instance_valid(target):
			var players = get_tree().get_nodes_in_group("player")
			if not players.is_empty():
				target = players[0]
		if is_instance_valid(target):
			var dist = global_position.distance_to(target.global_position)
			if dist <= StatsManager.pickup_radius:
				is_attracted = true
	else:
		if is_instance_valid(target):
			var dir = (target.global_position - global_position).normalized()
			current_speed = min(max_speed, current_speed + 800.0 * delta)
			global_position += dir * current_speed * delta
			
			if global_position.distance_to(target.global_position) < 16.0:
				collect()
		else:
			is_attracted = false

func _on_body_entered(body: Node2D):
	if body.is_in_group("player"):
		collect()

func collect():
	StatsManager.add_ink(ink_value)
	queue_free()
