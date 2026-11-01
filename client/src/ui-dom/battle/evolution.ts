// Evolution = "Mise à jour disponible": an OS update dialog with release notes and a progress bar.
import { audio } from '../../audio/audio';
import './common.css';
import './evolution.css';
import { h } from '../dom';
import { db } from '../../data/db';
import { game } from '../../state/store';
import { pokaiSvg } from '../../art/svg';
import type { Form, Stats } from '../../data/types';
import { displayName, evolve } from '../../systems/pokai';
import { learnLine, resolveLearnEvents, type LearnOutcome } from '../shared/forget-move';
import { computeStats } from '../../systems/stats';
import type { PokaiInstance } from '../../state/types';
import type { Action } from '../../input/input';
import { Screen, titlebar } from './screen';
import { STAT_LABEL, STAT_ORDER, sleep, typeChip } from './util';

const INSTALL_MS = 3400;
const REVEAL_MS = 620;
const CHANNEL_LABELS = ['Canal A', 'Canal B', 'Canal C', 'Canal D'];

class EvolutionScreen {
  private screen = new Screen('evo', 'bt-evo');
  private p: PokaiInstance;
  private from: Form;
  private options: Form[];
  private sel = 0;
  private focus: 'channels' | 'buttons' = 'buttons';
  private btnIdx = 0;
  private state: 'choose' | 'installing' | 'done' = 'choose';
  private aborted = false;
  private resolve!: (v: string | null) => void;

  private stage = h('div.ev-stage');
  private fxEl = h('div.ev-fx');
  private oldArt = h('div.ev-art.is-old');
  private newArt = h('div.ev-art.is-new');
  private caption = h('div.ev-caption');
  private notes = h('div.ev-notes');
  private channelsEl = h('div.ev-channels');
  private bar = h('div.ev-bar', null, h('i'));
  private pct = h('span');
  private status = h('span');
  private progress = h('div.ev-progress');
  private installBtn: HTMLButtonElement;
  private stayBtn: HTMLButtonElement;
  private head = h('div.ev-head');
  private channelEls: HTMLElement[] = [];

  constructor(p: PokaiInstance, options: string[]) {
    this.p = p;
    this.from = db.form(p.form);
    this.options = options.filter((o) => db.hasForm(o)).map((o) => db.form(o));
    this.installBtn = h('button.bt-btn.is-primary', { type: 'button', onclick: () => void this.install() }, 'Installer ', h('kbd', null, '↵'));
    this.stayBtn = h('button.bt-btn', { type: 'button', onclick: () => this.cancel() }, 'Rester sur la version stable');
    this.buildStatic();
    this.renderChoice();
    this.screen.onAction((a) => this.onAction(a));
  }

