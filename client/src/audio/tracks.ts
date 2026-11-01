// Music data: every TrackName as a small pattern-based arrangement (see sequencer.ts for the grammar).
// Vibe: lo-fi synth / city-pop / ambient electronica. Chords are authored as symbols, rhythms as masks.
import type { TrackName } from './audio';
import type { LayerDef, TrackDef } from './rig';
import { maskBar, noteToMidi, sustain, chordToMidi } from './sequencer';
import { trailer } from './trailer-track';

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const noteName = (m: number): string => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
const rootOf = (c: string): string => /^[A-G][#b]?/.exec(c)![0];

/** Chord comping: mask 'x' -> the chord (root in `oct`). One mask per bar, cycled. */
const comp = (chords: readonly string[], oct: number, masks: readonly string[]): string[] =>
  chords.map((c, i) => maskBar(masks[i % masks.length]!, `${c}/${oct}`));

/** One sustained chord per bar. */
const pads = (chords: readonly string[], oct: number): string[] => chords.map((c) => sustain(`${c}/${oct}`));

/** Bass line from roots. mask: x root, o octave up, f fifth, . rest, - hold. */
const bassBars = (chords: readonly string[], oct: number, masks: readonly string[]): string[] =>
  chords.map((c, i) => {
    const r = noteToMidi(`${rootOf(c)}${oct}`);
    return [...masks[i % masks.length]!.replace(/\s+/g, '')]
      .map((ch) => (ch === 'x' ? noteName(r) : ch === 'o' ? noteName(r + 12) : ch === 'f' ? noteName(r + 7) : ch))
      .join(' ');
  });

/** Arpeggio through chord tones: each 'x' of the mask takes the next index of `order`. */
const arp = (chords: readonly string[], oct: number, mask: string, order: readonly number[]): string[] =>
  chords.map((c, bar) => {
    const tones = chordToMidi(`${c}/${oct}`)!;
    let k = bar * 3; // shifts the phase every bar so loops breathe
    return [...mask.replace(/\s+/g, '')]
      .map((ch) => {
        if (ch !== 'x') return ch;
        const idx = order[k++ % order.length]!;
        return noteName(tones[idx % tones.length]! + 12 * Math.floor(idx / tones.length));
      })
      .join(' ');
  });

const R = Array<string>(16).fill('.').join(' ');
const H = Array<string>(16).fill('-').join(' ');

const L = (inst: LayerDef['inst'], pat: readonly string[], o: Omit<LayerDef, 'inst' | 'pat'> = {}): LayerDef => ({ inst, pat, ...o });

// ===================================================================== TRACKS

// ---- city_day: city-pop, 98 bpm, bright and relaxed
const CITY_DAY = ['Fmaj7', 'G7', 'Em7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7'];
const city_day: TrackDef = {
  bpm: 98, swing: 0.14, bars: 8, loop: true, gain: 1.26,
  layers: [
    L('pad', pads(CITY_DAY, 3), { gain: 0.8, rev: 0.5, pan: -0.15, p: { cut: 950 } }),
    L('epiano', comp(CITY_DAY, 3, ['x..x..x...x..x..', 'x..x....x.x..x..']), { gain: 0.9, rev: 0.3, dly: 0.12, pan: 0.15 }),
    L('bass', bassBars(CITY_DAY, 2, ['x..x..xo..x..x.f', 'x..x..x...xo..x.']), { gain: 0.95, p: { cut: 560 } }),
    L('kick', ['x.......x.x.....', 'x.....x.x.......', 'x.......x.x.....', 'x..x....x.......'], { gain: 0.8, rev: 0.05 }),
    L('snare', ['....x.......x...'], { gain: 0.7, rev: 0.25, p: { tone: 1700 } }),
    L('hat', ['x.g.x.g.x.g.x.gg'], { gain: 0.8, pan: 0.2 }),
    L('shaker', ['..x...x...x...x.'], { gain: 0.6, pan: -0.25, on: '..xxxxxx' }),
    L('glass', [
      'A5 . . C6 . . A5 . G5 . . . . . . .', 'B5 . . D6 . . B5 . G5 . . . . . . .', 'G5 . B5 . . . G5 . E5 . . . . . . .', 'A5 . . . C6 . E6 . D6 . C6 . . . . .',
      'F5 . A5 . . . D6 . C6 . A5 . . . . .', 'B5 . D6 . . . G5 . . . . . F5 . G5 .', 'E6 . . . D6 . C6 . . . G5 . . . . .', '. . . . . . . . E5 . G5 . A5 . . .',
    ], { gain: 0.9, rev: 0.4, dly: 0.3, on: '.xxxxxxx' }),
  ],
};

// ---- city_night: calmer, 76 bpm, no kick, wide pads
const CITY_NIGHT = ['Dm9', 'Bbmaj7', 'Gm9', 'A7sus4', 'Fmaj9', 'Em7b5', 'Dm9', 'A7'];
const city_night: TrackDef = {
  bpm: 76, swing: 0.1, bars: 8, loop: true, gain: 1.8, reverb: { seconds: 3.2, mix: 0.55 },
  layers: [
    L('pad', pads(CITY_NIGHT, 3), { gain: 1, rev: 0.6, p: { cut: 780, a: 0.9, r: 1.8 } }),
    L('epiano', arp(CITY_NIGHT, 3, 'x.x.x.x.x.x.x.x.', [0, 1, 2, 4, 2, 1, 3, 2]), { gain: 0.8, rev: 0.45, dly: 0.25, pan: 0.2, p: { cut: 2400, decay: 1.9 } }),
    L('bass', bassBars(CITY_NIGHT, 2, ['x.......--------', 'x.......--.o....']), { gain: 0.8, p: { cut: 380, max: 2.5 } }),
    L('rim', ['................', '..............x.', '................', '......x.........'], { gain: 0.5, rev: 0.5 }),
    L('hat', ['..g...g...g...g.'], { gain: 0.5, pan: 0.25, on: 'xxxxxxxx' }),
    L('bell', [
      'A5 . . . . . . . . . F5 . . . . .', 'D6 . . . . . . . . . . . C6 . . .', 'Bb5 . . . . . . . . . . . . . . .', 'G5 . . . . . A5 . . . . . . . . .',
      'C6 . . . . . . . A5 . . . . . . .', '. . . . G5 . . . . . Bb5 . . . . .', 'A5 . . . . . . . . . . . F5 . . .', 'C#6 . . . . . E6 . . . . . . . . .',
    ], { gain: 0.9, rev: 0.7, dly: 0.45, on: 'xxxxxxxx' }),
  ],
};

// ---- route_a: data-highway pulse, 118 bpm, E minor
const ROUTE_A = ['Em7', 'Cmaj7', 'Gadd9', 'D', 'Em7', 'Cmaj7', 'Am7', 'B7'];
const route_a: TrackDef = {
  bpm: 118, swing: 0.04, bars: 8, loop: true, gain: 1.36, echo: 3, echoFeedback: 0.3,
  layers: [
    L('pad', pads(ROUTE_A, 3), { gain: 0.7, rev: 0.4, p: { cut: 1100 } }),
    L('pluck', arp(ROUTE_A, 4, 'xxxxxxxxxxxxxxxx', [0, 1, 2, 3, 2, 1, 2, 3]), { gain: 0.75, rev: 0.2, dly: 0.35, pan: 0.2, p: { wave: 1, cut: 2200, decay: 0.2 } }),
    L('bass', bassBars(ROUTE_A, 2, ['x.x.o.x.x.x.o.x.', 'x.xxo.x.x.xxo.x.']), { gain: 0.9, p: { cut: 700 } }),
    L('kick', ['x...x...x...x...'], { gain: 0.75 }),
    L('snare', ['....x.......x...'], { gain: 0.5, rev: 0.3, p: { tone: 2100 } }),
    L('hat', ['..x...x...x...xx'], { gain: 0.8, pan: -0.2 }),
    L('shaker', ['x.x.x.x.x.x.x.x.'], { gain: 0.5, pan: 0.3 }),
    L('glass', [
      'B4 . E5 . G5 . B5 . . . A5 . G5 . E5 .', 'E5 . G5 . C6 . B5 . . . G5 . E5 . . .', 'D5 . G5 . B5 . D6 . . . B5 . G5 . . .', 'F#5 . A5 . D6 . C#6 . . . A5 . F#5 . . .',
      'G5 . B5 . E6 . D6 . B5 . . . G5 . . .', 'G5 . C6 . E6 . D6 . C6 . . . B5 . . .', 'A5 . C6 . E6 . . . D6 . C6 . A5 . . .', 'D#6 . B5 . F#5 . . . A5 . . . B5 . . .',
    ], { gain: 0.85, rev: 0.35, dly: 0.4, on: '..xxxxxx' }),
  ],
};

// ---- route_b: laid-back highway, 104 bpm
const ROUTE_B = ['Am7', 'Fmaj7', 'Cmaj7', 'G6', 'Am7', 'Fmaj7', 'Dm7', 'E7'];
const route_b: TrackDef = {
  bpm: 104, swing: 0.1, bars: 8, loop: true, gain: 1.26,
  layers: [
    L('pad', pads(ROUTE_B, 3), { gain: 0.7, rev: 0.5, pan: 0.1, p: { cut: 900 } }),
    L('epiano', comp(ROUTE_B, 3, ['x..x..x...x...x.', 'x..x......x..x..']), { gain: 0.85, rev: 0.3, dly: 0.15, pan: -0.2 }),
    L('bass', bassBars(ROUTE_B, 2, ['x..x..xo..x.x..f', 'x..x..x...xo..x.']), { gain: 0.95, p: { cut: 520 } }),
    L('kick', ['x.....x.x.......', 'x.......x..x....'], { gain: 0.75 }),
    L('rim', ['....x.......x...'], { gain: 0.8, rev: 0.3 }),
    L('hat', ['x.xgx.xgx.xgx.xg'], { gain: 0.65, pan: 0.2 }),
    L('shaker', ['xxxxxxxxxxxxxxxx'], { gain: 0.35, pan: -0.3 }),
    L('glass', [
      'E6 . . D6 . C6 . . A5 . . . . . . .', 'C6 . . A5 . . . . F5 . A5 . C6 . . .', 'E6 . . G6 . . E6 . D6 . . . C6 . . .', 'D6 . . B5 . . G5 . . . . . . . . .',
      'E6 . . D6 . C6 . . A5 . . . . . . .', 'A5 . C6 . F6 . . . E6 . C6 . . . . .', 'F6 . . E6 . D6 . . A5 . . . D6 . . .', 'G#5 . B5 . D6 . . . E6 . . . . . . .',
    ], { gain: 0.9, rev: 0.4, dly: 0.35, on: 'x.xxxxxx' }),
  ],
};

// ---- interior: cozy, 84 bpm
const INTERIOR = ['Cmaj9', 'Am9', 'Fmaj9', 'G7sus4', 'Em7', 'Am9', 'Dm9', 'G7sus4'];
const interior: TrackDef = {
  bpm: 84, swing: 0.12, bars: 8, loop: true, gain: 2.09, reverb: { seconds: 2.0, mix: 0.4 },
  layers: [
    L('pad', pads(INTERIOR, 3), { gain: 0.65, rev: 0.4, p: { cut: 700, a: 0.7 } }),
    L('epiano', arp(INTERIOR, 3, 'x.x.x.x.x.x.x.x.', [0, 2, 4, 2, 1, 3, 2, 1]), { gain: 0.9, rev: 0.3, dly: 0.2, pan: -0.1, p: { cut: 2600, decay: 1.3 } }),
    L('bass', bassBars(INTERIOR, 2, ['x.......x..f....', 'x...........o...']), { gain: 0.8, p: { cut: 420 } }),
    L('shaker', ['x.x.x.x.x.x.x.x.'], { gain: 0.35, pan: 0.3, on: 'xxxxxxxx' }),
    L('rim', ['........x.......'], { gain: 0.45, rev: 0.5 }),
    L('bell', arp(INTERIOR, 5, '....x.......x...', [2, 0, 3, 1, 4]), { gain: 0.8, rev: 0.6, dly: 0.4, on: 'x.xxx.xx' }),
  ],
};

// ---- prison: tense and sparse, 70 bpm
const prison: TrackDef = {
  bpm: 70, bars: 8, loop: true, gain: 1.71, reverb: { seconds: 3.6, mix: 0.6 }, echo: 6, echoFeedback: 0.45,
  layers: [
    L('drone', [sustain('E1'), sustain('E1'), sustain('F1'), sustain('E1')], { gain: 1, rev: 0.3, p: { cut: 220 } }),
    L('pad', [sustain('E3+B3+F4'), sustain('E3+B3+F4'), sustain('F3+C4+F#4'), sustain('E3+B3+G4')], { gain: 0.5, rev: 0.7, p: { cut: 520, a: 1.4, r: 2 } }),
    L('kick', ['x.....x.........', 'x.......x.......'], { gain: 0.6, rev: 0.4, p: { low: 38, decay: 0.38 } }),
    L('drip', ['. . . . . . . . B5 . . . . . . .', R, '. . . . . . . . . . . E6 . . . .', R], { gain: 0.8, rev: 0.8, dly: 0.6 }),
    L('bell', ['. . . . . . . . . . . . F6 . . .', '. . . . . . . . . . . . . . . .', '. . . . . . . . . . . . . . . .', 'E6 . . . . . . . . . . . . . . .'], { gain: 0.4, rev: 0.9, dly: 0.5, p: { decay: 3 } }),
    L('hat', ['................', '..............g.', '................', '......g.........'], { gain: 0.4, pan: -0.3, rev: 0.6 }),
  ],
};

// ---- hub: warm, 92 bpm
const HUB = ['Fmaj9', 'Em7', 'Dm9', 'Cmaj9', 'Bbmaj7', 'Am7', 'Gm7', 'C7sus4'];
const hub: TrackDef = {
  bpm: 92, swing: 0.08, bars: 8, loop: true, gain: 1.71,
  layers: [
    L('pad', pads(HUB, 3), { gain: 0.85, rev: 0.5, p: { cut: 1000 } }),
    L('epiano', arp(HUB, 3, 'x.x.x.x.x.x.x.x.', [0, 1, 2, 3, 2, 1, 4, 2]), { gain: 0.8, rev: 0.35, dly: 0.2, pan: 0.2 }),
    L('bass', bassBars(HUB, 2, ['x.......x.f.....', 'x.....x.o.......']), { gain: 0.85, p: { cut: 450 } }),
    L('kick', ['x.......x.......'], { gain: 0.5 }),
    L('shaker', ['..x...x...x...x.'], { gain: 0.55, pan: -0.3 }),
    L('bell', [
      'C6 . . A5 . C6 . . F6 . . . E6 . . .', 'B5 . . G5 . B5 . . E6 . . . D6 . . .', 'A5 . . F5 . A5 . . D6 . . . C6 . . .', 'G5 . . E5 . G5 . . C6 . . . D6 . . .',
      'F6 . . D6 . F6 . . Bb5 . . . A5 . . .', 'E6 . . C6 . E6 . . A5 . . . G5 . . .', 'D6 . . Bb5 . D6 . . G5 . . . F5 . . .', 'F5 . . . G5 . . . C6 . . . . . . .',
    ], { gain: 0.85, rev: 0.5, dly: 0.35 }),
  ],
};

// ---- battle_wild: urgent, 150 bpm, A minor
const BW = ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'Dm', 'E'];
const battle_wild: TrackDef = {
  bpm: 150, swing: 0, bars: 8, loop: true, gain: 0.98, echo: 3, echoFeedback: 0.28, reverb: { seconds: 1.6, mix: 0.25 },
  layers: [
    L('pad', pads(BW, 3), { gain: 0.6, rev: 0.3, p: { cut: 1400, a: 0.2 } }),
    L('bass', bassBars(BW, 2, ['x.xxx.xxx.xxx.xo', 'x.xxx.xxx.xxo.xx']), { gain: 0.95, p: { cut: 760, max: 0.2 } }),
    L('kick', ['x...x...x...x...', 'x...x...x..xx...'], { gain: 0.85 }),
    L('snare', ['....x.......x...', '....x.......x..g'], { gain: 0.75, rev: 0.15, p: { tone: 2100 } }),
    L('hat', ['xgxgxgxgxgxgxgxg'], { gain: 0.8, pan: 0.2 }),
    L('stab', comp(BW, 3, ['..x...x...x...x.', '..x...x...x.x...']), { gain: 0.7, rev: 0.2, dly: 0.2, pan: -0.25, p: { cut: 1800 } }),
    L('lead', [
      'A4 . . C5 . E5 . . A5 - - . G5 . E5 .', 'C5 . . E5 . A5 - - G5 . E5 . C5 . . .', 'F5 . . A5 . C6 - - A5 . F5 . A5 . . .', 'G5 . . B5 . D6 - - B5 . G5 . D5 . . .',
      'A4 . . C5 . E5 . . A5 - - . B5 . C6 .', 'E6 - - . D6 . C6 . A5 - - . E5 . . .', 'D5 . . F5 . A5 - - D6 . C6 . A5 . . .', 'E5 . . G#5 . B5 - - E6 - - - . . . .',
    ], { gain: 0.9, rev: 0.25, dly: 0.25, p: { cut: 2600 } }),
  ],
};

