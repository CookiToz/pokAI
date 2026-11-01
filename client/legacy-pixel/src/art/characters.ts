// Procedural 16x16 walk sheets (down x2, up x2, left x2, right x2) + 32x32 portraits.
// One parametric person; left/right/walk frames are derived from the same parameters.
import { Grid } from './pixel';
import type { CharacterSheet, PixelSprite } from './types';

type Hair = 'short' | 'long' | 'bald' | 'bun' | 'cap' | 'tuft' | 'curly';
type Glasses = 'round' | 'thin' | 'sun' | 'none';
interface Person {
  id: string;
  skin: string; hair: string; top: string; top2: string; pants: string; acc: string;
  hairStyle: Hair;
  glasses?: Glasses;
  long?: boolean; // coat / dress / robe reaching the legs
  deco?: Array<'headphones' | 'backpack' | 'tie' | 'badge' | 'case' | 'laptop' | 'ring' | 'cross' | 'stripes' | 'hood' | 'bags' | 'mic' | 'stubble' | 'collar'>;
}

const pal = (p: Person): Record<string, string> => ({
  k: '#241c33', s: p.skin, h: p.hair, t: p.top, T: p.top2, p: p.pants, a: p.acc, w: '#fff8e7',
});
const has = (p: Person, d: NonNullable<Person['deco']>[number]): boolean => !!p.deco?.includes(d);

type Dir = 'down' | 'up' | 'left';

