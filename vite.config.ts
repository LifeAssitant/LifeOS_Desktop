import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  if (mode === "production") {
    const apiUrl = loadEnv(mode, process.cwd(), "").VITE_API_URL?.trim();
    let parsedApiUrl: URL;
    try {
      parsedApiUrl = new URL(apiUrl || "");
    } catch {
      throw new Error("Set VITE_API_URL to the public LifeOS API URL before a production build.");
    }
    if (parsedApiUrl.protocol !== "https:" || !parsedApiUrl.hostname) {
      throw new Error("Production VITE_API_URL must be an HTTPS URL.");
    }
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
    },
    base: "./",
  };
});
