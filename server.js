// 简单的后端服务：使用 POSTGRES_URL 连接 Postgres，并提供登录、注册和成绩同步接口
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

const POSTGRES_URL = process.env.POSTGRES_URL;
if (!POSTGRES_URL) {
    console.error("环境变量 POSTGRES_URL 未设置，请设置后再启动服务器。");
    process.exit(1);
}

const pool = new Pool({
    connectionString: POSTGRES_URL,
});

app.use(cors());
app.use(express.json());

async function initDb() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                score NUMERIC NOT NULL,
                difficulty TEXT NOT NULL,
                played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
    } finally {
        client.release();
    }
}

// 注册
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ error: "用户名和密码不能为空" });
    }
    if (String(username).length < 3 || String(password).length < 3) {
        return res.status(400).json({ error: "用户名和密码长度至少为 3 位" });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
            [String(username), String(password)]
        );
        const user = result.rows[0];
        res.json({ user });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({ error: "该用户名已被注册" });
        }
        console.error("Register error:", err);
        res.status(500).json({ error: "注册失败，请稍后重试" });
    } finally {
        client.release();
    }
});

// 登录
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ error: "用户名和密码不能为空" });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT id, username, password_hash FROM users WHERE username = $1",
            [String(username)]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "用户名或密码错误" });
        }
        const user = result.rows[0];
        if (user.password_hash !== String(password)) {
            return res.status(401).json({ error: "用户名或密码错误" });
        }
        res.json({ user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "登录失败，请稍后重试" });
    } finally {
        client.release();
    }
});

// 获取指定用户的成绩列表
app.get("/api/scores", async (req, res) => {
    const userId = Number(req.query.userId);
    if (!userId || Number.isNaN(userId)) {
        return res.status(400).json({ error: "缺少或非法的 userId" });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT score, difficulty, EXTRACT(EPOCH FROM played_at) * 1000 AS timestamp FROM scores WHERE user_id = $1 ORDER BY played_at DESC LIMIT 100",
            [userId]
        );
        res.json({ records: result.rows });
    } catch (err) {
        console.error("Get scores error:", err);
        res.status(500).json({ error: "获取成绩失败，请稍后重试" });
    } finally {
        client.release();
    }
});

// 新增一条成绩
app.post("/api/scores", async (req, res) => {
    const { userId, score, difficulty, timestamp } = req.body || {};
    const uid = Number(userId);
    const s = Number(score);

    if (!uid || Number.isNaN(uid)) {
        return res.status(400).json({ error: "缺少或非法的 userId" });
    }
    if (Number.isNaN(s)) {
        return res.status(400).json({ error: "非法的成绩值" });
    }
    if (!difficulty) {
        return res.status(400).json({ error: "缺少难度信息" });
    }

    const ts = timestamp ? new Date(Number(timestamp)) : new Date();
    if (Number.isNaN(ts.getTime())) {
        return res.status(400).json({ error: "非法的时间戳" });
    }

    const client = await pool.connect();
    try {
        await client.query(
            "INSERT INTO scores (user_id, score, difficulty, played_at) VALUES ($1, $2, $3, $4)",
            [uid, s, String(difficulty), ts]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error("Insert score error:", err);
        res.status(500).json({ error: "保存成绩失败，请稍后重试" });
    } finally {
        client.release();
    }
});

// 简单健康检查
app.get("/api/health", (req, res) => {
    res.json({ ok: true });
});

initDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error("初始化数据库失败：", err);
        process.exit(1);
    });

