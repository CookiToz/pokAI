// v0.4 landmarks: Port 8080 gantry crane, riso-striped lighthouse and the Hugging Grove Great Tree (Hub entrance in its trunk).
import {
  DOOR_H, OUT, P, circle, cuboid, ellipse, hash01, line3, path, poly, poly3, pt, rect, stroke, type ArtEntry,
} from './kit';
import { BOX_H } from './buildings';
import { bunting, heart, landmark } from './landmarks';
import { ENTRANCE_OFFSET } from './entrances';

type Draw = (cx: number, cy: number) => string;

const blob3 = (x: number, y: number, rx: number, ry: number, dark: string, mid: string, light: string): string =>
  ellipse(x, y, rx, ry, dark) + ellipse(x - rx * 0.1, y - ry * 0.14, rx * 0.8, ry * 0.76, mid, false) + ellipse(x - rx * 0.38, y - ry * 0.44, rx * 0.28, ry * 0.22, light, false);

function lantern(x: number, y: number, k: number, col: string): string {
  let s = stroke(`M${x},${y - 7 * k} v${5 * k}`, P.ink, 1.3);
  s += `<circle cx="${x}" cy="${y + 3 * k}" r="${9 * k}" fill="${col}" opacity="0.32"/>`;
  s += `<rect x="${x - 4 * k}" y="${y - 2 * k}" width="${8 * k}" height="${10 * k}" rx="${2.6 * k}" fill="${col}" stroke="${P.ink}" stroke-width="1.5"/>`;
  s += `<rect x="${x - 2.4 * k}" y="${y - 3.4 * k}" width="${4.8 * k}" height="${2 * k}" fill="${P.ink}"/>`;
  s += stroke(`M${x - 4 * k},${y + 3 * k} h${8 * k}`, P.orangeD, 1);
  return s;
}

// =====================================================================================================================
// Port gantry crane (3x3). Orange portal frame, hanging container, raised boom.
// =====================================================================================================================

