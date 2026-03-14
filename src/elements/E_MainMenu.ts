import { AnimateEvent, Group, Image, PointerEvent, Rect, Text } from "leafer-game";
import { evBus, GEV, GP } from "../core/instances";
import TextLine from "../utils/TextLine";
import { UIConf, DIFFICULTY_LEVELS, setDifficulty, getDifficultyKey } from "../config";
import { getBestScore, getHistory, clearHistory } from "../utils/scoreStorage";
import {
  getCurrentUser,
  logout,
  syncScoresWithServer,
  fetchUserProfile,
  updateNickname,
  changePassword,
  deleteAccount
} from "../utils/auth";
import { openAuthPanel } from "../ui/authPanel";

type DifficultyKey = keyof typeof DIFFICULTY_LEVELS;

interface DifficultyText extends Text {
  $difficultyKey?: DifficultyKey;
}

export default class E_MainMenu extends Group {
  confUI = UIConf.MainMenu;
  Brand: Image;
  Hint1: any;
  Hint2: any;
  DifficultyGroup: Group;
  difficultyButtons: DifficultyText[] = [];
  BestScoreText: Text;
  HistoryButton: Text;
  AccountButton: Text;
  HistoryPanel: Group;
  HistoryRows!: Group;
  UserPanel: Group;
  UserPanelCard: Rect;
  private UserPanelContentGroup!: Group;
  private UserPanelLoadingText?: Text;
  private userPanelOpening = false;
  private userPanelProfileCache: any = null;
  private userPanelProfileCacheTime = 0;
  UserProfileTextLines: {
    nickname: Text;
    username: Text;
    createdAt: Text;
    totalGames: Text;
    bestScore: Text;
    lastPlayedAt: Text;
  };

  constructor() {
    super({
      x: 0,
      y: 0,
      width: GP.bw,
      height: GP.bh,
      visible: false,
      zIndex: 991
    });
    this.Brand = new Image({
      x: GP.bw * this.confUI.X_RATIO,
      y: GP.bh * this.confUI.Brand.Y_RATIO,
      around: "center",
      url: "leafer://brand.svg",
      opacity: 0,
      scale: 0,
      offsetY: this.confUI.Brand.Y_OFFSET,
      shadow: {
        x: 0,
        y: 0,
        blur: 50,
        color: this.confUI.Brand.SHADOW_COLOR
      }
    });
    this.Hint1 = new TextLine(
      GP.bw * this.confUI.X_RATIO,
      GP.bh * this.confUI.Hint1.Y_RATIO + this.confUI.Hint1.Y_OFFSET,
      "center",
      this.confUI.Hint1.FILL,
      this.confUI.Hint1.FONT_SIZE
    )
      .$append("按")
      .$append("空格键", 3, void 0, void 0, "bold")
      .$append("开始游戏");
    this.Hint1.opacity = 0;
    this.Hint2 = new TextLine(
      GP.bw * this.confUI.X_RATIO,
      GP.bh * this.confUI.Hint2.Y_RATIO + this.confUI.Hint2.Y_OFFSET,
      "center",
      this.confUI.Hint2.FILL,
      this.confUI.Hint2.FONT_SIZE
    )
      .$append("通过")
      .$append("方向键", 3, void 0, void 0, "bold")
      .$append("或")
      .$append("W/A/S/D", 3, void 0, void 0, "bold")
      .$append("来控制平板的移动");
    this.Hint2.opacity = 0;
    const dConf = this.confUI.Difficulty;
    this.DifficultyGroup = new Group({
      x: GP.bw * this.confUI.X_RATIO,
      y: 0,
      around: "center"
    });
    const keys: DifficultyKey[] = ["EASY", "NORMAL", "HARD"];
    const xOffsets = [-(dConf.GAP + 32), 0, dConf.GAP + 32];
    keys.forEach((key, i) => {
      const t = new Text({
        x: xOffsets[i],
        y: 0,
        around: "center",
        text: DIFFICULTY_LEVELS[key].name,
        fontSize: dConf.FONT_SIZE,
        fill: key === getDifficultyKey() ? dConf.FILL_SELECTED : dConf.FILL,
        cursor: "pointer"
      }) as DifficultyText;
      t.$difficultyKey = key;
      t.on(PointerEvent.TAP, () => this.onDifficultyTap(key));
      this.DifficultyGroup.add(t);
      this.difficultyButtons.push(t);
    });
    this.DifficultyGroup.opacity = 0;
    const bestConf = this.confUI.BestScore;
    this.BestScoreText = new Text({
      x: GP.bw * this.confUI.X_RATIO,
      y: GP.bh * bestConf.Y_RATIO,
      around: "center",
      text: "",
      fontSize: bestConf.FONT_SIZE,
      fill: bestConf.FILL,
      visible: false
    });
    const histBtnConf = this.confUI.HistoryButton;
    this.HistoryButton = new Text({
      x: GP.bw * this.confUI.X_RATIO,
      y: GP.bh * histBtnConf.Y_RATIO + histBtnConf.Y_OFFSET,
      around: "center",
      text: "历史成绩",
      fontSize: histBtnConf.FONT_SIZE,
      fill: histBtnConf.FILL,
      cursor: "pointer"
    });
    this.HistoryButton.opacity = 0;
    this.HistoryButton.on(PointerEvent.TAP, () => this.showHistory_());
    this.HistoryButton.hoverStyle = { fill: histBtnConf.FILL_HOVER };

    const accBtnConf = this.confUI.AccountButton;
    this.AccountButton = new Text({
      x: GP.bw * accBtnConf.X_RATIO,
      y: GP.bh * accBtnConf.Y_RATIO,
      around: "center",
      text: "",
      fontSize: accBtnConf.FONT_SIZE,
      fill: accBtnConf.FILL,
      cursor: "pointer"
    });
    this.AccountButton.on(PointerEvent.TAP, () => this.onAccountTap_());
    this.AccountButton.hoverStyle = { fill: accBtnConf.FILL_HOVER };

    this.HistoryPanel = this.createHistoryPanel_();
    this.UserPanel = this.createUserPanel_();
    this.add([
      this.Brand,
      this.DifficultyGroup,
      this.BestScoreText,
      this.Hint1,
      this.Hint2,
      this.HistoryButton,
      this.AccountButton,
      this.HistoryPanel,
      this.UserPanel
    ]);
    this.setupEventListeners();
  }

