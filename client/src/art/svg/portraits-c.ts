// Owned by the characters agent (v0.3 cast). character id -> complete SVG bust (viewBox 0 0 128 128), same flat riso rules
// as portraits-a/b (see ./types.ts): ink outline 3, flat fills, one hard offset shadow behind.
import type { PortraitSvg } from './types';
import { INK, INK2, PAPER, PINK, BLUE, YEL, TEAL, RED, STEEL, ORG, ell, circ, rr, P, NS, L, eye } from './pokai-b';

const SHOULDERS = 'M8 128C8 102 34 94 64 94C94 94 120 102 120 128Z';
const HEAD = ell(64, 52, 27, 31);
const LAV = '#a39dc0';
const PURPLE = '#7a4fd6';
const PURPLE_L = '#a384ee';
const WOOD = '#c98f56';
const HAT_SAND = '#f1dfb0';
const WOOD_D = '#9c6a3a';
const GREEN = '#2fbf71';
const GREEN_D = '#1f8f55';

interface BustOpts {
  skin: string;
  hl: string;
  cloth: string;
  /** drawn before everything (bags, back hair, hood) */
  back?: string;
  /** layers drawn after clothes + head (hair, face, accessories) */
  front: string;
  /** extra silhouettes for the offset shadow */
  sil?: string[];
  shadow?: string;
  /** hide the neck (high collars) */
  noNeck?: boolean;
}

