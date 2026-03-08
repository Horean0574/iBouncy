export const RenderConf = {
    useGpuLayer: true,
    pixelRatio: "device",
    pixelRatioCap: 2,
    smooth: false,
    contextSettings: {
        alpha: false,
        desynchronized: true,
        willReadFrequently: false,
    },
};

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
