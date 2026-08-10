import { evBus, GEV } from "../events";
import { Mask } from "../ui/elements";

type OverlayPage = { show_(): void; hide_(): void };

class MaskLayer {
    $pages = new Map<number, OverlayPage>();
    $showing = -1;

    $init(...pages: OverlayPage[]): void {
        for (let i = 0; i < pages.length; ++i) {
            this.$pages.set(i, pages[i]);
        }
        this.#$setupEventListeners();
    }

    #$setupEventListeners(): void {
        evBus.on(GEV.GAME_RESET, (payload) => {
            if (payload.removeMask) this.$hide();
            else this.$show(0);
        });
        evBus.on(GEV.GAME_START, () => this.$hide());
        evBus.on(GEV.GAME_PAUSE, () => this.$show(1));
        evBus.on(GEV.GAME_RESUME, () => this.$hide());
        evBus.on(GEV.GAME_OVER, () => this.$show(2, false));
    }

    $show(i: number, autoShow = true): void {
        if (this.$showing >= 0) {
            Mask.show_("#FFF", 0, 0.4, 0.5);
            this.$pages.get(this.$showing)!.hide_();
        } else {
            Mask.show_("#FFF", 0, 0.4, 0.8);
        }
        if (autoShow) this.$pages.get(i)!.show_();
        this.$showing = i;
    }

    $hide(): void {
        if (this.$showing >= 0) {
            this.$pages.get(this.$showing)!.hide_();
        }
        this.$showing = -1;
        Mask.hide_();
    }
}

export const ML = new MaskLayer();
export default ML;
