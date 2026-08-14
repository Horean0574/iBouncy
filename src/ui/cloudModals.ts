/**
 * Modal renderers for the cloud UI overlay.
 *
 * Each function receives the shared {@link CloudUIContext} and a set of
 * callback helpers so it can react to state changes without importing
 * the main orchestration module.
 */
import * as cloud from "../cloud/client";
import { clearLocalScores, clearSynced, listLocalScores, pendingLocalScores } from "../cloud/localScores";
import {
    type CloudUIContext,
    type SyncLocalResult,
    el,
    fmtScore,
    fmtTime,
    sum,
    buildSparkline,
    createButtonWithLoader,
    addRippleEffect,
} from "./cloudUtils";
import { t } from "../i18n";

export interface ModalHelpers {
    renderFab: () => void;
    syncLocalToCloud: () => Promise<SyncLocalResult>;
    showSuccess: (message: string) => void;
    setError: (msg: string | null) => void;
    setBackdropOpen: (open: boolean) => void;
}

/** 发送验证码按钮（带 60 秒冷却） */
function createSendCodeButton(text: string, sendFn: () => Promise<void>, helpers: ModalHelpers): HTMLButtonElement {
    const btn = createButtonWithLoader(text, "btn");
    btn.type = "button";
    let cooldown = 0;
    let timer: ReturnType<typeof setInterval> | null = null;

    const setCooldown = (sec: number) => {
        cooldown = sec;
        if (sec > 0) {
            btn.disabled = true;
            btn.textContent = t("auth.codeResend", sec);
            if (!timer) {
                timer = setInterval(() => {
                    cooldown--;
                    if (cooldown <= 0) {
                        btn.disabled = false;
                        btn.textContent = text;
                        if (timer) {
                            clearInterval(timer);
                            timer = null;
                        }
                    } else {
                        btn.textContent = t("auth.codeResend", cooldown);
                    }
                }, 1000);
            }
        }
    };

    btn.onclick = async (e) => {
        addRippleEffect(btn, e as MouseEvent);
        if (cooldown > 0) return;
        btn.classList.add("loading");
        try {
            await sendFn();
            helpers.showSuccess("验证码已发送");
            setCooldown(60);
        } catch (err) {
            helpers.setError(err instanceof Error ? err.message : String(err));
        } finally {
            btn.classList.remove("loading");
        }
    };

    return btn;
}

