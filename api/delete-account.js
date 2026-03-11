const { pool, initDb } = require("./_db");
const { getUserFromRequest, clearAuthCookie } = require("./_auth");

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
        res.end(JSON.stringify({ error: "未登录，无法注销账号" }));
        return;
    }

    const client = await pool.connect();
    try {
        await client.query("DELETE FROM users WHERE id = $1", [authUser.id]);
        clearAuthCookie(res);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ ok: true }));
    } catch (err) {
        console.error("Delete account error:", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "注销账号失败，请稍后重试" }));
    } finally {
        client.release();
    }
};

