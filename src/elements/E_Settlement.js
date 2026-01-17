import GameElementCentered from "../utils/GameElementCentered";
import { Text, Resource, Platform } from "leafer-game";
import { GP } from "../core/instances";

export default class E_Settlement extends GameElementCentered {
    constructor() {
        super(new Text({
            x: GP.bw / 2,
            y: GP.bh / 3,
            text: "",
            fontSize: 128,
            fontFamily: "HYBeiBingYang-W",
            scale: 0.5,
            opacity: 0.6,
            animation: {
                style: { scale: 1, opacity: 1 },
                duration: 0.4,
                join: true,
            },
            animationOut: {
                style: { scale: 0.4, opacity: 0.2 },
                duration: 0.3,
                join: true,
            },
        }), 991);

        this.init = this.init.bind(this);
    }

    relocate(e) {
        this.cx = e.width / 2;
        this.cy = e.height / 2 - 64;
    }

    init() {
        return Promise.all([
            this.#loadFont(),
            this.#preloadImage(),
        ]);
    }

    async #loadFont() {
        await GP.fontInitializer("HYBeiBingYang-W", "./assets/fonts/HYBeiBingYang-W");
    }

    async #preloadImage() {
        await Promise.all([
            this.#loadAndTransferImg("./assets/img/GL.jpg", "leafer://GL.jpg"),
            this.#loadAndTransferImg("./assets/img/DL.jpg", "leafer://DL.jpg"),
        ]);
    }

    async #loadAndTransferImg(src, name) {
        let img = await Platform.origin.loadImage(src);
        Resource.setImage(name, img);
    }

    win() {
        this.el.text = " You Win! ";
        this.#setTextFill("leafer://GL.jpg");
        this.#setShadowColor("#FFEF00");
        this.render();
    }

    fail() {
        this.el.text = " FAIL ";
        this.#setTextFill("leafer://DL.jpg");
        this.#setShadowColor("#474746");
        this.render();
    }

    #setTextFill(src) {
        this.el.fill = {
            type: "image",
            url: src,
            offset: { y: -50 },
        };
    }

    #setShadowColor(color) {
        this.el.shadow = {
            x: 0,
            y: 0,
            blur: 25,
            color: color,
        };
    }
}
