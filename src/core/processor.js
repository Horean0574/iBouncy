import {
    evBus,
    GEV,
    loading,
    GP,
    leafer,
    MainMenu,
    Scoring,
    Settlement,
} from "./instances";
import { Platform, Resource } from "leafer-game";
import { UIConf } from "../config";

export default class Processor {
    #SM = "init";
    measured = 0;
    refreshRateBucket = new Map();

    constructor(ENV = {}) {
        this.ENV = ENV;
        this.gameOver = this.gameOver.bind(this);
    }

    get bw() {
        return document.body.clientWidth;
    }

    get bh() {
        return document.body.clientHeight;
    }

    state(newState) {
        this.#SM = newState;
    }

    at(...states) {
        for (let s of states) if (this.#SM === s) return true;
        return false;
    }

    async initializeAll() {
        await Promise.all([
            MainMenu.init(),
            Scoring.init_(),
            Settlement.init_(),
        ]);
    }

    renderElse() {
        evBus.emit(GEV.UI_RENDER_ELSE);
    }

    secondRender() {
        MainMenu.render_();
    }

    measureRefreshRate(prog) {
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
            for (let [k, v] of this.refreshRateBucket.entries()) {
                if (v >= maxV) {
                    maxV = v;
                    k4maxV = k;
                }
            }
            this.refreshRateBucket.clear();
            GP.ENV.refreshRate = k4maxV;
            GP.ENV.fixedStep = 1000 / k4maxV;
            GP.ENV.actUnitInterval = (1000 / k4maxV).toFixed(1);
            GP.state("init2");
        }
    }

    async fontInitializer(name, src) {
        src = src.replace(".woff2", "").replace(".woff", "");
        const font = new FontFace(name, `url(${src}.woff2)`);
        try {
            await font.load();
            document.fonts.add(font);
            leafer.forceRender();
        } catch {
            const font2 = new FontFace(name, `url(${src}.woff)`);
            try {
                await font2.load();
                document.fonts.add(font2);
                leafer.forceRender();
            } catch (e) {
                console.error(`An error has occurred while initializing font ${name}:`, e);
            }
        }
    }

    async ImageInitializer(name, src) {
        let img = await Platform.origin.loadImage(src);
        Resource.setImage(`leafer://${name}`, img);
    }

    prepared() {
        GP.state("prepared");
        evBus.emit(GEV.GAME_PREPARED);
        GP.loadingFadeOut();
    }

    start() {
        GP.state("playing");
        evBus.emit(GEV.GAME_START);
    }

    restart() {
        GP.state("playing");
        evBus.emit(GEV.GAME_RESTART);
    }

    pause() {
        if (this.at("paused", "prepared", "over") || this.#SM.startsWith("init")) return;
        this.state("paused");
        evBus.emit(GEV.GAME_PAUSE);
    }

    resume() {
        if (this.at("playing", "prepared", "over") || this.#SM.startsWith("init")) return;
        this.state("playing");
        evBus.emit(GEV.GAME_RESUME);
    }

    gameOver(win = false) {
        if (this.at("over")) return true;
        this.state("over");
        evBus.emit(GEV.GAME_OVER, {
            win: win,
        });
        return true;
    }

    loadingFadeOut() {
        loading.animate([
            { opacity: 0 },
        ], {
            duration: UIConf.LOADING_FADE_OUT_DURATION * 1000,
            fill: "both",
        }).finished.then(function () {
            loading.style.display = "none";
        });
    }
}
