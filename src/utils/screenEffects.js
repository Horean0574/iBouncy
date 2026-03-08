import { GP, Mask, timer } from "../core/instances";
import { UIConf } from "../config";

let canvas;
let shaking = false;

function getCanvas() {
    if (!canvas) {
        canvas = document.querySelector("canvas");
    }
    return canvas;
}

export function shakeScreen(intensity = 8, duration = 220) {
    if (!GP.at("playing")) return;
    const el = getCanvas();
    if (!el || shaking) return;
    shaking = true;
    el.style.willChange = "transform";
    const baseTransform = el.style.transform || "";
    const start = performance.now();
    const interval = timer.newInterval(() => {
        const now = performance.now();
        const t = (now - start) / duration;
        if (t >= 1) {
            timer.cancelInterval(interval);
            el.style.transform = baseTransform;
            el.style.willChange = "auto";
            shaking = false;
            return;
        }
        const damp = 1 - t;
        const dx = (Math.random() * 2 - 1) * intensity * damp;
        const dy = (Math.random() * 2 - 1) * intensity * damp;
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0) ${baseTransform}`;
    }, 16);
}

export function playIntroScene() {
    if (!GP.at("playing")) return;
    Mask.show_(UIConf.BACKGROUND_FILL, 1, 0.85, 0.28);
    timer.newTimeout(() => {
        if (!GP.at("playing")) return;
        Mask.show_("#00E5FF", 0.85, 0.25, 0.35);
    }, 260);
    timer.newTimeout(() => {
        if (!GP.at("playing")) return;
        Mask.hide_();
    }, 260 + 360);
}

