// LatentOS chrome: top bar (logo, zone, clock, GPU credits, party bars), app dock, map banner and toasts.
import { audio } from '../../audio/audio';
import { h, uiRoot } from '../dom';
import { game } from '../../state/store';
import { input } from '../../input/input';
import { maxContext } from '../../systems/pokai';
import { icon, type IconName } from './icons';
import { fmtInt } from './labels';
import { art, hs } from './widgets';
import type { MenuTab } from '../facade';

export interface DockApp { tab: MenuTab; label: string; icon: IconName }
export const DOCK_APPS: DockApp[] = [
  { tab: 'team', label: 'Équipe', icon: 'team' },
  { tab: 'bag', label: 'Sac', icon: 'bag' },
  { tab: 'dex', label: 'Model Hub', icon: 'hub' },
  { tab: 'badges', label: 'Badges', icon: 'badge' },
  { tab: 'save', label: 'Réglages', icon: 'settings' },
];

let topbar: HTMLElement;
let zoneEl: HTMLElement;
let clockEl: HTMLElement;
let credEl: HTMLElement;
let partyEl: HTMLElement;
let dock: HTMLElement;
let toasts: HTMLElement;
let banner: HTMLElement;
let onDock: (tab: MenuTab) => void = () => undefined;
let activeTab: MenuTab | null = null;
let sessionSec = 0;
let baseSec = 0;
let started = false;
let partySig = '';
let bannerTimer = 0;

export function setDockHandler(fn: (tab: MenuTab) => void): void {
  onDock = fn;
}

/** Highlights an app in the dock and expands it (menu open); null = back to the subtle walking state. */
export function setDockActive(tab: MenuTab | null): void {
  activeTab = tab;
  dock.classList.toggle('is-active', tab !== null);
  dock.querySelectorAll<HTMLElement>('.dock-app').forEach((b) => b.classList.toggle('is-current', b.dataset.tab === tab));
}

/** Call when the title is done: the clock and play time start from the loaded save. */
export function startSession(): void {
  baseSec = game.state.playTimeSec;
  sessionSec = 0;
  started = true;
  topbar.classList.add('is-on');
  refreshChrome();
}

export function setZone(name: string): void {
  if (zoneEl.dataset.zone === name) return;
  zoneEl.dataset.zone = name;
  const next = h('span.zone-name.is-in', null, name);
  const prev = zoneEl.querySelector('.zone-name');
  zoneEl.append(next);
  if (prev) {
    prev.classList.add('is-out');
    setTimeout(() => prev.remove(), 200);
  }
  requestAnimationFrame(() => next.classList.remove('is-in'));
}

function gameClock(): string {
  // 1 real second = 1 game minute, day starts at 08:00.
  const mins = (8 * 60 + Math.floor(baseSec + sessionSec)) % 1440;
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

export function refreshChrome(): void {
  if (!topbar) return;
  credEl.textContent = fmtInt(game.state.credits);
  clockEl.textContent = gameClock();
  const sig = game.state.party.map((p) => `${p.form}:${Math.round((p.context / Math.max(1, maxContext(p))) * 20)}`).join('|');
  if (sig !== partySig) {
    partySig = sig;
    partyEl.replaceChildren(
      ...game.state.party.map((p) => {
        const r = Math.max(0, Math.min(1, p.context / Math.max(1, maxContext(p))));
        const tone = r > 0.5 ? 'ok' : r > 0.2 ? 'mid' : 'low';
        const fill = h('i.bar-fill');
        fill.style.width = `${Math.round(r * 100)}%`;
        return hs('span.party-slot' + (r <= 0 ? '.is-ko' : ''), { title: `${p.nickname ?? p.form} ${Math.round(r * 100)} %` }, art(p.form, 20), h(`span.bar.bar-${tone}`, null, fill));
      }),
    );
  }
}

export function toast(text: string): void {
  if (!toasts) return;
  audio.sfx('ui_open');
  const t = h('div.toast', { role: 'status' }, icon('chat', 'toast-ico'), h('span', null, text));
  toasts.append(t);
  while (toasts.children.length > 3) toasts.firstElementChild?.remove();
  requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => {
    t.classList.remove('is-in');
    setTimeout(() => t.remove(), 180);
  }, 3200);
}

export function mapBanner(name: string): void {
  setZone(name);
  if (!banner) return;
  banner.replaceChildren(
    h('div.banner-bar', null, icon('cloud'), h('span', null, 'Zone atteinte')),
    h('div.banner-name', null, name),
  );
  banner.classList.add('is-in');
  clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => banner.classList.remove('is-in'), 2200);
}

export function initChrome(): void {
  const root = uiRoot();
  zoneEl = h('div.zone', { 'aria-live': 'polite' });
  clockEl = h('span.bar-clock');
  credEl = h('span.bar-credits-n');
  partyEl = h('div.party-mini');
  topbar = h(
    'header.topbar',
    null,
    h('div.brand', null, h('span.brand-mark', null, icon('logo')), h('span.brand-name', null, 'LatentOS')),
    zoneEl,
    h('span.topbar-spacer'),
    partyEl,
    h('span.bar-credits', { title: 'Crédits GPU' }, icon('bolt'), credEl, h('span.bar-credits-u', null, 'GPU')),
    h('span.bar-sep'),
    clockEl,
  );
  dock = h(
    'nav.dock',
    { 'aria-label': 'Applications' },
    ...DOCK_APPS.map((a) =>
      h('button.dock-app', { type: 'button', tabindex: -1, 'data-tab': a.tab, title: a.label, onclick: () => onDock(a.tab) }, icon(a.icon), h('span.dock-label', null, a.label)),
    ),
  );
  dock.classList.add('is-hidden');
  toasts = h('div.toasts');
  banner = h('div.map-banner');
  root.append(topbar, dock, banner, toasts);

  window.setInterval(() => {
    if (!started) return;
    sessionSec += 0.5;
    if (Math.floor(sessionSec) !== Math.floor(sessionSec - 0.5)) game.addPlayTime(1);
    refreshChrome();
  }, 500);
  // The dock is only "subtle" while the world has input; any other window hides it unless the menu is open.
  window.setInterval(() => {
    const top = input.topLayer();
    dock.classList.toggle('is-hidden', !started || (!(top === 'world' || top === undefined) && activeTab === null));
    }, 200);
}
