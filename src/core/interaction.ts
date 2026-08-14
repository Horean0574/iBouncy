import { abs } from "../utils/math";
import { GameConf } from "../config";
import type EmbeddedTimer from "../utils/EmbeddedTimer";
import type E_Ball from "../elements/E_Ball";
import type E_Tablet from "../elements/E_Tablet";
import type Processor from "./processor";
import { evBus, GEV } from "../events";

type Axis = "x" | "y";

/** Game entity with axis-aligned bounds and velocity (ball, paddle, etc.). */
export type BoundsEntity = {
    x: number;
    y: number;
    ox: number;
    oy: number;
    vx: number;
    vy: number;
    cx: number;
    cy: number;
};

export type BoundaryCallbacks = [
    (() => unknown) | null,
    (() => unknown) | null,
    (() => unknown) | null,
    (() => unknown) | null,
];

export default class Interaction {
    collisionStat = 0;
    accelerateCD = GameConf.Ball.ACCELERATION.COOLDOWN * 1000;
    prevAccTime: [number, number] = [0, 0];
    combo = 0;
    private comboLastHit = 0;
    private readonly comboResetWindow = GameConf.Combo.RESET_WINDOW * 1000;
    private readonly comboMultiplierStep = GameConf.Combo.MULTIPLIER_STEP;
    private readonly comboMaxMultiplier = GameConf.Combo.MAX_MULTIPLIER;
    #Ball: E_Ball;
    #Tablet: E_Tablet;
    #timer: EmbeddedTimer;
    #GP: Processor;

    constructor(deps: { Ball: E_Ball; Tablet: E_Tablet; timer: EmbeddedTimer; GP: Processor }) {
        this.#Ball = deps.Ball;
        this.#Tablet = deps.Tablet;
        this.#timer = deps.timer;
        this.#GP = deps.GP;
    }

    boundaryDetect(
        ge: BoundsEntity,
        {
            bounce = false,
            paddings = [0, 0, 0, 0] as [number, number, number, number],
            callbacks = [null, null, null, null] as BoundaryCallbacks,
        }: {
            bounce?: boolean;
            paddings?: [number, number, number, number];
            callbacks?: BoundaryCallbacks;
        } = {},
    ): void {
        const bounceRatio = bounce ? -1 : 0;
        if (ge.x < paddings[3]) {
            if (callbacks[3]?.() === void 0) {
                ge.x = paddings[3];
                ge.vx *= bounceRatio;
            }
        } else if (ge.ox > this.#GP.bw - paddings[1]) {
            if (callbacks[1]?.() === void 0) {
                ge.ox = this.#GP.bw - paddings[1];
                ge.vx *= bounceRatio;
            }
        }
        if (ge.y < paddings[0]) {
            if (callbacks[0]?.() === void 0) {
                ge.y = paddings[0];
                ge.vy *= bounceRatio;
            }
        } else if (ge.oy > this.#GP.bh - paddings[2]) {
            if (callbacks[2]?.() === void 0) {
                ge.oy = this.#GP.bh - paddings[2];
                ge.vy *= bounceRatio;
            }
        }
    }

