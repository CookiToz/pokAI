// Arena-themed duel backdrops: flat bands, SVG tiles and slow transform-only drifts. No gradients, no blur.
import './backdrop.css';
import { h } from '../dom';
import type { Trainer } from '../../data/types';

export type ArenaTheme = 'cables' | 'forest' | 'city' | 'trainer' | 'aiact' | 'code' | 'openweights' | 'arc';

export const THEME_LABEL: Record<ArenaTheme, string> = {
  cables: 'câbles',
  forest: 'forêt open-source',
  city: 'ville',
  trainer: 'dresseur',
  aiact: 'AIACT',
  code: 'Benchmark HumanEval',
  openweights: 'Benchmark Open-Weights',
  arc: 'Benchmark ARC-AGI',
};

/** Picks the backdrop from the fight context: trainer (leader_* / badge / aiact) and the current map id. */
export function arenaTheme(trainer: Trainer | undefined, mapId: string): ArenaTheme {
  const map = mapId.toLowerCase();
  if (trainer?.aiact || /aiact/.test(map)) return 'aiact';
  const key = `${trainer?.id ?? ''} ${trainer?.badge ?? ''}`.toLowerCase();
  if (trainer && (trainer.id.startsWith('leader_') || trainer.badge)) {
    if (/arc/.test(map) || /arc/.test(key)) return 'arc';
    if (/open|weight|forest/.test(map) || /open|weight/.test(key)) return 'openweights';
    return 'code';
  }
  if (trainer) return 'trainer';
  if (/forest|foret|open/.test(map)) return 'forest';
  if (/city|hub|port|store|bistro|merch/.test(map)) return 'city';
  return 'cables';
}

