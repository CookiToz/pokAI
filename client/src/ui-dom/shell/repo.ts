// Hugging Face Repo (Hub PC): party on the left, every stored PokAI on the right.
// Keyboard/gamepad: confirm picks a model up, confirm elsewhere drops/swaps it. Mouse: click or drag & drop.
import './repo.css';
import { audio } from '../../audio/audio';
import type { TypeId } from '../../data/types';
import { db } from '../../data/db';
import { game } from '../../state/store';
import type { PokaiInstance } from '../../state/types';
import { displayName, isFainted, maxContext, pokaiStats } from '../../systems/pokai';
import type { Action } from '../../input/input';
import { h } from '../dom';
import { refreshChrome, toast } from './chrome';
import { FocusGroup, isDir } from './focus';
import { STAT_LABEL, STAT_ORDER, TYPE_LABEL, TYPE_ORDER } from './labels';
import { openWindow } from './os-window';
import { PARTY_MAX, applyMove, filterSort, type RepoFilter, type SortKey, type Target, type Zone } from './repo-logic';
import { art, ctxBar, licenceTag, statusTag, typeTag } from './widgets';

const SORTS: { id: SortKey; label: string }[] = [{ id: 'level', label: 'Niveau' }, { id: 'name', label: 'Nom' }, { id: 'dex', label: 'N° Neurodex' }];

