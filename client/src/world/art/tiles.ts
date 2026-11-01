// Isometric tile art as SVG strings (riso flat style: flat fills, 2px ink outlines, hard offset shadows).
import { TILE_NAMES, type TileName } from '../../data/tiles';
import { cityTileEntries } from './city';
import { landmarkEntries } from './landmarks';
import { landmark4Entries } from './landmarks4';
import { FOREST_VARIANTS, forestEntries } from './forest';
import { THEMED_VARIANTS, themedEntries } from './themed';
import { thinWallEntries } from './walls';
import {
  DOOR_H, LAMP_PX, SILL_PX, SIGN_PX, STOREY_PX, WINDOW_H, doorLeft,
  OUT, P, blockParts, blockShadow, circle, ellipse, groundDiamond, hash01, leftQuad, line3, path, planeB, poly, poly3, pt, rect, rightQuad,
  stroke, svgDoc, tileEntry, type ArtEntry, type V3,
} from './kit';

// ---------- palettes ----------

export type RoofColour = 'red' | 'blue' | 'grey' | 'hub' | 'store' | 'bench' | 'wood';
export const ROOF_COLOURS: readonly RoofColour[] = ['red', 'blue', 'grey', 'hub', 'store', 'bench', 'wood'];

interface RoofPal {
  base: string;
  light: string;
  dark: string;
  line: string;
}
const ROOF: Record<RoofColour, RoofPal> = {
  red: { base: P.red, light: P.redL, dark: P.redD, line: P.redD },
  blue: { base: P.blue, light: P.blueL, dark: P.blueD, line: P.blueD },
  grey: { base: P.steel, light: P.steelL, dark: P.steelD, line: P.steelD },
  hub: { base: P.yellow, light: '#ffe27a', dark: P.yellowD, line: P.yellowD },
  store: { base: P.teal, light: P.tealL, dark: P.tealD, line: P.tealD },
  bench: { base: P.purple, light: P.purpleL, dark: P.purpleD, line: P.purpleD },
  wood: { base: P.woodL, light: '#f0c987', dark: P.woodD, line: P.woodD },
};

export type RoofShape = 'single' | 'back' | 'front' | 'flat';
export const ROOF_SHAPES: readonly RoofShape[] = ['single', 'back', 'front', 'flat'];

/** Exterior walls are one storey tall; roofs sit just above and rise to a ridge. */
export const WALL_H = STOREY_PX;
export const ROOF_H = WALL_H + 14;
const RIDGE = 24;
/** Interior room walls: same storey height so doors, windows and furniture read at the same scale outdoors and in. */
export const ROOM_WALL_H = STOREY_PX;
const LOW_WALL_H = 10;

// ---------- flat ground ----------

function tuft(x: number, y: number, c: string, s = 1): string {
  return stroke(`M${x - 2 * s},${y} L${x - 3 * s},${y - 4 * s} M${x},${y} L${x},${y - 5 * s} M${x + 2 * s},${y} L${x + 3 * s},${y - 4 * s}`, c, 1.4);
}

/** Random-ish point inside the diamond (tile-local a, b in [0.2, 0.8]). */
function spot(cx: number, cy: number, v: number, i: number): [number, number] {
  return pt(cx, cy, 0.22 + hash01(v, i, 1) * 0.56, 0.22 + hash01(v, i, 2) * 0.56);
}

function grass(alt: boolean, v: number) {
  return (cx: number, cy: number): string => {
    let s = groundDiamond(cx, cy, alt ? P.grassB : P.grassA);
    const n = alt ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const [x, y] = spot(cx, cy, v + (alt ? 9 : 0), i);
      s += tuft(x, y, P.grassD);
    }
    if (alt) {
      const [x, y] = spot(cx, cy, v, 7);
      s += circle(x, y, 1.4, P.paper, false);
      const [x2, y2] = spot(cx, cy, v, 8);
      s += circle(x2, y2, 1.2, P.yellow, false);
    }
    return s;
  };
}

function pathTile(v: number) {
  return (cx: number, cy: number): string => {
    let s = groundDiamond(cx, cy, P.path);
    for (let i = 0; i < 3; i++) {
      const [x, y] = spot(cx, cy, v, i);
      s += ellipse(x, y, 2.4, 1.3, P.pathD, false);
    }
    // worn trail: a lighter centre strip and little grass tufts creeping in from the corners
    s += poly3(cx, cy, [[0.2, 0.34, 0], [0.8, 0.34, 0], [0.8, 0.66, 0], [0.2, 0.66, 0]], '#f7e9c3', false);
    for (const [a, b] of [[0.1, 0.1], [0.9, 0.9], [0.9, 0.1], [0.1, 0.9]] as const) {
      if (hash01(v, a * 10 + b * 7, 5) < 0.55) continue;
      const [x, y] = pt(cx, cy, a, b);
      s += tuft(x, y, P.grassD);
    }
    return s;
  };
}

function sandTile(v: number) {
  return (cx: number, cy: number): string => {
    let s = groundDiamond(cx, cy, P.sand);
    for (let i = 0; i < 5; i++) {
      const [x, y] = spot(cx, cy, v, i);
      s += circle(x, y, 1, P.sandD, false);
    }
    return s;
  };
}

