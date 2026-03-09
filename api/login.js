const { pool, initDb } = require("./_db");
const { signToken, setAuthCookie } = require("./_auth");
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

    const { username, password } = await parseJsonBody(req);
    if (!username || !password) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "用户名和密码不能为空" }));
        return;
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT id, username, password_hash FROM users WHERE username = $1",
            [String(username)]
        );
        if (result.rows.length === 0) {
            res.statusCode = 401;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "用户名或密码错误" }));
            return;
        }
        const user = result.rows[0];
        const ok = await bcrypt.compare(String(password), user.password_hash);
        if (!ok) {
            res.statusCode = 401;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "用户名或密码错误" }));
            return;
        }
        const token = signToken(user);
        setAuthCookie(res, token);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ user: { id: user.id, username: user.username } }));
    } catch (err) {
        console.error("Login error:", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "登录失败，请稍后重试" }));
    } finally {
        client.release();
    }
};
