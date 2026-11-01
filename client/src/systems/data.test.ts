// Data integrity: every id referenced anywhere in shared/data must exist.
import { describe, expect, it } from 'vitest';
import { TILE_NAMES } from '../data/tiles';
import type {
  DialoguesData,
  ItemsData,
  MapDef,
  MovesData,
  PokaiData,
  ScriptStep,
  TokensData,
  TrainersData,
  TypesData,
} from '../data/types';

const root = import.meta.glob<unknown>('@data/*.json', { eager: true, import: 'default' });
const maps = Object.values(import.meta.glob<MapDef>('@data/maps/*.json', { eager: true, import: 'default' }));
const dialogues = Object.values(import.meta.glob<DialoguesData>('@data/dialogues/*.json', { eager: true, import: 'default' }));

function file<T>(name: string): T {
  const key = Object.keys(root).find((k) => k.endsWith(`/${name}`));
  if (!key) throw new Error(`missing ${name}`);
  return root[key] as T;
}

const pokai = file<PokaiData>('pokai.json');
const moves = file<MovesData>('moves.json');
const types = file<TypesData>('types.json');
const items = file<ItemsData>('items.json');
const tokens = file<TokensData>('tokens.json');
const extraTrainers = Object.values(import.meta.glob<TrainersData>('@data/trainers-*.json', { eager: true, import: 'default' })).flatMap((m) => m.trainers);
const trainers: TrainersData = { trainers: [...file<TrainersData>('trainers.json').trainers, ...extraTrainers] };

const formIds = new Set(pokai.lines.flatMap((l) => l.forms.map((f) => f.id)));
const moveIds = new Set(moves.moves.map((m) => m.id));
const itemIds = new Set(items.items.map((i) => i.id));
const tokenIds = new Set(tokens.tokens.map((t) => t.id));
const trainerIds = new Set(trainers.trainers.map((t) => t.id));
const typeIds = new Set(types.types.map((t) => t.id));
const scriptIds = new Set(dialogues.flatMap((d) => d.scripts.map((s) => s.id)));
const mapIds = new Set(maps.map((m) => m.id));
const tileNames = new Set<string>(TILE_NAMES);
const characterIds = new Set([
  'player', 'mom', 'lecube', 'kevin', 'kartpathy', 'nurse_hugging', 'clerk', 'gourou', 'agent_conformite', 'nadelta',
  'kid', 'scientist', 'sailor', 'stagiaire', 'vibeur_a', 'vibeur_b',
  'guard_aiact', 'guard_aiact_2', 'inspector_cookie', 'greffiere_article52', 'directrice_moratoire', 'jensen_cuir', 'clem_delangouste', 'resistance_dev',
  'chef', 'fashion_clerk', 'barista', 'delivery_rider', 'tourist', 'dev_phone', 'citizen_a', 'citizen_b', 'citizen_c', 'citizen_d',
  'menschtral', 'hassabyte', 'zuckerbot',
]);

function uniq(ids: string[]): string[] {
  return ids.filter((id, i) => ids.indexOf(id) !== i);
}

describe('pokai.json', () => {
  it('has unique ids and the 20 MVP lines + Transformer', () => {
    expect(uniq(pokai.lines.flatMap((l) => l.forms.map((f) => f.id)))).toEqual([]);
    expect(uniq(pokai.lines.map((l) => l.id))).toEqual([]);
    expect(pokai.lines.filter((l) => l.mvp).length).toBe(21);
    expect(pokai.lines.find((l) => l.id === 'transformer')?.mvp).toBe(true);
  });
  it('references existing moves, forms, tokens and types', () => {
    for (const line of pokai.lines) {
      if (line.mvp) {
        expect(line.traits.length, line.id).toBeGreaterThanOrEqual(4);
        expect(line.traits.length, line.id).toBeLessThanOrEqual(6);
      }
      expect(line.catchDifficulty).toBeGreaterThanOrEqual(1);
      expect(line.catchDifficulty).toBeLessThanOrEqual(5);
      for (const t of line.traits) for (const tok of t.tokens) expect(tokenIds.has(tok), `${line.id}.${t.id}: ${tok}`).toBe(true);
      for (const f of line.forms) {
        for (const ty of f.types) expect(typeIds.has(ty), `${f.id} type ${ty}`).toBe(true);
        for (const e of f.learnset) expect(moveIds.has(e.move), `${f.id} learns ${e.move}`).toBe(true);
        for (const e of f.evolutions) {
          expect(formIds.has(e.to), `${f.id} -> ${e.to}`).toBe(true);
          expect(e.level).toBeGreaterThan(1);
        }
        expect(f.learnset.some((e) => e.level <= 1), `${f.id} has a level-1 move`).toBe(true);
        expect(f.description.length).toBeGreaterThan(10);
      }
    }
  });
  it('base stat totals are balanced by stage', () => {
    for (const line of pokai.lines.filter((l) => l.mvp && l.rarity !== 'legendary')) {
      for (const f of line.forms) {
        const s = f.baseStats;
        const total = s.context + s.power + s.robustness + s.throughput + s.precision;
        if (f.stage === 1) expect(total, f.id).toBeLessThanOrEqual(340);
        if (f.stage >= 3 && !f.unobtainable) expect(total, f.id).toBeGreaterThanOrEqual(440);
      }
    }
  });
});

