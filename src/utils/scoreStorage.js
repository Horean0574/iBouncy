const STORAGE_KEY = "iBouncy_scores";
const MAX_RECORDS = 100;

function loadRecords() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        return Array.isArray(data.records) ? data.records : [];
    } catch {
        return [];
    }
}

function saveRecords(records) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ records }));
    } catch (e) {
        console.warn("scoreStorage: save failed", e);
    }
}

/**
 * 添加一条分数记录（游戏结束时调用）
 * @param {number} score - 显示分数，如 12.3
 * @param {string} difficultyKey - 难度键，如 "EASY" | "NORMAL" | "HARD"
 */
export function addScore(score, difficultyKey) {
    const records = loadRecords();
    records.unshift({
        score: Number(score),
        difficulty: difficultyKey,
        timestamp: Date.now(),
    });
    const trimmed = records.slice(0, MAX_RECORDS);
    saveRecords(trimmed);
    return trimmed;
}

/**
 * 获取历史记录列表，按时间倒序
 * @returns {{ score: number, difficulty: string, timestamp: number }[]}
 */
export function getHistory() {
    return loadRecords();
}

/**
 * 获取最佳分数（所有难度中的最高分）
 * @returns {number | null} 无记录时返回 null
 */
export function getBestScore() {
    const records = loadRecords();
    if (records.length === 0) return null;
    return Math.max(...records.map((r) => r.score));
}

/**
 * 获取指定难度的最佳分数
 * @param {string} difficultyKey
 * @returns {number | null}
 */
export function getBestScoreByDifficulty(difficultyKey) {
    const records = loadRecords().filter((r) => r.difficulty === difficultyKey);
    if (records.length === 0) return null;
    return Math.max(...records.map((r) => r.score));
}

/**
 * 清空所有历史分数记录
 */
export function clearHistory() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn("scoreStorage: clear failed", e);
    }
}
