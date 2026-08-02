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
 *   Send page waterfall (the worst — 4 hops):
 *   index.js → ClerkAuthLayer → clerk (88 KB static dep)
 *            → send → card-templates
 *   = ~1,200 ms wasted in RTTs alone, plus Clerk SDK download time
 *
 * With modulepreload on these chunks the browser starts ALL downloads the
 * moment it parses the <head>, in parallel with react-vendor (already
 * preloaded by Vite). By the time JS executes and lazy() resolves, every
 * chunk is already in the module cache → zero extra RTTs.
 *
 * SATELLITE HTML FILES (envelope.html, crystal.html, cosmic.html, vinyl.html)
 * ─────────────────────────────────────────────────────────────────────────────
 * These files previously did window.location.replace() — a full HTTP round-trip
 * costing ~300-500 ms on Indian 4G before the React app even started loading.
 * They now use history.replaceState() (zero network cost) and mount the React
 * app directly. inject-preloads.mjs patches them with the correct built asset
 * references (CSS + entry JS + all modulepreload links) so they are fully
 * self-contained SPA entry points.
 *
 * UNIVERSAL PRELOADS  (downloaded for every visitor)
 *   motion          — framer-motion; used by home / card / crystal / cosmic / vinyl
 *   AppShellProvider— Radix app shell; needed by every route once it mounts
 *   home            —  8 KB gzip; primary landing page, negligible on card visitors
 *   card            —  9 KB gzip; primary target for link recipients, negligible on home
 *
 * ROUTE-SPECIFIC PRELOADS  (injected via window.__hsChunks so the inline
 *   body script can create <link rel="modulepreload"> only for the right route)
 *   ct  = card-templates  — 43 KB gzip; needed by /card and /send
 *   ck  = clerk           — 88 KB gzip; needed by /send (ClerkAuthLayer static dep)
 *   cal = ClerkAuthLayer  —  4 KB gzip; lazy wrapper for auth routes
 *   sd  = send            — 43 KB gzip; the card-builder page
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
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
// ct  = card-templates  (needed by /card route-specific preload AND /send)
// ck  = clerk           (Clerk SDK — 88 KB, static dep of ClerkAuthLayer)
// cal = ClerkAuthLayer  (lazy auth wrapper; needed by /send, /sign-in, etc.)
// sd  = send            (card-builder page chunk)
const cardTemplatesFile  = find('card-templates');
const clerkFile          = find('clerk');
const clerkAuthLayerFile = find('ClerkAuthLayer');
const sendFile           = find('send');

const hsChunks = {};
if (cardTemplatesFile)  hsChunks.ct  = `/assets/${cardTemplatesFile}`;
if (clerkFile)          hsChunks.ck  = `/assets/${clerkFile}`;
if (clerkAuthLayerFile) hsChunks.cal = `/assets/${clerkAuthLayerFile}`;
if (sendFile)           hsChunks.sd  = `/assets/${sendFile}`;

// ── Build the HTML insertion for index.html ──────────────────────────────
const lines = [
  '    <!-- hs-preloads-done -->',
  '    <!-- Critical chunk preloads: eliminates sequential waterfall (each hop = ~300 ms Indian RTT) -->',
];

for (const file of universalFiles) {
  lines.push(`    <link rel="modulepreload" crossorigin href="/assets/${file}">`);
}

// Expose hashed filenames to the inline body script so it can add
// route-specific preloads (e.g. card-templates for /card, all auth chunks for /send).
if (Object.keys(hsChunks).length > 0) {
  lines.push(`    <script>window.__hsChunks=${JSON.stringify(hsChunks)}</script>`);
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
for (const [k, v] of Object.entries(hsChunks)) console.log(`  __hsChunks[${k}] ${v}  (route-specific via inline script)`);
console.log();

// ── Patch satellite HTML files ────────────────────────────────────────────
// envelope.html, crystal.html, cosmic.html, vinyl.html now load the React
// app directly (using history.replaceState instead of location.replace).
// They have <!-- HS_INJECT_ASSETS --> and <script type="module" src="/src/main.tsx">
// placeholders that we replace here with the real built asset references.

// Re-read the patched index.html to extract asset references
const patchedIndex = readFileSync(htmlPath, 'utf-8');

// Extract the CSS <link> tag
const cssMatch = patchedIndex.match(/<link rel="stylesheet" crossorigin href="\/assets\/[^"]+\.css">/);
const cssTag = cssMatch ? cssMatch[0] : '';

// Extract all <link rel="modulepreload"> tags
const preloadMatches = [...patchedIndex.matchAll(/<link rel="modulepreload" crossorigin href="\/assets\/[^"]+\.js">/g)];
const preloadTags = preloadMatches.map(m => m[0]);

// Extract the <script>window.__hsChunks=...</script> tag if present
const hsChunksTagMatch = patchedIndex.match(/<script>window\.__hsChunks=\{[^<]+\}<\/script>/);
const hsChunksTag = hsChunksTagMatch ? hsChunksTagMatch[0] : '';

// Extract the entry JS <script type="module" crossorigin src="..."> tag
// Vite outputs something like: <script type="module" crossorigin src="/assets/index-HASH.js"></script>
const entryJsMatch = patchedIndex.match(/<script type="module" crossorigin src="\/assets\/[^"]+\.js"><\/script>/);
const entryJsTag = entryJsMatch ? entryJsMatch[0] : '';

// Build the assets block that replaces <!-- HS_INJECT_ASSETS -->
// Includes: CSS link + all modulepreload tags + __hsChunks script
const assetParts = [];
if (cssTag) assetParts.push('    ' + cssTag);
for (const tag of preloadTags) assetParts.push('    ' + tag);
if (hsChunksTag) assetParts.push('    ' + hsChunksTag);
const assetsBlock = assetParts.join('\n');

// The dev entry placeholder to replace
const DEV_ENTRY = '    <script type="module" src="/src/main.tsx"></script>';
const PROD_ENTRY = entryJsTag ? '    ' + entryJsTag : '';

const satelliteFiles = ['envelope.html', 'crystal.html', 'cosmic.html', 'vinyl.html', 'birthday.html', 'fathers-day.html', 'friendship-day.html'];

console.log('patching satellite HTML files:');
for (const filename of satelliteFiles) {
  const filePath = resolve(distDir, filename);
  if (!existsSync(filePath)) {
    console.warn(`  ⚠  ${filename} not found in dist — skipping`);
    continue;
  }

  let sat = readFileSync(filePath, 'utf-8');

  // Replace <!-- HS_INJECT_ASSETS --> with CSS + preloads + hsChunks
  if (assetsBlock) {
    sat = sat.replace('    <!-- HS_INJECT_ASSETS -->', assetsBlock);
  }

  // Replace dev entry script with prod entry script
  if (PROD_ENTRY) {
    sat = sat.replace(DEV_ENTRY, PROD_ENTRY);
  }

  writeFileSync(filePath, sat);
  console.log(`  ✓  ${filename} (${assetParts.length} asset tags injected)`);
}
console.log();
