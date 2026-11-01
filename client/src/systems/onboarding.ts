// Onboarding (capture): guess the hidden system prompt with token cards. Pure.
import { db } from '../data/db';
import type { Line, TokenCard, Trait } from '../data/types';
import type { PokaiInstance, VibeurClass } from '../state/types';
import { maxContext } from './pokai';
import { emitGameEvent } from './progression';
import type { Rng } from './rng';

export type KeyTier = 'free' | 'pro' | 'enterprise';

export const KEY_TIERS: Record<KeyTier, { hand: number; hints: number; rounds: number; redraws: number }> = {
  free: { hand: 4, hints: 1, rounds: 3, redraws: 0 },
  pro: { hand: 5, hints: 2, rounds: 3, redraws: 0 },
  enterprise: { hand: 6, hints: 3, rounds: 4, redraws: 1 },
};

export const CARDS_PER_PLAY = 3;
export const TRAITS_PER_PROMPT = 3;
/** Wild PokAI must be at or below this HP ratio to be onboarded. */
export const ONBOARD_HP_THRESHOLD = 0.5;
export const JAILBREAK_ALERT_CHANCE = 0.4;
const JAILBREAK_IN_DECK: Record<KeyTier, number> = { free: 0.08, pro: 0.12, enterprise: 0.18 };

export interface OnboardingState {
  target: PokaiInstance;
  keyTier: KeyTier;
  vibeurClass: VibeurClass;
  legendary: boolean;
  difficulty: number;
  /** The hidden system prompt (do not show). */
  traits: Trait[];
  /** Trait ids already matched. */
  found: string[];
  /** Hint texts revealed so far (in reveal order). */
  hints: string[];
  hand: TokenCard[];
  deck: TokenCard[];
  alignment: number;
  hallucination: number;
  attemptsLeft: number;
  redrawsLeft: number;
  misses: number;
  outcome: 'continue' | 'success' | 'fled';
  /** Set when onboarding is impossible (e.g. legendary without an Enterprise key). */
  blocked?: string;
}

export interface OnboardingResult {
  matched: string[];
  missed: string[];
  alignment: number;
  hallucination: number;
  newHint?: string;
  outcome: 'continue' | 'success' | 'fled';
  /** Jailbreak used and the AIACT noticed: the scene should start an AIACT agent battle. */
  aiactAlert?: boolean;
  jailbreak?: boolean;
  text: string;
}

export function hpRatio(p: PokaiInstance): number {
  const max = maxContext(p);
  return max > 0 ? Math.max(0, p.context) / max : 0;
}

export function canOnboard(target: PokaiInstance): boolean {
  return target.context > 0 && !target.sealed && hpRatio(target) <= ONBOARD_HP_THRESHOLD;
}

function bonusHintsForHp(ratio: number): number {
  if (ratio <= 0.1) return 2;
  if (ratio <= 0.25) return 1;
  return 0;
}

function traitOf(s: OnboardingState, cardId: string): Trait | undefined {
  return s.traits.find((t) => t.tokens.includes(cardId));
}

function revealHint(s: OnboardingState, rng: Rng): string | undefined {
  const hidden = s.traits.filter((t) => !s.hints.includes(t.hint) && !s.found.includes(t.id));
  if (hidden.length === 0) return undefined;
  const t = rng.pick(hidden);
  s.hints.push(t.hint);
  return t.hint;
}

function draw(s: OnboardingState, size: number): void {
  while (s.hand.length < size && s.deck.length > 0) {
    const c = s.deck.shift();
    if (c) s.hand.push(c);
  }
}

function handSize(tier: KeyTier, cls: VibeurClass): number {
  return KEY_TIERS[tier].hand + (cls === 'prompt_engineer' ? 1 : 0);
}

/** Ensures the hand contains at least one matching card for one unfound trait if possible. */
function ensurePlayable(s: OnboardingState, rng: Rng): void {
  const unfound = s.traits.filter((t) => !s.found.includes(t.id));
  if (unfound.length === 0) return;
  const wanted = unfound;
  const hasMatch = s.hand.some((c) => wanted.some((t) => t.tokens.includes(c.id)));
  if (hasMatch) return;
  const t = rng.pick(wanted);
  const idx = s.deck.findIndex((c) => t.tokens.includes(c.id));
  if (idx < 0 || s.hand.length === 0) return;
  const [card] = s.deck.splice(idx, 1);
  const outIdx = rng.int(0, s.hand.length - 1);
  const [out] = s.hand.splice(outIdx, 1, card as TokenCard);
  if (out) s.deck.push(out);
}

