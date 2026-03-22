import { PointerEvent, UI } from "leafer-game";

/** 点击后略延迟再执行业务，给网络/布局一点时间，并配合缩放动效 */
export const UI_TAP_FEEDBACK_DELAY_MS = 72;

/**
 * 绑定带「轻按压」反馈的点击：缩放动画 + 延迟执行 handler。
 * 适用于 Text / Group / Rect 等 Leafer UI（建议 around: "center" 的节点缩放更自然）。
 */
export function bindTapWithFeedback(
  ui: UI,
  handler: () => void | Promise<void>,
  options?: { delayMs?: number; scale?: number; duration?: number }
) {
  const delayMs = options?.delayMs ?? UI_TAP_FEEDBACK_DELAY_MS;
  const scale = options?.scale ?? 0.93;
  const duration = options?.duration ?? 0.16;
  let busy = false;

  const st = typeof globalThis !== "undefined" ? globalThis.setTimeout.bind(globalThis) : setTimeout;

  ui.on(PointerEvent.TAP, () => {
    if (busy) return;
    busy = true;
    st(() => {
      busy = false;
    }, delayMs + 140);

    try {
      ui.animate([{ scale }, { scale: 1 }], {
        duration,
        easing: "cubic-out"
      });
    } catch {
      /* 部分节点 animate 异常时忽略 */
    }

    st(() => {
      void Promise.resolve(handler());
    }, delayMs);
  });
}
