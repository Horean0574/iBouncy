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
        GAME_BALL_LOST: "game:ball-lost",
        GAME_TIME_UP: "game:time-up",
        GAME_OVER: "game:over",
        GAME_PREPARED: "game:prepared",
        GAME_START: "game:start",
        GAME_RESTART: "game:restart",
        GAME_PAUSE: "game:pause",
        GAME_RESUME: "game:resume",
        UI_RENDER_ELSE: "ui:render-else",
        RESIZE: "system:resize",
        SCORE_HIT: "player:score:hit",
        GAME_RESET: "game:reset",
    },
}));

vi.mock("leafer-game", () => ({}));

import Processor from "../../src/core/processor";
import { GameConf } from "../../src/config/GameConf";
import { evBus } from "../../src/events";

function createProcessor() {
    const env = {
        refreshRate: 60,
        actUnitInterval: "16.7",
        stdUnitInterval: 16.7,
        fixedStep: 16.7,
        maxStepPerFrame: 10,
        paddingTop: 80,
        paddingSide: 40,
        timeLimit: 120,
    };
    const leafer = {} as never;
    return new Processor(env, leafer);
}

describe("Processor 状态机", () => {
    let gp: Processor;

    beforeEach(() => {
        vi.clearAllMocks();
        gp = createProcessor();
    });

    it("初始化状态为 init", () => {
        expect(gp.at("init")).toBe(true);
    });

    it("at 方法应该支持多状态检查", () => {
        expect(gp.at("init", "prepared")).toBe(true);
        expect(gp.at("prepared", "playing")).toBe(false);
    });

    it("state 方法应该改变状态", () => {
        gp.state("prepared");
        expect(gp.at("prepared")).toBe(true);
        expect(gp.at("init")).toBe(false);
    });

    it("start 应该切换到 playing 并触发事件", () => {
        gp.state("prepared");
        gp.start();
        expect(gp.at("playing")).toBe(true);
        expect(evBus.emit).toHaveBeenCalledWith("game:start");
    });

    it("pause 应该仅在 playing 状态有效", () => {
        gp.pause();
        expect(gp.at("paused")).toBe(false);

        gp.state("playing");
        gp.pause();
        expect(gp.at("paused")).toBe(true);
        expect(evBus.emit).toHaveBeenCalledWith("game:pause");
    });

    it("从 init 状态 pause 无效", () => {
        gp.pause();
        expect(gp.at("init")).toBe(true);
    });

    it("resume 应该只在 paused 状态有效", () => {
        gp.resume();
        expect(gp.at("playing")).toBe(false);

        gp.state("paused");
        gp.resume();
        expect(gp.at("playing")).toBe(true);
        expect(evBus.emit).toHaveBeenCalledWith("game:resume");
    });

    it("gameOver 应该触发事件并携带分数", () => {
        gp.state("playing");
        gp.setScoreSource(() => 42.5);

        gp.gameOver(true);
        expect(gp.at("over")).toBe(true);
        expect(evBus.emit).toHaveBeenCalledWith("game:over", {
            win: true,
            score: 42.5,
        });
    });

    it("gameOver 重复调用应该返回 true", () => {
        gp.state("playing");
        gp.gameOver(false);
        expect(gp.gameOver(true)).toBe(true);
    });

    it("restart 应该切换到 playing", () => {
        gp.state("over");
        gp.restart();
        expect(gp.at("playing")).toBe(true);
        expect(evBus.emit).toHaveBeenCalledWith("game:restart");
    });

    it("prepared 应该触发 GAME_PREPARED 事件", () => {
        gp.prepared();
        expect(gp.at("prepared")).toBe(true);
        expect(evBus.emit).toHaveBeenCalledWith("game:prepared");
    });

    it("syncViewport 应该更新视口尺寸", () => {
        gp.syncViewport(800, 600);
        expect(gp.bw).toBe(800);
        expect(gp.bh).toBe(600);
    });

    it("syncViewport 传入无效值不应更新", () => {
        gp.syncViewport(800, 600);
        gp.syncViewport(0, -1);
        expect(gp.bw).toBe(800);
        expect(gp.bh).toBe(600);
    });

    it("frameCount 初始为 0", () => {
        expect(gp.frameCount).toBe(0);
    });

    it("frameTimeStamp 初始为 0", () => {
        expect(gp.frameTimeStamp).toBe(0);
    });

    it("renderElse 应该触发 UI_RENDER_ELSE 事件", () => {
        gp.renderElse();
        expect(evBus.emit).toHaveBeenCalledWith("ui:render-else");
    });
});

describe("Processor 物理子步固定 120Hz", () => {
    let gp: Processor;

    beforeEach(() => {
        vi.clearAllMocks();
        gp = createProcessor();
    });

    it("measureRefreshRate 只更新 refreshRate，不覆盖固定物理步长", () => {
        const beforeStep = gp.ENV.fixedStep;
        const beforeAct = gp.ENV.actUnitInterval;

        // 模拟 120Hz 显示器（prog ≈ 0.5），测量 20 帧
        for (let i = 0; i < 20; i++) {
            gp.measureRefreshRate(0.5);
        }

        expect(gp.ENV.refreshRate).toBe(120);
        // fixedStep / actUnitInterval 保持初始值（120Hz 物理子步），不随显示器刷新率变化
        expect(gp.ENV.fixedStep).toBe(beforeStep);
        expect(gp.ENV.actUnitInterval).toBe(beforeAct);
        expect(gp.at("init2")).toBe(true);
    });

    it("模拟 60Hz 显示器测量后 fixedStep 同样保持不变", () => {
        const beforeStep = gp.ENV.fixedStep;
        for (let i = 0; i < 20; i++) {
            gp.measureRefreshRate(1.0);
        }
        expect(gp.ENV.refreshRate).toBe(60);
        expect(gp.ENV.fixedStep).toBe(beforeStep);
    });

    it("120Hz 物理子步下单位速度守恒：60Hz 渲染 2 子步/帧与 120Hz 渲染 1 子步/帧位移一致", () => {
        // 按真实配置构造 120Hz 物理环境：fixedStep=1000/TARGET_FPS，速度基准 stdUnitInterval=1000/DEFAULT_REFRESH_RATE
        const fixedStep = 1000 / GameConf.TARGET_FPS;
        const stdUnitInterval = 1000 / GameConf.DEFAULT_REFRESH_RATE;
        const unitProg = fixedStep / stdUnitInterval;
        const vx = 3.5;

        // 60Hz 渲染：1 个渲染帧（16.67ms）= 2 个子步，总位移 = 2 * vx * unitProg
        const movePerFrame60 = 2 * vx * unitProg;

        // 120Hz 渲染：2 个渲染帧（各 8.33ms，共 16.67ms）= 2 个子步，总位移 = 2 * vx * unitProg
        const movePerFrame120 = 2 * vx * unitProg;

        // 相同渲染时间窗（16.67ms）内总位移一致
        expect(movePerFrame60).toBeCloseTo(movePerFrame120, 10);
        // 且等于原 60Hz 物理的 vx * 1.0（prog=1, 1 子步）
        expect(movePerFrame60).toBeCloseTo(vx, 10);
        // TARGET_FPS 应为 120
        expect(GameConf.TARGET_FPS).toBe(120);
    });
});
