import { createEventBridge, evBus, GEV } from "../events";
import { UIConf } from "../config";
import { leafer, GP, timer } from "../core/instances";
import { MainMenu, OptionsMenu, Settlement, Scoring } from "../ui/elements";
import ML from "../utils/MaskLayer";
import KeyboardSolution from "../utils/KeyboardSolution";
import { loading } from "./dom";
import { setPrevTimeStamp } from "./timing";

loading.addEventListener("dragstart", (e) => e.preventDefault());

/* ---- Error Boundary ---- */
function showErrorScreen(): void {
    loading.style.display = "none";
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.style.display = "none";
    const errorScreen = document.getElementById("error-screen");
    if (errorScreen) errorScreen.classList.add("show");
}

// 捕获未处理的全局错误（Leafer 初始化失败等）
window.addEventListener("error", (e) => {
    // 仅处理脚本加载/执行错误，忽略资源加载错误（如图片 404）
    if (e.target !== window) return;
    console.error("[iBouncy] 未捕获错误:", e.error);
    showErrorScreen();
});

window.addEventListener("unhandledrejection", (e) => {
    console.error("[iBouncy] 未处理的 Promise 拒绝:", e.reason);
    showErrorScreen();
});

createEventBridge({
    leafer,
    timer,
    setPrevTimeStamp,
    syncViewport: (w, h) => GP.syncViewport(w, h),
}).setup();

GP.syncViewport(document.body.clientWidth, document.body.clientHeight);

export const KS = new KeyboardSolution();

ML.$init(MainMenu, OptionsMenu, Settlement);

evBus.on(GEV.GAME_PREPARED, () => {
    loading
        .animate([{ opacity: 0 }], {
            duration: UIConf.LOADING_FADE_OUT_DURATION * 1000,
            fill: "both",
        })
        .finished.then(() => {
            loading.style.display = "none";
        });
});

GP.setScoreSource(() => Scoring.v);

export async function initializeApp(): Promise<void> {
    await Promise.all([MainMenu.init(), Scoring.init_(), Settlement.init_()]);
    MainMenu.render_();
    GP.state("init1");
}
