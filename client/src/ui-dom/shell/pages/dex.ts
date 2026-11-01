// Model Hub: the Neurodex as a model-hub browser. Caught = art, seen = silhouette, otherwise "training data insufficient".
import { db } from '../../../data/db';
import type { Form, Line, TypeId } from '../../../data/types';
import { game } from '../../../state/store';
import { api } from '../../../net/api';
import { h } from '../../dom';
import { FocusGroup, isDir } from '../focus';
import { icon } from '../icons';
import { LICENCE_LABEL, RARITY_LABEL, STAT_LABEL, STAT_ORDER, TYPE_LABEL, TYPE_ORDER } from '../labels';
import { effectiveBase } from '../../../systems/stats';
import { art, licenceTag, plainBar, typeTag, hs } from '../widgets';
import type { Page, PageFactory } from './page';

type Known = 'caught' | 'seen' | 'locked';
interface Entry { form: Form; line: Line; known: Known }

let globalCache: Record<string, string> | null = null;
let globalPending: Promise<Record<string, string>> | null = null;
function loadGlobal(): Promise<Record<string, string>> {
  if (globalCache) return Promise.resolve(globalCache);
  globalPending ??= api.globalDex().then((g) => (globalCache = g));
  return globalPending;
}

function entries(): Entry[] {
  const caught = new Set(game.state.caught);
  const seen = new Set(game.state.seen);
  const out: Entry[] = [];
  for (const line of [...db.lines].sort((a, b) => a.dexNo - b.dexNo)) {
    for (const form of line.forms) {
      out.push({ form, line, known: caught.has(form.id) ? 'caught' : seen.has(form.id) ? 'seen' : 'locked' });
    }
  }
  return out;
}

