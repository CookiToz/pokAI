import { describe, expect, it } from 'vitest';
import { db } from '../data/db';
import type { MapDef } from '../data/types';
import { currentObjective, evaluate, nextHop, progress, resolveTarget, type Objective } from './objectives';
import objectivesJson from '@data/objectives.json';

const list = (objectivesJson as unknown as { objectives: Objective[] }).objectives;
const maps = (id: string): MapDef | undefined => (db.hasMap(id) ? db.map(id) : undefined);
const flags = (...names: string[]) => (n: string): boolean => names.includes(n);

describe('objectives data', () => {
  it('has unique ids and targets on real, in-bounds maps', () => {
    expect(new Set(list.map((o) => o.id)).size).toBe(list.length);
    for (const o of list) {
      expect(o.targets.length).toBeGreaterThan(0);
      for (const t of o.targets) {
        const m = maps(t.map);
        expect(m, `${o.id}: map ${t.map}`).toBeDefined();
        expect(t.x).toBeLessThan(m!.width);
        expect(t.y).toBeLessThan(m!.height);
      }
    }
  });

  it('every target map is reachable from the start map', () => {
    for (const o of list) expect(nextHop('aiact_center', new Set(o.targets.map((t) => t.map)), maps), o.id).not.toBeNull();
  });
});

describe('objectives evaluator', () => {
  it('has no objective before the intro, then the pods first', () => {
    expect(currentObjective(list, flags())).toBeNull();
    expect(currentObjective(list, flags('intro_done'))?.id).toBe('free_pokai');
  });

  it('advances along the story flags', () => {
    expect(currentObjective(list, flags('intro_done', 'got_starter'))?.id).toBe('find_password');
    expect(currentObjective(list, flags('intro_done', 'got_starter', 'got_password', 'door_unlocked'))?.id).toBe('beat_cookie');
    expect(currentObjective(list, flags('game_complete'))).toBeNull();
  });

  it('treats earlier steps as done when a later one is (old saves) and counts progress', () => {
    const f = flags('intro_done', 'badge_commit');
    expect(currentObjective(list, f)?.id).toBe('reach_grove');
    const p = progress(list, f);
    expect(p.done).toBeGreaterThan(5);
    expect(p.total).toBeGreaterThan(p.done);
  });

  it('keeps optional objectives out of the current slot', () => {
    const st = evaluate(list, flags('intro_done', 'got_starter'));
    expect(st.find((s) => s.objective.id === 'locker_keys')?.state).toBe('open');
    expect(st.filter((s) => s.state === 'current')).toHaveLength(1);
  });
});

describe('objective target resolution', () => {
  const pods = list.find((o) => o.id === 'free_pokai')!;
  const hub = list.find((o) => o.id === 'visit_hub')!;

  it('points straight at the target on the same map', () => {
    expect(resolveTarget(pods, 'aiact_center', { x: 3, y: 2 }, maps)).toMatchObject({ kind: 'here', x: 22, y: 2 });
  });

  it('points at the exit leading toward a target on another map', () => {
    const r = resolveTarget(hub, 'aiact_center', { x: 10, y: 20 }, maps);
    expect(r).toMatchObject({ kind: 'exit', to: 'latentia_city' });
    const r2 = resolveTarget(hub, 'bistro', { x: 6, y: 6 }, maps);
    expect(r2).toMatchObject({ kind: 'exit', to: 'latentia_city' });
  });

  it('returns null when the map graph does not reach the target', () => {
    expect(resolveTarget({ ...hub, targets: [{ map: 'nowhere', x: 0, y: 0 }] }, 'aiact_center', { x: 1, y: 1 }, maps)).toBeNull();
  });
});