function bust(o: BustOpts): string {
  const sh = o.shadow ?? PINK;
  const sil = [SHOULDERS, HEAD, ...(o.sil ?? [])];
  const shadow = sil.map((d) => `<path d="${d}"/>`).join('');
  let b = o.back ?? '';
  if (!o.noNeck) b += P('M51 76H77V100Q64 108 51 100Z', o.skin);
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

// ---- shared face parts (head centre 64,52; eyes y=57)
const eyes = (r = 4): string => eye(53, 57, r) + eye(75, 57, r);
const cheeks = (): string => NS(ell(45, 68, 5, 3), '#ff9ad2') + NS(ell(83, 68, 5, 3), '#ff9ad2');
const BROW = {
  angry: L('M41 46l17 7M87 46l-17 7'),
  flat: L('M43 49h15M70 49h15'),
  raised: L('M43 48q7-7 15-2M70 46q8-5 15 2'),
  worried: L('M42 53l16-7M86 53l-16-7'),
};
const SMILE = L('M54 71Q64 80 74 71');
const FLAT = L('M56 74h16');
const SMIRK = L('M55 74Q66 79 76 70');
const GRIN = P('M50 68Q64 88 78 68Z', '#8a1f2c') + NS('M54 69Q64 74 74 69V72Q64 76 54 72Z', PAPER);
const OPEN = P(ell(64, 75, 5, 6), '#8a1f2c');
const roundGlasses = (c = INK): string =>
  `<circle cx="53" cy="57" r="10.5" fill="#ffffff" fill-opacity=".3" stroke="${c}"/><circle cx="75" cy="57" r="10.5" fill="#ffffff" fill-opacity=".3" stroke="${c}"/>` + L('M63.5 56h1M42.6 55L36 52M85.4 55L92 52');
const thinGlasses = (c = INK2): string =>
  `<rect x="41" y="49" width="22" height="16" rx="4" fill="#ffffff" fill-opacity=".25" stroke="${c}"/><rect x="65" y="49" width="22" height="16" rx="4" fill="#ffffff" fill-opacity=".25" stroke="${c}"/>` + L('M63 56h2M41 53L35 51M87 53L93 51');
const lapels = (c: string): string => P('M48 94L64 118L80 94Z', c);

const GUARD_CAP = '#8c93a3';

/* Guard: grey peaked cap, hi-vis CONFORME vest, radio. */
const guard = bust({
  skin: '#e9b98e', hl: '#f3cfae', cloth: '#4a4660',
  front:
    P('M30 128L36 100L52 94L64 108L76 94L92 100L98 128Z', STEEL) +
    NS('M36 114H52V118H36ZM76 114H92V118H76Z', PAPER) + NS('M38 122H54V125H38ZM74 122H90V125H74Z', PAPER) +
    P(rr(80, 100, 22, 12, 2), RED) + L('M84 106h14') +
    P(rr(25, 96, 10, 22, 2), INK2) + L('M30 96V80') +
    NS('M43 66Q64 76 85 66Q80 84 64 84Q48 84 43 66Z', 'none') +
    eyes(3.6) + BROW.angry + FLAT + NS(ell(46, 68, 4, 2.4), '#ff9ad2') + NS(ell(82, 68, 4, 2.4), '#ff9ad2') +
    P('M30 38Q30 12 64 10Q98 12 98 38Z', GUARD_CAP) + P(rr(30, 34, 68, 10, 3), INK2) + P(circ(64, 39, 5), YEL) + L('M61 39h6') +
    P('M36 44Q64 36 92 44Q98 54 64 52Q30 54 36 44Z', INK) + NS('M40 16Q52 12 66 13Q54 16 44 24Z', '#b3b9c6'),
  sil: ['M30 38Q30 12 64 10Q98 12 98 38Z'],
});

/* Guard 2: tall, hair bun, radio on the shoulder, headset. */
const guard2 = bust({
  skin: '#e3ad82', hl: '#eec19a', cloth: STEEL,
  back: P(circ(64, 14, 13), '#2b2236') + P(rr(51, 26, 26, 8, 3), '#2b2236'),
  front:
    P('M46 94L64 112L82 94Z', '#4a4660') + L('M46 94L36 128M82 94L92 128') +
    P(rr(86, 90, 14, 24, 3), INK2) + L('M93 90V68') + NS('M89 96h8v5h-8Z', TEAL) + NS('M89 104h8v3h-8Z', STEEL) +
    P('M36 52Q32 18 64 16Q96 18 92 52Q86 32 64 33Q42 32 36 52Z', '#2b2236') + NS('M44 24Q54 18 66 19Q54 22 48 30Z', '#4a4660') +
    eyes(3.4) + BROW.flat + FLAT + cheeks() + L('M41 62Q34 70 38 82Q46 84 50 80') + P(ell(51, 82, 5, 4), INK2),
  sil: ['M36 52Q32 18 64 16Q96 18 92 52Z', circ(64, 14, 13)],
});

/* Inspector Cookie: beige trench with popped collar, round glasses, moustache, bag of cookies. */
const COOKIE = '#d8b98a';
const cookie = bust({
  skin: '#f3d3b4', hl: '#f9e4cf', cloth: COOKIE,
  front:
    P('M46 94L64 112L82 94Z', PAPER) + P('M42 90L64 118L50 96Z', '#e8d3aa') + P('M86 90L64 118L78 96Z', '#e8d3aa') +
    L('M64 118V128') + NS(circ(58, 120, 2), INK) + NS(circ(70, 120, 2), INK) +
    P('M32 52Q30 20 64 18Q98 20 96 52Q90 34 64 34Q38 34 32 52Z', '#3a3550') + L('M56 26Q64 22 74 28') +
    eyes(3.4) + BROW.raised + roundGlasses() + FLAT + P('M48 70Q56 64 64 69Q72 64 80 70Q72 76 64 71Q56 76 48 70Z', '#3a3550') +
    P(rr(88, 90, 30, 38, 3), WOOD) + P('M88 92l5-8 5 8 5-8 5 8 5-8 5 8', WOOD) + P(circ(98, 82, 8), WOOD_D) + P(circ(110, 84, 8), WOOD_D) +
    NS(circ(95, 80, 1.8), INK) + NS(circ(101, 84, 1.8), INK) + NS(circ(108, 82, 1.8), INK) + L('M94 104h18M94 112h12'),
  sil: ['M32 52Q30 20 64 18Q98 20 96 52Z', rr(88, 90, 30, 38, 3)],
});

/* Greffiere Article 52: tight bob, pen behind the ear, cardigan, balancing folders. */
const greffiere = bust({
  skin: '#e9b98e', hl: '#f3cfae', cloth: LAV,
  front:
    P('M48 94L64 112L80 94Z', PAPER) + NS(circ(64, 118, 2.2), INK) + L('M64 112V128') +
    P('M26 56Q22 14 64 14Q106 14 102 56L104 86Q96 90 92 80L90 52Q82 34 64 34Q46 34 38 52L36 80Q32 90 24 86Z', '#2b2236') +
    NS('M40 24Q52 16 68 17Q54 22 46 32Z', '#4a4660') +
    eyes(3.4) + BROW.worried + thinGlasses() + FLAT + cheeks() +
    L('M34 38L44 70') +
    P(rr(84, 96, 34, 8, 2), BLUE) + P(rr(86, 88, 32, 8, 2), PAPER) + P(rr(82, 80, 34, 8, 2), PINK) + P(rr(86, 72, 32, 8, 2), YEL) + P(rr(84, 64, 34, 8, 2), TEAL) + P(rr(88, 56, 30, 8, 2), PAPER),
  sil: ['M26 56Q22 14 64 14Q106 14 102 56L104 86Q96 90 92 80L90 52Q82 34 64 34Q46 34 38 52L36 80Q32 90 24 86Z', rr(84, 56, 34, 48, 2)],
});

/* Directrice Moratoire: anthracite blazer, tight grey bun, thin glasses, huge stamp. */
const ANTH = '#4b4a5c';
const directrice = bust({
  skin: '#f3d3b4', hl: '#f9e4cf', cloth: ANTH,
  back: P(circ(64, 12, 11), '#6e6888'),
  front:
    P('M46 94L64 116L82 94Z', PAPER) + P('M46 94L64 118L50 128H32Z', '#5e5c72') + P('M82 94L64 118L78 128H96Z', '#5e5c72') +
    P(rr(20, 92, 12, 14, 2), YEL) +
    P('M34 54Q30 18 64 16Q98 18 94 54Q88 32 64 33Q40 32 34 54Z', '#6e6888') + NS('M42 26Q54 18 70 19Q56 24 48 32Z', '#8a84a8') +
    eyes(3.4) + BROW.angry + thinGlasses() + L('M58 74h12') + P('M57 73Q64 77 71 73Q64 71 57 73Z', RED) +
    P(rr(94, 40, 8, 66, 3), WOOD_D) + P(rr(86, 18, 24, 20, 3), RED) + P(rr(86, 36, 24, 8, 2), PAPER) + NS('M90 22h16v3H90Z', '#f2596a') + P(circ(98, 100, 6), '#f3d3b4'),
  sil: [circ(64, 12, 11), rr(86, 18, 24, 20, 3), rr(94, 40, 8, 66, 3)],
});

/* Jensen Cuir: black leather jacket, salt-and-pepper hair, huge grin, a GPU card. */
const jensen = bust({
  skin: '#e9b98e', hl: '#f3cfae', cloth: '#2c2840',
  front:
    P('M64 96L46 98L50 124Z', '#4a4466') + P('M64 96L82 98L78 124Z', '#3a3552') + L('M64 100V128') +
    NS('M24 108Q34 100 44 104L40 108Q32 106 26 112Z', '#5e5880') + P('M52 90L64 100L76 90L76 96L64 104L52 96Z', INK) +
    P('M36 52Q32 18 66 17Q96 18 92 52Q92 36 80 30Q64 24 46 32Q38 38 36 52Z', '#8f95a6') + L('M54 24Q66 20 80 28') + NS('M46 28Q52 20 66 19Q52 24 50 32Z', '#c7cbd6') + NS('M60 22Q70 20 78 26Q68 24 62 28Z', '#3a3550') +
    eyes(3.6) + BROW.raised + GRIN + cheeks() + L('M40 66Q38 72 40 76M88 66Q90 72 88 76') +
    P(rr(78, 98, 40, 26, 3), '#007a72') + P(circ(92, 111, 8), INK2) + P(circ(108, 111, 8), INK2) + NS(circ(92, 111, 3), PAPER) + NS(circ(108, 111, 3), PAPER) + NS('M80 120h36v3H80Z', YEL),
  sil: ['M36 52Q32 18 66 17Q96 18 92 52Z', rr(78, 98, 40, 26, 3)],
});

/* Clem Delangouste: short beard, brown tousled hair, yellow hoodie with the hugging smiley. */
const clem = bust({
  skin: '#f0c9a2', hl: '#f8dcc0', cloth: YEL,
  back: P(ell(64, 88, 36, 12), '#e0a91a'),
  front:
    P(circ(64, 112, 15), '#ffe680') + NS(ell(58, 108, 2.2, 3), INK) + NS(ell(70, 108, 2.2, 3), INK) + L('M56 116Q64 124 72 116') +
    P(ell(44, 118, 6, 7), '#ffe680') + P(ell(84, 118, 6, 7), '#ffe680') +
    L('M52 94l2 10M76 94l-2 10') +
    P('M36 52Q32 18 64 16Q96 18 92 52Q88 34 64 33Q40 34 36 52Z', '#6b4a38') + NS('M44 26Q54 18 68 19Q54 24 48 32Z', '#9c7458') +
    P('M38 56Q38 90 64 94Q90 90 90 56Q86 74 64 74Q42 74 38 56Z', '#5b3b2a') +
    eyes(3.6) + BROW.raised + P('M54 78Q64 92 74 78Z', '#8a1f2c') + NS('M57 79Q64 83 71 79V81Q64 85 57 81Z', PAPER) + NS(ell(46, 66, 4, 2.4), '#ff9ad2'),
  sil: ['M36 52Q32 18 64 16Q96 18 92 52Z', 'M38 56Q38 90 64 94Q90 90 90 56Z'],
});

/* Resistance dev: red bandana with a knot, open-weights sticker, backpack strap. */
const resistance = bust({
  skin: '#c99a73', hl: '#dcb58f', cloth: GREEN_D,
  back: P('M20 44L8 52L16 58L6 68L26 56Z', RED),
  front:
    L('M52 98l2 10M76 98l-2 10') +
    P(circ(86, 112, 11), YEL) + L('M81 112v-4q0-5 5-5t5 5') + NS('M80 112h12v8H80Z', INK) +
    P('M34 36Q34 14 64 14Q94 14 94 36Q64 28 34 36Z', '#2b2236') +
    P('M32 36Q64 24 96 36L96 48Q64 38 32 48Z', RED) + NS(circ(46, 38, 1.8), PAPER) + NS(circ(64, 33, 1.8), PAPER) + NS(circ(82, 38, 1.8), PAPER) + NS(circ(56, 41, 1.4), PAPER) + NS(circ(74, 41, 1.4), PAPER) +
    eyes(3.6) + BROW.angry + GRIN + cheeks() +
    P(rr(100, 96, 12, 30, 3), ORG),
  sil: ['M34 36Q34 14 64 14Q94 14 94 36Z', 'M20 44L8 52L16 58L6 68L26 56Z'],
});

/* Chef: tall toque, moustache, double-breasted whites, red neckerchief. */
const chef = bust({
  skin: '#e9b98e', hl: '#f3cfae', cloth: PAPER,
  front:
    L('M64 100V128') + NS(circ(50, 108, 2.4), INK) + NS(circ(50, 120, 2.4), INK) + NS(circ(78, 108, 2.4), INK) + NS(circ(78, 120, 2.4), INK) +
    P('M46 92H82L64 110Z', RED) +
    P(circ(92, 104, 5), WOOD) + L('M92 100L100 62') + P(ell(101, 58, 8, 6), STEEL) +
    P(rr(38, 14, 52, 22, 3), PAPER) + P(circ(40, 14, 12), PAPER) + P(circ(64, 8, 15), PAPER) + P(circ(88, 14, 12), PAPER) + P(rr(38, 14, 52, 22, 3), PAPER) + NS(circ(40, 14, 10.6), PAPER) + NS(circ(64, 8, 13.6), PAPER) + NS(circ(88, 14, 10.6), PAPER) + NS('M40 16H88V34H40Z', PAPER) + NS('M44 30H84V33H44Z', '#d6ccb4') +
    eyes(3.6) + BROW.raised + P('M42 68Q54 60 64 68Q74 60 86 68Q76 80 64 72Q52 80 42 68Z', '#4a2f27') + P('M54 78Q64 86 74 78Q64 82 54 78Z', '#8a1f2c') + cheeks(),
  sil: [rr(38, 14, 52, 22, 3), circ(64, 8, 15), circ(40, 14, 12), circ(88, 14, 12)],
});

/* Fashion clerk: tall lilac quiff, pink round glasses, teal conference sweat, measuring tape. */
const fashion = bust({
  skin: '#c99a73', hl: '#dcb58f', cloth: '#45cfc4',
  front:
    P('M36 92Q64 114 92 92L88 88Q64 106 40 88Z', YEL) + L('M50 98v4M58 102v4M66 102v4M74 98v4') +
    NS('M52 108h24v12H52Z', 'none') + P(rr(44, 110, 40, 12, 2), PAPER) + NS('M50 114h28v3H50Z', PINK) +
    P('M34 54Q30 28 44 18Q46 2 68 0Q92 2 96 28Q98 34 94 54Q92 36 80 30Q62 24 46 32Q38 38 34 54Z', PURPLE_L) + NS('M50 8Q60 4 72 6Q58 10 54 18Z', '#d3c0ff') +
    eyes(3.6) + BROW.raised +
    `<circle cx="53" cy="57" r="10.5" fill="#ffffff" fill-opacity=".3" stroke="${PINK}"/><circle cx="75" cy="57" r="10.5" fill="#ffffff" fill-opacity=".3" stroke="${PINK}"/>` + L('M63.5 56h1', ) + SMIRK + cheeks(),
  sil: ['M34 54Q30 28 44 18Q46 2 68 0Q92 2 96 28Q98 34 94 54Z'],
});

/* Barista: dark ponytail, apron, a paper cup held up. */
const barista = bust({
  skin: '#a8714e', hl: '#c08c68', cloth: PAPER,
  back: P('M80 26Q112 28 106 66Q100 86 90 80Q96 62 84 46Z', '#2b2236'),
  front:
    P('M44 94L64 100L84 94L90 128H38Z', WOOD_D) + L('M44 94L52 128M84 94L76 128') + P(rr(54, 110, 20, 12, 2), '#7c5430') +
    P('M34 54Q30 16 64 14Q98 16 94 54Q90 34 64 32Q38 34 34 54Z', '#2b2236') + NS('M44 24Q56 17 70 18Q56 22 50 30Z', '#4a4660') + P(circ(86, 22, 4.4), YEL) +
    eyes(3.6) + BROW.flat + SMILE + cheeks() +
    P(rr(88, 90, 22, 30, 4), PAPER) + NS('M88 100h22v10H88Z', ORG) + P(rr(85, 84, 28, 7, 3), INK2) + L('M94 78q3-5 0-10M104 78q3-5 0-10', ),
  sil: ['M34 54Q30 16 64 14Q98 16 94 54Z', 'M80 26Q112 28 106 66Q100 86 90 80Z', rr(85, 84, 28, 36, 4)],
});

/* Delivery rider: orange helmet with a visor, orange jacket, teal cube bag behind. */
const rider = bust({
  skin: '#e3ad82', hl: '#eec19a', cloth: ORG,
  back: P(rr(70, 66, 52, 56, 6), TEAL) + NS('M74 70H118V76H74Z', '#45cfc4'),
  front:
    P('M44 94L64 112L84 94Z', PAPER) + L('M64 112V128') + NS('M20 112h22v4H20Z', PAPER) + NS('M86 112h22v4H86Z', PAPER) +
    P(rr(100, 96, 14, 14, 2), PINK) + L('M104 103h6') +
    P('M32 48Q28 6 64 6Q100 6 96 48Q90 40 64 40Q38 40 32 48Z', ORG) + NS('M60 7h8v26h-8Z', '#d9501a') +
    P('M38 38Q64 28 90 38L92 52Q64 44 36 52Z', '#5cb8ee') + NS('M44 38Q54 34 62 34Q52 38 48 44Z', PAPER) +
    eyes(3.6) + BROW.flat + SMILE + cheeks() + L('M42 70Q50 84 64 84'),
  sil: ['M32 48Q28 6 64 6Q100 6 96 48Z', rr(70, 66, 52, 56, 6)],
});

/* Tourist: bucket hat, hawaiian shirt, camera round the neck. */
const tourist = bust({
  skin: '#f6cfa6', hl: '#fbe0c2', cloth: TEAL,
  front:
    P('M46 94L64 114L82 94Z', PAPER) + NS(circ(34, 110, 3), PINK) + NS(circ(94, 108, 3), YEL) + NS(circ(30, 122, 3), ORG) + NS(circ(100, 120, 3), PINK) + NS(circ(76, 122, 3), YEL) + NS(circ(48, 120, 3), PINK) + NS(circ(34, 110, 1), PAPER) + NS(circ(94, 108, 1), PAPER) +
    L('M40 92Q64 130 88 92') +
    P(rr(40, 98, 48, 28, 5), INK2) + P(circ(64, 112, 12), STEEL) + P(circ(64, 112, 6), INK) + NS(circ(61, 109, 2), PAPER) + P(rr(76, 94, 10, 6, 2), YEL) +
    P('M38 38Q38 14 64 14Q90 14 90 38Z', HAT_SAND) + P('M12 38Q12 30 64 28Q116 30 116 38Q116 50 64 50Q12 50 12 38Z', HAT_SAND) + P(rr(36, 28, 56, 8, 2), PINK) +
    eyes(3.8) + BROW.raised + GRIN + NS(ell(44, 66, 6, 3.2), '#ff7a7a') + NS(ell(84, 66, 6, 3.2), '#ff7a7a'),
  sil: ['M38 38Q38 14 64 14Q90 14 90 38Z', 'M12 38Q12 30 64 28Q116 30 116 38Q116 50 64 50Q12 50 12 38Z'],
});

/* Dev glued to their phone: head bowed, messy hair, cyan glow on the face. */
const devPhone = bust({
  skin: '#f0c9a2', hl: '#f8dcc0', cloth: '#6e6888',
  back: P(ell(64, 90, 32, 11), '#5a5470'),
  front:
    `<path d="M50 120L38 70L90 70L78 120Z" fill="#bff3ee" fill-opacity=".55" stroke="none"/>` +
    P('M32 54L26 36L38 40L40 22L52 32L58 14L68 30L80 18L84 32L96 26L94 44L98 56Q92 40 64 40Q38 40 32 54Z', '#4a2f27') +
    NS(ell(53, 61, 6, 3.4), INK) + NS(ell(75, 61, 6, 3.4), INK) + L('M46 55q7-5 14 0M68 55q7-5 14 0') + NS(circ(55, 60, 1.4), '#bff3ee') + NS(circ(77, 60, 1.4), '#bff3ee') +
    L('M57 78h14') + NS(ell(46, 70, 4, 2.4), '#ff9ad2') + NS(ell(82, 70, 4, 2.4), '#ff9ad2') +
    P(rr(46, 94, 36, 30, 5), INK2) + NS('M50 98h28v22H50Z', TEAL) + NS('M54 104h20v3H54ZM54 110h14v3H54Z', '#bff3ee') + P(circ(40, 112, 7), '#f0c9a2') + P(circ(88, 112, 7), '#f0c9a2'),
  sil: ['M32 54L26 36L38 40L40 22L52 32L58 14L68 30L80 18L84 32L96 26L94 44L98 56Z', rr(46, 94, 36, 30, 5)],
});

/* Citizen A: elderly gentleman, flat cap, white moustache, green cardigan, cane. */
const citizenA = bust({
  skin: '#e9b98e', hl: '#f3cfae', cloth: '#3f9a62',
  front:
    P('M46 94L64 110L82 94Z', PAPER) + L('M64 110V128') + NS(circ(64, 116, 2.2), INK) + NS(circ(64, 124, 2.2), INK) +
    L('M104 128V88Q104 76 94 78') + L('M104 128V88Q104 76 94 78', ) +
    P('M38 38Q38 10 64 10Q92 10 90 38Q64 30 38 38Z', WOOD_D) + P('M28 38Q64 26 100 38Q104 46 64 46Q24 46 28 38Z', '#7c5430') + NS(circ(64, 11, 2.4), '#7c5430') +
    P('M34 54Q32 40 40 38L44 52Z', PAPER) + P('M94 54Q96 40 88 38L84 52Z', PAPER) +
    eyes(3.2) + BROW.worried + P('M44 70Q54 64 64 70Q74 64 84 70Q76 78 64 72Q52 78 44 70Z', PAPER) + L('M58 80Q64 83 70 80') + NS(ell(46, 64, 5, 3), '#ff9ad2'),
  sil: ['M38 38Q38 10 64 10Q92 10 90 38Z', 'M28 38Q64 26 100 38Q104 46 64 46Q24 46 28 38Z'],
});

/* Citizen B: pigtails with yellow scrunchies, yellow raincoat, big grin. */
const citizenB = bust({
  skin: '#f6cfa6', hl: '#fbe0c2', cloth: YEL,
  back: P('M26 40Q4 52 10 90Q14 104 26 98Q22 76 32 62Z', '#2b2236') + P('M102 40Q124 52 118 90Q114 104 102 98Q106 76 96 62Z', '#2b2236'),
  front:
    P('M34 94L64 112L94 94L94 100L64 120L34 100Z', '#e0a91a') + NS(circ(64, 118, 2.4), INK) + NS(circ(64, 126, 2.4), INK) + L('M64 112V128') +
    P(circ(26, 44, 6), YEL) + P(circ(102, 44, 6), YEL) +
    P('M34 54Q30 16 64 14Q98 16 94 54Q90 36 76 32Q64 40 52 32Q38 36 34 54Z', '#2b2236') + NS('M44 24Q56 17 70 18Q56 22 50 30Z', '#4a4660') +
    eyes(4.6) + BROW.raised + GRIN + NS(ell(44, 68, 6, 3.2), '#ff9ad2') + NS(ell(84, 68, 6, 3.2), '#ff9ad2'),
  sil: ['M26 40Q4 52 10 90Q14 104 26 98Q22 76 32 62Z', 'M102 40Q124 52 118 90Q114 104 102 98Q106 76 96 62Z', 'M34 54Q30 16 64 14Q98 16 94 54Z'],
});

/* Citizen C: huge afro, headphones round the neck, red varsity jacket, skateboard. */
const citizenC = bust({
  skin: '#8a5a3a', hl: '#a8714e', cloth: RED,
  back: P(circ(30, 40, 20), '#2b2236') + P(circ(98, 40, 20), '#2b2236') + P(circ(64, 22, 28), '#2b2236') + P(circ(40, 20, 20), '#2b2236') + P(circ(88, 20, 20), '#2b2236'),
  front:
    P('M46 94L64 110L82 94Z', PAPER) + L('M64 110V128') +
    L('M36 96Q64 128 92 96') + P(rr(30, 94, 12, 22, 5), BLUE) + P(rr(86, 94, 12, 22, 5), BLUE) +
    P('M32 52Q36 28 64 28Q92 28 96 52Q90 40 64 40Q38 40 32 52Z', '#2b2236') +
    eyes(3.6) + BROW.raised + SMILE + NS(ell(44, 68, 5, 3), '#ff7a9a') + NS(ell(84, 68, 5, 3), '#ff7a9a') +
    P(rr(100, 80, 14, 46, 6), ORG) + NS(circ(107, 90, 2.4), PAPER) + NS(circ(107, 116, 2.4), PAPER),
  sil: [circ(30, 40, 20), circ(98, 40, 20), circ(64, 22, 28), circ(40, 20, 20), circ(88, 20, 20), rr(100, 80, 14, 46, 6)],
});

/* Citizen D: curly auburn hair, orange scarf, teal coat, a baguette sticking out of the bag. */
const citizenD = bust({
  skin: '#e3ad82', hl: '#eec19a', cloth: TEAL,
  front:
    P(rr(32, 90, 64, 14, 6), ORG) + P('M70 100L82 128H64Z', ORG) + NS('M70 108h8v3h-8ZM72 116h8v3h-8Z', '#ffb08a') +
    P(circ(34, 40, 11), '#7a3a1a') + P(circ(50, 24, 13), '#7a3a1a') + P(circ(74, 24, 13), '#7a3a1a') + P(circ(94, 40, 11), '#7a3a1a') + P(circ(30, 58, 8), '#7a3a1a') + P(circ(98, 58, 8), '#7a3a1a') +
    P('M38 52Q38 34 64 34Q90 34 90 52Q84 42 64 42Q44 42 38 52Z', '#7a3a1a') +
    eyes(3.6) + BROW.raised + SMILE + cheeks() +
    P(rr(86, 98, 28, 30, 3), WOOD) + L('M92 106h16M92 114h10') +
    `<path d="M96 100L112 62" fill="none" stroke="${INK}" stroke-width="11"/><path d="M96 100L112 62" fill="none" stroke="#e2c97f" stroke-width="6"/>` + L('M101 88l4 2M105 79l4 2', ),
  sil: [circ(34, 40, 11), circ(50, 24, 13), circ(74, 24, 13), circ(94, 40, 11), rr(86, 98, 28, 30, 3), 'M96 100L112 62'],
});

/* Menschtral: tousled brown hair, white open shirt, little orange beret, a wink. */
const menschtral = bust({
  skin: '#f0c9a2', hl: '#f8dcc0', cloth: PAPER,
  front:
    P('M50 94L64 118L78 94Z', '#f0c9a2') + L('M64 118V128') + P('M44 94L56 104L48 108Z', PAPER) + P('M84 94L72 104L80 108Z', PAPER) +
    P('M36 54Q30 22 64 20Q98 22 92 54Q90 38 78 34Q64 40 48 34Q38 38 36 54Z', '#6b4a38') + NS('M46 28Q56 22 70 23Q56 27 50 34Z', '#9c7458') +
    P('M32 28Q30 12 62 10Q92 10 96 26Q84 20 62 20Q42 20 32 28Z', ORG) + NS(circ(78, 10, 3), INK) +
    eye(50, 56, 3.6) + L('M70 56Q78 52 86 56') + BROW.raised + P('M54 76Q66 84 76 74Z', '#8a1f2c') + NS(ell(46, 68, 5, 3), '#ff9ad2') + NS(ell(84, 68, 5, 3), '#ff9ad2'),
  sil: ['M32 28Q30 12 62 10Q92 10 96 26Z', 'M36 54Q30 22 64 20Q98 22 92 54Z'],
});

/* Hassabyte: short dark hair, dark sweater, a chess board under the arm. */
const hassabyte = bust({
  skin: '#e9c4a0', hl: '#f3d6b8',  cloth: '#2f3a52',
  front:
    P('M48 92Q64 104 80 92L80 98Q64 110 48 98Z', '#222a3c') +
    P('M36 52Q32 20 64 18Q96 20 92 52Q90 34 64 32Q40 34 36 52Z', '#2b2236') + NS('M46 26Q56 20 70 21Q56 25 50 32Z', '#4a4660') +
    eyes(3.6) + BROW.flat + SMILE + cheeks() +
    P(rr(80, 92, 40, 36, 3), WOOD_D) + [0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => ((i + j) % 2 ? NS(`M${84 + i * 8} ${96 + j * 8}h8v8h-8Z`, INK2) : NS(`M${84 + i * 8} ${96 + j * 8}h8v8h-8Z`, PAPER))).join('')).join(''),
  sil: ['M36 52Q32 20 64 18Q96 20 92 52Z', rr(80, 92, 40, 36, 3)],
});

