// Tiny SVG toolkit for the isometric world art. Everything is flat fills + ink outlines (riso style).
// Tile-local coordinates: (a, b) in [0,1]^2, a runs along +gx (screen down-right), b along +gy (screen down-left),
// z is the height in px above the ground. The ground diamond is centred on (cx, cy).

export const P = {
  paper: '#f4efe4',
  paper2: '#e9e1d0',
  paper3: '#d6ccb4',
  ink: '#1d1a2b',
  ink2: '#3a3550',
  ink3: '#6e6888',
  lav: '#a39dc0',
  lav2: '#8a84a8',
  pink: '#ff48b0',
  pinkL: '#ff9ad2',
  blue: '#0078bf',
  blueL: '#5cb8ee',
  blueD: '#005f99',
  yellow: '#ffd23f',
  yellowD: '#e0a91a',
  teal: '#00a095',
  tealD: '#007a72',
  tealL: '#45cfc4',
  orange: '#ff6c2f',
  orangeD: '#d9501a',
  red: '#e0283c',
  redD: '#a91c2c',
  redL: '#f2596a',
  steel: '#8c93a3',
  steelD: '#6b7282',
  steelL: '#b3b9c6',
  purple: '#7a4fd6',
  purpleD: '#5a38a8',
  purpleL: '#a384ee',
  grassA: '#8fd69a',
  grassB: '#84cf90',
  grassD: '#3f9a62',
  leaf: '#2fbf71',
  leafL: '#5bd68f',
  leafD: '#1f8f55',
  leafDD: '#16693f',
  path: '#f1dfb0',
  pathD: '#d9bf84',
  sand: '#f7e6b0',
  sandD: '#e2c97f',
  water: '#3fb0e6',
  waterD: '#1d8fd0',
  waterL: '#a8e0f8',
  wood: '#c98f56',
  woodD: '#9c6a3a',
  woodL: '#e0ad78',
  floorWood: '#f0c987',
  floorWoodD: '#d9a85c',
  lab: '#e3edf2',
  labD: '#c6d6df',
  // v0.3 city
  asphalt: '#4a4663',
  asphaltL: '#5d5879',
  asphaltD: '#383451',
  slab: '#d9d4e4',
  slabD: '#bdb7cf',
  glass: '#7fd0ee',
  glassL: '#bdeaf8',
  glassD: '#3d9fd0',
  glassN: '#2a5f9e',
  concrete: '#b9b7c4',
  concreteD: '#908ea1',
  concreteL: '#d3d1dc',
  gpu: '#6fc23a',
  gpuD: '#4d9524',
  neon: '#3df0e0',
  night: '#25223c',
} as const;

// ---------- scale reference (single source of truth for building / prop proportions) ----------
// Characters are 48x68 px with the feet at the tile centre; a tile is 64x32. Everything built is measured against CHAR_H.
/** Character height in px (feet to head top). */
export const CHAR_H = 68;
/** One building storey (floor to floor): 1.5 x a person. Houses are 1 storey, towers 3+. */
export const STOREY_PX = Math.round(CHAR_H * 1.5);
/** Doors are slightly taller than people: 1.15 x CHAR_H. */
export const DOOR_H = Math.round(CHAR_H * 1.15);
/** Door width as a fraction of a tile face (0.8 -> about 26 px on screen, a bit wider than a person's shoulders). */
export const DOOR_W = 0.8;
export const DOOR_U0 = (1 - DOOR_W) / 2;
export const DOOR_U1 = 1 - DOOR_U0;
/** Window sill height and window height inside a storey. */
export const SILL_PX = 38;
export const WINDOW_H = 30;
/** Signs standing above the door: sign board height. */
export const SIGN_PX = 26;
/** Street furniture: bench seat is knee-high, a lamp post about twice a person, a vending machine a bit taller than a person. */
export const BENCH_PX = 26;
export const LAMP_PX = CHAR_H * 2;
export const VENDING_PX = Math.round(CHAR_H * 1.2);

