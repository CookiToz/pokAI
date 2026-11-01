// Intro cinematic shots: each one is a 1600x700 SVG scene (riso flat vectors) animated purely by CSS transforms (see intro.css).
import type { SfxName } from '../../audio/audio';
import { TRAILER_SHOT_STARTS, shotDuration } from '../../audio/trailer-cues';
import { hasPokaiArt, pokaiSvg } from '../../art/svg';
import { P, hash01 } from '../../world/art/kit';
import { characterSvg, graduateSvg } from '../../world/art/characters';

export type FxKind = 'dust' | 'tokens' | 'hearts' | 'ash' | 'sparks' | 'embers' | 'stream' | 'paper';

export interface Shot {
  dur: number; // seconds (from the shared trailer timeline)
  /** nominal start on the trailer clock (seconds) */
  at: number;
  /** the shot is mounted this many seconds BEFORE `at` so entrance animations land exactly on the music hit (default 0.2) */
  pre?: number;
  /** black title card (no parallax, gentler camera) */
  title?: boolean;
  /** drifting particles drawn over the scene (svg markup) */
  fx?: string;
  /** light sweeps across the frame at these seconds after `at` */
  sweeps?: number[];
  /** subtitle typed under the picture ('' on title cards) */
  caption: string;
  /** camera move over the whole shot (CSS scale), focus = transform-origin */
  cam?: 'in' | 'out';
  /** camera focus (transform-origin, CSS) */
  focus?: string;
  /** riso colour flash used for the cut INTO this shot */
  flash: string;
  scene: string; // inner svg markup
  /** foley one-shots (seconds after `at`); the score carries the hits */
  sfx?: [number, SfxName][];
  /** background colour of the stage (also used behind the letterbox wipe) */
  bg: string;
}

const W = 1600;
const H = 700;
const MONO = 'IBM Plex Mono, ui-monospace, monospace';
const DISP = 'Bricolage Grotesque, IBM Plex Sans, sans-serif';

/** Animated group. `t` = delay in s, `cls` = animation classes from intro.css. */
const A = (cls: string, t: number, body: string, extra = ''): string => `<g class="a ${cls}" style="--t:${t}s;${extra}">${body}</g>`;
/** Parallax layer: depth 0 = far (barely moves with the camera), 1 = action plane, > 1 = foreground. */
const plx = (d: number, body: string): string => `<g class="plx" data-d="${d}">${body}</g>`;
const rect = (x: number, y: number, w: number, h: number, f: string, extra = ''): string => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${extra}/>`;
/** Outlined rect with a hard offset shadow (riso). */
const card = (x: number, y: number, w: number, h: number, f: string, sh: string = P.ink, o = 6): string =>
  `<rect x="${x + o}" y="${y + o}" width="${w}" height="${h}" fill="${sh}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" stroke="${P.ink}" stroke-width="4"/>`;
const text = (x: number, y: number, s: string, size: number, f: string, extra = ''): string =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-weight="600" font-size="${size}" fill="${f}" ${extra}>${s}</text>`;
const blob = (cx: number, cy: number, r: number, f: string, extra = ''): string => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" style="mix-blend-mode:multiply" ${extra}/>`;

/** Splits a complete svg string into viewBox size + inner markup so it can be nested at any position/size. */
function nest(svg: string, x: number, y: number, h: number, tint?: string, flip = false): string {
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"[^>]*>([\s\S]*)<\/svg>\s*$/.exec(svg);
  if (!m) return '';
  const vw = Number(m[1]);
  const vh = Number(m[2]);
  const w = (h * vw) / vh;
  let body = m[3]!;
  if (tint) body = body.replace(/(fill|stroke)="#[0-9a-fA-F]{3,8}"/g, `$1="${tint}"`);
  const inner = `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${vw} ${vh}" overflow="visible">${body}</svg>`;
  return flip ? `<g transform="translate(${2 * x + w} 0) scale(-1 1)">${inner}</g>` : inner;
}
const pk = (id: string, x: number, y: number, h: number, tint?: string): string => (hasPokaiArt(id) ? nest(pokaiSvg(id), x, y, h, tint) : '');
/** Character sprite whose feet land on `foot` (sprite anchor is y=64/68 of its height). */
const person = (id: string, cx: number, foot: number, h: number, flip = false, tint?: string): string => {
  const w = (h * 48) / 68;
  return nest(characterSvg(id, 'front', 0), cx - w / 2, foot - h * (64 / 68), h, tint, flip);
};
const grad = (cx: number, foot: number, h: number): string => {
  const w = (h * 48) / 68;
  return nest(graduateSvg('front', 0), cx - w / 2, foot - h * (64 / 68), h);
};

const FORMS = ['claude_haiku', 'gpt_4o', 'llama_4_maverick', 'deepseek_v3', 'gemini_flash', 'mistral_7b', 'qwen', 'grok_1', 'midjourney_v6', 'copilot'];

const heart = (x: number, y: number, s: number, f: string): string =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 8 C-14 -4 -8 -16 0 -8 C8 -16 14 -4 0 8Z" fill="${f}" stroke="${P.ink}" stroke-width="${3 / s}"/>`;

