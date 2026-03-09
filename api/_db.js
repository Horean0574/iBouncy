const { Pool } = require("pg");

const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
    throw new Error("环境变量 POSTGRES_URL 未设置，请在 Vercel 项目中配置该环境变量。");
}

const pool = new Pool({
    connectionString: POSTGRES_URL,
});

let inited = false;

async function initDb() {
    if (inited) return;
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
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS scores_unique_idx
            ON scores(user_id, difficulty, score, played_at);
        `);
        inited = true;
    } finally {
        client.release();
    }
}

module.exports = { pool, initDb };

