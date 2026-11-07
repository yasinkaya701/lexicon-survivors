extends SceneTree

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	var main: Node = load("res://scenes/main.tscn").instantiate()
	root.add_child(main)
	current_scene = main
	await process_frame
	var enemy_class: Script = load("res://scripts/enemy.gd")
	var baseline: int = enemy_class.get_active_enemy_count()
	var enemy: Node2D = load("res://scenes/enemy.tscn").instantiate()
	root.add_child(enemy)
	await process_frame
	assert(enemy_class.get_active_enemy_count() == baseline + 1, "Enemy registry count increments exactly once when an enemy enters the tree")
	assert(enemy_class.get_active_enemies().has(enemy), "Enemy queries return the registered live node")
	enemy.queue_free()
	await process_frame
	assert(enemy_class.get_active_enemy_count() == baseline, "Enemy registry count decrements when an enemy exits the tree")
	assert(enemy_class.get_active_enemies().size() == baseline, "Exited enemies are removed from the reusable query list")
	print("Enemy registry regression passed (cached count and reusable live-node list).")
	quit()
