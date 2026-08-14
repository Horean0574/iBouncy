/**
 * DOM-based replay controls — replaces the cloud FAB pill during replay.
 *
 * Uses the same `.pill` glass-morphism style as the cloud FAB, positioned at
 * the same top-right location. Contains play/pause, progress bar, speed,
 * export, and exit controls.
 */
import { GP, Ball, Tablet, Timing } from "../core/instances";
import { Scoring } from "../ui/elements";
import { ReplayPlayer } from "../core/replay";
import { ReplayRecorder } from "../core/replay";
import { t } from "../i18n";

/* ── SVG icon strings ─────────────────────────────────────────── */
const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill="currentColor"/></svg>`;
const EXPORT_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const EXIT_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

export default class E_ReplayControls {
    private root: HTMLDivElement;
    private pill: HTMLDivElement;
    private playBtn: HTMLButtonElement;
    private progressTrack: HTMLDivElement;
    private progressFill: HTMLDivElement;
    private progressHandle: HTMLDivElement;
    private timeLabel: HTMLSpanElement;
    private speedBtn: HTMLButtonElement;
    private exportBtn: HTMLButtonElement;
    private exitBtn: HTMLButtonElement;

    private replayPlayer: ReplayPlayer;
    private currentReplayId: string | null = null;
    private isReplayMode = false;
    private isDragging = false;

    constructor() {
        /* ---- Build DOM ---- */
        this.root = document.querySelector("#cloud-ui-root") as HTMLDivElement;
        if (!this.root) throw new Error("#cloud-ui-root not found");

        // Outer wrapper (same positioning as .cloud-fab)
        this.pill = document.createElement("div");
        this.pill.className = "replay-fab";
        this.pill.innerHTML = `
            <div class="replay-pill">
                <button class="replay-btn replay-play-btn" type="button" title="${t("replayControls.play")}">${PLAY_SVG}</button>
                <div class="replay-progress">
                    <div class="replay-progress-track"></div>
                    <div class="replay-progress-fill"></div>
                    <div class="replay-progress-handle"></div>
                </div>
                <span class="replay-time">0:00 / 0:00</span>
                <button class="replay-btn replay-speed-btn" type="button">1.0x</button>
                <button class="replay-btn replay-export-btn" type="button" title="${t("replayControls.export")}">${EXPORT_SVG}</button>
                <button class="replay-btn replay-exit-btn" type="button" title="${t("replayControls.exit")}">${EXIT_SVG}</button>
            </div>
        `;
        this.root.appendChild(this.pill);

        // Cache element references
        const inner = this.pill.querySelector(".replay-pill") as HTMLDivElement;
        this.playBtn = inner.querySelector(".replay-play-btn") as HTMLButtonElement;
        this.progressTrack = inner.querySelector(".replay-progress-track") as HTMLDivElement;
        this.progressFill = inner.querySelector(".replay-progress-fill") as HTMLDivElement;
        this.progressHandle = inner.querySelector(".replay-progress-handle") as HTMLDivElement;
        this.timeLabel = inner.querySelector(".replay-time") as HTMLSpanElement;
        this.speedBtn = inner.querySelector(".replay-speed-btn") as HTMLButtonElement;
        this.exportBtn = inner.querySelector(".replay-export-btn") as HTMLButtonElement;
        this.exitBtn = inner.querySelector(".replay-exit-btn") as HTMLButtonElement;

        /* ---- ReplayPlayer ---- */
        this.replayPlayer = new ReplayPlayer();
        this.#setupCallbacks();
        this.#setupEvents();

        // Start hidden
        this.pill.classList.add("replay-fab--hidden");
    }

    /* ── Public API (same interface as before) ─────────────────── */

    show(): void {
        this.pill.classList.remove("replay-fab--hidden");
    }

    hide(): void {
        this.pill.classList.add("replay-fab--hidden");
    }

    loadReplay(replayId: string): boolean {
        const ok = this.replayPlayer.loadReplay(replayId);
        if (ok) {
            this.currentReplayId = replayId;
            this.isReplayMode = true;
            this.#updateProgressUI();
            const meta = this.replayPlayer.getMetadata();
            if (meta) {
                this.timeLabel.textContent = `0:00 / ${this.#fmtTime(Math.floor(meta.duration))}`;
            }
        }
        return ok;
    }

    startPlayback(): void {
        if (this.isReplayMode) {
            this.replayPlayer.start();
            this.#updatePlayIcon(true);
            // 回放时显示游戏元素
            Ball.setVisible(true);
            Tablet.setVisible(true);
        }
    }

    stopPlayback(): void {
        this.replayPlayer.stop();
        this.isReplayMode = false;
        this.#updatePlayIcon(false);
        // 退出回放后回到结算界面，隐藏游戏元素
        Ball.setVisible(false);
        Tablet.setVisible(false);
    }

    update(): void {
        if (this.isReplayMode) {
            this.replayPlayer.update();
        }
    }

    isPlaying(): boolean {
        return this.isReplayMode && this.replayPlayer.isPlayingReplay();
    }

    /** Remove DOM element (cleanup) */
    destroy(): void {
        this.pill.remove();
    }

    /* ── Private ───────────────────────────────────────────────── */

    #setupCallbacks(): void {
        // Play / Pause
        this.playBtn.addEventListener("click", () => {
            if (!this.replayPlayer.isPlayingReplay()) {
                if (this.isReplayMode) {
                    this.replayPlayer.start();
                    this.#updatePlayIcon(true);
                }
                return;
            }
            if (this.replayPlayer.isReplayPaused()) {
                this.replayPlayer.resume();
                this.#updatePlayIcon(true);
            } else {
                this.replayPlayer.pause();
                this.#updatePlayIcon(false);
            }
        });

        // Speed toggle
        const speeds = [0.5, 1, 1.5, 2];
        this.speedBtn.addEventListener("click", () => {
            const cur = (this.replayPlayer as any).playbackSpeed as number;
            const idx = speeds.indexOf(cur);
            const next = speeds[(idx + 1) % speeds.length];
            this.replayPlayer.setPlaybackSpeed(next);
            this.speedBtn.textContent = `${next.toFixed(1)}x`;
        });

        // Export
        this.exportBtn.addEventListener("click", () => {
            if (this.currentReplayId) {
                new ReplayRecorder().exportReplay(this.currentReplayId);
            }
        });

        // Exit
        this.exitBtn.addEventListener("click", () => {
            window.dispatchEvent(new CustomEvent("ibouncy:replay-end"));
            this.replayPlayer.stop();
            this.isReplayMode = false;
            this.#updatePlayIcon(false);
            this.hide();
            GP.prepared();
        });

        // Progress bar seeking
        const seekFromEvent = (e: PointerEvent) => {
            const rect = this.progressTrack.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const progress = Math.max(0, Math.min(1, x / rect.width));
            this.replayPlayer.seekToProgress(progress);
            this.#updateProgressUI();
        };

        this.progressTrack.addEventListener("pointerdown", (e) => {
            this.isDragging = true;
            seekFromEvent(e as PointerEvent);
        });
        this.progressHandle.addEventListener("pointerdown", (e) => {
            this.isDragging = true;
            seekFromEvent(e as PointerEvent);
        });

        window.addEventListener("pointermove", (e) => {
            if (this.isDragging) seekFromEvent(e as PointerEvent);
        });
        window.addEventListener("pointerup", () => {
            this.isDragging = false;
        });
    }

    #setupPlayerCallbacks(): void {
        // Frame update → apply state + update progress bar
        this.replayPlayer.setFrameUpdateCallback((state) => {
            this.#applyFrameState(state);
            this.#updateProgressUI();
        });

        // Playback ended — stay on the last frame, keep the pill for the user
        this.replayPlayer.setPlaybackEndCallback(() => {
            this.#updatePlayIcon(false);
        });
    }

    #setupEvents(): void {
        // Resize — not needed for DOM, CSS handles it
        // But we need to hook the player callbacks
        this.#setupPlayerCallbacks();
    }

    #updatePlayIcon(playing: boolean): void {
        this.playBtn.innerHTML = playing ? PAUSE_SVG : PLAY_SVG;
        this.playBtn.title = playing ? t("replayControls.pause") : t("replayControls.play");
    }

    #updateProgressUI(): void {
        const progress = this.replayPlayer.getProgress();
        const meta = this.replayPlayer.getMetadata();
        if (!meta) return;

        const pct = `${(progress * 100).toFixed(2)}%`;
        this.progressFill.style.width = pct;
        this.progressHandle.style.left = pct;

        const cur = Math.floor(progress * meta.duration);
        const total = Math.floor(meta.duration);
        this.timeLabel.textContent = `${this.#fmtTime(cur)} / ${this.#fmtTime(total)}`;
    }

    #fmtTime(sec: number): string {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    #applyFrameState(state: any): void {
        (Ball as any).cx = state.ball.x;
        (Ball as any).cy = state.ball.y;
        Ball.vx = state.ball.vx;
        Ball.vy = state.ball.vy;

        (Tablet as any).cx = state.tablet.x;
        (Tablet as any).y = state.tablet.y;
        Tablet.vx = state.tablet.vx;
        Tablet.vy = state.tablet.vy;

        (Scoring as any).assign_(state.score);
        (Scoring as any).updateCombo_(state.combo, state.multiplier);

        Timing.remaining = state.remaining;
    }
}
