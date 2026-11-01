// Reward cadence: XP catch-up, wild drops, first-catch bonus, Neurodex milestones. Pure (no DOM, no Phaser).
// Principle: small frequent rewards (variable ratio) + rare jackpots, without making the XP curve trivial.
import type { Rng } from './rng';

/** Global XP multiplier on top of `yield * level / 7` (tuned with systems/sim/campaign.ts). */
export const XP_SCALE = 1.0;
export const TRAINER_XP_MULT = 1.5;

/** XP multiplier for a recipient of `recLevel` beating a foe of `foeLevel`: catch-up when behind, diminishing when over-levelled. */
export const CATCHUP_PER_LEVEL = 0.1;
export const CATCHUP_MIN = 0.35;
export const CATCHUP_MAX = 1.6;
export function levelGapFactor(foeLevel: number, recLevel: number): number {
  const f = (1 + CATCHUP_PER_LEVEL * (foeLevel - recLevel));
  return Math.max(CATCHUP_MIN, Math.min(CATCHUP_MAX, f));
}

/** "Prompt chanceux": a small chance of a x1.5 XP burst after a won fight. */
export const LUCKY_XP_CHANCE = 0.08;
export const LUCKY_XP_MULT = 1.5;

/** "Prime de performance": a trainer fight won without losing a PokAI pays this extra fraction of the trainer reward. */
export const FLAWLESS_BONUS = 0.25;

/** Early-game gentleness: foe damage multiplier by badges owned (undefined = unknown = full damage). Leaders ignore it. */
export function foeDamageMultiplier(badges: number | undefined): number {
  if (badges === undefined) return 1;
  return badges < 1 ? 0.75 : badges < 2 ? 0.9 : 1;
}
/** Chance an early (pre-badge) trainer picks a random move instead of the best one. */
export const FOE_RANDOM_MOVE_CHANCE_EARLY = 0.5;

/** Extra XP for low-level PokAI so the first evolution (lv 16) arrives naturally; fades out by lv 26. */
export function earlyXpBoost(level: number): number {
  if (level < 16) return 1.3;
  if (level >= 26) return 1;
  return 1 + 0.3 * (26 - level) / 10;
}

export interface Drop {
  item: string;
  /** Relative weight. */
  weight: number;
  /** Foe level required for this drop to be possible. */
  minLevel?: number;
}

/** Chance that a won wild fight (not a capture) drops anything. About one drop every 5-6 wins. */
export const WILD_DROP_CHANCE = 0.18;
export const WILD_DROPS: readonly Drop[] = [
  { item: 'cafe', weight: 50 },
  { item: 'hotfix', weight: 14, minLevel: 5 },
  { item: 'red_bull', weight: 12, minLevel: 10 },
  { item: 'api_key_free', weight: 8 },
  { item: 'dataset', weight: 3, minLevel: 8 },
  { item: 'api_key_pro', weight: 1.5, minLevel: 12 },
];

/** Rolls the drop of a won wild fight; null most of the time. */
export function rollWildDrop(foeLevel: number, rng: Rng, chance = WILD_DROP_CHANCE): string | null {
  if (!rng.chance(chance)) return null;
  const pool = WILD_DROPS.filter((d) => (d.minLevel ?? 0) <= foeLevel);
  const total = pool.reduce((s, d) => s + d.weight, 0);
  let roll = rng.next() * total;
  for (const d of pool) {
    roll -= d.weight;
    if (roll < 0) return d.item;
  }
  return pool[pool.length - 1]?.item ?? null;
}

/** Credits for the first capture of a new model (Neurodex discovery bonus): rarer, later stages pay more. */
export function firstCatchBonus(stage: number): number {
  return 60 + 50 * Math.max(1, stage);
}

export interface DexMilestone {
  caught: number;
  items: Record<string, number>;
  credits: number;
  label: string;
}

/** Items for catching N distinct models. Keys stay scarce: Pro at 10, Enterprise only at 40. */
export const DEX_MILESTONES: readonly DexMilestone[] = [
  { caught: 5, items: { api_key_free: 2, cafe: 2 }, credits: 300, label: 'Neurodex : 5 modèles' },
  { caught: 10, items: { api_key_pro: 1, red_bull: 2 }, credits: 600, label: 'Neurodex : 10 modèles' },
  { caught: 20, items: { api_key_pro: 1, h100: 1, hotfix: 3 }, credits: 1500, label: 'Neurodex : 20 modèles' },
  { caught: 40, items: { api_key_enterprise: 1, h100: 2, full_restart: 2 }, credits: 4000, label: 'Neurodex : 40 modèles' },
];

/** Milestones crossed when the caught count goes from `before` to `after`. */
export function crossedMilestones(before: number, after: number): DexMilestone[] {
  return DEX_MILESTONES.filter((m) => before < m.caught && after >= m.caught);
}
