// Bag: tabs per item kind, use items on a PokAI. Rules in systems/pokai.ts (applyItem).
import Phaser from 'phaser';
import { C, GAME_HEIGHT, GAME_WIDTH, TEXT, hex } from '../theme';
import { Panel } from '../panel';
import { MenuList } from '../menu-list';
import { pickParty } from '../party-screen';
import { ITEM_KIND_LABEL, ITEM_KIND_ORDER } from '../labels';
import { fmtCredits, wrapText } from '../format';
import { charsFor, txt } from '../text';
import { typeTokens } from '../typing';
import type { Action } from '../input';
import type { ItemKind } from '../../data/types';
import { db } from '../../data/db';
import { game } from '../../state/store';
import { applyItem, canUseItem, displayName, pendingEvolution } from '../../systems/pokai';
import type { Page, PageCtx } from './page';

const USABLE: ItemKind[] = ['heal', 'status_heal', 'boost'];

export class BagPage implements Page {
  private readonly root: Phaser.GameObjects.Container;
  private tabs: ItemKind[] = [];
  private tab = 0;
  private list?: MenuList;
  private entries: { id: string; n: number }[] = [];
  private detail: Phaser.GameObjects.GameObject[] = [];
  private tabText?: Phaser.GameObjects.Text;
  private readonly msg: Phaser.GameObjects.Text;
  private busy = false;
  private dead = false;

  constructor(private readonly ctx: PageCtx) {
    const sc = ctx.scene;
    this.root = sc.add.container(0, 0).setDepth(100);
    const bg = sc.add.graphics();
    bg.fillStyle(hex(C.ink), 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.root.add(bg);
    this.root.add(new Panel(sc, 0, 0, GAME_WIDTH, 11, { style: 'terminal', title: 'sac', shadow: false }));
    this.root.add(new Panel(sc, 3, 14, 150, 142, { style: 'night' }));
    this.msg = txt(sc, 4, GAME_HEIGHT - 20, '', { ...TEXT.small, color: C.cream, wordWrap: { width: 312 } });
    this.root.add(this.msg);
    this.root.add(txt(sc, 4, GAME_HEIGHT - 9, '< > catégorie   A : utiliser   B : retour', { ...TEXT.log, color: C.fog }));
    this.rebuild();
  }

  private counts(): Map<ItemKind, { id: string; n: number }[]> {
    const m = new Map<ItemKind, { id: string; n: number }[]>();
    for (const [id, n] of Object.entries(game.state.bag)) {
      if (n <= 0 || !db.hasItem(id)) continue;
      const k = db.item(id).kind;
      const arr = m.get(k) ?? [];
      arr.push({ id, n });
      m.set(k, arr);
    }
    return m;
  }

  private rebuild(): void {
    const sc = this.ctx.scene;
    const byKind = this.counts();
    this.tabs = ITEM_KIND_ORDER.filter((k) => (byKind.get(k)?.length ?? 0) > 0);
    this.tab = Math.min(this.tab, Math.max(0, this.tabs.length - 1));
    this.list?.destroy();
    this.tabText?.destroy();
    const kind = this.tabs[this.tab];
    this.entries = kind ? (byKind.get(kind) ?? []) : [];
    this.tabText = txt(sc, 8, 17, kind ? `< ${ITEM_KIND_LABEL[kind]} >` : 'Sac vide', { ...TEXT.small, color: C.gold });
    this.root.add(this.tabText);
    this.list = new MenuList(sc, {
      x: 8,
      y: 30,
      width: 142,
      rowH: 11,
      visibleRows: 11,
      items: this.entries.map((e) => ({ label: db.item(e.id).name, right: `x${e.n}` })),
      style: { ...TEXT.small, color: C.cream },
      colour: C.cream,
      onChange: () => this.renderDetail(),
      onSelect: (i) => void this.use(i),
      onCancel: () => this.ctx.close(),
      wrap: false,
    });
    this.root.add(this.list);
    this.renderDetail();
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
    add(new Panel(sc, 157, 14, 160, 142, { style: 'night' }));
    const e = this.entries[this.list?.index ?? 0];
    if (!e) {
      add(txt(sc, 164, 20, 'Rien ici. Le sac est aussi vide\nque la roadmap.', { ...TEXT.small, color: C.fog }));
      return;
    }
    const it = db.item(e.id);
    add(txt(sc, 164, 19, it.name, { ...TEXT.body, color: C.gold }));
    add(txt(sc, 164, 34, wrapText(it.description, charsFor(sc, TEXT.log, 146)).join('\n'), { ...TEXT.log, color: C.cream, lineSpacing: 1 }));
    add(txt(sc, 164, 112, `Possédé : ${e.n}`, { ...TEXT.log, color: C.fog }));
    if (it.price > 0) add(txt(sc, 164, 122, `Valeur : ${fmtCredits(it.price)}`, { ...TEXT.log, color: C.fog }));
    const use = USABLE.includes(it.kind) ? 'A : utiliser' : it.kind === 'api_key' ? 'Sert à onboarder, en combat' : 'Objet clé';
    add(txt(sc, 164, 142, use, { ...TEXT.log, color: USABLE.includes(it.kind) ? C.leaf : C.fog }));
  }

  private async say(text: string): Promise<void> {
    await typeTokens(this.ctx.scene, this.ctx.router, text, (s) => this.msg.setText(s), 18);
  }

  private async use(i: number): Promise<void> {
    const e = this.entries[i];
    if (!e || this.busy) return;
    const it = db.item(e.id);
    if (!USABLE.includes(it.kind)) {
      this.list?.nudge();
      await this.say(it.kind === 'api_key' ? 'Une Clé API s\'utilise en combat : choisis « Onboarder ».' : 'Cet objet ne se « consomme » pas.');
      return;
    }
    this.busy = true;
    const party = game.state.party;
    const idx = await pickParty(this.ctx.scene, this.ctx.router, {
      party,
      title: `${it.name} sur…`,
      validate: (p) => (canUseItem(e.id, p) ? null : 'Ça n\'aurait aucun effet.'),
      depth: 450,
    });
    const target = idx === null ? undefined : party[idx];
    if (!target) {
      this.busy = false;
      return;
    }
    const res = applyItem(e.id, target, game.state.vibeurClass);
    if (res.ok) {
      game.removeItem(e.id);
      const parts: string[] = [`${displayName(target)} : ${it.name} utilisé.`];
      if (res.healed > 0) parts.push(`+${res.healed} Contexte.`);
      for (const ev of res.events) {
        if (ev.kind === 'levelup') parts.push(`Niveau ${ev.level} !`);
        else if (ev.kind === 'learn') parts.push(`Apprend ${db.hasMove(ev.move) ? db.move(ev.move).name : ev.move}.`);
      }
      await this.say(parts.join(' '));
      const opts = pendingEvolution(target, game.state.vibeurClass);
      if (res.events.some((ev) => ev.kind === 'evolve_ready') && opts.length > 0) {
        await this.ctx.evolve(target.uid, opts);
        if (this.dead) return;
      }
    }
    this.busy = false;
    this.rebuild();
  }

  handle(a: Action): void {
    if (this.busy) return;
    if (a === 'left' && this.tabs.length > 1) {
      this.tab = (this.tab + this.tabs.length - 1) % this.tabs.length;
      this.rebuild();
    } else if (a === 'right' && this.tabs.length > 1) {
      this.tab = (this.tab + 1) % this.tabs.length;
      this.rebuild();
    } else if (!this.list?.handle(a) && a === 'b') this.ctx.close();
  }

  destroy(): void {
    this.dead = true;
    this.root.destroy();
  }
}
