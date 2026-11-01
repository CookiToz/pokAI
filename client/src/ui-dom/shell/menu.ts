// The "system" window: sidebar of apps (Équipe, Sac, Model Hub, Badges, Réglages, Commandes) + page area.
import { audio } from '../../audio/audio';
import { db } from '../../data/db';
import { game } from '../../state/store';
import type { Action } from '../../input/input';
import { h } from '../dom';
import { ui, type MenuTab } from '../facade';
import { setDockActive, refreshChrome, toast } from './chrome';
import { icon, type IconName } from './icons';
import { CLASS_LABEL, fmtInt, fmtTime } from './labels';
import { openWindow, type Win } from './os-window';
import { achievementsPage } from './pages/achievements';
import { badgesPage } from './pages/badges';
import { bagPage } from './pages/bag';
import { controlsPage } from './pages/controls';
import { dexPage } from './pages/dex';
import type { Page, PageFactory, PageHost } from './pages/page';
import { settingsPage } from './pages/settings';
import { teamPage } from './pages/team';

interface Tab { id: MenuTab; label: string; icon: IconName; title: string; make: PageFactory }
const TABS: Tab[] = [
  { id: 'team', label: 'Équipe', icon: 'team', title: 'Équipe', make: teamPage },
  { id: 'bag', label: 'Sac', icon: 'bag', title: 'Sac', make: bagPage },
  { id: 'dex', label: 'Model Hub', icon: 'hub', title: 'Model Hub — Neurodex', make: dexPage },
  { id: 'badges', label: 'Badges', icon: 'badge', title: 'Badges', make: badgesPage },
  { id: 'achievements', label: 'Succès', icon: 'badge', title: 'Succès', make: achievementsPage },
  { id: 'save', label: 'Réglages', icon: 'settings', title: 'Réglages', make: settingsPage },
  { id: 'controls', label: 'Commandes', icon: 'controls', title: 'Commandes', make: controlsPage },
];

let current: { win: Win; goto(tab: MenuTab): void } | null = null;

export function menuIsOpen(): boolean {
  return current !== null;
}

export function gotoMenuTab(tab: MenuTab): void {
  current?.goto(tab);
}

export function openMenu(initial: MenuTab = 'team'): Promise<void> {
  if (current) {
    current.goto(initial);
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    let tab = TABS.find((t) => t.id === initial) ?? TABS[0]!;
    let page: Page | null = null;
    let mode: 'nav' | 'content' = 'nav';
    let busy = false;

    const host: PageHost = {
      toast,
      hintsChanged: () => updateHints(),
      refresh: () => {
        renderCard();
        refreshChrome();
      },
      evolve: async (uid, options) => {
        await ui.evolution(uid, options);
        renderCard();
        refreshChrome();
      },
    };

    const navItems = TABS.map((t) =>
      h('button.nav-item', { type: 'button', 'data-tab': t.id, onclick: () => select(t.id, true) }, icon(t.icon), h('span', null, t.label)),
    );
    const card = h('div.side-card');
    const nav = h('nav.side', { 'aria-label': 'Applications' }, h('div.side-list', null, ...navItems), card);
    const pageHost = h('div.page-host');
    const win = openWindow({
      id: 'shell:menu',
      title: tab.title,
      icon: tab.icon,
      cls: 'win-menu',
      hints: [],
      onKey: onKey,
      onRequestClose: () => void close(),
    });
    win.body.append(nav, pageHost);

    function renderCard(): void {
      const s = game.state;
      const total = db.allForms().filter((f) => db.lineOfForm(f.id).mvp).length;
      card.replaceChildren(
        h('div.side-name', null, icon('user'), s.playerName),
        h('div.side-class', null, CLASS_LABEL[s.vibeurClass]),
        h('div.side-kv', null, h('span', null, 'GPU'), h('b', null, fmtInt(s.credits))),
        h('div.side-kv', null, h('span', null, 'Temps'), h('b', null, fmtTime(s.playTimeSec))),
        h('div.side-kv', null, h('span', null, 'Modèles'), h('b', null, `${s.caught.length}/${total}`)),
      );
    }

    function updateHints(): void {
      win.hints.set(mode === 'nav' ? [['up', 'Applications'], ['right', 'Ouvrir'], ['menu', 'Fermer']] : [...(page?.hints() ?? []), ['menu', 'Fermer']]);
    }

    function setMode(m: 'nav' | 'content'): void {
      mode = m;
      win.el.classList.toggle('in-content', m === 'content');
      if (m === 'content') page?.enter();
      else page?.leave();
      navItems.forEach((n) => n.classList.toggle('is-focus', m === 'nav' && n.dataset.tab === tab.id));
      updateHints();
    }

    function select(id: MenuTab, enter = false): void {
      const t = TABS.find((x) => x.id === id) ?? TABS[0]!;
      if (t.id !== tab.id || !page) {
        page?.leave();
        tab = t;
        page = t.make(host);
        pageHost.replaceChildren(page.el);
        pageHost.classList.remove('swap');
        void pageHost.offsetWidth;
        pageHost.classList.add('swap');
        win.setTitle(t.title);
        win.setIcon(t.icon);
        navItems.forEach((n) => {
          n.classList.toggle('is-current', n.dataset.tab === t.id);
          n.setAttribute('aria-current', n.dataset.tab === t.id ? 'page' : 'false');
        });
        setDockActive(DOCK_OF[t.id] ?? null);
        renderCard();
      }
      setMode(enter ? 'content' : 'nav');
    }

    async function close(): Promise<void> {
      if (busy) return;
      busy = true;
      page?.leave();
      current = null;
      setDockActive(null);
      await win.close();
      resolve();
    }

    function onKey(a: Action): void {
      if (busy) return;
      if (a === 'menu') {
        void close();
        return;
      }
      if (a === 'help') {
        select('controls', true);
        return;
      }
      if (mode === 'nav') {
        if (a === 'up' || a === 'down') {
          const i = TABS.indexOf(tab);
          const n = TABS[(i + (a === 'down' ? 1 : TABS.length - 1)) % TABS.length]!;
          select(n.id, false);
          audio.sfx('ui_move');
        } else if (a === 'right' || a === 'confirm') setMode('content');
        else if (a === 'back') void close();
        return;
      }
      const used = page?.handle(a) ?? false;
      if (!used && (a === 'left' || a === 'back')) {
        audio.sfx('ui_back');
        setMode('nav');
      }
      updateHints();
    }

    current = {
      win,
      goto: (id) => select(id, true),
    };
    // Opening from the walking state starts inside the page; Échap then lands in the sidebar.
    select(tab.id, true);
  });
}

const DOCK_OF: Partial<Record<MenuTab, MenuTab>> = { team: 'team', bag: 'bag', dex: 'dex', badges: 'badges', achievements: 'badges', save: 'save', controls: 'save' };
