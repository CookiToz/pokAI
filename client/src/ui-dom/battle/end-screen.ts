// Victory / defeat window shown at the end of a duel: a LatentOS dialog with the rewards summary.
import './dock.css';
import { h } from '../dom';
import { icon } from './icons';
import { fmtInt, tween } from './util';
import { prefersReducedMotion } from './fx';
import type { Action } from '../../input/input';

export interface XpLine {
  name: string;
  art: string;
  amount: number;
  from: number;
  to: number;
}

export interface DuelSummary {
  outcome: 'won' | 'lost' | 'fled' | 'onboarded';
  foe: string;
  turns: number;
  xp: Map<string, XpLine>;
  credits: number;
  loot: string[];
  captured: { name: string; art: string }[];
  badges: string[];
}

export function newSummary(): DuelSummary {
  return { outcome: 'won', foe: '', turns: 0, xp: new Map(), credits: 0, loot: [], captured: [], badges: [] };
}

const HEAD = {
  won: { title: 'VICTOIRE', sub: 'Le prompt était le bon.' },
  onboarded: { title: 'ONBOARDING RÉUSSI', sub: 'Un nouveau modèle rejoint ton équipe.' },
  lost: { title: 'DÉFAITE', sub: 'Tous tes PokAI sont déconnectés.' },
  fled: { title: 'CONNEXION FERMÉE', sub: 'Tu as quitté la conversation.' },
} as const;

export interface ResultHandle {
  done: Promise<void>;
  key(a: Action): void;
}

export function showResult(host: HTMLElement, s: DuelSummary): ResultHandle {
  const shownAt = performance.now();
  const head = HEAD[s.outcome];
  const good = s.outcome === 'won' || s.outcome === 'onboarded';
  const rows: HTMLElement[] = [];

  for (const x of s.xp.values()) {
    const lv = x.to > x.from;
    rows.push(
      h(
        'div.bt-res-row',
        null,
        h('div.bt-art.bt-res-art', { html: x.art }),
        h('div.bt-res-main', null, h('b', null, x.name), h('span.bt-res-sub', null, lv ? `Nv. ${x.from} → Nv. ${x.to}` : `Nv. ${x.to}`)),
        h('div.bt-res-val', null, lv ? h('span.bt-chip.is-gold', null, icon('up'), 'niveau') : null, h('b', null, `+${fmtInt(x.amount)} XP`)),
      ),
    );
  }
  for (const c of s.captured) {
    rows.push(h('div.bt-res-row.is-capture', null, h('div.bt-art.bt-res-art', { html: c.art }), h('div.bt-res-main', null, h('b', null, c.name), h('span.bt-res-sub', null, 'ajouté au Repo / à l’équipe')), h('div.bt-res-val', null, h('span.bt-chip.is-open', null, 'onboardé'))));
  }
  const credits = h('b', null, '+0');
  if (s.credits !== 0) {
    rows.push(h('div.bt-res-row.is-line', null, h('div.bt-res-main', null, h('b', null, 'Crédits GPU')), h('div.bt-res-val', null, credits)));
  }
  for (const l of s.loot) rows.push(h('div.bt-res-row.is-line', null, h('div.bt-res-main', null, h('span.bt-res-sub', null, l))));
  for (const b of s.badges) rows.push(h('div.bt-res-row.is-line', null, icon('trophy', 'bt-res-ico'), h('div.bt-res-main', null, h('b', null, `Badge : ${b}`))));
  if (rows.length === 0) rows.push(h('div.bt-res-row.is-line', null, h('div.bt-res-main', null, h('span.bt-res-sub', null, good ? 'Aucune récompense cette fois.' : 'Rien à rapporter.'))));
  rows.forEach((r, i) => r.style.setProperty('--i', String(i)));

  let resolve: () => void = () => undefined;
  const done = new Promise<void>((r) => {
    resolve = r;
  });
  const btn = h('button.bt-btn.is-primary.is-focus', { type: 'button', onclick: () => finish() }, 'Continuer', h('kbd', null, 'Entrée'));
  const win = h(
    'div.bt-sheet.bt-result',
    { dataset: { outcome: s.outcome }, role: 'dialog', 'aria-label': head.title },
    h('div.bt-sheet-head', null, h('span', null, 'résultat.exe'), h('span', null, s.foe ? `vs ${s.foe} · ${s.turns} tour${s.turns > 1 ? 's' : ''}` : '')),
    h('div.bt-res-banner', null, h('div.bt-res-stamp', null, head.title), h('div.bt-res-tag', null, head.sub)),
    h('div.bt-res-list', null, ...rows),
    h('div.bt-res-foot', null, btn),
  );
  const back = h('div.bt-backdrop.bt-result-bd', null, win);
  host.append(back);

  const finish = (): void => {
    if (performance.now() - shownAt < 350) return;
    back.remove();
    resolve();
  };
  if (s.credits !== 0) {
    const sign = s.credits > 0 ? '+' : '−';
    void tween(0, Math.abs(s.credits), prefersReducedMotion() ? 0 : 700, (v) => {
      credits.textContent = `${sign}${fmtInt(v)}`;
    });
  }
  return {
    done,
    key: (a) => {
      if (a === 'confirm' || a === 'back') finish();
    },
  };
}
