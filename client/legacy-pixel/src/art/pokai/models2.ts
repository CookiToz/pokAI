// Mistral (orange pixel cat), DeepSeek (blue whale), Qwen, Grok, Stable Diffusion (canvas), Midjourney (sailboat).
import { Grid } from '../pixel';
import { arcDots, canvas, eye, family, lit, ring, sparkle } from './kit';

// ---------------------------------------------------------------- Mistral cat (6 forms)
const CAT_PAL = { k: '#3a1c0a', o: '#f08a24', d: '#c0600f', l: '#ffc266', w: '#fff8e7', r: '#e8789a', u: '#6a4fb0', y: '#f2d03a', t: '#3fb8a8' };
function catHead(g: Grid, cx: number, top: number, w: number, h: number, back: boolean, small = false): void {
  const x0 = cx - w / 2;
  g.roundRect(x0, top, w, h, 'o', 2);
  // pointy ears
  g.stamp(['o..', 'oo.', 'ooo'], x0, top - 3).stamp(['o..', 'oo.', 'ooo'], x0 + w, top - 3, { flip: true });
  g.set(x0 + 1, top - 1, 'r').set(x0 + w - 2, top - 1, 'r');
  lit(g, 'o', 'd', 'l');
  if (!back) {
    if (small) {
      g.set(cx - 3, top + 2, 'k').set(cx + 2, top + 2, 'k').set(cx - 3, top + 3, 'k').set(cx + 2, top + 3, 'k');
    } else {
      eye(g, cx - 4, top + 3, 'k', 'w', 3);
      eye(g, cx + 2, top + 3, 'k', 'w', 3);
    }
    g.set(cx - 1, top + h - 3, 'r').set(cx, top + h - 3, 'r');
    g.hline(cx - 3, cx - 2, top + h - 2, 'k').hline(cx + 1, cx + 2, top + h - 2, 'k');
  } else g.hline(cx - 2, cx + 1, top + 2, 'd');
}
function cat(n: number, back: boolean): Grid {
  const g = canvas();
  const big = n === 3;
  const bw = n === 1 ? 12 : big ? 18 : 14;
  const bh = n === 1 ? 9 : big ? 12 : 10;
  const bx = 16 - bw / 2;
  const bTop = 28 - bh;
  // tail curl
  g.stamp(['.oo', 'o.o', 'o.o', '..o'], bx + bw, bTop - 1);
  g.rect(bx + bw + 1, bTop - 3, 2, 2, 'o');
  if (n === 2) { // mixtral: three heads
    catHead(g, 7, 11, 10, 8, back, true);
    catHead(g, 25, 11, 10, 8, back, true);
  }
  g.roundRect(bx, bTop, bw, bh, 'o', 2);
  g.rect(bx + 1, 28, 3, 2, 'd').rect(bx + bw - 4, 28, 3, 2, 'd');
  const hw = big ? 16 : 14;
  const headTop = bTop - 9 - (big ? 1 : 0);
  catHead(g, 16, headTop, hw, 11, back);
  // stripes
  g.vline(bx + 3, bTop + 1, bTop + 3, 'd').vline(bx + bw - 4, bTop + 1, bTop + 3, 'd');
  if (!back) g.rect(14, bTop + 1, 4, 5, 'l');
  if (n === 3) { // large: golden scarf + crown
    g.rect(bx + 1, bTop - 1, bw - 2, 2, 'y');
    g.stamp(['y.y.y', 'yyyyy'], 14, headTop - 5);
  }
  if (n === 4) { // magistral: wizard hat
    g.stamp(['.......u', '......uu', '.....uuu', '....uuuu', '...uuuuu', '..uuuuuu', '.uuuuuuu', 'uuuuuuuu'].map((r) => r.slice(0, 8)), 12, headTop - 8);
    g.rect(10, headTop - 1, 12, 2, 'u').set(17, headTop - 4, 'y').set(16, headTop - 5, 'y');
    sparkle(g, 26, 6, 'y', 'w', 2);
  }
  if (n === 5) { // codestral: glasses + </> on chest
    if (!back) g.hline(10, 21, headTop + 4, 'k').rect(10, headTop + 3, 5, 3, 'k').rect(17, headTop + 3, 5, 3, 'k').set(11, headTop + 4, 't').set(18, headTop + 4, 't');
    g.stamp(['.t.....t.', 't..t.t..t', '.t..t..t.'].map((r) => r), 12, bTop + 4);
  }
  if (n === 6) { // devstral: hardhat + wrench
    g.roundRect(9, headTop - 3, 14, 5, 'y', 2).rect(8, headTop + 1, 16, 1, 'y').rect(15, headTop - 4, 2, 2, 'y');
    g.line(bx + bw - 2, bTop + 8, bx + bw + 3, bTop + 2, 'w').rect(bx + bw + 2, bTop + 1, 3, 2, 'w');
  }
  return g;
}

