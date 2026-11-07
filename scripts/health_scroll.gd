extends Area2D

var heal_amount: float = 18.0
var age: float = 0.0
var home_y: float = 0.0

func _ready() -> void:
	add_to_group("health_scrolls")
	body_entered.connect(_on_body_entered)
	home_y = global_position.y

func _process(delta: float) -> void:
	age += delta
	global_position.y = home_y + sin(age * 3.2) * 3.0
	rotation = sin(age * 1.6) * 0.05

func _on_body_entered(body: Node2D) -> void:
	if not body.is_in_group("player"):
		return
	var amount := StatsManager.consume_health_scroll(heal_amount)
	StatsManager.heal(amount)
	var audio := get_tree().current_scene.get_node_or_null("AudioManager") if get_tree().current_scene else null
	if audio and audio.has_method("play_effect"):
		audio.play_effect("pickup")
	queue_free()