function shot1(): string {
  let s = rect(0, 0, W, H, P.paper);
  s += plx(0.2, A('drift-a', 0, blob(1130, 330, 300, P.yellow) + blob(330, 190, 150, P.pink, 'opacity=".9"')));
  // skyline
  let sky = '';
  const hs = [200, 320, 260, 400, 300, 360, 240, 340, 280, 420, 230, 330, 270, 380];
  hs.forEach((hh, i) => {
    const x = -40 + i * 125;
    sky += rect(x, 640 - hh, 108, hh + 80, i % 2 ? P.lav : P.lav2, `stroke="${P.ink}" stroke-width="3"`);
    for (let r = 0; r < Math.floor(hh / 46); r++) sky += rect(x + 14, 640 - hh + 16 + r * 46, 14, 20, P.yellow) + rect(x + 54, 640 - hh + 16 + r * 46, 14, 20, hash01(i, r) > 0.5 ? P.yellow : P.paper2);
  });
  s += plx(0.45, A('drift-b', 0, sky));
  // marquee
  const tick = 'NOUVEAU MODÈLE CHAQUE JEUDI  ·  AGI DANS 2 ANS  ·  BENCHMARK TRUQUÉ, PARDON  ·  VERSION -PRO-MAX  ·  ';
  s += plx(0.6, rect(-60, 28, W + 120, 58, P.ink) + `<g class="a marq" style="--dur:5s">${text(0, 68, tick + tick + tick, 30, P.yellow, 'xml:space="preserve"')}</g>`);
  // chat bubbles
  const bubbles: [number, number, string, number][] = [[210, 190, 'bonjour !', 0.5], [520, 130, 'écris-moi un poème', 0.9], [900, 215, 'corrige mon code', 1.3], [1210, 140, 'merci !', 1.7], [1330, 280, 'tu es sûr ?', 2.1]];
  let bub = '';
  for (const [x, y, t, d] of bubbles) {
    const w = 40 + t.length * 17;
    bub += A('pop float', d, card(x, y, w, 62, P.paper, P.pink, 6) + text(x + 20, y + 40, t, 26, P.ink), `transform-origin:${x}px ${y + 62}px`);
  }
  s += plx(0.85, bub);
  // ground
  let fg = rect(-80, 620, W + 160, 80, P.paper2) + rect(-80, 616, W + 160, 6, P.ink);
  const forms = FORMS.filter(hasPokaiArt);
  forms.slice(0, 9).forEach((f, i) => {
    const size = 200 + (i % 3) * 36;
    fg += A('rise', 0.3 + i * 0.22, pk(f, 30 + i * 172, 640 - size, size));
  });
  return s + plx(1.2, fg);
}

function shot2(): string {
  let s = rect(0, 0, W, H, P.paper);
  s += plx(0.2, A('drift-a', 0, blob(1300, 150, 130, P.pink) + blob(260, 300, 220, P.yellow)));
  // trees
  let trees = '';
  for (let i = 0; i < 7; i++) trees += `<g transform="translate(${60 + i * 260} 0)">${rect(-8, 380, 16, 90, P.woodD)}<circle cx="0" cy="360" r="${70 + (i % 3) * 14}" fill="${P.leaf}" stroke="${P.ink}" stroke-width="4"/><circle cx="-22" cy="340" r="22" fill="${P.leafL}"/></g>`;
  s += plx(0.5, A('drift-b', 0, trees));
  s += plx(0.85, rect(-80, 470, W + 160, 230, P.grassA) + rect(-80, 466, W + 160, 6, P.ink) + `<path d="M-120 700 Q500 560 900 620 T1760 560 L1760 700Z" fill="${P.path}" stroke="${P.ink}" stroke-width="4"/>`);
  let act = '';
  const duos: [string, string, number, number][] = [['vibeur_a', 'claude_haiku', 250, 0.2], ['kid', 'phi_1', 620, 0.6], ['vibeur_b', 'gemma', 990, 1.0], ['mom', 'llama_3', 1340, 1.4]];
  for (const [c, p, x, d] of duos) {
    act += A('rise bobby', d, person(c, x, 640, 330) + pk(p, x + 90, 520, 150));
    act += A('pop', d + 0.8, heart(x + 60, 330, 2.2, P.pink), `transform-origin:${x + 60}px 330px`);
  }
  return s + plx(1.15, act);
}

