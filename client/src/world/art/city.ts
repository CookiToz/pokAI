// v0.3 tile art: city ground, towers, shops, data highways, the AIACT detention centre and street props.
// Same riso rules as tiles.ts: flat fills, 2px ink outlines, hard pink/blue offset shadows on tall objects.
import {
  LAMP_PX, VENDING_PX,
  OUT, P, blockParts, blockShadow, circle, cuboid, ellipse, groundDiamond, hash01, lcell, leftPlaneG, leftQuad, line3, path, poly, poly3, pt,
  rcell, rect, rightQuad, stroke, text, tileEntry, type ArtEntry,
} from './kit';
import { FOREST_VARIANTS } from './forest';
import { THEMED_VARIANTS } from './themed';

type Draw = (cx: number, cy: number) => string;

const spot = (cx: number, cy: number, v: number, i: number): [number, number] =>
  pt(cx, cy, 0.18 + hash01(v, i, 1) * 0.64, 0.18 + hash01(v, i, 2) * 0.64);

const quad = (cx: number, cy: number, a0: number, a1: number, b0: number, b1: number, fill: string, z = 0, outline = false): string =>
  poly3(cx, cy, [[a0, b0, z], [a1, b0, z], [a1, b1, z], [a0, b1, z]], fill, outline);

// ---------- city ground ----------

function asphalt(v: number): Draw {
  return (cx, cy) => {
    let s = groundDiamond(cx, cy, P.asphalt);
    for (let i = 0; i < 6; i++) {
      const [x, y] = spot(cx, cy, v + 3, i);
      s += circle(x, y, 0.9, i % 2 ? P.asphaltL : P.asphaltD, false);
    }
    return s;
  };
}

/** Asphalt with a dashed lane mark running along gx ('x') or gy ('y'). */
function asphaltLane(axis: 'x' | 'y'): Draw {
  return (cx, cy) => {
    let s = asphalt(1)(cx, cy);
    const seg = (t0: number, t1: number): string =>
      axis === 'x' ? quad(cx, cy, t0, t1, 0.46, 0.54, P.paper) : quad(cx, cy, 0.46, 0.54, t0, t1, P.paper);
    s += seg(0, 0.36) + seg(0.64, 1);
    return s;
  };
}

function sidewalk(cx: number, cy: number): string {
  let s = groundDiamond(cx, cy, P.slab);
  s += quad(cx, cy, 0, 0.5, 0.5, 1, P.slabD);
  s += quad(cx, cy, 0.5, 1, 0, 0.5, P.slabD);
  s += line3(cx, cy, [[0.5, 0.02, 0], [0.5, 0.98, 0]], P.concreteD, 1.2);
  s += line3(cx, cy, [[0.02, 0.5, 0], [0.98, 0.5, 0]], P.concreteD, 1.2);
  const [x, y] = pt(cx, cy, 0.27, 0.74);
  s += circle(x, y, 1, P.concreteD, false);
  return s;
}

/** Zebra crossing; bars run along gx ('x') or gy ('y'). */
function crosswalk(axis: 'x' | 'y'): Draw {
  return (cx, cy) => {
    let s = groundDiamond(cx, cy, P.asphalt);
    for (const c of [0.17, 0.39, 0.61, 0.83]) {
      s += axis === 'x' ? quad(cx, cy, 0.04, 0.96, c - 0.07, c + 0.07, P.paper) : quad(cx, cy, c - 0.07, c + 0.07, 0.04, 0.96, P.paper);
    }
    return s;
  };
}

function plaza(cx: number, cy: number): string {
  let s = groundDiamond(cx, cy, '#ecdfc9');
  s += quad(cx, cy, 0, 0.5, 0, 0.5, '#f3c9d4');
  s += quad(cx, cy, 0.5, 1, 0.5, 1, '#f3c9d4');
  s += line3(cx, cy, [[0.5, 0.02, 0], [0.5, 0.98, 0]], P.paper3, 1.2);
  s += line3(cx, cy, [[0.02, 0.5, 0], [0.98, 0.5, 0]], P.paper3, 1.2);
  s += poly3(cx, cy, [[0.5, 0.36, 0], [0.64, 0.5, 0], [0.5, 0.64, 0], [0.36, 0.5, 0]], P.yellow, false);
  return s;
}

