import { Polygon } from "leafer-game";
import { evBus, GEV, GP } from "../core/instances";
import { UIConf } from "../config";

export default class E_ForbiddenZone extends Polygon {
  constructor() {
    super({
      points: [
        0,
        GP.bh,
        0,
        0,
        GP.bw,
        0,
        GP.bw,
        GP.bh,
        GP.bw - GP.ENV.paddingSide,
        GP.bh,
        GP.bw - GP.ENV.paddingSide,
        GP.ENV.paddingTop,
        GP.ENV.paddingSide,
        GP.ENV.paddingTop,
        GP.ENV.paddingSide,
        GP.bh
      ],
      fill: UIConf.ForbiddenZone.FILL
    });
    this.setupEventListeners();
  }

  private setupEventListeners() {
    evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
    evBus.on(GEV.RESIZE, (payload) => this.relocate_(payload.data));
  }

  relocate_(e: { width: number; height: number }) {
    this.points = [
      0,
      e.height,
      0,
      0,
      e.width,
      0,
      e.width,
      e.height,
      e.width - GP.ENV.paddingSide,
      e.height,
      e.width - GP.ENV.paddingSide,
      GP.ENV.paddingTop,
      GP.ENV.paddingSide,
      GP.ENV.paddingTop,
      GP.ENV.paddingSide,
      e.height
    ];
  }
}