  private createHistoryPanel_() {
    const conf = this.confUI.ScoreHistory;
    const panel = new Group({
      x: 0,
      y: 0,
      width: GP.bw,
      height: GP.bh,
      visible: false,
      opacity: 0
    });
    const bg = new Rect({
      x: 0,
      y: 0,
      width: GP.bw,
      height: GP.bh,
      fill: UIConf.BACKGROUND_FILL,
      opacity: 0.95
    });
    panel.add(bg);
    const title = new Text({
      x: GP.bw / 2,
      y: GP.bh * 0.18,
      around: "center",
      text: "历史成绩",
      fontSize: conf.TITLE_FONT_SIZE,
      fill: conf.TITLE_FILL
    });
    panel.add(title);
    this.HistoryRows = new Group({ x: GP.bw / 2, y: GP.bh * 0.32, around: "center" });
    panel.add(this.HistoryRows);
    const buttonsY = GP.bh * 0.82;
    const closeBtn = new Text({
      x: GP.bw / 2 + 80,
      y: buttonsY,
      around: "center",
      text: "关闭",
      fontSize: conf.CLOSE_FONT_SIZE,
      fill: conf.CLOSE_FILL,
      cursor: "pointer"
    });
    closeBtn.on(PointerEvent.TAP, () => this.hideHistory_());
    closeBtn.hoverStyle = { fill: this.confUI.HistoryButton.FILL_HOVER };
    panel.add(closeBtn);
    const clearBtn = new Text({
      x: GP.bw / 2 - 80,
      y: buttonsY,
      around: "center",
      text: "清空记录",
      fontSize: conf.CLOSE_FONT_SIZE,
      fill: conf.CLOSE_FILL,
      cursor: "pointer"
    });
    clearBtn.on(PointerEvent.TAP, () => this.clearHistory_());
    clearBtn.hoverStyle = { fill: this.confUI.HistoryButton.FILL_HOVER };
    panel.add(clearBtn);
    return panel;
  }

