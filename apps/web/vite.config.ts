import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/packages/ui/") || id.includes("@radix-ui") || id.includes("class-variance-authority")) {
            return "ui-vendor";
          }

          if (id.includes("@livekit/components-react")) {
            return "livekit-react";
          }

          if (id.includes("@livekit/components-core") || id.includes("@livekit/core")) {
            return "livekit-core";
          }

          if (id.includes("livekit-client")) {
            return "livekit-client";
          }

          if (id.includes("@livekit/")) {
            return "livekit-shared";
          }

          if (
            id.includes("@tanstack/react-query") ||
            id.includes("@tanstack/query-core") ||
            id.includes("@tanstack/react-router") ||
            id.includes("@tanstack/router-core") ||
            id.includes("@tanstack/react-virtual")
          ) {
            return "tanstack";
          }

          if (
            id.includes("react-markdown") ||
            id.includes("remark-") ||
            id.includes("mdast-") ||
            id.includes("micromark") ||
            id.includes("unist-")
          ) {
            return "markdown";
          }

          if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) {
            return "react-vendor";
          }

          return undefined;
        },
      },
    },
  },
  plugins: [tanstackRouter({ autoCodeSplitting: true, target: "react" }), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
