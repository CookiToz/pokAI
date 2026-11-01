// Shared data contracts. Every JSON file in shared/data/ must match these types.
// Owned by the lead: change only with team agreement (other modules depend on it).

export type TypeId = 'chat' | 'code' | 'reasoning' | 'media' | 'agent' | 'chaos' | 'legacy';
export type Licence = 'open' | 'proprietary';
export type StatusId =
  | 'hallucinating'
  | 'rate_limited'
  | 'censored'
  | 'overheat'
  | 'maintenance'
  | 'deprecated'
  | 'api_outage';

export interface Stats {
  context: number; // HP
  power: number; // attack
  robustness: number; // defense
  throughput: number; // speed
  precision: number; // resistance to hallucination
}

// ---------- PokAI ----------

export interface LearnsetEntry {
  level: number;
  move: string; // Move.id
}

export interface Evolution {
  to: string; // Form.id
  level: number; // evolutions are driven by XP/level only
}

export interface Form {
  id: string; // snake_case, e.g. "claude_haiku"
  name: string; // official model name, e.g. "Claude Haiku"
  stage: number; // 1, 2, 3...
  types: [TypeId] | [TypeId, TypeId];
  licence: Licence; // may differ from the line (Grok-1 is open, Grok 3 is not)
  baseStats: Stats;
  learnset: LearnsetEntry[];
  evolutions: Evolution[]; // 2+ entries at the same level = branching (player chooses)
  xpYield: number;
  description: string; // Neurodex flavour text (FR)
  unobtainable?: boolean; // e.g. Llama 4 Behemoth
}

export interface Trait {
  id: string;
  hint: string; // FR clue shown during onboarding
  tokens: string[]; // TokenCard.id that match this trait
}

export interface Line {
  id: string; // e.g. "claude"
  dexNo: number;
  publisher: string; // "Anthropic"
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  mvp: boolean; // playable in the MVP (has sprites)
  catchDifficulty: number; // 1..5, scales alignment gain down
  traits: Trait[]; // pool; 3 are drawn per wild encounter
  forms: Form[];
}

export interface PokaiData {
  lines: Line[];
}

// ---------- Moves ----------

export type MoveCategory = 'damage' | 'status' | 'heal' | 'shield' | 'buff' | 'debuff';

export interface MoveEffect {
  status?: StatusId;
  statusChance?: number; // 0..1
  stat?: keyof Stats;
  stages?: number; // +/- stat stages
  target?: 'self' | 'foe';
  healRatio?: number; // fraction of max context
  selfHitChance?: number; // Hallucination-style backfire
  multiHit?: [number, number];
  chargeTurns?: number; // skip N turns then strike
  priority?: number;
}

export interface Move {
  id: string;
  name: string; // FR display name
  type: TypeId;
  category: MoveCategory;
  power: number; // 0 for non-damage
  accuracy: number; // 0..100
  tokens: number; // PP
  description: string;
  effect?: MoveEffect;
  aiactOnly?: boolean;
}

export interface MovesData {
  moves: Move[];
}

// ---------- Types chart ----------

export interface TypesData {
  types: { id: TypeId; name: string; color: string }[];
  // chart[attacker][defender] = multiplier, missing = 1
  chart: Partial<Record<TypeId, Partial<Record<TypeId, number>>>>;
}

// ---------- Items & tokens ----------

export type ItemKind = 'api_key' | 'heal' | 'status_heal' | 'boost' | 'key_item';

export interface Item {
  id: string;
  name: string;
  kind: ItemKind;
  price: number; // GPU credits, 0 = not for sale
  description: string;
  heal?: number; // fraction of max context (1 = full)
  cures?: StatusId[] | 'all';
  keyTier?: 'free' | 'pro' | 'enterprise';
  levels?: number; // H100: +N levels
  xp?: number; // Dataset: +N XP
}

export interface TokenCard {
  id: string;
  label: string; // FR, e.g. "sois concis"
  jailbreak?: boolean;
}

export interface ItemsData {
  items: Item[];
}

export interface TokensData {
  tokens: TokenCard[];
}

// ---------- Trainers ----------

export interface TrainerPokai {
  form: string;
  level: number;
  sealed?: boolean; // AIACT sealed variant (desaturated + ribbon)
}

export interface Trainer {
  id: string;
  name: string;
  sprite: string; // character id, see art contract
  team: TrainerPokai[];
  reward: number; // GPU credits
  introDialogue?: string; // DialogueScript.id
  defeatDialogue?: string;
  badge?: string; // badge id granted on win
  aiact?: boolean;
}

