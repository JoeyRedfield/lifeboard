/// <reference types="vitest/config" />

import { defineConfig, loadEnv } from "vite";
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react()],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
    },
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY || "http://backend:8000",
          changeOrigin: true,
        },
      },
    },
  };
})
