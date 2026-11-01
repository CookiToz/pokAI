import { describe, expect, it } from 'vitest';
import { db } from '../data/db';
import { createRng } from './rng';
import { computeStats, levelForXp, stageMultiplier, xpForLevel } from './stats';
import { pickEncounter, rollEncounter } from './encounters';
import type { MapDef } from '../data/types';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const xs = Array.from({ length: 20 }, () => a.next());
    const ys = Array.from({ length: 20 }, () => b.next());
    expect(xs).toEqual(ys);
    expect(createRng(43).next()).not.toEqual(xs[0]);
  });
  it('can be resumed from its seed', () => {
    const a = createRng(7);
    a.next();
    a.next();
    const b = createRng(a.seed);
    expect(b.next()).toEqual(a.next());
  });
  it('int stays in range and pick/shuffle work', () => {
    const r = createRng(1);
    for (let i = 0; i < 500; i++) {
      const v = r.int(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
    }
    expect([1, 2, 3]).toContain(r.pick([1, 2, 3]));
    expect(r.shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]);
    expect(() => r.pick([])).toThrow();
  });
});

describe('stats and xp', () => {
  const zero = { context: 0, power: 0, robustness: 0, throughput: 0, precision: 0 };
  const max = { context: 15, power: 15, robustness: 15, throughput: 15, precision: 15 };
  it('grows with level and IVs', () => {
    const f = db.form('smollm');
    const s5 = computeStats(f, 5, zero);
    const s50 = computeStats(f, 50, zero);
    expect(s50.context).toBeGreaterThan(s5.context);
    expect(computeStats(f, 50, max).power).toBeGreaterThan(s50.power);
    expect(s5.context).toBeGreaterThan(10);
  });
  it('gives proprietary forms +10 % base', () => {
    const open = db.form('phi_1');
    const prop = { ...open, licence: 'proprietary' as const };
    expect(computeStats(prop, 50, zero).power).toBeGreaterThan(computeStats(open, 50, zero).power);
  });
  it('xp curve is monotonic and invertible', () => {
    expect(xpForLevel(1)).toBe(0);
    for (let l = 2; l <= 100; l++) {
      expect(xpForLevel(l)).toBeGreaterThan(xpForLevel(l - 1));
      expect(levelForXp(xpForLevel(l))).toBe(l);
      expect(levelForXp(xpForLevel(l) - 1)).toBe(l - 1);
    }
  });
  it('stage multipliers', () => {
    expect(stageMultiplier(0)).toBe(1);
    expect(stageMultiplier(2)).toBe(2);
    expect(stageMultiplier(-2)).toBe(0.5);
    expect(stageMultiplier(10)).toBe(4);
  });
});

describe('type chart', () => {
  it('matches the design table', () => {
    expect(db.typeChart('code', 'chat')).toBe(2);
    expect(db.typeChart('code', 'agent')).toBe(2);
    expect(db.typeChart('chat', 'reasoning')).toBe(2);
    expect(db.typeChart('chat', 'legacy')).toBe(2);
    expect(db.typeChart('reasoning', 'code')).toBe(2);
    expect(db.typeChart('reasoning', 'chaos')).toBe(2);
    expect(db.typeChart('media', 'chat')).toBe(2);
    expect(db.typeChart('agent', 'media')).toBe(2);
    expect(db.typeChart('agent', 'legacy')).toBe(2);
    expect(db.typeChart('chaos', 'agent')).toBe(2);
    expect(db.typeChart('chaos', 'media')).toBe(2);
    expect(db.typeChart('legacy', 'chaos')).toBe(2);
    for (const t of db.types) expect(db.typeChart(t.id, t.id)).toBe(0.5);
    expect(db.typeChart('chat', 'code')).toBe(1);
    expect(db.effectiveness('media', ['media', 'chat'])).toBe(1);
  });
});

describe('encounters', () => {
  const map: MapDef = {
    id: 't', name: 't', width: 1, height: 1, rows: ['c'], legend: { c: 'cable' }, npcs: [], warps: [], triggers: [],
    encounterRate: 1,
    encounters: [
      { form: 'smollm', minLevel: 2, maxLevel: 4, weight: 10 },
      { form: 'whisper_tiny', minLevel: 3, maxLevel: 3, weight: 10, night: true },
    ],
  };
  it('never yields night entries by day', () => {
    const r = createRng(5);
    for (let i = 0; i < 200; i++) {
      const e = pickEncounter(map, false, r);
      expect(e?.form).toBe('smollm');
      expect(e!.level).toBeGreaterThanOrEqual(2);
      expect(e!.level).toBeLessThanOrEqual(4);
    }
  });
  it('yields night entries at night', () => {
    const r = createRng(5);
    const forms = new Set(Array.from({ length: 100 }, () => pickEncounter(map, true, r)?.form));
    expect(forms.has('whisper_tiny')).toBe(true);
  });
  it('respects the encounter rate', () => {
    const r = createRng(9);
    expect(rollEncounter({ ...map, encounterRate: 0 }, false, r)).toBeNull();
    expect(rollEncounter({ ...map, encounters: [] }, false, r)).toBeNull();
    const hits = Array.from({ length: 1000 }, () => rollEncounter({ ...map, encounterRate: 0.1 }, false, r)).filter(Boolean).length;
    expect(hits).toBeGreaterThan(60);
    expect(hits).toBeLessThan(140);
  });
});
