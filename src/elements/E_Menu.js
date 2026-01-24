import { AnimateEvent, Group, Image } from "leafer-game";
import { GP } from "../core/instances";
import TextLine from "../utils/TextLine";

export default class E_Menu extends Group {
    constructor() {
        super({
            x: 0,
            y: 0,
            width: GP.bw,
            height: GP.bh,
            zIndex: 991,
        });
        this.Brand = new Image({
            x: GP.bw / 2,
            y: GP.bh * 2 / 7,
            around: "center",
            url: "leafer://brand.svg",
            opacity: 0,
            scale: 0,
            offsetY: -300,
            shadow: {
                x: 0,
                y: 0,
                blur: 50,
                color: "#555",
            },
        });
        this.Hint1 = new TextLine(GP.bw / 2, GP.bh * 4 / 7 - 12, "center", "#444", 16)
            .$append("按")
            .$append("空格键", 3, void 0, void 0, "bold")
            .$append("开始游戏");
        this.Hint1.opacity = 0;
        this.Hint2 = new TextLine(GP.bw / 2, GP.bh * 4 / 7 + 12, "center", "#777", 12)
            .$append("通过")
            .$append("方向键", 3, void 0, void 0, "bold")
            .$append("或")
            .$append("W/A/S/D", 3, void 0, void 0, "bold")
            .$append("来控制平板的移动");
        this.Hint2.opacity = 0;
        this.add([this.Brand, this.Hint1, this.Hint2]);
    }

    async init() {
        await this.preloadImage();
    }

    async preloadImage() {
        await GP.ImageInitializer("brand.svg", "./assets/svg/brand.svg");
    }

    relocate_(e) {
        this.cx = e.width / 2;
        this.Brand.y = e.height * 2 / 7;
        this.Hint1.y = e.height * 4 / 7 - 12;
        this.Hint2.y = e.height * 4 / 7 + 12;
    }

    reset_() {
        this.opacity = 1;
        this.x = this.y = 0;
        this.Brand.opacity = 0;
        this.Brand.scale = 0;
        this.Brand.offsetY = -300;
        this.Hint1.opacity = 0;
        this.Hint2.opacity = 0;
    }

    show_() {
        this.visible = true;
        this.relocate_({ width: GP.bw, height: GP.bh });
        this.Brand.animate([
            { opacity: 0.9, scale: 1.1, offsetY: -5 },
            { opacity: 1, scale: 1, offsetY: 0 },
        ], {
            duration: 0.8,
            join: true,
        }).once(AnimateEvent.COMPLETED, () => {
            this.Brand.hoverStyle = {
                shadow: {
                    x: 0,
                    y: 0,
                    blur: 20,
                    color: "#FFEF00",
                },
            };
        });
        this.Hint1.animate([
            { opacity: 1 },
        ], {
            duration: 0.8,
            delay: 0.2,
            join: true,
        });
        this.Hint2.animate([
            { opacity: 1 },
        ], {
            duration: 0.8,
            delay: 0.4,
            join: true,
        });
    }

    hide_() {
        this.animate([
            { opacity: 0 },
        ], {
            duration: 0.5,
            join: true,
        }).once(AnimateEvent.COMPLETED, () => this.visible = false);
    }
}
