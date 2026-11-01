// Building analysis (pure, no Phaser): turns the building tiles of a map into whole buildings so the art can draw each
// one as a single volume with a single accent colour.
//
// A building = a 4-connected group of building tiles. Every tile of a building is drawn with three images:
//   shadow  hard riso offset shadow, on a band just above the ground (other blocks cover it, so only the outer
//           silhouette shows: no shadow stripes across the facade),
//   body    flat faces WITHOUT tile-edge outlines (facade modules: socle, windows, cornice, door...),
//   edge    the ink outline of the building silhouette for that tile (keyed by the 4-neighbour mask), so the seams
//           between two tiles of the same facade are never inked.
// Texture keys are built here and parsed back by world/art/buildings.ts.
import type { TileName } from '../../data/tiles';
import { isThickWall, type NameAt } from './walls';

export type Theme = 'city' | 'grove' | 'port' | 'dunes' | 'capitale';
export type Accent = 'pink' | 'blue' | 'yellow' | 'teal' | 'leaf' | 'orange' | 'red';
export type Style = 'house' | 'cabin' | 'shop' | 'tower' | 'hub' | 'store' | 'bench' | 'block' | 'wall' | 'container';
export type RoofShape = 'single' | 'back' | 'front' | 'flat';

export const THEMES: readonly Theme[] = ['city', 'grove', 'port', 'dunes', 'capitale'];

/** Theme of each outdoor map (brief v0.7 §2). Unknown outdoor maps use 'city'. */
const MAP_THEME: Readonly<Record<string, Theme>> = {
  latentia_city: 'city', temple_attention: 'city',
  hugging_grove: 'grove', route_foret_poids: 'grove',
  port_8080: 'port', sentier_cotier: 'port', route_cables_sous_marins: 'port',
  dunes_datacenters: 'dunes', mont_gpu: 'dunes',
  conformite_capitale: 'capitale', route_bureaucratie: 'capitale',
};

export function themeOf(mapId: string): Theme {
  return MAP_THEME[mapId] ?? 'city';
}

/** One accent per building, picked in its city's palette (brief §2). */
export const THEME_ACCENTS: Readonly<Record<Theme, readonly Accent[]>> = {
  city: ['pink', 'blue', 'yellow', 'teal'],
  grove: ['leaf', 'yellow'],
  port: ['orange', 'teal', 'blue'],
  dunes: ['orange', 'teal'],
  capitale: ['red'],
};

/** Tiles that are always part of a building. */
const ALWAYS: ReadonlySet<TileName> = new Set<TileName>([
  'house_wall', 'house_window', 'house_door', 'roof_red', 'roof_blue', 'roof_grey',
  'hub_wall', 'hub_door', 'hub_roof', 'store_wall', 'store_door', 'store_roof', 'bench_wall', 'bench_door', 'bench_roof',
  'tower_wall', 'tower_roof', 'shop_wall', 'shop_window', 'shop_door', 'awning_red', 'awning_teal',
  'container_wall', 'container_roof', 'treehouse_wall', 'treehouse_roof',
]);
/** Wall-family tiles that become a building only inside a solid (2x2) block; in a wall line they stay thin slabs. */
const THICK_ONLY: ReadonlySet<TileName> = new Set<TileName>(['concrete_wall', 'aiact_wall', 'aiact_door', 'wall_window', 'poster_aiact']);
const ROOFS: ReadonlySet<TileName> = new Set<TileName>(['roof_red', 'roof_blue', 'roof_grey', 'hub_roof', 'store_roof', 'bench_roof', 'treehouse_roof', 'tower_roof']);
const DOORS: ReadonlySet<TileName> = new Set<TileName>(['house_door', 'hub_door', 'store_door', 'bench_door', 'shop_door', 'aiact_door']);

