class GameProcessor {
    #SM = "init1"; // state machine
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

    async initFont(name, src) {
        const font = new FontFace(name, `url(${src})`);
        try {
            await font.load();
            document.fonts.add(font);
            leafer.forceRender();
        } catch (e) {
            console.error(e);
        }
    }

    pause() {
        if (this.at("paused", "prepared", "over") || this.#SM.startsWith("init")) return;
        this.state("paused");
        timer.pauseAll();
    }

    resume() {
        if (this.at("playing", "prepared", "over") || this.#SM.startsWith("init")) return;
        this.state("playing");
        prevTimeStamp = performance.now();
        timer.resumeAll();
    }

    gameOver(win = false) {
        if (this.at("over")) return true;
        this.state("over");
        Timing.stop();
        Mask.render();
        if (win) Settlement.win();
        else Settlement.fail();
        return true;
    }
}
