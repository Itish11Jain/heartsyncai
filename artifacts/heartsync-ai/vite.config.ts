import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

/**
 * Vite plugin: Cache-Control headers
 *
 * Dev server  — applies to public/ files only (fonts, lottie, images).
 * Preview server — applies to all built output; adds immutable headers for
 *   content-hashed Vite chunks (/assets/*) which are safe to cache forever.
 *
 * Rule                         Header
 * /assets/* (hashed JS/CSS)   public, max-age=31536000, immutable
 * /fonts/*  (woff2)           public, max-age=31536000, immutable
 * /lottie/* (json)            public, max-age=86400, stale-while-revalidate=3600
 * images    (jpg/png/svg/…)   public, max-age=604800, stale-while-revalidate=86400
 * *.html / root               no-cache  (must revalidate so deploys land instantly)
 */
function cacheControlPlugin() {
  function applyHeaders(req: { url?: string }, res: { setHeader: (k: string, v: string) => void }, next: () => void) {
    const url = req.url ?? "";
    if (/^\/assets\//.test(url)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else if (/\/fonts\//.test(url) || /\.(woff2?|ttf|otf|eot)(\?.*)?$/.test(url)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else if (/\/lottie\/.*\.json(\?.*)?$/.test(url)) {
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
    } else if (/\.(jpe?g|png|webp|gif|ico|svg)(\?.*)?$/.test(url)) {
      res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
    } else if (/\.html(\?.*)?$/.test(url) || url === "/" || url === "") {
      res.setHeader("Cache-Control", "no-cache");
    }
    next();
  }
  return {
    name: "hs-cache-control",
    // Dev server: only public/ static files benefit; Vite's own module graph
    // is already handled internally. Apply headers for consistency.
    configureServer(server: { middlewares: { use: (fn: typeof applyHeaders) => void } }) {
      server.middlewares.use(applyHeaders);
    },
    // Preview server: serves the full built output — most important for prod.
    configurePreviewServer(server: { middlewares: { use: (fn: typeof applyHeaders) => void } }) {
      server.middlewares.use(applyHeaders);
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    cacheControlPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          if (!id.includes("node_modules")) return undefined;

          // Auth — lazy-loaded only on /sign-in, /sign-up, /send, /analytics
          if (id.includes("@clerk/")) return "clerk";
          // Firebase auth — lazy-loaded only when AuthGate or generate.tsx mount
          if (id.includes("/firebase/") || id.includes("@firebase/")) return "firebase";

          // Heavy UI libs that benefit from a separate cacheable chunk
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("@radix-ui/")) return "radix";
          if (id.includes("@tanstack/react-query")) return "query";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("lottie-")) return "lottie";
          if (id.includes("html-to-image")) return "html2img";
          if (id.includes("embla-carousel")) return "embla";
          if (id.includes("react-day-picker") || id.includes("date-fns")) return "calendar";

          // React + router core — small, shared by every page
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("/wouter/")
          ) {
            return "react-vendor";
          }

          return undefined;
        },
      },
    },
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
