/**
 * Cloud UI overlay initialization and state management.
 *
 * Orchestrates the FAB, auth/history/leaderboard modals, keyboard
 * shortcuts, sound toggle, and background sync.  Rendering is delegated to
 * {@link ./cloudModals} while utilities live in {@link ./cloudUtils}.
 */
import * as cloud from "../cloud/client";
import { markSynced, pendingLocalScores } from "../cloud/localScores";
import { eventBus, GEV } from "../events";
import { type SyncLocalResult, type CloudUIContext, el, addRippleEffect, addRippleStyle } from "./cloudUtils";
import { type ModalHelpers, renderAuthModal, renderHistoryModal, renderLeaderboardModal } from "./cloudModals";
import { soundManager } from "../audio/SoundManager";
import { t } from "../i18n";

export type { SyncLocalResult } from "./cloudUtils";

export function initCloudOverlay(): {
    refresh: () => Promise<void>;
    openAuth: () => void;
    openHistory: () => void;
    openLeaderboard: () => void;
    syncLocalToCloud: () => Promise<SyncLocalResult>;
    getUser: () => cloud.CloudUser | null;
} {
    addRippleStyle();

    const root = document.querySelector("#cloud-ui-root") as HTMLDivElement | null;
    if (!root) {
        return {
            refresh: async () => void 0,
            openAuth: () => void 0,
            openHistory: () => void 0,
            openLeaderboard: () => void 0,
            syncLocalToCloud: async () => ({ uploaded: 0, pendingAtStart: 0 }),
            getUser: () => null,
        };
    }

    // ---- Sound toggle button ----
    const soundBtn = el("button", "sound-toggle-btn");
    soundBtn.type = "button";
    soundBtn.title = t("cloudOverlay.soundToggle");
    root.appendChild(soundBtn);
    updateSoundIcon();

    soundBtn.addEventListener("click", (_e) => {
        soundManager.toggleMute();
        updateSoundIcon();
    });

    function updateSoundIcon(): void {
        const muted = soundManager.muted;
        soundBtn.innerHTML = muted ? SOUND_OFF_SVG_STR : SOUND_ON_SVG_STR;
        soundBtn.setAttribute("aria-label", muted ? t("cloudOverlay.soundOn") : t("cloudOverlay.soundOff"));
    }

    // ---- Mutable state ----
    const ctx: CloudUIContext = {
        user: null,
        mode: "login",
        modal: "none",
        busy: false,
        fab: el("div", "cloud-fab"),
        badge: el("span", "badge"),
        btnAuth: el("button", "btn primary"),
        btnLeaderboard: el("button", "btn"),
        btnHistory: el("button", "btn"),
        btnLogout: el("button", "btn danger"),
        backdrop: el("div", "modal-backdrop"),
        modalBox: el("div", "modal"),
        successToast: el("div", "success-toast"),
    };

    ctx.btnAuth.type = "button";
    ctx.btnLeaderboard.type = "button";
    ctx.btnHistory.type = "button";
    ctx.btnLogout.type = "button";
    ctx.backdrop.appendChild(ctx.modalBox);
    ctx.successToast.textContent = t("cloudOverlay.successToast");
    root.appendChild(ctx.successToast);
    root.appendChild(ctx.fab);
    root.appendChild(ctx.backdrop);

    // ---- Helpers exposed to modal renderers ----
    const helpers: ModalHelpers = {
        renderFab,
        syncLocalToCloud,
        showSuccess,
        setError,
        setBackdropOpen,
    };

    // ---- Game-state FAB & sound button visibility ----
    const hideGameUI = () => {
        ctx.fab.classList.add("cloud-fab--game-hidden");
        soundBtn.classList.add("sound-toggle-btn--hidden");
    };
    const showGameUI = () => {
        ctx.fab.classList.remove("cloud-fab--game-hidden");
        soundBtn.classList.remove("sound-toggle-btn--hidden");
    };

    eventBus.on(GEV.GAME_START, hideGameUI);
    eventBus.on(GEV.GAME_OVER, showGameUI);

    // 回放期间隐藏云端 FAB（回放浮岛已有完整控件）
    window.addEventListener("ibouncy:replay-start", () => {
        ctx.fab.classList.add("cloud-fab--game-hidden");
        soundBtn.classList.add("sound-toggle-btn--hidden");
    });
    window.addEventListener("ibouncy:replay-end", () => {
        ctx.fab.classList.remove("cloud-fab--game-hidden");
        soundBtn.classList.remove("sound-toggle-btn--hidden");
    });

    // ---- Toast & error ----
    function showSuccess(message: string): void {
        ctx.successToast.textContent = message;
        ctx.successToast.classList.add("show");
        setTimeout(() => ctx.successToast.classList.remove("show"), 2500);
    }

    function setError(msg: string | null): void {
        const n = ctx.modalBox.querySelector(".error") as HTMLDivElement | null;
        if (!n) return;
        if (!msg) {
            n.textContent = "";
            n.classList.remove("show");
            return;
        }
        n.textContent = msg;
        n.classList.add("show");
        setTimeout(() => {
            if (n.textContent === msg) {
                n.textContent = "";
                n.classList.remove("show");
            }
        }, 5000);
    }

    function setBackdropOpen(open: boolean): void {
        if (open) {
            ctx.backdrop.classList.add("open");
            ctx.backdrop.classList.remove("closing");
            document.body.style.overflow = "hidden";
        } else {
            ctx.backdrop.classList.add("closing");
            setTimeout(() => {
                ctx.backdrop.classList.remove("open", "closing");
                ctx.modal = "none";
                setError(null);
            }, 300);
            document.body.style.overflow = "";
        }
    }

    // ---- FAB rendering ----
    function renderFab(): void {
        ctx.fab.replaceChildren();
        const pill = el("div", "pill");
        pill.replaceChildren();

        if (!ctx.user) {
            ctx.badge.textContent = t("cloudOverlay.notLoggedIn");
            ctx.btnLeaderboard.textContent = t("cloudOverlay.leaderboard");
            ctx.btnLeaderboard.onclick = (e) => {
                addRippleEffect(ctx.btnLeaderboard, e as MouseEvent);
                openLeaderboard();
            };
            ctx.btnAuth.textContent = t("cloudOverlay.loginRegister");
            ctx.btnAuth.onclick = (e) => {
                addRippleEffect(ctx.btnAuth, e as MouseEvent);
                openAuth();
            };
            pill.appendChild(ctx.badge);
            pill.appendChild(ctx.btnLeaderboard);
            pill.appendChild(ctx.btnAuth);
            ctx.fab.appendChild(pill);
            return;
        }

        ctx.badge.textContent = ctx.user.displayName;
        ctx.btnLeaderboard.textContent = t("cloudOverlay.leaderboard");
        ctx.btnLeaderboard.onclick = (e) => {
            addRippleEffect(ctx.btnLeaderboard, e as MouseEvent);
            openLeaderboard();
        };
        ctx.btnHistory.textContent = t("cloudOverlay.history");
        ctx.btnLogout.textContent = t("cloudOverlay.logout");
        ctx.btnAuth.textContent = t("cloudOverlay.switchAccount");

        ctx.btnHistory.onclick = (e) => {
            addRippleEffect(ctx.btnHistory, e as MouseEvent);
            openHistory();
        };
        ctx.btnLogout.onclick = async (e) => {
            addRippleEffect(ctx.btnLogout, e as MouseEvent);
            if (ctx.busy) return;
            ctx.busy = true;
            ctx.btnLogout.classList.add("loading");
            try {
                await cloud.logout();
                ctx.user = null;
                showSuccess(t("cloudOverlay.loggedOut"));
                renderFab();
            } catch (e) {
                console.error(e);
            } finally {
                ctx.busy = false;
                ctx.btnLogout.classList.remove("loading");
            }
        };
        ctx.btnAuth.onclick = (e) => {
            addRippleEffect(ctx.btnAuth, e as MouseEvent);
            openAuth();
        };

        pill.appendChild(ctx.badge);
        pill.appendChild(ctx.btnLeaderboard);
        pill.appendChild(ctx.btnHistory);
        pill.appendChild(ctx.btnAuth);
        pill.appendChild(ctx.btnLogout);
        ctx.fab.appendChild(pill);
    }

    // ---- Modal open helpers ----
    function openAuth(): void {
        ctx.mode = "login";
        renderAuthModal(ctx, helpers);
    }

    function openHistory(): void {
        void renderHistoryModal(ctx, helpers);
    }

    function openLeaderboard(): void {
        void renderLeaderboardModal(ctx, helpers);
    }

    // ---- Backdrop click & keyboard shortcuts ----
    ctx.backdrop.addEventListener("click", (e) => {
        if (e.target === ctx.backdrop) setBackdropOpen(false);
    });

    document.addEventListener("keydown", (e) => {
        const target = e.target as HTMLElement | null;
        const inInput = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
        if (inInput) return;
        if (e.key === "Escape" && ctx.modal !== "none") setBackdropOpen(false);
        if ((e.key === "l" || e.key === "L") && ctx.modal === "none") openAuth();
        if ((e.key === "h" || e.key === "H") && ctx.modal === "none") openHistory();
        if ((e.key === "b" || e.key === "B") && ctx.modal === "none") openLeaderboard();
        // M 键切换静音
        if ((e.key === "m" || e.key === "M") && ctx.modal === "none") {
            soundManager.toggleMute();
            updateSoundIcon();
        }
    });

    // ---- Background sync ----
    async function refresh(): Promise<void> {
        try {
            ctx.user = await cloud.me();
        } catch {
            ctx.user = null;
        }
        renderFab();
    }

    async function syncLocalToCloud(): Promise<SyncLocalResult> {
        if (!ctx.user) return { uploaded: 0, pendingAtStart: 0 };
        const pending = pendingLocalScores();
        if (pending.length === 0) return { uploaded: 0, pendingAtStart: 0 };

        let uploaded = 0;
        let lastError: string | undefined;
        for (const r of pending) {
            try {
                await cloud.addScore(r.score, r.clientId);
                markSynced(r.clientId);
                uploaded++;
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error("sync score failed:", e);
                lastError = msg;
            }
        }
        return { uploaded, pendingAtStart: pending.length, lastError };
    }

    void refresh();
    renderFab();

    return {
        refresh,
        openAuth,
        openHistory,
        openLeaderboard,
        syncLocalToCloud,
        getUser: () => ctx.user,
    };
}

// ---- Inline SVG icons for sound toggle ----
const SOUND_ON_SVG_STR = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9v6h5l5 3V6l-5 3H3z" fill="currentColor"/>
    <path d="M17 8c2 2 2 6 0 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M20 5c4 3 4 10 0 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

const SOUND_OFF_SVG_STR = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9v6h5l5 3V6l-5 3H3z" fill="currentColor"/>
    <line x1="17" y1="8" x2="22" y2="17" stroke="#f66" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="22" y1="8" x2="17" y2="17" stroke="#f66" stroke-width="2.2" stroke-linecap="round"/>
</svg>`;
