// Badges: one pixel badge per gym leader / story trainer that grants one.
import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, TEXT, hex } from '../theme';
import { Panel } from '../panel';
import { drawBox } from '../gfx';
import { badgeName } from '../labels';
import { txt } from '../text';
import type { Action } from '../input';
import { db } from '../../data/db';
import { game } from '../../state/store';
import type { Page, PageCtx } from './page';

const ICON_COLOURS = [C.ember, C.gold, C.leaf, C.sea, C.rose, C.sky, C.steel, C.cream];

export class BadgesPage implements Page {
  private readonly root: Phaser.GameObjects.Container;

  constructor(private readonly ctx: PageCtx) {
    const sc = ctx.scene;
    this.root = sc.add.container(0, 0).setDepth(100);
    const bg = sc.add.graphics();
    bg.fillStyle(hex(C.ink), 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.root.add(bg);
    this.root.add(new Panel(sc, 0, 0, GAME_WIDTH, 11, { style: 'terminal', title: 'badges', shadow: false }));

    const all: { id: string; giver: string }[] = [];
    for (const t of db.allTrainers()) if (t.badge && !all.some((b) => b.id === t.badge)) all.push({ id: t.badge, giver: t.name });
    for (const id of game.state.badges) if (!all.some((b) => b.id === id)) all.push({ id, giver: '?' });
    const owned = new Set(game.state.badges);
    this.root.add(txt(sc, 4, 16, `${owned.size} / ${all.length} badges`, { ...TEXT.small, color: C.gold }));
    all.forEach((b, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 4 + col * 158;
      const y = 28 + row * 28;
      if (y + 26 > GAME_HEIGHT - 12) return;
      const has = owned.has(b.id);
      const g = sc.add.graphics();
      drawBox(g, x, y, 154, 26, C.night, C.plum);
      // diamond badge icon (pixel rows)
      const c = has ? (ICON_COLOURS[i % ICON_COLOURS.length] ?? C.gold) : C.dusk;
      g.fillStyle(hex(C.ink), 1).fillRect(x + 5, y + 5, 16, 16);
      g.fillStyle(hex(c), 1);
      for (let k = 0; k < 6; k++) g.fillRect(x + 13 - k - 1, y + 6 + k, (k + 1) * 2, 1);
      for (let k = 0; k < 6; k++) g.fillRect(x + 13 - (5 - k) - 1, y + 12 + k, (5 - k + 1) * 2, 1);
      if (has) g.fillStyle(hex(C.cream), 1).fillRect(x + 12, y + 9, 2, 2);
      this.root.add(g);
      this.root.add(txt(sc, x + 26, y + 5, has ? badgeName(b.id) : '???', { ...TEXT.small, color: has ? C.cream : C.fog }));
      this.root.add(txt(sc, x + 26, y + 15, has ? `battu : ${b.giver}` : 'Pas encore obtenu', { ...TEXT.log, color: C.fog }));
    });
    this.root.add(txt(sc, 4, GAME_HEIGHT - 9, 'B : retour', { ...TEXT.log, color: C.fog }));
  }

  handle(a: Action): void {
    if (a === 'b' || a === 'a') this.ctx.close();
  }

  destroy(): void {
    this.root.destroy();
  }
}