export const OUT = `stroke="${P.ink}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;

export type V3 = readonly [number, number, number];

/** Tile-local point -> SVG point. */
export function pt(cx: number, cy: number, a: number, b: number, z = 0): [number, number] {
  return [cx + (a - b) * 32, cy + (a + b - 1) * 16 - z];
}

const fmt = (n: number): string => (Math.round(n * 100) / 100).toString();
const list = (ps: readonly (readonly [number, number])[]): string => ps.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ');

/** Polygon from tile-local vertices. */
export function poly3(cx: number, cy: number, vs: readonly V3[], fill: string, outline = true, extra = ''): string {
  const ps = vs.map(([a, b, z]) => pt(cx, cy, a, b, z));
  return `<polygon points="${list(ps)}" fill="${fill}" ${outline ? OUT : ''} ${extra}/>`;
}

/** Polyline (open path) from tile-local vertices. */
export function line3(cx: number, cy: number, vs: readonly V3[], stroke: string, width = 2): string {
  const ps = vs.map(([a, b, z]) => pt(cx, cy, a, b, z));
  return `<polyline points="${list(ps)}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

export function poly(ps: readonly (readonly [number, number])[], fill: string, outline = true, extra = ''): string {
  return `<polygon points="${list(ps)}" fill="${fill}" ${outline ? OUT : ''} ${extra}/>`;
}

export function rect(x: number, y: number, w: number, h: number, fill: string, r = 0, outline = true): string {
  return `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${r}" fill="${fill}" ${outline ? OUT : ''}/>`;
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, fill: string, outline = true): string {
  return `<ellipse cx="${fmt(cx)}" cy="${fmt(cy)}" rx="${fmt(rx)}" ry="${fmt(ry)}" fill="${fill}" ${outline ? OUT : ''}/>`;
}

export function circle(cx: number, cy: number, r: number, fill: string, outline = true): string {
  return `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="${fill}" ${outline ? OUT : ''}/>`;
}

export function path(d: string, fill: string, outline = true, extra = ''): string {
  return `<path d="${d}" fill="${fill}" ${outline ? OUT : ''} ${extra}/>`;
}

export function stroke(d: string, color: string, width = 2): string {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

export function svgDoc(w: number, h: number, body: string, scale = 2): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * scale}" height="${h * scale}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

export interface Faces {
  top: string;
  left: string;
  right: string;
}

/** The three visible faces of a raised block of height `h`. Returns separate strings so decorations can be inserted. */
export function blockParts(cx: number, cy: number, h: number, f: Faces): { left: string; right: string; top: string } {
  return {
    left: poly3(cx, cy, [[0, 1, 0], [1, 1, 0], [1, 1, h], [0, 1, h]], f.left),
    right: poly3(cx, cy, [[1, 1, 0], [1, 0, 0], [1, 0, h], [1, 1, h]], f.right),
    top: poly3(cx, cy, [[0, 0, h], [1, 0, h], [1, 1, h], [0, 1, h]], f.top),
  };
}

/** Rectangle drawn on the left face (u runs viewer-left to viewer-right, z in px). */
export function leftQuad(cx: number, cy: number, u0: number, u1: number, z0: number, z1: number, fill: string, outline = true): string {
  return poly3(cx, cy, [[u0, 1, z0], [u1, 1, z0], [u1, 1, z1], [u0, 1, z1]], fill, outline);
}

/** Rectangle drawn on the right face (u runs viewer-left (near corner) to viewer-right). */
export function rightQuad(cx: number, cy: number, u0: number, u1: number, z0: number, z1: number, fill: string, outline = true): string {
  return poly3(cx, cy, [[1, 1 - u0, z0], [1, 1 - u1, z0], [1, 1 - u1, z1], [1, 1 - u0, z1]], fill, outline);
}

/** Flat ground diamond, slightly oversized to hide seams between neighbours. */
export function groundDiamond(cx: number, cy: number, fill: string, grow = 1): string {
  return `<polygon points="${list([[cx, cy - 16 - grow / 2], [cx + 32 + grow, cy], [cx, cy + 16 + grow / 2], [cx - 32 - grow, cy]])}" fill="${fill}"/>`;
}

