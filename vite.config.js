import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    root: ".",
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    leafer: ["leafer-game"],
                },
                chunkFileNames: "assets/[name]-[hash].js",
                entryFileNames: "assets/[name]-[hash].js",
                assetFileNames: "assets/[name]-[hash].[ext]",
            },
        },
        outDir: "dist",
        minify: "esbuild",
        sourcemap: true,
        cssMinify: true,
    },
    server: {
        port: 5173,
        open: true,
        host: true,
        cors: true,
    },
    css: {
        devSourcemap: true,
    },
});
