// v0.4 forest kit: pines, birches, logs, stumps, flower beds, wooden bridge, signposts, and the puzzle props
// (switch plates, gates, weight crates). Same riso rules as tiles.ts: flat fills, 2px ink outlines, hard offset shadows.
import {
  OUT, P, blockParts, blockShadow, circle, cuboid, cuboidShadow, ellipse, groundDiamond, hash01, lcell, leftPlaneG, line3, path, poly, poly3,
  pt, rect, rightPlaneG, stroke, text, tileEntry, type ArtEntry,
} from './kit';

type Draw = (cx: number, cy: number) => string;

const blob3 = (x: number, y: number, rx: number, ry: number, dark: string, mid: string, light: string): string =>
  ellipse(x, y, rx, ry, dark) + ellipse(x - rx * 0.12, y - ry * 0.16, rx * 0.78, ry * 0.74, mid, false) + ellipse(x - rx * 0.36, y - ry * 0.42, rx * 0.3, ry * 0.24, light, false);

// ---------- pines ----------

const PINE_PAL = [
  { l: P.leaf, d: P.leafD, h: P.leafL },
  { l: P.leafD, d: P.leafDD, h: P.leaf },
  { l: P.leafL, d: P.leaf, h: '#b4f2cd' },
] as const;

interface Tier {
  hw: number;
  h: number;
  yb: number;
}

function tierPath(x: number, t: Tier, n = 3): string {
  const top = t.yb - t.h;
  const step = (t.hw * 2) / n;
  let d = `M${x},${top} L${x + t.hw},${t.yb}`;
  for (let i = 0; i < n; i++) d += ` Q${x + t.hw - (i + 0.5) * step},${t.yb + 7} ${x + t.hw - (i + 1) * step},${t.yb}`;
  return `${d} Z`;
}

function pine(v: number): Draw {
  return (cx, cy) => {
    const pal = PINE_PAL[v % 3]!;
    const tiers: Tier[] =
      v === 0 ? [{ hw: 27, h: 34, yb: cy - 8 }, { hw: 23, h: 32, yb: cy - 32 }, { hw: 18, h: 30, yb: cy - 56 }, { hw: 12, h: 28, yb: cy - 78 }]
      : v === 1 ? [{ hw: 31, h: 40, yb: cy - 8 }, { hw: 25, h: 38, yb: cy - 36 }, { hw: 17, h: 34, yb: cy - 62 }]
      : [{ hw: 21, h: 28, yb: cy - 6 }, { hw: 19, h: 26, yb: cy - 26 }, { hw: 16, h: 24, yb: cy - 46 }, { hw: 13, h: 22, yb: cy - 64 }, { hw: 9, h: 20, yb: cy - 80 }];
    let s = ellipse(cx + 9, cy + 3, 21, 7.5, P.blue, false);
    // pink misregistration of the whole canopy
    for (const t of tiers) s += `<path d="${tierPath(cx, t)}" transform="translate(5 3)" fill="${P.pink}"/>`;
    // trunk
    s += poly([[cx - 5.5, cy + 5], [cx + 5.5, cy + 5], [cx + 4, cy - 14], [cx - 4, cy - 14]], P.wood);
    s += poly([[cx + 1, cy + 5], [cx + 5.5, cy + 5], [cx + 4, cy - 14], [cx + 1, cy - 14]], P.woodD, false);
    s += `<path d="M${cx - 5.5},${cy + 5} L${cx + 5.5},${cy + 5} L${cx + 4},${cy - 14} L${cx - 4},${cy - 14} Z" fill="none" ${OUT}/>`;
    tiers.forEach((t, i) => {
      const d = tierPath(cx, t);
      const top = t.yb - t.h;
      s += `<clipPath id="pt${i}"><path d="${d}"/></clipPath><path d="${d}" fill="${pal.l}"/>`;
      s += `<g clip-path="url(#pt${i})"><polygon points="${cx},${top} ${cx + t.hw + 2},${t.yb + 9} ${cx},${t.yb + 9}" fill="${pal.d}"/>`;
      s += `<polygon points="${cx - 2},${top + 7} ${cx - t.hw * 0.62},${t.yb} ${cx - t.hw * 0.4},${t.yb}" fill="${pal.h}"/></g>`;
      s += `<path d="${d}" fill="none" ${OUT}/>`;
      s += stroke(`M${cx - t.hw * 0.2},${t.yb - 5} q${t.hw * 0.1},4 ${t.hw * 0.28},0`, pal.d, 1.4);
    });
    return s;
  };
}

