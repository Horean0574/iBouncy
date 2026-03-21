import type { IncomingMessage, ServerResponse } from "node:http";
import bcrypt from "bcryptjs";
import { getUserFromRequest } from "../server/auth";
import { initDb, pool } from "../server/db";
import { parseJsonBody, sendJson } from "../server/http";

type ChangePwdBody = { oldPassword?: string; newPassword?: string };

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method Not Allowed" });
  await initDb();
  const authUser = getUserFromRequest(req);
  if (!authUser) return sendJson(res, 401, { error: "未登录，无法修改密码" });

  const { oldPassword, newPassword } = await parseJsonBody<ChangePwdBody>(req);
  if (!oldPassword || !newPassword) return sendJson(res, 400, { error: "原密码和新密码不能为空" });
  if (String(newPassword).length < 6) return sendJson(res, 400, { error: "新密码至少 6 位" });

  const client = await pool.connect();
  try {
    const result = await client.query<{ id: number; password_hash: string }>("SELECT id, password_hash FROM users WHERE id = $1", [authUser.id]);
    if (result.rows.length === 0) return sendJson(res, 404, { error: "用户不存在" });
    const user = result.rows[0];
    const ok = await bcrypt.compare(String(oldPassword), user.password_hash);
    if (!ok) return sendJson(res, 401, { error: "原密码不正确" });
    const newHash = await bcrypt.hash(String(newPassword), 10);
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, authUser.id]);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error("Change password error:", err);
    sendJson(res, 500, { error: "修改密码失败，请稍后重试" });
  } finally {
    client.release();
  }
}
