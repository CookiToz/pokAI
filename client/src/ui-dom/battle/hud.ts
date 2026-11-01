// Stage HUD pieces: party strip (mini art + HP pip + status) and the turn indicator pill.
import { h } from '../dom';
import { pokaiSvg } from '../../art/svg';
import { displayName, maxContext } from '../../systems/pokai';
import type { PokaiInstance } from '../../state/types';
import { icon } from './icons';
import { STATUS_LABEL } from './util';

interface Slot {
  el: HTMLElement;
  fill: HTMLElement;
  dot: HTMLElement;
  max: number;
}

/** Up to 6 slots. The player side shows art; the foe side only shows anonymous "sessions" (hidden info). */
export class PartyStrip {
  readonly el: HTMLElement;
  private slots = new Map<string, Slot>();
  private sessions: HTMLElement[] = [];

  constructor(private side: 'player' | 'foe') {
    this.el = h(`div.bt-party.is-${side}`, { role: 'img', 'aria-label': side === 'player' ? 'Ton équipe' : "Équipe de l'adversaire" });
    this.el.hidden = true;
  }

  /** `foeVisible` is false for a wild PokAI: no strip at all. */
  render(team: PokaiInstance[], activeUid: string | null, visible = true): void {
    this.slots.clear();
    this.sessions = [];
    this.el.hidden = !visible || team.length === 0;
    const items: HTMLElement[] = [];
    for (const p of team) {
      if (this.side === 'player') {
        const max = maxContext(p);
        const fill = h('i');
        const dot = h('b.bt-party-st');
        const el = h('span.bt-slot', { title: displayName(p) }, h('span.bt-slot-art', { html: pokaiSvg(p.form) }), h('span.bt-slot-hp', null, fill), dot);
        this.slots.set(p.uid, { el, fill, dot, max });
        items.push(el);
        this.paint(p.uid, p.context, p.status ?? null, p.uid === activeUid);
      } else {
        const el = h('span.bt-session', null, icon('session'));
        this.sessions.push(el);
        items.push(el);
        el.classList.toggle('is-ko', p.context <= 0);
        if (p.context <= 0) el.replaceChildren(icon('session_ko'));
        if (p.uid === activeUid) el.classList.add('is-active');
      }
    }
    this.el.replaceChildren(...items, ...(this.side === 'foe' ? [h('span.bt-party-n', null, `${team.filter((p) => p.context > 0).length}/${team.length} sessions`)] : []));
  }

  private paint(uid: string, hp: number, status: PokaiInstance['status'] | null, active: boolean): void {
    const s = this.slots.get(uid);
    if (!s) return;
    const r = s.max > 0 ? Math.max(0, hp) / s.max : 0;
    s.fill.style.width = `${Math.round(r * 100)}%`;
    s.el.dataset.lvl = r <= 0 ? 'ko' : r <= 0.25 ? 'crit' : r <= 0.5 ? 'warn' : 'ok';
    s.el.classList.toggle('is-active', active);
    s.dot.hidden = !status || hp <= 0;
    s.dot.title = status ? STATUS_LABEL[status] : '';
  }

  /** Live update for the PokAI currently animated on the card. */
  update(uid: string, hp: number, status: PokaiInstance['status'] | null, active: boolean): void {
    this.paint(uid, hp, status, active);
  }

  /** Foe side: mark the n-th session as the active one / KO. */
  setFoeState(team: PokaiInstance[], activeUid: string | null, koUids: Set<string>): void {
    if (this.side !== 'foe') return;
    team.forEach((p, i) => {
      const el = this.sessions[i];
      if (!el) return;
      const ko = koUids.has(p.uid) || p.context <= 0 && p.uid !== activeUid;
      el.classList.toggle('is-ko', ko);
      el.classList.toggle('is-active', p.uid === activeUid && !ko);
      el.replaceChildren(icon(ko ? 'session_ko' : 'session'));
    });
    const n = this.el.querySelector('.bt-party-n');
    if (n) n.textContent = `${team.length - koUids.size}/${team.length} sessions`;
  }
}

export type TurnState = 'idle' | 'you' | 'think' | 'busy';

/** "À toi de prompter" / "GPT-4o réfléchit…" with typing dots. */
export class TurnPill {
  readonly el: HTMLElement;
  private label = h('span.bt-turn-label');
  private num = h('span.bt-turn-n');

  constructor() {
    this.el = h('div.bt-turnpill', { role: 'status', 'aria-live': 'polite', dataset: { state: 'idle' } }, this.num, this.label, h('span.bt-dots3', null, h('i'), h('i'), h('i')));
  }

  set(state: TurnState, text = '', turn?: number): void {
    this.el.dataset.state = state;
    this.label.textContent = state === 'idle' ? '' : text;
    if (turn !== undefined) this.num.textContent = `T${turn}`;
  }
}