// ---------- birches ----------

const BIRCH_PAL = [
  { d: '#4a9d3f', m: '#8ed957', l: '#c8f28d' },
  { d: '#3f9a62', m: '#6fd186', l: '#b5f0bd' },
  { d: P.orangeD, m: P.yellow, l: '#fff1a8' },
] as const;

function birch(v: number): Draw {
  return (cx, cy) => {
    const pal = BIRCH_PAL[v % 3]!;
    const trunks = v === 1 ? [{ x: -8, lean: -4, h: 78 }, { x: 8, lean: 5, h: 94 }] : [{ x: 0, lean: v === 2 ? 4 : -3, h: 98 }];
    let s = ellipse(cx + 9, cy + 3, 19, 7, P.blue, false);
    // foliage layout around each trunk top
    const tops = trunks.map((t) => [cx + t.x + t.lean, cy + 4 - t.h] as const);
    const clusters: [number, number, number, number][] = [];
    for (const [tx, ty] of tops) {
      clusters.push([tx - 14, ty + 5, 19, 15], [tx + 15, ty + 7, 18, 14], [tx, ty - 7, 23, 18], [tx - 2, ty + 16, 16, 12]);
    }
    for (const [x, y, rx, ry] of clusters) s += ellipse(x + 4, y + 3, rx, ry, P.pink, false);
    trunks.forEach((t, k) => {
      const x0 = cx + t.x;
      const x1 = x0 + t.lean;
      const y1 = cy + 4 - t.h;
      s += poly([[x0 - 4.5, cy + 5], [x0 + 4.5, cy + 5], [x1 + 2.6, y1], [x1 - 2.6, y1]], P.paper);
      s += poly([[x0 + 0.5, cy + 5], [x0 + 4.5, cy + 5], [x1 + 2.6, y1], [x1 + 0.4, y1]], P.paper3, false);
      s += `<path d="M${x0 - 4.5},${cy + 5} L${x0 + 4.5},${cy + 5} L${x1 + 2.6},${y1} L${x1 - 2.6},${y1} Z" fill="none" ${OUT}/>`;
      for (let i = 0; i < 8; i++) {
        const f = 0.08 + i * 0.11 + hash01(v + k * 5, i, 3) * 0.05;
        const mx = x0 + (x1 - x0) * f;
        const my = cy + 5 - (t.h - 1) * f;
        const w = 2.2 + hash01(v, i + k, 4) * 2.2;
        s += `<rect x="${mx - 3.2 + (hash01(k, i, 8) - 0.5) * 1.2}" y="${my}" width="${w}" height="1.5" fill="${P.ink}"/>`;
      }
    });
    // foliage, back to front
    clusters.sort((a, b) => a[1] - b[1]);
    for (const [x, y, rx, ry] of clusters) s += blob3(x, y, rx, ry, pal.d, pal.m, pal.l);
    // a few drifting leaves
    for (let i = 0; i < 3; i++) s += circle(cx + (hash01(v, i, 9) - 0.5) * 38, cy - 10 + hash01(v, i, 10) * 14, 1.5, i % 2 ? pal.m : P.yellow, false);
    return s;
  };
}

// ---------- log, stump, flower bed ----------

