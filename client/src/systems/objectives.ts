// Pure objective evaluator: which step of the main story is next, how far along the player is, and where to point
// the arrow (directly on this map, or through the exit that leads toward the target). No Phaser, no DOM.
import type { FlagCondition, MapDef } from '../data/types';
import { evalCondition, type FlagReader } from '../story/conditions';

export interface ObjectiveTarget {
  map: string;
  x: number;
  y: number;
}

export interface Objective {
  id: string;
  chapter?: string;
  title: string;
  hint: string;
  /** Candidate tiles (any map). The nearest reachable one is used. */
  targets: ObjectiveTarget[];
  done: FlagCondition;
  available?: FlagCondition;
  optional?: boolean;
}

export type ObjectiveState = 'done' | 'current' | 'open' | 'locked';

export interface ObjectiveStatus {
  objective: Objective;
  state: ObjectiveState;
}

export interface Progress {
  done: number;
  total: number;
}

/**
 * Status of every objective. Main objectives are monotonic: if a later main objective is done, every earlier one counts
 * as done (old saves, skipped steps). The current objective is the first main one that is not done and available.
 * Optional objectives are `open` once available and not done.
 */
export function evaluate(list: readonly Objective[], flag: FlagReader): ObjectiveStatus[] {
  let lastDone = -1;
  list.forEach((o, i) => {
    if (!o.optional && evalCondition(o.done, flag)) lastDone = i;
  });
  let currentSeen = false;
  return list.map((objective, i) => {
    const done = evalCondition(objective.done, flag) || (!objective.optional && i < lastDone);
    if (done) return { objective, state: 'done' };
    const available = evalCondition(objective.available, flag);
    if (!available) return { objective, state: 'locked' };
    if (objective.optional) return { objective, state: 'open' };
    if (!currentSeen) {
      currentSeen = true;
      return { objective, state: 'current' };
    }
    return { objective, state: 'locked' };
  });
}

export function currentObjective(list: readonly Objective[], flag: FlagReader): Objective | null {
  return evaluate(list, flag).find((s) => s.state === 'current')?.objective ?? null;
}

export function progress(list: readonly Objective[], flag: FlagReader): Progress {
  const main = evaluate(list, flag).filter((s) => !s.objective.optional);
  return { done: main.filter((s) => s.state === 'done').length, total: main.length };
}

export type MapLookup = (id: string) => MapDef | undefined;

export type ResolvedTarget =
  | { kind: 'here'; map: string; x: number; y: number }
  /** (x, y) is the warp tile on the current map; `to` the next map on the way; `final` the real target. */
  | { kind: 'exit'; map: string; x: number; y: number; to: string; final: ObjectiveTarget };

/** Shortest hop path (BFS over warps) from `from` to any of `goals`: the map to go to next, or null if unreachable. */
export function nextHop(from: string, goals: ReadonlySet<string>, maps: MapLookup): string | null {
  if (goals.has(from)) return from;
  const first = new Map<string, string>();
  const queue: string[] = [from];
  const seen = new Set<string>([from]);
  while (queue.length > 0) {
    const id = queue.shift() as string;
    const map = maps(id);
    if (!map) continue;
    for (const w of map.warps) {
      if (seen.has(w.to)) continue;
      seen.add(w.to);
      first.set(w.to, id === from ? w.to : (first.get(id) as string));
      if (goals.has(w.to)) return first.get(w.to) as string;
      queue.push(w.to);
    }
  }
  return null;
}

const manhattan = (ax: number, ay: number, bx: number, by: number): number => Math.abs(ax - bx) + Math.abs(ay - by);

/** Where to point from `pos` on `mapId`: the target itself if it is on this map, else the exit toward it. */
export function resolveTarget(obj: Objective, mapId: string, pos: { x: number; y: number }, maps: MapLookup): ResolvedTarget | null {
  const here = obj.targets.filter((t) => t.map === mapId);
  if (here.length > 0) {
    const best = here.reduce((a, b) => (manhattan(a.x, a.y, pos.x, pos.y) <= manhattan(b.x, b.y, pos.x, pos.y) ? a : b));
    return { kind: 'here', map: mapId, x: best.x, y: best.y };
  }
  const hop = nextHop(mapId, new Set(obj.targets.map((t) => t.map)), maps);
  const map = maps(mapId);
  if (!hop || !map) return null;
  const warps = map.warps.filter((w) => w.to === hop);
  if (warps.length === 0) return null;
  const w = warps.reduce((a, b) => (manhattan(a.x, a.y, pos.x, pos.y) <= manhattan(b.x, b.y, pos.x, pos.y) ? a : b));
  const final = obj.targets.find((t) => t.map === hop) ?? (obj.targets[0] as ObjectiveTarget);
  return { kind: 'exit', map: mapId, x: w.x, y: w.y, to: hop, final };
}

/** Whole tiles between the player and a resolved target. */
export function distance(pos: { x: number; y: number }, t: { x: number; y: number }): number {
  return manhattan(pos.x, pos.y, t.x, t.y);
}