export function renderAuthModal(ctx: CloudUIContext, helpers: ModalHelpers): void {
    ctx.modal = "auth";
    ctx.modalBox.className = "modal modal-auth";
    helpers.setBackdropOpen(true);
    helpers.setError(null);

    const head = el("div", "auth-head");
    const title = el("h2");
    title.textContent = t("auth.title");

    const tabs = el("div", "tabs tabs-auth");
    const tabLogin = el("button", "tab");
    const tabRegister = el("button", "tab");
    tabLogin.type = "button";
    tabRegister.type = "button";
    tabLogin.textContent = t("auth.login");
    tabRegister.textContent = t("auth.register");
    tabs.appendChild(tabLogin);
    tabs.appendChild(tabRegister);
    head.appendChild(title);
    head.appendChild(tabs);

    const fieldsWrap = el("div", "auth-fields");
    let stagger = 0;

    const fieldPwd = el("div", "field auth-stagger");
    fieldPwd.style.setProperty("--i", String(stagger++));
    const pwdLabel = el("label");
    pwdLabel.textContent = t("auth.password");
    const pwdInput = el("input") as HTMLInputElement;
    pwdInput.type = "password";
    pwdInput.placeholder = t("auth.passwordPlaceholder");
    pwdInput.autocomplete = ctx.mode === "register" ? "new-password" : "current-password";
    fieldPwd.appendChild(pwdLabel);
    fieldPwd.appendChild(pwdInput);

    const errBox = el("div", "error");

    const actions = el("div", "row auth-actions");
    const actionsLeft = el("div");
    const actionsRight = el("div");
    actionsRight.className = "auth-actions-right";

    const closeBtn = createButtonWithLoader(t("common.close"), "btn");
    closeBtn.onclick = () => helpers.setBackdropOpen(false);

    const submitBtn = createButtonWithLoader(
        ctx.mode === "register" ? t("auth.createAccount") : t("auth.login"),
        "btn primary",
    );

    const hint = el("div", "hint auth-hint");

    let firstFocus: HTMLInputElement;

    if (ctx.mode === "login") {
        const fieldId = el("div", "field auth-stagger");
        fieldId.style.setProperty("--i", "0");
        fieldPwd.style.setProperty("--i", "1");
        const idLabel = el("label");
        idLabel.textContent = t("auth.usernameOrEmail");
        const identifierInput = el("input") as HTMLInputElement;
        identifierInput.type = "text";
        identifierInput.placeholder = t("auth.usernameOrEmailPlaceholder");
        identifierInput.autocomplete = "username";
        fieldId.appendChild(idLabel);
        fieldId.appendChild(identifierInput);
        fieldsWrap.appendChild(fieldId);
        fieldsWrap.appendChild(fieldPwd);
        firstFocus = identifierInput;

        // 忘记密码链接
        const forgotLink = el("a", "forgot-link");
        forgotLink.textContent = t("auth.forgotPassword");
        forgotLink.href = "#";
        forgotLink.onclick = (e) => {
            e.preventDefault();
            ctx.mode = "register";
            ctx.modal = "forgot";
            renderForgotModal(ctx, helpers);
        };

        const doSubmit = async () => {
            if (ctx.busy) return;
            helpers.setError(null);
            const raw = identifierInput.value.trim();
            const password = pwdInput.value;
            if (!raw) return helpers.setError(t("auth.requireUsernameOrEmail"));
            if (raw.includes("@")) {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return helpers.setError(t("auth.invalidEmail"));
            } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(raw)) {
                return helpers.setError(t("auth.invalidUsername"));
            }
            if (!password || password.length < 6) return helpers.setError(t("auth.passwordTooShort"));

            ctx.busy = true;
            submitBtn.classList.add("loading");
            try {
                ctx.user = await cloud.login(raw, password);
                helpers.renderFab();
                await helpers.syncLocalToCloud();
                helpers.showSuccess(t("auth.loginSuccess"));
                helpers.setBackdropOpen(false);
            } catch (e) {
                helpers.setError(e instanceof Error ? e.message : String(e));
            } finally {
                ctx.busy = false;
                submitBtn.classList.remove("loading");
            }
        };

        submitBtn.onclick = doSubmit;
        identifierInput.addEventListener("keydown", (e) => e.key === "Enter" && doSubmit());
        pwdInput.addEventListener("keydown", (e) => e.key === "Enter" && doSubmit());

        hint.innerHTML = `
            <strong>${t("auth.tip")}</strong><br>
            ${t("auth.loginHint")}
        `;

        // 将忘记密码链接放在 hint 下方
        hint.appendChild(el("br"));
        hint.appendChild(forgotLink);
    } else {
        stagger = 0;
        const fieldUser = el("div", "field auth-stagger");
        fieldUser.style.setProperty("--i", String(stagger++));
        const userLabel = el("label");
        userLabel.textContent = t("auth.username");
        const usernameInput = el("input") as HTMLInputElement;
        usernameInput.type = "text";
        usernameInput.placeholder = t("auth.usernamePlaceholder");
        usernameInput.autocomplete = "username";
        usernameInput.spellcheck = false;
        fieldUser.appendChild(userLabel);
        fieldUser.appendChild(usernameInput);

        const fieldNick = el("div", "field auth-stagger optional-field");
        fieldNick.style.setProperty("--i", String(stagger++));
        const nickLabel = el("label");
        nickLabel.innerHTML = `${t("auth.nickname")} <span class="optional-tag">${t("auth.nicknameOptional")}</span>`;
        const nicknameInput = el("input") as HTMLInputElement;
        nicknameInput.type = "text";
        nicknameInput.placeholder = t("auth.nicknamePlaceholder");
        nicknameInput.autocomplete = "off";
        fieldNick.appendChild(nickLabel);
        fieldNick.appendChild(nicknameInput);

        const fieldEmail = el("div", "field auth-stagger");
        fieldEmail.style.setProperty("--i", String(stagger++));
        const emailLabel = el("label");
        emailLabel.textContent = t("auth.email");
        const emailInput = el("input") as HTMLInputElement;
        emailInput.type = "email";
        emailInput.placeholder = t("auth.emailPlaceholder");
        emailInput.autocomplete = "email";
        fieldEmail.appendChild(emailLabel);
        fieldEmail.appendChild(emailInput);

        // 验证码字段（邮箱验证用）
        const fieldCode = el("div", "field auth-stagger field-verify-code");
        fieldCode.style.setProperty("--i", String(stagger++));
        const codeLabel = el("label");
        codeLabel.textContent = t("auth.verifyCode");
        const codeRow = el("div", "code-input-row");
        const codeInput = el("input") as HTMLInputElement;
        codeInput.type = "text";
        codeInput.placeholder = t("auth.verifyCodePlaceholder");
        codeInput.maxLength = 6;
        codeInput.autocomplete = "one-time-code";
        codeInput.inputMode = "numeric";
        codeInput.pattern = "[0-9]*";

        const sendCodeBtn = createSendCodeButton(
            t("auth.sendVerifyCode"),
            async () => {
                const email = emailInput.value.trim();
                if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    throw new Error(t("auth.requireValidEmailFirst"));
                }
                await cloud.sendVerifyCode(email, "verify");
            },
            helpers,
        );
        sendCodeBtn.classList.add("send-code-btn");
        codeRow.appendChild(codeInput);
        codeRow.appendChild(sendCodeBtn);
        fieldCode.appendChild(codeLabel);
        fieldCode.appendChild(codeRow);

        fieldPwd.style.setProperty("--i", String(stagger++));
        fieldsWrap.appendChild(fieldUser);
        fieldsWrap.appendChild(fieldNick);
        fieldsWrap.appendChild(fieldEmail);
        fieldsWrap.appendChild(fieldCode);
        fieldsWrap.appendChild(fieldPwd);
        firstFocus = usernameInput;

        const doSubmit = async () => {
            if (ctx.busy) return;
            helpers.setError(null);
            const username = usernameInput.value.trim().toLowerCase();
            const nickname = nicknameInput.value.trim();
            const email = emailInput.value.trim();
            const password = pwdInput.value;
            const verifyCode = codeInput.value.trim();
            if (!/^[a-z0-9_]{3,20}$/.test(username)) {
                return helpers.setError(t("auth.invalidUsernameFormat"));
            }
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return helpers.setError(t("auth.invalidEmail"));
            if (verifyCode && !/^\d{6}$/.test(verifyCode)) return helpers.setError(t("auth.invalidVerifyCode"));
            if (!password || password.length < 6) return helpers.setError(t("auth.passwordTooShort"));

            ctx.busy = true;
            submitBtn.classList.add("loading");
            try {
                ctx.user = await cloud.register({
                    username,
                    nickname: nickname || undefined,
                    email,
                    password,
                    verifyCode: verifyCode || undefined,
                });
                helpers.renderFab();
                await helpers.syncLocalToCloud();
                helpers.showSuccess(t("auth.registerSuccess"));
                helpers.setBackdropOpen(false);
            } catch (e) {
                helpers.setError(e instanceof Error ? e.message : String(e));
            } finally {
                ctx.busy = false;
                submitBtn.classList.remove("loading");
            }
        };

        submitBtn.onclick = doSubmit;
        usernameInput.addEventListener("keydown", (e) => e.key === "Enter" && doSubmit());
        nicknameInput.addEventListener("keydown", (e) => e.key === "Enter" && doSubmit());
        emailInput.addEventListener("keydown", (e) => e.key === "Enter" && doSubmit());
        codeInput.addEventListener("keydown", (e) => e.key === "Enter" && doSubmit());
        pwdInput.addEventListener("keydown", (e) => e.key === "Enter" && doSubmit());

        hint.innerHTML = `
            <strong>${t("auth.registerNote")}</strong><br>
            ${t("auth.registerHint")}
        `;
    }

    tabLogin.onclick = (e) => {
        addRippleEffect(tabLogin, e as MouseEvent);
        ctx.mode = "login";
        renderAuthModal(ctx, helpers);
    };
    tabRegister.onclick = (e) => {
        addRippleEffect(tabRegister, e as MouseEvent);
        ctx.mode = "register";
        renderAuthModal(ctx, helpers);
    };

    tabLogin.classList.toggle("active", ctx.mode === "login");
    tabRegister.classList.toggle("active", ctx.mode === "register");

    actionsLeft.appendChild(closeBtn);
    actionsRight.appendChild(submitBtn);
    actions.appendChild(actionsLeft);
    actions.appendChild(actionsRight);

    ctx.modalBox.replaceChildren(head, fieldsWrap, errBox, actions, hint);
    setTimeout(() => firstFocus.focus(), 100);
}

