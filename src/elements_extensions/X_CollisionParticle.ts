import { Ellipse, AnimateEvent } from "leafer-game";
import { effectsEnabled } from "../core/effects";
import { fastRandom } from "../utils/prng";
import { UIConf } from "../config";

const conf = UIConf.CollisionParticle;

export default class X_CollisionParticle {
    private readonly pool: Ellipse[] = [];
    private readonly activeSet = new Set<Ellipse>();
    private readonly poolLimit = 64;

    /** 碰撞粒子节流：避免高频碰撞时 20+ 并发 Leafer 动画 */
    private lastEmitTime = 0;
    private readonly emitThrottleMs = 60;

    constructor() {
        // 对象池预分配：避免首次碰撞时 new Ellipse 产生的 GC 抖动
        for (let i = 0; i < conf.COUNT; i++) {
            const shape = new Ellipse({
                x: -100,
                y: -100,
                width: 4,
                height: 4,
                around: "center",
                visible: false,
            });
            shape.render_();
            this.pool.push(shape);
        }
    }

    emit(x: number, y: number): void {
        if (!effectsEnabled) return;

        // 节流：60ms 内只触发一次粒子发射
        const now = performance.now();
        if (now - this.lastEmitTime < this.emitThrottleMs) return;
        this.lastEmitTime = now;

        for (let i = 0; i < conf.COUNT; i++) {
            const p = this.acquireShape();
            p.x = x;
            p.y = y;
            p.w = p.h = (conf.MIN_RADIUS + fastRandom() * (conf.MAX_RADIUS - conf.MIN_RADIUS)) * 2;
            const c = conf.COLORS[Math.floor(fastRandom() * conf.COLORS.length)];
            p.fill = c;
            p.opacity = 0.9;
            p.visible = true;

            const duration = conf.DURATION * (0.5 + fastRandom() * 0.5);

            const aniFade = p.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration, easing: "sine-in", join: true });

            // 使用 Leafer AnimateEvent.COMPLETED 替代 setTimeout，消除闭包/定时器开销
            aniFade.on(AnimateEvent.COMPLETED, () => {
                this.recycleShape(p);
            });
        }
    }

    private recycleShape(shape: Ellipse): void {
        shape.visible = false;
        shape.offsetX = 0;
        shape.offsetY = 0;
        this.activeSet.delete(shape);
        if (this.pool.length < this.poolLimit) {
            this.pool.push(shape);
        } else {
            shape.destroy();
        }
    }

    private acquireShape(): Ellipse {
        const fromPool = this.pool.pop();
        if (fromPool) {
            this.activeSet.add(fromPool);
            return fromPool;
        }
        if (this.activeSet.size >= this.poolLimit) {
            const reuse = this.activeSet.values().next().value;
            if (reuse) return reuse;
        }
        const shape = new Ellipse({
            x: -100,
            y: -100,
            width: 4,
            height: 4,
            around: "center",
            visible: false,
        });
        shape.render_();
        this.activeSet.add(shape);
        return shape;
    }
}
