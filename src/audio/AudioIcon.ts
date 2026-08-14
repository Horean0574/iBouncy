/**
 * 音频图标组件 —— 使用 Leafer 基本形状的扬声器图标。
 * 用于主菜单和暂停菜单显示音效开关状态。
 */
import { Group, Rect, Polygon } from "leafer-game";
import { soundManager } from "./SoundManager";

export default class AudioIcon extends Group {
    private body: Rect;
    private cone: Polygon;
    private waveGroup: Group;
    private muteGroup: Group;
    private _iconSize: number;

    constructor(iconSize: number = 32) {
        super({
            zIndex: 999,
            cursor: "pointer",
        });
        this._iconSize = iconSize;

        const s = iconSize / 24; // scale factor

        // 扬声器箱体
        this.body = new Rect({
            x: 3 * s,
            y: 8 * s,
            width: 5 * s,
            height: 8 * s,
            fill: "#CCCCCC",
            cornerRadius: 0.5,
        });

        // 锥形
        this.cone = new Polygon({
            points: [8 * s, 8 * s, 8 * s, 16 * s, 14 * s, 20 * s, 14 * s, 4 * s],
            fill: "#CCCCCC",
        });

        // 音波 (两条弧线用近似折线替代)
        const wave1 = new Polygon({
            points: [
                17 * s,
                9 * s,
                18.5 * s,
                8 * s,
                19 * s,
                9 * s,
                19 * s,
                11 * s,
                19 * s,
                13 * s,
                18.5 * s,
                14 * s,
                17 * s,
                15 * s,
            ],
            stroke: "#CCCCCC",
            strokeWidth: 1.5,
            fill: "none",
            strokeCap: "round",
            strokeJoin: "round",
            closed: false,
        });

        const wave2 = new Polygon({
            points: [
                20 * s,
                6 * s,
                22 * s,
                4 * s,
                23 * s,
                6 * s,
                23 * s,
                11 * s,
                23 * s,
                16 * s,
                22 * s,
                18 * s,
                20 * s,
                18 * s,
            ],
            stroke: "#CCCCCC",
            strokeWidth: 1.5,
            fill: "none",
            strokeCap: "round",
            strokeJoin: "round",
            closed: false,
        });

        this.waveGroup = new Group({
            children: [wave1, wave2],
            visible: !soundManager.muted,
        });

        const muteXLine1 = new Polygon({
            points: [16.5 * s, 7 * s, 23 * s, 17 * s],
            stroke: "#EE6666",
            strokeWidth: 2.5,
            strokeCap: "round",
            fill: "none",
            closed: false,
        });

        const muteXLine2 = new Polygon({
            points: [23 * s, 7 * s, 16.5 * s, 17 * s],
            stroke: "#EE6666",
            strokeWidth: 2.5,
            strokeCap: "round",
            fill: "none",
            closed: false,
        });

        this.muteGroup = new Group({
            children: [muteXLine1, muteXLine2],
            visible: soundManager.muted,
        });

        this.add([this.body, this.cone, this.waveGroup, this.muteGroup]);

        // 点击切换
        this.on("tap", () => {
            soundManager.toggleMute();
            this.syncMuteState();
            this.#setHover(false);
        });

        // 悬停效果
        this.on("pointer.enter", () => this.#setHover(true));
        this.on("pointer.leave", () => this.#setHover(false));
    }

    #setHover(hover: boolean): void {
        const c = hover ? "#FFFFFF" : "#CCCCCC";
        this.body.fill = c;
        this.cone.fill = c;
        const waveChildren = this.waveGroup.children as Polygon[];
        for (const w of waveChildren) {
            w.stroke = c;
        }
    }

    /** 根据当前静音状态更新图标 */
    syncMuteState(): void {
        const muted = soundManager.muted;
        this.waveGroup.visible = !muted;
        this.muteGroup.visible = muted;
    }

    get iconSize(): number {
        return this._iconSize;
    }
}
