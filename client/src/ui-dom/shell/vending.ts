// Vending machine: a fake-OS kiosk. Credits slot animation, can drop into the chute, LCD with funny errors.
import './vending.css';
import { audio } from '../../audio/audio';
import { db } from '../../data/db';
import { game } from '../../state/store';
import type { Action } from '../../input/input';
import { h } from '../dom';
import { toast } from './chrome';
import { FocusGroup, isDir } from './focus';
import { icon } from './icons';
import { fmtInt } from './labels';
import { openWindow } from './os-window';
import { initials, sleep } from './widgets';

const CAN_COLOURS = ['var(--pink)', 'var(--blue)', 'var(--yellow)', 'var(--teal)', 'var(--orange)', 'var(--ctx)'];
const REFUSED = ['Paiement refusé : quota de crédits dépassé', 'Erreur 402 : Payment Required. Essayez de demander plus de GPU.', 'Carte déclinée : votre solde a halluciné.'];
const THANKS = ['Merci ! Veuillez noter votre expérience (1 à 5 canettes).', 'Distribué. Aucune garantie de fraîcheur, comme tout modèle.', 'Bonne dégustation. Ceci n’est pas un conseil nutritionnel.'];
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]!;

export function openVending(stock: { item: string; price: number }[]): Promise<void> {
  return new Promise<void>((resolve) => {
    const rows = stock.map((s, i) => ({ ...s, name: db.hasItem(s.item) ? db.item(s.item).name : s.item, desc: db.hasItem(s.item) ? db.item(s.item).description : '', code: 'ABCDEF'[Math.floor(i / 3)]! + ((i % 3) + 1), colour: CAN_COLOURS[i % CAN_COLOURS.length]! }));
    let busy = false;
    let closing = false;

    const lcd = h('div.vm-lcd', { 'aria-live': 'polite' });
    const wallet = h('span.vm-wallet-n');
    const slot = h('div.vm-slot', null, h('i.vm-coin', null, icon('bolt')));
    const chute = h('div.vm-chute', null, h('span', null, 'Récupérer ici'));
    const grid = h('div.vm-grid', { role: 'list' });

    const win = openWindow({ id: 'shell:vending', title: 'Distributeur — LatentOS Snack', icon: 'store', cls: 'win-vending', hints: [['up', 'Choisir'], ['confirm', 'Payer'], ['back', 'Quitter']], onKey, onRequestClose: () => void close() });
    win.body.append(
      h('div.vm', null,
        h('div.vm-front', null,
          h('div.vm-head', null, h('b', null, 'SNACK-BOT 3000'), h('span', null, 'Sans abonnement. Enfin presque.')),
          grid,
        ),
        h('aside.vm-panel', null,
          lcd,
          h('div.vm-wallet', null, icon('bolt'), wallet, h('small', null, 'GPU')),
          h('div.vm-slotbox', null, h('small', null, 'Fente à crédits'), slot),
          chute,
        ),
      ),
    );
    const group = new FocusGroup(grid, '.vm-tile');

    rows.forEach((r) => {
      const el = h('button.vm-tile.fx', { type: 'button', role: 'listitem', 'data-code': r.code, onclick: () => void buy(r.code), onmouseenter: () => describe(r.code) },
        h('span.vm-code', null, r.code),
        h('span.vm-can', { style: `--can:${r.colour}` }, h('b', null, initials(r.name))),
        h('span.vm-name', null, r.name),
        h('span.vm-price', null, icon('bolt'), fmtInt(r.price)),
      );
      grid.append(el);
    });
    group.onChange = (el) => describe(el?.dataset.code);
    if (rows.length === 0) grid.append(h('div.empty', null, h('b', null, 'Rupture de stock'), 'Le distributeur est en maintenance.'));

    function say(t: string, tone: '' | 'err' | 'ok' = ''): void {
      lcd.textContent = t;
      lcd.dataset.tone = tone;
    }
    function describe(code?: string): void {
      const r = rows.find((x) => x.code === code);
      if (r && !busy) say(`${r.code} · ${r.name} — ${r.desc}`);
    }
    function refresh(): void {
      wallet.textContent = fmtInt(game.state.credits);
    }

    async function buy(code: string): Promise<void> {
      const r = rows.find((x) => x.code === code);
      if (!r || busy || closing) return;
      if (game.state.credits < r.price) {
        audio.sfx('ui_error');
        say(pick(REFUSED), 'err');
        win.el.classList.remove('shake');
        void win.el.offsetWidth;
        win.el.classList.add('shake');
        return;
      }
      busy = true;
      say(`Insertion de ${fmtInt(r.price)} crédits…`);
      slot.classList.remove('is-feed');
      void slot.offsetWidth;
      slot.classList.add('is-feed');
      audio.sfx('coin');
      await sleep(520);
      if (!game.spendCredits(r.price)) {
        busy = false;
        return;
      }
      refresh();
      say('Traitement du paiement… (ne pas éteindre le modèle)');
      await sleep(420);
      const can = h('span.vm-dropcan', { style: `--can:${r.colour}` }, h('b', null, initials(r.name)));
      chute.append(can);
      audio.sfx('ui_confirm');
      await sleep(520);
      game.addItem(r.item, 1);
      game.save();
      can.remove();
      toast(`${r.name} ajouté au sac.`);
      say(pick(THANKS), 'ok');
      busy = false;
    }

    async function close(): Promise<void> {
      if (closing || busy) return;
      closing = true;
      await win.close();
      resolve();
    }

    function onKey(a: Action): void {
      if (closing) return;
      if (a === 'back' || a === 'menu') void close();
      else if (busy) return;
      else if (isDir(a)) group.move(a);
      else if (a === 'confirm') group.activate();
    }

    refresh();
    say('Bonjour. Insérez des crédits GPU ou une raison de vivre.');
    group.reset();
  });
}
