// 16x16 tiles, one per TILE_NAMES entry (same order). Shared palette; each tile uses <= 8 colours.
import { TILE_NAMES, type TileName } from '../data/tiles';
import { Grid } from './pixel';
import type { PixelSprite } from './types';

const PAL: Record<string, string> = {
  k: '#241c33', g: '#5fa84f', G: '#4a8f45', h: '#86c46a', l: '#2f6b3f',
  p: '#d8b88a', P: '#b8946a', s: '#ecd9a0', S: '#d4bd7c',
  w: '#3c78b4', W: '#2d5f96', v: '#7fc4e8', n: '#7a4a2a', N: '#5a3320', d: '#a8723f',
  r: '#c4503c', R: '#8f3328', b: '#3c6ab4', B: '#2a4c88', e: '#8f86a8', E: '#5a4a78', f: '#c9c4d6',
  y: '#f2b632', Y: '#c48a1a', c: '#fff8e7', C: '#f2ead8', o: '#e8643c', m: '#d9577a',
  u: '#6a4fb0', U: '#4b3688', t: '#3fb8a8', T: '#2a8577', a: '#7a8a99', A: '#566472', z: '#14101c',
  x: '#4fd16a', j: '#ff6ad5', q: '#59c8ff',
};

const mk = (fill: string, fn?: (g: Grid) => void): Grid => {
  const g = new Grid(16, 16, fill);
  fn?.(g);
  return g;
};
const dots = (g: Grid, c: string, pts: Array<[number, number]>): void => pts.forEach(([x, y]) => g.set(x, y, c));

