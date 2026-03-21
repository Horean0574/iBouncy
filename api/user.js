const { pool, initDb } = require("../server/db");
const { getUserFromRequest } = require("../server/auth");

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

    const authUser = getUserFromRequest(req);
    if (!authUser) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "未登录，无法获取用户信息" }));
        return;
    }

    const client = await pool.connect();
    try {
        if (req.method === "GET") {
            const result = await client.query(
                `
                SELECT 
                    u.id,
                    u.username,
                    COALESCE(u.nickname, '') AS nickname,
                    u.created_at,
                    COUNT(s.id) AS total_games,
                    COALESCE(MAX(s.score), NULL) AS best_score,
                    COALESCE(MAX(s.played_at), NULL) AS last_played_at
                FROM users u
                LEFT JOIN scores s ON s.user_id = u.id
                WHERE u.id = $1
                GROUP BY u.id
                `,
                [authUser.id]
            );
            if (result.rows.length === 0) {
                res.statusCode = 404;
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.end(JSON.stringify({ error: "用户不存在" }));
                return;
            }
            const row = result.rows[0];
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(
                JSON.stringify({
                    user: {
                        id: row.id,
                        username: row.username,
                        nickname: row.nickname || "",
                        createdAt: row.created_at,
                        totalGames: Number(row.total_games) || 0,
                        bestScore: row.best_score != null ? Number(row.best_score) : null,
                        lastPlayedAt: row.last_played_at,
                    },
                })
            );
            return;
        }

        if (req.method === "POST") {
            const body = await parseJsonBody(req);
            const nickname = body.nickname == null ? "" : String(body.nickname).trim();
            if (!nickname) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.end(JSON.stringify({ error: "昵称不能为空" }));
                return;
            }
            if (nickname.length > 24) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.end(JSON.stringify({ error: "昵称长度请控制在 24 个字符以内" }));
                return;
            }

            const result = await client.query(
                "UPDATE users SET nickname = $1 WHERE id = $2 RETURNING id, username, nickname, created_at",
                [nickname, authUser.id]
            );
            const user = result.rows[0];
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(
                JSON.stringify({
                    user: {
                        id: user.id,
                        username: user.username,
                        nickname: user.nickname || "",
                        createdAt: user.created_at,
                    },
                })
            );
            return;
        }

        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "Method Not Allowed" }));
    } catch (err) {
        console.error("User API error:", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "用户信息操作失败，请稍后重试" }));
    } finally {
        client.release();
    }
};

