// Art-B: Codestral, DeepSeek, Qwen, Grok, Stable Diffusion, Midjourney, Whisper, Falcon, SmolLM, BERT.
// Flat riso vector style (see ./types.ts). Stages share part helpers so silhouettes stay consistent.
import type { PokaiSvg } from './types';
import { pixelCat, stamp, MCAT, PLUMP, MI } from './pokai-a';

export const INK = '#1d1a2b';
export const INK2 = '#3a3550';
export const PAPER = '#f4efe4';
export const PINK = '#ff48b0';
export const BLUE = '#0078bf';
export const YEL = '#ffd23f';
export const TEAL = '#00a095';
export const ORG = '#ff6c2f';
export const RED = '#e0283c';
export const STEEL = '#8c93a3';

const n1 = (n: number): number => Math.round(n * 10) / 10;

/** Path data helpers: every shape is a path so shadows can reuse the same data. */
export const ell = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${n1(cx - rx)} ${n1(cy)}a${rx} ${ry} 0 1 0 ${n1(2 * rx)} 0a${rx} ${ry} 0 1 0 ${n1(-2 * rx)} 0z`;
export const circ = (cx: number, cy: number, r: number): string => ell(cx, cy, r, r);
export const rr = (x: number, y: number, w: number, h: number, r = 3): string =>
  `M${x + r} ${y}h${w - 2 * r}q${r} 0 ${r} ${r}v${h - 2 * r}q0 ${r} ${-r} ${r}h${-(w - 2 * r)}q${-r} 0 ${-r} ${-r}v${-(h - 2 * r)}q0 ${-r} ${r} ${-r}z`;
/** Star / spiky polygon. */
export const spiky = (cx: number, cy: number, rIn: number, rOut: number, n: number, rot = 0): string => {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (Math.PI * i) / n;
    const r = i % 2 === 0 ? rOut : rIn;
    pts.push(`${n1(cx + Math.cos(a) * r)} ${n1(cy + Math.sin(a) * r)}`);
  }
  return `M${pts.join('L')}z`;
};

/** Outlined filled path (stroke inherited from the sprite group). */
export const P = (d: string, fill: string): string => `<path d="${d}" fill="${fill}"/>`;
/** Filled path without outline (highlights, inner details). */
export const NS = (d: string, fill: string): string => `<path d="${d}" fill="${fill}" stroke="none"/>`;
/** Stroke-only path. */
export const L = (d: string): string => `<path d="${d}" fill="none"/>`;
/** Round ink eye with a paper glint. */
export const eye = (x: number, y: number, r = 5): string =>
  P(circ(x, y, r), INK) + NS(circ(x - r * 0.35, y - r * 0.35, r * 0.38), PAPER);

interface SpriteOpts {
  shadow?: string;
  /** scale around the feet (64,118) */
  s?: number;
  /** rotation (deg) around the body centre, applied inside the shadow and body groups */
  rot?: number;
  /** vertical shift applied before scaling (bring natural feet to y=118) */
  dy?: number;
}

/** Wrap silhouettes (for the offset misregistration shadow) and body layers into a full SVG. */
export function sprite(sil: string[], body: string, o: SpriteOpts = {}): string {
  const s = o.s ?? 1;
  const sh = o.shadow ?? PINK;
  const sw = n1(3 / s);
  const dy = o.dy ?? 0;
  const tf = s === 1 && !dy ? '' : ` transform="translate(64 118) scale(${s}) translate(-64 -118) translate(0 ${dy})"`;
  const rt = o.rot ? ` transform="rotate(${o.rot} 64 84)"` : '';
  const shadow = `<g${rt}>` + sil.map((d) => (d.startsWith('<') ? d : `<path d="${d}"/>`)).join('') + '</g>';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><g${tf}>` +
    `<g transform="translate(4 4)" fill="${sh}" stroke="${sh}" stroke-width="${sw}" stroke-linejoin="round">${shadow}</g>` +
    `<g stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"><g${rt}>${body}</g></g></g></svg>`
  );
}


/* ================================================================== helpers (logo geometry) */

