import { describe, expect, it } from 'vitest';
import { LANDMARK_FOOTPRINT, TILE_NAMES } from '../../data/tiles';
import { packetEntries } from './landmarks';
import { CHAR_H, DOOR_H, DOOR_W, STOREY_PX } from './kit';
import { ROOF_H, WALL_H, buildTileArt } from './tiles';

describe('city art', () => {
  const entries = new Map(buildTileArt().map((e) => [e.key, e]));

  it('every landmark has one big sprite covering its footprint', () => {
    for (const [name, fp] of Object.entries(LANDMARK_FOOTPRINT)) {
      const e = entries.get(`${name}:0`);
      expect(e, name).toBeDefined();
      if (!e || !fp) continue;
      // canvas is symmetric around the anchor and at least as wide as the footprint's screen width
      expect(e.w, name).toBeGreaterThanOrEqual((fp.w + fp.h) * 32);
      // tall enough to hold the footprint diamond above the anchor (front corner)
      expect(e.anchorY, name).toBeGreaterThanOrEqual((fp.w - 1 + (fp.h - 1)) * 16 + 16);
      expect(e.svg).toContain('<svg');
    }
  });

  it('every v0.3 tile name has a :0 sprite', () => {
    const skip = new Set(['black', 'cable', 'fence', 'house_wall', 'house_window', 'house_door', 'hub_roof', 'store_roof', 'bench_roof', 'roof_red', 'roof_blue', 'roof_grey']);
    const start = TILE_NAMES.indexOf('asphalt');
    for (const n of TILE_NAMES.slice(start)) if (!skip.has(n)) expect(entries.has(`${n}:0`), n).toBe(true);
  });

  it('v0.4 puzzle and axis variants exist', () => {
    for (const k of ['switch_plate_on:0', 'gate_open:0', 'bridge_wood:1', 'arena_line:1', 'log:1', 'signpost:3', 'crate_push:2', 'container_roof:2', 'treehouse_roof:2', 'tree_pine:2', 'tree_birch:2', 'flower_bed:2', 'hub_floor:1', 'arena_floor:1'])
      expect(entries.has(k), k).toBe(true);
  });

  it('art keys are unique', () => {
    const keys = buildTileArt().map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('exposes glowing data packets for the highways', () => {
    expect(packetEntries().map((e) => e.key)).toEqual(['packet:0', 'packet:1', 'packet:2']);
  });

  it('buildings are scaled against the characters', () => {
    expect(STOREY_PX / CHAR_H).toBeGreaterThan(1.4);
    expect(DOOR_H / CHAR_H).toBeGreaterThan(1.1);
    expect(DOOR_H).toBeLessThan(STOREY_PX);
    expect(DOOR_W).toBeCloseTo(0.8);
    expect(WALL_H).toBe(STOREY_PX);
    expect(ROOF_H).toBeGreaterThan(WALL_H);
  });
});
