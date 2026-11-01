import { describe, expect, it } from 'vitest';
import type { MapDef } from '../../data/types';
import {
  crateAt, crateFlag, enterMapCrates, gateIsOpen, loadCrates, planPush, resetCrates, solvedFlag, storeCrate, switchStates, syncSwitches,
  terrainSolid, tileSolid, type Flags,
} from './puzzles';

// 7x5 room: '#' wall, '.' floor, 'G' gate (3,2)... plate at (5,2), crate at (2,2), second crate at (2,1)
const rows = ['#######', '#.....#', '#.....#', '#.....#', '#######'];
const map: MapDef = {
  id: 'pz', name: 'Test', width: 7, height: 5, rows, legend: { '#': 'wall', '.': 'floor_tile' },
  npcs: [], warps: [{ x: 1, y: 3, to: 'x', toX: 0, toY: 0 }], triggers: [],
  gates: [{ x: 4, y: 2, flag: 'open_a' }],
  switches: [{ x: 5, y: 1, flag: 'open_a' }],
  pushables: [{ id: 'c1', x: 2, y: 2 }, { id: 'c2', x: 2, y: 1 }],
};
const view = (flags: Flags, crates = loadCrates(map, flags)) => ({ map, flags, crates });

describe('crates persistence', () => {
  it('starts on authored tiles, stores one flag per moved crate, forgets old positions', () => {
    const f: Flags = {};
    expect(loadCrates(map, f).get('c1')).toEqual({ x: 2, y: 2 });
    storeCrate(f, map, 'c1', { x: 3, y: 2 });
    storeCrate(f, map, 'c1', { x: 3, y: 3 });
    expect(Object.keys(f)).toEqual([crateFlag('pz', 'c1', 3, 3)]);
    expect(loadCrates(map, f).get('c1')).toEqual({ x: 3, y: 3 });
    storeCrate(f, map, 'c1', { x: 2, y: 2 });
    expect(Object.keys(f)).toEqual([]);
  });
  it('reset brings crates home; re-entering resets unless solved or restoring a save', () => {
    const f: Flags = {};
    storeCrate(f, map, 'c2', { x: 3, y: 1 });
    expect(enterMapCrates(map, { ...f }, true).get('c2')).toEqual({ x: 3, y: 1 });
    expect(enterMapCrates(map, { ...f }, false).get('c2')).toEqual({ x: 2, y: 1 });
    const solved: Flags = { ...f, [solvedFlag('pz')]: true };
    expect(enterMapCrates(map, solved, false).get('c2')).toEqual({ x: 3, y: 1 });
    resetCrates(f, map);
    expect(f).toEqual({});
  });
});

describe('collision and pushing', () => {
  it('gates are solid until their flag is set; crates block', () => {
    const f: Flags = {};
    expect(tileSolid(view(f), 4, 2)).toBe(true);
    expect(terrainSolid({ ...view(f), standing: { x: 4, y: 2 } }, 4, 2)).toBe(false);
    f['open_a'] = true;
    expect(tileSolid(view(f), 4, 2)).toBe(false);
    expect(gateIsOpen(map, f, { flag: 'open_a' })).toBe(true);
    expect(tileSolid(view({}), 2, 2)).toBe(true); // crate
  });
  it('pushes one tile when free, refuses walls, crates, gates, people and exits', () => {
    const v = view({});
    expect(planPush(v, 'c1', 1, 0)).toEqual({ x: 3, y: 2 });
    expect(planPush(v, 'c1', 0, -1)).toBeNull(); // c2 is there
    expect(planPush(v, 'c2', 0, -1)).toBeNull(); // wall (y=0)
    expect(planPush(v, 'c1', 1, 0, [{ x: 3, y: 2 }])).toBeNull(); // NPC
    expect(planPush(v, 'c1', 0, 1)).toEqual({ x: 2, y: 3 });
    storeCrate(v.flags, map, 'c1', { x: 3, y: 2 });
    const v2 = view(v.flags);
    expect(planPush(v2, 'c1', 1, 0)).toBeNull(); // closed gate at (4,2)
    expect(planPush(view({ open_a: true }, v2.crates), 'c1', 1, 0)).toBeNull(); // gate tiles never take crates
    expect(planPush(v, 'c1', 1, 1)).toBeNull();
  });
  it('does not seal a warp tile', () => {
    const f: Flags = {};
    const crates = loadCrates(map, f);
    crates.set('c1', { x: 1, y: 2 });
    expect(planPush({ map, flags: f, crates }, 'c1', 0, 1)).toBeNull();
  });
});

