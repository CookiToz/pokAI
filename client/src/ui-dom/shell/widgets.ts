// Small reusable DOM bits: context bars, type tags, art holders, buttons.
import type { StatusId, TypeId } from '../../data/types';
import { h } from '../dom';
import { pokaiSvg } from '../../art/svg';
import { STATUS_LABEL, TYPE_LABEL } from './labels';

export function typeTag(t: TypeId): HTMLElement {
  const el = h('span.tag.tag-type', { 'data-type': t }, h('i.tag-sw', { style: `background:var(--type-${t})` }), TYPE_LABEL[t]);
  return el;
}

export function statusTag(s: StatusId): HTMLElement {
  return h('span.tag.tag-status', null, STATUS_LABEL[s]);
}

export function licenceTag(l: 'open' | 'proprietary'): HTMLElement {
  return hs('span.tag.tag-licence' + (l === 'open' ? '.is-open' : '.is-prop'), null, l === 'open' ? 'Open-weights' : 'Propriétaire');
}

/** Context bar: segmented "token" track. ratio 0..1. */
export function ctxBar(ratio: number, label?: string): HTMLElement {
  const r = Math.max(0, Math.min(1, ratio));
  const tone = r > 0.5 ? 'ok' : r > 0.2 ? 'mid' : 'low';
  const fill = h('i.bar-fill');
  fill.style.width = `${Math.round(r * 100)}%`;
  const bar = hs('div.bar.bar-' + tone, { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(r * 100) }, fill);
  if (label) bar.title = label;
  return bar;
}

export function plainBar(ratio: number, colour = 'var(--blue)'): HTMLElement {
  const fill = h('i.bar-fill');
  fill.style.width = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
  fill.style.background = colour;
  return h('div.bar.bar-plain', null, fill);
}

/** Holder for a PokAI svg. `silhouette` blacks it out (seen, not caught). */
export function art(formId: string, size: number, opts: { silhouette?: boolean; faint?: boolean } = {}): HTMLElement {
  const el = h('div.art', { style: `width:${size}px;height:${size}px` });
  el.innerHTML = pokaiSvg(formId);
  if (opts.silhouette) el.classList.add('is-silhouette');
  if (opts.faint) el.classList.add('is-faint');
  return el;
}

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] ?? '' : parts[0]?.[1] ?? '')).toUpperCase();
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

type Kid = Node | string | number | false | null | undefined;
/** `h` for selectors built at runtime (class suffixes): same behaviour, loose selector type. */
export function hs(sel: string, props?: Record<string, unknown> | null, ...children: Kid[]): HTMLElement {
  return h(sel as 'div', props, ...children);
}
