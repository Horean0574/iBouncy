import {
    setPrevTimeStamp,
    loading,
    Ball,
    ForbiddenZone,
    FPS,
    GP,
    timer,
    leafer,
    Mask,
    MainMenu,
    OptionsMenu,
    Scoring,
    Settlement,
    Tablet,
    Timing,
} from "./instances";
import { Platform, Resource } from "leafer-game";

export default class Processor {
    #SM = "init"; // state machine
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

    renderAll() {
        OptionsMenu.render_();
        Settlement.render_();
        ForbiddenZone.render_();
        Tablet.render_();
        Ball.render_();
        Timing.render_();
        Scoring.render_();
        FPS.render_();
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
                console.error(e);
            }
        }
    }

    async ImageInitializer(name, src) {
        let img = await Platform.origin.loadImage(src);
        Resource.setImage(`leafer://${name}`, img);
    }

    resetMain(removeMask = true) {
        removeMask && Mask.hide_();
        Settlement.hide_();
        Timing.reset_();
        Scoring.reset_();
        Tablet.reset_();
        Ball.reset_();
    }

    mainMenu() {
        MainMenu.reset_();
        this.resetMain(false);
        if (Mask.fill !== "#FFF" || Mask.opacity !== 0.4) {
            Mask.fill = "#FFF";
            Mask.fadeTo_(0.4, 0.5);
        }
        MainMenu.show_();
    }

    optionsMenu() {
        OptionsMenu.reset_();
        if (Mask.fill !== "#FFF" || Mask.opacity !== 0.4) {
            Mask.fill = "#FFF";
            Mask.fadeTo_(0.4, 0.5);
        }
        OptionsMenu.show_();
    }

    start() {
        Mask.hide_();
        MainMenu.hide_();
    }

    pause() {
        if (this.at("paused", "prepared", "over") || this.#SM.startsWith("init")) return;
        this.state("paused");
        timer.pauseAll();
        Mask.show_("#FFF", 0, 0.4, 0.8);
        this.optionsMenu();
    }

    resume() {
        if (this.at("playing", "prepared", "over") || this.#SM.startsWith("init")) return;
        this.state("playing");
        setPrevTimeStamp(performance.now());
        timer.resumeAll();
        Mask.hide_();
        OptionsMenu.hide_();
    }

    gameOver(win = false) {
        if (this.at("over")) return true;
        this.state("over");
        Timing.stop_();
        Mask.show_("#FFF", 0, 0.4, 0.8);
        if (win) Settlement.win_();
        else Settlement.fail_();
        return true;
    }

    loadingFadeOut() {
        loading.animate([
            { opacity: 0 },
        ], {
            duration: 300,
            fill: "both",
        });
    }
}
