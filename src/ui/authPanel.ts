import { login, register } from "../utils/auth";

type Mode = "login" | "register";

type AfterAuthCallback = () => void | Promise<void>;

let currentMode: Mode = "login";
let afterAuthCallback: AfterAuthCallback | null = null;

function qs<T extends HTMLElement>(id: string): T | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(id) as T | null;
}

function setMode(mode: Mode) {
  currentMode = mode;
  const panel = qs<HTMLDivElement>("auth-panel");
  if (!panel) return;
  const title = qs<HTMLDivElement>("auth-title");
  const toggle = qs<HTMLButtonElement>("auth-toggle");
  const nicknameRow = qs<HTMLDivElement>("auth-nickname-row");
  const confirmRow = qs<HTMLDivElement>("auth-confirm-row");
  const submit = qs<HTMLButtonElement>("auth-submit");

  if (title) title.textContent = mode === "login" ? "登录账号" : "注册新账号";
  if (toggle) toggle.textContent = mode === "login" ? "没有账号？去注册" : "已有账号？去登录";
  if (nicknameRow) nicknameRow.style.display = mode === "register" ? "flex" : "none";
  if (confirmRow) confirmRow.style.display = mode === "register" ? "flex" : "none";
  if (submit) submit.textContent = mode === "login" ? "登 录" : "注 册";
}

function showPanel() {
  const panel = qs<HTMLDivElement>("auth-panel");
  if (!panel) return;
  panel.style.display = "flex";
}

function hidePanel() {
  const panel = qs<HTMLDivElement>("auth-panel");
  if (!panel) return;
  panel.style.display = "none";
}

async function handleSubmit() {
  const usernameInput = qs<HTMLInputElement>("auth-username");
  const nicknameInput = qs<HTMLInputElement>("auth-nickname");
  const passwordInput = qs<HTMLInputElement>("auth-password");
  const confirmInput = qs<HTMLInputElement>("auth-confirm");

  if (!usernameInput || !passwordInput) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const nickname = nicknameInput ? nicknameInput.value.trim() : "";
  const confirmPassword = confirmInput ? confirmInput.value : "";

  if (username.length < 3) {
    window.alert("用户名至少 3 位");
    return;
  }
  if (password.length < 6) {
    window.alert("密码至少 6 位");
    return;
  }

  if (currentMode === "register") {
    if (!nickname) {
      window.alert("请填写昵称");
      return;
    }
    if (!confirmPassword) {
      window.alert("请再次输入密码进行确认");
      return;
    }
    if (password !== confirmPassword) {
      window.alert("两次输入的密码不一致");
      return;
    }
  }

  try {
    if (currentMode === "login") {
      await login(username, password);
    } else {
      await register(username, password, nickname);
    }
    hidePanel();
    if (afterAuthCallback) {
      await afterAuthCallback();
    }
  } catch (e: any) {
    window.alert(String(e?.message ?? e));
  }
}

function ensureInit() {
  if (typeof document === "undefined") return;
  const panel = qs<HTMLDivElement>("auth-panel");
  if (!panel) return;

  const closeBtn = qs<HTMLButtonElement>("auth-close");
  const toggle = qs<HTMLButtonElement>("auth-toggle");
  const submit = qs<HTMLButtonElement>("auth-submit");

  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = "1";
    closeBtn.addEventListener("click", () => hidePanel());
  }
  if (toggle && !toggle.dataset.bound) {
    toggle.dataset.bound = "1";
    toggle.addEventListener("click", () => {
      setMode(currentMode === "login" ? "register" : "login");
    });
  }
  if (submit && !submit.dataset.bound) {
    submit.dataset.bound = "1";
    submit.addEventListener("click", () => {
      void handleSubmit();
    });
  }
}

export function openAuthPanel(mode: Mode = "login", onSuccess?: AfterAuthCallback) {
  afterAuthCallback = onSuccess ?? null;
  if (typeof document === "undefined") return;
  ensureInit();
  setMode(mode);
  showPanel();
}

