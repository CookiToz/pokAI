// Small modal question with 2-4 options (Oui/Non style). Resolves with the chosen index, -1 on B.
import Phaser from 'phaser';
import { C, TEXT } from './theme';
import { Panel } from './panel';
import { MenuList } from './menu-list';
import type { Action, InputRouter } from './input';
import { charsFor, txt } from './text';
import { wrapText } from './format';

export interface ChoiceOpts {
  x: number;
  y: number;
  w: number;
  message?: string;
  options: string[];
  /** What B does: index to return (default -1). */
  cancelIndex?: number;
  style?: 'paper' | 'night';
  depth?: number;
}

export function choose(scene: Phaser.Scene, router: InputRouter, o: ChoiceOpts): Promise<number> {
  return new Promise((resolve) => {
    const dark = o.style === 'night';
    const textStyle = dark ? TEXT.bodyLight : TEXT.body;
    const lines = o.message ? wrapText(o.message, charsFor(scene, textStyle, o.w - 18)) : [];
    const msgH = lines.length * 11;
    const h = 10 + msgH + (lines.length ? 3 : 0) + o.options.length * 11 + 4;
    const panel = new Panel(scene, o.x, o.y, o.w, h, { style: dark ? 'night' : 'paper' });
    const parts: Phaser.GameObjects.GameObject[] = [panel];
    if (lines.length) parts.push(txt(scene, o.x + 8, o.y + 6, lines.join('\n'), { ...textStyle, lineSpacing: 1 }));
    const menu = new MenuList(scene, {
      x: o.x + 8,
      y: o.y + 6 + msgH + (lines.length ? 3 : 0),
      width: o.w - 16,
      items: o.options.map((label) => ({ label })),
      style: textStyle,
      colour: dark ? C.cream : C.ink,
      rowH: 11,
      onSelect: (i) => close(i),
      onCancel: () => close(o.cancelIndex ?? -1),
    });
    parts.push(menu);
    const root = scene.add.container(0, 0, parts).setDepth(o.depth ?? 300);
    const handler = (a: Action): void => {
      menu.handle(a);
    };
    router.push(handler);
    let closed = false;
    function close(i: number): void {
      if (closed) return;
      closed = true;
      router.pop(handler);
      root.destroy();
      resolve(i);
    }
  });
}
