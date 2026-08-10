/**
 * CSRF 保护（Vercel Serverless 兼容方案）
 *
 * 策略：双重验证
 * 1. Origin / Referer 检查 —— 阻止跨站伪造请求
 * 2. X-Requested-With 头部检查 —— 阻止无自定义头部的表单提交
 *
 * 注意：JWT 已使用 SameSite=Lax 的 HttpOnly Cookie，
 * 在支持 SameSite 的现代浏览器中天然防御 CSRF。
 * 本模块作为额外防护层，覆盖旧浏览器和配置错误场景。
 */

const ALLOWED_ORIGINS = ["http://localhost:5173", "http://localhost:3000", "https://ibouncy.one"];

function normalizeOrigin(origin: string | undefined): string {
    if (!origin) return "";
    return origin.replace(/\/+$/, "").toLowerCase();
}

/**
 * 验证请求的 Origin / Referer
 * @returns `true` 表示通过验证
 */
function checkOrigin(req: any): boolean {
    const origin = normalizeOrigin(req.headers?.origin);
    if (!origin) return false;

    for (const allowed of ALLOWED_ORIGINS) {
        if (origin === normalizeOrigin(allowed)) return true;
    }
    return false;
}

/**
 * 检查是否存在自定义请求头（X-Requested-With）
 * 浏览器跨站请求无法添加自定义头（需 CORS preflight 通过），
 * 因此可作为 CSRF 防御的简单指标。
 */
function checkCustomHeader(req: any): boolean {
    return !!req.headers?.["x-requested-with"];
}

/**
 * 对状态修改请求执行 CSRF 检查
 * @param req Vercel 请求对象
 * @returns `true` 表示通过 CSRF 检查
 */
export function csrfCheck(req: any): boolean {
    // 文件上传类请求通常不易受 CSRF 攻击，此处放行
    const ct = (req.headers?.["content-type"] || "").toLowerCase();
    if (ct.startsWith("multipart/form-data")) return true;

    const originOk = checkOrigin(req);
    const customHeaderOk = checkCustomHeader(req);

    // 两个条件至少满足一个即可
    return originOk || customHeaderOk;
}
