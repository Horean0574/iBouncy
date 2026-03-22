import { AnimateEvent, Group, Rect, Text } from "leafer-game";
import { evBus, GEV, GP, Mask, Scoring, Timing, timer } from "../core/instances";
import TextLine from "../utils/TextLine";
import { UIConf, getDifficultyKey } from "../config";
import { addScore, getBestScoreByDifficulty } from "../utils/scoreStorage";
import { pushScoreForCurrentUser } from "../utils/auth";
import { glassCardFillLighter } from "../utils/glassFill";

export default class E_Settlement extends Group {
  confUI = UIConf.Settlement;
  PanelCard: Rect;
  Title: Text;
  Hint1: any;
  Hint2: any;
  RecordText: Text;
  isNewRecord = false;

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
      y: GP.bh * 0.44,
      around: "center",
      width: Math.min(560, GP.bw - 40),
      height: Math.min(340, GP.bh * 0.52),
      radius: Gl.RADIUS_WINDOW,
      fill: glassCardFillLighter() as any,
      stroke: Gl.STROKE_ACCENT,
      strokeWidth: 1,
      opacity: 0,
      shadow: {
        x: 0,
        y: Gl.SHADOW_Y * 0.65,
        blur: Gl.SHADOW_BLUR * 0.8,
        spread: 0,
        color: Gl.SHADOW_COLOR
      }
    });
    this.Title = new Text({
      x: GP.bw * this.confUI.X_RATIO,
      y: GP.bh * this.confUI.Title.Y_RATIO,
      around: "center",
      text: "",
      fontSize: this.confUI.Title.FONT_SIZE,
      fontFamily: this.confUI.Title.FONT_FAMILY,
      scale: this.confUI.Title.SCALE,
      opacity: 0
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
      .$append("重新开始");
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
      .$append("返回开始菜单");
    this.Hint2.opacity = 0;
    this.RecordText = new Text({
      x: GP.bw * this.confUI.X_RATIO,
      y: GP.bh * this.confUI.Title.Y_RATIO + 80,
      around: "center",
      text: "新纪录！",
      fontSize: 40,
      fontFamily: "HYBeiBingYang-W",
      fill: this.confUI.Title.WIN_SHADOW_COLOR,
      opacity: 0,
      scale: 1.4
    });
    this.add([this.PanelCard, this.Title, this.Hint1, this.Hint2, this.RecordText]);

    this.init_ = this.init_.bind(this);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
    evBus.on(GEV.RESIZE, (payload) => this.relocate_(payload.data));
    evBus.on(GEV.GAME_OVER, (payload) => {
      const displayScore = Scoring.v / 10;
      const difficulty = getDifficultyKey();
      const prevBest = getBestScoreByDifficulty(difficulty);
      addScore(displayScore, difficulty);
      // 尝试将本次成绩同步到服务器（如果已登录）
      const durationSec = Math.max(0, GP.ENV.timeLimit - Timing.remaining);
      pushScoreForCurrentUser(displayScore, difficulty, Date.now(), durationSec);
      this.isNewRecord = prevBest == null || displayScore > prevBest;
      if (payload.win) this.win_();
      else this.fail_();
    });
  }

  relocate_(e: { width: number; height: number }) {
    const Gl = UIConf.Glass;
    this.cx = e.width / 2;
    this.PanelCard.x = e.width / 2;
    this.PanelCard.y = e.height * 0.44;
    this.PanelCard.width = Math.min(560, e.width - 40);
    this.PanelCard.height = Math.min(340, e.height * 0.52);
    this.PanelCard.shadow = {
      x: 0,
      y: Gl.SHADOW_Y * 0.65,
      blur: Gl.SHADOW_BLUR * 0.8,
      spread: 0,
      color: Gl.SHADOW_COLOR
    };
    this.Title.y = (e.height * 2) / 7;
    this.Hint1.y = (e.height * 9) / 14 - 12;
    this.Hint2.y = (e.height * 9) / 14 + 12;
    this.RecordText.y = this.Title.y + 80;
  }

  async init_() {
    await Promise.all([this.loadFont_(), this.preloadImage_()]);
  }

  private async loadFont_() {
    const fontURL = new URL("/dist/fonts/HYBeiBingYang-W.woff2", import.meta.url).href;
    await GP.fontInitializer("HYBeiBingYang-W", fontURL);
  }

  private async preloadImage_() {
    const winJPG = new URL("/public/img/GL.jpg", import.meta.url).href;
    const failJPG = new URL("/public/img/DL.jpg", import.meta.url).href;
    await Promise.all([
      GP.ImageInitializer("GL.jpg", winJPG),
      GP.ImageInitializer("DL.jpg", failJPG)
    ]);
  }

  show_() {
    this.visible = true;
    this.relocate_({ width: GP.bw, height: GP.bh });
    (this.PanelCard as any).fadeIn_(0.32, 0.04);
    this.Title.animate([{ scale: 1, opacity: 1 }], {
      duration: this.confUI.Title.SHOW_DURATION,
      join: true
    });
    this.Hint1.fadeIn_(this.confUI.Hint1.FADE_IN_DURATION, this.confUI.Hint1.FADE_IN_DELAY);
    this.Hint2.fadeIn_(this.confUI.Hint2.FADE_IN_DURATION, this.confUI.Hint2.FADE_IN_DELAY);
  }

  hide_() {
    (this.PanelCard as any).fadeOut_(0.22);
    this.Title.animate([{ scale: this.confUI.Title.HIDE_SCALE, opacity: 0 }], {
      duration: this.confUI.Title.HIDE_DURATION,
      join: true
    });
    this.Hint1.fadeOut_(this.confUI.Hint1.FADE_OUT_DURATION);
    this.Hint2.fadeOut_(this.confUI.Hint2.FADE_OUT_DURATION).once(
      AnimateEvent.COMPLETED,
      () => {
        this.visible = false;
      }
    );
  }

  private setTextFill_(src: string, offsetY: number) {
    this.Title.fill = {
      type: "image",
      url: src,
      offset: { y: offsetY }
    } as any;
  }

  private setShadowColor_(color: string) {
    this.Title.shadow = {
      x: 0,
      y: 0,
      blur: this.confUI.Title.SHADOW_BLUR,
      spread: this.confUI.Title.SHADOW_SPREAD,
      color
    };
  }

  private celebrateRecord_() {
    Mask.show_("#FFD54F", 0, 0.55, 0.35);
    timer.newTimeout(() => {
      Mask.hide_();
    }, 380);
    this.RecordText.scale = 1.6;
    this.RecordText.opacity = 0;
    this.RecordText.animate(
      [
        { scale: 2, opacity: 1 },
        { scale: 1.2, opacity: 0 }
      ],
      {
        duration: 0.9,
        easing: "quad-out",
        join: true
      }
    );
  }

  win_() {
    this.Title.text = " You Win! ";
    this.setTextFill_("leafer://GL.jpg", this.confUI.Title.WIN_BG_Y_OFFSET);
    this.setShadowColor_(this.confUI.Title.WIN_SHADOW_COLOR);
    this.show_();
    if (this.isNewRecord) this.celebrateRecord_();
  }

  fail_() {
    this.Title.text = " FAIL ";
    this.setTextFill_("leafer://DL.jpg", this.confUI.Title.FAIL_BG_Y_OFFSET);
    this.setShadowColor_(this.confUI.Title.FAIL_SHADOW_COLOR);
    this.show_();
  }
}

