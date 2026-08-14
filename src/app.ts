import { initializeApp, KS } from "./app/bootstrap";
import { GameConf, UIConf } from "./config";
import { evBus, GEV } from "./events";
import { abs, floor } from "./utils/math";
import { setEffectsEnabled } from "./core/effects";
import { prevTimeStamp, setPrevTimeStamp } from "./app/timing";
import { GI, GP, timer, leafer, Ball, Tablet, Timing } from "./core/instances";
import { Mask, FPS, Scoring, Settlement } from "./ui/elements";
import { initCloudOverlay } from "./ui/cloudOverlay";
import { addScore } from "./cloud/client";
import { addLocalScore, clearSynced, markSynced } from "./cloud/localScores";
import { soundManager } from "./audio/SoundManager";
import { touchCtrl } from "./utils/TouchController";
import { mobileAdapter } from "./utils/MobileAdapter";
import X_NativeParticle from "./elements_extensions/X_NativeParticle";
import { ReplayRecorder } from "./core/replay";
import E_ReplayControls from "./elements/E_ReplayControls";

/** 碰撞加分公式用：板宽恒定，提出循环外避免每子步除法。 */
const TABLET_2PI_OVER_W = (Math.PI * 2) / UIConf.Tablet.WIDTH;
const BV_ANGLE_SCALE = Math.PI / 30;

const cloudUI = initCloudOverlay();
/** 原生 Canvas 粒子系统：绕过 Leafer 场景图，碰撞帧渲染快 5-10x */
const nativeParticle = (() => {
    const cvs = document.querySelector("canvas");
    if (!cvs) return null;
    try {
        return new X_NativeParticle(cvs as HTMLCanvasElement);
    } catch {
        return null;
    }
})();

/** 赛后回放系统 */
const replayRecorder = new ReplayRecorder();
let replayControls: E_ReplayControls | null = null;

// 设置回放记录器的数据源
replayRecorder.setScoreSource(() => (Scoring as any).v / 10);
replayRecorder.setComboSource(() => ({
    combo: (Scoring as any).currentCombo,
    multiplier: (Scoring as any).currentMultiplier,
}));
replayRecorder.setTimingSource(() => Timing.remaining);

let accumulated = 0;
let rafId = 0;
let lowFpsStreak = 0;

Mask.render_();
Mask.show_("#FFF", 1, 0.7, 0.4);
GP.renderElse();
rafId = requestAnimationFrame(firstFrame);
timer.newInterval(() => FPS.assign_(timer.FPS), GameConf.FPS_DETECT_INTERVAL * 1000);

// Service Worker 注册（PWA 离线支持）- 暂时禁用以避免开发环境问题
// if ("serviceWorker" in navigator && import.meta.env.PROD) {
//     navigator.serviceWorker.register("/sw.js").catch(() => {
//         // SW 注册失败不影响游戏运行
//     });
// }

// 开发模式性能日志
if (import.meta.env.DEV) {
    const perfLog: number[] = [];
    timer.newInterval(() => {
        const fps = timer.FPS;
        if (Number.isFinite(fps)) {
            perfLog.push(fps);
            if (perfLog.length >= 150) {
                const avg = perfLog.reduce((a, b) => a + b, 0) / perfLog.length;
                const sorted = [...perfLog].sort((a, b) => a - b);
                const p1 = sorted[Math.floor(sorted.length * 0.01)];
                const p99 = sorted[Math.floor(sorted.length * 0.99)];
                console.debug(
                    `[Perf] FPS: avg=${avg.toFixed(1)} p1=${p1.toFixed(1)} p99=${p99.toFixed(1)} samples=${perfLog.length}`,
                );
                perfLog.length = 0;
            }
        }
    }, GameConf.FPS_DETECT_INTERVAL * 1000);
}

initializeApp().catch((err) => {
    console.error("Initialization failed...\n", err);
    // 显示错误边界
    const loadingEl = document.getElementById("loading");
    if (loadingEl) loadingEl.style.display = "none";
    const errorScreen = document.getElementById("error-screen");
    if (errorScreen) errorScreen.classList.add("show");
});

// 触摸控制器初始化
touchCtrl.mount();

// 移动端适配初始化
mobileAdapter.mount();

// 音效系统初始化（首次用户手势后恢复 AudioContext）
let audioEnsured = false;
const ensureAudio = () => {
    if (audioEnsured) return;
    soundManager.ensure();
    audioEnsured = true;
};
// capture 阶段监听：摇杆/虚拟按钮的 stopPropagation 不会截断，首次操作即可初始化音频
document.addEventListener("pointerdown", ensureAudio, { once: true, capture: true });
document.addEventListener("keydown", ensureAudio, { once: true, capture: true });

window.addEventListener("unload", () => {
    if (rafId) cancelAnimationFrame(rafId);
    timer.pauseAll();
    evBus.destroy();
});

function firstFrame(timeStamp: number): void {
    const lw = leafer.width ?? 0;
    const lh = leafer.height ?? 0;
    const w = lw > 0 ? lw : document.body.clientWidth;
    const h = lh > 0 ? lh : document.body.clientHeight;
    GP.syncViewport(w, h);
    setPrevTimeStamp(timeStamp);
    gameLoop(timeStamp);
}

