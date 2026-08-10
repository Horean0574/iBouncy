export type LocalScoreRecord = {
    clientId: string;
    score: number; // score * 10（整数）
    createdAt: string; // ISO
    synced?: boolean;
};

const LS_KEY = "ibouncy_local_scores_v1";
const MAX_KEEP = 200;

function safeParse(json: string | null): unknown {
    if (!json) return null;
    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function getUUID(): string {
    const c = globalThis.crypto as Crypto | undefined;
    if (c && "randomUUID" in c && typeof c.randomUUID === "function") return c.randomUUID();
    return `ls_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function load(): LocalScoreRecord[] {
    const raw = safeParse(localStorage.getItem(LS_KEY));
    if (!Array.isArray(raw)) return [];
    const out: LocalScoreRecord[] = [];
    for (const x of raw) {
        if (!x || typeof x !== "object") continue;
        const r = x as Partial<LocalScoreRecord>;
        if (!r.clientId || !r.createdAt) continue;
        const score = Number(r.score);
        if (!Number.isFinite(score)) continue;
        out.push({
            clientId: String(r.clientId),
            score: Math.round(score),
            createdAt: String(r.createdAt),
            synced: Boolean(r.synced),
        });
    }
    // 新 -> 旧
    out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    return out.slice(0, MAX_KEEP);
}

function save(list: LocalScoreRecord[]): void {
    const trimmed = list.slice(0, MAX_KEEP);
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
}

export function addLocalScore(score10: number): LocalScoreRecord {
    const list = load();
    const rec: LocalScoreRecord = {
        clientId: getUUID(),
        score: Math.round(score10),
        createdAt: new Date().toISOString(),
        synced: false,
    };
    list.unshift(rec);
    save(list);
    return rec;
}

export function listLocalScores(): LocalScoreRecord[] {
    return load();
}

export function pendingLocalScores(): LocalScoreRecord[] {
    return load().filter((r) => !r.synced);
}

export function markSynced(clientId: string): void {
    const list = load();
    let changed = false;
    for (const r of list) {
        if (r.clientId === clientId) {
            r.synced = true;
            changed = true;
            break;
        }
    }
    if (changed) save(list);
}

export function clearSynced(): void {
    const list = load();
    const next = list.filter((r) => !r.synced);
    save(next);
}

/** 清空所有本地存储的成绩 */
export function clearLocalScores(): void {
    save([]);
}
