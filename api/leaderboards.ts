import type { IncomingMessage, ServerResponse } from "node:http";
import { getUserFromRequest } from "../server/auth";
import { initDb, pool } from "../server/db";
import { methodNotAllowed, sendJson } from "../server/http";

function getTimeCondition(type: string): string {
  if (type === "daily") return "AND s.played_at >= date_trunc('day', NOW())";
  if (type === "weekly") return "AND s.played_at >= date_trunc('week', NOW())";
  return "";
}

export default async function handler(req: IncomingMessage & { query?: any }, res: ServerResponse): Promise<void> {
  await initDb();
  const user = getUserFromRequest(req);
  if (!user) return sendJson(res, 401, { error: "未登录或会话已失效" });
  if (req.method !== "GET") return methodNotAllowed(res);

  const query = req.query || {};
  const typeRaw = String(query.type || "global");
  const scopeRaw = String(query.scope || "global");
  const boardType = ["global", "daily", "weekly"].includes(typeRaw) ? typeRaw : "global";
  const scope = scopeRaw === "friends" ? "friends" : "global";
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 100));
  const timeCondition = getTimeCondition(boardType);

  const client = await pool.connect();
  try {
    const params: Array<number> = [limit];
    let scopeFilter = "";
    if (scope === "friends") {
      params.push(user.id);
      scopeFilter = `
                AND s.user_id IN (
                    SELECT f.friend_user_id
                    FROM friendships f
                    WHERE f.user_id = $2 AND f.status = 'accepted'
                    UNION SELECT $2
                )
            `;
    }

    const leaderboardSql = `
            WITH base AS (
                SELECT s.user_id, MAX(s.score) AS best_score
                FROM scores s
                WHERE 1 = 1
                ${timeCondition}
                ${scopeFilter}
                GROUP BY s.user_id
            ),
            ranked AS (
                SELECT b.user_id, b.best_score, ROW_NUMBER() OVER (ORDER BY b.best_score DESC, b.user_id ASC) AS rank
                FROM base b
            )
            SELECT r.user_id, r.best_score, r.rank, u.username, COALESCE(NULLIF(TRIM(u.nickname), ''), u.username) AS display_name
            FROM ranked r
            JOIN users u ON u.id = r.user_id
            ORDER BY r.rank ASC
            LIMIT $1
        `;
    const listRes = await client.query(leaderboardSql, params);

    const myParams = scope === "friends" ? [user.id, user.id] : [user.id];
    const mySql = `
            WITH base AS (
                SELECT s.user_id, MAX(s.score) AS best_score
                FROM scores s
                WHERE 1 = 1
                ${timeCondition}
                ${
                  scope === "friends"
                    ? `AND s.user_id IN (SELECT f.friend_user_id FROM friendships f WHERE f.user_id = $2 AND f.status = 'accepted' UNION SELECT $2)`
                    : ""
                }
                GROUP BY s.user_id
            ),
            ranked AS (
                SELECT b.user_id, b.best_score, ROW_NUMBER() OVER (ORDER BY b.best_score DESC, b.user_id ASC) AS rank
                FROM base b
            )
            SELECT me.user_id, me.rank, me.best_score, prev.best_score AS prev_best_score, top.best_score AS top_best_score
            FROM ranked me
            LEFT JOIN ranked prev ON prev.rank = me.rank - 1
            LEFT JOIN ranked top ON top.rank = 1
            WHERE me.user_id = $1
            LIMIT 1
        `;
    const myRes = await client.query(mySql, myParams);
    const me = myRes.rows[0] || null;
    const myRank =
      me == null
        ? null
        : {
            rank: Number(me.rank),
            bestScore: Number(me.best_score || 0),
            gapToNext: me.prev_best_score == null ? 0 : Math.max(0, Number(me.prev_best_score) - Number(me.best_score || 0)),
            gapToTop: Math.max(0, Number(me.top_best_score || 0) - Number(me.best_score || 0))
          };

    sendJson(res, 200, {
      type: boardType,
      scope,
      top: listRes.rows.map((r: any) => ({
        rank: Number(r.rank),
        userId: Number(r.user_id),
        username: r.username,
        displayName: r.display_name,
        score: Number(r.best_score)
      })),
      me: myRank
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    sendJson(res, 500, { error: "获取排行榜失败，请稍后重试" });
  } finally {
    client.release();
  }
}
