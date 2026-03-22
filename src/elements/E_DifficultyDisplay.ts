import { Text } from "leafer-game";
import { evBus, GEV, GP } from "../core/instances";
import { UIConf, getDifficulty } from "../config";

export default class E_DifficultyDisplay extends Text {
  confUI = UIConf.DifficultyDisplay;

  constructor() {
    const conf = UIConf.DifficultyDisplay;
    super({
      x: GP.bw - conf.RIGHT,
      y: conf.Y_OFFSET,
      around: "topRight",
      fontSize: conf.FONT_SIZE,
      fill: conf.FILL,
      text: "",
      visible: false,
      zIndex: 880
    });
    this.setupEventListeners();
  }

  private setupEventListeners() {
    evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
    evBus.on(GEV.RESIZE, (payload) => this.relocate_(payload.data));
    evBus.on(GEV.GAME_START, this.show_.bind(this));
    evBus.on(GEV.GAME_RESET, this.update_.bind(this));
    evBus.on(GEV.GAME_PREPARED, this.hide_.bind(this));
  }

  relocate_(e: { width: number; height: number }) {
    this.x = e.width - this.confUI.RIGHT;
    this.y = this.confUI.Y_OFFSET;
  }

  update_() {
    this.text = "难度：" + getDifficulty().name;
  }

  show_() {
    this.update_();
    this.visible = true;
  }

  hide_() {
    this.visible = false;
  }
}

