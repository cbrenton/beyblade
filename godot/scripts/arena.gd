extends StaticBody2D

const SPIN_TIME_LEFT_SEC := 10.0
const TIME_TILL_BATTLE_SEC := 5.0
const SPIN_INSTRUCTION := "START SPINNING DUDES YOU'VE ONLY GOT 10 SECONDS"

@export var radius: float = 100.0
@export var segments: int = 64

@onready var player_scene = preload("res://player.tscn")

var scene_center = Vector2.ZERO
var players = []

enum _Overlay { SPINNING, READY_FOR_BATTLE, OFF }
var _overlay_phase: _Overlay = _Overlay.OFF
var _spin_time_left := SPIN_TIME_LEFT_SEC
var _time_till_battle_left := TIME_TILL_BATTLE_SEC
var _p1_spins := 0
var _p2_spins := 0
var _overlay_layer: CanvasLayer
var _countdown_label: Label
var _instruction_label: Label


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

    _overlay_layer = CanvasLayer.new()
    _overlay_layer.layer = 100
    add_child(_overlay_layer)
    var backdrop := ColorRect.new()
    backdrop.color = Color(0, 0, 0, 0.55)
    backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
    backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _overlay_layer.add_child(backdrop)
    var center := CenterContainer.new()
    center.set_anchors_preset(Control.PRESET_FULL_RECT)
    center.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _overlay_layer.add_child(center)
    var vbox := VBoxContainer.new()
    vbox.add_theme_constant_override("separation", 16)
    center.add_child(vbox)
    _countdown_label = Label.new()
    _countdown_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _countdown_label.add_theme_font_size_override("font_size", 56)
    _countdown_label.add_theme_color_override("font_color", Color.WHITE)
    vbox.add_child(_countdown_label)
    _instruction_label = Label.new()
    _instruction_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    _instruction_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    _instruction_label.custom_minimum_size = Vector2(520, 0)
    _instruction_label.add_theme_font_size_override("font_size", 30)
    _instruction_label.add_theme_color_override("font_color", Color.WHITE)
    _instruction_label.text = SPIN_INSTRUCTION
    vbox.add_child(_instruction_label)

    _overlay_phase = _Overlay.SPINNING
    _spin_time_left = SPIN_TIME_LEFT_SEC
    _countdown_label.text = "%.1f" % _spin_time_left


func _process(delta: float) -> void:
    match _overlay_phase:
        _Overlay.SPINNING:
            if _spin_time_left > 0.0:
                _p1_spins += absi(RCadeInput.p1_spinner_delta())
                _p2_spins += absi(RCadeInput.p2_spinner_delta())
            _spin_time_left -= delta
            if _spin_time_left > 0.0:
                _countdown_label.text = "%.1f" % _spin_time_left
            else:
                _spin_time_left = 0.0
                _overlay_phase = _Overlay.READY_FOR_BATTLE
                _time_till_battle_left = TIME_TILL_BATTLE_SEC
                _instruction_label.visible = false
                _countdown_label.add_theme_font_size_override("font_size", 28)
                _countdown_label.text = "P1: %d full spins\nP2: %d full spins" % [_p1_spins / 64.0, _p2_spins / 64.0]
        _Overlay.READY_FOR_BATTLE:
            _time_till_battle_left -= delta
            if _time_till_battle_left <= 0.0:
                _overlay_phase = _Overlay.OFF
                _overlay_layer.queue_free()
                _overlay_layer = null
        _:
            pass


func _draw() -> void:
    draw_arc(Vector2.ZERO, radius, 0, TAU, segments, Color.WHITE, 2.0)


func _input(event: InputEvent) -> void:
    if _overlay_phase != _Overlay.OFF:
        return
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
