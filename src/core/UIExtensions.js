import { UI } from "leafer-game";
import { leafer } from "./instances";

export default function extendUI() {
    const extensions = {
        w: {
            get() {
                return this.width;
            },
            set(v) {
                this.width = v;
            },
            enumerable: true,
            configurable: true,
        },
        h: {
            get() {
                return this.height;
            },
            set(v) {
                this.height = v;
            },
            enumerable: true,
            configurable: true,
        },
        ox: {
            get() {
                return this.x + this.width;
            },
            set(v) {
                this.x = v - this.width;
            },
            enumerable: true,
            configurable: true,
        },
        oy: {
            get() {
                return this.y + this.height;
            },
            set(v) {
                this.y = v - this.height;
            },
            enumerable: true,
            configurable: true,
        },
        cx: {
            get() {
                return this.x + this.width / 2;
            },
            set(v) {
                this.x = v - this.width / 2;
            },
            enumerable: true,
            configurable: true,
        },
        cy: {
            get() {
                return this.y + this.height / 2;
            },
            set(v) {
                this.y = v - this.height / 2;
            },
            enumerable: true,
            configurable: true,
        },
        lx: { // use in center positioning, the same effect as "x" in top-left positioning
            get() {
                return this.x - this.width / 2;
            },
            set(v) {
                this.x = v + this.width / 2;
            },
            enumerable: true,
            configurable: true,
        },
        rx: { // use in center positioning, the same effect as "ox" in top-left positioning
            get() {
                return this.x + this.width / 2;
            },
            set(v) {
                this.x = v - this.width / 2;
            },
            enumerable: true,
            configurable: true,
        },
        ty: { // use in center positioning, the same effect as "y" in top-left positioning
            get() {
                return this.y - this.height / 2;
            },
            set(v) {
                this.y = v + this.height / 2;
            },
            enumerable: true,
            configurable: true,
        },
        by: { // use in center positioning, the same effect as "oy" in top-left positioning
            get() {
                return this.y + this.height / 2;
            },
            set(v) {
                this.y = v - this.height / 2;
            },
            enumerable: true,
            configurable: true,
        },
        render_: {
            value: function () {
                leafer.add(this);
            },
            writable: true,
            enumerable: false,
            configurable: true,
        },
        cull_: {
            value: function () {
                leafer.remove(this);
            },
            writable: true,
            enumerable: false,
            configurable: true,
        },
        show_: {
            value: function () {
                this.visible = true;
            },
            writable: true,
            enumerable: false,
            configurable: true,
        },
        hide_: {
            value: function () {
                this.visible = false;
            },
            writable: true,
            enumerable: false,
            configurable: true,
        },
        toggle_: {
            value: function () {
                this.visible = !this.visible;
            },
            writable: true,
            enumerable: false,
            configurable: true,
        },
    };
    Object.defineProperties(UI.prototype, extensions);
}
