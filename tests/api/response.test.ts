import { describe, it, expect } from "vitest";
import { ok, badRequest, unauthorized, methodNotAllowed, serverError, tooManyRequests, forbidden, json } from "../../api/_lib/response";

function makeRes() {
    const headers = new Map<string, string>();
    let body = "";
    let status = 200;
    let ended = false;
    return {
        setHeader(k: string, v: string) { headers.set(k, v); },
        getHeader(k: string) { return headers.get(k); },
        get body() { return body; },
        get statusCode() { return status; },
        set statusCode(v: number) { status = v; },
        end(data: string) { body = data; ended = true; },
        get ended() { return ended; },
    };
}

function parseBody(res: ReturnType<typeof makeRes>) {
    return JSON.parse(res.body);
}

describe("Response 响应工具", () => {
    it("ok 应该返回 200 状态", () => {
        const res = makeRes();
        ok(res, { data: "test" });
        expect(res.statusCode).toBe(200);
        const body = parseBody(res);
        expect(body.ok).toBe(true);
        expect(body.data).toBe("test");
    });

    it("ok 应该支持额外的 headers", () => {
        const res = makeRes();
        ok(res, { data: "test" }, { "X-Custom": "value" });
        expect(res.getHeader("X-Custom")).toBe("value");
    });

    it("badRequest 应该返回 400", () => {
        const res = makeRes();
        badRequest(res, "参数错误");
        expect(res.statusCode).toBe(400);
        const body = parseBody(res);
        expect(body.ok).toBe(false);
        expect(body.error).toBe("参数错误");
    });

    it("badRequest 默认消息", () => {
        const res = makeRes();
        badRequest(res);
        expect(parseBody(res).error).toBe("Bad Request");
    });

    it("unauthorized 应该返回 401", () => {
        const res = makeRes();
        unauthorized(res, "请先登录");
        expect(res.statusCode).toBe(401);
        expect(parseBody(res).error).toBe("请先登录");
    });

    it("methodNotAllowed 应该返回 405 并包含 Allow 头", () => {
        const res = makeRes();
        methodNotAllowed(res, "POST");
        expect(res.statusCode).toBe(405);
        expect(res.getHeader("Allow")).toBe("POST");
    });

    it("serverError 应该返回 500", () => {
        const res = makeRes();
        serverError(res, new Error("数据库错误"));
        expect(res.statusCode).toBe(500);
        const body = parseBody(res);
        expect(body.ok).toBe(false);
        expect(body.error).toBe("数据库错误");
    });

    it("serverError 无 message 时使用默认值", () => {
        const res = makeRes();
        serverError(res, null);
        expect(res.statusCode).toBe(500);
        expect(parseBody(res).error).toBe("Internal Server Error");
    });

    it("serverError 非 Error 对象", () => {
        const res = makeRes();
        serverError(res, "字符串错误");
        expect(res.statusCode).toBe(500);
        expect(parseBody(res).error).toBe("Internal Server Error");
    });

    it("tooManyRequests 应该返回 429 并包含 Retry-After", () => {
        const res = makeRes();
        tooManyRequests(res);
        expect(res.statusCode).toBe(429);
        expect(res.getHeader("Retry-After")).toBe("60");
    });

    it("forbidden 应该返回 403", () => {
        const res = makeRes();
        forbidden(res, "CSRF 验证失败");
        expect(res.statusCode).toBe(403);
        expect(parseBody(res).ok).toBe(false);
    });

    it("json 应该设置 Content-Type 和 Cache-Control", () => {
        const res = makeRes();
        json(res, 201, { created: true });
        expect(res.statusCode).toBe(201);
        expect(res.getHeader("Content-Type")).toContain("application/json");
        expect(res.getHeader("Cache-Control")).toBe("no-store");
    });
});
