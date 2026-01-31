import { Leafer } from "leafer-game";
import extendUI from "../utils/UIExtensions";
import Processor from "./processor";
import Interaction from "./interaction";
import EmbeddedTimer from "../utils/EmbeddedTimer";
import E_Mask from "../elements/E_Mask";
import E_MainMenu from "../elements/E_MainMenu";
import E_OptionsMenu from "../elements/E_OptionsMenu";
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

extendUI();

export const leafer = new Leafer({
    view: document.querySelector("canvas"),
    fill: "#EFF",
    pointer: {
        preventDefaultMenu: true,
    },
});

export const GP = new Processor({
    refreshRate: 60,
    actUnitInterval: 16.7,
    stdUnitInterval: 16.7,
    fixedStep: 16.7,
    maxStepPerFrame: 10,
    paddingTop: 80,
    paddingSide: 40,
    timeLimit: 120,
});

export const GI = new Interaction();
export const timer = new EmbeddedTimer({
    minInterval: 0,
    autoHandleFPS: true,
});

export const Mask = new E_Mask();
export const MainMenu = new E_MainMenu();
export const OptionsMenu = new E_OptionsMenu();
export const Settlement = new E_Settlement();
export const FPS = new E_FPS();
export const ForbiddenZone = new E_ForbiddenZone();
export const Timing = new E_Timing();
export const Scoring = new E_Scoring();
export const Tablet = new E_Tablet();
export const Ball = new E_Ball();
