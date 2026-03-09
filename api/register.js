<<<<<<< HEAD
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
    if (String(username).length < 3 || String(password).length < 6) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "用户名至少 3 位，密码至少 6 位" }));
        return;
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const client = await pool.connect();
    try {
        const result = await client.query(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
            [String(username), passwordHash]
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

=======
const { pool, initDb } = require("./_db");

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
    if (String(username).length < 3 || String(password).length < 3) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "用户名和密码长度至少为 3 位" }));
        return;
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
            [String(username), String(password)]
        );
        const user = result.rows[0];
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

>>>>>>> 7749419b9f87b4b535a6de7ad5c1daa56c67e426