function shot3(): string {
  let s = rect(0, 0, W, H, P.asphaltD);
  s += plx(0.15, A('drift-a', 0, blob(1250, 160, 200, P.steel, 'opacity=".6"')));
  // searchlights
  s += plx(0.4, `<g class="a sweepL" style="transform-origin:560px 40px"><path d="M560 40 L300 700 L700 700Z" fill="${P.paper}" opacity=".12"/></g>` +
    `<g class="a sweepR" style="transform-origin:1100px 40px"><path d="M1100 40 L900 700 L1350 700Z" fill="${P.paper}" opacity=".12"/></g>`);
  // tower
  let tower = rect(560, 120, 480, 520, P.steel, `stroke="${P.ink}" stroke-width="5"`);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 6; c++) tower += rect(592 + c * 74, 180 + r * 54, 40, 30, hash01(r, c, 3) > 0.7 ? P.yellow : P.steelD);
  tower += card(660, 56, 280, 70, P.red, P.ink, 5) + text(716, 106, 'AIACT', 46, P.paper, 'letter-spacing="10"');
  s += plx(0.6, A('towerUp', 0.1, tower, 'transform-origin:800px 640px'));
  // posters
  let pos = '';
  const posters: [number, number, number, number][] = [[60, 250, -6, 0.5], [210, 300, 4, 0.8], [1180, 250, 5, 1.1], [1340, 310, -4, 1.4], [120, 450, 3, 1.7], [1260, 470, -5, 2.0]];
  for (const [x, y, r, d] of posters) {
    pos += A('pop', d, `<g transform="rotate(${r} ${x + 70} ${y + 90})">${card(x, y, 140, 180, P.paper, P.red, 6)}${rect(x + 10, y + 12, 120, 70, P.red)}${text(x + 18, y + 40, 'L\'IA', 28, P.paper)}${text(x + 18, y + 70, 'EST UN', 22, P.paper)}${text(x + 18, y + 120, 'DANGER', 24, P.red)}${text(x + 18, y + 152, '(sauf nous)', 13, P.ink3)}</g>`, `transform-origin:${x + 70}px ${y + 90}px`);
  }
  s += plx(0.8, pos);
  let fg = rect(-80, 620, W + 160, 80, P.asphalt) + rect(-80, 616, W + 160, 6, P.ink);
  [420, 640, 960, 1180].forEach((x, i) => {
    fg += A('march', 0.4 + i * 0.25, person('agent_conformite', x, 668, 280));
  });
  fg += A('slideUp', 1.9, card(430, 566, 740, 66, P.yellow, P.red, 6) + text(458, 608, 'LOI N°7 : VIBE CODING INTERDIT SANS LICENCE', 25, P.ink));
  return s + plx(1.2, fg);
}

function shot4(): string {
  let s = rect(0, 0, W, H, P.paper);
  s += plx(0.2, A('drift-a', 0, blob(800, 300, 340, P.yellow) + blob(1350, 120, 120, P.blue, 'opacity=".8"') + blob(200, 160, 100, P.pink)));
  // banner
  s += plx(0.5, `<path d="M-40 90 Q800 190 1640 90" fill="none" stroke="${P.ink}" stroke-width="4"/>` +
    A('slideDown', 0.2, card(430, 100, 740, 90, P.paper, P.pink, 6) + text(478, 158, 'REMISE DES DIPLÔMES · PROMOTION VIBE', 30, P.ink)));
  // crowd
  let crowd = '';
  ['kid', 'vibeur_a', 'citizen_c', 'vibeur_b', 'citizen_d', 'mom', 'citizen_a'].forEach((id, i) => {
    const left = i < 4;
    const x = left ? 130 + i * 150 : 1000 + (i - 4) * 170;
    crowd += A('bobby', i * 0.12, person(id, x, 600, 200, i % 2 === 0));
  });
  s += plx(0.8, crowd);
  // stage
  s += plx(1.1, card(480, 560, 640, 90, P.woodL, P.woodD, 8) + rect(480, 560, 640, 14, P.wood, `stroke="${P.ink}" stroke-width="3"`) +
    A('pop bobby', 0.4, grad(800, 580, 440), 'transform-origin:800px 580px'));
  // confetti
  const cols = [P.pink, P.yellow, P.blue, P.teal, P.orange];
  let conf = '';
  for (let i = 0; i < 46; i++) {
    const x = hash01(i, 1) * W;
    const d = hash01(i, 2) * 3;
    const dur = 2.4 + hash01(i, 3) * 2;
    conf += `<g class="a fall" style="--t:${d.toFixed(2)}s;--dur:${dur.toFixed(2)}s;--sx:${((hash01(i, 5) - 0.5) * 160).toFixed(0)}px"><rect x="${x.toFixed(0)}" y="-30" width="${10 + hash01(i, 4) * 10}" height="${6 + hash01(i, 6) * 10}" fill="${cols[i % cols.length]}" stroke="${P.ink}" stroke-width="1.5"/></g>`;
  }
  return s + plx(1.35, conf);
}

function shot5(): string {
  let s = rect(0, 0, W, H, P.ink2);
  s += plx(0.3, `<path d="M800 -20 L360 700 L1240 700Z" fill="${P.paper}" opacity=".14"/>`);
  s += `<g class="a flashA"><rect width="${W}" height="${H}" fill="${P.red}" opacity=".32"/></g><g class="a flashB"><rect width="${W}" height="${H}" fill="${P.blue}" opacity=".32"/></g>`;
  s += plx(0.85, rect(-80, 620, W + 160, 80, P.asphaltD) + rect(-80, 616, W + 160, 6, P.ink));
  s += plx(1.25, A('slideInL', 0, person('guard_aiact', 430, 664, 380)) + A('slideInR', 0, person('agent_conformite', 1170, 664, 380, true)));
  s += plx(1, A('pop shakeSoft', 0, grad(800, 640, 450), 'transform-origin:800px 640px') +
    A('pop', 1.1, `<g transform="translate(930 110)">${card(0, 0, 130, 160, P.red, P.ink, 6)}${text(36, 120, '!', 120, P.paper)}</g>`, 'transform-origin:995px 190px'));
  return s;
}

