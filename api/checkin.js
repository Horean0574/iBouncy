const { pool, initDb } = require("./_db");
const { getUserFromRequest } = require("./_auth");
const { sendJson, methodNotAllowed, parseJsonBody, toDateKey } = require("./_http");
const { ensureUserProgressRow } = require("./_incentives");

function getWeekKey(d = new Date()) {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

module.exports = async (req, res) => {
    await initDb();
    const user = getUserFromRequest(req);
    if (!user) {
        sendJson(res, 401, { error: "未登录或会话已失效" });
        return;
    }
    if (req.method !== "GET" && req.method !== "POST") {
        methodNotAllowed(res);
        return;
    }

    const client = await pool.connect();
    const today = toDateKey();
    let inTx = false;
    try {
        await ensureUserProgressRow(client, user.id);

        if (req.method === "GET") {
            const [progressRes, todayRes] = await Promise.all([
                client.query(
                    "SELECT current_checkin_streak, last_checkin_date, points FROM user_progress WHERE user_id = $1",
                    [user.id]
                ),
                client.query(
                    "SELECT 1 FROM user_checkins WHERE user_id = $1 AND checkin_date = $2 LIMIT 1",
                    [user.id, today]
                ),
            ]);
            const row = progressRes.rows[0] || {};
            sendJson(res, 200, {
                today,
                checkedInToday: Boolean(todayRes.rows[0]),
                streak: Number(row.current_checkin_streak || 0),
                lastCheckinDate: row.last_checkin_date || null,
                points: Number(row.points || 0),
            });
            return;
        }

        const body = await parseJsonBody(req);
        const action = String(body.action || "checkin");
        await client.query("BEGIN");
        inTx = true;

        if (action === "makeup") {
            const yesterday = new Date(`${today}T00:00:00.000Z`);
            yesterday.setUTCDate(yesterday.getUTCDate() - 1);
            const yKey = toDateKey(yesterday);
            const weekKey = getWeekKey();

            const [alreadyRes, todayGameRes, limitRes] = await Promise.all([
                client.query(
                    "SELECT 1 FROM user_checkins WHERE user_id = $1 AND checkin_date = $2 LIMIT 1",
                    [user.id, yKey]
                ),
                client.query(
                    "SELECT 1 FROM scores WHERE user_id = $1 AND played_at >= date_trunc('day', NOW()) LIMIT 1",
                    [user.id]
                ),
                client.query(
                    "SELECT used_count FROM user_makeup_limits WHERE user_id = $1 AND week_key = $2 LIMIT 1",
                    [user.id, weekKey]
                ),
            ]);

            if (alreadyRes.rows[0]) {
                throw new Error("昨天已签到，无需补签");
            }
            if (!todayGameRes.rows[0]) {
                throw new Error("补签需要今天至少完成 1 局游戏");
            }
            if (Number(limitRes.rows[0]?.used_count || 0) >= 1) {
                throw new Error("本周补签次数已用完");
            }

            await client.query(
                "INSERT INTO user_checkins (user_id, checkin_date, is_makeup) VALUES ($1, $2, TRUE)",
                [user.id, yKey]
            );
            await client.query(
                `
                INSERT INTO user_makeup_limits (user_id, week_key, used_count)
                VALUES ($1, $2, 1)
                ON CONFLICT (user_id, week_key)
                DO UPDATE SET used_count = user_makeup_limits.used_count + 1
                `,
                [user.id, weekKey]
            );
            await client.query("COMMIT");
            inTx = false;
            sendJson(res, 200, { ok: true, action, makeupDate: yKey });
            return;
        }

        const checkinRes = await client.query(
            "SELECT 1 FROM user_checkins WHERE user_id = $1 AND checkin_date = $2 LIMIT 1",
            [user.id, today]
        );
        if (checkinRes.rows[0]) {
            throw new Error("今天已签到");
        }

        const progressRes = await client.query(
            "SELECT current_checkin_streak, last_checkin_date FROM user_progress WHERE user_id = $1",
            [user.id]
        );
        const progress = progressRes.rows[0] || {};
        const lastDate = progress.last_checkin_date ? String(progress.last_checkin_date) : null;
        const yesterdayKey = (() => {
            const d = new Date(`${today}T00:00:00.000Z`);
            d.setUTCDate(d.getUTCDate() - 1);
            return toDateKey(d);
        })();

        const oldStreak = Number(progress.current_checkin_streak || 0);
        const nextStreak = lastDate === yesterdayKey ? oldStreak + 1 : 1;
        const rewardPoints = nextStreak >= 7 ? 30 : nextStreak >= 3 ? 20 : 10;

        await client.query(
            "INSERT INTO user_checkins (user_id, checkin_date, is_makeup) VALUES ($1, $2, FALSE)",
            [user.id, today]
        );
        await client.query(
            `
            UPDATE user_progress
            SET current_checkin_streak = $2,
                last_checkin_date = $3,
                points = points + $4,
                updated_at = NOW()
            WHERE user_id = $1
            `,
            [user.id, nextStreak, today, rewardPoints]
        );
        await client.query(
            `
            INSERT INTO user_points_ledger (user_id, source, delta, ref_type, ref_id)
            VALUES ($1, 'checkin', $2, 'checkin', $3)
            ON CONFLICT (user_id, source, ref_type, ref_id) DO NOTHING
            `,
            [user.id, rewardPoints, today]
        );
        await client.query("COMMIT");
        inTx = false;

        sendJson(res, 200, {
            ok: true,
            action: "checkin",
            streak: nextStreak,
            rewardPoints,
        });
    } catch (err) {
        if (inTx) {
            await client.query("ROLLBACK");
            inTx = false;
        }
        if (err && err.message) {
            sendJson(res, 400, { error: err.message });
            return;
        }
        console.error("Checkin error:", err);
        sendJson(res, 500, { error: "签到失败，请稍后重试" });
    } finally {
        client.release();
    }
};
