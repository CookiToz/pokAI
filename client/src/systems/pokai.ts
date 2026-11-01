// PokAI instances: creation, XP, learnsets, evolution, healing, items. Pure.
import { db } from '../data/db';
import type { Form, Item, Stats } from '../data/types';
import type { MoveSlot, PokaiInstance, VibeurClass } from '../state/types';
import { emitGameEvent } from './progression';
import type { Rng } from './rng';
import { computeStats, MAX_IV, MAX_LEVEL, xpForLevel } from './stats';

export type ProgressEvent =
  | { kind: 'levelup'; level: number }
  /** A move was learned (free slot, or after the player chose which move to forget). */
  | { kind: 'learn'; move: string; replaced?: string }
  /** The PokAI knows 4 moves already: the UI must ask which one to forget, then call learnMove(). */
  | { kind: 'learn_offer'; move: string }
  | { kind: 'evolve_ready'; options: string[] };

export const MAX_MOVES = 4;
/** Accelerationist class: evolves this many levels earlier. */
export const ACCELERATIONIST_EVO_BONUS = 5;

let uidCounter = 0;
function makeUid(rng: Rng): string {
  uidCounter = (uidCounter + 1) % 1296;
  return `p${Date.now().toString(36)}${rng.int(0, 0xffffff).toString(36)}${uidCounter.toString(36)}`;
}

function slot(moveId: string): MoveSlot {
  return { move: moveId, tokens: db.move(moveId).tokens };
}

/** Moves known at a level: the last 4 distinct moves of the learnset (by level order). */
export function movesAtLevel(form: Form, level: number): string[] {
  const learned: string[] = [];
  const sorted = [...form.learnset].sort((a, b) => a.level - b.level);
  for (const e of sorted) {
    if (e.level > level) break;
    const i = learned.indexOf(e.move);
    if (i >= 0) learned.splice(i, 1);
    learned.push(e.move);
  }
  return learned.slice(-MAX_MOVES);
}

export function createPokai(formId: string, level: number, rng: Rng): PokaiInstance {
  const form = db.form(formId);
  const lv = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  const ivs: Stats = {
    context: rng.int(0, MAX_IV),
    power: rng.int(0, MAX_IV),
    robustness: rng.int(0, MAX_IV),
    throughput: rng.int(0, MAX_IV),
    precision: rng.int(0, MAX_IV),
  };
  const p: PokaiInstance = {
    uid: makeUid(rng),
    form: formId,
    level: lv,
    xp: xpForLevel(lv),
    context: 0,
    moves: movesAtLevel(form, lv).map(slot),
    ivs,
  };
  p.context = maxContext(p);
  return p;
}

export function pokaiStats(p: PokaiInstance): Stats {
  return computeStats(db.form(p.form), p.level, p.ivs);
}

export function maxContext(p: PokaiInstance): number {
  return pokaiStats(p).context;
}

export function displayName(p: PokaiInstance): string {
  return p.nickname ?? db.form(p.form).name;
}

/**
 * Learning from a learnset: takes a free slot automatically, otherwise returns a
 * `learn_offer` and leaves the moves untouched (the player decides, see learnMove).
 */
function offerMove(p: PokaiInstance, moveId: string): ProgressEvent | null {
  if (p.moves.some((m) => m.move === moveId)) return null;
  if (p.moves.length < MAX_MOVES) {
    p.moves.push(slot(moveId));
    return { kind: 'learn', move: moveId };
  }
  return { kind: 'learn_offer', move: moveId };
}

/**
 * Resolves a move offer. `replaceIndex` is the slot to overwrite (the new move takes its place),
 * or null to refuse (nothing changes, returns null). A free slot is used when there is one.
 */
export function learnMove(p: PokaiInstance, moveId: string, replaceIndex: number | null): ProgressEvent | null {
  if (replaceIndex === null) return null;
  if (p.moves.some((m) => m.move === moveId)) return null;
  if (p.moves.length < MAX_MOVES) {
    p.moves.push(slot(moveId));
    return { kind: 'learn', move: moveId };
  }
  const old = p.moves[replaceIndex];
  if (!old) return null;
  p.moves[replaceIndex] = slot(moveId);
  return { kind: 'learn', move: moveId, replaced: old.move };
}

/** Forms this PokAI may evolve into now (several = branching choice). */
export function pendingEvolution(p: PokaiInstance, vibeurClass?: VibeurClass): string[] {
  const bonus = vibeurClass === 'accelerationist' ? ACCELERATIONIST_EVO_BONUS : 0;
  return db
    .form(p.form)
    .evolutions.filter((e) => p.level >= Math.max(1, e.level - bonus))
    .filter((e) => db.hasForm(e.to) && !db.form(e.to).unobtainable)
    .map((e) => e.to);
}

