/*
Units:
    size: pixel (px)
    time: second (s)
    velocity: pixel per frame (px/f)
    acceleration: pixel per frame^2 (px/f/f)
 */
export const GameConf = {
    TIME_LIMIT: 120,
    MAX_ACCUMULATED: 0.5, // can redisplay frames of up to 0.5s
    /** 物理子步目标帧率：与显示器刷新率解耦，固定 120Hz 保证所有设备手感一致且碰撞更精确。 */
    TARGET_FPS: 120,
    /** 每渲染帧最多追赶的子步数：120Hz 子步下约 133ms 追赶窗口。 */
    MAX_STEP_PER_FRAME: 16,
    /** 移动端物理子步帧率：低端移动设备 CPU 有限，60Hz 子步已足够精确，能明显降低卡顿。 */
    MOBILE_TARGET_FPS: 60,
    /** 移动端每渲染帧最多追赶的子步数：60Hz 子步下约 133ms 追赶窗口。 */
    MOBILE_MAX_STEP_PER_FRAME: 8,
    /** 速度基准帧率：GameConf 中速度单位 px/f 以 60fps 为基准，渲染刷新率变化不改变游戏速度。 */
    DEFAULT_REFRESH_RATE: 60,
    FPS_DETECT_INTERVAL: 0.4,
    PADDING: {
        TOP: 80,
        SIDE: 40,
    },
    Ball: {
        VX_MIN: 1.6,
        VX_MAX: 3.5,
        VY: 3.5,
        AX: 4.2e-4,
        AY: 8.2e-4,
        ACCELERATION: {
            FROM: 105,
            TO: 15,
            COOLDOWN: 0.05,
            RATIO_X1: 1.5,
            RATIO_Y1: 1.2,
            RATIO_X2: 0.6,
            RATIO_Y2: 0.25,
            DECAY_DELAY: 0.2,
            DECAY_TIMES: 6,
        },
    },
    Tablet: {
        VX: 6,
        VY: 2.8,
    },
    Combo: {
        RESET_WINDOW: 0.8,
        MULTIPLIER_STEP: 0.25,
        MAX_MULTIPLIER: 5,
    },
} as const;