// ---- battle_trainer: rivalry, 140 bpm, D minor
const BT = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'C', 'A'];
const battle_trainer: TrackDef = {
  bpm: 140, swing: 0.05, bars: 8, loop: true, gain: 1.19, echo: 3, reverb: { seconds: 1.8, mix: 0.3 },
  layers: [
    L('pad', pads(BT, 3), { gain: 0.65, rev: 0.35, p: { cut: 1300, a: 0.15 } }),
    L('bass', bassBars(BT, 2, ['x..xx..xx..xx.ox', 'x..xx..xx..x.xo.']), { gain: 0.95, p: { cut: 700, max: 0.25 } }),
    L('kick', ['x.....x.x...x...', 'x...x...x.x.x...'], { gain: 0.85 }),
    L('snare', ['....x.......x...', '....x.......x.xg'], { gain: 0.75, rev: 0.2, p: { tone: 1900 } }),
    L('clap', ['....x.......x...'], { gain: 0.35, rev: 0.3 }),
    L('hat', ['x.xxx.xxx.xxx.xx'], { gain: 0.8, pan: 0.2 }),
    L('stab', comp(BT, 3, ['x.....x...x.....', 'x..x..x...x.x...']), { gain: 0.75, rev: 0.2, pan: -0.25, p: { cut: 2000 } }),
    L('lead', [
      'D5 - . F5 . A5 - - D6 - - - C6 . A5 .', 'Bb5 - . A5 . F5 - - D5 - - - F5 . A5 .', 'G5 - . Bb5 . D6 - - G6 - - - F6 . D6 .', 'C#6 - . E6 . A5 - - E6 - - - . . . .',
      'A5 - . D6 . F6 - - E6 . D6 . A5 . F5 .', 'D6 - . F6 . D6 - - C6 - - - Bb5 . . .', 'C6 - . E6 . G6 - - E6 . C6 . G5 . . .', 'A5 . C#6 . E6 . . . A6 - - - . . . .',
    ], { gain: 0.9, rev: 0.25, dly: 0.25, p: { cut: 2800 } }),
  ],
};

