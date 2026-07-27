import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      "/oauth2": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      "/login": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      "/logout": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
    },
  },
})
