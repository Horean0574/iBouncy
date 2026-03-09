import { Text } from "leafer-game";
import { evBus, GEV, GP } from "../core/instances";
import { UIConf } from "../config";

export default class E_FPS extends Text {
  confUI = UIConf.FPS;

  constructor() {
    super({
      x: UIConf.FPS.LEFT,
      y: GP.bh - UIConf.FPS.BOTTOM,
      fontSize: UIConf.FPS.FONT_SIZE,
      fill: UIConf.FPS.FILL,
      text: "FPS: --",
      zIndex: 1001
    });
    this.setupEventListeners();
  }

  private setupEventListeners() {
    evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
    evBus.on(GEV.RESIZE, (payload) => this.relocate_(payload.data));
  }

  relocate_(e: { width: number; height: number; old?: { width: number; height: number } }) {
    if (e.old && e.height === e.old.height) return;
    this.y = e.height - this.confUI.BOTTOM;
  }

  assign_(fps: number) {
    if (isNaN(fps)) {
      this.text = "FPS: --";
    } else {
      this.text = "FPS: " + fps;
    }
  }
}

