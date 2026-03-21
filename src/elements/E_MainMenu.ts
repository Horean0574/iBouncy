import { AnimateEvent, Group, Image, PointerEvent, Rect, Text } from "leafer-game";
import { evBus, GEV, GP } from "../core/instances";
import TextLine from "../utils/TextLine";
import { UIConf, ColorConf, DIFFICULTY_LEVELS, setDifficulty, getDifficultyKey } from "../config";
import { getBestScore, getHistory, clearHistory } from "../utils/scoreStorage";
import {
  getCurrentUser,
  logout,
  syncScoresWithServer,
  fetchUserProfile,
  updateNickname,
  verifyPassword,
  changePassword,
  deleteAccount,
  fetchLeaderboard,
  fetchDailyTasks,
  claimDailyTask,
  fetchCheckinStatus,
  doCheckin,
  doMakeupCheckin,
  fetchLevelInfo
} from "../utils/auth";
import { openAuthPanel } from "../ui/authPanel";
import { showAlert, showConfirm, showPrompt } from "../ui/inPageModal";

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
  GrowthButton: Text;
  AccountButton: Text;
  HistoryPanel: Group;
  GrowthPanel: Group;
  GrowthCard!: Rect;
  GrowthStatusText!: Text;
  GrowthLevelText!: Text;
  GrowthCheckinText!: Text;
  GrowthTaskGroup!: Group;
  GrowthBoardHeaderText!: Text;
  GrowthBoardRowsText!: Text;
  GrowthBoardMeText!: Text;
  GrowthActionButtons: Array<{ action: string; button: Text }> = [];
  GrowthTaskClaimButtons: Array<{ taskType: string; button: Text }> = [];
  growthTasksSnapshot: Array<{ taskType: string; title: string; status: string }> = [];
  growthBoardType: "global" | "daily" | "weekly" = "global";
  growthBoardScope: "global" | "friends" = "global";
  growthLoading = false;
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

    this.GrowthButton = new Text({
      x: GP.bw * this.confUI.X_RATIO,
      y: GP.bh * histBtnConf.Y_RATIO + histBtnConf.Y_OFFSET + 28,
      around: "center",
      text: "成长中心",
      fontSize: histBtnConf.FONT_SIZE,
      fill: histBtnConf.FILL,
      cursor: "pointer"
    });
    this.GrowthButton.opacity = 0;
    this.GrowthButton.on(PointerEvent.TAP, () => this.showGrowthPanel_());
    this.GrowthButton.hoverStyle = { fill: histBtnConf.FILL_HOVER };

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
    this.GrowthPanel = this.createGrowthPanel_();
    this.UserPanel = this.createUserPanel_();
    this.add([
      this.Brand,
      this.DifficultyGroup,
      this.BestScoreText,
      this.Hint1,
      this.Hint2,
      this.HistoryButton,
      this.GrowthButton,
      this.AccountButton,
      this.HistoryPanel,
      this.GrowthPanel,
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

  private createGrowthPanel_() {
    const panel = new Group({
      x: 0,
      y: 0,
      width: GP.bw,
      height: GP.bh,
      visible: false,
      opacity: 0,
      zIndex: 993
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

    const cardWidth = Math.min(GP.bw * 0.9, 940);
    const cardHeight = Math.min(GP.bh * 0.82, 640);
    const left = GP.bw / 2 - cardWidth / 2;
    const top = GP.bh / 2 - cardHeight / 2;
    const pad = 22;

    this.GrowthCard = new Rect({
      x: GP.bw / 2,
      y: GP.bh / 2,
      around: "center",
      width: cardWidth,
      height: cardHeight,
      radius: 16,
      fill: "#F5FCFF",
      stroke: "rgba(32,168,215,0.25)",
      strokeWidth: 1
    });
    panel.add(this.GrowthCard);

    panel.add(
      new Text({
        x: left + pad,
        y: top + 18,
        around: "left",
        text: "成长中心",
        fontSize: 22,
        fill: "#0F172A"
      })
    );
    this.GrowthStatusText = new Text({
      x: left + cardWidth - pad,
      y: top + 20,
      around: "right",
      text: "准备就绪",
      fontSize: 12,
      fill: "#64748B"
    });
    panel.add(this.GrowthStatusText);

    panel.add(
      new Rect({
        x: left + pad,
        y: top + 54,
        width: cardWidth - pad * 2,
        height: 86,
        radius: 12,
        fill: "#EDF9FF",
        stroke: "rgba(32,168,215,0.18)",
        strokeWidth: 1
      })
    );
    this.GrowthLevelText = new Text({
      x: left + pad + 14,
      y: top + 70,
      around: "left",
      text: "等级：-",
      fontSize: 15,
      fill: "#0F172A"
    });
    this.GrowthCheckinText = new Text({
      x: left + pad + 14,
      y: top + 100,
      around: "left",
      text: "签到：-",
      fontSize: 14,
      fill: "#334155"
    });
    panel.add(this.GrowthLevelText);
    panel.add(this.GrowthCheckinText);

    const tasksRect = new Rect({
      x: left + pad,
      y: top + 154,
      width: cardWidth * 0.56 - pad * 1.5,
      height: cardHeight - 234,
      radius: 12,
      fill: "#FFFFFF",
      stroke: "rgba(15,23,42,0.08)",
      strokeWidth: 1
    });
    panel.add(tasksRect);
    panel.add(
      new Text({
        x: tasksRect.x + 14,
        y: tasksRect.y + 12,
        around: "left",
        text: "每日任务",
        fontSize: 16,
        fill: "#0F172A"
      })
    );
    this.GrowthTaskGroup = new Group({ x: tasksRect.x + 14, y: tasksRect.y + 40, width: 0, height: 0 });
    panel.add(this.GrowthTaskGroup);

    const boardRect = new Rect({
      x: left + cardWidth * 0.58,
      y: top + 154,
      width: cardWidth * 0.42 - pad,
      height: cardHeight - 234,
      radius: 12,
      fill: "#FFFFFF",
      stroke: "rgba(15,23,42,0.08)",
      strokeWidth: 1
    });
    panel.add(boardRect);
    this.GrowthBoardHeaderText = new Text({
      x: boardRect.x + 14,
      y: boardRect.y + 12,
      around: "left",
      text: "排行榜",
      fontSize: 16,
      fill: "#0F172A"
    });
    this.GrowthBoardRowsText = new Text({
      x: boardRect.x + 14,
      y: boardRect.y + 42,
      around: "left",
      text: "暂无数据",
      fontSize: 13,
      lineHeight: 22,
      fill: "#1F2937"
    });
    this.GrowthBoardMeText = new Text({
      x: boardRect.x + 14,
      y: boardRect.y + boardRect.height - 44,
      around: "left",
      text: "我的排名：-",
      fontSize: 12,
      lineHeight: 18,
      fill: "#475569"
    });
    panel.add(this.GrowthBoardHeaderText);
    panel.add(this.GrowthBoardRowsText);
    panel.add(this.GrowthBoardMeText);

    const addAction = (x: number, y: number, text: string, action: string, highlight = false) => {
      const btn = new Text({
        x,
        y,
        around: "center",
        text,
        fontSize: 13,
        fill: highlight ? ColorConf.PRIMARY : this.confUI.HistoryButton.FILL,
        cursor: "pointer"
      });
      btn.hoverStyle = { fill: this.confUI.HistoryButton.FILL_HOVER };
      btn.on(PointerEvent.TAP, () => this.handleGrowthAction_(action));
      this.GrowthActionButtons.push({ action, button: btn });
      panel.add(btn);
    };
    const footerY = top + cardHeight - 26;
    addAction(left + pad + 40, footerY, "刷新", "refresh", true);
    addAction(left + pad + 108, footerY, "签到", "checkin");
    addAction(left + pad + 176, footerY, "补签", "makeup");
    addAction(left + cardWidth - 204, footerY, "榜单类型", "switch-type");
    addAction(left + cardWidth - 122, footerY, "榜单范围", "switch-scope");
    addAction(left + cardWidth - 42, footerY, "关闭", "close");

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

    // 遮罩：与登录/注册一致的主题色浅青蒙层
    const overlay = new Rect({
      x: 0,
      y: 0,
      width: GP.bw,
      height: GP.bh,
      fill: ColorConf.LIGHT_WHITE,
      opacity: 0.92
    });
    panel.add(overlay);

    const cardWidth = Math.min(GP.bw * 0.82, 520);
    const cardHeight = Math.min(GP.bh * 0.72, 460);
    const centerX = GP.bw / 2;
    const centerY = GP.bh / 2;

    // 卡片：与登录/注册一致的玻璃风格（浅青白底、青蓝描边与阴影）
    const card = new Rect({
      x: centerX,
      y: centerY,
      around: "center",
      width: cardWidth,
      height: cardHeight,
      radius: 16,
      fill: "#F0FCFF",
      stroke: "rgba(0,229,255,0.35)",
      strokeWidth: 1,
      shadow: {
        x: 0,
        y: 20,
        blur: 50,
        spread: 0,
        color: "rgba(32,168,215,0.2)"
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

    const titleFill = "#0F172A";
    const labelFill = "#475569";
    const valueFill = "#0F172A";
    const hintFill = "#64748B";

    const title = new Text({
      x: 0,
      y: rowY,
      around: "center",
      text: "用户信息",
      fontSize: conf.TITLE_FONT_SIZE,
      fill: titleFill
    });
    contentGroup.add(title);
    rowY += 36;

    const subtitle = new Text({
      x: 0,
      y: rowY,
      around: "center",
      text: "管理你的账号资料与云端记录",
      fontSize: conf.SUBTITLE_FONT_SIZE,
      fill: labelFill
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
      fill: labelFill
    });
    const nicknameValue = new Text({
      x: valueX,
      y: rowY,
      around: "left",
      text: "-",
      fontSize: conf.VALUE_FONT_SIZE,
      fill: valueFill
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
      fill: labelFill
    });
    const usernameValue = new Text({
      x: valueX,
      y: rowY,
      around: "left",
      text: "-",
      fontSize: conf.VALUE_FONT_SIZE,
      fill: valueFill
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
      fill: labelFill
    });
    const createdValue = new Text({
      x: valueX,
      y: rowY,
      around: "left",
      text: "-",
      fontSize: conf.VALUE_FONT_SIZE,
      fill: valueFill
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
      fill: labelFill
    });
    const totalValue = new Text({
      x: valueX,
      y: rowY,
      around: "left",
      text: "-",
      fontSize: conf.VALUE_FONT_SIZE,
      fill: valueFill
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
      fill: labelFill
    });
    const bestValue = new Text({
      x: valueX,
      y: rowY,
      around: "left",
      text: "-",
      fontSize: conf.VALUE_FONT_SIZE,
      fill: valueFill
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
      fill: labelFill
    });
    const lastValue = new Text({
      x: valueX,
      y: rowY,
      around: "left",
      text: "-",
      fontSize: conf.VALUE_FONT_SIZE,
      fill: valueFill
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
      fill: hintFill
    });
    contentGroup.add(hint);
    rowY += 36;

    const btnY = rowY;
    const btnGap = 12;
    const btnW = 100;
    const btnH = 36;
    const halfSpan = (btnW * 2 + btnGap) / 2;
    const firstRowX = -halfSpan + btnW / 2;
    const secondRowX = halfSpan - btnW / 2;

    // 与登录/注册一致：主按钮主题色、次按钮浅灰
    const primaryBtnFill = ColorConf.PRIMARY;
    const secondaryBtnFill = "#E2E8F0";
    const secondaryBtnText = "#475569";

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
        radius: 10,
        cornerRadius: 10,
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

    addButton(firstRowX, btnY, "修改昵称", primaryBtnFill, "#FFFFFF", () =>
      this.handleChangeNickname_()
    );
    addButton(secondRowX, btnY, "修改密码", primaryBtnFill, "#FFFFFF", () =>
      this.handleChangePassword_()
    );
    addButton(firstRowX, btnY + 44, "退出登录", secondaryBtnFill, secondaryBtnText, () =>
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
      fill: labelFill,
      cursor: "pointer"
    });
    closeBtn.hoverStyle = { fill: titleFill, scale: 1.1 };
    closeBtn.on(PointerEvent.TAP, () => this.hideUserPanel_());
    contentGroup.add(closeBtn);

    panel.add(contentGroup);

    const loadingText = new Text({
      x: 0,
      y: 0,
      around: "center",
      text: "正在加载用户信息...",
      fontSize: 14,
      fill: hintFill,
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

  private async clearHistory_() {
    if (typeof window === "undefined") return;
    const ok = await showConfirm("确认清空所有历史成绩吗？此操作不可撤销。");
    if (!ok) return;
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
      try {
        await syncScoresWithServer();
      } catch (e) {
        console.warn("登录后成绩同步失败，将使用本地记录：", e);
      }
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

  private async showGrowthPanel_() {
    const user = getCurrentUser();
    if (!user) {
      if (typeof window !== "undefined") await showAlert("请先登录后再使用成长中心");
      return;
    }
    this.GrowthPanel.visible = true;
    this.GrowthPanel.opacity = 0;
    this.GrowthPanel.animate([{ opacity: 1 }], { duration: 0.2 });
    this.relocateGrowthPanelLayout_(GP.bw, GP.bh);
    await this.refreshGrowthPanel_();
  }

  private hideGrowthPanel_() {
    this.GrowthPanel.animate([{ opacity: 0 }], { duration: 0.16 }).once(
      AnimateEvent.COMPLETED,
      () => {
        this.GrowthPanel.visible = false;
      }
    );
  }

  private formatBoardType_() {
    if (this.growthBoardType === "daily") return "日榜";
    if (this.growthBoardType === "weekly") return "周榜";
    return "总榜";
  }

  private formatBoardScope_() {
    return this.growthBoardScope === "friends" ? "好友" : "全球";
  }

  private async refreshGrowthPanel_() {
    if (this.growthLoading) return;
    this.growthLoading = true;
    this.GrowthStatusText.text = "加载中...";
    try {
      const [board, tasks, checkin, level] = await Promise.all([
        fetchLeaderboard(this.growthBoardType, this.growthBoardScope, 20),
        fetchDailyTasks(),
        fetchCheckinStatus(),
        fetchLevelInfo()
      ]);

      this.growthTasksSnapshot = tasks.tasks.map((t) => ({
        taskType: t.taskType,
        title: t.title,
        status: t.status
      }));
      this.renderGrowthTasks_(tasks.tasks);

      const topLines = board.top
        .slice(0, 5)
        .map((r) => `${r.rank}. ${r.displayName}  ${this.formatScore_(r.score)}`)
        .join("\n");
      const meLine = board.me
        ? `我的排名 ${board.me.rank}\n与前一名差 ${this.formatScore_(board.me.gapToNext)} ｜ 与榜首差 ${this.formatScore_(board.me.gapToTop)}`
        : "我的排名：暂无（先打一局并同步成绩）";

      const levelPct = Math.max(0, Math.min(100, Math.round(level.progressToNextLevel * 100)));

      this.GrowthLevelText.text = `等级 Lv.${level.level} ｜ XP ${level.totalXp}/${level.nextLevelXp}（${levelPct}%）｜ 积分 ${level.points}`;
      this.GrowthCheckinText.text = `签到状态：${checkin.checkedInToday ? "今日已签到" : "今日未签到"} ｜ 连续 ${checkin.streak} 天`;
      this.GrowthBoardHeaderText.text = `排行榜（${this.formatBoardScope_()}-${this.formatBoardType_()}）`;
      this.GrowthBoardRowsText.text = topLines || "暂无数据";
      this.GrowthBoardMeText.text = meLine;
      this.GrowthStatusText.text = `已更新：${new Date().toLocaleTimeString()}`;
    } catch (e: any) {
      this.GrowthStatusText.text = "更新失败";
      if (typeof window !== "undefined") await showAlert(String(e?.message ?? e));
    } finally {
      this.growthLoading = false;
    }
  }

  private renderGrowthTasks_(tasks: Array<any>) {
    this.GrowthTaskGroup.removeAll();
    this.GrowthTaskClaimButtons = [];
    if (!tasks.length) {
      this.GrowthTaskGroup.add(
        new Text({
          x: 0,
          y: 0,
          around: "left",
          text: "今天暂无任务",
          fontSize: 13,
          fill: "#64748B"
        })
      );
      return;
    }

    const rowWidth = Math.max(280, Math.min(460, Math.floor((this.GrowthCard?.width || 940) * 0.56 - 56)));
    const actionX = rowWidth - 54;
    tasks.forEach((t, idx) => {
      const y = idx * 78;
      const row = new Rect({
        x: 0,
        y,
        width: rowWidth,
        height: 66,
        radius: 10,
        fill: t.status === "completed" ? "#E8FFF1" : "#F8FAFC",
        stroke: "rgba(15,23,42,0.08)",
        strokeWidth: 1
      });
      const title = new Text({
        x: 12,
        y: y + 11,
        around: "left",
        text: t.title,
        fontSize: 14,
        fill: "#0F172A"
      });
      const meta = new Text({
        x: 12,
        y: y + 36,
        around: "left",
        text: `进度 ${t.progress}/${t.target} ｜ 奖励 +${t.rewardPoints}`,
        fontSize: 12,
        fill: "#475569"
      });
      const statusText =
        t.status === "claimed" ? "已领取" : t.status === "completed" ? "可领取" : "进行中";
      const actionBtn = new Text({
        x: actionX,
        y: y + 24,
        around: "center",
        text: t.status === "completed" ? "领取" : statusText,
        fontSize: 12,
        fill: t.status === "completed" ? ColorConf.SUCCESS : "#94A3B8",
        cursor: t.status === "completed" ? "pointer" : "default"
      });
      if (t.status === "completed") {
        actionBtn.hoverStyle = { fill: ColorConf.PRIMARY };
        actionBtn.on(PointerEvent.TAP, async () => {
          try {
            await claimDailyTask(t.taskType);
          } catch (e: any) {
            if (typeof window !== "undefined") await showAlert(String(e?.message ?? e));
          }
          await this.refreshGrowthPanel_();
        });
        this.GrowthTaskClaimButtons.push({ taskType: t.taskType, button: actionBtn });
      }

      this.GrowthTaskGroup.add(row);
      this.GrowthTaskGroup.add(title);
      this.GrowthTaskGroup.add(meta);
      this.GrowthTaskGroup.add(actionBtn);
    });
  }

  private async handleGrowthAction_(action: string) {
    if (action === "close") {
      this.hideGrowthPanel_();
      return;
    }
    if (action === "switch-type") {
      this.growthBoardType =
        this.growthBoardType === "global"
          ? "daily"
          : this.growthBoardType === "daily"
            ? "weekly"
            : "global";
      await this.refreshGrowthPanel_();
      return;
    }
    if (action === "switch-scope") {
      this.growthBoardScope = this.growthBoardScope === "global" ? "friends" : "global";
      await this.refreshGrowthPanel_();
      return;
    }
    if (action === "checkin") {
      try {
        await doCheckin();
      } catch (e: any) {
        if (typeof window !== "undefined") await showAlert(String(e?.message ?? e));
      }
      await this.refreshGrowthPanel_();
      return;
    }
    if (action === "makeup") {
      try {
        await doMakeupCheckin();
      } catch (e: any) {
        if (typeof window !== "undefined") await showAlert(String(e?.message ?? e));
      }
      await this.refreshGrowthPanel_();
      return;
    }
    await this.refreshGrowthPanel_();
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
      if (typeof window !== "undefined") {
        await showAlert(String(e?.message ?? e));
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
    const next = await showPrompt(
      "请输入新的昵称（最多 24 个字符）：",
      current === "(未设置)" ? "" : current
    );
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    if (trimmed.length > 24) {
      await showAlert("昵称长度请控制在 24 个字符以内");
      return;
    }
    try {
      const profile = await updateNickname(trimmed);
      this.UserProfileTextLines.nickname.text = profile.nickname || "(未设置)";
      this.updateAccountText_();
      await showAlert("昵称已更新");
    } catch (e: any) {
      await showAlert(String(e?.message ?? e));
    }
  }

  private async handleChangePassword_() {
    if (typeof window === "undefined") return;
    const oldPwd = await showPrompt("请输入当前密码：", undefined, "password");
    if (!oldPwd) return;
    try {
      await verifyPassword(oldPwd);
    } catch (e: any) {
      await showAlert(String(e?.message ?? e));
      return;
    }
    const newPwd = await showPrompt("请输入新密码（至少 6 位）：", undefined, "password");
    if (!newPwd) return;
    if (newPwd.length < 6) {
      await showAlert("新密码至少 6 位");
      return;
    }
    const confirmPwd = await showPrompt("请再次输入新密码进行确认：", undefined, "password");
    if (confirmPwd == null) return;
    if (confirmPwd !== newPwd) {
      await showAlert("两次输入的新密码不一致");
      return;
    }
    try {
      await changePassword(oldPwd, newPwd);
      await showAlert("密码修改成功");
    } catch (e: any) {
      await showAlert(String(e?.message ?? e));
    }
  }

  private async handleLogout_() {
    if (typeof window === "undefined") return;
    const ok = await showConfirm("确定要退出登录吗？");
    if (!ok) return;
    logout();
    this.updateAccountText_();
    this.hideUserPanel_();
  }

  private async handleDeleteAccount_() {
    if (typeof window === "undefined") return;
    const first = await showConfirm(
      "确定要注销账号吗？此操作会删除你的账号以及云端成绩记录，且无法恢复。"
    );
    if (!first) return;
    const second = await showConfirm("再次确认：真的要永久注销账号吗？");
    if (!second) return;
    try {
      await deleteAccount();
      this.updateAccountText_();
      this.hideUserPanel_();
      await showAlert("账号已注销");
    } catch (e: any) {
      await showAlert(String(e?.message ?? e));
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
    this.GrowthButton.x = e.width * this.confUI.X_RATIO;
    this.GrowthButton.y =
      e.height * this.confUI.HistoryButton.Y_RATIO + this.confUI.HistoryButton.Y_OFFSET + 28;
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
    if (this.GrowthPanel.visible && this.GrowthPanel.children.length > 0) {
      this.GrowthPanel.width = e.width;
      this.GrowthPanel.height = e.height;
      (this.GrowthPanel.children[0] as Rect).width = e.width;
      (this.GrowthPanel.children[0] as Rect).height = e.height;
      this.relocateGrowthPanelLayout_(e.width, e.height);
    }
  }

  private relocateGrowthPanelLayout_(width: number, height: number) {
    if (!this.GrowthCard) return;
    const cardWidth = Math.min(width * 0.9, 940);
    const cardHeight = Math.min(height * 0.82, 640);
    const left = width / 2 - cardWidth / 2;
    const top = height / 2 - cardHeight / 2;
    const pad = 22;

    this.GrowthCard.x = width / 2;
    this.GrowthCard.y = height / 2;
    this.GrowthCard.width = cardWidth;
    this.GrowthCard.height = cardHeight;

    // children[0] is overlay, children[1] is GrowthCard
    const status = this.GrowthStatusText;
    status.x = left + cardWidth - pad;
    status.y = top + 20;

    this.GrowthLevelText.x = left + pad + 14;
    this.GrowthLevelText.y = top + 70;
    this.GrowthCheckinText.x = left + pad + 14;
    this.GrowthCheckinText.y = top + 100;

    this.GrowthTaskGroup.x = left + pad + 14;
    this.GrowthTaskGroup.y = top + 194;

    this.GrowthBoardHeaderText.x = left + cardWidth * 0.58 + 14;
    this.GrowthBoardHeaderText.y = top + 166;
    this.GrowthBoardRowsText.x = left + cardWidth * 0.58 + 14;
    this.GrowthBoardRowsText.y = top + 196;
    this.GrowthBoardMeText.x = left + cardWidth * 0.58 + 14;
    this.GrowthBoardMeText.y = top + cardHeight - 80;

    const footerY = top + cardHeight - 26;
    const map: Record<string, number> = {
      refresh: left + pad + 40,
      checkin: left + pad + 108,
      makeup: left + pad + 176,
      "switch-type": left + cardWidth - 204,
      "switch-scope": left + cardWidth - 122,
      close: left + cardWidth - 42
    };
    this.GrowthActionButtons.forEach(({ action, button }) => {
      if (map[action] != null) {
        button.x = map[action];
        button.y = footerY;
      }
    });
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
    this.GrowthButton.opacity = 0;
    this.HistoryPanel.visible = false;
    this.HistoryPanel.opacity = 0;
    this.GrowthPanel.visible = false;
    this.GrowthPanel.opacity = 0;
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
    this.GrowthButton.fadeIn_(0.6, 0.6);
  }

  hide_() {
    this.Brand.hoverStyle = false;
    this.fadeOut_(0.5).once(AnimateEvent.COMPLETED, () => {
      this.visible = false;
    });
  }
}

