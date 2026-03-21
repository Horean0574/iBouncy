import type { IncomingMessage, ServerResponse } from "node:http";
import { getUserFromRequest } from "../server/auth";
import { initDb, pool } from "../server/db";
import { claimDailyTaskReward, ensureDailyTasks, ensureUserProgressRow, markShareTaskProgress } from "../server/incentives";
import { methodNotAllowed, parseJsonBody, sendJson, toDateKey } from "../server/http";

type DailyBody = { action?: string; taskType?: string; shareId?: string };

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await initDb();
  const user = getUserFromRequest(req);
  if (!user) return sendJson(res, 401, { error: "未登录或会话已失效" });

  const dateKey = toDateKey();
  const client = await pool.connect();
  let inTx = false;
  try {
    if (req.method === "GET") {
      await ensureUserProgressRow(client, user.id);
      await ensureDailyTasks(client, user.id, dateKey);
      const [tasksRes, progressRes] = await Promise.all([
        client.query("SELECT task_type, title, target, progress, reward_points, status FROM user_daily_tasks WHERE user_id = $1 AND task_date = $2 ORDER BY id ASC", [
          user.id,
          dateKey
        ]),
        client.query("SELECT points, total_xp, level, current_checkin_streak FROM user_progress WHERE user_id = $1", [user.id])
      ]);
      sendJson(res, 200, {
        date: dateKey,
        tasks: tasksRes.rows.map((t: any) => ({
          taskType: t.task_type,
          title: t.title,
          target: Number(t.target),
          progress: Number(t.progress),
          rewardPoints: Number(t.reward_points),
          status: t.status
        })),
        summary: {
          points: Number(progressRes.rows[0]?.points || 0),
          totalXp: Number(progressRes.rows[0]?.total_xp || 0),
          level: Number(progressRes.rows[0]?.level || 1),
          checkinStreak: Number(progressRes.rows[0]?.current_checkin_streak || 0)
        }
      });
      return;
    }
    if (req.method !== "POST") return methodNotAllowed(res);

    const body = await parseJsonBody<DailyBody>(req);
    const action = String(body.action || "claim");
    const taskType = String(body.taskType || "");
    if (!taskType) return sendJson(res, 400, { error: "缺少 taskType" });

    await client.query("BEGIN");
    inTx = true;
    if (action === "share-complete") {
      await markShareTaskProgress(client, user.id, dateKey);
      await client.query("COMMIT");
      inTx = false;
      return sendJson(res, 200, { ok: true, action });
    }
    if (action === "share-reward") {
      const shareId = String(body.shareId || "").trim();
      if (!shareId) throw new Error("缺少 shareId");
      const dailyLimit = 2;
      const rewardPoints = 10;
      await markShareTaskProgress(client, user.id, dateKey);
      const countRes = await client.query(
        "SELECT COUNT(*)::int AS cnt FROM user_points_ledger WHERE user_id = $1 AND source = 'share' AND ref_type = 'share_daily' AND ref_id LIKE $2",
        [user.id, `${dateKey}:%`]
      );
      const used = Number(countRes.rows[0]?.cnt || 0);
      if (used >= dailyLimit) {
        await client.query("COMMIT");
        inTx = false;
        return sendJson(res, 200, { ok: true, rewarded: false, reason: "daily_limit_reached" });
      }
      const refId = `${dateKey}:${shareId}`;
      const insertRes = await client.query(
        "INSERT INTO user_points_ledger (user_id, source, delta, ref_type, ref_id) VALUES ($1, 'share', $2, 'share_daily', $3) ON CONFLICT (user_id, source, ref_type, ref_id) DO NOTHING RETURNING id",
        [user.id, rewardPoints, refId]
      );
      if (insertRes.rows.length > 0) {
        await client.query("UPDATE user_progress SET points = points + $2, updated_at = NOW() WHERE user_id = $1", [user.id, rewardPoints]);
      }
      await client.query("COMMIT");
      inTx = false;
      return sendJson(res, 200, { ok: true, rewarded: insertRes.rows.length > 0, rewardPoints: insertRes.rows.length > 0 ? rewardPoints : 0 });
    }
    const rewardPoints = await claimDailyTaskReward(client, user.id, taskType, dateKey);
    await client.query("COMMIT");
    inTx = false;
    sendJson(res, 200, { ok: true, taskType, rewardPoints });
  } catch (err: any) {
    if (inTx) await client.query("ROLLBACK");
    if (err?.message) return sendJson(res, 400, { error: err.message });
    console.error("Daily tasks error:", err);
    sendJson(res, 500, { error: "每日任务处理失败，请稍后重试" });
  } finally {
    client.release();
  }
}
