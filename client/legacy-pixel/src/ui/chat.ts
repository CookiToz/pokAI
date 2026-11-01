// Chat bubbles for the Onboarding conversation. Text is typed token by token.
import Phaser from 'phaser';
import { C, TEXT } from './theme';
import { drawBox } from './gfx';
import { charWidth, charsFor, txt } from './text';
import { wrapText } from './format';
import { typeTokens } from './typing';
import type { InputRouter } from './input';

export type BubbleKind = 'foe' | 'player' | 'system';

interface Bubble {
  c: Phaser.GameObjects.Container;
  h: number;
}

export class ChatLog extends Phaser.GameObjects.Container {
  private bubbles: Bubble[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly router: InputRouter,
    x: number,
    y: number,
    private readonly areaW: number,
    private readonly areaH: number,
  ) {
    super(scene, Math.round(x), Math.round(y));
    scene.add.existing(this);
  }

  async say(kind: BubbleKind, text: string): Promise<void> {
    const sc = this.scene;
    const style = kind === 'system' ? TEXT.log : TEXT.small;
    const maxW = Math.round(this.areaW * (kind === 'system' ? 1 : 0.78));
    const wrapped = wrapText(text, charsFor(sc, style, maxW - 8));
    const cw = charWidth(sc, style);
    const longest = wrapped.reduce((m, l) => Math.max(m, l.length), 1);
    const bw = Math.min(maxW, Math.ceil(longest * cw) + 9);
    const lineH = kind === 'system' ? 8 : 9;
    const bh = wrapped.length * lineH + 6;

    const [fill, border, colour] =
      kind === 'foe' ? [C.paper, C.ink, C.ink] : kind === 'player' ? [C.ember, C.ink, C.cream] : [C.plum, C.dusk, C.fog];
    const g = sc.add.graphics();
    drawBox(g, 0, 0, bw, bh, fill, border);
    // 3px pixel tail on the speaker's side
    g.fillStyle(parseInt(fill.slice(1), 16), 1);
    if (kind === 'foe') g.fillRect(2, bh, 3, 1).fillRect(2, bh + 1, 2, 1).fillRect(2, bh + 2, 1, 1);
    if (kind === 'player') g.fillRect(bw - 5, bh, 3, 1).fillRect(bw - 4, bh + 1, 2, 1).fillRect(bw - 3, bh + 2, 1, 1);
    const body = txt(sc, 4, 3, '', { ...style, color: colour, lineSpacing: 0 });
    const x = kind === 'foe' ? 2 : kind === 'player' ? this.areaW - bw - 2 : 0;
    const c = sc.add.container(x, this.areaH, [g, body]);
    this.add(c);
    this.bubbles.push({ c, h: bh + 4 });
    this.layout(true);
    await typeTokens(sc, this.router, wrapped.join('\n'), (s) => body.setText(s), kind === 'system' ? 14 : 24);
  }

  private layout(animate: boolean): void {
    let y = this.areaH - 3;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i] as Bubble;
      y -= b.h;
      const ty = Math.round(y);
      if (ty < 0 && i < this.bubbles.length - 1) {
        b.c.destroy();
        this.bubbles.splice(i, 1);
        continue;
      }
      if (animate && b.c.y !== this.areaH) this.scene.tweens.add({ targets: b.c, y: ty, duration: 90 });
      else b.c.y = ty;
    }
  }

  clear(): void {
    this.bubbles.forEach((b) => b.c.destroy());
    this.bubbles = [];
  }
}