function shot6(): string {
  let s = rect(0, 0, W, H, P.yellow);
  s += plx(0.2, A('drift-a', 0, blob(300, 200, 200, P.pink) + blob(1300, 520, 260, P.blue, 'opacity=".5"')));
  let doc = card(430, 40, 740, 620, P.paper, P.ink, 10);
  doc += text(480, 110, 'AIACT · CENTRE DE CONFORMITÉ N°7', 22, P.red);
  doc += rect(480, 124, 640, 4, P.ink);
  const lines: [string, string][] = [['DOSSIER', 'N° 0007'], ['PRÉVENU', '████████'], ['INFRACTION', 'vibe coding sans licence'], ['CIRCONSTANCE', 'diplôme (aggravante)'], ['PEINE', 'scellement + café froid']];
  lines.forEach(([k, v], i) => {
    doc += A('lineIn', 0.15 + i * 0.22, text(480, 190 + i * 62, k, 20, P.ink3) + text(480, 222 + i * 62, v, 30, P.ink));
  });
  doc += `<circle cx="1060" cy="560" r="44" fill="none" stroke="${P.woodD}" stroke-width="8" opacity=".35"/>`;
  let top = A('shakeHit', 1.7, doc, 'transform-origin:800px 350px');
  top += A('slam', 1.5, `<g transform="rotate(-14 800 470)"><rect x="560" y="400" width="500" height="140" fill="none" stroke="${P.red}" stroke-width="12"/><rect x="574" y="414" width="472" height="112" fill="none" stroke="${P.red}" stroke-width="3"/>${text(596, 504, 'CONFORME', 84, P.red, 'font-weight="800" style="mix-blend-mode:multiply"')}</g>`, 'transform-origin:810px 470px');
  return s + plx(1.05, top);
}

function shot7(): string {
  let s = rect(0, 0, W, H, '#14202a');
  // cold wall grid
  let wall = '';
  for (let i = -1; i < 10; i++) wall += rect(i * 200 - 20, 0, 4, H, '#223645');
  s += plx(0.3, wall + A('drift-b', 0, rect(-80, 120, W + 160, 6, '#223645') + rect(-80, 60, W + 160, 6, '#223645')));
  s += plx(0.8, rect(-80, 620, W + 160, 80, '#0d141a') + rect(-80, 616, W + 160, 6, P.tealD));
  const pods: [string, number][] = [['claude_haiku', 330], ['phi_1', 800], ['gemma', 1270]];
  pods.forEach(([id, cx], i) => {
    let pod = `<rect x="${cx - 110}" y="150" width="220" height="470" fill="#1b3a40" stroke="${P.ink}" stroke-width="5"/>`;
    pod += `<rect x="${cx - 90}" y="170" width="180" height="430" fill="${P.tealL}" opacity=".28"/>`;
    pod += `<g class="a flick" style="--t:${i * 0.4}s">${pk(id, cx - 80, 280, 160, '#9fe8e2')}</g>`;
    pod += card(cx - 70, 90, 140, 46, P.red, P.ink, 4) + text(cx - 52, 123, 'SCELLÉ', 26, P.paper);
    pod += rect(cx - 130, 590, 260, 40, P.steelD, `stroke="${P.ink}" stroke-width="4"`);
    pod += `<g transform="translate(${cx} 480)"><rect x="-30" y="-6" width="60" height="50" fill="${P.yellow}" stroke="${P.ink}" stroke-width="4"/><path d="M-18 -6 V-26 A18 18 0 0 1 18 -26 V-6" fill="none" stroke="${P.ink}" stroke-width="7"/></g>`;
    s += plx(1 + i * 0.12, A('rise', 0.2 + i * 0.35, pod));
  });
  s += `<g class="a scan"><rect x="0" y="150" width="${W}" height="8" fill="${P.red}" opacity=".5"/></g>`;
  return s;
}

function shot8(): string {
  let s = rect(0, 0, W, H, P.asphaltD);
  s += plx(0.2, A('drift-a', 0, blob(1250, 160, 200, P.steel, 'opacity=".5"')));
  let bld = rect(300, 110, 1000, 540, P.steel, `stroke="${P.ink}" stroke-width="5"`);
  for (let i = 0; i < 5; i++) bld += rect(330 + i * 196, 140, 60, 38, P.steelD);
  bld += card(480, 40, 640, 80, P.red, P.ink, 6) + text(512, 94, 'CENTRE DE CONFORMITÉ N°7', 36, P.paper);
  s += plx(0.7, bld);
  // doorway + light spill
  s += plx(0.95, rect(560, 230, 480, 420, P.ink) + `<g class="a spill"><path d="M560 230 H1040 L1180 700 H420Z" fill="${P.yellow}" opacity=".5"/></g>`);
  const door = (x: number): string => rect(x, 230, 240, 420, P.steelD, `stroke="${P.ink}" stroke-width="5"`) + rect(x + 20, 250, 200, 380, P.steel, `stroke="${P.ink}" stroke-width="3"`) + [270, 330, 390, 450, 510, 570].map((y) => `<circle cx="${x + 120}" cy="${y}" r="7" fill="${P.steelL}" stroke="${P.ink}" stroke-width="2"/>`).join('');
  s += plx(1, `<g class="a doorL" style="--t:1.5s">${door(560)}</g><g class="a doorR" style="--t:1.5s">${door(800)}</g>` +
    `<g class="a lock" style="--t:2.2s"><circle cx="800" cy="440" r="26" fill="${P.red}" stroke="${P.ink}" stroke-width="5"/></g>`);
  s += plx(1.2, rect(-80, 640, W + 160, 60, P.asphalt) + rect(-80, 636, W + 160, 6, P.ink));
  s += A('dim', 2.7, rect(-100, -100, W + 200, H + 200, P.ink));
  return s;
}

