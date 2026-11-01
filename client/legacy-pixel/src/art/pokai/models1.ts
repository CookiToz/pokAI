// GPT (teal chat-bubble), o-series (thinkers), Gemini (twin star), Nano Banana, Copilot (pilot), Llama.
import { Grid } from '../pixel';
import { arcDots, canvas, eye, family, lit, ring, sparkle } from './kit';

// ---------------------------------------------------------------- GPT
const GPT_PAL = { k: '#0b2e28', o: '#10a37f', d: '#0b7a5e', l: '#6fe0bd', w: '#fff8e7', y: '#f2b632', r: '#e8643c', b: '#59c8ff' };
function gpt(n: number, back: boolean): Grid {
  const g = canvas();
  const rx = [8, 9, 10, 11][n - 1] ?? 8;
  const ry = [7, 8, 9, 10][n - 1] ?? 7;
  const cy = 27 - ry;
  g.rect(11, 28, 3, 2, 'd').rect(19, 28, 3, 2, 'd');
  g.rect(6, 27, 4, 2, 'o').rect(5, 28, 2, 2, 'o').set(4, 29, 'o');
  g.ellipse(16, cy, rx, ry, 'o');
  lit(g, 'o', 'd', 'l');
  if (n < 4) {
    g.vline(16, cy - ry - 3, cy - ry, 'd');
    g.rect(15, cy - ry - 5, 3, 3, 'y');
  }
  if (n >= 2) {
    g.stamp(['.lll.', 'l...l', 'l...l', 'l...l', '.lll.'], 14, cy + 2);
    if (back) g.stamp(['.lll.', 'l...l', 'l...l', 'l...l', '.lll.'], 14, cy + 2);
  }
  if (!back) {
    eye(g, 11, cy - 4, 'k', 'w', n > 2 ? 4 : 3);
    eye(g, 19, cy - 4, 'k', 'w', n > 2 ? 4 : 3);
    g.hline(15, 16, cy - 1, 'k');
  }
  if (n >= 3) arcDots(g, 16, cy, rx + 3, ry + 3, 195, 345, ['r', 'y', 'l', 'b', 'r', 'y', 'l', 'b']);
  if (n >= 4) {
    ring(g, 16, 3, 6, 2, 'y');
    sparkle(g, 4, 8, 'w', 'l', 2);
    sparkle(g, 28, 12, 'w', 'l', 1);
  }
  return g;
}

// ---------------------------------------------------------------- o-series: thinking brain-cloud
const O_PAL = { k: '#241446', o: '#8a63d2', d: '#5b3fa0', l: '#c0a6f5', w: '#fff8e7', y: '#f2b632', c: '#59c8ff' };
function oSeries(n: number, back: boolean): Grid {
  const g = canvas();
  const r = [7, 8, 9][n - 1] ?? 7;
  const cy = 27 - r;
  g.rect(11, 27, 3, 3, 'd').rect(18, 27, 3, 3, 'd');
  g.ellipse(16, cy, r + 1, r, 'o');
  // brain bumps on top
  g.ellipse(12, cy - r, 3, 2, 'o').ellipse(20, cy - r, 3, 2, 'o');
  lit(g, 'o', 'd', 'l');
  // brain folds
  g.hline(10, 13, cy - r + 1, 'd').hline(19, 22, cy - r + 1, 'd').vline(16, cy - r, cy - r + 3, 'd');
  g.set(13, cy - r + 2, 'd').set(19, cy - r + 2, 'd');
  if (!back) {
    eye(g, 11, cy - 2, 'k', 'w', 2);
    eye(g, 19, cy - 2, 'k', 'w', 2);
    g.hline(10, 13, cy - 3, 'd').hline(18, 21, cy - 3, 'd'); // heavy lids
    g.hline(14, 17, cy + 3, 'k');
  }
  // thought bubble trail
  g.set(26, 12, 'w').rect(27, 8, 2, 2, 'w');
  if (n >= 2) g.roundRect(23, 1, 8, 6, 'w', 2).set(25, 4, 'd').set(27, 4, 'd').set(29, 4, 'd');
  if (n >= 3) arcDots(g, 16, cy, r + 5, r + 5, 20, 160, ['y', 'c', 'y', 'c', 'y', 'c']);
  return g;
}

