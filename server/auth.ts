import type { IncomingMessage, ServerResponse } from "node:http";
import jwt, { type JwtPayload } from "jsonwebtoken";

const rawJwtSecret = process.env.JWT_SECRET;
if (!rawJwtSecret) {
  throw new Error("环境变量 JWT_SECRET 未设置，请在 Vercel 项目中配置该环境变量。");
}
const JWT_SECRET: string = rawJwtSecret;

type TokenUser = {
  id: number;
  username: string;
  nickname?: string;
};

type ParsedToken = TokenUser & JwtPayload;

export function signToken(user: TokenUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      nickname: user.nickname
    },
    JWT_SECRET,
    {
      expiresIn: "30d"
    }
  );
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(";").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split("=").map((s) => s && s.trim());
    if (!k) return acc;
    acc[k] = decodeURIComponent(v || "");
    return acc;
  }, {});
}

export function getUserFromRequest(req: IncomingMessage): ParsedToken | null {
  const cookies = parseCookies(req);
  const token = cookies.ibouncy_token;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload | string;
    if (!payload || typeof payload === "string") return null;
    return typeof payload.id === "number" ? (payload as ParsedToken) : null;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: ServerResponse, token: string): void {
  const maxAge = 30 * 24 * 60 * 60;
  const cookie = [
    `ibouncy_token=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Secure",
    `Max-Age=${maxAge}`
  ].join("; ");
  res.setHeader("Set-Cookie", cookie);
}

export function clearAuthCookie(res: ServerResponse): void {
  const cookie = ["ibouncy_token=", "Path=/", "HttpOnly", "SameSite=Lax", "Secure", "Max-Age=0"].join("; ");
  res.setHeader("Set-Cookie", cookie);
}
