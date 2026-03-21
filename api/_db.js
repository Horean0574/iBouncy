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
        // 确保存在昵称字段（旧表兼容）
        await client.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS nickname TEXT;
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                score NUMERIC NOT NULL,
                difficulty TEXT NOT NULL,
                duration_sec INTEGER NOT NULL DEFAULT 0,
                played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        await client.query(`
            ALTER TABLE scores
            ADD COLUMN IF NOT EXISTS duration_sec INTEGER NOT NULL DEFAULT 0;
        `);
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS scores_unique_idx
            ON scores(user_id, difficulty, score, played_at);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS scores_played_at_score_idx
            ON scores(played_at DESC, score DESC);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS scores_user_played_at_idx
            ON scores(user_id, played_at DESC);
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS friendships (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                friend_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status TEXT NOT NULL DEFAULT 'accepted',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (user_id, friend_user_id)
            );
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS friendships_user_status_idx
            ON friendships(user_id, status);
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_progress (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                total_score NUMERIC NOT NULL DEFAULT 0,
                total_play_time_sec BIGINT NOT NULL DEFAULT 0,
                total_games INTEGER NOT NULL DEFAULT 0,
                total_xp BIGINT NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                points BIGINT NOT NULL DEFAULT 0,
                current_checkin_streak INTEGER NOT NULL DEFAULT 0,
                last_checkin_date DATE,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_daily_tasks (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                task_date DATE NOT NULL,
                task_type TEXT NOT NULL,
                title TEXT NOT NULL,
                target INTEGER NOT NULL,
                progress INTEGER NOT NULL DEFAULT 0,
                reward_points INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                claimed_at TIMESTAMPTZ,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (user_id, task_date, task_type)
            );
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS user_daily_tasks_user_date_idx
            ON user_daily_tasks(user_id, task_date);
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_points_ledger (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                source TEXT NOT NULL,
                delta INTEGER NOT NULL,
                ref_type TEXT NOT NULL,
                ref_id TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (user_id, source, ref_type, ref_id)
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_checkins (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                checkin_date DATE NOT NULL,
                is_makeup BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (user_id, checkin_date)
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_makeup_limits (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                week_key TEXT NOT NULL,
                used_count INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (user_id, week_key)
            );
        `);
        inited = true;
    } finally {
        client.release();
    }
}

module.exports = { pool, initDb };
