class GameInteraction {
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
        if (!this.#AABBDetect()) {
            this.collisionStat = 0;
            return false;
        }
        if (this.collisionStat) return false;
        let initialJudged = false;
        if (Ball.cx >= Tablet.x && Ball.cx <= Tablet.ox) {
            this.collisionStat = 1;
            initialJudged = true;
            Ball.vy *= -this.tempAccelerate("y");
            if (D(Ball.cy - Tablet.y) <= D(Ball.cy - Tablet.oy)) {
                Ball.oy = Tablet.y;
            } else {
                Ball.y = Tablet.oy;
            }
        }
        if (Ball.cy >= Tablet.y && Ball.cy <= Tablet.oy) {
            this.collisionStat = 1;
            initialJudged = true;
            Ball.vx *= -this.tempAccelerate("x");
            if (D(Ball.cx - Tablet.x) <= D(Ball.cx - Tablet.ox)) {
                Ball.ox = Tablet.x;
            } else {
                Ball.x = Tablet.ox;
            }
        }
        if (initialJudged) return true;
        return this.handleCornerCollisions();
    }

    handleCornerCollisions() {
        if (Ball.cx < Tablet.x && Ball.cy < Tablet.y) {
            return this.cornerCollision(false, false);
        } else if (Ball.cx > Tablet.ox && Ball.cy < Tablet.y) {
            return this.cornerCollision(true, false);
        } else if (Ball.cx > Tablet.ox && Ball.cy > Tablet.oy) {
            return this.cornerCollision(true, true);
        } else if (Ball.cx < Tablet.x && Ball.cy > Tablet.oy) {
            return this.cornerCollision(false, true);
        }
        return false;
    }

    /**
     * Collision handler for one corner.
     * @param {boolean} cnxFlag - flag of corner name of abscissa
     * @param {boolean} cnyFlag - flag of corner name of ordinate
     * @returns {boolean}
     */
    cornerCollision(cnxFlag, cnyFlag) {
        const [cnx, cnxR] = cnxFlag ? ["ox", "x"] : ["x", "ox"]; // R means reverse
        const [cny, cnyR] = cnyFlag ? ["oy", "y"] : ["y", "oy"];
        const radius = Ball.w / 2;
        const deltaX = Ball.cx - Tablet[cnx];
        const deltaY = Ball.cy - Tablet[cny];
        if (deltaX ** 2 + deltaY ** 2 <= radius ** 2) {
            this.collisionStat = 1;
            if (D(deltaY) >= D(deltaX)) {
                Ball[cnyR] = Tablet[cny];
                Ball.vy *= -this.tempAccelerate("y");
            } else {
                Ball[cnxR] = Tablet[cnx];
                Ball.vx *= -this.tempAccelerate("x");
            }
            return true;
        }
        return false;
    }

    tempAccelerate(direction) {
        if (direction !== "x" && direction !== "y") return 0;
        const now = performance.now();
        if (this.prevAccelerateTime === void 0) {
            this.prevAccelerateTime = now;
        } else {
            if (now - this.prevAccelerateTime < this.accelerateCD) return 1;
            this.prevAccelerateTime = now;
        }
        const vName = "v" + direction;
        const ratio1 = direction === "x" ? 1.5 : 1.2;
        const ratio2 = direction === "x" ? 0.6 : 0.25;
        const vBuff = ratio1 - Math.sign(Ball[vName]) * Tablet[vName] * ratio2 / Tablet[vName + "Max"];
        const vUnitNerf = Math.pow(vBuff, 1 / 6);
        timer.newInterval(function () {
            Ball[vName] /= vUnitNerf;
        }, 16.7, {
            delay: 200,
            executeTimes: 6,
        });
        return vBuff;
    }

    #AABBDetect() {
        return !(Ball.ox < Tablet.x || Ball.x > Tablet.ox || Ball.oy < Tablet.y || Ball.y > Tablet.oy);
    }
}