function grassPark(v: number): Draw {
  return (cx, cy) => {
    let s = groundDiamond(cx, cy, '#98dca0');
    s += quad(cx, cy, 0, 1, 0, 0.5, P.grassA);
    for (let i = 0; i < 2; i++) {
      const [x, y] = spot(cx, cy, v + 40, i);
      s += stroke(`M${x - 2},${y} L${x - 3},${y - 4} M${x},${y} L${x},${y - 5} M${x + 2},${y} L${x + 3},${y - 4}`, P.grassD, 1.4);
    }
    if (v === 1) {
      const [x, y] = spot(cx, cy, v, 9);
      s += circle(x, y, 1.5, P.pink, false) + circle(x + 4, y + 1, 1.3, P.yellow, false);
    }
    return s;
  };
}

function cellFloor(cx: number, cy: number): string {
  let s = groundDiamond(cx, cy, '#aab0c8');
  s += quad(cx, cy, 0, 0.5, 0, 0.5, '#a1a7c0');
  s += quad(cx, cy, 0.5, 1, 0.5, 1, '#a1a7c0');
  s += line3(cx, cy, [[0.5, 0.02, 0], [0.5, 0.98, 0]], '#8b91ad', 1.2);
  s += line3(cx, cy, [[0.02, 0.5, 0], [0.98, 0.5, 0]], '#8b91ad', 1.2);
  s += line3(cx, cy, [[0.2, 0.7, 0], [0.38, 0.62, 0]], '#8b91ad', 1);
  const [x, y] = pt(cx, cy, 0.72, 0.3);
  s += circle(x, y, 2, '#8b91ad', false);
  return s;
}

// ---------- data highways ----------

const RIBBONS = [P.pink, P.yellow, P.neon, P.orange, P.pinkL];

function dataStream(v: number): Draw {
  return (cx, cy) => {
    let s = groundDiamond(cx, cy, '#262150');
    s += quad(cx, cy, 0, 1, 0, 0.12, '#1b173d');
    const ph = (v / 3) * Math.PI * 2;
    [0.2, 0.5, 0.8].forEach((base, k) => {
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        pts.push([t, base + 0.1 * Math.sin(Math.PI * t) * Math.sin(Math.PI * 4 * t + ph + k * 2), 0]);
      }
      const col = RIBBONS[(k + v) % RIBBONS.length] as string;
      s += line3(cx, cy, pts, P.ink, 5.4);
      s += line3(cx, cy, pts, col, 2.8);
    });
    for (let i = 0; i < 3; i++) {
      const [x, y] = spot(cx, cy, v + 11, i);
      s += rect(x - 1.5, y - 1.5, 3, 3, i % 2 ? P.paper : P.neon, 0, false);
    }
    return s;
  };
}

/** Floating glyph/ribbon bloom standing on a data_stream tile (the cable-tuft equivalent). */
export function streamTuft(seed: number): ArtEntry {
  const w = 56;
  const h = 48;
  const bx = w / 2;
  const by = h - 6;
  let s = '';
  for (let i = 0; i < 4; i++) {
    const col = RIBBONS[(i + seed) % RIBBONS.length] as string;
    const x1 = bx + (i - 1.5) * 11 + (hash01(seed, i, 3) - 0.5) * 6;
    const hh = 22 + hash01(seed, i, 5) * 14;
    const curl = (hash01(seed, i, 6) - 0.5) * 16;
    const d = `M${bx + (i - 1.5) * 3},${by} C${bx + curl},${by - hh * 1.2} ${x1 - curl},${by - hh} ${x1},${by - hh}`;
    s += `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="5" stroke-linecap="round"/>`;
    s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/>`;
    s += rect(x1 - 3, by - hh - 3, 6, 6, i % 2 ? P.paper : P.neon, 1);
    s += rect(x1 - 0.8, by - hh - 1.8, 1.6, 3.6, P.ink, 0, false);
  }
  s += ellipse(bx, by + 1, 7, 2.6, P.ink, false);
  return { key: `stream_tuft:${seed}`, w, h, anchorY: by, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2}" height="${h * 2}" viewBox="0 0 ${w} ${h}">${s}</svg>` };
}

