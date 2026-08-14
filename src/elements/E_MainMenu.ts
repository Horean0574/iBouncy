import { AnimateEvent, Group, Image } from "leafer-game";
import { evBus, GEV } from "../events";
import { GP } from "../core/instances";
import TextLine from "../utils/TextLine";
import { UIConf } from "../config";
import { t } from "../i18n";

export default class E_MainMenu extends Group {
    confUI = UIConf.MainMenu;
    Brand: Image;
    Hint1: TextLine;
    Hint2: TextLine;

    constructor() {
        super({
            x: 0,
            y: 0,
            width: GP.bw,
            height: GP.bh,
            visible: false,
            zIndex: 991,
        });
        this.Brand = new Image({
            x: GP.bw * this.confUI.X_RATIO,
            y: GP.bh * this.confUI.Brand.Y_RATIO,
            around: "center",
            url: "leafer://brand.svg",
            opacity: 0,
            scale: 0,
            offsetY: this.confUI.Brand.Y_OFFSET,
            shadow: {
                x: 0,
                y: 0,
                blur: 50,
                color: this.confUI.Brand.SHADOW_COLOR,
            },
        });
        this.Hint1 = new TextLine(
            GP.bw * this.confUI.X_RATIO,
            GP.bh * this.confUI.Hint1.Y_RATIO + this.confUI.Hint1.Y_OFFSET,
            "center",
            this.confUI.Hint1.FILL,
            this.confUI.Hint1.FONT_SIZE,
        )
            .$append(t("mainMenu.press"))
            .$append(t("mainMenu.spaceKey"), 3, void 0, void 0, "bold")
            .$append(t("mainMenu.startGame"));
        this.Hint1.opacity = 0;
        this.Hint2 = new TextLine(
            GP.bw * this.confUI.X_RATIO,
            GP.bh * this.confUI.Hint2.Y_RATIO + this.confUI.Hint2.Y_OFFSET,
            "center",
            this.confUI.Hint2.FILL,
            this.confUI.Hint2.FONT_SIZE,
        )
            .$append(t("mainMenu.controlVia"))
            .$append(t("mainMenu.arrowKeys"), 3, void 0, void 0, "bold")
            .$append(t("mainMenu.or"))
            .$append(t("mainMenu.wasd"), 3, void 0, void 0, "bold")
            .$append(t("mainMenu.controlTablet"));
        this.Hint2.opacity = 0;
        this.add([this.Brand, this.Hint1, this.Hint2]);
        this.#$setupEventListeners();
    }

    #$setupEventListeners(): void {
        evBus.on(GEV.RESIZE, (payload) => this.relocate_(payload.data));
    }

    async init(): Promise<void> {
        await this.preloadImage();
    }

    async preloadImage(): Promise<void> {
        // `public/*` 在 Vite 下会直接映射到站点根路径（如 `/svg/...`）。
        const brandSVG = "/svg/brand.svg";
        await GP.ImageInitializer("brand.svg", brandSVG);
    }

    relocate_(e: { width: number; height: number }): void {
        this.cx = e.width * this.confUI.X_RATIO;
        this.Brand.y = e.height * this.confUI.Brand.Y_RATIO;
        this.Hint1.y = e.height * this.confUI.Hint1.Y_RATIO + this.confUI.Hint1.Y_OFFSET;
        this.Hint2.y = e.height * this.confUI.Hint2.Y_RATIO + this.confUI.Hint2.Y_OFFSET;
    }

    reset_(): void {
        this.opacity = 1;
        this.Brand.opacity = 0;
        this.Brand.scale = 0;
        this.Brand.offsetY = this.confUI.Brand.Y_OFFSET;
        this.Hint1.opacity = 0;
        this.Hint2.opacity = 0;
    }

    show_(): void {
        this.reset_();
        this.visible = true;
        this.relocate_({ width: GP.bw, height: GP.bh });
        this.Brand.animate(
            [
                { opacity: 0.9, scale: 1.1, offsetY: -5 },
                { opacity: 1, scale: 1, offsetY: 0 },
            ],
            {
                duration: 0.8,
                join: true,
            },
        ).once(AnimateEvent.COMPLETED, () => {
            this.Brand.hoverStyle = {
                shadow: {
                    x: 0,
                    y: 0,
                    blur: 20,
                    color: this.confUI.Brand.HOVER_SHADOW_COLOR,
                },
            };
        });
        this.Hint1.fadeIn_(0.8, 0.2);
        this.Hint2.fadeIn_(0.8, 0.4);
    }

    hide_(): void {
        // Reset hover style; Leafer may expect null/undefined for "no hover".
        this.Brand.hoverStyle = undefined;
        this.fadeOut_(0.5).once(AnimateEvent.COMPLETED, () => (this.visible = false));
    }
}
