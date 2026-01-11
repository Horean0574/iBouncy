class E_Timing extends GameElement {
    alarm;
    remaining = GP.ENV.timeLimit;
    animatingFlag = false;

    constructor() {
        super(new Group({
            x: 15,
            y: 15,
        }));
        this.Icon = new GameElement(new Path({
            path: "M511.488 0C228.864 0 0 229.376 0 512s228.864 512 511.488 512C794.624 1024 1024 794.624 1024 512s-229.376-512-512.512-512z m21.76 556.416V219.52H438.912v392.32h1.472l243.84 140.8 47.296-81.728-198.144-114.432zM512 921.6A409.472 409.472 0 0 1 102.4 512c0-226.304 183.296-409.6 409.6-409.6 226.304 0 409.6 183.296 409.6 409.6 0 226.304-183.296 409.6-409.6 409.6z",
            x: 0,
            y: 0,
            scale: 0.015625, // 16 / 1024
            fill: "#262626",
        }));
        this.IconG = new GameElement(new Group({
            x: 0,
            y: 0,
            width: 16,
            height: 16,
            origin: "center",
            children: [this.Icon.el],
        }));
        this.Text = new GameElement(new Text({
            x: 20,
            y: 0,
            fontSize: 16,
            lineHeight: 16,
            text: "3:00",
            fill: "#262626",
        }));
        this.el.add([this.IconG.el, this.Text.el]);
    }

    reset() {
        this.remaining = GP.ENV.timeLimit;
        this.animatingFlag = false;
        this.Text.el.text = E_Timing.toMSString(GP.ENV.timeLimit);
        this.Text.el.fontWeight = "normal";
        this.Text.el.fill = this.Icon.el.fill = "#262626";
    }

    start() {
        this.alarm = timer.newInterval(this.#secondLoop.bind(this), 1000);
    }

    stop() {
        timer.cancelInterval(this.alarm);
        if (this.animatingFlag) {
            this.animatingFlag = false;
            this.IconG.el.killAnimate();
        }
    }

    static toMS(v) {
        return [F(v / 60), v % 60];
    }

    static toMSString(v) {
        const seconds = v % 60;
        return `${F(v / 60)}:${seconds < 10 ? "0" + seconds : seconds}`;
    }

    #secondLoop() {
        if (--this.remaining < 0) return;
        this.Text.el.text = E_Timing.toMSString(this.remaining);
        if (!this.animatingFlag && this.remaining <= 15) {
            this.animatingFlag = true;
            this.IconG.el.animate(
                [
                    { style: { rotation: 35, y: 0 }, duration: 0.1 },
                    { style: { rotation: -35, y: -3 }, duration: 0.1 },
                    { style: { rotation: 25, y: -3 }, duration: 0.1 },
                    { style: { rotation: -25, y: 0 }, duration: 0.1 },
                ],
                {
                    loop: true,
                    loopDelay: 0.6,
                    join: true,
                },
            );
            this.Icon.el.fill = this.Text.el.fill = "#44C2F1";
            this.Text.el.fontWeight = "bold";
        }
        if (this.remaining <= 0) GP.gameOver(true);
    }
}