// ---- battle_aiact: bureaucratic menace, 112 bpm, C minor, typewriter + stamp
const BA = ['Cm', 'Fm', 'Abmaj7', 'G7', 'Cm', 'Fm', 'Bdim', 'G7'];
const battle_aiact: TrackDef = {
  bpm: 112, swing: 0, bars: 8, loop: true, gain: 1.44, echo: 4, echoFeedback: 0.3, reverb: { seconds: 2.0, mix: 0.3 },
  layers: [
    L('drone', BA.map((c) => sustain(`${rootOf(c)}1`)), { gain: 0.9, p: { cut: 240 } }),
    L('pad', pads(BA, 3), { gain: 0.5, rev: 0.4, p: { cut: 650, a: 0.3 } }),
    L('bass', bassBars(BA, 2, ['x.x.x.x.x.x.x.x.', 'x.x.x.xox.x.x.xo']), { gain: 0.85, p: { cut: 480, max: 0.3 } }),
    L('stamp', ['X.......x.......', 'X.......x.....x.'], { gain: 0.8, rev: 0.3 }),
    L('typewriter', ['xxx.xx.xxxx.x...', 'x.xx.xxx..xxxx..', 'xxxx.x.xx.xxx...', 'x.xx.xxx..xxxX..'], { gain: 0.8, rev: 0.15, pan: 0.3 }),
    L('hat', ['..x...x...x...x.'], { gain: 0.35, pan: -0.3 }),
    L('stab', comp(BA, 3, ['..x.....x.....x.', '..x.....x.......']), { gain: 0.65, rev: 0.3, pan: -0.2, p: { cut: 1500 } }),
    L('lead', [
      'G4 . . . Ab4 . . . G4 . . . Eb4 . . .', 'F4 . . . Ab4 . . . F4 . . . C4 . . .', 'Eb4 . . . G4 . . . Eb4 . . . C4 . . .', 'D4 . . . F4 . . . D4 . B3 . . . . .',
      'G4 . . . Ab4 . . . G4 . . . Eb4 . . .', 'Ab4 . . . C5 . . . Ab4 . . . F4 . . .', 'F4 . . . D4 . . . B3 . . . D4 . . .', 'G4 - - - F4 - - - D4 . . . . . . .',
    ], { gain: 0.9, rev: 0.4, dly: 0.3, p: { cut: 1400, vib: 12 } }),
  ],
};