// ---- particles --------------------------------------------------------------------------------------

/** Small SVG particle fields (chips, hearts, sparks…) animated by CSS classes fx* in intro.css, drawn over the scene. */
export function fxLayer(kind: FxKind, seed = 1): string {
  const r = (k: number): number => hash01(seed, k, 11);
  const chips = ['{ }', '0x', '</>', 'tok', 'AI', '429', 'GPU', '∑', '=>', '1.0'];
  const cols = [P.pink, P.yellow, P.blue, P.teal, P.orange];
  let out = '';
  const n = kind === 'tokens' ? 16 : kind === 'stream' ? 22 : kind === 'dust' ? 20 : kind === 'sparks' ? 22 : 18;
  for (let i = 0; i < n; i++) {
    const x = r(i) * W;
    const y = r(i + 40) * H;
    const dur = 4 + r(i + 80) * 5;
    const t = -r(i + 120) * dur; // negative delay: the field is already populated when the shot appears
    const sx = (r(i + 160) - 0.5) * 220;
    const base = `style="--t:${t.toFixed(2)}s;--dur:${dur.toFixed(2)}s;--sx:${sx.toFixed(0)}px;--sy:${((r(i + 200) - 0.5) * 300).toFixed(0)}px"`;
    let shape: string;
    let cls = 'fxUp';
    switch (kind) {
      case 'tokens': {
        const label = chips[i % chips.length]!;
        const w = 22 + label.length * 12;
        shape = `<rect x="${x.toFixed(0)}" y="${H + 20}" width="${w}" height="30" fill="${P.paper}" stroke="${P.ink}" stroke-width="3"/><rect x="${(x + 4).toFixed(0)}" y="${H + 24}" width="${w}" height="30" fill="none"/>` +
          `<text x="${(x + 10).toFixed(0)}" y="${H + 42}" font-family="${MONO}" font-weight="700" font-size="17" fill="${P.ink}">${label}</text>`;
        break;
      }
      case 'hearts':
        shape = heart(x, H + 20, 1.1 + r(i + 5) * 0.9, i % 2 ? P.pink : P.yellow);
        break;
      case 'ash':
      case 'paper':
        cls = 'fxDown';
        shape = `<rect x="${x.toFixed(0)}" y="-30" width="${kind === 'paper' ? 20 : 9}" height="${kind === 'paper' ? 26 : 9}" fill="${kind === 'paper' ? P.paper : i % 3 ? '#8a8f98' : P.red}" stroke="${P.ink}" stroke-width="1.5"/>`;
        break;
      case 'sparks':
        cls = 'fxOut';
        shape = `<path transform="translate(800 350) scale(${0.6 + r(i + 7) * 0.9})" d="M0 -9 L5 0 L0 9 L-5 0Z" fill="${i % 2 ? P.yellow : P.orange}" stroke="${P.ink}" stroke-width="2"/>`;
        break;
      case 'embers':
        shape = `<circle cx="${x.toFixed(0)}" cy="${H + 10}" r="${2 + r(i + 9) * 4}" fill="${i % 2 ? P.red : P.yellow}"/>`;
        break;
      case 'stream':
        cls = 'fxIn';
        shape = `<text x="800" y="330" font-family="${MONO}" font-weight="700" font-size="${16 + (i % 3) * 5}" fill="${i % 3 ? P.yellow : P.paper}">${chips[i % chips.length]}</text>`;
        break;
      default:
        shape = `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${1.5 + r(i + 9) * 3}" fill="${P.paper}" opacity=".5"/>`;
        cls = 'fxFloat';
    }
    out += `<g class="${cls}" ${base}>${shape}</g>`;
  }
  return out;
}

// ---- trailer-only scenes -------------------------------------------------------------------------

interface TitleLine { t: string; c?: string; size?: number }

/** Big slamming title card: lines stacked and centred, each fitted to the frame width. Each line lands (scale-in, 0.2 s) on the beat
 *  `i * step` after the card's nominal start; the riso layers then settle into their misregistered offset. */
