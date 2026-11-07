extends Node2D
class_name ArenaInteractable

@export var mechanism_id: String = "ink_well"
@export var display_name: String = "Mürekkep Kuyusu"
@export var action_hint: String = "Canını tazele"
@export var accent: Color = Color("78d6c7")

var used_this_wave: bool = false
var mechanism_texture: Texture2D

func _ready() -> void:
	var sprite_paths := {
		"ink_well": "res://assets/sprites/upgrade_v1/interactables/ink_well.svg",
		"resonance_bell": "res://assets/sprites/upgrade_v1/interactables/archive_bell.svg",
		"astral_astrolabe": "res://assets/sprites/upgrade_v1/interactables/astral_astrolabe.svg"
	}
	mechanism_texture = load(str(sprite_paths.get(mechanism_id, ""))) as Texture2D
	queue_redraw()

func reset_for_wave() -> void:
	used_this_wave = false
	queue_redraw()

func mark_used() -> void:
	used_this_wave = true
	queue_redraw()

func _draw() -> void:
	var alpha := 0.28 if used_this_wave else 0.88
	var ink := Color(accent.r, accent.g, accent.b, alpha)
	draw_colored_polygon(_ellipse_points(Vector2.ZERO, Vector2(50, 19)), Color(accent.r, accent.g, accent.b, alpha * 0.14))
	draw_arc(Vector2.ZERO, 50, 0.0, TAU, 56, ink, 2.0, true)
	if mechanism_texture:
		draw_texture_rect(mechanism_texture, Rect2(38.0 - 48.0, 8.0 - 56.0, 96.0, 112.0), false, Color(1.0, 1.0, 1.0, alpha))

func _ellipse_points(center: Vector2, radii: Vector2, segments: int = 40) -> PackedVector2Array:
	var points := PackedVector2Array()
	for index in range(segments):
		var angle := float(index) * TAU / float(segments)
		points.append(center + Vector2(cos(angle) * radii.x, sin(angle) * radii.y))
	return points
