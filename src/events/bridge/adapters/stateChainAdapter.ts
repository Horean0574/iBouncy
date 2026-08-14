import { GEV } from "../../channels";
import { eventBus } from "../../bus";

/**
 * 玩法状态链：将「准备就绪 / 重启」等高层语义展开为 `GAME_RESET`、`GAME_START` 等原子事件。
 */
export function wireStateChainAdapter(): void {
    eventBus.on(GEV.GAME_PREPARED, () => {
        eventBus.emit(GEV.GAME_RESET, {
            removeMask: false,
        });
    });

    eventBus.on(GEV.GAME_RESTART, () => {
        eventBus.emit(GEV.GAME_RESET, {
            removeMask: true,
        });
        eventBus.emit(GEV.GAME_START);
    });
}