  private createUserPanel_() {
    const conf = this.confUI.UserPanel;
    const panel = new Group({
      x: 0,
      y: 0,
      width: GP.bw,
      height: GP.bh,
      visible: false,
      opacity: 0,
      zIndex: 992
    });

    // 遮罩：纯色半透明，不遮挡弹窗内容
    const overlay = new Rect({
      x: 0,
      y: 0,
      width: GP.bw,
      height: GP.bh,
      fill: "#1F2937",
      opacity: 0.55
    });
    panel.add(overlay);

    const cardWidth = Math.min(GP.bw * 0.82, 520);
    const cardHeight = Math.min(GP.bh * 0.72, 460);
    const centerX = GP.bw / 2;
    const centerY = GP.bh / 2;

    // 卡片：纯白底、清晰阴影，保证文字可读
    const card = new Rect({
      x: centerX,
      y: centerY,
      around: "center",
      width: cardWidth,
      height: cardHeight,
      radius: 16,
      fill: "#FFFFFF",
      shadow: {
        x: 0,
        y: 12,
        blur: 32,
        spread: 0,
        color: "rgba(0,0,0,0.2)"
      }
    });
    this.UserPanelCard = card;
    panel.add(card);

    const padH = 36;
    const padT = 28;
    const labelW = 72;
    const contentGroup = new Group({
      x: centerX,
      y: centerY,
      width: 0,
      height: 0
    });
    this.UserPanelContentGroup = contentGroup;

    const valueX = -cardWidth / 2 + padH + labelW;
    const rowH = 26;
    let rowY = -cardHeight / 2 + padT;

    const title = new Text({
      x: 0,
      y: rowY,
      around: "center",
      text: "用户信息",
      fontSize: conf.TITLE_FONT_SIZE,
      fill: "#111827"
    });
    contentGroup.add(title);
    rowY += 36;

    const subtitle = new Text({
      x: 0,
      y: rowY,
      around: "center",
      text: "管理你的账号资料与云端记录",
      fontSize: conf.SUBTITLE_FONT_SIZE,
      fill: "#6B7280"
    });
    contentGroup.add(subtitle);
    rowY += 32;

    const leftX = -cardWidth / 2 + padH;

    const nicknameLabel = new Text({
      x: leftX,
      y: rowY,
      around: "left",
      text: "昵称",
      fontSize: conf.LABEL_FONT_SIZE,
      fill: "#4B5563"
    });
    const nicknameValue = new Text({
      x: valueX,
      y: rowY,
      around: "left",
      text: "-",
      fontSize: conf.VALUE_FONT_SIZE,
      fill: "#111827"
    });
    contentGroup.add(nicknameLabel);
    contentGroup.add(nicknameValue);
    rowY += rowH;

    const usernameLabel = new Text({
      x: leftX,
      y: rowY,
      around: "left",
      text: "用户名",
      fontSize: conf.LABEL_FONT_SIZE,
      fill: "#4B5563"
    });
    const usernameValue = new Text({
      x: valueX,
      y: rowY,
      around: "left",
      text: "-",
      fontSize: conf.VALUE_FONT_SIZE,
      fill: "#111827"
    });
    contentGroup.add(usernameLabel);
    contentGroup.add(usernameValue);
    rowY += rowH;

    const createdLabel = new Text({
      x: leftX,
      y: rowY,
      around: "left",
      text: "注册时间",
      fontSize: conf.LABEL_FONT_SIZE,
      fill: "#4B5563"
    });
    const createdValue = new Text({
      x: valueX,
      y: rowY,
      around: "left",
      text: "-",
      fontSize: conf.VALUE_FONT_SIZE,
      fill: "#111827"
    });
    contentGroup.add(createdLabel);
    contentGroup.add(createdValue);
    rowY += rowH;

    const totalLabel = new Text({
      x: leftX,
      y: rowY,
      around: "left",
      text: "游玩次数",
      fontSize: conf.LABEL_FONT_SIZE,
      fill: "#4B5563"
    });
    const totalValue = new Text({
      x: valueX,
      y: rowY,
      around: "left",
      text: "-",
      fontSize: conf.VALUE_FONT_SIZE,
      fill: "#111827"
    });
    contentGroup.add(totalLabel);
    contentGroup.add(totalValue);
    rowY += rowH;

    const bestLabel = new Text({
      x: leftX,
      y: rowY,
      around: "left",
      text: "最佳成绩",
      fontSize: conf.LABEL_FONT_SIZE,
      fill: "#4B5563"
    });
    const bestValue = new Text({
      x: valueX,
      y: rowY,
      around: "left",
      text: "-",
      fontSize: conf.VALUE_FONT_SIZE,
      fill: "#111827"
    });
    contentGroup.add(bestLabel);
    contentGroup.add(bestValue);
    rowY += rowH;

    const lastLabel = new Text({
      x: leftX,
      y: rowY,
      around: "left",
      text: "最近游玩",
      fontSize: conf.LABEL_FONT_SIZE,
      fill: "#4B5563"
    });
    const lastValue = new Text({
      x: valueX,
      y: rowY,
      around: "left",
      text: "-",
      fontSize: conf.VALUE_FONT_SIZE,
      fill: "#111827"
    });
    contentGroup.add(lastLabel);
    contentGroup.add(lastValue);
    rowY += 28;

    this.UserProfileTextLines = {
      nickname: nicknameValue,
      username: usernameValue,
      createdAt: createdValue,
      totalGames: totalValue,
      bestScore: bestValue,
      lastPlayedAt: lastValue
    };

    const hint = new Text({
      x: 0,
      y: rowY,
      around: "center",
      text: "密码修改与账号注销不可撤销，请谨慎选择。",
      fontSize: conf.HINT_FONT_SIZE,
      fill: "#9CA3AF"
    });
    contentGroup.add(hint);
    rowY += 36;

    const btnY = rowY;
    const btnGap = 12;
    const btnW = 100;
    const btnH = 36;
    const firstRowX = -btnW - btnGap / 2;
    const secondRowX = btnGap / 2;

    const addButton = (
      cx: number,
      cy: number,
      label: string,
      bgFill: string,
      textFill: string,
      onClick: () => void
    ) => {
      const g = new Group({
        x: cx,
        y: cy,
        width: btnW,
        height: btnH,
        cursor: "pointer",
        around: "center"
      });
      const bg = new Rect({
        x: -btnW / 2,
        y: -btnH / 2,
        width: btnW,
        height: btnH,
        radius: 8,
        fill: bgFill
      });
      const text = new Text({
        x: 0,
        y: 0,
        around: "center",
        text: label,
        fontSize: 14,
        fill: textFill
      });
      g.add(bg);
      g.add(text);
      g.on(PointerEvent.TAP, onClick);
      g.hoverStyle = { scale: 1.02 };
      contentGroup.add(g);
    };

    addButton(firstRowX, btnY, "修改昵称", conf.PRIMARY_BTN_FILL, "#FFFFFF", () =>
      this.handleChangeNickname_()
    );
    addButton(secondRowX, btnY, "修改密码", conf.PRIMARY_BTN_FILL, "#FFFFFF", () =>
      this.handleChangePassword_()
    );
    addButton(firstRowX, btnY + 44, "退出登录", "#F3F4F6", "#374151", () =>
      this.handleLogout_()
    );
    addButton(secondRowX, btnY + 44, "注销账号", conf.DANGER_BTN_FILL, "#FFFFFF", () =>
      this.handleDeleteAccount_()
    );

    const closeBtn = new Text({
      x: cardWidth / 2 - 28,
      y: -cardHeight / 2 + 28,
      around: "center",
      text: "×",
      fontSize: 20,
      fill: "#6B7280",
      cursor: "pointer"
    });
    closeBtn.hoverStyle = { fill: "#111827", scale: 1.1 };
    closeBtn.on(PointerEvent.TAP, () => this.hideUserPanel_());
    contentGroup.add(closeBtn);

    panel.add(contentGroup);

    const loadingText = new Text({
      x: 0,
      y: 0,
      around: "center",
      text: "正在加载用户信息...",
      fontSize: 14,
      fill: "#6B7280",
      visible: false,
      opacity: 0
    });
    contentGroup.add(loadingText);
    this.UserPanelLoadingText = loadingText;

    return panel;
  }

