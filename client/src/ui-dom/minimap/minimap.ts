// DOM minimap (LatentOS style). The static map is drawn once per map on an offscreen canvas; `update()` only blits it
// and draws dots/arrows/labels on top, so calling it ~5 times a second is cheap.
import { ENCOUNTER_TILES } from '../../data/tiles';
import type { MapDef } from '../../data/types';
import { h, uiRoot } from '../dom';
import { MM, arrowGlyph, headingAngle, layoutFor, shortLabel, tileColour, warpDots, type Layout } from './model';
import { tileNameAt } from '../../world/iso';
import { getObjectiveMarker } from '../objectives/marker';
import './minimap.css';

export interface MinimapNpc {
  x: number;
  y: number;
  /** 'trainer' = undefeated trainer (red), 'npc' = story NPC (yellow) */
  kind: 'trainer' | 'npc';
}

export interface MinimapFrame {
  px: number;
  py: number;
  face: { x: number; y: number };
  npcs: readonly MinimapNpc[];
  gates: readonly { x: number; y: number; open: boolean }[];
  switches: readonly { x: number; y: number; on: boolean }[];
  crates: readonly { x: number; y: number }[];
}

export interface Minimap {
  setMap(map: MapDef): void;
  update(frame: MinimapFrame): void;
  setVisible(on: boolean): void;
  destroy(): void;
}

const SMALL = { w: 210, h: 118 };
const BIG = { w: 520, h: 300 };

