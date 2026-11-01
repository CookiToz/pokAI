// Text helpers: integer placement and monospace measuring for manual wrapping.
import Phaser from 'phaser';
import { TEXT } from './theme';

export type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, style: TextStyle = TEXT.body): Phaser.GameObjects.Text {
  return scene.add.text(Math.round(x), Math.round(y), s, style);
}

const SAMPLE = 'abcdefghijklmnopqrstuvwxyz éèà0123456789 ';
const widths = new Map<string, number>();

/** Average glyph width of a style (cached). Used to wrap text to a pixel width. */
export function charWidth(scene: Phaser.Scene, style: TextStyle): number {
  const key = `${String(style.fontFamily)}|${String(style.fontSize)}`;
  const known = widths.get(key);
  if (known !== undefined) return known;
  const t = scene.add.text(0, 0, SAMPLE, style).setVisible(false);
  const w = Math.max(1, t.width / SAMPLE.length);
  t.destroy();
  widths.set(key, w);
  return w;
}

/** How many characters of this style fit in `px` pixels. */
export function charsFor(scene: Phaser.Scene, style: TextStyle, px: number): number {
  return Math.max(1, Math.floor(px / charWidth(scene, style)));
}