  private formatScore_(score: number) {
    const v = Math.round(score * 10);
    return `${Math.floor(v / 10)}.${v % 10}`;
  }

  private formatDate_(ts: number) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  }

  private clearHistory_() {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      const ok = window.confirm("确认清空所有历史成绩吗？此操作不可撤销。");
      if (!ok) return;
    }
    clearHistory();
    this.updateBestScore_();
    this.showHistory_();
  }

  private async onAccountTap_() {
    const user = getCurrentUser();
    if (user) {
      await this.showUserPanel_();
      return;
    }

    if (typeof window === "undefined") return;
    openAuthPanel("login", async () => {
      this.updateAccountText_();
      await syncScoresWithServer();
      this.updateBestScore_();
    });
  }

  private showHistory_() {
    const conf = this.confUI.ScoreHistory;
    const records = getHistory().slice(0, conf.MAX_ROWS);
    this.HistoryRows.removeAll();

    const scoreX = -180;
    const diffX = -40;
    const timeX = 100;

    if (records.length === 0) {
      const empty = new Text({
        x: 0,
        y: 0,
        around: "center",
        text: "暂无记录",
        fontSize: conf.ROW_FONT_SIZE,
        fill: conf.ROW_FILL
      });
      this.HistoryRows.add(empty);
    } else {
      const header = new Group({
        x: 0,
        y: 0,
        around: "center"
      });
      header.add(
        new Text({
          x: scoreX,
          y: 0,
          around: "center",
          text: "分数",
          fontSize: conf.ROW_FONT_SIZE,
          fill: conf.HEADER_FILL
        })
      );
      header.add(
        new Text({
          x: diffX,
          y: 0,
          around: "center",
          text: "难度",
          fontSize: conf.ROW_FONT_SIZE,
          fill: conf.HEADER_FILL
        })
      );
      header.add(
        new Text({
          x: timeX,
          y: 0,
          around: "center",
          text: "时间",
          fontSize: conf.ROW_FONT_SIZE,
          fill: conf.HEADER_FILL
        })
      );
      this.HistoryRows.add(header);

      records.forEach((r, i) => {
        const row = new Group({
          x: 0,
          y: (i + 1) * conf.ROW_HEIGHT,
          around: "center"
        });
        row.add(
          new Text({
            x: scoreX,
            y: 0,
            around: "center",
            text: this.formatScore_(r.score),
            fontSize: conf.ROW_FONT_SIZE,
            fill: conf.ROW_FILL
          })
        );
        row.add(
          new Text({
            x: diffX,
            y: 0,
            around: "center",
            text: DIFFICULTY_LEVELS[r.difficulty as DifficultyKey]?.name ?? r.difficulty,
            fontSize: conf.ROW_FONT_SIZE,
            fill: conf.ROW_FILL
          })
        );
        row.add(
          new Text({
            x: timeX,
            y: 0,
            around: "center",
            text: this.formatDate_(r.timestamp),
            fontSize: conf.ROW_FONT_SIZE,
            fill: conf.ROW_FILL
          })
        );
        this.HistoryRows.add(row);
      });
    }

    this.HistoryPanel.visible = true;
    this.HistoryPanel.opacity = 0;
    this.HistoryPanel.animate([{ opacity: 1 }], { duration: 0.25 });
  }

  private hideHistory_() {
    this.HistoryPanel.animate([{ opacity: 0 }], { duration: 0.2 }).once(
      AnimateEvent.COMPLETED,
      () => {
        this.HistoryPanel.visible = false;
      }
    );
  }

  private updateBestScore_() {
    const best = getBestScore();
    if (best != null) {
      this.BestScoreText.text = `最佳成绩：${this.formatScore_(best)}`;
      this.BestScoreText.visible = true;
    } else {
      this.BestScoreText.visible = false;
    }
  }

  private updateAccountText_() {
    const user = getCurrentUser();
    const accBtnConf = this.confUI.AccountButton;
    if (user) {
      this.AccountButton.text = `已登录：${user.nickname || user.username}`;
      this.AccountButton.fill = accBtnConf.FILL_LOGGED_IN;
    } else {
      this.AccountButton.text = "登录 / 注册";
      this.AccountButton.fill = accBtnConf.FILL;
    }
  }

  private onDifficultyTap(key: DifficultyKey) {
    setDifficulty(key);
    this.updateDifficultySelection();
  }

  private updateDifficultySelection() {
    const current = getDifficultyKey();
    const dConf = this.confUI.Difficulty;
    this.difficultyButtons.forEach((t) => {
      t.fill = t.$difficultyKey === current ? dConf.FILL_SELECTED : dConf.FILL;
    });
  }

  private setupEventListeners() {
    evBus.on(GEV.RESIZE, (payload) => this.relocate_(payload.data));
  }

  private formatDateTime_(iso: string | null) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  }

  private async showUserPanel_() {
    if (this.userPanelOpening || (this.UserPanel && this.UserPanel.visible)) return;
    const user = getCurrentUser();
    if (!user) return;
    if (typeof window === "undefined") return;

    this.userPanelOpening = true;
    this.UserPanel.visible = true;
    this.UserPanel.opacity = 0;
    this.UserPanelCard.scale = 0.96;
    this.UserPanel.animate([{ opacity: 1 }], { duration: 0.2 });
    this.UserPanelCard.animate(
      [{ scale: 0.96 }, { scale: 1 }],
      { duration: 0.22, join: true }
    );

    if (this.UserPanelLoadingText) {
      this.UserPanelLoadingText.visible = true;
      this.UserPanelLoadingText.opacity = 0;
      this.UserPanelLoadingText.animate(
        [
          { opacity: 0.2 },
          { opacity: 1 },
          { opacity: 0.2 }
        ],
        { duration: 1.2, loop: true }
      );
    }

    try {
      const now = Date.now();
      let profile = this.userPanelProfileCache;
      if (!profile || now - this.userPanelProfileCacheTime > 30000) {
        profile = await fetchUserProfile();
        this.userPanelProfileCache = profile;
        this.userPanelProfileCacheTime = Date.now();
      }
      if (!profile) return;

      this.UserProfileTextLines.nickname.text = profile.nickname || "(未设置)";
      this.UserProfileTextLines.username.text = profile.username;
      this.UserProfileTextLines.createdAt.text = this.formatDateTime_(profile.createdAt);
      this.UserProfileTextLines.totalGames.text = `${profile.totalGames}`;
      this.UserProfileTextLines.bestScore.text =
        profile.bestScore != null ? this.formatScore_(profile.bestScore) : "-";
      this.UserProfileTextLines.lastPlayedAt.text = this.formatDateTime_(
        profile.lastPlayedAt
      );
    } catch (e: any) {
      if (typeof window !== "undefined" && typeof window.alert === "function") {
        window.alert(String(e?.message ?? e));
      }
    } finally {
      if (this.UserPanelLoadingText) {
        this.UserPanelLoadingText.visible = false;
        this.UserPanelLoadingText.opacity = 0;
      }
      this.userPanelOpening = false;
    }
  }

  private hideUserPanel_() {
    this.UserPanelCard.animate([{ scale: 0.98 }], { duration: 0.12 });
    this.UserPanel.animate([{ opacity: 0 }], { duration: 0.18 }).once(
      AnimateEvent.COMPLETED,
      () => {
        this.UserPanel.visible = false;
        this.userPanelOpening = false;
        if (this.UserPanelLoadingText) {
          this.UserPanelLoadingText.visible = false;
          this.UserPanelLoadingText.opacity = 0;
        }
      }
    );
  }

  private async handleChangeNickname_() {
    if (typeof window === "undefined") return;
    const current = this.UserProfileTextLines.nickname.text || "";
    const next = window.prompt("请输入新的昵称（最多 24 个字符）：", current === "(未设置)" ? "" : current);
    if (!next) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    if (trimmed.length > 24) {
      window.alert("昵称长度请控制在 24 个字符以内");
      return;
    }
    try {
      const profile = await updateNickname(trimmed);
      this.UserProfileTextLines.nickname.text = profile.nickname || "(未设置)";
      this.updateAccountText_();
      window.alert("昵称已更新");
    } catch (e: any) {
      window.alert(String(e?.message ?? e));
    }
  }

  private async handleChangePassword_() {
    if (typeof window === "undefined") return;
    const oldPwd = window.prompt("请输入当前密码：");
    if (!oldPwd) return;
    const newPwd = window.prompt("请输入新密码（至少 6 位）：");
    if (!newPwd || newPwd.length < 6) {
      window.alert("新密码至少 6 位");
      return;
    }
    const confirmPwd = window.prompt("请再次输入新密码进行确认：");
    if (!confirmPwd || confirmPwd !== newPwd) {
      window.alert("两次输入的新密码不一致");
      return;
    }
    try {
      await changePassword(oldPwd, newPwd);
      window.alert("密码修改成功");
    } catch (e: any) {
      window.alert(String(e?.message ?? e));
    }
  }

  private async handleLogout_() {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      const ok = window.confirm("确定要退出登录吗？");
      if (!ok) return;
    }
    logout();
    this.updateAccountText_();
    this.hideUserPanel_();
  }

  private async handleDeleteAccount_() {
    if (typeof window === "undefined") return;
    const first = window.confirm(
      "确定要注销账号吗？此操作会删除你的账号以及云端成绩记录，且无法恢复。"
    );
    if (!first) return;
    const second = window.confirm("再次确认：真的要永久注销账号吗？");
    if (!second) return;
    try {
      await deleteAccount();
      this.updateAccountText_();
      this.hideUserPanel_();
      window.alert("账号已注销");
    } catch (e: any) {
      window.alert(String(e?.message ?? e));
    }
  }

  async init() {
    await this.preloadImage();
  }

  async preloadImage() {
    const brandSVG = new URL("/public/svg/brand.svg", import.meta.url).href;
    await GP.ImageInitializer("brand.svg", brandSVG);
  }

  relocate_(e: { width: number; height: number }) {
    this.cx = e.width * this.confUI.X_RATIO;
    this.Brand.y = e.height * this.confUI.Brand.Y_RATIO;
    this.DifficultyGroup.y = e.height * this.confUI.Difficulty.Y_RATIO;
    this.BestScoreText.y = e.height * this.confUI.BestScore.Y_RATIO;
    this.Hint1.y = e.height * this.confUI.Hint1.Y_RATIO + this.confUI.Hint1.Y_OFFSET;
    this.Hint2.y = e.height * this.confUI.Hint2.Y_RATIO + this.confUI.Hint2.Y_OFFSET;
    this.HistoryButton.y =
      e.height * this.confUI.HistoryButton.Y_RATIO + this.confUI.HistoryButton.Y_OFFSET;
    const accBtnConf = this.confUI.AccountButton;
    this.AccountButton.x = e.width * accBtnConf.X_RATIO;
    this.AccountButton.y = e.height * accBtnConf.Y_RATIO;
    if (this.HistoryPanel.visible && this.HistoryPanel.children.length > 0) {
      this.HistoryPanel.width = e.width;
      this.HistoryPanel.height = e.height;
      (this.HistoryPanel.children[0] as Rect).width = e.width;
      (this.HistoryPanel.children[0] as Rect).height = e.height;
    }
    if (this.UserPanel) {
      this.UserPanel.width = e.width;
      this.UserPanel.height = e.height;
      const overlay = this.UserPanel.children[0] as Rect;
      overlay.width = e.width;
      overlay.height = e.height;
      this.UserPanelCard.x = e.width / 2;
      this.UserPanelCard.y = e.height / 2;
      if (this.UserPanelContentGroup) {
        this.UserPanelContentGroup.x = e.width / 2;
        this.UserPanelContentGroup.y = e.height / 2;
      }
    }
  }

  reset_() {
    this.opacity = 1;
    this.Brand.opacity = 0;
    this.Brand.scale = 0;
    this.Brand.offsetY = this.confUI.Brand.Y_OFFSET;
    this.DifficultyGroup.opacity = 0;
    this.updateDifficultySelection();
    this.updateBestScore_();
    this.updateAccountText_();
    this.Hint1.opacity = 0;
    this.Hint2.opacity = 0;
    this.HistoryButton.opacity = 0;
    this.HistoryPanel.visible = false;
    this.HistoryPanel.opacity = 0;
    if (this.UserPanel) {
      this.UserPanel.visible = false;
      this.UserPanel.opacity = 0;
    }
  }

  show_() {
    this.reset_();
    this.visible = true;
    this.relocate_({ width: GP.bw, height: GP.bh });
    this.Brand.animate(
      [
        { opacity: 0.9, scale: 1.1, offsetY: -5 },
        { opacity: 1, scale: 1, offsetY: 0 }
      ],
      {
        duration: 0.8,
        join: true
      }
    ).once(AnimateEvent.COMPLETED, () => {
      this.Brand.hoverStyle = {
        shadow: {
          x: 0,
          y: 0,
          blur: 20,
          color: this.confUI.Brand.HOVER_SHADOW_COLOR
        }
      };
    });
    this.DifficultyGroup.fadeIn_(0.6, 0.15);
    this.Hint1.fadeIn_(0.8, 0.2);
    this.Hint2.fadeIn_(0.8, 0.4);
    this.HistoryButton.fadeIn_(0.6, 0.5);
  }

  hide_() {
    this.Brand.hoverStyle = false;
    this.fadeOut_(0.5).once(AnimateEvent.COMPLETED, () => {
      this.visible = false;
    });
  }
}

