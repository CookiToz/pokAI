// v0.4 stylish interiors: Hub and Benchmark-arena interiors (themed variant counts for the v0.7 buildings too).
import {
  OUT, P, blockParts, blockShadow, circle, cuboid, ellipse, groundDiamond, hash01, lcell, leftPlaneG, line3, path, poly, poly3, pt, rcell, rect,
  rightPlaneG, stroke, text, tileEntry, STOREY_PX, SILL_PX, type ArtEntry,
} from './kit';

type Draw = (cx: number, cy: number) => string;

const quad = (cx: number, cy: number, a0: number, a1: number, b0: number, b1: number, fill: string, z = 0, outline = false, extra = ''): string =>
  poly3(cx, cy, [[a0, b0, z], [a1, b0, z], [a1, b1, z], [a0, b1, z]], fill, outline, extra);

// Port containers and Hugging Grove cabins are buildings since v0.7: see buildings.ts (one architectural language).

// ---------- Hub interiors ----------

const CREAM = '#fff3c4';
const BUTTER = '#ffe27a';

function hubFloor(v: number): Draw {
  // calm paper tiles: two near-identical shades so the random variant pick reads as a soft checker, no motifs
  return (cx, cy) => {
    let s = groundDiamond(cx, cy, v === 0 ? P.paper : P.paper2);
    s += line3(cx, cy, [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]], P.steelL, 1).replace('fill="none"', 'fill="none" opacity="0.5"');
    return s;
  };
}

function faceSign(x: number, y: number, r: number): string {
  let s = circle(x + 3, y + 3, r, P.pink, false) + circle(x, y, r, P.yellow);
  s += ellipse(x - r * 0.36, y - r * 0.2, r * 0.13, r * 0.18, P.ink, false) + ellipse(x + r * 0.36, y - r * 0.2, r * 0.13, r * 0.18, P.ink, false);
  s += stroke(`M${x - r * 0.45},${y + r * 0.2} q${r * 0.45},${r * 0.55} ${r * 0.9},0`, P.ink, 1.8);
  s += circle(x - r * 0.68, y + r * 0.2, r * 0.14, P.pinkL, false) + circle(x + r * 0.68, y + r * 0.2, r * 0.14, P.pinkL, false);
  s += ellipse(x - r * 1.0, y + r * 0.55, r * 0.34, r * 0.28, P.yellow) + ellipse(x + r * 1.0, y + r * 0.55, r * 0.34, r * 0.28, P.yellow);
  return s;
}

function hubReception(cx: number, cy: number): string {
  // the single care desk: one counter cell carrying the big SOINS sign (the cells on each side are plain counters)
  const H = 22;
  const b = blockParts(cx, cy, H, { top: P.woodL, left: P.yellow, right: P.yellowD });
  let s = blockShadow(cx, cy, H, P.pink, 5, 4) + b.left + b.right + b.top;
  s += lcell(cx, cy, 1, 0, 1, 0, 4, P.pink, false) + rcell(cx, cy, 1, 0, 1, 0, 4, '#c2257f', false);
  s += lcell(cx, cy, 1, 0.08, 0.92, 7, 17, CREAM) + lcell(cx, cy, 1, 0.14, 0.86, 9, 15, BUTTER, false);
  // service bell
  const [bx, by] = pt(cx, cy, 0.5, 0.5, H);
  s += ellipse(bx, by, 5, 2.2, P.steelL) + path(`M${bx - 3.6},${by - 0.6} q3.6,-7 7.2,0 z`, P.yellowD) + circle(bx, by - 5.6, 1, P.ink, false);
  // standing board on two posts
  const [px, py] = pt(cx, cy, 0.5, 0.5, H);
  s += line3(cx, cy, [[0.5, 0.5, H], [0.5, 0.5, H + 34]], P.ink, 5) + line3(cx, cy, [[0.5, 0.5, H], [0.5, 0.5, H + 34]], P.steelL, 2);
  const by0 = py - 58;
  s += rect(px - 29 + 3, by0 + 3, 58, 24, P.pink, 2, false) + rect(px - 29, by0, 58, 24, P.paper, 2);
  s += faceSign(px - 14, by0 + 12, 8.5);
  s += text(px + 11, by0 + 16, 8, P.ink, 'SOINS');
  return s;
}

function repoShelf(cx: number, cy: number): string {
  // slim server cabinet with a lit REPO plaque; it stands beside the PC
  const H = 66;
  const b = blockParts(cx, cy, H, { top: P.yellow, left: '#2b2748', right: P.ink });
  let s = blockShadow(cx, cy, H, P.pink, 5, 4) + b.left + b.right + b.top;
  const glow = [P.neon, P.pink, P.yellow] as const;
  for (let r = 0; r < 2; r++) {
    const z0 = 5 + r * 9;
    s += lcell(cx, cy, 1, 0.1, 0.9, z0, z0 + 7, '#171428', false);
    for (let i = 0; i < 3; i++) s += lcell(cx, cy, 1, 0.16 + i * 0.26, 0.3 + i * 0.26, z0 + 2.5, z0 + 4.5, glow[(i + r) % 3]!, false);
  }
  s += leftPlaneG(cx, cy, 0, 1, H, rect(3, 6, 26, 15, P.paper, 1.5) + text(16, 17, 8.5, P.ink, 'REPO'));
  s += rcell(cx, cy, 1, 0.45, 0.55, 4, H - 4, P.neon, false);
  return s;
}

