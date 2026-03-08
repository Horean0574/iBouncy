import { Ellipse } from "leafer-game";
import { Ball, C, F, GP } from "../core/instances";
import { UIConf } from "../config";

const DOT_FADE_DURATION = 0.4;

export default class X_BallTrailing {
    length = 6;
    loopIdx = 0;
    dotIdx = -1;
    dots = new Map();
    dotData = [];
    framesInterval = 5;

    constructor() {
        for (let i = 0; i < this.length; ++i) {
            this.dots.set(i, new Ellipse({
                x: -100,
                y: -100,
                width: UIConf.BallTrailing.RADIUS * 2,
                height: UIConf.BallTrailing.RADIUS * 2,
                around: "center",
                fill: UIConf.BallTrailing.FILL,
                visible: false,
            }));
            this.dotData[i] = { birthTime: 0, baseSize: 0, x: 0, y: 0 };
        }
    }

    render() {
        for (let d of this.dots.values()) {
            d.render_();
        }
    }

    prepare() {
        if (GP.ENV.actUnitInterval >= 25) {
            this.framesInterval = C(94 / GP.ENV.actUnitInterval);
        } else {
            this.framesInterval = F(94 / GP.ENV.actUnitInterval);
        }
    }

    frameLoop(steps) {
        this.loopIdx = (this.loopIdx + 1) % this.framesInterval;
        if (this.loopIdx === 0) {
            const idx = this.dotIdx = (this.dotIdx + 1) % this.length;
            const dot = this.dots.get(idx);
            const speed = Math.sqrt(Ball.vx ** 2 + Ball.vy ** 2);
            const sizeFactor = Math.min(0.9 + speed / 7, 1.9);
            const baseSize = UIConf.BallTrailing.RADIUS * 2 * sizeFactor;
            dot.w = dot.h = baseSize;
            dot.opacity = 0; // 从 0 开始，后面淡入
            dot.x = Ball.cx;
            dot.y = Ball.cy;
            dot.visible = true;
            this.dotData[idx] = { birthTime: performance.now() / 1000, baseSize };
        }
        // 每帧更新所有拖尾点，实现淡入淡出效果
        this.updateDots_();
    }

    updateDots_() {
        const now = performance.now() / 1000;
        for (let i = 0; i < this.length; ++i) {
            const data = this.dotData[i];
            if (data.birthTime <= 0) continue;
            const dot = this.dots.get(i);
            const elapsed = now - data.birthTime;
            if (elapsed >= DOT_FADE_DURATION) {
                dot.visible = false;
                data.birthTime = 0;
                dot.w = dot.h = UIConf.BallTrailing.RADIUS * 2;
                dot.opacity = 1;
            } else {
                const t = elapsed / DOT_FADE_DURATION;
                dot.opacity = 1 - t * 0.75;
                dot.w = dot.h = data.baseSize * (1 - t * 0.75);
            }
        }
    }
}
