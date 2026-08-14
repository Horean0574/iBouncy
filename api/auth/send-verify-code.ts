/**
 * 发送邮箱验证码。
 * POST /api/auth/send-verify-code
 *
 * Body: { email: string, purpose: "verify" | "reset" }
 * 验证码 6 位数字，10 分钟有效。
 */
import { getSql, ensureSchema } from "../_lib/db.js";
import { readJsonBody } from "../_lib/body.js";
import { ok, badRequest, methodNotAllowed, serverError, tooManyRequests } from "../_lib/response.js";
import { isRateLimited, getClientIp } from "../_lib/ratelimit.js";
import { smtpConfigured, sendVerificationCode } from "../_lib/mail.js";
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
        // 速率限制：同 IP 每分钟最多 3 次
        const ip = getClientIp(req);
        if (isRateLimited(`send-code:${ip}`, 3)) {
            return tooManyRequests(res);
        }

        if (!smtpConfigured()) {
            return serverError(res, new Error(t(req, "smtpNotConfigured")));
        }

        const body = await readJsonBody(req);
        const email = normalizeEmail(body.email);
        const purpose = body.purpose === "reset" ? "reset" : "verify";

        if (!email || !email.includes("@")) return badRequest(res, t(req, "invalidEmail"));
        if (email.length > 254) return badRequest(res, t(req, "emailTooLong"));

        const code = generateCode();
        const sql = getSql();
        await ensureSchema(sql);

        // 10 分钟后过期
        await sql`
            INSERT INTO email_codes (email, code, purpose, expires_at)
            VALUES (${email}, ${code}, ${purpose}, NOW() + INTERVAL '10 minutes')
        `;

        await sendVerificationCode(email, code, req);

        return ok(res, { sent: true });
    } catch (e: any) {
        if (e?.code === "MISSING_SMTP_CONFIG") {
            return serverError(res, e);
        }
        return serverError(res, e);
    }
}
