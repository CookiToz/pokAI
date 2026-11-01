// v0.4 themed cities and stylish interiors: Port 8080 containers, Hugging Grove treehouses, Hub and Benchmark-arena interiors.
import {
  OUT, P, blockParts, blockShadow, circle, cuboid, ellipse, groundDiamond, hash01, lcell, leftPlaneG, line3, path, poly, poly3, pt, rcell, rect,
  rightPlaneG, stroke, text, tileEntry, STOREY_PX, SILL_PX, type ArtEntry,
} from './kit';

type Draw = (cx: number, cy: number) => string;

const quad = (cx: number, cy: number, a0: number, a1: number, b0: number, b1: number, fill: string, z = 0, outline = false, extra = ''): string =>
  poly3(cx, cy, [[a0, b0, z], [a1, b0, z], [a1, b1, z], [a0, b1, z]], fill, outline, extra);

// ---------- Port 8080: shipping containers ----------

const BOX = [
  { l: P.red, r: P.redD, t: P.redL, rib: P.redD, tag: P.paper },
  { l: P.blue, r: P.blueD, t: P.blueL, rib: P.blueD, tag: P.paper },
  { l: P.orange, r: P.orangeD, t: '#ff9560', rib: P.orangeD, tag: P.paper },
  { l: P.teal, r: P.tealD, t: P.tealL, rib: P.tealD, tag: P.paper },
  { l: P.yellow, r: P.yellowD, t: '#ffe27a', rib: P.yellowD, tag: P.ink },
  { l: P.purple, r: P.purpleD, t: P.purpleL, rib: P.purpleD, tag: P.paper },
] as const;

/** A shipping container is about 1.25 x a person tall (real: 2.6 m vs 1.75 m is 1.5 x, trimmed so the stack fits the camera). */
export const BOX_H = 76;

function boxLayer(cx: number, cy: number, layer: number, pal: (typeof BOX)[number], top: boolean, seed: number): string {
  const z0 = layer * BOX_H;
  const z1 = z0 + BOX_H;
  let s = cuboid(cx, cy, 0, 1, 0, 1, z0, z1, { top: pal.t, left: pal.l, right: pal.r });
  // corrugation on the long (left) side, door seams on the end (right) side
  for (let i = 1; i < 12; i++) s += line3(cx, cy, [[i / 12, 1, z0 + 3], [i / 12, 1, z1 - 3]], pal.rib, 1);
  s += rcell(cx, cy, 1, 0.48, 0.52, z0 + 2, z1 - 2, P.ink, false);
  for (const v of [0.3, 0.7]) s += rcell(cx, cy, 1, v - 0.03, v + 0.03, z0 + 3, z1 - 3, P.steelL, false);
  s += line3(cx, cy, [[0.02, 1, z0 + 1.5], [0.98, 1, z0 + 1.5]], P.ink, 1.2) + line3(cx, cy, [[0.02, 1, z1 - 1.5], [0.98, 1, z1 - 1.5]], P.ink, 1.2);
  // id plate
  const a0 = 0.1 + hash01(seed, layer, 2) * 0.35;
  s += lcell(cx, cy, 1, a0, a0 + 0.26, z1 - 9, z1 - 4.5, pal.tag, false);
  s += lcell(cx, cy, 1, a0 + 0.04, a0 + 0.12, z1 - 7.6, z1 - 6.2, P.ink, false);
  if (top) for (let i = 1; i < 5; i++) s += line3(cx, cy, [[i / 5, 0.04, z1], [i / 5, 0.96, z1]], pal.rib, 1.1);
  return s;
}

function containers(layers: number, v: number, roofy: boolean): Draw {
  return (cx, cy) => {
    const H = layers * BOX_H;
    let s = blockShadow(cx, cy, H, P.blue, 5, 4);
    const order = [v, v + 3, v + 1];
    for (let l = 0; l < layers; l++) s += boxLayer(cx, cy, l, BOX[order[l]! % 6]!, l === layers - 1, v * 3 + (roofy ? 7 : 0));
    // twist-lock corner posts
    for (const [a, b] of [[0, 1], [1, 1], [1, 0]] as const) s += line3(cx, cy, [[a, b, 0], [a, b, H]], P.ink, 2.6);
    return s;
  };
}

// ---------- Hugging Grove: treehouses ----------

const PLANK = { top: P.woodL, left: P.floorWood, right: P.wood, line: P.woodD } as const;

function leafDrape(x: number, y: number, s: number): string {
  return ellipse(x, y, 5 * s, 4 * s, P.leaf) + ellipse(x - 0.8 * s, y - 1 * s, 2.6 * s, 2 * s, P.leafL, false) + stroke(`M${x},${y + 3 * s} q-1,6 1,10`, P.leafD, 1.6);
}

