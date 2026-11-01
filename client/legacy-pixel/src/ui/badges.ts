// Type badges ("ui:type:<id>" texture or a labelled pixel chip) and status chips.
import Phaser from 'phaser';
import type { StatusId, TypeId } from '../data/types';
import { C, TEXT, hex } from './theme';
import { STATUS_COLOR, STATUS_SHORT, TYPE_COLOR, TYPE_SHORT } from './labels';

const CHIP_H = 8;

function chip(scene: Phaser.Scene, label: string, fill: string, textColour: string): Phaser.GameObjects.Container {
  const t = scene.add.text(2, 0, label, { ...TEXT.log, color: textColour });
  const w = Math.max(14, Math.ceil(t.width) + 4);
  const g = scene.add.graphics();
  g.fillStyle(hex(C.ink), 1).fillRect(0, 0, w, CHIP_H);
  g.fillStyle(hex(fill), 1).fillRect(1, 1, w - 2, CHIP_H - 2);
  const c = scene.add.container(0, 0, [g, t]);
  c.setSize(w, CHIP_H);
  return c;
}

/** Returns a container positioned at (x, y) top-left; container.width is its width. */
export function typeBadge(scene: Phaser.Scene, x: number, y: number, type: TypeId): Phaser.GameObjects.Container {
  const key = `ui:type:${type}`;
  let c: Phaser.GameObjects.Container;
  if (scene.textures.exists(key)) {
    const img = scene.add.image(0, 0, key).setOrigin(0, 0);
    c = scene.add.container(0, 0, [img]);
    c.setSize(img.width, img.height);
  } else {
    c = chip(scene, TYPE_SHORT[type], TYPE_COLOR[type], C.ink);
  }
  c.setPosition(Math.round(x), Math.round(y));
  return c;
}

/** Row of type badges, returns the container and total width. */
export function typeBadges(scene: Phaser.Scene, x: number, y: number, types: readonly TypeId[], gap = 2): Phaser.GameObjects.Container {
  const row = scene.add.container(Math.round(x), Math.round(y));
  let cx = 0;
  for (const t of types) {
    const b = typeBadge(scene, cx, 0, t);
    row.add(b);
    cx += b.width + gap;
  }
  row.setSize(Math.max(0, cx - gap), CHIP_H);
  return row;
}

export class StatusBadge extends Phaser.GameObjects.Container {
  private current: StatusId | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, Math.round(x), Math.round(y));
    scene.add.existing(this);
  }

  get status(): StatusId | null {
    return this.current;
  }

  set(status: StatusId | null | undefined, pulse = false): void {
    const s = status ?? null;
    if (s === this.current) return;
    this.current = s;
    this.removeAll(true);
    if (!s) return;
    const c = chip(this.scene, STATUS_SHORT[s], STATUS_COLOR[s], C.cream);
    this.add(c);
    this.setSize(c.width, CHIP_H);
    if (pulse) {
      this.setScale(1);
      this.scene.tweens.add({ targets: c, y: -2, duration: 70, yoyo: true, repeat: 1 });
    }
  }
}
