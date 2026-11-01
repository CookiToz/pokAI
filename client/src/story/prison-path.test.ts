import { describe, expect, it } from 'vitest';
import { db } from '../data/db';
import { isWalkable } from './map-validate';

const map = db.map('aiact_center');

function reachable(from: [number, number], to: [number, number], blocked: (x: number, y: number) => boolean): boolean {
  const seen = new Set<string>();
  const q: [number, number][] = [from];
  while (q.length) {
    const [x, y] = q.pop() as [number, number];
    const k = `${x},${y}`;
    if (seen.has(k) || blocked(x, y) || !isWalkable(map, x, y)) continue;
    seen.add(k);
    if (x === to[0] && y === to[1]) return true;
    q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return false;
}

describe('Centre de Conformité: every fight is on the single main path', () => {
  const fights: Record<string, string[]> = {
    guard_1: ['guard_1_ambush'],
    guard_2: ['guard_2_ambush'],
    guard_3: ['guard_3_ambush'],
    guard_4: ['guard_4_ambush'],
    cookie: ['cookie_ambush'],
    rival: ['kevin_ambush_haiku', 'kevin_ambush_phi', 'kevin_ambush_gemma'],
  };

  it('has a way out when nothing is blocked', () => {
    expect(reachable([3, 2], [16, 25], () => false)).toBe(true);
  });

  for (const [name, scripts] of Object.entries(fights)) {
    it(`${name} cannot be bypassed (its trigger tiles cut the map)`, () => {
      const tiles = map.triggers.filter((t) => scripts.includes(t.script));
      expect(tiles.length).toBeGreaterThan(0);
      const inTrigger = (x: number, y: number): boolean => tiles.some((t) => x >= t.x && x < t.x + (t.w ?? 1) && y >= t.y && y < t.y + (t.h ?? 1));
      expect(reachable([3, 2], [16, 25], inTrigger)).toBe(false);
    });
  }

  it('the way to the capsule room has no fight trigger', () => {
    const fightScripts = Object.values(fights).flat();
    const bad = map.triggers.filter((t) => fightScripts.includes(t.script) && t.y <= 8);
    expect(bad).toEqual([]);
  });
});
