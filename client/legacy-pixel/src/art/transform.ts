// Pure PixelSprite transforms used by the texture factory (no Phaser, no DOM).
import { Grid, tint } from './pixel';
import type { PixelSprite } from './types';

/** Back view: same silhouette mirrored is not needed for symmetric art; we darken. Used when a form has no hand-drawn back. */
export function mirrorDark(s: PixelSprite): PixelSprite {
  const g = Grid.from(s.rows, s.w, s.h).flipX();
  const palette: Record<string, string> = {};
  for (const [k, v] of Object.entries(s.palette)) palette[k] = tint(v, 0.78);
  return g.sprite(palette);
}

function grey(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const y = Math.round(0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255));
  const m = (v: number): number => Math.round(y * 0.8 + v * 0.2);
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => m(v).toString(16).padStart(2, '0')).join('');
}

/** Sealed by the AIACT: desaturated with a red diagonal "CONFORME" ribbon across the sprite. */
export function sealed(s: PixelSprite): PixelSprite {
  const g = Grid.from(s.rows, s.w, s.h);
  const palette: Record<string, string> = { '!': '#c4503c', '@': '#7a2a20', '#': '#fff8e7' };
  for (const [k, v] of Object.entries(s.palette)) palette[k] = grey(v);
  const W = s.w;
  for (let x = 0; x < W; x++) {
    const cy = Math.round(W * 0.3 + x * 0.45);
    for (let t = -2; t <= 2; t++) g.set(x, cy + t, t === -2 || t === 2 ? '@' : '!');
    if (x % 4 === 0) g.set(x, cy, '#'); // stitched-in stamp dots
  }
  return g.sprite(palette);
}

/** Dark silhouette for forms without art. */
export function silhouette(w = 32, h = 32): PixelSprite {
  const g = new Grid(w, h);
  g.ellipse(w / 2 - 0.5, h * 0.62, w * 0.3, h * 0.28, 'a');
  g.rect(w / 2 - 4, h * 0.2, 8, 6, 'a');
  g.ellipse(w / 2 - 0.5, h * 0.3, w * 0.2, h * 0.14, 'a');
  // question mark in the middle
  g.stamp(['.bbb.', 'b...b', '...b.', '..b..', '.....', '..b..'], w / 2 - 3, h / 2 - 1);
  g.outline('k');
  return g.sprite({ a: '#3b2d52', b: '#8f86a8', k: '#14101c' });
}
