# 🎮 iBouncy - LeaferJS 弹球游戏

> 一个优雅、高性能的 Canvas 弹球游戏，基于 LeaferJS 构建

> 基于[ibouncy](https://github.com/Horean0574/iBouncy)的测试分支

> 品牌字体：[Akaya Telivigala](https://fonts.google.com/specimen/Akaya+Telivigala)

[![GitHub license](https://img.shields.io/github/license/CodeSky0/iBouncy)](https://github.com/CodeSky0/iBouncy/blob/main/LICENSE)
[![Vite](https://img.shields.io/badge/built%20with-Vite-646CFF?logo=vite)](https://vite.dev/)
[![LeaferJS](https://img.shields.io/badge/powered%20by-LeaferJS-20A8D7)](https://leaferjs.com/)

## ✨ 特性亮点

- 🚀 **高性能渲染**：基于 LeaferJS Canvas 引擎，60fps 流畅体验
- 🎨 **精美视觉**：平滑动画、粒子拖尾、渐变遮罩
- 🎯 **物理碰撞**：精确的 AABB 碰撞检测与反弹物理
- ⚡ **现代架构**：TypeScript + ES Module + Vite，模块化与类型安全
- 📡 **事件通信**：集中式通道定义、载荷映射、桥接适配，便于扩展与阅读
- 📱 **响应式适配**：自动适应不同屏幕尺寸
- 🎮 **沉浸操控**：键盘 WASD/方向键控制，即时反馈

## 🎮 在线试玩

**[点击这里立即体验](https://www.ibouncy.one)**

> 💡 提示：使用 **WASD** 或 **方向键** 移动挡板，**空格键** 开始/重新游戏

## 🛠️ 本地运行

### 前置要求
- Node.js 16+
- npm 或 yarn

### 安装步骤
```bash
# 克隆项目
git clone https://github.com/CodeSky0/iBouncy.git
cd iBouncy

# 安装依赖
npm install
# 或使用 yarn
yarn install
```

### 开发模式
```bash
npm run dev
```
访问 [http://localhost:5173](http://localhost:5173)

## 👤 登录/注册 + 云端历史成绩（Postgres）

本项目已内置一套**轻量云端账号系统**，用于：

- **注册 / 登录**：用邮箱 + 密码创建账号并登录
- **云端保存成绩**：每局结束后，会把本局最终得分写入数据库
- **历史记录**：在右上角「历史记录」查看最近成绩（也可按 `H`）

### 1) 环境变量

你需要提供以下环境变量（本地与 Vercel 都要配置）：

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `POSTGRES_URL` | 是 | Postgres 连接串（适配 Serverless 数据库，如 Neon / Vercel Postgres） |
| `JWT_SECRET` | 是 | JWT 签名密钥（足够长的随机字符串） |
| `SMTP_HOST` | 否* | SMTP 邮件服务器地址（用于邮箱验证和密码重置） |
| `SMTP_PORT` | 否* | SMTP 端口（默认 587） |
| `SMTP_USER` | 否* | SMTP 认证用户名 |
| `SMTP_PASS` | 否* | SMTP 认证密码 |
| `SMTP_FROM` | 否 | 发件人地址（默认同 `SMTP_USER`） |

> \* `SMTP_*` 变量为可选：不配置时邮箱验证与密码重置功能不可用，注册仍然正常进行。配置后即可启用完整的邮箱验证流程。

本地开发可在根目录新建 `.env.local`：

```bash
POSTGRES_URL="postgres://USER:PASSWORD@HOST:5432/DB?sslmode=require"
JWT_SECRET="please-change-me-to-a-long-random-string"

# 可选：SMTP 邮件服务（用于邮箱验证和密码重置）
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="noreply@example.com"
SMTP_PASS="your-smtp-password"
SMTP_FROM="noreply@example.com"
```

> 说明：后端接口运行在 Vercel `api/` Serverless Functions 中，使用 **HttpOnly Cookie** 保存登录态。

### 2) 使用方式（玩家视角）

- 右上角按钮点击 **“登录 / 注册”**（也可按 `L`）
- 登录后，右上角会显示邮箱，并出现 **“历史记录”** 与 **“退出”**
- 游戏结束会自动上传成绩；历史记录会展示最近 20 条

#### 游客模式（本地记录）与自动同步

- **未登录也会记录成绩**：每局结束都会先写入浏览器本地（LocalStorage）
- **登录后自动同步**：一旦你登录/注册，会自动把本地“未同步”的成绩上传到云端，并做去重
- **历史记录页面**：未登录时显示本地记录；已登录时可看到云端记录 + 本地未同步提示，并提供“同步本地”按钮

### 3) 数据库表结构（自动创建）

首次调用任意 `/api/*` 接口时，会在数据库中自动创建表（幂等）：

- `users(id, email, password_hash, username, nickname, created_at)`
- `scores(id, user_id, client_id, score, created_at)`
- `email_codes(id, email, code, purpose, used, expires_at, created_at)` — 邮箱验证码（验证码 10 分钟有效）

其中 `score` 为**整数**，对应游戏内 1 位小数的分数：建议按 `score * 10` 存储（本项目已按此规则上传）。
`client_id` 用于客户端同步时的**去重**（同一用户下唯一，允许为空）。

### 4) 邮箱验证与密码重置

配置 SMTP 环境变量后，以下功能可用：

- **邮箱验证码**：注册时可选择填写验证码验证邮箱所有权
- **忘记密码**：登录表单底部的「忘记密码？」链接，通过邮箱验证码重置密码
- **API 端点**：
  - `POST /api/auth/send-verify-code` — 发送邮箱验证码
  - `POST /api/auth/forgot-password` — 发送密码重置验证码
  - `POST /api/auth/reset-password` — 验证码通过后重置密码

未配置 SMTP 时，注册仍可正常完成（`verifyCode` 字段可选）。

## 📁 项目结构

```text
iBouncy/
├── index.html                # 入口 HTML（精简，样式外置）
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/                   # 构建时拷贝的静态资源（字体、图片、SVG）
├── api/                      # Vercel Serverless Functions（后端 API）
│   ├── _lib/                 # 公共模块：数据库、认证、CSRF、速率限制、用户工具、邮件服务
│   ├── auth/                 # 登录、注册、获取用户、退出
│   │   ├── register.ts
│   │   ├── login.ts
│   │   ├── logout.ts
│   │   ├── me.ts
│   │   ├── send-verify-code.ts
│   │   ├── forgot-password.ts
│   │   └── reset-password.ts
│   └── scores/               # 分数提交、历史记录、排行榜、统计
├── src/
│   ├── app.ts                # 入口：装配事件桥、启动主循环
│   ├── styles/
│   │   └── glass.css         # Liquid Glass 设计系统 CSS（从 index.html 提取）
│   ├── config/               # 游戏与 UI 数值配置（GameConf / UIConf）
│   ├── core/
│   │   ├── instances.ts      # Leafer、Processor、各元素单例与工具聚合导出
│   │   ├── processor.ts      # 状态机、资源加载、生命周期 emit
│   │   ├── interaction.ts    # 碰撞与边界检测
│   │   └── effects.ts        # 视觉特效全局开关
│   ├── events/               # 全局事件通信（通道、载荷、总线、桥接）
│   │   ├── channels.ts       # GEV 通道名与命名约定
│   │   ├── payloads.ts       # 各通道载荷类型（GameEventPayloadMap）
│   │   ├── bus.ts            # GameEventBus 实现与单例 eventBus
│   │   ├── catalog.ts        # 事件速查表
│   │   ├── index.ts          # 对外统一导出
│   │   └── bridge/           # 适配器：页面、计时器同步、状态链
│   ├── elements/             # 游戏元素（弹球、挡板、计分、菜单、遮罩等）
│   ├── elements_extensions/  # 元素扩展（如拖尾特效）
│   ├── ui/                   # 云端 UI 覆盖层
│   │   ├── cloudOverlay.ts   # 初始化与状态管理（FAB、键盘快捷键、同步、音效开关）
│   │   ├── cloudModals.ts    # 认证 / 历史 / 排行榜 / 忘记密码模态框渲染
│   │   ├── cloudUtils.ts     # DOM 工具、格式化函数、共享类型
│   │   └── elements.ts       # UI 元素单例聚合
│   ├── cloud/                # 云端 API 客户端与本地分数存储
│   ├── audio/                # Web Audio 音效合成
│   ├── utils/                # 计时器、遮罩层、键盘路由、UI 原型扩展等
│   ├── types/                # 全局类型补充（如 Leafer UI 扩展）
│   └── vite-env.d.ts
└── README.md
```

## 📡 事件通信（概要）

- **通道**：`src/events/channels.ts` 中的 **`GEV`**，按 `system` / `ui` / `game` 等域命名，与 **`GameEventPayloadMap`** 一一对应。
- **总线**：`GameEventBus` 单例 **`eventBus`**（`instances` 中亦导出为 **`evBus`**，便于与游戏对象同文件导入）。
- **桥接**：`createEventBridge({ leafer, timer, setPrevTimeStamp })` 在 **`app.ts`** 启动时调用，将 Leafer/DOM 与玩法状态链映射到内部事件，**不反向依赖** `instances`，避免环状引用。
- **速查表**：`GAME_EVENT_CATALOG`（`src/events/catalog.ts`）为每个通道提供简短说明，便于新人阅读与检索。

 扩展新事件时：在 **`channels.ts`** 增加常量 → 在 **`payloads.ts`** 补全载荷 → 在 **`catalog.ts`** 写一句说明 → 在订阅/发布处使用类型安全的 **`eventBus.emit` / `eventBus.on`**。

## 🎯 游戏机制

### 核心玩法
- **目标**：在 2 分钟内防止弹球掉落
- **控制**：移动挡板反弹弹球
- **计分**：根据碰撞速度和位置获得分数

### 物理系统
反弹加分公式：

$$
\Delta s=\frac{7}{10}(log_{2}v+\sec\frac{\pi v}{30})+\frac{3}{10}(\cos\frac{2\pi|x_2-x_1|}{w}+\frac{1}{2})
$$

其中：
- 本次总加分为 $\Delta s$
- 反弹时球速为 $v$
- 反弹时球中心横坐标为 $x_1$
- 反弹时挡板中心横坐标为 $x_2$
- 挡板宽度为 $w$

### 难度曲线
- 🟢 0-15 秒：基础速度
- 🟡 15-105 秒：速度逐渐增加
- 🔴 最后 15 秒：紧张倒计时动画

## 🔧 技术栈
| 技术                             | 用途         | 版本     |
|--------------------------------|----------|----------|
| [LeaferJS](https://leaferjs.com) | Canvas 渲染引擎 | 1.12.x |
| [Vite](https://vite.dev)       | 构建工具与开发服务器 | 7.x |
| [TypeScript](https://www.typescriptlang.org) | 类型与模块 | 5.x |

## 🤝 贡献指南
欢迎提交 Issue 和 Pull Request！
1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源协议
本项目基于 MIT License 开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢
- 感谢 [LeaferJS](https://leaferjs.com) 团队提供的优秀 Canvas 引擎
- 灵感来源于经典弹球游戏
- 所有贡献者和问题反馈者

## 📞 联系与支持
- 🐛 问题反馈：[GitHub Issues](https://github.com/CodeSky0/iBouncy/issues)
- 💡 功能建议：欢迎提交 Feature Request
- ⭐ 喜欢这个项目？ 点个 Star 支持一下！

> 由 LeaferJS 驱动，用 ❤️ 编码
