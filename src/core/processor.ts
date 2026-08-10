import type { Leafer } from "leafer-game";
import { Platform, Resource } from "leafer-game";
import { evBus, GEV } from "../events";

export type GameState = "init" | "init1" | "init2" | "almost-prepared" | "prepared" | "playing" | "paused" | "over";

/** Runtime timing environment; `actUnitInterval` may become a string from `toFixed` after refresh-rate probing. */
export type ProcessorEnvironment = {
    refreshRate: number;
    actUnitInterval: number | string;
    stdUnitInterval: number;
    fixedStep: number;
    maxStepPerFrame: number;
    paddingTop: number;
    paddingSide: number;
    timeLimit: number;
};

export default class Processor {
    #SM: GameState | string = "init";
    measured = 0;
    refreshRateBucket = new Map<number, number>();
    ENV: ProcessorEnvironment;
    /** 与 Leafer 画布一致，避免子步物理循环反复读 `document.body` 触发布局。 */
    #viewportW = 0;
    #viewportH = 0;
    #leafer: Leafer;
    #scoreSource: () => number = () => 0;

    /** 每帧开始时由 gameLoop 写入，供帧内所有模块共享，替代 `performance.now()`。 */
    frameTimeStamp = 0;
    /** 帧序号，每帧递增，用于键盘缓存等单帧脏标记方案。 */
    frameCount = 0;

    /**
     * @param env - Full {@link ProcessorEnvironment}; callers pass the complete
     *              object so we don't need unsafe casting.
     */
    constructor(env: ProcessorEnvironment, leafer: Leafer) {
        this.ENV = env;
        this.#leafer = leafer;
        this.gameOver = this.gameOver.bind(this);
        evBus.on(GEV.GAME_BALL_LOST, () => this.gameOver(false));
        evBus.on(GEV.GAME_TIME_UP, () => this.gameOver(true));
    }

    setScoreSource(source: () => number): void {
        this.#scoreSource = source;
    }

    syncViewport(width: number, height: number): void {
        if (width > 0 && height > 0) {
            this.#viewportW = width;
            this.#viewportH = height;
        }
    }

    get bw(): number {
        return this.#viewportW > 0 ? this.#viewportW : document.body.clientWidth;
    }

    get bh(): number {
        return this.#viewportH > 0 ? this.#viewportH : document.body.clientHeight;
    }

    state(newState: GameState | string): void {
        this.#SM = newState;
    }

    at(...states: (GameState | string)[]): boolean {
        for (const s of states) if (this.#SM === s) return true;
        return false;
    }

    renderElse(): void {
        evBus.emit(GEV.UI_RENDER_ELSE);
    }

    /**
     * 测量显示器刷新率（仅记录到 `ENV.refreshRate`，供视觉参数参考）。
     * 物理子步固定为 120Hz（见 instances.ts），不再随显示器刷新率变化，
     * 保证所有设备上物理行为一致。
     */
    measureRefreshRate(prog: number): void {
        if (this.measured >= 20) return;
        const rrKey = Math.round(60 / prog);
        const curValue = this.refreshRateBucket.get(rrKey);
        if (curValue === undefined) {
            this.refreshRateBucket.set(rrKey, 1);
        } else {
            this.refreshRateBucket.set(rrKey, curValue + 1);
        }
        if (++this.measured >= 20) {
            let maxV = 0;
            let k4maxV = 0;
            for (const [k, v] of this.refreshRateBucket.entries()) {
                if (v >= maxV) {
                    maxV = v;
                    k4maxV = k;
                }
            }
            this.refreshRateBucket.clear();
            this.ENV.refreshRate = k4maxV;
            this.state("init2");
        }
    }

    async fontInitializer(name: string, src: string): Promise<void> {
        src = src.replace(".woff2", "").replace(".woff", "");
        const font = new FontFace(name, `url(${src}.woff2)`);
        try {
            await font.load();
            document.fonts.add(font);
            this.#leafer.forceRender();
        } catch {
            const font2 = new FontFace(name, `url(${src}.woff)`);
            try {
                await font2.load();
                document.fonts.add(font2);
                this.#leafer.forceRender();
            } catch (e) {
                console.error(`An error has occurred while initializing font ${name}:`, e);
            }
        }
    }

    async ImageInitializer(name: string, src: string): Promise<void> {
        try {
            const img = await Platform.origin!.loadImage(src);
            Resource.setImage(`leafer://${name}`, img);
        } catch (e) {
            // 资源加载失败不应阻断游戏初始化（避免首屏空白）。
            console.error(`An error has occurred while initializing image "${name}":`, e);
        }
    }

    prepared(): void {
        this.state("prepared");
        evBus.emit(GEV.GAME_PREPARED);
    }

    start(): void {
        this.state("playing");
        evBus.emit(GEV.GAME_START);
    }

    restart(): void {
        this.state("playing");
        evBus.emit(GEV.GAME_RESTART);
    }

    pause(): void {
        if (this.at("paused", "prepared", "over") || this.#SM.startsWith("init")) return;
        this.state("paused");
        evBus.emit(GEV.GAME_PAUSE);
    }

    resume(): void {
        if (this.at("playing", "prepared", "over") || this.#SM.startsWith("init")) return;
        this.state("playing");
        evBus.emit(GEV.GAME_RESUME);
    }

    gameOver(win = false): boolean {
        if (this.at("over")) return true;
        this.state("over");
        evBus.emit(GEV.GAME_OVER, {
            win: win,
            score: this.#scoreSource(),
        });
        return true;
    }
}
