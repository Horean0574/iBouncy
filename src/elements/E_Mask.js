import GameElement from "../utils/GameElement";
import { Rect } from "leafer-game";
import { GP, leafer } from "../core/instances";

export default class E_Mask extends GameElement {
    #config = {
        fill: "#666",
        opacity: 0.6,
        fadeInDuration: 0.8,
    };

    constructor() {
        super(new Rect({
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
        }), 990);
        this.el.fill = this.#config.fill;
        this.el.animation = {
            style: { opacity: this.#config.opacity },
            duration: this.#config.fadeInDuration,
            join: true,
        };
    }

    relocate(e) {
        this.w = e.width;
        this.h = e.height;
    }

    render(fill = void 0, fromOpacity = void 0, toOpacity = void 0, duration = void 0) {
        if (fill === void 0) this.el.fill = this.#config.fill;
        else this.el.fill = fill;
        if (fromOpacity === void 0) this.el.opacity = 0;
        else this.el.opacity = fromOpacity;
        if (toOpacity === void 0) this.el.animation.style.opacity = this.#config.opacity;
        else this.el.animation.style.opacity = toOpacity;
        if (duration === void 0) this.el.animation.duration = this.#config.fadeInDuration;
        else this.el.animation.duration = duration;
        leafer.add(this.el);
    }
}
