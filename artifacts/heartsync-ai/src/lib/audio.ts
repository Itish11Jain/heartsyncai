/**
 * HeartSync AI — Sound effects, haptics, and continuous background music.
 *
 * Background music uses the Web Audio API lookahead scheduling pattern:
 * a setInterval tick fires every 150 ms and schedules oscillator notes
 * up to 0.40 s ahead, producing seamless looping melodies with no gaps.
 *
 * Three distinct melodies:
 *   vinyl    — warm, bouncy C-major (100 BPM, 9.6 s loop)
 *   cosmic   — floating, ethereal pentatonic (88 BPM, 8.2 s loop)
 *   envelope — sweet waltz "Ode to Joy" (100 BPM, 14.4 s loop)
 */

/* ── AudioContext singleton ───────────────────────────────────── */

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

/* ── One-shot musical tone helper ────────────────────────────── */

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
  if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur * 0.8);

  g.gain.setValueAtTime(0.001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.setValueAtTime(gain * 0.8, t0 + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/* ── Musical note frequencies (Hz) ──────────────────────────── */

const N = {
  G2: 98.00,  A2: 110.00, C3: 130.81, G3: 196.00,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
  B5: 987.77,
  C6: 1046.50, D6: 1174.66, E6: 1318.51, G6: 1567.98,
};

/* ══════════════════════════════════════════════════════════════
   CONTINUOUS BACKGROUND MUSIC  — lookahead scheduler
   ══════════════════════════════════════════════════════════════ */

const LOOK_AHEAD = 0.40;  // seconds to schedule ahead
const TICK_MS    = 150;   // scheduler tick interval (ms)

type MStep = {
  freq: number;          // melody note (0 = rest)
  dur: number;           // step duration in seconds
  gain?: number;         // melody note gain (default 0.10)
  wave?: OscillatorType; // melody wave type (default "sine")
  bass?: number;         // simultaneous bass note (0 = none)
  bassGain?: number;     // bass gain (default 0.06)
  bassDur?: number;      // bass duration override (default = dur)
};

interface MusicState {
  seq: MStep[];
  idx: number;
  nextTime: number;
  masterGain: GainNode;
  timer: ReturnType<typeof setInterval> | null;
}

let _music: MusicState | null = null;

function _musicTick() {
  if (!_music) return;
  const ac = getCtx();

  // If AudioContext was suspended and resumed late, resync to now
  if (_music.nextTime < ac.currentTime - 1.5) {
    _music.nextTime = ac.currentTime + 0.05;
    _music.idx = 0;
  }

  while (_music.nextTime < ac.currentTime + LOOK_AHEAD) {
    const step = _music.seq[_music.idx % _music.seq.length]!;
    const t0   = _music.nextTime;
    const dur  = step.dur;

    /* Melody note */
    if (step.freq > 0) {
      const g    = step.gain ?? 0.10;
      const wave = step.wave ?? "sine";
      const osc  = ac.createOscillator();
      const gNode = ac.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(step.freq, t0);
      gNode.gain.setValueAtTime(0.001, t0);
      gNode.gain.linearRampToValueAtTime(g, t0 + 0.020);
      gNode.gain.setValueAtTime(g * 0.85, t0 + dur * 0.45);
      gNode.gain.linearRampToValueAtTime(0.001, t0 + dur * 0.90);
      osc.connect(gNode);
      gNode.connect(_music.masterGain);
      osc.start(t0);
      osc.stop(t0 + dur);
    }

    /* Bass / harmony note */
    if ((step.bass ?? 0) > 0) {
      const bg   = step.bassGain ?? 0.065;
      const bdur = step.bassDur  ?? dur;
      const bosc  = ac.createOscillator();
      const bgNode = ac.createGain();
      bosc.type = "triangle";
      bosc.frequency.setValueAtTime(step.bass!, t0);
      bgNode.gain.setValueAtTime(0.001, t0);
      bgNode.gain.linearRampToValueAtTime(bg, t0 + 0.030);
      bgNode.gain.setValueAtTime(bg * 0.80, t0 + bdur * 0.50);
      bgNode.gain.linearRampToValueAtTime(0.001, t0 + bdur * 0.88);
      bosc.connect(bgNode);
      bgNode.connect(_music.masterGain);
      bosc.start(t0);
      bosc.stop(t0 + bdur);
    }

    _music.nextTime += dur;
    _music.idx++;
  }
}

/* ── Melody sequences ─────────────────────────────────────────
   Tempo conventions used below:
     Q  = quarter note  (0.60 s at 100 BPM)
     E  = eighth note   (0.30 s)
     H  = half note     (1.20 s)
     Qc = quarter note  (0.68 s at 88 BPM, cosmic only)
     Ec = eighth note   (0.34 s)
     Hc = half note     (1.36 s)
─────────────────────────────────────────────────────────────── */

const Q  = 0.60;   // 100 BPM quarter note
const E  = Q / 2;  // 100 BPM eighth note
const H  = Q * 2;  // 100 BPM half note

const Qc = 0.68;         // 88 BPM quarter note
const Ec = Qc / 2;       // 88 BPM eighth note
const Hc = Qc * 2;       // 88 BPM half note

/* VINYL — warm, bouncy C-major melody (9.6 s loop, I-vi-V-I bass)
   Bar 1: C E G·· | Bar 2: A G E·· | Bar 3: D E·C·D·· | Bar 4: E G C··  */
const VINYL_SEQ: MStep[] = [
  // Bar 1  (bass: C3)
  { freq: N.C5, dur: Q, bass: N.C3, bassDur: H },
  { freq: N.E5, dur: Q },
  { freq: N.G5, dur: H },
  // Bar 2  (bass: A2)
  { freq: N.A5, dur: Q, bass: N.A2, bassDur: H },
  { freq: N.G5, dur: Q },
  { freq: N.E5, dur: H },
  // Bar 3  (bass: G2)
  { freq: N.D5, dur: Q, bass: N.G2, bassDur: H },
  { freq: N.E5, dur: E },
  { freq: N.C5, dur: E },
  { freq: N.D5, dur: H },
  // Bar 4  (bass: C3)
  { freq: N.E5, dur: Q, bass: N.C3, bassDur: H },
  { freq: N.G5, dur: Q },
  { freq: N.C5, dur: H },
];

/* COSMIC — floating pentatonic (8.16 s loop, spacious half-note bass)
   Bar 1: C·E·G A·· | Bar 2: G E·D· C·· | Bar 3: E·G· A·· E      */
const COSMIC_SEQ: MStep[] = [
  // Bar 1  (bass: C3 sustained)
  { freq: N.C5, dur: Ec, bass: N.C3, bassDur: Hc },
  { freq: N.E5, dur: Ec },
  { freq: N.G5, dur: Qc },
  { freq: N.A5, dur: Hc },
  // Bar 2  (bass: G2 sustained)
  { freq: N.G5, dur: Qc, bass: N.G2, bassDur: Hc },
  { freq: N.E5, dur: Ec },
  { freq: N.D5, dur: Ec },
  { freq: N.C5, dur: Hc },
  // Bar 3  (bass: A2 sustained)
  { freq: N.E5, dur: Ec, bass: N.A2, bassDur: Hc },
  { freq: N.G5, dur: Ec },
  { freq: N.A5, dur: Hc },
  { freq: N.E5, dur: Qc },
];

/* ENVELOPE — waltz "Ode to Joy" in C-major (14.4 s loop, 3/4 feel)
   E D C | D E E | E·· - | D D D | E G G | G·· - | E D C | D C··  */
const ENVELOPE_SEQ: MStep[] = [
  // Bar 1 (bass: C3)
  { freq: N.E5, dur: Q, bass: N.C3, bassDur: H },
  { freq: N.D5, dur: Q },
  { freq: N.C5, dur: Q },
  // Bar 2 (bass: G2)
  { freq: N.D5, dur: Q, bass: N.G2, bassDur: H },
  { freq: N.E5, dur: Q },
  { freq: N.E5, dur: Q },
  // Bar 3 (bass: C3, half note held)
  { freq: N.E5, dur: H, bass: N.C3, bassDur: H },
  { freq: 0,    dur: Q },                            // rest
  // Bar 4 (bass: G2)
  { freq: N.D5, dur: Q, bass: N.G2, bassDur: H },
  { freq: N.D5, dur: Q },
  { freq: N.D5, dur: Q },
  // Bar 5 (bass: C3)
  { freq: N.E5, dur: Q, bass: N.C3, bassDur: H },
  { freq: N.G5, dur: Q },
  { freq: N.G5, dur: Q },
  // Bar 6 (bass: G2, half note held)
  { freq: N.G5, dur: H, bass: N.G2, bassDur: H },
  { freq: 0,    dur: Q },                            // rest
  // Bar 7 (bass: A2)
  { freq: N.E5, dur: Q, bass: N.A2, bassDur: H },
  { freq: N.D5, dur: Q },
  { freq: N.C5, dur: Q },
  // Bar 8 (bass: G2)
  { freq: N.D5, dur: Q, bass: N.G2, bassDur: H },
  { freq: N.C5, dur: H },
];

export const music = {
  start(template: "vinyl" | "cosmic" | "envelope"): void {
    music.stop(); // clean up any existing music
    try {
      const ac = getCtx();

      const master = ac.createGain();
      master.gain.setValueAtTime(0.001, ac.currentTime);
      master.gain.linearRampToValueAtTime(1.0, ac.currentTime + 1.8); // fade in
      master.connect(ac.destination);

      const seq =
        template === "vinyl"    ? VINYL_SEQ    :
        template === "cosmic"   ? COSMIC_SEQ   :
                                  ENVELOPE_SEQ;

      _music = {
        seq,
        idx: 0,
        nextTime: ac.currentTime + 0.08,
        masterGain: master,
        timer: null,
      };

      _musicTick();
      _music.timer = setInterval(_musicTick, TICK_MS);
    } catch { /* AudioContext unavailable */ }
  },

  stop(): void {
    if (!_music) return;
    if (_music.timer !== null) clearInterval(_music.timer);
    try {
      const ac = getCtx();
      const g = _music.masterGain;
      g.gain.cancelScheduledValues(ac.currentTime);
      g.gain.setValueAtTime(g.gain.value, ac.currentTime);
      g.gain.linearRampToValueAtTime(0.001, ac.currentTime + 1.2); // fade out
      setTimeout(() => { try { g.disconnect(); } catch { /* */ } }, 1400);
    } catch { /* */ }
    _music = null;
  },
};

/* ══════════════════════════════════════════════════════════════
   HOME  — soft CTA sounds
   ══════════════════════════════════════════════════════════════ */

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

/* ══════════════════════════════════════════════════════════════
   VINYL  — warm music-box interaction sounds
   ══════════════════════════════════════════════════════════════ */

const VINYL_PENTA = [N.C5, N.D5, N.E5, N.G5, N.A5];

export const vinyl = {
  pressToPlay() {
    try {
      const ac = getCtx();
      [N.C4, N.E4, N.G4, N.C5].forEach((f, i) => playNote(ac, f, 0.14, 0.50, i * 0.09, "triangle"));
      haptic.medium();
    } catch { /* */ }
  },
  noteTap(idx: number) {
    try {
      const ac = getCtx();
      playNote(ac, VINYL_PENTA[idx % 5]!, 0.13, 0.38, 0, "triangle");
      haptic.light();
    } catch { /* */ }
  },
  spinUp() {
    try {
      const ac = getCtx();
      [N.C4, N.E4, N.G4, N.C5, N.E5, N.G5, N.C6].forEach((f, i) =>
        playNote(ac, f, 0.10 + i * 0.015, 0.40, i * 0.065, "triangle"),
      );
      haptic.strong();
    } catch { /* */ }
  },
  sleeveReveal() {
    try {
      const ac = getCtx();
      [N.C5, N.E5, N.G5].forEach(f => playNote(ac, f, 0.12, 0.65, 0, "sine"));
      playNote(ac, N.C6, 0.14, 0.55, 0.15, "sine");
      [N.G5, N.A5, N.C6, N.D6, N.E6].forEach((f, i) =>
        playNote(ac, f, 0.10 - i * 0.012, 0.22, 0.30 + i * 0.08, "triangle"),
      );
      haptic.celebrate();
    } catch { /* */ }
  },
  copy() {
    try {
      const ac = getCtx();
      playNote(ac, N.C6, 0.10, 0.15, 0,    "sine");
      playNote(ac, N.E6, 0.08, 0.12, 0.08, "sine");
      haptic.click();
    } catch { /* */ }
  },
};

/* ══════════════════════════════════════════════════════════════
   COSMIC  — crystal chime interaction sounds
   ══════════════════════════════════════════════════════════════ */

const COSMIC_STARS = [N.E5, N.G5, N.A5, N.B5, N.D6];

export const cosmic = {
  holdPulse() {
    try {
      const ac = getCtx();
      playNote(ac, N.G3, 0.04, 0.45, 0, "sine");
      haptic.light();
    } catch { /* */ }
  },
  launch() {
    try {
      const ac = getCtx();
      playNote(ac, N.A4, 0.09, 0.45, 0, "sine", N.A5);
      [N.C6, N.E6, N.G6].forEach((f, i) =>
        playNote(ac, f, 0.11 - i * 0.02, 0.28, 0.18 + i * 0.07, "triangle"),
      );
      haptic.strong();
    } catch { /* */ }
  },
  starClick(nth: number) {
    try {
      const ac = getCtx();
      playNote(ac, COSMIC_STARS[nth % 5]!, 0.11, 0.42, 0, "triangle");
      haptic.light();
    } catch { /* */ }
  },
  supernova() {
    try {
      const ac = getCtx();
      [N.C5, N.D5, N.E5, N.G5, N.A5, N.B5, N.D6, N.G6].forEach((f, i) =>
        playNote(ac, f, 0.13 - i * 0.01, 0.38, i * 0.07, "triangle"),
      );
      haptic.celebrate();
    } catch { /* */ }
  },
  copy() {
    try {
      const ac = getCtx();
      playNote(ac, N.G5, 0.09, 0.18, 0,    "triangle");
      playNote(ac, N.B5, 0.07, 0.14, 0.07, "triangle");
      haptic.click();
    } catch { /* */ }
  },
};

/* ══════════════════════════════════════════════════════════════
   ENVELOPE  — marimba / warm bell interaction sounds
   ══════════════════════════════════════════════════════════════ */

const ENV_PENTA  = [N.C5, N.E5, N.G5, N.A5, N.C6];
let _envOrbIdx   = 0;

export const envelope = {
  slideStart() {
    try {
      const ac = getCtx();
      playNote(ac, N.G4, 0.09, 0.32, 0, "sine", N.B5);
      haptic.light();
    } catch { /* */ }
  },
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
  orbTap() {
    try {
      const ac = getCtx();
      playNote(ac, ENV_PENTA[_envOrbIdx % 5]!, 0.12, 0.36, 0, "triangle");
      _envOrbIdx++;
      haptic.light();
    } catch { /* */ }
  },
  finale() {
    try {
      const ac = getCtx();
      [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6].forEach((f, i) =>
        playNote(ac, f, 0.12 + i * 0.008, 0.36, i * 0.082, "triangle"),
      );
      haptic.celebrate();
    } catch { /* */ }
  },
  copy() {
    try {
      const ac = getCtx();
      playNote(ac, N.G5, 0.09, 0.18, 0,    "triangle");
      playNote(ac, N.C6, 0.07, 0.14, 0.09, "sine");
      haptic.click();
    } catch { /* */ }
  },
};
