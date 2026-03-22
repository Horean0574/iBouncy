export const ColorConf = {
  PRIMARY: "#20A8D7",
  SECONDARY: "#FF4500",
  SUCCESS: "#32CD79",
  WARNING: "#FFEF00",
  DANGER: "#E85B5B",
  LIGHT_CYAN: "#44C2F1",
  DARK_GRAY: "#262626",
  GRAY: "#444444",
  DAWN_GRAY: "#474746",
  DIM_GRAY: "#555555",
  LIGHT_GRAY: "#777777",
  LIGHTER_WHITE: "#DDDDDD",
  LIGHT_WHITE: "#EEFFFF",
  WHITE: "#FFFFFF",
  BG_DARK: "#050814",
  NEON_BLUE: "#00E5FF",
  NEON_PURPLE: "#C158FF",
  NEON_PINK: "#FF4FA3"
} as const;

export const FontConf = {
  TITLE: "HYBeiBingYang-W",
  SCORE: "HYDiSiKe-U"
} as const;

export const UIConf = {
  BACKGROUND_FILL: ColorConf.LIGHT_WHITE,
  LOADING_FADE_OUT_DURATION: 0.3,
  /** 画布内模拟毛玻璃（半透叠色 + 描边 + 阴影）；HTML 弹层用 backdrop-filter */
  Glass: {
    OVERLAY_TINT: "rgba(238, 255, 255, 0.56)",
    OVERLAY_DIM: "rgba(15, 23, 42, 0.42)",
    CARD: "rgba(255, 255, 255, 0.8)",
    CARD_DEEP: "rgba(245, 252, 255, 0.88)",
    STROKE_SOFT: "rgba(255, 255, 255, 0.55)",
    STROKE_ACCENT: "rgba(32, 168, 215, 0.36)",
    RADIUS_WINDOW: 22,
    RADIUS_CARD: 18,
    RADIUS_CHIP: 12,
    SHADOW_Y: 18,
    SHADOW_BLUR: 44,
    SHADOW_COLOR: "rgba(32,168,215,0.18)"
  },
  Ball: {
    X_RATIO: 1 / 2,
    Y_RATIO: 1 / 4,
    RADIUS: 10,
    FILL: ColorConf.NEON_BLUE,
    GLOW_MIN_BLUR: 6,
    GLOW_MAX_BLUR: 26,
    GLOW_MAX_SCALE: 1.25
  },
  BallTrailing: {
    RADIUS: 6.2,
    FILL: `${ColorConf.NEON_PURPLE}BA`
  },
  Tablet: {
    WIDTH: 120,
    HEIGHT: 21,
    FILL: ColorConf.SUCCESS,
    X_RATIO: 1 / 2,
    Y_RATIO: 1,
    Y_OFFSET: -140,
    HIT_SHADOW_COLOR: ColorConf.NEON_PINK,
    HIT_SHADOW_BLUR: 24,
    HIT_SCALE_X: 1.08,
    HIT_SCALE_Y: 1.04
  },
  ForbiddenZone: {
    FILL: `${ColorConf.DANGER}87`
  },
  FPS: {
    LEFT: 12,
    BOTTOM: 24,
    FONT_SIZE: 12,
    FILL: ColorConf.LIGHT_GRAY
  },
  Mask: {
    FILL: ColorConf.WHITE,
    OPACITY: 0.6,
    FADE_IN_DURATION: 0.8,
    FADE_TO_DURATION: 0.5,
    ALERT_FILL: `${ColorConf.DANGER}CC`
  },
  MainMenu: {
    X_RATIO: 1 / 2,
    Brand: {
      Y_RATIO: 2 / 7,
      Y_OFFSET: -300,
      SHADOW_COLOR: ColorConf.DIM_GRAY,
      HOVER_SHADOW_COLOR: ColorConf.WARNING
    },
    Hint1: {
      Y_RATIO: 4 / 7,
      Y_OFFSET: -12,
      FILL: ColorConf.GRAY,
      FONT_SIZE: 16
    },
    Hint2: {
      Y_RATIO: 4 / 7,
      Y_OFFSET: 12,
      FILL: ColorConf.LIGHT_GRAY,
      FONT_SIZE: 12
    },
    Difficulty: {
      Y_RATIO: 3.2 / 7,
      FONT_SIZE: 18,
      FILL: ColorConf.GRAY,
      FILL_SELECTED: ColorConf.PRIMARY,
      GAP: 24
    },
    BestScore: {
      Y_RATIO: 2.6 / 7,
      FONT_SIZE: 14,
      FILL: ColorConf.GRAY
    },
    HistoryButton: {
      Y_RATIO: 4.5 / 7,
      Y_OFFSET: 48,
      FONT_SIZE: 14,
      FILL: ColorConf.LIGHT_GRAY,
      FILL_HOVER: ColorConf.PRIMARY
    },
    AccountButton: {
      X_RATIO: 0.87,
      Y_RATIO: 0.12,
      FONT_SIZE: 14,
      FILL: ColorConf.GRAY,
      FILL_LOGGED_IN: ColorConf.PRIMARY,
      FILL_HOVER: ColorConf.PRIMARY
    },
    ScoreHistory: {
      TITLE_FONT_SIZE: 18,
      TITLE_FILL: ColorConf.GRAY,
      ROW_FONT_SIZE: 14,
      ROW_FILL: ColorConf.DIM_GRAY,
      HEADER_FILL: ColorConf.GRAY,
      CLOSE_FONT_SIZE: 14,
      CLOSE_FILL: ColorConf.LIGHT_GRAY,
      MAX_ROWS: 20,
      ROW_HEIGHT: 22
    },
    UserPanel: {
      TITLE_FONT_SIZE: 20,
      TITLE_FILL: ColorConf.DARK_GRAY,
      SUBTITLE_FONT_SIZE: 12,
      SUBTITLE_FILL: ColorConf.LIGHT_GRAY,
      LABEL_FONT_SIZE: 13,
      LABEL_FILL: ColorConf.LIGHT_GRAY,
      VALUE_FONT_SIZE: 14,
      VALUE_FILL: ColorConf.DARK_GRAY,
      HINT_FONT_SIZE: 12,
      HINT_FILL: ColorConf.LIGHT_GRAY,
      PRIMARY_BTN_FILL: ColorConf.PRIMARY,
      DANGER_BTN_FILL: ColorConf.DANGER
    },
    GrowthCenter: {
      BREAKPOINT: 768,
      /** 8px 栅格基准 */
      GRID: 8,
      /** 卡片内边距（3×8） */
      CARD_PAD: 24,
      /** 卡片/区块间距（2×8） */
      CARD_GAP: 16,
      /** 文案与图标间距（1×8） */
      TEXT_ICON_GAP: 8,
      /** 按钮内边距 */
      BTN_PAD_X: 12,
      BTN_PAD_Y: 8,
      /** 无障碍：辅助字最小字号 */
      CAPTION_MIN_MOBILE: 12,
      CAPTION_MIN_PC: 11,
      /** 正文/弱文案（约 ≥4.5:1 对比白底） */
      TEXT_BODY: "#1E293B",
      TEXT_MUTED: "#475569",
      TEXT_SUPPORT: "#64748B",
      /** PC 主卡片最大宽度，减少两侧留白 */
      CARD_FIXED_W_PC: 800,
      CARD_MAX_H: 680,
      /** 移动端卡片距屏幕左右边距 */
      MOBILE_MARGIN: 16,
      /** 移动端卡片上下留白 */
      MOBILE_V_MARGIN: 12,
      /** 移动端区块纵向间距（2×8） */
      MOBILE_BLOCK_GAP: 16,
      /** 触屏最小点击区域 */
      MIN_TOUCH: 44,
      NAV_W: 112,
      /** @deprecated 请用 CARD_PAD，值与 CARD_PAD 一致 */
      PAD: 24,
      GAP: 16,
      CARD_FILL: "#F5FCFF",
      CARD_STROKE: "rgba(32,168,215,0.25)",
      TITLE_SIZE: 20,
      SUBTITLE_SIZE: 16,
      BODY_SIZE: 14,
      CAPTION_SIZE: 12,
      PROGRESS_H: 8,
      NAV_ITEM_H: 44,
      TAB_H: 48,
      FOOTER_BTN_MIN_W: 88,
      /** 字号缩放参考宽度：PC / 移动 */
      FONT_REF_W_PC: 1280,
      FONT_REF_W_MOBILE: 390
    }
  },
  OptionsMenu: {
    X_RATIO: 1 / 2,
    Title: {
      Y_RATIO: 2 / 7,
      FONT_FAMILY: FontConf.TITLE,
      FONT_SIZE: 48
    },
    Hint1: {
      Y_RATIO: 4 / 7,
      Y_OFFSET: -12,
      FILL: ColorConf.GRAY,
      FONT_SIZE: 16
    },
    Hint2: {
      Y_RATIO: 4 / 7,
      Y_OFFSET: 12,
      FILL: ColorConf.LIGHT_GRAY,
      FONT_SIZE: 12
    }
  },
  Scoring: {
    FONT_FAMILY: FontConf.SCORE,
    Panel: {
      FILL: `${ColorConf.LIGHT_GRAY}AA`
    },
    Integer: {
      FONT_SIZE: 40,
      FILL: ColorConf.WHITE
    },
    Decimal: {
      FONT_SIZE: 32,
      FILL: ColorConf.LIGHTER_WHITE
    },
    tip: {
      OPACITY: 0.9,
      FONT_SIZE: 20,
      FILL: ColorConf.WARNING,
      STROKE: `${ColorConf.DARK_GRAY}33`,
      SHADOW_COLOR: ColorConf.LIGHT_GRAY,
      DURATION: 0.6,
      ANIMATION: {
        FONT_SIZE1: 24,
        FONT_SIZE2: 25,
        STYLE_DURATION1: 0.3,
        STYLE_DURATION2: 0.4,
        X_DURATION: 0.45,
        Y_DURATION1: 0.12,
        Y_DURATION2: 0.28,
        Y_OFFSET1: -12
      }
    }
  },
  Settlement: {
    X_RATIO: 1 / 2,
    Title: {
      Y_RATIO: 2 / 7,
      FONT_SIZE: 108,
      FONT_FAMILY: FontConf.TITLE,
      SCALE: 0.5,
      HIDE_SCALE: 0.3,
      SHOW_DURATION: 0.4,
      HIDE_DURATION: 0.3,
      WIN_SHADOW_COLOR: ColorConf.WARNING,
      FAIL_SHADOW_COLOR: ColorConf.DAWN_GRAY,
      WIN_BG_Y_OFFSET: 75,
      FAIL_BG_Y_OFFSET: -50,
      SHADOW_BLUR: 25,
      SHADOW_SPREAD: 15
    },
    Hint1: {
      Y_RATIO: 9 / 14,
      Y_OFFSET: -12,
      FILL: ColorConf.GRAY,
      FONT_SIZE: 16,
      FADE_IN_DURATION: 0.8,
      FADE_IN_DELAY: 0.2,
      FADE_OUT_DURATION: 0.5
    },
    Hint2: {
      Y_RATIO: 9 / 14,
      Y_OFFSET: 12,
      FILL: ColorConf.LIGHT_GRAY,
      FONT_SIZE: 12,
      FADE_IN_DURATION: 0.8,
      FADE_IN_DELAY: 0.4,
      FADE_OUT_DURATION: 0.5
    }
  },
  DifficultyDisplay: {
    RIGHT: 15,
    Y_OFFSET: 15,
    FONT_SIZE: 14,
    FILL: ColorConf.GRAY
  },
  Timing: {
    X_OFFSET: 15,
    Y_OFFSET: 15,
    FILL: ColorConf.DARK_GRAY,
    ALARM_FILL: ColorConf.LIGHT_CYAN,
    FONT_SIZE: 16,
    GAP: 4,
    IconG: {
      DIAMETER: 16,
      ANIMATION: {
        KEYFRAMES: [
          { rotation: 35, y: 0 },
          { rotation: -35, y: -3 },
          { rotation: 25, y: -3 },
          { rotation: -25, y: 0 }
        ],
        DURATION: 0.4,
        LOOP_DELAY: 0.6
      }
    },
    Text: {
      LINE_HEIGHT: 16
    }
  }
} as const;

export type UIConfType = typeof UIConf;

