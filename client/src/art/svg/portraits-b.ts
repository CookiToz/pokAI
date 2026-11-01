// Art-B portraits: AIACT agent, Nadelta, kid, scientist, sailor, intern, two vibe coders.
// Busts on a 128 box, flat riso style (see ./types.ts).
import type { PortraitSvg } from './types';
import { INK, INK2, PAPER, PINK, BLUE, YEL, TEAL, RED, STEEL, ORG, ell, circ, rr, P, NS, L, eye } from './pokai-b';

const SHOULDERS = 'M8 128C8 102 34 94 64 94C94 94 120 102 120 128Z';
const HEAD = ell(64, 52, 27, 31);

interface BustOpts {
  skin: string;
  hl: string;
  cloth: string;
  /** layers drawn after clothes/head (hair, face, accessories) */
  back?: string;
  front: string;
  sil?: string[];
  shadow?: string;
}

function bust(o: BustOpts): string {
  const sh = o.shadow ?? PINK;
  const sil = [SHOULDERS, HEAD, ...(o.sil ?? [])];
  const shadow = sil.map((d) => `<path d="${d}"/>`).join('');
  let b = o.back ?? '';
  b += P('M51 76H77V100Q64 108 51 100Z', o.skin);
  b += P(SHOULDERS, o.cloth);
  b += P(ell(37, 56, 5, 8), o.skin) + P(ell(91, 56, 5, 8), o.skin);
  b += P(HEAD, o.skin);
  b += NS('M42 42Q46 28 60 24Q50 34 48 52Q44 52 42 42Z', o.hl);
  b += o.front;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">` +
    `<g transform="translate(4 4)" fill="${sh}" stroke="${sh}" stroke-width="3" stroke-linejoin="round">${shadow}</g>` +
    `<g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${b}</g></svg>`
  );
}

