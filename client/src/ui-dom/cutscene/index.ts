// Cutscene chrome: letterbox bars, hidden HUD/hints, cinematic dialogue (CSS), and the big character name card.
import './cutscene.css';
import { audio } from '../../audio/audio';
import { input } from '../../input/input';
import { h, uiRoot } from '../dom';
import { portraitOrPlayer } from '../intro/appearance';
import { setHintsHidden } from '../shell/hints';
import { initials, sleep } from '../shell/widgets';

let bars: HTMLElement[] = [];

function ensureBars(): HTMLElement[] {
  if (bars.length && bars[0]!.isConnected) return bars;
  bars = [h('div.cine-bar.is-top', { 'aria-hidden': 'true' }), h('div.cine-bar.is-bottom', { 'aria-hidden': 'true' })];
  uiRoot().append(...bars);
  return bars;
}

/** Letterbox in/out; hides the HUD and the controls hint while on. */
export function setCutscene(on: boolean): void {
  const b = ensureBars();
  const root = uiRoot();
  // Force a style flush so the slide-in animates from the off-screen state.
  void b[0]!.offsetWidth;
  root.classList.toggle('in-cutscene', on);
  b.forEach((el) => el.classList.toggle('is-on', on));
  setHintsHidden(on);
}

export interface IntroCardData { name: string; title: string; portrait?: string }

const HOLD_MS = 1600;
const ARM_MS = 450;

/** Name card with a misregistered riso slide-in. Resolves after ~1.6 s or on confirm. */
export async function introCard(card: IntroCardData): Promise<void> {
  const svg = portraitOrPlayer(card.portrait);
  const face = h('div.ic-face', null, svg ? undefined : h('span.ic-initials', null, initials(card.name)));
  if (svg) face.innerHTML = svg;
  const name = h('div.ic-name', { 'data-t': card.name }, card.name.toUpperCase());
  const el = h(
    'div.introcard',
    { role: 'status', 'aria-label': `${card.name}, ${card.title}` },
    h('div.ic-band', null,
      h('div.ic-ghost.is-pink'),
      h('div.ic-ghost.is-blue'),
      h('div.ic-main', null,
        face,
        h('div.ic-text', null, h('div.ic-kicker', null, 'Nouvelle rencontre'), name, h('div.ic-title', null, h('span', null, card.title))),
      ),
    ),
  );
  uiRoot().append(el);
  audio.sfx('badge');
  let skip = false;
  let armed = false;
  const pop = input.push('shell:introcard', (a) => {
    if (a === 'confirm' && armed) skip = true;
    return true;
  });
  el.addEventListener('click', () => {
    if (armed) skip = true;
  });
  requestAnimationFrame(() => el.classList.add('is-in'));
  setTimeout(() => (armed = true), ARM_MS);
  const t0 = performance.now();
  while (!skip && performance.now() - t0 < HOLD_MS) await sleep(40);
  el.classList.add('is-out');
  pop();
  await sleep(240);
  el.remove();
}

export function cutsceneActive(): boolean {
  return uiRoot().classList.contains('in-cutscene');
}
