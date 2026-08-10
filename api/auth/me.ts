import { ok, methodNotAllowed, serverError } from "../_lib/response.js";
import { getUserFromRequest } from "../_lib/auth.js";
import { getSql, ensureSchema, firstSqlRow } from "../_lib/db.js";
import { toUserPayload, type UserRow } from "../_lib/user.js";

export default async function handler(req: any, res: any) {
    if (req.method !== "GET") return methodNotAllowed(res, "GET");
    try {
        const jwtUser = getUserFromRequest(req);
        if (!jwtUser) return ok(res, { user: null });

        const sql = getSql();
        await ensureSchema(sql);
        const rows = await sql`
            SELECT id, email, username, nickname FROM users WHERE id = ${jwtUser.userId} LIMIT 1
        `;
        const row = firstSqlRow<UserRow>(rows);
        if (!row) return ok(res, { user: null });

        return ok(res, { user: toUserPayload(row) });
    } catch (e) {
        return serverError(res, e);
    }
}
