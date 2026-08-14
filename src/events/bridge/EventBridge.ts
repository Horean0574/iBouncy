import type { EventBridgeDeps } from "./deps";
import { wirePageEventBridge } from "./adapters/pageAdapter";
import { wireTimerSyncAdapter } from "./adapters/timerSyncAdapter";
import { wireStateChainAdapter } from "./adapters/stateChainAdapter";

export type { EventBridgeDeps } from "./deps";

/**
 * 组装外部系统（Leafer、DOM、计时器）与内部 {@link eventBus} 之间的适配层。
 * 不持有单例状态，可多次调用 `setup`（通常仅启动时一次）。
 */
export function createEventBridge(deps: EventBridgeDeps) {
    return {
        setup(): void {
            wirePageEventBridge(deps);
            wireTimerSyncAdapter(deps);
            wireStateChainAdapter();
        },
    };
}
