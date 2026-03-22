import { Ball, D, GP, Tablet, timer } from "./instances";
import { GameConf } from "../config";

export default class Interaction {
  collisionStat = 0;
  accelerateCD = GameConf.Ball.ACCELERATION.COOLDOWN * 1000;
  prevAccTime: [number, number] = [0, 0];

  boundaryDetect(
    ge: any,
    {
      bounce = false,
      paddings = [0, 0, 0, 0],
      callbacks = [null, null, null, null]
    }: {
      bounce?: boolean;
      paddings?: [number, number, number, number];
      callbacks?: Array<null | (() => unknown)>;
    } = {}
  ) {
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
    if (!this.preciselyDetect()) {
      this.collisionStat = 0;
      return false;
    }
    if (this.collisionStat) return false;
    this.collisionStat = 1;
    const overlapX = Math.min(Ball.ox, Tablet.ox) - Math.max(Ball.x, Tablet.x);
    const overlapY = Math.min(Ball.oy, Tablet.oy) - Math.max(Ball.y, Tablet.y);
    const sameXDirection = (Ball.vx ^ (Ball.cx - Tablet.cx)) > 0;
    const sameYDirection = (Ball.vy ^ (Ball.cy - Tablet.cy)) > 0;
    if (sameXDirection && sameYDirection) {
      Ball.x += Ball.vx * 1.5;
      Ball.y += Ball.vy * 1.5;
      Ball.vx += Math.sign(Ball.vx) * this.tempAccelerate("x");
      Ball.vy += Math.sign(Ball.vy) * this.tempAccelerate("y");
    } else if (sameYDirection || (overlapX < overlapY && !sameXDirection)) {
      if (Ball.cx < Tablet.cx) Ball.ox = Tablet.x;
      else Ball.x = Tablet.ox;
      Ball.vx += Math.sign(Ball.vx) * this.tempAccelerate("x");
      Ball.vx *= -1;
    } else {
      if (Ball.cy < Tablet.cy) Ball.oy = Tablet.y;
      else Ball.y = Tablet.oy;
      Ball.vy += Math.sign(Ball.vy) * this.tempAccelerate("y");
      Ball.vy *= -1;
    }
    return true;
  }

  tempAccelerate(direction: "x" | "y") {
    const now = performance.now();
    const patI = direction === "x" ? 0 : 1;
    if (this.prevAccTime[patI] !== void 0 && now - this.prevAccTime[patI] < this.accelerateCD) return 0;
    this.prevAccTime[patI] = now;
    const { RATIO_X1, RATIO_X2, RATIO_Y1, RATIO_Y2, DECAY_DELAY, DECAY_TIMES } = GameConf.Ball.ACCELERATION;
    const vName = "v" + direction as "vx" | "vy";
    const ratio1 = direction === "x" ? RATIO_X1 : RATIO_Y1;
    const ratio2 = direction === "x" ? RATIO_X2 : RATIO_Y2;
    const vBuffRatio = ratio1 - (Math.sign(Ball[vName]) * Tablet[vName] * ratio2) / Tablet[`${vName}Max`];
    const vBuff = D(Ball[vName] * (vBuffRatio - 1));
    const vUnitNerf = vBuff / DECAY_TIMES;
    timer.newInterval(() => {
      Ball[vName] -= Math.sign(Ball[vName]) * vUnitNerf;
    }, 0, {
      delay: DECAY_DELAY * 1000,
      executeTimes: DECAY_TIMES
    });
    return vBuff;
  }

  private preciselyDetect() {
    if (Ball.ox < Tablet.x || Ball.x > Tablet.ox || Ball.oy < Tablet.y || Ball.y > Tablet.oy) return false;
    if (
      (Ball.cx >= Tablet.x && Ball.cx <= Tablet.ox) ||
      (Ball.cy >= Tablet.y && Ball.cy <= Tablet.oy)
    )
      return true;
    const dx = Ball.cx - (Ball.cx < Tablet.cx ? Tablet.x : Tablet.ox);
    const dy = Ball.cy - (Ball.cy < Tablet.cy ? Tablet.y : Tablet.oy);
    return dx * dx + dy * dy <= (Ball.w * Ball.w) / 4;
  }
}

