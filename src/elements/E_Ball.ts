import { Ellipse } from "leafer-game";
import X_BallTrailing from "../elements_extensions/X_BallTrailing";
import type { BoundsEntity, BoundaryCallbacks } from "../core/interaction";
import { effectsEnabled } from "../core/effects";
import { evBus, GEV } from "../events";
import { GI, GP, leafer, Timing } from "../core/instances";
import { GameConf, UIConf } from "../config";

export default class E_Ball extends Ellipse {
    confUI = UIConf.Ball;
    confGm = GameConf.Ball;
    trailing?: X_BallTrailing;
    vx!: number;
    vy!: number;
    ax!: number;
    ay!: number;
    timeDivisor = 1;

    /** 复用元组与选项对象，避免每子步在 `boundaryDetect` 中分配数组 / `bind` */
    private readonly ballBoundaryPaddings: [number, number, number, number] = [0, 0, 0, 0];
    private readonly boundaryCallbacks: BoundaryCallbacks;
    private readonly ballBoundaryOpts: {
        bounce: boolean;
        paddings: [number, number, number, number];
        callbacks: BoundaryCallbacks;
    };
    /** 缓存球下方的负 padding（= -h * 3），球是圆形，宽高恒定，无需每子步重算。 */
    private readonly ballBottomPadding: number;

    constructor() {
        super({
            width: UIConf.Ball.RADIUS * 2,
            height: UIConf.Ball.RADIUS * 2,
            fill: UIConf.Ball.FILL,
        });
        this.ballBottomPadding = -this.h * 3;
        this.boundaryCallbacks = [null, null, () => evBus.emit(GEV.GAME_BALL_LOST), null];
        this.ballBoundaryOpts = {
            bounce: true,
            paddings: this.ballBoundaryPaddings,
            callbacks: this.boundaryCallbacks,
        };
        this.#$setupEventListeners();
        this.reset_();
    }

    #$setupEventListeners(): void {
        evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
        evBus.on(GEV.GAME_RESET, this.reset_.bind(this));
        evBus.on(GEV.GAME_START, () => this.setVisible(true));
        evBus.on(GEV.GAME_RESTART, () => this.setVisible(true));
        evBus.on(GEV.GAME_OVER, () => this.setVisible(false));
    }

    reset_(): void {
        const { VX_MAX, VX_MIN, VY, AX, AY } = this.confGm;
        this.vx = (Math.random() * (VX_MAX - VX_MIN) + VX_MIN) * (Math.random() > 0.5 ? 1 : -1);
        this.vy = VY;
        this.ax = AX;
        this.ay = AY;
        this.cx = GP.bw * this.confUI.X_RATIO;
        this.cy = GP.bh * this.confUI.Y_RATIO;
    }

    render_(): void {
        this.trailing?.render();
        leafer.add(this);
        // 游戏开始前（首页/结算界面）不显示弹球，开始游玩时才可见。
        this.setVisible(false);
    }

    setVisible(visible: boolean): void {
        this.visible = visible;
    }

    prepare_(): void {
        if (!this.trailing) {
            this.trailing = new X_BallTrailing();
            // render_() 在 UI_RENDER_ELSE 阶段执行时 trailing 尚未创建，
            // 此处补充将拖尾点加入 Leafer 渲染树，否则拖尾永远不会显示。
            this.trailing.render();
        }
        this.trailing.prepare();
    }

    frameLoop_(prog: number): void {
        if (Timing.remaining > this.confGm.ACCELERATION.TO && Timing.remaining <= this.confGm.ACCELERATION.FROM) {
            this.vx += Math.sign(this.vx) * this.ax * prog;
            this.vy += Math.sign(this.vy) * this.ay * prog;
        }
        this.x! += this.vx * prog;
        this.y! += this.vy * prog;
        this.ballBoundaryPaddings[2] = this.ballBottomPadding;
        GI.boundaryDetect(this as BoundsEntity, this.ballBoundaryOpts);
        // 卡顿时关闭视觉拖尾，保障核心物理计算更稳定。
        if (effectsEnabled) this.trailing?.frameLoop(this.timeDivisor);
    }
}
