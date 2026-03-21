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
        res.end(JSON.stringify({ error: "未登录，无法修改密码" }));
        return;
    }

    const { oldPassword, newPassword } = await parseJsonBody(req);
    if (!oldPassword || !newPassword) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "原密码和新密码不能为空" }));
        return;
    }
    if (String(newPassword).length < 6) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "新密码至少 6 位" }));
        return;
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT id, password_hash FROM users WHERE id = $1",
            [authUser.id]
        );
        if (result.rows.length === 0) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "用户不存在" }));
            return;
        }
        const user = result.rows[0];
        const ok = await bcrypt.compare(String(oldPassword), user.password_hash);
        if (!ok) {
            res.statusCode = 401;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "原密码不正确" }));
            return;
        }

        const newHash = await bcrypt.hash(String(newPassword), 10);
        await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
            newHash,
            authUser.id,
        ]);

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ ok: true }));
    } catch (err) {
        console.error("Change password error:", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "修改密码失败，请稍后重试" }));
    } finally {
        client.release();
    }
};

