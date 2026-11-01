// French display labels for game enums (UI only).
import type { ItemKind, Licence, Stats, StatusId, TypeId } from '../../data/types';
import type { VibeurClass } from '../../state/types';

export const TYPE_LABEL: Record<TypeId, string> = {
  chat: 'Chat', code: 'Code', reasoning: 'Raisonnement', media: 'Média', agent: 'Agent', chaos: 'Chaos', legacy: 'Legacy',
};
export const TYPE_ORDER: TypeId[] = ['chat', 'code', 'reasoning', 'media', 'agent', 'chaos', 'legacy'];

export const STATUS_LABEL: Record<StatusId, string> = {
  hallucinating: 'Hallucinant', rate_limited: 'Rate-limité', censored: 'Censuré', overheat: 'Surchauffe',
  maintenance: 'En maintenance', deprecated: 'Déprécié', api_outage: "Panne d'API",
};

export const STAT_LABEL: Record<keyof Stats, string> = {
  context: 'Contexte', power: 'Puissance', robustness: 'Robustesse', throughput: 'Débit', precision: 'Précision',
};
export const STAT_ORDER: (keyof Stats)[] = ['context', 'power', 'robustness', 'throughput', 'precision'];

export const LICENCE_LABEL: Record<Licence, string> = { open: 'Open-weights', proprietary: 'Propriétaire' };

export const ITEM_KIND_LABEL: Record<ItemKind, string> = {
  api_key: 'Clés API', heal: 'Soins', status_heal: 'Statuts', boost: 'Boosts', key_item: 'Objets clés',
};
export const ITEM_KIND_ORDER: ItemKind[] = ['api_key', 'heal', 'status_heal', 'boost', 'key_item'];

export const CLASS_LABEL: Record<VibeurClass, string> = {
  prompt_engineer: 'Prompt Engineer', vibe_coder: 'Vibe Coder', doomer: 'Doomer', accelerationist: 'Accélérationniste',
};
export const CLASS_PASSIVE: Record<VibeurClass, string> = {
  prompt_engineer: "Une carte de plus en main pendant l'onboarding.",
  vibe_coder: 'Les techniques Code coûtent 0 jeton, avec 10 % de chances de bug.',
  doomer: 'Tes PokAI ont +20 % de Robustesse, et refusent parfois d\'attaquer.',
  accelerationist: "Évolution 5 niveaux plus tôt, mais l'Hallucination monte plus vite.",
};
export const CLASS_ORDER: VibeurClass[] = ['prompt_engineer', 'vibe_coder', 'doomer', 'accelerationist'];
export const CLASS_TAGLINE: Record<VibeurClass, string> = {
  prompt_engineer: '« Il suffit de bien demander. »',
  vibe_coder: '« Ça compile, donc ça marche. »',
  doomer: '« C\'est la fin, mais en plus solide. »',
  accelerationist: '« Pourquoi attendre la version stable ? »',
};

export const RARITY_LABEL: Record<string, string> = {
  common: 'Commun', uncommon: 'Peu commun', rare: 'Rare', legendary: 'Légendaire',
};

export interface BadgeInfo { id: string; name: string; bench: string; leader: string }
/** Known Benchmarks (story order). Unknown badge ids found in the save are appended at runtime. */
export const BADGES: BadgeInfo[] = [
  { id: 'badge_commit', name: 'Badge Commit', bench: 'Benchmark HumanEval', leader: 'Satya Nadelta' },
  { id: 'badge_vent', name: 'Badge Vent', bench: 'Benchmark Open-Weights', leader: 'Arthur Menschtral' },
  { id: 'badge_raisonnement', name: 'Badge Raisonnement', bench: 'Benchmark ARC-AGI', leader: 'Demis Hassabyte' },
];

export function badgeName(id: string): string {
  const s = id.replace(/^badge_/, 'Badge ').replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h} h ${String(m).padStart(2, '0')}`;
}
export const fmtInt = (n: number): string => Math.floor(n).toLocaleString('fr-FR').replace(/ /g, ' ');
