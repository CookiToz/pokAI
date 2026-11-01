import { describe, expect, it } from 'vitest';
import { approachPath, bfsPath, exitPath, npcGoneFlag, type Grid } from './pathfind';

const grid = (rows: string[], blocked: ReadonlySet<string> = new Set()): Grid => ({
  width: rows[0]?.length ?? 0,
  height: rows.length,
  walkable: (x, y) => rows[y]?.[x] === '.' && !blocked.has(`${x},${y}`),
});

describe('pathfind', () => {
  it('walks around walls to the tile next to the target', () => {
    const g = grid(['.....', '.###.', '.....']);
    const p = approachPath(g, { x: 0, y: 0 }, { x: 2, y: 2 });
    expect(p).not.toBeNull();
    const last = (p as { x: number; y: number }[]).at(-1) as { x: number; y: number };
    expect(Math.abs(last.x - 2) + Math.abs(last.y - 2)).toBe(1);
    for (const t of p ?? []) expect(g.walkable(t.x, t.y)).toBe(true);
  });
  it('returns an empty path when already adjacent and null when walled off', () => {
    expect(approachPath(grid(['..']), { x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([]);
    expect(approachPath(grid(['.#.', '.#.']), { x: 0, y: 0 }, { x: 2, y: 0 })).toEqual(null);
  });
  it('avoids tiles occupied by other NPCs', () => {
    const g = grid(['...', '...'], new Set(['1,0']));
    const p = bfsPath(g, { x: 0, y: 0 }, (x, y) => x === 2 && y === 0) ?? [];
    expect(p.some((t) => t.x === 1 && t.y === 0)).toBe(false);
    expect(p.length).toBe(4);
  });
  it('finds the nearest edge or exit, not the start', () => {
    const g = grid(['.....', '.....', '.....', '.....', '.....']);
    const p = exitPath(g, { x: 2, y: 2 }, () => false) ?? [];
    expect(p.length).toBe(2);
    const q = exitPath(g, { x: 2, y: 2 }, (x, y) => x === 2 && y === 1) ?? [];
    expect(q).toEqual([{ x: 2, y: 1 }]);
  });
  it('names the hidden-NPC flag', () => {
    expect(npcGoneFlag('city', 'kartpathy')).toBe('npc_gone_city_kartpathy');
  });
});