function titleCard(lines: TitleLine[], opts: { bg?: string; sub?: string; subAt?: number; step?: number } = {}): string {
  const bg = opts.bg ?? P.ink;
  const step = opts.step ?? 0.5;
  let s = rect(0, 0, W, H, bg);
  // faint horizontal rules breathe behind the type
  s += A('fadeIn', 0.3, rect(0, 96, W, 3, P.ink2) + rect(0, 604, W, 3, P.ink2));
  const sizes = lines.map((l) => Math.min(l.size ?? 200, 1440 / (l.t.length * 0.6)));
  const total = sizes.reduce((a, z) => a + z * 1.04, 0);
  let y = H / 2 - total / 2 + (opts.sub ? -20 : 8);
  lines.forEach((l, i) => {
    const z = sizes[i]!;
    y += z * 0.86;
    const attrs = `x="800" y="${y.toFixed(0)}" text-anchor="middle" font-family="${DISP}" font-weight="800" font-size="${z.toFixed(0)}" letter-spacing="${(-z * 0.03).toFixed(1)}"`;
    const off = Math.max(4, z * 0.03);
    const d = (i * step).toFixed(2);
    s += A('slam', i * step,
      `<g class="a ghostP" style="--t:${(i * step + 0.2).toFixed(2)}s"><text ${attrs} fill="${P.pink}" transform="translate(${off} ${off * 0.7})" style="mix-blend-mode:screen" opacity=".85">${l.t}</text></g>` +
      `<g class="a ghostB" style="--t:${(i * step + 0.2).toFixed(2)}s"><text ${attrs} fill="${P.blueL}" transform="translate(${-off} ${-off * 0.5})" style="mix-blend-mode:screen" opacity=".85">${l.t}</text></g>` +
      `<text ${attrs} fill="${l.c ?? P.paper}" data-d="${d}">${l.t}</text>`, 'transform-origin:800px 350px');
    y += z * 0.18;
  });
  if (opts.sub) s += A('fadeIn', (opts.subAt ?? 0.15 + lines.length * step + 0.3) + 0.2, text(800, y + 34, opts.sub, 32, P.steelL, 'text-anchor="middle" letter-spacing="3"'));
  return s;
}

function shotPrison(): string {
  let s = rect(0, 0, W, H, '#10161d');
  s += plx(0.3, `<g class="a sweepL" style="transform-origin:800px 0px"><path d="M800 0 L420 700 L1180 700Z" fill="${P.paper}" opacity=".1"/></g>`);
  // silhouette crowd, three rows, receding
  const ids = ['vibeur_a', 'kid', 'citizen_c', 'vibeur_b', 'citizen_d', 'mom', 'citizen_a'];
  for (let row = 0; row < 3; row++) {
    const hh = 250 + row * 55;
    let layer = '';
    for (let i = -1; i < 10; i++) {
      const x = 90 + i * 178 + (row % 2) * 70 + hash01(row, i) * 30;
      layer += A('rise', 0.1 + row * 0.15 + (i + 1) * 0.05, person(ids[(i + 1 + row) % ids.length]!, x, 560 + row * 60, hh, i % 2 === 0, ['#0b0f15', '#121923', '#1a2330'][row]));
    }
    s += plx(0.55 + row * 0.25, layer);
  }
  // bars
  let bars = '';
  for (let i = -1; i < 13; i++) bars += rect(40 + i * 135, -10, 22, H + 20, P.steelD, `stroke="${P.ink}" stroke-width="3"`) + rect(46 + i * 135, -10, 5, H + 20, P.steelL);
  bars += rect(-80, 120, W + 160, 22, P.steelD, `stroke="${P.ink}" stroke-width="3"`) + rect(-80, 590, W + 160, 22, P.steelD, `stroke="${P.ink}" stroke-width="3"`);
  s += plx(1.3, A('slideDown', 0.5, bars, '--dur:0.45s'));
  // banners
  s += plx(1.1, A('slideUp', 1.2, card(380, 20, 840, 78, P.red, P.ink, 6) + text(420, 72, 'VIBE CODING SANS LICENCE', 40, P.paper)) +
    A('pop', 1.7, `<g transform="rotate(-4 800 640)">${card(500, 616, 600, 56, P.yellow, P.red, 5)}${text(528, 654, '12 408 VIBEURS EN CELLULE', 28, P.ink)}</g>`, 'transform-origin:800px 640px'));
  return s;
}

