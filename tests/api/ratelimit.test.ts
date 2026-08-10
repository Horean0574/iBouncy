import { describe, it, expect, vi, beforeEach } from "vitest";
import { isRateLimited, getClientIp } from "../../api/_lib/ratelimit";

describe("Ratelimit 速率限制", () => {
    const KEY = "test:user";
    const WINDOW = 60000;

    beforeEach(() => {
        vi.useFakeTimers();
    });

    it("首次请求不应该被限流", () => {
        expect(isRateLimited(KEY, 5, WINDOW)).toBe(false);
    });

    it("在限制数之内的请求不应该被限流", () => {
        for (let i = 0; i < 4; i++) {
            expect(isRateLimited(KEY, 5, WINDOW)).toBe(false);
        }
    });

    it("超出限制数的请求应该被限流", () => {
        for (let i = 0; i < 5; i++) {
            isRateLimited(KEY, 5, WINDOW);
        }
        expect(isRateLimited(KEY, 5, WINDOW)).toBe(true);
    });

    it("窗口过期后应该重置计数", () => {
        for (let i = 0; i < 5; i++) {
            isRateLimited(KEY + "_reset", 5, WINDOW);
        }
        expect(isRateLimited(KEY + "_reset", 5, WINDOW)).toBe(true);

        vi.advanceTimersByTime(WINDOW + 1000);

        expect(isRateLimited(KEY + "_reset", 5, WINDOW)).toBe(false);
    });

    it("不同的 key 应该独立计数", () => {
        for (let i = 0; i < 5; i++) {
            isRateLimited("key1", 5, WINDOW);
        }
        expect(isRateLimited("key1", 5, WINDOW)).toBe(true);
        expect(isRateLimited("key2", 5, WINDOW)).toBe(false);
    });

    it("默认窗口为 60 秒", () => {
        const max = 3;
        for (let i = 0; i < max; i++) {
            isRateLimited("default_window", max);
        }
        expect(isRateLimited("default_window", max)).toBe(true);
    });
});

describe("getClientIp 客户端 IP 提取", () => {
    it("应该从 x-forwarded-for 提取 IP", () => {
        const req = {
            headers: {
                "x-forwarded-for": "203.0.113.1, 10.0.0.1",
            },
        };
        expect(getClientIp(req)).toBe("203.0.113.1");
    });

    it("应该从 x-real-ip 提取 IP", () => {
        const req = {
            headers: {
                "x-real-ip": "203.0.113.2",
            },
        };
        expect(getClientIp(req)).toBe("203.0.113.2");
    });

    it("应该从 socket.remoteAddress 提取 IP", () => {
        const req = {
            headers: {},
            socket: { remoteAddress: "192.168.1.1" },
        };
        expect(getClientIp(req)).toBe("192.168.1.1");
    });

    it("无可用信息时返回 unknown", () => {
        const req = { headers: {} };
        expect(getClientIp(req)).toBe("unknown");
    });
});
