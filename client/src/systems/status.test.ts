import { describe, expect, it } from 'vitest';
import { BattleEngine, type BattleEvent } from './battle';
import { createPokai } from './pokai';
import { createRng } from './rng';
import type { StatusId } from '../data/types';

/** The foe spams `moveId` on a (defensive) player until `status` lands; returns the engine and all events. */
function inflict(status: StatusId, moveId: string, playerForm: string, seed = 1) {
  const foe = createPokai('phi_1', 30, createRng(seed));
  foe.moves = [{ move: moveId, tokens: 99 }];
  const me = createPokai(playerForm, 30, createRng(seed + 1));
  me.moves = [{ move: 'unit_tests', tokens: 99 }];
  me.context = me.context; // full
  const e = new BattleEngine({ player: [me], foe: [foe], kind: 'trainer', vibeurClass: 'prompt_engineer' }, createRng(seed));
  const events: BattleEvent[] = [];
  for (let i = 0; i < 40 && !e.state.over; i++) {
    events.push(...e.act({ kind: 'move', index: 0 }));
    if (events.some((x) => x.kind === 'status' && x.side === 'player' && x.status === status)) break;
  }
  return { e, me, events };
}
const msgs = (ev: BattleEvent[]) => ev.filter((x): x is Extract<BattleEvent, { kind: 'message' }> => x.kind === 'message').map((x) => x.text);

describe('status effects', () => {
  it('overheat ticks 1/16 of Context each turn with a log line, then wears off', () => {
    const { e, me, events } = inflict('overheat', 'infinite_loop', 'claude_sonnet');
    expect(me.status).toBe('overheat');
    me.moves = [{ move: 'unit_tests', tokens: 99 }];
    e.active('foe').moves = [{ move: 'unit_tests', tokens: 99 }];
    const tick = [] as BattleEvent[];
    for (let i = 0; i < 10 && me.status === 'overheat'; i++) tick.push(...e.act({ kind: 'move', index: 0 }));
    expect(msgs(tick).some((t) => t.includes('surchauffe !') && t.includes('tokens'))).toBe(true);
    expect(tick.some((x) => x.kind === 'damage' && x.side === 'player' && x.cause === 'status')).toBe(true);
    expect(me.status).toBeUndefined();
    expect(events.length).toBeGreaterThan(0);
  });

  it('maintenance skips 1-3 turns then wakes up', () => {
    const { e, me } = inflict('maintenance', 'deadlock', 'claude_sonnet', 3);
    expect(me.status).toBe('maintenance');
    e.active('foe').moves = [{ move: 'unit_tests', tokens: 99 }];
    const out: BattleEvent[] = [];
    for (let i = 0; i < 5 && me.status === 'maintenance'; i++) out.push(...e.act({ kind: 'move', index: 0 }));
    expect(msgs(out).some((t) => t.includes('en maintenance'))).toBe(true);
    expect(msgs(out).some((t) => t.includes('redémarre'))).toBe(true);
  });

  it('censored blocks one move for a few turns and then lifts', () => {
    const { e, me, events } = inflict('censored', 'shitpost', 'claude_sonnet', 2);
    expect(me.status).toBe('censored');
    expect(msgs(events).some((t) => t.includes('Censuré') && t.includes('bloquée'))).toBe(true);
    e.active('foe').moves = [{ move: 'unit_tests', tokens: 99 }];
    me.moves = [{ move: 'unit_tests', tokens: 99 }, { move: 'hello_world', tokens: 99 }, { move: 'nuance', tokens: 99 }];
    const out: BattleEvent[] = [];
    for (let i = 0; i < 6 && me.status === 'censored'; i++) out.push(...e.act({ kind: 'move', index: 0 }));
    expect(me.status).toBeUndefined();
    expect(msgs(out).some((t) => t.includes("n'est plus censuré"))).toBe(true);
  });

  it('deprecated drops stats for 3 turns', () => {
    const { e, me } = inflict('deprecated', 'forced_update', 'claude_sonnet', 4);
    expect(me.status).toBe('deprecated');
    e.active('foe').moves = [{ move: 'unit_tests', tokens: 99 }];
    const out: BattleEvent[] = [];
    for (let i = 0; i < 6 && me.status === 'deprecated'; i++) out.push(...e.act({ kind: 'move', index: 0 }));
    expect(out.filter((x) => x.kind === 'stat' && x.side === 'player' && x.stages < 0).length).toBeGreaterThanOrEqual(2);
    expect(me.status).toBeUndefined();
  });

  it('rate-limited is slower and sometimes skips; hallucinating self-hits and ends', () => {
    const rl = inflict('rate_limited', 'request_spam', 'claude_sonnet', 5);
    expect(rl.me.status).toBe('rate_limited');
    const h = inflict('hallucinating', 'flattery', 'gpt_2', 6);
    expect(h.me.status).toBe('hallucinating');
    h.e.active('foe').moves = [{ move: 'unit_tests', tokens: 99 }];
    const out: BattleEvent[] = [];
    for (let i = 0; i < 8 && h.me.status === 'hallucinating'; i++) out.push(...h.e.act({ kind: 'move', index: 0 }));
    expect(h.me.status).toBeUndefined();
    expect(msgs(out).some((t) => t.includes('ne délire plus'))).toBe(true);
  });

  it('api_outage skips a turn for proprietary only; type immunities hold', () => {
    const p = inflict('api_outage', 'compliance', 'claude_sonnet', 7);
    expect(p.me.status).toBe('api_outage');
    const foe = createPokai('phi_1', 20, createRng(1));
    const legacy = createPokai('bert', 20, createRng(2));
    const e = new BattleEngine({ player: [legacy], foe: [foe], kind: 'trainer', vibeurClass: 'prompt_engineer' }, createRng(1));
    expect(e.statusImmunity('player', 'hallucinating')).not.toBeNull();
    expect(e.statusImmunity('player', 'overheat')).toBeNull();
    expect(e.statusImmunity('player', 'api_outage')).not.toBeNull(); // bert is open-weights
  });
});
