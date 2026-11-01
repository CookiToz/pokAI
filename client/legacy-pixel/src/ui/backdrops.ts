// Drawn backgrounds (no assets): cables (wild), arena (trainer), table (starter), terminal.
// Flat colour bands only: no gradients. All coordinates are integers.
import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, hex } from './theme';

type G = Phaser.GameObjects.Graphics;

function rect(g: G, x: number, y: number, w: number, h: number, colour: string, alpha = 1): void {
  g.fillStyle(hex(colour), alpha).fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Stacked-rows ellipse (platform under a sprite). */
export function platform(g: G, cx: number, cy: number, rx: number, ry: number, top: string, rim: string): void {
  for (let dy = -ry; dy <= ry; dy++) {
    const f = Math.sqrt(1 - (dy * dy) / (ry * ry));
    const w = Math.round(rx * f);
    rect(g, cx - w, cy + dy, w * 2, 1, dy >= ry - 1 ? rim : top);
  }
}

/** Small deterministic pseudo-random so backdrops never change between frames. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Wild battle: a server-room floor covered in cables. */
export function drawCables(scene: Phaser.Scene, height: number): G {
  const g = scene.add.graphics();
  rect(g, 0, 0, GAME_WIDTH, height, C.night);
  // back wall racks
  for (let x = 0; x < GAME_WIDTH; x += 20) {
    rect(g, x, 0, 18, 46, C.plum);
    rect(g, x, 0, 18, 1, C.dusk);
    for (let y = 4; y < 44; y += 6) {
      rect(g, x + 2, y, 14, 3, C.ink);
      rect(g, x + 3, y + 1, 1, 1, ((x / 20 + y) | 0) % 3 === 0 ? C.leaf : C.dusk);
      rect(g, x + 6, y + 1, 1, 1, ((x / 20 + y) | 0) % 4 === 0 ? C.ember : C.dusk);
    }
  }
  rect(g, 0, 46, GAME_WIDTH, 2, C.ink);
  // floor bands
  rect(g, 0, 48, GAME_WIDTH, height - 48, C.moss);
  rect(g, 0, 48, GAME_WIDTH, 1, C.leaf);
  rect(g, 0, 78, GAME_WIDTH, 2, C.leaf);
  rect(g, 0, 98, GAME_WIDTH, 2, C.leaf);
  // tufts (tall-grass joke: cable bundles)
  const rnd = lcg(1337);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rnd() * GAME_WIDTH);
    const y = 50 + Math.floor(rnd() * (height - 54));
    rect(g, x, y, 1, 3, C.leaf);
    rect(g, x + 2, y + 1, 1, 2, C.leaf);
    rect(g, x - 1, y + 1, 1, 2, C.ink);
  }
  // cables crossing the floor (stepped diagonals)
  const cableColours = [C.ink, C.dusk, C.ember, C.sea];
  for (let k = 0; k < 4; k++) {
    let x = Math.floor(rnd() * 120);
    let y = 56 + k * 14;
    const col = cableColours[k % cableColours.length] ?? C.ink;
    while (x < GAME_WIDTH) {
      rect(g, x, y, 4, 2, col);
      x += 4;
      if (rnd() < 0.35) y += rnd() < 0.5 ? 1 : -1;
    }
  }
  return g;
}

/** Trainer battle: a tiled arena with banners. AIACT arenas turn grey. */
export function drawArena(scene: Phaser.Scene, height: number, aiact: boolean): G {
  const g = scene.add.graphics();
  const wall = aiact ? C.steel : C.plum;
  const wallDark = aiact ? C.dusk : C.night;
  rect(g, 0, 0, GAME_WIDTH, height, wallDark);
  rect(g, 0, 0, GAME_WIDTH, 52, wall);
  for (let x = 0; x < GAME_WIDTH; x += 40) {
    rect(g, x, 0, 2, 52, wallDark);
    rect(g, x + 2, 0, 1, 52, aiact ? C.fog : C.dusk);
  }
  // banners
  for (const bx of [28, 148, 268]) {
    rect(g, bx, 0, 24, 30, aiact ? C.cream : C.ember);
    rect(g, bx, 30, 8, 5, aiact ? C.cream : C.ember);
    rect(g, bx + 16, 30, 8, 5, aiact ? C.cream : C.ember);
    rect(g, bx + 4, 6, 16, 2, aiact ? C.ink : C.gold);
    rect(g, bx + 8, 12, 8, 8, aiact ? C.steel : C.gold);
  }
  rect(g, 0, 52, GAME_WIDTH, 2, C.ink);
  // checker floor, rows get taller toward the viewer
  const rows = [54, 66, 80, 96, 114];
  for (let r = 0; r < rows.length - 1; r++) {
    const y0 = rows[r] as number;
    const y1 = (rows[r + 1] as number) > height ? height : (rows[r + 1] as number);
    const tile = 16 + r * 6;
    for (let x = -tile; x < GAME_WIDTH + tile; x += tile) {
      const odd = (Math.floor(x / tile) + r) % 2 === 0;
      rect(g, x, y0, tile, y1 - y0, odd ? (aiact ? C.dusk : C.plum) : (aiact ? C.night : C.night));
    }
  }
  return g;
}

/** Starter choice: LeCube's table against a dim wall. */
export function drawTable(scene: Phaser.Scene): G {
  const g = scene.add.graphics();
  rect(g, 0, 0, GAME_WIDTH, GAME_HEIGHT, C.night);
  rect(g, 0, 0, GAME_WIDTH, 100, C.plum);
  for (let x = 0; x < GAME_WIDTH; x += 16) rect(g, x, 0, 1, 100, C.night);
  rect(g, 0, 100, GAME_WIDTH, 2, C.ink);
  rect(g, 0, 102, GAME_WIDTH, GAME_HEIGHT - 102, C.night);
  // table top + front + legs
  rect(g, 20, 76, 280, 8, C.fog);
  rect(g, 20, 76, 280, 1, C.cream);
  rect(g, 20, 84, 280, 14, C.dusk);
  rect(g, 20, 97, 280, 1, C.ink);
  rect(g, 28, 98, 8, 34, C.dusk);
  rect(g, 284, 98, 8, 34, C.dusk);
  rect(g, 28, 98, 1, 34, C.ink);
  rect(g, 284, 98, 1, 34, C.ink);
  return g;
}

/** Plain terminal backdrop: ink + faint scanlines. */
export function drawTerminal(scene: Phaser.Scene): G {
  const g = scene.add.graphics();
  rect(g, 0, 0, GAME_WIDTH, GAME_HEIGHT, C.ink);
  for (let y = 0; y < GAME_HEIGHT; y += 4) rect(g, 0, y, GAME_WIDTH, 1, C.night);
  return g;
}