// ---------------------------------------------------------------- Gemini: four-point twin star
const GEM_PAL = { k: '#14254a', b: '#4a8ff0', d: '#2b5bb8', l: '#a6d8ff', p: '#c9a6ff', w: '#ffffff', y: '#f2b632' };
function gemini(n: number, back: boolean): Grid {
  const g = canvas();
  const R = [7, 8, 9, 11][n - 1] ?? 7;
  const cy = 16;
  if (n >= 4) ring(g, 16, cy, 15, 15, 'p');
  for (let y = -R; y <= R; y++) {
    for (let x = -R; x <= R; x++) {
      if (Math.pow(Math.abs(x) / (R + 0.5), 0.7) + Math.pow(Math.abs(y) / (R + 0.5), 0.7) <= 1) g.set(16 + x, cy + y, x + y > R / 3 ? 'd' : x - y < -R / 3 ? 'l' : 'b');
    }
  }
  g.set(16 - 1, cy - 1, 'b');
  if (!back) {
    eye(g, 13, cy - 1, 'k', 'w', 3);
    eye(g, 18, cy - 1, 'k', 'w', 3);
    g.set(15, cy + 3, 'k').set(16, cy + 3, 'k');
    g.set(12, cy + 2, 'p').set(20, cy + 2, 'p');
  }
  if (n === 2) g.stamp(['..y', '.yy', 'yy.', '.yy', '..y'].map((s) => s), 25, 4).set(26, 6, 'y');
  if (n >= 3) {
    // the twin: a small star orbiting
    sparkle(g, 4, 5, 'w', 'p', 2);
    g.set(3, 4, 'b').set(5, 6, 'b');
  }
  if (n >= 4) {
    sparkle(g, 28, 5, 'w', 'l', 1);
    sparkle(g, 4, 27, 'w', 'l', 1);
  }
  return g;
}

// ---------------------------------------------------------------- Nano Banana
const BAN_PAL = { k: '#4a3410', y: '#f2d03a', d: '#c49a18', l: '#fff39a', n: '#7a4a2a', w: '#fff8e7', p: '#ff6ad5', q: '#59c8ff' };
function banana(n: number, back: boolean): Grid {
  const g = canvas();
  const r = n === 1 ? 3.6 : 4.8;
  const P0 = [22, 5], P1 = [4, 14], P2 = [17, 28];
  for (let t = 0; t <= 1.001; t += 0.02) {
    const x = (1 - t) ** 2 * P0[0]! + 2 * (1 - t) * t * P1[0]! + t * t * P2[0]!;
    const y = (1 - t) ** 2 * P0[1]! + 2 * (1 - t) * t * P1[1]! + t * t * P2[1]!;
    g.ellipse(x, y, r, r, 'y');
  }
  lit(g, 'y', 'd', 'l');
  g.rect(21, 1, 3, 4, 'n').rect(16, 28, 3, 2, 'n');
  if (!back) {
    const ex = n === 1 ? 9 : 8;
    eye(g, ex, 12, 'k', 'w', 3);
    eye(g, ex + 4, 12, 'k', 'w', 3);
    g.hline(ex + 1, ex + 4, 17, 'k');
    if (n >= 2) {
      g.rect(ex - 1, 11, 8, 3, 'k').hline(ex + 2, ex + 3, 11, 'k').set(ex, 11, 'q').set(ex + 4, 11, 'q');
    }
  }
  if (n >= 2) {
    sparkle(g, 26, 14, 'w', 'p', 2);
    sparkle(g, 5, 4, 'w', 'q', 2);
    sparkle(g, 26, 24, 'w', 'y', 1);
  }
  return g;
}

// ---------------------------------------------------------------- Copilot: little pilot
const COP_PAL = { k: '#1b2142', o: '#8aa8ff', d: '#5a6fd0', l: '#d6e0ff', w: '#fff8e7', c: '#59c8ff', r: '#e8643c', y: '#f2b632' };
function copilot(n: number, back: boolean): Grid {
  const g = canvas();
  const w = [14, 16, 18][n - 1] ?? 14;
  const h = [13, 15, 17][n - 1] ?? 13;
  const x0 = 16 - w / 2;
  const top = 28 - h;
  if (n === 3) g.stamp(['rrrr..', 'rrrrr.', 'rrrrrr', 'rrrrrr', '.rrrrr', '..rrrr'], x0 - 5, top + 6);
  g.roundRect(x0, top, w, h, 'o', 3);
  g.rect(x0 + 2, 28, 3, 2, 'd').rect(x0 + w - 5, 28, 3, 2, 'd');
  // wings
  g.stamp(['dd', 'ddd', 'dd'], x0 - 3, top + 6).stamp(['dd', 'ddd', 'dd'], x0 + w, top + 6, { flip: true });
  lit(g, 'o', 'd', 'l');
  // aviator cap
  g.roundRect(x0, top - 2, w, 6, 'k', 2);
  g.hline(x0 + 2, x0 + w - 3, top, 'd');
  if (!back) {
    // goggles
    const gy = top + 4;
    g.rect(x0 + 2, gy, 5, 4, 'k').rect(x0 + w - 7, gy, 5, 4, 'k').hline(x0 + 7, x0 + w - 8, gy + 1, 'k');
    g.rect(x0 + 3, gy + 1, 3, 2, 'c').rect(x0 + w - 6, gy + 1, 3, 2, 'c').set(x0 + 3, gy + 1, 'w').set(x0 + w - 6, gy + 1, 'w');
    g.hline(15, 16, gy + 7, 'k').set(14, gy + 6, 'k').set(17, gy + 6, 'k');
  }
  if (n >= 2) {
    g.roundRect(22, 1, 9, 6, 'w', 2).set(24, 7, 'w').set(23, 8, 'w');
    g.hline(24, 25, 3, 'd').hline(24, 28, 5, 'd').set(27, 3, 'd').set(28, 3, 'd');
  }
  if (n >= 3) {
    g.rect(x0 + 2, 24, w - 4, 2, 'y');
    g.stamp(['..c..', '.ccc.', 'cc.cc'], 14, 20, { map: { c: 'y' } });
    g.vline(x0 - 3, top + 1, top + 10, 'y').rect(x0 - 4, top, 3, 2, 'y');
  }
  return g;
}

