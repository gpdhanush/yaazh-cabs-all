import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  server: {
    port: 4000,
  },
  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
  plugins: [
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts
      server: { entry: "server" },
    }),
    viteReact(),
    tailwindcss(),
    nitro(),
  ],
});
