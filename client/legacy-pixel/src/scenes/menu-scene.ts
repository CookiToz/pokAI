// Pause menu: Équipe, Sac, Neurodex, Badges, Sauvegarder, Fermer.
import Phaser from 'phaser';
import { SCENES } from './keys';
import type { EvolutionSceneData, SimpleOverlayData } from './contracts';
import { C, TEXT } from '../ui/theme';
import { db } from '../data/db';
import { game } from '../state/store';
import { api } from '../net/api';
import { InputRouter, type Action } from '../ui/input';
import { fadeIn, fadeOut, pokaiTex } from '../ui/gfx';
import { drawTerminal } from '../ui/backdrops';
import { Panel } from '../ui/panel';
import { MenuList } from '../ui/menu-list';
import { HpBar } from '../ui/bars';
import { CLASS_LABEL } from '../ui/labels';
import { fmtCredits } from '../ui/format';
import { typeTokens } from '../ui/typing';
import { txt } from '../ui/text';
import { runOverlay } from '../ui/overlay';
import { maxContext } from '../systems/pokai';
import type { Page, PageCtx } from '../ui/pages/page';
import { TeamPage } from '../ui/pages/team-page';
import { BagPage } from '../ui/pages/bag-page';
import { DexPage } from '../ui/pages/dex-page';
import { BadgesPage } from '../ui/pages/badges-page';

const ENTRIES = ['Équipe', 'Sac', 'Neurodex', 'Badges', 'Sauvegarder', 'Fermer'] as const;

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h${String(m).padStart(2, '0')}`;
}

export class MenuScene extends Phaser.Scene {
  private d!: SimpleOverlayData;
  private router!: InputRouter;
  private list!: MenuList;
  private page: Page | null = null;
  private msg!: Phaser.GameObjects.Text;
  private status: Phaser.GameObjects.GameObject[] = [];
  private busy = false;
  private finished = false;

  constructor() {
    super(SCENES.Menu);
  }

  init(data: SimpleOverlayData): void {
    this.d = data;
  }

  create(): void {
    this.page = null;
    this.status = [];
    this.busy = false;
    this.finished = false;
    this.router = new InputRouter(this);
    drawTerminal(this);
    fadeIn(this, 120);
    new Panel(this, 214, 4, 102, 96, { style: 'paper' });
    this.list = new MenuList(this, {
      x: 222,
      y: 11,
      width: 90,
      rowH: 14,
      items: ENTRIES.map((label) => ({ label })),
      style: TEXT.body,
      colour: C.ink,
      onSelect: (i) => this.choose(i),
      onCancel: () => this.close(),
    });
    new Panel(this, 214, 104, 102, 72, { style: 'night' });
    this.msg = txt(this, 220, 110, 'B : fermer', { ...TEXT.log, color: C.fog, wordWrap: { width: 90 } });
    this.renderStatus();
    this.router.set((a) => this.onKey(a));
  }

  private renderStatus(): void {
    this.status.forEach((o) => o.destroy());
    this.status = [];
    const s = game.state;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.status.push(o);
      return o;
    };
    add(new Panel(this, 4, 4, 206, 172, { style: 'night', title: s.playerName }));
    const rows: [string, string][] = [
      ['Classe', CLASS_LABEL[s.vibeurClass] ?? s.vibeurClass],
      ['Crédits GPU', fmtCredits(s.credits)],
      ['Temps de jeu', fmtTime(s.playTimeSec)],
      ['Badges', String(s.badges.length)],
    ];
    const mvp = db.allForms().filter((f) => db.lineOfForm(f.id).mvp).length;
    rows.push(['Neurodex', `${s.caught.length} / ${mvp}`]);
    rows.forEach(([k, v], i) => {
      add(txt(this, 12, 20 + i * 11, k, { ...TEXT.small, color: C.fog }));
      add(txt(this, 202, 20 + i * 11, v, { ...TEXT.small, color: C.cream }).setOrigin(1, 0));
    });
    add(txt(this, 12, 82, 'Équipe', { ...TEXT.small, color: C.gold }));
    s.party.slice(0, 6).forEach((p, i) => {
      const x = 8 + (i % 3) * 66;
      const y = 94 + Math.floor(i / 3) * 40;
      add(this.add.image(x + 16, y + 16, pokaiTex(this, p.form, { sealed: p.sealed === true })).setAlpha(p.context > 0 ? 1 : 0.4));
      const bar = new HpBar(this, x + 32, y + 8, 28, 3);
      bar.setRatio(p.context / Math.max(1, maxContext(p)));
      add(bar);
      add(txt(this, x + 32, y + 15, `Nv.${p.level}`, { ...TEXT.log, color: C.cream }));
    });
  }

  private onKey(a: Action): void {
    if (this.busy || this.finished) return;
    if (this.page) {
      this.page.handle(a);
      return;
    }
    this.list.handle(a);
  }

  private pageCtx(): PageCtx {
    return {
      scene: this,
      router: this.router,
      close: () => this.closePage(),
      evolve: async (uid, options) => {
        await runOverlay<string | null>(this, SCENES.Evolution, (done) => {
          const data: EvolutionSceneData = { pokaiUid: uid, options, onDone: done };
          return data;
        });
      },
    };
  }

  private openPage(p: Page): void {
    this.page = p;
    this.list.setFocused(false);
  }

  private closePage(): void {
    this.page?.destroy();
    this.page = null;
    this.list.setFocused(true);
    this.renderStatus();
  }

  private choose(i: number): void {
    switch (ENTRIES[i]) {
      case 'Équipe':
        this.openPage(new TeamPage(this.pageCtx()));
        break;
      case 'Sac':
        this.openPage(new BagPage(this.pageCtx()));
        break;
      case 'Neurodex':
        this.openPage(new DexPage(this.pageCtx()));
        break;
      case 'Badges':
        this.openPage(new BadgesPage(this.pageCtx()));
        break;
      case 'Sauvegarder':
        void this.save();
        break;
      case 'Fermer':
        this.close();
        break;
    }
  }

  private async save(): Promise<void> {
    this.busy = true;
    const ok = game.save();
    // Optional cloud sync: never blocks, never fails loudly.
    if (ok) void api.pushSave().catch(() => false);
    await typeTokens(
      this,
      this.router,
      ok ? 'Sauvegarde envoyée au cloud… ou presque.' : 'Sauvegarde impossible : le stockage local est bloqué.',
      (s) => this.msg.setText(s).setColor(ok ? C.leaf : C.ember),
      24,
    );
    this.busy = false;
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
