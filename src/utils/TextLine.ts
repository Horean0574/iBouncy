import { Group, Text } from "leafer-game";
import type { IUIInputData } from "@leafer-ui/interface";

export default class TextLine extends Group {
    $defFill: string;
    $defSize: number;
    $defWeight: string | number;
    $cnt = -1;

    constructor(
        x: number,
        y: number,
        around: IUIInputData["around"] = "center",
        fill = "#000",
        size = 16,
        weight: string | number = "normal",
    ) {
        super({
            x: x,
            y: y,
            around: around,
        });
        this.$defFill = fill;
        this.$defSize = size;
        this.$defWeight = weight;
    }

    #$addMethod(
        text: string,
        gap: number,
        fill: string | undefined,
        size: number | undefined,
        weight: string | number | undefined,
    ): void {
        this.add(
            new Text({
                x: ++this.$cnt ? (this.children[this.$cnt - 1] as Text).ox + gap : 0,
                y: 0,
                text: text,
                fill: fill === void 0 ? this.$defFill : fill,
                fontSize: size === void 0 ? this.$defSize : size,
                fontWeight: weight === void 0 ? this.$defWeight : weight,
            }),
        );
    }

    $add(text: string, gap = 3, fill?: string, size?: number, weight?: string | number): Text {
        this.#$addMethod(text, gap, fill, size, weight);
        return this.children[this.$cnt] as Text;
    }

    $append(text: string, gap = 3, fill?: string, size?: number, weight?: string | number): this {
        this.#$addMethod(text, gap, fill, size, weight);
        return this;
    }
}
