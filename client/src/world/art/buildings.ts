// v0.7 building exteriors: every house, shop, tower, civic building, AIACT block, container stack and grove cabin is
// drawn with the same architectural language (see kit.ts "architecture kit" and brief v0.7 §1-2).
//
// A building tile is three textures (keys built by world/engine/buildings.ts):
//   bb:<style>:<part>:<theme>:<accent>   body: flat faces + facade modules, no ink on tile edges
//   be:<geom>:<mask>                     ink silhouette (+ parapet) for that tile's neighbour mask
//   bs:<geom>                            hard riso offset shadow
// so a facade made of N tiles reads as ONE volume: no seams, no per-tile stripes, one accent.
import { ME, MN, MS, MW, THEMES, THEME_ACCENTS, isPitched, type Accent, type Geom, type RoofShape, type Style, type Theme } from '../engine/buildings';
import {
  ACCENTS, CORNICE_PX, MATERIALS, P, PARAPET_PX, SOCLE_PX, STOREY_PX, acUnit, antenna, awningL, coolingGrille, corniceBand, cuboidShadow,
  doorUnit, ellipse, faceLine, hugIcon, lcell, line3, poly3, pt, rcell, socleBand, stroke, tileEntry, windowModule,
  type AccentTone, type ArtEntry, type Tone, type V3,
} from './kit';

type Draw = (cx: number, cy: number) => string;

/** Exterior walls are one storey tall; pitched roofs start a little above and rise to a ridge. */
export const WALL_H = STOREY_PX;
export const ROOF_H = WALL_H + 14;
export const RIDGE = 24;
/** Towers are three storeys. */
export const TOWER_STOREYS = 3;
export const TOWER_H = TOWER_STOREYS * STOREY_PX;
/** Free-standing concrete walls / blocks are a bit taller than a person. */
export const CONCRETE_WALL_H = 84;
/** A shipping container is about 1.1 x a person tall (stacks of 2 or 3). */
export const BOX_H = 76;

/** Face over-draw toward the neighbour painted before (W / N): hides anti-aliasing hairlines between tiles. */
const X = 0.035;

// ---------- geometry ----------

interface GeomInfo {
  h: number;
  up: number;
  parapet: boolean;
  shadow: string;
  sd: readonly [number, number];
}

const GEOMS: Readonly<Record<Exclude<Geom, `rf-${RoofShape}`>, GeomInfo>> = {
  st: { h: WALL_H, up: WALL_H + 24, parapet: false, shadow: P.blue, sd: [4, 3] },
  stp: { h: WALL_H, up: WALL_H + 46, parapet: true, shadow: P.blue, sd: [4, 3] },
  tw: { h: TOWER_H, up: TOWER_H + 46, parapet: true, shadow: P.pink, sd: [6, 4] },
  wl: { h: CONCRETE_WALL_H, up: CONCRETE_WALL_H + 14, parapet: false, shadow: P.blue, sd: [4, 3] },
  b2: { h: 2 * BOX_H, up: 2 * BOX_H + 14, parapet: false, shadow: P.blue, sd: [5, 4] },
  b3: { h: 3 * BOX_H, up: 3 * BOX_H + 14, parapet: false, shadow: P.blue, sd: [5, 4] },
};
const ROOF_UP = ROOF_H + RIDGE + 22;

function profile(shape: RoofShape): [number, number][] {
  const lo = ROOF_H;
  const hi = ROOF_H + RIDGE;
  return shape === 'single' ? [[0, lo], [0.5, hi], [1, lo]] : shape === 'back' ? [[0, lo], [1, hi]] : shape === 'front' ? [[0, hi], [1, lo]] : [[0, hi], [1, hi]];
}

// ---------- materials per style and theme (brief §2) ----------

