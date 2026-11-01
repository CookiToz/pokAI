// Pure puzzle logic (no Phaser): gates, switch plates and pushable crates described by MapDef.gates/switches/pushables.
//
// Persistence uses plain boolean flags (SaveData.flags): a crate that left its authored tile is stored as ONE true flag
// `crate_<map>_<id>_<x>_<y>` (the old flag is deleted on every push). No flag = the crate is on its authored tile.
// Switch flags are LIVE (set while occupied, cleared when released) unless they start with `latch_`, which stay set.
// Once every gate of a map is open at the same time the map is "solved" (flag `puzzle_solved_<map>`): gates stay open
// and crates keep their place for good.
import type { MapDef } from '../../data/types';
import { SOLID_TILES } from '../../data/tiles';
import { tileNameAt } from '../iso';

export interface Pt {
  x: number;
  y: number;
}

export type Flags = Record<string, boolean>;
export type CrateMap = Map<string, Pt>;

export const LATCH_PREFIX = 'latch_';
export const crateFlagPrefix = (mapId: string, id: string): string => `crate_${mapId}_${id}_`;
export const crateFlag = (mapId: string, id: string, x: number, y: number): string => `${crateFlagPrefix(mapId, id)}${x}_${y}`;
export const solvedFlag = (mapId: string): string => `puzzle_solved_${mapId}`;

export const hasPuzzle = (map: MapDef): boolean => !!(map.gates?.length || map.switches?.length || map.pushables?.length);
export const isSolved = (map: MapDef, flags: Flags): boolean => flags[solvedFlag(map.id)] === true;

// ---------- crates ----------

/** Current crate positions: the persisted flag if any, else the authored tile. */
export function loadCrates(map: MapDef, flags: Flags): CrateMap {
  const out: CrateMap = new Map();
  for (const p of map.pushables ?? []) {
    const prefix = crateFlagPrefix(map.id, p.id);
    let pos: Pt = { x: p.x, y: p.y };
    for (const [k, v] of Object.entries(flags)) {
      if (!v || !k.startsWith(prefix)) continue;
      const m = /^(-?\d+)_(-?\d+)$/.exec(k.slice(prefix.length));
      if (m) pos = { x: Number(m[1]), y: Number(m[2]) };
    }
    out.set(p.id, pos);
  }
  return out;
}

/** Persist a crate move (removes every older position flag of that crate). */
export function storeCrate(flags: Flags, map: MapDef, id: string, to: Pt): void {
  const prefix = crateFlagPrefix(map.id, id);
  for (const k of Object.keys(flags)) if (k.startsWith(prefix)) delete flags[k];
  const home = map.pushables?.find((p) => p.id === id);
  if (home && home.x === to.x && home.y === to.y) return; // back home: no flag
  flags[crateFlag(map.id, id, to.x, to.y)] = true;
}

/** Forget every moved crate of a map (they return to their authored tiles). */
export function resetCrates(flags: Flags, map: MapDef): void {
  for (const p of map.pushables ?? []) {
    const prefix = crateFlagPrefix(map.id, p.id);
    for (const k of Object.keys(flags)) if (k.startsWith(prefix)) delete flags[k];
  }
}

export function crateAt(crates: CrateMap, x: number, y: number): string | null {
  for (const [id, p] of crates) if (p.x === x && p.y === y) return id;
  return null;
}

// ---------- gates ----------

export const gateAt = (map: MapDef, x: number, y: number): { x: number; y: number; flag: string } | undefined =>
  map.gates?.find((g) => g.x === x && g.y === y);

/** A gate is open while its flag is set, or for good once the map is solved. */
export const gateIsOpen = (map: MapDef, flags: Flags, g: { flag: string }): boolean => flags[g.flag] === true || isSolved(map, flags);

// ---------- collision ----------

export interface PuzzleView {
  map: MapDef;
  flags: Flags;
  crates: CrateMap;
  /** Tile the player stands on: a gate closing under their feet never traps them. */
  standing?: Pt;
}

