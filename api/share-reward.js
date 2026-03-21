const { pool, initDb } = require("./_db");
const { getUserFromRequest } = require("./_auth");
const { sendJson, methodNotAllowed, parseJsonBody, toDateKey } = require("./_http");
const { ensureUserProgressRow, markShareTaskProgress } = require("./_incentives");

module.exports = async (req, res) => {
    await initDb();
    const user = getUserFromRequest(req);
    if (!user) {
        sendJson(res, 401, { error: "未登录或会话已失效" });
        return;
    }
    if (req.method !== "POST") {
        methodNotAllowed(res);
        return;
    }

    const body = await parseJsonBody(req);
    const shareId = String(body.shareId || "").trim();
    if (!shareId) {
        sendJson(res, 400, { error: "缺少 shareId" });
        return;
    }

    const dateKey = toDateKey();
    const dailyLimit = 2;
    const rewardPoints = 10;
    const client = await pool.connect();
    let inTx = false;
    try {
        await client.query("BEGIN");
        inTx = true;
        await ensureUserProgressRow(client, user.id);
        await markShareTaskProgress(client, user.id, dateKey);

        const countRes = await client.query(
            `
            SELECT COUNT(*)::int AS cnt
            FROM user_points_ledger
            WHERE user_id = $1
              AND source = 'share'
              AND ref_type = 'share_daily'
              AND ref_id LIKE $2
            `,
            [user.id, `${dateKey}:%`]
        );
        const used = Number(countRes.rows[0]?.cnt || 0);
        if (used >= dailyLimit) {
            await client.query("COMMIT");
            inTx = false;
            sendJson(res, 200, { ok: true, rewarded: false, reason: "daily_limit_reached" });
            return;
        }

        const refId = `${dateKey}:${shareId}`;
        const insertRes = await client.query(
            `
            INSERT INTO user_points_ledger (user_id, source, delta, ref_type, ref_id)
            VALUES ($1, 'share', $2, 'share_daily', $3)
            ON CONFLICT (user_id, source, ref_type, ref_id) DO NOTHING
            RETURNING id
            `,
            [user.id, rewardPoints, refId]
        );

        if (insertRes.rows.length > 0) {
            await client.query(
                `
                UPDATE user_progress
                SET points = points + $2,
                    updated_at = NOW()
                WHERE user_id = $1
                `,
                [user.id, rewardPoints]
            );
        }

        await client.query("COMMIT");
        inTx = false;
        sendJson(res, 200, {
            ok: true,
            rewarded: insertRes.rows.length > 0,
            rewardPoints: insertRes.rows.length > 0 ? rewardPoints : 0,
        });
    } catch (err) {
        if (inTx) await client.query("ROLLBACK");
        console.error("Share reward error:", err);
        sendJson(res, 500, { error: "分享奖励发放失败，请稍后重试" });
    } finally {
        client.release();
    }
};
