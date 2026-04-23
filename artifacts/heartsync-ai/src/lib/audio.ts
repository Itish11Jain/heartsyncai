/**
 * HeartSync AI — Synthesized sound effects + haptics
 * Uses Web Audio API (no files, no downloads). Gracefully degrades on
 * browsers that do not support AudioContext or Vibration API.
 */

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    _ctx = new AC();
  }
  if (_ctx.state === "suspended") void _ctx.resume();
  return _ctx;
}

/* ── Haptics ─────────────────────────────────────────────────── */

export const haptic = {
  click:     () => { try { navigator.vibrate?.(5);                   } catch { /* */ } },
  light:     () => { try { navigator.vibrate?.(10);                  } catch { /* */ } },
  medium:    () => { try { navigator.vibrate?.([15, 10, 15]);        } catch { /* */ } },
  strong:    () => { try { navigator.vibrate?.([30, 20, 40]);        } catch { /* */ } },
  celebrate: () => { try { navigator.vibrate?.([10, 20, 10, 30, 60]); } catch { /* */ } },
};

/* ── Low-level helpers ───────────────────────────────────────── */

function tone(
  ac: AudioContext,
  type: OscillatorType,
  freq: number,
  gain: number,
  duration: number,
  startAt = 0,
): void {
  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ac.currentTime + startAt;
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration);
}

function filteredNoise(
  ac: AudioContext,
  duration: number,
  gain: number,
  filterType: BiquadFilterType,
  filterFreqStart: number,
  filterFreqEnd?: number,
): void {
  const bufLen = Math.floor(ac.sampleRate * duration);
  const buf    = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const src  = ac.createBufferSource();
  src.buffer = buf;
  const filt = ac.createBiquadFilter();
  filt.type  = filterType;
  filt.frequency.setValueAtTime(filterFreqStart, ac.currentTime);
  if (filterFreqEnd) {
    filt.frequency.exponentialRampToValueAtTime(filterFreqEnd, ac.currentTime + duration);
  }
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  src.connect(filt);
  filt.connect(g);
  g.connect(ac.destination);
  src.start();
}

/* ════════════════════════════════════════════════════════════════
   VINYL  — warm, analogue, audiophile
   ════════════════════════════════════════════════════════════════ */

export const vinyl = {
  /** PRESS TO PLAY — needle-drop crackle + soft thud */
  pressToPlay() {
    try {
      const ac = getCtx();
      filteredNoise(ac, 0.38, 0.20, "bandpass", 3500);
      tone(ac, "sine", 52, 0.28, 0.28);
      haptic.medium();
    } catch { /* */ }
  },

  /** Note orb tap — warm guitar pluck, pitch varies per track slot */
  noteTap(idx: number) {
    try {
      const ac = getCtx();
      const freqs = [196, 246, 293, 349]; // G3 B3 D4 F4 — warm guitar tones
      const f = freqs[idx % freqs.length];
      tone(ac, "triangle", f,     0.20, 0.55);
      tone(ac, "sine",     f * 4, 0.05, 0.04);
      haptic.light();
    } catch { /* */ }
  },

  /** Hyper-spin → sleeve — rising pitch sweep */
  spinUp() {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(60, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, ac.currentTime + 0.5);
      g.gain.setValueAtTime(0.10, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.55);
      osc.connect(g);
      g.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.55);
      haptic.strong();
    } catch { /* */ }
  },

  /** Sleeve reveal — static settle + warm C-E-G chime */
  sleeveReveal() {
    try {
      const ac = getCtx();
      filteredNoise(ac, 0.35, 0.055, "bandpass", 2200);
      [262, 330, 392].forEach((f, i) => tone(ac, "sine", f, 0.10, 0.5, i * 0.13));
      haptic.celebrate();
    } catch { /* */ }
  },

  /** Share / copy tap */
  copy() {
    try {
      const ac = getCtx();
      tone(ac, "sine", 880,  0.06, 0.08);
      tone(ac, "sine", 1320, 0.04, 0.06, 0.06);
      haptic.click();
    } catch { /* */ }
  },
};

/* ════════════════════════════════════════════════════════════════
   COSMIC  — celestial, ethereal, space
   ════════════════════════════════════════════════════════════════ */

