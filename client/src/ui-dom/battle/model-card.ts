// A "model card": slim identity card (name, level, types, status, context window) attached to a lit stage pedestal with the art.
import { h } from '../dom';
import { db } from '../../data/db';
import { pokaiSvg } from '../../art/svg';
import { displayName, maxContext } from '../../systems/pokai';
import { xpForLevel } from '../../systems/stats';
import type { PokaiInstance } from '../../state/types';
import type { StatusId, TypeId } from '../../data/types';
import './status-fx.css';
import './stage.css';
import { prefersReducedMotion } from './fx';
import { icon } from './icons';
import { PartyStrip } from './hud';
import { fmtTokens, licenceChip, sleep, STATUS_LABEL, tween, typeChip } from './util';

const CELLS = 40;
const GHOST_HOLD = 380;

const HOURGLASS = '<svg viewBox="0 0 24 32" width="100%" height="100%"><path d="M3 2 H21 V8 L14 16 L21 24 V30 H3 V24 L10 16 L3 8 Z" fill="#ffd23f" stroke="#1d1a2b" stroke-width="2.5" stroke-linejoin="miter"/><path d="M7 26 H17 L12 20 Z M9 7 H15 L12 11 Z" fill="#1d1a2b"/></svg>';
const WRENCH = '<svg viewBox="0 0 32 32" width="100%" height="100%"><path d="M4 26 L16 14 A8 8 0 0 1 27 4 L22 9 L23 13 L27 14 L28 10 A8 8 0 0 1 18 22 L8 30 Z" fill="#8c93a3" stroke="#1d1a2b" stroke-width="2.5" stroke-linejoin="miter"/></svg>';

/** Persistent per-status visuals drawn over the art (CSS does the animation, see status-fx.css). */
function statusDecor(s: StatusId | null): HTMLElement[] {
  switch (s) {
    case 'overheat':
      return [h('i.st-puff'), h('i.st-puff'), h('i.st-puff')];
    case 'hallucinating':
      return [h('b.st-q', null, '?'), h('b.st-q', null, '?'), h('b.st-q', null, '!?')];
    case 'rate_limited':
      return [h('i.st-glass', { html: HOURGLASS })];
    case 'maintenance':
      return [h('b.st-zzz', null, 'Zzz'), h('i.st-wrench', { html: WRENCH })];
    case 'censored':
      return [h('b.st-censor', null, '[CENSURÉ]')];
    case 'deprecated':
      return [h('i.st-strike'), h('b.st-obsolete', null, 'OBSOLÈTE')];
    case 'api_outage':
      return [h('b.st-503', null, '503')];
    default:
      return [];
  }
}

export class ContextWindow {
  readonly el: HTMLElement;
  private cells: HTMLElement[] = [];
  private count: HTMLElement;
  private pct: HTMLElement;
  private shown = 0;
  private filled = 0;
  private drainTimer = 0;

  constructor() {
    const grid = h('div.bt-ctx-grid');
    for (let i = 0; i < CELLS; i++) {
      const c = h('i.bt-cell');
      this.cells.push(c);
      grid.append(c);
    }
    this.count = h('b.bt-ctx-count');
    this.pct = h('span.bt-ctx-pct');
    this.el = h(
      'div.bt-ctx',
      { dataset: { lvl: 'ok' } },
      h('div.bt-ctx-head', null, h('span.bt-ctx-lbl', null, 'contexte'), h('span.bt-ctx-num', null, this.count, this.pct)),
      grid,
      h('span.bt-ctx-sparks', null, icon('spark'), icon('spark'), icon('spark')),
    );
  }

