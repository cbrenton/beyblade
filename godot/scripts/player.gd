extends RigidBody2D

@export var pull_factor := 10.0


func _ready() -> void:
    pass


func _physics_process(delta: float) -> void:
    var to_center = (Vector2.ZERO - position).normalized()
    apply_central_force(to_center * pull_factor)


func _input(event: InputEvent) -> void:
    if event is InputEventKey and event.pressed:
        if event.keycode == KEY_F:
            print("f")
            apply_torque_impulse(1000)
        if event.keycode == KEY_A:
            print("a")
            apply_central_impulse(Vector2(-1.0, 0.0))
        if event.keycode == KEY_D:
            print("d")
            apply_central_impulse(Vector2(1.0, 0.0))


func launch(initial_spin: float) -> void:
    can_sleep = false
    angular_velocity = initial_spin
