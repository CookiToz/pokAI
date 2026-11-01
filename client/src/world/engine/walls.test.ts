import { describe, expect, it } from 'vitest';
import type { TileName } from '../../data/tiles';
import { buildTileArt } from '../art/tiles';
import { SLAB_T } from '../art/walls';
import { ALL_MASKS, E, LOW_MASKS, N, S, W, hasFullFace, isThickWall, posterBase, thinFamily, variantName, wallKeys, wallMask, wallShape, wantsLow } from './walls';

/** Build a lookup from ascii rows: # wall, w wall_window, c concrete_wall, . floor, p poster, d door, b cell_bars. */
const grid = (rows: string[]) => {
  const names: Record<string, TileName> = { '#': 'wall', w: 'wall_window', c: 'concrete_wall', '.': 'floor_tile', p: 'poster_aiact', d: 'aiact_door', b: 'cell_bars', P: 'prison_wall' };
  return (x: number, y: number): TileName | null => {
    const ch = rows[y]?.[x];
    return ch === undefined ? null : (names[ch] ?? null);
  };
};

describe('wall connectivity', () => {
  const at = grid(['#####', '#...#', '#...#', '#####']);
  it('masks follow the 4 neighbours', () => {
    expect(wallMask(at, 0, 0)).toBe(E | S);
    expect(wallMask(at, 2, 0)).toBe(E | W);
    expect(wallMask(at, 4, 3)).toBe(N | W);
    expect(wallMask(at, 0, 1)).toBe(N | S);
    expect(wallMask(grid(['.#.']), 1, 0)).toBe(0);
  });
  it('names the shapes and variants', () => {
    expect(wallShape(0)).toBe('solo');
    expect(wallShape(E)).toBe('end');
    expect(wallShape(E | W)).toBe('run');
    expect(wallShape(E | S)).toBe('corner');
    expect(wallShape(E | S | W)).toBe('tee');
    expect(wallShape(N | E | S | W)).toBe('cross');
    expect(variantName(E | W)).toBe('x');
    expect(variantName(N | S)).toBe('y');
    expect(variantName(0)).toBe('solo');
    expect(new Set(ALL_MASKS.map(variantName)).size).toBe(16);
  });
  it('bars and wall-line posters keep the run connected', () => {
    expect(wallMask(grid(['#b#']), 0, 0)).toBe(E);
    expect(wallMask(grid(['#p#']), 0, 0)).toBe(E);
    expect(wallMask(grid(['.p.']), 0, 0)).toBe(0);
  });
});

describe('thin vs volumetric', () => {
  it('lines are thin, 2x2 masses stay cubes, exteriors are never thin', () => {
    const at = grid(['cc.', 'cc.', '...', 'c..']);
    expect(thinFamily(at, 'concrete_wall', 0, 0)).toBeNull();
    expect(isThickWall(at, 1, 1)).toBe(true);
    expect(thinFamily(at, 'concrete_wall', 0, 3)).toBe('concrete_wall');
    expect(thinFamily(at, 'house_wall', 0, 3)).toBeNull();
    expect(thinFamily(at, 'tower_wall', 0, 3)).toBeNull();
    expect(thinFamily(at, 'hub_wall', 0, 3)).toBeNull();
  });
  it('a poster is a slab decal only when it sits in a wall line', () => {
    const at = grid(['#p#', '...', '.p.']);
    expect(thinFamily(at, 'poster_aiact', 1, 0)).toBe('poster_aiact');
    expect(thinFamily(at, 'poster_aiact', 1, 2)).toBeNull();
    expect(posterBase(grid(['PpP']), 1, 0)).toBe('prison_wall');
    expect(posterBase(grid(['wpw']), 1, 0)).toBe('wall');
  });
});

describe('slab art', () => {
  const keys = new Set(buildTileArt().map((e) => e.key));
  it('slabs are thin (22-30% of a tile)', () => {
    expect(SLAB_T).toBeGreaterThanOrEqual(0.22);
    expect(SLAB_T).toBeLessThanOrEqual(0.3);
  });
  it('every family has all 16 junction variants and the low (near-camera) ones', () => {
    for (const f of ['wall', 'prison_wall', 'concrete_wall', 'aiact_wall'] as TileName[]) {
      for (const m of ALL_MASKS) expect(keys.has(`${f}:${variantName(m)}`), `${f}:${m}`).toBe(true);
      for (const m of LOW_MASKS) expect(keys.has(`${f}:${variantName(m)}:low`), `${f}:${m}:low`).toBe(true);
    }
  });
  it('every key list resolves to a texture for every mask', () => {
    const fams: TileName[] = ['wall', 'wall_window', 'prison_wall', 'concrete_wall', 'aiact_wall', 'aiact_door', 'poster_aiact'];
    for (const f of fams) {
      for (const m of ALL_MASKS) {
        for (const base of ['wall', 'prison_wall', 'concrete_wall', 'aiact_wall'] as TileName[]) {
          expect(wallKeys(f, m, false, base).some((k) => keys.has(k)), `${f} ${m} ${base}`).toBe(true);
        }
        // a low slab exists for every mask a tile on the last row / column can have
        if (!((m & E) && (m & S))) expect(wallKeys(f === 'aiact_door' ? 'aiact_wall' : f, m, true).some((k) => keys.has(k)), `${f} ${m} low`).toBe(true);
      }
    }
  });
  it('decorated variants exist where a full face is visible', () => {
    for (const m of ALL_MASKS) {
      expect(keys.has(`wall_window:${variantName(m)}`)).toBe(hasFullFace(m));
      expect(keys.has(`poster_aiact:wall:${variantName(m)}`)).toBe(hasFullFace(m));
    }
  });
  it('near-camera cut applies to the last column and row only', () => {
    expect(wantsLow('wall', 9, 3, 10, 8)).toBe(true);
    expect(wantsLow('wall', 3, 7, 10, 8)).toBe(true);
    expect(wantsLow('wall', 3, 3, 10, 8)).toBe(false);
    expect(wantsLow('aiact_door', 9, 3, 10, 8)).toBe(false);
  });
});
