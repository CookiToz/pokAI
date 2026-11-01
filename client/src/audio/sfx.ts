// Sound effects: one small synthesized recipe per SfxName. All recipes are fire-and-forget and level-conservative.
import type { SfxName } from './audio';
import { VOICES, noiseBuffer, noiseHit, tone, type VoiceEnv } from './synth';

type Recipe = (c: BaseAudioContext, out: AudioNode, t: number, r: () => number) => void;

const N = (name: string): number => {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name)!;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1] as 'C'];
  return 440 * Math.pow(2, (base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12 - 69) / 12);
};

const arpeggio = (c: BaseAudioContext, out: AudioNode, t: number, notes: string[], step: number, o: { type?: OscillatorType; gain: number; dur: number; cut?: number }): void => {
  notes.forEach((n, i) => tone(c, out, t + i * step, { type: o.type ?? 'sine', f0: N(n), dur: o.dur, gain: o.gain, ...(o.cut ? { cut: o.cut } : {}) }));
};

const bellAt = (c: BaseAudioContext, out: AudioNode, t: number, note: string, vel: number, decay: number): void => {
  const e: VoiceEnv = { ctx: c, out, noise: noiseBuffer(c) };
  VOICES.bell(e, t, N(note), 0.2, vel, { decay });
};

const hitBody = (c: BaseAudioContext, out: AudioNode, t: number, o: { f0: number; f1: number; gain: number; dur: number; snap: number }): void => {
  tone(c, out, t, { f0: o.f0, f1: o.f1, glide: 0.09, dur: o.dur, gain: o.gain });
  noiseHit(c, out, t, { type: 'bandpass', f0: 2200, q: 0.8, dur: 0.07, gain: o.snap });
};

