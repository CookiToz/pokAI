// Starter lines: Claude (Clawd-like block), Phi (square schoolkid), Gemma (faceted gem).
// Each line is one parametric drawing: stage N keeps the stage-1 silhouette and adds size + accessories.
// `back` = same body seen from behind (no face), used for the player's side of the battle.
import { Grid } from '../pixel';
import type { PokaiSprite } from '../types';
import { canvas, eye, finish, form, sparkle, type Stage } from './kit';

// ---------------------------------------------------------------- Claude
const CLAUDE_PAL = {
  k: '#3b1e14', o: '#d97757', d: '#a9502f', l: '#f2a47c', w: '#fff8e7', y: '#f2b632', i: '#5a4a78',
};

function claude(stage: Stage, back: boolean): Grid {
  const g = canvas();
  const bw = [16, 20, 24][stage - 1] ?? 16;
  const bh = [12, 14, 16][stage - 1] ?? 12;
  const legH = stage === 1 ? 3 : 4;
  const x0 = 16 - bw / 2;
  const bottom = 28 - legH; // last body row
  const top = bottom - bh + 1;
  // body
  g.rect(x0, top, bw, bh, 'o');
  // side nubs (arms)
  g.rect(x0 - 2, top + 3, 2, 3, 'o');
  g.rect(x0 + bw, top + 3, 2, 3, 'o');
  // 4 legs
  const legW = 2;
  const gap = (bw - 4 * legW) / 5;
  for (let i = 0; i < 4; i++) {
    const lx = Math.round(x0 + gap + i * (legW + gap));
    g.rect(lx, bottom + 1, legW, legH, 'o');
  }
  g.shade('o', 'd', 'o', 1, 1);
  g.shade('o', 'l', 'od', -1, -1);
  if (!back) {
    const eh = stage === 1 ? 3 : 4;
    const ey = top + 2 + (stage === 3 ? 1 : 0);
    eye(g, x0 + 3, ey, 'k', 'w', eh);
    eye(g, x0 + bw - 5, ey, 'k', 'w', eh);
  }
  if (stage >= 2) {
    // notebook held by the right nub (left nub when seen from behind)
        const ny = top + 1;
    const nb = Grid.from(['iiiiii', 'iwwwwi', 'ikkkwi', 'iwwwwi', 'ikkwwi', 'iwwwwi', 'iiiiii']);
    g.stamp(nb, back ? 1 : 25, ny);
  }
  if (stage === 3) {
    sparkle(g, 27, 4, 'w', 'y', 3);
    sparkle(g, 3, 7, 'y', 'o', 1);
    g.set(30, 9, 'y');
  }
  return g;
}

// ---------------------------------------------------------------- Phi
const PHI_PAL = {
  k: '#18233a', b: '#3c8fd4', d: '#2a64a6', l: '#8cc8f0', w: '#fff8e7', r: '#e8643c', y: '#f2b632', g: '#5fa84f',
};

function phi(stage: Stage, back: boolean): Grid {
  const g = canvas();
  const s = [14, 17, 20][stage - 1] ?? 14;
  const x0 = Math.round(16 - s / 2);
  const bottom = 27;
  const top = bottom - s + 1;
  g.roundRect(x0, top, s, s, 'b', 1);
  // feet
  g.rect(x0 + 2, bottom + 1, 3, 2, 'd');
  g.rect(x0 + s - 5, bottom + 1, 3, 2, 'd');
  g.shade('b', 'd', 'b', 1, 1);
  g.shade('b', 'l', 'bd', -1, -1);
  // propeller beanie
  const cx = x0 + Math.floor(s / 2);
  const capW = s - 4;
  g.roundRect(x0 + 2, top - 3, capW, 4, 'r', 1);
  g.rect(x0 + 2, top, capW, 1, 'y');
  g.rect(cx - 1, top - 3, 2, 4, 'g');
  g.vline(cx - 1, top - 5, top - 4, 'k');
  g.hline(cx - 4, cx - 2, top - 6, 'y').hline(cx, cx + 2, top - 6, 'y');
  g.set(cx - 1, top - 6, 'k');
  if (!back) {
    // square glasses grow each stage
    const fw = [5, 6, 8][stage - 1] ?? 5;
    const fh = [5, 6, 7][stage - 1] ?? 5;
    const ey = top + Math.round(s * 0.3);
    const gap = stage === 3 ? 1 : 2;
    const lx = cx - Math.ceil(gap / 2) - fw;
    const rx = cx + Math.floor(gap / 2);
    for (const ex of [lx, rx]) {
      g.rect(ex, ey, fw, fh, 'k');
      g.rect(ex + 1, ey + 1, fw - 2, fh - 2, 'w');
      g.rect(ex + fw - 3, ey + fh - 3, stage === 1 ? 1 : 2, stage === 1 ? 1 : 2, 'k');
      g.set(ex + 1, ey + 1, 'l');
    }
    g.hline(lx + fw, rx - 1, ey + 1, 'k');
    const lr = Math.ceil(fh / 2);
    // smile
    const my = ey + fh + 2;
    if (my < bottom - 1) {
      g.hline(cx - 2, cx + 1, my, 'k');
      g.set(cx - 3, my - 1, 'k').set(cx + 2, my - 1, 'k');
    }
  }
  // textbook(s) held at the side
  const books = stage;
  for (let i = 0; i < books; i++) {
    const by = bottom - 5 - i * 4;
    const bx = back ? x0 - 4 : x0 + s - 2;
    const col = i % 2 === 0 ? 'r' : 'g';
    const book = Grid.from([col.repeat(7), col + 'wwwwww', col + 'wwwwww', col.repeat(7)]);
    g.stamp(book, bx, by - 1, { flip: back });
  }
  return g;
}

