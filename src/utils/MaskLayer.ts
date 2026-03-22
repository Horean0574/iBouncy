import { Mask, evBus, GEV } from "../core/instances";

class MaskLayer {
  private pages = new Map<number, any>();
  private showing = -1;

  $init(...pages: any[]) {
    for (let i = 0; i < pages.length; ++i) {
      this.pages.set(i, pages[i]);
    }
    this.setupEventListeners();
  }

  private setupEventListeners() {
    evBus.on(GEV.GAME_RESET, (payload) => {
      if (payload.removeMask) this.$hide();
      else this.$show(0);
    });
    evBus.on(GEV.GAME_START, () => this.$hide(true));
    evBus.on(GEV.GAME_PAUSE, () => this.$show(1));
    evBus.on(GEV.GAME_RESUME, () => this.$hide());
    evBus.on(GEV.GAME_OVER, () => this.$show(2, false));
  }

  $show(i: number, autoShow = true) {
    if (this.showing >= 0) {
      Mask.show_("#FFF", 0, 0.4, 0.5);
      this.pages.get(this.showing).hide_();
    } else {
      Mask.show_("#FFF", 0, 0.4, 0.8);
    }
    if (autoShow) {
      this.pages.get(i).show_();
    }
    this.showing = i;
  }

  $hide(keepMask = false) {
    if (this.showing >= 0) {
      this.pages.get(this.showing).hide_();
    }
    this.showing = -1;
    if (!keepMask) Mask.hide_();
  }
}

export const ML = new MaskLayer();
export default ML;

