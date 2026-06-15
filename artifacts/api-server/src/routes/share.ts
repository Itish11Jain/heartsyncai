import { Router } from "express";
import { readFileSync } from "fs";
import { Resvg } from "@resvg/resvg-js";

const router = Router();

/* ── In-process LRU cache for rendered OG images ───────────────────────────
 * Protects the server from re-running resvg on every request for the same
 * name (WhatsApp card forwards can trigger many identical hits in seconds).
 * 500 entries ≈ all common recipient names; each PNG is ~8-15 KB → <10 MB
 * total. Uses Map insertion-order as the LRU queue (delete+re-insert on hit).
 */
const OG_CACHE_MAX = 500;
const ogCache = new Map<string, { contentType: string; body: Buffer }>();

function ogCacheGet(key: string) {
  const entry = ogCache.get(key);
  if (!entry) return null;
  ogCache.delete(key);
  ogCache.set(key, entry);
  return entry;
}

function ogCacheSet(key: string, value: { contentType: string; body: Buffer }) {
  if (ogCache.size >= OG_CACHE_MAX) {
    ogCache.delete(ogCache.keys().next().value!);
  }
  ogCache.set(key, value);
}

const FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
const FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";

let fontBold: Buffer | null = null;
let fontReg: Buffer | null = null;
try {
  fontBold = readFileSync(FONT_BOLD);
  fontReg = readFileSync(FONT_REG);
} catch {
  /* noop — will fall back to SVG response */
}

const TEMPLATE_MAP: Record<string, string> = {
  envelope: "envelope.html",
  crystal: "crystal.html",
  cosmic: "cosmic.html",
  vinyl: "vinyl.html",
  birthday: "birthday.html",
  occasion: "fathers-day.html",
};

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      c
    ] ?? c,
  );
}

function escSvg(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      c
    ] ?? c,
  );
}

