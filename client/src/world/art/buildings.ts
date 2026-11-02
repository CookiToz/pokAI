// v0.7 building exteriors: every house, shop, tower, civic building, AIACT block, container stack and grove cabin is
// drawn with the same architectural language (see kit.ts "architecture kit" and brief v0.7 §1-2).
//
// A building tile is three textures (keys built by world/engine/buildings.ts):
//   bb:<style>:<part>:<theme>:<accent>   body: flat faces + facade modules, no ink on tile edges
//   be:<geom>:<mask>                     ink silhouette (+ parapet) for that tile's neighbour mask
//   bs:<geom>                            hard riso offset shadow
// so a facade made of N tiles reads as ONE volume: no seams, no per-tile stripes, one accent.
import { ME, MN, MS, MW, THEMES, THEME_ACCENTS, geomOf, type Accent, type Geom, type RoofShape, type Style, type Theme } from '../engine/buildings';
import {
  ACCENTS, CORNICE_PX, DOOR_H, MATERIALS, P, PARAPET_PX, SOCLE_PX, STOREY_PX, acUnit, antenna, awningL, circle, coolingGrille, corniceBand, cuboid,
  cuboidShadow, doorUnit, ellipse, faceLine, faceQuad, hugIcon, lcell, leftPlaneG, line3, path, plaqueL, poly3, pt, rcell, rect, socleBand, stroke, text,
  tileEntry, windowModule, type AccentTone, type ArtEntry, type FaceSide, type Tone, type V3,
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

/** What runs along the top edge of the silhouette: nothing, a light parapet, a rounded earthen rim, log ends. */
type Rim = 'none' | 'parapet' | 'round' | 'log';

interface GeomInfo {
  h: number;
  up: number;
  rim: Rim;
  shadow: string;
  sd: readonly [number, number];
}

const GEOMS: Readonly<Record<Exclude<Geom, `rf-${RoofShape}`>, GeomInfo>> = {
  st: { h: WALL_H, up: WALL_H + 24, rim: 'none', shadow: P.blue, sd: [4, 3] },
  lg: { h: WALL_H, up: WALL_H + 24, rim: 'log', shadow: P.blue, sd: [4, 3] },
  stp: { h: WALL_H, up: WALL_H + 50, rim: 'parapet', shadow: P.blue, sd: [4, 3] },
  sd: { h: WALL_H, up: WALL_H + 40, rim: 'round', shadow: P.pink, sd: [4, 3] },
  mo: { h: 2 * STOREY_PX, up: 2 * STOREY_PX + 60, rim: 'parapet', shadow: P.red, sd: [6, 4] },
  tw: { h: TOWER_H, up: TOWER_H + 46, rim: 'parapet', shadow: P.pink, sd: [6, 4] },
  sdt: { h: TOWER_H, up: TOWER_H + 30, rim: 'round', shadow: P.pink, sd: [6, 4] },
  wl: { h: CONCRETE_WALL_H, up: CONCRETE_WALL_H + 14, rim: 'none', shadow: P.blue, sd: [4, 3] },
  b2: { h: 2 * BOX_H, up: 2 * BOX_H + 14, rim: 'none', shadow: P.blue, sd: [5, 4] },
  b3: { h: 3 * BOX_H, up: 3 * BOX_H + 14, rim: 'none', shadow: P.blue, sd: [5, 4] },
};
const ROOF_UP = ROOF_H + RIDGE + 22;
const rimPx = (r: Rim): number => (r === 'parapet' ? PARAPET_PX : r === 'round' ? 4 : 0);

function profile(shape: RoofShape): [number, number][] {
  const lo = ROOF_H;
  const hi = ROOF_H + RIDGE;
  return shape === 'single' ? [[0, lo], [0.5, hi], [1, lo]] : shape === 'back' ? [[0, lo], [1, hi]] : shape === 'front' ? [[0, hi], [1, lo]] : [[0, hi], [1, hi]];
}

// ---------- materials per style and city (each city builds with its own stuff) ----------

/** Port 8080 warehouses and houses. */
const BRICK: Tone = { top: '#9aa0ae', right: '#d47454', left: '#a8503a', band: '#7d3a28' };
/** Dunes des Datacenters: rammed earth / adobe. */
const ADOBE: Tone = { top: '#ead19a', right: '#f6e0b2', left: '#d8b77d', band: '#c39c5c' };

function materialOf(style: Style, theme: Theme): Tone {
  if (style === 'wall') return theme === 'dunes' ? MATERIALS.sand : MATERIALS.concrete;
  switch (theme) {
    case 'city':
      return style === 'tower' ? MATERIALS.slab : style === 'block' ? MATERIALS.concrete : MATERIALS.paper;
    case 'grove':
      return MATERIALS.wood;
    case 'port':
      return style === 'house' || style === 'block' ? BRICK : MATERIALS.steel;
    case 'dunes':
      return style === 'tower' ? MATERIALS.sand : ADOBE;
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

/** Both faces at once: f(side, plane=1). */
const both = (f: (side: FaceSide) => string): string => f('L') + f('R');
const hline = (cx: number, cy: number, z: number, color: string, w = 1.1): string => both((sd) => faceLine(cx, cy, sd, 1, -X, 1, z, color, w));

/** Socle at the foot, cornice at the top, on both faces of a tile. */
function dress(cx: number, cy: number, h: number, acc: AccentTone | null, capTone?: string, corniceH = CORNICE_PX): string {
  let s = socleBand(cx, cy, 'L', 1, -X, 1) + socleBand(cx, cy, 'R', 1, -X, 1);
  if (acc && corniceH === CORNICE_PX) s += corniceBand(cx, cy, 'L', 1, -X, 1, h, acc) + corniceBand(cx, cy, 'R', 1, -X, 1, h, acc);
  else if (acc) s += both((sd) => faceQuad(cx, cy, sd, 1, -X, 1, h - corniceH, h, sd === 'L' ? acc.dark : acc.base)) + hline(cx, cy, h - corniceH, P.ink, 1.2) + hline(cx, cy, h - 5, P.ink, 1);
  else if (capTone) s += both((sd) => faceQuad(cx, cy, sd, 1, -X, 1, h - 6, h, capTone)) + hline(cx, cy, h - 6, P.ink, 1.2);
  return s;
}

/** Material skins: what each city's walls are made of. All of them are horizontal or regular (never per-tile stripes). */
function skin(cx: number, cy: number, style: Style, theme: Theme, h: number): string {
  let s = '';
  if (theme === 'city' && style === 'tower') {
    // glass curtain wall: a glazed ribbon per storey, mullions on the module grid
    for (let k = 0; k < TOWER_STOREYS; k++) {
      const z0 = k * STOREY_PX + 26;
      const z1 = k * STOREY_PX + 80;
      s += both((sd) => faceQuad(cx, cy, sd, 1, -X, 1, z0, z1, sd === 'L' ? P.glassD : P.glass));
      s += both((sd) => faceQuad(cx, cy, sd, 1, sd === 'L' ? 0.14 : 0.62, sd === 'L' ? 0.38 : 0.86, z0 + 4, z1 - 4, sd === 'L' ? P.glass : P.glassL));
      for (const u of [0, 0.5]) s += both((sd) => (sd === 'L' ? line3(cx, cy, [[u, 1, z0], [u, 1, z1]], P.glassN, 1) : line3(cx, cy, [[1, u, z0], [1, u, z1]], P.glassN, 1)));
      s += hline(cx, cy, z0, P.ink, 1.3) + hline(cx, cy, z1, P.ink, 1.3);
    }
  } else if (theme === 'grove' && style === 'cabin') {
    // stacked round logs: a dark seam and a light highlight per log
    for (let z = SOCLE_PX + 12; z < h - CORNICE_PX; z += 12) s += hline(cx, cy, z, P.woodD, 1.6) + hline(cx, cy, z + 4, '#e8bb88', 1.4);
  } else if (theme === 'grove') {
    // vertical board siding (bardage), boards on a regular sixth-of-a-tile grid
    for (let i = 0; i < 6; i++) {
      const u = i / 6;
      s += line3(cx, cy, [[u, 1, SOCLE_PX], [u, 1, h - CORNICE_PX]], P.woodD, 1) + line3(cx, cy, [[1, u, SOCLE_PX], [1, u, h - CORNICE_PX]], P.woodD, 1);
    }
  } else if (theme === 'port' && (style === 'house' || style === 'block')) {
    // brick bond: courses every 7 px, staggered head joints
    let r = 0;
    for (let z = SOCLE_PX + 7; z < h - CORNICE_PX; z += 7, r++) {
      s += hline(cx, cy, z, BRICK.band, 0.9);
      for (const u of r % 2 ? [0.125, 0.625] : [0.375, 0.875]) {
        s += line3(cx, cy, [[u, 1, z - 7], [u, 1, z]], BRICK.band, 0.9) + line3(cx, cy, [[1, u, z - 7], [1, u, z]], BRICK.band, 0.9);
      }
    }
  } else if (theme === 'port') {
    // corrugated sheet metal
    for (let i = 0; i < 8; i++) {
      const u = i / 8 + 0.06;
      s += line3(cx, cy, [[u, 1, SOCLE_PX + 2], [u, 1, h - CORNICE_PX - 2]], P.steelD, 1.1) + line3(cx, cy, [[1, u, SOCLE_PX + 2], [1, u, h - CORNICE_PX - 2]], '#9aa0ae', 1.1);
    }
  } else if (theme === 'capitale') {
    // board-formed concrete lifts + a pilaster at every bay: the colonnade
    for (let z = 20; z < h - 14; z += 20) s += hline(cx, cy, z, '#bdbbc8', 0.8);
    s += faceQuad(cx, cy, 'L', 1, -X, 0.12, SOCLE_PX, h - 14, MATERIALS.concrete.right) + line3(cx, cy, [[0.12, 1, SOCLE_PX], [0.12, 1, h - 14]], P.ink, 1.2);
    s += faceQuad(cx, cy, 'R', 1, 0.88, 1, SOCLE_PX, h - 14, '#e6e5ec') + line3(cx, cy, [[1, 0.88, SOCLE_PX], [1, 0.88, h - 14]], P.ink, 1.2);
  } else if (theme === 'dunes' && style !== 'tower') {
    // claustra: a lattice band of small openings under the rim
    for (let i = 0; i < 6; i++) {
      const u = i / 6 + 0.04;
      s += both((sd) => faceQuad(cx, cy, sd, 1, u, u + 0.08, 76, 86, P.ink2, false));
    }
    s += hline(cx, cy, 73, ADOBE.band, 1.2) + hline(cx, cy, 89, ADOBE.band, 1.2);
  }
  return s;
}

/** Narrow vertical window (Capitale): same frame / glass / glint / sill as the module, just slim and tall. */
function slimWindow(cx: number, cy: number, side: FaceSide, lo: number, hi: number, z0: number): string {
  const zs = z0 + 30;
  const zt = z0 + 78;
  let s = faceQuad(cx, cy, side, 1, lo - 0.03, hi + 0.03, zs - 3, zs, P.paper, true) + faceQuad(cx, cy, side, 1, lo, hi, zs, zt, P.glass, true);
  const g: V3[] = side === 'L' ? [[lo + 0.02, 1, zs + 6], [lo + 0.06, 1, zs + 6], [hi - 0.02, 1, zt - 14], [hi - 0.06, 1, zt - 14]] : [[1, hi - 0.02, zs + 6], [1, hi - 0.06, zs + 6], [1, lo + 0.02, zt - 14], [1, lo + 0.06, zt - 14]];
  return s + poly3(cx, cy, g, P.glassL, false);
}

/** Server bay (datacenter): dark rack panel with slots and status LEDs, on the storey grid. */
function rackBay(cx: number, cy: number, side: FaceSide, z0: number, k: number): string {
  let s = faceQuad(cx, cy, side, 1, 0.14, 0.86, z0 + 16, z0 + 88, P.ink2, true);
  const leds = [P.neon, P.pink, P.yellow, P.leafL];
  for (let r = 0; r < 6; r++) {
    const z = z0 + 22 + r * 11;
    s += faceQuad(cx, cy, side, 1, 0.2, 0.8, z, z + 7, '#2b2748');
    s += faceQuad(cx, cy, side, 1, side === 'L' ? 0.24 : 0.68, side === 'L' ? 0.32 : 0.76, z + 2, z + 4.5, leds[(r + k) % 4]!);
    s += faceQuad(cx, cy, side, 1, side === 'L' ? 0.4 : 0.44, side === 'L' ? 0.56 : 0.6, z + 3, z + 4, P.ink3);
  }
  return s;
}

/** AIACT banner hanging on a +gy or +gx facade: red cloth, swallowtail, white stamp. */
function banner(cx: number, cy: number, side: FaceSide, h: number): string {
  const top = h - 16;
  const len = Math.min(70, h - 40);
  const [u0, u1] = side === 'L' ? [0.36, 0.64] : [0.36, 0.64];
  const P3 = (u: number, z: number): V3 => (side === 'L' ? [u, 1, z] : [1, u, z]);
  let s = poly3(cx, cy, [P3(u0, top), P3(u1, top), P3(u1, top - len), P3((u0 + u1) / 2, top - len + 8), P3(u0, top - len)], side === 'L' ? P.redD : P.red);
  s += poly3(cx, cy, [P3(u0 - 0.04, top + 2), P3(u1 + 0.04, top + 2), P3(u1 + 0.04, top - 2), P3(u0 - 0.04, top - 2)], P.ink2, false);
  const [mx, my] = pt(cx, cy, ...(side === 'L' ? ([0.5, 1, top - 22] as V3) : ([1, 0.5, top - 22] as V3)));
  s += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5" fill="none" stroke="${P.paper}" stroke-width="1.8"/>` + stroke(`M${mx - 3},${my - 3} L${mx + 3},${my + 3} M${mx + 3},${my - 3} L${mx - 3},${my + 3}`, P.paper, 1.6);
  return s;
}

/** Hanging lantern (screen space, hook at x, y). */
function lantern(x: number, y: number): string {
  return stroke(`M${x},${y} v6`, P.ink, 1.2) + rect(x - 3.4, y + 6, 6.8, 9, P.yellow, 2) + rect(x - 4, y + 4.5, 8, 2.5, P.ink2, 1, false);
}

/** Leaves spilling over an edge (screen space). */
function foliage(x: number, y: number, s = 1): string {
  return ellipse(x, y, 7 * s, 4.5 * s, P.leafD) + ellipse(x - 1, y - 1, 4.5 * s, 2.6 * s, P.leaf, false) + ellipse(x + 3 * s, y + 5 * s, 2.4 * s, 3.4 * s, P.leafD) + ellipse(x - 4 * s, y + 4 * s, 2 * s, 3 * s, P.leaf);
}

const storeys = (style: Style): number => (style === 'tower' ? TOWER_STOREYS : style === 'monument' ? 2 : style === 'wall' ? 0 : 1);

function doorFor(style: Style, theme: Theme, acc: AccentTone): Parameters<typeof doorUnit>[5] {
  const glassy = { leaf: P.glass, glass: P.glassL, split: true };
  switch (style) {
    case 'hub':
      return { ...glassy, label: 'HUB', icon: hugIcon(6.4, 6, 3.6) };
    case 'store':
      return { ...glassy, label: 'STORE' };
    case 'bench':
      return { ...glassy, label: 'BENCH' };
    case 'shop':
      return glassy; // city shops get a neon sign instead of a paper plaque
    case 'block':
    case 'monument':
      return { leaf: '#5b5f7e', split: true, label: 'AIACT', mat: P.steelL };
    default:
      return { leaf: theme === 'grove' ? P.woodL : acc.light };
  }
}

/** Neon sign board (Latentia shops): ink board, accent tube lettering, a tube frame. */
function neonSign(cx: number, cy: number, u0: number, u1: number, z0: number, z1: number, acc: AccentTone, label: string): string {
  const w = (u1 - u0) * 32;
  const hgt = z1 - z0;
  let s = lcell(cx, cy, 1, u0, u1, z0, z1, P.ink, true);
  s += leftPlaneG(cx, cy, u0, 1, z1, `<rect x="1.6" y="1.6" width="${(w - 3.2).toFixed(1)}" height="${hgt - 3.2}" fill="none" stroke="${acc.light}" stroke-width="1"/>` +
    text(w / 2, hgt - 3.4, hgt - 5, acc.light, label, 'middle', `textLength="${(w - 6).toFixed(1)}" lengthAdjust="spacingAndGlyphs"`));
  return s;
}

/** Port: a big sliding hangar door (corrugated leaf, accent frame and braces, top rail), plus the usual awning / plaque. */
function hangarDoor(cx: number, cy: number, acc: AccentTone, o: Parameters<typeof doorUnit>[5]): string {
  let s = lcell(cx, cy, 1, 0.04, 0.96, 0, DOOR_H + 6, acc.base, true);
  s += lcell(cx, cy, 1, 0.1, 0.9, 0, DOOR_H, P.steelL, true);
  for (let i = 1; i < 8; i++) s += line3(cx, cy, [[0.1 + i * 0.1, 1, 2], [0.1 + i * 0.1, 1, DOOR_H - 2]], P.steel, 1);
  s += line3(cx, cy, [[0.1, 1, 4], [0.5, 1, DOOR_H - 4], [0.9, 1, 4]], acc.dark, 2.4);
  s += line3(cx, cy, [[0.5, 1, 0], [0.5, 1, DOOR_H]], P.ink, 1.6) + line3(cx, cy, [[0.02, 1, DOOR_H + 3], [0.98, 1, DOOR_H + 3]], P.ink, 2.4);
  s += lcell(cx, cy, 1, 0.42, 0.47, 34, 44, P.yellow, false) + lcell(cx, cy, 1, 0.53, 0.58, 34, 44, P.yellow, false);
  s += poly3(cx, cy, [[0.0, 1, 0], [1.0, 1, 0], [1.0, 1.24, 0], [0.0, 1.24, 0]], P.paper3);
  if (o.label) s += plaqueL(cx, cy, 1, 0.14, 0.86, DOOR_H + 10, DOOR_H + 22, acc, o.label, o.icon);
  return s;
}

/** Dunes: the door module under a rounded earthen arch. */
function archedDoor(cx: number, cy: number, acc: AccentTone, o: Parameters<typeof doorUnit>[5]): string {
  const [x0, y0] = pt(cx, cy, 0.06, 1, DOOR_H + 4);
  const [x1, y1] = pt(cx, cy, 0.94, 1, DOOR_H + 4);
  let s = `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} Q${((x0 + x1) / 2).toFixed(1)},${((y0 + y1) / 2 - 26).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)} Z" fill="${acc.base}" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>`;
  s += `<path d="M${(x0 + 3).toFixed(1)},${(y0 + 1.5).toFixed(1)} Q${((x0 + x1) / 2).toFixed(1)},${((y0 + y1) / 2 - 19).toFixed(1)} ${(x1 - 3).toFixed(1)},${(y1 - 1.5).toFixed(1)} Z" fill="${P.glassL}"/>`;
  return s + doorUnit(cx, cy, 0, 1, acc, o);
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

/** Brick chimney (Port): stack, ink cap, two flat smoke puffs. */
function chimney(cx: number, cy: number, h: number): string {
  let s = cuboid(cx, cy, 0.52, 0.74, 0.26, 0.48, h, h + 38, { top: P.ink2, left: BRICK.left, right: BRICK.right });
  s += cuboid(cx, cy, 0.5, 0.76, 0.24, 0.5, h + 38, h + 43, { top: P.ink, left: P.ink2, right: P.ink3 });
  const [x, y] = pt(cx, cy, 0.63, 0.37, h + 43);
  return s + circle(x + 4, y - 8, 4.5, P.paper2) + circle(x + 10, y - 15, 3.4, P.paper2);
}

/** Earthen dome (Dunes) centred on the roof. */
function dome(cx: number, cy: number, h: number): string {
  const [x, y] = pt(cx, cy, 0.5, 0.5, h);
  let s = ellipse(x, y, 19, 9.5, ADOBE.left);
  s += `<path d="M${x - 17},${y} A17,20 0 0 1 ${x + 17},${y} A17,8.5 0 0 1 ${x - 17},${y} Z" fill="${ADOBE.right}" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>`;
  s += `<path d="M${x - 17},${y} A17,20 0 0 1 ${x - 4},${y - 18.6} Q${x - 9},${y - 6} ${x - 6},${y + 7.6} A17,8.5 0 0 1 ${x - 17},${y} Z" fill="${ADOBE.left}"/>`;
  s += `<path d="M${x - 17},${y} A17,20 0 0 1 ${x + 17},${y}" fill="none" stroke="${P.ink}" stroke-width="2"/>`;
  return s + stroke(`M${x},${y - 20} v-7`, P.ink, 2) + circle(x, y - 28, 2.4, P.yellow);
}

/** Capitale: a single flag mast with the red AIACT flag. */
function flagMast(cx: number, cy: number, h: number): string {
  const [x, y] = pt(cx, cy, 0.5, 0.5, h);
  let s = rect(x - 5, y - 4, 10, 5, P.concreteD, 1) + stroke(`M${x},${y - 2} v-58`, P.ink, 2.4);
  s += path(`M${x},${y - 58} h22 l-5,7 l5,7 h-22 z`, P.red);
  s += `<circle cx="${x + 9}" cy="${y - 51}" r="3" fill="none" stroke="${P.paper}" stroke-width="1.4"/>`;
  return s;
}

function rooftop(cx: number, cy: number, h: number, part: string, style: Style, theme: Theme): string {
  if (part !== 'top1' && part !== 'top2') return '';
  const one = part === 'top1';
  switch (theme) {
    case 'city':
      return one ? acUnit(cx, cy, 0.48, 0.46, h) : antenna(cx, cy, 0.52, 0.42, h) + (style === 'tower' ? antenna(cx, cy, 0.3, 0.62, h) : '');
    case 'port':
      return one ? chimney(cx, cy, h) : acUnit(cx, cy, 0.48, 0.46, h);
    case 'dunes':
      return style === 'tower' ? coolingGrille(cx, cy, 0.5, 0.5, h) : one ? dome(cx, cy, h) : coolingGrille(cx, cy, 0.5, 0.5, h);
    case 'capitale':
      return one ? acUnit(cx, cy, 0.48, 0.46, h) : flagMast(cx, cy, h);
    default:
      return one ? acUnit(cx, cy, 0.48, 0.46, h) : antenna(cx, cy, 0.52, 0.42, h);
  }
}

/** Body of a cuboid building tile (every style but containers and pitched roofs). */
function cuboidBody(style: Style, part: string, theme: Theme, acc: AccentTone, g: GeomInfo): Draw {
  return (cx, cy) => {
    const m = materialOf(style, theme);
    const h = g.h;
    const monumental = theme === 'capitale' && style !== 'wall';
    let s = faces(cx, cy, h, m) + skin(cx, cy, style, theme, h);
    s += style === 'wall' ? dress(cx, cy, h, null, theme === 'dunes' ? ADOBE.right : P.concreteL) : dress(cx, cy, h, acc, undefined, monumental ? 14 : CORNICE_PX);
    if (style === 'wall') s += hline(cx, cy, 28, P.concreteD) + hline(cx, cy, 56, P.concreteD);
    // Latentia: a neon tube runs under the cornice of shops and towers (and between the tower storeys)
    if (style === 'shop' || (theme === 'city' && style === 'tower')) {
      const zs = style === 'tower' ? [h - CORNICE_PX - 4, STOREY_PX - 6, 2 * STOREY_PX - 6] : [h - CORNICE_PX - 4];
      for (const z of zs) s += hline(cx, cy, z, P.ink, 4.4) + hline(cx, cy, z, acc.light, 2);
    }
    const n = storeys(style);
    for (let k = 0; k < n; k++) {
      const z0 = k * STOREY_PX;
      const leftBusy = k === 0 && (part === 'door' || part === 'front' || part === 'poster');
      for (const side of ['L', 'R'] as const) {
        if (side === 'L' && leftBusy) continue;
        if (theme === 'dunes' && style === 'tower') s += rackBay(cx, cy, side, z0, k);
        else if (monumental) s += slimWindow(cx, cy, side, 0.26, 0.4, z0) + slimWindow(cx, cy, side, 0.6, 0.74, z0);
        else s += windowModule(cx, cy, side, 1, 0, z0);
      }
    }
    if (part.startsWith('wall') && part.includes('L')) s += banner(cx, cy, 'L', h);
    if (part.startsWith('wall') && part.includes('R')) s += banner(cx, cy, 'R', h);
    if (part === 'door') {
      const o = doorFor(style, theme, acc);
      if (theme === 'port') s += hangarDoor(cx, cy, acc, o);
      else if (theme === 'dunes') s += archedDoor(cx, cy, acc, o);
      else s += doorUnit(cx, cy, 0, 1, acc, o);
      if (style === 'shop') s += neonSign(cx, cy, 0.12, 0.88, DOOR_H + 10, DOOR_H + 22, acc, 'OUVERT');
      if (theme === 'grove') s += lantern(...pt(cx, cy, 0.02, 1.04, DOOR_H + 12)) + lantern(...pt(cx, cy, 0.98, 1.04, DOOR_H + 12));
    } else if (part === 'front') s += vitrine(cx, cy, acc);
    else if (part === 'poster') s += poster(cx, cy);
    // Hugging Grove: leaves spill over the cornice, always at the same two spots per tile
    if (theme === 'grove') s += foliage(...pt(cx, cy, 0.22, 1, h - 4)) + foliage(...pt(cx, cy, 0.72, 1, h - 2), 0.8) + foliage(...pt(cx, cy, 1, 0.4, h - 3), 0.8);
    s += rooftop(cx, cy, h, part, style, theme);
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

/** Pitched roof tile: facade below the eave (same modules), slate or green slopes with regular courses, gable end. */
function roofBody(style: Style, shape: RoofShape, theme: Theme, acc: AccentTone): Draw {
  return (cx, cy) => {
    const m = materialOf(style, theme);
    const rp = roofPalOf(theme);
    const prof = profile(shape);
    const zFront = prof[prof.length - 1]![1];
    // facade part (visible when nothing stands in front / at the gable end)
    let s = faces(cx, cy, WALL_H, m, false) + skin(cx, cy, style, theme, WALL_H) + dress(cx, cy, WALL_H, acc);
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
        // green roof: blooms on the slope, leaves spilling over the eave and a lantern under it, same spots on every tile
        for (const [a, t, c] of [[0.3, 0.4, P.pinkL], [0.72, 0.65, P.yellow]] as const) {
          const [x, y] = pt(cx, cy, a, b0 + (b1 - b0) * t, z0 + (z1 - z0) * t);
          s += ellipse(x, y - 1, 2.6, 1.6, c, false);
        }
        s += foliage(...pt(cx, cy, 0.2, b1, z1 - 1)) + foliage(...pt(cx, cy, 0.78, b1, z1 - 1), 0.85);
        s += lantern(...pt(cx, cy, 0.5, b1, z1 - 1));
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

/** Dunes: a rounded earthen rim along the outer top edges (thick round stroke over an ink stroke). */
function roundRim(cx: number, cy: number, h: number, mask: number, tone: string): string {
  const segs: [V3, V3][] = [];
  if (!(mask & MN)) segs.push([[-X, 0, h], [1, 0, h]]);
  if (!(mask & MW)) segs.push([[0, -X, h], [0, 1, h]]);
  if (!(mask & MS)) segs.push([[-X, 1, h], [1, 1, h]]);
  if (!(mask & ME)) segs.push([[1, -X, h], [1, 1, h]]);
  const d = segs.map(([p, q]) => seg(cx, cy, p, q)).join('');
  if (!d) return '';
  const corners: V3[] = [];
  if (!(mask & MS) && !(mask & ME)) corners.push([1, 1, h]);
  if (!(mask & MS) && !(mask & MW)) corners.push([0, 1, h]);
  if (!(mask & MN) && !(mask & ME)) corners.push([1, 0, h]);
  if (!(mask & MN) && !(mask & MW)) corners.push([0, 0, h]);
  let s = `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="10" stroke-linecap="butt"/>`;
  for (const c of corners) s += circle(...pt(cx, cy, ...c), 5, P.ink, false);
  s += `<path d="${d}" fill="none" stroke="${tone}" stroke-width="6.4" stroke-linecap="butt"/>`;
  for (const c of corners) s += circle(...pt(cx, cy, ...c), 3.2, tone, false);
  return s;
}

/** Hugging Grove cabins: round log ends stacked at the outer corners. */
function logEnds(cx: number, cy: number, h: number, mask: number): string {
  const corners: [number, number][] = [];
  if (!(mask & MS) && !(mask & ME)) corners.push([1, 1]);
  if (!(mask & MS) && !(mask & MW)) corners.push([0, 1]);
  if (!(mask & MN) && !(mask & ME)) corners.push([1, 0]);
  let s = '';
  for (const [a, b] of corners)
    for (let z = SOCLE_PX + 6; z < h - 4; z += 12) {
      const [x, y] = pt(cx, cy, a, b, z);
      s += circle(x, y, 5.2, P.woodL) + circle(x, y, 2.2, 'none', false).replace('fill="none"', `fill="none" stroke="${P.woodD}" stroke-width="1"`);
    }
  return s;
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
  const h = g.h + rimPx(g.rim);
  return { up: g.up, draw: (cx, cy) => cuboidShadow(cx, cy, 0, 1, 0, 1, h, g.shadow, g.sd[0], g.sd[1]) };
}

// ---------- key -> art ----------

function upOf(geom: Geom): number {
  return geom.startsWith('rf-') ? ROOF_UP : GEOMS[geom as keyof typeof GEOMS].up;
}

const geomFor = (style: Style, part: string, theme: Theme): Geom => geomOf(style, theme, part);

function edgeDraw(geom: Geom, mask: number): Draw {
  if (geom.startsWith('rf-')) return (cx, cy) => roofEdges(cx, cy, geom.slice(3) as RoofShape, mask);
  const g = GEOMS[geom as keyof typeof GEOMS];
  return (cx, cy) => {
    const e = cuboidEdges(cx, cy, g.h, mask);
    if (g.rim === 'parapet') return e + parapet(cx, cy, g.h, mask);
    if (g.rim === 'round') return e + roundRim(cx, cy, g.h, mask, geom === 'sdt' ? MATERIALS.sand.right : ADOBE.right);
    if (g.rim === 'log') return e + logEnds(cx, cy, g.h, mask);
    return e;
  };
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
