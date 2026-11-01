// Low-level drawing + texture helpers shared by every UI widget.
// Everything is drawn with fillRect at integer coordinates (crisp pixels).
import Phaser from 'phaser';
import { C, hex } from './theme';

export type Colour = string; // "#rrggbb" from the palette

/** Resolve the first existing texture key, or a generated placeholder. */
export function resolveTex(scene: Phaser.Scene, keys: string[], w = 32, h = 32): string {
  for (const k of keys) if (scene.textures.exists(k)) return k;
  return placeholderTex(scene, w, h);
}

/** A plum box with a dashed border and a pixel "?" — used while art is missing. */
export function placeholderTex(scene: Phaser.Scene, w: number, h: number): string {
  const key = `ph:${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(hex(C.plum), 1).fillRect(1, 1, w - 2, h - 2);
  g.fillStyle(hex(C.dusk), 1);
  for (let i = 0; i < w; i += 2) {
    g.fillRect(i, 0, 1, 1);
    g.fillRect(i, h - 1, 1, 1);
  }
  for (let j = 0; j < h; j += 2) {
    g.fillRect(0, j, 1, 1);
    g.fillRect(w - 1, j, 1, 1);
  }
  // pixel question mark (5x7)
  const q = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'];
  const ox = Math.floor(w / 2) - 2;
  const oy = Math.floor(h / 2) - 3;
  g.fillStyle(hex(C.fog), 1);
  q.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') g.fillRect(ox + x, oy + y, 1, 1);
  });
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

export interface PokaiTexOpts {
  back?: boolean;
  sealed?: boolean;
}

/** Texture key for a PokAI sprite with graceful fallbacks. */
export function pokaiTex(scene: Phaser.Scene, formId: string, opts: PokaiTexOpts = {}): string {
  const keys: string[] = [];
  if (opts.back) keys.push(`pokai:${formId}:back`);
  if (opts.sealed) keys.push(`pokai:${formId}:sealed`);
  keys.push(`pokai:${formId}`, 'pokai:unknown');
  return resolveTex(scene, keys, 32, 32);
}

/**
 * Pixel box: 1px border with notched corners (no rounded blobs), solid fill,
 * optional 1px drop shadow offset to the bottom-right.
 */
export function drawBox(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: Colour,
  border: Colour,
  shadow?: Colour,
): void {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  if (shadow) {
    g.fillStyle(hex(shadow), 1);
    g.fillRect(x + 1, y + h, w - 1, 1);
    g.fillRect(x + w, y + 1, 1, h - 1);
  }
  g.fillStyle(hex(border), 1);
  g.fillRect(x + 1, y, w - 2, 1);
  g.fillRect(x + 1, y + h - 1, w - 2, 1);
  g.fillRect(x, y + 1, 1, h - 2);
  g.fillRect(x + w - 1, y + 1, 1, h - 2);
  g.fillStyle(hex(fill), 1);
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
}

/** Hollow 1px frame (for selection highlights). */
export function drawFrame(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, colour: Colour): void {
  g.fillStyle(hex(colour), 1);
  g.fillRect(x, y, w, 1);
  g.fillRect(x, y + h - 1, w, 1);
  g.fillRect(x, y, 1, h);
  g.fillRect(x + w - 1, y, 1, h);
}

/** Small right-pointing cursor triangle (4x7) drawn in pixels. */
export function drawCursor(g: Phaser.GameObjects.Graphics, x: number, y: number, colour: Colour): void {
  g.fillStyle(hex(colour), 1);
  g.fillRect(x, y, 1, 7);
  g.fillRect(x + 1, y + 1, 1, 5);
  g.fillRect(x + 2, y + 2, 1, 3);
  g.fillRect(x + 3, y + 3, 1, 1);
}

// ---------- tween / timing promises ----------

export function tweenP(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
  return new Promise((resolve) => {
    scene.tweens.add({ ...config, onComplete: () => resolve() });
  });
}

export function counterP(
  scene: Phaser.Scene,
  from: number,
  to: number,
  duration: number,
  onUpdate: (v: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    if (duration <= 0 || from === to) {
      onUpdate(to);
      resolve();
      return;
    }
    scene.tweens.addCounter({
      from,
      to,
      duration,
      ease: 'Quad.easeOut',
      onUpdate: (tw) => onUpdate(tw.getValue() ?? to),
      onComplete: () => {
        onUpdate(to);
        resolve();
      },
    });
  });
}

export function wait(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((resolve) => {
    scene.time.delayedCall(ms, () => resolve());
  });
}

/** Blink a game object (hit flash) n times. */
export async function blink(scene: Phaser.Scene, obj: Phaser.GameObjects.Components.Visible, times = 3, ms = 50): Promise<void> {
  for (let i = 0; i < times; i++) {
    obj.setVisible(false);
    await wait(scene, ms);
    obj.setVisible(true);
    await wait(scene, ms);
  }
}

/** White-fill flash on an image. */
export async function flashWhite(scene: Phaser.Scene, img: Phaser.GameObjects.Image, times = 2, ms = 45): Promise<void> {
  for (let i = 0; i < times; i++) {
    img.setTintFill(hex(C.cream));
    await wait(scene, ms);
    img.clearTint();
    await wait(scene, ms);
  }
}

/** Short screen fade used for every scene in/out transition (≤ 200 ms). */
export function fadeIn(scene: Phaser.Scene, ms = 160): void {
  const ink = Phaser.Display.Color.HexStringToColor(C.ink);
  scene.cameras.main.fadeIn(ms, ink.red, ink.green, ink.blue);
}

export function fadeOut(scene: Phaser.Scene, ms = 160): Promise<void> {
  const ink = Phaser.Display.Color.HexStringToColor(C.ink);
  return new Promise((resolve) => {
    scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => resolve());
    scene.cameras.main.fadeOut(ms, ink.red, ink.green, ink.blue);
  });
}