// ---------------------------------------------------------------- Llama (5 forms)
const LLAMA_PAL = { k: '#2e1d10', o: '#e0c9a0', d: '#b8946a', l: '#fff3d8', w: '#fff8e7', b: '#3c78b4', g: '#241c33', r: '#c4503c', y: '#f2b632', s: '#7a8a99' };
function llama(n: number, back: boolean): Grid {
  const g = canvas();
  const big = n === 5;
  const neckH = [3, 4, 6, 5, 3][n - 1] ?? 4;
  const bw = big ? 22 : [14, 16, 14, 16][n - 1] ?? 14;
  const bx = 16 - bw / 2;
  const by = 20 - (big ? 2 : 0);
  // legs
  g.rect(bx + 2, 28, 3, 2, 'd').rect(bx + bw - 5, 28, 3, 2, 'd');
  g.roundRect(bx, by, bw, 10, 'o', 3);
  g.rect(bx + 2, by + 8, 3, 3, 'o').rect(bx + bw - 5, by + 8, 3, 3, 'o');
  // neck + head
  const nTop = by - neckH;
  g.rect(12, nTop, 8, neckH + 1, 'o');
  const hx = 11, hy = nTop - 7;
  g.roundRect(hx, hy, 10, 9, 'o', 2);
  g.rect(hx + 2, hy + 6, 6, 3, 'l'); // snout
  g.rect(hx + 1, hy - 3, 2, 4, 'o').rect(hx + 7, hy - 3, 2, 4, 'o'); // ears
  g.set(hx + 1, hy - 2, 'd').set(hx + 8, hy - 2, 'd');
  lit(g, 'o', 'd', 'l');
  // wool tuft
  g.rect(13, hy - 1, 6, 2, 'l');
  if (!back) {
    g.rect(hx + 2, hy + 3, 2, 2, 'k').rect(hx + 6, hy + 3, 2, 2, 'k').set(hx + 2, hy + 3, 'w').set(hx + 6, hy + 3, 'w');
    g.set(hx + 4, hy + 7, 'k').set(hx + 5, hy + 7, 'k');
  }
  if (n >= 2) g.rect(11, by - 1, 10, 3, 'b').rect(13, by + 2, 2, 4, 'b'); // scarf
  if (n === 3 && !back) { // scout: binoculars
    g.rect(hx + 1, hy + 3, 3, 3, 's').rect(hx + 6, hy + 3, 3, 3, 's').set(hx + 4, hy + 4, 's').set(hx + 5, hy + 4, 's');
    g.set(hx + 2, hy + 4, 'w').set(hx + 7, hy + 4, 'w');
  }
  if (n === 4 && !back) { // maverick: shades + hat
    g.rect(hx + 1, hy + 3, 8, 2, 'g');
    g.rect(hx - 1, hy - 1, 12, 2, 'r').rect(hx + 2, hy - 4, 6, 3, 'r');
  }
  if (big) { // behemoth: armour pauldrons + horns
    g.rect(bx - 2, by, 5, 4, 's').rect(bx + bw - 3, by, 5, 4, 's').hline(bx - 2, bx + 2, by, 'w').hline(bx + bw - 3, bx + bw + 1, by, 'w');
    g.set(hx - 1, hy - 3, 'y').set(hx - 2, hy - 4, 'y').set(hx + 10, hy - 3, 'y').set(hx + 11, hy - 4, 'y');
  }
  return g;
}

export const MODELS1 = [
  ...family(['gpt_2', 'gpt_3_5', 'gpt_4o', 'gpt_5'], gpt, GPT_PAL, 'ybr'),
  ...family(['o1_mini', 'o1', 'o3'], oSeries, O_PAL, 'yc'),
  ...family(['gemini_nano', 'gemini_flash', 'gemini_pro', 'gemini_ultra'], gemini, GEM_PAL, 'wyp'),
  ...family(['nano_banana', 'nano_banana_pro'], banana, BAN_PAL, 'wpq'),
  ...family(['copilot', 'copilot_chat', 'copilot_agent'], copilot, COP_PAL),
  ...family(['llama_2', 'llama_3', 'llama_4_scout', 'llama_4_maverick', 'llama_4_behemoth'], llama, LLAMA_PAL),
];
