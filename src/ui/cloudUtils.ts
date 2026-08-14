/**
 * Shared DOM and formatting utilities for the cloud UI overlay.
 */
import * as cloud from "../cloud/client";

/** Create a typed HTML element with optional class name. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
    const n = document.createElement(tag);
    if (className) n.className = className;
    return n;
}

/** Format a score (stored as score*10) to "N.N". */
export function fmtScore(score10: number): string {
    const v = Math.round(score10);
    const int = Math.floor(v / 10);
    const dec = Math.abs(v % 10);
    return `${int}.${dec}`;
}

/** Format an ISO date string to locale. */
export function fmtTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
}

/** Sum an array of numbers. */
export function sum(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0);
}

/**
 * Build an SVG sparkline from a numeric series.
 * Returns an inline `<svg>` element suitable for `.spark` containers.
 */
export function buildSparkline(
    values: number[],
    stroke = "rgba(155,155,255,0.85)",
    fill = "rgba(155,155,255,0.14)",
): SVGSVGElement {
    const w = 600;
    const h = 120;
    const pad = 10;
    const max = Math.max(1, ...values);
    const min = Math.min(...values);
    const span = Math.max(1, max - min);
    const n = Math.max(2, values.length);
    const dx = (w - pad * 2) / (n - 1);

    const pts = values.map((v, i) => {
        const x = pad + dx * i;
        const t = (v - min) / span;
        const y = pad + (1 - t) * (h - pad * 2);
        return { x, y };
    });

    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const area = `${d} L ${(pad + dx * (n - 1)).toFixed(1)} ${(h - pad).toFixed(1)} L ${pad.toFixed(1)} ${(h - pad).toFixed(1)} Z`;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.width = "100%";
    svg.style.height = "100%";

    const pathArea = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathArea.setAttribute("d", area);
    pathArea.setAttribute("fill", fill);
    pathArea.setAttribute("stroke", "none");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", stroke);
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");

    svg.appendChild(pathArea);
    svg.appendChild(path);
    return svg;
}

/** Create a liquid glass ripple effect on a button click. */
export function addRippleEffect(button: HTMLElement, e?: MouseEvent): void {
    const ripple = document.createElement("span");
    ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle,
            rgba(160,220,255,0.40) 0%,
            rgba(120,200,240,0.18) 35%,
            rgba(94,234,212,0.10) 55%,
            transparent 70%
        );
        transform: scale(0);
        animation: glassRipple 0.6s ease-out;
        pointer-events: none;
    `;

    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.5;
    ripple.style.width = ripple.style.height = `${size}px`;

    if (e) {
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    } else {
        ripple.style.left = `${rect.width / 2 - size / 2}px`;
        ripple.style.top = `${rect.height / 2 - size / 2}px`;
    }

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

/** Inject the `glassRipple` keyframes into the document (idempotent). */
export function addRippleStyle(): void {
    if (document.getElementById("ripple-style")) return;
    const style = document.createElement("style");
    style.id = "ripple-style";
    style.textContent = `
        @keyframes glassRipple {
            to {
                transform: scale(2.8);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Create a button with text and a loading spinner.
 * The ripple effect is automatically wired up.
 */
export function createButtonWithLoader(text: string, className: string): HTMLButtonElement {
    const btn = el("button", className);
    btn.type = "button";

    const textSpan = el("span", "btn-text");
    textSpan.textContent = text;

    const loader = el("span", "btn-loader");
    btn.appendChild(textSpan);
    btn.appendChild(loader);
    btn.addEventListener("click", (e) => addRippleEffect(btn, e));

    return btn;
}

// ---- Shared Types ----

export type SyncLocalResult = {
    uploaded: number;
    pendingAtStart: number;
    lastError?: string;
};

export type ModalType = "none" | "auth" | "history" | "leaderboard" | "forgot" | "reset";
export type AuthMode = "login" | "register";

/** Shared mutable state carried through the cloud UI system. */
export interface CloudUIContext {
    user: cloud.CloudUser | null;
    mode: AuthMode;
    modal: ModalType;
    busy: boolean;
    fab: HTMLDivElement;
    badge: HTMLSpanElement;
    btnAuth: HTMLButtonElement;
    btnLeaderboard: HTMLButtonElement;
    btnHistory: HTMLButtonElement;
    btnLogout: HTMLButtonElement;
    backdrop: HTMLDivElement;
    modalBox: HTMLDivElement;
    successToast: HTMLDivElement;
}
