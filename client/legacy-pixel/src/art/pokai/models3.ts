// Whisper (listening ghost), Falcon, SmolLM, BERT family, Transformer.
import { Grid } from '../pixel';
import { canvas, eye, family, form, finish, lit, sparkle } from './kit';

// ---------------------------------------------------------------- Whisper: ghost with sound waves
const WH_PAL = { k: '#2b2540', o: '#e6e0f5', d: '#b0a8cc', l: '#ffffff', q: '#59c8ff', m: '#e89ab0', b: '#3c6ab4', y: '#f2b632' };
function whisper(n: number, back: boolean): Grid {
  const g = canvas();
  const w = [12, 15, 18][n - 1] ?? 12;
  const h = [14, 17, 20][n - 1] ?? 14;
  const x0 = Math.round(16 - w / 2 - 2);
  const top = 28 - h;
  g.roundRect(x0, top, w, h - 2, 'o', 4);
  g.rect(x0, top + 6, w, h - 8, 'o');
  for (let i = 0; i < w; i += 3) g.rect(x0 + i, 26, 2, 3, 'o'); // wavy hem
  lit(g, 'o', 'd', 'l');
  g.ellipse(x0 + w - 1, top + 8, 1.5, 2.5, 'm'); // big ear
  if (!back) {
    const ey = top + 6;
    g.hline(x0 + 2, x0 + 4, ey, 'k').set(x0 + 2, ey + 1, 'k').set(x0 + 4, ey + 1, 'k');
    g.hline(x0 + 7, x0 + 9, ey, 'k').set(x0 + 7, ey + 1, 'k').set(x0 + 9, ey + 1, 'k');
    g.set(x0 + 5, ey + 4, 'k').set(x0 + 6, ey + 4, 'k');
  }
  if (n === 3) g.hline(x0, x0 + w - 1, top + 1, 'b').vline(x0, top + 1, top + 9, 'b').rect(x0 - 1, top + 7, 3, 4, 'b').rect(x0 + w - 2, top + 7, 3, 4, 'b').hline(x0 + 2, x0 + w - 3, top - 1, 'b');
  // sound waves on the right
  for (let i = 0; i < n; i++) {
    const x = x0 + w + 2 + i * 3;
    if (x > 30) break;
    g.vline(x, top + 5 - i, top + 11 + i, 'q');
    g.set(x + 1, top + 4 - i, 'q').set(x + 1, top + 12 + i, 'q');
  }
  if (n >= 2) sparkle(g, 5, 5, 'y', 'q', 1);
  return g;
}

// ---------------------------------------------------------------- Falcon
const FAL_PAL = { k: '#2e1a0c', o: '#8a5a34', d: '#5e3a1f', l: '#c4905a', c: '#f2e0b8', y: '#f2b632', w: '#fff8e7', r: '#c4503c' };
function falcon(n: number, back: boolean): Grid {
  const g = canvas();
  const bw = [10, 12, 12][n - 1] ?? 10;
  const bh = [12, 14, 15][n - 1] ?? 12;
  const bx = 16 - bw / 2;
  const top = 29 - bh;
  const wing = [3, 5, 9][n - 1] ?? 3;
  // wings first
  for (let j = 0; j < bh - 2; j++) {
    const ww = Math.max(1, Math.round(wing * (1 - Math.abs(j - (n === 3 ? 4 : bh / 2 - 1)) / bh * (n === 3 ? 0.9 : 1.6))));
    g.hline(bx - ww, bx, top + 3 + j - (n === 3 ? 3 : 0), 'd');
    g.hline(bx + bw - 1, bx + bw - 1 + ww, top + 3 + j - (n === 3 ? 3 : 0), 'd');
  }
  g.rect(14, 28, 4, 3, 'd'); // tail
  g.roundRect(bx, top, bw, bh, 'o', 3);
  g.rect(bx + 2, top + 6, bw - 4, bh - 6, back ? 'o' : 'c');
  if (!back) for (let y = top + 8; y < top + bh - 2; y += 3) g.hline(bx + 3, bx + bw - 4, y, 'l');
  g.rect(bx + 1, 29, 3, 2, 'y').rect(bx + bw - 4, 29, 3, 2, 'y'); // talons
  lit(g, 'o', 'd', 'l');
  if (n === 3) { // crest + crown
    g.stamp(['y.y.y', 'yyyyy'], 14, top - 3);
    g.set(16, top - 5, 'r');
    sparkle(g, 4, 6, 'w', 'y', 1);
    sparkle(g, 28, 6, 'w', 'y', 1);
  }
  if (!back) {
    g.rect(bx + 1, top + 2, 3, 3, 'w').rect(bx + bw - 4, top + 2, 3, 3, 'w'); // eye whites w/ brow
    g.set(bx + 2, top + 3, 'k').set(bx + 3, top + 3, 'k').set(bx + bw - 4, top + 3, 'k').set(bx + bw - 3, top + 3, 'k');
    g.hline(bx + 1, bx + 3, top + 1, 'd').hline(bx + bw - 4, bx + bw - 2, top + 1, 'd');
    g.stamp(['yyy', '.yy', '..y'].map((s) => s), 15, top + 4).set(15, top + 4, 'y').set(16, top + 4, 'y');
  }
  return g;
}