function waterTile(edge: boolean, v: number) {
  return (cx: number, cy: number): string => {
    let s = groundDiamond(cx, cy, P.water);
    const [x, y] = spot(cx, cy, v, 3);
    s += stroke(`M${x - 6},${y} q3,-3 6,0 t6,0`, P.waterL, 1.8);
    if (edge) {
      s += line3(cx, cy, [[0.05, 0.05, 0], [0.95, 0.05, 0]], P.paper, 2.2);
      s += line3(cx, cy, [[0.05, 0.05, 0], [0.05, 0.95, 0]], P.paper, 2.2);
      s += stroke(`M${x - 5},${y + 7} q3,-3 6,0`, P.waterD, 1.6);
    } else {
      const [x2, y2] = spot(cx, cy, v, 5);
      s += stroke(`M${x2 - 4},${y2} q2,-2 4,0 t4,0`, P.waterD, 1.4);
      if (v === 1) {
        // lily pad with a pink bloom
        const [lx, ly] = pt(cx, cy, 0.62, 0.4);
        s += `<path d="M${lx},${ly} L${lx + 7},${ly - 2.4} A7.4,3.6 0 1 1 ${lx + 1},${ly - 3.8} Z" fill="${P.leaf}" stroke="${P.leafD}" stroke-width="1.2"/>`;
        s += circle(lx - 1, ly - 4.6, 1.8, P.pinkL, false) + circle(lx - 1, ly - 4.6, 0.7, P.yellow, false);
      } else if (v === 2) {
        const [rx, ry] = pt(cx, cy, 0.3, 0.62);
        s += stroke(`M${rx},${ry} l-1,-8 M${rx + 3},${ry} l1,-10 M${rx + 6},${ry} l2,-7`, P.leafD, 1.5) + ellipse(rx + 3, ry - 10.5, 1.2, 2.4, P.wood, false);
      }
    }
    return s;
  };
}

function planks(base: string, line: string) {
  return (cx: number, cy: number): string => {
    let s = groundDiamond(cx, cy, base);
    for (const b of [0.25, 0.5, 0.75]) s += line3(cx, cy, [[0.02, b, 0], [0.98, b, 0]], line, 1.4);
    s += line3(cx, cy, [[0.3, 0.25, 0], [0.3, 0.5, 0]], line, 1.2);
    s += line3(cx, cy, [[0.7, 0.5, 0], [0.7, 0.75, 0]], line, 1.2);
    return s;
  };
}

function labFloor(cx: number, cy: number): string {
  let s = groundDiamond(cx, cy, P.lab);
  s += line3(cx, cy, [[0.5, 0.02, 0], [0.5, 0.98, 0]], P.labD, 1.4);
  s += line3(cx, cy, [[0.02, 0.5, 0], [0.98, 0.5, 0]], P.labD, 1.4);
  const [x, y] = pt(cx, cy, 0.25, 0.25);
  s += circle(x, y, 1.3, P.blueL, false);
  return s;
}

function tileFloor(cx: number, cy: number): string {
  let s = groundDiamond(cx, cy, P.paper2);
  s += poly3(cx, cy, [[0, 0, 0], [0.5, 0, 0], [0.5, 0.5, 0], [0, 0.5, 0]], P.paper3, false);
  s += poly3(cx, cy, [[0.5, 0.5, 0], [1, 0.5, 0], [1, 1, 0], [0.5, 1, 0]], P.paper3, false);
  return s;
}

function carpet(cx: number, cy: number): string {
  let s = groundDiamond(cx, cy, P.pinkL);
  s += poly3(cx, cy, [[0.12, 0.12, 0], [0.88, 0.12, 0], [0.88, 0.88, 0], [0.12, 0.88, 0]], P.pink, false);
  s += poly3(cx, cy, [[0.3, 0.3, 0], [0.7, 0.3, 0], [0.7, 0.7, 0], [0.3, 0.7, 0]], P.pinkL, false);
  return s;
}

function exitMat(cx: number, cy: number): string {
  let s = groundDiamond(cx, cy, P.floorWoodD);
  s += poly3(cx, cy, [[0.08, 0.1, 0], [0.92, 0.1, 0], [0.92, 0.9, 0], [0.08, 0.9, 0]], P.yellow, true);
  // chevron pointing out of the room (+gy)
  s += poly3(cx, cy, [[0.3, 0.32, 0], [0.5, 0.32, 0], [0.7, 0.52, 0], [0.5, 0.72, 0], [0.3, 0.72, 0], [0.5, 0.52, 0]], P.orange, false);
  return s;
}

// ---------- cables (wild encounter zone) ----------

const CABLE_COLOURS = [P.pink, P.blue, P.yellow, P.orange, P.teal];

export function cableGround(v: number) {
  return (cx: number, cy: number): string => {
    let s = groundDiamond(cx, cy, P.grassB);
    for (let i = 0; i < 4; i++) {
      const [x, y] = spot(cx, cy, v + 20, i);
      s += stroke(`M${x - 5},${y} q3,-2 5,0 t5,0`, P.grassD, 1.3);
    }
    return s;
  };
}

/** A tangle of multicolour cables, anchored at its base (bottom centre). */
export function cableTuft(seed: number): ArtEntry {
  const w = 56;
  const h = 40;
  const bx = w / 2;
  const by = h - 5;
  let s = '';
  const n = 5;
  const loops: string[] = [];
  for (let i = 0; i < n; i++) {
    const colour = CABLE_COLOURS[(i + seed) % CABLE_COLOURS.length] as string;
    const ang = -1 + (2 * i) / (n - 1) + (hash01(seed, i, 3) - 0.5) * 0.4;
    const x0 = bx + ang * 4;
    const x1 = bx + ang * 20 + (hash01(seed, i, 4) - 0.5) * 6;
    const hh = 20 + hash01(seed, i, 5) * 12;
    const curl = (hash01(seed, i, 6) - 0.5) * 24;
    const y1 = by - hh * 0.55;
    const d = `M${x0},${by} C${x0 + curl},${by - hh * 1.5} ${x1 - curl},${by - hh * 1.3} ${x1},${y1}`;
    loops.push(`<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="5.2" stroke-linecap="round"/>`);
    loops.push(`<path d="${d}" fill="none" stroke="${colour}" stroke-width="2.6" stroke-linecap="round"/>`);
    // plug at the loose end
    loops.push(rect(x1 - 2, y1 - 1, 4, 5, P.paper, 1));
  }
  s += loops.join('');
  s += ellipse(bx, by + 1, 6, 2.4, P.ink, false);
  return { key: `cable_tuft:${seed}`, w, h, anchorY: by, svg: svgDoc(w, h, s) };
}