// ---- battle_leader: epic, 160 bpm, G minor
const BL = ['Gm', 'Eb', 'Bb', 'F', 'Gm', 'Eb', 'Cm', 'D7'];
const battle_leader: TrackDef = {
  bpm: 160, swing: 0, bars: 8, loop: true, gain: 0.89, echo: 3, echoFeedback: 0.32, reverb: { seconds: 2.4, mix: 0.4 },
  layers: [
    L('pad', pads(BL, 3), { gain: 0.8, rev: 0.45, p: { cut: 1500, a: 0.25 } }),
    L('pluck', arp(BL, 4, 'xxxxxxxxxxxxxxxx', [0, 1, 2, 1, 2, 3, 2, 1]), { gain: 0.5, rev: 0.25, dly: 0.35, pan: 0.25, p: { cut: 2400, decay: 0.18 } }),
    L('bass', bassBars(BL, 2, ['xxxxxxxxxxxxxxxx', 'x.xxx.xxx.xxx.xo']), { gain: 0.9, p: { cut: 800, max: 0.15 } }),
    L('kick', ['x...x...x...x...', 'x..xx...x..xx...'], { gain: 0.95 }),
    L('snare', ['....x.......x...', '....x...x.x.x.xx'], { gain: 0.8, rev: 0.25, p: { tone: 2000 } }),
    L('clap', ['....x.......x...'], { gain: 0.4, rev: 0.35 }),
    L('hat', ['xgxgxgxgxgxgxgxX'], { gain: 0.8, pan: 0.2 }),
    L('stab', comp(BL, 3, ['x.....x.x.....x.', 'x..x..x.x..x..x.']), { gain: 0.7, rev: 0.3, pan: -0.25, p: { cut: 2400 } }),
    L('lead', [
      'G5 - - . Bb5 . D6 - - - - - C6 . Bb5 .', 'Bb5 - - . G5 . Eb6 - - - - - D6 . C6 .', 'D6 - - . F6 . Bb6 - - - - - A6 . F6 .', 'A5 - - . C6 . F6 - - - - - E6 . C6 .',
      'G6 - - . F6 . D6 - - - Bb5 . D6 . F6 .', 'Eb6 - - . D6 . Bb5 - - - G5 . Bb5 . Eb6 .', 'C6 - - . Eb6 . G6 - - - Eb6 . D6 . C6 .', 'A5 . C6 . D6 . F#6 . A6 - - - - - - .',
    ], { gain: 0.9, rev: 0.3, dly: 0.3, p: { cut: 3000, vib: 9 } }),
  ],
};

