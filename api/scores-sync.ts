import type { IncomingMessage, ServerResponse } from "node:http";
import { getUserFromRequest } from "../server/auth";
import { initDb, pool } from "../server/db";
import { parseJsonBody, sendJson } from "../server/http";

type SyncRecord = { score?: number; difficulty?: string; timestamp?: number | string };
type SyncBody = { records?: SyncRecord[] };

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await initDb();
  const user = getUserFromRequest(req);
  if (!user) return sendJson(res, 401, { error: "未登录或会话已失效" });
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method Not Allowed" });

  const { records } = await parseJsonBody<SyncBody>(req);
  if (!Array.isArray(records)) return sendJson(res, 400, { error: "records 字段必须是数组" });

  const client = await pool.connect();
  try {
    for (const r of records) {
      const s = Number(r.score);
      const difficulty = r.difficulty;
      const ts = new Date(r.timestamp as any);
      if (Number.isNaN(s) || !difficulty || Number.isNaN(ts.getTime())) continue;
      await client.query(
        `
                INSERT INTO scores (user_id, score, difficulty, played_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id, difficulty, score, played_at) DO NOTHING
                `,
        [user.id, s, String(difficulty), ts]
      );
    }
    const result = await client.query(
      "SELECT score, difficulty, EXTRACT(EPOCH FROM played_at) * 1000 AS timestamp FROM scores WHERE user_id = $1 ORDER BY played_at DESC LIMIT 100",
      [user.id]
    );
    sendJson(res, 200, { records: result.rows });
  } catch (err) {
    console.error("Scores sync error:", err);
    sendJson(res, 500, { error: "同步成绩失败，请稍后重试" });
  } finally {
    client.release();
  }
}