function materialOf(style: Style, theme: Theme): Tone {
  if (style === 'wall') return theme === 'dunes' ? MATERIALS.sand : MATERIALS.concrete;
  switch (theme) {
    case 'city':
      return style === 'tower' ? MATERIALS.slab : style === 'block' ? MATERIALS.concrete : MATERIALS.paper;
    case 'grove':
      return style === 'cabin' ? MATERIALS.wood : MATERIALS.paper;
    case 'port':
      return style === 'house' ? MATERIALS.paper : style === 'block' || style === 'container' ? MATERIALS.steel : MATERIALS.paper2;
    case 'dunes':
      return style === 'tower' || style === 'block' ? MATERIALS.sand : MATERIALS.paper;
    case 'capitale':
      return MATERIALS.concrete;
  }
}

interface RoofPal {
  base: string;
  light: string;
  dark: string;
  line: string;
}
const SLATE: RoofPal = { base: '#6e6888', light: '#8a84a8', dark: '#3a3550', line: '#3a3550' };
/** Hugging Grove: green (planted) roofs on timber fascias. */
const GREEN: RoofPal = { base: P.leaf, light: P.leafL, dark: P.woodD, line: P.leafD };
const roofPalOf = (theme: Theme): RoofPal => (theme === 'grove' ? GREEN : SLATE);

// ---------- body ----------

/** Flat faces of a one-tile cuboid, no outline, over-drawn toward W / N. */
function faces(cx: number, cy: number, h: number, m: Tone, top = true): string {
  let s = poly3(cx, cy, [[-X, 1, 0], [1, 1, 0], [1, 1, h], [-X, 1, h]], m.left, false);
  s += poly3(cx, cy, [[1, 1, 0], [1, -X, 0], [1, -X, h], [1, 1, h]], m.right, false);
  if (top) s += poly3(cx, cy, [[-X, -X, h], [1, -X, h], [1, 1, h], [-X, 1, h]], m.top, false);
  return s;
}

/** Socle at the foot, cornice at the top, on both faces of a tile. */
function dress(cx: number, cy: number, h: number, acc: AccentTone | null, capTone?: string): string {
  let s = socleBand(cx, cy, 'L', 1, -X, 1) + socleBand(cx, cy, 'R', 1, -X, 1);
  if (acc) s += corniceBand(cx, cy, 'L', 1, -X, 1, h, acc) + corniceBand(cx, cy, 'R', 1, -X, 1, h, acc);
  else if (capTone) {
    s += lcell(cx, cy, 1, -X, 1, h - 6, h, capTone, false) + rcell(cx, cy, 1, -X, 1, h - 6, h, capTone, false);
    s += faceLine(cx, cy, 'L', 1, -X, 1, h - 6, P.ink, 1.2) + faceLine(cx, cy, 'R', 1, -X, 1, h - 6, P.ink, 1.2);
  }
  return s;
}

/** Window-band behind each storey of a tower: the windows sit on continuous horizontal ribbons. */
function towerBands(cx: number, cy: number, m: Tone): string {
  let s = '';
  for (let k = 0; k < TOWER_STOREYS; k++) {
    const z0 = k * STOREY_PX + 30;
    const z1 = k * STOREY_PX + 74;
    s += lcell(cx, cy, 1, -X, 1, z0, z1, m.band, false) + rcell(cx, cy, 1, -X, 1, z0, z1, m.band, false);
    for (const z of [z0, z1]) s += faceLine(cx, cy, 'L', 1, -X, 1, z, P.ink, 1.2) + faceLine(cx, cy, 'R', 1, -X, 1, z, P.ink, 1.2);
  }
  return s;
}

/** Cabin planks: regular horizontal boards (continuous from tile to tile, never vertical stripes). */
function planks(cx: number, cy: number, h: number): string {
  let s = '';
  for (let z = SOCLE_PX + 14; z < h - CORNICE_PX - 4; z += 14) s += faceLine(cx, cy, 'L', 1, -X, 1, z, P.woodD, 1) + faceLine(cx, cy, 'R', 1, -X, 1, z, P.woodD, 1);
  return s;
}