// ---- 忘记密码模态框 ----
export function renderForgotModal(ctx: CloudUIContext, helpers: ModalHelpers): void {
    ctx.modal = "forgot";
    ctx.modalBox.className = "modal modal-auth";
    helpers.setBackdropOpen(true);
    helpers.setError(null);

    const head = el("div", "auth-head");
    const title = el("h2");
    title.textContent = t("forgot.title");
    head.appendChild(title);

    // 返回登录链接
    const backLink = el("a", "forgot-link");
    backLink.textContent = t("forgot.backToLogin");
    backLink.href = "#";
    backLink.onclick = (e) => {
        e.preventDefault();
        ctx.mode = "login";
        renderAuthModal(ctx, helpers);
    };

    const fieldsWrap = el("div", "auth-fields");

    const fieldEmail = el("div", "field auth-stagger");
    fieldEmail.style.setProperty("--i", "0");
    const emailLabel = el("label");
    emailLabel.textContent = t("forgot.registeredEmail");
    const emailInput = el("input") as HTMLInputElement;
    emailInput.type = "email";
    emailInput.placeholder = t("forgot.emailPlaceholder");
    emailInput.autocomplete = "email";
    fieldEmail.appendChild(emailLabel);
    fieldEmail.appendChild(emailInput);

    const fieldCode = el("div", "field auth-stagger");
    fieldCode.style.setProperty("--i", "1");
    const codeLabel = el("label");
    codeLabel.textContent = t("forgot.verifyCode");
    const codeRow = el("div", "code-input-row");
    const codeInput = el("input") as HTMLInputElement;
    codeInput.type = "text";
    codeInput.placeholder = t("forgot.verifyCodePlaceholder");
    codeInput.maxLength = 6;
    codeInput.autocomplete = "one-time-code";
    codeInput.inputMode = "numeric";
    codeInput.pattern = "[0-9]*";

    const sendCodeBtn = createSendCodeButton(
        t("forgot.sendVerifyCode"),
        async () => {
            const email = emailInput.value.trim();
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new Error(t("auth.requireValidEmailFirst"));
            }
            await cloud.forgotPassword(email);
        },
        helpers,
    );
    sendCodeBtn.classList.add("send-code-btn");
    codeRow.appendChild(codeInput);
    codeRow.appendChild(sendCodeBtn);
    fieldCode.appendChild(codeLabel);
    fieldCode.appendChild(codeRow);

    const fieldNewPwd = el("div", "field auth-stagger");
    fieldNewPwd.style.setProperty("--i", "2");
    const newPwdLabel = el("label");
    newPwdLabel.textContent = t("forgot.newPassword");
    const newPwdInput = el("input") as HTMLInputElement;
    newPwdInput.type = "password";
    newPwdInput.placeholder = t("forgot.newPasswordPlaceholder");
    newPwdInput.autocomplete = "new-password";
    fieldNewPwd.appendChild(newPwdLabel);
    fieldNewPwd.appendChild(newPwdInput);

    fieldsWrap.appendChild(fieldEmail);
    fieldsWrap.appendChild(fieldCode);
    fieldsWrap.appendChild(fieldNewPwd);

    const errBox = el("div", "error");

    const actions = el("div", "row auth-actions");
    const actionsLeft = el("div");
    const actionsRight = el("div");
    actionsRight.className = "auth-actions-right";

    const closeBtn = createButtonWithLoader(t("common.close"), "btn");
    closeBtn.onclick = () => helpers.setBackdropOpen(false);

    const submitBtn = createButtonWithLoader(t("forgot.resetPassword"), "btn primary");

    const doSubmit = async () => {
        if (ctx.busy) return;
        helpers.setError(null);
        const email = emailInput.value.trim();
        const code = codeInput.value.trim();
        const password = newPwdInput.value;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return helpers.setError(t("auth.invalidEmail"));
        if (!/^\d{6}$/.test(code)) return helpers.setError(t("auth.invalidVerifyCode"));
        if (!password || password.length < 6) return helpers.setError(t("auth.passwordTooShort"));

        ctx.busy = true;
        submitBtn.classList.add("loading");
        try {
            await cloud.resetPassword(email, code, password);
            helpers.showSuccess(t("forgot.resetSuccess"));
            ctx.mode = "login";
            renderAuthModal(ctx, helpers);
        } catch (e) {
            helpers.setError(e instanceof Error ? e.message : String(e));
        } finally {
            ctx.busy = false;
            submitBtn.classList.remove("loading");
        }
    };

    submitBtn.onclick = doSubmit;
    emailInput.addEventListener("keydown", (e) => e.key === "Enter" && doSubmit());
    codeInput.addEventListener("keydown", (e) => e.key === "Enter" && doSubmit());
    newPwdInput.addEventListener("keydown", (e) => e.key === "Enter" && doSubmit());

    const hint = el("div", "hint auth-hint");
    hint.innerHTML = `
        <strong>${t("forgot.hintTitle")}</strong><br>
        ${t("forgot.hint")}
    `;
    hint.appendChild(el("br"));
    hint.appendChild(backLink);

    actionsLeft.appendChild(closeBtn);
    actionsRight.appendChild(submitBtn);
    actions.appendChild(actionsLeft);
    actions.appendChild(actionsRight);

    ctx.modalBox.replaceChildren(head, fieldsWrap, errBox, actions, hint);
    setTimeout(() => emailInput.focus(), 100);
}

