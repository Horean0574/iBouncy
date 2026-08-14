import { apiFetch } from "./http";

export type CloudUser = {
    id: number;
    email: string;
    username: string | null;
    nickname: string | null;
    displayName: string;
};

export type ScoreRecord = { id: number; score: number; createdAt: string };
export type LeaderboardEntry = { rank: number; userId: number; displayName: string; bestScore: number; bestAt: string };
export type TrendPoint = { day: string; games: number; bestScore: number; totalScore: number };
export type ScoreSummary = {
    games: number;
    bestScore: number;
    totalScore: number;
    lastScore: number;
    lastAt: string | null;
};

export async function me(): Promise<CloudUser | null> {
    const r = await apiFetch<{ user: CloudUser | null }>("/api/auth/me");
    return r.user;
}

export async function register(params: {
    username: string;
    nickname?: string;
    email: string;
    password: string;
    verifyCode?: string;
}): Promise<CloudUser> {
    const r = await apiFetch<{ user: CloudUser }>("/api/auth/register", {
        method: "POST",
        json: {
            username: params.username,
            nickname: params.nickname || "",
            email: params.email,
            password: params.password,
            verifyCode: params.verifyCode || "",
        },
    });
    return r.user;
}

export async function login(identifier: string, password: string): Promise<CloudUser> {
    const r = await apiFetch<{ user: CloudUser }>("/api/auth/login", {
        method: "POST",
        json: { identifier, password },
    });
    return r.user;
}

export async function logout(): Promise<void> {
    await apiFetch<{ loggedOut: boolean }>("/api/auth/logout", { method: "POST", json: {} });
}

/** 发送邮箱验证码（注册验证或密码重置） */
export async function sendVerifyCode(email: string, purpose: "verify" | "reset" = "verify"): Promise<void> {
    await apiFetch<{ sent: boolean }>("/api/auth/send-verify-code", {
        method: "POST",
        json: { email, purpose },
    });
}

/** 请求密码重置验证码 */
export async function forgotPassword(email: string): Promise<void> {
    await apiFetch<{ sent: boolean }>("/api/auth/forgot-password", {
        method: "POST",
        json: { email },
    });
}

/** 重置密码 */
export async function resetPassword(email: string, code: string, password: string): Promise<void> {
    await apiFetch<{ reset: boolean }>("/api/auth/reset-password", {
        method: "POST",
        json: { email, code, password },
    });
}

/**
 * 写入成绩（整数）。本项目 UI 显示 1 位小数，因此这里建议传「score * 10」。
 */
export async function addScore(score: number, clientId?: string | null): Promise<void> {
    await apiFetch<{ saved: boolean }>("/api/scores/add", {
        method: "POST",
        json: { score, clientId: clientId || null },
    });
}

export async function listScores(limit = 20): Promise<ScoreRecord[]> {
    const r = await apiFetch<{ records: ScoreRecord[] }>(`/api/scores/list?limit=${encodeURIComponent(String(limit))}`);
    return r.records;
}

export async function fetchLeaderboard(limit = 50, period = "all"): Promise<LeaderboardEntry[]> {
    const r = await apiFetch<{ entries: LeaderboardEntry[] }>(
        `/api/scores/leaderboard?limit=${encodeURIComponent(String(limit))}&period=${encodeURIComponent(period)}`,
    );
    return r.entries;
}

export async function summary(): Promise<{ summary: ScoreSummary; trend7d: TrendPoint[] }> {
    const r = await apiFetch<{ summary: ScoreSummary; trend7d: TrendPoint[] }>("/api/scores/summary");
    return { summary: r.summary, trend7d: r.trend7d };
}

/** 清空当前用户的所有云端成绩 */
export async function clearScores(): Promise<number> {
    const r = await apiFetch<{ deleted: number }>("/api/scores/clear", { method: "POST", json: {} });
    return r.deleted;
}
