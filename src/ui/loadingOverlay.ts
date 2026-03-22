/**
 * 接口请求加载层：进度条、预估时间、失败原因与重试
 */

const MIN_SHOW_MS = 300;

let showCount = 0;
let showTime = 0;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let progressTimer: ReturnType<typeof setInterval> | null = null;
let indeterminateSwitchTimer: ReturnType<typeof setTimeout> | null = null;

function el<T extends HTMLElement>(id: string): T | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(id) as T | null;
}

function stopProgressSimulation() {
  if (indeterminateSwitchTimer) {
    clearTimeout(indeterminateSwitchTimer);
    indeterminateSwitchTimer = null;
  }
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function resetWorkingUI() {
  const working = el("api-loading-working");
  const errPanel = el("api-loading-error");
  const fill = el<HTMLDivElement>("api-loading-bar-fill");
  if (working) working.classList.remove("hidden");
  if (errPanel) errPanel.classList.remove("visible");
  if (fill) {
    fill.classList.add("indeterminate");
    fill.classList.remove("done");
    fill.style.width = "0%";
  }
}

function startProgressSimulation() {
  stopProgressSimulation();
  const fill = el<HTMLDivElement>("api-loading-bar-fill");
  if (!fill) return;
  fill.classList.add("indeterminate");
  fill.classList.remove("done");
  fill.style.width = "0%";

  indeterminateSwitchTimer = setTimeout(() => {
    indeterminateSwitchTimer = null;
    fill.classList.remove("indeterminate");
    let pct = 8;
    fill.style.width = `${pct}%`;
    progressTimer = setInterval(() => {
      pct = Math.min(88, pct + Math.random() * 10 + 3);
      fill.style.width = `${pct}%`;
    }, 450);
  }, 700);
}

/** 将异常转为用户可读说明 */
export function formatApiLoadError(error: unknown): string {
  if (error instanceof TypeError) {
    return "网络连接异常，无法访问服务器。请检查网络、VPN 或防火墙设置后重试。";
  }
  const s = error instanceof Error ? error.message : String(error);
  const low = s.toLowerCase();
  if (low.includes("failed to fetch") || low.includes("networkerror") || low.includes("load failed")) {
    return "网络连接异常，无法访问服务器。请检查网络、VPN 或防火墙设置后重试。";
  }
  if (low.includes("aborted") || low.includes("abort")) {
    return "请求已取消。请重试或刷新页面。";
  }
  if (s.includes("401") || s.includes("未登录") || s.includes("会话")) {
    return "登录状态已失效，请重新登录后再试。";
  }
  if (s.includes("403")) {
    return "没有权限执行此操作。";
  }
  if (s.includes("404")) {
    return "请求的资源不存在，可能是接口未部署或路径错误。";
  }
  if (s.includes("500") || s.includes("502") || s.includes("503")) {
    return "服务器暂时无法处理请求。请稍后重试，或刷新页面后再试。";
  }
  return s || "请求失败，原因未知。";
}

export function showLoading(): void {
  if (typeof document === "undefined") return;
  showCount++;
  if (showCount === 1) {
    showTime = Date.now();
    resetWorkingUI();
    const hint = el("api-loading-hint");
    const eta = el("api-loading-eta");
    if (hint) hint.textContent = "正在连接服务器并处理请求…";
    if (eta)
      eta.textContent =
        "预计约 3～8 秒内完成（视网络与服务器响应速度而定）。若超过 30 秒仍无结果，可尝试重试或刷新页面。";
    const root = el("api-loading");
    if (root) root.classList.add("show");
    startProgressSimulation();
  }
}

/** 请求成功：进度拉满后关闭 */
export function hideLoadingSuccess(): void {
  if (typeof document === "undefined") return;
  showCount = Math.max(0, showCount - 1);
  if (showCount > 0) return;

  stopProgressSimulation();
  const fill = el<HTMLDivElement>("api-loading-bar-fill");
  if (fill) {
    fill.classList.remove("indeterminate");
    fill.classList.add("done");
    fill.style.width = "100%";
  }

  const elapsed = Date.now() - showTime;
  const delay = Math.max(260, MIN_SHOW_MS - elapsed);
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    hideTimer = null;
    el("api-loading")?.classList.remove("show");
    resetWorkingUI();
  }, delay);
}

/** 强制关闭（一般不用） */
export function hideLoadingImmediate(): void {
  showCount = 0;
  stopProgressSimulation();
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = null;
  el("api-loading")?.classList.remove("show");
  resetWorkingUI();
  el("api-loading-error")?.classList.remove("visible");
}

/**
 * 显示失败面板，等待用户「重试」或「关闭」
 * @returns true = 重试；false = 关闭
 */
export function showLoadFailureAndWait(error: unknown): Promise<boolean> {
  return new Promise((resolve) => {
    stopProgressSimulation();
    const fill = el<HTMLDivElement>("api-loading-bar-fill");
    if (fill) {
      fill.classList.remove("indeterminate", "done");
      fill.style.width = "0%";
    }
    el("api-loading-working")?.classList.add("hidden");
    el("api-loading-error")?.classList.add("visible");
    const msg = el("api-loading-error-msg");
    if (msg) msg.textContent = formatApiLoadError(error);

    const retryBtn = el("api-loading-retry");
    const dismissBtn = el("api-loading-dismiss");

    const cleanup = (wantRetry: boolean) => {
      retryBtn?.removeEventListener("click", onRetry);
      dismissBtn?.removeEventListener("click", onDismiss);
      el("api-loading-error")?.classList.remove("visible");
      if (wantRetry) {
        resetWorkingUI();
        startProgressSimulation();
      } else {
        showCount = Math.max(0, showCount - 1);
        if (showCount === 0) {
          el("api-loading")?.classList.remove("show");
          resetWorkingUI();
        } else {
          resetWorkingUI();
          startProgressSimulation();
        }
      }
      resolve(wantRetry);
    };

    const onRetry = () => cleanup(true);
    const onDismiss = () => cleanup(false);

    retryBtn?.addEventListener("click", onRetry, { once: true });
    dismissBtn?.addEventListener("click", onDismiss, { once: true });
  });
}

/** @deprecated 使用 hideLoadingSuccess；保留别名避免遗漏引用 */
export function hideLoading(): void {
  hideLoadingSuccess();
}
