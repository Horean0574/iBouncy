import { Rect, Keyboard } from "leafer-game";
import { evBus, GEV, GI, GP, Tablet, timer } from "../core/instances";
import { GameConf, UIConf, getDifficulty } from "../config";

export default class E_Tablet extends Rect {
    confUI = UIConf.Tablet;
    confGm = GameConf.Tablet;
    vxMax;
    vyMax;
    vx;
    vy;
    availZone = [80, 40, 0, 40]; // Top, Right, Bottom, Left

    constructor() {
        super({
            width: UIConf.Tablet.WIDTH,
            height: UIConf.Tablet.HEIGHT,
            fill: UIConf.Tablet.FILL,
        });
        this.baseWidth = UIConf.Tablet.WIDTH;
        this.baseHeight = UIConf.Tablet.HEIGHT;
        this.#$setupEventListeners();
        this.reset_();
    }

    #$setupEventListeners() {
        evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
        evBus.on(GEV.GAME_RESET, this.reset_.bind(this));
        evBus.on(GEV.GAME_START, this.reset_.bind(this));
    }

    reset_() {
        const scale = getDifficulty().tabletWidthScale;
        this.width = Math.round(this.baseWidth * scale);
        this.height = this.baseHeight;
        this.vxMax = this.confGm.VX;
        this.vyMax = this.confGm.VY;
        this.vx = 0;
        this.vy = 0;
        this.cx = GP.bw * this.confUI.X_RATIO;
        this.y = GP.bh * this.confUI.Y_RATIO + this.confUI.Y_OFFSET;
    }

    hitEffect_() {
        const ui = this.confUI;
        const scaleX = ui.HIT_SCALE_X ?? 1.05;
        const scaleY = ui.HIT_SCALE_Y ?? 1.03;
        this.animate(
            [
                { scaleX, scaleY },
                { scaleX: 1, scaleY: 1 },
            ],
            {
                duration: 0.18,
                easing: "quad-out",
                join: true,
            },
        );
        this.shadow = {
            x: 0,
            y: 0,
            blur: ui.HIT_SHADOW_BLUR ?? 22,
            color: ui.HIT_SHADOW_COLOR ?? this.fill,
        };
        timer.newTimeout(() => {
            this.shadow = null;
        }, 140);
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
        GI.boundaryDetect(Tablet, {
            paddings: this.availZone,
        });
    }
}
