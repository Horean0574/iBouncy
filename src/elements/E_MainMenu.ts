import { AnimateEvent, Group, Image, PointerEvent, Rect, Text } from "leafer-game";
import { evBus, GEV, GP } from "../core/instances";
import TextLine from "../utils/TextLine";
import { UIConf, ColorConf, FontConf, DIFFICULTY_LEVELS, setDifficulty, getDifficultyKey } from "../config";
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
  private growthRootGroup!: Group;
  private growthNavGroup!: Group;
  private growthTabGroup!: Group;
  private growthContentHost!: Group;
  private growthFooterGroup!: Group;
  private growthTitleText!: Text;
  private growthCloseBtn!: Text;
  private growthSectionOverview!: Group;
  private growthSectionTasks!: Group;
  private growthSectionAchievements!: Group;
  private growthSectionSkins!: Group;
  private growthSectionData!: Group;
  private growthTaskListGroup!: Group;
  private growthOverviewNick!: Text;
  private growthOverviewLevel!: Text;
  private growthOverviewProgressTrack!: Rect;
  private growthOverviewProgressFill!: Rect;
  private growthOverviewTodo!: Text;
  private growthOverviewStats!: Text;
  private growthOverviewRankLine!: Text;
  private growthShortcutTaskDot!: Text;
  private growthShortcutAchDot!: Text;
  private growthShortcutCheckinDot!: Text;
  private growthOverviewTopCard!: Rect;
  private growthOverviewAvatarRect!: Rect;
  private growthShortcutTaskG!: Group;
  private growthShortcutAchG!: Group;
  private growthShortcutCheckG!: Group;
  private growthShortcutTaskInner!: Rect;
  private growthShortcutAchInner!: Rect;
  private growthShortcutCheckInner!: Rect;
  private growthTaskSectionTitle!: Text;
  private growthSignBtn!: Text;
  private growthMakeupBtn!: Text;
  private growthClaimAllBtn!: Text;
  private growthAchieveCardBg!: Rect;
  private growthSkinsCardBg!: Rect;
  private growthDataCardBg!: Rect;
  private growthOpenRankBtn!: Text;
  private growthDataRankBtn!: Text;
  private growthDataAccountBtn!: Text;
  private growthCloseHit!: Rect;
  private growthLayoutMobile = false;
  private growthOverviewProgressCaption!: Text;
  private growthOverviewProgressEndMark!: Text;
  private growthAchieveTitle!: Text;
  private growthAchieveIntro!: Text;
  private growthAchUnlockedRow!: Group;
  private growthAchNearRow!: Group;
  private growthAchLockedRow!: Group;
  private growthAchStar!: Text;
  private growthAchNearBar!: Rect;
  private growthAchNearFill!: Rect;
  private growthAchUnlockedLabel!: Text;
  private growthAchNearLabel!: Text;
  private growthAchLockedLabel!: Text;
  private growthAchLockedHint!: Text;
  private growthSkinsTitle!: Text;
  private growthDataTitle!: Text;
  private growthAchieveAnimStarted = false;
  private growthLeaderModal!: Group;
  private growthLeaderRowsText!: Text;
  private growthLeaderMeText!: Text;
  private growthNavEntries: Array<{ id: string; bg: Rect; label: Text }> = [];
  private growthTabEntries: Array<{ id: string; label: Text; hit: Rect; wrap: Group }> = [];
  private growthActiveSection: "overview" | "tasks" | "achievements" | "skins" | "data" =
    "overview";
  private growthCached: {
    board: Awaited<ReturnType<typeof fetchLeaderboard>>;
    tasks: Awaited<ReturnType<typeof fetchDailyTasks>>;
    checkin: Awaited<ReturnType<typeof fetchCheckinStatus>>;
    level: Awaited<ReturnType<typeof fetchLevelInfo>>;
  } | null = null;
  GrowthActionButtons: Array<{ action: string; button: Group }> = [];
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
    const gc = this.confUI.GrowthCenter;
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

    this.GrowthCard = new Rect({
      x: GP.bw / 2,
      y: GP.bh / 2,
      around: "center",
      width: Math.min(GP.bw - 2 * gc.MOBILE_MARGIN, gc.CARD_FIXED_W_PC),
      height: Math.min(GP.bh * 0.86, gc.CARD_MAX_H),
      radius: 16,
      fill: gc.CARD_FILL,
      stroke: gc.CARD_STROKE,
      strokeWidth: 1
    });
    panel.add(this.GrowthCard);

    this.growthRootGroup = new Group({ x: 0, y: 0, width: 0, height: 0 });
    panel.add(this.growthRootGroup);
    const rg = this.growthRootGroup;

    this.growthTitleText = new Text({
      x: gc.PAD,
      y: 16,
      around: "left",
      text: "成长中心",
      fontSize: gc.TITLE_SIZE,
      fontFamily: FontConf.TITLE,
      fill: ColorConf.DARK_GRAY
    });
    rg.add(this.growthTitleText);

    this.GrowthStatusText = new Text({
      x: 400,
      y: 18,
      around: "right",
      text: "准备就绪",
      fontSize: gc.CAPTION_SIZE,
      fill: ColorConf.LIGHT_GRAY
    });
    rg.add(this.GrowthStatusText);

    this.growthCloseBtn = new Text({
      x: 880,
      y: 16,
      around: "center",
      text: "×",
      fontSize: 22,
      fill: ColorConf.DIM_GRAY,
      cursor: "pointer"
    });
    this.growthCloseBtn.hoverStyle = { fill: ColorConf.PRIMARY, scale: 1.08 };
    this.growthCloseBtn.on(PointerEvent.TAP, () => this.hideGrowthPanel_());
    rg.add(this.growthCloseBtn);

    this.growthCloseHit = new Rect({
      x: 0,
      y: 0,
      width: gc.MIN_TOUCH,
      height: gc.MIN_TOUCH,
      fill: "rgba(0,0,0,0.02)",
      cursor: "pointer"
    });
    this.growthCloseHit.on(PointerEvent.TAP, () => this.hideGrowthPanel_());
    rg.add(this.growthCloseHit);

    this.growthNavGroup = new Group({ x: 8, y: 50, width: gc.NAV_W, height: 520 });
    rg.add(this.growthNavGroup);
    const navSpec: Array<{
      id: "overview" | "achievements" | "tasks" | "skins" | "data" | "settings";
      label: string;
    }> = [
      { id: "overview", label: "成长概览" },
      { id: "achievements", label: "成就体系" },
      { id: "tasks", label: "任务/签到" },
      { id: "skins", label: "皮肤商城" },
      { id: "data", label: "数据统计" },
      { id: "settings", label: "设置" }
    ];
    navSpec.forEach((n, i) => {
      const gy = i * (gc.NAV_ITEM_H + gc.GAP);
      const bgNav = new Rect({
        x: 2,
        y: gy,
        width: gc.NAV_W - 4,
        height: gc.NAV_ITEM_H,
        radius: 10,
        fill: "rgba(32,168,215,0.12)",
        stroke: "rgba(32,168,215,0.2)",
        strokeWidth: 1,
        cursor: "pointer"
      });
      const label = new Text({
        x: gc.NAV_W / 2,
        y: gy + gc.NAV_ITEM_H / 2,
        around: "center",
        text: n.label,
        fontSize: gc.BODY_SIZE - 1,
        fill: ColorConf.GRAY
      });
      bgNav.on(PointerEvent.TAP, () => {
        if (n.id === "settings") {
          this.hideGrowthPanel_();
          void this.showUserPanel_();
          return;
        }
        this.setGrowthSection_(n.id);
      });
      label.on(PointerEvent.TAP, () => {
        if (n.id === "settings") {
          this.hideGrowthPanel_();
          void this.showUserPanel_();
          return;
        }
        this.setGrowthSection_(n.id);
      });
      label.cursor = "pointer";
      this.growthNavGroup.add(bgNav);
      this.growthNavGroup.add(label);
      this.growthNavEntries.push({ id: n.id, bg: bgNav, label });
    });

    this.growthTabGroup = new Group({ x: gc.PAD, y: 48, width: 600, height: gc.TAB_H + 8, visible: false });
    rg.add(this.growthTabGroup);
    const tabSpec: Array<{ id: "overview" | "tasks" | "achievements" | "skins" | "data"; label: string }> =
      [
      { id: "overview", label: "概览" },
      { id: "tasks", label: "任务" },
      { id: "achievements", label: "成就" },
      { id: "skins", label: "皮肤" },
      { id: "data", label: "更多" }
    ];
    tabSpec.forEach((t, i) => {
      const wrap = new Group({ x: i * 76, y: 0, cursor: "pointer" });
      const hit = new Rect({
        x: 0,
        y: 0,
        width: 72,
        height: Math.max(gc.TAB_H, gc.MIN_TOUCH),
        fill: "rgba(0,0,0,0.02)",
        radius: 8
      });
      const lab = new Text({
        x: 36,
        y: hit.height / 2,
        around: "center",
        text: t.label,
        fontSize: gc.CAPTION_SIZE + 1,
        fill: ColorConf.GRAY,
        cursor: "pointer"
      });
      const go = () => this.setGrowthSection_(t.id);
      hit.on(PointerEvent.TAP, go);
      lab.on(PointerEvent.TAP, go);
      lab.hoverStyle = { fill: ColorConf.PRIMARY };
      wrap.add(hit);
      wrap.add(lab);
      this.growthTabGroup.add(wrap);
      this.growthTabEntries.push({ id: t.id, label: lab, hit, wrap });
    });

    this.growthContentHost = new Group({ x: gc.NAV_W + gc.CARD_GAP, y: 48, width: 700, height: 520 });
    rg.add(this.growthContentHost);

    this.growthSectionOverview = new Group({ x: 0, y: 0, width: 700, height: 520, visible: true });
    this.growthSectionTasks = new Group({ x: 0, y: 0, width: 700, height: 520, visible: false });
    this.growthSectionAchievements = new Group({ x: 0, y: 0, width: 700, height: 520, visible: false });
    this.growthSectionSkins = new Group({ x: 0, y: 0, width: 700, height: 520, visible: false });
    this.growthSectionData = new Group({ x: 0, y: 0, width: 700, height: 520, visible: false });

    const cardStyle = (y: number, h: number, strokeW = 1) =>
      new Rect({
        x: 0,
        y,
        width: 680,
        height: h,
        radius: 12,
        fill: ColorConf.WHITE,
        stroke: "rgba(15,23,42,0.08)",
        strokeWidth: strokeW
      });

    this.growthOverviewTopCard = cardStyle(0, 118);
    this.growthSectionOverview.add(this.growthOverviewTopCard);
    this.growthOverviewAvatarRect = new Rect({
      x: gc.CARD_PAD,
      y: gc.CARD_PAD,
      width: 52,
      height: 52,
      radius: 26,
      fill: "rgba(32,168,215,0.2)",
      stroke: "rgba(32,168,215,0.35)",
      strokeWidth: 1
    });
    this.growthSectionOverview.add(this.growthOverviewAvatarRect);
    this.growthOverviewNick = new Text({
      x: gc.CARD_PAD + 52 + gc.TEXT_ICON_GAP,
      y: gc.CARD_PAD + 4,
      around: "left",
      text: "昵称",
      fontSize: gc.SUBTITLE_SIZE,
      fill: gc.TEXT_BODY
    });
    this.growthOverviewLevel = new Text({
      x: 400,
      y: gc.CARD_PAD + 4,
      around: "right",
      text: "Lv.1\n— 分 · — 局",
      fontSize: gc.BODY_SIZE,
      fill: gc.TEXT_MUTED,
      lineHeight: 20
    });
    this.growthSectionOverview.add(this.growthOverviewNick);
    this.growthSectionOverview.add(this.growthOverviewLevel);

    const trackW = 420;
    const trackY = 78;
    this.growthOverviewProgressTrack = new Rect({
      x: gc.CARD_PAD + 52 + gc.TEXT_ICON_GAP,
      y: trackY,
      width: trackW,
      height: gc.PROGRESS_H,
      radius: gc.PROGRESS_H / 2,
      fill: "#E2E8F0"
    });
    this.growthOverviewProgressFill = new Rect({
      x: gc.CARD_PAD + 52 + gc.TEXT_ICON_GAP,
      y: trackY,
      width: 0,
      height: gc.PROGRESS_H,
      radius: gc.PROGRESS_H / 2,
      fill: {
        type: "linear",
        from: { x: 0, y: 0 },
        to: { x: 1, y: 0 },
        stops: [
          { offset: 0, color: "#44C2F1" },
          { offset: 1, color: "#20A8D7" }
        ]
      } as any
    });
    this.growthSectionOverview.add(this.growthOverviewProgressTrack);
    this.growthSectionOverview.add(this.growthOverviewProgressFill);

    this.growthOverviewProgressEndMark = new Text({
      x: gc.CARD_PAD + 52 + gc.TEXT_ICON_GAP + trackW + gc.TEXT_ICON_GAP,
      y: trackY + gc.PROGRESS_H / 2,
      around: "center",
      text: "★",
      fontSize: 15,
      fill: "#F59E0B"
    });
    this.growthSectionOverview.add(this.growthOverviewProgressEndMark);

    this.growthOverviewProgressCaption = new Text({
      x: gc.CARD_PAD + 52 + gc.TEXT_ICON_GAP,
      y: trackY + gc.PROGRESS_H + gc.TEXT_ICON_GAP,
      around: "left",
      text: "Lv.1  0/120 XP  →  Lv.2",
      fontSize: gc.CAPTION_SIZE,
      fill: gc.TEXT_MUTED,
      lineHeight: gc.GRID * 2
    });
    this.growthSectionOverview.add(this.growthOverviewProgressCaption);

    this.growthOverviewTodo = new Text({
      x: 0,
      y: 132,
      around: "left",
      text: "加载后将显示待办",
      fontSize: gc.BODY_SIZE,
      fill: ColorConf.PRIMARY
    });
    this.growthSectionOverview.add(this.growthOverviewTodo);

    const shortcutY = 168;
    const mkShortcut = (sx: number, title: string, dot: "task" | "ach" | "check") => {
      const g = new Group({ x: sx, y: shortcutY, cursor: "pointer" });
      const inner = new Rect({
        x: 0,
        y: 0,
        width: 200,
        height: 72,
        radius: 10,
        fill: "#F8FAFC",
        stroke: "rgba(32,168,215,0.15)",
        strokeWidth: 1
      });
      g.add(inner);
      g.add(
        new Text({
          x: gc.BTN_PAD_X,
          y: gc.BTN_PAD_Y + 6,
          around: "left",
          text: title,
          fontSize: gc.BODY_SIZE,
          fill: gc.TEXT_BODY
        })
      );
      const d = new Text({
        x: 184,
        y: 10,
        around: "center",
        text: "",
        fontSize: 18,
        fill: ColorConf.DANGER,
        visible: false
      });
      g.add(d);
      if (dot === "task") {
        this.growthShortcutTaskDot = d;
        this.growthShortcutTaskG = g;
        this.growthShortcutTaskInner = inner;
      }
      if (dot === "ach") {
        this.growthShortcutAchDot = d;
        this.growthShortcutAchG = g;
        this.growthShortcutAchInner = inner;
      }
      if (dot === "check") {
        this.growthShortcutCheckinDot = d;
        this.growthShortcutCheckG = g;
        this.growthShortcutCheckInner = inner;
      }
      g.on(PointerEvent.TAP, () => {
        if (dot === "task" || dot === "check") this.setGrowthSection_("tasks");
        else this.setGrowthSection_("achievements");
      });
      return { g, inner };
    };
    mkShortcut(0, "任务进度", "task");
    mkShortcut(216, "成就", "ach");
    mkShortcut(432, "签到", "check");
    this.growthSectionOverview.add(this.growthShortcutTaskG);
    this.growthSectionOverview.add(this.growthShortcutAchG);
    this.growthSectionOverview.add(this.growthShortcutCheckG);

    this.growthOverviewStats = new Text({
      x: 0,
      y: 258,
      around: "left",
      text: "本周数据加载中…",
      fontSize: gc.CAPTION_SIZE,
      fill: gc.TEXT_SUPPORT,
      lineHeight: 20
    });
    this.growthSectionOverview.add(this.growthOverviewStats);

    this.growthOverviewRankLine = new Text({
      x: 0,
      y: 300,
      around: "left",
      text: "全球排名：-",
      fontSize: gc.BODY_SIZE,
      fill: gc.TEXT_MUTED,
      cursor: "pointer"
    });
    this.growthOverviewRankLine.hoverStyle = { fill: ColorConf.PRIMARY };
    this.growthOverviewRankLine.on(PointerEvent.TAP, () => this.showGrowthLeaderModal_());
    this.growthSectionOverview.add(this.growthOverviewRankLine);

    this.growthOpenRankBtn = new Text({
      x: 0,
      y: 338,
      around: "left",
      text: "打开完整排行榜",
      fontSize: gc.BODY_SIZE,
      fill: ColorConf.PRIMARY,
      cursor: "pointer"
    });
    this.growthOpenRankBtn.hoverStyle = { scale: 1.03 };
    this.growthOpenRankBtn.on(PointerEvent.TAP, () => this.showGrowthLeaderModal_());
    this.growthSectionOverview.add(this.growthOpenRankBtn);

    this.growthTaskSectionTitle = new Text({
      x: 0,
      y: 0,
      around: "left",
      text: "今日任务",
      fontSize: gc.SUBTITLE_SIZE,
      fill: gc.TEXT_BODY
    });
    this.growthSectionTasks.add(this.growthTaskSectionTitle);
    const taskBarY = 36;
    this.growthSignBtn = new Text({
      x: 0,
      y: taskBarY,
      around: "left",
      text: "签到",
      fontSize: gc.BODY_SIZE,
      fill: ColorConf.PRIMARY,
      cursor: "pointer"
    });
    this.growthSignBtn.on(PointerEvent.TAP, () => void this.handleGrowthAction_("checkin"));
    this.growthMakeupBtn = new Text({
      x: 64,
      y: taskBarY,
      around: "left",
      text: "补签",
      fontSize: gc.BODY_SIZE,
      fill: ColorConf.PRIMARY,
      cursor: "pointer"
    });
    this.growthMakeupBtn.on(PointerEvent.TAP, () => void this.handleGrowthAction_("makeup"));
    this.growthClaimAllBtn = new Text({
      x: 140,
      y: taskBarY,
      around: "left",
      text: "一键领取全部",
      fontSize: gc.BODY_SIZE,
      fill: ColorConf.SUCCESS,
      cursor: "pointer"
    });
    this.growthClaimAllBtn.hoverStyle = { fill: ColorConf.PRIMARY, rotation: 10 };
    this.growthClaimAllBtn.on(PointerEvent.TAP, () => void this.claimAllGrowthTasks_());
    this.growthSectionTasks.add(this.growthSignBtn);
    this.growthSectionTasks.add(this.growthMakeupBtn);
    this.growthSectionTasks.add(this.growthClaimAllBtn);

    this.growthTaskListGroup = new Group({ x: 0, y: 72, width: 680, height: 420 });
    this.growthSectionTasks.add(this.growthTaskListGroup);

    this.growthAchieveCardBg = cardStyle(0, 280);
    this.growthSectionAchievements.add(this.growthAchieveCardBg);
    this.growthAchieveTitle = new Text({
      x: gc.CARD_PAD,
      y: gc.CARD_PAD,
      around: "left",
      text: "成就",
      fontSize: gc.SUBTITLE_SIZE,
      fill: gc.TEXT_BODY
    });
    this.growthSectionAchievements.add(this.growthAchieveTitle);
    this.growthAchieveIntro = new Text({
      x: gc.CARD_PAD,
      y: gc.CARD_PAD + 28,
      around: "left",
      text: "随等级解锁主题与玩法，悬停未解锁项可查看条件。",
      fontSize: gc.CAPTION_SIZE,
      fill: gc.TEXT_SUPPORT,
      lineHeight: gc.GRID * 2 + 2
    });
    this.growthSectionAchievements.add(this.growthAchieveIntro);

    const achRow = (y: number, fill: string, stroke: string) => {
      const row = new Group({ x: gc.CARD_PAD, y });
      row.add(
        new Rect({
          x: 0,
          y: 0,
          width: 632,
          height: 56,
          radius: 10,
          fill,
          stroke,
          strokeWidth: 1
        })
      );
      return row;
    };

    this.growthAchUnlockedRow = achRow(92, "#ECFDF5", "rgba(32,200,120,0.35)");
    this.growthAchStar = new Text({
      x: 20,
      y: 28,
      around: "center",
      text: "✦",
      fontSize: 20,
      fill: ColorConf.PRIMARY
    });
    this.growthAchUnlockedLabel = new Text({
      x: 44,
      y: 12,
      around: "left",
      text: "已解锁 · —",
      fontSize: gc.BODY_SIZE,
      fill: gc.TEXT_BODY,
      lineHeight: 22
    });
    this.growthAchUnlockedRow.add(this.growthAchStar);
    this.growthAchUnlockedRow.add(this.growthAchUnlockedLabel);
    this.growthSectionAchievements.add(this.growthAchUnlockedRow);

    this.growthAchNearRow = achRow(156, "#EFF6FF", "rgba(32,168,215,0.28)");
    this.growthAchNearBar = new Rect({
      x: 44,
      y: 24,
      width: 200,
      height: 8,
      radius: 4,
      fill: "#E2E8F0"
    });
    this.growthAchNearFill = new Rect({
      x: 44,
      y: 24,
      width: 0,
      height: 8,
      radius: 4,
      fill: ColorConf.PRIMARY
    });
    this.growthAchNearRow.add(this.growthAchNearBar);
    this.growthAchNearRow.add(this.growthAchNearFill);
    this.growthAchNearRow.add(
      new Text({
        x: 20,
        y: 28,
        around: "center",
        text: "◐",
        fontSize: 18,
        fill: ColorConf.PRIMARY
      })
    );
    this.growthAchNearLabel = new Text({
      x: 44,
      y: 36,
      around: "left",
      text: "即将解锁 · —",
      fontSize: gc.CAPTION_SIZE,
      fill: gc.TEXT_MUTED,
      lineHeight: 18
    });
    this.growthAchNearRow.add(this.growthAchNearLabel);
    this.growthSectionAchievements.add(this.growthAchNearRow);

    this.growthAchLockedRow = achRow(220, "#F8FAFC", "rgba(15,23,42,0.06)");
    this.growthAchLockedRow.opacity = 0.92;
    this.growthAchLockedRow.cursor = "default";
    this.growthAchLockedLabel = new Text({
      x: 44,
      y: 10,
      around: "left",
      text: "未解锁 · —",
      fontSize: gc.BODY_SIZE,
      fill: gc.TEXT_SUPPORT,
      lineHeight: 20
    });
    this.growthAchLockedHint = new Text({
      x: 44,
      y: 30,
      around: "left",
      text: "条件：—",
      fontSize: gc.CAPTION_SIZE,
      fill: gc.TEXT_SUPPORT,
      lineHeight: 18
    });
    this.growthAchLockedHint.hoverStyle = { fill: ColorConf.PRIMARY };
    this.growthAchLockedRow.add(
      new Text({
        x: 20,
        y: 18,
        around: "center",
        text: "○",
        fontSize: 18,
        fill: gc.TEXT_SUPPORT
      })
    );
    this.growthAchLockedRow.add(this.growthAchLockedLabel);
    this.growthAchLockedRow.add(this.growthAchLockedHint);
    this.growthSectionAchievements.add(this.growthAchLockedRow);

    this.growthSkinsCardBg = cardStyle(0, 200);
    this.growthSectionSkins.add(this.growthSkinsCardBg);
    this.growthSkinsTitle = new Text({
      x: gc.CARD_PAD,
      y: gc.CARD_PAD,
      around: "left",
      text: "皮肤商城",
      fontSize: gc.SUBTITLE_SIZE,
      fill: gc.TEXT_BODY
    });
    this.growthSectionSkins.add(this.growthSkinsTitle);
    this.growthSectionSkins.add(
      new Text({
        x: gc.CARD_PAD,
        y: gc.CARD_PAD + 36,
        around: "left",
        text: "预览与一键穿戴即将开放。",
        fontSize: gc.BODY_SIZE,
        fill: gc.TEXT_MUTED,
        lineHeight: 22
      })
    );

    this.growthDataCardBg = cardStyle(0, 240);
    this.growthSectionData.add(this.growthDataCardBg);
    this.growthDataTitle = new Text({
      x: gc.CARD_PAD,
      y: gc.CARD_PAD,
      around: "left",
      text: "数据统计",
      fontSize: gc.SUBTITLE_SIZE,
      fill: gc.TEXT_BODY
    });
    this.growthSectionData.add(this.growthDataTitle);
    this.growthSectionData.add(
      new Text({
        x: gc.CARD_PAD,
        y: gc.CARD_PAD + 36,
        around: "left",
        text: "累计游玩与总分；详细历史将支持折叠。",
        fontSize: gc.BODY_SIZE,
        fill: gc.TEXT_MUTED,
        lineHeight: 22
      })
    );
    this.growthDataRankBtn = new Text({
      x: gc.CARD_PAD,
      y: 200,
      around: "left",
      text: "查看排行榜",
      fontSize: gc.BODY_SIZE,
      fill: ColorConf.PRIMARY,
      cursor: "pointer"
    });
    this.growthDataRankBtn.on(PointerEvent.TAP, () => this.showGrowthLeaderModal_());
    this.growthSectionData.add(this.growthDataRankBtn);
    this.growthDataAccountBtn = new Text({
      x: gc.CARD_PAD,
      y: 230,
      around: "left",
      text: "账号与安全（昵称 / 密码）",
      fontSize: gc.BODY_SIZE,
      fill: ColorConf.PRIMARY,
      cursor: "pointer"
    });
    this.growthDataAccountBtn.hoverStyle = { fill: ColorConf.DARK_GRAY };
    this.growthDataAccountBtn.on(PointerEvent.TAP, () => {
      this.hideGrowthPanel_();
      void this.showUserPanel_();
    });
    this.growthSectionData.add(this.growthDataAccountBtn);

    this.growthContentHost.add(this.growthSectionOverview);
    this.growthContentHost.add(this.growthSectionTasks);
    this.growthContentHost.add(this.growthSectionAchievements);
    this.growthContentHost.add(this.growthSectionSkins);
    this.growthContentHost.add(this.growthSectionData);

    this.growthFooterGroup = new Group({ x: gc.PAD, y: 580, width: 800, height: 44 });
    rg.add(this.growthFooterGroup);
    const addFoot = (label: string, action: string, primary = false) => {
      const g = new Group({ around: "center", cursor: "pointer" });
      const hw = gc.FOOTER_BTN_MIN_W;
      const hh = gc.MIN_TOUCH;
      const hit = new Rect({
        x: -hw / 2,
        y: -hh / 2,
        width: hw,
        height: hh,
        fill: "rgba(0,0,0,0.02)",
        radius: 8
      });
      const lab = new Text({
        x: 0,
        y: 0,
        around: "center",
        text: label,
        fontSize: gc.BODY_SIZE,
        fill: primary ? ColorConf.PRIMARY : ColorConf.GRAY,
        cursor: "pointer"
      });
      lab.hoverStyle = { fill: ColorConf.PRIMARY, scale: 1.03 };
      const fire = () => void this.handleGrowthAction_(action);
      hit.on(PointerEvent.TAP, fire);
      lab.on(PointerEvent.TAP, fire);
      g.add(hit);
      g.add(lab);
      this.GrowthActionButtons.push({ action, button: g });
      this.growthFooterGroup.add(g);
    };
    addFoot("刷新", "refresh", true);
    addFoot("榜单类型", "switch-type");
    addFoot("榜单范围", "switch-scope");
    addFoot("关闭", "close");

    this.growthLeaderModal = new Group({
      x: 0,
      y: 0,
      width: GP.bw,
      height: GP.bh,
      visible: false,
      zIndex: 10
    });
    const leaderDim = new Rect({
      x: 0,
      y: 0,
      width: GP.bw,
      height: GP.bh,
      fill: "rgba(15,23,42,0.45)",
      cursor: "pointer"
    });
    this.growthLeaderModal.add(leaderDim);
    const modalCard = new Rect({
      x: GP.bw / 2,
      y: GP.bh / 2,
      around: "center",
      width: Math.min(GP.bw * 0.85, 420),
      height: Math.min(GP.bh * 0.7, 480),
      radius: 14,
      fill: "#F0FCFF",
      stroke: "rgba(32,168,215,0.3)",
      strokeWidth: 1
    });
    this.growthLeaderModal.add(modalCard);
    this.growthLeaderRowsText = new Text({
      x: GP.bw / 2,
      y: GP.bh / 2 - 120,
      around: "center",
      text: "",
      fontSize: gc.CAPTION_SIZE,
      lineHeight: 20,
      fill: ColorConf.DARK_GRAY
    });
    this.growthLeaderMeText = new Text({
      x: GP.bw / 2,
      y: GP.bh / 2 + 140,
      around: "center",
      text: "",
      fontSize: gc.CAPTION_SIZE,
      fill: ColorConf.LIGHT_GRAY,
      lineHeight: 18
    });
    this.growthLeaderModal.add(this.growthLeaderRowsText);
    this.growthLeaderModal.add(this.growthLeaderMeText);
    const modalTitle = new Text({
      x: GP.bw / 2,
      y: GP.bh / 2 - 200,
      around: "center",
      text: "排行榜",
      fontSize: gc.SUBTITLE_SIZE,
      fill: ColorConf.DARK_GRAY
    });
    this.growthLeaderModal.add(modalTitle);
    const modalClose = new Text({
      x: GP.bw / 2 + 160,
      y: GP.bh / 2 - 200,
      around: "center",
      text: "关闭",
      fontSize: gc.BODY_SIZE,
      fill: ColorConf.PRIMARY,
      cursor: "pointer"
    });
    modalClose.on(PointerEvent.TAP, () => this.hideGrowthLeaderModal_());
    this.growthLeaderModal.add(modalClose);
    const mSwType = new Text({
      x: GP.bw / 2 - 80,
      y: GP.bh / 2 + 175,
      around: "center",
      text: "切换周期",
      fontSize: gc.CAPTION_SIZE,
      fill: ColorConf.PRIMARY,
      cursor: "pointer"
    });
    mSwType.on(PointerEvent.TAP, () => void this.handleGrowthAction_("switch-type"));
    const mSwScope = new Text({
      x: GP.bw / 2 + 80,
      y: GP.bh / 2 + 175,
      around: "center",
      text: "切换范围",
      fontSize: gc.CAPTION_SIZE,
      fill: ColorConf.PRIMARY,
      cursor: "pointer"
    });
    mSwScope.on(PointerEvent.TAP, () => void this.handleGrowthAction_("switch-scope"));
    this.growthLeaderModal.add(mSwType);
    this.growthLeaderModal.add(mSwScope);

    leaderDim.on(PointerEvent.TAP, () => this.hideGrowthLeaderModal_());

    panel.add(this.growthLeaderModal);

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
    this.setGrowthSection_("overview");
    await this.refreshGrowthPanel_();
  }

  private hideGrowthPanel_() {
    this.hideGrowthLeaderModal_();
    this.GrowthPanel.animate([{ opacity: 0 }], { duration: 0.16 }).once(
      AnimateEvent.COMPLETED,
      () => {
        this.GrowthPanel.visible = false;
      }
    );
  }

  private setGrowthSection_(id: typeof this.growthActiveSection) {
    this.growthActiveSection = id;
    const map: Record<string, Group> = {
      overview: this.growthSectionOverview,
      tasks: this.growthSectionTasks,
      achievements: this.growthSectionAchievements,
      skins: this.growthSectionSkins,
      data: this.growthSectionData
    };
    Object.entries(map).forEach(([k, g]) => {
      g.visible = k === id;
    });
    this.growthNavEntries.forEach((e) => {
      if (e.id === "settings") return;
      const sel = e.id === id;
      e.bg.fill = sel ? "rgba(32,168,215,0.32)" : "rgba(32,168,215,0.1)";
      e.label.fill = sel ? ColorConf.PRIMARY : ColorConf.GRAY;
    });
    this.growthTabEntries.forEach((e) => {
      const sel = e.id === id;
      e.label.fill = sel ? ColorConf.PRIMARY : ColorConf.GRAY;
    });
  }

  private isGrowthMobileLayout_(width: number) {
    return width < this.confUI.GrowthCenter.BREAKPOINT;
  }

  /** 视口宽度 → 字号缩放（Canvas 逻辑像素，对齐 rem/vw 思路） */
  private growthFontScale_(viewportW: number, mobile: boolean) {
    const gc = this.confUI.GrowthCenter;
    const ref = mobile ? gc.FONT_REF_W_MOBILE : gc.FONT_REF_W_PC;
    const s = viewportW / Math.max(320, ref);
    if (mobile) return Math.min(1.12, Math.max(0.88, s));
    return Math.min(1.04, Math.max(0.94, s));
  }

  /** 兼容历史库里的长任务标题 */
  private shortenGrowthTaskTitle_(title: string) {
    const map: Record<string, string> = {
      "玩 3 局游戏": "完成 3 局",
      "单次得分达到 30 分": "单局 ≥30 分",
      "分享成绩 1 次": "分享 1 次"
    };
    return map[title] || title;
  }

  /** 当前等级段内 XP 进度（与 server getXpToNextLevel 公式一致） */
  private growthXpSegment_(level: NonNullable<typeof this.growthCached>["level"]) {
    const L = Math.max(1, level.level);
    const xpStart = L <= 1 ? 0 : (L - 1) * (L - 1) * 120;
    const xpEnd = L * L * 120;
    const span = Math.max(1, xpEnd - xpStart);
    const cur = Math.min(span, Math.max(0, level.totalXp - xpStart));
    return { cur, span, nextLv: L + 1 };
  }

  private syncGrowthProgressDecor_() {
    const tr = this.growthOverviewProgressTrack;
    const cap = this.growthOverviewProgressCaption;
    const star = this.growthOverviewProgressEndMark;
    if (!tr || !cap || !star) return;
    const gc = this.confUI.GrowthCenter;
    cap.x = tr.x;
    cap.y = tr.y + tr.height + gc.TEXT_ICON_GAP;
    star.x = tr.x + tr.width + gc.TEXT_ICON_GAP;
    star.y = tr.y + tr.height / 2;
  }

  private refreshGrowthProgressBarFromCache_() {
    if (!this.growthCached) return;
    const level = this.growthCached.level;
    const tw = this.growthOverviewProgressTrack.width || 420;
    const seg = this.growthXpSegment_(level);
    const pct = Math.min(1, seg.cur / seg.span);
    this.growthOverviewProgressFill.width = Math.max(4, tw * pct);
    this.syncGrowthProgressDecor_();
  }

  private layoutGrowthAchievementRowWidths_(innerW: number) {
    const setW = (g: Group | undefined, w: number) => {
      if (!g?.children?.[0]) return;
      (g.children[0] as Rect).width = w;
    };
    setW(this.growthAchUnlockedRow, innerW);
    setW(this.growthAchNearRow, innerW);
    setW(this.growthAchLockedRow, innerW);
    const nearW = Math.min(280, Math.max(120, innerW - 56));
    this.growthAchNearBar.width = nearW;
    const fillW = this.growthAchNearFill.width || 0;
    if (fillW > nearW) this.growthAchNearFill.width = nearW;
  }

  private updateGrowthAchievementRows_() {
    if (!this.growthCached) return;
    const level = this.growthCached.level;
    const unlocked = level.unlocked || [];
    const upcoming = level.upcomingUnlocks || [];

    if (unlocked.length) {
      this.growthAchUnlockedLabel.text = `已解锁 · ${unlocked.map((u) => u.name).join(" · ")}`;
    } else {
      this.growthAchUnlockedLabel.text = "已解锁 · 暂无";
    }

    const next = upcoming[0];
    if (next && level.level < next.level) {
      const ratio = Math.min(1, level.level / Math.max(0.01, next.level - 0.2));
      const showNear = ratio >= 0.35;
      this.growthAchNearRow.visible = showNear;
      if (showNear) {
        const pct = Math.round(Math.min(0.95, Math.max(0.4, ratio)) * 100);
        this.growthAchNearLabel.text = `即将解锁 · ${next.name}（目标 Lv.${next.level}）`;
        const bw = this.growthAchNearBar.width || 200;
        this.growthAchNearFill.width = Math.max(8, (bw * pct) / 100);
      }
    } else {
      this.growthAchNearRow.visible = false;
    }

    const lock = upcoming[1];
    if (lock && level.level < lock.level) {
      this.growthAchLockedRow.visible = true;
      this.growthAchLockedLabel.text = `未解锁 · ${lock.name}`;
      this.growthAchLockedHint.text = `条件：达到 Lv.${lock.level}`;
    } else {
      this.growthAchLockedRow.visible = false;
    }
  }

  private maybeStartGrowthAchievementFx_() {
    if (this.growthAchieveAnimStarted) return;
    if (!this.growthAchStar) return;
    this.growthAchieveAnimStarted = true;
    this.growthAchStar.animate([{ scale: 1 }, { scale: 1.18 }, { scale: 1 }], {
      duration: 1.8,
      loop: true
    });
    if (this.growthAchNearFill) {
      this.growthAchNearFill.animate([{ opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }], {
        duration: 1.35,
        loop: true
      });
    }
  }

  private layoutGrowthResponsiveContent_(
    contentW: number,
    contentH: number,
    mobile: boolean,
    fs: (n: number, aux?: boolean) => number
  ) {
    const gc = this.confUI.GrowthCenter;
    const padSections: Group[] = [
      this.growthSectionOverview,
      this.growthSectionTasks,
      this.growthSectionAchievements,
      this.growthSectionSkins,
      this.growthSectionData
    ];
    padSections.forEach((g) => {
      g.width = contentW;
      g.height = contentH;
    });

    const scTitle = (grp: Group) => (grp.children[1] as Text | undefined);

    if (mobile) {
      this.growthOverviewTopCard.width = contentW;
      this.growthOverviewTopCard.height = 168;
      this.growthOverviewTopCard.strokeWidth = 0;

      this.growthOverviewAvatarRect.x = gc.CARD_PAD;
      this.growthOverviewAvatarRect.y = gc.CARD_PAD;
      this.growthOverviewAvatarRect.width = 48;
      this.growthOverviewAvatarRect.height = 48;
      this.growthOverviewNick.around = "left";
      this.growthOverviewNick.x = gc.CARD_PAD + 48 + gc.TEXT_ICON_GAP;
      this.growthOverviewNick.y = gc.CARD_PAD + 2;
      this.growthOverviewNick.fontSize = fs(gc.SUBTITLE_SIZE);
      this.growthOverviewLevel.around = "right";
      this.growthOverviewLevel.x = contentW - gc.CARD_PAD;
      this.growthOverviewLevel.y = gc.CARD_PAD + 2;
      this.growthOverviewLevel.fontSize = fs(gc.BODY_SIZE, true);
      this.growthOverviewLevel.lineHeight = fs(18, true);

      const starReserve = 28;
      const pw = Math.max(
        100,
        contentW - gc.CARD_PAD * 2 - starReserve
      );
      const trackY = gc.CARD_PAD + 48 + gc.CARD_GAP;
      this.growthOverviewProgressTrack.x = gc.CARD_PAD;
      this.growthOverviewProgressTrack.y = trackY;
      this.growthOverviewProgressTrack.width = pw;
      this.growthOverviewProgressFill.x = gc.CARD_PAD;
      this.growthOverviewProgressFill.y = trackY;

      this.growthOverviewProgressCaption.fontSize = fs(gc.CAPTION_SIZE, true);
      this.growthOverviewProgressEndMark.fontSize = fs(15);

      const capH = fs(16, true) + gc.TEXT_ICON_GAP;
      this.growthOverviewTodo.around = "center";
      this.growthOverviewTodo.x = contentW / 2;
      this.growthOverviewTodo.y = trackY + gc.PROGRESS_H + capH + gc.CARD_GAP;
      this.growthOverviewTodo.fontSize = fs(gc.BODY_SIZE);

      const gap = gc.MOBILE_BLOCK_GAP;
      const sh = Math.max(64, gc.MIN_TOUCH + 14);
      const overviewBlockH = this.growthOverviewTopCard.height;
      const yShortcuts = overviewBlockH + gap;
      const order = [
        this.growthShortcutTaskG,
        this.growthShortcutAchG,
        this.growthShortcutCheckG
      ] as const;
      const inners = [
        this.growthShortcutTaskInner,
        this.growthShortcutAchInner,
        this.growthShortcutCheckInner
      ] as const;
      order.forEach((grp, i) => {
        grp.x = 0;
        grp.y = yShortcuts + i * (sh + gap);
      });
      inners.forEach((r) => {
        r.width = contentW;
        r.height = sh;
        r.strokeWidth = 0;
      });
      [this.growthShortcutTaskDot, this.growthShortcutAchDot, this.growthShortcutCheckinDot].forEach(
        (d) => {
          if (d) d.x = contentW - 20;
        }
      );
      order.forEach((grp) => {
        const t = scTitle(grp);
        if (t) {
          t.fontSize = fs(gc.BODY_SIZE);
          t.around = "center";
          t.x = contentW / 2;
          t.y = gc.BTN_PAD_Y + 10;
        }
      });

      const afterSc = yShortcuts + order.length * sh + (order.length - 1) * gap + gc.CARD_GAP;
      this.growthOverviewStats.around = "center";
      this.growthOverviewStats.x = contentW / 2;
      this.growthOverviewStats.y = afterSc;
      this.growthOverviewStats.fontSize = fs(gc.CAPTION_SIZE, true);
      this.growthOverviewStats.lineHeight = fs(20, true);
      this.growthOverviewRankLine.around = "center";
      this.growthOverviewRankLine.x = contentW / 2;
      this.growthOverviewRankLine.y = afterSc + 40;
      this.growthOverviewRankLine.fontSize = fs(gc.BODY_SIZE, true);
      this.growthOpenRankBtn.around = "center";
      this.growthOpenRankBtn.x = contentW / 2;
      this.growthOpenRankBtn.y = afterSc + 76;
      this.growthOpenRankBtn.fontSize = fs(gc.BODY_SIZE);
    } else {
      this.growthOverviewTopCard.width = contentW;
      this.growthOverviewTopCard.height = 156;
      this.growthOverviewTopCard.strokeWidth = 1;

      this.growthOverviewAvatarRect.x = gc.CARD_PAD;
      this.growthOverviewAvatarRect.y = gc.CARD_PAD;
      this.growthOverviewAvatarRect.width = 52;
      this.growthOverviewAvatarRect.height = 52;
      this.growthOverviewNick.around = "left";
      this.growthOverviewNick.x = gc.CARD_PAD + 52 + gc.TEXT_ICON_GAP;
      this.growthOverviewNick.y = gc.CARD_PAD + 4;
      this.growthOverviewNick.fontSize = fs(gc.SUBTITLE_SIZE);
      this.growthOverviewLevel.around = "right";
      this.growthOverviewLevel.x = contentW - gc.CARD_PAD;
      this.growthOverviewLevel.y = gc.CARD_PAD + 4;
      this.growthOverviewLevel.fontSize = fs(gc.BODY_SIZE, true);
      this.growthOverviewLevel.lineHeight = fs(20, true);

      const starReserve = 28;
      const trackLeft = gc.CARD_PAD + 52 + gc.TEXT_ICON_GAP;
      const tw = Math.max(
        160,
        contentW - trackLeft - gc.CARD_PAD - starReserve
      );
      const trackY = gc.CARD_PAD + 52 + gc.TEXT_ICON_GAP;
      this.growthOverviewProgressTrack.x = trackLeft;
      this.growthOverviewProgressTrack.y = trackY;
      this.growthOverviewProgressTrack.width = tw;
      this.growthOverviewProgressFill.x = trackLeft;
      this.growthOverviewProgressFill.y = trackY;

      this.growthOverviewProgressCaption.fontSize = fs(gc.CAPTION_SIZE, true);
      this.growthOverviewProgressEndMark.fontSize = fs(15);

      const capH = fs(16, true) + gc.TEXT_ICON_GAP;
      this.growthOverviewTodo.around = "left";
      this.growthOverviewTodo.x = 0;
      this.growthOverviewTodo.y = trackY + gc.PROGRESS_H + capH + gc.CARD_GAP;
      this.growthOverviewTodo.fontSize = fs(gc.BODY_SIZE);

      const colGap = gc.CARD_GAP;
      const sw = Math.max(168, Math.floor((contentW - colGap * 2) / 3));
      const rowH = 72;
      const overviewBlockH = this.growthOverviewTopCard.height;
      const shortcutsY = overviewBlockH + colGap;
      this.growthShortcutTaskG.x = 0;
      this.growthShortcutTaskG.y = shortcutsY;
      this.growthShortcutAchG.x = sw + colGap;
      this.growthShortcutAchG.y = shortcutsY;
      this.growthShortcutCheckG.x = 2 * (sw + colGap);
      this.growthShortcutCheckG.y = shortcutsY;
      this.growthShortcutTaskInner.width = sw;
      this.growthShortcutTaskInner.height = rowH;
      this.growthShortcutTaskInner.strokeWidth = 1;
      this.growthShortcutAchInner.width = sw;
      this.growthShortcutAchInner.height = rowH;
      this.growthShortcutAchInner.strokeWidth = 1;
      this.growthShortcutCheckInner.width = sw;
      this.growthShortcutCheckInner.height = rowH;
      this.growthShortcutCheckInner.strokeWidth = 1;
      if (this.growthShortcutTaskDot) this.growthShortcutTaskDot.x = sw - 16;
      if (this.growthShortcutAchDot) this.growthShortcutAchDot.x = sw - 16;
      if (this.growthShortcutCheckinDot) this.growthShortcutCheckinDot.x = sw - 16;
      [this.growthShortcutTaskG, this.growthShortcutAchG, this.growthShortcutCheckG].forEach((grp) => {
        const t = scTitle(grp);
        if (t) {
          t.fontSize = fs(gc.BODY_SIZE);
          t.around = "left";
          t.x = gc.BTN_PAD_X;
          t.y = gc.BTN_PAD_Y + 6;
        }
      });

      const afterScPc = shortcutsY + rowH + gc.CARD_GAP;
      this.growthOverviewStats.around = "left";
      this.growthOverviewStats.x = 0;
      this.growthOverviewStats.y = afterScPc;
      this.growthOverviewStats.fontSize = fs(gc.CAPTION_SIZE, true);
      this.growthOverviewStats.lineHeight = fs(20, true);
      this.growthOverviewRankLine.around = "left";
      this.growthOverviewRankLine.x = 0;
      this.growthOverviewRankLine.y = afterScPc + 40;
      this.growthOverviewRankLine.fontSize = fs(gc.BODY_SIZE);
      this.growthOpenRankBtn.around = "left";
      this.growthOpenRankBtn.x = 0;
      this.growthOpenRankBtn.y = afterScPc + 76;
      this.growthOpenRankBtn.fontSize = fs(gc.BODY_SIZE);
    }

    this.growthTaskSectionTitle.fontSize = fs(gc.SUBTITLE_SIZE);
    if (mobile) {
      this.growthTaskSectionTitle.around = "center";
      this.growthTaskSectionTitle.x = contentW / 2;
      this.growthAchieveTitle.around = "center";
      this.growthAchieveTitle.x = contentW / 2;
      this.growthAchieveIntro.around = "center";
      this.growthAchieveIntro.x = contentW / 2;
      this.growthSkinsTitle.around = "center";
      this.growthSkinsTitle.x = contentW / 2;
      this.growthDataTitle.around = "center";
      this.growthDataTitle.x = contentW / 2;
      const step = gc.MIN_TOUCH + 8;
      let ty = 40;
      this.growthSignBtn.x = 0;
      this.growthSignBtn.y = ty;
      this.growthSignBtn.fontSize = fs(gc.BODY_SIZE);
      ty += step;
      this.growthMakeupBtn.x = 0;
      this.growthMakeupBtn.y = ty;
      this.growthMakeupBtn.fontSize = fs(gc.BODY_SIZE);
      ty += step;
      this.growthClaimAllBtn.x = 0;
      this.growthClaimAllBtn.y = ty;
      this.growthClaimAllBtn.fontSize = fs(gc.BODY_SIZE);
      ty += step + 8;
      this.growthTaskListGroup.x = 0;
      this.growthTaskListGroup.y = ty;
      this.growthTaskListGroup.width = contentW;
      this.growthTaskListGroup.height = Math.max(100, contentH - ty - 4);
    } else {
      this.growthTaskSectionTitle.around = "left";
      this.growthTaskSectionTitle.x = 0;
      this.growthAchieveTitle.around = "left";
      this.growthAchieveTitle.x = gc.CARD_PAD;
      this.growthAchieveIntro.around = "left";
      this.growthAchieveIntro.x = gc.CARD_PAD;
      this.growthSkinsTitle.around = "left";
      this.growthSkinsTitle.x = gc.CARD_PAD;
      this.growthDataTitle.around = "left";
      this.growthDataTitle.x = gc.CARD_PAD;
      this.growthSignBtn.x = 0;
      this.growthSignBtn.y = 36;
      this.growthSignBtn.fontSize = fs(gc.BODY_SIZE);
      this.growthMakeupBtn.x = 72;
      this.growthMakeupBtn.y = 36;
      this.growthMakeupBtn.fontSize = fs(gc.BODY_SIZE);
      this.growthClaimAllBtn.x = 148;
      this.growthClaimAllBtn.y = 36;
      this.growthClaimAllBtn.fontSize = fs(gc.BODY_SIZE);
      this.growthTaskListGroup.x = 0;
      this.growthTaskListGroup.y = 72;
      this.growthTaskListGroup.width = contentW;
      this.growthTaskListGroup.height = Math.max(160, contentH - 80);
    }

    const cardStroke = mobile ? 0 : 1;
    this.growthAchieveCardBg.width = contentW;
    this.growthSkinsCardBg.width = contentW;
    this.growthDataCardBg.width = contentW;
    this.growthAchieveCardBg.strokeWidth = cardStroke;
    this.growthSkinsCardBg.strokeWidth = cardStroke;
    this.growthDataCardBg.strokeWidth = cardStroke;

    const achInner = Math.max(120, contentW - gc.CARD_PAD * 2);
    this.layoutGrowthAchievementRowWidths_(achInner);
    this.growthAchUnlockedRow.x = gc.CARD_PAD;
    this.growthAchNearRow.x = gc.CARD_PAD;
    this.growthAchLockedRow.x = gc.CARD_PAD;

    this.syncGrowthProgressDecor_();
  }

  private applyGrowthData_() {
    if (!this.growthCached) return;
    const { board, tasks, checkin, level } = this.growthCached;
    const u = getCurrentUser();
    this.growthOverviewNick.text = u?.nickname || u?.username || "玩家";
    const seg = this.growthXpSegment_(level);
    this.growthOverviewProgressCaption.text = `Lv.${level.level}  ${seg.cur}/${seg.span} XP  →  Lv.${seg.nextLv}`;
    if (this.growthLayoutMobile) {
      this.growthOverviewLevel.text = `Lv.${level.level} · ${level.points} 分 · ${level.totalGames} 局`;
    } else {
      this.growthOverviewLevel.text = `Lv.${level.level}\n${level.points} 分 · ${level.totalGames} 局`;
    }
    this.refreshGrowthProgressBarFromCache_();

    const pendingClaim = tasks.tasks.filter((t) => t.status === "completed").length;
    const pendingTask = tasks.tasks.some((t) => t.status === "pending" && t.progress < t.target);
    if (this.growthShortcutTaskDot) {
      this.growthShortcutTaskDot.visible = pendingClaim > 0 || pendingTask;
      this.growthShortcutTaskDot.text = pendingClaim > 0 ? "●" : "·";
    }
    if (this.growthShortcutAchDot) {
      this.growthShortcutAchDot.visible = false;
    }
    if (this.growthShortcutCheckinDot) {
      this.growthShortcutCheckinDot.visible = !checkin.checkedInToday;
      this.growthShortcutCheckinDot.text = !checkin.checkedInToday ? "●" : "";
    }

    let todo = "";
    if (pendingClaim) todo = `${pendingClaim} 项可领 · 点「一键领取」`;
    else if (!checkin.checkedInToday) todo = "今日未签到 · 去「任务」";
    else {
      const t0 = tasks.tasks.find((t) => t.status === "pending" && t.progress < t.target);
      todo = t0
        ? `进行中：${this.shortenGrowthTaskTitle_(t0.title)}（${t0.progress}/${t0.target}）`
        : "任务已完成 · 去对局冲榜";
    }
    this.growthOverviewTodo.text = todo;

    const localBest = getBestScore();
    this.growthOverviewStats.text =
      `本地最佳 ${localBest != null ? this.formatScore_(localBest) : "-"}  ·  云端局数 ${level.totalGames}  ·  累计分 ${this.formatScore_(Number(level.totalScore))}`;

    if (board.me) {
      this.growthOverviewRankLine.text = `第 ${board.me.rank} 名 · ${this.formatBoardScope_()} · ${this.formatBoardType_()}`;
    } else {
      this.growthOverviewRankLine.text = "暂无排名 · 打一局同步上榜";
    }

    this.growthTasksSnapshot = tasks.tasks.map((t) => ({
      taskType: t.taskType,
      title: t.title,
      status: t.status
    }));
    this.updateGrowthAchievementRows_();
    this.renderGrowthTasks_(tasks.tasks);
    this.maybeStartGrowthAchievementFx_();

    const pendingMenu = pendingClaim > 0 || !checkin.checkedInToday;
    this.GrowthButton.text = pendingMenu ? "成长中心 !" : "成长中心";
    this.GrowthButton.fill = pendingMenu ? ColorConf.PRIMARY : this.confUI.HistoryButton.FILL;

    this.updateGrowthLeaderModalContent_();
  }

  private updateGrowthLeaderModalContent_() {
    if (!this.growthCached) return;
    const { board } = this.growthCached;
    const lines = board.top
      .slice(0, 20)
      .map((r) => `${r.rank}. ${r.displayName}  ${this.formatScore_(r.score)}`)
      .join("\n");
    this.growthLeaderRowsText.text = lines || "暂无数据";
    this.growthLeaderMeText.text = board.me
      ? `我的名次：${board.me.rank}  ·  距上一名 ${this.formatScore_(board.me.gapToNext)}  ·  距榜首 ${this.formatScore_(board.me.gapToTop)}`
      : "暂无个人排名";
  }

  private syncGrowthLeaderModalLayout_(w: number, h: number) {
    if (!this.growthLeaderModal) return;
    const gc = this.confUI.GrowthCenter;
    const dim = this.growthLeaderModal.children[0] as Rect;
    dim.width = w;
    dim.height = h;
    const card = this.growthLeaderModal.children[1] as Rect;
    const cw = Math.min(w * 0.88, 440);
    const ch = Math.min(h * 0.72, 500);
    card.width = cw;
    card.height = ch;
    card.x = w / 2;
    card.y = h / 2;
    const cx = w / 2;
    const cy = h / 2;
    const title = this.growthLeaderModal.children[4] as Text;
    title.x = cx;
    title.y = cy - ch / 2 + 28;
    const close = this.growthLeaderModal.children[5] as Text;
    close.x = cx + cw / 2 - 28;
    close.y = cy - ch / 2 + 28;
    const rows = this.growthLeaderRowsText;
    rows.x = cx;
    rows.y = cy - 40;
    const me = this.growthLeaderMeText;
    me.x = cx;
    me.y = cy + ch / 2 - 56;
    const sw1 = this.growthLeaderModal.children[6] as Text;
    const sw2 = this.growthLeaderModal.children[7] as Text;
    sw1.x = cx - 70;
    sw1.y = cy + ch / 2 - 24;
    sw2.x = cx + 70;
    sw2.y = cy + ch / 2 - 24;
  }

  private showGrowthLeaderModal_() {
    const w = this.GrowthPanel.width || GP.bw;
    const h = this.GrowthPanel.height || GP.bh;
    this.syncGrowthLeaderModalLayout_(w, h);
    this.updateGrowthLeaderModalContent_();
    this.growthLeaderModal.visible = true;
  }

  private hideGrowthLeaderModal_() {
    if (this.growthLeaderModal) this.growthLeaderModal.visible = false;
  }

  private async claimAllGrowthTasks_() {
    try {
      const tasks = await fetchDailyTasks();
      const list = tasks.tasks.filter((t) => t.status === "completed");
      if (!list.length) {
        if (typeof window !== "undefined") await showAlert("暂无可领取奖励");
        return;
      }
      for (const t of list) {
        try {
          await claimDailyTask(t.taskType);
        } catch {
          /* 单项失败则跳过 */
        }
      }
      if (typeof window !== "undefined") await showAlert(`已处理 ${list.length} 项可领奖励`);
    } catch (e: any) {
      if (typeof window !== "undefined") await showAlert(String(e?.message ?? e));
    }
    await this.refreshGrowthPanel_();
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
      this.growthCached = { board, tasks, checkin, level };
      this.applyGrowthData_();
      this.GrowthStatusText.text = `已更新 ${new Date().toLocaleTimeString()}`;
    } catch (e: any) {
      this.GrowthStatusText.text = "更新失败";
      if (typeof window !== "undefined") await showAlert(String(e?.message ?? e));
    } finally {
      this.growthLoading = false;
    }
  }

  private renderGrowthTasks_(tasks: Array<any>) {
    this.growthTaskListGroup.removeAll();
    this.GrowthTaskClaimButtons = [];
    const mobile = this.growthLayoutMobile;
    const gc = this.confUI.GrowthCenter;
    const cw = this.growthContentHost?.width || 520;
    if (!tasks.length) {
      this.growthTaskListGroup.add(
        new Text({
          x: mobile ? Math.max(60, cw / 2) : 0,
          y: 0,
          around: mobile ? "center" : "left",
          text: "今天暂无任务",
          fontSize: Math.max(mobile ? gc.CAPTION_MIN_MOBILE : gc.CAPTION_MIN_PC + 1, 13),
          fill: gc.TEXT_MUTED
        })
      );
      return;
    }

    const hostW = Math.max(200, cw - (mobile ? gc.TEXT_ICON_GAP : gc.CARD_PAD));
    const rowWidth = hostW;
    const rowStride = mobile ? 96 : 84;
    const rowH = mobile ? 82 : 72;
    const textX = gc.CARD_PAD + 28;
    const strokeW = mobile ? 0 : 1;
    const titleFs = Math.max(mobile ? gc.CAPTION_MIN_MOBILE : 12, 14);
    const metaFs = Math.max(mobile ? gc.CAPTION_MIN_MOBILE : gc.CAPTION_MIN_PC, 12);

    tasks.forEach((t, idx) => {
      const y = idx * rowStride;
      const titleStr = this.shortenGrowthTaskTitle_(t.title);
      const pct = t.target > 0 ? Math.min(100, Math.round((t.progress / t.target) * 100)) : 0;

      type RowState = "idle" | "prog" | "claim" | "done";
      let st: RowState;
      if (t.status === "claimed") st = "done";
      else if (t.status === "completed") st = "claim";
      else if ((t.progress || 0) > 0) st = "prog";
      else st = "idle";

      let bg = "#F1F5F9";
      let stroke = "rgba(15,23,42,0.08)";
      let icon = "○";
      let iconFill = gc.TEXT_MUTED;
      let titleFill = gc.TEXT_BODY;

      if (st === "idle") {
        bg = "#F1F5F9";
        icon = "○";
      } else if (st === "prog") {
        bg = {
          type: "linear",
          from: { x: 0, y: 0 },
          to: { x: 1, y: 1 },
          stops: [
            { offset: 0, color: "#E0F2FE" },
            { offset: 1, color: "#DBEAFE" }
          ]
        } as any;
        icon = "◐";
        iconFill = ColorConf.PRIMARY;
      } else if (st === "claim") {
        bg = "#DCFCE7";
        icon = "●";
        iconFill = ColorConf.SUCCESS;
      } else {
        bg = "#F8FAFC";
        icon = "✓";
        iconFill = gc.TEXT_SUPPORT;
        titleFill = gc.TEXT_SUPPORT;
        stroke = "rgba(15,23,42,0.06)";
      }

      const row = new Rect({
        x: 0,
        y,
        width: rowWidth,
        height: rowH,
        radius: 10,
        fill: bg,
        stroke,
        strokeWidth: strokeW
      });
      const iconT = new Text({
        x: gc.CARD_PAD + 10,
        y: y + rowH / 2,
        around: "center",
        text: icon,
        fontSize: st === "done" ? 15 : 17,
        fill: iconFill
      });
      const title = new Text({
        x: textX,
        y: y + (st === "prog" ? 10 : 12),
        around: "left",
        text: titleStr,
        fontSize: titleFs,
        fill: titleFill
      });
      const metaText =
        st === "prog"
          ? `${t.progress}/${t.target} · ${pct}% · +${t.rewardPoints} 分`
          : `${t.progress}/${t.target} · +${t.rewardPoints} 分`;
      const meta = new Text({
        x: textX,
        y: y + (st === "prog" ? 38 : 42),
        around: "left",
        text: metaText,
        fontSize: metaFs,
        fill: gc.TEXT_MUTED
      });

      const actionLabel =
        st === "claim" ? "领取" : st === "done" ? "已领取" : st === "prog" ? "进行中" : "未开始";
      const actionBtn = new Text({
        x: rowWidth - gc.BTN_PAD_X,
        y: y + rowH / 2,
        around: "center",
        text: actionLabel,
        fontSize: Math.max(gc.CAPTION_MIN_MOBILE, 13),
        fill:
          st === "claim"
            ? ColorConf.SUCCESS
            : st === "done"
              ? gc.TEXT_SUPPORT
              : st === "prog"
                ? ColorConf.PRIMARY
                : gc.TEXT_SUPPORT,
        cursor: st === "claim" ? "pointer" : "default"
      });

      if (st === "claim") {
        const badge = new Text({
          x: rowWidth - gc.CARD_PAD,
          y: y + gc.BTN_PAD_Y,
          around: "right",
          text: "待领取",
          fontSize: Math.max(gc.CAPTION_MIN_PC, 11),
          fill: ColorConf.DANGER
        });
        this.growthTaskListGroup.add(badge);
        actionBtn.hoverStyle = { fill: ColorConf.PRIMARY, rotation: 14 };
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

      this.growthTaskListGroup.add(row);
      this.growthTaskListGroup.add(iconT);
      this.growthTaskListGroup.add(title);
      this.growthTaskListGroup.add(meta);
      this.growthTaskListGroup.add(actionBtn);
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
    if (!this.GrowthCard || !this.growthRootGroup) return;
    const gc = this.confUI.GrowthCenter;
    const mobile = width < gc.BREAKPOINT;
    this.growthLayoutMobile = mobile;

    let cardWidth: number;
    let cardHeight: number;
    let left: number;
    let top: number;

    if (mobile) {
      cardWidth = Math.max(280, width - 2 * gc.MOBILE_MARGIN);
      left = gc.MOBILE_MARGIN;
      top = gc.MOBILE_V_MARGIN;
      const maxH = height - top - gc.MOBILE_V_MARGIN;
      cardHeight = Math.min(gc.CARD_MAX_H, maxH);
      this.GrowthCard.strokeWidth = 0;
      this.GrowthCard.stroke = "transparent";
    } else {
      cardWidth = Math.min(gc.CARD_FIXED_W_PC, width - 48);
      cardWidth = Math.max(520, cardWidth);
      const ch = Math.min(gc.CARD_MAX_H, height * 0.88);
      cardHeight = ch;
      left = (width - cardWidth) / 2;
      top = (height - cardHeight) / 2;
      this.GrowthCard.strokeWidth = 1;
      this.GrowthCard.stroke = gc.CARD_STROKE;
    }

    this.GrowthCard.x = left + cardWidth / 2;
    this.GrowthCard.y = top + cardHeight / 2;
    this.GrowthCard.width = cardWidth;
    this.GrowthCard.height = cardHeight;

    this.growthRootGroup.x = left;
    this.growthRootGroup.y = top;

    const fsc = this.growthFontScale_(width, mobile);
    const fs = (n: number, aux = false) => {
      const v = Math.round(n * fsc);
      if (mobile) return Math.max(gc.CAPTION_MIN_MOBILE, v);
      return Math.max(aux ? gc.CAPTION_MIN_PC : 12, v);
    };

    this.growthTitleText.fontSize = fs(mobile ? gc.SUBTITLE_SIZE + 1 : gc.TITLE_SIZE);
    this.growthTitleText.x = gc.PAD;
    this.growthTitleText.y = mobile ? 14 : 18;

    this.GrowthStatusText.fontSize = fs(gc.CAPTION_SIZE, true);
    this.GrowthStatusText.x = cardWidth - gc.PAD;
    this.GrowthStatusText.y = mobile ? 16 : 20;

    this.growthCloseBtn.fontSize = fs(22);
    this.growthCloseBtn.x = cardWidth - gc.PAD - 8;
    this.growthCloseBtn.y = mobile ? 14 : 18;

    if (this.growthCloseHit) {
      this.growthCloseHit.around = "center";
      this.growthCloseHit.x = this.growthCloseBtn.x;
      this.growthCloseHit.y = this.growthCloseBtn.y;
      this.growthCloseHit.width = gc.MIN_TOUCH;
      this.growthCloseHit.height = gc.MIN_TOUCH;
    }

    this.growthNavGroup.visible = !mobile;
    this.growthTabGroup.visible = mobile;
    this.growthNavGroup.y = 50;
    this.growthTabGroup.y = 44;
    this.growthTabGroup.x = gc.PAD;

    const tabBarH = mobile ? Math.max(gc.TAB_H, gc.MIN_TOUCH) + 8 : 0;
    const contentX = mobile ? gc.PAD : gc.NAV_W + gc.CARD_GAP;
    const contentY = mobile ? 40 + tabBarH : 52;
    const footerReserve = mobile ? 112 : 52;
    const contentW = Math.max(240, cardWidth - contentX - gc.PAD);
    const contentH = Math.max(160, cardHeight - contentY - footerReserve);

    if (mobile && this.growthTabEntries.length) {
      const tabUsableW = cardWidth - 2 * gc.PAD;
      const tabW = tabUsableW / this.growthTabEntries.length;
      this.growthTabGroup.width = tabUsableW;
      this.growthTabGroup.height = tabBarH;
      this.growthTabEntries.forEach((e, i) => {
        e.wrap.x = i * tabW;
        e.hit.width = Math.max(gc.MIN_TOUCH, tabW - 6);
        e.hit.height = Math.max(gc.TAB_H, gc.MIN_TOUCH);
        e.hit.x = (tabW - e.hit.width) / 2;
        e.hit.y = 2;
        e.label.x = tabW / 2;
        e.label.y = e.hit.y + e.hit.height / 2;
        e.label.around = "center";
        e.label.fontSize = fs(gc.CAPTION_SIZE + 1);
      });
    }

    this.growthContentHost.x = contentX;
    this.growthContentHost.y = contentY;
    this.growthContentHost.width = contentW;
    this.growthContentHost.height = contentH;

    this.layoutGrowthResponsiveContent_(contentW, contentH, mobile, fs);

    this.growthFooterGroup.x = gc.PAD;
    this.growthFooterGroup.width = cardWidth - 2 * gc.PAD;
    this.growthFooterGroup.y = cardHeight - footerReserve;

    if (mobile) {
      const fw = this.growthFooterGroup.width;
      const colGap = 10;
      const cellW = (fw - colGap) / 2;
      const rowH = gc.MIN_TOUCH;
      const grid: Record<string, { col: number; row: number }> = {
        refresh: { col: 0, row: 0 },
        "switch-type": { col: 1, row: 0 },
        "switch-scope": { col: 0, row: 1 },
        close: { col: 1, row: 1 }
      };
      this.GrowthActionButtons.forEach(({ action, button }) => {
        const g = grid[action];
        if (!g) return;
        button.x = cellW / 2 + g.col * (cellW + colGap);
        button.y = rowH / 2 + g.row * (rowH + 10);
        const hit = button.children[0] as Rect;
        hit.width = Math.min(cellW - 6, 160);
        hit.height = rowH;
        hit.x = -hit.width / 2;
        hit.y = -rowH / 2;
        (button.children[1] as Text).fontSize = fs(gc.BODY_SIZE);
      });
      this.growthFooterGroup.height = rowH * 2 + 10 + 8;
    } else {
      const spacing = 92;
      const footY = 22;
      const map: Record<string, number> = {
        refresh: 48,
        "switch-type": 48 + spacing,
        "switch-scope": 48 + spacing * 2,
        close: this.growthFooterGroup.width - 52
      };
      this.GrowthActionButtons.forEach(({ action, button }) => {
        if (map[action] == null) return;
        button.x = map[action];
        button.y = footY;
        const hit = button.children[0] as Rect;
        hit.width = gc.FOOTER_BTN_MIN_W;
        hit.height = gc.MIN_TOUCH;
        hit.x = -hit.width / 2;
        hit.y = -gc.MIN_TOUCH / 2;
        (button.children[1] as Text).fontSize = fs(gc.BODY_SIZE);
      });
      this.growthFooterGroup.height = 48;
    }

    if (this.growthLeaderModal?.visible) {
      this.syncGrowthLeaderModalLayout_(width, height);
    }

    if (this.growthCached) {
      this.updateGrowthAchievementRows_();
      this.refreshGrowthProgressBarFromCache_();
      this.renderGrowthTasks_(this.growthCached.tasks.tasks);
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

