extends Node2D

var p1_angle := 0.0
var p2_angle := 0.0
var _label: Label

func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Color(0.05, 0.05, 0.1)
	bg.size = Vector2(480, 270)
	add_child(bg)

	_label = Label.new()
	_label.position = Vector2(10, 10)
	_label.add_theme_font_size_override("font_size", 13)
	_label.add_theme_color_override("font_color", Color.WHITE)
	add_child(_label)

func _process(_delta: float) -> void:
	var p1_spin := RCadeInput.p1_spinner_delta()
	var p2_spin := RCadeInput.p2_spinner_delta()
	p1_angle += p1_spin * (TAU / 64.0)
	p2_angle += p2_spin * (TAU / 64.0)
	queue_redraw()

	_label.text = (
		"=== RCade Controls Test ===\n"
		+ "\nP1  %s %s %s %s   A:%s  B:%s" % [
			_on("U", RCadeInput.p1_up()), _on("D", RCadeInput.p1_down()),
			_on("L", RCadeInput.p1_left()), _on("R", RCadeInput.p1_right()),
			_on("A", RCadeInput.p1_a()), _on("B", RCadeInput.p1_b()),
		]
		+ "\nP2  %s %s %s %s   A:%s  B:%s" % [
			_on("U", RCadeInput.p2_up()), _on("D", RCadeInput.p2_down()),
			_on("L", RCadeInput.p2_left()), _on("R", RCadeInput.p2_right()),
			_on("A", RCadeInput.p2_a()), _on("B", RCadeInput.p2_b()),
		]
		+ "\n\n1P START: %s   2P START: %s" % [
			_on("1P", RCadeInput.start_1p()), _on("2P", RCadeInput.start_2p()),
		]
		+ "\n\nP1 spinner delta: %+d" % p1_spin
		+ "\nP2 spinner delta: %+d" % p2_spin
	)

func _draw() -> void:
	_draw_disc(Vector2(150, 195), p1_angle, Color(0.2, 0.3, 0.7), "P1")
	_draw_disc(Vector2(330, 195), p2_angle, Color(0.7, 0.2, 0.2), "P2")

func _draw_disc(center: Vector2, angle: float, color: Color, label: String) -> void:
	draw_circle(center, 45, color.darkened(0.4))
	draw_arc(center, 45, 0, TAU, 48, color, 3)
	# Spoke so rotation is visible
	draw_line(center, center + Vector2(cos(angle), sin(angle)) * 40, Color.WHITE, 3)
	draw_circle(center, 5, Color.WHITE)
	draw_string(ThemeDB.fallback_font, center + Vector2(-8, 58), label,
		HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color.WHITE)

func _on(text: String, active: bool) -> String:
	return "[%s]" % text if active else " %s " % text.to_lower()
