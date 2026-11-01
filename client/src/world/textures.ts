// Turns the SVG art into Phaser textures at boot (rendered at 2x so zoomed sprites stay crisp).
import Phaser from 'phaser';
import { svgDataUri } from '../art/svg';
import * as art from './art';
import { allArtEntries, type ArtEntry } from './art';
import * as charArt from './art/characters';
import { characterEntries } from './art/characters';
import type { PlayerAppearance } from '../state/types';
import { game } from '../state/store';
import { db } from '../data/db';
import { fallbackMapId, tileNameAt } from './iso';
import { buildingKeys } from './engine/buildings';
import { buildingArt } from './art/buildings';

export const TEX_SCALE = 2;
export const SPRITE_SCALE = 1 / TEX_SCALE;

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('svg texture failed to decode'));
    img.src = url;
  });

export const worldKey = (key: string): string => `w:${key}`;

/** Anchor (origin) of a generated texture, as fractions. */
const anchors = new Map<string, { x: number; y: number }>([
  ['w:fb_crate', { x: 0.5, y: 0.75 }],
  ['w:fb_gate', { x: 0.5, y: 0.75 }],
]);
export function anchorOf(key: string): { x: number; y: number } {
  return anchors.get(worldKey(key)) ?? { x: 0.5, y: 0.5 };
}

async function add(textures: Phaser.Textures.TextureManager, e: ArtEntry): Promise<void> {
  const k = worldKey(e.key);
  if (textures.exists(k)) return;
  try {
    const img = await loadImage(svgDataUri(e.svg));
    textures.addImage(k, img);
    anchors.set(k, { x: 0.5, y: e.anchorY / e.h });
  } catch (err) {
    console.warn(`[world] texture ${e.key}:`, err);
  }
}

/** Optional extra art owned by city-art (`packetEntries()`): glowing data packets. Missing -> empty list. */
function packetArt(): ArtEntry[] {
  const fn = (art as unknown as Record<string, unknown>)['packetEntries'];
  if (typeof fn !== 'function') return [];
  try {
    const list = (fn as () => ArtEntry[])();
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('[world] packetEntries failed:', err);
    return [];
  }
}

/** Texture keys (unprefixed, see `worldKey`) of the data-packet sprites that were provided by the art. */
export function packetKeys(): string[] {
  return packetArt().map((e) => e.key);
}

const isCharKey = (key: string): boolean => key.startsWith('char:');
const charId = (key: string): string => key.split(':')[1] ?? '';

/** Boot: tiles, landmarks and packets. Character sprites (~3.4 MB of SVG) are decoded lazily, see `ensureCharacters`. */
export async function buildWorldTextures(textures: Phaser.Textures.TextureManager): Promise<void> {
  const seen = new Set<string>();
  const entries = [...allArtEntries(), ...packetArt()].filter((e) => !isCharKey(e.key) && !seen.has(e.key) && !!seen.add(e.key));
  await Promise.all(entries.map((e) => add(textures, e)));
}

/**
 * Building textures (v0.7) are built per map, on demand: each building tile needs a body for its style / accent, an
 * outline for its neighbour mask and a shadow, and only the combinations a map really uses are decoded.
 */
export async function ensureMapArt(textures: Phaser.Textures.TextureManager, mapId: string): Promise<void> {
  const id = db.hasMap(mapId) ? mapId : fallbackMapId();
  if (!db.hasMap(id)) return;
  const map = db.map(id);
  const jobs: Promise<void>[] = [];
  for (const key of buildingKeys(map, (x, y) => tileNameAt(map, x, y))) {
    if (textures.exists(worldKey(key))) continue;
    const e = buildingArt(key);
    if (e) jobs.push(add(textures, e));
    else console.warn(`[world] no building art for ${key}`);
  }
  await Promise.all(jobs);
}

let charsById: Map<string, ArtEntry[]> | null = null;
function charGroups(): Map<string, ArtEntry[]> {
  if (!charsById) {
    charsById = new Map();
    for (const e of characterEntries()) {
      const id = charId(e.key);
      const list = charsById.get(id);
      if (list) list.push(e);
      else charsById.set(id, [e]);
    }
  }
  return charsById;
}

/** Sprite ids used by the NPCs of a map (plus the player). */
export function charactersForMap(mapId: string): string[] {
  const ids = new Set<string>(['player']);
  const id = db.hasMap(mapId) ? mapId : fallbackMapId();
  if (db.hasMap(id)) for (const n of db.map(id).npcs) ids.add(n.sprite);
  return [...ids];
}

interface PlayerArt {
  playerEntries?: (a: PlayerAppearance) => ArtEntry[];
  DEFAULT_APPEARANCE?: PlayerAppearance;
}
const playerArt = (): PlayerArt => charArt as unknown as PlayerArt;

/** Appearance the player textures should show (save, else the art's default, else undefined = static art). */
export function currentAppearance(): PlayerAppearance | undefined {
  return game.state?.appearance ?? playerArt().DEFAULT_APPEARANCE;
}

let playerSig = '';

/** The player's texture entries for an appearance; falls back to the static `player` art when the customiser is absent. */
function playerEntriesFor(a: PlayerAppearance | undefined): ArtEntry[] {
  const fn = playerArt().playerEntries;
  if (a && typeof fn === 'function') {
    try {
      const list = fn(a);
      if (Array.isArray(list) && list.length > 0) return list;
    } catch (err) {
      console.warn('[world] playerEntries failed:', err);
    }
  }
  return charGroups().get('player') ?? [];
}

