// The Store: buy items with GPU credits. Satirical clerk. Rules: game.spendCredits / game.addItem.
import Phaser from 'phaser';
import { SCENES } from './keys';
import type { SimpleOverlayData } from './contracts';
import { C, TEXT } from '../ui/theme';
import { db } from '../data/db';
import { game } from '../state/store';
import { InputRouter, type Action } from '../ui/input';
import { drawBox, drawFrame, fadeIn, fadeOut, resolveTex } from '../ui/gfx';
import { drawTerminal } from '../ui/backdrops';
import { Panel } from '../ui/panel';
import { MenuList } from '../ui/menu-list';
import { fmtCredits, fmtInt, wrapText } from '../ui/format';
import { charsFor, txt } from '../ui/text';
import { typeTokens } from '../ui/typing';
import type { Item } from '../data/types';

const GREETINGS = [
  'Bienvenue au Store. Tout est en abonnement, sauf la sortie.',
  'Nos prix ont été optimisés par un modèle. Il a dit « plus ».',
  'Vous avez un compte ? Non ? Dommage, il en faut un pour acheter.',
];
const AFTER_BUY = [
  'Merci ! Votre satisfaction sera facturée séparément.',
  'Acheté. Les remboursements sont gérés par un chatbot. Bonne chance.',
  'Paiement accepté. Le reçu est dans votre boîte « spam ».',
  'Excellent choix. Il sera obsolète jeudi.',
];
const POOR = ['Fonds insuffisants. Avez-vous essayé de demander plus de GPU ?', 'Solde trop bas. Notre IA vous suggère de travailler.'];

export class StoreScene extends Phaser.Scene {
  private d!: SimpleOverlayData;
  private router!: InputRouter;
  private items: Item[] = [];
  private list!: MenuList;
  private detail: Phaser.GameObjects.GameObject[] = [];
  private clerk!: Phaser.GameObjects.Text;
  private qtyNodes: Phaser.GameObjects.GameObject[] = [];
  private qty = 0;
  private qtyItem: Item | null = null;
  private quip = 0;
  private finished = false;
  private talking = 0;

  constructor() {
    super(SCENES.Store);
  }

  init(data: SimpleOverlayData): void {
    this.d = data;
  }

  create(): void {
    this.detail = [];
    this.qtyNodes = [];
    this.qtyItem = null;
    this.qty = 0;
    this.quip = 0;
    this.finished = false;
    this.talking = 0;
    this.router = new InputRouter(this);
    drawTerminal(this);
    fadeIn(this, 120);
    this.items = db.allItems().filter((i) => i.price > 0).sort((a, b) => a.price - b.price);

    // clerk strip
    new Panel(this, 4, 4, 312, 40, { style: 'paper' });
    const portrait = resolveTex(this, ['portrait:store_clerk', 'portrait:stagiaire', 'portrait:lecube'], 32, 32);
    this.add.image(26, 24, portrait);
    this.clerk = txt(this, 46, 10, '', { ...TEXT.small, wordWrap: { width: 262 } });
    void this.say(GREETINGS[Math.floor(Math.random() * GREETINGS.length)] ?? GREETINGS[0] ?? '');

    new Panel(this, 4, 48, 160, 128, { style: 'night' });
    this.list = new MenuList(this, {
      x: 10,
      y: 54,
      width: 150,
      rowH: 11,
      visibleRows: 10,
      items: this.items.map((i) => ({ label: i.name, right: fmtCredits(i.price) })),
      style: { ...TEXT.small, color: C.cream },
      colour: C.cream,
      onChange: () => this.renderDetail(),
      onSelect: (i) => this.startQty(i),
      onCancel: () => this.close(),
      wrap: false,
    });
    this.router.set((a) => this.onKey(a));
    this.renderDetail();
  }

  private async say(text: string): Promise<void> {
    const id = ++this.talking;
    await typeTokens(this, this.router, text, (s) => {
      if (id === this.talking) this.clerk.setText(s);
    }, 20);
  }

