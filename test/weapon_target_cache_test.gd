extends SceneTree

class MockEnemy:
	extends Node2D
	var health: float = 100.0

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	var weapon_scene: PackedScene = load("res://scenes/weapon.tscn")
	var weapon: Node2D = weapon_scene.instantiate()
	root.add_child(weapon)
	weapon.set_process(false)
	await process_frame
	weapon.shoot_timer = 10.0
	weapon.global_position = Vector2.ZERO

	var first_target := MockEnemy.new()
	first_target.add_to_group("enemies")
	first_target.global_position = Vector2(120.0, 0.0)
	root.add_child(first_target)
	var second_target := MockEnemy.new()
	second_target.add_to_group("enemies")
	second_target.global_position = Vector2(300.0, 0.0)
	root.add_child(second_target)

	weapon._process(0.01)
	assert(weapon.target_enemy == first_target, "Weapon must initially select the closest in-range enemy")
	second_target.global_position = Vector2(40.0, 0.0)
	weapon._process(0.04)
	assert(weapon.target_enemy == first_target, "Weapon should reuse its cached target between acquisition intervals")
	weapon._process(0.07)
	assert(weapon.target_enemy == second_target, "Weapon should reacquire the closest target when the interval expires")

	second_target.global_position = Vector2(900.0, 0.0)
	weapon._process(0.01)
	assert(weapon.target_enemy == first_target, "Weapon must immediately replace a cached target that leaves detection range")
	first_target.global_position = Vector2(900.0, 0.0)
	weapon._process(0.01)
	assert(weapon.target_enemy == null, "Weapon should clear its target when all enemies leave detection range")
	second_target.global_position = Vector2(100.0, 0.0)
	weapon._process(0.03)
	assert(weapon.target_enemy == null, "An empty target cache should wait for its next scheduled acquisition")
	weapon._process(0.08)
	assert(weapon.target_enemy == second_target, "Weapon should acquire an enemy that enters range after the cache interval")
	first_target.global_position = Vector2(70.0, 0.0)
	second_target.health = 0.0
	weapon._process(0.01)
	assert(weapon.target_enemy == first_target, "Weapon must immediately replace a dead target and skip dead enemies during reacquisition")
	first_target.health = 0.0
	weapon._process(0.01)
	assert(weapon.target_enemy == null, "Weapon must clear the cache when every in-range enemy is dead")

	first_target.queue_free()
	second_target.queue_free()
	await process_frame
	weapon._process(0.01)
	assert(weapon.target_enemy == null, "Weapon must clear its cached target when no valid enemies remain")
	weapon.queue_free()
	print("Weapon target cache regression passed (interval reuse, reacquisition, range and freed-target invalidation).")
	quit(0)
