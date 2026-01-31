import { Text } from "leafer-game";
import { GP } from "../core/instances";

export default class E_FPS extends Text {
    constructor() {
        super({
            x: 12,
            y: GP.bh - 24,
            fontSize: 12,
            fill: "#777",
            text: "FPS: --",
            zIndex: 1001,
        });
    }

    relocate_(e) {
        if (e.height === e.old.height) return;
        this.y = e.height - 24;
    }

    assign_(fps) {
        if (isNaN(fps)) fps = "--";
        this.text = "FPS: " + fps;
    }
}
