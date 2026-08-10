import type { IAnimate } from "@leafer-ui/interface";

/**
 * Runtime extensions applied in {@link ../utils/UIExtensions.extendUI}.
 * Merged into {@link UI} from leafer-game / @leafer-ui/display.
 */
declare module "@leafer-ui/display" {
    interface UI {
        rendered_: boolean;
        w: number;
        h: number;
        ox: number;
        oy: number;
        cx: number;
        cy: number;
        lx: number;
        rx: number;
        ty: number;
        by: number;
        offsetX: number;
        offsetY: number;
        render_(): void;
        cull_(): void;
        show_(): void;
        hide_(): void;
        toggle_(): void;
        fade_(original: number, target: number, dur: number, dly?: number): IAnimate;
        fadeTo_(target: number, dur: number, dly?: number): IAnimate;
        fadeIn_(dur: number, dly?: number): IAnimate;
        fadeOut_(dur: number, dly?: number): IAnimate;
        hoverStyle?: Record<string, unknown> | null;
        on(event: string, handler: (...args: unknown[]) => void): void;
    }
}

declare module "leafer-game" {
    interface Leafer {
        killAnimate(ani: IAnimate): void;
    }
}
