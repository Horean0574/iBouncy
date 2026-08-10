import { getSql, ensureSchema, firstSqlRow, sqlRows } from "../_lib/db.js";
import { ok, unauthorized, methodNotAllowed, serverError } from "../_lib/response.js";
import { getUserFromRequest } from "../_lib/auth.js";
import { t } from "../_lib/i18n.js";

type TrendPoint = { day: string; games: number; bestScore: number; totalScore: number };

function isoDay(d: Date): string {
    // YYYY-MM-DD
    return d.toISOString().slice(0, 10);
}

export default async function handler(req: any, res: any) {
    if (req.method !== "GET") return methodNotAllowed(res, "GET");
    try {
        const user = getUserFromRequest(req);
        if (!user) return unauthorized(res, t(req, "requireLogin"));

        const sql = getSql();
        await ensureSchema(sql);

        const aggRows = await sql`
            SELECT
                COUNT(*)::int AS games,
                COALESCE(MAX(score), 0)::int AS best_score,
                COALESCE(SUM(score), 0)::bigint AS total_score
            FROM scores
            WHERE user_id = ${user.userId}
        `;
        type AggRow = { games: unknown; best_score: unknown; total_score: unknown };
        const agg = firstSqlRow<AggRow>(aggRows) || { games: 0, best_score: 0, total_score: 0 };

        const lastRows = await sql`
            SELECT score, created_at
            FROM scores
            WHERE user_id = ${user.userId}
            ORDER BY created_at DESC
            LIMIT 1
        `;
        type LastScoreRow = { score: unknown; created_at: unknown };
        const last = firstSqlRow<LastScoreRow>(lastRows) || null;

        // 近 7 天趋势：按 UTC day 聚合（serverless 环境更稳定）
        const trendRows = await sql`
            SELECT
                to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                COUNT(*)::int AS games,
                COALESCE(MAX(score), 0)::int AS best_score,
                COALESCE(SUM(score), 0)::bigint AS total_score
            FROM scores
            WHERE user_id = ${user.userId}
              AND created_at >= (NOW() AT TIME ZONE 'utc') - INTERVAL '7 days'
            GROUP BY 1
            ORDER BY 1 ASC
        `;

        type TrendSqlRow = { day: unknown; games: unknown; best_score: unknown; total_score: unknown };
        const map = new Map<string, TrendPoint>();
        for (const r of sqlRows<TrendSqlRow>(trendRows)) {
            map.set(String(r.day), {
                day: String(r.day),
                games: Number(r.games),
                bestScore: Number(r.best_score),
                totalScore: Number(r.total_score),
            });
        }

        const today = new Date();
        const days: TrendPoint[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
            d.setUTCDate(d.getUTCDate() - i);
            const day = isoDay(d);
            days.push(map.get(day) || { day, games: 0, bestScore: 0, totalScore: 0 });
        }

        return ok(res, {
            summary: {
                games: Number(agg.games),
                bestScore: Number(agg.best_score),
                totalScore: Number(agg.total_score),
                lastScore: last ? Number(last.score) : 0,
                lastAt: last ? last.created_at : null,
            },
            trend7d: days,
        });
    } catch (e) {
        return serverError(res, e);
    }
}
