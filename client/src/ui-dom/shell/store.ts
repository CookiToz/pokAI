// The Store: a fake app-store window. Item cards, quantity stepper, satirical clerk typed in mono.
import { audio } from '../../audio/audio';
import { db } from '../../data/db';
import type { Item } from '../../data/types';
import { game } from '../../state/store';
import type { Action } from '../../input/input';
import { portraitSvg } from '../../art/svg';
import { h } from '../dom';
import { toast } from './chrome';
import { FocusGroup, isDir } from './focus';
import { icon } from './icons';
import { ITEM_KIND_LABEL, fmtInt } from './labels';
import { openWindow } from './os-window';
import { initials, sleep, hs } from './widgets';

const GREETINGS = [
  'Bienvenue au Store. Tout est en abonnement, sauf la sortie.',
  'Nos prix ont été optimisés par un modèle. Il a dit « plus ».',
  'Vous avez un compte ? Non ? Dommage, il en faut un pour acheter.',
];
const AFTER_BUY = [
  'Merci ! Votre satisfaction sera facturée séparément.',
  'Acheté. Les remboursements sont gérés par un chatbot. Bonne chance.',
  'Paiement accepté. Le reçu est dans votre boîte « spam ».',
  'Excellent choix. Il sera obsolète jeudi.',
];
const POOR = ['Fonds insuffisants. Avez-vous essayé de demander plus de GPU ?', 'Solde trop bas. Notre IA vous suggère de travailler.'];
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]!;

export function openStore(): Promise<void> {
  return new Promise<void>((resolve) => {
    const items = db.allItems().filter((i) => i.price > 0).sort((a, b) => a.price - b.price);
    let selected: Item | null = null;
    let qty = 1;
    let mode: 'browse' | 'qty' = 'browse';
    let closing = false;
    let talk = 0;

    const clerkText = h('div.clerk-text');
    const avatarSvg = portraitSvg('store_clerk');
    const clerkAvatar = hs('div.chat-avatar.is-sm' + (avatarSvg ? '.has-art' : ''));
    if (avatarSvg) clerkAvatar.innerHTML = avatarSvg;
    else clerkAvatar.append(h('span.chat-initials', null, initials('Store Bot')));
    const credits = h('span.store-credits');
    const grid = h('div.store-grid', { role: 'list' });
    const cartLabel = h('div.cart-label');
    const qtyVal = h('span.qty-val');
    const total = h('span.cart-total');
    const minus = h('button.qty-btn.fx', { type: 'button', 'aria-label': 'Moins', onclick: () => setQty(qty - 1) }, '−');
    const plus = h('button.qty-btn.fx', { type: 'button', 'aria-label': 'Plus', onclick: () => setQty(qty + 1) }, '+');
    const buy = h('button.btn.fx.btn-buy', { type: 'button', onclick: () => doBuy() }, 'Acheter');
    const cart = h('div.cart', null, cartLabel, h('div.stepper', null, minus, qtyVal, plus), total, buy);

    const win = openWindow({
      id: 'shell:store',
      title: 'Store — LatentOS App Store',
      icon: 'store',
      cls: 'win-store',
      hints: [],
      onKey,
      onRequestClose: () => void close(),
    });
    win.body.append(
      h('div.store-head', null, h('div.clerk', null, clerkAvatar, h('div.clerk-who', null, h('b', null, 'Store Bot'), h('small', null, 'assistant commercial, en ligne')), clerkText), h('div.store-wallet', null, icon('bolt'), credits)),
      grid,
      cart,
    );
    const group = new FocusGroup(grid, '.scard');

    items.forEach((it) => {
      grid.append(
        h('button.scard.fx', { type: 'button', role: 'listitem', 'data-id': it.id, onclick: () => selectItem(it) },
          h('div.scard-top', null, h('span.scard-name', null, it.name), h('span.scard-price', null, icon('bolt'), fmtInt(it.price))),
          h('div.scard-kind', null, ITEM_KIND_LABEL[it.kind]),
          h('p.scard-desc', null, it.description),
          h('div.scard-own', { 'data-own': it.id }),
        ),
      );
    });

    function refresh(): void {
      credits.textContent = fmtInt(game.state.credits);
      grid.querySelectorAll<HTMLElement>('[data-own]').forEach((o) => {
        const n = game.itemCount(o.dataset.own ?? '');
        o.textContent = n > 0 ? `En stock chez toi : ${n}` : '';
      });
      cart.classList.toggle('is-idle', !selected);
      cart.classList.toggle('is-active', mode === 'qty');
      cartLabel.textContent = selected ? selected.name : 'Choisis un article';
      qtyVal.textContent = String(qty);
      total.textContent = selected ? `${fmtInt(selected.price * qty)} GPU` : '— GPU';
      buy.toggleAttribute('data-disabled', !selected);
      buy.classList.toggle('is-poor', !!selected && selected.price * qty > game.state.credits);
      hintsUpdate();
    }

    function hintsUpdate(): void {
      win.hints.set(mode === 'qty' ? [['left', 'Quantité'], ['confirm', 'Acheter'], ['back', 'Annuler']] : [['up', 'Parcourir'], ['confirm', 'Choisir'], ['back', 'Quitter']]);
    }

    async function say(text: string): Promise<void> {
      const my = ++talk;
      clerkText.textContent = '';
      for (const ch of text.split(/(?<=\s)/)) {
        if (my !== talk) return;
        clerkText.textContent += ch;
        await sleep(24);
      }
    }

    function setQty(n: number): void {
      qty = Math.max(1, Math.min(99, n));
      refresh();
    }

    function selectItem(it: Item): void {
      const el = grid.querySelector<HTMLElement>(`[data-id="${it.id}"]`);
      if (el) group.set(el);
      selected = it;
      qty = 1;
      mode = 'qty';
      refresh();
    }

    function doBuy(): void {
      if (!selected) return;
      const cost = selected.price * qty;
      if (!game.spendCredits(cost)) {
        audio.sfx('ui_error');
      void say(pick(POOR));
        win.el.classList.remove('shake');
        void win.el.offsetWidth;
        win.el.classList.add('shake');
        return;
      }
      game.addItem(selected.id, qty);
      audio.sfx('coin');
      toast(`${selected.name} ×${qty} ajouté au sac.`);
      void say(pick(AFTER_BUY));
      mode = 'browse';
      qty = 1;
      refresh();
    }

    async function close(): Promise<void> {
      if (closing) return;
      closing = true;
      await win.close();
      resolve();
    }

    function onKey(a: Action): void {
      if (closing) return;
      if (mode === 'qty') {
        if (a === 'left' || a === 'down') setQty(qty - 1);
        else if (a === 'right' || a === 'up') setQty(qty + 1);
        else if (a === 'confirm') doBuy();
        else if (a === 'back') {
          mode = 'browse';
          refresh();
        }
        return;
      }
      if (a === 'back' || a === 'menu') void close();
      else if (isDir(a)) group.move(a);
      else if (a === 'confirm') group.activate();
    }

    group.reset();
    refresh();
    void say(pick(GREETINGS));
  });
}