export function createMinimap(): Minimap {
  const canvas = h('canvas.minimap-canvas') as HTMLCanvasElement;
  const title = h('span.minimap-title', null, 'Carte');
  const expand = h('button.minimap-btn', { title: 'Agrandir la carte', 'aria-label': 'Agrandir la carte', type: 'button' }, '+');
  const fold = h('button.minimap-btn', { title: 'Replier la carte', 'aria-label': 'Replier la carte', type: 'button' }, '–');
  const root = h('div.minimap', { role: 'img', 'aria-label': 'Minimap' }, h('div.minimap-bar', null, title, expand, fold), h('div.minimap-body', null, canvas));
  uiRoot().append(root);

  let map: MapDef | null = null;
  let big = false;
  let layout: Layout | null = null;
  let base: HTMLCanvasElement | null = null;
  let last: MinimapFrame | null = null;
  let t = 0;

  const build = (): void => {
    if (!map) return;
    const size = big ? BIG : SMALL;
    layout = layoutFor(map, size.w, size.h, big ? 9 : 5);
    base = document.createElement('canvas');
    base.width = layout.width;
    base.height = layout.height;
    const ctx = base.getContext('2d');
    if (!ctx) return;
    const u = layout.u;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const name = tileNameAt(map, x, y);
        const col = tileColour(name);
        if (!col) continue;
        const c = layout.at(x, y);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - u / 2);
        ctx.lineTo(c.x + u, c.y);
        ctx.lineTo(c.x, c.y + u / 2);
        ctx.lineTo(c.x - u, c.y);
        ctx.closePath();
        ctx.fill();
        if (name && ENCOUNTER_TILES.has(name) && u >= 2.5) {
          ctx.fillStyle = 'rgba(29,26,43,0.22)';
          ctx.fillRect(Math.round(c.x) - 1, Math.round(c.y), 1, 1);
        }
      }
    }
    for (const w of warpDots(map)) {
      const c = layout.at(w.x, w.y);
      ctx.fillStyle = MM.pink;
      ctx.fillRect(Math.round(c.x - u / 2), Math.round(c.y - u / 4), Math.max(2, Math.round(u)), Math.max(2, Math.round(u / 2)));
    }
    canvas.width = layout.width;
    canvas.height = layout.height;
    canvas.style.width = `${layout.width}px`;
    canvas.style.height = `${layout.height}px`;
  };

  const label = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, colour: string): void => {
    const w = ctx.measureText(text).width;
    const lx = Math.min(Math.max(2, x - w / 2), canvas.width - w - 2);
    const ly = Math.min(Math.max(9, y), canvas.height - 3);
    ctx.lineWidth = 3;
    ctx.strokeStyle = MM.paper;
    ctx.strokeText(text, lx, ly);
    ctx.fillStyle = colour;
    ctx.fillText(text, lx, ly);
  };

  const draw = (): void => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !map || !layout || !base) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    const u = layout.u;
    const dot = Math.max(2, Math.round(u * 0.9));
    const sq = (x: number, y: number, col: string, hollow = false, size = dot): void => {
      const c = layout!.at(x, y);
      if (hollow) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(c.x - size / 2) + 0.5, Math.round(c.y - size / 2) + 0.5, size, size);
      } else {
        ctx.fillStyle = col;
        ctx.fillRect(Math.round(c.x - size / 2), Math.round(c.y - size / 2), size, size);
      }
    };
    const f = last;
    if (f) {
      for (const g of f.gates) sq(g.x, g.y, g.open ? MM.teal : MM.red, g.open, dot + 1);
      for (const s of f.switches) sq(s.x, s.y, MM.yellow, !s.on, dot);
      for (const c of f.crates) sq(c.x, c.y, MM.orange, false, dot);
    }
    ctx.font = `600 ${big ? 11 : 9}px "IBM Plex Sans", system-ui, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    for (const lm of map.landmarks ?? []) {
      const c = layout.at(lm.x, lm.y);
      sq(lm.x, lm.y, MM.ink, false, dot + 1);
      label(ctx, shortLabel(lm.label), c.x, c.y - dot - 1, MM.ink);
    }
    for (const e of map.exits ?? []) {
      const c = layout.at(e.x, e.y);
      const g = arrowGlyph(e.x - map.width / 2, e.y - map.height / 2);
      ctx.fillStyle = MM.pink;
      ctx.strokeStyle = MM.ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(c.x, c.y, dot, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      label(ctx, `${g} ${shortLabel(e.label)}`, c.x, c.y + dot + 9, MM.ink);
    }
    const mk = getObjectiveMarker();
    if (mk && mk.map === map.id) {
      // Objective star: pulses (stepped) on the target tile, or on the exit that leads toward it.
      const c = layout.at(mk.x, mk.y);
      const r = (big ? 7 : 5.5) + (Math.floor(performance.now() / 380) % 2);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r : r * 0.45;
        ctx.lineTo(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = MM.yellow;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = MM.ink;
      ctx.stroke();
    }
    if (f) {
      for (const n of f.npcs) sq(n.x, n.y, n.kind === 'trainer' ? MM.red : MM.yellow, false, dot);
      const p = layout.at(f.px, f.py);
      const a = headingAngle(f.face);
      const r = Math.max(4, u * 1.4);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(-r * 0.7, r * 0.65);
      ctx.lineTo(-r * 0.35, 0);
      ctx.lineTo(-r * 0.7, -r * 0.65);
      ctx.closePath();
      ctx.fillStyle = MM.pink;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = MM.ink;
      ctx.stroke();
      ctx.restore();
    }
  };

  const setBig = (v: boolean): void => {
    big = v;
    expand.textContent = v ? '×' : '+';
    expand.title = v ? 'Réduire la carte' : 'Agrandir la carte';
    build();
    draw();
  };
  expand.addEventListener('click', (e) => {
    e.stopPropagation();
    root.classList.remove('is-folded');
    setBig(!big);
  });
  const toggleFold = (e: Event): void => {
    e.stopPropagation();
    root.classList.toggle('is-folded');
  };
  fold.addEventListener('click', toggleFold);
  (root.querySelector('.minimap-bar') as HTMLElement).addEventListener('dblclick', toggleFold);

  return {
    setMap(m) {
      map = m;
      title.textContent = `Carte · ${m.name.replace(/\{[^}]*\}/g, '').trim()}`;
      build();
      draw();
    },
    update(frame) {
      last = frame;
      const now = performance.now();
      if (now - t < 190) return;
      t = now;
      draw();
    },
    setVisible(on) {
      root.classList.toggle('is-on', on);
    },
    destroy() {
      root.remove();
    },
  };
}
