import type { IncomingMessage, ServerResponse } from "node:http";
import { getUserFromRequest } from "../server/auth";
import { initDb, pool } from "../server/db";
import { applyGameIncentives } from "../server/incentives";
import { methodNotAllowed, parseJsonBody, sendJson } from "../server/http";

type ScoreBody = { score?: number; difficulty?: string; timestamp?: number; durationSec?: number };

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await initDb();
  const user = getUserFromRequest(req);
  if (!user) return sendJson(res, 401, { error: "未登录或会话已失效" });

  if (req.method === "GET") {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT score, difficulty, EXTRACT(EPOCH FROM played_at) * 1000 AS timestamp FROM scores WHERE user_id = $1 ORDER BY played_at DESC LIMIT 100",
        [user.id]
      );
      sendJson(res, 200, { records: result.rows });
    } catch (err) {
      console.error("Get scores error:", err);
      sendJson(res, 500, { error: "获取成绩失败，请稍后重试" });
    } finally {
      client.release();
    }
    return;
  }

  if (req.method === "POST") {
    const { score, difficulty, timestamp, durationSec } = await parseJsonBody<ScoreBody>(req);
    const s = Number(score);
    if (Number.isNaN(s)) return sendJson(res, 400, { error: "非法的成绩值" });
    if (!difficulty) return sendJson(res, 400, { error: "缺少难度信息" });
    const ts = timestamp ? new Date(Number(timestamp)) : new Date();
    if (Number.isNaN(ts.getTime())) return sendJson(res, 400, { error: "非法的时间戳" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO scores (user_id, score, difficulty, duration_sec, played_at) VALUES ($1, $2, $3, $4, $5)",
        [user.id, s, String(difficulty), Math.max(0, Number(durationSec) || 0), ts]
      );
      const incentiveResult = await applyGameIncentives(client, { userId: user.id, score: s, durationSec, playedAt: ts });
      await client.query("COMMIT");
      sendJson(res, 200, { ok: true, incentive: incentiveResult });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Insert score error:", err);
      sendJson(res, 500, { error: "保存成绩失败，请稍后重试" });
    } finally {
      client.release();
    }
    return;
  }

  methodNotAllowed(res);
}
