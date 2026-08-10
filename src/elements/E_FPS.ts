import type { IResizeEvent } from "@leafer/interface";
import { Text } from "leafer-game";
import { evBus, GEV } from "../events";
import { GP } from "../core/instances";
import { UIConf } from "../config";

export default class E_FPS extends Text {
    confUI = UIConf.FPS;

    constructor() {
        super({
            x: UIConf.FPS.LEFT,
            y: GP.bh - UIConf.FPS.BOTTOM,
            fontSize: UIConf.FPS.FONT_SIZE,
            fill: UIConf.FPS.FILL,
            text: "FPS: --",
            zIndex: 1001,
        });
        this.#$setupEventListeners();
    }

    #$setupEventListeners(): void {
        evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
        evBus.on(GEV.RESIZE, (payload) => this.relocate_(payload.data));
    }

    relocate_(e: IResizeEvent): void {
        if (e.height === e.old.height) return;
        this.y = e.height - this.confUI.BOTTOM;
    }

    assign_(fps: number): void {
        const display = isNaN(fps) ? "--" : String(fps);
        this.text = "FPS: " + display;
    }
}