function log(axis: 0 | 1): Draw {
  return (cx, cy) => {
    const z = 7.5;
    const [x0, y0] = axis === 0 ? pt(cx, cy, 0.06, 0.5, z) : pt(cx, cy, 0.5, 0.06, z);
    const [x1, y1] = axis === 0 ? pt(cx, cy, 0.9, 0.5, z) : pt(cx, cy, 0.5, 0.9, z);
    let s = '';
    // ground shadow
    const [sx0, sy0] = axis === 0 ? pt(cx, cy, 0.08, 0.5, 0) : pt(cx, cy, 0.5, 0.08, 0);
    const [sx1, sy1] = axis === 0 ? pt(cx, cy, 0.92, 0.5, 0) : pt(cx, cy, 0.5, 0.92, 0);
    s += `<path d="M${sx0 + 5},${sy0 + 3} L${sx1 + 5},${sy1 + 3}" stroke="${P.blue}" stroke-width="15" stroke-linecap="round"/>`;
    s += `<path d="M${x0},${y0} L${x1},${y1}" stroke="${P.ink}" stroke-width="18" stroke-linecap="round"/>`;
    s += `<path d="M${x0},${y0} L${x1},${y1}" stroke="${P.woodD}" stroke-width="14" stroke-linecap="round"/>`;
    s += `<path d="M${x0},${y0 - 2.5} L${x1},${y1 - 2.5}" stroke="${P.wood}" stroke-width="9" stroke-linecap="round"/>`;
    s += `<path d="M${x0 + 2},${y0 - 5} L${x1 - 2},${y1 - 5}" stroke="${P.woodL}" stroke-width="2.4" stroke-linecap="round"/>`;
    // bark ticks
    for (const t of [0.22, 0.4, 0.58, 0.74]) {
      const bx = x0 + (x1 - x0) * t;
      const by = y0 + (y1 - y0) * t;
      s += stroke(`M${bx},${by - 2} l0,6`, P.woodD, 1.2);
    }
    // moss tuft on top
    const mx = x0 + (x1 - x0) * 0.4;
    const my = y0 + (y1 - y0) * 0.4 - 7;
    s += ellipse(mx, my, 6, 2.6, P.leaf) + ellipse(mx - 1.5, my - 0.8, 3, 1.2, P.leafL, false);
    // cut end with rings
    const cap = `<circle cx="0" cy="0" r="7" fill="${P.woodL}" stroke="${P.ink}" stroke-width="2"/><circle cx="0" cy="0" r="4.4" fill="none" stroke="${P.woodD}" stroke-width="1.2"/><circle cx="0" cy="0" r="1.8" fill="none" stroke="${P.woodD}" stroke-width="1.1"/>`;
    s += axis === 0 ? `<g transform="translate(${x1} ${y1}) matrix(1 -0.5 0 1 0 0)">${cap}</g>` : `<g transform="translate(${x1} ${y1}) matrix(1 0.5 0 1 0 0)">${cap}</g>`;
    return s;
  };
}

function mushroom(x: number, y: number, s: number): string {
  return rect(x - 1.2 * s, y - 3.5 * s, 2.4 * s, 3.5 * s, P.paper, 0.5) +
    path(`M${x - 3.6 * s},${y - 3.2 * s} Q${x},${y - 8.4 * s} ${x + 3.6 * s},${y - 3.2 * s} Z`, P.red) +
    circle(x - 1.1 * s, y - 5 * s, 0.7 * s, P.paper, false) + circle(x + 1.4 * s, y - 4.4 * s, 0.6 * s, P.paper, false);
}

function stump(cx: number, cy: number): string {
  const x = cx;
  const yb = cy + 3;
  const h = 15;
  const rx = 13;
  const ry = 6.5;
  let s = ellipse(cx + 8, cy + 5, 17, 7, P.blue, false);
  const body = `M${x - rx},${yb - h} L${x - rx},${yb} A${rx},${ry} 0 0 0 ${x + rx},${yb} L${x + rx},${yb - h} Z`;
  s += `<clipPath id="stp"><path d="${body}"/></clipPath><path d="${body}" fill="${P.wood}"/>`;
  s += `<g clip-path="url(#stp)"><rect x="${x + 2}" y="${yb - h - 2}" width="${rx}" height="${h + ry + 4}" fill="${P.woodD}"/></g>`;
  s += `<path d="${body}" fill="none" ${OUT}/>`;
  for (const dx of [-8, -3, 4, 9]) s += stroke(`M${x + dx},${yb - h + 5} l0,${h - 4}`, P.woodD, 1.2);
  s += ellipse(x, yb - h, rx, ry, P.woodL);
  s += `<ellipse cx="${x}" cy="${yb - h}" rx="8.4" ry="4.1" fill="none" stroke="${P.woodD}" stroke-width="1.3"/>`;
  s += `<ellipse cx="${x}" cy="${yb - h}" rx="3.6" ry="1.8" fill="none" stroke="${P.woodD}" stroke-width="1.2"/>`;
  s += mushroom(x - 15, yb + 2, 1.15) + mushroom(x - 9.5, yb + 4.5, 0.8);
  s += stroke(`M${x + 14},${yb + 2} q3,-5 7,-2 M${x + 17},${yb + 1} q1,-6 5,-6`, P.leafD, 1.6);
  return s;
}

