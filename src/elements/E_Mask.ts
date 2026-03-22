import { AnimateEvent, Rect } from "leafer-game";
import { evBus, GEV, GP } from "../core/instances";
import { UIConf } from "../config";

export default class E_Mask extends Rect {
  confUI = UIConf.Mask;

  constructor() {
    super({
      x: 0,
      y: 0,
      width: GP.bw,
      height: GP.bh,
      fill: UIConf.Mask.FILL,
      visible: false,
      zIndex: 990
    });
    this.animation = {
      style: { opacity: this.confUI.OPACITY },
      duration: this.confUI.FADE_IN_DURATION,
      join: true
    };
    this.setupEventListeners();
  }

  private setupEventListeners() {
    evBus.on(GEV.RESIZE, (payload) => this.relocate_(payload.data));
  }

  relocate_(e: { width: number; height: number }) {
    this.w = e.width;
    this.h = e.height;
  }

  show_(
    fill = this.confUI.FILL,
    fromOpacity = 0,
    toOpacity = this.confUI.OPACITY,
    duration = this.confUI.FADE_IN_DURATION
  ) {
    if (this.visible) {
      this.fill = fill;
      this.fadeTo_(toOpacity, this.confUI.FADE_TO_DURATION);
    } else {
      this.visible = true;
      this.relocate_({ width: GP.bw, height: GP.bh });
      this.fill = fill;
      this.fade_(fromOpacity, toOpacity, duration);
    }
  }

  hide_() {
    this.fadeOut_(0.5).once(AnimateEvent.COMPLETED, () => {
      this.visible = false;
    });
  }
}

