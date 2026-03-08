/**
 * 渲染与性能配置：GPU 加速、画布上下文、像素比等
 * 用于 Leafer 画布与 CSS 层优化
 */
export const RenderConf = {
    /** 是否启用 GPU 合成层（CSS will-change + transform） */
    useGpuLayer: true,
    /**
     * 画布像素比。默认使用设备像素比；设为数字可封顶（如 2）以在超高 DPI 下兼顾性能
     * @type {number | 'device'}
     */
    pixelRatio: "device",
    /** 像素比上限（仅当 pixelRatio 为 'device' 时生效，避免 3x 屏过重） */
    pixelRatioCap: 2,
    /** 是否平滑绘制（平滑可能略模糊，关闭可更锐利且略快） */
    smooth: false,
    /**
     * 传给 getContext('2d', contextSettings) 的选项
     * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext#contextattributes
     */
    contextSettings: {
        /** 无透明背景时可关闭 alpha 以节省开销 */
        alpha: false,
        /** 低延迟渲染，适合实时游戏帧 */
        desynchronized: true,
        /** 不频繁读像素时设为 false，便于浏览器做写入优化 */
        willReadFrequently: false,
    },
};

/**
 * 解析后的实际 pixelRatio 数值（在 instances 中根据 RenderConf 计算）
 */
export function getPixelRatio() {
    if (RenderConf.pixelRatio === "device" && typeof window !== "undefined" && window.devicePixelRatio) {
        const dpr = window.devicePixelRatio;
        return RenderConf.pixelRatioCap != null
            ? Math.min(dpr, RenderConf.pixelRatioCap)
            : dpr;
    }
    if (typeof RenderConf.pixelRatio === "number") return RenderConf.pixelRatio;
    return 1;
}
