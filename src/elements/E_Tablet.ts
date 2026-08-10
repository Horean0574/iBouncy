import { Rect, Keyboard } from "leafer-game";
import type { BoundsEntity } from "../core/interaction";
import { evBus, GEV } from "../events";
import { GI, GP } from "../core/instances";
import { GameConf, UIConf } from "../config";
import { touchCtrl } from "../utils/TouchController";
import { mobileAdapter } from "../utils/MobileAdapter";

export default class E_Tablet extends Rect {
    confUI = UIConf.Tablet;
    confGm = GameConf.Tablet;
    vxMax!: number;
    vyMax!: number;
    vx!: number;
    vy!: number;
    /** Top, Right, Bottom, Left；小屏上侧边 padding 收窄，让挡板能覆盖更靠边的球 */
    availZone: [number, number, number, number] = [80, 40, 0, 40];

    /** 复用 `{ paddings }`，避免每子步分配新对象 */
    private readonly tabletBoundaryOpts: { paddings: [number, number, number, number] };

    // 键盘状态每帧缓存，避免子步循环内重复调用 Keyboard.isHold
    private kbState = { w: false, a: false, s: false, d: false };
    private kbCacheFrame = -1;

    // 键盘活动标记
    private keyboardActive = false;

    /** 移动端挡板速度加成：弥补摇杆模拟量输入下挡板需比球更快的追赶能力 */
    private readonly mobileBoost: number;

    constructor() {
        super({
            width: UIConf.Tablet.WIDTH,
            height: UIConf.Tablet.HEIGHT,
            fill: UIConf.Tablet.FILL,
        });
        // 移动端视口窄，40px 侧边死区占屏宽比例过大，收窄到 12px 提升边缘接球能力；
        // 同时提速挡板（约 1.25x），保证摇杆半推时也能追上弹球，避免"挡板没反应导致掉球"。
        if (mobileAdapter.getDeviceType() === "mobile") {
            this.availZone = [60, 12, 0, 12];
            this.mobileBoost = 1.25;
        } else {
            this.mobileBoost = 1;
        }
        this.tabletBoundaryOpts = { paddings: this.availZone };
        this.#$setupKeyboardDetection();
        this.#$setupEventListeners();
        this.reset_();
    }

    /**
     * 设置键盘活动检测
     */
    #$setupKeyboardDetection(): void {
        const markKeyboardActive = () => {
            this.keyboardActive = true;
        };

        // 首次键盘活动时标记
        window.addEventListener("keydown", markKeyboardActive, { once: true, capture: true });
    }

    #$setupEventListeners(): void {
        evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
        evBus.on(GEV.GAME_RESET, this.reset_.bind(this));
        evBus.on(GEV.GAME_START, () => this.setVisible(true));
        evBus.on(GEV.GAME_RESTART, () => this.setVisible(true));
        evBus.on(GEV.GAME_OVER, () => this.setVisible(false));
    }

    reset_(): void {
        this.vxMax = this.confGm.VX * this.mobileBoost;
        this.vyMax = this.confGm.VY * this.mobileBoost;
        this.vx = 0;
        this.vy = 0;
        this.cx = GP.bw * this.confUI.X_RATIO;
        this.y = GP.bh * this.confUI.Y_RATIO + this.confUI.Y_OFFSET;
        // 游戏开始前（首页/结算界面）不显示挡板，开始游玩时才可见。
        this.setVisible(false);
    }

    setVisible(visible: boolean): void {
        this.visible = visible;
    }

    frameLoop(prog: number): void {
        this.vx = this.vy = 0;

        // 每帧只读取一次键盘状态（使用 GP.frameCount 做脏标记）
        if (GP.frameCount !== this.kbCacheFrame) {
            this.kbCacheFrame = GP.frameCount;
            this.kbState.w = Keyboard.isHold("KeyW") || Keyboard.isHold("ArrowUp");
            this.kbState.s = Keyboard.isHold("KeyS") || Keyboard.isHold("ArrowDown");
            this.kbState.a = Keyboard.isHold("KeyA") || Keyboard.isHold("ArrowLeft");
            this.kbState.d = Keyboard.isHold("KeyD") || Keyboard.isHold("ArrowRight");
        }

        // 触摸优先：有触摸活动时使用触摸方向，否则用键盘（仅当检测到键盘活动时）
        if (touchCtrl.active) {
            this.vx += touchCtrl.dx * this.vxMax * prog;
            this.vy += touchCtrl.dy * this.vyMax * prog;
        } else if (this.keyboardActive) {
            if (this.kbState.w) this.vy -= this.vyMax * prog;
            if (this.kbState.s) this.vy += this.vyMax * prog;
            if (this.kbState.a) this.vx -= this.vxMax * prog;
            if (this.kbState.d) this.vx += this.vxMax * prog;
        }

        this.x! += this.vx;
        this.y! += this.vy;
        GI.boundaryDetect(this as BoundsEntity, this.tabletBoundaryOpts);
    }
}
