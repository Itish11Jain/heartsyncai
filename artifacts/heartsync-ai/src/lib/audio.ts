/**
 * HeartSync AI — Haptics and continuous background music.
 *
 * Background music uses the Web Audio API lookahead scheduling pattern:
 * a setInterval tick fires every 150 ms and schedules oscillator notes
 * up to 0.40 s ahead, producing seamless looping melodies with no gaps.
 *
 * Four distinct melodies:
 *   vinyl    — bright, skippy C-major at 116 BPM  (~8.3 s loop)
 *   cosmic   — sparkling pentatonic at 104 BPM    (~7.4 s loop)
 *   envelope — joyful waltz at 112 BPM            (~12.9 s loop)
 *   crystal  — ethereal A-minor bell tones at 88 BPM (~10.2 s loop)
 *
 * Interaction sounds have been intentionally removed — haptics only.
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

/* ── Haptics only — no sound effects ─────────────────────────── */

export const haptic = {
  click:     () => { try { navigator.vibrate?.(5);                     } catch { /* */ } },
  light:     () => { try { navigator.vibrate?.(10);                    } catch { /* */ } },
  medium:    () => { try { navigator.vibrate?.([15, 10, 15]);          } catch { /* */ } },
  strong:    () => { try { navigator.vibrate?.([30, 20, 40]);          } catch { /* */ } },
  celebrate: () => { try { navigator.vibrate?.([10, 20, 10, 30, 60]); } catch { /* */ } },
};

/* ── Musical note frequencies (Hz) ──────────────────────────── */

const N = {
  G2: 98.00,  A2: 110.00, C3: 130.81, G3: 196.00,
  A3: 220.00,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
  B4: 493.88,  B5: 987.77,
  C6: 1046.50, D6: 1174.66, E6: 1318.51,
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
      // Start at absolute 0, attack, then fade fully to 0 before oscillator stops
      gNode.gain.setValueAtTime(0, t0);
      gNode.gain.linearRampToValueAtTime(g, t0 + 0.025);
      gNode.gain.linearRampToValueAtTime(g * 0.75, t0 + dur * 0.50);
      gNode.gain.linearRampToValueAtTime(0, t0 + dur * 0.92);
      osc.connect(gNode);
      gNode.connect(_music.masterGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05); // stop 50 ms after gain already hit 0
    }

    _music.nextTime += dur;
    _music.idx++;
  }
}

/* ── Melody sequences ─────────────────────────────────────────
   VINYL  : 116 BPM  — Q=0.517s  E=0.259s  H=1.034s
   COSMIC : 104 BPM  — Q=0.577s  E=0.288s  H=1.154s
   ENVELOPE: 112 BPM waltz — Q=0.536s  H=1.071s
   CRYSTAL : 88 BPM  — Q=0.682s  E=0.341s  H=1.364s
─────────────────────────────────────────────────────────────── */

/* VINYL — warm, skippy major melody (116 BPM, ~8.3 s loop)
   Melody sits in the C4–C5 range for a mellow, rounded feel.
   Phrase A: C·E·G A·· | Phrase B: G·E D·C·· | Phrase C: E G A C5·· | Phrase D: G E C··
   Bass: I-vi-V-I (C3→A2→G2→C3)                                                          */
const Qv = 0.517, Ev = 0.259, Hv = 1.034;
const VINYL_SEQ: MStep[] = [
  // Phrase A
  { freq: N.C4, dur: Ev, bass: N.C3, bassDur: Hv * 0.9 },
  { freq: N.E4, dur: Ev },
  { freq: N.G4, dur: Qv },
  { freq: N.A4, dur: Hv },
  // Phrase B
  { freq: N.G4, dur: Ev, bass: N.A2, bassDur: Hv * 0.9 },
  { freq: N.E4, dur: Ev },
  { freq: N.D4, dur: Ev },
  { freq: N.C4, dur: Hv },
  // Phrase C  — climbs to C5 for a warm peak
  { freq: N.E4, dur: Ev, bass: N.G2, bassDur: Hv * 0.9 },
  { freq: N.G4, dur: Ev },
  { freq: N.A4, dur: Ev },
  { freq: N.C5, dur: Hv },
  // Phrase D  — descends home
  { freq: N.A4, dur: Ev, bass: N.C3, bassDur: Hv * 0.9 },
  { freq: N.G4, dur: Ev },
  { freq: N.E4, dur: Ev },
  { freq: N.C4, dur: Hv },
];

