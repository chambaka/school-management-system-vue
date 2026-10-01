import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-192.png", "pwa-512.png", "apple-touch-icon.png", "sms-logo.png"],
      manifest: {
        id: "/",
        name: "ShuleHub School Management System",
        short_name: "ShuleHub",
        description: "Academics, people, and campus operations in one place.",
        lang: "en",
        dir: "ltr",
        theme_color: "#06101F",
        background_color: "#06101F",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        categories: ["education", "productivity"],
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api/v1/location": {
        target: "http://127.0.0.1:8586",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1\/location/, "/api/location"),
      },
      "/api": "http://localhost:8989",
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
});
