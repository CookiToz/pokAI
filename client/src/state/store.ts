// Single access point to the save game. localStorage-backed, offline-first. Pure (no Phaser).
import type { PokaiInstance, SaveData, VibeurClass } from './types';
import { healPokai } from '../systems/pokai';
import { emitGameEvent } from '../systems/progression';
import { randomSeed } from '../systems/rng';

export const SAVE_KEY = 'pokai.save.v1';
export const PLAYER_ID_KEY = 'pokai.playerId';
export const MAX_PARTY = 6;
export const START_MAP = 'aiact_center';
export const START_POS = { x: 3, y: 2 };
export const START_CREDITS = 500;
export const START_BAG: Record<string, number> = { cafe: 3 };

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function blankSave(name = 'Vibeur', vibeurClass: VibeurClass = 'prompt_engineer'): SaveData {
  return {
    version: 1,
    playerName: name,
    vibeurClass,
    map: START_MAP,
    x: START_POS.x,
    y: START_POS.y,
    facing: 'down',
    party: [],
    repo: [],
    bag: { ...START_BAG },
    credits: START_CREDITS,
    flags: {},
    badges: [],
    seen: [],
    caught: [],
    playTimeSec: 0,
    rngSeed: randomSeed(),
  };
}

function isSave(x: unknown): x is SaveData {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return o.version === 1 && typeof o.playerName === 'string' && Array.isArray(o.party);
}

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `v-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

class GameStore {
  state: SaveData = blankSave();
  private cachedPlayerId: string | null = null;

  /** Stable anonymous id, generated once and kept in localStorage. */
  get playerId(): string {
    if (this.cachedPlayerId) return this.cachedPlayerId;
    const s = storage();
    let id: string | null = null;
    try {
      id = s?.getItem(PLAYER_ID_KEY) ?? null;
    } catch {
      id = null;
    }
    if (!id) {
      id = generateId();
      try {
        s?.setItem(PLAYER_ID_KEY, id);
      } catch {
        /* storage unavailable */
      }
    }
    this.cachedPlayerId = id;
    return id;
  }

  newGame(name: string, vibeurClass: VibeurClass): void {
    this.state = blankSave(name.trim() || 'Vibeur', vibeurClass);
  }

  save(): boolean {
    try {
      const s = storage();
      if (!s) return false;
      s.setItem(SAVE_KEY, JSON.stringify(this.state));
      return true;
    } catch {
      return false;
    }
  }

  load(): boolean {
    try {
      const raw = storage()?.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed: unknown = JSON.parse(raw);
      if (!isSave(parsed)) return false;
      this.state = { ...blankSave(), ...parsed };
      return true;
    } catch {
      return false;
    }
  }

  /** Replaces the state (e.g. save pulled from the server). */
  import(data: SaveData): boolean {
    if (!isSave(data)) return false;
    this.state = { ...blankSave(), ...data };
    return true;
  }

  hasSave(): boolean {
    try {
      return !!storage()?.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }

  deleteSave(): void {
    try {
      storage()?.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  }

  flag(name: string): boolean {
    return this.state.flags[name] === true;
  }

  setFlag(name: string, v = true): void {
    this.state.flags[name] = v;
  }

  itemCount(id: string): number {
    return this.state.bag[id] ?? 0;
  }

  addItem(id: string, n = 1): void {
    this.state.bag[id] = (this.state.bag[id] ?? 0) + n;
  }

  removeItem(id: string, n = 1): boolean {
    const have = this.state.bag[id] ?? 0;
    if (have < n) return false;
    if (have === n) delete this.state.bag[id];
    else this.state.bag[id] = have - n;
    return true;
  }

  addCredits(n: number): void {
    this.state.credits = Math.max(0, Math.floor(this.state.credits + n));
    if (n > 0) emitGameEvent({ kind: 'credits', total: this.state.credits });
  }

  /** Returns false if not enough credits. */
  spendCredits(n: number): boolean {
    if (this.state.credits < n) return false;
    this.state.credits -= n;
    return true;
  }

  addPokai(p: PokaiInstance): 'party' | 'repo' {
    this.markCaught(p.form);
    if (this.state.party.length < MAX_PARTY) {
      this.state.party.push(p);
      return 'party';
    }
    this.state.repo.push(p);
    return 'repo';
  }

  findPokai(uid: string): PokaiInstance | undefined {
    return this.state.party.find((p) => p.uid === uid) ?? this.state.repo.find((p) => p.uid === uid);
  }

  markSeen(formId: string): void {
    if (!this.state.seen.includes(formId)) this.state.seen.push(formId);
  }

  markCaught(formId: string): void {
    this.markSeen(formId);
    if (!this.state.caught.includes(formId)) {
      const before = this.state.caught.length;
      this.state.caught.push(formId);
      emitGameEvent({ kind: 'dex', form: formId, before, after: before + 1 });
    }
  }

  addBadge(id: string): void {
    if (!this.state.badges.includes(id)) {
      this.state.badges.push(id);
      emitGameEvent({ kind: 'badge', id, count: this.state.badges.length });
    }
  }

  healParty(): void {
    for (const p of this.state.party) healPokai(p);
  }

  /** A fresh seed for a battle / onboarding, advancing the saved seed. */
  nextSeed(): number {
    const s = (Math.imul(this.state.rngSeed ^ 0x9e3779b9, 0x85ebca6b) + 0x632be5ab) >>> 0;
    this.state.rngSeed = s;
    return s;
  }

  addPlayTime(sec: number): void {
    this.state.playTimeSec += Math.max(0, sec);
  }
}

export const game = new GameStore();
export type { GameStore };
