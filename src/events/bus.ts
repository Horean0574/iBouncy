import type { GameEventName } from "./channels";
import type { GameEventPayloadMap } from "./payloads";

type AnyHandler = (() => void) | ((payload: GameEventPayloadMap[GameEventName]) => void);

/**
 * 应用级类型安全事件总线（同步派发、订阅即返回取消函数）。
 */
export class GameEventBus {
    private readonly events = new Map<GameEventName, Set<AnyHandler>>();

    on<K extends keyof GameEventPayloadMap>(
        event: K,
        callback: GameEventPayloadMap[K] extends undefined ? () => void : (payload: GameEventPayloadMap[K]) => void,
    ): () => void {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        const set = this.events.get(event)!;
        const wrapped = callback as AnyHandler;
        set.add(wrapped);
        return () => this.off(event, wrapped);
    }

    once<K extends keyof GameEventPayloadMap>(
        event: K,
        callback: GameEventPayloadMap[K] extends undefined ? () => void : (payload: GameEventPayloadMap[K]) => void,
    ): void {
        const wrapped = ((...args: unknown[]) => {
            this.off(event, wrapped as AnyHandler);
            if (args.length === 0) {
                (callback as () => void)();
            } else {
                (callback as (p: GameEventPayloadMap[K]) => void)(args[0] as GameEventPayloadMap[K]);
            }
        }) as AnyHandler;
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event)!.add(wrapped);
    }

    off(event: GameEventName, callback: AnyHandler): void {
        const set = this.events.get(event);
        if (!set) return;
        set.delete(callback);
        if (set.size === 0) {
            this.events.delete(event);
        }
    }

    emit<K extends keyof GameEventPayloadMap>(
        event: K,
        ...args: GameEventPayloadMap[K] extends undefined ? [] : [GameEventPayloadMap[K]]
    ): void {
        const set = this.events.get(event);
        if (!set) return;
        const callbacks = [...set];
        for (const callback of callbacks) {
            try {
                if (args.length === 0) {
                    (callback as () => void)();
                } else {
                    (callback as (p: GameEventPayloadMap[K]) => void)(args[0] as GameEventPayloadMap[K]);
                }
            } catch (err) {
                console.error(`Error in event handler for "${String(event)}":\n`, err);
            }
        }
    }

    clear(): void {
        this.events.clear();
    }

    /**
     * 兼容 guide 的命名：用于应用卸载时统一释放所有监听器，避免长时间运行造成的监听器残留。
     * 等价于 {@link clear}。
     */
    destroy(): void {
        this.clear();
    }
}

/** 单例：全游戏共享一条总线 */
export const eventBus = new GameEventBus();
