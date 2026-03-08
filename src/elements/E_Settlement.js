import { AnimateEvent, Group, Text } from "leafer-game";
import { evBus, GEV, GP, Mask, Scoring, timer } from "../core/instances";
import TextLine from "../utils/TextLine";
import { UIConf, getDifficultyKey } from "../config";
import { addScore, getBestScoreByDifficulty } from "../utils/scoreStorage";

export default class E_Settlement extends Group {
    confUI = UIConf.Settlement;

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
            this.confUI.Hint1.FONT_SIZE)
            .$append("按")
            .$append("空格键", 3, void 0, void 0, "bold")
            .$append("重新开始");
        this.Hint1.opacity = 0;
        this.Hint2 = new TextLine(GP.bw * this.confUI.X_RATIO,
            GP.bh * this.confUI.Hint2.Y_RATIO + this.confUI.Hint2.Y_OFFSET,
            "center",
            this.confUI.Hint2.FILL,
            this.confUI.Hint2.FONT_SIZE)
            .$append("按")
            .$append("回车键", 3, void 0, void 0, "bold")
            .$append("返回开始菜单");
        this.Hint2.opacity = 0;
        this.RecordText = new Text({
            x: GP.bw * this.confUI.X_RATIO,
            y: GP.bh * this.confUI.Title.Y_RATIO + 80,
            around: "center",
            text: "新纪录！",
            fontSize: 40,
            fontFamily: this.confUI.Title.FONT_FAMILY,
            fill: this.confUI.Title.WIN_SHADOW_COLOR,
            opacity: 0,
            scale: 1.4,
        });
        this.add([this.Title, this.Hint1, this.Hint2, this.RecordText]);

        this.init_ = this.init_.bind(this);
        this.#$setupEventListeners();
    }

    #$setupEventListeners() {
        evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
        evBus.on(GEV.RESIZE, (...args) => this.relocate_(args[0].data));
        evBus.on(GEV.GAME_OVER, (...args) => {
            const displayScore = Scoring.v / 10;
            const difficulty = getDifficultyKey();
            const prevBest = getBestScoreByDifficulty(difficulty);
            addScore(displayScore, difficulty);
            this.isNewRecord = prevBest == null || displayScore > prevBest;
            if (args[0].win) this.win_();
            else this.fail_();
        });
    }

    relocate_(e) {
        this.cx = e.width / 2;
        this.Title.y = e.height * 2 / 7;
        this.Hint1.y = e.height * 9 / 14 - 12;
        this.Hint2.y = e.height * 9 / 14 + 12;
        this.RecordText.y = this.Title.y + 80;
    }

    async init_() {
        await Promise.all([
            this.#loadFont_(),
            this.#preloadImage_(),
        ]);
    }

    async #loadFont_() {
        const fontURL = new URL("/public/fonts/HYBeiBingYang-W.woff2", import.meta.url).href;
        await GP.fontInitializer("HYBeiBingYang-W", fontURL);
    }

    async #preloadImage_() {
        const winJPG = new URL("/public/img/GL.jpg", import.meta.url).href;
        const failJPG = new URL("/public/img/DL.jpg", import.meta.url).href;
        await Promise.all([
            GP.ImageInitializer("GL.jpg", winJPG),
            GP.ImageInitializer("DL.jpg", failJPG),
        ]);
    }

    show_() {
        this.visible = true;
        this.relocate_({ width: GP.bw, height: GP.bh });
        this.Title.animate([
            { scale: 1, opacity: 1 },
        ], {
            duration: this.confUI.Title.SHOW_DURATION,
            join: true,
        });
        this.Hint1.fadeIn_(this.confUI.Hint1.FADE_IN_DURATION, this.confUI.Hint1.FADE_IN_DELAY);
        this.Hint2.fadeIn_(this.confUI.Hint2.FADE_IN_DURATION, this.confUI.Hint2.FADE_IN_DELAY);
    }

    hide_() {
        this.Title.animate([
            { scale: this.confUI.Title.HIDE_SCALE, opacity: 0 },
        ], {
            duration: this.confUI.Title.HIDE_DURATION,
            join: true,
        });
        this.Hint1.fadeOut_(this.confUI.Hint1.FADE_OUT_DURATION);
        this.Hint2.fadeOut_(this.confUI.Hint2.FADE_OUT_DURATION)
            .once(AnimateEvent.COMPLETED, () => this.visible = false);
    }

    win_() {
        this.Title.text = " You Win! ";
        this.#setTextFill_("leafer://GL.jpg", this.confUI.Title.WIN_BG_Y_OFFSET);
        this.#setShadowColor_(this.confUI.Title.WIN_SHADOW_COLOR);
        this.show_();
        this.isNewRecord && this.#celebrateRecord_();
    }

    fail_() {
        this.Title.text = " FAIL ";
        this.#setTextFill_("leafer://DL.jpg", this.confUI.Title.FAIL_BG_Y_OFFSET);
        this.#setShadowColor_(this.confUI.Title.FAIL_SHADOW_COLOR);
        this.show_();
        this.isNewRecord && this.#celebrateRecord_();
    }

    #setTextFill_(src, offsetY) {
        this.Title.fill = {
            type: "image",
            url: src,
            offset: { y: offsetY },
        };
    }

    #setShadowColor_(color) {
        this.Title.shadow = {
            x: 0,
            y: 0,
            blur: this.confUI.Title.SHADOW_BLUR,
            spread: this.confUI.Title.SHADOW_SPREAD,
            color: color,
        };
    }

    #celebrateRecord_() {
        Mask.show_("#FFD54F", 0, 0.55, 0.35);
        timer.newTimeout(() => {
            Mask.hide_();
        }, 380);
        this.RecordText.scale = 1.6;
        this.RecordText.opacity = 0;
        this.RecordText.animate(
            [
                { scale: 2, opacity: 1 },
                { scale: 1.2, opacity: 0 },
            ],
            {
                duration: 0.9,
                easing: "quad-out",
                join: true,
            },
        );
    }
}
