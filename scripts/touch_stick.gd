extends Control
class_name TouchStick

signal vector_changed(value: Vector2)

var vector: Vector2 = Vector2.ZERO
var _active_pointer: int = -1
var _mouse_active := false

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	queue_redraw()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed and _active_pointer < 0 and Rect2(Vector2.ZERO, size).has_point(event.position):
			_active_pointer = event.index
			_update_from_position(event.position)
			accept_event()
		elif not event.pressed and event.index == _active_pointer:
			_active_pointer = -1
			_reset_vector()
			accept_event()
	elif event is InputEventScreenDrag and event.index == _active_pointer:
		_update_from_position(event.position)
		accept_event()
	elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed and Rect2(Vector2.ZERO, size).has_point(event.position):
			_mouse_active = true
			_update_from_position(event.position)
			accept_event()
		elif not event.pressed and _mouse_active:
			_mouse_active = false
			_reset_vector()
			accept_event()
	elif event is InputEventMouseMotion and _mouse_active:
		_update_from_position(event.position)
		accept_event()

func _update_from_position(point: Vector2) -> void:
	var radius := minf(size.x, size.y) * 0.36
	if radius <= 0.0:
		return
	var displacement := (point - size * 0.5).limit_length(radius)
	var next_vector := displacement / radius
	if next_vector.length() < 0.12:
		next_vector = Vector2.ZERO
	vector = next_vector
	vector_changed.emit(vector)
	queue_redraw()

func _reset_vector() -> void:
	vector = Vector2.ZERO
	vector_changed.emit(vector)
	queue_redraw()

func reset() -> void:
	_active_pointer = -1
	_mouse_active = false
	_reset_vector()

func _draw() -> void:
	var center := size * 0.5
	var radius := minf(size.x, size.y) * 0.46
	draw_circle(center, radius, Color(0.075, 0.09, 0.085, 0.42))
	draw_arc(center, radius - 1.0, 0.0, TAU, 48, Color(0.71, 0.65, 0.49, 0.68), 2.0, true)
	draw_circle(center, radius * 0.50, Color(0.71, 0.65, 0.49, 0.10))
	var knob_center := center + vector * (radius * 0.70)
	draw_circle(knob_center, radius * 0.34, Color(0.80, 0.73, 0.57, 0.52))
	draw_arc(knob_center, radius * 0.34, 0.0, TAU, 32, Color(0.91, 0.85, 0.69, 0.82), 2.0, true)
