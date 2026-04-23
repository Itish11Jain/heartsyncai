/**
 * Generates 8 compact, looping Lottie JSON animations for HeartSync card templates.
 * Each animation is a background decoration layer matching the card's colour palette.
 */
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const OUT = resolve("artifacts/heartsync-ai/public/lottie");
mkdirSync(OUT, { recursive: true });

const FR = 30;

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToLottieColor(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
    1,
  ];
}

function ease(x = 0.42, y = 0) {
  return { x: [x], y: [y] };
}

function linear() {
  return { x: [0.5], y: [0.5] };
}

// Animated property: single scalar oscillating between a and b
function animScalar(a, b, dur, offset = 0) {
  const op = dur;
  return {
    a: 1,
    k: [
      { t: 0 + offset, s: [a], e: [b], i: ease(0.5, 0), o: ease(0.5, 1) },
      { t: Math.floor(dur / 2) + offset, s: [b], e: [a], i: ease(0.5, 0), o: ease(0.5, 1) },
      { t: dur + offset, s: [a] },
    ],
  };
}

// Animated 2D position that loops vertically
function floatPos(cx, cy, ampX, ampY, dur, off = 0) {
  return {
    a: 1,
    k: [
      { t: 0 + off, s: [cx, cy, 0], e: [cx + ampX, cy - ampY, 0], i: ease(0.5, 0), o: ease(0.5, 1) },
      { t: Math.floor(dur / 2) + off, s: [cx + ampX, cy - ampY, 0], e: [cx, cy, 0], i: ease(0.5, 0), o: ease(0.5, 1) },
      { t: dur + off, s: [cx, cy, 0] },
    ],
  };
}

// Animated opacity pulse
function pulse(lo, hi, dur, off = 0) {
  return {
    a: 1,
    k: [
      { t: 0 + off, s: [lo], e: [hi], i: ease(0.5, 0), o: ease(0.5, 1) },
      { t: Math.floor(dur / 2) + off, s: [hi], e: [lo], i: ease(0.5, 0), o: ease(0.5, 1) },
      { t: dur + off, s: [lo] },
    ],
  };
}

// Animated scale
function scalePulse(lo, hi, dur, off = 0) {
  return {
    a: 1,
    k: [
      { t: 0 + off, s: [lo, lo, 100], e: [hi, hi, 100], i: ease(0.5, 0), o: ease(0.5, 1) },
      { t: Math.floor(dur / 2) + off, s: [hi, hi, 100], e: [lo, lo, 100], i: ease(0.5, 0), o: ease(0.5, 1) },
      { t: dur + off, s: [lo, lo, 100] },
    ],
  };
}

// Create a single floating orb shape-layer
function floatOrb({ ind, cx, cy, size, color, opLo, opHi, durFrames, off, ampX = 0, ampY = 0 }) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: `Orb ${ind}`,
    sr: 1,
    ks: {
      o: pulse(opLo, opHi, durFrames, off),
      r: { a: 0, k: 0 },
      p: floatPos(cx, cy, ampX, ampY, durFrames, off),
      a: { a: 0, k: [0, 0, 0] },
      s: scalePulse(80, 115, durFrames, off),
    },
    ao: 0,
    shapes: [
      {
        ty: "el",
        nm: "Circle",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [size, size] },
        d: 1,
      },
      {
        ty: "fl",
        nm: "Fill",
        c: { a: 0, k: hexToLottieColor(color) },
        o: { a: 0, k: 100 },
        r: 1,
      },
    ],
    ip: 0,
    op: durFrames,
    st: off,
    bm: 0,
  };
}

