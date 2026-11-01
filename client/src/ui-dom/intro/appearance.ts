// Shared helpers for the player's look: labels, presets, randomiser, undo history, and the portrait resolver that dialogue/menus should use.
import type { PlayerAppearance } from '../../state/types';
import { portraitSvg } from '../../art/svg';
import { game } from '../../state/store';
import {
  BAGS, BROWS, DEFAULT_APPEARANCE, EYES, FACIALS, GLASSES, HAIR_COLORS, HAIR_STYLES, HEADWEARS, LOWERS, MOUTHS, OUTFITS, OUTFIT_COLORS, PATTERNS,
  SHOE_COLORS, SKIN_TONES, normalizeAppearance, playerPortraitSvg,
} from '../../world/art/characters';

export const SKIN_NAMES = ['Porcelaine', 'Sable', 'Miel', 'Caramel', 'Noisette', 'Cacao', 'Ébène', 'Nuit'];
export const HAIR_NAMES = ['Noir', 'Brun', 'Châtain', 'Blond', 'Roux', 'Rose', 'Bleu', 'Argent'];
export const OUTFIT_NAMES = ['Orange', 'Rose', 'Jaune', 'Sarcelle', 'Bleu', 'Rouge', 'Violet', 'Encre', 'Écru', 'Forêt'];
export const SHOE_NAMES = ['Blanc', 'Encre', 'Rouge', 'Orange', 'Jaune', 'Sarcelle', 'Bleu', 'Rose'];

/** Hair styles are open to both bodies (the body choice is only a morphology). Kept for older callers. */
export const stylesFor = (_body?: 'masc' | 'fem'): typeof HAIR_STYLES => HAIR_STYLES;

const pick = <T,>(xs: readonly T[], rnd: () => number): T => xs[Math.floor(rnd() * xs.length)]!;

export function randomAppearance(rnd: () => number = Math.random): PlayerAppearance {
  const body = rnd() < 0.5 ? 'masc' : 'fem';
  const top = pick(OUTFIT_COLORS, rnd);
  const outfit = pick(OUTFITS, rnd).id;
  return normalizeAppearance({
    body,
    skin: pick(SKIN_TONES, rnd),
    hairStyle: pick(HAIR_STYLES, rnd).id,
    hairColor: pick(HAIR_COLORS, rnd),
    top,
    bottom: pick(OUTFIT_COLORS.filter((c) => c !== top), rnd),
    accessory: 'none',
    eyes: pick(EYES, rnd).id,
    brows: pick(BROWS, rnd).id,
    mouth: pick(MOUTHS, rnd).id,
    facial: rnd() < 0.3 ? pick(FACIALS, rnd).id : 'none',
    glasses: rnd() < 0.45 ? pick(GLASSES, rnd).id : 'none',
    headwear: rnd() < 0.55 ? pick(HEADWEARS, rnd).id : 'none',
    outfit,
    lower: pick(LOWERS, rnd).id,
    pattern: rnd() < 0.5 ? 'plain' : pick(PATTERNS, rnd).id,
    shoes: pick(SHOE_COLORS, rnd),
    bag: pick(BAGS, rnd).id,
  });
}

