// Wild encounters on cable tiles. Pure.
import type { EncounterEntry, MapDef } from '../data/types';
import type { Rng } from './rng';

export const DEFAULT_ENCOUNTER_RATE = 0.1;

export interface WildEncounter {
  form: string;
  level: number;
  group?: number;
}

/** Night: 20:00 to 05:59 local time. */
export function isNightAt(date: Date = new Date()): boolean {
  const h = date.getHours();
  return h >= 20 || h < 6;
}

export function eligibleEncounters(map: MapDef, isNight: boolean): EncounterEntry[] {
  return (map.encounters ?? []).filter((e) => e.weight > 0 && (!e.night || isNight));
}

/** Weighted pick without the per-step rate check. */
export function pickEncounter(map: MapDef, isNight: boolean, rng: Rng): WildEncounter | null {
  const pool = eligibleEncounters(map, isNight);
  const total = pool.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return null;
  let roll = rng.next() * total;
  for (const e of pool) {
    roll -= e.weight;
    if (roll < 0) {
      const lo = Math.min(e.minLevel, e.maxLevel);
      const hi = Math.max(e.minLevel, e.maxLevel);
      const res: WildEncounter = { form: e.form, level: rng.int(lo, hi) };
      if (e.group !== undefined) res.group = e.group;
      return res;
    }
  }
  return null;
}

/** Called once per step on a cable tile. */
export function rollEncounter(map: MapDef, isNight: boolean, rng: Rng): { form: string; level: number } | null {
  if (!map.encounters || map.encounters.length === 0) return null;
  const rate = map.encounterRate ?? DEFAULT_ENCOUNTER_RATE;
  if (!rng.chance(rate)) return null;
  return pickEncounter(map, isNight, rng);
}
