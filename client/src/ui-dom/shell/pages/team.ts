// Équipe: party list with context bars, detail panel (stats, moves, XP, evolutions) and reorder.
import { db } from '../../../data/db';
import type { Stats } from '../../../data/types';
import { game } from '../../../state/store';
import type { PokaiInstance } from '../../../state/types';
import { ACCELERATIONIST_EVO_BONUS, displayName, isFainted, maxContext, pokaiStats } from '../../../systems/pokai';
import { leadProblem, makeLead, reorder, reorderMoves } from '../../../systems/party';
import { xpForLevel, MAX_LEVEL } from '../../../systems/stats';
import { h } from '../../dom';
import { FocusGroup, isDir } from '../focus';
import { CLASS_LABEL, STAT_LABEL, STAT_ORDER } from '../labels';
import { art, ctxBar, licenceTag, plainBar, statusTag, typeTag, hs } from '../widgets';
import type { Page, PageFactory } from './page';

const STAT_CAP = 160;

type Mode = 'list' | 'actions' | 'move' | 'summary';
type ActId = 'lead' | 'move' | 'summary';
const ACTS: { id: ActId; label: string }[] = [
  { id: 'lead', label: 'Mettre en tête' },
  { id: 'move', label: 'Déplacer' },
  { id: 'summary', label: 'Résumé' },
];