const grass = (): Grid => mk('g', (g) => dots(g, 'G', [[2, 3], [3, 3], [9, 1], [12, 6], [13, 6], [5, 10], [6, 10], [1, 14], [10, 13], [11, 13], [14, 11]]));
const grassAlt = (): Grid => mk('g', (g) => {
  dots(g, 'G', [[7, 2], [12, 4], [3, 7], [4, 7], [10, 10], [1, 12], [14, 14]]);
  dots(g, 'h', [[2, 2], [3, 2], [9, 8], [13, 12], [6, 13]]);
});
const path = (): Grid => mk('p', (g) => dots(g, 'P', [[3, 2], [11, 4], [12, 4], [6, 8], [1, 11], [2, 11], [13, 13], [8, 14]]));
const sand = (): Grid => mk('s', (g) => dots(g, 'S', [[4, 3], [5, 3], [12, 6], [8, 10], [2, 13], [3, 13], [14, 12]]));
const water = (): Grid => mk('w', (g) => {
  for (const [x, y] of [[2, 3], [9, 2], [5, 9], [12, 10], [1, 14]] as const) g.hline(x, x + 2, y, 'v');
  dots(g, 'W', [[7, 6], [8, 6], [13, 14], [14, 14]]);
});
const waterEdge = (): Grid => mk('w', (g) => {
  g.rect(0, 0, 16, 3, 's').rect(0, 3, 16, 1, 'S');
  for (let x = 0; x < 16; x += 4) g.hline(x, x + 1, 4, 'v');
  g.hline(2, 4, 9, 'v').hline(10, 12, 12, 'v');
  dots(g, 'W', [[6, 7], [7, 7]]);
});
const cable = (): Grid => mk('g', (g) => {
  // tuft of tangled coloured cables: each strand a loop of its own colour
  const strands: Array<[string, number[]]> = [
    ['r', [3, 15, 2, 12, 3, 9, 5, 7]], ['y', [7, 15, 8, 11, 6, 8, 7, 4]], ['q', [11, 15, 12, 11, 10, 8, 12, 5]],
    ['j', [5, 15, 4, 11, 7, 10, 9, 8]], ['x', [13, 15, 14, 11, 13, 8, 14, 6]], ['r', [9, 15, 10, 12, 9, 9, 10, 6]],
  ];
  for (const [c, p] of strands) for (let i = 0; i + 3 < p.length; i += 2) g.line(p[i]!, p[i + 1]!, p[i + 2]!, p[i + 3]!, c);
  g.hline(0, 15, 15, 'l');
  dots(g, 'k', [[5, 7], [7, 4], [12, 5], [14, 6], [10, 6], [3, 9]]); // plug heads
});
const tree = (): Grid => mk('g', (g) => {
  g.rect(6, 10, 4, 6, 'n').vline(6, 10, 15, 'd').vline(9, 10, 15, 'N');
  g.ellipse(7.5, 6, 6, 5, 'l').ellipse(7, 5.5, 5, 4, 'G');
  g.ellipse(5.5, 4, 2, 1.5, 'h');
  dots(g, 'l', [[10, 8], [11, 7], [4, 9]]);
  g.hline(5, 10, 14, 'l');
});
const bush = (): Grid => mk('g', (g) => {
  g.ellipse(7.5, 10, 6, 4, 'l').ellipse(7, 9, 5, 3, 'G');
  dots(g, 'h', [[4, 8], [5, 8], [6, 7], [9, 8]]);
  dots(g, 'r', [[5, 10], [10, 9], [8, 11]]);
});
const rock = (): Grid => mk('g', (g) => {
  g.roundRect(2, 6, 12, 8, 'e', 2).roundRect(3, 5, 8, 5, 'f', 2);
  g.hline(3, 13, 13, 'E').hline(10, 13, 11, 'E').vline(13, 8, 12, 'E');
  dots(g, 'E', [[7, 9], [8, 10]]);
  g.hline(4, 6, 6, 'c');
});
const flowers = (): Grid => mk('g', (g) => {
  dots(g, 'G', [[2, 3], [12, 12], [8, 9]]);
  for (const [x, y, c] of [[3, 3, 'm'], [10, 4, 'y'], [6, 9, 'c'], [12, 11, 'm'], [2, 13, 'y']] as const) {
    g.set(x, y, c).set(x - 1, y, c).set(x + 1, y, c).set(x, y - 1, c).set(x, y + 1, c).set(x, y, 'y' === c ? 'o' : 'y');
  }
});
const fence = (): Grid => mk('g', (g) => {
  g.rect(1, 4, 3, 11, 'd').rect(12, 4, 3, 11, 'd').rect(6, 4, 4, 11, 'd');
  g.vline(3, 4, 14, 'N').vline(14, 4, 14, 'N').vline(9, 4, 14, 'N');
  g.rect(0, 6, 16, 2, 'p').rect(0, 11, 16, 2, 'p').hline(0, 15, 7, 'P').hline(0, 15, 12, 'P');
  g.hline(1, 3, 3, 'd').hline(6, 9, 3, 'd').hline(12, 14, 3, 'd');
});
const sign = (): Grid => mk('g', (g) => {
  g.rect(7, 10, 2, 6, 'N');
  g.rect(2, 2, 12, 8, 'd').rect(3, 3, 10, 6, 'p');
  g.hline(2, 13, 9, 'n').hline(4, 11, 5, 'N').hline(4, 9, 7, 'N');
});
const ledge = (): Grid => mk('g', (g) => {
  g.rect(0, 9, 16, 7, 'P').rect(0, 7, 16, 3, 'h').hline(0, 15, 9, 'G').hline(0, 15, 10, 'p');
  for (let x = 1; x < 16; x += 4) g.set(x, 12, 'd').set(x + 1, 13, 'd');
  g.hline(0, 15, 15, 'd');
});
const floorWood = (): Grid => mk('d', (g) => {
  for (let y = 3; y < 16; y += 4) g.hline(0, 15, y, 'n');
  dots(g, 'n', [[4, 0], [4, 1], [4, 2], [11, 4], [11, 5], [11, 6], [11, 7], [3, 8], [3, 9], [3, 10], [3, 11], [12, 12], [12, 13], [12, 14], [12, 15]]);
  dots(g, 'p', [[7, 1], [1, 6], [8, 10], [14, 13]]);
});
const floorLab = (): Grid => mk('f', (g) => {
  g.hline(0, 15, 15, 'e').vline(15, 0, 15, 'e').hline(0, 15, 7, 'C').vline(7, 0, 15, 'C');
  g.hline(1, 3, 1, 'c').vline(1, 1, 3, 'c').hline(9, 11, 9, 'c').vline(9, 9, 11, 'c');
  g.hline(0, 15, 0, 'C').vline(0, 0, 15, 'C');
});
const floorTile = (): Grid => mk('C', (g) => {
  g.hline(0, 15, 0, 'e').vline(0, 0, 15, 'e').hline(0, 15, 8, 'e').vline(8, 0, 15, 'e');
  g.rect(1, 1, 2, 1, 'c').rect(9, 1, 2, 1, 'c').rect(1, 9, 2, 1, 'c').rect(9, 9, 2, 1, 'c');
});
const wall = (): Grid => mk('E', (g) => {
  g.rect(0, 0, 16, 2, 'e').hline(0, 15, 2, 'U');
  g.hline(0, 15, 8, 'k');
  g.vline(4, 3, 7, 'k').vline(12, 3, 7, 'k').vline(8, 9, 15, 'k');
  g.hline(0, 15, 15, 'k');
  dots(g, 'e', [[1, 4], [9, 4], [5, 10], [13, 10]]);
});
const wallWindow = (): Grid => {
  const g = wall();
  g.rect(3, 3, 10, 9, 'k').rect(4, 4, 8, 7, 'v').rect(4, 4, 3, 2, 'c').vline(8, 4, 10, 'k').hline(4, 11, 7, 'k');
  g.hline(2, 13, 12, 'e');
  return g;
};
const carpet = (): Grid => mk('r', (g) => {
  g.hline(0, 15, 0, 'y').hline(0, 15, 15, 'y').hline(0, 15, 2, 'R').hline(0, 15, 13, 'R');
  for (let x = 2; x < 16; x += 4) g.set(x, 7, 'y').set(x, 8, 'y').set(x + 1, 7, 'R').set(x + 1, 8, 'R');
});
// ---- buildings
const wallBrick = (main: string, dark: string, trim: string): Grid =>
  mk(main, (g) => {
    for (let y = 3; y < 16; y += 4) g.hline(0, 15, y, dark);
    for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 2 : 6; x < 16; x += 8) g.vline(x, y, Math.min(15, y + 2), dark);
    g.rect(0, 14, 16, 2, trim);
  });
