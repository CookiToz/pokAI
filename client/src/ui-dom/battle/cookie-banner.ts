// AIACT mini-game: "Bannière de cookies". 2 s to find the tiny, hopping "Tout refuser".
import { audio } from '../../audio/audio';
import { h } from '../dom';
import { input, type Action } from '../../input/input';
import { ui } from '../facade';
import { emitGameEvent } from '../../systems/progression';

type Spot = 'left' | 'right' | 'down' | 'up';
const SPOTS: Spot[] = ['left', 'right', 'down', 'up'];
const DURATION = 2000;
const HOP_MS = 480;

/** Resolves true when the player consented (clicked accept or ran out of time). */
export function cookieBanner(host: HTMLElement): Promise<boolean> {
  return new Promise((resolve) => {
    let spot: Spot = 'left';
    let focus: 'accept' | 'refuse' = 'accept';
    let done = false;

    const accept = h('button.bt-btn.is-primary.bt-cookie-accept', { type: 'button', onclick: () => finish(true) }, 'Tout accepter');
    const refuse = h('button.bt-cookie-refuse', { type: 'button', dataset: { spot }, onclick: () => finish(false) }, 'Tout refuser');
    const timer = h('div.bt-cookie-timer', null, h('i'));
    const win = h(
      'div.bt-cookie',
      { onclick: (e: Event) => e.stopPropagation() },
      h('div.bt-sheet-head', null, h('span', null, 'cookies.exe — Consentement'), h('span', null, 'AIACT')),
      h(
        'div.bt-cookie-body',
        null,
        h('h3', null, 'Votre vie privée nous tient à cœur.'),
        h('p', null, 'Ce combat utilise des cookies pour améliorer votre expérience de conformité (et vos amendes).'),
        accept,
        refuse,
      ),
      timer,
    );
    const backdrop = h('div.bt-backdrop', null, win);
    host.append(backdrop);
    const render = (): void => {
      accept.classList.toggle('is-focus', focus === 'accept');
      refuse.classList.toggle('is-focus', focus === 'refuse');
      refuse.dataset.spot = spot;
    };
    render();
    ui.setHints([['left', 'Chercher le petit bouton'], ['confirm', 'Cliquer']]);

    const hop = window.setInterval(() => {
      const next = SPOTS.filter((s) => s !== spot);
      spot = next[Math.floor(Math.random() * next.length)] ?? 'left';
      // the keyboard focus stays on the refuse button only if the player is still tracking it
      render();
    }, HOP_MS);
    const timeout = window.setTimeout(() => finish(true), DURATION);
    const release = input.push('battle:cookie', (a: Action) => {
      if (a === 'confirm') finish(focus === 'accept');
      else if (a === 'left' || a === 'right' || a === 'down' || a === 'up') {
        focus = a === spot ? 'refuse' : 'accept';
        render();
      }
      return true;
    });

    function finish(consent: boolean): void {
      if (done) return;
      done = true;
      clearInterval(hop);
      clearTimeout(timeout);
      release();
      audio.sfx(consent ? 'ui_error' : 'ui_confirm');
      if (!consent) emitGameEvent({ kind: 'cookie_refused' });
      backdrop.remove();
      resolve(consent);
    }
  });
}
