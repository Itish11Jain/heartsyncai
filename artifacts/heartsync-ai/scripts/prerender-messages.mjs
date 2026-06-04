#!/usr/bin/env node
/**
 * prerender-messages.mjs
 *
 * Runs after `vite build` + inject-preloads + the SSR prerender build. For each
 * /messages route it:
 *   1. renders the real React page to a static HTML string (via the SSR bundle),
 *   2. clones the built dist/public/index.html as the template (so all hashed
 *      asset/preload tags + analytics are inherited),
 *   3. swaps in a unique <title>, meta description, canonical, OG/Twitter tags
 *      and JSON-LD,
 *   4. injects the rendered markup into <div id="root">,
 *   5. writes dist/public/<route>/index.html.
 *
 * Result: crawlers (and users) get fully-formed HTML for every guide page
 * before any JavaScript runs; the client bundle then takes over.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "../dist/public");
const entryPath = resolve(__dirname, "../dist/prerender/entry-prerender.mjs");

function escText(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escAttr(s) {
  return escText(s).replace(/"/g, "&quot;");
}

/** Replace a <meta name|property="key" …> tag's content, or no-op if absent. */
function replaceMeta(html, attr, key, content) {
  const re = new RegExp(
    `<meta ${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`,
  );
  const tag = `<meta ${attr}="${key}" content="${escAttr(content)}" />`;
  return re.test(html) ? html.replace(re, tag) : html;
}

const { render, allPrerenderRoutes } = await import(
  pathToFileURL(entryPath).href
);

const template = readFileSync(resolve(distDir, "index.html"), "utf-8");
const routes = allPrerenderRoutes();

console.log(`\nprerendering ${routes.length} /messages routes:`);

for (const route of routes) {
  const appHtml = render(route.url);

  let html = template;
  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escText(route.title)}</title>`,
  );
  html = replaceMeta(html, "name", "description", route.description);
  html = replaceMeta(html, "property", "og:title", route.title);
  html = replaceMeta(html, "property", "og:description", route.description);
  html = replaceMeta(html, "property", "og:url", route.canonical);
  html = replaceMeta(html, "name", "twitter:title", route.title);
  html = replaceMeta(html, "name", "twitter:description", route.description);
  html = html.replace(
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${escAttr(route.canonical)}" />`,
  );

  // id must match JSON_LD_ID in useSeoHead so the client upserts THIS element
  // on mount instead of appending a duplicate JSON-LD block.
  const jsonLd = `<script type="application/ld+json" id="hs-seo-jsonld">${JSON.stringify(
    route.jsonLd,
  )}</script>`;
  html = html.replace("</head>", `    ${jsonLd}\n  </head>`);

  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${appHtml}</div>`,
  );

  const outDir = resolve(distDir, "." + route.url);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "index.html"), html);
  console.log(`  ✓  ${route.url}/index.html`);
}

// Inject the /messages URLs into the built sitemap, preserving the existing
// static entries. Data file stays the single source of truth for these URLs.
const sitemapPath = resolve(distDir, "sitemap.xml");
try {
  let sitemap = readFileSync(sitemapPath, "utf-8");
  const blocks = routes
    .map((r) => {
      const isIndex = r.url === "/messages";
      const priority = isIndex ? "0.8" : "0.7";
      return `  <url>\n    <loc>https://heartsync.in${r.url}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join("\n");
  if (!sitemap.includes("https://heartsync.in/messages")) {
    sitemap = sitemap.replace("</urlset>", `${blocks}\n</urlset>`);
    writeFileSync(sitemapPath, sitemap);
    console.log(`  ✓  sitemap.xml (+${routes.length} message URLs)`);
  }
} catch (err) {
  console.warn(`  !  could not augment sitemap.xml: ${err.message}`);
}

console.log();