/** True when the tile is drawn by the building system (outdoor maps only for the thick wall families). */
export function isBuildingTile(at: NameAt, x: number, y: number, outdoor: boolean): boolean {
  const t = at(x, y);
  if (!t) return false;
  if (ALWAYS.has(t)) return true;
  return outdoor && THICK_ONLY.has(t) && isThickWall(at, x, y);
}

/** Pitched roofs: houses in the city and the grove, every grove building; everything else gets a roof terrace. */
export function isPitched(style: Style, theme: Theme): boolean {
  if (style === 'cabin') return true;
  if (theme === 'grove') return style === 'house' || style === 'hub' || style === 'store' || style === 'bench';
  return style === 'house' && theme === 'city';
}

/** Which style a building takes from the tiles it is made of (first match wins). */
function styleOf(names: ReadonlySet<TileName>): Style {
  const has = (...ns: TileName[]): boolean => ns.some((n) => names.has(n));
  if (has('treehouse_wall', 'treehouse_roof')) return 'cabin';
  if (has('container_wall', 'container_roof')) return 'container';
  if (has('tower_wall', 'tower_roof')) return 'tower';
  if (has('shop_wall', 'shop_window', 'shop_door', 'awning_red', 'awning_teal')) return 'shop';
  if (has('hub_wall', 'hub_door', 'hub_roof')) return 'hub';
  if (has('store_wall', 'store_door', 'store_roof')) return 'store';
  if (has('bench_wall', 'bench_door', 'bench_roof')) return 'bench';
  if (has('house_wall', 'house_window', 'house_door')) return 'house';
  if (has('aiact_wall', 'aiact_door', 'wall_window', 'roof_red', 'roof_blue', 'roof_grey')) return 'block';
  return 'wall';
}

export interface Building {
  id: number;
  style: Style;
  accent: Accent;
}

interface Analysis {
  theme: Theme;
  /** Building index per tile (-1 = none). */
  comp: Int32Array;
  list: Building[];
}

export interface MapLike {
  id: string;
  width: number;
  height: number;
  kind?: string;
}

const cache = new WeakMap<object, Analysis>();

/** Small stable hash -> [0, 1). */
export function hashXY(x: number, y: number, salt = 0): number {
  let h = (Math.imul(x + 17, 73856093) ^ Math.imul(y + 3, 19349663) ^ Math.imul(salt + 5, 83492791)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function accentFor(style: Style, theme: Theme, names: ReadonlySet<TileName>, seedX: number, seedY: number): Accent {
  if (style === 'hub') return 'yellow'; // the Hub is always the yellow 🤗 house, in every city
  if (style === 'block' && (names.has('aiact_wall') || names.has('aiact_door'))) return 'red';
  const pal = THEME_ACCENTS[theme];
  return pal[Math.floor(hashXY(seedX, seedY, 11) * pal.length)] ?? pal[0]!;
}

/** Connected building groups of a map (cached per map object). */
export function analyse(map: MapLike, at: NameAt): Analysis {
  const hit = cache.get(map);
  if (hit) return hit;
  const { width: W, height: H } = map;
  const outdoor = map.kind !== 'interior' && map.kind !== 'dungeon';
  const theme = themeOf(map.id);
  const comp = new Int32Array(W * H).fill(-1);
  const list: Building[] = [];
  for (let y0 = 0; y0 < H; y0++)
    for (let x0 = 0; x0 < W; x0++) {
      if (comp[y0 * W + x0] !== -1 || !isBuildingTile(at, x0, y0, outdoor)) continue;
      const id = list.length;
      const names = new Set<TileName>();
      const stack: [number, number][] = [[x0, y0]];
      comp[y0 * W + x0] = id;
      while (stack.length) {
        const [x, y] = stack.pop()!;
        names.add(at(x, y)!);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || comp[ny * W + nx] !== -1) continue;
          if (!isBuildingTile(at, nx, ny, outdoor)) continue;
          comp[ny * W + nx] = id;
          stack.push([nx, ny]);
        }
      }
      const style = styleOf(names);
      list.push({ id, style, accent: accentFor(style, theme, names, x0, y0) });
    }
  const out = { theme, comp, list };
  cache.set(map, out);
  return out;
}

