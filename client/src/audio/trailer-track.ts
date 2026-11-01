// The trailer theme: a ~56 s non-looping score built from the shared timeline in trailer-cues.ts.
// Structure (seconds): ominous pad + clock ticks (0-11) / arpeggio builds (5-) / BRAAMs on the title cards (11, 17, 22.5, 31.5) /
// riser (30-36) / DROP with a driving beat (36-49) with a one-beat breath for the eye (41-42.5) / silence (49-49.5) /
// final hit + long reverb tail (49.5) / warm D-major resolve (49.5-56).
import type { LayerDef, TrackDef } from './rig';
import { chordToMidi, noteToMidi, STEPS_PER_BAR } from './sequencer';
import { TRAILER_BARS, TRAILER_BPM, TRAILER_CUES, TRAILER_MARKS, type CueKind } from './trailer-cues';

const SD = 60 / TRAILER_BPM / 4; // one 1/16 step in seconds
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const noteName = (m: number): string => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
const rootOf = (c: string): string => /^[A-G][#b]?/.exec(c)![0];

type Ev = readonly [sec: number, token: string, len?: number];

/** Lays events (seconds) onto the 16-step bar grid. Pitched layers hold notes for `len` seconds; drum layers (compact) ignore it. */
function toBars(events: readonly Ev[], compact = false): string[] {
  const total = TRAILER_BARS * STEPS_PER_BAR;
  const cells = new Array<string>(total).fill('.');
  for (const [sec, tok, len] of [...events].sort((a, b) => a[0] - b[0])) {
    const i = Math.round(sec / SD);
    if (i < 0 || i >= total) continue;
    cells[i] = tok;
    if (compact) continue;
    const n = Math.max(1, Math.round((len ?? SD) / SD));
    for (let k = 1; k < n && i + k < total; k++) cells[i + k] = '-';
    for (let k = i + n; k < total && cells[k] === '-'; k++) cells[k] = '.'; // drop holds inherited from an earlier note
  }
  const bars: string[] = [];
  for (let b = 0; b < TRAILER_BARS; b++) {
    const row = cells.slice(b * STEPS_PER_BAR, (b + 1) * STEPS_PER_BAR);
    bars.push(compact ? row.join('') : row.join(' '));
  }
  return bars;
}

const range = (from: number, to: number, step: number): number[] => {
  const out: number[] = [];
  for (let t = from; t < to - 1e-6; t += step) out.push(Math.round(t * 1000) / 1000);
  return out;
};

// ---- harmony: one chord per 2 s bar
const CYCLE = ['Dm9', 'Bbmaj7', 'Gm9', 'A7sus4'];
const PROG: string[] = Array.from({ length: TRAILER_BARS }, (_, b) => CYCLE[b % 4]!);
[['Gm9', 14], ['A7sus4', 15], ['Bbmaj7', 16], ['A7sus4', 17], ['Dm9', 18], ['Bbmaj7', 19], ['Gm9', 20], ['A7sus4', 21], ['Bbmaj7', 22], ['A7sus4', 23], ['A7sus4', 24]].forEach(([c, b]) => (PROG[b as number] = c as string));
const chordAt = (sec: number): string => PROG[Math.min(TRAILER_BARS - 1, Math.floor(sec / (SD * 16)))]!;
const triad = (c: string): string => (/^[A-G][#b]?m(?!aj)/.test(c) ? `${rootOf(c)}m` : rootOf(c));
/** Root at octave 2 (D2..Bb2: all above 70 Hz). */
const rootLow = (sec: number): string => noteName(noteToMidi(`${rootOf(chordAt(sec))}2`));

// ---- tension schedule helpers
const inSilence = (t: number): boolean => t >= TRAILER_MARKS.silence - 1e-6 && t < TRAILER_MARKS.final - 1e-6;
const inBreath = (t: number): boolean => t >= TRAILER_MARKS.breath - 1e-6 && t < 42.5 - 1e-6;
const inDrive = (t: number): boolean => t >= TRAILER_MARKS.drop - 1e-6 && t < 49 - 1e-6 && !inBreath(t);
/** Melodic layers duck briefly after a title hit, like in real trailers. */
const ducked = (t: number): boolean => TRAILER_CUES.some((c) => t >= c.t && t < c.t + (c.kind === 'braam' || c.kind === 'eye' ? 0.5 : c.kind === 'hit' ? 0.25 : 0));

// ---- pads and drone
const padEv: Ev[] = [];
for (let b = 0; b < TRAILER_BARS; b++) {
  const t = b * SD * 16;
  if (t >= 49.5) break;
  const vel = Math.min(1, 0.4 + b * 0.035);
  padEv.push([t, `${PROG[b]}/3@${vel.toFixed(2)}`, b === 24 ? 1.5 : 2]);
}
padEv.push([49.5, 'Dmaj9/3@1', 2.6], [52, 'Gmaj9/3@0.9', 2], [54, 'Dmaj9/3@0.8', 2]);
const droneEv: Ev[] = [[0, 'D1@0.7', 36], [36, 'D1@1', 13], [49.5, 'D1@1', 6]];

// ---- ticks
const tickEv: Ev[] = [
  ...range(0.5, 10.75, 0.5).map((t): Ev => [t, t % 2 === 0 ? 'X' : 'x']),
  ...range(11.75, 16.75, 0.25).map((t): Ev => [t, 'g']),
  ...range(25, 28.5, 0.5).map((t): Ev => [t, 'x']),
  ...range(28.5, 33.5, 0.25).map((t): Ev => [t, 'g']),
  ...range(33.5, 36, 0.125).map((t): Ev => [t, 'g']),
];

// ---- arpeggio (pluck) on the current chord, getting denser and louder
const ARP_ORDER = [0, 2, 1, 3, 2, 4, 3, 1];
const arpEv: Ev[] = [];
const arpWindow = (from: number, to: number, step: number, v0: number, v1: number): void => {
  const n = Math.round((to - from) / step);
  range(from, to, step).forEach((t, i) => {
    if (ducked(t) || inSilence(t) || inBreath(t)) return;
    const tones = chordToMidi(`${chordAt(t)}/4`)!;
    const idx = ARP_ORDER[Math.round((t - from) / step) % ARP_ORDER.length]!;
    const midi = tones[idx % tones.length]! + 12 * Math.floor(idx / tones.length);
    arpEv.push([t, `${noteName(midi)}@${(v0 + ((v1 - v0) * i) / Math.max(1, n)).toFixed(2)}`, step * 1.5]);
  });
};
arpWindow(TRAILER_MARKS.arp, 11, 0.25, 0.3, 0.55);
arpWindow(11, 22.5, 0.25, 0.55, 0.7);
arpWindow(22.5, 36, 0.125, 0.5, 0.8);
arpWindow(36, 49, 0.125, 0.8, 0.85);

// ---- bass pulse
const bassEv: Ev[] = [];
for (const t of range(8, 11, 0.5)) bassEv.push([t, `${rootLow(t)}@0.55`, 0.4]);
for (const t of range(11, 36, 0.25)) {
  if (ducked(t)) continue;
  const off = Math.round(t * 4) % 2 === 1;
  bassEv.push([t, `${off ? noteName(noteToMidi(rootLow(t)) + 12) : rootLow(t)}@${(0.6 + Math.min(0.3, (t - 11) / 80)).toFixed(2)}`, 0.2]);
}
for (const t of range(36, 49, 0.25)) {
  if (inBreath(t) || inSilence(t)) continue;
  const off = Math.round(t * 4) % 2 === 1;
  bassEv.push([t, `${off ? noteName(noteToMidi(rootLow(t)) + 12) : rootLow(t)}@${off ? 0.7 : 1}`, 0.2]);
}

// ---- drums
const kickEv: Ev[] = [
  ...range(25, 28.5, 1).map((t): Ev => [t, 'x']),
  ...range(28.5, 36, 0.5).map((t): Ev => [t, t % 2 === 0 ? 'X' : 'x']),
  ...range(36, 41, 0.5).map((t): Ev => [t, 'X']),
  [41, 'X'], [41.25, 'g'], [41.75, 'x'], [42, 'g'],
  ...range(42.5, 49, 0.5).map((t): Ev => [t, 'X']),
];
const snareEv: Ev[] = [
  ...[...range(36.5, 41, 1), ...range(42.5, 48, 1)].map((t): Ev => [t, 'x']),
  ...['g', 'g', 'g', 'x', 'x', 'x', 'X', 'X'].map((c, i): Ev => [48 + i * 0.125, c]),
];
const hatEv: Ev[] = [...range(36.25, 41, 0.5), ...range(42.75, 48, 0.5)].map((t): Ev => [t, 'x']);
const stabEv: Ev[] = [];
for (let b = 18; b < 24; b++) {
  for (const step of [0, 3, 6, 10, 14]) {
    const t = (b * 16 + step) * SD;
    if ((t >= 41 && t < 42.5) || t < 36 || t >= 48.5 || (t > 36.2 && t < 36.4)) continue;
    stabEv.push([t, `${triad(PROG[b]!)}/3@${step === 0 ? 0.95 : 0.75}`, 0.2]);
  }
}
const leadEv: Ev[] = [
  [36, 'A4@0.8', 1], [37, 'D5@0.8', 0.5], [37.5, 'F5@0.8', 0.5], [38, 'G5@0.85', 1], [39, 'F5@0.8', 0.5], [39.5, 'D5@0.8', 0.5], [40.5, 'D5@0.85', 0.5],
  [42.5, 'A5@0.9', 0.5], [43, 'D6@0.9', 1], [44, 'C6@0.85', 0.5],
];

// ---- risers
const riserEv: Ev[] = [[TRAILER_MARKS.riser, 'C5', 6], [47, 'C5', 2.5]];

// ---- hits from the shared cue table
const braamEv: Ev[] = [];
const braamHiEv: Ev[] = [];
const impEv: Ev[] = [];
const impBigEv: Ev[] = [];
const impFinalEv: Ev[] = [];
const BRAAM_LEN: Record<CueKind, number> = { soft: 0, hit: 0.45, braam: 1.5, drop: 3, eye: 2, final: 4.2 };
for (const c of TRAILER_CUES) {
  if (c.kind === 'soft') {
    impEv.push([c.t, 'g']);
    continue;
  }
  const root = rootLow(c.t);
  braamEv.push([c.t, `${root}@${c.kind === 'hit' ? 0.65 : 1}`, BRAAM_LEN[c.kind]]);
  if (c.kind === 'final') braamHiEv.push([c.t, `${noteName(noteToMidi('D3'))}@0.8`, 3.6]);
  if (c.kind === 'drop' || c.kind === 'eye') braamHiEv.push([c.t, `${noteName(noteToMidi(root) + 7)}@0.6`, 2]);
  if (c.kind === 'final') impFinalEv.push([c.t, 'X']);
  else if (c.kind === 'drop' || c.kind === 'eye') impBigEv.push([c.t, 'X']);
  else impEv.push([c.t, c.kind === 'hit' ? 'x' : 'X']);
}

// ---- eerie pings, then the warm resolve sparkle
const dripEv: Ev[] = [[1.25, 'A5@0.7'], [3.75, 'E6@0.6'], [6.25, 'A5@0.6'], [8.75, 'F6@0.6'], [13, 'D6@0.5'], [19.25, 'A5@0.5']];
const bellEv: Ev[] = ([[50, 'A5', 0.7], [50.5, 'D6', 0.7], [51, 'F#6', 0.65], [52, 'B5', 0.6], [52.5, 'D6', 0.6], [53, 'G6', 0.55], [54, 'F#6', 0.5], [54.5, 'A6', 0.45], [55, 'D7', 0.4]] as const)
  .map(([t, n, v]): Ev => [t, `${n}@${v}`]);

const L = (inst: LayerDef['inst'], ev: readonly Ev[], o: Omit<LayerDef, 'inst' | 'pat'> = {}): LayerDef => ({
  inst, pat: toBars(ev, ['kick', 'snare', 'hat', 'tick', 'impact'].includes(inst)), ...o,
});

export const trailer: TrackDef = {
  bpm: TRAILER_BPM, swing: 0, bars: TRAILER_BARS, loop: false, gain: 1.3, echo: 3, echoFeedback: 0.36, reverb: { seconds: 4.4, mix: 0.5 },
  layers: [
    L('pad', padEv, { gain: 1.1, rev: 0.6, pan: -0.1, p: { cut: 1000, a: 0.9, r: 1.8 } }),
    L('drone', droneEv, { gain: 0.9, rev: 0.2, p: { cut: 240 } }),
    L('tick', tickEv, { gain: 0.9, pan: 0.3, rev: 0.1 }),
    L('drip', dripEv, { gain: 0.8, rev: 0.8, dly: 0.6, pan: -0.2 }),
    L('pluck', arpEv, { gain: 0.8, rev: 0.25, dly: 0.3, pan: 0.2, p: { wave: 1, cut: 2300, decay: 0.2 } }),
    L('bass', bassEv, { gain: 0.7, p: { cut: 620, max: 0.3 } }),
    L('kick', kickEv, { gain: 0.4, rev: 0.05, p: { low: 42, decay: 0.34 } }),
    L('snare', snareEv, { gain: 0.7, rev: 0.3, p: { tone: 2000 } }),
    L('hat', hatEv, { gain: 0.7, pan: 0.25 }),
    L('stab', stabEv, { gain: 0.42, rev: 0.25, dly: 0.15, pan: -0.25, p: { cut: 2100 } }),
    L('lead', leadEv, { gain: 0.85, rev: 0.35, dly: 0.3, p: { cut: 2700, vib: 8 } }),
    L('riser', riserEv, { gain: 1, rev: 0.4 }),
    L('braam', braamEv, { gain: 0.62, rev: 0.45, p: { cut: 1500 } }),
    L('braam', braamHiEv, { gain: 0.5, rev: 0.5, p: { cut: 1100 } }),
    L('impact', impEv, { gain: 0.3, rev: 0.35, p: { len: 1.0, amp: 0.8 } }),
    L('impact', impBigEv, { gain: 0.25, rev: 0.45, p: { len: 2.2, amp: 1.05 } }),
    L('impact', impFinalEv, { gain: 0.38, rev: 0.7, p: { len: 4.4, amp: 1.2 } }),
    L('bell', bellEv, { gain: 0.9, rev: 0.8, dly: 0.4, p: { decay: 3 } }),
  ],
};
