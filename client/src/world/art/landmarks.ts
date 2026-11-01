// v0.3 landmarks: ONE big sprite per landmark, drawn on the anchor tile (the front corner of its footprint).
// Footprint tiles span tile-local a in [1-w, 1] and b in [1-h, 1] around the anchor; sprite canvas is symmetric in x
// (the engine anchors textures at x = 50%), so w = 2*max(fw, fh)*32 + padding.
import { LANDMARK_FOOTPRINT, type TileName } from '../../data/tiles';
import { ENTRANCE_OFFSET } from './entrances';
import {
  DOOR_H, DOOR_U0, DOOR_U1, SILL_PX, STOREY_PX, WINDOW_H, doorLeft,
  P, circle, cuboid, cuboidShadow, ellipse, hash01, lcell, landmarkCanvas, leftPlaneG, line3, path, poly, poly3, pt, rcell, rect, rightPlaneG,
  stroke, svgDoc, text, topPlaneG, type ArtEntry,
} from './kit';

type Draw = (cx: number, cy: number) => string;

export function landmark(name: TileName, up: number, draw: Draw): ArtEntry {
  const fp = LANDMARK_FOOTPRINT[name];
  if (!fp) throw new Error(`no footprint for ${name}`);
  const c = landmarkCanvas(fp.w, fp.h, up);
  return { key: `${name}:0`, w: c.w, h: c.h, anchorY: c.cy, svg: svgDoc(c.w, c.h, draw(c.cx, c.cy)) };
}

export const heart = (x: number, y: number, s: number, fill: string): string =>
  path(`M${x},${y + 4 * s} C${x - 7 * s},${y - 1 * s} ${x - 4 * s},${y - 7 * s} ${x},${y - 3 * s} C${x + 4 * s},${y - 7 * s} ${x + 7 * s},${y - 1 * s} ${x},${y + 4 * s} Z`, fill);

/** Bunting along a straight screen-space line. */
export function bunting(x0: number, y0: number, x1: number, y1: number, n: number, sag: number, cols: readonly string[]): string {
  const at = (t: number): [number, number] => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)];
  let s = '';
  const pts = Array.from({ length: 21 }, (_, i) => at(i / 20));
  s += `<polyline points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="none" stroke="${P.ink}" stroke-width="1.6"/>`;
  for (let i = 0; i < n; i++) {
    const [x, y] = at((i + 0.5) / n);
    s += poly([[x - 4.5, y], [x + 4.5, y], [x, y + 10]], cols[i % cols.length] as string);
  }
  return s;
}

// =====================================================================================================================
// Hugging Face hub: the building IS the hugging-face emoji look, reinterpreted. 5x5 footprint.
// =====================================================================================================================

/** One big cartoon hand, fingers up, wrist at (0,0). Union outline: ink pass underneath, yellow pass on top. */
function hand(): string {
  type Shape = { tag: 'rect' | 'ellipse'; attrs: string };
  const shapes: Shape[] = [];
  const fingerX = [-19, -9.5, 0, 9.5];
  const fingerH = [24, 30, 32, 26];
  fingerX.forEach((x, i) => shapes.push({ tag: 'rect', attrs: `x="${x}" y="${-34 - fingerH[i]! + 8}" width="10" height="${fingerH[i]}" rx="5"` }));
  shapes.push({ tag: 'rect', attrs: 'x="-21" y="-36" width="42" height="40" rx="15"' });
  shapes.push({ tag: 'ellipse', attrs: 'cx="23" cy="-14" rx="7.5" ry="14" transform="rotate(32 23 -14)"' });
  let s = '';
  for (const sh of shapes) s += `<${sh.tag} ${sh.attrs} fill="${P.ink}" stroke="${P.ink}" stroke-width="6.5" stroke-linejoin="round"/>`;
  for (const sh of shapes) s += `<${sh.tag} ${sh.attrs} fill="${P.yellow}"/>`;
  // finger separations, knuckle and shading
  for (const x of [-9.5, 0, 9.5]) s += stroke(`M${x},${-30} L${x},${-6}`, P.yellowD, 1.6);
  s += `<rect x="-21" y="-12" width="42" height="16" rx="8" fill="${P.yellowD}" opacity="0.55"/>`;
  s += `<ellipse cx="-12" cy="-26" rx="3" ry="9" fill="#ffe98f"/>`;
  s += stroke('M18,-24 q3,6 1,14', P.yellowD, 1.6);
  return s;
}

