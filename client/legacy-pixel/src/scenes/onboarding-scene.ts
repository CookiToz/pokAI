// Onboarding (capture): chat with the wild PokAI, play 3 token cards per prompt. Rules in systems/onboarding.ts.
import Phaser from 'phaser';
import { SCENES } from './keys';
import type { OnboardingSceneData } from './contracts';
import { C, GAME_WIDTH, TEXT, hex } from '../ui/theme';
import { db } from '../data/db';
import { game } from '../state/store';
import { createRng, type Rng } from '../systems/rng';
import { displayName } from '../systems/pokai';
import { keyTierOfItem, playCards, redrawHand, startOnboarding, type OnboardingState } from '../systems/onboarding';
import { InputRouter, type Action } from '../ui/input';
import { drawBox, drawFrame, fadeIn, fadeOut, pokaiTex, tweenP, wait } from '../ui/gfx';
import { drawTerminal } from '../ui/backdrops';
import { Panel } from '../ui/panel';
import { Gauge } from '../ui/bars';
import { ChatLog } from '../ui/chat';
import { CARD_H, CARD_W, TokenCardView } from '../ui/token-card';
import { typeBadges } from '../ui/badges';
import { choose } from '../ui/choice-box';
import { glitchBands, glitchText, popText, shakeX, sparkleBurst } from '../ui/fx';
import { KEY_TIER_LABEL } from '../ui/labels';
import { typeTokens } from '../ui/typing';
import { txt } from '../ui/text';

/** onDone payload: contracts.ts fixes {success, fled}; aiactAlert is an extra read by BattleScene. */
export interface OnboardingDone {
  success: boolean;
  fled: boolean;
  aiactAlert?: boolean;
}

type Focus = { kind: 'card'; i: number } | { kind: 'send' } | { kind: 'redraw' };

const CHAT = { x: 4, y: 4, w: 206, h: 82 };
const INPUT = { x: 4, y: 90, w: 206, h: 14 };
const CARDS_Y = 110;
const BTN = { x: 198, w: 118, h: 14 };

export class OnboardingScene extends Phaser.Scene {
  private d!: OnboardingSceneData;
  private router!: InputRouter;
  private rng!: Rng;
  private st!: OnboardingState;
  private chat!: ChatLog;
  private chatPanel!: Panel;
  private inputText!: Phaser.GameObjects.Text;
  private sprite!: Phaser.GameObjects.Image;
  private alignG!: Gauge;
  private halluG!: Gauge;
  private views: TokenCardView[] = [];
  private picked: number[] = [];
  private focus: Focus = { kind: 'card', i: 0 };
  private lastCard = 0;
  private btnG!: Phaser.GameObjects.Graphics;
  private redrawLabel!: Phaser.GameObjects.Text;
  private plays = 0;
  private alert = false;
  private finished = false;
  private busy = false;

  constructor() {
    super(SCENES.Onboarding);
  }

  init(data: OnboardingSceneData): void {
    this.d = data;
  }

  create(): void {
    this.views = [];
    this.picked = [];
    this.focus = { kind: 'card', i: 0 };
    this.lastCard = 0;
    this.plays = 0;
    this.alert = false;
    this.finished = false;
    this.busy = false;
    this.router = new InputRouter(this);
    this.rng = createRng(game.nextSeed());
    const tier = keyTierOfItem(this.d.keyItem) ?? 'free';
    this.st = startOnboarding(this.d.target, tier, game.state.vibeurClass, this.rng);
    const target = this.d.target;
    const name = displayName(target);

    drawTerminal(this);
    fadeIn(this, 160);

    this.chatPanel = new Panel(this, CHAT.x, CHAT.y, CHAT.w, CHAT.h, { style: 'terminal', title: `chat/${name}` });
    this.chat = new ChatLog(this, this.router, CHAT.x + 3, CHAT.y + 12, CHAT.w - 6, CHAT.h - 14);

    // right column: the wild PokAI
    new Panel(this, 214, 4, 102, 100, { style: 'night' });
    this.sprite = this.add.image(265, 40, pokaiTex(this, target.form)).setScale(2);
    txt(this, 265, 74, name, { ...TEXT.small, color: C.cream }).setOrigin(0.5, 0);
    txt(this, 265, 85, `Nv.${target.level} · clé ${KEY_TIER_LABEL[tier]}`, { ...TEXT.log, color: C.gold }).setOrigin(0.5, 0);
    typeBadges(this, 220, 94, db.form(target.form).types).setX(220);

    // prompt input
    new Panel(this, INPUT.x, INPUT.y, INPUT.w, INPUT.h, { style: 'terminal', shadow: false });
    this.inputText = txt(this, INPUT.x + 5, INPUT.y + 3, '', { ...TEXT.log, color: C.cream });

    // gauges
    this.alignG = new Gauge(this, 4, 152, 92, 'Alignement', C.leaf);
    this.halluG = new Gauge(this, 102, 152, 92, 'Hallucination', C.ember);

    // buttons
    this.btnG = this.add.graphics();
    txt(this, BTN.x + BTN.w / 2, 152, 'Envoyer le prompt', { ...TEXT.small, color: C.ink }).setOrigin(0.5, 0);
    this.redrawLabel = txt(this, BTN.x + BTN.w / 2, 168, '', { ...TEXT.small, color: C.ink }).setOrigin(0.5, 0);

    this.buildHand(false);
    this.updateChrome();
    this.router.set((a) => this.onKey(a));
    void this.intro().catch((err: unknown) => {
      console.error('[OnboardingScene]', err);
      this.end({ success: false, fled: false });
    });
  }

