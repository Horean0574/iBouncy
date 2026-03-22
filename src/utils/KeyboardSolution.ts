import { evBus, GEV, leafer } from "../core/instances";
import { KeyEvent } from "leafer-game";
import type { KeyboardEventType } from "../core/EventTypes";

type KeyboardPayload = {
  type: KeyboardEventType;
  code: string;
};

export default class KeyboardSolution {
  HOLD: KeyboardEventType = "hold";
  UP: KeyboardEventType = "up";

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    const keyEventCallback = (e: any, t: KeyboardEventType) => {
      const payload: KeyboardPayload = {
        type: t,
        code: e.code
      };
      evBus.emit(GEV.KEYBOARD_EVENT, payload);
    };
    leafer.on(KeyEvent.HOLD, (e) => keyEventCallback(e, this.HOLD));
    leafer.on(KeyEvent.UP, (e) => keyEventCallback(e, this.UP));
  }

  whenHold(callback: (payload: KeyboardPayload) => void) {
    evBus.on(GEV.KEYBOARD_EVENT, (args) => {
      if (args?.type === this.HOLD) {
        callback(args);
      }
    });
  }

  whenUp(callback: (payload: KeyboardPayload) => void) {
    evBus.on(GEV.KEYBOARD_EVENT, (args) => {
      if (args?.type === this.UP) {
        callback(args);
      }
    });
  }
}

