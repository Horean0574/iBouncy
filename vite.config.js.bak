import { defineConfig } from "vite";

export default defineConfig({
    root: ".",
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    leafer: ["leafer-game"],
                },
            },
        },
        outDir: "dist",
        minify: true,
        sourcemap: true,
    },
    server: {
        port: 5173,
        open: true,
    },
});
