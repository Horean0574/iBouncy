import type { IncomingMessage, ServerResponse } from "node:http";
import bcrypt from "bcryptjs";
import { signToken, setAuthCookie } from "../server/auth.js";
import { initDb, pool } from "../server/db.js";
import { parseJsonBody, sendJson } from "../server/http.js";

type LoginBody = { username?: string; password?: string };

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  await initDb();
  const { username, password } = await parseJsonBody<LoginBody>(req);
  if (!username || !password) {
    sendJson(res, 400, { error: "用户名和密码不能为空" });
    return;
  }

  const client = await pool.connect();
  try {
    const result = await client.query<{ id: number; username: string; password_hash: string }>(
      "SELECT id, username, password_hash FROM users WHERE username = $1",
      [String(username)]
    );
    if (result.rows.length === 0) {
      sendJson(res, 401, { error: "用户名或密码错误" });
      return;
    }
    const user = result.rows[0];
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      sendJson(res, 401, { error: "用户名或密码错误" });
      return;
    }
    const token = signToken(user);
    setAuthCookie(res, token);
    sendJson(res, 200, { user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error("Login error:", err);
    sendJson(res, 500, { error: "登录失败，请稍后重试" });
  } finally {
    client.release();
  }
}