function gameLoop(timeStamp: number): void {
    const deltaTime = timeStamp - prevTimeStamp;
    setPrevTimeStamp(timeStamp);
    GP.frameTimeStamp = timeStamp;
    GP.frameCount++;
    timer.timeDetect(timeStamp);

    // 卡顿恢复机制：连续低 FPS 时关闭视觉特效，保障物理计算更稳定。
    if (GP.at("playing")) {
        const fps = timer.FPS;
        if (Number.isFinite(fps) && fps < 30) {
            lowFpsStreak++;
        } else {
            lowFpsStreak = 0;
        }
        setEffectsEnabled(lowFpsStreak < 3);
    } else {
        lowFpsStreak = 0;
        setEffectsEnabled(true);
    }

    if (GP.at("init1")) {
        GP.measureRefreshRate(deltaTime / GP.ENV.stdUnitInterval);
    } else if (GP.at("init2")) {
        Ball.prepare_();
        GP.state("almost-prepared");
    } else if (GP.at("almost-prepared")) {
        GP.prepared();
    }

    let steps = 1;
    if (GP.at("playing")) {
        accumulated += Math.min(deltaTime, GameConf.MAX_ACCUMULATED * 1000);
        Ball.timeDivisor = Math.min(floor(accumulated / GP.ENV.fixedStep), GP.ENV.maxStepPerFrame);
        const unitProg = GP.ENV.fixedStep / GP.ENV.stdUnitInterval;
        while (accumulated >= GP.ENV.fixedStep && steps <= GP.ENV.maxStepPerFrame) {
            // sub-stepping loop
            accumulated -= GP.ENV.fixedStep;
            ++steps;
            Ball.frameLoop_(unitProg);
            Tablet.frameLoop(unitProg);
            if (GI.collisionDetect() && Ball.vy < 0) {
                const bv = Math.sqrt(Ball.vx * Ball.vx + Ball.vy * Ball.vy);
                const bvP = Math.log2(bv) + 1 / Math.cos(BV_ANGLE_SCALE * bv);
                const d = abs((Tablet as any).cx - (Ball as any).cx);
                const dP = Math.cos(TABLET_2PI_OVER_W * d) + 0.5;
                const { combo, multiplier } = GI.registerHit();
                // 合并得分+连击为单一事件，减少一次事件分发
                evBus.emit(GEV.SCORE_HIT, { delta: (0.4 * bvP + 0.16 * dP) * multiplier, combo, multiplier });
                soundManager.playBounce();
                nativeParticle?.emit((Ball as any).cx, Math.min((Ball as any).oy, (Tablet as any).ty));
            }
        }
        // 记录回放帧（每帧记录一次，而非每个子步）
        if (!replayControls?.isPlaying()) {
            replayRecorder.recordFrame();
        }
        // 原生 Canvas 粒子系统渲染（绕过 Leafer 场景图）
        nativeParticle?.render(deltaTime / 1000);
    }

    // 更新回放播放器
    replayControls?.update();

    rafId = requestAnimationFrame(gameLoop);
}

evBus.on(GEV.VISIBILITY_CHANGE, (payload) => {
    if (!payload.visible) GP.pause();
});

// 游戏结束时：如果已登录则把本局成绩写入云端。
evBus.on(GEV.GAME_OVER, async (payload) => {
    // 先本地保存一份（游客也有记录；登录后可同步）
    const local = addLocalScore(payload.score);

    // 音效：胜利或失败
    if (payload.win) {
        soundManager.playWin();
    } else {
        soundManager.playLose();
    }

    if (!cloudUI.getUser()) return;
    try {
        await addScore(payload.score, local.clientId);
        markSynced(local.clientId);
        clearSynced();
    } catch (e) {
        console.error("Upload score failed:", e);
    }
});

// 音效：游戏开始
evBus.on(GEV.GAME_START, () => {
    soundManager.playStart();
});

// 监听虚拟操作按键的回放事件（无键盘用户）
window.addEventListener("ibouncy:replay-start", () => {
    if (!GP.at("over")) return;
    if (!replayControls) {
        replayControls = new E_ReplayControls();
    }
    const replays = replayRecorder.getReplays();
    if (replays.length > 0) {
        const lastReplay = replays[replays.length - 1];
        if (replayControls.loadReplay(lastReplay.metadata.id)) {
            Settlement.hide_();
            Mask.hide_();
            replayControls.show();
            replayControls.startPlayback();
        }
    }
});

// 回放结束后重新显示遮罩和主菜单
window.addEventListener("ibouncy:replay-end", () => {
    Mask.show_("#FFF", 0, 0.4, 0.5);
    Settlement.show_();
});

// 球丢失时重置连击
evBus.on(GEV.GAME_BALL_LOST, () => {
    GI.resetCombo();
});

// 触摸视口同步
evBus.on(GEV.RESIZE, (payload) => {
    touchCtrl.syncViewport(payload.data.width, payload.data.height);
    nativeParticle?.syncSize(payload.data.width, payload.data.height);
});

// 初始视口同步
touchCtrl.syncViewport(document.body.clientWidth, document.body.clientHeight);
KS.whenHold((e) => {
    switch (e.code) {
        case "Semicolon":
            FPS.toggle_();
            break;
        case "Escape":
        case "KeyP":
            GP.pause();
            break;
    }
});
KS.whenUp((e) => {
    switch (e.code) {
        case "Space":
            if (GP.at("prepared")) {
                GP.start();
            } else if (GP.at("over")) {
                GP.restart();
            } else if (GP.at("paused")) {
                GP.resume();
            }
            break;
        case "Enter":
        case "NumpadEnter":
            if (GP.at("over") || GP.at("paused")) {
                GP.prepared();
            }
            break;
        case "KeyR":
            if (GP.at("over")) {
                // 统一通过 ibouncy:replay-start 事件进入回放（与虚拟按键路径一致）
                window.dispatchEvent(new CustomEvent("ibouncy:replay-start"));
            }
            break;
        case "Escape":
            if (replayControls?.isPlaying()) {
                window.dispatchEvent(new CustomEvent("ibouncy:replay-end"));
                replayControls.stopPlayback();
                replayControls.hide();
                GP.prepared();
            }
            break;
    }
});