/** Hard offset "misregistration" shadow: the block hexagon, shifted, in a flat riso colour. */
export function blockShadow(cx: number, cy: number, h: number, color: string, dx = 4, dy = 3): string {
  const ps = [pt(cx, cy, 0, 0, h), pt(cx, cy, 1, 0, h), pt(cx, cy, 1, 0, 0), pt(cx, cy, 1, 1, 0), pt(cx, cy, 0, 1, 0), pt(cx, cy, 0, 1, h)];
  return `<polygon points="${list(ps.map(([x, y]) => [x + dx, y + dy] as const))}" fill="${color}" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
}

/** Plane parallel to the left face, at depth b (0 = back edge, 1 = front edge). */
export function planeB(cx: number, cy: number, b: number, u0: number, u1: number, z0: number, z1: number, fill: string, outline = true): string {
  return poly3(cx, cy, [[u0, b, z0], [u1, b, z0], [u1, b, z1], [u0, b, z1]], fill, outline);
}

/** One generated texture: logical size w x h, anchor (the tile centre / feet) at (w/2, anchorY). Rendered at 2x. */
export interface ArtEntry {
  key: string;
  w: number;
  h: number;
  anchorY: number;
  svg: string;
}

export const TILE_TEX_W = 80;
export const PAD_B = 5;

/** Texture for a tile: `up` px of room above the ground diamond top. */
export function tileEntry(key: string, up: number, draw: (cx: number, cy: number) => string, w = TILE_TEX_W): ArtEntry {
  const cx = w / 2;
  const cy = up + 16;
  const h = up + 32 + PAD_B;
  return { key, w, h, anchorY: cy, svg: svgDoc(w, h, draw(cx, cy)) };
}

/** Deterministic small hash -> [0,1). */
export function hash01(a: number, b: number, salt = 0): number {
  let h = (Math.imul(a + 1, 374761393) ^ Math.imul(b + 1, 668265263) ^ Math.imul(salt + 7, 2147483647)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------- v0.3 helpers: arbitrary cuboids, face cells and skewed planes ----------

/** Axis-aligned box in tile-local coordinates (a, b may lie outside [0,1] for multi-tile landmarks). */
export function cuboid(cx: number, cy: number, a0: number, a1: number, b0: number, b1: number, z0: number, z1: number, f: Faces, outline = true): string {
  return (
    poly3(cx, cy, [[a0, b1, z0], [a1, b1, z0], [a1, b1, z1], [a0, b1, z1]], f.left, outline) +
    poly3(cx, cy, [[a1, b1, z0], [a1, b0, z0], [a1, b0, z1], [a1, b1, z1]], f.right, outline) +
    poly3(cx, cy, [[a0, b0, z1], [a1, b0, z1], [a1, b1, z1], [a0, b1, z1]], f.top, outline)
  );
}

/** Hard offset shadow of a cuboid (silhouette hexagon shifted). */
export function cuboidShadow(cx: number, cy: number, a0: number, a1: number, b0: number, b1: number, z1: number, color: string, dx = 6, dy = 4): string {
  const ps = [pt(cx, cy, a0, b0, z1), pt(cx, cy, a1, b0, z1), pt(cx, cy, a1, b0, 0), pt(cx, cy, a1, b1, 0), pt(cx, cy, a0, b1, 0), pt(cx, cy, a0, b1, z1)];
  return `<polygon points="${list(ps.map(([x, y]) => [x + dx, y + dy] as const))}" fill="${color}" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
}

/** Cell on a plane facing +gy (the "left" face) at depth b; u along a. */
export function lcell(cx: number, cy: number, b: number, u0: number, u1: number, z0: number, z1: number, fill: string, outline = true): string {
  return poly3(cx, cy, [[u0, b, z0], [u1, b, z0], [u1, b, z1], [u0, b, z1]], fill, outline);
}
/** Cell on a plane facing +gx (the "right" face) at a; v along b. */
export function rcell(cx: number, cy: number, a: number, v0: number, v1: number, z0: number, z1: number, fill: string, outline = true): string {
  return poly3(cx, cy, [[a, v0, z0], [a, v1, z0], [a, v1, z1], [a, v0, z1]], fill, outline);
}

/** Group whose content (x right, y down, px) is skewed onto a plane facing +gy. Origin = point (a, b, zTop). */
export function leftPlaneG(cx: number, cy: number, a: number, b: number, zTop: number, inner: string): string {
  const [x, y] = pt(cx, cy, a, b, zTop);
  return `<g transform="translate(${fmt(x)} ${fmt(y)}) matrix(1 0.5 0 1 0 0)">${inner}</g>`;
}
/** Same for a plane facing +gx; content runs toward lower b. Origin = point (a, b, zTop) at the viewer-left edge. */
export function rightPlaneG(cx: number, cy: number, a: number, b: number, zTop: number, inner: string): string {
  const [x, y] = pt(cx, cy, a, b, zTop);
  return `<g transform="translate(${fmt(x)} ${fmt(y)}) matrix(1 -0.5 0 1 0 0)">${inner}</g>`;
}