function body(p: Person, dir: Dir, step: number): Grid {
  const g = new Grid(16, 16);
  const legs = (): void => {
    if (dir === 'left') {
      if (step === 0) {
        g.rect(5, 12, 3, 3, 'p').rect(8, 12, 3, 2, 'p');
        g.rect(5, 14, 3, 1, 'k').rect(8, 13, 3, 1, 'k');
      } else g.rect(6, 12, 4, 3, 'p');
      return;
    }
    const lh = step === 0 ? 3 : 2;
    const rh = step === 0 ? 2 : 3;
    g.rect(5, 12, 3, lh, 'p').rect(8, 12, 3, rh, 'p');
    g.set(5, 11 + lh, 'k').set(6, 11 + lh, 'k').set(9, 11 + rh, 'k').set(10, 11 + rh, 'k');
  };
  if (!p.long) legs();
  else {
    g.rect(5, 12, 6, 3, 'T');
    g.rect(5, 14, 2, 1, step === 0 ? 'p' : 'k').rect(9, 14, 2, 1, step === 0 ? 'k' : 'p');
  }
  // torso + arms
  if (dir === 'left') {
    g.rect(5, 8, 6, 4, 'T').rect(5, 8, 5, 3, 't');
    g.rect(6, 9, 3, 3, 'T').rect(6, 9, 3, 2, 't').set(7, 11, 's');
    if (has(p, 'backpack')) g.rect(9, 8, 3, 4, 'a');
    if (has(p, 'laptop')) g.rect(4, 9, 2, 3, 'a');
  } else {
    g.rect(5, 8, 6, 4, 't').hline(5, 10, 11, 'T').rect(4, 9, 1, 3, 'T').rect(11, 9, 1, 3, 'T');
    g.set(4, 11, 's').set(11, 11, 's');
    if (dir === 'up' && has(p, 'backpack')) g.rect(5, 8, 6, 4, 'a').hline(5, 10, 11, 'k');
    if (dir === 'down') {
      if (has(p, 'tie')) g.vline(7, 8, 10, 'a').vline(8, 8, 9, 'a');
      if (has(p, 'badge')) g.rect(9, 9, 2, 2, 'w').set(9, 10, 'a');
      if (has(p, 'cross')) g.hline(9, 10, 9, 'a').vline(10, 8, 10, 'a');
      if (has(p, 'headphones')) g.hline(5, 10, 8, 'a');
      if (has(p, 'stripes')) { g.hline(5, 10, 9, 'w'); g.hline(5, 10, 11, 'w'); }
      if (has(p, 'collar')) g.set(6, 8, 'w').set(9, 8, 'w');
      if (has(p, 'case')) g.rect(11, 11, 3, 3, 'a').hline(11, 13, 11, 'k');
      if (has(p, 'mic')) g.set(7, 9, 'a');
    }
    if (dir === 'up' && has(p, 'headphones')) g.hline(5, 10, 8, 'a');
  }
  // head
  g.rect(4, 1, 8, 7, 's');
  const H = p.hairStyle;
  const hairTop = (): void => {
    if (H === 'bald') return;
    g.hline(4, 11, 1, 'h').hline(4, 11, 2, 'h');
    if (H === 'cap') { g.hline(4, 11, 1, 'a').hline(4, 11, 2, 'a'); return; }
    if (H === 'tuft' || H === 'curly') g.set(5, 0, 'h').set(8, 0, 'h').set(10, 0, 'h');
    if (H === 'bun') g.rect(7, 0, 2, 1, 'h');
  };
  if (dir === 'down') {
    hairTop();
    if (H !== 'bald' && H !== 'cap') g.set(4, 3, 'h').set(11, 3, 'h');
    if (H === 'long' || H === 'curly') g.vline(4, 3, 9, 'h').vline(11, 3, 9, 'h');
    if (H === 'cap') g.hline(4, 12, 3, 'a');
    const gl = p.glasses ?? 'none';
    if (gl === 'none') g.set(5, 4, 'k').set(10, 4, 'k').set(5, 5, 'k').set(10, 5, 'k');
    else if (gl === 'sun') g.hline(5, 10, 4, 'k').hline(5, 10, 5, 'k');
    else {
      g.rect(5, 4, 2, 2, 'w').rect(9, 4, 2, 2, 'w').set(5, 5, 'k').set(10, 5, 'k');
      g.hline(7, 8, 4, 'k').hline(5, 10, 3, 'k');
      if (gl === 'thin') g.hline(5, 6, 6, 'k').hline(9, 10, 6, 'k');
    }
    if (has(p, 'bags')) g.hline(5, 6, 6, 'T').hline(9, 10, 6, 'T');
    if (has(p, 'stubble')) g.hline(5, 10, 7, 'T');
    else g.hline(7, 8, 7, 'T');
  } else if (dir === 'up') {
    g.rect(4, 1, 8, 6, H === 'bald' ? 's' : H === 'cap' ? 'a' : 'h');
    if (H !== 'bald') hairTop();
    if (H === 'long' || H === 'curly') g.rect(4, 3, 8, 7, 'h');
    if (has(p, 'hood')) g.rect(4, 8, 8, 1, 't');
    if (has(p, 'headphones')) g.hline(4, 11, 4, 'a');
  } else {
    // left profile: face on x4..7, back of head on the right
    g.rect(4, 1, 8, 7, 's');
    if (H !== 'bald') {
      g.rect(7, 1, 5, 7, H === 'cap' ? 'a' : 'h');
      g.hline(4, 11, 1, H === 'cap' ? 'a' : 'h').hline(5, 11, 2, H === 'cap' ? 'a' : 'h');
      if (H === 'cap') g.hline(3, 5, 3, 'a');
      if (H === 'long' || H === 'curly') g.rect(8, 3, 4, 7, 'h');
      if (H === 'bun') g.rect(10, 0, 2, 2, 'h');
      if (H === 'tuft' || H === 'curly') g.set(6, 0, 'h').set(8, 0, 'h');
    }
    g.set(5, 4, 'k').set(5, 5, 'k');
    if (p.glasses && p.glasses !== 'none') g.set(4, 4, p.glasses === 'sun' ? 'k' : 'w').hline(6, 8, 4, 'k').set(5, 4, 'k');
    if (has(p, 'headphones')) g.rect(7, 4, 2, 3, 'a');
  }
  return g;
}

function frames(p: Person): PixelSprite[] {
  const P = pal(p);
  const make = (dir: Dir, step: number): Grid => body(p, dir, step).outline('k', { diag: false });
  const left0 = make('left', 0);
  const left1 = make('left', 1);
  return [
    make('down', 0), make('down', 1), make('up', 0), make('up', 1),
    left0, left1, left0.flipX(), left1.flipX(),
  ].map((g) => g.sprite(P));
}