describe('switches', () => {
  it('flag on while the player or a crate stands on the plate, off when released', () => {
    const f: Flags = {};
    const crates = loadCrates(map, f);
    expect(switchStates(map, crates, { x: 5, y: 1 })).toEqual({ open_a: true });
    expect(switchStates(map, crates, { x: 1, y: 1 })).toEqual({ open_a: false });
    crates.set('c1', { x: 5, y: 1 });
    expect(syncSwitches(map, crates, { x: 1, y: 1 }, f)).toEqual([{ flag: 'open_a', on: true }, { flag: solvedFlag('pz'), on: true }]);
    expect(syncSwitches(map, crates, { x: 1, y: 1 }, f)).toEqual([]); // idempotent
    crates.set('c1', { x: 2, y: 2 });
    syncSwitches(map, crates, { x: 1, y: 1 }, f);
    expect(f['open_a']).toBe(false);
    expect(gateIsOpen(map, f, { flag: 'open_a' })).toBe(true); // solved: stays open
  });
  it('requires every plate that shares a flag; latched flags never clear', () => {
    const m2: MapDef = { ...map, gates: [], switches: [{ x: 1, y: 1, flag: 'both' }, { x: 2, y: 1, flag: 'both' }, { x: 3, y: 1, flag: 'latch_x' }] };
    const f: Flags = {};
    const crates = new Map([['a', { x: 1, y: 1 }]]);
    expect(syncSwitches(m2, crates, { x: 3, y: 1 }, f).map((c) => c.flag).sort()).toEqual(['latch_x']);
    expect(syncSwitches(m2, crates, { x: 2, y: 1 }, f).map((c) => c.flag)).toEqual(['both']);
    expect(f['both']).toBe(true);
    syncSwitches(m2, crates, { x: 4, y: 1 }, f);
    expect(f['both']).toBe(false);
    expect(f['latch_x']).toBe(true);
  });
  it('crateAt finds crates by tile', () => {
    expect(crateAt(loadCrates(map, {}), 2, 1)).toBe('c2');
    expect(crateAt(loadCrates(map, {}), 0, 0)).toBeNull();
  });
});

import { screenArrow, signLines, signText } from './signposts';

describe('signposts', () => {
  const m: MapDef = {
    ...map, width: 40, height: 40,
    exits: [
      { x: 3, y: 30, to: 'a', label: '← Port 8080' },
      { x: 14, y: 8, to: 'b', label: 'Hugging Grove' },
      { x: 38, y: 38, to: 'c', label: 'Très loin' },
    ],
  };
  it('arrows follow the isometric screen', () => {
    expect(screenArrow(1, -1)).toBe('→'); // grid up-right = screen right
    expect(screenArrow(-1, -1)).toBe('↑');
    expect(screenArrow(1, 1)).toBe('↓');
    expect(screenArrow(1, 0)).toBe('↘');
    expect(screenArrow(0, -1)).toBe('↗');
  });
  it('lists the nearest exits first and drops far ones', () => {
    const lines = signLines(m, 6, 20);
    expect(lines.map((l) => l.label)).toEqual(['Port 8080', 'Hugging Grove']);
    expect(signText(lines, 1)).toMatch(/^[→↘↓↙←↖↑↗] Port 8080$/);
    expect(signLines({ ...m, exits: [] }, 1, 1)).toEqual([]);
  });
});

import { idVariant } from './puzzles';
import { signVariant } from './signposts';
describe('variants', () => {
  it('idVariant is stable and in range; signVariant follows the arrows', () => {
    expect(idVariant('c1', 3)).toBe(idVariant('c1', 3));
    for (const id of ['a', 'b', 'weight_7']) expect(idVariant(id, 3)).toBeLessThan(3);
    const l = (arrow: string) => ({ arrow, label: 'x', dist: 1 });
    expect(signVariant([], 5)).toBe(1);
    expect(signVariant([l('←')], 0)).toBe(2);
    expect(signVariant([l('→')], 0)).toBe(3);
    expect(signVariant([l('←'), l('→')], 0)).toBe(0);
    expect(signVariant([l('←'), l('↖'), l('→')], 0)).toBe(1);
  });
});
