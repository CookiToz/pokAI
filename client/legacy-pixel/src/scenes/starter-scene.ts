// Starter choice on LeCube's table: Claude Haiku, Phi-1 or Gemma.
import Phaser from 'phaser';
import { SCENES } from './keys';
import type { SimpleOverlayData } from './contracts';
import { C, GAME_WIDTH, TEXT } from '../ui/theme';
import { db } from '../data/db';
import { game } from '../state/store';
import { createPokai } from '../systems/pokai';
import { createRng, randomSeed } from '../systems/rng';
import { InputRouter, type Action } from '../ui/input';
import { drawBox, drawFrame, fadeIn, fadeOut, pokaiTex, tweenP, wait } from '../ui/gfx';
import { drawTable, platform } from '../ui/backdrops';
import { Panel } from '../ui/panel';
import { typeBadges } from '../ui/badges';
import { choose } from '../ui/choice-box';
import { sparkleBurst } from '../ui/fx';
import { LICENCE_LABEL } from '../ui/labels';
import { typeTokens } from '../ui/typing';
import { txt } from '../ui/text';

interface Choice {
  form: string;
  pitch: string;
}

const CHOICES: Choice[] = [
  { form: 'claude_haiku', pitch: 'Rapide, poli, et il s\'excuse avant chaque réponse.' },
  { form: 'phi_1', pitch: 'Minuscule, élevé aux manuels scolaires. Étonnamment solide.' },
  { form: 'gemma', pitch: 'Open-weights et sympa. Il a la licence, pas le mode d\'emploi.' },
];
const SLOT_W = 100;
const SLOT_X0 = Math.round(GAME_WIDTH / 2 - (CHOICES.length * SLOT_W) / 2);

export class StarterScene extends Phaser.Scene {
  private d!: SimpleOverlayData;
  private router!: InputRouter;
  private idx = 0;
  private sprites: Phaser.GameObjects.Image[] = [];
  private sel!: Phaser.GameObjects.Graphics;
  private info: Phaser.GameObjects.GameObject[] = [];
  private busy = false;
  private finished = false;

  constructor() {
    super(SCENES.Starter);
  }

  init(data: SimpleOverlayData): void {
    this.d = data;
  }

  create(): void {
    this.idx = 0;
    this.info = [];
    this.sprites = [];
    this.busy = false;
    this.finished = false;
    this.router = new InputRouter(this);
    drawTable(this);
    fadeIn(this, 160);
    txt(this, GAME_WIDTH / 2, 6, 'LeCube : « Prends-en un. Ils sont tous sous garantie. Presque. »', { ...TEXT.small, color: C.cream }).setOrigin(0.5, 0);
    const pg = this.add.graphics();
    this.sel = this.add.graphics();
    CHOICES.forEach((c, i) => {
      const cx = SLOT_X0 + i * SLOT_W + SLOT_W / 2;
      platform(pg, cx, 78, 30, 5, C.dusk, C.ink);
      this.sprites.push(this.add.image(cx, 48, pokaiTex(this, c.form)).setScale(2));
      txt(this, cx, 86, db.hasForm(c.form) ? db.form(c.form).name : c.form, { ...TEXT.small, color: C.ink }).setOrigin(0.5, 0);
    });
    this.router.set((a) => this.onKey(a));
    this.render();
  }

  private render(): void {
    const sc = this.sprites;
    sc.forEach((s, i) => {
      this.tweens.killTweensOf(s);
      s.setY(i === this.idx ? 44 : 48).setAlpha(i === this.idx ? 1 : 0.6);
    });
    this.tweens.add({ targets: sc[this.idx], y: 41, duration: 380, yoyo: true, repeat: -1 });
    this.sel.clear();
    drawFrame(this.sel, SLOT_X0 + this.idx * SLOT_W + 6, 8 + 12, SLOT_W - 12, 92 - 12, C.ember);
    this.info.forEach((o) => o.destroy());
    this.info = [];
    const c = CHOICES[this.idx] as Choice;
    const panel = new Panel(this, 8, 118, 304, 58, { style: 'night' });
    this.info.push(panel);
    if (!db.hasForm(c.form)) {
      this.info.push(txt(this, 16, 126, c.form, { ...TEXT.bodyLight }));
      return;
    }
    const f = db.form(c.form);
    this.info.push(txt(this, 16, 124, f.name, { ...TEXT.bodyLight }));
    this.info.push(typeBadges(this, 16, 137, f.types));
    this.info.push(txt(this, 304, 125, LICENCE_LABEL[f.licence], { ...TEXT.log, color: C.gold }).setOrigin(1, 0));
    this.info.push(txt(this, 16, 150, c.pitch, { ...TEXT.small, color: C.cream, wordWrap: { width: 288 } }));
    this.info.push(txt(this, 16, 164, '< > choisir   A : valider', { ...TEXT.log, color: C.fog }));
  }

  private onKey(a: Action): void {
    if (this.busy || this.finished) return;
    if (a === 'left') this.idx = (this.idx + CHOICES.length - 1) % CHOICES.length;
    else if (a === 'right') this.idx = (this.idx + 1) % CHOICES.length;
    else if (a === 'a') {
      void this.confirm();
      return;
    } else return;
    this.render();
  }

  private async confirm(): Promise<void> {
    const c = CHOICES[this.idx] as Choice;
    const name = db.hasForm(c.form) ? db.form(c.form).name : c.form;
    this.busy = true;
    const pick = await choose(this, this.router, {
      x: 82,
      y: 52,
      w: 156,
      message: `Choisir ${name} ?`,
      options: ['Oui, onboarder', 'Je réfléchis encore'],
      cancelIndex: 1,
    });
    if (pick !== 0) {
      this.busy = false;
      return;
    }
    if (!db.hasForm(c.form)) {
      this.busy = false;
      return;
    }
    const p = createPokai(c.form, 5, createRng(randomSeed()));
    game.addPokai(p);
    game.markCaught(c.form);
    game.setFlag(`starter_${c.form}`);
    const s = this.sprites[this.idx] as Phaser.GameObjects.Image;
    sparkleBurst(this, s.x, s.y, { count: 18, radius: 40 });
    await tweenP(this, { targets: s, scale: 2.5, duration: 110, yoyo: true });
    const box = this.add.graphics().setDepth(300);
    drawBox(box, 40, 100, 240, 20, C.ink, C.gold, C.ink);
    const t = txt(this, 160, 106, '', { ...TEXT.bodyLight }).setOrigin(0.5, 0).setDepth(301);
    await typeTokens(this, this.router, `${name} rejoint ton équipe !`, (str) => t.setText(str), 24);
    await wait(this, 650);
    this.finished = true;
    this.router.clear();
    await fadeOut(this, 160);
    this.d.onDone();
    this.scene.stop();
  }
}

