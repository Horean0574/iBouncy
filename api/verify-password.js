const { pool, initDb } = require("../server/db");
const { getUserFromRequest } = require("../server/auth");
const bcrypt = require("bcryptjs");

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
    if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "Method Not Allowed" }));
        return;
    }

    await initDb();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "未登录" }));
        return;
    }

    const { password } = await parseJsonBody(req);
    if (!password) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "请输入密码" }));
        return;
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT password_hash FROM users WHERE id = $1",
            [authUser.id]
        );
        if (result.rows.length === 0) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "用户不存在" }));
            return;
        }
        const ok = await bcrypt.compare(String(password), result.rows[0].password_hash);
        if (!ok) {
            res.statusCode = 401;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "原密码不正确" }));
            return;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ ok: true }));
    } catch (err) {
        console.error("Verify password error:", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "验证失败，请稍后重试" }));
    } finally {
        client.release();
    }
};
