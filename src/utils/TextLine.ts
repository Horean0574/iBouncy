import { Group, Text } from "leafer-game";

export default class TextLine extends Group {
  private defFill: string;
  private defSize: number;
  private defWeight: string;
  private cnt = -1;

  constructor(
    x: number,
    y: number,
    around: string = "center",
    fill = "#000",
    size = 16,
    weight = "normal"
  ) {
    super({
      x,
      y,
      around
    });
    this.defFill = fill;
    this.defSize = size;
    this.defWeight = weight;
  }

  #addInternal(text: string, gap: number, fill?: string, size?: number, weight?: string) {
    this.add(
      new Text({
        x: ++this.cnt ? (this.children[this.cnt - 1] as any).ox + gap : 0,
        y: 0,
        text,
        fill: fill === void 0 ? this.defFill : fill,
        fontSize: size === void 0 ? this.defSize : size,
        fontWeight: weight === void 0 ? this.defWeight : weight
      })
    );
  }

  $add(text: string, gap = 3, fill?: string, size?: number, weight?: string) {
    this.#addInternal(text, gap, fill, size, weight);
    return this.children[this.cnt];
  }

  $append(text: string, gap = 3, fill?: string, size?: number, weight?: string) {
    this.#addInternal(text, gap, fill, size, weight);
    return this;
  }
}

