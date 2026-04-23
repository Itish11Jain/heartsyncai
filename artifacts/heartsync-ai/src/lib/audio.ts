/**
 * HeartSync AI — Sound effects + haptics
 *
 * All sounds are synthesized from filtered noise — no musical tones, no
 * oscillator beeps, nothing "video-gamey". Every sound mimics a real physical
 * sensation (crackle, rustle, whoosh, pop). Haptics carry most of the
 * interaction feedback. Sounds are kept very subtle and gracefully degrade
 * on unsupported browsers (iOS AudioContext, no Vibration API, etc.)
 */

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    _ctx = new AC();
  }
  if (_ctx.state === "suspended") void _ctx.resume();
  return _ctx;
}

/* ── Haptics ──────────────────────────────────────────────────── */

export const haptic = {
  click:     () => { try { navigator.vibrate?.(5);                     } catch { /* */ } },
  light:     () => { try { navigator.vibrate?.(10);                    } catch { /* */ } },
  medium:    () => { try { navigator.vibrate?.([15, 10, 15]);          } catch { /* */ } },
  strong:    () => { try { navigator.vibrate?.([30, 20, 40]);          } catch { /* */ } },
  celebrate: () => { try { navigator.vibrate?.([10, 20, 10, 30, 60]); } catch { /* */ } },
};

/* ── Core helper: filtered noise burst ───────────────────────── */

function noiseBurst(
  ac: AudioContext,
  duration: number,
  gain: number,
  filterType: BiquadFilterType,
  freqStart: number,
  freqEnd?: number,
  delayStart = 0,
): void {
  const bufLen = Math.floor(ac.sampleRate * duration);
  const buf    = ac.createBuffer(1, bufLen, ac.sampleRate);
  const data   = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

  const src  = ac.createBufferSource();
  src.buffer = buf;

  const filt = ac.createBiquadFilter();
  filt.type  = filterType;
  const t0   = ac.currentTime + delayStart;
  filt.frequency.setValueAtTime(freqStart, t0);
  if (freqEnd) filt.frequency.exponentialRampToValueAtTime(freqEnd, t0 + duration);

  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  src.connect(filt);
  filt.connect(g);
  g.connect(ac.destination);
  src.start(t0);
}

/* ════════════════════════════════════════════════════════════════
   HOME  — soft, welcoming
   ════════════════════════════════════════════════════════════════ */

export const home = {
  /** Main CTA tap — warm air-whoosh + celebrate haptic */
  cta() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.22, 0.10, "lowpass",  1400, 400);
      noiseBurst(ac, 0.10, 0.05, "highpass", 4000);
      haptic.medium();
    } catch { /* */ }
  },

  /** Nav / secondary link tap */
  navTap() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.04, 0.05, "bandpass", 2800);
      haptic.click();
    } catch { /* */ }
  },
};

/* ════════════════════════════════════════════════════════════════
   VINYL  — warm, analogue, tactile
   ════════════════════════════════════════════════════════════════ */

export const vinyl = {
  /** PRESS TO PLAY — needle-drop crackle */
  pressToPlay() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.35, 0.18, "bandpass", 3800);
      noiseBurst(ac, 0.20, 0.08, "lowpass",  200);
      haptic.medium();
    } catch { /* */ }
  },

  /** Note orb tap — soft organic thump */
  noteTap(_idx: number) {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.06, 0.10, "bandpass", 1800);
      haptic.light();
    } catch { /* */ }
  },

  /** Hyper-spin → sleeve — rising air-whoosh */
  spinUp() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.45, 0.14, "bandpass", 400, 8000);
      noiseBurst(ac, 0.20, 0.06, "highpass", 6000, undefined, 0.25);
      haptic.strong();
    } catch { /* */ }
  },

  /** Sleeve reveal — warm breath-whoosh + confetti pops */
  sleeveReveal() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.55, 0.12, "lowpass",  2200, 600);
      [0, 0.07, 0.16, 0.27, 0.40].forEach(d =>
        noiseBurst(ac, 0.06, 0.08 - d * 0.1, "bandpass", 2000 + d * 1800, undefined, d),
      );
      haptic.celebrate();
    } catch { /* */ }
  },

  /** Share / copy tap — micro-click */
  copy() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.03, 0.06, "bandpass", 3500);
      haptic.click();
    } catch { /* */ }
  },
};

/* ════════════════════════════════════════════════════════════════
   COSMIC  — ethereal, space-like
   ════════════════════════════════════════════════════════════════ */

export const cosmic = {
  /** Hold-start — subtle low rumble */
  holdPulse() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.25, 0.06, "lowpass", 180);
      haptic.light();
    } catch { /* */ }
  },

  /** Stars scatter — deep space whoosh */
  launch() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.50, 0.14, "bandpass", 200, 6000);
      noiseBurst(ac, 0.20, 0.05, "highpass", 7000, undefined, 0.15);
      haptic.strong();
    } catch { /* */ }
  },

  /** Star tap — short sparkle fizz */
  starClick(_nth: number) {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.07, 0.08, "highpass", 5500);
      haptic.light();
    } catch { /* */ }
  },

  /** All stars — supernova explosion (big low boom + shimmer) */
  supernova() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.55, 0.22, "lowpass",  300);
      noiseBurst(ac, 0.30, 0.10, "bandpass", 800, 4000, 0.05);
      [0, 0.08, 0.18, 0.30, 0.44].forEach(d =>
        noiseBurst(ac, 0.06, 0.09 - d * 0.12, "highpass", 4500, undefined, d),
      );
      haptic.celebrate();
    } catch { /* */ }
  },

  /** Share / copy tap */
  copy() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.03, 0.05, "highpass", 5000);
      haptic.click();
    } catch { /* */ }
  },
};

/* ════════════════════════════════════════════════════════════════
   ENVELOPE  — warm, papery, romantic
   ════════════════════════════════════════════════════════════════ */

export const envelope = {
  /** Slider grab — paper rustle */
  slideStart() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.18, 0.09, "highpass", 2800);
      haptic.light();
    } catch { /* */ }
  },

  /** Slider unlock — rising paper zip */
  open() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.22, 0.16, "bandpass", 700, 5500);
      haptic.medium();
    } catch { /* */ }
  },

  /** Orb tap — soft fabric puff */
  orbTap() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.07, 0.09, "bandpass", 1200);
      haptic.light();
    } catch { /* */ }
  },

  /** All orbs clicked — confetti burst cascade */
  finale() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.50, 0.14, "lowpass",  2500, 500);
      [0, 0.06, 0.14, 0.24, 0.36].forEach(d =>
        noiseBurst(ac, 0.06, 0.10 - d * 0.12, "bandpass", 1500 + d * 2200, undefined, d),
      );
      haptic.celebrate();
    } catch { /* */ }
  },

  /** Share / copy tap */
  copy() {
    try {
      const ac = getCtx();
      noiseBurst(ac, 0.03, 0.06, "bandpass", 3000);
      haptic.click();
    } catch { /* */ }
  },
};
