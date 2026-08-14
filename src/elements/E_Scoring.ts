import { Group, Path, Text } from "leafer-game";
import type { IAnimate } from "@leafer-ui/interface";
import { Ball, GP, leafer, timer } from "../core/instances";
import { effectsEnabled } from "../core/effects";
import { evBus, GEV } from "../events";
import { floor } from "../utils/math";
import { fastRandom } from "../utils/prng";
import { UIConf } from "../config";

export default class E_Scoring extends Group {
    confUI = UIConf.Scoring;
    Panel: Path;
    Integer: Text;
    Decimal: Text;
    Combo: Text;
    v = 0;
    currentCombo = 0;
    currentMultiplier = 1;
    /** 复用得分提示文本，避免碰撞时频繁 new/destroy 带来的 GC 抖动 */
    private readonly tipPool: Text[] = [];
    private readonly activeTips = new Set<Text>();
    private readonly tipTimeouts = new Map<Text, symbol>();
    private readonly tipAnis = new Map<Text, IAnimate[]>();
    private readonly tipPoolLimit = 24;

    constructor() {
        super({
            x: GP.bw / 2 - 120,
            y: 0,
            zIndex: 880,
        });
        this.Panel = new Path({
            path:
                "m -120 0\n" +
                "  h 10\n" +
                "  a 20 15 0 0 1 20 15\n" +
                "  v 35\n" +
                "  a 15 18 0 0 0 15 18\n" +
                "  h 150\n" +
                "  a 15 18 0 0 0 15 -18\n" +
                "  v -35\n" +
                "  a 20 15 0 0 1 20 -15\n" +
                "  h 10\n" +
                "  Z",
            x: 120,
            y: 0,
            fill: this.confUI.Panel.FILL,
        });
        this.Integer = new Text({
            x: -GP.bw,
            y: 7,
            fontSize: this.confUI.Integer.FONT_SIZE,
            fill: this.confUI.Integer.FILL,
            text: "-",
            fontFamily: this.confUI.FONT_FAMILY,
        });
        this.Decimal = new Text({
            x: -GP.bw,
            y: 15,
            fontSize: this.confUI.Decimal.FONT_SIZE,
            fill: this.confUI.Decimal.FILL,
            text: "--",
            fontFamily: this.confUI.FONT_FAMILY,
        });
        this.Combo = new Text({
            x: -GP.bw,
            y: 64,
            text: "",
            fontSize: 18,
            fill: UIConf.CollisionParticle.COLORS[0],
            fontFamily: this.confUI.FONT_FAMILY,
            around: "center",
            visible: false,
        });
        this.add([this.Panel, this.Integer, this.Decimal, this.Combo]);

        // 对象池预分配：避免首次碰撞时 new Text 产生的 GC 抖动
        this.#preallocateTips();

        this.init_ = this.init_.bind(this);
        this.#$setupEventListeners();
    }