  // ---------------------------------------------------------------- layout

  private buildHand(animate: boolean): void {
    this.views.forEach((v) => v.destroy());
    this.views = [];
    this.picked = [];
    const hand = this.st.hand;
    const gap = 3;
    const total = hand.length * CARD_W + (hand.length - 1) * gap;
    const x0 = Math.round((GAME_WIDTH - total) / 2);
    hand.forEach((card, i) => {
      const v = new TokenCardView(this, x0 + i * (CARD_W + gap), CARDS_Y, card);
      if (animate) {
        v.setAlpha(0).setY(CARDS_Y + 10);
        this.tweens.add({ targets: v, alpha: 1, y: CARDS_Y, duration: 120, delay: i * 40 });
      }
      this.views.push(v);
    });
    if (this.focus.kind === 'card') this.focus = { kind: 'card', i: Math.min(this.focus.i, Math.max(0, hand.length - 1)) };
    this.applyFocus();
  }

  private applyFocus(): void {
    this.views.forEach((v, i) => v.setFocused(this.focus.kind === 'card' && this.focus.i === i));
    this.drawButtons();
  }

  private canSend(): boolean {
    return this.picked.length === Math.min(3, this.st.hand.length) && this.picked.length > 0;
  }

  private drawButtons(): void {
    const g = this.btnG;
    g.clear();
    const send = this.canSend();
    drawBox(g, BTN.x, 150, BTN.w, BTN.h, send ? C.gold : C.fog, C.ink, C.ink);
    if (this.focus.kind === 'send') drawFrame(g, BTN.x - 2, 148, BTN.w + 4, BTN.h + 4, C.ember);
    if (this.st.redrawsLeft > 0) {
      drawBox(g, BTN.x, 166, BTN.w, BTN.h, C.sky, C.ink, C.ink);
      if (this.focus.kind === 'redraw') drawFrame(g, BTN.x - 2, 164, BTN.w + 4, BTN.h + 4, C.ember);
      this.redrawLabel.setText(`Redistribuer (${this.st.redrawsLeft})`);
    } else this.redrawLabel.setText('');
  }

  private updateChrome(): void {
    this.chatPanel.setTitle(`chat/${displayName(this.d.target)} - essais ${this.st.attemptsLeft}`);
    this.inputText.setText(this.promptPlaceholder());
    this.inputText.setColor(C.fog);
  }

  private promptPlaceholder(): string {
    return '> choisis 3 cartes   A : poser   B : quitter';
  }

  // ---------------------------------------------------------------- input

  private onKey(a: Action): void {
    if (this.busy || this.finished) return;
    const f = this.focus;
    const n = this.views.length;
    if (a === 'b') {
      void this.askQuit();
      return;
    }
    if (f.kind === 'card') {
      if (a === 'left') this.setFocus({ kind: 'card', i: Math.max(0, f.i - 1) });
      else if (a === 'right') this.setFocus({ kind: 'card', i: Math.min(n - 1, f.i + 1) });
      else if (a === 'down') {
        this.lastCard = f.i;
        this.setFocus({ kind: 'send' });
      } else if (a === 'up' && this.st.redrawsLeft > 0) {
        this.lastCard = f.i;
        this.setFocus({ kind: 'redraw' });
      } else if (a === 'a') this.togglePick(f.i);
    } else if (f.kind === 'send') {
      if (a === 'up' || a === 'left') this.setFocus({ kind: 'card', i: this.lastCard });
      else if (a === 'down' && this.st.redrawsLeft > 0) this.setFocus({ kind: 'redraw' });
      else if (a === 'a') {
        if (this.canSend()) void this.submit();
        else this.nudgeInput('Choisis 3 cartes avant d\'envoyer.');
      }
    } else {
      if (a === 'up') this.setFocus({ kind: 'send' });
      else if (a === 'down' || a === 'left') this.setFocus({ kind: 'card', i: this.lastCard });
      else if (a === 'a') void this.redraw();
    }
  }

