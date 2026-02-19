// src/core/AchievementSystem.js
class AchievementSystem {
  constructor() {
    // 定义所有成就（可扩展）
    this.achievements = {
      firstScore: { 
        id: 'firstScore',
        unlocked: false, 
        name: '初次得分', 
        desc: '获得游戏的第一个分数',
        icon: '🏆' // 可选：成就图标
      },
      streak10: { 
        id: 'streak10',
        unlocked: false, 
        name: '连续反弹', 
        desc: '单次游戏中连续反弹10次不掉落',
        icon: '🔄'
      },
      highScore5000: { 
        id: 'highScore5000',
        unlocked: false, 
        name: '高分达人', 
        desc: '单次游戏得分超过5000分',
        icon: '💯'
      },
      propMaster5: { 
        id: 'propMaster5',
        unlocked: false, 
        name: '道具大师', 
        desc: '一局内接住5个不同类型的道具',
        icon: '🎁'
      },
      hardModeWin: { 
        id: 'hardModeWin',
        unlocked: false, 
        name: '硬核玩家', 
        desc: '在高级难度下完成游戏且得分≥3000',
        icon: '🔥'
      }
    };

    // 运行时计数（每局重置）
    this.runtimeStats = {
      streakCount: 0,    // 连续反弹次数
      propCatchCount: 0, // 接住道具数
      caughtPropTypes: new Set() // 接住的道具类型（去重，适配道具大师成就）
    };

    // 加载本地存储的成就状态
    this.loadAchievements();
  }

  // 从localStorage加载成就状态
  loadAchievements() {
    const saved = localStorage.getItem('ibouncy_achievements');
    if (saved) {
      const parsed = JSON.parse(saved);
      // 合并保存的解锁状态到本地成就定义（避免新增成就被覆盖）
      Object.keys(this.achievements).forEach(key => {
        if (parsed[key]?.unlocked) {
          this.achievements[key].unlocked = parsed[key].unlocked;
        }
      });
    }
  }

  // 保存成就状态到localStorage
  saveAchievements() {
    // 只保存必要的解锁状态（减少存储体积）
    const saveData = {};
    Object.keys(this.achievements).forEach(key => {
      saveData[key] = { unlocked: this.achievements[key].unlocked };
    });
    localStorage.setItem('ibouncy_achievements', JSON.stringify(saveData));
  }

  // 重置每局的计数（游戏开始/重启时调用）
  resetRuntimeStats() {
    this.runtimeStats = {
      streakCount: 0,
      propCatchCount: 0,
      caughtPropTypes: new Set()
    };
  }

  // 检测并解锁成就
  checkAchievement(triggerType, data = {}) {
    switch (triggerType) {
      // 触发类型1：得分
      case 'score': {
        const currentScore = data.score;
        // 解锁「初次得分」
        if (!this.achievements.firstScore.unlocked && currentScore > 0) {
          this.unlockAchievement('firstScore');
        }
        // 解锁「高分达人」
        if (!this.achievements.highScore5000.unlocked && currentScore >= 5000) {
          this.unlockAchievement('highScore5000');
        }
        break;
      }

      // 触发类型2：连续反弹
      case 'ballStreak': {
        this.runtimeStats.streakCount++;
        // 解锁「连续反弹10次」
        if (!this.achievements.streak10.unlocked && this.runtimeStats.streakCount >= 10) {
          this.unlockAchievement('streak10');
        }
        break;
      }

      // 触发类型3：接住道具
      case 'propCatch': {
        const propType = data.propType;
        this.runtimeStats.propCatchCount++;
        this.runtimeStats.caughtPropTypes.add(propType);
        // 解锁「道具大师（5个不同道具）」
        if (!this.achievements.propMaster5.unlocked && this.runtimeStats.caughtPropTypes.size >= 5) {
          this.unlockAchievement('propMaster5');
        }
        break;
      }

      // 触发类型4：高级难度通关
      case 'hardModeComplete': {
        const score = data.score;
        if (!this.achievements.hardModeWin.unlocked && score >= 3000) {
          this.unlockAchievement('hardModeWin');
        }
        break;
      }
    }
  }

  // 解锁指定成就
  unlockAchievement(achievementId) {
    const achievement = this.achievements[achievementId];
    if (!achievement || achievement.unlocked) return;

    // 标记为已解锁
    achievement.unlocked = true;
    // 保存到本地
    this.saveAchievements();
    // 显示解锁弹窗
    this.showAchievementToast(achievement);
    // 触发自定义事件（供其他模块监听，如成就面板刷新）
    window.dispatchEvent(new CustomEvent('achievementUnlocked', { detail: achievement }));
  }

  // 显示成就解锁弹窗
  showAchievementToast(achievement) {
    // 创建弹窗元素
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <div class="toast-icon">${achievement.icon}</div>
      <div class="toast-content">
        <h4>🎉 成就解锁</h4>
        <p class="name">${achievement.name}</p>
        <p class="desc">${achievement.desc}</p>
      </div>
    `;
    // 添加到页面
    document.body.appendChild(toast);
    // 自动移除（3秒后）
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }

  // 获取所有成就列表（用于成就面板展示）
  getAllAchievements() {
    return Object.values(this.achievements);
  }
}

// 导出单例（避免重复实例化）
export const achievementSystem = new AchievementSystem();