function dataLane(axis: 'x' | 'y'): Draw {
  return (cx, cy) => {
    let s = groundDiamond(cx, cy, '#1b1830');
    if (axis === 'x') {
      s += quad(cx, cy, 0, 1, 0.05, 0.12, '#2a7e8e') + quad(cx, cy, 0, 1, 0.88, 0.95, '#2a7e8e');
      s += quad(cx, cy, 0, 1, 0.07, 0.1, P.neon) + quad(cx, cy, 0, 1, 0.9, 0.93, P.neon);
    } else {
      s += quad(cx, cy, 0.05, 0.12, 0, 1, '#2a7e8e') + quad(cx, cy, 0.88, 0.95, 0, 1, '#2a7e8e');
      s += quad(cx, cy, 0.07, 0.1, 0, 1, P.neon) + quad(cx, cy, 0.9, 0.93, 0, 1, P.neon);
    }
    for (const a of [0.2, 0.62]) {
      const chev: [number, number, number][] =
        axis === 'x'
          ? [[a, 0.3, 0], [a + 0.16, 0.5, 0], [a, 0.7, 0], [a - 0.1, 0.7, 0], [a + 0.06, 0.5, 0], [a - 0.1, 0.3, 0]]
          : [[0.3, a, 0], [0.5, a + 0.16, 0], [0.7, a, 0], [0.7, a - 0.1, 0], [0.5, a + 0.06, 0], [0.3, a - 0.1, 0]];
      s += poly3(cx, cy, chev, a < 0.5 ? '#2fb7c4' : P.neon, false);
    }
    return s;
  };
}

function dataBridge(axis: 'x' | 'y'): Draw {
  return (cx, cy) => {
    const b = blockParts(cx, cy, 4, { top: P.steelL, left: P.ink2, right: P.ink });
    let s = b.left + b.right + b.top;
    s += quad(cx, cy, 0.04, 0.96, 0.04, 0.96, P.steel, 4);
    if (axis === 'x') {
      s += quad(cx, cy, 0.04, 0.96, 0.04, 0.12, P.neon, 4) + quad(cx, cy, 0.04, 0.96, 0.88, 0.96, P.neon, 4);
      for (const a of [0.25, 0.5, 0.75]) s += line3(cx, cy, [[a, 0.14, 4], [a, 0.86, 4]], P.steelD, 1.3);
    } else {
      s += quad(cx, cy, 0.04, 0.12, 0.04, 0.96, P.neon, 4) + quad(cx, cy, 0.88, 0.96, 0.04, 0.96, P.neon, 4);
      for (const a of [0.25, 0.5, 0.75]) s += line3(cx, cy, [[0.14, a, 4], [0.86, a, 4]], P.steelD, 1.3);
    }
    for (const [a, bb] of [[0.18, 0.5], [0.82, 0.5], [0.5, 0.2], [0.5, 0.8]] as const) {
      const [x, y] = pt(cx, cy, a, bb, 4);
      s += circle(x, y, 1, P.ink3, false);
    }
    return s;
  };
}

