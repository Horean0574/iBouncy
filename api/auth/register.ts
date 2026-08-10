import bcrypt from "bcryptjs";
import { getSql, ensureSchema, firstSqlRow } from "../_lib/db.js";
import { readJsonBody } from "../_lib/body.js";
import { ok, badRequest, methodNotAllowed, serverError, tooManyRequests, forbidden } from "../_lib/response.js";
import { signToken, buildAuthCookie } from "../_lib/auth.js";
import { isRateLimited, getClientIp } from "../_lib/ratelimit.js";
import { csrfCheck } from "../_lib/csrf.js";
import { toUserPayload, type UserRow } from "../_lib/user.js";
import { t } from "../_lib/i18n.js";

function normalizeEmail(email: unknown) {
    return String(email || "")
        .trim()
        .toLowerCase();
}

function normalizeUsername(u: unknown) {
    return String(u || "")
        .trim()
        .toLowerCase();
}

function normalizeNickname(n: unknown) {
    const s = String(n || "").trim();
    return s.length ? s.slice(0, 32) : "";
}

export default async function handler(req: any, res: any) {
    if (req.method !== "POST") return methodNotAllowed(res, "POST");
    try {
        // CSRF
        if (!csrfCheck(req)) return forbidden(res, t(req, "csrfFailed"));

        // 速率限制：同 IP 每分钟最多 5 次注册
        const ip = getClientIp(req);
        if (isRateLimited(`register:${ip}`, 5)) {
            return tooManyRequests(res);
        }

        const body = await readJsonBody(req);
        const email = normalizeEmail(body.email);
        const password = String(body.password || "");
        const username = normalizeUsername(body.username);
        const nicknameRaw = normalizeNickname(body.nickname);
        const verifyCode = String(body.verifyCode || "").trim();

        if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
            return badRequest(res, t(req, "invalidUsernameFormat"));
        }
        if (!email || !email.includes("@")) return badRequest(res, t(req, "invalidEmail"));
        if (email.length > 254) return badRequest(res, t(req, "emailTooLong"));
        if (password.length < 6) return badRequest(res, t(req, "passwordTooShort"));
        if (password.length > 128) return badRequest(res, t(req, "passwordTooLong"));

        const sql = getSql();
        await ensureSchema(sql);

        // 验证邮箱验证码
        if (verifyCode) {
            if (!/^\d{6}$/.test(verifyCode)) {
                return badRequest(res, t(req, "invalidVerifyCode"));
            }
            const codeRows = await sql`
                SELECT id FROM email_codes
                WHERE email = ${email}
                  AND code = ${verifyCode}
                  AND purpose = 'verify'
                  AND used = false
                  AND expires_at > NOW()
                ORDER BY created_at DESC
                LIMIT 1
            `;
            const codeRow = firstSqlRow<{ id: unknown }>(codeRows);
            if (!codeRow) {
                return badRequest(res, t(req, "verifyCodeInvalid"));
            }
            // 标记验证码已使用
            await sql`UPDATE email_codes SET used = true WHERE id = ${codeRow.id}`;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const nicknameToStore = nicknameRaw || null;

        const rows = await sql`
            INSERT INTO users (email, password_hash, username, nickname)
            VALUES (${email}, ${passwordHash}, ${username}, ${nicknameToStore})
            RETURNING id, email, username, nickname, created_at
        `;

        const row = firstSqlRow<UserRow>(rows);
        if (!row) return serverError(res, new Error(t(req, "registerNoReturn")));
        const user = toUserPayload(row);
        const token = signToken({ userId: user.id, email: user.email });
        const cookie = buildAuthCookie(token);
        return ok(res, { user, tokenSet: true }, { "Set-Cookie": cookie });
    } catch (e: any) {
        const msg = String(e?.message || e).toLowerCase();
        if (msg.includes("duplicate") || msg.includes("unique")) {
            if (msg.includes("email") || msg.includes("(email)")) {
                return badRequest(res, t(req, "emailRegistered"));
            }
            if (msg.includes("username") || msg.includes("uq_users_username")) {
                return badRequest(res, t(req, "usernameTaken"));
            }
            return badRequest(res, t(req, "emailOrUsernameExists"));
        }
        return serverError(res, e);
    }
}