function buildSvg(name: string): string {
  const safe = escSvg(name.length > 22 ? name.slice(0, 20) + "\u2026" : name);
  const fontSize = name.length <= 10 ? 96 : name.length <= 16 ? 80 : 68;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="75%">
      <stop offset="0%" stop-color="#3d0e2a"/>
      <stop offset="55%" stop-color="#1a0618"/>
      <stop offset="100%" stop-color="#0c030e"/>
    </radialGradient>
    <linearGradient id="nameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD700"/>
      <stop offset="50%" stop-color="#FF8DC7"/>
      <stop offset="100%" stop-color="#FFD700"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-40%" width="140%" height="180%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- soft halo circles -->
  <circle cx="180" cy="130" r="220" fill="rgba(255,105,180,0.06)"/>
  <circle cx="1020" cy="500" r="200" fill="rgba(255,215,0,0.05)"/>
  <circle cx="600" cy="315" r="450" fill="rgba(200,50,120,0.04)"/>

  <!-- sparkle dots -->
  <circle cx="90"   cy="80"  r="3" fill="rgba(255,215,0,0.7)"/>
  <circle cx="1110" cy="110" r="2" fill="rgba(255,140,190,0.7)"/>
  <circle cx="1060" cy="380" r="2" fill="rgba(255,215,0,0.5)"/>
  <circle cx="140"  cy="480" r="3" fill="rgba(255,140,190,0.5)"/>
  <circle cx="360"  cy="560" r="2" fill="rgba(255,215,0,0.4)"/>
  <circle cx="840"  cy="60"  r="2" fill="rgba(255,140,190,0.4)"/>

  <!-- thin decorative lines -->
  <line x1="0" y1="4"   x2="1200" y2="4"   stroke="rgba(255,215,0,0.15)"  stroke-width="1"/>
  <line x1="0" y1="626" x2="1200" y2="626" stroke="rgba(255,215,0,0.15)"  stroke-width="1"/>

  <!-- "Hey," label -->
  <text
    x="600" y="210"
    text-anchor="middle"
    font-family="DejaVu Sans, sans-serif"
    font-size="42"
    fill="rgba(255,176,210,0.7)"
    letter-spacing="4"
  >H E Y ,</text>

  <!-- Name (gold, bold, glowing) -->
  <text
    x="600" y="${210 + fontSize + 14}"
    text-anchor="middle"
    font-family="DejaVu Sans, sans-serif"
    font-weight="bold"
    font-size="${fontSize}"
    fill="#FFD700"
    filter="url(#glow)"
  >${safe}!</text>

  <!-- Subtitle -->
  <text
    x="600" y="${210 + fontSize + 14 + 64}"
    text-anchor="middle"
    font-family="DejaVu Sans, sans-serif"
    font-size="30"
    fill="rgba(255,176,210,0.65)"
  >Someone made you something special \u2014 tap to reveal</text>

  <!-- Divider dots -->
  <circle cx="556" cy="${210 + fontSize + 14 + 100}" r="3" fill="rgba(255,215,0,0.45)"/>
  <circle cx="580" cy="${210 + fontSize + 14 + 100}" r="3" fill="rgba(255,140,190,0.55)"/>
  <circle cx="604" cy="${210 + fontSize + 14 + 100}" r="3" fill="rgba(255,215,0,0.45)"/>
  <circle cx="628" cy="${210 + fontSize + 14 + 100}" r="3" fill="rgba(255,140,190,0.55)"/>
  <circle cx="652" cy="${210 + fontSize + 14 + 100}" r="3" fill="rgba(255,215,0,0.45)"/>

  <!-- Brand footer -->
  <text
    x="600" y="596"
    text-anchor="middle"
    font-family="DejaVu Sans, sans-serif"
    font-size="20"
    fill="rgba(255,215,0,0.3)"
    letter-spacing="5"
  >HEARTSYNC AI</text>
</svg>`;
}

/* ── GET /api/og-image?name=Sonakshi ───────────────────────────────────────── */
router.get("/og-image", (req, res) => {
  const name = String(req.query["name"] ?? "You").trim() || "You";
  const cacheKey = name.toLowerCase();

  const cached = ogCacheGet(cacheKey);
  if (cached) {
    res.setHeader("Content-Type", cached.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(cached.body);
  }

  const svg = buildSvg(name);

  if (!fontBold) {
    const body = Buffer.from(svg);
    ogCacheSet(cacheKey, { contentType: "image/svg+xml", body });
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(body);
  }

  try {
    const resvg = new Resvg(svg, {
      font: {
        fontFiles: [FONT_BOLD, ...(fontReg ? [FONT_REG] : [])],
        defaultFontFamily: "DejaVu Sans",
        loadSystemFonts: false,
      },
    });

    const pngData = resvg.render();
    const body = Buffer.from(pngData.asPng());
    ogCacheSet(cacheKey, { contentType: "image/png", body });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(body);
  } catch {
    const body = Buffer.from(svg);
    ogCacheSet(cacheKey, { contentType: "image/svg+xml", body });
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(body);
  }
});

/* ── GET /api/share?t=envelope&to=Sonakshi&occasion=birthday&... ─────────── */
router.get("/share", (req, res) => {
  const templateKey = String(req.query["t"] ?? "envelope");
  const name = String(req.query["to"] ?? "").trim() || "You";
  const occasion = String(req.query["occasion"] ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const htmlFile = TEMPLATE_MAP[templateKey] ?? "envelope.html";

  /* Build the recipient card URL (strip the `t` param) */
  const fwdParams = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (k !== "t") fwdParams.set(k, String(v));
  }
  const cardPath = `/${htmlFile}?${fwdParams.toString()}`;

  /* Absolute base for OG image URL */
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol;
  const host = req.get("host") ?? "localhost";
  const baseUrl = `${proto}://${host}`;

  const ogImageUrl = `${baseUrl}/api/og-image?name=${encodeURIComponent(name)}`;
  const ogTitle = occasion
    ? `Hey ${name}! You have a ${occasion} card \uD83C\uDF81`
    : `Hey ${name}! You have a surprise \uD83C\uDF81`;
  const ogDesc = `Someone who cares about you made this just for you. Tap to open your card! \uD83D\uDC8C`;
  const canonicalUrl = `${baseUrl}/api/share?${new URLSearchParams(req.query as Record<string, string>).toString()}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escHtml(ogTitle)}</title>

  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="HeartSync AI"/>
  <meta property="og:title" content="${escHtml(ogTitle)}"/>
  <meta property="og:description" content="${escHtml(ogDesc)}"/>
  <meta property="og:image" content="${escHtml(ogImageUrl)}"/>
  <meta property="og:image:secure_url" content="${escHtml(ogImageUrl)}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:image:type" content="image/png"/>
  <meta property="og:image:alt" content="${escHtml(ogTitle)}"/>
  <meta property="og:url" content="${escHtml(canonicalUrl)}"/>

  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escHtml(ogTitle)}"/>
  <meta name="twitter:description" content="${escHtml(ogDesc)}"/>
  <meta name="twitter:image" content="${escHtml(ogImageUrl)}"/>

  <style>
    html,body{margin:0;padding:0;background:#0c030e;min-height:100vh;
      display:flex;align-items:center;justify-content:center;flex-direction:column;}
    p{color:rgba(255,176,210,0.6);font-family:sans-serif;font-size:16px;margin:0 0 8px;}
    span{color:rgba(255,215,0,0.5);font-size:13px;font-family:sans-serif;}
  </style>
</head>
<body>
  <p>Opening your card\u2026</p>
  <span>HeartSync AI</span>
  <noscript>
    <p style="margin-top:24px;"><a href="${escHtml(cardPath)}" style="color:#FFD700;">Tap here to open your card</a></p>
  </noscript>
  <script>window.location.replace(${JSON.stringify(cardPath)});</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.send(html);
});

export default router;
