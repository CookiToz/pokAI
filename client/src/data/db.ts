// Index of shared/data. Pure: no Phaser import.
import type {
  DialogueScript,
  DialoguesData,
  Form,
  Item,
  ItemsData,
  Line,
  MapDef,
  Move,
  MovesData,
  PokaiData,
  TokenCard,
  TokensData,
  Trainer,
  TrainersData,
  TypeId,
  TypesData,
} from './types';
import pokaiJson from '@data/pokai.json';
import movesJson from '@data/moves.json';
import typesJson from '@data/types.json';
import itemsJson from '@data/items.json';
import tokensJson from '@data/tokens.json';
import trainersJson from '@data/trainers.json';

const pokaiData = pokaiJson as unknown as PokaiData;
const movesData = movesJson as unknown as MovesData;
const typesData = typesJson as unknown as TypesData;
const itemsData = itemsJson as unknown as ItemsData;
const tokensData = tokensJson as unknown as TokensData;
// trainers.json + any chapter files (trainers-*.json) are merged.
const extraTrainerModules = import.meta.glob<TrainersData>('@data/trainers-*.json', { eager: true, import: 'default' });
const trainersData: TrainersData = {
  trainers: [
    ...(trainersJson as unknown as TrainersData).trainers,
    ...Object.values(extraTrainerModules).flatMap((m) => m.trainers),
  ],
};

const mapModules = import.meta.glob<MapDef>('@data/maps/*.json', { eager: true, import: 'default' });
const dialogueModules = import.meta.glob<DialoguesData>('@data/dialogues/*.json', {
  eager: true,
  import: 'default',
});

function indexBy<T extends { id: string }>(list: readonly T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const x of list) m.set(x.id, x);
  return m;
}

const lines = indexBy(pokaiData.lines);
const forms = new Map<string, Form>();
const lineByForm = new Map<string, Line>();
for (const line of pokaiData.lines) {
  for (const f of line.forms) {
    forms.set(f.id, f);
    lineByForm.set(f.id, line);
  }
}
const moves = indexBy(movesData.moves);
const items = indexBy(itemsData.items);
const tokens = indexBy(tokensData.tokens);
const trainers = indexBy(trainersData.trainers);
const maps = indexBy(Object.values(mapModules));
const scripts = new Map<string, DialogueScript>();
for (const file of Object.values(dialogueModules)) {
  for (const s of file.scripts ?? []) scripts.set(s.id, s);
}

function must<T>(m: Map<string, T>, id: string, what: string): T {
  const v = m.get(id);
  if (v === undefined) throw new Error(`db: unknown ${what} "${id}"`);
  return v;
}

export const db = {
  form: (id: string): Form => must(forms, id, 'form'),
  line: (id: string): Line => must(lines, id, 'line'),
  lineOfForm: (formId: string): Line => must(lineByForm, formId, 'form'),
  move: (id: string): Move => must(moves, id, 'move'),
  item: (id: string): Item => must(items, id, 'item'),
  token: (id: string): TokenCard => must(tokens, id, 'token'),
  trainer: (id: string): Trainer => must(trainers, id, 'trainer'),
  map: (id: string): MapDef => must(maps, id, 'map'),
  script: (id: string): DialogueScript => must(scripts, id, 'script'),

  hasForm: (id: string): boolean => forms.has(id),
  hasMove: (id: string): boolean => moves.has(id),
  hasItem: (id: string): boolean => items.has(id),
  hasTrainer: (id: string): boolean => trainers.has(id),
  hasMap: (id: string): boolean => maps.has(id),
  hasScript: (id: string): boolean => scripts.has(id),

  /** Multiplier of an attacking type against ONE defending type. */
  typeChart: (atk: TypeId, def: TypeId): number => typesData.chart[atk]?.[def] ?? 1,
  /** Product of multipliers against all defending types. */
  effectiveness: (atk: TypeId, defTypes: readonly TypeId[]): number =>
    defTypes.reduce((m, d) => m * (typesData.chart[atk]?.[d] ?? 1), 1),
  typeInfo: (id: TypeId): { id: TypeId; name: string; color: string } =>
    typesData.types.find((t) => t.id === id) ?? { id, name: id, color: '#888888' },

  tokens: tokensData.tokens,
  types: typesData.types,
  lines: pokaiData.lines,
  allForms: (): Form[] => [...forms.values()],
  allMoves: (): Move[] => movesData.moves,
  allItems: (): Item[] => itemsData.items,
  allTrainers: (): Trainer[] => trainersData.trainers,
  allMaps: (): MapDef[] => [...maps.values()],
  allScripts: (): DialogueScript[] => [...scripts.values()],
};

export type Db = typeof db;
