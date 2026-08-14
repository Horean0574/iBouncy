import { AnimateEvent, Ellipse } from "leafer-game";
import { Ball, GP, leafer } from "../core/instances";
import { ceil, floor } from "../utils/math";
import { UIConf } from "../config";
import type { IAnimate } from "@leafer-ui/interface";

const TRAIL_DIAM = UIConf.BallTrailing.RADIUS * 2;
/** 复用关键帧，避免每次拖尾动画新建数组 */
const TRAIL_FADE_KEYFRAMES = [
    { opacity: 1, width: TRAIL_DIAM, height: TRAIL_DIAM },
    { opacity: 0.3, width: 5, height: 5 },
];

export default class X_BallTrailing {
    length = 8;
    loopIdx = 0;
    dotIdx = -1;
    dots = new Map<number, Ellipse>();
    activeAnimations = new Map<number, IAnimate>();
    framesInterval = 5; // based on 60Hz

    constructor() {
        for (let i = 0; i < this.length; ++i) {
            this.dots.set(
                i,
                new Ellipse({
                    x: -100,
                    y: -100,
                    width: UIConf.BallTrailing.RADIUS * 2,
                    height: UIConf.BallTrailing.RADIUS * 2,
                    around: "center",
                    fill: UIConf.BallTrailing.FILL,
                    visible: false,
                    // 拖尾点位于球下层（球已先加入渲染树，zIndex 较低保持拖尾在球后）
                    zIndex: -1,
                }),
            );
        }
    }

    render(): void {
        for (const d of this.dots.values()) {
            d.render_();
        }
    }

    prepare(): void {
        const act = GP.ENV.actUnitInterval;
        const actN = typeof act === "string" ? parseFloat(act) : act;
        if (actN >= 25) {
            this.framesInterval = ceil(94 / actN);
        } else {
            this.framesInterval = floor(94 / actN);
        }
    }

    frameLoop(steps: number): void {
        this.loopIdx = (this.loopIdx + 1) % this.framesInterval;
        if (this.loopIdx === 0) {
            const idx = (this.dotIdx = (this.dotIdx + 1) % this.length);
            const dot = this.dots.get(idx)!;
            dot.w = dot.h = UIConf.BallTrailing.RADIUS * 2;
            dot.opacity = 1;
            dot.x = Ball.cx;
            dot.y = Ball.cy;
            dot.visible = true;
            if (this.activeAnimations.has(idx)) {
                const oldAni = this.activeAnimations.get(idx)!;
                oldAni.off(AnimateEvent.COMPLETED);
                leafer.killAnimate(oldAni);
                this.activeAnimations.delete(idx);
            }
            const std = GP.ENV.stdUnitInterval;
            const ani = dot.animate(TRAIL_FADE_KEYFRAMES, {
                duration: (std * this.framesInterval * this.length) / steps / 1000,
                easing: "linear",
            });
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
