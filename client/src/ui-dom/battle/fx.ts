// Attack animations: an overlay layer on top of the duel. Riso style: hard shapes, misregistered copies, no blur.
// Pure presentation. The duel asks for a move effect between `move_used` and `damage`; nothing here decides outcomes.
import './fx.css';
import { h } from '../dom';
import type { MoveCategory, TypeId } from '../../data/types';
import type { BattleSide } from '../../systems/battle';
import type { Pacer } from './util';

export interface Pt {
  x: number;
  y: number;
}

export interface MoveFxOpts {
  /** Side that uses the move. */
  from: BattleSide;
  /** Side that receives the visual (the opposite one for damage/debuff/status, the same for heal/buff/shield). */
  to: BattleSide;
  type: TypeId;
  category: MoveCategory;
  eff: number;
  crit: boolean;
  miss: boolean;
  /** Buff or debuff direction, used for stat moves. */
  down?: boolean;
}

interface Part {
  cls: string;
  x0: number;
  y0: number;
  x1?: number;
  y1?: number;
  xm?: number;
  ym?: number;
  d?: number;
  dur?: number;
  r0?: number;
  r1?: number;
  s0?: number;
  s1?: number;
  text?: string;
  html?: string;
  type?: TypeId;
  anim?: string;
  ease?: string;
  u?: number;
  vars?: Record<string, string>;
}

const BUBBLES = ['Bien sûr !', 'Certes', '…', 'Ok !', 'Désolé', '1.', 'Merci', '**gras**', 'En effet'];
const GLYPHS = ['{', '}', '</>', '();', '=>', '[]', '0x', 'fn', '&&', '!='];
const GATES = ['&&', '||', 'XOR', 'NOT'];
const SHAPES = ['tri', 'circ', 'cross', 'bar', 'diamond'];
const PALETTE = ['var(--pink)', 'var(--yellow)', 'var(--blue)', 'var(--teal)'];

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)] as T;

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const ARROW_UP = '<svg viewBox="0 0 24 32" width="100%" height="100%"><path d="M12 2 L22 14 H16 V30 H8 V14 H2 Z" fill="currentColor" stroke="#1d1a2b" stroke-width="2.5" stroke-linejoin="miter"/></svg>';
const STAR = '<svg viewBox="0 0 100 100" width="100%" height="100%"><polygon points="50,2 61,34 96,30 68,52 84,86 50,66 16,86 32,52 4,30 39,34" fill="currentColor" stroke="#1d1a2b" stroke-width="4" stroke-linejoin="miter"/></svg>';
const HEX = '<svg viewBox="0 0 100 100" width="100%" height="100%"><polygon points="50,3 93,27 93,73 50,97 7,73 7,27" fill="currentColor" stroke="#1d1a2b" stroke-width="5" stroke-linejoin="miter"/><polyline points="50,3 50,97 M7,27 93,73 M93,27 7,73" fill="none" stroke="#1d1a2b" stroke-width="2" opacity="0.35"/></svg>';
const BOLT = '<svg viewBox="0 0 60 120" width="100%" height="100%" preserveAspectRatio="none"><polyline points="34,0 14,48 32,48 10,120 50,40 30,40 46,0" fill="currentColor" stroke="#1d1a2b" stroke-width="3" stroke-linejoin="miter"/></svg>';

export class FxLayer {
  readonly el = h('div.bfx-layer');
  private waiters = new Set<() => void>();
  private quakeTimer = 0;

  constructor(
    root: HTMLElement,
    private pacer: Pacer,
    private artOf: (side: BattleSide) => HTMLElement,
    private quakeEl: HTMLElement,
  ) {
    root.append(this.el);
  }