export function openRepo(): Promise<void> {
  return new Promise<void>((resolve) => {
    const filter: RepoFilter = { query: '', type: 'all', sort: 'level' };
    let held: string | null = null; // uid picked up
    let closing = false;

    const partyEl = h('div.repo-list', { role: 'list' });
    const gridEl = h('div.repo-grid', { role: 'list' });
    const summary = h('div.repo-sum');
    const counts = h('span.repo-count');
    const search = h('input.rtool.repo-search', { type: 'search', placeholder: 'Rechercher un modèle…', 'aria-label': 'Rechercher', autocomplete: 'off', spellcheck: 'false' });
    const typeBtns = (['all', ...TYPE_ORDER] as (TypeId | 'all')[]).map((t) =>
      h('button.rtool.rchip', { type: 'button', 'data-t': t, onclick: () => { filter.type = t; syncTools(); renderGrid(); } }, t === 'all' ? 'Tous' : h('i.tag-sw', { style: `background:var(--type-${t})` }), t === 'all' ? null : TYPE_LABEL[t]),
    );
    const sortBtns = SORTS.map((s) => h('button.rtool.rchip.is-sort', { type: 'button', 'data-s': s.id, onclick: () => { filter.sort = s.id; syncTools(); renderGrid(); } }, s.label));
    const partyPanel = h('section.repo-panel.is-party', null, h('h3', null, 'Équipe ', h('small', null, 'max 6')), partyEl);
    const repoPanel = h('section.repo-panel.is-store', null,
      h('div.repo-tools', null, search, h('div.repo-sorts', null, h('span.k', null, 'Tri'), ...sortBtns)),
      h('div.repo-tools', null, ...typeBtns),
      h('h3', null, 'Dépôt ', counts),
      gridEl,
    );

    const win = openWindow({ id: 'shell:repo', title: 'Hugging Face Repo — Dépôt de modèles', icon: 'hub', cls: 'win-repo', hints: [], onKey, onRequestClose: () => void close() });
    win.body.append(partyPanel, repoPanel, summary);
    const group = new FocusGroup(win.body, '.rcell, .rtool');

    const mons = (): PokaiInstance[] => [...game.state.party, ...game.state.repo];
    const byUid = (uid: string | undefined): PokaiInstance | undefined => (uid ? mons().find((p) => p.uid === uid) : undefined);
    const keyOf = (el: HTMLElement | null): string => el?.dataset.key ?? '';

    // ------------------------------------------------------------ rendering
    function cell(p: PokaiInstance, zone: Zone, row: boolean): HTMLElement {
      const form = db.form(p.form);
      const el = h(`button.rcell.fx${row ? '.is-row' : ''}${isFainted(p) ? '.is-ko' : ''}${held === p.uid ? '.is-held' : ''}`, {
        type: 'button', role: 'listitem', draggable: 'true', 'data-key': (zone === 'party' ? 'p:' : 'r:') + p.uid, 'data-uid': p.uid, 'data-zone': zone,
        onclick: () => activate(el),
        ondragstart: (e: DragEvent) => { e.dataTransfer?.setData('text/plain', p.uid); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; dragUid = p.uid; el.classList.add('is-dragging'); },
        ondragend: () => { dragUid = null; el.classList.remove('is-dragging'); },
      },
        art(p.form, row ? 36 : 44),
        h('span.rc-meta', null,
          h('span.rc-name', null, displayName(p)),
          h('span.rc-sub', null, `Nv. ${p.level}`, ...form.types.map((t) => h('i.tag-sw', { style: `background:var(--type-${t})`, title: TYPE_LABEL[t] }))),
          row ? ctxBar(p.context / Math.max(1, maxContext(p))) : null,
        ),
      );
      dropOn(el, { zone, uid: p.uid });
      return el;
    }

    function emptySlot(i: number): HTMLElement {
      const el = h('button.rcell.fx.is-row.is-empty', { type: 'button', role: 'listitem', 'data-key': 'slot:' + i, 'data-zone': 'party', onclick: () => activate(el) }, h('span.rc-name', null, 'Emplacement libre'));
      dropOn(el, { zone: 'party' });
      return el;
    }

    function renderParty(): void {
      const p = game.state.party;
      partyEl.replaceChildren(...p.map((m) => cell(m, 'party', true)), ...Array.from({ length: PARTY_MAX - p.length }, (_, i) => emptySlot(i)));
    }

    function renderGrid(): void {
      const stored = game.state.repo;
      const list = filterSort(stored, filter);
      const dep = h('button.rcell.fx.is-deposit', { type: 'button', role: 'listitem', 'data-key': 'dep', 'data-zone': 'repo', onclick: () => activate(dep) }, h('span.rc-plus', null, '+'), h('span.rc-name', null, 'Déposer ici'));
      dropOn(dep, { zone: 'repo' });
      gridEl.replaceChildren(dep, ...list.map((m) => cell(m, 'repo', false)));
      if (stored.length === 0) gridEl.append(h('div.empty.repo-empty', null, h('b', null, 'Dépôt vide'), 'Les modèles que tu onboardes avec une équipe pleine atterrissent ici.'));
      else if (list.length === 0) gridEl.append(h('div.empty.repo-empty', null, h('b', null, 'Aucun résultat'), 'Aucun modèle ne correspond à ce filtre. Le dataset est peut-être biaisé.'));
      counts.textContent = `${list.length === stored.length ? stored.length : `${list.length}/${stored.length}`} modèle${stored.length > 1 ? 's' : ''}`;
    }

    function syncTools(): void {
      typeBtns.forEach((b) => b.classList.toggle('is-on', b.dataset.t === filter.type));
      sortBtns.forEach((b) => b.classList.toggle('is-on', b.dataset.s === filter.sort));
    }

    function renderSummary(): void {
      const key = keyOf(group.current);
      const p = byUid(group.current?.dataset.uid);
      const heldMon = byUid(held ?? undefined);
      if (!p) {
        summary.replaceChildren(h('div.sum-empty', null, heldMon ? `En main : ${displayName(heldMon)}. Choisis où le poser.` : key === 'dep' ? 'Zone de dépôt : prends d\'abord un modèle de l\'équipe.' : 'Sélectionne un modèle pour voir son résumé.'));
        return;
      }
      const form = db.form(p.form);
      const st = pokaiStats(p);
      summary.replaceChildren(
        art(p.form, 56),
        h('div.sum-id', null,
          h('b', null, displayName(p)),
          h('small', null, `${db.lineOfForm(p.form).publisher} · ${form.name} · Nv. ${p.level}`),
          h('div.tags', null, ...form.types.map(typeTag), licenceTag(form.licence), p.status ? statusTag(p.status) : null),
        ),
        h('div.sum-stats', null, ...STAT_ORDER.map((k) => h('span.sum-stat', null, h('span.k', null, STAT_LABEL[k].slice(0, 4)), h('b', null, k === 'context' ? `${p.context}/${st.context}` : String(st[k]))))),
        h('div.sum-moves', null, ...p.moves.map((m) => h('span.tag', null, db.hasMove(m.move) ? db.move(m.move).name : m.move))),
        heldMon && heldMon.uid !== p.uid ? h('div.sum-held', null, `En main : ${displayName(heldMon)}`) : '',
      );
    }

    function renderHints(): void {
      win.hints.set(held ? [['up', 'Choisir'], ['confirm', 'Poser / échanger'], ['back', 'Reposer']] : [['up', 'Parcourir'], ['confirm', 'Prendre'], ['back', 'Fermer']]);
    }

    function render(focusKey?: string): void {
      const k = focusKey ?? keyOf(group.current);
      renderParty();
      renderGrid();
      syncTools();
      group.current = null;
      group.reset((e) => e.dataset.key === k);
      renderSummary();
      renderHints();
      refreshChrome();
    }
    group.onChange = () => renderSummary();

    // ------------------------------------------------------------ actions
    let dragUid: string | null = null;

    function dropOn(el: HTMLElement, dst: Target): void {
      el.addEventListener('dragover', (e) => { if (dragUid) { e.preventDefault(); el.classList.add('is-drop'); } });
      el.addEventListener('dragleave', () => el.classList.remove('is-drop'));
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('is-drop');
        if (dragUid) attempt(dragUid, dst);
        dragUid = null;
      });
    }
    for (const [panel, zone] of [[partyPanel, 'party'], [repoPanel, 'repo']] as [HTMLElement, Zone][]) dropOn(panel, { zone });

    function fail(reason: string): void {
      audio.sfx('ui_error');
      toast(reason);
      win.el.classList.remove('shake');
      void win.el.offsetWidth;
      win.el.classList.add('shake');
    }

    function attempt(uid: string, dst: Target): void {
      const r = applyMove(game.state.party, game.state.repo, uid, dst);
      if (!r.ok) {
        fail(r.reason ?? 'Déplacement impossible.');
        return;
      }
      const p = byUid(uid);
      audio.sfx('ui_confirm');
      held = null;
      game.save();
      if (p && r.zone) toast(r.zone === 'repo' ? `${displayName(p)} est rangé au Dépôt.` : `${displayName(p)} rejoint l'équipe.`);
      render(p && r.zone ? (r.zone === 'party' ? 'p:' : 'r:') + uid : undefined);
    }

    function activate(el: HTMLElement): void {
      if (el.classList.contains('rtool')) return;
      group.set(el, false);
      const zone = el.dataset.zone as Zone;
      const uid = el.dataset.uid;
      if (!held) {
        if (!uid) {
          audio.sfx('ui_error');
          toast(el.dataset.key === 'dep' ? "Prends d'abord un modèle de l'équipe." : 'Emplacement libre.');
          return;
        }
        held = uid;
        audio.sfx('ui_confirm');
        render(keyOf(el));
        return;
      }
      if (uid === held) {
        held = null;
        audio.sfx('ui_back');
        render(keyOf(el));
        return;
      }
      attempt(held, { zone, uid });
    }

    async function close(): Promise<void> {
      if (closing) return;
      closing = true;
      game.save();
      await win.close();
      resolve();
    }

    // Leaving a column sideways lands on the nearest row of the other one (spatial search fails across panels).
    function crossColumn(dir: 'left' | 'right'): boolean {
      const cur = group.current;
      if (!cur || cur.classList.contains('rtool')) return false;
      const want: Zone = dir === 'right' ? 'repo' : 'party';
      if (cur.dataset.zone === want) return false;
      const cy = cur.getBoundingClientRect().top;
      const items = group.items().filter((e) => e.classList.contains('rcell') && e.dataset.zone === want);
      const best = items.sort((x, y) => Math.abs(x.getBoundingClientRect().top - cy) - Math.abs(y.getBoundingClientRect().top - cy))[0];
      if (!best) return false;
      group.set(best);
      audio.sfx('ui_move');
      return true;
    }

    function onKey(a: Action): void {
      if (closing) return;
      if (document.activeElement === search) {
        if (a === 'confirm' || a === 'back') search.blur();
        return;
      }
      if (a === 'menu') void close();
      else if (a === 'back') {
        if (held) {
          held = null;
          audio.sfx('ui_back');
          render();
        } else void close();
      } else if (isDir(a)) {
        if (!group.move(a) && (a === 'left' || a === 'right')) crossColumn(a);
      } else if (a === 'confirm') {
        const cur = group.current;
        if (cur === search) search.focus();
        else group.activate();
      }
    }

    search.addEventListener('input', () => { filter.query = search.value; renderGrid(); });
    search.addEventListener('blur', () => renderHints());
    render();
    group.reset((e) => e.classList.contains('rcell') && !e.classList.contains('is-empty'));
    renderSummary();
  });
}
