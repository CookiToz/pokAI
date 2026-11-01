// Small shared helpers for the battle UI: labels, formatting, pacing, token-by-token typing.
import { h } from '../dom';
import type { Licence, Stats, StatusId, TypeId } from '../../data/types';

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const TYPE_LABEL: Record<TypeId, string> = {
  chat: 'Chat',
  code: 'Code',
  reasoning: 'Raisonnement',
  media: 'Média',
  agent: 'Agent',
  chaos: 'Chaos',
  legacy: 'Legacy',
};

export const STATUS_LABEL: Record<StatusId, string> = {
  hallucinating: 'Hallucinant',
  rate_limited: 'Rate-limité',
  censored: 'Censuré',
  overheat: 'Surchauffe',
  maintenance: 'En maintenance',
  deprecated: 'Déprécié',
  api_outage: "Panne d'API",
};

export const LICENCE_LABEL: Record<Licence, string> = { open: 'Open', proprietary: 'Propriétaire' };

export const STAT_LABEL: Record<keyof Stats, string> = {
  context: 'Contexte',
  power: 'Puissance',
  robustness: 'Robustesse',
  throughput: 'Débit',
  precision: 'Précision',
};

export const STAT_ORDER: readonly (keyof Stats)[] = ['context', 'power', 'robustness', 'throughput', 'precision'];

/** Context points are shown as tokens (x100) to make the numbers look like real context windows. */
export const TOKEN_SCALE = 100;

/** 12480 -> "12 480" (narrow no-break space). */
export function fmtInt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function fmtTokens(hp: number): string {
  return fmtInt(hp * TOKEN_SCALE);
}

export function typeChip(t: TypeId): HTMLElement {
  return h('span.bt-chip.is-type', { dataset: { type: t } }, TYPE_LABEL[t]);
}

export function licenceChip(l: Licence): HTMLElement {
  return h(l === 'open' ? 'span.bt-chip.is-open' : 'span.bt-chip.is-prop', null, LICENCE_LABEL[l]);
}

export const BADGE_NAME = (id: string): string => {
  const s = id.replace(/^badge_/, '').replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Lets the player speed up animated sequences by pressing confirm. */
export class Pacer {
  fast = false;
  wait(ms: number): Promise<void> {
    return sleep(this.fast ? Math.min(ms, 30) : ms);
  }
  reset(): void {
    this.fast = false;
  }
}

/** Types `text` into `el` word by word (a "token" stream) with a blinking cursor. */
export async function typeText(el: HTMLElement, text: string, pacer: Pacer, msPerToken = 22): Promise<void> {
  const parts = text.match(/\S+\s*|\s+/g) ?? [];
  const node = document.createTextNode('');
  const cursor = h('span.bt-cursor', null, '▌');
  el.append(node, cursor);
  for (const p of parts) {
    if (pacer.fast) break;
    node.data += p;
    await sleep(msPerToken);
  }
  node.data = text;
  cursor.remove();
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Animates a number with requestAnimationFrame. */
export function tween(from: number, to: number, ms: number, step: (v: number) => void): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0 || from === to) {
      step(to);
      resolve();
      return;
    }
    const t0 = performance.now();
    const tick = (now: number): void => {
      const r = clamp((now - t0) / ms, 0, 1);
      const e = 1 - Math.pow(1 - r, 3);
      step(from + (to - from) * e);
      if (r < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}
