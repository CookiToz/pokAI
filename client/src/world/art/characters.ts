// World character sprites (v0.3): flat riso chibi people built from a parametric rig + a small part library.
// One Spec per character -> `char:<id>:<view>:<frame>` (front/back/side x idle + 4 walk frames), see char-contract.ts.
// Authoring frame is 48x64 with the soles at y=60; the whole sprite is shifted down YOFF px for headroom
// (buns, toques, stamps), so CHAR_H=68 and the feet anchor is y=64.
import { P, svgDoc, type ArtEntry } from './kit';
import { CHAR_VIEWS, WALK_FRAMES, charKey, type CharView } from './char-contract';
import type { PlayerAppearance } from '../../state/types';

export const CHAR_W = 48;
export const CHAR_H = 68;
export const CHAR_FEET_Y = 64;
const YOFF = 4;

// ---------------------------------------------------------------- colour + svg primitives
const INK = P.ink;
const INK2 = P.ink2;
const SKINS = { fair: '#f6cfa6', light: '#f0c9a2', mid: '#e9b98e', tan: '#e3ad82', brown: '#c99a73', deep: '#a8714e', dark: '#8a5a3a' } as const;

const rgb = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number): string => {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const h = (x: number, y: number): string => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${h(r1, r2)}${h(g1, g2)}${h(b1, b2)}`;
};
const dk = (c: string, t = 0.22): string => mix(c, INK, t);
const lt = (c: string, t = 0.3): string => mix(c, '#ffffff', t);

const n = (x: number): string => String(Math.round(x * 10) / 10);
const rc = (x: number, y: number, w: number, h: number, f: string, r = 2): string => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${r}" fill="${f}"/>`;
const nrc = (x: number, y: number, w: number, h: number, f: string, r = 0): string => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${r}" fill="${f}" stroke="none"/>`;
const el = (cx: number, cy: number, rx: number, ry: number, f: string): string => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${f}"/>`;
const nel = (cx: number, cy: number, rx: number, ry: number, f: string): string => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${f}" stroke="none"/>`;
const ci = (cx: number, cy: number, r: number, f: string): string => el(cx, cy, r, r, f);
const nci = (cx: number, cy: number, r: number, f: string): string => nel(cx, cy, r, r, f);
const pa = (d: string, f: string): string => `<path d="${d}" fill="${f}"/>`;
const nf = (d: string, f: string): string => `<path d="${d}" fill="${f}" stroke="none"/>`;
const ln = (d: string, c: string = INK, w = 1.4): string => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
const fx = (d: string, f: string, o = 0.7): string => `<path data-fx="1" d="${d}" fill="${f}" stroke="none" opacity="${o}"/>`;
/** Outlined limb: ink stroke underneath, colour stroke on top. */
const limb = (d: string, f: string, w: number): string => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${n(w + 3.4)}"/><path d="${d}" fill="none" stroke="${f}" stroke-width="${n(w)}"/>`;
/** Union-outlined blob of circles (curly hair, afro, puffs). */
const blob = (cs: readonly (readonly [number, number, number])[], f: string): string =>
  cs.map(([x, y, r]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${INK}" stroke="${INK}" stroke-width="3.4"/>`).join('') + cs.map(([x, y, r]) => nci(x, y, r, f)).join('');
const at = <T,>(v: CharView, f: T, b: T, s: T): T => (v === 'front' ? f : v === 'back' ? b : s);

// ---------------------------------------------------------------- spec
type Hair = 'mohawk' | 'bowl' | 'spacebuns' | 'short' | 'messy' | 'spiky' | 'slick' | 'side' | 'bald' | 'long' | 'bun' | 'bob' | 'afro' | 'pigtails' | 'pony' | 'wild' | 'quiff' | 'curly';
type Hat = 'none' | 'mortar' | 'cap' | 'guardcap' | 'beanie' | 'nurse' | 'sailor' | 'visor' | 'headphones' | 'helmet' | 'bandana' | 'flatcap' | 'toque' | 'bucket' | 'beret' | 'hood';
type Glasses = 'none' | 'round' | 'thin' | 'shades' | 'goggles' | 'pink' | 'visor';
type Beard = 'none' | 'stubble' | 'short' | 'full' | 'mustache';
type Outfit = 'tee' | 'hoodie' | 'jacket' | 'leather' | 'suit' | 'vest' | 'trench' | 'labcoat' | 'robe' | 'chef' | 'stripes' | 'hawaii' | 'smiley' | 'blazer' | 'cardigan' | 'rain' | 'bomber' | 'overshirt' | 'tracksuit' | 'dress' | 'overalls';
type Lower = 'pants' | 'shorts' | 'skirt' | 'pencil';
type Brows = 'none' | 'flat' | 'angry' | 'raised' | 'worried';
type Mouth = 'smile' | 'grin' | 'flat' | 'smirk' | 'o';
type Eyes = 'dot' | 'big' | 'lids' | 'down';
type Neck = 'phones' | 'lanyard' | 'scarf' | 'tape' | 'pendant';
type Prop = 'torch' | 'radio' | 'briefcase' | 'cane' | 'laptop' | 'cookies' | 'stamp' | 'stack' | 'phone' | 'camera' | 'coffee' | 'baguette' | 'board' | 'gpu' | 'hanger' | 'ladle' | 'jazz' | 'chess';

interface Spec {
  skin: string;
  hair: string;
  hairStyle: Hair;
  top: string; // shirt / base layer
  coat?: string; // outer layer colour
  pants: string;
  shoes?: string;
  trim?: string; // tie, scarf, trim, patch
  outfit?: Outfit;
  lower?: Lower;
  lowerC?: string;
  apron?: string;
  hat?: Hat;
  hatC?: string;
  hatC2?: string;
  glasses?: Glasses;
  beard?: Beard;
  beardC?: string;
  brows?: Brows;
  mouth?: Mouth;
  eyes?: Eyes;
  neck?: Neck[];
  neckC?: string;
  pack?: { kind: 'bag' | 'cube' | 'messenger' | 'tote'; c: string; c2: string };
  pattern?: string; // player outfit pattern: plain | stripes | logo | split
  legStripe?: string; // tracksuit side stripe on the trousers
  props?: Prop[];
  pen?: boolean;
  short?: boolean; // short sleeves (skin arms)
  leg?: number; // leg length (10)
  hw?: number; // torso half width (10)
  hs?: number; // head scale (1)
  scale?: number; // whole-body scale around the feet
  dip?: number; // head dip in degrees (looking down)
  tired?: boolean;
  lash?: boolean; // small eyelash flicks (feminine face variant)
}

// ---------------------------------------------------------------- rig
interface Rig {
  v: CharView;
  frame: number;
  mv: boolean;
  bob: number;
  lag: number; // secondary motion: positive = trailing parts hang lower
  sway: number; // secondary horizontal trail (side view)
  sA: number; // leg A swing -1..1 (+ = forward)
  sB: number;
  lA: number; // 1 when leg A is lifted (passing)
  lB: number;
  aA: number; // arm swing (opposite to the same-side leg)
  aB: number;
  tilt: number;
  odd: number; // 1 on frames 2 & 4 (tiny asymmetry for hand props)
}
const SWING = [0, 1, 0, -1, 0];
const BOB = [0, 1, -1.2, 1, -1.2];
function mkRig(v: CharView, frame: number): Rig {
  const mv = frame > 0;
  const sA = SWING[frame] ?? 0;
  const bob = BOB[frame] ?? 0;
  const prev = mv ? BOB[frame === 1 ? 4 : frame - 1] ?? 0 : 0;
  return {
    v, frame, mv, bob,
    lag: prev - bob,
    sway: mv ? 1 : 0,
    sA, sB: -sA,
    lA: frame === 2 ? 1 : 0, lB: frame === 4 ? 1 : 0,
    aA: -sA, aB: sA,
    tilt: v === 'side' ? (mv ? 4.5 : 0) : sA * 2.6,
    odd: frame === 2 || frame === 4 ? 1 : 0,
  };
}

interface Geo { L: number; hip: number; sh: number; hw: number; cy: number }
const geo = (s: Spec): Geo => {
  const L = s.leg ?? 10;
  const hip = 57 - L;
  const sh = hip - 13;
  return { L, hip, sh, hw: s.hw ?? 10, cy: sh - 11.5 };
};

type Pt = [number, number];
interface Hands { A: Pt; B: Pt; fixA: boolean; fixB: boolean; big: boolean }
interface Layers { behind: string; under: string; mid: string; top: string }
interface Ctx { s: Spec; v: CharView; r: Rig; G: Geo }

// ---------------------------------------------------------------- legs
function legs(c: Ctx): string {
  const { s, v, r, G } = c;
  const pc = s.lower === 'skirt' || s.lower === 'pencil' ? (s.lowerC ?? s.pants) === s.pants ? s.pants : s.pants : s.pants;
  const sh = s.shoes ?? INK;
  let o = '';
  const hip = G.hip - 1;
  if (v !== 'side') {
    const sg = v === 'front' ? 1 : -1;
    const legsA: [number, number, number][] = [[19.4, r.sA, r.lA], [28.6, r.sB, r.lB]];
    for (const [x, sw, lf] of legsA) {
      const ay = 57 + sg * sw * 2 - lf * 3.6;
      const ax = x + sw * 0.5 * (x < 24 ? -1 : 1);
      if (s.lower === 'shorts') {
        o += limb(`M${x},${hip} L${ax},${ay - 1}`, s.skin, 5.2);
        o += `<path d="M${x},${hip} L${n(x + (ax - x) * 0.42)},${n(hip + (ay - 1 - hip) * 0.42)}" fill="none" stroke="${INK}" stroke-width="9"/><path d="M${x},${hip} L${n(x + (ax - x) * 0.42)},${n(hip + (ay - 1 - hip) * 0.42)}" fill="none" stroke="${pc}" stroke-width="5.8"/>`;
        o += nrc(ax - 2.9, ay - 3.4, 5.8, 1.8, P.paper);
      } else {
        o += limb(`M${x},${hip} L${ax},${ay - 1}`, pc, 5.4);
        if (s.legStripe) o += ln(`M${n(x + (x < 24 ? -1.7 : 1.7))},${hip + 1} L${n(ax + (x < 24 ? -1.7 : 1.7))},${n(ay - 3.4)}`, s.legStripe, 1.1);
      }
      const big = sg * sw > 0 ? 0.5 : 0;
      o += rc(ax - 4.4 - big / 2, ay - 1.4, 8.8 + big, 4.8, sh, 2.3);
      o += nrc(ax - 3 - big / 2, ay - 0.6, 3, 1.2, lt(sh, 0.4), 0.6);
    }
  } else {
    const legsS: [number, number, boolean][] = [[r.sB, r.lB, true], [r.sA, r.lA, false]];
    for (const [sw, lf, far] of legsS) {
      const ax = 24 + sw * 6.4 + lf * 1.8;
      const ay = 57 - lf * 3.8 - (sw < 0 ? -sw * 1.6 : 0);
      const col = far ? dk(pc, 0.18) : pc;
      const kx = lf ? ax + 3.2 : 24 + sw * 3;
      const ky = lf ? (hip + ay) / 2 - 1 : (hip + ay) / 2;
      const d = `M24,${hip} Q${n(kx)},${n(ky)} ${n(ax)},${n(ay - 1)}`;
      if (s.lower === 'shorts') {
        o += limb(d, far ? dk(s.skin, 0.12) : s.skin, 5.2);
        const ex = 24 + (ax - 24) * 0.45;
        o += `<path d="M24,${hip} L${n(ex)},${n(hip + (ay - 1 - hip) * 0.45)}" fill="none" stroke="${INK}" stroke-width="9"/><path d="M24,${hip} L${n(ex)},${n(hip + (ay - 1 - hip) * 0.45)}" fill="none" stroke="${col}" stroke-width="5.8"/>`;
      } else {
        o += limb(d, col, 5.4);
        if (s.legStripe && !far) o += ln(d, s.legStripe, 1.1);
      }
      const shc = far ? dk(sh, 0.2) : sh;
      o += rc(ax - 3.4, ay - 1.4, 10.6, 4.8, shc, 2.3);
      o += nrc(ax - 1.8, ay - 0.6, 3.2, 1.2, lt(shc, 0.4), 0.6);
    }
  }
  return o;
}

// ---------------------------------------------------------------- outfit patterns (player customisation)
const lum = (c: string): number => {
  const [r, g, b] = rgb(c);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
/** A readable mark colour on top of `c`. */
const accent = (c: string): string => (lum(c) > 0.62 ? dk(c, 0.5) : lt(c, 0.62));
interface PatBox { x0: number; x1: number; y0: number; y1: number; v: CharView | 'bust'; k: number; split: string }
/** Right half of a torso rectangle (rounded outer corners): the "riso split" misregistered panel. */
const splitPath = (x0: number, x1: number, y0: number, y1: number): string => {
  const xm = (x0 + x1) / 2;
  const r = 5;
  return `M${n(xm)},${n(y0)} H${n(x1 - r)} Q${n(x1)},${n(y0)} ${n(x1)},${n(y0 + r)} V${n(y1 - r)} Q${n(x1)},${n(y1)} ${n(x1 - r)},${n(y1)} H${n(xm)}Z`;
};
/** Plain / stripes / "</>" logo / riso split drawn over a torso base (sprite: k=1, bust: k~2.4). */
function patternMarks(kind: string, col: string, b: PatBox): string {
  const ac = accent(col);
  const { x0, x1, y0, y1, v, k } = b;
  if (kind === 'stripes') {
    let o = '';
    for (let i = 0; i < 3; i++) {
      const yy = y0 + 4.4 * k + i * 4.2 * k;
      if (yy + 1.9 * k < y1 - 0.5 * k) o += nrc(x0 + 0.8 * k, yy, x1 - x0 - 1.6 * k, 1.9 * k, ac, 0.4);
    }
    return o;
  }
  if (kind === 'logo') {
    if (v === 'back' || v === 'side') return '';
    const cx = x0 + 5.8 * k;
    const cy = y0 + 5.4 * k;
    const d = (dx: number, dy: number): string => `${n(cx + dx * k)},${n(cy + dy * k)}`;
    return ln(`M${d(-1.2, -1.6)} L${d(-3.1, 0)} L${d(-1.2, 1.6)} M${d(1.2, -1.6)} L${d(3.1, 0)} L${d(1.2, 1.6)} M${d(0.7, -2)} L${d(-0.7, 2)}`, ac, 1.05 * k);
  }
  if (kind === 'split') return nf(b.split, col === P.pink ? P.yellow : mix(col, P.pink, 0.6));
  return '';
}

// ---------------------------------------------------------------- outfits
interface Outfitted { torso: string; hem: string; hoodBack: string; sleeve: string; hemOverLegs: boolean }

function hemShape(c: Ctx, col: string, len: number, flare: number, slit: boolean): string {
  const { v, r, G } = c;
  const tw = v === 'side' ? G.hw * 0.68 : G.hw;
  const x0 = 24 - tw;
  const x1 = 24 + tw;
  const y0 = G.hip - 2;
  const by = G.hip + len + r.lag * 0.8;
  const fl = flare + (r.mv ? 0.9 : 0);
  let d: string;
  if (v === 'side') {
    const back = fl + 1 + (r.mv ? 2.4 : 0);
    const front = fl - 0.4 + (r.mv ? Math.max(r.sA, r.sB, 0) * 1.4 : 0);
    d = `M${n(x0)},${y0} L${n(x1)},${y0} L${n(x1 + front)},${n(by)} Q24,${n(by + 1.4)} ${n(x0 - back)},${n(by)}Z`;
  } else d = `M${n(x0 - 0.4)},${y0} L${n(x1 + 0.4)},${y0} L${n(x1 + fl)},${n(by)} Q24,${n(by + 1.6)} ${n(x0 - fl)},${n(by)}Z`;
  let o = pa(d, col);
  if (slit && v !== 'side') o += ln(`M24,${G.hip + 1} L24,${n(by + 0.6)}`, INK, 1.2);
  o += nrc(x0 + 0.8, y0 + 1, 2, len - 1, lt(col, 0.22), 0.8);
  return o;
}

function outfit(c: Ctx): Outfitted {
  const { s, v, G } = c;
  const o = s.outfit ?? 'tee';
  const tw = v === 'side' ? G.hw * 0.68 : G.hw;
  const x0 = 24 - tw;
  const x1 = 24 + tw;
  const y0 = G.sh - 1.5;
  const H = G.hip + 1.5 - y0;
  const a = G.sh + 1.6;
  const base = (col: string): string =>
    rc(x0, y0, 2 * tw, H, col, 5) + nrc(x1 - 4.2, y0 + 3, 3.4, H - 5, dk(col, 0.16), 1.4)
    + (s.pattern && s.pattern !== 'plain' ? patternMarks(s.pattern, col, { x0, x1, y0, y1: y0 + H, v, k: 1, split: splitPath(x0, x1, y0, y0 + H) }) : '');
  const coat = s.coat ?? s.top;
  let torso = '';
  let hem = '';
  let hoodBack = '';
  let sleeve = s.top;
  let hemOverLegs = false;
  const front = v === 'front';
  switch (o) {
    case 'tee':
      torso = base(s.top);
      break;
    case 'hoodie':
      torso = base(s.top);
      hoodBack = el(24, G.sh + 1.4, tw - 0.4, 5.2, dk(s.top, 0.14));
      if (front) torso += pa(`M${n(x0 + 2.6)},${G.hip - 1.2} L${n(x0 + 4.4)},${G.hip - 7.4} L${n(x1 - 4.4)},${G.hip - 7.4} L${n(x1 - 2.6)},${G.hip - 1.2}Z`, dk(s.top, 0.14)) + ln(`M21.4,${a} v4.4 M26.6,${a} v4.4`, P.paper, 1.1);
      if (v === 'back') torso += pa(`M${n(x0 + 2.4)},${G.sh + 2} Q24,${G.sh + 9} ${n(x1 - 2.4)},${G.sh + 2} Q24,${G.sh + 5} ${n(x0 + 2.4)},${G.sh + 2}Z`, dk(s.top, 0.14));
      if (front && s.trim) torso += ci(x1 - 4.4, G.sh + 6, 2.8, s.trim) + ln(`M${n(x1 - 5.6)},${G.sh + 6.6} v-1.8 q1.2,-1.4 2.4,0`, INK, 0.9) + nrc(x1 - 6, G.sh + 6.4, 3.2, 2, INK, 0.4);
      break;
    case 'jacket':
    case 'leather':
    case 'suit':
    case 'blazer':
    case 'cardigan': {
      sleeve = coat;
      torso = base(coat);
      if (front) {
        if (o === 'jacket' || o === 'cardigan') torso += pa(`M${n(24 - 3.6)},${n(y0 + 1)} L${n(24 + 3.6)},${n(y0 + 1)} L${n(24 + 2.8)},${n(G.hip + 1.5)} L${n(24 - 2.8)},${n(G.hip + 1.5)}Z`, s.top);
        if (o === 'cardigan') torso += ci(24, G.sh + 7.4, 0.9, INK) + ci(24, G.sh + 11, 0.9, INK);
        if (o === 'leather') {
          torso += pa(`M24,${a - 1.4} L${n(24 - 6.4)},${a - 2.4} L${n(24 - 3.2)},${a + 7.4}Z`, lt(coat, 0.28)) + pa(`M24,${a - 1.4} L${n(24 + 6.4)},${a - 2.4} L${n(24 + 3.2)},${a + 7.4}Z`, lt(coat, 0.18));
          torso += ln(`M24,${a + 4} V${G.hip + 1}`, P.steelL, 1.1) + nrc(x0 + 1.4, y0 + 3, 4.6, 2.6, lt(coat, 0.42), 1.2) + ln(`M${n(x1 - 7)},${G.hip - 4.5} h4.4`, P.steelL, 1);
        }
        if (o === 'suit' || o === 'blazer') {
          torso += pa(`M${n(24 - 4.2)},${a - 1.6} L24,${a + 8.6} L${n(24 + 4.2)},${a - 1.6}Z`, o === 'blazer' ? P.paper : s.top);
          if (o === 'suit' && s.trim) torso += pa(`M23,${a} h2 l1.3,6.4 -2.3,2.6 -2.3,-2.6Z`, s.trim);
          torso += ln(`M${n(24 - 5)},${a - 1.6} L24,${a + 9.4} L${n(24 + 5)},${a - 1.6}`, INK, 1.3) + ci(24, G.hip - 1.2, 0.9, INK);
        }
      } else if (v === 'back') torso += ln(`M24,${n(y0 + 3)} V${G.hip}`, dk(coat, 0.35), 1.1);
      else torso += pa(`M${n(24 + tw - 1)},${a - 1} L${n(24 + tw + 1)},${a + 5} L${n(24 + tw - 2.6)},${a + 6.4}Z`, lt(coat, 0.18));
      if (o === 'blazer') torso += nrc(x0 - 0.6, y0 + 0.4, 3.4, 3.2, lt(coat, 0.22), 1.4) + nrc(x1 - 2.8, y0 + 0.4, 3.4, 3.2, lt(coat, 0.22), 1.4);
      break;
    }
    case 'bomber': {
      sleeve = coat;
      torso = base(coat);
      const rib = dk(coat, 0.28);
      torso += rc(x0, G.hip - 1.6, 2 * tw, 3.4, rib, 1.4);
      if (front) torso += pa(`M${n(24 - 3.4)},${n(y0 + 0.4)} L${n(24 + 3.4)},${n(y0 + 0.4)} L${n(24 + 2.4)},${a + 2.6} L${n(24 - 2.4)},${a + 2.6}Z`, rib) + ln(`M24,${a + 2} V${G.hip - 1}`, lt(coat, 0.45), 1.1) + nrc(x0 + 1.6, G.sh + 3.8, 3.4, 1.6, P.paper, 0.6);
      else torso += rc(24 - 4, y0 - 0.2, 8, 2.8, rib, 1.2);
      break;
    }
    case 'overshirt': {
      sleeve = coat;
      torso = base(coat);
      const inner = lt(s.top, 0.72);
      if (front) {
        torso += pa(`M${n(24 - 3.6)},${n(y0 + 1)} L${n(24 + 3.6)},${n(y0 + 1)} L${n(24 + 2.6)},${G.hip + 1.5} L${n(24 - 2.6)},${G.hip + 1.5}Z`, inner);
        torso += ln(`M${n(24 - 3.6)},${n(y0 + 1)} L${n(24 - 2.6)},${G.hip + 1.5} M${n(24 + 3.6)},${n(y0 + 1)} L${n(24 + 2.6)},${G.hip + 1.5}`, INK, 1.2);
        torso += pa(`M${n(24 - 3.6)},${n(y0 + 1)} L${n(24 - 7)},${n(y0 + 3.6)} L${n(24 - 2.4)},${a + 3.4}Z`, dk(coat, 0.1)) + pa(`M${n(24 + 3.6)},${n(y0 + 1)} L${n(24 + 7)},${n(y0 + 3.6)} L${n(24 + 2.4)},${a + 3.4}Z`, lt(coat, 0.12));
        torso += rc(x1 - 7.4, G.sh + 5, 4.6, 3.6, dk(coat, 0.12), 0.8) + nrc(x1 - 7.4, G.sh + 5.8, 4.6, 0.9, lt(coat, 0.3));
      } else if (v === 'back') torso += pa(`M${n(24 - 6)},${n(y0 + 0.4)} L${n(24 + 6)},${n(y0 + 0.4)} L${n(24 + 5)},${n(y0 + 3)} L${n(24 - 5)},${n(y0 + 3)}Z`, dk(coat, 0.12)) + ln(`M24,${n(y0 + 3)} V${G.hip}`, dk(coat, 0.35), 1.1);
      else torso += pa(`M${n(24 + tw - 1)},${a - 1} L${n(24 + tw + 1)},${a + 5} L${n(24 + tw - 2.6)},${a + 6.4}Z`, lt(coat, 0.18));
      break;
    }
    case 'tracksuit': {
      sleeve = coat;
      torso = base(coat);
      const st = s.legStripe ?? P.paper;
      if (front) torso += rc(x0 + 0.4, y0 + 1, 2.2, H - 2, st, 0.8) + rc(x1 - 2.6, y0 + 1, 2.2, H - 2, st, 0.8) + pa(`M${n(24 - 3.4)},${n(y0 + 0.4)} L${n(24 + 3.4)},${n(y0 + 0.4)} L${n(24 + 2.4)},${a + 2.4} L${n(24 - 2.4)},${a + 2.4}Z`, dk(coat, 0.2)) + ln(`M24,${a + 1.6} V${G.hip + 1}`, st, 1.1);
      else if (v === 'back') torso += rc(x0 + 0.4, y0 + 1, 2.2, H - 2, st, 0.8) + rc(x1 - 2.6, y0 + 1, 2.2, H - 2, st, 0.8) + rc(24 - 4, y0 - 0.2, 8, 2.8, dk(coat, 0.2), 1.2);
      else torso += rc(24 - 1.1, y0 + 1, 2.2, H - 2, st, 0.8);
      break;
    }
    case 'dress': {
      sleeve = s.top;
      torso = base(s.top);
      hem = hemShape(c, s.top, 7.4, 3.2, false);
      hemOverLegs = true;
      torso += rc(x0, G.hip - 3.4, 2 * tw, 2.6, dk(s.top, 0.26), 1);
      if (front) torso += pa(`M${n(24 - 3.6)},${n(y0 + 0.6)} Q24,${a + 4.6} ${n(24 + 3.6)},${n(y0 + 0.6)}Z`, s.skin) + nrc(21.4, G.hip - 3.5, 5.2, 2.6, P.yellow, 0.6);
      break;
    }
    case 'overalls': {
      sleeve = s.top;
      torso = base(s.top);
      const dn = s.pants;
      if (front) {
        torso += rc(24 - 5.6, a + 3.6, 11.2, G.hip + 1.5 - a - 3.6, dn, 1.4) + nrc(24 - 5.6, G.hip - 1.4, 11.2, 2.6, dk(dn, 0.2));
        torso += nrc(24 - 5.6 + 0.6, a + 3.6, 1.4, 1.6, dk(dn, 0.2)) + rc(x0 + 1.2, y0 + 0.4, 3.2, a + 4 - y0, dn, 0.8) + rc(x1 - 4.4, y0 + 0.4, 3.2, a + 4 - y0, dn, 0.8);
        torso += ci(24 - 4.2, a + 4.8, 0.9, P.yellow) + ci(24 + 4.2, a + 4.8, 0.9, P.yellow) + ci(24 - 4.2, G.hip - 3.2, 0.7, P.yellow) + rc(24 - 2.2, G.hip - 5, 4.4, 3, dk(dn, 0.14), 0.6);
      } else if (v === 'back') torso += rc(x0, G.hip - 1.4, 2 * tw, 2.8, dn, 1) + pa(`M${n(x0 + 1.4)},${n(y0 + 0.4)} L${n(x0 + 4.6)},${n(y0 + 0.4)} L${n(x1 - 1.4)},${G.hip - 1} L${n(x1 - 4.6)},${G.hip - 1}Z`, dn) + pa(`M${n(x1 - 1.4)},${n(y0 + 0.4)} L${n(x1 - 4.6)},${n(y0 + 0.4)} L${n(x0 + 1.4)},${G.hip - 1} L${n(x0 + 4.6)},${G.hip - 1}Z`, dn);
      else torso += rc(24 - 3, a + 3.2, 6, G.hip + 1.5 - a - 3.2, dn, 1.2) + ln(`M${n(24 - 1.2)},${n(y0 + 0.4)} L${n(24 + 0.6)},${a + 3.6}`, dn, 2.6);
      break;
    }
    case 'vest':
      sleeve = s.top;
      torso = base(s.top) + rc(x0 + 1.6, y0 + 1.4, 2 * tw - 3.2, H - 2.2, coat, 3);
      torso += nrc(x0 + 1.8, G.sh + 4, 2 * tw - 3.6, 2.4, P.paper) + nrc(x0 + 1.8, G.sh + 8.8, 2 * tw - 3.6, 2.4, P.paper);
      if (front) torso += ln(`M24,${a - 1} V${G.hip + 1}`, dk(coat, 0.4), 1.1) + (s.trim ? nrc(x1 - 7, G.sh + 1.6, 4.4, 2.4, s.trim, 0.6) : '');
      break;
    case 'trench':
    case 'labcoat':
    case 'rain': {
      sleeve = coat;
      torso = base(coat);
      const rainLen = o === 'rain' ? 5 : 8;
      hem = hemShape(c, coat, rainLen, o === 'rain' ? 2 : 1.6, o !== 'rain');
      hemOverLegs = true;
      if (front) {
        if (o === 'trench') {
          torso += pa(`M24,${a - 1} L${n(24 - 7)},${a - 3} L${n(24 - 5)},${a + 5.4}Z`, lt(coat, 0.18)) + pa(`M24,${a - 1} L${n(24 + 7)},${a - 3} L${n(24 + 5)},${a + 5.4}Z`, lt(coat, 0.08));
          torso += rc(x0, G.hip - 4.4, 2 * tw, 2.6, dk(coat, 0.3), 1) + rc(22.6, G.hip - 4.8, 2.8, 3.4, P.yellowD, 0.8) + ci(20, G.sh + 6, 0.9, INK) + ci(28, G.sh + 6, 0.9, INK) + ln(`M24,${a + 4} V${G.hip - 4.5}`, dk(coat, 0.4), 1);
        } else if (o === 'labcoat') {
          torso += pa(`M${n(24 - 3.8)},${n(y0 + 1)} L${n(24 + 3.8)},${n(y0 + 1)} L${n(24 + 2.6)},${G.hip + 1.5} L${n(24 - 2.6)},${G.hip + 1.5}Z`, s.top) + ln(`M${n(24 - 3.8)},${n(y0 + 1)} L${n(24 - 2.6)},${G.hip + 2} M${n(24 + 3.8)},${n(y0 + 1)} L${n(24 + 2.6)},${G.hip + 2}`, INK, 1.3);
          torso += rc(x0 + 1.8, G.hip - 5.6, 5, 4.2, P.paper, 0.8) + ln(`M${n(x0 + 3.2)},${G.hip - 5.6} v-2`, P.blue, 1.3);
        } else torso += ci(24, G.sh + 5, 0.9, INK) + ci(24, G.sh + 9, 0.9, INK) + pa(`M${n(24 - 5)},${a - 1} L${n(24 + 5)},${a - 1} L${n(24 + 4)},${a + 2} L${n(24 - 4)},${a + 2}Z`, lt(coat, 0.2));
      } else if (v === 'back') torso += ln(`M24,${n(y0 + 3)} V${G.hip + 2}`, dk(coat, 0.35), 1.1) + (o === 'trench' ? rc(x0, G.hip - 4.4, 2 * tw, 2.6, dk(coat, 0.3), 1) : '');
      else if (o === 'trench') torso += rc(x0, G.hip - 4.4, 2 * tw, 2.6, dk(coat, 0.3), 1);
      break;
    }
    case 'robe': {
      sleeve = coat;
      torso = base(coat);
      const by = 55.4 + c.r.lag * 0.5;
      const fl = 2.4 + (c.r.mv ? 1 : 0);
      const back = v === 'side' && c.r.mv ? 2.6 : 0;
      hem = pa(`M${n(x0 - 0.4)},${G.hip - 2} L${n(x1 + 0.4)},${G.hip - 2} L${n(x1 + fl)},${n(by)} Q24,${n(by + 1.8)} ${n(x0 - fl - back)},${n(by)}Z`, coat) + nrc(x1 - 3.4, G.hip - 1, 2.6, by - G.hip - 1, dk(coat, 0.18), 1) + rc(x0 - fl, by - 2.6, 2 * tw + 2 * fl, 2.6, s.trim ?? P.yellow, 1);
      hemOverLegs = true;
      torso += rc(x0, G.hip - 3.4, 2 * tw, 2.6, s.trim ?? P.yellow, 1);
      if (front) torso += pa(`M${n(24 - 4)},${a - 1.2} L24,${a + 8} L${n(24 + 4)},${a - 1.2}Z`, lt(coat, 0.25));
      break;
    }
    case 'chef':
      sleeve = coat;
      torso = base(coat);
      if (front) torso += ln(`M24,${a} V${G.hip + 1}`, INK, 1) + ci(20.6, G.sh + 5, 1, INK) + ci(20.6, G.sh + 9.4, 1, INK) + ci(27.4, G.sh + 5, 1, INK) + ci(27.4, G.sh + 9.4, 1, INK) + pa(`M${n(24 - 4.4)},${a - 1.6} h8.8 l-4.4,4.6Z`, s.trim ?? P.red);
      if (v === 'back') torso += ln(`M24,${n(y0 + 3)} V${G.hip}`, dk(coat, 0.3), 1);
      break;
    case 'stripes':
      torso = base(P.paper);
      for (const yy of [a + 1, a + 5, a + 9]) torso += nrc(x0 + 0.8, yy, 2 * tw - 1.6, 1.9, s.top);
      torso += rc(x0, y0, 2 * tw, H, 'none', 5);
      sleeve = P.paper;
      break;
    case 'hawaii': {
      torso = base(s.top);
      const fl: [number, number, string][] = [[x0 + 3.4, G.sh + 4.4, P.pink], [x0 + 9, G.sh + 9, P.yellow], [x1 - 7, G.sh + 5, P.orange], [x1 - 3.4, G.sh + 10, P.pink], [24, G.sh + 7, P.yellow], [x0 + 4, G.sh + 11, P.orange]];
      for (const [fxx, fyy, col] of fl) torso += nci(fxx, fyy, 1.5, col) + nci(fxx, fyy, 0.5, P.paper);
      if (front) torso += pa(`M${n(24 - 3.2)},${a - 1.4} L24,${a + 6} L${n(24 + 3.2)},${a - 1.4}Z`, P.paper2);
      break;
    }
    case 'smiley': {
      torso = base(s.top);
      hoodBack = el(24, G.sh + 1.4, tw - 0.4, 5.2, dk(s.top, 0.14));
      if (front) {
        const sf = lt(s.top, 0.55);
        torso += ci(18.6, a + 8, 2, sf) + ci(29.4, a + 8, 2, sf) + ci(24, a + 5.6, 5.4, sf);
        torso += nel(22, a + 4.4, 0.8, 1.2, INK) + nel(26, a + 4.4, 0.8, 1.2, INK) + ln(`M21.6,${a + 7} q2.4,2.2 4.8,0`, INK, 1.1);
      } else if (v === 'back') torso += pa(`M${n(x0 + 2.4)},${G.sh + 2} Q24,${G.sh + 9} ${n(x1 - 2.4)},${G.sh + 2} Q24,${G.sh + 5} ${n(x0 + 2.4)},${G.sh + 2}Z`, dk(s.top, 0.14));
      break;
    }
  }
  if (s.apron) {
    if (front) torso += pa(`M${n(24 - 5.2)},${a} L${n(24 + 5.2)},${a} L${n(24 + 7.4)},${G.hip + 1.6} L${n(24 - 7.4)},${G.hip + 1.6}Z`, s.apron) + rc(21.4, G.hip - 5.4, 5.2, 3.4, dk(s.apron, 0.18), 0.8) + ln(`M${n(24 - 5.2)},${a} L${n(x0 + 0.6)},${a - 2.6} M${n(24 + 5.2)},${a} L${n(x1 - 0.6)},${a - 2.6}`, INK, 1.1);
    else if (v === 'back') torso += ln(`M${n(x0 + 0.4)},${G.sh + 3} L${n(x1 - 0.4)},${G.hip - 2.4}`, dk(s.apron, 0.1), 1.8) + nrc(21, G.hip - 3, 6, 1.6, s.apron, 0.6);
    else torso += pa(`M${n(24 + tw - 3.2)},${a} L${n(24 + tw + 1.6)},${G.hip + 1.6} L${n(24 + tw - 5)},${G.hip + 1.6}Z`, s.apron);
  }
  // lower garments shown below the torso
  if ((s.lower === 'skirt' || s.lower === 'pencil') && !hem) {
    const col = s.lowerC ?? s.pants;
    hem = s.lower === 'skirt' ? hemShape(c, col, 6, 2.6, false) : hemShape(c, col, 8.4, -0.6, false);
    hemOverLegs = true;
  }
  return { torso, hem, hoodBack, sleeve, hemOverLegs };
}

// ---------------------------------------------------------------- neck items (drawn on the torso, under the head)
function neckItems(c: Ctx): string {
  const { s, v, G, r } = c;
  let o = '';
  const a = G.sh + 2;
  for (const k of s.neck ?? []) {
    const col = s.neckC ?? P.pink;
    if (k === 'phones') {
      const cup = P.blue;
      if (v === 'side') o += rc(19.4, a - 1.6, 5.6, 7.6, cup, 2.4);
      else o += ln(`M15.4,${a - 1} Q24,${a + 5.4} 32.6,${a - 1}`, INK, 3.6) + ln(`M15.4,${a - 1} Q24,${a + 5.4} 32.6,${a - 1}`, P.paper, 1.2) + rc(11.4, a - 1.4, 5.2, 7.8, cup, 2.4) + rc(31.4, a - 1.4, 5.2, 7.8, cup, 2.4);
    }
    if (k === 'lanyard') {
      if (v === 'front') o += ln(`M18.6,${a - 1} L22,${a + 9} M29.4,${a - 1} L26,${a + 9}`, col, 1.7) + rc(20.2, a + 7.4, 7.6, 6, P.paper, 1.2) + nrc(21.6, a + 9, 4.8, 1.6, col, 0.4) + nrc(21.6, a + 11.2, 3.2, 1, INK2, 0.4);
      else if (v === 'side') o += ln(`M22.5,${a - 1} L26,${a + 8}`, col, 1.6) + rc(24.6, a + 6.6, 3, 5.4, P.paper, 0.8);
    }
    if (k === 'scarf') {
      o += rc(24 - G.hw + 1.4, a - 1.4, 2 * G.hw - 2.8, 4.6, col, 2.2);
      if (v === 'front') o += pa(`M26.4,${a + 2.6} L31,${a + 2.6} L${n(31.6 + r.lag * 0.5)},${a + 10.4} L27,${a + 10.6}Z`, col) + nrc(28, a + 5.2, 2.8, 0.9, lt(col, 0.4)) + nrc(28, a + 7.4, 2.8, 0.9, lt(col, 0.4));
      if (v === 'side') o += pa(`M${n(20 - r.sway * 1.6)},${a + 2.6} L${n(16.6 - r.sway * 2)},${a + 8.6 + r.lag * 0.6} L${n(21.4 - r.sway * 1.4)},${a + 9}Z`, col);
      if (v === 'back') o += pa(`M${n(27)},${a + 2.6} L${n(31)},${a + 2.6} L${n(31 + r.lag * 0.4)},${a + 10.4} L${n(27)},${a + 10.6}Z`, col);
    }
    if (k === 'tape') {
      o += ln(`M${n(24 - G.hw + 2.6)},${a - 1} Q24,${a + 7.4} ${n(24 + G.hw - 2.6)},${a - 1}`, INK, 3.6) + ln(`M${n(24 - G.hw + 2.6)},${a - 1} Q24,${a + 7.4} ${n(24 + G.hw - 2.6)},${a - 1}`, P.yellow, 1.7);
      if (v === 'front') o += ln(`M21,${a + 3.2} v1.6 M24,${a + 4} v1.6 M27,${a + 3.2} v1.6`, INK, 0.7);
    }
    if (k === 'pendant' && v !== 'back') {
      const px = v === 'side' ? 28 : 24;
      o += ln(`M${n(px - 5)},${a - 1} Q${px},${a + 9} ${n(px + 5)},${a - 1}`, P.yellowD, 1.4) + ci(px, a + 6.2, 2.5, P.yellow);
    }
  }
  return o;
}

// ---------------------------------------------------------------- head
const HF = 'M10,22 C10,13 16,9.5 24,9.5 C32,9.5 38,13 38,22 C38,31 32,35.5 24,35.5 C16,35.5 10,31 10,22Z';
const HS = 'M9.6,22 C9.6,13 15,9.5 23,9.5 C31,9.5 36.6,13 36.6,22 C36.6,31 31,35.5 23,35.5 C15,35.5 9.6,31 9.6,22Z';
const FC = 'M9.4,23.5 C8.2,10 15,7.4 24,7.4 C33,7.4 39.8,10 38.6,23.5 C37.4,18 34.4,15.6 31,16.2 C27.6,14 20.4,14 17,16.2 C13.6,15.6 10.6,18 9.4,23.5Z';
const SC = 'M34,17 C33.6,9.6 29,7.4 22.4,7.4 C13.6,7.4 8.8,12 8.8,21.5 C8.8,28 11,32.2 15,34 L17.2,28.8 C17.6,24 20,21.2 23,20.4 C27.4,19.6 30.6,18 32.2,15.8Z';
const BC = 'M9.2,23 C8.4,10 15,7.2 24,7.2 C33,7.2 39.6,10 38.8,23 C38.8,31.6 33.4,35.4 24,35.4 C14.6,35.4 9.2,31.6 9.2,23Z';

interface HairOut { b: string; f: string }
function hair(c: Ctx): HairOut {
  const { s, v, r } = c;
  const col = s.hair;
  const hl = lt(col, 0.34);
  const sway = r.sway * 1.6;
  const lagy = r.lag * 0.9;
  const shine = at(v, nf('M13.2,13.6 C15.4,10.4 19.4,9.2 23,9.2 C19.4,10.6 16.6,12.6 14.8,16.4Z', hl), '', nf('M13.6,10.6 C15.8,8.8 19,8.8 21.6,9.6 C18.6,10 16,11.6 14.4,14Z', hl));
  const cap = (F: string, S: string, B: string): HairOut => ({ b: '', f: at(v, pa(F, col) + shine, pa(B, col), pa(S, col) + shine) });
  switch (s.hairStyle) {
    case 'bald':
      return { b: '', f: v === 'back' ? nf('M30,12 C33,13 35,16 35.4,19.4 C33,16.6 31,14.6 28.6,13.6Z', lt(s.skin, 0.3)) : nf('M14.4,13.6 C16.4,11 19.6,10.4 22,10.8 C19.6,12 17,13.4 15.6,16Z', lt(s.skin, 0.4)) };
    case 'short':
      return cap(FC, SC, BC);
    case 'messy':
      return cap(
        'M9.6,23 C8.6,15 10,11 12.4,9.6 L10.4,4.4 L17.2,7.6 L19.8,2.2 L24.2,7 L28.8,1.8 L31,7.4 L37.8,4.2 L35.8,9.8 C38.4,11.4 39.6,16 38.4,23 C37,17.4 34.4,15.6 31.2,16.4 C28.8,14.4 25.4,15.6 24,17.2 C22.6,15.6 19,14.4 16.8,16.4 C13.6,15.6 11,17.4 9.6,23Z',
        'M34,17 C34,12.5 36,9.4 37,6.4 L31.8,8.2 L30.4,2.4 L25.4,6.4 L21.4,1.8 L19.2,6.8 L13.2,5.2 L14,10.2 C9.8,12.4 8.6,16.8 8.8,21.5 C8.8,28 11,32.2 15,34 L17.2,28.8 C17.6,24 20,21.2 23,20.4 C27.4,19.6 30.6,18 32.2,15.8Z',
        'M9.2,23 C8.4,16 9.4,12 12,10 L9.8,4.6 L16.4,7.6 L19.6,2 L24.2,6.8 L28.8,1.6 L31.4,7.4 L38.4,4.4 L36,10.2 C38.6,12.2 39.6,16.6 38.8,23 C38.8,31.6 33.4,35.4 24,35.4 C14.6,35.4 9.2,31.6 9.2,23Z',
      );
    case 'spiky':
      return cap(
        'M9.4,23.5 C8,16 8.8,12 11,9.4 L6.6,5 L14.2,6.4 L15,0.2 L20.6,5.4 L25,-0.8 L28.8,5.2 L34.4,0.4 L34.4,6.6 L41.2,4.2 L37.6,10 C39.8,13 40,18 38.6,23.5 C37.4,18 34.4,15.8 31,16.4 C27.6,14.4 20.4,14.4 17,16.4 C13.6,15.8 10.6,18 9.4,23.5Z',
        'M34,17 C34.4,13 36.6,9.6 40,6.8 L33,7.6 L33,1 L27.2,5.8 L23,-0.6 L19.6,5 L13.2,2 L14.4,8.6 L8,9 L11,14 C9,16.4 8.6,19 8.8,21.5 C8.8,28 11,32.2 15,34 L17.2,28.8 C17.6,24 20,21.2 23,20.4 C27.4,19.6 30.6,18 32.2,15.8Z',
        'M9.2,23 C8,16 8.4,12 10.6,9.6 L6.4,5.4 L13.8,6.6 L14.8,0.2 L20.4,5.2 L25,-0.8 L28.8,5.2 L34.4,0.6 L34.6,6.8 L41.4,4.6 L37.8,10.2 C40,13 40,18 38.8,23 C38.8,31.6 33.4,35.4 24,35.4 C14.6,35.4 9.2,31.6 9.2,23Z',
      );
    case 'slick': {
      const o = cap(
        'M9.6,22.5 C8.6,9.8 15.4,7 24,7 C33,7 39.4,9.8 38.4,22.5 C36.6,15.6 31,12.8 24,13 C17,12.8 11.4,15.6 9.6,22.5Z',
        'M35,17 C35,9.2 29.4,6.8 22.6,7 C13.6,7 8.8,12 8.8,21.5 C8.8,28 11,32.2 15,34 L17.2,28.8 C17.6,24 20,21.2 23,20.4 C27.4,19 31.6,18.4 33.6,13.8 C34.4,15 34.8,16 35,17Z',
        BC,
      );
      return { b: '', f: o.f + (v === 'back' ? '' : ln(v === 'front' ? 'M15,10.6 q9,-3.4 18.6,0.8' : 'M13,10.4 q9,-3.6 18,0', lt(col, 0.45), 1.3)) };
    }
    case 'side':
      return cap(
        'M9.2,24 C7.6,9.6 15,6.4 25,7 C34,7.4 40.2,10.4 38.8,22 C38.2,19 36.6,15.6 33.4,15 C28,13.4 19,14.6 13.4,19.4 C11.4,21 10.2,22.6 9.2,24Z',
        'M36.4,18.6 C36,9.6 29,6.8 22.4,7 C13.6,7 8.8,12 8.8,21.5 C8.8,28 11,32.2 15,34 L17.2,28.8 C17.6,24 20,21.2 23,20.4 C27.4,19.6 31,18.6 32.6,15.8 C34,17.4 35,18.4 36.4,18.6Z',
        BC,
      );
    case 'long': {
      const front = 'M8.2,22 C6.6,8 14,5.6 24,5.6 C34,5.6 41.4,8 39.8,22 L40.2,40 C37,43 33,41 32,36 L33.8,19 C30,15.2 26,13.2 24,13.2 C22,13.2 18,15.2 14.2,19 L16,36 C15,41 11,43 7.8,40Z';
      const back = 'M8.4,22 C7,8 14,5.6 24,5.6 C34,5.6 41,8 39.6,22 L40.6,39 Q36,44 31,41 Q24,45 17,41 Q12,44 7.4,39Z';
      const side = 'M33,17 C32.6,9 28,5.8 22,5.8 C12,5.8 7.6,12 8,22 L6.6,39 Q12,45 18,41 L19.4,31 C19.4,25 21.6,21 24,20.4 C28.4,19.6 31,18 32,16Z';
      return { b: '', f: at(v, pa(front, col) + nf('M12,10 C14,7.6 18,6.6 21,6.8 C17,8 14.6,10.4 13.4,13.6Z', hl), pa(back, col) + ln('M24,14 V40', dk(col, 0.25), 1), pa(side, col) + nf('M13,9.6 C15,7.4 18,6.8 21,7C17.4,8.4 15.4,10.6 14,13Z', hl)) };
    }
    case 'bun': {
      const bun = at(v, ci(24, 5, 4.6, col), ci(24, 6, 4.8, col), ci(14.6, 8, 4.8, col));
      return { b: '', f: bun + cap(FC, SC, BC).f };
    }
    case 'bob': {
      const front = 'M8.6,31 C6.8,9 14,6.8 24,6.8 C34,6.8 41.2,9 39.4,31 C37.6,34 35.4,32 34.4,28 L34,19.6 C30,15.4 26,15.6 24,15.6 C22,15.6 18,15.4 14,19.6 L13.6,28 C12.6,32 10.4,34 8.6,31Z';
      const back = 'M8.8,23 C8,9.4 15,6.8 24,6.8 C33,6.8 40,9.4 39.2,23 L39.8,33 C36,36.8 12,36.8 8.2,33Z';
      const side = 'M33.6,17 C33,9 29,6.8 22.4,6.8 C13.6,6.8 8.8,12 8.8,21.5 L8.2,33.6 C12,37 18,36 20,31 L19.6,26 C19.6,23 21,21 23,20.4 C27.4,19.6 30.6,18 32.2,15.8Z';
      return { b: '', f: at(v, pa(front, col) + shine, pa(back, col), pa(side, col) + shine) };
    }
    case 'afro': {
      const cs: [number, number, number][] = [[10, 16, 7], [38, 16, 7], [24, 6.4, 10], [15, 8, 7.6], [33, 8, 7.6], [7.4, 24, 5.4], [40.6, 24, 5.4]];
      const csS: [number, number, number][] = [[10, 18, 7.4], [22, 6.4, 10], [31, 9, 7], [14, 8.6, 8], [9, 26, 5.4], [32, 14, 5]];
      const front = pa('M12,20 C14,14.4 19,13.2 24,13.2 C29,13.2 34,14.4 36,20 C33,17 29,16.4 24,16.8 C19,16.4 15,17 12,20Z', col);
      if (v === 'back') return { b: '', f: blob([...cs, [24, 20, 14.4], [24, 26, 12]], col) };
      if (v === 'side') return { b: blob(csS, col), f: pa('M33.6,17.6 C32,13 27.6,12.4 23,13 C19,13.4 17.6,15 16.8,18 C20,16.6 24,17.4 26.4,18.4 C29,19.4 31.6,18.8 33.6,17.6Z', col) };
      return { b: blob(cs, col), f: front };
    }
    case 'curly': {
      const cs: [number, number, number][] = [[12.4, 13.6, 5.6], [19, 9, 6], [27.6, 9, 6], [34.6, 13.4, 5.6], [9.6, 22, 4.4], [38.4, 22, 4.4]];
      const csS: [number, number, number][] = [[13, 12, 5.8], [20, 8.6, 6], [27.6, 10, 5.6], [33, 14.6, 4.4], [10.6, 21, 4.6], [12, 29, 4]];
      const csB: [number, number, number][] = [...cs, [24, 22, 13], [11, 28, 4], [37, 28, 4]];
      return { b: '', f: at(v, blob(cs, col) + pa('M12.4,20 C14,16 18,15.6 24,15.8 C30,15.6 34,16 35.6,20 C33,18 29,17.6 24,18 C19,17.6 15,18 12.4,20Z', col), blob(csB, col), blob(csS, col)) };
    }
    case 'pigtails': {
      const tail = (x: number, dir: number): string => {
        const ty = lagy;
        return pa(`M${n(x)},16 C${n(x + dir * 7)},${n(20 + ty)} ${n(x + dir * 8)},${n(33 + ty)} ${n(x + dir * 3)},${n(37 + ty)} C${n(x - dir * 1)},${n(34 + ty)} ${n(x - dir * 0.6)},${n(27 + ty)} ${n(x - dir * 0.4)},20Z`, col) + ci(x - dir * 0.2, 17.6, 2.3, P.yellow);
      };
      if (v === 'side') return { b: pa(`M14,16 C${n(7 - sway)},${n(20 + lagy)} ${n(6 - sway)},${n(33 + lagy)} ${n(11 - sway)},${n(38 + lagy)} C${n(15 - sway)},${n(34 + lagy)} ${n(16)},27 17,21Z`, col), f: ci(14.4, 16.6, 2.3, P.yellow) + cap(FC, SC, BC).f };
      return { b: v === 'front' ? tail(11, -1) + tail(37, 1) : '', f: (v === 'back' ? tail(11, -1) + tail(37, 1) : '') + cap(FC, SC, BC).f };
    }
    case 'pony': {
      const ty = lagy;
      const tail = at(
        v,
        '',
        pa(`M24,12 C${n(30)},${n(14 + ty)} ${n(31)},${n(30 + ty)} ${n(25)},${n(38 + ty)} C${n(19)},${n(30 + ty)} ${n(19)},${n(16 + ty)} 24,12Z`, col) + ci(24, 12.6, 2.2, P.yellow),
        pa(`M13,12 C${n(5 - sway)},${n(14 + ty)} ${n(3 - sway * 2)},${n(28 + ty)} ${n(8 - sway * 2)},${n(38 + ty)} C${n(14 - sway)},${n(30 + ty)} ${n(15)},${n(18 + ty)} 18,16Z`, col) + ci(13.6, 12.6, 2.2, P.yellow),
      );
      return { b: v === 'side' ? tail : '', f: (v === 'back' ? tail : '') + cap(FC, SC, BC).f };
    }
    case 'wild': {
      return cap(
        'M9.4,24 C4,20 2.6,14 4.4,8.6 L9.6,12.4 L9.2,4.6 L15.4,9.4 L18,1.4 L22.6,8 L27.4,0.8 L30,8.4 L36.4,3 L36.4,10.6 L42.4,7.4 L40,14 C43.4,18 43.4,22 38.6,24.4 C37.6,19 34.6,16 31,16.4 C28,14.6 20,14.6 17,16.4 C13.4,16 10.4,19 9.4,24Z',
        'M34,17 C34.4,12.6 38,8.4 42,8 L36,6 L38.4,0.8 L31.4,3.8 L28.6,-1 L23.4,3.4 L19,-0.6 L16.4,5 L9.4,3.6 L11.8,9.6 L4.4,10.8 L9.4,15 C4.4,18 5,24 8.8,28.4 L12,34 L17.2,28.8 C17.6,24 20,21.2 23,20.4 C27.4,19.6 30.6,18 32.2,15.8Z',
        'M9.2,24 C3.6,20 2.4,14 4.2,8.6 L9.6,12.4 L9.2,4.6 L15.4,9.4 L18,1.4 L22.6,8 L27.4,0.8 L30,8.4 L36.4,3 L36.4,10.6 L42.6,7.4 L40.2,14 C43.6,19 43.4,23 39,26 C38.8,31.6 33.4,35.4 24,35.4 C14.6,35.4 9.2,31.6 9.2,24Z',
      );
    }
    case 'mohawk': {
      const sh = mix(s.skin, col, 0.4);
      const crest = at(
        v,
        'M19.2,17 L18.6,8.6 L21,10 L21.6,2 L24,8 L26.8,1.4 L27.2,9.6 L29.6,8.4 L28.8,17Z',
        'M19.2,21 L18.6,8.6 L21,10 L21.6,2 L24,8 L26.8,1.4 L27.2,9.6 L29.6,8.4 L28.8,21Z',
        'M12,15 L10.6,6.6 L14.4,8.2 L15.6,1.6 L19.2,6.4 L22.4,0.8 L25,6.8 L29,3 L29.6,10.6 L31.4,15Z',
      );
      return { b: '', f: at(v, pa(FC, sh), pa(BC, sh), pa(SC, sh)) + pa(crest, col) + (v === 'back' ? '' : nf('M22.6,5 l1.4,-1.6 l0.6,3Z', hl)) };
    }
    case 'bowl':
      return {
        b: '',
        f: at(
          v,
          pa('M8.8,27 C7.2,9 14,6.6 24,6.6 C34,6.6 40.8,9 39.2,27 L36,27 L35.6,20 C29,22 19,22 12.4,20 L12,27Z', col) + nf('M13.4,11 C15.6,8.6 19,8 22,8.4 C18.8,9.4 16,11.4 14.4,14Z', hl),
          pa('M8.8,27.6 C7.8,9 14,6.6 24,6.6 C34,6.6 40.2,9 39.2,27.6 C32,30.4 16,30.4 8.8,27.6Z', col),
          pa('M34,19.8 C33.6,9.6 29,6.6 22.2,6.6 C13,6.6 8.4,12 8.6,22 L9,28 L17,28 L18.4,22.4 C21,22 28,21.8 34,19.8Z', col) + nf('M13.4,11 C15.6,8.6 19,8 22,8.4 C18.8,9.4 16,11.4 14.4,14Z', hl),
        ),
      };
    case 'spacebuns': {
      const buns = at(v, ci(13.4, 5.8, 4.6, col) + ci(34.6, 5.8, 4.6, col), ci(13.4, 6.2, 4.6, col) + ci(34.6, 6.2, 4.6, col), ci(18.4, 5.4, 4.8, col) + ci(26.4, 5, 4.6, col));
      return { b: '', f: buns + cap(FC, SC, BC).f };
    }
    case 'quiff':
      return cap(
        'M9.4,23 C8,12 12,8.6 17,8.4 C16,3 22,-1 29,1.4 C35,3.4 38,8 38,12 C39.6,15 39.4,19 38.6,23 C37.6,18 34.4,15.6 31,16.2 C27.6,14.6 20.4,14.6 17,16.2 C13.6,15.6 10.6,18 9.4,23Z',
        'M36,17 C37.6,9 34,2 27,1.4 C20,1 16.4,5 13.6,6.4 C9.6,8.6 8.8,14 8.8,21.5 C8.8,28 11,32.2 15,34 L17.2,28.8 C17.6,24 20,21.2 23,20.4 C27.4,19.6 30.6,18 32.2,15.8Z',
        'M9.2,23 C8.4,10 13,6 17,5.4 C19,-0.4 29,-0.4 31,5.4 C36,6.4 39.6,10 38.8,23 C38.8,31.6 33.4,35.4 24,35.4 C14.6,35.4 9.2,31.6 9.2,23Z',
      );
  }
}

function hat(c: Ctx): string {
  const { s, v, r } = c;
  const h = s.hat ?? 'none';
  if (h === 'none') return '';
  const hc = s.hatC ?? P.blue;
  const h2 = s.hatC2 ?? dk(hc, 0.28);
  switch (h) {
    case 'mortar':
      return at(
        v,
        pa('M12,9 L12,16.4 C18,19.4 30,19.4 36,16.4 L36,9Z', hc) + pa('M3.4,8 L24,1 L44.6,8 L24,15Z', h2) + ln('M24,8 L40.6,9.4 L41,15.6', P.yellow, 1.3) + pa('M39.2,15 h3.6 l0.8,5 h-5.2Z', P.yellow) + ci(24, 8, 1.4, P.yellow),
        pa('M12,9 L12,18 C18,20.4 30,20.4 36,18 L36,9Z', hc) + pa('M3.4,8 L24,1 L44.6,8 L24,15Z', h2) + ln('M24,8 L40.6,9.4 L41,15.6', P.yellow, 1.3) + pa('M39.2,15 h3.6 l0.8,5 h-5.2Z', P.yellow) + ci(24, 8, 1.4, P.yellow),
        pa('M11,9 L11,17 C17,19.4 28,19.4 33,17 L33,9Z', hc) + pa('M3,8.4 L21,1.4 L40.4,8.4 L22,15.4Z', h2) + ln('M21,8.4 L36,12', P.yellow, 1.3) + pa('M34.4,11.6 h3.6 l0.8,5 h-5.2Z', P.yellow) + ci(21, 8.4, 1.4, P.yellow),
      );
    case 'cap':
      return at(
        v,
        pa('M10,19.2 C9.4,6 16,4.2 24,4.2 C32,4.2 38.6,6 38,19.2 C32,16.4 16,16.4 10,19.2Z', hc) + pa('M11.4,17 C18,14.8 30,14.8 36.6,17 C38.4,20.6 33.6,22 24,22 C14.4,22 9.6,20.6 11.4,17Z', h2) + ci(24, 4.6, 1.5, h2),
        pa('M9.6,20 C9.2,6.2 16,4.2 24,4.2 C32,4.2 38.8,6.2 38.4,20 C32,22.4 16,22.4 9.6,20Z', hc) + rc(18, 17.4, 12, 2.4, h2, 1),
        pa('M35,17.4 C35.6,6 29.4,4 22,4 C14,4 8.6,8 8.8,18.6 C16,15.8 28,16 35,17.4Z', hc) + pa('M31,15.8 C38,15.6 45,17.2 46.4,19.6 C42,21.2 34.6,21 30.6,19.8Z', h2) + ci(22, 4.4, 1.5, h2),
      );
    case 'guardcap':
      return at(
        v,
        pa('M8.4,16 C7.6,11 8.4,8.4 11,6.4 C13,1.8 35,1.8 37,6.4 C39.6,8.4 40.4,11 39.6,16Z', hc) + rc(8.4, 13.2, 31.2, 4.4, h2, 1.6) + ci(24, 15.4, 2, P.yellow) + pa('M12,17.4 C18,16 30,16 36,17.4 C37,20.6 32,21.6 24,21.6 C16,21.6 11,20.6 12,17.4Z', INK2) + nrc(13, 4.2, 9, 1.6, lt(hc, 0.4), 0.8),
        pa('M8.4,16 C7.6,11 8.4,8.4 11,6.4 C13,1.8 35,1.8 37,6.4 C39.6,8.4 40.4,11 39.6,16Z', hc) + rc(8.4, 13.2, 31.2, 4.4, h2, 1.6),
        pa('M35.6,16 C37,10 35,6.6 31.4,5.6 C27,2.2 12.6,3 9.8,8.4 C8,11 8.4,13.6 8.8,16Z', hc) + rc(8.4, 13.2, 27.6, 4.4, h2, 1.6) + ci(31, 15.4, 1.8, P.yellow) + pa('M32,16.4 C38,16.4 44.6,18 45.6,20 C41,21.4 34,21.2 31,20.2Z', INK2),
      );
    case 'beanie':
      return at(
        v,
        pa('M9.6,19.6 C8.4,5.2 15,2.6 24,2.6 C33,2.6 39.6,5.2 38.4,19.6 C32,17 16,17 9.6,19.6Z', hc) + rc(9, 15.6, 30, 5.2, h2, 2.4) + ci(24, 2.4, 3, h2),
        pa('M9.6,19.6 C8.4,5.2 15,2.6 24,2.6 C33,2.6 39.6,5.2 38.4,19.6 C32,17 16,17 9.6,19.6Z', hc) + rc(9, 15.6, 30, 5.2, h2, 2.4) + ci(24, 2.4, 3, h2),
        pa('M9,19.6 C7.8,5.2 14,2.6 22.4,2.6 C31,2.6 36.6,5.2 35.6,19.6 C30,17 15,17 9,19.6Z', hc) + rc(8.4, 15.6, 28.4, 5.2, h2, 2.4) + ci(21, 2.4, 3, h2),
      );
    case 'nurse':
      return at(
        v,
        pa('M11.4,17 L12.6,5 C18,0.4 30,0.4 35.4,5 L36.6,17 C30,14.4 18,14.4 11.4,17Z', P.paper) + nrc(21.8, 4.4, 4.4, 8.4, P.red, 0.6) + nrc(19.8, 6.4, 8.4, 4.4, P.red, 0.6),
        pa('M11.4,17 L12.6,5 C18,0.4 30,0.4 35.4,5 L36.6,17 C30,19 18,19 11.4,17Z', P.paper),
        pa('M33,16.5 L33,5.4 C30,1 20,0.2 13.4,3.4 L9.8,16.2 C18,14.2 26,14.4 33,16.5Z', P.paper) + nrc(18.2, 5, 3.8, 7.4, P.red, 0.6) + nrc(16.4, 6.8, 7.4, 3.8, P.red, 0.6),
      );
    case 'sailor':
      return at(
        v,
        pa('M10.4,17.6 C9.4,5 16,2.8 24,2.8 C32,2.8 38.6,5 37.6,17.6 C32,15 16,15 10.4,17.6Z', P.paper) + rc(10.2, 14.2, 27.6, 4.4, hc, 1.6) + nci(24, 16.4, 1.3, P.yellow),
        pa('M10.4,17.6 C9.4,5 16,2.8 24,2.8 C32,2.8 38.6,5 37.6,17.6 C32,19.4 16,19.4 10.4,17.6Z', P.paper) + rc(10.2, 14.2, 27.6, 4.4, hc, 1.6),
        pa('M9.6,17.6 C8.8,5 15,2.8 22.4,2.8 C30,2.8 36,5 35,17.6 C30,15 15,15 9.6,17.6Z', P.paper) + rc(9.4, 14.2, 25.6, 4.4, hc, 1.6) + nci(30, 16.4, 1.3, P.yellow),
      );
    case 'visor':
      return at(
        v,
        rc(10, 15.6, 28, 3.6, hc, 1.6) + pa('M13,18 C19,16.8 29,16.8 35,18 C36.6,21.6 31,23 24,23 C17,23 11.4,21.6 13,18Z', hc),
        rc(10, 15.6, 28, 3.6, hc, 1.6) + rc(18, 15.4, 12, 2, h2, 0.8),
        rc(9, 15.2, 25.6, 3.6, hc, 1.6) + pa('M32,16.6 C38,16.6 44,18.2 45.4,20.2 C41,21.8 35,21.6 31.6,20.6Z', hc),
      );
    case 'headphones':
      return at(
        v,
        ln('M10.4,23 C8.6,3 39.4,3 37.6,23', INK, 4.8) + ln('M10.4,23 C8.6,3 39.4,3 37.6,23', hc, 2.4) + rc(6.6, 19.4, 5.6, 9.6, hc, 2.4) + rc(35.8, 19.4, 5.6, 9.6, hc, 2.4),
        ln('M10.4,23 C8.6,3 39.4,3 37.6,23', INK, 4.8) + ln('M10.4,23 C8.6,3 39.4,3 37.6,23', hc, 2.4) + rc(6.6, 19.4, 5.6, 9.6, hc, 2.4) + rc(35.8, 19.4, 5.6, 9.6, hc, 2.4),
        ln('M20,23 C10,22 8,8 19,5.4 C27,4 33,9 33.6,15', INK, 4.8) + ln('M20,23 C10,22 8,8 19,5.4 C27,4 33,9 33.6,15', hc, 2.4) + rc(17.4, 20.4, 6.2, 10, hc, 2.6),
      );
    case 'helmet':
      return at(
        v,
        pa('M9,19.6 C7.8,4.4 15,1.6 24,1.6 C33,1.6 40.2,4.4 39,19.6 C32,17 16,17 9,19.6Z', hc) + nrc(22, 2, 4, 10, h2) + pa('M10.8,15.2 C17,12.6 31,12.6 37.2,15.2 L37.4,19.4 C31,16.8 17,16.8 10.6,19.4Z', P.tealL) + nrc(14, 15, 6, 1.2, P.paper, 0.6),
        pa('M9,19.6 C7.8,4.4 15,1.6 24,1.6 C33,1.6 40.2,4.4 39,19.6 C32,22 16,22 9,19.6Z', hc) + nrc(22, 2, 4, 14, h2) + rc(10, 13, 28, 2.2, P.paper, 0.8),
        pa('M34,19.6 C35.2,4.4 29,1.6 22,1.6 C13,1.6 7.8,4.4 9,19.6 C16,17 26,17 34,19.6Z', hc) + nrc(19, 2, 4, 12, h2) + pa('M32,14.6 C37,14.2 42.6,15.6 44,18.4 C40,19.6 35,19.6 31.4,18.6Z', P.tealL),
      );
    case 'bandana': {
      const tx = r.sway * 2.2;
      const ty = r.lag * 0.9;
      return at(
        v,
        pa('M9.6,17 C16,13.2 32,13.2 38.4,17 L38.4,21.6 C32,18 16,18 9.6,21.6Z', hc) + nci(15, 17.2, 0.9, P.paper) + nci(22, 16.2, 0.9, P.paper) + nci(30, 16.2, 0.9, P.paper) + nci(35, 17.8, 0.9, P.paper),
        pa('M9.6,17 C16,13.2 32,13.2 38.4,17 L38.4,21.6 C32,18 16,18 9.6,21.6Z', hc) + ci(24, 19.4, 3, h2) + pa(`M22,21 L${n(19 + ty * 0.3)},${n(28 + ty)} L${n(23)},${n(26 + ty)}Z`, hc) + pa(`M26,21 L${n(29)},${n(28 + ty)} L${n(25)},${n(26 + ty)}Z`, hc),
        pa('M33.2,16.4 C27,13 16,12.8 9,17.6 L9,22 C16,18 26,17.4 34,20Z', hc) + pa(`M9.6,19 L${n(2.4 - tx)},${n(21.6 + ty)} L${n(5.6 - tx)},${n(23.6 + ty)} L${n(1.4 - tx)},${n(27.6 + ty)} L${n(10)},${n(23.4)}Z`, hc),
      );
    }
    case 'flatcap':
      return at(
        v,
        pa('M9,17 C8.6,9 14,6 24,6 C34,6 39.4,9 39,17 C33,15 15,15 9,17Z', hc) + pa('M10.6,16.2 C17,14.6 31,14.6 37.4,16.2 C38.4,19.6 33,20.4 24,20.4 C15,20.4 9.6,19.6 10.6,16.2Z', h2) + ci(24, 6.4, 1.3, h2),
        pa('M9,19 C8.6,9 14,6 24,6 C34,6 39.4,9 39,19 C33,21.4 15,21.4 9,19Z', hc) + ci(24, 6.4, 1.3, h2),
        pa('M35,17 C35.6,9 30,6 22,6 C13,6 8.6,9 8.8,17.4 C16,15 28,15 35,17Z', hc) + pa('M31,15.6 C36,15.6 41,17 42,19 C38,20.2 33,20 30.6,19Z', h2),
      );
    case 'toque': {
      const puff: [number, number, number][] = at(v, [[14, 8.2, 6], [24, 4.6, 7.2], [34, 8.2, 6]], [[14, 8.2, 6], [24, 4.6, 7.2], [34, 8.2, 6]], [[14, 8.6, 6], [23, 4.6, 7.2], [31.6, 9, 5.6]]);
      return blob(puff, P.paper) + rc(at(v, 11.4, 11.4, 10), 10.4, at(v, 25.2, 25.2, 24.8), 8, P.paper, 1.6) + nrc(at(v, 12.4, 12.4, 11), 16, at(v, 23, 23, 22.6), 1.4, P.paper3);
    }
    case 'beret':
      return at(
        v,
        pa('M9.4,15.6 C7,8 14,4.6 25,5 C35,5.4 41,9 39.4,16 C32,14 16,14 9.4,15.6Z', hc) + ci(27, 4.8, 1.2, h2) + nrc(12, 7, 8, 1.6, lt(hc, 0.4), 0.8),
        pa('M9.4,15.6 C7,8 14,4.6 25,5 C35,5.4 41,9 39.4,16 C32,14 16,14 9.4,15.6Z', hc) + ci(27, 4.8, 1.2, h2),
        pa('M9,16 C7,8 13,4.6 23,5 C32,5.4 36.6,9 35,16 C29,14 15,14 9,16Z', hc) + ci(24, 4.8, 1.2, h2),
      );
    case 'hood': {
      const op = 'M12,24 C11.2,15.4 16,11.4 24,11.4 C32,11.4 36.8,15.4 36,24 C36.4,30 31,34.8 24,34.8 C17,34.8 11.6,30 12,24Z';
      const out = 'M6.2,26 C3.6,8 13,1.8 24,1.8 C35,1.8 44.4,8 41.8,26 C41.6,32 39.6,36 36.4,37.6 L11.6,37.6 C8.4,36 6.4,32 6.2,26Z';
      if (v === 'front') return `<path d="${out} ${op}" fill="${hc}" fill-rule="evenodd"/>` + ln('M20.6,35.2 v4.2 M27.4,35.2 v4.2', P.paper, 1.3) + nci(20.6, 39.8, 0.9, P.paper) + nci(27.4, 39.8, 0.9, P.paper);
      if (v === 'back') return pa(out, hc) + ln('M24,3 V30', h2, 1.2);
      return pa('M36,19 C35.6,8.4 30,2 21,2 C11,2 5.2,10 5.6,24 C5.8,31 8.6,36 12.6,37.6 L25.6,37.6 C21.4,33 20.4,28.4 22.4,24 C26,22.6 26.4,19 26.2,15.6 C28.6,13 32.6,13.4 36,19Z', hc) + ln('M8,24 C8.4,14 13,6 21,4.6', h2, 1.1);
    }
    case 'bucket':
      return at(
        v,
        pa('M12,16 C11.4,6.4 16.4,4.6 24,4.6 C31.6,4.6 36.6,6.4 36,16Z', hc) + pa('M6.6,16.8 C6.6,13.4 14,12.4 24,12.4 C34,12.4 41.4,13.4 41.4,16.8 C41.4,20.2 34,21.4 24,21.4 C14,21.4 6.6,20.2 6.6,16.8Z', hc) + rc(11.6, 11.6, 24.8, 3, h2, 1),
        pa('M12,16 C11.4,6.4 16.4,4.6 24,4.6 C31.6,4.6 36.6,6.4 36,16Z', hc) + pa('M6.6,16.8 C6.6,13.4 14,12.4 24,12.4 C34,12.4 41.4,13.4 41.4,16.8 C41.4,20.2 34,21.4 24,21.4 C14,21.4 6.6,20.2 6.6,16.8Z', hc) + rc(11.6, 11.6, 24.8, 3, h2, 1),
        pa('M11,16 C10.4,6.4 15.4,4.6 23,4.6 C30.6,4.6 35.6,6.4 35,16Z', hc) + pa('M5.6,16.8 C5.6,13.4 13,12.4 23,12.4 C33,12.4 42.4,13.4 42.4,16.8 C42.4,20.2 33,21.4 23,21.4 C13,21.4 5.6,20.2 5.6,16.8Z', hc) + rc(10.6, 11.6, 24.8, 3, h2, 1),
      );
    default:
      return '';
  }
}

function beard(c: Ctx): string {
  const { s, v } = c;
  const b = s.beard ?? 'none';
  if (b === 'none' || v === 'back') return '';
  const col = s.beardC ?? s.hair;
  const side = v === 'side';
  if (b === 'stubble') return nf(side ? 'M12.4,27 Q14,35 23,35.4 Q31,35 35.6,29 Q32,32.6 24,32.6 Q16,32 12.4,27Z' : 'M11.6,26 Q12.6,35 24,35.4 Q35.4,35 36.4,26 Q33,32.6 24,32.6 Q15,32.6 11.6,26Z', mix(s.skin, col, 0.5));
  if (b === 'mustache') return side ? pa('M32.4,28.8 Q35.6,27.6 38.2,29.4 Q36,32 32.4,30.8Z', col) : pa('M17.6,29 Q21,26.8 24,28.6 Q27,26.8 30.4,29 Q27,32.4 24,30 Q21,32.4 17.6,29Z', col);
  const full = b === 'full';
  if (side) return pa(full ? 'M12,25 Q12,39 24,40.4 Q33,40 37.4,32 Q36,29.6 34.4,29.4 Q31,32.4 26,32 Q20,31 15.6,26Z' : 'M12.4,26 Q13,36.6 23.4,37 Q32.4,36.4 36,31.4 Q34,29.6 32.6,30 Q29,33 24,32.4 Q17,31.6 14.6,26Z', col) + nf('M33.4,30.6 q1.6,-1.4 3.2,0.2 q-1.6,1.6 -3.2,-0.2Z', lt(col, 0.2));
  return pa(full ? 'M10.8,24 Q10,40 24,42 Q38,40 37.2,24 Q34.6,33.6 24,33.8 Q13.4,33.6 10.8,24Z' : 'M11.4,25 Q11.6,37.4 24,38 Q36.4,37.4 36.6,25 Q33.6,33.8 24,33.8 Q14.4,33.8 11.4,25Z', col);
}

function face(c: Ctx): string {
  const { s, v } = c;
  if (v === 'back') return '';
  let o = '';
  const eyes = s.eyes ?? 'dot';
  const glasses = s.glasses ?? 'none';
  const tired = s.tired;
  const mouth = s.mouth ?? 'smile';
  const ey = eyes === 'down' ? 26.4 : 25;
  if (v === 'front') {
    o += nel(15.6, 29.6, 2.7, 1.5, '#ff9ad2') + nel(32.4, 29.6, 2.7, 1.5, '#ff9ad2');
    if (glasses !== 'shades' && glasses !== 'visor') {
      const rx = eyes === 'big' ? 2.4 : 1.9;
      const ry = eyes === 'big' ? 3.3 : eyes === 'lids' ? 2.2 : eyes === 'down' ? 1.5 : 2.7;
      for (const x of [19.2, 28.8]) {
        o += nel(x, ey, rx, ry, INK);
        if (eyes !== 'down') o += nci(x + 0.6, ey - 0.9, 0.75, P.paper);
        if (eyes === 'lids') o += nel(x, ey - 1.6, rx + 0.4, 1.3, dk(s.skin, 0.12)) + ln(`M${n(x - rx - 0.4)},${n(ey - 1.5)} h${n(2 * rx + 0.8)}`, INK, 1.1);
        if (eyes === 'down') o += ln(`M${n(x - 2.4)},${n(ey - 1.5)} q2.4,-1.4 4.8,0`, INK, 1.1);
      }
      if (tired) o += ln('M16.8,28.6 q2.4,1.4 4.8,0 M26.4,28.6 q2.4,1.4 4.8,0', mix(s.skin, INK, 0.45), 1.1);
      if (s.lash) o += ln(`M17.4,${n(ey - 1.6)} l-2.6,-1.8 M30.6,${n(ey - 1.6)} l2.6,-1.8`, INK, 1.5);
    }
    const my = 31;
    if (mouth === 'smile') o += ln(`M21.6,${my} q2.4,2.4 4.8,0`, INK, 1.5);
    if (mouth === 'grin') o += pa(`M20.6,${my - 0.4} Q24,${my + 4.6} 27.4,${my - 0.4}Z`, '#8a1f2c') + nrc(21.8, my - 0.2, 4.4, 1.2, P.paper);
    if (mouth === 'flat') o += ln(`M21.6,${my + 0.6} h4.8`, INK, 1.5);
    if (mouth === 'smirk') o += ln(`M21.4,${my + 0.8} q3,1.4 5.8,-1.2`, INK, 1.5);
    if (mouth === 'o') o += nel(24, my + 0.8, 1.5, 1.9, '#8a1f2c');
  } else {
    o += nel(29.8, 29.6, 2.4, 1.4, '#ff9ad2');
    if (glasses !== 'shades' && glasses !== 'visor') {
      const rx = eyes === 'big' ? 2.3 : 1.8;
      const ry = eyes === 'big' ? 3.2 : eyes === 'lids' ? 2.2 : eyes === 'down' ? 1.5 : 2.7;
      o += nel(31.2, ey, rx, ry, INK);
      if (eyes !== 'down') o += nci(31.8, ey - 0.9, 0.7, P.paper);
      if (eyes === 'lids') o += nel(31.2, ey - 1.6, rx + 0.4, 1.3, dk(s.skin, 0.12)) + ln('M29,23.6 h4.4', INK, 1.1);
      if (eyes === 'down') o += ln('M28.8,23.8 q2.4,-1.4 4.8,0', INK, 1.1);
      if (tired) o += ln('M29.2,28.6 q2.2,1.2 4.4,0', mix(s.skin, INK, 0.45), 1.1);
      if (s.lash) o += ln(`M33,${n(ey - 1.6)} l2.4,-1.8`, INK, 1.5);
    }
    const my = 31.2;
    if (mouth === 'smile') o += ln(`M32.2,${my} q1.8,1.6 3.6,-0.2`, INK, 1.5);
    if (mouth === 'grin') o += pa(`M32,${my - 0.4} Q34.6,${my + 4.2} 37,${my - 0.8}Z`, '#8a1f2c');
    if (mouth === 'flat') o += ln(`M32.4,${my + 0.4} h3.6`, INK, 1.5);
    if (mouth === 'smirk') o += ln(`M32,${my + 0.8} q2,1 4,-1.2`, INK, 1.5);
    if (mouth === 'o') o += nel(35, my + 0.6, 1.2, 1.7, '#8a1f2c');
  }
  // brows
  const bw = s.brows ?? 'none';
  if (bw !== 'none') {
    const bc = s.hair === '#e9e1d0' || s.hair === '#f4efe4' ? INK2 : dk(s.hair, 0.3);
    if (v === 'front') {
      if (bw === 'flat') o += ln('M16.4,20.4 h5 M26.6,20.4 h5', bc, 1.6);
      if (bw === 'angry') o += ln('M16.2,19.4 l5.4,2 M31.8,19.4 l-5.4,2', bc, 1.7);
      if (bw === 'raised') o += ln('M16.4,20 q2.6,-2 5.2,-0.2 M26.4,19.8 q2.6,-1.8 5.2,0.2', bc, 1.5);
      if (bw === 'worried') o += ln('M16.2,21.4 l5.4,-2 M31.8,21.4 l-5.4,-2', bc, 1.5);
    } else {
      if (bw === 'flat') o += ln('M28.6,20.6 h5', bc, 1.6);
      if (bw === 'angry') o += ln('M28.4,19.8 l5.4,2', bc, 1.7);
      if (bw === 'raised') o += ln('M28.6,20.4 q2.6,-2 5.2,-0.2', bc, 1.5);
      if (bw === 'worried') o += ln('M28.6,21.6 l5.4,-2', bc, 1.5);
    }
  }
  // glasses
  if (glasses !== 'none') {
    const gl = glasses;
    if (gl === 'round' || gl === 'pink') {
      const fc = gl === 'pink' ? P.pink : INK;
      if (v === 'front') o += `<circle cx="19.2" cy="${ey}" r="4.5" fill="#ffffff" fill-opacity=".3" stroke="${fc}" stroke-width="1.8"/><circle cx="28.8" cy="${ey}" r="4.5" fill="#ffffff" fill-opacity=".3" stroke="${fc}" stroke-width="1.8"/>` + ln(`M23.6,${ey - 0.4} h0.8 M14.7,${ey - 0.6} L11,${ey - 2} M33.3,${ey - 0.6} L37,${ey - 2}`, fc, 1.5);
      else o += `<circle cx="31" cy="${ey}" r="4.5" fill="#ffffff" fill-opacity=".3" stroke="${fc}" stroke-width="1.8"/>` + ln(`M26.6,${ey - 0.6} L16,${ey - 1.6}`, fc, 1.5);
    }
    if (gl === 'thin') {
      if (v === 'front') o += `<rect x="14.2" y="${ey - 3.4}" width="9" height="6.6" rx="1.8" fill="#ffffff" fill-opacity=".25" stroke="${INK2}" stroke-width="1.4"/><rect x="24.8" y="${ey - 3.4}" width="9" height="6.6" rx="1.8" fill="#ffffff" fill-opacity=".25" stroke="${INK2}" stroke-width="1.4"/>` + ln(`M23.2,${ey - 1} h1.6 M14.2,${ey - 1.4} L10.6,${ey - 2.4} M33.8,${ey - 1.4} L37.4,${ey - 2.4}`, INK2, 1.3);
      else o += `<rect x="27" y="${ey - 3.4}" width="9" height="6.6" rx="1.8" fill="#ffffff" fill-opacity=".25" stroke="${INK2}" stroke-width="1.4"/>` + ln(`M27,${ey - 1.4} L15,${ey - 2.4}`, INK2, 1.3);
    }
    if (gl === 'shades') {
      if (v === 'front') o += rc(13.8, ey - 3.4, 9.6, 6.6, INK, 2.6) + rc(24.6, ey - 3.4, 9.6, 6.6, INK, 2.6) + ln(`M23.4,${ey - 1.4} h1.2`, INK, 1.8) + nrc(15.4, ey - 2.2, 3.4, 1.2, '#6e6888', 0.6) + nrc(26.2, ey - 2.2, 3.4, 1.2, '#6e6888', 0.6);
      else o += rc(26.4, ey - 3.4, 10.4, 6.6, INK, 2.6) + ln(`M26.4,${ey - 1.6} L14,${ey - 2.6}`, INK, 1.8) + nrc(28, ey - 2.2, 3.4, 1.2, '#6e6888', 0.6);
    }
    if (gl === 'visor') {
      if (v === 'front') o += rc(10.4, ey - 3.6, 27.2, 7.2, P.blueD, 3.2) + nrc(12.6, ey - 2.4, 22.8, 1.8, P.blueL, 0.8) + nrc(12.6, ey + 0.6, 7, 1, P.tealL, 0.5);
      else o += rc(14.6, ey - 3.6, 22.4, 7.2, P.blueD, 3.2) + nrc(17, ey - 2.4, 17.6, 1.8, P.blueL, 0.8);
    }
    if (gl === 'goggles') {
      if (v === 'front') o += ln('M9.6,15.4 Q24,11.6 38.4,15.4', P.ink2, 2.6) + `<circle cx="18.4" cy="13.4" r="4.4" fill="${P.tealL}" stroke="${INK}" stroke-width="1.8"/><circle cx="29.6" cy="13.4" r="4.4" fill="${P.tealL}" stroke="${INK}" stroke-width="1.8"/>` + nrc(16.6, 11.6, 2.4, 1.2, P.paper, 0.6) + nrc(27.8, 11.6, 2.4, 1.2, P.paper, 0.6);
      else o += ln('M9.6,15.4 Q22,11 33,13.6', P.ink2, 2.6) + `<circle cx="29.6" cy="12.8" r="4.6" fill="${P.tealL}" stroke="${INK}" stroke-width="1.8"/>` + nrc(27.8, 11, 2.4, 1.2, P.paper, 0.6);
    }
  }
  return o;
}

function head(c: Ctx): string {
  const { s, v, G } = c;
  const hr = hair(c);
  let o = '';
  // ears
  if (v === 'front') o += ci(10.2, 25.6, 2.5, s.skin) + ci(37.8, 25.6, 2.5, s.skin);
  if (v === 'back') o += ci(10.2, 25.6, 2.5, s.skin) + ci(37.8, 25.6, 2.5, s.skin);
  if (v === 'side') o += ci(37.6, 27, 2.1, s.skin);
  o += hr.b;
  // the head itself; back view is covered by hair, except bald heads
  o += pa(at(v, HF, HF, HS), s.skin);
  if (s.hairStyle === 'bald' && v === 'back') o += '';
  if (v === 'side') o += el(21.2, 26.4, 2.3, 3.1, s.skin) + ln('M20.2,25.4 q1.6,-0.2 1.8,1.8', mix(s.skin, INK, 0.45), 0.9);
  if (s.beard !== 'mustache') o += beard(c);
  o += face(c);
  if (s.beard === 'mustache') o += beard(c);
  o += hr.f;
  if (s.pen) o += at(v, ln('M12.2,19.4 L15,28', P.red, 2) + ln('M12.2,19.4 L12.8,21', INK, 2), ln('M12.2,19.4 L15,28', P.red, 2), ln('M18.4,19.4 L21.6,25', P.red, 2) + ln('M18.4,19.4 L19,21', INK, 2));
  o += hat(c);
  if (s.hs && s.hs !== 1) o = `<g transform="translate(24 35.5) scale(${s.hs}) translate(-24 -35.5)">${o}</g>`;
  if (s.dip) o = `<g transform="rotate(${v === 'side' ? s.dip : s.dip * 0.4} 24 35)">${o}</g>`;
  return `<g transform="translate(0 ${n(G.cy - 22.5)})">${o}</g>`;
}

// ---------------------------------------------------------------- arms
function arms(c: Ctx, hands: Hands, sleeve: string): { far: string; near: string } {
  const { s, v, r, G } = c;
  const hw = G.hw;
  const shy = G.sh + 2;
  const skin = s.skin;
  const one = (which: 'A' | 'B', far: boolean): string => {
    let sx: number;
    let hx: number;
    let hy: number;
    const fixed = which === 'A' ? hands.fixA : hands.fixB;
    const h = which === 'A' ? hands.A : hands.B;
    if (v === 'side') {
      sx = 24;
      hx = h[0];
      hy = h[1];
    } else {
      const sgn = which === 'A' ? -1 : 1;
      sx = 24 + sgn * (hw - 0.8);
      hx = h[0];
      hy = h[1];
    }
    const col = far ? dk(sleeve, 0.16) : sleeve;
    let d: string;
    if (fixed) d = `M${n(sx)},${n(shy)} Q${n(v === 'side' ? sx + 1 : sx + (which === 'A' ? -3.4 : 3.4))},${n((shy + hy) / 2 + 2.4)} ${n(hx)},${n(hy)}`;
    else d = `M${n(sx)},${n(shy)} Q${n(v === 'side' ? (sx + hx) / 2 - 0.4 : (sx + hx) / 2 + (which === 'A' ? -1.2 : 1.2))},${n((shy + hy) / 2 + 0.6)} ${n(hx)},${n(hy)}`;
    let o = '';
    if (s.short) {
      o += limb(d, far ? dk(skin, 0.12) : skin, 4.4);
      const ex = sx + (hx - sx) * 0.42;
      const ey = shy + (hy - shy) * 0.42;
      o += `<path d="M${n(sx)},${n(shy)} L${n(ex)},${n(ey)}" fill="none" stroke="${INK}" stroke-width="8"/><path d="M${n(sx)},${n(shy)} L${n(ex)},${n(ey)}" fill="none" stroke="${col}" stroke-width="4.8"/>`;
    } else o += limb(d, col, 4.4);
    o += ci(hx, hy + 0.4, hands.big ? 3.3 : 2.6, far ? dk(skin, 0.1) : skin);
    return o;
  };
  if (v === 'side') return { far: one('B', true), near: one('A', false) };
  return { far: '', near: one('A', false) + one('B', false) };
}

function defaultHands(c: Ctx): Hands {
  const { v, r, G } = c;
  const hy0 = G.sh + 2 + 11.4;
  if (v === 'side') {
    const ha = (a: number): Pt => [24 + a * 6.6, hy0 - Math.abs(a) * 1.2];
    return { A: ha(r.aA), B: ha(r.aB), fixA: false, fixB: false, big: false };
  }
  const sg = v === 'front' ? 1 : -1;
  const hw = G.hw;
  return { A: [24 - hw - 1.6, hy0 + sg * r.aA * 2.6], B: [24 + hw + 1.6, hy0 + sg * r.aB * 2.6], fixA: false, fixB: false, big: false };
}

// ---------------------------------------------------------------- props
function addProps(c: Ctx, hands: Hands, L: Layers): void {
  const { s, v, r, G } = c;
  const sh = G.sh;
  const lag = r.lag * 0.8;
  for (const p of s.props ?? []) {
    switch (p) {
      case 'torch': {
        if (v === 'front') {
          const [hx, hy] = hands.B;
          L.mid += rc(hx - 1.8, hy - 2.6, 3.6, 8.4, INK2, 1.2) + ci(hx, hy + 6.2, 2.1, P.yellow);
        } else if (v === 'back') {
          const [hx, hy] = hands.B;
          L.mid += rc(hx - 1.8, hy - 2.6, 3.6, 7, INK2, 1.2);
        } else {
          hands.A = [28.4, sh + 11.4];
          hands.fixA = true;
          const [hx, hy] = hands.A;
          L.mid += fx(`M${n(hx + 8.8)},${n(hy - 2.4)} L${n(hx + 19.4)},${n(hy - 7.6)} L${n(hx + 19.4)},${n(hy + 7.4)} L${n(hx + 8.8)},${n(hy + 2.4)}Z`, '#fff2a8', 0.8) + rc(hx - 2, hy - 1.9, 8.6, 3.8, INK2, 1.2) + rc(hx + 5.6, hy - 2.6, 3, 5.2, P.yellow, 1);
        }
        break;
      }
      case 'radio': {
        if (v === 'front') L.mid += rc(13.6, sh + 3.4, 4.2, 7, INK2, 1.2) + ln(`M15.6,${sh + 3.4} V${sh - 3}`, INK, 1.2) + nrc(14.4, sh + 5, 2.6, 1.4, P.tealL, 0.4) + ln(`M${n(24 - 1)},${sh + 1.6} Q${n(18)},${sh + 4} 17.8,${sh + 5}`, INK2, 0.9);
        else if (v === 'back') L.mid += rc(13.6, sh + 2.4, 4.2, 7, INK2, 1.2) + ln(`M15.6,${sh + 2.4} V${sh - 4}`, INK, 1.2);
        else L.mid += rc(22.4, sh + 2.8, 4, 7, INK2, 1.2) + ln(`M24.4,${sh + 2.8} V${sh - 4}`, INK, 1.2) + nrc(23.2, sh + 4.4, 2.4, 1.4, P.tealL, 0.4);
        break;
      }
      case 'briefcase': {
        const [hx, hy] = v === 'side' ? hands.A : hands.A;
        L.mid += rc(hx - 6.4, hy + 1.4, 12.8, 10, INK2, 2) + ln(`M${n(hx - 2.4)},${n(hy + 1.4)} v-2 h4.8 v2`, INK, 1.5) + nrc(hx - 1.4, hy + 5, 2.8, 2.2, P.yellow, 0.6);
        break;
      }
      case 'cane': {
        const [hx, hy] = hands.A;
        L.mid += ln(`M${n(hx)},${n(hy)} L${n(hx + 0.4)},59.4`, INK, 3.8) + ln(`M${n(hx)},${n(hy)} L${n(hx + 0.4)},59.4`, P.wood, 1.8) + ln(`M${n(hx)},${n(hy)} q0,-2.8 -2.6,-2.8`, INK, 3.8) + ln(`M${n(hx)},${n(hy)} q0,-2.8 -2.6,-2.8`, P.wood, 1.8);
        break;
      }
      case 'laptop': {
        if (v === 'front') L.under += rc(24 - G.hw - 6.4, sh + 3, 7.4, 14, P.steelL, 1.4) + nci(24 - G.hw - 2.7, sh + 10, 1.4, P.blue) + nrc(24 - G.hw - 5.6, sh + 4.4, 5.8, 1, P.paper, 0.4);
        else if (v === 'back') L.under += rc(24 - G.hw - 6.4, sh + 3, 7.4, 14, P.steelL, 1.4) + nrc(24 - G.hw - 4.6, sh + 5, 3, 3, P.blue, 0.6);
        else L.mid += rc(17, sh + 9.4, 14, 5, P.steelL, 1.4) + nrc(18.6, sh + 10.8, 3, 1.4, P.blue, 0.5);
        hands.fixA = true;
        break;
      }
      case 'cookies': {
        const [hx, hy] = hands.B;
        const bx = v === 'side' ? 31 : hx;
        const by = (v === 'side' ? sh + 12 : hy) + 1;
        L.mid += rc(bx - 5.6, by - 6.4, 11.2, 11.4, P.woodL, 1.8) + pa(`M${n(bx - 5.6)},${n(by - 6.4)} l1.8,-2.2 l2,2 l1.8,-2.2 l2,2 l1.8,-2 l2,2.2`, P.woodL) + ci(bx - 2, by - 8, 2.2, '#9c6a3a') + ci(bx + 2.2, by - 9, 2.2, '#9c6a3a') + nci(bx - 2.6, by - 8.6, 0.5, INK) + nci(bx + 1.8, by - 9.6, 0.5, INK) + nci(bx + 2.8, by - 8.4, 0.5, INK) + ln(`M${n(bx - 3)},${n(by - 1)} h6 M${n(bx - 3)},${n(by + 1.6)} h4`, P.woodD, 1);
        hands.B = [bx + (v === 'side' ? 0 : 0), by + 1.6];
        hands.fixB = true;
        break;
      }
      case 'stamp': {
        const sx = v === 'side' ? 40.4 : 7.4;
        const sy = v === 'side' ? sh + 10 : sh + 12.4;
        const top = 10 + lag * 0.4;
        L.mid += rc(sx - 1.5, top + 8, 3, sy - top - 8, P.woodD, 1.2);
        L.mid += rc(sx - 5.6, top, 11.2, 7.6, P.red, 2) + nrc(sx - 4.4, top + 1.4, 8.8, 1.4, P.redL, 0.6) + rc(sx - 5.6, top + 7.6, 11.2, 2.8, P.paper, 1) + ci(sx, sy + 0.2, 2.6, s.skin);
        hands.A = [sx, sy];
        hands.fixA = true;
        break;
      }
      case 'stack': {
        const base: Pt = v === 'side' ? [31, sh + 4.4] : v === 'front' ? [24 + G.hw + 3.2, sh + 3.2] : [24 + G.hw + 3.2, sh + 3.2];
        hands.B = base;
        hands.fixB = true;
        const cols = [P.blueL, P.paper, P.pinkL, P.yellow, P.tealL, P.paper2, P.orange];
        const sx = base[0] + (r.lag ? r.lag * 0.5 : 0);
        let out = '';
        for (let i = 0; i < 7; i++) {
          const jx = i % 2 ? 1.2 : -1;
          out += rc(sx - 7 + jx + (i > 3 ? r.sway * (i - 3) * 0.5 : 0), base[1] - 3 - i * 3.5 + lag * (i * 0.12), 14, 3.5, cols[i] ?? P.paper, 0.8);
        }
        L.top += out;
        break;
      }
      case 'phone': {
        const f = v === 'front';
        const px = v === 'side' ? 33.6 : 24;
        const py = v === 'side' ? sh + 6 : sh + 11.4;
        if (v === 'back') break;
        hands.A = f ? [24 - 5.6, sh + 14] : [px - 1, py + 3];
        hands.B = f ? [24 + 5.6, sh + 14] : [px - 1, py + 3];
        hands.fixA = true;
        hands.fixB = true;
        if (f) L.top += fx(`M${n(px - 3.4)},${n(py - 6)} L${n(px - 7)},${n(py - 14)} L${n(px + 7)},${n(py - 14)} L${n(px + 3.4)},${n(py - 6)}Z`, '#bff3ee', 0.75) + rc(px - 3.6, py - 6.4, 7.2, 11, INK2, 1.6) + nrc(px - 2.4, py - 5.2, 4.8, 8, P.tealL, 0.8);
        else L.top += fx(`M${n(px - 1.8)},${n(py - 4.8)} L${n(px - 5)},${n(py - 13)} L${n(px - 12)},${n(py - 10)} L${n(px - 4)},${n(py + 3)}Z`, '#bff3ee', 0.75) + rc(px - 2, py - 5.6, 4.6, 10, INK2, 1.6) + nrc(px - 1.2, py - 4.4, 2.6, 7.8, P.tealL, 0.8);
        break;
      }
      case 'camera': {
        if (v === 'back') break;
        const px = v === 'side' ? 32 : 24;
        const py = sh + 9.4;
        hands.A = v === 'side' ? [px - 2, py + 2] : [24 - 7.2, py + 3];
        hands.B = v === 'side' ? [px - 2, py + 2] : [24 + 7.2, py + 3];
        hands.fixA = hands.fixB = true;
        L.top += (v === 'side' ? rc(px - 4.6, py - 4, 9.4, 8, INK2, 1.6) + ci(px + 4.8, py, 3.2, P.steelL) + ci(px + 4.8, py, 1.4, INK) + rc(px - 3, py - 5.6, 3.6, 2, P.yellow, 0.8) : rc(px - 7, py - 4, 14, 8.4, INK2, 1.8) + ci(px, py + 0.4, 3.6, P.steelL) + ci(px, py + 0.4, 1.7, INK) + rc(px + 3.4, py - 5.6, 3.6, 2, P.yellow, 0.8) + nrc(px - 5.6, py - 2.6, 3, 1.2, P.red, 0.4));
        break;
      }
      case 'coffee': {
        const [hx, hy] = hands.B;
        const cx = v === 'side' ? 30 : hx;
        const cy = v === 'side' ? sh + 8 : hy - 2.4;
        if (v === 'side') {
          hands.A = [30, sh + 11];
          hands.fixA = true;
        }
        L.mid += rc(cx - 3.4, cy - 4.6, 6.8, 8, P.paper, 1.4) + nrc(cx - 3, cy - 1.4, 6, 2.8, P.orange, 0) + rc(cx - 3.8, cy - 6, 7.6, 2, INK2, 0.9) + ln(`M${n(cx - 1.4)},${n(cy - 7.6)} q1,-1.6 0,-3 M${n(cx + 1.4)},${n(cy - 7.6)} q1,-1.6 0,-3`, P.steelL, 1);
        if (v !== 'side') {
          hands.B = [hx, hy - 1.6];
          hands.fixB = true;
        }
        break;
      }
      case 'baguette': {
        const [hx, hy] = hands.B;
        const bx = v === 'side' ? 30.4 : hx;
        const by = v === 'side' ? sh + 12 : hy;
        L.mid += `<path d="M${n(bx - 1.6)},${n(by - 2)} L${n(bx + 4)},${n(by - 16)}" fill="none" stroke="${INK}" stroke-width="6.2"/><path d="M${n(bx - 1.6)},${n(by - 2)} L${n(bx + 4)},${n(by - 16)}" fill="none" stroke="${P.sandD}" stroke-width="3"/>` + ln(`M${n(bx + 0.4)},${n(by - 7.4)} l1.4,0.6 M${n(bx + 1.8)},${n(by - 11)} l1.4,0.6`, P.woodD, 0.9) + rc(bx - 5, by - 5.6, 10, 11, P.woodL, 1.6) + ln(`M${n(bx - 3)},${n(by)} h6`, P.woodD, 1);
        hands.B = [bx, by + 1];
        hands.fixB = true;
        break;
      }
      case 'board': {
        if (v === 'front') L.under += rc(24 + G.hw - 0.4, sh + 2, 4.6, 17, P.orange, 2) + nci(24 + G.hw + 1.9, sh + 5, 0.9, P.paper) + nci(24 + G.hw + 1.9, sh + 15.8, 0.9, P.paper) + nrc(24 + G.hw + 0.4, sh + 8, 3, 1.4, P.yellow, 0.4);
        else if (v === 'back') L.under += rc(24 + G.hw - 0.4, sh + 2, 4.6, 17, P.orange, 2) + nrc(24 + G.hw + 0.4, sh + 8, 3, 1.4, P.yellow, 0.4);
        else L.under += rc(14, sh + 8.6, 18, 4, P.orange, 1.8) + ci(17.6, sh + 14, 1.5, P.paper) + ci(28.6, sh + 14, 1.5, P.paper);
        hands.fixB = true;
        break;
      }
      case 'chess': {
        const cx = v === 'side' ? 25 : 24 + G.hw - 1.2;
        const cy = sh + 3;
        const sq = (x: number, y: number, c: string): string => nrc(cx + x, cy + y, 3.2, 3.2, c, 0.2);
        const board = rc(cx, cy, 6.4, 13, P.paper, 1.2) + sq(0, 0, INK2) + sq(3.2, 3.2, INK2) + sq(0, 6.4, INK2) + sq(3.2, 9.6, INK2);
        if (v === 'back') L.under += rc(cx, cy, 6.4, 13, P.woodD, 1.2);
        else L.under += board;
        hands.fixB = true;
        break;
      }
      case 'gpu': {
        const [hx, hy] = hands.B;
        const gx = v === 'side' ? 31.6 : 24 + G.hw - 0.6;
        const gy = v === 'side' ? sh + 8.6 : sh + 9.4;
        if (v === 'back') {
          hands.fixB = true;
          break;
        }
        hands.B = v === 'side' ? [29, sh + 11.4] : [gx + 1.4, sh + 12.4];
        hands.fixB = true;
        void hx;
        void hy;
        L.mid += rc(gx - 7, gy - 4.4, 14, 8.8, P.tealD, 1.8) + ci(gx - 2.6, gy, 2.8, INK2) + ci(gx + 3, gy, 2.8, INK2) + nci(gx - 2.6, gy, 1, P.paper) + nci(gx + 3, gy, 1, P.paper) + rc(gx - 6, gy + 4.4, 12, 1.8, P.yellowD, 0.5);
        break;
      }
      case 'hanger': {
        const [hx, hy] = hands.B;
        const x = v === 'side' ? 31 : hx;
        const y = (v === 'side' ? sh + 11 : hy) - 4;
        hands.B = [x, y + 3.6];
        hands.fixB = true;
        L.mid += ln(`M${n(x)},${n(y + 2)} v-2 q0,-2.4 2.4,-2.4`, INK, 1.4) + pa(`M${n(x - 9)},${n(y + 5)} L${n(x)},${n(y + 1.6)} L${n(x + 9)},${n(y + 5)}Z`, 'none') + rc(x - 7.2, y + 4, 14.4, 12, P.yellow, 2) + nrc(x + 3.6, y + 5, 3, 10, dk(P.yellow, 0.14), 1) + rc(x - 3.6, y + 4, 7.2, 3, lt(P.yellow, 0.4), 1.4) + nrc(x - 2.6, y + 10, 5.2, 1.2, P.pink, 0.5);
        break;
      }
      case 'ladle': {
        const [hx, hy] = hands.B;
        const x = v === 'side' ? 30 : hx;
        const y = v === 'side' ? sh + 11 : hy;
        L.mid += ln(`M${n(x)},${n(y + 2)} L${n(x + 1)},${n(y - 13)}`, INK, 3.4) + ln(`M${n(x)},${n(y + 2)} L${n(x + 1)},${n(y - 13)}`, P.wood, 1.6) + el(x + 1, y - 15, 3.6, 2.6, P.steelL);
        if (v === 'side') {
          hands.A = [x, y];
          hands.fixA = true;
        } else hands.fixB = true;
        break;
      }
      case 'jazz': {
        const raise = r.odd ? -0.8 : 0;
        const up = (sx: number, dir: number): Pt => [sx + dir * 7.4, sh + 4.4 + raise];
        if (v === 'side') {
          hands.A = [30, sh + 5 + raise];
          hands.B = [27, sh + 6 + raise];
        } else {
          hands.A = up(24 - G.hw, -1);
          hands.B = up(24 + G.hw, 1);
        }
        hands.fixA = hands.fixB = true;
        hands.big = true;
        const f = (p: Pt): string => ci(p[0] - 2.2, p[1] - 3.4, 1.3, s.skin) + ci(p[0], p[1] - 4.2, 1.3, s.skin) + ci(p[0] + 2.2, p[1] - 3.4, 1.3, s.skin);
        L.under += f(hands.A) + f(hands.B);
        break;
      }
    }
  }
}

// ---------------------------------------------------------------- back-packs
function pack(c: Ctx): { behind: string; front: string } {
  const { s, v, r, G } = c;
  if (!s.pack) return { behind: '', front: '' };
  const { kind, c: pc, c2 } = s.pack;
  const sh = G.sh;
  const ly = r.lag * 0.7;
  const sx = r.sway * -1.2;
  if (kind === 'bag') {
    if (v === 'front') return { behind: '', front: nrc(24 - G.hw + 1.8, sh - 0.4, 3.2, 13, c2, 1.4) + nrc(24 + G.hw - 5, sh - 0.4, 3.2, 13, c2, 1.4) + rc(24 - G.hw + 0.4, sh - 3.4, 6, 4, pc, 2) + rc(24 + G.hw - 6.4, sh - 3.4, 6, 4, pc, 2) };
    if (v === 'back') return { behind: '', front: rc(14, sh - 1 + ly, 20, 18, pc, 4.6) + rc(16.4, sh + 8.4 + ly, 15.2, 6.6, c2, 2) + nrc(21, sh + 1.4 + ly, 6, 1.4, lt(pc, 0.4), 0.6) };
    return { behind: rc(10.6 + sx, sh + 0.6 + ly, 10.4, 16, pc, 3.6) + rc(11.6 + sx, sh + 9.4 + ly, 6.6, 5.6, c2, 1.8), front: ln(`M22.5,${sh + 1.6} L21,${sh + 10}`, c2, 2) };
  }
  if (kind === 'messenger' || kind === 'tote') {
    const hip = G.hip;
    const hw = G.hw;
    const strap = (d: string, w: number): string => ln(d, INK, w + 1.8) + ln(d, c2, w);
    const sticker = (cx: number, cy: number): string =>
      ci(cx, cy, 2.3, P.yellow) + nrc(cx - 1.1, cy - 0.1, 2.2, 1.6, INK, 0.3) + ln(`M${n(cx - 0.6)},${n(cy - 0.1)} v-0.8 q0.6,-0.9 1.2,-0.1`, INK, 0.55);
    if (kind === 'messenger') {
      if (v === 'front') return { behind: '', front: strap(`M${n(24 - hw + 3)},${sh - 1} L${n(24 + hw - 0.6)},${hip - 1}`, 2.2) + rc(24 + hw - 8.4, hip - 3.4, 9, 7.6, pc, 1.6) + rc(24 + hw - 8.4, hip - 3.4, 9, 3.4, c2, 1.4) + nrc(24 + hw - 4.8, hip - 0.4, 1.8, 1.4, P.yellow, 0.4) };
      if (v === 'back') return { behind: '', front: strap(`M${n(24 + hw - 3)},${sh - 1} L${n(24 - hw + 0.6)},${hip - 1}`, 2.2) + rc(24 - hw - 0.6, hip - 3.4 + ly, 9, 7.6, pc, 1.6) + rc(24 - hw - 0.6, hip - 3.4 + ly, 9, 3.4, c2, 1.4) };
      return { behind: '', front: strap(`M23,${sh - 1} L${n(26 + sx)},${hip - 1}`, 2.2) + rc(22 + sx, hip - 3.2 + ly, 8.6, 7.6, pc, 1.6) + rc(22 + sx, hip - 3.2 + ly, 8.6, 3.2, c2, 1.4) + nrc(25.6 + sx, hip - 0.2 + ly, 1.8, 1.4, P.yellow, 0.4) };
    }
    if (v === 'front') return { behind: '', front: strap(`M${n(24 - hw + 3.6)},${sh - 1.4} L${n(24 - hw + 1.2)},${hip - 1}`, 1.6) + rc(24 - hw - 4.2, hip - 1 + ly, 10.8, 12, pc, 1.4) + nrc(24 - hw - 4.2, hip - 1 + ly, 10.8, 1.8, c2, 0.6) + sticker(24 - hw + 1.2, hip + 5 + ly) };
    if (v === 'back') return { behind: '', front: strap(`M${n(24 + hw - 3.6)},${sh - 1.4} L${n(24 + hw - 1.2)},${hip - 1}`, 1.6) + rc(24 + hw - 6.6, hip - 1 + ly, 10.8, 12, pc, 1.4) + nrc(24 + hw - 6.6, hip - 1 + ly, 10.8, 1.8, c2, 0.6) };
    return { behind: '', front: strap(`M23,${sh - 1.4} L${n(24 + sx)},${hip - 1}`, 1.6) + rc(19.4 + sx, hip - 1 + ly, 9.6, 12, pc, 1.4) + nrc(19.4 + sx, hip - 1 + ly, 9.6, 1.8, c2, 0.6) + sticker(24.2 + sx, hip + 5 + ly) };
  }
  // cube delivery bag
  if (v === 'front') return { behind: rc(10.2 + sx, sh - 3.4 + ly, 27.6, 20, pc, 3) + nrc(11.6, sh - 2.4 + ly, 24.8, 2.2, lt(pc, 0.4), 1), front: nrc(24 - G.hw + 1.6, sh, 3, 12, dk(pc, 0.3), 1.2) + nrc(24 + G.hw - 4.6, sh, 3, 12, dk(pc, 0.3), 1.2) };
  if (v === 'back') return { behind: '', front: rc(10.4, sh - 4.4 + ly, 27.2, 23, pc, 3.4) + nrc(11.8, sh - 3.4 + ly, 24.4, 2.4, lt(pc, 0.42), 1) + rc(18.4, sh + 4.4 + ly, 11.2, 9, c2, 1.6) + nrc(20.4, sh + 6.2 + ly, 7.2, 1.6, P.paper, 0.6) + nrc(20.4, sh + 9.2 + ly, 4.4, 1.6, P.paper, 0.6) };
  return { behind: rc(6.4 + sx, sh - 4.4 + ly, 14, 22, pc, 3.4) + nrc(7.6 + sx, sh - 3.4 + ly, 11.6, 2.4, lt(pc, 0.42), 1) + rc(8.4 + sx, sh + 4.4 + ly, 6.4, 8, c2, 1.4), front: ln(`M22.4,${sh + 1.6} L20,${sh + 11}`, dk(pc, 0.3), 2) };
}

// ---------------------------------------------------------------- compose
function body(s: Spec, v: CharView, frame: number): string {
  const r = mkRig(v, frame);
  const G = geo(s);
  const c: Ctx = { s, v, r, G };
  const of = outfit(c);
  const hands = defaultHands(c);
  const L: Layers = { behind: '', under: '', mid: '', top: '' };
  addProps(c, hands, L);
  const pk = pack(c);
  const am = arms(c, hands, of.sleeve);
  let o = '';
  o += L.behind;
  o += legs(c);
  if (of.hem && !of.hemOverLegs) o += of.hem;
  if (of.hem && of.hemOverLegs) o += of.hem;
  let up = '';
  up += pk.behind;
  up += of.hoodBack;
  up += am.far;
  up += of.torso;
  up += neckItems(c);
  up += pk.front;
  up += L.under;
  up += am.near;
  up += L.mid;
  up += head(c);
  up += L.top;
  const tiltPivot = `${at(v, 24, 24, 23)} ${G.hip}`;
  o += `<g transform="translate(0 ${n(r.bob)}) rotate(${n(r.tilt)} ${tiltPivot})">${up}</g>`;
  return o;
}

const SHADOW = P.blueD;
function sprite(s: Spec, v: CharView, frame: number): string {
  const inner = body(s, v, frame);
  let shadow = inner
    .replace(/<path data-fx="1"[^>]*\/>/g, '')
    .replace(/ (?:fill-)?opacity="[^"]*"/g, '')
    .replace(/(fill|stroke)="#[0-9a-fA-F]{6}"/g, `$1="${SHADOW}"`);
  shadow = `<g transform="translate(2.6 1.8)" stroke="${SHADOW}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${shadow}</g>`;
  const sc = s.scale && s.scale !== 1 ? ` transform="translate(24 60) scale(${s.scale}) translate(-24 -60)"` : '';
  const main = `<g stroke="${INK}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${inner}</g>`;
  return svgDoc(CHAR_W, CHAR_H, `<g transform="translate(0 ${YOFF})"><g${sc}>${shadow}${main}</g></g>`);
}

// ---------------------------------------------------------------- v0.4/v0.5 customisable player
interface Opt { id: string; label: string }
export const HAIR_STYLES: { id: string; label: string; body?: 'masc' | 'fem' }[] = [
  { id: 'short', label: 'Courts' },
  { id: 'messy', label: 'Ébouriffés' },
  { id: 'curly', label: 'Bouclés' },
  { id: 'afro', label: 'Afro' },
  { id: 'quiff', label: 'Banane' },
  { id: 'slick', label: 'Plaqués' },
  { id: 'spiky', label: 'En pics' },
  { id: 'side', label: 'Raie de côté' },
  { id: 'bald', label: 'Rasés' },
  { id: 'long', label: 'Longs' },
  { id: 'bob', label: 'Carré' },
  { id: 'pony', label: 'Queue de cheval' },
  { id: 'bun', label: 'Chignon' },
  { id: 'pigtails', label: 'Couettes' },
  { id: 'wild', label: 'Sauvages' },
  { id: 'mohawk', label: 'Crête' },
  { id: 'bowl', label: 'Champignon' },
  { id: 'spacebuns', label: 'Macarons' },
];
/** Legacy single-slot accessory (v0.4 saves). New looks use `headwear` + `glasses`; kept so old saves and callers still resolve. */
export const ACCESSORIES: Opt[] = [
  { id: 'none', label: 'Aucun' },
  { id: 'headphones', label: 'Casque' },
  { id: 'cap', label: 'Casquette' },
  { id: 'glasses', label: 'Lunettes' },
  { id: 'beanie', label: 'Bonnet' },
  { id: 'bandana', label: 'Bandana' },
];
export const EYES: Opt[] = [{ id: 'dot', label: 'Ronds' }, { id: 'big', label: 'Grands' }, { id: 'lids', label: 'Mi-clos' }, { id: 'down', label: 'Baissés' }];
export const BROWS: Opt[] = [{ id: 'none', label: 'Discrets' }, { id: 'flat', label: 'Droits' }, { id: 'raised', label: 'Haussés' }, { id: 'angry', label: 'Froncés' }];
export const MOUTHS: Opt[] = [{ id: 'smile', label: 'Sourire' }, { id: 'grin', label: 'Grand sourire' }, { id: 'smirk', label: 'En coin' }];
export const FACIALS: Opt[] = [{ id: 'none', label: 'Rasé' }, { id: 'stubble', label: 'Barbe de 3 jours' }, { id: 'beard', label: 'Barbe' }, { id: 'mustache', label: 'Moustache' }];
export const GLASSES: Opt[] = [{ id: 'none', label: 'Aucune' }, { id: 'round', label: 'Rondes' }, { id: 'square', label: 'Carrées' }, { id: 'sunglasses', label: 'Solaires' }, { id: 'visor', label: 'Visière' }];
export const HEADWEARS: Opt[] = [
  { id: 'none', label: 'Rien' }, { id: 'cap', label: 'Casquette' }, { id: 'beanie', label: 'Bonnet' }, { id: 'bucket', label: 'Bob' },
  { id: 'headphones', label: 'Casque audio' }, { id: 'bandana', label: 'Bandana' }, { id: 'hood', label: 'Capuche' },
];
export const OUTFITS: Opt[] = [
  { id: 'hoodie', label: 'Sweat à capuche' }, { id: 'bomber', label: 'Bomber' }, { id: 'overshirt', label: 'Tee + surchemise' },
  { id: 'tracksuit', label: 'Survêtement' }, { id: 'labcoat', label: 'Blouse de labo' }, { id: 'dress', label: 'Robe' }, { id: 'overalls', label: 'Salopette' },
];
export const LOWERS: Opt[] = [{ id: 'pants', label: 'Pantalon' }, { id: 'shorts', label: 'Short' }, { id: 'skirt', label: 'Jupe' }];
export const PATTERNS: Opt[] = [{ id: 'plain', label: 'Uni' }, { id: 'stripes', label: 'Rayures' }, { id: 'logo', label: 'Logo </>' }, { id: 'split', label: 'Bichromie riso' }];
export const BAGS: Opt[] = [{ id: 'none', label: 'Aucun' }, { id: 'backpack', label: 'Sac à dos' }, { id: 'messenger', label: 'Besace' }, { id: 'tote', label: 'Tote « open weights »' }];
export const SKIN_TONES: string[] = ['#fbdcc8', '#f6cfa6', '#e9b98e', '#d9a06f', '#bb7a50', '#94603e', '#70442c', '#4a2e22'];
export const HAIR_COLORS: string[] = ['#2b2236', '#4a2f27', '#8a5a35', '#f2c94c', '#d9502a', '#ff48b0', '#0078bf', '#d8d4e0'];
export const OUTFIT_COLORS: string[] = [P.orange, P.pink, P.yellow, P.teal, P.blue, P.red, P.purple, P.ink2, P.paper2, P.leafD];
export const SHOE_COLORS: string[] = [P.paper, P.ink, P.red, P.orange, P.yellow, P.teal, P.blue, P.pink];
export const DEFAULT_APPEARANCE: Required<PlayerAppearance> = {
  body: 'masc', skin: '#f6cfa6', hairStyle: 'messy', hairColor: '#4a2f27', top: P.orange, bottom: P.ink2, accessory: 'none',
  eyes: 'dot', brows: 'none', mouth: 'smile', facial: 'none', glasses: 'none', headwear: 'headphones',
  outfit: 'hoodie', lower: 'pants', pattern: 'plain', shoes: P.paper, bag: 'backpack',
};

const HEX = /^#[0-9a-f]{6}$/i;
const hasStyle = (id: string): boolean => HAIR_STYLES.some((x) => x.id === id);
const oneOf = (v: unknown, xs: readonly Opt[], d: string): string => (typeof v === 'string' && xs.some((x) => x.id === v) ? v : d);
/** Fills holes and unknown ids (old v0.4 saves, hand-edited JSON) with safe values. Idempotent. */
export function normalizeAppearance(a: Partial<PlayerAppearance> | undefined): Required<PlayerAppearance> {
  const D = DEFAULT_APPEARANCE;
  const body = a?.body === 'fem' ? 'fem' : 'masc';
  const hex = (v: string | undefined, d: string): string => (typeof v === 'string' && HEX.test(v) ? v : d);
  const acc = a?.accessory;
  // v0.4 saves had one `accessory` slot: map it onto the new headwear/glasses fields when those are absent
  const legacyHead = acc === 'headphones' || acc === 'cap' || acc === 'beanie' || acc === 'bandana' ? acc : 'none';
  const headwear = oneOf(a?.headwear ?? (acc === undefined ? D.headwear : legacyHead), HEADWEARS, 'none');
  const glasses = oneOf(a?.glasses ?? (acc === 'glasses' ? 'round' : D.glasses), GLASSES, 'none');
  const outfit = oneOf(a?.outfit ?? (body === 'fem' ? 'bomber' : D.outfit), OUTFITS, D.outfit);
  return {
    body,
    skin: hex(a?.skin, D.skin),
    hairStyle: a?.hairStyle && hasStyle(a.hairStyle) ? a.hairStyle : body === 'fem' ? 'long' : 'messy',
    hairColor: hex(a?.hairColor, D.hairColor),
    top: hex(a?.top, D.top),
    bottom: hex(a?.bottom, D.bottom),
    accessory: 'none',
    eyes: oneOf(a?.eyes, EYES, D.eyes),
    brows: oneOf(a?.brows, BROWS, D.brows),
    mouth: oneOf(a?.mouth, MOUTHS, D.mouth),
    facial: oneOf(a?.facial, FACIALS, D.facial),
    glasses,
    headwear,
    outfit,
    lower: oneOf(a?.lower ?? (body === 'fem' && a?.outfit === undefined ? 'skirt' : D.lower), LOWERS, D.lower),
    pattern: oneOf(a?.pattern, PATTERNS, D.pattern),
    shoes: hex(a?.shoes, D.shoes),
    bag: oneOf(a?.bag, BAGS, D.bag),
  };
}

const TALL_HAIR: readonly string[] = ['spiky', 'messy', 'quiff', 'afro', 'curly', 'slick', 'side', 'bun', 'wild', 'mohawk', 'spacebuns'];
const GLASS_MAP: Record<string, Glasses> = { round: 'round', square: 'thin', sunglasses: 'shades', visor: 'visor' };
const BAG_MAP: Record<string, Spec['pack']> = {
  backpack: { kind: 'bag', c: P.teal, c2: P.tealD },
  messenger: { kind: 'messenger', c: '#8a6a4a', c2: '#5e4630' },
  tote: { kind: 'tote', c: P.paper2, c2: P.paper3 },
};
function specFromAppearance(raw: Partial<PlayerAppearance> | undefined): Spec {
  const a = normalizeAppearance(raw);
  const fem = a.body === 'fem';
  const hatty = ['cap', 'beanie', 'bucket', 'hood'].includes(a.headwear);
  // a hat flattens tall hair; long hair keeps hanging below it
  const style = (hatty && TALL_HAIR.includes(a.hairStyle) ? 'short' : a.hairStyle) as Hair;
  const s: Spec = {
    skin: a.skin, hair: a.hairColor, hairStyle: style, top: a.top, pants: a.bottom, shoes: a.shoes, hw: fem ? 9.2 : 10.6, lash: fem,
    eyes: a.eyes as Eyes, brows: a.brows as Brows, mouth: a.mouth as Mouth, pattern: a.pattern,
  };
  if (BAG_MAP[a.bag]) s.pack = BAG_MAP[a.bag];
  const g = GLASS_MAP[a.glasses];
  if (g) s.glasses = g;
  if (a.facial !== 'none') {
    s.beard = a.facial === 'beard' ? 'short' : (a.facial as Beard);
    s.beardC = a.hairColor;
  }
  switch (a.headwear) {
    case 'headphones': s.hat = 'headphones'; s.hatC = P.ink2; break;
    case 'cap': case 'beanie': case 'bucket': case 'bandana': case 'hood': s.hat = a.headwear as Hat; s.hatC = a.top; s.hatC2 = dk(a.top, 0.3); break;
  }
  switch (a.outfit) {
    case 'bomber': Object.assign(s, { outfit: 'bomber', coat: a.top }); break;
    case 'overshirt': Object.assign(s, { outfit: 'overshirt', coat: a.top }); break;
    case 'tracksuit': Object.assign(s, { outfit: 'tracksuit', coat: a.top, legStripe: lum(a.bottom) > 0.5 ? INK2 : P.paper }); break;
    case 'labcoat': Object.assign(s, { outfit: 'labcoat', coat: lt(a.top, 0.82) }); break;
    case 'dress': Object.assign(s, { outfit: 'dress', short: true }); break;
    case 'overalls': Object.assign(s, { outfit: 'overalls' }); break;
    default: s.outfit = 'hoodie';
  }
  if (a.outfit !== 'dress' && a.outfit !== 'overalls') {
    if (a.lower === 'shorts') s.lower = 'shorts';
    else if (a.lower === 'skirt') Object.assign(s, { lower: 'skirt', lowerC: a.bottom, pants: dk(a.bottom, 0.28) });
  }
  if (s.outfit === 'tracksuit') s.legStripe = s.lower === 'shorts' || s.lower === 'skirt' ? undefined : s.legStripe;
  return s;
}

// ---------------------------------------------------------------- the cast
const SPECS: Record<string, Spec> = {
  player: specFromAppearance(DEFAULT_APPEARANCE),
  mom: { skin: SKINS.fair, hair: '#9c4a2a', hairStyle: 'bun', top: P.teal, apron: P.paper, pants: P.ink3, shoes: P.pinkL, mouth: 'smile' },
  kevin: { skin: SKINS.fair, hair: '#e8402e', hairStyle: 'spiky', top: P.yellow, coat: INK2, outfit: 'jacket', pants: P.blueD, shoes: P.red, glasses: 'shades', mouth: 'smirk' },
  lecube: { skin: '#f3d3b4', hair: '#c8c6d4', hairStyle: 'side', top: '#2d3a6b', coat: P.paper, outfit: 'labcoat', pants: INK2, glasses: 'round', brows: 'raised', mouth: 'smirk', shoes: P.steelD },
  kartpathy: { skin: SKINS.light, hair: '#5b3b2a', hairStyle: 'short', top: P.steelL, pants: INK2, shoes: P.paper, beard: 'stubble', beardC: '#5b3b2a', props: ['laptop'], mouth: 'smile', brows: 'flat' },
  nurse_hugging: { skin: P.yellow, hair: P.pinkL, hairStyle: 'long', top: P.pinkL, pants: P.paper, shoes: P.paper2, lower: 'skirt', lowerC: P.paper, hat: 'nurse', hatC: P.red, neck: ['pendant'], props: ['jazz'], mouth: 'grin', eyes: 'big' },
  clerk: { skin: SKINS.mid, hair: '#2b2236', hairStyle: 'short', top: P.paper, coat: P.teal, outfit: 'vest', pants: INK2, hat: 'visor', hatC: P.teal, neck: ['lanyard'], neckC: P.pink, mouth: 'smile', trim: P.orange },
  gourou: { skin: '#f3d3b4', hair: P.paper, hairStyle: 'bald', top: P.purple, coat: P.purple, outfit: 'robe', trim: P.yellow, pants: P.purpleD, shoes: P.yellowD, glasses: 'shades', beard: 'full', beardC: P.paper, neck: ['pendant'], mouth: 'grin' },
  agent_conformite: { skin: '#e9c9a9', hair: INK, hairStyle: 'slick', top: P.paper, coat: P.steel, outfit: 'suit', trim: P.red, pants: P.steelD, shoes: INK, glasses: 'shades', props: ['briefcase'], brows: 'flat', mouth: 'flat' },
  nadelta: { skin: '#b9784f', hair: '#3a3550', hairStyle: 'bald', top: P.paper, coat: P.blue, outfit: 'jacket', pants: INK2, shoes: INK, glasses: 'thin', mouth: 'smile', brows: 'raised' },
  kid: { skin: SKINS.fair, hair: '#3b2a1f', hairStyle: 'short', top: P.yellow, pants: P.blue, shoes: P.red, hat: 'cap', hatC: P.red, scale: 0.86, hs: 1.08, eyes: 'big', mouth: 'grin' },
  scientist: { skin: SKINS.light, hair: '#e9e1d0', hairStyle: 'wild', top: P.blueL, coat: P.paper, outfit: 'labcoat', pants: INK2, glasses: 'goggles', mouth: 'grin', brows: 'raised' },
  sailor: { skin: SKINS.tan, hair: '#d9642a', hairStyle: 'short', top: P.blueD, outfit: 'stripes', pants: P.blueD, shoes: INK, hat: 'sailor', hatC: P.blue, beard: 'full', beardC: '#d9642a', mouth: 'smile', brows: 'flat' },
  stagiaire: { skin: SKINS.light, hair: '#6b4a38', hairStyle: 'messy', top: P.paper2, pants: P.steelD, shoes: INK2, glasses: 'round', neck: ['lanyard'], neckC: P.red, props: ['coffee'], eyes: 'lids', tired: true, mouth: 'flat' },
  vibeur_a: { skin: SKINS.tan, hair: '#2b2236', hairStyle: 'short', top: P.leaf, outfit: 'hoodie', pants: INK2, shoes: P.paper, hat: 'beanie', hatC: P.pink, mouth: 'grin' },
  vibeur_b: { skin: SKINS.fair, hair: '#f2c94c', hairStyle: 'long', top: P.purple, coat: P.purpleL, outfit: 'jacket', pants: INK, shoes: P.pink, glasses: 'shades', mouth: 'smirk' },

  // v0.3 cast
  guard_aiact: { skin: SKINS.mid, hair: INK, hairStyle: 'short', top: '#4a4660', coat: P.steelL, outfit: 'vest', trim: P.red, pants: '#3a3550', shoes: INK, hat: 'guardcap', hatC: P.steel, props: ['torch'], brows: 'angry', mouth: 'flat', hw: 10.6 },
  guard_aiact_2: { skin: SKINS.tan, hair: '#2b2236', hairStyle: 'bun', top: '#4a4660', coat: P.steel, outfit: 'jacket', pants: '#3a3550', shoes: INK, props: ['radio'], brows: 'flat', mouth: 'flat', leg: 13, hw: 9.4, eyes: 'dot' },
  inspector_cookie: { skin: '#f3d3b4', hair: '#3a3550', hairStyle: 'slick', top: P.paper, coat: '#d8b98a', outfit: 'trench', pants: '#6b5a3a', shoes: '#6b4a38', glasses: 'round', beard: 'mustache', beardC: '#3a3550', props: ['cookies'], brows: 'raised', mouth: 'flat' },
  greffiere_article52: { skin: SKINS.mid, hair: '#2b2236', hairStyle: 'bob', top: P.paper, coat: P.lav, outfit: 'cardigan', lower: 'pencil', lowerC: INK2, pants: INK2, shoes: INK, glasses: 'thin', props: ['stack'], pen: true, brows: 'worried', mouth: 'flat' },
  directrice_moratoire: { skin: '#f3d3b4', hair: '#4b4a5c', hairStyle: 'bun', top: P.paper, coat: '#4b4a5c', outfit: 'blazer', lower: 'pencil', lowerC: '#4b4a5c', pants: INK2, shoes: INK, glasses: 'thin', props: ['stamp'], brows: 'angry', mouth: 'flat', hw: 10.8, leg: 11 },
  jensen_cuir: { skin: SKINS.mid, hair: '#8f95a6', hairStyle: 'slick', top: '#2c2840', coat: '#2c2840', outfit: 'leather', pants: INK2, shoes: INK, props: ['gpu'], brows: 'raised', mouth: 'grin', hw: 10.4 },
  clem_delangouste: { skin: SKINS.light, hair: '#6b4a38', hairStyle: 'short', top: P.yellow, outfit: 'smiley', pants: P.blueD, shoes: P.paper, beard: 'short', beardC: '#5b3b2a', mouth: 'grin', brows: 'raised', hw: 10.4 },
  menschtral: { skin: SKINS.fair, hair: '#6b4a38', hairStyle: 'messy', top: P.paper, coat: P.paper, outfit: 'jacket', pants: P.blueD, shoes: P.paper2, hat: 'beret', hatC: P.orange, hatC2: P.orangeD, brows: 'raised', mouth: 'smirk', hw: 10.2 },
  hassabyte: { skin: SKINS.light, hair: '#2b2236', hairStyle: 'short', top: '#2f3a52', outfit: 'tee', pants: INK2, shoes: INK, props: ['chess'], brows: 'flat', mouth: 'smile', hw: 10.2 },
  zuckerbot: { skin: SKINS.fair, hair: '#6b4a38', hairStyle: 'curly', top: P.steelL, outfit: 'tee', pants: P.steelD, shoes: P.paper2, neck: ['pendant'], mouth: 'flat', brows: 'flat', hw: 10.4 },
  resistance_dev: { skin: SKINS.brown, hair: '#2b2236', hairStyle: 'short', top: P.leafD, outfit: 'hoodie', pants: '#6b6a4a', shoes: INK, hat: 'bandana', hatC: P.red, pack: { kind: 'bag', c: P.orange, c2: P.orangeD }, brows: 'angry', mouth: 'grin', trim: P.yellow },
  chef: { skin: SKINS.mid, hair: '#4a2f27', hairStyle: 'short', top: P.paper, coat: P.paper, outfit: 'chef', trim: P.red, pants: '#4a4660', shoes: INK, hat: 'toque', beard: 'mustache', beardC: '#4a2f27', props: ['ladle'], mouth: 'grin', hw: 11.8, leg: 9, brows: 'raised' },
  fashion_clerk: { skin: SKINS.brown, hair: P.purpleL, hairStyle: 'quiff', top: P.tealL, outfit: 'hoodie', pants: P.paper2, shoes: P.pink, glasses: 'pink', neck: ['tape'], props: ['hanger'], brows: 'raised', mouth: 'smirk', hw: 11.2 },
  barista: { skin: SKINS.deep, hair: '#2b2236', hairStyle: 'pony', top: P.paper, apron: P.woodD, pants: INK2, shoes: P.paper, props: ['coffee'], mouth: 'smile' },
  delivery_rider: { skin: SKINS.tan, hair: INK, hairStyle: 'short', top: P.paper, coat: P.orange, outfit: 'jacket', pants: INK2, shoes: P.paper, hat: 'helmet', hatC: P.orange, hatC2: P.orangeD, pack: { kind: 'cube', c: P.teal, c2: P.pink }, mouth: 'smile', brows: 'flat' },
  tourist: { skin: '#f6cfa6', hair: '#d9a060', hairStyle: 'short', top: P.teal, outfit: 'hawaii', short: true, lower: 'shorts', pants: P.sand, shoes: P.woodD, hat: 'bucket', hatC: P.path, hatC2: P.pink, props: ['camera'], mouth: 'grin', hw: 11.2, brows: 'raised' },
  dev_phone: { skin: SKINS.light, hair: '#4a2f27', hairStyle: 'messy', top: P.ink3, outfit: 'hoodie', pants: INK2, shoes: P.paper, props: ['phone'], eyes: 'down', mouth: 'flat', dip: 9 },
  citizen_a: { skin: SKINS.mid, hair: '#e9e1d0', hairStyle: 'short', top: P.paper, coat: P.grassD, outfit: 'cardigan', pants: '#6b5a3a', shoes: '#6b4a38', hat: 'flatcap', hatC: P.woodD, beard: 'mustache', beardC: '#e9e1d0', props: ['cane'], brows: 'worried', mouth: 'smile', leg: 9, scale: 0.95 },
  citizen_b: { skin: SKINS.fair, hair: '#2b2236', hairStyle: 'pigtails', top: P.paper, coat: P.yellow, outfit: 'rain', pants: INK2, shoes: P.red, eyes: 'big', mouth: 'grin', scale: 0.9 },
  citizen_c: { skin: SKINS.dark, hair: '#2b2236', hairStyle: 'afro', top: P.paper, coat: P.red, outfit: 'jacket', pants: P.blueD, shoes: P.paper, neck: ['phones'], props: ['board'], brows: 'raised', mouth: 'smile' },
  citizen_d: { skin: SKINS.tan, hair: '#7a3a1a', hairStyle: 'curly', top: P.paper, coat: P.teal, outfit: 'cardigan', pants: INK2, shoes: '#6b4a38', neck: ['scarf'], neckC: P.orange, props: ['baguette'], mouth: 'smile', hw: 10.8 },
};

export const CHARACTER_IDS: string[] = Object.keys(SPECS);

export function characterEntries(): ArtEntry[] {
  const out: ArtEntry[] = [];
  for (const [id, spec] of Object.entries(SPECS)) {
    for (const view of CHAR_VIEWS) {
      for (let f = 0; f <= WALK_FRAMES; f++) {
        out.push({ key: charKey(id, view, f), w: CHAR_W, h: CHAR_H, anchorY: CHAR_FEET_Y, svg: sprite(spec, view, f) });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- player exports (contract v0.4)
let lastKey = '';
let lastEntries: ArtEntry[] = [];
/** Same keys as the static 'player' id (char:player:<view>:<frame>), built from the creator's choices. */
export function playerEntries(a: PlayerAppearance = DEFAULT_APPEARANCE): ArtEntry[] {
  const na = normalizeAppearance(a);
  const key = JSON.stringify(na);
  if (key === lastKey) return lastEntries;
  const spec = specFromAppearance(na);
  const out: ArtEntry[] = [];
  for (const view of CHAR_VIEWS) {
    for (let f = 0; f <= WALK_FRAMES; f++) {
      out.push({ key: charKey('player', view, f), w: CHAR_W, h: CHAR_H, anchorY: CHAR_FEET_Y, svg: sprite(spec, view, f) });
    }
  }
  lastKey = key;
  lastEntries = out;
  return out;
}

/** One sprite of any cast member, rendered on demand (intro cinematic, previews). */
export function characterSvg(id: string, view: CharView = 'front', frame = 0): string {
  const spec = SPECS[id] ?? SPECS['player']!;
  return sprite(spec, view, frame);
}

/** The player in a graduation gown and mortarboard (intro cinematic only). */
export function graduateSvg(view: CharView = 'front', frame = 0, a: PlayerAppearance = DEFAULT_APPEARANCE): string {
  const base = specFromAppearance(a);
  const gown: Spec = { ...base, outfit: 'robe', coat: P.ink2, top: P.ink2, trim: P.yellow, lower: undefined, pattern: 'plain', legStripe: undefined, hat: 'mortar', hatC: P.ink2, hatC2: INK, hairStyle: base.hairStyle === 'bald' ? 'bald' : 'short', neck: undefined };
  return sprite(gown, view, frame);
}

/** One sprite of the customised player (creator thumbnails and turntable), without building the whole 15-frame set. */
export function playerSpriteSvg(a: Partial<PlayerAppearance> = DEFAULT_APPEARANCE, view: CharView = 'front', frame = 0): string {
  return sprite(specFromAppearance(a), view, frame);
}

/** 128x128 bust of the customised player (dialogue, menus). Flat riso, ink outline, one blue misregistration layer. */
export function playerPortraitSvg(a: Partial<PlayerAppearance> = DEFAULT_APPEARANCE): string {
  const na = normalizeAppearance(a);
  const s: Spec = { ...specFromAppearance(na), pack: undefined };
  const fem = na.body === 'fem';
  const c: Ctx = { s, v: 'front', r: mkRig('front', 0), G: geo(s) };
  const o = s.outfit ?? 'hoodie';
  const top = o === 'hoodie' || o === 'dress' || o === 'overalls' ? s.top : (s.coat ?? s.top);
  const sw = fem ? 'M14 128 C14 106 34 91 64 91 C94 91 114 106 114 128Z' : 'M8 128 C8 104 30 90 64 90 C98 90 120 104 120 128Z';
  const half = fem ? 'M64 91 C94 91 114 106 114 128 L64 128Z' : 'M64 90 C98 90 120 104 120 128 L64 128Z';
  const bx0 = fem ? 22 : 16;
  let b = '';
  // bag straps sit behind the body details
  if (na.bag === 'backpack') b += pa(`M${fem ? 22 : 18} 128 L${fem ? 33 : 29} 128 L50 96 L41 93Z`, P.tealD) + pa(`M${fem ? 106 : 110} 128 L${fem ? 95 : 99} 128 L78 96 L87 93Z`, P.tealD);
  if (o === 'hoodie') b += pa('M30 96 C30 84 46 80 64 80 C82 80 98 84 98 96Z', dk(top, 0.16));
  b += pa(sw, top);
  if (s.pattern && s.pattern !== 'plain') b += patternMarks(s.pattern, top, { x0: bx0, x1: 128 - bx0, y0: 107, y1: 128, v: 'bust', k: 2.4, split: half });
  const inner = lt(s.top, 0.72);
  switch (o) {
    case 'hoodie':
      b += pa('M42 90 C48 106 80 106 86 90 C80 96 48 96 42 90Z', dk(top, 0.3)) + ln('M52 100 v13 M76 100 v13', P.paper, 2.4) + ci(52, 114, 1.8, P.paper) + ci(76, 114, 1.8, P.paper);
      break;
    case 'bomber':
      b += rc(44, 86, 40, 11, dk(top, 0.28), 5) + ln('M64 97 V128', lt(top, 0.45), 2);
      break;
    case 'overshirt':
      b += pa('M48 90 L64 120 L80 90Z', inner) + pa('M46 88 L60 94 L64 116 L50 100Z', dk(top, 0.12)) + pa('M82 88 L68 94 L64 116 L78 100Z', lt(top, 0.12)) + ln('M48 90 L64 120 L80 90', INK, 2);
      break;
    case 'tracksuit':
      b += rc(46, 86, 36, 12, dk(top, 0.22), 5) + ln('M64 97 V128', P.paper, 2) + ln('M22 108 C20 114 19 121 19 128 M106 108 C108 114 109 121 109 128', P.paper, 3);
      break;
    case 'labcoat':
      b += pa('M50 90 L64 114 L78 90Z', s.top) + pa('M48 88 L64 114 L54 128 L38 104Z', dk(top, 0.1)) + pa('M80 88 L64 114 L74 128 L90 104Z', lt(top, 0.1)) + ln('M48 88 L64 114 L54 128 M80 88 L64 114 L74 128', INK, 2);
      break;
    case 'dress':
      b += pa('M46 90 Q64 120 82 90Z', s.skin) + ln('M46 90 Q64 120 82 90', INK, 2) + rc(56, 122, 16, 6, P.yellow, 1);
      break;
    case 'overalls':
      b += rc(44, 108, 40, 24, s.pants, 3) + pa('M36 98 L48 93 L56 112 L44 112Z', s.pants) + pa('M92 98 L80 93 L72 112 L84 112Z', s.pants) + ci(50, 112, 2, P.yellow) + ci(78, 112, 2, P.yellow);
      break;
  }
  if (na.bag === 'messenger') b += `<path d="M${fem ? 28 : 22} 94 L${fem ? 40 : 34} 92 L${fem ? 100 : 106} 128 L${fem ? 84 : 90} 128Z" fill="#5e4630"/>`;
  if (na.bag === 'tote') b += pa(`M${fem ? 92 : 98} 92 L${fem ? 102 : 108} 99 L${fem ? 104 : 110} 128 L${fem ? 94 : 100} 128Z`, P.paper3);
  const hd = `<g transform="translate(11.2 8) scale(2.2)">${head(c)}</g>`;
  const main = `<g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${b}<g stroke-width="1.35">${hd}</g></g>`;
  const flat = (b + hd).replace(/<path data-fx="1"[^>]*\/>/g, '').replace(/ (?:fill-)?opacity="[^"]*"/g, '').replace(/(fill|stroke)="#[0-9a-fA-F]{6}"/g, `$1="${P.blue}"`);
  const shadow = `<g transform="translate(4 4)" stroke="${P.blue}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${flat}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${shadow}${main}</svg>`;
}