const BED_PAL = [
  [P.pink, P.pinkL, P.yellow],
  [P.paper, P.blueL, P.yellow],
  [P.orange, P.red, P.yellow],
] as const;

function flower(x: number, y: number, col: string, centre: string, r = 3): string {
  let s = stroke(`M${x},${y} l0,6`, P.leafD, 1.6);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, 0.7]] as const) s += circle(x + dx * r * 0.95, y + dy * r * 0.95 * 0.9, r * 0.66, col, false);
  return s + circle(x, y, r * 0.5, centre, false) + circle(x, y, r * 0.2, P.ink, false);
}

function flowerBed(v: number): Draw {
  return (cx, cy) => {
    const pal = BED_PAL[v % 3]!;
    let s = poly3(cx, cy, [[0.08, 0.1, 0], [0.92, 0.1, 0], [0.92, 0.9, 0], [0.08, 0.9, 0]], '#a9783f');
    s += poly3(cx, cy, [[0.14, 0.16, 0], [0.86, 0.16, 0], [0.86, 0.84, 0], [0.14, 0.84, 0]], '#8f5f2e', false);
    const pts: [number, number][] = [];
    for (let i = 0; i < 9; i++) pts.push([0.2 + ((i % 3) + (hash01(v, i, 1) - 0.5) * 0.45) * 0.3, 0.2 + (Math.floor(i / 3) + (hash01(v, i, 2) - 0.5) * 0.45) * 0.3]);
    const placed = pts.map(([a, b], i) => ({ p: pt(cx, cy, a, b, 0), i })).sort((m, n) => m.p[1] - n.p[1]);
    for (const { p: [x, y], i } of placed) {
      s += ellipse(x, y + 1, 5, 2.2, P.leafD, false) + ellipse(x - 1, y, 3.4, 1.6, P.leaf, false);
      s += flower(x, y - 6, pal[i % 3]!, i % 2 ? P.yellow : P.paper, 3.1);
    }
    return s;
  };
}

// ---------- bridge ----------

function bridge(axis: 0 | 1): Draw {
  return (cx, cy) => {
    let s = groundDiamond(cx, cy, P.water);
    s += stroke(`M${cx - 18},${cy + 6} q3,-3 6,0 t6,0`, P.waterD, 1.4);
    s += stroke(`M${cx + 6},${cy - 6} q3,-3 6,0 t6,0`, P.waterL, 1.6);
    const A = axis === 0;
    // coordinates: u = along the bridge, w = across it
    const P3 = (u: number, w: number, z: number): [number, number, number] => (A ? [u, w, z] : [w, u, z]);
    const post = (u: number, w: number): string => line3(cx, cy, [P3(u, w, 2), P3(u, w, 15)], P.ink, 5.5) + line3(cx, cy, [P3(u, w, 2), P3(u, w, 15)], P.woodD, 2.6);
    const rail = (w: number): string =>
      line3(cx, cy, [P3(0, w, 14), P3(1, w, 14)], P.ink, 4.6) + line3(cx, cy, [P3(0, w, 14), P3(1, w, 14)], P.woodL, 2) +
      line3(cx, cy, [P3(0, w, 8), P3(1, w, 8)], P.ink, 4) + line3(cx, cy, [P3(0, w, 8), P3(1, w, 8)], P.wood, 1.6);
    const WL = 0.1;
    const WH = 0.9;
    // far rail, deck, near rail
    s += post(0.5, WL) + rail(WL);
    // under-deck shadow
    s += poly3(cx, cy, A ? [[0, WL + 0.04, 0], [1, WL + 0.04, 0], [1, WH + 0.04, 0], [0, WH + 0.04, 0]] : [[WL + 0.04, 0, 0], [WL + 0.04, 1, 0], [WH + 0.04, 1, 0], [WH + 0.04, 0, 0]], P.waterD, false);
    const b = A ? [0, 1, WL, WH] : [WL, WH, 0, 1];
    s += cuboid(cx, cy, b[0]!, b[1]!, b[2]!, b[3]!, 0, 5, { top: P.woodL, left: P.woodD, right: P.wood });
    for (const t of [0.17, 0.34, 0.5, 0.66, 0.83]) s += line3(cx, cy, [P3(t, WL + 0.02, 5), P3(t, WH - 0.02, 5)], P.woodD, 1.5);
    s += post(0.5, WH) + rail(WH);
    return s;
  };
}

