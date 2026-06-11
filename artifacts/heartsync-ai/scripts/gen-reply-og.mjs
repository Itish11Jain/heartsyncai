#!/usr/bin/env node
import { createRequire } from "module";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(
  resolve(__dirname, "../../api-server/package.json"),
);
const sharp = require("sharp");

const W = 1200;
const H = 630;
const out = resolve(__dirname, "../public/og-reply.jpg");

function heart(cx, cy, s, fill, opacity = 1) {
  const d = `M ${cx} ${cy + s * 0.78}
    C ${cx - s * 1.1} ${cy - s * 0.15}, ${cx - s * 0.62} ${cy - s * 0.9}, ${cx} ${cy - s * 0.32}
    C ${cx + s * 0.62} ${cy - s * 0.9}, ${cx + s * 1.1} ${cy - s * 0.15}, ${cx} ${cy + s * 0.78} Z`;
  return `<path d="${d.replace(/\s+/g, " ")}" fill="${fill}" opacity="${opacity}" />`;
}

function sparkle(cx, cy, r, op) {
  return `<g opacity="${op}"><path d="M ${cx} ${cy - r} L ${cx + r * 0.28} ${cy - r * 0.28} L ${cx + r} ${cy} L ${cx + r * 0.28} ${cy + r * 0.28} L ${cx} ${cy + r} L ${cx - r * 0.28} ${cy + r * 0.28} L ${cx - r} ${cy} L ${cx - r * 0.28} ${cy - r * 0.28} Z" fill="#FFE9A8"/></g>`;
}

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#2a1140"/>
      <stop offset="55%" stop-color="#160a26"/>
      <stop offset="100%" stop-color="#070310"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFF2C2"/>
      <stop offset="50%" stop-color="#FFD86B"/>
      <stop offset="100%" stop-color="#E8A93C"/>
    </linearGradient>
    <linearGradient id="heartg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF7AA8"/>
      <stop offset="100%" stop-color="#E0457E"/>
    </linearGradient>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="14" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  ${sparkle(250, 150, 11, 0.85)}
  ${sparkle(960, 200, 14, 0.8)}
  ${sparkle(180, 470, 9, 0.7)}
  ${sparkle(1010, 470, 12, 0.75)}
  ${sparkle(620, 96, 8, 0.6)}
  ${heart(360, 250, 16, "#FF8FB4", 0.18)}
  ${heart(880, 430, 20, "#FF8FB4", 0.16)}
  ${heart(1040, 300, 13, "#FFD86B", 0.2)}
  ${heart(150, 330, 12, "#FFD86B", 0.18)}

  <g filter="url(#glow)">
    ${heart(600, 196, 52, "url(#heartg)", 1)}
  </g>

  <text x="600" y="378" text-anchor="middle" font-family="DejaVu Serif" font-style="italic" font-weight="bold" font-size="52" fill="url(#gold)">Hey! Here is something for you!</text>

  <text x="600" y="444" text-anchor="middle" font-family="DejaVu Sans" font-size="27" fill="#E9DBF5" opacity="0.85">Someone made you a little card. Tap to open your surprise.</text>

  <g opacity="0.92">
    ${heart(556, 556, 13, "url(#heartg)", 1)}
    <text x="585" y="566" text-anchor="start" font-family="DejaVu Sans" font-weight="bold" font-size="28" fill="#FFFFFF">HeartSync AI</text>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(out);
console.log("wrote", out);