export interface Preset { id: string; label: string; blurb: string; look: PlayerAppearance }
const O = OUTFIT_COLORS;
const S = SKIN_TONES;
const H = HAIR_COLORS;
const preset = (id: string, label: string, blurb: string, look: Partial<PlayerAppearance>): Preset => ({ id, label, blurb, look: normalizeAppearance(look) });
/** Six curated looks. Only palette colours, so each one can be tweaked swatch by swatch afterwards. */
export const PRESETS: Preset[] = [
  preset('vibe_coder', 'Vibe coder', 'Casque, sweat à logo, zéro sommeil.', {
    body: 'masc', skin: S[1], hairStyle: 'messy', hairColor: H[1], top: O[0], bottom: O[7], eyes: 'lids', brows: 'none', mouth: 'smirk', facial: 'stubble',
    glasses: 'round', headwear: 'headphones', outfit: 'hoodie', lower: 'pants', pattern: 'logo', shoes: SHOE_COLORS[0], bag: 'backpack',
  }),
  preset('researcher', 'Researcher', 'Blouse, carré, tote « open weights ».', {
    body: 'fem', skin: S[3], hairStyle: 'bob', hairColor: H[0], top: O[3], bottom: O[7], eyes: 'dot', brows: 'raised', mouth: 'smile', facial: 'none',
    glasses: 'square', headwear: 'none', outfit: 'labcoat', lower: 'pants', pattern: 'plain', shoes: SHOE_COLORS[1], bag: 'tote',
  }),
  preset('hackeuse', 'Hackeuse', 'Capuche, visière, besace : on ne la voit pas.', {
    body: 'fem', skin: S[2], hairStyle: 'pony', hairColor: H[5], top: O[7], bottom: O[6], eyes: 'big', brows: 'angry', mouth: 'smirk', facial: 'none',
    glasses: 'visor', headwear: 'hood', outfit: 'hoodie', lower: 'pants', pattern: 'split', shoes: SHOE_COLORS[7], bag: 'messenger',
  }),
  preset('prof', 'Prof', 'Surchemise, barbe, une copie à corriger.', {
    body: 'masc', skin: S[0], hairStyle: 'side', hairColor: H[7], top: O[6], bottom: O[7], eyes: 'dot', brows: 'flat', mouth: 'smile', facial: 'beard',
    glasses: 'round', headwear: 'none', outfit: 'overshirt', lower: 'pants', pattern: 'plain', shoes: SHOE_COLORS[1], bag: 'messenger',
  }),
  preset('startupper', 'Startupper', 'Bomber jaune, solaires, levée de fonds imminente.', {
    body: 'masc', skin: S[2], hairStyle: 'quiff', hairColor: H[3], top: O[2], bottom: O[4], eyes: 'dot', brows: 'raised', mouth: 'grin', facial: 'none',
    glasses: 'sunglasses', headwear: 'none', outfit: 'bomber', lower: 'pants', pattern: 'stripes', shoes: SHOE_COLORS[0], bag: 'none',
  }),
  preset('resistance', 'Résistance', 'Salopette, bandana, contre la Conformité.', {
    body: 'fem', skin: S[5], hairStyle: 'afro', hairColor: H[0], top: O[5], bottom: O[4], eyes: 'dot', brows: 'angry', mouth: 'grin', facial: 'none',
    glasses: 'none', headwear: 'bandana', outfit: 'overalls', lower: 'pants', pattern: 'plain', shoes: SHOE_COLORS[1], bag: 'backpack',
  }),
];

/** Linear undo/redo over appearance snapshots (the creator keeps the name out of it). */
export class LookHistory {
  private past: PlayerAppearance[] = [];
  private future: PlayerAppearance[] = [];
  constructor(private readonly limit = 80) {}
  /** Record `prev` as the state to go back to; drops the redo branch. */
  push(prev: PlayerAppearance): void {
    this.past.push(prev);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }
  get canUndo(): boolean { return this.past.length > 0; }
  get canRedo(): boolean { return this.future.length > 0; }
  undo(cur: PlayerAppearance): PlayerAppearance | undefined {
    const p = this.past.pop();
    if (p) this.future.push(cur);
    return p;
  }
  redo(cur: PlayerAppearance): PlayerAppearance | undefined {
    const f = this.future.pop();
    if (f) this.past.push(cur);
    return f;
  }
}

/** The look stored in the current save (or the default one). */
export const currentAppearance = (): PlayerAppearance => normalizeAppearance(game.state?.appearance ?? DEFAULT_APPEARANCE);

/**
 * Portrait lookup for dialogue/menus: the customised bust when the speaker is the player, the static art otherwise.
 * Drop-in replacement for `portraitSvg(id)` in ui-dom/shell/dialogue.ts and ui-dom/battle/duel.ts.
 */
export function portraitOrPlayer(id: string | undefined): string | undefined {
  if (!id) return undefined;
  if (id === 'player') return playerPortraitSvg(currentAppearance());
  return portraitSvg(id);
}
