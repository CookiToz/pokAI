// Owned by art-a. formId -> complete SVG string (see ./types.ts).
// Every creature is a list of flat shapes; `render` draws the single offset
// "misregistration" shadow (+4,+4) from the same silhouette, then the inked art.
import type { PokaiSvg } from './types';

export const INK = '#1d1a2b';
export const PAPER = '#f4efe4';
export const PAPER2 = '#e9e1d0';
export const PINK = '#ff48b0';
export const BLUE = '#0078bf';
export const YEL = '#ffd23f';
export const TEAL = '#00a095';
export const OR = '#ff6c2f';
export const RED = '#e0283c';
export const STEEL = '#8c93a3';
export const VIO = '#7a4fd6';

export interface Shape {
  t: string;
  a: string;
  f: string;
  k: boolean; // inked outline
  n: boolean; // excluded from the shadow silhouette
  line?: boolean;
  w?: number;
  c?: string;
}
const mk = (t: string, a: string, f: string, o: Partial<Shape> = {}): Shape => ({ t, a, f, k: true, n: false, ...o });
const T = (tr: string): string => (tr ? ` transform="${tr}"` : '');
export const rect = (x: number, y: number, w: number, h: number, f: string, r = 0, tr = ''): Shape =>
  mk('rect', `x="${x}" y="${y}" width="${w}" height="${h}"${r ? ` rx="${r}"` : ''}${T(tr)}`, f);
export const circ = (cx: number, cy: number, r: number, f: string): Shape => mk('circle', `cx="${cx}" cy="${cy}" r="${r}"`, f);
export const ell = (cx: number, cy: number, rx: number, ry: number, f: string, tr = ''): Shape =>
  mk('ellipse', `cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${T(tr)}`, f);
export const path = (d: string, f: string, tr = ''): Shape => mk('path', `d="${d}"${T(tr)}`, f);
/** flat highlight / detail: no outline, not part of the shadow */
export const nos = (s: Shape): Shape => ({ ...s, k: false, n: true });
export const dot = (cx: number, cy: number, r: number, f = INK): Shape => nos(circ(cx, cy, r, f));
/** stroke-only line; set `sh` to include it in the shadow silhouette */
export const ln = (d: string, w = 3, f = INK, sh = false): Shape =>
  mk('path', `d="${d}"`, f, { line: true, w, k: false, n: !sh });
export const txt = (x: number, y: number, size: number, c: string, f = INK, tr = ''): Shape =>
  mk('text', `x="${x}" y="${y}" font-size="${size}" font-weight="700" font-family="IBM Plex Mono, monospace" text-anchor="middle"${T(tr)}`, f, { k: false, n: true, c });
