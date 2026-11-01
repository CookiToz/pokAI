// Pure validator for world content (maps + dialogue scripts). No Phaser import.
import type { DialogueScript, MapDef, ScriptStep } from '../data/types';
import { ENCOUNTER_TILES, SOLID_TILES, TILE_NAMES, type TileName } from '../data/tiles';

export interface WorldContent {
  maps: MapDef[];
  scripts: DialogueScript[];
  /** Optional cross-checks against systems data (skipped when undefined). */
  trainerIds?: ReadonlySet<string>;
  itemIds?: ReadonlySet<string>;
  formIds?: ReadonlySet<string>;
}

const TILE_SET: ReadonlySet<string> = new Set<string>(TILE_NAMES);

export function isTileName(s: string): s is TileName {
  return TILE_SET.has(s);
}

/** Tile name at (x, y), or null when out of bounds / unknown. */
export function tileAt(map: MapDef, x: number, y: number): TileName | null {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
  const ch = map.rows[y]?.[x];
  if (ch === undefined) return null;
  const name = map.legend[ch];
  return name !== undefined && isTileName(name) ? name : null;
}

export function isWalkable(map: MapDef, x: number, y: number): boolean {
  const t = tileAt(map, x, y);
  return t !== null && !SOLID_TILES.has(t);
}

export function validateMap(map: MapDef, mapIds: ReadonlySet<string>, mapsById: ReadonlyMap<string, MapDef>, scriptIds: ReadonlySet<string>): string[] {
  const errs: string[] = [];
  const at = (what: string): string => `[${map.id}] ${what}`;
  if (map.rows.length !== map.height) errs.push(at(`rows.length ${map.rows.length} != height ${map.height}`));
  map.rows.forEach((row, y) => {
    if ([...row].length !== map.width) errs.push(at(`row ${y} length ${[...row].length} != width ${map.width}`));
    for (const ch of row) {
      if (!(ch in map.legend)) errs.push(at(`row ${y}: char '${ch}' not in legend`));
    }
  });
  for (const [ch, name] of Object.entries(map.legend)) {
    if (!isTileName(name)) errs.push(at(`legend '${ch}' -> '${name}' is not a TileName`));
  }
  const inBounds = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < map.width && y < map.height;
  const warpAt = (m: MapDef, x: number, y: number): boolean => m.warps.some((w) => w.x === x && w.y === y);

  for (const w of map.warps) {
    if (!inBounds(w.x, w.y)) errs.push(at(`warp (${w.x},${w.y}) out of bounds`));
    else if (!isWalkable(map, w.x, w.y)) errs.push(at(`warp (${w.x},${w.y}) on solid tile`));
    if (!mapIds.has(w.to)) {
      errs.push(at(`warp (${w.x},${w.y}) targets unknown map '${w.to}'`));
      continue;
    }
    const target = mapsById.get(w.to);
    if (!target) continue;
    if (!isWalkable(target, w.toX, w.toY)) errs.push(at(`warp (${w.x},${w.y}) -> ${w.to} (${w.toX},${w.toY}) not walkable`));
    if (warpAt(target, w.toX, w.toY)) errs.push(at(`warp (${w.x},${w.y}) -> ${w.to} (${w.toX},${w.toY}) lands on another warp`));
  }
  const seenNpc = new Set<string>();
  for (const n of map.npcs) {
    if (seenNpc.has(n.id)) errs.push(at(`duplicate npc id '${n.id}'`));
    seenNpc.add(n.id);
    if (!isWalkable(map, n.x, n.y)) errs.push(at(`npc '${n.id}' (${n.x},${n.y}) not on a walkable tile`));
    if (warpAt(map, n.x, n.y)) errs.push(at(`npc '${n.id}' stands on a warp`));
    if (!scriptIds.has(n.dialogue)) errs.push(at(`npc '${n.id}' dialogue '${n.dialogue}' missing`));
  }
  for (const t of map.triggers) {
    const w = t.w ?? 1;
    const h = t.h ?? 1;
    if (!inBounds(t.x, t.y) || !inBounds(t.x + w - 1, t.y + h - 1)) errs.push(at(`trigger (${t.x},${t.y}) out of bounds`));
    if (!scriptIds.has(t.script)) errs.push(at(`trigger (${t.x},${t.y}) script '${t.script}' missing`));
  }
  if (map.hub && !isWalkable(map, map.hub.x, map.hub.y)) errs.push(at(`hub point not walkable`));
  const hasCable = map.rows.some((r) => [...r].some((ch) => {
    const n = map.legend[ch];
    return n !== undefined && isTileName(n) && ENCOUNTER_TILES.has(n);
  }));
  if (hasCable && (!map.encounters || map.encounters.length === 0)) errs.push(at(`has cable tiles but no encounters`));
  return errs;
}

