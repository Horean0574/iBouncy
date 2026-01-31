import { Ellipse } from "leafer-game";
import X_BallTrailing from "../elements_extensions/X_BallTrailing";
import { GI, GP, leafer, Timing } from "../core/instances";

export default class E_Ball extends Ellipse {
    vx;
    ax;
    ay;
    timeDivisor = 1;

    constructor() {
        super({
            width: 20,
            height: 20,
            fill: "#20A8D7",
        });
        this.trailing = new X_BallTrailing();
    }

    reset_() {
        this.vx = (Math.random() * 1.9 + 1.6) * (Math.random() > 0.5 ? 1 : -1);
        this.vy = 3.5;
        this.ax = 4.2e-4;
        this.ay = 8.2e-4;
        this.cx = GP.bw / 2;
        this.cy = GP.bh / 4;
    }

    render_() {
        this.trailing.render();
        leafer.add(this);
    }

    prepare_() {
        this.trailing.prepare();
    }

    frameLoop_(prog) {
        if (Timing.remaining > 15 && Timing.remaining <= 105) {
            this.vx += Math.sign(this.vx) * this.ax * prog;
            this.vy += Math.sign(this.vy) * this.ay * prog;
        }
        this.x += this.vx * prog;
        this.y += this.vy * prog;
        GI.boundaryDetect(this, {
            bounce: true,
            paddings: [0, 0, -this.h * 3, 0],
            callbacks: [null, null, GP.gameOver/*null*/, null],
        });
        this.trailing.frameLoop(this.timeDivisor);
    }
}