// ---------------------------------------------------------------- Gemma
const GEMMA_PAL = {
  k: '#14254a', b: '#4a8ff0', d: '#2b5bb8', l: '#a6d8ff', w: '#ffffff', c: '#6fc3f5', p: '#c9a6ff',
};

function gemShape(g: Grid, cx: number, top: number, half: number, crownH: number, pavH: number, back: boolean): void {
  const table = Math.max(2, Math.round(half * 0.5));
  // crown (top), widening
  for (let j = 0; j < crownH; j++) {
    const hw = Math.round(table + ((half - table) * (j + 1)) / crownH);
    for (let x = -hw; x < hw; x++) {
      const col = j === 0 ? 'l' : x < -table / 2 ? 'l' : x < table / 2 ? 'c' : 'b';
      g.set(cx + x, top + j, col);
    }
  }
  // pavilion (bottom), narrowing to a point
  for (let j = 0; j < pavH; j++) {
    const hw = Math.max(1, Math.round(half * (1 - (j + 1) / (pavH + 1))));
    for (let x = -hw; x < hw; x++) {
      const t = x / hw;
      const col = t < -0.45 ? 'c' : t < 0.15 ? 'b' : 'd';
      g.set(cx + x, top + crownH + j, col);
    }
  }
  // facet lines
  g.hline(cx - half, cx + half - 1, top + crownH, 'd');
  if (!back) g.hline(cx - half + 1, cx - half + 3, top + crownH, 'l');
  g.line(cx - table, top, cx - half, top + crownH - 1, 'b');
  g.line(cx + table - 1, top, cx + half - 1, top + crownH - 1, 'd');
}

function shard(g: Grid, x: number, y: number): void {
  g.set(x, y, 'l').set(x + 1, y, 'c').set(x, y + 1, 'c').set(x + 1, y + 1, 'b').set(x, y + 2, 'b');
}

function gemma(stage: Stage, back: boolean): Grid {
  const g = canvas();
  const half = [8, 10, 12][stage - 1] ?? 8;
  const crownH = [4, 5, 6][stage - 1] ?? 4;
  const pavH = [10, 12, 14][stage - 1] ?? 10;
  const total = crownH + pavH;
  const top = 28 - total - 1;
  const cx = 16;
  gemShape(g, cx, top, half, crownH, pavH, back);
  if (!back) {
    const ey = top + crownH + 1;
    eye(g, cx - 4, ey, 'k', 'w', stage === 1 ? 3 : 4);
    eye(g, cx + 2, ey, 'k', 'w', stage === 1 ? 3 : 4);
    g.set(cx - 6, ey + 3, 'p').set(cx + 5, ey + 3, 'p');
    // the "reflection": a bright glint on the crown
    g.set(cx - 2, top + 1, 'w').set(cx - 1, top + 1, 'w').set(cx - 2, top + 2, 'w');
  }
  // floating gem: tiny feet-less hover, shards orbit from stage 2
  if (stage >= 2) {
    shard(g, 3, top + 6);
    shard(g, 27, top + 2);
  }
  if (stage >= 3) {
    shard(g, 5, 3);
    shard(g, 25, 24);
    // crown of light above the table
    g.set(cx - 1, top - 3, 'w').set(cx, top - 3, 'w').set(cx - 1, top - 2, 'l').set(cx, top - 2, 'l');
    g.set(cx - 5, top - 2, 'p').set(cx + 4, top - 2, 'p');
  }
  return g;
}

// ---------------------------------------------------------------- export
type Draw = (stage: Stage, back: boolean) => Grid;

export function line(ids: string[], draw: Draw, pal: Record<string, string>, skip = ''): PokaiSprite[] {
  return ids.map((id, i) => {
    const st = (i + 1) as Stage;
    return form(id, finish(draw(st, false), pal, { skip }), finish(draw(st, true), pal, { skip }));
  });
}

export const STARTER_SPRITES: PokaiSprite[] = [
  ...line(['claude_haiku', 'claude_sonnet', 'claude_opus'], claude, CLAUDE_PAL, 'y'),
  ...line(['phi_1', 'phi_3', 'phi_4'], phi, PHI_PAL),
  ...line(['gemma', 'gemma_2', 'gemma_3'], gemma, GEMMA_PAL),
];