export async function renderHistoryModal(ctx: CloudUIContext, helpers: ModalHelpers): Promise<void> {
    ctx.modal = "history";
    ctx.modalBox.className = "modal modal-history";
    helpers.setBackdropOpen(true);
    helpers.setError(null);

    const loadingOverlay = el("div", "modal-loading");
    const loadingRing = el("div", "modal-loading-spinner");
    loadingOverlay.appendChild(loadingRing);

    const titleRow = el("div", "row title-row history-head");
    const titleBlock = el("div", "history-title-block");
    const title = el("h2");
    title.textContent = t("history.title");
    const titleAccent = el("div", "history-title-accent");
    titleBlock.appendChild(title);
    titleBlock.appendChild(titleAccent);
    const closeBtn = createButtonWithLoader(t("history.close"), "btn");
    closeBtn.onclick = () => helpers.setBackdropOpen(false);
    titleRow.appendChild(titleBlock);
    titleRow.appendChild(closeBtn);

    const errBox = el("div", "error");
    const cards = el("div", "cards history-cards");
    const list = el("div", "list history-list");
    const actions = el("div", "row history-actions");
    const actionsLeft = el("div");
    const actionsRight = el("div");
    actionsRight.className = "history-actions-right";

    const refreshBtn = createButtonWithLoader(t("history.refresh"), "btn");
    refreshBtn.onclick = () => void load();

    const syncBtn = createButtonWithLoader(t("history.syncLocal"), "btn primary");
    syncBtn.onclick = () => void doSync();

    let clearPending = false;
    const clearBtn = createButtonWithLoader(t("history.clearRecords"), "btn danger clear-btn");
    clearBtn.onclick = () => {
        if (!clearPending) {
            clearPending = true;
            clearBtn.textContent = t("history.confirmClear");
            clearBtn.style.background = "linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.75))";
            clearBtn.style.borderBottomColor = "rgba(220, 38, 38, 0.5)";
            setTimeout(() => {
                clearPending = false;
                clearBtn.textContent = t("history.clearRecords");
                clearBtn.removeAttribute("style");
            }, 4000);
            return;
        }
        void (async () => {
            if (ctx.busy) return;
            ctx.busy = true;
            clearBtn.classList.add("loading");
            clearBtn.textContent = t("history.clearing");
            try {
                if (ctx.user) {
                    await cloud.clearScores();
                    clearLocalScores();
                    helpers.showSuccess(t("history.cloudCleared"));
                } else {
                    clearLocalScores();
                    helpers.showSuccess(t("history.localCleared"));
                }
                clearPending = false;
                clearBtn.removeAttribute("style");
                await load();
            } catch (e) {
                helpers.setError(e instanceof Error ? e.message : String(e));
                clearBtn.textContent = t("history.clearRecords");
                ctx.busy = false;
                clearBtn.classList.remove("loading");
            }
        })();
    };

    actions.appendChild(actionsLeft);
    actionsLeft.appendChild(clearBtn);
    actionsRight.appendChild(refreshBtn);
    actionsRight.appendChild(syncBtn);
    actions.appendChild(actionsRight);
    ctx.modalBox.replaceChildren(titleRow, errBox, cards, list, actions, loadingOverlay);

    const load = async () => {
        if (ctx.busy) return;
        ctx.busy = true;
        refreshBtn.classList.add("loading");
        const useOverlay = !!ctx.user;
        if (useOverlay) loadingOverlay.classList.add("show");
        cards.replaceChildren();
        list.replaceChildren();
        try {
            if (!ctx.user) {
                const local = listLocalScores();
                const games = local.length;
                const best = games ? Math.max(...local.map((r) => r.score)) : 0;
                const total = sum(local.map((r) => r.score));
                const last = games ? local[0].score : 0;

                const c1 = el("div", "card");
                const c1k = el("div", "k");
                c1k.textContent = t("history.guestTotalGames");
                const c1v = el("div", "v");
                c1v.textContent = String(games);
                c1.appendChild(c1k);
                c1.appendChild(c1v);

                const c2 = el("div", "card");
                const c2k = el("div", "k");
                c2k.textContent = t("history.guestBestScore");
                const c2v = el("div", "v");
                c2v.textContent = fmtScore(best);
                c2.appendChild(c2k);
                c2.appendChild(c2v);

                const c3 = el("div", "card wide");
                const c3k = el("div", "k");
                c3k.textContent = t("history.guestTrend");
                const c3v = el("div", "v");
                c3v.textContent = t("history.recentAndTotal", fmtScore(last), fmtScore(total));
                const sparkWrap = el("div", "spark");
                const values = (() => {
                    const m = new Map<string, number>();
                    for (const r of local) {
                        const day = r.createdAt.slice(0, 10);
                        const prev = m.get(day) ?? 0;
                        if (r.score > prev) m.set(day, r.score);
                    }
                    const today = new Date();
                    const out: number[] = [];
                    for (let i = 6; i >= 0; i--) {
                        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
                        d.setUTCDate(d.getUTCDate() - i);
                        const key = d.toISOString().slice(0, 10);
                        out.push(m.get(key) ?? 0);
                    }
                    return out;
                })();
                sparkWrap.appendChild(buildSparkline(values));
                c3.appendChild(c3k);
                c3.appendChild(c3v);
                c3.appendChild(sparkWrap);
                cards.appendChild(c1);
                cards.appendChild(c2);
                cards.appendChild(c3);

                if (local.length === 0) {
                    const empty = el("div", "hint");
                    empty.innerHTML = `
                        <strong>${t("history.noRecordsTitle")}</strong><br>
                        ${t("history.noRecordsDesc")}
                    `;
                    list.appendChild(empty);
                } else {
                    for (const r of local) {
                        const item = el("div", "item");
                        const leftCol = el("div");
                        const score = el("div", "score");
                        score.textContent = fmtScore(r.score);
                        const time = el("div", "time");
                        time.textContent = fmtTime(r.createdAt);
                        leftCol.appendChild(score);
                        leftCol.appendChild(time);
                        item.appendChild(leftCol);
                        list.appendChild(item);
                    }
                }
                return;
            }

            const [records, localPending, summary] = await Promise.all([
                cloud.listScores(20),
                Promise.resolve(pendingLocalScores()),
                cloud.summary(),
            ]);

            const s = summary.summary;
            const c1 = el("div", "card");
            const c1k = el("div", "k");
            c1k.textContent = t("history.cloudTotalGames");
            const c1v = el("div", "v");
            c1v.textContent = String(s.games);
            c1.appendChild(c1k);
            c1.appendChild(c1v);

            const c2 = el("div", "card");
            const c2k = el("div", "k");
            c2k.textContent = t("history.cloudBestScore");
            const c2v = el("div", "v");
            c2v.textContent = fmtScore(s.bestScore);
            c2.appendChild(c2k);
            c2.appendChild(c2v);

            const c3 = el("div", "card wide");
            const c3k = el("div", "k");
            c3k.textContent = t("history.cloudTrend");
            const c3v = el("div", "v");
            c3v.textContent = t("history.recentAndTotal", fmtScore(s.lastScore), fmtScore(s.totalScore));
            const sparkWrap = el("div", "spark");
            sparkWrap.appendChild(buildSparkline(summary.trend7d.map((p) => p.bestScore)));
            c3.appendChild(c3k);
            c3.appendChild(c3v);
            c3.appendChild(sparkWrap);
            cards.appendChild(c1);
            cards.appendChild(c2);
            cards.appendChild(c3);

            if (localPending.length > 0) {
                const hint = el("div", "hint");
                hint.innerHTML = `
                    <strong>${t("history.pendingSyncTitle")}</strong><br>
                    ${t("history.pendingSyncDesc", localPending.length)}
                `;
                list.appendChild(hint);
            }

            if (records.length === 0 && localPending.length === 0) {
                const empty = el("div", "hint");
                empty.innerHTML = `
                    <strong>${t("history.startGameTitle")}</strong><br>
                    ${t("history.startGameDesc")}
                `;
                list.appendChild(empty);
            } else {
                // Show local pending first with a sync badge
                for (const r of localPending) {
                    const item = el("div", "item");
                    const leftCol = el("div");
                    const score = el("div", "score");
                    score.textContent = fmtScore(r.score);
                    const time = el("div", "time");
                    time.innerHTML = `${fmtTime(r.createdAt)} <span class="sync-badge">${t("history.notSynced")}</span>`;
                    leftCol.appendChild(score);
                    leftCol.appendChild(time);
                    item.appendChild(leftCol);
                    list.appendChild(item);
                }
                for (const r of records) {
                    const item = el("div", "item");
                    const leftCol = el("div");
                    const score = el("div", "score");
                    score.textContent = fmtScore(r.score);
                    const time = el("div", "time");
                    time.textContent = fmtTime(r.createdAt);
                    leftCol.appendChild(score);
                    leftCol.appendChild(time);
                    item.appendChild(leftCol);
                    list.appendChild(item);
                }
            }
        } catch (e) {
            helpers.setError(e instanceof Error ? e.message : String(e));
        } finally {
            ctx.busy = false;
            refreshBtn.classList.remove("loading");
            if (useOverlay) loadingOverlay.classList.remove("show");
        }
    };

    const doSync = async () => {
        if (!ctx.user) return helpers.setError(t("history.loginFirst"));
        if (ctx.busy) return;
        ctx.busy = true;
        syncBtn.classList.add("loading");
        let syncOk = false;
        try {
            const r = await helpers.syncLocalToCloud();
            if (r.uploaded > 0) {
                clearSynced();
            }
            if (r.pendingAtStart === 0) {
                helpers.showSuccess(t("history.allSynced"));
                syncOk = true;
            } else if (r.uploaded === r.pendingAtStart) {
                helpers.showSuccess(r.uploaded === 1 ? t("history.syncSuccess") : t("history.syncedCount", r.uploaded));
                syncOk = true;
            } else if (r.uploaded > 0) {
                helpers.showSuccess(t("history.syncedPartial", r.uploaded));
                helpers.setError(r.lastError || t("history.syncPartialFail"));
                syncOk = true;
            } else {
                helpers.setError(r.lastError || t("history.syncFail"));
            }
        } catch (e) {
            helpers.setError(e instanceof Error ? e.message : String(e));
        } finally {
            ctx.busy = false;
            syncBtn.classList.remove("loading");
        }
        if (syncOk) await load();
    };

    await load();
}

