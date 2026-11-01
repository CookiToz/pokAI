// Tiny inline SVG icon set (16x16, currentColor). No emoji, no external assets.
import { h } from '../dom';

const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square"';
const F = 'fill="currentColor"';

const PATHS = {
  // move categories
  damage: `<path ${F} d="M8 1 L10 6 L15 8 L10 10 L8 15 L6 10 L1 8 L6 6Z"/>`,
  status: `<path ${F} d="M8 1 C8 1 3 7 3 10 a5 5 0 0 0 10 0 C13 7 8 1 8 1Z"/>`,
  buff: `<path ${F} d="M8 1 L14 8 H10 V15 H6 V8 H2Z"/>`,
  debuff: `<path ${F} d="M8 15 L2 8 H6 V1 H10 V8 H14Z"/>`,
  heal: `<path ${F} d="M6 1 H10 V6 H15 V10 H10 V15 H6 V10 H1 V6 H6Z"/>`,
  shield: `<path ${F} d="M8 1 L14 3 V8 C14 12 11 14 8 15 C5 14 2 12 2 8 V3Z"/>`,
  // statuses
  hallucinating: `<path ${S} d="M1 8 Q8 1 15 8 Q8 15 1 8Z"/><circle ${F} cx="8" cy="8" r="2"/>`,
  rate_limited: `<path ${F} d="M3 1 H13 V5 L9.5 8 L13 11 V15 H3 V11 L6.5 8 L3 5Z"/>`,
  censored: `<path ${F} d="M1 5 H15 V11 H1Z"/>`,
  overheat: `<path ${F} d="M8 1 C9 4 13 6 13 10 A5 5 0 0 1 3 10 C3 8 4 7 5 6 C5 8 6 8 6 8 C6 5 7 3 8 1Z"/>`,
  maintenance: `<path ${F} d="M11 9 A6 6 0 1 1 6 2 A5 5 0 0 0 11 9Z"/>`,
  deprecated: `<path ${S} d="M3 3 L13 13 M13 3 L3 13"/>`,
  api_outage: `<path ${F} d="M10 1 L3 9 H8 L6 15 L13 6 H8Z"/>`,
  // actions
  onboard: `<circle ${S} cx="5" cy="8" r="3"/><path ${S} d="M8 8 H15 M12 8 V11"/>`,
  team: `<path ${S} d="M2 2 H7 V7 H2Z M9 2 H14 V7 H9Z M2 9 H7 V14 H2Z M9 9 H14 V14 H9Z"/>`,
  bag: `<path ${S} d="M3 6 H13 L12 15 H4Z M6 6 V4 a2 2 0 0 1 4 0 V6"/>`,
  flee: `<path ${S} d="M6 2 H2 V14 H6 M7 8 H14 M11 4 L15 8 L11 12"/>`,
  // misc
  session: `<path ${S} d="M1.5 2.5 H14.5 V13.5 H1.5Z M1.5 5.5 H14.5"/><path ${F} d="M4 8 L6 9.5 L4 11Z"/>`,
  session_ko: `<path ${S} d="M1.5 2.5 H14.5 V13.5 H1.5Z M1.5 5.5 H14.5 M5 7.5 L11 12 M11 7.5 L5 12"/>`,
  up: `<path ${S} d="M3 11 L8 5 L13 11"/>`,
  down: `<path ${S} d="M3 5 L8 11 L13 5"/>`,
  none: `<path ${S} d="M3 3 L13 13 M13 3 L3 13"/>`,
  spark: `<path ${F} d="M8 0 L9.5 6.5 L16 8 L9.5 9.5 L8 16 L6.5 9.5 L0 8 L6.5 6.5Z"/>`,
  lock: `<path ${S} d="M3 7 H13 V14 H3Z M5 7 V5 a3 3 0 0 1 6 0 V7"/>`,
  trophy: `<path ${S} d="M4 2 H12 V7 a4 4 0 0 1 -8 0Z M4 4 H1 V5 a3 3 0 0 0 3 3 M12 4 H15 V5 a3 3 0 0 1 -3 3 M8 11 V14 M5 14 H11"/>`,
} as const;

export type IconName = keyof typeof PATHS;

export function iconSvg(name: IconName): string {
  return `<svg viewBox="0 0 16 16" width="100%" height="100%" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}

export function icon(name: IconName, cls = ''): HTMLElement {
  return h('span', { class: `bt-ico ${cls}`.trim(), html: iconSvg(name) });
}
