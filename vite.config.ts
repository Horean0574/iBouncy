import { defineConfig } from "vite";

export default defineConfig({
    root: ".",
    build: {
        target: "es2022",
        minify: true,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("leafer-game")) return "leafer";
                    if (id.includes("@leafer-ui")) return "leafer-ui";
                },
            },
        },
        outDir: "dist",
        sourcemap: false,
        reportCompressedSize: false,
    },
    server: {
        port: 5173,
        open: true,
        allowedHosts: ['.monkeycode-ai.online'],
    },
});