function stepRefs(step: ScriptStep): { labels?: string[]; gotos?: string[]; trainer?: string; item?: string; form?: string; map?: string } {
  if ('label' in step) return { labels: [step.label] };
  if ('goto' in step && !('if' in step)) return { gotos: [step.goto] };
  if ('if' in step) return { gotos: [step.goto] };
  if ('choice' in step) return { gotos: step.choice.map((c) => c.goto) };
  if ('start_battle' in step) return { trainer: step.start_battle };
  if ('give_item' in step) return { item: step.give_item };
  if ('give_pokai' in step) return { form: step.give_pokai };
  if ('warp' in step) return { map: step.warp };
  return {};
}

export function validateScripts(content: WorldContent, mapIds: ReadonlySet<string>): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const s of content.scripts) {
    if (seen.has(s.id)) errs.push(`[script ${s.id}] duplicate id`);
    seen.add(s.id);
    const labels = new Set<string>();
    const gotos: string[] = [];
    for (const step of s.steps) {
      const r = stepRefs(step);
      r.labels?.forEach((l) => labels.add(l));
      if (r.gotos) gotos.push(...r.gotos);
      if (r.trainer && content.trainerIds && !content.trainerIds.has(r.trainer)) errs.push(`[script ${s.id}] unknown trainer '${r.trainer}'`);
      if (r.item && content.itemIds && !content.itemIds.has(r.item)) errs.push(`[script ${s.id}] unknown item '${r.item}'`);
      if (r.form && content.formIds && !content.formIds.has(r.form)) errs.push(`[script ${s.id}] unknown form '${r.form}'`);
      if (r.map && !mapIds.has(r.map)) errs.push(`[script ${s.id}] warp to unknown map '${r.map}'`);
    }
    for (const g of gotos) if (!labels.has(g)) errs.push(`[script ${s.id}] goto unknown label '${g}'`);
  }
  return errs;
}

export function validateWorld(content: WorldContent): string[] {
  const mapsById = new Map(content.maps.map((m) => [m.id, m] as const));
  const mapIds = new Set(mapsById.keys());
  const scriptIds = new Set(content.scripts.map((s) => s.id));
  const errs: string[] = [];
  if (mapIds.size !== content.maps.length) errs.push('duplicate map ids');
  for (const m of content.maps) {
    errs.push(...validateMap(m, mapIds, mapsById, scriptIds));
    for (const n of m.npcs) {
      if (n.trainer) {
        if (content.trainerIds && !content.trainerIds.has(n.trainer)) errs.push(`[${m.id}] npc '${n.id}' unknown trainer '${n.trainer}'`);
        for (const suffix of ['_intro', '_defeat']) {
          if (!scriptIds.has(n.trainer + suffix)) errs.push(`[${m.id}] npc '${n.id}' missing script '${n.trainer}${suffix}'`);
        }
      }
    }
    for (const e of m.encounters ?? []) {
      if (content.formIds && !content.formIds.has(e.form)) errs.push(`[${m.id}] encounter unknown form '${e.form}'`);
      if (e.minLevel > e.maxLevel) errs.push(`[${m.id}] encounter '${e.form}' minLevel > maxLevel`);
    }
  }
  errs.push(...validateScripts(content, mapIds));
  return errs;
}
