const { pool, initDb } = require("./_db");
const { getUserFromRequest } = require("./_auth");
const { sendJson, methodNotAllowed, parseJsonBody, toDateKey } = require("./_http");
const {
    ensureDailyTasks,
    claimDailyTaskReward,
    markShareTaskProgress,
    ensureUserProgressRow,
} = require("./_incentives");

module.exports = async (req, res) => {
    await initDb();
    const user = getUserFromRequest(req);
    if (!user) {
        sendJson(res, 401, { error: "未登录或会话已失效" });
        return;
    }

    const dateKey = toDateKey();
    const client = await pool.connect();
    let inTx = false;
    try {
        if (req.method === "GET") {
            await ensureUserProgressRow(client, user.id);
            await ensureDailyTasks(client, user.id, dateKey);
            const [tasksRes, progressRes] = await Promise.all([
                client.query(
                    `
                    SELECT task_type, title, target, progress, reward_points, status
                    FROM user_daily_tasks
                    WHERE user_id = $1 AND task_date = $2
                    ORDER BY id ASC
                    `,
                    [user.id, dateKey]
                ),
                client.query(
                    `
                    SELECT points, total_xp, level, current_checkin_streak
                    FROM user_progress
                    WHERE user_id = $1
                    `,
                    [user.id]
                ),
            ]);

            sendJson(res, 200, {
                date: dateKey,
                tasks: tasksRes.rows.map((t) => ({
                    taskType: t.task_type,
                    title: t.title,
                    target: Number(t.target),
                    progress: Number(t.progress),
                    rewardPoints: Number(t.reward_points),
                    status: t.status,
                })),
                summary: {
                    points: Number(progressRes.rows[0]?.points || 0),
                    totalXp: Number(progressRes.rows[0]?.total_xp || 0),
                    level: Number(progressRes.rows[0]?.level || 1),
                    checkinStreak: Number(progressRes.rows[0]?.current_checkin_streak || 0),
                },
            });
            return;
        }

        if (req.method === "POST") {
            const body = await parseJsonBody(req);
            const action = String(body.action || "claim");
            const taskType = String(body.taskType || "");
            if (!taskType) {
                sendJson(res, 400, { error: "缺少 taskType" });
                return;
            }

            await client.query("BEGIN");
            inTx = true;
            if (action === "share-complete") {
                await markShareTaskProgress(client, user.id, dateKey);
                await client.query("COMMIT");
                inTx = false;
                sendJson(res, 200, { ok: true, action });
                return;
            }
            const rewardPoints = await claimDailyTaskReward(client, user.id, taskType, dateKey);
            await client.query("COMMIT");
            inTx = false;
            sendJson(res, 200, { ok: true, taskType, rewardPoints });
            return;
        }

        methodNotAllowed(res);
    } catch (err) {
        if (inTx) {
            await client.query("ROLLBACK");
            inTx = false;
        }
        if (err && err.message) {
            sendJson(res, 400, { error: err.message });
            return;
        }
        console.error("Daily tasks error:", err);
        sendJson(res, 500, { error: "每日任务处理失败，请稍后重试" });
    } finally {
        client.release();
    }
};
