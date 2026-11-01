import type { Form, Stats } from '../data/types';

export const MAX_LEVEL = 100;
export const MAX_IV = 15;
export const PROPRIETARY_BONUS = 1.1;
/**
 * Context (HP) tuning: longer early fights (6+ turns at lv5) so that statuses and move choice matter.
 * Damage is untouched, so every fight lasts about a third longer than with the classic 2b*lv/100+lv+10.
 */
export const CONTEXT_SCALE = 1.35;
export const CONTEXT_FLAT = 18;

export const STAT_KEYS: readonly (keyof Stats)[] = ['context', 'power', 'robustness', 'throughput', 'precision'];

/** Effective base stats (proprietary licence: +10 %). */
export function effectiveBase(form: Form): Stats {
  const k = form.licence === 'proprietary' ? PROPRIETARY_BONUS : 1;
  const b = form.baseStats;
  return {
    context: Math.round(b.context * k),
    power: Math.round(b.power * k),
    robustness: Math.round(b.robustness * k),
    throughput: Math.round(b.throughput * k),
    precision: Math.round(b.precision * k),
  };
}

/** Stats at a level. `context` is max HP. */
export function computeStats(form: Form, level: number, ivs: Stats): Stats {
  const lv = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  const b = effectiveBase(form);
  const other = (base: number, iv: number) => Math.floor(((2 * base + 2 * iv) * lv) / 100) + 5;
  return {
    context: Math.floor((((2 * b.context + 2 * ivs.context) * lv) / 100) * CONTEXT_SCALE) + lv + CONTEXT_FLAT,
    power: other(b.power, ivs.power),
    robustness: other(b.robustness, ivs.robustness),
    throughput: other(b.throughput, ivs.throughput),
    precision: other(b.precision, ivs.precision),
  };
}

/** Total XP needed to reach `level` (medium-fast curve: n^3). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  const lv = Math.min(MAX_LEVEL, Math.floor(level));
  return lv * lv * lv;
}

export function levelForXp(xp: number): number {
  let lv = 1;
  while (lv < MAX_LEVEL && xpForLevel(lv + 1) <= xp) lv++;
  return lv;
}

/** Classic stat stage multiplier, stages clamped to [-6, 6]. */
export function stageMultiplier(stages: number): number {
  const s = Math.max(-6, Math.min(6, stages));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

export function baseStatTotal(s: Stats): number {
  return s.context + s.power + s.robustness + s.throughput + s.precision;
}
