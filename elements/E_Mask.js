class E_Mask extends GameElement {
    constructor() {
        super(new Rect({
            x: 0,
            y: 0,
            width: GP.bw,
            height: GP.bh,
            fill: "#666",
            opacity: 0,
            animation: {
                style: { opacity: 0.6 },
                duration: 0.8,
                join: true,
            },
            animationOut: {
                style: { opacity: 0 },
                duration: 0.5,
                join: true,
            },
        }));
    }

    relocate(e) {
        this.w = e.width;
        this.h = e.height;
    }
}