  private setFocus(f: Focus): void {
    this.focus = f;
    this.applyFocus();
  }

  private togglePick(i: number): void {
    const v = this.views[i];
    if (!v) return;
    const at = this.picked.indexOf(i);
    if (at >= 0) this.picked.splice(at, 1);
    else if (this.picked.length < Math.min(3, this.st.hand.length)) this.picked.push(i);
    else {
      this.nudgeInput('Trois cartes maximum par prompt.');
      return;
    }
    this.views.forEach((cv, k) => {
      const o = this.picked.indexOf(k);
      cv.setPicked(o >= 0 ? o + 1 : null);
    });
    this.drawButtons();
    this.previewPrompt();
  }

  private previewPrompt(): void {
    if (this.picked.length === 0) {
      this.inputText.setText(this.promptPlaceholder()).setColor(C.fog);
      return;
    }
    this.inputText.setText(`> ${this.promptText()}`).setColor(C.cream);
  }

  private promptText(): string {
    return this.picked.map((i) => this.views[i]?.card.label ?? '').join(', ');
  }

  private nudgeInput(msg: string): void {
    this.inputText.setText(`> ${msg}`).setColor(C.ember);
    void shakeX(this, this.inputText, 2, 4, 30);
  }

  private async askQuit(): Promise<void> {
    this.busy = true;
    const msg = this.plays > 0 ? 'Raccrocher ? Le PokAI se déconnecte et la clé est perdue.' : 'Raccrocher ? Ta clé API te sera restituée.';
    const i = await choose(this, this.router, { x: 60, y: 54, w: 200, message: msg, options: ['Rester', 'Raccrocher'], cancelIndex: 0 });
    this.busy = false;
    if (i === 1) this.end({ success: false, fled: this.plays > 0 });
  }

  // ---------------------------------------------------------------- flow

  private async intro(): Promise<void> {
    this.busy = true;
    const name = displayName(this.d.target);
    await this.chat.say('system', `Connexion à ${name} via clé API ${KEY_TIER_LABEL[this.st.keyTier]}…`);
    if (this.st.blocked) {
      await this.chat.say('foe', this.st.blocked);
      await wait(this, 700);
      this.end({ success: false, fled: false });
      return;
    }
    await this.chat.say('foe', `Bonjour. Je suis ${name}. Que puis-je faire pour vous ?`);
    await this.sayHints(this.st.hints);
    this.busy = false;
  }

  private async sayHints(hints: string[]): Promise<void> {
    for (const h of hints) await this.chat.say('foe', `» ${h}`);
  }

  private async redraw(): Promise<void> {
    if (!redrawHand(this.st, this.rng)) return;
    this.busy = true;
    this.focus = { kind: 'card', i: 0 };
    this.buildHand(true);
    this.drawButtons();
    this.previewPrompt();
    await wait(this, 200);
    this.busy = false;
  }

