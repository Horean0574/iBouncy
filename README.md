# 🎮 iBouncy - LeaferJS 弹球游戏

> 一个优雅、高性能的 Canvas 弹球游戏，基于 LeaferJS 构建

> 品牌字体：[Akaya Telivigala](https://fonts.google.com/specimen/Akaya+Telivigala)

[![GitHub license](https://img.shields.io/github/license/Horean0574/iBouncy)](https://github.com/Horean0574/iBouncy/blob/main/LICENSE)
[![Vite](https://img.shields.io/badge/built%20with-Vite-646CFF?logo=vite)](https://vite.dev/)
[![LeaferJS](https://img.shields.io/badge/powered%20by-LeaferJS-20A8D7)](https://leaferjs.com/)

## ✨ 特性亮点

- 🚀 **高性能渲染**：基于 LeaferJS Canvas 引擎，60fps 流畅体验
- 🎨 **精美视觉**：平滑动画、粒子拖尾、渐变遮罩
- 🎯 **物理碰撞**：精确的 AABB 碰撞检测与反弹物理
- ⚡ **现代架构**：ES Module + Vite 构建，模块化设计
- 📱 **响应式适配**：自动适应不同屏幕尺寸
- 🎮 **沉浸操控**：键盘 WASD/方向键控制，即时反馈

## 🎮 在线试玩

**[点击这里立即体验](https://www.ibouncy.one/)**

> 💡 提示：使用 **WASD** 或 **方向键** 移动挡板，**空格键** 开始/重新游戏

## 🛠️ 本地运行

### 前置要求
- Node.js 16+
- npm 或 yarn

### 安装步骤
```bash
# 克隆项目
git clone https://github.com/你的用户名/iBouncy.git
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

### 生产构建
```bash
npm run build
npm run preview  # 预览构建结果
```

## 📁 项目结构
```text
iBouncy/
├── src/
│   ├── core/              # 核心实例管理
│   │   └── instances.js   # 中央实例管理器
│   ├── elements/          # 游戏元素组件
│   │   ├── E_Ball.js      # 弹球类
│   │   ├── E_Tablet.js    # 挡板类
│   │   ├── E_Scoring.js   # 计分系统
│   │   └── ...
│   ├── utils/               # 工具类
│   │   ├── EmbeddedTimer.js # 重制计时器
│   │   ├── Queue.js         # 队列数据类型
│   │   └── ...
│   └── app.js            # 游戏主入口
├── assets/               # 静态资源
│   ├── fonts/           # 字体文件
│   ├── img/             # 图片资源
│   └── svg/             # SVG图标
├── vite.config.js       # Vite 配置
└── package.json         # 项目依赖
```

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
| [LeaferJS](https://leaferjs.com) | Canvas 渲染引擎 | 1.12.0 |
| [Vite](https://vite.dev)       | 构建工具与开发服务器 | 7.x |
| Vanilla JavaScript             | 核心逻辑 | ES2022+ |

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
- 🐛 问题反馈：[GitHub Issues](https://github.com/Horean0574/iBouncy/issues)
- 💡 功能建议：欢迎提交 Feature Request
- ⭐ 喜欢这个项目？ 点个 Star 支持一下！

> 由 LeaferJS 驱动，用 ❤️ 编码
