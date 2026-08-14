import bcrypt from "bcryptjs";
import { getSql, ensureSchema, firstSqlRow } from "../_lib/db.js";
import { readJsonBody } from "../_lib/body.js";
import {
    ok,
    badRequest,
    unauthorized,
    methodNotAllowed,
    serverError,
    tooManyRequests,
    forbidden,
} from "../_lib/response.js";
import { signToken, buildAuthCookie } from "../_lib/auth.js";
import { isRateLimited, getClientIp } from "../_lib/ratelimit.js";
import { csrfCheck } from "../_lib/csrf.js";
import { toUserPayload } from "../_lib/user.js";
import { t } from "../_lib/i18n.js";

function normalizeEmail(email: unknown) {
    return String(email || "")
        .trim()
        .toLowerCase();
}

type LoginUserRow = {
    id: unknown;
    email: string;
    username: string | null;
    nickname: string | null;
    password_hash: string;
};

export default async function handler(req: any, res: any) {
    if (req.method !== "POST") return methodNotAllowed(res, "POST");
    try {
        // CSRF
        if (!csrfCheck(req)) return forbidden(res, t(req, "csrfFailed"));

        // 速率限制：同 IP 每分钟最多 10 次登录尝试
        const ip = getClientIp(req);
        if (isRateLimited(`login:${ip}`, 10)) {
            return tooManyRequests(res);
        }

        const body = await readJsonBody(req);
        const raw = String(body.identifier ?? body.email ?? "").trim();
        const password = String(body.password || "");

        if (!raw) return badRequest(res, t(req, "requireUsernameOrEmail"));
        if (raw.length > 254) return badRequest(res, t(req, "inputTooLong"));
        if (!password) return badRequest(res, t(req, "requirePassword"));
        if (password.length > 128) return badRequest(res, t(req, "passwordTooLong"));

        const sql = getSql();
        await ensureSchema(sql);

        let rows;
        if (raw.includes("@")) {
            const email = normalizeEmail(raw);
            if (!email || !email.includes("@")) return badRequest(res, t(req, "invalidEmail"));
            rows = await sql`
                SELECT id, email, username, nickname, password_hash
                FROM users WHERE email = ${email} LIMIT 1
            `;
        } else {
            const uname = raw.toLowerCase();
            if (!/^[a-z0-9_]{3,20}$/.test(uname)) {
                return badRequest(res, t(req, "invalidUsernameLogin"));
            }
            rows = await sql`
                SELECT id, email, username, nickname, password_hash
                FROM users WHERE LOWER(username) = ${uname} LIMIT 1
            `;
        }

        const row = firstSqlRow<LoginUserRow>(rows);
        if (!row) return unauthorized(res, t(req, "invalidCredentials"));

        const okPwd = await bcrypt.compare(password, row.password_hash);
        if (!okPwd) return unauthorized(res, t(req, "invalidCredentials"));

        const user = toUserPayload(row);
        const token = signToken({ userId: user.id, email: user.email });
        const cookie = buildAuthCookie(token);
        return ok(res, { user, tokenSet: true }, { "Set-Cookie": cookie });
    } catch (e) {
        return serverError(res, e);
    }
}
