import { describe, expect, it } from 'vitest';
import { db } from '../data/db';

describe('chapters 4-5 content', () => {
  const ids = new Set(db.allMaps().map((m) => m.id));
  it('has all the chapter maps', () => {
    for (const id of ['route_cables_sous_marins', 'dunes_datacenters', 'hub_dunes', 'store_dunes', 'bench_swebench', 'mont_gpu', 'route_bureaucratie', 'conformite_capitale', 'hub_capitale', 'tour_conformite', 'coffre_scelles', 'temple_attention']) expect(ids.has(id), id).toBe(true);
  });
  it('the story chain is wired to its flags', () => {
    const has = (script: string, flag: string): boolean => db.allScripts().find((s) => s.id === script)?.steps.some((st) => 'set_flag' in st && st.set_flag === flag) ?? false;
    expect(has('leader_patchwell_defeat', 'badge_patch')).toBe(true);
    expect(has('moratoire_defeat', 'moratoire_beaten')).toBe(true);
    expect(has('agi_wake_fail', 'agi_failed')).toBe(true);
    expect(has('agi_final', 'game_complete')).toBe(true);
  });
  it('the Temple only offers a level 50 Transformer and Moratoire is level 42-45', () => {
    const t = db.allMaps().find((m) => m.id === 'temple_attention')!;
    expect(t.encounters).toEqual([{ form: 'transformer', minLevel: 50, maxLevel: 50, weight: 1 }]);
    const m = db.allTrainers().find((x) => x.id === 'moratoire')!;
    expect(Math.min(...m.team.map((p) => p.level))).toBeGreaterThanOrEqual(42);
    expect(Math.max(...m.team.map((p) => p.level))).toBeLessThanOrEqual(45);
  });
});
