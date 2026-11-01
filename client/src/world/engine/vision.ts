// Pure line-of-sight helpers for guards and trainers.
import type { SolidFn, V2 } from './movement';
import { normalize } from './movement';

/** Is `target` inside the cone from `origin` along `face` (range in tiles, half-angle in radians)? */
export function inVisionCone(origin: V2, face: V2, target: V2, range: number, halfAngle: number): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const d = Math.hypot(dx, dy);
  if (d > range) return false;
  if (d < 0.35) return true;
  const f = normalize(face);
  if (f.x === 0 && f.y === 0) return false;
  return (dx * f.x + dy * f.y) / d >= Math.cos(halfAngle);
}

/** No solid tile between the two points (sampled every `step` tiles; the end tiles themselves are ignored). */
export function rayClear(from: V2, to: V2, solid: SolidFn, step = 0.2): boolean {
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  const n = Math.ceil(d / step);
  const ex = Math.floor(to.x + 0.5);
  const ey = Math.floor(to.y + 0.5);
  const sx = Math.floor(from.x + 0.5);
  const sy = Math.floor(from.y + 0.5);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const tx = Math.floor(from.x + (to.x - from.x) * t + 0.5);
    const ty = Math.floor(from.y + (to.y - from.y) * t + 0.5);
    if ((tx === ex && ty === ey) || (tx === sx && ty === sy)) continue;
    if (solid(tx, ty)) return false;
  }
  return true;
}

/** Polygon (grid coords, starting at the origin) of the visible cone, each ray clipped by the first solid tile. */
export function coneOutline(origin: V2, face: V2, range: number, halfAngle: number, solid: SolidFn, rays = 9): V2[] {
  const f = normalize(face);
  const base = Math.atan2(f.y, f.x);
  const pts: V2[] = [{ x: origin.x, y: origin.y }];
  for (let i = 0; i < rays; i++) {
    const a = base - halfAngle + (2 * halfAngle * i) / (rays - 1);
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let r = range;
    for (let s = 0.25; s <= range + 1e-6; s += 0.25) {
      if (solid(Math.floor(origin.x + dx * s + 0.5), Math.floor(origin.y + dy * s + 0.5))) {
        r = Math.max(0, s - 0.25);
        break;
      }
    }
    pts.push({ x: origin.x + dx * r, y: origin.y + dy * r });
  }
  return pts;
}
