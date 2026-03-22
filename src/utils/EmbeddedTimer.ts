import Queue from "./Queue";

type TimeoutSymbol = symbol;
type IntervalSymbol = symbol;

interface TimeoutDuty {
  callback: () => void;
  start: number;
  pause: number;
  duration: number;
  paused: boolean;
  terminate: boolean;
}

interface IntervalOptions {
  delay?: number;
  executeTimes?: number;
  recFramesCnt?: boolean;
  recElapsedTime?: boolean;
}

interface IntervalData {
  cnt: number;
  framesCnt: number;
  elapsed: number;
}

interface IntervalDuty {
  callback: (data: IntervalData) => void;
  start: number;
  step: number;
  pause: number;
  duration: number;
  paused: boolean;
  terminate: boolean;
  options: Required<IntervalOptions>;
  data: IntervalData;
}

interface TimerConfig {
  minInterval: number;
  autoHandleFPS: boolean;
  FPSHandleInterval: number;
  FPSUpdateInterval: number;
}

export default class EmbeddedTimer {
  #timeoutMap = new Map<TimeoutSymbol, TimeoutDuty>();
  #timeout2delete = new Set<TimeoutSymbol>();
  #intervalMap = new Map<IntervalSymbol, IntervalDuty>();
  #interval2delete = new Set<IntervalSymbol>();
  #FPSHandlerID?: IntervalSymbol | null;
  #FPSTimeQueue = new Queue<[number, number]>();
  #FPSFramesCnt = 0;
  #FPSElapsed = 0;
  #cachedFPS: number | string = NaN;
  #lastFPSCalcTime = 0;

