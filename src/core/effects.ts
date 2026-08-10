/**
 * 性能降级开关：
 * 当连续低 FPS 时，临时关闭部分视觉特效（拖尾 / 得分提示）以优先保证物理与碰撞逻辑。
 */
export let effectsEnabled = true;
export function setEffectsEnabled(v: boolean): void {
    effectsEnabled = v;
}