// ---- victory (jingle, 3 bars): C major
const victory: TrackDef = {
  bpm: 132, swing: 0, bars: 3, loop: false, gain: 0.95, echo: 3, reverb: { seconds: 2.2, mix: 0.4 },
  layers: [
    L('bell', [
      'C5 . E5 . G5 . . . E5 . G5 . C6 . . .',
      'A5 . C6 . F6 . . . E6 . C6 . A5 . . .',
      'B5 . D6 . G6 . . . C6 - - - - - - -',
    ], { gain: 1, rev: 0.5, dly: 0.35, p: { decay: 2.4 } }),
    L('epiano', [
      'C3+E3+G3+C4 - - - - - - - G3+C4+E4 - - - - - - -',
      'F3+A3+C4+F4 - - - - - - - A3+C4+F4 - - - - - - -',
      'G3+B3+D4+G4 - - - - - - - C3+E3+G3+C4+E4 - - - - - - -',
    ], { gain: 0.9, rev: 0.4, p: { decay: 2.5 } }),
    L('pad', [sustain('C3+G3+E4'), sustain('F3+A3+C4'), sustain('C3+G3+E4+C5')], { gain: 0.6, rev: 0.5, p: { cut: 1200, a: 0.1, r: 2 } }),
    L('bass', ['C2 . . . . . C2 . G2 . . . C3 . . .', 'F2 . . . . . F2 . C3 . . . A2 . . .', 'G2 . . . . . G2 . D3 . . . C2 - - -'], { gain: 0.9, p: { cut: 600 } }),
    L('kick', ['x.....x.x.......', 'x.....x.x.......', 'x...............'], { gain: 0.7 }),
    L('clap', ['....x.......x.xx', '....x.......x.xx', '....x...........'], { gain: 0.45, rev: 0.4 }),
  ],
};

