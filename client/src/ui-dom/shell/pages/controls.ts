// Commandes: every binding for the keyboard and the gamepad family, with a live "pressed" highlight.
import { hs } from '../widgets';
import { h } from '../../dom';
import { input, type Action, type Device } from '../../../input/input';
import { ACTION_LABEL, KEYBOARD_ALTERNATIVES, glyph } from '../../../input/glyphs';
import { FocusGroup } from '../focus';
import { deviceName, glyphChip } from '../hints';
import type { PageFactory } from './page';

const ACTIONS: Action[] = ['up', 'down', 'left', 'right', 'confirm', 'back', 'menu', 'help'];
const FAMILIES: Exclude<Device, 'keyboard'>[] = ['xbox', 'playstation', 'switch', 'gamepad'];
const USE: Record<Action, string> = {
  up: 'Se déplacer, naviguer', down: 'Se déplacer, naviguer', left: 'Se déplacer, naviguer', right: 'Se déplacer, naviguer',
  confirm: 'Parler, valider, avancer le texte', back: 'Retour, annuler', menu: 'Ouvrir ou fermer le menu', help: 'Ce panneau',
};

export const controlsPage: PageFactory = () => {
  let family: Exclude<Device, 'keyboard'> = input.device !== 'keyboard' ? input.device : 'xbox';
  const rows = new Map<Action, HTMLElement>();
  const last = h('div.pressed-echo', { 'aria-live': 'off' }, 'Appuie sur une touche ou un bouton : la ligne correspondante s\'allume.');
  const famBar = h('div.fam-bar');
  const table = h('div.ctl-table');
  const el = h('div.page.page-controls', null, h('div.ctl-top', null, famBar, last), table);
  const group = new FocusGroup(famBar, '.fx');

  function renderFam(): void {
    famBar.replaceChildren(h('span.fgroup-k', null, 'Manette'), ...FAMILIES.map((f) => hs('button.fchip.fx' + (f === family ? '.is-on' : ''), { type: 'button', 'data-f': f, onclick: () => { family = f; renderFam(); renderTable(); } }, deviceName(f))));
    const cur = famBar.querySelector<HTMLElement>(`[data-f="${family}"]`);
    group.current = null;
    group.set(cur ?? null);
  }

  function renderTable(): void {
    rows.clear();
    table.replaceChildren(
      h('div.ctl-row.ctl-head', null, h('span', null, 'Action'), h('span', null, 'Clavier'), h('span', null, deviceName(family))),
      ...ACTIONS.map((a) => {
        const row = h('div.ctl-row', { 'data-a': a },
          h('span.ctl-act', null, h('b', null, ACTION_LABEL[a]), h('small', null, USE[a])),
          h('span.ctl-keys', null, ...KEYBOARD_ALTERNATIVES[a].map((k) => glyphChip(k, 'keyboard'))),
          h('span.ctl-pad', null, glyphChip(glyph(a, family), family)),
        );
        rows.set(a, row);
        return row;
      }),
    );
  }

  function flash(a: Action): void {
    const row = rows.get(a);
    if (!row) return;
    row.classList.remove('is-pressed');
    void row.offsetWidth;
    row.classList.add('is-pressed');
    last.textContent = `Entrée reçue : ${ACTION_LABEL[a]} (${input.device === 'keyboard' ? 'clavier' : deviceName(input.device)})`;
  }

  renderFam();
  renderTable();
  return {
    el,
    enter: () => group.set(famBar.querySelector<HTMLElement>(`[data-f="${family}"]`)),
    leave: () => group.clear(),
    handle(a) {
      flash(a);
      if (a === 'left' || a === 'right') {
        const i = FAMILIES.indexOf(family);
        const n = FAMILIES[(i + (a === 'right' ? 1 : FAMILIES.length - 1)) % FAMILIES.length]!;
        family = n;
        renderFam();
        renderTable();
        flash(a);
        return true;
      }
      if (a === 'confirm') return true;
      return a === 'up' || a === 'down';
    },
    hints: () => [['left', 'Changer de manette'], ['back', 'Retour']],
  };
};