const svg = (w: number, h_: number, body: string): string =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h_}" viewBox="0 0 ${w} ${h_}" shape-rendering="crispEdges">${body}</svg>`)}")`;

const INK = '#1d1a2b';

const TILES = {
  grass: svg(48, 28, `<path d="M2 28 L8 8 L14 28 Z M16 28 L24 2 L32 28 Z M34 28 L40 12 L46 28 Z" fill="#00a095"/><path d="M8 28 L12 16 L16 28 Z M28 28 L32 14 L36 28 Z" fill="${INK}" opacity=".35"/>`),
  cable: svg(160, 28, `<rect y="11" width="160" height="6" fill="${INK}" opacity=".5"/><rect x="60" y="4" width="22" height="20" fill="#ff48b0" stroke="${INK}" stroke-width="3"/><rect x="82" y="9" width="12" height="10" fill="${INK}"/><rect x="132" y="8" width="8" height="12" fill="#ffd23f" stroke="${INK}" stroke-width="2"/>`),
  trees: svg(120, 150, `<path d="M30 150 V120 M90 150 V124" stroke="${INK}" stroke-width="8" opacity=".6"/><path d="M30 20 L58 100 H2 Z M30 60 L62 128 H-2 Z" fill="#00a095" opacity=".75"/><path d="M90 40 L116 112 H64 Z M90 74 L120 134 H60 Z" fill="#2fbf71" opacity=".8"/>`),
  lock: svg(150, 150, `<path d="M52 66 V46 A22 22 0 0 1 96 40" fill="none" stroke="${INK}" stroke-width="8"/><rect x="40" y="64" width="50" height="40" fill="#ffd23f" stroke="${INK}" stroke-width="4"/><rect x="62" y="78" width="6" height="14" fill="${INK}"/>`),
  city1: svg(320, 150, `<g fill="#d3caa9"><rect x="0" y="70" width="46" height="80"/><rect x="56" y="30" width="40" height="120"/><rect x="104" y="80" width="54" height="70"/><rect x="170" y="46" width="34" height="104"/><rect x="214" y="90" width="50" height="60"/><rect x="274" y="56" width="46" height="94"/></g>`),
  city2: svg(320, 150, `<g fill="#1d1a2b" opacity=".16"><rect x="14" y="100" width="40" height="50"/><rect x="70" y="64" width="46" height="86"/><rect x="130" y="108" width="40" height="42"/><rect x="190" y="72" width="44" height="78"/><rect x="250" y="98" width="52" height="52"/></g>`),
  windows: svg(320, 150, `<g fill="#ffd23f"><rect x="64" y="46" width="8" height="8"/><rect x="80" y="62" width="8" height="8"/><rect x="64" y="78" width="8" height="8"/><rect x="178" y="62" width="8" height="8"/><rect x="190" y="90" width="8" height="8"/><rect x="284" y="72" width="8" height="8"/><rect x="298" y="100" width="8" height="8"/><rect x="12" y="92" width="8" height="8"/><rect x="226" y="108" width="8" height="8"/><rect x="118" y="100" width="8" height="8"/></g>`),
  stripes: svg(120, 120, `<polygon points="0,40 40,0 80,0 0,80" fill="#ff48b0" opacity=".16"/><polygon points="40,120 120,40 120,80 80,120" fill="#0078bf" opacity=".16"/>`),
  stamps: svg(300, 240, `<g font-family="monospace" font-weight="700" fill="none" stroke-width="4"><g transform="rotate(-12 70 50)" stroke="#e0283c" opacity=".5"><rect x="10" y="26" width="130" height="38"/><text x="22" y="53" font-size="20" fill="#e0283c" stroke="none">CONFORME</text></g><g transform="rotate(8 220 140)" stroke="${INK}" opacity=".35"><circle cx="220" cy="140" r="38"/><circle cx="220" cy="140" r="30" stroke-width="2"/><text x="190" y="146" font-size="16" fill="${INK}" stroke="none">AIACT</text></g><g transform="rotate(-5 80 190)" stroke="#e0283c" opacity=".4"><rect x="20" y="170" width="120" height="34"/><text x="30" y="194" font-size="18" fill="#e0283c" stroke="none">REJETÉ</text></g></g><g stroke="${INK}" opacity=".18" stroke-width="2"><path d="M160 20 H290 M160 36 H270 M160 52 H290 M170 214 H290"/></g>`),
  grid: svg(40, 40, `<path d="M0 0 H40 M0 0 V40" stroke="${INK}" stroke-width="2" opacity=".12"/>`),
};

const ARC_COLOURS = ['#0078bf', '#e0283c', '#2fbf71', '#ffd23f', '#ff48b0', '#ff6c2f', '#00a095', '#8c93a3'];

function layer(cls: string, tile: string, tw: number, th: number, style: Partial<CSSStyleDeclaration> = {}): HTMLElement {
  const el = h('div', { class: `bg-l ${cls}` });
  el.style.backgroundImage = tile;
  el.style.backgroundSize = `${tw}px ${th}px`;
  el.style.setProperty('--tw', `${tw}px`);
  el.style.setProperty('--th', `${th}px`);
  Object.assign(el.style, style);
  return el;
}

function rain(): HTMLElement {
  const wrap = h('div.bg-rain');
  const chars = ['0', '1', '{', '}', ';', '=>', '()', '</>', 'if', '[]'];
  for (let i = 0; i < 24; i++) {
    const col = h('div.bg-col');
    col.style.left = `${(i / 24) * 100 + 0.8}%`;
    col.style.setProperty('--dur', `${9 + (i * 7) % 9}s`);
    col.style.setProperty('--off', `${-((i * 3.7) % 9)}s`);
    let html = '';
    for (let k = 0; k < 40; k++) {
      const r = (i * 31 + k * 17) % 23;
      if (r === 0) html += '<i class="ok">✓</i>';
      else if (r === 1) html += '<i class="ko">✗</i>';
      else html += `<i>${chars[(i + k * 3) % chars.length]}</i>`;
    }
    col.innerHTML = html;
    wrap.append(col);
  }
  return wrap;
}

function arcGrid(): HTMLElement {
  const wrap = h('div.bg-arc');
  const cols = 22;
  const rows = 12;
  const objs: [number, number, number, number][] = [[2, 2, 4, 3], [9, 1, 3, 4], [14, 6, 5, 3], [4, 7, 3, 3], [18, 1, 3, 2]];
  objs.forEach(([x, y, w, hh], oi) => {
    const o = h('div.bg-obj');
    o.style.left = `${(x / cols) * 100}%`;
    o.style.top = `${(y / rows) * 100}%`;
    o.style.width = `${(w / cols) * 100}%`;
    o.style.height = `${(hh / rows) * 100}%`;
    o.style.setProperty('--step', `${(100 / w).toFixed(2)}%`);
    o.style.animationDelay = `${-oi * 1.1}s`;
    o.style.gridTemplateColumns = `repeat(${w}, 1fr)`;
    for (let k = 0; k < w * hh; k++) {
      const c = h('i');
      c.style.background = ARC_COLOURS[(oi * 3 + ((k * 7) % 5 === 0 ? 1 : 0) + (k % 3 === 0 ? 2 : 0)) % ARC_COLOURS.length] ?? '#0078bf';
      o.append(c);
    }
    wrap.append(o);
  });
  return wrap;
}

export class Backdrop {
  readonly el = h('div.bt-bg');
  theme: ArenaTheme | null = null;

  constructor(private host: HTMLElement) {
    host.prepend(this.el);
  }

  set(theme: ArenaTheme): void {
    if (this.theme === theme) return;
    this.theme = theme;
    this.host.dataset.arena = theme;
    this.el.replaceChildren(...this.build(theme));
  }

  private build(theme: ArenaTheme): HTMLElement[] {
    const ground = (cls = ''): HTMLElement => h('div', { class: `bg-ground ${cls}` });
    switch (theme) {
      case 'cables':
        return [ground(), layer('bg-drift bg-ground-top', TILES.grass, 48, 28, { animationDuration: '18s' }), layer('bg-drift bg-cable bg-cable-a', TILES.cable, 160, 28, { animationDuration: '14s' }), layer('bg-drift bg-cable bg-cable-b', TILES.cable, 160, 28, { animationDuration: '22s', animationDirection: 'reverse' })];
      case 'forest':
        return [ground('is-forest'), layer('bg-drift bg-trees', TILES.trees, 120, 150, { animationDuration: '80s' })];
      case 'openweights':
        return [ground('is-forest'), layer('bg-drift bg-trees', TILES.trees, 120, 150, { animationDuration: '80s' }), layer('bg-rise bg-locks', TILES.lock, 150, 150, { animationDuration: '30s' })];
      case 'city': {
        const sun = h('div.bg-sun');
        return [sun, layer('bg-drift bg-sky2', TILES.city2, 320, 150, { animationDuration: '120s' }), layer('bg-drift bg-sky1', TILES.city1, 320, 150, { animationDuration: '70s' }), layer('bg-drift bg-windows', TILES.windows, 320, 150, { animationDuration: '70s' }), ground('is-street')];
      }
      case 'trainer':
        return [layer('bg-diag', TILES.stripes, 120, 120, { animationDuration: '16s' }), ground('is-court'), h('div.bg-circle')];
      case 'aiact':
        return [layer('bg-paper', TILES.stamps, 300, 240, { animationDuration: '50s' }), h('div.bg-hole')];
      case 'code':
        return [rain()];
      case 'arc':
        return [layer('bg-grid', TILES.grid, 40, 40), arcGrid()];
    }
  }
}