    collisionDetect(): boolean {
        if (!this.#preciselyDetect()) {
            this.collisionStat = 0;
            return false;
        }
        if (this.collisionStat) return false;
        this.collisionStat = 1;

        const bvx = this.#Ball.vx!;
        const bvy = this.#Ball.vy!;
        const bcx = this.#Ball.cx!;
        const bcy = this.#Ball.cy!;
        const tcx = this.#Tablet.cx!;
        const tcy = this.#Tablet.cy!;

        const overlapX = Math.min(this.#Ball.ox!, this.#Tablet.ox!) - Math.max(this.#Ball.x!, this.#Tablet.x!);
        const overlapY = Math.min(this.#Ball.oy!, this.#Tablet.oy!) - Math.max(this.#Ball.y!, this.#Tablet.y!);

        // 原实现用位运算 `^` 做方向判断，但速度/坐标是浮点数时会被截断为 32-bit int，
        // 方向逻辑可能不可靠。这里改为基于正负号的判断，语义更稳定也更可读。
        const relX = bcx - tcx;
        const relY = bcy - tcy;
        const sameXDirection = (bvx > 0 && relX > 0) || (bvx < 0 && relX < 0);
        const sameYDirection = (bvy > 0 && relY > 0) || (bvy < 0 && relY < 0);
        if (sameXDirection && sameYDirection) {
            this.#Ball.x! += bvx * 1.5;
            this.#Ball.y! += bvy * 1.5;
            this.#Ball.vx! += Math.sign(bvx) * this.tempAccelerate("x");
            this.#Ball.vy! += Math.sign(bvy) * this.tempAccelerate("y");
        } else if (sameYDirection || (overlapX < overlapY && !sameXDirection)) {
            if (bcx < tcx) this.#Ball.ox = this.#Tablet.x!;
            else this.#Ball.x = this.#Tablet.ox!;
            this.#Ball.vx! += Math.sign(this.#Ball.vx!) * this.tempAccelerate("x");
            this.#Ball.vx! *= -1;
        } else {
            if (bcy < tcy) this.#Ball.oy = this.#Tablet.y!;
            else this.#Ball.y = this.#Tablet.oy!;
            this.#Ball.vy! += Math.sign(this.#Ball.vy!) * this.tempAccelerate("y");
            this.#Ball.vy! *= -1;
        }
        return true;
    }

    registerHit(): { combo: number; multiplier: number } {
        const now = this.#GP.frameTimeStamp;
        if (this.comboLastHit > 0 && now - this.comboLastHit <= this.comboResetWindow) {
            this.combo++;
        } else {
            this.combo = 1;
        }
        this.comboLastHit = now;
        const multiplier = Math.min(1 + (this.combo - 1) * this.comboMultiplierStep, this.comboMaxMultiplier);
        return { combo: this.combo, multiplier };
    }

    resetCombo(): void {
        this.combo = 0;
        this.comboLastHit = 0;
        evBus.emit(GEV.SCORE_HIT, { delta: 0, combo: 0, multiplier: 1 });
    }

    tempAccelerate(direction: Axis): number {
        if (direction !== "x" && direction !== "y") return 0;
        const now = this.#GP.frameTimeStamp;
        const patI = direction === "x" ? 0 : 1;
        if (this.prevAccTime[patI] !== void 0 && now - this.prevAccTime[patI] < this.accelerateCD) return 0;
        this.prevAccTime[patI] = now;
        const { RATIO_X1, RATIO_X2, RATIO_Y1, RATIO_Y2, DECAY_DELAY, DECAY_TIMES } = GameConf.Ball.ACCELERATION;
        const ratio1 = direction === "x" ? RATIO_X1 : RATIO_Y1;
        const ratio2 = direction === "x" ? RATIO_X2 : RATIO_Y2;
        const ballV = direction === "x" ? this.#Ball.vx : this.#Ball.vy;
        const tabletV = direction === "x" ? this.#Tablet.vx : this.#Tablet.vy;
        const tabletMax = direction === "x" ? this.#Tablet.vxMax : this.#Tablet.vyMax;
        const vBuffRatio = ratio1 - (Math.sign(ballV) * tabletV * ratio2) / tabletMax;
        const vBuff = abs(ballV * (vBuffRatio - 1));
        const vUnitNerf = vBuff / DECAY_TIMES;
        this.#timer.newInterval(
            () => {
                if (direction === "x") this.#Ball.vx -= Math.sign(this.#Ball.vx) * vUnitNerf;
                else this.#Ball.vy -= Math.sign(this.#Ball.vy) * vUnitNerf;
            },
            0,
            {
                delay: DECAY_DELAY * 1000,
                executeTimes: DECAY_TIMES,
            },
        );
        return vBuff;
    }

    #preciselyDetect(): boolean {
        const bx = this.#Ball.x!;
        const box = this.#Ball.ox!;
        const by = this.#Ball.y!;
        const boy = this.#Ball.oy!;
        const tx = this.#Tablet.x!;
        const tox = this.#Tablet.ox!;
        const ty = this.#Tablet.y!;
        const toy = this.#Tablet.oy!;
        if (box < tx || bx > tox || boy < ty || by > toy) return false;

        const bcx = this.#Ball.cx!;
        const bcy = this.#Ball.cy!;
        const tcx = this.#Tablet.cx!;
        const tcy = this.#Tablet.cy!;
        if ((bcx >= tx && bcx <= tox) || (bcy >= ty && bcy <= toy)) return true;

        const dx = bcx - (bcx < tcx ? tx : tox);
        const dy = bcy - (bcy < tcy ? ty : toy);
        const r = this.#Ball.w! / 2;
        return dx * dx + dy * dy <= r * r;
    }
}