export const eyes = (x1: number, x2: number, y: number, r = 4): Shape[] => [dot(x1, y, r), dot(x2, y, r), dot(x1 - 1.2, y - 1.4, r * 0.35, PAPER), dot(x2 - 1.2, y - 1.4, r * 0.35, PAPER)];
export const starPath = (cx: number, cy: number, n: number, R: number, r: number, rot = -90): string => {
  const p: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    const rr = i % 2 ? r : R;
    p.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${p.join('L')}Z`;
};
/** overlapping circles merged into one outlined blob */
export const blob = (cs: [number, number, number][], f: string): Shape[] => [
  ...cs.map(([x, y, r]) => circ(x, y, r, f)),
  ...cs.map(([x, y, r]) => nos(circ(x, y, r - 1.4, f))),
];

const ser = (s: Shape, shadow?: string): string => {
  if (s.line) {
    return `<path ${s.a} fill="none" stroke="${shadow ?? s.f}" stroke-width="${s.w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const paint = shadow
    ? `fill="${shadow}" stroke="${shadow}" stroke-width="3" stroke-linejoin="round"`
    : `fill="${s.f}"${s.k ? ` stroke="${INK}" stroke-width="3" stroke-linejoin="round"` : ''}`;
  return s.c !== undefined ? `<${s.t} ${s.a} ${paint}>${s.c}</${s.t}>` : `<${s.t} ${s.a} ${paint}/>`;
};
export const render = (shadow: string, shapes: Shape[], scale = 1): string => {
  const tf = scale === 1 ? '' : ` transform="translate(64 118) scale(${scale}) translate(-64 -118)"`;
  const sh = shapes.filter((s) => !s.n).map((s) => ser(s, shadow)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><g transform="translate(4 4)"><g${tf}>${sh}</g></g><g${tf}>${shapes.map((s) => ser(s)).join('')}</g></svg>`;
};


/** apply a transform to every shape that has none yet (used to pose a ready-made figure) */
const xf = (shapes: Shape[], tr: string): Shape[] => shapes.map((s) => (s.a.includes('transform=') ? s : { ...s, a: `${s.a} transform="${tr}"` }));
/** petal of a radial flower: ellipse whose tip sits 2*ry above the hub (cx,cy) */
const petal = (cx: number, cy: number, rx: number, ry: number, i: number, n: number, f: string): Shape => ell(cx, cy - ry, rx, ry, f, `rotate(${(i * 360) / n} ${cx} ${cy})`);

// ---------- Brand marks (v0.6: official mascot, or the official logo faithfully reproduced in flat riso) ----------
const CLAY = '#d97757'; // Anthropic / Clawd clay orange
const MS_R = '#f25022', MS_G = '#7fba00', MS_B = '#00a4ef', MS_Y = '#ffb900'; // Microsoft four squares
const GB = '#4285f4', GL = '#8ab4f8', GY = '#fbbc04', GV = '#9b72cb'; // Google / Gemini
const OAI = '#10a37f'; // OpenAI green
const META = '#0668e1'; // Meta infinity blue
const MI = ['#ffd800', '#ffaf00', '#ff8205', '#fa500f', '#e10500']; // Mistral pixel-M bands, top to bottom

const f1 = (n: number): string => n.toFixed(1);

/** Anthropic spark: 12 uneven rays around a small core */
const spark = (cx: number, cy: number, R: number, f: string, rot = 0): Shape => {
  const lens = [1, 0.78, 0.95, 0.7, 0.88, 1, 0.74, 0.92, 0.8, 1, 0.7, 0.9];
  const p: string[] = [];
  lens.forEach((l, i) => {
    const a1 = ((i * 30 - 90 + rot) * Math.PI) / 180;
    const a2 = (((i + 0.5) * 30 - 90 + rot) * Math.PI) / 180;
    p.push(`${f1(cx + R * l * Math.cos(a1))} ${f1(cy + R * l * Math.sin(a1))}`, `${f1(cx + R * 0.3 * Math.cos(a2))} ${f1(cy + R * 0.3 * Math.sin(a2))}`);
  });
  return { ...path(`M${p.join('L')}Z`, f), k: false }; // no ink: rays are too thin to outline
};

/** Gemini 4-point sparkle: concave sides, tips on the axes */
const sparkle = (cx: number, cy: number, R: number, f: string, k = 0.5): Shape => {
  const q = R * k;
  return path(
    `M${cx} ${cy - R}C${cx} ${cy - R + q} ${cx + R - q} ${cy} ${cx + R} ${cy}C${cx + R - q} ${cy} ${cx} ${cy + R - q} ${cx} ${cy + R}` +
      `C${cx} ${cy + R - q} ${cx - R + q} ${cy} ${cx - R} ${cy}C${cx - R + q} ${cy} ${cx} ${cy - R + q} ${cx} ${cy - R}Z`,
    f,
  );
};

/** OpenAI blossom: six round-ended strokes laid as the sides of a hexagram, woven */
const knot = (cx: number, cy: number, R: number, w: number, f: string, rot = 0): Shape[] => {
  const pt = (d: number): [number, number] => [cx + R * Math.cos((d * Math.PI) / 180), cy + R * Math.sin((d * Math.PI) / 180)];
  const seg = (a: [number, number], b: [number, number]): string => `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`;
  const chords = [0, 1, 2, 3, 4, 5].map((i): [[number, number], [number, number]] => [pt(rot + i * 60), pt(rot + i * 60 + 120)]);
  const out: Shape[] = [];
  for (const [a, b] of chords) out.push(ln(seg(a, b), w + 6, INK, true), ln(seg(a, b), w, f));
  // weave: the first stroke passes over the last one
  const [a, b] = chords[0] as [[number, number], [number, number]];
  const at = (t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = (-(b[1] - a[1]) / len) * (w / 2 + 1.5), ny = ((b[0] - a[0]) / len) * (w / 2 + 1.5);
  const s0 = at(0.24), s1 = at(0.5);
  out.push(
    ln(seg(s0, s1), w, f),
    ln(seg([s0[0] + nx, s0[1] + ny], [s1[0] + nx, s1[1] + ny]), 3, INK),
    ln(seg([s0[0] - nx, s0[1] - ny], [s1[0] - nx, s1[1] - ny]), 3, INK),
  );
  return out;
};
/** the blossom's central hole, used as a little screen with a face */
const knotFace = (cx: number, cy: number, r: number): Shape[] => [
  circ(cx, cy, r, PAPER),
  dot(cx - r * 0.4, cy - r * 0.12, Math.max(2, r * 0.2)), dot(cx + r * 0.4, cy - r * 0.12, Math.max(2, r * 0.2)),
  ln(`M${f1(cx - r * 0.3)} ${f1(cy + r * 0.38)}Q${cx} ${f1(cy + r * 0.66)} ${f1(cx + r * 0.3)} ${f1(cy + r * 0.38)}`, 2.5),
];
/** Meta infinity ribbon */
const inf = (cx: number, cy: number, k: number): Shape[] => {
  const d = `M${cx} ${cy}C${f1(cx + 10 * k)} ${f1(cy - 16 * k)} ${f1(cx + 26 * k)} ${f1(cy - 14 * k)} ${f1(cx + 26 * k)} ${cy}C${f1(cx + 26 * k)} ${f1(cy + 14 * k)} ${f1(cx + 10 * k)} ${f1(cy + 16 * k)} ${cx} ${cy}` +
    `C${f1(cx - 10 * k)} ${f1(cy - 16 * k)} ${f1(cx - 26 * k)} ${f1(cy - 14 * k)} ${f1(cx - 26 * k)} ${cy}C${f1(cx - 26 * k)} ${f1(cy + 14 * k)} ${f1(cx - 10 * k)} ${f1(cy + 16 * k)} ${cx} ${cy}`;
  const w = Math.max(4, 6 * k);
  return [ln(d, w + 4, INK, true), ln(d, w, META)];
};

// ---------- Claude : Clawd, the Claude Code mascot (wide clay block, square eyes, side arms, four legs) ----------
const clawd = (bx: number, by: number, w: number, h: number, legH: number): Shape[] => {
  const lw = Math.round(w / 8);
  const out: Shape[] = [];
  [0.1, 0.32, 0.54, 0.76].forEach((p) => out.push(rect(bx + w * p, by + h - 4, lw, legH + 4, CLAY, 2)));
  out.push(rect(bx - 14, by + h * 0.4, 20, h * 0.45, CLAY, 3), rect(bx + w - 6, by + h * 0.4, 20, h * 0.45, CLAY, 3));
  out.push(rect(bx, by, w, h, CLAY, 4));
  const ex = [bx + w * 0.24, bx + w * 0.76 - 9], ey = by + h * 0.26, eh = h * 0.36;
  ex.forEach((x) => out.push(nos(rect(x, ey, 9, eh, INK, 2)), dot(x + 2.6, ey + 3, 1.6, PAPER)));
  return out;
};
const claudeHaiku = (): Shape[] => [...clawd(22, 56, 84, 44, 16), spark(106, 36, 18, CLAY)];
const claudeSonnet = (): Shape[] => [
  ...clawd(18, 46, 92, 56, 16),
  ln('M64 46V30', 3, INK, true), spark(64, 18, 19, CLAY),
  rect(92, 58, 34, 26, INK, 3), ln('M98 65l6 5l-6 5', 2.5, CLAY), ln('M108 77h11', 2.5, CLAY),
  ln('M42 78Q64 90 86 78', 3),
];
const claudeOpus = (): Shape[] => [
  path(starPath(64, 62, 12, 62, 46), YEL),
  path('M18 54L2 116H126L110 54Z', RED),
  ...clawd(16, 40, 96, 66, 12),
  path('M36 40V20H47V30H58V14H70V30H81V20H92V40Z', YEL),
  spark(64, 84, 13, PAPER),
  ln('M52 98H76', 3),
];
const claude = (st: number): string => (st === 0 ? render(BLUE, claudeHaiku(), 0.8) : st === 1 ? render(BLUE, claudeSonnet(), 0.96) : render(BLUE, claudeOpus(), 0.9));

// ---------- Phi : the Microsoft four-squares as a head. Schoolkid -> lanky teen with backpack -> graduate ----------
const msLogo = (x: number, y: number, s: number, g = 5): Shape[] => [
  rect(x, y, s, s, MS_R, 2), rect(x + s + g, y, s, s, MS_G, 2), rect(x, y + s + g, s, s, MS_B, 2), rect(x + s + g, y + s + g, s, s, MS_Y, 2),
];
const sqEyes = (x: number, y: number, s: number, g: number, r: number): Shape[] => {
  const ex = [x + s / 2, x + s + g + s / 2], ey = y + s * 0.55;
  return [...ex.map((e) => dot(e, ey, r)), ...ex.map((e) => dot(e - r * 0.35, ey - r * 0.4, r * 0.35, PAPER))];
};
const phi = (st: number): string => {
  if (st === 0) {
    return render(PINK, [
      rect(46, 94, 14, 24, INK, 4), rect(68, 94, 14, 24, INK, 4),
      ln('M36 70L20 84', 9, INK, true), ln('M92 70L106 82', 9, INK, true),
      ...msLogo(35, 38, 26),
      ...sqEyes(35, 38, 26, 5, 4), ln('M57 78Q63.5 83 70 78', 3),
      rect(92, 76, 30, 26, PAPER, 2), ln('M107 76v26', 2.5), ln('M96 84h8M110 84h8M96 91h8M110 91h8', 2),
    ], 0.85);
  }
  if (st === 1) {
    return render(PINK, [
      rect(76, 58, 28, 38, MS_B, 5),
      rect(52, 96, 12, 22, INK, 4), rect(70, 96, 12, 22, INK, 4),
      rect(48, 60, 36, 38, PAPER, 6), path('M60 60L66 70L72 60Z', MS_R), path('M66 70L62 74L66 92L70 74Z', MS_R),
      ln('M48 66L26 84', 9, INK, true), ln('M84 66L92 84', 9, INK, true),
      rect(14, 80, 28, 18, MS_Y, 2), ln('M28 80v18', 2.5),
      ...msLogo(40, 4, 24),
      ...sqEyes(40, 4, 24, 5, 3.6), ln('M60 44Q65 48 70 44', 3),
    ], 0.98);
  }
  return render(PINK, [
    rect(44, 112, 18, 8, INK, 4), rect(66, 112, 18, 8, INK, 4),
    path('M32 90H96L110 118H18Z', INK), path('M54 90L64 104L74 90Z', PAPER),
    rect(94, 88, 32, 11, PAPER, 5, 'rotate(-26 110 94)'), circ(121, 78, 4, MS_R),
    ...msLogo(29, 26, 30),
    ...sqEyes(29, 26, 30, 5, 4.2), ln('M58 76Q64.5 82 71 76', 3),
    path('M12 22L64 6L116 22L64 38Z', INK), ln('M64 22L106 27V48', 3, MS_Y), circ(106, 52, 4, MS_Y),
  ], 1);
};

// ---------- Gemma : Google-blue faceted gem mark. Gem baby -> kite crystal with shard arms -> crystal golem ----------
const gemma = (st: number): string => {
  if (st === 0) {
    return render(PINK, [
      rect(42, 100, 16, 18, INK, 5), rect(70, 100, 16, 18, INK, 5),
      path('M42 22H86L110 50L64 108L18 50Z', GB), path('M42 22H86L74 50H54Z', GL),
      ln('M18 50H110M54 50L64 108L74 50', 2.5),
      nos(path('M24 48L42 28L50 46Z', PAPER)),
      ...eyes(50, 78, 70, 4.5), ln('M57 84Q64 90 71 84', 3),
    ], 0.8);
  }
  if (st === 1) {
    return render(PINK, [
      rect(44, 98, 14, 20, INK, 5), rect(70, 98, 14, 20, INK, 5),
      path('M34 48L6 62L10 80L36 76Z', GL), path('M94 48L122 62L118 80L92 76Z', GL),
      path('M64 4L96 36L88 96L64 106L40 96L32 36Z', GB),
      path('M64 4L96 36L64 46L32 36Z', GL),
      ln('M32 36L64 46L96 36M64 46V106', 2.5),
      nos(path('M40 36L62 12L62 32Z', PAPER)),
      ...eyes(52, 76, 66, 4.5), ln('M57 80Q64 86 71 80', 3),
      path('M108 14L114 24L108 34L102 24Z', GY), path('M18 20L23 28L18 36L13 28Z', GY),
    ], 1);
  }
  return render(PINK, [
    path('M30 50L2 24L8 70L28 80Z', GL), path('M98 50L126 24L120 70L100 80Z', GL),
    rect(36, 100, 22, 18, INK, 5), rect(70, 100, 22, 18, INK, 5),
    path('M32 44H96L108 72L90 104H38L20 72Z', GB),
    path('M32 44L12 26L14 56Z', GL), path('M96 44L116 26L114 56Z', GL),
    path('M32 44H96L90 62H38Z', GL),
    path('M64 56L80 76L64 96L48 76Z', GY), nos(path('M64 62L72 76L64 90L56 76Z', PAPER)),
    ln('M20 72L38 76M108 72L90 76', 2.5),
    path('M64 2L82 18L64 36L46 18Z', GB), path('M64 2L82 18L46 18Z', GL),
    dot(56, 20, 3.2), dot(72, 20, 3.2),
    path('M104 94L110 102L104 110L98 102Z', PAPER), path('M20 92L25 99L20 106L15 99Z', PAPER),
  ], 1);
};

// ---------- GPT : the OpenAI blossom, with a face in its hole. Sprout -> talker -> floating omni -> radiant halo ----------
const gpt = (st: number): string => {
  if (st === 0) {
    return render(PINK, [
      rect(48, 98, 14, 20, INK, 5), rect(68, 98, 14, 20, INK, 5),
      ...knot(64, 62, 34, 15, OAI), ...knotFace(64, 62, 13),
      rect(88, 8, 34, 24, PAPER, 3), path('M96 32L96 40L106 32Z', PAPER), dot(98, 20, 2.4), dot(105, 20, 2.4), dot(112, 20, 2.4),
    ], 0.8);
  }
  if (st === 1) {
    return render(PINK, [
      rect(48, 100, 13, 18, INK, 5), rect(68, 100, 13, 18, INK, 5),
      rect(44, 84, 40, 22, INK, 8), path('M54 84L64 94L74 84Z', PAPER),
      ln('M46 92L24 104', 9, INK, true), circ(22, 106, 6, PAPER),
      ln('M84 92L100 74', 9, INK, true),
      rect(88, 30, 36, 28, PAPER, 6), path('M96 58L96 68L108 58Z', PAPER), dot(98, 44, 2.6), dot(106, 44, 2.6), dot(114, 44, 2.6),
      ...knot(60, 50, 32, 14, OAI), ...knotFace(60, 50, 12),
    ], 0.96);
  }
  if (st === 2) {
    return render(PINK, [
      ell(64, 112, 28, 6, INK),
      ...knot(64, 54, 36, 16, OAI), ...knotFace(64, 54, 14),
      circ(14, 40, 9, PINK), dot(14, 40, 3.4, PAPER), circ(114, 40, 9, YEL), rect(111, 34, 6, 12, INK, 3),
      circ(104, 100, 9, PAPER), ln('M99 100h2l2-5l3 10l2-5h3', 2),
      ln('M20 52Q30 90 56 100', 2.5, INK),
    ], 0.96);
  }
  return render(PINK, [
    path(starPath(64, 56, 16, 58, 44), YEL),
    path('M38 100H90L106 118H22Z', INK), ln('M64 100V116', 3, PAPER),
    ...knot(64, 54, 38, 17, OAI), ...knotFace(64, 54, 15),
    path('M64 -2L67 6L75 8L67 10L64 18L61 10L53 8L61 6Z', PAPER),
  ], 1);
};

// ---------- o : thought-cloud. Mini bubble -> pensive thinker -> meditating sage ----------
const cloud = (x: number, y: number, k: number): [number, number, number][] =>
  ([[-22, 0, 20], [0, -16, 24], [24, -2, 22], [0, 10, 26], [-20, 16, 16], [22, 18, 16]] as [number, number, number][]).map(([a, b, r]) => [x + a * k, y + b * k, r * k]);
const oModel = (st: number): string => {
  if (st === 0) {
    return render(PINK, [
      rect(46, 98, 13, 20, INK, 4), rect(70, 98, 13, 20, INK, 4),
      ...blob(cloud(64, 74, 1), VIO),
      nos(path('M30 56Q36 42 50 40', PAPER)),
      ...knot(64, 44, 13, 6, OAI),
      ...eyes(54, 76, 70, 4.5), dot(54, 88, 3), dot(64, 88, 3), dot(74, 88, 3),
    ], 0.8);
  }
  if (st === 1) {
    return render(PINK, [
      rect(48, 100, 13, 18, INK, 4), rect(72, 100, 13, 18, INK, 4),
      ln('M96 70Q112 80 106 94', 11, INK, true), ln('M96 70Q112 80 106 94', 5, VIO),
      ...blob(cloud(56, 70, 1.02), VIO),
      ln('M40 82Q34 100 52 100', 10, INK, true), ln('M40 82Q34 100 52 100', 4, VIO), circ(54, 96, 6, PAPER),
      nos(path('M24 54Q30 40 46 38', PAPER)),
      dot(44, 66, 4.5), dot(68, 66, 4.5), ln('M38 58L52 62M74 62L88 58', 3), ln('M52 80H66', 3),
      circ(112, 40, 6, PAPER), circ(100, 54, 3.5, PAPER),
      circ(100, 20, 15, PAPER), circ(100, 20, 6, VIO), ...knot(54, 36, 10, 5, OAI), ln('M100 2V8M100 32V38M82 20H88M112 20H118', 3),
    ], 0.96);
  }
  return render(PINK, [
    path(starPath(64, 54, 14, 54, 42), YEL),
    ell(64, 108, 38, 11, VIO),
    ...blob(cloud(64, 50, 1.12), VIO),
    ...knot(64, 18, 14, 6, OAI),
    ln('M42 40Q50 34 56 40M72 40Q78 34 86 40', 2.5), ln('M44 58Q64 52 84 58', 2.5),
    ln('M42 66Q52 72 60 66M68 66Q76 72 86 66', 3), ln('M57 82Q64 87 71 82', 3),
    circ(34, 100, 7, PAPER), circ(94, 100, 7, PAPER),
    circ(10, 28, 6, PAPER), circ(18, 14, 4, PAPER), circ(118, 28, 6, PAPER), circ(110, 14, 4, PAPER),
  ], 1);
};

// ---------- Gemini : the 4-point sparkle, exact shape. Nano -> Flash (tilted, zippy) -> Pro (layered) -> Ultra (crowned halo) ----------
const sparkEyes = (cx: number, cy: number, d: number, r: number): Shape[] => [
  dot(cx - d, cy, r), dot(cx + d, cy, r), dot(cx - d - r * 0.35, cy - r * 0.4, r * 0.35, PAPER), dot(cx + d - r * 0.35, cy - r * 0.4, r * 0.35, PAPER),
];
const gemini = (st: number): string => {
  if (st === 0) {
    return render(PINK, [
      rect(50, 90, 10, 28, INK, 3), rect(68, 90, 10, 28, INK, 3),
      sparkle(64, 62, 44, GB),
      sparkle(100, 24, 13, GY),
      ...sparkEyes(64, 62, 8, 3.4), ln('M59 71Q64 76 69 71', 2.5),
    ], 0.9);
  }
  if (st === 1) {
    return render(PINK, [
      ln('M2 38h18M0 62h14M4 86h18', 3, INK),
      rect(52, 92, 10, 26, INK, 3), rect(70, 92, 10, 26, INK, 3),
      ...xf([sparkle(70, 62, 50, GV)], 'rotate(45 70 62)'),
      sparkle(66, 62, 44, GB),
      path('M100 14L88 36H98L92 54L112 28H101L108 14Z', GY),
      ...sparkEyes(66, 62, 8, 3.6), ln('M61 72Q66 77 71 72', 2.5),
    ], 0.92);
  }
  if (st === 2) {
    return render(PINK, [
      ln('M42 72L14 86', 9, INK, true), ln('M90 72L116 86', 9, INK, true),
      rect(50, 94, 11, 24, INK, 3), rect(68, 94, 11, 24, INK, 3),
      ...xf([sparkle(64, 58, 54, GV)], 'rotate(45 64 58)'),
      sparkle(64, 58, 50, GB), sparkle(64, 58, 26, GL),
      sparkle(108, 18, 13, GY), sparkle(18, 22, 10, GV),
      ...sparkEyes(64, 58, 9, 3.8), ln('M58 70Q64 76 70 70', 3),
    ], 1);
  }
  return render(PINK, [
    path(starPath(64, 62, 12, 61, 49), GY),
    rect(48, 98, 12, 20, INK, 3), rect(68, 98, 12, 20, INK, 3),
    ...xf([sparkle(64, 62, 58, GV)], 'rotate(45 64 62)'),
    sparkle(64, 62, 54, GB), sparkle(64, 62, 32, GL),
    path('M54 12L58 0L64 8L70 0L74 12Z', GY),
    ...sparkEyes(64, 62, 9, 4.2), ln('M57 75Q64 82 71 75', 3),
  ], 0.95);
};

// ---------- Nano Banana : the banana is its de-facto mascot (+ Gemini sparkle on the apron). Pro is an upright artist with beret, palette and apron ----------
const nanoBanana = (pro: boolean): string => {
  if (!pro) {
    return render(BLUE, [
      rect(46, 104, 13, 14, INK, 4), rect(70, 104, 13, 14, INK, 4),
      rect(58, 4, 12, 14, OR, 3),
      path('M64 12C94 14 106 56 96 86C90 104 78 112 62 112C48 112 38 102 34 86C26 56 38 14 64 12Z', YEL),
      nos(path('M44 30C38 50 40 70 46 84', PAPER)), ln('M82 24C92 44 92 76 80 100', 2.5, INK),
      ...eyes(54, 76, 64, 4.2), ln('M57 80Q65 87 73 80', 3),
      ln('M96 82L116 46', 4.5, INK, true), ln('M116 46L122 34', 8, PINK, true),
    ], 0.88);
  }
  return render(BLUE, [
    rect(40, 106, 18, 12, INK, 5), rect(70, 106, 18, 12, INK, 5),
    rect(48, 92, 10, 16, YEL, 3), rect(72, 92, 10, 16, YEL, 3),
    ln('M36 70L14 84', 11, INK, true), ln('M36 70L14 84', 5, YEL),
    ln('M96 62L112 36', 11, INK, true), ln('M96 62L112 36', 5, YEL),
    ln('M110 38L124 6', 4.5, INK, true), ln('M124 6L128 -2', 7, PINK, true),
    rect(56, 0, 12, 14, OR, 3),
    path('M62 10C100 12 110 52 100 82C96 98 84 104 64 104C46 104 32 98 30 82C24 52 32 12 62 10Z', YEL),
    nos(path('M42 28C34 48 36 66 42 80', PAPER)),
    path('M38 70H92L88 106H42Z', RED), sparkle(64, 80, 11, GB),
    ell(18, 92, 17, 13, PAPER, 'rotate(-20 18 92)'), circ(12, 88, 3.2, PINK), circ(22, 84, 3.2, BLUE), circ(24, 96, 3.2, TEAL),
    circ(54, 50, 10, PAPER), circ(76, 50, 10, PAPER), dot(54, 51, 3.4), dot(76, 51, 3.4), ln('M64 49h2', 3),
    ln('M57 64Q65 70 73 64', 3),
    path('M26 28C28 10 54 4 80 10C92 14 92 22 84 24C62 22 42 26 26 28Z', PINK), circ(64, 4, 3, INK),
  ], 0.88);
};

// ---------- Copilot : the colourful ribbon-ring mark as a pilot's head. Cadet -> co-pilot with headset -> cockpit mech ----------
const COP_B = '#26a5e6', COP_G = '#8dd24a', COP_O = '#ff8a3d', COP_P = '#e8458b';
const arcPath = (cx: number, cy: number, R: number, a0: number, a1: number): string => {
  const p = (a: number): string => `${f1(cx + R * Math.cos((a * Math.PI) / 180))} ${f1(cy + R * Math.sin((a * Math.PI) / 180))}`;
  return `M${p(a0)}A${R} ${R} 0 ${Math.abs(a0 - a1) > 180 ? 1 : 0} 0 ${p(a1)}`;
};
const copRing = (cx: number, cy: number, R: number, w: number): Shape[] => {
  const A = arcPath(cx, cy, R, -50, -210), A2 = arcPath(cx, cy, R, -50, -105);
  const B = arcPath(cx, cy, R, 130, -30), B2 = arcPath(cx, cy, R, 130, 80);
  const r = R - w / 2 + 1;
  return [
    ln(A, w + 6, INK, true), ln(B, w + 6, INK, true),
    ln(A, w, COP_B), ln(A2, w, COP_G), ln(B, w, COP_O), ln(B2, w, COP_P),
    circ(cx, cy, r, PAPER), ...eyes(cx - r * 0.38, cx + r * 0.38, cy - r * 0.05, Math.max(2.4, r * 0.17)), ln(`M${f1(cx - r * 0.28)} ${f1(cy + r * 0.4)}Q${cx} ${f1(cy + r * 0.66)} ${f1(cx + r * 0.28)} ${f1(cy + r * 0.4)}`, 2.5),
  ];
};
const copilot = (st: number): string => {
  if (st === 0) {
    return render(BLUE, [
      rect(46, 100, 12, 18, INK, 4), rect(70, 100, 12, 18, INK, 4),
      ln('M46 92L28 104', 9, INK, true), ln('M82 92L100 104', 9, INK, true),
      rect(44, 84, 40, 22, COP_B, 8),
      ...copRing(64, 48, 28, 15),
    ], 0.85);
  }
  if (st === 1) {
    return render(BLUE, [
      rect(46, 102, 12, 16, INK, 4), rect(70, 102, 12, 16, INK, 4),
      rect(40, 84, 48, 22, COP_B, 8), path('M54 84L64 98L74 84Z', PAPER),
      ln('M42 92L22 104', 9, INK, true), circ(20, 106, 6, PAPER),
      ln('M86 92L104 78', 9, INK, true),
      path('M92 18H124V42H112L106 50V42H92Z', PAPER), dot(100, 30, 2.4), dot(108, 30, 2.4), dot(116, 30, 2.4),
      ...copRing(60, 48, 29, 15),
      circ(26, 50, 7, INK), circ(94, 50, 7, INK), ln('M26 44Q26 8 60 8Q94 8 94 44', 3.5, INK),
    ], 0.98);
  }
  return render(BLUE, [
    rect(22, 98, 34, 20, INK, 8), rect(72, 98, 34, 20, INK, 8), circ(39, 108, 5, STEEL), circ(89, 108, 5, STEEL),
    rect(2, 64, 24, 28, COP_B, 6), rect(102, 64, 24, 28, COP_B, 6),
    path('M10 90L2 110L14 104L18 110L22 90Z', STEEL), path('M118 90L126 110L114 104L110 110L106 90Z', STEEL),
    rect(28, 70, 72, 34, STEEL, 8), rect(44, 78, 40, 18, INK, 4), dot(54, 87, 4, COP_G), dot(64, 87, 4, PAPER), dot(74, 87, 4, COP_P),
    ln('M64 8V0', 3), circ(64, 2, 4, COP_P),
    ...copRing(64, 42, 28, 15),
  ], 1);
};

// ---------- Llama : the Llama mascot + Meta infinity emblem; Behemoth only a looming silhouette ----------
const llamaHead = (hx: number, hy: number, k: number): Shape[] => [
  ell(hx - 8 * k, hy - 14 * k, 4.5 * k, 10 * k, PAPER2, `rotate(-12 ${hx - 8 * k} ${hy - 14 * k})`),
  ell(hx + 4 * k, hy - 15 * k, 4.5 * k, 10 * k, PAPER2, `rotate(12 ${hx + 4 * k} ${hy - 15 * k})`),
  ell(hx, hy, 17 * k, 14 * k, PAPER2), ell(hx + 12 * k, hy + 5 * k, 10 * k, 7.5 * k, PAPER2),
  dot(hx + 3 * k, hy - 2 * k, 3), dot(hx + 19 * k, hy + 3 * k, 1.8), ln(`M${hx + 8 * k} ${hy + 10 * k}Q${hx + 12 * k} ${hy + 12 * k} ${hx + 16 * k} ${hy + 9 * k}`, 2),
];
const llamaBaby = (): Shape[] => [
  ell(24, 82, 8, 11, PAPER2),
  rect(38, 98, 11, 20, PAPER2, 4), rect(52, 100, 11, 18, PAPER2, 4), rect(76, 100, 11, 18, PAPER2, 4), rect(90, 98, 11, 20, PAPER2, 4),
  ell(64, 86, 34, 22, PAPER2),
  rect(78, 32, 22, 56, PAPER2, 10),
  ell(94, 26, 17, 14, PAPER2), ell(106, 31, 10, 7.5, PAPER2),
  ell(86, 10, 4.5, 10, PAPER2, 'rotate(-12 86 10)'), ell(98, 9, 4.5, 10, PAPER2, 'rotate(12 98 9)'),
  ...inf(48, 78, 0.55),
  dot(97, 24, 3), dot(113, 29, 1.8), ln('M104 36Q108 38 112 35', 2),
  rect(74, 56, 30, 13, BLUE, 5), rect(78, 66, 10, 28, BLUE, 3), ln('M78 76h10M78 84h10', 2.5),
];
const llama = (st: number): string => {
  if (st === 0) return render(PINK, llamaBaby(), 0.62);
  if (st === 4) {
    const sil = llamaBaby().map((s) => ({ ...s, f: s.f === BLUE ? BLUE : s.f === PAPER2 || s.f === PAPER ? '#3a3550' : s.f }));
    return render(PINK, [...sil, dot(97, 24, 3.6, YEL)], 1.0);
  }
  if (st === 1) {
    return render(PINK, [
      ell(14, 88, 8, 12, PAPER2),
      rect(30, 100, 11, 18, PAPER2, 4), rect(46, 102, 11, 16, PAPER2, 4), rect(68, 102, 11, 16, PAPER2, 4), rect(84, 100, 11, 18, PAPER2, 4),
      ell(56, 90, 36, 21, PAPER2),
      rect(78, 30, 18, 62, PAPER2, 9),
      path('M80 62L44 54L52 74L82 72Z', BLUE), rect(76, 58, 24, 13, BLUE, 5),
      ...llamaHead(90, 30, 1),
      nos(ell(78, 86, 14, 9, PAPER)), ...inf(46, 84, 0.6),
      ell(88, 14, 7, 5, PAPER), ell(98, 16, 5, 4, PAPER),
    ], 0.98);
  }
  if (st === 2) {
    return render(PINK, [
      ell(14, 90, 8, 12, PAPER2),
      rect(30, 100, 11, 18, PAPER2, 4), rect(46, 102, 11, 16, PAPER2, 4), rect(68, 100, 11, 18, PAPER2, 4), rect(86, 92, 11, 14, PAPER2, 4, 'rotate(-25 91 100)'),
      ln('M108 62L116 118', 4, INK, true),
      ell(56, 90, 36, 21, PAPER2),
      rect(34, 52, 30, 38, STEEL, 7), rect(32, 44, 34, 11, TEAL, 5), ...inf(49, 72, 0.5),
      rect(78, 36, 18, 56, PAPER2, 9),
      rect(76, 58, 24, 13, BLUE, 5), path('M78 62L66 74L74 76L84 70Z', BLUE),
      ...llamaHead(92, 30, 1),
      ell(92, 17, 24, 5, OR), rect(81, 5, 22, 14, OR, 5), rect(81, 14, 22, 4, INK, 1),
      circ(104, 72, 6, INK), circ(114, 72, 6, INK), rect(104, 66, 10, 6, INK, 1),
    ], 0.98);
  }
  return render(PINK, [
    ell(10, 80, 9, 14, PAPER2),
    rect(26, 98, 13, 20, PAPER2, 4), rect(44, 100, 13, 18, PAPER2, 4), rect(68, 100, 13, 18, PAPER2, 4), rect(86, 98, 13, 20, PAPER2, 4),
    ell(54, 84, 40, 25, PAPER2),
    path('M76 56L26 42L34 70L78 74Z', BLUE),
    rect(76, 24, 24, 68, PAPER2, 12),
    nos(ell(80, 90, 16, 12, PAPER)), ...inf(30, 80, 0.5),
    rect(74, 52, 30, 14, BLUE, 5),
    path('M46 70L60 70L52 86L66 86L42 112L48 92L38 92Z', YEL),
    ...llamaHead(96, 22, 1.1),
    path('M82 12L86 -2L92 8L98 -6L104 8L112 -2L110 12Z', BLUE),
    rect(94, 14, 26, 9, INK, 3), nos(rect(97, 16, 8, 2, PAPER)),
    rect(74, 64, 6, 6, YEL, 1), rect(98, 64, 6, 6, YEL, 1),
  ], 0.86);
};

// ---------- Mistral : pixel cats (official emblem = "abstract pixel cat", Le Chat mascot). Bands yellow -> red ----------

/** Turn a char grid into flat square cells. '#' = body, coloured in 5 horizontal bands (yellow -> red) by row;
 *  '.' = empty; every other char is looked up in `palette`. Cells sit on an ink underlay (the riso outline + visible pixel seams). */
export const pixelCat = (grid: string[], palette: Record<string, string>, cell: number): { under: string; fills: [string, string][]; } => {
  const w = Math.max(...grid.map((r) => r.length));
  const x0 = Math.round((128 - w * cell) / 2), y0 = 118 - grid.length * cell;
  const rows = grid.map((r, i) => (r.includes('#') ? i : -1)).filter((i) => i >= 0);
  const top = Math.min(...rows), span = Math.max(...rows) - top + 1;
  const by = new Map<string, string>();
  let under = '';
  grid.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === '.' || ch === ' ') return;
      const x = x0 + c * cell, y = y0 + r * cell;
      const fill = ch === '#' ? (MI[Math.min(4, Math.floor(((r - top) * 5) / span))] as string) : (palette[ch] ?? INK);
      under += `M${x - 1.5} ${y - 1.5}h${cell + 3}v${cell + 3}h${-(cell + 3)}z`;
      by.set(fill, (by.get(fill) ?? '') + `M${x + 0.5} ${y + 0.5}h${cell - 1}v${cell - 1}h${-(cell - 1)}z`);
    });
  });
  return { under, fills: [...by.entries()] };
};
/** Paste small grids onto a blank canvas ('.' is transparent). */
export const stamp = (w: number, h: number, parts: [string[], number, number][]): string[] => {
  const g = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
  for (const [p, x, y] of parts) p.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') (g[y + r] as string[])[x + c] = ch; }));
  return g.map((r) => r.join(''));
};
export const KIT = [
  '#..........#', '##........##', '############', '############', '##wk####wk##', '##kk####kk##',
  '#####pp#####', '.##########.', '..########..', '..########..', '..########..', '..###..###..', '..###..###..',
];
const CAT_HEAD = [
  '##............##', '###..........###', '################', '################', '###wk######wk###', '###kk######kk###',
  '#######pp#######', '.##############.',
];
const PAL: Record<string, string> = { k: INK, w: PAPER, p: PINK, t: BLUE, y: MI[0] as string, d: '#3a3550' };
const catShapes = (grid: string[], cell: number): Shape[] => {
  const { under, fills } = pixelCat(grid, PAL, cell);
  return [{ ...path(under, INK), k: false }, ...fills.map(([f, d]) => ({ ...path(d, f), k: false, n: true }))];
};
const mistral = (kind: 'base' | 'mix' | 'large' | 'magi'): string => {
  if (kind === 'base') {
    return render(BLUE, catShapes(stamp(13, 13, [[KIT, 0, 0], [['.#', '.#', '##'], 11, 8], [['.#', '.#', '.#'], 11, 10]]).map((r) => r), 8));
  }
  if (kind === 'mix') {
    const tiny = ['#...#', '#####', '#k#k#', '.###.'];
    const spots: [number, number][] = [[0, 0], [12, 0], [0, 5], [6, 5], [12, 5], [0, 10], [6, 10], [12, 10]];
    return render(BLUE, catShapes(stamp(17, 14, spots.map(([x, y]) => [tiny, x, y] as [string[], number, number])), 6));
  }
  if (kind === 'large') {
    const body = [
      '######wttw######', '#######tt#######', '######tttt######', '######tttt######', '#######tt#######', '.######tt######.', '..####....####..',
    ];
    return render(BLUE, catShapes([...CAT_HEAD, ...body], 7));
  }
  const spark = ['.y.', 'yyy', '.y.'];
  const board = stamp(18, 17, [
    [KIT, 3, 4],
    [['..kkkkkkkkkk..'], 2, 2], [['kkkkkkkkkkkkkkkk'], 1, 3], [['kkkkkkkk', 'kkkkkkkk'], 5, 4],
    [['y', 'y', 'y', 'yy'], 16, 4],
    [spark, 0, 6], [spark, 15, 9], [['y'], 1, 11], [['y'], 16, 13],
  ]);
  return render(BLUE, catShapes(board, 6));
};


// ---------- Transformer : multi-headed attention hydra (legendary) ----------
const transformer = (): string => {
  const heads: [number, number][] = [[24, 52], [44, 28], [64, 18], [84, 28], [104, 52]];
  const sh: Shape[] = [path(starPath(64, 62, 16, 62, 50), YEL)];
  heads.forEach(([x, y]) => sh.push(ln(`M64 84Q${(x + 64) / 2} ${y + 40} ${x} ${y}`, 15, INK, true), ln(`M64 84Q${(x + 64) / 2} ${y + 40} ${x} ${y}`, 8, VIO)));
  sh.push(path('M30 118L40 84H88L98 118Z', VIO), nos(path('M42 90L48 88L40 112L36 112Z', PAPER)), circ(64, 98, 8, YEL), dot(64, 98, 3.4));
  heads.forEach(([x, y]) => sh.push(circ(x, y, 12, PAPER), dot(x + (64 - x) / 14, y + 1, 5), dot(x + (64 - x) / 14 - 1.5, y - 1, 1.6, PAPER)));
  sh.push(ln('M24 52Q34 28 44 28Q54 18 64 18Q74 18 84 28Q94 28 104 52', 2.5, PINK), path('M54 8L58 0L64 6L70 0L74 8Z', YEL));
  return render(BLUE, sh, 1);
};

export const POKAI: Record<string, PokaiSvg> = {
  claude_haiku: claude(0), claude_sonnet: claude(1), claude_opus: claude(2),
  phi_1: phi(0), phi_3: phi(1), phi_4: phi(2),
  gemma: gemma(0), gemma_2: gemma(1), gemma_3: gemma(2),
  gpt_2: gpt(0), gpt_3_5: gpt(1), gpt_4o: gpt(2), gpt_5: gpt(3),
  o1_mini: oModel(0), o1: oModel(1), o3: oModel(2),
  gemini_nano: gemini(0), gemini_flash: gemini(1), gemini_pro: gemini(2), gemini_ultra: gemini(3),
  nano_banana: nanoBanana(false), nano_banana_pro: nanoBanana(true),
  copilot: copilot(0), copilot_chat: copilot(1), copilot_agent: copilot(2),
  llama_2: llama(0), llama_3: llama(1), llama_4_scout: llama(2), llama_4_maverick: llama(3), llama_4_behemoth: llama(4),
  mistral_7b: mistral('base'), mixtral_8x7b: mistral('mix'), mistral_large: mistral('large'), magistral: mistral('magi'),
  transformer: transformer(),
};
