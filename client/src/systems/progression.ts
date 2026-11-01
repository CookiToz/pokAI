// Achievements + progression events. Pure: game code emits GameEvents, a runtime (state/progression-runtime.ts)
// updates counters, calls evaluate() and applies rewards. Nothing here touches the DOM or the save directly.
import achievementsJson from '@data/achievements.json';
import { db } from '../data/db';

export type OnboardTier = 'free' | 'pro' | 'enterprise';

export type GameEvent =
  | { kind: 'battle_end'; outcome: 'won' | 'lost' | 'fled'; battle: 'wild' | 'trainer'; aiact: boolean; flawless: boolean; turns: number; trainerId?: string }
  | { kind: 'onboard'; perfect: boolean; jailbreak: boolean; tier: OnboardTier; legendary: boolean }
  | { kind: 'onboard_fled' }
  | { kind: 'evolve'; from: string; to: string }
  | { kind: 'evolve_cancel' }
  | { kind: 'cookie_refused' }
  | { kind: 'step' }
  | { kind: 'badge'; id: string; count: number }
  | { kind: 'dex'; form: string; before: number; after: number }
  | { kind: 'credits'; total: number };

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  /** Shown while locked (instead of the description). */
  hint: string;
  icon: string;
  secret?: boolean;
  when: { stat: string; gte: number };
  reward?: { credits?: number; items?: Record<string, number> };
}

export const ACHIEVEMENTS: readonly AchievementDef[] = (achievementsJson as { achievements: AchievementDef[] }).achievements;

export type Counters = Record<string, number>;

/** Persistent counters updated by events. */
export function applyEvent(c: Counters, ev: GameEvent): void {
  const inc = (k: string, n = 1): void => {
    c[k] = (c[k] ?? 0) + n;
  };
  switch (ev.kind) {
    case 'battle_end':
      if (ev.outcome === 'won') {
        inc('wins');
        if (ev.turns <= 2) inc('quick_wins');
        if (ev.battle === 'trainer' && ev.flawless) inc('flawless_wins');
        if (ev.aiact && ev.battle === 'trainer') inc('aiact_wins');
      } else if (ev.outcome === 'lost') inc('losses');
      else if (ev.battle === 'wild') inc('flees');
      break;
    case 'onboard':
      inc('onboards');
      if (ev.perfect) inc('onboard_perfect');
      if (ev.jailbreak) inc('jailbreaks');
      if (ev.legendary) inc('legendary_caught');
      break;
    case 'onboard_fled':
      inc('onboard_fled');
      break;
    case 'evolve':
      inc('evolutions');
      break;
    case 'evolve_cancel':
      inc('evolve_cancels');
      break;
    case 'cookie_refused':
      inc('cookie_refused');
      break;
    case 'step':
      inc('steps');
      break;
    case 'credits':
      c['credits_peak'] = Math.max(c['credits_peak'] ?? 0, ev.total);
      break;
    default:
      break;
  }
}

export interface Snapshot {
  counters: Counters;
  badges: readonly string[];
  caught: readonly string[];
  credits: number;
  party: readonly { level: number }[];
  repo: readonly { level: number }[];
}

/** Counters plus values derived from the save. */
export function statValue(snap: Snapshot, stat: string): number {
  switch (stat) {
    case 'badges':
      return snap.badges.length;
    case 'caught':
      return snap.caught.length;
    case 'caught_open':
      return snap.caught.filter((f) => db.hasForm(f) && db.form(f).licence === 'open').length;
    case 'caught_prop':
      return snap.caught.filter((f) => db.hasForm(f) && db.form(f).licence === 'proprietary').length;
    case 'party_size':
      return snap.party.length;
    case 'max_level':
      return Math.max(0, ...snap.party.map((p) => p.level), ...snap.repo.map((p) => p.level));
    case 'credits_peak':
      return Math.max(snap.counters['credits_peak'] ?? 0, snap.credits);
    default:
      return snap.counters[stat] ?? 0;
  }
}

/** Achievements whose condition is met and which are not unlocked yet. */
export function evaluate(snap: Snapshot, unlocked: ReadonlySet<string>, defs: readonly AchievementDef[] = ACHIEVEMENTS): AchievementDef[] {
  return defs.filter((d) => !unlocked.has(d.id) && statValue(snap, d.when.stat) >= d.when.gte);
}

/** Progress toward an achievement, 0..1 (for the UI). */
export function progressOf(snap: Snapshot, d: AchievementDef): number {
  return Math.min(1, statValue(snap, d.when.stat) / d.when.gte);
}

// ---------------------------------------------------------------- event bus

type Listener = (ev: GameEvent) => void;
const listeners = new Set<Listener>();

export function onGameEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitGameEvent(ev: GameEvent): void {
  for (const fn of [...listeners]) {
    try {
      fn(ev);
    } catch (err) {
      console.error('[progression]', err);
    }
  }
}

// ---------------------------------------------------------------- battle reward sink

// Badge count provider (set by the runtime) so the engine can ramp difficulty without UI changes.
let badgeProvider: (() => number) | null = null;
export function setBadgeProvider(fn: (() => number) | null): void {
  badgeProvider = fn;
}
export function badgeCount(): number | undefined {
  return badgeProvider ? badgeProvider() : undefined;
}

/** What a won fight hands out beyond XP; applied by the runtime (the engine only announces it). */
export interface BattleReward {
  credits: number;
  items: Record<string, number>;
}
let rewardSink: ((r: BattleReward) => void) | null = null;
export function setRewardSink(fn: ((r: BattleReward) => void) | null): void {
  rewardSink = fn;
}
export function deliverReward(r: BattleReward): void {
  rewardSink?.(r);
}
