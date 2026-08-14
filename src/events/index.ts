/**
 * 全局事件通信：通道名 {@link GEV}、载荷映射 {@link GameEventPayloadMap}、总线 {@link eventBus}、桥接 {@link createEventBridge}。
 *
 * 业务模块优先从本包引用事件类型；运行时单例仍可从 `core/instances` 的 `evBus` 导出（与 `eventBus` 相同）。
 */
export { GEV, type GameEventName } from "./channels";
export { type GameEventPayloadMap, type KeyboardRoutedType } from "./payloads";
export { GameEventBus, eventBus } from "./bus";
export { GAME_EVENT_CATALOG } from "./catalog";
export { createEventBridge, type EventBridgeDeps } from "./bridge/EventBridge";

/** 与历史命名 `evBus` 一致 */
export { eventBus as evBus } from "./bus";
