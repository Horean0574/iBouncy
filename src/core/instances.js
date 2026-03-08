import { Leafer } from "leafer-game";
import { GameConf, UIConf } from "../config";

export { eventBus as evBus } from "./EventBus";
export { GEV as GEV } from "./EventTypes";
import Processor from "./processor";
import Interaction from "./interaction";
import KeyboardSolution from "../utils/KeyboardSolution";
import extendUI from "../utils/UIExtensions";
import EmbeddedTimer from "../utils/EmbeddedTimer";
import ML from "../utils/MaskLayer";
import E_Mask from "../elements/E_Mask";
import E_MainMenu from "../elements/E_MainMenu";
import E_OptionsMenu from "../elements/E_OptionsMenu";
import E_Settlement from "../elements/E_Settlement";
import E_FPS from "../elements/E_FPS";
import E_ForbiddenZone from "../elements/E_ForbiddenZone";
import E_Timing from "../elements/E_Timing";
import E_DifficultyDisplay from "../elements/E_DifficultyDisplay";
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
    fill: UIConf.BACKGROUND_FILL,
    pointer: {
        preventDefaultMenu: true,
    },
});

const defFrameInterval = 1000 / GameConf.DEFAULT_REFRESH_RATE;
export const GP = new Processor({
    refreshRate: GameConf.DEFAULT_REFRESH_RATE,
    actUnitInterval: defFrameInterval,
    stdUnitInterval: defFrameInterval,
    fixedStep: defFrameInterval,
    maxStepPerFrame: GameConf.MAX_STEP_PER_FRAME,
    paddingTop: GameConf.PADDING.TOP,
    paddingSide: GameConf.PADDING.SIDE,
    timeLimit: GameConf.TIME_LIMIT,
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
export const DifficultyDisplay = new E_DifficultyDisplay();
export const Scoring = new E_Scoring();
export const Tablet = new E_Tablet();
export const Ball = new E_Ball();

ML.$init(MainMenu, OptionsMenu, Settlement);
export const KS = new KeyboardSolution();
