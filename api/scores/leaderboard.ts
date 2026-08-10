import { getSql, ensureSchema, sqlRows } from "../_lib/db.js";
import { ok, methodNotAllowed, serverError } from "../_lib/response.js";
import { t } from "../_lib/i18n.js";

export default async function handler(req: any, res: any) {
    if (req.method !== "GET") return methodNotAllowed(res, "GET");
    try {
        const url = new URL(req.url, "http://localhost");
        const limitRaw = url.searchParams.get("limit");
        const limit = Math.max(1, Math.min(100, Number(limitRaw || 50) || 50));
        const period = url.searchParams.get("period") || "all";

        const sql = getSql();
        await ensureSchema(sql);

        let timeFilter = sql``;
        const now = new Date();
        if (period === "day") {
            const since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            timeFilter = sql` AND s.created_at >= ${since}`;
        } else if (period === "week") {
            const dayOfWeek = now.getDay();
            const monday = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() - ((dayOfWeek + 6) % 7),
            ).toISOString();
            timeFilter = sql` AND s.created_at >= ${monday}`;
        } else if (period === "month") {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            timeFilter = sql` AND s.created_at >= ${firstDay}`;
        }

        const playerPrefix = t(req, "defaultPlayer");

        const rows = await sql`
            WITH per_user AS (
                SELECT user_id, MAX(score)::int AS best_score
                FROM scores s
                WHERE 1=1 ${timeFilter}
                GROUP BY user_id
            ),
            best_times AS (
                SELECT s.user_id, MIN(s.created_at) AS best_at
                FROM scores s
                INNER JOIN per_user p ON p.user_id = s.user_id AND s.score = p.best_score
                WHERE 1=1 ${timeFilter}
                GROUP BY s.user_id
            )
            SELECT
                ROW_NUMBER() OVER (ORDER BY p.best_score DESC, bt.best_at ASC)::int AS rank,
                p.user_id,
                CASE
                    WHEN NULLIF(TRIM(COALESCE(u.nickname, '')), '') IS NOT NULL THEN TRIM(u.nickname)
                    WHEN NULLIF(TRIM(COALESCE(u.username, '')), '') IS NOT NULL THEN TRIM(u.username)
                    ELSE ${playerPrefix} || u.id::text
                END AS display_name,
                p.best_score,
                bt.best_at
            FROM per_user p
            INNER JOIN best_times bt ON bt.user_id = p.user_id
            INNER JOIN users u ON u.id = p.user_id
            ORDER BY p.best_score DESC, bt.best_at ASC
            LIMIT ${limit}
        `;

        type Row = {
            rank: unknown;
            user_id: unknown;
            display_name: unknown;
            best_score: unknown;
            best_at: unknown;
        };
        const entries = sqlRows<Row>(rows).map((r) => ({
            rank: Number(r.rank),
            userId: Number(r.user_id),
            displayName: String(r.display_name),
            bestScore: Number(r.best_score),
            bestAt: r.best_at instanceof Date ? r.best_at.toISOString() : String(r.best_at),
        }));
        return ok(res, { entries });
    } catch (e) {
        return serverError(res, e);
    }
}