export async function renderLeaderboardModal(ctx: CloudUIContext, helpers: ModalHelpers): Promise<void> {
    ctx.modal = "leaderboard";
    ctx.modalBox.className = "modal modal-history modal-leaderboard";
    helpers.setBackdropOpen(true);
    helpers.setError(null);

    let currentPeriod = "all";

    const loadingOverlay = el("div", "modal-loading");
    const loadingRing = el("div", "modal-loading-spinner");
    loadingOverlay.appendChild(loadingRing);

    const titleRow = el("div", "row title-row history-head");
    const titleBlock = el("div", "history-title-block");
    const title = el("h2");
    title.textContent = t("leaderboard.title");
    const titleAccent = el("div", "history-title-accent");
    titleBlock.appendChild(title);
    titleBlock.appendChild(titleAccent);
    const closeBtn = createButtonWithLoader(t("leaderboard.close"), "btn");
    closeBtn.onclick = () => helpers.setBackdropOpen(false);
    titleRow.appendChild(titleBlock);
    titleRow.appendChild(closeBtn);

    const periodTabs = el("div", "period-tabs");
    const periods: { key: string; label: string }[] = [
        { key: "all", label: t("leaderboard.all") },
        { key: "day", label: t("leaderboard.daily") },
        { key: "week", label: t("leaderboard.weekly") },
        { key: "month", label: t("leaderboard.monthly") },
    ];
    for (const p of periods) {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.className = "period-tab" + (p.key === currentPeriod ? " active" : "");
        tab.textContent = p.label;
        tab.dataset.period = p.key;
        tab.onclick = (e) => {
            addRippleEffect(tab, e as MouseEvent);
            if (p.key === currentPeriod || ctx.busy) return;
            currentPeriod = p.key;
            periodTabs.querySelectorAll(".period-tab").forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            void load();
        };
        periodTabs.appendChild(tab);
    }

    const errBox = el("div", "error");
    const list = el("div", "list history-list leaderboard-list");
    const footer = el("div", "leaderboard-footer");
    const actions = el("div", "row history-actions");
    const actionsLeft = el("div");
    const actionsRight = el("div");
    actionsRight.className = "history-actions-right";
    const refreshBtn = createButtonWithLoader(t("leaderboard.refresh"), "btn");
    refreshBtn.onclick = () => void load();
    actions.appendChild(actionsLeft);
    actionsRight.appendChild(refreshBtn);
    actions.appendChild(actionsRight);
    ctx.modalBox.replaceChildren(titleRow, periodTabs, errBox, list, footer, actions, loadingOverlay);

    const load = async () => {
        if (ctx.busy) return;
        ctx.busy = true;
        refreshBtn.classList.add("loading");
        loadingOverlay.classList.add("show");
        list.replaceChildren();
        footer.replaceChildren();
        footer.style.display = "none";
        try {
            const entries = await cloud.fetchLeaderboard(50, currentPeriod);
            if (ctx.user) {
                try {
                    const { summary: s } = await cloud.summary();
                    const hint = el("div", "hint leaderboard-my-best");
                    hint.textContent = t("leaderboard.myBest", fmtScore(s.bestScore));
                    footer.appendChild(hint);
                    footer.style.display = "";
                } catch {
                    /* Ignore summary failure; show leaderboard anyway */
                }
            }

            if (entries.length === 0) {
                const empty = el("div", "hint");
                empty.innerHTML = `<strong>${t("leaderboard.noDataTitle")}</strong><br>${t("leaderboard.noDataDesc")}`;
                list.appendChild(empty);
                return;
            }

            const selfId = ctx.user?.id;
            for (const ent of entries) {
                const item = el("div", "item item--leaderboard");
                if (selfId !== undefined && ent.userId === selfId) item.classList.add("item--self");

                const rankEl = el("div", "lb-rank");
                rankEl.textContent = String(ent.rank);

                const main = el("div", "lb-main");
                const nameEl = el("div", "lb-name");
                nameEl.textContent = ent.displayName;
                const timeEl = el("div", "time");
                timeEl.textContent = fmtTime(ent.bestAt);
                main.appendChild(nameEl);
                main.appendChild(timeEl);

                const scoreEl = el("div", "score");
                scoreEl.textContent = fmtScore(ent.bestScore);

                item.appendChild(rankEl);
                item.appendChild(main);
                item.appendChild(scoreEl);
                list.appendChild(item);
            }
        } catch (e) {
            helpers.setError(e instanceof Error ? e.message : String(e));
        } finally {
            ctx.busy = false;
            refreshBtn.classList.remove("loading");
            loadingOverlay.classList.remove("show");
        }
    };

    await load();
}
