// Where the drawn door of an enterable landmark is. Pure data: shared by the landmark art (which draws the door there)
// and the door audit (which checks that the map warp sits on that tile).
import { LANDMARK_FOOTPRINT, type TileName } from '../../data/tiles';

/** Tile offset from the landmark anchor (front corner tile: max gx, max gy) to the tile standing right in front of the drawn door. */
export interface EntranceOffset {
  dx: number;
  dy: number;
}

/**
 * Doors are drawn on the +gy ("left") front face. `dy` is always 1: the entrance tile is the one just south of the
 * footprint, `dx` is its column relative to the anchor (negative = further left along the face, within -(w-1)..0).
 * Landmarks that are not listed (aiact tower, giant screen, crane, lighthouse) have NO door in their art.
 */
export const ENTRANCE_OFFSET: Readonly<Partial<Record<TileName, EntranceOffset>>> = {
  lm_hf_hub: { dx: -2, dy: 1 },
  lm_bench_tower: { dx: -1, dy: 1 },
  lm_gpu_store: { dx: -1, dy: 1 },
  lm_great_tree: { dx: 0, dy: 1 },
};

/** Entrance offset of a landmark tile, or null when its art shows no door. */
export function entranceOffset(name: string): EntranceOffset | null {
  return ENTRANCE_OFFSET[name as TileName] ?? null;
}

/** Absolute entrance tile of a landmark whose anchor is at (ax, ay). */
export function entranceTile(name: string, ax: number, ay: number): { x: number; y: number } | null {
  const o = entranceOffset(name);
  return o ? { x: ax + o.dx, y: ay + o.dy } : null;
}

/** Sanity: every entrance column lies on the footprint's front face. */
export function entranceInFootprint(name: string): boolean {
  const o = entranceOffset(name);
  const fp = LANDMARK_FOOTPRINT[name as TileName];
  return !!o && !!fp && o.dy === 1 && o.dx <= 0 && o.dx >= -(fp.w - 1);
}
