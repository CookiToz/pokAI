// FR display labels and palette mapping for game enums (UI only).
import type { ItemKind, Licence, Stats, StatusId, TypeId } from '../data/types';
import { C } from './theme';

export const TYPE_LABEL: Record<TypeId, string> = {
  chat: 'Chat',
  code: 'Code',
  reasoning: 'Raisonnement',
  media: 'Média',
  agent: 'Agent',
  chaos: 'Chaos',
  legacy: 'Legacy',
};

export const TYPE_SHORT: Record<TypeId, string> = {
  chat: 'CHAT',
  code: 'CODE',
  reasoning: 'RAIS',
  media: 'MÉDIA',
  agent: 'AGENT',
  chaos: 'CHAOS',
  legacy: 'LEGACY',
};

export const TYPE_COLOR: Record<TypeId, string> = {
  chat: C.sky,
  code: C.leaf,
  reasoning: C.sea,
  media: C.rose,
  agent: C.gold,
  chaos: C.ember,
  legacy: C.steel,
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

export const STATUS_SHORT: Record<StatusId, string> = {
  hallucinating: 'HAL',
  rate_limited: '429',
  censored: 'CEN',
  overheat: 'CHD',
  maintenance: 'MNT',
  deprecated: 'DEP',
  api_outage: '503',
};

export const STATUS_COLOR: Record<StatusId, string> = {
  hallucinating: C.rose,
  rate_limited: C.gold,
  censored: C.steel,
  overheat: C.ember,
  maintenance: C.sea,
  deprecated: C.dusk,
  api_outage: C.ember,
};

export const STAT_LABEL: Record<keyof Stats, string> = {
  context: 'Contexte',
  power: 'Puissance',
  robustness: 'Robustesse',
  throughput: 'Débit',
  precision: 'Précision',
};

export const STAT_ORDER: (keyof Stats)[] = ['context', 'power', 'robustness', 'throughput', 'precision'];

export const LICENCE_LABEL: Record<Licence, string> = {
  open: 'Open-weights',
  proprietary: 'Propriétaire',
};

export const ITEM_KIND_LABEL: Record<ItemKind, string> = {
  api_key: 'Clés API',
  heal: 'Soins',
  status_heal: 'Statuts',
  boost: 'Boosts',
  key_item: 'Objets clés',
};

export const ITEM_KIND_ORDER: ItemKind[] = ['api_key', 'heal', 'status_heal', 'boost', 'key_item'];

export const KEY_TIER_LABEL: Record<'free' | 'pro' | 'enterprise', string> = {
  free: 'Gratuite',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export const CLASS_LABEL: Record<string, string> = {
  prompt_engineer: 'Prompt Engineer',
  vibe_coder: 'Vibe Coder',
  doomer: 'Doomer',
  accelerationist: 'Accélérationniste',
};

/** Message for a type-effectiveness multiplier, or null for neutral. */
export function effectivenessText(mult: number): string | null {
  if (mult === 0) return 'Aucun effet. Requête ignorée.';
  if (mult > 1) return "C'est super efficace !";
  if (mult < 1) return "Ce n'est pas très efficace…";
  return null;
}

/** "badge_cable_1" -> "Badge cable 1" (fallback display name for badge ids). */
export function badgeName(id: string): string {
  const s = id.replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
