/**
 * 虚拟操作按键组件
 *
 * 为无物理键盘的用户（移动端/平板）提供屏幕按键，替代：
 * - 空格键：开始/重新开始/继续
 * - 回车键：返回主菜单
 * - Escape/P：暂停
 * - R：回放
 */

import { evBus, GEV } from "../events";
import { GP } from "../core/instances";
import { t } from "../i18n";

export type ButtonAction = "start" | "pause" | "resume" | "restart" | "menu" | "replay";

interface ButtonConfig {
    i18nKey: string;
    action: ButtonAction;
    className: string;
}

/** 获取指定状态的按键配置 */
function getButtonsForState(state: string): ButtonConfig[] | null {
    switch (state) {
        case "prepared":
            return [{ i18nKey: "virtualButtons.start", action: "start", className: "vb-start" }];
        case "playing":
            return [{ i18nKey: "virtualButtons.pause", action: "pause", className: "vb-pause" }];
        case "paused":
            return [
                { i18nKey: "virtualButtons.resume", action: "resume", className: "vb-resume" },
                { i18nKey: "virtualButtons.menu", action: "menu", className: "vb-menu" },
            ];
        case "over":
            return [
                { i18nKey: "virtualButtons.restart", action: "restart", className: "vb-restart" },
                { i18nKey: "virtualButtons.replay", action: "replay", className: "vb-replay" },
                { i18nKey: "virtualButtons.menu", action: "menu", className: "vb-menu" },
            ];
        default:
            return null;
    }
}

export class VirtualActionButtons {
    private container: HTMLElement | null = null;
    private buttonEls: Map<ButtonAction, HTMLElement> = new Map();
    private currentState: string | null = null;
    private visible = false;

    mount(): void {
        if (this.container) return;

        this.container = document.createElement("div");
        this.container.className = "virtual-action-buttons hidden";
        document.body.appendChild(this.container);

        this.#bindGameEvents();
    }

    show(): void {
        if (!this.container) return;
        this.visible = true;
        this.container.classList.remove("hidden");
        this.#updateButtons();
    }

    hide(): void {
        if (!this.container) return;
        this.visible = false;
        this.container.classList.add("hidden");
    }

    destroy(): void {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.buttonEls.clear();
    }

    #bindGameEvents(): void {
        evBus.on(GEV.GAME_PREPARED, () => this.#setState("prepared"));
        evBus.on(GEV.GAME_START, () => this.#setState("playing"));
        evBus.on(GEV.GAME_PAUSE, () => this.#setState("paused"));
        evBus.on(GEV.GAME_RESUME, () => this.#setState("playing"));
        evBus.on(GEV.GAME_OVER, () => this.#setState("over"));
        evBus.on(GEV.GAME_RESTART, () => this.#setState("playing"));
        evBus.on(GEV.GAME_RESET, () => this.#setState("prepared"));

        // 回放期间隐藏虚拟按键（回放浮岛有自己的控件）
        window.addEventListener("ibouncy:replay-start", () => {
            this.#setState("replay");
        });
    }

    #setState(state: string): void {
        if (this.currentState === state) return;
        this.currentState = state;
        if (this.visible) {
            this.#updateButtons();
        }
    }

    #updateButtons(): void {
        if (!this.container) return;

        this.container.innerHTML = "";
        this.buttonEls.clear();

        const buttons = getButtonsForState(this.currentState || "");
        if (!buttons || buttons.length === 0) return;

        for (const cfg of buttons) {
            const btn = this.#createButton(cfg);
            this.container.appendChild(btn);
            this.buttonEls.set(cfg.action, btn);
        }
    }

    #createButton(config: ButtonConfig): HTMLElement {
        const btn = document.createElement("button");
        btn.className = `vb-btn ${config.className}`;
        btn.textContent = t(config.i18nKey as any);
        btn.setAttribute("data-action", config.action);
        // 统一使用 pointerdown：覆盖鼠标、触摸、触控笔，避免 pointerdown + touchstart
        // 双监听在触摸设备上触发两次动作（如开始被连续执行两次）。
        btn.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.#handleAction(config.action);
        });
        return btn;
    }

    #handleAction(action: ButtonAction): void {
        switch (action) {
            case "start":
                GP.start();
                break;
            case "pause":
                GP.pause();
                break;
            case "resume":
                GP.resume();
                break;
            case "restart":
                GP.restart();
                break;
            case "menu":
                GP.prepared();
                break;
            case "replay":
                // 通过自定义事件通知 app.ts 处理回放
                window.dispatchEvent(new CustomEvent("ibouncy:replay-start"));
                break;
        }
    }
}

/** 全局单例 */
export const virtualButtons = new VirtualActionButtons();
