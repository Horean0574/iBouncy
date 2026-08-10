/**
 * 原生 Canvas 2D 粒子系统。
 * 在 Leafer 画布上方叠加独立 `<canvas>`，用原生 API 直接绘制粒子，
 * 绕过 Leafer 场景图遍历、属性插值和事件系统，碰撞帧可节省 1-3ms 渲染开销。
 *
 * 使用方式：
 * ```
 * const nativeParticles = new X_NativeParticle(leaferCanvas);
 * // 在 gameLoop 中:
 * nativeParticles.render(deltaTime);
 * // 碰撞时:
 * nativeParticles.emit(x, y);
 * ```
 */
import { fastRandom } from "../utils/prng";
import { effectsEnabled } from "../core/effects";
import { UIConf } from "../config";

const conf = UIConf.CollisionParticle;

interface NativeParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    color: string;
    opacity: number;
    life: number;
    age: number;
}

export default class X_NativeParticle {
    private ctx: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    private particles: NativeParticle[] = [];
    private lastEmitTime = 0;
    private readonly emitThrottleMs = 60;
    /** 上一帧各粒子的绘制区域（位置+半径+1px 描边余量），用于只清除脏矩形而非全屏。 */
    private prevRects: { x: number; y: number; r: number }[] = [];
    /** 清除脏矩形时的外扩像素，避免残余描边。 */
    private static readonly RECT_PAD = 1.5;

    /**
     * @param leaferCanvas Leafer 使用的 `<canvas>` 元素，用于定位和尺寸同步。
     */
    constructor(leaferCanvas: HTMLCanvasElement) {
        this.canvas = document.createElement("canvas");
        this.canvas.style.position = "absolute";
        this.canvas.style.top = "0";
        this.canvas.style.left = "0";
        this.canvas.style.pointerEvents = "none"; // 不拦截鼠标/触摸事件
        this.canvas.style.zIndex = "1";
        this.canvas.width = leaferCanvas.width;
        this.canvas.height = leaferCanvas.height;

        leaferCanvas.parentElement?.appendChild(this.canvas);

        const ctx = this.canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to get 2D context for native particle canvas");
        this.ctx = ctx;
    }

    syncSize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    emit(x: number, y: number): void {
        if (!effectsEnabled) return;

        const now = performance.now();
        if (now - this.lastEmitTime < this.emitThrottleMs) return;
        this.lastEmitTime = now;

        for (let i = 0; i < conf.COUNT; i++) {
            const angle = (Math.PI * 2 * i) / conf.COUNT + (fastRandom() - 0.5) * 0.5;
            const speed = 0.3 + fastRandom() * 0.7;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * conf.SPREAD * speed,
                vy: Math.sin(angle) * conf.SPREAD * speed,
                r: conf.MIN_RADIUS + fastRandom() * (conf.MAX_RADIUS - conf.MIN_RADIUS),
                color: conf.COLORS[Math.floor(fastRandom() * conf.COLORS.length)],
                opacity: 0.9,
                life: conf.DURATION * (0.5 + fastRandom() * 0.5),
                age: 0,
            });
        }
    }

    render(dt: number): void {
        if (this.particles.length === 0) {
            // 粒子清空后仍需清除上一帧残留的脏区域
            this.clearPrevRects();
            return;
        }

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 只清除上一帧粒子所在的脏矩形，避免全屏 clearRect 开销
        this.clearPrevRects();
        this.prevRects.length = 0;

        // 从后向前过滤，避免 splice 开销
        let writeIdx = 0;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.age += dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.opacity = Math.max(0, 0.9 * (1 - p.age / p.life));

            if (p.opacity <= 0) continue;

            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();

            this.prevRects.push({ x: p.x, y: p.y, r: p.r });
            this.particles[writeIdx++] = p;
        }
        this.particles.length = writeIdx;

        ctx.globalAlpha = 1;
    }

    /** 清除上一帧粒子绘制区域（含外扩边距），并裁剪到画布范围。 */
    private clearPrevRects(): void {
        const { ctx, canvas } = this;
        const w = canvas.width;
        const h = canvas.height;
        for (let i = 0; i < this.prevRects.length; i++) {
            const { x, y, r } = this.prevRects[i];
            const pad = r + X_NativeParticle.RECT_PAD;
            const left = x - pad;
            const top = y - pad;
            const size = pad * 2;
            ctx.clearRect(
                left < 0 ? 0 : left,
                top < 0 ? 0 : top,
                left + size > w ? w - (left < 0 ? 0 : left) : size,
                top + size > h ? h - (top < 0 ? 0 : top) : size,
            );
        }
        this.prevRects.length = 0;
    }
}