/* COSMIC — mellow rising pentatonic (104 BPM, ~7.4 s loop)
   Melody in C4–C5; airy arpeggios; bass: C3→G2→C3                       */
const Qc = 0.577, Ec = 0.288, Hc = 1.154;
const COSMIC_SEQ: MStep[] = [
  // Bar 1 — rise
  { freq: N.C4, dur: Ec, bass: N.C3, bassDur: Hc },
  { freq: N.E4, dur: Ec },
  { freq: N.G4, dur: Qc },
  { freq: N.C5, dur: Hc },
  // Bar 2 — float down
  { freq: N.A4, dur: Ec, bass: N.G2, bassDur: Hc },
  { freq: N.G4, dur: Ec },
  { freq: N.E4, dur: Qc },
  { freq: N.C4, dur: Hc },
  // Bar 3 — rise again
  { freq: N.G4, dur: Ec, bass: N.C3, bassDur: Hc },
  { freq: N.A4, dur: Ec },
  { freq: N.C5, dur: Hc },
  { freq: N.G4, dur: Qc },
];

/* ENVELOPE — warm waltz "Ode to Joy" (112 BPM, 3/4, ~12.9 s loop)
   Melody in C4–A4; 8 bars × 3 beats × 0.536s = 12.86 s                 */
const Qe = 0.536, He = 1.071;
const ENVELOPE_SEQ: MStep[] = [
  // Bar 1
  { freq: N.E4, dur: Qe, bass: N.C3, bassDur: He },
  { freq: N.D4, dur: Qe },
  { freq: N.C4, dur: Qe },
  // Bar 2
  { freq: N.D4, dur: Qe, bass: N.G2, bassDur: He },
  { freq: N.E4, dur: Qe },
  { freq: N.E4, dur: Qe },
  // Bar 3
  { freq: N.E4, dur: He, bass: N.C3, bassDur: He },
  { freq: 0,    dur: Qe },                            // rest
  // Bar 4
  { freq: N.D4, dur: Qe, bass: N.G2, bassDur: He },
  { freq: N.D4, dur: Qe },
  { freq: N.D4, dur: Qe },
  // Bar 5
  { freq: N.E4, dur: Qe, bass: N.C3, bassDur: He },
  { freq: N.G4, dur: Qe },
  { freq: N.A4, dur: Qe },
  // Bar 6
  { freq: N.A4, dur: He, bass: N.G2, bassDur: He },
  { freq: 0,    dur: Qe },                            // rest
  // Bar 7
  { freq: N.E4, dur: Qe, bass: N.A2, bassDur: He },
  { freq: N.D4, dur: Qe },
  { freq: N.C4, dur: Qe },
  // Bar 8
  { freq: N.D4, dur: Qe, bass: N.G2, bassDur: He },
  { freq: N.C4, dur: He },
];

/* CRYSTAL — ethereal A-minor pentatonic bell tones (88 BPM, ~10.2 s loop)
   Sine wave ("sine") for a pure, glass-bell timbre. Bass: A2→E4→A3.
   Phrase A: A4·C5·E5·A5·· | Phrase B: G5·E5·C5·A4·· | Phrase C: E5·A4·B4·C5·· | Phrase D: A4·E4·A3·· */
