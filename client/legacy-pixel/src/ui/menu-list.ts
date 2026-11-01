// Keyboard menu list with a pixel cursor. Supports columns, scrolling and
// disabled entries. Feed it actions via handle(); it never owns input itself.
import Phaser from 'phaser';
import { C, TEXT, hex } from './theme';
import { drawCursor } from './gfx';
import type { Action } from './input';

export interface MenuItem {
  label: string;
  /** right-aligned secondary text (price, count, PP…) */
  right?: string;
  disabled?: boolean;
}

export interface MenuListOpts {
  x: number;
  y: number;
  width: number;
  items: MenuItem[];
  columns?: number;
  rowH?: number;
  visibleRows?: number;
  style?: Phaser.Types.GameObjects.Text.TextStyle;
  colour?: string;
  disabledColour?: string;
  selectedColour?: string;
  onSelect?: (index: number) => void;
  onCancel?: () => void;
  onChange?: (index: number) => void;
  /** wrap around at the ends (default true) */
  wrap?: boolean;
}

export class MenuList extends Phaser.GameObjects.Container {
  private items: MenuItem[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private rights: Phaser.GameObjects.Text[] = [];
  private readonly cursor: Phaser.GameObjects.Graphics | Phaser.GameObjects.Image;
  private readonly arrows: Phaser.GameObjects.Graphics;
  private idx = 0;
  private scroll = 0;
  private readonly columns: number;
  private readonly rowH: number;
  private readonly visibleRows: number;
  private readonly colW: number;
  focused = true;

  constructor(
    scene: Phaser.Scene,
    private readonly opts: MenuListOpts,
  ) {
    super(scene, Math.round(opts.x), Math.round(opts.y));
    this.columns = Math.max(1, opts.columns ?? 1);
    this.rowH = opts.rowH ?? 11;
    this.visibleRows = opts.visibleRows ?? 99;
    this.colW = Math.floor(opts.width / this.columns);
    if (scene.textures.exists('ui:cursor')) {
      this.cursor = scene.add.image(0, 0, 'ui:cursor').setOrigin(0, 0);
    } else {
      const g = scene.add.graphics();
      drawCursor(g, 0, 0, C.ember);
      this.cursor = g;
    }
    this.arrows = scene.add.graphics();
    this.add([this.cursor, this.arrows]);
    scene.add.existing(this);
    this.setItems(opts.items);
    // subtle 1px cursor bob
    scene.tweens.add({ targets: this.cursor, alpha: 0.55, duration: 420, yoyo: true, repeat: -1 });
  }

  get index(): number {
    return this.idx;
  }

  get itemCount(): number {
    return this.items.length;
  }

  get selected(): MenuItem | undefined {
    return this.items[this.idx];
  }

  setItems(items: MenuItem[], keepIndex = true): this {
    this.items = items;
    if (!keepIndex) this.idx = 0;
    this.idx = Math.max(0, Math.min(this.idx, items.length - 1));
    this.rebuild();
    return this;
  }

  setIndex(i: number, silent = false): this {
    if (this.items.length === 0) return this;
    this.idx = Math.max(0, Math.min(i, this.items.length - 1));
    this.ensureVisible();
    this.refresh();
    if (!silent) this.opts.onChange?.(this.idx);
    return this;
  }

  private rows(): number {
    return Math.ceil(this.items.length / this.columns);
  }

  private rebuild(): void {
    this.texts.forEach((t) => t.destroy());
    this.rights.forEach((t) => t.destroy());
    this.texts = [];
    this.rights = [];
    const style = this.opts.style ?? TEXT.body;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i]!;
      const t = this.scene.add.text(0, 0, it.label, style);
      this.texts.push(t);
      this.add(t);
      const r = this.scene.add.text(0, 0, it.right ?? '', style).setOrigin(1, 0);
      this.rights.push(r);
      this.add(r);
    }
    this.ensureVisible();
    this.refresh();
  }

  private ensureVisible(): void {
    const row = Math.floor(this.idx / this.columns);
    if (row < this.scroll) this.scroll = row;
    if (row >= this.scroll + this.visibleRows) this.scroll = row - this.visibleRows + 1;
    this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, this.rows() - this.visibleRows)));
  }

  refresh(): void {
    const base = this.opts.colour ?? (this.opts.style?.color as string | undefined) ?? C.ink;
    const dis = this.opts.disabledColour ?? C.fog;
    const sel = this.opts.selectedColour ?? base;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i]!;
      const t = this.texts[i]!;
      const r = this.rights[i]!;
      const row = Math.floor(i / this.columns);
      const col = i % this.columns;
      const visible = row >= this.scroll && row < this.scroll + this.visibleRows;
      const x = col * this.colW + 7;
      const y = (row - this.scroll) * this.rowH;
      t.setPosition(x, y).setVisible(visible);
      r.setPosition((col + 1) * this.colW - 2, y).setVisible(visible);
      const colour = it.disabled ? dis : i === this.idx ? sel : base;
      t.setColor(colour);
      r.setColor(it.disabled ? dis : base);
      t.setText(it.label);
      r.setText(it.right ?? '');
    }
    const row = Math.floor(this.idx / this.columns);
    const col = this.idx % this.columns;
    this.cursor.setPosition(col * this.colW, (row - this.scroll) * this.rowH + Math.floor((this.rowH - 7) / 2));
    this.cursor.setVisible(this.items.length > 0 && this.focused);
    // scroll arrows
    const g = this.arrows;
    g.clear();
    const right = this.columns * this.colW - 4;
    if (this.scroll > 0) {
      g.fillStyle(hex(C.ember), 1).fillRect(right, -3, 3, 1).fillRect(right + 1, -4, 1, 1);
    }
    if (this.scroll + this.visibleRows < this.rows()) {
      const by = this.visibleRows * this.rowH + 1;
      g.fillStyle(hex(C.ember), 1).fillRect(right, by, 3, 1).fillRect(right + 1, by + 1, 1, 1);
    }
  }

  setFocused(v: boolean): this {
    this.focused = v;
    this.refresh();
    return this;
  }

  private move(dx: number, dy: number): void {
    const n = this.items.length;
    if (n === 0) return;
    const wrap = this.opts.wrap ?? true;
    let i = this.idx;
    if (dy !== 0) i += dy * this.columns;
    if (dx !== 0) i += dx;
    if (i < 0) i = wrap ? n - 1 : 0;
    if (i >= n) i = wrap ? 0 : n - 1;
    if (i !== this.idx) {
      this.idx = i;
      this.ensureVisible();
      this.refresh();
      this.opts.onChange?.(this.idx);
    }
  }

  /** Returns true when the action was consumed. */
  handle(action: Action): boolean {
    if (!this.focused) return false;
    switch (action) {
      case 'up':
        this.move(0, -1);
        return true;
      case 'down':
        this.move(0, 1);
        return true;
      case 'left':
        if (this.columns > 1) {
          this.move(-1, 0);
          return true;
        }
        return false;
      case 'right':
        if (this.columns > 1) {
          this.move(1, 0);
          return true;
        }
        return false;
      case 'a': {
        const it = this.items[this.idx];
        if (!it) return true;
        if (it.disabled) {
          this.nudge();
          return true;
        }
        this.opts.onSelect?.(this.idx);
        return true;
      }
      case 'b':
        if (this.opts.onCancel) {
          this.opts.onCancel();
          return true;
        }
        return false;
    }
  }

  /** "nope" feedback: horizontal shake of the selected entry. */
  nudge(): void {
    const t = this.texts[this.idx];
    if (!t) return;
    const x0 = t.x;
    this.scene.tweens.add({ targets: t, x: x0 + 2, duration: 40, yoyo: true, repeat: 1, onComplete: () => t.setX(x0) });
  }
}