// ---------------------------------------------------------------- DeepSeek whale
const WHALE_PAL = { k: '#10223f', o: '#3c6ab4', d: '#2a4c88', l: '#6aa6e0', b: '#e8f0ff', w: '#fff8e7', y: '#f2b632', v: '#9ad8ff' };
function whale(n: number, back: boolean): Grid {
  const g = canvas();
  const rx = [9, 10, 10, 12][n - 1] ?? 9;
  const ry = [7, 8, 8, 9][n - 1] ?? 7;
  const cx = 14;
  const cy = 27 - ry;
  // tail rising on the right
  g.line(cx + rx - 2, cy, cx + rx + 2, cy - 4, 'o');
  g.line(cx + rx - 2, cy + 1, cx + rx + 2, cy - 3, 'o');
  g.stamp(['o...o', 'oo.oo', '.ooo.'], cx + rx, cy - 8);
  g.ellipse(cx, cy, rx, ry, 'o');
  g.ellipse(cx - 1, cy + ry - 3, rx - 2, 2.5, 'b'); // belly
  g.rect(cx - 5, cy + ry - 1, 3, 3, 'd').set(cx - 2, cy + ry + 1, 'd'); // flipper
  lit(g, 'o', 'd', 'l');
  if (!back) {
    eye(g, cx - rx + 3, cy - 3, 'k', 'w', 3);
    g.hline(cx - rx + 2, cx - rx + 5, cy + 2, 'k');
    g.set(cx - rx + 6, cy + 3, 'k');
  }
  // spout
  g.vline(cx - 1, cy - ry - 4, cy - ry - 1, 'v').set(cx - 3, cy - ry - 3, 'v').set(cx + 1, cy - ry - 3, 'v').set(cx - 2, cy - ry - 5, 'v').set(cx, cy - ry - 5, 'v');
  if (n === 3) { // r1: thought bubble over the spout
    g.roundRect(1, 1, 9, 6, 'w', 2).set(3, 4, 'd').set(5, 4, 'd').set(7, 4, 'd').set(5, 7, 'w').set(6, 8, 'w');
  }
  if (n === 4) { // v4: tusk + crown of stars
    g.line(cx - rx + 1, cy + 1, cx - rx - 3, cy - 1, 'w').line(cx - rx + 1, cy + 2, cx - rx - 3, cy, 'w');
    sparkle(g, 5, 4, 'y', 'w', 2);
    sparkle(g, 26, 4, 'y', 'w', 1);
  }
  if (n === 2) g.set(cx - rx + 4, cy - 6, 'y').set(cx - rx + 5, cy - 6, 'y');
  return g;
}

