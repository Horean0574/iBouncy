import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: "./src/assets/fonts/*.{woff,woff2}",
                    dest: "./assets/fonts",
                },
                {
                    src: "./src/assets/img/*.{jpg,png,gif}",
                    dest: "./assets/img",
                },
                {
                    src: "./src/assets/svg/*.svg",
                    dest: "./assets/svg",
                },
            ],
        }),
    ],
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
        assetsDir: "assets",
        minify: true,
        sourcemap: true,
        assetsInclude: ["**/*.woff", "**/*.woff2", "**/*.jpg", "**/*.svg"],
    },
    server: {
        port: 5173,
        open: true,
    },
});