  private paint(hp: number, max: number, anim: boolean): void {
    const ratio = max > 0 ? Math.max(0, hp) / max : 0;
    const next = hp <= 0 ? 0 : Math.max(1, Math.ceil(ratio * CELLS));
    const prev = this.filled;
    window.clearTimeout(this.drainTimer);
    const lost = anim && next < prev;
    this.cells.forEach((c, i) => {
      c.style.transitionDelay = '0ms';
      c.classList.remove('spark');
      if (i < next) {
        c.className = 'bt-cell on';
        if (anim && i >= prev) {
          c.classList.add('spark');
          c.style.animationDelay = `${(i - prev) * 8}ms`;
        }
      } else if (lost && i < prev) c.className = 'bt-cell ghost';
      else c.className = 'bt-cell';
    });
    if (lost) {
      this.drainTimer = window.setTimeout(() => {
        for (let i = next; i < prev; i++) {
          const c = this.cells[i];
          if (!c) continue;
          c.style.transitionDelay = `${(prev - 1 - i) * 7}ms`;
          c.classList.remove('ghost');
        }
      }, prefersReducedMotion() ? 0 : GHOST_HOLD);
    }
    this.filled = next;
    this.el.dataset.lvl = ratio <= 0.25 ? 'crit' : ratio <= 0.5 ? 'warn' : 'ok';
    this.el.classList.toggle('is-gain', anim && next > prev);
    this.pct.textContent = ` ${Math.round(ratio * 100)} %`;
    this.count.textContent = `${fmtTokens(Math.max(0, hp))} / ${fmtTokens(max)}`;
  }

  set(hp: number, max: number): void {
    this.shown = hp;
    this.paint(hp, max, false);
  }

  /** Animates the counter and the blocks from the current value to `hp` (damage leaves a ghost chunk that drains). */
  async animate(hp: number, max: number, ms = 420): Promise<void> {
    const from = this.shown;
    this.shown = hp;
    this.paint(hp, max, true);
    await tween(from, hp, prefersReducedMotion() ? 0 : ms, (v) => {
      this.count.textContent = `${fmtTokens(Math.max(0, Math.round(v)))} / ${fmtTokens(max)}`;
    });
    this.count.textContent = `${fmtTokens(Math.max(0, hp))} / ${fmtTokens(max)}`;
    window.setTimeout(() => this.el.classList.remove('is-gain'), 600);
  }

  get value(): number {
    return this.shown;
  }
}

const STAGE_SHORT: Record<string, string> = { power: 'PUI', robustness: 'ROB', throughput: 'DÉB', precision: 'PRÉ' };

export class ModelCard {
  readonly el: HTMLElement;
  readonly ctx = new ContextWindow();
  readonly strip: PartyStrip;
  private art: HTMLElement;
  private name: HTMLElement;
  private level: HTMLElement;
  private chips: HTMLElement;
  private badges: HTMLElement;
  private xp: HTMLElement;
  private xpFill: HTMLElement;
  private xpLbl: HTMLElement;
  private ribbon: HTMLElement;
  private stamp: HTMLElement;
  private deco = h('div.bt-stfx');
  private maxHp = 1;
  private status: StatusId | null = null;
  private stages = new Map<string, number>();

  constructor(readonly side: 'player' | 'foe') {
    this.strip = new PartyStrip(side);
    this.art = h('div.bt-art.bt-mart');
    this.ribbon = h('div.bt-ribbon', null, 'CONFORME');
    this.stamp = h('div.bt-stamp-off', null, 'déconnecté');
    this.name = h('div.bt-mname');
    this.level = h('span.bt-mlevel');
    this.chips = h('div.bt-mchips');
    this.badges = h('div.bt-mbadges');
    this.xpFill = h('i');
    this.xpLbl = h('span', null, 'fine-tuning');
    this.xp = h('div.bt-mxp', null, this.xpLbl, h('div.bt-meter', null, this.xpFill));
    if (side === 'foe') this.xp.hidden = true;
    const artWrap = h('div.bt-mart-wrap', null, this.art, this.deco, this.ribbon, this.stamp);
    const pedestal = h('div.bt-pedestal', null, h('div.bt-spot'), h('div.bt-platform'), artWrap);
    const info = h('div.bt-minfo', null, h('div.bt-mhead', null, this.name, this.level), this.chips, this.ctx.el, this.badges, this.xp);
    this.el = h(`div.bt-mcard.is-${side}`, null, info, pedestal, this.strip.el);
    this.el.classList.add('is-empty');
  }

