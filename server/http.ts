import type { IncomingMessage, ServerResponse } from "node:http";

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

export function sendJson(res: ServerResponse, statusCode: number, payload: JsonValue): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export function methodNotAllowed(res: ServerResponse): void {
  sendJson(res, 405, { error: "Method Not Allowed" });
}

export async function parseJsonBody<T extends JsonObject = JsonObject>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}") as T);
      } catch {
        resolve({} as T);
      }
    });
  });
}

export function toDateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}