  // ------------------------------------------------------------ plumbing

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const done = (): void => {
        clearTimeout(t);
        this.waiters.delete(done);
        resolve();
      };
      const t = window.setTimeout(done, ms);
      this.waiters.add(done);
    });
  }

  /** Drops every running effect at once (the player pressed confirm to speed things up). */
  flush(): void {
    for (const w of [...this.waiters]) w();
    this.el.replaceChildren();
    this.quakeEl.classList.remove('is-quake', 'is-freeze');
  }

  private centre(side: BattleSide): { c: Pt; size: number } {
    const lr = this.el.getBoundingClientRect();
    const r = this.artOf(side).getBoundingClientRect();
    return { c: { x: r.left - lr.left + r.width / 2, y: r.top - lr.top + r.height / 2 }, size: Math.max(60, Math.min(r.width, r.height)) };
  }

  private put(p: Part, out: HTMLElement[]): number {
    const u = p.u ?? 14;
    const el = h('div', { class: `bfx ${p.cls}` });
    const s = el.style;
    const x1 = p.x1 ?? p.x0;
    const y1 = p.y1 ?? p.y0;
    s.fontSize = `${u}px`;
    s.setProperty('--x0', `${p.x0}px`);
    s.setProperty('--y0', `${p.y0}px`);
    s.setProperty('--x1', `${x1}px`);
    s.setProperty('--y1', `${y1}px`);
    s.setProperty('--xm', `${p.xm ?? (p.x0 + x1) / 2}px`);
    s.setProperty('--ym', `${p.ym ?? (p.y0 + y1) / 2}px`);
    s.setProperty('--r0', `${p.r0 ?? 0}deg`);
    s.setProperty('--r1', `${p.r1 ?? 0}deg`);
    s.setProperty('--s0', String(p.s0 ?? 1));
    s.setProperty('--s1', String(p.s1 ?? 1));
    s.setProperty('--dur', `${p.dur ?? 400}ms`);
    s.setProperty('--d', `${p.d ?? 0}ms`);
    if (p.anim) s.setProperty('--anim', p.anim);
    if (p.ease) s.setProperty('--ease', p.ease);
    for (const [k, v] of Object.entries(p.vars ?? {})) s.setProperty(k, v);
    if (p.type) el.dataset.type = p.type;
    if (p.html) el.innerHTML = p.html;
    else if (p.text) el.textContent = p.text;
    this.el.append(el);
    out.push(el);
    return (p.d ?? 0) + (p.dur ?? 400);
  }

  private async run(build: (add: (p: Part) => void) => void): Promise<void> {
    const made: HTMLElement[] = [];
    let end = 0;
    build((p) => {
      end = Math.max(end, this.put(p, made));
    });
    await this.wait(end + 30);
    for (const m of made) m.remove();
  }

  // ------------------------------------------------------------ moves

  /** Plays the effect of a move; resolves when it is over. */
  async move(o: MoveFxOpts): Promise<void> {
    if (this.pacer.fast) return;
    const from = this.centre(o.from);
    const to = this.centre(o.to);
    const u = Math.max(11, to.size / 10);
    if (prefersReducedMotion()) return this.reduced(to.c, to.size, o);

    const big = o.eff > 1;
    const dir = to.c.x >= from.c.x ? 1 : -1;
    // A miss flies past the target and fades out behind it.
    const tgt: Pt = o.miss ? { x: to.c.x + dir * to.size * 1.25, y: to.c.y - to.size * 0.35 } : to.c;
    const ctx: Ctx = { S: from.c, D: tgt, T: to.c, u, size: to.size, type: o.type, big, miss: o.miss };

    if (o.miss && o.category !== 'damage') {
      await this.missTag(to.c, to.size, o.to);
      return;
    }
    switch (o.category) {
      case 'damage':
        await this.run((add) => RECIPES[o.type](add, ctx));
        break;
      case 'status':
        await this.run((add) => aura(add, ctx));
        break;
      case 'heal':
        await this.run((add) => heal(add, ctx));
        break;
      case 'shield':
        await this.run((add) => shield(add, ctx, dir));
        break;
      case 'buff':
        await this.run((add) => arrows(add, ctx, false));
        break;
      case 'debuff':
        await this.run((add) => arrows(add, ctx, true));
        break;
    }
    if (o.miss) await this.missTag(to.c, to.size, o.to);
  }

  /** Reduced motion: one static flash of the type colour around the target. */
  private async reduced(c: Pt, size: number, o: MoveFxOpts): Promise<void> {
    const el = h('div', { class: 'bfx bfx-still', dataset: { type: o.type } });
    el.style.left = `${c.x}px`;
    el.style.top = `${c.y}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    this.el.append(el);
    await this.wait(240);
    el.remove();
  }

  private async missTag(c: Pt, size: number, side: BattleSide): Promise<void> {
    const art = this.artOf(side).querySelector('.bt-mart');
    if (art instanceof HTMLElement) {
      art.classList.remove('is-dodge');
      void art.offsetWidth;
      art.classList.add('is-dodge');
    }
    await this.run((add) => add({ cls: 'bfx-tag fx-miss', x0: c.x, y0: c.y - size * 0.55, y1: c.y - size * 0.7, dur: 520, anim: 'fx-pop', text: 'RATÉ', u: Math.max(12, size / 9), vars: { '--rot': '-6deg' } }));
  }

  // ------------------------------------------------------------ impact (on the damage event)

  /** Hit spark at the target. Super-effective hits quake the screen, crits freeze the frame. */
  async impact(side: BattleSide, eff: number, crit: boolean): Promise<void> {
    if (this.pacer.fast || eff === 0) return;
    const { c, size } = this.centre(side);
    if (prefersReducedMotion()) return;
    const u = Math.max(11, size / 10);
    const super_ = eff > 1;
    const k = super_ ? 1.7 : eff < 1 ? 0.7 : 1.15;
    if (super_) this.quake();
    const hold = crit ? 240 : 0;
    if (crit) {
      this.quakeEl.classList.add('is-freeze');
      window.setTimeout(() => this.quakeEl.classList.remove('is-freeze'), hold);
    }
    void this.run((add) => {
      add({ cls: 'bfx-spark', x0: c.x + u * 0.5, y0: c.y - u * 0.3, dur: 300, anim: 'fx-snap', html: STAR, u: u * 3 * k, vars: { '--col': 'var(--blue)' } });
      add({ cls: 'bfx-spark', x0: c.x - u * 0.4, y0: c.y + u * 0.2, dur: 300, anim: 'fx-snap', html: STAR, u: u * 3 * k, vars: { '--col': 'var(--pink)' } });
      add({ cls: 'bfx-spark', x0: c.x, y0: c.y, dur: 300, anim: 'fx-snap', html: STAR, u: u * 3 * k, vars: { '--col': 'var(--yellow)' } });
      if (super_) {
        add({ cls: 'bfx-ring', x0: c.x, y0: c.y, dur: 380, anim: 'fx-ring', u: u * 9, type: undefined, vars: { '--col': 'var(--pink)' } });
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          add({ cls: 'bfx-ray', x0: c.x + Math.cos(a) * u * 2, y0: c.y + Math.sin(a) * u * 2, x1: c.x + Math.cos(a) * u * 8, y1: c.y + Math.sin(a) * u * 8, r0: (a * 180) / Math.PI, r1: (a * 180) / Math.PI, dur: 320, u });
        }
        this.bands();
      }
      if (crit) {
        add({ cls: 'bfx-tag fx-crit', x0: c.x, y0: c.y - size * 0.1, dur: 640, anim: 'fx-stamp', text: 'CRITIQUE', u: Math.max(13, size / 7), vars: { '--rot': '-9deg' } });
      }
    });
    await this.wait(crit ? hold : super_ ? 150 : 90);
  }

  /** The misregistered colour bands that flash across the whole screen on a super-effective hit. */
  private bands(): void {
    const b = h('div.bfx-bands', null, h('i'), h('i'), h('i'));
    this.el.append(b);
    window.setTimeout(() => b.remove(), 260);
  }

  private quake(): void {
    this.quakeEl.classList.remove('is-quake');
    void this.quakeEl.offsetWidth;
    this.quakeEl.classList.add('is-quake');
    window.clearTimeout(this.quakeTimer);
    this.quakeTimer = window.setTimeout(() => this.quakeEl.classList.remove('is-quake'), 340);
  }

  /** Aura ring around a side (a status was just inflicted by a damaging move, etc.). */
  async auraOn(side: BattleSide, type: TypeId | undefined, colour?: string): Promise<void> {
    if (this.pacer.fast || prefersReducedMotion()) return;
    const { c, size } = this.centre(side);
    const u = Math.max(11, size / 10);
    await this.run((add) => aura(add, { S: c, D: c, T: c, u, size, type: type ?? 'chaos', big: false, miss: false }, colour));
  }

  /** Stat arrows on a side (when a damaging move also changed a stat). */
  async arrowsOn(side: BattleSide, down: boolean): Promise<void> {
    if (this.pacer.fast || prefersReducedMotion()) return;
    const { c, size } = this.centre(side);
    const u = Math.max(11, size / 10);
    await this.run((add) => arrows(add, { S: c, D: c, T: c, u, size, type: 'chat', big: false, miss: false }, down));
  }
}

// ---------------------------------------------------------------- recipes

interface Ctx {
  S: Pt; // attacker centre
  D: Pt; // where projectiles end (shifted past the target on a miss)
  T: Pt; // target centre
  u: number; // base unit in px (art size / 10)
  size: number;
  type: TypeId;
  big: boolean;
  miss: boolean;
}
type Add = (p: Part) => void;

function arc(x: number, y: number, k: number): { xm: number; ym: number } {
  return { xm: x, ym: y - k };
}

function chat(add: Add, c: Ctx): void {
  const n = c.big ? 10 : 7;
  for (let i = 0; i < n; i++) {
    const dy = rnd(-1.6, 1.6) * c.u;
    const mid = arc((c.S.x + c.D.x) / 2, (c.S.y + c.D.y) / 2 + dy, c.u * rnd(1, 3));
    add({
      cls: `bfx-bubble ${i % 2 ? 'is-alt' : ''}`, type: 'chat', text: pick(BUBBLES), u: c.u * 1.05,
      x0: c.S.x, y0: c.S.y + dy, x1: c.D.x + rnd(-1, 1) * c.u, y1: c.D.y + rnd(-1.6, 1.6) * c.u, ...mid,
      d: i * 42, dur: 360, r0: rnd(-10, 10), r1: rnd(-14, 14), s0: 0.5, s1: c.big ? 1.25 : 1,
    });
  }
  for (let i = 0; i < 6; i++) add({ cls: 'bfx-token', type: 'chat', x0: c.D.x, y0: c.D.y, x1: c.D.x + rnd(-4, 4) * c.u, y1: c.D.y + rnd(-4, 4) * c.u, d: 300 + i * 20, dur: 240, r1: rnd(-90, 90), u: c.u });
}

function code(add: Add, c: Ctx): void {
  const n = c.big ? 14 : 10;
  for (let i = 0; i < n; i++) {
    const dy = ((i % 4) - 1.5) * c.u * 0.9;
    add({ cls: 'bfx-glyph', type: 'code', text: pick(GLYPHS), u: c.u * 1.3, x0: c.S.x, y0: c.S.y + dy, x1: c.D.x, y1: c.D.y + dy * 0.6, d: i * 32, dur: 300, s0: 0.7 });
  }
  for (let i = 0; i < 4; i++) {
    const dy = (i - 1.5) * c.u * 0.7;
    add({ cls: `bfx-codeline ${i % 2 ? 'is-alt' : ''}`, type: 'code', u: c.u, x0: c.S.x, y0: c.S.y + dy, x1: c.D.x, y1: c.D.y + dy, d: 40 + i * 70, dur: 340, vars: { '--w': `${rnd(3, 6)}` } });
  }
  const t = n * 32 + 200;
  add({ cls: 'bfx-compile', type: 'code', x0: c.D.x, y0: c.D.y, d: t, dur: 280, anim: 'fx-flash', u: c.size / 10 });
  add({ cls: 'bfx-tag fx-build', x0: c.D.x, y0: c.D.y - c.size * 0.52, d: t, dur: 340, anim: 'fx-pop', text: c.miss ? '404' : '✓ build', u: Math.max(11, c.size / 11), vars: { '--rot': '3deg' } });
}

function reasoning(add: Add, c: Ctx): void {
  const sizes = [0.5, 0.8, 1.2, 1.8];
  sizes.forEach((s, i) => {
    const t = 0.18 + i * 0.22;
    add({ cls: 'bfx-thought', type: 'reasoning', u: c.u, x0: c.S.x + (c.D.x - c.S.x) * t, y0: c.S.y + (c.D.y - c.S.y) * t - c.u * (1 + i * 0.4), d: i * 70, dur: 420, anim: 'fx-pop', vars: { '--k': String(s) } });
  });
  const t0 = 300;
  const bolt = c.big ? 2 : 1;
  for (let i = 0; i < bolt; i++) {
    add({ cls: 'bfx-bolt', type: 'reasoning', html: BOLT, u: c.size / 10, x0: c.D.x + (i ? c.u * 2 : -c.u * 0.5), y0: c.D.y - c.size * 0.35, d: t0 + i * 60, dur: 320, anim: 'fx-bolt' });
  }
  GATES.forEach((g, i) => {
    add({ cls: 'bfx-gate', type: 'reasoning', text: g, u: c.u * 1.1, x0: c.D.x + (i - 1.5) * c.u * 2.6, y0: c.D.y - c.size * 0.55 - c.u, x1: c.D.x + (i - 1.5) * c.u * 1.2, y1: c.D.y, d: t0 + 40 + i * 40, dur: 300, s0: 0.5 });
  });
}

function media(add: Add, c: Ctx): void {
  const u = c.size / 10;
  // viewfinder closes in, then the flash
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    add({ cls: 'bfx-corner', type: 'media', u, x0: c.D.x + sx * u * 4.4, y0: c.D.y + sy * u * 4.4, x1: c.D.x + sx * u * 3.1, y1: c.D.y + sy * u * 3.1, dur: 280, vars: { '--sx': String(sx), '--sy': String(sy) } });
  }
  add({ cls: 'bfx-camflash', x0: c.D.x, y0: c.D.y, d: 220, dur: 240, anim: 'fx-flash', u });
  const n = c.big ? 18 : 12;
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2);
    const r = rnd(2, 6) * u;
    add({ cls: 'bfx-shard', x0: c.D.x, y0: c.D.y, x1: c.D.x + Math.cos(a) * r, y1: c.D.y + Math.sin(a) * r, d: 240 + i * 8, dur: 360, r1: rnd(-180, 180), u: u * rnd(0.5, 1.2), vars: { '--col': pick(PALETTE) } });
  }
  add({ cls: 'bfx-splash', x0: c.D.x + u * 0.3, y0: c.D.y + u * 0.2, d: 250, dur: 420, anim: 'fx-snap', u: u * 6, vars: { '--col': 'var(--blue)' } });
  add({ cls: 'bfx-splash', x0: c.D.x - u * 0.2, y0: c.D.y - u * 0.1, d: 250, dur: 420, anim: 'fx-snap', u: u * 6, vars: { '--col': 'var(--pink)' } });
}

function agent(add: Add, c: Ctx): void {
  const n = c.big ? 11 : 8;
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const lift = side * rnd(2, 5) * c.u;
    const drone = i % 4 === 3;
    add({
      cls: drone ? 'bfx-drone' : 'bfx-cursor', type: 'agent', u: c.u * (drone ? 1.1 : 1.3),
      x0: c.S.x, y0: c.S.y + rnd(-1, 1) * c.u, x1: c.D.x + rnd(-1.5, 1.5) * c.u, y1: c.D.y + rnd(-1.5, 1.5) * c.u,
      xm: (c.S.x + c.D.x) / 2, ym: (c.S.y + c.D.y) / 2 + lift, d: i * 38, dur: 400, r0: drone ? 0 : rnd(-30, 10), r1: drone ? rnd(-10, 10) : rnd(-40, 20), s0: 0.6,
    });
  }
  add({ cls: 'bfx-ring', x0: c.D.x, y0: c.D.y, d: n * 38 + 120, dur: 300, anim: 'fx-ring', u: c.u * 4, type: 'agent' });
}

function chaos(add: Add, c: Ctx): void {
  const u = c.u;
  const bars = c.big ? 9 : 6;
  for (let i = 0; i < bars; i++) {
    add({
      cls: 'bfx-slice', x0: c.T.x + rnd(-0.6, 0.6) * u, y0: c.T.y + (i - bars / 2) * u * 1.15, d: 80 + i * 20, dur: 380, anim: 'fx-jitter', u,
      vars: { '--w': String(c.size / u), '--col': pick(['var(--ink)', 'var(--pink)', 'var(--blue)', 'var(--yellow)']), '--jx': `${rnd(-1.4, 1.4) * u}px` },
    });
  }
  const n = c.big ? 14 : 9;
  for (let i = 0; i < n; i++) {
    const a = rnd(-0.6, 0.6);
    add({
      cls: `bfx-shape is-${pick(SHAPES)}`, x0: c.S.x, y0: c.S.y, x1: c.D.x + Math.cos(a) * rnd(-5, 5) * u, y1: c.D.y + rnd(-5, 5) * u,
      xm: (c.S.x + c.D.x) / 2 + rnd(-3, 3) * u, ym: (c.S.y + c.D.y) / 2 + rnd(-5, 5) * u,
      d: i * 28, dur: 360, r1: rnd(-360, 360), u: u * rnd(0.8, 1.6), vars: { '--col': pick(['var(--ink)', 'var(--pink)', 'var(--yellow)', 'var(--blue)']) },
    });
  }
}

function legacy(add: Add, c: Ctx): void {
  const n = c.big ? 7 : 5;
  for (let i = 0; i < n; i++) {
    const dy = (i - n / 2) * c.u * 0.9;
    add({
      cls: 'bfx-floppy', type: 'legacy', u: c.u * 1.5, x0: c.S.x, y0: c.S.y + dy, x1: c.D.x, y1: c.D.y + dy * 0.5,
      xm: (c.S.x + c.D.x) / 2, ym: (c.S.y + c.D.y) / 2 + dy - c.u * 2, d: i * 55, dur: 380, r0: 0, r1: 540 + i * 40, html: '<b></b><i></i>',
    });
  }
  const t = n * 55 + 140;
  add({ cls: 'bfx-crt', x0: c.T.x, y0: c.T.y, d: t, dur: 460, anim: 'fx-flash', u: c.size / 10 });
  add({ cls: 'bfx-scan', x0: c.T.x, y0: c.T.y - c.size * 0.5, x1: c.T.x, y1: c.T.y + c.size * 0.5, d: t, dur: 420, u: c.size / 10 });
  add({ cls: 'bfx-tag fx-nosig', x0: c.T.x, y0: c.T.y, d: t + 60, dur: 400, anim: 'fx-pop', text: 'SIGNAL PERDU', u: Math.max(10, c.size / 12), vars: { '--rot': '-4deg' } });
}

const RECIPES: Record<TypeId, (add: Add, c: Ctx) => void> = { chat, code, reasoning, media, agent, chaos, legacy };

function aura(add: Add, c: Ctx, colour?: string): void {
  const col = colour ?? 'var(--c)';
  for (let i = 0; i < 3; i++) {
    add({ cls: 'bfx-aura', type: c.type, x0: c.T.x, y0: c.T.y, d: i * 110, dur: 460, anim: 'fx-ring', u: c.size / 10, vars: { '--col': col } });
  }
  add({ cls: 'bfx-aura is-pink', x0: c.T.x + c.u * 0.4, y0: c.T.y, d: 40, dur: 460, anim: 'fx-ring', u: c.size / 10 });
  add({ cls: 'bfx-aura is-blue', x0: c.T.x - c.u * 0.4, y0: c.T.y, d: 70, dur: 460, anim: 'fx-ring', u: c.size / 10 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add({ cls: 'bfx-token', type: c.type, x0: c.T.x + Math.cos(a) * c.size * 0.7, y0: c.T.y + Math.sin(a) * c.size * 0.7, x1: c.T.x, y1: c.T.y, d: 40 + i * 25, dur: 320, r1: 180, u: c.u });
  }
}

function heal(add: Add, c: Ctx): void {
  const u = c.u;
  for (let i = 0; i < 9; i++) {
    const x = c.T.x + rnd(-0.45, 0.45) * c.size;
    add({ cls: 'bfx-plus', x0: x, y0: c.T.y + c.size * 0.35, x1: x + rnd(-1, 1) * u, y1: c.T.y - c.size * 0.5, d: i * 55, dur: 520, s0: 0.6, u: u * rnd(1.1, 1.8), vars: { '--col': i % 2 ? 'var(--ctx)' : 'var(--teal)' } });
  }
  for (let i = 0; i < 7; i++) {
    add({ cls: 'bfx-token', type: undefined, x0: c.T.x + rnd(-0.5, 0.5) * c.size, y0: c.T.y + c.size * 0.45, x1: c.T.x + rnd(-0.3, 0.3) * c.size, y1: c.T.y - c.size * 0.6, d: 80 + i * 50, dur: 480, u, vars: { '--col': 'var(--ctx)' } });
  }
}

function shield(add: Add, c: Ctx, dir: number): void {
  const x = c.T.x + dir * c.size * 0.55;
  add({ cls: 'bfx-hex', x0: x, y0: c.T.y, dur: 640, anim: 'fx-thump', html: HEX, u: c.size / 5, vars: { '--col': 'var(--blue)' } });
  add({ cls: 'bfx-hex is-ghost', x0: x + c.u * 0.5, y0: c.T.y + c.u * 0.3, dur: 640, d: 40, anim: 'fx-thump', html: HEX, u: c.size / 5, vars: { '--col': 'var(--pink)' } });
  add({ cls: 'bfx-tag fx-sorry', x0: x, y0: c.T.y, d: 140, dur: 520, anim: 'fx-stamp', text: 'DÉSOLÉ', u: Math.max(12, c.size / 9), vars: { '--rot': '-12deg' } });
}

function arrows(add: Add, c: Ctx, down: boolean): void {
  const u = c.size / 10;
  const col = down ? 'var(--red)' : 'var(--yellow)';
  for (let i = 0; i < 4; i++) {
    const x = c.T.x + (i - 1.5) * u * 2.2;
    const y0 = down ? c.T.y - c.size * 0.45 : c.T.y + c.size * 0.4;
    const y1 = down ? c.T.y + c.size * 0.4 : c.T.y - c.size * 0.45;
    add({ cls: `bfx-arrow${down ? ' is-down' : ''}`, html: ARROW_UP, x0: x, y0: y0, x1: x, y1: y1, d: i * 70, dur: 520, u: u * 1.3, vars: { '--col': col } });
    add({ cls: `bfx-arrow is-ghost${down ? ' is-down' : ''}`, html: ARROW_UP, x0: x + u * 0.4, y0: y0, x1: x + u * 0.4, y1: y1, d: i * 70 + 30, dur: 520, u: u * 1.3, vars: { '--col': 'var(--pink)' } });
  }
}
