import type { ResizeEvent } from "leafer-game";

export const GEV = {
  RESIZE: "system:resize",
  VISIBILITY_CHANGE: "system:visibility:change",
  KEYBOARD_EVENT: "system:keyboard:event",

  UI_RENDER_ELSE: "ui:render:else",

  GAME_PREPARED: "game:prepared",
  GAME_START: "game:start",
  GAME_PAUSE: "game:pause",
  GAME_RESUME: "game:resume",
  GAME_OVER: "game:over",
  GAME_RESTART: "game:restart",
  GAME_RESET: "game:reset",

  PLAYER_SCORE: "player:score",

  MAIN_MENU_SHOW: "main:menu:show",
  MAIN_MENU_HIDE: "main:menu:hide"
} as const;

export type KeyboardEventType = "hold" | "up";

export interface GameEventMap {
  [GEV.RESIZE]: { data: ResizeEvent; old?: ResizeEvent };
  [GEV.VISIBILITY_CHANGE]: { visible: boolean };
  [GEV.KEYBOARD_EVENT]: { type: KeyboardEventType; code: string };

  [GEV.UI_RENDER_ELSE]: void;

  [GEV.GAME_PREPARED]: void;
  [GEV.GAME_START]: void;
  [GEV.GAME_PAUSE]: void;
  [GEV.GAME_RESUME]: void;
  [GEV.GAME_OVER]: { win: boolean };
  [GEV.GAME_RESTART]: void;
  [GEV.GAME_RESET]: { removeMask: boolean };

  [GEV.PLAYER_SCORE]: number;

  [GEV.MAIN_MENU_SHOW]: void;
  [GEV.MAIN_MENU_HIDE]: void;
}

export type GameEventKey = keyof GameEventMap;
