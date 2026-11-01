// Objectives HUD: a compact LatentOS card under the top bar (left) telling the player what to do next and which way to go.
// Polls the save state (flags, map, player tile) a few times a second; all the logic lives in systems/objectives.ts.
import { audio } from '../../audio/audio';
import { db } from '../../data/db';
import type { MapDef } from '../../data/types';
import { game } from '../../state/store';
import { evaluate, distance, progress, resolveTarget, type Objective, type ObjectiveStatus, type ResolvedTarget } from '../../systems/objectives';
import objectivesJson from '@data/objectives.json';
import { h, uiRoot } from '../dom';
import { headingAngle } from '../minimap/model';
import { setObjectiveMarker } from './marker';
import './objectives.css';

const LIST = (objectivesJson as unknown as { objectives: Objective[] }).objectives;
const POLL_MS = 250;
const FOLD_KEY = 'pokai.objectives.folded';

const flag = (n: string): boolean => game.flag(n);
const maps = (id: string): MapDef | undefined => (db.hasMap(id) ? db.map(id) : undefined);
const cleanName = (s: string): string => s.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();

function readFolded(): boolean {
  try {
    return localStorage.getItem(FOLD_KEY) === '1';
  } catch {
    return false;
  }
}

function writeFolded(v: boolean): void {
  try {
    localStorage.setItem(FOLD_KEY, v ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
}

/** Mounts the HUD. `toast` is the shell toast (plays the ui_open sfx itself). */
export function initObjectivesHud(toast: (text: string) => void): void {
  const kicker = h('span.obj-kicker', null, 'Objectif');
  const count = h('span.obj-count');
  const fold = h('button.obj-btn', { type: 'button', title: 'Replier', 'aria-label': 'Replier l\'objectif' }, '–');
  const journalBtn = h('button.obj-btn', { type: 'button', title: 'Journal des objectifs', 'aria-label': 'Journal des objectifs' }, 'J');
  const head = h('div.obj-head', null, kicker, count, journalBtn, fold);
  const title = h('div.obj-title');
  const hint = h('div.obj-hint');
  const arrow = h('span.obj-arrow', { 'aria-hidden': 'true' });
  const where = h('span.obj-where');
  const nav = h('div.obj-nav', null, arrow, where);
  const body = h('div.obj-body', null, title, hint, nav);
  const journal = h('div.obj-journal', { role: 'list' });
  const root = h('aside.objhud', { 'aria-live': 'polite', 'aria-label': 'Objectif en cours' }, head, body, journal);
  uiRoot().append(root);

  let folded = readFolded();
  let journalOpen = false;
  let lastId: string | null | undefined;
  let doneIds: Set<string> | null = null;
  let sig = '';

  const applyFold = (): void => {
    root.classList.toggle('is-folded', folded);
    fold.textContent = folded ? '+' : '–';
    fold.title = folded ? 'Déplier' : 'Replier';
  };
  fold.addEventListener('click', (e) => {
    e.stopPropagation();
    folded = !folded;
    writeFolded(folded);
    applyFold();
  });
  head.addEventListener('dblclick', () => fold.click());
  journalBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    journalOpen = !journalOpen;
    root.classList.toggle('is-journal', journalOpen);
    sig = '';
  });
  applyFold();

  const pulse = (): void => {
    root.classList.remove('is-pulse');
    void root.offsetWidth;
    root.classList.add('is-pulse');
  };

  const renderJournal = (status: ObjectiveStatus[]): void => {
    const rows: HTMLElement[] = [];
    let chapter = '';
    for (const s of status) {
      if (s.state === 'locked') continue; // do not spoil what comes later
      const ch = s.objective.chapter ?? '';
      if (ch !== chapter) {
        chapter = ch;
        rows.push(h('div.obj-chapter', null, ch));
      }
      const mark = s.state === 'done' ? '✓' : s.state === 'current' ? '▶' : '·';
      rows.push(
        h(`div.obj-row.is-${s.state}`, { role: 'listitem' }, h('span.obj-mark', null, mark), h('span.obj-rtitle', null, s.objective.title), s.objective.optional ? h('span.obj-opt', null, 'option') : null),
      );
    }
    journal.replaceChildren(...rows);
  };

  const describe = (r: ResolvedTarget | null, pos: { x: number; y: number }): { angle: number | null; text: string } => {
    if (!r) return { angle: null, text: 'Chemin inconnu : explore !' };
    const d = distance(pos, r);
    const angle = d <= 1 ? null : headingAngle({ x: r.x - pos.x, y: r.y - pos.y });
    if (r.kind === 'here') return { angle, text: d <= 1 ? 'Tu y es !' : `${d} cases` };
    const to = maps(r.to);
    const name = to ? cleanName(to.name) : r.to;
    return { angle, text: d <= 1 ? `Sortie : ${name}` : `Sortie vers ${name} · ${d} cases` };
  };

  const tick = (): void => {
    const started = document.querySelector('.topbar.is-on') !== null;
    const status = evaluate(LIST, flag);
    const done = new Set(status.filter((s) => s.state === 'done').map((s) => s.objective.id));
    const current = status.find((s) => s.state === 'current')?.objective ?? null;

    let toasted = false;
    if (doneIds && started) {
      const fresh = status.filter((s) => s.state === 'done' && !doneIds!.has(s.objective.id));
      const last = fresh[fresh.length - 1];
      if (last) {
        toast(`Objectif terminé ✓ ${last.objective.title}`);
        toasted = true;
      }
    }
    doneIds = done;

    const id = current?.id ?? null;
    if (started && id !== lastId) {
      if (lastId !== undefined && id) {
        pulse();
        if (!toasted) audio.sfx('ui_open');
      } else if (id) {
        pulse();
      }
      lastId = id;
      sig = '';
    }

    const visible = started && current !== null;
    root.classList.toggle('is-on', visible);
    if (!visible || !current) {
      setObjectiveMarker(null);
      return;
    }

    const pos = { x: game.state.x, y: game.state.y };
    const resolved = resolveTarget(current, game.state.map, pos, maps);
    setObjectiveMarker(resolved ? { map: resolved.map, x: resolved.x, y: resolved.y, exit: resolved.kind === 'exit' } : null);
    const info = describe(resolved, pos);
    const p = progress(LIST, flag);
    const next = `${current.id}|${info.text}|${info.angle === null ? '-' : Math.round(info.angle * 20)}|${p.done}|${journalOpen}`;
    if (next === sig) return;
    sig = next;
    title.textContent = current.title;
    hint.textContent = current.hint;
    count.textContent = `${p.done}/${p.total}`;
    where.textContent = info.text;
    arrow.classList.toggle('is-here', info.angle === null);
    arrow.style.transform = info.angle === null ? '' : `rotate(${info.angle}rad)`;
    if (journalOpen) renderJournal(status);
  };

  window.setInterval(tick, POLL_MS);
  tick();
}