const tx = (x: number, y: number, size: number, fill: string, s: string): string =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="${size}" font-weight="700" fill="${fill}" stroke="none">${s}</text>`;

const SKIN_L = '#f2c6a0';
const SKIN_LH = '#f8dcc0';

/* Agent de Conformite: grey suit, strap, stamp. */
const agent = bust({
  skin: SKIN_L,
  hl: SKIN_LH,
  cloth: STEEL,
  front:
    P('M50 94L64 122L78 94Z', PAPER) +
    P('M61 98h6l3 22-6 6-6-6z', RED) +
    L('M50 94L38 128M78 94L90 128') +
    P('M94 96L40 128H58L102 102Z', INK2) +
    P(rr(80, 108, 32, 14, 2), RED) +
    tx(96, 118, 6, PAPER, 'CONFORME') +
    P('M36 52Q34 22 64 20Q94 22 92 52Q84 36 64 36Q44 36 36 52Z', INK2) +
    L('M46 46l10 2M82 46l-10 2') +
    eye(53, 56, 3.5) +
    eye(75, 56, 3.5) +
    L('M56 74h16') +
    L('M91 60q4 6 0 12'),
  sil: ['M36 52Q34 22 64 20Q94 22 92 52Z'],
});

/* Satya Nadelta: shaved head, thin glasses, shirt + jacket. */
const nadelta = bust({
  skin: '#b9784f',
  hl: '#d09468',
  cloth: INK2,
  front:
    P('M48 94L64 122L80 94Z', PAPER) +
    L('M48 94L38 128M80 94L90 128') +
    P(circ(46, 106, 3), TEAL) +
    L('M44 46q6 -3 12 0M72 46q6 -3 12 0') +
    P(rr(41, 50, 19, 14, 6), 'none') +
    P(rr(68, 50, 19, 14, 6), 'none') +
    L('M60 56h8M41 54l-5 -1M87 54l5 -1') +
    NS(circ(51, 57, 2.6), INK) +
    NS(circ(77, 57, 2.6), INK) +
    P('M52 72Q64 82 76 72Q64 76 52 72Z', PAPER) +
    L('M64 60v6'),
});

/* Kid: red cap, yellow tee, backpack straps. */
const kid = bust({
  skin: SKIN_L,
  hl: SKIN_LH,
  cloth: YEL,
  back: P('M34 60Q28 80 38 84L42 60Z', '#8a5a3a') + P('M94 60Q100 80 90 84L86 60Z', '#8a5a3a'),
  front:
    L('M40 100L36 128M88 100L92 128') +
    P('M38 100h6l-2 28h-6z', INK2) +
    P('M90 100h-6l2 28h6z', INK2) +
    tx(64, 120, 12, INK, 'AI') +
    P('M34 42Q34 14 64 14Q94 14 94 42Z', RED) +
    P('M30 40Q64 34 98 40Q100 46 94 46H34Q28 46 30 40Z', YEL) +
    eye(53, 60, 5) +
    eye(75, 60, 5) +
    NS(circ(46, 68, 1.6), '#a8714e') +
    NS(circ(50, 71, 1.6), '#a8714e') +
    NS(circ(78, 71, 1.6), '#a8714e') +
    NS(circ(82, 68, 1.6), '#a8714e') +
    P('M52 72Q64 90 76 72Z', INK) +
    NS('M58 79Q64 84 70 79Q64 76 58 79Z', PINK),
  sil: ['M34 42Q34 14 64 14Q94 14 94 42Z'],
});

/* Scientist: wild white hair, round glasses, lab coat, goggles. */
const HAIR_W = '#e9e1d0';
const scientist = bust({
  skin: SKIN_L,
  hl: SKIN_LH,
  cloth: PAPER,
  back: P('M32 58C20 40 28 18 46 18L50 6L60 14L70 4L76 16L88 8L90 20C104 24 108 44 96 58Q92 34 64 32Q36 34 32 58Z', HAIR_W),
  front:
    P('M52 94L64 116L76 94Z', TEAL) +
    L('M52 94L44 128M76 94L84 128') +
    P(rr(86, 108, 20, 18, 2), PAPER) +
    L('M92 108v-8M98 108v-8') +
    NS(rr(90.5, 98, 3, 6, 1), PINK) +
    NS(rr(96.5, 98, 3, 6, 1), BLUE) +
    `<path d="M38 38Q64 28 90 38" fill="none" stroke="${INK2}" stroke-width="6"/>` +
    P(circ(50, 34, 8), YEL) +
    P(circ(78, 34, 8), YEL) +
    L('M44 56L38 54M84 56l6 -2') +
    P(circ(52, 57, 9), 'none') +
    P(circ(76, 57, 9), 'none') +
    L('M61 57h6') +
    NS(circ(52, 57, 3), INK) +
    NS(circ(76, 57, 3), INK) +
    P('M48 70Q56 66 64 70Q72 66 80 70Q76 78 64 74Q52 78 48 70Z', HAIR_W) +
    L('M58 80q6 3 12 0'),
  sil: ['M32 58C20 40 28 18 46 18L50 6L60 14L70 4L76 16L88 8L90 20C104 24 108 44 96 58Z'],
});

/* Sailor: white cap, ginger beard, striped top. */
const BEARD = '#d9702a';
const sailor = bust({
  skin: '#d9a27a',
  hl: '#e8bc98',
  cloth: PAPER,
  front:
    L('M14 108h100M10 118h108') +
    `<path d="M14 108h100M10 118h108" fill="none" stroke="${BLUE}" stroke-width="5"/>` +
    P('M44 94L64 112L84 94L90 102L64 124L38 102Z', BLUE) +
    P('M58 110h12l2 10h-16z', RED) +
    P('M38 62Q40 92 64 96Q88 92 90 62Q80 80 64 80Q48 80 38 62Z', BEARD) +
    P('M50 72Q64 66 78 72Q64 80 50 72Z', BEARD) +
    L('M44 48l12 3M84 48l-12 3') +
    L('M48 58q5 -4 10 0M70 58q5 -4 10 0') +
    NS(circ(53, 58, 2.2), INK) +
    NS(circ(75, 58, 2.2), INK) +
    P('M36 38Q36 10 64 10Q92 10 92 38Z', PAPER) +
    P(rr(32, 34, 64, 10, 4), BLUE) +
    NS(circ(64, 39, 2.4), YEL),
  sil: ['M36 38Q36 10 64 10Q92 10 92 38Z', 'M38 62Q40 92 64 96Q88 92 90 62Z'],
});

/* Intern: tired eyes, messy hair, lanyard badge. */
const stagiaire = bust({
  skin: '#e8b890',
  hl: '#f2cdaa',
  cloth: TEAL,
  front:
    L('M52 98L58 112M76 98L70 112') +
    P(rr(48, 108, 32, 17, 2), PAPER) +
    tx(64, 119, 5.2, INK, 'STAGIAIRE') +
    NS(rr(50, 110, 28, 3, 1), RED) +
    P('M36 52Q32 22 56 18L62 8L68 18Q94 20 92 52Q88 36 76 34Q70 40 64 34Q44 34 36 52Z', INK2) +
    L('M44 48l12 2M84 48l-12 2') +
    L('M47 57h12M69 57h12') +
    NS('M49 57a4 4 0 0 0 8 0z', INK) +
    NS('M71 57a4 4 0 0 0 8 0z', INK) +
    L('M48 65q5 4 10 0M70 65q5 4 10 0') +
    L('M54 76q5 -3 10 0t10 0'),
  sil: ['M36 52Q32 22 56 18L62 8L68 18Q94 20 92 52Z'],
});

/* Vibeur A: teal spikes, pink hoodie, headphones. */
const vibeurA = bust({
  skin: '#d9a27a',
  hl: '#e8bc98',
  cloth: PINK,
  front:
    P('M46 96Q64 112 82 96L86 106Q64 124 42 106Z', '#ff8cc8') +
    `<path d="M40 100Q64 130 88 100" fill="none" stroke="${INK2}" stroke-width="5"/>` +
    P(rr(32, 102, 12, 18, 4), YEL) +
    P(rr(84, 102, 12, 18, 4), YEL) +
    tx(64, 124, 11, PAPER, '&lt;/&gt;') +
    P('M36 52Q30 30 40 24L36 8L50 16L56 2L64 14L74 2L78 16L92 8L88 24Q98 30 92 52Q86 34 64 32Q42 34 36 52Z', TEAL) +
    eye(53, 56, 4) +
    eye(75, 56, 4) +
    L('M46 49l12 -2M82 49l-12 -2') +
    P('M50 70Q64 84 80 68Q66 72 50 70Z', PAPER) +
    L('M80 68l3 -3'),
  sil: ['M36 52Q30 30 40 24L36 8L50 16L56 2L64 14L74 2L78 16L92 8L88 24Q98 30 92 52Z'],
  shadow: BLUE,
});

/* Vibeur B: dark bob + bun, big round glasses, yellow cardigan. */
const vibeurB = bust({
  skin: '#a8714e',
  hl: '#c08560',
  cloth: YEL,
  back: P('M30 60C24 30 40 18 64 18C88 18 104 30 98 60L98 86L88 84L88 50L40 50L40 84L30 86Z', INK2),
  front:
    P('M50 94L64 112L78 94Z', PAPER) +
    tx(64, 110, 9, INK, '{ }') +
    L('M50 94L42 128M78 94L86 128') +
    NS(circ(46, 114, 2), ORG) +
    P('M36 54Q38 24 64 22Q90 24 92 54Q80 36 64 36Q48 36 36 54Z', INK2) +
    P(circ(64, 14, 9), INK2) +
    P(circ(52, 58, 10), 'none') +
    P(circ(76, 58, 10), 'none') +
    `<path d="M42 58h0M86 58h0M62 58h4" fill="none" stroke="${BLUE}" stroke-width="4"/>` +
    `<circle cx="52" cy="58" r="10" fill="none" stroke="${BLUE}" stroke-width="4"/><circle cx="76" cy="58" r="10" fill="none" stroke="${BLUE}" stroke-width="4"/>` +
    NS(circ(52, 58, 3), INK) +
    NS(circ(76, 58, 3), INK) +
    L('M56 74q8 6 16 0') +
    NS(circ(44, 70, 3), PINK) +
    NS(circ(84, 70, 3), PINK),
  sil: ['M30 60C24 30 40 18 64 18C88 18 104 30 98 60L98 86L30 86Z', circ(64, 14, 9)],
  shadow: PINK,
});

export const PORTRAITS: Record<string, PortraitSvg> = {
  agent_conformite: agent,
  nadelta,
  kid,
  scientist,
  sailor,
  stagiaire,
  vibeur_a: vibeurA,
  vibeur_b: vibeurB,
};

void eye;
