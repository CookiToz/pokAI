import { describe, expect, it } from 'vitest';
import { db } from '../data/db';
import { TILE_NAMES } from '../data/tiles';
import { validateWorld, tileAt, isWalkable } from './map-validate';
import { evalCondition } from './conditions';

const maps = db.allMaps();
const scripts = db.allScripts();

describe('world content', () => {
  it('has the v0.3 maps', () => {
    const ids = maps.map((m) => m.id);
    for (const id of ['aiact_center', 'latentia_city', 'route_foret_poids', 'hugging_grove', 'hub_grove', 'store_grove', 'bench_openweights', 'sentier_cotier', 'bench_arcagi', 'hub_city', 'store_city', 'bistro', 'merch_swag', 'bench_humaneval', 'port_8080', 'hub_port', 'store_port', 'secret_404']) expect(ids).toContain(id);
    expect(ids).not.toContain('data_highway_1');
  });

  it('passes the structural validator', () => {
    expect(validateWorld({ maps, scripts })).toEqual([]);
  });

  it('every sign and poster tile has a script', () => {
    const ids = new Set(scripts.map((s) => s.id));
    const missing: string[] = [];
    for (const m of maps) for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
      const t = tileAt(m, x, y);
      if ((t === 'sign' || t === 'poster_aiact' || t === 'road_sign' || t === 'billboard' || t === 'signpost') && !ids.has(`sign_${m.id}_${x}_${y}`)) missing.push(`${m.id}:${x},${y}`);
    }
    expect(missing).toEqual([]);
  });

  it('cross-checks against systems data when available', () => {
    const trainerIds = new Set(db.allTrainers().map((t) => t.id));
    const formIds = new Set(db.allForms().map((f) => f.id));
    if (trainerIds.size === 0 || formIds.size === 0) return; // systems data not written yet
    expect(validateWorld({ maps, scripts, trainerIds, formIds })).toEqual([]);
  });

  it('every legend tile is a known tile name and the new-game start is walkable', () => {
    for (const m of maps) for (const n of Object.values(m.legend)) expect(TILE_NAMES as readonly string[]).toContain(n);
    const cell = maps.find((m) => m.id === 'aiact_center')!;
    expect(tileAt(cell, 3, 2)).toBe('cell_floor');
  });

  it('every warp is reachable from the arrival points (NPCs ignored)', () => {
    const bad: string[] = [];
    for (const m of maps) {
      const starts = maps.flatMap((o) => o.warps.filter((w) => w.to === m.id).map((w) => [w.toX, w.toY] as const));
      if (m.id === 'aiact_center') starts.push([3, 2]);
      const seen = new Set<string>();
      const q = [...starts];
      while (q.length) {
        const [x, y] = q.pop()!;
        const k = `${x},${y}`;
        if (seen.has(k) || !(isWalkable(m, x, y) || (m.gates ?? []).some((g) => g.x === x && g.y === y))) continue;
        seen.add(k);
        q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      for (const w of m.warps) if (!seen.has(`${w.x},${w.y}`)) bad.push(`${m.id}:${w.x},${w.y}`);
      for (const n of m.npcs) if (!seen.has(`${n.x},${n.y}`)) bad.push(`${m.id}:npc ${n.id}`);
    }
    expect(bad).toEqual([]);
  });

  it('doors: warps sit on door/mat tiles and interior exits land in front of the matching door', () => {
    const DOOR = new Set(['house_door', 'hub_door', 'store_door', 'bench_door', 'aiact_door', 'shop_door', 'exit_mat']);
    const byId = new Map(maps.map((m) => [m.id, m] as const));
    const bad: string[] = [];
    for (const m of maps) for (const w of m.warps) {
      const target = byId.get(w.to)!;
      if (w.to === 'secret_404') continue; // hidden fake-wall warp (easter egg)
      if (target.kind === 'interior' && m.kind !== 'interior' && !DOOR.has(tileAt(m, w.x, w.y) ?? '')) bad.push(`${m.id}:${w.x},${w.y} enters ${w.to} from a non-door tile`);
      if (m.kind === 'interior' && tileAt(m, w.x, w.y) !== 'exit_mat') bad.push(`${m.id}:${w.x},${w.y} interior exit not on a mat`);
      if (m.kind === 'interior' || target.kind === 'interior' || m.id === 'aiact_center' || target.id === 'aiact_center') {
        // landing is adjacent to a warp tile of the other map that leads back here
        const back = target.warps.filter((b) => b.to === m.id);
        if (back.length && !back.some((b) => Math.abs(b.x - w.toX) + Math.abs(b.y - w.toY) <= 1)) bad.push(`${m.id}:${w.x},${w.y} lands away from the door of ${w.to}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every hub has a PC that opens the repo and every vending machine opens a vending UI', () => {
    const byId = new Map(scripts.map((s) => [s.id, s] as const));
    const bad: string[] = [];
    for (const m of maps) {
      let pcs = 0;
      for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
        const t = tileAt(m, x, y);
        const steps = byId.get(`sign_${m.id}_${x}_${y}`)?.steps ?? [];
        if (t === 'vending' && !steps.some((s) => 'open' in s && s.open === 'vending')) bad.push(`${m.id}:${x},${y} vending without open`);
        if (t === 'pc' && m.id.startsWith('hub_')) { pcs++; if (!steps.some((s) => 'open' in s && s.open === 'repo')) bad.push(`${m.id}:${x},${y} hub pc without repo`); }
      }
      if (m.id.startsWith('hub_') && pcs === 0) bad.push(`${m.id}: no PC`);
    }
    expect(bad).toEqual([]);
  });

  it('cutscene steps only reference NPCs that exist on some map', () => {
    const npcIds = new Set(maps.flatMap((m) => m.npcs.map((n) => n.id)));
    const bad: string[] = [];
    for (const s of scripts) for (const st of s.steps) {
      const id = 'npc_approach' in st ? st.npc_approach : 'npc_leave' in st ? st.npc_leave : 'emote' in st && st.who !== 'player' ? st.who : null;
      if (id && !npcIds.has(id)) bad.push(`${s.id}: ${id}`);
    }
    expect(bad).toEqual([]);
  });

  it('puzzle metadata is consistent', () => {
    const bad: string[] = [];
    for (const m of maps) {
      for (const g of m.gates ?? []) if (tileAt(m, g.x, g.y) !== 'gate') bad.push(`${m.id}: gate ${g.x},${g.y} not on a gate tile`);
      for (const s of m.switches ?? []) if (tileAt(m, s.x, s.y) !== 'switch_plate') bad.push(`${m.id}: switch ${s.x},${s.y} not on a switch_plate`);
      for (const p of m.pushables ?? []) if (!isWalkable(m, p.x, p.y)) bad.push(`${m.id}: pushable ${p.id} on a solid tile`);
      if (m.kind !== 'interior') {
        if (!m.exits || m.exits.length === 0) bad.push(`${m.id}: missing exits`);
        if (!m.landmarks || m.landmarks.length === 0) bad.push(`${m.id}: missing landmarks`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('evaluates flag conditions', () => {
    const flags: Record<string, boolean> = { a: true };
    const f = (n: string): boolean => flags[n] === true;
    expect(evalCondition({ all: [{ flag: 'a' }, { not: { flag: 'b' } }] }, f)).toBe(true);
    expect(evalCondition({ any: [{ flag: 'b' }, { flag: 'a', is: false }] }, f)).toBe(false);
  });
});