// ---------------------------------------------------------------- SmolLM: tiny hugging blob
const SMOL_PAL = { k: '#4a3410', o: '#ffd21e', d: '#e0a000', l: '#fff3a0', w: '#fff8e7', c: '#ff9d5c', r: '#e8643c', b: '#59c8ff' };
function smol(n: number, back: boolean): Grid {
  const g = canvas();
  const r = [6, 8, 10][n - 1] ?? 6;
  const cy = 27 - r;
  g.rect(16 - r + 2, 27, 3, 2, 'd').rect(16 + r - 4, 27, 3, 2, 'd');
  g.ellipse(16, cy, r + 1, r, 'o');
  lit(g, 'o', 'd', 'l');
  // little hands raised for a hug
  g.rect(16 - r - 2, cy + 1, 3, 3, 'o').rect(16 + r, cy + 1, 3, 3, 'o');
  g.set(16 - r - 2, cy + 1, 'l');
  if (!back) {
    const ey = cy - Math.floor(r / 3);
    const sp = Math.max(3, Math.floor(r * 0.55));
    eye(g, 16 - sp - 1, ey, 'k', 'w', 3);
    eye(g, 16 + sp - 1, ey, 'k', 'w', 3);
    g.hline(15, 16, ey + 5, 'k').set(14, ey + 4, 'k').set(17, ey + 4, 'k');
    g.rect(16 - sp - 3, ey + 3, 2, 1, 'c').rect(16 + sp + 2, ey + 3, 2, 1, 'c');
  }
  if (n === 2) g.stamp(['.rrr.', 'rrrrr', 'rrrrr'], 14, cy - r - 2); // beanie
  if (n === 3) {
    g.stamp(['.r.r.', 'rrrrr', '.rrr.', '..r..'], 14, 1);
    sparkle(g, 4, 8, 'w', 'b', 2);
    sparkle(g, 28, 10, 'w', 'b', 1);
  }
  return g;
}

