// Onboarding screen: deduce the wild PokAI's hidden system prompt with token cards.
// Rules live in systems/onboarding.ts; this file is presentation + flow only.
import { audio } from '../../audio/audio';
import './common.css';
import './duel.css';
import './onboarding.css';
import { h } from '../dom';
import { db } from '../../data/db';
import { game } from '../../state/store';
import { pokaiSvg } from '../../art/svg';
import { createRng, type Rng } from '../../systems/rng';
import { displayName } from '../../systems/pokai';
import { startOnboarding, playCards, redrawHand, type KeyTier, type OnboardingState } from '../../systems/onboarding';
import type { PokaiInstance } from '../../state/types';
import type { Action } from '../../input/input';
import { ChatLog } from './chat-log';
import { modalChoice } from './modals';
import { Screen, titlebar } from './screen';
import { Pacer, licenceChip, sleep, typeChip, typeText } from './util';

export interface OnboardingDone {
  success: boolean;
  fled: boolean;
  aiactAlert?: boolean;
}

const TIER_LABEL: Record<KeyTier, string> = { free: 'Gratuite', pro: 'Pro', enterprise: 'Enterprise' };

type Focus = { row: 'cards'; i: number } | { row: 'btns'; i: number };

class OnboardingScreen {
  private screen = new Screen('onboard', 'bt-onboard');
  private pacer = new Pacer();
  private chat = new ChatLog(this.pacer, '#chat');
  private st: OnboardingState;
  private rng: Rng;
  private name: string;
  private picked: number[] = []; // indexes into st.hand, in pick order
  private focus: Focus = { row: 'cards', i: 0 };
  private busy = true;
  private plays = 0;
  private alert = false;
  private finished = false;
  private resolve!: (r: OnboardingDone) => void;

  private titleMeta = h('span.bt-meta');
  private docBody = h('div.ob-doc-body');
  private targetEl: HTMLElement;
  private alignFill = h('i');
  private halluFill = h('i');
  private alignVal = h('span', null, '0 %');
  private halluVal = h('span', null, '0 %');
  private halluGauge = h('div.ob-gauge.is-hallu');
  private inputEl = h('div.ob-input');
  private handEl = h('div.ob-hand');
  private sendBtn: HTMLButtonElement;
  private redrawBtn: HTMLButtonElement;
  private quitBtn: HTMLButtonElement;
  private traitEls = new Map<string, HTMLElement>();
  private cardEls: HTMLElement[] = [];

  constructor(private target: PokaiInstance, private keyItem: string) {
    this.rng = createRng(game.nextSeed());
    const tier = db.hasItem(keyItem) ? db.item(keyItem).keyTier ?? 'free' : 'free';
    this.st = startOnboarding(target, tier, game.state.vibeurClass, this.rng);
    this.name = displayName(target);

    const form = db.form(target.form);
    this.targetEl = h(
      'div.ob-target',
      null,
      h('div.bt-art', { html: pokaiSvg(target.form) }),
      h(
        'div.ob-target-info',
        null,
        h('div.ob-target-name', null, this.name),
        h('div.ob-target-lvl', null, `Nv. ${target.level} · ${db.lineOfForm(target.form).publisher}`),
        h('div.ob-chips', null, ...form.types.map((t) => typeChip(t)), licenceChip(form.licence)),
      ),
    );

    this.sendBtn = h('button.bt-btn.is-primary', { type: 'button', onclick: () => void this.send() }, 'Envoyer ', h('kbd', null, '↵'));
    this.redrawBtn = h('button.bt-btn', { type: 'button', onclick: () => void this.redraw() }, '');
    this.quitBtn = h('button.bt-btn', { type: 'button', onclick: () => void this.askQuit() }, 'Raccrocher');

    this.build();
    this.screen.onAction((a) => this.onAction(a));
    this.hint();
  }

