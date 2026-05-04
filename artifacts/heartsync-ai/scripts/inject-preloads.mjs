#!/usr/bin/env node
/**
 * inject-preloads.mjs
 *
 * Runs automatically after `vite build` to inject <link rel="modulepreload">
 * hints for dynamic-import chunks that Vite cannot preload automatically.
 *
 * WHY THIS MATTERS (Indian 4G, ~300 ms RTT to US servers)
 * ─────────────────────────────────────────────────────────
 * Without preloads the browser fetches chunks in a SEQUENTIAL waterfall:
 *
 *   index.js runs
 *     → discovers Home (lazy import)   +300 ms RTT
 *       → home chunk has motion as static dep
 *         → discovers motion chunk     +300 ms RTT
 *           → home finally renders     ← 600 ms wasted
 *
 *   Card page is even worse:
 *   index.js → card → card-templates + motion = ~900 ms wasted
 *
 * With modulepreload on these chunks the browser starts ALL downloads the
 * moment it parses the <head>, in parallel with react-vendor (already
 * preloaded by Vite). By the time JS executes and lazy() resolves, every
 * chunk is already in the module cache → zero extra RTTs.
 *
 * UNIVERSAL PRELOADS  (downloaded for every visitor)
 *   motion          — framer-motion; used by home / card / crystal / cosmic / vinyl
 *   AppShellProvider— Radix app shell; needed by every route once it mounts
 *   home            —  8 KB gzip; primary landing page, negligible on card visitors
 *   card            —  9 KB gzip; primary target for link recipients, negligible on home
 *
 * ROUTE-SPECIFIC PRELOADS  (injected via window.__hsChunks so the inline
 *   body script can create <link rel="modulepreload"> only for the right route)
 *   card-templates  — 43 KB gzip; only /card and /send need this
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir    = resolve(__dirname, '../dist/public');
const assetsDir  = resolve(distDir, 'assets');

const jsFiles = readdirSync(assetsDir).filter(f => f.endsWith('.js'));

/** Find the built (hashed) filename for a chunk by its prefix. */
function find(prefix) {
  return jsFiles.find(f => f.startsWith(prefix + '-'));
}

// ── Universal preloads ────────────────────────────────────────────────────
const universalPrefixes = ['motion', 'AppShellProvider', 'home'];
const cardChunk = jsFiles.find(f => f.startsWith('card-') && !f.startsWith('card-templates'));

const universalFiles = universalPrefixes.map(p => find(p)).filter(Boolean);
if (cardChunk) universalFiles.push(cardChunk);

// ── Route-specific (injected as window.__hsChunks) ────────────────────────
const cardTemplatesFile = find('card-templates');

// ── Build the HTML insertion ──────────────────────────────────────────────
const lines = [
  '    <!-- hs-preloads-done -->',
  '    <!-- Critical chunk preloads: eliminates sequential waterfall (each hop = ~300 ms Indian RTT) -->',
];

for (const file of universalFiles) {
  lines.push(`    <link rel="modulepreload" crossorigin href="/assets/${file}">`);
}

// Expose hashed filenames to the inline body script so it can add
// route-specific preloads (e.g. card-templates only for /card visitors).
if (cardTemplatesFile) {
  lines.push(`    <script>window.__hsChunks={ct:"/assets/${cardTemplatesFile}"}</script>`);
}

const insertion = lines.join('\n');

// ── Patch index.html ──────────────────────────────────────────────────────
const htmlPath = resolve(distDir, 'index.html');
let html = readFileSync(htmlPath, 'utf-8');

if (html.includes('<!-- hs-preloads-done -->')) {
  console.warn('⚠  inject-preloads.mjs: preloads already injected — skipping');
  process.exit(0);
}

html = html.replace(
  '    <link rel="stylesheet" crossorigin',
  insertion + '\n    <link rel="stylesheet" crossorigin',
);

writeFileSync(htmlPath, html);

console.log('\ninjected modulepreload hints into dist/public/index.html:');
for (const f of universalFiles) console.log(`  universal  /assets/${f}`);
if (cardTemplatesFile) console.log(`  __hsChunks /assets/${cardTemplatesFile}  (route-specific via inline script)`);
console.log();
