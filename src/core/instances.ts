import extendUI from "../utils/UIExtensions";

extendUI();

import { Leafer } from "leafer-game";
import { GameConf, UIConf } from "../config";
import Processor from "./processor";
import Interaction from "./interaction";
import EmbeddedTimer from "../utils/EmbeddedTimer";
import E_Ball from "../elements/E_Ball";
import E_Tablet from "../elements/E_Tablet";
import E_Timing from "../elements/E_Timing";
import { mobileAdapter } from "../utils/MobileAdapter";

/** 移动端与桌面端差异化物理/渲染参数：低端移动设备降频以缓解卡顿。 */
const isMobileDevice = mobileAdapter.getDeviceType() === "mobile";
const targetFps = isMobileDevice ? GameConf.MOBILE_TARGET_FPS : GameConf.TARGET_FPS;
const maxStepPerFrame = isMobileDevice ? GameConf.MOBILE_MAX_STEP_PER_FRAME : GameConf.MAX_STEP_PER_FRAME;

export const leafer = new Leafer({
    view: document.querySelector("canvas")!,
    fill: UIConf.BACKGROUND_FILL,
    // 渲染帧率上限对齐物理子步：移动端 60fps，桌面端对齐 120Hz 物理子步
    maxFPS: targetFps,
    // 限制画布像素比，避免高倍 Retina 屏渲染面积过大导致卡顿；移动端进一步降到 1.5x，视觉几乎无差别
    pixelRatio: Math.min(window.devicePixelRatio || 1, isMobileDevice ? 1.5 : 2),
    pointer: {
        preventDefaultMenu: true,
    },
});

import { setLeafer } from "../utils/UIExtensions";
setLeafer(leafer);

const defFrameInterval = 1000 / GameConf.DEFAULT_REFRESH_RATE;
/**
 * Game Processor — the central state machine.
 *
 * Owns game lifecycle (init → prepared → playing → paused → over),
 * viewport dimensions (`.bw` / `.bh`), environment config (`.ENV`),
 * and asset loading helpers (`fontInitializer`, `ImageInitializer`).
 *
 * 物理子步固定 `1000 / TARGET_FPS`：桌面端 120Hz，移动端 60Hz。
 * 桌面 60Hz 显示器每渲染帧执行 2 个子步、移动端每帧 1 个子步，
 * 物理精度与手感在各自设备上保持一致，且降低移动端 CPU 负担。
 */
export const GP = new Processor(
    {
        refreshRate: GameConf.DEFAULT_REFRESH_RATE,
        actUnitInterval: 1000 / targetFps,
        stdUnitInterval: defFrameInterval,
        fixedStep: 1000 / targetFps,
        maxStepPerFrame,
        paddingTop: GameConf.PADDING.TOP,
        paddingSide: GameConf.PADDING.SIDE,
        timeLimit: GameConf.TIME_LIMIT,
    },
    leafer,
);

export const timer = new EmbeddedTimer({
    minInterval: 0,
    autoHandleFPS: true,
});

export const Ball = new E_Ball();
export const Tablet = new E_Tablet();

/** Game Interaction — collision detection and boundary enforcement. */
export const GI = new Interaction({ Ball, Tablet, timer, GP });

export const Timing = new E_Timing();
