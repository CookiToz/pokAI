// Pure signpost text: which MapDef.exits a signpost at (x, y) points to, nearest first, with an on-screen arrow.
import type { MapDef } from '../../data/types';

export interface SignLine {
  arrow: string;
  label: string;
  dist: number;
}

/** Arrow for a grid offset, as it looks on the isometric screen (grid +x runs down-right, +y down-left). */
export function screenArrow(dx: number, dy: number): string {
  const a = Math.atan2(dx + dy, dx - dy);
  const i = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
  return ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][i] as string;
}

/** Exits listed by a signpost: the nearest one plus any other within `spread` tiles of that distance (max `max`). */
export function signLines(map: MapDef, x: number, y: number, max = 3, spread = 10): SignLine[] {
  const all = (map.exits ?? [])
    .map((e) => ({ arrow: screenArrow(e.x - x, e.y - y), label: e.label.replace(/^[←→↑↓↖↗↘↙\s]+/, '').replace(/[←→↑↓↖↗↘↙\s]+$/, ''), dist: Math.hypot(e.x - x, e.y - y) }))
    .sort((a, b) => a.dist - b.dist);
  const first = all[0];
  if (!first) return [];
  return all.filter((l) => l.dist <= first.dist + spread).slice(0, max);
}

/** One-line text for dialogue/preview: "↖ Hugging Grove · ↘ Port 8080". */
export const signText = (lines: readonly SignLine[], count = lines.length): string =>
  lines.slice(0, count).map((l) => `${l.arrow} ${l.label}`).join('  ·  ');

/** Signpost sprite variant: 0 = one board each way, 1 = three boards, 2 = both left, 3 = both right (`fallback` when no exits). */
export function signVariant(lines: readonly SignLine[], fallback: number): number {
  if (lines.length === 0) return ((fallback % 4) + 4) % 4;
  if (lines.length >= 3) return 1;
  const left = (a: string): boolean => a === '←' || a === '↖' || a === '↙';
  const l = lines.filter((x) => left(x.arrow)).length;
  if (lines.length === 1) return l === 1 ? 2 : 3;
  return l === 2 ? 2 : l === 0 ? 3 : 0;
}
