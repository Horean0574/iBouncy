import { describe, it, expect } from "vitest";

function floor(v: number): number {
    return Math.floor(v);
}

function stringifyScore(v: number): string {
    const absV = Math.abs(v);
    const intPart = floor(absV / 10);
    const decPart = absV % 10;
    return `${v < 0 ? "-" : ""}${intPart}.${decPart}`;
}

function assignDefScore(score: number): number {
    return Math.round(score * 10);
}

describe("E_Scoring 计分逻辑", () => {
    describe("stringify_ 分数格式化为字符串", () => {
        it("0 应该格式化为 '0.0'", () => {
            expect(stringifyScore(0)).toBe("0.0");
        });

        it("整数分数 5 应该格式化为 '5.0'", () => {
            expect(stringifyScore(50)).toBe("5.0");
        });

        it("整数分数 42 应该格式化为 '42.0'", () => {
            expect(stringifyScore(420)).toBe("42.0");
        });

        it("分数 10.7 应该格式化为 '10.7'", () => {
            expect(stringifyScore(107)).toBe("10.7");
        });

        it("分数 0.3 应该格式化为 '0.3'", () => {
            expect(stringifyScore(3)).toBe("0.3");
        });

        it("负分数应该正确格式化", () => {
            expect(stringifyScore(-15)).toBe("-1.5");
        });
    });

    describe("assign_ 分数赋值 (内部值 = score * 10)", () => {
        it("score = 0 时内部值为 0", () => {
            expect(assignDefScore(0)).toBe(0);
        });

        it("score = 5 时内部值为 50", () => {
            expect(assignDefScore(5)).toBe(50);
        });

        it("score = 42.7 时内部值为 427", () => {
            expect(assignDefScore(42.7)).toBe(427);
        });

        it("score = 3.14159 时内部值四舍五入为 31", () => {
            expect(assignDefScore(3.14159)).toBe(31);
        });

        it("score = -1.5 时内部值为 -15", () => {
            expect(assignDefScore(-1.5)).toBe(-15);
        });
    });

    describe("delta_ 分数增量", () => {
        function deltaScore(current: number, delta: number): { newVal: number; deltaVal: number } {
            const prevV = current;
            const newV = current + Math.round(delta * 10);
            return { newVal: newV, deltaVal: newV - prevV };
        }

        it("当前分数 0，增量 0 时", () => {
            const r = deltaScore(0, 0);
            expect(r.newVal).toBe(0);
            expect(r.deltaVal).toBe(0);
        });

        it("当前 0，加 5.2 分", () => {
            const r = deltaScore(0, 5.2);
            expect(r.newVal).toBe(52);
            expect(r.deltaVal).toBe(52);
            expect(stringifyScore(r.deltaVal)).toBe("5.2");
        });

        it("当前 100，加 0.3 分", () => {
            const r = deltaScore(100, 0.3);
            expect(r.newVal).toBe(103);
            expect(r.deltaVal).toBe(3);
        });

        it("当前 150，加 42.7 分", () => {
            const r = deltaScore(150, 42.7);
            expect(r.newVal).toBe(577);
            expect(r.deltaVal).toBe(427);
            expect(stringifyScore(r.deltaVal)).toBe("42.7");
        });
    });

    describe("碰撞得分公式 (0.4 * bvP + 0.16 * dP) * multiplier", () => {
        function calcBvP(bv: number): number {
            return Math.log2(bv) + 1 / Math.cos(Math.PI / 30 * bv);
        }

        function calcDP(d: number, tabletWidth: number): number {
            return Math.cos((Math.PI * 2 / tabletWidth) * d) + 0.5;
        }

        function calcHitScore(bv: number, d: number, multiplier: number): number {
            const bvP = calcBvP(bv);
            const dP = calcDP(d, 120);
            return (0.4 * bvP + 0.16 * dP) * multiplier;
        }

        it("球速为 1，距离为 0，1x 倍率时分数应为正数", () => {
            const score = calcHitScore(1, 0, 1);
            expect(score).toBeGreaterThan(0);
        });

        it("距离越大（偏离中心），dP 越小", () => {
            const dP1 = calcDP(0, 120);
            const dP2 = calcDP(60, 120);
            expect(dP1).toBeGreaterThan(dP2);
        });

        it("d = 0 时 dP ≈ 1.5", () => {
            expect(calcDP(0, 120)).toBeCloseTo(1.5, 1);
        });

        it("d = 60 (平板边缘) 时 dP ≈ -0.5", () => {
            expect(calcDP(60, 120)).toBeCloseTo(-0.5, 1);
        });

        it("球速越高，bvP 越大", () => {
            const bvP1 = calcBvP(1);
            const bvP2 = calcBvP(5);
            expect(bvP2).toBeGreaterThan(bvP1);
        });

        it("5x combo 倍率下分数应该是 1x 的 5 倍", () => {
            const score1x = calcHitScore(3, 20, 1);
            const score5x = calcHitScore(3, 20, 5);
            expect(score5x / score1x).toBeCloseTo(5, 5);
        });
    });
});