function onLevelUp(p: PokaiInstance, events: ProgressEvent[]): void {
  const before = maxContext(p);
  p.level++;
  const after = maxContext(p);
  if (p.context > 0) p.context = Math.min(after, p.context + (after - before));
  events.push({ kind: 'levelup', level: p.level });
  for (const e of db.form(p.form).learnset) {
    if (e.level !== p.level) continue;
    const ev = offerMove(p, e.move);
    if (ev) events.push(ev);
  }
}

/** Adds XP; emits level-ups, learned moves and, at the end, evolve_ready if available. */
export function grantXp(p: PokaiInstance, amount: number, vibeurClass?: VibeurClass): ProgressEvent[] {
  const events: ProgressEvent[] = [];
  if (p.level >= MAX_LEVEL) return events;
  p.xp = Math.min(xpForLevel(MAX_LEVEL), p.xp + Math.max(0, Math.floor(amount)));
  let leveled = false;
  while (p.level < MAX_LEVEL && p.xp >= xpForLevel(p.level + 1)) {
    onLevelUp(p, events);
    leveled = true;
  }
  if (leveled) {
    const options = pendingEvolution(p, vibeurClass);
    if (options.length > 0) events.push({ kind: 'evolve_ready', options });
  }
  return events;
}

/** Sets level directly (H100): grants exactly the XP needed. */
export function grantLevels(p: PokaiInstance, levels: number, vibeurClass?: VibeurClass): ProgressEvent[] {
  const target = Math.min(MAX_LEVEL, p.level + levels);
  return grantXp(p, xpForLevel(target) - p.xp, vibeurClass);
}

/**
 * Evolves in place: keeps level, XP and HP ratio; offers the new stage's moves
 * (those of the new learnset up to the current level that the old form did not have):
 * free slots are filled, extra ones come back as `learn_offer` events.
 */
export function evolve(p: PokaiInstance, toFormId: string): ProgressEvent[] {
  const from = db.form(p.form);
  const to = db.form(toFormId);
  const ratio = maxContext(p) > 0 ? p.context / maxContext(p) : 1;
  p.form = to.id;
  emitGameEvent({ kind: 'evolve', from: from.id, to: to.id });
  p.context = p.context > 0 ? Math.max(1, Math.round(maxContext(p) * ratio)) : 0;
  const oldMoves = new Set(from.learnset.map((e) => e.move));
  const events: ProgressEvent[] = [];
  const fresh = [...to.learnset]
    .sort((a, b) => a.level - b.level)
    .filter((e) => e.level <= p.level && !oldMoves.has(e.move));
  for (const e of fresh) {
    const ev = offerMove(p, e.move);
    if (ev) events.push(ev);
  }
  return events;
}

export function healPokai(p: PokaiInstance): void {
  p.context = maxContext(p);
  delete p.status;
  for (const m of p.moves) m.tokens = db.move(m.move).tokens;
}

export function isFainted(p: PokaiInstance): boolean {
  return p.context <= 0;
}

/** Whether an item would do something on this PokAI (bag/battle menus should check first). */
export function canUseItem(itemId: string, p: PokaiInstance): boolean {
  const item = db.item(itemId);
  switch (item.kind) {
    case 'heal':
      return p.context > 0 && p.context < maxContext(p);
    case 'status_heal': {
      if (p.context <= 0) return false;
      const cures = item.cures;
      const curesStatus = p.status !== undefined && (cures === 'all' || (cures ?? []).includes(p.status));
      return curesStatus || (item.heal !== undefined && p.context < maxContext(p));
    }
    case 'boost':
      return p.level < MAX_LEVEL;
    default:
      return false;
  }
}

/** Applies a heal / status / boost item. Returns false (and does nothing) if useless. */
export function applyItem(
  itemId: string,
  p: PokaiInstance,
  vibeurClass?: VibeurClass,
): { ok: boolean; healed: number; events: ProgressEvent[] } {
  const item: Item = db.item(itemId);
  if (!canUseItem(itemId, p)) return { ok: false, healed: 0, events: [] };
  let healed = 0;
  let events: ProgressEvent[] = [];
  if (item.heal !== undefined) {
    const max = maxContext(p);
    const before = p.context;
    p.context = Math.min(max, p.context + Math.ceil(max * item.heal));
    healed = p.context - before;
  }
  if (item.cures !== undefined && p.status !== undefined) {
    if (item.cures === 'all' || item.cures.includes(p.status)) delete p.status;
  }
  if (item.levels) events = grantLevels(p, item.levels, vibeurClass);
  else if (item.xp) events = grantXp(p, item.xp, vibeurClass);
  return { ok: true, healed, events };
}
