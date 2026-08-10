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

        // 速率限制：同 IP 每分钟最多 30 次提交
        const ip = getClientIp(req);
        if (isRateLimited(`score:${ip}`, 30)) {
            return tooManyRequests(res);
        }

        const body = await readJsonBody(req);
        const score = Number(body.score);
        const clientId = body.clientId ? String(body.clientId) : null;
        if (!Number.isFinite(score)) return badRequest(res, t(req, "scoreMustBeNumber"));
        if (score < 0) return badRequest(res, t(req, "scoreMustBePositive"));
        if (score > 1_000_000) return badRequest(res, t(req, "scoreOutOfRange"));

        const scoreInt = Math.round(score);
        if (clientId && clientId.length > 80) return badRequest(res, t(req, "clientIdTooLong"));

        const sql = getSql();
        await ensureSchema(sql);

        const rows = clientId
            ? await sql`
                  INSERT INTO scores (user_id, client_id, score)
                  VALUES (${user.userId}, ${clientId}, ${scoreInt})
                  ON CONFLICT (user_id, client_id) DO UPDATE SET score = EXCLUDED.score
                  RETURNING id, score, created_at
              `
            : await sql`
                  INSERT INTO scores (user_id, score)
                  VALUES (${user.userId}, ${scoreInt})
                  RETURNING id, score, created_at
              `;

        type ScoreRow = { id: unknown; score: unknown; created_at: unknown };
        const row = firstSqlRow<ScoreRow>(rows);
        if (!row) return serverError(res, new Error(t(req, "saveScoreFailed")));
        return ok(res, {
            saved: true,
            record: { id: Number(row.id), score: Number(row.score), createdAt: row.created_at },
        });
    } catch (e) {
        return serverError(res, e);
    }
}
