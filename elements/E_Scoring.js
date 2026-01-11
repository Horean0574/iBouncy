class E_Scoring extends GameElement {
    v = 0;

    constructor() {
        super(new Group({
            x: GP.bw / 2 - 120,
            y: 0,
        }));
        this.Panel = new GameElement(new Path({
            path: "m -120 0\n" +
                "  h 10\n" +
                "  a 20 15 0 0 1 20 15\n" +
                "  v 35\n" +
                "  a 15 18 0 0 0 15 18\n" +
                "  h 150\n" +
                "  a 15 18 0 0 0 15 -18\n" +
                "  v -35\n" +
                "  a 20 15 0 0 1 20 -15\n" +
                "  h 10\n" +
                "  Z",
            x: 120,
            y: 0,
            fill: "#777A",
        }));
        this.Integer = new GameElement(new Text({
            y: 7,
            fontSize: 40,
            fill: "#FFF",
            text: "-",
            fontFamily: "HYDiSiKe-U",
        }));
        this.Decimal = new GameElement(new Text({
            y: 15,
            fontSize: 32,
            fill: "#DDD",
            text: "--",
            fontFamily: "HYDiSiKe-U",
        }));
        this.el.add([this.Panel.el, this.Integer.el, this.Decimal.el]);
    }

    reset() {
        this.assign(0);
    }

    relocate(e) {
        if (e.width === e.old.width) return;
        this.cx = e.width / 2;
        this.#newScore();
    }

    initFont() {
        GP.initFont("HYDiSiKe-U", "./assets/fonts/HYDiSiKe-U.woff2")
            .then(this.#newScore.bind(this));
    }

    assign(score) {
        this.v = Math.round(score * 10);
        this.#newScore();
        return E_Scoring.stringify(this.v);
    }

    delta(x) {
        const prevV = this.v;
        this.v += Math.round(x * 10);
        this.#newScore();
        return E_Scoring.stringify(this.v - prevV);
    }

    tip(delta) {
        const [initialOffsetX, transitionX, transitionY] = this.#getTipData();
        const tip = new GameElementCentered(new Text({
            x: Ball.cx + initialOffsetX,
            y: Ball.oy,
            text: "+" + delta,
            fill: "#FFEF00",
            stroke: "#33333333",
            fontSize: 20,
            fontFamily: "HYDiSiKe-U",
            opacity: 0.9,
            shadow: {
                x: 1,
                y: 1,
                blur: 10,
                color: "gray",
            },
            animation: {
                keyframes: [
                    { style: { opacity: 0.9, fontSize: 24 }, duration: 0.3 },
                    { style: { opacity: 0, fontSize: 25 }, duration: 0.4 },
                ],
                join: true,
            },
        }));
        tip.render();
        tip.el.animate([
            { offsetX: transitionX },
        ], {
            duration: 0.45,
            easing: "sine-out",
            join: true,
        });
        tip.el.animate([
            { style: { offsetY: -12 }, duration: 0.12, easing: "quad-out" },
            { style: { offsetY: transitionY }, duration: 0.28, easing: "quad-in-out" },
        ], {
            join: true,
        });
        timer.newTimeout(function () {
            tip.destroy();
        }, 600);
    }

    #getTipData() {
        const ballSpeedAffect = 0.7 * Ball.vx * 600 / GP.ENV.actUnitInterval;
        let direction = Math.random() >= 0.5 ? 1 : -1;
        let initialOffsetX = (10 + Math.random() * 20) * direction;
        let transitionX0 = (40 + Math.random() * 20) * direction;
        let transitionY = (Math.random() - 0.4) * 24;
        const totalTranslationX = initialOffsetX + transitionX0 + ballSpeedAffect;
        if (Ball.cx + totalTranslationX <= GP.ENV.paddingSide) {
            initialOffsetX *= -1;
            transitionX0 *= -1;
        } else if (Ball.cx + totalTranslationX >= GP.bw - GP.ENV.paddingSide) {
            initialOffsetX *= -1;
            transitionX0 *= -1;
        }
        return [initialOffsetX + ballSpeedAffect / 2, transitionX0 + ballSpeedAffect / 2, transitionY];
    }

    #newScore() {
        this.Integer.el.text = F(this.v / 10);
        this.Decimal.el.text = "." + this.v % 10;
        this.Integer.x = (240 - this.Integer.w - this.Decimal.w) / 2;
        this.Decimal.x = this.Integer.ox;
    }

    static stringify(v) {
        return `${F(v / 10)}.${v % 10}`;
    }
}
