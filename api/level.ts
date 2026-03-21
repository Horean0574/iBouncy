import type { IncomingMessage, ServerResponse } from "node:http";
import { getUserFromRequest } from "../server/auth";
import { initDb, pool } from "../server/db";
import { ensureUserProgressRow, getXpToNextLevel, LEVEL_UNLOCKS } from "../server/incentives";
import { methodNotAllowed, sendJson } from "../server/http";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await initDb();
  const user = getUserFromRequest(req);
  if (!user) return sendJson(res, 401, { error: "未登录或会话已失效" });
  if (req.method !== "GET") return methodNotAllowed(res);

  const client = await pool.connect();
  try {
    await ensureUserProgressRow(client, user.id);
    const result = await client.query(
      `
            SELECT total_score, total_play_time_sec, total_games, total_xp, level, points
            FROM user_progress
            WHERE user_id = $1
            LIMIT 1
            `,
      [user.id]
    );
    const row = result.rows[0] || {};
    const level = Number(row.level || 1);
    const totalXp = Number(row.total_xp || 0);
    const nextLevelXp = getXpToNextLevel(level);
    sendJson(res, 200, {
      level,
      totalXp,
      nextLevelXp,
      progressToNextLevel: Math.min(1, totalXp / nextLevelXp),
      points: Number(row.points || 0),
      totalScore: Number(row.total_score || 0),
      totalPlayTimeSec: Number(row.total_play_time_sec || 0),
      totalGames: Number(row.total_games || 0),
      unlocked: LEVEL_UNLOCKS.filter((u) => level >= u.level),
      upcomingUnlocks: LEVEL_UNLOCKS.filter((u) => level < u.level).slice(0, 3)
    });
  } catch (err) {
    console.error("Level error:", err);
    sendJson(res, 500, { error: "获取等级信息失败，请稍后重试" });
  } finally {
    client.release();
  }
}