  private renderDetail(): void {
    this.detail.forEach((o) => o.destroy());
    this.detail = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.detail.push(o);
      return o;
    };
    add(new Panel(this, 168, 48, 148, 128, { style: 'night' }));
    add(txt(this, 176, 53, `Solde : ${fmtCredits(game.state.credits)}`, { ...TEXT.small, color: C.gold }));
    const it = this.items[this.list.index];
    if (!it) {
      add(txt(this, 176, 70, 'Rupture de stock. De tout.', { ...TEXT.small, color: C.fog }));
      return;
    }
    add(txt(this, 176, 68, it.name, { ...TEXT.body, color: C.cream }));
    add(txt(this, 176, 83, wrapText(it.description, charsFor(this, TEXT.log, 134)).join('\n'), { ...TEXT.log, color: C.fog, lineSpacing: 1 }));
    add(txt(this, 176, 140, `Possédé : ${game.itemCount(it.id)}`, { ...TEXT.log, color: C.cream }));
    add(txt(this, 176, 150, `Prix : ${fmtCredits(it.price)}`, { ...TEXT.log, color: C.gold }));
    add(txt(this, 176, 163, this.qtyItem ? '' : 'A : acheter   B : sortir', { ...TEXT.log, color: C.fog }));
  }

  // ---------------------------------------------------------------- quantity picker

  private startQty(i: number): void {
    const it = this.items[i];
    if (!it) return;
    if (game.state.credits < it.price) {
      this.list.nudge();
      void this.say(POOR[this.quip++ % POOR.length] ?? '');
      return;
    }
    this.qtyItem = it;
    this.qty = 1;
    this.renderQty();
  }

  private maxQty(it: Item): number {
    return Math.max(1, Math.min(99, Math.floor(game.state.credits / it.price)));
  }

  private renderQty(): void {
    this.qtyNodes.forEach((o) => o.destroy());
    this.qtyNodes = [];
    const it = this.qtyItem;
    if (!it) return;
    const g = this.add.graphics().setDepth(300);
    drawBox(g, 70, 62, 180, 52, C.paper, C.ink, C.ink);
    drawFrame(g, 72, 64, 176, 48, C.dusk);
    this.qtyNodes.push(g);
    const total = it.price * this.qty;
    this.qtyNodes.push(
      txt(this, 160, 68, it.name, { ...TEXT.body }).setOrigin(0.5, 0).setDepth(301),
      txt(this, 160, 82, `<  x ${this.qty}  >`, { ...TEXT.body, color: C.ember }).setOrigin(0.5, 0).setDepth(301),
      txt(this, 160, 96, `Total : ${fmtInt(total)} cr    haut/bas : +10/-10`, { ...TEXT.log, color: C.ink }).setOrigin(0.5, 0).setDepth(301),
    );
  }

  private closeQty(): void {
    this.qtyNodes.forEach((o) => o.destroy());
    this.qtyNodes = [];
    this.qtyItem = null;
    this.renderDetail();
  }

  private buy(): void {
    const it = this.qtyItem;
    if (!it) return;
    const cost = it.price * this.qty;
    if (!game.spendCredits(cost)) {
      void this.say(POOR[this.quip++ % POOR.length] ?? '');
      return;
    }
    game.addItem(it.id, this.qty);
    this.closeQty();
    void this.say(`${this.qty} × ${it.name} : ${AFTER_BUY[this.quip++ % AFTER_BUY.length] ?? ''}`);
  }

  private onKey(a: Action): void {
    if (this.finished) return;
    const it = this.qtyItem;
    if (it) {
      const max = this.maxQty(it);
      if (a === 'left') this.qty = Math.max(1, this.qty - 1);
      else if (a === 'right') this.qty = Math.min(max, this.qty + 1);
      else if (a === 'down') this.qty = Math.max(1, this.qty - 10);
      else if (a === 'up') this.qty = Math.min(max, this.qty + 10);
      else if (a === 'a') {
        this.buy();
        return;
      } else if (a === 'b') {
        this.closeQty();
        return;
      }
      this.renderQty();
      return;
    }
    this.list.handle(a);
  }

  private close(): void {
    if (this.finished) return;
    this.finished = true;
    this.router.clear();
    void fadeOut(this, 120).then(() => {
      this.d.onDone();
      this.scene.stop();
    });
  }
}

