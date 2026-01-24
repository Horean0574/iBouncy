import { Rect } from "leafer-game";
import { GP, leafer } from "../core/instances";

export default class E_Mask extends Rect {
    #config = {
        fill: "#666",
        opacity: 0.6,
        fadeInDuration: 0.8,
    };

    constructor() {
        super({
            x: 0,
            y: 0,
            width: GP.bw,
            height: GP.bh,
            fill: "#666",
            opacity: 0,
            animationOut: {
                style: { opacity: 0 },
                duration: 0.5,
                join: true,
            },
            zIndex: 990,
        });
        this.fill = this.#config.fill;
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

    render_(fill = void 0, fromOpacity = void 0, toOpacity = void 0, duration = void 0) {
        if (fill === void 0) this.fill = this.#config.fill;
        else this.fill = fill;
        if (fromOpacity === void 0) this.opacity = 0;
        else this.opacity = fromOpacity;
        if (toOpacity === void 0) this.animation.style.opacity = this.#config.opacity;
        else this.animation.style.opacity = toOpacity;
        if (duration === void 0) this.animation.duration = this.#config.fadeInDuration;
        else this.animation.duration = duration;
        leafer.add(this);
    }
}
