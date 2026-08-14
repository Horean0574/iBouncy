import { GEV } from "../../channels";
import { eventBus } from "../../bus";
import type { EventBridgeDeps } from "../deps";

/**
 * 将游戏暂停/恢复与嵌入式计时器 {@link EmbeddedTimer} 对齐。
 */
export function wireTimerSyncAdapter(deps: EventBridgeDeps): void {
    const { timer, setPrevTimeStamp } = deps;

    eventBus.on(GEV.GAME_PAUSE, () => {
        timer.pauseAll();
    });

    eventBus.on(GEV.GAME_RESUME, () => {
        setPrevTimeStamp(performance.now());
        timer.resumeAll();
    });
}
