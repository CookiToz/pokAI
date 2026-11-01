// Owned by art-a. character id -> bust SVG (viewBox 0 0 128 128), same flat riso rules as the PokAI.
import type { PortraitSvg } from './types';
import { INK, PAPER, PINK, BLUE, YEL, TEAL, OR, RED, STEEL, VIO, rect, circ, ell, path, nos, dot, ln, txt, render, type Shape } from './pokai-a';

const SKIN = '#f5c6a0';
const BROWN = '#7a4a2b';
const eye = (x: number, y: number): Shape[] => [dot(x, y, 3.4), dot(x - 1, y - 1.2, 1.1, PAPER)];
/** head, neck, shoulders: shared bust construction */
const bust = (cloth: string, hairBack: Shape[] = []): Shape[] => [
  ...hairBack,
  path('M10 128C10 98 36 88 64 88C92 88 118 98 118 128Z', cloth),
  rect(54, 74, 20, 20, SKIN, 5),
  ell(64, 52, 24, 28, SKIN),
  ell(40, 56, 4.5, 7, SKIN), ell(88, 56, 4.5, 7, SKIN),
  nos(ell(52, 38, 7, 3, PAPER)),
];
const face = (mouth = 'M56 66Q64 73 72 66'): Shape[] => [...eye(54, 54), ...eye(74, 54), ln(mouth, 3)];

const player = (): string => render(BLUE, [
  ell(64, 30, 28, 18, INK),
  ...bust(TEAL),
  path('M40 40Q44 24 64 24Q86 24 88 42Q74 36 64 38Q52 36 40 40Z', INK),
  ...face(),
  path('M40 92Q64 120 88 92L82 90Q64 106 46 90Z', INK),
  circ(37, 100, 9, PINK), circ(91, 100, 9, PINK), ln('M38 104Q64 126 90 104', 4, INK),
  ln('M64 104V124', 3, PAPER), nos(path('M30 118h14', PAPER)),
]);

const mom = (): string => render(BLUE, [
  circ(64, 18, 14, OR),
  ...bust(YEL, [ell(64, 44, 29, 32, OR)]),
  path('M40 46Q44 24 64 24Q84 24 88 46Q76 34 64 34Q50 34 40 46Z', OR),
  ...face('M56 66Q64 74 72 66'),
  ell(46, 63, 5, 3, PINK), ell(82, 63, 5, 3, PINK),
  path('M30 128L38 100H90L98 128Z', PAPER), ln('M50 100V90M78 100V90', 3),
  rect(84, 104, 22, 22, TEAL, 4), ln('M106 110q10 2 0 10', 3), ln('M90 98q-3-5 2-8M98 98q-3-5 2-8', 2.5),
]);

const lecube = (): string => render(PINK, [
  ...bust(PAPER, [ell(64, 50, 28, 30, STEEL)]),
  path('M38 46Q40 24 64 24Q88 24 90 46Q80 34 64 36Q48 34 38 46Z', STEEL),
  ...face('M54 68Q64 74 74 66'),
  circ(54, 54, 9, PAPER), circ(76, 54, 9, PAPER), ln('M63 54h4', 3), dot(54, 54, 3.4), dot(76, 54, 3.4),
  path('M46 88L64 104L82 88L82 128H46Z', BLUE), nos(path('M64 104L58 92L70 92Z', PAPER)),
  ln('M30 128L38 104M98 128L90 104', 3), ln('M64 108V128', 2.5, INK),
  rect(88, 108, 14, 12, YEL, 2), ln('M92 112h6M92 116h6', 2),
]);

const kevin = (): string => render(BLUE, [
  ...bust(YEL),
  path('M40 40Q42 20 66 20Q88 20 88 40Q64 32 40 40Z', RED), rect(80, 34, 30, 8, RED, 3),
  rect(40, 48, 22, 13, INK, 4), rect(66, 48, 22, 13, INK, 4), ln('M62 52h4', 3.5),
  nos(path('M43 51h8', PAPER)), nos(path('M69 51h8', PAPER)),
  path('M54 66Q64 78 76 64Z', PAPER), ln('M54 66Q64 78 76 64Z', 3),
  txt(64, 114, 11, 'SHIP IT', INK),
]);

