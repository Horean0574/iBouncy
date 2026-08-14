type ExtraHeaders = Record<string, string>;

export function json(res: any, statusCode: number, data: unknown, extraHeaders?: ExtraHeaders) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    if (extraHeaders) {
        for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
    }
    res.end(JSON.stringify(data));
}

export function ok(res: any, data: Record<string, unknown>, extraHeaders?: ExtraHeaders) {
    return json(res, 200, { ok: true, ...data }, extraHeaders);
}

export function badRequest(res: any, message?: string) {
    return json(res, 400, { ok: false, error: message || "Bad Request" });
}

export function unauthorized(res: any, message?: string) {
    return json(res, 401, { ok: false, error: message || "Unauthorized" });
}

export function methodNotAllowed(res: any, allow: string) {
    res.setHeader("Allow", allow);
    return json(res, 405, { ok: false, error: "Method Not Allowed" });
}

export function serverError(res: any, err: unknown) {
    const msg =
        err && typeof err === "object" && "message" in err ? String((err as any).message) : "Internal Server Error";
    return json(res, 500, { ok: false, error: msg });
}

export function tooManyRequests(res: any, message?: string) {
    res.setHeader("Retry-After", "60");
    return json(res, 429, { ok: false, error: message || "Too Many Requests" });
}

export function forbidden(res: any, message?: string) {
    return json(res, 403, { ok: false, error: message || "Forbidden" });
}