// ---------- props ----------

function blob(x: number, y: number, rx: number, ry: number, dark: string, mid: string, light: string): string {
  return ellipse(x, y, rx, ry, dark) + ellipse(x - 3, y - 3, rx - 4, ry - 4, mid, false) + ellipse(x - rx * 0.35, y - ry * 0.4, rx * 0.34, ry * 0.28, light, false);
}

function tree(cx: number, cy: number): string {
  let s = '';
  // pink misregistration shadow
  s += ellipse(cx + 9, cy + 3, 19, 7, P.blue, false);
  s += ellipse(cx + 3, cy - 46, 28, 17, P.pink, false);
  s += ellipse(cx + 3, cy - 68, 21, 14, P.pink, false);
  s += ellipse(cx + 3, cy - 88, 14, 11, P.pink, false);
  // trunk (a person fits under the first branches)
  s += poly([[cx - 6, cy + 5], [cx + 6, cy + 5], [cx + 4, cy - 40], [cx - 4, cy - 40]], P.wood);
  s += poly([[cx + 1, cy + 5], [cx + 6, cy + 5], [cx + 4, cy - 40], [cx + 1, cy - 40]], P.woodD, false);
  s += `<path d="M${cx - 6},${cy + 5} L${cx + 6},${cy + 5} L${cx + 4},${cy - 40} L${cx - 4},${cy - 40} Z" fill="none" ${OUT}/>`;
  s += blob(cx, cy - 48, 29, 18, P.leafD, P.leaf, P.leafL);
  s += blob(cx, cy - 70, 22, 15, P.leafD, P.leaf, P.leafL);
  s += blob(cx, cy - 90, 14, 11, P.leafD, P.leaf, P.leafL);
  return s;
}

function bush(cx: number, cy: number): string {
  let s = ellipse(cx + 6, cy + 4, 19, 7, P.blue, false);
  s += blob(cx - 10, cy - 4, 13, 10, P.leafD, P.leaf, P.leafL);
  s += blob(cx + 10, cy - 4, 13, 10, P.leafD, P.leaf, P.leafL);
  s += blob(cx, cy - 11, 14, 11, P.leafD, P.leaf, P.leafL);
  s += circle(cx - 6, cy - 6, 1.8, P.pink) + circle(cx + 8, cy - 9, 1.8, P.pink) + circle(cx + 3, cy - 1, 1.8, P.pink);
  return s;
}

function rock(cx: number, cy: number): string {
  let s = poly([[cx - 16 + 4, cy + 4 + 3], [cx + 18 + 4, cy + 3 + 3], [cx + 14 + 4, cy - 14 + 3], [cx - 12 + 4, cy - 16 + 3]], P.pink, false);
  s += poly([[cx - 17, cy + 4], [cx + 1, cy + 8], [cx + 1, cy - 8], [cx - 12, cy - 16], [cx - 17, cy - 6]], P.steelL);
  s += poly([[cx + 1, cy + 8], [cx + 18, cy + 3], [cx + 14, cy - 14], [cx + 1, cy - 8]], P.steelD);
  s += poly([[cx - 12, cy - 16], [cx + 1, cy - 8], [cx + 14, cy - 14], [cx + 2, cy - 20]], P.paper2);
  return s;
}

function flowers(cx: number, cy: number): string {
  let s = '';
  const cols = [P.pink, P.yellow, P.paper, P.orange, P.pinkL];
  for (let i = 0; i < 5; i++) {
    const [x, y] = pt(cx, cy, 0.2 + hash01(3, i, 1) * 0.6, 0.2 + hash01(3, i, 2) * 0.6);
    s += stroke(`M${x},${y} l0,-4`, P.leafD, 1.4);
    const c = cols[i % cols.length] as string;
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as const) s += circle(x + dx, y - 5 + dy, 1.7, c, false);
    s += circle(x, y - 5, 1.2, P.ink, false);
  }
  return s;
}

function sign(cx: number, cy: number): string {
  let s = ellipse(cx + 5, cy + 3, 12, 5, P.pink, false);
  s += rect(cx - 2.5, cy - 16, 5, 20, P.woodD, 1);
  const board = poly([[cx - 15, cy - 20], [cx + 15, cy - 20], [cx + 15, cy - 36], [cx - 15, cy - 36]], P.woodL);
  s += board;
  s += stroke(`M${cx - 9},${cy - 31} h18 M${cx - 9},${cy - 26} h12`, P.woodD, 1.8);
  return s;
}

function lamp(cx: number, cy: number): string {
  const L = LAMP_PX;
  let s = ellipse(cx + 5, cy + 3, 10, 4, P.blue, false);
  s += rect(cx - 7, cy - 4, 14, 8, P.ink3, 2);
  s += rect(cx - 2.5, cy - (L - 30), 5, L - 32, P.ink2, 1);
  s += poly([[cx - 11, cy - (L - 30)], [cx + 11, cy - (L - 30)], [cx + 8, cy - (L - 8)], [cx - 8, cy - (L - 8)]], P.yellow);
  s += poly([[cx - 9, cy - (L - 8)], [cx + 9, cy - (L - 8)], [cx, cy - L]], P.ink2);
  s += stroke(`M${cx - 4},${cy - (L - 36)} v10`, P.paper, 1.6);
  return s;
}