const houseWall = (): Grid => wallBrick('C', 'P', 'e');
const windowOn = (g: Grid, frame: string, x = 3): Grid => {
  g.rect(x, 3, 10, 9, frame).rect(x + 1, 4, 8, 7, 'v').rect(x + 1, 4, 3, 2, 'c');
  g.vline(x + 5, 4, 10, frame).hline(x + 1, x + 8, 7, frame).hline(x - 1, x + 10, 12, frame);
  return g;
};
const houseWindow = (): Grid => windowOn(houseWall(), 'n');
const doorOn = (g: Grid, door: string, dark: string, knob: string, frame: string): Grid => {
  g.rect(2, 1, 12, 15, frame).rect(3, 2, 10, 14, door);
  g.vline(8, 2, 15, dark).rect(3, 2, 10, 1, dark);
  g.rect(3, 4, 4, 5, dark).rect(9, 4, 4, 5, dark).rect(4, 5, 2, 3, door).rect(10, 5, 2, 3, door);
  g.set(7, 10, knob).set(9, 10, knob);
  g.hline(1, 14, 15, 'k');
  return g;
};
const houseDoor = (): Grid => doorOn(houseWall(), 'n', 'N', 'y', 'e');
const roof = (main: string, dark: string, light: string, trim: string): Grid =>
  mk(main, (g) => {
    for (let y = 0; y < 16; y += 4) {
      g.hline(0, 15, y + 3, dark);
      for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) g.vline(x, y, y + 2, dark);
      g.hline(0, 15, y, light);
    }
    g.hline(0, 15, 15, trim);
  });
