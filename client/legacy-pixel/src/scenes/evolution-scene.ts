// Evolution: "Mise à jour du modèle…". Rules in systems/pokai.ts (evolve).
import Phaser from 'phaser';
import { SCENES } from './keys';
import type { EvolutionSceneData } from './contracts';
import { C, GAME_WIDTH, TEXT, hex } from '../ui/theme';
import { db } from '../data/db';
import { game } from '../state/store';
import { computeStats } from '../systems/stats';
import { displayName, evolve, pokaiStats, type ProgressEvent } from '../systems/pokai';
import type { PokaiInstance } from '../state/types';
import type { Form, Stats } from '../data/types';
import { InputRouter, type Action } from '../ui/input';
import { drawFrame, fadeIn, fadeOut, flashWhite, pokaiTex, tweenP, wait } from '../ui/gfx';
import { drawTerminal } from '../ui/backdrops';
import { Panel } from '../ui/panel';
import { choose } from '../ui/choice-box';
import { typeBadges } from '../ui/badges';
import { sparkleBurst } from '../ui/fx';
import { STAT_LABEL, STAT_ORDER, LICENCE_LABEL } from '../ui/labels';
import { fmtInt, progressBar } from '../ui/format';
import { typeTokens } from '../ui/typing';
import { txt } from '../ui/text';

const SPRITE = { x: 160, y: 62 };
const TERM = { x: 16, y: 118, w: 288, h: 58 };

export class EvolutionScene extends Phaser.Scene {
  private d!: EvolutionSceneData;
  private router!: InputRouter;
  private p!: PokaiInstance;
  private sprite!: Phaser.GameObjects.Image;
  private term!: Panel;
  private termNodes: Phaser.GameObjects.GameObject[] = [];
  private finished = false;

  constructor() {
    super(SCENES.Evolution);
  }

  init(data: EvolutionSceneData): void {
    this.d = data;
  }

  create(): void {
    this.finished = false;
    this.termNodes = [];
    this.router = new InputRouter(this);
    drawTerminal(this);
    fadeIn(this, 160);
    const p = game.findPokai(this.d.pokaiUid);
    const options = this.d.options.filter((o) => db.hasForm(o));
    if (!p || options.length === 0) {
      this.end(null);
      return;
    }
    this.p = p;
    this.sprite = this.add.image(SPRITE.x, SPRITE.y, pokaiTex(this, p.form)).setScale(3);
    this.term = new Panel(this, TERM.x, TERM.y, TERM.w, TERM.h, { style: 'terminal', title: 'hub --update' });
    this.router.set(() => undefined);
    void this.flow(options).catch((err: unknown) => {
      console.error('[EvolutionScene]', err);
      this.end(null);
    });
  }

  private clearTerm(): void {
    this.termNodes.forEach((n) => n.destroy());
    this.termNodes = [];
  }

  private line(y: number, s: string, colour: string = C.cream): Phaser.GameObjects.Text {
    const t = txt(this, TERM.x + 6, TERM.y + y, s, { ...TEXT.log, color: colour });
    this.termNodes.push(t);
    return t;
  }

  private async flow(options: string[]): Promise<void> {
    const from = db.form(this.p.form);
    const name = displayName(this.p);
    this.line(13, `[Hub] Mise à jour disponible pour ${name}.`, C.gold);
    await wait(this, 180);

    let to: string | null = options[0] ?? null;
    if (options.length > 1) {
      to = await this.chooseBranch(options);
      if (!to) return this.cancel();
    }
    if (!to) return this.cancel();
    const target = db.form(to);

    this.clearTerm();
    this.line(13, `${from.name}  ->  ${target.name}`, C.gold);
    const stats = this.statLine(from, target);
    this.line(23, stats, C.fog);
    const pick = await choose(this, this.router, {
      x: 196,
      y: 70,
      w: 118,
      options: ['Installer', 'Rester sur la version stable'],
      style: 'night',
      cancelIndex: 1,
    });
    if (pick !== 0) return this.cancel();
    await this.install(from, target);
  }

