import { describe, expect, it } from 'vitest';
import type { MapDef } from '../../data/types';
import { ENTRANCE_OFFSET, entranceInFootprint } from '../art/entrances';
import { auditDoors, auditMap, doorTiles, landmarksOf } from './door-audit';

const maps = Object.values(import.meta.glob<MapDef>('@data/maps/*.json', { eager: true, import: 'default' }));

const fmt = (list: ReturnType<typeof auditDoors>): string => list.map((i) => `[${i.map}] (${i.x},${i.y}) ${i.kind}: ${i.message}`).join('\n');

describe('door <-> warp audit (real maps)', () => {
  it('every warp is on a visible door and every visible door does something', () => {
    const issues = auditDoors(maps);
    expect(fmt(issues)).toBe('');
  });

  it('landmark entrances are declared for the enterable landmarks only and lie on the front face', () => {
    for (const name of Object.keys(ENTRANCE_OFFSET)) expect(entranceInFootprint(name), name).toBe(true);
    const names = new Set(maps.flatMap((m) => landmarksOf(m).map((l) => l.name)));
    for (const n of ['lm_aiact_tower', 'lm_giant_screen', 'lm_crane', 'lm_lighthouse']) expect(ENTRANCE_OFFSET[n as keyof typeof ENTRANCE_OFFSET], n).toBeUndefined();
    expect([...names].length).toBeGreaterThan(0);
  });
});

describe('door audit rules (synthetic maps)', () => {
  const base = (rows: string[], extra: Partial<MapDef> = {}): MapDef => ({
    id: 'a', name: 'A', width: rows[0]!.length, height: rows.length, rows,
    legend: { '.': 'grass', D: 'house_door', W: 'house_wall', m: 'exit_mat', G: 'lm_gpu_store', x: 'blocker', p: 'path' },
    npcs: [], warps: [], triggers: [], kind: 'city', ...extra,
  });
  const inside: MapDef = { id: 'b', name: 'B', width: 3, height: 3, rows: ['...', '...', '.m.'], legend: { '.': 'floor_wood', m: 'exit_mat' }, npcs: [], triggers: [], kind: 'interior', warps: [{ x: 1, y: 2, to: 'a', toX: 1, toY: 3, facing: 'down' }] };
  const reg = (m: MapDef): Map<string, MapDef> => new Map([[m.id, m], [inside.id, inside]]);

  it('accepts a warp on a door with a matching landing', () => {
    const m = base(['...', '.D.', '...', '...'], { warps: [{ x: 1, y: 1, to: 'b', toX: 1, toY: 1, facing: 'up' }] });
    expect(auditMap(m, reg(m))).toEqual([]);
  });

  it('flags a warp on plain ground (door art missing) and a door nobody can use', () => {
    const m = base(['.....', '..D..', '.....', '.....', '.....'], { warps: [{ x: 1, y: 2, to: 'b', toX: 1, toY: 1, facing: 'up' }] });
    const kinds = auditMap(m, reg(m)).map((i) => i.kind);
    expect(kinds).toContain('warp_not_on_door');
    expect(kinds).toContain('door_without_warp');
  });

  it('a "porte fermée" trigger makes a decorative door legal', () => {
    const m = base(['...', '.D.', '...', '...'], { triggers: [{ x: 1, y: 1, script: 'closed' }] });
    expect(auditMap(m, reg(m))).toEqual([]);
  });

  it('flags a landmark warp that is not on the drawn door', () => {
    const rows = ['.....', '.....', '.xxx.', '.xxx.', '.xxG.', '.....', '.....'];
    // gpu store: anchor (3,4), entrance dx -1 -> (2,5); warp placed at (3,5)
    const m = base(rows, { warps: [{ x: 3, y: 5, to: 'b', toX: 1, toY: 1, facing: 'up' }] });
    const kinds = auditMap(m, reg(m)).map((i) => i.kind);
    expect(kinds).toContain('warp_beside_entrance');
    expect(kinds).toContain('entrance_without_warp');
    expect(doorTiles(m).has('2,5')).toBe(true);
  });

  it('flags a wrong landing facing', () => {
    const m = base(['...', '.D.', '...', '...'], { warps: [{ x: 1, y: 1, to: 'b', toX: 1, toY: 1, facing: 'down' }] });
    expect(auditMap(m, reg(m)).map((i) => i.kind)).toContain('bad_facing');
  });
});
