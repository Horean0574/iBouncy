/**
 * 基于内存的滑动窗口速率限制器（Vercel Serverless 兼容）
 *
 * 注意：在 serverless 环境下，不同实例间不共享内存状态。
 * 生产环境建议迁移到 Redis / Upstash 等方案。
 */

interface WindowEntry {
    timestamps: number[];
}

const store = new Map<string, WindowEntry>();

/** 定期清理过期条目，避免内存泄漏 */
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;
    for (const [key, entry] of store) {
        entry.timestamps = entry.timestamps.filter((t) => now - t < 60_000);
        if (entry.timestamps.length === 0) store.delete(key);
    }
}

/**
 * 检查请求是否超出速率限制
 * @param key    限流标识（如 IP + 路径）
 * @param max    窗口内最大请求数
 * @param windowMs 时间窗口（毫秒），默认 60s
 * @returns `true` 表示超出限制
 */
export function isRateLimited(key: string, max: number, windowMs: number = 60_000): boolean {
    cleanup();
    const now = Date.now();
    const entry = store.get(key);
    if (!entry) {
        store.set(key, { timestamps: [now] });
        return false;
    }
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length >= max) return true;
    entry.timestamps.push(now);
    return false;
}

/** 从 Vercel 请求对象中提取客户端 IP */
export function getClientIp(req: any): string {
    return (
        req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.headers?.["x-real-ip"] ||
        req.socket?.remoteAddress ||
        "unknown"
    );
}
