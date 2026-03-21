import type { IncomingMessage, ServerResponse } from "node:http";
import bcrypt from "bcryptjs";
import { getUserFromRequest } from "../server/auth";
import { initDb, pool } from "../server/db";
import { parseJsonBody, sendJson } from "../server/http";

type VerifyBody = { password?: string };

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method Not Allowed" });
  await initDb();

  const authUser = getUserFromRequest(req);
  if (!authUser) return sendJson(res, 401, { error: "未登录" });

  const { password } = await parseJsonBody<VerifyBody>(req);
  if (!password) return sendJson(res, 400, { error: "请输入密码" });

  const client = await pool.connect();
  try {
    const result = await client.query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [authUser.id]);
    if (result.rows.length === 0) return sendJson(res, 404, { error: "用户不存在" });
    const ok = await bcrypt.compare(String(password), result.rows[0].password_hash);
    if (!ok) return sendJson(res, 401, { error: "原密码不正确" });
    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error("Verify password error:", err);
    sendJson(res, 500, { error: "验证失败，请稍后重试" });
  } finally {
    client.release();
  }
}
