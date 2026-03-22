const STORAGE_KEY = "iBouncy_scores";
const MAX_RECORDS = 100;

export interface ScoreRecord {
  score: number;
  difficulty: string;
  timestamp: number;
}

function loadRecords(): ScoreRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data.records) ? (data.records as ScoreRecord[]) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: ScoreRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ records }));
  } catch (e) {
    console.warn("scoreStorage: save failed", e);
  }
}

export function addScore(score: number, difficultyKey: string) {
  const records = loadRecords();
  records.unshift({
    score: Number(score),
    difficulty: difficultyKey,
    timestamp: Date.now()
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

export function getBestScoreByDifficulty(difficultyKey: string) {
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

// 将服务器返回的成绩列表应用到本地，作为新的历史记录
// 期望记录格式：{ score, difficulty, timestamp }
export function setHistoryFromServer(records: any[]) {
  if (!Array.isArray(records)) return [];
  const normalized = records
    .map((r) => {
      const ts =
        typeof r.timestamp === "number"
          ? r.timestamp
          : Date.parse(r.timestamp as string);
      const s = Number(r.score);
      if (Number.isNaN(ts) || Number.isNaN(s)) return null;
      return {
        score: s,
        difficulty: r.difficulty,
        timestamp: ts
      } as ScoreRecord;
    })
    .filter(Boolean) as ScoreRecord[];
  const trimmed = normalized.slice(0, MAX_RECORDS);
  saveRecords(trimmed);
  return trimmed;
}

