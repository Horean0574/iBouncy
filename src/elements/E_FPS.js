import GameElement from "../utils/GameElement";
import { Text } from "leafer-game";
import { GP } from "../core/instances";

export default class E_FPS extends GameElement {
    constructor() {
        super(new Text({
            x: 12,
            y: GP.bh - 24,
            fontSize: 12,
            fill: "#777",
            text: "FPS: --",
        }));
    }

    relocate(e) {
        if (e.height === e.old.height) return;
        this.y = e.height - 24;
    }

    assign(fps) {
        if (isNaN(fps)) fps = "--";
        this.el.text = "FPS: " + fps;
    }
}
