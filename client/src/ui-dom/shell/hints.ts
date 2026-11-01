// Contextual controls helper (bottom-right) + glyph chips for the active device.
import { hs } from './widgets';
import { h, uiRoot } from '../dom';
import { input, type Action, type Device } from '../../input/input';
import { ACTION_LABEL, glyph } from '../../input/glyphs';

export type HintList = [Action, string][];

const DEVICE_NAME: Record<Device, string> = {
  keyboard: 'Clavier', xbox: 'Xbox', playstation: 'PlayStation', switch: 'Switch', gamepad: 'générique',
};
export const deviceName = (d: Device): string => DEVICE_NAME[d];

const PAD_COLOUR: Record<string, string> = {
  A: 'var(--ctx)', B: 'var(--red)', X: 'var(--blue)', Y: 'var(--yellow)',
  '✕': 'var(--blue)', '○': 'var(--red)', '□': 'var(--pink)', '△': 'var(--teal)',
};
const DPAD_ARM: Record<string, string> = {
  '↑': 'M9 2h6v7H9z', '↓': 'M9 15h6v7H9z', '←': 'M2 9h7v6H2z', '→': 'M15 9h7v6h-7z',
};

/** A keycap / pad-button chip drawn in CSS, for a raw glyph string (see input/glyphs.ts). */
export function glyphChip(g: string, device: Device): HTMLElement {
  if (device === 'keyboard') {
    const long = g.length > 1;
    return hs('kbd.chip.chip-key' + (long ? '.chip-wide' : ''), { 'data-g': g }, g);
  }
  if (g.startsWith('✚')) {
    const dir = g.slice(1);
    const el = h('span.chip.chip-dpad', { 'data-g': g });
    el.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/><path d="${DPAD_ARM[dir] ?? ''}" fill="var(--pink)"/></svg>`;
    el.title = `Croix directionnelle ${dir}`;
    return el;
  }
  const colour = PAD_COLOUR[g];
  if (colour) {
    const el = h('span.chip.chip-pad', { 'data-g': g }, g);
    el.style.background = colour;
    el.style.color = g === 'Y' || g === 'A' ? 'var(--ink)' : 'var(--paper)';
    return el;
  }
  return h('span.chip.chip-pill', { 'data-g': g }, g);
}

export const actionChip = (a: Action, device: Device = input.device): HTMLElement => {
  const c = glyphChip(glyph(a, device), device);
  c.dataset.action = a;
  return c;
};

// --- hints strip -------------------------------------------------------------------------

interface Entry { hints: HintList }
let base: HintList = [];
const stack: Entry[] = [];
let strip: HTMLElement | null = null;
let hidden = false;

function render(): void {
  if (!strip) return;
  const list = stack.length > 0 ? stack[stack.length - 1]!.hints : base;
  strip.replaceChildren();
  strip.classList.toggle('is-empty', list.length === 0 || hidden);
  for (const [a, label] of list) {
    strip.append(h('span.hint', null, actionChip(a), h('span.hint-label', null, label)));
  }
  const help = h('span.hint.hint-help', null, actionChip('help'), h('span.hint-label', null, 'Commandes'));
  if (!list.some(([a]) => a === 'help')) strip.append(help);
}

export function setBaseHints(hints: HintList): void {
  base = hints;
  render();
}

export interface HintHandle { set(hints: HintList): void; pop(): void }

/** Window-level hints; popping restores whatever was shown before. */
export function pushHints(hints: HintList): HintHandle {
  const entry: Entry = { hints };
  stack.push(entry);
  render();
  return {
    set: (hs) => { entry.hints = hs; render(); },
    pop: () => {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      render();
    },
  };
}

export function setHintsHidden(v: boolean): void {
  hidden = v;
  render();
}

const announced = new Set<Device>();

export function initHints(toast: (t: string) => void): void {
  strip = h('div.hints.is-empty', { role: 'status', 'aria-label': 'Commandes' });
  uiRoot().append(strip);
  input.onDeviceChange((d) => {
    render();
    if (d !== 'keyboard' && !announced.has(d)) {
      announced.add(d);
      toast(`Manette détectée : ${DEVICE_NAME[d]}`);
    }
  });
  render();
}

export { ACTION_LABEL };