// ---- evolution (jingle, 4 bars): mystical rise, resolves warmly
const evolution: TrackDef = {
  bpm: 110, swing: 0, bars: 4, loop: false, gain: 1.52, echo: 3, echoFeedback: 0.4, reverb: { seconds: 3.4, mix: 0.55 },
  layers: [
    L('riser', [sustain('C5'), H, H, R], { gain: 0.7, rev: 0.5 }),
    L('pad', [sustain('A2+E3+A3+C4'), sustain('F2+C3+F3+A3'), sustain('C3+G3+C4+E4'), sustain('C3+G3+E4+B4+D5')], { gain: 0.9, rev: 0.6, p: { cut: 1300, a: 0.5, r: 2.6 } }),
    L('pluck', [
      'A4 . C5 . E5 . A5 . C6 . E6 . A6 . . .',
      'F4 . A4 . C5 . F5 . A5 . C6 . F6 . . .',
      'C5 . E5 . G5 . C6 . E6 . G6 . . . . .',
      '. . . . . . . . . . . . . . . .',
    ], { gain: 0.7, rev: 0.5, dly: 0.5, p: { cut: 3200, decay: 0.3 } }),
    L('bell', [
      '. . . . . . . . . . . . . . . .',
      '. . . . . . . . . . . . . . . .',
      '. . . . . . . . . . . . . . . .',
      'E6 . . . G6 . . . C7 - - - - - - -',
    ], { gain: 1, rev: 0.7, dly: 0.4, p: { decay: 3.2 } }),
    L('bass', ['A1 - - - - - - - - - - - - - - -', 'F1 - - - - - - - - - - - - - - -', 'C2 - - - - - - - - - - - - - - -', 'C2 - - - - - - - - - - - - - - -'], { gain: 0.7, p: { cut: 360, max: 2.6 } }),
    L('kick', ['................', '................', 'x.......x.......', 'x...............'], { gain: 0.6, rev: 0.3, p: { low: 40 } }),
  ],
};

