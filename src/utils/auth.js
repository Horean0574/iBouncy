import { getHistory, setHistoryFromServer } from "./scoreStorage";

const AUTH_STORAGE_KEY = "iBouncy_user";
const API_BASE = "/api";

function loadStoredUser() {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (data && typeof data.id === "number" && typeof data.username === "string") {
            return data;
        }
        return null;
    } catch {
        return null;
    }
}

function saveStoredUser(user) {
    try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
        // ignore
    }
}

export function getCurrentUser() {
    return loadStoredUser();
}

export function logout() {
    try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
        // ignore
    }
}

async function requestJson(path, options = {}) {
    const res = await fetch(API_BASE + path, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
        credentials: "include",
        ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data && data.error ? data.error : `请求失败：${res.status}`;
        throw new Error(msg);
    }
    return data;
}

export async function login(username, password) {
    const data = await requestJson("/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
    });
    if (data.user) {
        saveStoredUser(data.user);
    }
    return data.user;
}

export async function register(username, password) {
    const data = await requestJson("/register", {
        method: "POST",
        body: JSON.stringify({ username, password }),
    });
    if (data.user) {
        saveStoredUser(data.user);
    }
    return data.user;
}

export async function fetchScoresForCurrentUser() {
    const user = getCurrentUser();
    if (!user) return [];
    const data = await requestJson(`/scores`, {
        method: "GET",
    });
    return Array.isArray(data.records) ? data.records : [];
}

export async function pushScoreForCurrentUser(score, difficulty, timestamp) {
    const user = getCurrentUser();
    if (!user) return;
    try {
        await requestJson("/scores", {
            method: "POST",
            body: JSON.stringify({
                score,
                difficulty,
                timestamp,
            }),
        });
    } catch (e) {
        // 同步失败时静默忽略，不影响本地体验
        console.warn("同步成绩到服务器失败：", e);
    }
}

export async function syncScoresWithServer() {
    const user = getCurrentUser();
    if (!user) return [];
    const localRecords = getHistory();
    const data = await requestJson("/scores-sync", {
        method: "POST",
        body: JSON.stringify({ records: localRecords }),
    });
    const merged = Array.isArray(data.records) ? data.records : [];
    setHistoryFromServer(merged);
    return merged;
}
