// Tiny pure pixel-grid DSL used to author every sprite as code.
// A Grid is a mutable 2D array of palette chars ('.' = transparent).
// No Phaser, no DOM: usable from tests, the dev preview and the texture factory.
import type { PixelSprite } from './types';

export const T = '.';

export class Grid {
  readonly w: number;
  readonly h: number;
  readonly px: string[][];

  constructor(w: number, h: number, fill = T) {
    this.w = w;
    this.h = h;
    this.px = Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
  }

  /** Parse rows. Short rows are right-padded with '.', so art can be written without trailing dots. */
  static from(rows: readonly string[], w?: number, h?: number): Grid {
    const width = w ?? Math.max(...rows.map((r) => r.length));
    const g = new Grid(width, h ?? rows.length);
    rows.forEach((r, y) => {
      for (let x = 0; x < r.length && x < width; x++) g.set(x, y, r[x] ?? T);
    });
    return g;
  }

  clone(): Grid {
    const g = new Grid(this.w, this.h);
    this.each((x, y, c) => g.set(x, y, c));
    return g;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): string {
    return this.inside(x, y) ? (this.px[y]?.[x] ?? T) : T;
  }

  set(x: number, y: number, c: string): this {
    const row = this.px[y];
    if (row && x >= 0 && x < this.w) row[x] = c;
    return this;
  }

  each(fn: (x: number, y: number, c: string) => void): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) fn(x, y, this.get(x, y));
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }

  hline(x0: number, x1: number, y: number, c: string): this {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
    return this;
  }

  vline(x: number, y0: number, y1: number, c: string): this {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c);
    return this;
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, c: string): this {
    let x = x0;
    let y = y0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
    return this;
  }

  /** Filled ellipse; centre may be fractional (x.5) for even widths. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x - cx) / (rx + 0.5);
        const ny = (y - cy) / (ry + 0.5);
        if (nx * nx + ny * ny <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Rectangle with the 4 corner pixels cut (r=1) or more. */
  roundRect(x: number, y: number, w: number, h: number, c: string, r = 1): this {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const dx = Math.min(i, w - 1 - i);
        const dy = Math.min(j, h - 1 - j);
        if (dx + dy < r) continue;
        this.set(x + i, y + j, c);
      }
    }
    return this;
  }

  /** Paste rows at (x, y); '.' in the stamp is transparent. `map` recolours chars. */
  stamp(rows: readonly string[] | Grid, x: number, y: number, opts: { flip?: boolean; map?: Record<string, string> } = {}): this {
    const src = rows instanceof Grid ? rows : Grid.from(rows);
    src.each((i, j, c) => {
      if (c === T) return;
      const tx = opts.flip ? x + src.w - 1 - i : x + i;
      this.set(tx, y + j, opts.map?.[c] ?? c);
    });
    return this;
  }

  /** Replace chars everywhere (or only inside a predicate). */
  recolor(map: Record<string, string>, where?: (x: number, y: number) => boolean): this {
    this.each((x, y, c) => {
      const to = map[c];
      if (to !== undefined && (!where || where(x, y))) this.set(x, y, to);
    });
    return this;
  }

  /** Mirror the left half onto the right half (for symmetric creatures). */
  mirrorLeftToRight(): this {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < Math.floor(this.w / 2); x++) this.set(this.w - 1 - x, y, this.get(x, y));
    return this;
  }

  flipX(): Grid {
    const g = new Grid(this.w, this.h);
    this.each((x, y, c) => g.set(this.w - 1 - x, y, c));
    return g;
  }

  /** Shift content by (dx, dy), clipping. */
  shift(dx: number, dy: number): Grid {
    const g = new Grid(this.w, this.h);
    this.each((x, y, c) => {
      if (c !== T) g.set(x + dx, y + dy, c);
    });
    return g;
  }

  /**
   * External 1px outline: every transparent pixel touching (4-neighbour, or 8 with `diag`)
   * an opaque pixel becomes `c`. `skip` chars do not generate outline (e.g. aura sparkles).
   */
  outline(c: string, opts: { diag?: boolean; skip?: string } = {}): this {
    const marks: Array<[number, number]> = [];
    const dirs = opts.diag
      ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
      : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const solid = (x: number, y: number): boolean => {
      const v = this.get(x, y);
      return v !== T && v !== c && !(opts.skip ?? '').includes(v);
    };
    this.each((x, y, v) => {
      if (v !== T) return;
      if (dirs.some(([dx, dy]) => solid(x + (dx ?? 0), y + (dy ?? 0)))) marks.push([x, y]);
    });
    for (const [x, y] of marks) this.set(x, y, c);
    return this;
  }

  /**
   * Top-left light: pixels of `from` whose neighbour at (+ox, +oy) is not part of `mask`
   * become `to` (a crescent shadow on the bottom-right rim).
   */
  shade(from: string, to: string, mask: string, ox = 1, oy = 1): this {
    const marks: Array<[number, number]> = [];
    this.each((x, y, v) => {
      if (v !== from) return;
      if (!mask.includes(this.get(x + ox, y + oy))) marks.push([x, y]);
    });
    for (const [x, y] of marks) this.set(x, y, to);
    return this;
  }

  rows(): string[] {
    return this.px.map((r) => r.join(''));
  }

  sprite(palette: Record<string, string>): PixelSprite {
    return { w: this.w, h: this.h, rows: this.rows(), palette };
  }
}

/** Darken (f<1) or lighten (f>1, towards white) a #rrggbb colour. */
export function tint(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(f <= 1 ? v * f : v + (255 - v) * (f - 1)),
  );
  return '#' + ch.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}
