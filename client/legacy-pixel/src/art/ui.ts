// UI pieces: 9-slice frame, cursor, HP bar pieces, type badges (tiny 3x5 pixel font).
import { Grid } from './pixel';
import type { PixelSprite } from './types';

const PAL = { k: '#14101c', p: '#f2ead8', c: '#fff8e7', s: '#d8cdb0', d: '#8f86a8', e: '#ef7a5a', y: '#f2b632', g: '#5fa84f' };

/** 24x24, 8px corners: cream paper chat window, ink border, soft inner shadow, 3 traffic dots in the top-left. */
function frame(): PixelSprite {
  const g = new Grid(24, 24, 'p');
  g.hline(0, 23, 1, 'p');
  g.hline(2, 21, 1, 'c').vline(2, 2, 21, 'c'); // inner highlight (top/left)
  g.hline(2, 21, 22, 's').vline(21, 2, 22, 's'); // inner shadow (bottom/right)
  g.hline(3, 20, 21, 's');
  // ink border with cut corners
  g.hline(2, 21, 0, 'k').hline(2, 21, 23, 'k').vline(0, 2, 21, 'k').vline(23, 2, 21, 'k');
  g.set(1, 1, 'k').set(22, 1, 'k').set(1, 22, 'k').set(22, 22, 'k');
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [23, 0], [22, 0], [23, 1], [0, 23], [1, 23], [0, 22], [23, 23], [22, 23], [23, 22]] as const) g.set(x, y, '.');
  g.set(1, 2, 'k').set(2, 1, 'k'); // keep corner stairs tidy
  // traffic dots (chat window feel) inside the 8x8 corner
  g.set(4, 3, 'e').set(6, 3, 'y');
  return g.sprite(PAL);
}

function cursor(): PixelSprite {
  return Grid.from(['k......', 'kk.....', 'kck....', 'kccck..', 'kck....', 'kk.....', 'k......'].map((r) => r.replace(/k/g, 'k')), 7, 7).sprite({ k: '#14101c', c: '#fff8e7' });
}

/** Trough 50x6; fills are 1x2 solid textures to be scaled by the HP code. */
function hpBar(): PixelSprite {
  const g = new Grid(50, 6, 'k');
  g.rect(1, 1, 48, 4, 'd');
  g.hline(1, 48, 1, 's');
  return g.sprite({ k: '#14101c', d: '#3b2d52', s: '#241c33' });
}
const solid = (c: string): PixelSprite => ({ w: 1, h: 2, rows: ['a', 'a'], palette: { a: c } });

const FONT: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'], G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'], L: ['#..', '#..', '#..', '#..', '###'], M: ['#.#', '###', '###', '#.#', '#.#'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], F: ['###', '#..', '##.', '#..', '#..'],
  B: ['##.', '#.#', '##.', '#.#', '##.'], W: ['#.#', '#.#', '###', '###', '#.#'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
};

function badge(label: string, bg: string, dark: string, fg: string): PixelSprite {
  const W = 22, H = 8;
  const g = new Grid(W, H, 'a');
  g.hline(1, W - 2, H - 1, 'b').hline(1, W - 2, 0, 'k');
  g.rect(0, 0, W, 1, 'k').rect(0, H - 1, W, 1, 'k').vline(0, 0, H - 1, 'k').vline(W - 1, 0, H - 1, 'k');
  g.hline(1, W - 2, H - 2, 'b');
  for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]] as const) g.set(x, y, '.');
  const tw = label.length * 4 - 1;
  let x = Math.floor((W - tw) / 2);
  for (const ch of label) {
    FONT[ch]?.forEach((row, j) => [...row].forEach((v, i) => v === '#' && g.set(x + i, 1 + j, 'f')));
    x += 4;
  }
  return g.sprite({ a: bg, b: dark, f: fg, k: '#14101c' });
}

const TYPE_BADGES: Record<string, [string, string, string, string]> = {
  chat: ['CHAT', '#e8643c', '#b0431f', '#fff8e7'],
  code: ['CODE', '#3fb8a8', '#2a8577', '#14101c'],
  reasoning: ['LOGIC', '#6a4fb0', '#4b3688', '#fff8e7'],
  media: ['MEDIA', '#d9577a', '#a83a5a', '#fff8e7'],
  agent: ['AGENT', '#3c78b4', '#2d5f96', '#fff8e7'],
  chaos: ['CHAOS', '#f2b632', '#c48a1a', '#14101c'],
  legacy: ['OLD', '#7a8a99', '#566472', '#fff8e7'],
};

export const UI_SPRITES: Record<string, PixelSprite> = {
  'ui:frame': frame(),
  'ui:cursor': cursor(),
  'ui:hp_bar': hpBar(),
  'ui:hp_fill:green': solid('#4fd16a'),
  'ui:hp_fill:yellow': solid('#f2b632'),
  'ui:hp_fill:red': solid('#e8503c'),
  ...Object.fromEntries(Object.entries(TYPE_BADGES).map(([id, [l, a, b, f]]) => [`ui:type:${id}`, badge(l, a, b, f)])),
};
