import { getHistory, setHistoryFromServer } from "./scoreStorage";
import { showLoading, hideLoading } from "../ui/loadingOverlay";

const AUTH_STORAGE_KEY = "iBouncy_user";
const API_BASE = "/api";
const LEADERBOARD_CACHE_KEY = "iBouncy_leaderboard_top20";
const LEADERBOARD_CACHE_TTL_MS = 60 * 1000;

export interface User {
  id: number;
  username: string;
  nickname?: string;
}

export interface UserProfile extends User {
  createdAt: string;
  totalGames: number;
  bestScore: number | null;
  lastPlayedAt: string | null;
}

export type LeaderboardType = "global" | "daily" | "weekly";
export type LeaderboardScope = "global" | "friends";

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  displayName: string;
  score: number;
}

export interface LeaderboardMe {
  rank: number;
  bestScore: number;
  gapToNext: number;
  gapToTop: number;
}

export interface LeaderboardResponse {
  type: LeaderboardType;
  scope: LeaderboardScope;
  top: LeaderboardEntry[];
  me: LeaderboardMe | null;
}

export interface DailyTask {
  taskType: string;
  title: string;
  target: number;
  progress: number;
  rewardPoints: number;
  status: "pending" | "completed" | "claimed";
}

export interface DailyTasksResponse {
  date: string;
  tasks: DailyTask[];
  summary: {
    points: number;
    totalXp: number;
    level: number;
    checkinStreak: number;
  };
}

export interface CheckinStatus {
  today: string;
  checkedInToday: boolean;
  streak: number;
  lastCheckinDate: string | null;
  points: number;
}

export interface LevelUnlock {
  level: number;
  key: string;
  name: string;
}

export interface LevelInfo {
  level: number;
  totalXp: number;
  nextLevelXp: number;
  progressToNextLevel: number;
  points: number;
  totalScore: number;
  totalPlayTimeSec: number;
  totalGames: number;
  unlocked: LevelUnlock[];
  upcomingUnlocks: LevelUnlock[];
}

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data.id === "number" && typeof data.username === "string") {
      return data as User;
    }
    return null;
  } catch {
    return null;
  }
}

function saveStoredUser(user: User) {
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

async function requestJson(path: string, options: RequestInit = {}) {
  showLoading();
  try {
    const res = await fetch(API_BASE + path, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      credentials: "include",
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data && (data as any).error) || `请求失败：${res.status}`;
      throw new Error(msg);
    }
    return data as any;
  } finally {
    hideLoading();
  }
}

export async function login(username: string, password: string) {
  const data = await requestJson("/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  if (data.user) {
    saveStoredUser(data.user);
  }
  return data.user as User;
}

export async function register(username: string, password: string, nickname: string) {
  const data = await requestJson("/register", {
    method: "POST",
    body: JSON.stringify({ username, password, nickname })
  });
  if (data.user) {
    saveStoredUser(data.user);
  }
  return data.user as User;
}

export async function fetchScoresForCurrentUser() {
  const user = getCurrentUser();
  if (!user) return [];
  const data = await requestJson(`/scores`, {
    method: "GET"
  });
  return Array.isArray(data.records) ? data.records : [];
}

