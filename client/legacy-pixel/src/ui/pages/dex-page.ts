// Neurodex: caught = sprite, seen = silhouette, unknown = "?" and non-MVP = "Données d'entraînement insuffisantes".
import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, TEXT, hex } from '../theme';
import { Panel } from '../panel';
import { MenuList, type MenuItem } from '../menu-list';
import { typeBadges } from '../badges';
import { pokaiTex } from '../gfx';
import { LICENCE_LABEL } from '../labels';
import { padLeft, wrapText } from '../format';
import { charsFor, txt } from '../text';
import type { Action } from '../input';
import type { Form, Line } from '../../data/types';
import { db } from '../../data/db';
import { game } from '../../state/store';
import { api } from '../../net/api';
import type { Page, PageCtx } from './page';

interface Entry {
  form: Form;
  line: Line;
}

const DET = { x: 146, y: 14, w: 171, h: 150 };

export class DexPage implements Page {
  private readonly root: Phaser.GameObjects.Container;
  private readonly entries: Entry[];
  private readonly list: MenuList;
  private detail: Phaser.GameObjects.GameObject[] = [];
  private global: Record<string, string> | null = null;
  private dead = false;

  constructor(private readonly ctx: PageCtx) {
    const sc = ctx.scene;
    this.root = sc.add.container(0, 0).setDepth(100);
    const bg = sc.add.graphics();
    bg.fillStyle(hex(C.ink), 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.root.add(bg);
    const entries: Entry[] = [];
    for (const line of db.lines) for (const form of line.forms) entries.push({ form, line });
    entries.sort((a, b) => a.line.dexNo - b.line.dexNo || a.form.stage - b.form.stage);
    this.entries = entries;
    const mvp = entries.filter((e) => e.line.mvp);
    const caught = mvp.filter((e) => game.state.caught.includes(e.form.id)).length;
    this.root.add(new Panel(sc, 0, 0, GAME_WIDTH, 11, { style: 'terminal', title: `neurodex ${caught}/${mvp.length} onboardés`, shadow: false }));
    this.root.add(new Panel(sc, 3, 14, 140, 150, { style: 'night' }));
    this.list = new MenuList(sc, {
      x: 7,
      y: 17,
      width: 134,
      rowH: 9,
      visibleRows: 15,
      items: entries.map((e) => this.item(e)),
      style: { ...TEXT.small, color: C.cream },
      colour: C.cream,
      onChange: () => this.renderDetail(),
      onCancel: () => ctx.close(),
      wrap: false,
    });
    this.root.add(this.list);
    this.root.add(txt(sc, 4, GAME_HEIGHT - 9, 'Haut/Bas : parcourir   B : retour', { ...TEXT.log, color: C.fog }));
    this.renderDetail();
    // world first-catcher map (never blocks the page)
    api
      .globalDex()
      .then((m) => {
        if (this.dead) return;
        this.global = m;
        this.renderDetail();
      })
      .catch(() => undefined);
  }

  private state(e: Entry): 'caught' | 'seen' | 'unknown' | 'locked' {
    if (!e.line.mvp) return 'locked';
    if (game.state.caught.includes(e.form.id)) return 'caught';
    if (game.state.seen.includes(e.form.id)) return 'seen';
    return 'unknown';
  }

  private item(e: Entry): MenuItem {
    const s = this.state(e);
    const no = padLeft(String(e.line.dexNo), 3).replace(/ /g, '0');
    return { label: `${no} ${s === 'caught' || s === 'seen' ? e.form.name : '???'}`, right: s === 'caught' ? 'OK' : s === 'seen' ? 'vu' : '' };
  }

  private renderDetail(): void {
    this.detail.forEach((o) => o.destroy());
    this.detail = [];
    const sc = this.ctx.scene;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.detail.push(o);
      this.root.add(o);
      return o;
    };
    add(new Panel(sc, DET.x, DET.y, DET.w, DET.h, { style: 'night' }));
    const e = this.entries[this.list.index];
    if (!e) return;
    const s = this.state(e);
    const cx = DET.x + DET.w / 2;
    const img = add(sc.add.image(cx, DET.y + 40, s === 'caught' || s === 'seen' ? pokaiTex(sc, e.form.id) : pokaiTex(sc, 'unknown')).setScale(2));
    if (s === 'seen') img.setTintFill(hex(C.ink));
    if (s === 'locked') {
      add(txt(sc, cx, DET.y + 80, '???', { ...TEXT.body, color: C.fog }).setOrigin(0.5, 0));
      add(txt(sc, cx, DET.y + 96, wrapText('Données d\'entraînement insuffisantes', charsFor(sc, TEXT.small, DET.w - 16)).join('\n'), { ...TEXT.small, color: C.ember, align: 'center' }).setOrigin(0.5, 0));
      return;
    }
    if (s === 'unknown') {
      add(txt(sc, cx, DET.y + 80, '???', { ...TEXT.body, color: C.fog }).setOrigin(0.5, 0));
      add(txt(sc, cx, DET.y + 96, 'Jamais croisé.', { ...TEXT.small, color: C.fog }).setOrigin(0.5, 0));
      return;
    }
    add(txt(sc, cx, DET.y + 76, e.form.name, { ...TEXT.small, color: C.cream }).setOrigin(0.5, 0));
    add(typeBadges(sc, DET.x + 8, DET.y + 87, e.form.types));
    add(txt(sc, DET.x + DET.w - 6, DET.y + 88, `${e.line.publisher} · ${LICENCE_LABEL[e.form.licence]}`, { ...TEXT.log, color: C.gold }).setOrigin(1, 0));
    if (s === 'seen') {
      add(txt(sc, DET.x + 8, DET.y + 100, 'Onboarde-le pour débloquer sa fiche.', { ...TEXT.log, color: C.fog }));
    } else {
      const desc = wrapText(e.form.description, charsFor(sc, TEXT.log, DET.w - 16)).slice(0, 5).join('\n');
      add(txt(sc, DET.x + 8, DET.y + 100, desc, { ...TEXT.log, color: C.cream, lineSpacing: 1 }));
    }
    const first = this.global?.[e.form.id];
    const line = this.global === null ? 'Neurodex mondial : hors ligne' : first ? `Premier onboardeur mondial : ${first}` : 'Personne ne l\'a encore onboardé.';
    add(txt(sc, DET.x + 8, DET.y + DET.h - 11, line, { ...TEXT.log, color: first ? C.leaf : C.fog }));
  }

  handle(a: Action): void {
    this.list.handle(a);
  }

  destroy(): void {
    this.dead = true;
    this.root.destroy();
  }
}
