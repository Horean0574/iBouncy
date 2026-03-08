import { Ellipse } from "leafer-game";
import X_BallTrailing from "../elements_extensions/X_BallTrailing";
import { evBus, GEV, GI, GP, leafer, Timing } from "../core/instances";
import { GameConf, UIConf, getDifficulty } from "../config";

export default class E_Ball extends Ellipse {
    confUI = UIConf.Ball;
    confGm = GameConf.Ball;
    vx;
    ax;
    ay;
    timeDivisor = 1;

    constructor() {
        super({
            width: UIConf.Ball.RADIUS * 2,
            height: UIConf.Ball.RADIUS * 2,
            fill: UIConf.Ball.FILL,
        });
        this.trailing = new X_BallTrailing();
        this.#$setupEventListeners();
        this.reset_();
    }

    #$setupEventListeners() {
        evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
        evBus.on(GEV.GAME_RESET, this.reset_.bind(this));
        evBus.on(GEV.GAME_START, this.reset_.bind(this));
    }

    reset_() {
        const { VX_MAX, VX_MIN, VY, AX, AY } = this.confGm;
        const scale = getDifficulty().ballSpeedScale;
        this.vx = (Math.random() * (VX_MAX - VX_MIN) + VX_MIN) * (Math.random() > 0.5 ? 1 : -1) * scale;
        this.vy = VY * scale;
        this.ax = AX * scale;
        this.ay = AY * scale;
        this.cx = GP.bw * this.confUI.X_RATIO;
        this.cy = GP.bh * this.confUI.Y_RATIO;
    }

    render_() {
        this.trailing.render();
        leafer.add(this);
    }

    prepare_() {
        this.trailing.prepare();
    }

    frameLoop_(prog) {
        if (Timing.remaining > this.confGm.ACCELERATION.TO && Timing.remaining <= this.confGm.ACCELERATION.FROM) {
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

    /** 每帧调用一次，避免在物理子步中重复更新视觉 */
    updateVisual_() {
        const speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
        const baseSpeed = this.confGm.VY;
        const maxSpeed = this.confGm.VY * 3;
        const t = Math.max(0, Math.min((speed - baseSpeed) / (maxSpeed - baseSpeed || 1), 1));
        const ui = this.confUI;
        const scale = 1 + t * (ui.GLOW_MAX_SCALE - 1);
        const blur = ui.GLOW_MIN_BLUR + (ui.GLOW_MAX_BLUR - ui.GLOW_MIN_BLUR) * t;
        if (this.scaleX !== scale) this.scaleX = this.scaleY = scale;
        if (this.shadow?.blur !== blur || this.shadow?.color !== ui.FILL) {
            this.shadow = {
                x: 0,
                y: 0,
                blur,
                color: ui.FILL,
            };
        }
    }
}
