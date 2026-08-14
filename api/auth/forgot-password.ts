/**
 * 忘记密码 - 发送重置验证码。
 * POST /api/auth/forgot-password
 *
 * Body: { email: string }
 * 即使邮箱未注册也返回 success（防止邮箱枚举）。
 */
import { getSql, ensureSchema, firstSqlRow } from "../_lib/db.js";
import { readJsonBody } from "../_lib/body.js";
import { ok, badRequest, methodNotAllowed, serverError, tooManyRequests } from "../_lib/response.js";
import { isRateLimited, getClientIp } from "../_lib/ratelimit.js";
import { smtpConfigured, sendPasswordResetCode } from "../_lib/mail.js";
import { t } from "../_lib/i18n.js";

function normalizeEmail(email: unknown) {
    return String(email || "")
        .trim()
        .toLowerCase();
}

function generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
}

export default async function handler(req: any, res: any) {
    if (req.method !== "POST") return methodNotAllowed(res, "POST");
    try {
        const ip = getClientIp(req);
        if (isRateLimited(`forgot-pwd:${ip}`, 3)) {
            return tooManyRequests(res);
        }

        if (!smtpConfigured()) {
            return serverError(res, new Error(t(req, "smtpNotConfigured")));
        }

        const body = await readJsonBody(req);
        const email = normalizeEmail(body.email);

        if (!email || !email.includes("@")) return badRequest(res, t(req, "invalidEmail"));
        if (email.length > 254) return badRequest(res, t(req, "emailTooLong"));

        const sql = getSql();
        await ensureSchema(sql);

        // 查询用户是否存在
        const rows = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
        const row = firstSqlRow<{ id: unknown }>(rows);

        if (!row) {
            // 邮箱未注册，但仍返回 success（防止邮箱枚举）
            return ok(res, { sent: true });
        }

        const code = generateCode();
        await sql`
            INSERT INTO email_codes (email, code, purpose, expires_at)
            VALUES (${email}, ${code}, 'reset', NOW() + INTERVAL '10 minutes')
        `;

        await sendPasswordResetCode(email, code, req);

        return ok(res, { sent: true });
    } catch (e: any) {
        if (e?.code === "MISSING_SMTP_CONFIG") {
            return serverError(res, e);
        }
        return serverError(res, e);
    }
}
