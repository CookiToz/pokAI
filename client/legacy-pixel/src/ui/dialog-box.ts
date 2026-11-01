// Reusable dialogue box: 9-slice frame, speaker tab, 32x32 portrait, token-by-token text, choices.
import Phaser from 'phaser';
import { C, FONT_PIXEL, GAME_HEIGHT, GAME_WIDTH, hex, ZOOM } from './theme';
import type { Controls, PadAction } from '../story/controls';

const BOX_X = 4;
const BOX_H = 50;
const BOX_Y = GAME_HEIGHT - BOX_H - 4;
const BOX_W = GAME_WIDTH - 8;
const WORD_MS = 35;
const TEXT_STYLE = { fontFamily: FONT_PIXEL, fontSize: '10px', color: C.ink, resolution: ZOOM, lineSpacing: 2 } as const;

export class DialogBox extends Phaser.GameObjects.Container {
  private readonly textObj: Phaser.GameObjects.Text;
  private readonly tab: Phaser.GameObjects.Container;
  private readonly tabText: Phaser.GameObjects.Text;
  private readonly caret: Phaser.GameObjects.Text;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly portraitBg: Phaser.GameObjects.Rectangle;
  private choiceBox: Phaser.GameObjects.Container | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, private readonly controls: Controls) {
    super(scene, 0, 0);
    this.setScrollFactor(0).setDepth(1000);
    this.add(this.makeFrame(BOX_X, BOX_Y, BOX_W, BOX_H));
    this.portraitBg = scene.add.rectangle(BOX_X + 10, BOX_Y + 9, 32, 32, hex(C.plum)).setOrigin(0);
    this.portrait = scene.add.image(BOX_X + 10, BOX_Y + 9, '__DEFAULT').setOrigin(0).setVisible(false);
    this.textObj = scene.add.text(BOX_X + 12, BOX_Y + 8, '', TEXT_STYLE).setWordWrapWidth(BOX_W - 28);
    this.caret = scene.add.text(BOX_X + BOX_W - 16, BOX_Y + BOX_H - 14, '▌', TEXT_STYLE).setVisible(false);
    scene.tweens.add({ targets: this.caret, alpha: 0.1, duration: 350, yoyo: true, repeat: -1 });
    this.tabText = scene.add.text(BOX_X + 12, BOX_Y - 11, '', { ...TEXT_STYLE, fontSize: '8px', color: C.cream });
    const tabBg = scene.add.rectangle(BOX_X + 6, BOX_Y - 13, 60, 14, hex(C.plum)).setOrigin(0).setStrokeStyle(1, hex(C.ink));
    this.tab = scene.add.container(0, 0, [tabBg, this.tabText]).setVisible(false);
    this.add([this.portraitBg, this.portrait, this.textObj, this.caret, this.tab]);
    this.portraitBg.setVisible(false);
    this.setVisible(false);
    scene.add.existing(this);
  }

  private makeFrame(x: number, y: number, w: number, h: number): Phaser.GameObjects.GameObject {
    const s = this.scene;
    if (s.textures.exists('ui:frame')) return s.add.nineslice(x, y, 'ui:frame', undefined, w, h, 8, 8, 8, 8).setOrigin(0);
    return s.add.rectangle(x, y, w, h, hex(C.paper)).setOrigin(0).setStrokeStyle(2, hex(C.ink));
  }

  /** Show text (revealed word by word); resolves when the player presses A after it is fully shown. */
  say(text: string, opts: { speaker?: string; portrait?: string } = {}): Promise<void> {
    this.setVisible(true);
    this.clearChoices();
    const speaker = opts.speaker;
    this.tab.setVisible(!!speaker);
    if (speaker) {
      this.tabText.setText(speaker);
      const bg = this.tab.list[0] as Phaser.GameObjects.Rectangle;
      bg.width = Math.max(30, this.tabText.width + 12);
    }
    const pKey = opts.portrait ? `portrait:${opts.portrait}` : '';
    const hasPortrait = !!pKey && this.scene.textures.exists(pKey);
    this.portrait.setVisible(hasPortrait);
    this.portraitBg.setVisible(hasPortrait);
    if (hasPortrait) this.portrait.setTexture(pKey);
    this.textObj.setX(BOX_X + (hasPortrait ? 50 : 12)).setWordWrapWidth(BOX_W - (hasPortrait ? 66 : 28));
    this.caret.setVisible(false);
    this.textObj.setText('');
    const words = text.split(' ');
    let n = 0;
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = (): void => {
        this.timer?.remove();
        this.timer = null;
        this.textObj.setText(text);
        done = true;
        this.caret.setVisible(true);
      };
      const handler = (a: PadAction): void => {
        if (a !== 'a' && a !== 'b') return;
        if (!done) return finish();
        this.controls.pop(handler);
        this.caret.setVisible(false);
        resolve();
      };
      this.controls.push(handler);
      this.timer = this.scene.time.addEvent({
        delay: WORD_MS,
        loop: true,
        callback: () => {
          n++;
          this.textObj.setText(words.slice(0, n).join(' '));
          if (n >= words.length) finish();
        },
      });
    });
  }

  /** Show a vertical choice menu; resolves with the chosen index. */
  choose(labels: string[]): Promise<number> {
    this.setVisible(true);
    this.clearChoices();
    const w = Math.max(60, ...labels.map((l) => l.length * 6 + 24));
    const h = labels.length * 14 + 10;
    const x = GAME_WIDTH - 8 - w;
    const y = BOX_Y - h - 2;
    const c = this.scene.add.container(0, 0).setScrollFactor(0);
    c.add(this.makeFrame(x, y, w, h));
    const rows = labels.map((l, i) => this.scene.add.text(x + 16, y + 6 + i * 14, l, TEXT_STYLE));
    c.add(rows);
    const hasCur = this.scene.textures.exists('ui:cursor');
    const cur: Phaser.GameObjects.Image | Phaser.GameObjects.Text = hasCur
      ? this.scene.add.image(x + 7, y + 11, 'ui:cursor')
      : this.scene.add.text(x + 6, y + 6, '▶', TEXT_STYLE);
    c.add(cur);
    this.add(c);
    this.choiceBox = c;
    let sel = 0;
    const place = (): void => {
      cur.setY(y + (hasCur ? 11 : 6) + sel * 14);
    };
    place();
    return new Promise<number>((resolve) => {
      const handler = (a: PadAction): void => {
        if (a === 'up') sel = (sel + labels.length - 1) % labels.length;
        else if (a === 'down') sel = (sel + 1) % labels.length;
        else if (a === 'a') {
          this.controls.pop(handler);
          this.clearChoices();
          return resolve(sel);
        }
        place();
      };
      this.controls.push(handler);
    });
  }

  private clearChoices(): void {
    this.choiceBox?.destroy();
    this.choiceBox = null;
  }

  hide(): void {
    this.timer?.remove();
    this.timer = null;
    this.clearChoices();
    this.setVisible(false);
  }
}
