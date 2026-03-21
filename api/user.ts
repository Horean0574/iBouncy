import type { IncomingMessage, ServerResponse } from "node:http";
import { getUserFromRequest } from "../server/auth";
import { initDb, pool } from "../server/db";
import { methodNotAllowed, parseJsonBody, sendJson } from "../server/http";

type UserBody = { nickname?: string };

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await initDb();
  const authUser = getUserFromRequest(req);
  if (!authUser) return sendJson(res, 401, { error: "未登录，无法获取用户信息" });

  const client = await pool.connect();
  try {
    if (req.method === "GET") {
      const result = await client.query(
        `
                SELECT 
                    u.id, u.username, COALESCE(u.nickname, '') AS nickname, u.created_at,
                    COUNT(s.id) AS total_games, COALESCE(MAX(s.score), NULL) AS best_score, COALESCE(MAX(s.played_at), NULL) AS last_played_at
                FROM users u
                LEFT JOIN scores s ON s.user_id = u.id
                WHERE u.id = $1
                GROUP BY u.id
                `,
        [authUser.id]
      );
      if (result.rows.length === 0) return sendJson(res, 404, { error: "用户不存在" });
      const row = result.rows[0];
      sendJson(res, 200, {
        user: {
          id: row.id,
          username: row.username,
          nickname: row.nickname || "",
          createdAt: row.created_at,
          totalGames: Number(row.total_games) || 0,
          bestScore: row.best_score != null ? Number(row.best_score) : null,
          lastPlayedAt: row.last_played_at
        }
      });
      return;
    }

    if (req.method === "POST") {
      const body = await parseJsonBody<UserBody>(req);
      const nickname = body.nickname == null ? "" : String(body.nickname).trim();
      if (!nickname) return sendJson(res, 400, { error: "昵称不能为空" });
      if (nickname.length > 24) return sendJson(res, 400, { error: "昵称长度请控制在 24 个字符以内" });
      const result = await client.query("UPDATE users SET nickname = $1 WHERE id = $2 RETURNING id, username, nickname, created_at", [
        nickname,
        authUser.id
      ]);
      const user = result.rows[0];
      sendJson(res, 200, { user: { id: user.id, username: user.username, nickname: user.nickname || "", createdAt: user.created_at } });
      return;
    }

    methodNotAllowed(res);
  } catch (err) {
    console.error("User API error:", err);
    sendJson(res, 500, { error: "用户信息操作失败，请稍后重试" });
  } finally {
    client.release();
  }
}