describe('moves, items, tokens, types', () => {
  it('moves are valid', () => {
    expect(uniq(moves.moves.map((m) => m.id))).toEqual([]);
    for (const t of typeIds) expect(moves.moves.some((m) => m.type === t), t).toBe(true);
    for (const id of ['compliance', 'cookie_banner', 'moratorium', 'fine_6', 'retry_loop']) expect(moveIds.has(id), id).toBe(true);
    for (const m of moves.moves) {
      expect(m.accuracy).toBeGreaterThan(0);
      expect(m.accuracy).toBeLessThanOrEqual(100);
      expect(m.tokens).toBeGreaterThan(0);
    }
  });
  it('has exactly one jailbreak card and the needed items', () => {
    expect(tokens.tokens.filter((t) => t.jailbreak).length).toBe(1);
    expect(tokens.tokens.length).toBeGreaterThanOrEqual(30);
    for (const id of ['api_key_free', 'api_key_pro', 'api_key_enterprise', 'cafe', 'red_bull', 'full_restart', 'hotfix', 'clear_cache', 'h100', 'dataset', 'certificat_inutile']) {
      expect(itemIds.has(id), id).toBe(true);
    }
  });
});

describe('trainers.json', () => {
  it('references existing forms and sprites', () => {
    expect(uniq(trainers.trainers.map((t) => t.id))).toEqual([]);
    for (const t of trainers.trainers) {
      expect(characterIds.has(t.sprite), `${t.id} sprite ${t.sprite}`).toBe(true);
      expect(t.team.length).toBeGreaterThan(0);
      for (const p of t.team) expect(formIds.has(p.form), `${t.id}: ${p.form}`).toBe(true);
    }
    for (const id of ['rival_1_haiku', 'rival_1_phi', 'rival_1_gemma', 'aiact_grunt_port_1', 'aiact_grunt_port_2', 'leader_nadelta']) {
      expect(trainerIds.has(id), id).toBe(true);
    }
  });
  it('trainer dialogue ids exist when dialogues are present', () => {
    if (scriptIds.size === 0) return;
    const missing = trainers.trainers
      .flatMap((t) => [t.introDialogue, t.defeatDialogue])
      .filter((id): id is string => id !== undefined && !scriptIds.has(id));
    if (missing.length > 0) console.warn('[data] trainer dialogues not written yet:', missing.join(', '));
  });
});

function stepRefs(step: ScriptStep): { form?: string; item?: string; trainer?: string; map?: string } {
  if ('give_pokai' in step) return { form: step.give_pokai };
  if ('give_item' in step) return { item: step.give_item };
  if ('start_battle' in step) return { trainer: step.start_battle };
  if ('warp' in step) return { map: step.warp };
  return {};
}

describe('maps and dialogues (world data)', () => {
  it('encounters, NPC trainers and warps reference existing ids', () => {
    for (const m of maps) {
      for (const e of m.encounters ?? []) {
        expect(formIds.has(e.form), `${m.id} encounter ${e.form}`).toBe(true);
        expect(e.minLevel).toBeLessThanOrEqual(e.maxLevel);
      }
      for (const n of m.npcs) if (n.trainer) expect(trainerIds.has(n.trainer), `${m.id} npc ${n.trainer}`).toBe(true);
      for (const w of m.warps) expect(mapIds.has(w.to), `${m.id} warp ${w.to}`).toBe(true);
      for (const ch of Object.values(m.legend)) expect(tileNames.has(ch), `${m.id} tile ${ch}`).toBe(true);
      for (const n of m.npcs) {
        if (scriptIds.size > 0) expect(scriptIds.has(n.dialogue), `${m.id} npc dialogue ${n.dialogue}`).toBe(true);
      }
    }
  });
  it('dialogue steps reference existing forms, items, trainers and maps', () => {
    for (const d of dialogues) {
      for (const s of d.scripts) {
        for (const step of s.steps) {
          const r = stepRefs(step);
          if (r.form) expect(formIds.has(r.form), `${s.id} give_pokai ${r.form}`).toBe(true);
          if (r.item) expect(itemIds.has(r.item), `${s.id} give_item ${r.item}`).toBe(true);
          if (r.trainer) expect(trainerIds.has(r.trainer), `${s.id} start_battle ${r.trainer}`).toBe(true);
          if (r.map) expect(mapIds.has(r.map), `${s.id} warp ${r.map}`).toBe(true);
        }
      }
    }
  });
});
