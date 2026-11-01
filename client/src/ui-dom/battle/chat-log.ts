// The "#duel" chat log: lines grouped by turn (collapsible), system lines revealed token by token, chat bubbles.
import './dock.css';
import { h } from '../dom';
import { icon, type IconName } from './icons';
import { Pacer, typeText } from './util';

export type Tone = 'good' | 'bad' | 'gold' | 'aiact' | 'plain';
export type Highlight = 'super' | 'crit' | 'ko' | 'levelup';
const MAX_GROUPS = 24;
const KEEP_OPEN = 2;
const HL_ICON: Record<Highlight, IconName> = { super: 'up', crit: 'spark', ko: 'none', levelup: 'trophy' };

interface Group {
  el: HTMLElement;
  body: HTMLElement;
  title: HTMLElement;
  count: number;
}

export class ChatLog {
  readonly el: HTMLElement;
  private scroller: HTMLElement;
  private head: HTMLElement;
  private groups: Group[] = [];
  private cur: Group | null = null;
  private stick = true;

  constructor(private pacer: Pacer, channel = '#duel') {
    this.head = h('div.bt-chat-head', null, h('b', null, channel), h('span', { class: 'bt-chat-sub' }, ''));
    this.scroller = h('div.bt-chat-scroll', { role: 'log', 'aria-live': 'polite', onscroll: () => this.onScroll() });
    this.el = h('section.bt-chat', null, this.head, this.scroller);
  }

  private onScroll(): void {
    const s = this.scroller;
    this.stick = s.scrollHeight - s.scrollTop - s.clientHeight < 36;
  }

  setSub(text: string): void {
    const sub = this.head.querySelector('.bt-chat-sub');
    if (sub) sub.textContent = text;
  }

  clear(): void {
    this.scroller.replaceChildren();
    this.groups = [];
    this.cur = null;
    this.stick = true;
  }

  /** Starts a new turn group (thin separator + collapsible body); older groups fold away. */
  turn(label: string): void {
    const title = h('span.bt-grp-title', null, label);
    const meta = h('span.bt-grp-meta');
    const toggle = h('button.bt-grp-head', { type: 'button', 'aria-expanded': 'true' }, h('i.bt-grp-line'), title, meta, h('i.bt-grp-line'));
    const body = h('div.bt-grp-body');
    const el = h('div.bt-grp', null, toggle, body);
    const g: Group = { el, body, title: meta, count: 0 };
    toggle.addEventListener('click', () => this.fold(g, !el.classList.contains('is-folded')));
    this.groups.push(g);
    this.cur = g;
    this.scroller.append(el);
    while (this.groups.length > MAX_GROUPS) this.groups.shift()?.el.remove();
    this.groups.slice(0, -KEEP_OPEN).forEach((o) => {
      if (!o.el.classList.contains('is-folded') && !o.el.dataset.pinned) this.fold(o, true);
    });
    this.stick = true;
    this.toEnd();
  }

  private fold(g: Group, folded: boolean): void {
    g.el.classList.toggle('is-folded', folded);
    g.el.dataset.pinned = folded ? '' : '1';
    g.el.querySelector('.bt-grp-head')?.setAttribute('aria-expanded', String(!folded));
    g.title.textContent = folded ? `${g.count} lignes` : '';
  }

  private push<T extends HTMLElement>(line: T): T {
    if (!this.cur) this.turn('ouverture');
    const g = this.cur;
    if (g) {
      g.body.append(line);
      g.count++;
    }
    this.toEnd();
    return line;
  }

  toEnd(): void {
    if (this.stick) this.scroller.scrollTop = this.scroller.scrollHeight;
  }

  /** `▸ text` mono line, typed token by token. */
  async system(text: string, o: { tag?: string; tone?: Tone } = {}): Promise<HTMLElement> {
    const body = h('span.bt-line-text');
    const line = this.push(h('div.bt-line', null, h('span.bt-prefix', null, '▸'), o.tag ? h('b.bt-line-tag', { dataset: { tone: o.tone ?? 'plain' } }, o.tag) : null, body));
    await typeText(body, text, this.pacer);
    this.toEnd();
    return line;
  }

  /** Instant system line (no typing). */
  note(text: string, tone: Tone = 'plain', hl?: Highlight): HTMLElement {
    const line = this.push(h('div.bt-line.is-note', { dataset: { tone } }, h('span.bt-prefix', null, '▸'), h('span.bt-line-text', null, text)));
    if (hl) this.mark(line, hl);
    return line;
  }

  async bubble(side: 'player' | 'foe', who: string, text: string, extra?: HTMLElement | null, typed = true): Promise<HTMLElement> {
    const body = h('div.bt-msg-text');
    const content = extra ? h('div.bt-msg-row', null, body, extra) : body;
    const el = this.push(h(`div.bt-msg.is-${side}`, null, h('div.bt-msg-who', null, who), content));
    if (typed) await typeText(body, text, this.pacer, 20);
    else body.textContent = text;
    this.toEnd();
    return el;
  }

  /** Mono diff line, e.g. "GPT-4o  −1 240 tokens". Returns the line so tags can be appended. */
  diff(label: string, delta: string, tone: 'bad' | 'good'): HTMLElement {
    return this.push(
      h('div.bt-line.is-diff', null, h('span.bt-prefix', null, '▸'), h('span.bt-line-text', null, label), h('b.bt-diff', { dataset: { tone } }, delta)),
    );
  }

  tag(line: HTMLElement, text: string, tone: Tone): void {
    line.append(h('span.bt-chip.bt-linetag', { dataset: { tone } }, text));
    this.toEnd();
  }

  /** Emphasises an important line (super effective, critical hit, K.O., level up). */
  mark(line: HTMLElement, hl: Highlight): void {
    line.classList.add('is-hl');
    line.dataset.hl = hl;
    if (!line.querySelector('.bt-ico')) line.prepend(icon(HL_ICON[hl], 'bt-hl-ico'));
  }

  divider(text: string): void {
    this.push(h('div.bt-divider', null, h('span', null, text)));
  }

  /** Arbitrary block (xp widget, banners...). */
  block<T extends HTMLElement>(el: T): T {
    return this.push(el);
  }
}