type XY = [number, number];
const rad = (a: number): number => (a * Math.PI) / 180;
const polar = (cx: number, cy: number, r: number, a: number): XY => [n1(cx + r * Math.cos(rad(a))), n1(cy + r * Math.sin(rad(a)))];
/** Annular sector, angles in degrees clockwise from east (screen space). */
const sector = (cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string => {
  const lg = a1 - a0 > 180 ? 1 : 0;
  const [ax, ay] = polar(cx, cy, r1, a0);
  const [bx, by] = polar(cx, cy, r1, a1);
  const [ex, ey] = polar(cx, cy, r0, a1);
  const [dx, dy] = polar(cx, cy, r0, a0);
  return `M${ax} ${ay}A${r1} ${r1} 0 ${lg} 1 ${bx} ${by}L${ex} ${ey}A${r0} ${r0} 0 ${lg} 0 ${dx} ${dy}z`;
};
const poly = (pts: XY[]): string => 'M' + pts.map((p) => `${p[0]} ${p[1]}`).join('L') + 'z';
const hexPts = (cx: number, cy: number, R: number): XY[] => [-90, -30, 30, 90, 150, 210].map((a) => polar(cx, cy, R, a));
const cellD = (x: number, y: number, c: number): string => `M${x} ${y}h${c}v${c}h${-c}z`;
/** Explicit-stroke path (for ribbons, rings, highlights). */
const LC = (d: string, col: string, w: number, cap = 'round'): string =>
  `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
const ribbon = (d: string, col: string, w: number): string => LC(d, INK, w + 6) + LC(d, col, w);
/** Rotated group (rotation in degrees around cx,cy). */
const RG = (a: number, cx: number, cy: number, inner: string): string => `<g transform="rotate(${a} ${cx} ${cy})">${inner}</g>`;
/** Mirror a fragment around x=64. */
const MIR = (inner: string): string => `<g transform="translate(128 0) scale(-1 1)">${inner}</g>`;
const sp = (d: string): string => `<path d="${d}"/>`;
const blush = (x: number, y: number, r = 3.6): string => NS(ell(x, y, r * 1.35, r), PINK);

/* ------------------------------------------------------------------ Mistral: pixel cats (Codestral, Devstral) */

const PALB: Record<string, string> = { k: INK, w: PAPER, p: PINK, y: MI[0] as string, r: MI[4] as string, d: INK2 };
function pixelSprite(grid: string[], cell: number, shadow: string): string {
  const { under, fills } = pixelCat(grid, PALB, cell);
  return sprite([under], NS(under, INK) + fills.map(([f, d]) => NS(d, f)).join(''), { shadow });
}

function mistral(dev: boolean): string {
  if (!dev) {
    // the sitting cat between `< >` with a blinking cursor block
    const g = stamp(20, 13, [
      [MCAT, 3, 0],
      [['..k', '.k.', 'k..', '.k.', '..k'], 0, 3], [['k..', '.k.', '..k', '.k.', 'k..'], 17, 3],
      [['ww', 'ww'], 17, 10],
    ]);
    return pixelSprite(g, 6, PINK);
  }
  // the plump cat with a pixel hard hat and a little terminal on its belly (no tie: it ships on Fridays)
  const body = PLUMP.map((r) => r.replace(/[wr]/g, '#'));
  const g = stamp(17, 16, [
    [body, 0, 2],
    [['..wwwww..', '.wwwywww.', 'kkkkkkkkkkk'], 2, 0],
    [['kkkkkkk', 'kdyddwk', 'kddyddk', 'kkkkkkk'], 4, 10],
  ]);
  return pixelSprite(g, 7, BLUE);
}


/* ------------------------------------------------------------------ DeepSeek: the blue whale */

const WHALE =
  'M10 72C10 50 28 38 50 38C68 38 82 44 90 54C96 46 98 38 96 30C90 28 86 26 82 20C92 18 100 24 104 30C108 24 116 20 124 22C122 30 116 34 110 36C112 48 110 62 104 74C94 94 72 100 50 98C26 96 10 88 10 72Z';
const WFIN = 'M48 84C44 98 54 108 70 104C66 96 60 88 48 84Z';

function whale(kind: 'v2' | 'v3' | 'r1' | 'v4'): string {
  const BL = '#4d6bfe';
  const HL = '#a5b4ff';
  const sil: string[] = [WHALE, WFIN];
  let b = '';
  const big = kind === 'v2' ? 1.35 : 1;
  if (kind === 'v3' || kind === 'v4') {
    const sp1 = 'M46 36C38 28 42 18 46 10C50 18 54 28 46 36Z';
    b += P(sp1, HL) + P(circ(58, 22, 3.4), HL) + P(circ(34, 24, 3), HL);
    sil.push(sp1, circ(58, 22, 3.4), circ(34, 24, 3));
  }
  if (kind === 'r1') {
    const bub = circ(46, 6, 14);
    sil.push(bub, circ(40, 28, 4), circ(34, 36, 2.6));
    b += P(bub, PAPER) + P(circ(40, 28, 4), PAPER) + NS(circ(34.5, 36, 2.4), PAPER);
    b += L('M46 6m-1 0a3 3 0 1 1 4 3a7 7 0 1 1 -9 -2');
  }
  if (kind === 'v4') {
    const crest = [poly([[44, 39], [52, 24], [58, 38]]), poly([[58, 40], [68, 22], [74, 42]]), poly([[74, 44], [86, 30], [88, 52]])];
    for (const d of crest) {
      sil.push(d);
      b += P(d, YEL);
    }
  }
  b += P(WHALE, BL);
  b += NS('M18 80C30 92 54 94 70 92C84 90 98 84 104 74C100 92 80 100 50 98C28 96 16 90 18 80Z', HL);
  b += NS('M24 58C30 48 42 44 56 44C46 48 36 54 32 62Z', HL);
  b += P(WFIN, BL);
  b += P(WHALE, 'none');
  b += L(`M12 74C22 ${kind === 'r1' ? 78 : 84} 36 82 46 76`);
  const er = 5 * big;
  b += P(ell(28, 62, er + 1, er), PAPER) + NS(circ(29, 63, er * 0.62), INK) + NS(circ(28, 61.5, 1.2), PAPER);
  b += blush(36, 72, 3.4);
  if (kind === 'r1') b += L('M20 52l16 5');
  if (kind === 'v4') {
    const plate = rr(56, 62, 30, 20, 3);
    b += P(plate, STEEL) + NS(circ(62, 68, 1.8), INK) + NS(circ(80, 68, 1.8), INK) + NS(circ(62, 76, 1.8), INK) + NS(circ(80, 76, 1.8), INK);
    sil.push(plate);
    b += L('M20 51l16 7');
  }
  if (kind === 'v3') b += NS(circ(62, 70, 2.4), HL) + NS(circ(72, 76, 2.4), HL) + NS(circ(82, 68, 2.4), HL);
  const s = { v2: 0.82, v3: 0.94, r1: 0.96, v4: 1 }[kind];
  return sprite(sil, b, { s, dy: 12, shadow: kind === 'v4' ? PINK : BLUE });
}

/* ------------------------------------------------------------------ Qwen: the faceted hexagon */

function qwenGem(cx: number, cy: number, R: number, light = '#9b94ff', mid = '#615ced', dark = '#4540b8'): string {
  const [v0, v1, v2, v3, v4, v5] = hexPts(cx, cy, R) as [XY, XY, XY, XY, XY, XY];
  const hex = poly([v0, v1, v2, v3, v4, v5]);
  const c: XY = [cx, cy];
  return (
    P(hex, mid) +
    NS(poly([v5, v0, v1, c]), light) +
    NS(poly([c, v1, v2, v3]), dark) +
    L(`M${v5.join(' ')}L${c.join(' ')}L${v1.join(' ')}M${c.join(' ')}L${v3.join(' ')}`) +
    P(hex, 'none')
  );
}

function qwen(kind: 'q1' | 'q2' | 'q3' | 'qwq'): string {
  const R = { q1: 38, q2: 42, q3: 44, qwq: 42 }[kind];
  const foot = kind === 'q1' ? 9 : 8;
  const cx = 64;
  const cy = 118 - foot - R;
  const hexD = poly(hexPts(cx, cy, R));
  const sil: string[] = [hexD];
  let b = '';
  const feet = [ell(cx - 15, 114, 9, 5), ell(cx + 15, 114, 9, 5)];
  for (const f of feet) {
    sil.push(f);
    b += P(f, INK2);
  }
  if (kind === 'q2') {
    const arms = [ell(cx - R * 0.87 - 6, cy + 8, 7, 8), ell(cx + R * 0.87 + 6, cy + 8, 7, 8)];
    for (const a of arms) {
      sil.push(a);
      b += P(a, '#615ced');
    }
    const ant = `M${cx} ${cy - R}V${cy - R - 10}`;
    b += L(ant) + qwenGem(cx, cy - R - 17, 8);
    sil.push(poly(hexPts(cx, cy - R - 17, 8)));
  }
  if (kind === 'q3') {
    for (const [mx, my] of [[18, 36], [110, 36], [64, 9]] as XY[]) {
      sil.push(poly(hexPts(mx, my, 8)));
      b += qwenGem(mx, my, 8, '#c9c4ff', '#8d86ff', '#615ced');
    }
    b += L(`M${cx - R * 0.5} ${cy - R * 0.55}L26 40M${cx + R * 0.5} ${cy - R * 0.55}L102 40`);
  }
  b += qwenGem(cx, cy, R);
  const ex = R * 0.34;
  const ey = cy + R * 0.2;
  b += eye(cx - ex, ey, 4.4) + eye(cx + ex, ey, 4.4);
  b += blush(cx - ex - 6, ey + 7, 3) + blush(cx + ex + 6, ey + 7, 3);
  if (kind === 'qwq') {
    b += L(`M${cx - ex - 8} ${ey - 9}l13 4M${cx + ex + 8} ${ey - 9}l-13 4`);
    b += L(`M${cx - 5} ${ey + 11}h10`);
    const bub = circ(102, 26, 15);
    sil.push(bub, circ(88, 46, 5), circ(94, 38, 4));
    b += P(bub, PAPER) + P(circ(88, 46, 5), PAPER) + P(circ(94, 38, 4), PAPER);
    b += L('M96 22q0 -7 6 -7q6 0 6 6q0 5 -6 7v3') + NS(circ(102, 36, 2), INK);
  } else {
    b += L(`M${cx - 5} ${ey + 8}q5 5 10 0`);
  }
  return sprite(sil, b, { shadow: kind === 'qwq' ? PINK : BLUE });
}

/* ------------------------------------------------------------------ Grok: black tile with the slashed ring */

function grokMark(cx: number, cy: number, k: number): string {
  return (
    LC(`${ell(cx, cy, 15 * k, 12 * k)}`, PAPER, 6.5 * k) +
    LC(`M${cx - 19 * k} ${cy + 16 * k}L${cx + 21 * k} ${cy - 17 * k}`, PAPER, 5.5 * k, 'butt')
  );
}

function grok(stage: 1 | 3 | 4): string {
  const HLT = '#5a5478';
  const sil: string[] = [];
  let b = '';
  let x: number, y: number, w: number;
  if (stage === 1) {
    [x, y, w] = [35, 50, 58];
  } else if (stage === 3) {
    [x, y, w] = [28, 26, 72];
  } else {
    [x, y, w] = [24, 30, 80];
  }
  const tile = rr(x, y, w, w, stage === 1 ? 10 : 12);
  const cx = x + w / 2;
  if (stage === 3) {
    // booster flames
    const f1 = poly([[44, 98], [56, 98], [50, 118]]);
    const f2 = poly([[72, 98], [84, 98], [78, 118]]);
    sil.push(f1, f2);
    b += P(f1, YEL) + P(f2, YEL) + NS(poly([[47, 98], [53, 98], [50, 108]]), ORG) + NS(poly([[75, 98], [81, 98], [78, 108]]), ORG);
  } else {
    const fl = rr(cx - 24, y + w - 4, 17, 12, 4);
    const fr = rr(cx + 7, y + w - 4, 17, 12, 4);
    sil.push(fl, fr);
    b += P(fl, INK2) + P(fr, INK2);
  }
  if (stage === 4) {
    const hl = poly([[x + 4, y + 6], [x + 6, y - 14], [x + 22, y + 2]]);
    const hr = poly([[x + w - 4, y + 6], [x + w - 6, y - 14], [x + w - 22, y + 2]]);
    sil.push(hl, hr);
    b += P(hl, RED) + P(hr, RED);
    for (const fx of [x - 8, x + w + 8]) {
      const fist = circ(fx, y + 50, 10);
      sil.push(fist);
      b += P(fist, INK2) + NS(circ(fx - 2, y + 47, 2.4), PINK);
    }
  }
  if (stage === 3) {
    for (const fx of [x - 6, x + w + 6]) {
      const arm = ell(fx, y + 44, 7, 9);
      sil.push(arm);
      b += P(arm, INK2);
    }
  }
  sil.push(tile);
  b += P(tile, INK2);
  b += NS(rr(x + 6, y + 6, w * 0.34, 4, 2), HLT);
  const ey = y + w * 0.27;
  const ex = w * 0.24;
  if (stage === 1) {
    b += P(ell(cx - ex, ey, 6.5, 6), PAPER) + P(ell(cx + ex, ey, 6.5, 6), PAPER);
    b += NS(circ(cx - ex + 1.5, ey + 1, 3.2), INK) + NS(circ(cx + ex + 1.5, ey + 1, 3.2), INK);
    b += LC(`M${cx - ex - 8} ${ey - 10}l15 4M${cx + ex + 8} ${ey - 10}l-15 4`, PAPER, 2.4);
  } else if (stage === 3) {
    const lens = [rr(cx - ex - 11, ey - 7, 21, 14, 5), rr(cx + ex - 10, ey - 7, 21, 14, 5)];
    b += P(lens[0] as string, '#0078bf') + P(lens[1] as string, '#0078bf');
    b += NS(rr(cx - ex - 8, ey - 4, 7, 3, 1.5), PAPER) + NS(rr(cx + ex - 7, ey - 4, 7, 3, 1.5), PAPER);
    b += LC(`M${cx - ex + 10} ${ey - 2}h${2 * ex - 20 + 1}`, PAPER, 2.4, 'butt');
  } else {
    b += NS(circ(cx, y + w * 0.68, 27), PINK);
    for (const s of [-1, 1]) {
      const ep = poly([[cx + s * ex - 10, ey - 6], [cx + s * ex + 10, ey - 6 + (s < 0 ? 4 : 0) * 0], [cx + s * ex + 7, ey + 6], [cx + s * ex - 7, ey + 6]]);
      b += P(ep, PAPER) + NS(circ(cx + s * ex, ey + 1, 3.4), RED);
      b += LC(`M${cx + s * (ex + 12)} ${ey - 13}L${cx + s * (ex - 8)} ${ey - 5}`, PAPER, 2.6);
    }
  }
  b += grokMark(cx, y + w * (stage === 4 ? 0.7 : 0.68), stage === 1 ? 0.95 : stage === 3 ? 1.15 : 1.3);
  return sprite(sil, b, { shadow: stage === 4 ? PINK : BLUE });
}

/* ------------------------------------------------------------------ Stable Diffusion: the "S" ribbon */

const S_PATH = 'M92 36C90 16 38 14 38 40C38 62 90 56 90 82C90 108 36 108 34 88';

function sd(kind: 1 | 2 | 3): string {
  const VIO = '#8b5cf6';
  const W = kind === 1 ? 26 : kind === 2 ? 29 : 28;
  const cap = kind === 3 ? 'butt' : 'round';
  const sh = PINK;
  const sil: string[] = [`<path d="${S_PATH}" fill="none" stroke="${sh}" stroke-width="${W + 6}" stroke-linecap="${cap}" stroke-linejoin="${kind === 3 ? 'miter' : 'round'}"/>`];
  let b = '';
  const noise = (pts: Array<[number, number, string, number]>): void => {
    for (const [nx, ny, col, sz] of pts) {
      const d = rr(nx, ny, sz, sz, 1);
      sil.push(d);
      b += P(d, col);
    }
  };
  if (kind === 1) {
    noise([[14, 40, TEAL, 7], [104, 24, YEL, 7], [108, 64, PINK, 7], [18, 96, YEL, 7], [100, 108, TEAL, 7], [22, 62, PINK, 6], [86, 12, TEAL, 6], [56, 108, PINK, 6]]);
  } else if (kind === 2) {
    noise([[14, 40, TEAL, 5], [106, 30, YEL, 5], [108, 100, PINK, 5], [14, 100, YEL, 5]]);
  }
  b += ribbon(S_PATH, VIO, W);
  if (kind === 3) {
    b += LC(S_PATH, '#c4b5fd', 2.4, 'butt');
    const spark = spiky(106, 30, 3, 13, 4, Math.PI / 4);
    sil.push(spark);
    b += P(spark, YEL);
    b += P(rr(10, 52, 7, 7, 1), TEAL) + P(rr(108, 94, 7, 7, 1), PINK);
    sil.push(rr(10, 52, 7, 7, 1), rr(108, 94, 7, 7, 1));
  }
  if (kind === 2) {
    // brush
    b += `<g transform="rotate(25 108 78)">` + P(rr(105, 58, 7, 40, 3), STEEL) + P('M104 56h9l-1 -10q-3 -6 -7 0z', PINK) + `</g>`;
    sil.push(RG(25, 108, 78, sp(rr(105, 58, 7, 40, 3)) + sp('M104 56h9l-1 -10q-3 -6 -7 0z')));
  }
  b += LC('M48 16C54 11 66 10 74 12', '#c4b5fd', 3);
  const r = kind === 1 ? 4 : 4.6;
  const eyeY = 22;
  b += P(ell(52, eyeY, 7, 6.5), PAPER) + P(ell(76, eyeY, 7, 6.5), PAPER);
  b += NS(circ(53, eyeY + 1, r - 0.8), INK) + NS(circ(77, eyeY + 1, r - 0.8), INK);
  b += NS(circ(51.5, eyeY - 1, 1.2), PAPER) + NS(circ(75.5, eyeY - 1, 1.2), PAPER);
  b += L('M59 32q5 4 10 0');
  return sprite(sil, b, { shadow: sh });
}

/* ------------------------------------------------------------------ Midjourney: the sailboat */

function midjourney(kind: 5 | 6 | 7): string {
  const hull = 'M12 90H116C110 106 96 114 64 114C32 114 18 106 12 90Z';
  const big = 'M58 12C46 36 30 62 20 88H58Z';
  const small = 'M68 30C80 50 98 70 108 88H68Z';
  const jib = 'M118 90C116 70 112 58 108 52L100 90Z';
  const wave = 'M0 106q8 -8 16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0V124H0z';
  const sil: string[] = [hull, big, small, 'M62 8h4v84h-4z'];
  let b = '';
  b += P('M62 8h4v84h-4z', INK);
  b += P('M66 8L84 13L66 19Z', kind === 5 ? PAPER : kind === 6 ? PINK : YEL);
  sil.push('M66 8L84 13L66 19Z');
  b += P(big, PAPER) + P(small, PAPER);
  if (kind === 7) {
    b += P(jib, PAPER);
    sil.push(jib);
    b += NS('M30 76C34 64 40 58 44 56C42 68 40 76 40 88H24Z', PINK);
    b += NS('M74 62C84 70 96 80 100 88H74Z', '#0078bf');
    b += NS('M104 84L108 74L111 86Z', YEL);
  }
  if (kind === 6) {
    b += LC('M54 28C44 44 34 60 26 80', PINK, 4) + LC('M72 44C82 58 92 72 100 84', '#0078bf', 4);
  }
  b += P(hull, INK);
  b += LC('M22 94H106', PAPER, 2.4, 'butt');
  // two eyes on the big sail + smile on the hull
  b += eye(36, 74, kind === 5 ? 3.8 : 3.4) + eye(48, 74, kind === 5 ? 3.8 : 3.4);
  b += L('M38 82q5 4 10 0');
  b += LC('M46 106q18 6 36 0', PAPER, 2.4);
  b += P(wave, '#0078bf');
  b += NS('M8 112q6 -4 12 0', PAPER);
  b += NS('M80 114q6 -4 12 0', PAPER);
  return sprite(sil.concat([wave]), b, { shadow: kind === 5 ? PINK : BLUE });
}

/* ------------------------------------------------------------------ Whisper: the blossom + sound */

function whisper(kind: 'tiny' | 'base' | 'large'): string {
  const G1 = '#10a37f';
  const G2 = '#0b7a60';
  const d = { tiny: 18, base: 21, large: 24 }[kind];
  const ry = { tiny: 20, base: 24, large: 27 }[kind];
  const rx = { tiny: 10.5, base: 12, large: 13.5 }[kind];
  const R = d + ry;
  const cx = 64;
  const cy = 118 - R;
  const sil: string[] = [];
  let b = '';
  for (let k = 0; k < 6; k++) {
    const pd = ell(cx, cy - d, rx, ry);
    sil.push(RG(k * 60, cx, cy, sp(pd)));
    b += RG(k * 60, cx, cy, P(pd, k % 2 ? G2 : G1));
  }
  const fr = d * 0.7;
  b += P(poly(hexPts(cx, cy, fr)), PAPER);
  b += eye(cx - fr * 0.36, cy - 2, fr * 0.2) + eye(cx + fr * 0.36, cy - 2, fr * 0.2);
  b += kind === 'tiny' ? L(`M${cx - 2.5} ${cy + fr * 0.4}h5`) : L(`M${cx - 4} ${cy + fr * 0.38}q4 4 8 0`);
  // sound bars
  const bars = (x: number, hs: number[], dir: 1 | -1): void => {
    hs.forEach((h, i) => {
      const bx = x + dir * i * 8;
      const d2 = rr(bx - 2.5, cy - h / 2, 5, h, 2);
      sil.push(d2);
      b += P(d2, PINK);
    });
  };
  if (kind === 'tiny') {
    bars(10, [12, 22], 1);
    bars(118, [12, 22], -1);
  } else if (kind === 'base') {
    bars(8, [10, 20, 30], 1);
    bars(120, [10, 20, 30], -1);
  } else {
    // headphones
    const band = 'M14 72C14 6 114 6 114 72';
    sil.push(`<path d="${band}" fill="none" stroke="${PINK}" stroke-width="9" stroke-linecap="round"/>`);
    b += LC(band, INK, 11) + LC(band, INK2, 5);
    for (const hx of [8, 108]) {
      const cup = rr(hx, 56, 12, 28, 5);
      sil.push(cup);
      b += P(cup, INK2) + NS(rr(hx + 3, 62, 6, 5, 2), PINK);
    }
    b += L('M122 62q6 8 0 16M126 56q10 14 0 28');
  }
  return sprite(sil, b, { shadow: kind === 'large' ? BLUE : PINK });
}

/* ------------------------------------------------------------------ Falcon (TII): crimson falcon */

const FR = '#c8102e';
const FD = '#6e0b1e';

function falcon(kind: 7 | 40 | 180): string {
  const sil: string[] = [];
  let b = '';
  const add = (d: string, fill: string): void => {
    sil.push(d);
    b += P(d, fill);
  };
  if (kind === 7) {
    add(rr(46, 108, 10, 10, 3), ORG);
    add(rr(68, 108, 10, 10, 3), ORG);
    add(ell(60, 86, 33, 28), FR);
    b += NS(ell(62, 98, 19, 14), PAPER);
    add(ell(46, 88, 11, 16), FD);
    add(ell(68, 54, 25, 23), FR);
    add(poly([[56, 36], [60, 22], [66, 36]]), FD);
    add(poly([[64, 34], [72, 20], [76, 36]]), FD);
    add('M88 52L108 60L88 68Z', YEL);
    b += eye(78, 50, 5.5);
    b += NS('M78 58h8l-4 14z', INK);
    b += blush(70, 66, 3.2);
    return sprite(sil, b);
  }
  if (kind === 40) {
    add(poly([[40, 98], [28, 118], [48, 118], [58, 102]]), FD);
    add(rr(50, 108, 10, 10, 3), ORG);
    add(rr(68, 108, 10, 10, 3), ORG);
    add(ell(60, 84, 25, 30), FR);
    b += NS(ell(67, 90, 13, 20), PAPER) + L('M61 82h13M61 90h13M63 98h11');
    add('M42 62C30 82 34 104 52 112C58 96 56 80 54 62Z', FD);
    add(ell(70, 48, 19, 18), FR);
    b += NS('M52 44C54 30 70 26 85 34C74 34 62 38 57 50Z', FD);
    add('M86 42C102 42 106 54 96 63C96 57 92 53 86 53Z', YEL);
    b += eye(77, 45, 4.6) + L('M70 38l12 3');
    b += NS('M75 53h8l-4 18l-6 -8z', INK);
    return sprite(sil, b);
  }
  const wing = 'M46 66C34 40 12 34 2 46C8 50 12 56 12 62C18 60 24 64 26 72C32 68 38 72 40 80C44 76 48 78 50 84Z';
  sil.push(wing, `<g transform="translate(128 0) scale(-1 1)"><path d="${wing}"/></g>`);
  b += P(wing, FR) + MIR(P(wing, FR));
  b += NS('M2 46C8 50 12 56 12 62C18 60 24 64 26 72L20 66L8 52Z', FD) + MIR(NS('M2 46C8 50 12 56 12 62C18 60 24 64 26 72L20 66L8 52Z', FD));
  b += L('M14 60L40 62M26 72L44 70') + MIR(L('M14 60L40 62M26 72L44 70'));
  add(rr(46, 108, 12, 10, 3), ORG);
  add(rr(70, 108, 12, 10, 3), ORG);
  add(ell(64, 84, 25, 30), FR);
  b += NS(ell(64, 92, 14, 21), PAPER) + L('M56 84h16M56 92h16M58 100h12');
  add(poly([[50, 34], [55, 12], [62, 30], [66, 30], [73, 12], [78, 34]]), FD);
  add(ell(64, 46, 22, 20), FR);
  b += eye(54, 44, 4.6) + eye(74, 44, 4.6) + L('M46 36l14 4M82 36l-14 4');
  b += NS('M49 50h9l-4 16z', INK) + NS('M70 50h9l-5 16z', INK);
  add('M57 52H71L64 68Z', YEL);
  return sprite(sil, b, { shadow: BLUE });
}

/* ------------------------------------------------------------------ SmolLM: the Hugging Face mascot */

const HF = '#ffd21e';

function huggingFace(kind: 1 | 2 | 3): string {
  const R = { 1: 30, 2: 34, 3: 37 }[kind];
  const cx = 64;
  const cy = { 1: 80, 2: 74, 3: 71 }[kind];
  const k = R / 34;
  const sil: string[] = [];
  let b = '';
  const add = (d: string, fill: string): void => {
    sil.push(d);
    b += P(d, fill);
  };
  if (kind === 2) {
    add(ell(cx - 11, 112, 9, 6), ORG);
    add(ell(cx + 11, 112, 9, 6), ORG);
  }
  if (kind === 3) {
    add(rr(34, 94, 60, 24, 5), STEEL);
    b += NS(rr(39, 98, 50, 14, 2), INK2) + NS(rr(44, 102, 14, 2.4, 1), TEAL) + NS(rr(44, 107, 24, 2.4, 1), YEL);
  }
  add(circ(cx, cy, R), HF);
  b += NS(`M${cx - R + 6} ${cy - 6}C${cx - R + 8} ${cy - R + 8} ${cx - 8} ${cy - R + 3} ${cx - 2} ${cy - R + 4}C${cx - 16} ${cy - R + 12} ${cx - R + 12} ${cy - 4} ${cx - R + 12} ${cy + 8}z`, '#fff3a0');
  const ex = R * 0.34;
  const ey = cy - R * 0.14;
  if (kind === 3) {
    b += P(circ(cx - ex, ey, 10.5), 'none') + P(circ(cx + ex, ey, 10.5), 'none') + L(`M${cx - ex + 10.5} ${ey}h${2 * ex - 21}`);
  }
  b += P(ell(cx - ex, ey, 3.6 * k, 5.4 * k), INK) + P(ell(cx + ex, ey, 3.6 * k, 5.4 * k), INK);
  b += NS(circ(cx - ex - 1, ey - 2.4 * k, 1.5 * k), PAPER) + NS(circ(cx + ex - 1, ey - 2.4 * k, 1.5 * k), PAPER);
  b += NS(ell(cx - ex - 6 * k, cy + R * 0.22, 5 * k, 3.4 * k), '#ff8a4c') + NS(ell(cx + ex + 6 * k, cy + R * 0.22, 5 * k, 3.4 * k), '#ff8a4c');
  const mx = R * 0.46;
  const my = cy + R * 0.16;
  b += P(`M${cx - mx} ${my}Q${cx} ${my + R * 0.9} ${cx + mx} ${my}Q${cx} ${my + R * 0.22} ${cx - mx} ${my}Z`, '#8c1d3a');
  b += NS(`M${cx - mx * 0.5} ${my + R * 0.4}Q${cx} ${my + R * 0.62} ${cx + mx * 0.5} ${my + R * 0.4}Q${cx} ${my + R * 0.5} ${cx - mx * 0.5} ${my + R * 0.4}Z`, PINK);
  // the two hugging hands
  const hy = kind === 3 ? 96 : cy + R * 0.74;
  const hx = R * 0.66;
  if (kind === 2) {
    // open arms: raised hands at the sides
    for (const s of [-1, 1]) {
      const hand = ell(cx + s * (R + 10), cy + 6, 10, 12);
      add(hand, HF);
      b += L(`M${cx + s * (R + 10)} ${cy - 2}v6`);
      const arm = `M${cx + s * (R - 2)} ${cy + 16}Q${cx + s * (R + 6)} ${cy + 20} ${cx + s * (R + 8)} ${cy + 16}`;
      b += L(arm);
    }
    b += P(spiky(112, 30, 2.5, 10, 4, Math.PI / 4), PINK) + P(spiky(18, 36, 2, 7, 4, Math.PI / 4), PINK);
    sil.push(spiky(112, 30, 2.5, 10, 4, Math.PI / 4), spiky(18, 36, 2, 7, 4, Math.PI / 4));
  } else {
    for (const s of [-1, 1]) {
      const hand = ell(cx + s * hx, hy, 12 * k + 1, 9.5 * k + 1);
      add(hand, HF);
      b += L(`M${cx + s * (hx - 5)} ${hy - 4}v8M${cx + s * (hx + 1)} ${hy - 5}v10`);
    }
  }
  if (kind === 3) {
    b += P(circ(100, 22, 6), PAPER) + P(circ(92, 34, 3.4), PAPER) + P(circ(106, 12, 4), PAPER);
    sil.push(circ(100, 22, 6), circ(92, 34, 3.4));
  }
  return sprite(sil, b, { shadow: kind === 3 ? BLUE : PINK });
}

/* ------------------------------------------------------------------ BERT: the four-colour "G" ring */

const GR = '#ea4335';
const GY = '#fbbc05';
const GG = '#34a853';
const GB = '#4285f4';

function gRing(cx: number, cy: number, R: number, r: number): { body: string; sil: string[] } {
  const bh = (R - r) * 0.26;
  const bar = `M${cx} ${cy - bh}H${cx + R}V${cy + bh}H${cx}Z`;
  let b = NS(circ(cx, cy, r + 1), PAPER);
  b += P(sector(cx, cy, r, R, 135, 215), GY) + P(sector(cx, cy, r, R, 45, 135), GG);
  b += P(sector(cx, cy, r, R, 215, 315), GR) + P(sector(cx, cy, r, R, 0, 45), GB);
  b += P(bar, GB);
  const sil = [`<path fill-rule="evenodd" d="${circ(cx, cy, R)}${circ(cx, cy, r)}"/>`, sp(bar)];
  return { body: b, sil };
}

function bert(kind: 'bert' | 'roberta' | 'distil'): string {
  const R = { bert: 42, roberta: 44, distil: 31 }[kind];
  const r = { bert: 20, roberta: 17, distil: 14 }[kind];
  const cx = 64;
  const cy = 118 - R;
  const ring = gRing(cx, cy, R, r);
  const sil = ring.sil.slice();
  let b = '';
  const mid = (R + r) / 2;
  const [e1x, e1y] = polar(cx, cy, mid, 253);
  const [e2x, e2y] = polar(cx, cy, mid, 287);
  if (kind === 'roberta') {
    // arms + barbell overhead
    for (const s of [-1, 1]) {
      const arm = ell(cx + s * (R + 5), cy + 4, 8, 12);
      sil.push(arm);
      b += P(arm, GR);
      const fist = circ(cx + s * (R + 12), cy - 22, 7);
      sil.push(fist);
      b += LC(`M${cx + s * (R + 5)} ${cy - 6}L${cx + s * (R + 12)} ${cy - 20}`, INK, 8) + LC(`M${cx + s * (R + 5)} ${cy - 6}L${cx + s * (R + 12)} ${cy - 20}`, GR, 3) + P(fist, GR);
    }
    const bar = LC(`M${cx - R - 16} ${cy - 30}H${cx + R + 16}`, INK, 5);
    b += bar;
    for (const s of [-1, 1]) {
      const pl = rr(cx + s * (R + 14) - 5, cy - 46, 10, 32, 3);
      sil.push(pl);
      b += P(pl, INK2);
    }
  }
  if (kind === 'bert') {
    // masked token
    const m = rr(90, 14, 28, 16, 3);
    sil.push(m);
    b += `<path d="${m}" fill="${PAPER}" stroke-dasharray="4 3"/>`;
    b += NS(circ(98, 22, 1.8), INK) + NS(circ(104, 22, 1.8), INK) + NS(circ(110, 22, 1.8), INK);
  }
  if (kind === 'distil') {
    const flask = 'M98 106L98 90L90 72H114L106 90V106Z';
    sil.push(flask);
    b += P(flask, '#bfe3fa');
    b += NS('M91.6 80L94 76H110L112.4 80L108 92V104H100V92Z', GG);
    b += P(rr(96, 64, 12, 8, 2), '#bfe3fa');
    b += NS(circ(102, 56, 2.4), GG) + NS(circ(108, 48, 1.8), GG);
  }
  b += ring.body;
  b += eye(e1x, e1y, kind === 'distil' ? 3.4 : 4.3) + eye(e2x, e2y, kind === 'distil' ? 3.4 : 4.3);
  if (kind === 'bert') {
    b += P(circ(e1x, e1y, 8), 'none') + P(circ(e2x, e2y, 8), 'none') + L(`M${e1x + 8} ${e1y}h${e2x - e1x - 16}`);
  }
  if (kind === 'roberta') b += L(`M${e1x - 7} ${e1y - 7}l12 4M${e2x + 7} ${e2y - 7}l-12 4`);
  b += L(`M${cx - 9} ${cy + 3}q5 6 10 0`);
  return sprite(sil, b, { shadow: kind === 'bert' ? BLUE : PINK });
}

/* ------------------------------------------------------------------ exports */

export const POKAI: Record<string, PokaiSvg> = {
  codestral: mistral(false),
  devstral: mistral(true),
  deepseek_v2: whale('v2'),
  deepseek_v3: whale('v3'),
  deepseek_r1: whale('r1'),
  deepseek_v4: whale('v4'),
  qwen: qwen('q1'),
  qwen_2_5: qwen('q2'),
  qwen_3: qwen('q3'),
  qwq: qwen('qwq'),
  grok_1: grok(1),
  grok_3: grok(3),
  grok_4: grok(4),
  sd_1_5: sd(1),
  sdxl: sd(2),
  sd3: sd(3),
  midjourney_v5: midjourney(5),
  midjourney_v6: midjourney(6),
  midjourney_v7: midjourney(7),
  whisper_tiny: whisper('tiny'),
  whisper_base: whisper('base'),
  whisper_large: whisper('large'),
  falcon_7b: falcon(7),
  falcon_40b: falcon(40),
  falcon_180b: falcon(180),
  smollm: huggingFace(1),
  smollm_2: huggingFace(2),
  smollm_3: huggingFace(3),
  bert: bert('bert'),
  roberta: bert('roberta'),
  distilbert: bert('distil'),
};
