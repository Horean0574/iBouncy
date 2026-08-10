import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/events", () => ({
    evBus: {
        on: vi.fn(),
        once: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        destroy: vi.fn(),
    },
    GEV: {
        SCORE_HIT: "player:score:hit",
    },
}));

import Interaction from "../../src/core/interaction";
import type EmbeddedTimer from "../../src/utils/EmbeddedTimer";

type BoundsEntity = {
    x: number;
    y: number;
    ox: number;
    oy: number;
    vx: number;
    vy: number;
    cx: number;
    cy: number;
};

function makeBall(): BoundsEntity & { w: number; h: number } {
    return {
        x: 0, y: 0, ox: 0, oy: 0,
        vx: 0, vy: 0,
        cx: 0, cy: 0,
        w: 20, h: 20,
    };
}

function makeTablet(): BoundsEntity & { w: number; h: number; vxMax: number; vyMax: number; ty: number } {
    return {
        x: 0, y: 500, ox: 120, oy: 521,
        vx: 0, vy: 0,
        cx: 60, cy: 510.5,
        w: 120, h: 21,
        vxMax: 6,
        vyMax: 2.8,
        get ty() { return this.y; },
    };
}

function makeGp() {
    return {
        bw: 800,
        bh: 600,
        frameTimeStamp: 0,
        frameCount: 0,
        ENV: {
            actUnitInterval: "16.7",
        },
    };
}