  #config: TimerConfig = {
    minInterval: 16.7,
    autoHandleFPS: false,
    FPSHandleInterval: 33.3,
    FPSUpdateInterval: 300
  };

  constructor(options: Partial<TimerConfig> = {}) {
    this.#config = { ...this.#config, ...options };
    if (this.#config.autoHandleFPS) this.initFPSHandler();
  }

  get MIN_INTERVAL() {
    return this.#config.minInterval;
  }

  set MIN_INTERVAL(v: number) {
    this.#config.minInterval = v;
  }

  timeDetect(timeStamp: number) {
    this.#timeoutFrame(timeStamp);
    this.#intervalFrame(timeStamp);
  }

  #timeoutFrame(timeStamp: number) {
    for (const symbol of this.#timeoutMap.keys()) {
      const duty = this.#timeoutMap.get(symbol)!;
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
    for (const symbol of this.#timeout2delete) {
      this.#timeoutMap.delete(symbol);
    }
    this.#timeout2delete.clear();
  }

  #intervalFrame(timeStamp: number) {
    for (const symbol of this.#intervalMap.keys()) {
      const duty = this.#intervalMap.get(symbol)!;
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
    for (const symbol of this.#interval2delete) {
      this.#intervalMap.delete(symbol);
    }
    this.#interval2delete.clear();
  }

  newTimeout(callback: () => void, timeout = this.#config.minInterval): TimeoutSymbol {
    timeout = Math.max(timeout, this.#config.minInterval);
    const symbol: TimeoutSymbol = Symbol("Timeout");
    const now = performance.now();
    const toAdd: TimeoutDuty = {
      callback,
      start: now,
      pause: now,
      duration: timeout,
      paused: false,
      terminate: false
    };
    this.#timeoutMap.set(symbol, toAdd);
    return symbol;
  }

  cancelTimeout(symbol: TimeoutSymbol) {
    const duty = this.#timeoutMap.get(symbol);
    if (duty) duty.terminate = true;
  }

  newInterval(
    callback: (data: IntervalData) => void,
    interval = this.#config.minInterval,
    options: IntervalOptions = {}
  ): IntervalSymbol {
    const merged: Required<IntervalOptions> = Object.assign(
      {
        delay: 0,
        executeTimes: Infinity,
        recFramesCnt: false,
        recElapsedTime: false
      },
      options
    );
    interval = Math.max(interval, this.#config.minInterval);
    const symbol: IntervalSymbol = Symbol("Interval");
    const now = performance.now();
    const start = now + merged.delay;
    const toAdd: IntervalDuty = {
      callback,
      start,
      step: start,
      pause: start,
      duration: interval,
      paused: false,
      terminate: false,
      options: merged,
      data: {
        cnt: 0,
        framesCnt: 0,
        elapsed: 0
      }
    };
    this.#intervalMap.set(symbol, toAdd);
    return symbol;
  }

  cancelInterval(symbol: IntervalSymbol) {
    const duty = this.#intervalMap.get(symbol);
    if (duty) duty.terminate = true;
  }

  pause(symbol: TimeoutSymbol | IntervalSymbol) {
    const sType = this.#whichType(symbol);
    if (sType === "Timeout") {
      const duty = this.#timeoutMap.get(symbol as TimeoutSymbol);
      if (!duty || duty.paused) return;
      duty.paused = true;
      duty.pause = performance.now();
    } else if (sType === "Interval") {
      const duty = this.#intervalMap.get(symbol as IntervalSymbol);
      if (!duty || duty.paused) return;
      duty.paused = true;
      duty.pause = performance.now();
    }
  }

  resume(symbol: TimeoutSymbol | IntervalSymbol) {
    const sType = this.#whichType(symbol);
    if (sType === "Timeout") {
      const duty = this.#timeoutMap.get(symbol as TimeoutSymbol);
      if (!duty || !duty.paused) return;
      duty.paused = false;
      duty.start += performance.now() - duty.pause;
    } else if (sType === "Interval") {
      const duty = this.#intervalMap.get(symbol as IntervalSymbol);
      if (!duty || !duty.paused) return;
      duty.paused = false;
      duty.step += performance.now() - duty.pause;
    }
  }

  pauseAll() {
    for (const symbol of this.#timeoutMap.keys()) this.pause(symbol);
    for (const symbol of this.#intervalMap.keys()) this.pause(symbol);
  }

  resumeAll() {
    for (const symbol of this.#timeoutMap.keys()) this.resume(symbol);
    for (const symbol of this.#intervalMap.keys()) this.resume(symbol);
  }

  #whichType(symbol: symbol) {
    const str = symbol.toString();
    return str.substring(7, str.length - 1);
  }

  initFPSHandler() {
    if (this.#isFPSHandlerRunning()) return;
    this.#FPSHandlerID = this.newInterval(
      (data) => {
        this.#FPSTimeQueue.push([data.elapsed, data.framesCnt]);
        const front = this.#FPSTimeQueue.front();
        if (!front) return;
        while (data.elapsed - (this.#FPSTimeQueue.front()![0] ?? 0) > 1000) {
          this.#FPSTimeQueue.pop();
        }
        this.#FPSFramesCnt = data.framesCnt;
        this.#FPSElapsed = data.elapsed;
      },
      this.#config.FPSHandleInterval,
      {
        recFramesCnt: true,
        recElapsedTime: true
      }
    );
  }

  destroyFPSHandler() {
    if (!this.#isFPSHandlerRunning()) return;
    this.cancelInterval(this.#FPSHandlerID as IntervalSymbol);
    this.#FPSHandlerID = null;
    this.#FPSTimeQueue.clear();
  }

  #isFPSHandlerRunning() {
    return this.#FPSHandlerID !== undefined && this.#FPSHandlerID !== null;
  }

  #calcFPS() {
    const front = this.#FPSTimeQueue.front();
    if (!front) return NaN;
    const approxFPS = this.#FPSFramesCnt - front[1];
    const adjustRatio = 1000 / (this.#FPSElapsed - front[0]);
    return (approxFPS * adjustRatio).toFixed(1);
  }

  get FPS() {
    if (!this.#isFPSHandlerRunning() || this.#FPSTimeQueue.isEmpty)
      return (this.#cachedFPS = NaN as any);
    const timeStamp = performance.now();
    if (timeStamp - this.#lastFPSCalcTime < this.#config.FPSUpdateInterval) return this.#cachedFPS;
    this.#lastFPSCalcTime = timeStamp;
    return (this.#cachedFPS = this.#calcFPS());
  }
}

