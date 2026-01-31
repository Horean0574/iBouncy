import { AnimateEvent, Rect } from "leafer-game";
import { GP } from "../core/instances";
import { UIConf } from "../config";

export default class E_Mask extends Rect {
    #config = {
        fill: UIConf.Mask.FILL,
        opacity: 0.6,
        fadeInDuration: 0.8,
    };

    constructor() {
        super({
            x: 0,
            y: 0,
            width: GP.bw,
            height: GP.bh,
            fill: UIConf.Mask.FILL,
            visible: false,
            zIndex: 990,
        });
        this.animation = {
            style: { opacity: this.#config.opacity },
            duration: this.#config.fadeInDuration,
            join: true,
        };
    }

    relocate_(e) {
        this.w = e.width;
        this.h = e.height;
    }

    show_(fill = this.#config.fill, fromOpacity = 0, toOpacity = this.#config.opacity, duration = this.#config.fadeInDuration) {
        this.visible = true;
        this.relocate_({ width: GP.bw, height: GP.bh });
        this.fill = fill;
        this.fade_(fromOpacity, toOpacity, duration);
    }

    hide_() {
        this.fadeOut_(0.5).once(AnimateEvent.COMPLETED, () => this.visible = false);
    }
}
