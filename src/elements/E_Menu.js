import { AnimateEvent, Group, Image, Text } from "leafer-game";
import { GP, leafer } from "../core/instances";

export default class E_Menu extends Group {
    constructor() {
        super({
            x: 0,
            y: 0,
            width: GP.bw,
            height: GP.bh,
            animationOut: {
                style: { opacity: 0 },
                duration: 0.5,
                join: true,
            },
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
        this.Hint1 = new Group({
            x: GP.bw / 2,
            y: GP.bh * 4 / 7 - 12,
            opacity: 0,
            around: "center",
        });
        this.HintLeft = new Text({
            x: 0,
            y: 0,
            text: "按",
            fill: "#444",
            fontSize: 16,
        });
        this.HintSpace = new Text({
            x: this.HintLeft.ox + 3,
            y: 0,
            text: "空格键",
            fill: "#444",
            fontSize: 16,
            fontWeight: "bold",
        });
        this.HintRight = new Text({
            x: this.HintSpace.ox + 3,
            y: 0,
            text: "开始游戏",
            fill: "#444",
            fontSize: 16,
        });
        this.Hint1.add([this.HintLeft, this.HintSpace, this.HintRight]);
        this.Hint2 = new Group({
            x: GP.bw / 2,
            y: GP.bh * 4 / 7 + 12,
            opacity: 0,
            around: "center",
        });
        this.HintOperation = new Text({
            x: 0,
            y: 0,
            text: "通过 方向键 或 W/A/S/D 来控制平板的移动",
            fill: "#777",
            fontSize: 12,
        });
        this.Hint2.add(this.HintOperation);
        this.add([this.Brand, this.Hint1, this.Hint2]);
    }

    async init() {
        await this.preloadImage();
    }

    async preloadImage() {
        await GP.ImageInitializer("brand.svg", "./assets/svg/brand.svg");
    }

    relocate_(e) {
        if (!this.visible) return;
        this.cx = e.width / 2;
        this.Brand.y = e.height * 2 / 7;
        this.Hint1.y = e.height * 4 / 7 - 12;
        this.Hint2.y = e.height * 4 / 7 + 12;
    }

    render_() {
        leafer.add(this);
        const ani1 = this.Brand.animate([
            { opacity: 0.9, scale: 1.1, offsetY: -5 },
            { opacity: 1, scale: 1, offsetY: 0 },
        ], {
            duration: 0.8,
            join: true,
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
        ani1.once(AnimateEvent.COMPLETED, () => {
            this.Brand.hoverStyle = {
                shadow: {
                    x: 0,
                    y: 0,
                    blur: 20,
                    color: "#FFEF00",
                },
            };
        });
    }
}
