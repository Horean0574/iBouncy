import type { IncomingMessage, ServerResponse } from "node:http";
import bcrypt from "bcryptjs";
import { signToken, setAuthCookie } from "../server/auth.js";
import { initDb, pool } from "../server/db.js";
import { parseJsonBody, sendJson } from "../server/http.js";

type RegisterBody = { username?: string; password?: string; nickname?: string };

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }
  await initDb();

  const { username, password, nickname } = await parseJsonBody<RegisterBody>(req);
  if (!username || !password) {
    sendJson(res, 400, { error: "用户名和密码不能为空" });
    return;
  }
  if (String(username).length < 3 || String(password).length < 6) {
    sendJson(res, 400, { error: "用户名至少 3 位，密码至少 6 位" });
    return;
  }

  const nicknameStr = nickname == null ? "" : String(nickname).trim();
  if (!nicknameStr) {
    sendJson(res, 400, { error: "昵称不能为空" });
    return;
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const client = await pool.connect();
  try {
    const result = await client.query<{ id: number; username: string; nickname: string }>(
      "INSERT INTO users (username, password_hash, nickname) VALUES ($1, $2, $3) RETURNING id, username, nickname",
      [String(username), passwordHash, nicknameStr]
    );
    const user = result.rows[0];
    const token = signToken(user);
    setAuthCookie(res, token);
    sendJson(res, 200, { user });
  } catch (err: any) {
    if (err.code === "23505") {
      sendJson(res, 409, { error: "该用户名已被注册" });
      return;
    }
    console.error("Register error:", err);
    sendJson(res, 500, { error: "注册失败，请稍后重试" });
  } finally {
    client.release();
  }
}
