import { getSql, ensureSchema } from "../_lib/db.js";
import { ok, unauthorized, methodNotAllowed, serverError, tooManyRequests, forbidden } from "../_lib/response.js";
import { getUserFromRequest } from "../_lib/auth.js";
import { isRateLimited, getClientIp } from "../_lib/ratelimit.js";
import { csrfCheck } from "../_lib/csrf.js";
import { t } from "../_lib/i18n.js";

export default async function handler(req: any, res: any) {
    if (req.method !== "POST") return methodNotAllowed(res, "POST");
    try {
        const user = getUserFromRequest(req);
        if (!user) return unauthorized(res, t(req, "requireLogin"));

        // CSRF
        if (!csrfCheck(req)) return forbidden(res, t(req, "csrfFailed"));

        // 速率限制：清空操作每分钟最多 2 次
        const ip = getClientIp(req);
        if (isRateLimited(`clear-score:${ip}`, 2)) {
            return tooManyRequests(res, t(req, "tooFrequent"));
        }

        const sql = getSql();
        await ensureSchema(sql);

        const result = await sql`DELETE FROM scores WHERE user_id = ${user.userId}`;
        const deleted = Array.isArray(result) ? result.length : 0;

        return ok(res, { deleted });
    } catch (e) {
        return serverError(res, e);
    }
}
