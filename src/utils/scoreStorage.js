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

export function getHistory() {
    return loadRecords();
}

export function getBestScore() {
    const records = loadRecords();
    if (records.length === 0) return null;
    return Math.max(...records.map((r) => r.score));
}

export function getBestScoreByDifficulty(difficultyKey) {
    const records = loadRecords().filter((r) => r.difficulty === difficultyKey);
    if (records.length === 0) return null;
    return Math.max(...records.map((r) => r.score));
}

export function clearHistory() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn("scoreStorage: clear failed", e);
    }
}
