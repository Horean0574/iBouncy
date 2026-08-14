/**
 * 移动端适配模块
 *
 * 功能：
 * 1. 检测设备是否为非电脑设备（Android、iOS、Harmony OS）
 * 2. 检测横竖屏状态，提示用户横屏体验更佳
 * 3. 检测键盘可用性，无键盘时提供虚拟摇杆
 * 4. 无键盘时提供虚拟操作按键（替代空格/回车/R 等）
 */

import { touchCtrl } from "./TouchController";
import { virtualButtons } from "./VirtualActionButtons";

export type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";
export type OrientationType = "portrait" | "landscape";

export interface MobileAdapterConfig {
    /** 是否启用横屏提示 */
    enableOrientationPrompt: boolean;
    /** 是否启用虚拟摇杆 */
    enableVirtualJoystick: boolean;
    /** 横屏提示文本（支持 HTML） */
    orientationPromptMessage: string;
    /** 虚拟摇杆位置：'bottom-left' | 'bottom-right' | 'bottom-center' */
    joystickPosition: "bottom-left" | "bottom-right" | "bottom-center";
}

const DEFAULT_CONFIG: MobileAdapterConfig = {
    enableOrientationPrompt: true,
    enableVirtualJoystick: true,
    orientationPromptMessage: `
        <div class="orientation-prompt-content">
            <div class="orientation-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
                </svg>
            </div>
            <h3>横屏体验更佳</h3>
            <p>请旋转设备以获得最佳游戏体验</p>
            <button class="orientation-dismiss-btn">继续</button>
        </div>
    `,
    joystickPosition: "bottom-left",
};

export class MobileAdapter {
    /** 设备类型 */
    private deviceType: DeviceType = "unknown";

    /** 当前屏幕方向 */
    private orientation: OrientationType = "landscape";

    /** 是否有物理键盘 */
    private hasPhysicalKeyboard = false;

    /** 配置 */
    private config: MobileAdapterConfig = { ...DEFAULT_CONFIG };

    /** 横屏提示元素 */
    private orientationPromptEl: HTMLElement | null = null;

    /** 虚拟摇杆容器 */
    private joystickContainer: HTMLElement | null = null;

    /** 是否已初始化 */
    private initialized = false;

    /** 方向锁定状态 */
    private orientationLocked = false;

    /** 横屏提示被Dismiss 状态 */
    private orientationPromptDismissed = false;

    /** 键盘检测事件监听器引用，用于移除 */
    private keyboardDetectHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor() {
        this.#detectDeviceType();
        this.#detectOrientation();
        this.#detectKeyboard();
    }

    /**
     * 初始化移动端适配
     */
    mount(config?: Partial<MobileAdapterConfig>): void {
        if (this.initialized) {
            return;
        }

        if (config) {
            this.config = { ...this.config, ...config };
        }

        this.initialized = true;

        console.log(
            `[MobileAdapter] Initialized - Device: ${this.deviceType}, Orientation: ${this.orientation}, HasKeyboard: ${this.hasPhysicalKeyboard}`,
        );

        if (this.deviceType !== "desktop") {
            this.#setupOrientationListener();
            this.#setupKeyboardDetection();
            this.#setupVirtualControls();

            if (
                this.config.enableOrientationPrompt &&
                this.orientation === "portrait" &&
                !this.orientationPromptDismissed
            ) {
                this.#showOrientationPrompt();
            }
        }
    }

    /**
     * 检测设备类型
     */
    #detectDeviceType(): void {
        const ua = navigator.userAgent || navigator.vendor;
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|windows phone|harmonyos/i.test(ua);
        const isTablet =
            /iPad|Android(?!.*Mobile)/i.test(ua) ||
            (/Android/i.test(ua) && window.innerWidth > 600 && window.innerHeight > 600);

        if (isTablet) {
            this.deviceType = "tablet";
        } else if (isMobile) {
            this.deviceType = "mobile";
        } else {
            const isTouchDevice = "ontouchstart" in window && navigator.maxTouchPoints > 0;
            this.deviceType = isTouchDevice ? "tablet" : "desktop";
        }

