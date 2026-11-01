// Seeded PRNG (mulberry32). Deterministic so the server can replay battles.

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(a: readonly T[]): T;
  shuffle<T>(a: readonly T[]): T[];
  /** Current internal state: createRng(rng.seed) continues the same sequence. */
  readonly seed: number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    chance: (p: number) => next() < p,
    pick<T>(a: readonly T[]): T {
      if (a.length === 0) throw new Error('rng.pick: empty array');
      return a[int(0, a.length - 1)] as T;
    },
    shuffle<T>(a: readonly T[]): T[] {
      const out = [...a];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        const tmp = out[i] as T;
        out[i] = out[j] as T;
        out[j] = tmp;
      }
      return out;
    },
    get seed() {
      return state;
    },
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
