// Shared timeline of the intro trailer: the music (tracks.ts) and the cinematic (ui-dom/intro) are both built from these
// constants, so cuts, title slams and flashes land on the same instants by construction. Pure data, no WebAudio.

export const TRAILER_BPM = 120;
/** Seconds per beat (0.5 s at 120 bpm); one bar is four beats. */
export const TRAILER_BEAT = 60 / TRAILER_BPM;
export const TRAILER_BARS = 28;
export const TRAILER_END = TRAILER_BARS * 4 * TRAILER_BEAT; // 56 s

/** Start time (s) of each of the 19 shots, on the beat grid. Durations are the differences, the last one runs to TRAILER_END. */
export const TRAILER_SHOT_STARTS: readonly number[] = [
  0, 2.5, 5, 8, 11, 13.5, 17, 19, 22.5, 25, 28.5, 31.5, 33.5, 36, 38.5, 41, 44.5, 46.5, 49.5,
];

export type CueKind =
  /** soft sub thud (opening) */
  | 'soft'
  /** short brass hit */
  | 'hit'
  /** long BRAAM on a title card */
  | 'braam'
  /** the drop: the beat kicks in */
  | 'drop'
  /** the eye snaps open */
  | 'eye'
  /** the last big hit on the logo */
  | 'final';

export interface TrailerCue {
  /** seconds from the start of the track */
  t: number;
  kind: CueKind;
}

/** Hits of the trailer in chronological order. Title-card slams, the drop, the eye and the logo. */
export const TRAILER_CUES: readonly TrailerCue[] = [
  { t: 0, kind: 'soft' },
  { t: 2.5, kind: 'hit' }, { t: 3, kind: 'hit' },
  { t: 11, kind: 'braam' }, { t: 11.5, kind: 'hit' },
  { t: 17, kind: 'braam' }, { t: 17.5, kind: 'braam' },
  { t: 22.5, kind: 'hit' }, { t: 23, kind: 'braam' }, { t: 23.5, kind: 'braam' },
  { t: 31.5, kind: 'braam' }, { t: 32, kind: 'hit' },
  { t: 36, kind: 'drop' },
  { t: 40, kind: 'hit' },
  { t: 42.5, kind: 'eye' },
  { t: 44.5, kind: 'braam' }, { t: 45, kind: 'hit' },
  { t: 46.5, kind: 'braam' }, { t: 47, kind: 'hit' },
  { t: 49.5, kind: 'final' },
];

/** Moments of the music the visuals care about besides hits. */
export const TRAILER_MARKS = {
  /** the arpeggio starts building */
  arp: 5,
  /** tension riser before the drop */
  riser: 30,
  drop: 36,
  /** drums drop out for the eye, heartbeat only */
  breath: 41,
  silence: 49,
  final: 49.5,
} as const;

/** Total length of shot `i` in seconds. */
export function shotDuration(i: number): number {
  const s = TRAILER_SHOT_STARTS;
  return (i + 1 < s.length ? s[i + 1]! : TRAILER_END) - s[i]!;
}