    #preallocateTips(): void {
        const tipConf = this.confUI.tip;
        for (let i = 0; i < 4; i++) {
            const tip = new Text({
                x: 0,
                y: 0,
                around: "center",
                text: "",
                fill: tipConf.FILL,
                stroke: tipConf.STROKE,
                fontSize: tipConf.FONT_SIZE,
                fontFamily: this.confUI.FONT_FAMILY,
                opacity: tipConf.OPACITY,
                shadow: {
                    x: 1,
                    y: 1,
                    blur: 10,
                    color: tipConf.SHADOW_COLOR,
                },
                visible: false,
            });
            tip.render_();
            this.tipPool.push(tip);
        }
    }

    #$setupEventListeners(): void {
        evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
        evBus.on(GEV.RESIZE, (payload) => this.relocate_(payload.data));
        evBus.on(GEV.GAME_RESET, this.reset_.bind(this));
        // 使用合并事件 SCORE_HIT，一次分发同时处理得分更新 + combo 显示
        evBus.on(GEV.SCORE_HIT, (payload) => {
            const deltaStr = this.delta_(payload.delta);
            this.tip_(deltaStr);
            this.updateCombo_(payload.combo, payload.multiplier);
        });
    }

    updateCombo_(combo: number, multiplier: number): void {
        this.currentCombo = combo;
        this.currentMultiplier = multiplier;
        if (combo >= 2) {
            this.Combo.text = `${combo}x (x${multiplier.toFixed(2)})`;
            this.Combo.visible = true;
            this.Combo.cx = 120;
            if (effectsEnabled) {
                this.Combo.opacity = 1;
                this.Combo.scaleX = this.Combo.scaleY = 0.6;
                this.Combo.animate([{ style: { scaleX: 1, scaleY: 1 } }], {
                    duration: 0.15,
                    easing: "back-out",
                    join: true,
                });
            }
        } else {
            this.Combo.visible = false;
        }
    }

    reset_(): void {
        this.assign_(0);
        this.Combo.visible = false;
        this.currentCombo = 0;
        this.currentMultiplier = 1;
    }

    relocate_(e: IResizeLike): void {
        // 用显式 x 定位而非 cx：本 Group 的 width 会被初始位于屏幕外的
        // Integer/Decimal/Combo 文本撑大，依赖 cx 会导致 resize 时整体漂移。
        // Panel 中心在 Group 局部坐标 x=Panel.x（=120），保持其处于屏幕水平中心。
        this.x = e.width / 2 - this.Panel.x!;
        this.#newScore_();
    }

    async init_(): Promise<void> {
        await this.#loadFont_();
    }

    async #loadFont_(): Promise<void> {
        // `public/*` 在 Vite 下会直接映射到站点根路径（如 `/fonts/...`）。
        const fontURL = "/fonts/HYDiSiKe-U.woff2";
        await GP.fontInitializer("HYDiSiKe-U", fontURL);
        this.#newScore_();
    }

    assign_(score: number): string {
        this.v = Math.round(score * 10);
        this.#newScore_();
        return E_Scoring.stringify_(this.v);
    }

    delta_(x: number): string {
        const prevV = this.v;
        this.v += Math.round(x * 10);
        this.#newScore_();
        return E_Scoring.stringify_(this.v - prevV);
    }

    tip_(delta: string): void {
        if (!effectsEnabled) return;
        const tipConf = this.confUI.tip;
        const aniConf = tipConf.ANIMATION;
        const [initialOffsetX, transitionX, transitionY] = this.#getTipData_();
        const tip = this.#acquireTip_();

        this.#killTipAnimations_(tip);
        this.#resetTipState_(tip, {
            x: Ball.cx + initialOffsetX,
            y: Ball.oy,
            text: "+" + delta,
            initialOpacity: tipConf.OPACITY,
            initialFontSize: aniConf.FONT_SIZE1,
        });
        tip.visible = true;

        const aniStyle = tip.animate(
            [
                {
                    style: { opacity: tipConf.OPACITY, fontSize: aniConf.FONT_SIZE1 },
                    duration: aniConf.STYLE_DURATION1,
                },
                {
                    style: { opacity: 0, fontSize: aniConf.FONT_SIZE2 },
                    duration: aniConf.STYLE_DURATION2,
                },
            ],
            { join: true },
        );
        const aniX = tip.animate([{ offsetX: 0 }, { offsetX: transitionX }], {
            duration: aniConf.X_DURATION,
            easing: "sine-out",
            join: true,
        });
        const aniY = tip.animate(
            [
                {
                    style: { offsetY: aniConf.Y_OFFSET1 },
                    duration: aniConf.Y_DURATION1,
                    easing: "quad-out",
                },
                {
                    style: { offsetY: transitionY },
                    duration: aniConf.Y_DURATION2,
                    easing: "quad-in-out",
                },
            ],
            { join: true },
        );

        this.tipAnis.set(tip, [aniStyle, aniX, aniY]);

        const to = timer.newTimeout(() => this.#releaseTip_(tip), tipConf.DURATION * 1000);
        this.tipTimeouts.set(tip, to);
    }

    #acquireTip_(): Text {
        const fromPool = this.tipPool.pop();
        if (fromPool) {
            this.activeTips.add(fromPool);
            return fromPool;
        }
        if (this.activeTips.size >= this.tipPoolLimit) {
            const reuse = this.activeTips.values().next().value as Text | undefined;
            if (reuse) return reuse;
        }

        const tipConf = this.confUI.tip;
        const tip = new Text({
            x: 0,
            y: 0,
            around: "center",
            text: "",
            fill: tipConf.FILL,
            stroke: tipConf.STROKE,
            fontSize: tipConf.FONT_SIZE,
            fontFamily: this.confUI.FONT_FAMILY,
            opacity: tipConf.OPACITY,
            shadow: {
                x: 1,
                y: 1,
                blur: 10,
                color: tipConf.SHADOW_COLOR,
            },
            visible: false,
        });
        tip.render_();
        this.activeTips.add(tip);
        return tip;
    }

    #resetTipState_(
        tip: Text,
        {
            x,
            y,
            text,
            initialOpacity,
            initialFontSize,
        }: {
            x: number;
            y: number;
            text: string;
            initialOpacity: number;
            initialFontSize: number;
        },
    ): void {
        tip.x = x;
        tip.y = y;
        tip.text = text;
        tip.opacity = initialOpacity;
        tip.fontSize = initialFontSize;

        // Leafer 的 translate 使用 `offsetX/offsetY`，这里强制把起点归零，避免复用时从上次动画终点开始。
        tip.offsetX = 0;
        tip.offsetY = 0;
    }

    #killTipAnimations_(tip: Text): void {
        const anis = this.tipAnis.get(tip);
        if (anis) {
            for (const ani of anis) leafer.killAnimate(ani);
        }
        this.tipAnis.delete(tip);

        const to = this.tipTimeouts.get(tip);
        if (to) {
            timer.cancelTimeout(to);
            this.tipTimeouts.delete(tip);
        }
    }

    #releaseTip_(tip: Text): void {
        this.tipTimeouts.delete(tip);
        this.#killTipAnimations_(tip);

        tip.visible = false;
        tip.text = "";

        if (this.tipPool.length < this.tipPoolLimit) {
            this.activeTips.delete(tip);
            this.tipPool.push(tip);
        } else {
            this.activeTips.delete(tip);
            tip.destroy();
        }
    }

    #getTipData_(): [number, number, number] {
        const act = GP.ENV.actUnitInterval;
        const actN = typeof act === "string" ? parseFloat(act) : act;
        const ballSpeedAffect = (0.7 * Ball.vx * 600) / actN;
        const direction = fastRandom() >= 0.5 ? 1 : -1;
        let initialOffsetX = (10 + fastRandom() * 20) * direction;
        let transitionX0 = (40 + fastRandom() * 20) * direction;
        const transitionY = (fastRandom() - 0.4) * 24;
        const totalTranslationX = initialOffsetX + transitionX0 + ballSpeedAffect;
        if (Ball.cx + totalTranslationX <= GP.ENV.paddingSide) {
            initialOffsetX *= -1;
            transitionX0 *= -1;
        } else if (Ball.cx + totalTranslationX >= GP.bw - GP.ENV.paddingSide) {
            initialOffsetX *= -1;
            transitionX0 *= -1;
        }
        return [initialOffsetX + ballSpeedAffect / 2, transitionX0 + ballSpeedAffect / 2, transitionY];
    }

    #newScore_(): void {
        this.Integer.text = String(floor(this.v / 10));
        this.Decimal.text = "." + (this.v % 10);
        this.Integer.x = (240 - this.Integer.w - this.Decimal.w) / 2;
        this.Decimal.x = this.Integer.ox;
    }

    static stringify_(v: number): string {
        return `${floor(v / 10)}.${v % 10}`;
    }
}

/** Minimal shape used by {@link E_Scoring.relocate_} (resize width vs old width). */
interface IResizeLike {
    width: number;
    old: { width: number };
}
