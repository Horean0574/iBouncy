/**
 * Replay System - Records and plays back game sessions
 *
 * Records minimal state per frame to enable efficient storage and playback.
 * State includes ball/tablet positions/velocities, score, combo, timing.
 */

import { Ball, Tablet } from "./instances";
import { evBus, GEV } from "../events";

export interface FrameState {
    /** Frame timestamp for timing reconstruction */
    timestamp: number;
    /** Ball position and velocity */
    ball: { x: number; y: number; vx: number; vy: number };
    /** Tablet position and velocity */
    tablet: { x: number; y: number; vx: number; vy: number };
    /** Current score */
    score: number;
    /** Current combo count */
    combo: number;
    /** Current score multiplier */
    multiplier: number;
    /** Remaining time */
    remaining: number;
}

export interface ReplayMetadata {
    /** Unique replay ID */
    id: string;
    /** Timestamp when replay was recorded */
    recordedAt: number;
    /** Final score */
    score: number;
    /** Whether the game was won */
    win: boolean;
    /** Duration in seconds */
    duration: number;
    /** Number of frames recorded */
    frameCount: number;
}

export interface ReplayData {
    metadata: ReplayMetadata;
    frames: FrameState[];
}

export class ReplayRecorder {
    private isRecording = false;
    private frames: FrameState[] = [];
    private startTime = 0;
    private scoreSource: () => number = () => 0;
    private comboSource: () => { combo: number; multiplier: number } = () => ({ combo: 0, multiplier: 1 });
    private timingSource: () => number = () => 0;

    constructor() {
        this.#setupEventListeners();
    }

    #setupEventListeners(): void {
        evBus.on(GEV.GAME_START, () => this.startRecording());
        evBus.on(GEV.GAME_OVER, (payload) => this.stopRecording(payload));
    }

    setScoreSource(source: () => number): void {
        this.scoreSource = source;
    }

    setComboSource(source: () => { combo: number; multiplier: number }): void {
        this.comboSource = source;
    }

    setTimingSource(source: () => number): void {
        this.timingSource = source;
    }

    startRecording(): void {
        this.isRecording = true;
        this.frames = [];
        this.startTime = performance.now();
    }

    stopRecording(payload: { win: boolean; score: number }): void {
        if (!this.isRecording) return;
        this.isRecording = false;

        const duration = (performance.now() - this.startTime) / 1000;
        const replayData: ReplayData = {
            metadata: {
                id: this.#generateId(),
                recordedAt: Date.now(),
                score: payload.score,
                win: payload.win,
                duration,
                frameCount: this.frames.length,
            },
            frames: [...this.frames],
        };

        this.#saveReplay(replayData);
    }

    recordFrame(): void {
        if (!this.isRecording) return;

        const state: FrameState = {
            timestamp: performance.now() - this.startTime,
            ball: {
                x: (Ball as any).cx,
                y: (Ball as any).cy,
                vx: Ball.vx,
                vy: Ball.vy,
            },
            tablet: {
                x: (Tablet as any).cx,
                y: (Tablet as any).y,
                vx: Tablet.vx,
                vy: Tablet.vy,
            },
            score: this.scoreSource(),
            combo: this.comboSource().combo,
            multiplier: this.comboSource().multiplier,
            remaining: this.timingSource(),
        };

        this.frames.push(state);
    }

    #generateId(): string {
        return `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    #saveReplay(data: ReplayData): void {
        try {
            const replays = this.#loadAllReplays();
            replays.push(data);
            // Keep only last 10 replays to manage storage
            if (replays.length > 10) {
                replays.shift();
            }
            localStorage.setItem("ibouncy_replays", JSON.stringify(replays));
        } catch (e) {
            console.error("Failed to save replay:", e);
        }
    }

    #loadAllReplays(): ReplayData[] {
        try {
            const data = localStorage.getItem("ibouncy_replays");
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Failed to load replays:", e);
            return [];
        }
    }

    getReplays(): ReplayData[] {
        return this.#loadAllReplays();
    }

    deleteReplay(id: string): void {
        try {
            const replays = this.#loadAllReplays();
            const filtered = replays.filter((r) => r.metadata.id !== id);
            localStorage.setItem("ibouncy_replays", JSON.stringify(filtered));
        } catch (e) {
            console.error("Failed to delete replay:", e);
        }
    }

    clearAllReplays(): void {
        try {
            localStorage.removeItem("ibouncy_replays");
        } catch (e) {
            console.error("Failed to clear replays:", e);
        }
    }

    exportReplay(replayId: string): void {
        try {
            const replays = this.#loadAllReplays();
            const replay = replays.find((r) => r.metadata.id === replayId);
            if (!replay) {
                console.error("Replay not found:", replayId);
                return;
            }

            const dataStr = JSON.stringify(replay, null, 2);
            const dataBlob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `ibouncy_replay_${replay.metadata.id}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Failed to export replay:", e);
        }
    }

    async importReplay(file: File): Promise<ReplayData | null> {
        try {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target?.result as string);
                        if (this.#validateReplayData(data)) {
                            this.#saveReplay(data);
                            resolve(data);
                        } else {
                            console.error("Invalid replay data format");
                            resolve(null);
                        }
                    } catch (e) {
                        console.error("Failed to parse replay file:", e);
                        resolve(null);
                    }
                };
                reader.onerror = () => {
                    console.error("Failed to read replay file");
                    resolve(null);
                };
                reader.readAsText(file);
            });
        } catch (e) {
            console.error("Failed to import replay:", e);
            return null;
        }
    }

    #validateReplayData(data: any): data is ReplayData {
        return (
            data &&
            data.metadata &&
            typeof data.metadata.id === "string" &&
            typeof data.metadata.score === "number" &&
            typeof data.metadata.win === "boolean" &&
            data.frames &&
            Array.isArray(data.frames) &&
            data.frames.length > 0
        );
    }
}

