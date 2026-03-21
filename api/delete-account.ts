import type { IncomingMessage, ServerResponse } from "node:http";
import { clearAuthCookie, getUserFromRequest } from "../server/auth";
import { initDb, pool } from "../server/db";
import { sendJson } from "../server/http";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }
  await initDb();

  const authUser = getUserFromRequest(req);
  if (!authUser) {
    sendJson(res, 401, { error: "未登录，无法注销账号" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("DELETE FROM users WHERE id = $1", [authUser.id]);
    clearAuthCookie(res);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error("Delete account error:", err);
    sendJson(res, 500, { error: "注销账号失败，请稍后重试" });
  } finally {
    client.release();
  }
}