function portrait(p: Person): PixelSprite {
  const g = new Grid(32, 32);
  const H = p.hairStyle;
  // shoulders / torso
  g.roundRect(3, 22, 26, 10, 't', 3);
  g.rect(13, 20, 6, 4, 'T').rect(13, 20, 6, 2, 's');
  g.hline(5, 26, 30, 'T');
  g.vline(3, 26, 31, 'T').vline(28, 26, 31, 'T');
  if (has(p, 'collar') || has(p, 'tie')) g.rect(12, 22, 3, 3, 'w').rect(17, 22, 3, 3, 'w').vline(15, 22, 25, 'T');
  if (has(p, 'tie')) g.rect(15, 24, 2, 6, 'a').rect(15, 23, 2, 1, 'k');
  if (has(p, 'headphones')) { g.rect(8, 22, 3, 7, 'a').rect(21, 22, 3, 7, 'a'); g.rect(11, 27, 10, 2, 'a').hline(13, 18, 26, 'k'); }
  if (has(p, 'badge')) g.rect(21, 25, 5, 4, 'w').hline(22, 24, 27, 'a').hline(22, 25, 26, 'k');
  if (has(p, 'cross')) { g.rect(19, 25, 5, 2, 'a'); g.rect(20, 24, 3, 4, 'a'); }
  if (has(p, 'stripes')) { g.hline(4, 27, 25, 'w'); g.hline(4, 27, 28, 'w'); }
  if (has(p, 'laptop')) g.rect(20, 25, 8, 6, 'a').rect(21, 26, 6, 4, 'k').set(23, 27, 'w');
  if (has(p, 'case')) g.rect(21, 27, 8, 5, 'a').rect(24, 26, 2, 1, 'k');
  if (has(p, 'ring')) g.rect(23, 28, 3, 3, 'a');
  if (has(p, 'mic')) g.rect(17, 25, 2, 2, 'a');
  if (has(p, 'hood')) g.rect(8, 21, 16, 3, 'T');
  // back hair
  if (H === 'long' || H === 'curly') g.roundRect(6, 8, 20, 18, 'h', 3);
  // head
  g.roundRect(9, 5, 14, 16, 's', 2);
  g.set(9, 14, 's').set(22, 14, 's'); // ears
  g.rect(8, 12, 1, 4, 's').rect(23, 12, 1, 4, 's');
  g.rect(9, 18, 14, 2, 's');
  // hair
  if (H === 'cap') {
    g.roundRect(8, 3, 16, 7, 'a', 2).rect(8, 9, 18, 2, 'a').hline(8, 25, 10, 'T');
  } else if (H !== 'bald') {
    g.roundRect(8, 3, 16, 7, 'h', 2);
    g.rect(8, 6, 2, 6, 'h').rect(22, 6, 2, 6, 'h');
    if (H === 'long' || H === 'curly') g.rect(8, 8, 2, 12, 'h').rect(22, 8, 2, 12, 'h');
    if (H === 'bun') g.roundRect(13, 0, 6, 4, 'h', 1);
    if (H === 'tuft' || H === 'curly') { g.rect(11, 1, 3, 2, 'h'); g.rect(17, 1, 4, 2, 'h'); g.rect(14, 2, 3, 1, 'h'); }
    // fringe
    g.hline(10, 21, 9, 'h');
    g.set(12, 10, 'h').set(13, 10, 'h').set(19, 10, 'h');
  } else {
    g.hline(11, 14, 6, 'w'); // shine on bare head
  }
  // eyes
  const gl = p.glasses ?? 'none';
  const eyeY = 12;
  if (gl === 'sun') {
    g.rect(10, eyeY - 1, 5, 4, 'k').rect(17, eyeY - 1, 5, 4, 'k').hline(15, 16, eyeY, 'k');
    g.set(11, eyeY, 'T');
  } else {
    g.rect(12, eyeY, 2, 3, 'k').rect(18, eyeY, 2, 3, 'k').set(12, eyeY, 'w').set(18, eyeY, 'w');
    if (gl !== 'none') {
      const fr = (x: number): void => {
        g.hline(x, x + 5, eyeY - 1, 'k').hline(x, x + 5, eyeY + 4, 'k').vline(x, eyeY - 1, eyeY + 4, 'k').vline(x + 5, eyeY - 1, eyeY + 4, 'k');
        if (gl === 'round') { g.set(x, eyeY - 1, 'w').set(x + 5, eyeY - 1, 'w').set(x, eyeY + 4, 'w').set(x + 5, eyeY + 4, 'w'); }
      };
      fr(10);
      fr(17);
      g.hline(16, 16, eyeY + 1, 'k');
    }
  }
  if (has(p, 'bags')) g.hline(11, 14, 16, 'T').hline(17, 20, 16, 'T');
  // brows + smile
  g.hline(12, 14, 10, H === 'bald' ? 'T' : 'h').hline(18, 20, 10, H === 'bald' ? 'T' : 'h');
  g.set(14, 17, 'k').hline(15, 17, 18, 'k').set(18, 17, 'k');
  g.set(9, 16, 'T').set(22, 16, 'T');
  if (has(p, 'stubble')) g.hline(11, 20, 19, 'T').set(11, 18, 'T').set(20, 18, 'T');
  if (H === 'cap') g.hline(10, 21, 10, 'a');
  g.outline('k');
  return g.sprite(pal(p));
}