// ---------------------------------------------------------------- BERT family
const BERT_PAL = { k: '#3b2410', o: '#f2c42a', d: '#c49400', l: '#fff0a0', w: '#fff8e7', r: '#c4503c', n: '#3b2410', b: '#59c8ff', g: '#c9c4d6' };
function bert(n: number, back: boolean): Grid {
  const g = canvas();
  const big = n === 2;
  const small = n === 3;
  const rx = big ? 9 : small ? 6 : 8;
  const ry = big ? 12 : small ? 9 : 11;
  const cy = 27 - ry;
  const body = small ? 'g' : n === 2 ? 'r' : 'o';
  const dk = small ? 'd' : 'd';
  g.rect(11, 27, 4, 3, 'n').rect(18, 27, 4, 3, 'n');
  g.ellipse(16, cy, rx, ry, body === 'g' ? 'o' : body);
  if (n === 2) g.ellipse(16, cy, rx, ry, 'r');
  lit(g, body === 'g' ? 'o' : body, 'd', 'l');
  // tuft of hair
  g.vline(16, cy - ry - 4, cy - ry, 'n').set(15, cy - ry - 3, 'n');
  if (!back) {
    g.rect(16 - rx + 3, cy - 4, rx * 2 - 5, 2, 'n'); // unibrow
    eye(g, 16 - 5, cy - 2, 'k', 'w', 3);
    eye(g, 16 + 3, cy - 2, 'k', 'w', 3);
    g.hline(14, 17, cy + 5, 'k');
    g.stamp(['b.....b', 'bbbbbbb', 'b.....b'].map((s) => s), 16 - 3, cy + ry - 5);
  }
  if (n === 2) { // RoBERTa: robust arms, flexing
    g.rect(16 - rx - 4, cy + 1, 4, 5, 'r').rect(16 + rx, cy + 1, 4, 5, 'r');
    g.rect(16 - rx - 4, cy + 1, 4, 2, 'l').rect(16 + rx, cy + 1, 4, 2, 'l');
    g.hline(16 - rx - 4, 16 - rx - 1, cy - 1, 'd');
    g.stamp(['..w..', '.www.', '..w..'], 25, 3);
  }
  if (n === 3) { // DistilBERT: flask droplets
    g.stamp(['.b.', 'bbb', 'bbb', '.b.'].map((s) => s), 24, 6);
    g.stamp(['b', 'b'], 5, 10);
    g.set(27, 3, 'b').set(8, 5, 'b');
  }
  return g;
}

// ---------------------------------------------------------------- Transformer: robot with attention links
const TR_PAL = { k: '#141c2b', o: '#7a8a99', d: '#566472', l: '#c9c4d6', c: '#59c8ff', y: '#f2b632', g: '#4fd16a', r: '#e8643c' };
function transformer(back: boolean): Grid {
  const g = canvas();
  g.rect(8, 11, 16, 16, 'o');
  g.rect(10, 28, 4, 2, 'd').rect(18, 28, 4, 2, 'd');
  g.rect(4, 14, 4, 8, 'd').rect(24, 14, 4, 8, 'd');
  lit(g, 'o', 'd', 'l');
  // encoder / decoder layers
  g.hline(9, 22, 19, 'd').hline(9, 22, 20, 'l');
  // antenna
  g.vline(16, 4, 10, 'd').rect(14, 1, 5, 4, 'y').set(15, 2, 'l');
  if (!back) {
    g.rect(10, 13, 12, 5, 'k');
    g.rect(12, 14, 2, 3, 'c').rect(18, 14, 2, 3, 'c');
    g.set(12, 14, 'l').set(18, 14, 'l');
    // attention nodes + links
    const nodes: Array<[number, number]> = [[11, 23], [16, 22], [21, 23], [13, 25], [19, 25]];
    for (const [x, y] of nodes) g.rect(x, y, 2, 2, 'g');
    g.line(12, 23, 16, 22, 'c').line(17, 22, 21, 23, 'c').line(12, 24, 19, 25, 'c').line(17, 23, 13, 25, 'c').line(21, 24, 13, 25, 'c');
    g.set(6, 18, 'r').set(25, 18, 'r');
  } else {
    g.rect(11, 22, 10, 4, 'd').hline(12, 19, 23, 'l');
  }
  return g;
}

export const MODELS3 = [
  ...family(['whisper_tiny', 'whisper_base', 'whisper_large'], whisper, WH_PAL),
  ...family(['falcon_7b', 'falcon_40b', 'falcon_180b'], falcon, FAL_PAL),
  ...family(['smollm', 'smollm_2', 'smollm_3'], smol, SMOL_PAL),
  ...family(['bert', 'roberta', 'distilbert'], bert, BERT_PAL),
  form('transformer', finish(transformer(false), TR_PAL), finish(transformer(true), TR_PAL)),
];
