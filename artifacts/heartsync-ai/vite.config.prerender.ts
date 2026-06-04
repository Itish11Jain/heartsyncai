import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Isolated SSR build used ONLY to pre-render the /messages SEO pages to static
 * HTML at build time. Kept separate from the main vite.config.ts so it doesn't
 * inherit the client manualChunks / cache-control plugin / PORT+BASE_PATH
 * requirements. Bundles everything (noExternal) into a single Node-runnable
 * module so scripts/prerender-messages.mjs has zero resolution concerns.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: "src/prerender/entry-prerender.tsx",
    outDir: path.resolve(import.meta.dirname, "dist/prerender"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "entry-prerender.mjs",
      },
    },
  },
});
