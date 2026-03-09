import { ResizeEvent } from "leafer-game";
import { evBus, GEV, leafer, setPrevTimeStamp, timer } from "./instances";

class EventBridge {
  setup() {
    this.setupPageEvents();
    this.setupTimerEvents();
    this.setupStateEvents();
  }

  private setupPageEvents() {
    leafer.on(ResizeEvent.RESIZE, (e: ResizeEvent) => {
      evBus.emit(GEV.RESIZE, {
        data: e
      });
    });
    document.addEventListener("visibilitychange", () => {
      evBus.emit(GEV.VISIBILITY_CHANGE, {
        visible: !document.hidden
      });
    });
  }

  private setupTimerEvents() {
    evBus.on(GEV.GAME_PAUSE, () => {
      timer.pauseAll();
    });
    evBus.on(GEV.GAME_RESUME, () => {
      setPrevTimeStamp(performance.now());
      timer.resumeAll();
    });
  }

  private setupStateEvents() {
    evBus.on(GEV.GAME_PREPARED, () => {
      evBus.emit(GEV.GAME_RESET, {
        removeMask: false
      });
    });
    evBus.on(GEV.GAME_RESTART, () => {
      evBus.emit(GEV.GAME_RESET, {
        removeMask: true
      });
      evBus.emit(GEV.GAME_START, undefined);
    });
  }
}

export const evBridge = new EventBridge();
export default evBridge;