/** Text (system monospace; used sparingly for signage). */
export function text(x: number, y: number, size: number, fill: string, str: string, anchor: 'start' | 'middle' | 'end' = 'middle', extra = ''): string {
  return `<text x="${fmt(x)}" y="${fmt(y)}" font-family="'DejaVu Sans Mono','Liberation Mono',monospace" font-weight="700" font-size="${size}" fill="${fill}" text-anchor="${anchor}" ${extra}>${str}</text>`;
}

/** Entry for a multi-tile landmark: sprite is centred on the anchor (front corner) tile; canvas is symmetric in x. */
export function landmarkCanvas(fw: number, fh: number, up: number, pad = 14): { w: number; h: number; cx: number; cy: number } {
  const w = 2 * Math.max(fw, fh) * 32 + 2 * pad;
  return { w, h: up + 16 + 14 + PAD_B, cx: w / 2, cy: up };
}

/** Group in tile units (1 = one tile) laid on a horizontal plane at height z; origin at tile-local (a, b). */
export function topPlaneG(cx: number, cy: number, a: number, b: number, z: number, inner: string): string {
  const [x, y] = pt(cx, cy, a, b, z);
  return `<g transform="translate(${fmt(x)} ${fmt(y)}) matrix(32 16 -32 16 0 0)">${inner}</g>`;
}

// ---------- doors (one door = one tile face: u in [DOOR_U0, DOOR_U1], DOOR_H tall) ----------

export interface DoorStyle {
  frame: string;
  leaf: string;
  /** Glass pane in the upper part of the leaf. */
  glass?: string;
  handle?: string;
  mat?: string;
  /** Double leaf (a seam in the middle). */
  split?: boolean;
  /** Small kick plate / push bar colour. */
  bar?: string;
}

/** A door on the +gy ("left") face of the tile at plane b = 1: frame, leaf(s), handle and a doormat on the ground in front. */
export function doorLeft(cx: number, cy: number, st: DoorStyle, u0 = DOOR_U0, u1 = DOOR_U1, h = DOOR_H, b = 1): string {
  const w = u1 - u0;
  let s = '';
  s += poly3(cx, cy, [[u0 - 0.04, b, 0], [u1 + 0.04, b, 0], [u1 + 0.04, b, h + 4], [u0 - 0.04, b, h + 4]], st.frame);
  const i0 = u0 + 0.05 * w;
  const i1 = u1 - 0.05 * w;
  s += poly3(cx, cy, [[i0, b, 0], [i1, b, 0], [i1, b, h - 1], [i0, b, h - 1]], st.leaf);
  if (st.glass) {
    const g0 = h * 0.42;
    const mid = (i0 + i1) / 2;
    const cells: [number, number][] = st.split ? [[i0 + 0.04, mid - 0.04], [mid + 0.04, i1 - 0.04]] : [[i0 + 0.06, i1 - 0.06]];
    for (const [a0, a1] of cells) s += poly3(cx, cy, [[a0, b, g0], [a1, b, g0], [a1, b, h - 8], [a0, b, h - 8]], st.glass, false);
  }
  if (st.split) s += line3(cx, cy, [[(i0 + i1) / 2, b, 0], [(i0 + i1) / 2, b, h - 1]], P.ink, 1.6);
  if (st.bar) s += poly3(cx, cy, [[i0, b, 6], [i1, b, 6], [i1, b, 12], [i0, b, 12]], st.bar, false);
  const hx = st.split ? (i0 + i1) / 2 - 0.07 : i1 - 0.12;
  s += poly3(cx, cy, [[hx, b, 34], [hx + 0.05, b, 34], [hx + 0.05, b, 40], [hx, b, 40]], st.handle ?? P.yellow, false);
  s += poly3(cx, cy, [[u0 - 0.08, b, 0], [u1 + 0.08, b, 0], [u1 + 0.08, b + 0.22, 0], [u0 - 0.08, b + 0.22, 0]], st.mat ?? P.paper3);
  return s;
}