/**
 * (Re)build the `char:player:*` textures from the current appearance. New images are decoded first, then swapped in
 * synchronously so a sprite never renders a missing texture. Resolves true when the textures changed.
 */
export async function ensurePlayerTextures(textures: Phaser.Textures.TextureManager, force = false): Promise<boolean> {
  const a = currentAppearance();
  const sig = a ? JSON.stringify(a) : 'static';
  const have = textures.exists(worldKey('char:player:front:0')) || textures.exists(worldKey('char:player:front'));
  if (!force && sig === playerSig && have) return false;
  const entries = playerEntriesFor(a);
  const decoded: { e: ArtEntry; img: HTMLImageElement }[] = [];
  await Promise.all(
    entries.map(async (e) => {
      try {
        decoded.push({ e, img: await loadImage(svgDataUri(e.svg)) });
      } catch (err) {
        console.warn(`[world] texture ${e.key}:`, err);
      }
    }),
  );
  if (decoded.length === 0) return false;
  for (const { e, img } of decoded) {
    const k = worldKey(e.key);
    if (textures.exists(k)) textures.remove(k);
    textures.addImage(k, img);
    anchors.set(k, { x: 0.5, y: e.anchorY / e.h });
  }
  playerSig = sig;
  return true;
}

/** Decode the character textures for these sprite ids (no-op for the ones already built). Unknown ids are ignored. */
export async function ensureCharacters(textures: Phaser.Textures.TextureManager, ids: Iterable<string>): Promise<void> {
  const groups = charGroups();
  const jobs: Promise<unknown>[] = [];
  for (const id of new Set(ids)) {
    if (id === 'player') jobs.push(ensurePlayerTextures(textures));
    else for (const e of groups.get(id) ?? []) jobs.push(add(textures, e));
  }
  await Promise.all(jobs);
}

function ellipseTexture(textures: Phaser.Textures.TextureManager, key: string, w: number, h: number, colour: string): void {
  if (textures.exists(key)) return;
  const c = textures.createCanvas(key, w, h);
  if (!c) return;
  const ctx = c.getContext();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
  ctx.fill();
  c.refresh();
}

function rectTexture(textures: Phaser.Textures.TextureManager, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  if (textures.exists(key)) return;
  const c = textures.createCanvas(key, w, h);
  if (!c) return;
  draw(c.getContext());
  c.refresh();
}

/** Small helper textures: the drop shadow under characters, the water glint, data packets and run-puffs. */
export function ensureAuxTextures(textures: Phaser.Textures.TextureManager): void {
  ellipseTexture(textures, 'w:shadow', 64, 24, '#1d1a2b');
  ellipseTexture(textures, 'w:glint', 24, 8, '#f4efe4');
  // fallback data packet: a small glowing capsule (white core, pink halo)
  rectTexture(textures, 'w:packet', 20, 12, (ctx) => {
    ctx.fillStyle = 'rgba(255,72,176,0.35)';
    ctx.fillRect(0, 2, 20, 8);
    ctx.fillStyle = '#ff48b0';
    ctx.fillRect(3, 3, 14, 6);
    ctx.fillStyle = '#f4efe4';
    ctx.fillRect(6, 4, 8, 3);
  });
  puzzleFallbacks(textures);
  rectTexture(textures, 'w:puff', 6, 6, (ctx) => {
    ctx.fillStyle = '#f4efe4';
    ctx.fillRect(0, 0, 6, 6);
  });
}

/** Programmatic stand-ins for the puzzle objects, used until/unless the tile art provides `switch_plate:0` & co. */
function puzzleFallbacks(textures: Phaser.Textures.TextureManager): void {
  const diamond = (ctx: CanvasRenderingContext2D, cx: number, cy: number, hw: number, hh: number, fill: string, stroke?: string): void => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  };
  const plate = (on: boolean) => (ctx: CanvasRenderingContext2D): void => {
    diamond(ctx, 32, 16, 28, 14, '#1d1a2b');
    diamond(ctx, 32, 15, 24, 12, on ? '#ffd23f' : '#6e6888', on ? '#f4efe4' : '#3a3550');
  };
  rectTexture(textures, 'w:fb_plate', 64, 32, plate(false));
  rectTexture(textures, 'w:fb_plate_on', 64, 32, plate(true));
  const box = (ctx: CanvasRenderingContext2D, top: string, left: string, right: string, hgt: number): void => {
    // isometric box: footprint diamond centred at (32, 48), 48x24, rising by hgt
    const poly = (pts: number[][], fill: string): void => {
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0] as number, p[1] as number) : ctx.lineTo(p[0] as number, p[1] as number)));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#1d1a2b';
      ctx.stroke();
    };
    poly([[8, 48 - hgt], [32, 60 - hgt], [32, 60], [8, 48]], left);
    poly([[56, 48 - hgt], [32, 60 - hgt], [32, 60], [56, 48]], right);
    diamond(ctx, 32, 48 - hgt, 24, 12, top, '#1d1a2b');
  };
  rectTexture(textures, 'w:fb_crate', 64, 64, (ctx) => box(ctx, '#ff6c2f', '#c04a14', '#e0283c', 26));
  rectTexture(textures, 'w:fb_gate', 64, 64, (ctx) => box(ctx, '#e0283c', '#3a3550', '#1d1a2b', 34));
  rectTexture(textures, 'w:fb_gate_open', 64, 32, (ctx) => {
    diamond(ctx, 32, 16, 28, 14, '#00a095', '#1d1a2b');
  });
}
