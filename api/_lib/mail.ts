/**
 * 邮件发送模块。
 * 使用 nodemailer，从环境变量读取 SMTP 配置。
 *
 * 需要的环境变量：
 *   SMTP_HOST  - SMTP 服务器地址
 *   SMTP_PORT  - SMTP 端口（默认 587）
 *   SMTP_USER  - SMTP 用户名
 *   SMTP_PASS  - SMTP 密码
 *   SMTP_FROM  - 发件人地址（可选，默认同 SMTP_USER）
 */
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const mailMessages = {
    en: {
        mailVerifySubject: "iBouncy - Verification Code",
        mailVerifyTitle: "iBouncy Email Verification",
        mailVerifyBody: "You are registering an iBouncy account. Here is your verification code:",
        mailVerifyExpiry: "This code is valid for 10 minutes. Do not share it with anyone.",
        mailAutoSent: "This email was sent automatically. Please do not reply.",
        mailResetSubject: "iBouncy - Password Reset Code",
        mailResetTitle: "iBouncy Password Reset",
        mailResetBody: "You are requesting a password reset for your iBouncy account. Here is your verification code:",
        mailResetExpiry: "This code is valid for 10 minutes. If you did not request this, please ignore this email.",
    },
    zh: {
        mailVerifySubject: "iBouncy — 邮箱验证码",
        mailVerifyTitle: "iBouncy 邮箱验证",
        mailVerifyBody: "您正在注册 iBouncy 账号，以下是您的验证码：",
        mailVerifyExpiry: "验证码 10 分钟内有效，请勿转发给他人。",
        mailAutoSent: "此邮件由系统自动发送，请勿回复。",
        mailResetSubject: "iBouncy — 密码重置验证码",
        mailResetTitle: "iBouncy 密码重置",
        mailResetBody: "您正在请求重置 iBouncy 账号密码，以下是您的验证码：",
        mailResetExpiry: "验证码 10 分钟内有效，如非本人操作请忽略此邮件。",
    },
};

function detectLocale(req?: any): "zh" | "en" {
    try {
        const header = req?.headers?.["accept-language"] || "";
        if (typeof header === "string" && header.includes("zh")) return "zh";
    } catch {
        /* ignore */
    }
    return "en";
}

function m(req: any | undefined, key: keyof typeof mailMessages.en): string {
    const locale = detectLocale(req);
    return mailMessages[locale][key];
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        const err: any = new Error("SMTP not configured (missing SMTP_HOST / SMTP_USER / SMTP_PASS)");
        err.code = "MISSING_SMTP_CONFIG";
        throw err;
    }

    transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });

    return transporter;
}

export function smtpConfigured(): boolean {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
    const t = getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "";
    await t.sendMail({ from, to, subject, html });
}

/**
 * 发送邮箱验证码。
 * @param to 收件人邮箱
 * @param code 6 位数字验证码
 */
export async function sendVerificationCode(to: string, code: string, req?: any): Promise<void> {
    const subject = m(req, "mailVerifySubject");
    const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #20A8D7;">${m(req, "mailVerifyTitle")}</h2>
            <p>${m(req, "mailVerifyBody")}</p>
            <div style="
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #20A8D7;
                background: #F0F9FF;
                padding: 16px 24px;
                border-radius: 8px;
                text-align: center;
                margin: 16px 0;
            ">${code}</div>
            <p style="color: #777;">${m(req, "mailVerifyExpiry")}</p>
            <hr style="border: none; border-top: 1px solid #EEE; margin: 24px 0;">
            <p style="color: #AAA; font-size: 12px;">${m(req, "mailAutoSent")}</p>
        </div>
    `;
    await sendMail(to, subject, html);
}

/**
 * 发送密码重置验证码。
 * @param to 收件人邮箱
 * @param code 6 位数字验证码
 */
export async function sendPasswordResetCode(to: string, code: string, req?: any): Promise<void> {
    const subject = m(req, "mailResetSubject");
    const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #20A8D7;">${m(req, "mailResetTitle")}</h2>
            <p>${m(req, "mailResetBody")}</p>
            <div style="
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #E85B5B;
                background: #FFF5F5;
                padding: 16px 24px;
                border-radius: 8px;
                text-align: center;
                margin: 16px 0;
            ">${code}</div>
            <p style="color: #777;">${m(req, "mailResetExpiry")}</p>
            <hr style="border: none; border-top: 1px solid #EEE; margin: 24px 0;">
            <p style="color: #AAA; font-size: 12px;">${m(req, "mailAutoSent")}</p>
        </div>
    `;
    await sendMail(to, subject, html);
}