export const cosmic = {
  /** Hold-start pulse — low detuned drone, builds energy */
  holdPulse() {
    try {
      const ac = getCtx();
      const osc1 = ac.createOscillator();
      const osc2 = ac.createOscillator();
      const g    = ac.createGain();
      osc1.type = "sine"; osc1.frequency.value = 90;
      osc2.type = "sine"; osc2.frequency.value = 91.6;
      g.gain.setValueAtTime(0, ac.currentTime);
      g.gain.linearRampToValueAtTime(0.08, ac.currentTime + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
      osc1.connect(g); osc2.connect(g); g.connect(ac.destination);
      osc1.start(); osc2.start();
      osc1.stop(ac.currentTime + 0.35); osc2.stop(ac.currentTime + 0.35);
      haptic.light();
    } catch { /* */ }
  },

  /** Stars scatter — ascending whoosh */
  launch() {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const g   = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(160, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2600, ac.currentTime + 0.26);
      osc.frequency.exponentialRampToValueAtTime(80,   ac.currentTime + 0.58);
      g.gain.setValueAtTime(0.16, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.58);
      osc.connect(g); g.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + 0.58);
      filteredNoise(ac, 0.28, 0.04, "highpass", 5500);
      haptic.strong();
    } catch { /* */ }
  },

  /** Individual star tap — celestial bell, different pitch per tap */
  starClick(nth: number) {
    try {
      const ac = getCtx();
      const freqs = [1047, 1319, 1568, 2093]; // C6 E6 G6 C7
      const f = freqs[nth % freqs.length];
      tone(ac, "sine", f,     0.12, 0.45);
      tone(ac, "sine", f * 2, 0.04, 0.22, 0.01);
      haptic.light();
    } catch { /* */ }
  },

  /** All stars clicked — deep boom + sparkle cascade */
  supernova() {
    try {
      const ac = getCtx();
      const boom = ac.createOscillator();
      const bg   = ac.createGain();
      boom.type = "sine";
      boom.frequency.setValueAtTime(80, ac.currentTime);
      boom.frequency.exponentialRampToValueAtTime(30, ac.currentTime + 0.45);
      bg.gain.setValueAtTime(0.42, ac.currentTime);
      bg.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.55);
      boom.connect(bg); bg.connect(ac.destination);
      boom.start(); boom.stop(ac.currentTime + 0.55);
      [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone(ac, "sine", f, 0.08, 0.4, i * 0.065));
      haptic.celebrate();
    } catch { /* */ }
  },

  /** Share / copy tap */
  copy() {
    try {
      const ac = getCtx();
      tone(ac, "sine", 1047, 0.05, 0.12);
      tone(ac, "sine", 1568, 0.04, 0.08, 0.07);
      haptic.click();
    } catch { /* */ }
  },
};

/* ════════════════════════════════════════════════════════════════
   ENVELOPE  — warm, romantic, papery
   ════════════════════════════════════════════════════════════════ */

export const envelope = {
  /** Slider grab — soft paper rustle */
  slideStart() {
    try {
      const ac = getCtx();
      filteredNoise(ac, 0.18, 0.08, "bandpass", 3200);
      haptic.light();
    } catch { /* */ }
  },

  /** Slider unlock — rising paper zip */
  open() {
    try {
      const ac = getCtx();
      filteredNoise(ac, 0.22, 0.18, "bandpass", 800, 5000);
      haptic.medium();
    } catch { /* */ }
  },

  /** Orb tap — warm heartbeat pulse (lub-dub) */
  orbTap() {
    try {
      const ac = getCtx();
      tone(ac, "sine", 76, 0.26, 0.14);
      tone(ac, "sine", 68, 0.17, 0.10, 0.17);
      haptic.light();
    } catch { /* */ }
  },

  /** All orbs clicked — ascending 5-note arpeggio celebration */
  finale() {
    try {
      const ac = getCtx();
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(ac, "sine", f, 0.10, 0.45, i * 0.10));
      haptic.celebrate();
    } catch { /* */ }
  },

  /** Share / copy tap */
  copy() {
    try {
      const ac = getCtx();
      tone(ac, "sine", 660, 0.06, 0.09);
      haptic.click();
    } catch { /* */ }
  },
};
