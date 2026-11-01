// Shared helpers for PokAI battle sprites (32x32, light from the top-left).
import { Grid } from '../pixel';
import type { PixelSprite, PokaiSprite } from '../types';

export const S = 32;
export const GROUND = 30; // last row a creature's feet may touch

export type Stage = 1 | 2 | 3 | 4;

export function canvas(): Grid {
  return new Grid(S, S);
}

/** Outline everything with `k`, except chars listed in `skip` (glows, sparkles). */
export function finish(g: Grid, palette: Record<string, string>, opts: { skip?: string; diag?: boolean } = {}): PixelSprite {
  g.outline('k', { skip: opts.skip, diag: opts.diag });
  return g.sprite(palette);
}

export function form(formId: string, front: PixelSprite, back?: PixelSprite): PokaiSprite {
  return back ? { formId, front, back } : { formId, front };
}

/**
 * Cute eye: 2x3 dark block with a 1px highlight in the top-left.
 * `e` = pupil char, `w` = highlight char.
 */
export function eye(g: Grid, x: number, y: number, e = 'k', w = 'w', h = 3): void {
  g.rect(x, y, 2, h, e);
  g.set(x, y, w);
}

/** Small 4-point sparkle centred on (x, y): `a` core, `b` arms. */
export function sparkle(g: Grid, x: number, y: number, a: string, b: string, r = 2): void {
  for (let i = 1; i <= r; i++) {
    g.set(x + i, y, b).set(x - i, y, b).set(x, y + i, b).set(x, y - i, b);
  }
  g.set(x, y, a);
}

/** Ground shadow ellipse (drawn first, under the creature). */
export function groundShadow(g: Grid, cx: number, w: number, c = 'z'): void {
  g.ellipse(cx, GROUND + 0.5, w / 2, 0.6, c);
}

/** Rim lighting: dark crescent bottom-right, light crescent top-left, for body colour `m`. */
export function lit(g: Grid, m: string, d: string, l: string): void {
  g.shade(m, d, m, 1, 1);
  g.shade(m, l, m + d, -1, -1);
}

/** Hollow ellipse ring of colour `c` (clears the inside). */
export function ring(g: Grid, cx: number, cy: number, rx: number, ry: number, c: string): void {
  g.ellipse(cx, cy, rx, ry, c);
  g.ellipse(cx, cy, rx - 1.5, Math.max(0.3, ry - 1.5), '.');
}

/** Dots on an elliptical arc (angles in degrees, 0 = right, 90 = up). */
export function arcDots(g: Grid, cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, cols: string[]): void {
  cols.forEach((c, i) => {
    const a = ((a0 + ((a1 - a0) * i) / Math.max(1, cols.length - 1)) * Math.PI) / 180;
    g.set(Math.round(cx + rx * Math.cos(a)), Math.round(cy - ry * Math.sin(a)), c);
  });
}

export type DrawN = (n: number, back: boolean) => Grid;

/** A family of forms: form i is drawn with n = i + 1. */
export function family(ids: string[], draw: DrawN, pal: Record<string, string>, skip = ''): PokaiSprite[] {
  return ids.map((id, i) => form(id, finish(draw(i + 1, false), pal, { skip }), finish(draw(i + 1, true), pal, { skip })));
}