const storeys = (style: Style): number => (style === 'tower' ? TOWER_STOREYS : style === 'wall' ? 0 : 1);

function doorFor(style: Style, acc: AccentTone): Parameters<typeof doorUnit>[5] {
  switch (style) {
    case 'hub':
      return { leaf: P.glass, glass: P.glassL, split: true, label: 'HUB', icon: hugIcon(6.4, 6, 3.6) };
    case 'store':
      return { leaf: P.glass, glass: P.glassL, split: true, label: 'STORE' };
    case 'bench':
      return { leaf: P.glass, glass: P.glassL, split: true, label: 'BENCH' };
    case 'shop':
      return { leaf: P.glass, glass: P.glassL, split: true, label: 'OUVERT' };
    case 'block':
      return { leaf: '#5b5f7e', split: true, label: 'AIACT', mat: P.steelL };
    default:
      return { leaf: acc.light };
  }
}

/** Shop window: a wide display behind the same ink frame / glass / single glint, under the door awning. */
function vitrine(cx: number, cy: number, acc: AccentTone): string {
  let s = lcell(cx, cy, 1, 0.1, 0.9, 12, 68, P.glass, true);
  s += lcell(cx, cy, 1, 0.1, 0.9, 12, 30, '#fff1c9', false) + line3(cx, cy, [[0.1, 1, 30], [0.9, 1, 30]], P.ink, 1.2);
  const goods = [acc.base, P.ink2, P.paper];
  goods.forEach((c, i) => {
    const u = 0.18 + i * 0.22;
    s += lcell(cx, cy, 1, u, u + 0.14, 30, 40 + (i % 2) * 6, c, true);
  });
  s += poly3(cx, cy, [[0.2, 1, 46], [0.3, 1, 46], [0.48, 1, 64], [0.38, 1, 64]], P.glassL, false);
  s += awningL(cx, cy, 1, 0.06, 0.94, acc);
  return s;
}

