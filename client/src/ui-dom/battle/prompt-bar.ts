// The prompt bar: move cards (type band, category icon, power/accuracy/tokens, effectiveness hint vs the foe),
// a description panel, and secondary actions as a compact OS taskbar. Keyboard grid, gamepad (via actions) and mouse.
import './dock.css';
import { h } from '../dom';
import { db } from '../../data/db';
import type { Action } from '../../input/input';
import type { MoveCategory, TypeId } from '../../data/types';
import type { PokaiInstance } from '../../state/types';
import { icon, type IconName } from './icons';
import { TYPE_LABEL, typeChip } from './util';

export type BarChoice =
  | { kind: 'move'; index: number }
  | { kind: 'onboard' }
  | { kind: 'party' }
  | { kind: 'bag' }
  | { kind: 'flee' };

export interface FoeInfo {
  name: string;
  types: TypeId[];
}

export interface CensorInfo {
  /** Display name of the blocked move. */
  move: string;
  turns: number;
}

interface Cell {
  el: HTMLElement;
  choice: BarChoice | null;
  render: () => (Node | string)[]; // description panel content
  disabled?: string; // reason
}

const ACTIONS: { label: string; hint: string; choice: BarChoice; ico: IconName }[] = [
  { label: 'Onboarder', hint: "Affaibli, un PokAI sauvage peut être onboardé avec une Clé API.", choice: { kind: 'onboard' }, ico: 'onboard' },
  { label: 'Équipe', hint: 'Changer de PokAI (le tour est consommé).', choice: { kind: 'party' }, ico: 'team' },
  { label: 'Sac', hint: 'Utiliser un objet de soin.', choice: { kind: 'bag' }, ico: 'bag' },
  { label: 'Fuir', hint: 'Quitter la conversation.', choice: { kind: 'flee' }, ico: 'flee' },
];

const CAT_LABEL: Record<MoveCategory, string> = { damage: 'Dégâts', status: 'Altération', heal: 'Soin', shield: 'Bouclier', buff: 'Boost', debuff: 'Affaiblissement' };

export type Effect = 'super' | 'weak' | 'none' | 'neutral';

export function effectOf(mult: number): Effect {
  return mult === 0 ? 'none' : mult > 1 ? 'super' : mult < 1 ? 'weak' : 'neutral';
}

const fmtMult = (m: number): string => (m === 0 ? '×0' : m >= 1 ? `×${m}` : m === 0.5 ? '×½' : '×¼');
const EFF_TEXT: Record<Effect, string> = { super: 'super efficace', weak: 'peu efficace', none: 'sans effet', neutral: '' };

export class PromptBar {
  readonly el: HTMLElement;
  private movesEl = h('div.bt-moves');
  private taskbar = h('div.bt-taskbar', { role: 'toolbar', 'aria-label': 'Actions' });
  private desc = h('div.bt-desc', { 'aria-live': 'polite' });
  private moveCells: Cell[] = [];
  private actionCells: Cell[] = [];
  private row = 0;
  private col = 0;
  private waiting: ((c: BarChoice) => void) | null = null;
  private locked = true;

  constructor() {
    this.el = h('div.bt-bar.is-locked', null, this.movesEl, this.desc, this.taskbar);
    this.taskbar.append(h('span.bt-task-start', null, 'actions'));
    ACTIONS.forEach((a, i) => {
      const el = h(
        'button.bt-task',
        { type: 'button', onclick: () => { this.focusCell(this.actionCells[i]); this.activate(); }, onmouseenter: () => this.focusCell(this.actionCells[i]) },
        icon(a.ico),
        h('span', null, a.label),
      );
      this.actionCells.push({ el, choice: a.choice, render: () => [h('b', null, `/${a.label.toLowerCase()}`), ' ', a.hint] });
      this.taskbar.append(el);
    });
  }

