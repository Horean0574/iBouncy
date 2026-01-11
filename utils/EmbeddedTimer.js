class EmbeddedTimer {
    #timeoutMap = new Map();
    #timeout2delete = new Set();
    #intervalMap = new Map();
    #interval2delete = new Set();
    #FPSHandlerID;
    #FPSTimeQueue = new Queue();
    #FPSFramesCnt = 0;
    #FPSElapsed = 0;
    #cachedFPS = NaN;
    #lastFPSCalcTime = 0;

    #config = {
        minInterval: 16.7,
        autoHandleFPS: false,
        FPSHandleInterval: 33.3,
        FPSUpdateInterval: 300,
    };

    constructor(options = {}) {
        this.#config = { ...this.#config, ...options };
        if (this.#config.autoHandleFPS) this.initFPSHandler();
    }

    get MIN_INTERVAL() {
        return this.#config.minInterval;
    }

    set MIN_INTERVAL(v) {
        this.#config.minInterval = v;
    }

    timeDetect(timeStamp) {
        this.#timeoutFrame(timeStamp);
        this.#intervalFrame(timeStamp);
    }

    #timeoutFrame(timeStamp) {
        for (let symbol of this.#timeoutMap.keys()) {
            const duty = this.#timeoutMap.get(symbol);
            if (duty.terminate) {
                this.#timeout2delete.add(symbol);
                continue;
            }
            if (duty.paused) continue;
            if (timeStamp - duty.start >= duty.duration) {
                this.#timeout2delete.add(symbol);
                duty.callback();
            }
        }
        for (let symbol of this.#timeout2delete) {
            this.#timeoutMap.delete(symbol);
        }
        this.#timeout2delete.clear();
    }

    #intervalFrame(timeStamp) {
        for (let symbol of this.#intervalMap.keys()) {
            const duty = this.#intervalMap.get(symbol);
            if (duty.terminate) {
                this.#interval2delete.add(symbol);
                continue;
            }
            if (duty.paused) continue;
            if (timeStamp < duty.start) continue;
            duty.options.recFramesCnt && ++duty.data.framesCnt;
            duty.options.recElapsedTime && (duty.data.elapsed = timeStamp - duty.start);
            if (timeStamp - duty.step >= duty.duration) {
                ++duty.data.cnt;
                duty.callback(duty.data);
                if (duty.data.cnt >= duty.options.executeTimes) {
                    this.#interval2delete.add(symbol);
                    continue;
                }
                duty.step += duty.duration;
            }
        }
        for (let symbol of this.#interval2delete) {
            this.#intervalMap.delete(symbol);
        }
        this.#interval2delete.clear();
    }

    newTimeout(callback, timeout = this.#config.minInterval) {
        timeout = Math.max(timeout, this.#config.minInterval);
        const symbol = Symbol("Timeout");
        const now = performance.now();
        let toAdd = {
            callback: callback,
            start: now,
            pause: now,
            duration: timeout,
            paused: false,
            terminate: false,
        };
        this.#timeoutMap.set(symbol, toAdd);
        return symbol;
    }

    cancelTimeout(symbol) {
        this.#timeoutMap.get(symbol).terminate = true;
    }

    newInterval(callback, interval = this.#config.minInterval, options = {}) {
        options = Object.assign({
            delay: 0,
            executeTimes: Infinity,
            recFramesCnt: false,
            recElapsedTime: false,
        }, options);
        interval = Math.max(interval, this.#config.minInterval);
        const symbol = Symbol("Interval");
        const now = performance.now();
        let toAdd = {
            callback: callback,
            start: now + options.delay,
            step: now + options.delay,
            pause: now + options.delay,
            duration: interval,
            paused: false,
            terminate: false,
            options: options,
            data: {
                cnt: 0,
                framesCnt: 0,
                elapsed: 0,
            },
        };
        this.#intervalMap.set(symbol, toAdd);
        return symbol;
    }

    cancelInterval(symbol) {
        this.#intervalMap.get(symbol).terminate = true;
    }

    pause(symbol) {
        const sType = this.#whichType(symbol);
        if (sType === "Timeout") {
            const duty = this.#timeoutMap.get(symbol);
            if (duty.paused) return;
            duty.paused = true;
            duty.pause = performance.now();
        } else if (sType === "Interval") {
            const duty = this.#intervalMap.get(symbol);
            if (duty.paused) return;
            duty.paused = true;
            duty.pause = performance.now();
        }
    }

    resume(symbol) {
        const sType = this.#whichType(symbol);
        if (sType === "Timeout") {
            const duty = this.#timeoutMap.get(symbol);
            if (!duty.paused) return;
            duty.paused = false;
            duty.start += performance.now() - duty.pause;
        } else if (sType === "Interval") {
            const duty = this.#intervalMap.get(symbol);
            if (!duty.paused) return;
            duty.paused = false;
            duty.step += performance.now() - duty.pause;
        }
    }

    pauseAll() {
        for (let symbol of this.#timeoutMap.keys()) this.pause(symbol);
        for (let symbol of this.#intervalMap.keys()) this.pause(symbol);
    }

    resumeAll() {
        for (let symbol of this.#timeoutMap.keys()) this.resume(symbol);
        for (let symbol of this.#intervalMap.keys()) this.resume(symbol);
    }

    #whichType(symbol) {
        const str = symbol.toString();
        return str.substring(7, str.length - 1);
    }

    initFPSHandler() {
        if (this.#isFPSHandlerRunning()) return;
        this.#FPSHandlerID = this.newInterval((data) => {
            this.#FPSTimeQueue.push([data.elapsed, data.framesCnt]);
            while (data.elapsed - this.#FPSTimeQueue.front()[0] > 1000) {
                this.#FPSTimeQueue.pop();
            }
            this.#FPSFramesCnt = data.framesCnt;
            this.#FPSElapsed = data.elapsed;
        }, this.#config.FPSHandleInterval, {
            recFramesCnt: true,
            recElapsedTime: true,
        });
    }

    destroyFPSHandler() {
        if (!this.#isFPSHandlerRunning()) return;
        this.cancelInterval(this.#FPSHandlerID);
        this.#FPSHandlerID = null;
        this.#FPSTimeQueue.clear();
    }

    #isFPSHandlerRunning() {
        return this.#FPSHandlerID !== undefined && this.#FPSHandlerID !== null;
    }

    #calcFPS() {
        const approxFPS = this.#FPSFramesCnt - this.#FPSTimeQueue.front()[1];
        const adjustRatio = 1000 / (this.#FPSElapsed - this.#FPSTimeQueue.front()[0]);
        return (approxFPS * adjustRatio).toFixed(1);
    }

    get FPS() {
        if (!this.#isFPSHandlerRunning() || this.#FPSTimeQueue.isEmpty) return this.#cachedFPS = NaN;
        const timeStamp = performance.now();
        if (timeStamp - this.#lastFPSCalcTime < this.#config.FPSUpdateInterval) return this.#cachedFPS;
        this.#lastFPSCalcTime = timeStamp;
        return this.#cachedFPS = this.#calcFPS();
    }
}