  run(): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      if (this.options.length === 0) this.finish(null);
    });
  }

  private target(): Form {
    return this.options[this.sel] ?? this.from;
  }

  private buildStatic(): void {
    this.oldArt.innerHTML = pokaiSvg(this.from.id);
    this.buildFx();
    this.stage.append(this.fxEl, this.oldArt, this.newArt, this.caption);
    this.progress.append(h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '1em' } }, this.status, this.pct), this.bar);
    this.progress.hidden = true;
    const win = h(
      'div.ev-win',
      null,
      titlebar('Mise à jour du système — LatentOS Update', 'hub --update'),
      this.head,
      h('div.ev-main', null, this.stage, this.notes),
      this.channelsEl,
      h('div.ev-foot', null, this.progress, h('div.ev-btns', null, this.installBtn, this.stayBtn)),
    );
    this.screen.root.append(win);
    if (this.options.length > 1) {
      this.focus = 'channels';
      this.channelEls = this.options.map((o, i) => {
        const el = h(
          'button.ev-channel',
          { type: 'button', onclick: () => { this.sel = i; this.focus = 'channels'; this.renderChoice(); }, ondblclick: () => void this.install() },
          h('div.bt-art', { html: pokaiSvg(o.id) }),
          h('div', null, h('div.ev-channel-t', null, `${CHANNEL_LABELS[i] ?? `Canal ${i + 1}`} · branche`), h('div.ev-channel-n', null, o.name)),
        );
        return el;
      });
      this.channelsEl.append(...this.channelEls);
    } else {
      this.channelsEl.hidden = true;
    }
  }

  /** Light gathering rays, shrinking squares, riso bands and burst shards (animated by CSS only). */
  private buildFx(): void {
    const parts: HTMLElement[] = [];
    for (let i = 0; i < 16; i++) {
      const r = h('i.ev-ray');
      r.style.setProperty('--a', `${(i / 16) * 360}deg`);
      r.style.setProperty('--dl', `${(i % 4) * 160}ms`);
      parts.push(r);
    }
    for (let i = 0; i < 3; i++) {
      const q = h('i.ev-sq');
      q.style.setProperty('--dl', `${i * 420}ms`);
      parts.push(q);
    }
    for (let i = 0; i < 3; i++) parts.push(h(`i.ev-band.b${i}` as 'i.ev-band'));
    for (let i = 0; i < 18; i++) {
      const sh = h('i.ev-shard');
      const a = (i / 18) * Math.PI * 2;
      const r = 42 + (i % 3) * 14;
      sh.style.setProperty('--sx', `${Math.cos(a) * r}%`);
      sh.style.setProperty('--sy', `${Math.sin(a) * r}%`);
      sh.style.setProperty('--sr', `${(i * 47) % 180}deg`);
      parts.push(sh);
    }
    parts.push(h('i.ev-flash'));
    this.fxEl.append(...parts);
  }

  private statsOf(f: Form): Stats {
    return computeStats(f, this.p.level, this.p.ivs);
  }

  private newMoves(to: Form): string[] {
    const had = new Set(this.from.learnset.map((e) => e.move));
    const ids = [...to.learnset].sort((a, b) => a.level - b.level).filter((e) => e.level <= this.p.level && !had.has(e.move)).map((e) => e.move);
    return [...new Set(ids)];
  }

  private renderNotes(to: Form, final?: { stats: Stats; outcomes: LearnOutcome[] }): void {
    const before = this.statsOf(this.from);
    const after = final ? final.stats : this.statsOf(to);
    const max = Math.max(...STAT_ORDER.map((k) => Math.max(before[k], after[k])), 1);
    const rows: HTMLElement[] = [];
    for (const k of STAT_ORDER) {
      const d = after[k] - before[k];
      rows.push(
        h('span', null, STAT_LABEL[k]),
        h('div.ev-stat-bar', null, h('i', { style: { width: `${(before[k] / max) * 100}%` } }), h('b', { style: { width: `${(Math.max(0, d) / max) * 100}%`, left: `${(before[k] / max) * 100}%` } })),
        h('span', { class: d > 0 ? 'ev-stat-d' : 'ev-stat-d is-zero' }, `${before[k]}→${after[k]} (${d >= 0 ? '+' : ''}${d})`),
      );
    }
    const moveIds: LearnOutcome[] = final ? final.outcomes : this.newMoves(to).map((m) => ({ move: m, refused: false }));
    const chips = moveIds.slice(0, 6).map((e) => {
      const mv = db.hasMove(e.move) ? db.move(e.move) : undefined;
      const replaced = e.replaced && db.hasMove(e.replaced) ? ` (remplace ${db.move(e.replaced).name})` : '';
      if (e.refused) return h('span.bt-chip', null, `${mv?.name ?? e.move} (non apprise)`);
      return mv ? h('span.bt-chip.is-type', { dataset: { type: mv.type } }, `+ ${mv.name}${replaced}`) : h('span.bt-chip', null, e.move);
    });
    if (moveIds.length > 6) chips.push(h('span.bt-chip', null, `+${moveIds.length - 6} autres`));
    this.notes.replaceChildren(
      h('h3', null, final ? 'Mise à jour installée' : 'Notes de version'),
      h('div.ev-note-line', null, `${this.from.name} (v${this.from.stage}) → ${to.name} (v${to.stage}) · niveau ${this.p.level} conservé`),
      h('div.bt-chips', { style: { display: 'flex', gap: '0.3em' } }, ...to.types.map((t) => typeChip(t))),
      h('h3', null, 'Stats'),
      h('div.ev-stats', null, ...rows),
      h('h3', null, 'Nouvelles techniques'),
      chips.length ? h('div.ev-moves', null, ...chips) : h('div.ev-note-line', null, 'Aucune nouvelle technique (correctifs de stabilité uniquement).'),
      ...(final ? final.outcomes.filter((o) => o.replaced !== undefined || o.refused).map((o) => h('div.ev-note-line', null, learnLine(this.p, o))) : []),
    );
  }

  private renderChoice(): void {
    const to = this.target();
    this.head.replaceChildren(
      h('h2', null, `Mise à jour disponible : ${displayName(this.p)}`),
      h('span', null, this.options.length > 1 ? 'Choisis un canal de mise à jour' : `${this.from.name} → ${to.name}`),
    );
    this.newArt.innerHTML = pokaiSvg(to.id);
    this.caption.replaceChildren(h('span', null, this.from.name), h('span', null, `→ ${to.name}`));
    this.renderNotes(to);
    this.channelEls.forEach((el, i) => {
      el.classList.toggle('is-sel', i === this.sel);
      el.classList.toggle('is-focus', this.state === 'choose' && this.focus === 'channels' && i === this.sel);
    });
    this.installBtn.classList.toggle('is-focus', this.state === 'choose' && this.focus === 'buttons' && this.btnIdx === 0);
    this.stayBtn.classList.toggle('is-focus', this.state === 'choose' && this.focus === 'buttons' && this.btnIdx === 1);
    this.screen.hints(
      this.options.length > 1
        ? [['left', 'Canal'], ['confirm', 'Installer'], ['down', 'Boutons'], ['back', 'Rester sur la version stable']]
        : [['left', 'Choisir'], ['confirm', 'Valider'], ['back', 'Rester sur la version stable']],
    );
  }

  private onAction(a: Action): void {
    if (this.state === 'installing') {
      if (a === 'back') this.aborted = true;
      return;
    }
    if (this.state === 'done') {
      if (a === 'confirm' || a === 'back') this.finish(this.target().id);
      return;
    }
    if (a === 'back') return this.cancel();
    if (this.focus === 'channels') {
      if (a === 'left') this.sel = Math.max(0, this.sel - 1);
      else if (a === 'right') this.sel = Math.min(this.options.length - 1, this.sel + 1);
      else if (a === 'down') this.focus = 'buttons';
      else if (a === 'confirm') return void this.install();
    } else {
      if (a === 'left') this.btnIdx = 0;
      else if (a === 'right') this.btnIdx = 1;
      else if (a === 'up' && this.options.length > 1) this.focus = 'channels';
      else if (a === 'confirm') return this.btnIdx === 0 ? void this.install() : this.cancel();
    }
    this.renderChoice();
  }

  private cancel(): void {
    if (this.state !== 'choose') return;
    this.finish(null);
  }

  private async install(): Promise<void> {
    if (this.state !== 'choose') return;
    this.state = 'installing';
    const to = this.target();
    this.channelEls.forEach((el) => el.classList.remove('is-focus'));
    this.channelsEl.style.opacity = '0.4';
    this.installBtn.hidden = true;
    this.stayBtn.textContent = 'Annuler';
    this.stayBtn.onclick = () => { this.aborted = true; };
    this.stayBtn.classList.add('is-focus');
    this.progress.hidden = false;
    this.status.textContent = 'Mise à jour du modèle…';
    this.stage.classList.add('is-installing');
    audio.sfx('evolve');
    this.screen.hints([['back', 'Annuler la mise à jour']]);
    const fill = this.bar.firstElementChild as HTMLElement;
    const t0 = performance.now();
    let lastToggle = t0;
    let showNew = false;
    for (;;) {
      const now = performance.now();
      const r = Math.min(1, (now - t0) / INSTALL_MS);
      // the classic hang at 67 %
      const shown = r > 0.67 && r < 0.8 ? 0.67 : r;
      fill.style.width = `${Math.round(shown * 100)}%`;
      this.pct.textContent = `${Math.round(shown * 100)}%`;
      this.status.textContent = shown >= 0.67 && shown < 0.7 && r < 0.8 ? 'Mise à jour du modèle… ne pas éteindre le PokAI (il n’a pas d’interrupteur)' : 'Mise à jour du modèle…';
      // 0-12 %: the old form shakes under the gathering light. After that: flat silhouettes, old and new alternating faster and faster.
      const sil = shown >= 0.12;
      this.stage.classList.toggle('is-sil', sil);
      if (sil) {
        const gap = Math.max(60, 420 - shown * 420);
        if (now - lastToggle >= gap) {
          showNew = !showNew;
          lastToggle = now;
        }
        this.oldArt.style.opacity = showNew ? '0' : '1';
        this.newArt.style.opacity = showNew ? '1' : '0';
      }
      if (r >= 1 || this.aborted) break;
      await sleep(30);
    }
    this.stage.classList.remove('is-sil');
    this.stage.classList.remove('is-installing');
    if (this.aborted) {
      this.oldArt.style.opacity = '1';
      this.newArt.style.opacity = '0';
      this.status.textContent = 'Mise à jour interrompue. Retour à la version stable.';
      await sleep(600);
      this.finish(null);
      return;
    }
    // commit
    const events = evolve(this.p, to.id);
    game.markSeen(to.id);
    this.state = 'done';
    audio.music('evolution');
    this.stage.classList.add('is-burst');
    this.oldArt.style.opacity = '0';
    this.newArt.style.opacity = '1';
    await sleep(REVEAL_MS);
    this.stage.classList.remove('is-burst');
    this.stage.classList.add('is-done');
    this.notes.classList.add('is-reveal');
    this.status.textContent = 'Mise à jour installée. Redémarrage requis.';
    this.pct.textContent = '100%';
    this.renderNotes(to, { stats: this.statsOf(to), outcomes: events.flatMap((ev) => (ev.kind === 'learn' ? [{ move: ev.move, refused: false }] : [])) });
    this.head.replaceChildren(h('h2', null, `${to.name} est installé !`), h('span', null, `${this.from.name} → ${to.name}`));
    this.caption.replaceChildren(h('span', null, to.name), h('span', null, `v${to.stage}`));
    // A full moveset: the player decides what to forget before restarting.
    if (events.some((ev) => ev.kind === 'learn_offer')) {
      this.status.textContent = 'Espace disque plein : choisis une technique à supprimer.';
      this.screen.hints([]);
      const outcomes = await resolveLearnEvents(this.p, events);
      this.status.textContent = 'Mise à jour installée. Redémarrage requis.';
      this.renderNotes(to, { stats: this.statsOf(to), outcomes });
    }
    const restart = h('button.bt-btn.is-primary.is-focus', { type: 'button', onclick: () => this.finish(to.id) }, 'Redémarrer le modèle ', h('kbd', null, '↵'));
    this.stayBtn.replaceWith(restart);
    this.screen.hints([['confirm', 'Redémarrer']]);
  }

  private finish(v: string | null): void {
    audio.resume();
    void this.screen.close().then(() => this.resolve(v));
  }
}

export function openEvolution(pokaiUid: string, options: string[]): Promise<string | null> {
  const p = game.findPokai(pokaiUid);
  if (!p) return Promise.resolve(null);
  return new EvolutionScreen(p, options).run();
}
