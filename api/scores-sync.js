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

    if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "Method Not Allowed" }));
        return;
    }

    const { records } = await parseJsonBody(req);
    if (!Array.isArray(records)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "records 字段必须是数组" }));
        return;
    }

    const client = await pool.connect();
    try {
        for (const r of records) {
            const s = Number(r.score);
            const difficulty = r.difficulty;
            let ts =
                typeof r.timestamp === "number"
                    ? new Date(r.timestamp)
                    : new Date(r.timestamp);
            if (
                Number.isNaN(s) ||
                !difficulty ||
                Number.isNaN(ts.getTime())
            ) {
                continue;
            }
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
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ records: result.rows }));
    } catch (err) {
        console.error("Scores sync error:", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "同步成绩失败，请稍后重试" }));
    } finally {
        client.release();
    }
};