const SK1 = '#f2c9a0';
const SK2 = '#d9a074';
const SK3 = '#a8714a';
const SK4 = '#7a4a2e';

const PEOPLE: Person[] = [
  { id: 'player', skin: SK1, hair: '#4a2c1a', top: '#3c78b4', top2: '#2d5f96', pants: '#3b2d52', acc: '#e8643c', hairStyle: 'short', deco: ['headphones', 'backpack'] },
  { id: 'mom', skin: SK1, hair: '#a8501f', top: '#d9577a', top2: '#a83a5a', pants: '#a83a5a', acc: '#fff8e7', hairStyle: 'bun', long: true, deco: ['collar'] },
  { id: 'lecube', skin: SK1, hair: '#c9c4d6', top: '#fff8e7', top2: '#b9b3c8', pants: '#5a4a78', acc: '#3c78b4', hairStyle: 'tuft', glasses: 'round', long: true, deco: ['collar'] },
  { id: 'kevin', skin: SK2, hair: '#e8b04a', top: '#e8643c', top2: '#b0431f', pants: '#2d5f96', acc: '#fff8e7', hairStyle: 'short', deco: ['stripes'] },
  { id: 'kartpathy', skin: SK1, hair: '#4a2c1a', top: '#5a4a78', top2: '#3b2d52', pants: '#3b3a4a', acc: '#8f86a8', hairStyle: 'short', deco: ['laptop'] },
  { id: 'nurse_hugging', skin: SK2, hair: '#f2b632', top: '#fff8e7', top2: '#e3b5c0', pants: '#f2b632', acc: '#e8643c', hairStyle: 'cap', long: true, deco: ['cross'] },
  { id: 'clerk', skin: SK2, hair: '#3b2d52', top: '#3fb8a8', top2: '#2a8577', pants: '#3b2d52', acc: '#fff8e7', hairStyle: 'short', deco: ['badge'] },
  { id: 'gourou', skin: SK2, hair: '#14101c', top: '#c9a6ff', top2: '#6a4fb0', pants: '#6a4fb0', acc: '#f2b632', hairStyle: 'short', glasses: 'sun', deco: ['tie', 'mic', 'ring'] },
  { id: 'agent_conformite', skin: SK1, hair: '#566472', top: '#7a8a99', top2: '#566472', pants: '#566472', acc: '#c4503c', hairStyle: 'short', glasses: 'sun', deco: ['tie', 'case'] },
  { id: 'nadelta', skin: SK3, hair: '#7a8a99', top: '#2a4c88', top2: '#14253e', pants: '#14253e', acc: '#fff8e7', hairStyle: 'bald', glasses: 'thin', deco: ['collar'] },
  { id: 'kid', skin: SK1, hair: '#e8b04a', top: '#59c8ff', top2: '#3c78b4', pants: '#e8643c', acc: '#fff8e7', hairStyle: 'curly', deco: ['stripes'] },
  { id: 'scientist', skin: SK3, hair: '#241c33', top: '#fff8e7', top2: '#b9b3c8', pants: '#5a4a78', acc: '#3fb8a8', hairStyle: 'curly', glasses: 'round', long: true, deco: ['collar'] },
  { id: 'sailor', skin: SK2, hair: '#8f86a8', top: '#fff8e7', top2: '#2a4c88', pants: '#2a4c88', acc: '#2a4c88', hairStyle: 'cap', deco: ['stripes', 'stubble'] },
  { id: 'stagiaire', skin: SK4, hair: '#241c33', top: '#8f86a8', top2: '#5a4a78', pants: '#3b2d52', acc: '#f2b632', hairStyle: 'short', deco: ['badge', 'bags'] },
  { id: 'vibeur_a', skin: SK2, hair: '#d9577a', top: '#e8643c', top2: '#b0431f', pants: '#3b2d52', acc: '#3fb8a8', hairStyle: 'long', deco: ['headphones'] },
  { id: 'vibeur_b', skin: SK3, hair: '#241c33', top: '#4a8f45', top2: '#2f6b3f', pants: '#5a4a78', acc: '#f2b632', hairStyle: 'cap', deco: ['backpack'] },
];

export const CHARACTER_SHEETS: CharacterSheet[] = PEOPLE.map((p) => ({ id: p.id, frames: frames(p), portrait: portrait(p) }));
