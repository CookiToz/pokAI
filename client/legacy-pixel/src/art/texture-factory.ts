// Rasterises every code-authored sprite into Phaser textures (see art/types.ts for the key contract).
import Phaser from 'phaser';
import { TILE_NAMES } from '../data/tiles';
import { CHARACTER_SHEETS } from './characters';
import { ALL_POKAI } from './pokai';
import { TILE_SPRITES } from './tiles';
import { UI_SPRITES } from './ui';
import { mirrorDark, sealed, silhouette } from './transform';
import { validateCharacter, validatePokai, validateSprite } from './validate';
import type { PixelSprite } from './types';

const POKAI_BY_ID = new Map(ALL_POKAI.map((p) => [p.formId, p]));

export function hasPokaiSprite(formId: string): boolean {
  return POKAI_BY_ID.has(formId);
}

function draw(ctx: CanvasRenderingContext2D, s: PixelSprite, ox: number, oy = 0): void {
  s.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      const col = c && c !== '.' ? s.palette[c] : undefined;
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}

function addTexture(scene: Phaser.Scene, key: string, sprites: PixelSprite[]): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const w = sprites[0]?.w ?? 1;
  const h = sprites[0]?.h ?? 1;
  const tex = scene.textures.createCanvas(key, w * sprites.length, h);
  if (!tex) return;
  const ctx = tex.getContext();
  sprites.forEach((s, i) => draw(ctx, s, i * w));
  tex.refresh();
  if (sprites.length > 1) sprites.forEach((_, i) => tex.add(i, 0, i * w, 0, w, h));
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/** Builds every texture. Idempotent. Throws a SpriteError naming the sprite if any asset is malformed. */
export function buildAllTextures(scene: Phaser.Scene): void {
  TILE_SPRITES.forEach((s, i) => validateSprite(`tile:${TILE_NAMES[i]}`, s, 16, 16));
  addTexture(scene, 'tileset', TILE_SPRITES);

  for (const c of CHARACTER_SHEETS) {
    validateCharacter(c);
    addTexture(scene, `char:${c.id}`, c.frames);
    if (c.portrait) addTexture(scene, `portrait:${c.id}`, [c.portrait]);
  }

  for (const p of ALL_POKAI) {
    validatePokai(p);
    const back = p.back ?? mirrorDark(p.front);
    addTexture(scene, `pokai:${p.formId}`, [p.front]);
    addTexture(scene, `pokai:${p.formId}:back`, [back]);
    addTexture(scene, `pokai:${p.formId}:sealed`, [sealed(p.front)]);
  }
  addTexture(scene, 'pokai:unknown', [silhouette()]);

  for (const [key, s] of Object.entries(UI_SPRITES)) {
    validateSprite(key, s);
    addTexture(scene, key, [s]);
  }
}
