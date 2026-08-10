/**
 * 重置密码。
 * POST /api/auth/reset-password
 *
 * Body: { email: string, code: string, password: string }
 */
import bcrypt from "bcryptjs";
import { getSql, ensureSchema, firstSqlRow } from "../_lib/db.js";
import { readJsonBody } from "../_lib/body.js";
import { ok, badRequest, methodNotAllowed, serverError, tooManyRequests } from "../_lib/response.js";
import { isRateLimited, getClientIp } from "../_lib/ratelimit.js";
import { t } from "../_lib/i18n.js";

function normalizeEmail(email: unknown) {
    return String(email || "")
        .trim()
        .toLowerCase();
}

export default async function handler(req: any, res: any) {
    if (req.method !== "POST") return methodNotAllowed(res, "POST");
    try {
        const ip = getClientIp(req);
        if (isRateLimited(`reset-pwd:${ip}`, 5)) {
            return tooManyRequests(res);
        }

        const body = await readJsonBody(req);
        const email = normalizeEmail(body.email);
        const code = String(body.code || "").trim();
        const password = String(body.password || "");

        if (!email || !email.includes("@")) return badRequest(res, t(req, "invalidEmail"));
        if (email.length > 254) return badRequest(res, t(req, "emailTooLong"));
        if (!/^\d{6}$/.test(code)) return badRequest(res, t(req, "invalidVerifyCode"));
        if (password.length < 6) return badRequest(res, t(req, "passwordTooShort"));
        if (password.length > 128) return badRequest(res, t(req, "passwordTooLong"));

        const sql = getSql();
        await ensureSchema(sql);

        // 验证验证码
        const codeRows = await sql`
            SELECT id FROM email_codes
            WHERE email = ${email}
              AND code = ${code}
              AND purpose = 'reset'
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

        // 更新密码
        const passwordHash = await bcrypt.hash(password, 10);
        await sql`UPDATE users SET password_hash = ${passwordHash} WHERE email = ${email}`;

        return ok(res, { reset: true });
    } catch (e) {
        return serverError(res, e);
    }
}
