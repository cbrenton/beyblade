extends RigidBody2D

@export var pull_factor := 10.0
@export var death_zone := 2.0
@export var wall_spin_drain := 0.02  # angular velocity lost per unit of impact speed
@export var top_spin_drain := 0.15  # fraction of total spin lost on top-top hit
@export var collision_knockback := 50.0
var is_live = false
@onready var animation = %AnimationPlayer
var should_log = false
@onready var fuck_with_timer := Timer.new()
@onready var collision_player = get_parent().get_parent().get_node("CollisionPlayer")

signal die


func _ready() -> void:
	var n := randi() % 42 + 1
	get_node("Sprite2D").texture = load("res://assets/beys/%d.png" % n)
	fuck_with_timer.wait_time = 1.5
	fuck_with_timer.one_shot = false
	fuck_with_timer.timeout.connect(fuck_with)
	add_child(fuck_with_timer)


# func _integrate_forces(state: PhysicsDirectBodyState2D) -> void:
# 	if is_live:
# 		for i in state.get_contact_count():
# 			var collider = state.get_contact_collider_object(i)
# 			if collider == null:
# 				continue
# 			var normal := state.get_contact_local_normal(i)
# 			var impact := absf(state.linear_velocity.dot(normal))

# 			if collider is StaticBody2D:
# 				var drain := impact * wall_spin_drain
# 				state.angular_velocity -= signf(state.angular_velocity) * drain
# 				animation.play("hit")
# 			elif collider is RigidBody2D:
# 				var other := collider as RigidBody2D
# 				var my_speed := absf(state.angular_velocity)
# 				var their_speed := absf(other.angular_velocity)
# 				var total := my_speed + their_speed
# 				if total == 0.0:
# 					continue
# 				var my_loss := total * top_spin_drain * (their_speed / total)
# 				state.angular_velocity -= signf(state.angular_velocity) * my_loss
# 				var away := (global_position - other.global_position).normalized()
# 				# var scaler = 2.0
# 				state.linear_velocity += (
# 					away * collision_knockback * (my_speed / (their_speed + 1.0))
# 				)
# 				animation.play.call_deferred("hit")
# 				collision_player.play.call_deferred()


func _physics_process(_delta: float) -> void:
	if is_live:
		var to_center = Vector2.ZERO - position
		if to_center.length() > 50.0:
			apply_central_force(to_center.normalized() * pull_factor)
		if should_log:
			print("position:", position)


func launch(initial_spin: float) -> void:
	is_live = true
	can_sleep = false
	angular_velocity = initial_spin
	print("launching")
	# new timer
	fuck_with_timer.start()


func _process(_delta: float) -> void:
	if is_live && absf(angular_velocity) < death_zone:
		angular_velocity = 0.0
		freeze = true
		is_live = false
		get_node("Sprite2D").modulate = Color.BLACK
		print("u lose")
		die.emit()
	if is_live && !get_viewport_rect().has_point(global_position):
		print("OFFSCREEN")
		is_live = false
		die.emit()
		freeze = true


func set_color(color: Color) -> void:
	# get_node("Sprite2D").modulate = color
	pass


func fuck_with() -> void:
	var rand_vector = Vector2(randf_range(0.0, 200.0), randf_range(0.0, 200.0))
	apply_central_force(rand_vector)
	print(rand_vector)
