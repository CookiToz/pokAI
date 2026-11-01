// Runtime / save-game shapes. Serialised as JSON (localStorage + Go server).
import type { Direction, Stats, StatusId } from '../data/types';

export interface MoveSlot {
  move: string; // Move.id
  tokens: number; // remaining PP
}

export interface PokaiInstance {
  uid: string; // unique per instance
  form: string; // Form.id
  nickname?: string;
  level: number;
  xp: number; // total XP
  context: number; // current HP
  status?: StatusId;
  moves: MoveSlot[]; // max 4
  ivs: Stats; // 0..15 small per-instance variance
  sealed?: boolean;
  caughtAt?: string; // map id
}

export interface PlayerAppearance {
  body: 'masc' | 'fem';
  skin: string; // hex
  hairStyle: string; // id from world/art/characters.ts HAIR_STYLES
  hairColor: string; // hex
  top: string; // hoodie/jacket colour, hex
  bottom: string; // trousers/skirt colour, hex
  accessory: string; // id from ACCESSORIES ('none', 'headphones', 'cap', 'glasses', 'beanie'…)
  // creator-v2 options, all optional: old saves fall back to defaults in normalizeAppearance (ids live in world/art/characters.ts)
  eyes?: string; // EYES
  brows?: string; // BROWS
  mouth?: string; // MOUTHS
  facial?: string; // FACIALS: none | stubble | beard | mustache
  glasses?: string; // GLASSES
  headwear?: string; // HEADWEARS (replaces the legacy `accessory`)
  outfit?: string; // OUTFITS
  lower?: string; // LOWERS: pants | shorts | skirt
  pattern?: string; // PATTERNS
  shoes?: string; // hex, SHOE_COLORS
  bag?: string; // BAGS
}

export type VibeurClass = 'prompt_engineer' | 'vibe_coder' | 'doomer' | 'accelerationist';

export interface SaveData {
  version: 1;
  playerName: string;
  vibeurClass: VibeurClass;
  map: string;
  x: number;
  y: number;
  facing: Direction;
  party: PokaiInstance[]; // max 6
  repo: PokaiInstance[]; // PC storage at the Hub
  bag: Record<string, number>; // Item.id -> count
  credits: number; // GPU credits
  flags: Record<string, boolean>;
  badges: string[];
  seen: string[]; // Form.id
  caught: string[]; // Form.id
  playTimeSec: number;
  rngSeed: number;
  appearance?: PlayerAppearance; // v0.4 character creation (absent = default player look)
  achievements?: string[]; // v0.4 unlocked achievement ids
  stats?: Record<string, number>; // v0.4 persistent progression counters (see systems/progression.ts)
}