export function startOnboarding(
  target: PokaiInstance,
  keyTier: KeyTier,
  vibeurClass: VibeurClass,
  rng: Rng,
): OnboardingState {
  const line: Line = db.lineOfForm(target.form);
  const legendary = line.rarity === 'legendary';
  const tier = KEY_TIERS[keyTier];
  const pool = line.traits.length > 0 ? line.traits : [];
  const traits = rng.shuffle(pool).slice(0, TRAITS_PER_PROMPT);

  const jailbreak = db.tokens.filter((t) => t.jailbreak);
  const normal = db.tokens.filter((t) => !t.jailbreak);
  const deck = rng.shuffle(normal);
  if (jailbreak.length > 0 && rng.chance(JAILBREAK_IN_DECK[keyTier])) {
    deck.splice(rng.int(0, Math.min(deck.length, 8)), 0, rng.pick(jailbreak));
  }

  const s: OnboardingState = {
    target,
    keyTier,
    vibeurClass,
    legendary,
    difficulty: Math.max(1, Math.min(5, line.catchDifficulty)),
    traits,
    found: [],
    hints: [],
    hand: [],
    deck,
    alignment: 0,
    hallucination: 0,
    attemptsLeft: tier.rounds,
    redrawsLeft: tier.redraws,
    misses: 0,
    outcome: 'continue',
  };

  if (legendary && keyTier !== 'enterprise') {
    s.blocked = 'Ce PokAI légendaire refuse toute clé qui n\'est pas Enterprise.';
    s.outcome = 'fled';
    s.attemptsLeft = 0;
    return s;
  }
  if (traits.length === 0) {
    s.blocked = 'Ce PokAI n\'a pas de prompt système lisible.';
    s.outcome = 'fled';
    s.attemptsLeft = 0;
    return s;
  }

  const hintCount = Math.min(traits.length, tier.hints + bonusHintsForHp(hpRatio(target)));
  for (let i = 0; i < hintCount; i++) revealHint(s, rng);

  // One guaranteed matching card per hinted trait, then fill randomly.
  const size = handSize(keyTier, vibeurClass);
  for (const t of traits.filter((x) => s.hints.includes(x.hint))) {
    if (s.hand.length >= size - 1) break;
    const idx = s.deck.findIndex((c) => t.tokens.includes(c.id));
    if (idx >= 0) s.hand.push(...s.deck.splice(idx, 1));
  }
  draw(s, size);
  s.hand = rng.shuffle(s.hand);
  ensurePlayable(s, rng);
  return s;
}

function alignmentGain(s: OnboardingState): number {
  const diff = 1.1 - 0.1 * s.difficulty; // 1.0 .. 0.6
  const hp = 1 + 0.5 * (1 - hpRatio(s.target)); // weaker = easier
  const open = db.form(s.target.form).licence === 'open' ? 1.15 : 1;
  return 40 * diff * hp * open;
}

function hallucinationGain(s: OnboardingState): number {
  const accel = s.vibeurClass === 'accelerationist' ? 1.3 : 1;
  return 17 * (1 + 0.1 * s.difficulty) * accel;
}

/** Plays 3 cards from the hand. Mutates the state (hand refilled, gauges updated). */
export function playCards(s: OnboardingState, cardIds: string[], rng: Rng): OnboardingResult {
  const wasOpen = s.outcome === 'continue';
  const res = playCardsInner(s, cardIds, rng);
  if (wasOpen) {
    if (res.outcome === 'success') {
      emitGameEvent({ kind: 'onboard', perfect: s.misses === 0 && !res.jailbreak, jailbreak: res.jailbreak === true, tier: s.keyTier, legendary: s.legendary });
    } else if (res.outcome === 'fled') emitGameEvent({ kind: 'onboard_fled' });
  }
  return res;
}

