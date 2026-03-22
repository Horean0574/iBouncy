import { defineConfig } from "vite";

// 使用相对路径加载 JS/CSS，避免站点部署在子路径、或 CDN 根路径与预期不一致时出现 /assets/xxx.js 404
// 若固定部署在域名根目录且希望绝对路径，可改为 base: "/"
export default defineConfig({
  root: ".",
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          leafer: ["leafer-game"]
        }
      }
    },
    outDir: "dist",
    minify: true,
    sourcemap: true
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  }
});