describe("Interaction 碰撞与连击系统", () => {
    let gi: Interaction;
    let ball: ReturnType<typeof makeBall>;
    let tablet: ReturnType<typeof makeTablet>;
    let gp: ReturnType<typeof makeGp>;
    let timer: { newInterval: ReturnType<typeof vi.fn>; newTimeout: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        ball = makeBall();
        tablet = makeTablet();
        gp = makeGp();
        timer = { newInterval: vi.fn(), newTimeout: vi.fn() };
        gi = new Interaction({
            Ball: ball as never,
            Tablet: tablet as never,
            timer: timer as unknown as EmbeddedTimer,
            GP: gp as never,
        });
    });

    describe("boundaryDetect 边界检测", () => {
        it("实体在边界内不应该反弹", () => {
            const entity: BoundsEntity = {
                x: 100, y: 100, ox: 200, oy: 200,
                vx: 2, vy: 2, cx: 150, cy: 150,
            };
            const originalVx = entity.vx;
            const originalVy = entity.vy;
            gi.boundaryDetect(entity);
            expect(entity.vx).toBe(originalVx);
            expect(entity.vy).toBe(originalVy);
        });

        it("实体超出左边界时应该反弹", () => {
            const entity: BoundsEntity = {
                x: -10, y: 100, ox: 100, oy: 200,
                vx: 3, vy: 2, cx: 50, cy: 150,
            };
            gi.boundaryDetect(entity, { bounce: true });
            expect(entity.x).toBe(0);
            expect(entity.vx).toBe(-3);
        });

        it("实体超出右边界时应该反弹", () => {
            const entity: BoundsEntity = {
                x: 100, y: 100, ox: 850, oy: 200,
                vx: 4, vy: 2, cx: 500, cy: 150,
            };
            gi.boundaryDetect(entity, { bounce: true });
            expect(entity.vx).toBe(-4);
        });

        it("实体超出上边界时应该反弹", () => {
            const entity: BoundsEntity = {
                x: 100, y: -10, ox: 200, oy: 100,
                vx: 2, vy: 3, cx: 150, cy: 50,
            };
            gi.boundaryDetect(entity, { bounce: true });
            expect(entity.y).toBe(0);
            expect(entity.vy).toBe(-3);
        });

        it("实体超出下边界且无回调时应该反弹", () => {
            const entity: BoundsEntity = {
                x: 100, y: 400, ox: 200, oy: 650,
                vx: 2, vy: 4, cx: 150, cy: 525,
            };
            gi.boundaryDetect(entity, { bounce: true });
            expect(entity.vy).toBe(-4);
        });

        it("下边界回调触发时不应反弹", () => {
            let called = false;
            const entity: BoundsEntity = {
                x: 100, y: 400, ox: 200, oy: 650,
                vx: 2, vy: 4, cx: 150, cy: 525,
            };
            gi.boundaryDetect(entity, {
                bounce: true,
                callbacks: [null, null, () => { called = true; }, null],
            });
            expect(called).toBe(true);
        });

        it("自定义 padding 应该生效", () => {
            const entity: BoundsEntity = {
                x: 10, y: 10, ox: 200, oy: 200,
                vx: 3, vy: 2, cx: 100, cy: 100,
            };
            gi.boundaryDetect(entity, { bounce: true, paddings: [50, 0, 0, 50] });
            expect(entity.x).toBe(50);
            expect(entity.vx).toBe(-3);
        });

        it("不反弹模式(bounce=false)下超出边界位置归零但不翻转速度", () => {
            const entity: BoundsEntity = {
                x: -10, y: 100, ox: 200, oy: 200,
                vx: 3, vy: 2, cx: 100, cy: 150,
            };
            gi.boundaryDetect(entity, { bounce: false });
            expect(entity.x).toBe(0);
            expect(entity.vx).toBe(0);
        });
    });

    describe("registerHit 连击系统", () => {
        it("首次命中 combo 为 1，倍率为 1", () => {
            const result = gi.registerHit();
            expect(result.combo).toBe(1);
            expect(result.multiplier).toBe(1);
        });

        it("重置窗口内的连续命中应该递增 combo", () => {
            gp.frameTimeStamp = 1000;
            gi.registerHit();

            gp.frameTimeStamp = 1500;
            const result = gi.registerHit();
            expect(result.combo).toBe(2);
            expect(result.multiplier).toBeGreaterThan(1);
        });

        it("超出重置窗口后命中应该重置 combo", () => {
            gp.frameTimeStamp = 1000;
            gi.registerHit();

            gp.frameTimeStamp = 2500;
            const result = gi.registerHit();
            expect(result.combo).toBe(1);
            expect(result.multiplier).toBe(1);
        });

        it("resetCombo 应该重置连击到 0", () => {
            gp.frameTimeStamp = 1000;
            gi.registerHit();
            gp.frameTimeStamp = 1500;
            gi.registerHit();

            gi.resetCombo();
            const result = gi.registerHit();
            expect(result.combo).toBe(1);
        });

        it("combo 倍率不应该超过 MAX_MULTIPLIER", () => {
            for (let i = 0; i < 30; i++) {
                gp.frameTimeStamp = 1000 + i * 100;
                gi.registerHit();
            }
            const result = gi.registerHit();
            expect(result.multiplier).toBeLessThanOrEqual(5);
        });

        it("连续 5 次命中 combo 为 5，倍率应为 2.0", () => {
            for (let i = 0; i < 5; i++) {
                gp.frameTimeStamp = 1000 + i * 100;
                gi.registerHit();
            }
            const result = gi.registerHit();
            expect(result.combo).toBe(6);
            expect(result.multiplier).toBeCloseTo(2.25, 2);
        });
    });

    describe("tempAccelerate 临时加速", () => {
        it("无效方向返回 0", () => {
            expect(gi.tempAccelerate("z" as never)).toBe(0);
        });

        it("首次加速应该返回正数", () => {
            ball.vx = 3;
            ball.vy = 4;
            tablet.vx = 0;
            tablet.vy = 0;
            gp.frameTimeStamp = 1000;

            const resultX = gi.tempAccelerate("x");
            expect(resultX).toBeGreaterThan(0);
        });

        it("冷却时间内不应再次加速", () => {
            ball.vx = 3;
            tablet.vx = 0;
            gp.frameTimeStamp = 1000;
            gi.tempAccelerate("x");

            gp.frameTimeStamp = 1020;
            expect(gi.tempAccelerate("x")).toBe(0);
        });

        it("冷却时间过后可以再次加速", () => {
            ball.vx = 3;
            tablet.vx = 0;
            gp.frameTimeStamp = 1000;
            gi.tempAccelerate("x");

            gp.frameTimeStamp = 1100;
            expect(gi.tempAccelerate("x")).toBeGreaterThan(0);
        });
    });
});
