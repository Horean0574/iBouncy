/**
 * 页面内弹窗，替代 window.alert / confirm / prompt
 */

function el<T extends HTMLElement>(id: string): T | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(id) as T | null;
}

let resolveAlert: (() => void) | null = null;
let resolveConfirm: ((value: boolean) => void) | null = null;
let resolvePrompt: ((value: string | null) => void) | null = null;

function ensureListeners() {
  const modal = el<HTMLDivElement>("inpage-modal");
  const input = el<HTMLInputElement>("inpage-modal-input");
  if (!modal || modal.dataset.bound) return;
  modal.dataset.bound = "1";

  modal.addEventListener("click", (e) => {
    if (e.target === modal) hide();
  });

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        (el("inpage-modal-btn-ok") as HTMLButtonElement)?.click();
      }
      if (e.key === "Escape") {
        (el("inpage-modal-btn-cancel") as HTMLButtonElement)?.click();
      }
    });
  }
}

function hide() {
  const modal = el<HTMLDivElement>("inpage-modal");
  const inputWrap = el<HTMLDivElement>("inpage-modal-input-wrap");
  const input = el<HTMLInputElement>("inpage-modal-input");
  if (modal) modal.classList.remove("show");
  if (inputWrap) inputWrap.classList.remove("show");
  if (input) input.value = "";
}

function show(
  message: string,
  options: {
    mode: "alert" | "confirm" | "prompt";
    defaultValue?: string;
    inputType?: "text" | "password";
  }
) {
  ensureListeners();
  const modal = el<HTMLDivElement>("inpage-modal");
  const msg = el<HTMLDivElement>("inpage-modal-msg");
  const inputWrap = el<HTMLDivElement>("inpage-modal-input-wrap");
  const input = el<HTMLInputElement>("inpage-modal-input");
  const buttons = el<HTMLDivElement>("inpage-modal-buttons");
  if (!modal || !msg || !buttons) return;

  msg.textContent = message;
  if (options.mode === "prompt" && inputWrap && input) {
    inputWrap.classList.add("show");
    input.type = options.inputType ?? "text";
    input.value = options.defaultValue ?? "";
    input.focus();
  } else if (inputWrap) {
    inputWrap.classList.remove("show");
  }

  buttons.innerHTML = "";
  const primary = document.createElement("button");
  primary.className = "modal-btn modal-btn-primary";
  primary.textContent = "确定";
  primary.id = "inpage-modal-btn-ok";

  if (options.mode === "alert") {
    buttons.appendChild(primary);
    primary.onclick = () => {
      hide();
      if (resolveAlert) resolveAlert();
      resolveAlert = null;
    };
  } else {
    const cancel = document.createElement("button");
    cancel.className = "modal-btn modal-btn-secondary";
    cancel.textContent = "取消";
    cancel.id = "inpage-modal-btn-cancel";
    buttons.appendChild(cancel);
    buttons.appendChild(primary);

    cancel.onclick = () => {
      hide();
      if (resolveConfirm) resolveConfirm(false);
      if (resolvePrompt) resolvePrompt(null);
      resolveConfirm = null;
      resolvePrompt = null;
    };
    primary.onclick = () => {
      const value = options.mode === "prompt" && input ? input.value : true;
      hide();
      if (resolveConfirm) resolveConfirm(true);
      if (resolvePrompt) resolvePrompt(options.mode === "prompt" ? (value as string) : null);
      resolveConfirm = null;
      resolvePrompt = null;
    };
  }

  modal.classList.add("show");
  if (options.mode !== "prompt") primary.focus();
}

/** 仅提示，点「确定」关闭 */
export function showAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    resolveAlert = resolve;
    show(message, { mode: "alert" });
  });
}

/** 确认框，返回 true=确定 / false=取消 */
export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    resolveConfirm = resolve;
    show(message, { mode: "confirm" });
  });
}

/** 输入框，返回输入内容或 null（取消）；inputType 可选 "password" */
export function showPrompt(
  message: string,
  defaultValue?: string,
  inputType?: "text" | "password"
): Promise<string | null> {
  return new Promise((resolve) => {
    resolvePrompt = resolve;
    show(message, { mode: "prompt", defaultValue, inputType });
  });
}
