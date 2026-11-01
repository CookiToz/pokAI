// Starter choice: Pr LeCube's lab, three big model cards.
import './common.css';
import './starter.css';
import { h } from '../dom';
import { db } from '../../data/db';
import { game } from '../../state/store';
import { pokaiSvg } from '../../art/svg';
import { createRng } from '../../systems/rng';
import { createPokai } from '../../systems/pokai';
import { effectiveBase } from '../../systems/stats';
import type { Action } from '../../input/input';
import { modalChoice } from './modals';
import { Screen, titlebar } from './screen';
import { Pacer, STAT_LABEL, STAT_ORDER, licenceChip, sleep, typeChip, typeText } from './util';

interface Choice {
  form: string;
  pitch: string;
}

const CHOICES: Choice[] = [
  { form: 'claude_haiku', pitch: "Rapide, poli, et il s'excuse avant chaque réponse." },
  { form: 'phi_1', pitch: 'Minuscule, élevé aux manuels scolaires. Étonnamment solide.' },
  { form: 'gemma', pitch: "Open-weights et sympa. Il a la licence, pas le mode d'emploi." },
];

class StarterScreen {
  private screen = new Screen('starter', 'bt-starter');
  private idx = 0;
  private busy = false;
  private cardEls: HTMLElement[] = [];
  private resolve!: (id: string) => void;
  private choices = CHOICES.filter((c) => db.hasForm(c.form));

  constructor() {
    const quote = h(
      'div.st-quote',
      null,
      h('span.st-quote-who', null, 'Pr LeCube :'),
      h('q', null, 'Prends-en un. Ils sont tous sous garantie. Presque.'),
    );
    this.cardEls = this.choices.map((c, i) => this.card(c, i));
    const body = h(
      'div.st-body',
      null,
      quote,
      h('div.st-cards', { role: 'listbox' }, ...this.cardEls),
      h('div.st-hintline', null, 'Choisis ton premier modèle. Il ne pourra pas être rendu (conditions générales).'),
    );
    this.screen.root.append(titlebar('labo_lecube.exe — premier modèle', 'garantie : presque'), body);
    this.screen.onAction((a) => this.onAction(a));
    this.render();
  }

  run(): Promise<string> {
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  private card(c: Choice, i: number): HTMLElement {
    const f = db.form(c.form);
    const base = effectiveBase(f);
    const max = 160;
    const stats = STAT_ORDER.flatMap((k) => [
      h('span', null, STAT_LABEL[k]),
      h('div.bt-meter', null, h('i', { style: { width: `${Math.min(100, (base[k] / max) * 100)}%` } })),
    ]);
    return h(
      'button.st-card',
      { type: 'button', role: 'option', onclick: () => { this.idx = i; this.render(); void this.confirm(); }, onmouseenter: () => { if (!this.busy) { this.idx = i; this.render(); } } },
      h('div.st-art', { html: pokaiSvg(c.form) }),
      h('div.st-name', null, f.name),
      h('div.st-chips', null, ...f.types.map((t) => typeChip(t)), licenceChip(f.licence)),
      h('div.st-pitch', null, c.pitch),
      h('div.st-stats', null, ...stats),
    );
  }

  private render(): void {
    this.cardEls.forEach((el, i) => el.classList.toggle('is-focus', i === this.idx));
    this.screen.hints([['left', 'Choisir'], ['confirm', 'Onboarder ce modèle']]);
  }

  private onAction(a: Action): void {
    if (this.busy) return;
    const n = this.choices.length;
    if (a === 'left' || a === 'up') this.idx = (this.idx + n - 1) % n;
    else if (a === 'right' || a === 'down') this.idx = (this.idx + 1) % n;
    else if (a === 'confirm') return void this.confirm();
    this.render();
  }

  private async confirm(): Promise<void> {
    const c = this.choices[this.idx];
    if (!c || this.busy) return;
    this.busy = true;
    const name = db.form(c.form).name;
    const pick = await modalChoice(this.screen.root, {
      title: 'Confirmer',
      message: `Choisir ${name} comme premier modèle ?`,
      options: ['Oui, onboarder', 'Je réfléchis encore'],
      cancelIndex: 1,
      primary: 0,
    });
    this.render();
    if (pick !== 0) {
      this.busy = false;
      return;
    }
    const p = createPokai(c.form, 5, createRng(game.nextSeed()));
    game.addPokai(p);
    game.markCaught(c.form);
    game.setFlag(`starter_${c.form}`);
    this.cardEls.forEach((el, i) => {
      el.classList.remove('is-focus');
      el.classList.add(i === this.idx ? 'is-chosen' : 'is-dim');
    });
    const text = h('div');
    this.screen.root.append(h('div.st-toast', null, text));
    await typeText(text, `${name} rejoint ton équipe !`, new Pacer(), 26);
    await sleep(900);
    await this.screen.close();
    this.resolve(c.form);
  }
}

export function openStarter(): Promise<string> {
  return new StarterScreen().run();
}