// ---------- signposts ----------

function arrowBoard(x: number, y: number, w: number, h: number, dir: -1 | 1, fill: string, textCol: string, tilt: number): string {
  const tip = h * 0.55;
  const pts: [number, number][] = [[-w / 2, -h / 2], [w / 2 - tip, -h / 2], [w / 2, 0], [w / 2 - tip, h / 2], [-w / 2, h / 2]];
  const m = (p: [number, number]): string => `${p[0] * dir},${p[1]}`;
  const shape = pts.map(m).join(' ');
  let s = `<g transform="translate(${x} ${y}) rotate(${tilt})">`;
  s += `<polygon points="${shape}" transform="translate(3 2.5)" fill="${P.pink}"/>`;
  s += `<polygon points="${shape}" fill="${fill}" ${OUT}/>`;
  s += stroke(`M${(-w / 2 + 4) * dir},${-h / 6} l${(w * 0.46) * dir},0 M${(-w / 2 + 4) * dir},${h / 5} l${(w * 0.3) * dir},0`, textCol, 1.8);
  s += circle((-w / 2 + 3) * dir, 0, 1.1, P.ink, false);
  return `${s}</g>`;
}

function signpost(v: number): Draw {
  return (cx, cy) => {
    const top = v === 1 ? 96 : 84;
    let s = ellipse(cx + 8, cy + 3, 14, 5, P.blue, false);
    // base stones
    s += ellipse(cx - 5, cy + 2, 6, 3, P.steelL) + ellipse(cx + 6, cy + 3, 5, 2.6, P.steel);
    s += poly([[cx - 4, cy + 3], [cx + 4, cy + 3], [cx + 3.4, cy - top], [cx - 3.4, cy - top]], P.woodD);
    s += poly([[cx + 0.4, cy + 3], [cx + 4, cy + 3], [cx + 3.4, cy - top], [cx + 0.4, cy - top]], '#7d5430', false);
    s += `<path d="M${cx - 4},${cy + 3} L${cx + 4},${cy + 3} L${cx + 3.4},${cy - top} L${cx - 3.4},${cy - top} Z" fill="none" ${OUT}/>`;
    s += poly([[cx - 4.6, cy - top], [cx + 4.6, cy - top], [cx, cy - top - 6]], P.woodL);
    const W = 44;
    const H = 14;
    const boards: [number, -1 | 1, string, string, number][] =
      v === 0 ? [[-70, 1, P.woodL, P.ink2, -2], [-52, -1, P.teal, P.paper, 2]]
      : v === 1 ? [[-84, 1, P.teal, P.paper, -2], [-66, -1, P.woodL, P.ink2, 1.5], [-48, 1, P.woodL, P.ink2, -1.5]]
      : v === 2 ? [[-70, -1, P.woodL, P.ink2, 2], [-52, -1, P.pinkL, P.ink2, -1.5]]
      : [[-70, 1, P.woodL, P.ink2, -2], [-52, 1, P.yellow, P.ink2, 1.5]];
    for (const [dy, dir, fill, tc, tilt] of boards) s += arrowBoard(cx + dir * 4, cy + dy, W, H, dir, fill, tc, tilt);
    return s;
  };
}

// ---------- puzzles ----------

const inset = (cx: number, cy: number, a0: number, a1: number, z: number, fill: string, outline = false): string =>
  poly3(cx, cy, [[a0, a0, z], [a1, a0, z], [a1, a1, z], [a0, a1, z]], fill, outline);

