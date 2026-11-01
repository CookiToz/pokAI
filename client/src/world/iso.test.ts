import { describe, expect, it } from 'vitest';
import type { MapDef } from '../data/types';
import {
  depthKey, directionBetween, fitZoom, groundUnder, isBlocked, pickHeld, project, roofColourAbove, roofShape, screenDir, unproject, viewOf,
} from './iso';
import { CHAR_VIEWS, WALK_FRAMES, charKey } from './art/char-contract';
import { characterEntries, CHARACTER_IDS } from './art/characters';

describe('iso projection', () => {
  it('projects the grid onto a 2:1 diamond', () => {
    expect(project(0, 0)).toEqual({ x: 0, y: 0 });
    expect(project(1, 0)).toEqual({ x: 32, y: 16 });
    expect(project(0, 1)).toEqual({ x: -32, y: 16 });
    expect(project(3, 3)).toEqual({ x: 0, y: 96 });
  });
  it('unproject inverts project', () => {
    const p = project(5.5, 2.25);
    const g = unproject(p.x, p.y);
    expect(g.x).toBeCloseTo(5.5);
    expect(g.y).toBeCloseTo(2.25);
  });
});

describe('depth and directions', () => {
  it('sorts along the diagonal and by layer', () => {
    expect(depthKey(3, 3, 20)).toBeGreaterThan(depthKey(2, 3, 50));
    expect(depthKey(2, 2, 50)).toBeGreaterThan(depthKey(2, 2, 20));
  });
  it('up goes toward screen up-right, left toward up-left', () => {
    expect(screenDir('up').y).toBeLessThan(0);
    expect(screenDir('up').x).toBeGreaterThan(0);
    expect(screenDir('left').y).toBeLessThan(0);
    expect(screenDir('left').x).toBeLessThan(0);
    expect(screenDir('down').y).toBeGreaterThan(0);
    expect(screenDir('right').y).toBeGreaterThan(0);
  });
  it('maps facing to front/back views with mirroring', () => {
    expect(viewOf('down')).toEqual({ view: 'front', flip: true });
    expect(viewOf('right')).toEqual({ view: 'front', flip: false });
    expect(viewOf('up').view).toBe('back');
    expect(viewOf('left')).toEqual({ view: 'back', flip: true });
  });
  it('directionBetween and pickHeld', () => {
    expect(directionBetween({ x: 1, y: 1 }, { x: 1, y: 0 })).toBe('up');
    expect(directionBetween({ x: 1, y: 1 }, { x: 2, y: 2 })).toBeNull();
    expect(pickHeld(new Set(['left', 'up']), 'left')).toBe('left');
    expect(pickHeld(new Set(['left', 'up']), 'down')).toBe('up');
    expect(pickHeld(new Set(), null)).toBeNull();
  });
});

describe('zoom', () => {
  it('fits ~16 tiles across a 1280 window and clamps', () => {
    expect(fitZoom(1280, 720)).toBeGreaterThan(1);
    expect(fitZoom(1280, 720)).toBeLessThan(1.5);
    expect(fitZoom(100, 100)).toBe(0.55);
    expect(fitZoom(8000, 4000)).toBe(2);
  });
});

function mapOf(rows: string[], legend: Record<string, string>): MapDef {
  return { id: 't', name: 't', width: rows[0]?.length ?? 0, height: rows.length, rows, legend, npcs: [], warps: [], triggers: [] };
}

describe('map queries', () => {
  const legend = { '#': 'wall', '.': 'floor_wood', g: 'grass', p: 'path', R: 'hub_roof', W: 'hub_wall', '?': 'no_such_tile' };
  const room = mapOf(['#####', '#.?.#', '#...#', '#####'], legend);
  it('blocks solid tiles, bounds and NPCs; unknown tiles are plain ground', () => {
    expect(isBlocked(room, 0, 0)).toBe(true);
    expect(isBlocked(room, -1, 3)).toBe(true);
    expect(isBlocked(room, 9, 1)).toBe(true);
    expect(isBlocked(room, 1, 1)).toBe(false);
    expect(isBlocked(room, 2, 1)).toBe(false);
    expect(isBlocked(room, 1, 1, [{ x: 1, y: 1 }])).toBe(true);
  });
  it('picks roof colour and shape for a hub building', () => {
    const town = mapOf(['ggggg', 'RRRRR', 'RRRRR', 'WWWWW', 'ggggg'], legend);
    expect(roofColourAbove(town, 2, 3)).toBe('hub');
    expect(roofShape(town, 2, 1)).toBe('back');
    expect(roofShape(town, 2, 2)).toBe('front');
  });
  it('picks a ground under props', () => {
    const m = mapOf(['ggg', 'g#g', 'ggg'], legend);
    expect(groundUnder(m, 1, 1)).toBe('grass');
    expect(groundUnder(room, 2, 1)).toBe('floor_wood');
  });
});

describe('character art contract', () => {
  it('keys follow char:<id>:<view>:<frame>', () => {
    expect(charKey('player', 'side', 3)).toBe('char:player:side:3');
    expect(CHAR_VIEWS).toHaveLength(3);
    expect(WALK_FRAMES).toBe(4);
  });
});
