// Sac: items grouped by kind; heals / statuses / boosts are applied to a PokAI picked in a small popup.
import { db } from '../../../data/db';
import type { Item } from '../../../data/types';
import { game } from '../../../state/store';
import type { PokaiInstance } from '../../../state/types';
import { applyItem, canUseItem, displayName, maxContext, pendingEvolution, type ProgressEvent } from '../../../systems/pokai';
import { learnLine, resolveLearnEvents } from '../../shared/forget-move';
import { h } from '../../dom';
import { FocusGroup, isDir } from '../focus';
import { ITEM_KIND_LABEL, ITEM_KIND_ORDER } from '../labels';
import { art, ctxBar, statusTag, hs } from '../widgets';
import type { Page, PageFactory } from './page';

const USABLE = new Set(['heal', 'status_heal', 'boost']);

/** Level-up lines only: the technique lines come from resolveLearnEvents (the player may have to choose). */
function describeLevels(p: PokaiInstance, events: ProgressEvent[]): string[] {
  const name = displayName(p);
  return events.flatMap((e) => (e.kind === 'levelup' ? [`${name} passe au Nv. ${e.level} !`] : []));
}

export const bagPage: PageFactory = (host) => {
  const list = h('div.bag-list', { role: 'listbox', 'aria-label': 'Sac' });
  const detail = h('div.bag-detail');
  const log = h('div.page-log', { 'aria-live': 'polite' });
  const picker = h('div.picker', { hidden: true });
  const el = h('div.page.page-bag', null, h('div.bag-cols', null, list, detail), log, picker);
  const group = new FocusGroup(list, '.bag-row');
  const pickGroup = new FocusGroup(picker, '.pick-row');
  let picking: Item | null = null;
  let busy = false;

  const owned = (): Item[] =>
    Object.keys(game.state.bag)
      .filter((id) => db.hasItem(id) && (game.state.bag[id] ?? 0) > 0)
      .map((id) => db.item(id));

  function renderList(keepId?: string): void {
    list.replaceChildren();
    const items = owned();
    if (items.length === 0) {
      list.append(h('div.empty', null, h('b', null, 'Sac vide'), 'Le Store accepte les crédits GPU. Pas les bonnes intentions.'));
      group.set(null);
      renderDetail();
      return;
    }
    for (const kind of ITEM_KIND_ORDER) {
      const inKind = items.filter((i) => i.kind === kind);
      if (inKind.length === 0) continue;
      list.append(h('div.list-h', null, ITEM_KIND_LABEL[kind]));
      for (const it of inKind) {
        list.append(h('button.bag-row.fx', { type: 'button', 'data-id': it.id, onclick: () => onActivate(it) }, h('span.row-name', null, it.name), h('span.row-count', null, `×${game.state.bag[it.id] ?? 0}`)));
      }
    }
    group.current = null;
    const target = keepId ? list.querySelector<HTMLElement>(`[data-id="${keepId}"]`) : null;
    group.set(target ?? group.items()[0] ?? null);
  }

  function renderDetail(): void {
    detail.replaceChildren();
    const id = group.current?.dataset.id;
    if (!id) return;
    const it = db.item(id);
    detail.append(
      h('div.det-name', null, it.name),
      h('div.det-sub', null, `${ITEM_KIND_LABEL[it.kind]} · ×${game.state.bag[id] ?? 0}`),
      h('p.det-desc', null, it.description),
      h('div.det-use', null, USABLE.has(it.kind) ? 'Valider : utiliser sur un PokAI' : it.kind === 'api_key' ? "Se joue pendant l'onboarding, en combat." : 'Objet clé.'),
    );
  }

  function setLog(lines: string[]): void {
    log.replaceChildren(...lines.map((l) => h('div', null, l)));
  }

  function onActivate(it: Item): void {
    if (busy) return;
    const row = list.querySelector<HTMLElement>(`[data-id="${it.id}"]`);
    if (row) group.set(row);
    if (!USABLE.has(it.kind)) {
      setLog([it.kind === 'api_key' ? 'Les clés API se dépensent pendant un onboarding, en combat.' : 'Cet objet ne s\'utilise pas ici.']);
      return;
    }
    if (game.state.party.length === 0) {
      setLog(['Personne à qui appliquer ça.']);
      return;
    }
    openPicker(it);
  }

  function openPicker(it: Item): void {
    picking = it;
    picker.hidden = false;
    picker.replaceChildren(
      h('div.picker-h', null, `Utiliser ${it.name} sur…`),
      ...game.state.party.map((p) => {
        const ok = canUseItem(it.id, p);
        const row = hs('button.pick-row.fx' + (ok ? '' : '.is-dim'), { type: 'button', 'data-uid': p.uid, onclick: () => void apply(it, p) },
          art(p.form, 32, { faint: !ok }),
          h('span.row-main', null, h('span.row-name', null, displayName(p)), h('span.row-sub', null, `Nv. ${p.level}`, p.status ? statusTag(p.status) : null), ctxBar(p.context / Math.max(1, maxContext(p)))),
          h('span.row-ctx', null, ok ? '' : 'sans effet'),
        );
        return row;
      }),
    );
    pickGroup.current = null;
    pickGroup.set(pickGroup.items().find((r) => !r.classList.contains('is-dim')) ?? pickGroup.items()[0] ?? null);
  }

  function closePicker(): void {
    picking = null;
    picker.hidden = true;
    picker.replaceChildren();
  }

  async function apply(it: Item, p: PokaiInstance): Promise<void> {
    if (busy) return;
    const res = applyItem(it.id, p, game.state.vibeurClass);
    if (!res.ok) {
      setLog([`${it.name} n'aurait aucun effet sur ${displayName(p)}.`]);
      return;
    }
    busy = true;
    game.removeItem(it.id, 1);
    const lines = [res.healed > 0 ? `${displayName(p)} récupère ${res.healed} de Contexte.` : `${it.name} utilisé sur ${displayName(p)}.`, ...describeLevels(p, res.events)];
    setLog(lines);
    closePicker();
    // Full moveset: "Espace disque plein" lets the player pick the technique to forget (or refuse).
    if (res.events.some((e) => e.kind === 'learn' || e.kind === 'learn_offer')) {
      const outcomes = await resolveLearnEvents(p, res.events);
      lines.push(...outcomes.map((o) => learnLine(p, o)));
      setLog(lines);
      game.save();
    }
    const evo = res.events.some((e) => e.kind === 'evolve_ready') ? pendingEvolution(p, game.state.vibeurClass) : [];
    if (evo.length > 0) await host.evolve(p.uid, evo);
    busy = false;
    host.refresh();
    renderList(game.itemCount(it.id) > 0 ? it.id : undefined);
  }

  group.onChange = () => renderDetail();
  renderList();

  return {
    el,
    enter() {
      group.revalidate();
      renderDetail();
    },
    leave() {
      closePicker();
      group.current?.classList.remove('is-focus');
      group.current = null;
    },
    handle(a) {
      if (busy) return true;
      if (picking) {
        if (a === 'back') closePicker();
        else if (isDir(a)) pickGroup.move(a === 'left' ? 'up' : a === 'right' ? 'down' : a);
        else if (a === 'confirm') pickGroup.activate();
        return true;
      }
      if (a === 'confirm') {
        group.activate();
        return true;
      }
      if (isDir(a)) return a === 'left' ? false : (group.move(a), true);
      return false;
    },
    hints() {
      return picking ? [['up', 'Choisir'], ['confirm', 'Utiliser'], ['back', 'Annuler']] : [['up', 'Choisir'], ['confirm', 'Utiliser'], ['back', 'Retour']];
    },
  };
};