/** Terrain collision with gates and the static-vs-pushable crate distinction, WITHOUT dynamic crates. */
export function terrainSolid(v: PuzzleView, x: number, y: number): boolean {
  const { map } = v;
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true;
  const g = gateAt(map, x, y);
  if (g) return !gateIsOpen(map, v.flags, g) && !(v.standing?.x === x && v.standing?.y === y);
  const t = tileNameAt(map, x, y);
  if (t === null) return false;
  // a 'crate_push' tile on an authored pushable spot is the crate's ground, the crate itself is dynamic
  if (t === 'crate_push' && map.pushables?.some((p) => p.x === x && p.y === y)) return false;
  return SOLID_TILES.has(t);
}

/** Full collision: terrain plus crates. */
export const tileSolid = (v: PuzzleView, x: number, y: number): boolean => terrainSolid(v, x, y) || crateAt(v.crates, x, y) !== null;

const isSpecialTile = (map: MapDef, x: number, y: number): boolean =>
  map.warps.some((w) => w.x === x && w.y === y) ||
  map.triggers.some((t) => x >= t.x && x < t.x + (t.w ?? 1) && y >= t.y && y < t.y + (t.h ?? 1)) ||
  !!gateAt(map, x, y);

/**
 * Where the crate `id` would land when shoved by (dx, dy) (a unit grid step), or null when blocked: out of the map,
 * terrain, another crate, a character in `occupied`, or a warp/trigger/gate tile (crates never seal an exit).
 */
export function planPush(v: PuzzleView, id: string, dx: number, dy: number, occupied: readonly Pt[] = []): Pt | null {
  const from = v.crates.get(id);
  if (!from || Math.abs(dx) + Math.abs(dy) !== 1) return null;
  const to = { x: from.x + dx, y: from.y + dy };
  if (terrainSolid({ ...v, standing: undefined }, to.x, to.y)) return null;
  if (crateAt(v.crates, to.x, to.y)) return null;
  if (occupied.some((o) => o.x === to.x && o.y === to.y)) return null;
  if (isSpecialTile(v.map, to.x, to.y)) return null;
  return to;
}

// ---------- switches ----------

/** Desired state of every switch flag: on when ALL the plates sharing the flag are covered by the player or a crate. */
export function switchStates(map: MapDef, crates: CrateMap, player: Pt): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const s of map.switches ?? []) {
    const covered = (player.x === s.x && player.y === s.y) || crateAt(crates, s.x, s.y) !== null;
    out[s.flag] = (out[s.flag] ?? true) && covered;
  }
  return out;
}

export interface SwitchChange {
  flag: string;
  on: boolean;
}

/**
 * Apply `switchStates` to the flags. Latched flags are only ever set. Returns the flags that changed, and updates the
 * `puzzle_solved_<map>` flag (reported as an extra change with `flag === solvedFlag`).
 */
export function syncSwitches(map: MapDef, crates: CrateMap, player: Pt, flags: Flags): SwitchChange[] {
  const changes: SwitchChange[] = [];
  for (const [flag, on] of Object.entries(switchStates(map, crates, player))) {
    const cur = flags[flag] === true;
    if (on === cur) continue;
    if (!on && flag.startsWith(LATCH_PREFIX)) continue;
    flags[flag] = on;
    changes.push({ flag, on });
  }
  if (!isSolved(map, flags) && (map.gates?.length ?? 0) > 0 && (map.gates ?? []).every((g) => flags[g.flag] === true)) {
    flags[solvedFlag(map.id)] = true;
    changes.push({ flag: solvedFlag(map.id), on: true });
  }
  return changes;
}

/** What to do with the crates when (re)entering a map: keep them when solved or loading a save, else reset. */
export function enterMapCrates(map: MapDef, flags: Flags, restore: boolean): CrateMap {
  if (!restore && !isSolved(map, flags)) resetCrates(flags, map);
  return loadCrates(map, flags);
}

/** Stable small variant of an object id (a crate keeps its look wherever it is pushed). */
export function idVariant(id: string, count: number): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  return h % Math.max(1, count);
}
