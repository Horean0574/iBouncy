import { Leafer } from "leafer-game";
import { GameProcessor } from "../utils/GameProcessor";
import GameInteraction from "../utils/GameInteraction";
import EmbeddedTimer from "../utils/EmbeddedTimer";
import E_Mask from "../elements/E_Mask";
import E_Settlement from "../elements/E_Settlement";
import E_FPS from "../elements/E_FPS";
import E_ForbiddenZone from "../elements/E_ForbiddenZone";
import E_Timing from "../elements/E_Timing";
import E_Scoring from "../elements/E_Scoring";
import E_Tablet from "../elements/E_Tablet";
import E_Ball from "../elements/E_Ball";

export const D = Math.abs;
export const C = Math.ceil;
export const F = Math.floor;

export let prevTimeStamp;

export function setPrevTimeStamp(v) {
    prevTimeStamp = v;
}

export const loading = document.querySelector("#loading");

export const leafer = new Leafer({
    view: document.querySelector("canvas"),
    fill: "#EFF",
});

export const GP = new GameProcessor({
    refreshRate: 60,
    actUnitInterval: 16.7,
    stdUnitInterval: 16.7,
    fixedStep: 16.7,
    maxStepPerFrame: 10,
    paddingTop: 80,
    paddingSide: 40,
    timeLimit: 180,
});

export const GI = new GameInteraction();
export const timer = new EmbeddedTimer({
    minInterval: 0,
    autoHandleFPS: true,
});

export const Mask = new E_Mask();
export const Settlement = new E_Settlement();
export const FPS = new E_FPS();
export const ForbiddenZone = new E_ForbiddenZone();
export const Timing = new E_Timing();
export const Scoring = new E_Scoring();
export const Tablet = new E_Tablet();
export const Ball = new E_Ball();
