import type { GameEventMap } from "./EventTypes";

type Handler<Events, K extends keyof Events> = (payload: Events[K]) => void;

class EventBus<Events extends Record<string, any>> {
  private events = new Map<keyof Events, Set<(payload: Events[keyof Events]) => void>>();

  on<K extends keyof Events>(ev: K, callback: Handler<Events, K>): () => void {
    if (!this.events.has(ev)) {
      this.events.set(ev, new Set());
    }
    (this.events.get(ev) as Set<Handler<Events, K>>).add(callback);
    return () => this.off(ev, callback);
  }

  once<K extends keyof Events>(ev: K, callback: Handler<Events, K>): void {
    const onceWrapper: Handler<Events, K> = (payload) => {
      this.off(ev, onceWrapper);
      callback(payload);
    };
    this.on(ev, onceWrapper);
  }

  off<K extends keyof Events>(ev: K, callback: Handler<Events, K>): void {
    const callbacks = this.events.get(ev);
    if (!callbacks) return;
    callbacks.delete(callback as any);
    if (callbacks.size === 0) {
      this.events.delete(ev);
    }
  }

  emit<K extends keyof Events>(ev: K, payload: Events[K]): void {
    const callbacks = this.events.get(ev);
    if (!callbacks) return;
    const cbs = [...callbacks] as Handler<Events, K>[];
    cbs.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Error in event handler for "${String(ev)}":\n`, err);
      }
    });
  }

  clear(): void {
    this.events.clear();
  }
}

export const eventBus = new EventBus<GameEventMap>();
export type GameEventBus = EventBus<GameEventMap>;
export default eventBus;