export class ReplayPlayer {
    private isPlaying = false;
    private isPaused = false;
    private currentFrame = 0;
    private replayData: ReplayData | null = null;
    private playbackSpeed = 1;
    private lastFrameTime = 0;
    private onFrameUpdate?: (state: FrameState) => void;
    private onPlaybackEnd?: () => void;

    constructor() {
        this.#setupEventListeners();
    }

    #setupEventListeners(): void {
        // Will be integrated with game loop
    }

    setFrameUpdateCallback(callback: (state: FrameState) => void): void {
        this.onFrameUpdate = callback;
    }

    setPlaybackEndCallback(callback: () => void): void {
        this.onPlaybackEnd = callback;
    }

    loadReplay(replayId: string): boolean {
        const replays = new ReplayRecorder().getReplays();
        const replay = replays.find((r) => r.metadata.id === replayId);
        if (!replay) return false;

        this.replayData = replay;
        this.currentFrame = 0;
        this.lastFrameTime = performance.now();
        return true;
    }

    start(): void {
        if (!this.replayData) return;
        this.isPlaying = true;
        this.isPaused = false;
        this.currentFrame = 0;
        this.lastFrameTime = performance.now();
    }

    pause(): void {
        this.isPaused = true;
    }

    resume(): void {
        if (!this.isPlaying) return;
        this.isPaused = false;
        this.lastFrameTime = performance.now();
    }

    stop(): void {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentFrame = 0;
    }

    setPlaybackSpeed(speed: number): void {
        this.playbackSpeed = Math.max(0.25, Math.min(4, speed));
    }

    seekToFrame(frameIndex: number): void {
        if (!this.replayData) return;
        this.currentFrame = Math.max(0, Math.min(frameIndex, this.replayData.frames.length - 1));
        this.lastFrameTime = performance.now();
    }

    seekToProgress(progress: number): void {
        if (!this.replayData) return;
        const frameIndex = Math.floor(progress * (this.replayData.frames.length - 1));
        this.seekToFrame(frameIndex);
    }

    update(): void {
        if (!this.isPlaying || this.isPaused || !this.replayData) return;

        const now = performance.now();
        const elapsed = (now - this.lastFrameTime) * this.playbackSpeed;
        const targetFrameTime = 1000 / 60; // Assuming 60fps recording

        if (elapsed >= targetFrameTime) {
            this.lastFrameTime = now;

            if (this.currentFrame < this.replayData.frames.length) {
                const frame = this.replayData.frames[this.currentFrame];
                this.onFrameUpdate?.(frame);
                this.currentFrame++;
            } else {
                this.onPlaybackEnd?.();
                this.stop();
            }
        }
    }

    getCurrentFrame(): FrameState | null {
        if (!this.replayData || this.currentFrame >= this.replayData.frames.length) return null;
        return this.replayData.frames[this.currentFrame];
    }

    getProgress(): number {
        if (!this.replayData || this.replayData.frames.length === 0) return 0;
        return this.currentFrame / this.replayData.frames.length;
    }

    getMetadata(): ReplayMetadata | null {
        return this.replayData?.metadata ?? null;
    }

    isPlayingReplay(): boolean {
        return this.isPlaying;
    }

    isReplayPaused(): boolean {
        return this.isPaused;
    }
}