// ---------- per-tile sprite keys ----------

/** Neighbour mask bits: the neighbour is part of the same building AND the same volume (same height class). */
export const MN = 1;
export const ME = 2;
export const MS = 4;
export const MW = 8;

/** Volume of a tile: decides its height in the art and which neighbours it merges with. */
export type Geom = 'st' | 'stp' | 'tw' | 'wl' | 'b2' | 'b3' | `rf-${RoofShape}`;

export interface BuildingSprite {
  /** Shadow image (only on the right / front silhouette), drawn on the ground band. */
  shadow: string | null;
  body: string;
  edge: string;
}

function partOf(name: TileName, style: Style, pitched: boolean, x: number, y: number): string {
  if (style === 'container') return name === 'container_roof' ? 'c3' : 'c2';
  if (DOORS.has(name)) return 'door';
  if (name === 'poster_aiact') return 'poster';
  if (name === 'shop_window') return 'front';
  if (ROOFS.has(name)) {
    if (pitched && name !== 'tower_roof') return 'roof';
    const r = hashXY(x, y, 3);
    return r < 0.16 ? 'top1' : r < 0.26 ? 'top2' : 'top0';
  }
  return 'wall';
}

/** Height class used for the mask: tiles only merge with neighbours of the same volume. */
function classOf(part: string): string {
  if (part === 'roof' || part === 'c2' || part === 'c3') return part;
  return 'body';
}

function geomOf(style: Style, theme: Theme, part: string): Geom {
  if (part === 'c2') return 'b2';
  if (part === 'c3') return 'b3';
  if (style === 'tower') return 'tw';
  if (style === 'wall') return 'wl';
  return isPitched(style, theme) ? 'st' : 'stp';
}

/** The three images of a building tile, or null when (x, y) is not part of a building. */
export function buildingSprite(map: MapLike, at: NameAt, x: number, y: number): BuildingSprite | null {
  const a = analyse(map, at);
  const W = map.width;
  const id = a.comp[y * W + x] ?? -1;
  if (id < 0) return null;
  const b = a.list[id]!;
  const name = at(x, y)!;
  const pitched = isPitched(b.style, a.theme);
  const part = partOf(name, b.style, pitched, x, y);
  const cls = classOf(part);
  const same = (nx: number, ny: number): boolean => {
    if (nx < 0 || ny < 0 || nx >= W || ny >= map.height || a.comp[ny * W + nx] !== id) return false;
    return classOf(partOf(at(nx, ny)!, b.style, pitched, nx, ny)) === cls;
  };
  const mask = (same(x, y - 1) ? MN : 0) | (same(x + 1, y) ? ME : 0) | (same(x, y + 1) ? MS : 0) | (same(x - 1, y) ? MW : 0);
  let geom: Geom = geomOf(b.style, a.theme, part);
  let edgeMask = mask;
  let body = `bb:${b.style}:${part}:${a.theme}:${b.accent}`;
  if (part === 'roof') {
    const shape: RoofShape = mask & MN ? (mask & MS ? 'flat' : 'front') : mask & MS ? 'back' : 'single';
    geom = `rf-${shape}`;
    edgeMask = mask & (ME | MW);
    body = `bb:${b.style}:roof-${shape}:${a.theme}:-`;
  }
  const front = !(mask & MS) || !(mask & ME);
  return { shadow: front ? `bs:${geom}` : null, body, edge: `be:${geom}:${edgeMask}` };
}

/** Every building texture key a map needs (for lazy texture building on map load). */
export function buildingKeys(map: MapLike, at: NameAt): Set<string> {
  const out = new Set<string>();
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      const s = buildingSprite(map, at, x, y);
      if (!s) continue;
      out.add(s.body).add(s.edge);
      if (s.shadow) out.add(s.shadow);
    }
  return out;
}
