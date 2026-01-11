class GameElement {
    constructor(el) {
        this.el = el;
    }

    get w() { // width
        return this.el.width;
    }

    set w(v) {
        this.el.width = v;
    }

    get h() { // height
        return this.el.height;
    }

    set h(v) {
        this.el.height = v;
    }

    get cx() { // abscissa of the center point
        return this.el.x + this.el.width / 2;
    }

    set cx(v) {
        this.el.x = v - this.el.width / 2;
    }

    get cy() { // ordinate of the center point
        return this.el.y + this.el.height / 2;
    }

    set cy(v) {
        this.el.y = v - this.el.height / 2;
    }

    get x() {
        return this.el.x;
    }

    set x(v) {
        this.el.x = v;
    }

    get ox() { // abscissa of the opposite side of AABB bound
        return this.el.x + this.el.width;
    }

    set ox(v) {
        this.el.x = v - this.el.width;
    }

    get y() {
        return this.el.y;
    }

    set y(v) {
        this.el.y = v;
    }

    get oy() { // ordinate of the opposite side of AABB bound
        return this.el.y + this.el.height;
    }

    set oy(v) {
        this.el.y = v - this.el.height;
    }

    destroy() {
        this.el.destroy();
    }

    render() {
        leafer.add(this.el);
    }

    cull() {
        this.el.remove();
    }

    show() {
        this.el.visible = true;
    }

    hide() {
        this.el.visible = false;
    }

    toggle() {
        this.el.visible = !this.el.visible;
    }
}
