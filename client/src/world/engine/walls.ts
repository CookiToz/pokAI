// Thin-wall selection (pure, no Phaser): which wall tiles render as slabs and which slab variant each one gets.
//
// THIN families (drawn as slabs ~28% of a tile thick that follow the wall run):
//   wall, wall_window       interior rooms, hubs, stores, benchmark arenas, tour de conformite
//   prison_wall             AIACT detention centre (cell blocks)
//   concrete_wall           city boundary / street walls
//   aiact_wall, aiact_door  AIACT compound walls and gates
//   poster_aiact            only when it sits in a wall line (it is then a poster ON the slab face)
// VOLUMETRIC on purpose (building exteriors, never thin): house_*, hub_*, store_*, bench_*, shop_*, tower_*,
//   container_*, treehouse_*, roofs and landmarks.
// A thin-family tile that belongs to a solid block (any 2x2 square made only of thin-family tiles, e.g. a concrete
// city block) stays a full cube: it is a building, not a wall line.
//
// Slab variant = 4-neighbour connectivity: bit N(y-1)=1, E(x+1)=2, S(y+1)=4, W(x-1)=8. E/W arms run along gx,
// N/S arms along gy. Texture key: `<family>:<variantName(mask)>` (+ `:low` for the cut-down near-camera slab).
import type { TileName } from '../../data/tiles';

/** Tile lookup: null = outside the map or unknown tile. */
export type NameAt = (x: number, y: number) => TileName | null;

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

/** Wall families that can be thin (poster_aiact is handled separately: only when it sits in a wall line). */
export const THIN_FAMILIES: ReadonlySet<TileName> = new Set<TileName>(['wall', 'wall_window', 'prison_wall', 'concrete_wall', 'aiact_wall', 'aiact_door']);

/** Tiles that make up a "solid block" for the 2x2 thickness test. */
const BLOCK_TILES: ReadonlySet<TileName> = new Set<TileName>([...THIN_FAMILIES, 'poster_aiact']);
/** Neighbours a slab connects to (besides thin walls): bars and gates sit in the same wall line. */
const CONNECT_EXTRA: ReadonlySet<TileName> = new Set<TileName>(['cell_bars']);

const inBlock = (at: NameAt, x: number, y: number): boolean => {
  const t = at(x, y);
  return t !== null && BLOCK_TILES.has(t);
};

/** True when (x, y) is part of a 2x2 square of wall-family tiles, i.e. a building mass rather than a wall line. */
export function isThickWall(at: NameAt, x: number, y: number): boolean {
  for (const dx of [-1, 0]) {
    for (const dy of [-1, 0]) {
      if (inBlock(at, x + dx, y + dy) && inBlock(at, x + dx + 1, y + dy) && inBlock(at, x + dx, y + dy + 1) && inBlock(at, x + dx + 1, y + dy + 1)) return true;
    }
  }
  return false;
}

const hasThinNeighbour = (at: NameAt, x: number, y: number): boolean =>
  [at(x, y - 1), at(x + 1, y), at(x, y + 1), at(x - 1, y)].some((t) => t !== null && THIN_FAMILIES.has(t) && t !== 'aiact_door');

/** The slab family to draw for tile `name` at (x, y), or null when the tile keeps its volumetric / prop art. */
export function thinFamily(at: NameAt, name: TileName, x: number, y: number): TileName | null {
  if (name === 'poster_aiact') return hasThinNeighbour(at, x, y) && !isThickWall(at, x, y) ? name : null;
  if (!THIN_FAMILIES.has(name)) return null;
  return isThickWall(at, x, y) ? null : name;
}

/** Does the neighbour at (x, y) continue a wall line? */
function connects(at: NameAt, x: number, y: number): boolean {
  const t = at(x, y);
  if (t === null) return false;
  if (THIN_FAMILIES.has(t) || CONNECT_EXTRA.has(t)) return true;
  return t === 'poster_aiact' && hasThinNeighbour(at, x, y);
}

/** 4-neighbour connectivity mask (N=1, E=2, S=4, W=8). */
export function wallMask(at: NameAt, x: number, y: number): number {
  return (connects(at, x, y - 1) ? N : 0) | (connects(at, x + 1, y) ? E : 0) | (connects(at, x, y + 1) ? S : 0) | (connects(at, x - 1, y) ? W : 0);
}

export type WallShape = 'solo' | 'end' | 'run' | 'corner' | 'tee' | 'cross';

const bits = (m: number): number => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);

export function wallShape(mask: number): WallShape {
  const n = bits(mask);
  if (n === 0) return 'solo';
  if (n === 1) return 'end';
  if (n === 2) return mask === (E | W) || mask === (N | S) ? 'run' : 'corner';
  return n === 3 ? 'tee' : 'cross';
}

/** Texture-key suffix of a mask: `solo`, `x` (run along gx), `y` (run along gy), else `j<mask>` (end / corner / tee / cross pillar). */
export function variantName(mask: number): string {
  if (mask === 0) return 'solo';
  if (mask === (E | W)) return 'x';
  if (mask === (N | S)) return 'y';
  return `j${mask}`;
}

/** All 16 masks. */
export const ALL_MASKS: readonly number[] = Array.from({ length: 16 }, (_, i) => i);

/** Masks a near-camera (cut-down) slab can have: a tile on the last column has no E arm, on the last row no S arm. */
export const LOW_MASKS: readonly number[] = ALL_MASKS.filter((m) => !((m & E) && (m & S)));

/** True when the slab shows a full-tile-wide face to the camera (left face needs W+E and no S arm; right face N+S and no E arm). */
export function hasFullFace(mask: number): boolean {
  return ((mask & (W | E)) === (W | E) && !(mask & S)) || ((mask & (N | S)) === (N | S) && !(mask & E));
}

const BASE_OF: Partial<Record<TileName, TileName>> = { wall_window: 'wall', aiact_door: 'aiact_wall' };
const POSTER_BASES: ReadonlySet<TileName> = new Set<TileName>(['wall', 'prison_wall', 'concrete_wall', 'aiact_wall']);

/** Family whose slab a wall-line poster hangs on (first plain wall neighbour; windows count as plain wall). */
export function posterBase(at: NameAt, x: number, y: number): TileName {
  for (const t of [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)]) {
    if (!t) continue;
    const b = BASE_OF[t] ?? t;
    if (POSTER_BASES.has(b)) return b;
  }
  return 'wall';
}

/** Candidate texture keys, most specific first, for a thin wall tile. `low` = cut-down near-camera slab. */
export function wallKeys(family: TileName, mask: number, low: boolean, base: TileName = 'wall'): string[] {
  const v = variantName(mask);
  if (family === 'poster_aiact') return low ? [`${base}:${v}:low`, `wall:${v}:low`] : [`poster_aiact:${base}:${v}`, `${base}:${v}`];
  const b = BASE_OF[family] ?? family;
  return low ? [`${b}:${v}:low`] : [`${family}:${v}`, `${b}:${v}`];
}

/** Near-camera slabs (last column / last row of the map) are cut low so the player stays visible behind them. */
export function wantsLow(family: TileName, x: number, y: number, width: number, height: number): boolean {
  return family !== 'aiact_door' && (x === width - 1 || y === height - 1);
}
