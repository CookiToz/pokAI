// Thin wall slabs (riso isometric). A slab is a union of up to five axis-aligned boxes laid out on a 3x3 grid inside the
// tile: a centre pillar plus one arm per connected neighbour (see world/engine/walls.ts for the selection rules).
// Cells are painted back to front; every cell draws its own fills, its own ink edges and then the decoration of the
// face runs it terminates, so nearer cells correctly cover farther ones.
import { ALL_MASKS, E, LOW_MASKS, N, S, W, hasFullFace, variantName } from '../engine/walls';
import { DOOR_H, DOOR_U0, DOOR_U1, SILL_PX, STOREY_PX, WINDOW_H, P, circle, cuboidShadow, lcell, leftPlaneG, line3, poly3, pt, rcell, rightPlaneG, stroke, text, tileEntry, type ArtEntry } from './kit';

type Draw = (cx: number, cy: number) => string;

/** Slab thickness as a fraction of a tile (the task asks for 22-30%). */
export const SLAB_T = 0.28;
const LO = 0.5 - SLAB_T / 2;
const HI = 0.5 + SLAB_T / 2;
const B = [0, LO, HI, 1] as const;
const LOW_H = 10;

interface Pal {
  top: string;
  left: string;
  right: string;
  shadow?: string;
  /** Hard offset shadow, px. */
  sd?: readonly [number, number];
}

/** One visible planar face run; `u` runs viewer-left to viewer-right (on right faces u = 1 - b). */
interface Run {
  side: 'left' | 'right';
  plane: number;
  u0: number;
  u1: number;
}

interface Ctx {
  cx: number;
  cy: number;
  h: number;
  run: Run;
  /** The run spans the whole tile: windows, stencils and posters only go on such runs. */
  full: boolean;
  quad(u0: number, u1: number, z0: number, z1: number, fill: string, outline?: boolean): string;
  line(u0: number, u1: number, z: number, color: string, w?: number): string;
  vline(u: number, z0: number, z1: number, color: string, w?: number): string;
  at(u: number, z: number): [number, number];
  plane(u: number, zTop: number, inner: string): string;
  /** `left` / `right` shade picker. */
  shade<T>(l: T, r: T): T;
}

type Decor = (c: Ctx) => string;

function makeCtx(cx: number, cy: number, h: number, run: Run): Ctx {
  const L = run.side === 'left';
  const cl = (u0: number, u1: number): [number, number] => [Math.max(u0, run.u0), Math.min(u1, run.u1)];
  return {
    cx, cy, h, run,
    full: run.u0 <= 0 && run.u1 >= 1,
    quad(u0, u1, z0, z1, fill, outline = false) {
      const [a, b] = cl(u0, u1);
      if (b - a < 0.005) return '';
      return L ? lcell(cx, cy, run.plane, a, b, z0, z1, fill, outline) : rcell(cx, cy, run.plane, 1 - a, 1 - b, z0, z1, fill, outline);
    },
    line(u0, u1, z, color, w = 1.4) {
      const [a, b] = cl(u0, u1);
      if (b - a < 0.005) return '';
      return L ? line3(cx, cy, [[a, run.plane, z], [b, run.plane, z]], color, w) : line3(cx, cy, [[run.plane, 1 - a, z], [run.plane, 1 - b, z]], color, w);
    },
    vline(u, z0, z1, color, w = 1.4) {
      if (u < run.u0 + 0.02 || u > run.u1 - 0.02) return '';
      return L ? line3(cx, cy, [[u, run.plane, z0], [u, run.plane, z1]], color, w) : line3(cx, cy, [[run.plane, 1 - u, z0], [run.plane, 1 - u, z1]], color, w);
    },
    at: (u, z) => (L ? pt(cx, cy, u, run.plane, z) : pt(cx, cy, run.plane, 1 - u, z)),
    plane: (u, zTop, inner) => (L ? leftPlaneG(cx, cy, u, run.plane, zTop, inner) : rightPlaneG(cx, cy, run.plane, 1 - u, zTop, inner)),
    shade: (l, r) => (L ? l : r),
  };
}

