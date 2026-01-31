import { AnimateEvent, Group, Text } from "leafer-game";
import { GP } from "../core/instances";
import TextLine from "../utils/TextLine";
import { UIConf } from "../config";

export default class E_OptionsMenu extends Group {
    $vis = false;

    constructor() {
        super({
            x: 0,
            y: 0,
            width: GP.bw,
            height: GP.bh,
            visible: false,
            zIndex: 991,
        });
        this.Title = new Text({
            x: GP.bw / 2,
            y: GP.bh * 2 / 7,
            around: "center",
            text: "游戏已暂停",
            fontSize: UIConf.OptionsMenu.Title.FONT_SIZE,
            fontWeight: UIConf.OptionsMenu.Title.FONT_WEIGHT,
        });
        this.Hint1 = new TextLine(GP.bw / 2, GP.bh * 4 / 7 - 12, "center", UIConf.OptionsMenu.Hint1.FILL, UIConf.OptionsMenu.Hint1.FONT_SIZE)
            .$append("按")
            .$append("空格键", 3, void 0, void 0, "bold")
            .$append("继续游戏");
        this.Hint1.opacity = 0;
        this.Hint2 = new TextLine(GP.bw / 2, GP.bh * 4 / 7 + 12, "center", UIConf.OptionsMenu.Hint2.FILL, UIConf.OptionsMenu.Hint2.FONT_SIZE)
            .$append("按")
            .$append("回车键", 3, void 0, void 0, "bold")
            .$append("结束游戏并返回开始菜单");
        this.Hint2.opacity = 0;
        this.add([this.Title, this.Hint1, this.Hint2]);
    }

    relocate_(e) {
        this.cx = e.width / 2;
        this.Hint1.y = e.height * 4 / 7 - 12;
        this.Hint2.y = e.height * 4 / 7 + 12;
    }

    reset_() {
        this.opacity = 1;
        this.Title.opacity = 0;
        this.Hint1.opacity = 0;
        this.Hint2.opacity = 0;
    }

    show_() {
        this.$vis = true;
        this.visible = true;
        this.relocate_({ width: GP.bw, height: GP.bh });
        this.fadeIn_(0);
        this.Title.fadeIn_(0.4);
        this.Hint1.fadeIn_(0.8, 0.2);
        this.Hint2.fadeIn_(0.8, 0.4);
    }

    hide_() {
        this.$vis = false;
        this.fadeOut_(0.5).once(AnimateEvent.COMPLETED, () => this.visible = false);
    }
}
