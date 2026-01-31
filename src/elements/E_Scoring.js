import { Group, Path, Text } from "leafer-game";
import { Ball, F, GP, timer } from "../core/instances";
import { UIConf } from "../config";

export default class E_Scoring extends Group {
    v = 0;

    constructor() {
        super({
            x: GP.bw / 2 - 120,
            y: 0,
        });
        this.Panel = new Path({
            path: "m -120 0\n" +
                "  h 10\n" +
                "  a 20 15 0 0 1 20 15\n" +
                "  v 35\n" +
                "  a 15 18 0 0 0 15 18\n" +
                "  h 150\n" +
                "  a 15 18 0 0 0 15 -18\n" +
                "  v -35\n" +
                "  a 20 15 0 0 1 20 -15\n" +
                "  h 10\n" +
                "  Z",
            x: 120,
            y: 0,
            fill: UIConf.Scoring.Panel.FILL,
        });
        this.Integer = new Text({
            x: -GP.bw,
            y: 7,
            fontSize: UIConf.Scoring.Integer.FONT_SIZE,
            fill: UIConf.Scoring.Integer.FILL,
            text: "-",
            fontFamily: UIConf.Scoring.Integer.FONT_FAMILY,
        });
        this.Decimal = new Text({
            x: -GP.bw,
            y: 15,
            fontSize: UIConf.Scoring.Decimal.FONT_SIZE,
            fill: UIConf.Scoring.Decimal.FILL,
            text: "--",
            fontFamily: UIConf.Scoring.Decimal.FONT_FAMILY,
        });
        this.add([this.Panel, this.Integer, this.Decimal]);

        this.init_ = this.init_.bind(this);
    }

    reset_() {
        this.assign_(0);
    }

    relocate_(e) {
        if (e.width === e.old.width) return;
        this.cx = e.width / 2;
        this.#newScore_();
    }

    async init_() {
        await this.#loadFont_();
    }

    async #loadFont_() {
        await GP.fontInitializer("HYDiSiKe-U", "./assets/fonts/HYDiSiKe-U");
        this.#newScore_();
    }

    assign_(score) {
        this.v = Math.round(score * 10);
        this.#newScore_();
        return E_Scoring.stringify_(this.v);
    }

    delta_(x) {
        const prevV = this.v;
        this.v += Math.round(x * 10);
        this.#newScore_();
        return E_Scoring.stringify_(this.v - prevV);
    }

    tip_(delta) {
        const [initialOffsetX, transitionX, transitionY] = this.#getTipData_();
        const tip = new Text({
            x: Ball.cx + initialOffsetX,
            y: Ball.oy,
            around: "center",
            text: "+" + delta,
            fill: UIConf.Scoring.tip.FILL,
            stroke: UIConf.Scoring.tip.STROKE,
            fontSize: UIConf.Scoring.tip.FONT_SIZE,
            fontFamily: UIConf.Scoring.tip.FONT_FAMILY,
            opacity: 0.9,
            shadow: {
                x: 1,
                y: 1,
                blur: 10,
                color: "gray",
            },
            animation: {
                keyframes: [
                    { style: { opacity: 0.9, fontSize: 24 }, duration: 0.3 },
                    { style: { opacity: 0, fontSize: 25 }, duration: 0.4 },
                ],
                join: true,
            },
        });
        tip.render_();
        tip.animate([
            { offsetX: transitionX },
        ], {
            duration: 0.45,
            easing: "sine-out",
            join: true,
        });
        tip.animate([
            { style: { offsetY: -12 }, duration: 0.12, easing: "quad-out" },
            { style: { offsetY: transitionY }, duration: 0.28, easing: "quad-in-out" },
        ], {
            join: true,
        });
        timer.newTimeout(function () {
            tip.destroy();
        }, 600);
    }

    #getTipData_() {
        const ballSpeedAffect = 0.7 * Ball.vx * 600 / GP.ENV.actUnitInterval;
        let direction = Math.random() >= 0.5 ? 1 : -1;
        let initialOffsetX = (10 + Math.random() * 20) * direction;
        let transitionX0 = (40 + Math.random() * 20) * direction;
        let transitionY = (Math.random() - 0.4) * 24;
        const totalTranslationX = initialOffsetX + transitionX0 + ballSpeedAffect;
        if (Ball.cx + totalTranslationX <= GP.ENV.paddingSide) {
            initialOffsetX *= -1;
            transitionX0 *= -1;
        } else if (Ball.cx + totalTranslationX >= GP.bw - GP.ENV.paddingSide) {
            initialOffsetX *= -1;
            transitionX0 *= -1;
        }
        return [initialOffsetX + ballSpeedAffect / 2, transitionX0 + ballSpeedAffect / 2, transitionY];
    }

    #newScore_() {
        this.Integer.text = F(this.v / 10);
        this.Decimal.text = "." + this.v % 10;
        this.Integer.x = (240 - this.Integer.w - this.Decimal.w) / 2;
        this.Decimal.x = this.Integer.ox;
    }

    static stringify_(v) {
        return `${F(v / 10)}.${v % 10}`;
    }
}