function treehouseWall(v: number): Draw {
  return (cx, cy) => {
    const BASE = 24;
    const H = STOREY_PX;
    let s = blockShadow(cx, cy, H, P.blue, 4, 3);
    // trunk base: a palisade of upright logs
    s += cuboid(cx, cy, 0, 1, 0, 1, 0, BASE, { top: P.woodD, left: P.woodD, right: '#7d5430' });
    for (let i = 1; i < 6; i++) s += line3(cx, cy, [[i / 6, 1, 1], [i / 6, 1, BASE - 1]], '#7d5430', 2);
    for (let i = 1; i < 6; i++) s += line3(cx, cy, [[1, 1 - i / 6, 1], [1, 1 - i / 6, BASE - 1]], P.ink2, 1.6);
    // cabin
    s += cuboid(cx, cy, 0, 1, 0, 1, BASE, H, { top: PLANK.top, left: PLANK.left, right: PLANK.right });
    for (const z of [BASE + 16, BASE + 32, BASE + 48, BASE + 64]) {
      s += line3(cx, cy, [[0.02, 1, z], [0.98, 1, z]], PLANK.line, 1.1) + line3(cx, cy, [[1, 0.98, z], [1, 0.02, z]], PLANK.line, 1.1);
    }
    // overhanging deck lip
    s += quad(cx, cy, -0.04, 1.04, 0.96, 1.04, P.woodD, BASE, false);
    s += lcell(cx, cy, 1.04, -0.04, 1.04, BASE - 2.5, BASE + 1, P.woodD, true);
    s += line3(cx, cy, [[0, 1, H - 4], [1, 1, H - 4]], P.woodD, 1.6) + line3(cx, cy, [[1, 1, H - 4], [1, 0, H - 4]], P.woodD, 1.6);
    if (v === 1) {
      // porthole window with flower box
      const [x, y] = pt(cx, cy, 0.5, 1, SILL_PX + 24);
      s += `<ellipse cx="${x}" cy="${y}" rx="15" ry="15" fill="${P.ink}"/>` + circle(x, y, 11.6, P.glass) + circle(x - 3, y - 3.6, 3.4, P.glassL, false);
      s += stroke(`M${x - 11.6},${y} h23.2 M${x},${y - 11.6} v23.2`, P.ink, 1.5);
      s += rect(x - 15, y + 12, 30, 7, P.woodD, 1) + circle(x - 9, y + 10, 3, P.pink, false) + circle(x, y + 9, 3, P.yellow, false) + circle(x + 9, y + 10, 3, P.pinkL, false);
    } else if (v === 2) {
      // hanging lantern + pennant
      const [x, y] = pt(cx, cy, 0.5, 1, 84);
      s += stroke(`M${x},${y} v-8`, P.ink, 1.4) + circle(x, y + 7, 12, P.yellow, false).replace('<circle', '<circle opacity="0.35"');
      s += rect(x - 5, y, 10, 15, P.yellow, 3) + stroke(`M${x - 5},${y + 6} h10`, P.orangeD, 1.1);
      const [px, py] = pt(cx, cy, 0.12, 1, 76);
      s += poly([[px, py], [px + 16, py + 6], [px, py + 12]], P.pink);
      const [wx, wy] = pt(cx, cy, 0.5, 1, SILL_PX + 18);
      s += rect(wx - 10, wy - 11, 20, 20, P.ink, 1) + rect(wx - 7.6, wy - 8.6, 15.2, 15.2, P.glassL, 0.5, false) + stroke(`M${wx},${wy - 8.6} v15.2 M${wx - 7.6},${wy - 1} h15.2`, P.ink, 1.2);
    } else {
      // a plain square window (no door-like panels on walls that cannot be entered)
      const [x, y] = pt(cx, cy, 0.5, 1, SILL_PX + 18);
      s += rect(x - 10, y - 11, 20, 20, P.ink, 1) + rect(x - 7.6, y - 8.6, 15.2, 15.2, P.glassL, 0.5, false) + stroke(`M${x},${y - 8.6} v15.2 M${x - 7.6},${y - 1} h15.2`, P.ink, 1.2);
      s += rect(x - 12, y + 9, 24, 4, P.woodD, 1);
    }
    s += leafDrape(...pt(cx, cy, 0.04, 1, BASE + 40), 1.2) + leafDrape(...pt(cx, cy, 0.97, 0.96, BASE + 56), 1);
    return s;
  };
}

const CROWN = [
  { d: P.leafD, m: P.leaf, l: P.leafL, f: P.pinkL },
  { d: P.orangeD, m: P.orange, l: P.yellow, f: P.yellow },
  { d: '#d9437f', m: P.pinkL, l: '#ffd0ea', f: P.paper },
] as const;

