import { evBus, GEV, leafer } from "../core/instances";
import { KeyEvent } from "leafer-game";

export default class KeyboardSolution {
    HOLD = "hold";
    UP = "up";

    constructor() {
        this.#$setupEventListeners();
    }

    #$setupEventListeners() {
        const KeyEventCallback = (e, t) => {
            evBus.emit(GEV.KEYBOARD_EVENT, {
                type: t,
                code: e.code,
            });
        };
        leafer.on(KeyEvent.HOLD, e => KeyEventCallback(e, this.HOLD));
        leafer.on(KeyEvent.UP, e => KeyEventCallback(e, this.UP));
    }

    whenHold(callback) {
        evBus.on(GEV.KEYBOARD_EVENT, (...args) => {
            if (args[0].type === this.HOLD) {
                callback(args[0]);
            }
        });
    }

    whenUp(callback) {
        evBus.on(GEV.KEYBOARD_EVENT, (...args) => {
            if (args[0].type === this.UP) {
                callback(args[0]);
            }
        });
    }
}
