// Pure helpers for story flags. No Phaser import.
import type { FlagCondition } from '../data/types';

export type FlagReader = (name: string) => boolean;

export function evalCondition(cond: FlagCondition | undefined, flag: FlagReader): boolean {
  if (!cond) return true;
  if ('flag' in cond) return flag(cond.flag) === (cond.is ?? true);
  if ('all' in cond) return cond.all.every((c) => evalCondition(c, flag));
  if ('any' in cond) return cond.any.some((c) => evalCondition(c, flag));
  return !evalCondition(cond.not, flag);
}

/** Flag set when a trainer has been beaten (by the script runner). */
export const trainerDefeatedFlag = (trainerId: string): string => `trainer_${trainerId}_defeated`;

/** Flag set after a `once` trigger script ran to completion. */
export const triggerFlag = (mapId: string, x: number, y: number): string => `trig_${mapId}_${x}_${y}`;

/** Flags whose name starts with this prefix also grant the matching badge (e.g. badge_commit). */
export const BADGE_FLAG_PREFIX = 'badge_';

/** Last Hub visited (respawn point after a wipe) is stored as a single true flag `last_hub:<mapId>`. */
export const LAST_HUB_PREFIX = 'last_hub:';
export const DEFAULT_HUB_MAP = 'aiact_center';

export function lastHubMap(flags: Record<string, boolean>): string {
  for (const [k, v] of Object.entries(flags)) {
    if (v && k.startsWith(LAST_HUB_PREFIX)) return k.slice(LAST_HUB_PREFIX.length);
  }
  return DEFAULT_HUB_MAP;
}

export function setLastHub(flags: Record<string, boolean>, mapId: string): void {
  for (const k of Object.keys(flags)) {
    if (k.startsWith(LAST_HUB_PREFIX)) delete flags[k];
  }
  flags[LAST_HUB_PREFIX + mapId] = true;
}

/** Replace {player} and friends in dialogue text. */
export function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, key: string) => vars[key] ?? m);
}
