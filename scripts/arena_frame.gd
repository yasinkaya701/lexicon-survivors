extends Node2D

var frame_paths = [
	"res://assets/sprites/upgrade_v1/arena_frame_library.png",
	"res://assets/sprites/upgrade_v1/arena_frame_dungeon.png",
	"res://assets/sprites/upgrade_v1/arena_frame_observatory.png",
	"res://assets/sprites/upgrade_v1/arena_frame_void.png"
]
const ARENA_FRAME_SIZE := Vector2(2800, 2100)
const INNER_SHELF_EDGE := Vector2(1245, 870)
const PLAYER_COLLIDER_RADIUS := 15.0
const PLAYER_COLLIDER_OFFSET := Vector2(0, 3)
const PLAYER_MAX_VISUAL_HALF_EXTENT := Vector2(39.5, 42)
const PLAYER_VISUAL_CENTER_BOUNDS := Rect2(
	Vector2(-INNER_SHELF_EDGE.x + PLAYER_MAX_VISUAL_HALF_EXTENT.x, -INNER_SHELF_EDGE.y + PLAYER_MAX_VISUAL_HALF_EXTENT.y),
	Vector2((INNER_SHELF_EDGE.x - PLAYER_MAX_VISUAL_HALF_EXTENT.x) * 2.0, (INNER_SHELF_EDGE.y - PLAYER_MAX_VISUAL_HALF_EXTENT.y) * 2.0)
)
const PLAYER_COLLIDER_CENTER_BOUNDS := Rect2(
	Vector2(-INNER_SHELF_EDGE.x + PLAYER_COLLIDER_RADIUS - PLAYER_COLLIDER_OFFSET.x, -INNER_SHELF_EDGE.y + PLAYER_COLLIDER_RADIUS - PLAYER_COLLIDER_OFFSET.y),
	Vector2((INNER_SHELF_EDGE.x - PLAYER_COLLIDER_RADIUS) * 2.0, (INNER_SHELF_EDGE.y - PLAYER_COLLIDER_RADIUS) * 2.0)
)
var active_frame: Texture2D

func set_stage(stage_index: int) -> void:
	var stage = clampi(stage_index, 0, frame_paths.size() - 1)
	active_frame = load(frame_paths[stage]) as Texture2D
	queue_redraw()

func _draw() -> void:
	if active_frame:
		# Keep one fixed world-space room; collision faces align with the visible
		# inner shelf line, so the player can walk right up to the artwork.
		draw_texture_rect(active_frame, Rect2(-ARENA_FRAME_SIZE / 2.0, ARENA_FRAME_SIZE), false)
