import GameElementCentered from "../utils/GameElementCentered";
import { Ellipse, AnimateEvent } from "leafer-game";
import { Ball, C, F, GP, leafer } from "../core/instances";

export default class EX_BallTrailing {
    length = 8;
    dotRadius = 5.5;
    loopIdx = 0;
    dotIdx = -1;
    dots = new Map();
    activeAnimations = new Map();
    framesInterval = 5; // based on 60Hz

    constructor() {
        for (let i = 0; i < this.length; ++i) {
            this.dots.set(i, new GameElementCentered(new Ellipse({
                x: -100,
                y: -100,
                width: this.dotRadius * 2,
                height: this.dotRadius * 2,
                fill: "#FF4500BA",
                visible: false,
            })));
        }
    }

    render() {
        for (let d of this.dots.values()) {
            leafer.add(d.el);
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
            dot.w = dot.h = this.dotRadius * 2;
            dot.el.opacity = 1;
            dot.cx = Ball.cx;
            dot.cy = Ball.cy;
            dot.el.visible = true;
            if (this.activeAnimations.has(idx)) {
                const oldAni = this.activeAnimations.get(idx);
                oldAni.off(AnimateEvent.COMPLETED);
                leafer.killAnimate(oldAni);
                this.activeAnimations.delete(idx);
            }
            const ani = dot.el.animate(
                [
                    { opacity: 1, width: this.dotRadius * 2, height: this.dotRadius * 2 },
                    { opacity: 0.3, width: 5, height: 5 },
                ],
                {
                    duration: (GP.ENV.stdUnitInterval * this.framesInterval * this.length) / steps / 1000,
                    easing: "linear",
                },
            );
            ani.on(AnimateEvent.COMPLETED, () => {
                this.activeAnimations.delete(idx);
                dot.el.visible = false;
                dot.w = dot.h = this.dotRadius * 2;
                dot.el.opacity = 1;
            });
            this.activeAnimations.set(idx, ani);
        }
    }
}