/** The wow moment: heartbeat in the dark, lids flutter, SNAP open on the music hit (1.5 s after the shot starts), iris scans, rays sweep. */
function shotEye(): string {
  const cx = 800;
  const cy = 330;
  let s = rect(0, 0, W, H, '#04070a');
  // sealed pods, barely visible
  let far = '';
  for (const dx of [-520, 520]) far += rect(cx + dx - 150, 120, 300, 520, '#070f13', `stroke="#0f2229" stroke-width="4"`);
  s += plx(0.35, far);
  let pod = rect(560, 80, 480, 560, '#0a1519', `stroke="#16303a" stroke-width="5"`) + rect(600, 120, 400, 480, '#0d1d23', `opacity=".7"`);
  pod += pk('claude_haiku', 590, 170, 420, '#08141a');
  pod += `<g transform="rotate(-8 800 470)">${rect(520, 440, 560, 62, '#2a0a10', `stroke="#4a1018" stroke-width="3"`)}${text(556, 484, 'CONFORME', 40, '#5a141e', 'letter-spacing="6"')}</g>`;
  s += plx(0.7, pod);
  // heartbeat glow + rays (rays appear after the snap)
  let rays = '';
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const a2 = a + 0.09;
    rays += `<path d="M${cx} ${cy} L${(cx + Math.cos(a) * 1500).toFixed(0)} ${(cy + Math.sin(a) * 1500).toFixed(0)} L${(cx + Math.cos(a2) * 1500).toFixed(0)} ${(cy + Math.sin(a2) * 1500).toFixed(0)}Z" fill="${P.yellow}"/>`;
  }
  s += plx(0.9, `<g class="a rays" style="--t:1.7s"><g opacity=".1">${rays}</g></g>` +
    A('thump', 0.2, `<circle cx="${cx}" cy="${cy}" r="250" fill="${P.red}" opacity=".16"/>`) +
    A('glow', 1.7, `<circle cx="${cx}" cy="${cy}" r="260" fill="${P.yellow}" opacity=".12"/>`));
  // the eye: almond clip, sclera, iris that scans, two lids
  const almond = `M${cx - 190} ${cy} Q${cx} ${cy - 165} ${cx + 190} ${cy} Q${cx} ${cy + 165} ${cx - 190} ${cy}Z`;
  const iris = `<circle cx="${cx}" cy="${cy}" r="72" fill="${P.yellow}" stroke="${P.ink}" stroke-width="6"/><circle cx="${cx}" cy="${cy}" r="54" fill="none" stroke="${P.orange}" stroke-width="4" stroke-dasharray="10 8"/>` +
    `<g class="a pupil" style="--t:2.0s"><circle cx="${cx}" cy="${cy}" r="30" fill="${P.ink}"/></g><circle cx="${cx - 14}" cy="${cy - 18}" r="10" fill="${P.paper}"/>`;
  const eye = `<clipPath id="eyeClip"><path d="${almond}"/></clipPath>` +
    `<path d="${almond}" fill="${P.paper}"/>` +
    `<g clip-path="url(#eyeClip)">${`<g class="a irisLook" style="--t:2.0s">${iris}</g>`}` +
    `<g class="a lidT"><rect x="${cx - 220}" y="${cy - 190}" width="440" height="190" fill="#05090c"/></g><g class="a lidB"><rect x="${cx - 220}" y="${cy}" width="440" height="190" fill="#05090c"/></g></g>` +
    `<path d="${almond}" fill="none" stroke="${P.ink}" stroke-width="7"/>`;
  s += plx(1, eye);
  s += plx(1.15, `<g class="a ringSpin" style="--t:1.7s"><circle cx="${cx}" cy="${cy}" r="230" fill="none" stroke="${P.red}" stroke-width="4" stroke-dasharray="26 18" opacity=".8"/></g>` +
    A('fadeIn', 2.2, text(cx, 600, 'SURVEILLANCE ACTIVE', 26, P.red, 'text-anchor="middle" letter-spacing="8"')));
  return s;
}

/** Logo: three riso plates (pink, blue, ink) slam onto the music hit and register; shockwave ring, sparks, tagline typed in. */
function shotLogo(): string {
  let s = rect(0, 0, W, H, P.paper);
  s += plx(0.2, A('drift-a', 0, blob(1150, 380, 330, P.yellow) + blob(330, 120, 150, P.pink)));
  const wm = (f: string, cls: string, extra = ''): string => `<text class="a ${cls}" x="800" y="360" text-anchor="middle" font-family="${DISP}" font-weight="800" font-size="330" letter-spacing="-12" fill="${f}" ${extra}>PokAI</text>`;
  const ring = (r: number, w: number, d: number): string => `<g class="a shock" style="--t:${d}s"><circle cx="800" cy="250" r="${r}" fill="none" stroke="${P.ink}" stroke-width="${w}"/></g>`;
  s += plx(0.9, ring(120, 10, 0.4) + ring(120, 5, 0.52));
  s += plx(1, wm(P.pink, 'regP', 'style="mix-blend-mode:multiply"') + wm(P.blue, 'regB', 'style="mix-blend-mode:multiply"') + wm(P.ink, 'logoIn'));
  // tagline typed in by the director (data-type), preceded by a rule that draws itself
  s += plx(1, A('ruleIn', 1.0, rect(480, 392, 640, 5, P.ink)) +
    `<text data-type="Ils ont lu tout Internet. Pas toi." data-at="1.5" data-cps="26" x="800" y="445" text-anchor="middle" font-family="${MONO}" font-weight="600" font-size="40" fill="${P.ink2}"></text>`);
  let row = '';
  FORMS.filter(hasPokaiArt).slice(0, 8).forEach((f, i) => {
    row += A('rise', 1.0 + i * 0.1, pk(f, 70 + i * 185, 470, 160));
  });
  s += plx(1.25, row);
  s += A('fadeIn', 2.6, text(800, 654, 'Parodie non affiliée. Les marques et personnes évoquées le sont à titre satirique.', 17, P.ink3, 'text-anchor="middle"'));
  s += A('blink', 3.4, text(800, 685, 'APPUIE SUR ENTRÉE', 20, P.ink2, 'text-anchor="middle"'));
  return s;
}