// Create a shape-layer with a diamond / rotated square path
function sparkle({ ind, cx, cy, size, color, durFrames, off }) {
  const half = size / 2;
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: `Spark ${ind}`,
    sr: 1,
    ks: {
      o: pulse(10, 90, durFrames, off),
      r: animScalar(0, 180, durFrames, off),
      p: { a: 0, k: [cx, cy, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: scalePulse(60, 130, Math.floor(durFrames * 0.7), off),
    },
    ao: 0,
    shapes: [
      {
        ty: "sr",
        nm: "Polystar",
        sy: 2,
        pt: { a: 0, k: 4 },
        p: { a: 0, k: [0, 0] },
        r: { a: 0, k: 45 },
        or: { a: 0, k: size },
        ir: { a: 0, k: size * 0.45 },
        is: { a: 0, k: 0 },
        os: { a: 0, k: 0 },
        ix: 1,
        d: 1,
      },
      {
        ty: "fl",
        nm: "Fill",
        c: { a: 0, k: hexToLottieColor(color) },
        o: { a: 0, k: 100 },
        r: 1,
      },
    ],
    ip: 0,
    op: durFrames,
    st: off,
    bm: 0,
  };
}

// Rotating layer (e.g. for sun rays)
function rotatingLayer({ ind, cx, cy, size, color, durFrames }) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: `Ring ${ind}`,
    sr: 1,
    ks: {
      o: { a: 0, k: 35 },
      r: { a: 1, k: [{ t: 0, s: [0], e: [360], i: linear(), o: linear() }, { t: durFrames, s: [360] }] },
      p: { a: 0, k: [cx, cy, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    shapes: [
      {
        ty: "el",
        nm: "Ring",
        p: { a: 0, k: [0, 0] },
        s: { a: 0, k: [size, size] },
        d: 1,
      },
      {
        ty: "st",
        nm: "Stroke",
        c: { a: 0, k: hexToLottieColor(color) },
        o: { a: 0, k: 100 },
        w: { a: 0, k: 3 },
        lc: 2,
        lj: 2,
        d: [{ n: "d", nm: "dash", v: { a: 0, k: 20 } }, { n: "g", nm: "gap", v: { a: 0, k: 15 } }],
      },
    ],
    ip: 0,
    op: durFrames,
    st: 0,
    bm: 0,
  };
}

function makeLottie({ name, dur, layers }) {
  const op = dur * FR;
  return {
    v: "5.7.4",
    fr: FR,
    ip: 0,
    op,
    w: 400,
    h: 500,
    nm: name,
    ddd: 0,
    assets: [],
    layers: layers(op),
  };
}

// ─── Template Animations ────────────────────────────────────────────────────

// t1: Rose Bloom — floating heart-like orbs, warm pinks
const t1 = makeLottie({
  name: "Rose Bloom",
  dur: 6,
  layers: (op) => [
    floatOrb({ ind: 1, cx: 60,  cy: 120, size: 80,  color: "#fb7185", opLo: 20, opHi: 50, durFrames: op, off: 0,   ampX: 8,  ampY: 18 }),
    floatOrb({ ind: 2, cx: 320, cy: 80,  size: 55,  color: "#f43f5e", opLo: 15, opHi: 45, durFrames: op, off: 20,  ampX: -6, ampY: 22 }),
    floatOrb({ ind: 3, cx: 200, cy: 250, size: 160, color: "#fb7185", opLo: 8,  opHi: 22, durFrames: op, off: 10,  ampX: 12, ampY: 10 }),
    floatOrb({ ind: 4, cx: 50,  cy: 380, size: 45,  color: "#f9a8d4", opLo: 25, opHi: 60, durFrames: op, off: 35,  ampX: 10, ampY: 25 }),
    floatOrb({ ind: 5, cx: 340, cy: 350, size: 70,  color: "#e11d48", opLo: 18, opHi: 40, durFrames: op, off: 50,  ampX: -8, ampY: 16 }),
    floatOrb({ ind: 6, cx: 150, cy: 430, size: 40,  color: "#fda4af", opLo: 20, opHi: 55, durFrames: op, off: 65,  ampX: 5,  ampY: 20 }),
    floatOrb({ ind: 7, cx: 280, cy: 460, size: 30,  color: "#fb7185", opLo: 30, opHi: 70, durFrames: op, off: 80,  ampX: -4, ampY: 18 }),
    floatOrb({ ind: 8, cx: 100, cy: 200, size: 25,  color: "#f9a8d4", opLo: 25, opHi: 65, durFrames: op, off: 95,  ampX: 7,  ampY: 28 }),
  ],
});

// t2: Midnight Spark — already downloaded (111KB), skip
// But if it's bad we use this fallback:
const t2 = makeLottie({
  name: "Midnight Spark",
  dur: 5,
  layers: (op) => [
    sparkle({ ind: 1, cx: 50,  cy: 80,  size: 12, color: "#a78bfa", durFrames: op, off: 0  }),
    sparkle({ ind: 2, cx: 340, cy: 130, size: 8,  color: "#818cf8", durFrames: op, off: 15 }),
    sparkle({ ind: 3, cx: 80,  cy: 300, size: 16, color: "#c084fc", durFrames: op, off: 30 }),
    sparkle({ ind: 4, cx: 310, cy: 340, size: 10, color: "#a78bfa", durFrames: op, off: 45 }),
    sparkle({ ind: 5, cx: 180, cy: 60,  size: 14, color: "#818cf8", durFrames: op, off: 60 }),
    sparkle({ ind: 6, cx: 250, cy: 420, size: 9,  color: "#c084fc", durFrames: op, off: 75 }),
    sparkle({ ind: 7, cx: 130, cy: 450, size: 11, color: "#a78bfa", durFrames: op, off: 90 }),
    floatOrb({ ind: 8, cx: 200, cy: 250, size: 200, color: "#6366f1", opLo: 4, opHi: 14, durFrames: op, off: 0, ampX: 0, ampY: 0 }),
  ],
});

// t3: Golden Hour — warm amber/gold particles
const t3 = makeLottie({
  name: "Golden Hour",
  dur: 7,
  layers: (op) => [
    floatOrb({ ind: 1, cx: 300, cy: 80,  size: 180, color: "#fcd34d", opLo: 15, opHi: 35, durFrames: op, off: 0,   ampX: 5,  ampY: 10 }),
    floatOrb({ ind: 2, cx: 50,  cy: 150, size: 60,  color: "#fbbf24", opLo: 25, opHi: 55, durFrames: op, off: 20,  ampX: 8,  ampY: 20 }),
    floatOrb({ ind: 3, cx: 350, cy: 320, size: 50,  color: "#f59e0b", opLo: 20, opHi: 50, durFrames: op, off: 40,  ampX: -6, ampY: 18 }),
    floatOrb({ ind: 4, cx: 100, cy: 400, size: 35,  color: "#fcd34d", opLo: 30, opHi: 65, durFrames: op, off: 60,  ampX: 10, ampY: 22 }),
    floatOrb({ ind: 5, cx: 220, cy: 480, size: 25,  color: "#fbbf24", opLo: 25, opHi: 60, durFrames: op, off: 80,  ampX: -5, ampY: 25 }),
    sparkle({ ind: 6, cx: 270, cy: 150, size: 8,  color: "#fde68a", durFrames: op, off: 10 }),
    sparkle({ ind: 7, cx: 80,  cy: 280, size: 6,  color: "#fcd34d", durFrames: op, off: 50 }),
    sparkle({ ind: 8, cx: 330, cy: 460, size: 7,  color: "#fbbf24", durFrames: op, off: 30 }),
  ],
});

// t4: Mint Fresh — teal/green floating circles
const t4 = makeLottie({
  name: "Mint Fresh",
  dur: 6,
  layers: (op) => [
    floatOrb({ ind: 1, cx: 200, cy: 250, size: 180, color: "#2dd4bf", opLo: 5,  opHi: 15, durFrames: op, off: 0,   ampX: 0,  ampY: 0 }),
    floatOrb({ ind: 2, cx: 200, cy: 250, size: 120, color: "#34d399", opLo: 8,  opHi: 20, durFrames: op, off: 20,  ampX: 0,  ampY: 0 }),
    floatOrb({ ind: 3, cx: 200, cy: 250, size: 70,  color: "#6ee7b7", opLo: 10, opHi: 25, durFrames: op, off: 40,  ampX: 0,  ampY: 0 }),
    floatOrb({ ind: 4, cx: 60,  cy: 100, size: 30,  color: "#2dd4bf", opLo: 25, opHi: 60, durFrames: op, off: 55,  ampX: 8,  ampY: 22 }),
    floatOrb({ ind: 5, cx: 330, cy: 150, size: 20,  color: "#34d399", opLo: 30, opHi: 65, durFrames: op, off: 70,  ampX: -5, ampY: 18 }),
    floatOrb({ ind: 6, cx: 100, cy: 420, size: 22,  color: "#6ee7b7", opLo: 28, opHi: 62, durFrames: op, off: 85,  ampX: 6,  ampY: 20 }),
    floatOrb({ ind: 7, cx: 310, cy: 400, size: 18,  color: "#2dd4bf", opLo: 22, opHi: 55, durFrames: op, off: 100, ampX: -7, ampY: 24 }),
    sparkle({ ind: 8, cx: 200, cy: 120, size: 6,   color: "#6ee7b7", durFrames: op, off: 25 }),
  ],
});

// t5: Cherry Pop — multi-color confetti orbs, bright & festive
const t5 = makeLottie({
  name: "Cherry Pop",
  dur: 5,
  layers: (op) => [
    floatOrb({ ind: 1, cx: 60,  cy: 100, size: 18, color: "#f87171", opLo: 40, opHi: 90, durFrames: op, off: 0,   ampX: 12, ampY: 25 }),
    floatOrb({ ind: 2, cx: 180, cy: 80,  size: 14, color: "#fb923c", opLo: 35, opHi: 85, durFrames: op, off: 10,  ampX: -8, ampY: 30 }),
    floatOrb({ ind: 3, cx: 310, cy: 110, size: 20, color: "#fbbf24", opLo: 40, opHi: 85, durFrames: op, off: 20,  ampX: 10, ampY: 22 }),
    floatOrb({ ind: 4, cx: 100, cy: 250, size: 16, color: "#4ade80", opLo: 35, opHi: 80, durFrames: op, off: 30,  ampX: -6, ampY: 28 }),
    floatOrb({ ind: 5, cx: 270, cy: 220, size: 22, color: "#60a5fa", opLo: 40, opHi: 85, durFrames: op, off: 40,  ampX: 8,  ampY: 18 }),
    floatOrb({ ind: 6, cx: 50,  cy: 380, size: 15, color: "#f472b6", opLo: 38, opHi: 88, durFrames: op, off: 50,  ampX: 14, ampY: 20 }),
    floatOrb({ ind: 7, cx: 340, cy: 370, size: 12, color: "#c084fc", opLo: 42, opHi: 90, durFrames: op, off: 60,  ampX: -9, ampY: 26 }),
    floatOrb({ ind: 8, cx: 190, cy: 430, size: 18, color: "#f87171", opLo: 35, opHi: 80, durFrames: op, off: 70,  ampX: 6,  ampY: 24 }),
    floatOrb({ ind: 9, cx: 140, cy: 150, size: 13, color: "#fb923c", opLo: 40, opHi: 85, durFrames: op, off: 80,  ampX: -5, ampY: 32 }),
    floatOrb({ ind:10, cx: 280, cy: 460, size: 16, color: "#fbbf24", opLo: 35, opHi: 80, durFrames: op, off: 90,  ampX: 8,  ampY: 20 }),
  ],
});

// t6: Lavender Dream — soft purple/violet aurora orbs
const t6 = makeLottie({
  name: "Lavender Dream",
  dur: 9,
  layers: (op) => [
    floatOrb({ ind: 1, cx: 80,  cy: 120, size: 200, color: "#a78bfa", opLo: 12, opHi: 28, durFrames: op, off: 0,   ampX: 25, ampY: 30 }),
    floatOrb({ ind: 2, cx: 300, cy: 80,  size: 160, color: "#e879f9", opLo: 10, opHi: 24, durFrames: op, off: 50,  ampX: -20,ampY: 35 }),
    floatOrb({ ind: 3, cx: 250, cy: 370, size: 180, color: "#6366f1", opLo: 10, opHi: 22, durFrames: op, off: 100, ampX: -15,ampY: 25 }),
    floatOrb({ ind: 4, cx: 50,  cy: 400, size: 140, color: "#ec4899", opLo: 8,  opHi: 20, durFrames: op, off: 150, ampX: 30, ampY: 20 }),
    floatOrb({ ind: 5, cx: 70,  cy: 230, size: 25,  color: "#c084fc", opLo: 35, opHi: 80, durFrames: op, off: 30,  ampX: 10, ampY: 22 }),
    floatOrb({ ind: 6, cx: 330, cy: 290, size: 18,  color: "#e879f9", opLo: 40, opHi: 85, durFrames: op, off: 80,  ampX: -8, ampY: 18 }),
    floatOrb({ ind: 7, cx: 200, cy: 470, size: 20,  color: "#a78bfa", opLo: 35, opHi: 75, durFrames: op, off: 120, ampX: 5,  ampY: 25 }),
  ],
});

// t7: Ocean Calm — sky blue expanding rings + floating dots
const t7 = makeLottie({
  name: "Ocean Calm",
  dur: 5,
  layers: (op) => [
    {
      ddd: 0, ind: 1, ty: 4, nm: "Ring 1", sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [70], e: [0], i: linear(), o: linear() }, { t: op, s: [0] }] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [200, 250, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [5, 5, 100], e: [200, 200, 100], i: linear(), o: linear() }, { t: op, s: [200, 200, 100] }] },
      },
      ao: 0, shapes: [
        { ty: "el", nm: "E", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [150, 150] }, d: 1 },
        { ty: "st", nm: "S", c: { a: 0, k: hexToLottieColor("#38bdf8") }, o: { a: 0, k: 100 }, w: { a: 0, k: 2 }, lc: 2, lj: 2 },
      ],
      ip: 0, op, st: 0, bm: 0,
    },
    {
      ddd: 0, ind: 2, ty: 4, nm: "Ring 2", sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [70], e: [0], i: linear(), o: linear() }, { t: op, s: [0] }] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [200, 250, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [5, 5, 100], e: [200, 200, 100], i: linear(), o: linear() }, { t: op, s: [200, 200, 100] }] },
      },
      ao: 0, shapes: [
        { ty: "el", nm: "E", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [150, 150] }, d: 1 },
        { ty: "st", nm: "S", c: { a: 0, k: hexToLottieColor("#7dd3fc") }, o: { a: 0, k: 100 }, w: { a: 0, k: 2 }, lc: 2, lj: 2 },
      ],
      ip: 0, op, st: Math.floor(op * 0.25), bm: 0,
    },
    {
      ddd: 0, ind: 3, ty: 4, nm: "Ring 3", sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [70], e: [0], i: linear(), o: linear() }, { t: op, s: [0] }] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [200, 250, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [5, 5, 100], e: [200, 200, 100], i: linear(), o: linear() }, { t: op, s: [200, 200, 100] }] },
      },
      ao: 0, shapes: [
        { ty: "el", nm: "E", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [150, 150] }, d: 1 },
        { ty: "st", nm: "S", c: { a: 0, k: hexToLottieColor("#bae6fd") }, o: { a: 0, k: 100 }, w: { a: 0, k: 2 }, lc: 2, lj: 2 },
      ],
      ip: 0, op, st: Math.floor(op * 0.5), bm: 0,
    },
    {
      ddd: 0, ind: 4, ty: 4, nm: "Ring 4", sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [70], e: [0], i: linear(), o: linear() }, { t: op, s: [0] }] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [200, 250, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [5, 5, 100], e: [200, 200, 100], i: linear(), o: linear() }, { t: op, s: [200, 200, 100] }] },
      },
      ao: 0, shapes: [
        { ty: "el", nm: "E", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [150, 150] }, d: 1 },
        { ty: "st", nm: "S", c: { a: 0, k: hexToLottieColor("#38bdf8") }, o: { a: 0, k: 100 }, w: { a: 0, k: 2 }, lc: 2, lj: 2 },
      ],
      ip: 0, op, st: Math.floor(op * 0.75), bm: 0,
    },
    floatOrb({ ind: 5, cx: 200, cy: 250, size: 8, color: "#7dd3fc", opLo: 50, opHi: 95, durFrames: op, off: 0, ampX: 0, ampY: 0 }),
  ],
});

