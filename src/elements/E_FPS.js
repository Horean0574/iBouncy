import { Text } from "leafer-game";
import { GP } from "../core/instances";
import { UIConf } from "../config";

export default class E_FPS extends Text {
    constructor() {
        super({
            x: 12,
            y: GP.bh - 24,
            fontSize: UIConf.FPS.FONT_SIZE,
            fill: UIConf.FPS.FILL,
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
