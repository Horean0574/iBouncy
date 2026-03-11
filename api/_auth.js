const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("环境变量 JWT_SECRET 未设置，请在 Vercel 项目中配置该环境变量。");
}

function signToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
        },
        JWT_SECRET,
        {
            expiresIn: "30d",
        }
    );
}

function parseCookies(req) {
    const header = req.headers.cookie;
    if (!header) return {};
    return header.split(";").reduce((acc, part) => {
        const [k, v] = part.split("=").map((s) => s && s.trim());
        if (!k) return acc;
        acc[k] = decodeURIComponent(v || "");
        return acc;
    }, {});
}

function getUserFromRequest(req) {
    const cookies = parseCookies(req);
    const token = cookies.ibouncy_token;
    if (!token) return null;
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        return payload && typeof payload.id === "number" ? payload : null;
    } catch {
        return null;
    }
}

function setAuthCookie(res, token) {
    const maxAge = 30 * 24 * 60 * 60; // 30 days
    const cookie = [
        `ibouncy_token=${encodeURIComponent(token)}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Secure",
        `Max-Age=${maxAge}`,
    ].join("; ");
    res.setHeader("Set-Cookie", cookie);
}

function clearAuthCookie(res) {
    const cookie = [
        "ibouncy_token=",
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Secure",
        "Max-Age=0",
    ].join("; ");
    res.setHeader("Set-Cookie", cookie);
}

module.exports = {
    signToken,
    getUserFromRequest,
    setAuthCookie,
    clearAuthCookie,
};