function fencePost(cx: number, cy: number): string {
  let s = ellipse(cx + 4, cy + 4, 7, 3, P.pink, false);
  s += rect(cx - 3, cy - 20, 6, 24, P.woodL, 1);
  s += poly([[cx - 3, cy - 20], [cx + 3, cy - 20], [cx, cy - 25]], P.woodL);
  return s;
}
function fenceRail(dir: 'x' | 'y') {
  return (cx: number, cy: number): string => {
    const [ex, ey] = dir === 'x' ? [cx + 32, cy + 16] : [cx - 32, cy + 16];
    let s = '';
    for (const z of [8, 16]) {
      s += `<path d="M${cx},${cy - z} L${ex},${ey - z}" stroke="${P.ink}" stroke-width="5" stroke-linecap="round"/>`;
      s += `<path d="M${cx},${cy - z} L${ex},${ey - z}" stroke="${P.woodL}" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    return s;
  };
}

function gpuCrate(cx: number, cy: number): string {
  const f = { top: P.ink3, left: P.ink2, right: P.ink };
  const b = blockParts(cx, cy, 24, f);
  let s = blockShadow(cx, cy, 24, P.pink) + b.left + b.right + b.top;
  s += leftQuad(cx, cy, 0.18, 0.82, 6, 18, P.leaf);
  s += leftQuad(cx, cy, 0.32, 0.68, 9, 15, P.ink, false);
  for (const u of [0.38, 0.5, 0.62]) s += leftQuad(cx, cy, u - 0.02, u + 0.02, 6.6, 8.6, P.yellow, false);
  s += line3(cx, cy, [[0.1, 0.1, 24], [0.9, 0.1, 24]], P.steel, 1.4) + line3(cx, cy, [[0.1, 0.9, 24], [0.9, 0.9, 24]], P.steel, 1.4);
  return s;
}

function posterAiact(cx: number, cy: number): string {
  let s = '';
  // posts and board on the plane b = 0.5
  s += line3(cx, cy, [[0.12, 0.5, 0], [0.12, 0.5, 84]], P.ink2, 4);
  s += line3(cx, cy, [[0.88, 0.5, 0], [0.88, 0.5, 84]], P.ink2, 4);
  s += poly3(cx, cy, [[0.1, 0.56, 5], [0.9, 0.56, 5], [0.9, 0.56, 5], [0.1, 0.56, 5]], P.pink, false);
  s += planeB(cx, cy, 0.5, 0.0, 1.0, 28, 84, P.steelL);
  // red "conformity" stamp: ring + cross
  const [mx, my] = pt(cx, cy, 0.5, 0.5, 56);
  s += `<circle cx="${mx}" cy="${my}" r="12" fill="none" stroke="${P.red}" stroke-width="3.4"/>`;
  s += stroke(`M${mx - 8},${my - 8} L${mx + 8},${my + 8} M${mx + 8},${my - 8} L${mx - 8},${my + 8}`, P.red, 3);
  s += planeB(cx, cy, 0.5, 0.12, 0.88, 28, 32, P.steelD, false);
  return s;
}

// ---------- blocks ----------

function plainBlock(h: number, f: { top: string; left: string; right: string }, shadow: string | null = P.pink, extra?: (cx: number, cy: number) => string) {
  return (cx: number, cy: number): string => {
    const b = blockParts(cx, cy, h, f);
    return (shadow ? blockShadow(cx, cy, h, shadow) : '') + b.left + b.right + b.top + (extra ? extra(cx, cy) : '');
  };
}

function ledge(cx: number, cy: number): string {
  const b = blockParts(cx, cy, 8, { top: P.grassA, left: P.pathD, right: P.sandD });
  return b.left + b.right + b.top;
}

function dock(cx: number, cy: number): string {
  const b = blockParts(cx, cy, 4, { top: P.woodL, left: P.woodD, right: P.wood });
  let s = b.left + b.right + b.top;
  for (const bb of [0.25, 0.5, 0.75]) s += line3(cx, cy, [[0.04, bb, 4], [0.96, bb, 4]], P.woodD, 1.3);
  return s;
}

// --- houses ---

function houseWall(c: RoofColour, kind: 'wall' | 'window' | 'door', style: 'house' | 'hub' | 'store' | 'bench' = 'house') {
  return (cx: number, cy: number): string => {
    const rp = ROOF[c];
    const wood = c === 'wood';
    const faceL = style === 'bench' ? P.lav : wood ? P.floorWood : P.paper2;
    const faceR = style === 'bench' ? P.lav2 : wood ? P.wood : P.paper3;
    const b = blockParts(cx, cy, WALL_H, { top: rp.base, left: faceL, right: faceR });
    let s = blockShadow(cx, cy, WALL_H, P.blue) + b.left + b.right + b.top;
    // eave strip
    s += line3(cx, cy, [[0, 1, WALL_H - 6], [1, 1, WALL_H - 6]], rp.dark, 1.6);
    s += line3(cx, cy, [[1, 1, WALL_H - 6], [1, 0, WALL_H - 6]], rp.dark, 1.6);
    // base stripe
    s += leftQuad(cx, cy, 0, 1, 0, 6, style === 'house' ? (wood ? P.woodD : P.paper3) : rp.light, false);
    s += rightQuad(cx, cy, 0, 1, 0, 6, style === 'house' ? (wood ? '#7d5430' : P.steelL) : rp.base, false);
    if (wood) for (const z of [30, 54, 78]) s += line3(cx, cy, [[0.02, 1, z], [0.98, 1, z]], P.woodD, 1.1) + line3(cx, cy, [[1, 0.98, z], [1, 0.02, z]], P.woodD, 1.1);
    if (style === 'hub') s += leftQuad(cx, cy, 0, 1, DOOR_H + 5, DOOR_H + 11, P.yellow, false);
    if (style === 'store') s += leftQuad(cx, cy, 0, 1, DOOR_H + 5, DOOR_H + 11, P.tealL, false);
    if (style === 'bench') {
      for (const u of [0.1, 0.5, 0.9]) s += leftQuad(cx, cy, u - 0.07, u + 0.07, 6, WALL_H - 6, P.purpleL);
    }
    if (kind === 'window') {
      // one storey window: sill at SILL_PX, a cross bar and a flower-box ledge
      const z0 = SILL_PX;
      const z1 = SILL_PX + WINDOW_H;
      s += leftQuad(cx, cy, 0.2, 0.8, z0, z1, P.blue);
      s += leftQuad(cx, cy, 0.26, 0.48, z0 + 3, z1 - 3, P.blueL, false);
      s += leftQuad(cx, cy, 0.52, 0.74, z0 + 3, z1 - 3, P.blueL, false);
      s += leftQuad(cx, cy, 0.16, 0.84, z0 - 5, z0, P.paper3);
      s += rightQuad(cx, cy, 0.25, 0.75, z0, z1, P.blueD);
    }
    if (kind === 'door') s += doorDeco(cx, cy, c, style);
    return s;
  };
}

/** Sign standing above the wall line (centre sits SIGN_PX/2 above the parapet). */
function roofSign(cx: number, cy: number, draw: (x: number, y: number) => string): string {
  const [px, py] = pt(cx, cy, 0.5, 1, WALL_H);
  return stroke(`M${px - 5},${py} v-8 M${px + 5},${py} v-8`, P.ink, 2) + draw(px, py - 8 - SIGN_PX / 2 - 2);
}

function doorDeco(cx: number, cy: number, c: RoofColour, style: 'house' | 'hub' | 'store' | 'bench'): string {
  let s = '';
  if (style === 'house') {
    const wood = c === 'wood';
    s += doorLeft(cx, cy, { frame: wood ? P.woodD : P.paper3, leaf: P.orange, handle: P.yellow });
    s += leftQuad(cx, cy, 0.3, 0.7, 44, 66, P.orangeD, false);
    s += leftQuad(cx, cy, 0.3, 0.7, 12, 34, P.orangeD, false);
    // little transom / house number above the door
    s += leftQuad(cx, cy, 0.4, 0.6, DOOR_H + 6, DOOR_H + 15, P.paper, true);
  } else if (style === 'hub') {
    s += doorLeft(cx, cy, { frame: P.yellowD, leaf: P.tealL, glass: P.paper, split: true });
    // hanging hugging-face sign on the roof line
    s += roofSign(cx, cy, (sx, sy) => {
      let t = circle(sx + 3, sy + 3, 14, P.pink, false);
      t += circle(sx, sy, 14, P.yellow);
      t += circle(sx - 5, sy - 3, 1.8, P.ink, false) + circle(sx + 5, sy - 3, 1.8, P.ink, false);
      t += stroke(`M${sx - 5.5},${sy + 3} q5.5,6.5 11,0`, P.ink, 1.8);
      t += ellipse(sx - 14, sy + 7, 3.4, 2.6, P.yellow) + ellipse(sx + 14, sy + 7, 3.4, 2.6, P.yellow);
      return t;
    });
  } else if (style === 'store') {
    s += doorLeft(cx, cy, { frame: P.tealD, leaf: P.tealL, glass: P.paper, split: true, mat: P.teal });
    // striped awning over the door
    const stripes = 6;
    for (let i = 0; i < stripes; i++) {
      const u0 = 0.06 + (0.88 * i) / stripes;
      const u1 = 0.06 + (0.88 * (i + 1)) / stripes;
      s += poly3(cx, cy, [[u0, 1, DOOR_H + 14], [u1, 1, DOOR_H + 14], [u1, 1.3, DOOR_H + 3], [u0, 1.3, DOOR_H + 3]], i % 2 ? P.paper : P.teal);
    }
    s += roofSign(cx, cy, (sx, sy) => {
      let t = rect(sx - 12 + 3, sy - 12 + 3, 24, 24, P.pink, 3, false);
      t += rect(sx - 12, sy - 12, 24, 24, P.teal, 3) + rect(sx - 6, sy - 6, 12, 12, P.ink, 1);
      for (const d of [-7, -2.5, 2.5, 7]) t += stroke(`M${sx + d},${sy - 12} v-3 M${sx + d},${sy + 12} v3`, P.ink, 1.4);
      return t;
    });
  } else {
    s += doorLeft(cx, cy, { frame: P.purpleD, leaf: P.yellow, glass: P.paper, split: true, mat: P.purpleL });
    s += roofSign(cx, cy, (sx, sy) => {
      let t = path(`M${sx - 11 + 3},${sy - 10 + 3} h22 q0,15 -11,15 q-11,0 -11,-15 z`, P.pink, false);
      t += path(`M${sx - 11},${sy - 10} h22 q0,15 -11,15 q-11,0 -11,-15 z`, P.yellow);
      t += rect(sx - 2.4, sy + 5, 4.8, 6, P.yellowD, 0) + rect(sx - 7, sy + 11, 14, 4, P.ink2, 1);
      t += stroke(`M${sx - 11},${sy - 6} q-7,0 -5,7 q2,4 7,4 M${sx + 11},${sy - 6} q7,0 5,7 q-2,4 -7,4`, P.ink, 1.8);
      return t;
    });
  }
  return s;
}

function roofTile(c: RoofColour, shape: RoofShape) {
  return (cx: number, cy: number): string => {
    const rp = ROOF[c];
    const prof: [number, number][] =
      shape === 'single' ? [[0, ROOF_H], [0.5, ROOF_H + RIDGE], [1, ROOF_H]]
      : shape === 'back' ? [[0, ROOF_H], [1, ROOF_H + RIDGE]]
      : shape === 'front' ? [[0, ROOF_H + RIDGE], [1, ROOF_H]]
      : [[0, ROOF_H + RIDGE], [1, ROOF_H + RIDGE]];
    const zFront = prof[prof.length - 1]![1];
    let s = '';
    // shadow silhouette
    const sil: V3[] = [[0, 1, 0], [1, 1, 0], [1, 0, 0]];
    for (const [b, z] of prof) sil.push([1, b, z]);
    sil.push([0, 0, prof[0]![1]]);
    const sp = sil.map(([a, b, z]) => pt(cx, cy, a, b, z)).map(([x, y]) => `${x + 4},${y + 3}`).join(' ');
    s += `<polygon points="${sp}" fill="${P.blue}" stroke="${P.blue}" stroke-width="2" stroke-linejoin="round"/>`;
    // left face (fascia under the eave)
    s += poly3(cx, cy, [[0, 1, 0], [1, 1, 0], [1, 1, zFront], [0, 1, zFront]], rp.dark);
    // right face (gable end)
    const gable: V3[] = [[1, 1, 0], [1, 0, 0]];
    for (const [b, z] of prof) gable.push([1, b, z]);
    s += poly3(cx, cy, gable, rp.dark);
    // top slopes
    for (let i = 0; i < prof.length - 1; i++) {
      const [b0, z0] = prof[i]!;
      const [b1, z1] = prof[i + 1]!;
      const col = z1 > z0 ? rp.light : z1 < z0 ? rp.base : rp.base;
      s += poly3(cx, cy, [[0, b0, z0], [1, b0, z0], [1, b1, z1], [0, b1, z1]], col);
      for (const t of [0.33, 0.66]) {
        const b = b0 + (b1 - b0) * t;
        const z = z0 + (z1 - z0) * t;
        s += line3(cx, cy, [[0.03, b, z], [0.97, b, z]], rp.line, 1.2);
      }
    }
    return s;
  };
}

// --- interior ---

function roomWall(kind: 'wall' | 'window', low: boolean) {
  return (cx: number, cy: number): string => {
    const h = low ? LOW_WALL_H : ROOM_WALL_H;
    const b = blockParts(cx, cy, h, { top: low ? P.ink3 : '#d4cfe8', left: '#b9b3d6', right: '#9892bb' });
    let s = b.left + b.right + b.top;
    if (low) {
      s += leftQuad(cx, cy, 0, 1, h - 3, h, P.ink2, false) + rightQuad(cx, cy, 0, 1, h - 3, h, P.ink2, false);
      return s;
    }
    s += leftQuad(cx, cy, 0, 1, 0, 6, P.lav2, false) + rightQuad(cx, cy, 0, 1, 0, 6, P.ink3, false);
    s += line3(cx, cy, [[0, 1, 6], [1, 1, 6]], P.ink, 1.4) + line3(cx, cy, [[1, 1, 6], [1, 0, 6]], P.ink, 1.4);
    if (kind === 'window') {
      for (const q of [leftQuad, rightQuad]) {
        s += q(cx, cy, 0.22, 0.78, SILL_PX, SILL_PX + WINDOW_H + 8, P.blueL);
        s += q(cx, cy, 0.28, 0.5, SILL_PX + 4, SILL_PX + WINDOW_H + 4, P.waterL, false);
        s += q(cx, cy, 0.18, 0.82, SILL_PX - 4, SILL_PX, P.paper);
      }
      const [sx, sy] = pt(cx, cy, 0.5, 1, SILL_PX + 24);
      s += circle(sx - 4, sy - 7, 3, P.yellow, false);
    }
    return s;
  };
}

function counter(cx: number, cy: number): string {
  const b = blockParts(cx, cy, 20, { top: P.woodL, left: P.pinkL, right: P.pink });
  let s = blockShadow(cx, cy, 20, P.blue) + b.left + b.right + b.top;
  s += leftQuad(cx, cy, 0.08, 0.92, 3, 14, P.paper, false);
  s += line3(cx, cy, [[0.05, 0.05, 20], [0.05, 0.95, 20]], P.woodD, 1.6);
  s += line3(cx, cy, [[0.05, 0.95, 20], [0.95, 0.95, 20]], P.woodD, 1.6);
  return s;
}

function table(cx: number, cy: number): string {
  let s = '';
  for (const [a, b] of [[0.14, 0.14], [0.86, 0.14], [0.14, 0.86], [0.86, 0.86]] as const) s += line3(cx, cy, [[a, b, 0], [a, b, 13]], P.woodD, 3.4);
  const slab = (z: number, f: string): string => poly3(cx, cy, [[0.04, 0.04, z], [0.96, 0.04, z], [0.96, 0.96, z], [0.04, 0.96, z]], f);
  s += poly3(cx, cy, [[0.04, 0.96, 11], [0.96, 0.96, 11], [0.96, 0.96, 15], [0.04, 0.96, 15]], P.woodD);
  s += poly3(cx, cy, [[0.96, 0.96, 11], [0.96, 0.04, 11], [0.96, 0.04, 15], [0.96, 0.96, 15]], P.wood);
  s += slab(15, P.woodL);
  // a mug
  const [mx, my] = pt(cx, cy, 0.6, 0.55, 15);
  s += rect(mx - 3, my - 6, 6, 6, P.paper, 1.5) + stroke(`M${mx - 2},${my - 4} h4`, P.pink, 1.4);
  return s;
}

function shelf(cx: number, cy: number): string {
  const b = blockParts(cx, cy, 38, { top: P.woodL, left: P.woodD, right: P.wood });
  let s = blockShadow(cx, cy, 38, P.blue) + b.left + b.right + b.top;
  const cols = [P.red, P.blue, P.yellow, P.teal, P.pink, P.purple, P.orange];
  for (const z0 of [3, 15, 27]) {
    s += leftQuad(cx, cy, 0.06, 0.94, z0, z0 + 9, P.ink2, false);
    for (let i = 0; i < 7; i++) {
      const u0 = 0.08 + i * 0.12;
      const hh = 6 + Math.floor(hash01(z0, i, 4) * 3);
      s += leftQuad(cx, cy, u0, u0 + 0.1, z0, z0 + hh, cols[(i + z0) % cols.length] as string);
    }
  }
  return s;
}

function pc(cx: number, cy: number): string {
  const b = blockParts(cx, cy, 14, { top: P.paper2, left: P.steelL, right: P.steel });
  let s = blockShadow(cx, cy, 14, P.blue) + b.left + b.right + b.top;
  // monitor on stand
  s += planeB(cx, cy, 0.5, 0.3, 0.7, 14, 18, P.ink2);
  s += planeB(cx, cy, 0.5, 0.12, 0.88, 17, 38, P.ink);
  s += planeB(cx, cy, 0.5, 0.18, 0.82, 20, 35, P.blue, false);
  s += planeB(cx, cy, 0.5, 0.24, 0.5, 29, 31, P.blueL, false);
  s += planeB(cx, cy, 0.5, 0.24, 0.42, 25, 27, P.blueL, false);
  s += planeB(cx, cy, 0.5, 0.56, 0.62, 25, 27, P.leaf, false);
  return s;
}

function serverRack(cx: number, cy: number): string {
  const b = blockParts(cx, cy, 46, { top: P.ink3, left: P.ink2, right: P.ink });
  let s = blockShadow(cx, cy, 46, P.pink) + b.left + b.right + b.top;
  const leds = [P.leaf, P.pink, P.yellow, P.blueL];
  for (let i = 0; i < 5; i++) {
    const z0 = 4 + i * 8;
    s += leftQuad(cx, cy, 0.08, 0.92, z0, z0 + 6, P.ink3);
    s += leftQuad(cx, cy, 0.14, 0.2, z0 + 2, z0 + 4, leds[i % 4] as string, false);
    s += leftQuad(cx, cy, 0.26, 0.32, z0 + 2, z0 + 4, leds[(i + 1) % 4] as string, false);
    s += leftQuad(cx, cy, 0.5, 0.86, z0 + 2.5, z0 + 3.5, P.ink, false);
  }
  for (let i = 0; i < 5; i++) s += rightQuad(cx, cy, 0.1, 0.9, 6 + i * 8, 7.4 + i * 8, P.ink2, false);
  return s;
}

function bed(cx: number, cy: number): string {
  const frame = blockParts(cx, cy, 8, { top: P.woodL, left: P.woodD, right: P.wood });
  let s = blockShadow(cx, cy, 8, P.blue) + frame.left + frame.right + frame.top;
  s += poly3(cx, cy, [[0.1, 0.06, 12], [0.9, 0.06, 12], [0.9, 0.94, 12], [0.1, 0.94, 12]], P.paper);
  s += poly3(cx, cy, [[0.1, 0.94, 8], [0.9, 0.94, 8], [0.9, 0.94, 12], [0.1, 0.94, 12]], P.paper2);
  s += poly3(cx, cy, [[0.9, 0.94, 8], [0.9, 0.06, 8], [0.9, 0.06, 12], [0.9, 0.94, 12]], P.paper3);
  s += poly3(cx, cy, [[0.1, 0.42, 14], [0.9, 0.42, 14], [0.9, 0.96, 14], [0.1, 0.96, 14]], P.pink);
  s += poly3(cx, cy, [[0.1, 0.96, 8], [0.9, 0.96, 8], [0.9, 0.96, 14], [0.1, 0.96, 14]], P.pinkL);
  s += poly3(cx, cy, [[0.9, 0.96, 8], [0.9, 0.42, 8], [0.9, 0.42, 14], [0.9, 0.96, 14]], P.redL);
  s += poly3(cx, cy, [[0.2, 0.1, 15], [0.8, 0.1, 15], [0.8, 0.34, 15], [0.2, 0.34, 15]], P.blueL);
  return s;
}

function plant(cx: number, cy: number): string {
  let s = ellipse(cx + 5, cy + 3, 12, 5, P.blue, false);
  s += poly([[cx - 9, cy - 14], [cx + 9, cy - 14], [cx + 6, cy + 4], [cx - 6, cy + 4]], P.orange);
  s += poly([[cx + 1, cy - 14], [cx + 9, cy - 14], [cx + 6, cy + 4], [cx + 1, cy + 4]], P.orangeD, false);
  s += `<path d="M${cx - 9},${cy - 14} L${cx + 9},${cy - 14} L${cx + 6},${cy + 4} L${cx - 6},${cy + 4} Z" fill="none" ${OUT}/>`;
  const leaf = (dx: number, tip: number, col: string): string => {
    const mx = cx + dx * 0.5;
    const my = cy - 14 - tip * 0.5;
    return path(`M${cx},${cy - 14} Q${mx - 6},${my} ${cx + dx},${cy - 14 - tip} Q${mx + 6},${my} ${cx},${cy - 14} Z`, col);
  };
  s += leaf(-14, 24, P.leafD) + leaf(14, 26, P.leafD) + leaf(-4, 34, P.leaf) + leaf(6, 30, P.leafL);
  return s;
}

// ---------- registry ----------

export function groundVariants(name: TileName): number {
  return name === 'grass' || name === 'grass_alt' || name === 'path' || name === 'sand' || name === 'water' || name === 'grass_park' || name === 'data_stream' ? 3 : 1;
}

/** Tiles that are flat on the ground (drawn in the lowest depth band). */
export const FLAT_TILES: ReadonlySet<TileName> = new Set<TileName>([
  'grass', 'grass_alt', 'path', 'sand', 'water', 'water_edge', 'cable', 'floor_wood', 'floor_lab', 'floor_tile', 'carpet', 'exit_mat',
  'asphalt', 'sidewalk', 'crosswalk', 'plaza', 'grass_park', 'data_lane', 'data_bridge', 'data_stream', 'cell_floor',
  'bridge_wood', 'switch_plate', 'hub_floor', 'arena_floor', 'arena_line',
]);

/** Tiles that stand on a ground tile of their own (an underlay is drawn beneath). */
export const UNDERLAY_TILES: ReadonlySet<TileName> = new Set<TileName>([
  'tree', 'bush', 'rock', 'flowers', 'fence', 'sign', 'ledge', 'counter', 'table', 'shelf', 'pc', 'server_rack', 'bed', 'plant',
  'dock', 'gpu_crate', 'lamp', 'poster_aiact',
  'fiber', 'road_sign', 'cell_bars', 'locker', 'terminal', 'guard_desk', 'searchlight',
  'street_lamp', 'bench_seat', 'planter', 'food_cart', 'billboard', 'traffic_cone', 'vending', 'awning_red', 'awning_teal',
  'tree_pine', 'tree_birch', 'log', 'stump', 'flower_bed', 'signpost', 'gate', 'crate_push', 'hub_reception', 'repo_shelf', 'scoreboard',
]);

/** Free-standing props/objects drawn as one `<name>:0` sprite on the prop layer (v0.3 additions). */
export const V03_PROP_TILES: ReadonlySet<TileName> = new Set<TileName>([
  'fiber', 'road_sign', 'cell_bars', 'locker', 'terminal', 'guard_desk', 'searchlight',
  'street_lamp', 'bench_seat', 'planter', 'food_cart', 'billboard', 'traffic_cone', 'vending', 'awning_red', 'awning_teal',
  'prison_wall', 'concrete_wall', 'aiact_wall', 'aiact_door',
]);

/** Ground used under props when the map gives no better hint. */
export const GROUND_TILES: ReadonlySet<TileName> = new Set<TileName>([
  'grass', 'grass_alt', 'path', 'sand', 'water', 'water_edge', 'floor_wood', 'floor_lab', 'floor_tile', 'carpet',
  'asphalt', 'sidewalk', 'crosswalk', 'plaza', 'grass_park', 'data_lane', 'data_bridge', 'data_stream', 'cell_floor',
  'hub_floor', 'arena_floor',
]);

/** v0.4 free-standing props drawn as `<name>:<variant>` on the prop layer (variants picked by position unless noted). */
export const V04_PROP_TILES: ReadonlySet<TileName> = new Set<TileName>([
  'tree_pine', 'tree_birch', 'log', 'stump', 'flower_bed', 'signpost', 'gate', 'crate_push', 'hub_reception', 'repo_shelf', 'scoreboard',
]);
/** v0.4 tiles with a gx-axis sprite (:0) and a gy-axis sprite (:1). */
export const V04_AXIS_TILES: ReadonlySet<TileName> = new Set<TileName>(['bridge_wood', 'arena_line', 'log']);
/** v0.4 variant counts (merged into CITY_VARIANTS). signpost/crate_push/arena_line are chosen explicitly, not by position. */
export const V04_VARIANTS: Readonly<Record<string, number>> = { ...FOREST_VARIANTS, ...THEMED_VARIANTS };

const wallKinds = ['wall', 'door'] as const;

export function buildTileArt(): ArtEntry[] {
  const out: ArtEntry[] = [];
  const add = (key: string, up: number, draw: (cx: number, cy: number) => string, w?: number): void => {
    out.push(tileEntry(key, up, draw, w));
  };
  for (let v = 0; v < 3; v++) {
    add(`grass:${v}`, 0, grass(false, v));
    add(`grass_alt:${v}`, 0, grass(true, v));
    add(`path:${v}`, 0, pathTile(v));
    add(`sand:${v}`, 0, sandTile(v));
    add(`water:${v}`, 0, waterTile(false, v));
    add(`cable_ground:${v}`, 0, cableGround(v));
    out.push(cableTuft(v));
  }
  add('water_edge:0', 0, waterTile(true, 0));
  add('floor_wood:0', 0, planks(P.floorWood, P.floorWoodD));
  add('floor_lab:0', 0, labFloor);
  add('floor_tile:0', 0, tileFloor);
  add('carpet:0', 0, carpet);
  add('exit_mat:0', 0, exitMat);
  add('tree:0', 108, tree, 96);
  add('bush:0', 26, bush);
  add('rock:0', 26, rock);
  add('flowers:0', 12, flowers);
  add('sign:0', 44, sign);
  add('lamp:0', LAMP_PX + 8, lamp);
  add('ledge:0', 12, ledge);
  add('dock:0', 8, dock);
  add('fence_post:0', 32, fencePost);
  add('fence_rail_x:0', 28, fenceRail('x'), 100);
  add('fence_rail_y:0', 28, fenceRail('y'), 100);
  add('gpu_crate:0', 36, gpuCrate);
  add('poster_aiact:0', 96, posterAiact);
  add('counter:0', 28, counter);
  add('table:0', 24, table);
  add('shelf:0', 50, shelf);
  add('pc:0', 46, pc);
  add('server_rack:0', 58, serverRack);
  add('bed:0', 28, bed);
  add('plant:0', 56, plant);
  add('wall:0', ROOM_WALL_H + 14, roomWall('wall', false));
  add('wall_window:0', ROOM_WALL_H + 14, roomWall('window', false));
  add('wall:low', 20, roomWall('wall', true));
  add('wall_window:low', 20, roomWall('wall', true));
  for (const c of ['red', 'blue', 'grey', 'wood'] as const) {
    add(`house_wall:${c}`, WALL_H + 8, houseWall(c, 'wall'));
    add(`house_window:${c}`, WALL_H + 8, houseWall(c, 'window'));
    add(`house_door:${c}`, WALL_H + 8, houseWall(c, 'door'));
  }
  for (const k of wallKinds) {
    add(`hub_${k}:hub`, WALL_H + 62, houseWall('hub', k, 'hub'));
    add(`store_${k}:store`, WALL_H + 62, houseWall('store', k, 'store'));
    add(`bench_${k}:bench`, WALL_H + 62, houseWall('bench', k, 'bench'));
  }
  for (const c of ROOF_COLOURS) for (const sh of ROOF_SHAPES) add(`roof:${c}:${sh}`, ROOF_H + RIDGE + 8, roofTile(c, sh));
  out.push(...cityTileEntries(), ...thinWallEntries(), ...landmarkEntries(), ...forestEntries(), ...themedEntries(), ...landmark4Entries());
  return out;
}

// make sure every tile name is covered by some key (checked in tests)
export const KNOWN_TILES = TILE_NAMES;