  setMoves(p: PokaiInstance, canFlee: boolean, foe: FoeInfo, censor?: CensorInfo | null): void {
    const anyLeft = p.moves.some((m) => m.tokens > 0);
    this.movesEl.replaceChildren();
    this.moveCells = [];
    p.moves.slice(0, 4).forEach((slot, i) => {
      const mv = db.move(slot.move);
      const empty = slot.tokens <= 0 && anyLeft;
      const blocked = censor !== null && censor !== undefined && censor.move === mv.name;
      const mult = mv.power > 0 ? db.effectiveness(mv.type, foe.types) : 1;
      const eff = mv.power > 0 ? effectOf(mult) : 'neutral';
      const reason = blocked ? `Censurée : encore ${censor?.turns ?? 1} tour${(censor?.turns ?? 1) > 1 ? 's' : ''}.` : empty ? 'Plus de jetons pour cette technique !' : undefined;
      const low = slot.tokens <= Math.max(1, Math.floor(mv.tokens / 4));

      const hintEl = h(
        'span.bt-move-eff',
        { dataset: { eff } },
        reason ? icon('lock') : eff === 'super' ? icon('up') : eff === 'weak' ? icon('down') : eff === 'none' ? icon('none') : null,
        reason ? (blocked ? 'censurée' : 'vide') : eff === 'neutral' ? (mv.power > 0 ? TYPE_LABEL[mv.type] : CAT_LABEL[mv.category]) : eff === 'super' ? `${fmtMult(mult)} super` : eff === 'weak' ? `${fmtMult(mult)} peu` : 'sans effet',
      );
      const el = h(
        'button.bt-move',
        { type: 'button', dataset: { type: mv.type, eff }, onclick: () => { this.focusCell(this.moveCells[i]); this.activate(); }, onmouseenter: () => this.focusCell(this.moveCells[i]) },
        h('span.bt-move-band', null, icon(mv.category)),
        h(
          'span.bt-move-main',
          null,
          h('span.bt-move-name', null, mv.name),
          h('span.bt-move-meta', null, h('span', null, mv.power > 0 ? `${mv.power} · ${mv.accuracy} %` : `${mv.accuracy} % préc.`), h(`b.bt-move-tok${low ? '.is-low' : ''}`, null, `${slot.tokens}/${mv.tokens}`)),
          hintEl,
        ),
      );
      if (reason) el.classList.add('is-disabled');
      const effLine = eff === 'neutral' ? null : `${EFF_TEXT[eff][0]?.toUpperCase()}${EFF_TEXT[eff].slice(1)} contre ${foe.name} (${fmtMult(mult)}). `;
      const cell: Cell = {
        el,
        choice: { kind: 'move', index: i },
        render: () => [
          h('b', null, `/${mv.name}`),
          ' ',
          typeChip(mv.type),
          h('span.bt-desc-stats', null, ` ${CAT_LABEL[mv.category]} · ${mv.power > 0 ? `puiss. ${mv.power} · ` : ''}préc. ${mv.accuracy} % · ${slot.tokens}/${mv.tokens} jetons`),
          h('span.bt-desc-text', null, effLine ? h('em', { dataset: { eff } }, effLine) : null, mv.description),
        ],
        ...(reason ? { disabled: reason } : {}),
      };
      this.moveCells.push(cell);
      this.movesEl.append(el);
    });
    const flee = this.actionCells[3];
    if (flee) {
      flee.disabled = canFlee ? undefined : 'Impossible de fuir ce combat !';
      flee.el.classList.toggle('is-disabled', !canFlee);
    }
    if (this.row === 0) this.col = Math.min(this.col, Math.max(0, this.moveCells.length - 1));
    this.render();
  }

  setActionDisabled(kind: BarChoice['kind'], reason: string | null): void {
    for (const c of this.actionCells) {
      if (c.choice?.kind === kind) {
        c.disabled = reason ?? undefined;
        c.el.classList.toggle('is-disabled', reason !== null);
      }
    }
  }

  /** Waits for the next choice (the bar is unlocked while waiting). */
  next(): Promise<BarChoice> {
    this.locked = false;
    this.el.classList.remove('is-locked');
    this.render();
    return new Promise((resolve) => {
      this.waiting = resolve;
    });
  }

  lock(): void {
    this.locked = true;
    this.waiting = null;
    this.el.classList.add('is-locked');
    this.render();
  }

  say(text: string): void {
    this.desc.replaceChildren(text);
  }

  private rows(): Cell[][] {
    const first = this.moveCells[0]?.el;
    const top = first?.offsetTop ?? 0;
    let cols = this.moveCells.filter((c) => c.el.offsetTop === top).length;
    if (cols < 1) cols = Math.max(1, this.moveCells.length);
    const out: Cell[][] = [];
    for (let i = 0; i < this.moveCells.length; i += cols) out.push(this.moveCells.slice(i, i + cols));
    out.push(this.actionCells);
    return out;
  }

  private cell(): Cell | undefined {
    return this.rows()[this.row]?.[this.col];
  }

  private focusCell(cell: Cell | undefined): void {
    if (this.locked || !cell) return;
    const rows = this.rows();
    rows.forEach((r, ri) => {
      const ci = r.indexOf(cell);
      if (ci >= 0) {
        this.row = ri;
        this.col = ci;
      }
    });
    this.render();
  }

  private render(): void {
    const rows = this.rows();
    rows.forEach((r, ri) => r.forEach((c, ci) => c.el.classList.toggle('is-focus', !this.locked && ri === this.row && ci === this.col)));
    const c = rows[this.row]?.[this.col];
    if (!c) return;
    if (this.locked) {
      this.desc.dataset.state = 'locked';
      return;
    }
    this.desc.dataset.state = c.disabled ? 'disabled' : 'ok';
    const body = c.render();
    this.desc.replaceChildren(...body, ...(c.disabled ? [h('span.bt-desc-warn', null, ` ${c.disabled}`)] : []));
  }

  private activate(): void {
    const c = this.cell();
    if (!c || !c.choice || !this.waiting || this.locked) return;
    if (c.disabled) {
      this.desc.dataset.state = 'disabled';
      this.desc.replaceChildren(h('span.bt-desc-warn.is-shake', null, c.disabled));
      return;
    }
    const resolve = this.waiting;
    this.lock();
    resolve(c.choice);
  }

  handle(a: Action): void {
    if (this.locked) return;
    const rows = this.rows();
    const len = (r: number): number => rows[r]?.length ?? 0;
    const last = rows.length - 1;
    if (a === 'left') this.col = Math.max(0, this.col - 1);
    else if (a === 'right') this.col = Math.min(len(this.row) - 1, this.col + 1);
    else if (a === 'down' && this.row < last) {
      this.row++;
      this.col = Math.min(len(this.row) - 1, this.col);
    } else if (a === 'up' && this.row > 0) {
      this.row--;
      this.col = Math.min(Math.max(0, len(this.row) - 1), this.col);
    } else if (a === 'back') {
      this.row = 0;
      this.col = 0;
    } else if (a === 'confirm') {
      this.activate();
      return;
    }
    this.render();
  }
}
