import { ResizeEvent } from "leafer-game";
import type { IResizeEvent } from "@leafer/interface";
import { GEV } from "../../channels";
import { eventBus } from "../../bus";
import type { EventBridgeDeps } from "../deps";

/**
 * 将浏览器 / Leafer 层事件映射到应用 {@link GEV}。
 */
export function wirePageEventBridge(deps: EventBridgeDeps): void {
    const { leafer, syncViewport } = deps;

    leafer.on(ResizeEvent.RESIZE, (raw) => {
        const e = raw as IResizeEvent;
        syncViewport(e.width, e.height);
        eventBus.emit(GEV.RESIZE, { data: e });
    });

    document.addEventListener("visibilitychange", () => {
        eventBus.emit(GEV.VISIBILITY_CHANGE, {
            visible: !document.hidden,
        });
    });
}
