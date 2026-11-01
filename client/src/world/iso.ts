// Pure isometric helpers (no Phaser): projection, depth sorting, direction mapping, collisions, zoom.
import { db } from '../data/db';
import type { Direction, MapDef } from '../data/types';
import { SOLID_TILES, TILE_NAMES, type TileName } from '../data/tiles';

export const TILE_W = 64;
export const TILE_H = 32;
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;

export interface Vec2 {
  x: number;
  y: number;
}

/** Grid (gx, gy) -> world pixels of the tile centre. */
export function project(gx: number, gy: number): Vec2 {
  return { x: (gx - gy) * HALF_W, y: (gx + gy) * HALF_H };
}

/** World pixels -> fractional grid coordinates (inverse of `project`). */
export function unproject(x: number, y: number): Vec2 {
  return { x: (x / HALF_W + y / HALF_H) / 2, y: (y / HALF_H - x / HALF_W) / 2 };
}

/** Depth layers inside one (gx + gy) diagonal. Larger = drawn later (in front). */
export const LAYER = { block: 20, prop: 30, shadow: 40, actor: 50, fx: 90 } as const;
export const GROUND_DEPTH = -100000;

/** Painter's-algorithm key: tiles further along the diagonal are in front. Works for fractional (moving) positions. */
export function depthKey(gx: number, gy: number, layer: number): number {
  return (gx + gy) * 100 + layer;
}

// ---------- directions ----------
// Authored `Direction`s (NPC facing, warps) are GRID directions: up = gy-1 (screen up-right), right = gx+1 (screen
// down-right)... The player's own movement is screen-aligned and free (see world/engine/movement.ts).
export const DIR_VEC: Readonly<Record<Direction, readonly [number, number]>> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

export const OPPOSITE: Readonly<Record<Direction, Direction>> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

export interface SpriteView {
  view: 'front' | 'back';
  flip: boolean;
}

/** Which sprite view and mirroring show a character that walks/faces `dir`. */
export function viewOf(dir: Direction): SpriteView {
  switch (dir) {
    case 'right':
      return { view: 'front', flip: false }; // down-right
    case 'down':
      return { view: 'front', flip: true }; // down-left
    case 'up':
      return { view: 'back', flip: false }; // up-right
    case 'left':
      return { view: 'back', flip: true }; // up-left
  }
}

/** Screen-space direction vector of a grid direction. */
export function screenDir(dir: Direction): Vec2 {
  const [dx, dy] = DIR_VEC[dir];
  return { x: (dx - dy) * HALF_W, y: (dx + dy) * HALF_H };
}

/** Direction from `from` to the adjacent cell `to`, or null if they are not 4-neighbours. */
export function directionBetween(from: Vec2, to: Vec2): Direction | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 1 && dy === 0) return 'right';
  if (dx === -1 && dy === 0) return 'left';
  if (dx === 0 && dy === 1) return 'down';
  if (dx === 0 && dy === -1) return 'up';
  return null;
}

/** Pick the direction to walk from a set of held ones; `last` wins if still held. */
export function pickHeld(held: ReadonlySet<Direction>, last: Direction | null): Direction | null {
  if (last && held.has(last)) return last;
  for (const d of DIRECTIONS) if (held.has(d)) return d;
  return null;
}

// ---------- map queries ----------

const TILE_SET: ReadonlySet<string> = new Set<string>(TILE_NAMES);

export function tileNameAt(map: MapDef, x: number, y: number): TileName | null {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
  const ch = map.rows[y]?.[x];
  if (ch === undefined) return null;
  const n = map.legend[ch];
  return n !== undefined && TILE_SET.has(n) ? (n as TileName) : null;
}

export interface Blocker {
  x: number;
  y: number;
}

/** Collision query: out of bounds, solid tile, or occupied by an NPC. */
export function isBlocked(map: MapDef, x: number, y: number, occupied: readonly Blocker[] = []): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true;
  const t = tileNameAt(map, x, y);
  // an unknown tile name inside the map counts as plain ground (robust against art/content drift)
  if (t !== null && SOLID_TILES.has(t)) return true;
  return occupied.some((o) => o.x === x && o.y === y);
}

/** Projected pixel bounds of a map: x in [minX, maxX], y in [minY, maxY] (diamond corners). */
export function mapBounds(map: MapDef): { minX: number; maxX: number; minY: number; maxY: number } {
  return { minX: -(map.height) * HALF_W, maxX: map.width * HALF_W, minY: -HALF_H, maxY: (map.width + map.height) * HALF_H };
}

