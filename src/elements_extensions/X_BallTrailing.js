import { Ellipse, AnimateEvent } from "leafer-game";
import { Ball, C, F, GP, leafer } from "../core/instances";
import { UIConf } from "../config";

export default class X_BallTrailing {
    length = 8;
    loopIdx = 0;
    dotIdx = -1;
    dots = new Map();
    activeAnimations = new Map();
    framesInterval = 5; // based on 60Hz

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
            dot.opacity = 1;
            dot.x = Ball.cx;
            dot.y = Ball.cy;
            dot.visible = true;
            if (this.activeAnimations.has(idx)) {
                const oldAni = this.activeAnimations.get(idx);
                oldAni.off(AnimateEvent.COMPLETED);
                leafer.killAnimate(oldAni);
                this.activeAnimations.delete(idx);
            }
            const ani = dot.animate(
                [
                    { opacity: 1, width: baseSize, height: baseSize },
                    { opacity: 0.25, width: baseSize * 0.25, height: baseSize * 0.25 },
                ],
                {
                    duration: (GP.ENV.stdUnitInterval * this.framesInterval * this.length) / steps / 1000,
                    easing: "linear",
                },
            );
            ani.on(AnimateEvent.COMPLETED, () => {
                this.activeAnimations.delete(idx);
                dot.visible = false;
                dot.w = dot.h = UIConf.BallTrailing.RADIUS * 2;
                dot.opacity = 1;
            });
            this.activeAnimations.set(idx, ani);
        }
    }
}