// ---------------------------------------------------------------- Qwen: round purple bear with a Q tail
const QWEN_PAL = { k: '#241446', o: '#7a4fd0', d: '#4b2f9a', l: '#b7a0f5', w: '#fff8e7', y: '#f2b632', c: '#59c8ff', g: '#c0c0d8' };
function qwen(n: number, back: boolean): Grid {
  const g = canvas();
  const r = [8, 9, 10, 8][n - 1] ?? 8;
  const cy = 26 - r;
  // Q tail: loop with a tick
  ring(g, 25, 24, 4, 3, 'd');
  g.line(25, 25, 29, 29, 'd');
  g.ellipse(16, cy, r + 1, r, 'o');
  g.ellipse(9, cy - r + 1, 3, 3, 'o').ellipse(23, cy - r + 1, 3, 3, 'o'); // ears
  g.rect(8, cy - r, 2, 2, 'l').rect(22, cy - r, 2, 2, 'l');
  g.rect(10, 27, 4, 3, 'd').rect(18, 27, 4, 3, 'd');
  lit(g, 'o', 'd', 'l');
  g.ellipse(16, cy + 3, 4, 3, 'l'); // muzzle
  if (!back) {
    eye(g, 11, cy - 3, 'k', 'w', 3);
    eye(g, 19, cy - 3, 'k', 'w', 3);
    g.set(15, cy + 2, 'k').set(16, cy + 2, 'k').hline(15, 16, cy + 4, 'k');
  }
  if (n === 2) g.rect(9, cy + r - 2, 14, 2, 'y');
  if (n === 3) { g.stamp(['y.y.y', 'yyyyy', '.yyy.'], 13, cy - r - 3); sparkle(g, 27, 7, 'c', 'w', 2); }
  if (n === 4) { // QwQ: thick glasses + question marks
    if (!back) g.rect(9, cy - 4, 6, 5, 'k').rect(17, cy - 4, 6, 5, 'k').hline(15, 16, cy - 3, 'k').rect(10, cy - 3, 4, 3, 'w').rect(18, cy - 3, 4, 3, 'w').set(12, cy - 2, 'k').set(20, cy - 2, 'k');
    g.stamp(['.ccc', 'c..c', '..c.', '..c.', '....', '..c.'].map((s) => s), 25, 2);
    g.stamp(['.ccc', 'c..c', '..c.', '..c.', '....', '..c.'].map((s) => s), 2, 6);
  }
  return g;
}

// ---------------------------------------------------------------- Grok: dark rebel with a white slash
const GROK_PAL = { k: '#0a0814', o: '#3b3a4a', d: '#24233a', l: '#8f86a8', w: '#fff8e7', y: '#f2b632', r: '#e8643c' };
function grok(n: number, back: boolean): Grid {
  const g = canvas();
  const r = [8, 9, 10][n - 1] ?? 8;
  const cy = 26 - r;
  g.rect(11, 27, 4, 3, 'd').rect(18, 27, 4, 3, 'd');
  if (n === 3) g.stamp(['..rr..', '.rrrr.', 'rrrrrr', '.rrrr.', '..rr..'], 14, 28);
  g.ellipse(16, cy, r + 1, r, 'o');
  lit(g, 'o', 'd', 'l');
  g.line(10, cy + r - 2, 22, cy - r + 2, 'w').line(11, cy + r - 2, 23, cy - r + 2, 'w'); // slash
  if (!back) {
    eye(g, 10, cy - 3, 'w', 'k', 3);
    g.rect(19, cy - 2, 3, 1, 'w'); // squinting eye
    g.hline(13, 17, cy + 4, 'w');
    g.set(18, cy + 3, 'w');
  }
  if (n >= 2) { g.vline(16, cy - r - 4, cy - r, 'l'); g.rect(15, cy - r - 6, 3, 3, 'y'); }
  sparkle(g, 4, 6, 'y', 'l', n);
  sparkle(g, 28, 10, 'w', 'l', 1);
  if (n === 3) { sparkle(g, 27, 22, 'y', 'l', 2); g.stamp(['yyy', '.y.'], 6, 28); }
  return g;
}

