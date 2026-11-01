// Pure minimap maths: tile colours and the isometric (diamond) layout, so the minimap matches the game view orientation.
import { ENCOUNTER_TILES, SOLID_TILES, type TileName } from '../../data/tiles';
import type { MapDef } from '../../data/types';

/** LatentOS palette (tokens.css), as concrete colours for canvas. */
export const MM = {
  paper: '#f4efe4', paper2: '#e9e1d0', ink: '#1d1a2b', ink2: '#3a3550', ink3: '#6e6888',
  pink: '#ff48b0', blue: '#0078bf', yellow: '#ffd23f', teal: '#00a095', red: '#e0283c', orange: '#ff6c2f', ctx: '#2fbf71',
} as const;

const WATER: ReadonlySet<TileName> = new Set<TileName>(['water', 'water_edge']);
const PATHS: ReadonlySet<TileName> = new Set<TileName>([
  'path', 'sand', 'sidewalk', 'asphalt', 'crosswalk', 'plaza', 'bridge_wood', 'dock', 'hub_floor', 'arena_floor', 'arena_line', 'floor_tile', 'floor_wood', 'floor_lab', 'carpet', 'cell_floor',
]);
const GREENS: ReadonlySet<TileName> = new Set<TileName>(['grass', 'grass_alt', 'grass_park', 'flower_bed', 'flowers']);
const TREES: ReadonlySet<TileName> = new Set<TileName>(['tree', 'tree_pine', 'tree_birch', 'bush']);
const WARPY: ReadonlySet<TileName> = new Set<TileName>(['exit_mat', 'house_door', 'hub_door', 'store_door', 'bench_door', 'shop_door', 'aiact_door']);

/** Fill colour of one tile on the minimap; null = nothing drawn (outside the map / black void). */
export function tileColour(name: TileName | null): string | null {
  if (name === null) return MM.paper2;
  if (name === 'black') return null;
  if (WATER.has(name)) return MM.blue;
  if (ENCOUNTER_TILES.has(name)) return MM.teal;
  if (WARPY.has(name)) return MM.pink;
  if (name === 'gate' || name === 'switch_plate' || name === 'crate_push') return MM.paper2; // drawn dynamically on top
  if (TREES.has(name)) return '#4c7a5a';
  if (SOLID_TILES.has(name)) return MM.ink3;
  if (PATHS.has(name)) return MM.paper;
  if (GREENS.has(name)) return '#c9d9a8';
  return MM.paper2;
}

export interface Layout {
  /** pixels per half-tile (a tile diamond is 2u wide, u high) */
  u: number;
  width: number;
  height: number;
  /** pixel of the tile centre */
  at(gx: number, gy: number): { x: number; y: number };
}

/** Diamond layout of a map that fits `maxW` x `maxH` pixels (u never above `maxU`). */
export function layoutFor(map: MapDef, maxW: number, maxH: number, maxU = 5): Layout {
  const span = map.width + map.height;
  const u = Math.max(0.8, Math.min(maxU, maxW / span, (maxH * 2) / span));
  const pad = 2;
  const width = Math.ceil(span * u) + pad * 2;
  const height = Math.ceil((span * u) / 2) + pad * 2;
  const ox = map.height * u + pad;
  return { u, width, height, at: (gx, gy) => ({ x: ox + (gx - gy) * u, y: pad + (gx + gy + 1) * (u / 2) }) };
}

/** Screen heading (radians, canvas y down) of a grid-space facing vector on the diamond minimap. */
export function headingAngle(face: { x: number; y: number }): number {
  return Math.atan2((face.x + face.y) / 2, face.x - face.y);
}

export type DotKind = 'trainer' | 'npc';

/** Arrow glyph for a grid-space offset (dx, dy), as seen on screen (isometric projection). */
export function arrowGlyph(dx: number, dy: number): string {
  const a = Math.atan2(dx + dy, dx - dy);
  const i = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
  return ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][i] as string;
}

/** Tiles that deserve a marker: pink door dots for warps (cheap, derived from the map). */
export function warpDots(map: MapDef): { x: number; y: number }[] {
  return map.warps.map((w) => ({ x: w.x, y: w.y }));
}

/** Short label for the minimap: strips the leading arrow and trims. */
export function shortLabel(s: string, max = 22): string {
  const t = s.replace(/^[←→↑↓↖↗↘↙\s]+/, '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function signature(map: MapDef): string {
  return `${map.id}:${map.width}x${map.height}`;
}