        console.log(`[MobileAdapter] Device type detected: ${this.deviceType}`);
    }

    /**
     * 检测屏幕方向
     */
    #detectOrientation(): void {
        const isPortrait = window.matchMedia("(orientation: portrait)").matches;
        this.orientation = isPortrait ? "portrait" : "landscape";

        console.log(`[MobileAdapter] Initial orientation: ${this.orientation}`);
    }

    /**
     * 初始检测物理键盘
     */
    #detectKeyboard(): void {
        if (this.deviceType === "mobile" || this.deviceType === "tablet") {
            this.hasPhysicalKeyboard = false;
        } else {
            this.hasPhysicalKeyboard = true;
        }
    }

    /**
     * 运行时检测物理键盘：监听全局 keydown 事件。
     * 当在移动/平板设备上检测到按键时，说明连接了物理键盘，
     * 此时隐藏虚拟摇杆和虚拟操作按键。
     */
    #setupKeyboardDetection(): void {
        this.keyboardDetectHandler = (_e: KeyboardEvent) => {
            if (!this.hasPhysicalKeyboard) {
                this.hasPhysicalKeyboard = true;
                console.log("[MobileAdapter] Physical keyboard detected, hiding virtual controls");
                this.#hideVirtualControls();
            }
        };
        document.addEventListener("keydown", this.keyboardDetectHandler);
    }

    /**
     * 设置虚拟控制器（摇杆 + 操作按键）
     */
    #setupVirtualControls(): void {
        if (!this.needsVirtualController()) return;

        if (this.config.enableVirtualJoystick) {
            this.#setupVirtualJoystick();
        }

        // 挂载虚拟操作按键
        virtualButtons.mount();
        virtualButtons.show();

        console.log("[MobileAdapter] Virtual controls enabled");
    }

    /**
     * 隐藏所有虚拟控制器（检测到物理键盘时调用）
     */
    #hideVirtualControls(): void {
        // 隐藏虚拟摇杆
        if (this.joystickContainer) {
            this.joystickContainer.remove();
            this.joystickContainer = null;
            console.log("[MobileAdapter] Virtual joystick removed");
        }

        // 隐藏虚拟操作按键
        virtualButtons.hide();
    }

    /**
     * 设置屏幕方向监听
     */
    #setupOrientationListener(): void {
        const mediaQuery = window.matchMedia("(orientation: portrait)");

        const handleChange = (e: MediaQueryListEvent) => {
            const newOrientation = e.matches ? "portrait" : "landscape";
            if (newOrientation !== this.orientation) {
                this.orientation = newOrientation;
                console.log(`[MobileAdapter] Orientation changed to: ${this.orientation}`);

                if (
                    this.config.enableOrientationPrompt &&
                    this.orientation === "portrait" &&
                    !this.orientationPromptDismissed
                ) {
                    this.#showOrientationPrompt();
                }
            }
        };

        mediaQuery.addEventListener("change", handleChange);
    }

    /**
     * 显示横屏提示
     */
    #showOrientationPrompt(): void {
        if (this.orientationPromptEl || this.orientation === "landscape") {
            return;
        }

        const overlay = document.createElement("div");
        overlay.className = "orientation-prompt-overlay";
        overlay.innerHTML = this.config.orientationPromptMessage;

        const dismissBtn = overlay.querySelector(".orientation-dismiss-btn") as HTMLButtonElement;
        if (dismissBtn) {
            dismissBtn.addEventListener("click", () => {
                this.orientationPromptDismissed = true;
                this.#hideOrientationPrompt();
            });
        }

        document.body.appendChild(overlay);
        this.orientationPromptEl = overlay;

        document.body.style.overflow = "hidden";

        console.log("[MobileAdapter] Orientation prompt shown");
    }

    /**
     * 隐藏横屏提示
     */
    #hideOrientationPrompt(): void {
        if (!this.orientationPromptEl) {
            return;
        }

        this.orientationPromptEl.remove();
        this.orientationPromptEl = null;
        document.body.style.overflow = "";

        console.log("[MobileAdapter] Orientation prompt dismissed");
    }

    /**
     * 设置虚拟摇杆
     */
    #setupVirtualJoystick(): void {
        const joystick = document.createElement("div");
        joystick.className = `virtual-joystick joystick-${this.config.joystickPosition}`;
        joystick.innerHTML = `
            <div class="joystick-base">
                <div class="joystick-stick"></div>
            </div>
        `;

        document.body.appendChild(joystick);
        this.joystickContainer = joystick;

        this.#bindJoystickEvents(joystick);

        console.log("[MobileAdapter] Virtual joystick enabled");
    }

    /**
     * 绑定摇杆触摸事件。
     *
     * 使用 Pointer Events + setPointerCapture：
     * - 手指按下后即使拖出摇杆元素也能持续收到 pointermove，不再丢事件
     * - 用 pointerId 锁定首个触摸手指，忽略手掌/其他手指误触
     * - 同时覆盖触摸屏、触控笔与鼠标，移除对 touch/mouse 双套监听的依赖
     */
    #bindJoystickEvents(joystick: HTMLElement): void {
        const stick = joystick.querySelector(".joystick-stick") as HTMLElement;
        const base = joystick.querySelector(".joystick-base") as HTMLElement;
        if (!stick || !base) return;

        let active = false;
        let pointerId = -1;
        let startX = 0;
        let startY = 0;
        // 摇杆最大行程：与 base 尺寸匹配（小屏 base 112 半径 56），行程大则控制更精细
        const maxRadius = 60;
        // CSS 中 stick 以自身中心为锚点（translate(-50%,-50%)），JS 位移必须保留该居中偏移，
        // 否则 stick 视觉位置会偏右下且松手后无法回中。
        const resetStick = () => (stick.style.transform = "translate(-50%, -50%)");

        const applyStick = (clientX: number, clientY: number): void => {
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            const distance = Math.min(Math.hypot(deltaX, deltaY), maxRadius);
            const angle = Math.atan2(deltaY, deltaX);

            const stickX = Math.cos(angle) * distance;
            const stickY = Math.sin(angle) * distance;

            stick.style.transform = `translate(${stickX}px, ${stickY}px) translate(-50%, -50%)`;

            touchCtrl.updateFromJoystick(stickX / maxRadius, stickY / maxRadius);
        };

        const handlePointerDown = (e: PointerEvent) => {
            // 已有手指在控制时忽略新的指针（多指/手掌误触）
            if (active) return;
            e.preventDefault();
            e.stopPropagation();
            active = true;
            pointerId = e.pointerId;

            try {
                // 捕获指针，手指移出摇杆元素后仍持续收到 pointermove/pointerup
                joystick.setPointerCapture(pointerId);
            } catch {
                // 某些环境不支持捕获时退化为普通事件流
            }

            const rect = base.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
            stick.classList.add("active");
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!active || e.pointerId !== pointerId) return;
            e.preventDefault();
            applyStick(e.clientX, e.clientY);
        };

        const handlePointerEnd = (e: PointerEvent) => {
            if (!active || e.pointerId !== pointerId) return;
            e.preventDefault();
            active = false;
            pointerId = -1;
            stick.classList.remove("active");
            resetStick();
            touchCtrl.updateFromJoystick(0, 0);
        };

        joystick.addEventListener("pointerdown", handlePointerDown);
        joystick.addEventListener("pointermove", handlePointerMove);
        joystick.addEventListener("pointerup", handlePointerEnd);
        joystick.addEventListener("pointercancel", handlePointerEnd);
    }

    /**
     * 获取设备类型
     */
    getDeviceType(): DeviceType {
        return this.deviceType;
    }

    /**
     * 获取当前方向
     */
    getOrientation(): OrientationType {
        return this.orientation;
    }

    /**
     * 是否有物理键盘
     */
    hasKeyboard(): boolean {
        return this.hasPhysicalKeyboard;
    }

    /**
     * 是否需要虚拟控制器
     */
    needsVirtualController(): boolean {
        return (this.deviceType === "mobile" || this.deviceType === "tablet") && !this.hasPhysicalKeyboard;
    }

    /**
     * 销毁
     */
    destroy(): void {
        if (this.orientationPromptEl) {
            this.#hideOrientationPrompt();
        }
        if (this.joystickContainer) {
            this.joystickContainer.remove();
            this.joystickContainer = null;
        }
        if (this.keyboardDetectHandler) {
            document.removeEventListener("keydown", this.keyboardDetectHandler);
            this.keyboardDetectHandler = null;
        }
        virtualButtons.destroy();
        this.initialized = false;
    }
}

/** 全局单例 */
export const mobileAdapter = new MobileAdapter();