  private async submit(): Promise<void> {
    this.busy = true;
    const order = [...this.picked];
    const ids = order.map((i) => (this.views[i] as TokenCardView).card.id);
    const cards = order.map((i) => this.views[i] as TokenCardView);
    const line = this.promptText();
    let res;
    try {
      res = playCards(this.st, ids, this.rng);
    } catch (err) {
      console.error(err);
      this.busy = false;
      return;
    }
    this.plays++;
    // 1. the prompt types itself into the input, then lands in the chat
    this.inputText.setColor(C.cream);
    await typeTokens(this, this.router, `> ${line}`, (s) => this.inputText.setText(s), 18);
    await wait(this, 120);
    this.inputText.setText('');
    await this.chat.say('player', `${line}.`);
    // 2. each card reports back
    for (const [k, c] of cards.entries()) {
      const id = ids[k] as string;
      const ok = res.matched.includes(id);
      void c.flash(ok ? 'match' : 'miss');
      if (ok) {
        sparkleBurst(this, c.x + CARD_W / 2, c.y + CARD_H / 2, { count: 6, radius: 14, colours: [C.leaf, C.cream, C.gold] });
        popText(this, c.x + CARD_W / 2, c.y - 6, 'ALIGNÉ', C.leaf);
      } else popText(this, c.x + CARD_W / 2, c.y - 6, 'À CÔTÉ', C.ember);
      await wait(this, 170);
    }
    if (res.jailbreak) await glitchBands(this, 300);
    // 3. gauges
    await Promise.all([this.alignG.setValue(res.alignment), this.halluG.setValue(res.hallucination)]);
    if (res.aiactAlert) this.alert = true;
    // 4. reaction
    await this.chat.say('foe', res.text);
    this.updateChrome();
    if (res.outcome === 'continue') {
      if (res.newHint) await this.chat.say('foe', `» ${res.newHint}`);
      this.focus = { kind: 'card', i: 0 };
      this.buildHand(true);
      this.inputText.setText(this.promptPlaceholder()).setColor(C.fog);
      await wait(this, 200);
      this.busy = false;
    } else if (res.outcome === 'success') {
      await this.success();
    } else {
      await this.flee();
    }
  }

  // ---------------------------------------------------------------- endings

  private async success(): Promise<void> {
    const name = displayName(this.d.target);
    sparkleBurst(this, this.sprite.x, this.sprite.y, { count: 22, radius: 48, ms: 700 });
    await tweenP(this, { targets: this.sprite, y: this.sprite.y - 8, duration: 110, yoyo: true, repeat: 1 });
    sparkleBurst(this, this.sprite.x, this.sprite.y - 6, { count: 16, radius: 34, colours: [C.cream, C.gold] });
    const banner = this.add.container(0, 0).setDepth(700);
    const g = this.add.graphics();
    drawBox(g, 24, 64, 272, 44, C.night, C.gold, C.ink);
    banner.add(g);
    const t = txt(this, 160, 72, '', { ...TEXT.bodyLight, align: 'center', wordWrap: { width: 250 } }).setOrigin(0.5, 0);
    banner.add(t);
    await typeTokens(this, this.router, `${name} a accepté tes conditions d'utilisation !`, (s) => t.setText(s), 26);
    const hint = txt(this, 160, 96, 'A : continuer', { ...TEXT.log, color: C.gold }).setOrigin(0.5, 0);
    banner.add(hint);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 420, yoyo: true, repeat: -1 });
    await this.waitA();
    this.end({ success: true, fled: false, ...(this.alert ? { aiactAlert: true } : {}) });
  }

  private async flee(): Promise<void> {
    const banner = this.add.container(0, 0).setDepth(700);
    const g = this.add.graphics();
    drawBox(g, 24, 56, 272, 56, C.ink, C.ember, C.ink);
    banner.add(g);
    banner.add(glitchText(this, 160, 76, '429', TEXT.title));
    banner.add(txt(this, 160, 94, 'Too Many Requests', { ...TEXT.bodyLight }).setOrigin(0.5, 0));
    this.cameras.main.shake(260, 0.012);
    await Promise.all([glitchBands(this, 520), this.leaveSprite()]);
    const hint = txt(this, 160, 118, 'La clé API est perdue.   A : continuer', { ...TEXT.log, color: C.fog }).setOrigin(0.5, 0);
    banner.add(hint);
    await this.waitA();
    this.end({ success: false, fled: true });
  }

  private async leaveSprite(): Promise<void> {
    for (let i = 0; i < 4; i++) {
      this.sprite.setVisible(false);
      await wait(this, 45);
      this.sprite.setVisible(true).setTintFill(hex(i % 2 === 0 ? C.rose : C.sky));
      await wait(this, 45);
    }
    this.sprite.clearTint();
    await tweenP(this, { targets: this.sprite, x: GAME_WIDTH + 60, duration: 220, ease: 'Cubic.easeIn' });
  }

  private waitA(): Promise<void> {
    this.busy = true;
    return new Promise((resolve) => {
      const off = this.router.onSkip((a) => {
        if (a === 'a' || a === 'b') {
          off();
          resolve();
        }
      });
    });
  }

  private end(result: OnboardingDone): void {
    if (this.finished) return;
    this.finished = true;
    this.router.clear();
    void fadeOut(this, 160).then(() => {
      this.d.onDone(result);
      this.scene.stop();
    });
  }
}