function crane(cx: number, cy: number): string {
  const LO = -1.85;
  const HI = 0.6;
  const T = 0.26;
  // a gantry crane towers over its containers (BOXC = one container, same as the container tiles)
  const BOXC = BOX_H;
  const LEG = 236;
  const TOP = 262;
  const OR = { top: '#ff9560', left: P.orange, right: P.orangeD } as const;
  const dark = { top: P.ink3, left: P.ink2, right: P.ink } as const;
  let s = '';
  // ground shadow footprints and rails
  const fpr = (dx: number, dy: number, col: string): string =>
    `<polygon points="${[pt(cx, cy, -2.05, -2.05), pt(cx, cy, 1.05, -2.05), pt(cx, cy, 1.05, 1.05), pt(cx, cy, -2.05, 1.05)].map(([x, y]) => `${x + dx},${y + dy}`).join(' ')}" fill="${col}"/>`;
  s += fpr(8, 6, P.blue) + fpr(4, 3, P.pink);
  s += poly3(cx, cy, [[-2.05, -2.05, 0], [1.05, -2.05, 0], [1.05, 1.05, 0], [-2.05, 1.05, 0]], P.concreteL, false);
  for (const b of [LO + T / 2, HI + T / 2]) {
    s += line3(cx, cy, [[-2, b, 0], [1, b, 0]], P.ink, 4.6) + line3(cx, cy, [[-2, b, 0], [1, b, 0]], P.steelL, 2);
  }
  // stack of containers behind
  s += cuboid(cx, cy, -1.6, -0.55, -1.72, -0.95, 0, BOXC, { top: P.redL, left: P.red, right: P.redD });
  s += cuboid(cx, cy, -1.6, -0.55, -1.72, -0.95, BOXC, 2 * BOXC, { top: P.tealL, left: P.teal, right: P.tealD });
  s += cuboid(cx, cy, -0.5, 0.35, -1.7, -1.0, 0, BOXC, { top: P.blueL, left: P.blue, right: P.blueD });
  // back leg + back beams
  const leg = (a: number, b: number): string => cuboid(cx, cy, a, a + T, b, b + T, 0, LEG, OR);
  s += leg(LO, LO);
  s += cuboid(cx, cy, LO, HI + T, LO, LO + T, LEG, TOP, OR);
  s += cuboid(cx, cy, LO, LO + T, LO, HI + T, LEG, TOP, OR);
  // trolley rail across (gy) and the hoisted container
  const TA = -0.62;
  s += cuboid(cx, cy, TA - 0.07, TA + 0.07, LO, HI + T, TOP - 8, TOP, dark);
  const cb0 = -0.55;
  const cb1 = 0.05;
  const [tx, ty] = pt(cx, cy, TA, cb0 + 0.3, TOP - 8);
  const HZ = 164;
  const sp = [pt(cx, cy, TA - 0.42, cb0 - 0.05, HZ + BOXC + 4), pt(cx, cy, TA + 0.42, cb0 - 0.05, HZ + BOXC + 4), pt(cx, cy, TA + 0.42, cb1 + 0.05, HZ + BOXC + 4), pt(cx, cy, TA - 0.42, cb1 + 0.05, HZ + BOXC + 4)];
  for (const [x, y] of sp) s += `<path d="M${tx},${ty} L${x},${y}" stroke="${P.ink}" stroke-width="2.4"/><path d="M${tx},${ty} L${x},${y}" stroke="${P.steelL}" stroke-width="1"/>`;
  s += cuboid(cx, cy, TA - 0.1, TA + 0.1, cb0 + 0.2, cb0 + 0.4, TOP - 14, TOP - 6, { top: P.yellow, left: P.yellowD, right: P.yellowD });
  s += cuboid(cx, cy, TA - 0.46, TA + 0.46, cb0, cb1, HZ, HZ + BOXC, { top: P.pinkL, left: P.pink, right: '#c2257f' });
  for (let i = 1; i < 9; i++) s += line3(cx, cy, [[TA - 0.46 + i * 0.1, cb1, HZ + 4], [TA - 0.46 + i * 0.1, cb1, HZ + BOXC - 4]], '#c2257f', 1);
  s += cuboid(cx, cy, TA - 0.46, TA + 0.46, cb0 + 0.15, cb1 - 0.15, HZ + BOXC, HZ + BOXC + 4, dark);
  // side legs + near beams + near leg
  s += leg(LO, HI) + leg(HI, LO);
  s += cuboid(cx, cy, HI, HI + T, LO, HI + T, LEG, TOP, OR);
  s += cuboid(cx, cy, LO, HI + T, HI, HI + T, LEG, TOP, OR);
  s += leg(HI, HI);
  // struts and hazard stripes on the front girder
  for (const z of [118]) {
    s += cuboid(cx, cy, LO + T, HI, HI + 0.05, HI + 0.2, z, z + 8, OR);
    s += cuboid(cx, cy, HI + 0.05, HI + 0.2, LO + T, HI, z, z + 8, OR);
  }
  for (let i = 0; i < 9; i++) {
    const a0 = LO + 0.08 + i * 0.3;
    if (i % 2 === 0) s += poly3(cx, cy, [[a0, HI + T, LEG + 1], [a0 + 0.15, HI + T, LEG + 1], [a0 + 0.15, HI + T, TOP - 1], [a0, HI + T, TOP - 1]], P.paper, false);
  }
  // operator cab hanging under the front girder
  s += cuboid(cx, cy, -0.1, 0.4, HI - 0.02, HI + 0.22, LEG - 44, LEG - 4, { top: P.steelL, left: P.paper, right: P.paper3 });
  s += poly3(cx, cy, [[-0.02, HI + 0.22, LEG - 36], [0.32, HI + 0.22, LEG - 36], [0.32, HI + 0.22, LEG - 14], [-0.02, HI + 0.22, LEG - 14]], P.glass, true);
  // raised boom (truss) with backstay
  const [px, py] = pt(cx, cy, HI + T, TA + 0.1, TOP);
  const tip: [number, number] = [px + 70, py - 130];
  const chord = (dx: number, col: string, w: number): string => `<path d="M${px + dx},${py} L${tip[0] + dx * 0.4},${tip[1]}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
  s += chord(-3, P.ink, 5) + chord(5, P.ink, 5) + chord(-3, P.orange, 2.4) + chord(5, P.orangeD, 2.4);
  for (let i = 0; i < 8; i++) {
    const t0 = i / 8;
    const t1 = (i + 1) / 8;
    const lx = (t: number, d: number): number => px + d + (tip[0] + d * 0.4 - px - d) * t;
    const ly = (t: number): number => py + (tip[1] - py) * t;
    s += `<path d="M${lx(t0, -3)},${ly(t0)} L${lx(t1, 5)},${ly(t1)}" stroke="${P.ink}" stroke-width="1.4"/>`;
  }
  const [bx, by] = pt(cx, cy, LO, LO, TOP);
  s += `<path d="M${tip[0] + 1},${tip[1]} L${bx + 4},${by}" stroke="${P.ink}" stroke-width="1.6" stroke-dasharray="3 2"/>`;
  s += `<circle cx="${tip[0] + 1}" cy="${tip[1] - 4}" r="7" fill="${P.red}" opacity="0.35"/>` + circle(tip[0] + 1, tip[1] - 4, 3, P.red);
  // beacon on the beam corner
  const [lx, ly] = pt(cx, cy, HI + T / 2, HI + T / 2, TOP);
  s += stroke(`M${lx},${ly} v-9`, P.ink, 2) + circle(lx, ly - 11, 3.2, P.yellow);
  return s;
}

// =====================================================================================================================
// Lighthouse (2x2). Red/white riso stripes, glowing lantern room.
// =====================================================================================================================

function lighthouse(cx: number, cy: number): string {
  const bx = cx;
  const by = cy - 14;
  const HT = 220;
  const W0 = 30;
  const W1 = 17;
  const wAt = (h: number): number => W0 + (W1 - W0) * (h / HT);
  const ry = (w: number): number => w * 0.36;
  let s = '';
  // foam and rocks
  s += ellipse(bx + 8, by + 6, 62, 23, P.blue, false) + ellipse(bx, by + 2, 62, 23, P.waterL, false) + ellipse(bx, by + 2, 54, 19, P.paper, false);
  const rocks: [number, number, number, number, string][] = [[-44, 4, 18, 11, P.steel], [40, 6, 20, 12, P.steelD], [-22, 16, 22, 11, P.steelL], [26, 18, 18, 10, P.steel], [4, 22, 20, 8, P.steelD]];
  s += ellipse(bx + 5, by + 8, 38, 14, P.pink, false);
  for (const [dx, dy, rx, rry, col] of rocks) s += ellipse(bx + dx, by + dy, rx, rry, col);
  // tower silhouette with a hard blue offset
  const sil = `M${bx - W0},${by} L${bx - W1},${by - HT} L${bx + W1},${by - HT} L${bx + W0},${by} A${W0},${ry(W0)} 0 0 1 ${bx - W0},${by} Z`;
  s += `<path d="${sil}" transform="translate(10 6)" fill="${P.blue}"/><path d="${sil}" transform="translate(5 3)" fill="${P.pink}"/>`;
  s += `<clipPath id="lh"><path d="${sil}"/></clipPath><path d="${sil}" fill="${P.paper}"/>`;
  s += `<g clip-path="url(#lh)">`;
  const N = 5;
  for (let i = 0; i < N; i += 2) {
    const h0 = (i * HT) / N;
    const h1 = ((i + 1) * HT) / N;
    const w0 = wAt(h0);
    const w1 = wAt(h1);
    s += `<path d="M${bx - w0},${by - h0} A${w0},${ry(w0)} 0 0 0 ${bx + w0},${by - h0} L${bx + w1},${by - h1} A${w1},${ry(w1)} 0 0 1 ${bx - w1},${by - h1} Z" fill="${P.red}"/>`;
  }
  s += `<rect x="${bx + 8}" y="${by - HT - 4}" width="40" height="${HT + 30}" fill="${P.ink}" opacity="0.2"/>`;
  s += `<rect x="${bx - 22}" y="${by - HT}" width="6" height="${HT}" fill="#ffffff" opacity="0.32"/>`;
  s += `</g><path d="${sil}" fill="none" ${OUT}/>`;
  // band seams
  for (let i = 1; i < N; i++) {
    const h = (i * HT) / N;
    s += `<path d="M${bx - wAt(h)},${by - h} A${wAt(h)},${ry(wAt(h))} 0 0 0 ${bx + wAt(h)},${by - h}" fill="none" stroke="${P.ink}" stroke-width="1.6"/>`;
  }
  // slit windows (the lighthouse is closed to visitors: no door on it)
  s += circle(bx, by - 24, 7, P.ink) + circle(bx, by - 24, 4.6, P.glassL, false);
  for (const h of [76, 140]) s += rect(bx - 2.4, by - h - 8, 4.8, 12, P.ink, 2, false) + rect(bx - 1.2, by - h - 6, 2.4, 6, P.yellow, 0, false);
  // gallery
  const gy = by - HT;
  s += ellipse(bx, gy + 6, 31, 11.5, P.ink2) + ellipse(bx, gy + 3, 31, 11.5, P.steelL);
  s += ellipse(bx, gy + 3, 24, 8.4, P.steel, false);
  // lantern room: rays first so the glass sits on top
  const ly1 = gy - 2;
  const ly0 = ly1 - 26;
  s += `<polygon points="${bx - 12},${ly0 + 6} ${bx - 76},${ly0 - 10} ${bx - 76},${ly0 + 22}" fill="${P.yellow}" opacity="0.38"/>`;
  s += `<polygon points="${bx + 12},${ly0 + 6} ${bx + 76},${ly0 - 10} ${bx + 76},${ly0 + 22}" fill="${P.yellow}" opacity="0.38"/>`;
  s += `<rect x="${bx - 13}" y="${ly0}" width="26" height="${ly1 - ly0}" fill="#fff3a0" stroke="${P.ink}" stroke-width="2"/>`;
  s += `<ellipse cx="${bx}" cy="${ly1}" rx="13" ry="4.4" fill="#fff3a0" stroke="${P.ink}" stroke-width="2"/>`;
  s += stroke(`M${bx - 6.5},${ly0 + 1} v${ly1 - ly0} M${bx + 6.5},${ly0 + 1} v${ly1 - ly0}`, P.ink, 1.6);
  s += circle(bx, ly0 + 13, 6, P.yellow, false) + `<circle cx="${bx}" cy="${ly0 + 13}" r="10" fill="${P.paper}" opacity="0.7"/>`;
  s += `<ellipse cx="${bx}" cy="${ly0}" rx="15" ry="4.4" fill="${P.ink2}" stroke="${P.ink}" stroke-width="2"/>`;
  // roof and finial
  s += path(`M${bx - 15},${ly0 - 1} Q${bx},${ly0 - 24} ${bx + 15},${ly0 - 1} Z`, P.red);
  s += path(`M${bx + 1},${ly0 - 11} Q${bx + 9},${ly0 - 10} ${bx + 15},${ly0 - 1} L${bx + 2},${ly0 - 1} Z`, P.redD, false);
  s += stroke(`M${bx},${ly0 - 12} v-9`, P.ink, 2) + circle(bx, ly0 - 23, 2.6, P.yellow);
  // railing posts
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (i / 8);
    const px = bx - Math.cos(a) * 29;
    const py = gy + 3 + Math.sin(a) * 10.5;
    s += stroke(`M${px},${py} v-7`, P.ink, 1.4);
  }
  s += `<path d="M${bx - 29},${gy - 4} A29,10.5 0 0 0 ${bx + 29},${gy - 4}" fill="none" stroke="${P.ink}" stroke-width="1.6"/>`;
  return s;
}

// =====================================================================================================================
// Great Tree of Hugging Grove (6x6). The Hub entrance is a door in its trunk, below a giant hugging-face sign.
// =====================================================================================================================

function greatTree(cx: number, cy: number): string {
  const bx = cx;
  const by = cy - 12;
  const TOPY = 105;
  const EN = ENTRANCE_OFFSET.lm_great_tree!;
  let s = '';
  // ---- ground: moss disc with hard offset shadows ----
  s += ellipse(cx + 16, cy - 48, 168, 78, P.blue, false);
  s += ellipse(cx + 8, cy - 54, 168, 78, P.pink, false);
  s += ellipse(cx, cy - 62, 168, 76, '#6fc47f', false);
  s += ellipse(cx, cy - 62, 128, 56, '#7fd08c', false);
  for (let i = 0; i < 16; i++) {
    const a = hash01(i, 3, 1) * Math.PI * 2;
    const r = 0.35 + hash01(i, 3, 2) * 0.6;
    const x = cx + Math.cos(a) * 150 * r;
    const y = cy - 62 + Math.sin(a) * 66 * r;
    if (Math.abs(x - cx) < 60 && y > cy - 70) continue;
    s += i % 3 === 0 ? circle(x, y, 2, P.pinkL, false) : i % 3 === 1 ? circle(x, y, 1.8, P.yellow, false) : stroke(`M${x - 2},${y} l-1,-4 M${x},${y} v-5 M${x + 2},${y} l1,-4`, P.leafD, 1.3);
  }
  // ---- roots ----
  const root = (x1: number, y1: number, qx: number, qy: number, w: number): string => {
    const d = `M${bx + (x1 > bx ? 30 : -30)},${by - 6} Q${qx},${qy} ${x1},${y1}`;
    return `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="${w + 4}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${P.wood}" stroke-width="${w}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${P.woodL}" stroke-width="${w * 0.3}" stroke-linecap="round" transform="translate(0 -${w * 0.25})"/>`;
  };
  s += root(bx - 112, by - 22, bx - 70, by - 8, 14) + root(bx + 112, by - 24, bx + 72, by - 6, 14);
  s += root(bx - 92, by + 14, bx - 62, by + 16, 12) + root(bx + 94, by + 16, bx + 62, by + 18, 12);
  s += root(bx - 64, by - 54, bx - 58, by - 40, 12) + root(bx + 70, by - 56, bx + 60, by - 40, 12);
  // ---- back canopy ----
  const back: [number, number, number, number][] = [
    [-150, 150, 52, 36], [150, 152, 52, 36], [-122, 96, 62, 42], [124, 98, 62, 42], [-60, 56, 72, 46], [64, 58, 72, 46],
    [0, 96, 100, 56], [-170, 128, 32, 26], [170, 130, 32, 26], [0, 38, 52, 30],
  ];
  for (const [dx, y, rx, ry] of back) s += blob3(cx + dx, y, rx, ry, P.leafDD, P.leafD, P.leaf);
  // ---- ring deck (rear half is hidden by the trunk drawn next) ----
  const DY = 172;
  s += `<ellipse cx="${bx}" cy="${DY + 9}" rx="88" ry="27" fill="${P.woodD}" stroke="${P.ink}" stroke-width="2"/>`;
  s += `<ellipse cx="${bx}" cy="${DY}" rx="88" ry="27" fill="${P.woodL}" stroke="${P.ink}" stroke-width="2"/>`;
  // ---- hut + branch + bridge on both sides ----
  const hut = (x: number, y: number, roof: string, roofD: string, flip: 1 | -1): string => {
    let h = `<path d="M${bx - flip * 30},${y + 6} Q${x - flip * 50},${y + 12} ${x - flip * 22},${y + 4}" fill="none" stroke="${P.ink}" stroke-width="15" stroke-linecap="round"/>`;
    h += `<path d="M${bx - flip * 30},${y + 6} Q${x - flip * 50},${y + 12} ${x - flip * 22},${y + 4}" fill="none" stroke="${P.wood}" stroke-width="11" stroke-linecap="round"/>`;
    h += ellipse(x, y + 4, 31, 10, P.woodD) + ellipse(x, y + 1, 31, 10, P.woodL);
    h += rect(x - 19, y - 27, 38, 28, P.floorWood, 1.5);
    for (const dy of [-18, -9]) h += stroke(`M${x - 18},${y + dy} h36`, P.woodD, 1);
    h += rect(x - 6, y - 21, 12, 12, P.ink, 1) + rect(x - 4.4, y - 19.4, 8.8, 8.8, '#fff3a0', 0.5, false) + stroke(`M${x},${y - 19.4} v8.8`, P.ink, 1);
    h += poly([[x - 25, y - 26], [x, y - 49], [x + 25, y - 26]], roof) + poly([[x, y - 49], [x + 25, y - 26], [x + 6, y - 26]], roofD, false);
    h += `<path d="M${x - 25},${y - 26} L${x},${y - 49} L${x + 25},${y - 26} Z" fill="none" ${OUT}/>`;
    h += stroke(`M${x},${y - 49} v-7`, P.ink, 1.6) + poly([[x, y - 56], [x + 11, y - 52.5], [x, y - 49]], P.pink);
    return h;
  };
  s += hut(cx - 138, 160, P.teal, P.tealD, 1);
  s += hut(cx + 134, 150, P.pink, '#c2257f', -1);
  // rope bridges to the ring deck
  const rope = (x0: number, y0: number, x1: number, y1: number): string => {
    let r = '';
    const pts: [number, number][] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * 7]);
    }
    const d = pts.map((p) => p.join(',')).join(' ');
    r += `<polyline points="${d}" fill="none" stroke="${P.ink}" stroke-width="5" stroke-linejoin="round"/><polyline points="${d}" fill="none" stroke="${P.woodL}" stroke-width="2.6" stroke-linejoin="round"/>`;
    for (let i = 1; i < 10; i++) r += stroke(`M${pts[i]![0]},${pts[i]![1] - 6} v5`, P.ink, 1.2);
    return r;
  };
  s += rope(cx - 112, 164, cx - 84, 172) + rope(cx + 110, 154, cx + 84, 170);
  // ---- trunk ----
  const R = 54;
  const trunk = `M${bx - R},${by} C${bx - R + 4},${by - 70} ${bx - 46},${by - 130} ${bx - 40},${TOPY} L${bx + 40},${TOPY} C${bx + 46},${by - 130} ${bx + R - 4},${by - 70} ${bx + R},${by} A${R},25 0 0 1 ${bx - R},${by} Z`;
  s += `<clipPath id="tk"><path d="${trunk}"/></clipPath><path d="${trunk}" fill="${P.wood}"/>`;
  s += `<g clip-path="url(#tk)"><rect x="${bx + 14}" y="${TOPY - 4}" width="60" height="${by - TOPY + 40}" fill="${P.woodD}"/><rect x="${bx + 36}" y="${TOPY - 4}" width="40" height="${by - TOPY + 40}" fill="#7d5430"/>`;
  s += `<rect x="${bx - 34}" y="${TOPY}" width="8" height="${by - TOPY}" fill="${P.woodL}"/></g>`;
  for (const [dx, d] of [[-30, 1], [-12, -1], [6, 1], [24, -1], [40, 1]] as const) {
    s += stroke(`M${bx + dx},${by + 14 - Math.abs(dx) * 0.3} q${d * 7},-50 ${d * -3},-100 q${d * -6},-30 ${d * 4},-60`, P.woodD, 1.8);
  }
  s += `<path d="${trunk}" fill="none" ${OUT}/>`;
  // knot hole with a tiny owl-eye glint
  s += ellipse(bx - 30, by - 104, 5, 8, P.ink2) + circle(bx - 30, by - 106, 1.4, P.yellow, false);
  // ---- front half of the deck over the trunk ----
  s += `<path d="M${bx - 88},${DY} A88,27 0 0 0 ${bx + 88},${DY} L${bx + 88},${DY + 9} A88,27 0 0 1 ${bx - 88},${DY + 9} Z" fill="${P.woodD}" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>`;
  s += `<path d="M${bx - 88},${DY} A88,27 0 0 0 ${bx + 88},${DY} L${bx + 44},${DY} A44,14 0 0 1 ${bx - 44},${DY} Z" fill="${P.woodL}" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>`;
  for (let i = 1; i < 8; i++) {
    const t = (i / 8) * Math.PI;
    const x0 = bx - Math.cos(t) * 46;
    const y0 = DY + Math.sin(t) * 14;
    const x1 = bx - Math.cos(t) * 87;
    const y1 = DY + Math.sin(t) * 26.5;
    s += stroke(`M${x0},${y0} L${x1},${y1}`, P.woodD, 1.1);
  }
  // railing (front half) with hanging lanterns
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * Math.PI;
    const x = bx - Math.cos(t) * 84;
    const y = DY + Math.sin(t) * 25;
    s += stroke(`M${x},${y} v-13`, P.ink, 3.4) + stroke(`M${x},${y} v-13`, P.woodL, 1.4);
    if (i % 2 === 1 && i < 10 && i > 0) s += lantern(x, y + 1, 1, i % 4 === 1 ? P.yellow : P.pinkL);
  }
  s += `<path d="M${bx - 84},${DY - 13} A84,25 0 0 0 ${bx + 84},${DY - 13}" fill="none" stroke="${P.ink}" stroke-width="5"/><path d="M${bx - 84},${DY - 13} A84,25 0 0 0 ${bx + 84},${DY - 13}" fill="none" stroke="${P.woodL}" stroke-width="2.4"/>`;
  // ---- the giant hugging-face sign ----
  const fx = bx;
  const fy = 214;
  const FR = 21;
  s += circle(fx + 5, fy + 5, FR + 3, P.pink, false);
  s += circle(fx, fy, FR + 3, P.yellowD) + circle(fx, fy, FR, P.yellow);
  s += `<circle cx="${fx}" cy="${fy}" r="${FR}" fill="none" stroke="${P.ink}" stroke-width="2"/>`;
  s += ellipse(fx - 7.5, fy - 4, 2.6, 4, P.ink, false) + ellipse(fx + 7.5, fy - 4, 2.6, 4, P.ink, false);
  s += circle(fx - 7, fy - 5.5, 0.9, P.paper, false) + circle(fx + 8, fy - 5.5, 0.9, P.paper, false);
  s += ellipse(fx - 13, fy + 4, 3.8, 2.4, P.pinkL, false) + ellipse(fx + 13, fy + 4, 3.8, 2.4, P.pinkL, false);
  s += `<path d="M${fx - 9},${fy + 4} Q${fx},${fy + 17} ${fx + 9},${fy + 4} Z" fill="#7a1f2e"/>` + `<path d="M${fx - 9},${fy + 4} h18" stroke="${P.paper}" stroke-width="2.6"/>`;
  s += ellipse(fx - FR - 3, fy + 12, 6.4, 4.8, P.yellow) + ellipse(fx + FR + 3, fy + 12, 6.4, 4.8, P.yellow);
  s += stroke(`M${fx - 4},${fy - FR - 3} v-8 M${fx + 4},${fy - FR - 3} v-8`, P.ink, 1.4);
  // HUB plaque
  const py = 247;
  s += rect(fx - 24 + 3, py - 7 + 3, 48, 15, P.pink, 3, false) + rect(fx - 24, py - 7, 48, 15, P.paper, 3);
  const L = (x: number, d: string): string => `<path d="${d}" transform="translate(${x} ${py + 0.5})" fill="none" stroke="${P.ink}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += L(fx - 14, 'M0,-4 v8 M7,-4 v8 M0,0 h7') + L(fx - 2, 'M0,-4 v5.5 q0,2.5 3.6,2.5 q3.6,0 3.6,-2.5 v-5.5') + L(fx + 10.5, 'M0,-4 v8 h3.2 q3.2,0 3.2,-2 q0,-2.4 -3.2,-2.4 h-3.2 M0,0 h2.8 q2.8,0 2.8,-2 q0,-2 -2.8,-2 h-2.8');
  // ---- door: on the entrance column of the front face (the warp tile is right in front of it) ----
  const [dxc, dB] = pt(cx, cy, EN.dx + 0.5, 0.94, 0);
  const dw = 15;
  const dh = DOOR_H;
  const arch = (w: number, h: number, base: number): string => `M${dxc - w},${base} L${dxc - w},${base - h + 16} Q${dxc},${base - h - 10} ${dxc + w},${base - h + 16} L${dxc + w},${base} Z`;
  s += `<path d="${arch(dw + 5, dh + 4, dB)}" fill="${P.yellowD}" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"/>`;
  s += `<path d="${arch(dw, dh - 2, dB)}" fill="#1d3b5a" stroke="${P.ink}" stroke-width="1.6"/>`;
  s += `<path d="${arch(dw - 4, dh - 8, dB - 2)}" fill="#fff3a0" opacity="0.92"/>`;
  s += stroke(`M${dxc},${dB - 2} L${dxc},${dB - dh + 6}`, P.yellowD, 2) + circle(dxc - 4, dB - 36, 1.3, P.yellowD, false) + circle(dxc + 4, dB - 36, 1.3, P.yellowD, false);
  // steps
  s += poly([[dxc - 24, dB], [dxc + 24, dB], [dxc + 30, dB + 6], [dxc - 30, dB + 6]], P.paper3);
  // lantern posts beside the door
  for (const dx of [-36, 36]) {
    s += rect(dxc + dx - 1.6, dB - 52, 3.2, 52, P.woodD, 0.5) + lantern(dxc + dx, dB - 54, 1.25, P.yellow);
  }
  // lantern string across the moss
  const sag = (x0: number, y0: number, x1: number, y1: number, n: number, col: string): string => {
    let r = '';
    const at = (t: number): [number, number] => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * 12];
    r += `<polyline points="${Array.from({ length: 21 }, (_, i) => at(i / 20).map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${P.ink}" stroke-width="1.5"/>`;
    for (let i = 1; i <= n; i++) {
      const [x, y] = at(i / (n + 1));
      r += lantern(x, y + 2, 0.9, i % 2 ? col : P.pinkL);
    }
    return r;
  };
  s += sag(cx - 134, 164, dxc - 36, dB - 60, 4, P.yellow);
  s += sag(cx + 132, 154, dxc + 36, dB - 60, 4, P.yellow);
  // bunting along the deck
  s += bunting(bx - 84, DY - 8, bx - 44, DY + 22, 5, 5, [P.pink, P.yellow, P.teal, P.blue]);
  s += bunting(bx + 44, DY + 22, bx + 84, DY - 8, 5, 5, [P.pink, P.yellow, P.teal, P.blue]);
  // ---- front canopy ----
  const front: [number, number, number, number][] = [
    [-52, 124, 56, 32], [52, 122, 58, 34], [0, 94, 72, 40], [-112, 70, 52, 34], [112, 74, 52, 34],
    [-158, 98, 38, 26], [158, 100, 38, 26], [-174, 182, 24, 18], [174, 184, 24, 18], [0, 62, 70, 38], [-50, 36, 50, 30], [52, 38, 50, 30],
    [-110, 168, 24, 16], [110, 166, 24, 16],
  ];
  for (const [dx, y, rx, ry] of front) s += blob3(cx + dx, y, rx, ry, P.leafD, P.leaf, P.leafL);
  // blossoms, hearts and fairy lights in the foliage
  for (let i = 0; i < 26; i++) {
    const k = front[i % front.length]!;
    const x = cx + k[0] + (hash01(i, 5, 1) - 0.5) * k[2] * 1.4;
    const y = k[1] + (hash01(i, 5, 2) - 0.5) * k[3] * 1.2;
    if (i % 4 === 0) s += heart(x, y, 0.9, P.pinkL);
    else if (i % 4 === 1) s += circle(x, y, 2.1, P.pinkL, false) + circle(x, y, 0.8, P.yellow, false);
    else s += `<circle cx="${x}" cy="${y}" r="5" fill="${P.yellow}" opacity="0.4"/>` + circle(x, y, 1.8, P.yellow, false);
  }
  s += heart(cx - 186, 80, 1.5, P.pink) + heart(cx + 184, 70, 1.8, P.pinkL) + heart(cx + 6, 14, 1.4, P.pink);
  return s;
}

export function landmark4Entries(): ArtEntry[] {
  return [landmark('lm_crane', 440, crane as Draw), landmark('lm_lighthouse', 310, lighthouse as Draw), landmark('lm_great_tree', 330, greatTree as Draw)];
}