function fiber(cx: number, cy: number): string {
  let s = ellipse(cx + 6, cy + 4, 14, 6, P.blue, false);
  s += cuboid(cx, cy, 0.3, 0.7, 0.3, 0.7, 0, 7, { top: P.ink3, left: P.ink2, right: P.ink });
  const tips = [P.pink, P.neon, P.yellow, P.orange, P.pinkL, P.tealL, P.paper];
  const n = tips.length;
  const bx = cx;
  const by = cy - 8;
  tips.forEach((col, i) => {
    const t = (i / (n - 1)) * 2 - 1;
    const tx = bx + t * 22;
    const ty = by - 38 - (1 - Math.abs(t)) * 12 - hash01(i, 2, 5) * 4;
    const d = `M${bx + t * 3},${by} C${bx + t * 4},${by - 22} ${tx - t * 6},${ty + 12} ${tx},${ty}`;
    s += `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="3.6" stroke-linecap="round"/>`;
    s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/>`;
    s += `<circle cx="${tx}" cy="${ty}" r="5.4" fill="${col}" opacity="0.38"/>`;
    s += circle(tx, ty, 2.2, P.paper);
  });
  return s;
}

function roadSign(cx: number, cy: number): string {
  let s = ellipse(cx + 6, cy + 4, 15, 6, P.blue, false);
  s += poly3(cx, cy, [[0.1, 0.5, 0], [0.16, 0.5, 0], [0.16, 0.5, 40], [0.1, 0.5, 40]], P.ink2);
  s += poly3(cx, cy, [[0.84, 0.5, 0], [0.9, 0.5, 0], [0.9, 0.5, 40], [0.84, 0.5, 40]], P.ink2);
  const board = (dx: number, dy: number, fill: string, outline: boolean): string =>
    leftPlaneG(cx, cy, -0.1, 0.5, 74, `<g transform="translate(${dx} ${dy})">${rect(0, 0, 38, 32, fill, 3, outline)}</g>`);
  s += board(3, 3, P.pink, false);
  s += board(0, 0, '#1f9a5a', true);
  s += leftPlaneG(
    cx, cy, -0.1, 0.5, 74,
    rect(3, 3, 32, 26, 'none', 2, false).replace('fill="none"', `fill="none" stroke="${P.paper}" stroke-width="1.4"`) +
      text(19, 12, 6, P.paper, 'SORTIE') + text(19, 24, 12, P.yellow, '404') +
      poly([[29, 6], [34, 8.5], [29, 11]], P.paper, false),
  );
  return s;
}

// ---------- AIACT detention centre ----------

export const PRISON_WALL_H = 96;
const CELL_H = 76;

function prisonWall(cx: number, cy: number): string {
  const H = PRISON_WALL_H;
  const b = blockParts(cx, cy, H, { top: '#9a9ebb', left: '#7c80a0', right: '#646988' });
  let s = blockShadow(cx, cy, H, P.pink) + b.left + b.right + b.top;
  s += leftQuad(cx, cy, 0, 1, 0, 5, P.yellow, false);
  s += rightQuad(cx, cy, 0, 1, 0, 5, P.yellowD, false);
  for (const u of [0.15, 0.4, 0.65, 0.9]) s += leftQuad(cx, cy, u - 0.03, u + 0.03, 0, 5, P.ink, false);
  s += line3(cx, cy, [[0, 1, 48], [1, 1, 48]], '#555a78', 1.6) + line3(cx, cy, [[1, 1, 48], [1, 0, 48]], '#555a78', 1.6);
  s += line3(cx, cy, [[0.5, 1, 48], [0.5, 1, H]], '#555a78', 1.4) + line3(cx, cy, [[1, 0.5, 48], [1, 0.5, H]], '#555a78', 1.4);
  for (const [u, z] of [[0.1, 62], [0.9, 62], [0.1, 84], [0.9, 84], [0.4, 28], [0.6, 28]] as const) {
    const [x, y] = pt(cx, cy, u, 1, z);
    s += circle(x, y, 1, '#555a78', false);
  }
  return s;
}

function cellBars(axis: 'x' | 'y'): Draw {
  return (cx, cy) => {
    let s = '';
    const at = (u: number, z: number): [number, number, number] => (axis === 'x' ? [u, 0.5, z] : [0.5, u, z]);
    s += line3(cx, cy, [at(0.02, 0), at(0.02, CELL_H)], P.ink, 6) + line3(cx, cy, [at(0.98, 0), at(0.98, CELL_H)], P.ink, 6);
    for (const u of [0.18, 0.34, 0.5, 0.66, 0.82]) {
      s += line3(cx, cy, [at(u, 3), at(u, CELL_H - 2)], P.ink, 4.4);
      s += line3(cx, cy, [at(u, 3), at(u, CELL_H - 2)], P.steelL, 1.8);
    }
    for (const z of [3, CELL_H - 2]) {
      s += line3(cx, cy, [at(0, z), at(1, z)], P.ink, 6.4);
      s += line3(cx, cy, [at(0, z), at(1, z)], P.steel, 3);
    }
    const lock = at(0.5, 38);
    const [x, y] = pt(cx, cy, lock[0], lock[1], lock[2]);
    s += rect(x - 3, y - 4, 6, 8, P.yellow, 1);
    return s;
  };
}

function locker(cx: number, cy: number): string {
  const H = 72;
  const b = blockParts(cx, cy, H, { top: '#9db6d6', left: '#5f7fae', right: '#4a6791' });
  let s = blockShadow(cx, cy, H, P.pink) + b.left + b.right + b.top;
  for (const [u0, u1] of [[0.05, 0.48], [0.52, 0.95]] as const) {
    s += leftQuad(cx, cy, u0, u1, 3, H - 3, '#6f92c4');
    for (const z of [H - 12, H - 17, H - 22]) s += leftQuad(cx, cy, u0 + 0.08, u1 - 0.08, z, z + 1.6, '#3b5688', false);
  }
  s += leftQuad(cx, cy, 0.4, 0.44, 30, 38, P.yellow, false) + leftQuad(cx, cy, 0.56, 0.6, 30, 38, P.yellow, false);
  s += rightQuad(cx, cy, 0.1, 0.9, 3, H - 3, '#56759f');
  s += rightQuad(cx, cy, 0.18, 0.82, 22, 24, '#3b5688', false);
  return s;
}

function terminal(cx: number, cy: number): string {
  const b = blockParts(cx, cy, 16, { top: P.ink3, left: P.ink2, right: P.ink });
  let s = blockShadow(cx, cy, 16, P.blue) + b.left + b.right + b.top;
  s += poly3(cx, cy, [[0.2, 0.6, 16], [0.8, 0.6, 16], [0.8, 0.9, 16], [0.2, 0.9, 16]], P.steel);
  s += planeB2(cx, cy, 0.5, 0.28, 0.72, 16, 20, P.ink2);
  s += planeB2(cx, cy, 0.5, 0.1, 0.9, 19, 44, P.ink);
  s += planeB2(cx, cy, 0.5, 0.16, 0.84, 22, 41, '#1d3b2a', false);
  for (const [z, u1] of [[37, 0.7], [33, 0.55], [29, 0.75], [25, 0.4]] as const) s += planeB2(cx, cy, 0.5, 0.22, u1, z, z + 2, '#6fe08a', false);
  s += planeB2(cx, cy, 0.5, 0.46, 0.52, 24.5, 27, P.paper, false);
  return s;
}
const planeB2 = (cx: number, cy: number, b: number, u0: number, u1: number, z0: number, z1: number, fill: string, outline = true): string =>
  lcell(cx, cy, b, u0, u1, z0, z1, fill, outline);

function guardDesk(cx: number, cy: number): string {
  const H = 36;
  const b = blockParts(cx, cy, H, { top: '#c8cad8', left: '#8a8ea6', right: '#6c7090' });
  let s = blockShadow(cx, cy, H, P.pink) + b.left + b.right + b.top;
  s += leftQuad(cx, cy, 0.06, 0.94, 3, 22, P.ink2, false);
  s += leftQuad(cx, cy, 0.12, 0.88, 6, 18, P.redD, false);
  s += `<g>${leftPlaneG(cx, cy, 0.06, 1, 20, text(15, 0, 4.6, P.paper, 'CONFORME', 'middle', 'textLength="30" lengthAdjust="spacingAndGlyphs"'))}</g>`;
  // monitor
  s += lcell(cx, cy, 0.4, 0.14, 0.46, H, H + 14, P.ink);
  s += lcell(cx, cy, 0.4, 0.18, 0.42, H + 3, H + 12, P.blueL, false);
  // stamp pad, mug, radio
  s += poly3(cx, cy, [[0.55, 0.6, H], [0.8, 0.6, H], [0.8, 0.82, H], [0.55, 0.82, H]], P.red);
  const [mx, my] = pt(cx, cy, 0.3, 0.74, H);
  s += rect(mx - 3, my - 6, 6, 6, P.paper, 1.5);
  // red alarm light
  const [lx, ly] = pt(cx, cy, 0.85, 0.2, H);
  s += rect(lx - 3, ly - 8, 6, 8, P.red, 2);
  s += circle(lx, ly - 12, 2, P.redL, false);
  return s;
}

function searchlight(cx: number, cy: number): string {
  let s = ellipse(cx + 6, cy + 4, 13, 5, P.pink, false);
  // beam first (translucent flat wedge)
  s += `<polygon points="${cx + 4},${cy - 72} ${cx - 44},${cy - 118} ${cx - 10},${cy - 134}" fill="#fff3a0" opacity="0.42"/>`;
  s += cuboid(cx, cy, 0.3, 0.7, 0.3, 0.7, 0, 8, { top: P.ink3, left: P.ink2, right: P.ink });
  s += rect(cx - 2.5, cy - 62, 5, 56, P.ink2, 1);
  s += `<g transform="rotate(-38 ${cx} ${cy - 70})">${rect(cx - 9, cy - 82, 20, 22, P.steelD, 4)}${ellipse(cx - 9, cy - 71, 4, 9.5, P.yellow)}${rect(cx + 6, cy - 78, 3, 14, P.steelL, 1, false)}</g>`;
  s += circle(cx, cy - 62, 3.5, P.ink3);
  return s;
}

// Shops, towers, awnings and the thick concrete / AIACT blocks are buildings: see buildings.ts (v0.7).

// ---------- street props ----------

function streetLamp(cx: number, cy: number): string {
  const L = LAMP_PX;
  let s = ellipse(cx + 6, cy + 4, 11, 4.5, P.blue, false);
  s += rect(cx - 6, cy - 3, 12, 7, P.ink3, 2);
  s += rect(cx - 2.2, cy - (L - 14), 4.4, L - 16, P.ink2, 1);
  s += path(`M${cx},${cy - (L - 14)} q0,-14 16,-12`, 'none', false, `stroke="${P.ink}" stroke-width="5" stroke-linecap="round"`);
  s += path(`M${cx},${cy - (L - 14)} q0,-14 16,-12`, 'none', false, `stroke="${P.ink2}" stroke-width="2.4" stroke-linecap="round"`);
  s += poly([[cx + 10, cy - (L + 2)], [cx + 28, cy - (L + 2)], [cx + 26, cy - (L - 5)], [cx + 12, cy - (L - 5)]], P.paper);
  s += poly([[cx + 12, cy - (L - 5)], [cx + 26, cy - (L - 5)], [cx + 24, cy - (L - 8)], [cx + 14, cy - (L - 8)]], P.yellow, false);
  s += `<polygon points="${cx + 12},${cy - (L - 8)} ${cx + 26},${cy - (L - 8)} ${cx + 33},${cy - (L - 30)} ${cx + 5},${cy - (L - 30)}" fill="#fff3a0" opacity="0.28"/>`;
  return s;
}

function benchSeat(cx: number, cy: number): string {
  let s = ellipse(cx + 5, cy + 6, 22, 7, P.blue, false);
  for (const a of [0.14, 0.86]) s += line3(cx, cy, [[a, 0.56, 0], [a, 0.56, 10]], P.ink2, 3.4);
  s += cuboid(cx, cy, 0.08, 0.92, 0.28, 0.36, 10, 26, { top: P.woodL, left: P.wood, right: P.woodD });
  for (const z of [16, 22]) s += lcell(cx, cy, 0.36, 0.1, 0.9, z, z + 1.2, P.woodD, false);
  s += cuboid(cx, cy, 0.04, 0.96, 0.38, 0.72, 10, 14, { top: P.woodL, left: P.wood, right: P.woodD });
  s += line3(cx, cy, [[0.2, 0.38, 14], [0.2, 0.72, 14]], P.woodD, 1.2) + line3(cx, cy, [[0.5, 0.38, 14], [0.5, 0.72, 14]], P.woodD, 1.2) + line3(cx, cy, [[0.8, 0.38, 14], [0.8, 0.72, 14]], P.woodD, 1.2);
  return s;
}

function planter(cx: number, cy: number): string {
  let s = cuboidSh(cx, cy, 0.1, 0.9, 0.1, 0.9, 12, P.blue);
  s += cuboid(cx, cy, 0.1, 0.9, 0.1, 0.9, 0, 12, { top: '#5a4636', left: P.concrete, right: P.concreteD });
  s += leftQuad(cx, cy, 0.1, 0.9, 8, 10, P.concreteL, false);
  const blob = (x: number, y: number, rx: number, ry: number): string => ellipse(x, y, rx, ry, P.leafD) + ellipse(x - 2, y - 2, rx - 3, ry - 3, P.leaf, false) + ellipse(x - rx * 0.3, y - ry * 0.4, rx * 0.3, ry * 0.25, P.leafL, false);
  s += blob(cx - 9, cy - 20, 11, 8) + blob(cx + 9, cy - 21, 11, 8) + blob(cx, cy - 27, 11, 9);
  s += circle(cx - 7, cy - 22, 2, P.pink) + circle(cx + 10, cy - 24, 2, P.yellow) + circle(cx + 1, cy - 31, 2, P.pinkL);
  return s;
}
const cuboidSh = (cx: number, cy: number, a0: number, a1: number, b0: number, b1: number, h: number, colour: string): string => {
  const ps = [pt(cx, cy, a0, b0, h), pt(cx, cy, a1, b0, h), pt(cx, cy, a1, b0, 0), pt(cx, cy, a1, b1, 0), pt(cx, cy, a0, b1, 0), pt(cx, cy, a0, b1, h)];
  return `<polygon points="${ps.map(([x, y]) => `${x + 4},${y + 3}`).join(' ')}" fill="${colour}" stroke="${colour}" stroke-width="2" stroke-linejoin="round"/>`;
};

function foodCart(cx: number, cy: number): string {
  const CH = 38; // counter height: about hip level
  let s = cuboidSh(cx, cy, 0.1, 0.9, 0.2, 0.8, CH, P.blue);
  s += cuboid(cx, cy, 0.1, 0.9, 0.2, 0.8, 12, CH, { top: P.woodL, left: P.pink, right: '#c2257f' });
  s += leftQuad(cx, cy, 0.14, 0.86, 16, CH - 4, P.paper, false);
  s += leftPlaneG(cx, cy, 0.14, 0.8, CH - 8, text(14, -3.4, 6, P.pink, 'NOUILLES', 'middle', 'textLength="25" lengthAdjust="spacingAndGlyphs"'));
  // wheels
  for (const a of [0.24, 0.76]) {
    const [x, y] = pt(cx, cy, a, 0.8, 9);
    s += circle(x, y, 7, P.ink2) + circle(x, y, 2.6, P.steelL, false);
  }
  // umbrella
  const [px, py] = pt(cx, cy, 0.5, 0.5, CH);
  s += rect(px - 1.5, py - 60, 3, 60, P.ink2, 0.5);
  const top = py - 62;
  const stripes: string[] = [];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const x0 = px - 30 + (60 * i) / n;
    const x1 = px - 30 + (60 * (i + 1)) / n;
    stripes.push(poly([[px, top - 12], [x0, top + 4], [x1, top + 4]], i % 2 ? P.paper : P.teal));
  }
  s += stripes.join('');
  s += circle(px, top - 13, 1.8, P.yellow);
  // steam
  s += stroke(`M${px - 8},${py - 12} q-3,-4 0,-7 t0,-7`, P.paper3, 1.6);
  return s;
}

function billboard(cx: number, cy: number): string {
  let s = ellipse(cx + 6, cy + 5, 18, 6, P.blue, false);
  for (const a of [0.05, 0.95]) s += line3(cx, cy, [[a, 0.5, 0], [a, 0.5, 52]], P.ink2, 4.6);
  const W = 60;
  const Hh = 34;
  s += leftPlaneG(cx, cy, -0.4, 0.5, 90, `<g transform="translate(4 4)">${rect(0, 0, W, Hh, P.blue, 2, false)}</g>`);
  s += leftPlaneG(
    cx, cy, -0.4, 0.5, 90,
    rect(0, 0, W, Hh, P.pink, 2) + rect(3, 3, W - 6, Hh - 6, 'none', 1, false).replace('fill="none"', `fill="none" stroke="${P.paper}" stroke-width="1"`) +
      text(W / 2, 17, 13, P.paper, 'AGI') + text(W / 2, 26, 6, P.yellow, 'DANS 2 ANS*') + text(W / 2, 31, 3.4, P.paper, '*PROMIS, JURE'),
  );
  s += lcell(cx, cy, 0.5, -0.4, 1.5, 52, 56, P.ink2, false);
  return s;
}

function trafficCone(cx: number, cy: number): string {
  let s = ellipse(cx + 5, cy + 3, 11, 4.5, P.blue, false);
  s += cuboid(cx, cy, 0.3, 0.7, 0.3, 0.7, 0, 3, { top: P.orangeD, left: P.orangeD, right: P.ink2 });
  const [x, y] = pt(cx, cy, 0.5, 0.5, 3);
  s += poly([[x - 9, y], [x + 9, y], [x + 3, y - 26], [x - 3, y - 26]], P.orange);
  s += poly([[x - 6, y - 8], [x + 6, y - 8], [x + 4.5, y - 14], [x - 4.5, y - 14]], P.paper, false);
  s += poly([[x + 1, y], [x + 9, y], [x + 3, y - 26], [x + 1, y - 26]], P.orangeD, false);
  s += `<path d="M${x - 9},${y} L${x + 9},${y} L${x + 3},${y - 26} L${x - 3},${y - 26} Z" fill="none" ${OUT}/>`;
  s += ellipse(x, y - 26, 3, 1.2, P.orangeD);
  return s;
}

function vending(cx: number, cy: number): string {
  const H = VENDING_PX;
  let s = cuboidSh(cx, cy, 0.2, 0.8, 0.25, 0.75, H, P.pink);
  s += cuboid(cx, cy, 0.2, 0.8, 0.25, 0.75, 0, H, { top: P.redL, left: P.red, right: P.redD });
  s += lcell(cx, cy, 0.75, 0.26, 0.72, 22, 72, P.glassL);
  const cans = [P.blue, P.yellow, P.leaf, P.pink, P.orange];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s += lcell(cx, cy, 0.75, 0.28 + c * 0.105, 0.28 + c * 0.105 + 0.08, 26 + r * 11, 34 + r * 11, cans[(r * 2 + c) % cans.length] as string, false);
  s += lcell(cx, cy, 0.75, 0.26, 0.74, 4, 16, P.ink2, false) + lcell(cx, cy, 0.75, 0.36, 0.64, 7, 12, P.ink, false);
  s += lcell(cx, cy, 0.75, 0.74, 0.78, 22, 72, P.redD, false);
  s += rcell(cx, cy, 0.8, 0.7, 0.3, 50, 70, P.paper, false);
  s += rcell(cx, cy, 0.8, 0.6, 0.4, 56, 62, P.pink, false);
  s += rcell(cx, cy, 0.8, 0.64, 0.5, 20, 26, P.ink, false);
  return s;
}

const blocker: Draw = () => '';

// ---------- registry ----------

/** Tile names that get a variant sequence :0..n-1 (the engine picks by hash); all others only have :0. */
export const CITY_VARIANTS: Readonly<Record<string, number>> = { ...FOREST_VARIANTS, ...THEMED_VARIANTS, data_stream: 3, grass_park: 3 };

export function cityTileEntries(): ArtEntry[] {
  const out: ArtEntry[] = [];
  const add = (key: string, up: number, draw: Draw, w?: number): void => {
    out.push(tileEntry(key, up, draw, w));
  };
  add('asphalt:0', 0, asphalt(0));
  add('asphalt_lane_x:0', 0, asphaltLane('x'));
  add('asphalt_lane_y:0', 0, asphaltLane('y'));
  add('sidewalk:0', 0, sidewalk);
  add('crosswalk:0', 0, crosswalk('x'));
  add('crosswalk_y:0', 0, crosswalk('y'));
  add('plaza:0', 0, plaza);
  add('cell_floor:0', 0, cellFloor);
  for (let v = 0; v < 3; v++) {
    add(`grass_park:${v}`, 0, grassPark(v));
    add(`data_stream:${v}`, 0, dataStream(v));
    out.push(streamTuft(v));
  }
  add('data_lane:0', 0, dataLane('x'));
  add('data_lane:1', 0, dataLane('y'));
  add('data_bridge:0', 4, dataBridge('x'));
  add('data_bridge:1', 4, dataBridge('y'));
  add('fiber:0', 70, fiber);
  add('road_sign:0', 84, roadSign);
  add('prison_wall:0', PRISON_WALL_H + 8, prisonWall);
  add('cell_bars:0', CELL_H + 8, cellBars('x'));
  add('cell_bars:1', CELL_H + 8, cellBars('y'));
  add('locker:0', 80, locker);
  add('terminal:0', 52, terminal);
  add('guard_desk:0', 60, guardDesk);
  add('searchlight:0', 140, searchlight, 120);
  add('street_lamp:0', LAMP_PX + 12, streetLamp);
  add('bench_seat:0', 36, benchSeat);
  add('planter:0', 46, planter);
  add('food_cart:0', 100, foodCart, 96);
  add('billboard:0', 112, billboard, 120);
  add('traffic_cone:0', 36, trafficCone);
  add('vending:0', VENDING_PX + 10, vending);
  add('blocker:0', 0, blocker);
  return out;
}
