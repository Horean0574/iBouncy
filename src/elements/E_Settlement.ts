import { AnimateEvent, Group, Text } from "leafer-game";
import { evBus, GEV } from "../events";
import { GP } from "../core/instances";
import TextLine from "../utils/TextLine";
import { UIConf } from "../config";
import { t } from "../i18n";

export default class E_Settlement extends Group {
    confUI = UIConf.Settlement;
    Title: Text;
    Hint1: TextLine;
    Hint2: TextLine;
    Hint3: TextLine;

    constructor() {
        super({
            x: 0,
            y: 0,
            width: GP.bw,
            height: GP.bh,
            visible: false,
            zIndex: 991,
        });

        this.Title = new Text({
            x: GP.bw * this.confUI.X_RATIO,
            y: GP.bh * this.confUI.Title.Y_RATIO,
            around: "center",
            text: "",
            fontSize: this.confUI.Title.FONT_SIZE,
            fontFamily: this.confUI.Title.FONT_FAMILY,
            scale: this.confUI.Title.SCALE,
            opacity: 0,
        });
        this.Hint1 = new TextLine(
            GP.bw * this.confUI.X_RATIO,
            GP.bh * this.confUI.Hint1.Y_RATIO + this.confUI.Hint1.Y_OFFSET,
            "center",
            this.confUI.Hint1.FILL,
            this.confUI.Hint1.FONT_SIZE,
        )
            .$append(t("settlement.restart"))
            .$append(t("settlement.restartKey"), 3, void 0, void 0, "bold")
            .$append(t("settlement.restartGame"));
        this.Hint1.opacity = 0;
        this.Hint2 = new TextLine(
            GP.bw * this.confUI.X_RATIO,
            GP.bh * this.confUI.Hint2.Y_RATIO + this.confUI.Hint2.Y_OFFSET,
            "center",
            this.confUI.Hint2.FILL,
            this.confUI.Hint2.FONT_SIZE,
        )
            .$append(t("settlement.back"))
            .$append(t("settlement.backKey"), 3, void 0, void 0, "bold")
            .$append(t("settlement.backToMenu"));
        this.Hint2.opacity = 0;
        this.Hint3 = new TextLine(
            GP.bw * this.confUI.X_RATIO,
            GP.bh * this.confUI.Hint2.Y_RATIO + this.confUI.Hint2.Y_OFFSET + 30,
            "center",
            "#000000",
            this.confUI.Hint2.FONT_SIZE,
        )
            .$append("按 ")
            .$append("R", 3, void 0, void 0, "bold")
            .$append(" 观看回放");
        this.Hint3.opacity = 0;
        this.add([this.Title, this.Hint1, this.Hint2, this.Hint3]);

        this.init_ = this.init_.bind(this);
        this.#$setupEventListeners();
    }

    #$setupEventListeners(): void {
        evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
        evBus.on(GEV.RESIZE, (payload) => this.relocate_(payload.data));
        evBus.on(GEV.GAME_OVER, (payload) => {
            if (payload.win) this.win_();
            else this.fail_();
        });
    }

    relocate_(e: { width: number; height: number }): void {
        this.cx = e.width / 2;
        this.Title.y = (e.height * 2) / 7;
        this.Hint1.y = (e.height * 9) / 14 - 12;
        this.Hint2.y = (e.height * 9) / 14 + 12;
    }

    async init_(): Promise<void> {
        await Promise.all([this.#loadFont_(), this.#preloadImage_()]);
    }

    async #loadFont_(): Promise<void> {
        // `public/*` 在 Vite 下会直接映射到站点根路径（如 `/fonts/...`）。
        const fontURL = "/fonts/HYBeiBingYang-W.woff2";
        await GP.fontInitializer("HYBeiBingYang-W", fontURL);
    }

    async #preloadImage_(): Promise<void> {
        const winJPG = "/img/GL.jpg";
        const failJPG = "/img/DL.jpg";
        await Promise.all([GP.ImageInitializer("GL.jpg", winJPG), GP.ImageInitializer("DL.jpg", failJPG)]);
    }

    show_(): void {
        this.visible = true;
        this.relocate_({ width: GP.bw, height: GP.bh });
        this.Title.animate([{ scale: 1, opacity: 1 }], {
            duration: this.confUI.Title.SHOW_DURATION,
            join: true,
        });
        this.Hint1.fadeIn_(this.confUI.Hint1.FADE_IN_DURATION, this.confUI.Hint1.FADE_IN_DELAY);
        this.Hint2.fadeIn_(this.confUI.Hint2.FADE_IN_DURATION, this.confUI.Hint2.FADE_IN_DELAY);
        this.Hint3.fadeIn_(this.confUI.Hint2.FADE_IN_DURATION, this.confUI.Hint2.FADE_IN_DELAY + 0.2);
    }

    hide_(): void {
        this.Title.animate([{ scale: this.confUI.Title.HIDE_SCALE, opacity: 0 }], {
            duration: this.confUI.Title.HIDE_DURATION,
            join: true,
        });
        this.Hint1.fadeOut_(this.confUI.Hint1.FADE_OUT_DURATION);
        this.Hint2.fadeOut_(this.confUI.Hint2.FADE_OUT_DURATION);
        this.Hint3.fadeOut_(this.confUI.Hint2.FADE_OUT_DURATION).once(
            AnimateEvent.COMPLETED,
            () => (this.visible = false),
        );
    }

    win_(): void {
        this.Title.text = t("settlement.youWin");
        this.#setTextFill_("leafer://GL.jpg", this.confUI.Title.WIN_BG_Y_OFFSET);
        this.#setShadowColor_(this.confUI.Title.WIN_SHADOW_COLOR);
        this.show_();
    }

    fail_(): void {
        this.Title.text = t("settlement.fail");
        this.#setTextFill_("leafer://DL.jpg", this.confUI.Title.FAIL_BG_Y_OFFSET);
        this.#setShadowColor_(this.confUI.Title.FAIL_SHADOW_COLOR);
        this.show_();
    }

    #setTextFill_(src: string, offsetY: number): void {
        this.Title.fill = {
            type: "image",
            url: src,
            offset: { x: 0, y: offsetY },
        };
    }

    #setShadowColor_(color: string): void {
        this.Title.shadow = {
            x: 0,
            y: 0,
            blur: this.confUI.Title.SHADOW_BLUR,
            spread: this.confUI.Title.SHADOW_SPREAD,
            color: color,
        };
    }
}
