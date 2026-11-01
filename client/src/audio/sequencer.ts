// Pure step-sequencer helpers (no WebAudio): pattern parsing, note maths and event compilation.
// A bar is always 16 steps (1/16 notes). Pattern grammar (whitespace-separated cells):
//   .            rest (also ends the previous note)
//   -            hold (extends the previous note)
//   C4 F#3 Bb2   a note (optional velocity suffix: C4@0.6)
//   C4+E4+G4     a chord of notes
//   Am7/3        a chord symbol, root in octave 3 (octave defaults to 3)
// Drum layers use the compact form, one char per step: x (hit), X (accent), g (ghost), . (rest).

export interface Cell {
  kind: 'rest' | 'hold' | 'hit';
  midi: number[];
  vel: number;
}

export interface StepEvent {
  midi: number[];
  /** Length in steps, including holds (at least 1). */
  len: number;
  vel: number;
}

export const STEPS_PER_BAR = 16;

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_RE = /^([A-G])([#b]?)(-?\d)(?:@([0-9.]+))?$/;
const CHORD_RE = /^([A-G][#b]?)(maj13|maj9|maj7|m7b5|m9|m7|m6|7sus4|sus2|sus4|add9|dim|aug|maj|m|6|9|7|)(?:\/(\d))?(?:@([0-9.]+))?$/;

const CHORD_INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7],
  maj: [0, 4, 7],
  m: [0, 3, 7],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '7': [0, 4, 7, 10],
  '9': [0, 4, 7, 10, 14],
  maj7: [0, 4, 7, 11],
  maj9: [0, 4, 7, 11, 14],
  maj13: [0, 4, 7, 11, 14, 21],
  m7: [0, 3, 7, 10],
  m9: [0, 3, 7, 10, 14],
  m7b5: [0, 3, 6, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '7sus4': [0, 5, 7, 10],
  add9: [0, 4, 7, 14],
  dim: [0, 3, 6, 9],
  aug: [0, 4, 8],
};

/** MIDI number of a note name like "C4", "F#3", "Bb2" (C4 = 60). Throws on bad input. */
export function noteToMidi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note "${name}"`);
  const base = NOTE_INDEX[m[1]!]!;
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return base + acc + (Number(m[3]) + 1) * 12;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function rootToMidi(root: string, octave: number): number {
  return noteToMidi(`${root}${octave}`);
}

/** Expands a chord symbol to MIDI notes (root in `octave`). */
export function chordToMidi(symbol: string): number[] | null {
  const m = CHORD_RE.exec(symbol);
  if (!m) return null;
  const intervals = CHORD_INTERVALS[m[2] ?? ''];
  if (!intervals) return null;
  const root = rootToMidi(m[1]!, m[3] !== undefined ? Number(m[3]) : 3);
  return intervals.map((i) => root + i);
}

function parseCell(tok: string): Cell {
  if (tok === '.') return { kind: 'rest', midi: [], vel: 0 };
  if (tok === '-') return { kind: 'hold', midi: [], vel: 0 };
  if (tok === 'x') return { kind: 'hit', midi: [], vel: 0.75 };
  if (tok === 'X') return { kind: 'hit', midi: [], vel: 1 };
  if (tok === 'g') return { kind: 'hit', midi: [], vel: 0.35 };
  const parts = tok.split('+');
  const midi: number[] = [];
  let vel = 0.8;
  for (const p of parts) {
    const n = NOTE_RE.exec(p);
    if (n) {
      midi.push(noteToMidi(`${n[1]}${n[2]}${n[3]}`));
      if (n[4] !== undefined) vel = Number(n[4]);
      continue;
    }
    const c = chordToMidi(p);
    if (c) {
      midi.push(...c);
      const v = CHORD_RE.exec(p)?.[4];
      if (v !== undefined) vel = Number(v);
      continue;
    }
    throw new Error(`bad cell "${tok}"`);
  }
  return { kind: 'hit', midi, vel };
}

/** Parses one bar. `compact` = one character per step (drums). Always returns exactly 16 cells (padded / truncated). */
export function parseBar(text: string, compact = false): Cell[] {
  const clean = text.replace(/\|/g, ' ');
  const toks = compact ? [...clean.replace(/\s+/g, '')] : clean.split(/\s+/).filter(Boolean);
  const cells = toks.map(parseCell);
  while (cells.length < STEPS_PER_BAR) cells.push({ kind: 'rest', midi: [], vel: 0 });
  return cells.slice(0, STEPS_PER_BAR);
}

/** Number of cells the text declares (for tests: should be 16). */
export function barLength(text: string, compact = false): number {
  const clean = text.replace(/\|/g, ' ');
  return compact ? [...clean.replace(/\s+/g, '')].length : clean.split(/\s+/).filter(Boolean).length;
}

/**
 * Compiles a layer into a per-step event table covering `totalBars` bars.
 * Bar i uses patterns[i % patterns.length]. Holds extend notes; for looping tracks holds wrap around the end.
 */
export function compileLayer(patterns: readonly string[], totalBars: number, compact: boolean, loop = true): (StepEvent | null)[] {
  const cells: Cell[] = [];
  for (let b = 0; b < totalBars; b++) cells.push(...parseBar(patterns[b % patterns.length]!, compact));
  const n = cells.length;
  const out: (StepEvent | null)[] = new Array<StepEvent | null>(n).fill(null);
  for (let i = 0; i < n; i++) {
    const c = cells[i]!;
    if (c.kind !== 'hit') continue;
    let len = 1;
    for (let k = 1; k < n; k++) {
      const j = i + k;
      if (j >= n && !loop) break;
      if (cells[j % n]!.kind !== 'hold') break;
      len++;
    }
    out[i] = { midi: c.midi, len, vel: c.vel };
  }
  return out;
}

/** Start time (seconds, relative to the track start) of global step `n`, with swing on odd steps (0..0.4 of a step). */
export function stepTime(n: number, stepDur: number, swing = 0): number {
  return n * stepDur + (n % 2 === 1 ? swing * stepDur : 0);
}

export function stepDuration(bpm: number): number {
  return 60 / bpm / 4;
}

/** Index of the first step whose start time is >= t (ignores swing: used as a scheduler cursor). */
export function stepAtOrAfter(t: number, stepDur: number): number {
  return Math.max(0, Math.ceil(t / stepDur - 1e-9));
}

/** Concatenates helper: builds a bar from a 16-char mask, replacing x with `token` ('.' and '-' are kept). */
export function maskBar(mask: string, token: string): string {
  return [...mask.replace(/\s+/g, '')].map((c) => (c === 'x' ? token : c)).join(' ');
}

/** A sustained cell: `token` then 15 holds. */
export function sustain(token: string, steps = STEPS_PER_BAR): string {
  return [token, ...new Array<string>(steps - 1).fill('-')].join(' ');
}