// ---- title: ambient electronica boot theme, 90 bpm
const TITLE = ['Am9', 'Fmaj9', 'Cmaj9', 'G6', 'Am9', 'Fmaj9', 'Dm9', 'Esus4'];
const title: TrackDef = {
  bpm: 90, swing: 0.06, bars: 8, loop: true, gain: 1.71, reverb: { seconds: 3.0, mix: 0.5 }, echo: 3, echoFeedback: 0.4,
  layers: [
    L('pad', pads(TITLE, 3), { gain: 0.95, rev: 0.6, p: { cut: 900, a: 0.9, r: 1.8 } }),
    L('epiano', arp(TITLE, 3, 'x.x.x.x.x.x.x.x.', [0, 2, 4, 3, 1, 3, 4, 2]), { gain: 0.8, rev: 0.4, dly: 0.35, pan: 0.2, p: { cut: 2600, decay: 1.6 } }),
    L('bass', bassBars(TITLE, 2, ['x.......--------', 'x.......x.f.....']), { gain: 0.8, p: { cut: 420, max: 2.2 } }),
    L('kick', ['x.......x.......'], { gain: 0.55, on: '..xxxxxx' }),
    L('hat', ['..x...x...x...x.'], { gain: 0.45, pan: 0.3, on: '..xxxxxx' }),
    L('shaker', ['x.x.x.x.x.x.x.x.'], { gain: 0.3, pan: -0.3, on: '....xxxx' }),
    L('bell', [
      'E6 . . . A6 . . . G6 . . . E6 . . .', 'C6 . . . A5 . . . F6 . . . E6 . . .', 'G6 . . . E6 . . . C6 . . . D6 . . .', 'B5 . . . D6 . . . G6 - - - - - - -',
      'E6 . . . A6 . . . C7 . . . B6 . . .', 'A6 . . . F6 . . . C6 . . . A5 . . .', 'F6 . . . D6 . . . A5 . . . C6 . . .', 'B5 . . . E6 . . . G#6 - - - - - - -',
    ], { gain: 0.85, rev: 0.6, dly: 0.5 }),
  ],
};

export const TRACKS: Readonly<Record<TrackName, TrackDef>> = {
  city_day, city_night, route_a, route_b, interior, prison, hub,
  battle_wild, battle_trainer, battle_aiact, battle_leader, victory, evolution, title, trailer,
};
