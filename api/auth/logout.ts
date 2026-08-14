import { ok, methodNotAllowed, serverError } from "../_lib/response.js";
import { buildLogoutCookie } from "../_lib/auth.js";

export default async function handler(req: any, res: any) {
    if (req.method !== "POST") return methodNotAllowed(res, "POST");
    try {
        const cookie = buildLogoutCookie();
        return ok(res, { loggedOut: true }, { "Set-Cookie": cookie });
    } catch (e) {
        return serverError(res, e);
    }
}
