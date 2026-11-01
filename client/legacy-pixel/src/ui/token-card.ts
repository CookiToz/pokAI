// A pixel "token card" in the Onboarding hand.
import Phaser from 'phaser';
import { C, TEXT, hex } from './theme';
import { drawFrame } from './gfx';
import { charsFor, txt } from './text';
import { wrapText } from './format';
import type { TokenCard } from '../data/types';

export const CARD_W = 48;
export const CARD_H = 38;

export class TokenCardView extends Phaser.GameObjects.Container {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly badge: Phaser.GameObjects.Text;
  private focused = false;
  private order: number | null = null;
  private tint: string | null = null;
  readonly baseY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly card: TokenCard,
  ) {
    super(scene, Math.round(x), Math.round(y));
    this.baseY = Math.round(y);
    this.gfx = scene.add.graphics();
    this.add(this.gfx);
    const lines = wrapText(card.label, charsFor(scene, TEXT.small, CARD_W - 6)).slice(0, 3);
    this.add(
      txt(scene, CARD_W / 2, 9, lines.join('\n'), {
        ...TEXT.small,
        color: card.jailbreak ? C.cream : C.ink,
        align: 'center',
        lineSpacing: 0,
      }).setOrigin(0.5, 0),
    );
    if (card.jailbreak) this.add(txt(scene, CARD_W / 2, CARD_H - 9, 'JAILBREAK', { ...TEXT.log, color: C.gold }).setOrigin(0.5, 0));
    this.badge = txt(scene, CARD_W - 6, 2, '', { ...TEXT.log, color: C.ink }).setOrigin(0.5, 0);
    this.add(this.badge);
    scene.add.existing(this);
    this.draw();
  }

  private draw(): void {
    const g = this.gfx;
    g.clear();
    const jb = this.card.jailbreak === true;
    g.fillStyle(hex(C.ink), 1).fillRect(1, 2, CARD_W, CARD_H); // drop shadow
    g.fillStyle(hex(C.ink), 1).fillRect(0, 0, CARD_W, CARD_H);
    g.fillStyle(hex(this.tint ?? (jb ? C.plum : C.paper)), 1).fillRect(1, 1, CARD_W - 2, CARD_H - 2);
    g.fillStyle(hex(jb ? C.ember : C.dusk), 1).fillRect(1, 1, CARD_W - 2, 6);
    // token "teeth" along the top strip
    g.fillStyle(hex(jb ? C.gold : C.fog), 1);
    for (let x = 3; x < CARD_W - 12; x += 4) g.fillRect(x, 3, 2, 2);
    if (this.order !== null) {
      g.fillStyle(hex(C.gold), 1).fillRect(CARD_W - 11, 1, 10, 9);
      g.fillStyle(hex(C.ink), 1).fillRect(CARD_W - 11, 9, 10, 1);
    }
    if (this.focused) {
      drawFrame(g, -2, -2, CARD_W + 4, CARD_H + 4, C.ember);
      g.fillStyle(hex(C.ember), 1);
      g.fillRect(-2, -2, 4, 4);
      g.fillRect(CARD_W - 2, CARD_H - 2, 4, 4);
    }
  }

  setFocused(v: boolean): void {
    this.focused = v;
    this.draw();
  }

  setPicked(order: number | null): void {
    this.order = order;
    this.badge.setText(order === null ? '' : String(order));
    this.draw();
    this.scene.tweens.add({ targets: this, y: this.baseY + (order === null ? 0 : -5), duration: 60 });
  }

  get picked(): boolean {
    return this.order !== null;
  }

  /** Result flash: leaf for a matching trait, ember for a miss. */
  async flash(kind: 'match' | 'miss'): Promise<void> {
    this.tint = kind === 'match' ? C.leaf : C.ember;
    this.draw();
    await new Promise<void>((resolve) => {
      if (kind === 'miss') {
        const x0 = this.x;
        this.scene.tweens.add({ targets: this, x: x0 + 2, duration: 40, yoyo: true, repeat: 2, onComplete: () => { this.x = x0; resolve(); } });
      } else {
        this.scene.tweens.add({ targets: this, y: this.y - 3, duration: 90, yoyo: true, onComplete: () => resolve() });
      }
    });
    this.tint = null;
    this.draw();
  }
}
