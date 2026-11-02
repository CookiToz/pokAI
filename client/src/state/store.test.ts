import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { game, SAVE_BACKUP_KEY, SAVE_KEY } from './store';

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string): string | null { return this.m.get(k) ?? null; }
  setItem(k: string, v: string): void { this.m.set(k, v); }
  removeItem(k: string): void { this.m.delete(k); }
}

describe('save persistence', () => {
  beforeEach(() => { (globalThis as { localStorage?: unknown }).localStorage = new MemStorage(); });
  afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage; });

  it('keeps the previous save as a backup and recovers from a corrupted save', () => {
    game.newGame('Ada', 'vibe_coder');
    game.state.credits = 111;
    game.save();
    game.state.credits = 222;
    game.save();
    localStorage.setItem(SAVE_KEY, '{corrupted');
    expect(game.hasSave()).toBe(true);
    expect(game.load()).toBe(true);
    expect(game.state.credits).toBe(111);
    expect(localStorage.getItem(SAVE_BACKUP_KEY)).not.toBeNull();
  });

  it('fills fields missing from an older save with defaults', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, playerName: 'Old', party: [] }));
    expect(game.load()).toBe(true);
    expect(game.state.playerName).toBe('Old');
    expect(Array.isArray(game.state.badges)).toBe(true);
    expect(typeof game.state.map).toBe('string');
  });
});