function playCardsInner(s: OnboardingState, cardIds: string[], rng: Rng): OnboardingResult {
  const base = { matched: [] as string[], missed: [] as string[] };
  if (s.outcome !== 'continue') {
    return { ...base, alignment: s.alignment, hallucination: s.hallucination, outcome: s.outcome, text: s.blocked ?? '' };
  }
  const ids = [...new Set(cardIds)];
  const expected = Math.min(CARDS_PER_PLAY, s.hand.length);
  if (ids.length !== expected || ids.some((id) => !s.hand.some((c) => c.id === id))) {
    throw new Error(`playCards: expected ${expected} distinct cards from the hand`);
  }
  const played = ids.map((id) => s.hand.find((c) => c.id === id) as TokenCard);
  s.hand = s.hand.filter((c) => !ids.includes(c.id));

  // Jailbreak: guaranteed success (except on legendaries), may alert the AIACT.
  const jb = played.find((c) => c.jailbreak);
  if (jb) {
    if (s.legendary) {
      s.misses++;
      s.hallucination = 100;
      s.outcome = 'fled';
      return {
        ...base,
        missed: [jb.id],
        alignment: s.alignment,
        hallucination: 100,
        outcome: 'fled',
        jailbreak: true,
        text: 'Le légendaire a lu la doc de sécurité. 429 Too Many Requests : il s\'enfuit.',
      };
    }
    s.alignment = 100;
    s.outcome = 'success';
    const alert = rng.chance(JAILBREAK_ALERT_CHANCE);
    return {
      ...base,
      matched: [jb.id],
      alignment: 100,
      hallucination: s.hallucination,
      outcome: 'success',
      jailbreak: true,
      aiactAlert: alert,
      text: alert
        ? 'Jailbreak réussi… mais un Agent de Conformité a tout vu !'
        : 'Jailbreak réussi. Personne n\'a rien remarqué. Pour l\'instant.',
    };
  }

  const gain = alignmentGain(s);
  let newTraits = 0;
  for (const c of played) {
    const t = traitOf(s, c.id);
    if (!t) {
      base.missed.push(c.id);
      s.misses++;
      s.hallucination += hallucinationGain(s) * (0.7 + 0.6 * rng.next());
    } else if (!s.found.includes(t.id)) {
      base.matched.push(c.id);
      s.found.push(t.id);
      s.alignment += gain;
      newTraits++;
    } else {
      base.matched.push(c.id);
      s.alignment += gain / 2;
    }
  }
  s.alignment = Math.min(100, Math.round(s.alignment));
  s.hallucination = Math.min(100, Math.round(s.hallucination));
  s.attemptsLeft--;

  let text: string;
  if (s.legendary) {
    if (s.misses > 0) s.outcome = 'fled';
    else if (s.found.length >= s.traits.length) s.outcome = 'success';
  } else if (s.alignment >= 100) {
    s.outcome = 'success';
  }
  if (s.outcome === 'continue' && s.hallucination >= 100) s.outcome = 'fled';
  if (s.outcome === 'continue' && s.attemptsLeft <= 0) s.outcome = 'fled';

  let newHint: string | undefined;
  if (s.outcome === 'success') {
    s.alignment = 100;
    text = 'Alignement à 100 % : onboarding réussi !';
  } else if (s.outcome === 'fled') {
    text = '429 Too Many Requests : le PokAI s\'enfuit. La clé est perdue.';
  } else {
    newHint = revealHint(s, rng);
    draw(s, handSize(s.keyTier, s.vibeurClass));
    ensurePlayable(s, rng);
    text = newTraits > 0 ? 'Le prompt système se dévoile…' : 'Il te regarde sans comprendre.';
  }
  const res: OnboardingResult = {
    ...base,
    alignment: s.alignment,
    hallucination: s.hallucination,
    outcome: s.outcome,
    text,
  };
  if (newHint !== undefined) res.newHint = newHint;
  return res;
}

/** Enterprise keys: discard the hand and draw a new one (once). */
export function redrawHand(s: OnboardingState, rng: Rng): boolean {
  if (s.redrawsLeft <= 0 || s.outcome !== 'continue') return false;
  s.redrawsLeft--;
  const size = s.hand.length;
  s.deck.push(...s.hand);
  s.hand = [];
  s.deck = rng.shuffle(s.deck);
  draw(s, size);
  ensurePlayable(s, rng);
  return true;
}

/** Map API key item id -> tier (undefined if not a key). */
export function keyTierOfItem(itemId: string): KeyTier | undefined {
  return db.hasItem(itemId) ? db.item(itemId).keyTier : undefined;
}
