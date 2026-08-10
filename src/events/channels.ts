/**
 * 全局事件通道名（跨模块发布/订阅）。
 *
 * 命名约定：`域:动作`，便于在日志与调试中一眼识别来源。
 *
 * - **system**：浏览器 / Leafer 画布与页面生命周期
 * - **ui**：非主玩法 UI 渲染与布局
 * - **game**：玩法状态机（准备 / 进行中 / 暂停 / 结束等）
 * - **player**：玩家交互
 */
export const GEV = {
    // --- system ---
    /** Leafer {@link ResizeEvent}，载荷为 `{ data: IResizeEvent }` */
    RESIZE: "system:resize",
    /** `document.visibilityState` 变化，载荷 `{ visible: boolean }` */
    VISIBILITY_CHANGE: "system:visibility:change",
    /** 键盘经 Leafer 路由后的统一事件，载荷含 `hold` | `up` 与 `code` */
    KEYBOARD_EVENT: "system:keyboard:event",

    // --- ui ---
    /** 首屏加载完成后，除主菜单外的 HUD / 装饰一次性渲染 */
    UI_RENDER_ELSE: "ui:render:else",

    // --- game lifecycle ---
    GAME_PREPARED: "game:prepared",
    GAME_START: "game:start",
    GAME_PAUSE: "game:pause",
    GAME_RESUME: "game:resume",
    GAME_OVER: "game:over",
    GAME_RESTART: "game:restart",
    /** 回到可玩/菜单前的一次性重置（如遮罩与 HUD） */
    GAME_RESET: "game:reset",
    /** 弹球掉落触底，由 Processor 决定最终是否判负 */
    GAME_BALL_LOST: "game:ball:lost",
    /** 倒计时归零，由 Processor 决定最终是否判胜 */
    GAME_TIME_UP: "game:time:up",

    // --- player ---
    PLAYER_SCORE: "player:score",
    PLAYER_COMBO: "player:combo",
    /** 合并得分+连击单一事件，减少碰撞帧的事件分发次数 */
    SCORE_HIT: "player:score:hit",
} as const;

export type GameEventName = (typeof GEV)[keyof typeof GEV];