function switchPlate(on: boolean): Draw {
  return (cx, cy) => {
    let s = groundDiamond(cx, cy, '#3a3550');
    s += inset(cx, cy, 0.06, 0.94, 0, '#4a4663');
    // hazard corner studs
    for (const [a, b] of [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]] as const) {
      const [x, y] = pt(cx, cy, a, b, 0);
      s += circle(x, y, 1.3, P.ink3, false);
    }
    if (on) {
      s += poly3(cx, cy, [[0.04, 0.04, 0], [0.96, 0.04, 0], [0.96, 0.96, 0], [0.04, 0.96, 0]], P.neon, false, 'opacity="0.34"');
      s += cuboid(cx, cy, 0.18, 0.82, 0.18, 0.82, 0, 1.5, { top: '#b8fff6', left: '#1f9a93', right: '#177a75' });
      s += inset(cx, cy, 0.3, 0.7, 1.5, P.neon);
      const [x, y] = pt(cx, cy, 0.5, 0.5, 1.5);
      s += ellipse(x, y, 7, 3.5, P.paper, false);
      s += stroke(`M${x - 4},${y - 0.4} l2.8,2 l5.6,-4.4`, P.ink, 1.8);
    } else {
      s += cuboid(cx, cy, 0.18, 0.82, 0.18, 0.82, 0, 3.5, { top: P.steelL, left: P.steelD, right: P.ink3 });
      s += inset(cx, cy, 0.3, 0.7, 3.5, P.steel);
      const [x, y] = pt(cx, cy, 0.5, 0.5, 3.5);
      s += `<ellipse cx="${x}" cy="${y}" rx="7" ry="3.5" fill="${P.ink2}" stroke="${P.red}" stroke-width="1.8"/>`;
      s += ellipse(x, y, 2.4, 1.2, P.red, false);
    }
    return s;
  };
}

function gate(cx: number, cy: number): string {
  const H = 36;
  let s = cuboidShadow(cx, cy, 0.04, 0.96, 0.04, 0.96, H, P.pink, 5, 4);
  s += cuboid(cx, cy, 0.04, 0.96, 0.04, 0.96, 0, H, { top: P.steel, left: '#2b2748', right: P.ink });
  const bar = (face: 'l' | 'r', u0: number, z0: number, z1: number, col: string): string =>
    face === 'l' ? lcell(cx, cy, 0.96, u0, u0 + 0.05, z0, z1, col, false) : poly3(cx, cy, [[0.96, 1 - u0, z0], [0.96, 1 - u0 - 0.05, z0], [0.96, 1 - u0 - 0.05, z1], [0.96, 1 - u0, z1]], col, false);
  for (let i = 0; i < 8; i++) {
    const u = 0.1 + i * 0.105;
    s += bar('l', u, 4, H - 5, P.steelL);
    s += bar('r', u, 4, H - 5, P.steelD);
  }
  // hazard rails: yellow base and top bands with ink stripes
  for (const [z0, z1] of [[0, 4.5], [H - 5, H]] as const) {
    s += lcell(cx, cy, 0.96, 0.04, 0.96, z0, z1, P.yellow, false);
    s += poly3(cx, cy, [[0.96, 0.96, z0], [0.96, 0.04, z0], [0.96, 0.04, z1], [0.96, 0.96, z1]], P.yellowD, false);
    for (let k = 0; k < 5; k++) {
      const u = 0.1 + k * 0.18;
      s += poly3(cx, cy, [[u, 0.96, z0], [u + 0.07, 0.96, z0], [u + 0.11, 0.96, z1], [u + 0.04, 0.96, z1]], P.ink, false);
    }
  }
  // lock
  const [lx, ly] = pt(cx, cy, 0.5, 0.96, 19);
  s += circle(lx + 2, ly + 2, 6.4, P.pink, false);
  s += circle(lx, ly, 6.2, P.red);
  s += rect(lx - 2.2, ly - 1.4, 4.4, 4, P.paper, 0.8, false) + stroke(`M${lx - 1.6},${ly - 1.4} v-2 q1.6,-2.2 3.2,0 v2`, P.paper, 1.3);
  return s;
}