  /** Puts a PokAI on the card; `hp` is the value to display (may differ from p.context mid-sequence). */
  show(p: PokaiInstance, hp: number): void {
    const form = db.form(p.form);
    this.maxHp = maxContext(p);
    this.art.innerHTML = pokaiSvg(p.form);
    this.name.textContent = displayName(p);
    this.level.textContent = `Nv. ${p.level}`;
    this.chips.replaceChildren(...form.types.map((t: TypeId) => typeChip(t)), licenceChip(form.licence));
    this.stages.clear();
    this.el.classList.toggle('is-sealed', p.sealed === true);
    this.el.classList.remove('is-fainted', 'is-empty', 'is-glitching');
    this.setStatus(p.status ?? null);
    this.ctx.set(hp, this.maxHp);
    this.setXp(p);
  }

  setLevel(n: number): void {
    this.level.textContent = `Nv. ${n}`;
    this.level.classList.remove('is-up');
    void this.level.offsetWidth;
    this.level.classList.add('is-up');
  }

  private renderBadges(): void {
    const out: HTMLElement[] = [];
    if (this.status) {
      out.push(h('span.bt-chip.is-status', { dataset: { status: this.status } }, icon(this.status), STATUS_LABEL[this.status]));
    }
    for (const [stat, v] of this.stages) {
      if (v === 0) continue;
      out.push(h(`span.bt-chip.bt-stage.${v > 0 ? 'is-buff' : 'is-debuff'}`, { title: stat }, icon(v > 0 ? 'up' : 'down'), `${STAGE_SHORT[stat] ?? stat} ${v > 0 ? '+' : ''}${v}`));
    }
    this.badges.replaceChildren(...out);
    this.badges.hidden = out.length === 0;
  }

  setStatus(s: StatusId | null): void {
    this.status = s;
    this.el.dataset.status = s ?? '';
    this.deco.replaceChildren(...statusDecor(s));
    this.renderBadges();
  }

  /** Total stat stage (as reported by the engine's `stat` event). */
  setStage(stat: string, total: number): void {
    this.stages.set(stat, total);
    this.renderBadges();
  }

  setXp(p: PokaiInstance): void {
    if (this.side !== 'player') return;
    const lo = xpForLevel(p.level);
    const hi = xpForLevel(p.level + 1);
    const r = hi > lo ? Math.max(0, Math.min(1, (p.xp - lo) / (hi - lo))) : 1;
    this.xpFill.style.width = `${Math.round(r * 100)}%`;
    this.xpLbl.textContent = `fine-tuning ${Math.round(r * 100)} %`;
  }

  async hit(hp: number, effectiveness: number): Promise<void> {
    this.pulse('is-shake');
    if (effectiveness > 1) this.pulse('is-misreg');
    await this.ctx.animate(hp, this.maxHp);
  }

  async heal(hp: number): Promise<void> {
    this.el.classList.add('is-healing');
    await this.ctx.animate(hp, this.maxHp);
    this.el.classList.remove('is-healing');
  }

  /** Quick lunge toward the opponent when attacking. */
  async lunge(): Promise<void> {
    this.art.classList.remove('is-lunge');
    void this.art.offsetWidth;
    this.art.classList.add('is-lunge');
    await sleep(220);
    this.art.classList.remove('is-lunge');
  }

  async faint(): Promise<void> {
    this.el.classList.add('is-fainted');
    await sleep(380);
  }

  async enter(): Promise<void> {
    this.el.classList.remove('is-leaving');
    this.el.classList.add('is-entering');
    await sleep(240);
    this.el.classList.remove('is-entering');
  }

  async leave(): Promise<void> {
    this.el.classList.add('is-leaving');
    await sleep(200);
    this.el.classList.add('is-empty');
  }

  pulse(cls: string): void {
    this.art.classList.remove(cls);
    void this.art.offsetWidth;
    this.art.classList.add(cls);
  }

  glitch(): void {
    this.el.classList.add('is-glitching');
  }
}