function poster(cx: number, cy: number): string {
  let s = lcell(cx, cy, 1, 0.16, 0.84, 22, 74, P.steelL, true) + lcell(cx, cy, 1, 0.22, 0.78, 22, 26, P.steelD, false);
  const [mx, my] = pt(cx, cy, 0.5, 1, 50);
  s += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="8" fill="none" stroke="${P.red}" stroke-width="2.6"/>`;
  s += stroke(`M${mx - 5},${my - 5} L${mx + 5},${my + 5} M${mx + 5},${my - 5} L${mx - 5},${my + 5}`, P.red, 2.4);
  return s;
}

function rooftop(cx: number, cy: number, h: number, part: string, theme: Theme): string {
  if (part === 'top1') return theme === 'dunes' ? coolingGrille(cx, cy, 0.5, 0.5, h) : acUnit(cx, cy, 0.48, 0.46, h);
  if (part === 'top2') return theme === 'dunes' ? coolingGrille(cx, cy, 0.5, 0.5, h) : antenna(cx, cy, 0.52, 0.42, h);
  return '';
}

/** Body of a cuboid building tile (every style but containers and pitched roofs). */
function cuboidBody(style: Style, part: string, theme: Theme, acc: AccentTone, g: GeomInfo): Draw {
  return (cx, cy) => {
    const m = materialOf(style, theme);
    const h = g.h;
    let s = faces(cx, cy, h, m);
    if (style === 'tower') s += towerBands(cx, cy, m);
    if (style === 'cabin') s += planks(cx, cy, h);
    s += style === 'wall' ? dress(cx, cy, h, null, P.concreteL) : dress(cx, cy, h, acc);
    if (style === 'wall') for (const z of [28, 56]) s += faceLine(cx, cy, 'L', 1, -X, 1, z, P.concreteD, 1.1) + faceLine(cx, cy, 'R', 1, -X, 1, z, P.concreteD, 1.1);
    const n = storeys(style);
    for (let k = 0; k < n; k++) {
      const z0 = k * STOREY_PX;
      const leftBusy = k === 0 && (part === 'door' || part === 'front' || part === 'poster');
      if (!leftBusy) s += windowModule(cx, cy, 'L', 1, 0, z0);
      s += windowModule(cx, cy, 'R', 1, 0, z0);
    }
    if (part === 'door') s += doorUnit(cx, cy, 0, 1, acc, doorFor(style, acc));
    else if (part === 'front') s += vitrine(cx, cy, acc);
    else if (part === 'poster') s += poster(cx, cy);
    s += rooftop(cx, cy, h, part, theme);
    return s;
  };
}

/** A container stack: steel / accent / light layers, regular corrugation, end doors (no per-tile colour lottery). */
function containerBody(layers: number, acc: AccentTone): Draw {
  const tones: { l: string; r: string; rib: string }[] = [
    { l: P.steel, r: P.steelL, rib: P.steelD },
    { l: acc.base, r: acc.light, rib: acc.dark },
    { l: '#d6ccb4', r: P.paper2, rib: '#b3a68a' },
  ];
  return (cx, cy) => {
    let s = '';
    for (let k = 0; k < layers; k++) {
      const t = tones[k % tones.length]!;
      const z0 = k * BOX_H;
      const z1 = z0 + BOX_H;
      s += poly3(cx, cy, [[-X, 1, z0], [1, 1, z0], [1, 1, z1], [-X, 1, z1]], t.l, false);
      s += poly3(cx, cy, [[1, 1, z0], [1, -X, z0], [1, -X, z1], [1, 1, z1]], t.r, false);
      for (let i = 0; i < 8; i++) s += line3(cx, cy, [[i / 8 + 0.06, 1, z0 + 4], [i / 8 + 0.06, 1, z1 - 4]], t.rib, 1.1);
      // end doors: centre seam + two locking bars
      s += rcell(cx, cy, 1, 0.49, 0.51, z0 + 3, z1 - 3, P.ink, false);
      for (const v of [0.27, 0.73]) s += rcell(cx, cy, 1, v - 0.025, v + 0.025, z0 + 6, z1 - 6, P.ink2, false);
      if (k > 0) s += faceLine(cx, cy, 'L', 1, -X, 1, z0, P.ink, 1.6) + faceLine(cx, cy, 'R', 1, -X, 1, z0, P.ink, 1.6);
      if (k === layers - 1) {
        s += poly3(cx, cy, [[-X, -X, z1], [1, -X, z1], [1, 1, z1], [-X, 1, z1]], t.r, false);
        for (let i = 0; i < 5; i++) s += line3(cx, cy, [[i / 5 + 0.1, 0.06, z1], [i / 5 + 0.1, 0.94, z1]], t.rib, 1);
      }
    }
    return s;
  };
}

/** Pitched roof tile: facade below the eave (same modules), slate or timber slopes with regular courses, gable end. */
function roofBody(style: Style, shape: RoofShape, theme: Theme, acc: AccentTone): Draw {
  return (cx, cy) => {
    const m = materialOf(style, theme);
    const rp = roofPalOf(theme);
    const prof = profile(shape);
    const zFront = prof[prof.length - 1]![1];
    // facade part (visible when nothing stands in front / at the gable end)
    let s = faces(cx, cy, WALL_H, m, false) + dress(cx, cy, WALL_H, acc);
    s += windowModule(cx, cy, 'L', 1, 0, 0) + windowModule(cx, cy, 'R', 1, 0, 0);
    // eave fascia above the wall line
    s += poly3(cx, cy, [[-X, 1, WALL_H], [1, 1, WALL_H], [1, 1, zFront], [-X, 1, zFront]], rp.dark, false);
    // gable (wall material) with a barge board along the slopes
    const gable: V3[] = [[1, 1, WALL_H], [1, 0, WALL_H]];
    for (const [b, z] of prof) gable.push([1, b, z]);
    s += poly3(cx, cy, gable.map(([a, b, z]) => [a, b === 0 ? -X : b, z] as V3), m.right, false);
    s += line3(cx, cy, prof.map(([b, z]) => [1, b, z - 2] as V3), rp.dark, 4);
    // slopes
    for (let i = 0; i < prof.length - 1; i++) {
      const [b0, z0] = prof[i]!;
      const [b1, z1] = prof[i + 1]!;
      const col = z1 > z0 ? rp.light : rp.base;
      s += poly3(cx, cy, [[-X, b0, z0], [1, b0, z0], [1, b1, z1], [-X, b1, z1]], col, false);
      for (const t of [0.25, 0.5, 0.75]) {
        const b = b0 + (b1 - b0) * t;
        const z = z0 + (z1 - z0) * t;
        s += line3(cx, cy, [[-X, b, z], [1, b, z]], rp.line, 1.1);
      }
      if (theme === 'grove' && z1 < z0) {
        // green roof: two small blooms per tile on the slope facing the street, always at the same spots
        for (const [a, t, c] of [[0.3, 0.4, P.pinkL], [0.72, 0.65, P.yellow]] as const) {
          const [x, y] = pt(cx, cy, a, b0 + (b1 - b0) * t, z0 + (z1 - z0) * t);
          s += ellipse(x, y - 1, 2.6, 1.6, c, false);
        }
      }
    }
    return s;
  };
}

// ---------- edges (ink silhouette per neighbour mask) ----------

function seg(cx: number, cy: number, p: V3, q: V3): string {
  const [x0, y0] = pt(cx, cy, ...p);
  const [x1, y1] = pt(cx, cy, ...q);
  return `M${x0.toFixed(1)},${y0.toFixed(1)}L${x1.toFixed(1)},${y1.toFixed(1)}`;
}
const inkPath = (d: string, w = 2): string => (d ? `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>` : '');

/** Ink outline of a one-tile cuboid: only the edges on the building's silhouette, never the seams between its tiles. */
function cuboidEdges(cx: number, cy: number, h: number, mask: number): string {
  const n = !!(mask & MN);
  const e = !!(mask & ME);
  const so = !!(mask & MS);
  const w = !!(mask & MW);
  let d = '';
  if (!n) d += seg(cx, cy, [0, 0, h], [1, 0, h]);
  if (!w) d += seg(cx, cy, [0, 0, h], [0, 1, h]);
  if (!so) d += seg(cx, cy, [0, 1, h], [1, 1, h]) + seg(cx, cy, [0, 1, 0], [1, 1, 0]);
  if (!e) d += seg(cx, cy, [1, 0, h], [1, 1, h]) + seg(cx, cy, [1, 1, 0], [1, 0, 0]);
  if (!so && !e) d += seg(cx, cy, [1, 1, 0], [1, 1, h]);
  if (!so && !w) d += seg(cx, cy, [0, 1, 0], [0, 1, h]);
  if (!e && !n) d += seg(cx, cy, [1, 0, 0], [1, 0, h]);
  return inkPath(d);
}

/** Parapet (acrotere): a low light coping along the terrace's outer edges only. */
function parapet(cx: number, cy: number, h: number, mask: number): string {
  const T = 0.08;
  const z1 = h + PARAPET_PX;
  const f = { top: P.paper, outer: P.paper2, inner: P.paper3 };
  let s = '';
  let d = '';
  // back rims first (their inner faces are what we see), then the front rims
  if (!(mask & MN)) {
    s += poly3(cx, cy, [[-X, T, h], [1, T, h], [1, T, z1], [-X, T, z1]], f.inner, false) + poly3(cx, cy, [[-X, 0, z1], [1, 0, z1], [1, T, z1], [-X, T, z1]], f.top, false);
    d += seg(cx, cy, [0, 0, z1], [1, 0, z1]) + seg(cx, cy, [0, T, z1], [1, T, z1]) + seg(cx, cy, [0, T, h], [1, T, h]);
  }
  if (!(mask & MW)) {
    s += poly3(cx, cy, [[T, -X, h], [T, 1, h], [T, 1, z1], [T, -X, z1]], f.outer, false) + poly3(cx, cy, [[0, -X, z1], [T, -X, z1], [T, 1, z1], [0, 1, z1]], f.top, false);
    d += seg(cx, cy, [0, 0, z1], [0, 1, z1]) + seg(cx, cy, [T, 0, z1], [T, 1, z1]) + seg(cx, cy, [T, 0, h], [T, 1, h]);
  }
  if (!(mask & MS)) {
    s += poly3(cx, cy, [[-X, 1, h], [1, 1, h], [1, 1, z1], [-X, 1, z1]], f.inner, false) + poly3(cx, cy, [[-X, 1 - T, z1], [1, 1 - T, z1], [1, 1, z1], [-X, 1, z1]], f.top, false);
    d += seg(cx, cy, [0, 1, z1], [1, 1, z1]) + seg(cx, cy, [0, 1 - T, z1], [1, 1 - T, z1]);
  }
  if (!(mask & ME)) {
    s += poly3(cx, cy, [[1, 1, h], [1, -X, h], [1, -X, z1], [1, 1, z1]], f.outer, false) + poly3(cx, cy, [[1 - T, -X, z1], [1, -X, z1], [1, 1, z1], [1 - T, 1, z1]], f.top, false);
    d += seg(cx, cy, [1, 0, z1], [1, 1, z1]) + seg(cx, cy, [1 - T, 0, z1], [1 - T, 1, z1]);
  }
  // outer corners of the coping
  if (!(mask & MS) && !(mask & ME)) d += seg(cx, cy, [1, 1, h], [1, 1, z1]);
  if (!(mask & MS) && !(mask & MW)) d += seg(cx, cy, [0, 1, h], [0, 1, z1]);
  if (!(mask & MN) && !(mask & ME)) d += seg(cx, cy, [1, 0, h], [1, 0, z1]);
  return s + inkPath(d, 1.6);
}

function roofEdges(cx: number, cy: number, shape: RoofShape, mask: number): string {
  const prof = profile(shape);
  const zFront = prof[prof.length - 1]![1];
  const zBack = prof[0]![1];
  const e = !!(mask & ME);
  const w = !!(mask & MW);
  let d = '';
  // eaves (low ends of the profile) and the ridge
  if (zBack === ROOF_H) d += seg(cx, cy, [0, 0, zBack], [1, 0, zBack]);
  if (zFront === ROOF_H) d += seg(cx, cy, [0, 1, zFront], [1, 1, zFront]);
  if (shape === 'single') d += seg(cx, cy, [0, 0.5, ROOF_H + RIDGE], [1, 0.5, ROOF_H + RIDGE]);
  if (shape === 'front') d += seg(cx, cy, [0, 0, zBack], [1, 0, zBack]);
  // fascia (front face) outline; the wall row in front covers what must be hidden
  d += seg(cx, cy, [0, 1, 0], [1, 1, 0]);
  if (!w) {
    for (let i = 0; i < prof.length - 1; i++) d += seg(cx, cy, [0, prof[i]![0], prof[i]![1]], [0, prof[i + 1]![0], prof[i + 1]![1]]);
    d += seg(cx, cy, [0, 1, 0], [0, 1, zFront]);
  }
  if (!e) {
    for (let i = 0; i < prof.length - 1; i++) d += seg(cx, cy, [1, prof[i]![0], prof[i]![1]], [1, prof[i + 1]![0], prof[i + 1]![1]]);
    d += seg(cx, cy, [1, 1, 0], [1, 1, zFront]) + seg(cx, cy, [1, 0, 0], [1, 0, zBack]) + seg(cx, cy, [1, 1, 0], [1, 0, 0]);
    d += seg(cx, cy, [1, 1, WALL_H], [1, 0, WALL_H]);
  }
  return inkPath(d);
}

// ---------- shadows ----------

function shadowOf(geom: Geom): { up: number; draw: Draw } {
  if (geom.startsWith('rf-')) {
    const prof = profile(geom.slice(3) as RoofShape);
    return {
      up: ROOF_UP,
      draw: (cx, cy) => {
        const sil: V3[] = [[0, 1, 0], [1, 1, 0], [1, 0, 0]];
        for (const [b, z] of prof) sil.push([1, b, z]);
        for (const [b, z] of [...prof].reverse()) sil.push([0, b, z]);
        const ps = sil.map(([a, b, z]) => pt(cx, cy, a, b, z)).map(([x, y]) => `${(x + 4).toFixed(1)},${(y + 3).toFixed(1)}`).join(' ');
        return `<polygon points="${ps}" fill="${P.blue}" stroke="${P.blue}" stroke-width="2" stroke-linejoin="round"/>`;
      },
    };
  }
  const g = GEOMS[geom as keyof typeof GEOMS];
  const h = g.h + (g.parapet ? PARAPET_PX : 0);
  return { up: g.up, draw: (cx, cy) => cuboidShadow(cx, cy, 0, 1, 0, 1, h, g.shadow, g.sd[0], g.sd[1]) };
}

// ---------- key -> art ----------

function upOf(geom: Geom): number {
  return geom.startsWith('rf-') ? ROOF_UP : GEOMS[geom as keyof typeof GEOMS].up;
}

function geomFor(style: Style, part: string, theme: Theme): Geom {
  if (part.startsWith('roof-')) return `rf-${part.slice(5) as RoofShape}`;
  if (part === 'c2') return 'b2';
  if (part === 'c3') return 'b3';
  if (style === 'tower') return 'tw';
  if (style === 'wall') return 'wl';
  return isPitched(style, theme) ? 'st' : 'stp';
}

function edgeDraw(geom: Geom, mask: number): Draw {
  if (geom.startsWith('rf-')) return (cx, cy) => roofEdges(cx, cy, geom.slice(3) as RoofShape, mask);
  const g = GEOMS[geom as keyof typeof GEOMS];
  return (cx, cy) => cuboidEdges(cx, cy, g.h, mask) + (g.parapet ? parapet(cx, cy, g.h, mask) : '');
}

function bodyDraw(style: Style, part: string, theme: Theme, accent: string): Draw | null {
  const acc: AccentTone = ACCENTS[(accent in ACCENTS ? accent : THEME_ACCENTS[theme][0]) as Accent];
  const geom = geomFor(style, part, theme);
  if (geom.startsWith('rf-')) return roofBody(style, part.slice(5) as RoofShape, theme, acc);
  if (style === 'container') return containerBody(part === 'c3' ? 3 : 2, acc);
  return cuboidBody(style, part, theme, acc, GEOMS[geom as keyof typeof GEOMS]);
}

const isTheme = (t: string): t is Theme => (THEMES as readonly string[]).includes(t);

/** Build the texture for a building key (bb:/be:/bs:), or null for an unknown key. */
export function buildingArt(key: string): ArtEntry | null {
  const parts = key.split(':');
  const kind = parts[0];
  if (kind === 'bs') {
    const geom = parts[1] as Geom;
    if (!geom || !(geom in GEOMS || geom.startsWith('rf-'))) return null;
    const sh = shadowOf(geom);
    return tileEntry(key, sh.up, sh.draw);
  }
  if (kind === 'be') {
    const geom = parts[1] as Geom;
    const mask = Number(parts[2]);
    if (!geom || !(geom in GEOMS || geom.startsWith('rf-')) || !Number.isInteger(mask)) return null;
    return tileEntry(key, upOf(geom), edgeDraw(geom, mask));
  }
  if (kind === 'bb') {
    const [, style, part, theme, accent] = parts as [string, Style, string, string, string];
    if (!style || !part || !theme || !isTheme(theme)) return null;
    const draw = bodyDraw(style, part, theme, accent ?? '');
    return draw ? tileEntry(key, upOf(geomFor(style, part, theme)), draw) : null;
  }
  return null;
}

/** One self-contained sprite (shadow + body + full outline): fallbacks / previews for code paths without a map. */
function composite(key: string, style: Style, part: string, theme: Theme, accent: Accent): ArtEntry {
  const geom = geomFor(style, part, theme);
  const body = bodyDraw(style, part, theme, accent)!;
  const sh = shadowOf(geom);
  const edge = edgeDraw(geom, 0);
  return tileEntry(key, upOf(geom), (cx, cy) => sh.draw(cx, cy) + body(cx, cy) + edge(cx, cy));
}

/** Legacy `<tile>:<n>` sprites (tests, fallbacks when a building texture is missing). */
export function legacyBuildingEntries(): ArtEntry[] {
  const L: [string, Style, string, Theme, Accent][] = [
    ['house_wall:0', 'house', 'wall', 'city', 'pink'], ['house_window:0', 'house', 'wall', 'city', 'pink'], ['house_door:0', 'house', 'door', 'city', 'pink'],
    ['roof_red:0', 'house', 'roof-single', 'city', 'pink'], ['roof_blue:0', 'house', 'roof-single', 'city', 'blue'], ['roof_grey:0', 'block', 'top0', 'capitale', 'red'],
    ['hub_wall:0', 'hub', 'wall', 'city', 'yellow'], ['hub_door:0', 'hub', 'door', 'city', 'yellow'], ['hub_roof:0', 'hub', 'top1', 'city', 'yellow'],
    ['store_wall:0', 'store', 'wall', 'city', 'teal'], ['store_door:0', 'store', 'door', 'city', 'teal'], ['store_roof:0', 'store', 'top0', 'city', 'teal'],
    ['bench_wall:0', 'bench', 'wall', 'grove', 'leaf'], ['bench_door:0', 'bench', 'door', 'grove', 'leaf'], ['bench_roof:0', 'bench', 'roof-single', 'grove', 'leaf'],
    ['shop_wall:0', 'shop', 'wall', 'city', 'pink'], ['shop_window:0', 'shop', 'front', 'city', 'pink'], ['shop_door:0', 'shop', 'door', 'city', 'pink'],
    ['awning_red:0', 'shop', 'wall', 'city', 'pink'], ['awning_teal:0', 'shop', 'wall', 'city', 'teal'],
    ['tower_wall:0', 'tower', 'wall', 'city', 'blue'], ['tower_roof:0', 'tower', 'top2', 'city', 'blue'],
    ['concrete_wall:0', 'wall', 'wall', 'city', 'pink'], ['aiact_wall:0', 'block', 'wall', 'capitale', 'red'], ['aiact_door:0', 'block', 'door', 'capitale', 'red'],
  ];
  const out = L.map(([k, s, p, t, a]) => composite(k, s, p, t, a));
  const box: Accent[] = ['orange', 'teal', 'blue'];
  const wood: Accent[] = ['leaf', 'yellow', 'leaf'];
  for (let v = 0; v < 3; v++) {
    out.push(composite(`container_wall:${v}`, 'container', 'c2', 'port', box[v]!), composite(`container_roof:${v}`, 'container', 'c3', 'port', box[v]!));
    out.push(composite(`treehouse_wall:${v}`, 'cabin', 'wall', 'grove', wood[v]!), composite(`treehouse_roof:${v}`, 'cabin', 'roof-single', 'grove', wood[v]!));
  }
  return out;
}
