/**
 * 音效管理器 —— 基于 Web Audio API 的合成音效系统。
 * 所有音效均在运行时合成，无需外部音频文件。
 * 支持 localStorage 持久化静音状态。
 */
export class SoundManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private _muted = false;

    /** 音量（0-1），仅控制音效，不影响主音量 */
    private _volume = 0.35;

    constructor() {
        // 从 localStorage 恢复静音状态
        try {
            const stored = localStorage.getItem("ibouncy_sound_muted");
            if (stored !== null) {
                this._muted = stored === "true";
            }
        } catch {
            // localStorage 不可用时忽略
        }
    }

    get muted(): boolean {
        return this._muted;
    }

    /** 切换静音，返回新状态 */
    toggleMute(): boolean {
        return this.setMuted(!this._muted);
    }

    /** 设置静音状态，返回新状态 */
    setMuted(muted: boolean): boolean {
        this._muted = muted;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this._muted ? 0 : this._volume, this.ctx!.currentTime, 0.05);
        }
        // 持久化到 localStorage
        try {
            localStorage.setItem("ibouncy_sound_muted", String(this._muted));
        } catch {
            // 忽略
        }
        return this._muted;
    }

    /** 确保 AudioContext 已初始化（需在用户手势后调用） */
    ensure(): void {
        if (this.ctx) return;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this._muted ? 0 : this._volume;
        this.masterGain.connect(this.ctx.destination);
    }

    /** 反弹音 —— 短促清脆的叮声 */
    playBounce(): void {
        if (!this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.06);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    /** 得分音 —— 清脆的上升音 */
    playScore(): void {
        if (!this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.14);
    }

    /** 胜利音 —— 欢快的三音上行 */
    playWin(): void {
        if (!this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
        for (let i = 0; i < notes.length; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + i * 0.15;

            osc.type = "sine";
            osc.frequency.setValueAtTime(notes[i], t);

            gain.gain.setValueAtTime(0, t);
            gain.gain.setValueAtTime(0.15, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

            osc.connect(gain).connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.35);
        }
    }

    /** 失败音 —— 沮丧的下行旋律 */
    playLose(): void {
        if (!this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const notes = [440, 349.23, 277.18]; // A4 F4 C#4
        for (let i = 0; i < notes.length; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + i * 0.2;

            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(notes[i], t);

            gain.gain.setValueAtTime(0, t);
            gain.gain.setValueAtTime(0.08, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

            osc.connect(gain).connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.4);
        }
    }

    /** 开始音 —— 短促有力的启动声 */
    playStart(): void {
        if (!this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;

        // 低频"咚"声
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(220, now);
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.connect(gain1).connect(this.masterGain);
        osc1.start(now);
        osc1.stop(now + 0.15);

        // 高频"叮"声
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1760, now + 0.04);
        gain2.gain.setValueAtTime(0.06, now + 0.04);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc2.connect(gain2).connect(this.masterGain);
        osc2.start(now + 0.04);
        osc2.stop(now + 0.25);
    }

    /** 倒计时警告音 —— 紧张的滴答声 */
    playCountdown(): void {
        if (!this.ctx || !this.masterGain) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(1200, now);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.setValueAtTime(0, now + 0.08);
        gain.gain.setValueAtTime(0.04, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    destroy(): void {
        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
            this.masterGain = null;
        }
    }
}

/** 全局单例 */
export const soundManager = new SoundManager();
