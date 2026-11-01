// Inline SVG icon set for LatentOS (flat, 2px ink strokes, no emoji). Colours inherit via currentColor.
const wrap = (body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  logo: wrap('<rect x="3" y="3" width="18" height="18" fill="var(--pink)" stroke="none" transform="translate(2 2)"/><rect x="3" y="3" width="18" height="18" fill="var(--paper)"/><path d="M8 7v10h8" stroke-width="3"/>'),
  team: wrap('<rect x="3" y="5" width="8" height="8"/><rect x="13" y="11" width="8" height="8"/><path d="M7 17v2M17 5v2"/>'),
  bag: wrap('<path d="M4 8h16v12H4z"/><path d="M9 8V5h6v3M4 13h16"/>'),
  hub: wrap('<circle cx="12" cy="12" r="9"/><path d="M8 10h.01M16 10h.01M7.5 14c2 3 7 3 9 0" stroke-width="2.4"/>'),
  badge: wrap('<path d="M12 3l8 4v6c0 4-3.5 6.5-8 8-4.5-1.500-8-4-8-8V7z"/><path d="M9 12l2 2 4-4"/>'),
  settings: wrap('<path d="M4 7h16M4 12h16M4 17h16"/><rect x="14" y="5" width="4" height="4" fill="currentColor"/><rect x="6" y="10" width="4" height="4" fill="currentColor"/><rect x="12" y="15" width="4" height="4" fill="currentColor"/>'),
  controls: wrap('<rect x="3" y="7" width="18" height="11"/><path d="M7 10v5M5 12.500h4M15.500 11.500h.01M18 14h.01" stroke-width="2.4"/>'),
  bolt: wrap('<path d="M13 2L5 14h6l-1 8 8-12h-6z" fill="currentColor"/>'),
  store: wrap('<path d="M3 9l2-5h14l2 5z"/><path d="M5 9v11h14V9M10 20v-6h4v6"/>'),
  chat: wrap('<path d="M4 5h16v11H11l-4 4v-4H4z"/><path d="M8 9h8M8 12h5"/>'),
  close: wrap('<path d="M6 6l12 12M18 6L6 18"/>'),
  user: wrap('<rect x="8" y="3" width="8" height="8"/><path d="M4 21v-4h16v4"/>'),
  cloud: wrap('<path d="M7 18h10a4 4 0 000-8 6 6 0 00-11.500 1.500A3.300 3.300 0 007 18z"/>'),
  lock: wrap('<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 018 0v4"/>'),
} as const;
export type IconName = keyof typeof ICONS;

export function icon(name: IconName, cls = ''): HTMLSpanElement {
  const s = document.createElement('span');
  s.className = `ico ${cls}`.trim();
  s.innerHTML = ICONS[name];
  return s;
}
