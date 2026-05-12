use wasm_bindgen::prelude::*;
use web_sys::window;

#[wasm_bindgen(start)]
pub fn main() {
    let document = window().unwrap().document().unwrap();
    let body = document.body().unwrap();

    body.set_inner_html("<h1>{{display_name}}</h1>");
}