function hfHub(cx: number, cy: number): string {
  const A0 = -3.92;
  const A1 = 0.96;
  const BH = STOREY_PX;
  const EN = ENTRANCE_OFFSET.lm_hf_hub!;
  let s = '';

  // ground shadow: hard pink + blue offset footprints
  const fpr = (dx: number, dy: number, col: string): string =>
    `<polygon points="${[pt(cx, cy, -4.05, -4.05), pt(cx, cy, 1.05, -4.05), pt(cx, cy, 1.05, 1.05), pt(cx, cy, -4.05, 1.05)].map(([x, y]) => `${x + dx},${y + dy}`).join(' ')}" fill="${col}"/>`;
  s += fpr(10, 8, P.blue) + fpr(5, 4, P.pink);

  // plaza apron
  s += poly3(cx, cy, [[-4.05, -4.05, 0], [1.05, -4.05, 0], [1.05, 1.05, 0], [-4.05, 1.05, 0]], P.paper2, false);

  // base block
  s += cuboidShadow(cx, cy, A0, A1, A0, A1, BH, P.pink, 7, 5);
  s += cuboid(cx, cy, A0, A1, A0, A1, 0, BH, { top: '#ffe9a8', left: P.paper, right: P.paper3 });
  s += lcell(cx, cy, A1, A0, A1, 0, 5, P.pink, false) + rcell(cx, cy, A1, A1, A0, 0, 5, '#c2257f', false);
  s += lcell(cx, cy, A1, A0, A1, BH - 5, BH, P.yellow, false) + rcell(cx, cy, A1, A1, A0, BH - 5, BH, P.yellowD, false);
  // windows on the front face leave the entrance column free
  for (const col of [-4, -3, -1, 0]) {
    const a = col + 0.2;
    const i = col + 4;
    s += lcell(cx, cy, A1, a, a + 0.6, SILL_PX, SILL_PX + WINDOW_H, P.yellowD);
    s += lcell(cx, cy, A1, a + 0.06, a + 0.54, SILL_PX + 3, SILL_PX + WINDOW_H - 3, i % 2 ? P.glassL : '#fff1c9', false);
    s += lcell(cx, cy, A1, a + 0.28, a + 0.32, SILL_PX + 3, SILL_PX + WINDOW_H - 3, P.yellowD, false);
  }
  for (let i = 0; i < 4; i++) {
    const b = 0.3 - i * 1.05;
    s += rcell(cx, cy, A1, b + 0.6, b, SILL_PX, SILL_PX + WINDOW_H, P.yellowD);
    s += rcell(cx, cy, A1, b + 0.54, b + 0.06, SILL_PX + 3, SILL_PX + WINDOW_H - 3, i % 2 ? '#fff1c9' : P.glassL, false);
  }

  // bunting along the two front roof edges
  const [lx0, ly0] = pt(cx, cy, A0, A1, BH);
  const [fx0, fy0] = pt(cx, cy, A1, A1, BH);
  const [rx0, ry0] = pt(cx, cy, A1, A0, BH);
  const flags = [P.pink, P.blue, P.teal, P.orange, P.purple] as const;
  s += bunting(lx0, ly0, fx0, fy0 - 2, 12, 9, flags);
  s += bunting(fx0, fy0 - 2, rx0, ry0, 12, 9, flags);

  // ---- the face (screen-space, frontal) ----
  const fx = cx;
  const fy = cy - 136 - (BH - 30);
  const R = 96;
  s += circle(fx + 9, fy + 8, R, P.blue, false);
  s += circle(fx + 5, fy + 4, R, P.pink, false);
  s += `<defs><clipPath id="face"><circle cx="${fx}" cy="${fy}" r="${R}"/></clipPath></defs>`;
  s += circle(fx, fy, R, P.yellow);
  s += `<g clip-path="url(#face)">`;
  s += `<path d="M${fx - R},${fy + 34} Q${fx},${fy + 120} ${fx + R},${fy + 10} L${fx + R},${fy + R} L${fx - R},${fy + R} Z" fill="${P.yellowD}" opacity="0.7"/>`;
  s += `<path d="M${fx - 80},${fy - 26} Q${fx - 56},${fy - 76} ${fx - 8},${fy - 88}" fill="none" stroke="#fff0a8" stroke-width="9" stroke-linecap="round"/>`;
  s += `</g>`;
  s += `<circle cx="${fx}" cy="${fy}" r="${R}" fill="none" stroke="${P.ink}" stroke-width="3.6"/>`;
  // brows
  s += stroke(`M${fx - 46},${fy - 36} q16,-12 32,-2`, P.ink, 4);
  s += stroke(`M${fx + 14},${fy - 38} q16,-10 32,2`, P.ink, 4);
  // eyes
  for (const sx of [-1, 1]) {
    const ex = fx + sx * 30;
    s += ellipse(ex, fy - 8, 11, 17, P.ink);
    s += ellipse(ex + 3, fy - 15, 4.2, 6, P.paper, false);
    s += circle(ex - 3, fy + 1, 2.2, P.paper, false);
  }
  // blush
  s += ellipse(fx - 60, fy + 24, 15, 9, P.pinkL, false) + ellipse(fx + 60, fy + 24, 15, 9, P.pinkL, false);
  // big open smile
  const my = fy + 20;
  s += `<defs><clipPath id="mouth"><path d="M${fx - 42},${my} C${fx - 38},${my + 52} ${fx + 38},${my + 52} ${fx + 42},${my} Z"/></clipPath></defs>`;
  s += path(`M${fx - 42},${my} C${fx - 38},${my + 52} ${fx + 38},${my + 52} ${fx + 42},${my} Z`, '#7a1f2e', false);
  s += `<g clip-path="url(#mouth)">${rect(fx - 44, my - 2, 88, 9, P.paper, 0, false)}${ellipse(fx, my + 44, 22, 14, P.pink, false)}</g>`;
  s += path(`M${fx - 42},${my} C${fx - 38},${my + 52} ${fx + 38},${my + 52} ${fx + 42},${my} Z`, 'none');
  s += stroke(`M${fx - 46},${my - 4} q-4,2 -5,6 M${fx + 46},${my - 4} q4,2 5,6`, P.ink, 3);

  // rooftop details: little antenna with heart flag, sparkles
  s += hearts(fx, fy, R);

  // ---- entrance: a real door on the front face, exactly on the entrance column ----
  const door0 = EN.dx + DOOR_U0;
  const door1 = EN.dx + DOOR_U1;
  s += doorLeft(cx, cy, { frame: P.yellowD, leaf: P.tealL, glass: P.paper, split: true, mat: P.paper3 }, door0, door1, DOOR_H, A1);
  s += lcell(cx, cy, A1, door0 - 0.05, door1 + 0.05, DOOR_H + 5, DOOR_H + 9, P.pink, false);
  const [ex, ey] = pt(cx, cy, EN.dx + 0.5, A1, 0);

  // ---- two big hugging hands around the entrance ----
  s += `<g transform="translate(${ex - 62} ${ey - 2}) rotate(24) scale(1.2)">${hand()}</g>`;
  s += `<g transform="translate(${ex + 62} ${ey - 2}) rotate(-24) scale(-1.2 1.2)">${hand()}</g>`;

  // ---- HUB sign on the chin ----
  const dx = cx;
  const py = fy + R - 8;
  s += rect(dx - 30 + 3, py - 8 + 3, 60, 18, P.pink, 3, false);
  s += rect(dx - 30, py - 8, 60, 18, P.paper, 3);
  const L = (x: number, d: string): string => `<path d="${d}" transform="translate(${x} ${py})" fill="none" stroke="${P.ink}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += L(dx - 16, 'M0,-4 v10 M9,-4 v10 M0,1 h9');
  s += L(dx - 1.5, 'M0,-4 v7 q0,3.5 4.5,3.5 q4.5,0 4.5,-3.5 v-7');
  s += L(dx + 13, 'M0,-4 v10 h4 q4,0 4,-2.5 q0,-3 -4,-3 h-4 M0,1.5 h3.6 q3.6,0 3.6,-2.5 q0,-2.5 -3.6,-2.5 h-3.6');
  return s;
}

function hearts(fx: number, fy: number, R: number): string {
  let s = '';
  s += heart(fx - R - 14, fy - 40, 1.7, P.pink) + heart(fx + R + 12, fy - 62, 2.1, P.pinkL) + heart(fx + R + 22, fy + 4, 1.4, P.pink);
  s += heart(fx - R + 6, fy - 92, 1.3, P.pinkL);
  for (const [x, y] of [[fx - 74, fy - 80], [fx + 80, fy + 62], [fx - 100, fy + 20]] as const) {
    s += stroke(`M${x},${y - 5} v10 M${x - 5},${y} h10`, P.ink, 3.2) + stroke(`M${x},${y - 5} v10 M${x - 5},${y} h10`, P.paper, 1.4);
  }
  return s;
}

// =====================================================================================================================
// Benchmark tower: glass tower with a scoreboard crown. 4x4.
// =====================================================================================================================

function benchTower(cx: number, cy: number): string {
  const a0 = -2.94;
  const a1 = 0.94;
  const PH = STOREY_PX;
  const s0 = -2.3;
  const s1 = 0.3;
  const SH = PH + 3 * STOREY_PX;
  const EN = ENTRANCE_OFFSET.lm_bench_tower!;
  let s = '';
  s += cuboidShadow(cx, cy, -2.62, 0.62, -2.62, 0.62, SH + 30, P.pink, 9, 6);
  s += cuboidShadow(cx, cy, a0, a1, a0, a1, PH, P.blue, 8, 6);
  // podium: one storey, windows leave the entrance column free
  s += cuboid(cx, cy, a0, a1, a0, a1, 0, PH, { top: P.purpleL, left: P.lav, right: P.lav2 });
  s += lcell(cx, cy, a1, a0, a1, 0, 6, P.purpleD, false) + rcell(cx, cy, a1, a1, a0, 0, 6, P.ink2, false);
  for (const col of [-3, -2, 0]) {
    const u = col + 0.2;
    s += lcell(cx, cy, a1, u, u + 0.6, SILL_PX, SILL_PX + WINDOW_H, P.glassN) + lcell(cx, cy, a1, u + 0.06, u + 0.54, SILL_PX + 3, SILL_PX + WINDOW_H - 3, P.glassL, false);
  }
  for (const v of [-2.4, -1.55, -0.7]) s += rcell(cx, cy, a1, v + 0.6, v, SILL_PX, SILL_PX + WINDOW_H, P.glassN) + rcell(cx, cy, a1, v + 0.54, v + 0.06, SILL_PX + 3, SILL_PX + WINDOW_H - 3, P.glass, false);
  // entrance: glass double door on the entrance column + trophy plaque above
  s += doorLeft(cx, cy, { frame: P.purpleD, leaf: P.yellow, glass: P.paper, split: true, mat: P.paper3 }, EN.dx + DOOR_U0, EN.dx + DOOR_U1, DOOR_H, a1);
  s += lcell(cx, cy, a1, EN.dx + 0.3, EN.dx + 0.7, DOOR_H + 6, DOOR_H + 18, P.yellowD);
  // shaft: three more storeys of glass
  s += cuboid(cx, cy, s0, s1, s0, s1, PH, SH, { top: P.concreteL, left: '#83c3ef', right: '#5a8fd0' });
  const cols = 5;
  const rows = 6;
  const rowH = (SH - PH) / rows;
  for (let r = 0; r < rows; r++) {
    const z0 = PH + 8 + r * rowH;
    for (let c = 0; c < cols; c++) {
      const u0 = s0 + 0.08 + (c * (s1 - s0 - 0.16)) / cols;
      const u1 = u0 + (s1 - s0 - 0.16) / cols - 0.07;
      s += lcell(cx, cy, s1, u0, u1, z0, z0 + rowH - 16, hash01(r, c, 4) < 0.2 ? '#ffe27a' : '#d3f1fb', false);
      s += rcell(cx, cy, s1, s1 - (u0 - s0), s1 - (u1 - s0), z0, z0 + rowH - 16, hash01(r, c, 9) < 0.2 ? '#ffd23f' : '#9fd0ee', false);
    }
  }
  for (const u of [-1.4, -0.5]) s += lcell(cx, cy, s1, u, u + 0.06, PH, SH, P.purple, false);
  s += poly3(cx, cy, [[-2.1, s1, PH + 20], [-1.9, s1, PH + 20], [-1.1, s1, SH - 20], [-1.3, s1, SH - 20]], '#ffffff', false, 'opacity="0.3"');
  // setback bands (one per storey)
  for (const z of [PH + STOREY_PX, PH + 2 * STOREY_PX]) s += lcell(cx, cy, s1, s0, s1, z, z + 3, P.purpleD, false) + rcell(cx, cy, s1, s1, s0, z, z + 3, P.ink2, false);

  // scoreboard crown
  const c0 = -2.62;
  const c1 = 0.62;
  const CZ = SH;
  const CH = 30;
  s += cuboid(cx, cy, c0, c1, c0, c1, CZ, CZ + CH, { top: P.ink3, left: P.ink2, right: P.ink });
  const board = (len: number, inner: string): string => rect(0, 0, len, CH - 6, '#14122a', 2, false) + inner;
  const lenL = (c1 - c0) * 32;
  const rows3: [string, number, string][] = [['CLAUDE', 0.92, P.yellow], ['GPT', 0.8, P.pinkL], ['GEMINI', 0.68, P.neon]];
  let bars = text(lenL / 2, 7, 5.4, P.paper, 'HUMANEVAL  PASS@1');
  rows3.forEach(([n, w, col], i) => {
    const y = 10 + i * 5.4;
    bars += `<rect x="2" y="${y}" width="${(lenL - 4) * w}" height="3.6" fill="${col}"/>` + text(lenL - 3, y + 3.2, 3.6, '#14122a', n, 'end');
  });
  s += leftPlaneG(cx, cy, c0, c1, CZ + CH - 3, board(lenL, bars));
  const lenR = (c1 - c0) * 32;
  s += rightPlaneG(cx, cy, c1, c1, CZ + CH - 3, board(lenR, text(lenR / 2, 12, 9, P.neon, '98.2%') + text(lenR / 2, 21, 4.4, P.pinkL, 'TOP 1  ▲')));
  // roof: trophy on pedestal + antenna
  s += cuboid(cx, cy, -1.3, -0.7, -1.3, -0.7, CZ + CH, CZ + CH + 7, { top: P.ink3, left: P.purple, right: P.purpleD });
  const [tx, ty] = pt(cx, cy, -1, -1, CZ + CH + 7);
  s += path(`M${tx - 14 + 4},${ty - 40 + 4} h28 q0,18 -14,18 q-14,0 -14,-18 z`, P.pink, false);
  s += path(`M${tx - 14},${ty - 40} h28 q0,18 -14,18 q-14,0 -14,-18 z`, P.yellow);
  s += stroke(`M${tx - 14},${ty - 36} q-9,0 -6,9 q3,4 9,4 M${tx + 14},${ty - 36} q9,0 6,9 q-3,4 -9,4`, P.ink, 2.2);
  s += rect(tx - 3, ty - 22, 6, 12, P.yellowD, 0) + rect(tx - 9, ty - 10, 18, 7, P.ink2, 1);
  s += stroke(`M${tx - 5},${ty - 34} v8`, P.paper, 2);
  s += line3(cx, cy, [[0.1, 0.1, CZ + CH], [0.1, 0.1, CZ + CH + 40]], P.ink, 3) + circle(...pt(cx, cy, 0.1, 0.1, CZ + CH + 41), 2.6, P.red);
  return s;
}

// =====================================================================================================================
// AIACT tower: grey brutalist monolith, red stamp, searchlights. 4x4.
// =====================================================================================================================

function aiactTower(cx: number, cy: number): string {
  const a0 = -2.94;
  const a1 = 0.94;
  const PH = STOREY_PX;
  const m0 = -2.2;
  const m1 = 0.25;
  const MH = PH + 4 * STOREY_PX;
  let s = '';
  // searchlight beams go first (behind everything)
  const beam = (x: number, y: number, tx: number, ty: number, w: number): string =>
    `<polygon points="${x},${y} ${tx - w},${ty} ${tx + w},${ty}" fill="#fff3a0" opacity="0.38"/>`;
  const [t0x, t0y] = pt(cx, cy, m0 + 0.2, m0 + 0.2, MH + 22);
  const [t1x, t1y] = pt(cx, cy, m1 - 0.2, m0 + 0.2, MH + 22);
  s += beam(t0x, t0y, t0x - 70, t0y - 110, 18) + beam(t1x, t1y, t1x + 62, t1y - 120, 18);
  s += cuboidShadow(cx, cy, m0, m1, m0, m1, MH, P.red, 10, 6);
  s += cuboidShadow(cx, cy, a0, a1, a0, a1, PH, P.red, 8, 6);
  // podium
  s += cuboid(cx, cy, a0, a1, a0, a1, 0, PH, { top: '#9b99ab', left: '#85839a', right: '#6a6880' });
  s += lcell(cx, cy, a1, a0, a1, 0, 5, P.ink2, false) + rcell(cx, cy, a1, a1, a0, 0, 5, P.ink, false);
  // No door on this face: the compound is entered through the gate in its wall (an aiact_door tile).
  for (const col of [-3, -2, -1, 0]) {
    s += lcell(cx, cy, a1, col + 0.3, col + 0.7, SILL_PX, SILL_PX + WINDOW_H, P.ink, false);
    s += lcell(cx, cy, a1, col + 0.38, col + 0.62, SILL_PX + 4, SILL_PX + 8, P.yellow, false);
  }
  s += lcell(cx, cy, a1, -3.6, 0.9, 62, 70, P.red, false);
  // monolith
  s += cuboid(cx, cy, m0, m1, m0, m1, PH, MH, { top: '#c4c2d0', left: '#a7a5b6', right: '#85839a' });
  const slitRows = 16;
  const slitH = (MH - PH - 24) / slitRows;
  for (let r = 0; r < slitRows; r++) {
    const z = PH + 14 + r * slitH;
    for (const u of [-1.9, -1.4, -0.9, -0.4]) s += lcell(cx, cy, m1, u, u + 0.12, z, z + slitH * 0.5, P.ink, false);
    for (const v of [-1.7, -1.2, -0.7, -0.2]) s += rcell(cx, cy, m1, v + 0.12, v, z, z + slitH * 0.5, P.ink, false);
  }
  // horizontal seams (one per storey)
  for (const z of [PH + STOREY_PX, PH + 2 * STOREY_PX, PH + 3 * STOREY_PX]) s += lcell(cx, cy, m1, m0, m1, z, z + 2.4, '#706e83', false) + rcell(cx, cy, m1, m1, m0, z, z + 2.4, '#5d5b72', false);
  // red stamp logo (skewed onto the left face) + stencil
  const lenL = (m1 - m0) * 32;
  s += leftPlaneG(
    cx, cy, m0, m1, MH - 50,
    `<g transform="translate(${lenL / 2} 26)"><circle r="23" fill="none" stroke="${P.red}" stroke-width="5"/><circle r="17" fill="none" stroke="${P.red}" stroke-width="1.6"/>` +
      `<path d="M-11,-11 L11,11 M11,-11 L-11,11" stroke="${P.red}" stroke-width="5.4" stroke-linecap="round"/></g>` +
      text(lenL / 2, 62, 8, P.red, 'CONFORME', 'middle', `textLength="${lenL - 6}" lengthAdjust="spacingAndGlyphs"`),
  );
  s += rightPlaneG(cx, cy, m1, m1, MH - 80, `<rect x="2" y="0" width="${lenL - 4}" height="8" fill="${P.red}"/>` + text(lenL / 2, 7, 6, P.paper, 'A.I.A.C.T.', 'middle', `textLength="${lenL - 10}" lengthAdjust="spacingAndGlyphs"`));
  // crown + searchlights + beacon
  s += cuboid(cx, cy, m0 - 0.12, m1 + 0.12, m0 - 0.12, m1 + 0.12, MH, MH + 12, { top: P.ink3, left: P.ink2, right: P.ink });
  for (const [a, b] of [[m0 + 0.2, m0 + 0.2], [m1 - 0.2, m0 + 0.2]] as const) {
    const [x, y] = pt(cx, cy, a, b, MH + 12);
    s += rect(x - 3, y - 8, 6, 8, P.ink2, 1) + ellipse(x, y - 11, 7, 5, P.steelD) + ellipse(x, y - 12, 4, 3, P.yellow, false);
  }
  const [bx, by] = pt(cx, cy, (m0 + m1) / 2, (m0 + m1) / 2, MH + 12);
  s += rect(bx - 1.5, by - 22, 3, 22, P.ink2, 0.5) + `<circle cx="${bx}" cy="${by - 24}" r="7" fill="${P.red}" opacity="0.38"/>` + circle(bx, by - 24, 3, P.red);
  return s;
}

// =====================================================================================================================
// Giant screen: truss + billboard showing a fake AI ad. 3x1.
// =====================================================================================================================

function giantScreen(cx: number, cy: number): string {
  const a0 = -1.9;
  const a1 = 0.98;
  const b = 0.55;
  const z0 = 62;
  const SH = 70;
  let s = '';
  s += cuboidShadow(cx, cy, a0, a1, 0.3, 0.8, 24, P.blue, 7, 5);
  // legs + truss
  for (const a of [-1.55, 0.6]) {
    s += cuboid(cx, cy, a - 0.08, a + 0.08, b - 0.08, b + 0.08, 0, z0, { top: P.steelL, left: P.steel, right: P.steelD });
  }
  s += cuboid(cx, cy, a0 - 0.02, a1 + 0.02, 0.4, 0.7, z0 - 8, z0, { top: P.steelL, left: P.ink3, right: P.ink2 });
  // screen panel (back drop in blue, then the ad)
  const len = (a1 - a0) * 32;
  const W = len;
  const H = SH;
  s += leftPlaneG(cx, cy, a0, b + 0.12, z0 + SH, `<g transform="translate(5 5)"><rect width="${W}" height="${H}" rx="3" fill="${P.pink}"/></g>`);
  const ad =
    rect(0, 0, W, H, P.ink, 3, true) +
    rect(3, 3, W - 6, H - 6, '#2b1f6b', 2, false) +
    `<rect x="3" y="3" width="${W - 6}" height="${(H - 6) * 0.5}" fill="#4a2fb0"/>` +
    // chatbot mascot
    `<g transform="translate(${W * 0.2} ${H * 0.4})"><rect x="-14" y="-12" width="28" height="22" rx="8" fill="${P.paper}" stroke="${P.ink}" stroke-width="1.6"/><circle cx="-5" cy="-3" r="2.6" fill="${P.ink}"/><circle cx="5" cy="-3" r="2.6" fill="${P.ink}"/><path d="M-6,3 q6,6 12,0" fill="none" stroke="${P.pink}" stroke-width="2" stroke-linecap="round"/><line x1="0" y1="-12" x2="0" y2="-19" stroke="${P.ink}" stroke-width="1.6"/><circle cx="0" cy="-20" r="2.6" fill="${P.yellow}"/></g>` +
    text(W * 0.62, H * 0.3, 12, P.yellow, 'AGI') +
    text(W * 0.62, H * 0.47, 6.2, P.paper, 'DANS 2 ANS*') +
    `<rect x="${W * 0.34}" y="${H * 0.56}" width="${W * 0.6}" height="9" rx="2" fill="${P.pink}"/>` + text(W * 0.64, H * 0.56 + 7, 5.6, P.paper, 'ESSAYER PRO-MAX') +
    text(W / 2, H * 0.88, 3.8, P.lav, '*sauf le mardi') +
    `<g fill="${P.neon}">${Array.from({ length: 12 }, (_, i) => `<rect x="${6 + i * ((W - 12) / 11) - 1}" y="${H - 7}" width="2" height="2"/>`).join('')}</g>`;
  s += leftPlaneG(cx, cy, a0, b + 0.12, z0 + SH, ad);
  // top lamps
  for (const a of [-1.4, -0.5, 0.4]) {
    const [x, y] = pt(cx, cy, a, b + 0.2, z0 + SH + 1);
    s += rect(x - 3, y - 6, 6, 6, P.steelD, 1) + `<polygon points="${x},${y} ${x - 8},${y + 14} ${x + 8},${y + 14}" fill="#fff3a0" opacity="0.3"/>`;
  }
  return s;
}

// =====================================================================================================================
// Jensen's GPU store with a giant green-black GPU on the roof. 3x3.
// =====================================================================================================================

function gpuStore(cx: number, cy: number): string {
  const a0 = -1.94;
  const a1 = 0.94;
  const H = STOREY_PX;
  const G = P.gpu;
  const EN = ENTRANCE_OFFSET.lm_gpu_store!;
  let s = '';
  s += cuboidShadow(cx, cy, a0, a1, a0, a1, H, P.pink, 8, 6);
  s += cuboid(cx, cy, a0, a1, a0, a1, 0, H, { top: '#3a3550', left: '#2b2840', right: '#1d1a2b' });
  s += lcell(cx, cy, a1, a0, a1, 0, 6, G, false) + rcell(cx, cy, a1, a1, a0, 0, 6, P.gpuD, false);
  s += lcell(cx, cy, a1, a0, a1, H - 14, H - 10, G, false) + rcell(cx, cy, a1, a1, a0, H - 14, H - 10, P.gpuD, false);
  // sign above the entrance column
  s += leftPlaneG(
    cx, cy, EN.dx + 0.5 - 0.81, a1, DOOR_H + 20, rect(0, 0, 52, 14, '#0f0e1c', 1.5, false) + text(26, 11.5, 10.5, G, 'GPU STORE', 'middle', 'textLength="48" lengthAdjust="spacingAndGlyphs"'),
  );
  // display windows with glowing cards (the entrance column stays free)
  for (const u of [-1.85, 0.15]) {
    s += lcell(cx, cy, a1, u, u + 0.7, 14, 74, G) + lcell(cx, cy, a1, u + 0.05, u + 0.65, 18, 70, '#14221a', false);
    s += lcell(cx, cy, a1, u + 0.12, u + 0.58, 38, 50, '#0f0e1c', false) + lcell(cx, cy, a1, u + 0.18, u + 0.32, 40, 48, G, false) + lcell(cx, cy, a1, u + 0.38, u + 0.52, 40, 48, G, false);
    s += lcell(cx, cy, a1, u + 0.12, u + 0.58, 20, 30, '#33533a', false);
  }
  // entrance door
  s += doorLeft(cx, cy, { frame: G, leaf: '#14221a', glass: '#2c4a35', split: true, mat: P.slabD, bar: G }, EN.dx + DOOR_U0, EN.dx + DOOR_U1, DOOR_H, a1);
  // right face: slim windows
  for (const v of [-1.5, -0.8, -0.1]) s += rcell(cx, cy, a1, v + 0.5, v, SILL_PX - 10, SILL_PX + WINDOW_H + 10, G) + rcell(cx, cy, a1, v + 0.45, v + 0.05, SILL_PX - 7, SILL_PX + WINDOW_H + 7, '#14221a', false);
  // supports + the giant GPU card
  for (const [a, bb] of [[-1.6, -1.2], [0.4, -1.2], [-1.6, -0.1], [0.4, -0.1]] as const) s += line3(cx, cy, [[a, bb, H], [a, bb, H + 8]], P.steel, 5);
  const g0 = -1.85;
  const g1 = 0.75;
  const k0 = -1.25;
  const k1 = -0.05;
  const GZ = H + 8;
  const GH = 30;
  s += cuboid(cx, cy, g0, g1, k0, k1, GZ, GZ + GH, { top: '#1d1a2b', left: '#2b2840', right: '#14122a' });
  // gold PCIe fingers along the left face bottom, green stripe, text
  s += lcell(cx, cy, k1, g0 + 0.2, g0 + 1.4, GZ, GZ + 4, '#e0a91a', false);
  s += lcell(cx, cy, k1, g0, g1, GZ + 11, GZ + 17, G, false);
  s += leftPlaneG(cx, cy, g0 + 0.05, k1, GZ + GH - 1, text(46, 6, 5.4, G, 'RTX 9090 Ti', 'middle', `textLength="${(g1 - g0 - 0.2) * 32}" lengthAdjust="spacingAndGlyphs"`));
  // I/O bracket on the right face
  s += rcell(cx, cy, g1, k1, k0, GZ, GZ + GH, P.steelL);
  for (const v of [-0.3, -0.6, -0.9]) s += rcell(cx, cy, g1, v + 0.1, v, GZ + 8, GZ + 22, P.ink, false);
  // top: shroud, two big fans and a green accent
  s += topPlaneG(
    cx, cy, 0, 0, GZ + GH,
    `<rect x="${g0 + 0.04}" y="${k0 + 0.04}" width="${g1 - g0 - 0.08}" height="${k1 - k0 - 0.08}" fill="#14122a"/>` +
      `<rect x="${g1 - 0.5}" y="${k0 + 0.04}" width="0.46" height="${k1 - k0 - 0.08}" fill="${G}"/>` +
      [-1.2, -0.25].map((a) => fan(a, (k0 + k1) / 2)).join(''),
  );
  // mascot pylon: leather-jacket CEO caricature (frontal board)
  s += mascotSign(cx, cy);
  return s;
}

function fan(a: number, b: number): string {
  const blades = Array.from({ length: 9 }, (_, i) => `<ellipse cx="${a}" cy="${b - 0.17}" rx="0.055" ry="0.15" transform="rotate(${i * 40} ${a} ${b})" fill="${P.gpu}"/>`).join('');
  return `<circle cx="${a}" cy="${b}" r="0.5" fill="#000" opacity="0.5"/><circle cx="${a}" cy="${b}" r="0.45" fill="${P.gpuD}"/><circle cx="${a}" cy="${b}" r="0.4" fill="#0f0e1c"/>${blades}<circle cx="${a}" cy="${b}" r="0.1" fill="${P.ink3}"/><circle cx="${a}" cy="${b}" r="0.05" fill="${P.gpu}"/>`;
}

function mascotSign(cx: number, cy: number): string {
  const [px, py] = pt(cx, cy, -1.8, 1.12, 0);
  let s = '';
  s += rect(px - 2, py - 56, 4, 56, P.ink2, 0.5);
  s += rect(px - 16 + 4, py - 98 + 4, 32, 46, P.pink, 4, false);
  s += rect(px - 16, py - 98, 32, 46, P.gpu, 4);
  s += rect(px - 13, py - 95, 26, 40, '#14221a', 2, false);
  // portrait: jacket, head, hair, grin
  const hx = px;
  const hy = py - 76;
  s += path(`M${hx - 12},${py - 55} Q${hx - 11},${py - 66} ${hx},${py - 66} Q${hx + 11},${py - 66} ${hx + 12},${py - 55} Z`, '#0b0b14');
  s += poly([[hx - 4, py - 66], [hx, py - 58], [hx + 4, py - 66]], P.paper, false);
  s += stroke(`M${hx - 3},${py - 66} L${hx - 7},${py - 56} M${hx + 3},${py - 66} L${hx + 7},${py - 56}`, '#555a78', 1.6);
  s += stroke(`M${hx},${py - 58} L${hx},${py - 55}`, P.yellow, 1.2);
  s += ellipse(hx, hy + 2, 8.2, 9.2, '#f0c9a0');
  s += path(`M${hx - 8.6},${hy} Q${hx - 9},${hy - 11} ${hx},${hy - 11} Q${hx + 9},${hy - 11} ${hx + 8.6},${hy} Q${hx + 5},${hy - 5} ${hx},${hy - 6} Q${hx - 5},${hy - 5} ${hx - 8.6},${hy} Z`, '#8a8793');
  s += stroke(`M${hx - 5},${hy - 2} h3 M${hx + 2},${hy - 2} h3`, '#2b2840', 1.6);
  s += circle(hx - 3.2, hy + 1, 0.9, P.ink, false) + circle(hx + 3.2, hy + 1, 0.9, P.ink, false);
  s += path(`M${hx - 4.4},${hy + 5} q4.4,5 8.8,0 z`, P.paper);
  s += text(px, py - 100 - 3, 5.2, P.gpu, 'CUIR', 'middle');
  return s;
}

// =====================================================================================================================
// Data packets: small glowing cubes the engine animates along data_lane tiles.
// =====================================================================================================================

function packet(col: string, light: string, dark: string, key: string): ArtEntry {
  const w = 40;
  const h = 30;
  const cx = w / 2;
  const cy = 18;
  let s = '';
  s += `<polygon points="${cx - 18},${cy + 2} ${cx - 6},${cy - 2} ${cx - 6},${cy + 6}" fill="${col}" opacity="0.35"/>`;
  s += `<circle cx="${cx}" cy="${cy - 2}" r="11" fill="${col}" opacity="0.32"/>`;
  s += poly([[cx - 7, cy - 5], [cx, cy - 9], [cx + 7, cy - 5], [cx, cy - 1]], light);
  s += poly([[cx - 7, cy - 5], [cx, cy - 1], [cx, cy + 6], [cx - 7, cy + 2]], col);
  s += poly([[cx + 7, cy - 5], [cx, cy - 1], [cx, cy + 6], [cx + 7, cy + 2]], dark);
  s += rect(cx - 4.2, cy - 1.6, 2.2, 2, P.paper, 0, false);
  return { key, w, h, anchorY: cy, svg: svgDoc(w, h, s) };
}

export function packetEntries(): ArtEntry[] {
  return [
    packet(P.pink, P.pinkL, '#c2257f', 'packet:0'),
    packet(P.neon, '#b8fff6', '#1f9a93', 'packet:1'),
    packet(P.yellow, '#fff1a8', P.yellowD, 'packet:2'),
  ];
}

export function landmarkEntries(): ArtEntry[] {
  return [
    landmark('lm_hf_hub', 340, hfHub),
    landmark('lm_bench_tower', 4 * STOREY_PX + 140, benchTower),
    landmark('lm_aiact_tower', 5 * STOREY_PX + 70, aiactTower),
    landmark('lm_giant_screen', 196, giantScreen),
    landmark('lm_gpu_store', STOREY_PX + 160, gpuStore),
  ];
}