  private statLine(from: Form, to: Form): string {
    const a = computeStats(from, this.p.level, this.p.ivs);
    const b = computeStats(to, this.p.level, this.p.ivs);
    const sum = (s: Stats): number => STAT_ORDER.reduce((t, k) => t + s[k], 0);
    return `Total des stats : ${fmtInt(sum(a))} -> ${fmtInt(sum(b))}`;
  }

  /** Branching: side-by-side sprites, left/right to pick, A to confirm, B to cancel. */
  private chooseBranch(options: string[]): Promise<string | null> {
    return new Promise((resolve) => {
      this.sprite.setVisible(false);
      const n = options.length;
      const slotW = 96;
      const x0 = Math.round(GAME_WIDTH / 2 - (n * slotW) / 2);
      const imgs = options.map((o, i) =>
        this.add.image(x0 + i * slotW + slotW / 2, 56, pokaiTex(this, o)).setScale(2),
      );
      const sel = this.add.graphics();
      let idx = 0;
      const info: Phaser.GameObjects.GameObject[] = [];
      const render = (): void => {
        sel.clear();
        imgs.forEach((im, i) => im.setAlpha(i === idx ? 1 : 0.45).setY(i === idx ? 52 : 58));
        drawFrame(sel, x0 + idx * slotW + 4, 14, slotW - 8, 84, C.ember);
        info.forEach((o) => o.destroy());
        info.length = 0;
        this.clearTerm();
        const id = options[idx] as string;
        const f = db.form(id);
        this.line(13, `${f.name}   ${LICENCE_LABEL[f.licence]}`, C.gold);
        const a = computeStats(db.form(this.p.form), this.p.level, this.p.ivs);
        const b = computeStats(f, this.p.level, this.p.ivs);
        const parts = STAT_ORDER.map((k) => `${STAT_LABEL[k].slice(0, 4)} ${b[k] - a[k] >= 0 ? '+' : ''}${b[k] - a[k]}`);
        this.line(24, parts.join('  '), C.cream);
        this.line(34, f.description.length > 62 ? `${f.description.slice(0, 61)}…` : f.description, C.fog);
        const badges = typeBadges(this, TERM.x + 6, TERM.y + 45, f.types);
        this.termNodes.push(badges);
        this.line(47, '', C.fog);
        info.push(badges);
        const hint = txt(this, TERM.x + TERM.w - 6, TERM.y + 46, '< > choisir  A : valider  B : annuler', { ...TEXT.log, color: C.fog }).setOrigin(1, 0);
        this.termNodes.push(hint);
      };
      const finish = (v: string | null): void => {
        this.router.pop(handler);
        sel.destroy();
        imgs.forEach((im) => im.destroy());
        this.sprite.setVisible(true);
        this.clearTerm();
        resolve(v);
      };
      const handler = (a: Action): void => {
        if (a === 'left') idx = (idx + n - 1) % n;
        else if (a === 'right') idx = (idx + 1) % n;
        else if (a === 'a') return finish(options[idx] ?? null);
        else if (a === 'b') return finish(null);
        render();
      };
      this.router.push(handler);
      render();
    });
  }

  private async cancel(): Promise<void> {
    this.clearTerm();
    await this.router.locking(async () => {
      const t = this.line(13, '', C.cream);
      await typeTokens(this, this.router, `${displayName(this.p)} reste sur la version stable.`, (s) => t.setText(s), 20);
      await wait(this, 450);
    });
    this.end(null);
  }