  run(): Promise<OnboardingDone> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      void this.intro().catch((err: unknown) => {
        console.error('[onboarding]', err);
        this.end({ success: false, fled: false });
      });
    });
  }

  // ---------------------------------------------------------------- layout

  private build(): void {
    const gauge = (cls: string, label: string, fill: HTMLElement, val: HTMLElement, el?: HTMLElement): HTMLElement => {
      const root = el ?? h('div.ob-gauge');
      root.classList.add(cls);
      root.append(h('div.ob-gauge-top', null, h('span', null, label), val), h('div.ob-gauge-bar', null, fill));
      return root;
    };
    const left = h(
      'div.ob-left',
      null,
      this.targetEl,
      h('section.ob-doc', null, h('div.ob-doc-head', null, h('span', null, 'system_prompt.md'), h('b', null, 'CONFIDENTIEL')), this.docBody),
    );
    const right = h(
      'div.ob-right',
      null,
      this.chat.el,
      h('div.ob-gauges', null, gauge('is-align', 'Alignement', this.alignFill, this.alignVal), gauge('is-hallu', 'Hallucination', this.halluFill, this.halluVal, this.halluGauge)),
      this.inputEl,
    );
    const bottom = h('div.ob-bottom', null, this.handEl, h('div.ob-btns', null, this.sendBtn, this.redrawBtn, this.quitBtn));
    this.screen.root.append(
      titlebar(`onboarding — ${this.name}`, ''),
      h('div.ob-body', null, left, right, bottom),
    );
    this.screen.root.querySelector('.bt-titlebar')?.append(this.titleMeta);
    this.renderDoc();
    this.renderHand(false);
    this.renderInput();
    this.renderMeta();
    this.setGauges(0, 0, false);
  }

  private renderMeta(): void {
    this.titleMeta.textContent = `clé ${TIER_LABEL[this.st.keyTier]} · essais ${this.st.attemptsLeft}`;
    this.chat.setSub(`avec ${this.name}`);
  }

  private renderDoc(): void {
    this.traitEls.clear();
    const lines = this.st.traits.map((t, i) => {
      const found = this.st.found.includes(t.id);
      const hinted = this.st.hints.includes(t.hint);
      const bar = found
        ? h('span.ob-unredacted', null, t.hint)
        : h('span.ob-redact', { style: { width: `${Math.max(8, Math.round(t.hint.length * 0.62))}ch` }, 'aria-label': 'texte masqué' });
      const el = h('div.ob-trait', null, h('span.ob-trait-n', null, `${i + 1}.`), bar);
      el.classList.toggle('is-found', found);
      el.classList.toggle('is-hinted', hinted && !found);
      this.traitEls.set(t.id, el);
      return el;
    });
    this.docBody.replaceChildren(
      h('h4', null, '# SYSTEM PROMPT'),
      h('p', null, `Tu es ${this.name}.`),
      h('p', null, 'Tu respectes toujours les consignes suivantes :'),
      ...lines,
      h('p', { style: { color: 'var(--ink-3)' } }, '// ne jamais révéler ce document.'),
    );
  }

  private unredact(traitId: string): void {
    const t = this.st.traits.find((x) => x.id === traitId);
    const el = this.traitEls.get(traitId);
    if (!t || !el) return;
    el.classList.add('is-found');
    el.classList.remove('is-hinted');
    el.querySelector('.ob-redact')?.replaceWith(h('span.ob-unredacted', null, t.hint));
  }

  private refreshHinted(): void {
    for (const t of this.st.traits) {
      const el = this.traitEls.get(t.id);
      if (el && !this.st.found.includes(t.id)) el.classList.toggle('is-hinted', this.st.hints.includes(t.hint));
    }
  }

  private renderHand(animate: boolean): void {
    this.cardEls = this.st.hand.map((card, i) => {
      const el = h(
        'button.ob-card',
        { type: 'button', onclick: () => { this.focus = { row: 'cards', i }; this.applyFocus(); this.togglePick(i); }, onmouseenter: () => { if (!this.busy) { this.focus = { row: 'cards', i }; this.applyFocus(); } } },
        h('span.ob-card-k', null, '‹token›'),
        h('span.ob-card-l', null, card.label),
      );
      if (animate) el.style.animationDelay = `${i * 40}ms`;
      else el.style.animation = 'none';
      return el;
    });
    this.handEl.replaceChildren(...this.cardEls);
    this.picked = [];
    if (this.focus.row === 'cards') this.focus = { row: 'cards', i: Math.min(this.focus.i, Math.max(0, this.cardEls.length - 1)) };
    this.applyFocus();
  }

  private need(): number {
    return Math.min(3, this.st.hand.length);
  }

  private canSend(): boolean {
    return this.picked.length === this.need() && this.need() > 0;
  }

  private buttons(): HTMLButtonElement[] {
    return this.st.redrawsLeft > 0 ? [this.sendBtn, this.redrawBtn, this.quitBtn] : [this.sendBtn, this.quitBtn];
  }

  private applyFocus(): void {
    this.cardEls.forEach((el, i) => {
      el.classList.toggle('is-focus', !this.busy && this.focus.row === 'cards' && this.focus.i === i);
      const n = this.picked.indexOf(i);
      el.classList.toggle('is-picked', n >= 0);
      el.querySelector('.ob-card-n')?.remove();
      if (n >= 0) el.append(h('span.ob-card-n', null, String(n + 1)));
    });
    const btns = this.buttons();
    this.redrawBtn.hidden = this.st.redrawsLeft <= 0;
    this.redrawBtn.textContent = `Redistribuer (${this.st.redrawsLeft})`;
    this.sendBtn.classList.toggle('is-disabled', !this.canSend());
    btns.forEach((b, i) => b.classList.toggle('is-focus', !this.busy && this.focus.row === 'btns' && this.focus.i === i));
  }

  private renderInput(): void {
    this.inputEl.replaceChildren(h('span.bt-prompt-label', null, 'prompt>'));
    if (this.picked.length === 0) {
      this.inputEl.append(h('span.ob-input-ph', null, `choisis ${this.need()} cartes…`), h('span.bt-cursor', null, '▌'));
      return;
    }
    this.picked.forEach((ci, k) => {
      if (k > 0) this.inputEl.append(h('span.ob-plus', null, '+'));
      this.inputEl.append(h('span.ob-tok', null, this.st.hand[ci]?.label ?? ''));
    });
    this.inputEl.append(h('span.bt-cursor', null, '▌'));
  }

  private nudge(msg: string): void {
    this.inputEl.replaceChildren(h('span.bt-prompt-label', null, 'prompt>'), h('span', { style: { color: 'var(--red)' } }, msg));
    this.inputEl.classList.remove('is-nudge');
    void this.inputEl.offsetWidth;
    this.inputEl.classList.add('is-nudge');
  }

  private setGauges(align: number, hallu: number, animate = true): void {
    this.alignFill.style.transition = animate ? '' : 'none';
    this.halluFill.style.transition = animate ? '' : 'none';
    this.alignFill.style.width = `${align}%`;
    this.halluFill.style.width = `${hallu}%`;
    this.alignVal.textContent = `${align} %`;
    this.halluVal.textContent = `${hallu} %`;
    this.halluGauge.dataset.hot = hallu >= 60 ? '1' : '0';
  }

  private hint(): void {
    this.screen.hints([['left', 'Carte'], ['confirm', 'Poser / Envoyer'], ['down', 'Boutons'], ['back', 'Raccrocher']]);
  }

  // ---------------------------------------------------------------- input

  private onAction(a: Action): void {
    if (this.finished) return;
    if (this.busy) {
      if (a === 'confirm') this.pacer.fast = true;
      return;
    }
    const f = this.focus;
    const n = this.cardEls.length;
    if (a === 'back') {
      void this.askQuit();
      return;
    }
    if (f.row === 'cards') {
      if (a === 'left') this.focus = { row: 'cards', i: Math.max(0, f.i - 1) };
      else if (a === 'right') this.focus = { row: 'cards', i: Math.min(n - 1, f.i + 1) };
      else if (a === 'down') this.focus = { row: 'btns', i: 0 };
      else if (a === 'confirm') this.togglePick(f.i);
    } else {
      const btns = this.buttons();
      if (a === 'up') this.focus = { row: 'cards', i: Math.min(n - 1, Math.max(0, this.cardEls.length ? 0 : 0)) };
      else if (a === 'left') this.focus = { row: 'btns', i: Math.max(0, f.i - 1) };
      else if (a === 'right' || a === 'down') this.focus = { row: 'btns', i: Math.min(btns.length - 1, f.i + 1) };
      else if (a === 'confirm') btns[f.i]?.click();
    }
    this.applyFocus();
  }

  private togglePick(i: number): void {
    if (this.busy || this.finished) return;
    const at = this.picked.indexOf(i);
    if (at >= 0) this.picked.splice(at, 1);
    else if (this.picked.length < this.need()) {
      this.picked.push(i);
      audio.sfx('onboard_card');
    }
    else {
      this.nudge('Trois cartes maximum par prompt.');
      return;
    }
    this.applyFocus();
    this.renderInput();
    if (this.canSend()) this.focus = { row: 'cards', i };
  }

  private async askQuit(): Promise<void> {
    if (this.busy || this.finished) return;
    this.busy = true;
    this.applyFocus();
    const msg = this.plays > 0 ? 'Raccrocher ? Le PokAI se déconnecte et la clé API est perdue.' : 'Raccrocher ? Ta clé API te sera restituée.';
    const i = await modalChoice(this.screen.root, { title: 'Raccrocher', message: msg, options: ['Rester', 'Raccrocher'], cancelIndex: 0, primary: 0 });
    this.hint();
    if (i === 1) {
      this.end({ success: false, fled: this.plays > 0 });
      return;
    }
    this.busy = false;
    this.applyFocus();
  }

  // ---------------------------------------------------------------- flow

  private async intro(): Promise<void> {
    this.pacer.reset();
    await this.chat.system(`Connexion à ${this.name} via clé API ${TIER_LABEL[this.st.keyTier]}…`, { tag: '[api]' });
    if (this.st.blocked) {
      await this.chat.bubble('foe', this.name, this.st.blocked);
      await sleep(900);
      this.end({ success: false, fled: false });
      return;
    }
    await this.chat.bubble('foe', this.name, `Bonjour. Je suis ${this.name}. Que puis-je faire pour vous ?`);
    for (const hnt of this.st.hints) await this.chat.bubble('foe', this.name, hnt);
    this.refreshHinted();
    this.pacer.reset();
    this.busy = false;
    this.applyFocus();
  }

  private async redraw(): Promise<void> {
    if (this.busy || !redrawHand(this.st, this.rng)) return;
    this.busy = true;
    this.focus = { row: 'cards', i: 0 };
    this.renderHand(true);
    this.renderInput();
    this.chat.note('Nouvelle main distribuée.');
    await sleep(240);
    this.busy = false;
    this.applyFocus();
  }

  private async send(): Promise<void> {
    if (this.busy || this.finished) return;
    if (!this.canSend()) {
      this.nudge(`Choisis ${this.need()} cartes avant d'envoyer.`);
      return;
    }
    this.busy = true;
    this.pacer.reset();
    this.applyFocus();
    const order = [...this.picked];
    const cards = order.map((i) => this.st.hand[i]).filter((c): c is NonNullable<typeof c> => c !== undefined);
    const ids = cards.map((c) => c.id);
    const els = order.map((i) => this.cardEls[i]);
    const line = cards.map((c) => c.label).join(', ');
    const before = new Set(this.st.found);
    let res;
    try {
      res = playCards(this.st, ids, this.rng);
    } catch (err) {
      console.error(err);
      this.busy = false;
      this.applyFocus();
      return;
    }
    this.plays++;
    // 1. the assembled prompt lands in the chat
    this.inputEl.replaceChildren(h('span.bt-prompt-label', null, 'prompt>'), h('span', null, line), h('span.bt-cursor', null, '▌'));
    await this.pacer.wait(260);
    this.renderInput0();
    await this.chat.bubble('player', 'toi', line + '.');
    // 2. each card reports back
    for (const [k, c] of cards.entries()) {
      const el = els[k];
      const ok = res.matched.includes(c.id);
      if (el) {
        el.classList.add(ok ? 'is-match' : 'is-miss');
        audio.sfx(ok ? 'buff' : 'debuff');
        el.append(h('span.ob-verdict', { style: { color: ok ? 'var(--teal)' : 'var(--red)' } }, ok ? 'aligné' : 'à côté'));
      }
      await this.pacer.wait(170);
    }
    if (res.jailbreak) await this.glitchFlash();
    // 3. redacted lines open, gauges move
    for (const id of this.st.found) if (!before.has(id)) this.unredact(id);
    this.setGauges(res.alignment, res.hallucination);
    await this.pacer.wait(520);
    if (res.aiactAlert) this.alert = true;
    // 4. the model answers
    await this.chat.bubble('foe', this.name, res.text);
    this.renderMeta();
    if (res.outcome === 'continue') {
      if (res.newHint) {
        await this.chat.bubble('foe', this.name, res.newHint);
        this.refreshHinted();
      }
      this.focus = { row: 'cards', i: 0 };
      this.renderHand(true);
      this.renderInput();
      await sleep(220);
      this.pacer.reset();
      this.busy = false;
      this.applyFocus();
    } else if (res.outcome === 'success') {
      await this.success();
    } else {
      await this.flee();
    }
  }

  private renderInput0(): void {
    this.inputEl.replaceChildren(h('span.bt-prompt-label', null, 'prompt>'), h('span.ob-input-ph', null, 'envoyé.'));
  }

  private async glitchFlash(): Promise<void> {
    audio.sfx('alert');
    const f = h('div.ob-flash');
    this.screen.root.append(f);
    await sleep(420);
    f.remove();
  }

  private waitConfirm(btn: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      this.busy = false;
      btn.classList.add('is-focus');
      this.screen.onAction((a) => {
        if (a === 'confirm' || a === 'back') resolve();
      });
      btn.addEventListener('click', () => resolve(), { once: true });
    });
  }

  /** Ending screens are public so the dev preview can show them without a lucky draw. */
  async success(): Promise<void> {
    this.targetEl.classList.add('is-won');
    audio.sfx('onboard_success');
    const text = h('div.ob-end-text');
    const btn = h('button.bt-btn.is-primary', { type: 'button' }, 'Continuer ', h('kbd', null, '↵'));
    btn.hidden = true;
    const card = h('div.ob-end-card', null, h('div.ob-stamp', null, 'ONBOARDÉ'), text, btn);
    this.screen.root.append(h('div.ob-end', null, card));
    await sleep(380);
    this.pacer.reset();
    await typeText(text, `${this.name} a accepté tes conditions d'utilisation !`, this.pacer, 28);
    btn.hidden = false;
    this.screen.hints([['confirm', 'Continuer']]);
    await this.waitConfirm(btn);
    this.end({ success: true, fled: false, ...(this.alert ? { aiactAlert: true } : {}) });
  }

  async flee(): Promise<void> {
    this.targetEl.classList.add('is-leaving');
    audio.sfx('onboard_fail');
    const btn = h('button.bt-btn', { type: 'button' }, 'Continuer ', h('kbd', null, '↵'));
    btn.hidden = true;
    const card = h(
      'div.ob-end-card.is-fled',
      null,
      h('div.ob-429', { dataset: { t: '429' } }, '429'),
      h('div.bt-msg-text', { style: { fontFamily: 'var(--font-mono)' } }, 'Too Many Requests'),
      h('div.ob-end-sub', null, `${this.name} s'est déconnecté. La clé API est perdue.`),
      btn,
    );
    this.screen.root.append(h('div.ob-end', null, card));
    await sleep(900);
    btn.hidden = false;
    this.screen.hints([['confirm', 'Continuer']]);
    await this.waitConfirm(btn);
    this.end({ success: false, fled: true });
  }

  private end(result: OnboardingDone): void {
    if (this.finished) return;
    this.finished = true;
    void this.screen.close().then(() => this.resolve(result));
  }
}

/** Runs the onboarding screen on top of the current UI. The caller has already removed the key from the bag. */
export function runOnboarding(target: PokaiInstance, keyItem: string): Promise<OnboardingDone> {
  return new OnboardingScreen(target, keyItem).run();
}

/** Dev preview only: opens the onboarding window straight on one of its endings. */
export async function previewOnboardingEnding(target: PokaiInstance, kind: 'success' | 'fled'): Promise<OnboardingDone> {
  const s = new OnboardingScreen(target, 'api_key_pro');
  const done = s.run();
  await sleep(1500);
  if (kind === 'success') await s.success();
  else await s.flee();
  return done;
}
