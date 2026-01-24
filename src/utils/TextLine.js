import { Group, Text } from "leafer-game";

export default class TextLine extends Group {
    $defFill;
    $defSize;
    $defWeight;
    $cnt = -1;

    constructor(x, y, around = "center", fill = "#000", size = 16, weight = "normal") {
        super({
            x: x,
            y: y,
            around: around,
        });
        this.$defFill = fill;
        this.$defSize = size;
        this.$defWeight = weight;
    }

    #$addMethod(text, gap, fill, size, weight) {
        this.add(new Text({
            x: ++this.$cnt ? this.children[this.$cnt - 1].ox + gap : 0,
            y: 0,
            text: text,
            fill: fill === void 0 ? this.$defFill : fill,
            fontSize: size === void 0 ? this.$defSize : size,
            fontWeight: weight === void 0 ? this.$defWeight : weight,
        }));
    }

    $add(text, gap = 3, fill, size, weight) {
        this.#$addMethod(text, gap, fill, size, weight);
        return this.children[this.$cnt];
    }

    $append(text, gap = 3, fill, size, weight) {
        this.#$addMethod(text, gap, fill, size, weight);
        return this;
    }
}
