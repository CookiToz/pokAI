// Panel container: 9-slice "ui:frame" when the art exists, pixel box otherwise.
import Phaser from 'phaser';
import { C, TEXT } from './theme';
import { drawBox } from './gfx';

export type PanelStyle = 'paper' | 'terminal' | 'night';

export interface PanelOpts {
  style?: PanelStyle;
  /** Window title strip (chat/terminal look). */
  title?: string;
  shadow?: boolean;
}

export const PANEL_TITLE_H = 9;

export class Panel extends Phaser.GameObjects.Container {
  override readonly w: number;
  readonly h: number;
  readonly style: PanelStyle;
  private readonly bg: Phaser.GameObjects.Graphics | Phaser.GameObjects.NineSlice;
  private titleText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, opts: PanelOpts = {}) {
    super(scene, Math.round(x), Math.round(y));
    this.w = Math.round(w);
    this.h = Math.round(h);
    this.style = opts.style ?? 'paper';

    if (this.style === 'paper' && scene.textures.exists('ui:frame')) {
      const ns = scene.add.nineslice(0, 0, 'ui:frame', undefined, this.w, this.h, 8, 8, 8, 8);
      ns.setOrigin(0, 0);
      this.bg = ns;
      this.add(ns);
    } else {
      const g = scene.add.graphics();
      const [fill, border] =
        this.style === 'paper' ? [C.paper, C.ink] : this.style === 'terminal' ? [C.ink, C.dusk] : [C.night, C.plum];
      drawBox(g, 0, 0, this.w, this.h, fill, border, opts.shadow === false ? undefined : C.ink);
      if (this.style === 'paper') {
        // inner highlight line, keeps the paper look from being flat
        g.fillStyle(Phaser.Display.Color.HexStringToColor(C.cream).color, 1);
        g.fillRect(2, 1, this.w - 4, 1);
      }
      this.bg = g;
      this.add(g);
    }

    if (opts.title !== undefined) {
      const strip = scene.add.graphics();
      strip.fillStyle(Phaser.Display.Color.HexStringToColor(this.style === 'paper' ? C.plum : C.plum).color, 1);
      strip.fillRect(1, 1, this.w - 2, PANEL_TITLE_H - 1);
      // three status pixels, like a terminal window
      const dots = [C.ember, C.gold, C.leaf];
      dots.forEach((d, i) => {
        strip.fillStyle(Phaser.Display.Color.HexStringToColor(d).color, 1);
        strip.fillRect(this.w - 6 - i * 4, 4, 2, 2);
      });
      this.add(strip);
      this.titleText = scene.add.text(4, 1, opts.title, { ...TEXT.log, color: C.cream });
      this.add(this.titleText);
    }
    scene.add.existing(this);
  }

  setTitle(title: string): this {
    this.titleText?.setText(title);
    return this;
  }

  /** Content top offset (below the title strip if any). */
  get top(): number {
    return this.titleText ? PANEL_TITLE_H + 2 : 4;
  }

  get background(): Phaser.GameObjects.GameObject {
    return this.bg;
  }
}