// ---------- Benchmark arena ----------

const ARENA = '#2b2748';
const ARENA2 = '#35305a';

function arenaFloor(v: number): Draw {
  return (cx, cy) => {
    let s = groundDiamond(cx, cy, ARENA);
    s += quad(cx, cy, 0, 0.5, 0, 0.5, ARENA2) + quad(cx, cy, 0.5, 1, 0.5, 1, ARENA2);
    // glossy sheen
    s += v === 0
      ? poly3(cx, cy, [[0.0, 0.0, 0], [0.5, 0.0, 0], [0.0, 0.5, 0]], '#ffffff', false, 'opacity="0.16"')
      : poly3(cx, cy, [[1, 1, 0], [0.5, 1, 0], [1, 0.5, 0]], '#ffffff', false, 'opacity="0.16"');
    s += poly3(cx, cy, [[0.58, 0.06, 0], [0.66, 0.06, 0], [0.06, 0.66, 0], [0.06, 0.58, 0]], '#ffffff', false, 'opacity="0.07"');
    // faint neon grid at the seams
    s += line3(cx, cy, [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]], P.neon, 1).replace('fill="none"', 'fill="none" opacity="0.22"');
    const [x, y] = pt(cx, cy, v ? 0.8 : 0.2, v ? 0.2 : 0.8);
    s += circle(x, y, 1.2, P.neon, false).replace('<circle', '<circle opacity="0.55"');
    return s;
  };
}

function arenaLine(axis: 0 | 1): Draw {
  return (cx, cy) => {
    let s = arenaFloor(axis)(cx, cy);
    const band = (w: number, fill: string, op: number): string =>
      axis === 0 ? quad(cx, cy, 0, 1, 0.5 - w, 0.5 + w, fill, 0, false, `opacity="${op}"`) : quad(cx, cy, 0.5 - w, 0.5 + w, 0, 1, fill, 0, false, `opacity="${op}"`);
    s += band(0.2, P.neon, 0.2) + band(0.11, P.neon, 0.45) + band(0.045, '#d9fffa', 1);
    // chevron pulses along the lane
    for (const t of [0.22, 0.72]) {
      const pts: [number, number, number][] =
        axis === 0 ? [[t, 0.4, 0], [t + 0.1, 0.5, 0], [t, 0.6, 0]] : [[0.4, t, 0], [0.5, t + 0.1, 0], [0.6, t, 0]];
      s += line3(cx, cy, pts, P.paper, 1.4);
    }
    return s;
  };
}

function scoreboard(cx: number, cy: number): string {
  const H = 58;
  const b = blockParts(cx, cy, H, { top: P.ink3, left: P.ink2, right: P.ink });
  let s = blockShadow(cx, cy, H, P.pink, 5, 4) + b.left + b.right + b.top;
  // base plinth
  s += lcell(cx, cy, 1, 0, 1, 0, 6, P.concreteD, false) + rcell(cx, cy, 1, 0, 1, 0, 6, P.ink3, false);
  // screen on the front face (content box 32 wide, H tall)
  const medals = [P.yellow, P.steelL, P.orange];
  let scr = rect(3, 8, 26, 40, '#0f1a2b', 1.5);
  scr += `<rect x="4.2" y="9.2" width="23.6" height="37.6" fill="none" stroke="${P.neon}" stroke-width="1.1" opacity="0.8"/>`;
  scr += rect(6, 11, 20, 6, P.neon, 0.8, false) + text(16, 15.9, 4.8, P.ink, 'TOP 3');
  for (let i = 0; i < 3; i++) {
    const y = 20 + i * 8.6;
    scr += circle(8.4, y + 2.6, 2.7, medals[i]!, false) + text(8.4, y + 4, 3.8, P.ink, String(i + 1));
    scr += `<rect x="13" y="${y + 0.6}" width="${13 - i * 2.8}" height="3.8" fill="${i === 0 ? P.pink : P.neon}"/>`;
  }
  s += leftPlaneG(cx, cy, 0, 1, H, scr);
  // side face: ticker strips
  for (let i = 0; i < 4; i++) s += rcell(cx, cy, 1, 0.12, 0.88 - i * 0.14, 12 + i * 10, 15 + i * 10, i % 2 ? P.pink : P.neon, false);
  // crown light
  s += line3(cx, cy, [[0.1, 1, H], [0.9, 1, H]], P.neon, 2.4);
  const [tx, ty] = pt(cx, cy, 0.5, 0.5, H);
  s += stroke(`M${tx},${ty} v-9`, P.ink, 2) + circle(tx, ty - 11, 3.4, P.yellow);
  return s;
}

export const THEMED_VARIANTS = {
  container_wall: 3, container_roof: 3, treehouse_wall: 3, treehouse_roof: 3, hub_floor: 2, arena_floor: 2,
} as const;

export function themedEntries(): ArtEntry[] {
  const out: ArtEntry[] = [];
  const add = (key: string, up: number, draw: Draw, w?: number): void => {
    out.push(tileEntry(key, up, draw, w));
  };
  for (let v = 0; v < 2; v++) {
    add(`hub_floor:${v}`, 0, hubFloor(v));
    add(`arena_floor:${v}`, 0, arenaFloor(v));
    add(`arena_line:${v}`, 0, arenaLine(v as 0 | 1));
  }
  add('hub_reception:0', 104, hubReception);
  add('repo_shelf:0', 86, repoShelf);
  add('scoreboard:0', 80, scoreboard);
  return out;
}
