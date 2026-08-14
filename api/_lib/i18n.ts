type Locale = "zh" | "en";

const messages: Record<Locale, Record<string, string>> = {
    zh: {
        csrfFailed: "CSRF 验证失败",
        requireLogin: "请先登录",
        requireUsernameOrEmail: "请输入用户名或邮箱",
        inputTooLong: "输入过长",
        requirePassword: "请输入密码",
        passwordTooLong: "密码不能超过 128 位",
        invalidEmail: "邮箱格式不正确",
        invalidUsernameLogin: "用户名须为 3–20 位小写字母、数字或下划线，或使用邮箱登录",
        invalidCredentials: "用户名/邮箱或密码不正确",
        invalidUsernameFormat: "用户名为 3–20 位小写字母、数字或下划线",
        emailTooLong: "邮箱地址过长",
        passwordTooShort: "密码至少 6 位",
        invalidVerifyCode: "验证码为 6 位数字",
        verifyCodeInvalid: "验证码无效或已过期",
        registerNoReturn: "注册后未返回用户行",
        emailRegistered: "该邮箱已注册",
        usernameTaken: "该用户名已被占用",
        emailOrUsernameExists: "该邮箱或用户名已存在",
        scoreMustBeNumber: "score 必须是数字",
        scoreMustBePositive: "score 不能为负数",
        scoreOutOfRange: "score 超出合理范围",
        clientIdTooLong: "clientId 太长",
        saveScoreFailed: "保存分数失败",
        tooFrequent: "操作过于频繁，请稍后再试",
        tooManyRequests: "请求过于频繁，请稍后再试",
        smtpNotConfigured: "SMTP 邮件服务未配置，请联系管理员",
        defaultPlayer: "玩家#",
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
    en: {
        csrfFailed: "CSRF verification failed",
        requireLogin: "Please login first",
        requireUsernameOrEmail: "Please enter your username or email",
        inputTooLong: "Input too long",
        requirePassword: "Please enter your password",
        passwordTooLong: "Password cannot exceed 128 characters",
        invalidEmail: "Invalid email format",
        invalidUsernameLogin: "Username must be 3–20 lowercase letters, digits, or underscores, or use email to login",
        invalidCredentials: "Incorrect username/email or password",
        invalidUsernameFormat: "Username must be 3–20 lowercase letters, digits, or underscores",
        emailTooLong: "Email address too long",
        passwordTooShort: "Password must be at least 6 characters",
        invalidVerifyCode: "Verification code must be 6 digits",
        verifyCodeInvalid: "Invalid or expired verification code",
        registerNoReturn: "No user row returned after registration",
        emailRegistered: "This email is already registered",
        usernameTaken: "This username is already taken",
        emailOrUsernameExists: "This email or username already exists",
        scoreMustBeNumber: "score must be a number",
        scoreMustBePositive: "score must not be negative",
        scoreOutOfRange: "score is out of reasonable range",
        clientIdTooLong: "clientId too long",
        saveScoreFailed: "Failed to save score",
        tooFrequent: "Too many requests. Please try again later.",
        tooManyRequests: "Too many requests. Please try again later.",
        smtpNotConfigured: "SMTP mail service is not configured. Please contact the administrator.",
        defaultPlayer: "Player#",
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
};

export function getLocale(req: any): Locale {
    try {
        const header = req.headers["accept-language"] || "";
        if (typeof header === "string" && header.includes("zh")) return "zh";
    } catch {
        /* ignore */
    }
    return "en";
}

export function t(req: any, key: keyof typeof messages.zh, ...args: (string | number)[]): string {
    const locale = getLocale(req);
    let text = messages[locale]?.[key] || messages.en[key] || key;
    for (let i = 0; i < args.length; i++) {
        text = text.replace(`{${i}}`, String(args[i]));
    }
    return text;
}
