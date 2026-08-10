import type { GameEventName } from "./channels";
import { GEV } from "./channels";

/**
 * 开发者速查：通道名 → 一句话说明（与 {@link GEV} 一一对应）。
 * 适合在 IDE 中跳转 `GEV` 或在此处全文搜索。
 */
export const GAME_EVENT_CATALOG: Record<GameEventName, string> = {
    [GEV.RESIZE]: "画布/视口尺寸变化（Leafer Resize）；监听方应同步布局与多边形点集等",
    [GEV.VISIBILITY_CHANGE]: "页面可见性变化；用于后台自动暂停等",
    [GEV.KEYBOARD_EVENT]: "键盘 hold/up 与 code，经 Leafer 统一后由 KeyboardSolution 再分发",
    [GEV.UI_RENDER_ELSE]: "加载完成后除主菜单外的 HUD 一次性挂载（FPS、禁区、计分等）",
    [GEV.GAME_PREPARED]: "进入「可开始」状态（已测刷新率、资源就绪）",
    [GEV.GAME_START]: "开始一局（playing）",
    [GEV.GAME_PAUSE]: "暂停；与计时器暂停联动",
    [GEV.GAME_RESUME]: "恢复；与计时器恢复及时间戳校准联动",
    [GEV.GAME_OVER]: "本局结束；载荷含是否胜利",
    [GEV.GAME_RESTART]: "从结算等回到再开一局（桥接会再发 GAME_RESET + GAME_START）",
    [GEV.GAME_RESET]: "重置 HUD/遮罩等；载荷决定是否移除主遮罩层",
    [GEV.GAME_BALL_LOST]: "弹球掉落触底，Processor 据此调用 gameOver(false)",
    [GEV.GAME_TIME_UP]: "倒计时归零，Processor 据此调用 gameOver(true)",
    [GEV.PLAYER_SCORE]: "玩家得分入口；载荷为本次碰撞的原始增量 delta",
    [GEV.PLAYER_COMBO]: "连击更新；载荷含当前连击数与倍率 multiplier",
    [GEV.SCORE_HIT]: "合并得分+连击事件；载荷含 delta/combo/multiplier，减少碰撞帧事件分发次数",
};
