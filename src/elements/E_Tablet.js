import { Rect, Keyboard } from "leafer-game";
import { GI, GP, Tablet } from "../core/instances";

export default class E_Tablet extends Rect {
    vxMax;
    vyMax;
    vx;
    vy;
    availZone = [80, 40, 0, 40]; // Top, Right, Bottom, Left

    constructor() {
        super({
            width: 120, // 120
            height: 25,
            fill: "#32CD79",
        });
    }

    reset_() {
        this.vxMax = 6;
        this.vyMax = 2.8;
        this.vx = 0;
        this.vy = 0;
        this.cx = GP.bw / 2;
        this.y = GP.bh - 140;
    }

    frameLoop(prog) {
        this.vx = this.vy = 0;
        if (Keyboard.isHold("KeyW") || Keyboard.isHold("ArrowUp")) {
            this.vy -= this.vyMax * prog;
        }
        if (Keyboard.isHold("KeyS") || Keyboard.isHold("ArrowDown")) {
            this.vy += this.vyMax * prog;
        }
        if (Keyboard.isHold("KeyA") || Keyboard.isHold("ArrowLeft")) {
            this.vx -= this.vxMax * prog;
        }
        if (Keyboard.isHold("KeyD") || Keyboard.isHold("ArrowRight")) {
            this.vx += this.vxMax * prog;
        }
        this.x += this.vx;
        this.y += this.vy;
        GI.borderDetect(Tablet, {
            paddings: this.availZone,
        });
    }
}
