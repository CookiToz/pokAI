// Inline SVG glyphs for achievements (flat, 2px ink strokes, no emoji). Keys match `icon` in shared/data/achievements.json.
const BODY: Record<string, string> = {
  terminal: '<rect x="3" y="4" width="18" height="16"/><path d="M7 9l3 3-3 3M12 16h5"/>',
  cookie: '<circle cx="12" cy="12" r="9"/><path d="M9 9h.01M14 8h.01M8 14h.01M15 14h.01M12 17h.01" stroke-width="3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12h.01" stroke-width="4"/>',
  unlock: '<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 017-2"/>',
  spiral: '<path d="M12 12h.01M12 8a4 4 0 11-4 4M12 4a8 8 0 11-8 8" />',
  branch: '<path d="M7 4v16M7 12h6a4 4 0 004-4V4"/><rect x="5" y="3" width="4" height="4" fill="currentColor"/><rect x="15" y="3" width="4" height="4" fill="currentColor"/><rect x="5" y="17" width="4" height="4" fill="currentColor"/>',
  card: '<rect x="3" y="6" width="18" height="13"/><path d="M3 10h18M7 15h4"/>',
  stack: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/>',
  hub: '<circle cx="12" cy="12" r="9"/><path d="M8 10h.01M16 10h.01M7.5 14c2 3 7 3 9 0" stroke-width="2.4"/>',
  layers: '<rect x="4" y="4" width="10" height="10"/><rect x="10" y="10" width="10" height="10" fill="currentColor" fill-opacity=".25"/>',
  wrench: '<path d="M14 5a4 4 0 005 5l-9 9a2.500 2.500 0 01-4-4z"/><path d="M7.500 16.500h.01" stroke-width="3"/>',
  refresh: '<path d="M20 8a8 8 0 00-14-2M4 4v4h4M4 16a8 8 0 0014 2M20 20v-4h-4"/>',
  shield: '<path d="M12 3l8 4v6c0 4-3.500 6.500-8 8-4.500-1.500-8-4-8-8V7z"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M7 16l4-5 3 3 5-8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  badge: '<path d="M12 3l8 4v6c0 4-3.500 6.500-8 8-4.500-1.500-8-4-8-8V7z"/><path d="M9 12l2 2 4-4"/>',
  podium: '<path d="M3 20h18M4 20v-6h5v6M9 20V8h6v12M15 20v-9h5v9"/>',
  server: '<rect x="3" y="4" width="18" height="6"/><rect x="3" y="14" width="18" height="6"/><path d="M7 7h.01M7 17h.01" stroke-width="3"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3c0 6 10 6 10 9s-10 3-10 9"/>',
  bug: '<rect x="8" y="8" width="8" height="12"/><path d="M12 8V5M8 12H4M16 12h4M8 17l-4 2M16 17l4 2M9 5l3 3 3-3"/>',
  plane: '<path d="M3 13l18-8-6 15-3-6z"/><path d="M12 14l9-9"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6z" fill="currentColor"/>',
  stamp: '<path d="M8 4h8v7l3 3v2H5v-2l3-3z"/><path d="M4 21h16"/>',
  leaf: '<path d="M5 19C5 9 11 5 20 4c0 9-4 15-13 15zM5 19l8-8"/>',
  boot: '<path d="M7 3h6v8l6 3v5H5V3"/><path d="M5 15h8"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.500 9h-4a1.500 1.500 0 000 3h3a1.500 1.500 0 010 3h-4M12 7v2M12 15v2"/>',
  unicorn: '<path d="M4 20l4-8 3 2 5-4-1 5 4 5z"/><path d="M13 3l2 5"/>',
  star: '<path d="M12 3l3 6 6 1-4.500 4.500L17.500 21 12 18l-5.500 3 1-6.500L3 10l6-1z"/>',
  lock: '<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 018 0v4"/>',
};

export function achievementIcon(key: string): string {
  const body = BODY[key] ?? BODY['star'];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square" aria-hidden="true">${body}</svg>`;
}
