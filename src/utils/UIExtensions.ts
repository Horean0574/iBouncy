import { UI } from "leafer-game";
import { leafer } from "../core/instances";

type AnyUI = UI & {
  rendered_?: boolean;
  w?: number;
  h?: number;
  ox?: number;
  oy?: number;
  cx?: number;
  cy?: number;
  lx?: number;
  rx?: number;
  ty?: number;
  by?: number;
  render_?: () => void;
  cull_?: () => void;
  show_?: () => void;
  hide_?: () => void;
  toggle_?: () => void;
  fade_?: (original: number, target: number, dur: number, dly?: number) => any;
  fadeTo_?: (target: number, dur: number, dly?: number) => any;
  fadeIn_?: (dur: number, dly?: number) => any;
  fadeOut_?: (dur: number, dly?: number) => any;
};

export default function extendUI() {
  const extensions: PropertyDescriptorMap = {
    rendered_: {
      value: false,
      writable: true,
      enumerable: true,
      configurable: true
    },
    w: {
      get(this: AnyUI) {
        return (this as any).width;
      },
      set(this: AnyUI, v: number) {
        (this as any).width = v;
      },
      enumerable: true,
      configurable: true
    },
    h: {
      get(this: AnyUI) {
        return (this as any).height;
      },
      set(this: AnyUI, v: number) {
        (this as any).height = v;
      },
      enumerable: true,
      configurable: true
    },
    ox: {
      get(this: AnyUI) {
        return (this as any).x + (this as any).width;
      },
      set(this: AnyUI, v: number) {
        (this as any).x = v - (this as any).width;
      },
      enumerable: true,
      configurable: true
    },
    oy: {
      get(this: AnyUI) {
        return (this as any).y + (this as any).height;
      },
      set(this: AnyUI, v: number) {
        (this as any).y = v - (this as any).height;
      },
      enumerable: true,
      configurable: true
    },
    cx: {
      get(this: AnyUI) {
        return (this as any).x + (this as any).width / 2;
      },
      set(this: AnyUI, v: number) {
        (this as any).x = v - (this as any).width / 2;
      },
      enumerable: true,
      configurable: true
    },
    cy: {
      get(this: AnyUI) {
        return (this as any).y + (this as any).height / 2;
      },
      set(this: AnyUI, v: number) {
        (this as any).y = v - (this as any).height / 2;
      },
      enumerable: true,
      configurable: true
    },
    lx: {
      get(this: AnyUI) {
        return (this as any).x - (this as any).width / 2;
      },
      set(this: AnyUI, v: number) {
        (this as any).x = v + (this as any).width / 2;
      },
      enumerable: true,
      configurable: true
    },
    rx: {
      get(this: AnyUI) {
        return (this as any).x + (this as any).width / 2;
      },
      set(this: AnyUI, v: number) {
        (this as any).x = v - (this as any).width / 2;
      },
      enumerable: true,
      configurable: true
    },
    ty: {
      get(this: AnyUI) {
        return (this as any).y - (this as any).height / 2;
      },
      set(this: AnyUI, v: number) {
        (this as any).y = v + (this as any).height / 2;
      },
      enumerable: true,
      configurable: true
    },
    by: {
      get(this: AnyUI) {
        return (this as any).y + (this as any).height / 2;
      },
      set(this: AnyUI, v: number) {
        (this as any).y = v - (this as any).height / 2;
      },
      enumerable: true,
      configurable: true
    },
    render_: {
      value: function (this: AnyUI) {
        if (this.rendered_) return;
        leafer.add(this as any);
        this.rendered_ = true;
      },
      writable: true,
      enumerable: false,
      configurable: true
    },
    cull_: {
      value: function (this: AnyUI) {
        if (!this.rendered_) return;
        leafer.remove(this as any);
        this.rendered_ = false;
      },
      writable: true,
      enumerable: false,
      configurable: true
    },
    show_: {
      value: function (this: AnyUI) {
        (this as any).visible = true;
      },
      writable: true,
      enumerable: false,
      configurable: true
    },
    hide_: {
      value: function (this: AnyUI) {
        (this as any).visible = false;
      },
      writable: true,
      enumerable: false,
      configurable: true
    },
    toggle_: {
      value: function (this: AnyUI) {
        (this as any).visible = !(this as any).visible;
      },
      writable: true,
      enumerable: false,
      configurable: true
    },
    fade_: {
      value: function (this: AnyUI, original: number, target: number, dur: number, dly = 0) {
        return (this as any).animate(
          [
            { opacity: original },
            { opacity: target }
          ],
          {
            duration: dur,
            delay: dly
          }
        );
      }
    },
    fadeTo_: {
      value: function (this: AnyUI, target: number, dur: number, dly = 0) {
        return (this as any).animate(
          [
            { opacity: target }
          ],
          {
            duration: dur,
            delay: dly,
            join: true
          }
        );
      },
      writable: true,
      enumerable: false,
      configurable: true
    },
    fadeIn_: {
      value: function (this: AnyUI, dur: number, dly = 0) {
        return (this as any).fadeTo_(1, dur, dly);
      },
      writable: true,
      enumerable: false,
      configurable: true
    },
    fadeOut_: {
      value: function (this: AnyUI, dur: number, dly = 0) {
        return (this as any).fadeTo_(0, dur, dly);
      },
      writable: true,
      enumerable: false,
      configurable: true
    }
  };

  Object.defineProperties(UI.prototype as AnyUI, extensions);
}