const kartpathy = (): string => render(PINK, [
  ...bust(BLUE),
  path('M39 50Q36 22 64 21Q92 22 89 50Q82 36 64 36Q46 36 39 50Z', BROWN), path('M39 50Q36 36 44 30', BROWN),
  ...face('M56 66Q64 72 72 66'),
  ln('M44 38Q64 30 84 38', 2, BROWN),
  rect(24, 104, 80, 24, STEEL, 4), rect(30, 108, 68, 16, PAPER, 2), circ(64, 116, 4, TEAL),
]);

const nurse = (): string => render(BLUE, [
  path('M10 128C10 98 36 90 64 90C92 90 118 98 118 128Z', PAPER),
  path('M48 90L64 108L80 90Z', TEAL),
  circ(64, 56, 34, YEL),
  nos(path('M42 36Q50 26 62 24', PAPER)),
  path('M34 36Q64 12 94 36L90 28Q64 6 38 28Z', PAPER), rect(56, 12, 16, 16, PAPER, 3),
  path('M62 14h4v5h5v4h-5v5h-4v-5h-5v-4h5Z', RED),
  ellipseEye(52), ellipseEye(76),
  path('M46 62Q64 88 82 62Z', INK), path('M52 70Q64 84 76 70Z', RED),
  ell(40, 66, 6, 4, PINK), ell(88, 66, 6, 4, PINK),
  ell(22, 76, 9, 11, YEL, 'rotate(-20 22 76)'), ell(106, 76, 9, 11, YEL, 'rotate(20 106 76)'),
  ln('M16 72l-3-8M22 68l-1-9M28 70l2-8', 3, INK), ln('M112 72l3-8M106 68l1-9M100 70l-2-8', 3, INK),
]);
function ellipseEye(x: number): Shape { return ell(x, 50, 5, 7, INK); }

const clerk = (): string => render(PINK, [
  ...bust(OR),
  path('M36 42Q38 20 64 20Q90 20 92 42Z', TEAL), rect(30, 40, 68, 8, TEAL, 3), rect(84, 42, 28, 7, TEAL, 3),
  nos(path('M42 34Q48 26 58 25', PAPER)),
  ...face('M54 66Q64 76 74 66'),
  path('M36 100L64 94L92 100L92 128H36Z', PAPER), path('M52 128V100M76 128V100', OR),
  rect(72, 104, 16, 10, YEL, 2), ln('M75 109h10', 2),
]);

const gourou = (): string => render(BLUE, [
  ...bust(VIO),
  path('M40 48Q38 22 66 20Q92 22 88 48Q84 32 66 32Q50 32 40 48Z', INK), path('M66 20Q84 14 92 26Q80 22 70 28Z', INK),
  ...eye(54, 54), ...eye(74, 54),
  path('M50 64Q64 82 78 64Z', PAPER), ln('M50 64Q64 82 78 64Z', 3),
  ln('M40 56Q34 22 66 18Q96 22 88 56', 3, INK), rect(34, 52, 10, 16, INK, 4), ln('M40 66Q46 76 56 74', 2.5, INK), circ(58, 75, 3, INK),
  nos(path('M24 128L38 98M104 128L90 98', PAPER)), nos(path('M30 110L42 100', PAPER)),
  path('M60 92L68 92L72 128H56Z', YEL), txt(64, 122, 7, '997', INK),
  ell(106, 78, 9, 11, SKIN), circ(106, 90, 4.5, YEL),
]);

export const PORTRAITS: Record<string, PortraitSvg> = {
  player: player(), mom: mom(), lecube: lecube(), kevin: kevin(), kartpathy: kartpathy(),
  nurse_hugging: nurse(), clerk: clerk(), gourou: gourou(),
};
void OR; void RED; void STEEL; void VIO;