function treehouseRoof(v: number): Draw {
  return (cx, cy) => {
    const pal = CROWN[v % 3]!;
    const H = STOREY_PX + 6;
    let s = blockShadow(cx, cy, H + 18, P.blue, 4, 3);
    s += cuboid(cx, cy, 0, 1, 0, 1, 0, H, { top: PLANK.top, left: PLANK.left, right: PLANK.right });
    for (const z of [24, 48, 72, 96]) s += line3(cx, cy, [[0.02, 1, z], [0.98, 1, z]], PLANK.line, 1.1) + line3(cx, cy, [[1, 0.98, z], [1, 0.02, z]], PLANK.line, 1.1);
    s += lcell(cx, cy, 1, 0, 1, 0, 5, P.woodD, false) + rcell(cx, cy, 1, 0, 1, 0, 5, '#7d5430', false);
    // leafy thatch crown
    const [mx, my] = pt(cx, cy, 0.5, 0.5, H);
    s += ellipse(mx + 3, my + 4, 40, 19, P.pink, false);
    s += ellipse(mx, my + 2, 38, 18, pal.d);
    const blobs: [number, number, number, number][] = [[-20, -4, 20, 13], [19, -3, 20, 13], [0, -14, 24, 15], [-8, -26, 15, 10], [12, -24, 14, 9]];
    for (const [dx, dy, rx, ry] of blobs) s += ellipse(mx + dx, my + dy, rx, ry, pal.d) + ellipse(mx + dx - 1, my + dy - 2, rx - 4, ry - 3, pal.m, false) + ellipse(mx + dx - rx * 0.35, my + dy - ry * 0.45, rx * 0.3, ry * 0.25, pal.l, false);
    for (let i = 0; i < 5; i++) s += circle(mx + (hash01(v, i, 1) - 0.5) * 56, my - 4 - hash01(v, i, 2) * 26, 1.8, pal.f, false);
    // fairy lights
    for (const [dx, dy] of [[-30, 4], [-14, 8], [6, 9], [24, 6], [34, 2]] as const) s += circle(mx + dx, my + dy, 2.2, P.yellow, true);
    return s;
  };
}

// ---------- Hub interiors ----------

const CREAM = '#fff3c4';
const BUTTER = '#ffe27a';

function smiley(x: number, y: number, r: number): string {
  let s = `<g transform="translate(${x} ${y}) scale(1 0.62)">`;
  s += `<circle r="${r}" fill="${P.yellow}" stroke="${P.ink}" stroke-width="1.2"/>`;
  s += `<circle cx="${-r * 0.35}" cy="${-r * 0.2}" r="${r * 0.14}" fill="${P.ink}"/><circle cx="${r * 0.35}" cy="${-r * 0.2}" r="${r * 0.14}" fill="${P.ink}"/>`;
  s += `<path d="M${-r * 0.4},${r * 0.2} q${r * 0.4},${r * 0.45} ${r * 0.8},0" fill="none" stroke="${P.ink}" stroke-width="1" stroke-linecap="round"/>`;
  s += `<ellipse cx="${-r * 1.05}" cy="${r * 0.45}" rx="${r * 0.32}" ry="${r * 0.26}" fill="${P.yellow}" stroke="${P.ink}" stroke-width="1"/><ellipse cx="${r * 1.05}" cy="${r * 0.45}" rx="${r * 0.32}" ry="${r * 0.26}" fill="${P.yellow}" stroke="${P.ink}" stroke-width="1"/>`;
  return `${s}</g>`;
}

