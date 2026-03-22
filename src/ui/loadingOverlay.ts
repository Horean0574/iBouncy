/**
 * 接口请求时的加载层，避免数据库等较慢时界面无反应
 */

const MIN_SHOW_MS = 300;

let showCount = 0;
let showTime = 0;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function el(id: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(id);
}

export function showLoading(): void {
  if (typeof document === "undefined") return;
  showCount++;
  if (showCount === 1) {
    showTime = Date.now();
    const elm = el("api-loading");
    if (elm) elm.classList.add("show");
  }
}

export function hideLoading(): void {
  if (typeof document === "undefined") return;
  showCount = Math.max(0, showCount - 1);
  if (showCount > 0) return;

  const doHide = () => {
    hideTimer = null;
    const elm = el("api-loading");
    if (elm) elm.classList.remove("show");
  };

  if (hideTimer) clearTimeout(hideTimer);
  const elapsed = Date.now() - showTime;
  const delay = Math.max(0, MIN_SHOW_MS - elapsed);
  if (delay > 0) {
    hideTimer = setTimeout(doHide, delay);
  } else {
    doHide();
  }
}