function gateOpen(cx: number, cy: number): string {
  // sunken grate where the bars retracted, with two low posts and green lights
  let s = poly3(cx, cy, [[0.1, 0.1, 0], [0.9, 0.1, 0], [0.9, 0.9, 0], [0.1, 0.9, 0]], P.ink);
  for (const t of [0.22, 0.34, 0.46, 0.58, 0.7, 0.82]) s += line3(cx, cy, [[0.12, t, 0], [0.88, t, 0]], P.steelD, 1.6);
  s += poly3(cx, cy, [[0.1, 0.1, 0], [0.9, 0.1, 0], [0.9, 0.9, 0], [0.1, 0.9, 0]], 'none', true);
  s += line3(cx, cy, [[0.1, 0.9, 0], [0.9, 0.9, 0]], P.gpu, 2) + line3(cx, cy, [[0.9, 0.9, 0], [0.9, 0.1, 0]], P.gpuD, 2);
  for (const [a, b] of [[0.02, 0.5], [0.98, 0.5]] as const) {
    const a0 = a < 0.5 ? 0 : 0.88;
    s += cuboid(cx, cy, a0 + 0.02, a0 + 0.1, b - 0.12, b + 0.12, 0, 14, { top: P.steelL, left: P.ink2, right: P.ink });
    const [x, y] = pt(cx, cy, a0 + 0.06, b, 14);
    s += circle(x, y - 3, 5, P.gpu, false).replace('<circle', '<circle opacity="0.4"') + circle(x, y - 3, 2.4, '#d7ffb8');
  }
  return s;
}

const CRATE_PAL = [
  { top: P.woodL, left: P.wood, right: P.woodD, dark: P.woodD, plate: P.paper },
  { top: P.steelL, left: P.steel, right: P.steelD, dark: P.steelD, plate: P.yellow },
  { top: P.tealL, left: P.teal, right: P.tealD, dark: P.tealD, plate: P.paper },
] as const;

function crate(v: number): Draw {
  return (cx, cy) => {
    const pal = CRATE_PAL[v % 3]!;
    const H = 26;
    const b = blockParts(cx, cy, H, { top: pal.top, left: pal.left, right: pal.right });
    let s = blockShadow(cx, cy, H, P.pink) + b.left + b.right + b.top;
    // top boards + straps
    s += line3(cx, cy, [[0.5, 0.04, H], [0.5, 0.96, H]], pal.dark, 1.2);
    // left face: frame, brace, plate with a weight glyph
    const frame = (w: number, h: number): string =>
      `<path d="M2,2 H${w - 2} V${h - 2} H2 Z M2,2 L${w - 2},${h - 2}" fill="none" stroke="${pal.dark}" stroke-width="2"/>`;
    s += leftPlaneG(cx, cy, 0, 1, H, frame(32, H) + rect(8, 5, 16, 16, pal.plate, 1.5) +
      path('M11.5,19 L13.4,11.6 H18.6 L20.5,19 Z', P.ink, false) + stroke('M14.2,11.6 q1.8,-4.6 3.6,0', P.ink, 1.5) + text(16, 17.7, 4.4, pal.plate, 'kg'));
    s += rightPlaneG(cx, cy, 1, 1, H, frame(32, H) + rect(8, 5, 16, 16, pal.plate, 1.5) + text(16, 18.3, 13, P.ink, 'W'));
    // corner brackets
    for (const [a, bb] of [[0, 1], [1, 1], [1, 0]] as const) s += line3(cx, cy, [[a, bb, 1], [a, bb, H - 1]], P.ink, 3);
    return s;
  };
}

/** Position-picked variants. Also available but chosen explicitly: signpost:0..3, crate_push:0..2, bridge_wood/arena_line :0|:1 by axis. */
export const FOREST_VARIANTS = {
  tree_pine: 3, tree_birch: 3, flower_bed: 3, log: 2,
} as const;

export function forestEntries(): ArtEntry[] {
  const out: ArtEntry[] = [];
  const add = (key: string, up: number, draw: Draw, w?: number): void => {
    out.push(tileEntry(key, up, draw, w));
  };
  for (let v = 0; v < 3; v++) {
    add(`tree_pine:${v}`, 116, pine(v), 88);
    add(`tree_birch:${v}`, 130, birch(v), 104);
    add(`flower_bed:${v}`, 24, flowerBed(v));
    add(`crate_push:${v}`, 36, crate(v));
  }
  add('log:0', 30, log(0), 84);
  add('log:1', 30, log(1), 84);
  add('stump:0', 32, stump);
  add('bridge_wood:0', 22, bridge(0));
  add('bridge_wood:1', 22, bridge(1));
  for (let v = 0; v < 4; v++) add(`signpost:${v}`, 112, signpost(v));
  add('switch_plate:0', 6, switchPlate(false));
  add('switch_plate_on:0', 6, switchPlate(true));
  add('gate:0', 46, gate);
  add('gate_open:0', 22, gateOpen);
  return out;
}
