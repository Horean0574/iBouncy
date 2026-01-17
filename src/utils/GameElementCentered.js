import GameElement from "./GameElement";

export default class GameElementCentered extends GameElement {
    constructor(el, zIndex = 0) {
        el.around = "center";
        super(el, zIndex);
    }

    get cx() {
        return this.el.x;
    }

    set cx(v) {
        this.el.x = v;
    }

    get cy() {
        return this.el.y;
    }

    set cy(v) {
        this.el.y = v;
    }

    get x() {
        return this.el.x - this.el.width / 2;
    }

    set x(v) {
        this.el.x = v + this.el.width / 2;
    }

    get y() {
        return this.el.y - this.el.height / 2;
    }

    set y(v) {
        this.el.y = v + this.el.height / 2;
    }

    get ox() {
        return this.el.x + this.el.width / 2;
    }

    set ox(v) {
        this.el.x = v - this.el.width / 2;
    }

    get oy() {
        return this.el.y + this.el.height / 2;
    }

    set oy(v) {
        this.el.y = v - this.el.height / 2;
    }
}
