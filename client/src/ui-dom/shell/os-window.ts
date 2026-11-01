// LatentOS window: title bar with three square buttons, hard shadow, own input layer + hints, ≤160 ms transitions.
import { hs } from './widgets';
import { h, uiRoot } from '../dom';
import { audio } from '../../audio/audio';
import { input, type Action } from '../../input/input';
import { icon, type IconName } from './icons';
import { pushHints, type HintHandle, type HintList } from './hints';

let layerRoot: HTMLElement | null = null;
/** Container for every window / scrim above the world and below toasts. */
export function osRoot(): HTMLElement {
  if (!layerRoot || !layerRoot.isConnected) {
    layerRoot = h('div#os');
    uiRoot().append(layerRoot);
  }
  return layerRoot;
}

export interface WinOpts {
  /** Input layer id. */
  id: string;
  title: string;
  icon: IconName;
  cls?: string;
  hints: HintList;
  onKey: (a: Action) => void;
  /** Close button (red square) pressed with the mouse. */
  onRequestClose: () => void;
  /** Dim the world behind the window. */
  scrim?: boolean;
}

export interface Win {
  el: HTMLElement;
  body: HTMLElement;
  hints: HintHandle;
  setTitle(t: string): void;
  setIcon(name: IconName): void;
  close(): Promise<void>;
}

const OUT_MS = 140;

export function openWindow(o: WinOpts): Win {
  const root = osRoot();
  const titleText = h('span.win-title-text', null, o.title);
  const dot = (cls: string, label: string, fn?: () => void): HTMLElement =>
    hs('button.win-btn.' + cls, { type: 'button', tabindex: -1, 'aria-label': label, title: label, onclick: fn ?? (() => undefined) });
  const winIco = h('span.win-ico', null, icon(o.icon));
  const bar = h(
    'div.win-bar',
    null,
    winIco,
    titleText,
    h('span.win-spacer'),
    dot('is-min', 'Réduire'),
    dot('is-max', 'Agrandir'),
    dot('is-close', 'Fermer', o.onRequestClose),
  );
  const body = h('div.win-body');
  const el = h(`div.win`, { role: 'dialog', 'aria-label': o.title }, bar, body);
  if (o.cls) el.classList.add(...o.cls.split(' '));
  const scrim = o.scrim === false ? null : h('div.os-scrim');
  if (scrim) root.append(scrim);
  root.append(el);

  // Draggable title bar (pure decoration of "being a real OS", clamped to the viewport).
  let drag: { sx: number; sy: number; ox: number; oy: number } | null = null;
  let dx = 0;
  let dy = 0;
  bar.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('.win-btn')) return;
    drag = { sx: e.clientX, sy: e.clientY, ox: dx, oy: dy };
    bar.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');
  });
  bar.addEventListener('pointermove', (e) => {
    if (!drag) return;
    dx = drag.ox + e.clientX - drag.sx;
    dy = drag.oy + e.clientY - drag.sy;
    el.style.setProperty('--dx', `${dx}px`);
    el.style.setProperty('--dy', `${dy}px`);
  });
  const endDrag = (): void => {
    drag = null;
    el.classList.remove('is-dragging');
  };
  bar.addEventListener('pointerup', endDrag);
  bar.addEventListener('pointercancel', endDrag);

  audio.sfx('ui_open');
  const popLayer = input.push(o.id, (a) => {
    o.onKey(a);
    return true;
  });
  const hints = pushHints(o.hints);
  requestAnimationFrame(() => {
    el.classList.add('is-open');
    scrim?.classList.add('is-open');
  });

  let closed = false;
  return {
    el,
    body,
    hints,
    setTitle: (t) => {
      titleText.textContent = t;
    },
    setIcon: (n) => winIco.replaceChildren(icon(n)),
    close: async () => {
      if (closed) return;
      closed = true;
      audio.sfx('ui_close');
      popLayer();
      hints.pop();
      el.classList.remove('is-open');
      scrim?.classList.remove('is-open');
      await new Promise((r) => setTimeout(r, OUT_MS));
      el.remove();
      scrim?.remove();
    },
  };
}
