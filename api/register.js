const { pool, initDb } = require("../server/db");
const { signToken, setAuthCookie } = require("../server/auth");
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

    const { username, password, nickname } = await parseJsonBody(req);
    if (!username || !password) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "用户名和密码不能为空" }));
        return;
    }
    if (String(username).length < 3 || String(password).length < 6) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "用户名至少 3 位，密码至少 6 位" }));
        return;
    }

    const nicknameStr = nickname == null ? "" : String(nickname).trim();
    if (!nicknameStr) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "昵称不能为空" }));
        return;
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const client = await pool.connect();
    try {
        const result = await client.query(
            "INSERT INTO users (username, password_hash, nickname) VALUES ($1, $2, $3) RETURNING id, username, nickname",
            [String(username), passwordHash, nicknameStr]
        );
        const user = result.rows[0];
        const token = signToken(user);
        setAuthCookie(res, token);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ user }));
    } catch (err) {
        if (err.code === "23505") {
            res.statusCode = 409;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "该用户名已被注册" }));
            return;
        }
        console.error("Register error:", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "注册失败，请稍后重试" }));
    } finally {
        client.release();
    }
};
