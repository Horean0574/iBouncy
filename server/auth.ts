import type { IncomingMessage, ServerResponse } from "node:http";
import jwt, { type JwtPayload } from "jsonwebtoken";

function normalizeEnvValue(value: string | undefined): string {
  const v = String(value || "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    return v.slice(1, -1).trim();
  }
  return v;
}

function getJwtSecret(): string {
  const secret = normalizeEnvValue(process.env.JWT_SECRET);
  if (!secret) {
    throw new Error("环境变量 JWT_SECRET 未设置，请在 Vercel 项目中配置该环境变量。");
  }
  return secret;
}

type TokenUser = {
  id: number;
  username: string;
  nickname?: string;
};

type ParsedToken = TokenUser & JwtPayload;

export function signToken(user: TokenUser): string {
  const jwtSecret = getJwtSecret();
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      nickname: user.nickname
    },
    jwtSecret,
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
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload | string;
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
