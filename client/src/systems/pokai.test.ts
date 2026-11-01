import { describe, expect, it } from 'vitest';
import { db } from '../data/db';
import { createRng } from './rng';
import { xpForLevel } from './stats';
import { applyItem, canUseItem, createPokai, evolve, grantXp, healPokai, learnMove, maxContext, pendingEvolution } from './pokai';

describe('createPokai', () => {
  it('knows the last 4 learnset moves at its level', () => {
    const p = createPokai('claude_haiku', 14, createRng(1));
    expect(p.moves.map((m) => m.move)).toEqual(['proof', 'polite_refusal', 'nuance', 'artifact']);
    expect(p.context).toBe(maxContext(p));
    expect(p.xp).toBe(xpForLevel(14));
    for (const iv of Object.values(p.ivs)) expect(iv).toBeLessThanOrEqual(15);
  });
});

describe('xp, learning and evolution', () => {
  it('offers a new move instead of replacing one when 4 are known', () => {
    const p = createPokai('claude_haiku', 19, createRng(2));
    expect(p.moves.length).toBe(4);
    const before = p.moves.map((m) => m.move);
    const ev = grantXp(p, xpForLevel(20) - p.xp);
    expect(ev).toContainEqual({ kind: 'levelup', level: 20 });
    expect(ev).toContainEqual({ kind: 'learn_offer', move: 'system_prompt' });
    expect(p.moves.map((m) => m.move)).toEqual(before); // untouched until the player chooses
  });

  it('learnMove replaces the chosen slot in place, or refuses with null', () => {
    const p = createPokai('claude_haiku', 19, createRng(2));
    const before = p.moves.map((m) => m.move);
    expect(learnMove(p, 'system_prompt', null)).toBeNull();
    expect(p.moves.map((m) => m.move)).toEqual(before);
    const ev = learnMove(p, 'system_prompt', 2);
    expect(ev).toEqual({ kind: 'learn', move: 'system_prompt', replaced: before[2] });
    expect(p.moves.map((m) => m.move)).toEqual([before[0], before[1], 'system_prompt', before[3]]);
    expect(p.moves[2]?.tokens).toBe(db.move('system_prompt').tokens);
    // knowing it already: no-op
    expect(learnMove(p, 'system_prompt', 0)).toBeNull();
  });

  it('learns automatically while a slot is free', () => {
    const p = createPokai('claude_haiku', 19, createRng(2));
    p.moves.pop();
    const ev = grantXp(p, xpForLevel(20) - p.xp);
    expect(ev).toContainEqual({ kind: 'learn', move: 'system_prompt' });
    expect(p.moves.length).toBe(4);
  });

  it('emits evolve_ready at the evolution level, re-offers after a cancel', () => {
    const p = createPokai('claude_haiku', 15, createRng(3));
    const ev = grantXp(p, xpForLevel(16) - p.xp);
    expect(ev).toContainEqual({ kind: 'evolve_ready', options: ['claude_sonnet'] });
    // Cancelled: still pending, offered again next level.
    expect(pendingEvolution(p)).toEqual(['claude_sonnet']);
    const ev2 = grantXp(p, xpForLevel(17) - p.xp);
    expect(ev2.some((e) => e.kind === 'evolve_ready')).toBe(true);
  });

  it('evolves keeping level and HP ratio, and learns the new stage move', () => {
    const p = createPokai('claude_haiku', 16, createRng(4));
    p.context = Math.floor(maxContext(p) / 2);
    const before = p.context / maxContext(p);
    const ev = evolve(p, 'claude_sonnet');
    expect(p.form).toBe('claude_sonnet');
    expect(p.level).toBe(16);
    expect(Math.abs(p.context / maxContext(p) - before)).toBeLessThan(0.05);
    // Haiku Nv. 16 already knows 4 moves: the new stage move is offered, not forced.
    expect(ev).toContainEqual({ kind: 'learn_offer', move: 'sycophancy' });
    expect(p.moves.map((m) => m.move)).not.toContain('sycophancy');
    expect(learnMove(p, 'sycophancy', 0)?.kind).toBe('learn');
    expect(p.moves.map((m) => m.move)).toContain('sycophancy');
  });

  it('offers both branches at the same level', () => {
    const p = createPokai('deepseek_v3', 35, createRng(5));
    const ev = grantXp(p, xpForLevel(36) - p.xp);
    const ready = ev.find((e) => e.kind === 'evolve_ready');
    expect(ready && ready.kind === 'evolve_ready' ? [...ready.options].sort() : []).toEqual(['deepseek_r1', 'deepseek_v4']);
    const evo = evolve(p, 'deepseek_r1');
    expect(db.form(p.form).types).toEqual(['reasoning']);
    expect(evo).toContainEqual({ kind: 'learn_offer', move: 'krach' });
    // Several offers can come back; resolving them one by one keeps the 4-move cap.
    let slotIdx = 0;
    for (const o of evo) if (o.kind === 'learn_offer') learnMove(p, o.move, slotIdx++);
    expect(p.moves.length).toBe(4);
    expect(p.moves.map((m) => m.move)).toContain('krach');
  });

  it('accelerationists evolve 5 levels earlier', () => {
    const p = createPokai('claude_haiku', 11, createRng(6));
    expect(pendingEvolution(p)).toEqual([]);
    expect(pendingEvolution(p, 'accelerationist')).toEqual(['claude_sonnet']);
  });

  it('never leads to Llama 4 Behemoth', () => {
    for (const f of db.allForms()) for (const e of f.evolutions) expect(e.to).not.toBe('llama_4_behemoth');
    expect(db.form('llama_4_behemoth').unobtainable).toBe(true);
  });
});

describe('items', () => {
  it('heals and cures', () => {
    const p = createPokai('smollm', 10, createRng(7));
    expect(canUseItem('cafe', p)).toBe(false);
    p.context = 1;
    p.status = 'overheat';
    expect(applyItem('cafe', p).ok).toBe(true);
    expect(p.context).toBeGreaterThan(1);
    expect(applyItem('hotfix', p).ok).toBe(true);
    expect(p.status).toBeUndefined();
    p.moves[0]!.tokens = 0;
    healPokai(p);
    expect(p.context).toBe(maxContext(p));
    expect(p.moves[0]!.tokens).toBeGreaterThan(0);
  });
  it('H100 grants exactly one level', () => {
    const p = createPokai('smollm', 10, createRng(8));
    applyItem('h100', p);
    expect(p.level).toBe(11);
  });
});
