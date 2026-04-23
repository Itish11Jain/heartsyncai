/**
 * HeartSync AI — Sound effects + haptics
 *
 * All template sounds use real musical tones (oscillators) for a happy,
 * warm, medium-paced feel. Each template has a distinct character:
 *   VINYL  — warm music-box, nostalgic
 *   COSMIC — crystal chimes, ethereal
 *   ENVELOPE — marimba / soft bells, romantic
 * Haptics carry most of the tactile feedback. Sounds degrade gracefully.
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

/* ── Core helper: musical tone ────────────────────────────────── */

function playNote(
  ac: AudioContext,
  freq: number,
  gain: number,
  dur: number,
  delay = 0,
  wave: OscillatorType = "sine",
  freqEnd?: number,
): void {
  const osc = ac.createOscillator();
  const g   = ac.createGain();
  const t0  = ac.currentTime + delay;

  osc.type = wave;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur * 0.8);
  }

  g.gain.setValueAtTime(0.001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.setValueAtTime(gain * 0.8, t0 + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/* Musical notes — C major pentatonic */
const N = {
  C3: 130.81, G3: 196.00,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
  B5: 987.77,
  C6: 1046.50, D6: 1174.66, E6: 1318.51, G6: 1567.98,
};

/* ════════════════════════════════════════════════════════════════
   HOME  — soft, welcoming
   ════════════════════════════════════════════════════════════════ */

export const home = {
  cta() {
    try {
      const ac = getCtx();
      playNote(ac, N.C5, 0.12, 0.35, 0,    "sine");
      playNote(ac, N.E5, 0.10, 0.30, 0.09, "sine");
      playNote(ac, N.G5, 0.09, 0.28, 0.18, "sine");
      haptic.medium();
    } catch { /* */ }
  },

  navTap() {
    try {
      const ac = getCtx();
      playNote(ac, N.G5, 0.07, 0.18, 0, "sine");
      haptic.click();
    } catch { /* */ }
  },
};

/* ════════════════════════════════════════════════════════════════
   VINYL  — warm music-box, nostalgic, joyful
   ════════════════════════════════════════════════════════════════ */

const VINYL_PENTA = [N.C5, N.D5, N.E5, N.G5, N.A5];

export const vinyl = {
  /** PRESS TO PLAY — warm ascending arpeggio */
  pressToPlay() {
    try {
      const ac = getCtx();
      [N.C4, N.E4, N.G4, N.C5].forEach((freq, i) =>
        playNote(ac, freq, 0.14, 0.50, i * 0.09, "triangle"),
      );
      haptic.medium();
    } catch { /* */ }
  },

  /** Note orb tap — bright pentatonic note per idx */
  noteTap(idx: number) {
    try {
      const ac = getCtx();
      const freq = VINYL_PENTA[idx % 5]!;
      playNote(ac, freq, 0.13, 0.38, 0, "triangle");
      haptic.light();
    } catch { /* */ }
  },

  /** Hyper-spin → sleeve — rising strum */
  spinUp() {
    try {
      const ac = getCtx();
      [N.C4, N.E4, N.G4, N.C5, N.E5, N.G5, N.C6].forEach((freq, i) =>
        playNote(ac, freq, 0.10 + i * 0.015, 0.40, i * 0.065, "triangle"),
      );
      haptic.strong();
    } catch { /* */ }
  },

  /** Sleeve reveal — joyful fanfare + shimmer */
  sleeveReveal() {
    try {
      const ac = getCtx();
      /* Chord swell */
      [N.C5, N.E5, N.G5].forEach(freq =>
        playNote(ac, freq, 0.12, 0.65, 0, "sine"),
      );
      /* Bright top note + sparkle cascade */
      playNote(ac, N.C6, 0.14, 0.55, 0.15, "sine");
      [N.G5, N.A5, N.C6, N.D6, N.E6].forEach((freq, i) =>
        playNote(ac, freq, 0.10 - i * 0.012, 0.22, 0.30 + i * 0.08, "triangle"),
      );
      haptic.celebrate();
    } catch { /* */ }
  },

  /** Share / copy — double ping */
  copy() {
    try {
      const ac = getCtx();
      playNote(ac, N.C6, 0.10, 0.15, 0,    "sine");
      playNote(ac, N.E6, 0.08, 0.12, 0.08, "sine");
      haptic.click();
    } catch { /* */ }
  },
};

/* ════════════════════════════════════════════════════════════════
   COSMIC  — crystal chimes, ethereal, magical
   ════════════════════════════════════════════════════════════════ */

const COSMIC_STARS = [N.E5, N.G5, N.A5, N.B5, N.D6];

export const cosmic = {
  /** Hold-start — gentle low hum */
  holdPulse() {
    try {
      const ac = getCtx();
      playNote(ac, N.G3, 0.04, 0.45, 0, "sine");
      haptic.light();
    } catch { /* */ }
  },

  /** Stars scatter — ascending shimmer */
  launch() {
    try {
      const ac = getCtx();
      /* Ascending sweep */
      playNote(ac, N.A4, 0.09, 0.45, 0,    "sine", N.A5);
      /* Quick chime burst */
      [N.C6, N.E6, N.G6].forEach((freq, i) =>
        playNote(ac, freq, 0.11 - i * 0.02, 0.28, 0.18 + i * 0.07, "triangle"),
      );
      haptic.strong();
    } catch { /* */ }
  },

  /** Star tap — unique sparkle note per star */
  starClick(nth: number) {
    try {
      const ac = getCtx();
      const freq = COSMIC_STARS[nth % 5]!;
      playNote(ac, freq, 0.11, 0.42, 0, "triangle");
      haptic.light();
    } catch { /* */ }
  },

  /** All stars — cascading bell supernova */
  supernova() {
    try {
      const ac = getCtx();
      [N.C5, N.D5, N.E5, N.G5, N.A5, N.B5, N.D6, N.G6].forEach((freq, i) =>
        playNote(ac, freq, 0.13 - i * 0.01, 0.38, i * 0.07, "triangle"),
      );
      haptic.celebrate();
    } catch { /* */ }
  },

  /** Share / copy — crystal ping */
  copy() {
    try {
      const ac = getCtx();
      playNote(ac, N.G5, 0.09, 0.18, 0,    "triangle");
      playNote(ac, N.B5, 0.07, 0.14, 0.07, "triangle");
      haptic.click();
    } catch { /* */ }
  },
};

/* ════════════════════════════════════════════════════════════════
   ENVELOPE  — marimba / warm bells, romantic, sweet
   ════════════════════════════════════════════════════════════════ */

const ENV_PENTA = [N.C5, N.E5, N.G5, N.A5, N.C6];
let _envOrbIdx = 0;

export const envelope = {
  /** Slider grab — gentle rising note */
  slideStart() {
    try {
      const ac = getCtx();
      playNote(ac, N.G4, 0.09, 0.32, 0, "sine", N.B5);
      haptic.light();
    } catch { /* */ }
  },

  /** Slider unlock — warm chord swell */
  open() {
    try {
      const ac = getCtx();
      playNote(ac, N.C4, 0.10, 0.65, 0,    "triangle");
      playNote(ac, N.E4, 0.09, 0.60, 0.04, "triangle");
      playNote(ac, N.G4, 0.08, 0.55, 0.08, "triangle");
      playNote(ac, N.C5, 0.10, 0.50, 0.15, "sine");
      haptic.medium();
    } catch { /* */ }
  },

  /** Orb tap — rotating soft pluck */
  orbTap() {
    try {
      const ac = getCtx();
      const freq = ENV_PENTA[_envOrbIdx % 5]!;
      _envOrbIdx++;
      playNote(ac, freq, 0.12, 0.36, 0, "triangle");
      haptic.light();
    } catch { /* */ }
  },

  /** All orbs — happy melody burst */
  finale() {
    try {
      const ac = getCtx();
      [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6].forEach((freq, i) =>
        playNote(ac, freq, 0.12 + i * 0.008, 0.36, i * 0.082, "triangle"),
      );
      haptic.celebrate();
    } catch { /* */ }
  },

  /** Share / copy — soft double ping */
  copy() {
    try {
      const ac = getCtx();
      playNote(ac, N.G5, 0.09, 0.18, 0,    "triangle");
      playNote(ac, N.C6, 0.07, 0.14, 0.09, "sine");
      haptic.click();
    } catch { /* */ }
  },
};