export const dexPage: PageFactory = () => {
  let typeFilter: TypeId | null = null;
  let licFilter: 'open' | 'proprietary' | null = null;
  let detailOf: Entry | null = null;

  const filters = h('div.dex-filters');
  const grid = h('div.dex-grid', { role: 'list' });
  const count = h('div.dex-count');
  const browse = h('div.dex-browse', null, h('div.dex-top', null, filters, count), grid);
  const detail = h('div.dex-detail', { hidden: true });
  const el = h('div.page.page-dex', null, browse, detail);
  const fGroup = new FocusGroup(browse, '.fx');
  const dGroup = new FocusGroup(detail, '.fx');

  function chip(label: string, on: boolean, fn: () => void, extra?: Node): HTMLElement {
    return hs('button.fchip.fx' + (on ? '.is-on' : ''), { type: 'button', onclick: fn }, extra, label);
  }

  function renderFilters(): void {
    filters.replaceChildren(
      h('div.fgroup', null,
        h('span.fgroup-k', null, 'Type'),
        chip('Tous', typeFilter === null, () => setFilter(null, licFilter)),
        ...TYPE_ORDER.map((t) => chip(TYPE_LABEL[t], typeFilter === t, () => setFilter(t, licFilter), h('i.tag-sw', { style: `background:var(--type-${t})` }))),
      ),
      h('div.fgroup', null,
        h('span.fgroup-k', null, 'Licence'),
        chip('Toutes', licFilter === null, () => setFilter(typeFilter, null)),
        chip(LICENCE_LABEL.open, licFilter === 'open', () => setFilter(typeFilter, 'open')),
        chip(LICENCE_LABEL.proprietary, licFilter === 'proprietary', () => setFilter(typeFilter, 'proprietary')),
      ),
    );
  }

  function setFilter(t: TypeId | null, l: 'open' | 'proprietary' | null): void {
    typeFilter = t;
    licFilter = l;
    const was = fGroup.current;
    const idx = was ? [...filters.querySelectorAll('.fx')].indexOf(was) : -1;
    renderFilters();
    renderGrid();
    fGroup.current = null;
    fGroup.set(idx >= 0 ? ([...filters.querySelectorAll<HTMLElement>('.fx')][idx] ?? null) : null);
  }

  function renderGrid(): void {
    const all = entries();
    const mvp = all.filter((e) => e.line.mvp);
    const nCaught = all.filter((e) => e.known === 'caught').length;
    const nSeen = all.filter((e) => e.known !== 'locked').length;
    count.textContent = `${nCaught} onboardés · ${nSeen} vus · ${mvp.length} publiés`;
    const filtering = typeFilter !== null || licFilter !== null;
    grid.replaceChildren();
    for (const e of all) {
      if (filtering) {
        if (e.known === 'locked') continue;
        if (typeFilter && !e.form.types.includes(typeFilter)) continue;
        if (licFilter && e.form.licence !== licFilter) continue;
      }
      grid.append(card(e));
    }
    if (!grid.firstChild) grid.append(h('div.empty', null, h('b', null, 'Aucun modèle'), 'Aucune fiche connue ne correspond à ces filtres.'));
  }

  function card(e: Entry): HTMLElement {
    const no = `N° ${String(e.line.dexNo).padStart(3, '0')}`;
    if (e.known === 'locked') {
      return hs('div.dcard.is-locked' + (e.line.mvp ? '' : '.is-future'), { role: 'listitem', 'data-id': e.form.id },
        h('div.dcard-art', null, icon('lock')),
        h('div.dcard-no', null, no),
        h('div.dcard-name', null, '???'),
        h('div.dcard-lock', null, "Données d'entraînement insuffisantes"),
      );
    }
    const caught = e.known === 'caught';
    return hs('button.dcard.fx' + (caught ? '.is-caught' : '.is-seen'), { type: 'button', role: 'listitem', 'data-id': e.form.id, onclick: () => openDetail(e) },
      h('div.dcard-art', null, art(e.form.id, 72, { silhouette: !caught })),
      h('div.dcard-no', null, no),
      h('div.dcard-name', null, caught ? e.form.name : '???'),
      h('div.dcard-types', null, ...e.form.types.map((t) => h('i.tag-sw', { style: `background:var(--type-${t})`, title: TYPE_LABEL[t] }))),
    );
  }

  function openDetail(e: Entry): void {
    detailOf = e;
    const caught = e.known === 'caught';
    const f = e.form;
    const base = effectiveBase(f);
    const first = h('span.v', null, 'Classement mondial…');
    void loadGlobal().then((g) => {
      first.textContent = g[f.id] ? `${g[f.id]}` : Object.keys(g).length === 0 ? 'Hors ligne' : 'Personne encore';
    });
    const chain = e.line.forms.map((x, i) => {
      const k: Known = game.state.caught.includes(x.id) ? 'caught' : game.state.seen.includes(x.id) ? 'seen' : 'locked';
      const node = k === 'locked'
        ? h('span.chain-node.is-locked', null, icon('lock'))
        : hs('button.chain-node.fx' + (x.id === f.id ? '.is-here' : ''), { type: 'button', title: k === 'caught' ? x.name : '???', onclick: () => openDetail({ form: x, line: e.line, known: k }) }, art(x.id, 44, { silhouette: k === 'seen' }));
      return [i > 0 ? h('span.chain-arrow', null, '→') : null, node];
    }).flat();
    detail.hidden = false;
    browse.hidden = true;
    detail.replaceChildren(
      h('div.hub-head', null,
        h('div.hub-art', null, art(f.id, 140, { silhouette: !caught })),
        h('div.hub-id', null,
          h('div.hub-path', null, h('span', null, e.line.publisher), ' / ', h('b', null, caught ? f.name : '???')),
          h('div.tags', null, ...f.types.map(typeTag), licenceTag(f.licence), h('span.tag', null, RARITY_LABEL[e.line.rarity] ?? e.line.rarity), h('span.tag', null, `Stade ${f.stage}`)),
          h('p.hub-desc', null, caught ? f.description : "Fiche non onboardée. Il faut interagir avec ce modèle de plus près pour lire sa documentation."),
          h('div.kv', null, h('span.k', null, 'Éditeur'), h('span.v', null, e.line.publisher)),
          h('div.kv', null, h('span.k', null, 'Premier onboardeur'), first),
        ),
      ),
      h('div.det-cols', null,
        h('section.det-sec', null, h('h3', null, 'Statistiques de base'),
          ...STAT_ORDER.map((k) => h('div.stat', null, h('span.k', null, STAT_LABEL[k]), plainBar(caught ? base[k] / 160 : 0, 'var(--ink-2)'), h('span.v', null, caught ? String(base[k]) : '?')))),
        h('section.det-sec', null, h('h3', null, 'Lignée'), h('div.chain', null, ...chain)),
      ),
    );
    dGroup.current = null;
    dGroup.set(dGroup.items().find((n) => n.classList.contains('is-here')) ?? dGroup.items()[0] ?? null);
  }

  function closeDetail(): void {
    const id = detailOf?.form.id;
    detailOf = null;
    detail.hidden = true;
    browse.hidden = false;
    const back = id ? grid.querySelector<HTMLElement>(`[data-id="${id}"].fx`) : null;
    fGroup.current = null;
    fGroup.set(back ?? fGroup.items().find((x) => x.classList.contains('dcard')) ?? fGroup.items()[0] ?? null);
  }

  renderFilters();
  renderGrid();

  return {
    el,
    enter() {
      fGroup.current = null;
      fGroup.set(grid.querySelector<HTMLElement>('.dcard.fx') ?? fGroup.items()[0] ?? null);
    },
    leave() {
      if (detailOf) closeDetail();
      fGroup.current?.classList.remove('is-focus');
      fGroup.current = null;
    },
    handle(a) {
      if (detailOf) {
        if (a === 'back') closeDetail();
        else if (isDir(a)) dGroup.move(a);
        else if (a === 'confirm') dGroup.activate();
        return true;
      }
      if (a === 'confirm') {
        fGroup.activate();
        return true;
      }
      if (isDir(a)) return fGroup.move(a) || a !== 'left';
      return false;
    },
    hints() {
      return detailOf ? [['left', 'Lignée'], ['back', 'Fiches']] : [['up', 'Parcourir'], ['confirm', 'Ouvrir'], ['back', 'Retour']];
    },
  };
};