export interface TrainersData {
  trainers: Trainer[];
}

// ---------- Maps ----------

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface MapNpc {
  id: string;
  sprite: string; // character id
  x: number;
  y: number;
  facing: Direction;
  dialogue: string; // DialogueScript.id
  condition?: FlagCondition; // NPC present only if condition holds
  trainer?: string; // Trainer.id: line-of-sight battle trigger
  sightRange?: number;
  wander?: number; // ambient NPC: wanders randomly within this radius (tiles) around (x, y)
  patrol?: { x: number; y: number }[]; // walks these waypoints in a loop (guards); sight still applies
  ambient?: boolean; // background citizen: no story role, may be spawned/despawned freely
}

export interface MapWarp {
  x: number;
  y: number;
  to: string; // MapDef.id
  toX: number;
  toY: number;
  facing?: Direction;
}

export interface MapTrigger {
  x: number;
  y: number;
  w?: number;
  h?: number;
  script: string; // DialogueScript.id
  condition?: FlagCondition;
  once?: boolean;
}

export interface EncounterEntry {
  form: string;
  minLevel: number;
  maxLevel: number;
  weight: number;
  night?: boolean;
  group?: number; // Qwen swarm: appears N at a time (MVP: just flavour text)
}

export interface MapDef {
  id: string;
  name: string; // FR, shown on enter
  width: number;
  height: number;
  // rows[y][x] = legend char. Ground layer.
  rows: string[];
  legend: Record<string, string>; // char -> TileName (see client/src/data/tiles.ts)
  npcs: MapNpc[];
  warps: MapWarp[];
  triggers: MapTrigger[];
  encounters?: EncounterEntry[]; // used on "cable" tiles
  encounterRate?: number; // 0..1 per step on cable
  music?: string; // TrackName in audio/audio.ts
  kind?: 'city' | 'route' | 'interior' | 'dungeon';
  hub?: { x: number; y: number }; // respawn point after a wipe
  // v0.4 puzzles (all optional)
  gates?: { x: number; y: number; flag: string }[]; // solid 'gate' tile that opens (walkable) while flag is set
  switches?: { x: number; y: number; flag: string }[]; // 'switch_plate': flag set while the player OR a pushable stands on it
  pushables?: { id: string; x: number; y: number }[]; // 'crate_push' objects the player shoves one tile per push
  /** Minimap labels / signposts destinations. */
  landmarks?: { x: number; y: number; label: string }[];
  exits?: { x: number; y: number; to: string; label: string }[]; // for minimap arrows + signposts
}

// ---------- Dialogue / story scripts ----------

export type FlagCondition =
  | { flag: string; is?: boolean }
  | { all: FlagCondition[] }
  | { any: FlagCondition[] }
  | { not: FlagCondition };

export type ScriptStep =
  | { say: string; speaker?: string; portrait?: string }
  | { choice: { label: string; goto: string }[] }
  | { label: string }
  | { goto: string }
  | { if: FlagCondition; goto: string }
  | { set_flag: string; value?: boolean }
  | { give_item: string; count?: number }
  | { give_pokai: string; level: number }
  | { give_credits: number }
  | { take_credits: number | 'all' }
  | { heal_party: true }
  | { start_battle: string } // Trainer.id; script resumes after the battle
  | { open: 'store' | 'starter_choice' | 'neurodex' | 'party' | 'repo' } // repo = Hub PC storage (party <-> repo)
  | { open: 'vending'; items: { item: string; price: number }[] } // working vending machine
  // v0.5 cutscenes with important characters
  | { cutscene: 'start' | 'end' } // letterbox bars + world input locked + hints hidden
  | { npc_approach: string } // NPC walks up to the player (path-finding), faces them
  | { npc_leave: string; to?: { x: number; y: number }; hide?: boolean } // walks away (to a tile or off-screen) then optionally despawns
  | { intro_card: { name: string; title: string; portrait?: string } } // big name card slide-in (« ARTHUR MENSCHTRAL — Leader du Benchmark Open-Weights »)
  | { camera: { x: number; y: number } | 'player'; ms?: number } // pan camera to a tile / back to player
  | { emote: string; who: string } // '!', '?', '♥', '…' bubble over 'player' or an NPC id
  | { warp: string; x: number; y: number }
  | { move_npc: string; path: Direction[] }
  | { end: true };

export interface DialogueScript {
  id: string;
  steps: ScriptStep[];
}

export interface DialoguesData {
  scripts: DialogueScript[];
}
