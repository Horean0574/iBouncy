import { neon } from "@neondatabase/serverless";

export type Sql = ReturnType<typeof neon>;

/**
 * Neon `sql` 的返回类型在 TS 里是 `Record<string, any>[] | any[][] | FullQueryResults<...>` 的并集，
 * 直接用 `[0]` 会触发 strict 下的索引错误。本项目只用默认的对象行（非 arrayMode / 非 fullResults）。
 */
export function sqlRows<T extends Record<string, unknown> = Record<string, unknown>>(result: unknown): T[] {
    if (result == null) return [];
    if (Array.isArray(result)) {
        if (result.length === 0) return [];
        const head = result[0];
        if (Array.isArray(head)) return [];
        return result as T[];
    }
    if (typeof result === "object" && "rows" in result) {
        const rows = (result as { rows: unknown }).rows;
        if (!Array.isArray(rows) || rows.length === 0) return [];
        if (Array.isArray(rows[0])) return [];
        return rows as T[];
    }
    return [];
}

export function firstSqlRow<T extends Record<string, unknown> = Record<string, unknown>>(
    result: unknown,
): T | undefined {
    return sqlRows<T>(result)[0];
}

export function getSql(): Sql {
    const url = process.env.POSTGRES_URL;
    if (!url) {
        const err: any = new Error("Missing env POSTGRES_URL");
        err.code = "MISSING_POSTGRES_URL";
        throw err;
    }
    return neon(url);
}

export async function ensureSchema(sql: Sql) {
    await sql`
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `;

    await sql`
        CREATE TABLE IF NOT EXISTS scores (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            client_id TEXT,
            score INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `;

    // ---- 邮箱验证码 ----
    await sql`
        CREATE TABLE IF NOT EXISTS email_codes (
            id BIGSERIAL PRIMARY KEY,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            purpose TEXT NOT NULL DEFAULT 'verify',
            used BOOLEAN NOT NULL DEFAULT false,
            expires_at TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_email_codes_email_purpose ON email_codes(email, purpose, used, expires_at);`;

    await sql`ALTER TABLE scores ADD COLUMN IF NOT EXISTS client_id TEXT;`;
    await sql`CREATE INDEX IF NOT EXISTS idx_scores_user_created_at ON scores(user_id, created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_scores_user_score ON scores (user_id, score DESC);`;
    // 部分唯一索引会导致部分环境下 ON CONFLICT (user_id, client_id) 无法正确 upsert；改为完整唯一索引（PG 允许多行 client_id IS NULL）
    await sql`
        DO $mig$
        DECLARE
            def text;
        BEGIN
            SELECT indexdef INTO def
            FROM pg_indexes
            WHERE schemaname = 'public' AND indexname = 'uq_scores_user_client_id';
            IF def IS NOT NULL AND def ILIKE '%WHERE%' THEN
                DROP INDEX IF EXISTS uq_scores_user_client_id;
            END IF;
        END
        $mig$;
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_scores_user_client_id ON scores (user_id, client_id);`;

    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT;`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_lower ON users (LOWER(username)) WHERE username IS NOT NULL;`;
}
