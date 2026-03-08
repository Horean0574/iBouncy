import { Group, Path, Text } from "leafer-game";
import { evBus, F, GEV, GP, Mask, timer } from "../core/instances";
import { UIConf } from "../config";

export default class E_Timing extends Group {
    confUI = UIConf.Timing;
    alarm;
    remaining = GP.ENV.timeLimit;
    animatingFlag = false;

    constructor() {
        super({
            x: UIConf.Timing.X_OFFSET,
            y: UIConf.Timing.Y_OFFSET,
            zIndex: 880,
        });
        this.Icon = new Path({
            path: "M511.488 0C228.864 0 0 229.376 0 512s228.864 512 511.488 512C794.624 1024 1024 794.624 1024 512s-229.376-512-512.512-512z m21.76 556.416V219.52H438.912v392.32h1.472l243.84 140.8 47.296-81.728-198.144-114.432zM512 921.6A409.472 409.472 0 0 1 102.4 512c0-226.304 183.296-409.6 409.6-409.6 226.304 0 409.6 183.296 409.6 409.6 0 226.304-183.296 409.6-409.6 409.6z",
            x: 0,
            y: 0,
            scale: this.confUI.FONT_SIZE / 1024,
            fill: this.confUI.FILL,
        });
        this.IconG = new Group({
            x: 0,
            y: 0,
            width: this.confUI.IconG.DIAMETER,
            height: this.confUI.IconG.DIAMETER,
            origin: "center",
            children: [this.Icon],
        });
        this.Text = new Text({
            x: this.confUI.FONT_SIZE + this.confUI.GAP,
            y: 0,
            fontSize: this.confUI.FONT_SIZE,
            lineHeight: this.confUI.Text.LINE_HEIGHT,
            text: "0:00",
            fill: this.confUI.FILL,
        });
        this.add([this.IconG, this.Text]);
        this.#$setupEventListeners();
        this.reset_();
    }

    #$setupEventListeners() {
        evBus.on(GEV.UI_RENDER_ELSE, this.render_.bind(this));
        evBus.on(GEV.GAME_RESET, this.reset_.bind(this));
        evBus.on(GEV.GAME_START, this.start_.bind(this));
        evBus.on(GEV.GAME_OVER, this.stop_.bind(this));
        evBus.on(GEV.GAME_PAUSE, this.pauseAnimation_.bind(this));
    }

    reset_() {
        this.remaining = GP.ENV.timeLimit;
        this.animatingFlag = false;
        this.Text.text = E_Timing.toMSString_(GP.ENV.timeLimit);
        this.Text.fontWeight = "normal";
        this.Text.fill = this.Icon.fill = this.confUI.FILL;
    }

    start_() {
        this.alarm && timer.cancelInterval(this.alarm);
        this.alarm = timer.newInterval(this.#loopPerSecond.bind(this), 1000);
    }

    stop_() {
        timer.pause(this.alarm);
        this.pauseAnimation_();
    }

    pauseAnimation_() {
        if (this.animatingFlag) {
            this.animatingFlag = false;
            this.IconG.killAnimate();
        }
    }

    static toMS_(v) {
        return [F(v / 60), v % 60];
    }

    static toMSString_(v) {
        const seconds = v % 60;
        return `${F(v / 60)}:${seconds < 10 ? "0" + seconds : seconds}`;
    }

    #loopPerSecond() {
        if (--this.remaining < 0) return;
        this.Text.text = E_Timing.toMSString_(this.remaining);
        if (!this.animatingFlag && this.remaining <= 15) {
            this.animatingFlag = true;
            this.IconG.animate(
                this.confUI.IconG.ANIMATION.KEYFRAMES,
                {
                    duration: this.confUI.IconG.ANIMATION.DURATION,
                    loop: true,
                    loopDelay: this.confUI.IconG.ANIMATION.LOOP_DELAY,
                    join: true,
                },
            );
            this.Icon.fill = this.Text.fill = this.confUI.ALARM_FILL;
            this.Text.fontWeight = "bold";
        }
        if (GP.at("playing") && this.remaining > 0 && this.remaining <= 5) {
            this.#flashAlert_();
        }
        if (this.remaining <= 0) GP.gameOver(true);
    }

    #flashAlert_() {
        Mask.show_(UIConf.Mask.ALERT_FILL, 0, 0.28, 0.18);
        timer.newTimeout(() => {
            GP.at("playing") && Mask.hide_();
        }, 150);
    }
}