  private async install(from: Form, to: Form): Promise<void> {
    this.clearTerm();
    const oldKey = pokaiTex(this, from.id);
    const newKey = pokaiTex(this, to.id);
    const before = pokaiStats(this.p);
    const bar = this.line(13, '', C.cream);
    const sub = this.line(24, 'Ne pas éteindre le PokAI. Il n\'a pas d\'interrupteur de toute façon.', C.fog);
    const hint = this.line(46, 'B : annuler', C.fog);

    const DURATION = 2400;
    const t0 = this.time.now;
    let flick = 0;
    let showNew = false;
    let aborted = false;
    const off = this.router.onSkip((a) => {
      if (a === 'b') aborted = true;
    });
    while (this.time.now - t0 < DURATION && !aborted) {
      const r = (this.time.now - t0) / DURATION;
      // the 67% hang, because updates always hang there
      const shownR = r > 0.67 && r < 0.78 ? 0.67 : r;
      bar.setText(`Mise à jour du modèle… ${progressBar(shownR, 20)} ${Math.round(shownR * 100)}%`);
      const period = Math.max(50, 230 - r * 190);
      if (this.time.now - flick > period) {
        flick = this.time.now;
        showNew = !showNew;
        this.sprite.setTexture(showNew ? newKey : oldKey);
        this.sprite.setTintFill(hex(showNew ? C.gold : C.cream));
        this.time.delayedCall(40, () => this.sprite.clearTint());
      }
      await wait(this, 30);
    }
    off();
    if (aborted) {
      this.sprite.setTexture(oldKey).clearTint();
      sub.setText('Mise à jour interrompue. Retour à la version stable.');
      hint.setText('');
      await wait(this, 500);
        return this.cancel();
    }
    bar.setText(`Mise à jour du modèle… ${progressBar(1, 20)} 100%`);

    // commit
    const events = evolve(this.p, to.id);
    this.sprite.setTexture(newKey);
    await flashWhite(this, this.sprite, 3, 50);
    sparkleBurst(this, SPRITE.x, SPRITE.y, { count: 22, radius: 56, ms: 700 });
    await tweenP(this, { targets: this.sprite, scale: 3.5, duration: 110, yoyo: true });
    await this.releaseNotes(from, to, before, events);
    this.end(to.id);
  }

  private async releaseNotes(from: Form, to: Form, before: Stats, events: ProgressEvent[]): Promise<void> {
    this.clearTerm();
    const after = pokaiStats(this.p);
    this.term.setTitle(`notes-de-version ${to.name}`);
    this.line(12, `${from.name} est devenu ${to.name} !`, C.gold);
    STAT_ORDER.forEach((k, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const d = after[k] - before[k];
      const t = txt(this, TERM.x + 6 + col * 100, TERM.y + 23 + row * 8, `${STAT_LABEL[k]} ${before[k]}>${after[k]} (${d >= 0 ? '+' : ''}${d})`, {
        ...TEXT.log,
        color: d > 0 ? C.hp : C.cream,
      });
      this.termNodes.push(t);
    });
    const learned = events.filter((e): e is Extract<ProgressEvent, { kind: 'learn' }> => e.kind === 'learn');
    learned.slice(0, 3).forEach((e, i) => {
      const mv = db.hasMove(e.move) ? db.move(e.move).name : e.move;
      const old = e.replaced && db.hasMove(e.replaced) ? ` (remplace ${db.move(e.replaced).name})` : '';
      const t = txt(this, TERM.x + 206, TERM.y + 23 + i * 8, `+ ${mv}${old}`, { ...TEXT.log, color: C.sky });
      this.termNodes.push(t);
    });
    if (learned.length === 0) this.termNodes.push(txt(this, TERM.x + 206, TERM.y + 23, 'Aucune technique', { ...TEXT.log, color: C.fog }));
    const cont = this.line(46, 'A : continuer', C.fog);
    this.tweens.add({ targets: cont, alpha: 0.35, duration: 420, yoyo: true, repeat: -1 });
    await new Promise<void>((resolve) => {
      const off = this.router.onSkip((a) => {
        if (a === 'a' || a === 'b') {
          off();
          resolve();
        }
      });
    });
  }

  private end(evolvedTo: string | null): void {
    if (this.finished) return;
    this.finished = true;
    this.router.clear();
    void fadeOut(this, 160).then(() => {
      this.d.onDone(evolvedTo);
      this.scene.stop();
    });
  }
}

