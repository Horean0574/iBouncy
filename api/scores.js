const { pool, initDb } = require("./_db");
const { getUserFromRequest } = require("./_auth");

async function parseJsonBody(req) {
    return new Promise((resolve) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", () => {
            try {
                resolve(JSON.parse(body || "{}"));
            } catch {
                resolve({});
            }
        });
    });
}

module.exports = async (req, res) => {
    await initDb();

    const user = getUserFromRequest(req);
    if (!user) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "未登录或会话已失效" }));
        return;
    }

    if (req.method === "GET") {
        const client = await pool.connect();
        try {
            const result = await client.query(
                "SELECT score, difficulty, EXTRACT(EPOCH FROM played_at) * 1000 AS timestamp FROM scores WHERE user_id = $1 ORDER BY played_at DESC LIMIT 100",
                [user.id]
            );
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ records: result.rows }));
        } catch (err) {
            console.error("Get scores error:", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "获取成绩失败，请稍后重试" }));
        } finally {
            client.release();
        }
        return;
    }

    if (req.method === "POST") {
        const { score, difficulty, timestamp } = await parseJsonBody(req);
        const s = Number(score);

        if (Number.isNaN(s)) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "非法的成绩值" }));
            return;
        }
        if (!difficulty) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "缺少难度信息" }));
            return;
        }

        const ts = timestamp ? new Date(Number(timestamp)) : new Date();
        if (Number.isNaN(ts.getTime())) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "非法的时间戳" }));
            return;
        }

        const client = await pool.connect();
        try {
            await client.query(
                "INSERT INTO scores (user_id, score, difficulty, played_at) VALUES ($1, $2, $3, $4)",
                [user.id, s, String(difficulty), ts]
            );
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ ok: true }));
        } catch (err) {
            console.error("Insert score error:", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "保存成绩失败，请稍后重试" }));
        } finally {
            client.release();
        }
        return;
    }

    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Method Not Allowed" }));
};

