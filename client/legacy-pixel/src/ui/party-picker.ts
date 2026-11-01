// Grid / list of party members with sprite, name, level, HP bar and status.
// Used by Battle (switch, item target), Menu (team, item target) and Store-like pickers.
import Phaser from 'phaser';
import { C, TEXT, hex } from './theme';
import { drawBox, drawFrame, pokaiTex } from './gfx';
import { HpBar } from './bars';
import { StatusBadge } from './badges';
import { txt } from './text';
import type { Action } from './input';
import type { PokaiInstance } from '../state/types';
import { displayName, maxContext } from '../systems/pokai';

export interface PartyPickerOpts {
  x: number;
  y: number;
  party: PokaiInstance[];
  columns: 1 | 2;
  cellW: number;
  cellH: number;
  /** 1 = 32px sprite, 0.5 = 16px sprite. */
  spriteScale: 1 | 0.5;
  /** Index of the active battler (tagged "EN JEU"). */
  activeIndex?: number;
  onSelect?: (index: number) => void;
  onCancel?: () => void;
  onChange?: (index: number) => void;
}

export class PartyPicker extends Phaser.GameObjects.Container {
  private idx = 0;
  /** Index picked up for reordering (drawn in gold). */
  marked: number | null = null;
  private party: PokaiInstance[];
  private readonly cells: Phaser.GameObjects.Container[] = [];
  private readonly sel: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly o: PartyPickerOpts,
  ) {
    super(scene, Math.round(o.x), Math.round(o.y));
    this.party = o.party;
    this.sel = scene.add.graphics();
    scene.add.existing(this);
    this.refresh();
  }

  get index(): number {
    return this.idx;
  }

  get current(): PokaiInstance | undefined {
    return this.party[this.idx];
  }

  setParty(party: PokaiInstance[]): void {
    this.party = party;
    this.idx = Math.min(this.idx, Math.max(0, party.length - 1));
    this.refresh();
  }

  setIndex(i: number, silent = false): void {
    this.idx = Math.max(0, Math.min(i, this.party.length - 1));
    this.drawSel();
    if (!silent) this.o.onChange?.(this.idx);
  }

  private cellPos(i: number): { x: number; y: number } {
    const col = i % this.o.columns;
    const row = Math.floor(i / this.o.columns);
    return { x: col * (this.o.cellW + 2), y: row * (this.o.cellH + 2) };
  }

  refresh(): void {
    this.cells.forEach((c) => c.destroy());
    this.cells.length = 0;
    this.party.forEach((p, i) => {
      const { x, y } = this.cellPos(i);
      const c = this.buildCell(p, i);
      c.setPosition(x, y);
      this.cells.push(c);
    });
    this.removeAll();
    this.add([...this.cells, this.sel]);
    this.drawSel();
  }

  private buildCell(p: PokaiInstance, i: number): Phaser.GameObjects.Container {
    const { cellW: w, cellH: h, spriteScale } = this.o;
    const sc = this.scene;
    const fainted = p.context <= 0;
    const g = sc.add.graphics();
    drawBox(g, 0, 0, w, h, C.night, C.plum);
    const c = sc.add.container(0, 0, [g]);
    const spriteSize = 32 * spriteScale;
    const img = sc
      .add.image(2 + Math.round(spriteSize / 2), Math.round(h / 2), pokaiTex(sc, p.form, { sealed: p.sealed === true }))
      .setScale(spriteScale)
      .setAlpha(fainted ? 0.4 : 1);
    c.add(img);
    const tx = Math.round(spriteSize) + 5;
    c.add(txt(sc, tx, 2, displayName(p), { ...TEXT.small, color: fainted ? C.fog : C.cream }));
    c.add(txt(sc, w - 4, 3, `Nv.${p.level}`, { ...TEXT.log, color: C.gold }).setOrigin(1, 0));
    const max = Math.max(1, maxContext(p));
    const barY = spriteScale === 1 ? 15 : 15;
    const barW = spriteScale === 1 ? w - tx - 6 : w - tx - 44;
    const bar = new HpBar(sc, tx, barY, barW, 3);
    bar.setRatio(p.context / max);
    c.add(bar);
    if (fainted) {
      c.add(txt(sc, spriteScale === 1 ? tx : w - 4, spriteScale === 1 ? 21 : 12, 'HORS SERVICE', { ...TEXT.log, color: C.ember }).setOrigin(spriteScale === 1 ? 0 : 1, 0));
    } else {
      const hpStr = `${Math.max(0, p.context)}/${max}`;
      if (spriteScale === 1) c.add(txt(sc, w - 4, 21, hpStr, { ...TEXT.log, color: C.cream }).setOrigin(1, 0));
      else c.add(txt(sc, w - 4, 12, hpStr, { ...TEXT.log, color: C.cream }).setOrigin(1, 0));
    }
    if (p.status) {
      const sb = new StatusBadge(sc, spriteScale === 1 ? tx : tx, spriteScale === 1 ? 25 : 18);
      sb.set(p.status);
      if (spriteScale === 1 && !fainted) c.add(sb);
      else if (spriteScale === 0.5) c.add(sb);
    }
    if (this.o.activeIndex === i) c.add(txt(sc, w - 4, spriteScale === 1 ? 26 : 18, 'EN JEU', { ...TEXT.log, color: C.leaf }).setOrigin(1, 0));
    return c;
  }

  private drawSel(): void {
    const g = this.sel;
    g.clear();
    const { cellW: w, cellH: h } = this.o;
    if (this.marked !== null) {
      const m = this.cellPos(this.marked);
      drawFrame(g, m.x - 1, m.y - 1, w + 2, h + 2, C.gold);
      drawFrame(g, m.x, m.y, w, h, C.gold);
    }
    const p = this.cellPos(this.idx);
    drawFrame(g, p.x - 1, p.y - 1, w + 2, h + 2, C.ember);
    g.fillStyle(hex(C.ember), 1);
    g.fillRect(p.x - 1, p.y - 1, 3, 3);
  }

  /** Returns true when the action was consumed. */
  handle(action: Action): boolean {
    const n = this.party.length;
    if (n === 0) {
      if (action === 'b') this.o.onCancel?.();
      return action === 'b';
    }
    const cols = this.o.columns;
    let i = this.idx;
    switch (action) {
      case 'up':
        i = i - cols >= 0 ? i - cols : i;
        break;
      case 'down':
        i = i + cols < n ? i + cols : i;
        break;
      case 'left':
        if (cols === 2 && i % 2 === 1) i -= 1;
        break;
      case 'right':
        if (cols === 2 && i % 2 === 0 && i + 1 < n) i += 1;
        break;
      case 'a':
        this.o.onSelect?.(this.idx);
        return true;
      case 'b':
        this.o.onCancel?.();
        return true;
    }
    if (i !== this.idx) {
      this.idx = i;
      this.drawSel();
      this.o.onChange?.(i);
    }
    return true;
  }

  get totalHeight(): number {
    return Math.ceil(this.party.length / this.o.columns) * (this.o.cellH + 2);
  }
}