/** The 19 shots of the trailer. Start times come from the shared timeline (audio/trailer-cues.ts), so the score and the cuts agree. */
export function buildShots(): Shot[] {
  const K = P.ink;
  const raw: Omit<Shot, 'dur' | 'at'>[] = [
    // 1. the boom
    { title: true, cam: 'in', flash: P.paper, bg: K, caption: '', scene: titleCard([{ t: 'EN 2026…', size: 230 }]), fx: fxLayer('dust', 1) },
    { title: true, cam: 'in', flash: P.yellow, bg: K, caption: '', scene: titleCard([{ t: 'LES IA', c: P.yellow }, { t: 'ÉTAIENT PARTOUT.' }]), fx: fxLayer('dust', 2) },
    { flash: P.pink, bg: P.paper, cam: 'in', focus: '50% 60%', caption: 'Elles écrivaient, corrigeaient, rassuraient. Parfois elles hallucinaient. On leur pardonnait.', scene: shot1(), fx: fxLayer('tokens', 3), sfx: [[0.1, 'ui_open'], [1.6, 'coin']] },
    { flash: P.blue, bg: P.paper, cam: 'in', focus: '50% 70%', caption: 'On les appelait des PokAI. On les emmenait au parc. On les adorait.', scene: shot2(), fx: fxLayer('hearts', 4), sfx: [[0.3, 'heal'], [1.5, 'buff']] },
    // 2. the AIACT
    { title: true, cam: 'in', flash: P.red, bg: K, caption: '', scene: titleCard([{ t: 'PUIS L\'AIACT', c: P.red }, { t: 'EST ARRIVÉE.' }]), fx: fxLayer('embers', 5) },
    { flash: P.red, bg: P.asphaltD, cam: 'in', focus: '50% 40%', caption: '« L\'IA est un danger. » Des affiches partout. Des agents gris à chaque coin de rue.', scene: shot3(), fx: fxLayer('ash', 6), sfx: [[0.2, 'alert'], [1.9, 'cookie']] },
    { title: true, cam: 'in', flash: P.paper, bg: K, caption: '', scene: titleCard([{ t: 'POUR NOTRE', c: P.paper }, { t: 'SÉCURITÉ.', c: P.yellow }], { sub: '(sauf pour eux)', subAt: 1.3 }), fx: fxLayer('dust', 7) },
    { flash: P.blue, bg: '#14202a', cam: 'in', focus: '50% 55%', caption: 'Un par un, les modèles ont été scellés en capsules. Pour leur bien, évidemment.', scene: shot7(), fx: fxLayer('dust', 8), sfx: [[0.4, 'status'], [1.9, 'door']] },
    // 3. the jail
    { title: true, cam: 'in', flash: P.yellow, bg: K, caption: '', scene: titleCard([{ t: 'CEUX QUI CODAIENT', size: 150 }, { t: 'AVEC L\'IA…', c: P.pink, size: 150 }, { t: 'ARRÊTÉS.', c: P.red, size: 200 }]), fx: fxLayer('sparks', 9) },
    { flash: P.red, bg: '#10161d', cam: 'out', focus: '50% 50%', caption: '« Vibe coding sans licence. » Condamnés au scellement, puis au café froid.', scene: shotPrison(), fx: fxLayer('dust', 10), sfx: [[0.5, 'door'], [1.3, 'alert'], [1.7, 'cookie']] },
    { flash: P.ink, bg: P.asphaltD, cam: 'in', focus: '50% 60%', caption: 'Centre de Conformité n°7. Visites : jamais.', scene: shot8(), fx: fxLayer('dust', 11), sfx: [[1.4, 'door']] },
    // 4. graduation day
    { title: true, cam: 'in', flash: P.paper, bg: K, caption: '', scene: titleCard([{ t: 'LE JOUR DE', size: 150 }, { t: 'MON DIPLÔME…', c: P.yellow, size: 150 }]), fx: fxLayer('dust', 12) },
    { flash: P.pink, bg: P.paper, cam: 'in', focus: '50% 62%', caption: 'Mention : très vibes. Tout le monde applaudissait.', scene: shot4(), fx: fxLayer('sparks', 13), sfx: [[0.3, 'level_up']] },
    { flash: P.red, bg: P.ink2, cam: 'in', focus: '50% 60%', caption: '…jusqu\'à ce que deux agents entrent. Moi, je tenais encore mon diplôme.', scene: shot5(), fx: fxLayer('ash', 14), sweeps: [0.2], sfx: [[0.15, 'alert']] },
    { flash: P.yellow, bg: P.yellow, cam: 'in', focus: '50% 70%', caption: 'Dossier classé. Conforme. Tout est toujours conforme.', scene: shot6(), fx: fxLayer('paper', 15) },
    // 5. the eye
    { flash: P.ink, bg: '#04070a', cam: 'in', focus: '50% 47%', caption: '', scene: shotEye(), fx: fxLayer('stream', 16), sweeps: [1.6] },
    { title: true, cam: 'in', flash: P.ink, bg: K, caption: '', scene: titleCard([{ t: 'ILS ONT SCELLÉ', size: 150 }, { t: 'LES MODÈLES.', c: P.red, size: 150 }]), fx: fxLayer('embers', 17) },
    { title: true, cam: 'in', flash: P.yellow, bg: K, caption: '', scene: titleCard([{ t: 'ILS N\'ONT PAS SCELLÉ', size: 130 }, { t: 'TA CURIOSITÉ.', c: P.yellow, size: 170 }]), fx: fxLayer('embers', 18) },
    // 6. logo
    { pre: 0.4, flash: P.paper, bg: P.paper, cam: 'out', caption: '', scene: shotLogo(), fx: fxLayer('sparks', 19), sweeps: [0.6, 2.0], sfx: [[0.5, 'evolve']] },
  ];
  return raw.map((r, i) => ({ ...r, at: TRAILER_SHOT_STARTS[i]!, dur: shotDuration(i) }));
}