/* Zuckerbot: short curly hair, plain grey tee, gold chain, perfectly even smile. */
const zuckerbot = bust({
  skin: '#f3d3b4', hl: '#f8e2cc', cloth: '#9aa0b4',
  front:
    P('M46 94Q64 110 82 94L82 99Q64 116 46 99Z', '#7e849a') +
    L('M44 96Q64 124 84 96') + `<path d="M44 96Q64 124 84 96" fill="none" stroke="#e0a91a" stroke-width="3.4"/>` + P(circ(64, 114, 4), YEL) +
    P(circ(40, 34, 9), '#6b4a38') + P(circ(54, 24, 10), '#6b4a38') + P(circ(72, 24, 10), '#6b4a38') + P(circ(88, 34, 9), '#6b4a38') + P(circ(64, 30, 10), '#6b4a38') +
    P('M38 52Q38 34 64 34Q90 34 90 52Q84 42 64 42Q44 42 38 52Z', '#6b4a38') +
    eyes(3.6) + BROW.flat + L('M54 78H74') + NS(ell(46, 68, 5, 3), '#ffb0a0') + NS(ell(82, 68, 5, 3), '#ffb0a0'),
  sil: [circ(40, 34, 9), circ(54, 24, 10), circ(72, 24, 10), circ(88, 34, 9)],
});

export const PORTRAITS: Record<string, PortraitSvg> = {
  guard_aiact: guard,
  guard_aiact_2: guard2,
  inspector_cookie: cookie,
  greffiere_article52: greffiere,
  directrice_moratoire: directrice,
  jensen_cuir: jensen,
  clem_delangouste: clem,
  menschtral,
  hassabyte,
  zuckerbot,
  resistance_dev: resistance,
  chef,
  fashion_clerk: fashion,
  barista,
  delivery_rider: rider,
  tourist,
  dev_phone: devPhone,
  citizen_a: citizenA,
  citizen_b: citizenB,
  citizen_c: citizenC,
  citizen_d: citizenD,
};
void [GREEN, PURPLE, BLUE, TEAL, INK, STEEL, ORG, RED, YEL, LAV, WOOD_D, GREEN_D, PURPLE_L, WOOD, INK2, PAPER, circ];