const Qk = 0.682, Ek = 0.341, Hk = 1.364;
const CRYSTAL_SEQ: MStep[] = [
  // Phrase A — ascent
  { freq: N.A4, dur: Ek, gain: 0.09, bass: N.A2, bassDur: Hk * 0.85 },
  { freq: N.C5, dur: Ek, gain: 0.09 },
  { freq: N.E5, dur: Qk, gain: 0.09 },
  { freq: N.A5, dur: Hk, gain: 0.07 },
  // Phrase B — descent
  { freq: N.G5, dur: Ek, gain: 0.08, bass: N.A3, bassDur: Hk * 0.85 },
  { freq: N.E5, dur: Ek, gain: 0.08 },
  { freq: N.C5, dur: Qk, gain: 0.09 },
  { freq: N.A4, dur: Hk, gain: 0.09 },
  // Phrase C — inner turn
  { freq: N.E5, dur: Ek, gain: 0.09, bass: N.A2, bassDur: Hk * 0.85 },
  { freq: N.A4, dur: Ek, gain: 0.09 },
  { freq: N.B4, dur: Ek, gain: 0.08 },
  { freq: N.C5, dur: Hk, gain: 0.09 },
  // Phrase D — resolve home
  { freq: N.A4, dur: Ek, gain: 0.09, bass: N.A3, bassDur: Hk * 0.85 },
  { freq: N.E4, dur: Ek, gain: 0.07 },
  { freq: N.A3, dur: Hk, gain: 0.06 },
];

export const music = {
  start(template: "vinyl" | "cosmic" | "envelope" | "crystal"): void {
    music.stop();
    try {
      const ac = getCtx();

      const master = ac.createGain();
      master.gain.setValueAtTime(0.001, ac.currentTime);
      master.gain.linearRampToValueAtTime(1.0, ac.currentTime + 1.8);
      master.connect(ac.destination);

      const seq =
        template === "vinyl"    ? VINYL_SEQ    :
        template === "cosmic"   ? COSMIC_SEQ   :
        template === "crystal"  ? CRYSTAL_SEQ  :
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
      g.gain.linearRampToValueAtTime(0.001, ac.currentTime + 1.2);
      setTimeout(() => { try { g.disconnect(); } catch { /* */ } }, 1400);
    } catch { /* */ }
    _music = null;
  },
};

/* ══════════════════════════════════════════════════════════════
   HOME  — haptics only
   ══════════════════════════════════════════════════════════════ */

export const home = {
  cta()    { haptic.medium(); },
  navTap() { haptic.click();  },
};

/* ══════════════════════════════════════════════════════════════
   VINYL  — haptics only
   ══════════════════════════════════════════════════════════════ */

export const vinyl = {
  pressToPlay()           { haptic.medium();    },
  noteTap(_idx: number)   { haptic.light();     },
  spinUp()                { haptic.strong();    },
  sleeveReveal()          { haptic.celebrate(); },
  copy()                  { haptic.click();     },
};

/* ══════════════════════════════════════════════════════════════
   COSMIC  — haptics only
   ══════════════════════════════════════════════════════════════ */

export const cosmic = {
  holdPulse()              { haptic.light();     },
  launch()                 { haptic.strong();    },
  starClick(_nth: number)  { haptic.light();     },
  supernova()              { haptic.celebrate(); },
  copy()                   { haptic.click();     },
};

/* ══════════════════════════════════════════════════════════════
   ENVELOPE  — haptics only
   ══════════════════════════════════════════════════════════════ */

export const envelope = {
  slideStart() { haptic.light();     },
  open()       { haptic.medium();    },
  orbTap()     { haptic.light();     },
  finale()     { haptic.celebrate(); },
  copy()       { haptic.click();     },
};

/* ══════════════════════════════════════════════════════════════
   CRYSTAL  — haptics only
   ══════════════════════════════════════════════════════════════ */

export const crystal = {
  rubPulse()   { haptic.light();     },
  reveal()     { haptic.strong();    },
  visionTap(_nth?: number) { haptic.light(); },
  shatter()    { haptic.celebrate(); },
  copy()       { haptic.click();     },
};
