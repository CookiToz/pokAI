// Dev preview (client/art-preview.html): every sprite at x4 on plain canvases.
import { TILE_NAMES } from '../data/tiles';
import { CHARACTER_SHEETS } from './characters';
import { ALL_POKAI } from './pokai';
import { TILE_SPRITES } from './tiles';
import { mirrorDark, sealed, silhouette } from './transform';
import type { PixelSprite } from './types';
import { UI_SPRITES } from './ui';

const Z = 4;

function cv(s: PixelSprite): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = s.w * Z;
  c.height = s.h * Z;
  c.style.imageRendering = 'pixelated';
  const ctx = c.getContext('2d')!;
  s.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = row[x] !== '.' ? s.palette[row[x]!] : undefined;
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(x * Z, y * Z, Z, Z);
      }
    }
  });
  return c;
}

function cell(parent: HTMLElement, label: string, ...sprites: PixelSprite[]): void {
  const d = document.createElement('div');
  d.className = 'cell';
  const row = document.createElement('div');
  sprites.forEach((s) => row.appendChild(cv(s)));
  const l = document.createElement('div');
  l.textContent = label;
  d.append(row, l);
  parent.appendChild(d);
}

function section(title: string): HTMLElement {
  const h = document.createElement('h2');
  h.textContent = title;
  const s = document.createElement('div');
  s.className = 'grid';
  document.body.append(h, s);
  return s;
}

const tiles = section('Tiles');
TILE_SPRITES.forEach((s, i) => cell(tiles, TILE_NAMES[i]!, s));
const chars = section('Characters (8 frames + portrait)');
CHARACTER_SHEETS.forEach((c) => cell(chars, c.id, ...c.frames, ...(c.portrait ? [c.portrait] : [])));
const pk = section('PokAI (front, back, sealed)');
ALL_POKAI.forEach((p) => cell(pk, p.formId, p.front, p.back ?? mirrorDark(p.front), sealed(p.front)));
cell(pk, 'unknown', silhouette());
const ui = section('UI');
Object.entries(UI_SPRITES).forEach(([k, s]) => cell(ui, k, s));
