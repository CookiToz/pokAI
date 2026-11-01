// Pure free-movement maths (no Phaser): screen-aligned input, smooth velocity, tile-grid collision with sliding.
// Coordinates are fractional GRID coordinates: tile (tx, ty) is centred on integers and spans [t-0.5, t+0.5).
import type { Direction } from '../../data/types';

export interface V2 {
  x: number;
  y: number;
}

/** Tiles per second (magnitude in grid space). */
export const WALK_SPEED = 3.0;
export const RUN_SPEED = 5.0;
export const ACCEL = 24;
export const DECEL = 32;
/** Half-extent of the square feet box, in tiles. */
export const FEET_HALF = 0.2;

export const len = (v: V2): number => Math.hypot(v.x, v.y);

export function normalize(v: V2): V2 {
  const l = len(v);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: v.x / l, y: v.y / l };
}

/**
 * Screen-aligned intent -> unit GRID vector. (ix, iy) is the pressed direction on screen (right = +ix, down = +iy).
 * The iso projection is x = (gx - gy) * 32, y = (gx + gy) * 16, so a screen velocity (ix, iy / 2) maps to the grid
 * direction (ix + iy, iy - ix). Cardinal and diagonal presses end up with the same grid speed.
 */
export function screenToGrid(ix: number, iy: number): V2 {
  return normalize({ x: ix + iy, y: iy - ix });
}

/** Screen-space direction (not foreshortened) of a grid vector: right = +x, down = +y. */
export function gridToScreen(v: V2): V2 {
  return { x: v.x - v.y, y: v.x + v.y };
}

/** Move `v` toward `target` by at most `maxDelta` (vector approach). */
export function approach(v: V2, target: V2, maxDelta: number): V2 {
  const dx = target.x - v.x;
  const dy = target.y - v.y;
  const d = Math.hypot(dx, dy);
  if (d <= maxDelta || d < 1e-9) return { x: target.x, y: target.y };
  return { x: v.x + (dx / d) * maxDelta, y: v.y + (dy / d) * maxDelta };
}

/** One smoothing step of the velocity toward `wish * maxSpeed` (wish = unit vector or zero). */
export function stepVelocity(v: V2, wish: V2, maxSpeed: number, dt: number): V2 {
  const moving = len(wish) > 1e-6;
  return approach(v, { x: wish.x * maxSpeed, y: wish.y * maxSpeed }, (moving ? ACCEL : DECEL) * dt);
}

export type SolidFn = (tx: number, ty: number) => boolean;
/** Extra blocking test at the candidate position (e.g. other actors). Receives the position before the move too. */
export type ExtraBlockFn = (nx: number, ny: number, ox: number, oy: number) => boolean;

const cellOf = (c: number): number => Math.floor(c + 0.5);

/** True when the feet box centred on (x, y) overlaps a solid tile. */
export function boxBlocked(x: number, y: number, half: number, solid: SolidFn): boolean {
  const x0 = cellOf(x - half);
  const x1 = cellOf(x + half - 1e-6);
  const y0 = cellOf(y - half);
  const y1 = cellOf(y + half - 1e-6);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) return true;
  return false;
}

export interface SlideResult {
  pos: V2;
  hitX: boolean;
  hitY: boolean;
}

/** Axis-separated move that slides along walls. Large deltas are sub-stepped so the box can't tunnel. */
export function moveAndSlide(pos: V2, delta: V2, half: number, solid: SolidFn, extra?: ExtraBlockFn): SlideResult {
  let x = pos.x;
  let y = pos.y;
  let hitX = false;
  let hitY = false;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(delta.x), Math.abs(delta.y)) / 0.15));
  const sx = delta.x / steps;
  const sy = delta.y / steps;
  for (let i = 0; i < steps; i++) {
    if (sx !== 0) {
      const nx = x + sx;
      if (boxBlocked(nx, y, half, solid) || (extra?.(nx, y, x, y) ?? false)) hitX = true;
      else x = nx;
    }
    if (sy !== 0) {
      const ny = y + sy;
      if (boxBlocked(x, ny, half, solid) || (extra?.(x, ny, x, y) ?? false)) hitY = true;
      else y = ny;
    }
  }
  return { pos: { x, y }, hitX, hitY };
}

/** Nearest 4-way grid direction of a vector (used for the saved facing and authored-facing compatibility). */
export function dirOfVector(v: V2, fallback: Direction = 'down'): Direction {
  if (Math.abs(v.x) < 1e-9 && Math.abs(v.y) < 1e-9) return fallback;
  if (Math.abs(v.x) > Math.abs(v.y)) return v.x > 0 ? 'right' : 'left';
  return v.y > 0 ? 'down' : 'up';
}

export const tileOf = (v: V2): { x: number; y: number } => ({ x: cellOf(v.x), y: cellOf(v.y) });

/**
 * Interaction target: among candidates, the nearest one within `reach` tiles whose direction from `origin` is within
 * `cosMin` (cosine) of `face`. Candidates closer than `touch` always count. Returns the candidate index or -1.
 */
export function pickInFront(origin: V2, face: V2, cands: readonly V2[], reach = 1.3, cosMin = 0.55, touch = 0.55): number {
  let best = -1;
  let bestD = Infinity;
  const f = normalize(face);
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i] as V2;
    const dx = c.x - origin.x;
    const dy = c.y - origin.y;
    const d = Math.hypot(dx, dy);
    if (d > reach) continue;
    const cos = d < 1e-6 ? 1 : (dx * f.x + dy * f.y) / d;
    if (d > touch && cos < cosMin) continue;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
