import { AnimateEvent, Group, Rect, Text } from "leafer-game";
import { evBus, GEV, GP } from "../core/instances";
import TextLine from "../utils/TextLine";
import { UIConf } from "../config";
import { glassCardFillLighter } from "../utils/glassFill";

export default class E_OptionsMenu extends Group {
  confUI = UIConf.OptionsMenu;
  PanelCard: Rect;
  Title: Text;
  Hint1: any;
  Hint2: any;

  constructor() {
    super({
      x: 0,
      y: 0,
      width: GP.bw,
      height: GP.bh,
      visible: false,
      zIndex: 991
    });
    const Gl = UIConf.Glass;
    this.PanelCard = new Rect({
      x: GP.bw * this.confUI.X_RATIO,
      y: GP.bh * 0.43,
      around: "center",
      width: Math.min(520, GP.bw - 48),
      height: Math.min(300, GP.bh * 0.46),
      radius: Gl.RADIUS_WINDOW,
      fill: glassCardFillLighter() as any,
      stroke: Gl.STROKE_ACCENT,
      strokeWidth: 1,
      opacity: 0.94,
      shadow: {
        x: 0,
        y: Gl.SHADOW_Y * 0.6,
        blur: Gl.SHADOW_BLUR * 0.75,
        spread: 0,
        color: Gl.SHADOW_COLOR
      }
    });
    this.Title = new Text({
      x: GP.bw * this.confUI.X_RATIO,
      y: GP.bh * this.confUI.Title.Y_RATIO,
      around: "center",
      text: "游戏已暂停",
      fontFamily: this.confUI.Title.FONT_FAMILY,
      fontSize: this.confUI.Title.FONT_SIZE
    });
    this.Hint1 = new TextLine(
      GP.bw * this.confUI.X_RATIO,
      GP.bh * this.confUI.Hint1.Y_RATIO + this.confUI.Hint1.Y_OFFSET,
      "center",
      this.confUI.Hint1.FILL,
      this.confUI.Hint1.FONT_SIZE
    )
      .$append("按")
      .$append("空格键", 3, void 0, void 0, "bold")
      .$append("继续游戏");
    this.Hint1.opacity = 0;
    this.Hint2 = new TextLine(
      GP.bw * this.confUI.X_RATIO,
      GP.bh * this.confUI.Hint2.Y_RATIO + this.confUI.Hint2.Y_OFFSET,
      "center",
      this.confUI.Hint2.FILL,
      this.confUI.Hint2.FONT_SIZE
    )
      .$append("按")
      .$append("回车键", 3, void 0, void 0, "bold")
      .$append("结束游戏并返回开始菜单");
    this.Hint2.opacity = 0;
    this.add([this.PanelCard, this.Title, this.Hint1, this.Hint2]);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
    evBus.on(GEV.RESIZE, (payload) => this.relocate_(payload.data));
  }

  relocate_(e: { width: number; height: number }) {
    const Gl = UIConf.Glass;
    this.cx = e.width * this.confUI.X_RATIO;
    this.PanelCard.x = e.width * this.confUI.X_RATIO;
    this.PanelCard.y = e.height * 0.43;
    this.PanelCard.width = Math.min(520, e.width - 48);
    this.PanelCard.height = Math.min(300, e.height * 0.46);
    this.PanelCard.shadow = {
      x: 0,
      y: Gl.SHADOW_Y * 0.6,
      blur: Gl.SHADOW_BLUR * 0.75,
      spread: 0,
      color: Gl.SHADOW_COLOR
    };
    this.Hint1.y = e.height * this.confUI.Hint1.Y_RATIO + this.confUI.Hint1.Y_OFFSET;
    this.Hint2.y = e.height * this.confUI.Hint2.Y_RATIO + this.confUI.Hint2.Y_OFFSET;
  }

  reset_() {
    this.opacity = 1;
    this.Title.opacity = 0;
    this.Hint1.opacity = 0;
    this.Hint2.opacity = 0;
  }

  show_() {
    this.reset_();
    this.visible = true;
    this.relocate_({ width: GP.bw, height: GP.bh });
    this.fadeIn_(0);
    this.Title.fadeIn_(0.4);
    this.Hint1.fadeIn_(0.8, 0.2);
    this.Hint2.fadeIn_(0.8, 0.4);
  }

  hide_() {
    this.fadeOut_(0.5).once(AnimateEvent.COMPLETED, () => {
      this.visible = false;
    });
  }
}

