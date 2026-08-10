import { UI } from "leafer-game";
import type { Leafer } from "leafer-game";

let leaferRef: Leafer | null = null;

export function setLeafer(leafer: Leafer): void {
    leaferRef = leafer;
}

export default function extendUI(): void {
    const extensions: PropertyDescriptorMap = {
        rendered_: {
            value: false,
            writable: true,
            enumerable: true,
            configurable: true,
        },
        w: {
            get(this: UI) {
                return this.width!;
            },
            set(this: UI, v: number) {
                this.width = v;
            },
            enumerable: true,
            configurable: true,
        },
        h: {
            get(this: UI) {
                return this.height!;
            },
            set(this: UI, v: number) {
                this.height = v;
            },
            enumerable: true,
            configurable: true,
        },
        ox: {
            get(this: UI) {
                return this.x! + this.width!;
            },
            set(this: UI, v: number) {
                this.x = v - this.width!;
            },
            enumerable: true,
            configurable: true,
        },
        oy: {
            get(this: UI) {
                return this.y! + this.height!;
            },
            set(this: UI, v: number) {
                this.y = v - this.height!;
            },
            enumerable: true,
            configurable: true,
        },
        cx: {
            get(this: UI) {
                return this.x! + this.width! / 2;
            },
            set(this: UI, v: number) {
                this.x = v - this.width! / 2;
            },
            enumerable: true,
            configurable: true,
        },
        cy: {
            get(this: UI) {
                return this.y! + this.height! / 2;
            },
            set(this: UI, v: number) {
                this.y = v - this.height! / 2;
            },
            enumerable: true,
            configurable: true,
        },
        lx: {
            get(this: UI) {
                return this.x! - this.width! / 2;
            },
            set(this: UI, v: number) {
                this.x = v + this.width! / 2;
            },
            enumerable: true,
            configurable: true,
        },
        rx: {
            get(this: UI) {
                return this.x! + this.width! / 2;
            },
            set(this: UI, v: number) {
                this.x = v - this.width! / 2;
            },
            enumerable: true,
            configurable: true,
        },
        ty: {
            get(this: UI) {
                return this.y! - this.height! / 2;
            },
            set(this: UI, v: number) {
                this.y = v + this.height! / 2;
            },
            enumerable: true,
            configurable: true,
        },
        by: {
            get(this: UI) {
                return this.y! + this.height! / 2;
            },
            set(this: UI, v: number) {
                this.y = v - this.height! / 2;
            },
            enumerable: true,
            configurable: true,
        },
        render_: {
            value: function (this: UI) {
                if (this.rendered_) return;
                leaferRef!.add(this);
                this.rendered_ = true;
            },
            writable: true,
            enumerable: false,
            configurable: true,
        },
        cull_: {
            value: function (this: UI) {
                if (!this.rendered_) return;
                leaferRef!.remove(this);
                this.rendered_ = false;
            },
            writable: true,
            enumerable: false,
            configurable: true,
        },
        show_: {
            value: function (this: UI) {
                this.visible = true;
            },
            writable: true,
            enumerable: false,
            configurable: true,
        },
        hide_: {
            value: function (this: UI) {
                this.visible = false;
            },
            writable: true,
            enumerable: false,
            configurable: true,
        },
        toggle_: {
            value: function (this: UI) {
                this.visible = !this.visible;
            },
            writable: true,
            enumerable: false,
            configurable: true,
        },
        fade_: {
            value: function (this: UI, original: number, target: number, dur: number, dly = 0) {
                return this.animate([{ opacity: original }, { opacity: target }], {
                    duration: dur,
                    delay: dly,
                });
            },
        },
        fadeTo_: {
            value: function (this: UI, target: number, dur: number, dly = 0) {
                return this.animate([{ opacity: target }], {
                    duration: dur,
                    delay: dly,
                    join: true,
                });
            },
            writable: true,
            enumerable: false,
            configurable: true,
        },
        fadeIn_: {
            value: function (this: UI, dur: number, dly = 0) {
                return this.fadeTo_(1, dur, dly);
            },
            writable: true,
            enumerable: false,
            configurable: true,
        },
        fadeOut_: {
            value: function (this: UI, dur: number, dly = 0) {
                return this.fadeTo_(0, dur, dly);
            },
            writable: true,
            enumerable: false,
            configurable: true,
        },
    };
    Object.defineProperties(UI.prototype, extensions);
}
