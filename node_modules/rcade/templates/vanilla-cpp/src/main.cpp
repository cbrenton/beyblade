#include <rcade.h>
#include <emscripten.h>

rcade::Canvas* canvas;
rcade::Input* input;

void gameLoop() {
    canvas->clear("#1a1a2e");
    canvas->fillText("{{display_name}}", 168, 131, "24px monospace", "#eee", "center");
}

int main() {
    canvas = new rcade::Canvas(336, 262);
    input = new rcade::Input();

    emscripten_set_main_loop(gameLoop, 60, 1);
    return 0;
}
