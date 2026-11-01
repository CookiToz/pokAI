// Pure sprite validation (no Phaser): used by the texture factory at boot and by art.test.ts.
import type { CharacterSheet, PixelSprite, PokaiSprite } from './types';

export const MAX_COLOURS = 8; // anti-slop: limited palette per sprite (+ transparent)
const HEX = /^#[0-9a-f]{6}$/i;

export class SpriteError extends Error {
  constructor(name: string, msg: string) {
    super(`[art] sprite "${name}": ${msg}`);
    this.name = 'SpriteError';
  }
}

/** Throws a SpriteError describing the first problem found. */
export function validateSprite(name: string, s: PixelSprite, w?: number, h?: number): void {
  if (w !== undefined && s.w !== w) throw new SpriteError(name, `width ${s.w}, expected ${w}`);
  if (h !== undefined && s.h !== h) throw new SpriteError(name, `height ${s.h}, expected ${h}`);
  if (s.rows.length !== s.h) throw new SpriteError(name, `${s.rows.length} rows, expected h=${s.h}`);
  for (const [k, v] of Object.entries(s.palette)) {
    if (k.length !== 1 || k === '.') throw new SpriteError(name, `bad palette key "${k}"`);
    if (!HEX.test(v)) throw new SpriteError(name, `palette "${k}" = "${v}" is not #rrggbb`);
  }
  const used = new Set<string>();
  s.rows.forEach((row, y) => {
    if (row.length !== s.w) throw new SpriteError(name, `row ${y} has length ${row.length}, expected w=${s.w}`);
    for (let x = 0; x < row.length; x++) {
      const c = row[x] ?? '.';
      if (c === '.') continue;
      const col = s.palette[c];
      if (col === undefined) throw new SpriteError(name, `char "${c}" at (${x},${y}) not in palette`);
      used.add(col.toLowerCase());
    }
  });
  if (used.size === 0) throw new SpriteError(name, 'sprite is fully transparent');
  if (used.size > MAX_COLOURS) throw new SpriteError(name, `${used.size} colours used, max ${MAX_COLOURS}`);
}

export function validateCharacter(c: CharacterSheet): void {
  if (c.frames.length !== 8) throw new SpriteError(`char:${c.id}`, `${c.frames.length} frames, expected 8`);
  c.frames.forEach((f, i) => validateSprite(`char:${c.id}#${i}`, f, 16, 16));
  if (c.portrait) validateSprite(`portrait:${c.id}`, c.portrait, 32, 32);
}

export function validatePokai(p: PokaiSprite): void {
  validateSprite(`pokai:${p.formId}`, p.front, 32, 32);
  if (p.back) validateSprite(`pokai:${p.formId}:back`, p.back, 32, 32);
}
