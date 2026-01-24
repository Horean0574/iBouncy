import { Text } from "leafer-game";
import { GP } from "../core/instances";

export default class E_Settlement extends Text {
    constructor() {
        super({
            x: GP.bw / 2,
            y: GP.bh / 3,
            around: "center",
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
            zIndex: 991,
        });

        this.init = this.init.bind(this);
    }

    relocate(e) {
        this.x = e.width / 2;
        this.y = e.height / 2 - 64;
    }

    async init() {
        await Promise.all([
            this.#loadFont(),
            this.#preloadImage(),
        ]);
    }

    async #loadFont() {
        await GP.fontInitializer("HYBeiBingYang-W", "./assets/fonts/HYBeiBingYang-W");
    }

    async #preloadImage() {
        await Promise.all([
            GP.ImageInitializer("GL.jpg", "./assets/img/GL.jpg"),
            GP.ImageInitializer("DL.jpg", "./assets/img/DL.jpg"),
        ]);
    }

    win() {
        this.text = " You Win! ";
        this.#setTextFill("leafer://GL.jpg");
        this.#setShadowColor("#FFEF00");
        this.render_();
    }

    fail() {
        this.text = " FAIL ";
        this.#setTextFill("leafer://DL.jpg");
        this.#setShadowColor("#474746");
        this.render_();
    }

    #setTextFill(src) {
        this.fill = {
            type: "image",
            url: src,
            offset: { y: -50 },
        };
    }

    #setShadowColor(color) {
        this.shadow = {
            x: 0,
            y: 0,
            blur: 25,
            color: color,
        };
    }
}
