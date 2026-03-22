import { Group, Path, Text } from "leafer-game";
import { Ball, evBus, F, GEV, GP, timer } from "../core/instances";
import { UIConf } from "../config";

export default class E_Scoring extends Group {
  confUI = UIConf.Scoring;
  v = 0;
  Panel: Path;
  Integer: Text;
  Decimal: Text;

  constructor() {
    super({
      x: GP.bw / 2 - 120,
      y: 0,
      zIndex: 880
    });
    this.Panel = new Path({
      path:
        "m -120 0\n" +
        "  h 10\n" +
        "  a 20 15 0 0 1 20 15\n" +
        "  v 35\n" +
        "  a 15 18 0 0 0 15 18\n" +
        "  h 150\n" +
        "  a 15 18 0 0 0 15 -18\n" +
        "  v -35\n" +
        "  a 20 15 0 0 1 20 -15\n" +
        "  h 10\n" +
        "  Z",
      x: 120,
      y: 0,
      fill: this.confUI.Panel.FILL
    });
    this.Integer = new Text({
      x: -GP.bw,
      y: 7,
      fontSize: this.confUI.Integer.FONT_SIZE,
      fill: this.confUI.Integer.FILL,
      text: "-",
      fontFamily: this.confUI.FONT_FAMILY
    });
    this.Decimal = new Text({
      x: -GP.bw,
      y: 15,
      fontSize: this.confUI.Decimal.FONT_SIZE,
      fill: this.confUI.Decimal.FILL,
      text: "--",
      fontFamily: this.confUI.FONT_FAMILY
    });
    this.add([this.Panel, this.Integer, this.Decimal]);

    this.init_ = this.init_.bind(this);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
    evBus.on(GEV.RESIZE, (payload) => this.relocate_(payload.data));
    evBus.on(GEV.GAME_RESET, this.reset_.bind(this));
  }

  reset_() {
    this.assign_(0);
  }

  relocate_(e: { width: number; height: number; old?: { width: number } }) {
    if (e.old && e.width === e.old.width) return;
    this.cx = e.width / 2;
    this.newScore_();
  }

  async init_() {
    await this.loadFont_();
  }

  private async loadFont_() {
    const fontURL = new URL("/public/fonts/HYDiSiKe-U.woff2", import.meta.url).href;
    await GP.fontInitializer("HYDiSiKe-U", fontURL);
    this.newScore_();
  }

  assign_(score: number) {
    this.v = Math.round(score * 10);
    this.newScore_();
    return E_Scoring.stringify_(this.v);
  }

  delta_(x: number) {
    const prevV = this.v;
    this.v += Math.round(x * 10);
    this.newScore_();
    this.bounce_();
    return E_Scoring.stringify_(this.v - prevV);
  }

  tip_(delta: string) {
    const tipConf = this.confUI.tip;
    const aniConf = tipConf.ANIMATION;
    const [initialOffsetX, transitionX, transitionY] = this.getTipData_();
    const tip = new Text({
      x: Ball.cx + initialOffsetX,
      y: Ball.oy,
      around: "center",
      text: "+" + delta,
      fill: tipConf.FILL,
      stroke: tipConf.STROKE,
      fontSize: tipConf.FONT_SIZE,
      fontFamily: this.confUI.FONT_FAMILY,
      opacity: tipConf.OPACITY,
      shadow: {
        x: 1,
        y: 1,
        blur: 10,
        color: tipConf.SHADOW_COLOR
      },
      animation: {
        keyframes: [
          {
            style: { opacity: tipConf.OPACITY, fontSize: aniConf.FONT_SIZE1 },
            duration: aniConf.STYLE_DURATION1
          },
          {
            style: { opacity: 0, fontSize: aniConf.FONT_SIZE2 },
            duration: aniConf.STYLE_DURATION2
          }
        ],
        join: true
      }
    });
    (tip as any).render_();
    tip.animate([{ offsetX: transitionX }], {
      duration: aniConf.X_DURATION,
      easing: "sine-out",
      join: true
    });
    tip.animate(
      [
        {
          style: { offsetY: aniConf.Y_OFFSET1 },
          duration: aniConf.Y_DURATION1,
          easing: "quad-out"
        },
        {
          style: { offsetY: transitionY },
          duration: aniConf.Y_DURATION2,
          easing: "quad-in-out"
        }
      ],
      {
        join: true
      }
    );
    timer.newTimeout(() => {
      tip.destroy();
    }, tipConf.DURATION * 1000);
  }

  private getTipData_(): [number, number, number] {
    const ballSpeedAffect = (0.7 * Ball.vx * 600) / GP.ENV.actUnitInterval;
    let direction = Math.random() >= 0.5 ? 1 : -1;
    let initialOffsetX = (10 + Math.random() * 20) * direction;
    let transitionX0 = (40 + Math.random() * 20) * direction;
    let transitionY = (Math.random() - 0.4) * 24;
    const totalTranslationX = initialOffsetX + transitionX0 + ballSpeedAffect;
    if (Ball.cx + totalTranslationX <= GP.ENV.paddingSide) {
      initialOffsetX *= -1;
      transitionX0 *= -1;
    } else if (Ball.cx + totalTranslationX >= GP.bw - GP.ENV.paddingSide) {
      initialOffsetX *= -1;
      transitionX0 *= -1;
    }
    return [initialOffsetX + ballSpeedAffect / 2, transitionX0 + ballSpeedAffect / 2, transitionY];
  }

  private newScore_() {
    this.Integer.text = F(this.v / 10);
    this.Decimal.text = "." + (this.v % 10);
    this.Integer.x = (240 - this.Integer.w - this.Decimal.w) / 2;
    this.Decimal.x = this.Integer.ox;
  }

  private bounce_() {
    this.animate(
      [
        { scale: 1.06 },
        { scale: 1 }
      ],
      {
        duration: 0.18,
        easing: "quad-out",
        join: true
      }
    );
  }

  static stringify_(v: number) {
    return `${F(v / 10)}.${v % 10}`;
  }
}

