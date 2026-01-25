import { AnimateEvent, Group, Text } from "leafer-game";
import { GP } from "../core/instances";
import TextLine from "../utils/TextLine";

export default class E_Settlement extends Group {
    constructor() {
        super({
            x: 0,
            y: 0,
            width: GP.bw,
            height: GP.bh,
            visible: false,
            zIndex: 991,
        });
        this.Title = new Text({
            x: GP.bw / 2,
            y: GP.bh * 2 / 7,
            around: "center",
            text: "",
            fontSize: 108,
            fontFamily: "HYBeiBingYang-W",
            scale: 0.5,
            opacity: 0,
        });
        this.Hint1 = new TextLine(GP.bw / 2, GP.bh * 9 / 14 - 12, "center", "#444", 16)
            .$append("按")
            .$append("空格键", 3, void 0, void 0, "bold")
            .$append("重新开始");
        this.Hint1.opacity = 0;
        this.Hint2 = new TextLine(GP.bw / 2, GP.bh * 9 / 14 + 12, "center", "#777", 12)
            .$append("按")
            .$append("回车键", 3, void 0, void 0, "bold")
            .$append("返回开始菜单");
        this.Hint2.opacity = 0;
        this.add([this.Title, this.Hint1, this.Hint2]);

        this.init_ = this.init_.bind(this);
    }

    relocate_(e) {
        this.cx = e.width / 2;
        this.Title.y = e.height * 2 / 7;
        this.Hint1.y = e.height * 9 / 14 - 12;
        this.Hint2.y = e.height * 9 / 14 + 12;
    }

    async init_() {
        await Promise.all([
            this.#loadFont_(),
            this.#preloadImage_(),
        ]);
    }

    async #loadFont_() {
        await GP.fontInitializer("HYBeiBingYang-W", "./assets/fonts/HYBeiBingYang-W");
    }

    async #preloadImage_() {
        await Promise.all([
            GP.ImageInitializer("GL.jpg", "./assets/img/GL.jpg"),
            GP.ImageInitializer("DL.jpg", "./assets/img/DL.jpg"),
        ]);
    }

    show_() {
        this.visible = true;
        this.relocate_({ width: GP.bw, height: GP.bh });
        this.Title.animate([
            { scale: 1, opacity: 1 },
        ], {
            duration: 0.4,
            join: true,
        });
        this.Hint1.fadeIn_(0.8, 0.2);
        this.Hint2.fadeIn_(0.8, 0.4);
    }

    hide_() {
        this.Title.animate([
            { scale: 0.3, opacity: 0 },
        ], {
            duration: 0.3,
            join: true,
        });
        this.Hint1.fadeOut_(0.5);
        this.Hint2.fadeOut_(0.5)
            .once(AnimateEvent.COMPLETED, () => this.visible = false);
    }

    win_() {
        this.Title.text = " You Win! ";
        this.#setTextFill_("leafer://GL.jpg", 75);
        this.#setShadowColor_("#FFEF00");
        this.show_();
    }

    fail_() {
        this.Title.text = " FAIL ";
        this.#setTextFill_("leafer://DL.jpg", -50);
        this.#setShadowColor_("#474746");
        this.show_();
    }

    #setTextFill_(src, offsetY) {
        this.Title.fill = {
            type: "image",
            url: src,
            offset: { y: offsetY },
        };
    }

    #setShadowColor_(color) {
        this.Title.shadow = {
            x: 0,
            y: 0,
            blur: 25,
            spread: 15,
            color: color,
        };
    }
}