/** Render a slab for `mask` (N=1, E=2, S=4, W=8). */
function slab(cx: number, cy: number, mask: number, h: number, pal: Pal, decor?: Decor): string {
  const occ = (ia: number, ib: number): boolean => {
    if (ia < 0 || ib < 0 || ia > 2 || ib > 2) return false;
    if (ia === 1 && ib === 1) return true;
    if (ib === 1) return ia === 0 ? !!(mask & W) : !!(mask & E);
    if (ia === 1) return ib === 0 ? !!(mask & N) : !!(mask & S);
    return false;
  };
  const cells: [number, number][] = [];
  for (let ia = 0; ia < 3; ia++) for (let ib = 0; ib < 3; ib++) if (occ(ia, ib)) cells.push([ia, ib]);
  cells.sort((p, q) => p[0] + p[1] - (q[0] + q[1]));

  // face runs (decoration targets), keyed by the cell that ends them in painter order
  const endsRun = new Map<string, Run[]>();
  const addRun = (key: string, r: Run): void => {
    const l = endsRun.get(key);
    if (l) l.push(r);
    else endsRun.set(key, [r]);
  };
  for (let ib = 0; ib < 3; ib++) {
    let start = -1;
    for (let ia = 0; ia <= 3; ia++) {
      const vis = ia < 3 && occ(ia, ib) && !occ(ia, ib + 1);
      if (vis && start < 0) start = ia;
      if (!vis && start >= 0) {
        addRun(`${ia - 1},${ib}`, { side: 'left', plane: B[ib + 1]!, u0: B[start]!, u1: B[ia]! });
        start = -1;
      }
    }
  }
  for (let ia = 0; ia < 3; ia++) {
    let start = -1;
    for (let ib = 0; ib <= 3; ib++) {
      const vis = ib < 3 && occ(ia, ib) && !occ(ia + 1, ib);
      if (vis && start < 0) start = ib;
      if (!vis && start >= 0) {
        addRun(`${ia},${ib - 1}`, { side: 'right', plane: B[ia + 1]!, u0: 1 - B[ib]!, u1: 1 - B[start]! });
        start = -1;
      }
    }
  }

  let s = '';
  if (pal.shadow) {
    const [dx, dy] = pal.sd ?? [5, 4];
    for (const [ia, ib] of cells) s += cuboidShadow(cx, cy, B[ia]!, B[ia + 1]!, B[ib]!, B[ib + 1]!, h, pal.shadow, dx, dy);
  }
  const sealed = (f: string): string => `stroke="${f}" stroke-width="1" stroke-linejoin="round"`;
  for (const [ia, ib] of cells) {
    const a0 = B[ia]!, a1 = B[ia + 1]!, b0 = B[ib]!, b1 = B[ib + 1]!;
    const leftVis = !occ(ia, ib + 1);
    const rightVis = !occ(ia + 1, ib);
    if (leftVis) s += poly3(cx, cy, [[a0, b1, 0], [a1, b1, 0], [a1, b1, h], [a0, b1, h]], pal.left, false, sealed(pal.left));
    if (rightVis) s += poly3(cx, cy, [[a1, b1, 0], [a1, b0, 0], [a1, b0, h], [a1, b1, h]], pal.right, false, sealed(pal.right));
    s += poly3(cx, cy, [[a0, b0, h], [a1, b0, h], [a1, b1, h], [a0, b1, h]], pal.top, false, sealed(pal.top));
    // ink edges of this cell
    let d = '';
    const seg = (pa: number, pb: number, pz: number, qa: number, qb: number, qz: number): void => {
      const [x0, y0] = pt(cx, cy, pa, pb, pz);
      const [x1, y1] = pt(cx, cy, qa, qb, qz);
      d += `M${x0.toFixed(1)},${y0.toFixed(1)}L${x1.toFixed(1)},${y1.toFixed(1)}`;
    };
    if (!occ(ia, ib - 1)) seg(a0, b0, h, a1, b0, h);
    if (!occ(ia - 1, ib)) seg(a0, b0, h, a0, b1, h);
    if (leftVis) {
      seg(a0, b1, h, a1, b1, h);
      seg(a0, b1, 0, a1, b1, 0);
      if (!(occ(ia - 1, ib) && !occ(ia - 1, ib + 1))) seg(a0, b1, 0, a0, b1, h);
      if (!(occ(ia + 1, ib) && !occ(ia + 1, ib + 1))) seg(a1, b1, 0, a1, b1, h);
    }
    if (rightVis) {
      seg(a1, b0, h, a1, b1, h);
      seg(a1, b0, 0, a1, b1, 0);
      if (!(occ(ia, ib + 1) && !occ(ia + 1, ib + 1))) seg(a1, b1, 0, a1, b1, h);
      if (!(occ(ia, ib - 1) && !occ(ia + 1, ib - 1))) seg(a1, b0, 0, a1, b0, h);
    }
    s += `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (decor) for (const run of endsRun.get(`${ia},${ib}`) ?? []) s += decor(makeCtx(cx, cy, h, run));
  }
  return s;
}

// ---------- decoration ----------

/** Dark cap band of the cut-down near-camera slab. */
const lowCap: Decor = (c) => c.quad(0, 1, LOW_H - 3, LOW_H, P.ink2);

const ROOM_H = STOREY_PX;
const roomPal: Pal = { top: '#d4cfe8', left: '#b9b3d6', right: '#9892bb' };

function roomDecor(window: boolean): Decor {
  return (c) => {
    let s = c.quad(0, 1, 0, 6, c.shade(P.lav2, P.ink3)) + c.line(0, 1, 6, P.ink, 1.4);
    if (window && c.full) {
      s += c.quad(0.22, 0.78, SILL_PX, SILL_PX + WINDOW_H + 8, P.blueL, true) + c.quad(0.28, 0.5, SILL_PX + 4, SILL_PX + WINDOW_H + 4, P.waterL) + c.quad(0.18, 0.82, SILL_PX - 4, SILL_PX, P.paper, true);
      if (c.run.side === 'left') {
        const [sx, sy] = c.at(0.5, SILL_PX + 24);
        s += circle(sx - 4, sy - 7, 3, P.yellow, false);
      }
    }
    return s;
  };
}

const PRISON_H = 96;
const prisonPal: Pal = { top: '#9a9ebb', left: '#7c80a0', right: '#646988', shadow: P.pink, sd: [4, 3] };
const prisonDecor: Decor = (c) => {
  let s = c.quad(0, 1, 0, 5, c.shade(P.yellow, P.yellowD));
  if (c.run.side === 'left') for (const u of [0.15, 0.4, 0.65, 0.9]) s += c.quad(u - 0.03, u + 0.03, 0, 5, P.ink);
  s += c.line(0, 1, 48, '#555a78', 1.6);
  if (c.full) {
    s += c.vline(0.5, 48, PRISON_H, '#555a78', 1.4);
    for (const [u, z] of [[0.1, 62], [0.9, 62], [0.1, 84], [0.9, 84], [0.4, 28], [0.6, 28]] as const) {
      const [x, y] = c.at(u, z);
      s += circle(x, y, 1, '#555a78', false);
    }
  }
  return s;
};

const CONCRETE_H = 84;
const concretePal: Pal = { top: P.concreteL, left: P.concrete, right: P.concreteD, shadow: P.blue, sd: [4, 3] };
const concreteDecor: Decor = (c) => {
  let s = '';
  for (const z of [27, 55]) s += c.line(0, 1, z, c.shade(P.concreteD, '#706e83'), 1.3);
  if (c.full) {
    s += c.vline(0.5, 0, CONCRETE_H, c.shade(P.concreteD, '#706e83'), 1.3);
    for (const [u, z] of [[0.15, 13], [0.85, 13], [0.15, 69], [0.85, 69]] as const) {
      const [x, y] = c.at(u, z);
      s += circle(x, y, 1, P.concreteD, false);
    }
    if (c.run.side === 'left') s += c.quad(0.62, 0.7, 8, 48, '#9d9bb0');
  }
  return s;
};

const AIACT_H = STOREY_PX;
const aiactPal: Pal = { top: '#c4c2d0', left: '#a7a5b6', right: '#85839a', shadow: P.red, sd: [5, 4] };
const aiactBase: Decor = (c) => {
  let s = c.quad(0, 1, 0, 6, c.shade(P.ink2, P.ink)) + c.line(0, 1, AIACT_H - 12, '#706e83', 1.5);
  for (const u of c.run.side === 'left' ? [0.22, 0.5, 0.78] : [0.3, 0.7]) s += c.quad(u - 0.04, u + 0.04, AIACT_H - 9, AIACT_H - 3, P.ink);
  return s;
};
const aiactDecor: Decor = (c) => {
  let s = aiactBase(c);
  if (!c.full) return s;
  if (c.run.side === 'left') {
    s += c.quad(0.04, 0.96, 26, 56, P.ink2);
    s += c.plane(0.04, 56, text(15.4, -9, 8.4, P.red, 'CONFORME', 'middle', `textLength="29" lengthAdjust="spacingAndGlyphs"`));
  } else {
    s += c.quad(0.1, 0.9, 26, 38, P.red);
    for (const u of [0.25, 0.5, 0.75]) s += c.quad(u - 0.04, u + 0.04, 29, 35, P.paper);
  }
  return s;
};
const doorDecor: Decor = (c) => {
  let s = aiactBase(c);
  if (!c.full) return s;
  const u0 = DOOR_U0;
  const u1 = DOOR_U1;
  const um = (u0 + u1) / 2;
  s += c.quad(u0 - 0.03, u1 + 0.03, 0, DOOR_H + 3, P.ink, true) + c.quad(u0 + 0.03, um - 0.02, 0, DOOR_H - 2, '#5b5f7e') + c.quad(um + 0.02, u1 - 0.03, 0, DOOR_H - 2, '#5b5f7e');
  s += c.quad(u0 + 0.06, um - 0.05, 6, 12, P.yellow) + c.quad(um + 0.05, u1 - 0.06, 6, 12, P.yellow);
  s += c.quad(um - 0.03, um - 0.01, 30, 42, P.paper) + c.quad(um + 0.01, um + 0.03, 30, 42, P.paper);
  const [x, y] = c.at(0.5, DOOR_H + 11);
  return s + circle(x, y, 5.5, P.red) + stroke(`M${x - 2.8},${y - 2.8} l5.6,5.6 M${x + 2.8},${y - 2.8} l-5.6,5.6`, P.paper, 1.4);
};

/** A conformity poster hanging on a wall slab (the base family's decoration is replaced by the poster). */
function posterDecor(base: Decor): Decor {
  return (c) => {
    let s = base(c);
    if (!c.full) return s;
    s += c.quad(0.14, 0.86, 26, 78, P.steelL, true) + c.quad(0.2, 0.8, 26, 30, P.steelD);
    const [mx, my] = c.at(0.5, 54);
    s += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="9" fill="none" stroke="${P.red}" stroke-width="3"/>`;
    s += stroke(`M${mx - 6},${my - 6} L${mx + 6},${my + 6} M${mx + 6},${my - 6} L${mx - 6},${my + 6}`, P.red, 2.6);
    return s;
  };
}

