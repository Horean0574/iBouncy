import { describe, it, expect } from "vitest";
import { GameConf } from "../../src/config/GameConf";

describe("GameConf 游戏配置常量", () => {
    it("TIME_LIMIT 应该是一个正整数", () => {
        expect(GameConf.TIME_LIMIT).toBeGreaterThan(0);
        expect(Number.isInteger(GameConf.TIME_LIMIT)).toBe(true);
    });

    it("MAX_STEP_PER_FRAME 应该大于 0", () => {
        expect(GameConf.MAX_STEP_PER_FRAME).toBeGreaterThan(0);
    });

    it("DEFAULT_REFRESH_RATE 应该是合理的刷新率", () => {
        expect(GameConf.DEFAULT_REFRESH_RATE).toBeGreaterThanOrEqual(30);
        expect(GameConf.DEFAULT_REFRESH_RATE).toBeLessThanOrEqual(240);
    });

    it("Ball 的初始速度范围应该是合理的", () => {
        expect(GameConf.Ball.VX_MIN).toBeGreaterThan(0);
        expect(GameConf.Ball.VX_MAX).toBeGreaterThan(GameConf.Ball.VX_MIN);
        expect(GameConf.Ball.VY).toBeGreaterThan(0);
    });

    it("Ball 加速参数应该在有效范围内", () => {
        const acc = GameConf.Ball.ACCELERATION;
        expect(acc.FROM).toBeGreaterThan(acc.TO);
        expect(acc.COOLDOWN).toBeGreaterThan(0);
        expect(acc.RATIO_X1).toBeGreaterThan(1);
        expect(acc.DECAY_TIMES).toBeGreaterThan(0);
    });

    it("Tablet 速度应该是正数", () => {
        expect(GameConf.Tablet.VX).toBeGreaterThan(0);
        expect(GameConf.Tablet.VY).toBeGreaterThan(0);
    });

    it("Combo 系统参数应该是合理的", () => {
        const combo = GameConf.Combo;
        expect(combo.RESET_WINDOW).toBeGreaterThan(0);
        expect(combo.MULTIPLIER_STEP).toBeGreaterThan(0);
        expect(combo.MAX_MULTIPLIER).toBeGreaterThan(1);
        expect(combo.MAX_MULTIPLIER).toBeGreaterThan(combo.MULTIPLIER_STEP);
    });

    it("Combo 最大倍率应该能通过步进达到", () => {
        const combo = GameConf.Combo;
        const steps = Math.ceil((combo.MAX_MULTIPLIER - 1) / combo.MULTIPLIER_STEP);
        expect(steps).toBeGreaterThan(0);
        expect(1 + steps * combo.MULTIPLIER_STEP).toBeGreaterThanOrEqual(combo.MAX_MULTIPLIER);
    });

    it("PADDING 值应该非负", () => {
        expect(GameConf.PADDING.TOP).toBeGreaterThanOrEqual(0);
        expect(GameConf.PADDING.SIDE).toBeGreaterThanOrEqual(0);
    });

    it("MAX_ACCUMULATED 应该是正数", () => {
        expect(GameConf.MAX_ACCUMULATED).toBeGreaterThan(0);
    });
});