// t8: Sunshine — rotating dashed rings + golden orbs
const t8 = makeLottie({
  name: "Sunshine",
  dur: 8,
  layers: (op) => [
    floatOrb({ ind: 1, cx: 200, cy: 200, size: 240, color: "#fcd34d", opLo: 8,  opHi: 18, durFrames: op, off: 0,  ampX: 0,  ampY: 0 }),
    rotatingLayer({ ind: 2, cx: 200, cy: 200, size: 220, color: "#f59e0b", durFrames: op }),
    {
      ddd: 0, ind: 3, ty: 4, nm: "Ring CCW", sr: 1,
      ks: {
        o: { a: 0, k: 30 },
        r: { a: 1, k: [{ t: 0, s: [360], e: [0], i: linear(), o: linear() }, { t: op, s: [0] }] },
        p: { a: 0, k: [200, 200, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      ao: 0, shapes: [
        { ty: "el", nm: "E", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [300, 300] }, d: 1 },
        { ty: "st", nm: "S", c: { a: 0, k: hexToLottieColor("#fbbf24") }, o: { a: 0, k: 100 }, w: { a: 0, k: 2 }, lc: 2, lj: 2, d: [{ n: "d", nm: "d", v: { a: 0, k: 30 } }, { n: "g", nm: "g", v: { a: 0, k: 20 } }] },
      ],
      ip: 0, op, st: 0, bm: 0,
    },
    floatOrb({ ind: 4, cx: 60,  cy: 80,  size: 25, color: "#fbbf24", opLo: 35, opHi: 75, durFrames: op, off: 0,   ampX: 8,  ampY: 22 }),
    floatOrb({ ind: 5, cx: 330, cy: 110, size: 18, color: "#fcd34d", opLo: 30, opHi: 70, durFrames: op, off: 30,  ampX: -6, ampY: 20 }),
    floatOrb({ ind: 6, cx: 80,  cy: 400, size: 20, color: "#f59e0b", opLo: 32, opHi: 72, durFrames: op, off: 60,  ampX: 10, ampY: 18 }),
    floatOrb({ ind: 7, cx: 340, cy: 380, size: 15, color: "#fbbf24", opLo: 28, opHi: 68, durFrames: op, off: 90,  ampX: -8, ampY: 24 }),
  ],
});

// ─── Write files ─────────────────────────────────────────────────────────────

const animations = { t1, t2, t3, t4, t5, t6, t7, t8 };

for (const [key, data] of Object.entries(animations)) {
  // For t2 — check if we already have a good downloaded one; use fallback if not
  const outPath = resolve(OUT, `${key}.json`);
  writeFileSync(outPath, JSON.stringify(data));
  const size = JSON.stringify(data).length;
  console.log(`✓ ${key}.json  ${(size / 1024).toFixed(1)}KB`);
}

console.log("\nAll Lottie animations generated.");