const roofRed = (): Grid => roof('r', 'R', 'o', 'k');
const roofBlue = (): Grid => roof('b', 'B', 'q', 'k');
const roofGrey = (): Grid => roof('a', 'A', 'f', 'k');
// Hub (Hugging Face): sunny yellow with a smiley sign
const hubWall = (): Grid => {
  const g = wallBrick('y', 'Y', 'Y');
  g.rect(4, 2, 8, 8, 'k').rect(5, 3, 6, 6, 'c');
  g.set(6, 5, 'k').set(9, 5, 'k').hline(6, 9, 7, 'k').set(5, 6, 'y').set(10, 6, 'y');
  g.set(6, 8, 'o').set(9, 8, 'o');
  return g;
};
const hubDoor = (): Grid => doorOn(wallBrick('y', 'Y', 'Y'), 'c', 'Y', 'k', 'k');
const hubRoof = (): Grid => roof('o', 'R', 'y', 'k');
// Store: teal with striped awning
const storeWall = (): Grid => {
  const g = wallBrick('t', 'T', 'T');
  for (let x = 0; x < 16; x += 4) g.rect(x, 0, 2, 4, 'c').rect(x + 2, 0, 2, 4, 'T');
  g.hline(0, 15, 4, 'k');
  g.rect(3, 6, 10, 6, 'k').rect(4, 7, 8, 4, 'v').rect(4, 7, 3, 1, 'c');
  g.set(6, 9, 'y').set(9, 9, 'm');
  return g;
};
const storeDoor = (): Grid => {
  const g = wallBrick('t', 'T', 'T');
  for (let x = 0; x < 16; x += 4) g.rect(x, 0, 2, 3, 'c');
  doorOn(g, 'v', 'W', 'y', 'k');
  g.rect(3, 1, 10, 1, 'c');
  return g;
};
const storeRoof = (): Grid => roof('T', 'k', 't', 'k');
// Bench (arena): purple stone with columns and a podium emblem
const benchWall = (): Grid => {
  const g = mk('u', (b) => {
    b.hline(0, 15, 7, 'U').hline(0, 15, 15, 'U');
    b.vline(5, 0, 6, 'U').vline(11, 8, 14, 'U');
  });
  g.rect(0, 0, 3, 16, 'f').rect(13, 0, 3, 16, 'f').vline(2, 0, 15, 'e').vline(15, 0, 15, 'e');
  g.rect(5, 9, 6, 4, 'y').rect(6, 8, 4, 1, 'y').set(7, 10, 'Y').set(8, 10, 'Y').hline(5, 10, 13, 'Y').hline(6, 9, 14, 'Y');
  return g;
};
const benchDoor = (): Grid => {
  const g = doorOn(benchWall(), 'U', 'k', 'y', 'f');
  g.rect(0, 0, 3, 16, 'f').rect(13, 0, 3, 16, 'f').vline(2, 0, 15, 'e').vline(15, 0, 15, 'e');
  g.hline(3, 12, 1, 'y');
  return g;
};
const benchRoof = (): Grid => roof('U', 'k', 'u', 'y');
// ---- interior furniture (on wood floor)
const onWood = (fn: (g: Grid) => void): Grid => {
  const g = floorWood();
  fn(g);
  return g;
};
const counter = (): Grid => onWood((g) => {
  g.rect(0, 3, 16, 10, 'n').rect(0, 3, 16, 3, 'p').hline(0, 15, 6, 'P').hline(0, 15, 13, 'N');
  g.rect(1, 8, 6, 4, 'd').rect(9, 8, 6, 4, 'd').set(6, 10, 'y').set(9, 10, 'y');
  g.rect(11, 1, 3, 2, 'c').hline(11, 13, 2, 'e');
});
const table = (): Grid => onWood((g) => {
  g.rect(1, 3, 14, 7, 'p').rect(1, 3, 14, 1, 'c').hline(1, 14, 10, 'P').rect(2, 11, 2, 4, 'N').rect(12, 11, 2, 4, 'N');
  g.rect(3, 5, 4, 3, 'c').rect(10, 5, 3, 2, 'r');
});
const shelf = (): Grid => onWood((g) => {
  g.rect(0, 0, 16, 16, 'n').rect(1, 1, 14, 14, 'N');
  for (const y of [1, 6, 11]) {
    g.rect(1, y + 3, 14, 1, 'd');
    let x = 2;
    for (const [w, c] of [[2, 'r'], [3, 'b'], [2, 'y'], [2, 'g'], [3, 'm'], [2, 'c']] as const) {
      const bh = 3 + ((x + y) % 2);
      g.rect(x, y + 3 - bh + 0, w, bh, c);
      x += w + (y === 6 ? 0 : 0);
      if (x > 13) break;
    }
  }
});
const pc = (): Grid => onWood((g) => {
  g.rect(2, 1, 12, 9, 'f').rect(3, 2, 10, 6, 'k').rect(4, 3, 8, 4, 'z').hline(4, 9, 4, 'x').hline(4, 7, 5, 'x').set(10, 6, 'x');
  g.rect(6, 10, 4, 2, 'e').rect(3, 12, 10, 2, 'f').hline(4, 11, 13, 'e').hline(2, 13, 14, 'e');
});
const serverRack = (): Grid => {
  const g = mk('A', (b) => b.rect(0, 0, 16, 16, 'k').rect(1, 1, 14, 14, 'A'));
  for (const y of [2, 6, 10]) {
    g.rect(2, y, 12, 3, 'z').hline(3, 7, y + 1, 'E').set(11, y + 1, 'x').set(13, y + 1, 'o').hline(9, 10, y + 1, 'a');
  }
  g.rect(2, 13, 12, 1, 'a');
  return g;
};
const bed = (): Grid => onWood((g) => {
  g.rect(2, 0, 12, 16, 'n').rect(3, 1, 10, 4, 'c').rect(3, 5, 10, 10, 'b').rect(3, 5, 10, 2, 'q').hline(3, 12, 6, 'B').hline(3, 12, 14, 'B');
  g.rect(5, 2, 6, 2, 'C');
});
const plant = (): Grid => onWood((g) => {
  g.rect(4, 10, 8, 6, 'r').rect(3, 10, 10, 2, 'r').hline(4, 11, 15, 'k');
  g.line(8, 10, 4, 4, 'l').line(8, 10, 8, 1, 'l').line(8, 10, 12, 4, 'l');
  g.ellipse(4, 4, 2, 2, 'g').ellipse(8, 2, 2, 2, 'h').ellipse(12, 4, 2, 2, 'g');
});
const dock = (): Grid => mk('w', (g) => {
  g.rect(0, 0, 16, 16, 'd');
  for (const y of [3, 7, 11, 15]) g.hline(0, 15, y, 'N');
  g.vline(0, 0, 15, 'N').vline(15, 0, 15, 'N');
  dots(g, 'n', [[6, 1], [10, 5], [4, 9], [9, 13]]);
  dots(g, 'p', [[3, 2], [11, 6], [7, 10], [2, 13]]);
});
const gpuCrate = (): Grid => onWood((g) => {
  g.rect(1, 2, 14, 13, 'k').rect(2, 3, 12, 11, 'd').hline(2, 13, 8, 'N').vline(5, 3, 13, 'N').vline(10, 3, 13, 'N');
  g.rect(5, 5, 6, 2, 'x').rect(6, 10, 4, 3, 'k').rect(7, 11, 2, 1, 'x');
  g.set(2, 3, 'p').set(3, 3, 'p');
});
const lamp = (): Grid => mk('g', (g) => {
  g.rect(7, 5, 2, 10, 'A').rect(5, 14, 6, 2, 'A').rect(4, 1, 8, 4, 'y').rect(5, 0, 6, 1, 'y').hline(4, 11, 4, 'Y');
  g.set(5, 2, 'c').set(6, 2, 'c');
});
const posterAiact = (): Grid => {
  const g = wall();
  g.rect(3, 1, 10, 14, 'k').rect(4, 2, 8, 12, 'f');
  g.rect(5, 3, 6, 2, 'a');
  g.ellipse(7.5, 8, 2, 2, 'A').ellipse(7.5, 8, 1, 1, 'f');
  g.line(5, 6, 10, 11, 'r').line(5, 7, 9, 11, 'r');
  g.hline(5, 10, 12, 'a');
  return g;
};
const black = (): Grid => mk('z');
const exitMat = (): Grid => mk('r', (g) => {
  g.hline(0, 15, 0, 'y').hline(0, 15, 15, 'y').vline(0, 0, 15, 'y').vline(15, 0, 15, 'y');
  g.hline(4, 11, 6, 'c').hline(4, 11, 7, 'c').line(5, 9, 8, 12, 'c').line(10, 9, 8, 12, 'c');
  g.hline(4, 11, 4, 'R');
});

const DRAW: Record<TileName, () => Grid> = {
  grass, grass_alt: grassAlt, path, sand, water, water_edge: waterEdge, cable, tree, bush, rock, flowers, fence, sign, ledge,
  floor_wood: floorWood, floor_lab: floorLab, floor_tile: floorTile, wall, wall_window: wallWindow, carpet,
  house_wall: houseWall, house_window: houseWindow, house_door: houseDoor, roof_red: roofRed, roof_blue: roofBlue, roof_grey: roofGrey,
  hub_wall: hubWall, hub_door: hubDoor, hub_roof: hubRoof, store_wall: storeWall, store_door: storeDoor, store_roof: storeRoof,
  bench_wall: benchWall, bench_door: benchDoor, bench_roof: benchRoof,
  counter, table, shelf, pc, server_rack: serverRack, bed, plant, dock, gpu_crate: gpuCrate, lamp, poster_aiact: posterAiact, black, exit_mat: exitMat,
};

/** One 16x16 sprite per tile, in TILE_NAMES order. */
export const TILE_SPRITES: PixelSprite[] = TILE_NAMES.map((n) => DRAW[n]().sprite(PAL));
