class E_Settlement extends GameElementCentered {
    constructor() {
        super(new Text({
            x: GP.bw / 2,
            y: GP.bh / 3,
            text: "",
            fontSize: 128,
            fontFamily: "HYBeiBingYang-W",
            scale: 0.5,
            opacity: 0.6,
            animation: {
                style: { scale: 1, opacity: 1 },
                duration: 0.4,
                join: true,
            },
            animationOut: {
                style: { scale: 0.4, opacity: 0.2 },
                duration: 0.3,
                join: true,
            },
        }));
    }

    relocate(e) {
        this.cx = e.width / 2;
        this.cy = e.height / 2 - 64;
    }

    initFont() {
        GP.initFont("HYBeiBingYang-W", "./assets/fonts/HYBeiBingYang-W.woff2").then(null);
    }

    win() {
        this.el.text = " You Win! ";
        this.#setTextFill("./assets/img/GL.jpg");
        this.#setShadowColor("#FFEF00");
        this.render();
    }

    fail() {
        this.el.text = " FAIL ";
        this.#setTextFill("./assets/img/DL.jpg");
        this.#setShadowColor("#474746");
        this.render();
    }

    #setTextFill(src) {
        this.el.fill = {
            type: "image",
            url: src,
            offset: { y: -50 },
        };
    }

    #setShadowColor(color) {
        this.el.shadow = {
            x: 0,
            y: 0,
            blur: 25,
            color: color,
        };
    }
}
