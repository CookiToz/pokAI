// HP bar, XP bar and labelled gauges. All values tween; set() returns a Promise.
import Phaser from 'phaser';
import { C, TEXT, hex } from './theme';
import { clamp01, hpBand, pct } from './format';
import { counterP } from './gfx';

const HP_COLOURS = { high: C.hp, mid: C.gold, low: C.ember } as const;

/** Plain filled bar, base for every other bar. */
export class Bar extends Phaser.GameObjects.Container {
  protected readonly g: Phaser.GameObjects.Graphics;
  protected value = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    override readonly w: number,
    readonly h: number,
    protected colourFor: (ratio: number) => string,
    protected trackColour: string = C.night,
    protected frameColour: string = C.ink,
  ) {
    super(scene, Math.round(x), Math.round(y));
    this.g = scene.add.graphics();
    this.add(this.g);
    scene.add.existing(this);
    this.redraw();
  }

  get ratio(): number {
    return this.value;
  }

  protected redraw(): void {
    const g = this.g;
    g.clear();
    g.fillStyle(hex(this.frameColour), 1).fillRect(0, 0, this.w + 2, this.h + 2);
    g.fillStyle(hex(this.trackColour), 1).fillRect(1, 1, this.w, this.h);
    const fw = Math.round(clamp01(this.value) * this.w);
    if (fw > 0) {
      g.fillStyle(hex(this.colourFor(this.value)), 1).fillRect(1, 1, fw, this.h);
      // 1px highlight on top row for a bit of volume (no gradient)
      if (this.h >= 3) g.fillStyle(hex(C.cream), 0.35).fillRect(1, 1, fw, 1);
    }
  }

  setRatio(ratio: number): this {
    this.value = clamp01(ratio);
    this.redraw();
    return this;
  }

  /** Tween to ratio; duration scales with distance but stays ≤ maxMs. */
  tweenTo(ratio: number, maxMs = 400): Promise<void> {
    const target = clamp01(ratio);
    const ms = Math.round(Math.min(maxMs, 120 + Math.abs(target - this.value) * maxMs));
    return counterP(this.scene, this.value, target, ms, (v) => {
      this.value = v;
      this.redraw();
    });
  }
}

export class HpBar extends Bar {
  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h = 3) {
    super(scene, x, y, w, h, (r) => HP_COLOURS[hpBand(r)]);
  }
}

export class XpBar extends Bar {
  constructor(scene: Phaser.Scene, x: number, y: number, w: number) {
    super(scene, x, y, w, 1, () => C.sky, C.plum, C.ink);
    this.setRatio(0);
  }
}

/** Labelled gauge "Alignement ███░ 42%" used by Onboarding. */
export class Gauge extends Phaser.GameObjects.Container {
  private readonly bar: Bar;
  private readonly label: Phaser.GameObjects.Text;
  private readonly valueText: Phaser.GameObjects.Text;
  private shown = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, label: string, colour: string, labelColour: string = C.cream) {
    super(scene, Math.round(x), Math.round(y));
    this.label = scene.add.text(0, 0, label, { ...TEXT.small, color: labelColour });
    this.valueText = scene.add.text(w, 0, '0%', { ...TEXT.log, color: colour }).setOrigin(1, 0);
    this.bar = new Bar(scene, 0, 10, w - 2, 4, () => colour, C.ink, C.plum);
    this.bar.setRatio(0);
    this.add([this.label, this.valueText, this.bar]);
    // tick marks every 25%
    const ticks = scene.add.graphics();
    ticks.fillStyle(hex(C.plum), 1);
    for (let i = 1; i < 4; i++) ticks.fillRect(1 + Math.round(((w - 2) * i) / 4), 15, 1, 1);
    this.add(ticks);
    scene.add.existing(this);
  }

  /** value in 0..100 */
  async setValue(value: number, animate = true): Promise<void> {
    const target = Math.max(0, Math.min(100, value));
    if (!animate) {
      this.shown = target;
      this.bar.setRatio(target / 100);
      this.valueText.setText(`${Math.round(target)}%`);
      return;
    }
    const from = this.shown;
    this.shown = target;
    await Promise.all([
      this.bar.tweenTo(target / 100, 500),
      counterP(this.scene, from, target, 450, (v) => this.valueText.setText(`${pct(v / 100)}%`)),
    ]);
    // pulse
    this.scene.tweens.add({ targets: this.valueText, y: -1, duration: 60, yoyo: true });
  }
}