export async function pushScoreForCurrentUser(
  score: number,
  difficulty: string,
  timestamp: number,
  durationSec = 0
) {
  const user = getCurrentUser();
  if (!user) return;
  try {
    await requestJson("/scores", {
      method: "POST",
      body: JSON.stringify({
        score,
        difficulty,
        timestamp,
        durationSec
      })
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
    body: JSON.stringify({ records: localRecords })
  });
  const merged = Array.isArray(data.records) ? data.records : [];
  setHistoryFromServer(merged);
  return merged;
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
  const user = getCurrentUser();
  if (!user) return null;
  const data = await requestJson("/user", {
    method: "GET"
  });
  return data.user as UserProfile;
}

export async function updateNickname(nickname: string): Promise<UserProfile> {
  const data = await requestJson("/user", {
    method: "POST",
    body: JSON.stringify({ nickname })
  });
  if (data.user) {
    const basicUser: User = {
      id: data.user.id,
      username: data.user.username,
      nickname: data.user.nickname
    };
    saveStoredUser(basicUser);
  }
  return data.user as UserProfile;
}

/** 仅验证当前密码是否正确（修改密码前先调用） */
export async function verifyPassword(password: string): Promise<void> {
  await requestJson("/verify-password", {
    method: "POST",
    body: JSON.stringify({ password })
  });
}

export async function changePassword(oldPassword: string, newPassword: string) {
  await requestJson("/change-password", {
    method: "POST",
    body: JSON.stringify({ oldPassword, newPassword })
  });
}

export async function deleteAccount() {
  await requestJson("/delete-account", {
    method: "POST"
  });
  logout();
}

function getLeaderboardCacheKey(type: LeaderboardType, scope: LeaderboardScope) {
  return `${type}:${scope}`;
}

function loadLeaderboardCache(): Record<string, { ts: number; data: LeaderboardResponse }> {
  try {
    const raw = localStorage.getItem(LEADERBOARD_CACHE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function saveLeaderboardCache(cache: Record<string, { ts: number; data: LeaderboardResponse }>) {
  try {
    localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export async function fetchLeaderboard(
  type: LeaderboardType,
  scope: LeaderboardScope,
  limit = 100
): Promise<LeaderboardResponse> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const key = getLeaderboardCacheKey(type, scope);
  const shouldUseTop20Cache = safeLimit <= 20;

  if (shouldUseTop20Cache) {
    const cache = loadLeaderboardCache();
    const item = cache[key];
    if (item && Date.now() - Number(item.ts || 0) <= LEADERBOARD_CACHE_TTL_MS) {
      return item.data;
    }
  }

  const data = (await requestJson(
    `/leaderboards?type=${encodeURIComponent(type)}&scope=${encodeURIComponent(
      scope
    )}&limit=${safeLimit}`,
    { method: "GET" }
  )) as LeaderboardResponse;

  if (shouldUseTop20Cache) {
    const cache = loadLeaderboardCache();
    cache[key] = {
      ts: Date.now(),
      data
    };
    saveLeaderboardCache(cache);
  }

  return data;
}

export async function fetchDailyTasks(): Promise<DailyTasksResponse> {
  return (await requestJson("/daily-tasks", { method: "GET" })) as DailyTasksResponse;
}

export async function claimDailyTask(taskType: string): Promise<{ rewardPoints: number }> {
  return (await requestJson("/daily-tasks", {
    method: "POST",
    body: JSON.stringify({
      action: "claim",
      taskType
    })
  })) as { rewardPoints: number };
}

export async function markShareTaskCompleted(): Promise<void> {
  await requestJson("/daily-tasks", {
    method: "POST",
    body: JSON.stringify({
      action: "share-complete",
      taskType: "share_once"
    })
  });
}

export async function claimShareReward(shareId: string): Promise<{
  rewarded: boolean;
  rewardPoints: number;
  reason?: string;
}> {
  return (await requestJson("/share-reward", {
    method: "POST",
    body: JSON.stringify({ shareId })
  })) as { rewarded: boolean; rewardPoints: number; reason?: string };
}

export async function fetchCheckinStatus(): Promise<CheckinStatus> {
  return (await requestJson("/checkin", { method: "GET" })) as CheckinStatus;
}

export async function doCheckin(): Promise<{ streak: number; rewardPoints: number }> {
  return (await requestJson("/checkin", {
    method: "POST",
    body: JSON.stringify({ action: "checkin" })
  })) as { streak: number; rewardPoints: number };
}

export async function doMakeupCheckin(): Promise<{ makeupDate: string }> {
  return (await requestJson("/checkin", {
    method: "POST",
    body: JSON.stringify({ action: "makeup" })
  })) as { makeupDate: string };
}

export async function fetchLevelInfo(): Promise<LevelInfo> {
  return (await requestJson("/level", { method: "GET" })) as LevelInfo;
}

