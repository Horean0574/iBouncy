/**
 * 触摸控制器 —— 为移动端提供虚拟摇杆输入处理。
 *
 * 策略：
 * - 只响应虚拟摇杆的输入，不再监听全屏触摸事件
 * - 摇杆输出连续模拟量（-1 ~ 1），挡板按拖动幅度比例调速，可精细微操
 * - 支持四周移动（水平 + 垂直），与键盘行为一致
 *
 * 暴露 `dx` / `dy` 归一化值（-1 ~ 1），E_Tablet 每子步读取。
 */
export class TouchController {
    /** 水平移动意图 (-1=左，1=右，0=不动) */
    dx = 0;

    /** 垂直移动意图 (-1=上，1=下，0=不动) */
    dy = 0;

    /** 是否有触摸活动 */
    active = false;

    /**
     * 摇杆死区阈值（归一化值），小于此值视为无意图。
     * 0.08 ≈ 摇杆 60px 行程下约 4.8px 的微动即触发，移动端小幅操作也能立即响应。
     */
    private deadZone = 0.08;

    private w = 0;
    private h = 0;

    constructor() {
        // 不再绑定全局触摸事件，只通过 updateFromJoystick 接收虚拟摇杆输入
    }

    /** 挂载触摸监听（移动端已禁用，不再监听全屏触摸） */
    mount(): void {
        // 空操作：移动端只使用虚拟摇杆，避免与 UI 元素冲突
    }

    /** 更新视口尺寸（resize 时调用） */
    syncViewport(w: number, h: number): void {
        this.w = w;
        this.h = h;
    }

    /**
     * 来自虚拟摇杆的输入更新
     * @param dx 摇杆水平偏移（-1 ~ 1，摇杆自身已归一化）
     * @param dy 摇杆垂直偏移（-1 ~ 1，摇杆自身已归一化）
     */
    updateFromJoystick(dx: number, dy: number): void {
        // 应用死区过滤，输出连续模拟量（-1 ~ 1），允许挡板按拖动幅度比例调速
        this.dx = this.#applyDeadZone(dx);
        this.dy = this.#applyDeadZone(dy);

        // 更新活动状态
        this.active = this.dx !== 0 || this.dy !== 0;
    }

    /**
     * 直接设置移动意图（供 MobileAdapter 内部使用）
     * @param dx 水平意图（-1/0/1）
     * @param dy 垂直意图（-1/0/1）
     */
    setDirection(dx: number, dy: number): void {
        this.dx = Math.max(-1, Math.min(1, dx));
        this.dy = Math.max(-1, Math.min(1, dy));
        this.active = this.dx !== 0 || this.dy !== 0;
    }

    /**
     * 死区过滤 + 重新映射：死区内输出 0，死区外将剩余幅度平滑映射到 0 ~ 1。
     * 最后再开平方根，放大低幅度区间的输出，保证刚越过死区时挡板能立即启动，
     * 小幅推动也有足够速度追上弹球（线性映射下半推挡板速度低于球速，球容易落空）。
     */
    #applyDeadZone(v: number): number {
        const magnitude = Math.abs(v);
        if (magnitude < this.deadZone) return 0;
        const sign = v > 0 ? 1 : -1;
        const rescaled = (magnitude - this.deadZone) / (1 - this.deadZone);
        return sign * Math.sqrt(Math.min(1, rescaled));
    }

    destroy(): void {
        this.active = false;
        this.dx = 0;
        this.dy = 0;
    }
}

/** 全局单例 */
export const touchCtrl = new TouchController();
