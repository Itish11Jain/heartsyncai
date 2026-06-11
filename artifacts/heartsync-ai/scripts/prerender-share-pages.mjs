#!/usr/bin/env node
/**
 * prerender-share-pages.mjs
 *
 * Runs after `vite build` (+ prerender-messages). Social crawlers (WhatsApp,
 * Instagram, Facebook, Twitter) do NOT execute JavaScript, so a React route
 * like /reply can never set its own Open Graph tags at runtime — the crawler
 * only ever sees the static HTML the server returns.
 *
 * The reply-card share link (/reply?id=…) otherwise falls back to the root
 * index.html, whose OG copy is the generic "You have a surprise card!" used by
 * the main card flow. To give shared reply links their own preview, we clone
 * the built dist/public/index.html (inheriting every hashed asset/preload tag
 * so the SPA still boots normally) and override only the title + OG/Twitter
 * meta tags, then write dist/public/reply/index.html.
 *
 * Static hosts (vite preview / sirv) resolve /reply -> /reply/index.html, so
 * crawlers get the custom preview while real users boot the same SPA bundle.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "../dist/public");

function escAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escText(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Replace a <meta name|property="key" …> tag's content, or no-op if absent. */
function replaceMeta(html, attr, key, content) {
  const re = new RegExp(
    `<meta ${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`,
  );
  const tag = `<meta ${attr}="${key}" content="${escAttr(content)}" />`;
  return re.test(html) ? html.replace(re, tag) : html;
}

const templatePath = resolve(distDir, "index.html");
if (!existsSync(templatePath)) {
  console.warn(
    `  !  prerender-share-pages: ${templatePath} not found, skipping`,
  );
  process.exit(0);
}

const ORIGIN = "https://heartsync.in";

const pages = [
  {
    url: "/reply",
    title: "Hey! Here is something for you!",
    description:
      "Someone made you a little card. Tap to open your surprise. 🎁",
    image: `${ORIGIN}/og-reply.jpg`,
  },
];

const template = readFileSync(templatePath, "utf-8");

console.log(`\nprerendering ${pages.length} share page(s):`);

for (const page of pages) {
  const canonical = `${ORIGIN}${page.url}`;
  let html = template;

  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escText(page.title)}</title>`,
  );
  html = replaceMeta(html, "name", "description", page.description);
  html = replaceMeta(html, "property", "og:title", page.title);
  html = replaceMeta(html, "property", "og:description", page.description);
  html = replaceMeta(html, "property", "og:url", canonical);
  html = replaceMeta(html, "property", "og:image", page.image);
  html = replaceMeta(html, "name", "twitter:title", page.title);
  html = replaceMeta(html, "name", "twitter:description", page.description);
  html = replaceMeta(html, "name", "twitter:image", page.image);
  html = html.replace(
    /<link rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${escAttr(canonical)}" />`,
  );

  const outDir = resolve(distDir, "." + page.url);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "index.html"), html);
  console.log(`  ✓  ${page.url}/index.html`);
}

console.log();
