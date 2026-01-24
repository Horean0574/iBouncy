import { Ball, GP, Tablet, timer } from "./instances";

export default class Interaction {
    collisionStat = 0;
    accelerateCD = 50;
    prevAccelerateTime;

    borderDetect(ge, {
        bounce = false,
        paddings = [0, 0, 0, 0], // Top, Right, Bottom, Left
        callbacks = [null, null, null, null],
    } = {}) {
        const bounceRatio = bounce ? -1 : 0;
        if (ge.x < paddings[3]) {
            if (callbacks[3]?.() === void 0) {
                ge.x = paddings[3];
                ge.vx *= bounceRatio;
            }
        } else if (ge.ox > GP.bw - paddings[1]) {
            if (callbacks[1]?.() === void 0) {
                ge.ox = GP.bw - paddings[1];
                ge.vx *= bounceRatio;
            }
        }
        if (ge.y < paddings[0]) {
            if (callbacks[0]?.() === void 0) {
                ge.y = paddings[0];
                ge.vy *= bounceRatio;
            }
        } else if (ge.oy > GP.bh - paddings[2]) {
            if (callbacks[2]?.() === void 0) {
                ge.oy = GP.bh - paddings[2];
                ge.vy *= bounceRatio;
            }
        }
    }

    collisionDetect() {
        if (!this.#preciselyDetect()) {
            this.collisionStat = 0;
            return false;
        }
        if (this.collisionStat) return false;
        this.collisionStat = 1;
        const overlapX = Math.min(Ball.ox, Tablet.ox) - Math.max(Ball.x, Tablet.x);
        const overlapY = Math.min(Ball.oy, Tablet.oy) - Math.max(Ball.y, Tablet.y);
        const sameXDirection = (Ball.vx ^ Ball.cx - Tablet.cx) > 0;
        const sameYDirection = (Ball.vy ^ Ball.cy - Tablet.cy) > 0;
        if (sameXDirection && sameYDirection) {
            Ball.x += Ball.vx * 1.5;
            Ball.y += Ball.vy * 1.5;
            Ball.vx *= this.tempAccelerate("x");
            Ball.vy *= this.tempAccelerate("y");
        } else if (sameYDirection || (overlapX < overlapY && !sameXDirection)) {
            if (Ball.cx < Tablet.cx) Ball.ox = Tablet.x;
            else Ball.x = Tablet.ox;
            Ball.vx *= -this.tempAccelerate("x");
        } else {
            if (Ball.cy < Tablet.cy) Ball.oy = Tablet.y;
            else Ball.y = Tablet.oy;
            Ball.vy *= -this.tempAccelerate("y");
        }
        return true;
    }

    tempAccelerate(direction) {
        if (direction !== "x" && direction !== "y") return 0;
        const now = performance.now();
        if (this.prevAccelerateTime !== void 0 && now - this.prevAccelerateTime < this.accelerateCD) return 1;
        this.prevAccelerateTime = now;
        const vName = "v" + direction;
        const ratio1 = direction === "x" ? 1.5 : 1.2;
        const ratio2 = direction === "x" ? 0.6 : 0.25;
        const vBuff = ratio1 - Math.sign(Ball[vName]) * Tablet[vName] * ratio2 / Tablet[vName + "Max"];
        const vUnitNerf = vBuff ** (1 / 6);
        timer.newInterval(() => {
            Ball[vName] /= vUnitNerf;
        }, 16.7, {
            delay: 200,
            executeTimes: 6,
        });
        return vBuff;
    }

    #preciselyDetect() {
        if (Ball.ox < Tablet.x || Ball.x > Tablet.ox || Ball.oy < Tablet.y || Ball.y > Tablet.oy) return false;
        if ((Ball.cx >= Tablet.x && Ball.cx <= Tablet.ox) || (Ball.cy >= Tablet.y && Ball.cy <= Tablet.oy)) return true;
        const dx = Ball.cx - (Ball.cx < Tablet.cx ? Tablet.x : Tablet.ox);
        const dy = Ball.cy - (Ball.cy < Tablet.cy ? Tablet.y : Tablet.oy);
        return dx * dx + dy * dy <= Ball.w * Ball.w / 4;
    }
}