/** Camera zoom that shows about `tilesAcross` tiles across the window width (clamped). */
export function fitZoom(viewW: number, viewH: number, tilesAcross = 16): number {
  const byW = viewW / (tilesAcross * TILE_W);
  const byH = viewH / (tilesAcross * 0.62 * TILE_H);
  const z = Math.min(byW, Math.max(byH, byW * 0.8));
  return Math.min(2, Math.max(0.55, z));
}

// ---------- map-aware art selection ----------

const ROOF_OF: Partial<Record<TileName, string>> = {
  roof_red: 'red', roof_blue: 'blue', roof_grey: 'grey', hub_roof: 'hub', store_roof: 'store', bench_roof: 'bench', treehouse_roof: 'wood',
};

/** Roof colour above a wall tile: scan up the column for the first roof tile. */
export function roofColourAbove(map: MapDef, x: number, y: number): string {
  for (let yy = y - 1; yy >= Math.max(0, y - 4); yy--) {
    const t = tileNameAt(map, x, yy);
    const c = t ? ROOF_OF[t] : undefined;
    if (c) return c;
  }
  return 'grey';
}

export type RoofShapeName = 'single' | 'back' | 'front' | 'flat';

/** Shape of a roof tile from its roof neighbours north/south (rows share one ridge). */
export function roofShape(map: MapDef, x: number, y: number): RoofShapeName {
  const isRoof = (yy: number): boolean => {
    const t = tileNameAt(map, x, yy);
    return !!t && t in ROOF_OF;
  };
  const north = isRoof(y - 1);
  const south = isRoof(y + 1);
  if (north && south) return 'flat';
  if (south) return 'back';
  if (north) return 'front';
  return 'single';
}

const GROUND_FOR_UNDERLAY: ReadonlySet<TileName> = new Set<TileName>([
  'grass', 'grass_alt', 'path', 'sand', 'water', 'water_edge', 'floor_wood', 'floor_lab', 'floor_tile', 'carpet',
  'asphalt', 'sidewalk', 'plaza', 'grass_park', 'cell_floor', 'hub_floor', 'arena_floor',
]);

/** Which ground tile to draw beneath a prop: majority vote among the 8 neighbours, fallback to the map's dominant ground. */
export function groundUnder(map: MapDef, x: number, y: number): TileName {
  const votes = new Map<TileName, number>();
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const t = tileNameAt(map, x + dx, y + dy);
      if (t && GROUND_FOR_UNDERLAY.has(t) && t !== 'water' && t !== 'water_edge') {
        // plain walkable ground is preferred over decorative variants
        votes.set(t, (votes.get(t) ?? 0) + (dx === 0 || dy === 0 ? 2 : 1));
      }
    }
  }
  let best: TileName | null = null;
  let n = 0;
  for (const [t, v] of votes) {
    if (v > n) {
      best = t;
      n = v;
    }
  }
  if (best) return best === 'path' || best === 'sand' ? (votes.has('grass') ? 'grass' : best) : best;
  return dominantGround(map);
}

export function dominantGround(map: MapDef): TileName {
  const counts = new Map<TileName, number>();
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const t = tileNameAt(map, x, y);
      if (t && GROUND_FOR_UNDERLAY.has(t) && t !== 'water' && t !== 'water_edge') counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  let best: TileName = 'grass';
  let n = -1;
  for (const [t, v] of counts) {
    if (v > n) {
      best = t;
      n = v;
    }
  }
  return best;
}

/** Cheap deterministic hash for tile variants. */
export function variantOf(x: number, y: number, count: number): number {
  let h = (Math.imul(x + 11, 73856093) ^ Math.imul(y + 5, 19349663)) >>> 0;
  h = (h ^ (h >>> 15)) >>> 0;
  return h % count;
}

/** True when the wall at (x, y) sits on the near (camera-facing) side of an indoor room and should be cut low. */
export function isNearWall(map: MapDef, x: number, y: number): boolean {
  return x === map.width - 1 || y === map.height - 1;
}

/** Start/respawn map when a save points at a map that no longer exists. */
export function fallbackMapId(): string {
  for (const id of ['aiact_center', 'latentia_city', 'player_house']) if (db.hasMap(id)) return id;
  return db.allMaps()[0]?.id ?? 'player_house';
}
