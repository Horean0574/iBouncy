/**
 * 快速伪随机数生成器 (Lehmer / Park-Miller MINSTD)。
 * 替代高频调用场景下的 `Math.random()`，避免 CSPRNG 开销。
 *
 * ```
 * let seed = Date.now() % 2147483647 || 1;
 * export function fastRandom(): number {
 *     seed = (seed * 16807) % 2147483647;
 *     return (seed - 1) / 2147483646;
 * }
 * ```
 *
 * 碰撞帧 10+ 次 Math.random() → ~0.01ms,
 * fastRandom 可降至 ~0.0001ms。
 */
let seed = Date.now() % 2147483647 || 1;

export function fastRandom(): number {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
}

/** 重置随机种子（调试用） */
export function reseedPRNG(newSeed: number): void {
    seed = newSeed % 2147483647 || 1;
}