function hubFloor(v: number): Draw {
  return (cx, cy) => {
    let s = groundDiamond(cx, cy, CREAM);
    s += quad(cx, cy, 0, 0.5, 0, 0.5, BUTTER) + quad(cx, cy, 0.5, 1, 0.5, 1, BUTTER);
    s += line3(cx, cy, [[0.5, 0.02, 0], [0.5, 0.98, 0]], P.yellowD, 1) + line3(cx, cy, [[0.02, 0.5, 0], [0.98, 0.5, 0]], P.yellowD, 1);
    const [x1, y1] = pt(cx, cy, 0.75, 0.25);
    const [x2, y2] = pt(cx, cy, 0.25, 0.75);
    if (v === 0) {
      s += smiley(x1, y1, 4.4) + smiley(x2, y2, 4.4);
    } else {
      s += smiley(x1, y1, 3.4);
      const [hx, hy] = pt(cx, cy, 0.25, 0.75);
      s += path(`M${hx},${hy + 3} C${hx - 6},${hy - 1} ${hx - 3},${hy - 6} ${hx},${hy - 2.5} C${hx + 3},${hy - 6} ${hx + 6},${hy - 1} ${hx},${hy + 3} Z`, P.pink, false);
    }
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
  const H = 22;
  const b = blockParts(cx, cy, H, { top: P.woodL, left: P.yellow, right: P.yellowD });
  let s = blockShadow(cx, cy, H, P.pink, 5, 4) + b.left + b.right + b.top;
  // counter trim and panels
  s += lcell(cx, cy, 1, 0, 1, 0, 4, P.pink, false) + rcell(cx, cy, 1, 0, 1, 0, 4, '#c2257f', false);
  s += lcell(cx, cy, 1, 0.08, 0.92, 7, 17, CREAM) + lcell(cx, cy, 1, 0.14, 0.86, 9, 15, BUTTER, false);
  const [hx, hy] = pt(cx, cy, 0.5, 1, 12);
  s += circle(hx, hy, 3.4, P.yellowD, false) + stroke(`M${hx - 2.2},${hy + 0.4} q2.2,2.2 4.4,0`, P.ink, 1.2);
  // service bell + screen on the desk
  const [bx, by] = pt(cx, cy, 0.8, 0.72, H);
  s += ellipse(bx, by, 5, 2.2, P.steelL) + path(`M${bx - 3.6},${by - 0.6} q3.6,-7 7.2,0 z`, P.yellowD) + circle(bx, by - 5.6, 1, P.ink, false);
  // standing sign: round board on a post with the big hugging face
  const [px, py] = pt(cx, cy, 0.34, 0.36, H);
  s += line3(cx, cy, [[0.34, 0.36, H], [0.34, 0.36, H + 22]], P.ink, 5) + line3(cx, cy, [[0.34, 0.36, H], [0.34, 0.36, H + 22]], P.steelL, 2);
  s += faceSign(px, py - 40, 17);
  s += rect(px - 17, py - 20, 34, 8, P.paper, 2);
  s += stroke(`M${px - 11},${py - 16} h6 M${px - 3},${py - 16} h5 M${px + 5},${py - 16} h6`, P.ink, 1.8);
  return s;
}

function repoShelf(cx: number, cy: number): string {
  const H = 54;
  const b = blockParts(cx, cy, H, { top: P.yellow, left: '#2b2748', right: P.ink });
  let s = blockShadow(cx, cy, H, P.pink, 5, 4) + b.left + b.right + b.top;
  const glow = [P.neon, P.pink, P.yellow, P.leafL] as const;
  // drive bays on the front (left) face
  for (let r = 0; r < 4; r++) {
    const z0 = 5 + r * 11.5;
    s += lcell(cx, cy, 1, 0.07, 0.93, z0, z0 + 9, '#171428', false);
    for (let i = 0; i < 5; i++) {
      const u0 = 0.1 + i * 0.16;
      const col = glow[(i + r) % 4]!;
      s += lcell(cx, cy, 1, u0, u0 + 0.13, z0 + 1, z0 + 8, P.steelL, true);
      s += lcell(cx, cy, 1, u0 + 0.025, u0 + 0.105, z0 + 5.6, z0 + 7.2, col, false);
      s += lcell(cx, cy, 1, u0 + 0.05, u0 + 0.08, z0 + 2, z0 + 3, col, false);
    }
    // glow strip under each bay
    s += lcell(cx, cy, 1, 0.07, 0.93, z0 - 1.2, z0, glow[r % 4]!, false);
  }
  // side face: vertical glowing seams
  for (const v of [0.2, 0.5, 0.8]) s += rcell(cx, cy, 1, v - 0.025, v + 0.025, 4, H - 4, P.neon, false);
  s += rcell(cx, cy, 1, 0.1, 0.9, H - 8, H - 4, P.yellowD, false);
  // little hugging-face sticker on the crown
  const [fx, fy] = pt(cx, cy, 0.5, 0.5, H);
  s += circle(fx, fy - 1, 4.2, P.yellow) + stroke(`M${fx - 2},${fy} q2,2 4,0`, P.ink, 1) + circle(fx - 1.4, fy - 2.2, 0.6, P.ink, false) + circle(fx + 1.4, fy - 2.2, 0.6, P.ink, false);
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
  for (let v = 0; v < 3; v++) {
    add(`container_wall:${v}`, BOX_H * 2 + 14, containers(2, v, false));
    add(`container_roof:${v}`, BOX_H * 3 + 14, containers(3, v, true));
    add(`treehouse_wall:${v}`, STOREY_PX + 28, treehouseWall(v));
    add(`treehouse_roof:${v}`, STOREY_PX + 78, treehouseRoof(v));
  }
  for (let v = 0; v < 2; v++) {
    add(`hub_floor:${v}`, 0, hubFloor(v));
    add(`arena_floor:${v}`, 0, arenaFloor(v));
    add(`arena_line:${v}`, 0, arenaLine(v as 0 | 1));
  }
  add('hub_reception:0', 84, hubReception);
  add('repo_shelf:0', 70, repoShelf);
  add('scoreboard:0', 80, scoreboard);
  return out;
}
