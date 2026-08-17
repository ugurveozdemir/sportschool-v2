import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ["host.docker.internal"],
    proxy: {
      "/api": {
        target: "http://localhost:5062",
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "../Sportschool.Api/wwwroot/dashboard",
    emptyOutDir: true
  }
});
