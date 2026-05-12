extends StaticBody2D

@export var radius: float = 100.0
@export var segments: int = 64

@onready var player_scene = preload("res://player.tscn")

var scene_center = Vector2.ZERO
var players = []


func _ready() -> void:
    radius = get_viewport_rect().size.y / 2 * 0.9  # 90% of half the height
    scene_center = get_viewport_rect().size / 2
    position = scene_center
    for i in segments:
        var angle_a := i * TAU / segments
        var angle_b := (i + 1) * TAU / segments
        var seg := SegmentShape2D.new()
        seg.a = Vector2(cos(angle_a), sin(angle_a)) * radius
        seg.b = Vector2(cos(angle_b), sin(angle_b)) * radius
        var col := CollisionShape2D.new()
        col.shape = seg
        add_child(col)


func _draw() -> void:
    draw_arc(Vector2.ZERO, radius, 0, TAU, segments, Color.WHITE, 2.0)


func _input(event: InputEvent) -> void:
    if event is InputEventKey and event.pressed:
        if event.keycode == KEY_SPACE:
            print("space was pressed")
            var player1 = player_scene.instantiate()
            player1.position = Vector2(0, -get_viewport_rect().size.y / 4)
            add_child(player1)
            player1.freeze = true
            players.push_back(player1)
            # player1.launch.call_deferred(randf_range(100.0, 1200.0))

            var player2 = player_scene.instantiate()
            player2.position = Vector2(0, get_viewport_rect().size.y / 4)
            add_child(player2)
            player2.freeze = true
            players.push_back(player2)
            # player2.launch.call_deferred(randf_range(200.0, 2200.0))
        if event.keycode == KEY_F:
            for player in players:
                player.freeze = false
                player.launch.call_deferred(1000)