export const RECIPES: Readonly<Record<SfxName, Recipe>> = {
  ui_move: (c, o, t) => tone(c, o, t, { type: 'triangle', f0: 760, f1: 700, dur: 0.045, gain: 0.07, cut: 3200 }),
  ui_confirm: (c, o, t) => {
    tone(c, o, t, { type: 'triangle', f0: N('E5'), dur: 0.08, gain: 0.1, cut: 4000 });
    tone(c, o, t + 0.06, { type: 'triangle', f0: N('B5'), dur: 0.14, gain: 0.1, cut: 4500 });
  },
  ui_back: (c, o, t) => {
    tone(c, o, t, { type: 'triangle', f0: N('B4'), dur: 0.07, gain: 0.09, cut: 3000 });
    tone(c, o, t + 0.05, { type: 'triangle', f0: N('E4'), dur: 0.12, gain: 0.09, cut: 2800 });
  },
  ui_open: (c, o, t) => {
    noiseHit(c, o, t, { type: 'bandpass', f0: 500, f1: 2600, q: 1.2, dur: 0.16, gain: 0.035, attack: 0.06 });
    tone(c, o, t + 0.05, { type: 'sine', f0: N('A5'), dur: 0.2, gain: 0.07 });
  },
  ui_close: (c, o, t) => {
    noiseHit(c, o, t, { type: 'bandpass', f0: 2400, f1: 450, q: 1.2, dur: 0.14, gain: 0.03, attack: 0.04 });
    tone(c, o, t, { type: 'sine', f0: N('E5'), f1: N('A4'), dur: 0.16, gain: 0.06 });
  },
  ui_error: (c, o, t) => {
    for (const k of [0, 0.11]) tone(c, o, t + k, { type: 'square', f0: 170, f1: 150, dur: 0.09, gain: 0.07, cut: 700 });
  },
  type_tick: (c, o, t, r) => noiseHit(c, o, t, { type: 'bandpass', f0: 2600 + r() * 1400, q: 3, dur: 0.014, gain: 0.09, attack: 0.0008 }),

  step: (c, o, t, r) => {
    noiseHit(c, o, t, { type: 'lowpass', f0: 380 + r() * 160, q: 0.7, dur: 0.06, gain: 0.14, attack: 0.004 });
  },
  door: (c, o, t) => {
    noiseHit(c, o, t, { type: 'bandpass', f0: 900, f1: 260, q: 0.9, dur: 0.22, gain: 0.07, attack: 0.03 });
    tone(c, o, t + 0.15, { f0: 110, f1: 60, dur: 0.16, gain: 0.16 });
    noiseHit(c, o, t + 0.16, { type: 'highpass', f0: 3000, q: 0.7, dur: 0.02, gain: 0.04 });
  },
  alert: (c, o, t) => {
    tone(c, o, t, { type: 'square', f0: N('A5'), dur: 0.09, gain: 0.05, cut: 2600 });
    tone(c, o, t + 0.1, { type: 'square', f0: N('E6'), dur: 0.2, gain: 0.05, cut: 2600 });
  },
  encounter: (c, o, t) => {
    noiseHit(c, o, t, { type: 'bandpass', f0: 300, f1: 5200, q: 1.4, dur: 0.45, gain: 0.07, attack: 0.1 });
    ['E6', 'C6', 'A5', 'F5', 'D5', 'A4'].forEach((n, i) => tone(c, o, t + i * 0.055, { type: 'square', f0: N(n), dur: 0.06, gain: 0.04, cut: 2400 }));
    tone(c, o, t + 0.34, { type: 'sawtooth', f0: 220, f1: 110, dur: 0.3, gain: 0.07, cut: 900 });
  },

  hit: (c, o, t) => hitBody(c, o, t, { f0: 190, f1: 60, gain: 0.3, dur: 0.18, snap: 0.12 }),
  hit_super: (c, o, t) => {
    hitBody(c, o, t, { f0: 230, f1: 55, gain: 0.36, dur: 0.22, snap: 0.17 });
    arpeggio(c, o, t + 0.04, ['E6', 'B6'], 0.05, { type: 'triangle', gain: 0.07, dur: 0.18, cut: 5000 });
    noiseHit(c, o, t, { type: 'highpass', f0: 5000, dur: 0.2, gain: 0.05 });
  },
  hit_weak: (c, o, t) => {
    tone(c, o, t, { f0: 120, f1: 55, glide: 0.08, dur: 0.14, gain: 0.2 });
    noiseHit(c, o, t, { type: 'lowpass', f0: 900, dur: 0.06, gain: 0.07 });
  },
  crit: (c, o, t) => {
    hitBody(c, o, t, { f0: 260, f1: 50, gain: 0.4, dur: 0.26, snap: 0.2 });
    bellAt(c, o, t + 0.02, 'A6', 0.7, 0.9);
    noiseHit(c, o, t, { type: 'bandpass', f0: 6000, q: 0.6, dur: 0.3, gain: 0.06 });
  },
  miss: (c, o, t) => noiseHit(c, o, t, { type: 'bandpass', f0: 3200, f1: 500, q: 1.1, dur: 0.22, gain: 0.12, attack: 0.05 }),
  status: (c, o, t) => tone(c, o, t, { type: 'sine', f0: 520, f1: 300, dur: 0.38, gain: 0.1, vib: [9, 60] }),
  heal: (c, o, t) => {
    arpeggio(c, o, t, ['C5', 'E5', 'G5', 'C6'], 0.07, { gain: 0.09, dur: 0.3 });
    tone(c, o, t + 0.28, { f0: N('E6'), dur: 0.4, gain: 0.05 });
  },
  buff: (c, o, t) => {
    arpeggio(c, o, t, ['G4', 'D5'], 0.07, { type: 'triangle', gain: 0.09, dur: 0.2, cut: 3500 });
    noiseHit(c, o, t, { type: 'bandpass', f0: 1200, f1: 4200, q: 1, dur: 0.22, gain: 0.025, attack: 0.08 });
  },
  debuff: (c, o, t) => {
    arpeggio(c, o, t, ['D5', 'G4'], 0.08, { type: 'sawtooth', gain: 0.045, dur: 0.22, cut: 900 });
    noiseHit(c, o, t, { type: 'bandpass', f0: 2400, f1: 500, q: 1, dur: 0.22, gain: 0.025, attack: 0.04 });
  },
  faint: (c, o, t) => {
    tone(c, o, t, { type: 'triangle', f0: 420, f1: 55, glide: 0.65, dur: 0.7, gain: 0.16, cut: 1800 });
    noiseHit(c, o, t, { type: 'lowpass', f0: 1500, f1: 120, q: 0.7, dur: 0.6, gain: 0.07 });
  },
  xp: (c, o, t) => {
    tone(c, o, t, { type: 'triangle', f0: N('C6'), dur: 0.05, gain: 0.05, cut: 5000 });
    tone(c, o, t + 0.05, { type: 'triangle', f0: N('G6'), dur: 0.09, gain: 0.04, cut: 5000 });
  },
  level_up: (c, o, t) => {
    arpeggio(c, o, t, ['C5', 'E5', 'G5', 'C6', 'E6'], 0.075, { type: 'triangle', gain: 0.09, dur: 0.28, cut: 5200 });
    ['C5', 'G5', 'E6'].forEach((n) => bellAt(c, o, t + 0.4, n, 0.4, 1.3));
  },
  evolve: (c, o, t) => {
    noiseHit(c, o, t, { type: 'bandpass', f0: 250, f1: 6000, q: 1.5, dur: 1.3, gain: 0.07, attack: 0.9 });
    tone(c, o, t, { type: 'sawtooth', f0: 110, f1: 440, glide: 1.3, dur: 1.4, gain: 0.05, cut: 1600, attack: 0.6 });
    ['E5', 'A5', 'C6', 'E6'].forEach((n, i) => bellAt(c, o, t + 1.3 + i * 0.06, n, 0.55, 2));
  },

  onboard_card: (c, o, t, r) => {
    noiseHit(c, o, t, { type: 'bandpass', f0: 1800 + r() * 500, q: 1.4, dur: 0.05, gain: 0.07, attack: 0.004 });
    tone(c, o, t, { type: 'triangle', f0: 540, f1: 700, dur: 0.05, gain: 0.04 });
  },
  onboard_success: (c, o, t) => {
    arpeggio(c, o, t, ['C5', 'E5', 'G5'], 0.09, { type: 'triangle', gain: 0.09, dur: 0.3, cut: 4500 });
    ['C6', 'E6', 'G6'].forEach((n) => bellAt(c, o, t + 0.3, n, 0.5, 1.6));
  },
  onboard_fail: (c, o, t) => {
    tone(c, o, t, { type: 'sawtooth', f0: 330, f1: 120, glide: 0.45, dur: 0.5, gain: 0.07, cut: 1100, vib: [14, 45] });
    noiseHit(c, o, t + 0.05, { type: 'bandpass', f0: 3600, f1: 700, q: 2, dur: 0.3, gain: 0.04 });
  },
  cookie: (c, o, t, r) => {
    for (let i = 0; i < 3; i++) noiseHit(c, o, t + i * 0.05, { type: 'bandpass', f0: 1500 + r() * 900, q: 2, dur: 0.03, gain: 0.08 });
    tone(c, o, t + 0.16, { type: 'triangle', f0: 180, f1: 120, dur: 0.12, gain: 0.12 });
  },
  coin: (c, o, t) => {
    bellAt(c, o, t, 'E6', 0.6, 0.45);
    bellAt(c, o, t + 0.07, 'B6', 0.55, 0.7);
  },
  badge: (c, o, t) => {
    arpeggio(c, o, t, ['G4', 'C5', 'E5', 'G5'], 0.11, { type: 'triangle', gain: 0.09, dur: 0.3, cut: 4500 });
    ['C5', 'E5', 'G5', 'C6'].forEach((n) => tone(c, o, t + 0.46, { type: 'triangle', f0: N(n), dur: 0.9, gain: 0.055, cut: 3500 }));
    ['C6', 'G6'].forEach((n) => bellAt(c, o, t + 0.5, n, 0.5, 1.8));
  },
};

/** Minimum gap (s) between two plays of the same effect: avoids machine-gunning on repeated events. */
export const MIN_GAP: Readonly<Partial<Record<SfxName, number>>> = {
  type_tick: 0.055, step: 0.16, ui_move: 0.035, xp: 0.04, ui_confirm: 0.05, ui_open: 0.05, ui_close: 0.05, onboard_card: 0.04,
};