// ---------------------------------------------------------------- Stable Diffusion: living canvas (noise -> image)
const SD_PAL = { k: '#241446', u: '#6a4fb0', d: '#4b3688', l: '#a68fe0', q: '#7fc4e8', g: '#5fa84f', y: '#f2b632', w: '#fff8e7', e: '#8f86a8' };
function sd(n: number, back: boolean): Grid {
  const g = canvas();
  const w = [16, 18, 20][n - 1] ?? 16;
  const h = [14, 16, 18][n - 1] ?? 14;
  const x0 = 16 - w / 2;
  const top = 26 - h;
  g.rect(x0 + 1, 26, 3, 4, 'd').rect(x0 + w - 4, 26, 3, 4, 'd');
  g.rect(x0, top, w, h, 'u');
  lit(g, 'u', 'd', 'l');
  const ix = x0 + 2, iy = top + 2, iw = w - 4, ih = h - 4;
  if (back) {
    g.rect(ix, iy, iw, ih, 'd');
  } else if (n === 1) { // noisy: dithered
    for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) g.set(ix + x, iy + y, (x * 7 + y * 13 + x * y) % 5 < 2 ? 'e' : (x + y) % 2 ? 'q' : 'w');
  } else {
    g.rect(ix, iy, iw, ih, 'q');
    g.stamp(['..g..', '.ggg.', 'ggggg'], ix + iw - 7, iy + ih - 3);
    g.rect(ix, iy + ih - 2, iw, 2, 'g');
    g.ellipse(ix + 3, iy + 3, 1.5, 1.5, 'y');
    if (n === 3) g.hline(ix + 1, ix + iw - 2, iy + ih - 1, 'w'); // rendered text
  }
  if (!back) {
    const ey = iy + Math.floor(ih / 2) - 1;
    g.rect(ix + 3, ey, 2, 3, 'k').rect(ix + iw - 5, ey, 2, 3, 'k').set(ix + 3, ey, 'w').set(ix + iw - 5, ey, 'w');
    g.hline(ix + 6, ix + iw - 7, ey + 3, 'k');
  }
  return g;
}

// ---------------------------------------------------------------- Midjourney: sailboat
const MJ_PAL = { k: '#14264a', w: '#fff8e7', f: '#c9c4d6', b: '#2a4c88', d: '#1e3566', q: '#59c8ff', v: '#9ad8ff', r: '#e8643c', y: '#f2b632' };
function boat(n: number, back: boolean): Grid {
  const g = canvas();
  const sh = [14, 17, 19][n - 1] ?? 14;
  const base = 23;
  // main sail: tall triangle with a curved edge
  for (let j = 0; j < sh; j++) g.hline(15 - Math.round(j * 0.7), 15, base - j, 'w');
  for (let j = 0; j < sh; j++) g.set(15 - Math.round(j * 0.7), base - j, 'f');
  // jib
  for (let j = 0; j < sh - 4; j++) g.hline(17, 17 + Math.round((sh - 4 - j) * 0.5), base - j, 'f');
  if (n >= 2) for (let j = 0; j < 5; j++) g.hline(4 + j, 8, base - 2 - j, 'w');
  g.vline(16, base - sh - 1, base + 1, 'd');
  g.rect(15, base - sh - 3, 3, 2, 'r');
  // hull
  g.stamp(['bbbbbbbbbbbbbbbbbb', '.bbbbbbbbbbbbbbbb.', '..dddddddddddddd..'], 6, base + 1);
  // waves
  for (let x = 2; x < 30; x += 4) g.hline(x, x + 1, 28, 'q').hline(x + 2, x + 3, 29, 'v');
  if (!back) {
    const ey = base - 6;
    g.rect(10, ey, 2, 3, 'k').rect(14, ey, 2, 3, 'k').set(10, ey, 'w').set(14, ey, 'w');
    g.hline(11, 14, ey + 5, 'k');
  }
  if (n === 3) {
    arcDots(g, 16, 14, 14, 11, 20, 160, ['r', 'v', 'q', 'v', 'r', 'q', 'v']);
    sparkle(g, 27, 6, 'w', 'v', 2);
  }
  return g;
}

export const MODELS2 = [
  ...family(['mistral_7b', 'mixtral_8x7b', 'mistral_large', 'magistral', 'codestral', 'devstral'], cat, CAT_PAL),
  ...family(['deepseek_v2', 'deepseek_v3', 'deepseek_r1', 'deepseek_v4'], whale, WHALE_PAL),
  ...family(['qwen', 'qwen_2_5', 'qwen_3', 'qwq'], qwen, QWEN_PAL),
  ...family(['grok_1', 'grok_3', 'grok_4'], grok, GROK_PAL),
  ...family(['sd_1_5', 'sdxl', 'sd3'], sd, SD_PAL),
  ...family(['midjourney_v5', 'midjourney_v6', 'midjourney_v7'], boat, MJ_PAL),
];
