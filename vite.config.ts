/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import type { ClientRequest } from "http";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv reads .env.local (and .env) without the VITE_ prefix restriction
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    test: {
      globals: true,
      environment: "jsdom",
    },
    server: {
      proxy: {
        /**
         * /api/digistore → https://www.digistore24.com/api/call/listTransactions
         *
         * The DIGISTORE_API_KEY is injected here (server-side) and is never
         * sent to or visible in the browser bundle.
         *
         * Requires DIGISTORE_API_KEY in .env.local (no VITE_ prefix).
         */
        "/api/digistore": {
          target:      "https://www.digistore24.com",
          changeOrigin: true,
          rewrite:     (path) =>
            path.replace(/^\/api\/digistore/, "/api/call/listTransactions"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq: ClientRequest) => {
              const apiKey = env["DIGISTORE_API_KEY"] ?? "";
              proxyReq.setHeader("X-DS-API-KEY", apiKey);
              proxyReq.setHeader("Accept", "application/json");
            });
          },
        },
      },
    },
  };
});
