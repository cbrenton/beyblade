extends Node2D

@export var radius: float = 100.0
@export var segments: int = 64

@onready var player_scene = preload("res://player.tscn")

const SPIN_TIME_LEFT_SEC := 5.0
const TIME_TILL_BATTLE_SEC := 2.0
const SPIN_INSTRUCTION := "START SPINNING DUDES YOU'VE ONLY GOT 10 SECONDS"

var scene_center = Vector2.ZERO
var players = []
var player_offset = 0
enum _Overlay { SPINNING, READY_FOR_BATTLE, OFF }
var _overlay_phase: _Overlay = _Overlay.OFF
var _spin_time_left := SPIN_TIME_LEFT_SEC
var _time_till_battle_left := TIME_TILL_BATTLE_SEC

var _p1_spins := 0
var _p2_spins := 0
var spins = [0, 0]
var _overlay_layer: CanvasLayer
var _countdown_label: Label
var _instruction_label: Label
@onready var win_player = get_parent().get_node("WinPlayer")
@onready var p1_sfx = preload("res://assets/sounds/p1.mp3")
@onready var p2_sfx = preload("res://assets/sounds/p2.mp3")
@onready var win_sfx = preload("res://assets/sounds/winner.mp3")
@onready var lose_sfx = preload("res://assets/sounds/loser.mp3")

var is_over = false
@export var win_label: Label


func _ready() -> void:
    scene_center = get_viewport_rect().size / 2
    position = scene_center
    player_offset = Vector2(0, get_viewport_rect().size.y / 4)

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
    if !is_over:
        match _overlay_phase:
            _Overlay.SPINNING:
                if _spin_time_left > 0.0:
                    spins[0] += absi(RCadeInput.p1_spinner_delta())
                    spins[1] += absi(RCadeInput.p2_spinner_delta())
                _spin_time_left -= delta
                if _spin_time_left > 0.0:
                    _countdown_label.text = "%.1f" % _spin_time_left
                else:
                    _spin_time_left = 0.0
                    _overlay_phase = _Overlay.READY_FOR_BATTLE
                    print("starting game")

                    var player1 = player_scene.instantiate()
                    player1.position = player_offset
                    add_child(player1)
                    player1.freeze = true
                    player1.set_color(Color.BLUE)
                    player1.die.connect(p2_win)
                    players.push_back(player1)

                    var player2 = player_scene.instantiate()
                    player2.position = -player_offset
                    print(player2.position)
                    add_child(player2)
                    player2.freeze = true
                    player2.set_color(Color.RED)
                    player2.die.connect(p1_win)
                    players.push_back(player2)

                    _time_till_battle_left = TIME_TILL_BATTLE_SEC
                    _instruction_label.visible = false
                    _countdown_label.add_theme_font_size_override("font_size", 28)
                    _countdown_label.text = (
                        "P1: %d full spins\nP2: %d full spins" % [spins[0] / 64.0, spins[1] / 64.0]
                    )

            _Overlay.READY_FOR_BATTLE:
                _time_till_battle_left -= delta
                if _time_till_battle_left <= 0.0:
                    _overlay_phase = _Overlay.OFF
                    _overlay_layer.queue_free()
                    _overlay_layer = null
                    print("spinning")
                    var count = 0
                    for player in players:
                        if count == 1:
                            player.launch.call_deferred(0)
                        player.freeze = false
                        print("launch[%d]: %f" % [count, spins[count]])
                        player.launch.call_deferred(10 * spins[count] * -1)  # extra 10x bc I can't spin fast on here
                        count += 1
            _:
                pass


func _input(event: InputEvent) -> void:
    if _overlay_phase != _Overlay.OFF:
        return


func p2_win() -> void:
    print("p2 wins")
    win_player.stream = p2_sfx
    win_player.play()
    await win_player.finished
    win_player.stream = win_sfx
    win_player.play()
    is_over = true
    win_label.show()
    win_label.text = "P2 WINS"


func p1_win() -> void:
    print("p1 wins")
    win_player.stream = p1_sfx
    win_player.play()
    await win_player.finished
    win_player.stream = win_sfx
    win_player.play()
    is_over = true
    win_label.show()
    win_label.text = "P1 WINS"