interface Family {
  h: number;
  up: number;
  pal: Pal;
  decor: Decor;
}
const FAMILIES: Readonly<Record<'wall' | 'prison_wall' | 'concrete_wall' | 'aiact_wall', Family>> = {
  wall: { h: ROOM_H, up: ROOM_H + 14, pal: roomPal, decor: roomDecor(false) },
  prison_wall: { h: PRISON_H, up: PRISON_H + 8, pal: prisonPal, decor: prisonDecor },
  concrete_wall: { h: CONCRETE_H, up: CONCRETE_H + 8, pal: concretePal, decor: concreteDecor },
  aiact_wall: { h: AIACT_H, up: AIACT_H + 10, pal: aiactPal, decor: aiactDecor },
};

/** Low (cut-down) variants darken the sides slightly less and add a cap; no shadow. */
const lowPal = (p: Pal): Pal => ({ top: P.ink3, left: p.left, right: p.right });

export function thinWallEntries(): ArtEntry[] {
  const out: ArtEntry[] = [];
  const add = (key: string, up: number, draw: Draw): void => {
    out.push(tileEntry(key, up, draw));
  };
  for (const [name, f] of Object.entries(FAMILIES) as [keyof typeof FAMILIES, Family][]) {
    for (const m of ALL_MASKS) add(`${name}:${variantName(m)}`, f.up, (cx, cy) => slab(cx, cy, m, f.h, f.pal, f.decor));
    for (const m of LOW_MASKS) add(`${name}:${variantName(m)}:low`, 20, (cx, cy) => slab(cx, cy, m, LOW_H, lowPal(f.pal), lowCap));
  }
  // decorated variants only exist where a full-width face is visible; other masks fall back to the base family
  for (const m of ALL_MASKS) {
    if (!hasFullFace(m)) continue;
    const v = variantName(m);
    add(`wall_window:${v}`, ROOM_H + 14, (cx, cy) => slab(cx, cy, m, ROOM_H, roomPal, roomDecor(true)));
    add(`aiact_door:${v}`, AIACT_H + 10, (cx, cy) => slab(cx, cy, m, AIACT_H, aiactPal, doorDecor));
    for (const [name, f] of Object.entries(FAMILIES) as [keyof typeof FAMILIES, Family][])
      add(`poster_aiact:${name}:${v}`, f.up, (cx, cy) => slab(cx, cy, m, f.h, f.pal, posterDecor(f.decor)));
  }
  return out;
}