export const teamPage: PageFactory = (host) => {
  const note = h('div.team-note');
  const list = h('div.team-list', { role: 'listbox', 'aria-label': 'Équipe' });
  const left = h('div.team-side', null, note, list);
  const detail = h('div.team-detail');
  const el = h('div.page.page-team', null, left, detail);
  const group = new FocusGroup(list, '.team-row');

  let mode: Mode = 'list';
  let actIdx = 0;
  let grabbed: { uid: string; original: string[] } | null = null;
  // Summary: move being reordered.
  let mSel = 0;
  let mGrab: { origin: number; original: string[] } | null = null;
  /** PokAI whose detail is shown (kept while moving things, whatever the mouse hovers). */
  let selUid: string | undefined;

  const party = (): PokaiInstance[] => game.state.party;
  const current = (): PokaiInstance | undefined => party().find((x) => x.uid === group.current?.dataset.uid);
  const sameOrder = (a: string[], b: string[]): boolean => a.length === b.length && a.every((u, i) => u === b[i]);
  const persist = (): void => {
    game.save();
    host.refresh();
  };
  const setMode = (m: Mode): void => {
    mode = m;
    host.hintsChanged();
  };

  function renderNote(): void {
    const p = grabbed ? party().find((x) => x.uid === grabbed!.uid) : undefined;
    note.classList.toggle('is-move', p !== undefined);
    note.textContent = p
      ? `Déplacement de ${displayName(p)} : ↑ ↓ pour choisir la place, Valider pour poser, Retour pour annuler.`
      : party().length > 1
        ? 'Le n°1 est envoyé en premier au combat. Choisis un PokAI pour le mettre en tête ou le déplacer.'
        : '';
  }

  /** Applies a candidate order if the lead rule allows it (a KO lead is refused while a teammate can fight). */
  function applyOrder(next: PokaiInstance[], originalUids: string[]): boolean {
    const changed = !sameOrder(next.map((p) => p.uid), originalUids);
    const problem = leadProblem(next);
    if (problem && changed) {
      host.toast(problem);
      return false;
    }
    party().splice(0, party().length, ...next);
    return true;
  }

  function renderList(focusUid?: string): void {
    list.replaceChildren();
    renderNote();
    if (party().length === 0) {
      list.append(h('div.empty', null, h('b', null, 'Aucun PokAI'), 'Ton équipe est vide. Un Professeur te cherche sûrement.'));
      return;
    }
    party().forEach((p, i) => {
      const max = maxContext(p);
      const row = hs(
        'div.team-row.fx' + (grabbed?.uid === p.uid ? '.is-grab' : '') + (i === 0 ? '.is-lead' : '') + (grabbed && grabbed.uid !== p.uid ? '.is-dim' : ''),
        {
          role: 'option',
          draggable: 'true',
          'data-uid': p.uid,
          'data-i': String(i),
          'aria-label': `Place ${i + 1} : ${displayName(p)}`,
          onclick: () => onRowClick(p.uid),
          ondragstart: (e: DragEvent) => {
            e.dataTransfer?.setData('text/plain', p.uid);
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
            row.classList.add('is-grab');
          },
          ondragend: () => renderList(p.uid),
          ondragover: (e: DragEvent) => {
            e.preventDefault();
            const r = row.getBoundingClientRect();
            const after = e.clientY > r.top + r.height / 2;
            list.querySelectorAll('.is-drop-before, .is-drop-after').forEach((n) => n.classList.remove('is-drop-before', 'is-drop-after'));
            row.classList.add(after ? 'is-drop-after' : 'is-drop-before');
          },
          ondrop: (e: DragEvent) => {
            e.preventDefault();
            const uid = e.dataTransfer?.getData('text/plain');
            const r = row.getBoundingClientRect();
            onDrop(uid, i, e.clientY > r.top + r.height / 2);
          },
        },
        h('span.row-n', null, String(i + 1)),
        art(p.form, 40, { faint: p.context <= 0 }),
        h('span.row-main', null,
          h('span.row-name', null, displayName(p)),
          h('span.row-sub', null, `Nv. ${p.level}`, i === 0 ? h('span.lead-tag', null, 'en tête') : null, p.status ? statusTag(p.status) : null),
          ctxBar(p.context / Math.max(1, max)),
        ),
        h('span.row-ctx', null, isFainted(p) ? 'KO' : `${p.context}/${max}`),
      );
      list.append(row);
    });
    const target = focusUid ? list.querySelector<HTMLElement>(`[data-uid="${focusUid}"]`) : null;
    group.current = null;
    if (target) group.set(target);
    else group.set(group.items()[0] ?? null);
  }

  /** Mouse drag-and-drop of a party row onto another. */
  function onDrop(uid: string | undefined, targetIndex: number, after: boolean): void {
    const from = party().findIndex((p) => p.uid === uid);
    if (from < 0 || !uid) return renderList();
    const original = party().map((p) => p.uid);
    const next = [...party()];
    let to = targetIndex + (after ? 1 : 0);
    if (from < to) to--;
    reorder(next, from, Math.max(0, Math.min(next.length - 1, to)));
    if (applyOrder(next, original) && !sameOrder(original, next.map((p) => p.uid))) {
      persist();
      host.toast(`${displayName(next[Math.max(0, Math.min(next.length - 1, to))]!)} est maintenant n°${to + 1}.`);
    }
    renderList(uid);
  }

  function actionsBar(p: PokaiInstance): HTMLElement {
    const isLead = party()[0]?.uid === p.uid;
    const multi = party().length > 1;
    const dim: Record<ActId, boolean> = { lead: isLead || !multi, move: !multi, summary: false };
    const labels: Record<ActId, string> = { lead: isLead ? 'En tête' : 'Mettre en tête', move: 'Déplacer', summary: 'Résumé' };
    const on: Record<ActId, boolean> = { lead: false, move: mode === 'move', summary: mode === 'summary' };
    return h('div.team-actions', { role: 'toolbar', 'aria-label': `Actions pour ${displayName(p)}` },
      ...ACTS.map((a, k) =>
        hs(
          'button.act' + (mode === 'actions' && actIdx === k ? '.is-focus' : '') + (dim[a.id] ? '.is-dim' : '') + (on[a.id] ? '.is-on' : ''),
          { type: 'button', onclick: () => { actIdx = k; runAction(a.id); } },
          h('span.act-n', null, String(k + 1)),
          labels[a.id],
        ),
      ),
    );
  }

  function moveRow(p: PokaiInstance, i: number, full: boolean): HTMLElement {
    const m = p.moves[i]!;
    const mv = db.move(m.move);
    const grabbedHere = mGrab !== null && mSel === i;
    return hs(
      'div.move' + (full ? '.move-full.fx' : '') + (full && mSel === i ? '.is-sel' : '') + (grabbedHere ? '.is-grab' : ''),
      {
        title: mv.description,
        ...(full
          ? {
              role: 'option',
              draggable: 'true',
              onclick: () => onMoveClick(i),
              ondragstart: (e: DragEvent) => { e.dataTransfer?.setData('text/plain', String(i)); mSel = i; },
              ondragover: (e: DragEvent) => e.preventDefault(),
              ondrop: (e: DragEvent) => {
                e.preventDefault();
                const from = Number(e.dataTransfer?.getData('text/plain'));
                if (Number.isInteger(from) && reorderMoves(p, from, i)) {
                  mSel = i;
                  game.save();
                  host.toast(`${mv.name} est maintenant la technique n°${i + 1}.`);
                }
                renderDetail();
              },
            }
          : {}),
      },
      h('span.move-n', null, String(i + 1)),
      h('span.move-main', null,
        h('span.move-name', null, h('i.tag-sw', { style: `background:var(--type-${mv.type})` }), mv.name),
        full ? h('span.move-desc', null, mv.description) : null,
      ),
      h('span.move-meta', null,
        mv.power > 0 ? `Pui. ${mv.power}` : 'Statut',
        full ? `Préc. ${mv.accuracy}` : null,
        h('span.move-tok', null, `${m.tokens}/${mv.tokens}`),
      ),
    );
  }

  function renderDetail(): void {
    const p = current();
    detail.replaceChildren();
    if (!p) return;
    const form = db.form(p.form);
    const line = db.lineOfForm(p.form);
    const stats = pokaiStats(p);
    const cur = xpForLevel(p.level);
    const next = p.level >= MAX_LEVEL ? cur : xpForLevel(p.level + 1);
    const bonus = game.state.vibeurClass === 'accelerationist' ? ACCELERATIONIST_EVO_BONUS : 0;
    const summary = mode === 'summary';

    const evo = form.evolutions.length
      ? form.evolutions.map((e) => `${db.hasForm(e.to) ? db.form(e.to).name : e.to} au Nv. ${Math.max(1, e.level - bonus)}`).join(' ou ')
      : 'Version finale';

    detail.append(
      h('div.det-head', null,
        art(p.form, 96),
        h('div.det-id', null,
          h('div.det-name', null, displayName(p)),
          h('div.det-sub', null, `${line.publisher} · ${form.name} · Nv. ${p.level}`),
          h('div.tags', null, ...form.types.map(typeTag), licenceTag(form.licence), p.status ? statusTag(p.status) : null),
          h('div.det-xp', null,
            h('span.k', null, 'XP'),
            plainBar(next > cur ? (p.xp - cur) / (next - cur) : 1, 'var(--blue)'),
            h('span.v', null, p.level >= MAX_LEVEL ? 'max' : `${Math.max(0, next - p.xp)} avant Nv. ${p.level + 1}`),
          ),
        ),
      ),
      actionsBar(p),
      h('div.det-cols', null,
        h('section.det-sec', null,
          h('h3', null, 'Statistiques'),
          ...STAT_ORDER.map((k) => statRow(k, stats, p)),
          h('div.det-evo', null, h('span.k', null, 'Montée de version'), h('span', null, evo)),
        ),
        h('section.det-sec', null,
          h('h3', null, summary ? 'Techniques (ordre de la barre de prompt)' : 'Techniques'),
          summary
            ? h('div.move-help', null, mGrab ? 'Choisis la nouvelle place avec ↑ ↓, puis Valider.' : 'Valider sur une technique pour la déplacer (ou glisse-la à la souris).')
            : null,
          ...p.moves.map((_, i) => moveRow(p, i, summary)),
          p.moves.length === 0 ? h('div.muted', null, 'Aucune technique.') : null,
        ),
      ),
      h('div.det-foot', null, `Classe : ${CLASS_LABEL[game.state.vibeurClass]}${p.caughtAt ? ` · rencontré à ${p.caughtAt.replace(/_/g, ' ')}` : ''}`),
    );
  }

  function statRow(k: keyof Stats, stats: Stats, p: PokaiInstance): HTMLElement {
    const v = stats[k];
    const bar = k === 'context' ? ctxBar(p.context / Math.max(1, v)) : plainBar(v / STAT_CAP, 'var(--ink-2)');
    return h('div.stat', null, h('span.k', null, STAT_LABEL[k]), bar, h('span.v', null, k === 'context' ? `${p.context}/${v}` : String(v)));
  }

  // ---------------------------------------------------------------- actions

  function runAction(id: ActId): void {
    const p = current();
    if (!p) return;
    const multi = party().length > 1;
    if (id === 'lead') {
      if (party()[0]?.uid === p.uid) host.toast(`${displayName(p)} est déjà en tête de l'équipe.`);
      else if (!multi) host.toast('Un seul PokAI dans ton équipe.');
      else if (!makeLead(party(), p.uid)) host.toast('Un PokAI hors service ne peut pas ouvrir le combat : soigne-le d\'abord au Hub.');
      else {
        persist();
        host.toast(`${displayName(p)} sera envoyé en premier au combat.`);
      }
      setMode('actions');
      renderList(p.uid);
      return;
    }
    if (id === 'move') {
      if (!multi) {
        host.toast('Il faut au moins deux PokAI pour changer l\'ordre.');
        return;
      }
      grabbed = { uid: p.uid, original: party().map((x) => x.uid) };
      setMode('move');
      renderList(p.uid);
      return;
    }
    mSel = 0;
    mGrab = null;
    setMode('summary');
    renderDetail();
  }

  function onRowClick(uid: string): void {
    if (mode === 'move' || mode === 'summary') return;
    const row = list.querySelector<HTMLElement>(`[data-uid="${uid}"]`);
    if (row) group.set(row);
    setMode('actions');
    renderDetail();
  }

  function onMoveClick(i: number): void {
    const p = current();
    if (!p) return;
    if (!mGrab) {
      mSel = i;
      mGrab = { origin: i, original: p.moves.map((m) => m.move) };
    } else {
      if (reorderMoves(p, mSel, i)) mSel = i;
      placeMove(p);
    }
    host.hintsChanged();
    renderDetail();
  }

  function placeMove(p: PokaiInstance): void {
    if (!mGrab) return;
    const changed = !sameOrder(mGrab.original, p.moves.map((m) => m.move));
    mGrab = null;
    if (changed) {
      game.save();
      host.toast(`Ordre des techniques mis à jour : ${db.move(p.moves[mSel]!.move).name} est n°${mSel + 1}.`);
    }
  }

  function stepMove(p: PokaiInstance, dir: -1 | 1): void {
    const j = mSel + dir;
    if (j < 0 || j >= p.moves.length) return;
    if (mGrab) reorderMoves(p, mSel, j);
    mSel = j;
    renderDetail();
  }

  group.onChange = (row) => {
    // While moving a PokAI / its moves, hovering other rows must not change the selection.
    if (mode === 'move' || mode === 'summary') {
      const want = list.querySelector<HTMLElement>(`[data-uid="${selUid}"]`);
      if (want && row !== want) {
        group.set(want, false);
        return;
      }
    }
    selUid = row?.dataset.uid;
    renderDetail();
  };
  renderList();

  function leaveToList(): void {
    grabbed = null;
    mGrab = null;
    setMode('list');
  }

  return {
    el,
    enter() {
      mode = 'list';
      grabbed = null;
      mGrab = null;
      group.revalidate();
      renderNote();
      renderDetail();
    },
    leave() {
      grabbed = null;
      mGrab = null;
      mode = 'list';
      group.current?.classList.remove('is-focus');
      group.current = null;
    },
    handle(a) {
      const p = current();
      if (mode === 'move' && grabbed) {
        if (a === 'up' || a === 'down') {
          const i = party().findIndex((x) => x.uid === grabbed!.uid);
          const j = a === 'up' ? i - 1 : i + 1;
          if (i >= 0 && j >= 0 && j < party().length) {
            reorder(party(), i, j);
            renderList(grabbed.uid);
          }
          return true;
        }
        if (a === 'confirm') {
          const uid = grabbed.uid;
          const original = grabbed.original;
          // Validate the final order: a KO lead is refused while a teammate can fight.
          if (applyOrder([...party()], original)) {
            const changed = !sameOrder(original, party().map((x) => x.uid));
            grabbed = null;
            setMode('actions');
            if (changed) {
              persist();
              host.toast(`Ordre de l'équipe mis à jour : n°${party().findIndex((x) => x.uid === uid) + 1}.`);
            }
            renderList(uid);
          }
          return true;
        }
        if (a === 'back') {
          const orig = grabbed.original;
          const uid = grabbed.uid;
          party().sort((x, y) => orig.indexOf(x.uid) - orig.indexOf(y.uid));
          grabbed = null;
          setMode('actions');
          renderList(uid);
          return true;
        }
        return true;
      }

      if (mode === 'summary' && p) {
        if (a === 'up' || a === 'down') return (stepMove(p, a === 'up' ? -1 : 1), true);
        if (a === 'confirm') {
          if (!mGrab) mGrab = { origin: mSel, original: p.moves.map((m) => m.move) };
          else placeMove(p);
          renderDetail();
          return true;
        }
        if (a === 'back' || a === 'left') {
          if (mGrab) {
            // Cancel: restore the order from before the pick-up.
            const orig = mGrab.original;
            p.moves.sort((x, y) => orig.indexOf(x.move) - orig.indexOf(y.move));
            mSel = mGrab.origin;
            mGrab = null;
          } else {
            actIdx = 2;
            setMode('actions');
          }
          renderDetail();
          return true;
        }
        return true;
      }

      if (mode === 'actions') {
        if (a === 'left') {
          if (actIdx === 0) leaveToList();
          else actIdx--;
          renderDetail();
          return true;
        }
        if (a === 'right') {
          actIdx = Math.min(ACTS.length - 1, actIdx + 1);
          renderDetail();
          return true;
        }
        if (a === 'up' || a === 'down') {
          group.move(a);
          return true;
        }
        if (a === 'confirm') {
          runAction(ACTS[actIdx]!.id);
          return true;
        }
        if (a === 'back') {
          leaveToList();
          renderDetail();
          return true;
        }
        return true;
      }

      // list
      if (a === 'confirm' || a === 'right') {
        if (p) {
          actIdx = 0;
          setMode('actions');
          renderDetail();
        }
        return true;
      }
      if (isDir(a)) return a === 'left' ? false : group.move(a) || a === 'up' || a === 'down';
      return false;
    },
    hints() {
      const act = ACTS[actIdx]?.label ?? '';
      switch (mode) {
        case 'move':
          return [['up', 'Monter'], ['down', 'Descendre'], ['confirm', 'Poser ici'], ['back', 'Annuler']];
        case 'summary':
          return mGrab
            ? [['up', 'Monter'], ['down', 'Descendre'], ['confirm', 'Poser ici'], ['back', 'Annuler']]
            : [['up', 'Choisir une technique'], ['confirm', 'Déplacer la technique'], ['back', 'Fermer le résumé']];
        case 'actions':
          return [['left', 'Mettre en tête · Déplacer · Résumé'], ['confirm', act], ['up', 'Autre PokAI'], ['back', 'Liste']];
        default:
          return party().length > 1
            ? [['up', 'Choisir'], ['confirm', 'Actions : tête, déplacer, résumé'], ['back', 'Retour']]
            : [['up', 'Choisir'], ['confirm', 'Actions : résumé'], ['back', 'Retour']];
      }
    },
  };
};
